@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Gina AI Development Mode
set "GINA_ROOT=C:\Gina_AI"
set "GINA_PYTHON=%GINA_ROOT%\g_env\Scripts\python.exe"
set "GINA_DIST=%GINA_ROOT%\dist"
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

if not exist "%GINA_PYTHON%" (
  echo [ERROR] Gina Python runtime not found:
  echo         %GINA_PYTHON%
  echo.
  pause
  exit /b 1
)

if not exist "%GINA_DIST%\index.html" (
  echo [ERROR] Built Gina dashboard not found:
  echo         %GINA_DIST%\index.html
  echo [ERROR] Development Mode serves the existing build only and does not start Node.js/Vite.
  echo [ERROR] Build the dashboard once with the normal development/build workflow, then retry.
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


if /I "%MODE%"=="dashboard-comfy" (
  if exist "%GINA_ROOT%\Start_ComfyUI.bat" (
    echo [DEV] Starting ComfyUI in a separate terminal.
    >> "%GINA_ROOT%\logs\gina-development-startup.log" echo [DEV] Starting ComfyUI.
    start "ComfyUI - Gina Dev" cmd /k call "%GINA_ROOT%\Start_ComfyUI.bat"
  ) else (
    echo [DEV][WARN] Start_ComfyUI.bat not found.
  )
)

echo [DEV] Starting the static Development Mode dashboard.
echo [DEV] Node.js, Vite, tsx and server.ts will NOT be started.
echo [DEV] Serving the existing dist build with Python only.
echo [DEV] Dashboard will open automatically at http://127.0.0.1:3200.
echo.

>> "%GINA_ROOT%\logs\gina-development-startup.log" echo [DEV] Starting static dashboard host with Python.

rem Open the dashboard once the lightweight host is listening.
start "" /b powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -Command "$deadline=(Get-Date).AddSeconds(45); while((Get-Date) -lt $deadline){ try{ $c=New-Object Net.Sockets.TcpClient; $a=$c.BeginConnect('127.0.0.1',3200,$null,$null); if($a.AsyncWaitHandle.WaitOne(300) -and $c.Connected){$c.Close(); Start-Process 'http://127.0.0.1:3200'; exit 0}; $c.Close() }catch{}; Start-Sleep -Milliseconds 250 }; exit 1"

"%GINA_PYTHON%" -m http.server 3200 --bind 127.0.0.1 --directory "%GINA_DIST%"
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
