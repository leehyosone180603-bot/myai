@echo off
REM ── 매일 08:00 / 12:00 / 19:00 에 수집→선별→텔레그램 검토요청 자동 실행 ──
REM 이 파일을 더블클릭하거나 cmd 에서 실행하면 Windows 작업 스케줄러에 등록됩니다.
REM (그 시각에 PC 가 켜져 있어야 실행됩니다)
setlocal
set DIR=%~dp0
set PY=%DIR%.venv\Scripts\python.exe

if not exist "%PY%" (
  echo [오류] 가상환경을 찾을 수 없습니다: %PY%
  echo   newsroom 폴더에서 python -m venv .venv 를 먼저 실행하세요.
  pause & exit /b 1
)

schtasks /create /tn "newsroom-08" /tr "\"%PY%\" \"%DIR%run_ai.py\"" /sc daily /st 08:00 /f
schtasks /create /tn "newsroom-12" /tr "\"%PY%\" \"%DIR%run_ai.py\"" /sc daily /st 12:00 /f
schtasks /create /tn "newsroom-19" /tr "\"%PY%\" \"%DIR%run_ai.py\"" /sc daily /st 19:00 /f

echo.
echo [완료] 매일 08 / 12 / 19 시 검토요청 등록됨.
echo   확인: schtasks /query ^| findstr newsroom
echo   해제: schtasks /delete /tn newsroom-08 /f  (12,19 도 동일)
echo.
echo ※ '발행' 버튼 처리에는 run_ai_bot.py(승인 데몬)가 항상 켜져 있어야 합니다.
pause
