import React, { useEffect, useState } from 'react';
import {
  ChevronRight,
  Terminal,
  FileCode,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RotateCw,
  CheckCircle2,
  Cpu,
  Zap,
  Layers,
  Activity,
} from 'lucide-react';

interface LogStep {
  id: string;
  type: 'command' | 'file-edit' | 'info';
  title: string;
  details?: string;
  isExpandable: boolean;
}

const PROMPT_MODES = ['🌐 Web-Search', '📱 Web-App', '💻 Code Engine', '🖼️ Image Studio', '📼 Video Out'];

export default function UnifiedAiDashboard() {
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({ 'step-1': true });
  const [isConfigHidden, setIsConfigHidden] = useState(false);
  const [activeTab, setActiveTab] = useState('🌐 Web-Search');

  // Live prompt-response metrics simulator. This remains intentionally local UI telemetry.
  const [tokensPerSec, setTokensPerSec] = useState(42.5);
  const [activePrompts, setActivePrompts] = useState(1);
  const [inferenceLatency, setInferenceLatency] = useState(18.24);
  const [pipelineCache, setPipelineCache] = useState(124);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTokensPerSec((prev) =>
        Math.max(
          35,
          Math.min(55, Number((prev + (Math.random() * 4 - 2)).toFixed(1))),
        ),
      );

      setInferenceLatency((prev) =>
        Math.max(
          15,
          Math.min(22, Number((prev + (Math.random() * 0.8 - 0.4)).toFixed(2))),
        ),
      );

      if (Math.random() > 0.85) {
        setActivePrompts((prev) => {
          if (prev === 0) return 1;
          return Math.random() > 0.5 ? prev + 1 : Math.max(0, prev - 1);
        });
      }

      if (Math.random() > 0.7) {
        setPipelineCache((prev) =>
          Math.max(90, Math.min(160, prev + Math.floor(Math.random() * 6 - 3))),
        );
      }
    }, 800);

    return () => window.clearInterval(interval);
  }, []);

  const steps: LogStep[] = [
    {
      id: 'step-1',
      type: 'command',
      title: 'Ran a command',
      isExpandable: true,
      details: '$ python scripts/gina_motion_physics_engine.py --mode validate',
    },
    {
      id: 'step-2',
      type: 'file-edit',
      title: 'Edited a file version.ts',
      isExpandable: false,
    },
    {
      id: 'step-3',
      type: 'command',
      title: 'Ran 2 validation commands (MCP Tool Flow)',
      isExpandable: true,
      details: '$ jq empty metadata.json && echo "JSON Validated Successfully"',
    },
    {
      id: 'step-4',
      type: 'file-edit',
      title: 'Edited a file package.json',
      isExpandable: false,
    },
  ];

  const toggleStep = (step: LogStep) => {
    if (!step.isExpandable) return;
    setExpandedItems((prev) => ({ ...prev, [step.id]: !prev[step.id] }));
  };

  return (
    <div className="w-full min-h-screen bg-[#07090E] text-zinc-300 font-sans flex flex-col overflow-x-hidden select-none">
      {/* 1. TOP GLOBAL NAVIGATION HEADER */}
      <header className="w-full shrink-0 bg-[#0B0F17] border-b border-zinc-900 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar min-w-0">
          {PROMPT_MODES.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded transition-all whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              aria-pressed={activeTab === tab}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="bg-emerald-950 text-emerald-400 border border-emerald-900 px-2 py-1 rounded text-[10px]">
            ⚡ TELEMETRY
          </span>
          <span className="bg-amber-950 text-amber-400 border border-amber-900 px-2 py-1 rounded text-[10px]">
            🔌 POWER
          </span>
          <span className="bg-blue-950 text-blue-400 border border-blue-900 px-2 py-1 rounded text-[10px]">
            💾 SAVINGS
          </span>
          <button
            type="button"
            onClick={() => setIsConfigHidden((prev) => !prev)}
            className="text-zinc-500 hover:text-zinc-300 px-2 py-1 border border-zinc-800 rounded"
            aria-expanded={!isConfigHidden}
          >
            ⚙️ Config
          </button>
          <button
            type="button"
            onClick={() => setExpandedItems({})}
            className="text-rose-500 hover:text-rose-400 px-2 py-1 border border-zinc-800 rounded"
            title="Collapse the activity screen"
          >
            🧹 CLEAR SCREEN
          </button>
        </div>
      </header>

      {/* MAIN VIEW AREA CONTAINER */}
      <main className="flex-1 min-h-0 p-4 flex flex-col gap-4 w-full mx-auto">
        {/* 2. ROW A: LOCAL AI GENERATION TELEMETRY GRID */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#0B0F17] border border-zinc-900 p-3 rounded-lg">
          <MetricCard
            icon={<Layers className="w-3 h-3" />}
            label="Generation Velocity"
            value={`${tokensPerSec} Tok/s`}
          />
          <MetricCard
            icon={<Activity className="w-3 h-3" />}
            label="Active Prompt Queue"
            value={String(activePrompts)}
          />
          <MetricCard
            icon={<Cpu className="w-3 h-3" />}
            label="Inference Latency"
            value={`${inferenceLatency}ms`}
          />
          <MetricCard
            icon={<Zap className="w-3 h-3" />}
            label="Response Pipe Cache"
            value={`${pipelineCache} MB`}
          />
        </section>

        {/* 3. ROW B: AI CORE RUNTIME & GENERATION POWER CALCULATOR */}
        <section className="bg-[#0B0F17] border border-zinc-900 p-3 rounded-lg flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3 text-[11px] font-mono text-amber-500 border-b border-zinc-900 pb-2">
            <span>🔌 AI PLATFORM COMPUTE HARDWARE RUNTIME COST CALCULATOR</span>
            <button
              type="button"
              className="bg-amber-500 text-black px-2 py-0.5 rounded text-[10px] font-bold font-sans"
            >
              SET COST SYSTEMS
            </button>
          </div>

          {!isConfigHidden && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <RuntimeMetric label="Prompt Load Peak" value="240 W / 48 rps" />
              <RuntimeMetric label="Generation Energy" value="185 Watts / 0.14 kWh" />
              <RuntimeMetric label="Response Run Cost" value="£0.0042" />
              <RuntimeMetric label="Estimated Price" value="£0.12 / day" />
            </div>
          )}
        </section>

        {/* 4. ROW C: PROMPT PIPELINE BENCHMARKS */}
        <section className="bg-[#0B0F17] border border-zinc-900 p-3 rounded-lg flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3 text-[11px] font-mono text-blue-400 border-b border-zinc-900 pb-2">
            <span>📊 COMMERCIAL PROMPT BENCHMARKS &amp; CONTEXT ALLOCATIONS</span>
            <span className="text-[10px] text-zinc-600">Active Node Version: 1.20.14</span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono leading-tight">
            <RuntimeMetric
              label="Local Response Gate"
              value="Open-2.5-NL-7B-Instruct"
              valueClass="text-emerald-500 font-bold"
            />
            <RuntimeMetric
              label="Target Inference Module"
              value="gemini-2.5-flash"
              valueClass="text-blue-400"
            />
            <RuntimeMetric label="Total Prompt Tokens" value="76,000" />
            <RuntimeMetric label="Evaluation Window" value="1 min" />
          </div>
        </section>

        {/* 5. ROW D: INTEGRATED EXPANDABLE PROMPT-RESPONSE ACTIVITY CANVAS */}
        <section className="flex flex-col gap-3 min-h-0 flex-1">
          <div className="bg-[#1E1E20] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
            <div className="divide-y divide-zinc-800/60">
              {steps.map((step) => {
                const isExpanded = !!expandedItems[step.id];

                return (
                  <div key={step.id} className="w-full">
                    <button
                      type="button"
                      onClick={() => toggleStep(step)}
                      disabled={!step.isExpandable}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-left ${
                        step.isExpandable
                          ? 'hover:bg-zinc-800/20 cursor-pointer'
                          : 'cursor-default'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 font-mono text-xs">
                        {step.type === 'command' ? (
                          <Terminal className="w-4 h-4 text-zinc-500 shrink-0" />
                        ) : step.type === 'file-edit' ? (
                          <FileCode className="w-4 h-4 text-zinc-400 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-zinc-500 shrink-0" />
                        )}
                        <span
                          className={
                            step.isExpandable
                              ? 'text-zinc-200 font-medium truncate'
                              : 'text-zinc-500 truncate'
                          }
                        >
                          {step.title}
                        </span>
                      </div>

                      {step.isExpandable && (
                        <ChevronRight
                          className={`w-4 h-4 text-zinc-600 transition-transform shrink-0 ${
                            isExpanded ? 'rotate-90 text-zinc-400' : ''
                          }`}
                        />
                      )}
                    </button>

                    <div
                      className={`grid transition-all duration-200 ${
                        isExpanded
                          ? 'grid-rows-[1fr] opacity-100'
                          : 'grid-rows-[0fr] opacity-0'
                      }`}
                    >
                      <div className="overflow-hidden">
                        {step.details && (
                          <div className="px-4 pb-3.5 pt-0.5 grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs tracking-tight">
                            <div className="flex flex-col gap-1 min-w-0">
                              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block">
                                Prompt Output Trace
                              </span>
                              <pre className="bg-[#141416] border border-zinc-800/80 rounded-lg p-2.5 font-mono text-[10.5px] text-zinc-400 min-h-[130px] shadow-inner leading-tight whitespace-pre-wrap overflow-x-auto">
{step.details}
[INFO] Prompt token validation complete.
[SUCCESS] Response engine context synchronization initialized.</pre>
                            </div>

                            <div className="flex flex-col gap-1 min-w-0">
                              <div className="flex justify-between items-center gap-2">
                                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block">
                                  Live MCP Throughput
                                </span>
                                <span className="text-[9px] font-mono text-emerald-400 font-bold whitespace-nowrap">
                                  46.2 rps Peak
                                </span>
                              </div>

                              <div className="bg-[#141416] border border-zinc-800/80 rounded-lg p-2.5 flex flex-col justify-between min-h-[130px] relative overflow-hidden shadow-inner">
                                <div className="w-full flex-1 flex items-end relative z-10">
                                  <svg
                                    viewBox="0 0 100 40"
                                    className="w-full h-20 overflow-visible"
                                    preserveAspectRatio="none"
                                    role="img"
                                    aria-label="MCP throughput rolling graph"
                                  >
                                    <defs>
                                      <linearGradient id="unified-ai-dashboard-glow" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                                      </linearGradient>
                                    </defs>
                                    <path
                                      d="M 0 30 L 35 30 L 45 8 L 70 6 L 100 5 L 100 40 L 0 40 Z"
                                      fill="url(#unified-ai-dashboard-glow)"
                                    />
                                    <path
                                      d="M 0 30 L 35 30 L 45 8 L 70 6 L 100 5"
                                      fill="none"
                                      stroke="#3b82f6"
                                      strokeWidth="1.25"
                                    />
                                  </svg>
                                </div>

                                <div className="flex justify-between text-[8.5px] font-mono text-zinc-600 border-t border-zinc-800/60 pt-1 mt-0.5">
                                  <span>-40s</span>
                                  <span>-25s (Spike)</span>
                                  <span>Now</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* 6. BOTTOM PROMPT ENTRY BAR & UTILITY DECK */}
      <footer className="w-full shrink-0 bg-[#0B0F17] border-t border-zinc-900 px-4 py-3 flex items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-zinc-600 font-bold shrink-0">❯</span>
          <input
            type="text"
            readOnly
            value="Start the Local LLM loop..."
            className="bg-transparent border-none text-zinc-500 outline-none w-full min-w-0"
            aria-label="Prompt entry status"
          />
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Copy response trace"
            aria-label="Copy response trace"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Upvote response"
            aria-label="Upvote response"
          >
            <ThumbsUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Downvote response"
            aria-label="Downvote response"
          >
            <ThumbsDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            className="p-1.5 text-zinc-500 hover:text-rose-400 transition-colors"
            title="Retry prompt thread"
            aria-label="Retry prompt thread"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <div className="w-4 h-4 rounded-full bg-[#e05638]/10 text-[#e05638] flex items-center justify-center font-bold text-[10px] ml-2">
            ✳
          </div>
        </div>
      </footer>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="p-3 bg-[#0E131F] border border-zinc-900 rounded flex flex-col gap-1 min-w-0">
      <span className="text-[10px] font-mono text-zinc-500 uppercase flex items-center gap-1.5 leading-tight">
        {icon}
        {label}
      </span>
      <span className="text-sm font-semibold font-mono text-zinc-100 transition-all duration-300 truncate">
        {value}
      </span>
    </div>
  );
}

function RuntimeMetric({
  label,
  value,
  valueClass = 'text-zinc-200',
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="min-w-0">
      <span className="text-[10px] block font-mono text-zinc-500 leading-tight">
        {label}
      </span>
      <span className={`text-xs font-mono truncate block mt-0.5 ${valueClass}`}>
        {value}
      </span>
    </div>
  );
}
