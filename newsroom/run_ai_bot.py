#!/usr/bin/env python3
"""승인 데몬 + 내장 스케줄러 (항상 켜두는 프로세스).

- 텔레그램 '발행' 버튼 → 생성/업로드 후 발행 대기열 적재(예약).
- 내장 스케줄러: 설정된 시간대에 대기열 자동 발행 + 밤 검토 후보 전송.
  (발행 시간은 '⏰ 발행 시간 설정' 편집기로 프로그램 안에서 변경 가능)

사용:
  python run_ai_bot.py                    # 일본어 채널
  python run_ai_bot.py config/ai.ko.yaml  # 한국어 채널
  (또는 start_bot.bat / autostart_bot.bat)
"""

from __future__ import annotations

import sys
import threading

from newsroom import pipeline, scheduler, telegram_bot
from newsroom.config import load_config
from newsroom.models import Candidate
from newsroom.store import Store


def main() -> None:
    config_path = sys.argv[1] if len(sys.argv) > 1 else None
    cfg = load_config(config_path)
    store = Store(cfg.state_file)

    # 내장 스케줄러(시간대 자동 발행 + 밤 검토)를 백그라운드로 시작
    threading.Thread(target=lambda: scheduler.run_scheduler(config_path, log=print),
                     daemon=True).start()

    def on_approve(cand: Candidate):
        # 예약 발행: 승인 즉시 발행하지 않고 생성/업로드 후 대기열에 적재
        return pipeline.stage_for_publish(cfg, cand)

    telegram_bot.poll_loop(cfg, store, on_approve)


if __name__ == "__main__":
    main()
