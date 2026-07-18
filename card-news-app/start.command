#!/bin/sh
# macOS: 더블클릭으로 실행. (최초 1회: 우클릭 → 열기 로 Gatekeeper 허용)
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js가 필요합니다: https://nodejs.org 에서 설치 후 다시 실행하세요."
  read -r _
  exit 1
fi
echo "카드뉴스 현지화 도구를 시작합니다... (브라우저가 자동으로 열립니다)"
node server.js
