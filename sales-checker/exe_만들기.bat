@echo off
chcp 65001 >nul
title 매출확인 EXE 만들기
cd /d "%~dp0"

echo ============================================
echo   매출확인.exe 실행파일을 생성합니다.
echo   (파이썬이 설치된 PC에서 최초 1회만 실행)
echo ============================================
echo.

python --version >nul 2>&1
if errorlevel 1 (
    echo [오류] 파이썬이 필요합니다. https://www.python.org/downloads/
    pause
    exit /b 1
)

echo 빌드 도구 및 구성요소를 설치하는 중...
python -m pip install --quiet --disable-pip-version-check openpyxl xlrd pyinstaller

echo.
echo 실행파일 생성 중... (수 분 소요)
python -m PyInstaller --onefile --console --name "매출확인" ^
    --hidden-import openpyxl --hidden-import xlrd ^
    "sales_checker.py"

echo.
if exist "dist\매출확인.exe" (
    echo ============================================
    echo   완료!  dist\매출확인.exe  가 생성되었습니다.
    echo   이 파일을 더블클릭하면 매출 확인 페이지가 열립니다.
    echo ============================================
) else (
    echo [실패] 실행파일 생성에 실패했습니다. 위 메시지를 확인해 주세요.
)
echo.
pause
