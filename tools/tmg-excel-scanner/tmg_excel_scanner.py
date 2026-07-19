#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TMG 매출 엑셀 스캐너 (UI 실행 프로그램)
=====================================

여러 개의 tmg 쇼핑몰(cafe24) 관리자 엑셀 내보내기 주소를 자동으로 훑어서,
- 실제 주문 데이터가 들어 있는 순번(tmg 번호)만 골라내고
- 데이터가 없는(열 제목만 있는) 순번은 자동으로 제외한 뒤
- 확인된 순번마다 "엑셀 열기" 버튼을 만들어 바로 다운로드/이동할 수 있게 해 줍니다.

주소 규칙
--------
  * 1 ~ 3999   :  https://tmg{번호}.cafe24.com/...      (my 없음)
  * 4000 ~ 5500:  https://tmg{번호}.mycafe24.com/...    (my 포함)

데이터 유무 판정
--------------
  * 열 제목(헤더) 한 줄만 있으면  ->  데이터 없음 (제외)
  * 헤더 + 실제 주문행이 있으면   ->  데이터 있음 (결과에 포함)

외부 라이브러리 없이 파이썬 표준 모듈(tkinter/urllib/zipfile)만으로 동작합니다.
"""

import io
import csv
import ssl
import re
import sys
import queue
import threading
import webbrowser
import zipfile
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

try:
    import tkinter as tk
    from tkinter import ttk, filedialog, messagebox
    TK_IMPORT_ERROR = None
except Exception as exc:  # pragma: no cover
    tk = None
    TK_IMPORT_ERROR = exc


# ---------------------------------------------------------------------------
# 기본 설정값
# ---------------------------------------------------------------------------

# 예시로 주신 2026년 7월 매출 주소 (search_sql 부분은 그대로 사용)
DEFAULT_SAMPLE_URL = (
    "https://tmg4205.mycafe24.com/mall/admin/admin_excel2.php?"
    "uid_check=&excel_type=all&search_sql="
    "%20and%20A.register_date%20%3E%3D%20%271782831600%27"
    "%20and%20A.register_date%20%3C%3D%20%271785509999%27"
    "%20%20and%20((A.buyer_payment%20%3D%20%271%27%20and%20A.buyer_state%20%3E%201)"
    "%20or%20A.buyer_payment%20!%3D%20%271%27)"
)

DEFAULT_START = 1
DEFAULT_END = 5500
DEFAULT_MY_THRESHOLD = 4000   # 이 번호 이상부터 mycafe24 사용
DEFAULT_WORKERS = 30
DEFAULT_TIMEOUT = 8           # 초


# ---------------------------------------------------------------------------
# 주소 관련 유틸
# ---------------------------------------------------------------------------

def parse_sample_url(sample_url):
    """샘플 주소에서 경로(path)와 쿼리 파라미터를 뽑아낸다.

    tmg 번호가 들어간 호스트는 나중에 번호별로 바꿔 끼우므로,
    여기서는 '경로 + 쿼리스트링' 만 재사용한다.
    반환: (path, query)  예: ('/mall/admin/admin_excel2.php', 'uid_check=&excel_type=all&search_sql=...')
    """
    parsed = urllib.parse.urlsplit(sample_url.strip())
    path = parsed.path or "/mall/admin/admin_excel2.php"
    query = parsed.query
    return path, query


def build_url(number, path, query, my_threshold):
    """tmg 번호에 맞는 최종 엑셀 다운로드 주소를 만든다."""
    if number >= my_threshold:
        host = "tmg{}.mycafe24.com".format(number)
    else:
        host = "tmg{}.cafe24.com".format(number)
    base = "https://{}{}".format(host, path)
    if query:
        return "{}?{}".format(base, query)
    return base


# ---------------------------------------------------------------------------
# 다운로드 + 데이터 유무 판정
# ---------------------------------------------------------------------------

def _count_xlsx_content_rows(content):
    """xlsx(zip) 파일에서 '값이 들어 있는 행'의 개수를 센다."""
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as zf:
            sheet_names = [n for n in zf.namelist()
                           if n.startswith("xl/worksheets/") and n.endswith(".xml")]
            if not sheet_names:
                return 0
            # 첫 번째 시트 기준
            sheet_names.sort()
            xml = zf.read(sheet_names[0]).decode("utf-8", errors="ignore")
    except Exception:
        return -1  # xlsx 로 열 수 없음

    content_rows = 0
    for row_match in re.finditer(r"<row\b[^>]*>(.*?)</row>", xml, re.DOTALL):
        row_body = row_match.group(1)
        # 값(<v>...) 또는 인라인 문자열(<t>...) 이 있으면 내용이 있는 행
        if re.search(r"<v>\s*\S", row_body) or re.search(r"<t[^>]*>\s*\S", row_body):
            content_rows += 1
    # 자체 종료 태그(<row .../>)만 있는 빈 행은 세지 않음
    return content_rows


def _count_html_table_rows(text):
    """HTML 표 형태로 내려오는 경우 <tr> 개수를 센다."""
    rows = re.findall(r"<tr\b", text, re.IGNORECASE)
    return len(rows)


def analyze(number, url, timeout):
    """한 개 주소를 다운로드해서 데이터 유무를 판정한다.

    반환 dict:
        number, url, ok(bool: 접속 성공), has_data(bool), data_rows(int),
        kind(str), note(str)
    """
    result = {
        "number": number, "url": url, "ok": False, "has_data": False,
        "data_rows": 0, "kind": "", "note": "",
    }

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE  # 몰마다 인증서가 제각각이라 검증은 끔

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
            content = resp.read()
    except Exception as exc:
        result["note"] = "접속 실패: {}".format(type(exc).__name__)
        return result

    result["ok"] = True

    if not content:
        result["note"] = "빈 응답"
        return result

    # 1) xlsx (ZIP: PK\x03\x04)
    if content[:2] == b"PK":
        rows = _count_xlsx_content_rows(content)
        if rows >= 0:
            result["kind"] = "xlsx"
            result["data_rows"] = max(rows - 1, 0)  # 헤더 1줄 제외
            result["has_data"] = rows >= 2
            return result

    # 2) xls (OLE2: D0 CF 11 E0) - 정밀 파싱은 어려워 크기로 추정
    if content[:4] == b"\xd0\xcf\x11\xe0":
        result["kind"] = "xls"
        # 헤더만 있는 파일은 매우 작음. 대략 6KB 초과면 데이터 있다고 판단.
        result["has_data"] = len(content) > 6000
        result["data_rows"] = 1 if result["has_data"] else 0
        result["note"] = "xls(추정, 크기 {}B)".format(len(content))
        return result

    # 3) 그 외 - HTML 표 또는 텍스트로 간주
    text = content.decode("utf-8", errors="ignore")
    tr = _count_html_table_rows(text)
    if tr > 0:
        result["kind"] = "html"
        result["data_rows"] = max(tr - 1, 0)
        result["has_data"] = tr >= 2
        return result

    # 로그인 페이지/에러 페이지 등
    result["kind"] = "text"
    lowered = text.lower()
    if "login" in lowered or "로그인" in text or "<html" in lowered:
        result["note"] = "엑셀 아님(HTML 페이지)"
    else:
        result["note"] = "형식 미상"
    return result


# ---------------------------------------------------------------------------
# GUI
# ---------------------------------------------------------------------------

class TmgScannerApp:
    def __init__(self, root):
        self.root = root
        self.root.title("TMG 매출 엑셀 스캐너")
        self.root.geometry("980x680")
        self.root.minsize(820, 560)

        self.msg_queue = queue.Queue()
        self.stop_flag = threading.Event()
        self.worker = None
        self.executor = None
        self.results = []          # 데이터 있는 항목 dict 목록
        self.scanned = 0
        self.total = 0
        self.found = 0
        self.fail = 0
        self.empty = 0

        self._build_ui()
        self.root.after(120, self._drain_queue)

    # ------------------------------------------------------------------ UI
    def _build_ui(self):
        pad = {"padx": 6, "pady": 4}

        # ---- 설정 영역 ----
        cfg = ttk.LabelFrame(self.root, text="설정")
        cfg.pack(fill="x", padx=10, pady=(10, 6))

        # 샘플 URL
        ttk.Label(cfg, text="샘플 주소(URL):").grid(row=0, column=0, sticky="w", **pad)
        self.url_var = tk.StringVar(value=DEFAULT_SAMPLE_URL)
        url_entry = ttk.Entry(cfg, textvariable=self.url_var)
        url_entry.grid(row=0, column=1, columnspan=5, sticky="we", **pad)
        ttk.Label(
            cfg,
            text="※ 위 주소에서 tmg 번호만 자동으로 바꿔가며 스캔합니다. "
                 "다른 달(月) 매출은 새 주소를 붙여넣기만 하면 됩니다.",
            foreground="#666",
        ).grid(row=1, column=1, columnspan=5, sticky="w", padx=6)

        # 범위
        ttk.Label(cfg, text="시작 번호:").grid(row=2, column=0, sticky="w", **pad)
        self.start_var = tk.StringVar(value=str(DEFAULT_START))
        ttk.Entry(cfg, textvariable=self.start_var, width=8).grid(row=2, column=1, sticky="w", **pad)

        ttk.Label(cfg, text="끝 번호:").grid(row=2, column=2, sticky="w", **pad)
        self.end_var = tk.StringVar(value=str(DEFAULT_END))
        ttk.Entry(cfg, textvariable=self.end_var, width=8).grid(row=2, column=3, sticky="w", **pad)

        ttk.Label(cfg, text="mycafe24 시작:").grid(row=2, column=4, sticky="w", **pad)
        self.thr_var = tk.StringVar(value=str(DEFAULT_MY_THRESHOLD))
        ttk.Entry(cfg, textvariable=self.thr_var, width=8).grid(row=2, column=5, sticky="w", **pad)

        ttk.Label(cfg, text="동시 접속 수:").grid(row=3, column=0, sticky="w", **pad)
        self.workers_var = tk.StringVar(value=str(DEFAULT_WORKERS))
        ttk.Entry(cfg, textvariable=self.workers_var, width=8).grid(row=3, column=1, sticky="w", **pad)

        ttk.Label(cfg, text="응답 대기(초):").grid(row=3, column=2, sticky="w", **pad)
        self.timeout_var = tk.StringVar(value=str(DEFAULT_TIMEOUT))
        ttk.Entry(cfg, textvariable=self.timeout_var, width=8).grid(row=3, column=3, sticky="w", **pad)

        cfg.columnconfigure(1, weight=1)

        # ---- 실행 버튼 영역 ----
        ctrl = ttk.Frame(self.root)
        ctrl.pack(fill="x", padx=10)
        self.start_btn = ttk.Button(ctrl, text="스캔 시작", command=self.start_scan)
        self.start_btn.pack(side="left", padx=4, pady=4)
        self.stop_btn = ttk.Button(ctrl, text="중지", command=self.stop_scan, state="disabled")
        self.stop_btn.pack(side="left", padx=4, pady=4)
        self.save_btn = ttk.Button(ctrl, text="결과 저장(CSV)", command=self.save_csv, state="disabled")
        self.save_btn.pack(side="left", padx=4, pady=4)
        self.html_btn = ttk.Button(ctrl, text="결과 페이지 열기(버튼 모음)", command=self.open_html, state="disabled")
        self.html_btn.pack(side="left", padx=4, pady=4)

        # ---- 진행 상황 ----
        prog = ttk.Frame(self.root)
        prog.pack(fill="x", padx=10, pady=(6, 0))
        self.progress = ttk.Progressbar(prog, mode="determinate")
        self.progress.pack(fill="x", side="left", expand=True, padx=(0, 8))
        self.status_var = tk.StringVar(value="대기 중")
        ttk.Label(prog, textvariable=self.status_var, width=46).pack(side="right")

        # ---- 결과 목록 (데이터가 확인된 순번) ----
        res = ttk.LabelFrame(self.root, text="데이터가 확인된 순번 (엑셀 열기 버튼 클릭)")
        res.pack(fill="both", expand=True, padx=10, pady=8)

        # 스크롤 가능한 프레임
        canvas = tk.Canvas(res, highlightthickness=0)
        vbar = ttk.Scrollbar(res, orient="vertical", command=canvas.yview)
        self.list_frame = ttk.Frame(canvas)
        self.list_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all")),
        )
        self._canvas_window = canvas.create_window((0, 0), window=self.list_frame, anchor="nw")
        canvas.bind(
            "<Configure>",
            lambda e: canvas.itemconfigure(self._canvas_window, width=e.width),
        )
        canvas.configure(yscrollcommand=vbar.set)
        canvas.pack(side="left", fill="both", expand=True)
        vbar.pack(side="right", fill="y")
        self._canvas = canvas

        # 마우스 휠 스크롤
        def _on_wheel(event):
            delta = -1 * (event.delta // 120) if event.delta else (1 if event.num == 5 else -1)
            canvas.yview_scroll(delta, "units")
        canvas.bind_all("<MouseWheel>", _on_wheel)
        canvas.bind_all("<Button-4>", _on_wheel)
        canvas.bind_all("<Button-5>", _on_wheel)

        # 목록 헤더
        self._add_list_header()

    def _add_list_header(self):
        header = ttk.Frame(self.list_frame)
        header.pack(fill="x", pady=(2, 4))
        ttk.Label(header, text="순번", width=10, font=("", 10, "bold")).pack(side="left", padx=4)
        ttk.Label(header, text="주소(host)", width=28, font=("", 10, "bold")).pack(side="left", padx=4)
        ttk.Label(header, text="데이터 행", width=10, font=("", 10, "bold")).pack(side="left", padx=4)
        ttk.Label(header, text="바로가기", font=("", 10, "bold")).pack(side="left", padx=4)
        ttk.Separator(self.list_frame, orient="horizontal").pack(fill="x")

    # -------------------------------------------------------------- actions
    def start_scan(self):
        try:
            start = int(self.start_var.get())
            end = int(self.end_var.get())
            thr = int(self.thr_var.get())
            workers = max(1, min(100, int(self.workers_var.get())))
            timeout = max(1, int(self.timeout_var.get()))
        except ValueError:
            messagebox.showerror("입력 오류", "숫자 항목을 올바르게 입력해 주세요.")
            return

        if start > end:
            messagebox.showerror("입력 오류", "시작 번호가 끝 번호보다 큽니다.")
            return

        sample = self.url_var.get().strip()
        if not sample:
            messagebox.showerror("입력 오류", "샘플 주소를 입력해 주세요.")
            return
        path, query = parse_sample_url(sample)

        # 결과 초기화
        for child in list(self.list_frame.children.values()):
            child.destroy()
        self._add_list_header()
        self.results = []
        self.scanned = 0
        self.found = 0
        self.fail = 0
        self.empty = 0
        self.total = end - start + 1
        self.stop_flag.clear()

        self.progress.configure(maximum=self.total, value=0)
        self.start_btn.configure(state="disabled")
        self.stop_btn.configure(state="normal")
        self.save_btn.configure(state="disabled")
        self.html_btn.configure(state="disabled")
        self.status_var.set("스캔 준비 중...")

        self.worker = threading.Thread(
            target=self._scan_worker,
            args=(start, end, path, query, thr, workers, timeout),
            daemon=True,
        )
        self.worker.start()

    def stop_scan(self):
        self.stop_flag.set()
        self.status_var.set("중지 요청됨... 진행 중인 작업 마무리 중")
        self.stop_btn.configure(state="disabled")

    def _scan_worker(self, start, end, path, query, thr, workers, timeout):
        numbers = range(start, end + 1)
        try:
            with ThreadPoolExecutor(max_workers=workers) as ex:
                futures = {}
                for n in numbers:
                    if self.stop_flag.is_set():
                        break
                    url = build_url(n, path, query, thr)
                    futures[ex.submit(analyze, n, url, timeout)] = n

                from concurrent.futures import as_completed
                for fut in as_completed(futures):
                    if self.stop_flag.is_set():
                        # 남은 것은 취소 시도
                        for f in futures:
                            f.cancel()
                    try:
                        res = fut.result()
                    except Exception as exc:
                        res = {"number": futures[fut], "ok": False, "has_data": False,
                               "note": "오류: {}".format(exc), "url": "", "data_rows": 0}
                    self.msg_queue.put(("result", res))
        finally:
            self.msg_queue.put(("done", None))

    # -------------------------------------------------------------- queue
    def _drain_queue(self):
        try:
            while True:
                kind, payload = self.msg_queue.get_nowait()
                if kind == "result":
                    self._handle_result(payload)
                elif kind == "done":
                    self._finish()
        except queue.Empty:
            pass
        self.root.after(120, self._drain_queue)

    def _handle_result(self, res):
        self.scanned += 1
        if res.get("has_data"):
            self.found += 1
            self.results.append(res)
            self._add_result_row(res)
        elif not res.get("ok"):
            self.fail += 1
        else:
            self.empty += 1

        self.progress.configure(value=self.scanned)
        self.status_var.set(
            "진행 {}/{}  |  데이터 확인 {}  |  빈 몰 {}  |  접속실패 {}".format(
                self.scanned, self.total, self.found, self.empty, self.fail
            )
        )

    def _add_result_row(self, res):
        row = ttk.Frame(self.list_frame)
        row.pack(fill="x", pady=1)
        host = urllib.parse.urlsplit(res["url"]).netloc
        ttk.Label(row, text="tmg{}".format(res["number"]), width=10).pack(side="left", padx=4)
        ttk.Label(row, text=host, width=28).pack(side="left", padx=4)
        rows_txt = str(res.get("data_rows", "")) if res.get("data_rows") else "있음"
        ttk.Label(row, text=rows_txt, width=10).pack(side="left", padx=4)
        url = res["url"]
        ttk.Button(row, text="엑셀 열기",
                   command=lambda u=url: webbrowser.open(u)).pack(side="left", padx=2)
        ttk.Button(row, text="주소 복사",
                   command=lambda u=url: self._copy(u)).pack(side="left", padx=2)

    def _copy(self, text):
        self.root.clipboard_clear()
        self.root.clipboard_append(text)
        self.status_var.set("주소를 클립보드에 복사했습니다.")

    def _finish(self):
        self.start_btn.configure(state="normal")
        self.stop_btn.configure(state="disabled")
        if self.results:
            self.save_btn.configure(state="normal")
            self.html_btn.configure(state="normal")
        done_txt = "완료" if not self.stop_flag.is_set() else "중지됨"
        self.status_var.set(
            "{} - 총 {}개 스캔, 데이터 확인 {}개 (빈 몰 {}, 접속실패 {})".format(
                done_txt, self.scanned, self.found, self.empty, self.fail
            )
        )

    # -------------------------------------------------------------- export
    def save_csv(self):
        if not self.results:
            return
        path = filedialog.asksaveasfilename(
            defaultextension=".csv",
            filetypes=[("CSV 파일", "*.csv")],
            initialfile="tmg_결과_{}.csv".format(datetime.now().strftime("%Y%m%d_%H%M")),
        )
        if not path:
            return
        with open(path, "w", newline="", encoding="utf-8-sig") as f:
            w = csv.writer(f)
            w.writerow(["순번", "host", "데이터행", "주소"])
            for r in sorted(self.results, key=lambda x: x["number"]):
                host = urllib.parse.urlsplit(r["url"]).netloc
                w.writerow([r["number"], host, r.get("data_rows", ""), r["url"]])
        messagebox.showinfo("저장 완료", "CSV 파일로 저장했습니다.\n{}".format(path))

    def open_html(self):
        if not self.results:
            return
        rows_html = []
        for r in sorted(self.results, key=lambda x: x["number"]):
            host = urllib.parse.urlsplit(r["url"]).netloc
            url = r["url"].replace('"', "&quot;")
            rows_html.append(
                '<tr><td>tmg{n}</td><td>{host}</td><td style="text-align:center">{rows}</td>'
                '<td><a class="btn" href="{url}" target="_blank" rel="noopener">엑셀 열기</a></td></tr>'.format(
                    n=r["number"], host=host, rows=r.get("data_rows", "있음"), url=url
                )
            )
        html = HTML_TEMPLATE.format(
            when=datetime.now().strftime("%Y-%m-%d %H:%M"),
            count=len(self.results),
            rows="\n".join(rows_html),
        )
        import tempfile
        import os
        fd, path = tempfile.mkstemp(suffix=".html", prefix="tmg_결과_")
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(html)
        webbrowser.open("file://" + path)
        self.status_var.set("결과 페이지를 브라우저로 열었습니다.")


HTML_TEMPLATE = """<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TMG 매출 엑셀 - 데이터 확인 순번</title>
<style>
  body{{font-family:'Malgun Gothic',AppleGothic,sans-serif;margin:24px;color:#222;background:#f7f7fb}}
  h1{{font-size:20px}}
  .meta{{color:#666;margin-bottom:16px}}
  table{{border-collapse:collapse;width:100%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.08)}}
  th,td{{border-bottom:1px solid #eee;padding:10px 12px;font-size:14px}}
  th{{background:#4a5aef;color:#fff;text-align:left}}
  tr:hover td{{background:#f2f4ff}}
  .btn{{display:inline-block;background:#4a5aef;color:#fff;text-decoration:none;
       padding:6px 14px;border-radius:6px;font-size:13px}}
  .btn:hover{{background:#3646d6}}
</style></head><body>
<h1>TMG 매출 엑셀 · 데이터가 확인된 순번</h1>
<div class="meta">생성 시각: {when} · 총 <b>{count}</b>개</div>
<table>
<thead><tr><th>순번</th><th>주소(host)</th><th>데이터 행</th><th>바로가기</th></tr></thead>
<tbody>
{rows}
</tbody></table>
</body></html>
"""


def main():
    if tk is None:
        print("tkinter 를 불러올 수 없습니다. 파이썬에 tkinter 가 포함되어 있어야 합니다.")
        print("Windows/macOS 공식 파이썬에는 기본 포함되어 있습니다.")
        print("(리눅스: sudo apt install python3-tk)")
        print("원인:", TK_IMPORT_ERROR)
        sys.exit(1)
    root = tk.Tk()
    # 기본 테마 살짝 정리
    try:
        style = ttk.Style()
        if "clam" in style.theme_names():
            style.theme_use("clam")
    except Exception:
        pass
    TmgScannerApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
