@echo off
REM  리포스트 스튜디오(GUI) - 한국어 채널
cd /D "%~dp0"
if not exist ".venv\Scripts\python.exe" goto noenv
call ".venv\Scripts\activate.bat"
python repost_studio.py config\ai.ko.yaml
goto end
:noenv
echo [ERROR] .venv not found. Create venv first: python -m venv .venv
pause
:end
