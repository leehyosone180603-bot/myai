(function () {
  "use strict";

  var ZODIAC = ["원숭이", "닭", "개", "돼지", "쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양"];

  var modeRadios = document.getElementsByName("mode");
  var ageRow = document.getElementById("ageRow");
  var yearRow = document.getElementById("yearRow");
  var ageInput = document.getElementById("ageInput");
  var yearInput = document.getElementById("yearInput");
  var calcBtn = document.getElementById("calcBtn");
  var errorMsg = document.getElementById("errorMsg");
  var resultsCard = document.getElementById("resultsCard");
  var mainResult = document.getElementById("mainResult");
  var subResult = document.getElementById("subResult");
  var detailBody = document.getElementById("detailBody");

  var THIS_YEAR = new Date().getFullYear();
  document.getElementById("year").textContent = THIS_YEAR;

  function zodiacOf(year) {
    return ZODIAC[((year % 12) + 12) % 12];
  }
  function digits(v) {
    var d = (v || "").replace(/[^0-9]/g, "");
    return d ? parseInt(d, 10) : NaN;
  }
  function row(label, value) {
    return "<tr><th>" + label + "</th><td>" + value + "</td></tr>";
  }

  function currentMode() {
    for (var i = 0; i < modeRadios.length; i++) {
      if (modeRadios[i].checked) return modeRadios[i].value;
    }
    return "age";
  }

  function toggleMode() {
    var m = currentMode();
    ageRow.hidden = m !== "age";
    yearRow.hidden = m !== "year";
    errorMsg.textContent = "";
    resultsCard.hidden = true;
  }
  for (var i = 0; i < modeRadios.length; i++) {
    modeRadios[i].addEventListener("change", toggleMode);
  }

  function calcFromAge() {
    var age = digits(ageInput.value);
    if (isNaN(age) || age < 0 || age > 150) {
      throw new Error("나이를 올바르게 입력해 주세요 (0~150).");
    }
    // 만 나이 기준: 올해 생일이 지났으면 출생연도 = THIS_YEAR - age,
    // 아직 안 지났으면 THIS_YEAR - age - 1
    var yearIfPassed = THIS_YEAR - age;
    var yearIfNot = THIS_YEAR - age - 1;

    mainResult.textContent = yearIfPassed + "년 또는 " + yearIfNot + "년생";
    subResult.textContent = "만 " + age + "세 (2026년 기준)";
    detailBody.innerHTML =
      row("올해 생일이 지났다면", yearIfPassed + "년생 (" + zodiacOf(yearIfPassed) + "띠)") +
      row("올해 생일이 안 지났다면", yearIfNot + "년생 (" + zodiacOf(yearIfNot) + "띠)") +
      row("연 나이 기준 출생연도", (THIS_YEAR - age) + "년생") +
      row("세는 나이라면", (THIS_YEAR - age + 1) + "년생");
  }

  function calcFromYear() {
    var year = digits(yearInput.value);
    if (isNaN(year) || year < 1900 || year > THIS_YEAR) {
      throw new Error("출생연도를 올바르게 입력해 주세요 (1900~" + THIS_YEAR + ").");
    }
    var manBefore = THIS_YEAR - year - 1; // 생일 전
    var manAfter = THIS_YEAR - year;      // 생일 후
    var korean = THIS_YEAR - year + 1;    // 세는 나이

    mainResult.textContent = "만 " + (manBefore < 0 ? 0 : manBefore) + "~" + manAfter + "세";
    subResult.textContent = year + "년생 · " + zodiacOf(year) + "띠";
    detailBody.innerHTML =
      row("만 나이", "생일 전 " + (manBefore < 0 ? 0 : manBefore) + "세 / 생일 후 " + manAfter + "세") +
      row("세는 나이 (한국식)", korean + "세") +
      row("연 나이", manAfter + "세") +
      row("띠", zodiacOf(year) + "띠");
  }

  function handleCalc() {
    errorMsg.textContent = "";
    try {
      if (currentMode() === "age") calcFromAge();
      else calcFromYear();
      resultsCard.hidden = false;
    } catch (e) {
      resultsCard.hidden = true;
      errorMsg.textContent = e.message;
    }
  }

  calcBtn.addEventListener("click", handleCalc);
  ageInput.addEventListener("keydown", function (e) { if (e.key === "Enter") handleCalc(); });
  yearInput.addEventListener("keydown", function (e) { if (e.key === "Enter") handleCalc(); });

  try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
})();
