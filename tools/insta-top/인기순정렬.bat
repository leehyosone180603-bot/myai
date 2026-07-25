@echo off
chcp 65001 >nul
title 인스타그램 인기 콘텐츠 정렬기
cd /d "%~dp0"

echo ================================================
echo    인스타그램 인기 콘텐츠 정렬기
echo    (조회수 / 좋아요 순으로 내림차순 정렬)
echo ================================================
echo.

where node >nul 2>nul
if errorlevel 1 goto NONODE

if not exist "node_modules\playwright" goto INSTALL
goto RUNAPP

:INSTALL
echo [준비] 처음 실행이라 필요한 구성요소를 설치합니다.
echo        수 분 걸릴 수 있으니 창을 닫지 말고 기다려 주세요...
echo.
call npm install playwright
if errorlevel 1 goto FAILNPM
echo.
echo [준비] 브라우저 Chromium 를 내려받는 중...
call npx playwright install chromium
if errorlevel 1 goto FAILPW
echo.
echo [준비] 설치 완료!
echo.

:RUNAPP
echo [실행] config.json 의 계정을 분석합니다.
echo        처음이라면 열리는 창에서 인스타그램에 로그인해 주세요.
echo.
node insta-top.js
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
echo.
pause
exit /b 1

:FAILNPM
echo.
echo [오류] 구성요소 설치에 실패했습니다. 인터넷 연결을 확인한 뒤 다시 실행하세요.
pause
exit /b 1

:FAILPW
echo.
echo [오류] 브라우저 설치에 실패했습니다. 다시 실행해 주세요.
pause
exit /b 1

:FAILRUN
echo.
echo [오류] 실행 중 문제가 발생했습니다. 위 메시지를 확인해 주세요.
pause
exit /b 1
