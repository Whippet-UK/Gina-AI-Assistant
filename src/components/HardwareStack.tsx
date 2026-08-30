import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Cpu, HardDrive, Zap, ShieldAlert, Terminal, Activity, TrendingUp, AlertCircle, Flame, PauseCircle, Trash2 } from 'lucide-react';
import { SystemTelemetry } from '../types';

interface HardwareStackProps {
  telemetry: SystemTelemetry;
  onAddLog?: (level: 'INFO' | 'WARN' | 'SEC' | 'RULE', message: string, ruleId?: string) => void;
  onClearCache?: () => void;
}

interface VramDataPoint {
  time: Date;
  vramMB: number;
}

export const HardwareStack: React.FC<HardwareStackProps> = ({
  telemetry,
  onAddLog,
  onClearCache
}) => {
  const vramPercent = Math.min(100, Math.round((telemetry.vramUsedMB / telemetry.vramTotalMB) * 100));
  const ramPercent = Math.min(100, Math.round((telemetry.ramUsedGB / telemetry.ramTotalGB) * 100));

  // Threshold Monitor ref locks to prevent duplicate log spamming
  const vramWarnLoggedRef = useRef<boolean>(false);
  const tempWarnLoggedRef = useRef<boolean>(false);

  // Auto-Throttle State
  const [autoThrottleEnabled, setAutoThrottleEnabled] = useState<boolean>(true);
  const [isThrottled, setIsThrottled] = useState<boolean>(false);
  const throttleWarnLoggedRef = useRef<boolean>(false);

  // Threshold Monitor Effect
  useEffect(() => {
    const currentVramPct = (telemetry.vramUsedMB / telemetry.vramTotalMB) * 100;

    // 1. VRAM Threshold Monitor (> 90%)
    if (currentVramPct > 90) {
      if (!vramWarnLoggedRef.current) {
        vramWarnLoggedRef.current = true;
        onAddLog?.(
          'WARN',
          `[THRESHOLD MONITOR] VRAM usage exceeded 90% cage threshold (${currentVramPct.toFixed(1)}% - ${telemetry.vramUsedMB} MB / ${telemetry.vramTotalMB} MB)! Enforcing safety limits.`,
          '011-020'
        );
      }
    } else {
      vramWarnLoggedRef.current = false;
    }

    // 2. Thermal Threshold Monitor (> 75°C)
    if (telemetry.gpuTempC > 75) {
      if (!tempWarnLoggedRef.current) {
        tempWarnLoggedRef.current = true;
        onAddLog?.(
          'WARN',
          `[THRESHOLD MONITOR] Core hardware temperature surpassed 75°C thermal limit (${telemetry.gpuTempC}°C > 75°C threshold)! Emergency thermal brake monitoring active.`,
          '021-030'
        );
      }
    } else {
      tempWarnLoggedRef.current = false;
    }
  }, [telemetry.vramUsedMB, telemetry.vramTotalMB, telemetry.gpuTempC, onAddLog]);

  // 3. Auto-Throttle Effect (> 85°C)
  useEffect(() => {
    if (autoThrottleEnabled && telemetry.gpuTempC > 85) {
      setIsThrottled(true);
      if (!throttleWarnLoggedRef.current) {
        throttleWarnLoggedRef.current = true;
        onAddLog?.(
          'WARN',
          `[AUTO-THROTTLE ACTIVE] CPU/GPU temperature exceeded 85°C critical threshold (${telemetry.gpuTempC}°C > 85°C)! Non-critical background node processes automatically PAUSED.`,
          '021-085'
        );
      }
    } else {
      if (isThrottled) {
        setIsThrottled(false);
        if (throttleWarnLoggedRef.current) {
          throttleWarnLoggedRef.current = false;
          onAddLog?.(
            'INFO',
            `[AUTO-THROTTLE RESOLVED] Temperature normalized below 85°C (${telemetry.gpuTempC}°C). Background node processes resumed.`
          );
        }
      } else {
        throttleWarnLoggedRef.current = false;
      }
    }
  }, [telemetry.gpuTempC, autoThrottleEnabled, isThrottled, onAddLog]);

  // Maintain rolling VRAM history for D3 line chart
  const [vramHistory, setVramHistory] = useState<VramDataPoint[]>(() => {
    // Generate initial historical seed points for immediate visual rendering
    const now = Date.now();
    const seed: VramDataPoint[] = [];
    for (let i = 18; i >= 0; i--) {
      const time = new Date(now - i * 4000);
      const jitter = Math.floor(Math.sin(i) * 120 + (Math.random() * 80 - 40));
      const vramMB = Math.min(7200, Math.max(4800, telemetry.vramUsedMB + jitter));
      seed.push({ time, vramMB });
    }
    return seed;
  });

  // SVG and Container refs for D3 rendering
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Update history when telemetry changes
  useEffect(() => {
    setVramHistory(prev => {
      const newPoint: VramDataPoint = {
        time: new Date(),
        vramMB: telemetry.vramUsedMB
      };
      const updated = [...prev, newPoint];
      // Keep last 25 time points
      if (updated.length > 25) {
        return updated.slice(updated.length - 25);
      }
      return updated;
    });
  }, [telemetry.vramUsedMB]);

  // Render D3 Line Chart
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || vramHistory.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth || 360;
    const height = 140;
    const margin = { top: 18, right: 15, bottom: 25, left: 42 };

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    svg.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Scales
    const xScale = d3.scaleTime()
      .domain(d3.extent<VramDataPoint, Date>(vramHistory, d => d.time) as [Date, Date])
      .range([margin.left, width - margin.right]);

    const yMin = 3500;
    const yMax = Math.max(7600, telemetry.vramTotalMB);
    const yScale = d3.scaleLinear()
      .domain([yMin, yMax])
      .range([height - margin.bottom, margin.top]);

    // Gradient definition for area fill under line
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'vram-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#10b981')
      .attr('stop-opacity', 0.4);

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#10b981')
      .attr('stop-opacity', 0.0);

    // Gridlines (Horizontal)
    const yTicks = [4000, 5500, 7000];
    svg.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('x1', margin.left)
      .attr('x2', width - margin.right)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', '#1e293b')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2,2');

    // 90% VRAM Safety Cage Threshold Line
    const cageThreshold = 7372; // 90% of 8192MB
    const cageY = yScale(cageThreshold);

    svg.append('line')
      .attr('x1', margin.left)
      .attr('x2', width - margin.right)
      .attr('y1', cageY)
      .attr('y2', cageY)
      .attr('stroke', '#f59e0b')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,3');

    svg.append('text')
      .attr('x', width - margin.right - 2)
      .attr('y', cageY - 4)
      .attr('text-anchor', 'end')
      .attr('fill', '#f59e0b')
      .attr('font-size', '9px')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .text('90% CAGE LIMIT (7,372 MB)');

    // Area generator
    const area = d3.area<VramDataPoint>()
      .x(d => xScale(d.time))
      .y0(height - margin.bottom)
      .y1(d => yScale(d.vramMB))
      .curve(d3.curveMonotoneX);

    svg.append('path')
      .datum(vramHistory)
      .attr('fill', 'url(#vram-gradient)')
      .attr('d', area);

    // Line generator
    const line = d3.line<VramDataPoint>()
      .x(d => xScale(d.time))
      .y(d => yScale(d.vramMB))
      .curve(d3.curveMonotoneX);

    svg.append('path')
      .datum(vramHistory)
      .attr('fill', 'none')
      .attr('stroke', '#10b981')
      .attr('stroke-width', 2)
      .attr('d', line);

    // Axes
    const xAxis = d3.axisBottom(xScale)
      .ticks(4)
      .tickFormat(d3.timeFormat('%H:%M:%S') as any)
      .tickSize(3);

    const yAxis = d3.axisLeft(yScale)
      .tickValues([4000, 5500, 7000])
      .tickFormat(d => `${(d as number / 1024).toFixed(1)}GB`)
      .tickSize(3);

    // Render X Axis
    svg.append('g')
      .attr('transform', `translate(0, ${height - margin.bottom})`)
      .call(xAxis)
      .attr('color', '#64748b')
      .selectAll('text')
      .attr('font-size', '8px')
      .attr('font-family', 'monospace');

    // Render Y Axis
    svg.append('g')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(yAxis)
      .attr('color', '#64748b')
      .selectAll('text')
      .attr('font-size', '8px')
      .attr('font-family', 'monospace');

    // Latest Point Glow Marker
    const latest = vramHistory[vramHistory.length - 1];
    if (latest) {
      const cx = xScale(latest.time);
      const cy = yScale(latest.vramMB);

      // Outer pulsing ring
      svg.append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', 6)
        .attr('fill', '#10b981')
        .attr('opacity', 0.3)
        .append('animate')
        .attr('attributeName', 'r')
        .attr('values', '4;8;4')
        .attr('dur', '2s')
        .attr('repeatCount', 'indefinite');

      // Inner dot
      svg.append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', 3.5)
        .attr('fill', '#34d399')
        .attr('stroke', '#064e3b')
        .attr('stroke-width', 1.5);

      // Latest Value Text Badge
      svg.append('text')
        .attr('x', cx - 5)
        .attr('y', cy - 8)
        .attr('text-anchor', 'end')
        .attr('fill', '#34d399')
        .attr('font-size', '9px')
        .attr('font-family', 'monospace')
        .attr('font-weight', 'bold')
        .text(`${latest.vramMB} MB`);
    }

  }, [vramHistory, telemetry.vramTotalMB]);

  // Derived statistics from history
  const maxVram = vramHistory.length > 0 ? Math.max(...vramHistory.map(d => d.vramMB)) : telemetry.vramUsedMB;
  const minVram = vramHistory.length > 0 ? Math.min(...vramHistory.map(d => d.vramMB)) : telemetry.vramUsedMB;
  const avgVram = vramHistory.length > 0 ? Math.round(vramHistory.reduce((a, b) => a + b.vramMB, 0) / vramHistory.length) : telemetry.vramUsedMB;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
      {/* Hardware Panel */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3.5 shadow-sm">
        <h2 className="text-xs font-bold text-amber-400 border-b border-slate-800 pb-2 mb-2.5 flex items-center justify-between uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            BARE-METAL HARDWARE STACK
          </span>
          <span className="text-[9px] font-mono bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30">
            PINNED
          </span>
        </h2>
        <ul className="space-y-1.5 text-xs">
          <li className="flex items-center justify-between p-1.5 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-500 text-[11px]">CPU:</span>
            <span className="text-slate-200 font-medium font-mono text-[11px]">AMD Ryzen 5600X (4 Threads Cap)</span>
          </li>
          <li className="flex items-center justify-between p-1.5 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-500 text-[11px]">System RAM:</span>
            <span className="text-slate-200 font-medium font-mono text-[11px]">32GB 3600MHz DDR4</span>
          </li>
          <li className="flex items-center justify-between p-1.5 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-500 text-[11px]">GPU VRAM:</span>
            <span className="text-emerald-400 font-medium font-mono text-[11px]">RTX 3070 Ti (8GB Physical)</span>
          </li>
          <li className="flex items-center justify-between p-1.5 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-500 text-[11px]">Storage:</span>
            <span className="text-slate-200 font-medium font-mono text-[11px]">WD Black NVMe SSD (200GB)</span>
          </li>
          <li className="flex items-center justify-between p-1.5 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-500 text-[11px]">Sandbox Root:</span>
            <code className="text-sky-400 font-mono text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">C:\Gina_AI\</code>
          </li>
        </ul>
      </div>

      {/* Protocol Panel */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3.5 shadow-sm">
        <h2 className="text-xs font-bold text-sky-400 border-b border-slate-800 pb-2 mb-2.5 flex items-center justify-between uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-sky-400" />
            MANDATORY PROTOCOLS
          </span>
          <span className="text-[9px] font-mono bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded border border-sky-500/30">
            ACTIVE
          </span>
        </h2>
        <ul className="space-y-1.5 text-xs text-slate-300">
          <li className="flex items-start gap-2 p-1.5 rounded bg-slate-950 border border-slate-800">
            <span className="text-sky-400 font-bold font-mono text-[10px]">01</span>
            <div>
              <strong className="text-sky-300 text-[11px] block">Plain Analogies:</strong>
              <p className="text-slate-500 text-[10px]">Explain complex ML logic using simple analogies first.</p>
            </div>
          </li>
          <li className="flex items-start gap-2 p-1.5 rounded bg-slate-950 border border-slate-800">
            <span className="text-sky-400 font-bold font-mono text-[10px]">02</span>
            <div>
              <strong className="text-sky-300 text-[11px] block">Single Line Terminals:</strong>
              <p className="text-slate-500 text-[10px]">Keep output command execution to 1 line per step.</p>
            </div>
          </li>
          <li className="flex items-start gap-2 p-1.5 rounded bg-slate-950 border border-slate-800">
            <span className="text-sky-400 font-bold font-mono text-[10px]">03</span>
            <div>
              <strong className="text-sky-300 text-[11px] block">Single Action Fixes:</strong>
              <p className="text-slate-500 text-[10px]">Isolate unreadable logs into 1 actionable fix item.</p>
            </div>
          </li>
          <li className="flex items-start gap-2 p-1.5 rounded bg-slate-950 border border-slate-800">
            <span className="text-sky-400 font-bold font-mono text-[10px]">04</span>
            <div>
              <strong className="text-sky-300 text-[11px] block">File Operations:</strong>
              <p className="text-slate-500 text-[10px]">Scripts longer than 40 lines passed via uploads.</p>
            </div>
          </li>
        </ul>
      </div>

      {/* Engine Telemetry Radar & D3 Line Chart */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3.5 shadow-sm">
        <h2 className="text-xs font-bold text-emerald-400 border-b border-slate-800 pb-2 mb-2 flex items-center justify-between uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            NVML VRAM USAGE HISTORY (D3.JS)
          </span>
          <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            LIVE STREAM
          </span>
        </h2>

        {/* D3 Line Chart Canvas Container */}
        <div ref={containerRef} className="w-full bg-slate-950 rounded border border-slate-800/80 p-1 mb-2 relative">
          <svg ref={svgRef} className="w-full h-auto overflow-visible"></svg>
        </div>

        {/* Live VRAM History Quick Stats */}
        <div className="grid grid-cols-3 gap-1.5 text-[9px] font-mono mb-2.5">
          <div className="bg-slate-950 p-1.5 rounded border border-slate-800 text-center">
            <span className="text-slate-500 block uppercase">Peak</span>
            <span className="text-amber-400 font-bold">{maxVram} MB</span>
          </div>
          <div className="bg-slate-950 p-1.5 rounded border border-slate-800 text-center">
            <span className="text-slate-500 block uppercase">Average</span>
            <span className="text-emerald-400 font-bold">{avgVram} MB</span>
          </div>
          <div className="bg-slate-950 p-1.5 rounded border border-slate-800 text-center">
            <span className="text-slate-500 block uppercase">Low</span>
            <span className="text-sky-400 font-bold">{minVram} MB</span>
          </div>
        </div>

        {/* Meters & Hardware Status */}
        <div className="space-y-2 text-xs">
          {/* VRAM Progress Bar */}
          <div>
            <div className="flex justify-between text-slate-400 mb-1 font-mono text-[10px]">
              <span>VRAM Allocation (90% Cage):</span>
              <span className="text-emerald-400 font-bold">{telemetry.vramUsedMB} / {telemetry.vramTotalMB} MB ({vramPercent}%)</span>
            </div>
            <div className="w-full bg-slate-950 h-1.5 rounded overflow-hidden border border-slate-800">
              <div
                className="bg-emerald-500 h-full transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                style={{ width: `${vramPercent}%` }}
              />
            </div>
          </div>

          {/* GPU Temp & CPU Threads */}
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[9px] uppercase">GPU Temp:</span>
              <span className={`font-mono font-bold text-xs ${telemetry.gpuTempC > 75 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {telemetry.gpuTempC}°C
              </span>
              <span className="text-[9px] text-slate-500 block font-mono">
                {telemetry.gpuTempC > 75 ? '⚠️ SURPASSED 75°C THRESHOLD' : 'Limit: 80°C'}
              </span>
            </div>

            <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[9px] uppercase">CPU Threads:</span>
              <span className="font-mono font-bold text-xs text-sky-400">
                {telemetry.cpuThreadsActive} / {telemetry.cpuThreadsCap} Active
              </span>
              <span className="text-[9px] text-slate-500 block font-mono">Pinned</span>
            </div>
          </div>

          {/* Threshold Monitor Sentry Status */}
          <div className="p-2 rounded bg-slate-950 border border-slate-800/90 text-[10px] font-mono space-y-1.5 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-bold uppercase flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-amber-400" />
                THRESHOLD MONITOR SENTRY
              </span>
              <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                AUTO LOG WARN
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[9px]">
              <div className={`p-1 rounded border flex items-center justify-between ${
                vramPercent > 90 ? 'bg-amber-500/10 border-amber-500/50 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}>
                <span>VRAM &gt; 90%:</span>
                <span className="font-bold">{vramPercent > 90 ? '⚠️ WARN BREACH' : 'NORMAL'}</span>
              </div>
              <div className={`p-1 rounded border flex items-center justify-between ${
                telemetry.gpuTempC > 75 ? 'bg-rose-500/10 border-rose-500/50 text-rose-300' : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}>
                <span>TEMP &gt; 75°C:</span>
                <span className="font-bold">{telemetry.gpuTempC > 75 ? (telemetry.gpuTempC > 85 ? '🔥 CRITICAL' : '⚠️ WARN BREACH') : 'NORMAL'}</span>
              </div>
            </div>

            {/* Auto-Throttle Toggle & Status */}
            <div className="pt-1.5 border-t border-slate-800/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold uppercase flex items-center gap-1 text-[9px]">
                  <Flame className={`w-3 h-3 ${telemetry.gpuTempC > 85 ? 'text-rose-500 animate-bounce' : 'text-amber-400'}`} />
                  AUTO-THROTTLE (85°C PAUSE)
                </span>
                <button
                  onClick={() => {
                    const next = !autoThrottleEnabled;
                    setAutoThrottleEnabled(next);
                    onAddLog?.('INFO', `Auto-Throttle Sentry ${next ? 'ENABLED' : 'DISABLED'}`);
                  }}
                  className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono transition-all cursor-pointer border ${
                    autoThrottleEnabled
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {autoThrottleEnabled ? 'ENABLED [ON]' : 'DISABLED [OFF]'}
                </button>
              </div>

              {/* Status Indicator Banner */}
              {isThrottled && (
                <div className="p-1.5 bg-rose-500/10 border border-rose-500/40 rounded text-[9px] text-rose-300 flex items-center gap-1.5 animate-pulse font-mono">
                  <PauseCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span className="font-bold">BACKGROUND NODE PROCESSES PAUSED (TEMP: {telemetry.gpuTempC}°C &gt; 85°C)</span>
                </div>
              )}

              {onClearCache && (
                <button
                  type="button"
                  onClick={onClearCache}
                  className="w-full mt-2 py-1 px-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded flex items-center justify-center gap-1.5 font-bold font-mono text-[9px] transition-colors cursor-pointer"
                  title="Send 'clear cache' signal to ComfyUI /free API"
                >
                  <Trash2 className="w-3 h-3 text-rose-400" />
                  FLUSH COMFYUI VRAM CACHE (/free)
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

