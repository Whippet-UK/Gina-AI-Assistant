# Gina AI Factory v1.17.83

## MusicGen runtime hardening

### Fixed
- Corrected Windows model-directory normalization in `MusicService.getManagedModelPath()`.
- Corrected the PCM16 WAV writer to import PyTorch before converting generated tensors.
- Preserved offline/local-only MusicGen generation and local Hugging Face snapshot resolution.

### Expected result
- `/api/music/status` returns normally instead of HTTP 500 from the managed-path resolver.
- A successful MusicGen synthesis is written as a standard PCM16 WAV without requiring a torchaudio save backend.
- Existing local MusicGen Medium files are reused; no automatic network download is introduced.

Restore point: `RESTORE_V1.17.83_MUSICGEN_RUNTIME_HARDENING`
