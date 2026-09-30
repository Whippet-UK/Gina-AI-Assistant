import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ginaPanelStyle } from './ResizablePanels';
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
  Loader2,
  Terminal,
  Trash2
} from 'lucide-react';
import { smoothSamples } from '../lib/ginaMath';
import { PanelResizeGrip, useResizablePanel } from './PanelResizeGrip';

interface TraceExecutionEntry {
  id: string;
  title: string;
  details: string;
  status: 'running' | 'complete' | 'error';
  /** epoch ms when the step started */
  startedAt?: number;
  /** epoch ms when the step finished */
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
}

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

const formatNumber = (value: number | undefined, digits = 0) =>
  Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '0';

/** Format elapsed ms as "12s" / "1m 28s" / "1h 2m 05s". */
const formatElapsed = (ms: number): string => {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${String(s).padStart(2, '0')}s`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
};

const normalizeActivity = (items: Array<string | AgentActivityItem>): AgentActivityItem[] => {
  const seen = new Set<string>();
  const out: AgentActivityItem[] = [];
  for (const item of items) {
    const entry: AgentActivityItem = typeof item === 'string' ? { text: item } : item;
    const key = `${entry.kind || ''}|${entry.path || ''}|${entry.text}`.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
  }
  return out.slice(-40);
};

const Sparkline: React.FC<{ values: number[]; max?: number; label: string; suffix?: string; color?: string }> = ({
  values,
  max,
  label,
  suffix = '',
  color = '#38bdf8'
}) => {
  const safeValues = values.length ? values : [0];
  const ceiling = Math.max(1e-6, max || Math.max(...safeValues, 0));
  const width = 240;
  const height = 56;
  const padX = 4;
  const padY = 6;
  const n = safeValues.length;
  const points = safeValues.map((value, index) => {
    const x = padX + (n <= 1 ? width / 2 : (index / (n - 1)) * (width - padX * 2));
    const y = height - padY - clamp(value / ceiling, 0, 1) * (height - padY * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const linePath = points.length ? `M ${points.join(' L ')}` : '';
  const areaPath = points.length
    ? `M ${padX},${height - padY} L ${points.join(' L ')} L ${width - padX},${height - padY} Z`
    : '';
  const last = safeValues[safeValues.length - 1] ?? 0;

  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/80 p-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
        <span className="text-[8px] font-mono tabular-nums text-slate-300">
          {formatNumber(last, 1)}{suffix}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-14 w-full overflow-visible rounded bg-slate-900/80"
        preserveAspectRatio="none"
        role="img"
        aria-label={`${label} ${formatNumber(last, 1)}${suffix}`}
      >
        <defs>
          <linearGradient id={`spark-fill-${label.replace(/\s+/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* baseline grid */}
        <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} stroke="#1e293b" strokeWidth="1" />
        {areaPath && (
          <path d={areaPath} fill={`url(#spark-fill-${label.replace(/\s+/g, '-')})`} stroke="none" />
        )}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {/* latest point marker */}
        {points.length > 0 && (() => {
          const [lx, ly] = points[points.length - 1].split(',').map(Number);
          return <circle cx={lx} cy={ly} r="2.25" fill={color} stroke="#0f172a" strokeWidth="1" />;
        })()}
      </svg>
    </div>
  );
};

