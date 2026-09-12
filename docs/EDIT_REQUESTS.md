# Gina AI Factory — Edit Requests

This file is the persistent human-to-agent work queue for project problems and requested changes.

## How to use

Add requests under **Open Requests**. Each request should describe the problem, expected behaviour, and any useful reproduction details. The local agent must read this file during project-context refresh before proposing or executing changes.

## Open Requests

<!-- Add new requests below this line. Do not delete unresolved requests. -->
The next upgrade is Phase 43: ### 🚀 Target Update: Local AI Stack Optimization & UI Toggle Swap (RTX 3070 Ti 8GB)

#### 📦 PRE-FLIGHT ASSET STATUS: VERIFIED & DOWNLOADED
The local hardware sentinel paths have been populated. Do not attempt to download or download-wrap these models; the weights are verified on disk and ready for immediate framework mapping:
- **Wan 2.1 Video Pipeline:** Installed (`wan2.1_t2v_1.3B_bf16.safetensors`, `umt5_xxl_fp8_e4m3fn_scaled.safetensors`, `wan_2.1_vae.safetensors`, `clip_vision_h.safetensors`).
- **FLUX.1 Lite Engine:** Installed (`FLUX.1-lite-pure-Q4_0.gguf`).
- **Qwen Coder Loop:** Installed (`qwen2.5-coder-7b-instruct-q5_k_m.gguf`).

---

#### 1. Local AI Tab: Refactor "PHASE 38 MODEL ROUTING" Side Buttons
- **Target Files:** `src/components/LocalLlmStudio.tsx`, `server/llm/LocalLlmManager.ts`
- **Request:** Repurpose the macro button toggle layout inside the left sidebar panel under the **PHASE 38 MODEL ROUTING** header block:
  - **CRITICAL COMPONENT DEFAULT:** **Qwen 2.5-VL 7B remains the active default selection upon application boot and tab initialization.**
  - **Button 1 (Left Toggle):** Retain as **"Qwen 2.5-VL 7B"**. Underlying execution properties must manage the multi-modal vision projector (`Qwen 2.5-VL + mmproj-F16`). This serves as the primary system fallback for standard chats, image analysis, and default text-to-image workflow strings.
  - **Button 2 (Right Toggle - Target Swap):** Replace the legacy "Gemma 3 12B" button slot entirely, renaming it to **"Qwen Coder 7B"**. Clicking this button must hot-swap the text engine path to load `models/llm/qwen2.5-coder-7b-instruct-q5_k_m.gguf`.
  - **Coder Optimization Rules:** When "Qwen Coder 7B" is active, initialize a pure text execution profile (completely unmounting the `mmproj` vision layer to open the maximum ~2.5 GB context window memory cache directly inside VRAM).
  - **UI Safeguard Control:** Because the Coder model cannot parse image attachments or handle image prompts, grey out or disable the bottom-right **"ATTACH"** layout file button *only* while the "Qwen Coder 7B" button is toggled on. Display a tool-tip error message: *"Switch to Vision Mode (Qwen 2.5-VL 7B) on the left panel to re-enable image/vision capabilities."*
  - **UI Subtitle Cleanup:** Update the global header text status subtitle beneath the main "Local AI" title to remove the hardcoded reference string text (`Gemma 3 12B Q4_K_M served locally...`) and make it dynamically update or reference your active Qwen selections instead.

#### 2. Image Studio & Creative Suites: "Text-in-Image" Selector (FLUX.1 Lite Toggle)
- **Target Files:** `src/components/AiStudioSuite.tsx`, `src/components/gina-image/GinaImageSettings.tsx`, `server/comfy/WorkflowRegistry.ts`
- **Request:** On all suite control panels featuring image generation (including **Image Creation Studio** and **Local AI Image Gen** triggers), add a **"Render In-Image Text / High Precision"** toggle switch.
  - **Toggle OFF (Default Speed Mode):** Runs your lightning-fast `Juggernaut-XL v9 (SDXL)` engine, completing iterations in 8–12 seconds.
  - **Toggle ON (Text-in-Image Mode):** Dynamically alters the ComfyUI backend call to route text parsing through `umt5_xxl_fp8_e4m3fn_scaled.safetensors` and targets the newly downloaded `FLUX.1-lite-pure-Q4_0.gguf` workflow to guarantee crisp text spelling and perfect hands.
  
