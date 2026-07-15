#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
주가 예측 프로그램 (Stock Price Predictor)
===========================================
하나의 국내 주식 종목에 대해 실시간 주가 흐름과 현재 상황을 파악하고,
기술적 지표 + 몬테카를로 시뮬레이션으로 '일자별 예상 주가'를 예측한다.

예시 종목: 파마리서치 (214450, KOSDAQ)

특징
----
- 실시간/일봉 데이터를 네이버 금융에서 직접 수집 (브라우저 CORS 제약 없음).
  선택적으로 FinanceDataReader가 설치돼 있으면 더 풍부한 소스를 사용.
- 네트워크 실패 시 예시(시드) 데이터로 자동 폴백해 항상 결과를 출력.
- 5·20·60일 이동평균, RSI(14), 변동성/드리프트 추정.
- 몬테카를로 시뮬레이션(오른슈타인-울렌벡 평균회귀)으로 영업일별
  예상 종가(중앙값), 90%/50% 신뢰구간, 상승확률을 계산.
- 결과를 콘솔 표로 출력하고, CSV / 차트(PNG, matplotlib 있을 때)로 저장.

사용법
------
    python predict.py                      # 파마리서치, 10 영업일
    python predict.py 005930 --days 20     # 삼성전자, 20 영업일
    python predict.py 214450 --scenario aggressive --chart out.png --csv out.csv

핵심 계산은 표준 라이브러리만으로 동작한다. matplotlib / FinanceDataReader는
설치돼 있으면 자동 사용, 없으면 건너뛴다.

