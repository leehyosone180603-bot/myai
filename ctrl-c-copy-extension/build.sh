#!/usr/bin/env bash
# 배포용 zip 파일을 만드는 스크립트입니다.
# 사용법: ./build.sh   →   ctrl-c-copy-extension.zip 생성
set -euo pipefail

cd "$(dirname "$0")"

OUT="ctrl-c-copy-extension.zip"
rm -f "$OUT"

# 확장 프로그램 실행에 필요한 파일만 담습니다. (README, build.sh, zip 자기 자신은 제외)
zip -r "$OUT" \
  manifest.json \
  content.js \
  popup.html \
  popup.js \
  icons \
  -x "*.DS_Store"

echo "생성 완료: $OUT"
