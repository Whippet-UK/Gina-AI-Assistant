# Gina AI Factory — AI Agent Context & System Memory

> **IMPORTANT FOR ALL AI ASSISTANTS**: This file is the primary context bridge and persistent memory for Gina AI Factory. Read and follow all instructions in this document immediately upon initializing or loading this repository. All update logs and code change history are maintained separately in `CHANGELOG.md`.

---

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
  1. `/src/components/MilestoneChecklist.tsx` (Authoritative active milestone, completed phases, and save points).
  2. `/src/components/AppFeaturesGuide.tsx` (Complete studios, verified engines, architecture flow, and feature status).
  3. `/src/components/LocalCapabilityPanel.tsx` (Active hardware sentinel, VRAM cage, service endpoints, and models).
  4. `CHANGELOG.md` (Recent code diffs and historical records).
  5. `/docs/INDEX.md` and `/docs/architecture/SYSTEM_ARCHITECTURE.md` (System topology and safety limits).
  6. `/src/version.ts` (Central single-source-of-truth version string and active save point ID).
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
- **Version**: 1.18.5
- **Local Dashboard URL**: `http://127.0.0.1:3000/` (Express server listens on `0.0.0.0:3000`)
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
  - `flux_image.json` (FLUX.1-Schnell GGUF Q4_K_S via `UnetLoaderGGUF`)
- **Video Workflow**: `ltx_video.json` (LTX-Video 2B FP8, H.264 MP4 export)
- **Installed Checkpoints / Models**:
  - `Juggernaut-XL_v9_RunDiffusionPhoto_v2.safetensors` (in `models/checkpoints/`)
  - `flux1-schnell-Q4_K_S.gguf` (current FLUX UNet)
  - `ltxv-2b-0.9.8-distilled-fp8.safetensors`
  - `ltx-video-2.0.safetensors`
  - `wan2.1-1.3b.safetensors`
  - `hunyuan-video.safetensors`
  - `geneva_1-12b_fp8.safetensors`
  - `t5xxl_fp8_e4m3fn.safetensors` (in `models/clip/`)

---

## 4. Verified Local LLM Bindings

- **Primary High-Speed Vision-Language Model**: `Qwen2.5-VL-7B-Instruct-Q4_K_M.gguf` + `mmproj-F16.gguf`
  - Path: `C:\Gina_AI\models\llm\Qwen2.5-VL-7B-Instruct-Q4_K_M.gguf` & `mmproj-F16.gguf`
  - Offload: 100% full GPU offload (28 layers)
  - Speed: ~35–45 tokens/sec generation on RTX 3070 Ti (8GB)
  - VRAM footprint: ~4.6 GB (zero PCIe swapping, leaves 3.2 GB buffer)
- **Secondary Instruction Model**: `gemma-3-12b-it-Q4_K_M.gguf` (Gemma 3 12B IT, Q4_K_M)
  - Model Path: `C:\Gina_AI\models\llm\gemma-3-12b-it-Q4_K_M.gguf`
  - Pinned layers: 28 GPU layers (~9.2–10.7 tokens/sec)
- **Runtime**: llama.cpp Windows x64 CUDA build
- **Runtime Path**: `C:\Gina_AI\tools\llama.cpp\llama-server.exe`
- **API**: `http://127.0.0.1:8080/v1/chat/completions`
- **Integration status**: Phases 1–33 are `COMPLETED` (Phase 33 Qwen 2.5-VL & Juggernaut-XL Ultra-Acceleration Integration).
- **Agent startup context**: Gina must load `AGENTS.md`, `CHANGELOG.md`, `README.md`, `src/components/MilestoneChecklist.tsx`, `src/components/AppFeaturesGuide.tsx`, `src/components/LocalCapabilityPanel.tsx`, `package.json`, `metadata.json`, `/docs/INDEX.md`, `/docs/setup/LOCAL_LLM_SETUP.md`, `/docs/setup/LOCAL_AGENT_SETUP.md`, workflow inventory, persistent `.gina\agent-memory.json`, and a live hardware/model/ComfyUI/LLM capability snapshot before autonomous tasks.
- **Agent memory**: Persistent local memory is stored at `C:\Gina_AI\.gina\agent-memory.json`; it is local-only and excluded from source control.
- **Agent tools**: `inspect_system`, `inspect_capabilities`, `inspect_project_context`, `read_project_bundle`, `list_directory`, `search_files`, `knowledge_search`, `read_file`, `write_file`, `execute_command`, `git_status`, `git_diff`, `git_log`, `remember`, `recall_memory`, `refresh_context`, `comfy_clear_cache`, `llm_start`, `llm_stop`, `llm_restart`, and `build_aida64_template` are available when full access is enabled.

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
