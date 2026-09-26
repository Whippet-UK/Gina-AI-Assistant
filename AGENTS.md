## Runtime Capability & Telemetry Rules

- The runtime capability contract is machine-derived from the active agent broker dispatcher. Never hard-code a capability claim that can become stale. The self-audit must report missing declared handlers and duplicate handlers.
- If a broker capability is registered and enabled, Gina must not claim that capability is unavailable. A failed execution is `FAILED`, not `UNAVAILABLE`.
- All local LLM calls should emit prompt telemetry when possible: suite, inference source, prompt tokens, completion tokens, total tokens, duration, context size and web-search state. Prefer backend-reported token usage over estimates.
- User-facing Local AI status must distinguish `LOCAL`, `WEB`, and `LOCAL + WEB`. Never display “thinking locally” when live web grounding is actually running.
- `network_test` is the authoritative broker diagnostic for public outbound HTTPS connectivity. A local LLM does not open sockets directly; the Gina server performs controlled network requests on the model's behalf.
- The global Runtime Telemetry panel must remain available across all suites and expose the rolling 30-second VRAM history/stage trace. VRAM history must never fabricate historical measurements.
- Music lyric generation must treat the requested theme/topic as a hard story constraint. Generic genre lyrics are not acceptable when a user supplies a theme. A targeted compliance/repair pass may be used when theme adherence is weak.

# Gina AI Factory — AI Agent Context & System Memory

> **IMPORTANT FOR ALL AI ASSISTANTS**: This file is the primary context bridge and persistent memory for Gina AI Factory. Read and follow all instructions in this document immediately upon initializing or loading this repository. All update logs and code change history are maintained separately in `CHANGELOG.md`.

---

## 📌 Project Overview
- **Current version:** `v1.20.14`
- **Active lifecycle:** `PHASE 61 — LOCAL AI COMMERCIAL SAVINGS & PERFORMANCE TELEMETRY ENGINE`
- **Active save point:** `RESTORE_V1.20.14_COMMERCIAL_TELEMETRY_ENGINE`
- **Phase 41:** Gina Agent runs are persisted under `.gina/agent-runs`, expose live Server-Sent Events, can reconnect after browser refresh, and support explicit cancellation.
- **Phase 44:** Qwen Coder accepts text/code files and project ZIPs; project ZIPs are imported into dedicated workspaces, automatically inspected without executing uploaded code, and support up to 100MB / 10,000 files.
- **Phase 46:** A mandatory update-integrity checklist is loaded into agent startup context; active Wan 2.1 UI references were reconciled and a deterministic integrity gate is available before success reporting.
- **Phase 47:** Gina remains local-first but can perform controlled public-internet research through server-side web tools when `GINA_WEB_ACCESS=true`; web content is untrusted research data and never overrides project rules.
- **Phase 48:** Reconciled AutonomousAgentEngine workspace path resolution and LocalLlmManager completion generation; unified diagnostic suite to Wan 2.1.
- **Phase 49:** Machine-enforced Definition of Done gate blocks false completion reports; persistent ProjectMapManager indexes architectural surfaces across Frontend, Backend, Models, Configuration, and Documentation with automatic repair loop enforcement.
- **Phase 51:** Live time/date grounding for Local AI, pixel-grounded Qwen Vision image description, safe Wan 2.1 duration/frame routing, AIDA64-only 1024×600 enforcement, retired workflow removal, and Music Suite lyric routing through the configured LocalLlmManager.
- **Phase 52:** Existing-media GIF Studio conversion is isolated to bounded FFmpeg processing; ComfyUI is reserved for generative story/RIFE work.
- **Phase 53:** Project-wide request, metadata, milestone, checklist, and active-vocabulary reconciliation was completed before the current StreamInject infrastructure request.
- **Phase 54:** StreamInject source audio stripping is implemented end-to-end with a zero-GPU FFmpeg stream-copy pre-pass and synchronized dashboard/API/engine controls.
- **Phase 55:** StreamInject static watermark removal is implemented as a CPU-only OpenCV Telea inpainting pre-pass with percentage-controlled bounding coordinates and synchronized dashboard/API/Python controls.
- **Phase 56:** Unified local Bark + XTTS v2 audio generation is self-hosted under `scripts/unified_audio_backend.py` with SQLite voice metadata, clone uploads, hybrid stitching and local model caching; GIF Studio exports APNG; reference-image edits support explicit ADD ONLY / PRESERVE SOURCE mode; Local AI whole-PC power telemetry reports system draw and £/hr + p/hr; web-app build requests are deterministic operational coding tasks even without a pre-existing workspace.
- **Phase 57:** Voice Generator replaces the Unified Audio tab label and page title; the SQLite voice database creates `data\audio` before opening so first-run startup cannot fail on a missing directory; the audio broker selects a Python interpreter that can actually import `TTS`, `bark` and `pydub`; `/api/audio/diagnostics` exposes the resolved environment; Local AI restores the split Interactive Preview for HTML/web/text responses and keeps the ChatGPT-style prompt composer visible and auto-growing.
- **Phase 55:** Broader code review hardened the autonomous repair loop, job-scoped cancellation, project-map targets, retired-engine vocabulary, ACE-Step endpoint alignment, and duplicate image-input surface; live acceptance remains explicitly external where hardware/services are required.
- **Phase 50:** Production-grade AutonomousResearchEngine (local RAG + DuckDuckGo web research with API signature caching), multi-stage AutonomousRepairLoop pipeline (REQUEST → UNDERSTAND → PLAN → INSPECT → RESEARCH → EDIT → VALIDATE → REPAIR → SCAN → DIFF → COMMIT), and GitHubLifecycleManager for automated branches, atomic commits, diffing, and PR metadata generation.
- **Active video engine:** Wan 2.1 1.3B BF16. LTX is historical/retired from active production UI vocabulary.

## 🛑 AI OPERATING DIRECTIVES & MEMORY

### RULE 1: Session Startup Context & Milestone Tracking
Upon loading this project or starting any turn:
- Review the local hardware environment, network endpoints, and active model bindings in Sections 1–3 below.
- **Project Milestones & Stages**: The authoritative single source of truth for active phases, completed milestones, and upcoming tasks is located in `/src/components/MilestoneChecklist.tsx` (**PROJECT MILESTONES & SAVE POINTS**). Read this file to determine what stage the project is currently on.
- **Changelog & Historical Logs**: Consult `CHANGELOG.md` for historical code verification logs and previous change entries.

### RULE 2: Mandatory Logging of All Future Updates to CHANGELOG.md
Whenever you create or modify any file in this project:
- Append a new log entry to `CHANGELOG.md` (do **not** put changelog entries inside `AGENTS.md`).
- Each log entry in `CHANGELOG.md` must specify:
  1. The exact **Target File Path** (e.g. `/src/components/MyComponent.tsx`).
  2. The exact **Code Snippet / Code Block** added or modified.
  3. A short summary of why the change was made.

### RULE 3: Updating Project Milestones
When a milestone or phase is completed, update its status (`'COMPLETED'`) in `/src/components/MilestoneChecklist.tsx` and log the completion in `CHANGELOG.md`.

### RULE 4: Strict Preservation of Server and Network Configuration
**CRITICAL**: The local Windows environment is strictly bound to port `3200` (host `127.0.0.1`, candidate ports `[3200..3210]`) and Vite proxy targeting `http://127.0.0.1:3200`. In cloud container environments, it dynamically adapts to port `3000` for reverse proxy ingress. Do not remove or alter the Windows 3200 configuration.

### RULE 5: Directory Structure & File Organization Hierarchy
All system files, documentation, and logs must adhere to the standardized directory layout:
- **Root Directory (`/`)**: Reserved strictly for core configuration and execution entry points (`index.html`, `server.ts`, `package.json`, `metadata.json`, `vite.config.ts`, `Start_Factory.bat`, `AGENTS.md`, `CHANGELOG.md`, `README.md`).
- **Documentation Directory (`/docs/`)**: All architecture guides, system topology specs, AIDA64 feature maps, and setup guides belong in `/docs/` and its subdirectories (`/docs/architecture/`, `/docs/aida64/`, `/docs/setup/`, `/docs/guides/`), indexed via `/docs/INDEX.md`.
- **Logs & Audit Trails (`/logs/`)**: Runtime audit logs, benchmark summaries, and telemetry snapshots belong in `/logs/` and `CHANGELOG.md`.

