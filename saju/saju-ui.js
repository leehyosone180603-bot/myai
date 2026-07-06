/* ============================================================
 * 사주 계산기 UI — calcbox.kr
 * 입력(양력/음력) → Saju 엔진 → 무료 결과(상세 보기 / 텍스트 공유 탭)
 * ============================================================ */
(function () {
  "use strict";

  var S = window.Saju, D = window.SajuData, L = window.SajuLunar;
  var $ = function (id) { return document.getElementById(id); };

  var els = {
    date: $("birthDate"), time: $("birthTime"), timeUnknown: $("timeUnknown"),
    isLeap: $("isLeap"), leapRow: $("leapRow"), dateHint: $("dateHint"), lunarRange: $("lunarRange"),
    trueSolar: $("trueSolar"), err: $("errorMsg"), calc: $("calcBtn"),
    resultTabs: $("resultTabs"), tabDetail: $("tabDetail"), tabText: $("tabText"),
    results: $("resultsCard"), dmCard: $("dmCard"), qaCard: $("qaCard"), qaList: $("qaList"),
    daeunCard: $("daeunCard"), daeunHead: $("daeunHead"), daeunList: $("daeunList"),
    ohengCard: $("ohengCard"), shareCard: $("shareCard"), lockedCard: $("lockedCard"),
    grid: $("sajuGrid"), birthEcho: $("birthEcho"),
    dmChar: $("dmChar"), dmEl: $("dmEl"), dmLine: $("dmLine"), dmChips: $("dmChips"), dmDesc: $("dmDesc"),
    ohengBars: $("ohengBars"), ohengComment: $("ohengComment"),
    yyBar: $("yyBar"), yyComment: $("yyComment"),
    shareUrl: $("shareUrl"), copyBtn: $("copyBtn"),
    lockedGrid: $("lockedGrid"),
    summaryText: $("summaryText"), copyTextBtn: $("copyTextBtn"), copyLinkBtn2: $("copyLinkBtn2")
  };

  var PILLAR_LABELS = { year: "년주(年)", month: "월주(月)", day: "일주(日)", hour: "시주(時)" };
  var ORDER = ["year", "month", "day", "hour"];

  function ohengColor(i) { return D.OHENG[i].color; }
  function getRadio(name, def) { var r = document.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : def; }

  function applyTrueSolar(y, m, d, hh, mm) {
    var dt = new Date(y, m - 1, d, hh, mm);
    dt.setMinutes(dt.getMinutes() - 30);
    return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate(), h: dt.getHours(), min: dt.getMinutes() };
  }

  /* ---- 달력 종류 UI ---- */
  function onCalTypeChange() {
    var lunar = getRadio("calType", "solar") === "lunar";
    els.leapRow.style.display = lunar ? "flex" : "none";
    els.lunarRange.style.display = lunar ? "block" : "none";
    els.dateHint.textContent = lunar ? "(음력 · 1900~2050)" : "(양력)";
    els.date.min = "1900-01-01";
    els.date.max = lunar ? "2050-12-31" : "2100-12-31";
    if (!lunar) els.isLeap.checked = false;
  }

  /* ---- 렌더 ---- */
  function renderGrid(res) {
    els.grid.innerHTML = "";
    ORDER.forEach(function (k) {
      var p = res.pillars[k];
      var col = document.createElement("div"); col.className = "pillar";
      var label = '<div class="pillar-label">' + PILLAR_LABELS[k] + "</div>";
      var cells;
      if (!p) {
        cells = '<div class="gz-cell"><div class="gz-han">?</div><div class="gz-ko">미상</div></div>' +
                '<div class="gz-cell"><div class="gz-han">?</div><div class="gz-ko">미상</div></div>';
      } else {
        var sc = ohengColor(S.GAN_OHENG[p.stem]), bc = ohengColor(S.JI_OHENG[p.branch]);
        var dm = (k === "day") ? " dm" : "";
        cells =
          '<div class="gz-cell' + dm + '"><div class="gz-han" style="color:' + sc + '">' + S.GAN[p.stem] +
            '</div><div class="gz-ko">' + S.GAN_KO[p.stem] + " · " + D.OHENG[S.GAN_OHENG[p.stem]].ko + "</div></div>" +
          '<div class="gz-cell"><div class="gz-han" style="color:' + bc + '">' + S.JI[p.branch] +
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
      var c = document.createElement("span"); c.className = "chip"; c.textContent = "#" + kw; els.dmChips.appendChild(c);
    });
    els.dmDesc.textContent = dm.desc;
  }

  function renderQA(res) {
    var answers = D.buildAnswers(res);
    els.qaList.innerHTML = "";
    D.FIVE_Q.forEach(function (item, i) {
      var div = document.createElement("div"); div.className = "qa-item";
      div.innerHTML =
        '<p class="qa-q"><span class="qa-ic">' + item.icon + '</span><span>' + item.q + "</span></p>" +
        '<p class="qa-a">' + answers[i] + "</p>";
      els.qaList.appendChild(div);
    });
    return answers;
  }

  function renderOheng(res) {
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
    var yang = res.yinYang.yang, yin = res.yinYang.yin;
    els.yyBar.innerHTML =
      '<div class="yy-seg yy-yang" style="flex:' + yang + '">' + (yang ? "양 " + yang : "") + "</div>" +
      '<div class="yy-seg yy-yin" style="flex:' + yin + '">' + (yin ? "음 " + yin : "") + "</div>";
    els.yyComment.textContent = D.yinYangComment(yang, yin);
  }

  function renderDaeun(res) {
    var dd = D.daeunDecades(res);
    if (!dd) { els.daeunCard.hidden = true; return null; }
    els.daeunHead.innerHTML = "대운 방향 <strong>" + (dd.forward ? "순행(順行)" : "역행(逆行)") +
      "</strong> · 대운수 <strong>" + dd.num + "세</strong> 시작 · <span class=\"strength-pill\">" + dd.strengthLabel + "</span><br>" +
      "<span style=\"font-size:.85rem;\">" + dd.strengthGloss + "</span>";
    els.daeunList.innerHTML = "";
    dd.rows.forEach(function (r) {
      var div = document.createElement("div"); div.className = "daeun-row";
      div.innerHTML =
        '<div class="daeun-dec">' + r.decade + "</div>" +
        '<div class="daeun-body">' +
          '<div class="daeun-top">' +
            '<span class="daeun-gan">' + r.ganKo + "(" + r.ganHan + ") · " + r.tenGodLabel + "</span>" +
            '<span class="luck-badge ' + r.luck + '">' + r.luckLabel + "</span>" +
            '<span class="daeun-age">' + r.ageRange + "</span>" +
          "</div>" +
          '<p class="daeun-text">' + r.text + "</p>" +
        "</div>";
      els.daeunList.appendChild(div);
    });
    return dd;
  }

  function renderLocked(res, gender) {
    els.lockedGrid.innerHTML = "";
    D.LOCKED_ITEMS.forEach(function (it) {
      var card = document.createElement("div"); card.className = "locked-card";
      card.innerHTML = '<div class="lc-icon">' + it.icon + "</div>" +
        '<div class="lc-body"><strong>' + it.title + "</strong><div class=\"lc-teaser\">" + it.teaser + "</div></div>" +
        '<div class="lc-lock">🔒</div>';
      els.lockedGrid.appendChild(card);
    });
  }

  /* ---- 텍스트 요약 ---- */
  function pillarsLine(res) {
    var s = [];
    ["year", "month", "day", "hour"].forEach(function (k, i) {
      var lab = ["년", "월", "일", "시"][i], p = res.pillars[k];
      s.push(lab + " " + (p ? S.ganjaHan(p.stem, p.branch) + "(" + S.ganjaKo(p.stem, p.branch) + ")" : "미상"));
    });
    return s.join(" · ");
  }

  function buildSummary(res, input, answers, shareUrl) {
    var dm = D.DAY_MASTER[res.dayMaster];
    var strong = [], missing = [];
    for (var i = 0; i < 5; i++) {
      if (res.oheng[i] === Math.max.apply(null, res.oheng) && res.oheng[i] > 0) strong.push(D.OHENG[i].ko);
      if (res.oheng[i] === 0) missing.push(D.OHENG[i].ko);
    }
    var lines = [];
    lines.push("[내 사주 요약]");
    lines.push("· 생년월일시: " + input.dateLabel + (input.hourKnown ? " " + input.timeStr : " (시간 미상)") + " · " + (input.gender === "m" ? "남성" : "여성"));
    lines.push("· 사주팔자: " + pillarsLine(res));
    lines.push("· 일간(나): " + S.GAN[res.dayMaster] + "(" + S.GAN_KO[res.dayMaster] + ") — " + dm.element + " · " + dm.symbol);
    lines.push("  “" + dm.line + "”");
    lines.push("· 오행: 목" + res.oheng[0] + " 화" + res.oheng[1] + " 토" + res.oheng[2] + " 금" + res.oheng[3] + " 수" + res.oheng[4] +
      "  (강한 기운: " + (strong.join("·") || "-") + (missing.length ? " / 없는 기운: " + missing.join("·") : "") + ")");
    lines.push("· 음양: 양" + res.yinYang.yang + " · 음" + res.yinYang.yin);
    lines.push("");
    lines.push("[사주로 보는 나 · 5문답]");
    D.FIVE_Q.forEach(function (q, i) {
      lines.push(q.icon + " " + q.q);
      lines.push("→ " + answers[i]);
    });
    var dd = D.daeunDecades(res);
    if (dd) {
      lines.push("");
      lines.push("[연령대별 인생 흐름 · 대운] (" + (dd.forward ? "순행" : "역행") + " · " + dd.num + "세 시작 · " + dd.strengthLabel + ")");
      dd.rows.forEach(function (r) {
        lines.push("· " + r.decade + " (" + r.ganKo + "·" + r.tenGodLabel.split(" ")[0] + ") [" + r.luckLabel + "] — " + r.text);
      });
    }
    lines.push("");
    lines.push("▶ 사주팔자 표와 자세한 풀이는 여기서 확인하세요:");
    lines.push(shareUrl);
    return lines.join("\n");
  }

  /* ---- 공유 URL ---- */
  function buildShareUrl(input) {
    var p = new URLSearchParams();
    p.set("d", input.dateStr);
    p.set("t", input.hourKnown ? input.timeStr : "x");
    p.set("g", input.gender);
    if (input.calType === "lunar") { p.set("cal", "l"); if (input.isLeap) p.set("leap", "1"); }
    if (input.trueSolar) p.set("ts", "1");
    return location.origin + location.pathname + "?" + p.toString();
  }

  function show(res, input) {
    renderGrid(res);
    els.birthEcho.textContent = input.dateLabel + " · " +
      (input.hourKnown ? input.timeStr : "시간 미상") + " · " +
      (input.gender === "m" ? "남성" : "여성") + (input.trueSolar ? " · 진태양시" : "");
    renderDayMaster(res);
    var answers = renderQA(res);
    var dd = renderDaeun(res);
    renderOheng(res);
    renderLocked(res, input.gender);

    var shareUrl = buildShareUrl(input);
    els.shareUrl.value = shareUrl;
    els.summaryText.value = buildSummary(res, input, answers, shareUrl);

    els.resultTabs.hidden = false;
    els.daeunCard.hidden = !dd;
    [els.results, els.dmCard, els.qaCard, els.ohengCard, els.shareCard, els.lockedCard]
      .forEach(function (c) { c.hidden = false; });
  }

  /* ---- 계산 ---- */
  function calculate() {
    els.err.textContent = "";
    var dateStr = els.date.value;
    if (!dateStr) { els.err.textContent = "생년월일을 입력해 주세요."; return; }
    var pr = dateStr.split("-").map(Number);
    var y = pr[0], m = pr[1], d = pr[2];

    var calType = getRadio("calType", "solar");
    var isLeap = els.isLeap.checked;
    var dateLabel, sy = y, sm = m, sd = d;

    if (calType === "lunar") {
      if (y < L.minYear() || y > L.maxYear()) { els.err.textContent = "음력은 " + L.minYear() + "~" + L.maxYear() + "년만 지원합니다."; return; }
      var solar = L.lunarToSolar(y, m, d, isLeap);
      if (!solar) { els.err.textContent = "존재하지 않는 음력 날짜입니다. (날짜 또는 윤달 여부를 확인하세요)"; return; }
      sy = solar.y; sm = solar.m; sd = solar.d;
      dateLabel = y + "년 " + m + "월 " + d + "일 (음력" + (isLeap ? " 윤달" : "") + " → 양력 " + sy + "-" + String(sm).padStart(2, "0") + "-" + String(sd).padStart(2, "0") + ")";
    } else {
      if (y < 1900 || y > 2100) { els.err.textContent = "1900~2100년 사이 날짜를 입력해 주세요."; return; }
      dateLabel = y + "년 " + String(m).padStart(2, "0") + "월 " + String(d).padStart(2, "0") + "일 (양력)";
    }

    var hourKnown = !els.timeUnknown.checked;
    var timeStr = els.time.value || "12:00";
    var hh = 12, mm = 0;
    if (hourKnown) { var tp = timeStr.split(":").map(Number); hh = tp[0]; mm = tp[1] || 0; }

    var useTrueSolar = els.trueSolar.checked && hourKnown;
    var cy = sy, cm = sm, cd = sd, ch = hh, cmin = mm;
    if (useTrueSolar) { var a = applyTrueSolar(sy, sm, sd, hh, mm); cy = a.y; cm = a.m; cd = a.d; ch = a.h; cmin = a.min; }

    var gender = getRadio("gender", "m");
    var res = S.computeSaju(cy, cm, cd, ch, cmin, { tzHours: 9, hourKnown: hourKnown, gender: gender });

    show(res, {
      dateStr: dateStr, dateLabel: dateLabel, timeStr: timeStr, hourKnown: hourKnown,
      gender: gender, trueSolar: useTrueSolar, calType: calType, isLeap: isLeap
    });
  }

  /* ---- 탭 전환 ---- */
  function switchTab(name) {
    els.tabDetail.hidden = (name !== "detail");
    els.tabText.hidden = (name !== "text");
    document.querySelectorAll(".rtab").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-tab") === name);
    });
  }

  /* ---- 복사 ---- */
  function copyValue(text, btn, okLabel) {
    var orig = btn.textContent;
    function done() { btn.textContent = okLabel; setTimeout(function () { btn.textContent = orig; }, 1500); }
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done).catch(function () {});
    else {
      var ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); done(); } catch (e) {}
      document.body.removeChild(ta);
    }
  }

  /* ---- URL 자동 계산 ---- */
  function loadFromUrl() {
    var q = new URLSearchParams(location.search);
    var d = q.get("d");
    if (!d) return;
    if (q.get("cal") === "l") {
      var rl = document.querySelector('input[name="calType"][value="lunar"]'); if (rl) rl.checked = true;
      if (q.get("leap") === "1") els.isLeap.checked = true;
    }
    onCalTypeChange();
    els.date.value = d;
    var t = q.get("t");
    if (t === "x") els.timeUnknown.checked = true; else if (t) els.time.value = t;
    els.time.disabled = els.timeUnknown.checked;
    if (q.get("g") === "f") { var rf = document.querySelector('input[name="gender"][value="f"]'); if (rf) rf.checked = true; }
    if (q.get("ts") === "1") els.trueSolar.checked = true;
    calculate();
  }

  /* ---- 이벤트 ---- */
  els.calc.addEventListener("click", calculate);
  els.timeUnknown.addEventListener("change", function () { els.time.disabled = els.timeUnknown.checked; });
  document.querySelectorAll('input[name="calType"]').forEach(function (r) { r.addEventListener("change", onCalTypeChange); });
  document.querySelectorAll(".rtab").forEach(function (b) {
    b.addEventListener("click", function () { switchTab(b.getAttribute("data-tab")); });
  });
  els.copyBtn.addEventListener("click", function () { copyValue(els.shareUrl.value, els.copyBtn, "복사됨!"); });
  els.copyTextBtn.addEventListener("click", function () { copyValue(els.summaryText.value, els.copyTextBtn, "복사됨!"); });
  els.copyLinkBtn2.addEventListener("click", function () { copyValue(els.shareUrl.value, els.copyLinkBtn2, "복사됨!"); });

  onCalTypeChange();
  loadFromUrl();
})();
