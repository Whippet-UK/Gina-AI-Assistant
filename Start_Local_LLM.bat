@echo off
setlocal EnableDelayedExpansion

rem Timestamp helper: [YYYY-MM-DD HH:MM:SS]
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
rem Phase 42 / RESTORE_V1.20.16 — Local inference launcher (8GB RTX 3070 Ti)
rem Default engine: QWEN35 (early-fusion, no mmproj). KV cache forced to bf16 on Ampere.
set "LLAMA_ROOT=C:\Gina_AI\tools\llama.cpp"

if not exist "%LLAMA_ROOT%\llama-server.exe" (
  call :gina_echo [GINA] llama-server.exe not found in working installation folder:
  call :gina_echo %LLAMA_ROOT%\llama-server.exe
  pause
  exit /b 1
)

set "MODEL_ROOT=C:\Gina_AI\models\llm"
set "ENGINE=%~1"
if /I "%ENGINE%"=="" set "ENGINE=QWEN35"

set "CACHE_K=f16"
set "CACHE_V=f16"
set "PORT=8080"

if /I "%ENGINE%"=="QWEN" (
  set "MODEL=%MODEL_ROOT%\Qwen2.5-VL-7B-Instruct-Q4_K_M.gguf"
  set "MODEL_DESC=Qwen 2.5-VL 7B Instruct (Q4_K_M)"
  set "MMPROJ=%MODEL_ROOT%\mmproj-F16.gguf"
  set "GPU_LAYERS=28"
  set "CTX_SIZE=8192"
  set "CACHE_K=f16"
  set "CACHE_V=f16"
) else if /I "%ENGINE%"=="QWEN35" (
  set "ENGINE=QWEN3.5"
  set "MODEL=%MODEL_ROOT%\Qwen3.5-9B-Q4_K_M.gguf"
  set "MODEL_DESC=Qwen3.5 9B (Q4_K_M) — early-fusion standalone"
  set "MMPROJ="
  set "GPU_LAYERS=24"
  set "CTX_SIZE=8192"
  set "CACHE_K=bf16"
  set "CACHE_V=bf16"
) else if /I "%ENGINE%"=="QWEN-CODER" (
  set "ENGINE=QWEN-CODER"
  set "MODEL=%MODEL_ROOT%\qwen2.5-coder-7b-instruct-q5_k_m.gguf"
  set "MODEL_DESC=Qwen Coder 7B (Q5_K_M)"
  set "MMPROJ="
  set "GPU_LAYERS=28"
  set "CTX_SIZE=16384"
  set "CACHE_K=f16"
  set "CACHE_V=f16"
) else (
  call :gina_echo [GINA] Unsupported local LLM selector: %~1
  call :gina_echo [GINA] Options: QWEN, QWEN35, QWEN-CODER
  exit /b 2
)

if not exist "%MODEL%" (
  call :gina_echo [GINA] %ENGINE% model not found:
  call :gina_echo %MODEL%
  echo.
  pause
  exit /b 1
)

if defined MMPROJ if not exist "%MMPROJ%" (
  call :gina_echo [GINA] %ENGINE% model found but its multimodal projector is missing:
  call :gina_echo %MMPROJ%
  call :gina_echo [GINA] Continuing in text-only mode is not allowed for this vision profile.
  pause
  exit /b 1
)

call :gina_echo =========================================================================
call :gina_echo [GINA] Local AI Inference Server Launcher (Low-VRAM Baseline)
call :gina_echo [GINA] Engine: %ENGINE%
call :gina_echo [GINA] Model:  %MODEL_DESC%
call :gina_echo [GINA] File:   %MODEL%
call :gina_echo [GINA] Cache:  K=%CACHE_K% V=%CACHE_V%
call :gina_echo [GINA] API:    http://127.0.0.1:%PORT%
call :gina_echo =========================================================================

cd /d "%LLAMA_ROOT%"

if defined MMPROJ (
  call :gina_echo [GINA] Multimodal Vision Projector: %MMPROJ%
  call :gina_echo [GINA] Vision input: ENABLED
  "llama-server.exe" --model "%MODEL%" --mmproj "%MMPROJ%" --host 127.0.0.1 --port %PORT% --n-gpu-layers %GPU_LAYERS% --ctx-size %CTX_SIZE% --threads 6 --jinja --cache-type-k %CACHE_K% --cache-type-v %CACHE_V%
) else (
  call :gina_echo [GINA] Vision projector: not loaded (standalone / text-only profile)
  "llama-server.exe" --model "%MODEL%" --host 127.0.0.1 --port %PORT% --n-gpu-layers %GPU_LAYERS% --ctx-size %CTX_SIZE% --threads 6 --jinja --cache-type-k %CACHE_K% --cache-type-v %CACHE_V%
)
