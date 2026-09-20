#!/usr/bin/env python3
"""Gina AI Factory - Audio Environment Diagnostics & Auto-Shim Validator.

Checks if TTS, bark, and pydub can be imported in the active Python interpreter.
Automatically injects backwards-compatibility shims for transformers (XTTS BeamSearchScorer)
and writes sitecustomize.py to site-packages so all future Python invocations in this
virtualenv run without import errors.
"""
from __future__ import annotations

import os
import sys
import sysconfig
from pathlib import Path


def apply_transformers_shim() -> None:
    """Ensure transformers exports BeamSearchScorer and LogitsWarper for XTTS GPT layers."""
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
    except Exception:
        # If permissions prevent writing to site-packages, continue with runtime shim
        pass


def main() -> int:
    apply_transformers_shim()
    install_sitecustomize_shim()

    errors: list[str] = []
    imported_paths: list[str] = [sys.executable]

    for mod_name in ("TTS", "bark", "pydub"):
        try:
            mod = __import__(mod_name)
            if mod_name == "TTS":
                # Deep check XTTS layers specifically to verify gpt.py is sound
                from TTS.tts.layers.xtts.gpt import GPT  # noqa: F401
            imported_paths.append(str(getattr(mod, "__file__", mod_name)))
        except Exception as exc:
            errors.append(f"{mod_name}: {exc}")

    if errors:
        sys.stderr.write("Import check failed: " + " | ".join(errors) + "\n")
        return 1

    for line in imported_paths:
        sys.stdout.write(line + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
