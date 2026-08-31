import React, { useState } from 'react';
import {
  Sparkles,
  Cpu,
  Brain,
  Video,
  ImageIcon,
  ShieldCheck,
  Zap,
  Sliders,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle2,
  Terminal,
  Activity,
  History,
  Gauge,
  Lock,
  Network,
  BookOpen,
  ArrowRight,
  Database,
  Layers,
  FileCode,
  HardDrive
} from 'lucide-react';

export const AppFeaturesGuide: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'studios' | 'architecture' | 'roadmap'>('studios');
  const [selectedFeature, setSelectedFeature] = useState<string>('prompt_studio');

  const features = [
    {
      id: 'prompt_studio',
      title: 'Prompt Automation Studio (FLUX.1 Schnell GGUF Q4_K_S)',
      icon: Brain,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/30',
      badge: 'FLUX.1 Schnell',
      category: 'Image Inference',
      shortDesc: 'Workflow-driven prompt engineering, dynamic parameter binding, token budget enforcement, and fast 4-step generation.',
      details: [
        'FLUX.1 Schnell GGUF Q4_K_S Pipeline: 4-step local diffusion using the installed UnetLoaderGGUF model.',
        'Dynamic Workflow Binding: Introspects workflows/flux_image.json and binds controls to prompt, seed, steps, CFG, aspect ratios, and dimensions.',
        'Token Budget & Parameter Control: Enforces safe token counts, seeds, CFG scales (1-10), and aspect ratios (1:1, 16:9, 9:16, 4:3, 3:4).',
        'Direct ComfyUI Queueing: Compiles and dispatches JSON workflows directly to the local ComfyUI instance at 127.0.0.1:8188.',
        'Local Output Management: Instant image preview, single-click variations, local asset saving, and direct download.',
        'Dashboard Reference Images: Upload PNG/JPG/WEBP/BMP/GIF references directly from Gina into ComfyUI input and bind them to LoadImage workflows without opening ComfyUI.'      ]
    },
    {
      id: 'video_studio',
      title: 'LTX-Video 2.5 & RIFE Motion Studio',
      icon: Video,
      color: 'text-sky-400',
      bgColor: 'bg-sky-500/10',
      borderColor: 'border-sky-500/30',
      badge: 'LTX-Video + RIFE',
      category: 'Video Pipeline',
      shortDesc: 'Dedicated text-to-video studio using the locally installed LTX-Video pipeline, H.264 MP4 export, and optional RIFE interpolation.',
      details: [
        'LTX-Video 2.5: Model identity is discovered from the installed ComfyUI workflow/model files so the System tab does not advertise an obsolete checkpoint filename.',
        'AI Frame Interpolation (RIFE VFI): Pairwise frame synthesis (2× 50fps and 4× 60fps slomo) yielding smooth video with low VRAM footprint.',
        '8GB VRAM Safe Zone Matrix: Configured with 512x512 25-frame baselines to ensure crash-free execution within 8GB GPU memory constraints.',
        'H.264 MP4 Direct Pipeline: Uses VHS_VideoCombine node for universal browser and device playback.',
        'Pre-Queue Auto-Flush Sentinel: Automatically executes /free memory purges before video tensor loading.'
      ]
    },
    {
      id: 'aida64_studio',
      title: 'AIDA64 68-Feature Gauge Factory & Telemetry',
      icon: Gauge,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      badge: '68+ Features + True Alpha',
      category: 'Telemetry & UI',
      shortDesc: 'Real-time Win32 Shared Memory reader (1000ms), true alpha 1024x600 canvas, and 100-state gauge graphic packager.',
      details: [
        'Win32 Shared Memory Bridge: Reads AIDA64_SensorValues memory-mapped file every 1000ms via OpenFileMappingA / MapViewOfFile.',
        '100-State Gauge Generator: Produces high-resolution 0% to 100% radial dials, linear bars, and digital LCD glow graphic sequences for dynamic runtime binding.',
        '68 Telemetry Features: Full mapping for GPU/CPU clocks, power, temperatures, fans, VRAM allocations, frame rates, and voltages.',
        'Zero Baked Text Rule: Generates pristine, un-occluded alpha backgrounds for custom sensor coordinate placement.',
        'ZIP Batch Packager: Compiles state PNGs, coordinate JSON manifests, and AIDA64 sensor profiles for instant import.'
      ]
    },
    {
      id: 'local_llm',
      title: 'Gemma 3 12B IT Local CUDA Studio',
      icon: Cpu,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      badge: 'Gemma 3 12B · 28 Layers',
      category: 'Local LLM Inference',
      shortDesc: 'Quantized Gemma 3 12B IT served via llama.cpp CUDA backend at pinned 28 GPU layers on port 8080.',
      details: [
        'Quantized Model: Gemma 3 12B IT (Q4_K_M GGUF) running locally without external cloud dependencies.',
        'llama-server.exe CUDA Backend: Bound to http://127.0.0.1:8080/v1 with 4096 context window and 6 CPU threads.',
        'Pinned 28 GPU Layers: Verified at ~9.2-10.7 tokens/sec; safely avoids the 36-layer VRAM paging performance cliff.',
        'VRAM Mutual Exclusion: Automatically purges ComfyUI cache prior to starting Gemma to ensure stability on 8GB VRAM.',
        'Interactive Voice Mode: High-fidelity natural voice default set to "Google US English" with multi-engine fallback to Windows SAPI and browser SpeechSynthesis.'
      ]
    },
    {
      id: 'comfy_node_graph',
      title: 'Real-Time ComfyUI Node Graph Sync & Workflow Inspector',
      icon: Network,
      color: 'text-sky-400',
      bgColor: 'bg-sky-500/10',
      borderColor: 'border-sky-500/30',
      badge: 'Live · Graph Sync',
      category: 'Node Graph Sync',
      shortDesc: 'Live ComfyUI node graph parser, dynamic input parameter bindings, and visual workflow topology mapper.',
      details: [
        'Live Workflow Graph Inspector: Introspects prompt/template nodes, class types, inputs, widgets, and links in real time.',
        'Node Parameter Synchronization: Auto-extracts prompt bindings (positivePrompt, width, height, steps, seed, CFG) from registered JSON workflows.',
        'Dual-Mode Visualizer: Provides high-level parameter overview cards alongside full node graph connection matrices.',
        'Zero-Latency Status Polling: WebSocket-assisted status polling verifying ComfyUI server state at 127.0.0.1:8188.'
      ]
    },
    {
      id: 'autonomous_agent',
      title: 'Gina Autonomous Local Agent & 19-Tool Broker',
      icon: Terminal,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/30',
      badge: '19 Local Tools',
      category: 'Autonomous Agent',
      shortDesc: 'Local autonomous agent with startup project context bootstrap, persistent memory, and sandboxed tools.',
      details: [
        '19 Local Tools: inspect_system, inspect_capabilities, knowledge_search, search_files, read_file, write_file, execute_command, git_status, git_diff, git_log, remember, recall_memory, comfy_clear_cache, llm_start, llm_stop, llm_restart, build_aida64_template, write_pdf, and inspect_project_context.',
        'Persistent Memory: Stored locally at C:\\Gina_AI\\.gina\\agent-memory.json (local-only, not checked into source control).',
        'Startup Context Bootstrap: Loads AGENTS.md, CHANGELOG.md, README.md, MilestoneChecklist, package.json, and hardware state on boot.',
        'Audit Trail & Scope Guard: All file modifications and shell commands are logged to audit records and locked within C:\\Gina_AI.'
      ]
    },
    {
      id: 'zero_vram_rag',
      title: 'Zero-VRAM Local RAG Knowledge Engine',
      icon: BookOpen,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      badge: '0 MB VRAM · Hybrid Search',
      category: 'Semantic Grounding',
      shortDesc: 'In-memory BM25 + Vector semantic retrieval providing instant hardware, workflow, and sensor ground truth for LLM & agent.',
      details: [
        'Zero-VRAM Architecture: Uses CPU in-memory inverted index and TF-IDF vector math (< 1MB RAM, 0 MB GPU VRAM).',
        'Pre-Seeded Knowledge: Immediate ground truth for RTX 3070 Ti 7372 MB VRAM cap, 80°C thermal brake, 28 GPU layer pin, and AIDA64 sensors.',
        'Automatic Chat Grounding: Dynamically injects local hardware specs and workflow rules into Gemma 3 12B chat prompts.',
        'Instant Multi-Category Filtering: Filter and query across HARDWARE, LLM, AIDA64, AGENT, WORKFLOWS, and ARCHITECTURE.'
      ]
    },
    {
      id: 'voice_synthesis',
      title: 'Advanced Local Voice Pipeline & Persistent Presets',
      icon: Sparkles,
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/10',
      borderColor: 'border-pink-500/30',
      badge: 'Google US English · Persistent',
      category: 'Voice Pipeline',
      shortDesc: 'Natural Google US English default voice with permanent localStorage persistence, Windows SAPI bridge fallback, and speech rate modifier.',
      details: [
        'Google US English Natural Default: Prioritizes crystal-clear natural Google US English synthesis for immediate spoken feedback.',
        'Permanent Default Voice Persistence: Save any browser or Windows SAPI voice as your permanent default via one-click "★ Set Default".',
        'Multi-Engine Hybrid Speech Broker: Seamlessly routes between high-fidelity browser SpeechSynthesis and Windows SAPI backend bridge.',
        'Zero-GPU Audio Execution: Audio playback is processed completely outside GPU VRAM, keeping 100% of the 8GB RTX 3070 Ti free for FLUX/LTX/Gemma.',
        'Dynamic Speech Rate & Test Controls: Fine-tune speech pacing (-5 to +5 rate slider) with real-time waveform testing.'
      ]
    },
    {
      id: 'workflow_ingestion',
      title: 'One-Click Workflow JSON/PNG Ingestion Engine',
      icon: HardDrive,
      color: 'text-violet-400',
      bgColor: 'bg-violet-500/10',
      borderColor: 'border-violet-500/30',
      badge: 'Live · Workflow Ingestion',
      category: 'Workflow Automation',
      shortDesc: 'Direct ComfyUI workflow .json and metadata-embedded .png canvas drop zone with missing node scanner and auto-mapping.',
      details: [
        'Drag-and-Drop Workflow Ingestion: Instant import of custom ComfyUI workflow JSON files and image PNGs with embedded metadata chunks.',
        'Missing Custom Node Scanner: Automatically parses node class types against installed ComfyUI custom nodes and highlights dependencies.',
        'Dynamic Parameter Binding: Auto-detects prompt inputs, seeds, samplers, and dimension widgets and exposes interactive UI sliders.',
        'Local File Persistence: Saves imported workflows into C:\\Gina_AI\\workflows\\ with version tags and instant queue capability.'
      ]
    },
    {
      id: 'aida64_hud_overlay',
      title: 'High-DPI AIDA64 Transparent Desktop HUD Dock',
      icon: Sliders,
      color: 'text-teal-400',
      bgColor: 'bg-teal-500/10',
      borderColor: 'border-teal-500/30',
      badge: 'Live · Alpha HUD',
      category: 'Telemetry UI',
      shortDesc: 'Frameless desktop floating telemetry overlay with true alpha transparency for secondary LCD/OLED sensor monitors.',
      details: [
        'Frameless Floating Window Dock: Ultra-clean transparent HUD widget designed to dock onto dedicated 1024x600 or 1920x480 sub-monitors.',
        'True Alpha Channel Background: Zero background window borders, perfectly blending real-time GPU/CPU gauges into desktop wallpapers.',
        'Live 1000ms Shm Sync: Direct link to AIDA64 Win32 shared memory with sub-millisecond gauge pointer updates.',
        'Custom Preset Layouts: Instant switching between Cyberpunk, Minimalist Tachometer, AIO Pump Circle, and Ultra-Wide Bar HUD layouts.'
      ]
    },
    {
      id: 'multi_gguf_benchmark',
      title: 'Multi-GGUF Benchmark Suite & Dynamic VRAM Tuner',
      icon: Activity,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
      badge: 'Live · Dynamic VRAM Tuner',
      category: 'Performance Benchmarking',
      shortDesc: 'Automated layer offload benchmarking, memory stress profiling, and dynamic VRAM/thermal protection for the current local GGUF stack.',
      details: [
        'Automated Layer Offload Benchmarking: Measures tokens/sec generation speed across 24, 28, 32, and 36 GPU layers on CUDA.',
        'VRAM Paging Cliff Detector: Automatically identifies the exact layer count before Windows VRAM paging degrades performance from 10 t/s to 1.3 t/s.',
        'Quantization Comparison: Compares Q4_K_M vs Q5_K_M vs Q8_0 throughput and memory footprints on the 8GB RTX 3070 Ti.',
        'Hardware Stress & Thermal Sentry: Real-time logging of GPU junction temperature and power draw during high-context prompts.'
      ]
    },
    {
      id: 'hardware_sentinel',
      title: 'RTX 3070 Ti 8GB Hardware Sentinel & NVML Stream',
      icon: Activity,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/30',
      badge: '7372 MB VRAM Cage',
      category: 'Hardware Safety',
      shortDesc: 'Real-time GPU/CPU hardware monitoring with a 7372MB VRAM safety cage, 60°C performance target, 85°C emergency brake, and auto-purging.',
      details: [
        'VRAM Safety Cage: Capped at 7372 MB (90% ceiling of 8 GB RTX 3070 Ti) to guarantee Windows DWM stability.',
        'Proactive Memory Purge: Automatic cache eviction and model unloading when VRAM approaches threshold.',
        'Automatic OOM Cooldown: Detects CUDA Out of Memory events via real-time log parsing and triggers a 5-second recovery breath.',
        'Thermal Governance: GIF/video processing targets 60°C and escalates to the 85°C emergency brake when required.',
        'Live NVML D3.js Telemetry: Real-time graphs displaying VRAM usage, GPU core temperature, and system RAM across tabs.'
      ]
    }
  ];

  const roadmap = [
    { phase: 1, name: 'Project Initialization & Base Environment', status: 'COMPLETED' },
    { phase: 2, name: 'Hardware Capability & VRAM Guardrails', status: 'COMPLETED' },
    { phase: 3, name: 'ComfyUI Local Execution & WebSocket Bridge', status: 'COMPLETED' },
    { phase: 4, name: 'FLUX.1 Schnell GGUF Image Studio', status: 'COMPLETED' },
    { phase: 5, name: 'Python API Automation Engine Build', status: 'COMPLETED' },
    { phase: 6, name: 'Video & Image Pipeline Link (LTX-Video 2.5 + RIFE)', status: 'COMPLETED' },
    { phase: 7, name: 'AIDA64 Sensor Panel Template Studio', status: 'COMPLETED' },
    { phase: 8, name: 'Quantized Local AI Engine (Gemma 3 12B IT CUDA)', status: 'COMPLETED' },
    { phase: 9, name: 'Autonomous Local Agent & 19-Tool Broker', status: 'COMPLETED' },
    { phase: 10, name: 'AIDA64 68-Feature Real-Time Sensor Panel & Shared Memory', status: 'COMPLETED' },
    { phase: 11, name: 'Local Zero-VRAM RAG Knowledge Base & Vector Engine', status: 'COMPLETED' },
    { phase: 12, name: 'Real-Time ComfyUI Node Graph Sync & Workflow Controls', status: 'COMPLETED' },
    { phase: 13, name: 'Advanced Local Voice Pipeline & Persistent Voice Presets', status: 'COMPLETED' },
    { phase: 14, name: 'One-Click Workflow JSON/PNG Drag & Drop Ingestion Engine', status: 'COMPLETED' },
    { phase: 15, name: 'High-DPI AIDA64 Frameless Desktop HUD & Sensor Dock', status: 'COMPLETED' },
    { phase: 16, name: 'Multi-GGUF Benchmark Suite & Dynamic VRAM Layer Tuner', status: 'COMPLETED' },
    { phase: 17, name: 'Local Filesystem Knowledge Ingestion & Auto-Indexing Agent', status: 'COMPLETED' },
  ];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg transition-all mb-5">
      {/* Overview Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 mb-4 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide flex items-center gap-2">
              <span>PROJECT SYSTEM ARCHITECTURE & FEATURE GUIDE</span>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] px-2 py-0.5 rounded font-mono">
                GINA AI FACTORY V1.17.19
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Comprehensive architectural topology, bare-metal GPU safety cages, service boundaries, and milestone progress.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Tab Buttons */}
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setActiveTab('studios')}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === 'studios' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              STUDIOS & ENGINES ({features.length})
            </button>
            <button
              onClick={() => setActiveTab('architecture')}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === 'architecture' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ARCHITECTURE FLOW
            </button>
            <button
              onClick={() => setActiveTab('roadmap')}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === 'roadmap' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ROADMAP (17 PHASES)
            </button>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs font-mono text-slate-400 hover:text-slate-200 bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800 transition-all cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4">
          {/* TAB 1: Studios & Features */}
          {activeTab === 'studios' && (
            <div className="space-y-4">
              {/* Feature Quick Selector Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {features.map((item) => {
                  const Icon = item.icon;
                  const isSelected = selectedFeature === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedFeature(item.id)}
                      className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? `${item.bgColor} ${item.borderColor} ring-1 ring-emerald-500/50 shadow-sm`
                          : 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Icon className={`w-4 h-4 ${item.color}`} />
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                            {item.badge}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono uppercase text-slate-500 block mb-0.5">{item.category}</span>
                        <h3 className="text-xs font-bold text-slate-200 leading-tight mb-1">{item.title}</h3>
                        <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{item.shortDesc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Detailed View Card for Selected Feature */}
              {(() => {
                const active = features.find(f => f.id === selectedFeature) || features[0];
                const Icon = active.icon;
                return (
                  <div className={`p-4 rounded-xl border bg-slate-950/90 ${active.borderColor}`}>
                    <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-5 h-5 ${active.color}`} />
                        <div>
                          <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wide">{active.title} — Verified Capabilities</h3>
                          <span className="text-[10px] text-slate-400 font-mono">{active.shortDesc}</span>
                        </div>
                      </div>
                      <span className="bg-slate-900 text-emerald-400 border border-slate-800 text-[10px] font-mono px-2 py-0.5 rounded">
                        Category: {active.category}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs font-mono">
                      {active.details.map((detail, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="text-[11px] text-slate-300 leading-relaxed">{detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 2: Architecture Flow Diagram */}
          {activeTab === 'architecture' && (
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-4">
              <div className="text-xs font-semibold text-slate-200 mb-2 flex items-center gap-2">
                <Network className="w-4 h-4 text-emerald-400" />
                <span>Bare-Metal System Topology & Multi-Runtime Execution Boundaries</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
                {/* Level 1: Frontend */}
                <div className="bg-slate-900/90 border border-cyan-500/30 rounded-lg p-3 space-y-2">
                  <div className="text-[10px] uppercase font-bold text-cyan-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" /> 1. Client Presentation
                  </div>
                  <div className="text-slate-300 text-[11px] font-semibold">React 19 + Vite</div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Runs on port 3200 (Windows) / 3000 (Cloud). Real-time telemetry widgets, prompt & video studios, and AIDA64 layout editor.
                  </p>
                </div>

                {/* Level 2: Backend */}
                <div className="bg-slate-900/90 border border-emerald-500/30 rounded-lg p-3 space-y-2">
                  <div className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5" /> 2. Express Server
                  </div>
                  <div className="text-slate-300 text-[11px] font-semibold">Node.js Express Brokers</div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Orchestrates REST routes, agent tool broker (19 tools), memory manager, and zero-VRAM BM25/Vector RAG engine.
                  </p>
                </div>

                {/* Level 3: Runtimes */}
                <div className="bg-slate-900/90 border border-amber-500/30 rounded-lg p-3 space-y-2">
                  <div className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" /> 3. Dedicated Runtimes
                  </div>
                  <div className="text-slate-300 text-[11px] font-semibold">ComfyUI & llama.cpp</div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    ComfyUI on port 8188 for FLUX/LTX/GIF/RIFE workflows; llama-server on port 8080 for Gemma local inference. Mutual cache purges protect the 8GB VRAM budget.
                  </p>
                </div>

                {/* Level 4: Hardware */}
                <div className="bg-slate-900/90 border border-rose-500/30 rounded-lg p-3 space-y-2">
                  <div className="text-[10px] uppercase font-bold text-rose-400 flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5" /> 4. Hardware Sentinel
                  </div>
                  <div className="text-slate-300 text-[11px] font-semibold">RTX 3070 Ti 8GB</div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Locked at 7372 MB VRAM cap (90% ceiling), with 60°C performance governance and an 85°C emergency brake.
                  </p>
                </div>
              </div>

              {/* Data Flow Highlights */}
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-[11px] text-slate-300 font-mono space-y-1.5">
                <div className="text-emerald-400 font-bold text-xs">Runtime Security & Port Mappings:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                  <div>• Creator Dashboard: <code className="text-slate-200">http://127.0.0.1:3200</code></div>
                  <div>• ComfyUI WebSocket/REST: <code className="text-slate-200">http://127.0.0.1:8188</code></div>
                  <div>• llama.cpp local GGUF engine: <code className="text-slate-200">http://127.0.0.1:8080/v1</code></div>
                  <div>• AIDA64 Memory Mapped File: <code className="text-slate-200">AIDA64_SensorValues (1000ms)</code></div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Roadmap & Next Steps */}
          {activeTab === 'roadmap' && (
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <History className="w-4 h-4 text-purple-400" />
                  <span>Project Lifecycle Stages & Milestone Roadmap</span>
                </div>
                <span className="text-[10px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded">
                  13 of 17 Phases Completed
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs font-mono">
                {roadmap.map((r) => (
                  <div
                    key={r.phase}
                    className={`p-2.5 rounded-lg border flex items-center justify-between ${
                      r.status === 'COMPLETED'
                        ? 'bg-slate-900/60 border-slate-800 text-slate-300'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 ring-1 ring-emerald-500/40'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[10px] px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800">
                        P{r.phase}
                      </span>
                      <span className="text-[11px]">{r.name}</span>
                    </div>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        r.status === 'COMPLETED' ? 'bg-slate-950 text-slate-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
