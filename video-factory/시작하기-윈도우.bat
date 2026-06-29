@echo off
chcp 65001 >nul
title 영상 제작 자동화 (video-factory)
cd /d "%~dp0"

echo.
echo   🎬 영상 제작 자동화 프로그램을 시작합니다...
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo   [!] Node.js 가 설치되어 있지 않습니다.
  echo       https://nodejs.org 에서 LTS 버전을 설치한 뒤 다시 실행하세요.
  echo.
  pause
  exit /b
)

echo   잠시 후 브라우저가 자동으로 열립니다. (안 열리면 http://localhost:4399 접속)
echo   이 검은 창은 프로그램이 켜져 있는 동안 그대로 두세요. (끄면 종료됨)
echo.
node src\server.js
pause
