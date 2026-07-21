"""STEP 3 · 릴스(영상) 생성.

흐름:
  1) 스크립트 문장별로 힉스필드(Higgsfield) 9:16 영상 클립 생성
  2) 클립들을 이어붙임 (ffmpeg concat)
  3) 나레이션(TTS) + mood 배경음악을 딜레이 없이 합성 (ffmpeg)
     - 나레이션 우선, 배경음악은 볼륨 다운(사이드체인 대신 간단 볼륨믹스)
  4) 최종 9:16 mp4 반환

힉스필드 API 실제 스키마는 계정/버전에 따라 다르므로 HiggsfieldClient 에
엔드포인트를 명확히 표시했다. 키가 없거나 ffmpeg 이 없으면 dry-run.
"""

from __future__ import annotations

import shutil
import subprocess
import time
from pathlib import Path

import requests

from .config import Config
from .models import ContentPlan


def _have_ffmpeg() -> bool:
    return shutil.which("ffmpeg") is not None


def _run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


# ── 힉스필드 클라이언트 ──────────────────────────────────────────────
class HiggsfieldClient:
    """text→video 클립 생성. 비동기 잡 생성 → 폴링 → mp4 다운로드.

    ※ 실제 엔드포인트/필드명은 힉스필드 대시보드의 API 문서에 맞춰 조정하세요.
    """

    def __init__(self, cfg: Config):
        self.key = cfg.env("HIGGSFIELD_API_KEY")
        self.base = cfg.env("HIGGSFIELD_API_BASE", "https://platform.higgsfield.ai").rstrip("/")
        self.clip_seconds = int(cfg.get("reels.clip_seconds", 5))
        self.w, self.h = cfg.get("reels.size", [1080, 1920])

    @property
    def enabled(self) -> bool:
        return bool(self.key)

    def _headers(self):
        return {"Authorization": f"Bearer {self.key}", "Content-Type": "application/json"}

    def generate_clip(self, prompt: str, out_path: Path, timeout: int = 300) -> str | None:
        if not self.enabled:
            return None
        # 1) 잡 생성  (엔드포인트/필드는 실제 문서 기준으로 교체)
        create = requests.post(
            f"{self.base}/v1/text2video",
            headers=self._headers(),
            json={"prompt": prompt, "aspect_ratio": "9:16",
                  "duration": self.clip_seconds, "resolution": f"{self.w}x{self.h}"},
            timeout=60,
        )
        create.raise_for_status()
        job_id = create.json().get("id") or create.json().get("job_id")
        if not job_id:
            return None

        # 2) 폴링
        deadline = time.time() + timeout
        video_url = None
        while time.time() < deadline:
            st = requests.get(f"{self.base}/v1/jobs/{job_id}", headers=self._headers(), timeout=30)
            st.raise_for_status()
            body = st.json()
            status = body.get("status")
            if status in ("succeeded", "completed", "done"):
                video_url = body.get("output", {}).get("url") or body.get("video_url")
                break
            if status in ("failed", "error"):
                raise RuntimeError(f"Higgsfield job 실패: {body}")
            time.sleep(5)
        if not video_url:
            raise TimeoutError("Higgsfield job 타임아웃")

        # 3) 다운로드
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_bytes(requests.get(video_url, timeout=120).content)
        return str(out_path)


# ── 배경음악 선택 ────────────────────────────────────────────────────
def pick_music(cfg: Config, mood: str) -> Path | None:
    music_dir = cfg.path(cfg.get("music.dir", "assets/music"))
    tracks = cfg.get("music.tracks", []) or []
    match = next((t for t in tracks if t.get("mood") == mood), None)
    if not match:
        match = tracks[0] if tracks else None
    if not match:
        return None
    p = music_dir / match["file"]
    return p if p.exists() else None


# ── ffmpeg 합성 ──────────────────────────────────────────────────────
def _concat_clips(clips: list[str], out: Path, w: int, h: int, fps: int) -> None:
    """클립들을 9:16 로 스케일/패드 후 이어붙인다."""
    inputs: list[str] = []
    filters: list[str] = []
    for i, c in enumerate(clips):
        inputs += ["-i", c]
        filters.append(
            f"[{i}:v]scale={w}:{h}:force_original_aspect_ratio=increase,"
            f"crop={w}:{h},setsar=1,fps={fps}[v{i}]"
        )
    concat_in = "".join(f"[v{i}]" for i in range(len(clips)))
    filtergraph = ";".join(filters) + f";{concat_in}concat=n={len(clips)}:v=1:a=0[outv]"
    _run(["ffmpeg", "-y", *inputs, "-filter_complex", filtergraph,
          "-map", "[outv]", "-r", str(fps), str(out)])


def _mux_audio(video: Path, narration: str | None, bgm: Path | None,
               out: Path, bgm_volume: float) -> None:
    """영상에 나레이션 + 배경음악을 입힌다. 나레이션 길이에 영상/BGM 을 맞춤."""
    inputs = ["-i", str(video)]
    amix_parts = []
    idx = 1
    if narration:
        inputs += ["-i", narration]
        amix_parts.append(f"[{idx}:a]")
        idx += 1
    if bgm:
        inputs += ["-stream_loop", "-1", "-i", str(bgm)]
        amix_parts.append(f"[bg]")

    filters = []
    if bgm:
        # 배경음악 볼륨 다운
        filters.append(f"[{idx}:a]volume={bgm_volume}[bg]")
    if amix_parts:
        filters.append(f"{''.join(amix_parts)}amix=inputs={len(amix_parts)}:"
                       f"duration=first:dropout_transition=0[aout]")
    filtergraph = ";".join(filters) if filters else None

    cmd = ["ffmpeg", "-y", *inputs]
    if filtergraph:
        cmd += ["-filter_complex", filtergraph, "-map", "0:v", "-map", "[aout]"]
    # 나레이션 길이에 맞춰 종료
    cmd += ["-shortest" if narration else "-t", "1" if not narration else "",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", str(out)]
    cmd = [c for c in cmd if c != ""]
    _run(cmd)


def build(cfg: Config, plan: ContentPlan, narration_path: str | None,
          out_dir: Path, slug: str) -> str | None:
    """릴스 최종 mp4 생성. 실패/도구부재 시 None."""
    w, h = cfg.get("reels.size", [1080, 1920])
    fps = int(cfg.get("reels.fps", 30))
    bgm_volume = float(cfg.get("reels.bgm_volume", 0.18))

    if not _have_ffmpeg():
        print("    ! ffmpeg 미설치 — 릴스 합성 생략 (apt/brew 로 ffmpeg 설치 필요)")
        return None

    client = HiggsfieldClient(cfg)
    if not client.enabled:
        print("    ! HIGGSFIELD_API_KEY 없음 — 릴스 영상 소스 생성 생략")
        return None

    # 1) 스크립트 문장별 클립 생성
    clips: list[str] = []
    for i, line in enumerate(plan.reels_script):
        clip = out_dir / f"{slug}_clip{i + 1}.mp4"
        try:
            got = client.generate_clip(line, clip)
        except Exception as e:
            print(f"    ! 클립 {i+1} 실패: {e}")
            got = None
        if got:
            clips.append(got)
    if not clips:
        return None

    # 2) concat
    stitched = out_dir / f"{slug}_stitched.mp4"
    _concat_clips(clips, stitched, w, h, fps)

    # 3) 나레이션 + 배경음악 합성
    bgm = pick_music(cfg, plan.mood)
    final = out_dir / f"{slug}_reel.mp4"
    _mux_audio(stitched, narration_path, bgm, final, bgm_volume)
    return str(final)
