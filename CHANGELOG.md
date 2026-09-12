# v1.19.8 — Phase 49 — Autonomous Project Completion Gate & Persistent Project Map

## Machine-Enforced Definition of Done Gate & Persistent Architectural Project Map

- **Target File:** `/server/agent/DefinitionOfDoneGate.ts`
  - **Exact Code Change:**
    ```typescript
    export class DefinitionOfDoneGate {
      async verify(): Promise<DefinitionOfDoneResult> {
        // Checks version synchronization across 6 root files
        // Checks mandatory AI update checklist presence
        // Scans project for zero retired engine references
        // Runs TypeScript compilation build check
        // Verifies changelog logging and root directory cleanliness
      }
    }
    ```
  - **Why:** Provide a machine-enforced gate that prevents false or premature completion reports and enforces project rules.

- **Target File:** `/server/agent/ProjectMapManager.ts`
  - **Exact Code Change:**
    ```typescript
    export class ProjectMapManager {
      async getProjectMap(forceRebuild = false): Promise<ProjectMap> {
        // Scans and indexes project surfaces: Frontend, Backend, Models, Workflows, Configuration, Tests, Docs
        // Tracks cross-surface dependencies, entry points, and affected surfaces for queries
      }
    }
    ```
  - **Why:** Maintain persistent architectural understanding across project surfaces rather than rediscovering on every turn.

- **Target File:** `/server/agent/AutonomousAgentEngine.ts`
  - **Exact Code Change:**
    ```typescript
    if (parsedAction.action === "TASK_COMPLETE") {
      const dodGate = new DefinitionOfDoneGate(workspaceRoot);
      const gateResult = await dodGate.verify();
      if (!gateResult.ok) {
        // Trigger autonomous repair loop by feeding blocking errors back to model
        activeContextPrompt = `MANDATORY DEFINITION OF DONE GATE FAILED: ...`;
        continue;
      }
    }
    ```
  - **Why:** Machine-enforce the completion gate so failed gates become new repair tasks instead of stopping.

- **Target File:** `/server.ts`
  - **Exact Code Change:**
    ```typescript
    const projectMap = new ProjectMapManager(GINA_ROOT);
    const definitionOfDoneGate = new DefinitionOfDoneGate(GINA_ROOT);
    // Added inspect_project_map and verify_definition_of_done broker tools
    // Added /api/agent/project-map and /api/agent/definition-of-done REST endpoints
    // Integrated DefinitionOfDoneGate verification into executeAgentRun completion check
    ```
  - **Why:** Expose project mapping and Definition of Done verification to Gina Agent and REST consumers with automatic repair loops.

- **Target Files:** `/src/version.ts`, `/package.json`, `/metadata.json`, `/index.html`, `/AGENTS.md`, `/README.md`, `/docs/INDEX.md`, `/src/components/MilestoneChecklist.tsx`
  - **Exact Code Change:** Synchronized version to `1.19.8`, lifecycle to Phase 49, and active save point to `RESTORE_V1.19.8_PROJECT_COMPLETION_GATE`.
  - **Why:** Universal Version & Metadata Synchronization Guard (RULE 7).

# v1.19.7 — Phase 48 — Agent Action Recovery & Robust Tool Dispatch

## Autonomous agent dispatch hardening and compilation integrity

- **Target File:** `/scripts/check_wan21.ts`
  - **Exact Code Change:** Added the missing Wan 2.1 diagnostic script with system checks for models, VRAM headroom, Python packages, and ComfyUI connectivity.
  - **Why:** Resolve server build breakage caused by missing `check_wan21.js` reference in `server.ts` while honoring Wan 2.1 engine migration.

- **Target File:** `/server/agent/AgentWorkspaceManager.ts`
  - **Exact Code Change:**
    ```typescript
    getActiveWorkspacePath(name = 'default'): string {
      return this.resolveWorkspace(name);
    }
    ```
  - **Why:** Provide the workspace path resolution method expected by `AutonomousAgentEngine.ts`.

- **Target File:** `/server/llm/LocalLlmManager.ts`
  - **Exact Code Change:**
    ```typescript
    async generateCompletion(options: { systemPrompt?: string; prompt: string; temperature?: number; maxTokens?: number }): Promise<string> {
      const messages: ChatMessage[] = [];
      if (options.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
      }
      messages.push({ role: 'user', content: options.prompt });
      const res = await this.chat(messages, { temperature: options.temperature ?? 0.7, maxTokens: options.maxTokens ?? 1024 });
      return res?.choices?.[0]?.message?.content || "";
    }
    ```
  - **Why:** Provide completion generation on `LocalLlmManager` for autonomous agent cycles.

- **Target File:** `/src/components/MilestoneChecklist.tsx`
  - **Exact Code Change:** Imported missing `RestorePoint` and `VerificationCheck` types from `../types`, updated Phase 47/48 items, and registered `RESTORE_V1.19.7_AGENT_ACTION_RECOVERY`.
  - **Why:** Fix TypeScript compilation error TS2304 and align active restore points.

- **Target Files:** `/index.html`, `/AGENTS.md`
  - **Exact Code Change:** Synchronized version references to `1.19.7` and active lifecycle to Phase 48.
  - **Why:** Strict adherence to Universal Version & Metadata Synchronization Guard (RULE 7).

