/* =============================================================
   home.js — 홈(index.html) 렌더링
   posts.js, site.js 이후에 로드됩니다.
   컨테이너: <div id="home-root"></div>
   ============================================================= */

function catBadge(slug) {
  var c = CATEGORIES[slug];
  if (!c) return "";
  return '<span class="cat-badge" style="--cat:' + c.color + '">' + esc(c.name) + '</span>';
}

/* 카드 종류: "lead"(대형), "sub"(중형), "row"(가로 리스트), "mini"(사이드바) */
function postCard(p, variant) {
  var img = p.image
    ? '<span class="pc-thumb"><img src="' + esc(p.image) + '" alt="' + esc(p.title) + '" loading="lazy"></span>'
    : '';
  if (variant === "mini") {
    return '<a class="mini-item" href="' + esc(p.url) + '">' +
      '<span class="mini-date">' + esc(p.date) + '</span>' +
      '<span class="mini-title">' + esc(p.title) + '</span></a>';
  }
  if (variant === "row") {
    return '<a class="row-card" href="' + esc(p.url) + '">' + img +
      '<span class="pc-body">' + catBadge(p.category) +
        '<span class="pc-title">' + esc(p.title) + '</span>' +
        '<span class="pc-summary">' + esc(p.summary) + '</span>' +
        '<span class="pc-date">' + esc(p.date) + '</span>' +
      '</span></a>';
  }
  // lead / sub
  return '<a class="feat-card feat-' + variant + '" href="' + esc(p.url) + '">' + img +
    '<span class="pc-body">' + catBadge(p.category) +
      '<span class="pc-title">' + esc(p.title) + '</span>' +
      (variant === "lead" ? '<span class="pc-summary">' + esc(p.summary) + '</span>' : '') +
      '<span class="pc-date">' + esc(p.date) + '</span>' +
    '</span></a>';
}

function renderSidebar(posts) {
  var latest = posts.slice(0, 8).map(function (p) { return postCard(p, "mini"); }).join("");
  var catLinks = NAV_ORDER.filter(function (s) { return CATEGORIES[s] && CATEGORIES[s].ready; })
    .map(function (s) {
      return '<a class="side-cat" href="/category.html?cat=' + s + '" style="--cat:' + CATEGORIES[s].color + '">' +
        esc(CATEGORIES[s].name) + '</a>';
    }).join("");
  return '<aside class="home-side">' +
    '<div class="side-box"><h3 class="side-title">📰 최신 글</h3><div class="mini-list">' + latest + '</div></div>' +
    '<div class="side-box"><h3 class="side-title">🗂️ 카테고리</h3><div class="side-cats">' + catLinks + '</div></div>' +
    (adUnit("sidebar") ? '<div class="side-box">' + adUnit("sidebar") + '</div>' : '') +
    '</aside>';
}

function renderHome() {
  var root = document.getElementById("home-root");
  if (!root) return;
  var posts = getPostsSorted();

  // ── 검색 모드 ──
  var q = new URLSearchParams(location.search).get("q");
  if (q && q.trim()) {
    var term = q.trim().toLowerCase();
    var hits = posts.filter(function (p) {
      return (p.title + " " + p.summary).toLowerCase().indexOf(term) !== -1;
    });
    var listHtml = hits.length
      ? hits.map(function (p) { return postCard(p, "row"); }).join("")
      : '<p class="empty">검색 결과가 없습니다. 다른 검색어로 시도해 보세요.</p>';
    root.innerHTML =
      '<div class="wrap">' +
        '<h1 class="search-h1">‘' + esc(q) + '’ 검색결과 <span>' + hits.length + '건</span></h1>' +
        '<div class="home-grid"><div class="home-main">' + listHtml + '</div>' +
        renderSidebar(posts) + '</div>' +
      '</div>';
    return;
  }

  // ── 일반 홈 ──
  var lead = posts[0];
  var subs = posts.slice(1, 3);
  var headlines = posts.slice(3, 8);
  var rest = posts.slice(3); // 본문 목록은 히어로(0~2) 이후 전체

  var heroSubs = subs.map(function (p) { return postCard(p, "sub"); }).join("");
  var heroHeads = headlines.map(function (p) {
    return '<a class="head-item" href="' + esc(p.url) + '">' + catBadge(p.category) +
      '<span>' + esc(p.title) + '</span></a>';
  }).join("");

  var rows = rest.map(function (p) { return postCard(p, "row"); }).join("");

  root.innerHTML =
    '<section class="hero"><div class="wrap"><div class="hero-grid">' +
      '<div class="hero-lead">' + postCard(lead, "lead") + '</div>' +
      '<div class="hero-side">' +
        '<div class="hero-subs">' + heroSubs + '</div>' +
        '<div class="hero-heads">' + heroHeads + '</div>' +
      '</div>' +
    '</div></div></section>' +
    (adUnit("top") ? '<div class="wrap">' + adUnit("top") + '</div>' : '') +
    '<div class="wrap"><div class="home-grid">' +
      '<div class="home-main"><h2 class="sec-title">최신 기사</h2>' + rows + '</div>' +
      renderSidebar(posts) +
    '</div></div>';
}

document.addEventListener("DOMContentLoaded", renderHome);
