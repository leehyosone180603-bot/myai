"""
스마트스토어 / 브랜드스토어 / 무신사 상품 이미지 수집 & 배경 제거 GUI v2.0
"""
import asyncio
import os
import re
import subprocess
import sys
import threading
import time
from pathlib import Path
from urllib.parse import urlparse, parse_qs
import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox

import requests
from playwright.async_api import async_playwright
from rembg import remove
from PIL import Image
import io


# ───────────────────────────── Playwright 경로 ──────────────────────────────

def get_playwright_browsers_path() -> str:
    home = Path.home()
    candidates = [
        home / "AppData" / "Local" / "ms-playwright",
        home / ".cache" / "ms-playwright",
    ]
    env_path = os.environ.get("PLAYWRIGHT_BROWSERS_PATH", "")
    if env_path:
        candidates.insert(0, Path(env_path))
    for p in candidates:
        if p and p.exists():
            return str(p)
    return str(home / "AppData" / "Local" / "ms-playwright")


def ensure_playwright_browsers(log=print):
    browsers_path = get_playwright_browsers_path()
    os.environ["PLAYWRIGHT_BROWSERS_PATH"] = browsers_path
    log("브라우저 초기화 중...")
    result = subprocess.run(
        [sys.executable, "-m", "playwright", "install", "chromium"],
        capture_output=True, text=True,
        env={**os.environ, "PLAYWRIGHT_BROWSERS_PATH": browsers_path},
    )
    if result.returncode != 0:
        log(f"브라우저 설치 실패: {result.stderr[:200]}")
        return False
    log("브라우저 준비 완료!")
    return True


# ───────────────────────────── 사이트 감지 ──────────────────────────────────

def detect_site(url: str) -> str:
    if "smartstore.naver.com" in url:
        return "smartstore"
    if "brand.naver.com" in url:
        return "brandstore"
    if "musinsa.com" in url:
        return "musinsa"
    raise ValueError(
        f"지원하지 않는 URL입니다: {url}\n"
        "지원 사이트: smartstore.naver.com / brand.naver.com / musinsa.com"
    )


def parse_naver_store_id(url: str) -> str:
    parsed = urlparse(url)
    parts = [p for p in parsed.path.split("/") if p]
    if parts:
        return parts[0]
    raise ValueError(f"스토어 ID를 파싱할 수 없습니다: {url}")


def parse_musinsa_store_code(url: str) -> str:
    qs = parse_qs(urlparse(url).query)
    return qs.get("storeCode", ["musinsa"])[0]


# ───────────────────────────── 스크롤 헬퍼 ──────────────────────────────────

async def slow_scroll(page, steps=8, delay=0.3):
    total = await page.evaluate("document.body.scrollHeight")
    for i in range(1, steps + 1):
        await page.evaluate(f"window.scrollTo(0, {int(total * i / steps)})")
        await asyncio.sleep(delay)


# ───────────────────────────── 네이버 수집 ──────────────────────────────────

async def fetch_naver_products(store_url: str, log, page, limit: int = 0) -> list:
    site = detect_site(store_url)
    store_id = parse_naver_store_id(store_url)

    if site == "smartstore":
        base = f"https://smartstore.naver.com/{store_id}/products"
    else:
        base = f"https://brand.naver.com/{store_id}/products"

    log(f"상품 목록 수집 중: {base}")
    products = []
    page_no = 1

    while True:
        if limit > 0 and len(products) >= limit:
            break

        url = f"{base}?page={page_no}"
        await page.goto(url, wait_until="networkidle", timeout=30000)
        await slow_scroll(page)

        anchors = await page.query_selector_all("a[href*='/products/']")
        if not anchors:
            break

        new_found = 0
        seen_hrefs = {p["url"] for p in products}

        for a_el in anchors:
            if limit > 0 and len(products) >= limit:
                break

            href = await a_el.get_attribute("href")
            if not href:
                continue
            if not href.startswith("http"):
                parsed = urlparse(store_url)
                href = f"{parsed.scheme}://{parsed.netloc}{href}"
            if href in seen_hrefs:
                continue

            # 이미지 탐색
            img_el = await a_el.query_selector("img")
            img_url = None
            if img_el:
                for attr in ("src", "data-src", "data-lazy-src", "data-original"):
                    val = await img_el.get_attribute(attr)
                    if val and val.startswith("http"):
                        img_url = val
                        break

            if img_url:
                seen_hrefs.add(href)
                products.append({"url": href, "image": img_url})
                new_found += 1

        log(f"  페이지 {page_no}: {new_found}개 수집 (누계 {len(products)}개)")
        if new_found == 0:
            break
        page_no += 1

    return products[:limit] if limit > 0 else products


