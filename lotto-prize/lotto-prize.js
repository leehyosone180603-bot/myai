(function () {
  "use strict";

  var THRESHOLD_FREE = 50000;       // 5만원 이하 비과세
  var THRESHOLD_HIGH = 300000000;   // 3억 초과분 33%
  var RATE_LOW = 0.22;              // 22%
  var RATE_HIGH = 0.33;             // 33%

  var amountInput = document.getElementById("amountInput");
  var calcBtn = document.getElementById("calcBtn");
  var errorMsg = document.getElementById("errorMsg");
  var resultsCard = document.getElementById("resultsCard");

  document.getElementById("year").textContent = new Date().getFullYear();

  function won(n) { return Math.round(n).toLocaleString("ko-KR") + "원"; }
  function parseWon(raw) {
    var d = (raw || "").replace(/[^0-9]/g, "");
    return d ? parseInt(d, 10) : 0;
  }

  amountInput.addEventListener("input", function () {
    var v = parseWon(amountInput.value);
    amountInput.value = v ? v.toLocaleString("ko-KR") : "";
  });

  function calcTax(amount) {
    if (amount <= THRESHOLD_FREE) return 0;
    if (amount <= THRESHOLD_HIGH) return amount * RATE_LOW;
    return THRESHOLD_HIGH * RATE_LOW + (amount - THRESHOLD_HIGH) * RATE_HIGH;
  }

  function rateLabel(amount) {
    if (amount <= THRESHOLD_FREE) return "비과세 (5만원 이하)";
    if (amount <= THRESHOLD_HIGH) return "세율 22% 적용";
    return "3억 이하 22% + 초과분 33% 적용";
  }

  function handleCalc() {
    errorMsg.textContent = "";
    var amount = parseWon(amountInput.value);
    if (!amount) {
      resultsCard.hidden = true;
      errorMsg.textContent = "당첨금액을 입력해 주세요.";
      return;
    }

    var tax = calcTax(amount);
    var net = amount - tax;

    document.getElementById("netMain").textContent = Math.round(net).toLocaleString("ko-KR");
    document.getElementById("rateInfo").textContent = rateLabel(amount);
    document.getElementById("rGross").textContent = won(amount);
    document.getElementById("rTax").textContent = "-" + won(tax);
    document.getElementById("rNet").textContent = won(net);
    resultsCard.hidden = false;
  }

  calcBtn.addEventListener("click", handleCalc);
  amountInput.addEventListener("keydown", function (e) { if (e.key === "Enter") handleCalc(); });

  try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
})();