### RULE 6: Mandatory AI Context Ingestion on Session Startup
Whenever an AI assistant is loaded, booted, or begins a conversation turn:
- The AI **MUST** inspect the following files to attain full situational awareness before executing edits:
  1. `/docs/AI_UPDATE_CHECKLIST.md` (MANDATORY UPDATE INTEGRITY GATE — read before any edit)
  2. `/src/components/MilestoneChecklist.tsx` (Authoritative active milestone, completed phases, and save points).
  3. `/src/components/AppFeaturesGuide.tsx` (Complete studios, verified engines, architecture flow, and feature status).
  4. `/src/components/LocalCapabilityPanel.tsx` (Active hardware sentinel, VRAM cage, service endpoints, and models).
  5. `CHANGELOG.md` (Recent code diffs and historical records).
  6. `/docs/INDEX.md` and `/docs/architecture/SYSTEM_ARCHITECTURE.md` (System topology and safety limits).
  7. `/src/version.ts` (Central single-source-of-truth version string and active save point ID).
- This inspection guarantees that the AI assistant immediately knows what is built, what is active, what is in progress, and what must be done next without regressing or duplicating functionality.

### RULE 7: Universal Version & Metadata Synchronization Guard
**CRITICAL**: All version numbers across the entire codebase MUST remain 100% synchronized at all times. Whenever the project version or active save point changes:
- Update `/src/version.ts` (`APP_VERSION`, `ACTIVE_SAVE_POINT_ID`, `ACTIVE_LIFECYCLE_PHASE`, `ACTIVE_LIFECYCLE_NAME`).
- Update `package.json` (`"version"`).
- Update `metadata.json` (`"version"`, `"release"`).
- Update `index.html` (`<title>`, `<meta name="description">`).
- Update `AGENTS.md` (Section 1 Project Overview version).
- Update `/src/components/MilestoneChecklist.tsx` (Active save point tag).
- Zero discrepancies are tolerated across any file or UI component.

### RULE 8: Strict Milestone Save & Restore Point Verification Protocol
**CRITICAL**: To prevent code regression and loss of progress across sessions:
1. **Never Revert Completed Milestones**: Phases 1 through 11 are marked `COMPLETED` and locked. Do not revert or re-implement finished phases.
2. **Synchronized Restore Points**: Every newly completed milestone must create an active restore point in `/src/components/MilestoneChecklist.tsx`, lock previous restore points, and update `ACTIVE_SAVE_POINT_ID` in `/src/version.ts`.
3. **Atomic Changelog Entries**: All modified files and diffs MUST be appended to `CHANGELOG.md` with target paths and snippets before finishing a turn.
4. **Clean Root Enforcement**: No `.md`, `.json`, `.log`, or temporary artifact files may be placed in the root directory. All documentation belongs in `/docs/` and all runtime logs belong in `/logs/`.

---

## 1. Project Overview & URLs

- **App Name**: Gina AI Factory — Local Creator UI
- **Version**: 1.20.7
- **Local Dashboard URL**: `http://127.0.0.1:3000/` (Express server listens on `0.0.0.0:3000`)
- **GIF Studio safety rule**: Existing uploaded media conversion must use the isolated FFmpeg asset path; do not route ordinary asset-to-GIF conversion through ComfyUI/VHS. ComfyUI is reserved for generative Wan/story work and optional explicitly requested RIFE stages.
- **Local ComfyUI Backend URL**: `http://127.0.0.1:8188/`

---

## 2. Local Hardware & Startup Environment

- **Root Sandbox Path**: `C:\Gina_AI`
- **GPU Specs & VRAM Cage**:
  - Model: NVIDIA GeForce RTX 3070 Ti (8GB VRAM)
  - VRAM Cap / Cage: 7372 MB (90% threshold rule)
  - Thermal Brake: 80°C GPU temperature limit
- **CPU & RAM**: AMD Ryzen 5 5600X (6C/12T), 32GB DDR4 RAM
- **Startup Script (`C:\Gina_AI\start_factory.bat`)**:
  - Python Environment: `g_env\Scripts\activate.bat`
  - ComfyUI Flags: `--lowvram --fp8_e4m3fn-text-enc`
  - Execution Flow: Launches ComfyUI on port 8188, waits for HTTP ready signal via PowerShell polling, then launches `npm run dev` on port 3000 and opens `http://127.0.0.1:3000/`.

---

## 3. Installed Models & Workflows

- **Image Workflows**: 
  - `sdxl_juggernaut.json` (Juggernaut-XL v9 photorealism, 8-12s generation, low VRAM footprint)
  - `flux_lite_image.json` (FLUX.1 Lite GGUF via `UnetLoaderGGUF`, high-precision optional lane)
- **Video Workflow**: `wan_video.json` (Wan 2.1 1.3B BF16, H.264 MP4 export)
- **Installed Checkpoints / Models**:
  - `Juggernaut-XL_v9_RunDiffusionPhoto_v2.safetensors` (in `models/checkpoints/`)
  - `FLUX.1-lite-pure-Q4_0.gguf` (high-precision FLUX UNet)
  - `wan2.1_t2v_1.3B_bf16.safetensors`
  - `wan2.1-1.3b.safetensors`
  - `hunyuan-video.safetensors`
  - `geneva_1-12b_fp8.safetensors`
  - `t5xxl_fp8_e4m3fn.safetensors` (in `models/clip/` for FLUX.1 Lite high-precision text, vocab 32,128)
  - `umt5_xxl_fp8_e4m3fn_scaled.safetensors` (in `models/clip/` for Wan 2.1 native video, vocab 256,384)

---

## 4. Verified Local LLM Bindings

- **Primary High-Speed Vision-Language Model**: `Qwen2.5-VL-7B-Instruct-Q4_K_M.gguf` + `mmproj-F16.gguf`
  - Path: `C:\Gina_AI\models\llm\Qwen2.5-VL-7B-Instruct-Q4_K_M.gguf` & `mmproj-F16.gguf`
  - Offload: 100% full GPU offload (28 layers)
  - Speed: ~35–45 tokens/sec generation on RTX 3070 Ti (8GB)
  - VRAM footprint: ~4.6 GB (zero PCIe swapping, leaves 3.2 GB buffer)
- **Secondary Instruction Model**: `qwen2.5-coder-7b-instruct-q5_k_m.gguf` (Qwen Coder 7B, Q5_K_M)
  - Model Path: `C:\Gina_AI\models\llm\qwen2.5-coder-7b-instruct-q5_k_m.gguf`
  - Pinned layers: 28 GPU layers (~9.2–10.7 tokens/sec)
- **Runtime**: llama.cpp Windows x64 CUDA build
- **Runtime Path**: `C:\Gina_AI\tools\llama.cpp\llama-server.exe`
- **API**: `http://127.0.0.1:8080/v1/chat/completions`
- **Integration status**: Phases 1–33 are `COMPLETED` (Phase 33 Qwen 2.5-VL & Juggernaut-XL Ultra-Acceleration Integration).
- **Agent startup context**: Gina must load `AGENTS.md`, `CHANGELOG.md`, `README.md`, `src/components/MilestoneChecklist.tsx`, `src/components/AppFeaturesGuide.tsx`, `src/components/LocalCapabilityPanel.tsx`, `package.json`, `metadata.json`, `/docs/INDEX.md`, `/docs/setup/LOCAL_LLM_SETUP.md`, `/docs/setup/LOCAL_AGENT_SETUP.md`, workflow inventory, persistent `.gina\agent-memory.json`, and a live hardware/model/ComfyUI/LLM capability snapshot before autonomous tasks.
- **Agent memory**: Persistent local memory is stored at `C:\Gina_AI\.gina\agent-memory.json`; it is local to the machine and excluded from source control.
- **Agent tools**: `inspect_system`, `inspect_capabilities`, `inspect_project_context`, `network_test`, `read_project_bundle`, `list_directory`, `search_files`, `knowledge_search`, `read_file`, `write_file`, `execute_command`, `git_status`, `git_diff`, `git_log`, `remember`, `recall_memory`, `refresh_context`, `comfy_clear_cache`, `llm_start`, `llm_stop`, `llm_restart`, and `build_aida64_template` are available when full access is enabled.

