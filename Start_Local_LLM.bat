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
set "ENGINE=QWEN"

rem Qwen is the Gina default. Pass GEMMA as the first argument to select Gemma.
if /I "%~1"=="GEMMA" set "ENGINE=GEMMA"
if /I "%~1"=="QWEN" set "ENGINE=QWEN"

if /I "%ENGINE%"=="QWEN" (
  set "MODEL=%MODEL_ROOT%\Qwen2.5-VL-7B-Instruct-Q4_K_M.gguf"
  set "MODEL_DESC=Qwen 2.5-VL 7B Instruct (Q4_K_M)"
  set "MMPROJ=%MODEL_ROOT%\mmproj-F16.gguf"
) else (
  set "MODEL=%MODEL_ROOT%\gemma-3-12b-it-Q4_K_M.gguf"
  set "MODEL_DESC=Gemma 3 12B IT (Q4_K_M)"
  set "MMPROJ="
)

if not exist "%MODEL%" (
  echo [GINA] %ENGINE% model not found:
  echo %MODEL%
  echo.
  if /I "%ENGINE%"=="QWEN" echo Start_Local_LLM.bat GEMMA can be used as the fallback engine.
  pause
  exit /b 1
)

if /I "%ENGINE%"=="QWEN" if not exist "%MMPROJ%" (
  echo [GINA] Qwen model found but mmproj-F16.gguf is missing:
  echo %MMPROJ%
  echo [GINA] Qwen will start in text-only mode only if the server supports it.
  set "MMPROJ="
)

echo =========================================================================
echo [GINA] Local AI Inference Server Launcher
echo [GINA] Engine: %ENGINE%
echo [GINA] Model:  %MODEL_DESC%
echo [GINA] File:   %MODEL%
echo [GINA] API:    http://127.0.0.1:8080/v1/chat/completions
echo =========================================================================

if defined MMPROJ (
  echo [GINA] Multimodal Vision Projector: %MMPROJ%
  echo [GINA] Vision input: ENABLED
  "%LLAMA_ROOT%\llama-server.exe" --model "%MODEL%" --mmproj "%MMPROJ%" --host 127.0.0.1 --port 8080 --n-gpu-layers 28 --ctx-size 8192 --threads 6 --jinja
) else (
  echo [GINA] Vision projector: not loaded
  "%LLAMA_ROOT%\llama-server.exe" --model "%MODEL%" --host 127.0.0.1 --port 8080 --n-gpu-layers 28 --ctx-size 8192 --threads 6 --jinja
)
