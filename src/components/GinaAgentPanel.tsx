import React, { useEffect, useState } from 'react';
import { Bot, CheckCircle2, Clipboard, Cpu, FolderOpen, Play, Power, ShieldAlert, Sparkles, Terminal, Wrench, Brain, RefreshCw, Activity } from 'lucide-react';

interface GinaAgentPanelProps { disabled?: boolean; }

export const GinaAgentPanel: React.FC<GinaAgentPanelProps> = ({ disabled = false }) => {
  const [prompt, setPrompt] = useState('Inspect Gina AI Factory, understand all local tools and capabilities, then tell me what you can do and what is currently available.');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [access, setAccess] = useState(true);
  const [audit, setAudit] = useState<any[]>([]);
  const [contextInfo, setContextInfo] = useState<any>(null);
  const [selfTest, setSelfTest] = useState<any>(null);

  const refresh = async () => {
    try {
      const [a, l, c] = await Promise.all([fetch('/api/agent/access'), fetch('/api/agent/audit'), fetch('/api/agent/context')]);
      const ad = await a.json(); const ld = await l.json();
      setAccess(Boolean(ad.enabled)); setAudit(Array.isArray(ld.entries) ? ld.entries : []); setContextInfo(c.ok ? await c.json() : null);
    } catch { /* dashboard can still operate */ }
  };
  useEffect(() => { void refresh(); }, []);

  const toggleAccess = async () => {
    const next = !access;
    const res = await fetch('/api/agent/access', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({enabled:next}) });
    if (res.ok) { setAccess(next); void refresh(); }
  };


  const readJsonResponse = async (response: Response) => {
    const text = await response.text();
    if (!text.trim()) {
      throw new Error(`Server returned an empty response (HTTP ${response.status}). Check the Gina Dashboard terminal for the backend error.`);
    }
    try {
      return JSON.parse(text);
    } catch {
      const preview = text.replace(/\s+/g, ' ').slice(0, 300);
      throw new Error(`Server returned invalid JSON (HTTP ${response.status}). Response: ${preview}`);
    }
  };

  const runSelfTest = async () => { try { const r=await fetch('/api/agent/self-test'); const d=await readJsonResponse(r); setSelfTest(d); } catch (e:any) { setSelfTest({ok:false,error:e?.message||String(e)}); } };
  const refreshContext = async () => { try { const r=await fetch('/api/agent/context'); const d=await readJsonResponse(r); if(r.ok) setContextInfo(d); } catch {} };

  const run = async () => {
    const text = prompt.trim();
    if (!text || loading || disabled || !access) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const response = await fetch('/api/agent/run', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({prompt:text}) });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data?.error || data?.message || `HTTP ${response.status}`);
      setResult(data); await refresh();
    } catch (err:any) { setError(err?.message || 'Gina Agent request failed.'); }
    finally { setLoading(false); }
  };

  const quickAction = async (action: string, parameters: any = {}) => {
    if (disabled || loading || !access) return;
    setLoading(true); setError(null); setResult(null);
    try {
      // Capability Map is a direct diagnostic endpoint. It must not depend on the
      // LLM agent route, so it also works when an older Gina backend is still running.
      if (action === 'inspect_capabilities') {
        const response = await fetch('/api/capabilities', { cache: 'no-store' });
        const data = await readJsonResponse(response);
        if (!response.ok) throw new Error(data?.error || data?.message || `HTTP ${response.status}`);
        setResult({ fullAccess:true, summary:`Capability map ready: ${data.hardware?.cpu?.logicalThreads || data.hardware?.logicalThreads || '?'} logical CPU threads, ${data.models?.length || 0} models, ${data.generators?.length || 0} generators.`, result:data, steps:[{plan:{action:'inspect_capabilities'},toolResult:data}] });
        await refresh();
        return;
      }
      const response = await fetch('/api/agent/quick', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action, parameters}) });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data?.error || data?.message || `HTTP ${response.status}`);
      setResult(data); await refresh();
    } catch (err:any) { setError(err?.message || 'Gina quick action failed.'); }
    finally { setLoading(false); }
  };

  const copyResult = async () => { if (result) await navigator.clipboard.writeText(JSON.stringify(result, null, 2)); };
  const lastSteps = Array.isArray(result?.steps) ? result.steps : [];

  return (
    <section className="bg-slate-950 border border-amber-500/25 rounded-lg p-5 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-amber-400 font-bold">Autonomous local orchestration</div>
          <h2 className="text-xl font-semibold text-slate-100 mt-1 flex items-center gap-2"><Bot className="w-5 h-5 text-amber-400" /> Gina Agent</h2>
          <p className="text-xs text-slate-500 mt-1">Gina can inspect, read, write, execute local project tools, control ComfyUI and manage Gemma.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-mono px-2 py-1 rounded border ${access ? 'text-rose-300 border-rose-500/30 bg-rose-500/5' : 'text-slate-500 border-slate-700'}`}>
            {access ? 'FULL LOCAL ACCESS' : 'READ-ONLY / DISABLED'}
          </span>
          <button onClick={() => void toggleAccess()} className={`px-3 py-2 rounded border text-[9px] font-bold uppercase tracking-wider flex items-center gap-2 ${access ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>
            <Power className="w-3.5 h-3.5" /> {access ? 'Disable' : 'Enable'}
          </button>
        </div>
      </div>

      {access && <div className="mb-4 p-3 rounded border border-rose-500/20 bg-rose-500/5 text-[10px] text-rose-200 flex gap-2"><ShieldAlert className="w-4 h-4 shrink-0" /><div><b>Full access is enabled.</b> Gina may read/write files inside <code>C:\Gina_AI</code>, run Windows commands, control ComfyUI and start/stop the local LLM. Every tool call is recorded in the local audit log.</div></div>}

      <div className="grid lg:grid-cols-[1.2fr_0.9fr] gap-4">
        <div>
          <label className="block text-[9px] uppercase tracking-widest text-slate-500 mb-2">Tell Gina what to do</label>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} disabled={disabled || loading || !access} rows={8} className="w-full rounded-md border border-slate-800 bg-slate-900/70 text-slate-200 text-xs p-3 outline-none focus:border-amber-500/50 resize-y" />
          <div className="flex flex-wrap gap-2 mt-3">
            <button onClick={() => void quickAction('inspect_capabilities')} className="px-3 py-2 rounded border border-slate-700 bg-slate-900 text-slate-300 text-[9px] font-bold uppercase tracking-wider flex items-center gap-2"><Cpu className="w-3.5 h-3.5" /> Capability Map</button>
            <button onClick={() => void refreshContext()} className="px-3 py-2 rounded border border-slate-700 bg-slate-900 text-slate-300 text-[9px] font-bold uppercase tracking-wider flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5" /> Load Context</button>
            <button onClick={() => void runSelfTest()} className="px-3 py-2 rounded border border-slate-700 bg-slate-900 text-slate-300 text-[9px] font-bold uppercase tracking-wider flex items-center gap-2"><Activity className="w-3.5 h-3.5" /> Self Test</button>
            <button onClick={() => setPrompt('Inspect the AIDA64 generator code and fix any obvious TypeScript/runtime errors you find. Run a focused validation after the edits.')} className="px-3 py-2 rounded border border-slate-700 bg-slate-900 text-slate-300 text-[9px] font-bold uppercase tracking-wider flex items-center gap-2"><Wrench className="w-3.5 h-3.5" /> Fix Project</button>
            <button onClick={() => void quickAction('build_aida64_template', { width:1024, height:600, warningThreshold:50, criticalThreshold:90, showText:false, showNumbers:false })} className="px-3 py-2 rounded border border-slate-700 bg-slate-900 text-slate-300 text-[9px] font-bold uppercase tracking-wider flex items-center gap-2"><Sparkles className="w-3.5 h-3.5" /> AIDA64</button>
            <button onClick={run} disabled={disabled || loading || !prompt.trim() || !access} className="px-4 py-2 rounded border border-amber-400/40 bg-amber-400 text-slate-950 text-[9px] font-extrabold uppercase tracking-wider disabled:opacity-40 flex items-center gap-2"><Play className="w-3.5 h-3.5" /> {loading ? 'Working…' : 'Run Gina'}</button>
          </div>
        </div>

        <div className="rounded-md border border-slate-800 bg-slate-900/50 p-4 h-[420px] min-h-0 overflow-hidden">
          {!result && !error && <div className="h-full flex items-center justify-center text-center text-slate-600 text-xs"><div><Bot className="w-6 h-6 mx-auto mb-2 text-slate-700" /><p>Gina can now operate local tools.</p><p className="text-[10px] mt-1">She will inspect before editing when practical.</p></div></div>}
          {error && <div className="text-xs text-rose-300 border border-rose-500/30 bg-rose-500/5 rounded p-3">{error}</div>}
          {result && <div className="h-full min-h-0 flex flex-col space-y-3">
            <div className="flex items-center justify-between"><span className="text-[9px] uppercase tracking-widest text-slate-500">Agent result</span><button onClick={() => void copyResult()} className="text-[9px] text-amber-300 flex items-center gap-1"><Clipboard className="w-3 h-3" /> Copy JSON</button></div>
            <div className="max-h-48 overflow-y-auto custom-scrollbar text-xs leading-relaxed text-slate-300 whitespace-pre-wrap break-words pr-1">{result.summary}</div>
            <div className="text-[9px] uppercase tracking-widest text-slate-600">Tool steps: {lastSteps.length}</div>
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-2 pr-1">{lastSteps.map((step:any, i:number) => <div key={i} className="rounded border border-slate-800 bg-slate-950 p-2"><div className="flex items-center gap-2 text-[9px] font-mono text-emerald-300"><CheckCircle2 className="w-3 h-3" /> {step?.plan?.action || 'none'}</div>{step?.toolResult && <pre className="mt-1 text-[8px] text-slate-500 whitespace-pre-wrap">{JSON.stringify(step.toolResult, null, 2).slice(0, 4000)}</pre>}</div>)}</div>
          </div>}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded border border-slate-800 bg-slate-950 p-3">
          <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2"><Brain className="w-3.5 h-3.5 text-amber-400" /> Persistent project awareness</div>
          <div className="mt-2 text-[10px] text-slate-400">{contextInfo ? `${contextInfo.snapshot?.primaryFiles?.filter((f:any)=>f.exists).length || 0} core files loaded · ${contextInfo.snapshot?.workflowSummary?.length || 0} workflows indexed` : 'Context not loaded yet.'}</div>
          <div className="mt-2 text-[9px] font-mono text-slate-600 break-all">C:\Gina_AI\.gina\agent-memory.json</div>
        </div>
        <div className="rounded border border-slate-800 bg-slate-950 p-3">
          <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2"><Activity className="w-3.5 h-3.5 text-emerald-400" /> Agent self-test</div>
          <div className={`mt-2 text-[10px] ${selfTest?.ok ? 'text-emerald-400' : selfTest ? 'text-rose-400' : 'text-slate-600'}`}>{selfTest ? (selfTest.ok ? `PASS · ${selfTest.checks?.length || 0} checks` : `FAIL · ${selfTest.error || 'one or more checks failed'}`) : 'Not run.'}</div>
        </div>
      </div>

      <details className="mt-4 rounded border border-slate-800 bg-slate-950 p-3">
        <summary className="cursor-pointer text-[9px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2"><Terminal className="w-3.5 h-3.5" /> Agent audit log ({audit.length})</summary>
        <div className="mt-3 max-h-56 overflow-auto space-y-1">{audit.map((e:any,i:number)=><div key={i} className="text-[8px] font-mono text-slate-600"><span className={e.success?'text-emerald-500':'text-rose-400'}>{e.success?'OK':'FAIL'}</span> {new Date(e.timestamp).toLocaleTimeString()} {e.action} — {e.resultPreview}</div>)}</div>
      </details>
    </section>
  );
};
