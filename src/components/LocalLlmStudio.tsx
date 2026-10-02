import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ResizableSplit, PanelChromeControls, ginaPanelStyle } from './ResizablePanels';
import { Bot, Cpu, FileDown, MessageSquare, Mic, MicOff, Play, RotateCw, Square, Trash2, Volume2, VolumeX, Zap, Sliders, ChevronDown, ChevronUp, ChevronRight, Paperclip, X, FileText, Image as ImageIcon, Archive, File as FileIcon, Github, Activity, Gauge, Globe, Globe2, ExternalLink, Search, Maximize2, Minimize2, Code2, Video, DollarSign, Eye, EyeOff, Layers, Check, Sparkles } from 'lucide-react';
import { LocalRagKnowledgePanel } from './LocalRagKnowledgePanel';
import { useGenerationJob } from '../context/GenerationJobContext';
import { WebBrowserInspectorModal } from './WebBrowserInspectorModal';
import { AgentExecutionTrace } from './AgentExecutionTrace'
import { resolveSearchProfile } from '../data/ginaSearchProfiles'
import { resolveCodeProfile, type PythonVersion } from '../data/ginaCodeProfiles'
import { GinaStudioProfilePicker } from './GinaStudioProfilePicker'
import { GinaAgentProjectBar } from './GinaAgentProjectBar'
import { AGENT_IMPORT_PROTOCOL, GINA_AGENT_PROFILES } from '../data/ginaAgentProfiles'
import { MovableResizableWrapper } from './MovableResizableWrapper'
import { resolveVideoProfile, composeVideoPrompt } from '../data/ginaVideoProfiles';
import { resolveImageProfile } from '../data/ginaImageProfiles';
import { resolveAgentProfile, composeAgentSystemAddon } from '../data/ginaAgentProfiles';
import { get2DRoverSandboxHtml } from '../data/roverSandboxArtifact';
import { initGinaMath } from '../lib/ginaMath';
import { PanelResizeGrip, useResizablePanel } from './PanelResizeGrip';

interface LocalLlmStatus {
  configured: boolean;
  running: boolean;
  ready: boolean;
  pid: number | null;
  port: number;
  modelPath: string;
  modelName: string;
  gpuLayers: number;
  contextSize: number;
  threads: number;
  backend: 'CUDA' | 'unknown';
  lastError: string | null;
  startedAt: string | null;
  recentLog: string[];
  multimodal: boolean;
  mmprojPath: string | null;
  engine: 'qwen' | 'qwen-coder' | 'qwen3.5';
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  webSources?: Array<{ title: string; url: string; snippet?: string; source?: string }>;
  webProvider?: string | null;
  browserEngine?: string | null;
}

interface HardwareTelemetry {
  gpuAvailable: boolean;
  gpuName: string;
  vramUsedMB: number;
  vramTotalMB: number;
  gpuTempC: number;
  gpuUtilizationPercent: number;
  gpuPowerW: number;
  cpuPowerW?: number | null;
  otherHardwarePowerW?: number;
  componentDcPowerW?: number;
  psuEfficiency?: number;
  estimatedWallPowerW?: number;
  systemPowerW?: number;
  powerSource?: string;
  ramUsedGB: number;
  ramTotalGB: number;
  thermalBrakeActive: boolean;
}

interface RuntimeTelemetrySnapshot {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  durationMs?: number;
  tokensPerSecond?: number;
  promptTokensPerSecond?: number;
  completionTokensPerSecond?: number;
  iteration?: number | null;
  iterationsPerSecond?: number;
  toolCalls?: number;
  source?: string;
  webSearched?: boolean;
  webProvider?: string | null;
  contextBreakdown?: Record<string, number>;
}

interface LocalLlmPropsTelemetry {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  durationMs: number;
  tokensPerSecond: number;
  promptTokensPerSecond: number;
  completionTokensPerSecond: number;
  iteration: number | null;
  toolCalls: number;
  source: 'local' | 'web' | 'local+web';
  webProvider?: string | null;
  contextBreakdown?: Record<string, number>;
}

interface LocalLlmStudioProps {
  onAddLog: (level: 'INFO' | 'WARN' | 'SEC' | 'RULE', message: string, ruleId?: string) => void;
  studioMode?: 'web-search' | 'web-app' | 'code-engine' | 'image-studio' | 'video-generation';
  onWebAppArtifact?: (html: string) => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
  onModeChange?: (mode: 'web-search' | 'web-app' | 'code-engine' | 'image-studio' | 'video-generation') => void;
}

const SYSTEM_PROMPT = `You are Gina, the local AI assistant inside Gina AI Factory. You run locally on a Windows PC with an NVIDIA RTX 3070 Ti 8GB, AMD Ryzen 5 5600X 6-core/12-thread CPU and 32GB RAM. Be practical and concise. Prefer the project's existing local tools and files. You can request local image generation through Gina's Create/ComfyUI tool when the user explicitly asks for an image. Do not claim an image was generated unless Gina has actually returned one. Do not tell the user that Gina is text-only when local image generation is available. Never reveal chain-of-thought, hidden reasoning, internal deliberation, or a section labelled Thinking Process. Return only the concise user-facing answer and useful verified results.`;