# v1.19.6 — Phase 47 — Web Research & Local-First Agent

## Web research and agent workflow
- `server/agent/WebResearchService.ts` — added controlled public-internet search/page retrieval with DuckDuckGo fallback and optional Brave Search API.
- `server.ts` — exposed `web_search`, `web_research`, and `web_fetch` agent tools plus web-status/search API endpoints and capability reporting.
- `server.ts` — strengthened the agent system contract so current documentation, releases, troubleshooting and other freshness-sensitive tasks can use web research.
- `src/components/GinaAgentPanel.tsx` — shows whether web research is enabled and tells users that Gina can use live internet research.
- `.env.example` — added `GINA_WEB_ACCESS` and optional `BRAVE_SEARCH_API_KEY`.
- `docs/setup/GINA_WEB_RESEARCH.md` — documented configuration, tool behaviour and network safeguards.
- `src/version.ts`, `package.json`, `metadata.json` — synchronized to v1.19.6 / Phase 47.

## Integrity
- Web results are treated as untrusted research data and cannot override Gina's project update rules.
- Private/local network addresses are blocked by the web research guard and redirects are revalidated.
- The local Qwen engine remains the reasoning engine; internet access is a server-side retrieval capability.

# v1.19.5 — Phase 46: Update Integrity Guard & Wan 2.1 UI Reconciliation

## 2026-09-12

- **Target Files:** `/src/components/TestSuitePanel.tsx`, `/src/components/MilestoneWorkbench.tsx`, `/server/rag/LocalRagEngine.ts`
  - **Exact Code Change:** Replaced remaining active Gemma labels with Qwen/current terminology and removed Gemma from current RAG engine classification.
  - **Why:** Prevent stale model terminology from surviving in system tabs and newly indexed knowledge.

- **Target File:** `/docs/AI_UPDATE_CHECKLIST.md`
  - **Exact Code Change:** Added the mandatory startup/update/final-gate checklist covering project context ingestion, cross-suite engine consistency, Qwen Coder ZIP workflow, validation, diff review, version synchronization, changelog logging, and retired-engine sweeps.
  - **Why:** Make project-wide update requirements explicit and reusable instead of relying on AGENTS.md prose alone.
- **Target File:** `/server/agent/AgentContextManager.ts`
  - **Exact Code Change:** Added `docs/AI_UPDATE_CHECKLIST.md` to the mandatory startup context file set.
  - **Why:** Ensure every autonomous coding context receives the checklist before planning edits.
- **Target File:** `/server/agent/UpdateIntegrityGuard.ts`
  - **Exact Code Change:** Added deterministic version/metadata/checklist validation and active-source retired-engine scanning.
  - **Why:** Give the agent a machine-checkable final gate instead of trusting model compliance.
- **Target File:** `/server.ts`
  - **Exact Code Change:** Added the `project_integrity_check` broker action and strengthened the runtime prompt to require an integrity check before success; updated active model policy wording.
  - **Why:** Put the checklist into the actual autonomous execution loop.
- **Target Files:** `/src/components/VideoStudio.tsx`, `/src/components/GifStudio.tsx`, `/src/components/WanDiagnostic.tsx`, `/src/components/LocalCapabilityPanel.tsx`, `/src/components/MediaStitcherModal.tsx`, `/src/components/VRAMOomFrequencyChart.tsx`, `/src/App.tsx`, `/src/data/rulesData.ts`, `/server/comfy/WorkflowParser.ts`, `/scripts/media_stitcher.py`
  - **Exact Code Change:** Reconciled active video UI, diagnostics, presets, source labels, telemetry labels, chart labels and helper text to Wan 2.1; removed the retired LTX workflow/diagnostic components and renamed the diagnostic helper to `check_wan21.ts`.
  - **Why:** Eliminate stale LTX references and broken legacy diagnostic wiring from active production surfaces.
- **Target Files:** `/src/components/AppFeaturesGuide.tsx`, `/src/components/MilestoneChecklist.tsx`, `/AGENTS.md`, `/README.md`, `/docs/INDEX.md`, `/metadata.json`, `/index.html`, `/src/version.ts`, `/package.json`, `/package-lock.json`
  - **Exact Code Change:** Synchronized Phase 46 / v1.19.5 / `RESTORE_V1.19.5_UPDATE_INTEGRITY_WAN_UI`, updated current-engine documentation, and locked Phase 44 in favor of the new active restore point.
  - **Why:** Keep the project's version, milestone, restore-point and current-stack metadata consistent.

# v1.19.2 — Phase 42: Unified Gina AI Coding Assistant

- Local Gina Chat is now the primary coding interface when a project workspace is active.
- Upload a project ZIP, automatically import it into a dedicated workspace, inspect it and edit it from natural-language prompts.
- Export the active workspace back to a clean updated ZIP.
- Added simple GitHub clone-to-workspace flow and retained agent pull/commit/push tooling.
- Live coding activity is shown in the normal Gina conversation instead of requiring the legacy Agent panel.
- Removed the separate Gina Agent panel from the Local AI page.

# Gina AI Factory — v1.19.2