const TraceSection: React.FC<{
  id: string;
  title: string;
  icon: React.ReactNode;
  summary?: string;
  open?: boolean;
  defaultHeight?: number;
  minHeight?: number;
  maxHeight?: number;
  children: React.ReactNode;
}> = ({
  id,
  title,
  icon,
  summary,
  open: controlledOpen = false,
  defaultHeight = 160,
  minHeight = 40,
  maxHeight = 700,
  children
}) => {
  const [isOpen, setIsOpen] = useState(controlledOpen);
  const {
    panelRef,
    height,
    width,
    resetWidth,
    onBottomPointerDown,
    onRightPointerDown,
    onCornerPointerDown
  } = useResizablePanel({
    storageKey: `gina.ui.trace.${id}`,
    defaultHeight,
    minHeight,
    maxHeight
  });

  useEffect(() => {
    if (controlledOpen) setIsOpen(true);
  }, [controlledOpen]);

  return (
    <div
      ref={panelRef}
      className="relative rounded-md border border-slate-800 bg-slate-950/80 flex flex-col transition-[border-color,background-color]"
      style={{
        width: width ? `${width}px` : '100%'
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(v => !v)}
        className="flex cursor-pointer w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-slate-900/50 transition-colors select-none shrink-0"
      >
        <div className="flex min-w-0 items-center gap-2">
          <ChevronRight className={`h-3 w-3 shrink-0 text-slate-500 transition-transform ${isOpen ? 'rotate-90 text-emerald-400' : ''}`} />
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-300 flex items-center">{icon}{title}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {width && (
            <span className="text-[7px] font-mono text-emerald-400/80 bg-slate-900 px-1 rounded border border-slate-800">
              {width}px wide
            </span>
          )}
          {summary && <span className="truncate text-[8px] font-mono text-slate-500">{summary}</span>}
        </div>
      </button>
      {isOpen && (
        <>
          <div
            className="border-t border-slate-800/80 p-2.5 overflow-y-auto custom-scrollbar"
            style={{ height: `${height}px`, minHeight: `${minHeight}px` }}
          >
            {children}
          </div>
          <PanelResizeGrip
            onBottomPointerDown={onBottomPointerDown}
            onRightPointerDown={onRightPointerDown}
            onCornerPointerDown={onCornerPointerDown}
            onResetWidth={resetWidth}
            width={width}
            height={height}
            label={title}
          />
        </>
      )}
      {!isOpen && onRightPointerDown && (
        <PanelResizeGrip
          onRightPointerDown={onRightPointerDown}
          onResetWidth={resetWidth}
          width={width}
          label={title}
        />
      )}
    </div>
  );
};