# ───────────────────────────── 무신사 수집 ──────────────────────────────────

async def fetch_musinsa_products(store_url: str, log, page, limit: int = 0) -> list:
    log(f"무신사 상품 수집 중: {store_url}")
    products = []

    await page.goto(store_url, wait_until="networkidle", timeout=30000)
    await asyncio.sleep(2)

    prev_count = -1
    while True:
        if limit > 0 and len(products) >= limit:
            break

        await slow_scroll(page, steps=10, delay=0.4)
        await asyncio.sleep(1)

        selectors = [
            "a[href*='/products/']",
            "a[href*='/app/goods/']",
            "a[href*='goods_no=']",
        ]
        anchors = []
        for sel in selectors:
            anchors += await page.query_selector_all(sel)

        seen_hrefs = {p["url"] for p in products}
        new_found = 0

        for a_el in anchors:
            if limit > 0 and len(products) >= limit:
                break

            href = await a_el.get_attribute("href")
            if not href:
                continue
            if not href.startswith("http"):
                href = "https://www.musinsa.com" + href
            if href in seen_hrefs:
                continue

            img_el = await a_el.query_selector("img")
            img_url = None
            if img_el:
                for attr in ("src", "data-src", "data-lazy-src", "data-original"):
                    val = await img_el.get_attribute(attr)
                    if val and val.startswith("http"):
                        img_url = val
                        break

            if img_url:
                seen_hrefs.add(href)
                products.append({"url": href, "image": img_url})
                new_found += 1

        log(f"  스크롤 후 {new_found}개 추가 (누계 {len(products)}개)")

        if len(products) == prev_count:
            break
        prev_count = len(products)

        # 더보기 버튼 클릭 시도
        try:
            more_btn = await page.query_selector("button:has-text('더보기'), a:has-text('더보기')")
            if more_btn:
                await more_btn.click()
                await asyncio.sleep(1)
        except Exception:
            pass

    return products[:limit] if limit > 0 else products


# ───────────────────────────── 통합 fetch ───────────────────────────────────

async def fetch_products(url: str, log, limit: int = 0) -> list:
    browsers_path = get_playwright_browsers_path()
    os.environ["PLAYWRIGHT_BROWSERS_PATH"] = browsers_path

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        page = await browser.new_page()
        try:
            site = detect_site(url)
            if site in ("smartstore", "brandstore"):
                products = await fetch_naver_products(url, log, page, limit)
            else:
                products = await fetch_musinsa_products(url, log, page, limit)
        finally:
            await browser.close()

    return products


# ───────────────────────────── 이미지 처리 ──────────────────────────────────

def download_image(img_url: str, save_path: Path, referer: str = "") -> bool:
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Referer": referer or img_url,
    }
    try:
        resp = requests.get(img_url, headers=headers, timeout=15)
        resp.raise_for_status()
        save_path.write_bytes(resp.content)
        return True
    except Exception as e:
        return False


def remove_background(src_path: Path, dst_path: Path) -> bool:
    try:
        with Image.open(src_path) as img:
            result = remove(img)
        result.save(dst_path, "PNG")
        return True
    except Exception as e:
        return False


# ───────────────────────────── GUI ──────────────────────────────────────────

DEFAULT_URL = (
    "https://www.musinsa.com/main/beauty/ranking"
    "?gf=A&storeCode=beauty&sectionId=231&contentsId=&categoryCode=104000&ageBand=AGE_BAND_ALL"
)

