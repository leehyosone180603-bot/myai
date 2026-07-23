"""파이프라인 단계 간 주고받는 데이터 구조."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Any


def _uid(*parts: str) -> str:
    return hashlib.sha1("|".join(parts).encode("utf-8")).hexdigest()[:12]


@dataclass
class Article:
    """RSS 에서 수집한 원문 기사 1건."""

    source: str
    title: str
    url: str
    summary: str = ""
    published: str = ""
    lang: str = "en"
    image_url: str = ""      # 기사 원본 사진 (있으면 2-1 이미지편집 원본으로 사용)

    @property
    def id(self) -> str:
        return _uid(self.url or self.title)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "Article":
        return cls(**{k: d.get(k, "") for k in
                      ("source", "title", "url", "summary", "published", "lang", "image_url")})


@dataclass
class Candidate:
    """AI 1차 선별을 통과한 후보 + 선별 근거."""

    article: Article
    reason: str = ""          # AI 가 고른 이유 (텔레그램 미리보기에 표시)
    category: str = "today"   # economy | world | hot | today
    score: float = 0.0

    @property
    def id(self) -> str:
        return self.article.id

    def to_dict(self) -> dict[str, Any]:
        return {"article": self.article.to_dict(), "reason": self.reason,
                "category": self.category, "score": self.score}

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "Candidate":
        return cls(article=Article.from_dict(d["article"]), reason=d.get("reason", ""),
                   category=d.get("category", "today"), score=d.get("score", 0.0))


@dataclass
class ContentPlan:
    """작가(ai_writer)가 만든 카드/릴스 원고."""

    headline: str                       # 카드 표지 제목 (2줄 이내)
    subtitle: str = ""                  # 제목 아래 한 줄 서브타이틀(각도/한줄요약)
    card_slides: list[str] = field(default_factory=list)   # 슬라이드별 본문 텍스트
    reels_script: list[str] = field(default_factory=list)  # 릴스 나레이션 문장(=클립 단위)
    image_prompts: list[str] = field(default_factory=list) # 슬라이드별 이미지 생성 프롬프트
    mood: str = "calm"                  # 배경음악 mood
    category: str = "today"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "ContentPlan":
        return cls(**{k: d.get(k) for k in
                      ("headline", "subtitle", "card_slides", "reels_script",
                       "image_prompts", "mood", "category")})


@dataclass
class Bundle:
    """한 기사에 대한 최종 결과물(파일 경로 모음)."""

    candidate: Candidate
    plan: ContentPlan | None = None
    card_paths: list[str] = field(default_factory=list)
    reel_path: str = ""
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_dict(self) -> dict[str, Any]:
        return {"candidate": self.candidate.to_dict(),
                "plan": self.plan.to_dict() if self.plan else None,
                "card_paths": self.card_paths, "reel_path": self.reel_path,
                "created_at": self.created_at}
