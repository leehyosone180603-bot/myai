"""파이프라인 오케스트레이터 — 단계들을 하나로 연결.

두 진입점:
  1) collect_and_review : 수집 → 1차 선별 → 텔레그램 전송  (매일 크론)
  2) generate_and_publish(cand) : 승인된 후보 → 원고 → 이미지/카드 → 릴스 → 인스타 업로드
     (텔레그램 '발행' 버튼 콜백에서 호출)
"""

from __future__ import annotations

import re
from datetime import datetime

from . import ai_filter, ai_writer, cardnews, image_gen, instagram, reels, storage
from .collector import collect
from .config import Config
from .models import Bundle, Candidate
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


def _publish_to_ig(cfg: Config, card_urls: list[str], reel_url: str | None, caption: str) -> None:
    mode = cfg.get("card.publish", "single")
    ig = instagram.Instagram(cfg)
    if card_urls:
        if mode == "single" or len(card_urls) == 1:
            pid = ig.publish_single(card_urls[0], caption)
        else:
            pid = ig.publish_carousel(card_urls, caption)
        print(f"  카드뉴스 게시물: {pid or '(dry-run)'}")
    if reel_url:
        rid = ig.publish_reel(reel_url, caption, cover_url=card_urls[0] if card_urls else None)
        print(f"  릴스 게시물: {rid or '(dry-run)'}")


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
        "reel_url": reel_url,
        "caption": _caption(cfg, cand, bundle.plan),
    })
    print(f"  📥 발행 대기열 적재: [{cand.topic}] {cand.article.title[:36]}  (대기 {_queue(cfg).counts()})")
    label = {"money": "💰 돈/경제", "general": "🌐 이슈"}.get(cand.topic, cand.topic)
    _notify(cfg, f"📥 <b>발행 대기열 적재</b> · {label}\n{cand.article.title}\n\n현재 대기: {_fmt_counts(cfg)}")
    return bundle


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
        _publish_to_ig(cfg, item.get("card_urls", []), item.get("reel_url"), item.get("caption", ""))
        q.mark(item["id"], "published")
        _notify(cfg, f"📤 <b>발행 완료</b> · {label}\n{title}\n\n남은 대기: {_fmt_counts(cfg)}")
        return True
    except Exception as e:
        q.mark(item["id"], "failed", {"error": str(e)})
        print(f"  ❌ 발행 실패: {e}")
        _notify(cfg, f"❌ <b>발행 실패</b> · {label}\n{title}\n{str(e)[:200]}")
        return False
