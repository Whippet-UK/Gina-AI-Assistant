# Gina AI Factory v1.17.66 — LTX Story CUDA OOM Fix

## Problem
Sequential Story generation could fail on Scene 1 with `torch.OutOfMemoryError: Allocation on device`. The cause was a workflow binding collision: the story runner calculated a temporal frame count (for example, 121 frames for a 5-second 25 FPS chunk) and the generic workflow binding layer could place that value into an LTX `batch_size` input.

That asks ComfyUI for 121 independent samples instead of one 121-frame temporal sequence and can exhaust an RTX 3070 Ti's 8 GB VRAM immediately.

## Fix
- LTX story jobs now explicitly use `batch_size=1`.
- Temporal frame count stays on the LTX `frames`/`frame_count`/`length` control.
- The generic `batchSize` parser binding no longer aliases video temporal controls.
- A final defensive normalization forces LTX latent/video nodes with a `batch_size` input back to `1` immediately before execution.

## Expected behavior
A 5-second story block at 25 FPS is treated as one temporal sequence (121 temporal frames in the 8GB-safe chunking calculation), not a batch of 121 sequences. Longer story blocks are still split into safe sequential chunks.

## Important
This fix addresses the specific OOM shown in the Gina log. If a corrected single 5-second scene still OOMs, the next diagnostic is the resolved workflow JSON and the actual LTX node/resolution/precision settings; do not increase batch size.
