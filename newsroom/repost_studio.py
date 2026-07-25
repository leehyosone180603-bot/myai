#!/usr/bin/env python3
"""리포스트 스튜디오 (GUI) — 잘 나온 게시물을 번역해 대기열에 쌓는 전용 창.

  python repost_studio.py                    # 일본어 채널
  python repost_studio.py config/ai.ko.yaml  # 한국어 채널

왼쪽: 원문 캡션 붙여넣기 + 이미지 첨부 + 스트림(돈/이슈) 선택 → '대기열에 추가'
오른쪽: 대기열 목록(순번·스트림·제목·예상 발행 시각)과 개수를 한눈에.
밤 11시 뉴스 검토 흐름과 같은 대기열을 공유하므로, 예약 발행 시간대에 함께 나갑니다.
"""

from __future__ import annotations

import queue as _q
import sys
import threading
from tkinter import (Tk, Frame, Label, Button, Text, StringVar, END, WORD,
                     filedialog, LabelFrame, Radiobutton, BooleanVar, Checkbutton)
from tkinter import ttk

from newsroom.config import load_config
from newsroom import pipeline


class _Tee:
    def __init__(self, orig, q):
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


class Studio:
    def __init__(self, root: Tk, config_path: str | None = None):
        self.root = root
        self.cfg = load_config(config_path)
        lang = self.cfg.get("content.language", "ja")
        ch = {"ja": "🇯🇵 일본어", "ko": "🇰🇷 한국어"}.get(lang, lang)
        root.title(f"리포스트 스튜디오 · {ch}")
        self.logq: "_q.Queue[str]" = _q.Queue()
        self.image_path: str | None = None

        # ── 왼쪽: 입력 ──
        left = LabelFrame(root, text="새 리포스트", padx=10, pady=8)
        left.pack(side="left", fill="both", expand=True, padx=10, pady=10)

        Label(left, text="원문 캡션(복사해서 붙여넣기)").pack(anchor="w")
        self.caption = Text(left, height=12, width=44, wrap=WORD)
        self.caption.pack(fill="both", expand=True, pady=(0, 6))

        row = Frame(left)
        row.pack(fill="x", pady=2)
        Button(row, text="🖼 이미지 첨부", command=self.pick_image).pack(side="left")
        self.img_label = Label(row, text="(이미지 없음)", fg="#888")
        self.img_label.pack(side="left", padx=8)

        opt = Frame(left)
        opt.pack(fill="x", pady=6)
        Label(opt, text="스트림:").pack(side="left")
        self.topic = StringVar(value="general")
        Radiobutton(opt, text="💰 돈/경제", variable=self.topic, value="money").pack(side="left")
        Radiobutton(opt, text="🌐 이슈", variable=self.topic, value="general").pack(side="left")

        self.redraw = BooleanVar(value=True)
        Checkbutton(left, text="이미지 위에 일본어 카드 새로 그리기 (끄면 이미지 그대로 사용)",
                    variable=self.redraw).pack(anchor="w")
        self.make_reel = BooleanVar(value=True)
        Checkbutton(left, text="릴스(10초 영상)도 함께 생성", variable=self.make_reel).pack(anchor="w")

        Button(left, text="📥 번역해서 대기열에 추가", command=self.add_to_queue,
               bg="#2E7D32", fg="white", height=2).pack(fill="x", pady=(8, 4))
        self.status = Label(left, text="", fg="#555")
        self.status.pack(anchor="w")

        # ── 오른쪽: 대기열 현황 ──
        right = LabelFrame(root, text="발행 대기열", padx=10, pady=8)
        right.pack(side="right", fill="both", expand=True, padx=10, pady=10)
        self.counts = StringVar(value="대기열: 💰0 · 🌐0  (총 0개)")
        Label(right, textvariable=self.counts, font=("", 11, "bold")).pack(anchor="w")

        cols = ("seq", "topic", "kind", "title", "when")
        self.tree = ttk.Treeview(right, columns=cols, show="headings", height=14)
        for c, t, w in (("seq", "#", 34), ("topic", "스트림", 70), ("kind", "종류", 60),
                        ("title", "제목", 240), ("when", "예상 발행", 130)):
            self.tree.heading(c, text=t)
            self.tree.column(c, width=w, anchor="w")
        self.tree.pack(fill="both", expand=True, pady=6)
        Button(right, text="🔄 새로고침", command=self.refresh).pack(fill="x")

        # ── 로그 ──
        self.log = Text(root, height=6, wrap=WORD)
        self.log.pack(side="bottom", fill="x", padx=10, pady=(0, 10))

        sys.stdout = _Tee(sys.__stdout__, self.logq)
        self.refresh()
        self._drain()

    def pick_image(self):
        p = filedialog.askopenfilename(filetypes=[("이미지", "*.jpg *.jpeg *.png *.webp")])
        if p:
            self.image_path = p
            self.img_label.config(text=p.split("/")[-1].split("\\")[-1], fg="#2E7D32")

    def add_to_queue(self):
        text = self.caption.get("1.0", END).strip()
        if not text:
            self.status.config(text="원문 캡션을 붙여넣어 주세요.", fg="red")
            return
        if not self.image_path:
            self.status.config(text="이미지를 첨부해 주세요.", fg="red")
            return
        img, topic = self.image_path, self.topic.get()
        redraw, reel = self.redraw.get(), self.make_reel.get()
        self.status.config(text="생성 중… (번역→카드→업로드, 1~2분)", fg="#555")

        def work():
            try:
                b = pipeline.stage_repost(self.cfg, img, text, topic=topic,
                                          redraw=redraw, make_reel=reel)
                if b.card_paths or b.reel_path:
                    self.root.after(0, lambda: self._done_ok())
                else:
                    self.root.after(0, lambda: self.status.config(text="업로드 실패(스토리지 설정 확인)", fg="red"))
            except Exception as e:
                self.root.after(0, lambda: self.status.config(text=f"오류: {e}", fg="red"))
            self.root.after(0, self.refresh)

        threading.Thread(target=work, daemon=True).start()

    def _done_ok(self):
        self.status.config(text="✅ 대기열에 추가됨", fg="#2E7D32")
        self.caption.delete("1.0", END)
        self.image_path = None
        self.img_label.config(text="(이미지 없음)", fg="#888")

    def refresh(self):
        c = pipeline._queue(self.cfg).counts()
        total = sum(c.values())
        self.counts.set(f"대기열: 💰{c.get('money', 0)} · 🌐{c.get('general', 0)}  (총 {total}개)")
        for r in self.tree.get_children():
            self.tree.delete(r)
        for row in pipeline.queue_listing(self.cfg):
            tp = {"money": "💰돈", "general": "🌐이슈"}.get(row["topic"], row["topic"])
            kd = {"repost": "리포스트", "news": "뉴스"}.get(row["kind"], row["kind"])
            when = row["when"].strftime("%m/%d %H:%M") if row["when"] else "-"
            self.tree.insert("", END, values=(row["seq"], tp, kd, row["title"][:40], when))

    def _drain(self):
        try:
            while True:
                self.log.insert(END, self.logq.get_nowait())
                self.log.see(END)
        except _q.Empty:
            pass
        self.root.after(200, self._drain)


def main():
    config_path = sys.argv[1] if len(sys.argv) > 1 else None
    root = Tk()
    root.geometry("1040x680")
    Studio(root, config_path)
    root.mainloop()


if __name__ == "__main__":
    main()
