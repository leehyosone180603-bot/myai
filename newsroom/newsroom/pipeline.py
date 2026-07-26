"""파이프라인 오케스트레이터 — 단계들을 하나로 연결.

두 진입점:
  1) collect_and_review : 수집 → 1차 선별 → 텔레그램 전송  (매일 크론)
  2) generate_and_publish(cand) : 승인된 후보 → 원고 → 이미지/카드 → 릴스 → 인스타 업로드
     (텔레그램 '발행' 버튼 콜백에서 호출)
"""

from __future__ import annotations

import hashlib
import re
from collections import defaultdict, deque
from datetime import datetime, time as _dtime, timedelta

from . import ai_filter, ai_writer, cardnews, image_gen, instagram, reels, storage
from .ai import structured
from .collector import collect
from .config import Config
from .models import Article, Bundle, Candidate, ContentPlan
from .pubqueue import PublishQueue
from .store import Store


def _queue(cfg: Config) -> PublishQueue:
    return PublishQueue(cfg.path(cfg.get("output.queue_file", "out/publish_queue.json")))


def _fmt_counts(cfg: Config) -> str:
    c = _queue(cfg).counts()
    return f"💰{c.get('money', 0)} · 🌐{c.get('general', 0)}"


def _notify(cfg: Config, text: str) -> None:
    """텔레그램으로 상태 알림 전송(실패해도 무시). 토큰/chat_id 없으면 조용히 통과."""
    try:
        from .telegram_bot import TelegramBot
        TelegramBot(cfg).send_text(text)
    except Exception as e:
        print(f"[warn] 텔레그램 알림 실패(무시): {e}")


def _original_image_candidates(cand: Candidate):
    """원본 사진 후보 URL 을 순서대로 yield: RSS 이미지 → 기사 og:image.

    RSS 썸네일이 너무 작으면(다운로드 단계에서 거부) og:image(보통 대형)로 넘어간다.
    og:image 는 실제로 필요할 때만(RSS 실패 시) 지연 조회한다.
    """
    seen: set[str] = set()
    rss = cand.article.image_url
    if rss:
        seen.add(rss)
        yield rss
    hero = image_gen.fetch_hero_image(cand.article.url)
    if hero and hero not in seen:
        print("  · 원본 사진: 기사 대표 이미지(og:image) 시도")
        yield hero


def _ensure_photo(cfg: Config, cand: Candidate) -> bool:
    """사용 가능한 원본 사진을 찾아 cand.article.image_url 에 확정. 없으면 False."""
    for url in _original_image_candidates(cand):
        if image_gen.probe_original(cfg, url):
            cand.article.image_url = url
            return True
    return False


def _slug(cand: Candidate) -> str:
    date = datetime.utcnow().strftime("%Y%m%d")
    safe = re.sub(r"[^a-zA-Z0-9]+", "-", cand.article.title.lower())[:32].strip("-")
    return f"{date}_{cand.id}_{safe or 'news'}"


def _caption(cfg: Config, cand: Candidate, plan) -> str:
    tags = cfg.get("content.hashtags", "#海外ニュース #ニュース")
    art = cand.article
    parts = [plan.headline.strip()]
    if getattr(plan, "body", ""):
        parts.append(plan.body.strip())          # 자세한 기사 본문
    src = f"source: {art.source}"
    # 이미지 출처 표기(있으면). 없으면 매체명으로 대체.
    credit = art.image_credit or art.source
    img_line = f"Image: {credit}" if credit else ""
    footer = "\n".join(x for x in (src, img_line) if x)
    parts.append(footer)
    parts.append(tags)
    caption = "\n\n".join(parts)
    return caption[:2200]                         # 인스타 캡션 최대 길이 안전선


