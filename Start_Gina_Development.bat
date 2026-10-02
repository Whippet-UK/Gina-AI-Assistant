@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Gina AI Development Mode
set "GINA_ROOT=C:\Gina_AI"
set "GINA_ENV=%GINA_ROOT%\g_env\Scripts\activate.bat"
set "MODE=%~1"
if /I "%MODE%"=="" set "MODE=dashboard-only"
if /I not "%MODE%"=="dashboard-only" if /I not "%MODE%"=="dashboard-comfy" if /I not "%MODE%"=="manual" (
  echo [ERROR] Unsupported Development Mode: %MODE%
  echo Allowed: dashboard-only, dashboard-comfy, manual
  pause
  exit /b 2
)
cd /d "%GINA_ROOT%"
if not exist "%GINA_ENV%" (echo [ERROR] Gina g_env not found: %GINA_ENV% & pause & exit /b 1)
call "%GINA_ENV%"
if errorlevel 1 (echo [ERROR] Could not activate g_env. & pause & exit /b 1)
if /I "%MODE%"=="dashboard-comfy" (
  if exist "%GINA_ROOT%\Start_ComfyUI.bat" (
    echo [DEV] Starting ComfyUI asynchronously; Gina does not wait for model readiness.
    start "ComfyUI - Gina Dev" cmd /k call "%GINA_ROOT%\Start_ComfyUI.bat"
  ) else echo [DEV][WARN] Start_ComfyUI.bat not found.
)
echo [DEV] Starting Gina Dashboard in %MODE% mode.
set "GINA_DEV_MODE=1"
set "GINA_BOOT_MODE=%MODE%"
set "NODE_OPTIONS=--max-old-space-size=8192"
npm.cmd run dev
endlocal
