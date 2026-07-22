"""파이프라인 오케스트레이터 — 단계들을 하나로 연결.

두 진입점:
  1) collect_and_review : 수집 → 1차 선별 → 텔레그램 전송  (매일 크론)
  2) generate_and_publish(cand) : 승인된 후보 → 원고 → 이미지/카드 → 릴스 → 인스타 업로드
     (텔레그램 '발행' 버튼 콜백에서 호출)
"""

from __future__ import annotations

import re
from datetime import datetime

from . import ai_filter, ai_writer, cardnews, image_gen, instagram, reels, tts
from .collector import collect
from .config import Config
from .models import Bundle, Candidate
from .store import Store


def _slug(cand: Candidate) -> str:
    date = datetime.utcnow().strftime("%Y%m%d")
    safe = re.sub(r"[^a-zA-Z0-9]+", "-", cand.article.title.lower())[:32].strip("-")
    return f"{date}_{cand.id}_{safe or 'news'}"


def _caption(cand: Candidate, plan) -> str:
    tags = "#해외뉴스 #오늘의소식 #카드뉴스"
    return f"{plan.headline}\n\n{cand.reason}\n\n출처: {cand.article.source}\n{tags}"


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
    bg_paths = image_gen.generate_many(cfg, plan.image_prompts, out_dir, slug)

    print("STEP 3 · 카드뉴스 렌더")
    bundle.card_paths = cardnews.render_bundle(cfg, plan, bg_paths, out_dir, slug)

    print("STEP 3 · 릴스(TTS + 힉스필드 + 합성)")
    narration = tts.synthesize(cfg, plan.reels_script, out_dir / f"{slug}_narration.mp3")
    bundle.reel_path = reels.build(cfg, plan, narration, out_dir, slug) or ""

    if not publish:
        print("STEP 4 · 발행 생략 (--no-publish) — 파일만 생성했습니다")
        print(f"  📁 카드 {len(bundle.card_paths)}장, 릴스: {bundle.reel_path or '없음'}  → {out_dir}")
        return bundle

    print("STEP 4 · 인스타그램 업로드")
    ig = instagram.Instagram(cfg)
    caption = _caption(cand, plan)
    if bundle.card_paths:
        pid = ig.publish_carousel([f"{slug}_card{i+1}.png" for i in range(len(bundle.card_paths))],
                                  caption)
        print(f"  카드뉴스 게시물: {pid or '(dry-run)'}")
    if bundle.reel_path:
        rid = ig.publish_reel(f"{slug}_reel.mp4", caption,
                              cover_url=f"{slug}_card1.png" if bundle.card_paths else None)
        print(f"  릴스 게시물: {rid or '(dry-run)'}")

    return bundle
