@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d C:\Gina_AI
set "ACE_ROOT=C:\Gina_AI\third_party\ACE-Step-1.5"
set "UV_EXE="

echo ==========================================
echo Gina AI Factory - ACE-Step 1.5 Singing Setup
echo ==========================================
echo.
if not exist "C:\Gina_AI\third_party" mkdir "C:\Gina_AI\third_party"
where git >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Git is required. Install Git for Windows, then run this again.
  pause
  exit /b 1
)

REM Resolve uv from PATH or the locations used by the official Windows installer.
where uv >nul 2>&1
if not errorlevel 1 set "UV_EXE=uv"
if not defined UV_EXE if exist "%USERPROFILE%\.local\bin\uv.exe" set "UV_EXE=%USERPROFILE%\.local\bin\uv.exe"
if not defined UV_EXE if exist "%LOCALAPPDATA%\Microsoft\WinGet\Links\uv.exe" set "UV_EXE=%LOCALAPPDATA%\Microsoft\WinGet\Links\uv.exe"

if not defined UV_EXE (
  echo [1/4] uv was not found. Installing uv using the official Windows installer...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "& { $ErrorActionPreference='Stop'; irm https://astral.sh/uv/install.ps1 | iex }"
  if errorlevel 1 (
    echo [ERROR] Automatic uv installation failed.
    echo Try: winget install --id=astral-sh.uv -e
    pause
    exit /b 1
  )
  if exist "%USERPROFILE%\.local\bin\uv.exe" set "UV_EXE=%USERPROFILE%\.local\bin\uv.exe"
  if not defined UV_EXE if exist "%LOCALAPPDATA%\Microsoft\WinGet\Links\uv.exe" set "UV_EXE=%LOCALAPPDATA%\Microsoft\WinGet\Links\uv.exe"
  if not defined UV_EXE (
    echo [ERROR] uv installed but could not be located in this session.
    echo Restart this batch file after closing it, then run it again.
    pause
    exit /b 1
  )
) else (
  echo [1/4] uv found: %UV_EXE%
)

"%UV_EXE%" --version
if errorlevel 1 (
  echo [ERROR] uv could not be executed.
  pause
  exit /b 1
)

if not exist "%ACE_ROOT%\.git" (
  echo [2/4] Cloning official ACE-Step 1.5 repository...
  git clone https://github.com/ACE-Step/ACE-Step-1.5.git "%ACE_ROOT%"
  if errorlevel 1 goto FAIL
) else (
  echo [2/4] ACE-Step repository already exists; keeping local checkout.
)

cd /d "%ACE_ROOT%"
echo [3/4] Installing ACE-Step dependencies with uv...
"%UV_EXE%" sync
if errorlevel 1 goto FAIL

echo [4/4] Preparing 8GB-safe singing configuration...
echo ACE-Step will use the 0.6B LM with PyTorch backend and CPU offload.
echo The first API start may download the required ACE-Step model files.
if not exist "%ACE_ROOT%\Gina_ACEStep_READY.txt" echo ready>"%ACE_ROOT%\Gina_ACEStep_READY.txt"

echo.
echo ==========================================
echo ACE-Step installation complete.
echo ==========================================
echo Start the API with:
echo   scripts\Start_ACEStep_Singing_API.bat
echo.
pause
exit /b 0

:FAIL
echo.
echo [ERROR] ACE-Step setup failed. See the command output above.
pause
exit /b 1
