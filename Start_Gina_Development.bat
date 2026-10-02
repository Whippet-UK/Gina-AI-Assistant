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
  echo.
  pause
  exit /b 2
)

cd /d "%GINA_ROOT%" || (
  echo [ERROR] Gina root does not exist: %GINA_ROOT%
  echo.
  pause
  exit /b 1
)

if not exist "%GINA_ENV%" (
  echo [ERROR] Gina Python environment not found:
  echo         %GINA_ENV%
  echo.
  pause
  exit /b 1
)

echo ============================================================
echo  GINA AI DEVELOPMENT MODE
echo ============================================================
echo  Mode: %MODE%
echo  Root: %GINA_ROOT%
echo  Log:  %GINA_ROOT%\logs\gina-development-startup.log
echo ============================================================
echo.

if not exist "%GINA_ROOT%\logs" mkdir "%GINA_ROOT%\logs" >nul 2>&1
echo ============================================================ > "%GINA_ROOT%\logs\gina-development-startup.log"
echo Gina Development Mode startup %date% %time% >> "%GINA_ROOT%\logs\gina-development-startup.log"
echo Mode: %MODE% >> "%GINA_ROOT%\logs\gina-development-startup.log"
echo ============================================================ >> "%GINA_ROOT%\logs\gina-development-startup.log"

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js was not found on PATH.
  echo [ERROR] Node.js was not found on PATH. >> "%GINA_ROOT%\logs\gina-development-startup.log"
  echo.
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm was not found on PATH.
  echo [ERROR] npm was not found on PATH. >> "%GINA_ROOT%\logs\gina-development-startup.log"
  echo.
  pause
  exit /b 1
)

call "%GINA_ENV%"
if errorlevel 1 (
  echo [ERROR] Could not activate Gina g_env.
  echo [ERROR] Could not activate Gina g_env. >> "%GINA_ROOT%\logs\gina-development-startup.log"
  echo.
  pause
  exit /b 1
)

set "GINA_DEV_MODE=1"
set "GINA_BOOT_MODE=%MODE%"
set "NODE_OPTIONS=--max-old-space-size=8192"

if /I "%MODE%"=="dashboard-comfy" (
  if exist "%GINA_ROOT%\Start_ComfyUI.bat" (
    echo [DEV] Starting ComfyUI in a separate terminal.
    echo [DEV] Starting ComfyUI. >> "%GINA_ROOT%\logs\gina-development-startup.log"
    start "ComfyUI - Gina Dev" cmd /k call "%GINA_ROOT%\Start_ComfyUI.bat"
  ) else (
    echo [DEV][WARN] Start_ComfyUI.bat not found.
    echo [DEV][WARN] Start_ComfyUI.bat not found. >> "%GINA_ROOT%\logs\gina-development-startup.log"
  )
)

echo [DEV] Gina will start on port 3200 (or the first free fallback port).
echo [DEV] Heavy ML model loading and database initialisation are skipped in cold modes.
echo [DEV] Opening the dashboard automatically when the server becomes reachable...
echo.

start "Gina Dashboard Launcher" powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$deadline=(Get-Date).AddSeconds(90); while((Get-Date) -lt $deadline){ foreach($p in 3200..3210){ try{ $c=New-Object Net.Sockets.TcpClient; $a=$c.BeginConnect('127.0.0.1',$p,$null,$null); if($a.AsyncWaitHandle.WaitOne(250) -and $c.Connected){$c.Close(); Start-Process ('http://127.0.0.1:'+$p); exit 0}; $c.Close() }catch{} }; Start-Sleep -Milliseconds 500 }; Write-Host '[DEV][WARN] Gina did not become reachable within 90 seconds.'"

echo [DEV] Starting Gina server...
echo [DEV] Starting Gina server... >> "%GINA_ROOT%\logs\gina-development-startup.log"

npm.cmd run dev
set "GINA_EXIT_CODE=%ERRORLEVEL%"

echo.
echo ============================================================
if "%GINA_EXIT_CODE%"=="0" (
  echo [DEV] Gina stopped normally.
) else (
  echo [ERROR] Gina exited with code %GINA_EXIT_CODE%.
  echo [ERROR] The terminal is being kept open so the startup error remains visible.
  echo [ERROR] Full startup log:
  echo         %GINA_ROOT%\logs\gina-development-startup.log
)
echo ============================================================
echo.
echo Press any key to close this Development Mode terminal.
pause >nul
endlocal
exit /b %GINA_EXIT_CODE%
