#!/usr/bin/env python3
"""뉴스룸 관리 패널 (GUI) — 클릭만으로 검토·발행·대기열 관리.

  python control_panel.py   (또는 panel.bat 더블클릭)

버튼:
  ① 승인 봇 시작   : 텔레그램 '발행' 버튼 처리(→ 대기열 적재) 데몬을 백그라운드로 실행
  ② 검토 후보 보내기: 지금 수집→선별→텔레그램 전송(💰돈 + 🌐이슈)
  💰/🌐/전체 발행  : 대기열에서 즉시 인스타 발행
상단에 대기열 수(💰/🌐)와 봇 상태를 실시간 표시, 아래에 로그 출력.

※ 이 패널의 '승인 봇'과 start_bot.bat 를 동시에 켜지 마세요(텔레그램 409 충돌).
"""

from __future__ import annotations

import queue as _q
import sys
import threading
from tkinter import (Tk, Frame, Label, Button, Text, StringVar, END, DISABLED, WORD)

from newsroom.config import load_config
from newsroom.store import Store
from newsroom import pipeline, telegram_bot


class _Tee:
    """print 출력을 원래 콘솔과 GUI 로그창 양쪽으로 흘려보낸다."""
    def __init__(self, orig, q: "_q.Queue"):
        self.orig, self.q = orig, q

    def write(self, s):
        try:
            if self.orig:
                self.orig.write(s)
        except Exception:
            pass
        self.q.put(s)

    def flush(self):
        try:
            if self.orig:
                self.orig.flush()
        except Exception:
            pass


class Panel:
    def __init__(self, root: Tk):
        self.root = root
        root.title("뉴스룸 관리 패널")
        self.cfg = load_config()
        self.store = Store(self.cfg.state_file)
        self.bot_thread: threading.Thread | None = None
        self.logq: "_q.Queue[str]" = _q.Queue()

        top = Frame(root, padx=12, pady=10)
        top.pack(fill="x")
        self.status = StringVar(value="봇: 꺼짐")
        self.qtext = StringVar(value="대기열: 💰0 · 🌐0")
        Label(top, textvariable=self.status, font=("", 11, "bold")).pack(side="left")
        Label(top, textvariable=self.qtext, font=("", 11)).pack(side="right")

        b = Frame(root, padx=10)
        b.pack(fill="x")
        self.bot_btn = Button(b, text="① 승인 봇 시작", command=self.start_bot,
                              bg="#2E7D32", fg="white", height=2)
        self.bot_btn.grid(row=0, column=0, sticky="ew", padx=3, pady=3)
        Button(b, text="② 검토 후보 보내기(지금)", height=2,
               command=lambda: self._bg(self._review)).grid(row=0, column=1, sticky="ew", padx=3, pady=3)
        Button(b, text="🔄 새로고침", height=2,
               command=self.refresh).grid(row=0, column=2, sticky="ew", padx=3, pady=3)
        Button(b, text="💰 돈 1개 발행", height=2,
               command=lambda: self._bg(lambda: pipeline.publish_next(self.cfg, "money"))
               ).grid(row=1, column=0, sticky="ew", padx=3, pady=3)
        Button(b, text="🌐 이슈 1개 발행", height=2,
               command=lambda: self._bg(lambda: pipeline.publish_next(self.cfg, "general"))
               ).grid(row=1, column=1, sticky="ew", padx=3, pady=3)
        Button(b, text="전체 대기열 발행", height=2,
               command=lambda: self._bg(self._publish_all)).grid(row=1, column=2, sticky="ew", padx=3, pady=3)
        for i in range(3):
            b.columnconfigure(i, weight=1)

        self.log = Text(root, height=18, wrap=WORD)
        self.log.pack(fill="both", expand=True, padx=12, pady=10)

        sys.stdout = _Tee(sys.__stdout__, self.logq)
        print("뉴스룸 관리 패널 시작. ① 승인 봇 시작 → ② 검토 후보 보내기 순서로 사용하세요.")
        self.refresh()
        self._drain_log()

    # ── 백그라운드 실행(UI 안 멈추게) ────────────────────────────
    def _bg(self, fn):
        threading.Thread(target=self._wrap, args=(fn,), daemon=True).start()

    def _wrap(self, fn):
        try:
            fn()
        except Exception as e:
            print(f"[오류] {e}")
        self.root.after(0, self.refresh)

    def _review(self):
        pipeline.review_all_streams(self.cfg, self.store)

    def _publish_all(self):
        n = 0
        while pipeline.publish_next(self.cfg, "money"):
            n += 1
        while pipeline.publish_next(self.cfg, "general"):
            n += 1
        print(f"전체 발행 완료: {n}건" if n else "발행할 대기 항목이 없습니다.")

    def start_bot(self):
        if self.bot_thread and self.bot_thread.is_alive():
            print("봇이 이미 실행 중입니다.")
            return

        def run():
            def on_approve(c):
                return pipeline.stage_for_publish(self.cfg, c)
            telegram_bot.poll_loop(self.cfg, self.store, on_approve)

        self.bot_thread = threading.Thread(target=run, daemon=True)
        self.bot_thread.start()
        self.status.set("봇: 켜짐 (승인 대기)")
        self.bot_btn.config(text="✅ 봇 실행 중", state=DISABLED)
        print("승인 봇 시작 — 텔레그램 '발행' 버튼을 기다립니다. (start_bot.bat 는 켜지 마세요)")

    def refresh(self):
        c = pipeline._queue(self.cfg).counts()
        self.qtext.set(f"대기열: 💰{c.get('money', 0)} · 🌐{c.get('general', 0)}")

    def _drain_log(self):
        try:
            while True:
                line = self.logq.get_nowait()
                self.log.insert(END, line)
                self.log.see(END)
        except _q.Empty:
            pass
        self.root.after(200, self._drain_log)


def main():
    root = Tk()
    root.geometry("820x560")
    Panel(root)
    root.mainloop()


if __name__ == "__main__":
    main()
