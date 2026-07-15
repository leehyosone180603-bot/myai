#!/usr/bin/python3
# -*- coding: utf-8 -*-
"""
주가 예측 프로그램 - GUI 창 버전 (tkinter)
==========================================
predict.py의 예측 엔진을 그대로 사용하는 그래픽 창 버전.
터미널에 익숙하지 않아도 종목코드를 입력하고 버튼만 누르면 된다.

- '단일 종목' 탭: 현재 시세·진단 요약 + 일자별 예상 주가 표 + 예측 차트
  (matplotlib이 설치돼 있으면 창 안에 차트를 그린다)
- '여러 종목' 탭: 쉼표/공백으로 구분한 여러 종목의 예측 요약 표

실행:
    python gui.py

tkinter는 Windows/macOS 공식 파이썬에 기본 포함돼 있다.
(리눅스는 'sudo apt install python3-tk' 필요할 수 있음)

⚠️ 참고용 시뮬레이션입니다. 투자 판단과 책임은 본인에게 있습니다.
"""

import queue
import threading
import tkinter as tk
from tkinter import ttk, messagebox

import predict as P
import backtest as BT

SCENARIOS = {"보수적": "conservative", "중립": "neutral", "공격적": "aggressive"}
UP_COLOR, DOWN_COLOR, FLAT_COLOR = "#e03131", "#1c6fd6", "#555555"
ROW_EVEN, ROW_ODD = "#ffffff", "#f2f5fb"   # 표 줄무늬(가독성)


