import React, { useEffect, useState } from 'react';
import { Activity, Brain, CheckCircle2, Cpu, Database, FileCog, Film, Gauge, HardDrive, Image as ImageIcon, Network, RefreshCw, Server, ShieldCheck, Sparkles, Video, XCircle, Zap } from 'lucide-react';

interface Props { onAddLog:(level:'INFO'|'WARN'|'SEC'|'RULE', message:string)=>void; }

export const LocalCapabilityPanel:React.FC<Props>=({onAddLog})=>{
  const [data,setData]=useState<any>(null); const [loading,setLoading]=useState(false); const [expanded,setExpanded]=useState(false);
  const load=async()=>{setLoading(true);try{const r=await fetch('/api/capabilities',{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error||`HTTP ${r.status}`);setData(d);}catch(e:any){onAddLog('WARN',`Local capability scan failed: ${e.message}`);}finally{setLoading(false);}};
  useEffect(()=>{load();const t=setInterval(load,15000);return()=>clearInterval(t);},[]);
  const ok=(v:any)=>v?'text-emerald-400':'text-rose-400';
  const Status=({value,yes='READY',no='CHECK'}:{value:any;yes?:string;no?:string})=><span className={`font-mono font-bold ${ok(value)}`}>{value?yes:no}</span>;
  if(!data)return <section className="bg-slate-900/80 border border-slate-800 rounded-xl p-4"><div className="flex items-center gap-2 text-xs text-slate-400 font-mono"><RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400"/> Building live system inventory…</div></section>;
  const readyCount=[
    data.runtime?.comfyConnected,
    data.runtime?.gpuAvailable,
    data.runtime?.juggernautReady,
    data.runtime?.qwenVisionReady,
    data.runtime?.ggufReady,
    data.runtime?.ltxReady,
    data.runtime?.rifeReady,
    data.runtime?.gifStudioReady,
    data.runtime?.nodeGraphSyncReady,
    data.runtime?.gemmaVisionReady
  ].filter(Boolean).length;
  return <section className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg">
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
      <div className="flex items-center gap-2.5"><div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"><Cpu className="w-4 h-4"/></div><div><h2 className="text-xs font-bold text-slate-100 uppercase tracking-widest">LIVE SYSTEM INVENTORY <span className="ml-2 text-[9px] px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">AUTO-DISCOVERY</span></h2><p className="text-[10px] text-slate-400 font-mono mt-0.5">Models, custom nodes, ComfyUI classes, workflows and runtime capabilities are read from the current machine.</p></div></div>
      <div className="flex items-center gap-2"><span className="text-[9px] font-mono text-slate-600">SCAN {data.generatedAt?new Date(data.generatedAt).toLocaleTimeString():''}</span><button onClick={load} disabled={loading} className="text-[10px] font-mono border border-slate-700 bg-slate-950 px-3 py-1.5 rounded-lg text-slate-300 hover:text-slate-100 cursor-pointer"><RefreshCw className={`w-3.5 h-3.5 inline mr-1.5 ${loading?'animate-spin text-emerald-400':''}`}/>RESCAN</button></div>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-5 xl:grid-cols-10 gap-2 mb-4">
      {[
        ['ComfyUI',data.runtime?.comfyConnected,Server],
        ['GPU CUDA',data.runtime?.gpuAvailable,HardDrive],
        ['SDXL Jugg',data.runtime?.juggernautReady,Sparkles],
        ['Qwen VL',data.runtime?.qwenVisionReady,Brain],
        ['GGUF Flux',data.runtime?.ggufReady,Database],
        ['LTX Video',data.runtime?.ltxReady,Video],
        ['RIFE Flow',data.runtime?.rifeReady,Activity],
        ['GIF Studio',data.runtime?.gifStudioReady,Film],
        ['Graph Sync',data.runtime?.nodeGraphSyncReady,Network],
        ['Gemma LLM',data.runtime?.gemmaVisionReady,Brain]
      ].map(([label,value,Icon]:any)=><div key={label} className="bg-slate-950 border border-slate-800 rounded-lg p-2"><div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 truncate"><Icon className="w-3 h-3 text-slate-400 shrink-0"/>{label}</div><div className={`text-[10px] font-mono mt-1 ${value?'text-emerald-400':'text-amber-400'}`}>{value?'READY':'CHECK'}</div></div>)}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-amber-400"/> Hardware Telemetry
          </span>
          <span className="text-[9px] font-mono text-emerald-400 font-bold">{readyCount}/10 ready</span>
        </div>
        <div className="space-y-1 text-[10px] font-mono">
          <div className="flex justify-between"><span className="text-slate-300">{data.hardware?.name||'NVIDIA GeForce RTX 3070 Ti'}</span><span className="text-slate-500">{data.hardware?.driver||'CUDA 12.x'}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">VRAM Cage (90%)</span><span className="text-amber-400 font-bold">{data.hardware?.memoryUsedMB??'—'} / {data.hardware?.memoryTotalMB??'8192'} MB</span></div>
          <div className="flex justify-between"><span className="text-slate-400">GPU Temperature</span><span className={data.hardware?.temperatureC>=60?'text-amber-400':'text-emerald-400'}>{data.hardware?.temperatureC??'—'}°C (Brake: 80°C)</span></div>
          <div className="flex justify-between"><span className="text-slate-400">GPU Utilisation</span><span className="text-slate-300">{data.hardware?.utilizationPercent??'—'}%</span></div>
        </div>
      </div>

      <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-emerald-400"/> Active Generators
          </span>
          <span className="text-[9px] font-mono text-slate-500">{data.generators?.length||0} registered</span>
        </div>
        <div className="space-y-2 text-[10px] font-mono max-h-48 overflow-y-auto pr-1">
          {data.generators?.map((g:any)=>(
            <div key={g.id} className="p-1.5 rounded bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-slate-200 font-bold truncate flex items-center gap-1.5">
                  <span className={`text-[8px] px-1 py-0.2 rounded border font-mono uppercase ${
                    g.type==='image'?'bg-emerald-950/80 text-emerald-300 border-emerald-800':
                    g.type==='video'?'bg-indigo-950/80 text-indigo-300 border-indigo-800':
                    'bg-cyan-950/80 text-cyan-300 border-cyan-800'
                  }`}>{g.type}</span>
                  {g.label}
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                  g.status==='validated'?'bg-emerald-950 text-emerald-400 border border-emerald-800':
                  g.status==='installed'?'bg-cyan-950 text-cyan-400 border border-cyan-800':
                  g.status==='not-configured'?'bg-amber-950 text-amber-400 border border-amber-800':
                  'bg-rose-950 text-rose-400 border border-rose-800'
                }`}>{g.status.toUpperCase()}</span>
              </div>
              {g.notes?.[0] && <div className="text-[9px] text-slate-500 truncate mt-0.5">{g.notes[0]}</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
        <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5 mb-2">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-400"/> Runtime & Node Wiring
        </div>
        <div className="space-y-1 text-[10px] font-mono">
          <div className="flex justify-between"><span className="text-slate-400">Node classes</span><span className="text-sky-300 font-bold">{data.nodeClasses?.length??0}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Custom node packs</span><span className="text-sky-300 font-bold">{data.customNodes?.length??0}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Active workflows</span><span className="text-sky-300 font-bold">{data.workflows?.length??0}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Exposed controls</span><span className="text-sky-300 font-bold">{data.controls?.length??0}</span></div>
        </div>
      </div>
    </div>

    <div className="mt-3 flex items-center justify-between"><div className="text-[9px] font-mono text-slate-600">Models: {data.models?.length||0} · Generators: {data.generators?.length||0} · Node classes: {data.nodeClasses?.length||0} · Workflows: {data.workflows?.length||0}</div><button onClick={()=>setExpanded(!expanded)} className="text-[9px] font-mono text-sky-400 hover:text-sky-300 cursor-pointer">{expanded?'HIDE':'SHOW'} FULL INVENTORY</button></div>
    {expanded&&<div className="mt-3 grid grid-cols-1 xl:grid-cols-3 gap-3">
      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
        <div className="text-[10px] font-bold text-slate-300 uppercase mb-2 flex items-center justify-between">
          <span>Active Generators Matrix</span>
          <span className="text-[9px] text-emerald-400">{data.generators?.length||0} active</span>
        </div>
        <div className="max-h-72 overflow-auto space-y-2 pr-1 text-[9px] font-mono">
          {data.generators?.map((g:any)=>(
            <div key={g.id} className="p-2 rounded bg-slate-900/60 border border-slate-800">
              <div className="flex justify-between items-center text-slate-200 font-bold">
                <span>{g.label}</span>
                <span className={g.status==='validated'?'text-emerald-400':g.status==='installed'?'text-cyan-400':'text-amber-400'}>{g.status.toUpperCase()}</span>
              </div>
              <div className="text-slate-500 mt-1">Workflows: {g.workflowIds?.length?g.workflowIds.join(', '):'Direct Process'}</div>
              <div className="text-slate-500">Models: {g.modelIds?.length?g.modelIds.join(', '):'Internal weights'}</div>
              {g.notes?.[0] && <div className="text-slate-400 mt-1 italic">{g.notes[0]}</div>}
            </div>
          ))}
        </div>
      </div>
      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3"><div className="text-[10px] font-bold text-slate-300 uppercase mb-2">Discovered Models</div><div className="max-h-72 overflow-auto space-y-1 pr-1">{data.models?.map((m:any)=><div key={m.path} className="flex items-start justify-between gap-3 text-[9px] font-mono border-b border-slate-900 pb-1"><div className="min-w-0"><div className="text-slate-300 truncate">{m.fileName}</div><div className="text-slate-600 truncate">{m.category} · {m.purpose}{m.discovered?' · discovered':''}</div></div><div className={m.exists?'text-emerald-400':'text-rose-400'}>{m.exists?(m.sizeGB?`${m.sizeGB}GB`:'READY'):'MISSING'}</div></div>)}</div></div>
      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3"><div className="text-[10px] font-bold text-slate-300 uppercase mb-2">ComfyUI Wiring</div><div className="space-y-2 text-[9px] font-mono"><div><span className="text-slate-500">Workflows</span><div className="mt-1 flex flex-wrap gap-1">{data.workflows?.map((w:any)=><span key={w.id} className="px-1.5 py-0.5 rounded border border-slate-800 text-slate-300">{w.id} · {w.nodeCount}</span>)}</div></div><div><span className="text-slate-500">Custom nodes</span><div className="mt-1 flex flex-wrap gap-1">{data.customNodes?.map((n:any)=><span key={n.id} className="px-1.5 py-0.5 rounded border border-sky-500/20 text-sky-300">{n.directory}</span>)}</div></div><div><span className="text-slate-500">Key classes</span><div className="mt-1 flex flex-wrap gap-1">{data.nodeClasses?.filter((n:string)=>/GGUF|RIFE|LTX|VHS|Video|LoadImage|CLIP/i.test(n)).slice(0,80).map((n:string)=><span key={n} className="px-1.5 py-0.5 rounded border border-emerald-500/20 text-emerald-300">{n}</span>)}</div></div></div></div>
    </div>}
  </section>;
};
