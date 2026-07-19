@echo off
chcp 65001 >nul
REM ============================================================
REM  단독 실행파일(.exe) 만들기
REM  이 배치파일을 실행하면 dist\TMG매출엑셀스캐너.exe 가 생성됩니다.
REM  만들어진 exe 는 파이썬이 없는 PC 에서도 더블클릭으로 실행됩니다.
REM ============================================================
cd /d "%~dp0"

echo [1/2] PyInstaller 설치(또는 확인)...
py -m pip install --upgrade pyinstaller || python -m pip install --upgrade pyinstaller

echo [2/2] exe 빌드...
py -m PyInstaller --noconfirm --onefile --windowed --name "TMG매출엑셀스캐너" tmg_excel_scanner.py || ^
python -m PyInstaller --noconfirm --onefile --windowed --name "TMG매출엑셀스캐너" tmg_excel_scanner.py

echo.
echo 완료! dist 폴더 안의 TMG매출엑셀스캐너.exe 를 사용하세요.
pause
