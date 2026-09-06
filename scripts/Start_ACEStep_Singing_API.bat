@echo off
setlocal EnableExtensions EnableDelayedExpansion
set "ACE_ROOT=C:\Gina_AI\third_party\ACE-Step-1.5"
set "ACE_URL=http://127.0.0.1:8101"
set "UV_EXE="
cd /d "%ACE_ROOT%"
if not exist "%ACE_ROOT%\pyproject.toml" (
  echo [ERROR] ACE-Step is not installed. Run scripts\Install_ACEStep_Singing.bat first.
  pause
  exit /b 1
)

REM Resolve uv from PATH or the locations used by the official Windows installer.
where uv >nul 2>&1
if not errorlevel 1 set "UV_EXE=uv"
if not defined UV_EXE if exist "%USERPROFILE%\.local\bin\uv.exe" set "UV_EXE=%USERPROFILE%\.local\bin\uv.exe"
if not defined UV_EXE if exist "%LOCALAPPDATA%\Microsoft\WinGet\Links\uv.exe" set "UV_EXE=%LOCALAPPDATA%\Microsoft\WinGet\Links\uv.exe"

if not defined UV_EXE (
  echo [ERROR] uv is not available.
  echo Run scripts\Install_ACEStep_Singing.bat first; it installs uv automatically.
  pause
  exit /b 1
)

set "ACESTEP_API_HOST=127.0.0.1"
set "ACESTEP_API_PORT=8101"
set "ACESTEP_INIT_SERVICE=true"
set "ACESTEP_CONFIG_PATH=acestep-v15-turbo"
set "ACESTEP_LM_MODEL_PATH=acestep-5Hz-lm-0.6B"
set "ACESTEP_LM_BACKEND=pt"
set "ACESTEP_OFFLOAD_TO_CPU=true"
set "ACESTEP_OFFLOAD_DIT_TO_CPU=true"
set "ACESTEP_INIT_LLM=true"
set "ACESTEP_LM_OFFLOAD_TO_CPU=true"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$c=Get-NetTCPConnection -LocalPort 8101 -State Listen -ErrorAction SilentlyContinue; if($c){exit 0}else{exit 1}"
if not errorlevel 1 (
  echo ACE-Step API is already running.
  pause
  exit /b 0
)

echo ==========================================
echo ACE-Step 1.5 - Gina Singing API
echo ==========================================
echo API: %ACE_URL%
echo LM : acestep-5Hz-lm-0.6B
echo PyTorch backend: ON
echo CPU offload: ON
echo.
echo Starting ACE-Step REST API...
echo The first start may download the model files.
echo.

"%UV_EXE%" run --no-sync acestep-api --host 127.0.0.1 --port 8101 --init-llm --lm-model-path acestep-5Hz-lm-0.6B
if errorlevel 1 (
  echo.
  echo [ERROR] ACE-Step API exited with an error.
  echo If dependencies were not installed, run scripts\Install_ACEStep_Singing.bat again.
  pause
  exit /b 1
)
