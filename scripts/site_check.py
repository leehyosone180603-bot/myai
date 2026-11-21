#!/usr/bin/env python3
"""건강상자(calcbox.kr) 발행 점검 + sitemap.xml 생성.

  python3 scripts/site_check.py            # 점검만
  python3 scripts/site_check.py --sitemap  # 점검 후 sitemap.xml 다시 쓰기

점검 항목: posts.js 등록 ↔ 글 파일, H1 1개, canonical·og:image·JSON-LD, 본문 사진 파일 존재,
요약 박스 안 사진 금지, 면책 문구, 금지어, 모든 일반 페이지의 애드센스 로더, ads.txt.
"""
import json, os, re, sys, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOMAIN = "https://calcbox.kr"
PUB = "ca-pub-7143828779500885"
BANNED = ["기적", "보물", "방패", "묘약", "만병통치", "공감 꾹", "공감 부탁", "댓글", "이웃추가", "이웃 추가", "널리 공유"]
STATIC = ["/", "/about.html", "/contact.html", "/privacy.html", "/terms.html",
          "/category.html?cat=food", "/category.html?cat=info"]

def read(p):
    return open(os.path.join(ROOT, p.lstrip("/")), encoding="utf-8").read()

def posts():
    s = read("js/posts.js")
    body = s[s.index("const POSTS"):]
    out = []
    for m in re.finditer(r"\{[^{}]*?id:\s*\"([^\"]+)\"[^{}]*?\}", body, re.S):
        blk = m.group(0)
        g = lambda k: (re.search(k + r":\s*\"((?:[^\"\\]|\\.)*)\"", blk) or [None, ""])[1]
        out.append({"id": g("id"), "title": g("title"), "category": g("category"),
                    "date": g("date"), "url": g("url"), "image": g("image")})
    return out

def main():
    errs, warns = [], []
    P = posts()
    ids = [p["id"] for p in P]
    if len(ids) != len(set(ids)):
        errs.append("posts.js 에 중복 id")
    for p in P:
        f = p["url"].lstrip("/")
        if not os.path.exists(os.path.join(ROOT, f)):
            errs.append(f"{p['id']}: 파일 없음 {f}"); continue
        h = read(f)
        tag = p["id"]
        if len(re.findall(r"<h1[\s>]", h)) != 1: errs.append(f"{tag}: H1 이 1개가 아님")
        if f'<link rel="canonical" href="{DOMAIN}{p["url"]}">' not in h: errs.append(f"{tag}: canonical 불일치")
        if PUB not in h: errs.append(f"{tag}: 애드센스 로더 없음")
        if 'class="disclaimer"' not in h: errs.append(f"{tag}: 면책 문구 없음")
        if 'class="keybox"' not in h: warns.append(f"{tag}: 요약 박스 없음")
        if "[" in re.sub(r"<script.*?</script>", "", h, flags=re.S) and re.search(r"\[(제목|slug|alt|캡션|요약)\]", h):
            errs.append(f"{tag}: 템플릿 자리표시 남음")
        m = re.search(r'<script type="application/ld\+json">(.*?)</script>', h, re.S)
        try:
            ld = json.loads(m.group(1)) if m else None
            if not ld or ld.get("@type") != "Article": errs.append(f"{tag}: JSON-LD Article 없음")
        except Exception as e:
            errs.append(f"{tag}: JSON-LD 파싱 실패 {e}")
        kb = re.search(r'<div class="keybox">(.*?)</div>', h, re.S)
        if kb and "<img" in kb.group(1): errs.append(f"{tag}: 요약 박스 안에 사진")
        imgs = re.findall(r'<img[^>]+src="(/img/[^"]+)"', h)
        if len(imgs) < 2: warns.append(f"{tag}: 본문 사진 {len(imgs)}장")
        for src in imgs:
            if not os.path.exists(os.path.join(ROOT, src.lstrip("/"))): errs.append(f"{tag}: 사진 파일 없음 {src}")
        og = re.search(r'property="og:image" content="([^"]+)"', h)
        if not og or not os.path.exists(os.path.join(ROOT, og.group(1).replace(DOMAIN, "").lstrip("/"))):
            errs.append(f"{tag}: og:image 파일 없음")
        if p["image"] and not os.path.exists(os.path.join(ROOT, p["image"].lstrip("/"))):
            errs.append(f"{tag}: posts.js 썸네일 없음")
        text = re.sub(r"<[^>]+>", "", re.sub(r"<(script|style)[^>]*>.*?</\1>", "", h, flags=re.S))
        for w in BANNED:
            if w in text: errs.append(f"{tag}: 금지어 '{w}'")
        n = len(re.sub(r"\s", "", text))
        if n < 1800: warns.append(f"{tag}: 본문이 짧음({n}자)")
    # 일반 페이지 애드센스 로더
    for dp, dn, fn in os.walk(ROOT):
        if any(x in dp for x in ("/.git", "/tools", "/node_modules")): continue
        for f in fn:
            if not f.endswith(".html"): continue
            full = os.path.join(dp, f); rel = os.path.relpath(full, ROOT)
            h = open(full, encoding="utf-8").read()
            if 'http-equiv="refresh"' in h or rel == "posts/_template.html": continue
            if PUB not in h: errs.append(f"{rel}: 애드센스 로더 없음")
    if PUB.replace("ca-", "") not in read("ads.txt"): errs.append("ads.txt 게시자 ID 불일치")
    if "const ADS_SHOW = false" not in read("js/site.js"): warns.append("ADS_SHOW 가 false 가 아님(광고 켜짐)")

    print(f"글 {len(P)}편 (food {sum(p['category']=='food' for p in P)} / info {sum(p['category']=='info' for p in P)})")
    for w in warns: print("  주의:", w)
    for e in errs: print("  오류:", e)
    if "--sitemap" in sys.argv:
        today = datetime.date.today().isoformat()
        rows = [(u, today, "daily" if u in ("/", "/category.html?cat=food", "/category.html?cat=info") else "monthly",
                 "1.0" if u == "/" else "0.5") for u in STATIC]
        for p in P:
            rows.append((p["url"], p["date"].replace(".", "-") or today, "monthly", "0.8"))
        xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
        for u, lm, cf, pr in rows:
            xml.append(f"  <url><loc>{DOMAIN}{u.replace('&', '&amp;')}</loc><lastmod>{lm}</lastmod><changefreq>{cf}</changefreq><priority>{pr}</priority></url>")
        xml.append("</urlset>")
        open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8").write("\n".join(xml) + "\n")
        print(f"sitemap.xml: {len(rows)}개 URL")
    sys.exit(1 if errs else 0)

if __name__ == "__main__":
    main()
