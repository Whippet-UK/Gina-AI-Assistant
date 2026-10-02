import React, { useState, useEffect } from 'react';
import { ShieldCheck, Activity, Moon, Sun } from 'lucide-react';
import { APP_VERSION } from '../version';

const THEME_KEY = 'gina.ui.theme';

interface HeaderProps {
  onRunAudit: () => void;
  onOpenManifest: () => void;
  onOpenTelemetry?: () => void;
  isAuditing: boolean;
  activeSavePoint: string;
}

export const Header: React.FC<HeaderProps> = ({
  onRunAudit,
  onOpenManifest,
  onOpenTelemetry,
  isAuditing,
  activeSavePoint,
}) => {
  const [timeString, setTimeString] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return 'dark';
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString('en-US', { hour12: false }) +
          '.' +
          String(now.getMilliseconds()).padStart(3, '0')
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('light', theme === 'light');
    root.classList.toggle('dark', theme === 'dark');
    root.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {}
  }, [theme]);

  return (
    <header className="gina-suite-header">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs bg-black border border-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.3)] shrink-0">GA</div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold text-slate-100 tracking-tight">Gina</span>
            <span className="text-[10px] font-mono text-slate-500">v{APP_VERSION}</span>
            <span className="text-[10px] font-mono text-slate-600 truncate hidden sm:inline">{activeSavePoint}</span>
          </div>
          <div className="text-[10px] font-mono text-slate-600">{timeString}</div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap justify-end">
        <button type="button" onClick={onRunAudit} disabled={isAuditing} className="gina-console-action text-slate-400 hover:text-emerald-300 disabled:opacity-40" title="Run local audit">
          <ShieldCheck className="w-3.5 h-3.5" />
          {isAuditing ? 'Auditing…' : 'Audit'}
        </button>
        <button type="button" onClick={onOpenManifest} className="gina-console-action text-slate-400 hover:text-slate-200" title="Restore manifest">
          Restore
        </button>
        {onOpenTelemetry && (
          <button type="button" onClick={onOpenTelemetry} className="gina-console-action text-slate-400 hover:text-sky-300" title="Live telemetry stream">
            <Activity className="w-3.5 h-3.5" />
            Telemetry
          </button>
        )}
        <button type="button" onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))} className="gina-console-action text-slate-500" title="Toggle theme">
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
      </div>
    </header>
  );
};
