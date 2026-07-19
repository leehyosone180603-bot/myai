# -*- coding: utf-8 -*-
"""
TMG 스캐너 - 핵심 로직 (GUI 없이 단독 사용/테스트 가능)
====================================================

- 주소 생성 규칙 (cafe24 / mycafe24)
- 엑셀(xlsx) / HTML 표 파싱  ->  (헤더, 행들)
- 매출 분석:
    * 더망고주문상태 열에 취소/반품/교환 포함 행 제외
    * 매출 = 결제금액합계(원) + 결제배송비(원)  (배송비 열 없으면 결제금액합계만)
    * 상품 카테고리별 매출/건수 집계
표준 라이브러리(zipfile, re, html)만 사용합니다.
"""

import io
import re
import zipfile
import urllib.parse
from html import unescape

# ---------------------------------------------------------------------------
# 기본 설정값
# ---------------------------------------------------------------------------

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
DEFAULT_MY_THRESHOLD = 4000
DEFAULT_WORKERS = 30
DEFAULT_TIMEOUT = 8

# 매출/제외 관련 기본값 (사용자 확정 사항)
EXCLUDE_KEYWORDS = ["취소", "반품", "교환"]      # 더망고주문상태에 포함되면 제외
STATUS_KEYS = ["더망고주문상태", "주문상태"]      # 주문상태 열 후보 (앞이 우선)
AMOUNT_KEYS = ["결제금액합계", "결제금액", "결제금액합계(원)"]
SHIP_KEYS = ["결제배송비", "배송비"]
CATEGORY_KEYS = ["상품카테고리", "카테고리", "상품분류", "분류"]
ORDER_NO_KEYS = ["주문번호", "마켓주문번호"]
DEFAULT_BIG_THRESHOLD = 10_000_000                # 1천만원


# ---------------------------------------------------------------------------
# 주소 관련 유틸
# ---------------------------------------------------------------------------

def parse_sample_url(sample_url):
    """샘플 주소에서 경로(path)와 쿼리 파라미터를 뽑아낸다."""
    parsed = urllib.parse.urlsplit(sample_url.strip())
    path = parsed.path or "/mall/admin/admin_excel2.php"
    return path, parsed.query


def build_url(number, path, query, my_threshold):
    """tmg 번호에 맞는 최종 엑셀 다운로드 주소를 만든다."""
    if number >= my_threshold:
        host = "tmg{}.mycafe24.com".format(number)
    else:
        host = "tmg{}.cafe24.com".format(number)
    base = "https://{}{}".format(host, path)
    return "{}?{}".format(base, query) if query else base


# ---------------------------------------------------------------------------
# 엑셀/HTML 파싱  ->  (headers, rows)
# ---------------------------------------------------------------------------

def _col_to_index(ref):
    """셀 참조("B12")에서 0-기반 열 번호를 구한다."""
    letters = "".join(ch for ch in ref if ch.isalpha())
    idx = 0
    for ch in letters:
        idx = idx * 26 + (ord(ch.upper()) - 64)
    return idx - 1 if idx > 0 else 0


def _read_shared_strings(zf):
    if "xl/sharedStrings.xml" not in zf.namelist():
        return []
    xml = zf.read("xl/sharedStrings.xml").decode("utf-8", errors="ignore")
    out = []
    for si in re.finditer(r"<si>(.*?)</si>", xml, re.DOTALL):
        texts = re.findall(r"<t[^>]*>(.*?)</t>", si.group(1), re.DOTALL)
        out.append(unescape("".join(texts)))
    return out


def _first_sheet_name(zf):
    sheets = sorted(n for n in zf.namelist()
                    if n.startswith("xl/worksheets/") and n.endswith(".xml"))
    return sheets[0] if sheets else None


