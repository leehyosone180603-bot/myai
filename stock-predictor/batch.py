#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
여러 종목 일괄 예측 (Batch Stock Predictor)
============================================
여러 국내 주식 종목을 한 번에 분석·예측해 요약 표로 보여준다.
predict.py의 예측 엔진(predict_stock)을 그대로 재사용한다.

사용법
------
    # 코드 여러 개 나열
    python batch.py 214450 005930 000660 035720

    # 쉼표로 구분해도 됨
    python batch.py 214450,005930,000660 --days 20

    # 파일에서 코드 목록 읽기 (한 줄에 하나, # 주석 허용)
    python batch.py --file tickers.txt --scenario aggressive --csv summary.csv

    # 오프라인(예시 데이터) 데모
    python batch.py 214450 --no-network

여러 종목을 동시에 조회하기 위해 스레드 풀을 사용한다(네트워크 대기 단축).
데이터를 못 가져온 종목은 표에 '실패'로 표시하고 나머지는 정상 처리한다.

⚠️ 참고용 시뮬레이션입니다. 투자 판단과 책임은 본인에게 있습니다.
"""

import argparse
import csv
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

from predict import predict_stock, diagnose, normalize_code, KRW, pad


def parse_codes(args):
    """CLI 인자·파일에서 종목코드 목록을 수집(중복 제거, 순서 유지)."""
    raw = []
    for token in args.codes:
        raw.extend(token.split(","))
    if args.file:
        with open(args.file, encoding="utf-8") as f:
            for line in f:
                line = line.split("#", 1)[0].strip()
                if line:
                    raw.extend(line.split(","))
    codes, seen = [], set()
    for r in raw:
        r = r.strip()
        if not r:
            continue
        try:
            c = normalize_code(r)
        except ValueError:
            print(f"  · 건너뜀(형식 오류): '{r}'", file=sys.stderr)
            continue
        if c not in seen:
            seen.add(c)
            codes.append(c)
    return codes


def run_one(code, args):
    """단일 종목 예측. 실패해도 예외를 던지지 않고 상태를 반환."""
    try:
        res = predict_stock(code, args.days, args.scenario, args.sims,
                            no_network=args.no_network)
        return {"code": code, "ok": True, "res": res}
    except Exception as e:  # 네트워크·데이터 오류를 종목 단위로 격리
        return {"code": code, "ok": False, "error": str(e)}


def summarize(results, days):
    """결과를 요약 표로 출력."""
    line = "=" * 82
    print("\n" + line)
    print(f"  여러 종목 일괄 예측 요약  ·  예측기간 {days}영업일")
    print(line)
    print("  " + pad("종목명", 14) + pad("코드", 8, ">") + pad("현재가", 11, ">")
          + pad("등락", 10, ">") + pad("진단", 8, ">") + pad("예상종가", 12, ">")
          + pad("변동", 9, ">") + pad("상승확률", 10, ">"))
    print("  " + "-" * 80)

    ok = [r for r in results if r["ok"]]
    for r in results:
        code = r["code"]
        if not r["ok"]:
            print("  " + pad("(실패)", 14) + pad(code, 8, ">") + "  " + r["error"][:44])
            continue
        res = r["res"]
        q, meta, fdays = res["q"], res["meta"], res["days"]
        last = fdays[-1]
        verdict, _, _ = diagnose(meta, q["price"])
        vshort = verdict.split()[0]           # '상승'/'하락'/'중립'
        chg = (last["p50"] - q["price"]) / q["price"] * 100
        name = (q["name"] or code)
        arrow = "▲" if q["change"] > 0 else "▼" if q["change"] < 0 else "―"
        print("  " + pad(name, 14) + pad(code, 8, ">") + pad(KRW(q["price"]), 11, ">")
              + pad(f"{arrow}{q['change_rate']:+.1f}%", 10, ">") + pad(vshort, 8, ">")
              + pad(KRW(last["p50"]), 12, ">") + pad(f"{chg:+.1f}%", 9, ">")
              + pad(f"{last['up_prob'] * 100:.0f}%", 10, ">"))
    print("  " + "-" * 80)
    print(f"  성공 {len(ok)} / 전체 {len(results)} 종목"
          f"{'  (예시 데이터 포함)' if any(not x['res']['is_live'] for x in ok) else ''}")
    print(line)
    print("  ⚠️ 참고용 시뮬레이션입니다. 투자 판단과 책임은 본인에게 있습니다.")
    print(line)


def save_summary_csv(path, results):
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["종목명", "코드", "현재가", "등락률(%)", "진단",
                    "예상종가(중앙값)", "예상변동(%)", "하단(5%)", "상단(95%)",
                    "상승확률(%)", "데이터"])
        for r in results:
            if not r["ok"]:
                w.writerow(["(실패)", r["code"], "", "", "", "", "", "", "", "", r["error"]])
                continue
            res = r["res"]
            q, last = res["q"], res["days"][-1]
            verdict, _, _ = diagnose(res["meta"], q["price"])
            chg = (last["p50"] - q["price"]) / q["price"] * 100
            w.writerow([q["name"], r["code"], round(q["price"]),
                        round(q["change_rate"], 2), verdict.split()[0],
                        round(last["p50"]), round(chg, 1), round(last["p5"]),
                        round(last["p95"]), round(last["up_prob"] * 100),
                        "실시간" if res["is_live"] else "예시"])
    print(f"  · 요약 CSV 저장: {path}")


def main(argv=None):
    ap = argparse.ArgumentParser(description="여러 국내 주식 종목 일괄 예측")
    ap.add_argument("codes", nargs="*", default=[],
                    help="종목코드들 (공백 또는 쉼표로 구분)")
    ap.add_argument("--file", metavar="PATH", help="종목코드 목록 파일(한 줄에 하나)")
    ap.add_argument("--days", type=int, default=10, help="예측 영업일 수 (기본 10)")
    ap.add_argument("--scenario", choices=["conservative", "neutral", "aggressive"],
                    default="neutral", help="예측 시나리오 (기본 neutral)")
    ap.add_argument("--sims", type=int, default=4000, help="몬테카를로 시뮬레이션 횟수")
    ap.add_argument("--workers", type=int, default=8, help="동시 조회 스레드 수")
    ap.add_argument("--csv", metavar="PATH", help="요약 결과 CSV 저장 경로")
    ap.add_argument("--no-network", action="store_true",
                    help="네트워크 없이 예시 데이터로만 실행")
    args = ap.parse_args(argv)

    codes = parse_codes(args)
    if not codes:
        print("오류: 예측할 종목코드를 하나 이상 지정하세요. "
              "예) python batch.py 214450 005930", file=sys.stderr)
        return 2

    print(f"\n  {len(codes)}개 종목 분석 중… "
          f"{'(오프라인)' if args.no_network else '(실시간 데이터 수집)'}\n")

    # 동시 조회 후 입력 순서대로 정렬
    results_by_code = {}
    workers = 1 if args.no_network else max(1, min(args.workers, len(codes)))
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futures = {ex.submit(run_one, c, args): c for c in codes}
        done = 0
        for fut in as_completed(futures):
            r = fut.result()
            results_by_code[r["code"]] = r
            done += 1
            status = "✓" if r["ok"] else "✗"
            print(f"    [{done}/{len(codes)}] {status} {r['code']}")
    results = [results_by_code[c] for c in codes]

    summarize(results, args.days)
    if args.csv:
        save_summary_csv(args.csv, results)
    return 0


if __name__ == "__main__":
    sys.exit(main())
