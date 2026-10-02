import React, { useEffect, useMemo, useRef } from 'react';

interface TraceExecutionEntry {
  id: string;
  title: string;
  details: string;
  status: 'running' | 'complete' | 'error';
  startedAt?: number;
  endedAt?: number;
  kind?: 'command' | 'workflow' | 'info' | 'tool';
}

interface TraceTelemetry {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  durationMs?: number;
  tokensPerSecond?: number;
  promptTokensPerSecond?: number;
  completionTokensPerSecond?: number;
  toolCalls?: number;
  source?: string;
  webProvider?: string | null;
  contextBreakdown?: Record<string, number>;
}

interface TraceHardwareTelemetry {
  vramUsedMB?: number;
  vramTotalMB?: number;
  gpuTempC?: number;
  gpuUtilizationPercent?: number;
  systemPowerW?: number;
  estimatedWallPowerW?: number;
  ramUsedGB?: number;
  ramTotalGB?: number;
  thermalBrakeActive?: boolean;
}

export type AgentActivityItem = {
  text: string;
  path?: string;
  command?: string;
  kind?: 'command' | 'file' | 'read' | 'edit' | 'info' | 'error';
  status?: 'running' | 'complete' | 'error';
};

interface AgentExecutionTraceProps {
  studioMode: string;
  agentStatus: string;
  agentActivity: Array<string | AgentActivityItem>;
  executionLog: TraceExecutionEntry[];
  telemetry?: TraceTelemetry | null;
  runtimeTelemetry?: TraceTelemetry | null;
  hardwareTelemetry?: TraceHardwareTelemetry | null;
  onClear: () => void;
  onOpenFile?: (path: string) => void;
  height?: number;
}

function ts() {
  return new Date().toISOString().slice(11, 23);
}

function fmt(n: number | undefined | null, digits = 0): string {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits > 0 ? Math.min(digits, 1) : 0 });
}

function activityText(entry: string | AgentActivityItem): string {
  if (typeof entry === 'string') return entry;
  const bits = [entry.text || entry.command || entry.path || 'activity'].filter(Boolean);
  if (entry.path && entry.text && !String(entry.text).includes(entry.path)) bits.push(`@ ${entry.path}`);
  if (entry.command && entry.text !== entry.command) bits.push(`$ ${entry.command}`);
  return bits.join(' · ');
}

function activityKind(entry: string | AgentActivityItem): string {
  if (typeof entry === 'string') return 'INFO';
  return (entry.kind || entry.status || 'info').toUpperCase();
}

function statusTone(status: string): string {
  if (/error|fail/i.test(status)) return 'text-rose-400';
  if (/ready|complete|ok|success/i.test(status)) return 'text-emerald-400';
  if (/run|active|busy|pend/i.test(status)) return 'text-amber-300';
  return 'text-slate-400';
}

