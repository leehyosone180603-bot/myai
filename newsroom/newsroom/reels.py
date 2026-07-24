"""STEP 3 · 릴스(영상) 생성 — 단순화 버전.

방침: TTS·힉스필드 없이, 이미 만든 카드뉴스 썸네일 1장을
      약 10초짜리 영상(mp4)으로 만들어 릴스로 올린다.

  build_from_image(cfg, image_path, out_dir, slug)
    - 정지 이미지 → N초 영상 (기본 무음)
    - reels.zoom: true 면 아주 느린 줌(켄번스) 효과
    - reels.bgm: true 면 assets/music 의 배경음악을 얹음(선택)

ffmpeg 이 있어야 동작. 없으면 None 반환(발행에서 자동 생략).
"""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

from PIL import Image

from .config import Config


def _have_ffmpeg() -> bool:
    return shutil.which("ffmpeg") is not None


def _run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


# ── 배경음악 선택(선택 기능) ──────────────────────────────────────────
def pick_music(cfg: Config, mood: str = "") -> Path | None:
    music_dir = cfg.path(cfg.get("music.dir", "assets/music"))
    tracks = cfg.get("music.tracks", []) or []
    match = next((t for t in tracks if t.get("mood") == mood), None) or (tracks[0] if tracks else None)
    if not match:
        return None
    p = music_dir / match["file"]
    return p if p.exists() else None


def _even(n: int) -> int:
    return n - (n % 2)


def build_from_image(cfg: Config, image_path: str | None, out_dir: Path, slug: str,
                     mood: str = "") -> str | None:
    """카드 썸네일 1장 → 약 10초 mp4. 실패/도구부재 시 None."""
    if not image_path or not Path(image_path).exists():
        print("    ! 릴스용 썸네일 이미지가 없습니다 — 릴스 생략")
        return None
    if not _have_ffmpeg():
        print("    ! ffmpeg 미설치 — 릴스 영상 생략 (https://ffmpeg.org 설치 후 재시도)")
        return None

    duration = float(cfg.get("reels.duration", 10))
    fps = int(cfg.get("reels.fps", 30))
    zoom = bool(cfg.get("reels.zoom", False))
    use_bgm = bool(cfg.get("reels.bgm", False))
    bgm_volume = float(cfg.get("reels.bgm_volume", 0.18))

    with Image.open(image_path) as im:
        w, h = _even(im.width), _even(im.height)

    out = out_dir / f"{slug}_reel.mp4"
    out_dir.mkdir(parents=True, exist_ok=True)

    # 비디오 필터: 정지(기본) 또는 아주 느린 줌
    if zoom:
        frames = max(1, int(duration * fps))
        z_end = 1.10                                  # 10% 확대까지
        step = (z_end - 1.0) / frames
        # 입력을 2배로 키워 zoompan 지터 완화 → 출력 크기로 축소
        vf = (f"scale={w*2}:{h*2},"
              f"zoompan=z='min(zoom+{step:.6f},{z_end})':d={frames}:"
              f"s={w}x{h}:fps={fps},setsar=1,format=yuv420p")
    else:
        vf = f"scale={w}:{h},setsar=1,format=yuv420p"

    cmd = ["ffmpeg", "-y", "-loop", "1", "-i", str(image_path)]

    # 오디오: 배경음악(있으면) 또는 '무음' 트랙. 인스타 릴스는 오디오 트랙이 없으면
    # 처리 실패(ERROR)를 내므로, 무음이라도 AAC 트랙을 반드시 넣는다.
    bgm = pick_music(cfg, mood) if use_bgm else None
    if bgm:
        cmd += ["-stream_loop", "-1", "-i", str(bgm)]
    else:
        cmd += ["-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100"]

    cmd += ["-t", str(duration), "-r", str(fps), "-vf", vf,
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-map", "0:v", "-map", "1:a", "-c:a", "aac", "-b:a", "128k"]
    if bgm:
        cmd += ["-filter:a", f"volume={bgm_volume}"]
    cmd += ["-shortest", "-movflags", "+faststart", str(out)]

    try:
        _run(cmd)
    except subprocess.CalledProcessError as e:
        print(f"    ! ffmpeg 실패: {e.stderr.decode('utf-8', 'ignore')[:300]}")
        return None
    return str(out)


# ── 하위호환: 기존 진입점 이름 유지 (내부적으로 이미지→영상) ─────────────
def build(cfg: Config, plan, narration_path, out_dir: Path, slug: str,
          image_path: str | None = None) -> str | None:
    return build_from_image(cfg, image_path, out_dir, slug,
                            mood=getattr(plan, "mood", ""))
