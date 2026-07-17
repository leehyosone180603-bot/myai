/* ============================================================
 * 도깨비 사주 — 무료 대시보드/스낵 모듈
 * 오행 레이더 · 오늘의 행운 지수 · 대운/세운 꺾은선 · 사주 MBTI · 전생 직업
 * SajuDetail(십성·용신·세운) 재사용. 순수 계산 + SVG 렌더.
 * ============================================================ */
(function (root) {
  "use strict";
  var D = root.SajuDetail;
  var GAN_OHENG = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
  var BR_OHENG = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
  var OHENG = ["목", "화", "토", "금", "수"];
  var OHENG_HAN = ["木", "火", "土", "金", "水"];
  var OHENG_COLOR = ["#3fb08f", "#e06a5a", "#d8b25c", "#c9c4b8", "#5a86c9"];

  function el(dm) { return GAN_OHENG[dm]; }
  function sg(sip) {
    if (sip === "비견" || sip === "겁재") return "비겁";
    if (sip === "식신" || sip === "상관") return "식상";
    if (sip === "편재" || sip === "정재") return "재성";
    if (sip === "편관" || sip === "정관") return "관성";
    return "인성";
  }
  function starCount(res, group) {
    var n = 0;
    ["year", "month", "day", "hour"].forEach(function (k) {
      var p = res.pillars[k]; if (!p) return;
      if (k !== "day") { if (sg(D.tenGodStem(res.dayMaster, p.stem)) === group) n++; }
      if (sg(D.tenGodBranch(res.dayMaster, p.branch)) === group) n++;
    });
    return n;
  }
  function todayGZ() {
    var now = new Date(Date.now() + 9 * 3600000);
    var y = now.getUTCFullYear(), m = now.getUTCMonth() + 1, dd = now.getUTCDate();
    var a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
    var jdn = dd + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
    var idx = ((jdn + 49) % 60 + 60) % 60;
    return { stem: idx % 10, branch: idx % 12 };
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, Math.round(v))); }

  function ctx(res) {
    var dm = res.dayMaster, e = el(dm), bs = D.bodyStrength(res), y = D.yongsin(res);
    var gi = bs.strong ? [(e + 4) % 5, e] : [(e + 3) % 5, (e + 2) % 5];
    return { dm: dm, e: e, bs: bs, yong: y, yongO: [y.primary, y.second], gi: gi };
  }
  function scoreOfOheng(c, o) {
    if (o === c.yongO[0]) return 88; if (o === c.yongO[1]) return 80;
    if (c.gi.indexOf(o) >= 0) return 44; return 62;
  }

  /* ── 오행 밸런스 ── */
  function ohengBalance(res) {
    var o = res.oheng.slice(), max = Math.max.apply(null, o) || 1, total = 0;
    o.forEach(function (v) { total += v; });
    var axes = o.map(function (v, i) {
      return { label: OHENG[i] + "(" + OHENG_HAN[i] + ")", oheng: i, count: v, v: Math.round(v / max * 100), color: OHENG_COLOR[i] };
    });
    var strong = [], weak = [];
    o.forEach(function (v, i) { if (v >= max && max > 0) strong.push(OHENG[i]); if (v === 0) weak.push(OHENG[i]); });
    var note = "가장 강한 기운은 <b>" + strong.join("·") + "</b>" +
      (weak.length ? ", 부족한 기운은 <b>" + weak.join("·") + "</b>다. 부족한 오행을 색·음식·방위로 채우면 균형이 잡힌다." : "라 비교적 고르게 갖춰졌다.");
    return { axes: axes, note: note };
  }

  /* ── 오늘의 행운 지수 ── */
  function luckIndex(res) {
    var c = ctx(res), t = todayGZ(), tO = GAN_OHENG[t.stem], tbO = BR_OHENG[t.branch];
    var tGroup = sg(D.tenGodStem(c.dm, t.stem));
    function todayAdj(good, bad) {
      var s = 0;
      if (c.yongO.indexOf(tO) >= 0) s += 10; else if (c.gi.indexOf(tO) >= 0) s -= 6; else s += 3;
      if (good.indexOf(tGroup) >= 0) s += 10; if (bad.indexOf(tGroup) >= 0) s -= 8;
      return s;
    }
    var jae = starCount(res, "재성"), gwan = starCount(res, "관성"), inseong = starCount(res, "인성"),
      sik = starCount(res, "식상"), bi = starCount(res, "비겁");
    var munchang = D.computeShinsal(res).some(function (s) { return s.key === "문창귀인"; });
    var money = clamp(48 + jae * 10 + sik * 4 + todayAdj(["재성", "식상"], ["비겁"]), 30, 98);
    var love = clamp(48 + gwan * 7 + jae * 5 + todayAdj(["재성", "관성"], ["비겁"]) + (tbO === el(c.dm) ? 0 : 3), 30, 98);
    var job = clamp(46 + gwan * 9 + inseong * 3 + todayAdj(["관성", "인성"], ["식상"]), 30, 98);
    var study = clamp(46 + inseong * 9 + (munchang ? 8 : 0) + todayAdj(["인성"], ["재성"]), 30, 98);
    var health = clamp(50 + inseong * 6 + bi * 4 + (c.bs.strong ? 4 : 2) + todayAdj(["인성", "비겁"], ["관성"]), 30, 98);
    var total = clamp((money + love + job + study + health) / 5 + (c.yongO.indexOf(tO) >= 0 ? 4 : 0), 30, 99);
    return {
      today: D.GAN_KO[t.stem] + D.JI_KO[t.branch],
      items: [
        { label: "총운", v: total, key: "total" },
        { label: "재물운", v: money, key: "money" },
        { label: "연애운", v: love, key: "love" },
        { label: "직장운", v: job, key: "job" },
        { label: "학업운", v: study, key: "study" },
        { label: "건강운", v: health, key: "health" }
      ]
    };
  }

  /* ── 인생 운의 흐름 (대운·세운) ── */
  function lifeCurve(res, thisYear, birthYear) {
    var c = ctx(res), dae = [], sae = [];
    if (res.daeun && res.daeun.list) {
      res.daeun.list.slice(0, 9).forEach(function (du) {
        var so = GAN_OHENG[du.stem], bo = BR_OHENG[du.branch];
        var sc = Math.round((scoreOfOheng(c, so) * 0.6 + scoreOfOheng(c, bo) * 0.4));
        dae.push({ x: du.startAge, label: du.startAge + "세", score: sc, gan: D.GAN_KO[du.stem] + D.JI_KO[du.branch] });
      });
    }
    for (var yr = thisYear - 2; yr <= thisYear + 9; yr++) {
      var g = D.yearGanzhi(yr), so2 = GAN_OHENG[g.stem], bo2 = BR_OHENG[g.branch];
      var sc2 = Math.round((scoreOfOheng(c, so2) * 0.6 + scoreOfOheng(c, bo2) * 0.4));
      sae.push({ x: yr, label: ("" + yr).slice(2) + "년", score: sc2, gan: D.GAN_KO[g.stem] + D.JI_KO[g.branch], now: yr === thisYear });
    }
    var age = thisYear - birthYear + 1;
    var peak = dae.slice().sort(function (a, b) { return b.score - a.score; })[0];
    var note = peak ? "대운으로 보면 <b>" + peak.label + "부터(" + peak.gan + ")</b> 무렵이 인생의 상승 정점이다. 지금은 " + age + "세." : "";
    return { daeun: dae, saeun: sae, note: note };
  }

  /* ── 사주 MBTI ── */
  function sajuMbti(res) {
    var o = res.oheng, yy = res.yinYang;
    var E = yy.yang >= yy.yin, N = (o[0] + o[1]) >= (o[3] + o[4]), T = o[3] >= o[1], J = o[2] >= 2;
    var type = (E ? "E" : "I") + (N ? "N" : "S") + (T ? "T" : "F") + (J ? "J" : "P");
    var desc = (E ? "밖으로 기운을 뻗는 " : "안으로 다지는 ") + (N ? "큰 그림형" : "현실 감각형") + "이고, " +
      (T ? "이성·논리로" : "감정·공감으로") + " 판단하며 " + (J ? "계획적으로 " : "유연하게 ") + "움직이는 기질이다.";
    return { type: type, desc: desc };
  }

  /* ── 전생 직업 (재미) ── */
  var PASTLIFE = {
    "목-인성": { job: "글 읽던 선비", d: "책과 붓을 놓지 않던 학인이었다. 그 총명함이 지금도 배움의 복으로 남았다." },
    "목-관성": { job: "고을을 다스린 현감", d: "곧은 나무처럼 원칙을 지킨 관리였다. 리더의 그릇이 이번 생에도 이어진다." },
    "화-식상": { job: "저잣거리의 광대·악공", d: "사람을 웃기고 홀리던 끼가 있었다. 표현·예술의 재능이 타고났다." },
    "화-관성": { job: "봉화를 지킨 무관", d: "불처럼 뜨겁게 소임을 지킨 장수였다. 열정과 명예욕이 지금도 살아 있다." },
    "토-인성": { job: "마을을 지킨 촌장", d: "너른 땅처럼 사람을 품던 어른이었다. 신뢰와 중재의 덕이 몸에 뱄다." },
    "토-재성": { job: "곡식을 쌓던 대지주", d: "땅과 곳간을 불리던 살림꾼이었다. 재물을 모으는 뚝심이 남았다." },
    "금-관성": { job: "칼을 찬 장수", d: "쇠처럼 단단한 무인이었다. 결단력과 승부욕이 이번 생의 무기다." },
    "금-재성": { job: "장 크게 벌인 거상", d: "쇠붙이·귀금속을 다루던 상인이었다. 셈에 밝고 판을 읽는 눈이 있다." },
    "수-재성": { job: "바닷길 누빈 무역상", d: "물길 따라 크게 장사하던 거상이었다. 유연함과 재물운을 함께 타고났다." },
    "수-인성": { job: "물길·천문을 읽던 책사", d: "물처럼 깊게 궁리하던 지략가였다. 통찰과 기획의 재능이 남았다." },
    "목-식상": { job: "약초 다루던 의원", d: "풀과 나무로 사람을 살리던 의원이었다. 세심한 손길과 보살핌의 재능이 남았다." },
    "목-재성": { job: "목재를 다루던 도편수", d: "나무를 깎아 집을 짓던 우두머리 목수였다. 무언가를 세우는 손재주가 남았다." },
    "화-인성": { job: "등불 밝히던 학승", d: "불빛 아래 경을 읽던 수행자였다. 밝은 지혜와 가르침의 기운이 남았다." },
    "토-관성": { job: "성을 지킨 성주", d: "너른 땅과 백성을 다스리던 우두머리였다. 든든한 책임감과 포용력이 남았다." },
    "금-식상": { job: "쇠붙이 다루던 대장장이", d: "쇠를 두드려 연장을 벼리던 장인이었다. 끈기와 손재주, 승부 근성이 남았다." },
    "금-인성": { job: "칼과 병법을 익힌 책사", d: "무예와 지략을 함께 닦던 참모였다. 날카로운 판단력과 전략의 재능이 남았다." },
    "수-관성": { job: "수군을 이끈 장수", d: "물길을 지키던 지략 있는 무장이었다. 유연한 판단과 통솔력이 남았다." },
    "수-식상": { job: "이야기 짓던 소리꾼", d: "물처럼 흐르는 말과 소리로 사람을 울리고 웃기던 예인이었다. 감성과 표현의 재능이 남았다." },
    "화-재성": { job: "가마 다루던 도공", d: "불을 다뤄 그릇을 빚어 팔던 장인이자 상인이었다. 열정과 장사 수완을 함께 타고났다." },
    "토-식상": { job: "약재·음식 짓던 숙수", d: "땅의 재료로 먹거리·약을 짓던 손맛의 달인이었다. 사람을 먹이고 돌보는 재능이 남았다." }
  };
  var FB_JOB = { "비겁": "이름난 장인", "식상": "떠돌던 예인", "재성": "장사 밝던 상인", "관성": "고을 지킨 관원", "인성": "글 읽던 학인" };
  var FB_DESC = {
    "비겁": "제 손으로 이름을 낸 삶이었다. 독립심과 뚝심이 이번 생에도 남았다.",
    "식상": "손재주와 끼로 사람을 즐겁게 하던 삶이었다. 표현·예술의 재능이 남았다.",
    "재성": "셈에 밝아 재물을 다루던 삶이었다. 돈을 굴리는 감각이 남았다.",
    "관성": "고을과 소임을 지키던 삶이었다. 책임감과 명예욕이 남았다.",
    "인성": "글과 지혜를 가까이하던 삶이었다. 총명함과 배움의 복이 남았다."
  };
  function pastLife(res) {
    var e = el(res.dayMaster);
    var groups = ["비겁", "식상", "재성", "관성", "인성"].map(function (g) { return { g: g, n: starCount(res, g) }; });
    groups.sort(function (a, b) { return b.n - a.n; });
    var top = groups[0].g === "비겁" ? (groups[1] && groups[1].n > 0 ? groups[1].g : "재성") : groups[0].g;
    var p = PASTLIFE[OHENG[e] + "-" + top] || { job: FB_JOB[top], d: FB_DESC[top] };
    var flavor = D.bodyStrength(res).strong
      ? " 기가 세서 그 시절에도 남 밑에 잘 안 들어가는 우두머리 기질이었다."
      : " 기가 여려 재주로 사람을 돕고 곁을 지키는 조력자였다.";
    return { job: p.job, desc: p.d + flavor, oheng: OHENG[e] };
  }

  /* ── SVG 렌더 헬퍼 ── */
  function radarSvg(axes) {
    var cx = 120, cy = 112, R = 76, n = axes.length, cA = -Math.PI / 2;
    function pt(r, i) { var a = cA + i * 2 * Math.PI / n; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
    var grid = "";
    [0.34, 0.67, 1].forEach(function (f) {
      var pts = axes.map(function (_, i) { return pt(R * f, i).join(","); }).join(" ");
      grid += '<polygon points="' + pts + '" fill="none" stroke="#2a2833" stroke-width="1"/>';
    });
    var axis = "", labels = "", dots = "";
    axes.forEach(function (s, i) {
      var p = pt(R, i); axis += '<line x1="' + cx + '" y1="' + cy + '" x2="' + p[0] + '" y2="' + p[1] + '" stroke="#2a2833"/>';
      var lp = pt(R + 16, i);
      labels += '<text x="' + lp[0] + '" y="' + lp[1] + '" fill="' + s.color + '" font-size="12" font-weight="700" text-anchor="middle" dominant-baseline="middle">' + s.label.charAt(0) + "</text>";
      var dp = pt(R * Math.max(s.v, 6) / 100, i); dots += '<circle cx="' + dp[0] + '" cy="' + dp[1] + '" r="2.5" fill="' + s.color + '"/>';
    });
    var poly = axes.map(function (s, i) { return pt(R * Math.max(s.v, 6) / 100, i).join(","); }).join(" ");
    return '<svg viewBox="0 0 240 224" width="100%" style="max-width:260px"><g>' + grid + axis +
      '<polygon points="' + poly + '" fill="rgba(216,178,92,.22)" stroke="#d8b25c" stroke-width="2"/>' + dots + labels + "</g></svg>";
  }
  function gauge(items) {
    return '<div class="lk-list">' + items.map(function (it) {
      var col = it.v >= 75 ? "#3fb08f" : it.v >= 55 ? "#d8b25c" : "#e0855a";
      var big = it.key === "total";
      return '<div class="lk-row' + (big ? " big" : "") + '"><span class="lk-l">' + it.label + '</span>' +
        '<span class="lk-bar"><span class="lk-f" style="width:' + it.v + '%;background:' + col + '"></span></span>' +
        '<span class="lk-v" style="color:' + col + '">' + it.v + "</span></div>";
    }).join("") + "</div>";
  }
  function lineChart(series, opts) {
    opts = opts || {};
    var W = 300, H = 120, padL = 8, padR = 8, padT = 14, padB = 20;
    var xs = series.map(function (p) { return p.x; });
    var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
    var spanX = (maxX - minX) || 1;
    function X(x) { return padL + (x - minX) / spanX * (W - padL - padR); }
    function Y(v) { return padT + (100 - v) / 100 * (H - padT - padB); }
    var grid = "";
    [40, 62, 84].forEach(function (v) { grid += '<line x1="' + padL + '" y1="' + Y(v) + '" x2="' + (W - padR) + '" y2="' + Y(v) + '" stroke="#232029" stroke-width="1"/>'; });
    var path = series.map(function (p, i) { return (i ? "L" : "M") + X(p.x).toFixed(1) + " " + Y(p.score).toFixed(1); }).join(" ");
    var area = path + " L" + X(maxX).toFixed(1) + " " + Y(0) + " L" + X(minX).toFixed(1) + " " + Y(0) + " Z";
    var dots = "", labels = "";
    series.forEach(function (p, i) {
      var hi = p.now || (opts.markPeak && p.score === Math.max.apply(null, series.map(function (q) { return q.score; })));
      dots += '<circle cx="' + X(p.x).toFixed(1) + '" cy="' + Y(p.score).toFixed(1) + '" r="' + (hi ? 4 : 2.6) + '" fill="' + (hi ? "#e6c469" : "#8f897c") + '"/>';
      if (i % opts.labelEvery === 0 || p.now) labels += '<text x="' + X(p.x).toFixed(1) + '" y="' + (H - 6) + '" fill="' + (p.now ? "#e6c469" : "#8f897c") + '" font-size="9" text-anchor="middle">' + p.label + "</text>";
    });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%"><g>' + grid +
      '<path d="' + area + '" fill="rgba(216,178,92,.10)"/>' +
      '<path d="' + path + '" fill="none" stroke="#d8b25c" stroke-width="2"/>' + dots + labels + "</g></svg>";
  }

  function render(res, thisYear, birthYear) {
    var ob = ohengBalance(res), lk = luckIndex(res), lc = lifeCurve(res, thisYear, birthYear),
      mb = sajuMbti(res), pl = pastLife(res);
    return {
      ohengRadar: radarSvg(ob.axes) + '<div class="oh-legend">' + ob.axes.map(function (a) {
        return '<span><i style="background:' + a.color + '"></i>' + a.label + " " + a.count + "</span>";
      }).join("") + "</div>",
      ohengNote: ob.note,
      luckIndex: '<p class="lk-day">오늘 ' + lk.today + '일 기준</p>' + gauge(lk.items),
      lifeCurve: '<p class="lc-cap">대운(10년 단위)</p>' + lineChart(lc.daeun, { labelEvery: 1, markPeak: true }) +
        '<p class="lc-cap">세운(1년 단위)</p>' + lineChart(lc.saeun, { labelEvery: 2 }),
      curveNote: lc.note,
      sajuMbti: '<div class="snack-big">' + mb.type + "</div><p class=\"snack-d\">" + mb.desc + "</p>",
      pastLife: '<div class="snack-big">' + pl.job + "</div><p class=\"snack-d\">" + pl.desc + "</p>"
    };
  }

  root.SajuDash = { render: render, ohengBalance: ohengBalance, luckIndex: luckIndex, lifeCurve: lifeCurve, sajuMbti: sajuMbti, pastLife: pastLife };
})(typeof window !== "undefined" ? window : this);