export const AgentExecutionTrace: React.FC<AgentExecutionTraceProps> = ({
  studioMode,
  agentStatus,
  agentActivity,
  executionLog,
  telemetry,
  runtimeTelemetry,
  hardwareTelemetry,
  onClear,
  onOpenFile
}) => {
  const [expanded, setExpanded] = useState(false);
  const [tokenSamples, setTokenSamples] = useState<number[]>([]);
  const [vramSamples, setVramSamples] = useState<number[]>([]);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);

  const activeTelemetry = runtimeTelemetry || telemetry;
  const tps = Number(activeTelemetry?.completionTokensPerSecond || activeTelemetry?.tokensPerSecond || 0);
  const vramUsed = Number(hardwareTelemetry?.vramUsedMB || 0);
  const vramTotal = Number(hardwareTelemetry?.vramTotalMB || 8192);

  const statusIsError = /error|fail/i.test(agentStatus);
  const statusIsActive = /working|thinking|search|generat|read|edit|run|inspect|routing|received|rendering|preparing/i.test(agentStatus);

  // Live "Working for Xm Ys" clock — ticks while a step is active.
  useEffect(() => {
    if (statusIsActive && sessionStartedAt == null) {
      setSessionStartedAt(Date.now());
    }
    if (!statusIsActive && /ready|completed|error/i.test(agentStatus)) {
      // keep last sessionStartedAt so completed duration remains visible until clear
    }
    const id = window.setInterval(() => setNowMs(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [statusIsActive, agentStatus, sessionStartedAt]);

  // Sample on value change AND on a steady interval so sparklines keep
  // animating while a long generation holds a stable tok/s reading.
  useEffect(() => {
    setTokenSamples(prev => [...prev, tps].slice(-48));
    setVramSamples(prev => [...prev, vramUsed].slice(-48));
    const id = window.setInterval(() => {
      setTokenSamples(prev => [...prev, tps].slice(-48));
      setVramSamples(prev => [...prev, vramUsed].slice(-48));
    }, 1200);
    return () => window.clearInterval(id);
  }, [tps, vramUsed]);

  const smoothedTokenSamples = useMemo(() => smoothSamples(tokenSamples, 0.4), [tokenSamples]);
  const smoothedVramSamples = useMemo(() => smoothSamples(vramSamples, 0.35), [vramSamples]);

  const contextItems = useMemo(() => {
    const raw = activeTelemetry?.contextBreakdown || {};
    return Object.entries(raw)
      .map(([key, value]) => ({ key, value: Math.max(0, Number(value) || 0) }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [activeTelemetry?.contextBreakdown]);

  const contextTotal = contextItems.reduce((sum, item) => sum + item.value, 0);
  const activity = normalizeActivity(agentActivity);
  const hasTelemetry = Boolean(activeTelemetry || hardwareTelemetry);

  const workingElapsedMs = sessionStartedAt != null ? nowMs - sessionStartedAt : 0;
  const runningEntry = executionLog.find(e => e.status === 'running');
  const stepElapsedMs = runningEntry?.startedAt != null ? nowMs - runningEntry.startedAt : workingElapsedMs;

  return (
    <section
      className="relative bg-slate-950/95 overflow-hidden flex flex-col"
      style={ginaPanelStyle()}
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-3 py-2 shrink-0">
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
          {statusIsActive && (
            <span className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-mono font-bold text-amber-300">
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
              Working for {formatElapsed(stepElapsedMs)}
            </span>
          )}
          {!statusIsActive && sessionStartedAt != null && workingElapsedMs > 0 && (
            <span className="text-[8px] font-mono text-slate-600">
              last run {formatElapsed(workingElapsedMs)}
            </span>
          )}
        </button>
        <div className="flex items-center gap-2">
          <span className="hidden text-[8px] font-mono text-slate-600 sm:inline">{studioMode}</span>
          <button
            type="button"
            onClick={() => {
              setSessionStartedAt(null);
              onClear();
            }}
            className="rounded border border-slate-800 bg-slate-900 px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-slate-600 hover:text-slate-200"
            title="Clear current execution trace"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-2 p-2 overflow-x-auto custom-scrollbar">
          <TraceSection
            id="executionTimeline"
            title="Execution Timeline"
            icon={<GitBranch className="mr-1 inline h-3 w-3 text-violet-400" />}
            summary={`${executionLog.length} event${executionLog.length === 1 ? '' : 's'}${statusIsActive ? ` · live ${formatElapsed(stepElapsedMs)}` : ''}`}
            open
            defaultHeight={120}
          >
            {executionLog.length === 0 ? (
              <div className="text-[8px] font-mono text-slate-600">No execution events yet.</div>
            ) : (
              <div className="space-y-1.5">
                {executionLog.map((entry, index) => {
                  const isRunning = entry.status === 'running';
                  const elapsed = entry.startedAt != null
                    ? (entry.endedAt ?? nowMs) - entry.startedAt
                    : null;
                  const kindLabel =
                    entry.kind === 'command' ? 'Ran command'
                      : entry.kind === 'tool' ? 'Tool call'
                        : entry.kind === 'workflow' ? 'Workflow'
                          : 'Step';
                  const kindBadge =
                    entry.kind === 'command'
                      ? 'bg-violet-500/15 text-violet-300 border-violet-500/30'
                      : entry.kind === 'tool'
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        : entry.kind === 'workflow'
                          ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700';
                  return (
                    <details
                      key={entry.id}
                      open={isRunning || index >= executionLog.length - 3}
                      className={`rounded-md border bg-slate-900/60 transition-shadow ${
                        entry.status === 'error'
                          ? 'border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.12)]'
                          : isRunning
                            ? 'border-amber-500/40 shadow-[0_0_14px_rgba(251,191,36,0.15)]'
                            : entry.status === 'complete'
                              ? 'border-emerald-500/20'
                              : 'border-slate-800/80'
                      }`}
                    >
                      <summary className="flex cursor-pointer list-none items-center gap-2 px-2.5 py-1.5">
                        {entry.status === 'error'
                          ? <AlertTriangle className="h-3 w-3 shrink-0 text-rose-400" />
                          : isRunning
                            ? <Loader2 className="h-3 w-3 shrink-0 animate-spin text-amber-300" />
                            : <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-400" />}
                        <span className={`rounded border px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider shrink-0 ${kindBadge}`}>
                          {kindLabel}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[9px] font-semibold text-slate-100">
                          {entry.title}
                        </span>
                        {elapsed != null && (
                          <span className={`text-[8px] font-mono tabular-nums ${isRunning ? 'text-amber-300 font-bold' : 'text-slate-500'}`}>
                            {isRunning ? `Working for ${formatElapsed(elapsed)}` : formatElapsed(elapsed)}
                          </span>
                        )}
                        <span className="text-[7px] font-mono text-slate-700">#{index + 1}</span>
                      </summary>
                      <pre className="border-t border-slate-800/70 bg-slate-950/50 px-2.5 py-2 text-[8px] leading-relaxed text-slate-300 whitespace-pre-wrap font-mono">
                        {entry.details}
                      </pre>
                    </details>
                  );
                })}
              </div>
            )}
          </TraceSection>

          <TraceSection
            id="liveAgentTrace"
            title="Live Agent Trace"
            icon={<Terminal className="mr-1 inline h-3 w-3 text-sky-400" />}
            summary={activity.length ? `${activity.length} live event${activity.length === 1 ? '' : 's'}` : 'waiting…'}
            open={statusIsActive || activity.length > 0}
            defaultHeight={120}
          >
            {activity.length === 0 ? (
              <div className="text-[8px] font-mono text-slate-600">No live agent events yet — steps appear here as Gina works.</div>
            ) : (
              <div className="space-y-1.5">
                {activity.map((entry, index) => {
                  const text = entry.text || '';
                  const isExec = entry.kind === 'command' || /EXEC_STEP|Ran a command|command/i.test(text);
                  const isFile = entry.kind === 'file' || entry.kind === 'read' || entry.kind === 'edit' || /FILE_STEP|Wrote|Read|Edited/i.test(text);
                  const isErr = entry.status === 'error' || entry.kind === 'error' || /fail|error|✗/i.test(text);
                  return (
                    <div
                      key={`${index}-${(entry.path || text).slice(0, 40)}`}
                      className={`rounded-md border px-2.5 py-1.5 text-[8px] leading-relaxed font-mono ${
                        isErr
                          ? 'border-rose-500/30 bg-rose-950/30 text-rose-200'
                          : isExec
                            ? 'border-violet-500/25 bg-violet-950/20 text-violet-100'
                            : isFile
                              ? 'border-sky-500/25 bg-sky-950/20 text-sky-100'
                              : 'border-slate-800 bg-slate-900/70 text-slate-300'
                      }`}
                    >
                      <pre className="whitespace-pre-wrap m-0">{text}</pre>
                      {(entry.path || entry.command) && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {entry.path && (
                            <button
                              type="button"
                              onClick={() => onOpenFile?.(entry.path!)}
                              className="inline-flex items-center gap-1 rounded border border-sky-500/40 bg-sky-500/10 px-1.5 py-0.5 text-[8px] font-bold text-sky-300 hover:bg-sky-500/20"
                              title={`Open ${entry.path}`}
                            >
                              📄 {entry.path.split(/[/\\]/).pop()}
                            </button>
                          )}
                          {entry.command && (
                            <span className="rounded border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 text-[7px] text-violet-200 truncate max-w-full">
                              $ {entry.command.slice(0, 120)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TraceSection>

          {hasTelemetry && (
            <TraceSection
              id="runtimeTelemetry"
              title="Runtime Telemetry"
              icon={<Gauge className="mr-1 inline h-3 w-3 text-emerald-400" />}
              summary={`${formatNumber(tps, 1)} tok/s · ${formatNumber(vramUsed / 1024, 2)} / ${formatNumber(vramTotal / 1024, 2)} GB VRAM`}
              open={Number(activeTelemetry?.promptTokens || 0) + Number(activeTelemetry?.completionTokens || 0) > 0 || statusIsActive}
              defaultHeight={180}
            >
              <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                <Sparkline values={smoothedTokenSamples} label="Token Throughput" suffix=" tok/s" color="#38bdf8" />
                <Sparkline values={smoothedVramSamples.map(value => value / 1024)} max={vramTotal / 1024} label="VRAM Allocation" suffix=" GB" color="#34d399" />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                <div className="rounded border border-slate-800 bg-slate-900/60 p-2"><div className="text-[7px] uppercase tracking-widest text-slate-600">Prompt</div><div className="mt-1 text-[10px] font-mono text-slate-300">{Number(activeTelemetry?.promptTokens || 0).toLocaleString()}</div></div>
                <div className="rounded border border-slate-800 bg-slate-900/60 p-2"><div className="text-[7px] uppercase tracking-widest text-slate-600">Completion</div><div className="mt-1 text-[10px] font-mono text-slate-300">{Number(activeTelemetry?.completionTokens || 0).toLocaleString()}</div></div>
                <div className="rounded border border-slate-800 bg-slate-900/60 p-2"><div className="text-[7px] uppercase tracking-widest text-slate-600">GPU Temp</div><div className="mt-1 text-[10px] font-mono text-slate-300">{formatNumber(hardwareTelemetry?.gpuTempC, 1)}°C</div></div>
                <div className="rounded border border-slate-800 bg-slate-900/60 p-2"><div className="text-[7px] uppercase tracking-widest text-slate-600">System Power</div><div className="mt-1 text-[10px] font-mono text-slate-300">{formatNumber(hardwareTelemetry?.systemPowerW || hardwareTelemetry?.estimatedWallPowerW, 0)} W</div></div>
              </div>
            </TraceSection>
          )}

          <TraceSection
            id="mcpToolLogs"
            title="MCP / Tool Logs"
            icon={<Terminal className="mr-1 inline h-3 w-3 text-amber-400" />}
            summary={
              activity.filter(e => /mcp|tool|FILE_STEP|EXEC_STEP|BROADCASTER|validator/i.test(e.text)).length
                ? `${activity.filter(e => /mcp|tool|FILE_STEP|EXEC_STEP|BROADCASTER|validator/i.test(e.text)).length} tool events`
                : studioMode === 'web-app'
                  ? 'Web App Studio (no MCP tools)'
                  : 'No MCP tool calls yet'
            }
            open={false}
            defaultHeight={140}
          >
            {(() => {
              const mcpEntries = activity.filter(e => /mcp|tool|FILE_STEP|EXEC_STEP|BROADCASTER|validator|tool-call|tools\/call/i.test(e.text));
              if (mcpEntries.length === 0) {
                return (
                  <div className="text-[8px] font-mono text-slate-600">
                    {studioMode === 'web-app'
                      ? 'Web App Studio is an artifact lane — it does not invoke MCP tools. Tool/MCP logs appear here for Code Engine and agent runs.'
                      : 'Waiting for MCP tool calls or agent file/exec steps…'}
                  </div>
                );
              }
              return (
                <div className="space-y-1 overflow-auto">
                  {mcpEntries.slice(-16).map((entry, index) => (
                    <pre key={`mcp-${index}-${entry.text.slice(0, 24)}`} className="rounded border border-slate-800 bg-slate-900/70 px-2 py-1.5 text-[8px] leading-relaxed text-slate-500 whitespace-pre-wrap">{entry.text}</pre>
                  ))}
                </div>
              );
            })()}
          </TraceSection>

          {contextItems.length > 0 && (
            <TraceSection
              id="contextAllocation"
              title="Context Allocation"
              icon={<Database className="mr-1 inline h-3 w-3 text-cyan-400" />}
              summary={`${contextItems.length} active context sources`}
              open={false}
              defaultHeight={130}
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
              id="hardwareSafety"
              title="Hardware / Safety"
              icon={<Cpu className="mr-1 inline h-3 w-3 text-amber-400" />}
              summary={hardwareTelemetry.thermalBrakeActive ? 'THERMAL BRAKE' : `${formatNumber(hardwareTelemetry.gpuUtilizationPercent, 0)}% GPU`}
              open={false}
              defaultHeight={110}
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