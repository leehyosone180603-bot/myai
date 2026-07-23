"""결과를 콘솔 표로 출력하고 CSV/JSON 파일로 저장한다."""

from __future__ import annotations

import csv
import json
import re
from datetime import date

from analyzer import VideoStat, pattern_summary


def _fmt_int(n: int | None) -> str:
    if n is None:
        return "비공개"
    return f"{n:,}"


def _fmt_float(n: float | None, suffix: str = "") -> str:
    if n is None:
        return "-"
    return f"{n:,.1f}{suffix}"


def _fmt_pct(n: float | None) -> str:
    if n is None:
        return "비공개"
    return f"{n * 100:.1f}%"


def _truncate(text: str, width: int) -> str:
    """한글 폭을 고려해 대략적으로 자른다(한글=2칸)."""
    out = []
    used = 0
    for ch in text:
        w = 2 if ord(ch) > 0x1100 else 1
        if used + w > width:
            out.append("…")
            break
        out.append(ch)
        used += w
    return "".join(out)


def print_console(videos: list[VideoStat], keyword: str, multiplier: float) -> None:
    if not videos:
        print("\n조건(아웃라이어 배수 >= "
              f"{multiplier})을 만족하는 영상이 없습니다.\n")
        return

    print(f"\n{'=' * 100}")
    print(f"  '{keyword}' 레퍼런스 — 채널 평균 대비 {multiplier}배 이상 터진 영상 "
          f"{len(videos)}개")
    print(f"{'=' * 100}\n")

    header = (
        f"{'#':>2}  {'제목':<40}  {'조회수':>10}  {'좋아요':>8}  {'댓글':>7}  "
        f"{'배수':>6}  {'일일뷰':>9}  {'참여율':>6}  {'형식':<4}  {'채널':<16}  {'업로드':<10}"
    )
    print(header)
    print("-" * len(header))

    for i, v in enumerate(videos, 1):
        flag = "⚠" if v.low_confidence else " "
        mult = f"{v.outlier_mean:.1f}x" if v.outlier_mean else "-"
        row = (
            f"{i:>2}{flag} {_truncate(v.title, 40):<40}  "
            f"{_fmt_int(v.views):>10}  {_fmt_int(v.likes):>8}  {_fmt_int(v.comments):>7}  "
            f"{mult:>6}  {_fmt_float(v.velocity):>9}  {_fmt_pct(v.engagement):>6}  "
            f"{v.form:<4}  {_truncate(v.channel_title, 16):<16}  "
            f"{v.published_at.date().isoformat():<10}"
        )
        print(row)

    print("\n⚠ = 채널 표본이 적어 신뢰도 낮음\n")

    # 패턴 요약 — 레퍼런스는 모으는 게 아니라 반복되는 앵글을 찾는 것
    print(f"{'─' * 60}")
    print("  📊 제목 패턴별 분포 (어떤 앵글이 반복적으로 터지나)")
    print(f"{'─' * 60}")
    for pat, count, avg_mult in pattern_summary(videos):
        bar = "█" * count
        print(f"  {pat:<12} {count:>3}개  평균배수 {avg_mult:>5.1f}x  {bar}")
    print()


# -- 파일 저장 ---------------------------------------------------------------

CSV_FIELDS = [
    "rank", "title", "url", "thumbnail", "views", "likes", "comments",
    "outlier_mean", "outlier_median", "channel_avg", "channel_median",
    "sample_size", "low_confidence", "velocity", "engagement", "views_per_sub",
    "form", "duration_seconds", "channel_title", "subscribers",
    "published_at", "title_pattern",
]


def _to_row(rank: int, v: VideoStat) -> dict:
    return {
        "rank": rank,
        "title": v.title,
        "url": v.url,
        "thumbnail": v.thumbnail,
        "views": v.views,
        "likes": "" if v.likes is None else v.likes,
        "comments": "" if v.comments is None else v.comments,
        "outlier_mean": round(v.outlier_mean, 2) if v.outlier_mean else "",
        "outlier_median": round(v.outlier_median, 2) if v.outlier_median else "",
        "channel_avg": round(v.channel_avg, 1) if v.channel_avg else "",
        "channel_median": round(v.channel_median, 1) if v.channel_median else "",
        "sample_size": v.sample_size,
        "low_confidence": v.low_confidence,
        "velocity": round(v.velocity, 1) if v.velocity else "",
        "engagement": round(v.engagement, 4) if v.engagement is not None else "",
        "views_per_sub": round(v.views_per_sub, 3) if v.views_per_sub else "",
        "form": v.form,
        "duration_seconds": v.duration_seconds,
        "channel_title": v.channel_title,
        "subscribers": "" if v.subscribers is None else v.subscribers,
        "published_at": v.published_at.isoformat(),
        "title_pattern": v.title_pattern,
    }


def _safe_name(keyword: str) -> str:
    return re.sub(r"[^\w가-힣]+", "_", keyword).strip("_") or "keyword"


def save_files(videos: list[VideoStat], keyword: str, out_dir: str = ".") -> tuple[str, str]:
    """CSV + JSON 파일을 저장하고 (csv경로, json경로)를 반환한다."""
    import os

    os.makedirs(out_dir, exist_ok=True)
    stamp = date.today().isoformat()
    base = f"references_{_safe_name(keyword)}_{stamp}"
    csv_path = os.path.join(out_dir, base + ".csv")
    json_path = os.path.join(out_dir, base + ".json")

    rows = [_to_row(i, v) for i, v in enumerate(videos, 1)]

    with open(csv_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        writer.writeheader()
        writer.writerows(rows)

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(
            {"keyword": keyword, "generated": stamp, "count": len(rows), "results": rows},
            f,
            ensure_ascii=False,
            indent=2,
        )

    return csv_path, json_path
