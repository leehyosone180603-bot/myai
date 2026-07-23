#!/usr/bin/env python3
"""유튜브 레퍼런스 수집기 — 단일 실행 파일.

주제어를 입력하면 관련 유튜브 영상을 모아, 각 영상이 속한 채널의 평균 조회수 대비
몇 배나 터졌는지(아웃라이어 배수)를 계산해 "베껴올 가치가 있는 레퍼런스"만 골라낸다.

핵심 가설:
    한 영상의 조회수가 그 채널 평균보다 훨씬 높다면(아웃라이어), 채널 규모가 아니라
    그 영상의 주제·제목·썸네일이 먹혔다는 뜻이다 = 베껴올 가치가 있는 레퍼런스.

운영 원칙(README 참고):
    - 절대 조회수가 아니라 "채널 평소 대비 얼마나 더 터졌나"가 아이디어의 힘을 보여준다.
    - 작은 채널의 아웃라이어일수록 구독자 후광 없이 순수하게 이긴 케이스 → 가치가 크다.
    - 최근성·velocity·참여율·제목 패턴을 함께 봐 "지금 통하는 앵글"을 찾는다.

사용 예:
    python collect.py "퇴사"
    python collect.py "재테크 초보" --multiplier 5 --since 6m --sort velocity

의존성:
    pip install -r requirements.txt   (google-api-python-client, python-dotenv)

이 파일 하나로 전부 동작한다(검색 → 통계 수집 → 채널 평균 → 필터/정렬 → 콘솔·CSV·JSON).
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import statistics
import sys
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from typing import Callable, Iterable, Iterator

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError


# ===========================================================================
#  상수
# ===========================================================================

# API 호출별 쿼터 비용(유닛)
COST_SEARCH = 100
COST_LIST = 1

# 숏폼 기준: 60초 이하
SHORT_MAX_SECONDS = 60
# 채널 평균 신뢰도 하한: 같은 형식 표본이 이 개수 미만이면 신뢰도 낮음
MIN_SAMPLE_FOR_CONFIDENCE = 5


# ===========================================================================
#  YouTube Data API v3 래퍼
#
#  쿼터를 아끼기 위한 원칙:
#   - search.list 는 1회당 100유닛으로 비싸므로 필요한 만큼만 호출한다.
#   - videos.list / channels.list / playlistItems.list 는 1유닛이므로
#     항상 50개씩 묶어(batch) 호출한다.
# ===========================================================================


class QuotaExceeded(Exception):
    """일일 쿼터를 초과했을 때 발생. 부분 결과라도 저장하도록 상위에서 처리한다."""


class YouTubeClient:
    def __init__(self, api_key: str, on_progress: Callable[[str], None] | None = None):
        self._yt = build("youtube", "v3", developerKey=api_key, cache_discovery=False)
        self.quota_used = 0
        self._log = on_progress or (lambda msg: None)

    def _execute(self, request, cost: int):
        """API 요청을 실행하고 쿼터 소비를 기록한다. 쿼터 초과는 QuotaExceeded 로 변환."""
        try:
            result = request.execute()
        except HttpError as err:
            reason = _http_error_reason(err)
            if reason in ("quotaExceeded", "dailyLimitExceeded", "rateLimitExceeded"):
                raise QuotaExceeded(
                    f"YouTube API 쿼터를 초과했습니다 (reason={reason}). "
                    f"지금까지 소비한 쿼터: {self.quota_used}유닛."
                ) from err
            raise
        self.quota_used += cost
        return result

    def search_video_ids(
        self,
        query: str,
        max_results: int,
        order: str = "relevance",
        published_after: str | None = None,
    ) -> list[str]:
        """주제어로 영상을 검색해 video id 목록을 반환한다.

        pageToken 을 따라가며 max_results 개까지 모은다.
        search.list 는 페이지당 최대 50개, 1회 100유닛이다.
        """
        ids: list[str] = []
        page_token: str | None = None
        while len(ids) < max_results:
            want = min(50, max_results - len(ids))
            req = self._yt.search().list(
                q=query,
                part="id",
                type="video",
                maxResults=want,
                order=order,
                pageToken=page_token,
                publishedAfter=published_after,
                relevanceLanguage="ko",
            )
            resp = self._execute(req, COST_SEARCH)
            for item in resp.get("items", []):
                vid = item.get("id", {}).get("videoId")
                if vid:
                    ids.append(vid)
            self._log(f"      검색 중... 후보 {len(ids)}개 (쿼터 {self.quota_used}유닛)")
            page_token = resp.get("nextPageToken")
            if not page_token:
                break
        return ids

    def fetch_videos(self, video_ids: Iterable[str]) -> list[dict]:
        """video id 들의 상세 통계를 50개씩 배치로 가져온다."""
        results: list[dict] = []
        for batch in _chunks(list(video_ids), 50):
            if not batch:
                continue
            req = self._yt.videos().list(
                part="snippet,statistics,contentDetails",
                id=",".join(batch),
                maxResults=50,
            )
            resp = self._execute(req, COST_LIST)
            results.extend(resp.get("items", []))
        return results

    def fetch_channels(self, channel_ids: Iterable[str]) -> dict[str, dict]:
        """채널 id 들의 통계 + 업로드 재생목록 id 를 50개씩 배치로 가져온다.

        반환: {channel_id: channel_resource}
        """
        out: dict[str, dict] = {}
        unique = list(dict.fromkeys(channel_ids))  # 순서 보존 중복 제거
        for batch in _chunks(unique, 50):
            if not batch:
                continue
            req = self._yt.channels().list(
                part="snippet,statistics,contentDetails",
                id=",".join(batch),
                maxResults=50,
            )
            resp = self._execute(req, COST_LIST)
            for item in resp.get("items", []):
                out[item["id"]] = item
        return out

    def fetch_recent_upload_ids(self, uploads_playlist_id: str, limit: int) -> list[str]:
        """채널의 업로드 재생목록에서 최근 영상 id 를 limit 개까지 가져온다."""
        ids: list[str] = []
        page_token: str | None = None
        while len(ids) < limit:
            want = min(50, limit - len(ids))
            req = self._yt.playlistItems().list(
                part="contentDetails",
                playlistId=uploads_playlist_id,
                maxResults=want,
                pageToken=page_token,
            )
            try:
                resp = self._execute(req, COST_LIST)
            except HttpError as err:
                # 비공개/삭제된 재생목록 등은 건너뛴다.
                if _http_error_reason(err) in (
                    "playlistNotFound",
                    "playlistItemsNotAccessible",
                ):
                    break
                raise
            for item in resp.get("items", []):
                vid = item.get("contentDetails", {}).get("videoId")
                if vid:
                    ids.append(vid)
            page_token = resp.get("nextPageToken")
            if not page_token:
                break
        return ids


def _chunks(seq: list, size: int) -> Iterator[list]:
    for i in range(0, len(seq), size):
        yield seq[i : i + size]


def _http_error_reason(err: HttpError) -> str:
    """HttpError 에서 첫 번째 error reason 문자열을 안전하게 추출한다."""
    try:
        details = err.error_details  # type: ignore[attr-defined]
        if details:
            return details[0].get("reason", "")
    except Exception:
        pass
    try:
        return err.resp.reason or ""
    except Exception:
        return ""


# ===========================================================================
#  데이터 모델 + 지표 계산
#
#  핵심 아이디어:
#   - 절대 조회수가 아니라 아웃라이어 배수가 아이디어의 힘을 보여준다.
#   - 채널 평균은 최근 영상 기준으로, 같은 형식(숏폼/롱폼)끼리만 비교한다.
#   - 한 영상의 떡상으로 평균이 부풀려지는 문제를 완화하려 중앙값도 함께 본다.
# ===========================================================================


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


def parse_duration(iso: str) -> int:
    """ISO 8601 duration(PT#H#M#S)을 초로 변환한다."""
    m = re.fullmatch(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso or "")
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


# ===========================================================================
#  출력 (콘솔 표 + CSV/JSON)
# ===========================================================================


def _fmt_int(n: int | None) -> str:
    if n is None:
        return "비공개"
    return f"{n:,}"


def _fmt_float(n: float | None, suffix: str = "") -> str:
    if n is None:
        return "-"
    return f"{n:,.1f}{suffix}"


def _fmt_pct(n: float | None) -> str:
    if n is None:
        return "비공개"
    return f"{n * 100:.1f}%"


def _truncate(text: str, width: int) -> str:
    """한글 폭을 고려해 대략적으로 자른다(한글=2칸)."""
    out = []
    used = 0
    for ch in text:
        w = 2 if ord(ch) > 0x1100 else 1
        if used + w > width:
            out.append("…")
            break
        out.append(ch)
        used += w
    return "".join(out)


def print_console(videos: list[VideoStat], keyword: str, multiplier: float) -> None:
    if not videos:
        print(f"\n조건(아웃라이어 배수 >= {multiplier})을 만족하는 영상이 없습니다.\n")
        return

    print(f"\n{'=' * 100}")
    print(f"  '{keyword}' 레퍼런스 — 채널 평균 대비 {multiplier}배 이상 터진 영상 "
          f"{len(videos)}개")
    print(f"{'=' * 100}\n")

    header = (
        f"{'#':>2}  {'제목':<40}  {'조회수':>10}  {'좋아요':>8}  {'댓글':>7}  "
        f"{'배수':>6}  {'일일뷰':>9}  {'참여율':>6}  {'형식':<4}  {'채널':<16}  {'업로드':<10}"
    )
    print(header)
    print("-" * len(header))

    for i, v in enumerate(videos, 1):
        flag = "⚠" if v.low_confidence else " "
        mult = f"{v.outlier_mean:.1f}x" if v.outlier_mean else "-"
        row = (
            f"{i:>2}{flag} {_truncate(v.title, 40):<40}  "
            f"{_fmt_int(v.views):>10}  {_fmt_int(v.likes):>8}  {_fmt_int(v.comments):>7}  "
            f"{mult:>6}  {_fmt_float(v.velocity):>9}  {_fmt_pct(v.engagement):>6}  "
            f"{v.form:<4}  {_truncate(v.channel_title, 16):<16}  "
            f"{v.published_at.date().isoformat():<10}"
        )
        print(row)

    print("\n⚠ = 채널 표본이 적어 신뢰도 낮음\n")

    # 패턴 요약 — 레퍼런스는 모으는 게 아니라 반복되는 앵글을 찾는 것
    print(f"{'─' * 60}")
    print("  📊 제목 패턴별 분포 (어떤 앵글이 반복적으로 터지나)")
    print(f"{'─' * 60}")
    for pat, count, avg_mult in pattern_summary(videos):
        bar = "█" * count
        print(f"  {pat:<12} {count:>3}개  평균배수 {avg_mult:>5.1f}x  {bar}")
    print()


CSV_FIELDS = [
    "rank", "title", "url", "thumbnail", "views", "likes", "comments",
    "outlier_mean", "outlier_median", "channel_avg", "channel_median",
    "sample_size", "low_confidence", "velocity", "engagement", "views_per_sub",
    "form", "duration_seconds", "channel_title", "subscribers",
    "published_at", "title_pattern",
]


def _to_row(rank: int, v: VideoStat) -> dict:
    return {
        "rank": rank,
        "title": v.title,
        "url": v.url,
        "thumbnail": v.thumbnail,
        "views": v.views,
        "likes": "" if v.likes is None else v.likes,
        "comments": "" if v.comments is None else v.comments,
        "outlier_mean": round(v.outlier_mean, 2) if v.outlier_mean else "",
        "outlier_median": round(v.outlier_median, 2) if v.outlier_median else "",
        "channel_avg": round(v.channel_avg, 1) if v.channel_avg else "",
        "channel_median": round(v.channel_median, 1) if v.channel_median else "",
        "sample_size": v.sample_size,
        "low_confidence": v.low_confidence,
        "velocity": round(v.velocity, 1) if v.velocity else "",
        "engagement": round(v.engagement, 4) if v.engagement is not None else "",
        "views_per_sub": round(v.views_per_sub, 3) if v.views_per_sub else "",
        "form": v.form,
        "duration_seconds": v.duration_seconds,
        "channel_title": v.channel_title,
        "subscribers": "" if v.subscribers is None else v.subscribers,
        "published_at": v.published_at.isoformat(),
        "title_pattern": v.title_pattern,
    }


def _safe_name(keyword: str) -> str:
    return re.sub(r"[^\w가-힣]+", "_", keyword).strip("_") or "keyword"


def save_files(videos: list[VideoStat], keyword: str, out_dir: str = ".") -> tuple[str, str]:
    """CSV + JSON 파일을 저장하고 (csv경로, json경로)를 반환한다."""
    os.makedirs(out_dir, exist_ok=True)
    stamp = date.today().isoformat()
    base = f"references_{_safe_name(keyword)}_{stamp}"
    csv_path = os.path.join(out_dir, base + ".csv")
    json_path = os.path.join(out_dir, base + ".json")

    rows = [_to_row(i, v) for i, v in enumerate(videos, 1)]

    with open(csv_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        writer.writeheader()
        writer.writerows(rows)

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(
            {"keyword": keyword, "generated": stamp, "count": len(rows), "results": rows},
            f,
            ensure_ascii=False,
            indent=2,
        )

    return csv_path, json_path


# ===========================================================================
#  CLI
# ===========================================================================


def log(msg: str) -> None:
    print(msg, flush=True)


def load_api_key() -> str:
    key = os.environ.get("YOUTUBE_API_KEY")
    if not key:
        # .env 파일이 있으면 로드 시도 (python-dotenv 선택적 의존성)
        try:
            from dotenv import load_dotenv

            load_dotenv()
            key = os.environ.get("YOUTUBE_API_KEY")
        except ImportError:
            pass
    if not key:
        sys.exit(
            "오류: 환경변수 YOUTUBE_API_KEY 가 없습니다.\n"
            "  - export YOUTUBE_API_KEY='발급받은_키'  또는\n"
            "  - .env 파일에 YOUTUBE_API_KEY=... 를 넣어주세요.\n"
            "  키 발급 방법은 README.md 를 참고하세요."
        )
    return key


def parse_since(value: str | None) -> str | None:
    """'6m' / '1y' / '90d' 형태를 RFC3339 publishedAfter 문자열로 변환한다."""
    if not value:
        return None
    value = value.strip().lower()
    unit = value[-1]
    try:
        amount = int(value[:-1])
    except ValueError:
        sys.exit(f"오류: --since 형식이 잘못되었습니다: {value} (예: 6m, 1y, 90d)")
    days = {"d": 1, "w": 7, "m": 30, "y": 365}.get(unit)
    if not days:
        sys.exit(f"오류: --since 단위는 d/w/m/y 중 하나여야 합니다: {value}")
    cutoff = datetime.now(timezone.utc) - timedelta(days=amount * days)
    return cutoff.replace(microsecond=0).isoformat().replace("+00:00", "Z")


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="유튜브 채널 평균 대비 아웃라이어 영상(레퍼런스)을 수집한다.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("keyword", help="검색할 주제어 (예: 퇴사, 재테크 초보)")
    p.add_argument("--multiplier", type=float, default=4.0,
                   help="아웃라이어 배수 임계값 (영상 조회수 >= 채널 평균 x 이 값)")
    p.add_argument("--max-results", type=int, default=150,
                   help="검색으로 모을 후보 영상 수 (search.list 는 100유닛/호출)")
    p.add_argument("--sample", type=int, default=30,
                   help="채널 평균 계산에 쓸 최근 영상 표본 수")
    p.add_argument("--since", default=None,
                   help="업로드 기간 필터 (예: 6m, 1y, 90d). 미지정 시 제한 없음")
    p.add_argument("--sort", choices=["views", "velocity", "multiplier"],
                   default="views", help="결과 정렬 기준")
    p.add_argument("--order", choices=["relevance", "viewCount", "date"],
                   default="relevance", help="검색(search.list) 정렬 순서")
    p.add_argument("--out-dir", default=".", help="결과 파일 저장 폴더")
    return p


def _safe_int(value) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def run(args: argparse.Namespace) -> None:
    api_key = load_api_key()
    published_after = parse_since(args.since)

    client = YouTubeClient(api_key, on_progress=log)
    now = datetime.now(timezone.utc)

    collected: list[VideoStat] = []
    partial = False

    try:
        # 1) 검색으로 후보 영상 id 수집
        log(f"[1/4] '{args.keyword}' 검색 중... (최대 {args.max_results}개)")
        video_ids = client.search_video_ids(
            args.keyword,
            max_results=args.max_results,
            order=args.order,
            published_after=published_after,
        )
        if not video_ids:
            log("검색 결과가 없습니다.")
            return
        log(f"      후보 {len(video_ids)}개 확보.")

        # 2) 영상 상세 통계 배치 수집
        log("[2/4] 영상 통계 수집 중... (50개씩 배치)")
        raw_videos = client.fetch_videos(video_ids)
        videos = [vs for vs in map(build_video_stat, raw_videos) if vs]
        log(f"      {len(videos)}개 영상 통계 확보.")

        # 3) 채널 정보(구독자, 업로드 재생목록) 수집
        channel_ids = [v.channel_id for v in videos if v.channel_id]
        log(f"[3/4] 채널 {len(set(channel_ids))}개 정보 수집 중...")
        channels = client.fetch_channels(channel_ids)

        # 4) 채널별 최근 영상으로 평균/중앙값 계산
        log(f"[4/4] 채널 평균 조회수 계산 중... (채널당 최근 {args.sample}개)")
        channel_form_avgs: dict[str, dict] = {}
        channel_subs: dict[str, int | None] = {}
        for idx, (cid, ch) in enumerate(channels.items(), 1):
            stats = ch.get("statistics", {})
            hidden = stats.get("hiddenSubscriberCount")
            subs = None if hidden else _safe_int(stats.get("subscriberCount"))
            channel_subs[cid] = subs

            uploads = (
                ch.get("contentDetails", {})
                .get("relatedPlaylists", {})
                .get("uploads")
            )
            if not uploads:
                channel_form_avgs[cid] = {}
                continue
            recent_ids = client.fetch_recent_upload_ids(uploads, args.sample)
            recent_raw = client.fetch_videos(recent_ids)
            recent = [vs for vs in map(build_video_stat, recent_raw) if vs]
            channel_form_avgs[cid] = channel_form_averages(recent)
            if idx % 10 == 0:
                log(f"      {idx}/{len(channels)} 채널 처리 (쿼터 {client.quota_used}유닛)")

        # 지표 계산
        for v in videos:
            avgs = channel_form_avgs.get(v.channel_id, {})
            enrich(v, avgs, channel_subs.get(v.channel_id), now=now)
        collected = videos

    except QuotaExceeded as e:
        partial = True
        log(f"\n⚠ {e}")
        log("  지금까지 수집된 부분 결과라도 저장합니다.")
    except KeyboardInterrupt:
        partial = True
        log("\n중단됨. 부분 결과를 저장합니다.")

    # 필터 + 정렬
    results = filter_and_sort(collected, args.multiplier, sort_key=args.sort)

    # 출력
    print_console(results, args.keyword, args.multiplier)
    if results:
        csv_path, json_path = save_files(results, args.keyword, args.out_dir)
        log(f"💾 저장 완료:\n   - {csv_path}\n   - {json_path}")
    log(f"\n총 소비 쿼터: {client.quota_used}유닛 (일일 기본 한도 10,000)")
    if partial:
        log("※ 부분 수집 결과입니다.")


def main() -> None:
    run(build_parser().parse_args())


if __name__ == "__main__":
    main()