# ── 1) 수집 → 선별 → 검토 요청 ──────────────────────────────────────
def collect_and_review(cfg: Config, store: Store, topic: str | None = None,
                       keep: int | None = None) -> list[Candidate]:
    """수집 → (topic 스트림) 선별 → 사진 필터 → 텔레그램 검토 전송.

    topic=money|general 이면 해당 주제만 골라 보낸다(밤 검토에서 스트림별로 호출).
    """
    from . import telegram_bot
    label = {"money": "💰 돈/경제", "general": "🌐 이슈"}.get(topic, "전체")
    print(f"STEP 1 · 수집  [{label}]")
    articles = collect(cfg)
    print(f"  수집 {len(articles)}건")

    print("STEP 1 · AI 1차 선별")
    candidates = ai_filter.select(cfg, articles, keep=keep, topic=topic)
    print(f"  선별 {len(candidates)}건")

    # 쓸만한 원본 사진이 있는 기사만 검토 대상으로(사진 없는 기사는 후보에서 제외)
    if bool(cfg.get("image.use_original", True)) and bool(cfg.get("image.skip_if_no_photo", True)):
        kept: list[Candidate] = []
        for c in candidates:
            if _ensure_photo(cfg, c):
                kept.append(c)
            else:
                print(f"  · 사진 없어 제외: {c.article.title[:45]}")
        candidates = kept
        print(f"  사진 있는 후보 {len(candidates)}건")

    print(f"STEP 2 · 텔레그램 검토 요청  [{label}]")
    telegram_bot.send_candidates(cfg, candidates, store, header=label)
    return candidates


def review_all_streams(cfg: Config, store: Store) -> None:
    """밤 검토(23시): 돈/경제 스트림 + 일반 이슈 스트림을 각각 후보로 보낸다."""
    money_keep = int(cfg.get("schedule.money_review_keep", 4))     # 돈: 후보 넉넉히(2개 승인용)
    general_keep = int(cfg.get("schedule.general_review_keep", 5))  # 일반: (3개 승인용)
    collect_and_review(cfg, store, topic="money", keep=money_keep)
    collect_and_review(cfg, store, topic="general", keep=general_keep)


# ── 2) 생성(공용) ──────────────────────────────────────────────────
def _generate_assets(cfg: Config, cand: Candidate) -> Bundle:
    """원고 → 이미지 → 카드 → 릴스까지 생성(발행/업로드 전). 사진 없으면 skipped."""
    out_dir = cfg.out_dir
    slug = _slug(cand)
    bundle = Bundle(candidate=cand)

    print(f"STEP 3 · 작가(원고) — {cand.article.title[:40]}")
    plan = ai_writer.write(cfg, cand)
    bundle.plan = plan

    print("STEP 3 · 이미지 생성")
    mode = cfg.get("card.publish", "single")
    n = 1 if mode == "single" else len(plan.card_slides)   # 단일이면 썸네일 1장만
    use_original = bool(cfg.get("image.use_original", True))
    reinterpret = bool(cfg.get("image.reinterpret_source", False))
    bg_paths: list[str | None] = []
    for i in range(n):
        out = out_dir / f"{slug}_bg{i+1}.jpg"
        bg = None
        if i == 0 and use_original:
            # 표지 배경 = 원본 뉴스 사진 그대로(AI 생성 X). 출처는 캡션에 명시.
            for src_url in _original_image_candidates(cand):
                bg = image_gen.download_original(cfg, src_url, out)
                if bg:
                    cand.article.image_url = src_url   # 캡션 출처 표기용
                    print("  · 표지: 원본 뉴스 사진 그대로 사용")
                    break
        if not bg and i == 0 and cand.article.image_url and reinterpret:
            bg = image_gen.generate_from_source(cfg, cand.article.image_url, out)
            if bg:
                print("  · 표지: 원본 사진 기반 재해석 사용")
        if not bg and i == 0 and use_original and bool(cfg.get("image.skip_if_no_photo", True)):
            print("  ! 쓸만한 원본 사진이 없어 이 기사는 건너뜁니다")
            bundle.skipped = True
            return bundle
        if not bg:  # 최종 폴백: 텍스트→이미지(Grok/Gemini)
            prompt = plan.image_prompts[i] if i < len(plan.image_prompts) else cfg.get("image.style", "")
            bg = image_gen.generate(cfg, prompt, out)
        bg_paths.append(bg)
    while len(bg_paths) < len(plan.card_slides):
        bg_paths.append(None)

    print("STEP 3 · 카드뉴스 렌더")
    bundle.card_paths = cardnews.render_bundle(cfg, plan, bg_paths, out_dir, slug)

    print("STEP 3 · 릴스(썸네일 1장 → 약 10초 영상)")
    thumb = bundle.card_paths[0] if bundle.card_paths else None
    bundle.reel_path = reels.build_from_image(cfg, thumb, out_dir, slug, mood=plan.mood) or ""
    return bundle


