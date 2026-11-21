/*
 * 건강상자(calcbox.kr) - 공통 스크립트
 * 헤더 / 푸터 / 광고 / 함께 읽을 글 / 공통 유틸을 담당합니다.
 * 각 페이지는 posts.js → site.js 순서로 불러온 뒤 페이지별 스크립트를 실행합니다.
 * (건강흐름·알고살자와 같은 구조)
 */

/* ────────────────────────────────────────────────────────────
 *  사이트 기본 정보  (푸터/메타에 사용) — 건강흐름과 동일한 발행 정보
 * ──────────────────────────────────────────────────────────── */
const SITE = {
  name: "건강상자",
  tagline: "몸에 좋은 음식과 생활 건강 정보를 한 상자에",
  domain: "calcbox.kr",
  company: "굿윌스토어",
  bizNo: "631-03-03874",
  address: "부산 사하구 오작로 34, 202호",
  tel: "010-2934-1351",
  youthManager: "이효선",
  regDate: "2026-06-01",
  publisher: "이효선",
  email: "leelin12@naver.com",
};

/* ────────────────────────────────────────────────────────────
 *  ★ 애드센스 설정 ★
 *  ADS_SHOW: 애드센스 승인 전에는 false (광고 자리 숨김).
 *            승인 후 "광고 켜줘"라고 요청할 때만 true 로 바꿉니다.
 *  slots   : 애드센스에서 만든 광고 단위의 슬롯 번호(data-ad-slot).
 *  자동광고는 모든 페이지 <head> 의 로더 스니펫으로 동작합니다.
 * ──────────────────────────────────────────────────────────── */
const ADS_SHOW = false;

const ADSENSE = {
  client: "ca-pub-7143828779500885",
  slots: {
    header: "0000000000",    // 상단 배너
    inList: "0000000000",    // 글 목록 상단
    sidebar: "0000000000",   // 우측 사이드바
    inArticle: "0000000000", // 글 본문 중간
  },
};

function adsenseEnabled() {
  return ADSENSE.client && !/^ca-pub-0+$/.test(ADSENSE.client);
}

/* ────────────────────────────────────────────────────────────
 *  유틸
 * ──────────────────────────────────────────────────────────── */
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function catName(slug) {
  return (window.CATEGORIES && CATEGORIES[slug] && CATEGORIES[slug].name) || slug;
}

function getParam(name) {
  return new URLSearchParams(location.search).get(name);
}

/* 카테고리별 대표 색 (빈 썸네일/태그에 사용) */
const CAT_COLORS = {
  food: "#2f9e6f",
  info: "#2b6cb0",
  exercise: "#dd6b20",
  diet: "#d53f8c",
  disease: "#805ad5",
  life: "#3182ce",
};
function catColor(slug) {
  return CAT_COLORS[slug] || "#4a5568";
}

/* 썸네일 HTML (이미지가 없으면 카테고리 색상 블록) */
function thumbHtml(post, extraClass) {
  const cls = "thumb " + (extraClass || "");
  if (post.image) {
    return `<div class="${cls}"><img src="${post.image}" alt="${esc(post.title)}" loading="lazy"></div>`;
  }
  const c = catColor(post.category);
  return `<div class="${cls} thumb--empty" style="--c:${c}"><span>${catName(post.category)}</span></div>`;
}

/* ────────────────────────────────────────────────────────────
 *  광고 유닛 렌더링 (ADS_SHOW=false 면 빈 문자열)
 * ──────────────────────────────────────────────────────────── */
function adUnit(slotKey, label) {
  if (!ADS_SHOW) return "";

  if (!adsenseEnabled()) {
    return `<div class="ad ad--placeholder"><span>광고 영역${label ? " · " + label : ""}</span></div>`;
  }
  const slot = (ADSENSE.slots && ADSENSE.slots[slotKey]) || "";
  return `
    <div class="ad">
      <ins class="adsbygoogle"
           style="display:block"
           data-ad-client="${ADSENSE.client}"
           data-ad-slot="${slot}"
           data-ad-format="auto"
           data-full-width-responsive="true"></ins>
    </div>`;
}

