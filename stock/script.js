/* =========================================================================
 * 주가 예측 프로그램 (calcbox.kr/stock)
 * 실시간 시세 + 기술적 지표 + 몬테카를로 시뮬레이션으로 일자별 예상 주가 계산
 * 정적 페이지에서 동작하며, 실시간 데이터는 공개 소스에서 best-effort로 로딩.
 * 실패 시 예시 데이터로 폴백하여 항상 결과를 보여준다.
 * ========================================================================= */

"use strict";

/* ---------- 예시(폴백) 시드 데이터 : 파마리서치 214450 (스크린샷 기준) ---------- */
const SEED = {
  "214450": {
    name: "파마리서치", market: "KOSDAQ", code: "214450",
    price: 327500, prevClose: 318500,
    open: 314000, high: 329500, low: 300500,
    volume: 271491,
    per: 21.51, pbr: 5.43, eps: 15228,
    marketCap: "3조 4,026억", tradeValue: "856억",
    week52High: 713000, week52Low: 254500,
  },
};

/* ---------- 한국 증시 휴장일 (주말 외) : 2025~2027 주요 공휴일 ---------- */
const KR_HOLIDAYS = new Set([
  // 2025
  "2025-01-01","2025-01-28","2025-01-29","2025-01-30","2025-03-03","2025-05-05",
  "2025-05-06","2025-06-06","2025-08-15","2025-10-03","2025-10-06","2025-10-07",
  "2025-10-08","2025-10-09","2025-12-25","2025-12-31",
  // 2026
  "2026-01-01","2026-02-16","2026-02-17","2026-02-18","2026-03-02","2026-05-05",
  "2026-05-25","2026-06-08","2026-08-17","2026-09-24","2026-09-25","2026-09-26",
  "2026-10-05","2026-10-09","2026-12-25","2026-12-31",
  // 2027
  "2027-01-01","2027-02-08","2027-02-09","2027-02-10","2027-03-01","2027-05-05",
  "2027-05-13","2027-06-07","2027-08-16","2027-09-14","2027-09-15","2027-09-16",
  "2027-10-04","2027-10-11","2027-12-27","2027-12-31",
]);

/* =========================================================================
 * 유틸리티
 * ========================================================================= */
const $ = (id) => document.getElementById(id);
const won = (n) => Math.round(n).toLocaleString("ko-KR") + "원";
const num = (n) => Math.round(n).toLocaleString("ko-KR");
const pct = (n, d = 2) => (n >= 0 ? "+" : "") + n.toFixed(d) + "%";
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const ymd = (dt) => {
  const y = dt.getFullYear(), m = String(dt.getMonth() + 1).padStart(2, "0"), d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// 시드 기반 재현 가능한 난수 (폴백 히스토리 생성용)
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// 표준정규분포 난수 (Box-Muller)
function gauss(rng) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* =========================================================================
 * 기술적 지표
 * ========================================================================= */
function sma(arr, period) {
  if (arr.length < period) return null;
  let s = 0;
  for (let i = arr.length - period; i < arr.length; i++) s += arr[i];
  return s / period;
}
function rsi(closes, period = 14) {
  if (closes.length < period + 1) return 50;
  let gain = 0, loss = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gain += diff; else loss -= diff;
  }
  if (loss === 0) return 100;
  const rs = (gain / period) / (loss / period);
  return 100 - 100 / (1 + rs);
}
// 최근 window일 종가의 로그수익률 평균(drift)·표준편차(변동성)
function driftVol(closes, window = 60) {
  const n = Math.min(window, closes.length - 1);
  const rets = [];
  for (let i = closes.length - n; i < closes.length; i++) {
    if (i > 0 && closes[i - 1] > 0) rets.push(Math.log(closes[i] / closes[i - 1]));
  }
  const mean = rets.reduce((a, b) => a + b, 0) / (rets.length || 1);
  const varc = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length || 1);
  return { mu: mean, sigma: Math.sqrt(varc) || 0.02, n: rets.length };
}

