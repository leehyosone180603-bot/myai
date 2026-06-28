(function () {
  "use strict";

  var amountInput = document.getElementById("amountInput");
  var calcBtn = document.getElementById("calcBtn");
  var errorMsg = document.getElementById("errorMsg");
  var resultsCard = document.getElementById("resultsCard");

  document.getElementById("year").textContent = new Date().getFullYear();

  function fmt(n) { return Math.round(n).toLocaleString("ko-KR") + "원"; }
  function parseWon(raw) {
    var d = (raw || "").replace(/[^0-9]/g, "");
    return d ? parseInt(d, 10) : 0;
  }

  amountInput.addEventListener("input", function () {
    var v = parseWon(amountInput.value);
    amountInput.value = v ? v.toLocaleString("ko-KR") : "";
  });

  function handleCalc() {
    errorMsg.textContent = "";
    var amount = parseWon(amountInput.value);
    if (!amount) {
      resultsCard.hidden = true;
      errorMsg.textContent = "금액을 입력해 주세요.";
      return;
    }

    var mode = document.querySelector('input[name="mode"]:checked').value;
    var supply, vat, total;
    if (mode === "supply") {
      supply = amount;
      vat = amount * 0.1;
      total = supply + vat;
    } else {
      supply = amount / 1.1;
      vat = amount - supply;
      total = amount;
    }

    document.getElementById("rSupply").textContent = fmt(supply);
    document.getElementById("rVat").textContent = fmt(vat);
    document.getElementById("rTotal").textContent = fmt(total);
    resultsCard.hidden = false;
  }

  calcBtn.addEventListener("click", handleCalc);
  amountInput.addEventListener("keydown", function (e) { if (e.key === "Enter") handleCalc(); });

  try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
})();