class StockGUI:
    def __init__(self, root):
        self.root = root
        root.title("📈 주가 예측 프로그램")
        root.geometry("920x760")
        root.minsize(820, 640)
        self.msgq = queue.Queue()
        self.busy = False
        self.chart_canvas = None
        self.vol_scale = 1.0            # 백테스트로 보정된 변동성 배수

        self._init_style()
        self._build_controls()
        self._build_tabs()
        self._set_status("종목코드를 입력하고 [예측]을 누르세요. 예시: 214450 (파마리서치)")
        root.after(80, self._poll_queue)

    def _init_style(self):
        """Windows에서 보기 편하도록 글꼴·행 높이·표 스타일 지정."""
        import tkinter.font as tkfont
        fams = set(tkfont.families())
        base = next((f for f in ("Malgun Gothic", "AppleGothic", "NanumGothic",
                                 "Noto Sans CJK KR") if f in fams), None)
        self.font_base = (base or "TkDefaultFont", 10)
        self.font_big = (base or "TkDefaultFont", 12, "bold")
        if base:
            self.root.option_add("*Font", self.font_base)
        style = ttk.Style()
        try:
            style.theme_use("vista")        # Windows 기본 테마(없으면 예외)
        except tk.TclError:
            pass
        style.configure("Treeview", rowheight=28, font=self.font_base)
        style.configure("Treeview.Heading", font=(base or "TkDefaultFont", 10, "bold"))
        style.configure("Big.TButton", font=(base or "TkDefaultFont", 10, "bold"),
                        padding=6)

    # ------------------------------------------------------------------ UI
    def _build_controls(self):
        top = ttk.Frame(self.root, padding=(12, 10))
        top.pack(fill="x")

        ttk.Label(top, text="종목코드").grid(row=0, column=0, sticky="w")
        self.code_var = tk.StringVar(value="214450")
        ttk.Entry(top, textvariable=self.code_var, width=28).grid(
            row=1, column=0, padx=(0, 10), sticky="w")
        ttk.Label(top, text="(단일: 214450 · 여러 종목: 214450,005930,000660)",
                  foreground="#888").grid(row=2, column=0, columnspan=4, sticky="w")

        ttk.Label(top, text="예측기간").grid(row=0, column=1, sticky="w")
        self.days_var = tk.StringVar(value="10")
        ttk.Combobox(top, textvariable=self.days_var, width=6, state="readonly",
                     values=["5", "10", "20", "40"]).grid(row=1, column=1, padx=(0, 10))

        ttk.Label(top, text="시나리오").grid(row=0, column=2, sticky="w")
        self.scen_var = tk.StringVar(value="중립")
        ttk.Combobox(top, textvariable=self.scen_var, width=8, state="readonly",
                     values=list(SCENARIOS)).grid(row=1, column=2, padx=(0, 10))

        self.offline_var = tk.BooleanVar(value=False)
        ttk.Checkbutton(top, text="오프라인(예시)", variable=self.offline_var).grid(
            row=1, column=3, padx=(0, 10))

        self.btn_single = ttk.Button(top, text="예측", command=self.on_single,
                                     style="Big.TButton")
        self.btn_single.grid(row=1, column=4, padx=4)
        self.btn_batch = ttk.Button(top, text="여러 종목 요약", command=self.on_batch,
                                    style="Big.TButton")
        self.btn_batch.grid(row=1, column=5, padx=4)
        self.btn_bt = ttk.Button(top, text="정확도 검증", command=self.on_backtest,
                                 style="Big.TButton")
        self.btn_bt.grid(row=1, column=6, padx=4)

        self.status = ttk.Label(self.root, text="", foreground="#3b5bdb",
                                padding=(14, 0))
        self.status.pack(fill="x")

    def _build_tabs(self):
        self.nb = ttk.Notebook(self.root)
        self.nb.pack(fill="both", expand=True, padx=12, pady=10)

        # --- 단일 종목 탭 ---
        self.tab1 = ttk.Frame(self.nb)
        self.nb.add(self.tab1, text="단일 종목")

        self.quote_lbl = tk.Label(self.tab1, text="", justify="left", anchor="w",
                                  font=("TkDefaultFont", 11))
        self.quote_lbl.pack(fill="x", padx=6, pady=(8, 2))
        self.diag_lbl = tk.Label(self.tab1, text="", justify="left", anchor="w")
        self.diag_lbl.pack(fill="x", padx=6, pady=(0, 6))

        self.chart_frame = ttk.Frame(self.tab1, height=280)
        self.chart_frame.pack(fill="x", padx=6)

        cols = ("date", "mid", "chg", "low", "high", "prob")
        heads = ("날짜", "예상종가", "전일대비", "하단(5%)", "상단(95%)", "상승확률")
        self.tree1 = ttk.Treeview(self.tab1, columns=cols, show="headings", height=8)
        for c, h in zip(cols, heads):
            self.tree1.heading(c, text=h)
            self.tree1.column(c, anchor="e", width=120)
        self.tree1.column("date", anchor="center", width=110)
        self.tree1.pack(fill="both", expand=True, padx=6, pady=8)
        self.tree1.tag_configure("up", foreground=UP_COLOR)
        self.tree1.tag_configure("down", foreground=DOWN_COLOR)
        self.tree1.tag_configure("even", background=ROW_EVEN)
        self.tree1.tag_configure("odd", background=ROW_ODD)

        # --- 여러 종목 탭 ---
        self.tab2 = ttk.Frame(self.nb)
        self.nb.add(self.tab2, text="여러 종목")
        bcols = ("name", "code", "price", "rate", "diag", "mid", "chg", "prob", "src")
        bheads = ("종목명", "코드", "현재가", "등락률", "진단", "예상종가",
                  "변동", "상승확률", "데이터")
        self.tree2 = ttk.Treeview(self.tab2, columns=bcols, show="headings")
        widths = (130, 70, 90, 75, 60, 95, 70, 75, 70)
        for c, h, w in zip(bcols, bheads, widths):
            self.tree2.heading(c, text=h)
            self.tree2.column(c, anchor="e", width=w)
        self.tree2.column("name", anchor="w")
        self.tree2.column("diag", anchor="center")
        self.tree2.column("src", anchor="center")
        self.tree2.pack(fill="both", expand=True, padx=6, pady=8)
        self.tree2.tag_configure("up", foreground=UP_COLOR)
        self.tree2.tag_configure("down", foreground=DOWN_COLOR)
        self.tree2.tag_configure("even", background=ROW_EVEN)
        self.tree2.tag_configure("odd", background=ROW_ODD)

        disc = ("⚠️ 참고용 시뮬레이션입니다. 과거 통계 기반이며 미래 주가를 보장하지 "
                "않습니다. 투자 판단과 책임은 본인에게 있습니다.")
        tk.Label(self.root, text=disc, foreground="#a56a00", wraplength=840,
                 justify="left").pack(fill="x", padx=14, pady=(0, 8))

    # -------------------------------------------------------------- helpers
    def _set_status(self, text):
        self.status.config(text=text)

    def _set_busy(self, busy):
        self.busy = busy
        state = "disabled" if busy else "normal"
        self.btn_single.config(state=state)
        self.btn_batch.config(state=state)
        self.btn_bt.config(state=state)

    def _read_opts(self):
        try:
            days = int(self.days_var.get())
        except ValueError:
            days = 10
        return days, SCENARIOS.get(self.scen_var.get(), "neutral"), self.offline_var.get()

    # -------------------------------------------------------------- actions
    def on_single(self):
        if self.busy:
            return
        code = self.code_var.get().split(",")[0]
        days, scen, offline = self._read_opts()
        self._set_busy(True)
        self._set_status("분석 중… 실시간 데이터를 수집하고 있습니다.")
        threading.Thread(target=self._work_single,
                         args=(code, days, scen, offline), daemon=True).start()

    def on_batch(self):
        if self.busy:
            return
        raw = self.code_var.get().replace(",", " ").split()
        days, scen, offline = self._read_opts()
        self._set_busy(True)
        self._set_status(f"{len(raw)}개 종목 분석 중…")
        threading.Thread(target=self._work_batch,
                         args=(raw, days, scen, offline), daemon=True).start()

    def on_backtest(self):
        if self.busy:
            return
        code = self.code_var.get().split(",")[0]
        _, scen, offline = self._read_opts()
        self._set_busy(True)
        self._set_status("정확도 검증 중… 과거 데이터로 백테스트하고 있습니다.")
        threading.Thread(target=self._work_backtest,
                         args=(code, scen, offline), daemon=True).start()

    def _work_single(self, code, days, scen, offline):
        try:
            res = P.predict_stock(code, days=days, scenario=scen,
                                  no_network=offline, vol_scale=self.vol_scale)
            self.msgq.put(("single", res))
        except Exception as e:
            self.msgq.put(("error", str(e)))

    def _work_batch(self, codes, days, scen, offline):
        rows = []
        for raw in codes:
            try:
                res = P.predict_stock(raw, days=days, scenario=scen,
                                      no_network=offline, vol_scale=self.vol_scale)
                rows.append({"ok": True, "res": res})
            except Exception as e:
                rows.append({"ok": False, "code": raw, "error": str(e)})
        self.msgq.put(("batch", rows))

    def _work_backtest(self, code, scen, offline):
        try:
            code = P.normalize_code(code)
            closes, _hist, is_live = BT.load_closes(code, offline)
            horizons = [1, 5, 10]
            if len(closes) < 60 + max(horizons) + 20:
                raise ValueError("백테스트에 필요한 과거 데이터가 부족합니다.")
            base = BT.evaluate(closes, horizons, scen, 1.0)
            scale, _ = BT.calibrate(closes, horizons, scen, 60, 1)
            cal = BT.evaluate(closes, horizons, scen, scale)
            self.msgq.put(("backtest", {
                "code": code, "is_live": is_live, "horizons": horizons,
                "base": {h: BT.finalize(base[h]) for h in horizons},
                "cal": {h: BT.finalize(cal[h]) for h in horizons},
                "scale": scale, "scenario": scen,
                "n": base[horizons[0]]["n"]}))
        except Exception as e:
            self.msgq.put(("error", str(e)))

    # --------------------------------------------------------------- render
    def _poll_queue(self):
        try:
            while True:
                kind, payload = self.msgq.get_nowait()
                if kind == "single":
                    self._render_single(payload)
                elif kind == "batch":
                    self._render_batch(payload)
                elif kind == "backtest":
                    self._render_backtest(payload)
                elif kind == "error":
                    self._set_status("오류가 발생했습니다.")
                    messagebox.showerror("실패", payload)
                self._set_busy(False)
        except queue.Empty:
            pass
        self.root.after(80, self._poll_queue)

    def _render_single(self, res):
        q, meta, days = res["q"], res["meta"], res["days"]
        arrow = "▲" if q["change"] > 0 else "▼" if q["change"] < 0 else "―"
        src = "🟢 실시간" if res["is_live"] else "예시 데이터"
        market = f" · {q['market']}" if q.get("market") else ""
        self.quote_lbl.config(
            text=f"{q['name']} ({res['code']}{market})   [{src}]\n"
                 f"현재가 {P.KRW(q['price'])}원   {arrow} {P.KRW(abs(q['change']))} "
                 f"({q['change_rate']:+.2f}%)",
            fg=(UP_COLOR if q["change"] > 0 else DOWN_COLOR if q["change"] < 0 else FLAT_COLOR))
        verdict, up, down = P.diagnose(meta, q["price"])
        trend = "정배열(상승)" if up else "역배열(하락)" if down else "혼조"
        rsi_s = "과매수" if meta["rsi"] > 70 else "과매도" if meta["rsi"] < 30 else "중립"
        last = days[-1]
        lchg = (last["p50"] - q["price"]) / q["price"] * 100
        self.diag_lbl.config(
            text=f"현재 상황 진단: {verdict}    "
                 f"추세 {trend} · RSI {meta['rsi']:.0f}({rsi_s}) · "
                 f"연변동성 {meta['ann_vol'] * 100:.0f}%\n"
                 f"→ {len(days)}영업일 후 예상 {P.KRW(last['p50'])}원 ({lchg:+.1f}%), "
                 f"범위 {P.KRW(last['p5'])} ~ {P.KRW(last['p95'])}")

        self.tree1.delete(*self.tree1.get_children())
        wd = "월화수목금토일"
        for i, d in enumerate(days):
            dt = d["date"]
            label = f"{dt.month}/{dt.day:02d}({wd[dt.weekday()]})"
            chg = (d["p50"] - q["price"]) / q["price"] * 100
            color = "up" if d["p50"] > q["price"] else "down" if d["p50"] < q["price"] else ""
            stripe = "even" if i % 2 == 0 else "odd"
            self.tree1.insert("", "end", tags=(color, stripe), values=(
                label, P.KRW(d["p50"]), f"{chg:+.1f}%", P.KRW(d["p5"]),
                P.KRW(d["p95"]), f"{d['up_prob'] * 100:.0f}%"))

        self._draw_chart(res)
        self.nb.select(self.tab1)
        self._set_status("완료: 단일 종목 예측이 갱신되었습니다.")

    def _render_batch(self, rows):
        self.tree2.delete(*self.tree2.get_children())
        ok = 0
        for i, r in enumerate(rows):
            stripe = "even" if i % 2 == 0 else "odd"
            if not r["ok"]:
                self.tree2.insert("", "end", tags=(stripe,), values=(
                    "(실패)", r["code"], "-", "-", "-", "-", "-", "-", r["error"][:20]))
                continue
            ok += 1
            res = r["res"]
            q, last = res["q"], res["days"][-1]
            verdict, _, _ = P.diagnose(res["meta"], q["price"])
            chg = (last["p50"] - q["price"]) / q["price"] * 100
            arrow = "▲" if q["change"] > 0 else "▼" if q["change"] < 0 else "―"
            color = "up" if chg > 0 else "down" if chg < 0 else ""
            self.tree2.insert("", "end", tags=(color, stripe), values=(
                q["name"], res["code"], P.KRW(q["price"]),
                f"{arrow}{q['change_rate']:+.1f}%", verdict.split()[0],
                P.KRW(last["p50"]), f"{chg:+.1f}%", f"{last['up_prob'] * 100:.0f}%",
                "실시간" if res["is_live"] else "예시"))
        self.nb.select(self.tab2)
        self._set_status(f"완료: {ok}/{len(rows)} 종목 예측이 갱신되었습니다.")

    def _render_backtest(self, s):
        self.vol_scale = s["scale"]        # 이후 예측에 자동 반영
        code, hs = s["code"], s["horizons"]
        name = P.SEED.get(code, {}).get("name", code)
        src = "🟢 실시간" if s["is_live"] else "예시 데이터"

        def row(label, key, fmt):
            return "  " + label + "  " + "   ".join(
                f"{h}일 {fmt(s[key][h])}" for h in hs)

        base_cov = sum(s["base"][h]["cov90"] for h in hs) / len(hs)
        new_cov = sum(s["cal"][h]["cov90"] for h in hs) / len(hs)
        msg = (
            f"[정확도 검증]  {name} ({code})\n"
            f"데이터: {src} · 평가 시점 {s['n']}개 · 시나리오 {s['scenario']}\n"
            f"{'─' * 34}\n"
            + row("방향 적중률 (무작위 50%)\n ", "base", lambda f: f"{f['dir'] * 100:.0f}%") + "\n"
            + row("90% 구간 포함율 (목표 90%)\n ", "base", lambda f: f"{f['cov90'] * 100:.0f}%") + "\n"
            + row("평균오차 MAPE\n ", "base", lambda f: f"{f['mape']:.1f}%") + "\n"
            + f"{'─' * 34}\n"
            f"📐 구간 보정: 전체 {base_cov * 100:.0f}% "
            f"→ 배수 {s['scale']} → {new_cov * 100:.0f}%\n"
            f"✅ 권장 배수가 이후 예측에 자동 반영됩니다.\n\n"
            "⚠️ 백테스트 성적이 미래 수익을 보장하지 않습니다."
        )
        self._set_status(f"정확도 검증 완료 · 변동성 보정 배수 {s['scale']} 적용됨 "
                         f"(이후 [예측]에 반영)")
        messagebox.showinfo("정확도 검증 결과", msg)

    def _draw_chart(self, res):
        if self.chart_canvas is not None:
            self.chart_canvas.get_tk_widget().destroy()
            self.chart_canvas = None
        try:
            import datetime as dt
            from matplotlib.figure import Figure
            from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
            import matplotlib.dates as mdates
            import matplotlib
            matplotlib.rcParams["font.family"] = [
                "Malgun Gothic", "AppleGothic", "NanumGothic", "DejaVu Sans"]
            matplotlib.rcParams["axes.unicode_minus"] = False
        except ImportError:
            lbl = tk.Label(self.chart_frame,
                           text="(차트를 보려면 matplotlib을 설치하세요: pip install matplotlib)",
                           foreground="#888")
            lbl.pack(pady=20)
            self.chart_canvas = None
            return

        q, closes, days = res["q"], res["closes"], res["days"]
        hist = closes[-60:]
        today = dt.date.today()
        hist_x = [today - dt.timedelta(days=(len(hist) - i)) for i in range(len(hist))]
        fx = [d["date"] for d in days]
        fig = Figure(figsize=(8.2, 3.0), dpi=100)
        ax = fig.add_subplot(111)
        ax.plot(hist_x, hist, color="#2b2d42", lw=1.5, label="과거 종가(60일)")
        ax.plot([today] + fx, [q["price"]] + [d["p50"] for d in days], "--",
                color="#3b5bdb", lw=2, label="예상 중앙값")
        ax.fill_between(fx, [d["p5"] for d in days], [d["p95"] for d in days],
                        color="#3b5bdb", alpha=0.12, label="90% 구간")
        ax.fill_between(fx, [d["p25"] for d in days], [d["p75"] for d in days],
                        color="#3b5bdb", alpha=0.20, label="50% 구간")
        ax.axvline(today, color="#c7cede", ls=":", lw=1)
        ax.legend(loc="upper left", fontsize=7)
        ax.grid(True, color="#eef0f6")
        ax.xaxis.set_major_formatter(mdates.DateFormatter("%m/%d"))
        fig.tight_layout()
        self.chart_canvas = FigureCanvasTkAgg(fig, master=self.chart_frame)
        self.chart_canvas.draw()
        self.chart_canvas.get_tk_widget().pack(fill="both", expand=True)


def main():
    root = tk.Tk()
    try:  # 기본 폰트에 한글 지원 폰트 지정(있으면)
        import tkinter.font as tkfont
        fam = set(tkfont.families())
        for pref in ("Malgun Gothic", "AppleGothic", "NanumGothic", "Noto Sans CJK KR"):
            if pref in fam:
                root.option_add("*Font", (pref, 10))
                break
    except Exception:
        pass
    StockGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()
