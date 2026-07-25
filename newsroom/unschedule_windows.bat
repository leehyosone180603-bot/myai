@echo off
REM Remove old Windows publish/review scheduled tasks.
REM The in-app scheduler (approval daemon) now handles publishing + nightly review,
REM so these old tasks must be removed to avoid double posting.
REM Run this file as Administrator. (Keeps the 'newsroom-bot' autostart task.)
setlocal
for %%T in (newsroom-review newsroom-pub-0800-money newsroom-pub-1200-general newsroom-pub-1500-general newsroom-pub-1900-money newsroom-pub-2100-general newsroom-ko-review newsroom-ko-pub-0900-money newsroom-ko-pub-1300-general newsroom-ko-pub-1600-general newsroom-ko-pub-2000-money newsroom-ko-pub-2200-general) do schtasks /delete /tn "%%T" /f >nul 2>&1
echo Done. Old publish/review tasks removed.
echo Remaining newsroom tasks (should be only 'newsroom-bot'):
schtasks /query | findstr newsroom
echo.
pause
