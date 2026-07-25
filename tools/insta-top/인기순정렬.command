#!/bin/bash
# Mac용 실행 파일 — 더블클릭하면 프로그램이 브라우저에서 열립니다.
cd "$(dirname "$0")"

echo "================================================"
echo "   📸 인스타그램 인기 콘텐츠 정렬기"
echo "   (조회수 · 좋아요 순으로 내림차순 정렬)"
echo "================================================"
echo

# 1) Node.js 확인
if ! command -v node >/dev/null 2>&1; then
  echo "[알림] 이 프로그램을 실행하려면 Node.js 가 필요합니다."
  echo "       곧 열리는 사이트에서 LTS 버전을 설치한 뒤 다시 실행하세요."
  open "https://nodejs.org/ko" 2>/dev/null
  read -n1 -p "엔터를 누르면 종료합니다..."
  exit 1
fi

# 2) 최초 1회: 구성요소 자동 설치
if [ ! -d node_modules/playwright ]; then
  echo "[준비] 처음 실행이라 필요한 구성요소를 설치합니다. 잠시 기다려 주세요..."
  echo
  npm install playwright || { echo "[오류] 설치 실패. 인터넷 연결을 확인하세요."; read -n1; exit 1; }
  echo
  echo "[준비] 브라우저(Chromium)를 내려받는 중..."
  npx playwright install chromium || { echo "[오류] 브라우저 설치 실패."; read -n1; exit 1; }
  echo
  echo "[준비] 설치 완료!"
  echo
fi

# 3) 서버 실행 + 브라우저 자동 열기
PORT="${PORT:-8787}"
echo "[실행] 프로그램을 시작합니다. 잠시 후 브라우저가 자동으로 열립니다."
echo "       ▶ 사용을 마치면 이 창을 닫으면 종료됩니다."
echo
( sleep 3; open "http://127.0.0.1:${PORT}/" >/dev/null 2>&1 ) &
PORT="$PORT" node server.js

echo
read -n1 -p "종료되었습니다. 엔터를 누르면 창을 닫습니다..."
