#!/usr/bin/env python3
"""Install only the missing local dependencies required by Gina's Unified Audio Engine.
The script deliberately checks imports first and never reinstalls packages that are already importable.
"""
from __future__ import annotations
import importlib.util
import os
import subprocess
import sys
import json
from pathlib import Path

REQUIRED = {
    # Keep this list deliberately tied to the exact imports used by the runtime.
    # coqui-tts 0.27.4+ no longer pulls PyTorch in automatically, and PyTorch 2.9+
    # may also require torchcodec for audio I/O.
    "torch": [sys.executable, "-m", "pip", "install", "torch", "torchaudio"],
    "torchcodec": [sys.executable, "-m", "pip", "install", "torchcodec"],
    "TTS": [sys.executable, "-m", "pip", "install", "coqui-tts"],
    "transformers": [sys.executable, "-m", "pip", "install", "transformers>=4.31"],
    "scipy": [sys.executable, "-m", "pip", "install", "scipy"],
    "pydub": [sys.executable, "-m", "pip", "install", "pydub"],
    "bark": [sys.executable, "-m", "pip", "install", "git+https://github.com/suno-ai/bark.git"],
}


def import_ok(module_name: str) -> tuple[bool, str]:
    try:
        if importlib.util.find_spec(module_name) is None:
            return False, "module not found"
        module = __import__(module_name)
        return True, str(getattr(module, "__file__", "built-in"))
    except Exception as exc:
        return False, str(exc)


def install(command: list[str]) -> None:
    env = os.environ.copy()
    env.setdefault("PIP_DISABLE_PIP_VERSION_CHECK", "1")
    env.setdefault("PYTHONUTF8", "1")
    subprocess.run([*command, "--disable-pip-version-check"], check=True, env=env)


def main() -> int:
    # A package can exist but still fail at import time because of a broken or
    # partially upgraded dependency. Treat that as missing so the repair pass
    # actually runs instead of only checking find_spec().
    broken: list[str] = []
    for name in REQUIRED:
        ok, detail = import_ok(name)
        if not ok:
            broken.append(name)
            print(f"[Unified Audio] {name} needs repair: {detail}")
    if broken:
        print("[Unified Audio] Repairing imports:", ", ".join(broken))
        # Torch must be available before Coqui/Bark are imported.
        order = [name for name in ("torch", "torchcodec", "TTS", "transformers", "scipy", "pydub", "bark") if name in broken]
        for name in order:
            print(f"[Unified Audio] Installing/repairing {name}...")
            install(REQUIRED[name])
    else:
        print("[Unified Audio] All required Python imports are already healthy.")

    config_path = Path(os.environ.get("GINA_ROOT", r"C:\Gina_AI")) / ".gina" / "audio_python.json"
    config_path.parent.mkdir(parents=True, exist_ok=True)
    config_path.write_text(json.dumps({"python": sys.executable}, indent=2), encoding="utf-8")
    print(f"[Unified Audio] Python interpreter: {sys.executable}")
    print(f"[Unified Audio] Saved interpreter binding: {config_path}")
    failed_imports: list[str] = []
    for name in REQUIRED:
        ok, detail = import_ok(name)
        if ok:
            print(f"[Unified Audio] OK {name}: {detail}")
        else:
            failed_imports.append(name)
            print(f"[Unified Audio] IMPORT ERROR {name}: {detail}", file=sys.stderr)

    if failed_imports:
        print("[Unified Audio] Dependency audit failed for: " + ", ".join(failed_imports), file=sys.stderr)
        return 2
    print("[Unified Audio] Dependency audit complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
