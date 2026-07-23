@echo off
REM ===================================================================
REM  뉴스룸 관리 패널(GUI) 실행. 이 파일을 더블클릭하세요.
REM  클릭만으로 검토 후보 보내기 / 대기열 발행 / 승인 봇을 다룰 수 있습니다.
REM ===================================================================
cd /D "%~dp0"
if not exist ".venv\Scripts\python.exe" goto noenv
call ".venv\Scripts\activate.bat"
python control_panel.py
goto end

:noenv
echo [ERROR] .venv not found. Create venv in the newsroom folder first:
echo         python -m venv .venv
pause

:end
