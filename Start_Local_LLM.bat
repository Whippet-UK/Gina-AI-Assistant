@echo off
setlocal
set "LLAMA_ROOT=C:\Gina_AI\tools\llama.cpp"
set "MODEL=C:\Gina_AI\models\llm\gemma-3-12b-it-Q4_K_M.gguf"

if not exist "%LLAMA_ROOT%\llama-server.exe" (
  echo [GINA] llama-server.exe not found:
  echo %LLAMA_ROOT%\llama-server.exe
  pause
  exit /b 1
)
if not exist "%MODEL%" (
  echo [GINA] Gemma model not found:
  echo %MODEL%
  pause
  exit /b 1
)

echo [GINA] Starting Gemma 3 12B Q4_K_M with CUDA...
echo [GINA] 28 GPU layers ^| 8192 context ^| 6 CPU threads ^| embedded GGUF chat template ^| http://127.0.0.1:8080
set "MMPROJ="
for %%F in ("C:\Gina_AI\models\llm\*mmproj*.gguf") do if exist "%%~fF" if not defined MMPROJ set "MMPROJ=%%~fF"
if defined MMPROJ (
  echo [GINA] Vision projector detected: %MMPROJ%
  "%LLAMA_ROOT%\llama-server.exe" --model "%MODEL%" --mmproj "%MMPROJ%" --host 127.0.0.1 --port 8080 --n-gpu-layers 28 --ctx-size 8192 --threads 6 --jinja
) else (
  echo [GINA] No mmproj found; Local AI will run text-only.
  "%LLAMA_ROOT%\llama-server.exe" --model "%MODEL%" --host 127.0.0.1 --port 8080 --n-gpu-layers 28 --ctx-size 8192 --threads 6 --jinja
)
