"""STEP 3 · 카드뉴스 렌더러 (첨부 5번째 사진의 템플릿 구조를 코드로 재현).

첨부 사진(음악 릴스 카드) 분석 → 4개 레이어 구조:
  1) 배경        : 풀블리드 이미지(AI 생성). cover-fit 크롭.
  2) 라벨 칩     : 좌상단 라운드 칩(카테고리 색 + 텍스트).
  3) 가독성 그라데이션 : 하단에서 위로 어두워지는 오버레이(제목 대비 확보).
  4) 제목 + 워터마크 : 좌하단 볼드 제목(2줄), 우하단 브랜드 워터마크.

Pillow 만으로 동작. 한국어 폰트는 config 우선 → 시스템 자동탐색(폴백)로 해결.
"""

from __future__ import annotations

import glob
import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

from .config import Config
from .models import ContentPlan

# 한국어 지원 폰트 후보(시스템). config 에 폰트가 없을 때 폴백으로 탐색.
_KO_FONT_CANDIDATES = [
    # 운영 권장 폰트 (있으면 우선)
    "**/Pretendard*.otf", "**/Pretendard*.ttf",
    "**/NotoSansKR*.otf", "**/NotoSansKR*.ttf",
    "**/NanumGothic*.ttf", "**/NanumBarunGothic*.ttf",
    # Windows 기본 한글 폰트 (맑은 고딕)
    "**/malgunbd.ttf", "**/malgun.ttf",
    # macOS 기본 한글 폰트
    "/System/Library/Fonts/**/AppleSDGothicNeo.ttc",
    "/System/Library/Fonts/**/*.ttc",
    # Linux/컨테이너 CJK 폴백 (한글 글리프 포함)
    "/usr/share/fonts/**/wqy-zenhei.ttc",
    "/usr/share/fonts/**/*CJK*.ttc", "/usr/share/fonts/**/*CJK*.otf",
    # 최후: 라틴 전용 (한글은 안 나오지만 크래시 방지)
    "/usr/share/fonts/**/DejaVuSans*.ttf",
]
_FONT_SEARCH_ROOTS = ["/usr/share/fonts", "/System/Library/Fonts", "/Library/Fonts",
                      os.path.expanduser("~/.fonts"),
                      r"C:\Windows\Fonts", os.path.expanduser("~/AppData/Local/Microsoft/Windows/Fonts")]


def _find_font(explicit: str, bold: bool) -> str:
    if explicit and Path(explicit).exists():
        return explicit
    for pattern in _KO_FONT_CANDIDATES:
        if pattern.startswith("/"):
            hits = glob.glob(pattern, recursive=True)
        else:
            hits = []
            for root in _FONT_SEARCH_ROOTS:
                hits += glob.glob(os.path.join(root, pattern), recursive=True)
        if bold:
            bold_hits = [h for h in hits if "bold" in h.lower()]
            if bold_hits:
                return bold_hits[0]
        if hits:
            return hits[0]
    raise RuntimeError("한국어 지원 폰트를 찾지 못했습니다. config card.font_bold 에 폰트 경로를 지정하세요.")


def _font(cfg: Config, size: int, bold: bool = True) -> ImageFont.FreeTypeFont:
    key = "card.font_bold" if bold else "card.font_regular"
    path = _find_font(cfg.get(key, "") or "", bold)
    return ImageFont.truetype(path, size)


def _cover_fit(img: Image.Image, w: int, h: int) -> Image.Image:
    """이미지를 목표 비율에 맞춰 잘라 채운다(cover)."""
    src_ratio = img.width / img.height
    dst_ratio = w / h
    if src_ratio > dst_ratio:               # 원본이 더 넓음 → 좌우 크롭
        new_w = int(img.height * dst_ratio)
        left = (img.width - new_w) // 2
        img = img.crop((left, 0, left + new_w, img.height))
    else:                                    # 원본이 더 김 → 상하 크롭
        new_h = int(img.width / dst_ratio)
        top = (img.height - new_h) // 2
        img = img.crop((0, top, img.width, top + new_h))
    return img.resize((w, h), Image.LANCZOS)


