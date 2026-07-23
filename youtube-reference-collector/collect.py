#!/usr/bin/env python3
"""유튜브 레퍼런스 수집기 (CLI)

주제어를 입력하면 관련 유튜브 영상을 모아, 각 영상이 속한 채널의 평균 조회수 대비
몇 배나 터졌는지(아웃라이어 배수)를 계산해 "베껴올 가치가 있는 레퍼런스"만 골라낸다.

운영 원칙(README 참고):
- 절대 조회수가 아니라 채널 평소 대비 얼마나 더 터졌나가 아이디어의 힘을 보여준다.
- 작은 채널의 아웃라이어일수록 구독자 후광 없이 순수하게 이긴 케이스 → 가치가 크다.
- 최근성/velocity/참여율/제목 패턴을 함께 봐 "지금 통하는 앵글"을 찾는다.

사용 예:
    python collect.py "퇴사"
    python collect.py "재테크 초보" --multiplier 5 --since 6m --sort velocity
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime, timedelta, timezone

import analyzer
import output
from youtube_client import QuotaExceeded, YouTubeClient


def log(msg: str) -> None:
    print(msg, flush=True)


def load_api_key() -> str:
    key = os.environ.get("YOUTUBE_API_KEY")
    if not key:
        # .env 파일이 있으면 로드 시도 (python-dotenv 선택적 의존성)
        try:
            from dotenv import load_dotenv

            load_dotenv()
            key = os.environ.get("YOUTUBE_API_KEY")
        except ImportError:
            pass
    if not key:
        sys.exit(
            "오류: 환경변수 YOUTUBE_API_KEY 가 없습니다.\n"
            "  - export YOUTUBE_API_KEY='발급받은_키'  또는\n"
            "  - .env 파일에 YOUTUBE_API_KEY=... 를 넣어주세요.\n"
            "  키 발급 방법은 README.md 를 참고하세요."
        )
    return key


def parse_since(value: str | None) -> str | None:
    """'6m' / '1y' / '90d' 형태를 RFC3339 publishedAfter 문자열로 변환한다."""
    if not value:
        return None
    value = value.strip().lower()
    unit = value[-1]
    try:
        amount = int(value[:-1])
    except ValueError:
        sys.exit(f"오류: --since 형식이 잘못되었습니다: {value} (예: 6m, 1y, 90d)")
    days = {"d": 1, "w": 7, "m": 30, "y": 365}.get(unit)
    if not days:
        sys.exit(f"오류: --since 단위는 d/w/m/y 중 하나여야 합니다: {value}")
    cutoff = datetime.now(timezone.utc) - timedelta(days=amount * days)
    return cutoff.replace(microsecond=0).isoformat().replace("+00:00", "Z")


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="유튜브 채널 평균 대비 아웃라이어 영상(레퍼런스)을 수집한다.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("keyword", help="검색할 주제어 (예: 퇴사, 재테크 초보)")
    p.add_argument("--multiplier", type=float, default=4.0,
                   help="아웃라이어 배수 임계값 (영상 조회수 >= 채널 평균 x 이 값)")
    p.add_argument("--max-results", type=int, default=150,
                   help="검색으로 모을 후보 영상 수 (search.list 는 100유닛/호출)")
    p.add_argument("--sample", type=int, default=30,
                   help="채널 평균 계산에 쓸 최근 영상 표본 수")
    p.add_argument("--since", default=None,
                   help="업로드 기간 필터 (예: 6m, 1y, 90d). 미지정 시 제한 없음")
    p.add_argument("--sort", choices=["views", "velocity", "multiplier"],
                   default="views", help="결과 정렬 기준")
    p.add_argument("--order", choices=["relevance", "viewCount", "date"],
                   default="relevance", help="검색(search.list) 정렬 순서")
    p.add_argument("--out-dir", default=".", help="결과 파일 저장 폴더")
    return p


def main() -> None:
    args = build_parser().parse_args()
    api_key = load_api_key()
    published_after = parse_since(args.since)

    client = YouTubeClient(api_key, on_progress=log)
    now = datetime.now(timezone.utc)

    collected: list[analyzer.VideoStat] = []
    partial = False

    try:
        # 1) 검색으로 후보 영상 id 수집
        log(f"[1/4] '{args.keyword}' 검색 중... (최대 {args.max_results}개)")
        video_ids = client.search_video_ids(
            args.keyword,
            max_results=args.max_results,
            order=args.order,
            published_after=published_after,
        )
        if not video_ids:
            log("검색 결과가 없습니다.")
            return
        log(f"      후보 {len(video_ids)}개 확보.")

        # 2) 영상 상세 통계 배치 수집
        log(f"[2/4] 영상 통계 수집 중... (50개씩 배치)")
        raw_videos = client.fetch_videos(video_ids)
        videos = [vs for vs in map(analyzer.build_video_stat, raw_videos) if vs]
        log(f"      {len(videos)}개 영상 통계 확보.")

        # 3) 채널 정보(구독자, 업로드 재생목록) 수집
        channel_ids = [v.channel_id for v in videos if v.channel_id]
        log(f"[3/4] 채널 {len(set(channel_ids))}개 정보 수집 중...")
        channels = client.fetch_channels(channel_ids)

        # 4) 채널별 최근 영상으로 평균/중앙값 계산
        log(f"[4/4] 채널 평균 조회수 계산 중... (채널당 최근 {args.sample}개)")
        channel_form_avgs: dict[str, dict] = {}
        channel_subs: dict[str, int | None] = {}
        for idx, (cid, ch) in enumerate(channels.items(), 1):
            stats = ch.get("statistics", {})
            hidden = stats.get("hiddenSubscriberCount")
            subs = None if hidden else _safe_int(stats.get("subscriberCount"))
            channel_subs[cid] = subs

            uploads = (
                ch.get("contentDetails", {})
                .get("relatedPlaylists", {})
                .get("uploads")
            )
            if not uploads:
                channel_form_avgs[cid] = {}
                continue
            recent_ids = client.fetch_recent_upload_ids(uploads, args.sample)
            recent_raw = client.fetch_videos(recent_ids)
            recent = [vs for vs in map(analyzer.build_video_stat, recent_raw) if vs]
            channel_form_avgs[cid] = analyzer.channel_form_averages(recent)
            if idx % 10 == 0:
                log(f"      {idx}/{len(channels)} 채널 처리 (쿼터 {client.quota_used}유닛)")

        # 지표 계산
        for v in videos:
            enrich_avgs = channel_form_avgs.get(v.channel_id, {})
            analyzer.enrich(v, enrich_avgs, channel_subs.get(v.channel_id), now=now)
        collected = videos

    except QuotaExceeded as e:
        partial = True
        log(f"\n⚠ {e}")
        log("  지금까지 수집된 부분 결과라도 저장합니다.")
        # 이미 enrich 되지 않은 영상은 제외될 수 있음 → collected 사용
    except KeyboardInterrupt:
        partial = True
        log("\n중단됨. 부분 결과를 저장합니다.")

    # 필터 + 정렬
    results = analyzer.filter_and_sort(collected, args.multiplier, sort_key=args.sort)

    # 출력
    output.print_console(results, args.keyword, args.multiplier)
    if results:
        csv_path, json_path = output.save_files(results, args.keyword, args.out_dir)
        log(f"💾 저장 완료:\n   - {csv_path}\n   - {json_path}")
    log(f"\n총 소비 쿼터: {client.quota_used}유닛 (일일 기본 한도 10,000)")
    if partial:
        log("※ 부분 수집 결과입니다.")


def _safe_int(value) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


if __name__ == "__main__":
    main()
