#!/bin/sh
# macOS 데모: API 키 없이 예시 번역 결과로 화면 확인 (우클릭 → 열기)
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js가 필요합니다: https://nodejs.org 에서 설치 후 다시 실행하세요."
  read -r _
  exit 1
fi
echo "[데모 모드] API 키 없이 예시(잔 칼망) 번역 결과로 화면을 확인합니다."
CARDNEWS_MOCK=1 node server.js
