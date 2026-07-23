"""STEP 1 · AI 1차 선별.

수집한 Article 목록을 Claude 에게 주고, 카드뉴스/릴스로 만들기 좋은 후보
N건을 카테고리/근거와 함께 고르게 한다.
"""

from __future__ import annotations

from .ai import structured
from .config import Config
from .models import Article, Candidate

_SCHEMA = {
    "type": "object",
    "properties": {
        "picks": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string", "description": "입력으로 준 기사 id 그대로"},
                    "category": {"type": "string", "enum": ["economy", "world", "hot", "today"]},
                    "reason": {"type": "string", "description": "왜 콘텐츠로 좋은지 한 문장(한국어)"},
                    "score": {"type": "number", "description": "0~1 적합도"},
                },
                "required": ["id", "category", "reason", "score"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["picks"],
    "additionalProperties": False,
}


def _format_articles(articles: list[Article]) -> str:
    lines = []
    for a in articles:
        lines.append(f"[id={a.id}] ({a.source}) {a.title}\n    {a.summary[:280]}")
    return "\n".join(lines)


# 발행 스트림별 주제 힌트 (money=돈/경제, general=그 외 이슈)
_TOPIC_HINT = {
    "money": ("돈·경제 관련(시장·주가·환율·기업 실적·물가·부동산·가상자산·투자·무역 등) 기사만",
              "경제/비즈니스와 무관한 기사는 절대 고르지 마세요."),
    "general": ("돈·경제를 제외한, 화제가 될 만한 이슈(해외 토픽·과학기술·사회·문화·화제) 기사만",
                "주가·환율·기업 실적 같은 순수 경제 기사는 제외하세요."),
}


def select(cfg: Config, articles: list[Article], keep: int | None = None,
           topic: str | None = None) -> list[Candidate]:
    if not articles:
        return []
    keep = int(keep if keep is not None else cfg.get("filter.keep", 3))
    model = cfg.get("filter.model", "claude-opus-4-8")
    audience = cfg.get("filter.audience", "일본 인스타그램 사용자")
    criteria = cfg.get("filter.criteria", "")

    topic_line = ""
    if topic in _TOPIC_HINT:
        must, avoid = _TOPIC_HINT[topic]
        topic_line = f"\n[이번 선별 주제] {must}. {avoid}"

    system = (
        "당신은 해외 뉴스 큐레이터입니다. 인스타그램 카드뉴스/릴스로 만들기 좋은 기사를 고릅니다.\n"
        f"타깃 독자: {audience}\n"
        "선별 기준:\n" + criteria + topic_line
    )
    user = (
        f"다음 기사 중에서 콘텐츠로 만들기 가장 좋은 {keep}건을 골라 주세요. "
        "반드시 입력의 id 를 그대로 사용하고, 각 기사에 카테고리와 한국어 근거를 붙이세요."
        + topic_line + "\n\n"
        + _format_articles(articles)
    )

    result = structured(cfg, system, user, _SCHEMA, model=model, max_tokens=2000)
    by_id = {a.id: a for a in articles}

    picks: list[Candidate] = []
    for p in result.get("picks", [])[:keep]:
        art = by_id.get(p.get("id"))
        if not art:
            continue
        cat = p.get("category", "today")
        # 발행 스트림(topic): 명시되면 그대로, 아니면 카테고리로 추론(economy=money)
        cand_topic = topic if topic in _TOPIC_HINT else ("money" if cat == "economy" else "general")
        picks.append(Candidate(
            article=art, reason=p.get("reason", ""),
            category=cat, score=float(p.get("score", 0.0)), topic=cand_topic,
        ))
    return picks
