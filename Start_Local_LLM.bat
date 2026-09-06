@echo off
setlocal EnableDelayedExpansion
set "LLAMA_ROOT=C:\Gina_AI\models\..\tools\llama.cpp"
if not exist "%LLAMA_ROOT%\llama-server.exe" set "LLAMA_ROOT=C:\Gina_AI\tools\llama.cpp"

if not exist "%LLAMA_ROOT%\llama-server.exe" (
  echo [GINA] llama-server.exe not found:
  echo %LLAMA_ROOT%\llama-server.exe
  pause
  exit /b 1
)

set "MODEL_ROOT=C:\Gina_AI\models\llm"

rem 1. Check for Qwen 2.5-VL 7B (Primary Ultra-Fast Vision-Language Model)
set "MODEL="
set "MODEL_DESC="
if exist "%MODEL_ROOT%\Qwen2.5-VL-7B-Instruct-Q4_K_M.gguf" (
  set "MODEL=%MODEL_ROOT%\Qwen2.5-VL-7B-Instruct-Q4_K_M.gguf"
  set "MODEL_DESC=Qwen 2.5-VL 7B Instruct (Q4_K_M ~35-45 t/s, 100%% GPU Offload)"
) else (
  for %%F in ("%MODEL_ROOT%\*qwen*2.5*vl*.gguf" "%MODEL_ROOT%\*qwen*.gguf") do (
    if not defined MODEL if exist "%%~fF" (
      set "MODEL=%%~fF"
      set "MODEL_DESC=Qwen Vision-Language Model (%%~nxF)"
    )
  )
)

rem 2. Fallback to Gemma 3 12B if Qwen is not present
if not defined MODEL (
  if exist "%MODEL_ROOT%\gemma-3-12b-it-Q4_K_M.gguf" (
    set "MODEL=%MODEL_ROOT%\gemma-3-12b-it-Q4_K_M.gguf"
    set "MODEL_DESC=Gemma 3 12B IT (Q4_K_M ~9-11 t/s, 28 GPU layers)"
  ) else (
    for %%F in ("%MODEL_ROOT%\*gemma*.gguf") do (
      if not defined MODEL if exist "%%~fF" (
        set "MODEL=%%~fF"
        set "MODEL_DESC=Gemma Model (%%~nxF)"
      )
    )
  )
)

rem 3. Generic fallback
if not defined MODEL (
  for %%F in ("%MODEL_ROOT%\*.gguf") do (
    if not defined MODEL if not "%%~nF"=="mmproj" (
      set "MODEL=%%~fF"
      set "MODEL_DESC=Local LLM (%%~nxF)"
    )
  )
)

if not defined MODEL (
  echo [GINA] No compatible GGUF model found in %MODEL_ROOT%
  echo Expected Qwen2.5-VL-7B-Instruct-Q4_K_M.gguf or gemma-3-12b-it-Q4_K_M.gguf
  pause
  exit /b 1
)

echo =========================================================================
echo [GINA] Local AI Inference Server Launcher
echo [GINA] Model: %MODEL_DESC%
echo [GINA] File:  %MODEL%
echo [GINA] Port:  http://127.0.0.1:8080
echo =========================================================================

rem Detect Multimodal Projector
set "MMPROJ="
if exist "%MODEL_ROOT%\mmproj-F16.gguf" (
  set "MMPROJ=%MODEL_ROOT%\mmproj-F16.gguf"
) else (
  for %%F in ("%MODEL_ROOT%\*mmproj*.gguf") do if exist "%%~fF" if not defined MMPROJ set "MMPROJ=%%~fF"
)

if defined MMPROJ (
  echo [GINA] Multimodal Vision Projector: %MMPROJ%
  echo [GINA] Starting with Vision Support (Image Inspection Active)...
  "%LLAMA_ROOT%\llama-server.exe" --model "%MODEL%" --mmproj "%MMPROJ%" --host 127.0.0.1 --port 8080 --n-gpu-layers 28 --ctx-size 8192 --threads 6 --jinja
) else (
  echo [GINA] No mmproj found; Local AI will run text-only mode.
  "%LLAMA_ROOT%\llama-server.exe" --model "%MODEL%" --host 127.0.0.1 --port 8080 --n-gpu-layers 28 --ctx-size 8192 --threads 6 --jinja
)
