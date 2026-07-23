@echo off
REM ===================================================================
REM  승인 데몬 실행 - 승인에서 대기열 적재까지 처리.
REM  항상 켜져 있어야 텔레그램 '발행' 버튼이 동작합니다.
REM  봇이 종료되면 5초 후 자동 재시작. 완전 종료는 이 창에서 Ctrl+C.
REM ===================================================================
cd /D "%~dp0"
if not exist ".venv\Scripts\python.exe" goto noenv
call ".venv\Scripts\activate.bat"

:loop
echo [%date% %time%] approval daemon starting...
python run_ai_bot.py
echo bot exited - restarting in 5s.  [stop: Ctrl+C]
timeout /t 5 /nobreak >nul
goto loop

:noenv
echo [ERROR] .venv not found. Create venv in the newsroom folder first:
echo         python -m venv .venv
pause
