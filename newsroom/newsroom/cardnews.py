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
    "**/NotoSansJP*.otf", "**/NotoSansJP*.ttf",
    "**/NotoSansKR*.otf", "**/NotoSansKR*.ttf",
    "**/NanumGothic*.ttf",
    # Windows 기본 일본어 폰트 (Yu Gothic / Meiryo / MS Gothic)
    "**/YuGothB.ttc", "**/YuGothM.ttc", "**/YuGothR.ttc",
    "**/meiryob.ttc", "**/meiryo.ttc", "**/msgothic.ttc",
    # macOS 일본어 (히라기노)
    "/System/Library/Fonts/**/ヒラギノ*.ttc", "/System/Library/Fonts/**/Hiragino*.ttc",
    # Windows 기본 한글 폰트 (맑은 고딕) — 한글 폴백
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


def _bottom_gradient(w: int, h: int, opacity: float, start: float = 0.5) -> Image.Image:
    """하단만 검정으로 어두워지는 그라데이션 (start 지점부터 아래로).

    start(0~1): 그라데이션이 시작되는 세로 위치(0.5=하단 절반). 그 위는 완전 투명 →
    이미지 상단을 가리지 않는다. 맨 아래에서도 opacity 까지만(완전 검정 아님) 올려
    배경 이미지가 은은히 비치게 한다.
    """
    span = max(0.01, 1.0 - start)
    grad = Image.new("L", (1, h), 0)
    for y in range(h):
        t = y / h
        a = max(0.0, (t - start) / span)      # start 위는 0(투명)
        grad.putpixel((0, y), int(255 * opacity * (a ** 1.5)))
    alpha = grad.resize((w, h))
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 255))
    overlay.putalpha(alpha)
    return overlay


def resolve_logo(cfg: Config) -> Path | None:
    """로고 파일을 찾는다. 우선 card.logo 경로, 없으면 assets/logo 폴더에서 자동 탐색.

    Windows 에서 '확장자 숨김' 때문에 logo.png 가 실제로는 logo.png.png / logo.jpg 로
    저장되는 흔한 실수를 흡수한다. (README/txt 는 제외)
    """
    rel = cfg.get("card.logo", "") or ""
    if rel:
        p = cfg.path(rel)
        if p.exists():
            return p
    logo_dir = cfg.path("assets/logo")
    if logo_dir.is_dir():
        cands = []
        for f in sorted(logo_dir.iterdir()):
            if f.is_file() and f.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp"):
                cands.append(f)
        # 'logo' 이름을 최우선
        cands.sort(key=lambda x: (0 if "logo" in x.stem.lower() else 1, x.name))
        if cands:
            return cands[0]
    return None


def _photo_top_bg(cfg: Config, src: Image.Image, w: int, h: int) -> tuple[Image.Image, int]:
    """가로로 긴 원본 사진을 상단에 그대로 배치하고 하단은 검정으로 채운다.

    (배경 이미지, 사진 하단 y) 반환. 아래 검정 영역에 제목/서브타이틀/로고가 들어간다.
    """
    max_ph = int(h * float(cfg.get("card.photo_top_max", 0.60)))   # 사진 최대 높이(제목 공간 확보)
    ph = round(w * src.height / src.width)                          # 폭을 카드에 맞췄을 때 높이
    canvas = Image.new("RGB", (w, h), (0, 0, 0))
    if ph <= max_ph:
        canvas.paste(src.resize((w, ph), Image.LANCZOS), (0, 0))
        seam = ph
    else:                                                          # 너무 높으면 상단 밴드에 맞춰 크롭
        canvas.paste(_cover_fit(src, w, max_ph), (0, 0))
        seam = max_ph
    return canvas, seam


