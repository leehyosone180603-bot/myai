"""설정 로드: config/ai.yaml + .env 를 합쳐 하나의 Config 로 제공."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

try:
    from dotenv import load_dotenv
except ImportError:  # python-dotenv 미설치 시에도 동작 (환경변수 직접 사용)
    def load_dotenv(*_a, **_k):  # type: ignore
        return False

# newsroom/ 의 상위 = 프로젝트 루트
ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CONFIG = ROOT / "config" / "ai.yaml"


@dataclass
class Config:
    """ai.yaml 의 트리 + 자주 쓰는 환경변수 접근을 감싼 래퍼."""

    data: dict[str, Any]
    root: Path = ROOT

    # ── ai.yaml 접근 (점 경로) ────────────────────────────────────
    def get(self, path: str, default: Any = None) -> Any:
        """`filter.keep` 같은 점 경로로 중첩 값을 읽는다."""
        cur: Any = self.data
        for part in path.split("."):
            if not isinstance(cur, dict) or part not in cur:
                return default
            cur = cur[part]
        return cur

    def __getitem__(self, key: str) -> Any:
        return self.data[key]

    # ── 환경변수(비밀값) ─────────────────────────────────────────
    @staticmethod
    def env(name: str, default: str = "") -> str:
        return os.environ.get(name, default)

    @staticmethod
    def require_env(name: str) -> str:
        val = os.environ.get(name)
        if not val:
            raise RuntimeError(
                f"환경변수 {name} 가 설정되지 않았습니다. .env.example 을 참고해 .env 를 채우세요."
            )
        return val

    # ── 경로 헬퍼 (상대경로 → 프로젝트 루트 기준 절대경로) ──────────
    def path(self, relative: str) -> Path:
        p = Path(relative)
        return p if p.is_absolute() else self.root / p

    @property
    def out_dir(self) -> Path:
        d = self.path(self.get("output.dir", "out"))
        d.mkdir(parents=True, exist_ok=True)
        return d

    @property
    def state_file(self) -> Path:
        return self.path(self.get("output.state_file", "out/state.json"))


def _deep_merge(base: dict, over: dict) -> dict:
    for k, v in over.items():
        if isinstance(v, dict) and isinstance(base.get(k), dict):
            _deep_merge(base[k], v)
        else:
            base[k] = v
    return base


def load_config(config_path: str | os.PathLike | None = None) -> Config:
    """.env 로드 후 지정 config 파싱. layout_overrides.yaml(있으면) 병합.

    멀티 채널: config 에 `env_file: .env.ko` 가 있으면 공통 .env 위에 그 파일을
    덮어 로드한다(채널별 텔레그램 봇/인스타 토큰 분리). 없으면 .env 만 사용.
    """
    load_dotenv(ROOT / ".env")                     # 공통 기본값(예: R2 공용)
    path = Path(config_path) if config_path else DEFAULT_CONFIG
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    # 채널 전용 자격증명 파일(있으면 공통값 위에 덮어쓰기)
    env_file = data.get("env_file")
    if env_file:
        load_dotenv(ROOT / env_file, override=True)
    # 레이아웃 편집기(layout_editor.py)가 저장하는 오버라이드 병합 (주석 보존용 별도 파일)
    overrides = ROOT / "config" / "layout_overrides.yaml"
    if overrides.exists():
        with open(overrides, "r", encoding="utf-8") as f:
            _deep_merge(data, yaml.safe_load(f) or {})
    return Config(data=data)
