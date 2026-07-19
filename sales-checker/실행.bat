@echo off
chcp 65001 >nul
title 매출 확인 프로그램
cd /d "%~dp0"

echo ============================================
echo   매출 확인 프로그램을 시작합니다.
echo ============================================
echo.

REM 파이썬 확인
python --version >nul 2>&1
if errorlevel 1 (
    echo [오류] 파이썬(Python)이 설치되어 있지 않습니다.
    echo   https://www.python.org/downloads/ 에서 설치 후 다시 실행해 주세요.
    echo   (설치 시 "Add Python to PATH" 체크)
    echo.
    pause
    exit /b 1
)

REM 필요한 라이브러리 설치 (최초 1회만 시간이 걸립니다. 실패해도 계속 진행)
python -c "import openpyxl, xlrd" >nul 2>&1
if errorlevel 1 (
    echo 필요한 구성요소를 설치하는 중입니다... 잠시만 기다려 주세요.
    python -m pip install --quiet --disable-pip-version-check openpyxl xlrd
    if errorlevel 1 (
        echo [안내] 구성요소 설치에 실패했지만 그대로 진행합니다.
        echo   ^(엑셀이 HTML 표 형식이면 설치 없이도 정상 동작합니다.^)
    )
)

echo 브라우저가 자동으로 열립니다. 이 창은 닫지 마세요.
echo (프로그램을 끄려면 이 창을 닫으면 됩니다.)
echo.
python "%~dp0sales_checker.py"
pause
