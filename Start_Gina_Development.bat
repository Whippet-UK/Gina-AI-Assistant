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

if not exist "%GINA_ROOT%\node_modules\.bin\tsx.cmd" (
  echo [ERROR] Gina Node dependencies are not installed.
  echo [ERROR] Missing: %GINA_ROOT%\node_modules\.bin\tsx.cmd
  echo [ERROR] Run "npm install" once from %GINA_ROOT%, then start Development Mode again.
  echo.
  pause
  exit /b 1
)

if not exist "%GINA_ROOT%\logs" mkdir "%GINA_ROOT%\logs" >nul 2>&1
> "%GINA_ROOT%\logs\gina-development-startup.log" echo Gina Development Mode startup %date% %time%
>> "%GINA_ROOT%\logs\gina-development-startup.log" echo Mode: %MODE%

echo ============================================================
echo  GINA AI DEVELOPMENT MODE
echo ============================================================
echo  Mode: %MODE%
echo  Root: %GINA_ROOT%
echo  Dashboard: http://127.0.0.1:3200
echo  Log: %GINA_ROOT%\logs\gina-development-startup.log
echo ============================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js was not found on PATH.
  >> "%GINA_ROOT%\logs\gina-development-startup.log" echo [ERROR] Node.js was not found on PATH.
  pause
  exit /b 1
)

call "%GINA_ENV%"
if errorlevel 1 (
  echo [ERROR] Could not activate Gina g_env.
  >> "%GINA_ROOT%\logs\gina-development-startup.log" echo [ERROR] Could not activate Gina g_env.
  pause
  exit /b 1
)

set "GINA_DEV_MODE=1"
set "GINA_BOOT_MODE=%MODE%"
set "NODE_OPTIONS=--max-old-space-size=8192"

if /I "%MODE%"=="dashboard-comfy" (
  if exist "%GINA_ROOT%\Start_ComfyUI.bat" (
    echo [DEV] Starting ComfyUI in a separate terminal.
    >> "%GINA_ROOT%\logs\gina-development-startup.log" echo [DEV] Starting ComfyUI.
    start "ComfyUI - Gina Dev" cmd /k call "%GINA_ROOT%\Start_ComfyUI.bat"
  ) else (
    echo [DEV][WARN] Start_ComfyUI.bat not found.
  )
)

echo [DEV] Starting the lightweight Development Mode dashboard host.
echo [DEV] Gina backend will run separately on port 3201.
echo [DEV] Dashboard will open automatically at http://127.0.0.1:3200.
echo.

>> "%GINA_ROOT%\logs\gina-development-startup.log" echo [DEV] Starting lightweight dashboard host.

rem Open the dashboard once the lightweight host is listening.
start "" /b powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -Command "$deadline=(Get-Date).AddSeconds(45); while((Get-Date) -lt $deadline){ try{ $c=New-Object Net.Sockets.TcpClient; $a=$c.BeginConnect('127.0.0.1',3200,$null,$null); if($a.AsyncWaitHandle.WaitOne(300) -and $c.Connected){$c.Close(); Start-Process 'http://127.0.0.1:3200'; exit 0}; $c.Close() }catch{}; Start-Sleep -Milliseconds 250 }; exit 1"

call "%GINA_ROOT%\node_modules\.bin\tsx.cmd" "%GINA_ROOT%\server\DevelopmentModeDashboard.ts"

set "GINA_EXIT_CODE=%ERRORLEVEL%"

echo.
echo ============================================================
if "%GINA_EXIT_CODE%"=="0" (
  echo [DEV] Gina stopped normally.
) else (
  echo [ERROR] Gina exited with code %GINA_EXIT_CODE%.
  echo [ERROR] See the server error above; this terminal will stay open.
  echo [ERROR] Startup log: %GINA_ROOT%\logs\gina-development-startup.log
)
echo ============================================================
echo.
echo Press any key to close this Development Mode terminal.
pause >nul
endlocal
exit /b %GINA_EXIT_CODE%
