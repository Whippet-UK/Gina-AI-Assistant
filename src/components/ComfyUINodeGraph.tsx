import React, { useEffect, useState, useMemo } from 'react';
import {
  Activity,
  RefreshCw,
  Workflow,
  CheckCircle2,
  XCircle,
  Layers,
  ArrowRight,
  Settings2,
  Sliders,
  Sparkles,
  Zap,
  Box,
  FileCode,
  Search,
  Filter,
  Eye,
  ShieldCheck,
  Cpu
} from 'lucide-react';

interface Props {
  onAddLog: (level: 'INFO' | 'WARN' | 'SEC' | 'RULE', message: string, ruleId?: string) => void;
}

interface WorkflowNode {
  id: string;
  classType: string;
  inputs: Record<string, unknown>;
}

interface WorkflowBinding {
  key: string;
  nodeId: string;
  input: string;
  classType: string;
  confidence: 'high' | 'medium' | 'low';
}

interface RuntimeInfo { ok?: boolean; activeJob?: any; history?: Array<{timestamp:string;event:string;payload:any}>; comfy?: any; }

interface WorkflowInfo {
  id: string;
  fileName: string;
  nodeCount: number;
  nodes: WorkflowNode[];
  bindings: WorkflowBinding[];
  capabilities: string[];
  outputNodes?: string[];
  warnings: string[];
}