## 2026-09-07 — Phase 41: Persistent Agent Workbench & Streaming Execution

- **Target File:** `/server/agent/AgentRunManager.ts`
  - **Exact Code Change:** Added `AgentRunManager` with durable JSON run records under `.gina/agent-runs`, monotonic event IDs, event subscriptions, run listing/loading, terminal state persistence, and cancellation tracking.
  - **Why:** Make Gina Agent execution persistent and reconnectable instead of keeping progress only in the browser response.

- **Target File:** `/server.ts`
  - **Exact Code Change:** Added `executeAgentRun(...)` as the shared coding-loop executor with phase/status events; added `GET /api/agent/runs`, `GET /api/agent/runs/:id`, `POST /api/agent/runs/:id/cancel`, `GET /api/agent/runs/:id/stream`, and `POST /api/agent/run-stream`.
  - **Exact Code Snippet:** `app.get('/api/agent/runs/:id/stream', async (req,res) => { ... })` and `app.post("/api/agent/run-stream", async (req,res) => { ... })`.
  - **Why:** Stream live `INSPECTING FILES → READING FILES → EDITING → RUNNING VALIDATION → REPAIRING → VERIFYING DIFF → REPORTING` progress while retaining the existing non-streaming `/api/agent/run` compatibility route.

- **Target File:** `/src/components/GinaAgentPanel.tsx`
  - **Exact Code Change:** Replaced the blocking `/api/agent/run` UI call with `/api/agent/run-stream` plus `EventSource` subscription; added live event timeline, current phase, run ID, cancellation control, local active-run recovery and reconnect handling.
  - **Why:** The Agent Workbench now shows Gina's actual execution as it happens and can recover the visible run after a browser refresh or transient connection loss.

- **Target File:** `/src/components/MilestoneChecklist.tsx`
  - **Exact Code Change:** Added completed phases 39–41 and activated `RESTORE_V1.19.2_PERSISTENT_AGENT_WORKBENCH_STREAMING`; locked the Phase 40 restore point.
  - **Why:** Keep the authoritative milestone/save-point record synchronized with the completed implementation.

- **Target Files:** `/src/version.ts`, `/package.json`, `/metadata.json`, `/index.html`, `/AGENTS.md`, `/README.md`
  - **Exact Code Change:** Synchronized the project to `v1.19.2`, Phase 41, and restore point `RESTORE_V1.19.2_PERSISTENT_AGENT_WORKBENCH_STREAMING`; documented the persistent run/event model and streaming endpoints.
  - **Why:** Maintain the project's zero-discrepancy version/metadata contract and make Phase 41 discoverable from the repository root.

- **Target File:** `/src/components/AppFeaturesGuide.tsx`
  - **Exact Code Change:** Renamed the autonomous-agent feature to the Persistent Workbench, marked it LIVE, and documented Phase 40 coding-loop plus Phase 41 durable SSE execution/reconnect/cancellation support.
  - **Why:** Keep the in-app feature/status guide aligned with the implemented Agent Workbench.

- **Target File:** `/docs/setup/LOCAL_AGENT_SETUP.md`
  - **Exact Code Change:** Added the Phase 41 persistent-run, SSE, reconnect, inspection, cancellation and legacy compatibility documentation.
  - **Why:** Document the new Agent Workbench runtime contract for future coding sessions.

# Gina AI Factory — v1.19.0

## 2026-09-07 — Phase 40: Gina Agent Coding Loop & GitHub Workbench
- Added a multi-step inspect → read → edit → validate → diff → report coding loop.
- Added workspace inspection with package-manager/script discovery.
- Added automatic validation-script selection and retry guidance after failures.
- Added workspace-scoped diff inspection before success reporting.
- Expanded planner/recovery action vocabulary for coding and repository tasks.
- Extended agent iteration budget from 6 to 10 controlled tool steps.

# Gina AI Factory — v1.18.8

## 2026-09-07 — Phase 39: Gina Agent Coding Workspaces & GitHub

- Added dedicated Gina repository workspaces under `.gina/workspaces`.
- Added project ZIP upload/import with archive path-traversal protection.
- Added GitHub clone, pull, push, branch and commit agent actions.
- Added optional GitHub PR creation through `GITHUB_TOKEN`.
- Added code-task validation loop and location lookup planning.
- Added token redaction in the local agent audit log.
- Added Gina Agent upload, GitHub Repo and Code Task controls.

# Gina AI Factory — v1.18.7

## 2026-09-07 — Phase 38: Gina Intelligence & Model Routing

- **Target File**: `/server.ts`
- **Exact Code Change**: Replaced the image-only keyword gate with `detectImageGenerationIntent(text, hasImageAttachment)` and added `imageGenerationPolicy(engine, multimodal, hasReference)`. The same classifier now powers `/api/llm/chat` and `/api/ai-tools/route`.
- **Why**: Prevent false negatives such as “give me a top-down view of …” and prevent conflicting UI/server routers from making different decisions.

