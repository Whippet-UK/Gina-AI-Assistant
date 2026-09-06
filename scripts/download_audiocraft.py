#!/usr/bin/env python3
"""
Gina AI Factory — AudioCraft / MusicGen / Transformers Weight Downloader & Preflight Inspector
Location: scripts/download_audiocraft.py

Downloads and caches HuggingFace AudioCraft / MusicGen / AudioGen models directly
to the local Hugging Face cache sandbox:
  C:\\Gina_AI\\models\\audio\\
  - facebook/musicgen-small (300M parameters)
  - facebook/musicgen-medium (1.5B parameters)
  - facebook/audiogen-medium (1.5B text-to-sound / SFX)
"""

import os
import sys
import argparse
import time

def parse_args():
    parser = argparse.ArgumentParser(description="Download & Cache AudioCraft / MusicGen weights")
    parser.add_argument("--model", type=str, default="facebook/musicgen-small",
                        choices=["facebook/musicgen-small", "facebook/musicgen-medium", "facebook/audiogen-medium"],
                        help="Model repo to cache")
    parser.add_argument("--output_dir", type=str, default="C:\\Gina_AI\\models\\audio",
                        help="Local storage directory for weights")
    parser.add_argument("--check_only", action="store_true",
                        help="Check if weights exist without downloading")
    return parser.parse_args()

def main():
    args = parse_args()
    model_name = args.model
    output_dir = os.path.abspath(args.output_dir)
    managed_dir = os.path.join(output_dir, model_name.replace("/", "_"))

    print(f"[AudioCraft Downloader] Target Model: {model_name}")
    print(f"[AudioCraft Downloader] Gina managed destination: {managed_dir}")

    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(managed_dir, exist_ok=True)

    # Keep all temporary Hugging Face cache metadata inside the managed model
    # directory. The parent C:\Gina_AI\models\audio folder must not receive
    # another `models--facebook--...` cache from Gina's downloader.
    local_hf_home = os.path.join(managed_dir, ".cache", "huggingface")
    os.makedirs(local_hf_home, exist_ok=True)
    os.environ["HF_HOME"] = local_hf_home
    os.environ["HF_HUB_CACHE"] = os.path.join(local_hf_home, "hub")
    os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
    hf_token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN") or None

    try:
        from huggingface_hub import snapshot_download
    except ImportError:
        print("[AudioCraft Downloader] 'huggingface_hub' is required in the active Gina environment.")
        print("[AudioCraft Downloader] Install with: pip install huggingface_hub")
        sys.exit(1)

    def is_complete_model(folder):
        if not os.path.isdir(folder):
            return False
        try:
            names = {n.lower() for n in os.listdir(folder)}
            if "config.json" not in names:
                return False
            if model_name == "facebook/audiogen-medium":
                return "state_dict.bin" in names and "compression_state_dict.bin" in names
            # MusicGen repositories may use pytorch_model.bin OR model.safetensors
            # (including sharded variants). Do not require one specific weight format.
            return any(
                n.endswith((".bin", ".safetensors", ".pt"))
                and os.path.getsize(os.path.join(folder, n)) > 200 * 1024 * 1024
                for n in names
                if os.path.isfile(os.path.join(folder, n))
            )
        except Exception:
            return False

    # Never redownload a complete managed model.
    if is_complete_model(managed_dir):
        print(f"[AudioCraft Downloader] COMPLETE managed model already present: {managed_dir}")
        sys.exit(0)

    if args.check_only:
        if is_complete_model(managed_dir):
            print(f"[AudioCraft Downloader] Cached managed model found: {managed_dir}")
            sys.exit(0)
        print(f"[AudioCraft Downloader] Weights NOT found for {model_name} in {managed_dir}")
        sys.exit(2)

    # IMPORTANT: use local_dir so Gina owns one authoritative copy. Do NOT use
    # cache_dir here; that creates models--facebook--... and duplicates the model.
    print(f"[AudioCraft Downloader] Downloading/resuming '{model_name}' into Gina's managed model directory...")
    start_time = time.time()
    try:
        snapshot_path = snapshot_download(
            repo_id=model_name,
            local_dir=managed_dir,
            token=hf_token
        )

        if not is_complete_model(managed_dir):
            raise RuntimeError(
                f"Model download completed but the managed model directory is incomplete: {managed_dir}"
            )

        print(f"[AudioCraft Downloader] SUCCESS: {model_name} managed locally at {snapshot_path} in {time.time() - start_time:.1f}s")
    except Exception as e:
        print(f"[AudioCraft Downloader] ERROR during managed model download/verification: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
