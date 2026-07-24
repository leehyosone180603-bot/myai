@echo off
REM ===================================================================
REM  한국어 채널 관리 패널(GUI). 이 파일을 더블클릭하세요.
REM  일본어 채널(panel.bat)과 별개로 동작합니다(대기열/상태 분리).
REM ===================================================================
cd /D "%~dp0"
if not exist ".venv\Scripts\python.exe" goto noenv
call ".venv\Scripts\activate.bat"
python control_panel.py config\ai.ko.yaml
goto end

:noenv
echo [ERROR] .venv not found. Create venv in the newsroom folder first:
echo         python -m venv .venv
pause

:end
