@echo off
title Instagram Downloader
powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0insta-downloader.ps1"
if errorlevel 1 (
  echo.
  echo PowerShell 실행에 실패했습니다. 이 창의 메시지를 확인해 주세요.
  pause
)
