#!/usr/bin/env python3
"""API 키 없이 카드뉴스 템플릿을 확인하는 데모.

하드코딩한 원고(ContentPlan)로 표지+본문 슬라이드를 렌더링해
docs/samples/ 에 저장한다. (배경 이미지는 그라데이션 폴백 사용)

  python demo_cards.py
"""

from __future__ import annotations

from pathlib import Path

from newsroom.cardnews import render_bundle
from newsroom.config import load_config
from newsroom.models import ContentPlan


def main() -> None:
    cfg = load_config()
    out = Path("docs/samples")
    out.mkdir(parents=True, exist_ok=True)

    plan = ContentPlan(
        headline="바다 밑 3,800m에서 발견된 것, 과학자도 깜짝 놀랐다",
        card_slides=[
            "바다 밑 3,800m에서 발견된 것, 과학자도 깜짝 놀랐다",
            "심해 탐사팀이 태평양 해저에서 예상치 못한 '검은 산소'의 흔적을 포착했습니다.",
            "빛이 닿지 않는 깊이에서 산소가 만들어진다는 건 기존 상식을 뒤집는 발견입니다.",
            "연구팀은 금속 광물이 물을 분해했을 가능성을 제기했고, 검증이 진행 중입니다.",
        ],
        reels_script=[
            "바다 밑 3,800미터, 빛도 닿지 않는 그곳에서 놀라운 게 발견됐어요.",
            "바로 '검은 산소'라 불리는 흔적이었죠.",
            "빛 없이 산소가 생긴다니, 기존 상식을 완전히 뒤집는 발견입니다.",
            "과연 그 비밀은 무엇일까요?",
        ],
        image_prompts=["deep sea"] * 4,
        mood="curious",
        category="world",
    )

    paths = render_bundle(cfg, plan, bg_paths=[None] * len(plan.card_slides),
                          out_dir=out, slug="sample")
    for p in paths:
        print("saved:", p)


if __name__ == "__main__":
    main()
