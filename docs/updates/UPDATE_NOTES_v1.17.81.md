# Gina AI Factory v1.17.81

## MusicGen Medium — HF Snapshot Path Resolution Hardening

### Problem
The UI could still display `PATH: not resolved` even when a Hugging Face MusicGen Medium snapshot was present locally. The previous resolver used directory-entry checks that are unreliable for Windows symlink/junction-backed snapshot files.

### Fix
- Resolve MusicGen Medium snapshots using `fs.statSync()` so Windows-linked files are followed correctly.
- Check the Gina-managed HF cache under `C:\\Gina_AI\\models\\audio` first.
- Also check the standard Windows user HF cache as a local-only secondary location.
- Require config + tokenizer/processor + a real large Transformers weight file.
- Prefer a complete snapshot containing `model.safetensors`.
- Backend telemetry now follows the actual resolved files with `statSync()`.

### Offline guarantee
No Hub lookup or automatic download is introduced by this fix. Generate continues to pass the resolved local snapshot path to the Python loader with offline environment flags.

### Restore point
`RESTORE_V1.17.81_MUSICGEN_HF_PATH_HARDENING`
