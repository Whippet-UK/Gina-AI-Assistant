import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertOctagon,
  Activity,
  Layers,
  Cpu,
  RefreshCw,
  Trash2,
  Zap,
  BarChart2,
  PieChart as PieIcon,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Info
} from 'lucide-react';
import { SystemTelemetry } from '../types';

interface VRAMOomFrequencyChartProps {
  telemetry?: SystemTelemetry;
  onAddLog?: (level: 'INFO' | 'WARN' | 'SEC' | 'RULE', message: string, ruleId?: string) => void;
  onClearCache?: () => void;
}

interface TimelinePoint {
  time: string;
  timestamp: string;
  fluxSchnell: number;
  ltxVideo2b: number;
  wanVideo: number;
  hunyuan: number;
  other: number;
  totalOOM: number;
  peakVramMB: number;
}

interface ModelStat {
  modelId: string;
  modelName: string;
  filename: string;
  vramFootprintMB: number;
  color: string;
  oomCount: number;
  totalRuns: number;
  oomRatePercent: number;
  avgPeakVramMB: number;
  status: 'SAFE' | 'WARN' | 'CRITICAL';
}

interface NodeStageStat {
  stage: string;
  nodeName: string;
  count: number;
  percentage: number;
  description: string;
}

interface RecentOomEvent {
  id: string;
  timestamp: string;
  timeLabel: string;
  modelId: string;
  modelName: string;
  workflowId: string;
  vramUsedMB: number;
  nodeStage: string;
  resolution?: string;
  errorLine: string;
  isSimulated?: boolean;
}

interface OomTelemetryData {
  timeline: TimelinePoint[];
  byModel: ModelStat[];
  byNodeStage: NodeStageStat[];
  totalOOMCount: number;
  totalRunsRecorded: number;
  overallOomRatePercent: number;
  highRiskModel: string;
  recommendations: string[];
  recentOOMEvents: RecentOomEvent[];
}

