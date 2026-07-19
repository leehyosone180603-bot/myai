/*
 * 도깨비 사주/궁합 수익화 인터랙션
 *  1) '이어서 도깨비의 풀이 보기' 클릭 → 쿠팡(새 탭) + 3초 뒤(또는 탭 복귀 즉시) 가려진 풀이 자동 공개
 *  2) '무료 궁합/궁합 보기' 링크 클릭 → 쿠팡(새 탭) + 3초 뒤(또는 탭 복귀 즉시) 궁합 사이트로 이동
 * (상단 내비게이션 링크는 제외)
 *
 * 참고: 새 탭이 뜨면 원래 탭이 백그라운드로 밀려 setTimeout이 지연/정지될 수 있어,
 *       탭으로 다시 돌아오는 순간(visibilitychange)에도 즉시 실행되도록 이중 처리한다.
 */
(function () {
  "use strict";
  var COUPANG = "https://link.coupang.com/a/fvCEqbDBO8";
  var DELAY = 3000;

  function toast(msg) {
    var t = document.getElementById("monetize-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "monetize-toast";
      t.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99999;" +
        "background:rgba(20,18,28,.96);color:#f4e9c8;border:1px solid #c9a94a;border-radius:12px;" +
        "padding:13px 18px;font-size:.92rem;font-weight:700;box-shadow:0 8px 30px rgba(0,0,0,.5);" +
        "max-width:90%;text-align:center;line-height:1.5;";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.display = "block";
  }
  function hideToast() {
    var t = document.getElementById("monetize-toast");
    if (t) t.style.display = "none";
  }

  // 3초 뒤 실행하되, 그 전에 사용자가 탭으로 돌아오면 즉시 실행
  function runAfterDelayOrReturn(fn) {
    var done = false;
    function fire() {
      if (done) return;
      done = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
      fn();
    }
    function onVis() { if (document.visibilityState === "visible") fire(); }
    var timer = setTimeout(fire, DELAY);
    document.addEventListener("visibilitychange", onVis);
  }

  // 1) 이어서 풀이 보기 → 쿠팡 새 탭(앵커 기본 동작) + 가려진 풀이 공개
  var payBtn = document.getElementById("payBtn");
  if (payBtn) {
    payBtn.addEventListener("click", function () {
      if (payBtn.dataset.done) return;   // 중복 방지
      payBtn.dataset.done = "1";
      toast("⏳ 3초 뒤 자동으로 결과가 보여집니다...");
      runAfterDelayOrReturn(function () {
        var blurred = document.querySelectorAll(".blur");
        for (var i = 0; i < blurred.length; i++) blurred[i].classList.remove("blur");
        hideToast();
        var card = payBtn.closest ? payBtn.closest(".card") : null;
        if (card) card.style.display = "none";
      });
    });
  }

  // 2) 궁합 링크(콘텐츠 내) → 쿠팡 새 탭 + 궁합 사이트로 이동
  document.addEventListener("click", function (e) {
    var el = e.target;
    var a = el && el.closest ? el.closest('a[href="/gunghap/"], a[href^="/gunghap/"]') : null;
    if (!a) return;
    if (a.closest(".back-nav")) return;    // 상단 내비 링크는 제외
    if (a.dataset.gh) return;
    e.preventDefault();
    a.dataset.gh = "1";
    window.open(COUPANG, "_blank", "noopener");
    toast("⏳ 3초 뒤 자동으로 궁합보기 사이트로 이동됩니다...");
    runAfterDelayOrReturn(function () { window.location.href = "/gunghap/"; });
  }, false);
})();
