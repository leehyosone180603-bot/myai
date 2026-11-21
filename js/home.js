/*
 * 건강상자 - 홈(메인) 렌더링
 * 히어로(대표기사 + 보조카드 2개 + 헤드라인) + 본문 2단(기사목록 + 사이드바)을
 * POSTS 데이터로 렌더링합니다.
 */
(function () {
  function byDateDesc(a, b) {
    return (b.date || "").localeCompare(a.date || "");
  }
  function postsAll() {
    return (window.POSTS || []).slice().sort(byDateDesc);
  }
  function postsBy(cat) {
    return postsAll().filter(function (p) {
      return p.category === cat;
    });
  }

  /* 카드: 큰 대표기사 */
  function featuredCard(p) {
    if (!p) return "";
    return `
      <a class="feat" href="${p.url}">
        ${thumbHtml(p, "thumb--feat")}
        <h2 class="feat__title">${esc(p.title)}</h2>
        <p class="feat__summary">${esc(p.summary)}</p>
      </a>`;
  }

  /* 카드: 히어로 우측 상단 (이미지 + 제목) */
  function heroSmall(p) {
    return `
      <a class="hsmall" href="${p.url}">
        ${thumbHtml(p, "thumb--hsmall")}
        <h3 class="hsmall__title">${esc(p.title)}</h3>
      </a>`;
  }

  /* 카드: 헤드라인 텍스트 리스트 */
  function headlineItem(p) {
    return `<a class="headline" href="${p.url}">${esc(p.title)}</a>`;
  }

  /* 카드: 좌측 기사목록 (썸네일+제목+요약) */
  function listItem(p) {
    return `
      <a class="listitem" href="${p.url}">
        ${thumbHtml(p, "thumb--list")}
        <div class="listitem__body">
          <h3 class="listitem__title">${esc(p.title)}</h3>
          <p class="listitem__summary">${esc(p.summary)}</p>
        </div>
      </a>`;
  }

  /* 사이드바: 타임라인 */
  function timelineItem(p) {
    const time = (p.date || "").slice(5).replace("-", ".");
    return `
      <a class="tl__item" href="${p.url}">
        <span class="tl__time">${time}</span>
        <span class="tl__dot"></span>
        <span class="tl__title">${esc(p.title)}</span>
      </a>`;
  }

  /* 사이드바: 카테고리 그리드 카드 */
  function gridCard(p) {
    return `
      <a class="gcard" href="${p.url}">
        ${thumbHtml(p, "thumb--grid")}
        <span class="gcard__title">${esc(p.title)}</span>
      </a>`;
  }

  /* 사이드바: 태그형 리스트 */
  function tagItem(p) {
    return `
      <a class="tagitem" href="${p.url}">
        <span class="tag" style="--c:${catColor(p.category)}">${catName(p.category)}</span>
        <span class="tagitem__title">${esc(p.title)}</span>
      </a>`;
  }

  function render() {
    const all = postsAll();
    const foods = postsBy("food");
    const infos = postsBy("info");

    /* ── 히어로 ── */
    const featured = all[0];
    const heroRight = all.slice(1, 3);
    const heroHeadlines = all.slice(3, 8);

    const heroEl = document.getElementById("hero");
    if (heroEl) {
      const smalls = heroRight.length
        ? `<div class="hero__smalls">${heroRight.map(heroSmall).join("")}</div>` : "";
      const heads = heroHeadlines.length
        ? `<div class="hero__headlines">${heroHeadlines.map(headlineItem).join("")}</div>` : "";
      if (smalls || heads) {
        heroEl.innerHTML = `
          <div class="hero__main">${featuredCard(featured)}</div>
          <div class="hero__side">${smalls}${heads}</div>`;
      } else {
        // 글이 적을 때: 대표기사를 넓게 표시
        heroEl.classList.add("hero--single");
        heroEl.innerHTML = `<div class="hero__main">${featuredCard(featured)}</div>`;
      }
    }

    /* ── 본문 좌측: 광고 + 기사목록 ── */
    const listEl = document.getElementById("main-list");
    if (listEl) {
      listEl.innerHTML =
        adUnit("inList", "목록") + all.map(listItem).join("");
    }

    /* ── 사이드바: 타임라인 + 광고 + 카테고리 그리드 + 태그리스트 ── */
    const sideEl = document.getElementById("sidebar");
    if (sideEl) {
      const tl = all.slice(0, 5).map(timelineItem).join("");
      const foodGrid = foods.slice(0, 4).map(gridCard).join("");
      const infoTags = infos.slice(0, 4).map(tagItem).join("");

      const timelinePanel = all.length ? `
        <div class="panel">
          <div class="panel__head">최신 글 <span class="badge">NEW</span></div>
          <div class="timeline">${tl}</div>
          <a class="panel__more" href="/category.html?cat=info">건강정보 전체 보기 ›</a>
        </div>` : "";

      const foodPanel = foods.length ? `
        <div class="panel">
          <div class="panel__head">건강음식</div>
          <div class="gridcards">${foodGrid}</div>
        </div>` : "";

      const infoPanel = infos.length ? `
        <div class="panel">
          <div class="panel__head">건강정보</div>
          <div class="taglist">${infoTags}</div>
        </div>` : "";

      sideEl.innerHTML =
        timelinePanel + adUnit("sidebar", "사이드") + foodPanel + infoPanel;
    }

    activateAds();
  }

  document.addEventListener("DOMContentLoaded", render);
})();
