import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Cpu,
  Database,
  Gauge,
  GitBranch,
  Network,
  Terminal,
  Trash2
} from 'lucide-react';

interface TraceExecutionEntry {
  id: string;
  title: string;
  details: string;
  status: 'running' | 'complete' | 'error';
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

interface AgentExecutionTraceProps {
  studioMode: string;
  agentStatus: string;
  agentActivity: string[];
  executionLog: TraceExecutionEntry[];
  telemetry?: TraceTelemetry | null;
  runtimeTelemetry?: TraceTelemetry | null;
  hardwareTelemetry?: TraceHardwareTelemetry | null;
  onClear: () => void;
}

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

const formatNumber = (value: number | undefined, digits = 0) =>
  Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '0';

const uniqueActivity = (items: string[]) => {
  const seen = new Set<string>();
  return items.filter(item => {
    const normalized = String(item || '').trim();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  }).slice(-12);
};

const Sparkline: React.FC<{ values: number[]; max?: number; label: string; suffix?: string }> = ({ values, max, label, suffix = '' }) => {
  const safeValues = values.length ? values : [0];
  const ceiling = Math.max(1, max || Math.max(...safeValues));
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/80 p-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
        <span className="text-[8px] font-mono text-slate-400">{formatNumber(safeValues[safeValues.length - 1], 1)}{suffix}</span>
      </div>
      <div className="flex h-14 items-end gap-px overflow-hidden rounded bg-slate-900/80 px-1 pt-1">
        {safeValues.map((value, index) => (
          <div
            key={index}
            className="min-w-[2px] flex-1 rounded-t bg-sky-400/70"
            style={{ height: `${Math.max(3, (clamp(value / ceiling, 0, 1) * 100))}%` }}
            title={`${formatNumber(value, 1)}${suffix}`}
          />
        ))}
      </div>
    </div>
  );
};

const TraceSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  summary?: string;
  open?: boolean;
  children: React.ReactNode;
}> = ({ title, icon, summary, open = false, children }) => (
  <details open={open} className="group rounded-md border border-slate-800 bg-slate-950/80">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <ChevronRight className="h-3 w-3 shrink-0 text-slate-600 transition-transform group-open:rotate-90" />
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-300">{icon}{title}</span>
      </div>
      {summary && <span className="truncate text-[8px] font-mono text-slate-600">{summary}</span>}
    </summary>
    <div className="border-t border-slate-800/80 p-2.5">{children}</div>
  </details>
);

