/*
 * 도깨비 사주 결과 → 전체 상세풀이 연결
 *  '이어서 도깨비의 풀이 보기' 클릭 시, 생년월일 파라미터를 붙여 상세풀이 페이지로 바로 이동한다.
 *  (쿠팡 강제 클릭/자동 리디렉트 없음. 쿠팡 추천은 별도 '선택형' 배너로 제공한다.)
 */
(function () {
  "use strict";
  var payBtn = document.getElementById("payBtn");
  if (!payBtn) return;
  payBtn.addEventListener("click", function (e) {
    var share = document.getElementById("shareUrl");
    var q = (share && share.value.indexOf("?") >= 0) ? share.value.split("?")[1] : "";
    if (q) {
      e.preventDefault();
      window.location.href = "/saju/detail/?" + q;
    }
    // 파라미터가 없으면 앵커 기본 href(/saju/detail/)로 이동
  });
})();