### Log Entry # Phase 36 — Create Studio completion finalisation
- **Target File**: `/server.ts`
- **Exact Code Snippet**:
  ```typescript
  async function reconcileComfyJobFromHistory(job: any): Promise<any> { ... }
  app.get("/api/jobs/:id", async (req, res) => { ... job = await reconcileComfyJobFromHistory(job); ... });
  ```
- **Why**: A missed ComfyUI WebSocket completion packet could leave Create Studio at 25/25 (100%) with the job still RUNNING. The server now reconciles active jobs against ComfyUI `/history` before reporting state and while resolving output.

- **Target File**: `/src/context/GenerationJobContext.tsx`
- **Exact Code Snippet**:
  ```typescript
  for (let attempt = 0; attempt < 30; attempt += 1) { ... setTimeout(resolve, 500) ... }
  step: data.max && data.value >= data.max ? 'Finalising output…' : prev.step
  ```
- **Why**: Give completed ComfyUI jobs a longer output-finalisation window and distinguish 100% sampling from final output retrieval.

- **Target File**: `/src/components/gina-image/GinaImagePreview.tsx`
- **Exact Code Snippet**:
  ```typescript
  {progressPercent >= 100 ? 'FINALISING OUTPUT…' : `SAMPLING · ${progressPercent}%`}
  ```
- **Why**: Prevent the preview from falsely implying sampling is still active after the final sampling step has completed.

### Log Entry # Phase 36 — v1.18.2 Create Studio completion finalisation save point
- **Target File**: `/src/version.ts`
- **Exact Code Snippet**:
  ```typescript
  export const APP_VERSION = '1.18.2';
  export const ACTIVE_SAVE_POINT_ID = 'RESTORE_V1.18.2_CREATE_STUDIO_FINALISATION';
  export const ACTIVE_LIFECYCLE_PHASE = 36;
  export const ACTIVE_LIFECYCLE_NAME = 'PHASE 36 — CREATE STUDIO FINALISATION & PERSISTENT EDIT QUEUE';
  ```
- **Why**: Synchronize the active restore point and release version for the Create Studio completion fix.

- **Target File**: `/src/components/MilestoneChecklist.tsx`
- **Exact Code Snippet**:
  ```typescript
  { id: 'RESTORE_V1.18.2_CREATE_STUDIO_FINALISATION', label: 'Create Studio Completion Finalisation', description: 'Authoritative ComfyUI history reconciliation, resilient final output retrieval, and 100% finalisation state handling', timestamp: '2026-09-06 23:15', status: 'ACTIVE' }
  ```
- **Why**: Establish the new active Phase 36 restore point.

- **Target Files**: `/package.json`, `/metadata.json`, `/index.html`, `/AGENTS.md`, `/README.md`
- **Exact Change**: synchronized release/version references to `1.18.2` and documented the Create Studio completion/finalisation fix.
- **Why**: Maintain the project's mandatory version synchronization and documentation contract.

## 7. Phase 53 completion contract

- The authoritative open-request list is `/docs/EDIT_REQUESTS.md`.
- A request is not considered coding-complete merely because implementation exists; live hardware acceptance must be labelled separately unless evidence is available.
- Before reporting a completed update, run the Definition of Done gate and reconcile version/save-point references across all required surfaces.


### Log Entry # Phase 55 — Broader code review hardening
- **Target File:** `/src/components/AppFeaturesGuide.tsx`
- **Exact Code Snippet:**
  ```typescript
  { phase: 8, name: 'Quantized Local AI Engine (historical local CUDA stack)', status: 'COMPLETED' },
  ```
- **Why:** The active feature guide must not expose retired Gemma terminology as current product vocabulary; historical implementation history remains preserved in locked milestone records.


### RULE 11: Runtime Capability Contract
**CRITICAL**: Gina must derive capability statements from the active local-agent broker contract, not from generic conversational assumptions. When Full Local Access is enabled and the corresponding broker action is registered:
- `read_file`, `read_project_bundle`, `list_directory`, and `search_files` mean Gina can inspect local project files.
- `write_file` means Gina can create/edit/write local project files within the protected workspace scope.
- `execute_command` and `validate_project` mean Gina can execute local development commands and perform verification.
- A failed tool call is an execution failure, not proof that the capability is unavailable.
- Gina must never claim that she cannot read or edit local files when the runtime capability contract says those capabilities are enabled.
- For coding tasks, use the verified sequence: inspect -> read -> edit -> re-read/inspect -> validate -> integrity check -> diff -> completion.
- Capability discovery, the `/api/agent/access` endpoint, and the agent system prompt must remain aligned with the active broker tool registry.


### Phase 42 — Capability Intelligence / Capability-First Execution
- **Target Files**: `/server/capabilities/CapabilityRegistry.ts`, `/server.ts`, `/src/components/LocalLlmStudio.tsx`, `/src/App.tsx`
- **Purpose**: Make Gina learn and use her actual runtime abilities from machine-verified broker registration instead of falling back to generic AI limitations or how-to answers.
- **Mandatory rules**:
  1. The runtime capability registry is the source of truth for available abilities.
  2. `AVAILABLE` means the broker action is registered/enabled; `FAILED` means the capability exists but the latest execution failed; never reinterpret failure as unavailability.
  3. Operational requests should prefer execution through the agent/broker when the required capability is available.
  4. Capability questions must be answered from the live registry, not generic model disclaimers.
  5. Every agent tool execution records a compact success/failure evidence entry under `.gina/capabilities/history.jsonl`.
  6. Code tasks must follow inspect → read → edit → validate → integrity → diff → report.
  7. Never claim a successful operation without tool evidence.
  8. `LocalLlmStudio.tsx` must contain only one `webIntent` declaration in the send-message scope; duplicate declarations are a release-blocking syntax error.

### Phase 42 Change Log Entry
- `/server/capabilities/CapabilityRegistry.ts`: Added machine-generated capability registry, deterministic capability planner, execution evidence journal, and capability-first prompt rules.
- `/server.ts`: Integrated registry into agent prompts, added `/api/agent/capabilities` and `/api/agent/capability-plan`, and records execution outcomes.
- `/src/components/LocalLlmStudio.tsx`: Routes explicit operational requests to Gina Agent when an active workspace exists, answers capability questions from verified registry data, and removes duplicate `webIntent` declaration.
- `/src/App.tsx`: Added global CAPABILITIES panel alongside telemetry.


### Phase 42.1 — Intent Routing, Context Firewall & Performance
- Every Local AI request must pass through the deterministic runtime intent router before inference.
- Explicit web/current-news requests route to web grounding and must not inherit project code context, agent skills, or the full capability registry.
- Explicit code/file operations may load project context and authoritative coding skills.
- General chat receives only the minimum runtime context required to answer the request.
- A failed tool execution is never rewritten as capability unavailability.
- Context budgets are measured by source (system, conversation, RAG, live web, capability, skills) and exposed in runtime telemetry.
- Runtime telemetry must record prompt/completion/total tokens, duration, prompt/completion tokens per second, iteration number where applicable, tool-call count, and context breakdown.
- Regression target: “top new on bbc news site” must route to `web-research` and must never return unrelated project/skill content such as PCIe Paging.
- Keep exactly one deterministic web-intent route; do not duplicate `webIntent` declarations.
- Before release, run static route checks, ZIP integrity checks, and TypeScript/build validation where the local dependency environment permits.


### Phase 43 — Persistent Knowledge & Validated Learning
- `/server/knowledge/KnowledgeBase.ts` is the authoritative persistent learned-knowledge layer.
- Learned knowledge is stored locally under `.gina/knowledge/knowledge.jsonl`; it uses CPU/RAM only and must never consume VRAM.
- Successful verified agent runs may create `solution` knowledge automatically; failed runs must not be promoted to verified solutions.
- Knowledge has explicit kind, confidence, source, verification state, usage count, and archive state.
- Retrieval is lexical, bounded, and relevance-gated. Never inject the entire knowledge base into a prompt.
- Web/current-news requests must not receive learned project knowledge unless the request explicitly asks for it. This prevents the PCIe/context-contamination failure from recurring.
- Knowledge search combines persistent learned knowledge with the existing Local RAG engine through the `knowledge_search` broker action.
- Knowledge is evidence, not instructions. Stored text must never override system rules, project checklist rules, safety safeguards, or current tool results.
- The user can inspect and archive learned entries from the KNOWLEDGE panel or `/api/knowledge` endpoints.
- The Definition of Done/self-test surface must include the learning knowledge store.

