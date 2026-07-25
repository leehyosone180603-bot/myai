#!/usr/bin/env python3
"""발행 시간 편집기 — 예약 발행 시간대(슬롯)를 프로그램 안에서 직접 추가/변경/삭제.

저장하면 config/schedule_overrides.<lang>.yaml 에 기록되고, 내장 스케줄러가
매 루프 config 를 다시 읽으므로 변경이 즉시 반영된다.

  python schedule_editor.py                    # 일본어 채널
  python schedule_editor.py config/ai.ko.yaml  # 한국어 채널

또는 관리 패널/리포스트 스튜디오의 '⏰ 발행 시간 설정' 버튼으로 열림.
"""

from __future__ import annotations

import sys
from tkinter import (Tk, Toplevel, Frame, Label, Button, Entry, StringVar,
                     LabelFrame, messagebox, OptionMenu)

import yaml

from newsroom.config import ROOT, load_config

_TOPICS = ["money", "general"]
_TOPIC_LABEL = {"money": "💰 돈/경제", "general": "🌐 이슈"}


def _overrides_path(cfg) -> "Path":
    from pathlib import Path
    lang = cfg.get("content.language", "ja")
    return ROOT / "config" / f"schedule_overrides.{lang}.yaml"


class ScheduleEditor:
    def __init__(self, master, config_path: str | None = None, on_save=None):
        self.master = master
        self.config_path = config_path
        self.on_save = on_save
        self.cfg = load_config(config_path)
        self.rows: list[tuple] = []

        master.title("발행 시간 설정")
        Label(master, text="예약 발행 시간대 (돈 2 + 이슈 3 = 하루 5회 권장)",
              font=("", 11, "bold")).pack(anchor="w", padx=12, pady=(10, 2))
        Label(master, text="시간은 24시간제 HH:MM. 스케줄러/프로그램이 켜져 있어야 발행됩니다.",
              fg="#666").pack(anchor="w", padx=12)

        self.list_frame = LabelFrame(master, text="시간대", padx=10, pady=8)
        self.list_frame.pack(fill="both", expand=True, padx=12, pady=10)

        btns = Frame(master)
        btns.pack(fill="x", padx=12, pady=(0, 6))
        Button(btns, text="＋ 시간대 추가", command=self.add_row).pack(side="left")
        Button(btns, text="검토 시각도 변경", command=self.edit_review).pack(side="left", padx=6)
        Button(master, text="💾 저장 (즉시 반영)", command=self.save,
               bg="#2E7D32", fg="white").pack(fill="x", padx=12, pady=(0, 10))
        self.status = Label(master, text="", fg="#555")
        self.status.pack(anchor="w", padx=12, pady=(0, 8))

        self.review_hour = int(self.cfg.get("schedule.review_hour", 23))
        for slot in (self.cfg.get("schedule.slots", []) or []):
            self._make_row(str(slot.get("time", "08:00")), slot.get("topic", "general"))

    def _make_row(self, t: str, topic: str):
        row = Frame(self.list_frame)
        row.pack(fill="x", pady=2)
        tv = StringVar(value=t)
        tp = StringVar(value=topic if topic in _TOPICS else "general")
        Entry(row, textvariable=tv, width=8).pack(side="left")
        OptionMenu(row, tp, *_TOPICS).pack(side="left", padx=6)
        Label(row, textvariable=StringVar(value=""), width=1).pack(side="left")
        Button(row, text="삭제", command=lambda: self._del_row(row)).pack(side="left")
        self.rows.append((row, tv, tp))

    def _del_row(self, row):
        self.rows = [r for r in self.rows if r[0] is not row]
        row.destroy()

    def add_row(self):
        self._make_row("12:00", "general")

    def edit_review(self):
        from tkinter.simpledialog import askinteger
        v = askinteger("검토 시각", "밤 검토(후보 전송) 시각 (0~23시)",
                       initialvalue=self.review_hour, minvalue=0, maxvalue=23, parent=self.master)
        if v is not None:
            self.review_hour = v
            self.status.config(text=f"검토 시각 {v}시로 설정(저장 시 반영)", fg="#555")

    def save(self):
        slots = []
        for _row, tv, tp in self.rows:
            t = tv.get().strip()
            try:
                hh, mm = map(int, t.split(":"))
                assert 0 <= hh <= 23 and 0 <= mm <= 59
            except Exception:
                self.status.config(text=f"시간 형식 오류: '{t}' (HH:MM 이어야 함)", fg="red")
                return
            slots.append({"time": f"{hh:02d}:{mm:02d}", "topic": tp.get()})
        slots.sort(key=lambda s: s["time"])
        data = {"schedule": {"slots": slots, "review_hour": int(self.review_hour)}}
        path = _overrides_path(self.cfg)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            yaml.safe_dump(data, f, allow_unicode=True, sort_keys=False)
        self.status.config(text=f"저장됨 → {path.name} · 시간대 {len(slots)}개 (즉시 반영)", fg="#2E7D32")
        if self.on_save:
            self.on_save()


def open_editor(parent, config_path: str | None = None, on_save=None) -> Toplevel:
    top = Toplevel(parent)
    top.geometry("420x440")
    ScheduleEditor(top, config_path, on_save)
    return top


def main():
    config_path = sys.argv[1] if len(sys.argv) > 1 else None
    root = Tk()
    root.geometry("420x440")
    ScheduleEditor(root, config_path)
    root.mainloop()


if __name__ == "__main__":
    main()
