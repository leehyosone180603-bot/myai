(function () {
  "use strict";

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

  function handleCalc() {
    errorMsg.textContent = "";
    var gross = parseWon(amountInput.value);
    if (!gross) {
      resultsCard.hidden = true;
      errorMsg.textContent = "지급액을 입력해 주세요.";
      return;
    }

    var kind = document.querySelector('input[name="kind"]:checked').value;
    // 소득세율, 지방소득세율 (지방세 = 소득세의 10%)
    var incomeRate = kind === "8.8" ? 0.08 : 0.03;
    var income = Math.round(gross * incomeRate / 10) * 10;
    var local = Math.round(income * 0.1 / 10) * 10;
    var total = income + local;
    var net = gross - total;

    document.getElementById("netMain").textContent = Math.round(net).toLocaleString("ko-KR");
    document.getElementById("rGross").textContent = won(gross);
    document.getElementById("rIncome").textContent = "-" + won(income);
    document.getElementById("rLocal").textContent = "-" + won(local);
    document.getElementById("rTotal").textContent = "-" + won(total);
    document.getElementById("rNet").textContent = won(net);
    resultsCard.hidden = false;
  }

  calcBtn.addEventListener("click", handleCalc);
  amountInput.addEventListener("keydown", function (e) { if (e.key === "Enter") handleCalc(); });

  try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
})();
