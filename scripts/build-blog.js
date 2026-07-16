#!/usr/bin/env node
/*
 * 블로그 일일 자동 발행 빌드 스크립트
 *
 *   node scripts/build-blog.js                 → 현재 published 상태로 목록/사이트맵/robots 동기화 (발행 안 함)
 *   node scripts/build-blog.js --publish-next  → 대기열의 다음 글 1개를 발행한 뒤 동기화
 *
 * GitHub Actions의 cron이 매일 --publish-next 로 실행하여 하루 1개씩 공개합니다.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const POSTS_FILE = path.join(ROOT, "blog", "posts.json");

// 사이트맵에 항상 포함되는 정적 URL
const STATIC_URLS = [
  { loc: "https://calcbox.kr/", freq: "weekly", pri: "1.0" },
  { loc: "https://calcbox.kr/scientific/", freq: "monthly", pri: "0.9" },
  { loc: "https://calcbox.kr/salary/", freq: "monthly", pri: "0.9" },
  { loc: "https://calcbox.kr/age/", freq: "monthly", pri: "0.9" },
  { loc: "https://calcbox.kr/birth-year/", freq: "monthly", pri: "0.9" },
  { loc: "https://calcbox.kr/business-days/", freq: "monthly", pri: "0.8" },
  { loc: "https://calcbox.kr/vat/", freq: "monthly", pri: "0.8" },
  { loc: "https://calcbox.kr/severance/", freq: "monthly", pri: "0.8" },
  { loc: "https://calcbox.kr/freelancer/", freq: "monthly", pri: "0.8" },
  { loc: "https://calcbox.kr/lotto-prize/", freq: "monthly", pri: "0.8" },
  { loc: "https://calcbox.kr/military/", freq: "monthly", pri: "0.8" },
  { loc: "https://calcbox.kr/lotto/", freq: "weekly", pri: "0.8" },
  { loc: "https://calcbox.kr/spy-game/", freq: "monthly", pri: "0.6" },
  { loc: "https://calcbox.kr/duck-octopus-game/", freq: "monthly", pri: "0.6" },
  { loc: "https://calcbox.kr/saju/", freq: "weekly", pri: "0.9" },
  { loc: "https://calcbox.kr/saju/ask/", freq: "weekly", pri: "0.8" },
  { loc: "https://calcbox.kr/gunghap/", freq: "monthly", pri: "0.9" },
  { loc: "https://calcbox.kr/saju/terms/", freq: "yearly", pri: "0.3" },
  { loc: "https://calcbox.kr/saju/privacy/", freq: "yearly", pri: "0.3" },
  { loc: "https://calcbox.kr/saju/refund/", freq: "yearly", pri: "0.3" },
  { loc: "https://calcbox.kr/blog/", freq: "weekly", pri: "0.7" },
  { loc: "https://calcbox.kr/about/", freq: "yearly", pri: "0.3" },
  { loc: "https://calcbox.kr/privacy/", freq: "yearly", pri: "0.3" },
  { loc: "https://calcbox.kr/terms/", freq: "yearly", pri: "0.3" }
];

function todayKST() {
  const now = new Date(Date.now() + 9 * 3600 * 1000); // KST
  return now.toISOString().slice(0, 10);
}

function readPosts() {
  return JSON.parse(fs.readFileSync(POSTS_FILE, "utf8"));
}

// 각 글 HTML의 robots 메타를 published 상태에 맞게 설정
function syncRobots(posts) {
  posts.forEach(function (p) {
    const file = path.join(ROOT, "blog", p.slug, "index.html");
    if (!fs.existsSync(file)) return;
    let html = fs.readFileSync(file, "utf8");
    const want = p.published ? "index, follow" : "noindex, follow";
    const next = html.replace(/(<meta name="robots" content=")[^"]*(">)/, "$1" + want + "$2");
    if (next !== html) fs.writeFileSync(file, next);
  });
}

// 블로그 목록 페이지 생성 (발행된 글만, 최신 발행 순)
function buildBlogIndex(posts) {
  const live = posts.filter(function (p) { return p.published; });
  live.reverse(); // 배열 뒤쪽일수록 나중에 발행 → 최신이 위로
  const items = live.map(function (p) {
    return '      <li>\n' +
      '        <a href="/blog/' + p.slug + '/">\n' +
      '          <strong>' + p.title + '</strong>\n' +
      '          <small>' + p.date + ' · ' + p.excerpt + '</small>\n' +
      '        </a>\n' +
      '      </li>';
  }).join("\n");

  return '<!DOCTYPE html>\n' +
'<html lang="ko">\n' +
'<head>\n' +
'  <meta charset="UTF-8">\n' +
'  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'  <title>블로그 - 계산기 사용법과 생활 정보 | 한국인계산기</title>\n' +
'  <meta name="description" content="연봉 실수령액, 세금, 날짜 계산 등 한국인계산기의 계산기 사용법과 알아두면 좋은 생활·금융 정보를 정리한 블로그입니다.">\n' +
'  <meta name="keywords" content="한국인계산기, 계산기 블로그, 연봉 실수령액, 세금 정보, 계산기 사용법">\n' +
'  <meta name="robots" content="index, follow">\n' +
'  <meta property="og:title" content="블로그 - 계산기 사용법과 생활 정보 | 한국인계산기">\n' +
'  <meta property="og:description" content="계산기 사용법과 알아두면 좋은 생활·금융 정보 모음.">\n' +
'  <meta property="og:type" content="website">\n' +
'  <meta property="og:url" content="https://calcbox.kr/blog/">\n' +
'  <meta property="og:site_name" content="한국인계산기">\n' +
'  <link rel="canonical" href="https://calcbox.kr/blog/">\n' +
'\n' +
'  <!-- Google AdSense 게시자 ID: ca-pub-7143828779500885 -->\n' +
'  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7143828779500885"\n' +
'     crossorigin="anonymous"></script>\n' +
'\n' +
'  <link rel="stylesheet" href="../style.css?v=8">\n' +
'</head>\n' +
'<body>\n' +
'  <nav class="back-nav"><a href="/">← 한국인계산기 홈</a></nav>\n' +
'\n' +
'  <header class="site-header">\n' +
'    <h1>📝 한국인계산기 블로그</h1>\n' +
'    <p class="subtitle">계산기 사용법과 알아두면 좋은 생활·금융 정보</p>\n' +
'  </header>\n' +
'\n' +
'  <div class="ad-container" aria-label="광고">\n' +
'    <ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-7143828779500885"\n' +
'         data-ad-slot="0000000000" data-ad-format="auto" data-full-width-responsive="true"></ins>\n' +
'  </div>\n' +
'\n' +
'  <main class="container">\n' +
'    <ul class="post-list">\n' +
items + '\n' +
'    </ul>\n' +
'  </main>\n' +
'\n' +
'  <footer class="site-footer">\n' +
'    <nav class="footer-links"><a href="/about/">소개·문의</a> · <a href="/privacy/">개인정보처리방침</a> · <a href="/terms/">이용약관</a></nav>\n' +
'    <p>© <span id="year"></span> 한국인계산기 (calcbox.kr)</p>\n' +
'  </footer>\n' +
'\n' +
'  <script>\n' +
'    document.getElementById("year").textContent = new Date().getFullYear();\n' +
'    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}\n' +
'  </script>\n' +
'</body>\n' +
'</html>\n';
}

// 사이트맵 생성 (정적 URL + 발행된 글)
function buildSitemap(posts) {
  const today = todayKST();
  const urls = STATIC_URLS.map(function (u) {
    return '  <url><loc>' + u.loc + '</loc><lastmod>' + today + '</lastmod><changefreq>' + u.freq + '</changefreq><priority>' + u.pri + '</priority></url>';
  });
  posts.filter(function (p) { return p.published; }).forEach(function (p) {
    urls.push('  <url><loc>https://calcbox.kr/blog/' + p.slug + '/</loc><lastmod>' + today + '</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>');
  });
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.join("\n") + "\n</urlset>\n";
}

function main() {
  const publishNext = process.argv.indexOf("--publish-next") !== -1;
  const posts = readPosts();

  if (publishNext) {
    const next = posts.find(function (p) { return !p.published; });
    if (next) {
      next.published = true;
      next.date = todayKST().replace(/-/g, "."); // 발행일을 실제 발행 날짜로
      fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2) + "\n");
      console.log("published:", next.slug);
    } else {
      console.log("no unpublished posts remaining");
    }
  }

  syncRobots(posts);
  fs.writeFileSync(path.join(ROOT, "blog", "index.html"), buildBlogIndex(posts));
  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), buildSitemap(posts));
  console.log("synced. published count:", posts.filter(function (p) { return p.published; }).length, "/", posts.length);
}

main();