/* =========================================================================
 * 데이터 로딩 (공개 소스 → CORS 프록시 폴백)
 * ========================================================================= */
const PROXIES = [
  (u) => u, // 직접 요청 (CORS 허용 시)
  (u) => "https://api.allorigins.win/raw?url=" + encodeURIComponent(u),
  (u) => "https://corsproxy.io/?url=" + encodeURIComponent(u),
  (u) => "https://thingproxy.freeboard.io/fetch/" + u,
];

async function fetchText(url, timeout = 8000) {
  for (const wrap of PROXIES) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(wrap(url), { signal: ctrl.signal, headers: { Accept: "*/*" } });
      clearTimeout(timer);
      if (res.ok) {
        const txt = await res.text();
        if (txt && txt.length > 2) return txt;
      }
    } catch (_) { /* 다음 프록시 시도 */ }
    finally { clearTimeout(timer); }
  }
  return null;
}

// 네이버 일봉 히스토리 (siseJson) 파싱 → [{date, open, high, low, close, volume}]
function parseNaverHistory(text) {
  try {
    const json = JSON.parse(text.replace(/'/g, '"').replace(/\n/g, "").replace(/,\s*]/g, "]"));
    const rows = json.slice(1).filter((r) => Array.isArray(r) && r.length >= 5);
    return rows.map((r) => ({
      date: String(r[0]), open: +r[1], high: +r[2], low: +r[3], close: +r[4], volume: +r[5] || 0,
    })).filter((r) => r.close > 0);
  } catch (_) { return null; }
}

async function fetchHistory(code) {
  const end = ymd(new Date()).replace(/-/g, "");
  const start = String(new Date().getFullYear() - 2) + "0101";
  const url = `https://api.finance.naver.com/siseJson.naver?symbol=${code}&requestType=1&startTime=${start}&endTime=${end}&timeframe=day`;
  const txt = await fetchText(url);
  if (!txt) return null;
  const hist = parseNaverHistory(txt);
  return hist && hist.length >= 20 ? hist : null;
}

// 실시간 시세 (네이버 폴링 API)
async function fetchQuote(code) {
  const url = `https://polling.finance.naver.com/api/realtime/domestic/stock/${code}`;
  const txt = await fetchText(url);
  if (!txt) return null;
  try {
    const j = JSON.parse(txt);
    const d = j?.datas?.[0];
    if (!d || !d.closePrice) return null;
    const toNum = (s) => +String(s).replace(/,/g, "");
    return {
      name: d.stockName || d.itemName || code,
      market: d.marketValue || "",
      code,
      price: toNum(d.closePrice),
      prevClose: toNum(d.closePrice) - toNum(d.compareToPreviousClosePrice || 0),
      change: toNum(d.compareToPreviousClosePrice || 0),
      changeRate: parseFloat(d.fluctuationsRatio || 0),
      open: toNum(d.openPrice || 0), high: toNum(d.highPrice || 0), low: toNum(d.lowPrice || 0),
      volume: toNum(d.accumulatedTradingVolume || 0),
    };
  } catch (_) { return null; }
}

// 폴백: 시드 현재가에서 역방향으로 그럴듯한 히스토리 생성 (변동성/추세 데모용)
function syntheticHistory(seed) {
  const rng = mulberry32(parseInt(seed.code, 10) || 214450);
  const days = 120;
  const raw = new Array(days);
  const target = seed.prevClose;               // 마지막 종가는 전일 종가에 맞춤
  let price = target * 0.85;                    // 시작점
  const anchor = target;
  for (let i = 0; i < days; i++) {
    const kappa = 0.045;                        // 평균회귀
    const drift = 0.0005;                       // 완만한 상승 추세
    const vol = 0.022;                          // 일 변동성 ~2.2%
    price = price * Math.exp(kappa * Math.log(anchor / price) + drift + vol * gauss(rng));
    raw[i] = price;
  }
  // 끝점을 전일 종가에 정렬하되 형태를 유지 (불연속 절벽 방지)
  const scale = target / raw[days - 1];
  const closes = raw.map((p) => Math.round(p * scale));
  const start = new Date();
  return closes.map((c, i) => {
    const dt = new Date(start); dt.setDate(dt.getDate() - (days - i));
    const hi = Math.round(c * (1 + 0.012 * rng())), lo = Math.round(c * (1 - 0.012 * rng()));
    return { date: ymd(dt).replace(/-/g, ""), open: c, high: hi, low: lo, close: c, volume: 0 };
  });
}

/* =========================================================================
 * 영업일 계산 (주말·공휴일 제외)
 * ========================================================================= */
function nextBusinessDays(n) {
  const out = [];
  const dt = new Date(); dt.setHours(0, 0, 0, 0);
  while (out.length < n) {
    dt.setDate(dt.getDate() + 1);
    const dow = dt.getDay();
    if (dow === 0 || dow === 6) continue;
    if (KR_HOLIDAYS.has(ymd(dt))) continue;
    out.push(new Date(dt));
  }
  return out;
}

/* =========================================================================
 * 몬테카를로 예측 엔진
 * ========================================================================= */
function forecast(closes, current, horizon, scenario) {
  const { mu, sigma } = driftVol(closes, 60);
  const sma5 = sma(closes, 5) || current;
  const sma20 = sma(closes, 20) || current;
  const sma60 = sma(closes, 60) || sma20;
  const rsiVal = rsi(closes, 14);

  // 시나리오별 추세 반영 강도(damping)와 평균회귀 강도(kappa)
  //  - 보수적: 추세 추종 약함 + 현재가로 강하게 회귀 → 좁고 평탄
  //  - 공격적: 추세 추종 강함 + 회귀 약함 → 추세를 넓게 외삽
  const damping = scenario === "con" ? 0.1 : scenario === "agg" ? 0.9 : 0.4;
  const kappa = scenario === "con" ? 0.1 : scenario === "agg" ? 0.015 : 0.04;

  // 추세 정렬 보정 (정배열 상승 / 역배열 하락)
  let trendAdj = 0;
  if (sma5 > sma20 && sma20 > sma60) trendAdj = sigma * 0.18;
  else if (sma5 < sma20 && sma20 < sma60) trendAdj = -sigma * 0.18;

  // RSI 과매수/과매도 보정 (50 기준 되돌림)
  const rsiAdj = ((50 - rsiVal) / 50) * sigma * 0.20;

  // 일간 조정 드리프트 (과도한 외삽 방지: ±2σ로 제한)
  const muAdj = clamp(mu * damping + trendAdj + rsiAdj, -2 * sigma, 2 * sigma);

  // 오른슈타인-울렌벡 방식: 현재가로 완만히 회귀시켜 폭주 방지
  const theta = Math.log(current); // 앵커 = 현재가 (이동평균 편향 배제)

  const M = 4000;
  const paths = new Array(horizon);
  for (let t = 0; t < horizon; t++) paths[t] = new Float64Array(M);

  const rng = mulberry32(987654321);
  for (let k = 0; k < M; k++) {
    let x = Math.log(current);
    for (let t = 0; t < horizon; t++) {
      x += kappa * (theta - x) + muAdj + sigma * gauss(rng);
      paths[t][k] = Math.exp(x);
    }
  }

  // 분위수 + 일간 상승확률
  const days = [];
  const dates = nextBusinessDays(horizon);
  let prevMid = current;
  for (let t = 0; t < horizon; t++) {
    const arr = paths[t];
    const sorted = Float64Array.from(arr).sort();
    const q = (p) => sorted[Math.floor(p * (M - 1))];
    // 전일(경로 내 t-1, t=0이면 현재가) 대비 상승 비율
    let up = 0;
    if (t === 0) {
      for (let k = 0; k < M; k++) if (arr[k] > current) up++;
    } else {
      const prev = paths[t - 1];
      for (let k = 0; k < M; k++) if (arr[k] > prev[k]) up++;
    }
    const mid = q(0.5);
    days.push({
      date: dates[t], p5: q(0.05), p25: q(0.25), p50: mid, p75: q(0.75), p95: q(0.95),
      upProb: up / M, prevMid,
    });
    prevMid = mid;
  }

  return { days, meta: { mu, muAdj, sigma, rsi: rsiVal, sma5, sma20, sma60, damping } };
}

/* =========================================================================
 * 렌더링
 * ========================================================================= */
function setBadge(kind, text) {
  const b = $("srcBadge");
  b.className = "src-badge " + kind;
  b.innerHTML = (kind === "loading" ? '<span class="spin"></span>' : "") + text;
}

function renderQuote(q, week52) {
  $("quoteCard").hidden = false;
  $("qName").innerHTML = `${q.name} <small>${q.code}${q.market ? " · " + q.market : ""}</small>`;
  $("qPrice").textContent = won(q.price);
  const cls = q.change > 0 ? "up" : q.change < 0 ? "down" : "flat";
  const arrow = q.change > 0 ? "▲" : q.change < 0 ? "▼" : "―";
  $("qChange").className = "change " + cls;
  $("qChange").textContent = `${arrow} ${num(Math.abs(q.change))} (${pct(q.changeRate)})`;

  // 52주 범위 막대
  if (week52 && week52.high > week52.low) {
    $("rangeBar").hidden = false;
    const p = clamp((q.price - week52.low) / (week52.high - week52.low), 0, 1) * 100;
    $("rangeDot").style.left = p + "%";
    $("lo52").textContent = "52주 최저 " + num(week52.low);
    $("hi52").textContent = "52주 최고 " + num(week52.high);
  }

  // 통계 그리드
  const rows = [
    ["전일", q.prevClose && num(q.prevClose)],
    ["시가", q.open && num(q.open)],
    ["고가", q.high && num(q.high)],
    ["저가", q.low && num(q.low)],
    ["거래량", q.volume && num(q.volume)],
    ["PER", q.per != null ? q.per + "배" : null],
    ["PBR", q.pbr != null ? q.pbr + "배" : null],
    ["EPS", q.eps != null ? num(q.eps) + "원" : null],
  ].filter((r) => r[1]);
  $("statGrid").innerHTML = rows.map((r) => `<div class="st"><span>${r[0]}</span><span>${r[1]}</span></div>`).join("");
}

function renderSignals(meta, q) {
  $("signalCard").hidden = false;
  const trendUp = meta.sma5 > meta.sma20 && meta.sma20 > meta.sma60;
  const trendDown = meta.sma5 < meta.sma20 && meta.sma20 < meta.sma60;
  const score = (trendUp ? 1 : trendDown ? -1 : 0)
    + (meta.rsi > 70 ? -1 : meta.rsi < 30 ? 1 : 0)
    + (meta.muAdj > 0 ? 1 : meta.muAdj < 0 ? -1 : 0);

  let verdict, sub, cls;
  if (score >= 2) { verdict = "상승 우위"; cls = "up"; sub = "추세·모멘텀이 상승에 무게를 싣고 있습니다"; }
  else if (score <= -2) { verdict = "하락 우위"; cls = "down"; sub = "추세·모멘텀이 하락에 무게를 싣고 있습니다"; }
  else { verdict = "중립 / 혼조"; cls = "flat"; sub = "뚜렷한 방향성이 약해 관망 구간입니다"; }
  $("verdictText").className = "big " + cls;
  $("verdictText").textContent = verdict;
  $("verdictSub").textContent = sub;

  const pill = (t, k) => `<span class="pill ${k}">${t}</span>`;
  const items = [
    ["추세 (5·20·60일선)", trendUp ? "정배열 (상승)" : trendDown ? "역배열 (하락)" : "혼조", trendUp ? "buy" : trendDown ? "sell" : "hold"],
    ["RSI(14) 과열도", meta.rsi.toFixed(0) + (meta.rsi > 70 ? " · 과매수" : meta.rsi < 30 ? " · 과매도" : " · 중립"),
      meta.rsi > 70 ? "sell" : meta.rsi < 30 ? "buy" : "hold"],
    ["연간 변동성(추정)", (meta.sigma * Math.sqrt(252) * 100).toFixed(0) + "%", "hold"],
    ["20일 이동평균", num(meta.sma20) + "원 대비 " + pct(((q.price - meta.sma20) / meta.sma20) * 100, 1),
      q.price > meta.sma20 ? "buy" : "sell"],
  ];
  $("signalList").innerHTML = items.map((it) =>
    `<li><span>${it[0]}</span>${pill(it[1], it[2])}</li>`).join("");
}

function renderForecast(res, current) {
  $("forecastCard").hidden = false;
  const body = $("forecastBody");
  body.innerHTML = res.days.map((d) => {
    const dstr = `${d.date.getMonth() + 1}/${d.date.getDate()} (${"일월화수목금토"[d.date.getDay()]})`;
    const chg = ((d.p50 - current) / current) * 100;
    const chgCls = d.p50 > current ? "up" : d.p50 < current ? "down" : "flat";
    const upPct = Math.round(d.upProb * 100);
    const barCls = upPct >= 50 ? "up" : "down";
    const barW = Math.max(4, Math.abs(upPct - 50) * 1.6);
    return `<tr>
      <td>${dstr}</td>
      <td class="mid">${num(d.p50)}<br><small class="${chgCls}">${pct(chg, 1)}</small></td>
      <td><small>${num(d.p5)} ~ ${num(d.p95)}</small></td>
      <td><span class="prob-bar ${barCls}" style="width:${barW}px;background:${upPct >= 50 ? "#e03131" : "#1c6fd6"}"></span> ${upPct}%</td>
    </tr>`;
  }).join("");
  // 요약: 마지막 예측일
  const last = res.days[res.days.length - 1];
  const lchg = ((last.p50 - current) / current) * 100;
  $("verdictSub").textContent += ` · ${res.days.length}영업일 후 예상 ${num(last.p50)}원 (${pct(lchg, 1)})`;
}

/* ---------- 캔버스 차트 ---------- */
function drawChart(histCloses, res, current) {
  $("chartCard").hidden = false;
  const canvas = $("chart");
  const wrap = $("chartWrap");
  const dpr = window.devicePixelRatio || 1;
  const cssW = Math.max(320, wrap.clientWidth), cssH = 300;
  canvas.width = cssW * dpr; canvas.height = cssH * dpr;
  canvas.style.width = cssW + "px"; canvas.style.height = cssH + "px";
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const padL = 8, padR = 62, padT = 14, padB = 22;
  const W = cssW - padL - padR, H = cssH - padT - padB;

  const hist = histCloses.slice(-60);
  const nH = hist.length, nF = res.days.length;
  const total = nH + nF;

  // y 범위
  let lo = Infinity, hi = -Infinity;
  hist.forEach((c) => { lo = Math.min(lo, c); hi = Math.max(hi, c); });
  res.days.forEach((d) => { lo = Math.min(lo, d.p5); hi = Math.max(hi, d.p95); });
  const padY = (hi - lo) * 0.08 || hi * 0.05;
  lo -= padY; hi += padY;
  const x = (i) => padL + (i / (total - 1)) * W;
  const y = (v) => padT + (1 - (v - lo) / (hi - lo)) * H;

  // 격자 + y축 라벨
  ctx.font = "11px system-ui, sans-serif"; ctx.textBaseline = "middle";
  ctx.strokeStyle = "#eef0f6"; ctx.fillStyle = "#9aa0ac";
  for (let g = 0; g <= 4; g++) {
    const v = lo + (hi - lo) * (g / 4), yy = y(v);
    ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(padL + W, yy); ctx.stroke();
    ctx.fillText(num(v), padL + W + 6, yy);
  }

  // 예측 밴드 (p5~p95) 채우기
  ctx.beginPath();
  for (let t = 0; t < nF; t++) { const xi = x(nH - 1 + t + 1); ctx[t === 0 ? "moveTo" : "lineTo"](xi, y(res.days[t].p95)); }
  for (let t = nF - 1; t >= 0; t--) { const xi = x(nH - 1 + t + 1); ctx.lineTo(xi, y(res.days[t].p5)); }
  ctx.closePath(); ctx.fillStyle = "rgba(59,91,219,0.12)"; ctx.fill();
  // p25~p75 밴드
  ctx.beginPath();
  for (let t = 0; t < nF; t++) { const xi = x(nH - 1 + t + 1); ctx[t === 0 ? "moveTo" : "lineTo"](xi, y(res.days[t].p75)); }
  for (let t = nF - 1; t >= 0; t--) { const xi = x(nH - 1 + t + 1); ctx.lineTo(xi, y(res.days[t].p25)); }
  ctx.closePath(); ctx.fillStyle = "rgba(59,91,219,0.18)"; ctx.fill();

  // 과거 종가 라인
  ctx.lineWidth = 1.8; ctx.strokeStyle = "#2b2d42"; ctx.beginPath();
  hist.forEach((c, i) => ctx[i === 0 ? "moveTo" : "lineTo"](x(i), y(c)));
  ctx.stroke();

  // 예측 중앙값 라인 (점선, 현재가에서 이어짐)
  ctx.lineWidth = 2; ctx.strokeStyle = "#3b5bdb"; ctx.setLineDash([5, 4]); ctx.beginPath();
  ctx.moveTo(x(nH - 1), y(current));
  res.days.forEach((d, t) => ctx.lineTo(x(nH - 1 + t + 1), y(d.p50)));
  ctx.stroke(); ctx.setLineDash([]);

  // 현재 시점 세로 구분선
  ctx.strokeStyle = "#c7cede"; ctx.setLineDash([3, 3]); ctx.beginPath();
  ctx.moveTo(x(nH - 1), padT); ctx.lineTo(x(nH - 1), padT + H); ctx.stroke(); ctx.setLineDash([]);
  // 현재가 점
  ctx.fillStyle = "#3b5bdb"; ctx.beginPath(); ctx.arc(x(nH - 1), y(current), 3.5, 0, 7); ctx.fill();

  $("chartLegend").innerHTML =
    `실선 = 최근 ${nH}일 종가 · 점선 = 예상 중앙값 · 진한 음영 = 50% 구간 · 옅은 음영 = 90% 구간`;
}

/* =========================================================================
 * 메인 실행
 * ========================================================================= */
let busy = false;
async function run() {
  if (busy) return;
  const err = $("errorMsg"); err.textContent = "";
  const code = ($("ticker").value || "").replace(/\D/g, "");
  if (code.length !== 6) { err.textContent = "종목코드 6자리를 입력하세요 (예: 214450)."; return; }

  const horizon = parseInt($("horizon").value, 10);
  const scenario = document.querySelector('input[name="scen"]:checked').value;
  const forceManual = $("forceManual").checked;
  const manualPrice = parseFloat(($("manualPrice").value || "").replace(/[^\d.]/g, "")) || null;

  busy = true;
  const btn = $("predictBtn"); btn.disabled = true; btn.textContent = "분석 중…";
  $("quoteCard").hidden = false;
  setBadge("loading", "실시간 데이터 불러오는 중…");

  let quote = null, history = null, isLive = false;

  if (!forceManual) {
    try {
      [quote, history] = await Promise.all([fetchQuote(code), fetchHistory(code)]);
    } catch (_) { /* 폴백 진행 */ }
    if (quote || history) isLive = true;
  }

  // 히스토리 확보 (실시간 → 시드/합성 폴백)
  const seed = SEED[code];
  if (!history) {
    if (seed) history = syntheticHistory(seed);
    else { // 알 수 없는 종목 + 실시간 실패
      busy = false; btn.disabled = false; btn.textContent = "실시간 분석 · 예측하기";
      setBadge("demo", "데이터 없음");
      err.textContent = "실시간 데이터를 불러오지 못했고 예시 데이터도 없는 종목입니다. 파마리서치(214450)로 시도하거나 잠시 후 다시 시도하세요.";
      return;
    }
  }
  const closes = history.map((h) => h.close);

  // 현재가 확정: 실시간 quote > 수동입력 > 시드 > 히스토리 마지막
  let current;
  if (quote && quote.price) current = quote.price;
  else if (manualPrice) current = manualPrice;
  else if (seed) current = seed.price;
  else current = closes[closes.length - 1];

  // 52주 범위: 히스토리에서 계산, 없으면 시드
  const recent = history.slice(-250);
  let week52 = {
    high: Math.max(...recent.map((h) => h.high || h.close)),
    low: Math.min(...recent.map((h) => h.low || h.close)),
  };
  if (seed && (!isLive)) week52 = { high: seed.week52High, low: seed.week52Low };

  // 시세 객체 구성 (부족한 필드는 시드로 보완)
  const q = {
    name: quote?.name || seed?.name || code,
    code, market: quote?.market || seed?.market || "",
    price: current,
    prevClose: quote?.prevClose || seed?.prevClose || closes[closes.length - 2] || current,
    open: quote?.open || seed?.open, high: quote?.high || seed?.high, low: quote?.low || seed?.low,
    volume: quote?.volume || seed?.volume,
    per: !isLive && seed ? seed.per : null,
    pbr: !isLive && seed ? seed.pbr : null,
    eps: !isLive && seed ? seed.eps : null,
  };
  q.change = q.price - q.prevClose;
  q.changeRate = q.prevClose ? (q.change / q.prevClose) * 100 : 0;

  // 배지
  if (isLive) setBadge("live", "🟢 실시간 데이터");
  else setBadge("demo", "예시 데이터 (실시간 로딩 실패 · 스크린샷 기준값)");

  renderQuote(q, week52);

  // 예측 실행 (무거운 계산이라 UI 먼저 그린 뒤 다음 프레임에 실행)
  await new Promise((r) => setTimeout(r, 30));
  const res = forecast(closes, current, horizon, scenario);
  window.__lastForecast = { res, current, q };
  window.__lastCloses = closes;

  renderSignals(res.meta, q);
  drawChart(closes, res, current);
  renderForecast(res, current);

  btn.disabled = false; btn.textContent = "실시간 분석 · 예측하기";
  busy = false;
  $("chartCard").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* ---------- 표 복사 ---------- */
function copyTable() {
  const f = window.__lastForecast;
  if (!f) return;
  const lines = ["날짜\t예상종가\t하단(5%)\t상단(95%)\t상승확률"];
  f.res.days.forEach((d) => {
    const dstr = `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, "0")}-${String(d.date.getDate()).padStart(2, "0")}`;
    lines.push(`${dstr}\t${Math.round(d.p50)}\t${Math.round(d.p5)}\t${Math.round(d.p95)}\t${Math.round(d.upProb * 100)}%`);
  });
  const text = `${f.q.name}(${f.q.code}) 현재가 ${Math.round(f.current)}원\n` + lines.join("\n");
  navigator.clipboard?.writeText(text).then(() => {
    const b = $("copyBtn"); const t = b.textContent; b.textContent = "복사됨 ✓";
    setTimeout(() => (b.textContent = t), 1500);
  });
}

/* ---------- 초기화 ---------- */
document.addEventListener("DOMContentLoaded", () => {
  $("year").textContent = new Date().getFullYear();
  $("predictBtn").addEventListener("click", run);
  $("copyBtn").addEventListener("click", copyTable);
  $("ticker").addEventListener("keydown", (e) => { if (e.key === "Enter") run(); });
  // 리사이즈 시 차트 다시 그림
  let rt;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      const f = window.__lastForecast;
      if (f && window.__lastCloses) drawChart(window.__lastCloses, f.res, f.current);
    }, 200);
  });
  // 애드센스 광고 로드
  try { (window.adsbygoogle = window.adsbygoogle || []).push({}); (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (_) {}
  // 첫 방문 시 자동으로 예시 예측 실행 (파마리서치)
  run();
});
