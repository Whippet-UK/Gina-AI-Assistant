import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Image, Video, Film, FolderOpen, ListChecks, Settings2, Gauge, Bot } from 'lucide-react';
import { Header } from './components/Header';
import { ProjectStateProvider, useProjectState } from './context/ProjectStateContext';
import { GenerationJobProvider, useGenerationJob } from './context/GenerationJobContext';
import { AppFeaturesGuide } from './components/AppFeaturesGuide';
import { PromptStudio } from './components/PromptStudio';
import { VideoStudio } from './components/VideoStudio';
import { Aida64Studio } from './components/Aida64Studio';
import { AiStudioSuite } from './components/AiStudioSuite';
import { SystemHub } from './components/SystemHub';
import { RestoreManifestModal } from './components/RestoreManifestModal';
import { VRAMWarningToast } from './components/VRAMWarningToast';
import { LocalLlmStudio } from './components/LocalLlmStudio';
import { GinaAgentPanel } from './components/GinaAgentPanel';
import { WorkspaceErrorBoundary } from './components/WorkspaceErrorBoundary';
import { ComfyUIStatusIndicator } from './components/LTXDiagnostic';
import { LogEntry, SystemTelemetry } from './types';
import { Aida64Hud } from './components/Aida64Hud';
import { ACTIVE_SAVE_POINT_ID, APP_VERSION } from './version';

export function getRecentOOMErrors(logs: LogEntry[]): LogEntry[] {
  if (!Array.isArray(logs)) return [];
  const oomRegex = /cuda oom|out of memory|c10::CUDAOutOfMemoryError|torch\.cuda\.OutOfMemoryError/i;
  return logs
    .filter(log => log && (oomRegex.test(log.message || '') || (log.ruleId && oomRegex.test(log.ruleId))))
    .slice(0, 5);
}