def _upload_assets(cfg: Config, bundle: Bundle, slug: str) -> tuple[list[str], str | None]:
    """카드/릴스를 R2 에 올려 공개 URL 반환. 스토리지 없으면 ([], None)."""
    if not storage.enabled(cfg):
        print("  ! 스토리지 자격증명 없음 — 업로드/발행 생략 (파일만 생성)")
        return [], None
    mode = cfg.get("card.publish", "single")
    to_upload = bundle.card_paths[:1] if mode == "single" else bundle.card_paths
    card_urls = [storage.upload(cfg, p, f"{slug}/card{i+1}.jpg")
                 for i, p in enumerate(to_upload)]
    reel_url = storage.upload(cfg, bundle.reel_path, f"{slug}/reel.mp4") if bundle.reel_path else None
    print(f"  업로드 완료: 카드 {len(card_urls)}장" + (" + 릴스" if reel_url else ""))
    return card_urls, reel_url


def _publish_to_ig(cfg: Config, card_urls: list[str], reel_url: str | None, caption: str) -> list[str]:
    """카드/릴스를 각각 독립적으로 발행. 한쪽이 실패해도 다른 쪽은 올린다.

    부분 실패 메시지 리스트를 반환. 둘 다(또는 유일한 하나가) 실패하면 예외.
    """
    ig = instagram.Instagram(cfg)
    ok = 0
    errs: list[str] = []
    if card_urls:
        try:
            if len(card_urls) == 1:                    # 1장이면 단일, 2장 이상이면 캐러셀
                pid = ig.publish_single(card_urls[0], caption)
            else:
                pid = ig.publish_carousel(card_urls, caption)
            print(f"  카드뉴스 게시물: {pid or '(dry-run)'}")
            ok += 1
        except Exception as e:
            errs.append(f"카드: {e}")
            print(f"  ❌ 카드 발행 실패: {e}")
    if reel_url:
        try:
            rid = ig.publish_reel(reel_url, caption, cover_url=card_urls[0] if card_urls else None)
            print(f"  릴스 게시물: {rid or '(dry-run)'}")
            ok += 1
        except Exception as e:
            errs.append(f"릴스: {e}")
            print(f"  ❌ 릴스 발행 실패: {e}")
    if ok == 0 and errs:              # 아무것도 못 올림 → 실패로 처리(재시도 대상)
        raise RuntimeError("; ".join(errs))
    return errs                        # 부분 실패(카드/릴스 중 하나만 성공)


def generate_and_publish(cfg: Config, cand: Candidate, publish: bool = True) -> Bundle:
    """즉시 발행 경로(로컬 테스트/즉시 모드). 생성 → 업로드 → 인스타 발행."""
    bundle = _generate_assets(cfg, cand)
    if bundle.skipped:
        return bundle
    if not publish:
        print(f"STEP 4 · 발행 생략 — 카드 {len(bundle.card_paths)}장, 릴스: {bundle.reel_path or '없음'}")
        return bundle
    slug = _slug(cand)
    print("STEP 4 · 공개 URL 업로드 (R2)")
    card_urls, reel_url = _upload_assets(cfg, bundle, slug)
    if not card_urls and not reel_url:
        return bundle
    print("STEP 4 · 인스타그램 발행")
    _publish_to_ig(cfg, card_urls, reel_url, _caption(cfg, cand, bundle.plan))
    return bundle