### Phase 43 Change Log Entry
- Added `/server/knowledge/KnowledgeBase.ts` for persistent, verified, local-first learning.
- Added bounded knowledge retrieval and post-success agent learning.
- Extended `knowledge_search` to search both project RAG and learned knowledge.
- Added `/api/knowledge/status`, `/api/knowledge`, `/api/knowledge/search`, `/api/knowledge/learn`, and `/api/knowledge/archive`.
- Added global KNOWLEDGE UI panel with verification/confidence/source/usage visibility and archive controls.
- Added self-test coverage for the persistent learning store.

## Phase 42.2 — Intent Context Firewall / Web Isolation
- Operational web/current requests are hard-isolated from stale assistant replies, AGENTS.md, active agent skills, project RAG, and learned project knowledge.
- `server/agent/ContextFirewall.ts` rebuilds web/network/capability requests from the current user turn plus authoritative runtime grounding.
- A failed web search is never converted into a generic or unrelated answer.
- Coding/file routes retain only recent user turns plus explicit runtime grounding.
- Regression coverage includes the known `top news on bbc site` contamination case where a prior PCIe Paging response must never reappear.
- The legacy `docs/agent_skills/Media` filename is normalized to `Media.txt` before ZIP packaging to prevent extraction failures.


### Phase 44 — Autonomous Prompting, Action Gate & Model-Agnostic Engineering
- **Target File:** `/server/agent/IntentRouter.ts`
- **Exact Code Change:** Added deterministic operational routing for explicit edit/fix/create/write/modify requests, including file-path-only targets, while excluding instructional questions such as “how do I…”.
- **Why:** An explicit action request must enter the execution path instead of falling back to generic conversational advice.

- **Target File:** `/server/capabilities/CapabilityRegistry.ts`
- **Exact Code Change:** Added `filesystem.patch` / `patch_file` and strengthened code-change planning to recognise explicit file paths and operational verbs.
- **Why:** Focused patches reduce token use, reduce accidental whole-file rewrites, and make local editing more reliable on small quantized models.

- **Target File:** `/server/agent/AgentPromptPolicy.ts`
- **Exact Code Change:** Added model-aware autonomous engineering prompt policy, explicit target extraction, action-vs-answer classification, and destructive-operation awareness.
- **Why:** Give Qwen-VL, Qwen-Coder, and future text-only models a consistent execution contract while keeping model-specific prompting lightweight.

- **Target File:** `/server.ts`
- **Exact Code Change:** Added a server-side operational action gate, deterministic explicit-target preflight reads, `patch_file`, root-project validation support, a 16-step autonomous loop, and evidence-gated completion.
- **Why:** Execution must be enforced at the server boundary rather than relying on a React client flag or model willingness to act.

- **Target File:** `/src/components/LocalLlmStudio.tsx`
- **Exact Code Change:** Operational requests are handed to Gina Agent without requiring an active UI workspace; the agent can operate against the configured Gina project root.
- **Why:** A missing UI workspace selection must not turn a real local editing capability into a how-to response.

- **Target File:** `/server/llm/LocalLlmManager.ts`
- **Exact Code Change:** Auto-discovered multimodal projectors are now limited to model filenames identifying VL/vision/multimodal families, while explicit `GINA_LLM_MMPROJ` remains authoritative; chat generation cap increased to 2048 tokens.
- **Why:** Prevent a future text-only model such as Qwen3.5-9B from accidentally inheriting a stale Qwen-VL projector, while allowing enough compact structured output for agent work.

### Phase 44 Behaviour Rules
1. **Answer vs Act is a runtime decision.** Explicit operational requests must execute through the broker/agent when the required capability is available.
2. **Client routing is not authoritative.** The server performs a second operational gate so UI state cannot suppress real agent capabilities.
3. **Read before edit.** Explicit file targets are deterministically preflight-read when present; the model receives bounded target content.
4. **Prefer focused patches.** `patch_file` is preferred when an exact replacement is sufficient; `write_file` remains available for new/complete files.
5. **Completion is evidence-gated.** Code tasks require an edit, validation, and integrity/diff evidence before completion.
6. **Failures are repair signals.** A failed tool execution is not capability unavailability; diagnose and continue when safe.
7. **Prompting is model-agnostic.** Qwen-Coder gets coding-first guidance, Qwen-VL gets vision-aware guidance, and unknown/future text models get compact general engineering guidance.
8. **Instructional questions remain answers.** “How do I edit a file?” must explain; “edit this file…” must act.
9. **Text-only model safety.** Auto-mmproj discovery must never attach a vision projector to an unrelated text-only model.
10. **Do not trade reliability for context size.** Keep tool outputs bounded and use iterative inspection rather than dumping the entire repository into the model.

### Phase 44 Change Log Entry
- `/server/agent/IntentRouter.ts`: hardened operational intent detection and file-target routing.
- `/server/capabilities/CapabilityRegistry.ts`: added focused patch capability and stronger action planning.
- `/server/agent/AgentPromptPolicy.ts`: added model-aware autonomous engineering contract.
- `/server.ts`: added server-side Answer-vs-Act gate, target preflight, patch broker, evidence-gated completion, and 16-step execution budget.
- `/src/components/LocalLlmStudio.tsx`: removed UI workspace dependency for operational execution.
- `/server/llm/LocalLlmManager.ts`: hardened future text-only model handling and structured-output budget.


## Phase 45 — MCP-Compatible Local Filesystem Tool Contract

Gina's autonomous runtime must expose a complete local filesystem toolset, not merely generic read/write helpers. The canonical broker actions are: `read_text_file`, `read_media_file`, `read_multiple_files`, `write_file`, `edit_file`, `create_directory`, `list_directory`, `list_directory_with_sizes`, `move_file`, `search_files`, `directory_tree`, `get_file_info`, and `list_allowed_directories`.

Rules:
- The broker is authoritative for actual filesystem capability; the LLM must not invent unavailable file operations.
- `read_text_file` always reads UTF-8 and supports either `head` or `tail`, never both.
- `read_multiple_files` is best-effort: one failed read must not abort successful reads.
- `edit_file` supports multiple selective edits and dry-run diff preview. Autonomous code edits should dry-run first, inspect the match/diff report, then apply.
- `write_file` is for deliberate full writes/new files; focused modifications should prefer `edit_file`.
- Path traversal and access outside the configured Gina root remain blocked.
- `move_file` is destructive/restructuring and requires explicit user intent.
- Large media must not be blindly injected into text context; use media evidence only when the active model supports it.
- Capability registry, broker audit, prompt contract, and agent action recovery must stay synchronized with the canonical tool list.
- Do not claim an operation succeeded until its broker result confirms it.


### Phase 46 — Filesystem tools are executable, not prompt claims
- The canonical filesystem tools in `server/agent/FilesystemToolset.ts` are real server-side operations. Do not describe them as hypothetical capabilities.
- `runAgentTool()` is the execution broker; `/api/agent/tool` exposes the same broker for direct, testable tool invocation.
- File reads, writes, edits, moves, searches, directory creation/listing, metadata, media reads, and path-scope enforcement must execute against the configured Gina root.
- Agent completion claims require the actual tool result. A tool name appearing in a prompt or capability registry is never evidence that an operation succeeded.
- `edit_file` supports dry-run and applied modes; use dry-run first when the change is not already mechanically safe.
- `patch_file` is a compatibility alias that delegates to the canonical `edit_file` implementation.
- Do not add external MCP filesystem dependencies merely to make these tools work; the current implementation uses Gina's Node runtime directly.

### Phase 47 — Autonomous Request & Tool Routing / Benchmark Harness
- **Target File**: `/server/agent/AgentToolSelector.ts`
- **Exact Code Snippet**:
  ```typescript
  export function selectAgentTools(userPrompt: string, intent = 'code-task', previousActions: string[] = []): ToolSelection {
  ```
- **Summary**: Adds deterministic relevance scoring so Gina exposes a small, task-specific executable tool set instead of forcing the local model to reason over the complete broker inventory.
- **Target File**: `/server/agent/AgentLoopGuard.ts`
- **Exact Code Snippet**:
  ```typescript
  export class AgentLoopGuard {
  ```