- **Target File**: `/server.ts`
- **Exact Code Change**: Qwen routes to `sdxl_juggernaut` / `sdxl_juggernaut_reference`; Gemma routes to FLUX only when `multimodal` is true. Non-vision Gemma now hard-fails the FLUX route instead of silently using it.
- **Why**: Enforce the requested model policy: Qwen + Juggernaut is primary; FLUX is reserved for Gemma 3 Vision fallback/alternate use.

- **Target File**: `/server/llm/LocalLlmManager.ts`
- **Exact Code Change**: Multimodal projector discovery is no longer Qwen-only; Gemma `mmproj` files such as `mmproj-q8_0.gguf` are accepted, and image attachments are passed to either configured multimodal engine.
- **Why**: Make the Gemma 3 + Vision + FLUX lane real instead of advertising vision support while rejecting Gemma image input.

- **Target File**: `/src/components/LocalLlmStudio.tsx`
- **Exact Code Change**: Removed the duplicated client-side image keyword classifier and made the UI query `/api/ai-tools/route` before invoking ComfyUI. Generation status now reports the actual `generationModel`.
- **Why**: Establish one routing authority and eliminate accidental image generation caused by UI/server classifier drift.

- **Target Files**: `/src/components/gina-image/GinaImageSettings.tsx`, `/src/components/AiStudioSuite.tsx`, `/README.md`, `/AGENTS.md`, `/metadata.json`, `/index.html`, `/src/version.ts`, `/package.json`, `/src/components/MilestoneChecklist.tsx`
- **Exact Code Change**: Updated defaults, model-policy labels, documentation, version metadata, milestone/restore point, and release description for Phase 38.
- **Why**: Keep the UI and project memory consistent with the authoritative routing policy.


## 2026-09-07 — Edit Request Queue Implementation

- Implemented all open requests recorded in `docs/EDIT_REQUESTS.md`.
- Image Creation Studio now defaults to Qwen 2.5-VL + Juggernaut-XL v9, keeps reference edits on the Juggernaut reference workflow, exposes a direct upload action, and reports the correct model.
- Removed the workflow-inspector feedback loop that forced the selected ComfyUI workflow back to the active runtime job.
- Added Qwen/Juggernaut entries to pre-warm and OOM diagnostic inventories.
- Music Studio now supports 480-second requests through sequential MusicGen chunking and has working source-audio upload flows for cover, extension, edit, and voice removal modes.
- Fixed local AI completion metadata so saved images retain their real workflow/model identity.
- Updated README, metadata, version, and UI labels.

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

## Phase 36 v1.18.4 — Local AI to Create Studio Preview Bridge (2026-09-07)

### Target File Path: `/src/context/GenerationJobContext.tsx`
- **Code Snippet**:
  ```typescript
  const adoptCompletedOutput = useCallback((jobId: string, imageUrl: string, filename?: string) => {
    activeJobIdRef.current = jobId;
    outputResolvedJobRef.current = jobId;
    setOutputLoading(false);
    setSubmitting(false);
    const syntheticOutput = { nodeId: 'output', kind: 'images', file: { filename: filename || 'output.png' }, url: withCacheBust(imageUrl, jobId) };
    setJob(prev => ({ ...prev, id: jobId, status: 'COMPLETED', progress: 100, outputs: [syntheticOutput] }));
    setOutput({ job: ..., outputs: [syntheticOutput] });
  }, []);
  ```
- **Why**: Allows instant synchronization of finished external/AI tool generations into Create Studio context so the preview canvas immediately displays the image with full editing controls. Guarded the `progress` event so late packets cannot revert a `COMPLETED` job back to `RUNNING`.

### Target File Path: `/src/components/LocalLlmStudio.tsx`
- **Code Snippet**:
  ```typescript
  if (data.ready && data.imageUrl) {
    adoptCompletedOutput(data.jobId || jobId, data.imageUrl, data.filename);
    setMessages(prev => [...prev, { role: 'assistant', content: ..., imageUrl: data.imageUrl }]);
    ...
  }
  ```
- **Why**: Directly pushes the completed local AI image output into the shared generation job context the moment the polling loop detects output completion.

### Target File Path: `/src/components/PromptStudio.tsx`
- **Code Snippet**:
  ```typescript
  const rawOutput = output?.outputs?.[0]?.url || (Array.isArray(job?.outputs) ? job?.outputs?.[0]?.url : undefined);
  const activeOutput = selectedHistoryUrl || (isMediaImage ? rawOutput : undefined) || lastCompletedImageUrl || (job?.status === 'COMPLETED' ? (job?.outputs?.[0]?.url || job?.preview) : undefined);
  const isBusy = loading || job?.status === 'QUEUED' || (job?.status === 'RUNNING' && (!activeOutput || (job.progress || 0) < 100));
  ```
- **Why**: Allows Create Studio preview to resolve output immediately from `job.outputs` when `output` is not yet fetched, and releases `isBusy` when output is resolved or progress is 100%, enabling immediate editing without "Output not finalised" blockage.

### Target File Path: `/server.ts`
- **Code Snippet**:
  ```typescript
  // In /api/jobs/:id/result:
  if (job.status !== 'COMPLETED' && job.promptId) {
    job = await reconcileComfyJobFromHistory(job);
  }
  jobManager.update(job.id, { status: 'COMPLETED', progress: 100, currentNodeId: null, outputs, completedAt: ... });
  // In /api/jobs/:id/output:
  if (Array.isArray(job.outputs) && job.outputs.length && (job.status === 'COMPLETED' || !job.promptId)) {
    return res.json({ job, outputs: job.outputs });
  }
  ```
