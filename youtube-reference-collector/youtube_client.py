"""YouTube Data API v3 호출 래퍼.

쿼터를 아끼기 위한 원칙:
- search.list 는 1회당 100유닛으로 비싸므로 필요한 만큼만 호출한다.
- videos.list / channels.list / playlistItems.list 는 1유닛이므로
  항상 50개씩 묶어(batch) 호출한다.

각 호출마다 소비한 쿼터를 self.quota_used 에 누적해 사용자에게 보여준다.
"""

from __future__ import annotations

from typing import Callable, Iterable, Iterator

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError


# API 호출별 쿼터 비용(유닛)
COST_SEARCH = 100
COST_LIST = 1


class QuotaExceeded(Exception):
    """일일 쿼터를 초과했을 때 발생. 부분 결과라도 저장하도록 상위에서 처리한다."""


class YouTubeClient:
    def __init__(self, api_key: str, on_progress: Callable[[str], None] | None = None):
        self._yt = build("youtube", "v3", developerKey=api_key, cache_discovery=False)
        self.quota_used = 0
        self._log = on_progress or (lambda msg: None)

    # -- 내부 헬퍼 -----------------------------------------------------------

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

    # -- 검색 ----------------------------------------------------------------

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
            self._log(f"  검색 중... 후보 {len(ids)}개 수집 (쿼터 {self.quota_used}유닛)")
            page_token = resp.get("nextPageToken")
            if not page_token:
                break
        return ids

    # -- 영상 상세 -----------------------------------------------------------

    def fetch_videos(self, video_ids: Iterable[str]) -> list[dict]:
        """video id 들의 상세 통계를 50개씩 배치로 가져온다."""
        results: list[dict] = []
        for batch in _chunks(list(video_ids), 50):
            req = self._yt.videos().list(
                part="snippet,statistics,contentDetails",
                id=",".join(batch),
                maxResults=50,
            )
            resp = self._execute(req, COST_LIST)
            results.extend(resp.get("items", []))
        return results

    # -- 채널 상세 -----------------------------------------------------------

    def fetch_channels(self, channel_ids: Iterable[str]) -> dict[str, dict]:
        """채널 id 들의 통계 + 업로드 재생목록 id 를 50개씩 배치로 가져온다.

        반환: {channel_id: channel_resource}
        """
        out: dict[str, dict] = {}
        unique = list(dict.fromkeys(channel_ids))  # 순서 보존 중복 제거
        for batch in _chunks(unique, 50):
            req = self._yt.channels().list(
                part="snippet,statistics,contentDetails",
                id=",".join(batch),
                maxResults=50,
            )
            resp = self._execute(req, COST_LIST)
            for item in resp.get("items", []):
                out[item["id"]] = item
        return out

    # -- 업로드 재생목록 -----------------------------------------------------

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
                if _http_error_reason(err) in ("playlistNotFound", "playlistItemsNotAccessible"):
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


# -- 모듈 유틸 ---------------------------------------------------------------


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