#### 3. Video Studio: Complete Wan 2.1 Native Migration
- **Target Files:** `server/comfy/WorkflowRegistry.ts`, `server/comfy/WorkflowParser.ts`
- **Request:** Register the native Wan 2.1 video nodes and completely deprecate the heavy LTX-Video 2.5 default fallback mapping. Update all automated backend scripts inside your execution loops to map directly to these local paths:
  - **Diffusion Engine:** `models/diffusion_models/wan2.1_t2v_1.3B_bf16.safetensors`
  - **Text Encoder:** `models/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors`
  - **VAE Engine:** `models/vae/wan_2.1_vae.safetensors`
  - **Clip Vision:** `models/clip_vision/clip_vision_h.safetensors`

#### 4. Legacy Model Deprecation & Workspace Cleanup
- **Target Files:** `server/llm/LocalLlmManager.ts`, `server/comfy/WorkflowRegistry.ts`, `scripts/check_ltx23.ts`, and fallback config templates.
- **Context:** The user is permanently deleting the legacy model files to free up drive space. The following models are no longer physically present on disk:
  - `gemma-3-12b-it-Q4_K_M.gguf` & corresponding `mmproj-model-f16.gguf` / `mmproj-q8_0.gguf` layers.
  - `ltxv-2b-0.9.8-distilled-fp8.safetensors`, `ltxv-13b-0.9.8-distilled-fp8.safetensors`, and `ltx-2.3-22b-distilled-fp8.safetensors`.
  - `flux1SchnellFp8_schnellFp8.safetensors` & `flux1-schnell-Q4_K_S.gguf`.
- **Request:** Scan the full workspace architecture and completely clean out all fallback logic, auto-discovery strings, and hardcoded references pointing to these deleted files. Ensure that if `scripts/check_ltx23.ts` loops through video models, it no longer flags LTX-Video paths as valid fallback targets. **Ensure the global system default remains strictly bound to `Qwen 2.5-VL 7B` for vision orchestration.**


## Completed Requests

<!-- Move completed requests here with the completion date and affected files. -->

### 2026-09-07 — Phase 37: EDIT_REQUESTS.md Open Queue Implemented
1. **Create tab — Keep Image routed to FLUX instead of Juggernaut/Qwen lane** — Fixed by making Qwen 2.5-VL + Juggernaut-XL v9 the Create Studio default and preventing a kept reference from falling back to `flux_image`.
2. **Create tab — Rename CREATE** — Renamed the workspace to `IMAGE CREATION STUDIO`.
3. **Create tab — image upload** — Added a prominent upload action plus the existing reference-image workflow.
4. **Create tab — Automated Scene Alignment** — Removed the DOM textarea interception and applied optimized prompts through the React state path; reference workflow selection now uses the actual Juggernaut reference workflow.
5. **Create tab — false FLUX label** — Replaced the false studio badge with `Qwen 2.5-VL + Juggernaut-XL v9`.
6. **System — architecture guide** — Updated the architecture/feature guide to document Qwen 2.5-VL, mmproj-F16, and Juggernaut-XL v9 routing.
7. **System — VRAM/OOM matrix** — Added Juggernaut-XL v9 and Qwen 2.5-VL model metadata and simulation targets.
8. **System — models/workflows/pre-warm** — Added Qwen/Juggernaut targets and corrected the default image target; Qwen is represented as an armed local-LLM target rather than being falsely treated as a ComfyUI checkpoint.
9. **System — registered workflow selection** — Stopped runtime telemetry from overwriting the workflow selected by the user.
10. **Music Suite — 8-minute tracks** — Duration is now 5–480 seconds; MusicGen renders long requests as sequential <=30-second chunks.
11. **Music Suite — StreamInject colours** — Updated the primary Music Studio controls to the StreamInject cyan/magenta visual language.
12. **Music Suite — non-functional modes** — Built source-audio upload and execution controls for AI Song Cover, Music Extension, AI Music Editor, and Voice Remover; extension/edit operations preserve source audio around generated sections and cover mode produces an AI re-imagining with reference continuity.

### 2026-09-07 — Phase 37: Additional correctness fixes
- Corrected Local AI completed-image job/asset metadata so the actual workflow identity is retained instead of hard-coding `flux_image`.
- Updated version, README, metadata, and changelog to v1.18.6.
- Added local audio reference upload validation and kept audio references constrained to Gina's local audio library.


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
