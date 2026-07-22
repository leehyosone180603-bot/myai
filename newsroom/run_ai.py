#!/usr/bin/env python3
"""매일 실행 진입점: 수집 → AI 1차 선별 → 텔레그램 검토 요청.

크론(launchd/crontab)에서 하루 1~여러 번 호출.
승인 처리는 별도 데몬 run_ai_bot.py 가 담당한다.

사용:
  python run_ai.py                 # 전체(수집→선별→텔레그램 전송)
  python run_ai.py --dry           # 전송 없이 선별 결과만 콘솔 출력
  python run_ai.py --generate      # 텔레그램 없이 카드/릴스까지 로컬 생성(발행 X) → out/
  python run_ai.py --generate --publish   # 생성 + 인스타 발행까지
"""

from __future__ import annotations

import argparse

from newsroom.config import load_config
from newsroom.store import Store


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default=None)
    ap.add_argument("--dry", action="store_true", help="텔레그램 전송 없이 선별 결과만 출력")
    ap.add_argument("--generate", action="store_true",
                    help="텔레그램 없이 선별 후보로 카드/릴스까지 로컬 생성")
    ap.add_argument("--publish", action="store_true",
                    help="--generate 와 함께: 인스타 발행까지 진행(기본은 발행 안 함)")
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

    if args.generate:
        from newsroom import ai_filter, pipeline
        from newsroom.collector import collect
        articles = collect(cfg)
        print(f"수집 {len(articles)}건")
        cands = ai_filter.select(cfg, articles)
        print(f"선별 {len(cands)}건 → 콘텐츠 생성 시작 (발행={'O' if args.publish else 'X'})\n")
        for i, c in enumerate(cands, 1):
            print(f"─── [{i}/{len(cands)}] {c.article.title[:50]} ───")
            pipeline.generate_and_publish(cfg, c, publish=args.publish)
            print()
        print(f"✅ 완료. 결과물은 {cfg.out_dir} 폴더를 확인하세요.")
        return

    from newsroom import pipeline
    pipeline.collect_and_review(cfg, store)


if __name__ == "__main__":
    main()