LIMIT_OPTIONS = ["전체", "10", "30", "50", "100", "200", "500"]


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("스마트스토어 배경 제거기 v2.0")
        self.geometry("720x600")
        self.resizable(True, True)
        self.configure(bg="#1e1e1e")

        self._build_ui()
        self._output_dirs: list[Path] = []

    # ── UI 구성 ──────────────────────────────────────────────────────────────

    def _build_ui(self):
        FG = "#e0e0e0"
        BG = "#1e1e1e"
        ENTRY_BG = "#2d2d2d"
        BTN_BG = "#0078d4"
        BTN_FG = "#ffffff"

        style = ttk.Style(self)
        style.theme_use("clam")
        style.configure("TProgressbar", troughcolor="#2d2d2d", background="#0078d4", thickness=18)

        pad = {"padx": 10, "pady": 4}

        # URL 입력
        lbl_url = tk.Label(self, text="URL 목록 (한 줄에 하나씩):", fg=FG, bg=BG)
        lbl_url.pack(anchor="w", **pad)

        self.txt_urls = tk.Text(self, height=6, bg=ENTRY_BG, fg=FG,
                                insertbackground=FG, relief="flat", font=("Consolas", 10))
        self.txt_urls.insert("1.0", DEFAULT_URL)
        self.txt_urls.pack(fill="x", **pad)

        # 상품 수 제한
        row_limit = tk.Frame(self, bg=BG)
        row_limit.pack(fill="x", **pad)
        tk.Label(row_limit, text="상품 수 제한:", fg=FG, bg=BG).pack(side="left")
        self.var_limit = tk.StringVar(value="50")
        cb = ttk.Combobox(row_limit, textvariable=self.var_limit,
                          values=LIMIT_OPTIONS, width=8, state="readonly")
        cb.pack(side="left", padx=6)
        tk.Label(row_limit, text="(전체 = 제한 없음)", fg="#888", bg=BG, font=("", 9)).pack(side="left")

        # 버튼 행
        row_btn = tk.Frame(self, bg=BG)
        row_btn.pack(fill="x", **pad)

        self.btn_start = tk.Button(row_btn, text="▶ 작업 시작", bg=BTN_BG, fg=BTN_FG,
                                   relief="flat", padx=12, pady=6,
                                   command=self._on_start)
        self.btn_start.pack(side="left", padx=(0, 8))

        self.btn_orig = tk.Button(row_btn, text="📁 원본이미지 폴더", bg="#333", fg=FG,
                                  relief="flat", padx=10, pady=6,
                                  command=lambda: self._open_folder("원본이미지"))
        self.btn_orig.pack(side="left", padx=(0, 4))

        self.btn_bg = tk.Button(row_btn, text="📁 배경제거 폴더", bg="#333", fg=FG,
                                relief="flat", padx=10, pady=6,
                                command=lambda: self._open_folder("배경제거"))
        self.btn_bg.pack(side="left")

        # 진행률
        self.var_prog = tk.DoubleVar(value=0)
        self.progressbar = ttk.Progressbar(self, variable=self.var_prog, maximum=100)
        self.progressbar.pack(fill="x", padx=10, pady=(8, 2))

        self.lbl_prog = tk.Label(self, text="대기 중", fg="#aaa", bg=BG, font=("", 9))
        self.lbl_prog.pack(anchor="w", padx=10)

        # 로그
        tk.Label(self, text="작업 로그:", fg=FG, bg=BG).pack(anchor="w", padx=10)
        self.log_area = scrolledtext.ScrolledText(self, height=14, bg="#111", fg="#ccc",
                                                  font=("Consolas", 9), state="disabled",
                                                  relief="flat")
        self.log_area.pack(fill="both", expand=True, padx=10, pady=(2, 10))

    # ── 헬퍼 ─────────────────────────────────────────────────────────────────

    def _log(self, msg: str):
        self.log_area.configure(state="normal")
        self.log_area.insert("end", msg + "\n")
        self.log_area.see("end")
        self.log_area.configure(state="disabled")
        self.update_idletasks()

    def _set_progress(self, pct: float, label: str = ""):
        self.var_prog.set(pct)
        if label:
            self.lbl_prog.configure(text=label)
        self.update_idletasks()

    def _open_folder(self, sub: str):
        if not self._output_dirs:
            messagebox.showinfo("알림", "먼저 작업을 실행하세요.")
            return
        opened = False
        for base in self._output_dirs:
            folder = base / sub
            folder.mkdir(parents=True, exist_ok=True)
            if sys.platform == "win32":
                os.startfile(str(folder))
            elif sys.platform == "darwin":
                subprocess.Popen(["open", str(folder)])
            else:
                subprocess.Popen(["xdg-open", str(folder)])
            opened = True
        if not opened:
            messagebox.showinfo("알림", "출력 폴더를 찾을 수 없습니다.")

    # ── 시작 버튼 ────────────────────────────────────────────────────────────

    def _on_start(self):
        urls_raw = self.txt_urls.get("1.0", "end").strip()
        urls = [u.strip() for u in urls_raw.splitlines() if u.strip()]
        if not urls:
            messagebox.showwarning("경고", "URL을 하나 이상 입력하세요.")
            return

        limit_str = self.var_limit.get()
        limit = 0 if limit_str == "전체" else int(limit_str)

        self.btn_start.configure(state="disabled")
        self._output_dirs.clear()
        self._set_progress(0, "작업 준비 중...")

        thread = threading.Thread(target=self._run_all, args=(urls, limit), daemon=True)
        thread.start()

    # ── 백그라운드 작업 ──────────────────────────────────────────────────────

    def _run_all(self, urls: list[str], limit: int):
        try:
            if not ensure_playwright_browsers(self._log):
                self._log("브라우저 준비 실패. 작업을 중단합니다.")
                return

            total_urls = len(urls)
            for idx, store_url in enumerate(urls):
                self._log(f"\n{'='*50}")
                self._log(f"[{idx+1}/{total_urls}] {store_url}")

                # 출력 폴더 결정
                try:
                    site = detect_site(store_url)
                except ValueError as e:
                    self._log(str(e))
                    continue

                if site == "musinsa":
                    qs = parse_qs(urlparse(store_url).query)
                    sc = qs.get("storeCode", ["musinsa"])[0]
                    cc = qs.get("categoryCode", [""])[0]
                    si = qs.get("sectionId", [""])[0]
                    folder_name = f"output_musinsa_{sc}_{cc}_{si}"
                else:
                    store_id = parse_naver_store_id(store_url)
                    folder_name = f"output_{store_id}"

                base_dir = Path.cwd() / folder_name
                orig_dir = base_dir / "원본이미지"
                bg_dir = base_dir / "배경제거"
                orig_dir.mkdir(parents=True, exist_ok=True)
                bg_dir.mkdir(parents=True, exist_ok=True)
                self._output_dirs.append(base_dir)

                # 상품 수집
                self._set_progress(0, f"상품 수집 중 ({idx+1}/{total_urls})")
                try:
                    products = asyncio.run(fetch_products(store_url, self._log, limit))
                except Exception as e:
                    self._log(f"수집 오류: {e}")
                    continue

                if not products:
                    self._log("수집된 상품이 없습니다.")
                    continue

                self._log(f"총 {len(products)}개 상품 수집 완료")

                total = len(products)

                # 이미지 다운로드 (0~40%)
                downloaded = []
                for i, prod in enumerate(products):
                    pct = (i + 1) / total * 40
                    self._set_progress(pct, f"다운로드 {i+1}/{total}")
                    fname = f"{i+1:04d}.jpg"
                    save_path = orig_dir / fname
                    ok = download_image(prod["image"], save_path, referer=prod["url"])
                    if ok:
                        downloaded.append((save_path, bg_dir / f"{i+1:04d}.png"))
                        self._log(f"  [{i+1}] 다운로드 완료")
                    else:
                        self._log(f"  [{i+1}] 다운로드 실패: {prod['image'][:60]}")

                self._log(f"다운로드 완료: {len(downloaded)}/{total}")

                # 배경 제거 (40~100%)
                for j, (src, dst) in enumerate(downloaded):
                    pct = 40 + (j + 1) / len(downloaded) * 60
                    self._set_progress(pct, f"배경 제거 {j+1}/{len(downloaded)}")
                    ok = remove_background(src, dst)
                    if ok:
                        self._log(f"  [{j+1}] 배경 제거 완료")
                    else:
                        self._log(f"  [{j+1}] 배경 제거 실패: {src.name}")

            self._set_progress(100, "모든 작업 완료!")
            self._log("\n✅ 모든 작업이 완료되었습니다.")

        except Exception as e:
            self._log(f"\n❌ 오류 발생: {e}")
        finally:
            self.btn_start.configure(state="normal")


# ───────────────────────────── 진입점 ───────────────────────────────────────

if __name__ == "__main__":
    app = App()
    app.mainloop()