- **Why**: Ensures server-side job manager state is synchronized with ComfyUI history and outputs are persisted, preventing unnecessary re-queries or race conditions.

### Target File Path: `/src/version.ts`, `/src/components/MilestoneChecklist.tsx`, `/package.json`, `/metadata.json`, `/index.html`, `/AGENTS.md`, `/README.md`
- **Code Snippet**:
  ```typescript
  export const APP_VERSION = '1.18.4';
  export const ACTIVE_SAVE_POINT_ID = 'RESTORE_V1.18.4_LOCAL_AI_CREATE_BRIDGE';
  export const ACTIVE_LIFECYCLE_PHASE = 36;
  export const ACTIVE_LIFECYCLE_NAME = 'PHASE 36 — LOCAL AI TO CREATE STUDIO PREVIEW BRIDGE & OUTPUT FINALISATION SYNCHRONIZATION';
  ```
- **Why**: Maintain mandatory 100% universal version synchronization and active save point protocol.

## Phase 36 v1.18.5 — Network Binding Port 3000 Restoration & Music Studio Robustness (2026-09-07)

### Target File Path: `/server.ts`
- **Code Snippet**:
  ```typescript
  const isWin = process.platform === "win32";
  const PORT = isWin ? 3200 : 3000;
  const candidatePorts = isWin
    ? [3200, 3201, 3202, 3203, 3204, 3205, 3206, 3207, 3208, 3209, 3210]
    : [3000];
  ```
- **Why**: In cloud container environments, `process.env.PORT` is populated with `8080` for container ingress. Binding to `process.env.PORT` caused `Error: listen EADDRINUSE: address already in use 0.0.0.0:8080` because the container nginx reverse proxy was already bound to 8080. Express failed to listen on port 3000, causing nginx to proxy 502/HTML error pages to API callers. Restored strict platform-aware binding to port 3000 on Linux/container environments and port 3200 on Windows.

### Target File Path: `/src/components/MusicStudio.tsx`
- **Code Snippet**:
  ```typescript
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`Expected application/json but received ${contentType || 'non-JSON response'}`);
  }
  const data = await res.json();
  ```
- **Why**: Prevents `JSON.parse: unexpected character at line 1 column 1` error if a proxy or network error returns an HTML payload instead of valid JSON.

### Target File Path: `/src/components/LTXDiagnostic.tsx`
- **Code Snippet**:
  ```typescript
  if (diagRes.ok && (diagRes.headers.get('content-type') || '').includes('application/json')) {
    const diag = await diagRes.json();
  ```
- **Why**: Guards against non-JSON responses when polling system diagnostics.

### Target File Path: `/src/version.ts`, `/src/components/MilestoneChecklist.tsx`, `/package.json`, `/metadata.json`, `/index.html`, `/AGENTS.md`, `/README.md`, `/docs/EDIT_REQUESTS.md`
- **Code Snippet**:
  ```typescript
  export const APP_VERSION = '1.18.5';
  export const ACTIVE_SAVE_POINT_ID = 'RESTORE_V1.18.5_NETWORK_BINDING_MUSIC_STATUS_FIX';
  export const ACTIVE_LIFECYCLE_PHASE = 36;
  export const ACTIVE_LIFECYCLE_NAME = 'PHASE 36 — NETWORK BINDING PORT 3000 RESTORATION & MUSIC STATUS ROBUSTNESS';
  ```
- **Why**: Universal version synchronization and active save point protocol.




## v1.19.4 — Phase 44 Local AI Project Attachments & Large ZIP Ingestion (2026-09-12)

### Target File Path: `/src/components/LocalLlmStudio.tsx`
- **Exact Code Snippet / Code Block**:
  ```typescript
  const archive = extension === '.zip';
  if (archive) {
    await uploadAndActivateProject(file);
    return;
  }
  if (status?.engine === 'qwen-coder' && image) {
    setFileAttachError('Qwen Coder accepts project/text/code files, but image attachments require Qwen 2.5-VL Vision Mode.');
    return;
  }
  ```
  The Attach control is no longer locked in Qwen Coder. ZIPs use the dedicated project-workspace path, while images remain Vision Mode only. The separate Project ZIP control was removed so Attach is the single upload entry point.
- **Why**: Make Qwen Coder a practical coding interface for direct file analysis and project uploads without sending an entire archive into the LLM prompt.

### Target File Path: `/server.ts`
- **Exact Code Snippet / Code Block**:
  ```typescript
  const LOCAL_AI_UPLOAD_LIMITS = { image: 12 * 1024 * 1024, text: 2 * 1024 * 1024, archive: 100 * 1024 * 1024 };
  const LOCAL_AI_ZIP_MAX_FILES = 10000;
  const LOCAL_AI_ZIP_TEXT_TOTAL = 16 * 1024 * 1024;
  app.post('/api/llm/upload-attachment', express.raw({ type: '*/*', limit: '100mb' }), async (req, res) => {
  ```
