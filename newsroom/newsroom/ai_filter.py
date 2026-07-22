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


def select(cfg: Config, articles: list[Article]) -> list[Candidate]:
    if not articles:
        return []
    keep = int(cfg.get("filter.keep", 3))
    model = cfg.get("filter.model", "claude-opus-4-8")
    audience = cfg.get("filter.audience", "한국 인스타그램 사용자")
    criteria = cfg.get("filter.criteria", "")

    system = (
        "당신은 해외 뉴스 큐레이터입니다. 인스타그램 카드뉴스/릴스로 만들기 좋은 기사를 고릅니다.\n"
        f"타깃 독자: {audience}\n"
        "선별 기준:\n" + criteria
    )
    user = (
        f"다음 기사 중에서 콘텐츠로 만들기 가장 좋은 {keep}건을 골라 주세요. "
        "반드시 입력의 id 를 그대로 사용하고, 각 기사에 카테고리와 한국어 근거를 붙이세요.\n\n"
        + _format_articles(articles)
    )

    result = structured(cfg, system, user, _SCHEMA, model=model, max_tokens=2000)
    by_id = {a.id: a for a in articles}

    picks: list[Candidate] = []
    for p in result.get("picks", [])[:keep]:
        art = by_id.get(p.get("id"))
        if not art:
            continue
        picks.append(Candidate(
            article=art, reason=p.get("reason", ""),
            category=p.get("category", "today"), score=float(p.get("score", 0.0)),
        ))
    return picks
