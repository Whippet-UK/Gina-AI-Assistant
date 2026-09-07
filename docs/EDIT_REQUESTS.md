# Gina AI Factory — Edit Requests

This file is the persistent human-to-agent work queue for project problems and requested changes.

## How to use

Add requests under **Open Requests**. Each request should describe the problem, expected behaviour, and any useful reproduction details. The local agent must read this file during project-context refresh before proposing or executing changes.

## Open Requests

<!-- Add new requests below this line. Do not delete unresolved requests. -->

## Completed Requests

<!-- Move completed requests here with the completion date and affected files. -->

### 2026-09-07 — Phase 36: Image Generation Speed, Preview Retention & Create Studio Fixes
1. **Local AI Slow Edit (559s), Exact Copy, and Cancel Button Lock**:
   - **Root Causes**:
     - The default workflow sampler was set to `dpmpp_2m_sde` (Stochastic Differential Equation), which computes noise twice per step and requires heavy GPU computation, taking 22.03s per iteration on low-VRAM configurations (totaling 559s). Switched to non-SDE `dpmpp_2m` with 20 steps, reducing generation time to 8–12 seconds.
     - Denoise was default 0.45 on the reference workflow, which only allowed subtle noise adjustments resulting in an almost identical image. Updated default edit denoise to 0.70 for clear creative modification while preserving compositional geometry.
     - A dropped ComfyUI WebSocket completion packet left jobs marked as `RUNNING` at 100% progress, locking the UI button to "CANCEL". Added authoritative `/history` reconciliation in `server.ts` and immediate 100% polling in `GenerationJobContext.tsx`.
   - **Affected Files**: `/server.ts`, `/workflows/sdxl_juggernaut.json`, `/workflows/sdxl_juggernaut_reference.json`, `/src/context/GenerationJobContext.tsx`.

2. **Create Studio Preview Unload & Missing Edit Options**:
   - **Root Causes**:
     - `PromptStudio.tsx` lacked fallback retention for raw output after job completion, causing the canvas to unload and hiding post-generation actions (`Keep Image`, `Vary Subtle`, `Vary Strong`).
     - `GinaImagePreview.tsx` only showed `activeOutput` and would blank the canvas if `activeOutput` temporarily reset.
     - Model selection defaulted to `flux_image` even when Juggernaut-XL was installed.
     - Generating without reference image at denoise < 1.0 would decode empty latent space into a flat beige image.
   - **Fixes Applied**:
     - Added `selectedHistoryUrl` and `lastCompletedImageUrl` in `PromptStudio.tsx` to retain image previews indefinitely.
     - Updated `displayImage` in `GinaImagePreview.tsx` to preserve `activeOutput || job?.preview` and keep the action bar active whenever an image is displayed.
     - Fixed default workflow routing to prefer `sdxl_juggernaut` (Juggernaut-XL v9 Photorealism).
     - Guarded `bound.denoise = hasRef ? denoise : 1.0` to eliminate blank beige images.
     - Auto-routes to `sdxl_juggernaut_reference` on `handleKeepImage` and supports image URL promotion.
   - **Affected Files**: `/src/components/PromptStudio.tsx`, `/src/components/gina-image/GinaImagePreview.tsx`, `/server.ts`.
