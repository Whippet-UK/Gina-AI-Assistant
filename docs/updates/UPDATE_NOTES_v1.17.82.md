# Gina AI Factory v1.17.82

## MusicGen Medium — Generation Save + Status Hardening

### Fixed
- MusicGen Medium now successfully writes the generated WAV using a standard PCM16 WAV writer instead of relying on torchaudio's optional Windows save-backend dispatcher.
- This fixes the observed failure after successful 29.79s synthesis: `Couldn\'t find appropriate backend to handle uri ... .wav`.
- `/api/music/status` is now telemetry-safe: per-model filesystem issues are isolated and the endpoint no longer enters a repeating HTTP 500 loop.
- Windows/Hugging Face snapshot files are resolved with `statSync()` so linked snapshot entries are counted correctly.
- MusicGen Medium continues to prefer `model.safetensors` when both it and `pytorch_model.bin` are present, but only one representation is loaded.

### Runtime behaviour
- Model loading remains local-only/offline.
- AudioCraft work remains serialized through the single audio GPU lane.
- Medium models are still marked as 16 GB recommended VRAM; sequential execution does not reduce a model's peak VRAM requirement.

### Restore point
`RESTORE_V1.17.82_MUSICGEN_AUDIO_SAVE_STATUS_HARDENING`
