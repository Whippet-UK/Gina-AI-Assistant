# v1.17.74 — AudioGen / MusicGen Model Separation & VRAM Metadata Fix

## Target files

### `/scripts/music_generator.py`
**Exact change:** Added a dedicated `facebook/audiogen-medium` branch using `audiocraft.models.AudioGen`; MusicGen continues to use `MusicgenForConditionalGeneration`.

**Why:** `facebook/audiogen-medium` is an AudioCraft AudioGen checkpoint, not a MusicGen checkpoint. Routing it through the MusicGen Transformers class was a model-type error.

### `/scripts/download_audiocraft.py`
**Exact change:** Removed the unconditional MusicGen Transformers import and split cache verification. AudioGen verifies `state_dict.bin` + `compression_state_dict.bin`; MusicGen verifies expected model tensor/index files.

### `/src/components/MusicStudio.tsx`
**Exact change:** Replaced `V5.5 SFX (AudioGen Atmosphere 1.5B)` with `AudioGen Medium 1.5B · SFX / Atmosphere`; selected-model labels and VRAM safety logging now identify AudioGen correctly.

### `/server.ts`
**Exact change:** Added `audiogen_medium` to pre-warm inventory and corrected Medium-model VRAM metadata to 16000 MB.

## Model distinction
- `facebook/musicgen-medium` — MusicGen Medium 1.5B: text-to-music.
- `facebook/audiogen-medium` — AudioGen Medium 1.5B: text-to-sound, SFX and ambience.

## VRAM note
Official AudioCraft documentation states that medium-sized ~1.5B AudioGen/MusicGen inference requires at least 16 GB GPU memory. This metadata is therefore no longer represented as a 4.8 GB model footprint.

## Preservation
The v1.17.73 MoviePy multimedia stitcher remains locked as the previous restore point.
