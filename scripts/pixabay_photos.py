#!/usr/bin/env python3
"""Pixabay 사진 후보 수집 → 몽타주 → 선택본 리사이즈 도구
(후보 사진·몽타주는 저장소 밖 PIX_WORK 폴더에만 저장하고, 최종 사진만 img/ 에 넣는다).

키는 환경변수 PIXABAY_API_KEY 에서만 읽고, 출력·파일에 남기지 않는다.

사용:
  scripts/pixabay_photos.py cands <slug> <n> "<keyword>" [<keyword2> ...]   # 슬롯별 후보 6장 (키워드 순서대로 채움)
  scripts/pixabay_photos.py montage <slug>                                   # 그 글의 모든 슬롯 후보를 한 장으로
  scripts/pixabay_photos.py pick <slug> <n> <idx> <repo_dir>                 # 선택본을 1200px JPG 로 img/<slug>-<n>.jpg 저장
"""
import json, os, sys, time, urllib.parse, urllib.request
from PIL import Image, ImageDraw, ImageFont

# 후보 사진·몽타주는 저장소 밖 작업 폴더에만 저장 (기본 /home/user/pixtools)
BASE = os.environ.get("PIX_WORK", "/home/user/pixtools")
CAND = os.path.join(BASE, "cand")
MONT = os.path.join(BASE, "montage")
CREDITS = os.path.join(BASE, "credits.json")
UA = "Mozilla/5.0 (compatible; health-blog-photo-picker/1.0)"


def key():
    k = os.environ.get("PIXABAY_API_KEY", "")
    if not k:
        sys.exit("PIXABAY_API_KEY 가 없습니다")
    return k


def get(url, timeout=25):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def search(q, per_page=20):
    params = {
        "key": key(), "q": q, "image_type": "photo", "orientation": "horizontal",
        "safesearch": "true", "per_page": per_page, "order": "popular", "min_width": 1000,
    }
    url = "https://pixabay.com/api/?" + urllib.parse.urlencode(params)
    try:
        d = json.loads(get(url))
    except Exception as e:  # 키가 들어간 URL 은 출력하지 않음
        print(f"  검색 실패({q}): {type(e).__name__}")
        return []
    return d.get("hits", [])


def cands(slug, n, keywords):
    d = os.path.join(CAND, f"{slug}-{n}")
    os.makedirs(d, exist_ok=True)
    for f in os.listdir(d):
        os.remove(os.path.join(d, f))
    meta, seen = [], set()
    for q in keywords:
        for h in search(q):
            if len(meta) >= 6:
                break
            if h["id"] in seen or h.get("imageWidth", 0) < 1000:
                continue
            seen.add(h["id"])
            i = len(meta)
            try:
                data = get(h["webformatURL"])
            except Exception as e:
                print(f"  미리보기 실패 {h['id']}: {type(e).__name__}")
                continue
            open(os.path.join(d, f"{i}.jpg"), "wb").write(data)
            meta.append({"idx": i, "id": h["id"], "q": q, "tags": h.get("tags", ""),
                         "large": h.get("largeImageURL"), "page": h.get("pageURL"),
                         "user": h.get("user"), "w": h.get("imageWidth"), "h": h.get("imageHeight")})
        if len(meta) >= 6:
            break
    json.dump(meta, open(os.path.join(d, "meta.json"), "w"), ensure_ascii=False, indent=1)
    print(f"{slug}-{n}: {len(meta)}장 ({', '.join(m['tags'][:30] for m in meta)})")


def font(sz):
    for p in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
              "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"]:
        if os.path.exists(p):
            return ImageFont.truetype(p, sz)
    return ImageFont.load_default()


def montage(slug):
    os.makedirs(MONT, exist_ok=True)
    slots = sorted(x for x in os.listdir(CAND) if x.startswith(slug + "-") and x[len(slug) + 1:].isdigit())
    TW, TH, cols = 260, 173, 6
    rows = len(slots)
    img = Image.new("RGB", (cols * TW + 70, rows * (TH + 8) + 8), "white")
    dr = ImageDraw.Draw(img)
    f, fs = font(22), font(30)
    for r, s in enumerate(slots):
        y = 8 + r * (TH + 8)
        dr.text((10, y + TH // 2 - 15), s.split("-")[-1], fill="black", font=fs)
        for c in range(cols):
            p = os.path.join(CAND, s, f"{c}.jpg")
            if not os.path.exists(p):
                continue
            t = Image.open(p).convert("RGB")
            t.thumbnail((TW - 6, TH - 6))
            x = 60 + c * TW
            img.paste(t, (x, y))
            dr.rectangle([x, y, x + 28, y + 28], fill="black")
            dr.text((x + 7, y + 2), str(c), fill="yellow", font=f)
    out = os.path.join(MONT, f"{slug}.jpg")
    img.save(out, quality=80)
    print(out)


def pick(slug, n, idx, repo):
    d = os.path.join(CAND, f"{slug}-{n}")
    meta = json.load(open(os.path.join(d, "meta.json")))
    m = next(x for x in meta if x["idx"] == int(idx))
    data = get(m["large"])
    tmp = os.path.join(d, "large.jpg")
    open(tmp, "wb").write(data)
    im = Image.open(tmp).convert("RGB")
    if im.width > 1200:
        im = im.resize((1200, round(im.height * 1200 / im.width)), Image.LANCZOS)
    out = os.path.join(repo, "img", f"{slug}-{n}.jpg")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    im.save(out, "JPEG", quality=80, optimize=True, progressive=True)
    cr = json.load(open(CREDITS)) if os.path.exists(CREDITS) else {}
    cr[f"{slug}-{n}"] = {"pixabay_id": m["id"], "page": m["page"], "user": m["user"], "tags": m["tags"],
                         "width": im.width, "height": im.height}
    json.dump(cr, open(CREDITS, "w"), ensure_ascii=False, indent=1)
    print(f"{slug}-{n}: {im.width}x{im.height} {os.path.getsize(out)//1024}KB  ({m['tags']})")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[0] == "cands":
        cands(a[1], a[2], a[3:])
    elif a[0] == "montage":
        montage(a[1])
    elif a[0] == "pick":
        pick(a[1], a[2], a[3], a[4])
