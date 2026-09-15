# Gina AI Factory v1.17.59 — GIF Studio

## Native GIF Studio

New primary `GIF STUDIO` tab for local frame processing on the RTX 3070 Ti 8GB baseline.

### Pipeline

`Local asset / LTX source -> VHS Load Video or Load Images Path -> frame window -> optional RIFE_VFI -> VHS Video Combine -> GIF -> optional FFmpeg export`

### Local media

Files are stored under:

`C:\Gina_AI\media\gif_studio`

and mirrored to:

`C:\Gina_AI\ComfyUI_windows_portable\ComfyUI\input\gina_gif_studio`

MP4, MOV, WEBM, MKV, PNG, JPG/JPEG, WEBP and BMP are accepted. Multi-file image imports are grouped into a dedicated batch directory.

### RIFE

Smooth Animation is optional and defaults OFF so GIF Studio remains functional without a RIFE custom node. When enabled, the backend requires `RIFE_VFI` and reads the installed checkpoint choices from ComfyUI `/object_info`.

### Thermal / VRAM behaviour

GIF processing sends a ComfyUI `/free` request with `unload_models=true` before queueing. The thermal governor reads the existing local GPU telemetry and reduces output FPS when GPU temperature is above 60°C. The model pre-warm state is restored as an armed target after completion; it does not falsely claim that weights are resident in VRAM.

### Export

The ComfyUI pipeline creates an optimised GIF. The export endpoint can additionally burn meme text and create either:

- `.gif` using FFmpeg palette generation / paletteuse
- `.mp4` using H.264 CRF compression

### Live execution inspection

GIF Studio polls the existing Gina JobManager history and displays:

- current ComfyUI node
- node class
- node status
- resolved node inputs
- event stream
- resolved workflow JSON
- progress
- GPU temperature / VRAM

This is intentionally local-only.
