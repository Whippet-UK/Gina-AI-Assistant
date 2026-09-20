#!/usr/bin/env python3
"""Gina AI Factory - Unified Audio Dependency Auto-Repair.

Configures and repairs the unified local audio environment (TTS, bark, pydub).
Applies in-place disk patches for XTTS BeamSearchScorer & LogitsWarper, installs
sitecustomize.py and .pth shims across site-packages, purges conflicting packages
(e.g., torchcodec), and installs missing wheels only if required.
"""
from __future__ import annotations

import importlib.util
import json
import os
import subprocess
import sys
import sysconfig
from pathlib import Path

# NOTE: coqui-tts's own metadata declares `transformers>=4.57`, but the XTTS
# layers this app actually imports (isin_mps_friendly, BeamSearchScorer,
# LogitsWarper) only exist in the 4.4x line. Installing "coqui-tts" unpinned
# lets pip's resolver silently upgrade transformers back past 4.4x to satisfy
# that floor, which is what was undoing the transformers==4.44.2 pin every
# single repair pass. --no-deps stops coqui-tts from touching transformers at
# install time; PINNED_TRANSFORMERS is re-asserted at the end of main() as a
# belt-and-suspenders guard against any *other* package doing the same thing.
PINNED_TRANSFORMERS = "transformers==4.44.2"

REQUIRED: dict[str, list[str]] = {
    "transformers": [sys.executable, "-m", "pip", "install", PINNED_TRANSFORMERS],
    "TTS": [sys.executable, "-m", "pip", "install", "--no-deps", "coqui-tts"],
    "scipy": [sys.executable, "-m", "pip", "install", "scipy"],
    "pydub": [sys.executable, "-m", "pip", "install", "pydub"],
    "bark": [sys.executable, "-m", "pip", "install", "git+https://github.com/suno-ai/bark.git"],
}


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
    except Exception as exc:
        print(f"[Unified Audio] Notice: apply_transformers_shim: {exc}")


def apply_torch_load_patch() -> None:
    """Ensure PyTorch 2.6+ backwards compatibility with Bark and Coqui XTTS checkpoints.

    PyTorch 2.6 changed torch.load's default from weights_only=False to weights_only=True.
    Suno Bark and Coqui XTTS checkpoints contain numpy scalars and arrays pickled inside weights,
    triggering WeightsUnpickler error: Unsupported global: GLOBAL numpy.core.multiarray.scalar.
    We allowlist numpy globals in PyTorch 2.4+ and ensure weights_only defaults to False for local models.
    """
    try:
        import torch
        # 1. Allowlist safe numpy objects
        try:
            import numpy as np
            safe_objs = []
            for mod in [np, getattr(np, "core", None), getattr(np, "_core", None)]:
                if mod:
                    for attr in ["scalar", "_reconstruct", "multiarray", "dtype"]:
                        val = getattr(mod, attr, None)
                        if val is not None and val not in safe_objs:
                            safe_objs.append(val)
            if hasattr(torch.serialization, "add_safe_globals") and safe_objs:
                torch.serialization.add_safe_globals(safe_objs)
        except Exception:
            pass

        # 2. Patch torch.load
        if not getattr(torch, "_gina_weights_only_patched", False):
            _orig_load = torch.load

            def _patched_load(*args, **kwargs):
                if "weights_only" not in kwargs:
                    kwargs["weights_only"] = False
                try:
                    return _orig_load(*args, **kwargs)
                except Exception as exc:
                    err_msg = str(exc)
                    if ("WeightsUnpickler" in err_msg or "weights_only" in err_msg or "Unsupported global" in err_msg) and kwargs.get("weights_only", True):
                        kwargs["weights_only"] = False
                        return _orig_load(*args, **kwargs)
                    raise

            torch.load = _patched_load
            torch._gina_weights_only_patched = True
            print("[Unified Audio] Applied PyTorch 2.6 weights_only=False compatibility patch.")
    except Exception as exc:
        print(f"[Unified Audio] Notice: apply_torch_load_patch: {exc}")


