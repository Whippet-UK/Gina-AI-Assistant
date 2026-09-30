import React, { useState, useEffect, useCallback } from 'react';
import { Terminal, AlertTriangle, Trash2, Copy, Check, ChevronDown, ChevronUp, RefreshCw, X, ShieldAlert, Cpu } from 'lucide-react';
import { ComfyErrorLog, LogEntry } from '../types';

interface ComfyErrorOverlayProps {
  externalError?: {
    message: string;
    timestamp: string;
    isOOM?: boolean;
    jobId?: string;
  } | null;
  recentOOMErrors?: LogEntry[];
  onAddLog?: (level: 'INFO' | 'WARN' | 'SEC' | 'RULE', message: string, ruleId?: string) => void;
  className?: string;
}

export const ComfyErrorOverlay: React.FC<ComfyErrorOverlayProps> = ({
  externalError,
  recentOOMErrors,
  onAddLog,
  className = ''
}) => {
  const [errorLogs, setErrorLogs] = useState<ComfyErrorLog[]>([]);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isFlushing, setIsFlushing] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [lastFetchTime, setLastFetchTime] = useState<string>('');

  const fetchErrorLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/comfy/error-logs');
      if (!res.ok) return;
      const data = await res.json();
      const rawFive: ComfyErrorLog[] = Array.isArray(data.lastFive) ? data.lastFive : [];
      
      const combined = [...rawFive];

      // Merge recent OOM errors passed down from App.tsx helper
      if (recentOOMErrors && recentOOMErrors.length > 0) {
        for (const oom of recentOOMErrors) {
          const trimmed = oom.message.trim();
          if (!combined.some(e => e.line === trimmed)) {
            combined.push({
              id: `app-oom-${oom.id}`,
              timestamp: oom.timestamp,
              line: trimmed,
              isOOM: true
            });
          }
        }
      }

      // If external error is provided and not in buffer, merge it
      if (externalError && externalError.message) {
        const extLines = externalError.message.split(/\r?\n/).filter(Boolean);
        const extEntries: ComfyErrorLog[] = extLines.map((line, idx) => ({
          id: `ext-${externalError.jobId || 'job'}-${idx}`,
          timestamp: externalError.timestamp || new Date().toLocaleTimeString(),
          line: line.trim(),
          isOOM: !!externalError.isOOM || /out of memory|cuda oom|cuda error|cublas|allocation failed|c10::CUDAOutOfMemoryError|torch\.cuda\.OutOfMemoryError/i.test(line),
          jobId: externalError.jobId
        }));
        
        for (const ext of extEntries) {
          if (!combined.some(e => e.line === ext.line)) {
            combined.push(ext);
          }
        }
      }

      setErrorLogs(combined.slice(-5));
      setLastFetchTime(new Date().toLocaleTimeString());
    } catch {
      // Best-effort polling
    }
  }, [externalError, recentOOMErrors]);

  // Periodic polling every 4 seconds
  useEffect(() => {
    fetchErrorLogs();
    const interval = setInterval(fetchErrorLogs, 4000);
    return () => clearInterval(interval);
  }, [fetchErrorLogs]);

  // Auto-expand if a new CUDA OOM error occurs
  const hasOOM = errorLogs.some(l => l.isOOM) || !!externalError?.isOOM;
  useEffect(() => {
    if (hasOOM) {
      setIsExpanded(true);
    }
  }, [hasOOM]);

  const handleFlushVram = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlushing(true);
    if (onAddLog) {
      onAddLog('INFO', 'Dispatched cache flush request to ComfyUI /free API from VideoStudio HUD overlay.');
    }
    try {
      const res = await fetch('/api/comfy/clear-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unload_models: false, free_memory: true })
      });
      if (res.ok && onAddLog) {
        onAddLog('INFO', 'ComfyUI memory cache purged successfully (torch.cuda.empty_cache).');
      }
    } catch (err: any) {
      if (onAddLog) {
        onAddLog('WARN', `Failed to purge ComfyUI cache: ${err?.message || err}`);
      }
    } finally {
      setIsFlushing(false);
    }
  };

  const handleCopyLogs = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (errorLogs.length === 0) return;
    const text = errorLogs.map((l, i) => `[${l.timestamp}] [Line ${i + 1}] ${l.line}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearBuffer = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch('/api/comfy/error-logs/clear', { method: 'POST' });
      setErrorLogs([]);
      if (onAddLog) {
        onAddLog('INFO', 'ComfyUI error log overlay buffer cleared.');
      }
    } catch {
      setErrorLogs([]);
    }
  };

  // If no error logs and not expanded, display minimal clean status pill
  if (errorLogs.length === 0 && !externalError && !isExpanded) {
    return (
      <div className={`absolute bottom-2 right-2 z-20 transition-all duration-200 ${className}`}>
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-950/80 hover:bg-slate-900/90 backdrop-blur-md border border-slate-800/80 hover:border-slate-700 text-[10px] font-mono text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          title="Click to view ComfyUI log overlay"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>ComfyUI Log: <strong className="text-emerald-400 font-semibold">0 Errors</strong></span>
        </button>
      </div>
    );
  }

  return (
    <div
      id="video-comfy-error-overlay"
      className={`absolute bottom-0 left-0 right-0 z-20 backdrop-blur-md bg-slate-950/92 border-t border-slate-800/90 transition-all duration-200 ${
        isExpanded ? 'max-h-64 shadow-2xl' : 'max-h-10'
      } ${className}`}
    >
      {/* Header Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={`px-3 py-1.5 flex items-center justify-between cursor-pointer select-none transition-colors ${
          hasOOM ? 'bg-rose-950/40 hover:bg-rose-950/60' : 'hover:bg-slate-900/50'
        }`}
      >
        <div className="flex items-center gap-2 font-mono text-[10px] min-w-0">
          <Terminal className={`w-3.5 h-3.5 shrink-0 ${hasOOM ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`} />
          <span className="font-bold tracking-wider text-slate-200 uppercase">
            ComfyUI Error Sentry
          </span>
          <span className="px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800 text-[9px]">
            {errorLogs.length} / 5 Lines
          </span>

          {hasOOM && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-bold animate-pulse">
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              CUDA OOM DETECTED
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
          {hasOOM && (
            <button
              type="button"
              onClick={handleFlushVram}
              disabled={isFlushing}
              className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[9px] font-bold font-mono flex items-center gap-1 transition-colors cursor-pointer"
              title="Flush ComfyUI GPU memory cache via /free API"
            >
              {isFlushing ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Trash2 className="w-2.5 h-2.5" />}
              Flush VRAM
            </button>
          )}

          {errorLogs.length > 0 && (
            <button
              type="button"
              onClick={handleCopyLogs}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded transition-colors"
              title="Copy 5 log lines to clipboard"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          )}

          <button
            type="button"
            onClick={handleClearBuffer}
            className="p-1 text-slate-400 hover:text-rose-300 hover:bg-slate-800/60 rounded transition-colors"
            title="Clear Error Log Overlay"
          >
            <X className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded transition-colors ml-0.5"
            title={isExpanded ? 'Collapse Log Overlay' : 'Expand Log Overlay'}
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Monospace Log Lines */}
      {isExpanded && (
        <div className="px-3 pb-2.5 pt-1 space-y-1 overflow-y-auto max-h-48 custom-scrollbar">
          {errorLogs.length === 0 ? (
            <div className="text-[10px] font-mono text-slate-500 italic py-1">
              No recent ComfyUI errors recorded.
            </div>
          ) : (
            errorLogs.slice(-5).map((log, index) => {
              const isLineOOM = log.isOOM || /out of memory|cuda oom|cuda error|cublas|allocation failed|c10::CUDAOutOfMemoryError|torch\.cuda\.OutOfMemoryError/i.test(log.line);
              
              return (
                <div
                  key={log.id || `line-${index}`}
                  className={`p-1.5 rounded text-[10px] font-mono leading-relaxed flex items-start gap-2 border transition-all ${
                    isLineOOM
                      ? 'bg-rose-950/70 border-rose-500/60 text-amber-200 shadow-md shadow-rose-950/30'
                      : 'bg-slate-900/70 border-slate-800/70 text-slate-300'
                  }`}
                >
                  <span className="text-slate-500 shrink-0 select-none text-[9px]">
                    L{index + 1}
                  </span>

                  <span className="text-slate-500 shrink-0 select-none text-[9px] border-r border-slate-800 pr-1.5">
                    {log.timestamp}
                  </span>

                  <div className="flex-1 break-all min-w-0">
                    {isLineOOM ? (
                      <div className="space-y-0.5">
                        <div className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-rose-900/90 text-rose-200 border border-rose-600 font-bold text-[9px] mr-1.5">
                          <AlertTriangle className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                          CUDA OOM
                        </div>
                        <span className="text-rose-200 font-semibold">{log.line}</span>
                      </div>
                    ) : (
                      <span>{log.line}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {hasOOM && (
            <div className="mt-1.5 px-2 py-1 rounded bg-amber-950/40 border border-amber-500/30 text-[9px] font-mono text-amber-300 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Cpu className="w-3 h-3 text-amber-400" />
                VRAM Safe Tip: Switch resolution to 512x512 and duration to 1.0s (25 frames)
              </span>
              <span className="text-slate-400 text-[8px]">
                Target GPU: RTX 3070 Ti (8GB)
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
