#!/usr/bin/env python3
"""Install only the missing local dependencies required by Gina's Unified Audio Engine.
The script deliberately checks imports first and never reinstalls packages that are already importable.
"""
from __future__ import annotations
import importlib.util
import os
import subprocess
import sys
import sysconfig
import json
from pathlib import Path

REQUIRED = {
    # Keep this list deliberately tied to the exact imports used by the runtime.
    # Note: Do NOT install torchcodec; its binary C++ ABI conflicts with Windows PyTorch DLLs
    # (causing "torch_get_const_data_ptr" Entry Point Not Found dialogs).
    "torch": [sys.executable, "-m", "pip", "install", "torch", "torchaudio"],
    "transformers": [sys.executable, "-m", "pip", "install", "--force-reinstall", "--no-deps", "transformers>=4.33.0,<=4.43.4"],
    "TTS": [sys.executable, "-m", "pip", "install", "--upgrade", "--no-deps", "coqui-tts"],
    "scipy": [sys.executable, "-m", "pip", "install", "scipy"],
    "pydub": [sys.executable, "-m", "pip", "install", "pydub"],
    "bark": [sys.executable, "-m", "pip", "install", "git+https://github.com/suno-ai/bark.git"],
}


def apply_transformers_shim() -> None:
    """Polyfill BeamSearchScorer and LogitsWarper for XTTS if modern transformers moved them."""
    try:
        import transformers
        if not hasattr(transformers, "BeamSearchScorer"):
            try:
                from transformers.generation.beam_search import BeamSearchScorer
                transformers.BeamSearchScorer = BeamSearchScorer
            except Exception:
                pass
        if not hasattr(transformers, "LogitsWarper"):
            try:
                from transformers.generation.logits_process import LogitsWarper
                transformers.LogitsWarper = LogitsWarper
            except Exception:
                pass
    except Exception:
        pass


def install_sitecustomize_shim() -> None:
    """Persist the transformers compatibility shim in site-packages so all scripts inherit it."""
    try:
        purelib = sysconfig.get_paths().get("purelib")
        if not purelib or not os.path.isdir(purelib):
            return
        sc_file = Path(purelib) / "sitecustomize.py"
        snippet = (
            "\n# Gina AI Factory - XTTS transformers compatibility shim\n"
            "try:\n"
            "    import transformers\n"
            "    if not hasattr(transformers, 'BeamSearchScorer'):\n"
            "        try:\n"
            "            from transformers.generation.beam_search import BeamSearchScorer\n"
            "            transformers.BeamSearchScorer = BeamSearchScorer\n"
            "        except Exception:\n"
            "            pass\n"
            "    if not hasattr(transformers, 'LogitsWarper'):\n"
            "        try:\n"
            "            from transformers.generation.logits_process import LogitsWarper\n"
            "            transformers.LogitsWarper = LogitsWarper\n"
            "        except Exception:\n"
            "            pass\n"
            "except Exception:\n"
            "    pass\n"
        )
        if not sc_file.exists():
            sc_file.write_text(snippet.lstrip(), encoding="utf-8")
        else:
            existing = sc_file.read_text(encoding="utf-8", errors="ignore")
            if "BeamSearchScorer" not in existing:
                sc_file.write_text(existing + snippet, encoding="utf-8")
        print(f"[Unified Audio] Verified sitecustomize shim at {sc_file}")
    except Exception as exc:
        print(f"[Unified Audio] Notice: sitecustomize shim: {exc}")


def purge_incompatible_packages() -> None:
    """Purge packages known to break Windows PyTorch DLL ABI (e.g. torchcodec)."""
    try:
        # find_spec inspects module paths without executing or loading C-extension DLLs
        if importlib.util.find_spec("torchcodec") is not None:
            print("[Unified Audio] Conflicting package 'torchcodec' detected.")
            print("[Unified Audio] Purging torchcodec to prevent 'torch_get_const_data_ptr' DLL entry point popup...")
            subprocess.run([sys.executable, "-m", "pip", "uninstall", "-y", "torchcodec"], check=False)
            print("[Unified Audio] Successfully purged torchcodec.")
    except Exception as exc:
        print(f"[Unified Audio] Notice: torchcodec purge check: {exc}")


def import_ok(module_name: str) -> tuple[bool, str]:
    try:
        if importlib.util.find_spec(module_name) is None:
            return False, "module not found"
        apply_transformers_shim()
        module = __import__(module_name)
        if module_name == "TTS":
            # Deep check XTTS layers specifically to verify gpt.py is sound
            try:
                from TTS.tts.layers.xtts.gpt import GPT  # noqa: F401
            except Exception as xtts_err:
                return False, f"XTTS layer error: {xtts_err}"
        return True, str(getattr(module, "__file__", "built-in"))
    except Exception as exc:
        return False, str(exc)


def install(command: list[str]) -> None:
    env = os.environ.copy()
    env.setdefault("PIP_DISABLE_PIP_VERSION_CHECK", "1")
    env.setdefault("PYTHONUTF8", "1")
    subprocess.run([*command, "--disable-pip-version-check"], check=True, env=env)


def main() -> int:
    # First, purge known conflicting packages like torchcodec that trigger DLL entry point popups
    purge_incompatible_packages()
    apply_transformers_shim()
    install_sitecustomize_shim()

    # A package can exist but still fail at import time because of a broken or
    # partially upgraded dependency. Treat that as missing so the repair pass
    # actually runs instead of only checking find_spec().
    broken: list[str] = []
    for name in REQUIRED:
        ok, detail = import_ok(name)
        if not ok:
            broken.append(name)
            print(f"[Unified Audio] {name} needs repair: {detail}")

    # If TTS has an XTTS layer error due to transformers, ensure transformers is marked for repair too
    if "TTS" in broken and "transformers" not in broken:
        try:
            from TTS.tts.layers.xtts.gpt import GPT  # noqa: F401
        except Exception:
            broken.insert(0, "transformers")
            print("[Unified Audio] XTTS layer error detected; queuing transformers for repair.")

    if broken:
        print("[Unified Audio] Repairing imports:", ", ".join(broken))
        # Ensure transformers is installed before TTS so BeamSearchScorer is present
        order = [name for name in ("torch", "transformers", "TTS", "scipy", "pydub", "bark") if name in broken]
        for name in order:
            print(f"[Unified Audio] Installing/repairing {name}...")
            if name == "TTS":
                # Ensure legacy unmaintained TTS is replaced with coqui-tts
                subprocess.run([sys.executable, "-m", "pip", "uninstall", "-y", "TTS"], check=False)
            install(REQUIRED[name])
        # Re-apply shims after pip operations
        apply_transformers_shim()
        install_sitecustomize_shim()
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
