#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TMG 매출 엑셀 스캐너 (UI 실행 프로그램)
=====================================

여러 개의 tmg 쇼핑몰(cafe24/더망고) 관리자 엑셀 내보내기 주소를 자동으로 훑어서,

  [① 스캔]
    - 실제 주문 데이터가 있는 순번(tmg 번호)만 골라내고
    - 데이터가 없는(열 제목만 있는) 순번은 자동 제외
    - 확인된 순번마다 "엑셀 열기" 버튼 제공

  [② 매출 분석]
    - 더망고주문상태 열에 '취소/반품/교환'이 포함된 주문은 제외(정상 주문만)
    - 매출 = 결제금액합계(원) + 결제배송비(원)  (배송비 열이 없으면 결제금액합계만)
    - 순번별 매출을 큰 순서대로 정렬
    - 1천만원 이상 매출 순번은 상품 카테고리별 매출/건수까지 정리

주소 규칙
  * 1 ~ 3999   :  https://tmg{번호}.cafe24.com/...      (my 없음)
  * 4000 ~ 5500:  https://tmg{번호}.mycafe24.com/...    (my 포함)

외부 라이브러리 없이 파이썬 표준 모듈만으로 동작합니다.
"""

import os
import csv
import ssl
import sys
import queue
import tempfile
import threading
import webbrowser
import urllib.parse
import urllib.request
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

import tmg_core as core

try:
    import tkinter as tk
    from tkinter import ttk, filedialog, messagebox
    TK_IMPORT_ERROR = None
except Exception as exc:  # pragma: no cover
    tk = None
    TK_IMPORT_ERROR = exc


# ---------------------------------------------------------------------------
# 네트워크: 다운로드 + 데이터 유무 판정
# ---------------------------------------------------------------------------

def fetch(url, timeout):
    """주소에서 내용을 받아 bytes 로 반환. 실패 시 (None, 사유)."""
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                          "AppleWebKit/537.36 (KHTML, like Gecko) "
                          "Chrome/120.0 Safari/537.36",
            "Accept": "*/*",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            return resp.read(), ""
    except Exception as exc:
        return None, "{}".format(type(exc).__name__)


def scan_one(number, url, timeout):
    """한 순번을 받아 데이터 유무를 판정하고, 내용/헤더/행을 반환."""
    res = {
        "number": number, "url": url, "ok": False, "has_data": False,
        "data_rows": 0, "note": "", "headers": None, "rows": None,
    }
    content, err = fetch(url, timeout)
    if content is None:
        res["note"] = "접속 실패: {}".format(err)
        return res
    res["ok"] = True
    headers, rows = core.read_table(content)
    if headers is None:
        # 엑셀/표가 아님 (로그인 페이지 등)
        res["note"] = "엑셀 아님(HTML/기타)"
        return res
    # 내용이 있는 데이터 행 수
    data_rows = [r for r in rows if any((c or "").strip() for c in r)]
    res["headers"] = headers
    res["rows"] = rows
    res["data_rows"] = len(data_rows)
    res["has_data"] = len(data_rows) >= 1
    if not res["has_data"]:
        res["note"] = "데이터 없음(헤더만)"
    return res


# ---------------------------------------------------------------------------
# GUI
# ---------------------------------------------------------------------------

class App:
    def __init__(self, root):
        self.root = root
        self.root.title("TMG 매출 엑셀 스캐너")
        self.root.geometry("1040x720")
        self.root.minsize(900, 620)

        self.msg_queue = queue.Queue()
        self.stop_flag = threading.Event()
        self.results = []      # 데이터 있는 순번 dict(headers/rows 포함)
        self.analysis = []     # 매출 분석 결과
        self.total = 0
        self.scanned = 0
        self.found = 0
        self.fail = 0
        self.empty = 0
        self._sample_headers = []

        self._build_ui()
        self.root.after(120, self._drain_queue)

    # ------------------------------------------------------------------ UI
    def _build_ui(self):
        nb = ttk.Notebook(self.root)
        nb.pack(fill="both", expand=True, padx=8, pady=8)
        self.tab_scan = ttk.Frame(nb)
        self.tab_sales = ttk.Frame(nb)
        nb.add(self.tab_scan, text="① 스캔 (데이터 있는 순번 찾기)")
        nb.add(self.tab_sales, text="② 매출 분석")
        self._build_scan_tab()
        self._build_sales_tab()

    # ---- 탭 1: 스캔 ----
    def _build_scan_tab(self):
        pad = {"padx": 6, "pady": 4}
        cfg = ttk.LabelFrame(self.tab_scan, text="설정")
        cfg.pack(fill="x", padx=8, pady=(8, 6))

        ttk.Label(cfg, text="샘플 주소(URL):").grid(row=0, column=0, sticky="w", **pad)
        self.url_var = tk.StringVar(value=core.DEFAULT_SAMPLE_URL)
        ttk.Entry(cfg, textvariable=self.url_var).grid(row=0, column=1, columnspan=5, sticky="we", **pad)
        ttk.Label(cfg, foreground="#666",
                  text="※ 위 주소의 tmg 번호만 바꿔가며 스캔합니다. 다른 달은 새 주소를 붙여넣으세요.",
                  ).grid(row=1, column=1, columnspan=5, sticky="w", padx=6)

        ttk.Label(cfg, text="시작 번호:").grid(row=2, column=0, sticky="w", **pad)
        self.start_var = tk.StringVar(value=str(core.DEFAULT_START))
        ttk.Entry(cfg, textvariable=self.start_var, width=8).grid(row=2, column=1, sticky="w", **pad)
        ttk.Label(cfg, text="끝 번호:").grid(row=2, column=2, sticky="w", **pad)
        self.end_var = tk.StringVar(value=str(core.DEFAULT_END))
        ttk.Entry(cfg, textvariable=self.end_var, width=8).grid(row=2, column=3, sticky="w", **pad)
        ttk.Label(cfg, text="mycafe24 시작:").grid(row=2, column=4, sticky="w", **pad)
        self.thr_var = tk.StringVar(value=str(core.DEFAULT_MY_THRESHOLD))
        ttk.Entry(cfg, textvariable=self.thr_var, width=8).grid(row=2, column=5, sticky="w", **pad)

        ttk.Label(cfg, text="동시 접속 수:").grid(row=3, column=0, sticky="w", **pad)
        self.workers_var = tk.StringVar(value=str(core.DEFAULT_WORKERS))
        ttk.Entry(cfg, textvariable=self.workers_var, width=8).grid(row=3, column=1, sticky="w", **pad)
        ttk.Label(cfg, text="응답 대기(초):").grid(row=3, column=2, sticky="w", **pad)
        self.timeout_var = tk.StringVar(value=str(core.DEFAULT_TIMEOUT))
        ttk.Entry(cfg, textvariable=self.timeout_var, width=8).grid(row=3, column=3, sticky="w", **pad)
        cfg.columnconfigure(1, weight=1)

        ctrl = ttk.Frame(self.tab_scan)
        ctrl.pack(fill="x", padx=8)
        self.start_btn = ttk.Button(ctrl, text="스캔 시작", command=self.start_scan)
        self.start_btn.pack(side="left", padx=4, pady=4)
        self.stop_btn = ttk.Button(ctrl, text="중지", command=self.stop_scan, state="disabled")
        self.stop_btn.pack(side="left", padx=4, pady=4)
        self.save_btn = ttk.Button(ctrl, text="목록 저장(CSV)", command=self.save_list_csv, state="disabled")
        self.save_btn.pack(side="left", padx=4, pady=4)

        prog = ttk.Frame(self.tab_scan)
        prog.pack(fill="x", padx=8, pady=(6, 0))
        self.progress = ttk.Progressbar(prog, mode="determinate")
        self.progress.pack(fill="x", side="left", expand=True, padx=(0, 8))
        self.status_var = tk.StringVar(value="대기 중")
        ttk.Label(prog, textvariable=self.status_var, width=52).pack(side="right")

        res = ttk.LabelFrame(self.tab_scan, text="데이터가 확인된 순번 (엑셀 열기 버튼)")
        res.pack(fill="both", expand=True, padx=8, pady=8)
        canvas = tk.Canvas(res, highlightthickness=0)
        vbar = ttk.Scrollbar(res, orient="vertical", command=canvas.yview)
        self.list_frame = ttk.Frame(canvas)
        self.list_frame.bind("<Configure>",
                             lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        self._win = canvas.create_window((0, 0), window=self.list_frame, anchor="nw")
        canvas.bind("<Configure>", lambda e: canvas.itemconfigure(self._win, width=e.width))
        canvas.configure(yscrollcommand=vbar.set)
        canvas.pack(side="left", fill="both", expand=True)
        vbar.pack(side="right", fill="y")

        def _wheel(event):
            d = -1 * (event.delta // 120) if event.delta else (1 if event.num == 5 else -1)
            canvas.yview_scroll(d, "units")
        canvas.bind_all("<MouseWheel>", _wheel)
        canvas.bind_all("<Button-4>", _wheel)
        canvas.bind_all("<Button-5>", _wheel)
        self._list_header()

    def _list_header(self):
        h = ttk.Frame(self.list_frame)
        h.pack(fill="x", pady=(2, 4))
        ttk.Label(h, text="순번", width=10, font=("", 10, "bold")).pack(side="left", padx=4)
        ttk.Label(h, text="주소(host)", width=28, font=("", 10, "bold")).pack(side="left", padx=4)
        ttk.Label(h, text="데이터행", width=10, font=("", 10, "bold")).pack(side="left", padx=4)
        ttk.Label(h, text="바로가기", font=("", 10, "bold")).pack(side="left", padx=4)
        ttk.Separator(self.list_frame, orient="horizontal").pack(fill="x")

    # ---- 탭 2: 매출 분석 ----
    def _build_sales_tab(self):
        pad = {"padx": 6, "pady": 3}
        top = ttk.LabelFrame(self.tab_sales, text="분석 기준 (엑셀 열 이름 · 필요 시 수정 가능)")
        top.pack(fill="x", padx=8, pady=(8, 6))

        self.col_status = tk.StringVar(value=core.STATUS_KEYS[0])
        self.col_amount = tk.StringVar(value="결제금액합계(원)")
        self.col_ship = tk.StringVar(value="결제배송비(원)")
        self.col_cat = tk.StringVar(value="상품카테고리")
        self.exclude_var = tk.StringVar(value=",".join(core.EXCLUDE_KEYWORDS))
        self.big_var = tk.StringVar(value=str(core.DEFAULT_BIG_THRESHOLD))

        def combo(label, var, r, cc):
            ttk.Label(top, text=label).grid(row=r, column=cc, sticky="w", **pad)
            cb = ttk.Combobox(top, textvariable=var, width=22)
            cb.grid(row=r, column=cc + 1, sticky="w", **pad)
            return cb

        self.cb_status = combo("주문상태 열:", self.col_status, 0, 0)
        self.cb_amount = combo("매출 금액 열:", self.col_amount, 0, 2)
        self.cb_ship = combo("배송비 열:", self.col_ship, 1, 0)
        self.cb_cat = combo("상품 카테고리 열:", self.col_cat, 1, 2)

        ttk.Label(top, text="제외 키워드:").grid(row=2, column=0, sticky="w", **pad)
        ttk.Entry(top, textvariable=self.exclude_var, width=24).grid(row=2, column=1, sticky="w", **pad)
        ttk.Label(top, text="큰 매출 기준(원):").grid(row=2, column=2, sticky="w", **pad)
        ttk.Entry(top, textvariable=self.big_var, width=24).grid(row=2, column=3, sticky="w", **pad)

        ttk.Label(top, foreground="#666",
                  text="매출 = 결제금액합계 + 결제배송비(있을 때). 배송비 열이 없으면 결제금액합계만 계산합니다.",
                  ).grid(row=3, column=0, columnspan=4, sticky="w", padx=6, pady=(2, 4))

        btns = ttk.Frame(self.tab_sales)
        btns.pack(fill="x", padx=8)
        self.analyze_btn = ttk.Button(btns, text="매출 분석 실행", command=self.run_analysis, state="disabled")
        self.analyze_btn.pack(side="left", padx=4, pady=4)
        self.export_btn = ttk.Button(btns, text="분석결과 저장(CSV)", command=self.save_analysis_csv, state="disabled")
        self.export_btn.pack(side="left", padx=4, pady=4)
        self.report_btn = ttk.Button(btns, text="리포트 열기(HTML)", command=self.open_report, state="disabled")
        self.report_btn.pack(side="left", padx=4, pady=4)
        self.sales_status = tk.StringVar(value="먼저 ① 스캔을 실행한 뒤 분석하세요.")
        ttk.Label(btns, textvariable=self.sales_status, foreground="#333").pack(side="left", padx=12)

        # 순위표
        rank = ttk.LabelFrame(self.tab_sales, text="순번별 정상주문 매출 (매출 큰 순)")
        rank.pack(fill="both", expand=True, padx=8, pady=(6, 4))

        rank_bar = ttk.Frame(rank)
        rank_bar.pack(fill="x", padx=4, pady=(4, 2))
        self.open_sel_btn = ttk.Button(rank_bar, text="▶ 선택한 순번 엑셀 열기",
                                       command=self.open_selected_excel, state="disabled")
        self.open_sel_btn.pack(side="left")
        ttk.Label(rank_bar, foreground="#666",
                  text="  (행을 클릭 후 버튼 · 또는 순위표에서 더블클릭하면 해당 순번 엑셀이 바로 열립니다)"
                  ).pack(side="left")

        tree_wrap = ttk.Frame(rank)
        tree_wrap.pack(fill="both", expand=True)
        cols = ("rank", "number", "host", "count", "sales", "open")
        self.tree = ttk.Treeview(tree_wrap, columns=cols, show="headings", height=9)
        for c, t, w, anc in [
            ("rank", "순위", 50, "center"), ("number", "순번", 90, "center"),
            ("host", "주소(host)", 240, "w"), ("count", "정상건수", 80, "e"),
            ("sales", "매출(원)", 150, "e"), ("open", "엑셀", 90, "center"),
        ]:
            self.tree.heading(c, text=t)
            self.tree.column(c, width=w, anchor=anc)
        tvbar = ttk.Scrollbar(tree_wrap, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=tvbar.set)
        self.tree.pack(side="left", fill="both", expand=True)
        tvbar.pack(side="right", fill="y")
        # 더블클릭 또는 '엑셀' 칸 클릭 시 열기
        self.tree.bind("<Double-1>", self._open_selected)
        self.tree.bind("<Button-1>", self._tree_click)

        # 1천만원 이상 카테고리 (순번마다 엑셀 열기 버튼 포함)
        catf = ttk.LabelFrame(self.tab_sales, text="1천만원 이상 순번 · 상품 카테고리별 정리")
        catf.pack(fill="both", expand=True, padx=8, pady=(4, 8))
        self.cat_summary = tk.StringVar(value="")
        ttk.Label(catf, textvariable=self.cat_summary, foreground="#333").pack(
            anchor="w", padx=8, pady=(4, 0))
        cat_canvas = tk.Canvas(catf, highlightthickness=0)
        cat_bar = ttk.Scrollbar(catf, orient="vertical", command=cat_canvas.yview)
        self.cat_frame = ttk.Frame(cat_canvas)
        self.cat_frame.bind("<Configure>",
                            lambda e: cat_canvas.configure(scrollregion=cat_canvas.bbox("all")))
        self._cat_win = cat_canvas.create_window((0, 0), window=self.cat_frame, anchor="nw")
        cat_canvas.bind("<Configure>", lambda e: cat_canvas.itemconfigure(self._cat_win, width=e.width))
        cat_canvas.configure(yscrollcommand=cat_bar.set)
        cat_canvas.pack(side="left", fill="both", expand=True)
        cat_bar.pack(side="right", fill="y")

        def _cat_wheel(event):
            d = -1 * (event.delta // 120) if event.delta else (1 if event.num == 5 else -1)
            cat_canvas.yview_scroll(d, "units")
        for seq in ("<MouseWheel>", "<Button-4>", "<Button-5>"):
            cat_canvas.bind(seq, _cat_wheel)

    # -------------------------------------------------------------- scan
    def start_scan(self):
        try:
            start = int(self.start_var.get()); end = int(self.end_var.get())
            thr = int(self.thr_var.get())
            workers = max(1, min(100, int(self.workers_var.get())))
            timeout = max(1, int(self.timeout_var.get()))
        except ValueError:
            messagebox.showerror("입력 오류", "숫자 항목을 올바르게 입력해 주세요."); return
        if start > end:
            messagebox.showerror("입력 오류", "시작 번호가 끝 번호보다 큽니다."); return
        sample = self.url_var.get().strip()
        if not sample:
            messagebox.showerror("입력 오류", "샘플 주소를 입력해 주세요."); return
        path, query = core.parse_sample_url(sample)

        for ch in list(self.list_frame.children.values()):
            ch.destroy()
        self._list_header()
        self.results = []
        self.scanned = self.found = self.fail = self.empty = 0
        self.total = end - start + 1
        self.stop_flag.clear()
        self.progress.configure(maximum=self.total, value=0)
        self.start_btn.configure(state="disabled")
        self.stop_btn.configure(state="normal")
        self.save_btn.configure(state="disabled")
        self.analyze_btn.configure(state="disabled")
        self.status_var.set("스캔 준비 중...")

        threading.Thread(target=self._scan_worker,
                         args=(start, end, path, query, thr, workers, timeout),
                         daemon=True).start()

    def stop_scan(self):
        self.stop_flag.set()
        self.status_var.set("중지 요청됨... 마무리 중")
        self.stop_btn.configure(state="disabled")

    def _scan_worker(self, start, end, path, query, thr, workers, timeout):
        try:
            with ThreadPoolExecutor(max_workers=workers) as ex:
                futs = {}
                for n in range(start, end + 1):
                    if self.stop_flag.is_set():
                        break
                    url = core.build_url(n, path, query, thr)
                    futs[ex.submit(scan_one, n, url, timeout)] = n
                for fut in as_completed(futs):
                    if self.stop_flag.is_set():
                        for f in futs:
                            f.cancel()
                    try:
                        res = fut.result()
                    except Exception as exc:
                        res = {"number": futs[fut], "ok": False, "has_data": False,
                               "note": "오류:{}".format(exc), "url": "", "data_rows": 0,
                               "headers": None, "rows": None}
                    self.msg_queue.put(("result", res))
        finally:
            self.msg_queue.put(("done", None))

    def _drain_queue(self):
        try:
            while True:
                kind, payload = self.msg_queue.get_nowait()
                if kind == "result":
                    self._on_result(payload)
                elif kind == "done":
                    self._on_done()
        except queue.Empty:
            pass
        self.root.after(120, self._drain_queue)

    def _on_result(self, res):
        self.scanned += 1
        if res.get("has_data"):
            self.found += 1
            self.results.append(res)
            self._add_row(res)
            if not self._sample_headers and res.get("headers"):
                self._sample_headers = res["headers"]
                self._fill_column_choices(res["headers"])
        elif not res.get("ok"):
            self.fail += 1
        else:
            self.empty += 1
        self.progress.configure(value=self.scanned)
        self.status_var.set("진행 {}/{}  |  데이터 확인 {}  |  빈 몰 {}  |  접속실패 {}".format(
            self.scanned, self.total, self.found, self.empty, self.fail))

    def _add_row(self, res):
        row = ttk.Frame(self.list_frame)
        row.pack(fill="x", pady=1)
        host = urllib.parse.urlsplit(res["url"]).netloc
        ttk.Label(row, text="tmg{}".format(res["number"]), width=10).pack(side="left", padx=4)
        ttk.Label(row, text=host, width=28).pack(side="left", padx=4)
        ttk.Label(row, text=str(res.get("data_rows", "")), width=10).pack(side="left", padx=4)
        url = res["url"]
        ttk.Button(row, text="엑셀 열기", command=lambda u=url: webbrowser.open(u)).pack(side="left", padx=2)
        ttk.Button(row, text="주소 복사", command=lambda u=url: self._copy(u)).pack(side="left", padx=2)

    def _copy(self, text):
        self.root.clipboard_clear(); self.root.clipboard_append(text)
        self.status_var.set("주소를 클립보드에 복사했습니다.")

    def _fill_column_choices(self, headers):
        for cb in (self.cb_status, self.cb_amount, self.cb_ship, self.cb_cat):
            cb["values"] = headers
        # 자동 감지로 기본 선택 채우기
        def pick(keys, default):
            i = core.find_col(headers, keys)
            return headers[i] if i >= 0 else default
        self.col_status.set(pick(core.STATUS_KEYS, self.col_status.get()))
        self.col_amount.set(pick(core.AMOUNT_KEYS, self.col_amount.get()))
        i_ship = core.find_col(headers, core.SHIP_KEYS)
        self.col_ship.set(headers[i_ship] if i_ship >= 0 else "")
        self.col_cat.set(pick(core.CATEGORY_KEYS, self.col_cat.get()))

    def _on_done(self):
        self.start_btn.configure(state="normal")
        self.stop_btn.configure(state="disabled")
        if self.results:
            self.save_btn.configure(state="normal")
            self.analyze_btn.configure(state="normal")
            self.sales_status.set("스캔 완료. [매출 분석 실행]을 눌러 집계하세요.")
        done = "완료" if not self.stop_flag.is_set() else "중지됨"
        self.status_var.set("{} - 총 {}개 스캔, 데이터 확인 {}개 (빈 몰 {}, 접속실패 {})".format(
            done, self.scanned, self.found, self.empty, self.fail))

    # -------------------------------------------------------------- analysis
    def run_analysis(self):
        if not self.results:
            return
        exclude = [k.strip() for k in self.exclude_var.get().split(",") if k.strip()]
        status_keys = [self.col_status.get()] + core.STATUS_KEYS
        amount_keys = [self.col_amount.get()] + core.AMOUNT_KEYS
        ship_keys = ([self.col_ship.get()] if self.col_ship.get().strip() else []) + core.SHIP_KEYS
        cat_keys = [self.col_cat.get()] + core.CATEGORY_KEYS
        try:
            big = float(self.big_var.get())
        except ValueError:
            big = core.DEFAULT_BIG_THRESHOLD

        analysis = []
        no_amount = []
        for res in self.results:
            headers, rows = res.get("headers"), res.get("rows")
            if not headers:
                continue
            r = core.analyze_sales(headers, rows,
                                   status_keys=status_keys, amount_keys=amount_keys,
                                   ship_keys=ship_keys, category_keys=cat_keys,
                                   exclude_keywords=exclude)
            if not r["has_amount"]:
                no_amount.append(res["number"])
                continue
            host = urllib.parse.urlsplit(res["url"]).netloc
            analysis.append({
                "number": res["number"], "host": host, "url": res["url"],
                "sales": r["total_sales"], "normal_count": r["normal_count"],
                "excluded_count": r["excluded_count"], "by_category": r["by_category"],
                "has_ship": r["has_ship"], "note": r["note"],
            })

        analysis = core.rank_by_sales(analysis)
        self.analysis = analysis
        self.big_threshold = big
        self._render_analysis(analysis, big, no_amount)

    def _render_analysis(self, analysis, big, no_amount):
        for iid in self.tree.get_children():
            self.tree.delete(iid)
        for rank, a in enumerate(analysis, 1):
            self.tree.insert("", "end", iid=str(a["number"]), values=(
                rank, "tmg{}".format(a["number"]), a["host"],
                "{:,}".format(a["normal_count"]), core.won(a["sales"]), "▶ 열기",
            ))
        self.open_sel_btn.configure(state="normal" if analysis else "disabled")

        # 카테고리 카드 영역 초기화
        for ch in list(self.cat_frame.children.values()):
            ch.destroy()

        big_list = [a for a in analysis if a["sales"] >= big]
        total_all = sum(a["sales"] for a in analysis)
        self.cat_summary.set("전체 순번 {}개 · 정상주문 총매출 {}  |  1천만원({}) 이상: {}개".format(
            len(analysis), core.won(total_all), core.won(big), len(big_list)))

        for a in big_list:
            self._add_cat_card(a)

        if not big_list:
            ttk.Label(self.cat_frame, foreground="#888",
                      text="(1천만원 이상 매출을 낸 순번이 없습니다.)").pack(anchor="w", padx=8, pady=6)
        if no_amount:
            ttk.Label(self.cat_frame, foreground="#a00",
                      text="※ 결제금액합계 열을 찾지 못해 제외된 순번: " +
                           ", ".join("tmg{}".format(n) for n in no_amount)
                      ).pack(anchor="w", padx=8, pady=(6, 2))

        self.export_btn.configure(state="normal")
        self.report_btn.configure(state="normal")
        self.sales_status.set("분석 완료 · 순번 {}개 · 1천만원↑ {}개".format(len(analysis), len(big_list)))

    def _add_cat_card(self, a):
        """1천만원 이상 순번 1개의 카드(헤더 + [엑셀 열기] 버튼 + 카테고리 표)."""
        card = ttk.Frame(self.cat_frame, relief="groove", borderwidth=1)
        card.pack(fill="x", padx=6, pady=4)
        head = ttk.Frame(card)
        head.pack(fill="x", padx=6, pady=(4, 2))
        ttk.Label(head, text="tmg{}".format(a["number"]),
                  font=("", 11, "bold")).pack(side="left")
        ttk.Label(head, text="  총매출 {}  (정상 {}건 / 제외 {}건) · {}".format(
            core.won(a["sales"]), a["normal_count"], a["excluded_count"], a["host"]),
            foreground="#333").pack(side="left")
        url = a["url"]
        ttk.Button(head, text="엑셀 열기",
                   command=lambda u=url: webbrowser.open(u)).pack(side="right", padx=2)
        ttk.Button(head, text="주소 복사",
                   command=lambda u=url: self._copy(u)).pack(side="right", padx=2)

        table = ttk.Frame(card)
        table.pack(fill="x", padx=16, pady=(0, 6))
        for col, txt, w, anc in [(0, "상품카테고리", 20, "w"), (1, "매출", 16, "e"),
                                 (2, "건수", 8, "e"), (3, "비중", 8, "e")]:
            ttk.Label(table, text=txt, width=w, anchor=anc,
                      font=("", 9, "bold"), foreground="#555").grid(row=0, column=col, sticky="we")
        for i, (cat, v) in enumerate(sorted(a["by_category"].items(),
                                            key=lambda x: -x[1]["sales"]), start=1):
            share = (v["sales"] / a["sales"] * 100) if a["sales"] else 0
            ttk.Label(table, text=cat, width=20, anchor="w").grid(row=i, column=0, sticky="we")
            ttk.Label(table, text=core.won(v["sales"]), width=16, anchor="e").grid(row=i, column=1, sticky="we")
            ttk.Label(table, text="{:,}건".format(v["count"]), width=8, anchor="e").grid(row=i, column=2, sticky="we")
            ttk.Label(table, text="{:.1f}%".format(share), width=8, anchor="e").grid(row=i, column=3, sticky="we")

    def open_selected_excel(self):
        self._open_selected(None)

    def _tree_click(self, event):
        """'엑셀' 칸(#6)을 클릭하면 바로 열기."""
        if self.tree.identify("region", event.x, event.y) != "cell":
            return
        if self.tree.identify_column(event.x) != "#6":
            return
        iid = self.tree.identify_row(event.y)
        if iid:
            for a in self.analysis:
                if str(a["number"]) == iid:
                    webbrowser.open(a["url"]); break

    def _open_selected(self, event):
        sel = self.tree.selection()
        if not sel:
            self.sales_status.set("먼저 순위표에서 순번(행)을 선택하세요.")
            return
        for a in self.analysis:
            if str(a["number"]) == sel[0]:
                webbrowser.open(a["url"]); break

    # -------------------------------------------------------------- exports
    def save_list_csv(self):
        if not self.results:
            return
        p = filedialog.asksaveasfilename(
            defaultextension=".csv", filetypes=[("CSV 파일", "*.csv")],
            initialfile="tmg_데이터확인순번_{}.csv".format(datetime.now().strftime("%Y%m%d_%H%M")))
        if not p:
            return
        with open(p, "w", newline="", encoding="utf-8-sig") as f:
            w = csv.writer(f)
            w.writerow(["순번", "host", "데이터행", "주소"])
            for r in sorted(self.results, key=lambda x: x["number"]):
                host = urllib.parse.urlsplit(r["url"]).netloc
                w.writerow([r["number"], host, r.get("data_rows", ""), r["url"]])
        messagebox.showinfo("저장 완료", "목록을 저장했습니다.\n{}".format(p))

    def save_analysis_csv(self):
        if not self.analysis:
            return
        p = filedialog.asksaveasfilename(
            defaultextension=".csv", filetypes=[("CSV 파일", "*.csv")],
            initialfile="tmg_매출분석_{}.csv".format(datetime.now().strftime("%Y%m%d_%H%M")))
        if not p:
            return
        with open(p, "w", newline="", encoding="utf-8-sig") as f:
            w = csv.writer(f)
            w.writerow(["[순번별 매출 순위]"])
            w.writerow(["순위", "순번", "host", "정상건수", "제외건수", "매출(원)", "주소"])
            for rank, a in enumerate(self.analysis, 1):
                w.writerow([rank, "tmg{}".format(a["number"]), a["host"],
                            a["normal_count"], a["excluded_count"],
                            int(round(a["sales"])), a["url"]])
            w.writerow([])
            w.writerow(["[1천만원 이상 순번 · 상품 카테고리별]"])
            w.writerow(["순번", "host", "상품카테고리", "매출(원)", "건수"])
            for a in self.analysis:
                if a["sales"] < self.big_threshold:
                    continue
                for cat, v in sorted(a["by_category"].items(), key=lambda x: -x[1]["sales"]):
                    w.writerow(["tmg{}".format(a["number"]), a["host"], cat,
                                int(round(v["sales"])), v["count"]])
        messagebox.showinfo("저장 완료", "매출 분석을 저장했습니다.\n{}".format(p))

    def open_report(self):
        if not self.analysis:
            return
        rank_rows = []
        for rank, a in enumerate(self.analysis, 1):
            url = a["url"].replace('"', "&quot;")
            rank_rows.append(
                "<tr><td>{r}</td><td>tmg{n}</td><td>{host}</td><td class='num'>{cnt}</td>"
                "<td class='num'>{sales}</td><td><a class='btn' href='{url}' target='_blank'>엑셀 열기</a></td></tr>".format(
                    r=rank, n=a["number"], host=a["host"], cnt="{:,}".format(a["normal_count"]),
                    sales=core.won(a["sales"]), url=url))
        big_blocks = []
        for a in self.analysis:
            if a["sales"] < self.big_threshold:
                continue
            crows = []
            for cat, v in sorted(a["by_category"].items(), key=lambda x: -x[1]["sales"]):
                share = (v["sales"] / a["sales"] * 100) if a["sales"] else 0
                crows.append("<tr><td>{cat}</td><td class='num'>{s}</td><td class='num'>{c}건</td>"
                             "<td class='num'>{p:.1f}%</td></tr>".format(
                                 cat=cat, s=core.won(v["sales"]), c=v["count"], p=share))
            url = a["url"].replace('"', "&quot;")
            big_blocks.append(
                "<div class='card'><h3>tmg{n} · {sales} "
                "<a class='btn' href='{url}' target='_blank'>엑셀 열기</a></h3>"
                "<div class='sub'>{host} · 정상 {cnt}건 / 제외 {ex}건</div>"
                "<table class='cat'><thead><tr><th>상품카테고리</th><th>매출</th><th>건수</th><th>비중</th></tr></thead>"
                "<tbody>{rows}</tbody></table></div>".format(
                    n=a["number"], sales=core.won(a["sales"]), url=url, host=a["host"],
                    cnt=a["normal_count"], ex=a["excluded_count"], rows="".join(crows)))
        html = REPORT_HTML.format(
            when=datetime.now().strftime("%Y-%m-%d %H:%M"),
            total=len(self.analysis), big=core.won(self.big_threshold),
            total_sales=core.won(sum(a["sales"] for a in self.analysis)),
            rank_rows="".join(rank_rows),
            big_blocks="".join(big_blocks) or "<p>1천만원 이상 순번이 없습니다.</p>")
        fd, path = tempfile.mkstemp(suffix=".html", prefix="tmg_매출리포트_")
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(html)
        webbrowser.open("file://" + path)
        self.sales_status.set("리포트를 브라우저로 열었습니다.")


REPORT_HTML = """<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TMG 매출 분석 리포트</title><style>
 body{{font-family:'Malgun Gothic',AppleGothic,sans-serif;margin:24px;color:#222;background:#f6f7fb}}
 h1{{font-size:22px}} h3{{font-size:16px;margin:0 0 4px}}
 .meta{{color:#666;margin-bottom:16px}}
 table{{border-collapse:collapse;width:100%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.08);margin-bottom:8px}}
 th,td{{border-bottom:1px solid #eee;padding:9px 12px;font-size:14px}}
 th{{background:#4a5aef;color:#fff;text-align:left}}
 td.num,th.num{{text-align:right}}
 .btn{{display:inline-block;background:#4a5aef;color:#fff;text-decoration:none;padding:4px 12px;border-radius:6px;font-size:12px}}
 .btn:hover{{background:#3646d6}}
 .card{{background:#fff;border-radius:10px;padding:14px 16px;margin:12px 0;box-shadow:0 1px 4px rgba(0,0,0,.08)}}
 .card .sub{{color:#777;font-size:13px;margin-bottom:8px}}
 table.cat{{box-shadow:none}} table.cat th{{background:#eef0ff;color:#333}}
</style></head><body>
<h1>TMG 매출 분석 리포트</h1>
<div class="meta">생성 {when} · 순번 <b>{total}</b>개 · 정상주문 총매출 <b>{total_sales}</b>
 · 매출 = 결제금액합계 + 결제배송비(정상주문 · 취소/반품/교환 제외)</div>
<h2>① 순번별 매출 순위 (큰 순)</h2>
<table><thead><tr><th>순위</th><th>순번</th><th>host</th><th class="num">정상건수</th>
<th class="num">매출</th><th>바로가기</th></tr></thead><tbody>{rank_rows}</tbody></table>
<h2 style="margin-top:22px">② 1천만원({big}) 이상 순번 · 상품 카테고리별</h2>
{big_blocks}
</body></html>
"""


def main():
    if tk is None:
        print("tkinter 를 불러올 수 없습니다. (Windows/macOS 공식 파이썬엔 기본 포함)")
        print("리눅스: sudo apt install python3-tk")
        print("원인:", TK_IMPORT_ERROR)
        sys.exit(1)
    root = tk.Tk()
    try:
        style = ttk.Style()
        if "clam" in style.theme_names():
            style.theme_use("clam")
    except Exception:
        pass
    App(root)
    root.mainloop()


if __name__ == "__main__":
    main()
