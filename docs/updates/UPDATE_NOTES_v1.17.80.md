# v1.17.81 — MusicGen dual-weight snapshot resolution

## What changed
- MusicGen Medium local Hugging Face snapshots are allowed to contain both `model.safetensors` and `pytorch_model.bin`.
- The resolver treats them as alternate representations of the same checkpoint and prefers `model.safetensors` for Transformers loading.
- Cache size telemetry no longer sums both large weight formats. It reports the active preferred weight plus metadata.
- The API now exposes the local snapshot revision and matching `refs` entries so the source revision is visible.
- Generation remains offline/local-only and receives the exact resolved snapshot path.
- The UI no longer claims that sequential execution makes Medium “8GB VRAM Safe”; it now states that the GPU lane is sequential.

## Why the snapshot can contain both
The Hugging Face `facebook/musicgen-medium` `refs/pr/10` tree contains both `model.safetensors` and `pytorch_model.bin`, each about 8.04 GB. The safetensors file was added as a conversion variant; it is an alternative serialization of the same model weights. Hugging Face cache snapshots mirror the revision tree, so a cached PR/revision can therefore contain both files.

## Restore point
`RESTORE_V1.17.81_MUSICGEN_DUAL_WEIGHT_RESOLUTION`
