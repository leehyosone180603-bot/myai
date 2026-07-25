@echo off
chcp 65001 >nul
title 인스타그램 인기 콘텐츠 정렬기
cd /d "%~dp0"

echo ================================================
echo    📸 인스타그램 인기 콘텐츠 정렬기
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
set PORT=8787
echo [실행] 프로그램을 시작합니다. 잠시 후 브라우저가 자동으로 열립니다.
echo        * 사용을 마치면 이 창을 닫으면 종료됩니다.
echo.
REM 3초 뒤 기본 브라우저로 화면 열기 (서버는 아래에서 이 창에 계속 실행)
start "" /min cmd /c "ping -n 4 127.0.0.1 >nul & explorer http://127.0.0.1:8787/"
node server.js
echo.
echo [종료] 프로그램이 종료되었습니다.
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
