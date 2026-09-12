import React, { useEffect, useState } from 'react';
import { Clapperboard, Image, Film, FolderOpen, RefreshCw, CheckCircle2, Cpu, Eye, Zap } from 'lucide-react';
import { useProjectState } from '../context/ProjectStateContext';
import { AssetLibraryPanel } from './AssetLibraryPanel';
import type { LocalLlmEngine } from '../types';

interface Props { onAddLog: (level:'INFO'|'WARN'|'SEC'|'RULE', message:string, ruleId?:string)=>void; view?: 'creator'|'jobs'|'shorts'|'assets'; }
interface LlmStatus { engine: LocalLlmEngine; ready: boolean; running: boolean; modelName?: string; multimodal?: boolean; mmprojPath?: string|null; lastError?: string|null; port?: number; }

const ENGINE_META: Record<LocalLlmEngine, { label:string; model:string; detail:string; vision:boolean }> = {
  qwen: { label:'Qwen 2.5-VL 7B', model:'Qwen2.5-VL-7B-Instruct-Q4_K_M.gguf + mmproj-F16', detail:'Default · Vision + text · primary local assistant', vision:true },
  'qwen-coder': { label:'Qwen Coder 7B', model:'qwen2.5-coder-7b-instruct-q5_k_m.gguf', detail:'Code mode · text-only · projector unloaded', vision:false }
};

