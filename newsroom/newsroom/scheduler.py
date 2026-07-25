"""프로그램 내장 스케줄러 — 설정된 시간대에 대기열을 발행(+밤 검토).

Windows 작업 스케줄러 대신, 승인 데몬과 같은 프로세스에서 백그라운드로 돈다.
매 루프마다 config 를 다시 읽으므로, 발행 시간 편집기(schedule_editor)로 바꾼
시간이 즉시 반영된다. (프로그램/데몬이 켜져 있어야 동작)
"""

from __future__ import annotations

import time as _time
from datetime import datetime
from typing import Callable

from .config import load_config
from .store import Store


def run_scheduler(config_path: str | None = None,
                  log: Callable[[str], None] = print,
                  should_stop: Callable[[], bool] | None = None) -> None:
    should_stop = should_stop or (lambda: False)
    fired: set = set()
    log("⏰ 스케줄러 시작 — 발행 시간대를 감시합니다.")
    while not should_stop():
        try:
            cfg = load_config(config_path)                 # 매 루프 리로드 → 편집 즉시 반영
            now = datetime.now()
            today = now.strftime("%Y-%m-%d")
            fired = {k for k in fired if k[0] == today}     # 오늘 것만 유지

            for slot in cfg.get("schedule.slots", []) or []:
                t = str(slot.get("time", ""))
                topic = slot.get("topic")
                try:
                    hh, mm = map(int, t.split(":"))
                except ValueError:
                    continue
                key = (today, "pub", t, topic)
                if now.hour == hh and now.minute == mm and key not in fired:
                    fired.add(key)
                    from . import pipeline
                    log(f"⏰ [{t}] {topic} 발행 시도")
                    try:
                        pipeline.publish_next(cfg, topic)
                    except Exception as e:
                        log(f"   발행 오류: {e}")

            review_hour = int(cfg.get("schedule.review_hour", 23))
            rkey = (today, "review")
            if now.hour == review_hour and now.minute == 0 and rkey not in fired:
                fired.add(rkey)
                from . import pipeline
                log("⏰ 밤 검토 — 후보 전송")
                try:
                    pipeline.review_all_streams(cfg, Store(cfg.state_file))
                except Exception as e:
                    log(f"   검토 오류: {e}")
        except Exception as e:
            log(f"스케줄러 오류(계속): {e}")
        _time.sleep(20)                                    # 분 단위 감지(분당 최소 1회 확인)
