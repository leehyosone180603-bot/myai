"""수집한 원본 데이터를 레퍼런스 판단용 지표로 가공한다.

핵심 아이디어(운영 원칙):
- 절대 조회수가 아니라 "채널 평소보다 얼마나 더 터졌나"(아웃라이어 배수)가 아이디어의 힘이다.
- 채널 평균은 최근 영상 기준으로, 같은 형식(숏폼/롱폼)끼리만 비교한다.
- 한 영상의 떡상으로 평균이 부풀려지는 문제를 완화하기 위해 중앙값도 함께 본다.
"""

from __future__ import annotations

import re
import statistics
from dataclasses import dataclass, field
from datetime import datetime, timezone

# 숏폼 기준: 60초 이하
SHORT_MAX_SECONDS = 60
# 채널 평균 신뢰도 하한: 같은 형식 표본이 이 개수 미만이면 신뢰도 낮음
MIN_SAMPLE_FOR_CONFIDENCE = 5


@dataclass
class VideoStat:
    video_id: str
    title: str
    url: str
    thumbnail: str
    channel_id: str
    channel_title: str
    published_at: datetime
    duration_seconds: int
    is_short: bool
    views: int
    # 비공개일 수 있는 값은 None 으로 구분
    likes: int | None
    comments: int | None

    # 후처리로 채워지는 값들
    subscribers: int | None = None
    channel_avg: float | None = None
    channel_median: float | None = None
    sample_size: int = 0
    low_confidence: bool = False
    outlier_mean: float | None = None      # views / 평균
    outlier_median: float | None = None    # views / 중앙값
    velocity: float | None = None          # 일일 조회수
    engagement: float | None = None        # (좋아요+댓글)/조회수
    views_per_sub: float | None = None     # 조회수/구독자
    title_pattern: str = ""

    form: str = field(init=False)

    def __post_init__(self):
        self.form = "숏폼" if self.is_short else "롱폼"


# -- 파싱 --------------------------------------------------------------------


def parse_duration(iso: str) -> int:
    """ISO 8601 duration(PT#H#M#S)을 초로 변환한다."""
    m = re.fullmatch(
        r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso or ""
    )
    if not m:
        return 0
    h, mi, s = (int(x) if x else 0 for x in m.groups())
    return h * 3600 + mi * 60 + s


def _parse_dt(value: str) -> datetime:
    # 예: 2024-05-01T12:00:00Z
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _int_or_none(stats: dict, key: str) -> int | None:
    """statistics 에서 값을 읽되, 비공개(키 없음)면 None 을 반환한다."""
    if key not in stats:
        return None
    try:
        return int(stats[key])
    except (TypeError, ValueError):
        return None


def build_video_stat(resource: dict) -> VideoStat | None:
    """videos.list 항목 하나를 VideoStat 으로 변환한다."""
    vid = resource.get("id")
    snippet = resource.get("snippet", {})
    stats = resource.get("statistics", {})
    content = resource.get("contentDetails", {})
    if not vid or not snippet:
        return None

    views = _int_or_none(stats, "viewCount")
    if views is None:
        return None  # 조회수 없는 영상은 분석 불가

    dur = parse_duration(content.get("duration", ""))
    thumbs = snippet.get("thumbnails", {})
    thumb = (
        thumbs.get("maxres")
        or thumbs.get("high")
        or thumbs.get("medium")
        or thumbs.get("default")
        or {}
    ).get("url", "")

    return VideoStat(
        video_id=vid,
        title=snippet.get("title", ""),
        url=f"https://www.youtube.com/watch?v={vid}",
        thumbnail=thumb,
        channel_id=snippet.get("channelId", ""),
        channel_title=snippet.get("channelTitle", ""),
        published_at=_parse_dt(snippet.get("publishedAt", "1970-01-01T00:00:00Z")),
        duration_seconds=dur,
        is_short=dur > 0 and dur <= SHORT_MAX_SECONDS,
        views=views,
        likes=_int_or_none(stats, "likeCount"),
        comments=_int_or_none(stats, "commentCount"),
    )


# -- 채널 평균 계산 ----------------------------------------------------------


