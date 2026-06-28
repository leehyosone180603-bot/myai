(function () {
  "use strict";

  var joinInput = document.getElementById("joinInput");
  var leaveInput = document.getElementById("leaveInput");
  var wage3mInput = document.getElementById("wage3mInput");
  var bonusInput = document.getElementById("bonusInput");
  var annualLeaveInput = document.getElementById("annualLeaveInput");
  var calcBtn = document.getElementById("calcBtn");
  var errorMsg = document.getElementById("errorMsg");
  var resultsCard = document.getElementById("resultsCard");

  document.getElementById("year").textContent = new Date().getFullYear();

  function won(n) { return Math.round(n).toLocaleString("ko-KR") + "원"; }
  function parseWon(raw) {
    var d = (raw || "").replace(/[^0-9]/g, "");
    return d ? parseInt(d, 10) : 0;
  }
  function attachComma(el) {
    el.addEventListener("input", function () {
      var v = parseWon(el.value);
      el.value = v ? v.toLocaleString("ko-KR") : "";
    });
  }
  [wage3mInput, bonusInput, annualLeaveInput].forEach(attachComma);

  function handleCalc() {
    errorMsg.textContent = "";
    if (!joinInput.value || !leaveInput.value) {
      resultsCard.hidden = true;
      errorMsg.textContent = "입사일과 퇴사일을 입력해 주세요.";
      return;
    }

    var jp = joinInput.value.split("-");
    var lp = leaveInput.value.split("-");
    var join = new Date(+jp[0], +jp[1] - 1, +jp[2]);
    var leave = new Date(+lp[0], +lp[1] - 1, +lp[2]);

    if (join >= leave) {
      resultsCard.hidden = true;
      errorMsg.textContent = "퇴사일은 입사일보다 늦어야 합니다.";
      return;
    }

    var wage3m = parseWon(wage3mInput.value);
    if (!wage3m) {
      resultsCard.hidden = true;
      errorMsg.textContent = "퇴직 전 3개월 임금 총액을 입력해 주세요.";
      return;
    }
    var bonus = parseWon(bonusInput.value);
    var annualLeave = parseWon(annualLeaveInput.value);

    // 재직일수
    var workDays = Math.round((leave - join) / 86400000);

    // 평균임금 산정기간(퇴직 전 3개월) 총일수
    var periodStart = new Date(leave.getFullYear(), leave.getMonth() - 3, leave.getDate());
    var periodDays = Math.round((leave - periodStart) / 86400000);

    // 평균임금에 산입할 임금 = 3개월 임금 + 상여금×(3/12) + 연차수당×(3/12)
    var wageForAvg = wage3m + bonus * 3 / 12 + annualLeave * 3 / 12;
    var avgDaily = wageForAvg / periodDays;

    // 퇴직금 = 1일 평균임금 × 30 × (재직일수 / 365)
    var pay = avgDaily * 30 * (workDays / 365);

    document.getElementById("payMain").textContent = Math.round(pay).toLocaleString("ko-KR");
    document.getElementById("rDays").textContent = workDays.toLocaleString("ko-KR") + "일 (약 " + (workDays / 365).toFixed(1) + "년)";
    document.getElementById("rAvg").textContent = won(avgDaily);
    document.getElementById("rPay").textContent = won(pay);
    resultsCard.hidden = false;

    if (workDays < 365) {
      errorMsg.textContent = "참고: 계속근로 1년 미만은 법정 퇴직금이 발생하지 않습니다 (위 금액은 단순 환산치).";
    }
  }

  calcBtn.addEventListener("click", handleCalc);

  try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
})();
