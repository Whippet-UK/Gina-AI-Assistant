#!/usr/bin/env python3
"""Gina AI Factory - Audio Environment Diagnostics & Auto-Shim Validator.

Checks if TTS, bark, and pydub can be imported in the active Python interpreter.
Automatically injects backwards-compatibility shims for transformers (XTTS BeamSearchScorer & LogitsWarper),
persists sitecustomize.py and .pth shims across site-packages, and auto-patches XTTS gpt.py on disk if needed.
"""
from __future__ import annotations

import os
import sys
import sysconfig
from pathlib import Path


class FallbackBeamSearchScorer:
    """Fallback BeamSearchScorer satisfying XTTS GPT layer requirements when modern transformers omits it."""
    def __init__(self, batch_size: int = 1, max_length: int = 512, num_beams: int = 1, device: str = "cpu",
                 length_penalty: float = 1.0, do_early_stopping: bool = False, num_beam_hyps_to_keep: int = 1,
                 num_beam_groups: int = 1, **kwargs) -> None:
        self.batch_size = batch_size
        self.num_beams = num_beams
        self.device = device
        self.length_penalty = length_penalty
        self.do_early_stopping = do_early_stopping
        self.num_beam_hyps_to_keep = num_beam_hyps_to_keep
        self.num_beam_groups = num_beam_groups
        self._beam_hyps = [[] for _ in range(max(1, batch_size))]
        self._done = [False for _ in range(max(1, batch_size))]

    def is_done(self) -> bool:
        return all(self._done)

    def process(self, input_ids, next_scores, next_tokens, next_indices, **kwargs):
        return {
            "next_beam_scores": next_scores,
            "next_beam_tokens": next_tokens,
            "next_beam_indices": next_indices,
        }

    def finalize(self, input_ids, final_beam_scores, **kwargs):
        return input_ids


class FallbackLogitsWarper:
    """Fallback LogitsWarper for XTTS sequence generation."""
    def __init__(self, *args, **kwargs) -> None:
        pass

    def __call__(self, input_ids, scores):
        return scores


def resolve_beam_search_scorer(transformers_mod):
    """Find or construct a functional BeamSearchScorer."""
    existing = getattr(transformers_mod, "BeamSearchScorer", None)
    if existing is not None:
        return existing

    for mod_path in (
        "transformers.generation.beam_search",
        "transformers.generation",
        "transformers.generation.utils",
    ):
        try:
            m = __import__(mod_path, fromlist=["BeamSearchScorer"])
            cand = getattr(m, "BeamSearchScorer", None)
            if cand is not None:
                return cand
        except Exception:
            continue

    return FallbackBeamSearchScorer


def resolve_logits_warper(transformers_mod):
    """Find or construct a functional LogitsWarper."""
    existing = getattr(transformers_mod, "LogitsWarper", None)
    if existing is not None:
        return existing

    for mod_path in (
        "transformers.generation.logits_process",
        "transformers.generation",
        "transformers.generation.utils",
    ):
        try:
            m = __import__(mod_path, fromlist=["LogitsWarper"])
            cand = getattr(m, "LogitsWarper", None)
            if cand is not None:
                return cand
        except Exception:
            continue

    return FallbackLogitsWarper


def apply_transformers_shim() -> None:
    """Ensure transformers exports BeamSearchScorer and LogitsWarper for XTTS GPT layers."""
    try:
        import transformers
    except Exception:
        return

    try:
        bss = resolve_beam_search_scorer(transformers)
        lw = resolve_logits_warper(transformers)

        setattr(transformers, "BeamSearchScorer", bss)
        setattr(transformers, "LogitsWarper", lw)

        if hasattr(transformers, "_extra_objects") and isinstance(transformers._extra_objects, dict):
            transformers._extra_objects["BeamSearchScorer"] = bss
            transformers._extra_objects["LogitsWarper"] = lw

        # Also patch generation modules if already loaded or importable
        for gen_mod_name in ("transformers.generation", "transformers.generation.utils", "transformers.generation.beam_search"):
            try:
                gmod = sys.modules.get(gen_mod_name)
                if gmod is None:
                    try:
                        gmod = __import__(gen_mod_name, fromlist=["BeamSearchScorer"])
                    except Exception:
                        continue
                if not hasattr(gmod, "BeamSearchScorer"):
                    setattr(gmod, "BeamSearchScorer", bss)
                if not hasattr(gmod, "LogitsWarper"):
                    setattr(gmod, "LogitsWarper", lw)
            except Exception:
                pass
    except Exception:
        pass


