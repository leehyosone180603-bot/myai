@echo off
setlocal
title Instagram Top Content Sorter
cd /d "%~dp0"

echo ================================================
echo    Instagram Top Content Sorter
echo    (sort posts by views / likes)
echo ================================================
echo.

where node >nul 2>nul
if errorlevel 1 goto NONODE

if not exist "node_modules\playwright" goto INSTALL
goto RUNAPP

:INSTALL
echo [SETUP] First run - installing required components.
echo         This can take a few minutes. Please keep this window open...
echo.
call npm install playwright
if errorlevel 1 goto FAILNPM
echo.
echo [SETUP] Downloading browser (Chromium)...
call npx playwright install chromium
if errorlevel 1 goto FAILPW
echo.
echo [SETUP] Done!
echo.

:RUNAPP
set PORT=8787
echo [RUN] Starting the program. Your browser will open shortly.
echo       * Close this window when you are finished to stop the program.
echo.
REM Open the default browser after ~3 seconds (server keeps running in this window)
start "" /min cmd /c "ping -n 4 127.0.0.1 >nul & explorer http://127.0.0.1:8787/"
node server.js
echo.
echo [EXIT] Program stopped. Press any key to close this window.
pause >nul
exit /b 0

:NONODE
echo [NOTICE] Node.js is required to run this program.
echo    1. The download site will open now. Install the LTS version.
echo    2. After installing, double-click this file again.
echo.
start https://nodejs.org/en/download
echo.
pause
exit /b 1

:FAILNPM
echo.
echo [ERROR] Failed to install components. Check your internet and run again.
pause
exit /b 1

:FAILPW
echo.
echo [ERROR] Failed to install the browser. Please run again.
pause
exit /b 1
