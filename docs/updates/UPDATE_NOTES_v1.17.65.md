# Gina AI Factory v1.17.65 — GIF Studio Sequential Story Execution

## Fixed

- GIF Studio was showing a duration such as 30 seconds while the LTX backend still generated only the short native source clip.
- Sequential Story prompts were stored by the UI but were never actually orchestrated by the backend.
- Finished GIF/MP4 results from the GIF Studio pipeline were not reliably returned to the GIF Studio preview.
- The preview could choose MP4 when GIF was selected because it always picked the first media output.

## Added

- A server-side `gif_story` job orchestrator.
- Safe LTX chunking at up to 5 seconds per generation block.
- Automatic final-frame extraction and LTX image-to-video handoff between blocks.
- Live parent-job node/event/progress forwarding for each ComfyUI child job.
- Per-block RIFE processing when the story RIFE option is enabled.
- Automatic concatenation into a continuous MP4 followed by GIF compilation.
- Long single-prompt durations now expand into sequential chunks automatically.
- GIF Studio preview selection now follows the GIF/MP4 toggle.
- Reference strength and image-noise controls.
- Stored story outputs are exposed through `/api/jobs/:id/output`.

## Architecture

Long-form output is streamed block-by-block rather than creating a one-hour latent. This keeps the generation path compatible with the RTX 3070 Ti 8GB VRAM target.

Project update files remain under `docs/updates/`; no new maintenance/update files are added to the project root.
