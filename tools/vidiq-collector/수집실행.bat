@echo off
chcp 65001 >nul
title vidIQ 고득점 영상 수집기
cd /d "%~dp0"

echo ==================================================
echo    vidIQ 고득점 영상 수집기
echo    주제로 유튜브 검색 - 아웃라이어 배수 높은 영상 정리
echo ==================================================
echo.

where node >nul 2>nul
if errorlevel 1 goto NONODE

findstr /C:"여기에_YouTube" config.json >nul 2>nul
if not errorlevel 1 goto NOKEY

echo 검색할 주제를 입력하고 엔터를 누르세요.
echo (그냥 엔터를 누르면 config.json 의 주제를 사용합니다.)
set "TOPIC="
set /p "TOPIC=주제 > "
echo.

if "%TOPIC%"=="" (
  node collect.js
) else (
  node collect.js "%TOPIC%"
)
if errorlevel 1 goto FAILRUN

echo.
if exist "report.html" start "" "report.html"
echo [완료] 결과 리포트 report.html 를 열었습니다.
echo.
echo 이 창은 아무 키나 누르면 닫힙니다.
pause >nul
exit /b 0

:NONODE
echo [알림] 이 프로그램을 실행하려면 Node.js 가 필요합니다.
echo    1. 곧 열리는 사이트에서 LTS 버전을 내려받아 설치하세요.
echo    2. 설치가 끝나면 이 파일을 다시 더블클릭하세요.
echo.
start https://nodejs.org/ko
pause
exit /b 1

:NOKEY
echo [알림] API 키가 아직 설정되지 않았습니다.
echo    config.json 을 열어 "apiKey" 값을 본인 키로 바꿔 주세요.
echo    발급 방법은 README.md 의 'YouTube Data API 키 발급' 참고.
echo.
pause
exit /b 1

:FAILRUN
echo.
echo [오류] 실행 중 문제가 발생했습니다. 위 메시지를 확인해 주세요.
pause
exit /b 1
