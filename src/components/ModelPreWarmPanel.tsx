import React, { useState, useEffect, useCallback } from 'react';
import { Flame, Trash2, Cpu, RefreshCw, CheckCircle2, Layers, AlertCircle, ArrowRightLeft, Sparkles, Video, Image as ImageIcon, Film, Zap, Music } from 'lucide-react';
import { ModelPreWarmState, PreWarmModelDef } from '../types';

interface ModelPreWarmPanelProps {
  onAddLog: (level: 'INFO' | 'WARN' | 'SEC' | 'RULE', message: string, ruleId?: string) => void;
  onClearCache?: () => void;
}

export const ModelPreWarmPanel: React.FC<ModelPreWarmPanelProps> = ({ onAddLog, onClearCache }) => {
  const [state, setState] = useState<ModelPreWarmState | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/models/prewarm', { cache: 'no-store' });
      if (!res.ok) return;
      const data: ModelPreWarmState = await res.json();
      setState(data);
    } catch {
      // Best effort fetch
    }
  }, []);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 6000);
    return () => clearInterval(interval);
  }, [fetchState]);

  const handlePreWarm = async (model: PreWarmModelDef) => {
    setActionInProgress(model.id);
    onAddLog(
      'INFO',
      `Switching Pre-Warm state to ${model.name} (${model.filename}). Unloading inactive weights to reserve ${model.vramFootprintMB} MB headroom...`
    );

    try {
      const res = await fetch('/api/models/prewarm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId: model.id, filename: model.filename, workflowId: model.workflowId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setState(data.state);
        onAddLog('SEC', `Model Pre-Warm Activated: ${model.name} is ready in VRAM.`);
      } else {
        onAddLog('WARN', `Pre-warm switch warning: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      onAddLog('WARN', `Failed to switch pre-warm model: ${err?.message || 'Network error'}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleUnloadAll = async () => {
    setActionInProgress('unload_all');
    onAddLog('RULE', 'Unloading all active models and tensor caches from VRAM to establish cold baseline.', '011-020');

    try {
      const res = await fetch('/api/models/unload', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setState(data.state);
        onAddLog('SEC', 'All models safely evicted from GPU VRAM. CUDA cache reset.');
      } else {
        onAddLog('WARN', `Unload response: ${data.message || 'Models reset'}`);
      }
    } catch (err: any) {
      onAddLog('WARN', `Failed to dispatch model eviction: ${err?.message || err}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleFlushCacheOnly = async () => {
    setActionInProgress('flush_cache');
    onAddLog('INFO', 'Dispatching latent memory flush (/free) to ComfyUI...');
    if (onClearCache) {
      onClearCache();
    } else {
      try {
        await fetch('/api/comfy/clear-cache', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ unload_models: false, free_memory: true })
        });
      } catch {
        // silent
      }
    }
    setTimeout(() => {
      setActionInProgress(null);
      fetchState();
    }, 600);
  };

  const activeModelObj = state?.models?.find(m => m.filename === state.activeModel);
  const vramCageMB = state?.targetGpuCageMB || 7372;
  const activeFootprintMB = activeModelObj ? activeModelObj.vramFootprintMB : 0;
  const vramPercent = Math.min(100, Math.round((activeFootprintMB / vramCageMB) * 100));

  return (
    <section id="model-prewarm-sentry" className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 mb-5 shadow-sm">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Model Pre-Warm & VRAM Headspace Manager
              </h2>
              <span className={`px-2 py-0.5 rounded text-[9px] font-mono border font-bold uppercase ${
                state?.status === 'warm'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : state?.status === 'unloaded'
                  ? 'bg-slate-800 text-slate-400 border-slate-700'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                {state?.status === 'warm' ? 'WARM IN VRAM' : state?.status === 'unloaded' ? 'ALL UNLOADED' : 'SWITCHING'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Arm the exact workflow/model target and evict inactive tensors before execution. ComfyUI loads the selected weights when the workflow runs.
            </p>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
          <button
            type="button"
            onClick={handleFlushCacheOnly}
            disabled={actionInProgress !== null}
            className="px-2.5 py-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Flush intermediate tensors and latent caches without unloading models"
          >
            <Zap className={`w-3 h-3 text-amber-400 ${actionInProgress === 'flush_cache' ? 'animate-spin' : ''}`} />
            Flush Cache
          </button>

          <button
            type="button"
            onClick={handleUnloadAll}
            disabled={actionInProgress !== null}
            className="px-2.5 py-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Unload all model weights and evict PyTorch CUDA cache"
          >
            <Trash2 className={`w-3 h-3 text-rose-400 ${actionInProgress === 'unload_all' ? 'animate-spin' : ''}`} />
            Unload All Models
          </button>

          <button
            type="button"
            onClick={() => { setLoading(true); fetchState().finally(() => setLoading(false)); }}
            disabled={loading}
            className="px-2 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="Rescan Pre-Warm State"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Active Model Memory Allocation Bar */}
      <div className="bg-slate-950 border border-slate-800 rounded p-3 mb-4">
        <div className="flex items-center justify-between text-xs font-mono mb-2">
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400 text-[11px]">ARMED MODEL BUDGET:</span>
            <span className="text-slate-200 font-bold">
              {activeModelObj ? activeModelObj.name : 'None (Cold / Empty VRAM)'}
            </span>
          </div>
          <div className="text-slate-400 text-[11px]">
            <span className={activeFootprintMB > 7000 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
              {activeFootprintMB} MB
            </span>
            <span className="text-slate-600"> / </span>
            <span className="text-slate-400">{vramCageMB} MB VRAM Cap (RTX 3070 Ti)</span>
          </div>
        </div>

        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden flex border border-slate-800">
          <div
            className={`h-full transition-all duration-300 ${
              vramPercent >= 90 ? 'bg-rose-500' : vramPercent >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${vramPercent}%` }}
          />
          <div
            className="h-full bg-slate-800/60"
            style={{ width: `${100 - vramPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-1.5">
          <span>0 MB</span>
          <span>Budget Headroom: <strong className="text-slate-300">{Math.max(0, vramCageMB - activeFootprintMB)} MB</strong></span>
          <span>{vramCageMB} MB Limit (90% Cage)</span>
        </div>
      </div>

      {/* Model Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {(state?.models || []).map((m) => {
          const isWarm = state?.activeModel === m.filename && state?.status === 'warm';
          const isSwitching = actionInProgress === m.id;

          const IconComponent = m.type === 'video' ? Video : m.type === 'shorts' ? Film : m.type === 'audio' || m.type === 'music' ? Music : ImageIcon;

          return (
            <div
              key={m.id}
              className={`rounded-lg p-3.5 flex flex-col justify-between border transition-all ${
                isWarm
                  ? 'bg-emerald-950/20 border-emerald-500/50 shadow-md shadow-emerald-950/20'
                  : 'bg-slate-950/90 border-slate-800/90 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Badge & Type */}
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                    <IconComponent className={`w-3.5 h-3.5 ${isWarm ? 'text-emerald-400' : 'text-slate-400'}`} />
                    {m.name}
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-slate-900 border border-slate-800 text-slate-400 uppercase">
                    {m.type}
                  </span>
                </div>

                <div className="text-[10px] font-mono text-slate-500 mb-2 truncate" title={m.filename}>
                  {m.filename}
                </div>

                <p className="text-[10px] text-slate-400 leading-relaxed mb-3">
                  {m.description}
                </p>
              </div>

              <div>
                {/* VRAM Footprint Gauge */}
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-slate-800/80 pt-2 mb-2.5">
                  <span>Footprint:</span>
                  <span className="font-bold text-slate-200">{m.vramFootprintMB} MB</span>
                </div>

                {/* Switch / Pre-Warm Button */}
                {isWarm ? (
                  <div className="w-full py-1.5 px-3 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-center gap-1.5 text-[10px] font-bold font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ARMED FOR NEXT RUN
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handlePreWarm(m)}
                    disabled={actionInProgress !== null}
                    className="w-full py-1.5 px-3 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-200 flex items-center justify-center gap-1.5 text-[10px] font-bold font-mono transition-colors cursor-pointer"
                  >
                    <ArrowRightLeft className={`w-3 h-3 text-amber-400 ${isSwitching ? 'animate-spin' : ''}`} />
                    {isSwitching ? 'Arming Target...' : 'Arm Model & Flush'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