# ── 3) 예약 발행: 승인 시 생성+업로드 후 큐 적재 ────────────────────
def stage_for_publish(cfg: Config, cand: Candidate) -> Bundle:
    """승인된 후보를 생성/업로드해 발행 대기열에 적재(즉시 발행 X)."""
    bundle = _generate_assets(cfg, cand)
    if bundle.skipped:
        return bundle
    slug = _slug(cand)
    print("STEP 4 · 공개 URL 업로드 (R2)")
    card_urls, reel_url = _upload_assets(cfg, bundle, slug)
    if not card_urls and not reel_url:
        print("  ! 업로드 실패 — 대기열 적재 생략")
        return bundle
    _queue(cfg).enqueue({
        "id": cand.id,
        "topic": cand.topic,
        "title": cand.article.title,
        "card_urls": card_urls,
        "card_paths": bundle.card_paths,      # 로컬 미리보기용
        "reel_url": reel_url,
        "caption": _caption(cfg, cand, bundle.plan),
    })
    print(f"  📥 발행 대기열 적재: [{cand.topic}] {cand.article.title[:36]}  (대기 {_queue(cfg).counts()})")
    label = {"money": "💰 돈/경제", "general": "🌐 이슈"}.get(cand.topic, cand.topic)
    _notify(cfg, f"📥 <b>발행 대기열 적재</b> · {label}\n{cand.article.title}\n\n현재 대기: {_fmt_counts(cfg)}")
    return bundle


# ── 4) 리포스트(번역) — 붙여넣은 캡션 + 이미지 → 일본어 카드 → 대기열 ───
_REPOST_SCHEMA = {
    "type": "object",
    "properties": {
        "headline": {"type": "string"},
        "subtitle": {"type": "string"},
        "body": {"type": "string"},
    },
    "required": ["headline", "subtitle", "body"],
    "additionalProperties": False,
}


def _translate_repost(cfg: Config, caption_text: str) -> ContentPlan:
    """붙여넣은 원문 캡션을 발행 언어(기본 일본어)로 번역·재구성."""
    lang = cfg.get("content.language", "ja")
    lang_name = {"ja": "일본어(自然な日本語)", "ko": "한국어", "en": "English"}.get(lang, "일본어")
    model = cfg.get("writer.model", "claude-opus-4-8")
    system = (
        f"당신은 인스타그램 채널 에디터입니다. 사용자가 준 '원문 게시물 캡션'을 "
        f"{lang_name}로 자연스럽게 번역·재구성합니다. 번역투 없이 현지인이 읽기 자연스럽게, "
        "사실은 그대로 유지하고 없는 내용을 지어내지 마세요. 원문 언어 문장을 그대로 남기지 마세요."
    )
    user = (
        f"[원문 게시물 캡션]\n{caption_text}\n\n"
        f"요구사항(모두 {lang_name}):\n"
        f"- headline: 카드 표지 제목. 2줄 이내, 강한 훅.\n"
        f"- subtitle: 제목 아래 한 줄(15자 내외).\n"
        f"- body: 캡션용 상세 본문. 원문 핵심을 살려 3~4문단으로, 문단은 빈 줄로 구분."
    )
    r = structured(cfg, system, user, _REPOST_SCHEMA, model=model, max_tokens=3000)
    return ContentPlan(headline=r.get("headline", ""), subtitle=r.get("subtitle", ""),
                       body=r.get("body", ""), card_slides=[r.get("headline", "")],
                       category="today", mood="calm")


def _repost_caption(cfg: Config, plan: ContentPlan, source: str = "") -> str:
    tags = cfg.get("content.hashtags", "")
    parts = [plan.headline.strip()]
    if plan.body:
        parts.append(plan.body.strip())
    if source:
        parts.append(f"via {source}")
    parts.append(tags)
    return "\n\n".join(p for p in parts if p)[:2200]


