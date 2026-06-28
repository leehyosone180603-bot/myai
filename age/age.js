(function () {
  "use strict";

  var ZODIAC = ["원숭이", "닭", "개", "돼지", "쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양"];

  var birthInput = document.getElementById("birthInput");
  var baseInput = document.getElementById("baseInput");
  var calcBtn = document.getElementById("calcBtn");
  var errorMsg = document.getElementById("errorMsg");
  var resultsCard = document.getElementById("resultsCard");

  document.getElementById("year").textContent = new Date().getFullYear();

  function fmt(n) {
    return n.toLocaleString("ko-KR");
  }

  // 두 날짜(연/월/일) 기준의 만 나이
  function manAge(birth, base) {
    var years = base.getFullYear() - birth.getFullYear();
    var m = base.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && base.getDate() < birth.getDate())) {
      years--;
    }
    return years;
  }

  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function handleCalc() {
    errorMsg.textContent = "";

    if (!birthInput.value) {
      resultsCard.hidden = true;
      errorMsg.textContent = "생년월일을 입력해 주세요.";
      return;
    }

    var birthParts = birthInput.value.split("-");
    var birth = new Date(+birthParts[0], +birthParts[1] - 1, +birthParts[2]);

    var base;
    if (baseInput.value) {
      var bp = baseInput.value.split("-");
      base = new Date(+bp[0], +bp[1] - 1, +bp[2]);
    } else {
      base = startOfDay(new Date());
    }

    if (birth > base) {
      resultsCard.hidden = true;
      errorMsg.textContent = "생년월일이 기준일보다 늦을 수 없습니다.";
      return;
    }

    var man = manAge(birth, base);
    var korean = base.getFullYear() - birth.getFullYear() + 1;
    var yearAge = base.getFullYear() - birth.getFullYear();
    var zodiac = ZODIAC[((birth.getFullYear() % 12) + 12) % 12];
    var daysLived = Math.floor((base - birth) / 86400000);

    // 다음 생일까지 남은 일수
    var nextBday = new Date(base.getFullYear(), birth.getMonth(), birth.getDate());
    if (nextBday < base) {
      nextBday = new Date(base.getFullYear() + 1, birth.getMonth(), birth.getDate());
    }
    var daysToBday = Math.round((nextBday - base) / 86400000);

    document.getElementById("ageMain").textContent = man;
    document.getElementById("ageSub").textContent =
      birth.getFullYear() + "년 " + (birth.getMonth() + 1) + "월 " + birth.getDate() + "일생 · " + zodiac + "띠";

    document.getElementById("rManAge").textContent = "만 " + man + "세";
    document.getElementById("rKoreanAge").textContent = korean + "세";
    document.getElementById("rYearAge").textContent = yearAge + "세";
    document.getElementById("rZodiac").textContent = zodiac + "띠";
    document.getElementById("rNextBirthday").textContent =
      daysToBday === 0 ? "오늘이 생일입니다 🎉" : "D-" + daysToBday + " (" + fmt(daysToBday) + "일 남음)";
    document.getElementById("rDaysLived").textContent = fmt(daysLived) + "일";

    resultsCard.hidden = false;
  }

  calcBtn.addEventListener("click", handleCalc);
  birthInput.addEventListener("keydown", function (e) { if (e.key === "Enter") handleCalc(); });

  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch (e) { /* 무시 */ }
})();
