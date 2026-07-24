@echo off
REM ===================================================================
REM  한국어 채널 예약 발행 스케줄 등록 (config\ai.ko.yaml 사용)
REM   · 23:30  검토 후보 전송         run_ai.py --config config\ai.ko.yaml --review
REM   · 09/13/16/20/22 시  자동 발행   run_ai.py --config config\ai.ko.yaml --publish-next
REM  일본어 채널과 시간대를 살짝 다르게 두어 동시 실행 부하를 분산했습니다.
REM  관리자 권한으로 한 번 실행하세요(우클릭 → 관리자 권한으로 실행).
REM ===================================================================
setlocal
set DIR=%~dp0
set PY=%DIR%.venv\Scripts\python.exe
set CFG=%DIR%config\ai.ko.yaml

if not exist "%PY%" (
  echo [오류] 가상환경.venv 이 없습니다. newsroom 폴더에서 만들어 주세요.
  pause & exit /b 1
)

schtasks /create /tn "newsroom-ko-review" /tr "\"%PY%\" \"%DIR%run_ai.py\" --config \"%CFG%\" --review" /sc daily /st 23:30 /f

schtasks /create /tn "newsroom-ko-pub-0900-money"   /tr "\"%PY%\" \"%DIR%run_ai.py\" --config \"%CFG%\" --publish-next money"   /sc daily /st 09:00 /f
schtasks /create /tn "newsroom-ko-pub-1300-general" /tr "\"%PY%\" \"%DIR%run_ai.py\" --config \"%CFG%\" --publish-next general" /sc daily /st 13:00 /f
schtasks /create /tn "newsroom-ko-pub-1600-general" /tr "\"%PY%\" \"%DIR%run_ai.py\" --config \"%CFG%\" --publish-next general" /sc daily /st 16:00 /f
schtasks /create /tn "newsroom-ko-pub-2000-money"   /tr "\"%PY%\" \"%DIR%run_ai.py\" --config \"%CFG%\" --publish-next money"   /sc daily /st 20:00 /f
schtasks /create /tn "newsroom-ko-pub-2200-general" /tr "\"%PY%\" \"%DIR%run_ai.py\" --config \"%CFG%\" --publish-next general" /sc daily /st 22:00 /f

echo.
echo [완료] 한국어 채널 등록됨: 23:30 검토 + 09/13/16/20/22 시 발행(돈2 + 일반3).
echo   확인: schtasks /query ^| findstr newsroom-ko
echo   해제: schtasks /delete /tn newsroom-ko-review /f  (각 newsroom-ko-pub-* 도 동일)
pause
