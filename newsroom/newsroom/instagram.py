"""STEP 4 · 인스타그램 자동 업로드 (Instagram Graph API).

- 카드뉴스: 여러 이미지 → 캐러셀(carousel) 게시물
- 릴스    : 단일 영상 → REELS 게시물
Graph API 는 '공개 URL'을 요구한다. 완성 파일을 S3/R2/GCS 등에 올려
공개 URL(PUBLIC_ASSET_BASE_URL)로 접근 가능하게 만든 뒤 그 URL 을 넘긴다.

키(IG_USER_ID/IG_ACCESS_TOKEN)가 없으면 dry-run(업로드 생략).
"""

from __future__ import annotations

import time

import requests

from .config import Config

GRAPH = "https://graph.facebook.com/v21.0"


class Instagram:
    def __init__(self, cfg: Config):
        self.user_id = cfg.env("IG_USER_ID")
        self.token = cfg.env("IG_ACCESS_TOKEN")
        self.base_url = cfg.env("PUBLIC_ASSET_BASE_URL").rstrip("/")

    @property
    def enabled(self) -> bool:
        return bool(self.user_id and self.token)

    def public_url(self, filename_or_url: str) -> str:
        if filename_or_url.startswith("http"):
            return filename_or_url
        return f"{self.base_url}/{filename_or_url.lstrip('/')}"

    # ── 캐러셀(카드뉴스) ─────────────────────────────────────────
    def publish_carousel(self, image_urls: list[str], caption: str) -> str | None:
        if not self.enabled:
            print("    ! IG 자격증명 없음 — 카드뉴스 업로드 생략")
            return None
        # 1) 각 이미지 → 캐러셀 아이템 컨테이너
        children = []
        for url in image_urls:
            r = self._post(f"/{self.user_id}/media",
                           {"image_url": self.public_url(url), "is_carousel_item": "true"})
            children.append(r["id"])
        # 2) 캐러셀 컨테이너
        carousel = self._post(f"/{self.user_id}/media",
                              {"media_type": "CAROUSEL",
                               "children": ",".join(children), "caption": caption})
        # 3) 발행
        return self._publish(carousel["id"])

    # ── 릴스 ────────────────────────────────────────────────────
    def publish_reel(self, video_url: str, caption: str, cover_url: str | None = None) -> str | None:
        if not self.enabled:
            print("    ! IG 자격증명 없음 — 릴스 업로드 생략")
            return None
        params = {"media_type": "REELS", "video_url": self.public_url(video_url), "caption": caption}
        if cover_url:
            params["cover_url"] = self.public_url(cover_url)
        container = self._post(f"/{self.user_id}/media", params)
        self._wait_ready(container["id"])
        return self._publish(container["id"])

    # ── 내부 ────────────────────────────────────────────────────
    def _post(self, path: str, params: dict) -> dict:
        params = {**params, "access_token": self.token}
        r = requests.post(f"{GRAPH}{path}", data=params, timeout=120)
        r.raise_for_status()
        return r.json()

    def _wait_ready(self, container_id: str, timeout: int = 300) -> None:
        """영상은 서버 처리시간 필요 → status_code=FINISHED 대기."""
        deadline = time.time() + timeout
        while time.time() < deadline:
            r = requests.get(f"{GRAPH}/{container_id}",
                             params={"fields": "status_code", "access_token": self.token},
                             timeout=30)
            r.raise_for_status()
            status = r.json().get("status_code")
            if status == "FINISHED":
                return
            if status == "ERROR":
                raise RuntimeError("IG 미디어 처리 실패")
            time.sleep(5)
        raise TimeoutError("IG 미디어 처리 타임아웃")

    def _publish(self, creation_id: str) -> str:
        r = self._post(f"/{self.user_id}/media_publish", {"creation_id": creation_id})
        return r.get("id", "")
