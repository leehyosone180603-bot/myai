#!/usr/bin/env python3
"""매일 실행 진입점: 수집 → AI 1차 선별 → 텔레그램 검토 요청.

크론(launchd/crontab)에서 하루 1~여러 번 호출.
승인 처리는 별도 데몬 run_ai_bot.py 가 담당한다.

사용:
  python run_ai.py                 # 전체(수집→선별→전송)
  python run_ai.py --dry           # 전송 없이 선별 결과만 콘솔 출력
"""

from __future__ import annotations

import argparse

from newsroom.config import load_config
from newsroom.store import Store


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default=None)
    ap.add_argument("--dry", action="store_true", help="텔레그램 전송 없이 선별 결과만 출력")
    args = ap.parse_args()

    cfg = load_config(args.config)
    store = Store(cfg.state_file)

    if args.dry:
        from newsroom import ai_filter
        from newsroom.collector import collect
        articles = collect(cfg)
        print(f"수집 {len(articles)}건")
        for c in ai_filter.select(cfg, articles):
            print(f"  [{c.category}] {c.article.title}  ({c.score:.2f})\n      → {c.reason}")
        return

    from newsroom import pipeline
    pipeline.collect_and_review(cfg, store)


if __name__ == "__main__":
    main()
