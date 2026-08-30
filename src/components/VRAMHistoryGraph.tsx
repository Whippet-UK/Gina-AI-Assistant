import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Activity, Cpu, AlertTriangle, Layers, Zap, Clock, ShieldAlert, Sparkles, Filter, Trash2 } from 'lucide-react';
import { SystemTelemetry } from '../types';
import { useGenerationJob } from '../context/GenerationJobContext';

interface VRAMHistoryGraphProps {
  telemetry: SystemTelemetry;
  onAddLog?: (level: 'INFO' | 'WARN' | 'SEC' | 'RULE', message: string, ruleId?: string) => void;
  onClearCache?: () => void;
}

interface VramHistoryPoint {
  timestamp: Date;
  vramMB: number;
  gpuTempC: number;
  nodeId?: string | null;
  nodeStage?: string;
  workflowId?: string;
  isSpike?: boolean;
}

export const VRAMHistoryGraph: React.FC<VRAMHistoryGraphProps> = ({
  telemetry,
  onAddLog,
  onClearCache
}) => {
  const { job } = useGenerationJob();
  const [history, setHistory] = useState<VramHistoryPoint[]>(() => {
    const now = Date.now();
    const initPoints: VramHistoryPoint[] = [];
    const baseMB = telemetry.vramUsedMB || 5200;
    // 30 seconds of initial historical resolution (1 point per second = 30 points)
    for (let i = 30; i >= 0; i--) {
      initPoints.push({
        timestamp: new Date(now - i * 1000),
        vramMB: Math.max(3800, Math.min(7300, baseMB + Math.floor(Math.sin(i / 2) * 180 + (Math.random() * 60 - 30)))),
        gpuTempC: telemetry.gpuTempC || 52,
        nodeId: null,
        nodeStage: 'Idle / Baseline',
        isSpike: false
      });
    }
    return initPoints;
  });

  const [selectedPoint, setSelectedPoint] = useState<VramHistoryPoint | null>(null);
  const [highlightSpikesOnly, setHighlightSpikesOnly] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Map active ComfyUI node ID/workflow to descriptive stage
  const getNodeStageName = (nodeId?: string | null, workflowId?: string): string => {
    if (!nodeId) return 'Idle / Standby';
    const numId = String(nodeId);
    if (workflowId === 'ltx_video') {
      if (numId === '1') return 'Node 1: LTXVLoader (Checkpoint Load)';
      if (numId === '2' || numId === '3') return 'Node 2/3: CLIPTextEncode (Prompt Embedding)';
      if (numId === '4') return 'Node 4: EmptyLatentImage (Canvas Allocation)';
      if (numId === '5') return 'Node 5: KSampler (3D Attention Diffusion)';
      if (numId === '6') return 'Node 6: VAEDecode (Video Frames Tensors)';
      if (numId === '7') return 'Node 7: SaveAnimatedWEBP (Encoding Media)';
    } else {
      if (numId === '1') return 'Node 1: DualCLIPLoader (Flux Text Encoders)';
      if (numId === '2') return 'Node 2: UNETLoader (Flux.1 Schnell Weights)';
      if (numId === '3') return 'Node 3: CLIPTextEncode (Positive Conditioning)';
      if (numId === '4') return 'Node 4: EmptyLatentImage (Latent Canvas)';
      if (numId === '5') return 'Node 5: KSamplerSelect (Euler Fast Pass)';
      if (numId === '6') return 'Node 6: SamplerCustomAdvanced (Denoising)';
      if (numId === '7') return 'Node 7: VAELoader / Decode';
      if (numId === '8') return 'Node 8: SaveImage (PNG Tensor Write)';
    }
    return `Node ${nodeId}: Active Processing`;
  };

  // Record a high-resolution rolling window over the last 30 seconds (1s tick)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentMB = telemetry.vramUsedMB || 0;
      const isJobRunning = job?.status === 'RUNNING';
      const stage = isJobRunning
        ? getNodeStageName(job?.currentNodeId, job?.workflowId)
        : 'Idle / Standby';

      // Mark as spike if VRAM jumps rapidly or exceeds 7.0 GB (>7168 MB)
      const isSpike = currentMB > 7168 || (history.length > 0 && currentMB - history[history.length - 1].vramMB > 600);

      const newPoint: VramHistoryPoint = {
        timestamp: now,
        vramMB: currentMB,
        gpuTempC: telemetry.gpuTempC || 0,
        nodeId: isJobRunning ? job?.currentNodeId : null,
        nodeStage: stage,
        workflowId: isJobRunning ? job?.workflowId : undefined,
        isSpike
      };

      setHistory(prev => {
        // Keep 30-second window (30-35 points)
        const cutoff = new Date(now.getTime() - 30 * 1000);
        const filtered = prev.filter(p => p.timestamp >= cutoff);
        return [...filtered, newPoint];
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [telemetry.vramUsedMB, telemetry.gpuTempC, job?.status, job?.currentNodeId, job?.workflowId, history]);

  // Render D3 Graph
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || history.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth || 700;
    const height = 220;
    const margin = { top: 24, right: 30, bottom: 32, left: 54 };

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);

    // X Scale: 30-second window
    const now = new Date();
    const thirtySecsAgo = new Date(now.getTime() - 30 * 1000);
    const xScale = d3.scaleTime()
      .domain([thirtySecsAgo, now])
      .range([margin.left, width - margin.right]);

    // Y Scale: 0 to 8192 MB (or max observed)
    const yMax = Math.max(8192, telemetry.vramTotalMB || 8192);
    const yScale = d3.scaleLinear()
      .domain([2000, yMax])
      .range([height - margin.bottom, margin.top]);

    // Gradient definitions
    const defs = svg.append('defs');
    const areaGradient = defs.append('linearGradient')
      .attr('id', 'vram-history-gradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');

    areaGradient.append('stop').attr('offset', '0%').attr('stop-color', '#10b981').attr('stop-opacity', 0.45);
    areaGradient.append('stop').attr('offset', '60%').attr('stop-color', '#10b981').attr('stop-opacity', 0.1);
    areaGradient.append('stop').attr('offset', '100%').attr('stop-color', '#10b981').attr('stop-opacity', 0.0);

    const spikeGradient = defs.append('linearGradient')
      .attr('id', 'vram-spike-gradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');

    spikeGradient.append('stop').attr('offset', '0%').attr('stop-color', '#f43f5e').attr('stop-opacity', 0.5);
    spikeGradient.append('stop').attr('offset', '100%').attr('stop-color', '#f43f5e').attr('stop-opacity', 0.0);

    // Horizontal Grid Lines
    const yGridValues = [3000, 5000, 7168, 7372];
    svg.append('g')
      .selectAll('line.grid')
      .data(yGridValues)
      .enter()
      .append('line')
      .attr('class', 'grid')
      .attr('x1', margin.left)
      .attr('x2', width - margin.right)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', '#1e293b')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3');

    // 7,168 MB Warning Threshold Line (>7GB)
    const warnY = yScale(7168);
    svg.append('line')
      .attr('x1', margin.left)
      .attr('x2', width - margin.right)
      .attr('y1', warnY)
      .attr('y2', warnY)
      .attr('stroke', '#f59e0b')
      .attr('stroke-width', 1.2)
      .attr('stroke-dasharray', '4,3');

    svg.append('text')
      .attr('x', width - margin.right - 4)
      .attr('y', warnY - 4)
      .attr('text-anchor', 'end')
      .attr('fill', '#f59e0b')
      .attr('font-size', '9px')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .text('7.0 GB WARNING THRESHOLD (7,168 MB)');

    // 7,372 MB 90% Hard Cage Threshold Line
    const cageY = yScale(7372);
    svg.append('line')
      .attr('x1', margin.left)
      .attr('x2', width - margin.right)
      .attr('y1', cageY)
      .attr('y2', cageY)
      .attr('stroke', '#ef4444')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '2,2');

    svg.append('text')
      .attr('x', margin.left + 4)
      .attr('y', cageY - 4)
      .attr('text-anchor', 'start')
      .attr('fill', '#ef4444')
      .attr('font-size', '9px')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .text('90% HARD CAGE LIMIT (7,372 MB / 8GB VRAM)');

    // Area path under line
    const area = d3.area<VramHistoryPoint>()
      .x(d => xScale(d.timestamp))
      .y0(height - margin.bottom)
      .y1(d => yScale(d.vramMB))
      .curve(d3.curveMonotoneX);

    svg.append('path')
      .datum(history)
      .attr('fill', 'url(#vram-history-gradient)')
      .attr('d', area);

    // Line Path
    const line = d3.line<VramHistoryPoint>()
      .x(d => xScale(d.timestamp))
      .y(d => yScale(d.vramMB))
      .curve(d3.curveMonotoneX);

    svg.append('path')
      .datum(history)
      .attr('fill', 'none')
      .attr('stroke', '#10b981')
      .attr('stroke-width', 2.2)
      .attr('d', line);

    // Interactive Stage Nodes & Spike Markers
    history.forEach(point => {
      const cx = xScale(point.timestamp);
      const cy = yScale(point.vramMB);
      const isAboveWarn = point.vramMB >= 7168;
      const hasActiveNode = !!point.nodeId;

      if (hasActiveNode || point.isSpike || isAboveWarn) {
        // Marker circle
        const circle = svg.append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', point.isSpike || isAboveWarn ? 5 : 3.5)
          .attr('fill', isAboveWarn ? '#ef4444' : (point.isSpike ? '#f59e0b' : '#38bdf8'))
          .attr('stroke', '#020617')
          .attr('stroke-width', 1.5)
          .style('cursor', 'pointer')
          .on('click', () => setSelectedPoint(point))
          .on('mouseenter', () => setSelectedPoint(point));

        if (point.isSpike || isAboveWarn) {
          circle.append('animate')
            .attr('attributeName', 'r')
            .attr('values', '4;7;4')
            .attr('dur', '1.5s')
            .attr('repeatCount', 'indefinite');
        }
      }
    });

    // Axes
    const xAxis = d3.axisBottom(xScale)
      .ticks(6)
      .tickFormat(d3.timeFormat('%H:%M:%S') as any)
      .tickSize(4);

    const yAxis = d3.axisLeft(yScale)
      .tickValues([3000, 5000, 7168, 8000])
      .tickFormat(d => `${((d as number) / 1024).toFixed(1)} GB`)
      .tickSize(4);

    svg.append('g')
      .attr('transform', `translate(0, ${height - margin.bottom})`)
      .call(xAxis)
      .attr('color', '#64748b')
      .selectAll('text')
      .attr('font-size', '9px')
      .attr('font-family', 'monospace');

    svg.append('g')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(yAxis)
      .attr('color', '#64748b')
      .selectAll('text')
      .attr('font-size', '9px')
      .attr('font-family', 'monospace');

  }, [history, telemetry.vramTotalMB]);

  // Derived statistics across the 30-second window
  const maxVram = history.length > 0 ? Math.max(...history.map(d => d.vramMB)) : telemetry.vramUsedMB;
  const minVram = history.length > 0 ? Math.min(...history.map(d => d.vramMB)) : telemetry.vramUsedMB;
  const avgVram = history.length > 0 ? Math.round(history.reduce((a, b) => a + b.vramMB, 0) / history.length) : telemetry.vramUsedMB;
  const spikes = history.filter(p => p.isSpike || p.vramMB >= 7168);

  return (
    <div id="vram-history-graph-panel" className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                VRAM History Graph (30-Second Stage Telemetry)
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                1Hz HIGH RESOLUTION
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Tracks continuous GPU memory usage and attributes allocation spikes to individual ComfyUI workflow nodes.
            </p>
          </div>
        </div>

        {/* Quick Stats Badges & Flush Button */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <div className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300">
            <span className="text-slate-500 text-[10px] block uppercase">30s Peak</span>
            <span className={`font-bold ${maxVram >= 7168 ? 'text-rose-400' : 'text-amber-400'}`}>
              {(maxVram / 1024).toFixed(2)} GB ({maxVram} MB)
            </span>
          </div>
          <div className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300">
            <span className="text-slate-500 text-[10px] block uppercase">30s Avg</span>
            <span className="text-emerald-400 font-bold">
              {(avgVram / 1024).toFixed(2)} GB
            </span>
          </div>
          <div className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300">
            <span className="text-slate-500 text-[10px] block uppercase">Spikes Detected</span>
            <span className={`font-bold ${spikes.length > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
              {spikes.length} events
            </span>
          </div>
          {onClearCache && (
            <button
              type="button"
              onClick={onClearCache}
              className="px-2.5 py-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 transition-colors cursor-pointer text-[10px] font-bold uppercase"
              title="Send 'clear cache' signal to ComfyUI /free API"
            >
              <Trash2 className="w-3 h-3 text-rose-400" />
              Flush VRAM (/free)
            </button>
          )}
        </div>
      </div>

      {/* D3 Canvas Container */}
      <div ref={containerRef} className="w-full bg-slate-950 rounded-lg border border-slate-800/90 p-2 relative overflow-hidden">
        <svg ref={svgRef} className="w-full h-auto overflow-visible"></svg>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-end gap-3 text-[10px] font-mono text-slate-400 pt-2 border-t border-slate-900 mt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span>Smooth Allocation</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
            <span>Active Node Stage</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
            <span>VRAM Spike (&gt;600MB jump)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span>Critical Pressure (&gt;7.0 GB)</span>
          </div>
        </div>
      </div>

      {/* Interactive Node Stage Inspector Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
        {/* Selected / Current Point Details */}
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 font-bold text-sky-400 uppercase text-[11px]">
              <Layers className="w-3.5 h-3.5" />
              Stage Memory Attribution
            </span>
            <span className="text-[10px] text-slate-500">
              {selectedPoint ? selectedPoint.timestamp.toLocaleTimeString() : 'Current Live Head'}
            </span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between p-1.5 rounded bg-slate-900/80 border border-slate-800/80">
              <span className="text-slate-400">Attributed Stage:</span>
              <span className="font-bold text-slate-200">
                {selectedPoint ? selectedPoint.nodeStage : getNodeStageName(job?.currentNodeId, job?.workflowId)}
              </span>
            </div>
            <div className="flex justify-between p-1.5 rounded bg-slate-900/80 border border-slate-800/80">
              <span className="text-slate-400">VRAM Allocation:</span>
              <span className={`font-bold ${(selectedPoint ? selectedPoint.vramMB : telemetry.vramUsedMB) >= 7168 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {((selectedPoint ? selectedPoint.vramMB : telemetry.vramUsedMB) / 1024).toFixed(2)} GB ({selectedPoint ? selectedPoint.vramMB : telemetry.vramUsedMB} MB)
              </span>
            </div>
            <div className="flex justify-between p-1.5 rounded bg-slate-900/80 border border-slate-800/80">
              <span className="text-slate-400">GPU Temperature:</span>
              <span className="text-amber-400 font-bold">
                {selectedPoint ? selectedPoint.gpuTempC : telemetry.gpuTempC}°C
              </span>
            </div>
          </div>
        </div>

        {/* Workflow Stage Memory Diagnostic Guide */}
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2 text-[11px]">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 font-bold text-amber-400 uppercase text-[11px]">
              <ShieldAlert className="w-3.5 h-3.5" />
              Node Spike Analysis & Tips
            </span>
            <span className="text-[10px] text-slate-500">8GB Optimization</span>
          </div>

          <ul className="space-y-1 text-slate-400 text-[10.5px]">
            <li className="flex items-start gap-1.5">
              <span className="text-amber-400 font-bold">•</span>
              <span><strong className="text-slate-200">KSampler (Node #5):</strong> Peaks during initial 3D attention tensor allocation. High resolutions (&gt;512px) produce immediate 2GB+ spikes.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-amber-400 font-bold">•</span>
              <span><strong className="text-slate-200">VAEDecode (Node #6):</strong> Large frame batches (&gt;49 frames) cause secondary VRAM spikes during latent-to-pixel reconstruction.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-amber-400 font-bold">•</span>
              <span><strong className="text-slate-200">CheckpointLoader (Node #1):</strong> Requires <code className="text-amber-300">--lowvram --fp8_e4m3fn-text-enc</code> flags to keep base model under 5.3GB.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
