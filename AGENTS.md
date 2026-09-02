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
- **Version**: 1.17.73
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

- **Image Workflow**: `flux_image.json` (FLUX.1-Schnell GGUF Q4_K_S via `UnetLoaderGGUF`)
- **Video Workflow**: `ltx_video.json` (LTX-Video 2B FP8, H.264 MP4 export)
- **Installed Checkpoints / Models**:
  - `flux1-schnell-Q4_K_S.gguf` (current FLUX UNet)
  - `ltxv-2b-0.9.8-distilled-fp8.safetensors`
  - `ltx-video-2.0.safetensors`
  - `wan2.1-1.3b.safetensors`
  - `hunyuan-video.safetensors`
  - `geneva_1-12b_fp8.safetensors`
  - `t5xxl_fp8_e4m3fn.safetensors` (in `models/clip/`)




## 4. Verified Local LLM Binding

- **Model**: `gemma-3-12b-it-Q4_K_M.gguf` (Gemma 3 12B IT, Q4_K_M)
- **Model Path**: `C:\Gina_AI\models\llm\gemma-3-12b-it-Q4_K_M.gguf`
- **Runtime**: llama.cpp Windows x64 CUDA build
- **Runtime Path**: `C:\Gina_AI\tools\llama.cpp\llama-server.exe`
- **API**: `http://127.0.0.1:8080/v1/chat/completions`
- **GPU**: NVIDIA GeForce RTX 3070 Ti 8GB; verified CUDA device detection with ~7109 MB free during CLI test
- **Working configuration**: 28 GPU layers, 4096 context, 6 CPU threads
- **Verified benchmark**: approximately 9.2 tokens/sec generation on a realistic Gina/AIDA64 prompt; 10.7 tokens/sec on a short prompt at 28 GPU layers
- **Known performance cliff**: 36 GPU layers dropped generation to approximately 1.3 tokens/sec, so 28 layers is the pinned starting configuration
- **VRAM rule**: Gina releases ComfyUI cached models before starting/restarting Gemma. Do not run heavy ComfyUI image/video generation concurrently with the 12B LLM on this 8GB GPU.
- **Integration status**: Phases 1–13 are `COMPLETED` (Phase 8 Gemma 3 12B IT, Phase 9 Autonomous Agent & 19-Tool Broker, Phase 10 AIDA64 Real-time Shm Telemetry, Phase 11 Zero-VRAM Local RAG Engine, Phase 12 Real-Time ComfyUI Node Graph Sync, Phase 13 Advanced Voice Pipeline & Persistent Presets). Phases 14–17 are no longer treated as merely planned: workflow ingestion, transparent HUD, Dynamic VRAM Tuner, GIF Studio, RIFE Motion Studio and live capability discovery are active in the current dashboard. Full agent access is enabled by default. File APIs remain scoped to `C:\Gina_AI`; command execution is audited.
- **Agent startup context**: Gina must load `AGENTS.md`, `CHANGELOG.md`, `README.md`, `src/components/MilestoneChecklist.tsx`, `src/components/AppFeaturesGuide.tsx`, `src/components/LocalCapabilityPanel.tsx`, `package.json`, `metadata.json`, `/docs/INDEX.md`, `/docs/setup/LOCAL_LLM_SETUP.md`, `/docs/setup/LOCAL_AGENT_SETUP.md`, workflow inventory, persistent `.gina\agent-memory.json`, and a live hardware/model/ComfyUI/LLM capability snapshot before autonomous tasks.
- **Agent memory**: Persistent local memory is stored at `C:\Gina_AI\.gina\agent-memory.json`; it is local-only and excluded from source control.
- **Agent tools**: `inspect_system`, `inspect_capabilities`, `inspect_project_context`, `read_project_bundle`, `list_directory`, `search_files`, `knowledge_search`, `read_file`, `write_file`, `execute_command`, `git_status`, `git_diff`, `git_log`, `remember`, `recall_memory`, `refresh_context`, `comfy_clear_cache`, `llm_start`, `llm_stop`, `llm_restart`, and `build_aida64_template` are available when full access is enabled.
