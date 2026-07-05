/* ============================================================
 * 사주 계산기 UI — calcbox.kr
 * 입력 → Saju 엔진 호출 → 무료 결과 렌더 + 공유 링크
 * ============================================================ */
(function () {
  "use strict";

  var S = window.Saju, D = window.SajuData;
  var $ = function (id) { return document.getElementById(id); };

  var els = {
    date: $("birthDate"), time: $("birthTime"), timeUnknown: $("timeUnknown"),
    trueSolar: $("trueSolar"), err: $("errorMsg"), calc: $("calcBtn"),
    results: $("resultsCard"), dmCard: $("dmCard"), ohengCard: $("ohengCard"),
    shareCard: $("shareCard"), lockedCard: $("lockedCard"),
    grid: $("sajuGrid"), birthEcho: $("birthEcho"),
    dmChar: $("dmChar"), dmEl: $("dmEl"), dmLine: $("dmLine"), dmChips: $("dmChips"), dmDesc: $("dmDesc"),
    ohengBars: $("ohengBars"), ohengComment: $("ohengComment"),
    yyBar: $("yyBar"), yyComment: $("yyComment"),
    shareUrl: $("shareUrl"), copyBtn: $("copyBtn"),
    lockedGrid: $("lockedGrid"), daeunDir: $("daeunDir")
  };

  var PILLAR_LABELS = { year: "년주(年)", month: "월주(月)", day: "일주(日)", hour: "시주(時)" };
  var ORDER = ["year", "month", "day", "hour"];

  function ohengColor(idx) { return D.OHENG[idx].color; }

  // 진태양시 보정: 표준시에서 약 30분 차감(동경 127.5° 근사)
  function applyTrueSolar(y, m, d, hh, mm) {
    var dt = new Date(y, m - 1, d, hh, mm);
    dt.setMinutes(dt.getMinutes() - 30);
    return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate(), h: dt.getHours(), min: dt.getMinutes() };
  }

  function getGender() {
    var r = document.querySelector('input[name="gender"]:checked');
    return r ? r.value : "m";
  }

  function renderGrid(res) {
    els.grid.innerHTML = "";
    ORDER.forEach(function (k) {
      var p = res.pillars[k];
      var col = document.createElement("div");
      col.className = "pillar";
      var label = '<div class="pillar-label">' + PILLAR_LABELS[k] + "</div>";
      var cells;
      if (!p) {
        cells = '<div class="gz-cell"><div class="gz-han">?</div><div class="gz-ko">미상</div></div>' +
                '<div class="gz-cell"><div class="gz-han">?</div><div class="gz-ko">미상</div></div>';
      } else {
        var stemColor = ohengColor(S.GAN_OHENG[p.stem]);
        var branchColor = ohengColor(S.JI_OHENG[p.branch]);
        var dmClass = (k === "day") ? " dm" : "";
        cells =
          '<div class="gz-cell' + dmClass + '"><div class="gz-han" style="color:' + stemColor + '">' + S.GAN[p.stem] +
            '</div><div class="gz-ko">' + S.GAN_KO[p.stem] + " · " + D.OHENG[S.GAN_OHENG[p.stem]].ko + "</div></div>" +
          '<div class="gz-cell"><div class="gz-han" style="color:' + branchColor + '">' + S.JI[p.branch] +
            '</div><div class="gz-ko">' + S.JI_KO[p.branch] + " · " + D.OHENG[S.JI_OHENG[p.branch]].ko + "</div></div>";
      }
      col.innerHTML = label + cells;
      els.grid.appendChild(col);
    });
  }

  function renderDayMaster(res) {
    var dm = D.DAY_MASTER[res.dayMaster];
    els.dmChar.textContent = S.GAN[res.dayMaster];
    els.dmChar.style.color = ohengColor(S.GAN_OHENG[res.dayMaster]);
    els.dmEl.textContent = "일간(日干) " + S.GAN_KO[res.dayMaster] + " · " + dm.element + " · " + dm.symbol;
    els.dmLine.textContent = "“" + dm.line + "”";
    els.dmChips.innerHTML = "";
    dm.keywords.forEach(function (kw) {
      var c = document.createElement("span"); c.className = "chip"; c.textContent = "#" + kw;
      els.dmChips.appendChild(c);
    });
    els.dmDesc.textContent = dm.desc;
  }

  function renderOheng(res) {
    var total = res.oheng.reduce(function (a, b) { return a + b; }, 0) || 1;
    var max = Math.max.apply(null, res.oheng) || 1;
    els.ohengBars.innerHTML = "";
    D.OHENG.forEach(function (o, i) {
      var cnt = res.oheng[i];
      var row = document.createElement("div"); row.className = "oheng-row";
      row.innerHTML =
        '<div class="oheng-name" style="color:' + o.color + '">' + o.ko + "</div>" +
        '<div class="oheng-track"><div class="oheng-fill" style="width:' + (cnt / max * 100) + "%;background:" + o.color + '"></div></div>' +
        '<div class="oheng-cnt">' + cnt + "</div>";
      els.ohengBars.appendChild(row);
    });
    els.ohengComment.textContent = D.ohengComment(res.oheng);

    var yang = res.yinYang.yang, yin = res.yinYang.yin, t = yang + yin || 1;
    els.yyBar.innerHTML =
      '<div class="yy-seg yy-yang" style="flex:' + yang + '">' + (yang ? "양 " + yang : "") + "</div>" +
      '<div class="yy-seg yy-yin" style="flex:' + yin + '">' + (yin ? "음 " + yin : "") + "</div>";
    els.yyComment.textContent = D.yinYangComment(yang, yin);
  }

  function renderLocked(res, gender) {
    // 대운 방향(양남음녀 순행) — 무료 티저
    var yearStemYang = (res.pillars.year.stem % 2 === 0);
    var forward = (yearStemYang && gender === "m") || (!yearStemYang && gender === "f");
    els.daeunDir.textContent = "당신의 대운은 " + (forward ? "순행(順行)" : "역행(逆行)") +
      " 합니다. 구체적인 대운 간지·대운수와 시기별 풀이는 상세 풀이에서 확인할 수 있어요.";

    els.lockedGrid.innerHTML = "";
    D.LOCKED_ITEMS.forEach(function (it) {
      var card = document.createElement("div"); card.className = "locked-card";
      card.innerHTML =
        '<div class="lc-icon">' + it.icon + "</div>" +
        '<div class="lc-body"><strong>' + it.title + "</strong>" +
        '<div class="lc-teaser">' + it.teaser + "</div></div>" +
        '<div class="lc-lock">🔒</div>';
      els.lockedGrid.appendChild(card);
    });
  }

  function show(res, input) {
    renderGrid(res);
    var echo = input.dateStr + " · " + (input.hourKnown ? input.timeStr : "시간 미상") +
      " · " + (input.gender === "m" ? "남성" : "여성") + (input.trueSolar ? " · 진태양시" : "");
    els.birthEcho.textContent = echo;
    renderDayMaster(res);
    renderOheng(res);
    renderLocked(res, input.gender);

    [els.results, els.dmCard, els.ohengCard, els.shareCard, els.lockedCard].forEach(function (c) { c.hidden = false; });

    // 공유 링크
    var params = new URLSearchParams();
    params.set("d", input.dateStr);
    if (input.hourKnown) params.set("t", input.timeStr); else params.set("t", "x");
    params.set("g", input.gender);
    if (input.trueSolar) params.set("ts", "1");
    els.shareUrl.value = location.origin + location.pathname + "?" + params.toString();
  }

  function calculate() {
    els.err.textContent = "";
    var dateStr = els.date.value;
    if (!dateStr) { els.err.textContent = "생년월일을 입력해 주세요."; return; }
    var parts = dateStr.split("-").map(Number);
    var y = parts[0], m = parts[1], d = parts[2];
    if (!y || y < 1900 || y > 2100) { els.err.textContent = "1900~2100년 사이 날짜를 입력해 주세요."; return; }

    var hourKnown = !els.timeUnknown.checked;
    var timeStr = els.time.value || "12:00";
    var hh = 12, mm = 0;
    if (hourKnown) {
      var tp = timeStr.split(":").map(Number);
      hh = tp[0]; mm = tp[1] || 0;
    }

    var useTrueSolar = els.trueSolar.checked && hourKnown;
    var cy = y, cm = m, cd = d, ch = hh, cmin = mm;
    if (useTrueSolar) {
      var adj = applyTrueSolar(y, m, d, hh, mm);
      cy = adj.y; cm = adj.m; cd = adj.d; ch = adj.h; cmin = adj.min;
    }

    var res = S.computeSaju(cy, cm, cd, ch, cmin, { tzHours: 9, hourKnown: hourKnown });
    var gender = getGender();

    show(res, {
      dateStr: dateStr, timeStr: timeStr, hourKnown: hourKnown,
      gender: gender, trueSolar: useTrueSolar
    });
  }

  // URL 파라미터로 자동 계산(공유 링크)
  function loadFromUrl() {
    var q = new URLSearchParams(location.search);
    var d = q.get("d");
    if (!d) return;
    els.date.value = d;
    var t = q.get("t");
    if (t === "x") {
      els.timeUnknown.checked = true;
    } else if (t) {
      els.time.value = t;
    }
    var g = q.get("g");
    if (g === "f") { var rf = document.querySelector('input[name="gender"][value="f"]'); if (rf) rf.checked = true; }
    if (q.get("ts") === "1") els.trueSolar.checked = true;
    calculate();
  }

  els.calc.addEventListener("click", calculate);
  els.timeUnknown.addEventListener("change", function () {
    els.time.disabled = els.timeUnknown.checked;
  });
  els.copyBtn.addEventListener("click", function () {
    els.shareUrl.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) {}
    if (navigator.clipboard) {
      navigator.clipboard.writeText(els.shareUrl.value).then(function () {
        els.copyBtn.textContent = "복사됨!";
        setTimeout(function () { els.copyBtn.textContent = "복사"; }, 1500);
      }).catch(function () {});
    } else if (ok) {
      els.copyBtn.textContent = "복사됨!";
      setTimeout(function () { els.copyBtn.textContent = "복사"; }, 1500);
    }
  });

  loadFromUrl();
})();
