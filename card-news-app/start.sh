#!/bin/sh
# Linux: ./start.sh 또는 파일 관리자에서 실행
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js가 필요합니다: https://nodejs.org 에서 설치 후 다시 실행하세요."
  exit 1
fi
echo "카드뉴스 현지화 도구를 시작합니다... (브라우저가 자동으로 열립니다)"
node server.js
