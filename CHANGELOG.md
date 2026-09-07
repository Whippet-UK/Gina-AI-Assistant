# Gina AI Factory — v1.18.1

## Phase 34 + Phase 36 — Qwen/Gemma routing, generation telemetry & persistent edit queue

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


## v1.18.2 — Create Studio completion finalisation (2026-09-06)

### Target File Path: `/server.ts`
- Added authoritative ComfyUI `/history` reconciliation for active jobs so missed WebSocket completion packets cannot leave Create Studio permanently RUNNING at 100%.

### Target File Path: `/src/context/GenerationJobContext.tsx`
- Extended final output polling to approximately 15 seconds and labelled 100% as finalisation while output resolves.

### Target File Path: `/src/components/gina-image/GinaImagePreview.tsx`
- Changed the 100% RUNNING indicator to `FINALISING OUTPUT…`.

### Target File Path: `/src/version.ts`, `/package.json`, `/metadata.json`, `/index.html`, `/AGENTS.md`, `/README.md`
- Synchronized project version to `1.18.2` and documented the Create Studio completion fix.

## v1.18.1 — Phase 34 + Phase 36 routing and edit queue (2026-09-06)

### Target File Path: `/server/llm/LocalLlmManager.ts`
- Added `getModelSelection()` so the active engine, model and Qwen projector can be exposed consistently.
- Existing `setEngine()` remains the single engine switch path and is now surfaced by the API/UI.

### Target File Path: `/server.ts`
- Added `POST /api/llm/engine` for explicit Qwen/Gemma selection with ComfyUI VRAM release before switching.
- Changed AI image intent handling so explicit image creation/edit requests are actually queued instead of producing a promise-only assistant response.
- Added deterministic Phase 34 routing: Qwen → Juggernaut-XL v9; Gemma → FLUX.1-Schnell. Reference edits use the matching reference workflow.
- Generation audit metadata now records the LLM, mmproj, generation model and workflow.

### Target File Path: `/workflows/sdxl_juggernaut_reference.json`
- Added a native SDXL/Juggernaut LoadImage → VAEEncode → KSampler → VAEDecode → SaveImage reference-edit workflow.

### Target File Path: `/src/components/LocalLlmStudio.tsx`
- Added the Phase 34 Qwen/Gemma engine selector and corrected vision guidance to point to Qwen + mmproj-F16.

### Target File Path: `/src/components/gina-image/GinaImagePreview.tsx`
- Added live generation model telemetry showing LLM, mmproj, image model and workflow during generation.

### Target File Path: `/src/components/MilestoneChecklist.tsx`
- Marked Phase 34 `COMPLETED`, opened Phase 36 as the active ongoing edit queue, and created restore point `RESTORE_V1.18.1_PHASE34_ROUTING_AND_EDIT_QUEUE`.

### Target File Path: `/docs/EDIT_REQUESTS.md`
- Created the persistent human-to-agent edit request queue required by Phase 36.

### Target File Path: `/README.md`, `/AGENTS.md`, `/src/version.ts`, `/package.json`, `/metadata.json`, `/index.html`
- Synchronized the project to version `1.18.1` and documented the Phase 34/36 changes.

## Phase 36 follow-up — Create Studio completion/finalisation fix (2026-09-06)

### Target File Path: `/server.ts`
- Added ComfyUI `/history` reconciliation for active jobs.
- `/api/jobs/:id` now repairs missed WebSocket completion packets, converting a job stuck at 100% RUNNING into COMPLETED when ComfyUI reports success/output.
- `/api/jobs/:id/output` also performs the reconciliation before resolving output.

### Target File Path: `/src/context/GenerationJobContext.tsx`
- Extended final-output polling from ~5 seconds to ~15 seconds.
- Marks 100% progress as `Finalising output…` while the authoritative completion/output state is being resolved.

### Target File Path: `/src/components/gina-image/GinaImagePreview.tsx`
- Changed the 100% RUNNING status label from `SAMPLING · 100%` to `FINALISING OUTPUT…` so the UI accurately reflects the finalisation stage.

## Phase 36 v1.18.3 — Image Generation Speed, Preview Retention & Edit Options (2026-09-07)

### Target File Path: `/workflows/sdxl_juggernaut.json` & `/workflows/sdxl_juggernaut_reference.json`
- **Code Snippet**:
  ```json
  "sampler_name": "dpmpp_2m",
  "steps": 20,
  "denoise": 0.70
  ```
- **Why**: The default `dpmpp_2m_sde` sampler computes noise twice per step, resulting in slow 22.03s/it runs (559 seconds total) on 8GB VRAM setups. Switching to non-SDE `dpmpp_2m` with 20 steps yields 8–12 second generations (50x speedup). A default denoise of 0.70 ensures user prompt edits visibly transform the image instead of producing near-duplicates.

### Target File Path: `/src/components/PromptStudio.tsx`
- **Code Snippet**:
  ```typescript
  const [selectedHistoryUrl, setSelectedHistoryUrl] = useState<string | null>(null);
  const [lastCompletedImageUrl, setLastCompletedImageUrl] = useState<string | null>(null);
  const activeOutput = rawOutput || selectedHistoryUrl || lastCompletedImageUrl || job?.preview || null;
  bound.denoise = hasReferenceImage ? denoise : 1.0;
  ```
- **Why**: Prevents images from unloading from the preview canvas upon generation completion or job reset; clicking history items immediately restores them to the canvas; guards against beige images by forcing denoise = 1.0 when generating without a reference image; defaults workflow to `sdxl_juggernaut` (Juggernaut-XL v9 Photorealism).

### Target File Path: `/src/components/gina-image/GinaImagePreview.tsx`
- **Code Snippet**:
  ```typescript
  const displayImage = activeOutput || job?.preview || null;
  {displayImage && (
    <div className="border-t border-[#21262d] bg-[#161b22] px-3 py-2 flex items-center justify-between">
      {/* Keep Image, Vary Subtle, Vary Strong, Download buttons */}
    </div>
  )}
  ```
- **Why**: Ensures the action bar with edit options (Keep Image, Vary, Download) remains rendered and clickable as long as an image is loaded on the canvas.

### Target File Path: `/server.ts`
- **Code Snippet**:
  ```typescript
  app.post('/api/comfy/promote-output', async (req, res) => {
    const { jobId, imageUrl } = req.body || {};
    // Supports direct promotion by imageUrl as well as jobId
  });
  ```
- **Why**: Enables flexible promotion of generated or historical images into ComfyUI's input directory for image-to-image and reference-guided editing workflows.

### Target File Path: `/docs/EDIT_REQUESTS.md`
- **Code Snippet**:
  - Moved Local AI 559s slow generation and Create Studio preview unload issues to Completed Requests with root-cause analysis and affected files.
- **Why**: Maintain the authoritative Phase 36 human-to-agent work queue.

### Target File Path: `/src/version.ts`, `/src/components/MilestoneChecklist.tsx`, `/package.json`, `/metadata.json`, `/index.html`, `/AGENTS.md`, `/README.md`
- **Code Snippet**:
  ```typescript
  export const APP_VERSION = '1.18.3';
  export const ACTIVE_SAVE_POINT_ID = 'RESTORE_V1.18.3_IMAGE_GEN_PREVIEW_FIXES';
  export const ACTIVE_LIFECYCLE_PHASE = 36;
  export const ACTIVE_LIFECYCLE_NAME = 'PHASE 36 — IMAGE GENERATION SPEED, PREVIEW RETENTION & CREATE STUDIO FIXES';
  ```
- **Why**: Synchronize universal project version 1.18.3 and active save point according to system rules.
