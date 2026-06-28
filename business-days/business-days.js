(function () {
  "use strict";

  // 2025~2026 주요 공휴일 (대체공휴일 일부 포함)
  var HOLIDAYS = {
    "2025-01-01": 1, "2025-01-28": 1, "2025-01-29": 1, "2025-01-30": 1,
    "2025-03-01": 1, "2025-03-03": 1, "2025-05-05": 1, "2025-05-06": 1,
    "2025-06-06": 1, "2025-08-15": 1, "2025-10-03": 1, "2025-10-06": 1,
    "2025-10-07": 1, "2025-10-08": 1, "2025-10-09": 1, "2025-12-25": 1,
    "2026-01-01": 1, "2026-02-16": 1, "2026-02-17": 1, "2026-02-18": 1,
    "2026-03-01": 1, "2026-03-02": 1, "2026-05-05": 1, "2026-05-24": 1,
    "2026-05-25": 1, "2026-06-06": 1, "2026-08-15": 1, "2026-08-17": 1,
    "2026-09-24": 1, "2026-09-25": 1, "2026-09-26": 1, "2026-10-03": 1,
    "2026-10-05": 1, "2026-10-09": 1, "2026-12-25": 1
  };

  var startInput = document.getElementById("startInput");
  var endInput = document.getElementById("endInput");
  var holidayCheck = document.getElementById("holidayCheck");
  var calcBtn = document.getElementById("calcBtn");
  var errorMsg = document.getElementById("errorMsg");
  var resultsCard = document.getElementById("resultsCard");

  document.getElementById("year").textContent = new Date().getFullYear();

  function fmtNum(n) { return n.toLocaleString("ko-KR"); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function key(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }

  function handleCalc() {
    errorMsg.textContent = "";
    if (!startInput.value || !endInput.value) {
      resultsCard.hidden = true;
      errorMsg.textContent = "시작일과 종료일을 모두 입력해 주세요.";
      return;
    }

    var sp = startInput.value.split("-");
    var ep = endInput.value.split("-");
    var start = new Date(+sp[0], +sp[1] - 1, +sp[2]);
    var end = new Date(+ep[0], +ep[1] - 1, +ep[2]);

    if (start > end) {
      resultsCard.hidden = true;
      errorMsg.textContent = "종료일이 시작일보다 빠를 수 없습니다.";
      return;
    }

    var total = 0, weekend = 0, holidayWeekday = 0, business = 0;
    var excludeHoliday = holidayCheck.checked;
    var cur = new Date(start);

    while (cur <= end) {
      total++;
      var dow = cur.getDay();
      if (dow === 0 || dow === 6) {
        weekend++;
      } else if (excludeHoliday && HOLIDAYS[key(cur)]) {
        holidayWeekday++;
      } else {
        business++;
      }
      cur.setDate(cur.getDate() + 1);
    }

    document.getElementById("bizMain").textContent = fmtNum(business);
    document.getElementById("rTotal").textContent = fmtNum(total) + "일";
    document.getElementById("rWeekend").textContent = fmtNum(weekend) + "일";
    document.getElementById("rHoliday").textContent = excludeHoliday ? fmtNum(holidayWeekday) + "일" : "제외 안 함";
    document.getElementById("rBiz").textContent = fmtNum(business) + "일";
    resultsCard.hidden = false;
  }

  calcBtn.addEventListener("click", handleCalc);

  try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
})();
