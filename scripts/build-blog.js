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

// 사이트맵에 항상 포함되는 정적 URL (나이·날짜 전문 페이지만)
// 그 외 페이지(급여세금·로또·공학용·게임·사주)는 살아 있으나 사이트맵에서 제외 → docs/homepage-archive.md 기록
const STATIC_URLS = [
  { loc: "https://calcbox.kr/", freq: "weekly", pri: "1.0" },
  { loc: "https://calcbox.kr/age/", freq: "monthly", pri: "0.9" },
  { loc: "https://calcbox.kr/birth-year/", freq: "monthly", pri: "0.9" },
  { loc: "https://calcbox.kr/business-days/", freq: "monthly", pri: "0.8" },
  { loc: "https://calcbox.kr/military/", freq: "monthly", pri: "0.8" },
  { loc: "https://calcbox.kr/blog/", freq: "weekly", pri: "0.7" },
  { loc: "https://calcbox.kr/about/", freq: "yearly", pri: "0.3" },
  { loc: "https://calcbox.kr/contact/", freq: "yearly", pri: "0.3" },
  { loc: "https://calcbox.kr/guide/", freq: "yearly", pri: "0.4" },
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

// 전문 주제(나이·날짜 계산) 글만 색인/목록/사이트맵에 노출한다.
// 그 외 발행 글(사주·급여세금·로또 등)은 페이지는 남기되 noindex + 목록/사이트맵 제외.
const ONTOPIC = new Set([
  // 나이·날짜 계산기 사용법·가이드
  "age-calculator", "birth-year-guide", "business-days-guide", "military-discharge",
  // 나이 클러스터 스포크
  "age-types-korean", "fast-year-birth", "birthyear-to-hakbeon", "pension-start-age",
  "senior-benefits-age", "milestone-ages", "rrn-age-decode", "age-table-2026", "zodiac-year-age",
  "elementary-school-age"
]);
function isLive(p) { return p.published && ONTOPIC.has(p.slug); }

// 블로그 세부 카테고리 (나이·날짜 전문). 새 글은 해당 slug를 아래 목록에 추가하면 자동 분류됨.
const CATEGORIES = [
  { label: "🎂 만 나이·나이 계산", slugs: ["age-types-korean", "age-calculator", "age-table-2026", "rrn-age-decode"] },
  { label: "🗓️ 몇년생·띠·학번", slugs: ["birth-year-guide", "zodiac-year-age", "fast-year-birth", "birthyear-to-hakbeon", "elementary-school-age"] },
  { label: "📋 나이 기준 제도·혜택", slugs: ["pension-start-age", "senior-benefits-age", "milestone-ages"] },
  { label: "📅 날짜 계산", slugs: ["business-days-guide", "military-discharge"] }
];

// 각 글 HTML의 robots 메타를 published 상태에 맞게 설정
function syncRobots(posts) {
  posts.forEach(function (p) {
    const file = path.join(ROOT, "blog", p.slug, "index.html");
    if (!fs.existsSync(file)) return;
    let html = fs.readFileSync(file, "utf8");
    const want = isLive(p) ? "index, follow" : "noindex, follow";
    const next = html.replace(/(<meta name="robots" content=")[^"]*(">)/, "$1" + want + "$2");
    if (next !== html) fs.writeFileSync(file, next);
  });
}

// 블로그 목록 페이지 생성 (발행된 글만, 최신 발행 순)
function buildBlogIndex(posts) {
  const liveMap = {};
  posts.forEach(function (p) { if (isLive(p)) liveMap[p.slug] = p; });

  function li(p) {
    return '        <li>\n' +
      '          <a href="/blog/' + p.slug + '/">\n' +
      '            <strong>' + p.title + '</strong>\n' +
      '            <small>' + p.date + ' · ' + p.excerpt + '</small>\n' +
      '          </a>\n' +
      '        </li>';
  }

  const used = {};
  const sectionList = CATEGORIES.map(function (cat) {
    const lis = cat.slugs.filter(function (s) { return liveMap[s]; }).map(function (s) { used[s] = true; return li(liveMap[s]); });
    if (!lis.length) return "";
    return '    <section class="blog-cat">\n' +
      '      <h2 class="blog-cat-title">' + cat.label + '</h2>\n' +
      '      <ul class="post-list">\n' + lis.join("\n") + '\n      </ul>\n' +
      '    </section>';
  }).filter(Boolean);

  // 카테고리에 없는 발행 글은 '그 밖의 글'로 (최신 발행 순)
  const rest = posts.filter(function (p) { return isLive(p) && !used[p.slug]; });
  rest.reverse();
  if (rest.length) {
    sectionList.push('    <section class="blog-cat">\n' +
      '      <h2 class="blog-cat-title">📌 그 밖의 글</h2>\n' +
      '      <ul class="post-list">\n' + rest.map(li).join("\n") + '\n      </ul>\n' +
      '    </section>');
  }
  const items = sectionList.join("\n");

  return '<!DOCTYPE html>\n' +
'<html lang="ko">\n' +
'<head>\n' +
'  <meta charset="UTF-8">\n' +
'  <!-- Google tag (gtag.js) - GA4 -->\n' +
'  <script async src="https://www.googletagmanager.com/gtag/js?id=G-JMGXSV1PJ2"></script>\n' +
'  <script>\n' +
'    window.dataLayer = window.dataLayer || [];\n' +
'    function gtag(){dataLayer.push(arguments);}\n' +
'    gtag(\'js\', new Date());\n' +
'    gtag(\'config\', \'G-JMGXSV1PJ2\');\n' +
'  </script>\n' +
'  <link rel="icon" type="image/svg+xml" href="/favicon.svg">\n' +
'  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'  <title>블로그 - 나이·날짜 계산 가이드 | 한국인계산기</title>\n' +
'  <meta name="description" content="만 나이·몇년생·띠·출생연도와 영업일·전역일 등 한국인의 나이·날짜 계산 가이드를 카테고리별로 정리한 블로그입니다.">\n' +
'  <meta name="keywords" content="나이 계산, 만 나이, 몇년생, 띠, 출생연도, 나이표, 영업일, 전역일, 나이 날짜 블로그">\n' +
'  <meta name="robots" content="index, follow">\n' +
'  <meta property="og:title" content="블로그 - 나이·날짜 계산 가이드 | 한국인계산기">\n' +
'  <meta property="og:description" content="만 나이·몇년생·띠와 날짜 계산 가이드 모음.">\n' +
'  <meta property="og:type" content="website">\n' +
'  <meta property="og:url" content="https://calcbox.kr/blog/">\n' +
'  <meta property="og:site_name" content="한국인계산기">\n' +
'  <link rel="canonical" href="https://calcbox.kr/blog/">\n' +
'\n' +
'  <!-- Google AdSense 게시자 ID: ca-pub-7143828779500885 -->\n' +
'  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7143828779500885"\n' +
'     crossorigin="anonymous"></script>\n' +
'\n' +
'  <link rel="stylesheet" href="../style.css?v=13">\n' +
'</head>\n' +
'<body>\n' +
'  <nav class="back-nav"><a href="/">← 한국인계산기 홈</a></nav>\n' +
'\n' +
'  <header class="site-header">\n' +
'    <h1>📝 한국인계산기 블로그</h1>\n' +
'    <p class="subtitle">만 나이·몇년생·띠와 날짜 계산 가이드</p>\n' +
'  </header>\n' +
'\n' +
'  <div class="ad-container" aria-label="광고">\n' +
'    <ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-7143828779500885"\n' +
'         data-ad-slot="0000000000" data-ad-format="auto" data-full-width-responsive="true"></ins>\n' +
'  </div>\n' +
'\n' +
'  <main class="container">\n' +
items + '\n' +
'  </main>\n' +
'\n' +
'  <footer class="site-footer">\n' +
'    <div class="footer-biz">상호명 굿윌스토어 · 사업자등록번호 631-03-03874 · 대표 이효선 · 주소 부산 사하구 오작로 34<br>연락처 010-2934-1351 · 제휴문의 <a href="mailto:leehyosone180603@gmail.com">leehyosone180603@gmail.com</a></div>\n' +
'    <p class="footer-notice">한국인계산기의 모든 콘텐츠는 저작권법의 보호를 받으며, 무단 전재·복사·배포를 금합니다.</p>\n' +
'    <nav class="footer-links"><a href="/about/">운영자 소개</a> · <a href="/contact/">문의하기</a> · <a href="/guide/">사이트 안내</a> · <a href="/privacy/">개인정보처리방침</a> · <a href="/terms/">이용약관</a> · <a href="mailto:leehyosone180603@gmail.com">이메일</a></nav>\n' +
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
  posts.filter(function (p) { return isLive(p); }).forEach(function (p) {
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
