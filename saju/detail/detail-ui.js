/* ============================================================
 * 도깨비 사주 상세풀이 — 렌더러
 * URL 파라미터(y,m,d,g,love,h,cal,leap) → 상세 결과 렌더
 * ============================================================ */
(function () {
  "use strict";
  var S = window.Saju, L = window.SajuLunar, DT = window.SajuDetail, DC = window.DetailContent;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); };
  var _birthYear = null;

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
    var mm = hourKnown ? (+q.get("mi") || 0) : 0;
    return {
      y: y, m: m, d: d, sy: sy, sm: sm, sd: sd, cal: cal, leap: leap,
      gender: q.get("g") || "m", love: q.get("love") || "", name: (q.get("n") || "").trim(),
      hourKnown: hourKnown, hh: hh, mm: mm
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

  // 십성/신살/운성 쉬운 풀이 사전
  // 십성별 '그 달/해 실천 조언' — 뜻 + 이렇게 하라
  var SIP_MONTH = {
    "비견": "주관·경쟁·독립의 기운이 도는 때다. 남에게 기대기보다 내 힘으로 결정할 일을 처리하기 좋다. 동업·협업 제안은 조건을 분명히 문서로 남겨라.",
    "겁재": "지출·경쟁·협업의 기운이다. 보증·투자·큰 씀씀이는 신중히 하고, 친구·형제와의 돈거래는 반드시 문서로. 대신 사람들과 힘을 모으는 일엔 유리하다.",
    "식신": "먹을복과 표현·여유의 기운이다. 미뤄둔 취미·콘텐츠·표현을 시작하기 좋고, 몸이 편하니 건강 챙기며 즐겨라. 베풀수록 복이 돈다.",
    "상관": "재능·말발·끼가 튀는 기운이다. 발표·기획·창작에 힘을 실어라. 단 윗사람·계약 앞에선 말을 아끼고, 욱하는 감정·구설만 누르면 성과가 크다.",
    "편재": "큰돈·기회·활동의 기운이다. 영업·부업·투자로 판을 벌이기 좋다. 과감히 움직이되 한 번에 다 걸지 말고 분산하고, 인맥·거래처를 넓혀라.",
    "정재": "착실한 수입과 실속의 기운이다. 저축·계약·내 집 마련 같은 꾸준한 일을 매듭짓기 좋다. 무리한 확장보다 관리·저축으로 실속을 챙겨라.",
    "편관": "압박·도전·과로의 기운이다. 힘들어도 정면으로 넘기면 한 단계 크게 큰다. 스트레스·건강을 함께 관리하고, 경쟁·상사와는 정공법으로 맞서라.",
    "정관": "명예·자리·인정의 기운이다. 시험·승진·면접·발표에 유리하니 미뤄둔 공적 절차를 진행하라. 규칙을 지키고 반듯하게 처신할수록 자리가 따른다.",
    "편인": "궁리·자격·직관의 기운이다. 자격증·기술·전공 공부에 몰입하기 좋다. 큰 결정은 서두르지 말고 정보를 더 모아 신중히 판단해라.",
    "정인": "문서·귀인·안정의 기운이다. 계약·합격·발령·부동산 문서운이 좋다. 어른·스승·귀인에게 도움을 청하고, 공부·자격에 투자하기 좋은 때다."
  };
  // 십이신살별 '땜·활용' 실천 조언 (그 달/해에 이렇게 풀어라)
  var SINSAL_ADVICE = {
    "겁살": "예상 밖 지출·손실의 기운이다. 큰 계약·보증·목돈 투자는 미루고, 경조사비·기부처럼 작은 돈을 먼저 내어 액을 흘려보내면 큰 손실을 땜한다.",
    "재살": "시비·구설·관재(법적 다툼)의 기운이다. 서류·계약·운전을 특히 조심하고, 다툼은 먼저 양보해 넘기면 큰일로 안 번진다.",
    "천살": "하늘이 잠시 막아 뜻대로 안 풀리는 기운이다. 큰 결정·계약은 다음으로 미루고 한 박자 쉬어라. 부모·조상께 안부를 챙기거나 성묘를 하면 눌린 기운이 풀린다.",
    "지살": "이동·이사·출장의 기운이다. 마침 이사·이직·출장을 이 시기에 잡아 그 기운을 쓰면 오히려 길하다. 움직여야 풀린다.",
    "년살": "인기·매력·이성운(도화)이 오르는 기운이다. 소개·미팅·대외활동엔 좋으니 활용하되, 이성 문제와 구설은 처신을 조심해 땜해라.",
    "월살": "씨앗이 잘 트지 않는 위축·정체의 기운이다. 새로 벌이기보다 벌여둔 일을 정리·마무리하라. 개업·확장·이사는 이 시기를 피하고 몸을 낮추면 무탈하다.",
    "망신살": "체면 손상·구설의 기운이다. 말·SNS·과음을 조심하고 스스로 낮추면 오히려 탈이 없다. 미리 겸손하게 처신해 땜해라.",
    "장성살": "리더십·권한이 서는 기운이다. 미루던 발표·승진·큰 프로젝트를 이 시기에 밀어붙여 그 기운을 써먹어라. 중심에 설수록 좋다.",
    "반안살": "귀인·승진·안정의 기운(말안장에 오르는 상)이다. 윗사람·귀인에게 도움을 청하거나 자리 이동·시험을 노리기 좋다.",
    "역마살": "이동·변화·먼 길의 기운이다. 차라리 이 시기에 여행·출장을 다녀와 역마 기운을 미리 풀어라(땜). 안 그러면 원치 않는 이동·분주함으로 나타나니, 멀리 움직일수록 좋다.",
    "육해살": "몸이 지치고 발목 잡히기 쉬운 기운이다. 무리한 일정을 줄이고 건강검진·휴식으로 미리 몸을 챙기면 땜이 된다.",
    "화개살": "학문·예술·종교·재충전의 기운이다. 자격증·공부·창작·명상에 몰입하거나 혼자만의 시간을 가지면 이 기운이 복으로 산다."
  };
  var STRONG_STAGE = { "장생": 1, "관대": 1, "건록": 1, "제왕": 1 };
  var WEAK_STAGE = { "병": 1, "사": 1, "묘": 1, "절": 1 };
  function stageNote(st) {
    if (STRONG_STAGE[st]) return " 기운이 살아 있는 때다.";
    if (WEAK_STAGE[st]) return " 기운이 처지니 큰일은 뒤로 미뤄라.";
    if (st === "목욕") return " 마음이 들뜨고 변동이 있다.";
    return "";
  }
  function luckDesc(sipStem, sinsal, stage) {
    var d = SIP_MONTH[sipStem] || "";
    if (SINSAL_ADVICE[sinsal]) d += " 이때는 " + sinsal + "이 들었다 — " + SINSAL_ADVICE[sinsal];
    d += stageNote(stage);
    return d;
  }
  function badges(row) {
    return '<span class="tag t-sip">' + row.sipStem + '</span><span class="tag">' + row.stage +
      '</span><span class="tag t-sin">' + row.sinsal + "</span>";
  }
  function monthlyTable(res) {
    var year = new Date().getFullYear();
    var rows = DT.monthlyLuck(res, year);
    return '<div class="luck-list">' + rows.map(function (r) {
      return '<div class="luck-item"><div class="luck-top"><b class="luck-when">' + r.greg + '월</b>' +
        '<span class="luck-gz">' + r.ganKo + "(" + r.ganHan + ")</span>" + badges(r) + "</div>" +
        '<p class="luck-desc">' + esc(luckDesc(r.sipStem, r.sinsal, r.stage)) + "</p></div>";
    }).join("") + "</div>";
  }
  function saeunTable(res) {
    var year = new Date().getFullYear();
    var rows = DT.yearLuck(res, year, 6);
    return '<div class="luck-list">' + rows.map(function (r, i) {
      var age = _birthYear ? (r.year - _birthYear + 1) + "세" : "";
      return '<div class="luck-item"><div class="luck-top"><b class="luck-when">' + r.year + "년" +
        (i === 0 ? " (올해)" : "") + '</b>' + (age ? '<span class="luck-age">' + age + "</span>" : "") +
        '<span class="luck-gz">' + r.ganKo + "(" + r.ganHan + ")</span>" + badges(r) + "</div>" +
        '<p class="luck-desc">' + esc(luckDesc(r.sipStem, r.sinsal, r.stage)) + "</p></div>";
    }).join("") + "</div>";
  }

  function renderSection(sec, idx, res) {
    var h = '<section class="sec" id="sec' + idx + '"><div class="sec-head"><span class="sec-hj">' + sec.hanja +
      '</span><span class="sec-t">' + esc(sec.title) + '</span><span class="sec-sub">' + esc(sec.subtitle || "") + "</span></div>";
    if (sec.seal) h += '<div class="seal"><div class="frame"><div class="hj">' + esc(sec.seal) + '</div>' +
      (sec.sealCap ? '<div class="cap">' + esc(sec.sealCap) + "</div>" : "") + "</div></div>";
    (sec.blocks || []).forEach(function (b) {
      if (b.love) return;
      if (b.daeun) { if (b.sub) h += '<p class="bsub">' + esc(b.sub) + "</p>"; h += daeunTable(res); return; }
      if (b.monthly) { if (b.sub) h += '<p class="bsub">' + esc(b.sub) + "</p>"; if (b.text) h += "<p>" + esc(b.text) + "</p>"; h += monthlyTable(res); return; }
      if (b.saeun) { if (b.sub) h += '<p class="bsub">' + esc(b.sub) + "</p>"; if (b.text) h += "<p>" + esc(b.text) + "</p>"; h += saeunTable(res); return; }
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
    _birthYear = inp.y;
    var res = S.computeSaju(inp.sy, inp.sm, inp.sd, inp.hh, inp.mm, { tzHours: 9, hourKnown: inp.hourKnown, gender: inp.gender });
    var yong = DT.yongsin(res);
    var thisYear = new Date().getFullYear();
    var ctx = { gender: inp.gender, love: inp.love, name: inp.name, birthYear: inp.y, age: thisYear - inp.y + 1, thisYear: thisYear, yongsin: yong };

    // echo
    var calTxt = inp.cal === "lunar" ? "음력" + (inp.leap ? " 윤달" : "") : "양력";
    var timeTxt = inp.hourKnown ? (" · " + inp.hh + "시" + (inp.mm ? " " + inp.mm + "분" : "")) : " · 시간미상";
    $("echo").innerHTML = (inp.name ? '<span class="b">' + esc(inp.name) + "님</span> · " : "") +
      '<span class="b">' + inp.y + "년 " + inp.m + "월 " + inp.d + "일</span> · " + calTxt +
      " · " + (inp.gender === "m" ? "남성" : "여성") + timeTxt;
    paljaStrip(res);

    var DKb = window.SajuDokkaebi;
    var params = DKb.chartParamsFromQuery(location.search);
    var token = new URLSearchParams(location.search).get("pay");
    $("content").innerHTML = '<p class="loading">도깨비가 봉인을 확인하는 중…</p>';
    DKb.verifyAccess(params, token, function (access) {
      // access: null = 결제 미설정(전체 공개) · true = 결제 완료 · false = 잠금
      if (access === false) renderLocked(res, yong, ctx);
      else renderFull(res, yong, ctx);
    });
  }

  function renderFull(res, yong, ctx) {
    var sections = DC.build(res, ctx);
    var html = summaryCard(res, yong) + toc(sections);
    sections.forEach(function (s, i) { html += renderSection(s, i, res); });
    $("content").innerHTML = html;
    $("cta").innerHTML = '<p class="note">이 풀이는 정통 명리학에 도깨비의 토속적 해석을 더한 재미·참고용입니다.</p>' +
      '<p class="note">궁합이 궁금하면 <a href="/gunghap/" style="color:#d8b25c">무료 궁합</a>도 있어요.</p>';
  }

  function renderLocked(res, yong, ctx) {
    var DKb = window.SajuDokkaebi, C = DKb.CONFIG;
    var sections = DC.build(res, ctx);
    var html = summaryCard(res, yong) + toc(sections);
    html += renderSection(sections[0], 0, res); // 첫 장(魂)만 미리보기
    html += '<div class="paywall"><div class="pw-hj">封</div>' +
      '<h3>나머지 ' + (sections.length - 1) + '장은 도깨비가 봉인해 뒀다</h3>' +
      '<p class="note">액운·인연·재물·귀인·황금기까지 — 결제하면 도깨비가 봉인을 푼다.</p>' +
      '<div class="pw-price"><span class="o">' + C.PRICE_ORIGINAL + '원</span><span class="n">' + C.PRICE_NOW + '원</span></div>' +
      '<button id="pwPay" class="pw-btn">결제하고 전체 풀이 보기</button>' +
      '<p class="note" style="margin-top:10px;">결제 후 이 화면에서 바로 전체 풀이가 열립니다.</p></div>';
    $("content").innerHTML = html;
    $("cta").innerHTML = "";
    var btn = document.getElementById("pwPay");
    if (btn) btn.addEventListener("click", function () {
      var qs = new URLSearchParams(location.search); qs.delete("pay");
      var base = location.pathname + "?" + qs.toString();
      DKb.startPayment(DKb.chartParamsFromQuery(location.search), {
        onToken: function (t) { location.href = base + "&pay=" + encodeURIComponent(t); }
      });
    });
  }

  run();
})();
