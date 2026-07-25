@echo off
REM ===================================================================
REM  옛 Windows 작업 스케줄러 '발행/검토' 작업 제거.
REM  이제 발행/검토는 프로그램 내장 스케줄러(승인 데몬)가 담당하므로,
REM  중복 발행을 막기 위해 아래 작업들을 지웁니다.
REM  (승인 데몬 자동시작 'newsroom-bot' 은 남겨둡니다)
REM  관리자 권한으로 실행하세요.
REM ===================================================================
setlocal
for %%T in (
  newsroom-review
  newsroom-pub-0800-money newsroom-pub-1200-general newsroom-pub-1500-general
  newsroom-pub-1900-money newsroom-pub-2100-general
  newsroom-ko-review
  newsroom-ko-pub-0900-money newsroom-ko-pub-1300-general newsroom-ko-pub-1600-general
  newsroom-ko-pub-2000-money newsroom-ko-pub-2200-general
) do schtasks /delete /tn "%%T" /f >nul 2>&1

echo.
echo [완료] 옛 발행/검토 작업 제거됨. 이제 발행은 프로그램 내장 스케줄러가 합니다.
echo   · 승인 데몬(start_bot.bat) 또는 관리 패널의 '승인 봇 시작'을 켜두면
echo     설정된 시간대에 자동 발행됩니다.
echo   · 발행 시간은 패널/스튜디오의 '발행 시간 설정' 버튼으로 변경하세요.
echo   · 남은 자동시작 작업 확인: schtasks /query ^| findstr newsroom
pause
