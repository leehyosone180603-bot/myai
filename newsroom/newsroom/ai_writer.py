"""STEP 3 · 작가 — 승인된 기사 → 카드뉴스 원고 + 릴스 스크립트 + 이미지 프롬프트.

한 번의 Claude 호출로 아래를 모두 생성한다.
- headline      : 카드 표지 제목(2줄 이내, 임팩트 있게)
- card_slides   : 슬라이드별 본문 텍스트(표지 포함 card_slides 개)
- reels_script  : 릴스 나레이션 문장(클립 단위, 자연스러운 구어체)
- image_prompts : 슬라이드별 이미지 생성 프롬프트(영문, 텍스트/로고 금지)
- mood          : 배경음악 무드
"""

from __future__ import annotations

from .ai import structured
from .config import Config
from .models import Candidate, ContentPlan

_SCHEMA = {
    "type": "object",
    "properties": {
        "headline": {"type": "string"},
        "card_slides": {"type": "array", "items": {"type": "string"}},
        "reels_script": {"type": "array", "items": {"type": "string"}},
        "image_prompts": {"type": "array", "items": {"type": "string"}},
        "mood": {"type": "string", "enum": ["calm", "upbeat", "dramatic", "curious"]},
    },
    "required": ["headline", "card_slides", "reels_script", "image_prompts", "mood"],
    "additionalProperties": False,
}


def write(cfg: Config, cand: Candidate) -> ContentPlan:
    model = cfg.get("writer.model", "claude-opus-4-8")
    slides = int(cfg.get("writer.card_slides", 4))
    art = cand.article

    system = (
        "당신은 인스타그램 카드뉴스/릴스 전문 카피라이터입니다. "
        "해외 기사를 한국 독자용으로 재구성합니다. 친근한 구어체, 과장·낚시 지양, 사실 왜곡 금지. "
        "카드 본문은 한 슬라이드에 1~2문장으로 짧게."
    )
    user = f"""아래 해외 기사를 한국어 인스타 콘텐츠로 만들어 주세요.

[원문]
출처: {art.source}
제목: {art.title}
요약: {art.summary}
카테고리: {cand.category}

요구사항:
- headline: 표지용 제목. 2줄 이내, 강한 훅.
- card_slides: 정확히 {slides}개. 1번은 표지(headline 확장), 이후는 핵심 내용 전개.
- reels_script: 4~6문장. 릴스 나레이션용 자연스러운 구어체. 각 문장이 한 장면(클립)이 됩니다.
- image_prompts: card_slides 와 같은 개수. 각 슬라이드 배경 이미지 생성용 '영문' 프롬프트.
  사진처럼 자연스럽고, 텍스트/로고/워터마크는 넣지 마세요.
- mood: 릴스 배경음악 무드 (calm | upbeat | dramatic | curious).
"""

    result = structured(cfg, system, user, _SCHEMA, model=model, max_tokens=3000)

    # 슬라이드/프롬프트 개수 정합성 보정
    card_slides = result.get("card_slides", [])[:slides]
    image_prompts = result.get("image_prompts", [])
    while len(image_prompts) < len(card_slides):
        image_prompts.append(cfg.get("image.style", "editorial photo, no text"))

    return ContentPlan(
        headline=result.get("headline", art.title),
        card_slides=card_slides,
        reels_script=result.get("reels_script", []),
        image_prompts=image_prompts[:len(card_slides)],
        mood=result.get("mood", "calm"),
        category=cand.category,
    )
