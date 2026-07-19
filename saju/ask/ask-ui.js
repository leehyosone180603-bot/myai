/* ============================================================
 * 도깨비에게 물어보기 — UI
 * 사주 입력 + 주제 + 시점 → AskContent.analyze → 답변 렌더
 * ============================================================ */
(function () {
  "use strict";
  var S = window.Saju, L = window.SajuLunar, D = window.SajuDetail, DK = window.SajuDokkaebi, AC = window.AskContent;
  var $ = function (id) { return document.getElementById(id); };
  var state = { gender: "m", cal: "solar" };

  function fillBirth() {
    var y = ""; for (var yy = 2026; yy >= 1930; yy--) y += '<option value="' + yy + '">' + yy + "년</option>";
    $("selY").innerHTML = y; $("selY").value = "1990";
    var m = ""; for (var mm = 1; mm <= 12; mm++) m += '<option value="' + mm + '">' + mm + "월</option>";
    $("selM").innerHTML = m;
    var h = '<option value="x">시간 모름</option>';
    for (var hh = 0; hh < 24; hh++) { var ap = hh < 12 ? "오전" : "오후", h12 = hh % 12 === 0 ? 12 : hh % 12; h += '<option value="' + hh + '">' + ap + " " + h12 + "시</option>"; }
    $("selH").innerHTML = h;
    var mn = ""; for (var mi = 0; mi < 60; mi++) mn += '<option value="' + mi + '">' + mi + "분</option>"; $("selMin").innerHTML = mn;
    onHour(); updateDays();
  }
  function onHour() { $("selMin").disabled = ($("selH").value === "x"); }
  function updateDays() {
    var y = +$("selY").value, m = +$("selM").value, prev = $("selD").value;
    var n = state.cal === "lunar" ? 30 : new Date(y, m, 0).getDate();
    var d = ""; for (var dd = 1; dd <= n; dd++) d += '<option value="' + dd + '">' + dd + "일</option>";
    $("selD").innerHTML = d; if (prev && +prev <= n) $("selD").value = prev;
  }
  function fillTopic() {
    $("topic").innerHTML = AC.TOPICS.map(function (t) { return '<option value="' + t.key + '">' + t.label + "</option>"; }).join("");
    $("topic").value = "move";
  }
  function fillWhen() {
    var thisY = new Date().getFullYear();
    var y = ""; for (var yy = thisY; yy <= thisY + 10; yy++) y += '<option value="' + yy + '">' + yy + "년</option>";
    $("askY").innerHTML = y; $("askY").value = thisY;
    var m = '<option value="0">한 해 전체</option>';
    for (var mm = 1; mm <= 12; mm++) m += '<option value="' + mm + '">' + mm + "월</option>";
    $("askMon").innerHTML = m;
    var cur = new Date().getMonth() + 1; $("askMon").value = String(cur);
  }
  function initSegs() {
    document.querySelectorAll(".seg").forEach(function (seg) {
      var name = seg.getAttribute("data-name");
      seg.querySelectorAll("button").forEach(function (btn) {
        btn.addEventListener("click", function () {
          seg.querySelectorAll("button").forEach(function (b) { b.classList.remove("on"); });
          btn.classList.add("on"); state[name] = btn.getAttribute("data-v");
          if (name === "cal") onCal();
        });
      });
    });
  }
  function onCal() {
    var lunar = state.cal === "lunar";
    $("leapRow").style.display = lunar ? "inline-flex" : "none";
    $("hint").textContent = lunar ? "(음력 1900~2050)" : "(양력)";
    if (!lunar) $("leap").checked = false;
    updateDays();
  }

  function readPerson() {
    var y = +$("selY").value, m = +$("selM").value, d = +$("selD").value;
    var cal = state.cal, isLeap = $("leap").checked, sy = y, sm = m, sd = d;
    if (cal === "lunar") {
      if (y < L.minYear() || y > L.maxYear()) return { err: "음력은 " + L.minYear() + "~" + L.maxYear() + "년만 볼 수 있다." };
      var s = L.lunarToSolar(y, m, d, isLeap); if (!s) return { err: "그런 음력 날짜는 없다. 날짜·윤달을 다시 봐라." };
      sy = s.y; sm = s.m; sd = s.d;
    }
    var hv = $("selH").value, hourKnown = hv !== "x", hh = hourKnown ? +hv : 12, mm = hourKnown ? (+$("selMin").value || 0) : 0;
    var res = S.computeSaju(sy, sm, sd, hh, mm, { tzHours: 9, hourKnown: hourKnown, gender: state.gender });
    var nm = ($("name").value || "").trim();
    return { res: res, name: nm, y: y, m: m, d: d, hv: hv, mm: mm, cal: cal, isLeap: isLeap, hourKnown: hourKnown };
  }

  function shareUrl(P, topic, askY, askMon) {
    var p = new URLSearchParams();
    p.set("y", P.y); p.set("m", P.m); p.set("d", P.d); p.set("g", state.gender);
    if (P.name) p.set("n", P.name);
    p.set("h", P.hourKnown ? P.hv : "x"); if (P.hourKnown && P.mm) p.set("i", P.mm);
    if (P.cal === "lunar") { p.set("cal", "l"); if (P.isLeap) p.set("leap", "1"); }
    p.set("t", topic); p.set("qy", askY); p.set("qm", askMon);
    return location.origin + location.pathname + "?" + p.toString();
  }

  function calc() {
    $("errorMsg").textContent = "";
    var P = readPerson(); if (P.err) { $("errorMsg").textContent = P.err; return; }
    var topic = $("topic").value, askY = +$("askY").value, askMon = +$("askMon").value;
    var greg = askMon || null;
    var ans = AC.analyze(P.res, askY, greg, topic, { name: P.name });

    var topicLabel = AC.TOPICS.filter(function (t) { return t.key === topic; })[0].label;
    $("ansQ").textContent = (P.name ? P.name + "님 · " : "") + ans.when + " · " + topicLabel;
    var badge = $("ansBadge"); badge.textContent = ans.badge;
    badge.className = "ans-badge " + ans.verdict;
    $("ansGz").textContent = ans.row.ganKo + "(" + ans.row.ganHan + ") · " + ans.row.sipStem + " · " + ans.row.stage + " · " + ans.row.sinsal;
    $("ansBody").innerHTML = ans.blocks.map(function (b) {
      return '<div class="blk"><p class="bsub">' + b.s + "</p><p>" + b.t + "</p></div>";
    }).join("");
    $("shareUrl").value = shareUrl(P, topic, askY, askMon);
    $("resultArea").classList.remove("hidden");
    $("resultArea").scrollIntoView({ behavior: "smooth", block: "start" });
    if (window.gtag) { try { gtag("event", "ask_answer_view", { topic: topic, verdict: ans.verdict }); } catch (e) {} }
  }

  function copyText(t, btn) {
    var f = function () { btn.textContent = "복사됨"; setTimeout(function () { btn.textContent = "복사"; }, 1500); };
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(f).catch(function () {});
    else { var ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); f(); } catch (e) {} document.body.removeChild(ta); }
  }
  function setSeg(name, val) {
    var seg = document.querySelector('.seg[data-name="' + name + '"]'); if (!seg) return;
    seg.querySelectorAll("button").forEach(function (b) { var on = b.getAttribute("data-v") === val; b.classList.toggle("on", on); if (on) state[name] = val; });
  }
  function loadUrl() {
    var q = new URLSearchParams(location.search); if (!q.get("y")) return;
    if (q.get("cal") === "l") { setSeg("cal", "lunar"); if (q.get("leap") === "1") $("leap").checked = true; }
    if (q.get("g")) setSeg("gender", q.get("g"));
    onCal();
    $("selY").value = q.get("y"); $("selM").value = q.get("m"); updateDays(); $("selD").value = q.get("d");
    $("selH").value = q.get("h") || "x"; if (q.get("i")) $("selMin").value = q.get("i"); onHour();
    if (q.get("n")) $("name").value = q.get("n");
    if (q.get("t")) $("topic").value = q.get("t");
    if (q.get("qy")) $("askY").value = q.get("qy");
    if (q.get("qm") !== null && q.get("qm") !== undefined) $("askMon").value = q.get("qm");
    calc();
  }

  // init
  if (DK && DK.AVATAR_SVG) $("avatar").innerHTML = DK.AVATAR_SVG;
  initSegs(); fillBirth(); fillTopic(); fillWhen();
  $("selY").addEventListener("change", updateDays);
  $("selM").addEventListener("change", updateDays);
  $("selH").addEventListener("change", onHour);
  $("askBtn").addEventListener("click", calc);
  $("copyBtn").addEventListener("click", function () { copyText($("shareUrl").value, this); });
  loadUrl();
})();