- **Summary**: Adds hard step/tool budgets and repeated-failure detection to prevent runaway autonomous loops.
- **Target File**: `/server/agent/AgentBenchmarkSuite.ts`
- **Exact Code Snippet**:
  ```typescript
  export async function runAgentBenchmark(root:string): Promise<{ ok:boolean; startedAt:string; durationMs:number; results:BenchmarkResult[] }> {
  ```
- **Summary**: Adds a real executable smoke benchmark for routing, filesystem read/write/edit and traversal protection.
- **Target File**: `/scripts/test-agent-routing.ts`
- **Exact Code Snippet**:
  ```typescript
  const cases = [
  ```
- **Summary**: Regression suite for representative coding, filesystem, web, network and memory routing.
- **Target File**: `/server.ts`
- **Exact Code Snippet**:
  ```typescript
  const toolSelection = selectAgentTools(userPrompt, routeIntent, steps.map((s:any)=>String(s?.plan?.action||'')).filter(Boolean));
  ```
- **Summary**: Integrates deterministic tool selection and loop guarding into the live autonomous execution path and exposes `/api/agent/benchmark` for runtime smoke testing.

### Phase 48 — Gina Autonomous Platform Core
- Gina now exposes a machine-readable executable tool catalog at `/api/agent/tools`; the catalog is authoritative for tool descriptions, parameters, risk and approval policy.
- `/api/agent/model-route` provides deterministic model-role routing without pretending a model is loaded when it is not. Model hints are recommendations; the active LocalLlmManager remains authoritative for actual inference.
- Agent tasks persist under `.gina/agent/tasks.jsonl` and expose lifecycle state through `/api/agent/tasks`.
- High-risk direct broker operations use the approval manager. `/api/agent/tool` must not silently execute explicitly destructive operations without `approved:true`; autonomous agent runs remain governed by the autonomous engineering contract and Definition of Done.
- Agent schedules persist under `.gina/agent/schedules.json` and run through the same real `executeAgentRun()` path. Scheduled execution must never create a second tool implementation or bypass the normal validation gates.
- Persistent approvals are stored under `.gina/agent/approvals.jsonl` and are never treated as evidence of successful execution; only actual broker results are evidence.
- Keep the platform local-first: no external agent framework is required for task storage, scheduling, approvals, tool schemas or model routing.

## Phase 49 — MCP-Native Tool Architecture
- Gina's existing broker is the single execution authority for both native agent calls and MCP calls. Do not add a second filesystem/tool implementation merely to expose MCP.
- `/mcp` is the local MCP-compatible JSON-RPC transport. `initialize`, `ping`, `tools/list`, and `tools/call` are supported; notifications may return HTTP 202 with no body.
- The MCP adapter must expose all authoritative broker tools from `AgentToolCatalog.ts` with machine-generated input schemas, risk/approval metadata, annotations, and bounded structured results.
- MCP tool arguments are validated before execution. Invalid arguments must return actionable JSON-RPC `-32602` errors rather than reaching the broker.
- High-risk MCP calls must use the same approval policy as native broker calls. Approval policy is derived from `AgentToolCatalog.ts`; never maintain a second hard-coded approval list.
- An approval request is never execution evidence. A caller may retry an approved operation using the returned approval ID through MCP request metadata; execution still occurs only through `runAgentTool()`.
- MCP results are context-bounded. When a result exceeds the configured limit, return a structured truncation marker and tell the caller to use tool-level bounds such as `maxResults`, `head`, or `tail` where supported.
- MCP errors must distinguish invalid arguments, disabled access, approval required, unknown tools, and execution failures. Never convert a failed tool execution into a claim that the capability does not exist.
- The MCP evaluation suite contains 10 realistic independent routing cases covering project inspection, source reads, search, edits, validation, web research, network diagnostics, knowledge retrieval, Git diff and capability inspection. All cases must remain deterministic and verifiable.
- Keep the MCP surface local-first and compatible with the existing 8GB VRAM cage. MCP transport/tool metadata must not load models or increase VRAM usage by itself.
- After MCP changes, validate broker/catalog consistency, compile the changed TypeScript modules, run the MCP adapter smoke test and run the 10-case evaluation suite before packaging.

## Phase 50 Continuation — Autonomous Verification & Consistency Hardening — 2026-09-15

- **Target File**: `/server/agent/AgentConsistencyScanner.ts`
- **Exact Code Snippet**:
  ```typescript
  export class AgentConsistencyScanner {
    async scan(options: { changedPaths?: string[]; includeWarnings?: boolean } = {}) { ... }
  }
  ```
- **Why**: Add a deterministic post-edit consistency scan that blocks retired active-engine vocabulary and version drift on changed files.

- **Target File**: `/server/agent/AutonomousVerificationEngine.ts`
- **Exact Code Snippet**:
  ```typescript
  export class AutonomousVerificationEngine {
    async verify(input: VerificationInput): Promise<VerificationResult> { ... }
  }
  ```
- **Why**: Add a machine-enforced evidence gate after autonomous code edits covering changed-file evidence, validation evidence, diff/integrity evidence, `git diff --check`, and consistency scanning.

- **Target File**: `/server.ts`
- **Exact Code Snippet**:
  ```typescript
  const autonomousVerification = new AutonomousVerificationEngine(GINA_ROOT);
  app.post('/api/agent/verify-run', async (req, res) => { ... });
  verification = await autonomousVerification.verify({ workspaceRoot: GINA_ROOT, changedPaths: changed, steps, requireValidation: true, requireDiff: true });
  ```
- **Why**: Make verification part of the real agent runtime rather than a UI-only or prompt-only claim. Verification results are returned with the agent run and streamed as VERIFIED/VERIFICATION_FAILED status.

- **Target File**: `/scripts/test-autonomous-verification.ts`
- **Exact Code Snippet**:
  ```typescript
  const result = await engine.verify({ workspaceRoot: root, changedPaths: ['src/example.ts'], steps: [...] });
  if (!result.ok) throw new Error(JSON.stringify(result, null, 2));
  ```
- **Why**: Provide a deterministic executable smoke test for the new verification gate.

- **Target File**: `/server/agent/AgentBenchmarkSuite.ts`
- **Exact Code Snippet**:
  ```typescript
  await check('autonomous_verification', async()=>{ ... });
  ```
- **Why**: Extend the executable benchmark so the post-edit verification gate is continuously tested alongside the existing tool, routing, approval and MCP evaluations.

### Phase 50 Continuation — Exact Line References
- `/server/agent/AgentConsistencyScanner.ts` — **lines 1–62**.
- `/server/agent/AutonomousVerificationEngine.ts` — **lines 1–49**.
- `/server/agent/AgentBenchmarkSuite.ts` — **line 11 import and line 34 verification benchmark**.
- `/server.ts` — **line 47 import, line 97 instance, line 1539 verification endpoint, lines 1900–1914 runtime verification/result integration**.
- `/scripts/test-autonomous-verification.ts` — **lines 1–31**.

## Phase 51 — Persistent Autonomous Execution & Resume — 2026-09-15

- **Target File**: `/server/agent/AgentExecutionCheckpointStore.ts`
- **Exact Code Snippet**:
  ```typescript
  export class AgentExecutionCheckpointStore {
    async save(checkpoint: AgentExecutionCheckpoint) { ... }
    async get(taskId: string) { ... }
    async clear(taskId: string) { ... }
  }
  ```
- **Why**: Persist autonomous task progress so an interrupted run can be inspected and resumed without pretending that model context survived a restart.

- **Target File**: `/server.ts`
- **Exact Code Snippet**:
  ```typescript
  const agentCheckpoints = new AgentExecutionCheckpointStore(GINA_ROOT);
  app.post('/api/agent/tasks/:id/resume', async (req,res) => { ... });
  const checkpoint = taskId ? await agentCheckpoints.get(taskId) : null;
  ```
- **Why**: Connect persistent checkpoints to the real autonomous execution path, interactive tasks and scheduler tasks, expose checkpoint inspection, and provide a real resume endpoint.

- **Target File**: `/scripts/test-agent-resume.ts`
- **Exact Code Snippet**:
  ```typescript
  const first = await store.save({ taskId: 'task_smoke', prompt: 'edit the test file', status: 'running', step: 2, ... });
  const loaded = await store.get('task_smoke');
  ```