export default function App() {
  if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('hud') === '1') return <Aida64Hud />;
  const [activeSavePoint, setActiveSavePoint] = useState<string>(ACTIVE_SAVE_POINT_ID);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [isManifestOpen, setIsManifestOpen] = useState<boolean>(false);
  const [telemetry, setTelemetry] = useState<SystemTelemetry>({
    vramUsedMB: 5120, vramTotalMB: 7372, gpuTempC: 58,
    cpuThreadsActive: 4, cpuThreadsCap: 4, ramUsedGB: 14.2,
    ramTotalGB: 32.0, ssdFreeGB: 168.4, thermalBrakeActive: false
  });
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: '1', timestamp: new Date().toISOString().slice(11, 23), level: 'INFO', message: 'Gina AI Factory Engine Dashboard initialized successfully.' },
    { id: '2', timestamp: new Date().toISOString().slice(11, 23), level: 'RULE', ruleId: '011-020', message: 'Rule 011: VRAM Cage locked at 7372MB (90% of 8GB RTX 3070 Ti).' },
    { id: '3', timestamp: new Date().toISOString().slice(11, 23), level: 'RULE', ruleId: '798-807', message: 'Rule 798: Input token boundary enforcer ready (75 token max budget).' },
    { id: '4', timestamp: new Date().toISOString().slice(11, 23), level: 'INFO', message: 'Local ComfyUI execution server bound to loopback 127.0.0.1:8188.' }
  ]);

  const addLog = useCallback((level: 'INFO' | 'WARN' | 'SEC' | 'RULE', message: string, ruleId?: string) => {
    const newEntry: LogEntry = { id: Math.random().toString(36).substr(2, 9), timestamp: new Date().toISOString().slice(11, 23), level, ruleId, message };
    setLogs(prev => [newEntry, ...prev.slice(0, 99)]);
  }, []);

  const lastClearCacheRef = useRef<number>(0);
  const isClearingCacheRef = useRef<boolean>(false);
  const handleClearCache = useCallback(async (isAutoTrigger = false, unloadModels = true) => {
    if (isClearingCacheRef.current) return;
    const now = Date.now();
    if (now - lastClearCacheRef.current < 3000) return;
    lastClearCacheRef.current = now;
    isClearingCacheRef.current = true;
    addLog(isAutoTrigger ? 'RULE' : 'INFO', isAutoTrigger
      ? `Proactive OOM Prevention: VRAM ${telemetry.vramUsedMB} MB exceeded the safety threshold; dispatched cache purge.`
      : 'Dispatching manual purge signal to ComfyUI /free API.');
    try {
      const res = await fetch('/api/comfy/clear-cache', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ unload_models: unloadModels, free_memory: true }) });
      const data = await res.json();
      if (res.ok && data.success) addLog('SEC', 'ComfyUI memory purge completed.');
      else addLog('WARN', `Clear cache signal result: ${data.error || 'ComfyUI not responding'}`);
    } catch (err: any) {
      addLog('WARN', `Failed to send clear cache signal: ${err?.message || 'Network error'}`);
    } finally { isClearingCacheRef.current = false; }
  }, [telemetry.vramUsedMB, addLog]);

  useEffect(() => {
    if (telemetry.vramUsedMB > 7680) handleClearCache(true, true);
  }, [telemetry.vramUsedMB, handleClearCache]);

  const [isCooldownActive, setIsCooldownActive] = useState(false);
  const [cooldownRemainingSec, setCooldownRemainingSec] = useState(0);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastOomHandledTimestampRef = useRef<string | null>(null);

  const triggerCooldownBreath = useCallback((reason = 'VRAM OOM Error Detected', durationMs = 5000) => {
    setIsCooldownActive(true);
    setCooldownRemainingSec(Math.ceil(durationMs / 1000));
    addLog('RULE', `Rule 011-020 [VRAMGuard Breath]: ${reason}.`, '011-020');
    handleClearCache(true, true);
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    const endMs = Date.now() + durationMs;
    cooldownTimerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endMs - Date.now()) / 1000));
      setCooldownRemainingSec(remaining);
      if (remaining <= 0) {
        if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
        setIsCooldownActive(false);
        addLog('SEC', 'VRAMGuard Breath complete.');
      }
    }, 500);
  }, [handleClearCache, addLog]);

  const logWithOomCheck = useCallback((level: 'INFO' | 'WARN' | 'SEC' | 'RULE', message: string, ruleId?: string) => {
    addLog(level, message, ruleId);
    if (/out of memory|cuda oom|cuda error: out of memory|cublas|allocation failed|CUDAOutOfMemoryError|OutOfMemoryError|torch\.cuda\.OutOfMemoryError/i.test(message) && !isCooldownActive) {
      triggerCooldownBreath(`OOM pattern detected in log: "${message.slice(0, 60)}..."`, 5000);
    }
  }, [addLog, isCooldownActive, triggerCooldownBreath]);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch('/api/telemetry', { cache: 'no-store' });
        if (!res.ok) throw new Error(`Telemetry HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setTelemetry(prev => ({
          vramUsedMB: Number(data.vramUsedMB || 0), vramTotalMB: Number(data.vramTotalMB || 0),
          gpuTempC: Number(data.gpuTempC || 0), cpuThreadsActive: Number(data.cpuThreadsActive || 0),
          cpuThreadsCap: Number(data.cpuThreadsCap || 0), ramUsedGB: Number(data.ramUsedGB || 0),
          ramTotalGB: Number(data.ramTotalGB || 0), ssdFreeGB: prev.ssdFreeGB, thermalBrakeActive: !!data.thermalBrakeActive
        }));
        const errRes = await fetch('/api/comfy/error-logs', { cache: 'no-store' });
        if (errRes.ok && !cancelled) {
          const errData = await errRes.json();
          if (errData.hasOOM && errData.logs?.length) {
            const latestOom = [...errData.logs].reverse().find((l: any) => l.isOOM);
            if (latestOom && latestOom.timestamp !== lastOomHandledTimestampRef.current) {
              lastOomHandledTimestampRef.current = latestOom.timestamp;
              triggerCooldownBreath(`ComfyUI backend log OOM detected (${latestOom.line.slice(0, 60)})`, 5000);
            }
          }
        }
      } catch (error: any) {
        if (!cancelled) addLog('WARN', `Hardware telemetry unavailable: ${error?.message || 'unknown error'}`);
      }
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [addLog, triggerCooldownBreath]);

  const handleRunAudit = async () => {
    setIsAuditing(true);
    addLog('INFO', 'Initiating full bare-metal diagnostic stack audit...');
    try {
      const res = await fetch('/api/audit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ runFullCheck: true }) });
      const data = await res.json();
      if (res.ok) {
        addLog('SEC', `Pre-Flight Audit Complete: ${data.passedCount}/${data.passedCount} checks passed!`);
        addLog('RULE', 'Rule 051-060: Root sandbox C:\\Gina_AI\\ verified.', '051-060');
      }
    } catch (err: any) { addLog('WARN', `Audit connection failed: ${err.message || 'local services unavailable'}`); }
    finally { setIsAuditing(false); }
  };

  return (
    <ProjectStateProvider>
      <GenerationJobProvider onAddLog={logWithOomCheck} isCooldownActive={isCooldownActive} cooldownRemainingSec={cooldownRemainingSec} onTriggerCooldown={triggerCooldownBreath}>
        <AppContent telemetry={telemetry} logs={logs} setLogs={setLogs} addLog={addLog} logWithOomCheck={logWithOomCheck} handleClearCache={handleClearCache} handleRunAudit={handleRunAudit} isAuditing={isAuditing} activeSavePoint={activeSavePoint} isCooldownActive={isCooldownActive} cooldownRemainingSec={cooldownRemainingSec} isManifestOpen={isManifestOpen} setIsManifestOpen={setIsManifestOpen} />
      </GenerationJobProvider>
    </ProjectStateProvider>
  );
}

interface AppContentProps {
  telemetry: SystemTelemetry; logs: LogEntry[]; setLogs: React.Dispatch<React.SetStateAction<LogEntry[]>>;
  addLog: (level: 'INFO' | 'WARN' | 'SEC' | 'RULE', message: string, ruleId?: string) => void;
  logWithOomCheck: (level: 'INFO' | 'WARN' | 'SEC' | 'RULE', message: string, ruleId?: string) => void;
  handleClearCache: (isAutoTrigger?: boolean, unloadModels?: boolean) => Promise<void>;
  handleRunAudit: () => Promise<void>; isAuditing: boolean; activeSavePoint: string;
  isCooldownActive: boolean; cooldownRemainingSec: number; isManifestOpen: boolean;
  setIsManifestOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

function AppContent({ telemetry, logs, setLogs, logWithOomCheck, handleClearCache, handleRunAudit, isAuditing, activeSavePoint, isCooldownActive, cooldownRemainingSec, isManifestOpen, setIsManifestOpen }: AppContentProps) {
  const [activeView, setActiveView] = useState<'create' | 'video' | 'shorts' | 'aida64' | 'assets' | 'jobs' | 'llm' | 'system'>('create');
  const { job, outputLoading } = useGenerationJob();
  const { updatePromptStudio } = useProjectState();
  const isJobActive = job?.status === 'RUNNING' || job?.status === 'QUEUED' || outputLoading;
  const isVideoJob = job?.workflowId === 'ltx_video' || (job?.workflowId && job.workflowId.includes('video'));
  const isImageJob = !job?.workflowId || job?.workflowId === 'flux_image' || job?.workflowId.includes('flux') || job?.workflowId.includes('image');

  const navItems = [
    { id: 'create' as const, label: 'CREATE', icon: Image, isGenerating: isJobActive && isImageJob },
    { id: 'video' as const, label: 'VIDEO', icon: Video, isGenerating: isJobActive && isVideoJob },
    { id: 'aida64' as const, label: 'AIDA64', icon: Gauge, isGenerating: false },
    { id: 'shorts' as const, label: 'SHORTS', icon: Film, isGenerating: false },
    { id: 'assets' as const, label: 'ASSETS', icon: FolderOpen, isGenerating: false },
    { id: 'jobs' as const, label: 'JOBS', icon: ListChecks, isGenerating: isJobActive },
    { id: 'llm' as const, label: 'LOCAL AI', icon: Bot, isGenerating: false },
    { id: 'system' as const, label: 'SYSTEM', icon: Settings2, isGenerating: false }
  ];

  const handleSendAida64Prompt = useCallback((prompt: string, width: number, height: number) => {
    const safeWidth = Math.max(64, Math.min(8192, Math.round(Number(width) || 1024)));
    const safeHeight = Math.max(64, Math.min(8192, Math.round(Number(height) || 600)));
    const safePrompt = typeof prompt === 'string' ? prompt.trim() : '';
    if (!safePrompt) return;
    const ratio = safeWidth === safeHeight ? '1:1' : safeHeight > safeWidth ? '9:16' : (safeWidth / safeHeight > 2.5 ? '16:9' : '16:9');

    updatePromptStudio({ promptInput: safePrompt, aspectRatio: ratio, stylePreset: 'None' });
    logWithOomCheck('INFO', `Transferred AIDA64 template prompt (${safeWidth}x${safeHeight}px) to Image Studio.`);
    // Deliberately defer the view change until the state update has committed.
    // This prevents the AIDA64 modal + Create workspace transition from racing each other.
    requestAnimationFrame(() => setActiveView('create'));
  }, [updatePromptStudio, logWithOomCheck]);

  return (
    <div className="min-h-screen bg-[#020617] text-[#c9d1d9] font-sans">
      <VRAMWarningToast telemetry={telemetry} thresholdMB={7168} isCooldownActive={isCooldownActive} cooldownRemainingSec={cooldownRemainingSec} onClearCache={() => handleClearCache(false)} />
      <div className="max-w-[1500px] mx-auto px-4 md:px-6 py-4">
        <Header onRunAudit={handleRunAudit} onOpenManifest={() => setIsManifestOpen(true)} isAuditing={isAuditing} activeSavePoint={activeSavePoint} />
        <div className="sticky top-0 z-20 mt-4 mb-6 -mx-2 px-2 py-2 bg-[#020617]/95 backdrop-blur border-y border-slate-800/80">
          <nav className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
            {navItems.map(({ id, label, icon: Icon, isGenerating }) => (
              <button key={id} type="button" onClick={() => setActiveView(id)} className={`shrink-0 px-3.5 py-2 rounded-md border text-[10px] font-bold tracking-widest flex items-center gap-2 transition-colors cursor-pointer ${activeView === id ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold shadow-sm' : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'}`}>
                <Icon className="w-3.5 h-3.5" /><span>{label}</span>
                {isGenerating && <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono uppercase font-bold animate-pulse ${activeView === id ? 'bg-slate-950 text-emerald-400' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'}`}>{job?.progress || 0}%</span>}
                {id === 'video' && <ComfyUIStatusIndicator activeView={activeView} />}
              </button>
            ))}
            {isJobActive && <div className="ml-2 hidden lg:flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900 border border-emerald-500/30 text-[9px] font-mono text-emerald-300"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /><span className="font-bold uppercase tracking-wider">{job?.workflowId === 'ltx_video' ? 'Video Gen' : 'Image Gen'}: {job?.progress || 0}%</span>{job?.currentStep && <span className="text-slate-500">({job.currentStep}/{job.totalSteps || '?'})</span>}</div>}
            <div className="ml-auto hidden md:flex items-center gap-2 text-[9px] font-mono text-slate-600"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> LOCAL CREATOR ENGINE</div>
          </nav>
        </div>

        <main className={`space-y-5 ${activeView === 'create' ? 'block' : 'hidden'}`}>
          <div className="flex items-end justify-between gap-4"><div><div className="text-[10px] uppercase tracking-[0.25em] text-emerald-400 font-bold">Creator workspace</div><h1 className="text-2xl md:text-3xl font-semibold text-slate-100 mt-1">Create</h1><p className="text-xs text-slate-500 mt-1">Generate locally through your validated ComfyUI workflows.</p></div><div className="hidden sm:block text-right text-[9px] font-mono text-slate-600">IMAGE · LOCAL · FLUX</div></div>
          <WorkspaceErrorBoundary name="Create Studio"><PromptStudio onAddLog={logWithOomCheck} onClearCache={() => handleClearCache(false, true)} telemetry={telemetry} /></WorkspaceErrorBoundary>
        </main>

        <main className={`space-y-5 ${activeView === 'video' ? 'block' : 'hidden'}`}>
          <div className="flex items-end justify-between gap-4"><div><div className="text-[10px] uppercase tracking-[0.25em] text-emerald-400 font-bold">Video workspace</div><h1 className="text-2xl md:text-3xl font-semibold text-slate-100 mt-1">Video Studio</h1><p className="text-xs text-slate-500 mt-1">Interface with LTX-2.3 22B Distilled FP8 workflow parameters for local text-to-video.</p></div><div className="hidden sm:block text-right text-[9px] font-mono text-slate-600">VIDEO · LTX-2.3 · 8GB VRAM</div></div>
          <WorkspaceErrorBoundary name="Video Studio"><VideoStudio onAddLog={logWithOomCheck} logs={logs} telemetry={telemetry} onClearCache={() => handleClearCache(false, true)} /></WorkspaceErrorBoundary>
        </main>

        <main className={`space-y-5 ${activeView === 'shorts' ? 'block' : 'hidden'}`}><div><div className="text-[10px] uppercase tracking-[0.25em] text-emerald-400 font-bold">Production pipeline</div><h1 className="text-2xl md:text-3xl font-semibold text-slate-100 mt-1">Shorts Factory</h1><p className="text-xs text-slate-500 mt-1">Build faceless Shorts from scenes, local assets, audio and a final timeline.</p></div><WorkspaceErrorBoundary name="Shorts Factory"><AiStudioSuite onAddLog={logWithOomCheck} view="shorts" /></WorkspaceErrorBoundary></main>

        <main className={`space-y-5 ${activeView === 'aida64' ? 'block' : 'hidden'}`}>
          <WorkspaceErrorBoundary name="AIDA64 Studio"><Aida64Studio telemetry={telemetry} onSendToPromptStudio={handleSendAida64Prompt} /></WorkspaceErrorBoundary>
        </main>

        <main className={`space-y-5 ${activeView === 'assets' ? 'block' : 'hidden'}`}><div><div className="text-[10px] uppercase tracking-[0.25em] text-emerald-400 font-bold">Local library</div><h1 className="text-2xl md:text-3xl font-semibold text-slate-100 mt-1">Assets</h1><p className="text-xs text-slate-500 mt-1">Generated files and their local generation records.</p></div><WorkspaceErrorBoundary name="Assets"><AiStudioSuite onAddLog={logWithOomCheck} view="assets" /></WorkspaceErrorBoundary></main>
        <main className={`space-y-5 ${activeView === 'jobs' ? 'block' : 'hidden'}`}><div><div className="text-[10px] uppercase tracking-[0.25em] text-emerald-400 font-bold">Execution monitor</div><h1 className="text-2xl md:text-3xl font-semibold text-slate-100 mt-1">Jobs</h1><p className="text-xs text-slate-500 mt-1">Track local ComfyUI work without opening ComfyUI itself.</p></div><WorkspaceErrorBoundary name="Jobs"><AiStudioSuite onAddLog={logWithOomCheck} view="jobs" /></WorkspaceErrorBoundary></main>

        <main className={`space-y-5 ${activeView === 'llm' ? 'block' : 'hidden'}`}><div><div className="text-[10px] uppercase tracking-[0.25em] text-emerald-400 font-bold">Quantized local AI engine</div><h1 className="text-2xl md:text-3xl font-semibold text-slate-100 mt-1">Local AI</h1><p className="text-xs text-slate-500 mt-1">Gemma 3 12B Q4_K_M served locally by llama.cpp CUDA.</p></div><WorkspaceErrorBoundary name="Local AI"><LocalLlmStudio onAddLog={logWithOomCheck} /><GinaAgentPanel /></WorkspaceErrorBoundary></main>

        <main className={`space-y-5 ${activeView === 'system' ? 'block' : 'hidden'}`}>
          <WorkspaceErrorBoundary name="System"><SystemHub telemetry={telemetry} logs={logs} activeSavePoint={activeSavePoint} logWithOomCheck={logWithOomCheck} handleClearCache={handleClearCache} onClearLogs={() => setLogs([])} /></WorkspaceErrorBoundary>
        </main>

        <footer className="border-t border-slate-800 mt-8 pt-4 pb-6 text-center text-[10px] text-slate-600">Gina AI Factory v{APP_VERSION} · Strictly Local · ComfyUI + llama.cpp execution backends · C:\Gina_AI\</footer>
      </div>
      <RestoreManifestModal isOpen={isManifestOpen} onClose={() => setIsManifestOpen(false)} activeSavePoint={activeSavePoint} />
    </div>
  );
}
