/*
 * 건강상자 - 카테고리 / 검색 결과 페이지 렌더링
 *   /category.html?cat=food  또는  ?cat=info   → 카테고리 글 목록
 *   /category.html?q=검색어                     → 제목·요약 검색 결과
 */
(function () {
  function listItem(p) {
    return `
      <a class="listitem" href="${p.url}">
        ${thumbHtml(p, "thumb--list")}
        <div class="listitem__body">
          <span class="listitem__cat" style="--c:${catColor(p.category)}">${catName(p.category)}</span>
          <h3 class="listitem__title">${esc(p.title)}</h3>
          <p class="listitem__summary">${esc(p.summary)}</p>
          <span class="listitem__date">${p.date}</span>
        </div>
      </a>`;
  }

  function byDateDesc(a, b) {
    return (b.date || "").localeCompare(a.date || "");
  }

  function renderSidebar(excludeCat) {
    const side = document.getElementById("sidebar");
    if (!side) return;
    const recent = (window.POSTS || []).slice().sort(byDateDesc)
      .filter(function (p) { return p.category !== excludeCat; })
      .slice(0, 6);
    const items = recent.map(function (p) {
      return `<a class="tagitem" href="${p.url}">` +
        `<span class="tag" style="--c:${catColor(p.category)}">${catName(p.category)}</span>` +
        `<span class="tagitem__title">${esc(p.title)}</span></a>`;
    }).join("");
    side.innerHTML =
      adUnit("sidebar", "사이드") +
      `<div class="panel"><div class="panel__head">${excludeCat ? "다른 분야 글" : "최신 글"}</div><div class="taglist">${items}</div></div>`;
  }

  function render() {
    const titleEl = document.getElementById("cat-title");
    const noteEl = document.getElementById("cat-note");
    const listEl = document.getElementById("cat-list");
    const q = (getParam("q") || "").trim();

    /* ── 검색 결과 ── */
    if (q) {
      const words = q.toLowerCase().split(/\s+/).filter(Boolean);
      const hits = (window.POSTS || []).filter(function (p) {
        const hay = (p.title + " " + p.summary).toLowerCase();
        return words.every(function (w) { return hay.indexOf(w) !== -1; });
      }).sort(byDateDesc);
      if (titleEl) titleEl.textContent = `'${q}' 검색 결과`;
      document.title = `'${q}' 검색 결과 · ${SITE.name}`;
      if (noteEl) noteEl.textContent = hits.length ? `${hits.length}개의 글을 찾았습니다.` : "";
      if (listEl) {
        listEl.innerHTML = hits.length
          ? hits.map(listItem).join("")
          : `<div class="empty"><p>'${esc(q)}'에 맞는 글이 아직 없습니다.</p><p>다른 단어로 검색하거나 카테고리에서 찾아보세요.</p><a class="btn" href="/">홈으로</a></div>`;
      }
      renderSidebar("");
      activateAds();
      return;
    }

    /* ── 카테고리 ── */
    const cat = getParam("cat") || "food";
    const meta = (window.CATEGORIES || {})[cat];
    document.body.setAttribute("data-cat", cat);
    if (titleEl) titleEl.textContent = meta ? meta.name : "카테고리";
    document.title = `${meta ? meta.name : "카테고리"} · ${SITE.name}`;
    if (noteEl && meta && meta.desc) noteEl.textContent = meta.desc;

    if (!meta || !meta.ready) {
      if (listEl) {
        listEl.innerHTML = `
          <div class="empty">
            <p><strong>${meta ? meta.name : ""}</strong> 카테고리는 준비중입니다.</p>
            <p>곧 알찬 글로 찾아뵙겠습니다.</p>
            <a class="btn" href="/">홈으로</a>
          </div>`;
      }
      renderSidebar("");
      activateAds();
      return;
    }

    const posts = (window.POSTS || [])
      .filter(function (p) { return p.category === cat; })
      .sort(byDateDesc);

    if (listEl) {
      listEl.innerHTML = posts.length
        ? adUnit("inList", "목록") + posts.map(listItem).join("")
        : `<div class="empty"><p>아직 등록된 글이 없습니다.</p></div>`;
    }
    renderSidebar(cat);
    activateAds();
  }

  document.addEventListener("DOMContentLoaded", render);
})();