def _placeholder_bg(w: int, h: int, seed: str) -> Image.Image:
    """AI 이미지가 없을 때 쓰는 그라데이션 배경(데모/폴백)."""
    import hashlib
    hexcol = hashlib.sha1(seed.encode()).hexdigest()
    c1 = tuple(int(hexcol[i:i + 2], 16) for i in (0, 2, 4))
    c2 = tuple(int(hexcol[i:i + 2], 16) for i in (6, 8, 10))
    base = Image.new("RGB", (w, h))
    for y in range(h):
        t = y / h
        row = tuple(int(c1[i] * (1 - t) + c2[i] * t) for i in range(3))
        for x in range(0, w, 4):
            base.putpixel((x, y), row)
    return base.filter(ImageFilter.GaussianBlur(40))


def _bottom_gradient(w: int, h: int, opacity: float) -> Image.Image:
    """하단이 진하고 위로 갈수록 투명해지는 검정 그라데이션."""
    grad = Image.new("L", (1, h), 0)
    for y in range(h):
        t = y / h
        # 아래 40%부터 진해지도록
        a = max(0.0, (t - 0.45) / 0.55)
        grad.putpixel((0, y), int(255 * opacity * (a ** 1.4)))
    alpha = grad.resize((w, h))
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 255))
    overlay.putalpha(alpha)
    return overlay


def _wrap(draw, text: str, font, max_width: int, max_lines: int) -> list[str]:
    """어절 단위 그리디 줄바꿈 + 너무 긴 토큰은 글자 단위로 분해."""
    def width(s: str) -> int:
        return draw.textbbox((0, 0), s, font=font)[2]

    words = text.split()
    lines: list[str] = []
    cur = ""
    for word in words:
        trial = (cur + " " + word).strip()
        if width(trial) <= max_width:
            cur = trial
            continue
        if cur:
            lines.append(cur)
        # 단어 자체가 폭 초과 → 글자 단위 분해
        if width(word) > max_width:
            piece = ""
            for ch in word:
                if width(piece + ch) <= max_width:
                    piece += ch
                else:
                    lines.append(piece)
                    piece = ch
            cur = piece
        else:
            cur = word
    if cur:
        lines.append(cur)

    if len(lines) > max_lines:
        lines = lines[:max_lines]
        lines[-1] = lines[-1].rstrip() + "…"
    return lines


def _text_size(draw, text, font):
    b = draw.textbbox((0, 0), text, font=font)
    return b[2] - b[0], b[3] - b[1], b[1]  # width, height, top-offset


def _draw_top(draw, x, y_top, text, font, fill, shadow=None):
    """글자의 '시각적 윗변'이 y_top 에 오도록 그린다. 높이 반환."""
    _, hgt, top = _text_size(draw, text, font)
    if shadow:
        dx, dy, sc = shadow
        draw.text((x + dx, y_top - top + dy), text, font=font, fill=sc)
    draw.text((x, y_top - top), text, font=font, fill=fill)
    return hgt


