@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Gina AI Factory - Local

set "GINA_ROOT=C:\Gina_AI"
set "COMFY_URL=http://127.0.0.1:8188"
set "GINA_URL=http://127.0.0.1:3200"
set "GINA_ENV=%GINA_ROOT%\g_env\Scripts\activate.bat"
set "COMFY_MAIN=%GINA_ROOT%\ComfyUI_windows_portable\ComfyUI\main.py"
set "PACKAGE=%GINA_ROOT%\package.json"

cd /d "%GINA_ROOT%"

echo ==========================================
echo        GINA AI FACTORY - LOCAL
echo ==========================================
echo.

if not exist "%GINA_ENV%" (
  echo [ERROR] Gina environment not found:
  echo         %GINA_ENV%
  pause
  exit /b 1
)
if not exist "%COMFY_MAIN%" (
  echo [ERROR] ComfyUI main.py not found:
  echo         %COMFY_MAIN%
  pause
  exit /b 1
)
if not exist "%PACKAGE%" (
  echo [ERROR] Gina package.json not found:
  echo         %PACKAGE%
  pause
  exit /b 1
)

call "%GINA_ENV%"
if errorlevel 1 (
  echo [ERROR] Could not activate g_env.
  pause
  exit /b 1
)

echo [0/5] Checking Gina npm dependencies...
if not exist "%GINA_ROOT%\node_modules\jszip\package.json" (
  echo    jszip is missing. Installing dependencies from package.json...
  call npm.cmd install --no-audit --no-fund
  if errorlevel 1 (
    echo [ERROR] npm install failed. Gina cannot start without its dependencies.
    echo         Check your internet connection and npm output above.
    pause
    exit /b 1
  )
) else (
  echo    Gina npm dependencies appear installed.
)

echo [1/4] Starting ComfyUI (only if port 8188 is free)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$c=Get-NetTCPConnection -LocalPort 8188 -State Listen -ErrorAction SilentlyContinue; if($c){exit 0}else{exit 1}"
if errorlevel 1 (
  start "ComfyUI - Gina Backend" cmd /k "cd /d %GINA_ROOT% && call g_env\Scripts\activate.bat && python ComfyUI_windows_portable\ComfyUI\main.py --lowvram --fp8_e4m3fn-text-enc"
) else (
  echo    ComfyUI is already running; reusing it.
)

echo.
echo [2/4] Waiting for ComfyUI at %COMFY_URL% ...
set /a COMFY_TRIES=0
:WAIT_COMFY
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r=Invoke-WebRequest -Uri '%COMFY_URL%' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { exit 0 } else { exit 1 } } catch { exit 1 }"
if not errorlevel 1 goto COMFY_READY
set /a COMFY_TRIES+=1
if !COMFY_TRIES! GEQ 90 (
  echo [ERROR] ComfyUI did not become ready within 180 seconds.
  echo Check the ComfyUI console window for the actual error.
  pause
  exit /b 1
)
echo    ComfyUI is not ready yet... ^(!COMFY_TRIES!^)
timeout /t 2 /nobreak >nul
goto WAIT_COMFY

:COMFY_READY
echo    ComfyUI is READY.
echo.

echo [3/5] Starting ACE-Step singing API (only if installed)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$c=Get-NetTCPConnection -LocalPort 8101 -State Listen -ErrorAction SilentlyContinue; if($c){exit 0}else{exit 1}"
if errorlevel 1 (
  if exist "%GINA_ROOT%\third_party\ACE-Step-1.5\pyproject.toml" (
    start "ACE-Step 1.5 - Singing API" cmd /k "cd /d %GINA_ROOT%\third_party\ACE-Step-1.5 && set ACESTEP_API_HOST=127.0.0.1 && set ACESTEP_API_PORT=8101 && set ACESTEP_INIT_SERVICE=true && set ACESTEP_CONFIG_PATH=acestep-v15-turbo && set ACESTEP_LM_MODEL_PATH=acestep-5Hz-lm-0.6B && set ACESTEP_LM_BACKEND=pt && set ACESTEP_OFFLOAD_TO_CPU=true && set ACESTEP_OFFLOAD_DIT_TO_CPU=true && set ACESTEP_INIT_LLM=true && set ACESTEP_LM_OFFLOAD_TO_CPU=true && uv run --no-sync acestep-api --host 127.0.0.1 --port 8101 --init-llm --lm-model-path acestep-5Hz-lm-0.6B"
  ) else (
    echo    ACE-Step is not installed. Singing remains unavailable until setup is run.
  )
) else (
  echo    ACE-Step API is already running; reusing it.
)

echo.

