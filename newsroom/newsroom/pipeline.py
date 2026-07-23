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
from .store import Store


def _slug(cand: Candidate) -> str:
    date = datetime.utcnow().strftime("%Y%m%d")
    safe = re.sub(r"[^a-zA-Z0-9]+", "-", cand.article.title.lower())[:32].strip("-")
    return f"{date}_{cand.id}_{safe or 'news'}"


def _caption(cfg: Config, cand: Candidate, plan) -> str:
    tags = cfg.get("content.hashtags", "#海外ニュース #ニュース")
    return f"{plan.headline}\n\nsource: {cand.article.source}\n{tags}"


# ── 1) 수집 → 선별 → 검토 요청 ──────────────────────────────────────
def collect_and_review(cfg: Config, store: Store) -> list[Candidate]:
    from . import telegram_bot
    print("STEP 1 · 수집")
    articles = collect(cfg)
    print(f"  수집 {len(articles)}건")

    print("STEP 1 · AI 1차 선별")
    candidates = ai_filter.select(cfg, articles)
    print(f"  선별 {len(candidates)}건")

    print("STEP 2 · 텔레그램 검토 요청")
    telegram_bot.send_candidates(cfg, candidates, store)
    return candidates


# ── 2) 승인 → 생성 → 발행 ──────────────────────────────────────────
def generate_and_publish(cfg: Config, cand: Candidate, publish: bool = True) -> Bundle:
    out_dir = cfg.out_dir
    slug = _slug(cand)
    bundle = Bundle(candidate=cand)

    print(f"STEP 3 · 작가(원고) — {cand.article.title[:40]}")
    plan = ai_writer.write(cfg, cand)
    bundle.plan = plan

    print("STEP 3 · 이미지 생성")
    mode = cfg.get("card.publish", "single")
    n = 1 if mode == "single" else len(plan.card_slides)   # 단일이면 썸네일 1장만
    bg_paths: list[str | None] = []
    for i in range(n):
        out = out_dir / f"{slug}_bg{i+1}.jpg"
        bg = None
        if i == 0 and cand.article.image_url:
            # 2-1: 표지 배경 = 원본 뉴스 사진을 Gemini로 유사 재해석(저작권 회피)
            bg = image_gen.generate_from_source(cfg, cand.article.image_url, out)
            if bg:
                print("  · 표지: 원본 사진 기반 재해석 사용")
        if not bg:  # 폴백: 텍스트→이미지
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

    if not publish:
        print("STEP 4 · 발행 생략 (--no-publish) — 파일만 생성했습니다")
        print(f"  📁 카드 {len(bundle.card_paths)}장, 릴스: {bundle.reel_path or '없음'}  → {out_dir}")
        return bundle

    # 발행 모드: single(썸네일 1장만) | carousel(여러장)
    mode = cfg.get("card.publish", "single")
    to_upload = bundle.card_paths[:1] if mode == "single" else bundle.card_paths

    print("STEP 4 · 공개 URL 업로드 (R2)")
    if not storage.enabled(cfg):
        print("  ! 스토리지 자격증명 없음 — 업로드/발행 생략 (파일만 생성)")
        return bundle
    card_urls = [storage.upload(cfg, p, f"{slug}/card{i+1}.jpg")
                 for i, p in enumerate(to_upload)]
    reel_url = storage.upload(cfg, bundle.reel_path, f"{slug}/reel.mp4") if bundle.reel_path else None
    print(f"  업로드 완료: 카드 {len(card_urls)}장" + (" + 릴스" if reel_url else ""))

    print("STEP 4 · 인스타그램 발행")
    ig = instagram.Instagram(cfg)
    caption = _caption(cfg, cand, plan)
    if card_urls:
        if mode == "single" or len(card_urls) == 1:
            pid = ig.publish_single(card_urls[0], caption)
        else:
            pid = ig.publish_carousel(card_urls, caption)
        print(f"  카드뉴스 게시물: {pid or '(dry-run)'}")
    if reel_url:
        rid = ig.publish_reel(reel_url, caption, cover_url=card_urls[0] if card_urls else None)
        print(f"  릴스 게시물: {rid or '(dry-run)'}")

    return bundle
