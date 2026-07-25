@echo off
REM ===================================================================
REM  리포스트 스튜디오(GUI) - 잘 나온 게시물을 번역해 대기열에 쌓기.
REM  이 파일을 더블클릭하세요. (일본어 채널)
REM ===================================================================
cd /D "%~dp0"
if not exist ".venv\Scripts\python.exe" goto noenv
call ".venv\Scripts\activate.bat"
python repost_studio.py
goto end
:noenv
echo [ERROR] .venv not found. Create venv first: python -m venv .venv
pause
:end