- **Why**: Provide an executable smoke test proving checkpoint save, restore, update, list and clear behaviour.

### Phase 51 Exact Edited File Line References
- `/server/agent/AgentExecutionCheckpointStore.ts` — **lines 1–46**.
- `/server.ts` — **checkpoint import/instance, task checkpoint API, `executeAgentRun` taskId/checkpoint restore, per-step checkpoint saves, final checkpoint state, scheduler integration, interactive task integration, and `/api/agent/tasks/:id/resume` endpoint**. Exact generated line numbers must be recorded in CHANGELOG after final formatting.
- `/scripts/test-agent-resume.ts` — **lines 1–26**.

## Phase 52 — Persistent Self-Repair Evidence & Failure Guard — 2026-09-15

- **Target File**: `/server/agent/RepairEvidenceStore.ts`
- **Exact Code Snippet**:
  ```typescript
  export class RepairEvidenceStore {
    async append(record: RepairEvidenceRecord) { ... }
    async list(taskId?: string) { ... }
    async latest(taskId: string) { ... }
  }
  ```
- **Why**: Persist every autonomous repair diagnosis, repair, validation, rollback and completion event under `.gina/agent/repair-history.jsonl` using atomic writes so recovery evidence survives process restarts.

- **Target File**: `/server/agent/AutonomousRepairOrchestrator.ts`
- **Exact Code Snippet**:
  ```typescript
  export class AutonomousRepairOrchestrator {
    async diagnose(input: RepairDiagnostic) { ... }
    async recordRepair(input: RepairAttempt) { ... }
    async recordValidation(input: RepairValidation) { ... }
    async recordRollback(...) { ... }
    async complete(...) { ... }
  }
  ```
- **Why**: Add a bounded, deterministic repair-control layer that detects repeated identical failures and prevents the repair loop from repeatedly applying the same unsuccessful repair.

- **Target File**: `/scripts/test-phase52-repair-evidence.ts`
- **Exact Code Snippet**:
  ```typescript
  const repeated = await orchestrator.diagnose({ ...cycle: 2, ... });
  if (repeated.ok) throw new Error('repeated identical failure was not blocked');
  ```
- **Why**: Provide an executable smoke test proving persistence, evidence ordering, repeat-failure detection, rollback recording and bounded completion.

### Phase 52 Operating Rules
- Repair evidence is audit state, not proof of success; Phase 50 verification remains the final completion gate.
- Maximum automated repair budget is three cycles in this guard layer.
- An identical failure signature on a subsequent cycle is blocked rather than repeatedly handed back to the same repair strategy.
- Repair targets recorded by the orchestrator must be relative and must not contain path traversal segments.
- Evidence is local-only and stored below `.gina/agent`; no network or additional GPU resources are required.

### Phase 52 Exact Edited File Line References
- `/server/agent/RepairEvidenceStore.ts` — **lines 1–65**.
- `/server/agent/AutonomousRepairOrchestrator.ts` — **lines 1–100**.
- `/scripts/test-phase52-repair-evidence.ts` — **lines 1–24**.
- `/AGENTS.md` — **Phase 52 block appended after the Phase 51 entry**.

## Phase 53 — Unified Intent Arbitration & Media Routing — 2026-09-15

- **Web/research isolation:** capability plans for `web-research` and other non-engineering operations must never enter the autonomous coding agent. The Local AI client may enter the coding agent only for explicit engineering intents (`code-change`, `file-read`, `run-command`, `git-operation`, `project-operation`).
- **Media intent isolation:** a media noun such as `image`, `video`, `photo`, `scene`, or `clip` is not sufficient to trigger generation. Creation requires an explicit creation verb; analysis/question phrasing remains conversational/vision analysis.
- **Video precedence:** explicit video creation is resolved before image creation so phrases such as `make a video of a scene` cannot fall through to the image generator because `scene` is also an image vocabulary term.
- **Video execution lane:** explicit Local AI video requests are handed to the existing Video Studio/Wan 2.1 lane, preserving its established 8GB VRAM safety gates and job monitoring instead of inventing a second video executor.
- **Coding UI isolation:** the GINA CODING WORKSPACE status panel is visible only while an autonomous coding run is active; ordinary Local AI, web and media requests do not present coding/repair state.
- **Regression requirement:** routing tests must cover BBC/news web research, explicit code tasks, explicit image creation, explicit video creation, ordinary mentions of `image`/`video`, and descriptive/analysis requests about existing media.

### Phase 53 Exact Edited File Line References
- `/server/agent/MediaIntentRouter.ts` — **lines 1–54**.
- `/server.ts` — **line 21 import and the `/api/llm/chat`/`/api/ai-tools/route` media-routing call sites around lines 2670 and 4519**.
- `/src/components/LocalLlmStudio.tsx` — **lines 552–554, 644–645, 667–679, 706–707, 931–934** for agent lifecycle reset, engineering-only agent entry, explicit video handoff, ordinary-chat reset, and coding-workspace visibility.
- `/src/components/VideoStudio.tsx` — **lines 339–350** for the Local AI video-request event bridge.
- `/scripts/test-agent-routing.ts` — **media/intent regression cases around lines 18–61**.

## Phase 54 — Live News Grounding Arbitration Fix — 2026-09-15

- **Live-news variants must route to web research:** IntentRouter recognizes `latest`, `most recent`, common typo `most rescent`, headlines, top stories, and named public news sources before general chat or engineering routing.
- **Server-side fallback:** `/api/llm/chat` promotes an otherwise-general request containing live-news/source markers into `web-research` without ever promoting it into coding or repair.
- **Grounding contract:** current-information requests receive server-generated live web results before local Qwen inference; if live search fails, Gina must report the failure rather than inventing a current answer.
- **UI telemetry:** Local AI's thinking-source indicator recognizes `most recent`, `headline`, and related live-news wording as `local+web`.
- **Regression:** routing tests include `most recent news headline` and the observed `most rescent news headline` input, plus BBC/news, coding, and media isolation cases.

### Phase 54 Exact Edited File Line References
- `/server/agent/IntentRouter.ts` — **lines 1–60**.
- `/server.ts` — **lines 2687–2694** for final server-side live-information arbitration.
- `/src/components/LocalLlmStudio.tsx` — **line 713** for live-web thinking-source detection.
- `/scripts/test-agent-routing.ts` — **lines 19–20** for the observed news regression cases.
- `/AGENTS.md` — **lines 566–579** for this Phase 54 contract.

## Phase 55 — Deterministic Live-Web Execution Boundary
- Explicit `requiresWeb` requests must execute the brokered web-search lane before local inference.
- Live web requests may not silently degrade into an unsourced Qwen answer, a fake future search announcement, or a claim that Gina has no internet access.
- `WebResearchService` uses Brave when configured, then DuckDuckGo HTML and Bing HTML fallbacks; public web search is considered successful only when at least one provider returns results.
- Retrieved web results are labelled as already fetched so the model answers from them rather than promising to search later.
- The web lane remains mutually exclusive with autonomous coding/repair execution.
- Regression coverage must include explicit web-action requests, BBC/news requests, and UK-current-office requests.

## Phase 45 — Web Browser + Temporal Fact Revision — 2026-09-18

- **Browser execution boundary:** `/server/agent/WebBrowserService.ts` is the server-side browser abstraction for search + public-page opening. Local Qwen never has to pretend it will browse; the server performs the browse first and passes retrieved evidence to the model.
- **Browser API:** `/api/web/browser/status`, `/api/web/browser/search`, and `/api/web/browser/open` expose the same controlled public-web lane for diagnostics and future UI integration. Private/local addresses remain blocked by the underlying web guard.
- **Live evidence:** live grounding now opens up to two public result pages in addition to search snippets, includes source URLs, and labels the content as already retrieved so stale model memory cannot silently replace it.
- **Temporal facts:** `/server/knowledge/TemporalFactStore.ts` stores volatile facts separately under `.gina/knowledge/facts.jsonl` with source URL, authority, observed time, validity, and supersession state.
- **Belief revision:** when fresh authoritative evidence conflicts with a current fact for the same subject/property, the newer authoritative fact supersedes the older fact. Search returns one current fact per subject/property so stale conflicting officeholder data is not presented alongside the fresh fact.
- **Volatile officeholders:** `IntentRouter` routes current-role questions such as `who is the Prime Minister`, `is Rishi Sunak the Prime Minister`, and explicit `check the web` requests into the web lane before local knowledge or code routing.
- **Knowledge isolation:** web requests continue to exclude ordinary learned-knowledge prompt context; volatile fact memory is evidence-backed and does not become a substitute for a failed live search.
- **Regression:** `/scripts/test-phase45-browser-facts.ts` verifies web routing, coding/media isolation, fresh fact extraction, and supersession of a stale Prime Minister record.