export const AiStudioSuite: React.FC<Props> = ({ onAddLog, view }) => {
  const { projectState, updateAiStudio } = useProjectState();
  const [jobs, setJobs] = useState<any[]>([]);
  const [llm, setLlm] = useState<LlmStatus>({ engine: projectState.aiStudio.localLlmEngine || 'qwen', ready:false, running:false });
  const [switching, setSwitching] = useState(false);

  const refresh = async () => { try { const r=await fetch('/api/jobs',{cache:'no-store'}); setJobs((await r.json()).jobs||[]); } catch(e:any){ onAddLog('WARN',`Job queue unavailable: ${e.message}`); } };
  const refreshLlm = async () => {
    try {
      const r=await fetch('/api/llm/status',{cache:'no-store'});
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      const s=await r.json();
      setLlm(s);
      if(s.engine && s.engine !== projectState.aiStudio.localLlmEngine) updateAiStudio({localLlmEngine:s.engine});
    } catch(e:any) { setLlm(prev=>({...prev,lastError:e.message})); }
  };
  useEffect(()=>{ refresh(); refreshLlm(); const t=setInterval(()=>{refresh();refreshLlm();},1500); return()=>clearInterval(t); },[]);

  const selectEngine = async (engine:LocalLlmEngine) => {
    if (switching || engine === llm.engine) return;
    setSwitching(true);
    updateAiStudio({ localLlmEngine:engine });
    try {
      const memory = await fetch('/api/agent/memory',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'preference',key:'local_llm_engine',value:engine,source:'ai_studio'})});
      if(!memory.ok) throw new Error(`Unable to save engine preference (HTTP ${memory.status})`);
      const r=await fetch('/api/llm/restart',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({engine})});
      const data=await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(data?.error || `Local ${ENGINE_META[engine].label} failed to start.`);
      setLlm(data.status || {...llm,engine,ready:true,running:true});
      onAddLog('INFO',`Local AI engine switched to ${ENGINE_META[engine].label}.`);
    } catch(e:any) {
      onAddLog('WARN',`Local AI engine switch failed: ${e.message}`);
      await refreshLlm();
    } finally { setSwitching(false); }
  };

  const tab=view || projectState.aiStudio.activeTab;
  const setTab=(v:any)=>updateAiStudio({activeTab:v});
  const activeEngine = llm.engine || projectState.aiStudio.localLlmEngine || 'qwen';
  return <section className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 mb-5 shadow-sm">
    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3"><div className="flex items-center gap-2"><Clapperboard className="w-4 h-4 text-sky-400"/><h2 className="text-xs font-bold text-slate-100 uppercase tracking-widest">{tab==='shorts'?'GINA SHORTS FACTORY':tab==='jobs'?'GINA JOB QUEUE':tab==='assets'?'GINA ASSET LIBRARY':'GINA CREATOR CONSOLE'}</h2></div><span className="text-[10px] text-slate-500 font-mono">LOCAL PRODUCTION LAYER</span></div>
    {tab==='creator' && <div className="mb-3 rounded-lg border border-slate-800 bg-slate-950/80 p-3">
      <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><Cpu className="w-3.5 h-3.5 text-emerald-400"/><div><div className="text-[10px] font-bold tracking-widest text-slate-200 uppercase">LOCAL AI ENGINE</div><div className="text-[9px] text-slate-500 font-mono">http://127.0.0.1:{llm.port || 8080} · {activeEngine === 'qwen' ? 'Vision Mode' : 'Coder Mode'}</div></div></div><div className={`text-[9px] font-bold px-2 py-1 rounded border ${llm.ready?'text-emerald-400 border-emerald-500/30 bg-emerald-500/5':'text-amber-400 border-amber-500/30 bg-amber-500/5'}`}>{llm.ready?'READY':'STOPPED'}</div></div>
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(ENGINE_META) as LocalLlmEngine[]).map(engine => { const meta=ENGINE_META[engine]; const selected=activeEngine===engine; return <button key={engine} type="button" disabled={switching} onClick={()=>void selectEngine(engine)} className={`text-left rounded-md border p-2.5 transition ${selected?'border-emerald-400/70 bg-emerald-500/10':'border-slate-800 bg-slate-900/70 hover:border-slate-700'} ${switching?'opacity-60':''}`}>
          <div className="flex items-center justify-between"><span className={`text-[10px] font-bold ${selected?'text-emerald-300':'text-slate-300'}`}>{meta.label}</span>{selected && <span className="text-[8px] font-bold text-emerald-400">ACTIVE</span>}</div>
          <div className="text-[8px] text-slate-500 font-mono mt-1 truncate">{meta.model}</div>
          <div className="flex items-center gap-2 mt-1.5 text-[8px] text-slate-500">{meta.vision?<><Eye className="w-3 h-3 text-sky-400"/>VISION</>:<><Zap className="w-3 h-3 text-amber-400"/>TEXT</>}<span>{meta.detail}</span></div>
        </button>; })}
      </div>
      {llm.lastError && !llm.ready && <div className="mt-2 text-[8px] text-rose-400 font-mono break-words">{llm.lastError}</div>}
    </div>}
    {!view && <div className="flex flex-wrap gap-1 mb-3">{[['creator','CREATOR',Image],['jobs','JOBS',RefreshCw],['shorts','SHORTS FACTORY',Film],['assets','ASSET LIBRARY',FolderOpen]].map(([id,label,Icon]:any)=><button key={id} onClick={()=>setTab(id)} className={`px-2.5 py-1.5 rounded text-[10px] font-bold border flex items-center gap-1 ${tab===id?'bg-emerald-500 text-slate-950 border-emerald-400':'bg-slate-950 text-slate-400 border-slate-800'}`}><Icon className="w-3 h-3"/>{label}</button>)}</div>}
    {tab==='jobs' && <div className="space-y-1.5">{jobs.length?jobs.slice(0,12).map(j=><div key={j.id} className="bg-slate-950 border border-slate-800 rounded p-2 flex items-center justify-between text-[10px] font-mono"><span>{j.workflowId} · {j.id.slice(0,8)}</span><span className={j.status==='COMPLETED'?'text-emerald-400':j.status==='FAILED'?'text-rose-400':'text-sky-400'}>{j.status} {j.progress}%</span></div>):<div className="text-[10px] text-slate-500 py-4 text-center">No local jobs yet.</div>}</div>}
    {tab==='shorts' && <div className="grid grid-cols-1 md:grid-cols-4 gap-2">{['Concept','Scenes','Voice & Audio','Timeline'].map((x,i)=><div key={x} className="bg-slate-950 border border-slate-800 rounded p-3"><div className="text-[10px] text-slate-500 uppercase">0{i+1}</div><div className="text-xs font-bold text-slate-200 mt-1">{x}</div><div className="text-[9px] text-slate-600 mt-1">Foundation ready — local engine only.</div></div>)}</div>}
    {tab==='assets' && <AssetLibraryPanel onAddLog={onAddLog} />}
    {tab==='creator' && <div className="grid grid-cols-3 gap-2 text-[10px]">{[['IMAGE','JUGGERNAUT-XL v9 / COMFYUI'],['VIDEO','WORKFLOW-DRIVEN'],['SHORTS','SCENE PIPELINE']].map(([a,b])=><div key={a} className="bg-slate-950 border border-slate-800 rounded p-3"><div className="text-emerald-400 font-bold">{a}</div><div className="text-slate-500 mt-1">{b}</div><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-2"/></div>)}</div>}
  </section>;
};