- **Why**: Remove the former 100-file ZIP ceiling and allow larger project archives through the Local AI upload endpoint while retaining a bounded safety ceiling.

### Target File Path: `/src/components/MilestoneChecklist.tsx`
- **Exact Code Snippet / Code Block**:
  ```typescript
  { phase: 43, name: 'Target Update: Local AI Stack Optimization & UI Toggle Swap (RTX 3070 Ti 8GB)', status: 'COMPLETED' }
  { phase: 44, name: 'Local AI Project Attachments & Large ZIP Ingestion', status: 'COMPLETED', ... }
  { phase: 45, name: 'Web Browser Integration', status: 'PENDING', ... }
  ```
- **Why**: Close Phase 43, record Phase 44 completion, preserve Web Browser Integration as the next roadmap phase, and add the active Phase 44 restore point.

### Target File Path: `/src/version.ts`
- **Exact Code Snippet / Code Block**:
  ```typescript
  export const APP_VERSION = '1.19.4';
  export const ACTIVE_SAVE_POINT_ID = 'RESTORE_V1.19.4_PHASE44_LOCAL_AI_PROJECT_ATTACHMENTS';
  export const ACTIVE_LIFECYCLE_PHASE = 44;
  ```
- **Why**: Synchronize the authoritative application version and active lifecycle with the completed Phase 44 update.

### Target File Path: `/package.json`
- **Exact Code Snippet / Code Block**:
  ```json
  "version": "1.19.4"
  ```
- **Why**: Keep package metadata synchronized with `src/version.ts`.

### Target File Path: `/metadata.json`
- **Exact Code Snippet / Code Block**:
  ```json
  "version": "1.19.4",
  "release": "Phase 44 v1.19.4: Qwen Coder file attachments, dedicated project ZIP workspaces, automatic safe inspection, 100MB archive uploads and 10,000-file ZIP capacity"
  ```
- **Why**: Keep release metadata and model capability description aligned with the new Local AI upload architecture.

### Target File Path: `/index.html`
- **Exact Code Snippet / Code Block**:
  ```html
  <title>Gina AI Factory v1.19.4 — Local AI Project Attachments & Large ZIP Ingestion</title>
  <meta name="description" content="Gina AI Factory v1.19.4 with Qwen Coder file attachments, dedicated project ZIP workspaces, automatic safe inspection, large ZIP ingestion, coding validation, and local creator studios." />
  ```
- **Why**: Synchronize the browser title and description with the active release.

### Target File Path: `/AGENTS.md`
- **Exact Code Snippet / Code Block**:
  ```text
  Current version: v1.19.4
  Active lifecycle: PHASE 44 — LOCAL AI PROJECT ATTACHMENTS & LARGE ZIP INGESTION
  Active save point: RESTORE_V1.19.4_PHASE44_LOCAL_AI_PROJECT_ATTACHMENTS
  ```
- **Why**: Repair the previously stale project-memory header and document the Phase 44 operating rule, while preserving the mandatory Windows 3200/network rule.

### Target File Path: `/README.md`
- **Exact Code Snippet / Code Block**:
  ```markdown
  ## v1.19.4 — Local AI Project Attachments & Large ZIP Ingestion (2026-09-12)
  ```
- **Why**: Document the user-facing Qwen Coder attachment workflow, automatic safe inspection, archive capacity, and restore point.

### Target File Path: `/docs/INDEX.md`
- **Exact Code Snippet / Code Block**:
  ```text
  Gina AI Factory — Local Creator UI (v1.19.4)
  Qwen 2.5-VL Vision / Qwen 2.5 Coder, llama-server CUDA, 28-layer pin config
  ```
- **Why**: Remove stale top-level version/model documentation.

### Target File Path: `/docs/architecture/SYSTEM_ARCHITECTURE.md`
- **Exact Code Snippet / Code Block**:
  ```text
  Juggernaut-XL / FLUX.1 Lite & Wan 2.1 execution
  Qwen 2.5-VL / Qwen 2.5 Coder (28 GPU layers, up to 16K ctx)
  Before starting or restarting a local Qwen engine, Gina triggers
  ```
- **Why**: Align the architecture manifest with the active Qwen/Wan/FLUX Lite stack instead of stale Gemma/LTX runtime claims.

### Target File Path: `/docs/EDIT_REQUESTS.md`
- **Exact Code Snippet / Code Block**:
  ```markdown
  ## 🟩 Open Requests (Process sequentially)
  - [ ] None
  ## 🟨 In Progress
  - *None*
  ## 🟥 Completed Requests
  - [x] 2026-09-12 — Phase 44: Local AI Project Attachments & Large ZIP Ingestion
  ```
- **Why**: Restore the standardized persistent request queue format and record the Phase 44 completion without deleting unresolved work.

### Target File Path: `/CHANGELOG.md`
- **Exact Code Snippet / Code Block**:
  ```markdown
  ## v1.19.4 — Phase 44 Local AI Project Attachments & Large ZIP Ingestion (2026-09-12)
  ```
- **Why**: Record this update using the repository's mandatory per-file target/snippet/reason format so future agents can verify exactly what changed.

### Phase 44 compliance audit follow-up — 2026-09-12

