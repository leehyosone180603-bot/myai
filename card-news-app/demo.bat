@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [!] Node.js가 설치되어 있지 않습니다.
  echo     https://nodejs.org 에서 LTS 버전을 설치한 뒤 다시 실행하세요.
  echo.
  pause
  exit /b 1
)
echo [데모 모드] API 키 없이 예시(잔 칼망) 번역 결과로 화면을 확인합니다.
set CARDNEWS_MOCK=1
node server.js
pause
