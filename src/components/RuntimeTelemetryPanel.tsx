import React, { useEffect, useState } from 'react';
import { Activity, Brain, Globe2, Cpu, Hash, RefreshCw, X } from 'lucide-react';
import { SystemTelemetry } from '../types';
import { VRAMHistoryGraph } from './VRAMHistoryGraph';

interface RuntimeTelemetryPanelProps { telemetry: SystemTelemetry; onClose: () => void; }
interface Snapshot { requestCount:number; latest:any; totals:{promptTokens:number;completionTokens:number;totalTokens:number;durationMs:number;toolCalls:number;webRequests:number;successes:number}; history:any[]; }

export const RuntimeTelemetryPanel: React.FC<RuntimeTelemetryPanelProps> = ({ telemetry, onClose }) => {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    setRefreshing(true);
    try { const r=await fetch('/api/runtime/telemetry',{cache:'no-store'}); if(r.ok) setSnapshot(await r.json()); } finally { setRefreshing(false); }
  };
  useEffect(() => { void refresh(); const id=setInterval(()=>void refresh(),1000); return()=>clearInterval(id); }, []);
  const latest=snapshot?.latest;
  const source=latest?.source==='local+web' ? 'LOCAL + WEB' : latest?.source==='web' ? 'WEB' : 'LOCAL';
  return <section className="w-full max-w-3xl mx-auto rounded-xl border border-slate-800 bg-slate-950/95 shadow-2xl overflow-hidden">
    <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-800">
      <div><div className="text-[9px] font-extrabold tracking-[0.2em] text-emerald-400">LIVE RUNTIME TELEMETRY</div><div className="text-[8px] text-slate-500 mt-0.5">All suites · prompt iterations · local/web inference · 30-second VRAM stage history</div></div>
      <div className="flex items-center gap-2"><button onClick={()=>void refresh()} className="p-1 rounded border border-slate-800 text-slate-500 hover:text-white" title="Refresh telemetry"><RefreshCw className={`w-3 h-3 ${refreshing?'animate-spin':''}`}/></button><button onClick={onClose} className="p-1 rounded border border-slate-800 text-slate-500 hover:text-white"><X className="w-3 h-3"/></button></div>
    </header>
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-1.5 p-2">
      <Metric icon={<Brain/>} label="INFERENCE" value={source}/>
      <Metric icon={<Hash/>} label="PROMPT TOKENS" value={latest ? latest.promptTokens.toLocaleString() : '—'} />
      <Metric icon={<Hash/>} label="TOTAL TOKENS" value={latest ? latest.totalTokens.toLocaleString() : '—'} />
      <Metric icon={<Globe2/>} label="WEB SEARCH" value={latest?.webSearched ? (latest.webProvider || 'USED') : 'NOT USED'} />
      <Metric icon={<Cpu/>} label="VRAM NOW" value={`${(telemetry.vramUsedMB/1024).toFixed(2)} GB`} />
      <Metric icon={<Activity/>} label="TOKENS / SEC" value={latest ? `${Number(latest.completionTokensPerSecond||0).toFixed(1)} t/s` : '—'} />
      <Metric icon={<Hash/>} label="CONTEXT" value={latest ? `${Number(latest.promptTokens||0).toLocaleString()} in` : '—'} />
    </div>
    <div className="px-2 pb-2"><VRAMHistoryGraph telemetry={telemetry}/></div>
    <div className="mx-2 mb-2 rounded-lg border border-slate-800 overflow-hidden">
      <div className="px-2 py-1.5 bg-slate-900/70 text-[8px] font-bold tracking-wider text-slate-500">LIVE PROMPT ITERATIONS</div>
      <div className="max-h-28 overflow-auto">
        {(snapshot?.history || []).slice(0, 12).map((item:any) => <div key={item.id} className="grid grid-cols-[1fr_.65fr_.7fr_.7fr_.65fr_.55fr] gap-2 px-2 py-1 border-t border-slate-900 text-[8px] font-mono text-slate-400"><span className="truncate text-slate-300">{item.suite || 'Unknown'}</span><span>{item.source === 'local+web' ? 'LOCAL+WEB' : String(item.source||'LOCAL').toUpperCase()}</span><span>{Number(item.promptTokens||0).toLocaleString()} in</span><span>{Number(item.completionTokens||0).toLocaleString()} out</span><span>{Number(item.durationMs||0)}ms</span><span>{Number(item.completionTokensPerSecond||0).toFixed(1)}t/s</span></div>)}
        {!snapshot?.history?.length && <div className="px-2 py-2 text-[8px] text-slate-600">Waiting for the first local LLM prompt iteration…</div>}
      </div>
    </div>
    <div className="px-3 py-1.5 border-t border-slate-800 grid grid-cols-3 gap-2 text-[9px] font-mono">
      <div><span className="text-slate-600">PROMPTS / SESSION</span><div className="text-slate-200 mt-0.5">{snapshot?.totals.promptTokens.toLocaleString() || '0'} tokens</div></div>
      <div><span className="text-slate-600">COMPLETIONS</span><div className="text-slate-200 mt-0.5">{snapshot?.totals.completionTokens.toLocaleString() || '0'} tokens</div></div>
      <div><span className="text-slate-600">LLM REQUESTS</span><div className="text-slate-200 mt-0.5">{snapshot?.requestCount || 0} · {snapshot?.totals.successes || 0} OK</div></div>
      <div><span className="text-slate-600">AVG TIME</span><div className="text-slate-200 mt-0.5">{snapshot?.requestCount ? Math.round(snapshot.totals.durationMs / snapshot.requestCount) : 0} ms</div></div>
      <div><span className="text-slate-600">TOOL CALLS</span><div className="text-slate-200 mt-0.5">{snapshot?.totals.toolCalls || 0}</div></div>
    </div>
  </section>;
};

function Metric({icon,label,value}:{icon:React.ReactNode;label:string;value:string}) { return <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2"><div className="flex items-center gap-1.5 text-slate-500 text-[8px] font-bold tracking-wider">{React.cloneElement(icon as React.ReactElement,{className:'w-3 h-3'})}{label}</div><div className="text-[11px] font-mono font-bold text-slate-200 mt-0.5 truncate">{value}</div></div>; }
