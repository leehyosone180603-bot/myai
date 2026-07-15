@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 주가 예측 프로그램
echo ============================================
echo   주가 예측 프로그램 (GUI) 실행
echo ============================================

rem 파이썬 런처(py) 우선, 없으면 python 사용
where py >nul 2>nul && (set "PY=py") || (set "PY=python")

%PY% --version >nul 2>nul
if errorlevel 1 (
  echo.
  echo [오류] 파이썬을 찾을 수 없습니다.
  echo   https://www.python.org/downloads/ 에서 파이썬을 설치하세요.
  echo   설치 시 "Add Python to PATH" 를 반드시 체크하세요.
  echo.
  pause
  exit /b 1
)

echo 필요한 패키지 확인 중... (차트용 matplotlib)
%PY% -m pip install --quiet --disable-pip-version-check matplotlib >nul 2>nul

echo 창을 실행합니다...
%PY% gui.py
if errorlevel 1 (
  echo.
  echo [오류] 실행에 실패했습니다. 위 메시지를 확인하세요.
  pause
)