/** Borderless text-stream agent execution timeline. */
export const AgentExecutionTrace: React.FC<AgentExecutionTraceProps> = ({
  studioMode,
  agentStatus,
  agentActivity,
  executionLog,
  telemetry,
  runtimeTelemetry,
  hardwareTelemetry,
  onClear,
  onOpenFile,
  height,
}) => {
  const streamRef = useRef<HTMLDivElement>(null);
  const activeTelemetry = runtimeTelemetry || telemetry;

  const lines = useMemo(() => {
    const out: Array<{ key: string; cls: string; text: string }> = [];
    const now = ts();
    out.push({ key: 'hdr-status', cls: statusTone(agentStatus), text: `${now}  STATUS   mode=${studioMode || '—'}  ● ${agentStatus || 'READY'}` });
    if (activeTelemetry) {
      const src = activeTelemetry.source || (activeTelemetry.webProvider ? 'local+web' : 'local');
      out.push({ key: 'hdr-tok', cls: 'text-slate-400', text: `${now}  TOKENS   prompt=${fmt(activeTelemetry.promptTokens)}  completion=${fmt(activeTelemetry.completionTokens)}  total=${fmt(activeTelemetry.totalTokens)}  ${fmt(activeTelemetry.completionTokensPerSecond ?? activeTelemetry.tokensPerSecond, 1)} t/s  tools=${fmt(activeTelemetry.toolCalls)}  src=${src}${activeTelemetry.webProvider ? `  web=${activeTelemetry.webProvider}` : ''}` });
      if (activeTelemetry.durationMs != null) {
        out.push({ key: 'hdr-dur', cls: 'text-slate-500', text: `${now}  TIMING   duration=${fmt(activeTelemetry.durationMs)}ms` });
      }
    }
    if (hardwareTelemetry) {
      const wall = hardwareTelemetry.systemPowerW ?? hardwareTelemetry.estimatedWallPowerW;
      out.push({ key: 'hdr-hw', cls: 'text-slate-500', text: `${now}  HARDWARE vram=${fmt((hardwareTelemetry.vramUsedMB || 0) / 1024, 2)}/${fmt((hardwareTelemetry.vramTotalMB || 0) / 1024, 2)}GB  gpu=${fmt(hardwareTelemetry.gpuTempC, 0)}°C  util=${fmt(hardwareTelemetry.gpuUtilizationPercent, 0)}%  wall≈${fmt(wall, 0)}W  ram=${fmt(hardwareTelemetry.ramUsedGB, 1)}/${fmt(hardwareTelemetry.ramTotalGB, 1)}GB${hardwareTelemetry.thermalBrakeActive ? '  THERMAL_BRAKE' : ''}` });
    }
    const activity = Array.isArray(agentActivity) ? agentActivity : [];
    if (activity.length === 0 && (!executionLog || executionLog.length === 0)) {
      out.push({ key: 'idle', cls: 'text-slate-600', text: `${now}  IDLE     waiting for agent activity…` });
    }
    activity.slice(-80).forEach((entry, i) => {
      const kind = activityKind(entry);
      const text = activityText(entry);
      const st = typeof entry === 'object' && entry?.status ? entry.status : '';
      out.push({ key: `act-${i}-${text.slice(0, 24)}`, cls: statusTone(st || kind), text: `${now}  ${kind.padEnd(8)} ${text}` });
    });
    (executionLog || []).slice(-80).forEach((step, i) => {
      const kind = (step.kind || 'step').toUpperCase();
      const dur = step.startedAt && step.endedAt && step.endedAt >= step.startedAt ? `${step.endedAt - step.startedAt}ms` : step.status === 'running' ? '…' : '';
      out.push({ key: `ex-${step.id || i}`, cls: statusTone(step.status), text: `${now}  ${kind.padEnd(8)} [${step.status}] ${step.title}${dur ? `  (${dur})` : ''}` });
      if (step.details && step.details.trim() && step.details.trim() !== step.title) {
        out.push({ key: `exd-${step.id || i}`, cls: 'text-slate-500', text: `${now}           ${step.details.trim().replace(/\s+/g, ' ').slice(0, 400)}` });
      }
    });
    return out;
  }, [studioMode, agentStatus, agentActivity, executionLog, activeTelemetry, hardwareTelemetry]);

  useEffect(() => {
    if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [lines]);

  const style: React.CSSProperties = height && height > 80 ? { height, minHeight: height } : { minHeight: 160, maxHeight: 420 };

  return (
    <div className="gina-console-shell w-full" style={style}>
      <div className="gina-console-toolbar">
        <span className="text-[10px] font-bold tracking-[0.2em] text-emerald-400 uppercase">Agent execution</span>
        <span className={`text-[10px] font-mono ${statusTone(agentStatus)}`}>● {agentStatus || 'READY'}</span>
        <span className="text-[10px] font-mono text-slate-600">{studioMode}</span>
        <button type="button" onClick={onClear} className="ml-auto gina-console-action text-slate-500 hover:text-rose-300" title="Clear agent log">clear</button>
      </div>
      <div ref={streamRef} className="gina-console-stream font-mono text-[11px] leading-5 overflow-y-auto custom-scrollbar flex-1 min-h-0">
        {lines.map((line) => (
          <div
            key={line.key}
            className={`gina-console-line whitespace-pre-wrap break-words ${line.cls}`}
            onClick={() => {
              if (!onOpenFile) return;
              const m = line.text.match(/@\s+(\S+)/) || line.text.match(/([A-Za-z]:\\[^\s]+|\/[^\s]+\.\w{1,8})/);
              if (m?.[1]) onOpenFile(m[1]);
            }}
            role={onOpenFile ? 'button' : undefined}
            tabIndex={onOpenFile ? 0 : undefined}
          >
            {line.text}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AgentExecutionTrace;