export const AgentExecutionTrace: React.FC<AgentExecutionTraceProps> = ({
  studioMode,
  agentStatus,
  agentActivity,
  executionLog,
  telemetry,
  runtimeTelemetry,
  hardwareTelemetry,
  onClear
}) => {
  const [expanded, setExpanded] = useState(true);
  const [tokenSamples, setTokenSamples] = useState<number[]>([]);
  const [vramSamples, setVramSamples] = useState<number[]>([]);

  const activeTelemetry = runtimeTelemetry || telemetry;
  const tps = Number(activeTelemetry?.completionTokensPerSecond || activeTelemetry?.tokensPerSecond || 0);
  const vramUsed = Number(hardwareTelemetry?.vramUsedMB || 0);
  const vramTotal = Number(hardwareTelemetry?.vramTotalMB || 8192);

  useEffect(() => {
    setTokenSamples(prev => [...prev, tps].slice(-36));
  }, [tps]);

  useEffect(() => {
    setVramSamples(prev => [...prev, vramUsed].slice(-36));
  }, [vramUsed]);

  const contextItems = useMemo(() => {
    const raw = activeTelemetry?.contextBreakdown || {};
    return Object.entries(raw)
      .map(([key, value]) => ({ key, value: Math.max(0, Number(value) || 0) }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [activeTelemetry?.contextBreakdown]);

  const contextTotal = contextItems.reduce((sum, item) => sum + item.value, 0);
  const activity = uniqueActivity(agentActivity);
  const hasTelemetry = Boolean(activeTelemetry || hardwareTelemetry);
  const statusIsError = /error|fail/i.test(agentStatus);
  const statusIsActive = /working|thinking|search|generat|read|edit|run|inspect|routing/i.test(agentStatus);

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950/95 overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-3 py-2">
        <button
          type="button"
          onClick={() => setExpanded(value => !value)}
          className="flex min-w-0 items-center gap-2 text-left"
        >
          {expanded ? <ChevronDown className="h-3.5 w-3.5 text-slate-500" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-500" />}
          <Activity className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-200">GINA AGENT LOG</span>
          <span className={`text-[8px] font-mono ${statusIsError ? 'text-rose-400' : statusIsActive ? 'text-amber-300' : 'text-emerald-400'}`}>
            ● {agentStatus}
          </span>
        </button>
        <div className="flex items-center gap-2">
          <span className="hidden text-[8px] font-mono text-slate-600 sm:inline">{studioMode}</span>
          <button
            type="button"
            onClick={onClear}
            className="rounded border border-slate-800 bg-slate-900 px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-slate-600 hover:text-slate-200"
            title="Clear current execution trace"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-2 p-2">
          <TraceSection
            title="Execution Timeline"
            icon={<GitBranch className="mr-1 inline h-3 w-3 text-violet-400" />}
            summary={`${executionLog.length} event${executionLog.length === 1 ? '' : 's'}`}
            open
          >
            {executionLog.length === 0 ? (
              <div className="text-[8px] font-mono text-slate-600">No execution events yet.</div>
            ) : (
              <div className="space-y-1">
                {executionLog.map((entry, index) => (
                  <details key={entry.id} open={entry.status === 'running' && index === executionLog.length - 1} className="rounded border border-slate-800/80 bg-slate-900/60">
                    <summary className="flex cursor-pointer list-none items-center gap-2 px-2 py-1.5">
                      {entry.status === 'error'
                        ? <AlertTriangle className="h-3 w-3 text-rose-400" />
                        : entry.status === 'running'
                          ? <Activity className="h-3 w-3 text-amber-300" />
                          : <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                      <span className="min-w-0 flex-1 truncate text-[8px] font-bold text-slate-300">{entry.title}</span>
                      <span className="text-[7px] font-mono text-slate-600">#{index + 1}</span>
                    </summary>
                    <pre className="border-t border-slate-800/70 px-2 py-2 text-[8px] leading-relaxed text-slate-500 whitespace-pre-wrap">{entry.details}</pre>
                  </details>
                ))}
              </div>
            )}
          </TraceSection>

          {activity.length > 0 && (
            <TraceSection
              title="Live Agent Trace"
              icon={<Terminal className="mr-1 inline h-3 w-3 text-sky-400" />}
              summary={`${activity.length} unique live event${activity.length === 1 ? '' : 's'}`}
              open={statusIsActive}
            >
              <div className="max-h-48 space-y-1 overflow-auto">
                {activity.map((entry, index) => (
                  <pre key={`${index}-${entry.slice(0, 30)}`} className="rounded border border-slate-800 bg-slate-900/70 px-2 py-1.5 text-[8px] leading-relaxed text-slate-500 whitespace-pre-wrap">{entry}</pre>
                ))}
              </div>
            </TraceSection>
          )}

          {hasTelemetry && (
            <TraceSection
              title="Runtime Telemetry"
              icon={<Gauge className="mr-1 inline h-3 w-3 text-emerald-400" />}
              summary={`${formatNumber(tps, 1)} tok/s · ${formatNumber(vramUsed / 1024, 2)} / ${formatNumber(vramTotal / 1024, 2)} GB VRAM`}
              open={false}
            >
              <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                <Sparkline values={tokenSamples} label="Token Throughput" suffix=" tok/s" />
                <Sparkline values={vramSamples.map(value => value / 1024)} max={vramTotal / 1024} label="VRAM Allocation" suffix=" GB" />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                <div className="rounded border border-slate-800 bg-slate-900/60 p-2"><div className="text-[7px] uppercase tracking-widest text-slate-600">Prompt</div><div className="mt-1 text-[10px] font-mono text-slate-300">{Number(activeTelemetry?.promptTokens || 0).toLocaleString()}</div></div>
                <div className="rounded border border-slate-800 bg-slate-900/60 p-2"><div className="text-[7px] uppercase tracking-widest text-slate-600">Completion</div><div className="mt-1 text-[10px] font-mono text-slate-300">{Number(activeTelemetry?.completionTokens || 0).toLocaleString()}</div></div>
                <div className="rounded border border-slate-800 bg-slate-900/60 p-2"><div className="text-[7px] uppercase tracking-widest text-slate-600">GPU Temp</div><div className="mt-1 text-[10px] font-mono text-slate-300">{formatNumber(hardwareTelemetry?.gpuTempC, 1)}°C</div></div>
                <div className="rounded border border-slate-800 bg-slate-900/60 p-2"><div className="text-[7px] uppercase tracking-widest text-slate-600">System Power</div><div className="mt-1 text-[10px] font-mono text-slate-300">{formatNumber(hardwareTelemetry?.systemPowerW || hardwareTelemetry?.estimatedWallPowerW, 0)} W</div></div>
              </div>
            </TraceSection>
          )}

          {contextItems.length > 0 && (
            <TraceSection
              title="Context Allocation"
              icon={<Database className="mr-1 inline h-3 w-3 text-cyan-400" />}
              summary={`${contextItems.length} active context sources`}
            >
              <div className="space-y-1.5">
                {contextItems.map(item => {
                  const percent = contextTotal ? (item.value / contextTotal) * 100 : 0;
                  return (
                    <div key={item.key}>
                      <div className="mb-1 flex items-center justify-between text-[7px] font-mono text-slate-500">
                        <span>{item.key}</span><span>{formatNumber(percent, 1)}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded bg-slate-900">
                        <div className="h-full rounded bg-cyan-400/70" style={{ width:`${clamp(percent)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </TraceSection>
          )}

          {hardwareTelemetry && (
            <TraceSection
              title="Hardware / Safety"
              icon={<Cpu className="mr-1 inline h-3 w-3 text-amber-400" />}
              summary={hardwareTelemetry.thermalBrakeActive ? 'THERMAL BRAKE' : `${formatNumber(hardwareTelemetry.gpuUtilizationPercent, 0)}% GPU`}
            >
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <div className="rounded border border-slate-800 bg-slate-900/60 p-2"><div className="text-[7px] uppercase tracking-widest text-slate-600">VRAM</div><div className="mt-1 text-[10px] font-mono text-slate-300">{formatNumber(vramUsed / 1024, 2)} / {formatNumber(vramTotal / 1024, 2)} GB</div></div>
                <div className="rounded border border-slate-800 bg-slate-900/60 p-2"><div className="text-[7px] uppercase tracking-widest text-slate-600">GPU Load</div><div className="mt-1 text-[10px] font-mono text-slate-300">{formatNumber(hardwareTelemetry.gpuUtilizationPercent, 0)}%</div></div>
                <div className="rounded border border-slate-800 bg-slate-900/60 p-2"><div className="text-[7px] uppercase tracking-widest text-slate-600">RAM</div><div className="mt-1 text-[10px] font-mono text-slate-300">{formatNumber(hardwareTelemetry.ramUsedGB, 1)} / {formatNumber(hardwareTelemetry.ramTotalGB, 1)} GB</div></div>
                <div className="rounded border border-slate-800 bg-slate-900/60 p-2"><div className="text-[7px] uppercase tracking-widest text-slate-600">Status</div><div className="mt-1 text-[10px] font-mono text-slate-300">{hardwareTelemetry.thermalBrakeActive ? 'Safety brake active' : 'Normal'}</div></div>
              </div>
            </TraceSection>
          )}
        </div>
      )}
    </section>
  );
};

export default AgentExecutionTrace;
