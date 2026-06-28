(function () {
  "use strict";

  var MIN = 1;
  var MAX = 45;
  var PICK = 6;

  var generateBtn = document.getElementById("generateBtn");
  var copyBtn = document.getElementById("copyBtn");
  var resultsCard = document.getElementById("resultsCard");
  var resultsList = document.getElementById("resultsList");
  var errorMsg = document.getElementById("errorMsg");

  document.getElementById("year").textContent = new Date().getFullYear();

  // 입력 문자열을 유효한 1~45 정수 배열로 파싱 (중복 제거)
  function parseNumbers(raw) {
    if (!raw) return [];
    var seen = {};
    var out = [];
    raw.split(/[\s,]+/).forEach(function (token) {
      if (token === "") return;
      var n = Number(token);
      if (!Number.isInteger(n) || n < MIN || n > MAX) {
        throw new Error(token + " 은(는) 1부터 45 사이의 숫자가 아닙니다.");
      }
      if (!seen[n]) {
        seen[n] = true;
        out.push(n);
      }
    });
    return out;
  }

  // 암호학적으로 더 고른 난수 (가능 시 crypto 사용)
  function randomInt(maxExclusive) {
    if (window.crypto && window.crypto.getRandomValues) {
      var arr = new Uint32Array(1);
      var limit = Math.floor(0xffffffff / maxExclusive) * maxExclusive;
      var v;
      do {
        window.crypto.getRandomValues(arr);
        v = arr[0];
      } while (v >= limit);
      return v % maxExclusive;
    }
    return Math.floor(Math.random() * maxExclusive);
  }

  // 한 게임 생성: 포함 번호 고정 + 풀에서 나머지 추첨 + 보너스 1개
  function generateGame(include, excludeSet) {
    var picks = include.slice();
    var pool = [];
    for (var n = MIN; n <= MAX; n++) {
      if (!excludeSet[n] && include.indexOf(n) === -1) pool.push(n);
    }
    while (picks.length < PICK && pool.length > 0) {
      var idx = randomInt(pool.length);
      picks.push(pool[idx]);
      pool.splice(idx, 1);
    }
    picks.sort(function (a, b) { return a - b; });
    // 보너스 번호: 본번호에 포함되지 않은 나머지 숫자 중 1개
    var bonus = pool.length > 0 ? pool[randomInt(pool.length)] : null;
    return { numbers: picks, bonus: bonus };
  }

  function colorClass(n) {
    if (n <= 10) return "c1";
    if (n <= 20) return "c2";
    if (n <= 30) return "c3";
    if (n <= 40) return "c4";
    return "c5";
  }

  function renderResults(games) {
    resultsList.innerHTML = "";
    games.forEach(function (game, i) {
      var li = document.createElement("li");
      li.className = "result-row";

      var label = document.createElement("span");
      label.className = "game-label";
      label.textContent = String.fromCharCode(65 + i); // A, B, C ...
      li.appendChild(label);

      game.numbers.forEach(function (num) {
        var ball = document.createElement("span");
        ball.className = "ball " + colorClass(num);
        ball.textContent = num;
        li.appendChild(ball);
      });

      // 보너스 번호 표시 (+ 기호와 함께)
      if (game.bonus !== null) {
        var plus = document.createElement("span");
        plus.className = "plus";
        plus.textContent = "+";
        plus.setAttribute("aria-label", "보너스");
        li.appendChild(plus);

        var bonusBall = document.createElement("span");
        bonusBall.className = "ball bonus " + colorClass(game.bonus);
        bonusBall.textContent = game.bonus;
        bonusBall.title = "보너스 번호";
        li.appendChild(bonusBall);
      }

      resultsList.appendChild(li);
    });
    resultsCard.hidden = false;
  }

  function handleGenerate() {
    errorMsg.textContent = "";
    try {
      var include = parseNumbers(document.getElementById("includeInput").value);
      var exclude = parseNumbers(document.getElementById("excludeInput").value);

      if (include.length > PICK - 1) {
        throw new Error("포함 번호는 최대 " + (PICK - 1) + "개까지 입력할 수 있습니다.");
      }

      var excludeSet = {};
      exclude.forEach(function (n) {
        if (include.indexOf(n) !== -1) {
          throw new Error(n + " 은(는) 포함과 제외에 동시에 지정할 수 없습니다.");
        }
        excludeSet[n] = true;
      });

      var available = MAX - exclude.length;
      if (available < PICK + 1) {
        throw new Error("제외 번호가 너무 많아 본번호 6개와 보너스 1개를 뽑을 수 없습니다.");
      }

      var count = parseInt(document.getElementById("gameCount").value, 10) || 1;
      var games = [];
      for (var g = 0; g < count; g++) {
        games.push(generateGame(include, excludeSet));
      }
      renderResults(games);
    } catch (e) {
      resultsCard.hidden = true;
      errorMsg.textContent = e.message;
    }
  }

  function handleCopy() {
    var lines = [];
    document.querySelectorAll(".result-row").forEach(function (row) {
      var label = row.querySelector(".game-label").textContent;
      var nums = [];
      var bonus = null;
      row.querySelectorAll(".ball").forEach(function (b) {
        if (b.classList.contains("bonus")) bonus = b.textContent;
        else nums.push(b.textContent);
      });
      var line = label + ": " + nums.join(", ");
      if (bonus !== null) line += " + " + bonus;
      lines.push(line);
    });
    var text = lines.join("\n");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        flashCopy("복사됨!");
      }, function () {
        flashCopy("복사 실패");
      });
    } else {
      flashCopy("복사 미지원");
    }
  }

  function flashCopy(msg) {
    var original = copyBtn.textContent;
    copyBtn.textContent = msg;
    setTimeout(function () { copyBtn.textContent = original; }, 1500);
  }

  generateBtn.addEventListener("click", handleGenerate);
  copyBtn.addEventListener("click", handleCopy);

  // AdSense 광고 렌더 요청
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch (e) { /* 광고 차단 등 무시 */ }
})();
