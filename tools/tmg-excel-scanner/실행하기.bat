@echo off
chcp 65001 >nul
REM ============================================================
REM  TMG 매출 엑셀 스캐너 - Windows 실행 파일
REM  파이썬이 설치되어 있으면 더블클릭만으로 프로그램이 열립니다.
REM ============================================================
cd /d "%~dp0"

where py >nul 2>nul
if %errorlevel%==0 (
    py tmg_excel_scanner.py
    goto :eof
)

where python >nul 2>nul
if %errorlevel%==0 (
    python tmg_excel_scanner.py
    goto :eof
)

echo.
echo [안내] 파이썬이 설치되어 있지 않습니다.
echo   https://www.python.org/downloads/ 에서 파이썬을 설치한 뒤
echo   설치 시 "Add Python to PATH" 를 체크해 주세요.
echo   설치 후 이 파일(실행하기.bat)을 다시 더블클릭하면 됩니다.
echo.
pause
