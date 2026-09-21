@echo off
title ComfyUI - Gina Backend

cd /d C:\Gina_AI

echo ==========================================
echo        COMFYUI - GINA BACKEND
echo ==========================================
echo.

if not exist "C:\Gina_AI\g_env\Scripts\activate.bat" (
    echo ERROR: Python environment not found.
    pause
    exit /b 1
)

if not exist "C:\Gina_AI\ComfyUI_windows_portable\ComfyUI\main.py" (
    echo ERROR: ComfyUI main.py not found.
    pause
    exit /b 1
)

call "C:\Gina_AI\g_env\Scripts\activate.bat"

echo Starting ComfyUI...
echo.

python "C:\Gina_AI\ComfyUI_windows_portable\ComfyUI\main.py" --lowvram --fp8_e4m3fn-text-enc

echo.
echo ComfyUI has stopped.
pause