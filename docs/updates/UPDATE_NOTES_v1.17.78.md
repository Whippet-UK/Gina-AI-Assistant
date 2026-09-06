# v1.17.78 — MusicGen Transformers Snapshot Routing

## Why
The installed `facebook_musicgen-medium` directory and the newly downloaded `models--facebook--musicgen-medium` directory are different checkpoint layouts. The latter contains the Transformers `model.safetensors` checkpoint that was actually fetched by the Generate path.

## Exact change
- `server/music/MusicService.ts`: MusicGen Medium resolves a completed local Hugging Face snapshot under `models--facebook--musicgen-medium/snapshots/*` when it contains a Transformers weight file. No Hub/network fallback is permitted.
- `server.ts`: exposes the resolved active local path.
- `src/components/MusicStudio.tsx`: labels the backend/path accurately and no longer says the selected HF snapshot is ignored.
- `src/version.ts`, `package.json`, `metadata.json`, `AGENTS.md`, `index.html`, `src/components/MilestoneChecklist.tsx`: version synchronized to 1.17.78; v1.17.77 locked; v1.17.78 active.

## Safety
Generate remains `HF_HUB_OFFLINE=1` / `TRANSFORMERS_OFFLINE=1`, and the MusicService audio lane remains exclusive/sequential. The existing 14 GB cache is not deleted or moved.
