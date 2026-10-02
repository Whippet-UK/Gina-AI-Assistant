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

echo [DEV] Freeing port 3200 (Node Gina + Python static hosts)...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$root=[regex]::Escape('%GINA_ROOT%'); ^
   Get-CimInstance Win32_Process -Filter \"Name = 'node.exe'\" -ErrorAction SilentlyContinue | ^
     Where-Object { $_.CommandLine -and $_.CommandLine -match $root -and $_.CommandLine -match 'server\.ts|dist\\server\.cjs|tsx' } | ^
     ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch {} }; ^
   Get-CimInstance Win32_Process -Filter \"Name = 'python.exe'\" -ErrorAction SilentlyContinue | ^
     Where-Object { $_.CommandLine -and $_.CommandLine -match 'http\.server' -and $_.CommandLine -match '3200' } | ^
     ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch {} }; ^
   $conns=Get-NetTCPConnection -LocalPort 3200 -State Listen -ErrorAction SilentlyContinue; ^
   foreach($c in $conns){ try { Stop-Process -Id $c.OwningProcess -Force -ErrorAction Stop } catch {} }; ^
   Start-Sleep -Milliseconds 600"

set "GINA_BOOT_MODE=%MODE%"
set "GINA_DEV_MODE=1"
if /I "%MODE%"=="dashboard-only" set "GINA_SKIP_HEAVY_INIT=1"
if /I "%MODE%"=="manual" set "GINA_SKIP_HEAVY_INIT=1"
if /I "%MODE%"=="dashboard-comfy" set "GINA_SKIP_HEAVY_INIT="

if exist "%GINA_ROOT%\server.ts" if exist "%GINA_ROOT%\package.json" (
  echo [DEV] Starting light Node host (server.ts) without heavy ML init...
  >> "%GINA_ROOT%\logs\gina-development-startup.log" echo [DEV] Light Node host starting.
  start "" /b powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -Command "$deadline=(Get-Date).AddSeconds(60); while((Get-Date) -lt $deadline){ try{ $c=New-Object Net.Sockets.TcpClient; $a=$c.BeginConnect('127.0.0.1',3200,$null,$null); if($a.AsyncWaitHandle.WaitOne(300) -and $c.Connected){$c.Close(); Start-Process 'http://127.0.0.1:3200'; exit 0}; $c.Close() }catch{}; Start-Sleep -Milliseconds 250 }; exit 1"
  call g_env\Scripts\activate.bat 2>nul
  set NODE_OPTIONS=--max-old-space-size=4096
  npm.cmd run dev
  set "GINA_EXIT_CODE=%ERRORLEVEL%"
) else (
  if not exist "%GINA_DIST%\index.html" (
    echo [ERROR] Built Gina dashboard not found: %GINA_DIST%\index.html
    pause
    exit /b 1
  )
  echo [DEV] Starting static Development Mode dashboard (Python http.server).
  echo [DEV] Closing this window frees port 3200.
  start "" /b powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -Command "$deadline=(Get-Date).AddSeconds(45); while((Get-Date) -lt $deadline){ try{ $c=New-Object Net.Sockets.TcpClient; $a=$c.BeginConnect('127.0.0.1',3200,$null,$null); if($a.AsyncWaitHandle.WaitOne(300) -and $c.Connected){$c.Close(); Start-Process 'http://127.0.0.1:3200'; exit 0}; $c.Close() }catch{}; Start-Sleep -Milliseconds 250 }; exit 1"
  "%GINA_PYTHON%" -m http.server 3200 --bind 127.0.0.1 --directory "%GINA_DIST%"
  set "GINA_EXIT_CODE=%ERRORLEVEL%"
)

echo.
echo [DEV] Releasing port 3200...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Get-CimInstance Win32_Process -Filter \"Name = 'python.exe'\" -ErrorAction SilentlyContinue | ^
     Where-Object { $_.CommandLine -and $_.CommandLine -match 'http\.server' -and $_.CommandLine -match '3200' } | ^
     ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch {} }; ^
   $conns=Get-NetTCPConnection -LocalPort 3200 -State Listen -ErrorAction SilentlyContinue; ^
   foreach($c in $conns){ try { Stop-Process -Id $c.OwningProcess -Force -ErrorAction Stop } catch {} }"

echo ============================================================
if "%GINA_EXIT_CODE%"=="0" (
  echo [DEV] Gina Development Mode stopped. Port 3200 released.
) else (
  echo [ERROR] Gina exited with code %GINA_EXIT_CODE%.
  echo [DEV] Attempted to release port 3200 anyway.
)
echo ============================================================
echo.
echo Press any key to close this Development Mode terminal.
pause >nul
endlocal
exit /b %GINA_EXIT_CODE%
