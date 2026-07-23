#!/usr/bin/env python3
"""카드뉴스 레이아웃 편집기 (별도 윈도우 창).

슬라이더/입력으로 그라데이션·제목크기·로고크기·문구를 조정하고 실시간 미리보기.
[config에 저장] 하면 config/layout_overrides.yaml 에 기록되어 실제 발행에 반영됩니다.
(ai.yaml 의 주석은 건드리지 않음)

  python layout_editor.py
"""

from __future__ import annotations

import copy
import tempfile
from pathlib import Path
from tkinter import (Tk, Frame, Label, Button, Entry, Scale, StringVar,
                     HORIZONTAL, filedialog, BooleanVar, Checkbutton)

import yaml
from PIL import Image, ImageTk

from newsroom.config import ROOT, load_config
from newsroom.cardnews import render_card

OVERRIDES = ROOT / "config" / "layout_overrides.yaml"
PREVIEW_H = 520


class Editor:
    def __init__(self, root: Tk):
        self.root = root
        root.title("카드뉴스 레이아웃 편집기")
        self.base = load_config().data
        self.bg_path: str | None = None
        self._tmp = Path(tempfile.gettempdir()) / "newsroom_preview.jpg"

        left = Frame(root, padx=12, pady=12)
        left.pack(side="left", fill="y")
        self.canvas = Label(root, bd=1, relief="solid")
        self.canvas.pack(side="right", padx=12, pady=12)

        card = self.base.get("card", {})
        content = self.base.get("content", {})

        self.headline = self._entry(left, "미리보기 제목", "9万4千人が事実上の兵役免除")
        self.subtitle = self._entry(left, "서브타이틀", "兵役の公平性めぐり論争")
        self.brand = self._entry(left, "팔로우 핸들 (brand)", card.get("brand", ""))
        self.tagline = self._entry(left, "태그라인 (tagline)", card.get("tagline", ""))
        self.brand_top = self._entry(left, "우상단 문구 (brand_top)", card.get("brand_top", ""))

        self.opacity = self._slider(left, "하단 그라데이션 진하기", 0, 100,
                                    int(float(card.get("overlay_opacity", 0.85)) * 100))
        self.gstart = self._slider(left, "그라데이션 시작(%) (작을수록 위)", 20, 80,
                                   int(float(card.get("gradient_start", 0.5)) * 100))
        self.title_scale = self._slider(left, "제목 크기(%)", 5, 13,
                                        int(float(card.get("title_scale", 0.088)) * 100))
        self.logo_scale = self._slider(left, "로고 크기(%)", 10, 50,
                                       int(float(card.get("logo_scale", 0.30)) * 100))

        self.rm_white = BooleanVar(value=bool(card.get("logo_remove_white", True)))
        Checkbutton(left, text="로고 흰배경 제거", variable=self.rm_white,
                    command=self.render).pack(anchor="w", pady=(6, 0))

        Button(left, text="배경 이미지 선택(미리보기용)", command=self.pick_bg).pack(fill="x", pady=(10, 2))
        Button(left, text="미리보기 갱신", command=self.render).pack(fill="x", pady=2)
        Button(left, text="💾 config에 저장", command=self.save,
               bg="#2E7D32", fg="white").pack(fill="x", pady=(10, 2))
        self.status = Label(left, text="", fg="#555")
        self.status.pack(anchor="w", pady=(6, 0))

        for s in (self.opacity, self.gstart, self.title_scale, self.logo_scale):
            s.config(command=lambda _=None: self.render())
        self.render()

    # ── 위젯 헬퍼 ────────────────────────────────────────────────
    def _entry(self, parent, label, val) -> StringVar:
        Label(parent, text=label).pack(anchor="w")
        var = StringVar(value=val or "")
        e = Entry(parent, textvariable=var, width=34)
        e.pack(fill="x", pady=(0, 6))
        e.bind("<Return>", lambda _e: self.render())
        return var

    def _slider(self, parent, label, lo, hi, val) -> Scale:
        Label(parent, text=label).pack(anchor="w")
        s = Scale(parent, from_=lo, to=hi, orient=HORIZONTAL)
        s.set(val)
        s.pack(fill="x", pady=(0, 6))
        return s

    # ── 오버라이드 값 구성 ───────────────────────────────────────
    def _card_overrides(self) -> dict:
        return {
            "brand": self.brand.get(),
            "tagline": self.tagline.get(),
            "brand_top": self.brand_top.get(),
            "overlay_opacity": self.opacity.get() / 100,
            "gradient_start": self.gstart.get() / 100,
            "title_scale": self.title_scale.get() / 100,
            "logo_scale": self.logo_scale.get() / 100,
            "logo_remove_white": self.rm_white.get(),
        }

    def _preview_cfg(self):
        data = copy.deepcopy(self.base)
        data.setdefault("card", {}).update(self._card_overrides())
        from newsroom.config import Config
        return Config(data=data)

    # ── 동작 ─────────────────────────────────────────────────────
    def pick_bg(self):
        p = filedialog.askopenfilename(filetypes=[("이미지", "*.jpg *.jpeg *.png")])
        if p:
            self.bg_path = p
            self.render()

    def render(self):
        cfg = self._preview_cfg()
        try:
            render_card(cfg, title=self.headline.get(), subtitle=self.subtitle.get(),
                        category="world", bg_path=self.bg_path,
                        out_path=self._tmp, is_cover=True, slide_total=1)
            img = Image.open(self._tmp)
            ratio = PREVIEW_H / img.height
            img = img.resize((int(img.width * ratio), PREVIEW_H), Image.LANCZOS)
            self._photo = ImageTk.PhotoImage(img)
            self.canvas.config(image=self._photo)
        except Exception as e:
            self.status.config(text=f"렌더 오류: {e}", fg="red")

    def save(self):
        over = {"card": self._card_overrides()}
        OVERRIDES.parent.mkdir(parents=True, exist_ok=True)
        with open(OVERRIDES, "w", encoding="utf-8") as f:
            yaml.safe_dump(over, f, allow_unicode=True, sort_keys=False)
        self.status.config(text=f"저장됨 → {OVERRIDES.name} (발행에 반영)", fg="#2E7D32")


def main():
    root = Tk()
    Editor(root)
    root.mainloop()


if __name__ == "__main__":
    main()
