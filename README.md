# Gina AI Factory — v1.19.6

## v1.19.6 — Update Integrity Guard & Wan 2.1 UI Reconciliation (2026-09-12)

Qwen Coder is now a real project-analysis interface: the Attach control is available in Coder Mode for text/code files and project ZIPs. ZIP projects are imported into a dedicated Gina workspace and automatically inspected before any edit or execution. Project archives support up to 100MB and 10,000 files, removing the former 100-file extraction ceiling.

- **Qwen Coder attachments:** text/code/config files can be attached directly; image attachments remain Vision Mode only.
- **Project ZIPs:** uploading a ZIP from Attach imports the whole archive into a dedicated workspace instead of trying to feed every file into the LLM context.
- **Automatic inspection:** Gina reports structure, entry points, package scripts/package manager and Git state without executing uploaded code.
- **Large archives:** the Local AI upload path accepts ZIPs up to 100MB and the ZIP inspection extractor supports up to 10,000 files.
- **Versioned restore point:** `RESTORE_V1.19.6_UPDATE_INTEGRITY_WAN_UI`.

## v1.19.2 — Persistent Agent Workbench & Streaming Execution (2026-09-07)

Gina Agent now behaves like a live local development assistant instead of a black-box batch operation. Agent runs are persisted under `.gina/agent-runs`, every planning/tool/status transition is streamed to the Agent Workbench through Server-Sent Events, browser reconnects replay the saved event history, and active runs can be cancelled without losing their execution record.

- **Live execution:** `INSPECTING FILES → READING FILES → EDITING → RUNNING VALIDATION → REPAIRING → VERIFYING DIFF → REPORTING`.
- **Persistent runs:** each run has a durable JSON record with prompt, state, event history, summary and result.
- **Reconnect-safe UI:** the active run ID is retained locally and the workbench reconnects to the server event stream after a page refresh or dropped connection.
- **Validation visibility:** individual agent steps and failures are shown while the task is executing instead of only after completion.
- **Cancellation:** active runs expose a cancellation endpoint and record the final `CANCELLED` state.
- **Compatibility:** the existing `/api/agent/run` request remains available for non-streaming callers; the new `/api/agent/run-stream` + `/api/agent/runs/:id/stream` flow powers the live workbench.

# Gina AI Factory — v1.18.8

## v1.18.8 — Gina Agent Coding Workspaces, Planner & GitHub (2026-09-07)

Gina Agent can now import project archives, create isolated coding workspaces, clone/read/edit/validate GitHub repositories, create branches and commits, push changes when authorised, and open GitHub pull requests. GitHub access is scoped through a `GITHUB_TOKEN` environment variable; tokens are never written to project files or audit entries.

### v1.18.7 — Gina Intelligence & Model Routing (2026-09-07)

- Added a single server-owned intent router so Local AI and AI Tools no longer use competing image-generation keyword classifiers.
- Natural visual requests such as “give me a top-down view of …” can now be recognised as image-generation intent without requiring the words “create” or “generate”.
- Qwen 2.5-VL + mmproj-F16 is the primary reasoning/vision lane and routes image generation/reference edits to Juggernaut-XL v9.
- FLUX is an explicit alternate/high-precision image lane and is never silently selected for video.
- Qwen 2.5-VL is the active multimodal assistant; Qwen Coder is the active text-only coding model.
- Generation status text reports the actual generation model instead of claiming FLUX for every automatic image job.

## v1.18.6 — Edit Request Queue Implementation (2026-09-07)

This release implements the open requests in `docs/EDIT_REQUESTS.md` and fixes several adjacent routing/UI defects.

### Image Creation Studio
- Renamed the Create workspace to **IMAGE CREATION STUDIO**.
- Default image lane is now **Qwen 2.5-VL 7B + mmproj-F16 → Juggernaut-XL v9 SDXL**; reference edits use `sdxl_juggernaut_reference`.
- Keeping an image now cannot silently route the next generation to FLUX.
- Added a prominent **UPLOAD IMAGE** action while retaining the full reference-image workflow.
- Fixed Automated Scene Alignment so the optimized prompt is applied through React state instead of a DOM textarea hack.
- Updated model labels so the studio no longer falsely advertises FLUX when Juggernaut is active.

