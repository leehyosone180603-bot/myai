"""STEP 3 · TTS — 릴스 나레이션 음성 생성.

provider: elevenlabs | google. 키 없으면 None(무음 폴백).
스크립트 문장 리스트를 한 번에 합쳐 하나의 나레이션 mp3 로 만든다.
"""

from __future__ import annotations

from pathlib import Path

import requests

from .config import Config


def synthesize(cfg: Config, script: list[str], out_path: Path) -> str | None:
    provider = cfg.get("reels.tts.provider", "elevenlabs")
    text = " ".join(s.strip() for s in script if s.strip())
    if not text:
        return None
    try:
        if provider == "elevenlabs":
            return _elevenlabs(cfg, text, out_path)
        if provider == "google":
            return _google(cfg, text, out_path)
    except Exception as e:
        print(f"    ! TTS 실패({provider}): {e}")
    return None


def _elevenlabs(cfg: Config, text: str, out_path: Path) -> str | None:
    key = cfg.env("ELEVENLABS_API_KEY")
    voice = cfg.get("reels.tts.voice", "")
    if not key or not voice:
        return None
    resp = requests.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice}",
        headers={"xi-api-key": key, "Content-Type": "application/json"},
        json={"text": text, "model_id": "eleven_multilingual_v2"},
        timeout=120,
    )
    resp.raise_for_status()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(resp.content)
    return str(out_path)


def _google(cfg: Config, text: str, out_path: Path) -> str | None:
    key = cfg.env("GOOGLE_API_KEY")
    if not key:
        return None
    resp = requests.post(
        f"https://texttospeech.googleapis.com/v1/text:synthesize?key={key}",
        json={
            "input": {"text": text},
            "voice": {"languageCode": "ko-KR", "name": "ko-KR-Neural2-A"},
            "audioConfig": {"audioEncoding": "MP3"},
        },
        timeout=120,
    )
    resp.raise_for_status()
    import base64
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(base64.b64decode(resp.json()["audioContent"]))
    return str(out_path)