def read_xlsx_table(content):
    """xlsx 바이트 -> (headers:list[str], rows:list[list[str]]).  실패 시 None."""
    try:
        zf = zipfile.ZipFile(io.BytesIO(content))
    except Exception:
        return None
    with zf:
        sheet = _first_sheet_name(zf)
        if not sheet:
            return None
        shared = _read_shared_strings(zf)
        xml = zf.read(sheet).decode("utf-8", errors="ignore")

    matrix = []
    for row_m in re.finditer(r"<row\b[^>]*>(.*?)</row>", xml, re.DOTALL):
        body = row_m.group(1)
        cells = {}
        max_idx = -1
        for c in re.finditer(r"<c\b([^>]*?)(?:/>|>(.*?)</c>)", body, re.DOTALL):
            attrs, inner = c.group(1), (c.group(2) or "")
            ref_m = re.search(r'r="([A-Z]+)\d+"', attrs)
            col = _col_to_index(ref_m.group(1)) if ref_m else (max_idx + 1)
            t_m = re.search(r't="([^"]+)"', attrs)
            ctype = t_m.group(1) if t_m else ""
            val = ""
            if ctype == "s":
                v = re.search(r"<v>(.*?)</v>", inner, re.DOTALL)
                if v:
                    try:
                        val = shared[int(v.group(1))]
                    except (ValueError, IndexError):
                        val = ""
            elif ctype == "inlineStr":
                ts = re.findall(r"<t[^>]*>(.*?)</t>", inner, re.DOTALL)
                val = unescape("".join(ts))
            else:  # str(수식결과) / n(숫자) / 기본
                v = re.search(r"<v>(.*?)</v>", inner, re.DOTALL)
                if v:
                    val = unescape(v.group(1))
            cells[col] = val
            if col > max_idx:
                max_idx = col
        row = [cells.get(i, "") for i in range(max_idx + 1)]
        matrix.append(row)

    if not matrix:
        return [], []
    headers = [h.strip() for h in matrix[0]]
    return headers, matrix[1:]


def read_html_table(text):
    """HTML 표 -> (headers, rows).  표가 없으면 None."""
    tbl = re.search(r"<table\b.*?</table>", text, re.IGNORECASE | re.DOTALL)
    scope = tbl.group(0) if tbl else text
    rows = []
    for tr in re.finditer(r"<tr\b.*?</tr>", scope, re.IGNORECASE | re.DOTALL):
        cells = re.findall(r"<t[dh]\b[^>]*>(.*?)</t[dh]>", tr.group(0),
                           re.IGNORECASE | re.DOTALL)
        if not cells:
            continue
        clean = []
        for c in cells:
            c = re.sub(r"<[^>]+>", "", c)          # 내부 태그 제거
            clean.append(unescape(c).strip())
        rows.append(clean)
    if not rows:
        return None
    return [h.strip() for h in rows[0]], rows[1:]


def read_table(content):
    """바이트 내용을 형식에 맞게 파싱해 (headers, rows) 반환. 실패 시 (None, None)."""
    if not content:
        return None, None
    if content[:2] == b"PK":                       # xlsx (zip)
        res = read_xlsx_table(content)
        if res is not None:
            return res
    # HTML / 텍스트
    text = content.decode("utf-8", errors="ignore")
    if "<tr" in text.lower():
        res = read_html_table(text)
        if res is not None:
            return res
    return None, None


# ---------------------------------------------------------------------------
# 열 찾기 / 숫자 파싱
# ---------------------------------------------------------------------------

def find_col(headers, keys):
    """headers 에서 keys(후보 이름/키워드)에 맞는 열 번호를 찾는다. 없으면 -1.
    1) 완전일치(공백 무시) 우선  2) 포함(부분일치)  순으로 탐색."""
    norm = [(h or "").replace(" ", "") for h in headers]
    for k in keys:
        kk = k.replace(" ", "")
        for i, h in enumerate(norm):
            if h == kk:
                return i
    for k in keys:
        kk = k.replace(" ", "")
        for i, h in enumerate(norm):
            if kk and kk in h:
                return i
    return -1