export const VRAMOomFrequencyChart: React.FC<VRAMOomFrequencyChartProps> = ({
  telemetry,
  onAddLog,
  onClearCache
}) => {
  const [data, setData] = useState<OomTelemetryData | null>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | 'all'>('all');
  const [viewMode, setViewMode] = useState<'timeline' | 'rates' | 'stages'>('timeline');
  const [loading, setLoading] = useState<boolean>(false);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const fetchOomTelemetry = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/diagnostics/oom-frequency?range=${timeRange}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.warn('Failed to fetch OOM telemetry:', err);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchOomTelemetry();
    const interval = setInterval(fetchOomTelemetry, 10000);
    return () => clearInterval(interval);
  }, [fetchOomTelemetry]);

  const handleSimulateOOM = async (targetModelId: string) => {
    setSimulating(true);
    try {
      const modelMap: Record<string, { name: string; workflow: string; vram: number; node: string; err: string }> = {
        hunyuan_video: {
          name: 'Hunyuan Video',
          workflow: 'hunyuan_video',
          vram: 7850,
          node: 'KSampler (Node #5)',
          err: 'CUDA out of memory in Hunyuan 3D cross-attention pass (exceeded 7372 MB limit)'
        },
        ltx_video_2b: {
          name: 'LTX-Video 2B FP8',
          workflow: 'ltx_video',
          vram: 7550,
          node: 'VAEDecode (Node #6)',
          err: 'Out of memory in VAEDecode spatial frames reconstruction buffer'
        },
        flux_schnell: {
          name: 'FLUX.1-Schnell GGUF Q4_K_S',
          workflow: 'flux_image',
          vram: 7420,
          node: 'UNET/CheckpointLoader (Node #1/#2)',
          err: 'VRAM overlap spike: prior weights not evicted before UNET allocation'
        }
      };

      const spec = modelMap[targetModelId] || modelMap.hunyuan_video;
      const res = await fetch('/api/diagnostics/oom-frequency/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: targetModelId,
          workflowId: spec.workflow,
          vramMB: spec.vram,
          nodeId: spec.node.includes('6') ? '6' : '5',
          errorText: spec.err,
          resolution: 'Simulated Diagnostic Run'
        })
      });

      if (res.ok) {
        setFeedbackMsg(`Logged test OOM for ${spec.name}`);
        onAddLog?.('WARN', `[VRAM OOM Telemetry] Simulated incident recorded for ${spec.name} (${spec.vram} MB at ${spec.node})`);
        await fetchOomTelemetry();
        setTimeout(() => setFeedbackMsg(null), 4000);
      }
    } catch (err: any) {
      setFeedbackMsg('Simulation failed to dispatch');
    } finally {
      setSimulating(false);
    }
  };

  const handleClearRecords = async () => {
    try {
      const res = await fetch('/api/diagnostics/oom-frequency/clear', { method: 'POST' });
      if (res.ok) {
        setFeedbackMsg('OOM telemetry history reset');
        onAddLog?.('INFO', '[VRAM OOM Telemetry] History buffer cleared');
        await fetchOomTelemetry();
        setTimeout(() => setFeedbackMsg(null), 3000);
      }
    } catch {
      setFeedbackMsg('Failed to clear records');
    }
  };

  const timelineData = data?.timeline || [];
  const modelStats = data?.byModel || [];
  const stageStats = data?.byNodeStage || [];

  const PIE_COLORS = ['#f43f5e', '#38bdf8', '#10b981', '#a855f7', '#eab308', '#ec4899'];

  // Native SVG Chart Dimensions
  const svgWidth = 800;
  const svgHeight = 240;
  const margin = { top: 25, right: 60, bottom: 35, left: 50 };
  const innerWidth = svgWidth - margin.left - margin.right;
  const innerHeight = svgHeight - margin.top - margin.bottom;

  // Max peak VRAM domain: 3000 MB to 8500 MB
  const minVramY = 3000;
  const maxVramY = 8500;
  const getYVram = (vram: number) => {
    const clamped = Math.max(minVramY, Math.min(maxVramY, vram));
    return margin.top + innerHeight - ((clamped - minVramY) / (maxVramY - minVramY)) * innerHeight;
  };

  // Max OOM count domain
  const maxOomCount = Math.max(5, ...timelineData.map(d => d.totalOOM || 0));
  const getYOom = (count: number) => {
    return margin.top + innerHeight - (count / maxOomCount) * innerHeight;
  };

  const barWidth = timelineData.length > 0 ? Math.max(12, Math.min(48, (innerWidth / timelineData.length) * 0.6)) : 24;

  return (
    <div id="vram-oom-frequency-panel" className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 md:p-5 shadow-sm space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 mt-0.5">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                VRAM OOM Frequency & Model Correlation Matrix
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold">
                NATIVE SVG TELEMETRY
              </span>
              {feedbackMsg && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                  {feedbackMsg}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Maps Out-Of-Memory events over time to diagnose whether generation crashes correlate with specific model weights or frame batch sizes.
            </p>
          </div>
        </div>

        {/* View & Time Range Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time range pills */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px] font-mono">
            {(['1h', '6h', '24h', 'all'] as const).map(range => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer uppercase ${
                  timeRange === range
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {/* View mode toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'timeline'
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              Timeline
            </button>
            <button
              type="button"
              onClick={() => setViewMode('rates')}
              className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'rates'
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Failure Rates
            </button>
            <button
              type="button"
              onClick={() => setViewMode('stages')}
              className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'stages'
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <PieIcon className="w-3.5 h-3.5" />
              Attribution
            </button>
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={fetchOomTelemetry}
            disabled={loading}
            className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer"
            title="Refresh OOM Telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Top Stat Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/90">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Total OOM Events</span>
            <AlertOctagon className="w-3 h-3 text-rose-400" />
          </div>
          <div className="text-xl font-bold text-rose-400 mt-1">
            {data?.totalOOMCount ?? 0}
            <span className="text-[10px] text-slate-500 ml-1 font-normal">incidents</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Across {data?.totalRunsRecorded ?? 0} generations
          </div>
        </div>

        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/90">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>OOM Failure Rate</span>
            <Activity className="w-3 h-3 text-amber-400" />
          </div>
          <div className={`text-xl font-bold mt-1 ${
            (data?.overallOomRatePercent || 0) > 15 ? 'text-rose-400' : (data?.overallOomRatePercent || 0) > 5 ? 'text-amber-400' : 'text-emerald-400'
          }`}>
            {data?.overallOomRatePercent ?? 0}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Target safety: &lt; 5.0%
          </div>
        </div>

        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/90">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>High-Risk Model</span>
            <Flame className="w-3 h-3 text-rose-400" />
          </div>
          <div className="text-sm font-bold text-amber-300 truncate mt-1.5" title={data?.highRiskModel}>
            {data?.highRiskModel || 'None'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Triggered majority of spikes
          </div>
        </div>

        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/90">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>VRAM Cage Status</span>
            <ShieldAlert className="w-3 h-3 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 mt-1">
            7,372 MB
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            90% Cap · RTX 3070 Ti (8GB)
          </div>
        </div>
      </div>

      {/* Main Visualizer Area - Native SVG / Tailwind */}
      <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-200 uppercase">
              {viewMode === 'timeline' && 'Timeline Breakdown: OOM Incidents by Model & Peak Memory (MB)'}
              {viewMode === 'rates' && 'Model Reliability Comparison: Total Runs vs Out-of-Memory Failures'}
              {viewMode === 'stages' && 'Root Cause Stage Distribution: Which Nodes Spike Memory'}
            </span>
          </div>
          <div className="text-[10px] font-mono text-slate-500 flex items-center gap-3">
            <span>Interactive Native SVG</span>
          </div>
        </div>

        {/* View 1: Timeline Native SVG Chart */}
        {viewMode === 'timeline' && (
          <div className="w-full relative">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto max-h-[300px] overflow-visible">
              {/* Horizontal Grid lines */}
              {[4000, 5500, 7168, 7372].map(vram => {
                const y = getYVram(vram);
                return (
                  <g key={vram}>
                    <line
                      x1={margin.left}
                      y1={y}
                      x2={svgWidth - margin.right}
                      y2={y}
                      stroke={vram === 7372 ? '#ef4444' : vram === 7168 ? '#f59e0b' : '#1e293b'}
                      strokeDasharray={vram >= 7168 ? '3,3' : '2,2'}
                      strokeWidth={vram >= 7168 ? 1.2 : 1}
                    />
                    <text
                      x={svgWidth - margin.right + 4}
                      y={y + 3}
                      fill={vram === 7372 ? '#ef4444' : vram === 7168 ? '#f59e0b' : '#64748b'}
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {vram === 7372 ? '7372 MB (90% Cage)' : vram === 7168 ? '7168 MB (>7GB)' : `${(vram / 1024).toFixed(1)}GB`}
                    </text>
                  </g>
                );
              })}

              {/* Left Y Axis (OOM Events) */}
              <text
                x={12}
                y={margin.top + innerHeight / 2}
                fill="#94a3b8"
                fontSize="9"
                fontFamily="monospace"
                transform={`rotate(-90 12 ${margin.top + innerHeight / 2})`}
                textAnchor="middle"
              >
                OOM Events
              </text>
              {[0, Math.round(maxOomCount / 2), maxOomCount].map(cnt => {
                const y = getYOom(cnt);
                return (
                  <text key={cnt} x={margin.left - 6} y={y + 3} fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="end">
                    {cnt}
                  </text>
                );
              })}

              {/* Stacked Bars per timestamp */}
              {timelineData.map((d, idx) => {
                const xCenter = margin.left + (idx + 0.5) * (innerWidth / timelineData.length);
                const x = xCenter - barWidth / 2;
                const isHovered = hoveredIndex === idx;

                // Stacking heights
                const hHunyuan = (d.hunyuan / maxOomCount) * innerHeight;
                const hLtx = (d.ltxVideo2b / maxOomCount) * innerHeight;
                const hFlux = (d.fluxSchnell / maxOomCount) * innerHeight;
                const hWan = (d.wanVideo / maxOomCount) * innerHeight;
                const hOther = (d.other / maxOomCount) * innerHeight;

                let currentY = margin.top + innerHeight;

                return (
                  <g
                    key={d.time + idx}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className="cursor-pointer transition-opacity"
                    opacity={hoveredIndex === null || isHovered ? 1 : 0.6}
                  >
                    {/* Hover column backdrop */}
                    {isHovered && (
                      <rect
                        x={xCenter - (innerWidth / timelineData.length) / 2}
                        y={margin.top}
                        width={innerWidth / timelineData.length}
                        height={innerHeight}
                        fill="#38bdf8"
                        opacity={0.08}
                      />
                    )}

                    {/* Hunyuan (Rose) */}
                    {hHunyuan > 0 && (
                      <rect
                        x={x}
                        y={currentY -= hHunyuan}
                        width={barWidth}
                        height={hHunyuan}
                        fill="#f43f5e"
                        rx={1}
                      />
                    )}
                    {/* LTX (Sky) */}
                    {hLtx > 0 && (
                      <rect
                        x={x}
                        y={currentY -= hLtx}
                        width={barWidth}
                        height={hLtx}
                        fill="#38bdf8"
                        rx={1}
                      />
                    )}
                    {/* Flux (Emerald) */}
                    {hFlux > 0 && (
                      <rect
                        x={x}
                        y={currentY -= hFlux}
                        width={barWidth}
                        height={hFlux}
                        fill="#10b981"
                        rx={1}
                      />
                    )}
                    {/* Wan (Purple) */}
                    {hWan > 0 && (
                      <rect
                        x={x}
                        y={currentY -= hWan}
                        width={barWidth}
                        height={hWan}
                        fill="#a855f7"
                        rx={1}
                      />
                    )}
                    {/* Other (Yellow) */}
                    {hOther > 0 && (
                      <rect
                        x={x}
                        y={currentY -= hOther}
                        width={barWidth}
                        height={hOther}
                        fill="#eab308"
                        rx={1}
                      />
                    )}

                    {/* X-axis label */}
                    <text
                      x={xCenter}
                      y={svgHeight - 12}
                      fill={isHovered ? '#38bdf8' : '#64748b'}
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                      fontWeight={isHovered ? 'bold' : 'normal'}
                    >
                      {d.time}
                    </text>
                  </g>
                );
              })}

              {/* Peak VRAM Trend Line */}
              {timelineData.length > 1 && (
                <path
                  d={timelineData
                    .map((d, i) => {
                      const x = margin.left + (i + 0.5) * (innerWidth / timelineData.length);
                      const y = getYVram(d.peakVramMB);
                      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                    })
                    .join(' ')}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.2"
                />
              )}

              {/* Peak VRAM Dots */}
              {timelineData.map((d, i) => {
                const cx = margin.left + (i + 0.5) * (innerWidth / timelineData.length);
                const cy = getYVram(d.peakVramMB);
                const isHovered = hoveredIndex === i;
                return (
                  <circle
                    key={`dot-${i}`}
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 6 : 3.5}
                    fill={d.peakVramMB >= 7168 ? '#ef4444' : '#38bdf8'}
                    stroke="#020617"
                    strokeWidth="1.5"
                    className="transition-all"
                  />
                );
              })}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredIndex !== null && timelineData[hoveredIndex] && (
              <div className="absolute top-2 right-4 bg-slate-950/95 border border-slate-700 rounded-lg p-2.5 font-mono text-[11px] shadow-xl space-y-1 backdrop-blur-sm z-10">
                <div className="font-bold text-sky-300 border-b border-slate-800 pb-1 flex items-center justify-between gap-4">
                  <span>Time: {timelineData[hoveredIndex].time}</span>
                  <span className="text-rose-400">{timelineData[hoveredIndex].totalOOM} OOM Total</span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10.5px]">
                  <span className="text-slate-400">Peak VRAM:</span>
                  <span className="font-bold text-slate-100">
                    {timelineData[hoveredIndex].peakVramMB} MB ({(timelineData[hoveredIndex].peakVramMB / 1024).toFixed(2)} GB)
                  </span>
                  <span className="text-[#f43f5e]">Hunyuan OOM:</span>
                  <span className="text-slate-200">{timelineData[hoveredIndex].hunyuan}</span>
                  <span className="text-[#38bdf8]">LTX-Video OOM:</span>
                  <span className="text-slate-200">{timelineData[hoveredIndex].ltxVideo2b}</span>
                  <span className="text-[#10b981]">Flux.1 OOM:</span>
                  <span className="text-slate-200">{timelineData[hoveredIndex].fluxSchnell}</span>
                  <span className="text-[#a855f7]">Wan 2.1 OOM:</span>
                  <span className="text-slate-200">{timelineData[hoveredIndex].wanVideo}</span>
                </div>
              </div>
            )}

            {/* Legend Bar */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-[10.5px] font-mono text-slate-400 pt-3 border-t border-slate-900 mt-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-[#f43f5e]" />
                <span>Hunyuan Video</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-[#38bdf8]" />
                <span>LTX-Video 2B</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-[#10b981]" />
                <span>Flux.1 Schnell</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-[#a855f7]" />
                <span>Wan 2.1 1.3B</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#38bdf8]" />
                <span>Peak VRAM Line (MB)</span>
              </div>
            </div>
          </div>
        )}

        {/* View 2: Model Failure Rate Comparison */}
        {viewMode === 'rates' && (
          <div className="space-y-3 py-2 font-mono">
            {modelStats.map(m => {
              const maxRuns = Math.max(1, ...modelStats.map(s => s.totalRuns));
              const runPercent = (m.totalRuns / maxRuns) * 100;
              const oomPercentOfRuns = m.totalRuns > 0 ? (m.oomCount / m.totalRuns) * 100 : 0;

              return (
                <div key={m.modelId} className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                      <span className="font-bold text-slate-200">{m.modelName}</span>
                      <span className="text-[10px] text-slate-500">({m.filename})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400">{m.totalRuns} total runs</span>
                      <span className="text-rose-400 font-bold">{m.oomCount} OOMs</span>
                      <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                        m.oomRatePercent > 20 ? 'bg-rose-500/20 text-rose-300' : m.oomRatePercent > 5 ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {m.oomRatePercent}% failure rate
                      </span>
                    </div>
                  </div>

                  {/* Dual Bar Progress */}
                  <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden flex border border-slate-800">
                    <div
                      className="bg-slate-600 h-full"
                      style={{ width: `${Math.max(0, runPercent - oomPercentOfRuns)}%` }}
                      title="Successful Runs"
                    />
                    <div
                      className="bg-rose-500 h-full"
                      style={{ width: `${oomPercentOfRuns}%` }}
                      title="OOM Failure Runs"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* View 3: Attribution Pie & Stages */}
        {viewMode === 'stages' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center py-2 font-mono">
            {/* SVG Donut Chart */}
            <div className="flex flex-col items-center justify-center p-2">
              <svg viewBox="0 0 200 200" className="w-48 h-48">
                {(() => {
                  let accumulatedAngle = 0;
                  const total = stageStats.reduce((a, b) => a + b.count, 0) || 1;

                  return stageStats.map((st, idx) => {
                    const sliceAngle = (st.count / total) * 360;
                    const startAngle = accumulatedAngle;
                    const endAngle = accumulatedAngle + sliceAngle;
                    accumulatedAngle += sliceAngle;

                    const r1 = 50; // inner radius (donut)
                    const r2 = 85; // outer radius
                    const cx = 100;
                    const cy = 100;

                    const rad1 = ((startAngle - 90) * Math.PI) / 180;
                    const rad2 = ((endAngle - 90) * Math.PI) / 180;

                    const x1 = cx + r2 * Math.cos(rad1);
                    const y1 = cy + r2 * Math.sin(rad1);
                    const x2 = cx + r2 * Math.cos(rad2);
                    const y2 = cy + r2 * Math.sin(rad2);

                    const x3 = cx + r1 * Math.cos(rad2);
                    const y3 = cy + r1 * Math.sin(rad2);
                    const x4 = cx + r1 * Math.cos(rad1);
                    const y4 = cy + r1 * Math.sin(rad1);

                    const largeArc = sliceAngle > 180 ? 1 : 0;
                    const d = `M ${x1} ${y1} A ${r2} ${r2} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${r1} ${r1} 0 ${largeArc} 0 ${x4} ${y4} Z`;

                    return (
                      <path
                        key={st.stage}
                        d={d}
                        fill={PIE_COLORS[idx % PIE_COLORS.length]}
                        stroke="#020617"
                        strokeWidth="1.5"
                        className="hover:opacity-80 transition-opacity cursor-pointer"
                      />
                    );
                  });
                })()}
                <circle cx="100" cy="100" r="45" fill="#020617" />
                <text x="100" y="98" fill="#f8fafc" fontSize="14" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  {data?.totalOOMCount ?? 0}
                </text>
                <text x="100" y="112" fill="#64748b" fontSize="8" textAnchor="middle" fontFamily="monospace">
                  TOTAL OOMs
                </text>
              </svg>
              <span className="text-[10px] text-slate-500 mt-2">OOM Events by ComfyUI Workflow Stage</span>
            </div>

            {/* Stages List */}
            <div className="space-y-2 pr-2">
              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">Stage Memory Vulnerability Breakdown</div>
              {stageStats.map((st, idx) => (
                <div key={st.stage} className="p-2 rounded bg-slate-900 border border-slate-800 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <span className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                    <div>
                      <div className="font-bold text-slate-200 text-[11px]">{st.nodeName}</div>
                      <div className="text-[10px] text-slate-400">{st.description}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-rose-400 text-[11px]">{st.count}</span>
                    <span className="text-[10px] text-slate-500 block">({st.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Model Correlation Matrix & 8GB RTX 3070 Ti Risk Assessment */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-mono font-bold text-slate-200 uppercase flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            Model Checkpoint VRAM Safety & OOM Correlation Matrix
          </h4>
          <span className="text-[10px] font-mono text-slate-500">Hardware Ceiling: 7372 MB</span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left font-mono text-[11px] text-slate-300">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[10px] uppercase">
              <tr>
                <th className="py-2.5 px-3">Model Checkpoint</th>
                <th className="py-2.5 px-3">Base VRAM</th>
                <th className="py-2.5 px-3">Peak Observed</th>
                <th className="py-2.5 px-3 text-center">Total Runs</th>
                <th className="py-2.5 px-3 text-center">OOM Events</th>
                <th className="py-2.5 px-3 text-center">Failure Rate</th>
                <th className="py-2.5 px-3">8GB Hardware Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-900/40">
              {modelStats.map(m => (
                <tr key={m.modelId} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-100 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                    {m.modelName}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">
                    {(m.vramFootprintMB / 1024).toFixed(2)} GB ({m.vramFootprintMB} MB)
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={m.avgPeakVramMB >= 7168 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                      {(m.avgPeakVramMB / 1024).toFixed(2)} GB
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-300 font-bold">{m.totalRuns}</td>
                  <td className="py-2.5 px-3 text-center font-bold text-rose-400">{m.oomCount}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                      m.oomRatePercent > 20
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : m.oomRatePercent > 5
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {m.oomRatePercent}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    {m.status === 'SAFE' && (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[10px]">
                        <CheckCircle2 className="w-3 h-3" /> SAFE FOR 8GB (OPTIMAL)
                      </span>
                    )}
                    {m.status === 'WARN' && (
                      <span className="inline-flex items-center gap-1 text-amber-400 font-bold text-[10px]">
                        <AlertTriangle className="w-3 h-3" /> CAP FRAMES &lt;=73
                      </span>
                    )}
                    {m.status === 'CRITICAL' && (
                      <span className="inline-flex items-center gap-1 text-rose-400 font-bold text-[10px]">
                        <AlertOctagon className="w-3 h-3" /> HIGH OOM RISK (&gt;7GB BASE)
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actionable Recommendations & Diagnostic Findings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
        <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-200">
            <span className="flex items-center gap-1.5 font-bold text-sky-400 uppercase text-[11px]">
              <Sparkles className="w-3.5 h-3.5" />
              Automated Diagnostic Takeaways
            </span>
            <span className="text-[10px] text-slate-500">Correlation Engine</span>
          </div>

          <ul className="space-y-1.5 text-slate-400 text-[11px]">
            {data?.recommendations?.map((rec, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Interactive Diagnostics & Testing Tool */}
        <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-200">
            <span className="flex items-center gap-1.5 font-bold text-amber-400 uppercase text-[11px]">
              <Zap className="w-3.5 h-3.5" />
              Interactive Telemetry Diagnostic Actions
            </span>
            <span className="text-[10px] text-slate-500">Live Verification</span>
          </div>

          <p className="text-[11px] text-slate-400">
            Simulate or verify how the OOM frequency chart responds to memory pressure across different checkpoints:
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              disabled={simulating}
              onClick={() => handleSimulateOOM('hunyuan_video')}
              className="px-2.5 py-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold uppercase transition-colors cursor-pointer"
            >
              + Log Hunyuan OOM Spike
            </button>
            <button
              type="button"
              disabled={simulating}
              onClick={() => handleSimulateOOM('ltx_video_2b')}
              className="px-2.5 py-1.5 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-bold uppercase transition-colors cursor-pointer"
            >
              + Log LTX-2B VAE Spike
            </button>
            <button
              type="button"
              disabled={simulating}
              onClick={() => handleSimulateOOM('flux_schnell')}
              className="px-2.5 py-1.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase transition-colors cursor-pointer"
            >
              + Log Flux Overlap
            </button>

            <button
              type="button"
              onClick={handleClearRecords}
              className="ml-auto px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-[10px] font-bold uppercase transition-colors cursor-pointer flex items-center gap-1"
              title="Reset OOM records"
            >
              <Trash2 className="w-3 h-3" />
              Reset Logs
            </button>
          </div>
        </div>
      </div>

      {/* Recent OOM Events Log Stream */}
      {data?.recentOOMEvents && data.recentOOMEvents.length > 0 && (
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2 font-mono">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-[11px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-rose-400" />
              Recent Out-Of-Memory Error Tracebacks
            </span>
            <span className="text-[10px] text-slate-500">
              Showing last {data.recentOOMEvents.length} events
            </span>
          </div>

          <div className="space-y-1.5 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
            {data.recentOOMEvents.map(evt => (
              <div key={evt.id} className="p-2 rounded bg-slate-900/90 border border-slate-800 text-[10.5px] flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[9.5px]">{evt.timeLabel}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {evt.modelName}
                    </span>
                    <span className="text-slate-400 text-[10px]">{evt.nodeStage}</span>
                    {evt.isSimulated && (
                      <span className="text-[9px] text-amber-400 font-bold">[TEST]</span>
                    )}
                  </div>
                  <div className="text-slate-300 text-[10px] truncate max-w-[650px]" title={evt.errorLine}>
                    {evt.errorLine}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-rose-400 font-bold">{evt.vramUsedMB} MB</span>
                  <span className="text-slate-500 text-[9px] block">{(evt.vramUsedMB / 1024).toFixed(2)} GB</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
