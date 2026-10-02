import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, Square, Terminal, Wrench } from 'lucide-react';

type BootMode = 'dashboard-only' | 'dashboard-comfy' | 'factory' | 'manual';
interface TerminalRow { id: string; pid: number; title: string; relativePath: string; startedAt: string; alive: boolean; }
interface DevState { developmentMode: boolean; bootMode: BootMode; platform: string; dashboardOnly: boolean; heavyInitialization: boolean; terminals: TerminalRow[]; }
interface BatRow { relativePath: string; title: string; }
interface ConsoleLine { id: string; ts: string; level: 'INFO' | 'WARN' | 'OK' | 'CMD'; msg: string; }

const MODES: Array<{ id: BootMode; label: string; detail: string }> = [
  { id: 'dashboard-only', label: 'Dashboard Only', detail: 'Gina UI/API only. No ComfyUI, AIDA, or knowledge reindex.' },
  { id: 'dashboard-comfy', label: 'Dashboard + ComfyUI', detail: 'Open Gina immediately while ComfyUI starts separately.' },
  { id: 'manual', label: 'Manual / Cold', detail: 'Keep automatic background services off; start BATs yourself.' },
  { id: 'factory', label: 'Full Factory', detail: 'Normal Start_Factory.bat full stack.' },
];

function ts() { return new Date().toISOString().slice(11, 23); }

export const DevelopmentModePanel: React.FC = () => {
  const [state, setState] = useState<DevState | null>(null);
  const [bats, setBats] = useState<BatRow[]>([]);
  const [selectedMode, setSelectedMode] = useState<BootMode>('dashboard-only');
  const [busy, setBusy] = useState<string | null>(null);
  const [lines, setLines] = useState<ConsoleLine[]>([
    { id: 'boot', ts: ts(), level: 'INFO', msg: 'Development Mode console ready. Full-bleed text stream — no frames.' },
  ]);
  const [batFilter, setBatFilter] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

  const push = useCallback((level: ConsoleLine['level'], msg: string) => {
    setLines(prev => [...prev.slice(-400), { id: Math.random().toString(36).slice(2, 10), ts: ts(), level, msg }]);
  }, []);

  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([
        fetch('/api/dev/state', { cache: 'no-store' }),
        fetch('/api/dev/startups', { cache: 'no-store' }),
      ]);
      const s = await a.json().catch(() => ({}));
      const x = await b.json().catch(() => ({}));
      if (a.ok) { setState(s); setSelectedMode((s.bootMode as BootMode) || 'dashboard-only'); }
      else push('WARN', s?.error || `Dev state HTTP ${a.status}`);
      if (b.ok) setBats(Array.isArray(x.startups) ? x.startups : []);
    } catch (e: any) {
      push('WARN', e?.message || 'Development Mode API unavailable.');
    }
  }, [push]);

  useEffect(() => { void load(); const t = setInterval(() => void load(), 3000); return () => clearInterval(t); }, [load]);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [lines]);

  const post = async (url: string, body?: any) => {
    setBusy(url);
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      push('OK', d.message || (d.restarting ? `Restarting Gina in ${selectedMode} mode…` : 'Command completed.'));
      await load();
    } catch (e: any) {
      push('WARN', e?.message || 'Command failed.');
    } finally { setBusy(null); }
  };

  const filteredBats = bats.filter(b => {
    if (!batFilter.trim()) return true;
    const q = batFilter.toLowerCase();
    return b.relativePath.toLowerCase().includes(q) || b.title.toLowerCase().includes(q);
  });

  const levelColor = (level: ConsoleLine['level']) => {
    if (level === 'WARN') return 'text-amber-400';
    if (level === 'OK') return 'text-emerald-400';
    if (level === 'CMD') return 'text-sky-400';
    return 'text-slate-400';
  };

  return (
    <div className="gina-console-shell">
      <div className="gina-console-toolbar">
        <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-bold tracking-[0.2em] uppercase">
          <Wrench className="w-3.5 h-3.5" /> Development Mode
        </div>
        <select value={selectedMode} onChange={e => setSelectedMode(e.target.value as BootMode)} className="gina-console-select" title="Boot mode">
          {MODES.map(m => (<option key={m.id} value={m.id}>{m.label}</option>))}
        </select>
        <span className="text-[10px] font-mono text-slate-500">{state?.heavyInitialization ? 'HEAVY' : 'LIGHT'} · {state?.bootMode || '…'} · {state?.platform || '…'}</span>
        <div className="ml-auto flex items-center gap-3">
          <button type="button" disabled={busy !== null} onClick={() => { push('CMD', `Restart in ${selectedMode}`); void post('/api/dev/restart', { mode: selectedMode }); }} className="gina-console-action text-emerald-300"><RefreshCw className="w-3 h-3" /> Restart</button>
          <button type="button" disabled={busy !== null} onClick={() => { push('CMD', 'Close managed terminals'); void post('/api/dev/close-terminals'); }} className="gina-console-action text-rose-300"><Square className="w-3 h-3" /> Close terminals</button>
          <button type="button" onClick={() => void load()} className="gina-console-action text-slate-400"><RefreshCw className="w-3 h-3" /></button>
        </div>
      </div>
      <div className="gina-console-meta text-[10px] text-slate-500 font-mono px-3 py-1">
        {MODES.find(m => m.id === selectedMode)?.detail}
        {state?.terminals?.length ? ` · ${state.terminals.length} managed terminal(s)` : ' · no managed terminals'}
      </div>
      <div ref={logRef} className="gina-console-stream font-mono text-[11px] leading-5">
        {lines.map(l => (
          <div key={l.id} className="gina-console-line">
            <span className="text-slate-600">{l.ts}</span>{' '}
            <span className={levelColor(l.level)}>[{l.level}]</span>{' '}
            <span className="text-slate-300">{l.msg}</span>
          </div>
        ))}
        {(state?.terminals || []).map(row => (
          <div key={row.id} className="gina-console-line">
            <span className="text-slate-600">{ts()}</span>{' '}
            <span className="text-sky-400">[TERM]</span>{' '}
            <span className="text-slate-300">{row.title} PID {row.pid} · {row.relativePath} · {row.alive ? 'alive' : 'dead'}</span>{' '}
            <button type="button" className="text-rose-400 hover:text-rose-300 underline ml-2" onClick={() => { push('CMD', `Terminate ${row.title}`); void post('/api/dev/terminate', { id: row.id }); }}>kill</button>
          </div>
        ))}
      </div>
      <div className="gina-console-toolbar border-t-0">
        <Terminal className="w-3.5 h-3.5 text-slate-500" />
        <input value={batFilter} onChange={e => setBatFilter(e.target.value)} placeholder="Search startup scripts…" className="gina-console-search" />
        <select className="gina-console-select flex-1 max-w-md" defaultValue="" onChange={e => { const path = e.target.value; if (!path) return; push('CMD', `Run ${path}`); void post('/api/dev/run-bat', { relativePath: path }); e.target.value = ''; }}>
          <option value="">Run startup BAT…</option>
          {filteredBats.map(script => (<option key={script.relativePath} value={script.relativePath}>{script.relativePath}</option>))}
        </select>
        <span className="text-[9px] font-mono text-slate-600">{filteredBats.length}/{bats.length}</span>
      </div>
    </div>
  );
};