export const ComfyUINodeGraph: React.FC<Props> = ({ onAddLog }) => {
  const [online, setOnline] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [workflows, setWorkflows] = useState<WorkflowInfo[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'parameters' | 'graph' | 'json'>('parameters');
  const [nodeFilter, setNodeFilter] = useState<string>('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [runtime, setRuntime] = useState<RuntimeInfo | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [healthRes, registryRes] = await Promise.all([
        fetch('/api/comfy/health', { cache: 'no-store' }),
        fetch('/api/workflows', { cache: 'no-store' })
      ]);
      
      const healthData = await healthRes.json().catch(() => ({}));
      setOnline(!!healthRes.ok && !!healthData.online);
      setLatencyMs(Number(healthData.latencyMs || 0));

      const regData = await registryRes.json();
      const loadedWorkflows: WorkflowInfo[] = Array.isArray(regData.workflows) ? regData.workflows : [];
      setWorkflows(loadedWorkflows);
      
      if (!selected && loadedWorkflows[0]) {
        setSelected(loadedWorkflows[0].id);
      }
    } catch (e: any) {
      setOnline(false);
      onAddLog('WARN', `ComfyUI node graph sync check failed: ${e.message || 'connection error'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const pollRuntime = async () => {
      try {
        const r = await fetch('/api/comfy/runtime', { cache:'no-store' });
        if (!r.ok || cancelled) return;
        const data = await r.json();
        if (!cancelled) {
          setRuntime(data);
          const activeId = data?.activeJob?.workflowId;
          if (activeId && workflows.some(w => w.id === activeId)) setSelected(activeId);
        }
      } catch {}
    };
    pollRuntime();
    const t = setInterval(pollRuntime, 750);
    return () => { cancelled = true; clearInterval(t); };
  }, [workflows]);

  const active = useMemo(() => workflows.find(w => w.id === selected), [workflows, selected]);

  const filteredNodes = useMemo(() => {
    if (!active?.nodes) return [];
    if (!nodeFilter.trim()) return active.nodes;
    const q = nodeFilter.toLowerCase();
    return active.nodes.filter(n =>
      n.id.includes(q) ||
      n.classType.toLowerCase().includes(q) ||
      Object.keys(n.inputs).some(k => k.toLowerCase().includes(q))
    );
  }, [active, nodeFilter]);

  const selectedNode = useMemo(() => {
    if (!active?.nodes || !selectedNodeId) return null;
    return active.nodes.find(n => n.id === selectedNodeId) || null;
  }, [active, selectedNodeId]);

  // Extract connection links (inputs that reference [nodeId, outputIndex])
  const nodeConnections = useMemo(() => {
    if (!active?.nodes) return [];
    const connections: { fromNode: string; toNode: string; inputKey: string; outputIdx: number }[] = [];
    for (const node of active.nodes) {
      for (const [key, value] of Object.entries(node.inputs)) {
        if (Array.isArray(value) && value.length === 2 && (typeof value[0] === 'string' || typeof value[0] === 'number')) {
          connections.push({
            fromNode: String(value[0]),
            toNode: node.id,
            inputKey: key,
            outputIdx: Number(value[1])
          });
        }
      }
    }
    return connections;
  }, [active]);

  return (
    <section className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 mb-5 shadow-lg">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 mb-4 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
            <Workflow className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-100 uppercase tracking-widest flex items-center gap-2">
              <span>REAL-TIME COMFYUI NODE GRAPH SYNC</span>
              <span className="bg-sky-500/10 text-sky-400 border border-sky-500/30 text-[9px] px-1.5 py-0.5 rounded font-mono">
                STAGE 12
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Live workflow graph inspector, node parameter synchronization, and connection topology mapper.
            </p>
            {runtime?.activeJob && <div className="mt-2 flex flex-wrap items-center gap-2 text-[9px] font-mono">
              <span className="px-2 py-1 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">JOB {String(runtime.activeJob.id).slice(0,8)} · {runtime.activeJob.status} · {runtime.activeJob.progress || 0}%</span>
              <span className="px-2 py-1 rounded border border-sky-500/30 bg-sky-500/10 text-sky-300">NODE #{runtime.activeJob.currentNodeId ?? '—'} · {runtime.activeJob.currentNodeClass || 'waiting'}</span>
              <span className="px-2 py-1 rounded border border-slate-800 bg-slate-950 text-slate-500">{runtime.activeJob.workflowId}</span>
            </div>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-[10px] font-mono">
            {online ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span className={online ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
              {online ? '127.0.0.1:8188 ONLINE' : '127.0.0.1:8188 OFFLINE'}
            </span>
            {online && latencyMs > 0 && (
              <span className="text-slate-500">({latencyMs}ms)</span>
            )}
          </div>

          <button
            onClick={load}
            disabled={loading}
            className="text-[10px] bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 px-2.5 py-1 rounded font-mono flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-sky-400' : 'text-slate-400'}`} />
            REFRESH
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sidebar: Workflows List */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between pb-1 border-b border-slate-900">
            <span>REGISTERED WORKFLOWS</span>
            <span className="text-sky-400 font-mono">{workflows.length}</span>
          </div>

          {workflows.length ? (
            <div className="space-y-1.5">
              {workflows.map(w => {
                const isSelected = selected === w.id;
                return (
                  <button
                    key={w.id}
                    onClick={() => {
                      setSelected(w.id);
                      setSelectedNodeId(null);
                    }}
                    className={`w-full text-left p-2.5 rounded border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-sky-500/50 bg-sky-500/10 text-sky-200 ring-1 ring-sky-500/30'
                        : 'border-slate-800/80 bg-slate-900/40 hover:bg-slate-900 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-mono truncate">{w.id}</span>
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-950 border border-slate-800 text-slate-400">
                        {w.nodeCount} nodes
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-1 truncate">
                      {w.fileName}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-[10px] text-slate-500 p-4 text-center font-mono">
              No API workflows detected in <code className="text-slate-400">workflows/</code> directory.
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3 bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-3">
          {active ? (
            <>
              {/* Active Workflow Header & Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-100 font-mono">{active.id}</span>
                    <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                      VALIDATED API JSON
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {active.nodeCount} Total Graph Nodes · {active.bindings.length} Dynamic Bindings · {nodeConnections.length} Latent Connections
                  </div>
                </div>

                {/* View Mode Switcher */}
                <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 text-[10px] font-mono">
                  <button
                    onClick={() => setViewMode('parameters')}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      viewMode === 'parameters' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    PARAMETERS
                  </button>
                  <button
                    onClick={() => setViewMode('graph')}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      viewMode === 'graph' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    NODE GRAPH
                  </button>
                  <button
                    onClick={() => setViewMode('json')}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      viewMode === 'json' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    RAW SCHEMA
                  </button>
                </div>
              </div>

              {/* Capabilities Bar */}
              {active.capabilities.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-mono text-slate-500 mr-1">CAPABILITIES:</span>
                  {active.capabilities.map(c => (
                    <span
                      key={c}
                      className="px-2 py-0.5 rounded border border-sky-500/30 bg-sky-500/10 text-[9px] font-mono text-sky-300"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}

              {/* TAB 1: Dynamic Parameter Bindings */}
              {viewMode === 'parameters' && (
                <div className="space-y-3">
                  <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Dynamic Runtime Bindings ({active.bindings.length})</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {active.bindings.map(b => (
                      <div
                        key={`${b.key}-${b.nodeId}-${b.input}`}
                        className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-400 font-mono">{b.key}</span>
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-950 border border-slate-800 text-slate-400">
                            Node #{b.nodeId}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-300 font-mono truncate">
                          Target Field: <code className="text-sky-300">{b.input}</code>
                        </div>
                        <div className="text-[9px] text-slate-500 font-mono truncate">
                          Class: {b.classType}
                        </div>
                      </div>
                    ))}
                  </div>

                  {active.warnings.length > 0 && (
                    <div className="space-y-1 mt-3">
                      {active.warnings.map((w, idx) => (
                        <div
                          key={idx}
                          className="text-[10px] text-amber-400 border border-amber-500/30 bg-amber-500/10 rounded-lg p-2 flex items-center gap-2 font-mono"
                        >
                          <span className="text-amber-300">⚠️</span>
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Interactive Node Graph Inspector */}
              {viewMode === 'graph' && (
                <div className="space-y-3">
                  {/* Search / Filter Toolbar */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={nodeFilter}
                        onChange={e => setNodeFilter(e.target.value)}
                        placeholder="Search nodes by ID, Class, or Input field..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    {nodeFilter && (
                      <button
                        onClick={() => setNodeFilter('')}
                        className="text-[10px] text-slate-400 hover:text-slate-200 px-2 py-1 bg-slate-900 rounded border border-slate-800 font-mono"
                      >
                        CLEAR
                      </button>
                    )}
                  </div>

                  {/* Nodes Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-[360px] overflow-y-auto custom-scrollbar p-1">
                    {filteredNodes.map(n => {
                      const isSelected = selectedNodeId === n.id;
                      const hasBindings = active.bindings.some(b => b.nodeId === n.id);
                      const isRunning = String(runtime?.activeJob?.currentNodeId ?? '') === String(n.id);
                      const wasExecuted = (runtime?.history || []).some((e:any) => e.event === 'node_executed' && String(e.payload?.node ?? '') === String(n.id));
                      const inputsCount = Object.keys(n.inputs).length;
                      return (
                        <div
                          key={n.id}
                          onClick={() => setSelectedNodeId(isSelected ? null : n.id)}
                          className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                            isRunning
                              ? 'bg-emerald-500/15 border-emerald-500 ring-1 ring-emerald-500/40 text-slate-100'
                              : isSelected
                              ? 'bg-sky-500/15 border-sky-500 ring-1 ring-sky-500/40 text-slate-100'
                              : hasBindings
                              ? 'bg-slate-900/90 border-emerald-500/40 hover:border-emerald-500/60 text-slate-300'
                              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold font-mono text-slate-200">
                              #{n.id} {n.classType}
                            </span>
                            {isRunning ? (
                              <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">RUNNING</span>
                            ) : wasExecuted ? (
                              <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-sky-500/10 text-sky-300 border border-sky-500/30">DONE</span>
                            ) : hasBindings && (
                              <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                BOUND
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] text-slate-500 font-mono truncate">
                            {inputsCount} input parameters
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Selected Node Inspector Detail Drawer */}
                  {selectedNode && (
                    <div className="bg-slate-900 border border-sky-500/40 rounded-lg p-3 space-y-2 mt-2">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-sky-400 font-mono">
                            NODE #{selectedNode.id}: {selectedNode.classType}
                          </span>
                        </div>
                        <button
                          onClick={() => setSelectedNodeId(null)}
                          className="text-[10px] text-slate-400 hover:text-slate-200 font-mono"
                        >
                          CLOSE
                        </button>
                      </div>

                      <div className="text-[10px] font-mono space-y-1 max-h-[180px] overflow-y-auto custom-scrollbar">
                        {Object.entries(selectedNode.inputs).map(([key, val]) => (
                          <div key={key} className="flex items-start justify-between gap-2 p-1 rounded bg-slate-950/60">
                            <span className="text-slate-400 font-semibold">{key}:</span>
                            <span className="text-emerald-300 truncate max-w-[280px]">
                              {Array.isArray(val) ? `[Node #${val[0]} -> Slot ${val[1]}]` : JSON.stringify(val)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Raw Schema JSON Viewer */}
              {viewMode === 'json' && (
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 max-h-[360px] overflow-y-auto custom-scrollbar">
                  <pre className="text-[10px] font-mono text-emerald-300 whitespace-pre-wrap leading-relaxed">
                    {JSON.stringify(active, null, 2)}
                  </pre>
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-slate-500 p-8 text-center font-mono">
              <Activity className="w-6 h-6 mx-auto mb-2 opacity-40 text-slate-400" />
              Select a registered workflow to inspect its live node graph.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
