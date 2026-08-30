import React, { useMemo, useState } from 'react';
import { CheckCircle2, CircleAlert, Clipboard, Loader2, Play, RotateCcw, ShieldCheck, Timer } from 'lucide-react';

type TestStatus = 'PASS' | 'FAIL' | 'WARN' | 'RUNNING';
interface TestResult { name: string; status: TestStatus; details: string; durationMs?: number; group: string; }
interface SuiteReport { ok: boolean; generatedAt: string; results: TestResult[]; copyText: string; summary: string; }

const groups = ['Core', 'Local AI', 'Vision', 'Image Generation', 'Reference', 'Orchestration', 'Data', 'Hardware'];

export const TestSuitePanel: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [live, setLive] = useState(false);
  const [autoStart, setAutoStart] = useState(true);
  const [report, setReport] = useState<SuiteReport | null>(null);
  const [error, setError] = useState('');

  const run = async () => {
    if (running) return;
    setRunning(true); setError('');
    try {
      const response = await fetch('/api/diagnostics/test-suite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ live, autoStart })
      });
      const data = await response.json();
      if (!response.ok || !data?.results) throw new Error(data?.error || `Test suite HTTP ${response.status}`);
      setReport(data);
    } catch (e: any) { setError(e?.message || 'Unable to run test suite.'); }
    finally { setRunning(false); }
  };

  const copy = async () => {
    if (!report) return;
    await navigator.clipboard.writeText(report.copyText);
  };

  const counts = useMemo(() => {
    const results = report?.results || [];
    return { pass: results.filter(x => x.status === 'PASS').length, fail: results.filter(x => x.status === 'FAIL').length, warn: results.filter(x => x.status === 'WARN').length, total: results.length };
  }, [report]);

  return <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-4">
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-emerald-500/10 border border-emerald-500/20"><ShieldCheck className="w-5 h-5 text-emerald-400" /></div>
        <div><div className="text-sm font-bold text-slate-100 tracking-wide">GINA TEST SUITE</div><div className="text-[10px] text-slate-500 mt-1">One-click local integration checks. Quick mode is non-destructive.</div></div>
      </div>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-[9px] uppercase tracking-wider text-slate-400 bg-slate-900 border border-slate-800 rounded px-2.5 py-2 cursor-pointer" title="Runs additional live model/image smoke tests and may consume GPU time.">
          <input type="checkbox" checked={live} onChange={e => setLive(e.target.checked)} className="accent-emerald-500" /> LIVE SMOKE TESTS
        </label>
        {live && <label className="flex items-center gap-2 text-[9px] uppercase tracking-wider text-slate-400 bg-slate-900 border border-slate-800 rounded px-2.5 py-2 cursor-pointer" title="If Gemma is stopped, start it before live smoke tests.">
          <input type="checkbox" checked={autoStart} onChange={e => setAutoStart(e.target.checked)} className="accent-emerald-500" /> AUTO-START GEMMA
        </label>}
        <button onClick={run} disabled={running} className="flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-500 text-slate-950 text-[10px] font-black tracking-widest disabled:opacity-50">
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />} {running ? 'RUNNING…' : 'RUN ALL TESTS'}
        </button>
      </div>
    </div>

    {report && <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <div className="rounded border border-slate-800 bg-slate-900/60 p-2"><div className="text-[9px] text-slate-500 uppercase">Result</div><div className={`text-lg font-black ${report.ok ? 'text-emerald-400' : 'text-rose-400'}`}>{report.ok ? 'PASS' : 'ATTENTION'}</div></div>
      <div className="rounded border border-slate-800 bg-slate-900/60 p-2"><div className="text-[9px] text-slate-500 uppercase">Passed</div><div className="text-lg font-black text-emerald-400">{counts.pass}</div></div>
      <div className="rounded border border-slate-800 bg-slate-900/60 p-2"><div className="text-[9px] text-slate-500 uppercase">Failed</div><div className="text-lg font-black text-rose-400">{counts.fail}</div></div>
      <div className="rounded border border-slate-800 bg-slate-900/60 p-2"><div className="text-[9px] text-slate-500 uppercase">Warnings</div><div className="text-lg font-black text-amber-400">{counts.warn}</div></div>
    </div>}

    {error && <div className="flex items-start gap-2 rounded border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300"><CircleAlert className="w-4 h-4 shrink-0" />{error}</div>}

    {report && <>
      <div className="flex items-center justify-between gap-3"><div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">{report.summary} · {new Date(report.generatedAt).toLocaleTimeString()}</div><div className="flex gap-2"><button onClick={copy} className="flex items-center gap-1.5 text-[9px] font-bold uppercase px-2 py-1.5 rounded border border-slate-700 text-slate-300 hover:bg-slate-900"><Clipboard className="w-3 h-3"/> Copy Report</button><button onClick={run} disabled={running} className="flex items-center gap-1.5 text-[9px] font-bold uppercase px-2 py-1.5 rounded border border-slate-700 text-slate-300 hover:bg-slate-900"><RotateCcw className="w-3 h-3"/> Run Again</button></div></div>
      <div className="space-y-1.5 max-h-[520px] overflow-y-auto custom-scrollbar">
        {groups.map(group => {
          const items = report.results.filter(x => x.group === group); if (!items.length) return null;
          return <div key={group} className="space-y-1"><div className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mt-3">{group}</div>{items.map((item, i) => <div key={`${item.name}-${i}`} className="grid grid-cols-[auto_1fr_auto] gap-2 items-center rounded border border-slate-800 bg-slate-900/40 px-2.5 py-2"><span>{item.status === 'PASS' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400"/> : item.status === 'WARN' ? <CircleAlert className="w-3.5 h-3.5 text-amber-400"/> : item.status === 'RUNNING' ? <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin"/> : <CircleAlert className="w-3.5 h-3.5 text-rose-400"/>}</span><div className="min-w-0"><div className="text-[10px] font-semibold text-slate-200">{item.name}</div><div className="text-[9px] font-mono text-slate-500 truncate">{item.details}</div></div><div className="flex items-center gap-1 text-[8px] font-mono text-slate-600"><Timer className="w-3 h-3"/>{item.durationMs ?? 0}ms</div></div>)}</div>;
        })}
      </div>
    </>}
    {!report && !running && <div className="text-[10px] text-slate-600 border border-dashed border-slate-800 rounded p-4 text-center">No test run yet. Run All Tests to create a copy-ready diagnostic report.</div>}
  </div>;
};
