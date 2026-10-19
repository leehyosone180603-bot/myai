"use strict";
/* /blog/의 사주·MBTI·별자리 글을 posts.js POSTS 배열(사주·운세 카테고리)로 추가 */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

const slugs = [
  "saju-newyear","saju-today-fortune","saju-gunghab-relationship","saju-monthly",
  "saju-jaemul-timing","saju-job-change","saju-spouse","saju-sinsal-dohwa",
  "saju-gilil","saju-lucky-color","saju-investment","saju-aptitude",
  "saju-naming","saju-gyounki","saju-before-philosophy","saju-reviews",
  "saju-easy-program","saju-engine-story","saju-expert-tools","mbti-vs-saju",
  "istj-man-traits","istj-woman-traits","twelve-zodiac-order","zodiac-animals-order"
];

function g(re, s, d) { const m = s.match(re); return m ? m[1] : (d || ""); }
function esc(s) { return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"'); }
function clip(s, n) { s = s.trim(); return s.length > n ? s.slice(0, n - 1).trim() + "…" : s; }

const entries = [];
slugs.forEach(function (slug) {
  const f = path.join(ROOT, "blog", slug, "index.html");
  if (!fs.existsSync(f)) { console.log("MISSING", slug); return; }
  const s = fs.readFileSync(f, "utf8");
  let title = g(/<title>([^<]*)<\/title>/, s).split(" | ")[0].trim();
  let desc = g(/<meta name="description" content="([^"]*)"/, s) ||
             g(/<meta property="og:description" content="([^"]*)"/, s);
  desc = clip(desc.replace(/&quot;/g, '"').replace(/&#39;/g, "'"), 95) || title;
  let date = g(/datePublished"?\s*:?\s*"?(\d{4}-\d{2}-\d{2})/, s, "2026-07-05").replace(/-/g, ".");
  // 이미지: hero.svg 있으면 /img/<slug>.svg 로 복사해 사용
  let image = "";
  const hero = path.join(ROOT, "blog", slug, "hero.svg");
  if (fs.existsSync(hero)) {
    fs.copyFileSync(hero, path.join(ROOT, "img", slug + ".svg"));
    image = "/img/" + slug + ".svg";
  }
  entries.push('  { id: "' + slug + '", title: "' + esc(title) + '", summary: "' + esc(desc) +
    '", category: "fortune", date: "' + date + '", url: "/blog/' + slug + '/", image: "' + image + '" },');
});

// posts.js 의 POSTS 배열 맨 끝(마지막 항목 뒤)에 삽입
const pf = path.join(ROOT, "js", "posts.js");
let p = fs.readFileSync(pf, "utf8");
const marker = "/* 최신순 정렬된 배열 반환";
const arrEnd = p.lastIndexOf("];", p.indexOf(marker));
const before = p.slice(0, arrEnd);
const after = p.slice(arrEnd);
// before 는 마지막 항목 '...},\n' 로 끝남. 그대로 뒤에 fortune 항목 추가.
p = before + entries.join("\n") + "\n" + after;
fs.writeFileSync(pf, p);
console.log("added fortune posts:", entries.length);
