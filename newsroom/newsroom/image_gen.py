"""STEP 3 · 이미지 생성 — 카드뉴스 배경 이미지 생성.

provider 추상화: config image.provider 로 gemini | grok 선택.
- gemini : google-genai SDK (Imagen). 추천(RECOMMENDATIONS.md).
- grok   : xAI OpenAI-호환 이미지 엔드포인트(requests).
둘 다 키가 없으면 dry-run(None 반환)으로 폴백 → 카드뉴스는 그라데이션 배경으로 렌더.
"""

from __future__ import annotations

import base64
from pathlib import Path

import requests

from .config import Config


def generate(cfg: Config, prompt: str, out_path: Path) -> str | None:
    """프롬프트로 이미지 1장 생성 → 파일 저장 후 경로 반환. 실패/키없음 시 None."""
    provider = cfg.get("image.provider", "gemini")
    style = cfg.get("image.style", "")
    full_prompt = f"{prompt}. {style}".strip()

    try:
        if provider == "gemini":
            return _gemini(cfg, full_prompt, out_path)
        if provider == "grok":
            return _grok(cfg, full_prompt, out_path)
    except Exception as e:  # 이미지 실패는 파이프라인을 막지 않음(그라데이션 폴백)
        print(f"    ! 이미지 생성 실패({provider}): {e}")
    return None


# ── Gemini / Imagen ─────────────────────────────────────────────────
def _gemini(cfg: Config, prompt: str, out_path: Path) -> str | None:
    key = cfg.env("GOOGLE_API_KEY")
    if not key:
        return None
    try:
        from google import genai
    except ImportError:
        print("    ! google-genai 미설치: pip install google-genai")
        return None

    client = genai.Client(api_key=key)
    model = cfg.get("image.gemini_model", "imagen-4.0-generate-001")
    ar = cfg.get("image.aspect_ratio", "3:4")
    resp = client.models.generate_images(
        model=model,
        prompt=prompt,
        config={"number_of_images": 1, "aspect_ratio": ar},
    )
    if not resp.generated_images:
        return None
    img_bytes = resp.generated_images[0].image.image_bytes
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(img_bytes)
    return str(out_path)


# ── Grok (xAI) ──────────────────────────────────────────────────────
def _grok(cfg: Config, prompt: str, out_path: Path) -> str | None:
    key = cfg.env("XAI_API_KEY")
    if not key:
        return None
    # xAI 는 OpenAI 호환 images 엔드포인트 제공
    model = cfg.get("image.grok_model", "grok-2-image")
    resp = requests.post(
        "https://api.x.ai/v1/images/generations",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        json={"model": model, "prompt": prompt, "response_format": "b64_json"},
        timeout=120,
    )
    resp.raise_for_status()
    data = resp.json()["data"][0]
    if "b64_json" in data:
        raw = base64.b64decode(data["b64_json"])
    else:  # url 형태 폴백
        raw = requests.get(data["url"], timeout=120).content
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(raw)
    return str(out_path)


def generate_many(cfg: Config, prompts: list[str], out_dir: Path, slug: str) -> list[str | None]:
    paths: list[str | None] = []
    for i, p in enumerate(prompts):
        out = out_dir / f"{slug}_bg{i + 1}.png"
        paths.append(generate(cfg, p, out))
    return paths