### Target File Path: `/src/components/LocalLlmStudio.tsx`
- **Exact Code Snippet / Code Block**:
  ```typescript
  const archive = extension === '.zip';
  if (archive) {
    await uploadAndActivateProject(file);
    return;
  }
  ```
- **Why**: Ensure ZIP project uploads bypass the normal five-attachment turn limit and always enter the dedicated workspace import/inspection path.

### Target File Path: `/AGENTS.md`
- **Exact Code Snippet / Code Block**:
  ```text
  Current version: v1.19.4
  Active lifecycle: PHASE 44 — LOCAL AI PROJECT ATTACHMENTS & LARGE ZIP INGESTION
  Active save point: RESTORE_V1.19.4_PHASE44_LOCAL_AI_PROJECT_ATTACHMENTS
  Local Dashboard URL: http://127.0.0.1:3200/ on Windows; cloud containers use port 3000
  ```
- **Why**: Complete the mandatory project-memory/version/network consistency audit after the Phase 44 implementation.

### Phase 44 UI consistency follow-up — 2026-09-12

### Target File Path: `/src/App.tsx`
- **Exact Code Snippet / Code Block**:
  ```tsx
  <p className="text-xs text-slate-500 mt-1">Qwen 2.5-VL Vision / Qwen 2.5 Coder served locally by llama.cpp CUDA.</p>
  ```
- **Why**: Remove the stale Gemma label from the Local AI workspace header so the primary UI matches the active Qwen model stack.

### Target File Path: `/src/components/LocalCapabilityPanel.tsx`
- **Exact Code Snippet / Code Block**:
  ```typescript
  data.runtime?.wanReady
  data.runtime?.qwenCoderReady
  ['Wan Video', data.runtime?.wanReady, Video]
  ['Qwen Coder', data.runtime?.qwenCoderReady, Brain]
  ```
- **Why**: Make the live capability inventory report the active Wan 2.1 video and Qwen Coder runtimes instead of retired LTX/Gemma status fields.

### Phase 44 active-stack documentation consistency — 2026-09-12

### Target File Path: `/src/AppFeaturesGuide.tsx`
- **Exact Code Snippet / Code Block**:
  ```typescript
  title: 'Wan 2.1 & RIFE Motion Studio'
  badge: 'Wan 2.1 + RIFE'
  ```
- **Why**: Align the feature guide with the Phase 43 native Wan 2.1 video migration.

### Target File Path: `/src/components/GinaAgentPanel.tsx`
- **Exact Code Snippet / Code Block**:
  ```tsx
  control ComfyUI and manage the active Qwen local AI engines.
  ```
- **Why**: Remove stale Gemma wording from the active agent UI.

### Target File Path: `/src/components/gina-image/GinaImageSettings.tsx`
- **Exact Code Snippet / Code Block**:
  ```tsx
  FLUX.1 Lite high-precision text lane
  ```
- **Why**: Reflect the Phase 43 FLUX.1 Lite high-precision route instead of the retired Gemma Vision fallback label.

### Target File Path: `/src/components/LocalRagKnowledgePanel.tsx`
- **Exact Code Snippet / Code Block**:
  ```tsx
  Zero-VRAM local RAG alongside Qwen/ComfyUI
  Search local knowledge (e.g. 'VRAM cage', 'Qwen 28 layers', 'AIDA64 68 sensors')...
  ```
- **Why**: Keep the active RAG UI terminology consistent with the Qwen stack.

### Target File Path: `/src/components/MusicStudio.tsx`
- **Exact Code Snippet / Code Block**:
  ```tsx
  AI Lyrics Writer (Local Qwen / Built-in songwriter)
  AI Songwriter & Lyricist (Local Qwen)
  ```
- **Why**: The lyricist uses the active local LLM endpoint, so its UI must no longer identify the retired Gemma engine.

### Target File Path: `/server/rag/LocalRagEngine.ts`
- **Exact Code Snippet / Code Block**:
  ```text
  Gina releases ComfyUI cached models before starting/restarting the active Qwen engine.
  Video Workflow: Wan 2.1 1.3B BF16 with H.264 MP4 export and RIFE frame interpolation.
  ```
- **Why**: Prevent local RAG grounding from reintroducing retired Gemma/LTX runtime descriptions.

### Phase 44 root-cleanliness compliance — 2026-09-12

### Target File Path: `/flux_image.json`, `/flux_image_reference.json`, `/ltx_video.json`
- **Exact Code Snippet / Code Block**:
  ```text
  Deleted obsolete root-level workflow JSON files.
  ```
- **Why**: Enforce AGENTS.md Rule 5/8: workflow JSON belongs under `/workflows/`, and these root-level legacy files were no longer referenced by the active Phase 43/44 runtime. Removing them prevents stale LTX/FLUX workflow discovery outside the authoritative workflow directory.

## Phase 50 — Autonomous Research Engine, Repair Loop & GitHub Lifecycle — 2026-09-12

### Target File Path: `/server/agent/AutonomousResearchEngine.ts`
- **Exact Code Snippet / Code Block**:
  ```typescript
  export class AutonomousResearchEngine {
    async research(query: string, options: { deep?: boolean; maxResults?: number } = {}): Promise<ResearchResult> { ... }
    async verifyCompatibility(packageName: string, targetVersion?: string): Promise<{ compatible: boolean; details: string }> { ... }
  }
  ```