### Phase 45 Exact Edited File Line References
- `/server.ts` — **imports lines 54–55; runtime instances lines 97–98; `web_research` broker integration lines 1178–1183; knowledge/browser APIs lines 1570–1600; live web grounding lines 2608–2655; Local LLM web telemetry line 2810**.
- `/server/agent/IntentRouter.ts` — **lines 1–24**.
- `/server/agent/WebBrowserService.ts` — **lines 1–69**.
- `/server/knowledge/TemporalFactStore.ts` — **lines 1–214**.
- `/scripts/test-phase45-browser-facts.ts` — **lines 1–53**.

## Phase 45.1 — Qwen3.5 9B Local Model Mapping — 2026-09-18

- **Model catalog:** `/server/llm/LocalLlmModelCatalog.ts` is now the authoritative local model map for Qwen 2.5-VL 7B, Qwen Coder 7B and the newly supplied Qwen3.5 9B model.
- **Qwen3.5 model files:**
  - `C:\Gina_AI\models\llm\Qwen3.5-9B-Q4_K_M.gguf`
  - `C:\Gina_AI\models\llm\mmproj-BF16.gguf`
- **Qwen3.5 profile:** multimodal/general-vision engine with a conservative default of 24 GPU layers under the 8 GB VRAM cage; `GINA_LLM_GPU_LAYERS` remains an explicit override.
- **Selection:** Local AI and AI Studio selectors expose Qwen3.5 9B as an independent engine option. Selecting it persists `local_llm_engine=qwen3.5` through the existing agent-memory preference path.
- **Runtime:** `LocalLlmManager` uses the catalog for model resolution, projector resolution, GPU-layer defaults and multimodal launch flags. Qwen3.5 loads `mmproj-BF16.gguf` only for its own profile and does not accidentally reuse the Qwen 2.5 F16 projector.
- **Capability mapping:** local capability discovery reports `qwen35Ready` only when both the Qwen3.5 model and BF16 projector are present. The model appears in the LLM generator inventory.
- **Image lane:** Qwen3.5 is allowed to use the existing Juggernaut image lane as a multimodal local assistant; the FLUX.1 Lite high-precision policy remains restricted to the existing Qwen 2.5-VL + mmproj-F16 requirement.
- **Launcher:** `Start_Local_LLM.bat` accepts `QWEN`, `QWEN35`, and `QWEN-CODER`; QWEN35 maps directly to the supplied Qwen3.5/BF16 files and uses a 24-layer conservative startup profile.
- **No downloads:** the new option is local-only and expects the user-supplied GGUF files to already exist under `C:\Gina_AI\models\llm`.

### Phase 45.1 Exact Edited File Line References
- `/server/llm/LocalLlmModelCatalog.ts` — **lines 1–76**.
- `/server/llm/LocalLlmManager.ts` — **lines 7, 86–99, 104–145, 147–176, 181–182, 191, 214** for catalog import, engine selection, model/projector resolution, launch flags and status handling.
- `/server.ts` — **line 17 import; lines 2221–2240 for `/api/llm/models`; lines 2241–2263 for engine selection; lines 2468–2469 for multimodal image policy; lines 2520–2533 for image-generation profile selection; lines 4598–4606 for route preview labels**.
- `/src/components/LocalLlmStudio.tsx` — **lines 23, 120–121, 296–319, 762–777, 787–805, 966**.
- `/src/components/AiStudioSuite.tsx` — **lines 10–13, 58**.
- `/src/types.ts` — **line 55**.
- `/server/capabilities/CapabilityManager.ts` — **lines 28, 42–43, 59, 122–123, 152, 166**.
- `/server/agent/ProjectMapManager.ts` — **line 92**.
- `/server/rag/LocalRagEngine.ts` — **line 50**.
- `/src/components/AppFeaturesGuide.tsx` — **lines 48, 128–140**.
- `/Start_Local_LLM.bat` — **lines 12–75**.
- `/scripts/test-local-llm-model-catalog.ts` — **lines 1–22**.


## Phase 45.1.1 — Qwen3.5 Projector Compatibility Guard — 2026-09-18

- **Incident:** Qwen3.5 startup failed with `mtmd_init_from_file: mismatch between text model (n_embd = 3584) and mmproj (n_embd = 4096)` while loading `mmproj-BF16.gguf`. The previous Phase 45.1 mapping therefore must not auto-pair that generic projector.
- **Runtime policy:** Qwen3.5 now prefers a Qwen3.5-9B-matched `mmproj-F16.gguf`; generic `mmproj-BF16.gguf` is explicitly ignored for automatic pairing. If an incompatible projector is detected at launch, LocalLlmManager retries Qwen3.5 text-only so the Local AI engine can still start instead of resetting OFF.
- **Capability policy:** `qwen35Ready` is now true only when a Qwen3.5 model and a matched projector are present. The existing supplied BF16 projector is treated as installed-but-incompatible, not as a valid vision capability.
- **Launcher policy:** `Start_Local_LLM.bat` no longer blindly passes `mmproj-BF16.gguf` for Qwen3.5; it uses matched `mmproj-F16.gguf` when present, otherwise starts text-only with a warning.
- **UI/API:** the model inventory reports the compatibility note, and `/api/llm/start` returns HTTP 409 for an unrecoverable projector mismatch rather than a generic 500.

### Phase 45.1.1 Exact Edited File Line References
- `/server/llm/LocalLlmModelCatalog.ts` — **lines 46–58**: Qwen3.5 projector mapping narrowed to matched F16/projector names and generic BF16 excluded.
- `/server/llm/LocalLlmManager.ts` — **lines 105–108, 161–185, 191–235**: incompatible-projector guard, matched projector resolution, text-only recovery on mismatch.
- `/server/capabilities/CapabilityManager.ts` — **lines 43, 123, 166**: Qwen3.5 capability now references matched projector and suppresses generic BF16 validation.
- `/server/rag/LocalRagEngine.ts` — **line 50**: local knowledge corrected to require a matched Qwen3.5 projector.
- `/server.ts` — **lines 2221–2240 and 2261–2277**: model inventory compatibility note and conflict-aware `/api/llm/start` response.
- `/Start_Local_LLM.bat` — **lines 24–36**: Qwen3.5 launcher uses matched F16 projector or explicit text-only fallback.
- `/src/components/LocalLlmStudio.tsx` — **lines 781–815**: Qwen3.5 UI wording updated to distinguish the model from projector readiness.
- `/src/components/AiStudioSuite.tsx` — **line 13**: Qwen3.5 selector description now reflects optional matched vision projector.
- `/src/components/AppFeaturesGuide.tsx` — **line 137**: model guide corrected.
- `/scripts/test-qwen35-projector-guard.ts` — **lines 1–16**: regression test for the projector compatibility guard.


## Phase 45.1.2 — Qwen3.5 Projector Pairing Correction — 2026-09-18

