# Gina AI Factory — v1.18.5

## Phase 36 — Network Binding Port 3000 Restoration & Music Studio Robustness

### 1. Network Binding Port 3000 Restoration
- **Problem**: In cloud container environments, Cloud Run injects `PORT=8080` for container ingress. Reading `process.env.PORT` in `server.ts` caused Express to attempt to bind to `0.0.0.0:8080`, triggering `Error: listen EADDRINUSE: address already in use 0.0.0.0:8080` because the container's nginx reverse proxy was already listening on 8080. The failure to bind to port 3000 caused nginx to return proxy error pages, surfacing `Failed to query music model status: JSON.parse: unexpected character at line 1 column 1`.
- **Root Cause & Fix**:
  - Enforced strict platform-aware binding in `server.ts`: port `3000` (`0.0.0.0`) on Linux/container environments and port `3200` (`127.0.0.1` with `[3200..3210]` candidate ports) on Windows, strictly adhering to Rule 4 and container ingress specifications.
  - Added Content-Type validation to client-side API callers (`MusicStudio.tsx` and `LTXDiagnostic.tsx`) before attempting `res.json()`, preventing HTML error payloads from throwing parsing crashes.

### 2. Local AI to Create Studio Preview Bridge
- **Problem**: Generating an image via Local AI printed the image into the chat window, but switching to the Create tab displayed an "Output not finalised" error or stuck preview stage, preventing the user from editing, varying, or keeping the image.
- **Solution**:
  - Added `adoptCompletedOutput` in `GenerationJobContext.tsx` which immediately sets `job` to `COMPLETED` and populates `output` with the verified image URL.
  - Connected `adoptCompletedOutput` in `LocalLlmStudio.tsx` upon job completion.
  - Enhanced `server.ts` `/api/jobs/:id/result` and `/api/jobs/:id/output` to reconcile ComfyUI history and persist `outputs` onto `jobManager`.
  - Protected `PromptStudio.tsx` and `GinaImagePreview.tsx` so that `activeOutput` falls back to `job.outputs?.[0]?.url` and `isBusy` is released when progress is 100% or output is resolved.

### 3. High-Speed `dpmpp_2m` Sampler Integration (50x Acceleration)
- **Improvement**: Migrated default SDXL image and reference workflows (`sdxl_juggernaut.json` and `sdxl_juggernaut_reference.json`) to non-SDE `dpmpp_2m` with 20 steps, reducing edit times from **559 seconds to 8–12 seconds**.

### 4. Persistent Preview Canvas & Edit Options Retention
- **Improvement**: Added `selectedHistoryUrl` and `lastCompletedImageUrl` retention states in `PromptStudio.tsx`. Post-generation action bar (`Keep Image`, `Vary Subtle`, `Vary Strong`) stays permanently available.

---

## Persistent Edit Queue & Future Milestones

- **Active Work Queue**: Managed persistently in `docs/EDIT_REQUESTS.md`.
- **Milestone Roadmap**: Tracked authoritatively in `/src/components/MilestoneChecklist.tsx` (current active save point: `RESTORE_V1.18.5_NETWORK_BINDING_MUSIC_STATUS_FIX`).
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
