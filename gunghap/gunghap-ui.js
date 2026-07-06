/* ============================================================
 * 무료 궁합 계산기 UI — calcbox.kr
 * ============================================================ */
(function () {
  "use strict";

  var S = window.Saju, D = window.SajuData, L = window.SajuLunar, G = window.Gunghap;
  var $ = function (id) { return document.getElementById(id); };
  var getRadio = function (n, def) { var r = document.querySelector('input[name="' + n + '"]:checked'); return r ? r.value : def; };

  function onCalChange(sfx) {
    var lunar = getRadio("cal" + sfx, "solar") === "lunar";
    $("leapRow" + sfx).style.display = lunar ? "flex" : "none";
    $("hint" + sfx).textContent = lunar ? "(음력 1900~2050)" : "(양력)";
    $("date" + sfx).max = lunar ? "2050-12-31" : "2100-12-31";
    if (!lunar) $("leap" + sfx).checked = false;
  }

  // 한 사람 입력 → 사주 결과
  function readPerson(sfx) {
    var dateStr = $("date" + sfx).value;
    var name = ($("name" + sfx).value || "").trim();
    if (!dateStr) return { err: (name || (sfx === "A" ? "첫 번째 사람" : "두 번째 사람")) + "의 생년월일을 입력해 주세요." };
    var pr = dateStr.split("-").map(Number), y = pr[0], m = pr[1], d = pr[2];
    var calType = getRadio("cal" + sfx, "solar"), isLeap = $("leap" + sfx).checked;
    var sy = y, sm = m, sd = d, label;

    if (calType === "lunar") {
      if (y < L.minYear() || y > L.maxYear()) return { err: "음력은 " + L.minYear() + "~" + L.maxYear() + "년만 지원합니다." };
      var solar = L.lunarToSolar(y, m, d, isLeap);
      if (!solar) return { err: "존재하지 않는 음력 날짜예요. (날짜·윤달 확인)" };
      sy = solar.y; sm = solar.m; sd = solar.d;
      label = y + "." + m + "." + d + " 음력" + (isLeap ? "(윤)" : "");
    } else {
      if (y < 1900 || y > 2100) return { err: "1900~2100년 사이 날짜를 입력해 주세요." };
      label = y + "." + String(m).padStart(2, "0") + "." + String(d).padStart(2, "0");
    }

    var hourKnown = !$("timeUnknown" + sfx).checked;
    var hh = 12, mm = 0;
    if (hourKnown) { var tp = ($("time" + sfx).value || "12:00").split(":").map(Number); hh = tp[0]; mm = tp[1] || 0; }

    var res = S.computeSaju(sy, sm, sd, hh, mm, { tzHours: 9, hourKnown: hourKnown });
    return { res: res, name: name || (sfx === "A" ? "A" : "B"), label: label, dateStr: dateStr, calType: calType, isLeap: isLeap, hourKnown: hourKnown, timeStr: $("time" + sfx).value || "12:00" };
  }

  function miniGrid(res) {
    var order = ["year", "month", "day", "hour"], lab = ["년", "월", "일", "시"], html = "";
    order.forEach(function (k, i) {
      var p = res.pillars[k];
      if (!p) { html += '<div class="mini-col"><div class="mini-l">' + lab[i] + '</div><div class="mini-c">?</div><div class="mini-c">?</div></div>'; return; }
      var sc = D.OHENG[S.GAN_OHENG[p.stem]].color, bc = D.OHENG[S.JI_OHENG[p.branch]].color;
      html += '<div class="mini-col"><div class="mini-l">' + lab[i] + "</div>" +
        '<div class="mini-c" style="color:' + sc + '">' + S.GAN[p.stem] + "</div>" +
        '<div class="mini-c" style="color:' + bc + '">' + S.JI[p.branch] + "</div></div>";
    });
    return html;
  }

  function buildShareUrl(A, B) {
    var p = new URLSearchParams();
    function put(sfx, P) {
      p.set("d" + sfx, P.dateStr);
      if (P.name && P.name !== "A" && P.name !== "B") p.set("n" + sfx, P.name);
      if (!P.hourKnown) p.set("t" + sfx, "x"); else p.set("t" + sfx, P.timeStr);
      if (P.calType === "lunar") { p.set("c" + sfx, "l"); if (P.isLeap) p.set("l" + sfx, "1"); }
    }
    put("a", A); put("b", B);
    return location.origin + location.pathname + "?" + p.toString();
  }

  function calculate() {
    $("errorMsg").textContent = "";
    var A = readPerson("A"); if (A.err) { $("errorMsg").textContent = A.err; return; }
    var B = readPerson("B"); if (B.err) { $("errorMsg").textContent = B.err; return; }

    var r = G.analyze(A.res, B.res);

    $("scoreNum").textContent = r.score;
    $("scoreTier").textContent = r.tier;
    $("pairLine").textContent = A.name + " (" + A.label + ")  ×  " + B.name + " (" + B.label + ")";

    $("gridA").innerHTML = miniGrid(A.res);
    $("gridB").innerHTML = miniGrid(B.res);
    $("nameA2").textContent = A.name + " · 일간 " + S.GAN_KO[A.res.dayMaster] + "(" + D.OHENG[S.GAN_OHENG[A.res.dayMaster]].ko + ")";
    $("nameB2").textContent = B.name + " · 일간 " + S.GAN_KO[B.res.dayMaster] + "(" + D.OHENG[S.GAN_OHENG[B.res.dayMaster]].ko + ")";

    $("relType").textContent = r.rel.type;
    $("relComment").textContent = r.rel.comment;
    $("jiType").textContent = r.ji.type;
    $("jiComment").textContent = r.ji.comment;
    $("compComment").textContent = r.comp.comment;

    $("shareUrl").value = buildShareUrl(A, B);
    $("resultArea").hidden = false;
    $("resultArea").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function copyValue(text, btn) {
    var orig = btn.textContent;
    function done() { btn.textContent = "복사됨!"; setTimeout(function () { btn.textContent = orig; }, 1500); }
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done).catch(function () {});
    else { var ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); done(); } catch (e) {} document.body.removeChild(ta); }
  }

  function loadFromUrl() {
    var q = new URLSearchParams(location.search);
    if (!q.get("da") || !q.get("db")) return;
    ["a", "b"].forEach(function (sfx) {
      var U = sfx.toUpperCase();
      if (q.get("c" + sfx) === "l") { var rl = document.querySelector('input[name="cal' + U + '"][value="lunar"]'); if (rl) rl.checked = true; if (q.get("l" + sfx) === "1") $("leap" + U).checked = true; }
      onCalChange(U);
      $("date" + U).value = q.get("d" + sfx) || "";
      if (q.get("n" + sfx)) $("name" + U).value = q.get("n" + sfx);
      var t = q.get("t" + sfx);
      if (t === "x") $("timeUnknown" + U).checked = true; else if (t) $("time" + U).value = t;
      $("time" + U).disabled = $("timeUnknown" + U).checked;
    });
    calculate();
  }

  // 이벤트
  $("calcBtn").addEventListener("click", calculate);
  ["A", "B"].forEach(function (sfx) {
    document.querySelectorAll('input[name="cal' + sfx + '"]').forEach(function (r) { r.addEventListener("change", function () { onCalChange(sfx); }); });
    $("timeUnknown" + sfx).addEventListener("change", function () { $("time" + sfx).disabled = $("timeUnknown" + sfx).checked; });
    onCalChange(sfx);
  });
  $("copyBtn").addEventListener("click", function () { copyValue($("shareUrl").value, $("copyBtn")); });

  loadFromUrl();
})();
