@echo off
REM ═══════════════════════════════════════════════════════════════════
REM  승인 데몬(run_ai_bot.py) 실행 — 승인→대기열 적재 처리를 담당.
REM  항상 켜져 있어야 텔레그램 '발행' 버튼이 동작합니다.
REM  봇이 어떤 이유로 종료되면 5초 후 자동 재시작합니다.
REM  (완전히 끄려면 이 창에서 Ctrl+C 두 번)
REM ═══════════════════════════════════════════════════════════════════
cd /D "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo [오류] 가상환경(.venv)이 없습니다. newsroom 폴더에서 만들어 주세요.
  pause & exit /b 1
)
call .venv\Scripts\activate.bat

:loop
echo [%date% %time%] 승인 데몬 시작…
python run_ai_bot.py
echo [%date% %time%] 봇이 종료됨 — 5초 후 재시작 (완전 종료는 Ctrl+C)
timeout /t 5 /nobreak >nul
goto loop
