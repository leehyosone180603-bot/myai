/* ============================================================
 * 도깨비 사주 상세풀이 — 렌더러
 * URL 파라미터(y,m,d,g,love,h,cal,leap) → 상세 결과 렌더
 * ============================================================ */
(function () {
  "use strict";
  var S = window.Saju, L = window.SajuLunar, DT = window.SajuDetail, DC = window.DetailContent;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); };

  // 生靈 설화(고정)
  var SAENGRYEONG_TALE =
    "생령(生靈)이란 살아 있는 사람의 혼이 몸에서 빠져나와 남에게 붙는 걸 말한다. 조선 시대, 한 사람을 향한 원한이나 집착이 너무 깊으면 그 혼이 밤마다 몸을 빠져나와 상대에게 씌었다 한다. 도깨비가 보기엔, 네게 붙은 건 남의 것이 아니라 네 안의 못다 푼 마음이다. 이걸 원귀로 여겨 떼어내려고만 하면 평생 시달리고, 정체를 알고 다스리면 오히려 남들 없는 힘이 된다.";

  function parse() {
    var q = new URLSearchParams(location.search);
    if (!q.get("y")) return null;
    var y = +q.get("y"), m = +q.get("m"), d = +q.get("d");
    var cal = q.get("cal") === "l" ? "lunar" : "solar", leap = q.get("leap") === "1";
    var sy = y, sm = m, sd = d;
    if (cal === "lunar") { var s = L.lunarToSolar(y, m, d, leap); if (s) { sy = s.y; sm = s.m; sd = s.d; } }
    var hv = q.get("h"), hourKnown = hv && hv !== "x";
    var hh = hourKnown ? +hv : 12;
    return {
      y: y, m: m, d: d, sy: sy, sm: sm, sd: sd, cal: cal, leap: leap,
      gender: q.get("g") || "m", love: q.get("love") || "", hourKnown: hourKnown, hh: hh
    };
  }

  function paljaStrip(res) {
    var order = ["year", "month", "day", "hour"], lab = ["년주", "월주", "일주", "시주"], html = "";
    order.forEach(function (k, i) {
      var p = res.pillars[k];
      if (!p) { html += '<div class="pcell"><div class="l">' + lab[i] + '</div><div class="h">?</div><div class="s">미상</div></div>'; return; }
      var st = (k === "day") ? "일간" : DT.tenGodStem(res.dayMaster, p.stem);
      var bt = DT.tenGodBranch(res.dayMaster, p.branch);
      html += '<div class="pcell"><div class="l">' + lab[i] + '</div><div class="h">' + DT.GAN[p.stem] + DT.JI[p.branch] +
        '</div><div class="s">' + st + "·" + bt + "</div></div>";
    });
    $("paljaStrip").innerHTML = html;
  }

  function summaryCard(res, yong) {
    var tbl = DT.tenGodTable(res), shin = DT.computeShinsal(res);
    var sip = tbl.filter(function (r) { return !r.empty; }).map(function (r) { return r.ganHan + " " + r.stemSip + "·" + r.branchSip; });
    var stages = tbl.filter(function (r) { return !r.empty; }).map(function (r) { return r.stage; });
    var uniqStage = stages.filter(function (v, i) { return stages.indexOf(v) === i; });
    function chips(arr, cls) { return arr.map(function (t) { return '<span class="chip ' + (cls || "") + '">' + esc(t) + "</span>"; }).join(""); }
    var gwiin = shin.filter(function (s) { return s.good; }), bad = shin.filter(function (s) { return !s.good; });
    var html = '<h2>魂 니 사주 해석 카드</h2>';
    html += '<div class="sum-row"><div class="cat">십성 (성향의 뼈대)</div><div class="chips">' + chips(sip) + "</div></div>";
    html += '<div class="sum-row"><div class="cat">십이운성 (기운의 강약)</div><div class="chips">' + chips(uniqStage) + "</div></div>";
    if (gwiin.length) html += '<div class="sum-row"><div class="cat">귀인 (돕는 기운)</div><div class="chips">' + chips(gwiin.map(function (s) { return s.key; }), "good") + "</div></div>";
    if (bad.length) html += '<div class="sum-row"><div class="cat">신살 (조심할 기운)</div><div class="chips">' + chips(bad.map(function (s) { return s.key; }), "bad") + "</div></div>";
    html += '<div class="sum-row"><div class="cat">용신 (너를 살리는 오행)</div><div class="chips">' +
      '<span class="chip gold">' + yong.label + "</span>" + chips(yong.names.map(function (n) { return n + "(用)"; }), "gold") + "</div></div>";
    return '<div class="sumcard">' + html + "</div>";
  }

  function toc(sections) {
    var html = '<div class="toc">';
    sections.forEach(function (s, i) {
      html += '<a href="#sec' + i + '"><span class="hj">' + s.hanja + '</span><span class="tt">' + esc(s.title) + '</span><span class="ar">→</span></a>';
    });
    return html + "</div>";
  }

  function radarSvg(scores) {
    var cx = 120, cy = 115, R = 88, n = scores.length, cA = -Math.PI / 2;
    function pt(r, i) { var a = cA + i * 2 * Math.PI / n; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
    var grid = "";
    [0.25, 0.5, 0.75, 1].forEach(function (f) {
      var pts = scores.map(function (_, i) { return pt(R * f, i).join(","); }).join(" ");
      grid += '<polygon points="' + pts + '" fill="none" stroke="#2a2833" stroke-width="1"/>';
    });
    var axes = "", labels = "";
    scores.forEach(function (s, i) {
      var p = pt(R, i); axes += '<line x1="' + cx + '" y1="' + cy + '" x2="' + p[0] + '" y2="' + p[1] + '" stroke="#2a2833"/>';
      var lp = pt(R + 18, i);
      labels += '<text x="' + lp[0] + '" y="' + lp[1] + '" fill="#8f897c" font-size="11" text-anchor="middle" dominant-baseline="middle">' + s.label + "</text>";
    });
    var poly = scores.map(function (s, i) { return pt(R * s.v / 100, i).join(","); }).join(" ");
    return '<svg viewBox="0 0 240 230" width="240" height="230"><g>' + grid + axes +
      '<polygon points="' + poly + '" fill="rgba(216,178,92,.25)" stroke="#d8b25c" stroke-width="2"/>' + labels + "</g></svg>";
  }

  function daeunTable(res) {
    if (!res.daeun) return "";
    var y = DT.yongsin(res), yong = [y.primary, y.second];
    var GAN_OHENG = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
    var html = "";
    res.daeun.list.slice(0, 9).forEach(function (du) {
      var o = GAN_OHENG[du.stem];
      var good = yong.indexOf(o) >= 0;
      var cls = good ? "lg" : (o === (GAN_OHENG[res.dayMaster] + 1) % 5 ? "ln" : "lc");
      var lab = good ? "상승기" : (cls === "ln" ? "무난" : "관리기");
      html += '<div class="du-row"><span class="du-age">' + du.startAge + "~" + (du.startAge + 9) + "세</span>" +
        '<span class="du-gan">' + DT.GAN_KO[du.stem] + DT.JI_KO[du.branch] + "(" + DT.GAN[du.stem] + DT.JI[du.branch] + ")</span>" +
        '<span class="du-luck ' + cls + '">' + lab + "</span></div>";
    });
    return '<div class="tale" style="padding:8px 14px;">' + html + "</div>";
  }

  function renderSection(sec, idx, res) {
    var h = '<section class="sec" id="sec' + idx + '"><div class="sec-head"><span class="sec-hj">' + sec.hanja +
      '</span><span class="sec-t">' + esc(sec.title) + '</span><span class="sec-sub">' + esc(sec.subtitle || "") + "</span></div>";
    if (sec.seal) h += '<div class="seal"><div class="frame"><div class="hj">' + esc(sec.seal) + '</div>' +
      (sec.sealCap ? '<div class="cap">' + esc(sec.sealCap) + "</div>" : "") + "</div></div>";
    (sec.blocks || []).forEach(function (b) {
      if (b.love) return;
      if (b.daeun) { if (b.sub) h += '<p class="bsub">' + esc(b.sub) + "</p>"; h += daeunTable(res); return; }
      h += '<div class="blk">' + (b.sub ? '<p class="bsub">' + esc(b.sub) + "</p>" : "") +
        (b.text ? "<p>" + esc(b.text) + "</p>" : "") +
        (b.link ? '<p style="margin-top:8px;"><a href="' + b.link + '" style="color:var(--gold);font-weight:700;">→ 무료 궁합 보러 가기</a></p>' : "") + "</div>";
    });
    if (sec.tale) h += '<div class="seal"><div class="frame"><div class="hj">生靈</div><div class="cap">이 놈의 정체와 유래</div></div></div>' +
      '<div class="tale">' + SAENGRYEONG_TALE + "</div>";
    if (sec.radar) h += '<div class="radar-wrap">' + radarSvg(sec.radar) + '</div><div class="abil">' +
      sec.radar.map(function (a) { return '<div class="abil-row"><span class="abil-l">' + a.label + '</span><span class="abil-tr"><span class="abil-f" style="width:' + a.v + '%"></span></span><span class="abil-v">' + a.v + "</span></div>"; }).join("") + "</div>";
    return h + "</section>";
  }

  function run() {
    var inp = parse();
    if (!inp) { $("content").innerHTML = '<p class="loading">먼저 <a href="/saju/" style="color:#d8b25c">도깨비 사주</a>에서 생년월일을 넣어라.</p>'; return; }
    var res = S.computeSaju(inp.sy, inp.sm, inp.sd, inp.hh, 0, { tzHours: 9, hourKnown: inp.hourKnown, gender: inp.gender });
    var yong = DT.yongsin(res);
    var thisYear = new Date().getFullYear();
    var ctx = { gender: inp.gender, love: inp.love, birthYear: inp.y, age: thisYear - inp.y + 1, thisYear: thisYear, yongsin: yong };

    // echo
    var calTxt = inp.cal === "lunar" ? "음력" + (inp.leap ? " 윤달" : "") : "양력";
    $("echo").innerHTML = '<span class="b">' + inp.y + "년 " + inp.m + "월 " + inp.d + "일</span> · " + calTxt +
      " · " + (inp.gender === "m" ? "남성" : "여성") + (inp.hourKnown ? " · " + inp.hh + "시" : " · 시간미상");
    paljaStrip(res);

    var sections = DC.build(res, ctx);
    var html = summaryCard(res, yong) + toc(sections);
    sections.forEach(function (s, i) { html += renderSection(s, i, res); });
    $("content").innerHTML = html;

    $("cta").innerHTML = '<p class="note">이 풀이는 정통 명리학에 도깨비의 토속적 해석을 더한 재미·참고용입니다.</p>' +
      '<p class="note">궁합이 궁금하면 <a href="/gunghap/" style="color:#d8b25c">무료 궁합</a>도 있어요.</p>';
  }

  run();
})();
