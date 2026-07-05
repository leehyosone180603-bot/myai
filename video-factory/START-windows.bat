@echo off
chcp 65001 >nul
title video-factory
cd /d "%~dp0"

echo.
echo   Starting video-factory ...
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo   [!] Node.js is not installed.
  echo       Install the LTS version from https://nodejs.org then run again.
  echo.
  pause
  exit /b
)

echo   A browser window will open shortly.  ( http://localhost:4399 )
echo   Keep this window open while you use the program.  ( closing it = quit )
echo.
node src\server.js
pause