echo [4/5] Starting Gina Dashboard...
REM Stop only an existing Gina node process from this install so a stale
REM v1.x server cannot occupy 3200 and serve an older API.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$procs=Get-CimInstance Win32_Process -Filter \"Name = 'node.exe'\" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -and $_.CommandLine -match [regex]::Escape($env:GINA_ROOT) -and $_.CommandLine -match 'server\.ts|dist\\server\.cjs' }; foreach($p in $procs){ try { Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop } catch {} }"
timeout /t 1 /nobreak >nul
powershell -NoProfile -ExecutionPolicy Bypass -Command "$c=Get-NetTCPConnection -LocalPort 3200 -State Listen -ErrorAction SilentlyContinue; if($c){exit 0}else{exit 1}"
if not errorlevel 1 (
  echo    [ERROR] Port 3200 is still occupied after stopping the old Gina process.
  echo    Close the process using 3200, then run this launcher again.
  pause
  exit /b 1
)
start "Gina Dashboard" cmd /k "cd /d %GINA_ROOT% && call g_env\Scripts\activate.bat && set NODE_OPTIONS=--max-old-space-size=8192 && npm.cmd run dev"

echo.
echo [4/5] Waiting for Gina at %GINA_URL% ...
set /a GINA_TRIES=0
:WAIT_GINA
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r=Invoke-WebRequest -Uri '%GINA_URL%' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { exit 0 } else { exit 1 } } catch { exit 1 }"
if not errorlevel 1 goto GINA_READY
set /a GINA_TRIES+=1
if !GINA_TRIES! GEQ 90 (
  echo [ERROR] Gina did not become ready within 180 seconds.
  echo Check the Gina Dashboard console window for the actual error.
  pause
  exit /b 1
)
echo    Gina is not ready yet... ^(!GINA_TRIES!^)
timeout /t 2 /nobreak >nul
goto WAIT_GINA

:GINA_READY
echo    Gina Dashboard is READY.
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $d=(Invoke-WebRequest -Uri '%GINA_URL%/api/version' -UseBasicParsing -TimeoutSec 3).Content | ConvertFrom-Json; if($d.version -ne 'v1.17.87'){ Write-Host ('[WARN] Dashboard reports version ' + $d.version + ' (expected v1.17.87).'); } } catch { Write-Host '[WARN] Could not verify Gina API version.' }"
echo.

echo [MusicGen] Checking local MusicGen Medium resolution...
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $m=(Invoke-WebRequest -Uri '%GINA_URL%/api/music/status' -UseBasicParsing -TimeoutSec 5).Content | ConvertFrom-Json; $x=$m.availableModels | Where-Object { $_.id -eq 'facebook/musicgen-medium' }; Write-Host ('    Status: cached=' + $x.cached + ' weights=' + $x.hasWeights + ' backend=' + $x.backend); Write-Host ('    Path: ' + $x.managedPath); if($x.resolution.revision){ Write-Host ('    Revision: ' + $x.resolution.revision); }; if($x.resolution.refs){ Write-Host ('    Refs: ' + ($x.resolution.refs -join ', ')); } } catch { Write-Host '[WARN] Could not query MusicGen resolution.' }"
echo.
echo [5/5] Starting local Gemma engine...
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r=Invoke-WebRequest -Method POST -Uri '%GINA_URL%/api/llm/start' -UseBasicParsing -TimeoutSec 180; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 300) { exit 0 } else { exit 1 } } catch { exit 1 }"
if errorlevel 1 (
  echo [WARN] Gina started, but Gemma could not be started automatically.
  echo       You can start Gemma from LOCAL AI in the dashboard.
  goto GINA_READY_FINAL
)

set /a LLM_TRIES=0
:WAIT_LLM
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r=Invoke-WebRequest -Uri '%GINA_URL%/api/llm/status' -UseBasicParsing -TimeoutSec 3; $d=$r.Content | ConvertFrom-Json; if ($d.ready -eq $true) { exit 0 } else { exit 1 } } catch { exit 1 }"
if not errorlevel 1 goto LLM_READY
set /a LLM_TRIES+=1
if !LLM_TRIES! GEQ 120 (
  echo [WARN] Gemma did not become ready within 240 seconds.
  echo       Gina is still available; check LOCAL AI and the Gina terminal.
  goto GINA_READY_FINAL
)
echo    Gemma is loading... ^(!LLM_TRIES!^)
timeout /t 2 /nobreak >nul
goto WAIT_LLM

:LLM_READY
echo    Gemma 3 12B is READY.
echo.

:GINA_READY_FINAL
echo ==========================================
echo             GINA IS READY
echo ==========================================
echo.
echo ComfyUI: %COMFY_URL%
echo Gina:    %GINA_URL%
echo Gemma:   http://127.0.0.1:8080
echo.
echo Opening Gina in your default browser...
start "" "%GINA_URL%/?startup=ready"
echo.
echo Startup completed successfully.
echo You can close this launcher window.
pause
endlocal