### System / Diagnostics
- Added Qwen 2.5-VL and Juggernaut-XL v9 to the model safety/pre-warm inventory and OOM correlation data.
- Fixed the registered-workflow inspector so runtime jobs no longer overwrite the workflow the user is inspecting.
- Updated system architecture documentation to distinguish the active Qwen local LLM lanes from ComfyUI image/video engines.

### Music Studio
- Track duration now supports **5 seconds through 8 minutes (480 seconds)**.
- Long MusicGen requests are generated in sequential ≤30-second chunks so the requested duration is actually rendered rather than reporting a long duration for a short tensor.
- Built functional **AI Song Cover**, **Music Extension**, **AI Music Editor**, and **Voice Remover** controls with local audio upload and job routing.
- Extension and edit modes use the uploaded source audio; cover mode creates an AI re-imagining and blends a small reference layer for continuity.
- Updated Music Studio primary controls toward the StreamInject cyan/magenta visual language.
- Added local audio-reference upload endpoint with size/type validation.

### Additional correctness fixes
- Corrected Local AI completed-image asset/job metadata to preserve the actual Qwen/Juggernaut workflow instead of hard-coding `flux_image`.
- Versioned the project as v1.18.6.

# Gina AI Factory — v1.18.5

## Phase 36 — Network Binding Port 3000 Restoration & Music Studio Robustness

### 1. Network Binding Port 3000 Restoration
- **Problem**: In cloud container environments, Cloud Run injects `PORT=8080` for container ingress. Reading `process.env.PORT` in `server.ts` caused Express to attempt to bind to `0.0.0.0:8080`, triggering `Error: listen EADDRINUSE: address already in use 0.0.0.0:8080` because the container's nginx reverse proxy was already listening on 8080. The failure to bind to port 3000 caused nginx to return proxy error pages, surfacing `Failed to query music model status: JSON.parse: unexpected character at line 1 column 1`.
- **Root Cause & Fix**:
  - Enforced strict platform-aware binding in `server.ts`: port `3000` (`0.0.0.0`) on Linux/container environments and port `3200` (`127.0.0.1` with `[3200..3210]` candidate ports) on Windows, strictly adhering to Rule 4 and container ingress specifications.
  - Added Content-Type validation to client-side API callers (`MusicStudio.tsx` and `WanDiagnostic.tsx`) before attempting `res.json()`, preventing HTML error payloads from throwing parsing crashes.

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
- **Milestone Roadmap**: Tracked authoritatively in `/src/components/MilestoneChecklist.tsx` (current active save point: `RESTORE_V1.18.8_GINA_AGENT_WORKSPACES_GITHUB`).
- **Upcoming Phase 39**: Autonomous Local Agent benchmark & self-healing test automation, followed by location/web tooling so Gina can resolve real-world places before generating geographic visualisations.

---

## Phase 34 — Qwen/Gemma routing, generation telemetry & persistent edit queue

- **Qwen 2.5-VL 7B + mmproj-F16** is now an explicit Local AI engine choice and deterministically routes image creation/reference editing to **Juggernaut-XL v9**.
- **Qwen 2.5-VL 7B + mmproj-F16** is the default reasoning/vision lane and routes image generation/reference editing to **Juggernaut-XL v9 (SDXL)**. **Gemma 3 12B + Vision projector** may use **FLUX.1-Schnell GGUF Q4_K_S** only as the fallback/alternate high-VRAM lane; FLUX is never silently selected for Qwen or non-vision Gemma.
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

## Autonomous update integrity

Every autonomous project edit is governed by `docs/AI_UPDATE_CHECKLIST.md`. Gina loads this checklist with the mandatory startup context, inspects the whole affected surface (UI, server, workflows, diagnostics, docs and metadata), validates the result, reviews the diff, and only then reports completion. The active video lane is Wan 2.1 1.3B BF16; LTX references are historical only.


## Internet research
Gina is local-first and can use controlled public-internet research for current documentation, releases, troubleshooting and other freshness-sensitive tasks. Set `GINA_WEB_ACCESS=false` to disable it. An optional `BRAVE_SEARCH_API_KEY` enables Brave Search API with DuckDuckGo fallback. See `docs/setup/GINA_WEB_RESEARCH.md`.
