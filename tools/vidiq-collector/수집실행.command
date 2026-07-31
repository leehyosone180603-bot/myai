#!/bin/bash
# Mac용 실행 파일 — 더블클릭하면 실행됩니다.
cd "$(dirname "$0")"

echo "=================================================="
echo "   vidIQ 고득점 영상 수집기"
echo "   주제로 유튜브 검색 → 아웃라이어 배수 높은 영상 정리"
echo "=================================================="
echo

if ! command -v node >/dev/null 2>&1; then
  echo "[알림] 이 프로그램을 실행하려면 Node.js 가 필요합니다."
  echo "       곧 열리는 사이트에서 LTS 버전을 설치한 뒤 다시 실행하세요."
  open "https://nodejs.org/ko" 2>/dev/null
  read -n1 -p "엔터를 누르면 종료합니다..."
  exit 1
fi

if grep -q "여기에_YouTube" config.json 2>/dev/null; then
  echo "[알림] API 키가 아직 설정되지 않았습니다."
  echo "       config.json 을 열어 \"apiKey\" 값을 본인 키로 바꿔 주세요."
  echo "       발급 방법은 README.md 의 'YouTube Data API 키 발급' 참고."
  read -n1 -p "엔터를 누르면 종료합니다..."
  exit 1
fi

echo "검색할 주제를 입력하고 엔터를 누르세요."
echo "(그냥 엔터를 누르면 config.json 의 주제를 사용합니다.)"
read -p "주제 > " TOPIC
echo

if [ -z "$TOPIC" ]; then
  node collect.js || { echo "[오류] 실행 중 문제가 발생했습니다."; read -n1; exit 1; }
else
  node collect.js "$TOPIC" || { echo "[오류] 실행 중 문제가 발생했습니다."; read -n1; exit 1; }
fi

echo
[ -f report.html ] && { echo "[완료] 결과 리포트(report.html)를 엽니다."; open report.html; }
read -n1 -p "완료되었습니다. 엔터를 누르면 종료합니다..."
