@echo off
chcp 65001 >nul
title 제품 사진 배경 변환기
cd /d "%~dp0"

echo ============================================
echo    제품 사진 배경 변환기
echo    배경 지우기 / 흰색 / 회색 / 베이지 변환
echo ============================================
echo.

if not exist "배경변환기.html" goto NOFILE

echo [실행] 기본 브라우저에서 프로그램을 엽니다.
echo        (설치나 인터넷 연결은 필요하지 않습니다)
echo.
start "" "배경변환기.html"

echo 브라우저 창에서 사용하세요. 이 창은 닫아도 됩니다.
echo.
timeout /t 5 >nul
exit /b 0

:NOFILE
echo [오류] 같은 폴더에 "배경변환기.html" 파일이 없습니다.
echo        파일을 옮길 때는 이 실행 파일과 함께 옮겨 주세요.
echo.
pause
exit /b 1
