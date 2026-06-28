(function () {
  "use strict";

  var enlistInput = document.getElementById("enlistInput");
  var branchInput = document.getElementById("branchInput");
  var calcBtn = document.getElementById("calcBtn");
  var errorMsg = document.getElementById("errorMsg");
  var resultsCard = document.getElementById("resultsCard");

  document.getElementById("year").textContent = new Date().getFullYear();

  function fmtDate(d) {
    var days = ["일", "월", "화", "수", "목", "금", "토"];
    return d.getFullYear() + "년 " + (d.getMonth() + 1) + "월 " + d.getDate() + "일 (" + days[d.getDay()] + ")";
  }
  function fmtNum(n) { return n.toLocaleString("ko-KR"); }
  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

  // 입대일 + months개월 - 1일 = 만기 전역일
  function dischargeDate(enlist, months) {
    var d = new Date(enlist.getFullYear(), enlist.getMonth() + months, enlist.getDate());
    d.setDate(d.getDate() - 1);
    return d;
  }

  function handleCalc() {
    errorMsg.textContent = "";
    if (!enlistInput.value) {
      resultsCard.hidden = true;
      errorMsg.textContent = "입대일을 입력해 주세요.";
      return;
    }

    var p = enlistInput.value.split("-");
    var enlist = new Date(+p[0], +p[1] - 1, +p[2]);
    var months = parseInt(branchInput.value, 10);
    var discharge = dischargeDate(enlist, months);
    var today = startOfDay(new Date());

    var totalDays = Math.round((discharge - enlist) / 86400000) + 1;
    var served = Math.round((today - enlist) / 86400000) + 1;
    if (served < 0) served = 0;
    if (served > totalDays) served = totalDays;
    var remain = Math.round((discharge - today) / 86400000);
    var progress = Math.max(0, Math.min(100, (served / totalDays) * 100));

    var ddayText;
    if (remain > 0) ddayText = "D-" + fmtNum(remain);
    else if (remain === 0) ddayText = "전역일! 🎉";
    else ddayText = "전역 완료 (D+" + fmtNum(-remain) + ")";

    document.getElementById("ddayMain").textContent = ddayText;
    document.getElementById("dischargeInfo").textContent = "전역일 " + fmtDate(discharge);
    document.getElementById("rEnlist").textContent = fmtDate(enlist);
    document.getElementById("rDischarge").textContent = fmtDate(discharge);
    document.getElementById("rTotalDays").textContent = fmtNum(totalDays) + "일";
    document.getElementById("rServed").textContent = fmtNum(served) + "일";
    document.getElementById("rRemain").textContent = remain > 0 ? fmtNum(remain) + "일" : "0일";
    document.getElementById("rProgress").textContent = progress.toFixed(1) + "%";
    resultsCard.hidden = false;
  }

  calcBtn.addEventListener("click", handleCalc);

  try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
})();
