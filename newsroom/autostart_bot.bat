@echo off
REM ═══════════════════════════════════════════════════════════════════
REM  로그인할 때 승인 데몬(start_bot.bat)이 자동으로 켜지도록 등록.
REM  관리자 권한으로 한 번만 실행하면 됩니다(우클릭 → 관리자 권한으로 실행).
REM ═══════════════════════════════════════════════════════════════════
setlocal
set DIR=%~dp0

schtasks /create /tn "newsroom-bot" /tr "\"%DIR%start_bot.bat\"" /sc onlogon /rl highest /f

echo.
echo [완료] 로그인 시 승인 데몬 자동 시작 등록됨(newsroom-bot).
echo   · 지금 바로 켜려면 이 창을 닫고 start_bot.bat 를 한 번 실행하세요.
echo   · 확인:  schtasks /query ^| findstr newsroom-bot
echo   · 해제:  schtasks /delete /tn newsroom-bot /f
echo.
echo ※ 봇은 하나만 켜져 있어야 합니다(409 방지). 자동시작을 쓰면
echo    수동으로 run_ai_bot.py 를 또 켜지 마세요.
pause