def _seam_gradient(w: int, h: int, seam_y: int, blend: int) -> Image.Image:
    """사진↔검정 경계를 부드럽게: seam 위 blend 구간을 검정으로 서서히 페이드."""
    grad = Image.new("L", (1, h), 0)
    for y in range(h):
        if y >= seam_y:
            a = 255
        elif y >= seam_y - blend:
            a = int(255 * (y - (seam_y - blend)) / max(1, blend))
        else:
            a = 0
        grad.putpixel((0, y), a)
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 255))
    overlay.putalpha(grad.resize((w, h)))
    return overlay


def _load_logo(path: Path, target_w: int, remove_white: bool = True,
               white_thresh: int = 225) -> Image.Image:
    """로고 이미지를 불러와 (선택) 흰/오프화이트 배경 투명 처리 후 target_w 폭으로 리사이즈."""
    img = Image.open(path).convert("RGBA")
    if remove_white:
        px = img.getdata()
        out = []
        for r, g, b, a in px:
            # 밝고(모든 채널 높음) 채도 낮은(회색 계열) 픽셀 = 배경으로 보고 투명 처리
            if min(r, g, b) >= white_thresh and (max(r, g, b) - min(r, g, b)) <= 12:
                out.append((r, g, b, 0))
            else:
                out.append((r, g, b, a))
        img.putdata(out)
    if img.width != target_w:
        ratio = target_w / img.width
        img = img.resize((target_w, max(1, int(img.height * ratio))), Image.LANCZOS)
    return img


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


