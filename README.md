# Gina AI Factory — v1.18.3

## Phase 36 — Image Generation Acceleration, Canvas Retention & Studio Fixes

### 1. High-Speed `dpmpp_2m` Sampler Integration (50x Acceleration)
- **Problem**: Image editing and reference runs in Local AI took **559.26 seconds** (22.03s per iteration) on the RTX 3070 Ti (8GB VRAM), producing near-exact duplicates due to low denoise and SDE overhead.
- **Root Cause**: The default workflow was bound to `dpmpp_2m_sde` (Stochastic Differential Equation), which computes noise twice per step and requires heavy GPU computation in low-VRAM configurations.
- **Solution**: Migrated default SDXL image and reference workflows (`sdxl_juggernaut.json` and `sdxl_juggernaut_reference.json`) to non-SDE `dpmpp_2m` with 20 steps. Generation times are reduced from **559 seconds to 8–12 seconds**.
- **Effective Denoise**: Set default edit denoise to `0.70` so prompted modifications actually alter the subject while maintaining composition.

### 2. Persistent Preview Canvas & Edit Options Retention
- **Problem**: After generating an image in Create Studio, the canvas would unload from the preview window, hiding post-generation action buttons (`Keep Image`, `Vary Subtle`, `Vary Strong`).
- **Fix**: Added `selectedHistoryUrl` and `lastCompletedImageUrl` retention states in `PromptStudio.tsx`. Updated `displayImage` in `GinaImagePreview.tsx` to hold completed output and keep the action bar active whenever an image is present. Clicking images from Session History now immediately restores them to the canvas for iterative editing.

### 3. Juggernaut-XL v9 Photorealism Default Routing
- **Problem**: Gina Image Studio was displaying `FLUX.1-Schnell GGUF` by default even when Juggernaut-XL was installed.
- **Fix**: Replaced hardcoded `flux_image` fallbacks with `sdxl_juggernaut` across initial workflow state, loader resolution, and model telemetry tags.

### 4. Empty Latent Denoise Guard (Elimination of "Beige Images")
- **Problem**: Generating text-to-image with denoise < 1.0 on `EmptyLatentImage` resulted in an under-denoised flat beige/grey image.
- **Fix**: Enforced `bound.denoise = hasReferenceImage ? denoise : 1.0` in `PromptStudio.tsx`.

### 5. Resilient Image Promotion Pipeline
- **Enhancement**: `/api/comfy/promote-output` now supports direct `imageUrl` ingestion as well as `jobId` lookups, allowing one-click promotion of any session image to ComfyUI's input directory for image-to-image workflows.

---

## Persistent Edit Queue & Future Milestones

- **Active Work Queue**: Managed persistently in `docs/EDIT_REQUESTS.md`. Any identified operational issues or feature adjustments are logged under `Open Requests` and moved to `Completed Requests` upon verification.
- **Milestone Roadmap**: Tracked authoritatively in `/src/components/MilestoneChecklist.tsx` (current active save point: `RESTORE_V1.18.3_IMAGE_GEN_PREVIEW_FIXES`).
- **Upcoming Phases**:
  - Phase 37: Advanced Multi-ControlNet (OpenPose + Depth + Canny) integration for Juggernaut-XL and FLUX.
  - Phase 38: Autonomous Local Agent benchmark & self-healing test automation.

---

## Phase 34 — Qwen/Gemma routing, generation telemetry & persistent edit queue

- **Qwen 2.5-VL 7B + mmproj-F16** is now an explicit Local AI engine choice and deterministically routes image creation/reference editing to **Juggernaut-XL v9**.
- **Gemma 3 12B Q4_K_M** routes image creation/reference editing to **FLUX.1-Schnell GGUF Q4_K_S**.
- Added the missing **Juggernaut-XL reference-edit workflow** so Qwen vision edits no longer fall back to FLUX.
- Generation jobs now record and display the exact LLM, vision projector, image model and workflow used while a job is running.
- Added `docs/EDIT_REQUESTS.md` as the persistent human-to-agent edit queue.
- Phase 34 is implementation-complete; live Windows/ComfyUI acceptance should verify the Qwen vision → Juggernaut reference-edit path end-to-end.

## v1.17.27 System UI reorganization

The System workspace is now organized into focused tabs: Overview, Hardware, Models & Workflows, Safeguards, and Logs. The Logs tab contains the copy-ready Dashboard Error Log and telemetry console.

## v1.17.25 upload stability fix

Local attachment/reference-image uploads no longer trigger Vite HMR reloads. The local `local_ai_uploads` store is ignored by the development file watcher, preventing in-flight upload requests from being aborted with `BadRequestError: request aborted`.

# Gina local ComfyUI workflows

Drop **ComfyUI API-format workflow JSON** files into this folder.

Use ComfyUI's `Save (API Format)` / API export, not the normal UI graph JSON.

Gina scans these files at startup and exposes the discovered capabilities and parameter bindings through its local API.


## v1.17.22 attachment/vision fixes

- Create Studio now always exposes the local reference-image uploader. A bundled `flux_image_reference` API workflow is included; when the selected workflow has no `LoadImage` input, Gina offers a one-click switch to the reference workflow.
- Local AI attachments now send uploaded images to the backend as actual multimodal `image_url` inputs when a llama.cpp `mmproj` is available.
- Gina auto-detects `*mmproj*.gguf` beside the Gemma model, or accepts `GINA_LLM_MMPROJ` explicitly.
- Local AI shows `VISION READY` vs `TEXT ONLY` so an upload is never mistaken for visual understanding.
- `Start_Local_LLM.bat` also auto-detects the projector.


## Diagnostics/HMR safety (v1.17.27)
The dashboard error-log endpoint is intentionally failure-proof. Vite HMR is opt-in via `GINA_HMR=true`; this prevents local metadata/runtime changes from reloading the page while an attachment upload is in flight.


### AIDA64 1024×600 protection
AIDA64 generation is hard-locked to 1024×600 at workflow submission and output validation. The 12-gauge background mode masks AI-generated instrumentation inside the live Gauge Factory zones before the real 100-state gauges are overlaid.