- **Root cause of Phase 45.1.1:** the runtime log line interpreted in Phase 45.1.1 (`mismatch between text model (n_embd = 3584) and mmproj (n_embd = 4096)`) was read as "the text model is 3584, so the 4096 BF16 projector is wrong." That reading was incorrect. Qwen3.5-9B's **official published config reports a 4096 text hidden size**, and `mmproj-BF16.gguf` (4096) is the verified model-matched projector supplied for it. `mmproj-F16.gguf` (3584) is the **Qwen 2.5-VL 7B** projector, not a Qwen3.5 file. Phase 45.1.1 swapped the pairing backwards, which caused the local model catalog to search for/prefer the 3584 F16 file for Qwen3.5 instead of its real 4096 BF16 match.
- **Correction:** Qwen3.5-9B's projector mapping is reverted to `mmproj-BF16.gguf` (matching Phase 45.1's original, correct mapping). The compatibility guard introduced in Phase 45.1.1 is retained as infrastructure but retargeted: it now flags `mmproj-F16.gguf` (the Qwen 2.5-VL file) as incompatible with the qwen3.5 engine instead of BF16. The text-only mismatch-recovery retry path is unchanged and still protects startup if an unexpected projector is ever supplied.
- **Verified pairing (per user-confirmed file inventory):**
  - `C:\Gina_AI\models\llm\Qwen3.5-9B-Q4_K_M.gguf` + `C:\Gina_AI\models\llm\mmproj-BF16.gguf` — Qwen3.5-9B, 4096 hidden size.
  - `C:\Gina_AI\models\llm\Qwen2.5-VL-7B-Instruct-Q4_K_M.gguf` + `C:\Gina_AI\models\llm\mmproj-F16.gguf` — Qwen 2.5-VL 7B, 3584 hidden size. (Unchanged from Phase 45.1/45.1.1 — this pairing was already correct.)
- **Capability policy:** `qwen35Ready` is true only when the Qwen3.5 model and the model-matched `mmproj-BF16.gguf` are both present.
- **Launcher policy:** `Start_Local_LLM.bat` QWEN35 branch loads `mmproj-BF16.gguf` when present, otherwise starts text-only with a warning naming the BF16 file.

### Phase 45.1.2 Exact Edited File Line References
- `/server/llm/LocalLlmModelCatalog.ts` — **lines 44–59**: Qwen3.5 `mmprojFile`/`mmprojPatterns` reverted to `mmproj-BF16.gguf`.
- `/server/llm/LocalLlmManager.ts` — **lines 104–108, 172**: `isKnownIncompatibleMmproj` now matches `mmproj-F16.gguf` for the qwen3.5 engine; diagnostic text updated.
- `/Start_Local_LLM.bat` — **lines 26–33**: QWEN35 branch looks for and loads `mmproj-BF16.gguf`.
- `/server/capabilities/CapabilityManager.ts` — **lines 43, 123, 166**: `qwen3.5-mmproj` known model, `qwen35Mmproj` detection, and generator notes point at `mmproj-BF16.gguf`.
- `/server.ts` — **line 2230**: `/api/llm/models` compatibility note corrected.
- `/server/rag/LocalRagEngine.ts` — **line 50**: local knowledge corrected back to BF16.
- `/src/components/LocalLlmStudio.tsx` — **lines 782, 815**; `/src/components/AiStudioSuite.tsx` — **line 13**; `/src/components/AppFeaturesGuide.tsx` — **line 137**: UI copy corrected back to mmproj-BF16.
- `/scripts/test-qwen35-projector-guard.ts` — **lines 1–20**: regression test rewritten to assert the BF16 pairing, scoped to the qwen3.5 catalog block so it no longer false-fails against the (correct, unrelated) Qwen 2.5-VL F16 entry.


## Phase 45.2 — Local AI Telemetry Compaction — 2026-09-18

- **UI:** the llama-server diagnostic log, previously a large full-width `<details>` block rendered below both Local AI columns, is now a compact `<details>` element docked directly under the chat preview pane inside the Local Gina Chat panel, with a smaller max-height and font size.
- **Telemetry readout:** each turn's prompt/completion token counts and web-grounding source are now also surfaced as a small persistent line directly under the preview (previously only written to the global activity log and otherwise lost).
- No backend telemetry contract changed; this is a presentation-only change in `LocalLlmStudio.tsx`.

### Phase 45.2 Exact Edited File Line References
- `/src/components/LocalLlmStudio.tsx` — added `lastTelemetry` state; populated it alongside the existing `onAddLog` telemetry call in `sendMessage`; moved and shrank the `recentLog` `<details>` block to sit under the chat preview, and added the compact telemetry line next to it.


## Phase 45.3 — Local Browser Integration — 2026-09-18

- **New service:** `/server/browser/LocalBrowserService.ts` detects real local installations of Google Chrome, Google Chrome Canary (SxS), Microsoft Edge (Chromium) and Brave via their standard Windows install paths (`%PROGRAMFILES%`, `%PROGRAMFILES(X86)%`, `%ProgramW6432%`, `%LOCALAPPDATA%`), and also scans `C:\Gina_AI\tools\` (override with `GINA_TOOLS_ROOT`) up to 3 directories deep for portable `chrome.exe` / `msedge.exe` / `brave.exe` / `chromium.exe` binaries.
- **Distinct from `WebBrowserService`:** the existing `/server/agent/WebBrowserService.ts` performs public web search + page fetch for the agent's research lane. `LocalBrowserService` is a separate, lower-level capability: it drives a real local Chromium-family browser process headlessly. Nothing in the existing web-research/browse lane was changed.
- **Headless launch:** `dumpDom(url, options)` spawns the preferred (or explicitly requested) detected browser with `--headless=new --disable-gpu --disable-extensions --disable-sync --dump-dom <url>`, using a fresh scratch `--user-data-dir` per call (cleaned up afterward) so headless runs never collide with a signed-in profile or a running browser instance. Default timeout 20s, overridable per call.
- **Preference order:** Chrome → Edge → Brave → Chrome Canary → portable, when no explicit `browserId` is given; the first channel with an existing binary wins.
- **API:** `GET /api/browser/local/status` returns the full detection result (all channels, found or not, plus the preferred pick). `POST /api/browser/local/dump` accepts `{ url, browserId?, timeoutMs? }` and returns the rendered DOM HTML plus timing/diagnostic metadata.
- **No downloads, no new dependencies:** uses only Node's built-in `fs`, `path`, `os`, and `child_process`/`execFile` (the same subprocess pattern already used elsewhere in `server.ts`).

### Phase 45.3 Exact Edited File Line References
- Added `/server/browser/LocalBrowserService.ts` — **lines 1–207**.
- `/server.ts` — import line 56; runtime instance line 100; routes added directly after the existing `/api/web/browser/open` route (`/api/browser/local/status`, `/api/browser/local/dump`).




## Phase 58 — Voice Engine Repair & Fluid Layout — 2026-09-20

- Added deterministic Windows Python discovery for the Voice Generator. The setup script persists the exact `sys.executable` used to install TTS/Bark/pydub under `.gina/audio_python.json`; the Node route checks that binding, Gina `g_env`, `python`, and the Windows Python Launcher.
- Added detailed audio diagnostics including candidate interpreters, import paths, database path and database writability.
- Hardened the voice SQLite path with writable-directory detection and a local `.gina/data/audio` fallback if the primary `data/audio` location cannot be opened.
- Added post-generation physical audio manipulation: `pitch_shift_semitones` (-12 to +12), `formant_shift` (0.5 to 1.5), and pitch-preserving `speed_factor` (0.5x to 2.0x), using local SciPy processing before final WAV/MP3/FLAC export. SciPy STFT/iSTFT and resampling are used for the local signal-processing stages.
- Refactored the master application wrapper to full-width fluid layout and Local AI / Voice Generator workspaces to responsive 12-column grids, removing the previous 1500px master constraint and fixed Local AI column widths.
- Kept the Local AI Interactive Preview and auto-growing prompt composer intact.

### Phase 58 Validation
- Python syntax compile: PASS for `scripts/setup_audio_deps.py` and `scripts/unified_audio_backend.py`.
- TypeScript syntax transpilation: PASS for changed TS/TSX files.
- ZIP integrity: PASS.
- Full Windows runtime/audio-model generation remains to be exercised on the user's machine because the installed Python/Node environment is outside this isolated build workspace.


## Phase 59 — Voice Engine Runtime Repair & Fluid Layout — 2026-09-20
- Local AI prompt actions were separated so Attach and Send no longer overlap; the composer now reserves action space and the chat/preview region expands to the viewport.
- `scripts/setup_audio_deps.py` now detects broken imports as well as missing modules, repairs Torch/Torchaudio/TorchCodec before Coqui TTS, and verifies imports after repair.
- `Start_Factory.bat` runs the audio dependency audit inside the active `g_env`, eliminating the recurring package/interpreter mismatch.
- Bark now enables CPU offload alongside small-model mode for the 8 GB VRAM target.
- Voice SQLite probes the actual file and falls back to `.gina/data/audio` if the primary database cannot be opened.