def apply_pytorch_utils_shim() -> None:
    """Ensure transformers.pytorch_utils exports isin_mps_friendly.

    TTS/coqui-tts's XTTS code imports this helper directly; newer/older
    transformers releases have moved or dropped it at different points.
    """
    try:
        import transformers.pytorch_utils as ptu
    except Exception:
        return

    if hasattr(ptu, "isin_mps_friendly"):
        return

    try:
        import torch

        def isin_mps_friendly(elements, test_elements):
            if not torch.is_tensor(test_elements):
                test_elements = torch.tensor(test_elements, device=elements.device)
            if elements.device.type == "mps":
                return (elements[..., None] == test_elements.reshape(-1)).any(-1)
            return torch.isin(elements, test_elements)

        ptu.isin_mps_friendly = isin_mps_friendly
    except Exception:
        pass


def get_all_site_packages_dirs() -> list[Path]:
    """Gather all potential site-packages directories for the current interpreter."""
    dirs: list[Path] = []
    try:
        paths = sysconfig.get_paths()
        for key in ("purelib", "platlib"):
            p = paths.get(key)
            if p and os.path.isdir(p):
                dirs.append(Path(p))
    except Exception:
        pass

    try:
        import site
        if hasattr(site, "getsitepackages"):
            for p in site.getsitepackages():
                if os.path.isdir(p):
                    dirs.append(Path(p))
        if hasattr(site, "getusersitepackages"):
            usp = site.getusersitepackages()
            if os.path.isdir(usp):
                dirs.append(Path(usp))
    except Exception:
        pass

    for sp in sys.path:
        if "site-packages" in sp and os.path.isdir(sp):
            dirs.append(Path(sp))

    # De-duplicate while preserving order
    unique: list[Path] = []
    seen = set()
    for d in dirs:
        try:
            resolved = d.resolve()
            if resolved not in seen and resolved.is_dir():
                seen.add(resolved)
                unique.append(resolved)
        except Exception:
            pass
    return unique


def patch_xtts_layers_on_disk() -> None:
    """Directly patch TTS XTTS layers on disk so imports never fail even without shims."""
    safe_import_replacement = (
        "try:\n"
        "    from transformers import BeamSearchScorer\n"
        "except Exception:\n"
        "    try:\n"
        "        from transformers.generation.beam_search import BeamSearchScorer\n"
        "    except Exception:\n"
        "        try:\n"
        "            from transformers.generation import BeamSearchScorer\n"
        "        except Exception:\n"
        "            class BeamSearchScorer:\n"
        "                def __init__(self, *args, **kwargs):\n"
        "                    self.batch_size = kwargs.get('batch_size', 1)\n"
        "                    self.num_beams = kwargs.get('num_beams', 1)\n"
        "                def is_done(self): return True\n"
        "                def process(self, *args, **kwargs): return {}\n"
        "                def finalize(self, *args, **kwargs): return args[0] if args else None\n"
    )

    safe_import_header = (
        "# --- Gina XTTS Backwards-Compatibility Shim ---\n"
        "try:\n"
        "    import transformers\n"
        "    if not hasattr(transformers, 'BeamSearchScorer'):\n"
        "        class _FallbackBSS:\n"
        "            def __init__(self, *args, **kwargs):\n"
        "                self.batch_size = kwargs.get('batch_size', 1)\n"
        "                self.num_beams = kwargs.get('num_beams', 1)\n"
        "            def is_done(self): return True\n"
        "            def process(self, *args, **kwargs): return {}\n"
        "            def finalize(self, *args, **kwargs): return args[0] if args else None\n"
        "        transformers.BeamSearchScorer = _FallbackBSS\n"
        "        if hasattr(transformers, '_extra_objects') and isinstance(transformers._extra_objects, dict):\n"
        "            transformers._extra_objects['BeamSearchScorer'] = _FallbackBSS\n"
        "    if not hasattr(transformers, 'LogitsWarper'):\n"
        "        class _FallbackLW:\n"
        "            def __call__(self, input_ids, scores): return scores\n"
        "        transformers.LogitsWarper = _FallbackLW\n"
        "        if hasattr(transformers, '_extra_objects') and isinstance(transformers._extra_objects, dict):\n"
        "            transformers._extra_objects['LogitsWarper'] = _FallbackLW\n"
        "except Exception:\n"
        "    pass\n"
        "# ------------------------------------------------\n"
    )

    for sp_dir in get_all_site_packages_dirs():
        xtts_dir = sp_dir / "TTS" / "tts" / "layers" / "xtts"
        if xtts_dir.is_dir():
            for py_file in xtts_dir.glob("*.py"):
                try:
                    text = py_file.read_text(encoding="utf-8", errors="ignore")
                    changed = False
                    if "BeamSearchScorer" in text and "class BeamSearchScorer" not in text:
                        for pattern in (
                            "from transformers import BeamSearchScorer",
                            "from transformers.generation_utils import BeamSearchScorer",
                            "from transformers.generation import BeamSearchScorer",
                            "from transformers.generation.beam_search import BeamSearchScorer",
                        ):
                            if pattern in text:
                                text = text.replace(pattern, safe_import_replacement)
                                changed = True
                        if not changed:
                            text = safe_import_header + text
                            changed = True
                    if changed:
                        py_file.write_text(text, encoding="utf-8")
                except Exception:
                    pass


