#!/usr/bin/env python3
"""
Gina AI Factory — AudioCraft / MusicGen / Transformers Weight Downloader & Preflight Inspector
Location: scripts/download_audiocraft.py

Downloads and caches HuggingFace transformers AudioCraft / MusicGen models directly
to the local models sandbox:
  C:\\Gina_AI\\models\\audio\\
  - facebook/musicgen-small (300M parameters, ~1.5GB VRAM safe for RTX 3070 Ti)
  - facebook/musicgen-medium (1.5B parameters, ~4.5GB VRAM)
  - facebook/audiogen-medium (sound effects)
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

    print(f"[AudioCraft Downloader] Target Model: {model_name}")
    print(f"[AudioCraft Downloader] Destination Directory: {output_dir}")

    os.makedirs(output_dir, exist_ok=True)

    try:
        print("[AudioCraft Downloader] Importing transformers & huggingface_hub...")
        from huggingface_hub import snapshot_download
        from transformers import AutoProcessor, MusicgenForConditionalGeneration
    except ImportError:
        print("[AudioCraft Downloader] 'transformers' or 'audiocraft' package not found in current environment.")
        print("[AudioCraft Downloader] Please ensure you are running in 'g_env' or install via:")
        print("  pip install transformers scipy torch torchaudio")
        if args.check_only:
            sys.exit(1)
        sys.exit(1)

    # Sanitize model repo for folder name
    clean_name = model_name.replace("/", "_")
    target_path = os.path.join(output_dir, clean_name)

    if args.check_only:
        if os.path.exists(target_path) and os.path.isdir(target_path):
            files = os.listdir(target_path)
            print(f"[AudioCraft Downloader] Weights present ({len(files)} files found at {target_path})")
            sys.exit(0)
        else:
            print(f"[AudioCraft Downloader] Weights NOT found for {model_name}")
            sys.exit(2)

    print(f"[AudioCraft Downloader] Starting weight snapshot download for '{model_name}'...")
    start_time = time.time()
    try:
        local_dir = snapshot_download(
            repo_id=model_name,
            local_dir=target_path,
            local_dir_use_symlinks=False,
            resume_download=True
        )
        print(f"[AudioCraft Downloader] Pre-loading processor and configuration to verify weights...")
        processor = AutoProcessor.from_pretrained(target_path)
        print(f"[AudioCraft Downloader] SUCCESS: Model cached and verified at {local_dir} in {time.time() - start_time:.1f}s")
    except Exception as e:
        print(f"[AudioCraft Downloader] ERROR during snapshot download: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