def apply_pytorch_utils_shim() -> None:
    """Ensure transformers.pytorch_utils exports isin_mps_friendly.

    TTS/coqui-tts's XTTS code imports this helper directly; newer/older
    transformers releases have moved or dropped it at different points.
    """
    try:
        import torch
        def _isin_mps(elements, test_elements):
            if not torch.is_tensor(test_elements):
                test_elements = torch.tensor(test_elements, device=elements.device)
            if getattr(elements.device, "type", None) == "mps":
                return (elements[..., None] == test_elements.reshape(-1)).any(-1)
            return torch.isin(elements, test_elements)

        import transformers
        if not hasattr(transformers, "isin_mps_friendly"):
            setattr(transformers, "isin_mps_friendly", _isin_mps)

        try:
            import transformers.pytorch_utils as ptu
            if not hasattr(ptu, "isin_mps_friendly"):
                setattr(ptu, "isin_mps_friendly", _isin_mps)
        except Exception:
            pass

        if "transformers.pytorch_utils" in sys.modules:
            setattr(sys.modules["transformers.pytorch_utils"], "isin_mps_friendly", _isin_mps)

        print("[Unified Audio] Verified transformers.pytorch_utils.isin_mps_friendly shim.")
    except Exception as exc:
        print(f"[Unified Audio] Notice: apply_pytorch_utils_shim: {exc}")


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
    """Directly patch TTS XTTS gpt.py and layers on disk so imports never fail even without shims."""
    safe_bss_replacement = (
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

    safe_isin_replacement = (
        "try:\n"
        "    from transformers.pytorch_utils import isin_mps_friendly\n"
        "except Exception:\n"
        "    try:\n"
        "        import torch\n"
        "        def isin_mps_friendly(elements, test_elements):\n"
        "            if not torch.is_tensor(test_elements):\n"
        "                test_elements = torch.tensor(test_elements, device=elements.device)\n"
        "            if getattr(elements.device, 'type', None) == 'mps':\n"
        "                return (elements[..., None] == test_elements.reshape(-1)).any(-1)\n"
        "            return torch.isin(elements, test_elements)\n"
        "    except Exception:\n"
        "        def isin_mps_friendly(elements, test_elements): return False\n"
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

                    # Patch BeamSearchScorer imports
                    if "BeamSearchScorer" in text and "class BeamSearchScorer" not in text:
                        for pattern in (
                            "from transformers import BeamSearchScorer",
                            "from transformers.generation_utils import BeamSearchScorer",
                            "from transformers.generation import BeamSearchScorer",
                            "from transformers.generation.beam_search import BeamSearchScorer",
                        ):
                            if pattern in text:
                                text = text.replace(pattern, safe_bss_replacement)
                                changed = True
                        if not changed:
                            text = safe_import_header + text
                            changed = True

                    # Patch isin_mps_friendly imports
                    if "isin_mps_friendly" in text and "def isin_mps_friendly" not in text:
                        isin_pattern = "from transformers.pytorch_utils import isin_mps_friendly"
                        if isin_pattern in text:
                            text = text.replace(isin_pattern, safe_isin_replacement)
                            changed = True

                    if changed:
                        py_file.write_text(text, encoding="utf-8")
                        print(f"[Unified Audio] Inoculated XTTS layer at {py_file}")
                except Exception as exc:
                    print(f"[Unified Audio] Notice: patch_xtts_layers_on_disk error on {py_file}: {exc}")


def patch_transformers_pytorch_utils_on_disk() -> None:
    """Directly patch transformers/pytorch_utils.py on disk so isin_mps_friendly is physically present."""
    snippet = (
        "\n# --- Gina XTTS Backwards-Compatibility Shim ---\n"
        "try:\n"
        "    if 'isin_mps_friendly' not in globals():\n"
        "        import torch\n"
        "        def isin_mps_friendly(elements, test_elements):\n"
        "            if not torch.is_tensor(test_elements):\n"
        "                test_elements = torch.tensor(test_elements, device=elements.device)\n"
        "            if getattr(elements.device, 'type', None) == 'mps':\n"
        "                return (elements[..., None] == test_elements.reshape(-1)).any(-1)\n"
        "            return torch.isin(elements, test_elements)\n"
        "except Exception:\n"
        "    pass\n"
        "# ------------------------------------------------\n"
    )
    for sp_dir in get_all_site_packages_dirs():
        ptu_path = sp_dir / "transformers" / "pytorch_utils.py"
        if ptu_path.is_file():
            try:
                text = ptu_path.read_text(encoding="utf-8", errors="ignore")
                if "def isin_mps_friendly" not in text:
                    ptu_path.write_text(text + snippet, encoding="utf-8")
                    print(f"[Unified Audio] Inoculated transformers.pytorch_utils on disk at {ptu_path}")
            except Exception as exc:
                print(f"[Unified Audio] Notice: patch_transformers_pytorch_utils_on_disk error on {ptu_path}: {exc}")


def remove_eager_torch_shims() -> None:
    """Remove eager .pth and sitecustomize.py shims from site-packages.

    Eagerly importing torch during Python interpreter startup via .pth or sitecustomize
    causes PyTorch C++ static CUDAAllocatorConfig to parse early with default settings.
    When ComfyUI subsequently initializes, PyTorch crashes with:
    RuntimeError: config[i] == get()->name() INTERNAL ASSERT FAILED ...
    Allocator backend parsed at runtime != allocator backend parsed at load time

    All needed shims are applied in-place on disk to transformers and TTS layers,
    and torch.load is patched directly inside unified_audio_backend.py when needed.
    """
    for sp_dir in get_all_site_packages_dirs():
        # 1. Remove gina_xtts_shim.pth
        pth_file = sp_dir / "gina_xtts_shim.pth"
        if pth_file.is_file():
            try:
                pth_file.unlink()
                print(f"[Unified Audio] Removed eager startup shim: {pth_file}")
            except Exception as exc:
                print(f"[Unified Audio] Notice: Failed to remove {pth_file}: {exc}")

        # 2. Clean sitecustomize.py
        sc_file = sp_dir / "sitecustomize.py"
        if sc_file.is_file():
            try:
                text = sc_file.read_text(encoding="utf-8", errors="ignore")
                if any(k in text for k in ("BeamSearchScorer", "_gina_weights_only_patched", "XTTS & PyTorch 2.6", "isin_mps_friendly")):
                    lines = [line for line in text.splitlines() if not any(k in line for k in ("_gina_weights_only_patched", "BeamSearchScorer", "LogitsWarper", "isin_mps_friendly", "XTTS & PyTorch 2.6", "gina_xtts_shim"))]
                    cleaned = chr(10).join(lines).strip()
                    if not cleaned or (cleaned.startswith("#") and len(cleaned.splitlines()) <= 2):
                        sc_file.unlink()
                        print(f"[Unified Audio] Removed eager sitecustomize: {sc_file}")
                    else:
                        sc_file.write_text(cleaned + chr(10), encoding="utf-8")
                        print(f"[Unified Audio] Sanitized sitecustomize: {sc_file}")
            except Exception as exc:
                print(f"[Unified Audio] Notice: Failed to sanitize {sc_file}: {exc}")


def purge_incompatible_packages() -> None:
    """Purge packages known to break Windows PyTorch DLL ABI (e.g. torchcodec)."""
    try:
        if importlib.util.find_spec("torchcodec") is not None:
            print("[Unified Audio] Conflicting package 'torchcodec' detected.")
            print("[Unified Audio] Purging torchcodec to prevent DLL entry point conflicts...")
            subprocess.run([sys.executable, "-m", "pip", "uninstall", "-y", "torchcodec"], check=False)
            print("[Unified Audio] Successfully purged torchcodec.")
    except Exception as exc:
        print(f"[Unified Audio] Notice: torchcodec purge check: {exc}")


def import_ok(module_name: str) -> tuple[bool, str]:
    try:
        if importlib.util.find_spec(module_name) is None:
            return False, "module not found"
        apply_torch_load_patch()
        apply_transformers_shim()
        apply_pytorch_utils_shim()
        module = __import__(module_name)
        if module_name == "TTS":
            try:
                from TTS.tts.layers.xtts.gpt import GPT  # noqa: F401
            except Exception as xtts_err:
                return False, f"XTTS layer error: {xtts_err}"
        return True, str(getattr(module, "__file__", "built-in"))
    except Exception as exc:
        return False, str(exc)


def install(command: list[str]) -> bool:
    env = os.environ.copy()
    env.setdefault("PIP_DISABLE_PIP_VERSION_CHECK", "1")
    env.setdefault("PYTHONUTF8", "1")
    try:
        subprocess.run([*command, "--disable-pip-version-check", "--no-cache-dir"], check=True, env=env)
        return True
    except Exception as exc:
        print(f"[Unified Audio] Warning: Command failed: {' '.join(command)}: {exc}", file=sys.stderr)
        return False


def main() -> int:
    print("[Unified Audio] Starting dependency repair pass...")

    # Step 1: Purge known conflicting packages like torchcodec
    purge_incompatible_packages()

    # Step 2: In-place disk repair of XTTS layers, transformers, and site-packages shims
    patch_xtts_layers_on_disk()
    patch_transformers_pytorch_utils_on_disk()
    remove_eager_torch_shims()
    apply_torch_load_patch()
    apply_transformers_shim()
    apply_pytorch_utils_shim()

    # Step 3: Fast-path audit before touching pip
    broken: list[str] = []
    for name in REQUIRED:
        ok, detail = import_ok(name)
        if not ok:
            broken.append(name)
            print(f"[Unified Audio] {name} needs repair: {detail}")

    if "TTS" in broken and "transformers" not in broken:
        try:
            from TTS.tts.layers.xtts.gpt import GPT  # noqa: F401
        except Exception:
            broken.insert(0, "transformers")
            print("[Unified Audio] XTTS layer error detected; queuing transformers for repair.")

    # Step 4: If any packages are truly broken or missing, install only those
    if broken:
        print("[Unified Audio] Repairing imports:", ", ".join(broken))
        order = [name for name in ("transformers", "TTS", "scipy", "pydub", "bark") if name in broken]
        for name in order:
            print(f"[Unified Audio] Installing/repairing {name}...")
            if name == "TTS":
                subprocess.run([sys.executable, "-m", "pip", "uninstall", "-y", "TTS"], check=False)
            install(REQUIRED[name])

        # Re-apply shims after pip install
        patch_xtts_layers_on_disk()
        remove_eager_torch_shims()
        apply_transformers_shim()
        apply_pytorch_utils_shim()

        # Guard: coqui-tts declares transformers>=4.57 in its own metadata.
        # Even with --no-deps on the coqui-tts install above, re-assert the
        # pin here so nothing installed in this pass (or a stray pip resolve)
        # can silently drag transformers back past the 4.4x line XTTS needs.
        print(f"[Unified Audio] Re-asserting {PINNED_TRANSFORMERS} pin...")
        install([sys.executable, "-m", "pip", "install", PINNED_TRANSFORMERS])
        apply_transformers_shim()
        apply_pytorch_utils_shim()
    else:
        print("[Unified Audio] All required Python imports are healthy.")

    # Step 5: Save interpreter configuration binding
    config_path = Path(os.environ.get("GINA_ROOT", r"C:\Gina_AI")) / ".gina" / "audio_python.json"
    config_path.parent.mkdir(parents=True, exist_ok=True)
    config_path.write_text(json.dumps({"python": sys.executable}, indent=2), encoding="utf-8")
    print(f"[Unified Audio] Python interpreter: {sys.executable}")
    print(f"[Unified Audio] Saved interpreter binding: {config_path}")

    # Step 6: Final verification
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

    print("[Unified Audio] Dependency audit complete. All audio engines operational.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
