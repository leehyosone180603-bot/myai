"""STEP 1 · 매일 소식 수집 — 해외 뉴스 RSS 피드 파싱.

여러 소스를 돌며 최근 기사만 모으고, 너무 짧은/오래된/중복 기사를 걸러
Article 리스트를 반환한다.
"""

from __future__ import annotations

import re
import time
from datetime import datetime, timezone, timedelta
from difflib import SequenceMatcher

from .config import Config
from .models import Article

try:
    import feedparser
except ImportError:  # pragma: no cover
    feedparser = None


def _clean_html(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text or "")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _entry_time(entry) -> datetime | None:
    for key in ("published_parsed", "updated_parsed"):
        t = getattr(entry, key, None) or entry.get(key)
        if t:
            return datetime.fromtimestamp(time.mktime(t), tz=timezone.utc)
    return None


def _is_recent(dt: datetime | None, lookback_hours: int) -> bool:
    if dt is None:
        return True  # 시간 정보가 없으면 일단 포함
    return dt >= datetime.now(timezone.utc) - timedelta(hours=lookback_hours)


def _similar(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def collect(cfg: Config) -> list[Article]:
    if feedparser is None:
        raise RuntimeError("feedparser 미설치: `pip install feedparser` 후 다시 실행하세요.")

    sources = cfg.get("sources", []) or []
    max_per = int(cfg.get("collect.max_per_source", 15))
    lookback = int(cfg.get("collect.lookback_hours", 36))
    min_chars = int(cfg.get("collect.min_summary_chars", 120))
    do_dedup = bool(cfg.get("collect.dedup", True))

    collected: list[Article] = []
    for src in sources:
        name, url = src.get("name", "?"), src.get("url", "")
        lang = src.get("lang", "en")
        if not url:
            continue
        try:
            feed = feedparser.parse(url)
        except Exception as e:  # 네트워크/파싱 오류는 소스 단위로 건너뜀
            print(f"  ! {name}: 파싱 실패 ({e})")
            continue

        kept = 0
        for entry in feed.entries:
            if kept >= max_per:
                break
            dt = _entry_time(entry)
            if not _is_recent(dt, lookback):
                continue
            summary = _clean_html(entry.get("summary", "") or entry.get("description", ""))
            title = _clean_html(entry.get("title", ""))
            if not title or len(summary) < min_chars:
                continue  # 스텁/옛날기사 차단
            collected.append(Article(
                source=name, title=title, url=entry.get("link", ""),
                summary=summary[:1200], lang=lang,
                published=dt.isoformat() if dt else "",
            ))
            kept += 1
        print(f"  · {name}: {kept}건")

    if do_dedup:
        collected = _dedup(collected)
    return collected


def _dedup(articles: list[Article], threshold: float = 0.82) -> list[Article]:
    unique: list[Article] = []
    for art in articles:
        if any(_similar(art.title, u.title) >= threshold for u in unique):
            continue
        unique.append(art)
    return unique