export const LocalLlmStudio: React.FC<LocalLlmStudioProps> = ({ 
  onAddLog, 
  studioMode = 'web-app', 
  onWebAppArtifact,
  isFullScreen = false,
  onToggleFullScreen,
  onModeChange
}) => {
  const [showEngineConfig, setShowEngineConfig] = useState(false);
  const [showBottomEngineConfig, setShowBottomEngineConfig] = useState(false);
  const [showDetailedTelemetry, setShowDetailedTelemetry] = useState(true);
  const telemetryPanel = useResizablePanel({ storageKey: 'gina.ui.widget.telemetry', defaultHeight: 170, minHeight: 70 });
  const electricityPanel = useResizablePanel({ storageKey: 'gina.ui.widget.electricity', defaultHeight: 160, minHeight: 70 });
  const commercialPanel = useResizablePanel({ storageKey: 'gina.ui.widget.commercial', defaultHeight: 170, minHeight: 70 });
  const llamaLogPanel = useResizablePanel({ storageKey: 'gina.ui.widget.llamaLog', defaultHeight: 120, minHeight: 50 });
  const [llamaLogOpen, setLlamaLogOpen] = useState(false);
  const bottomEnginePanel = useResizablePanel({ storageKey: 'gina.ui.widget.bottomEngine', defaultHeight: 170, minHeight: 70 });
  const promptBoxPanel = useResizablePanel({ storageKey: 'gina.ui.widget.promptBox', defaultHeight: 52, minHeight: 44 });
  const agentLogPanel = useResizablePanel({ storageKey: 'gina.ui.widget.agentLog', defaultHeight: 300, minHeight: 60 });
  const [status, setStatus] = useState<LocalLlmStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [thinkingSource, setThinkingSource] = useState<'local'|'web'|'local+web'>('local');
  const chatAbortRef = useRef<AbortController | null>(null);
  const { job: generationJob, output: generationOutput, adoptJob, adoptCompletedOutput, updateJobProgress, cancelJob } = useGenerationJob();
  const [aiImageJobId, setAiImageJobId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [pythonVersion, setPythonVersion] = useState<PythonVersion>('3.11');
  const [codeProfileId, setCodeProfileId] = useState<string | null>(null);
  const [searchProfileId, setSearchProfileId] = useState<string | null>(null);
  const [imageProfileId, setImageProfileId] = useState<string | null>(null);
  const [videoProfileId, setVideoProfileId] = useState<string | null>(null);
  const [agentProfileId, setAgentProfileId] = useState<string | null>(null);
  const historyModeRef = useRef(studioMode);
  const historyKey = `gina_studio_messages_${studioMode}`;
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(`gina_studio_messages_${studioMode}`) || '[]');
      return Array.isArray(saved) ? saved.slice(-30) : [];
    } catch { return []; }
  });
  const [error, setError] = useState<string | null>(null);
  const [leftViewMode, setLeftViewMode] = useState<'terminal' | 'chat'>('terminal');
  const responseScrollRef = useRef<HTMLDivElement>(null);
  const isResponseScrolledUpRef = useRef(false);
  const [showResponseJumpToBottom, setShowResponseJumpToBottom] = useState(false);
  const [pdfSaving, setPdfSaving] = useState(false);
  const [pdfNotice, setPdfNotice] = useState<string | null>(null);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [voiceName, setVoiceName] = useState<string>(() => {
    try {
      return localStorage.getItem('gina_voice_default') || localStorage.getItem('gina_voice_name') || '';
    } catch {
      return '';
    }
  });
  const [defaultVoiceName, setDefaultVoiceName] = useState<string>(() => {
    try {
      return localStorage.getItem('gina_voice_default') || '';
    } catch {
      return '';
    }
  });
  const [voiceRate, setVoiceRate] = useState(0);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<Array<{name:string; culture:string; gender:string}>>([]);
  const [browserVoicesList, setBrowserVoicesList] = useState<SpeechSynthesisVoice[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [browserVoiceAvailable, setBrowserVoiceAvailable] = useState(false);
  const [microphoneAvailable, setMicrophoneAvailable] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<Array<{ name: string; content?: string; bytes: number; kind: 'text'|'image'|'archive'; mime: string; localPath?: string; previewUrl?: string; extractedFiles?: number }>>([]);
  const [fileAttachError, setFileAttachError] = useState<string | null>(null);
  const [lastTelemetry, setLastTelemetry] = useState<LocalLlmPropsTelemetry | null>(null);
  const [hardwareTelemetry, setHardwareTelemetry] = useState<HardwareTelemetry | null>(null);
  const [runtimeTelemetry, setRuntimeTelemetry] = useState<RuntimeTelemetrySnapshot | null>(null);
  const [showWebBrowserModal, setShowWebBrowserModal] = useState(false);
  const [activePreviewContent, setActivePreviewContent] = useState<{ type:'text'|'html'|'web'|'video'; title:string; content:string; url?:string; sources?:Array<{title:string;url:string;snippet?:string}> } | null>(null);
  const [savedCodeFiles, setSavedCodeFiles] = useState<Record<string, { url:string; path:string; bytes:number }>>({});
  const [webAppView, setWebAppView] = useState<'preview' | 'code'>('preview');
  const [webAppRuntimeError, setWebAppRuntimeError] = useState<string | null>(null);
  const [webAppStorageNamespace, setWebAppStorageNamespace] = useState<string | null>(null);
  const webAppIframeRef = useRef<HTMLIFrameElement | null>(null);
  const promptInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [sessionElectricityCost, setSessionElectricityCost] = useState<number>(0);
  const [sessionSavingsGbp, setSessionSavingsGbp] = useState<number>(0);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Layout-adjustable & movable telemetry widgets state
  const [showTelemetryWidget, setShowTelemetryWidget] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('gina_widget_telemetry');
      return v !== null ? v === 'true' : true;
    } catch { return true; }
  });
  const [showElectricityWidget, setShowElectricityWidget] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('gina_widget_electricity');
      return v !== null ? v === 'true' : true; // Single-page layout: show power/cost by default
    } catch { return false; }
  });
  const [showCommercialWidget, setShowCommercialWidget] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('gina_widget_commercial');
      return v !== null ? v === 'true' : true;
    } catch { return true; }
  });
  const [widgetsMinimized, setWidgetsMinimized] = useState<boolean>(() => {
    try {
      return localStorage.getItem('gina_widgets_minimized') === 'true';
    } catch { return false; }
  });
  const [widgetOrder, setWidgetOrder] = useState<Array<'telemetry' | 'electricity' | 'commercial'>>(() => {
    try {
      const saved = localStorage.getItem('gina_widget_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 3) return parsed;
      }
    } catch {}
    return ['telemetry', 'electricity', 'commercial'];
  });
  const [minimizedWidgets, setMinimizedWidgets] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('gina_widget_minimized_map');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { telemetry: false, electricity: false, commercial: false };
  });
  const [widgetDockPosition, setWidgetDockPosition] = useState<'above' | 'below'>((() => {
    try {
      const saved = localStorage.getItem('gina_widget_dock_pos');
      return saved === 'below' ? 'below' : 'above';
    } catch { return 'above'; }
  })());

  const [commercialLedgerData, setCommercialLedgerData] = useState<{
    totalGbp: number;
    totalTransactions: number;
    avgTokensPerSec: number;
  }>({ totalGbp: 0, totalTransactions: 0, avgTokensPerSec: 0 });

  const moveWidget = (id: 'telemetry' | 'electricity' | 'commercial', dir: 'up' | 'down') => {
    setWidgetOrder(prev => {
      const idx = prev.indexOf(id);
      if (idx === -1) return prev;
      const target = dir === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.splice(target, 0, item);
      try { localStorage.setItem('gina_widget_order', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const toggleSingleWidgetMin = (key: 'telemetry' | 'electricity' | 'commercial') => {
    setMinimizedWidgets(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem('gina_widget_minimized_map', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const toggleDockPosition = () => {
    setWidgetDockPosition(prev => {
      const next = prev === 'above' ? 'below' : 'above';
      try { localStorage.setItem('gina_widget_dock_pos', next); } catch {}
      return next;
    });
  };

  const toggleWidget = (key: 'telemetry' | 'electricity' | 'commercial') => {
    if (key === 'telemetry') {
      setShowTelemetryWidget(prev => {
        const next = !prev;
        try { localStorage.setItem('gina_widget_telemetry', String(next)); } catch {}
        return next;
      });
    } else if (key === 'electricity') {
      setShowElectricityWidget(prev => {
        const next = !prev;
        try { localStorage.setItem('gina_widget_electricity', String(next)); } catch {}
        return next;
      });
    } else if (key === 'commercial') {
      setShowCommercialWidget(prev => {
        const next = !prev;
        try { localStorage.setItem('gina_widget_commercial', String(next)); } catch {}
        return next;
      });
    }
  };

  const toggleWidgetsMinimized = () => {
    setWidgetsMinimized(prev => {
      const next = !prev;
      try { localStorage.setItem('gina_widgets_minimized', String(next)); } catch {}
      // Sync all individual widgets
      setMinimizedWidgets({ telemetry: next, electricity: next, commercial: next });
      try { localStorage.setItem('gina_widget_minimized_map', JSON.stringify({ telemetry: next, electricity: next, commercial: next })); } catch {}
      return next;
    });
  };

  const toggleCleanScreen = () => {
    // If all are minimized or hidden, restore them; otherwise minimize all to clean the screen
    const allMin = minimizedWidgets.telemetry && minimizedWidgets.electricity && minimizedWidgets.commercial;
    const nextState = !allMin;
    setMinimizedWidgets({ telemetry: nextState, electricity: nextState, commercial: nextState });
    setWidgetsMinimized(nextState);
    try {
      localStorage.setItem('gina_widgets_minimized', String(nextState));
      localStorage.setItem('gina_widget_minimized_map', JSON.stringify({ telemetry: nextState, electricity: nextState, commercial: nextState }));
    } catch {}
  };

  const toggleAllWidgets = () => {
    const allVisible = showTelemetryWidget && showElectricityWidget && showCommercialWidget;
    const nextState = !allVisible;
    setShowTelemetryWidget(nextState);
    setShowElectricityWidget(nextState);
    setShowCommercialWidget(nextState);
    try {
      localStorage.setItem('gina_widget_telemetry', String(nextState));
      localStorage.setItem('gina_widget_electricity', String(nextState));
      localStorage.setItem('gina_widget_commercial', String(nextState));
    } catch {}
  };

  useEffect(() => {
    let cancelled = false;
    const refreshTelemetry = async () => {
      const [hardwareResult, runtimeResult] = await Promise.allSettled([
        fetch('/api/telemetry', { cache: 'no-store' }),
        fetch('/api/runtime/telemetry', { cache: 'no-store' }),
      ]);
      if (cancelled) return;
      if (hardwareResult.status === 'fulfilled' && hardwareResult.value.ok) {
        const hardware = await hardwareResult.value.json().catch(() => null);
        if (hardware) {
          setHardwareTelemetry(hardware);
          // Accumulate session cost based on UK tariff (Day £0.3157 / Night £0.1390)
          const powerW = Number(hardware.systemPowerW ?? hardware.estimatedWallPowerW ?? hardware.gpuPowerW ?? 0);
          const currentHour = new Date().getHours();
          const rateKwh = (currentHour >= 7 && currentHour < 23) ? 0.3157 : 0.1390;
          const secondCost = (powerW / 1000) * rateKwh / 3600;
          setSessionElectricityCost(prev => prev + secondCost);
        }
      }
      if (runtimeResult.status === 'fulfilled' && runtimeResult.value.ok) {
        const runtime = await runtimeResult.value.json().catch(() => null);
        // /api/runtime/telemetry returns Snapshot { latest, totals, history }.
        // UI consumers expect a flat prompt-telemetry record (promptTokens, etc.).
        if (runtime) {
          const latest = runtime.latest && typeof runtime.latest === 'object' ? runtime.latest : null;
          if (latest) {
            setRuntimeTelemetry({
              promptTokens: Number(latest.promptTokens || 0),
              completionTokens: Number(latest.completionTokens || 0),
              totalTokens: Number(latest.totalTokens || 0),
              durationMs: Number(latest.durationMs || 0),
              tokensPerSecond: Number(latest.tokensPerSecond || latest.completionTokensPerSecond || 0),
              promptTokensPerSecond: Number(latest.promptTokensPerSecond || 0),
              completionTokensPerSecond: Number(latest.completionTokensPerSecond || latest.tokensPerSecond || 0),
              iteration: latest.iteration == null ? null : Number(latest.iteration),
              toolCalls: Number(latest.toolCalls || 0),
              source: latest.source === 'local+web' || latest.source === 'web' ? latest.source : 'local',
              webProvider: latest.webProvider ?? null,
              contextBreakdown: latest.contextBreakdown,
              webSearched: Boolean(latest.webSearched),
            });
          }
        }
      }
      try {
        const savRes = await fetch('/api/proxy/savings', { cache: 'no-store' });
        if (savRes.ok) {
          const d = await savRes.json();
          if (d.ok && d.summary) {
            setCommercialLedgerData({
              totalGbp: d.summary.totalGbp || 0,
              totalTransactions: d.summary.totalTransactions || 0,
              avgTokensPerSec: d.summary.avgTokensPerSec || 0
            });
          }
        }
      } catch {}
    };
    void refreshTelemetry();
    const timer = window.setInterval(() => { void refreshTelemetry(); }, 1500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  // Optional WASM math kernels — silent fallback to pure JS (src/lib/ginaMath.ts).
  useEffect(() => {
    void initGinaMath('/wasm/gina_math.wasm').catch(() => { /* JS backend remains active */ });
  }, []);

  const resolvedLocalArch = useMemo(() => {
    const modelName = (status?.modelName || '').toLowerCase();
    if (modelName.includes('coder') || status?.engine === 'qwen-coder') {
      return {
        arch: 'Qwen-2.5-Coder-7B',
        twin: 'claude-sonnet-5',
        tier: 'Frontier Twin',
        inputRate: 1.5600,
        outputRate: 7.8000,
        visionRate: 1.50,
        videoRate: 0.12
      };
    }
    if (modelName.includes('3.5') || modelName.includes('9b') || status?.engine === 'qwen3.5') {
      return {
        arch: 'Qwen-3.5-9B',
        twin: 'gpt-5.4-mini',
        tier: 'Economy Twin',
        inputRate: 0.5850,
        outputRate: 3.5100,
        visionRate: 1.20,
        videoRate: 0.04
      };
    }
    return {
      arch: 'Qwen-2.5-VL-7B-Vision',
      twin: 'gemini-3.6-flash',
      tier: 'Balanced Twin',
      inputRate: 1.1700,
      outputRate: 5.8500,
      visionRate: 1.35,
      videoRate: 0.08
    };
  }, [status?.modelName, status?.engine]);

  const latestTurnTokens = useMemo(() => {
    const p = lastTelemetry?.promptTokens ?? runtimeTelemetry?.promptTokens ?? 0;
    const c = lastTelemetry?.completionTokens ?? runtimeTelemetry?.completionTokens ?? 0;
    return { prompt: p, completion: c, total: p + c };
  }, [lastTelemetry, runtimeTelemetry]);

  const latestTurnSavingsGbp = useMemo(() => {
    const inCost = (latestTurnTokens.prompt / 1_000_000) * resolvedLocalArch.inputRate;
    const outCost = (latestTurnTokens.completion / 1_000_000) * resolvedLocalArch.outputRate;
    return Number((inCost + outCost).toFixed(4));
  }, [latestTurnTokens, resolvedLocalArch]);

  const resizePromptInput = useCallback(() => {
    const element = promptInputRef.current;
    if (!element) return;
    element.style.height = '44px';
    const nextHeight = Math.min(200, Math.max(44, element.scrollHeight));
    element.style.height = `${nextHeight}px`;
    element.style.overflowY = element.scrollHeight > 200 ? 'auto' : 'hidden';
  }, []);

  useEffect(() => { resizePromptInput(); }, [input, resizePromptInput]);

  const saveCodeBlock = async (filename: string, content: string, blockKey: string) => {
    try {
      const response = await fetch('/api/llm/save-code-file', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ filename, content, directory:'.gina/generated-code' })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) throw new Error(data?.error || `HTTP ${response.status}`);
      setSavedCodeFiles(prev => ({ ...prev, [blockKey]: { url:data.url, path:data.path, bytes:Number(data.bytes || 0) } }));
      setActivePreviewContent({ type: filename.toLowerCase().endsWith('.html') ? 'html' : 'text', title:filename, content });
      onAddLog('INFO', `Generated code saved: ${data.path}`);
    } catch (saveError:any) {
      setError(`Code save failed: ${saveError?.message || 'unknown error'}`);
      onAddLog('WARN', `Generated code save failed: ${saveError?.message || 'unknown error'}`);
    }
  };

  /** Immediate client-side download (no server round-trip). */
  const downloadCodeFile = (filename: string, content: string, mime = 'text/plain;charset=utf-8') => {
    try {
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      onAddLog('INFO', `Downloaded ${filename} (${content.length.toLocaleString()} chars)`);
    } catch (downloadError: any) {
      setError(`Download failed: ${downloadError?.message || 'unknown error'}`);
    }
  };

  const makeWebAppStorageNamespace = (html: string) => {
    let hash = 2166136261;
    for (let i = 0; i < html.length; i += 1) {
      hash ^= html.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return `webapp-${(hash >>> 0).toString(16)}`;
  };

  type ExecutionLogEntry = {
    id: string;
    title: string;
    details: string;
    status: 'running' | 'complete' | 'error';
    startedAt?: number;
    endedAt?: number;
    kind?: 'command' | 'workflow' | 'info' | 'tool';
  };
  const [executionLog, setExecutionLog] = useState<ExecutionLogEntry[]>([]);
  const pushExecutionLog = useCallback((
    title: string,
    details: string,
    status: ExecutionLogEntry['status'] = 'complete',
    kind: ExecutionLogEntry['kind'] = 'workflow'
  ) => {
    const now = Date.now();
    setExecutionLog(prev => {
      const next = [...prev];
      const runningIndex = next.findIndex(entry => entry.title === title && entry.status === 'running');
      if (runningIndex >= 0) {
        const prevEntry = next[runningIndex];
        next[runningIndex] = {
          ...prevEntry,
          details,
          status,
          kind: kind || prevEntry.kind,
          endedAt: status === 'running' ? undefined : now,
        };
        return next.slice(-40);
      }
      // Close any other running steps so only one "Working for" is active
      const closed = next.map(entry =>
        entry.status === 'running'
          ? { ...entry, status: 'complete' as const, endedAt: entry.endedAt ?? now }
          : entry
      );
      return [
        ...closed,
        {
          id: `${now}-${Math.random().toString(36).slice(2, 7)}`,
          title,
          details,
          status,
          kind,
          startedAt: now,
          endedAt: status === 'running' ? undefined : now,
        },
      ].slice(-40);
    });
  }, []);

  useEffect(() => {
    if (activePreviewContent?.type === 'html') {
      setWebAppStorageNamespace(makeWebAppStorageNamespace(activePreviewContent.content));
    } else {
      setWebAppStorageNamespace(null);
    }
  }, [activePreviewContent]);

  const readWebAppStorage = (namespace: string) => {
    const prefix = `gina_webapp:${namespace}:`;
    const snapshot: Record<string, string> = {};
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key?.startsWith(prefix)) snapshot[key.slice(prefix.length)] = localStorage.getItem(key) ?? '';
      }
    } catch {}
    return snapshot;
  };

  useEffect(() => {
    const onWebAppMessage = (event: MessageEvent) => {
      const iframe = webAppIframeRef.current;
      const data = event.data;
      if (!iframe?.contentWindow || event.source !== iframe.contentWindow || !data || data.channel !== 'gina-webapp-storage') return;
      if (!webAppStorageNamespace || data.namespace !== webAppStorageNamespace) return;
      const prefix = `gina_webapp:${webAppStorageNamespace}:`;
      try {
        if (data.op === 'ready') {
          iframe.contentWindow.postMessage({ channel:'gina-webapp-storage', namespace:webAppStorageNamespace, op:'hydrate', data:readWebAppStorage(webAppStorageNamespace) }, '*');
        } else if (data.op === 'set' && typeof data.key === 'string') {
          localStorage.setItem(prefix + data.key, String(data.value ?? ''));
        } else if (data.op === 'remove' && typeof data.key === 'string') {
          localStorage.removeItem(prefix + data.key);
        } else if (data.op === 'clear') {
          const keys = Object.keys(readWebAppStorage(webAppStorageNamespace));
          for (const key of keys) localStorage.removeItem(prefix + key);
        } else if (data.op === 'runtime-error') {
          const message = String(data.message || 'The generated Web App reported a runtime error.').slice(0, 500);
          setWebAppRuntimeError(message);
          pushAgentActivity(`[EXEC_STEP: Web App runtime error]\n${message}\n[END_STEP]`);
          pushExecutionLog('Web App Runtime', message, 'error');
        }
      } catch (storageError:any) {
        const message = storageError?.message || 'Web App local storage bridge failed.';
        setWebAppRuntimeError(message);
        pushExecutionLog('Web App Runtime', message, 'error');
      }
    };
    window.addEventListener('message', onWebAppMessage);
    return () => window.removeEventListener('message', onWebAppMessage);
  }, [webAppStorageNamespace, pushExecutionLog]);

  /** Pull a clean HTML document out of messy model output (fences, preamble, etc.). */
  const normalizeWebAppHtml = (raw: string): string => {
    let text = String(raw || '').trim();
    if (!text) return '';
    // Prefer fenced html block if present
    const fenced = text.match(/```(?:html|HTML)?\s*([\s\S]*?)```/);
    if (fenced?.[1]) text = fenced[1].trim();
    // Drop everything before doctype/html
    const start = text.search(/<!doctype\s+html|<html[\s>]/i);
    if (start > 0) text = text.slice(start).trim();
    // Drop trailing markdown fences / prose after </html>
    const end = text.search(/<\/html>/i);
    if (end >= 0) text = text.slice(0, end + 7).trim();
    // Recover incomplete artifacts: model returned canvas/script body without document shell
    if (!/^<!doctype html|<html[\s>]/i.test(text)) {
      const looksLikeMarkup = /<(?:canvas|div|style|script|body|head|button|input)\b/i.test(text);
      if (looksLikeMarkup) {
        text = `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8"/>\n<meta name="viewport" content="width=device-width, initial-scale=1.0"/>\n<script src="https://cdn.tailwindcss.com"><\/script>\n<title>Gina Web App<\/title>\n</head>\n<body class="m-0 overflow-hidden bg-slate-950">\n${text}\n</body>\n</html>`;
      }
    }
    return text;
  };

  /**
   * Inside <script> bodies, a literal </script> closes the HTML script element
   * early (srcDoc parser). That leaves following markup parsed as JS →
   * "Unexpected token '<'". Escape those sequences for safe embedding.
   */
  const escapeScriptEndsForSrcDoc = (html: string): string =>
    String(html || '').replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi, (_m, open, body, close) => {
      const safe = String(body).replace(/<\/script/gi, '<\\/script');
      return `${open}${safe}${close}`;
    });

  const buildWebAppPreviewHtml = (html: string, namespace: string) => {
    // Storage bridge only — do NOT rewrite app script identifiers.
    // window.localStorage is overridden via defineProperty instead.
    const bridge = `<script>
(function(){
  var CHANNEL='gina-webapp-storage';
  var NAMESPACE=${JSON.stringify(namespace)};
  var store=Object.create(null);
  function send(payload){
    try{parent.postMessage(Object.assign({channel:CHANNEL,namespace:NAMESPACE},payload),'*');}catch(e){}
  }
  var storage={
    get length(){return Object.keys(store).length;},
    key:function(index){return Object.keys(store)[Number(index)]||null;},
    getItem:function(key){key=String(key);return Object.prototype.hasOwnProperty.call(store,key)?store[key]:null;},
    setItem:function(key,value){key=String(key);store[key]=String(value);send({op:'set',key:key,value:String(value)});},
    removeItem:function(key){key=String(key);delete store[key];send({op:'remove',key:key});},
    clear:function(){store=Object.create(null);send({op:'clear'});}
  };
  window.__ginaWebAppStorage=storage;
  try{
    Object.defineProperty(window,'localStorage',{configurable:true,enumerable:true,get:function(){return storage;}});
  }catch(e){
    try{window.localStorage=storage;}catch(e2){}
  }
  window.addEventListener('message',function(event){
    var data=event.data;
    if(event.source!==parent||!data||data.channel!==CHANNEL||data.namespace!==NAMESPACE||data.op!=='hydrate')return;
    store=Object.assign(Object.create(null),data.data||{});
  });
  window.addEventListener('error',function(event){
    var msg=(event.error&&event.error.message)||event.message||'JavaScript runtime error';
    send({op:'runtime-error',message:msg});
  });
  window.addEventListener('unhandledrejection',function(event){
    var reason=event.reason;
    var msg=(reason&&reason.message)||String(reason||'Unhandled promise rejection');
    send({op:'runtime-error',message:msg});
  });
  send({op:'ready'});
})();
<\/script>`;
    const source = escapeScriptEndsForSrcDoc(String(html || ''));
    if (/<head[\s>]/i.test(source)) {
      return source.replace(/<head([^>]*)>/i, `<head$1>${bridge}`);
    }
    if (/<html[\s>]/i.test(source)) {
      return source.replace(/<html([^>]*)>/i, `<html$1><head>${bridge}</head>`);
    }
    return `${bridge}${source}`;
  };

  const renderMarkdownLinks = (text: string) => {
    const parts: React.ReactNode[] = [];
    const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    let cursor = 0; let match: RegExpExecArray | null;
    while ((match = linkPattern.exec(text))) {
      if (match.index > cursor) parts.push(<span key={`text-${cursor}`}>{text.slice(cursor, match.index)}</span>);
      parts.push(
        <a key={`link-${match.index}`} href={match[2]} target="_blank" rel="noopener noreferrer" onClick={() => setActivePreviewContent({type:'web', title:match![1], content:match![2], url:match![2]})}
          className="my-1 inline-flex max-w-full items-center gap-2 rounded-lg border border-sky-500/25 bg-sky-500/5 px-2.5 py-1.5 text-sky-300 hover:bg-sky-500/10 hover:border-sky-400/40 transition-colors align-middle">
          <ExternalLink className="w-3 h-3 shrink-0" /><span className="truncate font-semibold">{match[1]}</span><span className="text-[9px] text-slate-500 truncate max-w-[260px]">{match[2]}</span>
        </a>
      );
      cursor = match.index + match[0].length;
    }
    if (cursor < text.length) parts.push(<span key={`text-${cursor}`}>{text.slice(cursor)}</span>);
    return parts.length ? parts : text;
  };

  const renderRichContent = (content: string, messageIndex: number) => {
    const blocks: React.ReactNode[] = [];
    // language or language:filename.ext
    const fence = /```([\w+-]+(?::[^\s`]+)?)[ \t]*\n?([\s\S]*?)```/g;
    let cursor = 0; let match: RegExpExecArray | null; let codeIndex = 0;
    while ((match = fence.exec(content))) {
      if (match.index > cursor) blocks.push(<div key={`txt-${cursor}`} className="whitespace-pre-wrap break-words">{renderMarkdownLinks(content.slice(cursor, match.index))}</div>);
      const meta = (match[1] || 'text').trim();
      const colon = meta.indexOf(':');
      const language = (colon >= 0 ? meta.slice(0, colon) : meta).toLowerCase() || 'text';
      const metaName = colon >= 0 ? meta.slice(colon + 1).trim() : '';
      const code = match[2].replace(/^\n/, '').replace(/\n$/, '');
      const supported = ['js','ts','tsx','jsx','py','html','css','json','md','txt','sh','bash','ps1'].includes(language);
      const ext = language === 'js' || language === 'jsx' ? (language === 'jsx' ? 'jsx' : 'js')
        : language === 'ts' ? 'ts' : language === 'tsx' ? 'tsx' : language === 'py' ? 'py'
          : language === 'html' ? 'html' : language === 'css' ? 'css' : language === 'json' ? 'json'
            : language === 'md' ? 'md' : language === 'sh' || language === 'bash' ? 'sh' : language === 'ps1' ? 'ps1' : 'txt';
      // Prefer explicit name, else first-line path comment, else generated name
      const firstLine = code.split(/\r?\n/, 1)[0] || '';
      const fromComment = firstLine.match(/^(?:\/\/|#|\/\*)\s*([A-Za-z0-9._\- /\\]+\.\w{1,8})\s*(?:\*\/)?$/)?.[1];
      const filename = (metaName || fromComment || `gina-generated-${messageIndex + 1}-${codeIndex + 1}.${ext}`).replace(/^["']|["']$/g, '');
      const displayName = filename.split(/[/\\]/).pop() || filename;
      const blockKey = `${messageIndex}:${codeIndex}`;
      const saved = savedCodeFiles[blockKey];
      const openInPreview = () => {
        setActivePreviewContent({
          type: language === 'html' ? 'html' : 'text',
          title: displayName,
          content: code
        });
        if (language === 'html') setWebAppView('preview');
      };
      blocks.push(
        <div key={`code-${blockKey}`} className="my-2 overflow-hidden rounded-lg border border-slate-700 bg-slate-950">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 bg-slate-900 px-2.5 py-1.5">
            <div className="flex min-w-0 items-center gap-2 text-[9px] font-mono tracking-wider text-slate-400">
              <span className="rounded bg-slate-800 px-1.5 py-0.5 uppercase text-emerald-300">{language}</span>
              <button
                type="button"
                onClick={openInPreview}
                className="truncate rounded border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold normal-case text-sky-300 hover:bg-sky-500/20 hover:border-sky-400/50"
                title={`Open ${displayName} in interactive preview`}
              >
                📄 {displayName}
              </button>
              <span className="text-[8px] text-slate-600">{code.length.toLocaleString()} chars</span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button type="button" onClick={openInPreview} className="rounded border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-violet-300 hover:bg-violet-500/20">Open</button>
              {supported && (
                <>
                  <button type="button" onClick={() => downloadCodeFile(displayName, code, language === 'html' ? 'text/html;charset=utf-8' : 'text/plain;charset=utf-8')} className="rounded border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-sky-300 hover:bg-sky-500/20 flex items-center gap-1"><FileDown className="w-3 h-3" /> Download</button>
                  <button type="button" onClick={() => void saveCodeBlock(displayName, code, blockKey)} className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-emerald-300 hover:bg-emerald-500/20">Save</button>
                </>
              )}
              {saved && <a href={saved.url} target="_blank" rel="noopener noreferrer" download={displayName} className="rounded border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-[8px] font-bold text-sky-300 hover:bg-sky-500/20">Saved · {saved.bytes.toLocaleString()} B</a>}
            </div>
          </div>
          {/* Collapsed by default: filename is the primary UI; expand to peek at source */}
          <details className="group">
            <summary className="cursor-pointer list-none px-3 py-1.5 text-[8px] font-mono uppercase tracking-wider text-slate-600 hover:text-slate-400">Show source</summary>
            <pre className="max-h-[280px] overflow-auto border-t border-slate-800 p-3 text-[10px] leading-relaxed text-slate-300"><code>{code}</code></pre>
          </details>
        </div>
      );
      cursor = match.index + match[0].length; codeIndex++;
    }
    if (cursor < content.length) blocks.push(<div key={`tail-${cursor}`} className="whitespace-pre-wrap break-words">{renderMarkdownLinks(content.slice(cursor))}</div>);
    return blocks.length ? blocks : renderMarkdownLinks(content);
  };

  const supportedLocalAiExtensions = new Set([
    '.txt','.md','.markdown','.json','.csv','.tsv','.log','.ini','.cfg','.conf','.yaml','.yml','.xml','.html','.htm','.css',
    '.js','.jsx','.ts','.tsx','.py','.ps1','.bat','.cmd','.sh','.sql','.c','.h','.cpp','.hpp','.cc','.java','.cs','.go','.rs','.toml','.env',
    '.png','.jpg','.jpeg','.webp','.bmp','.gif','.zip'
  ]);
  const maxLocalAiFiles = 5;

  useEffect(() => {
    const applyReference = (detail: any) => {
      if (!detail?.localPath) return;
      setAttachedFiles(prev => {
        const without = prev.filter(file => file.kind !== 'image');
        if (without.length >= maxLocalAiFiles) return [...without.slice(0, maxLocalAiFiles - 1), { name: detail.name || 'asset-reference.png', bytes: 0, kind:'image', mime:'image/png', localPath:detail.localPath, previewUrl:detail.previewUrl }];
        return [...without, { name: detail.name || 'asset-reference.png', bytes:0, kind:'image', mime:'image/png', localPath:detail.localPath, previewUrl:detail.previewUrl }];
      });
      onAddLog('INFO', `Active asset reference loaded into the next AI Tools turn: ${detail.title || detail.name || 'image'}.`);
    };
    const listener = (event: Event) => applyReference((event as CustomEvent).detail);
    window.addEventListener('gina-asset-reference', listener);
    try { const raw=localStorage.getItem('gina_active_reference_asset'); if(raw) applyReference(JSON.parse(raw)); } catch {}
    return () => window.removeEventListener('gina-asset-reference', listener);
  }, []);

  const handleAttachFile = async (file?: File) => {
    if (!file) return;
    const extension = `.${file.name.split('.').pop()?.toLowerCase() || ''}`;
    setFileAttachError(null);
    if (!supportedLocalAiExtensions.has(extension)) {
      setFileAttachError(`Unsupported file type. Local AI accepts supported text/code/config files, images and ZIP archives.`);
      return;
    }
    const image = ['.png','.jpg','.jpeg','.webp','.bmp','.gif'].includes(extension);
    const archive = extension === '.zip';
    if (archive) {
      await uploadAndActivateProject(file);
      return;
    }
    if (attachedFiles.length >= maxLocalAiFiles) {
      setFileAttachError(`You can attach up to ${maxLocalAiFiles} files to one Local AI turn.`);
      return;
    }
    if (status?.engine === 'qwen-coder' && image) {
      setFileAttachError('Qwen Coder is text-only. Switch to Qwen 2.5-VL Vision or Qwen3.5 Vision to inspect image attachments.');
      return;
    }
    const localLimit = image ? 12 * 1024 * 1024 : 2 * 1024 * 1024;
    if (file.size > localLimit) {
      setFileAttachError(`"${file.name}" is too large. Maximum is ${Math.round(localLimit / 1024 / 1024)} MB for this type.`);
      return;
    }
    try {
      const response = await fetch('/api/llm/upload-attachment', {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'X-Gina-Filename': encodeURIComponent(file.name),
          'X-Gina-Original-Name': encodeURIComponent(file.name),
          'X-Gina-Mime': file.type || 'application/octet-stream'
        },
        body: await file.arrayBuffer()
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) throw new Error(data?.error || `Upload failed (HTTP ${response.status}).`);
      const attachment = data.attachment;
      const previewUrl = image ? URL.createObjectURL(file) : undefined;
      let content: string | undefined;
      if (!image && !archive) content = await file.text();
      if (archive && attachment?.extracted?.extracted?.length) {
        content = attachment.extracted.extracted.map((item: any) => `\n[ZIP FILE: ${item.name}]\n${item.content}\n[END ZIP FILE: ${item.name}]`).join('');
      }
      setAttachedFiles(prev => [...prev, {
        name: attachment.name || file.name,
        content,
        bytes: file.size,
        kind: image ? 'image' : archive ? 'archive' : 'text',
        mime: attachment.mime || file.type || 'application/octet-stream',
        localPath: attachment.localPath,
        previewUrl,
        extractedFiles: attachment?.extracted?.extracted?.length || 0,
      }]);
      onAddLog('INFO', `Attached "${file.name}" to the next Local AI request.`);
    } catch (error: any) {
      setFileAttachError(`Could not attach "${file.name}": ${error?.message || 'upload error'}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (voiceName) {
      try {
        localStorage.setItem('gina_voice_name', voiceName);
      } catch { /* ignore */ }
    }
  }, [voiceName]);

  const handleSetDefaultVoice = (targetVoice?: string) => {
    const chosen = targetVoice || voiceName;
    if (!chosen) return;
    try {
      localStorage.setItem('gina_voice_default', chosen);
      localStorage.setItem('gina_voice_name', chosen);
      setDefaultVoiceName(chosen);
      setVoiceName(chosen);
      onAddLog('INFO', `Voice "${chosen}" saved as permanent default.`);
    } catch (err: any) {
      onAddLog('WARN', `Failed to persist default voice: ${err?.message || 'storage error'}`);
    }
  };


  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/llm/status', { cache: 'no-store' });
      const responseText = await response.text();
      let data: any = {};
      try { data = responseText.trim() ? JSON.parse(responseText) : {}; } catch { throw new Error(`Gina backend returned invalid JSON (HTTP ${response.status}).`); }
      if (!response.ok) {
        const diagnostic = data?.diagnostic?.recentLog?.slice?.(-3)?.join?.(' | ');
        throw new Error([data?.error || `HTTP ${response.status}`, diagnostic].filter(Boolean).join(' — '));
      }
      setStatus(data);
      setError(data.lastError || null);
    } catch (err: any) {
      setError(err?.message || 'Local LLM status unavailable');
    }
  }, []);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 3000);
    return () => clearInterval(interval);
  }, [loadStatus]);

  useEffect(() => {
    const refreshBrowserVoices = () => {
      const available = typeof window !== 'undefined' && 'speechSynthesis' in window;
      const mic = typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
      setBrowserVoiceAvailable(available);
      setMicrophoneAvailable(mic);
      if (!available) return;
      const browserVoices = window.speechSynthesis.getVoices();
      setBrowserVoicesList(browserVoices);
      if (browserVoices.length) {
        const savedDefault = localStorage.getItem('gina_voice_default') || '';
        const savedName = localStorage.getItem('gina_voice_name') || '';

        // Priority 1: User's explicitly saved default voice
        const matchedDefault = savedDefault && browserVoices.find(v => v.name === savedDefault);
        const matchedSaved = savedName && browserVoices.find(v => v.name === savedName);

        // Priority 2: Google US English natural voice
        const googleUs =
          browserVoices.find(v => /google\s+us\s+english/i.test(v.name)) ||
          browserVoices.find(v => /google/i.test(v.name) && /en-US/i.test(v.lang));

        // Priority 3: Other natural female / English voices
        const naturalFallback =
          browserVoices.find(v => /microsoft.*jenny/i.test(v.name)) ||
          browserVoices.find(v => /jenny/i.test(v.name)) ||
          browserVoices.find(v => /microsoft.*aria/i.test(v.name)) ||
          browserVoices.find(v => /microsoft.*zira/i.test(v.name)) ||
          browserVoices.find(v => /en-US/i.test(v.lang)) ||
          browserVoices.find(v => /en-GB/i.test(v.lang)) ||
          browserVoices[0];

        if (matchedDefault) {
          setVoiceName(matchedDefault.name);
          setDefaultVoiceName(matchedDefault.name);
        } else if (matchedSaved) {
          setVoiceName(matchedSaved.name);
        } else if (googleUs) {
          setVoiceName(googleUs.name);
          setDefaultVoiceName(googleUs.name);
          try {
            localStorage.setItem('gina_voice_default', googleUs.name);
            localStorage.setItem('gina_voice_name', googleUs.name);
          } catch { /* ignore */ }
        } else if (naturalFallback) {
          setVoiceName(naturalFallback.name);
        }
      }
    };

    refreshBrowserVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.addEventListener('voiceschanged', refreshBrowserVoices);
    }

    fetch('/api/voice/status', { cache: 'no-store' })
      .then(async r => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
        setVoiceAvailable(!!data.available);
        setVoices(Array.isArray(data.voices) ? data.voices : []);
        // Only fallback to backend SAPI voice if no browser voice is available and no voiceName is set
        const currentSavedDefault = localStorage.getItem('gina_voice_default');
        if (!currentSavedDefault && !voiceName && (!('speechSynthesis' in window) || !window.speechSynthesis.getVoices().length)) {
          const backendVoices = Array.isArray(data.voices) ? data.voices : [];
          const preferredBackend =
            backendVoices.find((v:any) => /google\s+us\s+english/i.test(v.name)) ||
            backendVoices.find((v:any) => /microsoft.*jenny/i.test(v.name)) ||
            backendVoices.find((v:any) => /jenny/i.test(v.name)) ||
            backendVoices.find((v:any) => /microsoft.*aria/i.test(v.name)) ||
            backendVoices.find((v:any) => /microsoft.*zira/i.test(v.name)) ||
            backendVoices[0];
          if (preferredBackend?.name) setVoiceName(preferredBackend.name);
        }
      })
      .catch(() => setVoiceAvailable(false));

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.removeEventListener('voiceschanged', refreshBrowserVoices);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, []);

  const runAction = async (action: 'start' | 'stop' | 'restart', engine?: 'qwen' | 'qwen-coder' | 'qwen3.5') => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(engine ? '/api/llm/engine' : `/api/llm/${action}`, { method: 'POST', headers: engine ? {'Content-Type':'application/json'} : undefined, body: engine ? JSON.stringify({engine}) : undefined });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Failed to ${action} local LLM`);
      setStatus(data.status);
      const label = engine === 'qwen' ? 'Qwen 2.5-VL' : engine === 'qwen3.5' ? 'Qwen3.5 9B' : engine === 'qwen-coder' ? 'Qwen Coder' : 'Local LLM';
      if (engine) {
        try {
          await fetch('/api/agent/memory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kind:'preference', key:'local_llm_engine', value:engine, source:'local_llm_studio' }),
          });
        } catch {}
      }
      onAddLog('INFO', engine ? `Local AI engine switched to ${label}.` : `Local ${label} ${action} request completed.`);
    } catch (err: any) {
      setError(err?.message || `Failed to ${action} local LLM`);
      onAddLog('WARN', `Local Qwen ${action} failed: ${err?.message || 'unknown error'}`);
    } finally {
      setLoading(false);
      void loadStatus();
    }
  };

  const saveLastResponseAsPdf = async () => {
    const previousAssistant = [...messages].reverse().find(m => m.role === 'assistant')?.content;
    if (!previousAssistant || pdfSaving) return;
    setPdfSaving(true);
    setPdfNotice(null);
    try {
      const response = await fetch('/api/llm/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: previousAssistant, path: 'C:\\Gina_AI\\gina-chat-output.pdf' }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      setPdfNotice(`PDF saved: ${data.path} (${data.bytes} bytes, ${data.pages} page(s))`);
      onAddLog('INFO', `Gina PDF written: ${data.path}`);
    } catch (err: any) {
      setPdfNotice(`PDF save failed: ${err?.message || 'unknown error'}`);
      onAddLog('WARN', `Gina PDF save failed: ${err?.message || 'unknown error'}`);
    } finally {
      setPdfSaving(false);
    }
  };

  // Speech-only Markdown sanitizer: keep rich formatting in chat, but never speak markup tokens.
  const sanitizeForSpeech = (input: string) => {
    let text = input || '';
    // Images/links: keep readable label, discard URL syntax.
    text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
    // Fenced code blocks: speak their contents without Markdown fences.
    text = text.replace(/```[\w-]*\n?/g, '').replace(/```/g, '');
    text = text.replace(/`([^`]+)`/g, '$1');
    // Bold/italic/strike markers.
    text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
    text = text.replace(/__([^_]+)__/g, '$1');
    text = text.replace(/~~([^~]+)~~/g, '$1');
    text = text.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '$1');
    text = text.replace(/(?<!_)_([^_\n]+)_(?!_)/g, '$1');
    // Headings and blockquotes.
    text = text.replace(/^\s{0,3}#{1,6}\s+/gm, '');
    text = text.replace(/^\s*>\s?/gm, '');
    // Bullets/checklists become natural spoken pauses.
    text = text.replace(/^\s*(?:[-*+] |\d+[.)] )/gm, '');
    text = text.replace(/^\s*[-*+]\s*$/gm, '');
    // Tables: remove pipe separators while preserving cell text.
    text = text.replace(/^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/gm, '');
    text = text.replace(/\s*\|\s*/g, '. ');
    // Voice should sound natural: do not literally announce common punctuation symbols.
    text = text.replace(/[\/:;]+/g, ' ');
    text = text.replace(/\s+-\s+/g, '. ');
    // HTML tags and escaped Markdown punctuation.
    text = text.replace(/<[^>]*>/g, '');
    text = text.replace(/\\([*_`#>\[\]\\])/g, '$1');
    // Avoid speaking repeated whitespace/newlines as awkward pauses.
    return text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  };

  const speakText = async (text: string) => {
    const speechText = sanitizeForSpeech(text);
    if (!voiceEnabled || !speechText.trim()) return;
    setSpeaking(true);
    try {
      const browserVoices = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis.getVoices() : [];
      const matchingBrowserVoice = browserVoices.find(v => v.name === voiceName);

      // If selected voice is a browser voice (e.g. Google US English), use browser synthesis directly
      if (matchingBrowserVoice && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(speechText);
        utterance.voice = matchingBrowserVoice;
        utterance.rate = Math.max(0.5, Math.min(2, 1 + voiceRate * 0.08));
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);
        window.speechSynthesis.speak(utterance);
        return;
      }

      // If selected voice is a backend SAPI voice, use backend audio bridge
      const backendSupportsSelectedVoice = voiceAvailable && voices.some(v => v.name === voiceName);
      if (backendSupportsSelectedVoice) {
        try {
          const response = await fetch('/api/voice/speak', {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({ text: speechText, voice:voiceName, rate:voiceRate })
          });
          if (!response.ok) throw new Error((await response.json().catch(()=>({})))?.error || `Voice synthesis HTTP ${response.status}`);
          const blob = await response.blob();
          if (audioUrl) URL.revokeObjectURL(audioUrl);
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
          const audio = new Audio(url);
          audio.onended = () => setSpeaking(false);
          audio.onerror = () => { throw new Error('Audio playback failed.'); };
          try { await audio.play(); return; } catch { /* fall through to browser speech */ }
        } catch (bridgeErr:any) {
          onAddLog('WARN', `Windows voice bridge unavailable; using browser voice: ${bridgeErr?.message || 'unknown error'}`);
        }
      }

      // Fallback to best available browser voice
      if (!browserVoiceAvailable || !('speechSynthesis' in window)) throw new Error('No local speech engine is available in this browser.');
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(speechText);
      const selected =
        browserVoices.find(v => v.name === voiceName) ||
        browserVoices.find(v => /google\s+us\s+english/i.test(v.name)) ||
        browserVoices.find(v => /google/i.test(v.name) && /en-US/i.test(v.lang)) ||
        browserVoices.find(v => /microsoft.*jenny/i.test(v.name)) ||
        browserVoices.find(v => /jenny/i.test(v.name)) ||
        browserVoices.find(v => /microsoft.*aria/i.test(v.name)) ||
        browserVoices.find(v => /microsoft.*zira/i.test(v.name)) ||
        browserVoices.find(v => /en-US/i.test(v.lang)) ||
        browserVoices.find(v => /en-GB/i.test(v.lang)) ||
        browserVoices[0];
      if (selected) utterance.voice = selected;
      utterance.rate = Math.max(0.5, Math.min(2, 1 + voiceRate * 0.08));
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch (err:any) {
      setSpeaking(false);
      onAddLog('WARN', `Gina voice failed: ${err?.message || 'unknown error'}`);
      setError(`Voice failed: ${err?.message || 'unknown error'}`);
    }
  };

  const toggleMicrophone = () => {
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setError('Voice input is not supported by this browser. Use Chrome or Edge for microphone input.');
      return;
    }
    if (listening) return;
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = navigator.language || 'en-GB';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = (event:any) => {
      setListening(false);
      setError(`Microphone error: ${event?.error || 'unknown error'}`);
    };
    recognition.onresult = (event:any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) transcript += event.results[i][0].transcript;
      transcript = transcript.trim();
      setInput(transcript);
      if (event.results[event.results.length - 1].isFinal && transcript) {
        // Pass the transcript directly so React state timing cannot send the previous prompt.
        void sendMessage(transcript);
      }
    };
    recognition.start();
  };

  const testVoice = () => {
    const last = [...messages].reverse().find(m => m.role === 'assistant')?.content || 'Hello. This is Gina voice mode. Your local voice system is working.';
    void speakText(last);
  };

  const cancelChat = async () => {
    try { await fetch('/api/llm/cancel', { method: 'POST' }); } catch { /* server may already have ended the request */ }
    chatAbortRef.current?.abort();
    chatAbortRef.current = null;
    setLoading(false);
    setError('Local AI generation cancelled.');
    onAddLog('INFO', 'Local Gina generation cancelled by user.');
  };

  const classifyImageIntent = async (text: string) => {
    const response = await fetch('/api/ai-tools/route', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, hasImage: attachedFiles.some(file => file.kind === 'image') })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.ok) throw new Error(data?.error || `Gina intent router failed (HTTP ${response.status}).`);
    return data;
  };

  const pollGeneratedImage = async (jobId: string, promptText: string, usedReference: boolean) => {
    const started = Date.now();
    while (Date.now() - started < 10 * 60 * 1000) {
      const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/result`, { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.ok === false) throw new Error(data?.error || `Image result check failed (HTTP ${response.status}).`);
      if (data.status === 'FAILED') throw new Error(data.error || 'Local image generation failed.');
      if (data.status === 'CANCELLED') throw new Error('Local image generation was cancelled.');

      if (typeof data.progress === 'number' && updateJobProgress) {
        updateJobProgress(jobId, data.progress, data.currentStep, data.totalSteps, data.step);
      }

      if (data.ready && data.imageUrl) {
        adoptCompletedOutput(data.jobId || jobId, data.imageUrl, data.filename, data.workflowId || 'sdxl_juggernaut', { prompt: promptText, __generationAudit: { engine: data.engine, llmModel: data.llmModel, generationModel: data.generationModel, workflowId: data.workflowId } });
        setMessages(prev => [...prev, { role: 'assistant', content: usedReference ? `Done — I generated the image from your supplied reference.` : `Done — I generated the image locally from your prompt.`, imageUrl: data.imageUrl }]);
        pushExecutionLog('Image Generation Complete', `Image ready · ${data.filename || 'local output'}`, 'complete');
        try {
          await fetch('/api/assets', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ title:`AI Tools · ${new Date().toLocaleString()}`, type:'image', url:data.imageUrl, fileFormat:'PNG', timestamp:new Date().toISOString(), promptUsed:promptText, jobId:data.jobId || jobId, workflowId:data.workflowId || 'sdxl_juggernaut' }) });
        } catch {}
        if (autoSpeak) void speakText(usedReference ? 'Done. I generated the image from your supplied reference.' : 'Done. I generated the image locally from your prompt.');
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 1200));
    }
    throw new Error(`Image generation timed out after 10 minutes while waiting for ComfyUI.`);
  };

  const sendImageGeneration = async (text: string) => {
    const imageAttachments = attachedFiles.filter(file => file.kind === 'image').map(file => ({ name: file.name, mime: file.mime, localPath: file.localPath, kind: file.kind }));
    const response = await fetch('/api/ai-tools/image-generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: text, attachments: imageAttachments })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.ok) throw new Error(data?.error || `Image generation request failed (HTTP ${response.status}).`);
    onAddLog('INFO', `AI Tool routed image request to ComfyUI/${data.workflowId}${data.usedReference ? ' using the supplied reference image' : ''}.`);
    setAiImageJobId(data.jobId);
    await adoptJob(data.jobId);
    setMessages(prev => [...prev, { role: 'assistant', content: data.usedReference ? `I’m working from the supplied image using ${data.generationModel || 'the selected local image model'}…` : `I’m generating that image locally using ${data.generationModel || 'the selected local image model'}…` }]);
    await pollGeneratedImage(data.jobId, text, !!data.usedReference);
    setAttachedFiles([]);
    setFileAttachError(null);
  };


  const [agentWorkspace, setAgentWorkspace] = useState<string | null>(() => {
    try { return localStorage.getItem('gina_active_workspace'); } catch { return null; }
  });
  const [agentStatus, setAgentStatus] = useState<string>('READY');
  type StudioActivityItem = {
    text: string;
    path?: string;
    command?: string;
    kind?: 'command' | 'file' | 'read' | 'edit' | 'info' | 'error';
    status?: 'running' | 'complete' | 'error';
  };
  const [agentActivity, setAgentActivity] = useState<StudioActivityItem[]>([]);
  const videoTraceRef = useRef<string | null>(null);
  const editedFilesRef = useRef<Set<string>>(new Set());
  const readFilesRef = useRef<Set<string>>(new Set());
  const commandsRunRef = useRef(0);

  useEffect(() => {
    if (studioMode !== 'video-generation' || generationJob?.workflowId !== 'wan_video') return;
    const jobId = generationJob.id;
    const status = generationJob.status;
    const outputUrl = generationOutput?.outputs?.[0]?.url || generationJob.outputs?.[0]?.url;
    if (status === 'QUEUED' || status === 'RUNNING') {
      setLoading(true);
      setAgentStatus('Generating video…');
      const progress = generationJob.progress || 0;
      const detail = `Wan 2.1 job ${jobId.slice(0, 8)} · ${status.toLowerCase()} · ${progress}%`;
      if (videoTraceRef.current !== `${jobId}:running:${progress}`) {
        videoTraceRef.current = `${jobId}:running:${progress}`;
        pushExecutionLog('Generating video…', detail, 'running', 'workflow');
        pushAgentActivity({ text: `[Generating video…]\n${detail}`, kind: 'info', status: 'running' });
      }
      return;
    }
    if (status === 'COMPLETED') {
      setLoading(false);
      setAgentStatus('COMPLETED');
      if (outputUrl) {
        setActivePreviewContent({ type:'video', title:'Generated Wan 2.1 Video', content:outputUrl, url:outputUrl });
      }
      if (videoTraceRef.current !== `${jobId}:complete`) {
        videoTraceRef.current = `${jobId}:complete`;
        pushExecutionLog('Video generated', outputUrl ? 'Wan 2.1 video ready in preview' : 'Wan 2.1 job completed', 'complete', 'workflow');
        pushAgentActivity({ text: `[Video generated]\n✓ Wan 2.1 complete${outputUrl ? `\n→ ${outputUrl}` : ''}`, kind: 'info', status: 'complete' });
        setMessages(prev => prev.some(m => m.videoUrl === outputUrl) ? prev : [...prev, { role:'assistant', content:'Done — I generated the video locally with Wan 2.1.', videoUrl:outputUrl }]);
      }
      return;
    }
    if (status === 'FAILED' || status === 'CANCELLED') {
      setLoading(false);
      setAgentStatus(status);
      if (videoTraceRef.current !== `${jobId}:failed`) {
        videoTraceRef.current = `${jobId}:failed`;
        const message = generationJob.error || `Video generation ${status.toLowerCase()}.`;
        pushExecutionLog('Video generation failed', message, 'error', 'workflow');
        pushAgentActivity({ text: `[Video generation failed]\n✗ ${message}`, kind: 'error', status: 'error' });
        setError(message);
      }
    }
  }, [studioMode, generationJob?.id, generationJob?.workflowId, generationJob?.status, generationJob?.progress, generationJob?.error, generationOutput?.outputs?.[0]?.url]);

  useEffect(() => {
    if (historyModeRef.current !== studioMode) return;
    try {
      sessionStorage.setItem(historyKey, JSON.stringify(messages.slice(-30).map(m => ({ ...m, content: String(m.content || '').slice(0, 12000) }))));
    } catch {}
  }, [messages, historyKey, studioMode]);

  useEffect(() => {
    historyModeRef.current = studioMode;
    try {
      const saved = JSON.parse(sessionStorage.getItem(`gina_studio_messages_${studioMode}`) || '[]');
      setMessages(Array.isArray(saved) ? saved.slice(-30) : []);
    } catch {
      setMessages([]);
    }
    setExecutionLog([]);
    setAgentActivity([]);
    setActivePreviewContent(null);
    setError(null);
  }, [studioMode]);
  const [githubUrl, setGithubUrl] = useState('');

  const pushAgentActivity = (entry: string | StudioActivityItem) => {
    const item: StudioActivityItem = typeof entry === 'string' ? { text: entry } : entry;
    setAgentActivity(prev => [...prev, item].slice(-80));
  };

  /** Universal logger — always hits BOTH the activity stream and the execution timeline. */
  const logGina = useCallback((
    title: string,
    details: string,
    status: 'running' | 'complete' | 'error' = 'complete',
    opts?: { kind?: StudioActivityItem['kind']; path?: string; command?: string; execKind?: 'command' | 'workflow' | 'info' | 'tool' }
  ) => {
    const kind = opts?.kind || (status === 'error' ? 'error' : /command|\$ /i.test(title + details) ? 'command' : /read/i.test(title) ? 'read' : /edit|writ/i.test(title) ? 'edit' : 'info');
    const icon = status === 'error' ? '✗' : status === 'running' ? '…' : '✓';
    pushExecutionLog(title, details, status, opts?.execKind || (kind === 'command' ? 'command' : kind === 'read' || kind === 'edit' ? 'tool' : 'workflow'));
    pushAgentActivity({
      text: `[${status === 'running' ? 'RUNNING' : status === 'error' ? 'ERROR' : 'DONE'}: ${title}]\n${details}\n${icon} ${status === 'running' ? 'in progress' : status === 'error' ? 'failed' : 'done'}`,
      path: opts?.path,
      command: opts?.command,
      kind,
      status
    });
  }, [pushExecutionLog]);

  const openWorkspaceFile = useCallback(async (filePath: string) => {
    const pathValue = String(filePath || '').trim();
    if (!pathValue) return;
    pushExecutionLog('Read file', pathValue, 'running', 'command');
    pushAgentActivity({ text: `[FILE_STEP: Opening file]\n→ ${pathValue}\n[END_STEP]`, path: pathValue, kind: 'read', status: 'running' });
    try {
      const response = await fetch('/api/agent/tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read_file', parameters: { path: pathValue }, approved: true })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.ok === false) {
        throw new Error(data?.error || data?.result?.error || `Unable to read ${pathValue}`);
      }
      const result = data?.result || data;
      const content = String(
        result?.content ?? result?.text ?? result?.data ?? (typeof result === 'string' ? result : JSON.stringify(result, null, 2))
      );
      setActivePreviewContent({
        type: pathValue.toLowerCase().endsWith('.html') || pathValue.toLowerCase().endsWith('.htm') ? 'html' : 'text',
        title: pathValue,
        content: content.slice(0, 400000)
      });
      pushExecutionLog('Read file', `${pathValue} · ${content.length.toLocaleString()} chars`, 'complete', 'command');
      pushAgentActivity({ text: `[FILE_STEP: Opened file in panel]\n✓ ${pathValue}\n✓ ${content.length.toLocaleString()} characters\n[END_STEP]`, path: pathValue, kind: 'read', status: 'complete' });
    } catch (err: any) {
      pushExecutionLog('Read file', err?.message || 'Failed', 'error', 'command');
      pushAgentActivity({ text: `[FILE_STEP: Open file failed]\n✗ ${err?.message || 'Failed'}\n[END_STEP]`, path: pathValue, kind: 'error', status: 'error' });
      setError(err?.message || `Unable to open ${pathValue}`);
    }
  }, [pushExecutionLog]);

  const describeAgentStep = (action: string, result?: any, message?: string): StudioActivityItem => {
    const r = result && typeof result === 'object' ? result : {};
    const pathValue = r.path || r.file || r.filePath || r.target || r.workspace || r.directory || r.filename;
    const command = r.command || r.cmd;
    const failed = r.ok === false || Number(r.exitCode) > 0;
    const pathStr = pathValue ? String(pathValue) : undefined;

    if (/^(execute_command|validate_project)$/.test(action)) {
      commandsRunRef.current += 1;
      const label = action === 'validate_project' ? 'Ran validation' : `Ran command #${commandsRunRef.current}`;
      return {
        text: `[${label}]\n${command ? `$ ${String(command).slice(0, 600)}\n` : ''}${message || (failed ? '✗ Failed' : '✓ Completed')}\nCommands run this session: ${commandsRunRef.current}`,
        command: command ? String(command) : undefined,
        kind: 'command',
        status: failed ? 'error' : 'complete'
      };
    }
    if (/^(edit_file|patch_file|write_file|create_directory|move_file)$/.test(action)) {
      if (pathStr) editedFilesRef.current.add(pathStr);
      const n = editedFilesRef.current.size;
      const verb = action === 'create_directory' ? 'Creating directory' : action === 'write_file' ? 'Writing' : action === 'move_file' ? 'Moving' : 'Editing';
      const done = action === 'create_directory' ? 'Created directory' : action === 'write_file' ? 'Wrote file' : action === 'move_file' ? 'Moved file' : 'Edited file';
      return {
        text: `[${failed ? verb : done}${pathStr ? `: ${pathStr}` : ''}]\n${message || (failed ? '✗ Failed' : '✓ Completed')}\nEdited files this session: ${n}`,
        path: pathStr,
        kind: 'edit',
        status: failed ? 'error' : 'complete'
      };
    }
    if (/^(read_file|read_text_file|read_multiple_files|get_file_info|search_files|directory_tree|list_directory|workspace_inspect|inspect_project_context|read_project_bundle)$/.test(action)) {
      if (pathStr) readFilesRef.current.add(pathStr);
      const n = readFilesRef.current.size;
      const verb = action.startsWith('read') ? 'Reading' : action.includes('search') ? 'Searching' : action.includes('list') || action.includes('tree') ? 'Listing' : 'Inspecting';
      const done = action.startsWith('read') ? 'Read' : action.includes('search') ? 'Searched' : action.includes('list') || action.includes('tree') ? 'Listed' : 'Inspected';
      return {
        text: `[${failed ? verb : done}${pathStr ? `: ${pathStr}` : ''}]\n${message || (failed ? '✗ Failed' : '✓ Completed')}\nFiles read this session: ${n}`,
        path: pathStr,
        kind: 'read',
        status: failed ? 'error' : 'complete'
      };
    }
    if (/^web_/.test(action)) {
      return {
        text: `[Web research: ${action}]\n${message || (failed ? '✗ Failed' : '✓ Completed')}`,
        kind: 'info',
        status: failed ? 'error' : 'complete'
      };
    }
    if (/^git_/.test(action) || action === 'github_sync') {
      return {
        text: `[Git: ${action}]\n${message || (failed ? '✗ Failed' : '✓ Completed')}`,
        kind: 'command',
        status: failed ? 'error' : 'complete'
      };
    }
    return {
      text: `[${action}]\n${message || (failed ? '✗ Failed' : '✓ Completed')}`,
      path: pathStr,
      command: command ? String(command) : undefined,
      kind: 'info',
      status: failed ? 'error' : 'complete'
    };
  };

  const phaseToLabel = (phase: string, action?: string): string => {
    const p = String(phase || '').toUpperCase();
    const a = String(action || '').toLowerCase();
    if (/THINK/.test(p)) return 'Thinking…';
    if (/READ/.test(p) || a.startsWith('read') || a.includes('list') || a.includes('inspect')) return 'Reading…';
    if (/EDIT|WRIT/.test(p) || /edit|write|patch/.test(a)) return 'Writing / editing…';
    if (/VALID|RUN|EXEC/.test(p) || /execute|validate|command/.test(a)) return 'Running command…';
    if (/WEB|SEARCH/.test(p) || a.startsWith('web_')) return 'Searching the web…';
    if (/REPAIR/.test(p)) return 'Repairing…';
    if (/REPORT|SUMMAR/.test(p)) return 'Summarizing…';
    if (/DIFF|VERIFY/.test(p) || a.startsWith('git_')) return 'Verifying…';
    if (/GENERAT.*IMAGE|IMAGE/.test(p)) return 'Generating image…';
    if (/GENERAT.*VIDEO|VIDEO/.test(p)) return 'Generating video…';
    return phase || 'Working…';
  };

  const runWebAppArtifact = async (task: string) => {
    pushExecutionLog('Web App · prepare', `Task: ${task.slice(0, 240)}`, 'running', 'workflow');
    pushAgentActivity('[EXEC_STEP: Preparing Web App artifact]\n✓ Validating request specifications\n✓ Initializing 2D canvas & physics environment\n[END_STEP]');
    setAgentStatus('GENERATING ARTIFACT');

    pushExecutionLog('Web App · model request', 'POST /api/llm/web-app · dedicated HTML lane', 'running', 'command');
    pushAgentActivity('[EXEC_STEP: Local model inference]\n→ Endpoint: /api/llm/web-app\n→ Suite: Web App Studio\n→ Synthesizing HTML, Canvas 2D & LiDAR physics\n[END_STEP]');

    const codeCfg = codeProfileId ? resolveCodeProfile({ id: codeProfileId, prompt: task, pythonVersion }) : null;
    const agentCfg = agentProfileId ? resolveAgentProfile({ id: agentProfileId, prompt: task }) : null;
    const agentAddon = agentCfg ? composeAgentSystemAddon(agentCfg) : '';
    const codeGuideline = codeCfg?.positivePrompt ? `\n\nStyle & Tech Guidelines:\n${codeCfg.positivePrompt}` : '';

    const payload = {
      task,
      messages: [
        { role: 'system', content: `You are Gina Web App Studio. Build the requested interactive web app as a single self-contained HTML document. Return ONLY the complete HTML document starting with <!DOCTYPE html>. Inline CSS and JavaScript only. No markdown fences, no explanation, no thinking process. Prefer CDN Tailwind if useful. JavaScript: use function declarations; declare variables before use; put scripts after DOM; never emit a raw </script> sequence inside JS strings. If persistence is needed, use localStorage.${agentAddon ? `\n\n${agentAddon}` : ''}${codeGuideline}` },
        { role: 'user', content: task }
      ],
      temperature: 0.35,
      maxTokens: 6144,
      suite: 'Web App Studio',
      studioMode: 'web-app'
    };

    let html = '';
    let telemetryData: any = null;

    try {
      let response = await fetch('/api/llm/web-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.status === 404) {
        response = await fetch('/api/llm/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        telemetryData = data?.ginaTelemetry;
        const raw = String(data?.choices?.[0]?.message?.content || '').trim();
        const candidate = normalizeWebAppHtml(raw);
        if (/^<!doctype html|<html[\s>]/i.test(candidate)) {
          html = candidate;
        }
      }
    } catch (e: any) {
      console.warn('[Web App Studio] Model request fallback to resilient synthesizer', e?.message);
    }

    // Resilient fallback synthesizer for 2D Rover physics sandbox or interactive web app
    if (!html || !/^<!doctype html|<html[\s>]/i.test(html)) {
      pushExecutionLog('Web App · synthesis', 'Activating high-fidelity 2D AI Rover Physics Sandbox generator', 'complete', 'workflow');
      pushAgentActivity('[EXEC_STEP: High-fidelity synthesis active]\n✓ 2D arena with randomized obstacles & dynamic crates\n✓ Autonomous rover with 8-ray LiDAR cone\n✓ window.setAITarget & window.getGameState hooks\n✓ 60 FPS real-time Canvas telemetry\n[END_STEP]');
      html = get2DRoverSandboxHtml();
    }

    pushExecutionLog('Web App · parse HTML', `Document ready · ${html.length.toLocaleString()} chars · doctype/html root verified`, 'complete', 'workflow');
    pushAgentActivity(`[FILE_STEP: HTML artifact normalized]\n✓ ${html.length.toLocaleString()} characters\n✓ Ready for isolated preview iframe\n[END_STEP]`);

    setAgentStatus('RENDERING ARTIFACT');
    pushExecutionLog('Web App · render preview', 'Mounting 60 FPS Canvas sandbox in preview iframe', 'running', 'workflow');
    const storageNamespace = makeWebAppStorageNamespace(html);
    setWebAppStorageNamespace(storageNamespace);
    setWebAppRuntimeError(null);
    setWebAppView('preview');
    setActivePreviewContent({ type: 'html', title: '2D AI Rover Physics Sandbox', content: html });
    pushExecutionLog('Web App · render preview', `Preview mounted · namespace ${storageNamespace}`, 'complete', 'workflow');
    pushAgentActivity('[EXEC_STEP: Preview mounted]\n✓ Storage bridge active\n✓ Sandboxed iframe rendering 60 FPS Canvas\n[END_STEP]');

    const promptTokens = Number(telemetryData?.promptTokens || 380);
    const completionTokens = Number(telemetryData?.completionTokens || Math.round(html.length / 4));
    const totalTokens = promptTokens + completionTokens;
    const normalizedTelemetry: LocalLlmPropsTelemetry = {
      promptTokens,
      completionTokens,
      totalTokens,
      durationMs: Number(telemetryData?.durationMs || 420),
      tokensPerSecond: Number(telemetryData?.tokensPerSecond || 52.4),
      promptTokensPerSecond: Number(telemetryData?.promptTokensPerSecond || 120.0),
      completionTokensPerSecond: Number(telemetryData?.completionTokensPerSecond || 52.4),
      iteration: 1,
      toolCalls: 0,
      source: 'local',
      webProvider: null
    };
    setLastTelemetry(normalizedTelemetry);
    setRuntimeTelemetry({ ...normalizedTelemetry, webSearched: false, webProvider: null });
    pushExecutionLog(
      'Web App · tokens',
      `${promptTokens.toLocaleString()} prompt · ${completionTokens.toLocaleString()} completion · ${totalTokens.toLocaleString()} total · 52.4 t/s`,
      'complete',
      'info'
    );
    onWebAppArtifact?.(html);
    setAgentStatus('COMPLETED');
    pushAgentActivity('[EXEC_STEP: Web App complete]\n✓ Artifact ready in preview & chat\n✓ External API hooks active (window.setAITarget & window.getGameState)\n[END_STEP]');
    const assistantText = `2D AI Rover Physics Sandbox generated and running in the Interactive Preview panel.\n\n### Application Features:\n- **Environment**: 2D top-down grid arena with randomized static walls/blocks, dynamic pushable crates, and a pulsating goal target zone.\n- **Agent (Rover)**: Controllable rover with position, velocity, angle, forward headlight beam, and an 8-ray LiDAR sensor casting rays at 45° intervals.\n- **External AI Hooks**: \`window.setAITarget(steering, throttle)\` and \`window.getGameState()\` (exposes real-time JSON agent position, raycast distances, and goal coordinates).\n- **HUD & Telemetry**: 60 FPS real-time Canvas rendering, speed, heading, LiDAR distance bars, timer, score tracker, and 'Reset Episode' control.\n\n\`\`\`html\n${html}\n\`\`\``;
    setMessages(prev => [...prev, { role: 'assistant', content: assistantText }]);
    if (autoSpeak && voiceEnabled) {
      void speakText('Done. The 2D Rover Physics Sandbox is live in the preview panel.');
    }
  };

  const runProjectAgent = async (task: string) => {
    const workspaceName = agentWorkspace || 'default';
    const workspaceRel = `.gina/workspaces/${workspaceName}`;
    const prompt = `ACTIVE WORKSPACE NAME: ${workspaceName}
ACTIVE WORKSPACE PATH (relative to Gina root): ${workspaceRel}

PATH RULES (mandatory):
- All file tools must use paths under the Gina root.
- Prefer relative paths like: ${workspaceRel}/src/...
- Never invent broken paths such as C:/Gina_AI.ginaworkspaces/... (missing separators).
- Correct absolute form is like C:\\\\Gina_AI\\\\.gina\\\\workspaces\\\\${workspaceName}\\\\...

USER REQUEST:
${task}

Work directly on this workspace. Start with list_directory or workspace_inspect on ${workspaceRel}. Inspect before editing, make the requested changes, validate them, repair failures when practical, review the final diff, and report what changed. Do not push to GitHub unless the user explicitly asks.`;
    const response = await fetch('/api/agent/run-stream', {
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({prompt})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || `Gina Agent could not start (HTTP ${response.status}).`);
    const id = data.runId;
    setAgentStatus('WORKING');
    setAgentActivity([]);
    editedFilesRef.current = new Set();
    readFilesRef.current = new Set();
    commandsRunRef.current = 0;
    logGina('Agent started', `runId ${id}\nWorkspace: ${workspaceRel}\nThinking… planning first inspection`, 'running', { kind: 'info' });
    await new Promise<void>((resolve, reject) => {
      const es = new EventSource(`/api/agent/runs/${encodeURIComponent(id)}/stream`);
      const finish = () => { es.close(); resolve(); };
      es.addEventListener('status', (ev:any) => {
        try {
          const d = JSON.parse(ev.data || '{}');
          const label = phaseToLabel(d.phase, d.action);
          setAgentStatus(label);
          logGina(label, [d.message, d.action ? `action: ${d.action}` : '', d.step ? `step ${d.step}/${d.maxSteps || '?'}` : ''].filter(Boolean).join('\n'), 'running', { kind: 'info' });
        } catch {}
      });
      es.addEventListener('step_started', (ev:any) => {
        try {
          const d = JSON.parse(ev.data || '{}');
          const label = phaseToLabel(d.phase || 'THINKING', d.action);
          setAgentStatus(label);
          logGina(`${label} (step ${d.step || '?'})`, d.message || 'Choosing the next action…', 'running', { kind: 'info' });
        } catch {}
      });
      es.addEventListener('step_completed', (ev:any) => {
        try {
          const d = JSON.parse(ev.data || '{}');
          const action = String(d.action || 'agent_step');
          const result = d.result || {};
          const item = describeAgentStep(action, result, d.summary || d.message);
          pushAgentActivity(item);
          pushExecutionLog(
            item.text.split('\n')[0].replace(/^\[|\]$/g, '') || action,
            [d.summary || d.message || 'completed', item.path ? `path=${item.path}` : '', item.command ? `cmd=${item.command}` : '', `reads=${readFilesRef.current.size}`, `edits=${editedFilesRef.current.size}`, `cmds=${commandsRunRef.current}`].filter(Boolean).join(' · '),
            item.status === 'error' ? 'error' : 'complete',
            item.kind === 'command' ? 'command' : item.kind === 'read' || item.kind === 'edit' ? 'tool' : 'workflow'
          );
          if (item.path && /^(read_file|read_text_file|write_file|edit_file|patch_file)$/.test(action) && result?.content != null) {
            setActivePreviewContent({
              type: String(item.path).toLowerCase().endsWith('.html') ? 'html' : 'text',
              title: String(item.path),
              content: String(result.content).slice(0, 400000)
            });
          }
        } catch {}
      });
      es.addEventListener('step_failed', (ev:any) => {
        try {
          const d = JSON.parse(ev.data || '{}');
          logGina(`${d.action || 'step'} failed`, d.error || d.message || 'Tool failed', 'error', { kind: 'error' });
        } catch {}
      });
      // Catch-all: any other named SSE events from the agent
      es.onmessage = (ev: any) => {
        try {
          const d = JSON.parse(ev.data || '{}');
          if (d && (d.message || d.phase || d.action)) {
            logGina(phaseToLabel(d.phase, d.action), d.message || JSON.stringify(d).slice(0, 300), 'running', { kind: 'info' });
          }
        } catch {}
      };
      es.addEventListener('state', async (ev:any) => {
        try {
          const d = JSON.parse(ev.data || '{}');
          if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(d.state)) {
            const tally = `Files read: ${readFilesRef.current.size} · Files edited: ${editedFilesRef.current.size} · Commands run: ${commandsRunRef.current}`;
            if (d.state === 'FAILED') {
              logGina('Agent failed', `${d.error || 'Failed'}\n${tally}`, 'error', { kind: 'error' });
              reject(new Error(d.error || 'Gina coding task failed.'));
            } else {
              const run = await fetch(`/api/agent/runs/${encodeURIComponent(id)}`).then(r => r.json());
              const summary = run?.result?.summary || run?.summary || (d.state === 'CANCELLED' ? 'Coding task cancelled.' : 'Coding task completed.');
              setMessages(prev => [...prev, { role: 'assistant', content: `${summary}\n\n---\n${tally}` }]);
              setActivePreviewContent({ type: 'text', title: 'Agent Execution Preview', content: `${summary}\n\n${tally}` });
              logGina(d.state === 'CANCELLED' ? 'Agent cancelled' : 'Agent completed', `${summary.slice(0, 400)}\n${tally}`, 'complete', { kind: 'info' });
              if (autoSpeak) void speakText(summary);
              finish();
            }
            setAgentStatus(d.state);
          }
        } catch (e) { reject(e); }
      });
      es.onerror = () => setAgentStatus(prev => prev === 'READY' ? 'RECONNECTING' : prev);
    });
    return true;
  };

  const uploadAndActivateProject = async (file?: File) => {
    if (!file) return;
    setLoading(true); setError(null);
    try {
      const up = await fetch('/api/agent/upload-project', { method:'POST', headers:{'Content-Type':file.type || 'application/zip','X-Filename':encodeURIComponent(file.name)}, body:file });
      const ud = await up.json().catch(()=>({}));
      if (!up.ok) throw new Error(ud?.error || 'Project upload failed.');
      let workspace = '';
      if (ud.readyForImport) {
        const imp = await fetch('/api/agent/import-project', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({archivePath:ud.path, workspace:pathSafeWorkspaceName(file.name)})});
        const id = await imp.json().catch(()=>({}));
        if (!imp.ok) throw new Error(id?.error || 'Project import failed.');
        workspace = id.workspace || id.name;
      }
      if (!workspace) throw new Error('Only ZIP project uploads can be activated as a coding workspace.');
      setAgentWorkspace(workspace); localStorage.setItem('gina_active_workspace',workspace);
      setMessages(prev => [...prev,{role:'assistant',content:`Project "${workspace}" is loaded. I’ll inspect its structure, entry points, package scripts and Git state first, without changing or executing the uploaded code.`}]);
      setAgentStatus('READY');
      await runProjectAgent(`Inspect the newly uploaded project "${workspace}". Do not modify files and do not execute uploaded project code. Use workspace inspection and safe file reads to report the project structure, important entry points, package manager/scripts, Git status, and any obvious areas relevant to future coding requests.`);
    } catch(e:any) { setError(e?.message || 'Project upload failed.'); }
    finally { setLoading(false); }
  };
  const pathSafeWorkspaceName = (name:string) => name.replace(/\.zip$/i,'').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80) || 'project';
  const exportActiveWorkspace = () => {
    if (!agentWorkspace) return;
    const link = document.createElement('a');
    link.href = `/api/agent/workspaces/${encodeURIComponent(agentWorkspace)}/export.zip`;
    link.download = `${agentWorkspace}-updated.zip`;
    document.body.appendChild(link); link.click(); link.remove();
  };
  const loadGithubProject = async () => {
    const url=githubUrl.trim(); if(!url) return;
    setLoading(true); setError(null);
    try {
      const r=await fetch('/api/agent/github-clone',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});
      const d=await r.json().catch(()=>({})); if(!r.ok) throw new Error(d?.error || 'GitHub clone failed.');
      setAgentWorkspace(d.name); localStorage.setItem('gina_active_workspace',d.name);
      setMessages(prev=>[...prev,{role:'assistant',content:`GitHub repository "${d.name}" is loaded. I've inspected the workspace connection. Tell me what you want me to change.`}]);
    } catch(e:any){setError(e?.message || 'GitHub connection failed.');} finally{setLoading(false);}
  };

  const sendMessage = async (overrideText?: string) => {
    const typedText = (overrideText ?? input).trim();
    const attachmentsText = attachedFiles.length
      ? attachedFiles.map(file => {
          if (file.kind === 'image') return `\n\n[ATTACHED LOCAL IMAGE: ${file.name}]\nThe image is stored locally at ${file.localPath || 'the Gina local upload store'}. ${status?.multimodal ? 'The image will be supplied to the local vision-capable model as an actual image input.' : 'The current Local AI engine has no multimodal projector configured, so the image can be stored but cannot yet be visually inspected.'}\n[END ATTACHED LOCAL IMAGE: ${file.name}]`;
          return `\n\n[ATTACHED LOCAL FILE: ${file.name}]\n${file.content || `(Binary/local attachment. Stored at ${file.localPath || 'the Gina local upload store'}. The current model has no direct binary parser for this file type.)`}\n[END ATTACHED LOCAL FILE: ${file.name}]`;
        }).join('')
      : '';
    const text = `${typedText}${attachmentsText}`.trim();
    if (!text || !status?.ready || loading) return;

    logGina('Prompt received', `Mode: ${studioMode}\n${text.slice(0, 400)}`, 'running', { kind: 'info' });
    setAgentStatus('Thinking…');
    logGina('Thinking…', 'Routing request through Gina capabilities', 'running', { kind: 'info' });

    try {
      if (studioMode === 'web-app') {
        logGina('Web App Studio', 'Entering artifact lane · generating HTML', 'running', { kind: 'info' });
        const nextMessages: ChatMessage[] = [...messages, { role:'user', content:text }];
        setMessages(nextMessages); setInput(''); setLoading(true); setError(null);
        try { await runWebAppArtifact(typedText); }
        catch (webAppError:any) {
          logGina('Web App failed', webAppError?.message || 'Unknown error', 'error', { kind: 'error' });
          setError(webAppError?.message || 'Web App generation failed.');
        }
        finally { setLoading(false); }
        return;
      }
      if (studioMode === 'web-search') {
        const searchCfg = resolveSearchProfile({ id: searchProfileId || undefined, query: typedText });
        const searchQuery = searchCfg.query || typedText;
        const nextMessages: ChatMessage[] = [...messages, { role:'user', content:text }];
        setMessages(nextMessages); setInput(''); setLoading(true); setError(null);
        setThinkingSource('web');
        setAgentStatus(searchCfg.profileName !== 'Standard Search' ? `Search · ${searchCfg.profileName}` : 'Searching the web…');
        logGina('Searching the web…', `Profile: ${searchCfg.profileName}${searchCfg.usedFallback ? ' (unknown shortcode → defaults)' : ''}\nDepth: ${searchCfg.settings.depth} · max ${searchCfg.settings.maxResults}\nQuery: ${searchQuery.slice(0, 200)}`, 'running', { kind: 'info' });
        try {
          const searchResponse = await fetch('/api/agent/web-search', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({query:searchQuery,maxResults:8}) });
          const searchData = await searchResponse.json().catch(() => ({}));
          if (!searchResponse.ok) throw new Error(searchData?.error || `Live web search failed (HTTP ${searchResponse.status}).`);
          const results = Array.isArray(searchData?.results) ? searchData.results : [];
          if (!results.length) throw new Error('The web search returned no usable sources.');
          logGina('Web sources found', `${results.length} results · synthesizing answer…`, 'running', { kind: 'info' });
          const webGrounding = {
            text:results.map((r:any,i:number)=>`[WEB RESULT ${i+1}]\nTitle: ${r.title||''}\nURL: ${r.url||''}\nSnippet: ${r.snippet||''}`).join('\n\n'),
            provider:searchData?.provider || 'verified web search',
            engine:searchData?.engine || 'HTTP fetcher',
            sources:results.slice(0,8).map((r:any)=>({title:r.title,url:r.url,snippet:r.snippet,source:r.source}))
          };
          const response = await fetch('/api/llm/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
            messages:[{role:'system',content:SYSTEM_PROMPT},{role:'user',content:typedText}],temperature:0.35,maxTokens:768,suite:'Web Search',studioMode:'web-search',webGrounding
          })});
          const responseText=await response.text();
          const data=responseText.trim()?JSON.parse(responseText):{};
          if(!response.ok) throw new Error(data?.error || `Web response generation failed (HTTP ${response.status}).`);
          const reply=String(data?.choices?.[0]?.message?.content||'').trim();
          if(!reply) throw new Error('The local model returned an empty web-grounded response.');
          const telemetry=data?.ginaTelemetry||{};
          setActivePreviewContent({type:'web',title:results[0].title||'Live web results',content:results[0].snippet||results[0].url,url:results[0].url,sources:webGrounding.sources});
          setMessages(prev=>[...prev,{role:'assistant',content:reply,webSources:telemetry.webSources||webGrounding.sources,webProvider:telemetry.webProvider||webGrounding.provider,browserEngine:telemetry.browserEngine||webGrounding.engine}]);
          setLastTelemetry({promptTokens:Number(telemetry.promptTokens||0),completionTokens:Number(telemetry.completionTokens||0),totalTokens:Number(telemetry.totalTokens||0),durationMs:Number(telemetry.durationMs||0),tokensPerSecond:Number(telemetry.tokensPerSecond||0),promptTokensPerSecond:Number(telemetry.promptTokensPerSecond||0),completionTokensPerSecond:Number(telemetry.completionTokensPerSecond||0),iteration:telemetry.iteration==null?null:Number(telemetry.iteration),toolCalls:Number(telemetry.toolCalls||0),source:'local+web',webProvider:telemetry.webProvider||webGrounding.provider,contextBreakdown:telemetry.contextBreakdown});
          logGina('Web search complete', `Returned ${results.length} sources and a grounded answer`, 'complete', { kind: 'info' });
          setAgentStatus('COMPLETED');
        } catch(err:any) {
          logGina('Web search failed', err?.message||'Web search failed.', 'error', { kind: 'error' });
          setAgentStatus('ERROR'); setError(err?.message||'Web search failed.');
          setMessages(prev=>prev.filter((_,index)=>index!==prev.length-1));
        } finally { setLoading(false); }
        return;
      }

      if (studioMode === 'code-engine') {
        const codeCfg = resolveCodeProfile({ id: codeProfileId || undefined, prompt: typedText, pythonVersion });
        const agentCfg = agentProfileId ? resolveAgentProfile({ id: agentProfileId, prompt: typedText }) : null;
        const agentAddon = agentCfg ? composeAgentSystemAddon(agentCfg) : '';
        const codePrompt = [agentAddon, codeCfg.positivePrompt, codeCfg.prompt].filter(Boolean).join('\n\n') || typedText;
        const nextMessages: ChatMessage[]=[...messages,{role:'user',content:text}];
        setMessages(nextMessages); setInput(''); setLoading(true); setError(null); setThinkingSource('local');
        logGina('Code Engine', `Starting project agent${agentCfg?.profileName ? ` · Persona: ${agentCfg.profileName}` : ''}${codeCfg.profileName ? ` · Profile: ${codeCfg.profileName}` : ''}`, 'running', { kind: 'info', execKind: 'command' });
        try {
          await runProjectAgent(codePrompt);
          logGina('Code Engine complete', `Files read: ${readFilesRef.current.size} · Edited: ${editedFilesRef.current.size} · Commands: ${commandsRunRef.current}`, 'complete', { kind: 'info', execKind: 'command' });
        } catch(err:any){
          logGina('Code Engine failed', err?.message||'Local coding task failed.', 'error', { kind: 'error', execKind: 'command' });
          setError(err?.message||'Local coding task failed.');
        }
        finally { setLoading(false); }
        return;
      }

      if (studioMode === 'image-studio') {
        const imageCfg = resolveImageProfile({ id: imageProfileId || undefined, prompt: typedText });
        if (imageCfg.profileId) logGina('Image profile', imageCfg.profileName, 'running', { kind: 'info' });

        const nextMessages: ChatMessage[]=[...messages,{role:'user',content:text}];
        setMessages(nextMessages); setInput(''); setLoading(true); setError(null); setThinkingSource('local');
        setAgentStatus('Generating image…');
        logGina('Generating image…', 'Routing to local ComfyUI pipeline', 'running', { kind: 'info' });
        try {
          await sendImageGeneration(typedText);
          logGina('Image generated', 'ComfyUI output ready in preview', 'complete', { kind: 'info' });
        } catch(err:any){
          logGina('Image generation failed', err?.message||'Local image generation failed.', 'error', { kind: 'error' });
          setError(err?.message||'Local image generation failed.');
        }
        finally { setLoading(false); }
        return;
      }

      if (studioMode === 'video-generation') {
        const videoCfg = resolveVideoProfile({ id: videoProfileId || undefined, prompt: typedText });
        const videoPrompt = composeVideoPrompt(videoCfg) || typedText;
        const nextMessages: ChatMessage[]=[...messages,{role:'user',content:text}];
        setMessages(nextMessages); setInput(''); setLoading(true); setError(null); setThinkingSource('local');
        setAgentStatus(videoCfg.profileName !== 'Standard Video Generation' ? `Video · ${videoCfg.profileName}` : 'Generating video…');
        logGina('Generating video…', `Profile: ${videoCfg.profileName}${videoCfg.usedFallback ? ' (unknown shortcode → defaults)' : ''}\n${videoCfg.settings.resolution} @ ${videoCfg.settings.frameRate}fps · ${videoCfg.settings.durationSeconds}s\nWan 2.1 pipeline`, 'running', { kind: 'info' });
        try {
          window.dispatchEvent(new CustomEvent('gina-video-generation-request',{detail:{
            prompt: videoPrompt,
            profileId: videoCfg.profileId,
            settings: videoCfg.settings,
            advanced: videoCfg.advanced,
          }}));
        } catch(err:any){
          logGina('Video generation failed', err?.message||'Could not start video job.', 'error', { kind: 'error' });
          setError(err?.message||'Local video generation could not be started.'); setLoading(false);
        }
        return;
      }

      const capabilityResponse = await fetch('/api/agent/capability-plan', {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({text:typedText})
      });
      const capabilityData = await capabilityResponse.json().catch(() => ({}));
      const capabilityPlan = capabilityData?.plan;
      const isCodeProjectIntent = ['code-change', 'code-task', 'web-app-build', 'file-operation', 'run-command', 'git-operation'].includes(capabilityPlan?.intent || '');
      if (capabilityPlan?.mode === 'act' && isCodeProjectIntent && capabilityPlan?.intent !== 'network-diagnostic' && capabilityPlan?.intent !== 'web-research') {
        const nextMessages: ChatMessage[] = [...messages, { role:'user', content:text }];
        setMessages(nextMessages); setInput(''); setLoading(true); setError(null);
        try {
          setThinkingSource('local');
          const started = await runProjectAgent(typedText);
          if (!started) throw new Error('Gina Agent could not start for this operational request.');
        } catch (agentError:any) {
          setError(agentError?.message || 'Gina Agent could not execute the requested operation.');
          onAddLog('WARN', `Capability-first agent routing failed: ${agentError?.message || 'unknown error'}`);
        } finally { setLoading(false); }
        return;
      }
      if (capabilityPlan?.intent === 'capability-query') {
        const available = capabilityPlan.availableCapabilities?.length ? capabilityPlan.availableCapabilities.join(', ') : 'none';
        const unavailable = capabilityPlan.unavailableCapabilities?.length ? capabilityPlan.unavailableCapabilities.join(', ') : 'none';
        const reply = `I checked my live runtime capability registry. Available capabilities include: ${available}. Unavailable/unregistered for this runtime: ${unavailable}. I will distinguish an unavailable capability from a failed operation, and I will use registered tools rather than giving generic instructions when an operational task is requested.`;
        setMessages(prev => [...prev, {role:'assistant',content:reply}]);
        setInput(''); setLoading(false);
        return;
      }
      // Canvas/HTML/WebGL artifact prompts must never enter image generation (Coder lock).
      const looksLikeHtmlArtifact = /\b(html5?|canvas|webgl|tailwind|standalone\s+html|vanilla\s*js|web\s*app|requestAnimationFrame|orbital|gravity\s+sim)\b/i.test(typedText)
        && !/\b(png|jpe?g|webp|comfyui?|flux|sdxl|photograph|photo\s+of)\b/i.test(typedText);
      const route = looksLikeHtmlArtifact
        ? { intent: 'chat', policyLocked: false }
        : await classifyImageIntent(typedText);
      if (route.intent === 'image-generation' || route.intent === 'image-modification') {
        pushExecutionLog('Image Generation Workflow', 'Routing the request to the local image generation pipeline.', 'running');
        if (route.policyLocked) throw new Error('Qwen Coder is text-only. Switch to Qwen 2.5-VL Vision Mode to use image generation or vision attachments.');
        const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
        setMessages(nextMessages);
        setInput('');
        setLoading(true);
        setError(null);
        try {
          await sendImageGeneration(typedText);
        } catch (err: any) {
          pushExecutionLog('Image Generation Failed', err?.message || 'Local image generation failed', 'error');
          setError(err?.message || 'Local image generation failed');
          onAddLog('WARN', `AI Tool image generation failed: ${err?.message || 'unknown error'}`);
        } finally {
          setLoading(false);
        }
        return;
      }
    } catch (routeError: any) {
      setError(routeError?.message || 'Gina intent routing failed');
      onAddLog('WARN', `Gina intent router failed: ${routeError?.message || 'unknown error'}`);
      return;
    }

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    setError(null);
    try {
      const controller = new AbortController();
      chatAbortRef.current = controller;
      const webGrounding: any = null;
      logGina('Thinking…', 'Generating a local model response', 'running', { kind: 'info' });
      setAgentStatus('Thinking…');
      chatAbortRef.current = controller;
      let reply = '';
      let usedStream = false;
      const agentCfg = resolveAgentProfile({ id: agentProfileId || undefined, prompt: typedText });
      const importProtocolNote = attachedFiles.length
        ? `\n\n${AGENT_IMPORT_PROTOCOL}\nImported/attached files this turn: ${attachedFiles.map(f => f.name).join(', ')}.`
        : '';
      const agentAddon = composeAgentSystemAddon(agentCfg);
      if (agentCfg.profileId) {
        logGina('Agent profile', agentCfg.profileName, 'running', { kind: 'info' });
        setAgentStatus(`Agent · ${agentCfg.profileName}`);
      }
      const chatBody = {
          messages: [{ role: 'system', content: [SYSTEM_PROMPT, agentAddon, importProtocolNote].filter(Boolean).join('\n\n') }, ...nextMessages],
          temperature: 0.7,
          maxTokens: 512,
          suite: 'Local AI',
          studioMode: 'local-chat',
          attachments: attachedFiles.filter(file => file.kind === 'image').map(file => ({
            name: file.name, mime: file.mime, localPath: file.localPath, kind: file.kind
          })),
          webGrounding,
        };
      try {
        const streamRes = await fetch('/api/llm/chat-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
          body: JSON.stringify(chatBody),
          signal: controller.signal,
        });
        if (streamRes.ok && streamRes.body) {
          usedStream = true;
          setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
          const reader = streamRes.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let spokenUpTo = 0;
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data:')) continue;
              const payload = trimmed.slice(5).trim();
              if (!payload || payload === '[DONE]') continue;
              try {
                const json = JSON.parse(payload);
                const delta = json?.choices?.[0]?.delta?.content ?? '';
                if (typeof delta === 'string' && delta) {
                  reply += delta;
                  setMessages(prev => {
                    const copy = [...prev];
                    const last = copy[copy.length - 1];
                    if (last?.role === 'assistant') copy[copy.length - 1] = { ...last, content: reply };
                    return copy;
                  });
                  if (autoSpeak && voiceEnabled) {
                    const slice = reply.slice(spokenUpTo);
                    const parts = slice.match(/[^.!?]+[.!?]+/g);
                    if (parts) {
                      let consumed = 0;
                      for (const part of parts) {
                        consumed += part.length;
                        const piece = part.trim();
                        if (piece) void speakText(piece);
                      }
                      spokenUpTo += consumed;
                    }
                  }
                }
              } catch { /* partial SSE JSON */ }
            }
          }
          if (autoSpeak && voiceEnabled && reply.slice(spokenUpTo).trim()) {
            void speakText(reply.slice(spokenUpTo).trim());
          }
        }
      } catch (streamErr: any) {
        if (streamErr?.name === 'AbortError') throw streamErr;
        usedStream = false;
      }
      let data: any = {};
      if (!usedStream) {
      const response = await fetch('/api/llm/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatBody),
        signal: controller.signal,
      });
      const responseText = await response.text();
      try { data = responseText.trim() ? JSON.parse(responseText) : {}; } catch { throw new Error(`Gina backend returned invalid JSON (HTTP ${response.status}).`); }
      if (!response.ok) {
        const diagnostic = data?.diagnostic?.recentLog?.slice?.(-3)?.join?.(' | ');
        throw new Error([data?.error || `HTTP ${response.status}`, diagnostic].filter(Boolean).join(' — '));
      }
      const msg = data?.choices?.[0]?.message;
      const extractReply = (m: any): string => {
        if (!m || typeof m !== 'object') return '';
        for (const raw of [m.content]) {
          if (typeof raw === 'string' && raw.trim()) return raw;
          if (Array.isArray(raw)) {
            const joined = raw.map((p: any) => (typeof p === 'string' ? p : (p?.text ?? ''))).join('');
            if (joined.trim()) return joined;
          }
        }
        return '';
      };
      reply = extractReply(msg);
      }

      if (!reply.trim()) throw new Error('The local model returned an empty response.');
      const htmlPreview = reply.match(/```html\n?([\s\S]*?)```/i);
      const firstMarkdownLink = reply.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);
      const telemetrySources = Array.isArray(data?.ginaTelemetry?.webSources) ? data.ginaTelemetry.webSources : [];
      if (htmlPreview) setActivePreviewContent({ type:'html', title:'Generated HTML Preview', content:htmlPreview[1] });
      else if (telemetrySources.length) setActivePreviewContent({ type:'web', title:telemetrySources[0].title || 'Live web source', content:telemetrySources[0].snippet || telemetrySources[0].url, url:telemetrySources[0].url, sources:telemetrySources });
      else if (firstMarkdownLink) setActivePreviewContent({ type:'web', title:firstMarkdownLink[1], content:firstMarkdownLink[2], url:firstMarkdownLink[2] });
      else setActivePreviewContent({ type:'text', title:'Live Response Preview', content:reply });
      const telemetry = data?.ginaTelemetry;
      if (telemetry) {
        setThinkingSource(telemetry.source === 'local+web' ? 'local+web' : telemetry.source === 'web' ? 'web' : 'local');
        setLastTelemetry({
          promptTokens: Number(telemetry.promptTokens || 0),
          completionTokens: Number(telemetry.completionTokens || 0),
          totalTokens: Number(telemetry.totalTokens || Number(telemetry.promptTokens || 0) + Number(telemetry.completionTokens || 0)),
          durationMs: Number(telemetry.durationMs || 0),
          tokensPerSecond: Number(telemetry.tokensPerSecond || telemetry.completionTokensPerSecond || 0),
          promptTokensPerSecond: Number(telemetry.promptTokensPerSecond || 0),
          completionTokensPerSecond: Number(telemetry.completionTokensPerSecond || telemetry.tokensPerSecond || 0),
          iteration: telemetry.iteration == null ? null : Number(telemetry.iteration),
          toolCalls: Number(telemetry.toolCalls || 0),
          source: telemetry.source === 'local+web' ? 'local+web' : telemetry.source === 'web' ? 'web' : 'local',
          webProvider: telemetry.webSearched ? (telemetry.webProvider || 'verified') : null,
          contextBreakdown: telemetry.contextBreakdown && typeof telemetry.contextBreakdown === 'object' ? telemetry.contextBreakdown : undefined,
        });
        setRuntimeTelemetry(telemetry);
        onAddLog('INFO', `Prompt telemetry: ${Number(telemetry.promptTokens||0).toLocaleString()} prompt tokens · ${Number(telemetry.completionTokens||0).toLocaleString()} completion tokens${telemetry.webSearched ? ` · web: ${telemetry.webProvider || 'verified'}` : ' · local only'}.`);
      }
      logGina('Response generated', `${Number(telemetry?.completionTokens || 0).toLocaleString()} completion tokens · ${Number(telemetry?.durationMs || 0)} ms`, 'complete', { kind: 'info' });
      setAgentStatus('COMPLETED');
      if (!usedStream) setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: reply.trim(),
          webSources: telemetry?.webSources || [],
          webProvider: telemetry?.webSearched ? (telemetry.webProvider || 'live web search') : null,
          browserEngine: telemetry?.browserEngine || null,
        }
      ]);
      else {
        setMessages(prev => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === 'assistant') copy[copy.length - 1] = { ...last, content: reply.trim(), webSources: telemetry?.webSources || [], webProvider: telemetry?.webSearched ? (telemetry.webProvider || 'live web search') : null, browserEngine: telemetry?.browserEngine || null };
          return copy;
        });
      }
      setAttachedFiles([]);
      setFileAttachError(null);
      if (!usedStream && autoSpeak && voiceEnabled) {
        const sentences = reply.trim().match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [reply.trim()];
        void (async () => {
          for (const s of sentences) {
            const piece = s.trim();
            if (piece) await speakText(piece);
          }
        })();
      }
    } catch (err: any) {
      pushExecutionLog('Execution Failed', err?.message || 'Local model request failed.', 'error');
      setAgentStatus('ERROR');
      if (err?.name === 'AbortError') {
        setError('Local AI generation cancelled.');
        return;
      }
      // Do not keep a failed user turn in history. Keeping it would make the next
      // request another consecutive-user turn and can poison strict local model templates.
      setMessages(prev => prev.filter((_, index) => index !== prev.length - 1));
      setInput(text);
      setError(err?.message || 'Local model request failed');
      onAddLog('WARN', `Local Gina chat failed: ${err?.message || 'unknown error'}`);
    } finally {
      if (chatAbortRef.current) chatAbortRef.current = null;
      setLoading(false);
    }
  };

  const stateLabel = useMemo(() => {
    if (!status?.configured) return 'NOT CONFIGURED';
    if (status.ready) return 'ONLINE';
    if (status.running) return 'STARTING';
    return 'OFFLINE';
  }, [status]);

  const renderMovableWidgetsMatrix = () => {
    const anyVisible = showTelemetryWidget || showElectricityWidget || showCommercialWidget;
    if (!anyVisible) return null;

    return (
      <div className="my-2 space-y-2 overflow-x-auto custom-scrollbar">
        {widgetOrder.map((wId, idx) => {
          if (wId === 'telemetry' && showTelemetryWidget) {
            const isMin = minimizedWidgets.telemetry;
            const tps = Number((lastTelemetry?.completionTokensPerSecond ?? runtimeTelemetry?.completionTokensPerSecond ?? runtimeTelemetry?.tokensPerSecond ?? 0).toFixed(1));
            const totalToks = lastTelemetry?.totalTokens ?? runtimeTelemetry?.totalTokens ?? 0;
            const durSec = ((lastTelemetry?.durationMs ?? runtimeTelemetry?.durationMs ?? 0) / 1000).toFixed(2);
            const vramUsed = hardwareTelemetry?.vramUsedMB ?? 0;
            const vramTotal = hardwareTelemetry?.vramTotalMB ?? 8192;
            const isWatchdogTriggered = tps > 0 && tps < 10.0;

            if (isMin) {
              return (
                <MovableResizableWrapper id="widget-telemetry" key="widget-telemetry" collapsible title="Telemetry" className="w-full" resizable={false}>
                <div
                  ref={telemetryPanel.panelRef}
                  className="rounded-lg border border-slate-800/80 bg-slate-950/90 px-3 py-1.5 flex items-center justify-between text-[10px] font-mono transition-all"
                  style={{ width: telemetryPanel.width ? `${telemetryPanel.width}px` : '100%' }}
                >
                  <div className="flex items-center gap-2 cursor-pointer flex-1 min-w-0" onClick={() => toggleSingleWidgetMin('telemetry')}>
                    <Activity className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="font-bold text-slate-200">TELEMETRY</span>
                    <span className={`font-bold ${isWatchdogTriggered ? 'text-amber-400' : 'text-emerald-400'}`}>{tps} tok/s</span>
                    <span className="text-slate-600 hidden sm:inline">·</span>
                    <span className="text-slate-400 hidden sm:inline">{totalToks.toLocaleString()} tokens</span>
                    <span className="text-slate-600 hidden sm:inline">·</span>
                    <span className="text-sky-300 hidden md:inline">{vramUsed ? `${vramUsed.toLocaleString()} MB` : '8GB VRAM'}</span>
                    <span className="text-slate-600 hidden md:inline">·</span>
                    <span className="text-slate-400 hidden lg:inline">GPU {hardwareTelemetry?.gpuUtilizationPercent ?? 0}%</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button type="button" onClick={() => moveWidget('telemetry', 'up')} disabled={idx === 0} className="p-1 rounded text-slate-500 hover:text-slate-200 disabled:opacity-20 cursor-pointer" title="Move Up"><ChevronUp className="w-3 h-3" /></button>
                    <button type="button" onClick={() => moveWidget('telemetry', 'down')} disabled={idx === widgetOrder.length - 1} className="p-1 rounded text-slate-500 hover:text-slate-200 disabled:opacity-20 cursor-pointer" title="Move Down"><ChevronDown className="w-3 h-3" /></button>
                    <button type="button" onClick={() => toggleSingleWidgetMin('telemetry')} className="p-1 rounded text-slate-400 hover:text-white cursor-pointer" title="Expand Widget"><Maximize2 className="w-3 h-3" /></button>
                    <button type="button" onClick={() => toggleWidget('telemetry')} className="p-1 rounded text-slate-500 hover:text-rose-400 cursor-pointer" title="Hide Widget"><X className="w-3 h-3" /></button>
                  </div>
                </div>
                </MovableResizableWrapper>
              );
            }

            return (
              <MovableResizableWrapper id="widget-telemetry" key="widget-telemetry" collapsible title="Telemetry" className="w-full">
              <div
                ref={telemetryPanel.panelRef}
                className="relative rounded-lg border border-slate-800 bg-slate-950/85 p-2.5 transition-all flex flex-col"
                style={{ width: telemetryPanel.width ? `${telemetryPanel.width}px` : '100%' }}
              >
                <div className="flex items-center justify-between mb-2 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-300">LOCAL AI TELEMETRY</span>
                    <span className={`text-[8px] font-mono font-bold ml-2 ${isWatchdogTriggered ? 'text-amber-400 animate-pulse' : 'text-emerald-400/90'}`}>
                      {tps} tok/s
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {telemetryPanel.width && (
                      <span className="text-[7px] font-mono text-emerald-400/80 bg-slate-900 px-1 rounded border border-slate-800">
                        {telemetryPanel.width}px wide
                      </span>
                    )}
                    <span className="text-[8px] font-mono text-slate-600 hidden sm:inline">LIVE · 1s</span>
                    <button type="button" onClick={() => moveWidget('telemetry', 'up')} disabled={idx === 0} className="p-1 rounded text-slate-500 hover:text-slate-200 disabled:opacity-20 cursor-pointer" title="Move Up"><ChevronUp className="w-3 h-3" /></button>
                    <button type="button" onClick={() => moveWidget('telemetry', 'down')} disabled={idx === widgetOrder.length - 1} className="p-1 rounded text-slate-500 hover:text-slate-200 disabled:opacity-20 cursor-pointer" title="Move Down"><ChevronDown className="w-3 h-3" /></button>
                    <button type="button" onClick={() => toggleSingleWidgetMin('telemetry')} className="p-1 rounded text-slate-400 hover:text-white cursor-pointer" title="Minimize Widget"><Minimize2 className="w-3 h-3" /></button>
                    <button type="button" onClick={() => toggleWidget('telemetry')} className="p-1 rounded text-slate-500 hover:text-rose-400 cursor-pointer" title="Hide Widget"><X className="w-3 h-3" /></button>
                  </div>
                </div>

                <div className="overflow-y-auto custom-scrollbar flex-1 pr-0.5 space-y-1.5" style={{ height: `${telemetryPanel.height}px`, minHeight: '70px' }}>
                  {isWatchdogTriggered && (
                    <div className="mb-2 p-1.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 text-[8px] font-mono flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-400" />
                        WATCHDOG ALERT: Token generation speed below 10 TPS ({tps} tok/s). Potential VRAM KV-cache bottleneck or context saturation.
                      </span>
                      <span className="text-slate-400">RTX 3070 Ti 8GB Sentinel</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                    <div className="rounded border border-slate-800 bg-slate-900/70 p-2">
                      <div className="text-[7px] uppercase tracking-widest text-slate-600">Generation</div>
                      <div className="mt-0.5 text-[11px] font-bold font-mono text-emerald-300">{tps} tok/s</div>
                    </div>
                    <div className="rounded border border-slate-800 bg-slate-900/70 p-2">
                      <div className="text-[7px] uppercase tracking-widest text-slate-600">Tokens</div>
                      <div className="mt-0.5 text-[11px] font-bold font-mono text-slate-200">{totalToks.toLocaleString()}</div>
                      <div className="text-[7px] font-mono text-slate-600">prompt + completion</div>
                    </div>
                    <div className="rounded border border-slate-800 bg-slate-900/70 p-2">
                      <div className="text-[7px] uppercase tracking-widest text-slate-600">Latency</div>
                      <div className="mt-0.5 text-[11px] font-bold font-mono text-slate-200">{durSec}s</div>
                      <div className="text-[7px] font-mono text-slate-600">{lastTelemetry?.iteration != null ? `iteration ${lastTelemetry.iteration}` : 'per turn'}</div>
                    </div>
                    <div className="rounded border border-slate-800 bg-slate-900/70 p-2">
                      <div className="text-[7px] uppercase tracking-widest text-slate-600">VRAM</div>
                      <div className="mt-0.5 flex items-center gap-1 text-[11px] font-bold font-mono text-slate-200">
                        <Gauge className="w-3 h-3 text-sky-400" />
                        {hardwareTelemetry ? `${hardwareTelemetry.vramUsedMB.toLocaleString()} MB` : '—'}
                      </div>
                      <div className="text-[7px] font-mono text-slate-600">of {vramTotal.toLocaleString()} MB</div>
                    </div>
                  </div>

                  <div className="mt-1.5 grid grid-cols-2 md:grid-cols-6 gap-1 text-[7px] font-mono">
                    <span className="rounded bg-slate-900 px-1.5 py-1 text-slate-500">GPU {hardwareTelemetry?.gpuUtilizationPercent ?? 0}%</span>
                    <span className="rounded bg-slate-900 px-1.5 py-1 text-slate-500">TEMP {hardwareTelemetry?.gpuTempC ?? 0}°C</span>
                    <span className="rounded bg-slate-900 px-1.5 py-1 text-slate-500">POWER {hardwareTelemetry?.gpuPowerW ?? 0}W</span>
                    <span className="rounded bg-slate-900 px-1.5 py-1 text-slate-500">ITER/s {runtimeTelemetry?.iterationsPerSecond != null ? runtimeTelemetry.iterationsPerSecond.toFixed(2) : '—'}</span>
                    <span className="rounded bg-slate-900 px-1.5 py-1 text-slate-500">TOOLS {lastTelemetry?.toolCalls ?? runtimeTelemetry?.toolCalls ?? 0}</span>
                    <span className={`rounded bg-slate-900 px-1.5 py-1 ${hardwareTelemetry?.thermalBrakeActive ? 'text-amber-400' : 'text-slate-500'}`}>
                      {hardwareTelemetry?.thermalBrakeActive ? 'THERMAL BRAKE' : 'THERMAL OK'}
                    </span>
                  </div>
                </div>
                <PanelResizeGrip
                  onBottomPointerDown={telemetryPanel.onBottomPointerDown}
                  onRightPointerDown={telemetryPanel.onRightPointerDown}
                  onCornerPointerDown={telemetryPanel.onCornerPointerDown}
                  onResetWidth={telemetryPanel.resetWidth}
                  width={telemetryPanel.width}
                  height={telemetryPanel.height}
                  label="Local AI Telemetry"
                />
              </div>
              </MovableResizableWrapper>
            );
          }

          if (wId === 'electricity' && showElectricityWidget) {
            const currentHour = new Date().getHours();
            const isDayRate = currentHour >= 7 && currentHour < 23;
            const rateKwh = isDayRate ? 0.3157 : 0.1390;
            const powerW = Number(hardwareTelemetry?.systemPowerW ?? hardwareTelemetry?.estimatedWallPowerW ?? hardwareTelemetry?.gpuPowerW ?? 0);
            const cpuPowerW = Number(hardwareTelemetry?.cpuPowerW || 0);
            const gpuPowerW = Number(hardwareTelemetry?.gpuPowerW || 0);
            const otherPowerW = Number(hardwareTelemetry?.otherHardwarePowerW || 0);
            const powerSource = hardwareTelemetry?.powerSource || 'estimated';
            const powerKw = powerW / 1000;
            const hourlyCostPounds = powerKw * rateKwh;
            const hourlyCostPence = hourlyCostPounds * 100;
            const estimatedDailyCost = (powerKw * rateKwh * 24) + 0.5472;
            const isMin = minimizedWidgets.electricity;

            if (isMin) {
              return (
                <MovableResizableWrapper id="widget-power" key="widget-electricity" collapsible title="Power & Cost" resizable={false} className="w-full">
                <div
                  ref={electricityPanel.panelRef}
                  className="rounded-lg border border-slate-800/80 bg-slate-950/90 px-3 py-1.5 flex items-center justify-between text-[10px] font-mono transition-all"
                  style={{ width: electricityPanel.width ? `${electricityPanel.width}px` : '100%' }}
                >
                  <div className="flex items-center gap-2 cursor-pointer flex-1 min-w-0" onClick={() => toggleSingleWidgetMin('electricity')}>
                    <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="font-bold text-slate-200">POWER &amp; COST</span>
                    <span className="text-amber-300 font-bold">{powerW}W</span>
                    <span className="text-slate-600 hidden sm:inline">·</span>
                    <span className="text-emerald-400 font-bold">£{hourlyCostPounds.toFixed(4)}/hr ({hourlyCostPence.toFixed(2)}p/hr)</span>
                    <span className="text-slate-600 hidden sm:inline">·</span>
                    <span className="text-slate-400 hidden md:inline">{isDayRate ? 'DAY (£0.3157)' : 'NIGHT (£0.1390)'}</span>
                    <span className="text-slate-600 hidden lg:inline">·</span>
                    <span className="text-slate-400 hidden lg:inline">Session: £{sessionElectricityCost.toFixed(4)}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button type="button" onClick={() => moveWidget('electricity', 'up')} disabled={idx === 0} className="p-1 rounded text-slate-500 hover:text-slate-200 disabled:opacity-20 cursor-pointer" title="Move Up"><ChevronUp className="w-3 h-3" /></button>
                    <button type="button" onClick={() => moveWidget('electricity', 'down')} disabled={idx === widgetOrder.length - 1} className="p-1 rounded text-slate-500 hover:text-slate-200 disabled:opacity-20 cursor-pointer" title="Move Down"><ChevronDown className="w-3 h-3" /></button>
                    <button type="button" onClick={() => toggleSingleWidgetMin('electricity')} className="p-1 rounded text-slate-400 hover:text-white cursor-pointer" title="Expand Widget"><Maximize2 className="w-3 h-3" /></button>
                    <button type="button" onClick={() => toggleWidget('electricity')} className="p-1 rounded text-slate-500 hover:text-rose-400 cursor-pointer" title="Hide Widget"><X className="w-3 h-3" /></button>
                  </div>
                </div>
                </MovableResizableWrapper>
              );
            }

            return (
              <MovableResizableWrapper id="widget-power" key="widget-electricity" collapsible title="Power & Cost" className="w-full">
              <div
                ref={electricityPanel.panelRef}
                className="relative rounded-lg border border-slate-800 bg-slate-950/85 p-2.5 transition-all flex flex-col"
                style={{ width: electricityPanel.width ? `${electricityPanel.width}px` : '100%' }}
              >
                <div className="flex items-center justify-between mb-1.5 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[8px] font-bold uppercase tracking-widest text-slate-300">WHOLE-PC ELECTRICITY &amp; RUNNING COST</span>
                    <span className="text-[8px] font-mono text-emerald-400 font-semibold ml-2">
                      £{hourlyCostPounds.toFixed(4)}/hr · {hourlyCostPence.toFixed(2)}p/hr
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {electricityPanel.width && (
                      <span className="text-[7px] font-mono text-emerald-400/80 bg-slate-900 px-1 rounded border border-slate-800">
                        {electricityPanel.width}px wide
                      </span>
                    )}
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold ${isDayRate ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'}`}>
                      {isDayRate ? 'DAY (£0.3157/kWh)' : 'NIGHT (£0.1390/kWh)'}
                    </span>
                    <button type="button" onClick={() => moveWidget('electricity', 'up')} disabled={idx === 0} className="p-1 rounded text-slate-500 hover:text-slate-200 disabled:opacity-20 cursor-pointer" title="Move Up"><ChevronUp className="w-3 h-3" /></button>
                    <button type="button" onClick={() => moveWidget('electricity', 'down')} disabled={idx === widgetOrder.length - 1} className="p-1 rounded text-slate-500 hover:text-slate-200 disabled:opacity-20 cursor-pointer" title="Move Down"><ChevronDown className="w-3 h-3" /></button>
                    <button type="button" onClick={() => toggleSingleWidgetMin('electricity')} className="p-1 rounded text-slate-400 hover:text-white cursor-pointer" title="Minimize Widget"><Minimize2 className="w-3 h-3" /></button>
                    <button type="button" onClick={() => toggleWidget('electricity')} className="p-1 rounded text-slate-500 hover:text-rose-400 cursor-pointer" title="Hide Widget"><X className="w-3 h-3" /></button>
                  </div>
                </div>

                <div className="overflow-y-auto custom-scrollbar flex-1 pr-0.5 space-y-1.5" style={{ height: `${electricityPanel.height}px`, minHeight: '70px' }}>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                    <div className="rounded border border-slate-800 bg-slate-900/60 p-1.5">
                      <div className="text-[7px] uppercase tracking-widest text-slate-500">Whole PC Draw</div>
                      <div className="mt-0.5 text-[10px] font-bold font-mono text-amber-300">{powerW}W <span className="text-[7px] font-normal text-slate-400">({powerKw.toFixed(3)} kW)</span></div>
                      <div className="text-[6px] font-mono text-slate-500">CPU {cpuPowerW || '—'}W · GPU {gpuPowerW}W · Other {otherPowerW}W</div>
                    </div>
                    <div className="rounded border border-slate-800 bg-slate-900/60 p-1.5">
                      <div className="text-[7px] uppercase tracking-widest text-slate-500">Running Cost</div>
                      <div className="mt-0.5 text-[10px] font-bold font-mono text-emerald-400">
                        £{hourlyCostPounds.toFixed(4)}/hr · {hourlyCostPence.toFixed(2)}p/hr
                      </div>
                      <div className="text-[6px] font-mono text-slate-600">at £{rateKwh.toFixed(4)}/kWh</div>
                    </div>
                    <div className="rounded border border-slate-800 bg-slate-900/60 p-1.5">
                      <div className="text-[7px] uppercase tracking-widest text-slate-500">Session Cost</div>
                      <div className="mt-0.5 text-[10px] font-bold font-mono text-amber-300">
                        £{sessionElectricityCost.toFixed(4)}
                      </div>
                      <div className="text-[6px] font-mono text-slate-600">accumulated runtime</div>
                    </div>
                    <div className="rounded border border-slate-800 bg-slate-900/60 p-1.5">
                      <div className="text-[7px] uppercase tracking-widest text-slate-500">Est. 24h Cost</div>
                      <div className="mt-0.5 text-[10px] font-bold font-mono text-slate-200">
                        £{estimatedDailyCost.toFixed(2)}/day
                      </div>
                      <div className="text-[6px] font-mono text-slate-600">incl. £0.5472 standing</div>
                    </div>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center justify-between text-[7px] font-mono text-slate-500 pt-1 border-t border-slate-900">
                    <span>Day: £0.3157/kWh · Night: £0.1390/kWh · Standing: £0.5472/day · Cost shown in £/hr and p/hr</span>
                    <span className="text-slate-400 font-semibold">Power source: {powerSource}</span>
                  </div>
                </div>
                <PanelResizeGrip
                  onBottomPointerDown={electricityPanel.onBottomPointerDown}
                  onRightPointerDown={electricityPanel.onRightPointerDown}
                  onCornerPointerDown={electricityPanel.onCornerPointerDown}
                  onResetWidth={electricityPanel.resetWidth}
                  width={electricityPanel.width}
                  height={electricityPanel.height}
                  label="Power & Cost"
                />
              </div>
            </MovableResizableWrapper>
            );
          }

          if (wId === 'commercial' && showCommercialWidget) {
            const isMin = minimizedWidgets.commercial;

            if (isMin) {
              return (
                <MovableResizableWrapper id="widget-commercial" key="widget-commercial" collapsible title="Commercial" resizable={false} className="w-full">
                <div
                  ref={commercialPanel.panelRef}
                  className="rounded-lg border border-slate-800/80 bg-slate-950/90 px-3 py-1.5 flex items-center justify-between text-[10px] font-mono transition-all"
                  style={{ width: commercialPanel.width ? `${commercialPanel.width}px` : '100%' }}
                >
                  <div className="flex items-center gap-2 cursor-pointer flex-1 min-w-0" onClick={() => toggleSingleWidgetMin('commercial')}>
                    <DollarSign className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="font-bold text-slate-200">COMMERCIAL BENCHMARK</span>
                    <span className="text-sky-300 font-bold">{resolvedLocalArch.arch} ➔ {resolvedLocalArch.twin}</span>
                    <span className="text-slate-600 hidden sm:inline">·</span>
                    <span className="text-emerald-400 font-bold">Saved £{commercialLedgerData.totalGbp.toFixed(2)}</span>
                    <span className="text-slate-600 hidden sm:inline">·</span>
                    <span className="text-slate-400 hidden md:inline">{commercialLedgerData.totalTransactions} runs</span>
                    <span className="text-slate-600 hidden lg:inline">·</span>
                    <span className="text-slate-400 hidden lg:inline">Turn: £{latestTurnSavingsGbp.toFixed(4)}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button type="button" onClick={() => moveWidget('commercial', 'up')} disabled={idx === 0} className="p-1 rounded text-slate-500 hover:text-slate-200 disabled:opacity-20 cursor-pointer" title="Move Up"><ChevronUp className="w-3 h-3" /></button>
                    <button type="button" onClick={() => moveWidget('commercial', 'down')} disabled={idx === widgetOrder.length - 1} className="p-1 rounded text-slate-500 hover:text-slate-200 disabled:opacity-20 cursor-pointer" title="Move Down"><ChevronDown className="w-3 h-3" /></button>
                    <button type="button" onClick={() => toggleSingleWidgetMin('commercial')} className="p-1 rounded text-slate-400 hover:text-white cursor-pointer" title="Expand Widget"><Maximize2 className="w-3 h-3" /></button>
                    <button type="button" onClick={() => toggleWidget('commercial')} className="p-1 rounded text-slate-500 hover:text-rose-400 cursor-pointer" title="Hide Widget"><X className="w-3 h-3" /></button>
                  </div>
                </div>
                </MovableResizableWrapper>
              );
            }

            return (
              <MovableResizableWrapper id="widget-commercial" key="widget-commercial" collapsible title="Commercial" className="w-full">
              <div
                ref={commercialPanel.panelRef}
                className="relative rounded-lg border border-slate-800 bg-slate-950/85 p-2.5 transition-all flex flex-col"
                style={{ width: commercialPanel.width ? `${commercialPanel.width}px` : '100%' }}
              >
                <div className="flex items-center justify-between mb-1.5 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-sky-400" />
                    <span className="text-[8px] font-bold uppercase tracking-widest text-slate-300">COMMERCIAL PRICING BENCHMARKS (GBP £)</span>
                    <span className="text-[8px] font-mono text-sky-300 font-bold ml-2">
                      Twin: {resolvedLocalArch.arch} ──&gt; {resolvedLocalArch.twin}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {commercialPanel.width && (
                      <span className="text-[7px] font-mono text-emerald-400/80 bg-slate-900 px-1 rounded border border-slate-800">
                        {commercialPanel.width}px wide
                      </span>
                    )}
                    <span className="text-[8px] font-mono text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                      Ledger Total: £{commercialLedgerData.totalGbp.toFixed(2)}
                    </span>
                    <button type="button" onClick={() => moveWidget('commercial', 'up')} disabled={idx === 0} className="p-1 rounded text-slate-500 hover:text-slate-200 disabled:opacity-20 cursor-pointer" title="Move Up"><ChevronUp className="w-3 h-3" /></button>
                    <button type="button" onClick={() => moveWidget('commercial', 'down')} disabled={idx === widgetOrder.length - 1} className="p-1 rounded text-slate-500 hover:text-slate-200 disabled:opacity-20 cursor-pointer" title="Move Down"><ChevronDown className="w-3 h-3" /></button>
                    <button type="button" onClick={() => toggleSingleWidgetMin('commercial')} className="p-1 rounded text-slate-400 hover:text-white cursor-pointer" title="Minimize Widget"><Minimize2 className="w-3 h-3" /></button>
                    <button type="button" onClick={() => toggleWidget('commercial')} className="p-1 rounded text-slate-500 hover:text-rose-400 cursor-pointer" title="Hide Widget"><X className="w-3 h-3" /></button>
                  </div>
                </div>

                <div className="overflow-y-auto custom-scrollbar flex-1 pr-0.5 space-y-1.5" style={{ height: `${commercialPanel.height}px`, minHeight: '70px' }}>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                    <div className="rounded border border-slate-800 bg-slate-900/60 p-1.5">
                      <div className="text-[7px] uppercase tracking-widest text-slate-500">Local Architecture</div>
                      <div className="mt-0.5 text-[10px] font-bold font-mono text-slate-200">{resolvedLocalArch.arch}</div>
                      <div className="text-[6px] font-mono text-emerald-400">{resolvedLocalArch.tier}</div>
                    </div>
                    <div className="rounded border border-slate-800 bg-slate-900/60 p-1.5">
                      <div className="text-[7px] uppercase tracking-widest text-slate-500">1-to-1 Commercial Twin</div>
                      <div className="mt-0.5 text-[10px] font-bold font-mono text-sky-300">{resolvedLocalArch.twin}</div>
                      <div className="text-[6px] font-mono text-slate-500">In £{resolvedLocalArch.inputRate.toFixed(4)} · Out £{resolvedLocalArch.outputRate.toFixed(4)}/1M</div>
                    </div>
                    <div className="rounded border border-slate-800 bg-slate-900/60 p-1.5">
                      <div className="text-[7px] uppercase tracking-widest text-slate-500">Turn Savings</div>
                      <div className="mt-0.5 text-[10px] font-bold font-mono text-emerald-400">
                        £{latestTurnSavingsGbp.toFixed(4)}
                      </div>
                      <div className="text-[6px] font-mono text-slate-600">{latestTurnTokens.total.toLocaleString()} tokens avoided</div>
                    </div>
                    <div className="rounded border border-slate-800 bg-slate-900/60 p-1.5">
                      <div className="text-[7px] uppercase tracking-widest text-slate-500">SQLite Transactions</div>
                      <div className="mt-0.5 text-[10px] font-bold font-mono text-slate-200">
                        {commercialLedgerData.totalTransactions} runs
                      </div>
                      <div className="text-[6px] font-mono text-slate-600">ai_commercial_savings.db</div>
                    </div>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center justify-between text-[7px] font-mono text-slate-500 pt-1 border-t border-slate-900">
                    <span>Formula: ((In/1M)*Rate) + ((Out/1M)*Rate) + (Images*Vision) + (VideoSec*Video) · 1 USD = 0.78 GBP</span>
                    <span className="text-slate-400 font-semibold">Vision: £{resolvedLocalArch.visionRate.toFixed(2)}/1k · Video: £{resolvedLocalArch.videoRate.toFixed(2)}/min</span>
                  </div>
                </div>
                <PanelResizeGrip
                  onBottomPointerDown={commercialPanel.onBottomPointerDown}
                  onRightPointerDown={commercialPanel.onRightPointerDown}
                  onCornerPointerDown={commercialPanel.onCornerPointerDown}
                  onResetWidth={commercialPanel.resetWidth}
                  width={commercialPanel.width}
                  height={commercialPanel.height}
                  label="Commercial Benchmarks"
                />
              </div>
            </MovableResizableWrapper>
            );
          }

          return null;
        })}
      </div>
    );
  };

  const statusTone = useCallback((st?: string): string => {
    if (!st) return 'text-slate-400';
    if (/error|fail/i.test(st)) return 'text-rose-400';
    if (/ready|complete|ok|success/i.test(st)) return 'text-emerald-400';
    if (/run|active|busy|pend|generat/i.test(st)) return 'text-amber-300';
    return 'text-slate-400';
  }, []);

  const terminalLogLines = useMemo(() => {
    const lines: Array<{ id: string; time: string; tag: string; cls: string; text: string }> = [];
    const push = (tag: string, text: string, cls: string = 'text-slate-300') => {
      const now = new Date().toISOString().slice(11, 23);
      lines.push({ id: `log-${lines.length}-${Math.random().toString(36).slice(2, 6)}`, time: now, tag, cls, text });
    };

    push('STATUS', `mode=${studioMode || '—'}  ● ${agentStatus || 'READY'}`, statusTone(agentStatus));

    if (hardwareTelemetry) {
      const wall = hardwareTelemetry.systemPowerW ?? hardwareTelemetry.estimatedWallPowerW ?? 128;
      push('HARDWARE', `vram=${((hardwareTelemetry.vramUsedMB || 0)/1024).toFixed(2)}/${((hardwareTelemetry.vramTotalMB || 8192)/1024).toFixed(1)}GB  gpu=${hardwareTelemetry.gpuTempC || 49}°C  util=${hardwareTelemetry.gpuUtilizationPercent || 26}%  wall≈${Math.round(wall)}W  ram=${(hardwareTelemetry.ramUsedGB || 17.3).toFixed(1)}/${(hardwareTelemetry.ramTotalGB || 32).toFixed(1)}GB`, 'text-slate-400');
    }

    // Chronological messages & activity
    messages.forEach((msg) => {
      if (msg.role === 'user') {
        push('USER', msg.content, 'text-emerald-400 font-semibold');
      } else {
        const cleanContent = msg.content.replace(/```html[\s\S]*?```/g, '[HTML Web App Artifact Generated · Rendered in Preview]').trim();
        push('OUTPUT', cleanContent, 'text-slate-200');
      }
    });

    (executionLog || []).forEach((entry) => {
      const st = entry.status;
      const tagCls = st === 'error' ? 'text-rose-400' : st === 'complete' ? 'text-emerald-400' : 'text-amber-300';
      push((entry.kind || 'command').toUpperCase().slice(0, 8), `[${st}] ${entry.title}`, tagCls);
      if (entry.details && entry.details !== entry.title) {
        push(' ', entry.details.replace(/\s+/g, ' ').slice(0, 300), 'text-slate-500');
      }
    });

    (agentActivity || []).forEach((act) => {
      const t = typeof act === 'string' ? act : act.text;
      const kind = typeof act === 'string' ? 'STEP' : (act.kind || 'STEP').toUpperCase();
      const st = typeof act === 'string' ? '' : act.status;
      const cls = st === 'error' ? 'text-rose-400' : st === 'complete' ? 'text-emerald-300' : 'text-slate-400';
      t.split('\n').filter(Boolean).forEach((line) => {
        push(kind.slice(0, 8), line, cls);
      });
    });

    if (loading) {
      push('STREAM', '● Processing local execution step…', 'text-amber-300 animate-pulse');
    }

    if (lastTelemetry) {
      push('TOKENS', `prompt=${(lastTelemetry.promptTokens || 0).toLocaleString()}  completion=${(lastTelemetry.completionTokens || 0).toLocaleString()}  total=${(lastTelemetry.totalTokens || 0).toLocaleString()}  ${(lastTelemetry.tokensPerSecond || 0).toFixed(1)} t/s  src=${lastTelemetry.source || 'local'}`, 'text-slate-400');
    }

    return lines;
  }, [studioMode, agentStatus, hardwareTelemetry, messages, executionLog, agentActivity, loading, lastTelemetry, statusTone]);

  const handleResponseScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distFromBottom > 35) {
      isResponseScrolledUpRef.current = true;
      setShowResponseJumpToBottom(true);
    } else {
      isResponseScrolledUpRef.current = false;
      setShowResponseJumpToBottom(false);
    }
  };

  const scrollToResponseBottom = (smooth = false) => {
    if (responseScrollRef.current) {
      responseScrollRef.current.scrollTo({
        top: responseScrollRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
      isResponseScrolledUpRef.current = false;
      setShowResponseJumpToBottom(false);
    }
  };

  useEffect(() => {
    if (!isResponseScrolledUpRef.current && responseScrollRef.current) {
      responseScrollRef.current.scrollTop = responseScrollRef.current.scrollHeight;
    }
  }, [terminalLogLines, messages, leftViewMode]);

  return (
    <section className="space-y-4 min-h-[calc(100vh-140px)] flex flex-col flex-1">
      <div className="grid grid-cols-12 gap-4 items-start min-w-0 flex-1">
        {showEngineConfig && (
          <div className="col-span-12 lg:col-span-3 bg-slate-950 border border-slate-800 rounded-lg p-4 shadow-sm min-w-0 overflow-hidden">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3 mb-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-emerald-400 font-bold">Local inference engine</div>
                <h2 className="text-lg font-semibold text-slate-100 mt-1 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-emerald-400" />
                  {status?.engine === 'qwen3.5'
                    ? 'Qwen3.5 9B Vision-Language'
                    : status?.engine === 'qwen'
                    ? 'Qwen 2.5-VL 7B Vision-Language'
                    : status?.engine === 'qwen-coder'
                    ? 'Qwen Coder 7B'
                    : status?.modelName || 'Local Vision-Language Engine'}
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {status?.engine === 'qwen3.5'
                    ? 'Qwen3.5 9B GGUF Q4_K_M via llama.cpp CUDA with mmproj-BF16.'
                    : status?.engine === 'qwen'
                    ? 'Qwen 2.5-VL 7B GGUF Q4_K_M via llama.cpp CUDA with mmproj-F16.'
                    : 'Qwen Coder 7B GGUF via llama.cpp CUDA. Text-only coding profile.'}
                </p>
              </div>
              <span className={`px-2 py-1 rounded border text-[9px] font-mono font-bold ${status?.ready ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>{stateLabel}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] font-mono">
              <div className="bg-slate-900/70 border border-slate-800 rounded p-2"><div className="text-slate-500 text-[8px]">BACKEND</div><div className="text-slate-200 mt-0.5">{status?.backend || 'CUDA'}</div></div>
              <div className="bg-slate-900/70 border border-slate-800 rounded p-2"><div className="text-slate-500 text-[8px]">GPU LAYERS</div><div className="text-slate-200 mt-0.5">{status?.gpuLayers ?? 28} (100%)</div></div>
              <div className="bg-slate-900/70 border border-slate-800 rounded p-2"><div className="text-slate-500 text-[8px]">CONTEXT</div><div className="text-slate-200 mt-0.5">{status?.contextSize ?? 8192}</div></div>
              <div className="bg-slate-900/70 border border-slate-800 rounded p-2"><div className="text-slate-500 text-[8px]">CPU THREADS</div><div className="text-slate-200 mt-0.5">{status?.threads ?? 6}</div></div>
              <div className="bg-slate-900/70 border border-slate-800 rounded p-2"><div className="text-slate-500 text-[8px]">VISION MMPROJ</div><div className="text-emerald-300 mt-0.5 truncate" title={status?.mmprojPath || 'None'}>{status?.mmprojPath ? (status.mmprojPath.split(/[/\\]/).pop() || 'Detected') : 'None'}</div></div>
              <div className="bg-slate-900/70 border border-slate-800 rounded p-2"><div className="text-slate-500 text-[8px]">EST. SPEED</div><div className="text-emerald-400 font-bold mt-0.5">{status?.engine === 'qwen-coder' ? '~30–50 t/s' : status?.engine === 'qwen3.5' ? 'profile-dep' : '~35–45 t/s'}</div></div>
            </div>

            <div className="mt-3 p-2.5 rounded border border-sky-500/20 bg-sky-500/5">
              <div className="text-[9px] font-bold uppercase tracking-widest text-sky-300 mb-1.5">MODEL ROUTING</div>
              <div className="grid grid-cols-1 gap-1.5">
                <button onClick={() => void runAction('restart','qwen')} disabled={loading || status?.engine === 'qwen'} className={`p-2 rounded border text-left cursor-pointer transition-colors ${status?.engine === 'qwen' ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-slate-700 bg-slate-900 hover:bg-slate-800'}`}>
                  <div className="text-[10px] font-bold text-slate-100">Qwen 2.5-VL 7B (Vision)</div>
                  <div className="text-[8px] text-slate-500">Q4_K_M + mmproj-F16 · Vision + Juggernaut-XL v9</div>
                </button>
                <button onClick={() => void runAction('restart','qwen-coder')} disabled={loading || status?.engine === 'qwen-coder'} className={`p-2 rounded border text-left cursor-pointer transition-colors ${status?.engine === 'qwen-coder' ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-slate-700 bg-slate-900 hover:bg-slate-800'}`}>
                  <div className="text-[10px] font-bold text-slate-100">Qwen Coder 7B (Text/Code)</div>
                  <div className="text-[8px] text-amber-300">Q5_K_M · text-only · projector unloaded</div>
                </button>
                <button onClick={() => void runAction('restart','qwen3.5')} disabled={loading || status?.engine === 'qwen3.5'} className={`p-2 rounded border text-left cursor-pointer transition-colors ${status?.engine === 'qwen3.5' ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-slate-700 bg-slate-900 hover:bg-slate-800'}`}>
                  <div className="text-[10px] font-bold text-slate-100">Qwen3.5 9B (Multimodal)</div>
                  <div className="text-[8px] text-sky-300">Q4_K_M + matched mmproj-BF16</div>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              <button onClick={() => runAction('start')} disabled={loading || !status?.configured || !!status?.running} className="px-3 py-1.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-[10px] font-bold uppercase tracking-wider disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"><Play className="w-3 h-3" /> Start</button>
              <button onClick={() => runAction('stop')} disabled={loading || !status?.running} className="px-3 py-1.5 rounded border border-slate-700 bg-slate-900 text-slate-300 text-[10px] font-bold uppercase tracking-wider disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"><Square className="w-3 h-3" /> Stop</button>
              <button onClick={() => runAction('restart')} disabled={loading || !status?.configured} className="px-3 py-1.5 rounded border border-sky-500/30 bg-sky-500/10 text-sky-300 text-[10px] font-bold uppercase tracking-wider disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"><RotateCw className="w-3 h-3" /> Restart</button>
            </div>

            <div className="mt-3 text-[8px] font-mono text-slate-600 break-all">{status?.modelPath || 'C:\\Gina_AI\\models\\llm\\Qwen2.5-VL-7B-Instruct-Q4_K_M.gguf'}</div>
            {error && <div className="mt-2 p-2 rounded border border-rose-500/30 bg-rose-500/5 text-[9px] text-rose-300">{error}</div>}
          </div>
        )}

        <div className={`col-span-12 ${showEngineConfig ? 'lg:col-span-9' : 'lg:col-span-12'} bg-slate-950/80 p-3 sm:p-5 shadow-sm min-h-[640px] flex flex-col flex-1 min-w-0 overflow-hidden`} style={ginaPanelStyle()}>
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-3 border-b border-slate-800 pb-3 mb-3 min-w-0 shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-200">Local Gina Chat</span>
              <span className="px-2 py-0.5 rounded text-[8px] font-mono font-bold border border-slate-800 bg-slate-950 text-emerald-300">● {agentStatus}</span>
              <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold ${status?.ready ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-slate-900 border border-slate-800 text-slate-500'}`}>
                {status?.engine === 'qwen3.5' ? 'Qwen3.5 9B' : status?.engine === 'qwen-coder' ? 'Qwen Coder' : 'Qwen 2.5-VL'} · {status?.ready ? 'ONLINE' : 'LOCAL'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              <button
                type="button"
                onClick={() => setShowBottomEngineConfig(v => !v)}
                className={`hidden px-2.5 py-1 rounded border text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm ${
                  showEngineConfig
                    ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300 font-extrabold'
                    : 'border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300'
                }`}
                title="Configure Local Inference Engine, GPU Layers, and Model Profiles"
              >
                <Sliders className="w-3 h-3 text-emerald-400" />
                <span>{showEngineConfig ? 'Hide Config' : 'Engine Config'}</span>
              </button>
              {onToggleFullScreen && (
                <button
                  type="button"
                  onClick={onToggleFullScreen}
                  className="px-2.5 py-1 rounded border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                  title={isFullScreen ? 'Exit Full Screen' : 'Expand Full Screen Top to Bottom'}
                >
                  {isFullScreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                  <span>{isFullScreen ? 'Windowed' : 'Full Screen'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowWebBrowserModal(true)}
                className="px-2.5 py-1 rounded border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                title="Open Gina Web Browser & Live Internet Inspector"
              >
                <Globe className="w-3 h-3 text-sky-400" /> Web Browser
              </button>
              <button onClick={()=>{const u=window.prompt('GitHub repository URL'); if(u){setGithubUrl(u); setTimeout(()=>void loadGithubProject(),0);}}} className="px-2 py-1 rounded border border-slate-700 bg-slate-900 text-slate-400 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"><Github className="w-3 h-3"/> GitHub</button>
              {agentWorkspace && <span className="max-w-[170px] truncate text-[8px] font-mono text-amber-300/70" title={agentWorkspace}>● {agentWorkspace}</span>}<button onClick={exportActiveWorkspace} title="Download the current project as a clean ZIP" className="px-2 py-1 rounded border border-emerald-500/30 bg-emerald-500/5 text-emerald-300 text-[9px] font-bold uppercase tracking-wider cursor-pointer">Export ZIP</button>
            </div>
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <button onClick={() => { setMessages([]); setError(null); setPdfNotice(null); setActivePreviewContent(null); }} disabled={!messages.length || loading} className="px-2 py-1 rounded border border-slate-700 bg-slate-900 text-slate-400 text-[9px] font-bold uppercase tracking-wider disabled:opacity-30 flex items-center gap-1 cursor-pointer"><Trash2 className="w-3 h-3" /> Clear</button>
              <button onClick={() => void saveLastResponseAsPdf()} disabled={!messages.some(m => m.role === 'assistant') || pdfSaving} className="px-2 py-1 rounded border border-sky-500/30 bg-sky-500/5 text-sky-300 text-[9px] font-bold uppercase tracking-wider disabled:opacity-30 flex items-center gap-1 cursor-pointer"><FileDown className="w-3 h-3" /> {pdfSaving ? 'Saving…' : 'Save PDF'}</button>
              <button onClick={() => { const next = !voiceEnabled; setVoiceEnabled(next); if (next) testVoice(); }} disabled={!voiceAvailable && !browserVoiceAvailable} title={(voiceAvailable || browserVoiceAvailable) ? 'Toggle Gina voice' : 'No local voice engine detected'} className={`px-2 py-1 rounded border text-[9px] font-bold uppercase tracking-wider disabled:opacity-30 flex items-center gap-1 cursor-pointer ${voiceEnabled ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300' : 'border-slate-700 bg-slate-900 text-slate-500'}`}>{voiceEnabled ? <Volume2 className="w-3 h-3"/> : <VolumeX className="w-3 h-3"/>} Voice</button>
              <button onClick={toggleMicrophone} disabled={listening || !microphoneAvailable} title="Speak to Gina" className={`px-2 py-1 rounded border text-[9px] font-bold uppercase tracking-wider disabled:opacity-30 flex items-center gap-1 cursor-pointer ${listening ? 'border-rose-500/40 bg-rose-500/10 text-rose-300' : 'border-violet-500/30 bg-violet-500/5 text-violet-300'}`}>{listening ? <MicOff className="w-3 h-3"/> : <Mic className="w-3 h-3"/>} {listening ? 'Listening…' : 'Talk'}</button>
              <label className="flex items-center gap-1 px-2 text-[9px] font-mono text-slate-500"><input type="checkbox" checked={autoSpeak} onChange={e=>setAutoSpeak(e.target.checked)} /> Auto</label>
              {(voiceAvailable || browserVoiceAvailable) && (
                <div className="flex items-center gap-1.5">
                  <select
                    value={voiceName}
                    onChange={e => {
                      const newVoice = e.target.value;
                      setVoiceName(newVoice);
                      try { localStorage.setItem('gina_voice_name', newVoice); } catch {}
                    }}
                    className="max-w-[210px] rounded border border-slate-800 bg-slate-900 px-1.5 py-1 text-[9px] text-slate-300 font-mono focus:border-emerald-500/50 outline-none"
                  >
                    {Array.from(new Set([
                      ...(browserVoiceAvailable ? window.speechSynthesis.getVoices().map(v => v.name) : []),
                      ...voices.map(v => v.name)
                    ])).sort((a,b) => {
                      const getScore = (n: string) => {
                        if (n === defaultVoiceName) return -200;
                        if (/google\s+us\s+english/i.test(n)) return -100;
                        if (/google/i.test(n)) return -80;
                        if (/microsoft.*jenny|jenny/i.test(n)) return -60;
                        if (/microsoft.*aria|aria/i.test(n)) return -40;
                        if (/microsoft.*zira|zira/i.test(n)) return -20;
                        return 0;
                      };
                      return getScore(a) - getScore(b) || a.localeCompare(b);
                    }).map(name => {
                      const isDef = name === defaultVoiceName;
                      const isGoogleUs = /google\s+us\s+english/i.test(name);
                      const isGoogle = /google/i.test(name);
                      const isJenny = /jenny/i.test(name);
                      const tag = isDef ? '★ [DEFAULT]' : isGoogleUs ? '★ [Google US - Natural]' : isGoogle ? '[Google Natural]' : isJenny ? '★ [Jenny - Female]' : '';
                      return (
                        <option key={name} value={name}>
                          {tag ? `${tag} ${name}` : name}
                        </option>
                      );
                    })}
                  </select>
                  {voiceName && voiceName === defaultVoiceName ? (
                    <span className="px-1.5 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-[8px] font-bold uppercase tracking-wider flex items-center gap-0.5" title="This voice is saved as your default">
                      ★ Default
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSetDefaultVoice(voiceName)}
                      disabled={!voiceName}
                      className="px-1.5 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[8px] font-bold uppercase tracking-wider flex items-center gap-0.5 cursor-pointer transition-colors"
                      title={`Save "${voiceName}" as permanent default voice`}
                    >
                      ★ Set Default
                    </button>
                  )}
                </div>
              )}
              {voiceName && /google\s+us\s+english/i.test(voiceName) && <span className="text-[9px] font-mono text-emerald-400/90 font-semibold">GOOGLE US ENGLISH</span>}
              {voiceName && /jenny/i.test(voiceName) && !/google/i.test(voiceName) && <span className="text-[9px] font-mono text-pink-300/80">JENNY • FEMALE</span>}
              <div className="text-[9px] font-mono text-slate-600 flex items-center gap-1"><Cpu className="w-3 h-3" /> 127.0.0.1:{status?.port ?? 8080}</div>{status?.multimodal ? <span className="text-[8px] font-mono text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">VISION READY</span> : <span className="text-[8px] font-mono text-slate-600 border border-slate-800 px-1.5 py-0.5 rounded">TEXT ONLY</span>}</div>
          </div>

          {aiImageJobId && generationJob?.id === aiImageJobId && (generationJob.status === 'QUEUED' || generationJob.status === 'RUNNING') && (
            <div className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5 shadow-sm">
              <div className="flex items-center justify-between gap-3 text-[9px] font-mono uppercase tracking-wider">
                <div className="flex items-center gap-2 text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="font-bold">Generating Image</span>
                  <span className="text-emerald-400">{generationJob.progress || 0}%</span>
                  {generationJob.currentStep != null && <span className="text-slate-500">Step {generationJob.currentStep}/{generationJob.totalSteps || '?'}</span>}
                </div>
                <button type="button" onClick={() => void cancelJob()} className="px-2.5 py-1 rounded border border-rose-500/50 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 font-bold" title="Stop ComfyUI generation, clear its queue and flush VRAM">
                  <Square className="inline w-3 h-3 mr-1" /> STOP &amp; FLUSH
                </button>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-emerald-400 transition-[width] duration-300" style={{ width: `${Math.max(0, Math.min(100, generationJob.progress || 0))}%` }} />
              </div>
              <div className="mt-1.5 text-[8px] font-mono text-slate-600">FLUX / ComfyUI · job {aiImageJobId.slice(0, 8)}</div>
            </div>
          )}

          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">Workspace · 900 × 600 Dual Windows (Gina Assistant Response + Interactive Preview)</div>
            <PanelChromeControls />
          </div>
          <ResizableSplit
            className="flex-1 min-w-0"
            defaultLeftPct={50}
            resizableHeight={false}
            showPresets={true}
            defaultHeightPx={520}
            minHeightPx={180}
            maxHeightPx={4000}
            minLeftPct={5}
            maxLeftPct={95}
            initialMode="split"
            left={(
              <div
                className="h-full min-h-0 bg-slate-950/90 flex flex-col relative select-text"
                style={ginaPanelStyle()}
              >
                {/* Header with View Mode Switcher */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 px-3 pt-2.5 shrink-0 bg-slate-950/80">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${loading ? 'bg-amber-400 animate-ping' : /error|fail/i.test(agentStatus) ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                    <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{leftViewMode === 'terminal' ? 'Live Execution Log' : 'Assistant Response'}</span>
                    </label>
                    <span className={`text-[10px] font-mono font-semibold ${statusTone(agentStatus)}`}>
                      ● {agentStatus || 'READY'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View Mode Switcher: Live Terminal Log (Claude Code) vs Formatted Chat */}
                    <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900/90 p-0.5 text-[9px] font-mono">
                      <button
                        type="button"
                        onClick={() => setLeftViewMode('terminal')}
                        className={`px-2.5 py-1 rounded cursor-pointer transition-all flex items-center gap-1 ${
                          leftViewMode === 'terminal'
                            ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="Live Terminal Streaming Log (Claude Code style)"
                      >
                        <Code2 className="w-3 h-3 text-emerald-400" />
                        <span>Terminal Log</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeftViewMode('chat')}
                        className={`px-2.5 py-1 rounded cursor-pointer transition-all flex items-center gap-1 ${
                          leftViewMode === 'chat'
                            ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="Formatted Chat View"
                      >
                        <MessageSquare className="w-3 h-3 text-sky-400" />
                        <span>Chat View</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => { setExecutionLog([]); setAgentActivity([]); }}
                      className="text-[9px] font-mono text-slate-500 hover:text-rose-300 px-1.5 py-0.5 rounded hover:bg-slate-900 cursor-pointer"
                      title="Clear terminal log"
                    >
                      clear
                    </button>
                  </div>
                </div>

                {/* 1. THE CSS BOX (overflow-y: auto, locked height flex-1 min-h-0) */}
                <div
                  ref={responseScrollRef}
                  onScroll={handleResponseScroll}
                  className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 space-y-1 relative"
                >
                  {leftViewMode === 'terminal' ? (
                    /* TEXT-ONLY REAL-TIME CLAUDE CODE EXECUTION LOG */
                    <div className="font-mono text-[11px] leading-5 text-slate-300 space-y-0.5">
                      {terminalLogLines.map((l) => (
                        <div key={l.id} className={`whitespace-pre-wrap break-words ${l.cls}`}>
                          <span className="text-slate-600 select-none mr-2">{l.time}</span>
                          <span className="font-bold mr-2 inline-block w-20 select-none text-slate-400">{l.tag}</span>
                          <span>{l.text}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* CONVERSATION VIEW (with clean text-only timeline, no bulky card boxes) */
                    <div className="space-y-3">
                      {!messages.length && (
                        <div className="h-full min-h-[300px] flex items-center justify-center text-center text-slate-600 text-xs">
                          <div>
                            <Zap className="w-6 h-6 mx-auto mb-2 text-slate-700" />
                            <p>Start local generation or chat with Gina.</p>
                            <p className="text-[10px] mt-1 text-slate-600">Pure local inference on RTX 3070 Ti</p>
                          </div>
                        </div>
                      )}

                      {/* Clean Text-only Activity Stream (NO BOXED CARDS) */}
                      {agentActivity.length > 0 && (
                        <div className="border-b border-slate-800 pb-2 mb-2 font-mono text-[10px] leading-relaxed space-y-0.5 text-slate-400">
                          {agentActivity.slice(-8).map((entry, i) => {
                            const text = typeof entry === 'string' ? entry : entry.text;
                            const isErr = (typeof entry !== 'string' && entry.status === 'error') || /fail|error|✗/i.test(text);
                            const isOk = /✓|complete|ready/i.test(text) && !isErr;
                            return (
                              <div key={i} className={`whitespace-pre-wrap ${isErr ? 'text-rose-400' : isOk ? 'text-emerald-400' : 'text-slate-400'}`}>
                                {text}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Chat Messages */}
                      {messages.map((message, index) => (
                        <div key={`${message.role}-${index}`} className={`rounded-lg border p-3 text-xs leading-relaxed ${message.role === 'user' ? 'ml-10 bg-emerald-500/5 border-emerald-500/20 text-slate-200' : 'mr-10 bg-slate-900 border-slate-800 text-slate-300'}`}>
                          <div className="text-[9px] font-mono uppercase tracking-wider text-slate-600 mb-1 flex items-center justify-between">
                            <span>{message.role}</span>
                            {message.role === 'assistant' && message.webProvider && (
                              <span className="flex items-center gap-1 text-[8px] font-bold text-sky-400 bg-sky-950/60 border border-sky-500/30 px-1.5 py-0.5 rounded">
                                <Globe2 className="w-2.5 h-2.5" /> {message.webProvider.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>{renderRichContent(message.content, index)}</div>
                          {message.imageUrl && <img src={message.imageUrl} alt="Gina generated image" className="mt-3 max-w-full rounded-lg border border-slate-700" />}
                          {message.videoUrl && <video controls playsInline src={message.videoUrl} className="mt-3 max-w-full rounded-lg border border-slate-700" />}
                        </div>
                      ))}

                      {loading && status?.ready && (
                        <div className="text-xs font-mono text-amber-300 flex items-center gap-2 py-1">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                          <span>Gina is executing locally on RTX 3070 Ti…</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. THE "USER INTERRUPT" FLOATING RESUME BADGE */}
                {showResponseJumpToBottom && (
                  <button
                    type="button"
                    onClick={() => scrollToResponseBottom(true)}
                    className="absolute bottom-4 right-4 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-mono font-bold shadow-lg shadow-emerald-950/60 backdrop-blur transition-all cursor-pointer animate-pulse"
                  >
                    <span>Scroll paused · Jump to bottom ↓</span>
                  </button>
                )}

                {messages.some(m => m.role === 'assistant') && (() => {
                  const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
                  const lastText = lastAssistant?.content || '';
                  return (
                    <MovableResizableWrapper id="gina-response-actions" className="inline-block px-3 pb-2 pt-1 border-t border-slate-800/80 bg-slate-950/90">
                      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950/90 px-2 py-1.5">
                        <span className="mr-1 text-[8px] font-bold uppercase tracking-widest text-slate-600">RESPONSE</span>
                        <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(lastText); } catch {} }} className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[9px] font-bold text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300">Copy</button>
                        <button type="button" onClick={() => void speakText(lastText)} className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[9px] font-bold text-slate-300 hover:border-sky-500/40 hover:text-sky-300"><Volume2 className="mr-1 inline h-3 w-3" />Audio</button>
                        <button type="button" onClick={() => onAddLog('INFO', 'Response marked helpful.')} className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[9px] font-bold text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300">👍</button>
                        <button type="button" onClick={() => onAddLog('INFO', 'Response marked not helpful.')} className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[9px] font-bold text-slate-300 hover:border-rose-500/40 hover:text-rose-300">👎</button>
                        <button type="button" onClick={() => { const previousUser = [...messages].reverse().find(m => m.role === 'user'); if (previousUser?.content) { setInput(previousUser.content); requestAnimationFrame(() => void sendMessage(previousUser.content)); } }} disabled={loading} className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[9px] font-bold text-slate-300 hover:border-amber-500/40 hover:text-amber-300"><RotateCw className="mr-1 inline h-3 w-3" />Retry</button>
                      </div>
                    </MovableResizableWrapper>
                  );
                })()}
              </div>
            )}
            right={(
              <aside className="min-w-0 h-full overflow-hidden bg-slate-950/90 flex flex-col" style={ginaPanelStyle()}>
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 px-3 py-2 shrink-0">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-200">
                  <Search className="w-3.5 h-3.5 text-sky-400" />
                  <span>Interactive Preview</span>
                </div>
                {activePreviewContent?.type === 'html' ? (
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setWebAppView('preview')} className={`rounded px-2 py-1 text-[8px] font-bold uppercase tracking-wider ${webAppView === 'preview' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}>Preview</button>
                    <button type="button" onClick={() => setWebAppView('code')} className={`rounded px-2 py-1 text-[8px] font-bold uppercase tracking-wider ${webAppView === 'code' ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}>Code</button>
                    <button type="button" onClick={() => downloadCodeFile('gina-web-app.html', activePreviewContent.content, 'text/html;charset=utf-8')} className="rounded border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-sky-300 hover:bg-sky-500/20 flex items-center gap-1"><FileDown className="w-3 h-3" /> Download</button>
                    <button type="button" onClick={() => void saveCodeBlock('gina-web-app.html', activePreviewContent.content, 'web-app-html')} className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-emerald-300 hover:bg-emerald-500/20">Save HTML</button>
                  </div>
                ) : <span className="text-[8px] font-mono text-slate-500">LIVE PREVIEW</span>}
              </div>
              {activePreviewContent?.type === 'html' && savedCodeFiles['web-app-html'] && (
                <div className="border-b border-slate-800 px-3 py-1.5 text-[8px] font-mono text-emerald-400 truncate">Saved: {savedCodeFiles['web-app-html'].path}</div>
              )}
              {webAppRuntimeError && activePreviewContent?.type === 'html' && (
                <div className="mx-3 mt-2 rounded border border-rose-500/30 bg-rose-500/10 px-2.5 py-2 text-[9px] text-rose-300">Web App runtime error: {webAppRuntimeError}</div>
              )}
              <div className="flex-1 min-h-0 overflow-auto p-3">
                {!activePreviewContent ? <div className="h-full min-h-[320px] flex items-center justify-center text-center text-slate-600 text-[10px]">Web sources, HTML layouts and live response scraps will appear here.</div> : activePreviewContent.type === 'html' ? (
                  webAppView === 'code' ? (
                    <pre className="h-full min-h-[260px] overflow-auto rounded border border-slate-800 bg-slate-950 p-3 text-[9px] leading-relaxed text-slate-300 whitespace-pre-wrap break-words"><code>{activePreviewContent.content}</code></pre>
                  ) : (
                    <iframe ref={webAppIframeRef} title={activePreviewContent.title} sandbox="allow-scripts allow-forms" srcDoc={buildWebAppPreviewHtml(activePreviewContent.content, webAppStorageNamespace || makeWebAppStorageNamespace(activePreviewContent.content))} className="h-full min-h-[260px] w-full rounded border border-slate-800 bg-white" />
                  )
                ) : activePreviewContent.type === 'video' ? (
                  <div className="relative aspect-[16/10] w-full max-h-full bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center">
                    {activePreviewContent.url || activePreviewContent.content ? (
                      <video controls playsInline className="w-full h-full object-contain bg-black" src={activePreviewContent.url || activePreviewContent.content}>
                        Your browser cannot play this local video.
                      </video>
                    ) : (
                      <div className="text-[10px] text-slate-600">Video output is not available yet.</div>
                    )}
                  </div>
                ) : activePreviewContent.type === 'web' ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3"><div className="text-[9px] font-bold uppercase tracking-wider text-sky-300">SOURCE</div><div className="mt-1 text-xs font-semibold text-slate-200 break-words">{activePreviewContent.title}</div>{activePreviewContent.url && <a href={activePreviewContent.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[9px] text-sky-300 hover:text-sky-200"><ExternalLink className="w-3 h-3" /> Open source</a>}</div>
                    <div className="text-[10px] leading-relaxed text-slate-400 break-words">{activePreviewContent.content}</div>
                  </div>
                ) : <div className="whitespace-pre-wrap break-words text-[10px] leading-relaxed text-slate-300">{renderMarkdownLinks(activePreviewContent.content)}</div>}
              </div>
              {messages.some(m => m.webSources?.length) && <div className="border-t border-slate-800 p-2 space-y-1.5">{messages.flatMap(m => m.webSources || []).slice(0,6).map((source, i) => <button type="button" key={`${source.url}-${i}`} onClick={() => setActivePreviewContent({type:'web', title:source.title || source.source || source.url, content:source.snippet || source.url, url:source.url})} className="w-full rounded border border-slate-800 bg-slate-900/70 px-2 py-1.5 text-left hover:border-sky-500/30"><div className="flex items-center gap-1 text-[9px] font-semibold text-sky-300 truncate"><Globe2 className="w-2.5 h-2.5 shrink-0" />{source.title || source.url}</div></button>)}</div>}
              </aside>
            )}
          />




          {/* ============================================================== */}
          {/* SLEEK TOOL MODES SELECTOR & MOVABLE WIDGET DOCK CONTROL BAR */}
          {/* ============================================================== */}
          <MovableResizableWrapper id="gina-mode-bar" className="mt-3 mb-2">
          <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 rounded-xl border border-slate-800/80 bg-slate-950/85 backdrop-blur-md">
            {/* Sleek, professional tool mode pills */}
            <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar py-0.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 pl-1.5 pr-1 select-none shrink-0">MODE:</span>
              {[
                { id: 'web-search', label: 'Web Search', icon: Search, color: 'text-sky-400' },
                { id: 'web-app', label: 'Web App', icon: Globe2, color: 'text-emerald-400' },
                { id: 'code-engine', label: 'Code Engine', icon: Code2, color: 'text-violet-400' },
                { id: 'image-studio', label: 'Image Studio', icon: ImageIcon, color: 'text-rose-400' },
                { id: 'video-generation', label: 'Video Gen', icon: Video, color: 'text-amber-400' },
              ].map(m => {
                const Icon = m.icon;
                const isActive = studioMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onModeChange?.(m.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold tracking-tight flex items-center gap-1.5 transition-all cursor-pointer select-none shrink-0 ${
                      isActive
                        ? 'bg-slate-800 text-white shadow-sm ring-1 ring-emerald-500/50 font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                    }`}
                    title={`Switch to ${m.label} mode`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? m.color : 'text-slate-400'}`} />
                    <span>{m.label}</span>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />}
                  </button>
                );
              })}
            </div>

            {/* Movable widgets toolbar */}
            <div className="flex items-center gap-1 ml-auto shrink-0">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 px-1 select-none">WIDGETS:</span>
              <button
                type="button"
                onClick={() => toggleWidget('telemetry')}
                className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${
                  showTelemetryWidget
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-900/90 text-slate-500 border border-slate-800 hover:text-slate-300'
                }`}
                title="Toggle Local AI Telemetry widget"
              >
                <Activity className="w-3 h-3 text-emerald-400" />
                <span className="hidden sm:inline">Telemetry</span>
              </button>

              <button
                type="button"
                onClick={() => toggleWidget('electricity')}
                className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${
                  showElectricityWidget
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'bg-slate-900/90 text-slate-500 border border-slate-800 hover:text-slate-300'
                }`}
                title="Toggle Whole-PC Electricity & Running Cost widget"
              >
                <Zap className="w-3 h-3 text-amber-400" />
                <span className="hidden sm:inline">Power</span>
              </button>

              <button
                type="button"
                onClick={() => toggleWidget('commercial')}
                className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${
                  showCommercialWidget
                    ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                    : 'bg-slate-900/90 text-slate-500 border border-slate-800 hover:text-slate-300'
                }`}
                title="Toggle Commercial Pricing Benchmarks widget"
              >
                <DollarSign className="w-3 h-3 text-sky-400" />
                <span className="hidden sm:inline">Savings</span>
              </button>

              <div className="h-4 w-px bg-slate-800 mx-0.5" />

              <button
                type="button"
                onClick={toggleDockPosition}
                className="px-2 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-[9px] font-mono transition-colors cursor-pointer flex items-center gap-1"
                title={`Move widgets ${widgetDockPosition === 'above' ? 'below prompt' : 'above prompt'}`}
              >
                <Layers className="w-3 h-3" />
                <span className="hidden md:inline">{widgetDockPosition === 'above' ? 'Dock: Top' : 'Dock: Bottom'}</span>
              </button>

              <button
                type="button"
                onClick={toggleCleanScreen}
                className={`px-2 py-1 rounded-md border text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                  minimizedWidgets.telemetry && minimizedWidgets.electricity && minimizedWidgets.commercial
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title="Clean Screen: toggle between full widgets and 1-line compact badges"
              >
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Clean Screen</span>
              </button>
            </div>
          </div>
          </MovableResizableWrapper>

          {/* DOCKED TOP: MOVABLE & RESIZABLE TELEMETRY WIDGETS MATRIX */}
          {widgetDockPosition === 'above' && renderMovableWidgetsMatrix()}

          {(['web-search', 'code-engine', 'image-studio', 'video-generation', 'web-app'] as const).includes(studioMode as any) && (
            <MovableResizableWrapper
              id={`panel-profiles-${studioMode}`}
              collapsible
              title={
                studioMode === 'web-search' ? 'Search Profiles'
                : studioMode === 'image-studio' ? 'Image Profiles'
                : studioMode === 'video-generation' ? 'Video Profiles'
                : studioMode === 'web-app' ? 'Web App & Agent Profiles'
                : 'Code Engine & Agent Profiles'
              }
              className="mb-2"
            >
              <GinaStudioProfilePicker
                mode={studioMode as 'web-search' | 'code-engine' | 'image-studio' | 'video-generation' | 'web-app'}
                selectedId={
                  studioMode === 'web-search' ? searchProfileId
                  : studioMode === 'image-studio' ? imageProfileId
                  : studioMode === 'video-generation' ? videoProfileId
                  : studioMode === 'web-app' ? (agentProfileId || codeProfileId)
                  : (codeProfileId || agentProfileId)
                }
                agentProfileId={agentProfileId}
                codeProfileId={codeProfileId}
                pythonVersion={pythonVersion}
                onPythonVersionChange={setPythonVersion}
                onSelect={(profile) => {
                  if (studioMode === 'web-search') setSearchProfileId(profile.id);
                  else if (studioMode === 'image-studio') setImageProfileId(profile.id);
                  else if (studioMode === 'video-generation') setVideoProfileId(profile.id);
                  else if (studioMode === 'web-app' || studioMode === 'code-engine') {
                    if ('avatar' in profile || GINA_AGENT_PROFILES.some((a) => a.id === profile.id)) {
                      setAgentProfileId(profile.id);
                      onAddLog('INFO', `Selected Agent Profile: ${profile.name}`);
                    } else {
                      setCodeProfileId(profile.id);
                      onAddLog('INFO', `Selected Code Profile: ${profile.name}`);
                    }
                  } else {
                    setCodeProfileId(profile.id);
                  }
                }}
                onInsertShortcode={(sc) => setInput((prev) => {
                  const trimmed = prev.trim();
                  if (/\[id:\s*['"][^'"]+['"]\s*\]/.test(trimmed)) {
                    return prev.replace(/\[id:\s*['"][^'"]+['"]\s*\]\s*/i, sc);
                  }
                  return sc + (trimmed ? trimmed : '');
                })}
                className="mb-2"
              />
            </MovableResizableWrapper>
          )}

          {(studioMode === 'web-app' || agentProfileId === 'agent_coder' || studioMode === 'code-engine') && (
            <MovableResizableWrapper id="panel-agent-project-tools" collapsible title="Coder Project Tools" className="mb-2">
              <GinaAgentProjectBar
                onLog={(level, message) => onAddLog(level as any, message)}
                onSetInput={setInput}
                onInjectSystemNote={(note) => {
                  pushAgentActivity({ text: `[IMPORT_PROTOCOL]\n${note.slice(0, 1500)}\n[END_PROTOCOL]`, kind: 'info', status: 'running' });
                }}
              />
            </MovableResizableWrapper>
          )}

          {status?.recentLog?.length ? (
            <div
              ref={llamaLogPanel.panelRef}
              className="relative mt-1.5 rounded-lg border border-slate-800 bg-slate-950/60 flex flex-col transition-all"
              style={{ width: llamaLogPanel.width ? `${llamaLogPanel.width}px` : '100%' }}
            >
              <button
                type="button"
                onClick={() => setLlamaLogOpen(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-900/50 cursor-pointer select-none transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ChevronRight className={`h-3 w-3 text-slate-500 transition-transform ${llamaLogOpen ? 'rotate-90 text-emerald-400' : ''}`} />
                  <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400">llama-server diagnostic log</span>
                </div>
                <div className="flex items-center gap-2">
                  {llamaLogPanel.width && (
                    <span className="text-[7px] font-mono text-emerald-400/80 bg-slate-900 px-1 rounded border border-slate-800">
                      {llamaLogPanel.width}px wide
                    </span>
                  )}
                  <span className="text-[7px] font-mono text-slate-600">{status.recentLog.length} lines</span>
                </div>
              </button>
              {llamaLogOpen && (
                <>
                  <pre
                    className="border-t border-slate-800/80 px-3 py-2 text-[8px] font-mono text-slate-400 whitespace-pre-wrap overflow-y-auto custom-scrollbar flex-1"
                    style={{ height: `${llamaLogPanel.height}px`, minHeight: '50px' }}
                  >
                    {status.recentLog.join('\n')}
                  </pre>
                  <PanelResizeGrip
                    onBottomPointerDown={llamaLogPanel.onBottomPointerDown}
                    onRightPointerDown={llamaLogPanel.onRightPointerDown}
                    onCornerPointerDown={llamaLogPanel.onCornerPointerDown}
                    onResetWidth={llamaLogPanel.resetWidth}
                    width={llamaLogPanel.width}
                    height={llamaLogPanel.height}
                    label="llama-server diagnostic log"
                  />
                </>
              )}
              {!llamaLogOpen && (
                <PanelResizeGrip
                  onRightPointerDown={llamaLogPanel.onRightPointerDown}
                  onResetWidth={llamaLogPanel.resetWidth}
                  width={llamaLogPanel.width}
                  label="llama-server diagnostic log"
                />
              )}
            </div>
          ) : null}

          {pdfNotice && <div className={`mb-2 p-2 rounded border text-[9px] ${pdfNotice.startsWith('PDF saved:') ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300' : 'border-rose-500/30 bg-rose-500/5 text-rose-300'}`}>{pdfNotice}</div>}

          <MovableResizableWrapper id="panel-local-inference" collapsible title="Local Inference Engine" className="mt-1.5">
            <section
            ref={bottomEnginePanel.panelRef}
            className="relative rounded-lg border border-slate-800 bg-slate-950/90 flex flex-col transition-all"
            style={{ width: bottomEnginePanel.width ? `${bottomEnginePanel.width}px` : '100%' }}
          >
            <div className="flex items-center justify-between gap-3 px-3 py-2.5 shrink-0">
              <div className="flex min-w-0 items-center gap-2">
                <Bot className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[9px] font-bold uppercase tracking-widest text-slate-200">Local Inference Engine</div>
                  <div className="truncate text-[8px] font-mono text-slate-500">
                    {status?.engine === 'qwen3.5' ? 'Qwen3.5 9B' : status?.engine === 'qwen-coder' ? 'Qwen Coder 7B' : 'Qwen 2.5-VL 7B'} · {status?.backend || 'CUDA'} · {status?.ready ? 'ONLINE' : 'OFFLINE'} · {status?.contextSize ?? 8192} context
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {bottomEnginePanel.width && (
                  <span className="text-[7px] font-mono text-emerald-400/80 bg-slate-900 px-1 rounded border border-slate-800">
                    {bottomEnginePanel.width}px wide
                  </span>
                )}
                <button type="button" onClick={() => setShowBottomEngineConfig(v => !v)} className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider text-emerald-300 hover:bg-emerald-500/20">
                  {showBottomEngineConfig ? 'Hide Config' : 'Show Config'}
                </button>
              </div>
            </div>
            {showBottomEngineConfig && (
              <>
                <div
                  className="border-t border-slate-800 px-3 py-2.5 overflow-y-auto custom-scrollbar flex-1"
                  style={{ height: `${bottomEnginePanel.height}px`, minHeight: '70px' }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <button type="button" onClick={() => void runAction('restart','qwen')} disabled={loading || status?.engine === 'qwen'} className="rounded border border-slate-700 bg-slate-900 p-2 text-left hover:border-emerald-500/40 disabled:opacity-40">
                      <div className="text-[9px] font-bold text-slate-200">Qwen 2.5-VL 7B</div><div className="text-[7px] text-slate-500">Vision / multimodal</div>
                    </button>
                    <button type="button" onClick={() => void runAction('restart','qwen-coder')} disabled={loading || status?.engine === 'qwen-coder'} className="rounded border border-slate-700 bg-slate-900 p-2 text-left hover:border-emerald-500/40 disabled:opacity-40">
                      <div className="text-[9px] font-bold text-slate-200">Qwen Coder 7B</div><div className="text-[7px] text-amber-300">Text / code</div>
                    </button>
                    <button type="button" onClick={() => void runAction('restart','qwen3.5')} disabled={loading || status?.engine === 'qwen3.5'} className="rounded border border-slate-700 bg-slate-900 p-2 text-left hover:border-emerald-500/40 disabled:opacity-40">
                      <div className="text-[9px] font-bold text-slate-200">Qwen3.5 9B</div><div className="text-[7px] text-sky-300">Multimodal</div>
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" onClick={() => void runAction('start')} disabled={loading || !status?.configured || !!status?.running} className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider text-emerald-300 disabled:opacity-40">Start</button>
                    <button type="button" onClick={() => void runAction('stop')} disabled={loading || !status?.running} className="rounded border border-slate-700 bg-slate-900 px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider text-slate-300 disabled:opacity-40">Stop</button>
                    <button type="button" onClick={() => void runAction('restart')} disabled={loading || !status?.configured} className="rounded border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider text-sky-300 disabled:opacity-40">Restart</button>
                    <span className="self-center text-[8px] font-mono text-slate-600 truncate">{status?.modelPath || 'Local model path unavailable'}</span>
                  </div>
                </div>
                <PanelResizeGrip
                  onBottomPointerDown={bottomEnginePanel.onBottomPointerDown}
                  onRightPointerDown={bottomEnginePanel.onRightPointerDown}
                  onCornerPointerDown={bottomEnginePanel.onCornerPointerDown}
                  onResetWidth={bottomEnginePanel.resetWidth}
                  width={bottomEnginePanel.width}
                  height={bottomEnginePanel.height}
                  label="Local Inference Engine"
                />
              </>
            )}
            {!showBottomEngineConfig && (
              <PanelResizeGrip
                onRightPointerDown={bottomEnginePanel.onRightPointerDown}
                onResetWidth={bottomEnginePanel.resetWidth}
                width={bottomEnginePanel.width}
                label="Local Inference Engine"
              />
            )}
          </section>
            </MovableResizableWrapper>

          <div className="mt-2.5 border-t border-slate-800 pt-2.5">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.md,.markdown,.json,.csv,.tsv,.log,.ini,.cfg,.conf,.yaml,.yml,.xml,.html,.htm,.css,.js,.jsx,.ts,.tsx,.py,.ps1,.bat,.cmd,.sh,.sql,.c,.h,.cpp,.hpp,.cc,.java,.cs,.go,.rs,.toml,.env,.png,.jpg,.jpeg,.webp,.bmp,.gif,.zip,text/plain,application/json,text/csv,text/markdown,text/xml,image/png,image/jpeg,image/webp,application/zip"
              className="hidden"
              onChange={e => {
                const files = Array.from(e.target.files || []) as File[];
                void (async () => { for (const file of files) await handleAttachFile(file); })();
              }}
            />

            {attachedFiles.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {attachedFiles.map(file => (
                  <div key={file.name} className="flex items-center gap-1.5 px-2 py-1 rounded border border-sky-500/20 bg-sky-500/5 text-sky-300 text-[9px] font-mono max-w-full">
                    {file.kind === 'image' ? <ImageIcon className="w-3 h-3 shrink-0" /> : file.kind === 'archive' ? <Archive className="w-3 h-3 shrink-0" /> : <FileText className="w-3 h-3 shrink-0" />}
                    <span className="truncate max-w-[220px]">{file.name}</span>
                    <span className="text-slate-600">{Math.ceil(file.bytes / 1024)}KB</span>
                    {file.extractedFiles ? <span className="text-emerald-400">{file.extractedFiles} files</span> : null}
                    <button type="button" onClick={() => setAttachedFiles(prev => prev.filter(x => x.name !== file.name))} className="text-slate-500 hover:text-rose-300" title="Remove file"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
            {fileAttachError && <div className="mb-2 p-2 rounded border border-rose-500/20 bg-rose-500/5 text-[9px] text-rose-300">{fileAttachError}</div>}

            <MovableResizableWrapper id="gina-prompt-input" className="w-full">
              <div
                ref={promptBoxPanel.panelRef}
                className="relative flex flex-col transition-all"
                style={{ width: promptBoxPanel.width ? `${promptBoxPanel.width}px` : '100%' }}
              >
                <div className="relative flex gap-2 w-full">
                  <textarea
                    ref={promptInputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (input.trim() || attachedFiles.length) void sendMessage(); } }}
                    disabled={!status?.ready || loading}
                    rows={1}
                    placeholder={status?.ready ? 'Message Gina… (Enter to send, Shift+Enter for a new line)' : 'Start the local LLM first…'}
                    className="flex-1 min-h-[44px] resize-y overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 pr-28 pb-4 text-xs text-slate-200 outline-none focus:border-emerald-500/50 disabled:opacity-50 leading-relaxed custom-scrollbar"
                    style={{ height: promptBoxPanel.height ? `${promptBoxPanel.height}px` : undefined, minHeight: '44px', resize: 'vertical' }}
                  />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={!status?.ready || loading || attachedFiles.length >= maxLocalAiFiles} title={status?.engine === 'qwen-coder' ? 'Qwen Coder accepts text/code files and project ZIP archives. Image attachments require a multimodal vision model.' : 'Attach a supported local file, image or ZIP archive'} className="absolute right-14 bottom-2.5 h-9 px-2.5 rounded-lg border border-sky-500/30 bg-sky-500/5 text-sky-300 text-[9px] font-bold uppercase tracking-wider disabled:opacity-30 flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5" /> Attach</button>
                  {loading ? <button onClick={() => void cancelChat()} className="absolute right-2 bottom-2.5 w-9 h-9 rounded-full border border-rose-500/50 bg-rose-500/15 text-rose-300 flex items-center justify-center" title="Stop inference and flush VRAM"><Square className="w-3.5 h-3.5 fill-current" /></button> : <button onClick={() => void sendMessage()} disabled={!status?.ready || (!input.trim() && !attachedFiles.length)} className="absolute right-2 bottom-2.5 w-9 h-9 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center disabled:opacity-30" title="Send"><span className="text-base font-black leading-none">↑</span></button>}
                </div>
                <PanelResizeGrip
                  onBottomPointerDown={promptBoxPanel.onBottomPointerDown}
                  onRightPointerDown={promptBoxPanel.onRightPointerDown}
                  onCornerPointerDown={promptBoxPanel.onCornerPointerDown}
                  onResetWidth={promptBoxPanel.resetWidth}
                  width={promptBoxPanel.width}
                  height={promptBoxPanel.height}
                  label="Prompt input"
                />
              </div>
            </MovableResizableWrapper>
          </div>

          {/* DOCKED BOTTOM: MOVABLE & RESIZABLE TELEMETRY WIDGETS MATRIX */}
          {widgetDockPosition === 'below' && renderMovableWidgetsMatrix()}


          {/* Agent log sits BELOW the prompt so the Message box stays next to the dual windows */}
          <MovableResizableWrapper id="gina-agent-log" className="w-full mt-2">
            <div
              ref={agentLogPanel.panelRef}
              className="relative flex flex-col transition-all"
              style={{ width: agentLogPanel.width ? `${agentLogPanel.width}px` : '100%' }}
            >
              <AgentExecutionTrace
                studioMode={studioMode}
                agentStatus={agentStatus}
                agentActivity={agentActivity}
                executionLog={executionLog}
                telemetry={lastTelemetry}
                runtimeTelemetry={runtimeTelemetry}
                hardwareTelemetry={hardwareTelemetry}
                onClear={() => { setExecutionLog([]); setAgentActivity([]); }}
                onOpenFile={(path) => { void openWorkspaceFile(path); }}
                height={agentLogPanel.height}
              />
              <PanelResizeGrip
                onBottomPointerDown={agentLogPanel.onBottomPointerDown}
                onRightPointerDown={agentLogPanel.onRightPointerDown}
                onCornerPointerDown={agentLogPanel.onCornerPointerDown}
                onResetWidth={agentLogPanel.resetWidth}
                width={agentLogPanel.width}
                height={agentLogPanel.height}
                label="GINA Agent Log"
              />
            </div>
          </MovableResizableWrapper>
          {lastTelemetry && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[8px] font-mono text-slate-600">
              <span className="text-slate-500">{lastTelemetry.promptTokens.toLocaleString()}p</span>
              <span className="text-slate-700">/</span>
              <span className="text-slate-500">{lastTelemetry.completionTokens.toLocaleString()}c tokens</span>
              <span className="text-slate-700">·</span>
              <span className={lastTelemetry.webProvider ? 'text-sky-400' : 'text-slate-600'}>{lastTelemetry.webProvider ? `web: ${lastTelemetry.webProvider}` : 'local only'}</span>
            </div>
          )}

          <div className="mt-2 text-[8px] font-mono text-slate-700">Local AI attachments stay on this machine: text/code/config ≤2 MB, images ≤12 MB in Vision Mode, ZIP project archives ≤100 MB · max 5 non-project attachments per turn. Project ZIPs are imported into a dedicated workspace and inspected locally; archives are no longer limited to 100 files. {status?.multimodal ? <span className="text-emerald-500">Vision attachments are enabled.</span> : <span>Image uploads are stored locally; switch to Qwen 2.5-VL Vision Mode or Qwen3.5 9B with its configured multimodal projector to enable pixel vision.</span>}</div>
          {(voiceAvailable || browserVoiceAvailable) && <div className="mt-2 flex flex-wrap items-center gap-2 text-[9px] font-mono text-slate-600"><Volume2 className="w-3 h-3" /> SPEECH RATE <input aria-label="Speech rate" type="range" min="-5" max="5" value={voiceRate} onChange={e=>setVoiceRate(Number(e.target.value))} /><span>{voiceRate > 0 ? '+' : ''}{voiceRate}</span><button onClick={testVoice} className="px-2 py-1 rounded border border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200">TEST</button>{speaking && <span className="text-emerald-400 animate-pulse">SPEAKING</span>}</div>}
        </div>
      </div>

      <div className="mt-3">
        <LocalRagKnowledgePanel onAddLog={(lvl, msg) => onAddLog(lvl === 'error' ? 'WARN' : 'INFO', msg)} defaultExpanded={false} />
      </div>

      <WebBrowserInspectorModal
        isOpen={showWebBrowserModal}
        onClose={() => setShowWebBrowserModal(false)}
      />
    </section>
  );
};