⚠️ 투자 유의: 본 프로그램은 과거 통계에 기반한 참고용 시뮬레이션이며,
투자 자문이나 수익 보장 예측이 아니다. 투자 판단과 책임은 이용자 본인에게 있다.
"""

import argparse
import csv
import datetime as dt
import json
import math
import random
import sys
import urllib.request

# ---------------------------------------------------------------------------
# 예시(폴백) 시드 데이터 : 파마리서치 214450 (2026-07-15 종가 기준)
# ---------------------------------------------------------------------------
SEED = {
    "214450": {
        "name": "파마리서치", "market": "KOSDAQ",
        "price": 327500, "prev_close": 318500,
        "open": 314000, "high": 329500, "low": 300500, "volume": 271491,
        "per": 21.51, "pbr": 5.43, "eps": 15228,
        "week52_high": 713000, "week52_low": 254500,
    },
}

# 한국 증시 휴장일(주말 외) : 2025~2027 주요 공휴일
KR_HOLIDAYS = {
    # 2025
    "2025-01-01", "2025-01-28", "2025-01-29", "2025-01-30", "2025-03-03",
    "2025-05-05", "2025-05-06", "2025-06-06", "2025-08-15", "2025-10-03",
    "2025-10-06", "2025-10-07", "2025-10-08", "2025-10-09", "2025-12-25", "2025-12-31",
    # 2026
    "2026-01-01", "2026-02-16", "2026-02-17", "2026-02-18", "2026-03-02",
    "2026-05-05", "2026-05-25", "2026-06-08", "2026-08-17", "2026-09-24",
    "2026-09-25", "2026-09-26", "2026-10-05", "2026-10-09", "2026-12-25", "2026-12-31",
    # 2027
    "2027-01-01", "2027-02-08", "2027-02-09", "2027-02-10", "2027-03-01",
    "2027-05-05", "2027-05-13", "2027-06-07", "2027-08-16", "2027-09-14",
    "2027-09-15", "2027-09-16", "2027-10-04", "2027-10-11", "2027-12-27", "2027-12-31",
}

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}


# ===========================================================================
# 데이터 수집
# ===========================================================================
def _http_get(url, timeout=8):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return res.read().decode("utf-8", "replace")


def fetch_history_naver(code, years=2):
    """네이버 일봉(siseJson) → [{date, open, high, low, close, volume}] (오래된→최신)."""
    today = dt.date.today()
    start = today.replace(year=today.year - years).strftime("%Y%m%d")
    end = today.strftime("%Y%m%d")
    url = (f"https://api.finance.naver.com/siseJson.naver?symbol={code}"
           f"&requestType=1&startTime={start}&endTime={end}&timeframe=day")
    text = _http_get(url)
    # 응답은 작은따옴표·개행이 섞인 유사 JSON. 정규화 후 파싱.
    cleaned = text.replace("'", '"').replace("\n", "").replace("\t", "")
    rows = json.loads(cleaned)
    out = []
    for r in rows[1:]:  # 첫 행은 헤더
        if not isinstance(r, list) or len(r) < 5:
            continue
        try:
            out.append({
                "date": str(r[0]), "open": float(r[1]), "high": float(r[2]),
                "low": float(r[3]), "close": float(r[4]),
                "volume": float(r[5]) if len(r) > 5 else 0.0,
            })
        except (ValueError, TypeError):
            continue
    return [x for x in out if x["close"] > 0]


def fetch_history_fdr(code, years=2):
    """FinanceDataReader가 있으면 사용(선택)."""
    import FinanceDataReader as fdr  # noqa: 지연 임포트
    start = (dt.date.today().replace(year=dt.date.today().year - years)).strftime("%Y-%m-%d")
    df = fdr.DataReader(code, start)
    out = []
    for idx, row in df.iterrows():
        out.append({
            "date": idx.strftime("%Y%m%d"),
            "open": float(row["Open"]), "high": float(row["High"]),
            "low": float(row["Low"]), "close": float(row["Close"]),
            "volume": float(row.get("Volume", 0) or 0),
        })
    return [x for x in out if x["close"] > 0]


def fetch_realtime_naver(code):
    """네이버 실시간 폴링 API에서 현재가 등을 best-effort로 수집."""
    url = f"https://polling.finance.naver.com/api/realtime/domestic/stock/{code}"
    text = _http_get(url)
    j = json.loads(text)
    # 응답 구조가 버전에 따라 달라 방어적으로 탐색.
    datas = None
    if isinstance(j, dict):
        if "datas" in j:
            datas = j["datas"]
        elif "result" in j and isinstance(j["result"], dict):
            areas = j["result"].get("areas") or []
            if areas:
                datas = areas[0].get("datas")
    if not datas:
        return None
    d = datas[0]

    def g(*keys):
        for k in keys:
            if k in d and d[k] not in (None, ""):
                return d[k]
        return None

    def to_num(v):
        if v is None:
            return None
        return float(str(v).replace(",", ""))

    price = to_num(g("closePrice", "nv", "sv"))
    if not price:
        return None
    change = to_num(g("compareToPreviousClosePrice", "cv")) or 0.0
    rf = str(g("compareToPreviousPrice.code", "rf") or "")
    # 방향 코드가 하락(3,4,5)이면 변화량 음수로 보정
    if rf in ("3", "4", "5") and change > 0:
        change = -change
    ratio = to_num(g("fluctuationsRatio", "cr"))
    if ratio is None and price - change:
        ratio = change / (price - change) * 100
    return {
        "name": g("stockName", "nm", "name"),
        "price": price,
        "prev_close": price - change,
        "change": change,
        "change_rate": ratio if ratio is not None else 0.0,
        "open": to_num(g("openPrice", "ov")),
        "high": to_num(g("highPrice", "hv")),
        "low": to_num(g("lowPrice", "lv")),
        "volume": to_num(g("accumulatedTradingVolume", "aq")),
    }


def synthetic_history(seed, code):
    """폴백: 시드 종가에서 그럴듯한 일봉 히스토리 생성(변동성/추세 데모용)."""
    rng = random.Random(int(code) if code.isdigit() else 214450)
    days, target = 120, seed["prev_close"]
    price, anchor = target * 0.85, target
    raw = []
    for _ in range(days):
        z = rng.gauss(0, 1)
        price = price * math.exp(0.045 * math.log(anchor / price) + 0.0005 + 0.022 * z)
        raw.append(price)
    scale = target / raw[-1]  # 끝점을 전일 종가에 정렬(형태 유지)
    closes = [round(p * scale) for p in raw]
    today = dt.date.today()
    out = []
    for i, c in enumerate(closes):
        d = today - dt.timedelta(days=(days - i))
        out.append({"date": d.strftime("%Y%m%d"), "open": c,
                    "high": round(c * 1.01), "low": round(c * 0.99),
                    "close": c, "volume": 0.0})
    return out


# ===========================================================================
# 기술적 지표
# ===========================================================================
def sma(values, period):
    if len(values) < period:
        return None
    return sum(values[-period:]) / period


def rsi(closes, period=14):
    if len(closes) < period + 1:
        return 50.0
    gain = loss = 0.0
    for i in range(len(closes) - period, len(closes)):
        diff = closes[i] - closes[i - 1]
        if diff >= 0:
            gain += diff
        else:
            loss -= diff
    if loss == 0:
        return 100.0
    rs = (gain / period) / (loss / period)
    return 100 - 100 / (1 + rs)


def drift_vol(closes, window=60):
    """최근 window일 로그수익률의 평균(drift)·표준편차(변동성)."""
    n = min(window, len(closes) - 1)
    rets = [math.log(closes[i] / closes[i - 1])
            for i in range(len(closes) - n, len(closes))
            if i > 0 and closes[i - 1] > 0]
    if not rets:
        return 0.0, 0.02
    mean = sum(rets) / len(rets)
    var = sum((r - mean) ** 2 for r in rets) / len(rets)
    return mean, (math.sqrt(var) or 0.02)


# ===========================================================================
# 영업일 계산 (주말·공휴일 제외)
# ===========================================================================
def next_business_days(n, start=None):
    d = start or dt.date.today()
    out = []
    while len(out) < n:
        d = d + dt.timedelta(days=1)
        if d.weekday() >= 5:                     # 토(5)·일(6)
            continue
        if d.strftime("%Y-%m-%d") in KR_HOLIDAYS:
            continue
        out.append(d)
    return out


# ===========================================================================
# 몬테카를로 예측 엔진
# ===========================================================================
def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def forecast(closes, current, horizon, scenario="neutral", sims=4000, seed=987654321):
    mu, sigma = drift_vol(closes, 60)
    s5 = sma(closes, 5) or current
    s20 = sma(closes, 20) or current
    s60 = sma(closes, 60) or s20
    rsi_val = rsi(closes, 14)

    # 시나리오별: 추세추종 강도(damping)와 평균회귀 강도(kappa)
    damping = {"conservative": 0.1, "neutral": 0.4, "aggressive": 0.9}[scenario]
    kappa = {"conservative": 0.10, "neutral": 0.04, "aggressive": 0.015}[scenario]

    trend_adj = 0.0
    if s5 > s20 > s60:
        trend_adj = sigma * 0.18
    elif s5 < s20 < s60:
        trend_adj = -sigma * 0.18
    rsi_adj = ((50 - rsi_val) / 50) * sigma * 0.20
    mu_adj = clamp(mu * damping + trend_adj + rsi_adj, -2 * sigma, 2 * sigma)

    theta = math.log(current)                    # 앵커 = 현재가 (이동평균 편향 배제)
    rng = random.Random(seed)

    # 시뮬레이션: 경로별로 진행하며 각 스텝의 가격을 열 단위로 저장
    cols = [[0.0] * sims for _ in range(horizon)]
    for k in range(sims):
        x = math.log(current)
        for t in range(horizon):
            x += kappa * (theta - x) + mu_adj + sigma * rng.gauss(0, 1)
            cols[t][k] = math.exp(x)

    dates = next_business_days(horizon)
    days = []
    prev_col = None
    for t in range(horizon):
        col = cols[t]
        s = sorted(col)

        def q(p, s=s):
            return s[min(len(s) - 1, int(p * (len(s) - 1)))]

        if t == 0:
            up = sum(1 for v in col if v > current)
        else:
            up = sum(1 for a, b in zip(col, prev_col) if a > b)
        days.append({
            "date": dates[t], "p5": q(0.05), "p25": q(0.25), "p50": q(0.5),
            "p75": q(0.75), "p95": q(0.95), "up_prob": up / sims,
        })
        prev_col = col

    meta = {"mu": mu, "mu_adj": mu_adj, "sigma": sigma, "rsi": rsi_val,
            "s5": s5, "s20": s20, "s60": s60,
            "ann_vol": sigma * math.sqrt(252)}
    return days, meta


# ===========================================================================
# 출력
# ===========================================================================
KRW = lambda n: f"{round(n):,}"  # noqa: E731


def diagnose(meta, current):
    up = meta["s5"] > meta["s20"] > meta["s60"]
    down = meta["s5"] < meta["s20"] < meta["s60"]
    score = (1 if up else -1 if down else 0)
    score += (-1 if meta["rsi"] > 70 else 1 if meta["rsi"] < 30 else 0)
    score += (1 if meta["mu_adj"] > 0 else -1 if meta["mu_adj"] < 0 else 0)
    if score >= 2:
        verdict = "상승 우위 ▲"
    elif score <= -2:
        verdict = "하락 우위 ▼"
    else:
        verdict = "중립 / 혼조 ―"
    return verdict, up, down


def print_report(code, q, meta, days, is_live, scenario):
    line = "=" * 60
    print(line)
    market = f" · {q['market']}" if q.get("market") else ""
    print(f"  {q['name']} ({code}{market})")
    src = "🟢 실시간 데이터" if is_live else "예시 데이터 (실시간 실패 · 시드값)"
    print(f"  데이터: {src}   |   시나리오: {scenario}")
    print(line)

    arrow = "▲" if q["change"] > 0 else "▼" if q["change"] < 0 else "―"
    print(f"  현재가  {KRW(q['price'])}원   {arrow} {KRW(abs(q['change']))} "
          f"({q['change_rate']:+.2f}%)")
    parts = []
    if q.get("prev_close"):
        parts.append(f"전일 {KRW(q['prev_close'])}")
    if q.get("open"):
        parts.append(f"시가 {KRW(q['open'])}")
    if q.get("high"):
        parts.append(f"고가 {KRW(q['high'])}")
    if q.get("low"):
        parts.append(f"저가 {KRW(q['low'])}")
    if q.get("volume"):
        parts.append(f"거래량 {KRW(q['volume'])}")
    if parts:
        print("  " + "  |  ".join(parts))
    if q.get("week52_high"):
        pos = (q["price"] - q["week52_low"]) / (q["week52_high"] - q["week52_low"]) * 100
        print(f"  52주 {KRW(q['week52_low'])} ~ {KRW(q['week52_high'])}  (현재 위치 {pos:.0f}%)")

    print(line)
    verdict, up, down = diagnose(meta, q["price"])
    trend = "정배열(상승)" if up else "역배열(하락)" if down else "혼조"
    rsi_s = "과매수" if meta["rsi"] > 70 else "과매도" if meta["rsi"] < 30 else "중립"
    print(f"  현재 상황 진단:  {verdict}")
    print(f"    · 추세(5/20/60일선): {trend}   ({KRW(meta['s5'])} / "
          f"{KRW(meta['s20'])} / {KRW(meta['s60'])})")
    print(f"    · RSI(14): {meta['rsi']:.0f} ({rsi_s})    "
          f"· 연변동성(추정): {meta['ann_vol'] * 100:.0f}%")

    print(line)
    print("  일자별 예상 주가")
    print(f"  {'날짜':<12}{'예상종가':>12}{'전일대비':>10}{'예상범위(90%)':>24}{'상승확률':>9}")
    print("  " + "-" * 65)
    wd = "월화수목금토일"
    for d in days:
        date = d["date"]
        label = f"{date.month:>2}/{date.day:02d}({wd[date.weekday()]})"
        chg = (d["p50"] - q["price"]) / q["price"] * 100
        rng_s = f"{KRW(d['p5'])} ~ {KRW(d['p95'])}"
        print(f"  {label:<12}{KRW(d['p50']):>12}{chg:>+9.1f}%"
              f"{rng_s:>24}{d['up_prob'] * 100:>8.0f}%")
    last = days[-1]
    lchg = (last["p50"] - q["price"]) / q["price"] * 100
    print("  " + "-" * 65)
    print(f"  → {len(days)}영업일 후 예상 {KRW(last['p50'])}원 ({lchg:+.1f}%), "
          f"범위 {KRW(last['p5'])} ~ {KRW(last['p95'])}")
    print(line)
    print("  ⚠️ 참고용 시뮬레이션입니다. 투자 판단과 책임은 본인에게 있습니다.")
    print(line)


def save_csv(path, code, q, days):
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["종목", q["name"], code, "현재가", round(q["price"])])
        w.writerow(["날짜", "예상종가(중앙값)", "하단(5%)", "1사분위(25%)",
                    "3사분위(75%)", "상단(95%)", "상승확률(%)"])
        for d in days:
            w.writerow([d["date"].strftime("%Y-%m-%d"), round(d["p50"]),
                        round(d["p5"]), round(d["p25"]), round(d["p75"]),
                        round(d["p95"]), round(d["up_prob"] * 100)])
    print(f"  · CSV 저장: {path}")


def save_chart(path, code, q, closes, days):
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        import matplotlib.dates as mdates
    except ImportError:
        print("  · (matplotlib 미설치 → 차트 생략)")
        return
    # 한글 폰트 설정은 figure 생성 전에 적용해야 제목까지 반영된다.
    plt.rcParams["font.family"] = ["Malgun Gothic", "AppleGothic",
                                   "NanumGothic", "DejaVu Sans"]
    plt.rcParams["axes.unicode_minus"] = False
    hist = closes[-60:]
    today = dt.date.today()
    hist_dates = [today - dt.timedelta(days=(len(hist) - i)) for i in range(len(hist))]
    fdates = [d["date"] for d in days]
    fig, ax = plt.subplots(figsize=(10, 4.5))
    ax.plot(hist_dates, hist, color="#2b2d42", lw=1.6, label="과거 종가(60일)")
    fx = [today] + fdates
    ax.plot(fx, [q["price"]] + [d["p50"] for d in days], "--",
            color="#3b5bdb", lw=2, label="예상 중앙값")
    ax.fill_between(fdates, [d["p5"] for d in days], [d["p95"] for d in days],
                    color="#3b5bdb", alpha=0.12, label="90% 구간")
    ax.fill_between(fdates, [d["p25"] for d in days], [d["p75"] for d in days],
                    color="#3b5bdb", alpha=0.20, label="50% 구간")
    ax.axvline(today, color="#c7cede", ls=":", lw=1)
    ax.set_title(f"{q['name']} ({code}) 주가 예측")
    ax.legend(loc="upper left", fontsize=8)
    ax.grid(True, color="#eef0f6")
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%m/%d"))
    fig.tight_layout()
    fig.savefig(path, dpi=130)
    print(f"  · 차트 저장: {path}")


# ===========================================================================
# 메인
# ===========================================================================
def load_data(code, no_network):
    """(history, quote_or_None, is_live) 반환."""
    history, quote, is_live = None, None, False
    if not no_network:
        # 히스토리: FinanceDataReader 우선, 실패 시 네이버
        for fetch in (fetch_history_fdr, fetch_history_naver):
            try:
                h = fetch(code)
                if h and len(h) >= 20:
                    history = h
                    is_live = True
                    break
            except Exception:
                continue
        try:
            quote = fetch_realtime_naver(code)
            if quote:
                is_live = True
        except Exception:
            quote = None
    return history, quote, is_live


def main(argv=None):
    ap = argparse.ArgumentParser(
        description="국내 주식 실시간 분석 + 일자별 예상 주가 예측")
    ap.add_argument("code", nargs="?", default="214450",
                    help="종목코드 6자리 (기본: 214450 파마리서치)")
    ap.add_argument("--days", type=int, default=10, help="예측 영업일 수 (기본 10)")
    ap.add_argument("--scenario", choices=["conservative", "neutral", "aggressive"],
                    default="neutral", help="예측 시나리오 (기본 neutral)")
    ap.add_argument("--sims", type=int, default=4000, help="몬테카를로 시뮬레이션 횟수")
    ap.add_argument("--csv", metavar="PATH", help="예측 결과 CSV 저장 경로")
    ap.add_argument("--chart", metavar="PATH", help="차트 PNG 저장 경로")
    ap.add_argument("--manual-price", type=float, help="현재가 직접 지정(원)")
    ap.add_argument("--no-network", action="store_true",
                    help="네트워크 없이 예시 데이터로만 실행")
    args = ap.parse_args(argv)

    code = "".join(ch for ch in args.code if ch.isdigit())
    if len(code) != 6:
        print("오류: 종목코드는 숫자 6자리여야 합니다 (예: 214450).", file=sys.stderr)
        return 2

    print("\n  실시간 데이터 수집 중…\n" if not args.no_network else "")
    history, quote, is_live = load_data(code, args.no_network)

    seed = SEED.get(code)
    if not history:
        if seed:
            history = synthetic_history(seed, code)
        else:
            print(f"오류: '{code}' 실시간 데이터를 가져오지 못했고 예시 데이터도 "
                  "없습니다. 파마리서치(214450)로 시도하거나 네트워크를 확인하세요.",
                  file=sys.stderr)
            return 1
    closes = [h["close"] for h in history]

    # 현재가 확정: 실시간 > 수동입력 > 시드 > 히스토리 마지막
    if quote and quote.get("price"):
        current = quote["price"]
    elif args.manual_price:
        current = args.manual_price
    elif seed:
        current = seed["price"]
    else:
        current = closes[-1]

    # 52주 범위: 실시간 히스토리에서 계산, 폴백이면 시드
    recent = history[-250:]
    if is_live:
        w52_high = max(h["high"] or h["close"] for h in recent)
        w52_low = min(h["low"] or h["close"] for h in recent)
    elif seed:
        w52_high, w52_low = seed["week52_high"], seed["week52_low"]
    else:
        w52_high = max(h["high"] for h in recent)
        w52_low = min(h["low"] for h in recent)

    prev_close = (quote.get("prev_close") if quote else None) \
        or (seed["prev_close"] if seed else None) \
        or (closes[-2] if len(closes) > 1 else current)
    q = {
        "name": (quote and quote.get("name")) or (seed and seed["name"]) or code,
        "market": seed["market"] if seed else "",
        "price": current, "prev_close": prev_close,
        "open": (quote and quote.get("open")) or (seed and seed.get("open")),
        "high": (quote and quote.get("high")) or (seed and seed.get("high")),
        "low": (quote and quote.get("low")) or (seed and seed.get("low")),
        "volume": (quote and quote.get("volume")) or (seed and seed.get("volume")),
        "week52_high": w52_high, "week52_low": w52_low,
    }
    q["change"] = q["price"] - q["prev_close"]
    q["change_rate"] = (q["change"] / q["prev_close"] * 100) if q["prev_close"] else 0.0

    days, meta = forecast(closes, current, args.days, args.scenario, args.sims)

    print_report(code, q, meta, days, is_live, args.scenario)
    if args.csv:
        save_csv(args.csv, code, q, days)
    if args.chart:
        save_chart(args.chart, code, q, closes, days)
    return 0


if __name__ == "__main__":
    sys.exit(main())
