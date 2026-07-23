#!/usr/bin/env python3
"""텔레그램 승인 데몬: '발행' 버튼을 누르면 콘텐츠 생성/발행을 실행.

항상 켜 두는 프로세스(별도 터미널/서비스). run_ai.py 가 후보를 보내 두면,
여기서 버튼 콜백을 받아 generate_and_publish 를 돌린다.

사용:
  python run_ai_bot.py
  # 처음 실행 시, 봇에게 아무 메시지나 보내면 콘솔에 chat_id 가 찍힘 → .env 에 넣기
"""

from __future__ import annotations

from newsroom import pipeline, telegram_bot
from newsroom.config import load_config
from newsroom.models import Candidate
from newsroom.store import Store


def main() -> None:
    cfg = load_config()
    store = Store(cfg.state_file)

    def on_approve(cand: Candidate):
        # 예약 발행: 승인 즉시 발행하지 않고 생성/업로드 후 대기열에 적재
        return pipeline.stage_for_publish(cfg, cand)

    telegram_bot.poll_loop(cfg, store, on_approve)


if __name__ == "__main__":
    main()
