#!/usr/bin/python3
# -*- coding: utf-8 -*-
"""
백테스트 & 모델 보정 (Backtest & Calibration)
=============================================
예측 모델이 '실제로' 얼마나 맞는지 과거 데이터로 측정하고, 그 결과로
변동성 보정 배수(vol_scale)를 찾아 예측 구간을 보정한다.

워크포워드(walk-forward) 방식: 과거 각 시점 t에서 그 시점까지의 데이터만으로
h영업일 뒤를 예측한 뒤, 실제 값과 비교한다. (미래 정보 누수 없음)

측정 지표
--------
- 방향 적중률      : 예측 중앙값의 상승/하락 방향이 실제와 일치한 비율
                     (참고 기준: 무작위 50%, '항상 다수결' 비율)
- 90%/50% 포함율   : 실제 종가가 예측 구간 안에 든 비율 (구간 보정 정확도)
                     → 잘 보정된 모델은 각각 ≈90%, ≈50%
- MAE / MAPE       : 예측 중앙값의 절대오차 / 절대백분율오차
- RW 기준 MAE      : 랜덤워크(현재가 유지) 기준 오차 → 스킬 = 1 - MAE/기준
                     (양수면 모델이 단순 기준보다 나음)

사용법
------
    python backtest.py 214450
    python backtest.py 005930 --horizons 1,5,10,20 --scenario neutral
    python backtest.py 214450 --no-network            # 예시 데이터로 시연
    python backtest.py 214450 --csv backtest.csv

⚠️ 백테스트가 좋아도 미래 수익을 보장하지 않습니다. 참고용입니다.
"""

import argparse
import csv
import sys

from predict import (model_params, analytic_quantiles, normalize_code, pad,
                     SEED, load_data, synthetic_history)


def evaluate(closes, horizons, scenario, vol_scale, min_hist=60, step=1):
    """워크포워드 백테스트. horizon별 누적 지표 dict 반환."""
    maxh = max(horizons)
    stats = {h: dict(n=0, dir_hit=0, act_up=0, cov90=0, cov50=0,
                     ae=0.0, ape=0.0, base_ae=0.0) for h in horizons}
    start = max(min_hist, 5)
    for i in range(start, len(closes) - maxh, step):
        upto = closes[:i + 1]
        cur = closes[i]
        if cur <= 0:
            continue
        params = model_params(upto, cur, scenario, vol_scale)
        an = analytic_quantiles(cur, params, maxh)
        for h in horizons:
            qd = an[h - 1]
            actual = closes[i + h]
            st = stats[h]
            st["n"] += 1
            st["dir_hit"] += 1 if (qd[0.5] > cur) == (actual > cur) else 0
            st["act_up"] += 1 if actual > cur else 0
            st["cov90"] += 1 if qd[0.05] <= actual <= qd[0.95] else 0
            st["cov50"] += 1 if qd[0.25] <= actual <= qd[0.75] else 0
            st["ae"] += abs(qd[0.5] - actual)
            st["ape"] += abs(qd[0.5] - actual) / actual
            st["base_ae"] += abs(cur - actual)      # 랜덤워크(현재가 유지) 기준
    return stats


def finalize(st):
    n = max(st["n"], 1)
    mae, base = st["ae"] / n, st["base_ae"] / n
    up_rate = st["act_up"] / n
    return {
        "n": st["n"], "dir": st["dir_hit"] / n,
        "majority": max(up_rate, 1 - up_rate), "up_rate": up_rate,
        "cov90": st["cov90"] / n, "cov50": st["cov50"] / n,
        "mae": mae, "mape": st["ape"] / n * 100,
        "base_mae": base, "skill": (1 - mae / base) if base else 0.0,
    }


def overall_cov90(closes, horizons, scenario, vol_scale, min_hist, step):
    """전체 horizon 합산 90% 포함율(보정 목표용)."""
    stats = evaluate(closes, horizons, scenario, vol_scale, min_hist, step)
    tot = sum(s["n"] for s in stats.values())
    cov = sum(s["cov90"] for s in stats.values())
    return cov / tot if tot else 0.0


def calibrate(closes, horizons, scenario, min_hist, step, target=0.90):
    """90% 포함율이 target에 가장 가깝도록 vol_scale를 탐색(단조 증가 → 이분 탐색)."""
    lo, hi = 0.5, 2.0
    cov_lo = overall_cov90(closes, horizons, scenario, lo, min_hist, step)
    cov_hi = overall_cov90(closes, horizons, scenario, hi, min_hist, step)
    # 경계에서 이미 target 밖이면 경계값 반환
    if cov_lo >= target:
        return lo, cov_lo
    if cov_hi <= target:
        return hi, cov_hi
    for _ in range(18):
        mid = (lo + hi) / 2
        cov = overall_cov90(closes, horizons, scenario, mid, min_hist, step)
        if cov < target:
            lo = mid
        else:
            hi = mid
    scale = round((lo + hi) / 2, 2)
    return scale, overall_cov90(closes, horizons, scenario, scale, min_hist, step)


def load_closes(code, no_network):
    """백테스트용 종가 시계열과 실시간 여부를 반환."""
    history, _quote, is_live = load_data(code, no_network)
    seed = SEED.get(code)
    if not history:
        if seed:
            history = synthetic_history(seed, code)
            is_live = False
        else:
            raise ValueError(f"'{code}' 데이터를 가져오지 못했고 예시 데이터도 없습니다.")
    return [h["close"] for h in history], history, is_live