def repost_generate(cfg: Config, image_path: str, caption_text: str, topic: str = "general",
                    source: str = "", redraw: bool = True, make_reel: bool = True,
                    detail_images: list[str] | None = None) -> dict:
    """리포스트 '미리보기용' 생성: (번역) → 카드 여러 장 → (릴스). 업로드/적재는 안 함.

    - 1번(표지): image_path. redraw=True 면 일본어 제목을 얹어 카드로, False 면 이미지 그대로.
    - 2번~(상세): detail_images. 잘리지 않게 전체가 보이도록 프레임에 담는다(제목 없음).
    반환 dict: slug, topic, source, title, card_paths(list), reel_path, caption
    """
    from PIL import Image
    detail_images = detail_images or []
    out_dir = cfg.out_dir
    print(f"리포스트 · 번역 시작 — {caption_text[:40]}…")
    plan = _translate_repost(cfg, caption_text)

    slug = datetime.utcnow().strftime("%Y%m%d") + "_repost_" + \
        hashlib.sha1((image_path + caption_text[:120]).encode("utf-8")).hexdigest()[:8]
    out_dir.mkdir(parents=True, exist_ok=True)

    card_paths: list[str] = []
    cover = out_dir / f"{slug}_card1.jpg"
    if redraw:
        print("리포스트 · 1번 표지 카드 렌더(일본어 제목)")
        cardnews.render_card(cfg, title=plan.headline, subtitle=plan.subtitle,
                             category=plan.category, bg_path=str(image_path),
                             out_path=cover, is_cover=True, slide_total=1)
    else:
        print("리포스트 · 1번 표지: 첨부 이미지를 그대로 사용")
        Image.open(image_path).convert("RGB").save(cover, "JPEG", quality=92)
    card_paths.append(str(cover))

    for i, dimg in enumerate(detail_images, start=2):
        print(f"리포스트 · {i}번 상세 이미지(전체 표시)")
        dcard = out_dir / f"{slug}_card{i}.jpg"
        cardnews.render_contain_slide(cfg, dimg, dcard)
        card_paths.append(str(dcard))

    reel_path = ""
    if make_reel:
        print(f"리포스트 · 릴스(카드 {len(card_paths)}장 → 슬라이드쇼 영상)")
        reel_path = reels.build_from_images(cfg, card_paths, out_dir, slug) or ""

    return {"slug": slug, "topic": topic, "source": source, "title": plan.headline,
            "card_paths": card_paths, "reel_path": reel_path,
            "caption": _repost_caption(cfg, plan, source)}


def repost_commit(cfg: Config, prepared: dict) -> bool:
    """미리보기로 만든 리포스트를 확정: R2 업로드(여러 장) → 대기열 적재."""
    slug, topic = prepared["slug"], prepared.get("topic", "general")
    card_paths = prepared.get("card_paths") or \
        ([prepared["card_path"]] if prepared.get("card_path") else [])
    if not storage.enabled(cfg):
        print("  ! 스토리지 자격증명 없음 — 업로드/적재 생략")
        return False
    print(f"리포스트 · R2 업로드 (카드 {len(card_paths)}장)")
    card_urls = [storage.upload(cfg, p, f"{slug}/card{i+1}.jpg") for i, p in enumerate(card_paths)]
    reel_url = storage.upload(cfg, prepared["reel_path"], f"{slug}/reel.mp4") \
        if prepared.get("reel_path") else None
    if not card_urls and not reel_url:
        print("  ! 업로드 실패 — 대기열 적재 생략")
        return False
    _queue(cfg).enqueue({
        "id": slug, "topic": topic, "title": prepared["title"],
        "card_urls": card_urls, "card_paths": card_paths, "reel_url": reel_url,
        "caption": prepared["caption"], "kind": "repost",
    })
    label = {"money": "💰 돈/경제", "general": "🌐 이슈"}.get(topic, topic)
    print(f"  📥 리포스트 대기열 적재: [{topic}] {prepared['title'][:36]}  "
          f"(카드 {len(card_urls)}장, 대기 {_queue(cfg).counts()})")
    _notify(cfg, f"📥 <b>리포스트 대기열 적재</b> · {label}\n{prepared['title']}\n"
                 f"(카드 {len(card_urls)}장)\n\n현재 대기: {_fmt_counts(cfg)}")
    return True


