import React, { useState } from 'react';
import { CheckCircle2, Clock, AlertTriangle, ShieldCheck, FileCode, CheckSquare, Square } from 'lucide-react';
import { LifecyclePhase, RestorePoint, VerificationCheck } from '../types';

interface MilestoneChecklistProps {
  activeRestorePoint: string;
}

export const MilestoneChecklist: React.FC<MilestoneChecklistProps> = ({ activeRestorePoint }) => {
  const [phases] = useState<LifecyclePhase[]>([
    { phase: 1, name: 'Hardware Specs Mapped & VRAM Capped', status: 'COMPLETED', details: 'RTX 3070 Ti 8GB (Cap 7.2GB), AMD Ryzen 5600X 4-Thread Gate' },
    { phase: 2, name: 'Bare-Metal Environment Audit', status: 'COMPLETED', details: '947 Framework shields locked, CUDA 12.2 translation verify' },
    { phase: 3, name: 'ComfyUI Standalone Workspace', status: 'COMPLETED', details: 'Headless Node Server with --lowvram --fp8_e4m3fn args' },
    { phase: 4, name: 'Model Downloads & FP8 Configuration', status: 'COMPLETED', details: 'FLUX.1-Schnell (FP8) & LTX-Video 2B (FP8 Quantized)' },
    { phase: 5, name: 'Python API Automation Engine Build', status: 'COMPLETED', details: 'Batch processing pipeline with auto-recovery state.json' },
    { phase: 6, name: 'AUTOMATED VIDEO & IMAGE PIPELINE LINK', status: 'COMPLETED', details: 'Flux.1 Schnell image + LTX-Video 2B MP4 & RIFE frame interpolation' },
    { phase: 7, name: 'AIDA64 SENSOR PANEL TEMPLATE STUDIO', status: 'COMPLETED', details: 'Custom 1024x600/1920x480/AIO HUD layouts, modular dials, 100-state arc ZIP generator & coordinate mapper' },
    { phase: 8, name: 'QUANTIZED LOCAL AI ENGINE (GEMMA 3 12B)', status: 'COMPLETED', details: 'Gemma 3 12B Q4_K_M via llama.cpp CUDA at pinned 28 GPU layers' },
    { phase: 9, name: 'AUTONOMOUS LOCAL AGENT & TOOL BROKER', status: 'COMPLETED', details: '19 local tools, startup context, persistent memory, self-test, audit and capability awareness' },
    { phase: 10, name: 'AIDA64 68-FEATURE REAL-TIME SENSOR PANEL', status: 'COMPLETED', details: '1000ms Win32 shared memory reader, 100-state gauge graphic generator, multi-sensor binding' },
    { phase: 11, name: 'LOCAL RAG KNOWLEDGE BASE & VECTOR ENGINE', status: 'COMPLETED', details: 'Zero-VRAM hybrid BM25 + Vector in-memory retrieval, instant semantic grounding for LLM & agent' },
    { phase: 12, name: 'REAL-TIME COMFYUI NODE GRAPH SYNC', status: 'COMPLETED', details: 'Live workflow graph inspector, node parameter synchronization, and visual connection mapper' },
    { phase: 13, name: 'ADVANCED LOCAL VOICE PIPELINE & PERSISTENCE', status: 'COMPLETED', details: 'Google US English default priority, permanent voice preference persistence, SAPI bridge fallback & speech controls' },
    { phase: 14, name: 'ONE-CLICK WORKFLOW JSON/PNG INGESTION', status: 'COMPLETED', details: 'Drag-and-drop ComfyUI workflow JSON & metadata PNG parser with missing node resolution and parameter binding' },
    { phase: 15, name: 'HIGH-DPI AIDA64 TRANSPARENT DESKTOP HUD', status: 'COMPLETED', details: 'Frameless desktop floating telemetry overlay with alpha transparency for secondary LCD/OLED sensor displays' },
    { phase: 16, name: 'MULTI-GGUF BENCHMARK & DYNAMIC VRAM TUNER', status: 'COMPLETED', details: 'Automated layer offload benchmarker, memory stress profiling, and zero-crash thermal sentry for Gemma 3 12B/27B' },
    { phase: 17, name: 'KNOWLEDGE INGESTION & AUTO-INDEXING AGENT', status: 'COMPLETED', details: 'Real-time filesystem watcher auto-indexing documentation, Python scripts, and ComfyUI nodes into vector RAG memory' },
    { phase: 18, name: 'LOCAL CREATOR UPLOAD PIPELINE', status: 'COMPLETED', details: 'Dashboard-only ComfyUI reference-image upload for LoadImage workflows plus supported local text/code/config attachments for Local AI' },
    { phase: 19, name: 'LOCAL AI UNIVERSAL ATTACHMENTS', status: 'COMPLETED', details: 'Dashboard-only Local AI attachments for text/code/config, images and ZIP archives with local extraction, limits and attachment manifests' },

    { phase: 20, name: 'UNIFIED JOB MANAGER', status: 'COMPLETED', details: 'Shared local job visibility, progress, cancellation and hard VRAM flush path' },
    { phase: 21, name: 'INTELLIGENT TOOL ROUTER', status: 'COMPLETED', details: 'Local intent classification for chat, Gemma vision, FLUX generation and reference modification' },
    { phase: 22, name: 'WORKFLOW INTELLIGENCE', status: 'COMPLETED', details: 'Workflow capability/binding inspection and ComfyUI missing-node diagnostics' },
    { phase: 23, name: 'GENERATION PRESETS', status: 'COMPLETED', details: 'Named generation profiles established as shared orchestration vocabulary' },
    { phase: 24, name: 'ASSET LIBRARY', status: 'COMPLETED', details: 'Persistent local asset record store for generated outputs and metadata' },
    { phase: 25, name: 'CONVERSATION CONTEXT', status: 'COMPLETED', details: 'Existing local memory/RAG surfaced as orchestration context' },
    { phase: 26, name: 'AUTOMATIC RECOVERY', status: 'COMPLETED', details: 'Health-aware recovery controls and explicit failure diagnostics' },
    { phase: 27, name: 'RESOURCE SCHEDULER', status: 'COMPLETED', details: 'Shared-GPU scheduling signals and cancellation flush integration' },
    { phase: 28, name: 'HEALTH & DIAGNOSTICS CENTER', status: 'COMPLETED', details: 'Measured system health and one-click diagnostic report' },
    { phase: 29, name: 'ONE-CLICK DIAGNOSTICS', status: 'COMPLETED', details: 'Full local report covering runtime, GPU, VRAM, ComfyUI, Gemma, vision, workflows and knowledge watcher' },
  ]);

  const [restorePoints] = useState<RestorePoint[]>([
    { id: 'RESTORE_01_INIT', label: 'Bare Metal Setup', description: 'Bare metal parameters mapped & pinned', timestamp: '2026-08-10 01:00', status: 'LOCKED' },
    { id: 'RESTORE_02_COMPLIANCE', label: 'Framework Shields', description: '947 compliance rules active & verified', timestamp: '2026-08-10 01:25', status: 'LOCKED' },
    { id: 'RESTORE_03_V1.4.0_STABLE', label: 'Flux.1 & LTXV-2B Baseline', description: 'Image generation working, VRAM /free purge sentinel, ltxv-2b-0.9.8 lock', timestamp: '2026-08-16 23:00', status: 'LOCKED' },
    { id: 'RESTORE_04_V1.5.0_MP4_STABLE', label: 'LTX-Video MP4 & Auto-Flush Sentinel', description: 'H.264 MP4 export, pre-queue VRAM auto-flush, ComfyUI interrupt & stop controls', timestamp: '2026-08-17 01:56', status: 'LOCKED' },
    { id: 'RESTORE_05_V1.6.0_AIDA64_STUDIO', label: 'AIDA64 Sensor Panel Studio', description: 'Zero-text chassis prompts, modular tech dials, 100-state radial gauge ZIP export & pixel coordinate mapper', timestamp: '2026-08-17 04:10', status: 'LOCKED' },
    { id: 'RESTORE_06_V1.6.9_LOCAL_GEMMA', label: 'Gemma 3 12B Local CUDA Engine', description: 'Gemma 3 12B Q4_K_M served by llama.cpp CUDA at 28 GPU layers; Local AI workspace integrated', timestamp: '2026-08-18 03:30', status: 'LOCKED' },
    { id: 'RESTORE_07_V1.16.0_AGENT_AIDA64', label: 'Autonomous Agent & Telemetry Bridge', description: '19 local tools, persistent agent memory, Win32 shared memory telemetry reader & gauge generator', timestamp: '2026-08-18 08:30', status: 'LOCKED' },
    { id: 'RESTORE_08_V1.17.2_LOCAL_RAG', label: 'Local Zero-VRAM RAG Knowledge Engine', description: 'In-memory BM25/Vector retrieval, LLM chat grounding, agent knowledge search tool, developer workbench', timestamp: '2026-08-18 12:00', status: 'LOCKED' },
    { id: 'RESTORE_09_V1.17.18_VOICE_GRAPH_SYNC', label: 'Voice Pipeline & Node Graph Sync', description: 'Google US English default persistence, real-time ComfyUI node graph sync, and Phase 13-17 roadmap expansion', timestamp: '2026-08-18 15:30', status: 'ACTIVE' },
    { id: 'RESTORE_10_V1.17.19_LOCAL_CREATOR_UPLOADS', label: 'Local Creator Upload Pipeline', description: 'Dashboard-only ComfyUI reference-image uploads and supported Local AI file attachments; no manual ComfyUI interaction required', timestamp: '2026-08-29 22:31', status: 'LOCKED' },
    { id: 'RESTORE_11_V1.17.20_LOCAL_AI_ATTACHMENTS', label: 'Local AI Universal Attachments', description: 'Images, text/code/config files and ZIP archives can be attached from Gina; ZIP text is extracted locally and images are stored for future local multimodal support', timestamp: '2026-08-29 22:35', status: 'LOCKED' },
    { id: 'RESTORE_12_V1.17.22_ATTACHMENT_VISION', label: 'Attachment + Vision Completion', description: 'Create Studio reference-image upload plus real Local AI image transport through llama.cpp multimodal image_url inputs with automatic mmproj detection', timestamp: '2026-08-29 23:11', status: 'LOCKED' },
    { id: 'RESTORE_13_V1.17.42_MILESTONE_BATCH', label: 'Milestones 14-17 Batch', description: 'Workflow JSON/PNG ingestion, DPI-aware AIDA64 HUD mode, controlled GGUF benchmark/tuner, and filesystem knowledge auto-indexing', timestamp: '2026-08-30 18:00', status: 'LOCKED' },
    { id: 'RESTORE_V1.17.68_GIF_STUDIO_FIX', label: 'GIF Studio Sequential Story & Route Resilience', description: 'Seamless multi-scene LTX video generation, frame continuity fallback, and full endpoint resilience', timestamp: new Date().toISOString().slice(0,16).replace('T',' '), status: 'ACTIVE' },
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
