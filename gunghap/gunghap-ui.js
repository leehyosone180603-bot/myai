/* ============================================================
 * 도깨비 궁합 UI — 다크 컨셉, 20개 섹션 렌더
 * ============================================================ */
(function () {
  "use strict";
  var S = window.Saju, L = window.SajuLunar, D = window.SajuDetail, DK = window.SajuDokkaebi, GC = window.GunghapContent;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); };
  var state = { genderA: "m", genderB: "m", calA: "solar", calB: "solar" };

  function fillOne(sfx) {
    var y = "";
    for (var yy = 2026; yy >= 1930; yy--) y += '<option value="' + yy + '">' + yy + "년</option>";
    $("selY" + sfx).innerHTML = y; $("selY" + sfx).value = "1996";
    var m = ""; for (var mm = 1; mm <= 12; mm++) m += '<option value="' + mm + '">' + mm + "월</option>";
    $("selM" + sfx).innerHTML = m;
    var h = '<option value="x">시간 모름</option>';
    for (var hh = 0; hh < 24; hh++) { var ap = hh < 12 ? "오전" : "오후", h12 = hh % 12 === 0 ? 12 : hh % 12; h += '<option value="' + hh + '">' + ap + " " + h12 + "시</option>"; }
    $("selH" + sfx).innerHTML = h;
    var mn = ""; for (var mi = 0; mi < 60; mi++) mn += '<option value="' + mi + '">' + mi + "분</option>"; $("selMin" + sfx).innerHTML = mn;
    onHour(sfx); updateDays(sfx);
  }
  function onHour(sfx) { $("selMin" + sfx).disabled = ($("selH" + sfx).value === "x"); }
  function updateDays(sfx) {
    var y = +$("selY" + sfx).value, m = +$("selM" + sfx).value, prev = $("selD" + sfx).value;
    var n = state["cal" + sfx] === "lunar" ? 30 : new Date(y, m, 0).getDate();
    var d = ""; for (var dd = 1; dd <= n; dd++) d += '<option value="' + dd + '">' + dd + "일</option>";
    $("selD" + sfx).innerHTML = d; if (prev && +prev <= n) $("selD" + sfx).value = prev;
  }
  function initSegs() {
    document.querySelectorAll(".seg").forEach(function (seg) {
      var name = seg.getAttribute("data-name");
      seg.querySelectorAll("button").forEach(function (btn) {
        btn.addEventListener("click", function () {
          seg.querySelectorAll("button").forEach(function (b) { b.classList.remove("on"); });
          btn.classList.add("on"); state[name] = btn.getAttribute("data-v");
          if (name.indexOf("cal") === 0) { var sfx = name.slice(3); onCal(sfx); }
        });
      });
    });
  }
  function onCal(sfx) {
    var lunar = state["cal" + sfx] === "lunar";
    $("leapRow" + sfx).style.display = lunar ? "inline-flex" : "none";
    $("hint" + sfx).textContent = lunar ? "(음력 1900~2050)" : "(양력)";
    if (!lunar) $("leap" + sfx).checked = false;
    updateDays(sfx);
  }

  function readPerson(sfx) {
    var y = +$("selY" + sfx).value, m = +$("selM" + sfx).value, d = +$("selD" + sfx).value;
    var cal = state["cal" + sfx], isLeap = $("leap" + sfx).checked, sy = y, sm = m, sd = d;
    if (cal === "lunar") {
      if (y < L.minYear() || y > L.maxYear()) return { err: "음력은 " + L.minYear() + "~" + L.maxYear() + "년만 볼 수 있다." };
      var s = L.lunarToSolar(y, m, d, isLeap); if (!s) return { err: "그런 음력 날짜는 없다. 날짜·윤달을 다시 봐라." };
      sy = s.y; sm = s.m; sd = s.d;
    }
    var hv = $("selH" + sfx).value, hourKnown = hv !== "x", hh = hourKnown ? +hv : 12, mm = hourKnown ? (+$("selMin" + sfx).value || 0) : 0;
    var res = S.computeSaju(sy, sm, sd, hh, mm, { tzHours: 9, hourKnown: hourKnown, gender: state["gender" + sfx] });
    var nm = ($("name" + sfx).value || "").trim() || (sfx === "A" ? "A" : "B");
    return { res: res, name: nm, gender: state["gender" + sfx], y: y, m: m, d: d, hv: hv, mm: mm, cal: cal, isLeap: isLeap, hourKnown: hourKnown };
  }

  function miniGrid(res) {
    var order = ["year", "month", "day", "hour"], lab = ["년", "월", "일", "시"], h = "";
    order.forEach(function (k, i) {
      var p = res.pillars[k];
      if (!p) { h += '<div class="c"><div class="l">' + lab[i] + '</div><div class="h">?</div><div class="h">?</div></div>'; return; }
      h += '<div class="c"><div class="l">' + lab[i] + '</div><div class="h">' + D.GAN[p.stem] + '</div><div class="h">' + D.JI[p.branch] + '</div></div>';
    });
    return h;
  }

  function shareUrl(A, B) {
    var p = new URLSearchParams();
    function put(sfx, P) {
      p.set("y" + sfx, P.y); p.set("m" + sfx, P.m); p.set("d" + sfx, P.d);
      p.set("g" + sfx, P.gender); if (P.name !== "A" && P.name !== "B") p.set("n" + sfx, P.name);
      p.set("h" + sfx, P.hourKnown ? P.hv : "x"); if (P.hourKnown && P.mm) p.set("i" + sfx, P.mm);
      if (P.cal === "lunar") { p.set("c" + sfx, "l"); if (P.isLeap) p.set("l" + sfx, "1"); }
    }
    put("a", A); put("b", B);
    return location.origin + location.pathname + "?" + p.toString();
  }

  function calc() {
    $("errorMsg").textContent = "";
    var A = readPerson("A"); if (A.err) { $("errorMsg").textContent = A.err; return; }
    var B = readPerson("B"); if (B.err) { $("errorMsg").textContent = B.err; return; }
    var ctx = { thisYear: new Date().getFullYear() };
    var r = GC.analyze({ res: A.res, name: A.name, gender: A.gender, m: A.m, d: A.d },
                       { res: B.res, name: B.name, gender: B.gender, m: B.m, d: B.d }, ctx);

    $("scoreNum").textContent = r.score; $("scoreTier").textContent = r.tier;
    $("pairLine").textContent = A.name + "  ×  " + B.name;
    $("gridA").innerHTML = miniGrid(A.res); $("gridB").innerHTML = miniGrid(B.res);
    $("nameA2").textContent = A.name + " · " + D.GAN_KO[A.res.dayMaster] + "(" + D.OHENG_KO[[0,0,1,1,2,2,3,3,4,4][A.res.dayMaster]] + ")";
    $("nameB2").textContent = B.name + " · " + D.GAN_KO[B.res.dayMaster] + "(" + D.OHENG_KO[[0,0,1,1,2,2,3,3,4,4][B.res.dayMaster]] + ")";

    var toc = '<div class="toc">' + r.sections.map(function (s, i) {
      return '<a href="#g' + i + '"><span class="hj">' + s.hanja + '</span><span>' + esc(s.title) + '</span></a>';
    }).join("") + "</div>";
    var body = r.sections.map(function (s, i) {
      var blocks = (s.blocks || []).map(function (b) {
        return '<div class="blk"><p class="bsub">' + esc(b.s) + '</p><p>' + b.t + "</p></div>";
      }).join("");
      var lead = s.lead ? '<p class="sec-lead">' + s.lead + "</p>" : (s.body ? '<p>' + s.body + "</p>" : "");
      return '<section class="sec" id="g' + i + '"><div class="sec-head"><span class="sec-hj">' + s.hanja + '</span><span class="sec-t">' + esc(s.title) + "</span></div>" + lead + blocks + "</section>";
    }).join("");
    $("content").innerHTML = toc + body;

    $("shareUrl").value = shareUrl(A, B);
    $("resultArea").classList.remove("hidden");
    $("resultArea").scrollIntoView({ behavior: "smooth", block: "start" });
    if (window.gtag) { try { gtag("event", "gunghap_result_view", { score: r.score }); } catch (e) {} }
  }

  function copyText(t, btn) {
    var f = function () { btn.textContent = "복사됨"; setTimeout(function () { btn.textContent = "복사"; }, 1500); };
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(f).catch(function () {});
    else { var ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); f(); } catch (e) {} document.body.removeChild(ta); }
  }

  function loadUrl() {
    var q = new URLSearchParams(location.search); if (!q.get("ya") || !q.get("yb")) return;
    ["a", "b"].forEach(function (sfx) {
      var U = sfx.toUpperCase();
      if (q.get("c" + sfx) === "l") { setSeg("cal" + U, "lunar"); if (q.get("l" + sfx) === "1") $("leap" + U).checked = true; }
      if (q.get("g" + sfx)) setSeg("gender" + U, q.get("g" + sfx));
      onCal(U);
      $("selY" + U).value = q.get("y" + sfx); $("selM" + U).value = q.get("m" + sfx); updateDays(U); $("selD" + U).value = q.get("d" + sfx);
      $("selH" + U).value = q.get("h" + sfx) || "x"; if (q.get("i" + sfx)) $("selMin" + U).value = q.get("i" + sfx); onHour(U);
      if (q.get("n" + sfx)) $("name" + U).value = q.get("n" + sfx);
    });
    calc();
  }
  function setSeg(name, val) {
    var seg = document.querySelector('.seg[data-name="' + name + '"]'); if (!seg) return;
    seg.querySelectorAll("button").forEach(function (b) { var on = b.getAttribute("data-v") === val; b.classList.toggle("on", on); if (on) state[name] = val; });
  }

  // init
  if (DK && DK.AVATAR_SVG) $("avatar").innerHTML = DK.AVATAR_SVG;
  initSegs(); fillOne("A"); fillOne("B");
  ["A", "B"].forEach(function (sfx) {
    $("selY" + sfx).addEventListener("change", function () { updateDays(sfx); });
    $("selM" + sfx).addEventListener("change", function () { updateDays(sfx); });
    $("selH" + sfx).addEventListener("change", function () { onHour(sfx); });
  });
  $("calcBtn").addEventListener("click", function () { if (window.gtag) { try { gtag("event", "gunghap_calc_click"); } catch (e) {} } calc(); });
  $("copyBtn").addEventListener("click", function () { copyText($("shareUrl").value, this); });
  loadUrl();
})();
