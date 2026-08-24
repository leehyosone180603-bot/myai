"use strict";
/* 기존 blog/<slug>/index.html 콘텐츠를 새 매거진 구조 /posts/<slug>.html 로 이관 */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

const P = require(path.join(ROOT, "blog", "posts.json"));

// slug → 카테고리 (posts.js 와 일치)
const CAT = {
  "zodiac-year-age": "birthyear", "elementary-school-age": "birthyear",
  "age-table-2026": "age", "rrn-age-decode": "age", "age-types-korean": "age", "age-calculator": "age",
  "milestone-ages": "system", "senior-benefits-age": "system", "pension-start-age": "system",
  "birthyear-to-hakbeon": "birthyear", "fast-year-birth": "birthyear", "birth-year-guide": "birthyear",
  "business-days-guide": "date", "military-discharge": "date"
};
const CATNAME = {
  age: "만 나이·나이계산", birthyear: "몇년생·띠·학번", system: "나이기준·제도", date: "날짜계산"
};
// 대표 이미지 파일명(/img/ 기준)
const IMG = {
  "age-calculator": "age-calculator.png", "birth-year-guide": "birth-year-guide.png",
  "business-days-guide": "business-days-guide.png", "military-discharge": "military-discharge.png"
};
function imgFor(slug) { return IMG[slug] || (slug + ".svg"); }
// 정적 가이드 본문의 옛 이미지 파일명 → 새 파일명
const OLDIMG = {
  "age.png": "age-calculator.png", "birth-year.png": "birth-year-guide.png",
  "business-days.png": "business-days-guide.png", "military.png": "military-discharge.png"
};

function pick(re, s, d) { const m = s.match(re); return m ? m[1] : (d || ""); }

function migrate(slug) {
  const src = fs.readFileSync(path.join(ROOT, "blog", slug, "index.html"), "utf8");
  const meta = P.find(function (x) { return x.slug === slug; }) || {};

  const title = pick(/<title>([\s\S]*?)<\/title>/, src);
  const desc = pick(/<meta name="description" content="([\s\S]*?)">/, src);
  const keywords = pick(/<meta name="keywords" content="([\s\S]*?)">/, src);

  // JSON-LD 블록 모두 추출
  const ld = (src.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g) || []).join("\n  ");

  // 본문(article) 추출
  let article = pick(/<article class="card post">([\s\S]*?)<\/article>/, src);

  // 이미지 경로 재작성
  article = article.replace(/src="hero\.svg"/g, 'src="/img/' + slug + '.svg"');
  article = article.replace(/src="\.\.\/img\/([^"]+)"/g, function (_, f) {
    return 'src="/img/' + (OLDIMG[f] || f) + '"';
  });
  // 내부 /blog/<slug>/ 링크 → /posts/<slug>.html
  article = article.replace(/\/blog\/([a-z0-9-]+)\/(#[a-z0-9-]+)?/gi, function (_, s2, hash) {
    return "/posts/" + s2 + ".html" + (hash || "");
  });

  const cat = CAT[slug] || "age";
  const canonical = "https://calcbox.kr/posts/" + slug + ".html";
  const ogimg = "https://calcbox.kr/img/" + imgFor(slug);

  // JSON-LD 내부 옛 URL 치환
  let ldFixed = ld
    .replace(new RegExp("https://calcbox\\.kr/blog/" + slug + "/", "g"), canonical)
    .replace(/https:\/\/calcbox\.kr\/blog\/([a-z0-9-]+)\//g, "https://calcbox.kr/posts/$1.html")
    .replace(/"hero\.svg"/g, '"' + ogimg + '"');

  const html =
'<!DOCTYPE html>\n<html lang="ko">\n<head>\n' +
'  <meta charset="UTF-8">\n' +
'  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'  <script async src="https://www.googletagmanager.com/gtag/js?id=G-JMGXSV1PJ2"></script>\n' +
'  <script>\n    window.dataLayer = window.dataLayer || [];\n    function gtag(){dataLayer.push(arguments);}\n    gtag(\'js\', new Date());\n    gtag(\'config\', \'G-JMGXSV1PJ2\');\n  </script>\n' +
'  <link rel="icon" type="image/svg+xml" href="/favicon.svg">\n' +
'  <title>' + title + '</title>\n' +
'  <meta name="description" content="' + desc + '">\n' +
(keywords ? '  <meta name="keywords" content="' + keywords + '">\n' : '') +
'  <meta name="robots" content="index, follow">\n' +
'  <meta name="author" content="한국인계산기">\n' +
'  <meta property="og:title" content="' + title.replace(/ \| 한국인계산기$/, "") + '">\n' +
'  <meta property="og:description" content="' + desc + '">\n' +
'  <meta property="og:type" content="article">\n' +
'  <meta property="og:url" content="' + canonical + '">\n' +
'  <meta property="og:image" content="' + ogimg + '">\n' +
'  <meta property="og:site_name" content="한국인계산기">\n' +
'  <link rel="canonical" href="' + canonical + '">\n\n' +
'  ' + ldFixed + '\n\n' +
'  <!-- Google AdSense: ca-pub-7143828779500885 -->\n' +
'  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7143828779500885" crossorigin="anonymous"></script>\n\n' +
'  <link rel="stylesheet" href="/css/style.css">\n' +
'</head>\n<body>\n' +
'  <header id="site-header"></header>\n\n' +
'  <main class="post-wrap">\n' +
'    <nav class="crumbs"><a href="/">홈</a> · <a href="/category.html?cat=' + cat + '">' + CATNAME[cat] + '</a></nav>\n' +
'    <article class="post">' + article + '</article>\n' +
'  </main>\n\n' +
'  <footer id="site-footer"></footer>\n\n' +
'  <script src="/js/posts.js"></script>\n' +
'  <script src="/js/site.js"></script>\n' +
'</body>\n</html>\n';

  fs.writeFileSync(path.join(ROOT, "posts", slug + ".html"), html);
  return { slug: slug, bytes: html.length, hasArticle: article.length > 200 };
}

const SLUGS = Object.keys(CAT);
let ok = 0;
SLUGS.forEach(function (s) {
  const r = migrate(s);
  console.log((r.hasArticle ? "OK  " : "WARN") + " " + r.slug + " (" + r.bytes + "b)");
  if (r.hasArticle) ok++;
});
console.log("migrated:", ok, "/", SLUGS.length);
