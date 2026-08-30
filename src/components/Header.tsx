import React, { useState, useEffect } from 'react';
import { ShieldCheck, Cpu, Download, RefreshCw, Activity, Lock } from 'lucide-react';
import { APP_VERSION } from '../version';

interface HeaderProps {
  onRunAudit: () => void;
  onOpenManifest: () => void;
  isAuditing: boolean;
  activeSavePoint: string;
}

export const Header: React.FC<HeaderProps> = ({
  onRunAudit,
  onOpenManifest,
  isAuditing,
  activeSavePoint
}) => {
  const [timeString, setTimeString] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(now.toLocaleTimeString('en-US', { hour12: false }) + '.' + String(now.getMilliseconds()).padStart(3, '0'));
    };
    updateTime();
    const interval = setInterval(updateTime, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-slate-800 pb-3.5 mb-5 bg-slate-900/60 backdrop-blur-md p-3.5 rounded-lg border">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center text-slate-950 font-bold text-xs shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
              GX
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100 tracking-tight flex items-center gap-2">
                GINA AI FACTORY <span className="text-emerald-400 text-xs font-mono font-normal bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">COMMAND v{APP_VERSION}</span>
              </h1>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                <span>Automated Local Video & Image Production Matrix</span>
                <span className="text-slate-700">|</span>
                <span className="text-slate-400 font-mono text-[10px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  UTC: {timeString || 'LIVE'}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded text-xs font-mono">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-500">STATUS:</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              AUDITING READY
            </span>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 border border-amber-500/30 px-2.5 py-1 rounded text-xs font-mono">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-500">SAVE:</span>
            <span className="text-amber-400 font-bold">{activeSavePoint}</span>
          </div>

          <button
            onClick={onRunAudit}
            disabled={isAuditing}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1.5 rounded text-xs transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer uppercase tracking-tight"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
            {isAuditing ? 'AUDITING...' : 'RUN AUDIT'}
          </button>

          <button
            onClick={onOpenManifest}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded text-xs font-medium transition-all active:scale-95 cursor-pointer uppercase tracking-tight"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            MANIFEST
          </button>
        </div>
      </div>
    </header>
  );
};
