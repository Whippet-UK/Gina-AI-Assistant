# v1.17.76 — AudioCraft Single Managed Cache

## Problem
v1.17.75 accidentally mixed two model-storage strategies: Gina's managed
`facebook_musicgen-medium` directory and a Hugging Face `models--facebook--musicgen-medium`
cache. Generate could therefore populate a second ~14 GB Hub cache even though the
managed model was already installed. The dashboard also summed both directories,
reporting an inflated cache size such as 26.12 GB.

## Fix
- `server/music/MusicService.ts`
  - Treat `C:\Gina_AI\models\audio\facebook_<model>` as the authoritative model path.
  - If the managed directory exists, do not add the Hub cache to its size.
  - Refuse Generate when the managed model is missing instead of auto-downloading.
  - Pass the resolved local model path to the Python engine.
- `scripts/music_generator.py`
  - Load MusicGen from the explicit local path with `local_files_only=True`.
  - Load AudioGen from the explicit local AudioCraft checkpoint path.
  - Enable Hugging Face/Transformers offline mode during generation.
  - Never resolve `facebook/<repo>` over the network during Generate.
- `scripts/download_audiocraft.py`
  - Download directly into Gina's managed model directory using `local_dir`.
  - Recognize both `pytorch_model.bin` and `model.safetensors` MusicGen weight layouts.
  - Existing complete managed models are reused; no second Hub-cache copy is created.
- `src/components/MusicStudio.tsx`
  - Removed the misleading ~4.8 GB VRAM label.
  - Keeps sequential/exclusive AudioCraft generation messaging.
- Version synchronized to `1.17.76`.
- Previous restore point `RESTORE_V1.17.75_AUDIOCRAFT_LOCAL_CACHE_DASHBOARD` locked.
- Active restore point: `RESTORE_V1.17.76_AUDIOCRAFT_SINGLE_MANAGED_CACHE`.

## Existing duplicate cache
An already-created `models--facebook--musicgen-medium` directory is intentionally not
deleted by this update. It can be removed manually after confirming the managed model
works. The application no longer counts it when the managed model directory exists.