/* 페이지에 삽입된 애드센스 유닛을 활성화 (한 번만) */
function activateAds() {
  if (!ADS_SHOW || !adsenseEnabled()) return;
  document.querySelectorAll("ins.adsbygoogle:not([data-cb-pushed])").forEach(function (ins) {
    ins.setAttribute("data-cb-pushed", "1");
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {}
  });
}

/* ────────────────────────────────────────────────────────────
 *  헤더 (상단 로고/검색 + 카테고리 네비)
 * ──────────────────────────────────────────────────────────── */
const BRAND_MARK =
  '<svg class="brand__mark" viewBox="0 0 64 64" aria-hidden="true">' +
  '<rect x="6" y="18" width="52" height="40" rx="8" fill="#0e8a6a"/>' +
  '<path d="M6 26h52" stroke="#0a6b52" stroke-width="4"/>' +
  '<path d="M20 18l6-10h12l6 10" fill="none" stroke="#0e8a6a" stroke-width="4" stroke-linejoin="round"/>' +
  '<path d="M32 33v18M23 42h18" stroke="#fff" stroke-width="6" stroke-linecap="round"/>' +
  "</svg>";

function renderHeader() {
  const host = document.getElementById("site-header");
  if (!host) return;

  const active = document.body.getAttribute("data-cat") || "";

  const navLinks = (window.NAV_ORDER || Object.keys(CATEGORIES))
    .map(function (slug) {
      const c = CATEGORIES[slug];
      if (!c) return "";
      const isActive = slug === active ? " is-active" : "";
      if (c.ready) {
        return `<a class="nav__link${isActive}" href="/category.html?cat=${slug}">${c.name}</a>`;
      }
      return `<a class="nav__link nav__link--soon${isActive}" href="/category.html?cat=${slug}" data-soon="1">${c.name}<em>준비중</em></a>`;
    })
    .join("");

  const now = new Date();
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const dateStr =
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-` +
    `${String(now.getDate()).padStart(2, "0")} (${days[now.getDay()]})`;

  host.innerHTML = `
    <div class="topbar">
      <div class="wrap topbar__inner">
        <div class="topbar__ad">${adUnit("header", "상단")}</div>
        <div class="brand"><a href="/">${BRAND_MARK}<span>${SITE.name}</span></a>
          <span class="brand__sub">${SITE.tagline}</span></div>
        <form class="search" role="search" onsubmit="return siteSearch(event)">
          <input type="text" id="searchInput" name="q" placeholder="검색어를 입력해주세요" aria-label="검색">
          <button type="submit" aria-label="검색">🔍</button>
        </form>
      </div>
    </div>
    <nav class="nav" aria-label="카테고리">
      <div class="wrap nav__inner">
        <button class="nav__menu" aria-label="메뉴">☰</button>
        <div class="nav__links">${navLinks}</div>
        <div class="nav__meta">
          <span class="nav__date">${dateStr}</span>
          <span class="nav__auth"><a href="/about.html">소개</a> | <a href="/contact.html">문의</a></span>
        </div>
      </div>
    </nav>
    <div class="edge" aria-hidden="true"></div>
  `;

  // 준비중 카테고리 안내
  host.querySelectorAll("[data-soon]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      alert("준비중인 카테고리입니다. 곧 찾아뵙겠습니다!");
    });
  });

  // 모바일 메뉴 토글
  const menuBtn = host.querySelector(".nav__menu");
  const links = host.querySelector(".nav__links");
  if (menuBtn && links) {
    menuBtn.addEventListener("click", function () {
      links.classList.toggle("is-open");
    });
  }

  // 검색창에 기존 q 채우기
  const q = getParam("q");
  if (q) {
    const inp = document.getElementById("searchInput");
    if (inp) inp.value = q;
  }
}

/* 검색 → 검색 결과 목록(category.html?q=) */
function siteSearch(e) {
  e.preventDefault();
  const q = (document.getElementById("searchInput").value || "").trim();
  if (!q) return false;
  location.href = "/category.html?q=" + encodeURIComponent(q);
  return false;
}

/* ────────────────────────────────────────────────────────────
 *  글 페이지: 본문 중간 광고 + 함께 읽으면 좋은 글
 * ──────────────────────────────────────────────────────────── */
function currentPostId() {
  const m = location.pathname.match(/\/posts\/([a-z0-9-]+)\.html$/i);
  return m ? m[1] : "";
}

function enhanceArticle() {
  const body = document.querySelector(".article__body");
  if (!body) return;

  // 본문 중간 광고: 세 번째 H2(요약 박스 제외) 앞
  const h2s = body.querySelectorAll(":scope > h2");
  const mid = h2s[2] || h2s[1];
  const ad = adUnit("inArticle", "본문");
  if (mid && ad) mid.insertAdjacentHTML("beforebegin", ad);

  // 함께 읽으면 좋은 글: 같은 카테고리 3편 + 다른 카테고리 3편
  const id = currentPostId();
  const all = (window.POSTS || []).filter(function (p) { return p.id !== id; });
  const me = (window.POSTS || []).find(function (p) { return p.id === id; });
  if (!me || !all.length) return;
  const same = all.filter(function (p) { return p.category === me.category; });
  const other = all.filter(function (p) { return p.category !== me.category; });
  // 글마다 다른 조합이 나오도록 id 기반으로 시작 위치를 돌림
  let seed = 0;
  for (let i = 0; i < id.length; i++) seed = (seed * 31 + id.charCodeAt(i)) >>> 0;
  function pick(arr, n) {
    if (!arr.length) return [];
    const start = seed % arr.length;
    return arr.slice(start).concat(arr.slice(0, start)).slice(0, n);
  }
  const picks = pick(same, 3).concat(pick(other, 3));
  const items = picks.map(function (p) {
    return `<a class="related__item" href="${p.url}">${thumbHtml(p)}<span class="related__title">${esc(p.title)}</span></a>`;
  }).join("");
  const nav = body.querySelector(".article__nav");
  const html = `<section class="related" aria-label="함께 읽으면 좋은 글">
      <h2 class="related__head">함께 읽으면 좋은 글</h2>
      <div class="related__grid">${items}</div>
    </section>`;
  if (nav) nav.insertAdjacentHTML("beforebegin", html);
  else body.insertAdjacentHTML("beforeend", html);
}

/* ────────────────────────────────────────────────────────────
 *  푸터 (정책 링크 + 회사 정보)
 * ──────────────────────────────────────────────────────────── */
function renderFooter() {
  const host = document.getElementById("site-footer");
  if (!host) return;

  const links = [
    { t: "사이트 소개", href: "/about.html" },
    { t: "문의하기", href: "/contact.html" },
    { t: "이용약관", href: "/terms.html" },
    { t: "개인정보처리방침", href: "/privacy.html", strong: true },
  ]
    .map(function (l) {
      const strong = l.strong ? " footer__link--strong" : "";
      return `<a class="footer__link${strong}" href="${l.href}">${l.t}</a>`;
    })
    .join("");

  host.innerHTML = `
    <div class="footer__links"><div class="wrap">${links}</div></div>
    <div class="footer__body">
      <div class="wrap footer__grid">
        <div class="footer__brand">${SITE.name}</div>
        <div class="footer__info">
          <p>
            회사명: ${SITE.company}
            <span class="sep">|</span> 사업자등록번호: ${SITE.bizNo}
            <span class="sep">|</span> 주소: ${SITE.address}
            <span class="sep">|</span> 대표전화: ${SITE.tel}
          </p>
          <p>
            등록일: ${SITE.regDate}
            <span class="sep">|</span> 발행·편집인: ${SITE.publisher}
            <span class="sep">|</span> 청소년보호책임자: ${SITE.youthManager}
            <span class="sep">|</span> E-mail: <a href="mailto:${SITE.email}">${SITE.email}</a>
          </p>
          <p>건강상자의 글은 일반적인 건강 정보이며 의학적 진단·치료를 대신하지 않습니다.</p>
          <p class="footer__copy">Copyright © ${new Date().getFullYear()} ${SITE.name} (${SITE.domain}). All rights reserved.</p>
        </div>
      </div>
    </div>
  `;
}

/* ────────────────────────────────────────────────────────────
 *  초기화
 * ──────────────────────────────────────────────────────────── */
function initSite() {
  renderHeader();
  renderFooter();
  enhanceArticle();
  activateAds();
}
document.addEventListener("DOMContentLoaded", initSite);

window.SITE = SITE;
window.adUnit = adUnit;
window.thumbHtml = thumbHtml;
window.catName = catName;
window.catColor = catColor;
window.activateAds = activateAds;
window.esc = esc;