def _counter_pill(draw, right_x, top_y, text, font):
    """우측 정렬 슬라이드 카운터(1/16) 알약. (폭, 높이) 반환."""
    tw, th, top = _text_size(draw, text, font)
    padx, pady = int(th * 0.9), int(th * 0.55)
    pw, ph = tw + padx * 2, th + pady * 2
    x0 = right_x - pw
    draw.rounded_rectangle([x0, top_y, x0 + pw, top_y + ph], radius=ph // 2, fill=(0, 0, 0, 120))
    draw.text((x0 + padx, top_y + pady - top), text, font=font, fill=(255, 255, 255, 235))
    return pw, ph


def render_card(cfg: Config, *, title: str, category: str = "", body: str = "",
                bg_path: str | None, out_path: Path, is_cover: bool = True,
                slide_index: int = 1, slide_total: int = 1) -> Path:
    """카드 1장 렌더링 (레퍼런스 스타일: 카운터 배지 · 큰 좌하단 제목 · 팔로우/태그라인)."""
    w, h = cfg.get("card.size", [1080, 1350])
    handle = cfg.get("card.brand", "")
    follow = (cfg.get("card.follow_prefix", "팔로우 ") + handle) if handle else ""
    tagline = cfg.get("card.tagline", "")
    brand_top = cfg.get("card.brand_top", "")
    show_counter = bool(cfg.get("card.show_counter", True))
    opacity = float(cfg.get("card.overlay_opacity", 0.5))

    # 1) 배경 (풀블리드 cover-fit)
    if bg_path and Path(bg_path).exists():
        bg = _cover_fit(Image.open(bg_path).convert("RGB"), w, h)
    else:
        bg = _placeholder_bg(w, h, seed=title)
    canvas = bg.convert("RGBA")

    # 2) 하단 가독성 그라데이션
    canvas.alpha_composite(_bottom_gradient(w, h, opacity))

    draw = ImageDraw.Draw(canvas)
    margin = int(w * 0.06)

    # 3) 우상단: 카운터 배지 + (선택) 브랜드 문구
    pill_left = w - margin
    ph = 0
    if show_counter and slide_total > 1:
        pw, ph = _counter_pill(draw, w - margin, margin,
                               f"{slide_index}/{slide_total}", _font(cfg, int(w * 0.030), bold=True))
        pill_left = w - margin - pw
    if brand_top:
        bf = _font(cfg, int(w * 0.026), bold=False)
        bw, bh, btop = _text_size(draw, brand_top, bf)
        by = margin + (ph - bh) // 2 if ph else margin
        draw.text((pill_left - int(w * 0.02) - bw, by - btop), brand_top,
                  font=bf, fill=(255, 255, 255, 195))

    # 4) 하단 블록: (아래→위) 태그라인 · 팔로우
    y_bottom = h - margin
    if tagline:
        tag_h = _draw_top(draw, margin, y_bottom - _text_size(draw, tagline, _font(cfg, int(w * 0.026), True))[1],
                          tagline, _font(cfg, int(w * 0.026), bold=True), fill=(255, 255, 255, 235),
                          shadow=(2, 2, (0, 0, 0, 140)))
        y_bottom -= tag_h + int(h * 0.010)
    follow_top = None
    if follow:
        fh = _text_size(draw, follow, _font(cfg, int(w * 0.028), False))[1]
        follow_top = y_bottom - fh
        _draw_top(draw, margin, follow_top, follow, _font(cfg, int(w * 0.028), bold=False),
                  fill=(255, 255, 255, 235), shadow=(2, 2, (0, 0, 0, 140)))
    else:
        follow_top = y_bottom

    # 5) 제목(표지) 또는 본문(내지) — 크고 굵게, 좌하단 블록 위에 배치
    text = title if is_cover else (body or title)
    max_lines = int(cfg.get("card.title_max_lines", 3)) if is_cover else 5
    font_size = int(w * (0.088 if is_cover else 0.056))
    tfont = _font(cfg, font_size, bold=True)
    lines = _wrap(draw, text, tfont, max_width=w - margin * 2, max_lines=max_lines)
    line_h = int(font_size * 1.16)
    title_bottom = follow_top - int(h * 0.03)
    y = title_bottom - line_h * len(lines)
    for ln in lines:
        draw.text((margin + 3, y + 3), ln, font=tfont, fill=(0, 0, 0, 170))  # 그림자
        draw.text((margin, y), ln, font=tfont, fill="white")
        y += line_h

    out_path.parent.mkdir(parents=True, exist_ok=True)
    rgb = canvas.convert("RGB")
    if out_path.suffix.lower() in (".jpg", ".jpeg"):
        rgb.save(out_path, "JPEG", quality=90)   # 인스타 발행은 JPEG 필요
    else:
        rgb.save(out_path, "PNG")
    return out_path


def render_bundle(cfg: Config, plan: ContentPlan, bg_paths: list[str | None],
                  out_dir: Path, slug: str) -> list[str]:
    """표지 + 본문 슬라이드 전체를 렌더링해 파일 경로 리스트 반환."""
    paths: list[str] = []
    total = len(plan.card_slides)
    for i, slide_text in enumerate(plan.card_slides):
        bg = bg_paths[i] if i < len(bg_paths) else None
        out = out_dir / f"{slug}_card{i + 1}.jpg"   # 인스타 발행 위해 JPEG
        render_card(
            cfg,
            title=plan.headline if i == 0 else slide_text,
            body=slide_text,
            category=plan.category,
            bg_path=bg,
            out_path=out,
            is_cover=(i == 0),
            slide_index=i + 1,
            slide_total=total,
        )
        paths.append(str(out))
    return paths
