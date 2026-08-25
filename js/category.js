/* =============================================================
   category.js — 카테고리(category.html) 렌더링
   ?cat=<slug> 쿼리로 해당 카테고리 글만 필터.
   컨테이너: <div id="category-root"></div>
   posts.js, site.js, home.js(공용 postCard/renderSidebar) 이후 로드.
   ============================================================= */

function renderCategory() {
  var root = document.getElementById("category-root");
  if (!root) return;

  var slug = new URLSearchParams(location.search).get("cat");
  var cat = slug && CATEGORIES[slug];
  var allPosts = getPostsSorted();

  // 잘못된/없는 카테고리
  if (!cat) {
    root.innerHTML = '<div class="wrap"><h1 class="cat-h1">카테고리를 찾을 수 없습니다</h1>' +
      '<p class="empty">주소를 확인하시거나 <a href="/">홈</a>으로 돌아가 주세요.</p></div>';
    document.title = "카테고리 - 한국인계산기";
    return;
  }

  document.title = cat.name + " - 한국인계산기";

  // 준비중 카테고리
  if (!cat.ready) {
    root.innerHTML = '<div class="wrap"><div class="cat-head" style="--cat:' + cat.color + '">' +
      '<h1 class="cat-h1">' + esc(cat.name) + '</h1></div>' +
      '<p class="empty">🚧 ‘' + esc(cat.name) + '’ 카테고리는 준비 중입니다. 콘텐츠가 준비되는 대로 공개하겠습니다.</p>' +
      '<p style="text-align:center"><a class="btn-home" href="/">← 홈으로</a></p></div>';
    return;
  }

  var posts = allPosts.filter(function (p) { return p.category === slug; });
  var rows = posts.length
    ? posts.map(function (p) { return postCard(p, "row"); }).join("")
    : '<p class="empty">이 카테고리에는 아직 글이 없습니다.</p>';

  root.innerHTML =
    '<div class="wrap">' +
      '<div class="cat-head" style="--cat:' + cat.color + '">' +
        '<h1 class="cat-h1">' + esc(cat.name) + '</h1>' +
        '<span class="cat-count">' + posts.length + '개의 글</span>' +
      '</div>' +
      '<div class="home-grid">' +
        '<div class="home-main">' + rows + '</div>' +
        renderSidebar(allPosts) +
      '</div>' +
    '</div>';
}

document.addEventListener("DOMContentLoaded", renderCategory);
