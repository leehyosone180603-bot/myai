"""STEP 3 · 이미지 생성 — 카드뉴스 배경 이미지 생성.

provider 추상화: config image.provider 로 gemini | grok 선택.
- gemini : google-genai SDK (Imagen). 추천(RECOMMENDATIONS.md).
- grok   : xAI OpenAI-호환 이미지 엔드포인트(requests).
둘 다 키가 없으면 dry-run(None 반환)으로 폴백 → 카드뉴스는 그라데이션 배경으로 렌더.
"""

from __future__ import annotations

import base64
import re
from pathlib import Path
from urllib.parse import urljoin

import requests

from .config import Config


def fetch_hero_image(url: str) -> str:
    """기사 페이지에서 대표 이미지 URL(og:image/twitter:image)을 추출. 실패 시 빈 문자열.

    RSS 피드에 이미지가 없을 때, 거의 모든 뉴스 기사에 있는 대표 사진을 안정적으로 가져온다.
    """
    if not url:
        return ""
    try:
        r = requests.get(url, timeout=20, headers={"User-Agent": "Mozilla/5.0"})
        r.raise_for_status()
        html = r.text
        patterns = [
            r'<meta[^>]+property=["\']og:image(?::secure_url|:url)?["\'][^>]+content=["\']([^"\']+)["\']',
            r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']',
            r'<meta[^>]+name=["\']twitter:image(?::src)?["\'][^>]+content=["\']([^"\']+)["\']',
        ]
        for pat in patterns:
            m = re.search(pat, html, re.I)
            if m and m.group(1):
                return urljoin(url, m.group(1).strip())
    except Exception:
        return ""
    return ""


def generate(cfg: Config, prompt: str, out_path: Path | str) -> str | None:
    """프롬프트로 이미지 1장 생성 → 파일 저장 후 경로 반환. 실패/키없음 시 None."""
    out_path = Path(out_path)  # 문자열 경로도 허용
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
    model = cfg.get("image.grok_model", "grok-imagine-image")
    resp = requests.post(
        "https://api.x.ai/v1/images/generations",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        json={"model": model, "prompt": prompt},
        timeout=180,
    )
    resp.raise_for_status()
    data = resp.json()["data"][0]
    if data.get("b64_json"):
        raw = base64.b64decode(data["b64_json"])
    else:  # grok-imagine-image 는 url 로 반환
        raw = requests.get(data["url"], timeout=180).content
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(raw)
    return str(out_path)


def download_original(cfg: Config, url: str, out_path: Path | str) -> str | None:
    """뉴스 원본 사진을 그대로 내려받아 카드 배경으로 저장(JPEG 정규화). 실패 시 None.

    AI 생성/재해석 없이 '원본 그대로' 사용하고, 출처는 캡션에 명시한다.
    """
    out_path = Path(out_path)
    if not url:
        return None
    try:
        from PIL import Image
        import io
        r = requests.get(url, timeout=60, headers={"User-Agent": "Mozilla/5.0"})
        r.raise_for_status()
        img = Image.open(io.BytesIO(r.content)).convert("RGB")
        # 아이콘·트래킹픽셀 수준으로 작은 것만 거른다(실제 사진은 최대한 사용)
        if min(img.size) < 300:
            print(f"    ! 원본 사진이 너무 작음({img.size}) — 사용 안 함")
            return None
        out_path.parent.mkdir(parents=True, exist_ok=True)
        img.save(out_path, "JPEG", quality=92)
        return str(out_path)
    except Exception as e:
        print(f"    ! 원본 사진 다운로드 실패: {e}")
        return None


def _read_source(source: str) -> tuple[bytes, str] | None:
    """원본 이미지 URL/경로 → (bytes, mime). 실패 시 None."""
    try:
        if source.startswith("http"):
            r = requests.get(source, timeout=60)
            r.raise_for_status()
            mime = r.headers.get("Content-Type", "image/jpeg").split(";")[0]
            return r.content, mime
        p = Path(source)
        return p.read_bytes(), "image/jpeg"
    except Exception:
        return None


def generate_from_source(cfg: Config, source: str, out_path: Path) -> str | None:
    """2-1: 뉴스 원본 사진을 Gemini 이미지편집으로 '유사하지만 저작권 회피' 재해석.

    Gemini(google-genai)만 이미지→이미지를 지원. 키/패키지 없으면 None(호출부가 text→image로 폴백).
    """
    key = cfg.env("GOOGLE_API_KEY")
    if not key or not source:
        return None
    src = _read_source(source)
    if not src:
        return None
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        print("    ! google-genai 미설치: pip install google-genai")
        return None

    img_bytes, mime = src
    prompt = cfg.get("image.reinterpret_prompt",
                     "Recreate this news photo as an original editorial illustration that keeps the "
                     "same scene, composition and mood, but is a distinct new artwork (avoid copyright). "
                     "Photorealistic, high detail, no text, no logos, no watermark.")
    model = cfg.get("image.gemini_edit_model", "gemini-2.5-flash-image")
    try:
        client = genai.Client(api_key=key)
        resp = client.models.generate_content(
            model=model,
            contents=[prompt, types.Part.from_bytes(data=img_bytes, mime_type=mime)],
        )
        for part in resp.candidates[0].content.parts:
            inline = getattr(part, "inline_data", None)
            if inline and inline.data:
                out_path.parent.mkdir(parents=True, exist_ok=True)
                out_path.write_bytes(inline.data)
                return str(out_path)
    except Exception as e:
        print(f"    ! Gemini 이미지편집 실패(→ text2image 폴백): {e}")
    return None


def generate_many(cfg: Config, prompts: list[str], out_dir: Path, slug: str) -> list[str | None]:
    paths: list[str | None] = []
    for i, p in enumerate(prompts):
        out = out_dir / f"{slug}_bg{i + 1}.png"
        paths.append(generate(cfg, p, out))
    return paths