def _draw_top(draw, x, y_top, text, font, fill, shadow=None, stroke=0):
    """글자의 '시각적 윗변'이 y_top 에 오도록 그린다. 높이 반환."""
    _, hgt, top = _text_size(draw, text, font)
    if shadow:
        dx, dy, sc = shadow
        draw.text((x + dx, y_top - top + dy), text, font=font, fill=sc,
                  stroke_width=stroke, stroke_fill=sc)
    draw.text((x, y_top - top), text, font=font, fill=fill,
              stroke_width=stroke, stroke_fill=fill)
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
                subtitle: str = "", bg_path: str | None, out_path: Path, is_cover: bool = True,
                slide_index: int = 1, slide_total: int = 1) -> Path:
    """카드 1장 렌더링 (레퍼런스: 카테고리 칩 · 큰 제목 · 서브타이틀 · 하단중앙 로고)."""
    w, h = cfg.get("card.size", [1080, 1350])
    handle = cfg.get("card.brand", "")
    follow = (cfg.get("card.follow_prefix", "팔로우 ") + handle) if handle else ""
    tagline = cfg.get("card.tagline", "")
    brand_top = cfg.get("card.brand_top", "")
    show_counter = bool(cfg.get("card.show_counter", True))
    opacity = float(cfg.get("card.overlay_opacity", 0.85))
    grad_start = float(cfg.get("card.gradient_start", 0.5))   # 하단 절반부터

    # 1) 배경
    photo_seam = None                                    # 상단사진+하단검정 레이아웃일 때 사진 하단 y
    photo_top = bool(cfg.get("card.photo_top", True))
    if bg_path and Path(bg_path).exists():
        src = Image.open(bg_path).convert("RGB")
        # 가로로 긴(카드 비율보다 넓은) 원본 사진 → 위: 사진 그대로, 아래: 검정 배경
        if photo_top and src.width / src.height > (w / h) * 1.02:
            bg, photo_seam = _photo_top_bg(cfg, src, w, h)
        else:
            bg = _cover_fit(src, w, h)                    # 세로/정방형은 풀블리드
    else:
        bg = _placeholder_bg(w, h, seed=title)
    canvas = bg.convert("RGBA")

    # 2) 가독성 그라데이션
    if photo_seam is not None:                            # 사진↔검정 경계만 부드럽게
        canvas.alpha_composite(_seam_gradient(w, h, photo_seam, int(h * 0.10)))
    else:                                                 # 풀블리드: 하단만 검정 그라데이션
        canvas.alpha_composite(_bottom_gradient(w, h, opacity, grad_start))

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

    # 4) 맨 아래 로고 (assets/logo 있으면 하단 중앙에 작게, 흰배경 제거)
    y_bottom = h - margin
    logo_path = resolve_logo(cfg)
    if logo_path is not None:
        logo = _load_logo(logo_path, int(w * float(cfg.get("card.logo_scale", 0.30))),
                          remove_white=bool(cfg.get("card.logo_remove_white", True)))
        # logo_bottom: 로고 아래여백(카드 높이 대비). 작을수록 로고가 더 아래로 내려간다.
        logo_gap = int(h * float(cfg.get("card.logo_bottom", 0.05)))
        logo_y = h - logo_gap - logo.height
        canvas.alpha_composite(logo, ((w - logo.width) // 2, logo_y))
        y_bottom = logo_y - int(h * 0.012)      # 텍스트 블록은 로고 위에 쌓임

    # 5) 하단 텍스트 블록: (위→아래) 카테고리 칩 · 제목 · 서브타이틀
    text = title if is_cover else (body or title)
    sub = subtitle if is_cover else ""
    chip_text = cfg.get("card.chip_labels", {}).get(category, "")

    max_lines = int(cfg.get("card.title_max_lines", 2)) if is_cover else 5
    title_size = int(w * (float(cfg.get("card.title_scale", 0.078)) if is_cover else 0.052))
    # 얇은 시스템 폰트도 굵게 보이도록 stroke(글자 외곽선)로 두께 보강. 0=끔.
    title_stroke = max(0, int(title_size * float(cfg.get("card.title_stroke", 0.035))))
    tfont = _font(cfg, title_size, bold=True)
    sfont = _font(cfg, int(w * 0.040), bold=True)       # 서브타이틀
    cfont = _font(cfg, int(w * 0.030), bold=True)       # 칩

    tlines = _wrap(draw, text, tfont, max_width=w - margin * 2, max_lines=max_lines)
    line_h = int(title_size * 1.16)
    title_h = line_h * len(tlines)
    sub_h = _text_size(draw, sub, sfont)[1] if sub else 0
    cpadx, cpady = int(w * 0.024), int(w * 0.012)
    chip_dim = _text_size(draw, chip_text, cfont) if chip_text else (0, 0, 0)
    chip_h = (chip_dim[1] + cpady * 2) if chip_text else 0
    gap = int(h * 0.014)

    # 아래(로고 위)에서부터 위로 쌓기: 서브타이틀 → 제목 → 칩
    cur = y_bottom - int(h * 0.01)
    sub_top = None
    if sub:
        sub_top = cur - sub_h
        cur = sub_top - gap
    title_top = cur - title_h
    cur = title_top - gap
    chip_top = cur - chip_h

    if chip_text:                                        # 카테고리 칩(반투명 검정 라운드)
        cw = chip_dim[0] + cpadx * 2
        draw.rounded_rectangle([margin, chip_top, margin + cw, chip_top + chip_h],
                               radius=int(chip_h * 0.28), fill=(0, 0, 0, 150))
        draw.text((margin + cpadx, chip_top + cpady - chip_dim[2]), chip_text,
                  font=cfont, fill=(255, 255, 255, 245))

    y = title_top                                        # 제목
    for ln in tlines:
        draw.text((margin + 3, y + 3), ln, font=tfont, fill=(0, 0, 0, 180),
                  stroke_width=title_stroke, stroke_fill=(0, 0, 0, 180))
        draw.text((margin, y), ln, font=tfont, fill="white",
                  stroke_width=title_stroke, stroke_fill="white")
        y += line_h

    if sub:                                              # 서브타이틀 (제목보다 얇게)
        _draw_top(draw, margin, sub_top, sub, sfont, fill=(255, 255, 255, 230),
                  shadow=(2, 2, (0, 0, 0, 150)),
                  stroke=max(0, int(title_size * float(cfg.get("card.title_stroke", 0.035)) * 0.4)))

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
            subtitle=plan.subtitle,
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
