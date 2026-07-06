/* ============================================================
 * 도깨비 사주 — 상세(유료) 명리 계산 엔진
 * 십성 · 십이운성 · 신살 · 납음 · 용신 · 세운 · 능력치
 * 입력: Saju.computeSaju 결과(res) + 출생연도
 * ============================================================ */
(function (root) {
  "use strict";

  var GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  var JI  = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  var GAN_KO = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
  var JI_KO  = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
  var GAN_OHENG = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];              // 목화토금수
  var JI_OHENG  = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
  var OHENG_KO = ["목", "화", "토", "금", "수"];

  /* ── 십성(十星) ── */
  var SIP = [["비견", "겁재"], ["식신", "상관"], ["편재", "정재"], ["편관", "정관"], ["편인", "정인"]];
  function tenGodByElem(dayStem, tOheng, tYang) {
    var dOheng = GAN_OHENG[dayStem], dYang = (dayStem % 2 === 0);
    var rel;
    if (tOheng === dOheng) rel = 0;
    else if (tOheng === (dOheng + 1) % 5) rel = 1;   // 내가 생 → 식상
    else if (tOheng === (dOheng + 2) % 5) rel = 2;   // 내가 극 → 재성
    else if (tOheng === (dOheng + 3) % 5) rel = 3;   // 나를 극 → 관성
    else rel = 4;                                    // 나를 생 → 인성
    return SIP[rel][(dYang === tYang) ? 0 : 1];
  }
  function tenGodStem(dayStem, s) { return tenGodByElem(dayStem, GAN_OHENG[s], s % 2 === 0); }
  function tenGodBranch(dayStem, b) { return tenGodByElem(dayStem, JI_OHENG[b], b % 2 === 0); }

  /* ── 십이운성(十二運星) ── */
  var STAGES = ["장생", "목욕", "관대", "건록", "제왕", "쇠", "병", "사", "묘", "절", "태", "양"];
  var JANGSAENG = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3]; // 일간→장생 지지
  function twelveStage(dayStem, branch) {
    var js = JANGSAENG[dayStem], yang = (dayStem % 2 === 0);
    var d = yang ? ((branch - js + 12) % 12) : ((js - branch + 12) % 12);
    return STAGES[d];
  }

  /* ── 납음오행(納音) ── */
  var NAPEUM = ["해중금", "노중화", "대림목", "노방토", "검봉금", "산두화", "간하수", "성두토", "백랍금", "양류목",
    "천중수", "옥상토", "벽력화", "송백목", "장류수", "사중금", "산하화", "평지목", "벽상토", "금박금",
    "복등화", "천하수", "대역토", "차천금", "상자목", "대계수", "사중토", "천상화", "석류목", "대해수"];
  var NAPEUM_HAN = ["海中金", "爐中火", "大林木", "路傍土", "劍鋒金", "山頭火", "澗下水", "城頭土", "白蠟金", "楊柳木",
    "泉中水", "屋上土", "霹靂火", "松柏木", "長流水", "沙中金", "山下火", "平地木", "壁上土", "金箔金",
    "覆燈火", "天河水", "大驛土", "釵釧金", "桑柘木", "大溪水", "沙中土", "天上火", "石榴木", "大海水"];
  function ganziIndex(stem, branch) {
    // 60갑자 index: stem%10, branch%12 → CRT
    for (var i = 0; i < 60; i++) if (i % 10 === stem && i % 12 === branch) return i;
    return 0;
  }
  function napeum(stem, branch) {
    var i = Math.floor(ganziIndex(stem, branch) / 2);
    return { ko: NAPEUM[i], han: NAPEUM_HAN[i] };
  }

  /* ── 신살(神殺) ── */
  // 삼합국: 지지 → [도화, 역마, 화개]
  var TRIAD = { // key: 지지, val: 그 지지가 속한 삼합의 [도화,역마,화개]
  };
  var TRIADS = [
    { g: [2, 6, 10], do: 3, yeok: 8, hwa: 10 },  // 寅午戌 화국
    { g: [8, 0, 4], do: 9, yeok: 2, hwa: 4 },    // 申子辰 수국
    { g: [5, 9, 1], do: 6, yeok: 11, hwa: 1 },   // 巳酉丑 금국
    { g: [11, 3, 7], do: 0, yeok: 5, hwa: 7 }    // 亥卯未 목국
  ];
  function triadOf(branch) {
    for (var i = 0; i < TRIADS.length; i++) if (TRIADS[i].g.indexOf(branch) >= 0) return TRIADS[i];
    return null;
  }
  var CHEONEUL = { // 일간 → 천을귀인 지지들
    0: [1, 7], 4: [1, 7], 6: [1, 7], 1: [0, 8], 5: [0, 8],
    2: [11, 9], 3: [11, 9], 7: [2, 6], 8: [5, 3], 9: [5, 3]
  };
  var MUNCHANG = [5, 6, 8, 9, 8, 9, 11, 0, 2, 3];      // 문창귀인 by 일간
  var YANGIN = { 0: 3, 2: 6, 4: 6, 6: 9, 8: 0 };        // 양인 (양간)
  var BAEKHO = ["甲辰", "乙未", "丙戌", "丁丑", "戊辰", "壬戌", "癸丑"];
  var GWAEGANG = ["戊戌", "庚辰", "庚戌", "壬辰", "壬戌"];

  function computeShinsal(res) {
    var out = [];
    var branches = ["year", "month", "day", "hour"].map(function (k) { return res.pillars[k] ? res.pillars[k].branch : null; }).filter(function (v) { return v !== null; });
    var dayBranch = res.pillars.day.branch, dayStem = res.dayMaster;
    var tri = triadOf(dayBranch);
    function has(b) { return branches.indexOf(b) >= 0; }
    if (tri) {
      if (has(tri.do)) out.push({ key: "도화살", han: "桃花", desc: "사람을 끄는 매력과 인기. 이성이 따르고 끼가 있다." });
      if (has(tri.yeok)) out.push({ key: "역마살", han: "驛馬", desc: "한곳에 못 머무는 이동·변화의 기운. 돌아다녀야 풀린다." });
      if (has(tri.hwa)) out.push({ key: "화개살", han: "華蓋", desc: "예술·종교·학문의 기운. 고독하지만 깊이가 있다." });
    }
    var ce = CHEONEUL[dayStem] || [];
    if (ce.some(has)) out.push({ key: "천을귀인", han: "天乙貴人", desc: "하늘이 돕는 귀인. 위기에 반드시 도와주는 사람이 나타난다.", good: true });
    if (has(MUNCHANG[dayStem])) out.push({ key: "문창귀인", han: "文昌", desc: "총명하고 공부·시험·문서에 강한 기운.", good: true });
    if (YANGIN[dayStem] !== undefined && has(YANGIN[dayStem])) out.push({ key: "양인살", han: "羊刃", desc: "강하고 급한 칼 같은 기운. 승부욕이 세지만 다치기도 쉽다." });
    ["year", "month", "day", "hour"].forEach(function (k) {
      var p = res.pillars[k]; if (!p) return;
      var gj = GAN[p.stem] + JI[p.branch];
      if (BAEKHO.indexOf(gj) >= 0) out.push({ key: "백호대살", han: "白虎", desc: "피 흘리는 강렬한 기운. 크게 쓰면 큰일 하고, 눌리면 다친다." });
      if (GWAEGANG.indexOf(gj) >= 0) out.push({ key: "괴강살", han: "魁罡", desc: "우두머리의 기질. 극단적으로 흥하거나 꺾이는 카리스마." });
    });
    // 중복 제거
    var seen = {}, uniq = [];
    out.forEach(function (o) { if (!seen[o.key]) { seen[o.key] = 1; uniq.push(o); } });
    return uniq;
  }

  /* ── 신강/신약 & 용신 ── */
  function bodyStrength(res) {
    var D = GAN_OHENG[res.dayMaster], o = res.oheng;
    var support = (o[D] - 1) + o[(D + 4) % 5];
    var oppose = o[(D + 1) % 5] + o[(D + 2) % 5] + o[(D + 3) % 5];
    return { strong: support > oppose, support: support, oppose: oppose };
  }
  var OHENG_INFO = [
    { dir: "동쪽", color: "청색·초록", num: "3·8" },
    { dir: "남쪽", color: "적색·분홍", num: "2·7" },
    { dir: "중앙", color: "황색·노랑", num: "5·10" },
    { dir: "서쪽", color: "백색·금색", num: "4·9" },
    { dir: "북쪽", color: "흑색·남색", num: "1·6" }
  ];
  function yongsin(res) {
    var D = GAN_OHENG[res.dayMaster], bs = bodyStrength(res);
    var primary = bs.strong ? (D + 2) % 5 : (D + 4) % 5;  // 신강→재성, 신약→인성
    var second = bs.strong ? (D + 3) % 5 : D;             // 신강→관성, 신약→비겁
    return {
      strong: bs.strong,
      label: bs.strong ? "신강(身强)" : "신약(身弱)",
      primary: primary, second: second,
      names: [OHENG_KO[primary], OHENG_KO[second]],
      info: OHENG_INFO[primary]
    };
  }

  /* ── 세운(년운) ── */
  function yearGanzhi(year) {
    var idx = (((year - 4) % 60) + 60) % 60;
    return { stem: idx % 10, branch: idx % 12, index: idx };
  }
  function yearReading(dayStem, year) {
    var g = yearGanzhi(year);
    return {
      year: year, stem: g.stem, branch: g.branch,
      ganKo: GAN_KO[g.stem] + JI_KO[g.branch], ganHan: GAN[g.stem] + JI[g.branch],
      sipStem: tenGodStem(dayStem, g.stem), sipBranch: tenGodBranch(dayStem, g.branch),
      stage: twelveStage(dayStem, g.branch)
    };
  }

  /* ── 능력치 레이더 (십성 분포 기반) ── */
  function abilityScores(res) {
    var cnt = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
    function add(sip) {
      if (sip === "비견" || sip === "겁재") cnt.비겁++;
      else if (sip === "식신" || sip === "상관") cnt.식상++;
      else if (sip === "편재" || sip === "정재") cnt.재성++;
      else if (sip === "편관" || sip === "정관") cnt.관성++;
      else cnt.인성++;
    }
    ["year", "month", "day", "hour"].forEach(function (k) {
      var p = res.pillars[k]; if (!p) return;
      if (k !== "day") add(tenGodStem(res.dayMaster, p.stem)); // 일간 자신 제외
      add(tenGodBranch(res.dayMaster, p.branch));
    });
    function sc(base, w) { return Math.max(30, Math.min(98, Math.round(base + w))); }
    return [
      { label: "추진력", v: sc(48, (cnt.비겁 + cnt.관성) * 11) },
      { label: "재물력", v: sc(46, cnt.재성 * 16) },
      { label: "표현·재능", v: sc(46, cnt.식상 * 16) },
      { label: "관계·명예", v: sc(46, cnt.관성 * 15) },
      { label: "안정·인내", v: sc(48, cnt.인성 * 14 + res.oheng[2] * 4) }
    ];
  }

  /* ── 전체 조립 ── */
  function tenGodTable(res) {
    return ["year", "month", "day", "hour"].map(function (k) {
      var p = res.pillars[k];
      if (!p) return { k: k, empty: true };
      return {
        k: k, ganHan: GAN[p.stem] + JI[p.branch], ganKo: GAN_KO[p.stem] + JI_KO[p.branch],
        stemSip: (k === "day" ? "일간(나)" : tenGodStem(res.dayMaster, p.stem)),
        branchSip: tenGodBranch(res.dayMaster, p.branch),
        stage: twelveStage(res.dayMaster, p.branch),
        napeum: napeum(p.stem, p.branch)
      };
    });
  }

  root.SajuDetail = {
    GAN: GAN, JI: JI, GAN_KO: GAN_KO, JI_KO: JI_KO, OHENG_KO: OHENG_KO,
    tenGodStem: tenGodStem, tenGodBranch: tenGodBranch,
    twelveStage: twelveStage, napeum: napeum,
    computeShinsal: computeShinsal, bodyStrength: bodyStrength, yongsin: yongsin,
    yearGanzhi: yearGanzhi, yearReading: yearReading,
    abilityScores: abilityScores, tenGodTable: tenGodTable
  };
  if (typeof module !== "undefined" && module.exports) module.exports = root.SajuDetail;
})(typeof window !== "undefined" ? window : this);
