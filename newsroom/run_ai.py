#!/usr/bin/env python3
"""실행 진입점.

검토·발행 흐름(예약 발행):
  python run_ai.py --review                 # 밤 검토: 돈/경제 + 일반 이슈 후보를 텔레그램으로
  python run_ai.py --review-money           # 돈/경제 후보만
  python run_ai.py --review-general         # 일반 이슈 후보만
  python run_ai.py --publish-next money     # 대기열에서 돈/경제 1건 발행(스케줄러가 시간대별 호출)
  python run_ai.py --publish-next general   # 대기열에서 일반 이슈 1건 발행
  python run_ai.py --publish-next           # 주제 무관 가장 오래된 1건 발행

테스트/기타:
  python run_ai.py --dry                    # 전송 없이 선별 결과만 출력
  python run_ai.py --generate               # 텔레그램 없이 카드/릴스까지 로컬 생성(발행 X)
  python run_ai.py --generate --publish     # 생성 + 즉시 인스타 발행
  python run_ai.py                          # (기본) --review 와 동일
"""

from __future__ import annotations

import argparse

from newsroom.config import load_config
from newsroom.store import Store


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default=None)
    ap.add_argument("--review", action="store_true", help="밤 검토: 돈/경제 + 일반 후보 전송")
    ap.add_argument("--review-money", action="store_true", help="돈/경제 후보만 전송")
    ap.add_argument("--review-general", action="store_true", help="일반 이슈 후보만 전송")
    ap.add_argument("--publish-next", nargs="?", const="", default=None,
                    metavar="TOPIC", help="대기열에서 1건 발행 (money|general, 생략 시 전체)")
    ap.add_argument("--dry", action="store_true", help="텔레그램 전송 없이 선별 결과만 출력")
    ap.add_argument("--generate", action="store_true", help="텔레그램 없이 카드/릴스까지 로컬 생성")
    ap.add_argument("--publish", action="store_true", help="--generate 와 함께: 즉시 인스타 발행")
    args = ap.parse_args()

    cfg = load_config(args.config)
    store = Store(cfg.state_file)

    # 예약 발행: 대기열에서 1건 발행 (작업 스케줄러가 시간대별로 호출)
    if args.publish_next is not None:
        from newsroom import pipeline
        topic = args.publish_next or None
        pipeline.publish_next(cfg, topic)
        return

    if args.dry:
        from newsroom import ai_filter
        from newsroom.collector import collect
        articles = collect(cfg)
        print(f"수집 {len(articles)}건")
        for c in ai_filter.select(cfg, articles):
            print(f"  [{c.topic}/{c.category}] {c.article.title}  ({c.score:.2f})\n      → {c.reason}")
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
    if args.review_money:
        pipeline.collect_and_review(cfg, store, topic="money",
                                    keep=int(cfg.get("schedule.money_review_keep", 4)))
    elif args.review_general:
        pipeline.collect_and_review(cfg, store, topic="general",
                                    keep=int(cfg.get("schedule.general_review_keep", 5)))
    else:  # --review (기본): 두 스트림 모두
        pipeline.review_all_streams(cfg, store)


if __name__ == "__main__":
    main()
