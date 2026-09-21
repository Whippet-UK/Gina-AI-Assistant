import os
p = "C:\\Gina_AI\\Start_Factory.bat"
lines = [
    "@echo off",
    "cd /d C:\\Gina_AI",
    'start "Dashboard" cmd /k "g_env\\Scripts\\activate.bat && npm run dev"',
    "timeout /t 3 /nobreak >nul",
    "call g_env\\Scripts\\activate.bat",
    "python ComfyUI_windows_portable\\ComfyUI\\main.py --lowvram --fp8_e4m3fn-text-enc",
    "pause"
]
with open(p, "w", newline="\r\n") as f:
    f.write("\n".join(lines))
print("--- LAUNCHER REPAIRED SUCCESSFULLY ---")
