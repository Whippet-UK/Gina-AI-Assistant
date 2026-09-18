@echo off
setlocal EnableDelayedExpansion

rem Phase 42: Rigidly lock LLAMA_ROOT directly to your new memory-optimized TurboQuant binary directory
set "LLAMA_ROOT=C:\Gina_AI\runtimes\turboquant"

if not exist "%LLAMA_ROOT%\llama-server.exe" (
  echo [GINA] llama-server.exe not found in turboquant runtime folder:
  echo %LLAMA_ROOT%\llama-server.exe
  pause
  exit /b 1
)

set "MODEL_ROOT=C:\Gina_AI\models\llm"
set "ENGINE=%~1"
if /I "%ENGINE%"=="" set "ENGINE=QWEN"

if /I "%ENGINE%"=="QWEN" (
  set "MODEL=%MODEL_ROOT%\Qwen2.5-VL-7B-Instruct-Q4_K_M.gguf"
  set "MODEL_DESC=Qwen 2.5-VL 7B Instruct (Q4_K_M)"
  set "MMPROJ=%MODEL_ROOT%\mmproj-F16.gguf"
  set "GPU_LAYERS=28"
  set "CTX_SIZE=8192"
) else if /I "%ENGINE%"=="QWEN35" (
  set "ENGINE=QWEN3.5"
  set "MODEL=%MODEL_ROOT%\Qwen3.5-9B-Q4_K_M.gguf"
  set "MODEL_DESC=Qwen3.5 9B (Q4_K_M)"
  if exist "%MODEL_ROOT%\mmproj-BF16.gguf" (
    set "MMPROJ=%MODEL_ROOT%\mmproj-BF16.gguf"
  ) else (
    set "MMPROJ="
    echo [GINA] No Qwen3.5-9B-matched mmproj-BF16.gguf found. Starting Qwen3.5 in text-only mode.
  )
  set "GPU_LAYERS=24"
  set "CTX_SIZE=8192"
) else if /I "%ENGINE%"=="QWEN-CODER" (
  set "ENGINE=QWEN-CODER"
  set "MODEL=%MODEL_ROOT%\qwen2.5-coder-7b-instruct-q5_k_m.gguf"
  set "MODEL_DESC=Qwen Coder 7B (Q5_K_M)"
  set "MMPROJ="
  set "GPU_LAYERS=28"
  set "CTX_SIZE=16384"
) else (
  echo [GINA] Unsupported local LLM selector: %~1
  echo [GINA] Options: QWEN, QWEN35, QWEN-CODER
  exit /b 2
)

if not exist "%MODEL%" (
  echo [GINA] %ENGINE% model not found:
  echo %MODEL%
  echo.
  pause
  exit /b 1
)

if defined MMPROJ if not exist "%MMPROJ%" (
  echo [GINA] %ENGINE% model found but its multimodal projector is missing:
  echo %MMPROJ%
  echo [GINA] Continuing in text-only mode is not allowed for this vision profile.
  pause
  exit /b 1
)

echo =========================================================================
echo [GINA] Local AI Inference Server Launcher (TurboQuant Accelerated)
echo [GINA] Engine: %ENGINE%
echo [GINA] Model:  %MODEL_DESC%
echo [GINA] File:   %MODEL%
echo [GINA] API:    http://127.0.0.1:8080/v1/chat/completions
echo =========================================================================

if defined MMPROJ (
  echo [GINA] Multimodal Vision Projector: %MMPROJ%
  echo [GINA] Vision input: ENABLED
  "%LLAMA_ROOT%\llama-server.exe" --model "%MODEL%" --mmproj "%MMPROJ%" --host 127.0.0.1 --port 8080 --n-gpu-layers %GPU_LAYERS% --ctx-size %CTX_SIZE% --threads 6 --jinja --cache-type-k turbo3 --cache-type-v turbo3
) else (
  echo [GINA] Vision projector: not loaded
  "%LLAMA_ROOT%\llama-server.exe" --model "%MODEL%" --host 127.0.0.1 --port 8080 --n-gpu-layers %GPU_LAYERS% --ctx-size %CTX_SIZE% --threads 6 --jinja --cache-type-k turbo3 --cache-type-v turbo3
)
