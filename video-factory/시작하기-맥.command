#!/bin/bash
# 맥에서 더블클릭으로 실행. (최초 1회: 우클릭 → 열기)
cd "$(dirname "$0")"

echo ""
echo "  🎬 영상 제작 자동화 프로그램을 시작합니다..."
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "  [!] Node.js 가 설치되어 있지 않습니다."
  echo "      https://nodejs.org 에서 LTS 버전을 설치한 뒤 다시 실행하세요."
  echo ""
  read -p "엔터를 누르면 닫힙니다..."
  exit 1
fi

echo "  잠시 후 브라우저가 자동으로 열립니다. (안 열리면 http://localhost:4399 접속)"
echo "  이 터미널 창은 프로그램이 켜져 있는 동안 그대로 두세요. (닫으면 종료됨)"
echo ""
node src/server.js
