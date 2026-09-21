---
name: media
description: >
  Media, video, and cinematic processing agents for the Gina AI Factory —
  resolution/VRAM budgeting, aspect-ratio conversion, watermark removal,
  temporal chunking, VFX keyframing, chromakey compositing, cross-scene
  continuity, backend health checks, and codec normalization.
version: 1.0
category: media
source: docs/agent_skills/Media
---

# Media, Video & Cinematic Processing Agents

## 11. Video Tiling & Pixel-Headspace Budgeting Sentinel
**What it is:** A preemptive memory-footprint calculator for video
generation.
**What it does:** Checks incoming generation specs against a fixed
393,216-pixel maximum (e.g. resolves to 512×768 or similar) before a job
is queued.
**Why it's needed:** Video models allocate memory aggressively; this keeps
requested dimensions inside the hardware safety cage and avoids driver
crashes.
**Implementation approach:** Calculate requested pixel area from width ×
height × frame count and cap it; e.g. hard-lock to 512×512 once frame
count approaches ~73.

## 12. Multi-Platform Aspect Ratio Blurred Sidebar Porter
**What it is:** An automated portrait/landscape canvas adapter.
**What it does:** Converts 16:9 clips to 9:16 by duplicating the track,
box-blurring a cropped/scaled copy as background, and centering the
original on top.
**Why it's needed:** Automates Shorts/portrait formatting without manual
editing.
**Implementation approach:** Headless FFmpeg filter graph, e.g.:
`[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=40:5[bg];[0:v]scale=1080:1920:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2`

## 13. CPU OpenCV Telea Watermark Inpainter
**What it is:** A model-free video watermark/logo removal utility.
**What it does:** Builds a binary mask from a user-configured corner
region and applies frame-by-frame Telea inpainting on CPU.
**Why it's needed:** Avoids spending VRAM on neural logo removal, keeping
GPU memory free for generation.
**Implementation approach:** Pure OpenCV — `cv2.VideoCapture` to read
frames, `cv2.inpaint(frame, mask, inpaintRadius, cv2.INPAINT_TELEA)` per
frame, mask scaled from normalized corner-rectangle coordinates.

## 14. Wan 2.1 Direct Temporal Frame Segmenter
**What it is:** A long-form video chunking manager.
**What it does:** Splits extended timelines into ≤3s chunks (max ~73
frames at 24fps).
**Why it's needed:** Keeps long generations inside VRAM limits by
producing them piece-by-piece.
**Implementation approach:** An orchestration calculator splits the target
duration into job items, carrying the final frame of each completed clip
forward as the seed image for the next chunk.

## 15. Dynamic VFX Keyframe Timeline Scheduler
**What it is:** A script-driven VFX automation module.
**What it does:** Generates keyframed parameters (shake amplitude, bloom,
chromatic aberration) timed to audio beats for the motion-physics
pipeline.
**Why it's needed:** Automates per-frame effect tuning instead of manual
keyframing.
**Implementation approach:** Build a time-step array where each effect
scalar (`intensity`, `aberration_px`, `shake_amplitude`) is driven by a
sine function or an explicit beat-timestamp list.

## 16. Green-Screen Chromakey Compositor Sentry
**What it is:** An automated chromakey blending linter.
**What it does:** Detects pure green backgrounds and composites overlay
tracks onto the primary timeline with cleaned-up edges.
**Why it's needed:** Default chromakeying leaves harsh borders on
low-resolution footage.
**Implementation approach:** FFmpeg chromakey filter tuned per source,
e.g. `chromakey=0x00FF00:0.15:0.1`, with similarity/blend values adjusted
based on probed frame quality.

## 17. Wan I2V Final-Frame Conditioning Director
**What it is:** A cross-scene visual continuity manager.
**What it does:** Extracts the last frame of a completed clip and feeds it
as the conditioning image for the next generation block.
**Why it's needed:** Keeps multi-scene stories visually continuous instead
of cutting abruptly.
**Implementation approach:** `ffmpeg -sseof -0.04 -i input.mp4 -frames:v 1
output.png`, then populate the next job's image-conditioning input with
that frame.

## 18. ComfyUI Watchdog Hysteresis Evaluator
**What it is:** A failure-tolerant backend monitor.
**What it does:** Requires two consecutive failed connection checks before
marking the backend offline.
**Why it's needed:** Avoids false "offline" flags from brief network blips
or normal model-loading delays.
**Implementation approach:** An interval-based counter increments on each
failed check and resets on success; the global online/offline flag only
flips once the counter crosses a threshold (e.g. 2).

## 19. RIFE Motion Slow-Motion Target Governor
**What it is:** An automated frame-interpolation target manager.
**What it does:** Switches between 2x and 4x RIFE interpolation based on
current GPU thermals.
**Why it's needed:** Keeps thermal load in check during heavy
interpolation passes.
**Implementation approach:** Poll GPU temperature via NVML; use 4x
interpolation while below a safe threshold (e.g. 60°C), drop to 2x above
it. (Coordinate with the Hardware Safeguards thermal governor rather than
duplicating its logic.)

## 20. Video Stream Codec & Color Channel Normalizer
**What it is:** A pre-flight video structure linter.
**What it does:** Confirms incoming clips are YUV420p / H.264 before
they're accepted into a processing pipeline.
**Why it's needed:** Catches incompatible containers/codecs before they
break timeline concatenation.
**Implementation approach:** `ffprobe -show_entries
stream=pix_fmt,codec_name -of json` and compare against the expected
profile; reject or transcode non-conforming files.

## Hardware / safety notes
Skills 11, 14, and 19 directly interact with the VRAM and thermal limits
enforced in `Hardware_Safeguards/skill.md` (7372 MB VRAM ceiling, 80°C
thermal cutoff). Those limits are authoritative — this module's budgeting
logic should defer to them rather than re-implement separate caps.
