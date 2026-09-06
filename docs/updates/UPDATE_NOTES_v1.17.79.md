# v1.17.79 — MusicGen Snapshot Status Resolution

## Problem
The v1.17.78 MusicGen resolver could find the local Hugging Face snapshot for generation, while the dashboard backend/weight reporter still inspected the old `facebook_musicgen-medium` directory. This produced a false “Download required / WEIGHTS not detected” state even when `models--facebook--musicgen-medium\snapshots\<revision>\model.safetensors` was present.

## Changes
- `server/music/MusicService.ts`
  - `getModelBackend()` now inspects `getResolvedModelPath()` so telemetry describes the actual checkpoint Gina will load.
  - Snapshot discovery validates config + weight + processor/tokenizer files.
  - Completed safetensors snapshots are preferred when multiple local snapshots exist.
  - No network fallback is introduced.
- `src/components/MusicStudio.tsx`
  - Banner now exposes the resolved path in addition to backend and weight files.
- Version/restore-point metadata advanced to `1.17.79`. Previous MusicGen snapshot restore point is LOCKED; v1.17.79 is ACTIVE.

## Safety
- Do not delete either MusicGen directory until a successful local generation confirms the active snapshot.
- Generate remains offline and sequential for the 8 GB GPU target.
