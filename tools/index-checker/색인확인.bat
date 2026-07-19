@echo off
chcp 65001 >nul
title 색인 확인 - calcbox.kr
cd /d "%~dp0"

echo ============================================
echo    색인(검색 노출) 확인 프로그램
echo    구글 / 네이버 / 다음  ·  대상: calcbox.kr
echo ============================================
echo.

REM === 1) Node.js 설치 확인 ===
where node >nul 2>nul
if errorlevel 1 (
  echo [알림] 이 프로그램을 실행하려면 Node.js 가 필요합니다.
  echo    1) 곧 열리는 사이트에서 "LTS" 버전을 내려받아 설치하세요.
  echo    2) 설치가 끝나면 이 파일을 다시 더블클릭하세요.
  echo.
  start https://nodejs.org/ko
  echo.
  pause
  exit /b 1
)

REM === 2) 최초 1회: 필요한 구성요소 자동 설치 ===
if not exist "node_modules\playwright" (
  echo [준비] 처음 실행이라 필요한 구성요소를 설치합니다.
  echo        수 분 걸릴 수 있으니 창을 닫지 말고 기다려 주세요...
  echo.
  call npm install
  if errorlevel 1 ( echo. & echo [오류] 구성요소 설치 실패. 인터넷 연결을 확인하세요. & pause & exit /b 1 )
  echo.
  echo [준비] 검색용 브라우저(Chromium)를 내려받는 중...
  call npx playwright install chromium
  if errorlevel 1 ( echo. & echo [오류] 브라우저 설치 실패. & pause & exit /b 1 )
  echo.
  echo [준비] 설치 완료!
  echo.
)

REM === 3) 색인 확인 실행 ===
echo [실행] 사이트맵의 모든 페이지를 확인합니다. 페이지가 많으면 몇 분 걸립니다...
echo.
node index-check.js
if errorlevel 1 ( echo. & echo [오류] 실행 중 문제가 발생했습니다. & pause & exit /b 1 )

REM === 4) 결과 리포트 열기 ===
echo.
if exist "report.html" ( echo [완료] 결과 리포트(report.html)를 엽니다. & start "" "report.html" ) else ( echo [완료] report.html 을 찾지 못했습니다. )
echo.
echo 이 창은 아무 키나 누르면 닫힙니다.
pause >nul
