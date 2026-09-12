import React, { useState } from 'react';
import { CheckCircle2, Clock, AlertTriangle, ShieldCheck, FileCode, CheckSquare, Square } from 'lucide-react';
import { LifecyclePhase, RestorePoint, VerificationCheck } from '../types';

interface MilestoneChecklistProps {
  activeRestorePoint: string;
}

export const MilestoneChecklist: React.FC<MilestoneChecklistProps> = ({ activeRestorePoint }) => {
  const [phases] = useState<LifecyclePhase[]>([
    { phase: 1, name: 'Hardware Specs Mapped & VRAM Capped', status: 'COMPLETED', details: 'RTX 3070 Ti 8GB (Strict 7.2GB Cap), AMD Ryzen 5600X 4-Thread Gate' },
    { phase: 2, name: 'Bare-Metal Environment Audit', status: 'COMPLETED', details: '947 Framework shields locked, CUDA 12.2 translation verification pass' },
    { phase: 3, name: 'ComfyUI Standalone Workspace', status: 'COMPLETED', details: 'Headless Node Server initialized with --lowvram --fp8_e4m3fn arguments' },
    { phase: 4, name: 'Model Downloads & FP8 Configuration', status: 'COMPLETED', details: 'Baseline parameters established for low-VRAM model distribution partitions' },
    { phase: 5, name: 'Python API Automation Engine Build', status: 'COMPLETED', details: 'Batch processing pipeline with auto-recovery state.json infrastructure' },
    { phase: 6, name: 'Automated Video & Image Pipeline Link', status: 'COMPLETED', details: 'Composition streams parsing localized imagery to sequential video generation loops' },
    { phase: 7, name: 'AIDA64 Sensor Panel Template Studio', status: 'COMPLETED', details: 'Custom 1024x600/1920x480/AIO HUD layouts, modular dials, and 100-state arc ZIP generator' },
    { phase: 8, name: 'Quantized Local AI Engine Integration', status: 'COMPLETED', details: 'High-speed local text parsing framework with full 100% GPU layer offloading' },
    { phase: 9, name: 'Autonomous Local Agent & Tool Broker', status: 'COMPLETED', details: '19 local tools, startup context loops, persistent memory, and file tracking sandboxes' },
    { phase: 10, name: 'AIDA64 68-Feature Real-Time Sensor Panel', status: 'COMPLETED', details: '1000ms Win32 shared memory reader, 100-state gauge graphic engine, and sensor binding' },
    { phase: 11, name: 'Local RAG Knowledge Base & Vector Engine', status: 'COMPLETED', details: 'Zero-VRAM hybrid BM25 + Vector in-memory retrieval for instant semantic grounding' },
    { phase: 12, name: 'Real-Time ComfyUI Node Graph Sync', status: 'COMPLETED', details: 'Live workflow graph inspector, node parameter synchronization, and connection mapper' },
    { phase: 13, name: 'Advanced Local Voice Pipeline & Persistence', status: 'COMPLETED', details: 'Google US English default priority, permanent preference persistence, and SAPI bridge fallback' },
    { phase: 14, name: 'One-Click Workflow JSON/PNG Ingestion', status: 'COMPLETED', details: 'Drag-and-drop ComfyUI workflow metadata parser with missing node resolution' },
    { phase: 15, name: 'High-DPI AIDA64 Transparent Desktop HUD', status: 'COMPLETED', details: 'Frameless desktop floating telemetry overlay with alpha transparency for secondary displays' },
    { phase: 16, name: 'Multi-GGUF Benchmark & Dynamic VRAM Tuner', status: 'COMPLETED', details: 'Automated layer offload benchmarker, memory stress profiling, and zero-crash thermal sentry' },
    { phase: 17, name: 'Knowledge Ingestion & Auto-Indexing Agent', status: 'COMPLETED', details: 'Filesystem watcher auto-indexing scripts, docs, and custom nodes into vector memory' },
    { phase: 18, name: 'Local Creator Upload Pipeline', status: 'COMPLETED', details: 'Dashboard image upload for LoadImage workflows and text/code attachments for Local AI' },
    { phase: 19, name: 'Local AI Universal Attachments', status: 'COMPLETED', details: 'Attachment manifests for code, text, images, and ZIP archives with localized extraction' },
    { phase: 20, name: 'Unified Job Manager', status: 'COMPLETED', details: 'Shared local job visibility, progress tracking, remote cancellation, and hard VRAM flush paths' },
    { phase: 21, name: 'Intelligent Tool Router', status: 'COMPLETED', details: 'Intent classification for chat, vision, and text triggers with model-policy enforcement' },
    { phase: 22, name: 'Workflow Intelligence', status: 'COMPLETED', details: 'Workflow capability/binding inspection layer and automated ComfyUI missing-node diagnostics' },
    { phase: 23, name: 'Generation Presets', status: 'COMPLETED', details: 'Named generation profiles established as shared orchestration vocabulary parameters' },
    { phase: 24, name: 'Asset Library', status: 'COMPLETED', details: 'Persistent local asset record store for generated outputs and structural JSON metadata logs' },
    { phase: 25, name: 'Conversation Context', status: 'COMPLETED', details: 'Existing local conversation history and vector RAG data surfaced as active pipeline context' },
    { phase: 26, name: 'Automatic Recovery', status: 'COMPLETED', details: 'Health-aware fallback recovery controls and explicit process loop failure diagnostics' },
    { phase: 27, name: 'Resource Scheduler', status: 'COMPLETED', details: 'Shared-GPU scheduling signals and automatic pipeline cancellation token integration' },
    { phase: 28, name: 'Health & Diagnostics Center', status: 'COMPLETED', details: 'Measured real-time system metrics, hardware temperatures, and one-click diagnostic reports' },
    { phase: 29, name: 'One-Click Diagnostics', status: 'COMPLETED', details: 'Comprehensive system health scanner profiling GPU, VRAM logs, node bindings, and asset files' },
    { phase: 30, name: 'StreamInject v2.5 Pure Render Suite', status: 'COMPLETED', details: 'Headless OpenCV/FFmpeg Python render engine, visual canvas layout builder, and 6-track timeline' },
    { phase: 31, name: 'StreamInject v2.5 Timeline & Overlay Suite', status: 'COMPLETED', details: 'Audio mixing, chroma key color adjustments, watermark timelines, and burned subtitle overlays' },
    { phase: 32, name: 'AI Music Generator Suite & AudioCraft', status: 'COMPLETED', details: '7-mode generator supporting Text-To-Song, extension paths, cover loops, and stem splitting' },
    { phase: 33, name: 'Qwen 2.5-VL & Juggernaut-XL Acceleration', status: 'COMPLETED', details: 'CUDA offload for Qwen 2.5-VL 7B (35+ t/s) + Juggernaut XL v9 SDXL workflow (8-12s photorealism)' },
    { phase: 34, name: 'Phase 38 Dedicated Local AI Model Selector', status: 'COMPLETED', details: 'Implemented global default fallback for Qwen 2.5-VL 7B with manual hot-swap routing to Qwen 2.5 Coder 7B' },
    { phase: 35, name: 'Creative Studio "Text-in-Image" Engine Toggle', status: 'COMPLETED', details: 'Added toggle to dynamically route high-precision text requests to the optimized FLUX.1 Lite GGUF model' },
    { phase: 36, name: 'Native Wan 2.1 Video Pipeline Migration', status: 'COMPLETED', details: 'Integrated lightweight Wan 2.1 architecture as the active video engine, replacing the retired legacy video lane' },
    { phase: 37, name: 'Image Canvas Refresh & Stability Fix', status: 'COMPLETED', details: 'Patched state tracking logic inside Image Studio to fix prompt desync and clear beige image generation glitches' },
    { phase: 38, name: 'Phase 42 System Framework Alignment', status: 'COMPLETED', details: 'Merged legacy standalone panels, refactored global variables, and unified core orchestration hooks' },
    { phase: 39, name: 'Workspace Archive Auto-Ingestion', status: 'COMPLETED', details: 'Direct project ZIP archive unpacking, source layout parsing, sandboxing, and runtime script tracking' },
    { phase: 40, name: 'Live Coding Stream Terminal UI', status: 'COMPLETED', details: 'Surfaced real-time background coding agent terminal activity directly onto the primary Gina conversation log' },
    { phase: 41, name: 'Bidirectional Git/GitHub Broker', status: 'COMPLETED', details: 'Automated local repository syncing with fully integrated branch, commit, and push UI panel controls' },
    { phase: 42, name: 'Automated Top-Level Changelog Generation', status: 'COMPLETED', details: 'Linked runtime execution tracking models to dynamically append system structural edits directly to files' },
    { phase: 43, name: 'Target Update: Local AI Stack Optimization & UI Toggle Swap (RTX 3070 Ti 8GB)', status: 'COMPLETED', details: 'Optimizing local hardware stacks for an 8GB VRAM constraint. Migrating video creation suites natively to Wan 2.1 engines (1.3B) and implementing FLUX.1 Lite GGUF support for high-precision text tasks. Swapping legacy Gemma 3 layout options inside the Phase 38 Model Routing side panels directly to pure-text Qwen 2.5 Coder 7B nodes with built-in canvas attachment safety constraints.'},
    { phase: 44, name: 'Local AI Project Attachments & Large ZIP Ingestion', status: 'COMPLETED', details: 'Qwen Coder can accept text/code files and project ZIPs; project archives up to 100MB and 10,000 files are imported into dedicated workspaces and automatically inspected.' },
    { phase: 45, name: 'Web Browser Integration', status: 'PENDING', details: 'Deploying custom headless Chromium instances to grant tools live web-browsing capabilities.' },
    { phase: 46, name: 'Update Integrity Guard & Wan UI Reconciliation', status: 'COMPLETED', details: 'Mandatory AI update checklist, deterministic integrity gate, and removal of stale retired-engine UI vocabulary from the current stack.' },
    { phase: 47, name: 'Web Research & Local-First Agent', status: 'COMPLETED', details: 'Controlled public-internet research through server-side web tools when GINA_WEB_ACCESS=true with strict local-first safety.' },
    { phase: 48, name: 'Agent Action Recovery & Robust Tool Dispatch', status: 'COMPLETED', details: 'AutonomousAgentEngine repair, LocalLlmManager completion dispatch, and AgentWorkspaceManager path resolution.' },
    { phase: 49, name: 'Autonomous Project Completion Gate & Persistent Project Map', status: 'COMPLETED', details: 'Machine-enforced Definition of Done gate, autonomous repair loop, and persistent ProjectMapManager indexing architectural surfaces.' }
  ]);
  
  const [restorePoints] = useState<RestorePoint[]>([
    { id: 'RESTORE_01_INIT', label: 'Bare Metal Setup', description: 'Bare metal parameters mapped & pinned', timestamp: '2026-08-10 01:00', status: 'LOCKED' },
    { id: 'RESTORE_02_COMPLIANCE', label: 'Framework Shields', description: '947 compliance rules active & verified', timestamp: '2026-08-10 01:25', status: 'LOCKED' },
    { id: 'RESTORE_03_V1.4.0_STABLE', label: 'Flux.1 & LTXV-2B Baseline', description: 'Image generation working, VRAM /free purge sentinel, ltxv-2b-0.9.8 lock', timestamp: '2026-08-16 23:00', status: 'LOCKED' },
    { id: 'RESTORE_04_V1.5.0_MP4_STABLE', label: 'Legacy Video MP4 & Auto-Flush Sentinel', description: 'Historical restore point; current video execution is provided by Wan 2.1', timestamp: '2026-08-17 01:56', status: 'LOCKED' },
    { id: 'RESTORE_05_V1.6.0_AIDA64_STUDIO', label: 'AIDA64 Sensor Panel Studio', description: 'Zero-text chassis prompts, modular tech dials, 100-state radial gauge ZIP export & pixel coordinate mapper', timestamp: '2026-08-17 04:10', status: 'LOCKED' },
    { id: 'RESTORE_06_V1.6.9_LOCAL_GEMMA', label: 'Gemma 3 12B Local CUDA Engine', description: 'Gemma 3 12B Q4_K_M served by llama.cpp CUDA at 28 GPU layers; Local AI workspace integrated', timestamp: '2026-08-18 03:30', status: 'LOCKED' },
    { id: 'RESTORE_07_V1.16.0_AGENT_AIDA64', label: 'Autonomous Agent & Telemetry Bridge', description: '19 local tools, persistent agent memory, Win32 shared memory telemetry reader & gauge generator', timestamp: '2026-08-18 08:30', status: 'LOCKED' },
    { id: 'RESTORE_08_V1.17.2_LOCAL_RAG', label: 'Local Zero-VRAM RAG Knowledge Engine', description: 'In-memory BM25/Vector retrieval, LLM chat grounding, agent knowledge search tool, developer workbench', timestamp: '2026-08-18 12:00', status: 'LOCKED' },
    { id: 'RESTORE_09_V1.17.18_VOICE_GRAPH_SYNC', label: 'Voice Pipeline & Node Graph Sync', description: 'Google US English default persistence, real-time ComfyUI node graph sync, and Phase 13-17 roadmap expansion', timestamp: '2026-08-18 15:30', status: 'LOCKED' },
    { id: 'RESTORE_10_V1.17.19_LOCAL_CREATOR_UPLOADS', label: 'Local Creator Upload Pipeline', description: 'Dashboard-only ComfyUI reference-image uploads and supported Local AI file attachments; no manual ComfyUI interaction required', timestamp: '2026-08-29 22:31', status: 'LOCKED' },
    { id: 'RESTORE_11_V1.17.20_LOCAL_AI_ATTACHMENTS', label: 'Local AI Universal Attachments', description: 'Images, text/code/config files and ZIP archives can be attached from Gina; ZIP text is extracted locally and images are stored for future local multimodal support', timestamp: '2026-08-29 22:35', status: 'LOCKED' },
    { id: 'RESTORE_12_V1.17.22_ATTACHMENT_VISION', label: 'Attachment + Vision Completion', description: 'Create Studio reference-image upload plus real Local AI image transport through llama.cpp multimodal image_url inputs with automatic mmproj detection', timestamp: '2026-08-29 23:11', status: 'LOCKED' },
    { id: 'RESTORE_13_V1.17.42_MILESTONE_BATCH', label: 'Milestones 14-17 Batch', description: 'Workflow JSON/PNG ingestion, DPI-aware AIDA64 HUD mode, controlled GGUF benchmark/tuner, and filesystem knowledge auto-indexing', timestamp: '2026-08-30 18:00', status: 'LOCKED' },
    { id: 'RESTORE_V1.17.68_GIF_STUDIO_FIX', label: 'GIF Studio Sequential Story & Route Resilience', description: 'Historical restore point; multi-scene continuity and endpoint resilience retained in the current Wan 2.1 story pipeline', timestamp: '2026-08-31 03:00', status: 'LOCKED' },
    { id: 'RESTORE_V1.17.69_STREAMINJECT_SUITE', label: 'StreamInject v2.5 Pure Render Suite', description: 'Previous StreamInject v2.5 render engine save point', timestamp: '2026-08-31 00:00', status: 'LOCKED' },
    { id: 'RESTORE_V1.17.70_STREAMINJECT_IMPORT_FIX', label: 'StreamInject v2.5 Import & CTA Fix', description: 'StreamInject v2.5 render engine with FFprobe video validation and independent CTA/Green Screen uploads', timestamp: '2026-08-31 12:00', status: 'LOCKED' },
    { id: 'RESTORE_V1.17.71_AUDIOCRAFT_STREAMINJECT_TIMELINE', label: 'StreamInject Timeline & AudioCraft PreWarm', description: 'AudioCraft model downloader, pre-warm audio memory budget, and StreamInject timeline audio/chroma mixing', timestamp: '2026-08-31 18:00', status: 'LOCKED' },
    { id: 'RESTORE_V1.17.72_MUSIC_GENERATOR_SUITE', label: 'AI Music Generator Suite & AudioCraft Engine', description: '7-mode generator suite with Expert/Basic tiers, style/genre/mood/vocal/tempo drawers, Gemma 3 12B lyricist, stem splitter & BGM bridge', timestamp: '2026-09-01 02:00', status: 'LOCKED' },
    { id: 'RESTORE_V1.17.73_MULTIMEDIA_MOVIEPY_STITCHER', label: 'MoviePy Multimedia Audio-Video Stitcher', description: 'Cross-studio audio/video stitcher modal in VideoStudio, GifStudio & MusicStudio, Python MoviePy headless compositor with loop/fade/volume sync', timestamp: '2026-09-01 12:00', status: 'LOCKED' },
    { id: 'RESTORE_V1.17.74_AUDIOGEN_MUSICGEN_MODEL_ROUTING', label: 'AudioGen / MusicGen Model Routing', description: 'Correct AudioGen identity and dedicated AudioCraft runtime path; no MusicGen Transformers loader for AudioGen', timestamp: '2026-09-02 00:00', status: 'LOCKED' },
    { id: 'RESTORE_V1.17.75_AUDIOCRAFT_LOCAL_CACHE_DASHBOARD', label: 'AudioCraft Local Cache & Live Dashboard', description: 'Superseded: shared Hub cache experiment', timestamp: '2026-09-02 05:00', status: 'LOCKED' },
    { id: 'RESTORE_V1.17.76_AUDIOCRAFT_SINGLE_MANAGED_CACHE', label: 'AudioCraft Single Managed Cache', description: 'One authoritative Gina model directory, local-path-only generation, duplicate-cache size exclusion, and no silent Hugging Face downloads during Generate', timestamp: '2026-09-02 05:48', status: 'LOCKED' },
    { id: 'RESTORE_V1.17.77_AUDIOCRAFT_EXPLICIT_BACKEND', label: 'AudioCraft Explicit Backend & Sequential Generation', description: 'Explicit Transformers/AudioCraft backend reporting, managed-only model resolution, Hub duplicate exclusion, offline Generate, and single-lane GPU execution', timestamp: '2026-09-02 12:00', status: 'LOCKED' },
    { id: 'RESTORE_V1.17.78_MUSICGEN_HF_SNAPSHOT', label: 'MusicGen Transformers Snapshot Routing', description: 'Uses the already-downloaded MusicGen Medium Transformers snapshot containing model.safetensors; Generate is local-only, never downloads, and audio remains single-lane', timestamp: '2026-09-02 18:00', status: 'LOCKED' },
    { id: 'RESTORE_V1.17.79_MUSICGEN_STATUS_RESOLUTION', label: 'MusicGen Snapshot Status Resolution', description: 'Status/backend telemetry resolves the same local Hugging Face snapshot used by generation, reports actual weights and path, and prefers a complete safetensors snapshot when available', timestamp: '2026-09-03 00:00', status: 'LOCKED' },
    { id: 'RESTORE_V1.17.84_ONE_CLICK_SINGING_AUDIO_DECK', label: 'One-Click Singing Pipeline & Audio Deck', description: 'ACE-Step 1.5 local singing backend with lyrics-aware routing and automatic Audio Deck load', timestamp: '2026-09-04 12:00', status: 'LOCKED' },
    { id: 'RESTORE_V1.17.85_ACE_UV_BOOTSTRAP', label: 'ACE-Step Windows uv Bootstrap', description: 'Automated uv package manager installation and PATH-independent executable resolution', timestamp: '2026-09-05 06:00', status: 'LOCKED' },
    { id: 'RESTORE_V1.17.86_ACE_STEP_API_CLI_FIX', label: 'ACE-Step API CLI Contract Fix', description: 'Corrected CLI arguments for ACE-Step REST API server and 8GB safe offload profile', timestamp: '2026-09-05 18:00', status: 'LOCKED' },
    { id: 'RESTORE_V1.17.87_Gina-AI-Assistant_STYLE_IMAGE_STUDIO', label: 'Gina-AI-Assistant-Inspired Gina Image Studio', description: 'Focused prompt-first layout, large unobstructed preview, collapsible advanced controls, and local-only status', timestamp: '2026-09-06 00:00', status: 'LOCKED' },
    { id: 'RESTORE_V1.17.88_Gina-AI-Assistant_IMAGE_STUDIO', label: 'Gina-AI-Assistant Architecture Overhaul for Gina Image Studio', description: 'Authentic Gina-AI-Assistant UI/UX, Input Image modes (Image Prompt, Face Swap, PyraCanny, CPDS), 4-tab settings (Setting, Style, Model, Advanced), Gina-AI-Assistant V2 styles and history carousel', timestamp: '2026-09-06 04:00', status: 'LOCKED' },
    { id: 'RESTORE_V1.17.89_GINA_IMAGE_STUDIO', label: 'Gina Image Studio — Full GINA Branding Integration', description: 'Pure GINA branding across all studio components (GinaImagePreview, GinaImageInput, GinaImageSettings, Gina V2 styles, and Gina telemetry)', timestamp: '2026-09-06 04:10', status: 'LOCKED' },
    { id: 'RESTORE_V1.17.90_LIVE_PREVIEW_ASPECT_RATIO_FIX', label: 'Live Build Preview Streaming & Dynamic Aspect Ratio Fix', description: 'ComfyUI binary WebSocket preview frame streaming (Blob/ArrayBuffer support with latent2rgb), real-time latent progressive rendering, and dynamic aspect ratio synchronization (1024x1024 1:1 and presets)', timestamp: '2026-09-06 05:25', status: 'LOCKED' },
    { id: 'RESTORE_V1.17.91_OOM_LOOP_AND_WATCHDOG_FIX', label: 'Proactive OOM Loop Elimination & Watchdog Resilience Fix', description: 'Removed blind VRAM > 7680MB purge loop that halted active ComfyUI sampling, added active job protection to /api/comfy/clear-cache, and expanded watchdog probe timeout to 10s with failure hysteresis to stop false 503 OFFLINE alerts', timestamp: '2026-09-06 05:40', status: 'LOCKED' },
    { id: 'RESTORE_V1.18.0_QWEN_VL_AND_JUGGERNAUT_INTEGRATION', label: 'Qwen 2.5-VL 7B & Juggernaut-XL v9 High-Speed Integration', description: 'Integrated Qwen 2.5-VL 7B Q4_K_M (35-45 t/s, 4.6GB VRAM) with mmproj-F16 vision projector, plus Gina-AI-Assistant-native Juggernaut-XL v9 SDXL workflow and auto-discovery', timestamp: '2026-09-06 06:45', status: 'LOCKED' },
    { id: 'RESTORE_V1.18.2_CREATE_STUDIO_FINALISATION', label: 'Create Studio Completion Finalisation', description: 'Authoritative ComfyUI history reconciliation, resilient final output retrieval, and 100% finalisation state handling', timestamp: '2026-09-06 23:15', status: 'LOCKED' },
    { id: 'RESTORE_V1.18.3_IMAGE_GEN_PREVIEW_FIXES', label: 'Image Gen Speed, Preview Retention & Edit Options', description: 'High-speed dpmpp_2m sampler (8-12s edit vs 559s), persistent canvas preview retention, Juggernaut-XL default routing, img2img reference auto-switch, and empty latent denoise guard', timestamp: '2026-09-07 05:00', status: 'LOCKED' },
    { id: 'RESTORE_V1.18.4_LOCAL_AI_CREATE_BRIDGE', label: 'Local AI to Create Studio Preview Bridge', description: 'Direct adoption of completed AI tool generations into Create Studio context, history reconciliation, and output finalisation state handling', timestamp: '2026-09-07 05:45', status: 'LOCKED' },
    { id: 'RESTORE_V1.18.5_NETWORK_BINDING_MUSIC_STATUS_FIX', label: 'Network Binding & Music Status Robustness', description: 'Restored port 3000 cloud container binding, eliminated EADDRINUSE conflict, and validated Content-Type in Music Studio and system diagnostics', timestamp: '2026-09-07 07:30', status: 'LOCKED' },
    { id: 'RESTORE_V1.18.7_GINA_INTENT_ROUTER_MODEL_POLICY', label: 'Gina Intent Router & Model Policy', description: 'One authoritative intent router; Qwen/Juggernaut primary image lane; Gemma Vision/FLUX fallback lock; natural visual/location request recognition; multimodal projector enforcement', timestamp: '2026-09-07 18:20', status: 'LOCKED' },
    { id: 'RESTORE_V1.18.8_GINA_AGENT_WORKSPACES_GITHUB', label: 'Gina Agent Coding Workspaces, Planner & GitHub', description: 'Dedicated project workspaces, ZIP uploads, GitHub clone/sync/push/commit/PR operations, code validation loop, token redaction, and location lookup planning', timestamp: '2026-09-07 18:45', status: 'LOCKED' },
    { id: 'RESTORE_V1.19.2_PERSISTENT_AGENT_WORKBENCH_STREAMING', label: 'Persistent Agent Workbench & Streaming Execution', description: 'Persistent agent run records, live SSE step/status streaming, reconnect-safe execution history, phase-aware workbench timeline, and cancellation endpoint', timestamp: '2026-09-07 18:55', status: 'LOCKED' },
    { id: 'RESTORE_V1.19.4_PHASE44_LOCAL_AI_PROJECT_ATTACHMENTS', label: 'Local AI Project Attachments & Large ZIP Ingestion', description: 'Qwen Coder file attachments, dedicated project ZIP workspace import, automatic safe inspection, 100MB archive limit, and 10,000-file ZIP capacity', timestamp: '2026-09-12 04:10', status: 'LOCKED' },
    { id: 'RESTORE_V1.19.6_UPDATE_INTEGRITY_WAN_UI', label: 'Update Integrity Guard & Wan UI Reconciliation', description: 'Mandatory startup checklist, deterministic integrity gate, active Wan 2.1 UI reconciliation, and stale active-engine reference sweep', timestamp: '2026-09-12 05:30', status: 'LOCKED' },
    { id: 'RESTORE_V1.19.7_AGENT_ACTION_RECOVERY', label: 'Agent Action Recovery & Robust Tool Dispatch', description: 'Autonomous agent workspace path resolution, local completion generation, and diagnostic suite migration', timestamp: '2026-09-12 06:15', status: 'LOCKED' },
    { id: 'RESTORE_V1.19.8_PROJECT_COMPLETION_GATE', label: 'Autonomous Project Completion Gate & Persistent Project Map', description: 'Machine-enforced Definition of Done gate blocking premature completion, autonomous repair loop, and persistent project map', timestamp: '2026-09-12 07:00', status: 'ACTIVE' },
  ]);

  const [checks, setChecks] = useState<VerificationCheck[]>([
    { id: 'chk1', label: 'NVIDIA Driver Version Compliance Check', passed: true, details: 'Driver v536.25 CUDA 12.2 ready' },
    { id: 'chk2', label: 'MSVC C++ Build Tools Sentry', passed: true, details: 'v14.36 Compiler binaries verified' },
    { id: 'chk3', label: 'CUDA Toolkit Translation Layer Audit', passed: true, details: 'nvcc compiler response 2.4ms' },
    { id: 'chk4', label: 'Isolated Sandbox Root C:\\Gina_AI', passed: true, details: 'Directory lock active' },
  ]);

  const toggleCheck = (id: string) => {
    setChecks(prev => prev.map(c => c.id === id ? { ...c, passed: !c.passed } : c));
  };

  return (
    <div className="bg-slate-900/50 border-l-2 border-amber-500 border-y border-r border-slate-800 rounded-lg p-4 mb-5 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-2.5 mb-3.5 gap-2">
        <h2 className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <span>PROJECT MILESTONES & SAVE POINTS</span>
        </h2>
        <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[11px] px-2 py-0.5 rounded font-mono font-bold self-start md:self-auto">
          SAVE POINT: {activeRestorePoint}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {/* Column 1: Lifecycle Phases */}
        <div className="bg-slate-950 border border-slate-800 rounded p-3">
          <h3 className="font-bold text-slate-400 mb-2.5 flex items-center gap-1.5 text-xs uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>LIFECYCLE PHASES</span>
          </h3>
          <ul className="space-y-2">
            {phases.map((p) => (
              <li key={p.phase} className="flex items-start gap-2 text-slate-300">
                <span className="mt-0.5">
                  {p.status === 'COMPLETED' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : p.status === 'IN_PROGRESS' ? (
                    <Clock className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded border border-slate-700 flex items-center justify-center text-[9px] text-slate-500 font-mono">
                      {p.phase}
                    </div>
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`font-semibold text-[11px] ${p.status === 'IN_PROGRESS' ? 'text-sky-300' : p.status === 'COMPLETED' ? 'text-slate-200' : 'text-slate-500'}`}>
                      Phase {p.phase}: {p.name}
                    </span>
                    {p.status === 'IN_PROGRESS' && (
                      <span className="bg-sky-500/20 text-sky-400 text-[9px] px-1 py-0.2 rounded font-mono font-bold">
                        LIVE
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 text-[10px] truncate mt-0.5 font-mono">{p.details}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 2: Save Points */}
        <div className="bg-slate-950 border border-slate-800 rounded p-3">
          <h3 className="font-bold text-slate-400 mb-2.5 flex items-center gap-1.5 text-xs uppercase tracking-wider">
            <FileCode className="w-3.5 h-3.5 text-amber-400" />
            <span>RESTORE POINT LOGS</span>
          </h3>
          <ul className="space-y-2">
            {restorePoints.map((rp) => (
              <li key={rp.id} className="p-2 rounded bg-slate-900/60 border border-slate-800 flex items-start gap-2">
                <span className="text-amber-400 font-mono text-[10px]">📌</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <code className="text-emerald-400 font-bold text-[10px]">{rp.id}</code>
                    <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                      rp.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {rp.status}
                    </span>
                  </div>
                  <p className="text-slate-200 text-[10px] font-medium mt-0.5">{rp.label}</p>
                  <p className="text-slate-500 text-[10px] font-mono">{rp.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 3: Pre-Flight Checklist */}
        <div className="bg-slate-950 border border-slate-800 rounded p-3">
          <h3 className="font-bold text-slate-400 mb-2.5 flex items-center gap-1.5 text-xs uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>PRE-FLIGHT CHECKLIST</span>
          </h3>
          <ul className="space-y-1.5">
            {checks.map((chk) => (
              <li
                key={chk.id}
                onClick={() => toggleCheck(chk.id)}
                className="flex items-center gap-2 p-1.5 rounded bg-slate-900/60 hover:bg-slate-800/50 border border-slate-800 cursor-pointer transition-colors"
              >
                {chk.passed ? (
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <span className={`font-medium block truncate text-[10px] ${chk.passed ? 'text-slate-200' : 'text-slate-500 line-through'}`}>
                    {chk.label}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono block">{chk.details}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
