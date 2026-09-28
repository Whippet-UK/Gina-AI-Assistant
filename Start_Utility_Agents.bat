@echo off
setlocal EnableDelayedExpansion

goto :gina_main

:gina_ts
set "GINA_TS=%date% %time%"
set "GINA_TS=!GINA_TS: =0!"
exit /b 0

:gina_echo
call :gina_ts
echo [!GINA_TS!] %*
exit /b 0

:gina_main
rem =========================================================================
rem GINA — Utility Agent Pool (parallel ports; does NOT use 8080)
rem   8081  Qwen Coder 7B     — self-healing / code repair loops
rem   8082  Qwen 2.5-VL 7B    — visual diagnostics (+ mmproj-F16)
rem =========================================================================

set "LLAMA_ROOT=C:\Gina_AI\tools\llama.cpp"
set "MODEL_ROOT=C:\Gina_AI\models\llm"

if not exist "%LLAMA_ROOT%\llama-server.exe" (
  call :gina_echo [GINA] llama-server.exe not found:
  call :gina_echo %LLAMA_ROOT%\llama-server.exe
  pause
  exit /b 1
)

set "CODER_MODEL=%MODEL_ROOT%\qwen2.5-coder-7b-instruct-q5_k_m.gguf"
set "VISION_MODEL=%MODEL_ROOT%\Qwen2.5-VL-7B-Instruct-Q4_K_M.gguf"
set "VISION_MMPROJ=%MODEL_ROOT%\mmproj-F16.gguf"

if not exist "%CODER_MODEL%" (
  call :gina_echo [GINA] Coder model missing: %CODER_MODEL%
  pause
  exit /b 1
)
if not exist "%VISION_MODEL%" (
  call :gina_echo [GINA] Vision model missing: %VISION_MODEL%
  pause
  exit /b 1
)
if not exist "%VISION_MMPROJ%" (
  call :gina_echo [GINA] Vision mmproj missing: %VISION_MMPROJ%
  pause
  exit /b 1
)

cd /d "%LLAMA_ROOT%"

call :gina_echo =========================================================================
call :gina_echo [GINA] Utility Agent Pool
call :gina_echo [GINA] Coder  -^> http://127.0.0.1:8081
call :gina_echo [GINA] Vision -^> http://127.0.0.1:8082
call :gina_echo =========================================================================

start "Gina Utility — Qwen Coder :8081" cmd /k "cd /d "%LLAMA_ROOT%" && echo [%date% %time%] Starting Coder on :8081 && llama-server.exe --model "%CODER_MODEL%" --host 127.0.0.1 --port 8081 --n-gpu-layers 28 --ctx-size 16384 --threads 6 --jinja --cache-type-k f16 --cache-type-v f16"

timeout /t 2 /nobreak >nul

start "Gina Utility — Qwen 2.5-VL :8082" cmd /k "cd /d "%LLAMA_ROOT%" && echo [%date% %time%] Starting Vision on :8082 && llama-server.exe --model "%VISION_MODEL%" --mmproj "%VISION_MMPROJ%" --host 127.0.0.1 --port 8082 --n-gpu-layers 28 --ctx-size 8192 --threads 6 --jinja --cache-type-k f16 --cache-type-v f16"

call :gina_echo [GINA] Utility agents launched in separate windows.
call :gina_echo [GINA] Leave those windows open while repair / vision diagnostics run.
pause
