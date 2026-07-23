"""완성 파일(카드/릴스)을 공개 스토리지에 업로드 → 공개 URL 반환.

Cloudflare R2 (S3 호환)를 boto3 로 사용. 인스타 Graph API 가 요구하는
'공개 URL'을 만들기 위한 단계.

.env:
  R2_ACCOUNT_ID / R2_ENDPOINT   (둘 중 하나)
  R2_ACCESS_KEY_ID
  R2_SECRET_ACCESS_KEY
  R2_BUCKET (또는 config storage.bucket)
  PUBLIC_ASSET_BASE_URL         (버킷 공개 URL, 예: https://pub-xxxx.r2.dev)
키가 없으면 enabled=False → 파이프라인은 로컬 파일명만 반환(업로드 생략).
"""

from __future__ import annotations

import mimetypes
from pathlib import Path

from .config import Config

try:
    import boto3
except ImportError:  # pragma: no cover
    boto3 = None

_client = None


def enabled(cfg: Config) -> bool:
    return bool(cfg.env("R2_ACCESS_KEY_ID") and cfg.env("R2_SECRET_ACCESS_KEY")
                and cfg.env("PUBLIC_ASSET_BASE_URL"))


def _get_client(cfg: Config):
    global _client
    if boto3 is None:
        raise RuntimeError("boto3 미설치: `pip install boto3`")
    if _client is None:
        endpoint = cfg.env("R2_ENDPOINT") or \
            f"https://{cfg.require_env('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com"
        _client = boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=cfg.require_env("R2_ACCESS_KEY_ID"),
            aws_secret_access_key=cfg.require_env("R2_SECRET_ACCESS_KEY"),
            region_name="auto",
        )
    return _client


def upload(cfg: Config, local_path: str | Path, key: str) -> str | None:
    """로컬 파일을 key 경로로 업로드 → 공개 URL. 키 없으면 None."""
    if not enabled(cfg):
        return None
    local_path = Path(local_path)
    bucket = cfg.get("storage.bucket") or cfg.env("R2_BUCKET")
    if not bucket:
        raise RuntimeError("버킷 미지정: config storage.bucket 또는 .env R2_BUCKET 설정")
    ctype = mimetypes.guess_type(str(local_path))[0] or "application/octet-stream"
    client = _get_client(cfg)
    client.upload_file(str(local_path), bucket, key, ExtraArgs={"ContentType": ctype})
    base = cfg.env("PUBLIC_ASSET_BASE_URL").rstrip("/")
    return f"{base}/{key}"
