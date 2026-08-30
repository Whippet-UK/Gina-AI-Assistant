import React, { useEffect, useState } from 'react';
import { Upload, Monitor, Gauge, BrainCircuit, FolderSync, RefreshCw, CheckCircle2, AlertTriangle, Play, Square } from 'lucide-react';

const card = 'bg-slate-950 border border-slate-800 rounded-lg p-4';

export const MilestoneWorkbench: React.FC = () => {
  const [workflowResult, setWorkflowResult] = useState<any>(null);
  const [workflowBusy, setWorkflowBusy] = useState(false);
  const [hudOpen, setHudOpen] = useState(false);
  const [benchmark, setBenchmark] = useState<any>(null);
  const [benchmarkBusy, setBenchmarkBusy] = useState(false);
  const [knowledge, setKnowledge] = useState<any>(null);
  const [watching, setWatching] = useState(false);

  const uploadWorkflow = async (file?: File) => {
    if (!file) return;
    setWorkflowBusy(true);
    try {
      const res = await fetch('/api/workflows/import', { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-Gina-Filename': encodeURIComponent(file.name) }, body: await file.arrayBuffer() });
      const data = await res.json();
      setWorkflowResult(data);
    } catch (e: any) { setWorkflowResult({ ok: false, error: e?.message || 'Import failed' }); }
    finally { setWorkflowBusy(false); }
  };

  const runBenchmark = async () => {
    setBenchmarkBusy(true); setBenchmark(null);
    try {
      const res = await fetch('/api/llm/benchmark', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sweep: true }) });
      setBenchmark(await res.json());
    } catch (e: any) { setBenchmark({ ok: false, error: e?.message || 'Benchmark failed' }); }
    finally { setBenchmarkBusy(false); }
  };

  const refreshKnowledge = async () => {
    try { const res = await fetch('/api/knowledge/watcher/status'); const data = await res.json(); setKnowledge(data); setWatching(!!data.running); } catch {}
  };
  useEffect(() => { refreshKnowledge(); const id = window.setInterval(refreshKnowledge, 3000); return () => clearInterval(id); }, []);

  const toggleWatcher = async () => {
    const endpoint = watching ? '/api/knowledge/watcher/stop' : '/api/knowledge/watcher/start';
    await fetch(endpoint, { method: 'POST' });
    setWatching(!watching); refreshKnowledge();
  };

  return <div className="space-y-4">
    <div className={card}>
      <div className="flex items-center justify-between mb-3"><div><h3 className="text-sm font-bold text-slate-100">Workflow Ingestion</h3><p className="text-[10px] text-slate-500">Phase 14 · Import ComfyUI API JSON or workflow metadata PNG.</p></div><Upload className="w-4 h-4 text-emerald-400" /></div>
      <label className="inline-flex items-center gap-2 px-3 py-2 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-bold cursor-pointer"><Upload className="w-3.5 h-3.5" /> {workflowBusy ? 'IMPORTING…' : 'IMPORT JSON / PNG'}<input type="file" accept=".json,.png,application/json,image/png" className="hidden" disabled={workflowBusy} onChange={e => uploadWorkflow(e.target.files?.[0])}/></label>
      {workflowResult && <div className="mt-3 p-3 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono"><div className={workflowResult.ok ? 'text-emerald-300' : 'text-rose-300'}>{workflowResult.ok ? 'IMPORT OK' : 'IMPORT FAILED'}</div><pre className="mt-1 whitespace-pre-wrap text-slate-400">{JSON.stringify(workflowResult, null, 2)}</pre></div>}
    </div>

    <div className={card}>
      <div className="flex items-center justify-between mb-3"><div><h3 className="text-sm font-bold text-slate-100">High-DPI HUD</h3><p className="text-[10px] text-slate-500">Phase 15 · Dedicated telemetry HUD window with DPI-aware scaling.</p></div><Monitor className="w-4 h-4 text-sky-400" /></div>
      <button onClick={() => { const w = window.open('/?hud=1', 'gina-hud', 'popup=yes,width=1024,height=600'); if (w) { w.focus(); setHudOpen(true); } }} className="px-3 py-2 rounded border border-sky-500/30 bg-sky-500/10 text-sky-300 text-xs font-bold flex items-center gap-2"><Monitor className="w-3.5 h-3.5" /> LAUNCH HUD WINDOW</button>
      {hudOpen && <span className="ml-3 text-[10px] text-emerald-400 font-mono">HUD WINDOW OPEN</span>}
    </div>

    <div className={card}>
      <div className="flex items-center justify-between mb-3"><div><h3 className="text-sm font-bold text-slate-100">Gemma Benchmark & VRAM Tuner</h3><p className="text-[10px] text-slate-500">Phase 16 · Controlled layer sweep with thermal/VRAM safety checks.</p></div><Gauge className="w-4 h-4 text-amber-400" /></div>
      <button onClick={runBenchmark} disabled={benchmarkBusy} className="px-3 py-2 rounded border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-bold flex items-center gap-2 disabled:opacity-50">{benchmarkBusy ? <RefreshCw className="w-3.5 h-3.5 animate-spin"/> : <Play className="w-3.5 h-3.5"/>}{benchmarkBusy ? 'RUNNING SAFE SWEEP…' : 'RUN BENCHMARK SWEEP'}</button>
      {benchmark && <div className="mt-3 overflow-auto"><table className="w-full text-[10px] font-mono"><thead><tr className="text-slate-500"><th className="text-left">Layers</th><th>Latency</th><th>tok/s</th><th>Status</th></tr></thead><tbody>{(benchmark.results||[]).map((r:any)=><tr key={r.layers} className="border-t border-slate-800"><td>{r.layers}</td><td className="text-right">{r.latencyMs ? `${r.latencyMs}ms` : '—'}</td><td className="text-right">{r.tokensPerSecond?.toFixed?.(2) || '—'}</td><td className="text-right">{r.ok ? <span className="text-emerald-400">PASS</span> : <span className="text-rose-400">FAIL</span>}</td></tr>)}</tbody></table><div className="mt-2 text-[10px] text-emerald-300">Recommended: {benchmark.recommendedLayers ?? '—'} GPU layers</div></div>}
    </div>

    <div className={card}>
      <div className="flex items-center justify-between mb-3"><div><h3 className="text-sm font-bold text-slate-100">Knowledge Auto-Indexing</h3><p className="text-[10px] text-slate-500">Phase 17 · Watches project documentation, scripts and workflows and refreshes zero-VRAM RAG.</p></div><FolderSync className="w-4 h-4 text-purple-400" /></div>
      <div className="flex items-center gap-2"><button onClick={toggleWatcher} className={`px-3 py-2 rounded border text-xs font-bold flex items-center gap-2 ${watching ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : 'border-purple-500/30 bg-purple-500/10 text-purple-300'}`}>{watching ? <Square className="w-3.5 h-3.5"/> : <Play className="w-3.5 h-3.5"/>}{watching ? 'STOP WATCHER' : 'START WATCHER'}</button><button onClick={async()=>{await fetch('/api/rag/reindex',{method:'POST'}); refreshKnowledge();}} className="px-3 py-2 rounded border border-slate-700 text-slate-300 text-xs font-bold flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5"/> REINDEX NOW</button></div>
      {knowledge && <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] font-mono"><div className="bg-slate-900 p-2 rounded">Watcher <b className={knowledge.running ? 'text-emerald-400' : 'text-slate-500'}>{knowledge.running ? 'RUNNING' : 'STOPPED'}</b></div><div className="bg-slate-900 p-2 rounded">Documents <b className="text-slate-200">{knowledge.documentCount ?? '—'}</b></div><div className="bg-slate-900 p-2 rounded">Chunks <b className="text-slate-200">{knowledge.chunkCount ?? '—'}</b></div><div className="bg-slate-900 p-2 rounded">Queued <b className="text-slate-200">{knowledge.queued ?? 0}</b></div></div>}
    </div>
  </div>;
};
