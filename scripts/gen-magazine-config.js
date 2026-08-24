"use strict";
/* 새 매거진 구조용 sitemap.xml 생성 + 구 URL 리다이렉트 스텁 생성 */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const P = require(path.join(ROOT, "blog", "posts.json"));
const BASE = "https://calcbox.kr";

const ONTOPIC = ["zodiac-year-age","elementary-school-age","age-table-2026","rrn-age-decode","age-types-korean","age-calculator","milestone-ages","senior-benefits-age","pension-start-age","birthyear-to-hakbeon","fast-year-birth","birth-year-guide","business-days-guide","military-discharge"];

function dateOf(slug) {
  const e = P.find(function (x) { return x.slug === slug; });
  return (e && e.date ? e.date : "2026.08.24").replace(/\./g, "-");
}
function today() {
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

/* ---------- sitemap ---------- */
const urls = [];
function add(loc, lastmod, pr) { urls.push({ loc: loc, lastmod: lastmod, pr: pr }); }
add(BASE + "/", today(), "1.0");
["about", "contact", "privacy", "terms"].forEach(function (p) { add(BASE + "/" + p + ".html", today(), "0.4"); });
["age", "birthyear", "system", "date"].forEach(function (c) { add(BASE + "/category.html?cat=" + c, today(), "0.6"); });
ONTOPIC.forEach(function (s) { add(BASE + "/posts/" + s + ".html", dateOf(s), "0.8"); });
["age", "birth-year", "business-days", "military"].forEach(function (t) { add(BASE + "/" + t + "/", today(), "0.7"); });

const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map(function (u) {
    return "  <url>\n    <loc>" + u.loc.replace(/&/g, "&amp;") + "</loc>\n" +
      "    <lastmod>" + u.lastmod + "</lastmod>\n    <priority>" + u.pr + "</priority>\n  </url>";
  }).join("\n") + "\n</urlset>\n";
fs.writeFileSync(path.join(ROOT, "sitemap.xml"), sitemap);
console.log("sitemap.xml:", urls.length, "urls");

/* ---------- 리다이렉트 스텁 ---------- */
function redirectStub(target) {
  return '<!DOCTYPE html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n' +
    '<title>페이지가 이동했습니다 - 한국인계산기</title>\n' +
    '<link rel="canonical" href="' + BASE + target + '">\n' +
    '<meta http-equiv="refresh" content="0; url=' + target + '">\n' +
    '<script>location.replace("' + target + '");</script>\n' +
    '</head>\n<body>이 페이지는 <a href="' + target + '">' + BASE + target + '</a> 로 이동했습니다.</body>\n</html>\n';
}
function writeStub(dirRel, target) {
  const dir = path.join(ROOT, dirRel);
  if (!fs.existsSync(dir)) return false;
  fs.writeFileSync(path.join(dir, "index.html"), redirectStub(target));
  return true;
}

let n = 0;
ONTOPIC.forEach(function (s) { if (writeStub("blog/" + s, "/posts/" + s + ".html")) n++; });
if (writeStub("blog", "/")) n++;
[["about", "/about.html"], ["contact", "/contact.html"], ["privacy", "/privacy.html"], ["terms", "/terms.html"], ["guide", "/"]].forEach(function (m) {
  if (writeStub(m[0], m[1])) n++;
});
console.log("redirect stubs:", n);