def stage_repost(cfg: Config, image_path: str, caption_text: str, topic: str = "general",
                 source: str = "", redraw: bool = True, make_reel: bool = True,
                 detail_images: list[str] | None = None) -> bool:
    """생성 + 대기열 적재를 한 번에(미리보기 없이)."""
    prepared = repost_generate(cfg, image_path, caption_text, topic, source, redraw,
                               make_reel, detail_images)
    return repost_commit(cfg, prepared)


# ── 대기열 발행 예정시각 계산(UI 표시용) ────────────────────────────
def queue_listing(cfg: Config, now: datetime | None = None) -> list[dict]:
    """대기 중 항목들에 '예상 발행 시각'을 붙여 시간순으로 반환.

    schedule.slots(시간대·스트림)와 현재시각 기준으로, 스트림별 대기 순서대로
    앞으로의 슬롯에 하나씩 배정한다(그 시각에 PC가 켜져 있다는 가정의 예측치).
    """
    now = now or datetime.now()
    slots = cfg.get("schedule.slots", []) or []
    all_items = _queue(cfg).all()                     # 상태 무관 전체(발행됨/실패/멈춤 포함)
    for it in all_items:
        it["_when"] = None
    queued = [it for it in all_items if it.get("status") == "queued"]

    by_topic: dict[str, deque] = defaultdict(deque)
    remaining = 0
    for it in queued:
        pa = it.get("publish_at")
        if pa:                                          # 개별 지정시각: 슬롯 배정 제외
            try:
                it["_when"] = datetime.fromisoformat(pa)
            except Exception:
                it["_when"] = None
        else:
            by_topic[it.get("topic", "general")].append(it)
            remaining += 1
    day = 0
    while remaining > 0 and day < 90:
        date = (now + timedelta(days=day)).date()
        for slot in sorted(slots, key=lambda s: str(s.get("time", ""))):
            try:
                hh, mm = map(int, str(slot.get("time", "")).split(":"))
            except ValueError:
                continue
            dt = datetime.combine(date, _dtime(hh, mm))
            if dt <= now:
                continue
            tp = slot.get("topic")
            if by_topic.get(tp):
                by_topic[tp].popleft()["_when"] = dt
                remaining -= 1
        day += 1

    # 대기중(예상시각순) → 그 외(적재순). 검토했던 항목을 상태와 함께 모두 표시.
    q_rows = sorted(queued, key=lambda it: (it.get("_when") or datetime.max))
    others = sorted((it for it in all_items if it.get("status") != "queued"),
                    key=lambda it: it.get("staged_at", ""))
    out = []
    for i, it in enumerate(q_rows + others, 1):
        out.append({"seq": i, "id": it.get("id", ""), "topic": it.get("topic", "general"),
                    "title": it.get("title", ""), "kind": it.get("kind", "news"),
                    "status": it.get("status", "queued"), "when": it.get("_when")})
    return out


def requeue_failed(cfg: Config) -> int:
    """실패로 멈춘 대기열 항목을 다시 발행 대기로 되돌린다(수정 후 재시도용)."""
    n = _queue(cfg).requeue_failed()
    print(f"실패 항목 {n}건을 대기열로 되돌렸습니다. (현재 대기 {_queue(cfg).counts()})")
    return n


def remove_from_queue(cfg: Config, item_id: str) -> int:
    """대기열에서 특정 항목을 삭제한다."""
    n = _queue(cfg).remove(item_id)
    print(f"대기열에서 {n}건 삭제 (id={item_id})")
    return n


