import React, { useEffect, useState } from 'react';
import { Clapperboard, Image, Film, FolderOpen, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useProjectState } from '../context/ProjectStateContext';
import { AssetLibraryPanel } from './AssetLibraryPanel';

interface Props { onAddLog: (level:'INFO'|'WARN'|'SEC'|'RULE', message:string, ruleId?:string)=>void; view?: 'creator'|'jobs'|'shorts'|'assets'; }
export const AiStudioSuite: React.FC<Props> = ({ onAddLog, view }) => {
  const { projectState, updateAiStudio } = useProjectState();
  const [jobs, setJobs] = useState<any[]>([]);
  const refresh = async () => { try { const r=await fetch('/api/jobs',{cache:'no-store'}); setJobs((await r.json()).jobs||[]); } catch(e:any){ onAddLog('WARN',`Job queue unavailable: ${e.message}`); } };
  useEffect(()=>{ refresh(); const t=setInterval(refresh,1000); return()=>clearInterval(t); },[]);
  const tab=view || projectState.aiStudio.activeTab;
  const setTab=(v:any)=>updateAiStudio({activeTab:v});
  return <section className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 mb-5 shadow-sm">
    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3"><div className="flex items-center gap-2"><Clapperboard className="w-4 h-4 text-sky-400"/><h2 className="text-xs font-bold text-slate-100 uppercase tracking-widest">{tab==='shorts'?'GINA SHORTS FACTORY':tab==='jobs'?'GINA JOB QUEUE':tab==='assets'?'GINA ASSET LIBRARY':'GINA CREATOR CONSOLE'}</h2></div><span className="text-[10px] text-slate-500 font-mono">LOCAL PRODUCTION LAYER</span></div>
    {!view && <div className="flex flex-wrap gap-1 mb-3">{[['creator','CREATOR',Image],['jobs','JOBS',RefreshCw],['shorts','SHORTS FACTORY',Film],['assets','ASSET LIBRARY',FolderOpen]].map(([id,label,Icon]:any)=><button key={id} onClick={()=>setTab(id)} className={`px-2.5 py-1.5 rounded text-[10px] font-bold border flex items-center gap-1 ${tab===id?'bg-emerald-500 text-slate-950 border-emerald-400':'bg-slate-950 text-slate-400 border-slate-800'}`}><Icon className="w-3 h-3"/>{label}</button>)}</div>}
    {tab==='jobs' && <div className="space-y-1.5">{jobs.length?jobs.slice(0,12).map(j=><div key={j.id} className="bg-slate-950 border border-slate-800 rounded p-2 flex items-center justify-between text-[10px] font-mono"><span>{j.workflowId} · {j.id.slice(0,8)}</span><span className={j.status==='COMPLETED'?'text-emerald-400':j.status==='FAILED'?'text-rose-400':'text-sky-400'}>{j.status} {j.progress}%</span></div>):<div className="text-[10px] text-slate-500 py-4 text-center">No local jobs yet.</div>}</div>}
    {tab==='shorts' && <div className="grid grid-cols-1 md:grid-cols-4 gap-2">{['Concept','Scenes','Voice & Audio','Timeline'].map((x,i)=><div key={x} className="bg-slate-950 border border-slate-800 rounded p-3"><div className="text-[10px] text-slate-500 uppercase">0{i+1}</div><div className="text-xs font-bold text-slate-200 mt-1">{x}</div><div className="text-[9px] text-slate-600 mt-1">Foundation ready — local engine only.</div></div>)}</div>}
    {tab==='assets' && <AssetLibraryPanel onAddLog={onAddLog} />}
    {tab==='creator' && <div className="grid grid-cols-3 gap-2 text-[10px]">{[['IMAGE','FLUX / COMFYUI'],['VIDEO','WORKFLOW-DRIVEN'],['SHORTS','SCENE PIPELINE']].map(([a,b])=><div key={a} className="bg-slate-950 border border-slate-800 rounded p-3"><div className="text-emerald-400 font-bold">{a}</div><div className="text-slate-500 mt-1">{b}</div><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-2"/></div>)}</div>}
  </section>;
};
