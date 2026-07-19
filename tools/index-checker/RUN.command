#!/bin/bash
# Mac용 실행 파일 — 더블클릭하면 실행됩니다.
cd "$(dirname "$0")"

echo "============================================"
echo "   색인(검색 노출) 확인 프로그램"
echo "   구글 / 네이버 / 다음  ·  대상: calcbox.kr"
echo "============================================"
echo

if ! command -v node >/dev/null 2>&1; then
  echo "[알림] 이 프로그램을 실행하려면 Node.js 가 필요합니다."
  echo "       곧 열리는 사이트에서 LTS 버전을 설치한 뒤 다시 실행하세요."
  open "https://nodejs.org/ko" 2>/dev/null
  read -n1 -p "엔터를 누르면 종료합니다..."
  exit 1
fi

if [ ! -d node_modules/playwright ]; then
  echo "[준비] 처음 실행이라 필요한 구성요소를 설치합니다. 잠시 기다려 주세요..."
  echo
  npm install || { echo "[오류] 설치 실패. 인터넷 연결을 확인하세요."; read -n1; exit 1; }
  echo
  echo "[준비] 검색용 브라우저(Chromium)를 내려받는 중..."
  npx playwright install chromium || { echo "[오류] 브라우저 설치 실패."; read -n1; exit 1; }
  echo
  echo "[준비] 설치 완료!"
  echo
fi

echo "[실행] 사이트맵의 모든 페이지를 확인합니다. 페이지가 많으면 몇 분 걸립니다..."
echo
node index-check.js || { echo "[오류] 실행 중 문제가 발생했습니다."; read -n1; exit 1; }

echo
[ -f report.html ] && { echo "[완료] 결과 리포트(report.html)를 엽니다."; open report.html; }
read -n1 -p "완료되었습니다. 엔터를 누르면 종료합니다..."