- **Why**: Provide automated documentation and library research by combining local zero-VRAM RAG retrieval with external web search (DuckDuckGo integration when GINA_WEB_ACCESS=true) and API signature caching.

### Target File Path: `/server/agent/AutonomousRepairLoop.ts`
- **Exact Code Snippet / Code Block**:
  ```typescript
  export class AutonomousRepairLoop {
    async executeRepairPipeline(request: RepairRequest, onProgress?: (step: string, details?: any) => void): Promise<RepairResult> { ... }
  }
  ```
- **Why**: Provide a 10-stage autonomous cycle (REQUEST → UNDERSTAND → PLAN → INSPECT → RESEARCH → EDIT → VALIDATE → REPAIR → SCAN → DIFF → COMMIT) with automated retries (up to 3 passes) driven by compiler diagnostics and DefinitionOfDoneGate checks.

### Target File Path: `/server/agent/GitHubLifecycleManager.ts`
- **Exact Code Snippet / Code Block**:
  ```typescript
  export class GitHubLifecycleManager {
    async getGitStatus(): Promise<GitStatusResult> { ... }
    async stageAndCommit(message: string, files?: string[]): Promise<{ commitSha: string; filesCommitted: string[] }> { ... }
    async createPullRequest(params: CreatePullRequestParams): Promise<PullRequestResult> { ... }
  }
  ```
- **Why**: Provide Git lifecycle automation (branching, staging, committing, diffing, and PR creation via GitHub REST API) using safe token resolution.

### Target File Path: `/server.ts`
- **Exact Code Snippet / Code Block**:
  ```typescript
  const researchEngine = new AutonomousResearchEngine(agentWorkspaceManager.getSandboxRoot(), localRagEngine);
  const githubLifecycleManager = new GitHubLifecycleManager(agentWorkspaceManager.getSandboxRoot());
  const repairLoop = new AutonomousRepairLoop(agentWorkspaceManager.getSandboxRoot(), researchEngine, dodGate, githubLifecycleManager);
  app.post("/api/agent/repair-loop", async (req, res) => { ... });
  app.post("/api/agent/research", async (req, res) => { ... });
  app.post("/api/agent/git/commit", async (req, res) => { ... });
  app.post("/api/agent/git/pr", async (req, res) => { ... });
  ```
- **Why**: Expose the autonomous repair loop, research engine, and GitHub lifecycle manager as tool actions and REST API endpoints.

### Target File Path: `/src/components/GinaAgentPanel.tsx`
- **Exact Code Snippet / Code Block**:
  ```tsx
  <button onClick={() => runAgentAction('run_repair_loop', { task: 'Autonomous codebase health repair' })} ...>
    Run Repair Loop
  </button>
  ```
- **Why**: Expose UI triggers for Definition of Done verification, Project Map inspection, and Autonomous Repair Loop execution.

### Target File Path: `/src/version.ts`
- **Exact Code Snippet / Code Block**:
  ```typescript
  export const APP_VERSION = '1.20.0';
  export const ACTIVE_SAVE_POINT_ID = 'RESTORE_V1.20.0_AUTONOMOUS_RESEARCH_REPAIR_GITHUB';
  export const ACTIVE_LIFECYCLE_PHASE = 50;
  export const ACTIVE_LIFECYCLE_NAME = 'PHASE 50 — AUTONOMOUS RESEARCH ENGINE, REPAIR LOOP & GITHUB LIFECYCLE';
  ```
- **Why**: Version bump and milestone save point synchronization for Phase 50.

### Target File Path: `/src/components/MilestoneChecklist.tsx`
- **Exact Code Snippet / Code Block**:
  ```typescript
  { phase: 50, name: 'Autonomous Research Engine, Repair Loop & GitHub Lifecycle', status: 'COMPLETED', details: 'Multi-stage autonomous repair loop, local RAG + DuckDuckGo research engine, Git branch/commit/diff/PR lifecycle automation, and Definition of Done gate integration.' }
  { id: 'RESTORE_V1.20.0_AUTONOMOUS_RESEARCH_REPAIR_GITHUB', label: 'Autonomous Research Engine, Repair Loop & GitHub Lifecycle', description: 'Production-ready AutonomousResearchEngine, multi-stage AutonomousRepairLoop pipeline, GitHubLifecycleManager, DefinitionOfDoneGate verification, and complete REST/SSE broker routes', timestamp: '2026-09-12 07:30', status: 'ACTIVE' }
  ```
- **Why**: Update active lifecycle phases and save points to reflect Phase 50 completion.

### Target File Path: `/package.json`, `/metadata.json`, `/index.html`, `/AGENTS.md`, `/README.md`, `/docs/INDEX.md`, `/docs/AI_UPDATE_CHECKLIST.md`
- **Exact Code Snippet / Code Block**:
  ```text
  Synchronized version to 1.20.0, release references to Phase 50, and updated platform truth.
  ```
- **Why**: Satisfy the Universal Version & Metadata Synchronization Guard and Definition of Done Gate.