def channel_form_averages(sample_videos: list[VideoStat]) -> dict[str, dict]:
    """채널의 최근 표본 영상을 숏폼/롱폼으로 나눠 평균·중앙값을 계산한다.

    반환: {"숏폼": {"mean":..,"median":..,"n":..}, "롱폼": {...}}
    """
    out: dict[str, dict] = {}
    for form in ("숏폼", "롱폼"):
        views = [v.views for v in sample_videos if v.form == form]
        if views:
            out[form] = {
                "mean": statistics.mean(views),
                "median": statistics.median(views),
                "n": len(views),
            }
        else:
            out[form] = {"mean": None, "median": None, "n": 0}
    return out


# -- 지표 계산 ---------------------------------------------------------------


def enrich(
    video: VideoStat,
    channel_averages: dict[str, dict],
    subscribers: int | None,
    now: datetime | None = None,
) -> None:
    """한 영상에 아웃라이어 배수·velocity·참여율 등 지표를 채운다(in-place)."""
    now = now or datetime.now(timezone.utc)

    stats = channel_averages.get(video.form, {})
    mean = stats.get("mean")
    median = stats.get("median")
    n = stats.get("n", 0)

    video.channel_avg = mean
    video.channel_median = median
    video.sample_size = n
    video.low_confidence = n < MIN_SAMPLE_FOR_CONFIDENCE
    video.subscribers = subscribers

    if mean and mean > 0:
        video.outlier_mean = video.views / mean
    if median and median > 0:
        video.outlier_median = video.views / median

    # 일일 조회수(velocity)
    age_days = max((now - video.published_at).total_seconds() / 86400, 1.0)
    video.velocity = video.views / age_days

    # 참여율 (좋아요/댓글 둘 중 하나라도 공개면 계산; 둘 다 비공개면 None)
    if video.views > 0 and (video.likes is not None or video.comments is not None):
        interactions = (video.likes or 0) + (video.comments or 0)
        video.engagement = interactions / video.views

    if subscribers and subscribers > 0:
        video.views_per_sub = video.views / subscribers

    video.title_pattern = classify_title(video.title)


# -- 제목 패턴 분류 ----------------------------------------------------------


def classify_title(title: str) -> str:
    """제목을 반복 앵글(패턴)로 대략 분류한다. 여러 패턴이면 우선순위로 하나 선택."""
    t = title.strip()
    if re.search(r"[?？]", t):
        return "질문형"
    if re.search(r"\d", t):
        return "숫자형"
    if re.search(r"(충격|경악|실화|소름|반전|미쳤|레전드|충격적|폭로|논란)", t):
        return "자극·호기심형"
    if re.search(r"(방법|하는 법|하는법|꿀팁|정리|총정리|가이드|노하우|비법)", t):
        return "정보·하우투형"
    if re.search(r"(후기|리뷰|브이로그|vlog|일상|경험)", t, re.IGNORECASE):
        return "경험·후기형"
    if re.search(r"[\"'“”‘’].+[\"'“”‘’]", t):
        return "인용·대사형"
    return "기타"


# -- 필터 / 정렬 -------------------------------------------------------------


def filter_and_sort(
    videos: list[VideoStat],
    multiplier: float,
    sort_key: str = "views",
) -> list[VideoStat]:
    """아웃라이어 배수(평균 기준) >= multiplier 인 영상만 남기고 정렬한다."""
    kept = [
        v for v in videos
        if v.outlier_mean is not None and v.outlier_mean >= multiplier
    ]

    def key(v: VideoStat):
        if sort_key == "velocity":
            return v.velocity or 0
        if sort_key == "multiplier":
            return v.outlier_mean or 0
        return v.views  # 기본: 조회수

    kept.sort(key=key, reverse=True)
    return kept


def pattern_summary(videos: list[VideoStat]) -> list[tuple[str, int, float]]:
    """결과를 제목 패턴별로 묶어 (패턴, 개수, 평균 아웃라이어배수) 리스트로 반환한다."""
    buckets: dict[str, list[VideoStat]] = {}
    for v in videos:
        buckets.setdefault(v.title_pattern, []).append(v)
    rows = []
    for pat, items in buckets.items():
        mults = [v.outlier_mean for v in items if v.outlier_mean]
        avg_mult = statistics.mean(mults) if mults else 0.0
        rows.append((pat, len(items), avg_mult))
    rows.sort(key=lambda r: r[1], reverse=True)
    return rows
