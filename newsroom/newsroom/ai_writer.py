"""STEP 3 · 작가 — 승인된 기사 → 카드뉴스 원고 + 릴스 스크립트 + 이미지 프롬프트.

한 번의 Claude 호출로 아래를 모두 생성한다.
- headline      : 카드 표지 제목(2줄 이내, 임팩트 있게)
- card_slides   : 슬라이드별 본문 텍스트(표지 포함 card_slides 개)
- reels_script  : 릴스 나레이션 문장(클립 단위, 자연스러운 구어체)
- image_prompts : 슬라이드별 이미지 생성 프롬프트(영문, 텍스트/로고 금지)
- mood          : 배경음악 무드
"""

from __future__ import annotations

import re

import requests

from .ai import structured
from .config import Config
from .models import Candidate, ContentPlan

_SCHEMA = {
    "type": "object",
    "properties": {
        "headline": {"type": "string"},
        "subtitle": {"type": "string"},
        "body": {"type": "string"},
        "card_slides": {"type": "array", "items": {"type": "string"}},
        "reels_script": {"type": "array", "items": {"type": "string"}},
        "image_prompts": {"type": "array", "items": {"type": "string"}},
        "mood": {"type": "string", "enum": ["calm", "upbeat", "dramatic", "curious"]},
    },
    "required": ["headline", "subtitle", "body", "card_slides", "reels_script",
                 "image_prompts", "mood"],
    "additionalProperties": False,
}


def _fetch_article_text(url: str, limit: int = 5000) -> str:
    """기사 URL 에서 본문 텍스트를 최대한 뽑아온다(자세한 캡션 작성용 사실 근거).

    간단한 HTML 태그 제거 방식. 실패/차단 시 빈 문자열(요약만으로 작성).
    """
    if not url:
        return ""
    try:
        r = requests.get(url, timeout=20, headers={"User-Agent": "Mozilla/5.0"})
        r.raise_for_status()
        html = r.text
        html = re.sub(r"(?is)<(script|style|nav|header|footer|aside)[^>]*>.*?</\1>", " ", html)
        # 단락 후보만 추출
        paras = re.findall(r"(?is)<p[^>]*>(.*?)</p>", html)
        text = " ".join(re.sub(r"<[^>]+>", " ", p) for p in paras)
        text = re.sub(r"\s+", " ", text).strip()
        return text[:limit]
    except Exception:
        return ""


_LANG = {
    "ja": ("일본어(自然な日本語)", "일본 인스타그램 사용자",
           "일본인이 읽었을 때 위화감 없는 자연스러운 일본어 뉴스 말투(です・ます調 기본, 과장·번역투 금지). "
           "한국어·영어 그대로 남기지 말고 완전히 일본어로."),
    "ko": ("한국어", "한국 인스타그램 사용자", "친근한 한국어 구어체."),
    "en": ("English", "English-speaking Instagram users", "Natural, concise English."),
}


def write(cfg: Config, cand: Candidate) -> ContentPlan:
    model = cfg.get("writer.model", "claude-opus-4-8")
    slides = int(cfg.get("writer.card_slides", 4))
    lang = cfg.get("content.language", "ja")
    lang_name, audience, tone = _LANG.get(lang, _LANG["ja"])
    art = cand.article

    full_text = _fetch_article_text(art.url)

    system = (
        f"당신은 인스타그램 카드뉴스/릴스 전문 카피라이터 겸 뉴스 에디터입니다. "
        f"해외 기사를 {audience}용으로 재구성합니다.\n"
        f"출력 언어: 반드시 {lang_name}. {tone}\n"
        "과장·낚시 지양, 사실 왜곡 금지. 카드 표지 제목은 짧게, 캡션 본문(body)은 자세하게.\n"
        "중요: 원문 문장을 그대로 베끼지 말고 스스로의 말로 다시 쓰세요. "
        "원문(요약/본문)에 없는 구체 수치·발언·이름은 절대 지어내지 마세요."
    )
    src_block = f"제목: {art.title}\n요약: {art.summary}"
    if full_text:
        src_block += f"\n본문(참고, 사실 근거로만 사용): {full_text}"

    user = f"""아래 해외 기사를 {lang_name} 인스타 콘텐츠로 만들어 주세요.
모든 출력 텍스트(headline·subtitle·body·card_slides·reels_script)는 반드시 {lang_name}로 작성하세요.

[원문]
출처: {art.source}
{src_block}

요구사항:
- headline: 표지 썸네일용 제목. 2줄 이내, 강한 훅. ({lang_name})
- subtitle: 제목 아래 한 줄. 기사 각도/핵심을 짧게(15자 내외). ({lang_name})
- body: 인스타 캡션에 들어갈 '자세한 뉴스 기사'. 이 글만 읽어도 무슨 일인지 명확히 알 수 있게
  배경·핵심 사실·관련 수치·의미/전망을 3~4개 문단으로 충실히 서술. 문단은 빈 줄로 구분.
  자연스러운 {lang_name} 뉴스 문체(です・ます調). 원문에 있는 사실만 사용하고 지어내지 마세요. ({lang_name})
- card_slides: 정확히 {slides}개. 1번은 표지(headline 확장), 이후는 핵심 내용 전개. ({lang_name})
- reels_script: 4~6문장. 릴스 나레이션용 자연스러운 구어체. 각 문장이 한 장면(클립). ({lang_name})
- image_prompts: card_slides 와 같은 개수. 각 슬라이드 배경 이미지 생성용 '영문' 프롬프트.
  사진처럼 자연스럽고, 텍스트/로고/워터마크는 넣지 마세요. (이것만 영어)
- mood: 릴스 배경음악 무드 (calm | upbeat | dramatic | curious).
"""

    result = structured(cfg, system, user, _SCHEMA, model=model, max_tokens=4000)

    # 슬라이드/프롬프트 개수 정합성 보정
    card_slides = result.get("card_slides", [])[:slides]
    image_prompts = result.get("image_prompts", [])
    while len(image_prompts) < len(card_slides):
        image_prompts.append(cfg.get("image.style", "editorial photo, no text"))

    return ContentPlan(
        headline=result.get("headline", art.title),
        subtitle=result.get("subtitle", ""),
        body=result.get("body", ""),
        card_slides=card_slides,
        reels_script=result.get("reels_script", []),
        image_prompts=image_prompts[:len(card_slides)],
        mood=result.get("mood", "calm"),
        category=cand.category,
    )
