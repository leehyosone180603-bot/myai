/* =============================================================
   site.js — 공통 헤더/푸터 주입 + 회사정보 + 광고 스위치
   -------------------------------------------------------------
   모든 페이지는 <header id="site-header"></header> 와
   <footer id="site-footer"></footer> 만 비워 두면, 이 파일이
   자동으로 채웁니다. posts.js 가 먼저 로드되어 있어야 합니다.
   ============================================================= */

/* 회사(발행) 정보 — 실제 값 */
var SITE = {
  name: "한국인계산기",
  tagline: "한국인의 나이·날짜 계산 매거진",
  domain: "calcbox.kr",
  company: "굿윌스토어",
  bizNo: "631-03-03874",
  owner: "이효선",           // 대표·책임자
  publisher: "이효선",       // 발행인
  regDate: "2026-06-01",     // 사이트 개설일
  address: "부산 사하구 오작로 34",
  tel: "010-2934-1351",
  email: "leehyosone180603@gmail.com"
};

/* ===== 광고(애드센스) 설정 ===== */
var ADS_SHOW = false; // 승인 후 true 로 변경하면 광고 노출
var ADSENSE = {
  client: "ca-pub-7143828779500885",
  slots: { top: "0000000000", inarticle: "1111111111", sidebar: "2222222222" }
};
/* 광고 자리 HTML 반환 (ADS_SHOW=false 면 빈 문자열) */
function adUnit(slotName) {
  if (!ADS_SHOW) return "";
  var slot = (ADSENSE.slots && ADSENSE.slots[slotName]) || "0000000000";
  return '<div class="ad-container" aria-label="광고">' +
    '<ins class="adsbygoogle" style="display:block" data-ad-client="' + ADSENSE.client +
    '" data-ad-slot="' + slot + '" data-ad-format="auto" data-full-width-responsive="true"></ins>' +
    '</div>';
}

/* HTML 이스케이프 */
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/* 오늘 날짜 (YYYY-MM-DD (요일)) */
function todayLabel() {
  var d = new Date();
  var days = ["일", "월", "화", "수", "목", "금", "토"];
  var mm = ("0" + (d.getMonth() + 1)).slice(-2);
  var dd = ("0" + d.getDate()).slice(-2);
  return d.getFullYear() + "-" + mm + "-" + dd + " (" + days[d.getDay()] + ")";
}

/* ===== 헤더 ===== */
function renderHeader() {
  var host = document.getElementById("site-header");
  if (!host) return;

  var nav = "";
  for (var i = 0; i < NAV_ORDER.length; i++) {
    var slug = NAV_ORDER[i];
    var c = CATEGORIES[slug];
    if (!c) continue;
    if (c.ready) {
      nav += '<a class="nav-cat" href="/category.html?cat=' + slug + '"' +
             ' style="--cat:' + c.color + '">' + esc(c.name) + '</a>';
    } else {
      nav += '<a class="nav-cat is-pending" href="#" data-cat="' + slug + '"' +
             ' style="--cat:' + c.color + '">' + esc(c.name) +
             ' <span class="badge-soon">준비중</span></a>';
    }
  }

  host.className = "site-header";
  host.innerHTML =
    '<div class="hdr-top">' +
      '<div class="hdr-inner">' +
        '<a class="brand" href="/"><span class="brand-mark">🗓️</span>' + esc(SITE.name) + '</a>' +
        '<form class="hdr-search" role="search" onsubmit="return siteSearch(event)">' +
          '<input type="text" id="siteSearchInput" name="q" placeholder="검색어를 입력해주세요" aria-label="사이트 검색">' +
          '<button type="submit" aria-label="검색">🔍</button>' +
        '</form>' +
        '<div class="hdr-meta">발행일: ' + todayLabel() +
          ' <span class="hdr-sep">|</span> <a href="/about.html">소개</a>' +
          ' <span class="hdr-sep">|</span> <a href="/contact.html">문의</a></div>' +
      '</div>' +
      '<nav class="hdr-nav" aria-label="카테고리">' + nav + '</nav>' +
    '</div>';

  // 준비중 카테고리 안내
  var pend = host.querySelectorAll(".nav-cat.is-pending");
  for (var j = 0; j < pend.length; j++) {
    pend[j].addEventListener("click", function (e) {
      e.preventDefault();
      var name = CATEGORIES[this.getAttribute("data-cat")].name;
      alert("'" + name + "' 카테고리는 준비 중입니다. 곧 찾아뵙겠습니다.");
    });
  }

  // 검색창에 기존 q 채우기
  var q = new URLSearchParams(location.search).get("q");
  if (q) { var inp = document.getElementById("siteSearchInput"); if (inp) inp.value = q; }
}

/* 검색 → 홈으로 이동해 필터 (home.js 가 q 파라미터 처리) */
function siteSearch(e) {
  e.preventDefault();
  var v = (document.getElementById("siteSearchInput") || {}).value || "";
  v = v.trim();
  location.href = "/?q=" + encodeURIComponent(v);
  return false;
}

/* ===== 푸터 ===== */
function renderFooter() {
  var host = document.getElementById("site-footer");
  if (!host) return;
  host.className = "site-footer";
  host.innerHTML =
    '<div class="ft-inner">' +
      '<div class="ft-brand"><span class="brand-mark">🗓️</span>' + esc(SITE.name) + '</div>' +
      '<nav class="ft-links">' +
        '<a href="/about.html">사이트 소개</a>' +
        '<a href="/contact.html">문의하기</a>' +
        '<a href="/privacy.html">개인정보처리방침</a>' +
        '<a href="/terms.html">이용약관</a>' +
      '</nav>' +
      '<div class="ft-biz">' +
        '회사명 ' + esc(SITE.company) + ' · 사업자등록번호 ' + esc(SITE.bizNo) +
        ' · 대표·책임자 ' + esc(SITE.owner) + ' · 발행인 ' + esc(SITE.publisher) + '<br>' +
        '주소 ' + esc(SITE.address) + ' · 전화 ' + esc(SITE.tel) +
        ' · 이메일 <a href="mailto:' + esc(SITE.email) + '">' + esc(SITE.email) + '</a>' +
      '</div>' +
      '<div class="ft-copy">© <span id="ft-year"></span> ' + esc(SITE.name) +
        ' (' + esc(SITE.domain) + '). 모든 콘텐츠는 저작권법의 보호를 받으며 무단 전재·복사·배포를 금합니다.</div>' +
    '</div>';
  var y = document.getElementById("ft-year");
  if (y) y.textContent = new Date().getFullYear();
}

/* 초기화 */
document.addEventListener("DOMContentLoaded", function () {
  renderHeader();
  renderFooter();
});
