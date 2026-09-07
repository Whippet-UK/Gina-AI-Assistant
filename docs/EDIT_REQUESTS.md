# Gina AI Factory — Edit Requests

This file is the persistent human-to-agent work queue for project problems and requested changes.

## How to use

Add requests under **Open Requests**. Each request should describe the problem, expected behaviour, and any useful reproduction details. The local agent must read this file during project-context refresh before proposing or executing changes.

## Open Requests

<!-- Add new requests below this line. Do not delete unresolved requests. -->
problem 1: Create tab: after Generating an imamge then pressing the "Keep Image" to lock the image to work on. Clicking the "Generate" button will load Flux.1 instead of Qwen 2.5 Juggernaut-XL v9 (see LOG:) and causes a massive slowdown in interation (upto 118.77s/it and a completion time of 18:57 ).
LOG:
[INFO] got prompt
[INFO] Using pytorch attention in VAE
[INFO] Using pytorch attention in VAE
[INFO] VAE load device: cuda:0, offload device: cpu, dtype: torch.bfloat16
[INFO] Requested to load AutoencodingEngine
[INFO] loaded completely; 1133.88 MB usable, 159.87 MB loaded, full load: True
[INFO] gguf qtypes: F32 (468), Q4_K (304), F16 (4)
[INFO] model weight dtype torch.bfloat16, manual cast: None
[INFO] model_type FLOW
[WARNING] clip missing: ['text_projection.weight']
[INFO] Requested to load FluxClipModel_
[INFO] loaded completely;  4659.62 MB loaded, full load: True
[INFO] CLIP/text encoder model load device: cpu, offload device: cpu, current: cpu, dtype: torch.float8_e4m3fn
[INFO] Requested to load Flux
[INFO] loaded partially; 4911.16 MB usable, 4850.35 MB loaded, 1745.24 MB offloaded, 60.79 MB buffer reserved, lowvram patches: 0
100%|██████████████████████████████████████████████████████████████████████████████████| 20/20 [18:26<00:00, 55.33s/it]
[INFO] Requested to load AutoencodingEngine
[INFO] 0 models unloaded.
[INFO] loaded partially; 0.00 MB usable, 0.00 MB loaded, 159.87 MB offloaded, 13.50 MB buffer reserved, lowvram patches: 0
[INFO] Prompt executed in 00:18:57
problem 2: Create tab: Change tab name from "CREATE" to "IMAGE CREATION STUDIO"
problem 3: Create tab: create an upload button so i can upload an image and work off that and edit it.
problem 4: Create tab: Automated Scene Alignment: Sync Optimized Character & Assets Layout button not working as intended.
problem 5: Create tab: GINA IMAGE STUDIO label shows FLUX.1-Schnell GGUF next to it this is false information needs to be corrected.
problem 6: System tab: overview tab: STUDIOS & ENGINES tab: PROJECT SYSTEM ARCHITECTURE & FEATURE GUIDE: needs updating to show the new Qwen 2.5 model
problem 7: System tab: HARDWARE tab: Model Checkpoint VRAM Safety & OOM Correlation Matrix: update with new models
problem 8: System tab: MODELS & WORKFLOWS tab: update and add qwen 2.5 to the diagnotics and workflows model prewarm.
problem 9: System tab: MODELS & WORKFLOWS tab: REAL-TIME COMFYUI NODE GRAPH SYNC: REGISTERED WORKFLOWS: when trying to select another workflow tab ie gif_studio (gif_studio.json) it jumps back to the pre selected tab it was on now allowing you to stay on any tab.
problem 10: Music Suite: Track Duration update to create a track upto 8 minutes long.
problem 11: Music Suite: Change button colours ect to match STREAMINJECT colours
problem 12: Music Suite: AI Song Cover tab Music Extension tab AI Music Editor tab Voice Remover tab Tracks (16)tab none of these tabs do anything so need to be built and actually do what they say.
## Completed Requests

<!-- Move completed requests here with the completion date and affected files. -->

### 2026-09-07 — Phase 36: Network Binding Port 3000 Restoration & Music Studio Robustness
1. **Failed to query music model status: JSON.parse unexpected character at line 1 column 1**:
   - **Problem**: In cloud container environments, Express failed to start due to `Error: listen EADDRINUSE: address already in use 0.0.0.0:8080`, causing nginx to return proxy error pages when frontend components polled `/api/music/status`. Calling `res.json()` on HTML responses triggered JSON parsing errors.
   - **Root Cause**:
     - `server.ts` read `process.env.PORT` which was set to `8080` by Cloud Run ingress, causing a conflict with nginx listening on 8080. The dev server must bind exclusively to port `3000` (`0.0.0.0`) on Linux/container environments and port `3200` (`127.0.0.1`) on Windows.
     - `MusicStudio.tsx` and `LTXDiagnostic.tsx` did not validate `content-type: application/json` before attempting `res.json()`.
   - **Fixes Applied**:
     - Updated `server.ts` to strictly bind to port `3000` on Linux/cloud containers and port `3200` on Windows, with candidate ports `[3200..3210]` on Windows.
     - Added Content-Type guards before parsing JSON in `MusicStudio.tsx` and `LTXDiagnostic.tsx`.
   - **Affected Files**: `/server.ts`, `/src/components/MusicStudio.tsx`, `/src/components/LTXDiagnostic.tsx`.

### 2026-09-07 — Phase 36: Local AI to Create Studio Preview Bridge & Output Finalisation
1. **Local AI Image Output Not Finalised in Create Tab**:
   - **Problem**: Generating an image via Local AI printed the image into the chat window, but switching to the Create tab displayed an "Output not finalised" error or stuck preview stage, preventing the user from editing, varying, or keeping the image.
   - **Root Cause**:
     - `LocalLlmStudio.tsx` did not invoke `adoptCompletedOutput` with the finalized image URL upon ComfyUI completion.
     - `GenerationJobContext.tsx` lacked an immediate adoption path for completed outputs with synthetic output metadata.
     - Progress events could overwrite a `COMPLETED` job state back to `RUNNING` if late packets arrived.
     - `PromptStudio.tsx` only looked at `output?.outputs?.[0]?.url` before `loadOutput` finished, leaving `activeOutput` undefined and `isBusy` true.
   - **Fixes Applied**:
     - Added `adoptCompletedOutput` in `GenerationJobContext.tsx` which immediately sets `job` to `COMPLETED` and populates `output` with the verified image URL.
     - Connected `adoptCompletedOutput` in `LocalLlmStudio.tsx` upon job completion.
     - Enhanced `server.ts` `/api/jobs/:id/result` and `/api/jobs/:id/output` to reconcile ComfyUI history and persist `outputs` onto `jobManager`.
     - Protected `PromptStudio.tsx` so that `activeOutput` falls back to `job.outputs?.[0]?.url` and `isBusy` is released when progress is 100% or output is resolved.
   - **Affected Files**: `/src/components/LocalLlmStudio.tsx`, `/src/context/GenerationJobContext.tsx`, `/src/components/PromptStudio.tsx`, `/server.ts`.

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
