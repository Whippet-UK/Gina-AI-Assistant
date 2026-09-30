import React, { useEffect, useMemo, useState } from 'react';
import { Archive, ExternalLink, Image as ImageIcon, RefreshCw, Search, Trash2, Wand2 } from 'lucide-react';
import { SavedAsset } from '../types';

interface Props { onAddLog: (level:'INFO'|'WARN'|'SEC'|'RULE', message:string, ruleId?:string)=>void; }

export const AssetLibraryPanel: React.FC<Props> = ({ onAddLog }) => {
  const [assets, setAssets] = useState<SavedAsset[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<SavedAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/assets?_=' + Date.now(), { cache:'no-store' });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data.error || `HTTP ${r.status}`);
      setAssets(Array.isArray(data.assets) ? data.assets : []);
    } catch (e:any) { onAddLog('WARN', `Asset library unavailable: ${e?.message || 'unknown error'}`); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, []);

  const filtered = useMemo(() => assets.filter(a => {
    const hay = [a.title, a.promptUsed, a.workflowId, a.fileFormat].filter(Boolean).join(' ').toLowerCase();
    return !query.trim() || hay.includes(query.trim().toLowerCase());
  }), [assets, query]);

  const useAsReference = async (asset: SavedAsset) => {
    setBusyId(asset.id);
    try {
      const r = await fetch(`/api/assets/${encodeURIComponent(asset.id)}/reference`, { method:'POST', headers:{'Content-Type':'application/json'} });
      const data = await r.json().catch(()=>({}));
      if (!r.ok || !data.ok) throw new Error(data.error || `HTTP ${r.status}`);
      const reference = { id: asset.id, name: data.filename, localPath: data.localPath, previewUrl: data.previewUrl || asset.url, title: asset.title };
      localStorage.setItem('gina_active_reference_asset', JSON.stringify(reference));
      window.dispatchEvent(new CustomEvent('gina-asset-reference', { detail: reference }));
      onAddLog('INFO', `Asset '${asset.title}' is now the active image reference for AI Tools.`);
    } catch (e:any) { onAddLog('WARN', `Could not use asset as reference: ${e?.message || 'unknown error'}`); }
    finally { setBusyId(null); }
  };

  const remove = async (asset: SavedAsset) => {
    if (!confirm(`Delete '${asset.title}' from Gina's asset library?`)) return;
    setBusyId(asset.id);
    try {
      const r = await fetch(`/api/assets/${encodeURIComponent(asset.id)}`, { method:'DELETE' });
      const data = await r.json().catch(()=>({}));
      if (!r.ok || !data.ok) throw new Error(data.error || `HTTP ${r.status}`);
      setAssets(prev => prev.filter(a => a.id !== asset.id));
      if (selected?.id === asset.id) setSelected(null);
      onAddLog('INFO', `Deleted asset '${asset.title}'.`);
    } catch(e:any) { onAddLog('WARN', `Asset delete failed: ${e?.message || 'unknown error'}`); }
    finally { setBusyId(null); }
  };

  return <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_0.8fr] gap-4">
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div><div className="text-xs font-bold text-slate-200 uppercase tracking-widest">Asset Library</div><div className="text-[10px] text-slate-500 mt-1">Persistent local images with prompts, jobs, workflows and reusable references.</div></div>
        <button onClick={()=>void refresh()} className="px-2 py-1.5 border border-slate-800 rounded text-[9px] text-slate-400 hover:text-slate-200 flex items-center gap-1"><RefreshCw className="w-3 h-3"/> Refresh</button>
      </div>
      <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded px-2 mb-3"><Search className="w-3 h-3 text-slate-600"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search assets, prompts, workflows…" className="w-full bg-transparent py-2 text-[10px] text-slate-200 outline-none"/></div>
      {loading ? <div className="py-10 text-center text-[10px] text-slate-500">Loading local assets…</div> : !filtered.length ? <div className="py-10 text-center text-[10px] text-slate-600">No assets recorded yet. Save a generated image from Creator or generate one in AI Tools.</div> :
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">{filtered.map(asset=><button key={asset.id} onClick={()=>setSelected(asset)} className={`text-left bg-slate-900 border rounded-lg overflow-hidden ${selected?.id===asset.id?'border-emerald-500/60':'border-slate-800 hover:border-slate-700'}`}>
          <div className="aspect-square bg-slate-950">{asset.url ? <img src={asset.url} className="w-full h-full object-cover" loading="lazy"/> : <div className="w-full h-full flex items-center justify-center"><Archive className="w-7 h-7 text-slate-700"/></div>}</div>
          <div className="p-2"><div className="text-[10px] text-slate-200 truncate">{asset.title}</div><div className="text-[8px] text-slate-600 mt-1">{new Date(asset.timestamp).toLocaleString()}</div></div>
        </button>)}</div>}
    </div>
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
      {selected ? <>
        <div className="flex items-start justify-between gap-2"><div><div className="text-xs font-bold text-slate-200">{selected.title}</div><div className="text-[9px] text-slate-600 font-mono mt-1">{selected.id}</div></div><button onClick={()=>void remove(selected)} disabled={busyId===selected.id} className="p-1.5 border border-rose-500/20 rounded text-rose-400 hover:bg-rose-500/10"><Trash2 className="w-3.5 h-3.5"/></button></div>
        {selected.url && <img src={selected.url} className="w-full aspect-square object-contain bg-slate-900 rounded border border-slate-800 mt-3"/>}
        <div className="grid grid-cols-2 gap-2 mt-3 text-[9px] font-mono"><div><span className="text-slate-600">WORKFLOW</span><div className="text-slate-300 truncate">{selected.workflowId || '—'}</div></div><div><span className="text-slate-600">SEED</span><div className="text-slate-300">{selected.seed ?? '—'}</div></div><div><span className="text-slate-600">JOB</span><div className="text-slate-300 truncate">{selected.jobId || '—'}</div></div><div><span className="text-slate-600">FORMAT</span><div className="text-slate-300">{selected.fileFormat}</div></div></div>
        {selected.promptUsed && <div className="mt-3"><div className="text-[9px] text-slate-600 uppercase">Prompt</div><div className="mt-1 p-2 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400 leading-relaxed max-h-28 overflow-auto">{selected.promptUsed}</div></div>}
        <button onClick={()=>void useAsReference(selected)} disabled={busyId===selected.id || !selected.jobId} className="w-full mt-3 py-2 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-[9px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-40"><Wand2 className="w-3.5 h-3.5"/>{busyId===selected.id?'PREPARING REFERENCE…':'USE AS REFERENCE IN AI TOOLS'}</button>
        <a href={selected.url} target="_blank" rel="noreferrer" className="w-full mt-2 py-2 rounded border border-slate-800 bg-slate-900 text-slate-400 text-[9px] font-bold flex items-center justify-center gap-1.5"><ExternalLink className="w-3 h-3"/> OPEN IMAGE</a>
      </> : <div className="h-full min-h-64 flex flex-col items-center justify-center text-center"><ImageIcon className="w-8 h-8 text-slate-700"/><div className="text-xs text-slate-500 mt-2">Select an asset</div><div className="text-[9px] text-slate-700 mt-1">Choose an image to inspect metadata or reuse it as an AI Tools reference.</div></div>}
    </div>
  </div>;
};
