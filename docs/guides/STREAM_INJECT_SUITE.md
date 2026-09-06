# StreamInject v2.5 — Project Gina Pure Render Suite

## 🎯 Overview
**StreamInject v2.5** is an automated, headless, high-performance media processing and video post-production suite designed to operate completely independently of external video editing software (such as DaVinci Resolve or LTX). 

All timeline manipulation, canvas scaling, audio mixing, track flattening, chromakeying, and kinetic VFX run programmatically via **Python, OpenCV (`cv2`), NumPy, Pillow, and native FFmpeg hardware-accelerated executions**.

---

## 🛠️ System Architecture & Mandates

### 1. Zero Heavy Video Frameworks
All frame transformations and VFX matrices are calculated directly in NumPy/OpenCV or compiled into optimal multi-threaded FFmpeg `-filter_complex` graphs. No heavy MoviePy wrappers are used.

### 2. Cache Purge & Scratch File Lifecycle
- **Pre-Execution**: Programmatically scans and clears all `__pycache__` directories.
- **Post-Execution**: Pauses for 2 seconds to release OS file locks and purges all intermediate transcode fragments and scratch directories (`.streaminject_scratch`).

### 3. Audio Stream Safety Rule
- Every clip passed into the concatenation track is validated and normalized to **Stereo 48kHz** (`aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo`).
- If an overlay or video clip lacks audio, a silent audio track is synthesized using `anullsrc=r=48000:cl=stereo` to prevent timeline concat desync crashes.

### 4. Audio Peak Balancing (-0.95dB Hard Ceiling)
- The combined master audio track passes through an `alimiter` filter with a strict hard-limiting ceiling of `-0.95dB` (`alimiter=limit=-0.95dB:attack=5:release=50:asc=1`).

---

## 📱 Part 1: Kinetic Re-Map & VFX Matrix

The suite implements four real-time in-memory visual manipulation matrices:
1. **Glitch / Temporal Neon Flicker**: Drops frame opacity and brightness weights (factor 0.1–0.4) randomly across initial seconds to simulate an unstable neon lighting source.
2. **Kinetic Screen-Shake Rumble**: Applies random affine translation matrices (`cv2.warpAffine`) with `cv2.BORDER_REFLECT` boundary padding during asset entry thresholds.
3. **Ethereal Volumetric Bloom Glow**: Luminosity mask extraction isolating brightness > 200, followed by broad Gaussian convolution blur (`cv2.GaussianBlur`) and linear additive blending.
4. **Chromatic Aberration**: Squeezes Red (+4px) and Blue (-4px) color channels apart horizontally across NumPy index matrices before BGR reconstruction.

---

## 🚀 Part 2: Two-Pipeline Engine

### Pipeline 1: Master Hardcoded Render Pipeline
- **Backbone**: Intro Segment -> Main Gameplay Source -> Outro Segment.
- **Aspect Modes**: 
  - `original` (16:9 Widescreen)
  - `short` (9:16 Portrait 1080x1920 with automatic Gaussian blurred sidebars via `boxblur=40:5`).
- **Features**: Split start/end timestamps, green screen chromakey (`0x00FF00:0.1:0.2`), watermark positioning (`TL`, `TR`, `BL`, `BR`), subtitle burns, and master audio limiting.
- **Telemetry**: Writes execution metrics to `build_perf_log.md` (Total frames, runtime elapsed, render FPS).

### Pipeline 2: Intro & Outro Studio
- **Ready-Built Template**: 10-second looping MP4 asset combining all four kinetic effects over a radial dithered red background field capped strictly at `OUTRO_BG_RED_MAX=55`.
- **Blank Template Interactive Builder**: Step-by-step infinite constraint loop (Canvas size, text layers with bounce/flicker animations, background styles, audio tracks, watermarks, PiP at 35% viewport, video box safe-zone geometries with smart placement hints, and centered profile circle safe-zones).

---

## 💻 CLI Usage Examples

```bash
# Interactive Menu
python scripts/stream_inject.py

# Master Render (16:9 Widescreen)
python scripts/stream_inject.py render --gameplay gameplay.mp4 --intro intro.mp4 --outro outro.mp4 --output master.mp4

# Master Render (9:16 Shorts with Blurred Sidebars & Chromakey)
python scripts/stream_inject.py render --gameplay gameplay.mp4 --aspect short --chromakey cta_green.mp4 --output shorts_master.mp4

# Intro/Outro Studio (Ready-Built 10s Template)
python scripts/stream_inject.py studio --mode ready --output outro_ready.mp4

# Intro/Outro Studio (Interactive Builder)
python scripts/stream_inject.py studio --mode interactive --output custom_outro.mp4
```
