@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Gina AI Factory - Audio Engine Repair

set "GINA_ROOT=C:\Gina_AI"
cd /d "%GINA_ROOT%"

echo ===================================================
echo    GINA AI FACTORY - AUDIO ENGINE REPAIR SCRIPT
echo ===================================================
echo.

if not exist "%GINA_ROOT%\g_env\Scripts\activate.bat" (
  echo [ERROR] Gina virtual environment not found at:
  echo         %GINA_ROOT%\g_env
  echo.
  pause
  exit /b 1
)

echo [1/4] Activating Gina Python environment...
call "%GINA_ROOT%\g_env\Scripts\activate.bat"
if exist "%GINA_ROOT%\g_env\Lib\site-packages\gina_xtts_shim.pth" (
  del /f /q "%GINA_ROOT%\g_env\Lib\site-packages\gina_xtts_shim.pth" 2>nul
)

echo.
echo [2/4] Removing conflicting torchcodec / deprecated TTS...
python -m pip uninstall -y torchcodec TTS

echo.
echo [3/4] Installing verified transformers 4.44.2 and coqui-tts...
REM coqui-tts's own metadata requires transformers^>=4.57, which does not
REM contain the isin_mps_friendly/BeamSearchScorer symbols XTTS actually
REM needs. Installing it with --no-deps stops pip's resolver from silently
REM upgrading transformers back past 4.4x and undoing the pin below.
python -m pip install "transformers==4.44.2" pydub scipy
python -m pip install --no-deps coqui-tts
python -m pip install "transformers==4.44.2"

echo.
echo [4/4] Applying XTTS backwards-compatibility shims and disk patches...
python scripts\setup_audio_deps.py

echo.
echo ===================================================
if errorlevel 1 (
  echo [WARNING] Dependency repair encountered an issue.
  echo Please review the output above.
) else (
  echo [SUCCESS] Audio engine environment repaired successfully!
  echo All required packages (TTS, bark, pydub) are now operational.
  echo.
  echo You can now restart Start_Factory.bat.
)
echo ===================================================
echo.
pause
