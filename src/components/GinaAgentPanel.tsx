import React, { useEffect, useRef, useState } from 'react';
import { Bot, CheckCircle2, Clipboard, Cpu, FolderOpen, Play, Power, ShieldAlert, Sparkles, Terminal, Wrench, Brain, RefreshCw, Activity, Upload, Github, GitBranch } from 'lucide-react';

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
  const [uploading, setUploading] = useState(false);
  const [workspace, setWorkspace] = useState('');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [webStatus, setWebStatus] = useState<any>(null);
  const [liveEvents, setLiveEvents] = useState<any[]>([]);
  const [currentPhase, setCurrentPhase] = useState('READY');
  const streamRef = useRef<EventSource | null>(null);

  useEffect(() => () => { streamRef.current?.close(); }, []);

  const refresh = async () => {
    try {
      const [a, l, c, w] = await Promise.all([fetch('/api/agent/access'), fetch('/api/agent/audit'), fetch('/api/agent/context'), fetch('/api/agent/web-status')]);
      const ad = await a.json(); const ld = await l.json();
      setAccess(Boolean(ad.enabled)); setWebStatus(w.ok ? await w.json() : null); setAudit(Array.isArray(ld.entries) ? ld.entries : []); setContextInfo(c.ok ? await c.json() : null);
    } catch { /* dashboard can still operate */ }
  };
  useEffect(() => {
    void refresh();
    const saved = typeof window !== 'undefined' ? localStorage.getItem('gina_agent_active_run') : null;
    if (saved) {
      void fetch(`/api/agent/runs/${encodeURIComponent(saved)}`).then(r => r.ok ? r.json() : null).then(run => {
        if (!run) return;
        setRunId(run.id); setLiveEvents(run.events || []); setCurrentPhase(run.state || 'READY');
        if (run.result) setResult(run.result);
        if (['QUEUED','RUNNING'].includes(run.state)) { setLoading(true); setStartedAt(Date.parse(run.createdAt) || Date.now()); connectToRun(run.id); }
      }).catch(() => undefined);
    }
  }, []);

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

  const connectToRun = (id: string) => {
    streamRef.current?.close();
    const source = new EventSource(`/api/agent/runs/${encodeURIComponent(id)}/stream`);
    streamRef.current = source;
    const handle = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data || '{}');
        const entry = { id: Number(event.lastEventId || Date.now()), type: event.type || 'message', ...data };
        setLiveEvents(prev => [...prev, entry].slice(-120));
        if (data.phase) setCurrentPhase(String(data.phase));
        if (event.type === 'step_completed' || event.type === 'step_failed') {
          setResult((prev:any) => prev ? prev : { fullAccess:true, summary:'Gina is working…', steps:[] });
        }
        if (event.type === 'state') {
          const state = String(data.state || '');
          if (state === 'COMPLETED' || state === 'FAILED' || state === 'CANCELLED') {
            setLoading(false);
            setCurrentPhase(state);
            if (['COMPLETED','FAILED','CANCELLED'].includes(state)) localStorage.removeItem('gina_agent_active_run');
            if (state === 'COMPLETED') {
              void fetch(`/api/agent/runs/${encodeURIComponent(id)}`).then(r=>r.json()).then(run=>setResult(run.result || { summary:run.summary, steps:[] })).catch(()=>setResult((prev:any)=>({ ...(prev||{}), summary:data.summary || prev?.summary || 'Agent operation completed.' })));
            } else if (state === 'FAILED') {
              setError(data.error || 'Gina Agent failed.');
            }
            void refresh();
            source.close();
          }
        }
        if (event.type === 'error') {
          setError(data.message || 'Gina Agent failed.');
        }
      } catch { /* ignore malformed heartbeat/event payloads */ }
    };
    ['run_started','status','step_started','step_completed','step_failed','state','error'].forEach(type => source.addEventListener(type, handle));
    source.onerror = () => {
      // EventSource reconnects automatically. The persisted event log prevents lost steps.
      setCurrentPhase(prev => prev === 'READY' ? 'RECONNECTING' : prev);
    };
  };

  const run = async () => {
    const text = prompt.trim();
    if (!text || loading || disabled || !access) return;
    streamRef.current?.close();
    setLoading(true); setError(null); setResult(null); setLiveEvents([]); setCurrentPhase('QUEUED'); setStartedAt(Date.now()); setRunId(null);
    try {
      const response = await fetch('/api/agent/run-stream', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({prompt: workspace.trim() ? `ACTIVE WORKSPACE: ${workspace.trim()}\n\n${text}` : text}) });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data?.error || data?.message || `HTTP ${response.status}`);
      setRunId(data.runId);
      localStorage.setItem('gina_agent_active_run', data.runId);
      connectToRun(data.runId);
    } catch (err:any) { setLoading(false); setError(err?.message || 'Gina Agent request failed.'); }
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

  const uploadProject = async (file?: File) => {
    if (!file || loading || !access) return;
    setUploading(true); setError(null);
    try {
      const response = await fetch('/api/agent/upload-project', { method:'POST', headers:{'Content-Type':file.type || 'application/octet-stream','X-Filename':encodeURIComponent(file.name)}, body:file });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`);
      setPrompt(data.readyForImport
        ? `Import the uploaded project archive at ${data.path} into a dedicated workspace. Inspect it, report its structure and Git status, and do not execute uploaded code yet.`
        : `Inspect the uploaded file at ${data.path}, explain what it contains, and make no changes unless I ask.`);
      setResult({fullAccess:true,summary:`Uploaded ${data.filename} (${Math.round(data.bytes/1024)} KB). Gina is ready to inspect/import it.`,result:data,steps:[{plan:{action:'upload_project'},toolResult:data}]});
      await refresh();
    } catch (err:any) { setError(err?.message || 'Project upload failed.'); }
    finally { setUploading(false); }
  };
  const copyResult = async () => { if (result) await navigator.clipboard.writeText(JSON.stringify(result, null, 2)); };
  const lastSteps = Array.isArray(result?.steps) ? result.steps : [];

  return (
    <section className="bg-slate-950 border border-amber-500/25 rounded-lg p-5 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-amber-400 font-bold">Autonomous local orchestration</div>
          <h2 className="text-xl font-semibold text-slate-100 mt-1 flex items-center gap-2"><Bot className="w-5 h-5 text-amber-400" /> Gina Agent</h2>
          <p className="text-xs text-slate-500 mt-1">Gina can inspect, read, write, execute local project tools, research the live internet when useful, control ComfyUI and manage the active Qwen local AI engines.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-mono px-2 py-1 rounded border ${access ? 'text-rose-300 border-rose-500/30 bg-rose-500/5' : 'text-slate-500 border-slate-700'}`}>
            {access ? 'FULL LOCAL ACCESS' : 'READ-ONLY / DISABLED'}
          </span>
          <span className={`text-[9px] font-mono px-2 py-1 rounded border ${webStatus?.enabled ? 'text-cyan-300 border-cyan-500/30 bg-cyan-500/5' : 'text-slate-500 border-slate-700'}`}>
            {webStatus?.enabled ? 'WEB RESEARCH ON' : 'WEB RESEARCH OFF'}
          </span>
          <button onClick={() => void toggleAccess()} className={`px-3 py-2 rounded border text-[9px] font-bold uppercase tracking-wider flex items-center gap-2 ${access ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>
            <Power className="w-3.5 h-3.5" /> {access ? 'Disable' : 'Enable'}
          </button>
        </div>
      </div>

      {access && <div className="mb-4 p-3 rounded border border-rose-500/20 bg-rose-500/5 text-[10px] text-rose-200 flex gap-2"><ShieldAlert className="w-4 h-4 shrink-0" /><div><b>Full access is enabled.</b> Gina may read/write files inside <code>C:\Gina_AI</code>, operate dedicated repository workspaces, run validation commands, control ComfyUI and start/stop the local LLM. GitHub actions can be enabled through a scoped credential. Every tool call is recorded in the local audit log.</div></div>}

      <div className="grid lg:grid-cols-[1.2fr_0.9fr] gap-4">
        <div>
          <label className="block text-[9px] uppercase tracking-widest text-slate-500 mb-2">Tell Gina what to do</label>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} disabled={disabled || loading || !access} rows={8} className="w-full rounded-md border border-slate-800 bg-slate-900/70 text-slate-200 text-xs p-3 outline-none focus:border-amber-500/50 resize-y" />
          <div className="mt-2 flex items-center gap-2"><input value={workspace} onChange={e=>setWorkspace(e.target.value)} disabled={disabled || loading || !access} placeholder="Optional workspace name (e.g. Gina-AI-Assistant-main)" className="flex-1 rounded-md border border-slate-800 bg-slate-950 text-slate-300 text-[10px] px-3 py-2 outline-none focus:border-amber-500/50" /><span className="text-[8px] uppercase tracking-widest text-slate-600">agent workspace</span></div>
          <div className="flex flex-wrap gap-2 mt-3">
            <button onClick={() => void quickAction('inspect_capabilities')} className="px-3 py-2 rounded border border-slate-700 bg-slate-900 text-slate-300 text-[9px] font-bold uppercase tracking-wider flex items-center gap-2"><Cpu className="w-3.5 h-3.5" /> Capability Map</button>
            <button onClick={() => void refreshContext()} className="px-3 py-2 rounded border border-slate-700 bg-slate-900 text-slate-300 text-[9px] font-bold uppercase tracking-wider flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5" /> Load Context</button>
            <label className="px-3 py-2 rounded border border-slate-700 bg-slate-900 text-slate-300 text-[9px] font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer"><Upload className="w-3.5 h-3.5" /> {uploading ? 'UPLOADING…' : 'UPLOAD PROJECT'}<input type="file" accept=".zip,.json,.txt,.md,.js,.ts,.tsx,.jsx" className="hidden" disabled={disabled || loading || uploading || !access} onChange={e => void uploadProject(e.target.files?.[0])}/></label>
            <button onClick={() => setPrompt('Clone a GitHub repository into a dedicated Gina workspace, inspect its structure and current branch/status, then tell me what you would change before editing anything.')} className="px-3 py-2 rounded border border-slate-700 bg-slate-900 text-slate-300 text-[9px] font-bold uppercase tracking-wider flex items-center gap-2"><Github className="w-3.5 h-3.5" /> GitHub Repo</button>
            <button onClick={() => setPrompt('Inspect the active workspace, create a safe feature branch, identify the relevant code, make the requested fix, run the project validation, and report the diff. Do not push until I explicitly ask.')} className="px-3 py-2 rounded border border-slate-700 bg-slate-900 text-slate-300 text-[9px] font-bold uppercase tracking-wider flex items-center gap-2"><GitBranch className="w-3.5 h-3.5" /> Code Task</button>
            <button onClick={() => void runSelfTest()} className="px-3 py-2 rounded border border-slate-700 bg-slate-900 text-slate-300 text-[9px] font-bold uppercase tracking-wider flex items-center gap-2"><Activity className="w-3.5 h-3.5" /> Self Test</button>
            <button onClick={() => setPrompt('Inspect the AIDA64 generator code and fix any obvious TypeScript/runtime errors you find. Run a focused validation after the edits.')} className="px-3 py-2 rounded border border-slate-700 bg-slate-900 text-slate-300 text-[9px] font-bold uppercase tracking-wider flex items-center gap-2"><Wrench className="w-3.5 h-3.5" /> Fix Project</button>
            <button onClick={() => void quickAction('build_aida64_template', { width:1024, height:600, warningThreshold:50, criticalThreshold:90, showText:false, showNumbers:false })} className="px-3 py-2 rounded border border-slate-700 bg-slate-900 text-slate-300 text-[9px] font-bold uppercase tracking-wider flex items-center gap-2"><Sparkles className="w-3.5 h-3.5" /> AIDA64</button>
            <button onClick={run} disabled={disabled || loading || !prompt.trim() || !access} className="px-4 py-2 rounded border border-amber-400/40 bg-amber-400 text-slate-950 text-[9px] font-extrabold uppercase tracking-wider disabled:opacity-40 flex items-center gap-2"><Play className="w-3.5 h-3.5" /> {loading ? 'Working…' : 'Run Gina'}</button>
          </div>
        </div>

        <div className="rounded-md border border-slate-800 bg-slate-900/50 p-4 h-[420px] min-h-0 overflow-hidden">
          {!result && !error && <div className="h-full flex items-center justify-center text-center text-slate-600 text-xs"><div><Bot className="w-6 h-6 mx-auto mb-2 text-slate-700" /><p>Gina can now operate local tools.</p><p className="text-[10px] mt-1">She will inspect before editing when practical.</p></div></div>}
          {error && <div className="text-xs text-rose-300 border border-rose-500/30 bg-rose-500/5 rounded p-3">{error}</div>}
          {(result || loading || liveEvents.length > 0) && <div className="h-full min-h-0 flex flex-col space-y-3">
            <div className="rounded border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[9px] font-mono text-amber-200">
              <div className="flex items-center justify-between gap-2"><span className="uppercase tracking-widest">Persistent Agent Workbench</span><span>{runId ? `${currentPhase} · ${Math.max(0, Math.round(((startedAt || Date.now())-Date.now())/-1000))}s` : 'READY'}</span></div>
              <div className="mt-1 text-slate-500">INSPECTING FILES → READING → EDITING → RUNNING VALIDATION → REPAIRING → VERIFYING DIFF</div>
            </div>
            {runId && loading && <div className="flex items-center justify-between gap-2 rounded border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-[10px]">
              <span className="text-sky-300 font-mono">{currentPhase}</span>
              <button onClick={async()=>{ await fetch(`/api/agent/runs/${encodeURIComponent(runId)}/cancel`,{method:'POST'}); }} className="text-rose-300 hover:text-rose-200 font-bold uppercase tracking-wider">Cancel</button>
            </div>}
            {result?.summary && <div className="max-h-28 overflow-y-auto custom-scrollbar text-xs leading-relaxed text-slate-300 whitespace-pre-wrap break-words pr-1">{result.summary}</div>}
            <div className="text-[9px] uppercase tracking-widest text-slate-600">Live execution · {liveEvents.length} events · {lastSteps.length} persisted steps</div>
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-2 pr-1">
              {liveEvents.map((event:any, i:number) => <div key={`${event.id}-${i}`} className={`rounded border p-2 ${event.type === 'step_failed' || event.type === 'error' ? 'border-rose-500/30 bg-rose-500/5' : event.type === 'step_completed' ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-slate-800 bg-slate-950'}`}>
                <div className="flex items-center gap-2 text-[9px] font-mono"><span className="text-slate-600">{String(event.type).toUpperCase()}</span><span className="text-sky-300">{event.phase || event.action || ''}</span><span className="text-slate-600 ml-auto">{event.step ? `STEP ${event.step}/10` : ''}</span></div>
                <div className="mt-1 text-[10px] text-slate-300">{event.message || event.summary || event.error || ''}</div>
              </div>)}
              {!liveEvents.length && loading && <div className="text-[10px] text-slate-600 font-mono">Waiting for the first agent event…</div>}
            </div>
            {result && <div className="flex items-center justify-between border-t border-slate-800 pt-2"><span className="text-[9px] uppercase tracking-widest text-slate-600">Run {runId || 'legacy'}</span><button onClick={() => void copyResult()} className="text-[9px] text-amber-300 flex items-center gap-1"><Clipboard className="w-3 h-3" /> Copy JSON</button></div>}
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
