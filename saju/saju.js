/* ============================================================
 * 사주(四柱) 계산 엔진 — calcbox.kr
 * 생년월일시(양력) → 사주팔자 8글자 + 오행 분포 + 일간 특성
 *
 * 검증: korean_lunar_calendar(일진) 및 sxtwl(절기 기반 사주)
 *       ground truth와 대조하여 연주/월주/일주/시주 일치 확인.
 *
 * 규칙
 *  - 연주: 입춘(태양황경 315°) 기준으로 간지 연도 전환
 *  - 월주: 12절기(태양황경) 기준 월지 + 오호둔(五虎遁)으로 월간
 *  - 일주: (율리우스적일 + 49) mod 60, 자정(00:00) 기준
 *  - 시주: 오서둔(五鼠遁), 시각(현지 표준시) 기준
 * ============================================================ */
(function (root) {
  "use strict";

  var GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  var JI  = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

  var GAN_KO = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
  var JI_KO  = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];

  // 오행: 목0 화1 토2 금3 수4
  var GAN_OHENG = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];        // 갑을木 병정火 무기土 경신金 임계水
  var JI_OHENG  = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];  // 자水 축土 인묘木 진土 사오火 미土 신유金 술土 해水

  // 음양: 양0 음1 (천간·지지 모두 인덱스 짝=양, 홀=음)
  function ganYinYang(i) { return i % 2; }

  var DEG = Math.PI / 180;

  /* ---- 달력/천문 헬퍼 ---- */

  // 정오 기준 정수 율리우스적일(Julian Day Number)
  function toJDN(y, m, d) {
    var a = Math.floor((14 - m) / 12);
    var yy = y + 4800 - a;
    var mm = m + 12 * a - 3;
    return d + Math.floor((153 * mm + 2) / 5) + 365 * yy +
      Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  }

  // 현지 표준시 civil 시각 → 율리우스적일(UTC)
  function toJD(y, m, d, hour, min, tzHours) {
    var jdn = toJDN(y, m, d);
    var frac = (hour - 12) / 24 + min / 1440 - tzHours / 24;
    return jdn + frac;
  }

  // 태양의 겉보기 황경(도, [0,360)) — Meeus 저정밀(≈0.01°)
  function sunLongitude(jd) {
    var T = (jd - 2451545.0) / 36525;
    var L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    var M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    var Mr = (M % 360) * DEG;
    var C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr) +
      (0.019993 - 0.000101 * T) * Math.sin(2 * Mr) +
      0.000289 * Math.sin(3 * Mr);
    var trueLong = L0 + C;
    var Omega = 125.04 - 1934.136 * T;
    var lambda = trueLong - 0.00569 - 0.00478 * Math.sin(Omega * DEG);
    return ((lambda % 360) + 360) % 360;
  }

  // 태양황경이 target(도)이 되는 JD(UTC)를 jdGuess 근처에서 탐색
  function solarTermJD(target, jdGuess) {
    var jd = jdGuess;
    for (var i = 0; i < 8; i++) {
      var lam = sunLongitude(jd);
      var diff = (((target - lam) % 360) + 540) % 360 - 180; // (-180,180]
      jd += diff / 0.9856474;
    }
    return jd;
  }

  // 태양황경 → 월지 인덱스(자0…해11). 인월(寅)은 315°에서 시작.
  function monthBranchFromLon(lambda) {
    var k = Math.floor(((((lambda - 315) % 360) + 360) % 360) / 30);
    var byK = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1]; // 인묘진사오미신유술해자축
    return byK[k];
  }

  /* ---- 사주 계산 ---- */

  // opts: { tzHours: 표준시 오프셋(기본 +9, 한국), hourKnown: 출생시각 아는지(기본 true) }
  function computeSaju(y, m, d, hour, min, opts) {
    opts = opts || {};
    var tz = (typeof opts.tzHours === "number") ? opts.tzHours : 9;
    var hourKnown = (opts.hourKnown !== false);
    if (!hourKnown) { hour = 12; min = 0; } // 연월일주 계산용 정오값

    var jdBirth = toJD(y, m, d, hour, min, tz);
    var lambda = sunLongitude(jdBirth);

    // 연주 — 입춘 기준
    var ipchun = solarTermJD(315, toJD(y, 2, 4, 0, 0, tz));
    var effYear = (jdBirth >= ipchun) ? y : y - 1;
    var yearStem = (((effYear - 4) % 10) + 10) % 10;
    var yearBranch = (((effYear - 4) % 12) + 12) % 12;

    // 월주 — 절기 월지 + 오호둔 월간
    var monthBranch = monthBranchFromLon(lambda);
    var base = (yearStem % 5) * 2 + 2;               // 인월 천간 기준(오호둔)
    var mOrder = (((monthBranch - 2) % 12) + 12) % 12; // 인월=0
    var monthStem = (base + mOrder) % 10;

    // 일주 — (JDN + 49) mod 60, 자정 기준
    var jdn = toJDN(y, m, d);
    var dayIdx = (((jdn + 49) % 60) + 60) % 60;
    var dayStem = dayIdx % 10;
    var dayBranch = dayIdx % 12;

    // 시주 — 오서둔 + 시지
    var hourBranch = Math.floor(((hour + 1) % 24) / 2) % 12; // 23~00시=자
    var hbase = (dayStem % 5) * 2 % 10;                      // 자시 천간 기준(오서둔)
    var hourStem = (hbase + hourBranch) % 10;

    var pillars = {
      year:  { stem: yearStem,  branch: yearBranch },
      month: { stem: monthStem, branch: monthBranch },
      day:   { stem: dayStem,   branch: dayBranch },
      hour:  hourKnown ? { stem: hourStem, branch: hourBranch } : null
    };

    // 오행 분포(본기 기준) & 음양 — 시각 미상이면 6글자만 반영
    var oheng = [0, 0, 0, 0, 0];
    var yin = 0, yang = 0;
    ["year", "month", "day", "hour"].forEach(function (k) {
      var p = pillars[k];
      if (!p) return;
      oheng[GAN_OHENG[p.stem]]++;
      oheng[JI_OHENG[p.branch]]++;
      (ganYinYang(p.stem) ? yin++ : yang++);
      (p.branch % 2 ? yin++ : yang++);
    });

    return {
      pillars: pillars,
      hourKnown: hourKnown,
      dayMaster: dayStem,          // 일간
      oheng: oheng,                // [목,화,토,금,수]
      yinYang: { yin: yin, yang: yang },
      solarLongitude: lambda,
      ipchunJD: ipchun,
      effectiveYear: effYear
    };
  }

  /* ---- 표기 헬퍼 ---- */
  function ganjaHan(stem, branch) { return GAN[stem] + JI[branch]; }
  function ganjaKo(stem, branch) { return GAN_KO[stem] + JI_KO[branch]; }

  var api = {
    computeSaju: computeSaju,
    ganjaHan: ganjaHan,
    ganjaKo: ganjaKo,
    GAN: GAN, JI: JI, GAN_KO: GAN_KO, JI_KO: JI_KO,
    GAN_OHENG: GAN_OHENG, JI_OHENG: JI_OHENG,
    sunLongitude: sunLongitude, toJDN: toJDN, toJD: toJD
  };

  root.Saju = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : this);
