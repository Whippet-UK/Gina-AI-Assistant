# v1.17.77 — AudioCraft Explicit Backend & Sequential Generation

## Problem
v1.17.76 correctly stopped Gina from counting the Hugging Face Hub cache as a second
model, but the model pipeline still needed clearer backend identity and stronger
protection against accidental network/cache resolution.

## Fix
- `server/music/MusicService.ts`
  - Managed `C:\\Gina_AI\\models\\audio\\facebook_<model>` is the only generation source.
  - Hub `models--facebook--...` directories are never a fallback and never count toward model size.
  - Generation records backend, weight files, local path, sequential lane, and network state.
  - Fixed initialization ordering so cache metadata is resolved before job telemetry uses it.
- `scripts/music_generator.py`
  - Prints the exact local model path and weight files used.
  - Enforces offline environment during generation and never downloads.
- `scripts/download_audiocraft.py`
  - Reuses a complete managed model without downloading again.
  - Keeps temporary HF cache metadata under the managed model directory.
- `src/components/MusicStudio.tsx`
  - Shows backend, weight filenames, managed path, and Hub-cache exclusion in the UI.
  - Download CTA explicitly says Generate never downloads.
- `server.ts`
  - `/api/music/status` reports backend, managed path, weight files, and duplicate-cache exclusion.
  - Existing external-job workflow inspector remains available for AudioCraft jobs.
- Version synchronized to `1.17.77`; previous restore point locked and new restore point active.

## Safety
AudioCraft generation remains serialized through one exclusive audio lane. Medium models
are not loaded concurrently with another AudioCraft model by Gina's generation queue.