def to_number(s):
    """'1,234,000원' 같은 문자열에서 숫자만 뽑아 float 로. 빈 값/실패는 0."""
    if s is None:
        return 0.0
    s = str(s).strip()
    if not s:
        return 0.0
    neg = s.lstrip().startswith("-") or "(" in s and ")" in s  # (1,000) = 음수 표기
    cleaned = re.sub(r"[^0-9.]", "", s)
    if cleaned in ("", "."):
        return 0.0
    try:
        val = float(cleaned)
    except ValueError:
        return 0.0
    return -val if neg else val


def is_excluded(status_value, exclude_keywords):
    """주문상태 값에 제외 키워드(취소/반품/교환)가 포함되면 True."""
    s = (status_value or "")
    return any(kw and kw in s for kw in exclude_keywords)


# ---------------------------------------------------------------------------
# 매출 분석
# ---------------------------------------------------------------------------

def analyze_sales(headers, rows,
                  status_keys=None, amount_keys=None, ship_keys=None,
                  category_keys=None, exclude_keywords=None):
    """한 순번(엑셀 1개)의 정상주문 매출을 계산한다.

    반환 dict:
        ok(bool), total_sales(float), normal_count(int), excluded_count(int),
        by_category(dict: 카테고리 -> {"sales":float,"count":int}),
        has_amount(bool), has_ship(bool), has_category(bool), note(str)
    """
    status_keys = status_keys or STATUS_KEYS
    amount_keys = amount_keys or AMOUNT_KEYS
    ship_keys = ship_keys or SHIP_KEYS
    category_keys = category_keys or CATEGORY_KEYS
    exclude_keywords = exclude_keywords or EXCLUDE_KEYWORDS

    out = {
        "ok": False, "total_sales": 0.0, "normal_count": 0, "excluded_count": 0,
        "by_category": {}, "has_amount": False, "has_ship": False,
        "has_category": False, "note": "",
    }
    if not headers:
        out["note"] = "헤더 없음"
        return out

    i_status = find_col(headers, status_keys)
    i_amount = find_col(headers, amount_keys)
    i_ship = find_col(headers, ship_keys)
    i_cat = find_col(headers, category_keys)

    out["has_amount"] = i_amount >= 0
    out["has_ship"] = i_ship >= 0
    out["has_category"] = i_cat >= 0

    if i_amount < 0:
        out["note"] = "결제금액합계 열을 찾지 못함"
        return out

    def cell(row, idx):
        return row[idx] if 0 <= idx < len(row) else ""

    for row in rows:
        # 완전히 빈 행은 건너뜀
        if not any((c or "").strip() for c in row):
            continue
        status = cell(row, i_status) if i_status >= 0 else ""
        if i_status >= 0 and is_excluded(status, exclude_keywords):
            out["excluded_count"] += 1
            continue
        amount = to_number(cell(row, i_amount))
        if i_ship >= 0:
            amount += to_number(cell(row, i_ship))
        out["total_sales"] += amount
        out["normal_count"] += 1
        cat = (cell(row, i_cat).strip() if i_cat >= 0 else "") or "(미분류)"
        slot = out["by_category"].setdefault(cat, {"sales": 0.0, "count": 0})
        slot["sales"] += amount
        slot["count"] += 1

    out["ok"] = True
    if i_status < 0:
        out["note"] = "주문상태 열을 찾지 못해 전 주문을 정상으로 집계함"
    return out


def rank_by_sales(seq_results):
    """[{number, host, url, sales, normal_count, ...}] 을 매출 내림차순 정렬."""
    return sorted(seq_results, key=lambda r: r.get("sales", 0.0), reverse=True)


def won(n):
    """숫자를 '1,234,000원' 형태 문자열로."""
    try:
        return "{:,.0f}원".format(float(n))
    except (ValueError, TypeError):
        return str(n)