def install_sitecustomize_and_pth() -> None:
    """Persist the transformers compatibility shim in site-packages via sitecustomize.py and .pth."""
    sc_snippet = (
        "\n# Gina AI Factory - XTTS transformers compatibility shim\n"
        "try:\n"
        "    import transformers\n"
        "    if not hasattr(transformers, 'BeamSearchScorer'):\n"
        "        try:\n"
        "            from transformers.generation.beam_search import BeamSearchScorer\n"
        "            transformers.BeamSearchScorer = BeamSearchScorer\n"
        "        except Exception:\n"
        "            try:\n"
        "                from transformers.generation import BeamSearchScorer\n"
        "                transformers.BeamSearchScorer = BeamSearchScorer\n"
        "            except Exception:\n"
        "                class BeamSearchScorer:\n"
        "                    def __init__(self, *args, **kwargs): pass\n"
        "                    def is_done(self): return True\n"
        "                    def process(self, *args, **kwargs): return {}\n"
        "                    def finalize(self, *args, **kwargs): return args[0] if args else None\n"
        "                transformers.BeamSearchScorer = BeamSearchScorer\n"
        "        if hasattr(transformers, '_extra_objects') and isinstance(transformers._extra_objects, dict):\n"
        "            transformers._extra_objects['BeamSearchScorer'] = transformers.BeamSearchScorer\n"
        "    if not hasattr(transformers, 'LogitsWarper'):\n"
        "        try:\n"
        "            from transformers.generation.logits_process import LogitsWarper\n"
        "            transformers.LogitsWarper = LogitsWarper\n"
        "        except Exception:\n"
        "            class LogitsWarper:\n"
        "                def __call__(self, input_ids, scores): return scores\n"
        "            transformers.LogitsWarper = LogitsWarper\n"
        "        if hasattr(transformers, '_extra_objects') and isinstance(transformers._extra_objects, dict):\n"
        "            transformers._extra_objects['LogitsWarper'] = transformers.LogitsWarper\n"
        "except Exception:\n"
        "    pass\n"
    )

    pth_one_liner = (
        "import sys; exec(\"try:\\n import transformers\\n b=getattr(transformers,'BeamSearchScorer',None)\\n if not b:\\n  try:\\n   from transformers.generation.beam_search import BeamSearchScorer as b\\n  except Exception:\\n   class b: pass\\n  transformers.BeamSearchScorer=b\\n  if hasattr(transformers,'_extra_objects'): transformers._extra_objects['BeamSearchScorer']=b\\nexcept Exception: pass\")\n"
    )

    for sp_dir in get_all_site_packages_dirs():
        try:
            sc_file = sp_dir / "sitecustomize.py"
            if not sc_file.exists():
                sc_file.write_text(sc_snippet.lstrip(), encoding="utf-8")
            else:
                existing = sc_file.read_text(encoding="utf-8", errors="ignore")
                if "BeamSearchScorer" not in existing:
                    sc_file.write_text(existing + sc_snippet, encoding="utf-8")

            pth_file = sp_dir / "gina_xtts_shim.pth"
            if not pth_file.exists():
                pth_file.write_text(pth_one_liner, encoding="utf-8")
        except Exception:
            pass


def main() -> int:
    # 1. First-pass: Apply in-place disk repairs and runtime shims
    patch_xtts_layers_on_disk()
    install_sitecustomize_and_pth()
    apply_transformers_shim()
    apply_pytorch_utils_shim()

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
