"use strict";
/* =============================================================
   fetch-photos.js — 무료 라이선스 사진 자동 수집·최적화·등록
   -------------------------------------------------------------
   인터넷이 열린 환경(GitHub Actions)에서 실행하세요.
   - 제공자: PIXABAY_API_KEY 가 있으면 Pixabay(상업 이용 가능),
     없으면 Openverse(CC0·퍼블릭도메인, 키 불필요)
   - 키워드: scripts/photo-keywords.json (슬러그 → 영문 키워드)
   - 동작: 검색 → 가로 사진 다운로드 → 1200px JPG 최적화 →
     /img/<slug>.jpg 저장 → posts.js image + 페이지 og:image 갱신
     → scripts/photo-credits.json 에 출처/라이선스 기록
   사용:
     node scripts/fetch-photos.js            # 사진 없는 글만
     node scripts/fetch-photos.js --all      # 전부 재수집
     node scripts/fetch-photos.js --only zodiac-leo,saju-newyear
     node scripts/fetch-photos.js --dry      # 네트워크 없이 계획만 출력
   ============================================================= */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

const args = process.argv.slice(2);
const DRY = args.indexOf("--dry") !== -1;
const ALL = args.indexOf("--all") !== -1;
const onlyArg = args[args.indexOf("--only") + 1];
const ONLY = args.indexOf("--only") !== -1 && onlyArg ? onlyArg.split(",") : null;

const KW = JSON.parse(fs.readFileSync(path.join(__dirname, "photo-keywords.json"), "utf8"));
const POSTS = require(path.join(ROOT, "js", "posts.js")).POSTS;
const KEY = process.env.PIXABAY_API_KEY || "";
const PROVIDER = KEY ? "pixabay" : "openverse";

function entryOf(slug) { return POSTS.find(function (p) { return p.id === slug; }); }
function fileOf(url) {
  if (url.indexOf("/posts/") === 0) return url.slice(1);
  var m = url.match(/^\/blog\/([a-z0-9-]+)\/?$/i);
  if (m) return "blog/" + m[1] + "/index.html";
  return null;
}

async function searchPixabay(q) {
  const u = "https://pixabay.com/api/?key=" + KEY + "&q=" + encodeURIComponent(q) +
    "&image_type=photo&orientation=horizontal&safesearch=true&per_page=12&order=popular";
  const r = await fetch(u); if (!r.ok) throw new Error("pixabay " + r.status);
  const d = await r.json();
  const hit = (d.hits || []).find(function (h) { return h.webformatWidth >= 640; }) || (d.hits || [])[0];
  if (!hit) return null;
  return { img: hit.largeImageURL || hit.webformatURL, credit: { source: "Pixabay", license: "Pixabay Content License", author: hit.user, page: hit.pageURL } };
}
async function searchOpenverse(q) {
  const u = "https://api.openverse.org/v1/images/?q=" + encodeURIComponent(q) +
    "&license=cc0,pdm&aspect_ratio=wide&size=large&mature=false&page_size=12";
  const r = await fetch(u, { headers: { "Accept": "application/json" } });
  if (!r.ok) throw new Error("openverse " + r.status);
  const d = await r.json();
  const hit = (d.results || []).find(function (h) { return h.url; });
  if (!hit) return null;
  return { img: hit.url, credit: { source: "Openverse/" + (hit.source || ""), license: (hit.license || "") + " " + (hit.license_version || ""), author: hit.creator || "", page: hit.foreign_landing_url || hit.url } };
}

function setPostsImage(slug) {
  const pf = path.join(ROOT, "js", "posts.js");
  let s = fs.readFileSync(pf, "utf8");
  const re = new RegExp('(\\{ id: "' + slug + '",[^\\n]*?image: ")[^"]*(")');
  if (re.test(s)) { s = s.replace(re, "$1/img/" + slug + ".jpg$2"); fs.writeFileSync(pf, s); return true; }
  return false;
}
function setOgImage(file, slug) {
  if (!file) return;
  const fp = path.join(ROOT, file); if (!fs.existsSync(fp)) return;
  let s = fs.readFileSync(fp, "utf8");
  const abs = "https://calcbox.kr/img/" + slug + ".jpg";
  if (/<meta property="og:image"/.test(s)) {
    s = s.replace(/(<meta property="og:image" content=")[^"]*(")/, "$1" + abs + "$2");
  } else if (/<link rel="canonical"[^>]*>/.test(s)) {
    s = s.replace(/(<link rel="canonical"[^>]*>)/, '$1\n  <meta property="og:image" content="' + abs + '">');
  }
  fs.writeFileSync(fp, s);
}

async function run() {
  const sharp = DRY ? null : require("sharp");
  const slugs = Object.keys(KW).filter(function (k) { return k[0] !== "_"; });
  const credits = {};
  const creditFile = path.join(__dirname, "photo-credits.json");
  if (fs.existsSync(creditFile)) Object.assign(credits, JSON.parse(fs.readFileSync(creditFile, "utf8")));
  let done = 0, skip = 0, fail = 0;

  for (const slug of slugs) {
    const e = entryOf(slug);
    if (!e) { console.log("· 없음(posts.js):", slug); continue; }
    if (ONLY && ONLY.indexOf(slug) === -1) continue;
    if (!ALL && !ONLY && e.image) { skip++; continue; } // 이미 사진 있음
    const q = KW[slug];
    console.log("▶ " + slug + "  [" + PROVIDER + "] \"" + q + "\" → /img/" + slug + ".jpg");
    if (DRY) { done++; continue; }
    try {
      const res = PROVIDER === "pixabay" ? await searchPixabay(q) : await searchOpenverse(q);
      if (!res) { console.log("  검색 결과 없음"); fail++; continue; }
      const ir = await fetch(res.img); if (!ir.ok) throw new Error("download " + ir.status);
      const buf = Buffer.from(await ir.arrayBuffer());
      await sharp(buf).resize({ width: 1200, withoutEnlargement: true }).jpeg({ quality: 80 }).toFile(path.join(ROOT, "img", slug + ".jpg"));
      setPostsImage(slug);
      setOgImage(fileOf(e.url), slug);
      credits[slug] = res.credit;
      done++;
      console.log("  ✓ " + res.credit.source + " / " + res.credit.license + " / " + (res.credit.author || "-"));
    } catch (err) { console.log("  ✗ " + err.message); fail++; }
  }
  if (!DRY) fs.writeFileSync(creditFile, JSON.stringify(credits, null, 2) + "\n");
  console.log("\n완료: " + done + " 성공 / " + skip + " 건너뜀(이미 있음) / " + fail + " 실패  (provider=" + PROVIDER + ")");
}
run().catch(function (e) { console.error(e); process.exit(1); });