def print_report(code, name, is_live, horizons, base_stats, cal_stats,
                 scenario, vol_scale, n_periods, span):
    line = "=" * 78
    print("\n" + line)
    print(f"  백테스트 결과  ·  {name} ({code})  ·  시나리오 {scenario}")
    src = "🟢 실시간" if is_live else "예시 데이터"
    print(f"  데이터: {src}  ·  평가 시점 {n_periods}개  ·  기간 {span}")
    print(line)
    print("  " + pad("예측기간", 10) + pad("방향적중", 10, ">") + pad("(다수결)", 10, ">")
          + pad("90%포함", 9, ">") + pad("50%포함", 9, ">")
          + pad("MAPE", 8, ">") + pad("RW대비스킬", 12, ">"))
    print("  " + "-" * 74)
    for h in horizons:
        f = finalize(base_stats[h])
        print("  " + pad(f"{h}일", 10) + pad(f"{f['dir'] * 100:.0f}%", 10, ">")
              + pad(f"{f['majority'] * 100:.0f}%", 10, ">")
              + pad(f"{f['cov90'] * 100:.0f}%", 9, ">")
              + pad(f"{f['cov50'] * 100:.0f}%", 9, ">")
              + pad(f"{f['mape']:.1f}%", 8, ">")
              + pad(f"{f['skill'] * 100:+.0f}%", 12, ">"))
    print("  " + "-" * 74)
    print("  · 방향적중: 무작위=50%. '다수결'은 항상 우세 방향을 찍었을 때 적중률(기준선).")
    print("  · 90%/50%포함: 실제가 예측 구간에 든 비율. 잘 보정되면 ≈90%, ≈50%.")
    print("  · RW대비스킬: 랜덤워크(현재가 유지) 대비 오차 개선율. 양수면 더 정확.")

    # ---- 보정 결과 ----
    base_cov = sum(base_stats[h]["cov90"] for h in horizons) / \
        max(sum(base_stats[h]["n"] for h in horizons), 1)
    print(line)
    print("  📐 구간 보정 (Calibration)")
    print(f"     보정 전 90% 포함율(전체): {base_cov * 100:.0f}%  "
          f"(목표 90%)")
    print(f"     권장 변동성 배수: --vol-scale {vol_scale}")
    new_cov = sum(cal_stats[h]["cov90"] for h in horizons) / \
        max(sum(cal_stats[h]["n"] for h in horizons), 1)
    print(f"     보정 후 90% 포함율(전체): {new_cov * 100:.0f}%")
    print(f"\n     ▶ 적용:  python predict.py {code} --vol-scale {vol_scale}")
    print(line)
    print("  ⚠️ 백테스트 성적이 미래 수익을 보장하지 않습니다. 참고용입니다.")
    print(line)


def main(argv=None):
    ap = argparse.ArgumentParser(description="예측 모델 백테스트 & 변동성 보정")
    ap.add_argument("code", nargs="?", default="214450", help="종목코드 (기본 214450)")
    ap.add_argument("--horizons", default="1,5,10",
                    help="평가 예측기간(영업일), 쉼표 구분 (기본 1,5,10)")
    ap.add_argument("--scenario", choices=["conservative", "neutral", "aggressive"],
                    default="neutral")
    ap.add_argument("--min-hist", type=int, default=60,
                    help="예측 시작에 필요한 최소 과거일 (기본 60)")
    ap.add_argument("--step", type=int, default=1, help="평가 시점 간격 (기본 1)")
    ap.add_argument("--no-calibrate", action="store_true", help="보정 탐색 생략")
    ap.add_argument("--csv", metavar="PATH", help="지표 CSV 저장")
    ap.add_argument("--no-network", action="store_true", help="예시 데이터로 실행")
    args = ap.parse_args(argv)

    try:
        code = normalize_code(args.code)
    except ValueError as e:
        print(f"오류: {e}", file=sys.stderr)
        return 2
    horizons = sorted({int(x) for x in args.horizons.split(",") if x.strip()})

    print("\n  과거 데이터로 백테스트 중…\n" if not args.no_network else "")
    try:
        closes, history, is_live = load_closes(code, args.no_network)
    except ValueError as e:
        print(f"오류: {e}", file=sys.stderr)
        return 1
    if len(closes) < args.min_hist + max(horizons) + 20:
        print("오류: 백테스트에 필요한 과거 데이터가 부족합니다.", file=sys.stderr)
        return 1

    seed = SEED.get(code)
    name = seed["name"] if seed else code
    span = f"{history[0]['date']}~{history[-1]['date']}"

    base_stats = evaluate(closes, horizons, args.scenario, 1.0,
                          args.min_hist, args.step)
    n_periods = base_stats[horizons[0]]["n"]

    if args.no_calibrate:
        vol_scale, cal_stats = 1.0, base_stats
    else:
        vol_scale, _ = calibrate(closes, horizons, args.scenario,
                                 args.min_hist, args.step)
        cal_stats = evaluate(closes, horizons, args.scenario, vol_scale,
                             args.min_hist, args.step)

    print_report(code, name, is_live, horizons, base_stats, cal_stats,
                 args.scenario, vol_scale, n_periods, span)

    if args.csv:
        with open(args.csv, "w", newline="", encoding="utf-8-sig") as f:
            w = csv.writer(f)
            w.writerow(["horizon", "n", "방향적중", "다수결기준", "90%포함",
                        "50%포함", "MAE", "MAPE(%)", "RW기준MAE", "스킬",
                        "보정후_90%포함", "vol_scale"])
            for h in horizons:
                b, c = finalize(base_stats[h]), finalize(cal_stats[h])
                w.writerow([h, b["n"], round(b["dir"], 3), round(b["majority"], 3),
                            round(b["cov90"], 3), round(b["cov50"], 3),
                            round(b["mae"]), round(b["mape"], 2),
                            round(b["base_mae"]), round(b["skill"], 3),
                            round(c["cov90"], 3), vol_scale])
        print(f"  · 지표 CSV 저장: {args.csv}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
