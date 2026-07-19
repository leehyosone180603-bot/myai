#!/usr/bin/env node
/*
 * 키워드 블로그 포스트 생성기
 *
 *   node scripts/gen-keyword-posts.js
 *
 * scripts/kw-data.js 의 데이터로 blog/<slug>/index.html 와 blog/<slug>/hero.svg 를 생성하고,
 * blog/posts.json 대기열(published:false)에 없으면 추가합니다.
 * 발행 순서/날짜는 build-blog.js 의 --publish-next(하루 4회)가 관리하므로 여기서는 date를 넣지 않습니다.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const BLOG = path.join(ROOT, "blog");
const POSTS_FILE = path.join(BLOG, "posts.json");
const DATA = require("./kw-data.js");

const SITE = "https://calcbox.kr";
const ADS = "ca-pub-7143828779500885";

// 카테고리별 테마(그라데이션 색, 아이콘)
const THEME = {
  benefit:   { c1: "#16a34a", c2: "#065f46", icon: "🌿", label: "효능·효과" },
  trait:     { c1: "#7c3aed", c2: "#4c1d95", icon: "🧬", label: "특징·성향" },
  ranking:   { c1: "#ea580c", c2: "#9a3412", icon: "🏆", label: "순위" },
  schedule:  { c1: "#2563eb", c2: "#1e3a8a", icon: "📅", label: "일정" },
  procedure: { c1: "#0891b2", c2: "#155e63", icon: "📋", label: "절차" },
  order:     { c1: "#d97706", c2: "#92400e", icon: "🔢", label: "순서" },
  recipe:    { c1: "#e11d48", c2: "#881337", icon: "🍳", label: "만드는 법" },
  howto:     { c1: "#0369a1", c2: "#0c4a6e", icon: "🛠️", label: "방법·가이드" },
  compare:   { c1: "#0d9488", c2: "#134e4a", icon: "⚖️", label: "비교" },
  proscons:  { c1: "#4f46e5", c2: "#312e81", icon: "🔍", label: "장단점" },
  generic:   { c1: "#475569", c2: "#1e293b", icon: "📖", label: "정보" },
  age:       { c1: "#2563eb", c2: "#1e3a8a", icon: "🗓️", label: "나이·출생연도" }
};

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
// JSON-LD/속성용: 태그 제거 + 이스케이프
function plain(s) {
  return esc(String(s).replace(/<[^>]+>/g, ""));
}

function heroSvg(entry) {
  const t = THEME[entry.category] || THEME.generic;
  const title = entry.kw;
  // 제목 길이에 따라 폰트 크기 조정
  const fs2 = title.length > 12 ? 54 : title.length > 8 ? 66 : 78;
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 480" width="1200" height="480" role="img" aria-label="' + plain(title) + '">\n' +
'  <defs>\n' +
'    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">\n' +
'      <stop offset="0" stop-color="' + t.c1 + '"/>\n' +
'      <stop offset="1" stop-color="' + t.c2 + '"/>\n' +
'    </linearGradient>\n' +
'  </defs>\n' +
'  <rect width="1200" height="480" fill="url(#g)"/>\n' +
'  <circle cx="1010" cy="90" r="230" fill="#ffffff" opacity="0.07"/>\n' +
'  <circle cx="170" cy="430" r="180" fill="#ffffff" opacity="0.06"/>\n' +
'  <text x="600" y="150" font-size="120" text-anchor="middle" dominant-baseline="middle">' + t.icon + '</text>\n' +
'  <text x="600" y="272" font-size="' + fs2 + '" font-family="\'Apple SD Gothic Neo\',\'Malgun Gothic\',\'Noto Sans KR\',sans-serif" font-weight="800" fill="#ffffff" text-anchor="middle">' + plain(title) + '</text>\n' +
'  <text x="600" y="340" font-size="30" font-family="sans-serif" fill="#ffffff" opacity="0.9" text-anchor="middle">' + plain(t.label) + '</text>\n' +
'  <text x="600" y="432" font-size="26" font-family="sans-serif" fill="#ffffff" opacity="0.75" text-anchor="middle">한국인계산기 · calcbox.kr</text>\n' +
'</svg>\n';
}

function tocHtml(sections) {
  const links = sections.map(function (s, i) {
    return '        <a href="#' + s.id + '">' + (i + 1) + '. ' + esc(s.h2) + '</a>';
  });
  // FAQ 앵커 추가
  links.push('        <a href="#faq">' + (sections.length + 1) + '. 자주 묻는 질문</a>');
  return '      <div class="toc">\n' +
    '        <strong>목차</strong>\n' +
    links.join('<br>\n') + '\n' +
    '      </div>';
}

function sectionsHtml(sections) {
  return sections.map(function (s) {
    return '      <h2 id="' + s.id + '">' + esc(s.h2) + '</h2>\n' + s.html;
  }).join("\n\n");
}

function faqHtml(faq) {
  const items = faq.map(function (f) {
    return '      <h3>Q. ' + esc(f.q) + '</h3>\n      <p>' + f.a + '</p>';
  }).join("\n");
  return '      <h2 id="faq">자주 묻는 질문 (FAQ)</h2>\n' + items;
}

function faqJsonLd(faq) {
  const ents = faq.map(function (f) {
    return '      {\n' +
      '        "@type": "Question",\n' +
      '        "name": "' + plain(f.q) + '",\n' +
      '        "acceptedAnswer": { "@type": "Answer", "text": "' + plain(f.a) + '" }\n' +
      '      }';
  }).join(",\n");
  return '  <script type="application/ld+json">\n' +
    '  {\n' +
    '    "@context": "https://schema.org",\n' +
    '    "@type": "FAQPage",\n' +
    '    "mainEntity": [\n' + ents + '\n    ]\n' +
    '  }\n' +
    '  </script>';
}

function relatedHtml(related) {
  if (!related || !related.length) {
    related = [
      { href: "/blog/", label: "블로그 전체 글" },
      { href: "/", label: "한국인계산기 홈" }
    ];
  }
  const links = related.map(function (r) { return '<a href="' + r.href + '">' + esc(r.label) + '</a>'; }).join(" · ");
  return '      <div class="callout">\n        ✅ <strong>함께 보면 좋은 글·도구</strong> — ' + links + '\n      </div>';
}

function render(entry) {
  const t = THEME[entry.category] || THEME.generic;
  const url = SITE + "/blog/" + entry.slug + "/";
  const sections = entry.sections;
  const desc = entry.desc;
  const kwline = (entry.tags || [entry.kw]).join(", ");

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
'  <title>' + esc(entry.title) + ' | 한국인계산기</title>\n' +
'  <meta name="description" content="' + plain(desc) + '">\n' +
'  <meta name="keywords" content="' + esc(kwline) + '">\n' +
'  <meta name="robots" content="noindex, follow">\n' +
'  <meta name="author" content="한국인계산기">\n' +
'  <meta property="og:title" content="' + esc(entry.title) + '">\n' +
'  <meta property="og:description" content="' + plain(desc) + '">\n' +
'  <meta property="og:type" content="article">\n' +
'  <meta property="og:url" content="' + url + '">\n' +
'  <meta property="og:image" content="' + url + 'hero.svg">\n' +
'  <meta property="og:site_name" content="한국인계산기">\n' +
'  <link rel="canonical" href="' + url + '">\n' +
'\n' +
'  <script type="application/ld+json">\n' +
'  {\n' +
'    "@context": "https://schema.org",\n' +
'    "@type": "BlogPosting",\n' +
'    "headline": "' + plain(entry.title) + '",\n' +
'    "description": "' + plain(desc) + '",\n' +
'    "image": "' + url + 'hero.svg",\n' +
'    "inLanguage": "ko",\n' +
'    "author": { "@type": "Organization", "name": "한국인계산기" },\n' +
'    "publisher": { "@type": "Organization", "name": "한국인계산기", "url": "https://calcbox.kr/" },\n' +
'    "mainEntityOfPage": { "@type": "WebPage", "@id": "' + url + '" }\n' +
'  }\n' +
'  </script>\n' +
'\n' +
faqJsonLd(entry.faq) + '\n' +
'\n' +
'  <!-- Google AdSense 게시자 ID: ' + ADS + ' -->\n' +
'  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + ADS + '"\n' +
'     crossorigin="anonymous"></script>\n' +
'\n' +
'  <link rel="stylesheet" href="../../style.css?v=8">\n' +
'</head>\n' +
'<body>\n' +
'  <nav class="back-nav"><a href="/">← 한국인계산기 홈</a> · <a href="/blog/">블로그 목록</a></nav>\n' +
'\n' +
'  <main class="container">\n' +
'    <article class="card post">\n' +
'      <h1>' + esc(entry.h1 || entry.title) + '</h1>\n' +
'      <p class="post-meta"><span class="cat-badge">' + t.icon + ' ' + esc(t.label) + '</span> · 한국인계산기</p>\n' +
'\n' +
'      <p class="lead">' + entry.lead + '</p>\n' +
'\n' +
'      <figure class="post-shot">\n' +
'        <img src="hero.svg" alt="' + plain(entry.kw) + ' 정리" width="1200" height="480" loading="lazy">\n' +
'      </figure>\n' +
'\n' +
tocHtml(sections) + '\n' +
'\n' +
'      <div class="ad-container" aria-label="광고">\n' +
'        <ins class="adsbygoogle" style="display:block" data-ad-client="' + ADS + '"\n' +
'             data-ad-slot="0000000000" data-ad-format="auto" data-full-width-responsive="true"></ins>\n' +
'      </div>\n' +
'\n' +
sectionsHtml(sections) + '\n' +
'\n' +
faqHtml(entry.faq) + '\n' +
'\n' +
relatedHtml(entry.related) + '\n' +
'    </article>\n' +
'  </main>\n' +
'\n' +
'  <footer class="site-footer">\n' +
'    <nav class="footer-links"><a href="/about/">소개·문의</a> · <a href="/privacy/">개인정보처리방침</a> · <a href="/terms/">이용약관</a></nav>\n' +
'    <p>© <span id="year"></span> 한국인계산기 (calcbox.kr) · 본 글은 일반적인 정보 제공을 목적으로 하며 최신 정보는 공식 출처를 확인하세요.</p>\n' +
'  </footer>\n' +
'\n' +
'  <script>\n' +
'    document.getElementById("year").textContent = new Date().getFullYear();\n' +
'    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}\n' +
'  </script>\n' +
'</body>\n' +
'</html>\n';
}

function main() {
  const posts = JSON.parse(fs.readFileSync(POSTS_FILE, "utf8"));
  const existing = new Set(posts.map(function (p) { return p.slug; }));
  let created = 0, queued = 0;

  DATA.forEach(function (entry) {
    // 검증
    if (!entry.slug || !entry.sections || !entry.faq) {
      throw new Error("불완전한 항목: " + JSON.stringify(entry.slug || entry.kw));
    }
    const dir = path.join(BLOG, entry.slug);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    // 콘텐츠에 장식용으로 섞인 백틱(`) 문자는 본문에 그대로 노출되므로 제거
    fs.writeFileSync(path.join(dir, "index.html"), render(entry).replace(/`/g, ""));
    fs.writeFileSync(path.join(dir, "hero.svg"), heroSvg(entry));
    created++;

    if (!existing.has(entry.slug)) {
      posts.push({
        slug: entry.slug,
        title: entry.title,
        date: "",
        excerpt: entry.excerpt || entry.desc.slice(0, 60),
        published: false
      });
      existing.add(entry.slug);
      queued++;
    }
  });

  fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2) + "\n");
  console.log("생성된 글:", created, "| 대기열 신규 추가:", queued, "| posts.json 총:", posts.length);
}

main();