def set_item_time(cfg: Config, item_id: str, dt: datetime | None) -> None:
    """항목별 발행 예약시각 지정. dt=None 이면 해제(자동 시간대로 복귀)."""
    iso = dt.isoformat(timespec="minutes") if dt else None
    _queue(cfg).set_publish_at(item_id, iso)
    print(f"발행 시각 지정: id={item_id} → {iso or '자동(시간대)'}")


def publish_item(cfg: Config, item_id: str) -> bool:
    """대기열의 특정 항목을 발행한다(항목별 예약시각 도래 시 사용)."""
    q = _queue(cfg)
    item = q.get_item(item_id)
    if not item or item.get("status") != "queued":
        return False
    title = item.get("title", "")
    label = {"money": "💰 돈/경제", "general": "🌐 이슈"}.get(item.get("topic"), item.get("topic"))
    q.mark(item_id, "publishing")
    print(f"STEP 4 · 예약 발행(지정시각) [{item.get('topic')}] {title[:40]}")
    try:
        errs = _publish_to_ig(cfg, item.get("card_urls", []), item.get("reel_url"), item.get("caption", ""))
        q.mark(item_id, "published", {"partial_errors": errs} if errs else None)
        head = "⚠️ 부분 발행" if errs else "📤 발행 완료"
        tail = f"\n실패: {'; '.join(errs)[:200]}" if errs else ""
        _notify(cfg, f"{head} · {label}\n{title}{tail}\n\n남은 대기: {_fmt_counts(cfg)}")
        return True
    except Exception as e:
        q.mark(item_id, "failed", {"error": str(e)})
        print(f"  ❌ 발행 실패: {e}")
        _notify(cfg, f"❌ <b>발행 실패</b> · {label}\n{title}\n{str(e)[:200]}")
        return False


def publish_due(cfg: Config, now: datetime | None = None) -> int:
    """항목별 예약시각(publish_at)이 도래한 대기 항목들을 발행한다."""
    now = now or datetime.now()
    published = 0
    for it in _queue(cfg).all():
        if it.get("status") == "queued" and it.get("publish_at"):
            try:
                due = datetime.fromisoformat(it["publish_at"]) <= now
            except Exception:
                due = False
            if due and publish_item(cfg, it["id"]):
                published += 1
    return published


def publish_next(cfg: Config, topic: str | None = None) -> bool:
    """대기열에서 가장 오래된 항목(topic 지정 시 해당 스트림)을 하나 발행. 발행하면 True."""
    q = _queue(cfg)
    item = q.pop_next(topic)
    if not item:
        print(f"발행할 대기 항목이 없습니다 (topic={topic or '전체'}).")
        return False
    title = item.get("title", "")
    label = {"money": "💰 돈/경제", "general": "🌐 이슈"}.get(item.get("topic"), item.get("topic"))
    print(f"STEP 4 · 예약 발행 [{item.get('topic')}] {title[:40]}")
    try:
        errs = _publish_to_ig(cfg, item.get("card_urls", []), item.get("reel_url"), item.get("caption", ""))
        q.mark(item["id"], "published", {"partial_errors": errs} if errs else None)
        if errs:                       # 부분 성공(예: 카드는 올라갔지만 릴스 실패)
            _notify(cfg, f"⚠️ <b>부분 발행</b> · {label}\n{title}\n실패: {'; '.join(errs)[:200]}\n\n남은 대기: {_fmt_counts(cfg)}")
        else:
            _notify(cfg, f"📤 <b>발행 완료</b> · {label}\n{title}\n\n남은 대기: {_fmt_counts(cfg)}")
        return True
    except Exception as e:
        q.mark(item["id"], "failed", {"error": str(e)})
        print(f"  ❌ 발행 실패: {e}")
        _notify(cfg, f"❌ <b>발행 실패</b> · {label}\n{title}\n{str(e)[:200]}")
        return False
