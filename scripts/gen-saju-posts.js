#!/usr/bin/env node
/*
 * 도깨비 사주 블로그 20편 생성기 (1회 실행용)
 *   node scripts/gen-saju-posts.js
 * - blog/<slug>/index.html 20개 생성
 * - blog/posts.json 에 published:false 로 추가(중복 슬러그는 건너뜀)
 * 이후 build-blog.js --publish-next 가 매일 1편씩 발행.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const POSTS_FILE = path.join(ROOT, "blog", "posts.json");

function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

// 글 HTML 생성
function buildHTML(p) {
  const url = "https://calcbox.kr/blog/" + p.slug + "/";
  const faqLd = p.faq && p.faq.length ? (
    ',\n  <script type="application/ld+json">\n' +
    JSON.stringify({
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: p.faq.map(function (f) { return { "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } }; })
    }) + '\n  </script>'
  ) : "";
  const sections = p.sections.map(function (s) {
    return "      <h2>" + s.h2 + "</h2>\n" + s.body.split("\n").map(function (l) { return "      " + l; }).join("\n");
  }).join("\n\n");
  const faqHtml = p.faq && p.faq.length ? (
    "\n\n      <h2>자주 묻는 질문</h2>\n" +
    p.faq.map(function (f) { return "      <h3>Q. " + f.q + "</h3>\n      <p>" + f.a + "</p>"; }).join("\n")
  ) : "";

  return '<!DOCTYPE html>\n' +
'<html lang="ko">\n' +
'<head>\n' +
'  <meta charset="UTF-8">\n' +
'  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'  <title>' + p.title + ' | 도깨비 사주</title>\n' +
'  <meta name="description" content="' + p.desc + '">\n' +
'  <meta name="keywords" content="' + p.keywords + '">\n' +
'  <meta name="robots" content="noindex, follow">\n' +
'  <meta name="author" content="한국인계산기">\n' +
'  <meta property="og:title" content="' + p.title + '">\n' +
'  <meta property="og:description" content="' + p.desc + '">\n' +
'  <meta property="og:type" content="article">\n' +
'  <meta property="og:url" content="' + url + '">\n' +
'  <meta property="og:site_name" content="한국인계산기">\n' +
'  <link rel="canonical" href="' + url + '">\n' +
'\n' +
'  <script type="application/ld+json">\n' +
'  {\n' +
'    "@context": "https://schema.org",\n' +
'    "@type": "BlogPosting",\n' +
'    "headline": "' + p.title.replace(/"/g, "'") + '",\n' +
'    "description": "' + p.desc.replace(/"/g, "'") + '",\n' +
'    "datePublished": "' + p.iso + '",\n' +
'    "dateModified": "' + p.iso + '",\n' +
'    "inLanguage": "ko",\n' +
'    "author": { "@type": "Organization", "name": "한국인계산기" },\n' +
'    "publisher": { "@type": "Organization", "name": "한국인계산기", "url": "https://calcbox.kr/" },\n' +
'    "mainEntityOfPage": { "@type": "WebPage", "@id": "' + url + '" }\n' +
'  }\n' +
'  </script>' + faqLd + '\n' +
'\n' +
'  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7143828779500885"\n' +
'     crossorigin="anonymous"></script>\n' +
'\n' +
'  <link rel="stylesheet" href="../../style.css?v=6">\n' +
'</head>\n' +
'<body>\n' +
'  <nav class="back-nav"><a href="/">← 한국인계산기 홈</a> · <a href="/blog/">블로그 목록</a></nav>\n' +
'\n' +
'  <main class="container">\n' +
'    <article class="card post">\n' +
'      <h1>' + p.title + '</h1>\n' +
'      <p class="post-meta">' + p.date + ' · 한국인계산기</p>\n' +
'\n' +
'      <p class="lead">' + p.lead + '</p>\n' +
'\n' +
'      <div class="callout">🔮 ' + p.topCta + ' <a href="' + p.ctaHref + '"><strong>' + p.ctaName + '</strong></a>에서 생년월일시만 넣으면 도깨비가 무료로 풀어줍니다.</div>\n' +
'\n' +
sections + faqHtml + '\n' +
'\n' +
'      <p style="text-align:center; margin:28px 0 8px;"><a class="cta" href="' + p.ctaHref + '">🔮 ' + p.ctaName + ' 무료로 보러 가기</a></p>\n' +
'      <div class="callout">✅ <strong>함께 보면 좋은 것</strong> — <a href="/saju/">도깨비 사주</a> · <a href="/gunghap/">무료 궁합</a></div>\n' +
'    </article>\n' +
'  </main>\n' +
'\n' +
'  <footer class="site-footer"><p>© <span id="year"></span> 한국인계산기 (calcbox.kr)</p></footer>\n' +
'  <script>\n' +
'    document.getElementById("year").textContent = new Date().getFullYear();\n' +
'    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}\n' +
'  </script>\n' +
'</body>\n' +
'</html>\n';
}

const POSTS = require("./saju-posts-data.js");

function main() {
  const existing = JSON.parse(fs.readFileSync(POSTS_FILE, "utf8"));
  const haveSlugs = new Set(existing.map(function (p) { return p.slug; }));
  let added = 0;
  POSTS.forEach(function (p) {
    const dir = path.join(ROOT, "blog", p.slug);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), buildHTML(p));
    if (!haveSlugs.has(p.slug)) {
      existing.push({ slug: p.slug, title: p.title, date: p.date, excerpt: p.excerpt, published: false });
      added++;
    }
  });
  fs.writeFileSync(POSTS_FILE, JSON.stringify(existing, null, 2) + "\n");
  console.log("생성/갱신:", POSTS.length, "편 · posts.json 신규 추가:", added, "편");
}
main();
