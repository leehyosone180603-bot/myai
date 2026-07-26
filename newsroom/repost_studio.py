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
from tkinter import (Tk, Toplevel, Frame, Label, Button, Text, StringVar, END, WORD,
                     filedialog, LabelFrame, Radiobutton, BooleanVar, Checkbutton)
from tkinter import ttk

from PIL import Image, ImageTk

from newsroom.config import load_config
from newsroom import pipeline


def _open_file(path: str):
    """파일(또는 URL)을 OS 기본 앱으로 연다 — 릴스 영상 재생 확인용."""
    import os
    import subprocess
    import sys
    try:
        if sys.platform.startswith("win"):
            os.startfile(path)                         # type: ignore[attr-defined]
        elif sys.platform == "darwin":
            subprocess.Popen(["open", path])
        else:
            subprocess.Popen(["xdg-open", path])
    except Exception as e:
        print(f"파일 열기 실패: {e}")


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
        self.config_path = config_path
        self.cfg = load_config(config_path)
        lang = self.cfg.get("content.language", "ja")
        ch = {"ja": "🇯🇵 일본어", "ko": "🇰🇷 한국어"}.get(lang, lang)
        root.title(f"리포스트 스튜디오 · {ch}")
        self.logq: "_q.Queue[str]" = _q.Queue()
        self.image_path: str | None = None
        self.detail_images: list[str] = []

        # ── 왼쪽: 입력 ──
        left = LabelFrame(root, text="새 리포스트", padx=10, pady=8)
        left.pack(side="left", fill="both", expand=True, padx=10, pady=10)

        Label(left, text="원문 캡션(복사해서 붙여넣기)").pack(anchor="w")
        self.caption = Text(left, height=12, width=44, wrap=WORD)
        self.caption.pack(fill="both", expand=True, pady=(0, 6))

        row = Frame(left)
        row.pack(fill="x", pady=2)
        Button(row, text="🖼 ① 표지 이미지", command=self.pick_image).pack(side="left")
        self.img_label = Label(row, text="(없음)", fg="#888")
        self.img_label.pack(side="left", padx=8)

        drow = Frame(left)
        drow.pack(fill="x", pady=2)
        Button(drow, text="➕ ② 상세 이미지 추가", command=self.add_detail).pack(side="left")
        Button(drow, text="비우기", command=self.clear_details).pack(side="left", padx=4)
        self.detail_label = Label(drow, text="상세 0장 (선택)", fg="#888")
        self.detail_label.pack(side="left", padx=8)

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

        Button(left, text="👁 미리보기 만들기 (번역→카드)", command=self.make_preview,
               bg="#1565C0", fg="white", height=2).pack(fill="x", pady=(8, 4))
        self.status = Label(left, text="", fg="#555", wraplength=380, justify="left")
        self.status.pack(anchor="w")

        # ── 오른쪽: 대기열 현황 ──
        right = LabelFrame(root, text="발행 대기열", padx=10, pady=8)
        right.pack(side="right", fill="both", expand=True, padx=10, pady=10)
        self.counts = StringVar(value="대기열: 💰0 · 🌐0  (총 0개)")
        Label(right, textvariable=self.counts, font=("", 11, "bold")).pack(anchor="w")

        cols = ("seq", "topic", "kind", "title", "status", "when")
        self.tree = ttk.Treeview(right, columns=cols, show="headings", height=14)
        for c, t, w in (("seq", "#", 30), ("topic", "스트림", 62), ("kind", "종류", 58),
                        ("title", "제목", 210), ("status", "상태", 74), ("when", "예상 발행", 110)):
            self.tree.heading(c, text=t)
            self.tree.column(c, width=w, anchor="w")
        self.tree.pack(fill="both", expand=True, pady=6)
        rb = Frame(right)
        rb.pack(fill="x")
        Button(rb, text="🔄 새로고침", command=self.refresh).pack(side="left", expand=True, fill="x", padx=2)
        Button(rb, text="⏰ 발행 시간 설정", command=self.open_schedule).pack(side="left", expand=True, fill="x", padx=2)
        Button(rb, text="↩ 실패 재시도", command=lambda: self._bg_refresh(
            lambda: pipeline.requeue_failed(self.cfg))).pack(side="left", expand=True, fill="x", padx=2)
        Button(rb, text="🎬 릴스 재생성", command=self.rebuild_reel_selected).pack(
            side="left", expand=True, fill="x", padx=2)
        rb2 = Frame(right)
        rb2.pack(fill="x", pady=(4, 0))
        Button(rb2, text="👁 미리보기", command=self.preview_selected,
               bg="#1565C0", fg="white").pack(side="left", expand=True, fill="x", padx=2)
        Button(rb2, text="▶ 지금 발행", command=self.publish_selected,
               bg="#2E7D32", fg="white").pack(side="left", expand=True, fill="x", padx=2)
        Button(rb2, text="🕒 시각지정", command=self.set_item_time).pack(
            side="left", expand=True, fill="x", padx=2)
        Button(rb2, text="🗑 삭제", command=self.delete_selected, fg="#C62828").pack(
            side="left", expand=True, fill="x", padx=2)
        Button(rb2, text="🧹 정리", command=lambda: self._bg_refresh(
            lambda: pipeline._queue(self.cfg).clear("published"))).pack(side="left", expand=True, fill="x", padx=2)
        Label(right, text="※ 표에서 항목 선택 → '발행시각 지정'(개별 시각) 또는 '선택 삭제'. "
                          "전체 반복 시간대는 '⏰ 발행 시간 설정'.",
              fg="#888", wraplength=430, justify="left").pack(anchor="w")

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

    def add_detail(self):
        ps = filedialog.askopenfilenames(filetypes=[("이미지", "*.jpg *.jpeg *.png *.webp")])
        if ps:
            self.detail_images.extend(ps)
            self.detail_label.config(text=f"상세 {len(self.detail_images)}장", fg="#2E7D32")

    def clear_details(self):
        self.detail_images = []
        self.detail_label.config(text="상세 0장 (선택)", fg="#888")

    def make_preview(self):
        text = self.caption.get("1.0", END).strip()
        if not text:
            self.status.config(text="원문 캡션을 붙여넣어 주세요.", fg="red")
            return
        if not self.image_path:
            self.status.config(text="이미지를 첨부해 주세요.", fg="red")
            return
        img, topic = self.image_path, self.topic.get()
        redraw, reel = self.redraw.get(), self.make_reel.get()
        details = list(self.detail_images)
        self.status.config(text="미리보기 생성 중… (번역→카드, 30초~1분)", fg="#555")

        def work():
            try:
                prepared = pipeline.repost_generate(self.cfg, img, text, topic=topic,
                                                    redraw=redraw, make_reel=reel,
                                                    detail_images=details)
                self.root.after(0, lambda: self.open_preview(prepared))
            except Exception as e:
                self.root.after(0, lambda: self.status.config(text=f"오류: {e}", fg="red"))

        threading.Thread(target=work, daemon=True).start()

    def open_preview(self, prepared: dict):
        self.status.config(text="미리보기 준비됨 — 확인 후 대기열에 추가하세요.", fg="#1565C0")
        paths = prepared.get("card_paths") or [prepared.get("card_path")]
        top = Toplevel(self.root)
        top.title("발행 미리보기")
        top.geometry("860x760")
        carousel = "  (캐러셀 — 좌우로 넘겨서 봄)" if len(paths) > 1 else ""
        Label(top, text=f"① 카드 미리보기 — 총 {len(paths)}장{carousel}",
              font=("", 10, "bold")).pack(anchor="w", padx=12, pady=(8, 0))
        strip = Frame(top)
        strip.pack(pady=6)
        top._imgs = []                                   # 참조 유지(가비지 방지)
        for i, p in enumerate(paths, 1):
            try:
                im = Image.open(p)
                r = 340 / im.height
                im = im.resize((int(im.width * r), 340), Image.LANCZOS)
                ph = ImageTk.PhotoImage(im)
                top._imgs.append(ph)
                cell = Frame(strip)
                cell.pack(side="left", padx=6)
                Label(cell, image=ph, bd=1, relief="solid").pack()
                Label(cell, text=f"{i}장{' (표지)' if i == 1 else ''}").pack()
            except Exception as e:
                Label(strip, text=f"미리보기 오류: {e}", fg="red").pack(side="left")
        Label(top, text="② 인스타 캡션 (여기서 바로 수정 가능)", font=("", 10, "bold")).pack(anchor="w", padx=12)
        cap = Text(top, height=8, wrap=WORD)
        cap.pack(fill="both", expand=True, padx=12, pady=4)
        cap.insert(END, prepared["caption"])
        tp = {"money": "💰 돈/경제", "general": "🌐 이슈"}.get(prepared["topic"], prepared["topic"])
        cuts = len(paths)
        reel_path = prepared.get("reel_path")
        rl = Frame(top)
        rl.pack(fill="x", padx=12)
        if cuts > 1:
            Label(rl, text=f"스트림: {tp}   |   릴스: {cuts}컷 슬라이드쇼 ✅", fg="#1565C0").pack(side="left")
        else:
            Label(rl, text=f"스트림: {tp}   |   릴스: 1컷(단일) — 여러 컷 원하면 '② 상세 이미지'를 추가하세요",
                  fg="#C62828").pack(side="left")
        if reel_path:
            Button(rl, text="▶ 릴스 영상 재생(확인)", command=lambda: _open_file(reel_path)).pack(side="right")
        bar = Frame(top)
        bar.pack(fill="x", padx=12, pady=10)
        Button(bar, text="📥 이대로 대기열에 추가", bg="#2E7D32", fg="white",
               command=lambda: self._commit(top, prepared, cap.get("1.0", END).strip())
               ).pack(side="left", expand=True, fill="x", padx=3)
        Button(bar, text="닫기(취소)", command=top.destroy).pack(side="left", expand=True, fill="x", padx=3)

    def _commit(self, top, prepared: dict, caption_edited: str):
        prepared["caption"] = caption_edited or prepared["caption"]
        top.destroy()
        self.status.config(text="대기열에 추가 중… (업로드)", fg="#555")

        def work():
            try:
                ok = pipeline.repost_commit(self.cfg, prepared)
                self.root.after(0, self._done_ok if ok else
                                lambda: self.status.config(text="업로드 실패(스토리지 설정 확인)", fg="red"))
            except Exception as e:
                self.root.after(0, lambda: self.status.config(text=f"오류: {e}", fg="red"))
            self.root.after(0, self.refresh)

        threading.Thread(target=work, daemon=True).start()

    def _done_ok(self):
        self.status.config(text="✅ 대기열에 추가됨", fg="#2E7D32")
        self.caption.delete("1.0", END)
        self.image_path = None
        self.img_label.config(text="(없음)", fg="#888")
        self.detail_images = []
        self.detail_label.config(text="상세 0장 (선택)", fg="#888")

    _STATUS = {"queued": "⏳대기", "publishing": "⚠멈춤", "failed": "❌실패", "published": "✅발행됨"}

    def open_schedule(self):
        import schedule_editor
        schedule_editor.open_editor(self.root, self.config_path, on_save=self.refresh)

    def _bg_refresh(self, fn):
        def work():
            try:
                fn()
            except Exception as e:
                print(f"[오류] {e}")
            self.root.after(0, self.refresh)
        threading.Thread(target=work, daemon=True).start()

    def refresh(self):
        c = pipeline._queue(self.cfg).counts()
        total = sum(c.values())
        self.counts.set(f"대기열: 💰{c.get('money', 0)} · 🌐{c.get('general', 0)}  (대기 {total}개)")
        for r in self.tree.get_children():
            self.tree.delete(r)
        self.row_map = {}
        for idx, row in enumerate(pipeline.queue_listing(self.cfg)):
            tp = {"money": "💰돈", "general": "🌐이슈"}.get(row["topic"], row["topic"])
            kd = {"repost": "리포스트", "news": "뉴스"}.get(row["kind"], row["kind"])
            st = self._STATUS.get(row.get("status"), row.get("status", ""))
            when = row["when"].strftime("%m/%d %H:%M") if row["when"] else "-"
            iid = str(idx)
            self.row_map[iid] = row["id"]
            self.tree.insert("", END, iid=iid, values=(row["seq"], tp, kd, row["title"][:36], st, when))

    def rebuild_reel_selected(self):
        sel = self.tree.selection()
        if len(sel) != 1:
            self.status.config(text="릴스를 다시 만들 항목 하나를 표에서 선택하세요.", fg="red")
            return
        qid = self.row_map.get(sel[0])
        self.status.config(text="릴스 재생성 중… (카드 여러 장 → 슬라이드쇼, 최대 1분)", fg="#555")
        self._bg_refresh(lambda: pipeline.rebuild_reel(self.cfg, qid))

    def preview_selected(self):
        sel = self.tree.selection()
        if len(sel) != 1:
            self.status.config(text="미리보기할 항목 하나를 표에서 선택하세요.", fg="red")
            return
        qid = self.row_map.get(sel[0])
        item = pipeline._queue(self.cfg).get_item(qid)
        if not item:
            self.status.config(text="항목을 찾을 수 없습니다(새로고침).", fg="red")
            return
        self.status.config(text="미리보기 불러오는 중…", fg="#555")

        def work():
            imgs = self._load_item_images(item)
            self.root.after(0, lambda: self._open_queue_preview(qid, item, imgs))

        threading.Thread(target=work, daemon=True).start()

    def _load_item_images(self, item: dict):
        """대기열 항목의 카드 이미지를 로컬 파일(우선) 또는 R2 URL 다운로드로 가져온다."""
        import os
        out = []
        for p in (item.get("card_paths") or []):
            if p and os.path.exists(p):
                try:
                    out.append(Image.open(p).copy())
                except Exception:
                    pass
        if not out:                                   # 로컬 없으면 URL 다운로드
            import io
            import requests
            for u in (item.get("card_urls") or []):
                try:
                    r = requests.get(u, timeout=30, headers={"User-Agent": "Mozilla/5.0"})
                    r.raise_for_status()
                    out.append(Image.open(io.BytesIO(r.content)).copy())
                except Exception as e:
                    print(f"[미리보기] 이미지 로드 실패: {e}")
        return out

    def _open_queue_preview(self, qid: str, item: dict, imgs: list):
        self.status.config(text="", fg="#555")
        top = Toplevel(self.root)
        top.title(f"대기열 미리보기 · {item.get('title', '')[:30]}")
        top.geometry("860x760")
        n = len(item.get("card_urls") or imgs or [1])
        Label(top, text=f"카드 {n}장" + ("  (캐러셀)" if n > 1 else ""),
              font=("", 10, "bold")).pack(anchor="w", padx=12, pady=(8, 0))
        strip = Frame(top)
        strip.pack(pady=6)
        top._imgs = []
        if imgs:
            for i, im in enumerate(imgs, 1):
                try:
                    r = 340 / im.height
                    disp = im.resize((int(im.width * r), 340), Image.LANCZOS)
                    ph = ImageTk.PhotoImage(disp)
                    top._imgs.append(ph)
                    cell = Frame(strip)
                    cell.pack(side="left", padx=6)
                    Label(cell, image=ph, bd=1, relief="solid").pack()
                    Label(cell, text=f"{i}장{' (표지)' if i == 1 else ''}").pack()
                except Exception as e:
                    Label(strip, text=f"표시 오류: {e}", fg="red").pack(side="left")
        else:
            Label(strip, text="이미지를 불러오지 못했습니다(로컬 파일 없음/네트워크).", fg="red").pack()
        import os
        reel_local = item.get("reel_path")
        reel_url = item.get("reel_url")
        rl = Frame(top)
        rl.pack(fill="x", padx=12)
        Label(rl, text=f"릴스: {'있음' if (reel_local or reel_url) else '없음'}", fg="#555").pack(side="left")
        if reel_local and os.path.exists(reel_local):
            Button(rl, text="▶ 릴스 영상 재생", command=lambda: _open_file(reel_local)).pack(side="right")
        elif reel_url:
            Button(rl, text="▶ 릴스 영상 재생(브라우저)", command=lambda: _open_file(reel_url)).pack(side="right")
        Label(top, text="인스타 캡션 (수정 후 '캡션 저장')", font=("", 10, "bold")).pack(anchor="w", padx=12)
        cap = Text(top, height=8, wrap=WORD)
        cap.pack(fill="both", expand=True, padx=12, pady=4)
        cap.insert(END, item.get("caption", ""))
        bar = Frame(top)
        bar.pack(fill="x", padx=12, pady=10)
        Button(bar, text="💾 캡션 저장", bg="#2E7D32", fg="white",
               command=lambda: self._save_caption(top, qid, cap.get("1.0", END).strip())
               ).pack(side="left", expand=True, fill="x", padx=3)
        Button(bar, text="닫기", command=top.destroy).pack(side="left", expand=True, fill="x", padx=3)

    def _save_caption(self, top, qid: str, caption: str):
        pipeline._queue(self.cfg).set_field(qid, "caption", caption)
        self.status.config(text="✅ 캡션 저장됨", fg="#2E7D32")
        top.destroy()

    def publish_selected(self):
        sel = self.tree.selection()
        if len(sel) != 1:
            self.status.config(text="지금 발행할 항목 하나를 표에서 선택하세요.", fg="red")
            return
        qid = self.row_map.get(sel[0])
        item = pipeline._queue(self.cfg).get_item(qid)
        if not item:
            self.status.config(text="항목을 찾을 수 없습니다(새로고침).", fg="red")
            return
        from tkinter import messagebox
        if item.get("status") == "queued":
            if not messagebox.askyesno("지금 발행", "선택한 항목을 지금 바로 인스타그램에 발행할까요?"):
                return
            self.status.config(text="발행 중… (인스타 업로드, 최대 1분)", fg="#555")
            self._bg_refresh(lambda: pipeline.publish_item(self.cfg, qid))
        else:
            st = self._STATUS.get(item.get("status"), item.get("status"))
            if not messagebox.askyesno("다시 발행",
                                       f"이 항목은 이미 '{st}' 상태입니다.\n"
                                       "지금 다시 발행하면 인스타에 '중복 게시물'이 하나 더 올라갑니다.\n계속할까요?"):
                return
            self.status.config(text="다시 발행 중… (인스타 업로드)", fg="#555")
            self._bg_refresh(lambda: pipeline.republish_item(self.cfg, qid))

    def set_item_time(self):
        sel = self.tree.selection()
        if len(sel) != 1:
            self.status.config(text="발행시각을 지정할 항목 하나를 표에서 선택하세요.", fg="red")
            return
        qid = self.row_map.get(sel[0])
        from tkinter.simpledialog import askstring
        from datetime import datetime
        default = datetime.now().strftime("%Y-%m-%d %H:%M")
        s = askstring("발행 시각 지정",
                      "이 항목을 발행할 시각을 입력하세요 (YYYY-MM-DD HH:MM).\n"
                      "비워두면 자동(반복 시간대) 발행으로 되돌립니다.",
                      initialvalue=default, parent=self.root)
        if s is None:
            return
        s = s.strip()
        if not s:
            pipeline.set_item_time(self.cfg, qid, None)
            self.refresh()
            self.status.config(text="자동(시간대) 발행으로 되돌림", fg="#555")
            return
        try:
            dt = datetime.strptime(s, "%Y-%m-%d %H:%M")
        except ValueError:
            self.status.config(text="형식 오류: YYYY-MM-DD HH:MM (예: 2026-07-26 21:30)", fg="red")
            return
        pipeline.set_item_time(self.cfg, qid, dt)
        self.refresh()
        self.status.config(text=f"발행시각 지정: {dt.strftime('%m/%d %H:%M')} (스케줄러가 그 시각에 발행)", fg="#2E7D32")

    def delete_selected(self):
        sel = self.tree.selection()
        if not sel:
            self.status.config(text="삭제할 항목을 표에서 선택하세요.", fg="red")
            return
        from tkinter import messagebox
        if not messagebox.askyesno("삭제 확인", f"선택한 {len(sel)}건을 대기열에서 삭제할까요?"):
            return
        ids = [self.row_map.get(i) for i in sel]
        self._bg_refresh(lambda: [pipeline.remove_from_queue(self.cfg, q) for q in ids if q])

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
