@echo off
REM ═══════════════════════════════════════════════════════════════════
REM  예약 발행 스케줄 등록 (Windows 작업 스케줄러)
REM   · 매일 23:00  검토 후보 전송(돈/경제 + 일반 이슈)      run_ai.py --review
REM   · 다음날 5개 시간대  대기열에서 하나씩 자동 발행         run_ai.py --publish-next
REM       08:00 돈 / 12:00 일반 / 15:00 일반 / 19:00 돈 / 21:00 일반
REM  이 파일을 더블클릭하거나 cmd 에서 실행하면 등록됩니다.
REM  (그 시각에 PC 가 켜져 있어야 실행됩니다)
REM ═══════════════════════════════════════════════════════════════════
setlocal
set DIR=%~dp0
set PY=%DIR%.venv\Scripts\python.exe

if not exist "%PY%" (
  echo [오류] 가상환경을 찾을 수 없습니다: %PY%
  echo   newsroom 폴더에서 python -m venv .venv 를 먼저 실행하세요.
  pause & exit /b 1
)

REM ── 밤 11시 검토(후보 전송) ──
schtasks /create /tn "newsroom-review" /tr "\"%PY%\" \"%DIR%run_ai.py\" --review" /sc daily /st 23:00 /f

REM ── 다음날 발행 시간대 (돈 2 + 일반 3 = 5) ──
schtasks /create /tn "newsroom-pub-0800-money"   /tr "\"%PY%\" \"%DIR%run_ai.py\" --publish-next money"   /sc daily /st 08:00 /f
schtasks /create /tn "newsroom-pub-1200-general" /tr "\"%PY%\" \"%DIR%run_ai.py\" --publish-next general" /sc daily /st 12:00 /f
schtasks /create /tn "newsroom-pub-1500-general" /tr "\"%PY%\" \"%DIR%run_ai.py\" --publish-next general" /sc daily /st 15:00 /f
schtasks /create /tn "newsroom-pub-1900-money"   /tr "\"%PY%\" \"%DIR%run_ai.py\" --publish-next money"   /sc daily /st 19:00 /f
schtasks /create /tn "newsroom-pub-2100-general" /tr "\"%PY%\" \"%DIR%run_ai.py\" --publish-next general" /sc daily /st 21:00 /f

echo.
echo [완료] 등록됨:
echo   - 매일 23:00  검토 후보 전송(newsroom-review)
echo   - 매일 08/12/15/19/21 시  대기열에서 자동 발행(돈2 + 일반3)
echo.
echo   확인: schtasks /query ^| findstr newsroom
echo   해제: schtasks /delete /tn newsroom-review /f   (각 newsroom-pub-* 도 동일)
echo.
echo ※ '발행' 버튼 처리(승인→대기열 적재)에는 run_ai_bot.py(승인 데몬)가 항상 켜져 있어야 합니다.
echo    시작 프로그램/서비스로 등록해 두는 것을 권장합니다.
pause
