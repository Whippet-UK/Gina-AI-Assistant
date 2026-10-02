import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Power, RefreshCw, Square, Terminal, Volume2, VolumeX, Wrench } from 'lucide-react';

type BootMode = 'dashboard-only' | 'dashboard-comfy' | 'factory' | 'manual';

interface TerminalRow {
  id: string;
  pid: number;
  title: string;
  relativePath: string;
  startedAt: string;
  alive: boolean;
}

interface DevState {
  developmentMode: boolean;
  bootMode: BootMode;
  platform: string;
  dashboardOnly: boolean;
  heavyInitialization: boolean;
  terminals: TerminalRow[];
}

interface BatRow {
  relativePath: string;
  title: string;
}

interface ConsoleLine {
  id: string;
  ts: string;
  level: 'INFO' | 'WARN' | 'OK' | 'CMD';
  msg: string;
}

const MODES: Array<{ id: BootMode; label: string; detail: string }> = [
  { id: 'dashboard-only', label: 'Dashboard Only', detail: 'Gina UI/API only. No ComfyUI, AIDA, or knowledge reindex.' },
  { id: 'dashboard-comfy', label: 'Dashboard + ComfyUI', detail: 'Open Gina immediately while ComfyUI starts separately.' },
  { id: 'manual', label: 'Manual / Cold', detail: 'Keep automatic background services off; start BATs yourself.' },
  { id: 'factory', label: 'Full Factory', detail: 'Normal Start_Factory.bat full stack.' },
];

function ts() {
  return new Date().toISOString().slice(11, 23);
}

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
      if (a.ok) {
        setState(s);
        setSelectedMode((s.bootMode as BootMode) || 'dashboard-only');
      } else {
        push('WARN', s?.error || `Dev state HTTP ${a.status}`);
      }
      if (b.ok) setBats(Array.isArray(x.startups) ? x.startups : []);
    } catch (e: any) {
      push('WARN', e?.message || 'Development Mode API unavailable.');
    }
  }, [push]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 3000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [lines]);

  const post = async (url: string, body?: any) => {
    setBusy(url);
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      push('OK', d.message || (d.restarting ? `Restarting Gina in ${selectedMode} mode…` : 'Command completed.'));
      await load();
    } catch (e: any) {
      push('WARN', e?.message || 'Command failed.');
    } finally {
      setBusy(null);
    }
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
        <select
          value={selectedMode}
          onChange={e => setSelectedMode(e.target.value as BootMode)}
          className="gina-console-select"
          title="Boot mode"
        >
          {MODES.map(m => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
        <span className="text-[10px] font-mono text-slate-500">
          {state?.dashboardOnly ? 'light' : 'heavy'} · {state?.platform || '—'}
        </span>
        <button type="button" disabled={!!busy} onClick={() => void post('/api/dev/mode', { bootMode: selectedMode })} className="gina-console-action text-emerald-300" title="Apply mode & restart light">
          <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} /> Apply
        </button>
        <button type="button" disabled={!!busy} onClick={() => void post('/api/dev/stop-all')} className="gina-console-action text-rose-300" title="Stop tracked processes">
          <Square className="w-3.5 h-3.5" /> Stop
        </button>
        <button type="button" disabled={!!busy} onClick={() => void load()} className="gina-console-action text-slate-400">
          <Terminal className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="gina-console-toolbar gap-2">
        <input
          value={batFilter}
          onChange={e => setBatFilter(e.target.value)}
          placeholder="Filter launchers…"
          className="gina-console-search"
        />
        <select
          className="gina-console-select min-w-[12rem]"
          defaultValue=""
          onChange={e => {
            const v = e.target.value;
            e.target.value = '';
            if (v) void post('/api/dev/run-startup', { relativePath: v });
          }}
        >
          <option value="" disabled>Run launcher…</option>
          {filteredBats.map(b => (
            <option key={b.relativePath} value={b.relativePath}>{b.title || b.relativePath}</option>
          ))}
        </select>
      </div>

      {(state?.terminals || []).length > 0 && (
        <div className="px-1 py-1 text-[11px] font-mono text-slate-500">
          {(state?.terminals || []).map(t => (
            <div key={t.id}>{t.alive ? '●' : '○'} pid {t.pid} · {t.title || t.relativePath}</div>
          ))}
        </div>
      )}

      <div ref={logRef} className="gina-console-stream font-mono text-[12px] leading-5 flex-1 min-h-[50vh]">
        {lines.map(line => (
          <div key={line.id} className={`gina-console-line ${levelColor(line.level)}`}>
            <span className="text-slate-600">{line.ts}</span>{'  '}{line.level}{'  '}{line.msg}
          </div>
        ))}
      </div>
    </div>
  );
};
