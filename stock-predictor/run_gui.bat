@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 주가 예측 프로그램
echo ============================================
echo   주가 예측 프로그램 (GUI) 실행
echo ============================================

rem 파이썬 런처 py -3 우선 사용.
rem (py gui.py 는 shebang 때문에 WindowsApps\python3.exe 스텁을 물어 실패하므로
rem  버전을 명시한 py -3 로 실제 파이썬을 직접 실행해 이를 우회한다)
set "PY="
py -3 --version >nul 2>nul && set "PY=py -3"
if not defined PY (
  python --version >nul 2>nul && set "PY=python"
)

if not defined PY (
  echo.
  echo [오류] 파이썬을 찾을 수 없습니다.
  echo   https://www.python.org/downloads/windows/ 에서
  echo   "Windows installer ^(64-bit^)" 로 설치하세요.
  echo   설치 화면에서 "Add python.exe to PATH" 를 반드시 체크하세요.
  echo.
  pause
  exit /b 1
)

echo 사용할 파이썬: %PY%
echo 필요한 패키지 확인 중... (차트용 matplotlib)
%PY% -m pip install --quiet --disable-pip-version-check matplotlib >nul 2>nul

echo 창을 실행합니다...
%PY% gui.py
if errorlevel 1 (
  echo.
  echo [오류] 실행에 실패했습니다.
  echo   도움말: Windows 설정 - 앱 - 고급 앱 설정 - 앱 실행 별칭 에서
  echo   "python.exe" / "python3.exe" 항목을 끄면 해결되는 경우가 많습니다.
  echo.
  pause
)
