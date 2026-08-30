import React, { useEffect, useMemo, useState } from 'react';
import { Terminal, Trash2, Copy, Download, ServerCrash, RefreshCw } from 'lucide-react';
import { LogEntry } from '../types';

interface DashboardErrorLog {
  id: string;
  timestamp: string;
  method?: string;
  url?: string;
  status?: number;
  message: string;
  stack?: string;
  source: string;
}

interface LiveConsoleLogProps {
  logs: LogEntry[];
  onClearLogs: () => void;
}

export const LiveConsoleLog: React.FC<LiveConsoleLogProps> = ({ logs, onClearLogs }) => {
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [serverErrors, setServerErrors] = useState<DashboardErrorLog[]>([]);
  const [serverLoading, setServerLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const filteredLogs = logs.filter(log => levelFilter === 'ALL' || log.level === levelFilter);

  const loadServerErrors = async () => {
    try {
      setServerLoading(true);
      const response = await fetch('/api/error-log', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setServerErrors(Array.isArray(data.logs) ? data.logs : []);
      setServerError(data?.degraded ? (data?.error || 'Dashboard error log is in degraded mode.') : null);
    } catch (error: any) {
      setServerError(error?.message || 'Unable to read dashboard error log.');
    } finally {
      setServerLoading(false);
    }
  };

  useEffect(() => {
    void loadServerErrors();
    const timer = window.setInterval(() => void loadServerErrors(), 2000);
    return () => window.clearInterval(timer);
  }, []);

  const formatServerError = (error: DashboardErrorLog) => {
    const request = [error.method, error.url, error.status ? `HTTP ${error.status}` : ''].filter(Boolean).join(' ');
    return [
      `[${error.timestamp}] [${error.source.toUpperCase()}]${request ? ` ${request}` : ''}`,
      error.message,
      error.stack && error.stack !== error.message ? error.stack : ''
    ].filter(Boolean).join('\n');
  };

  const serverErrorText = useMemo(() => serverErrors.map(formatServerError).join('\n\n'), [serverErrors]);

  const handleCopyLogs = async () => {
    const telemetryText = logs.map(l => `[${l.timestamp}] [${l.level}] ${l.message}`).join('\n');
    const text = [
      '=== GINA DASHBOARD SERVER ERRORS ===',
      serverErrorText || 'No server errors recorded.',
      '',
      '=== GINA TELEMETRY ===',
      telemetryText || 'No telemetry logs.'
    ].join('\n');
    await navigator.clipboard.writeText(text);
  };

  const handleCopyErrors = async () => {
    await navigator.clipboard.writeText(serverErrorText || 'No server errors recorded.');
  };

  const handleDownloadLogs = () => {
    const text = [
      '=== GINA DASHBOARD SERVER ERRORS ===',
      serverErrorText || 'No server errors recorded.',
      '',
      '=== GINA TELEMETRY ===',
      logs.map(l => `[${l.timestamp}] [${l.level}] ${l.message}`).join('\n')
    ].join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gina_ai_error_log_${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = async () => {
    try {
      await Promise.all([
        fetch('/api/comfy/error-logs/clear', { method: 'POST' }),
        fetch('/api/error-log/clear', { method: 'POST' })
      ]);
    } catch {
      // Keep the UI clear even if the server is unavailable.
    }
    setServerErrors([]);
    onClearLogs();
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 font-mono text-xs shadow-md space-y-4">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-2 mb-2.5 gap-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-widest">LIVE TELEMETRY STREAM LOG</h2>
            <span className="text-[9px] bg-slate-900 text-slate-500 px-1.5 py-0.2 rounded border border-slate-800">{logs.length} LINES</span>
          </div>
          <div className="flex items-center gap-1.5">
            <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="bg-slate-900 border border-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded focus:outline-none cursor-pointer font-mono">
              <option value="ALL">ALL LEVELS</option>
              <option value="INFO">INFO</option>
              <option value="RULE">RULE</option>
              <option value="WARN">WARN</option>
              <option value="SEC">SEC</option>
            </select>
            <button onClick={handleCopyLogs} title="Copy telemetry + server errors" className="p-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded cursor-pointer"><Copy className="w-3 h-3" /></button>
            <button onClick={handleDownloadLogs} title="Download telemetry + server errors" className="p-1 bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800 rounded cursor-pointer"><Download className="w-3 h-3" /></button>
            <button onClick={handleClear} title="Clear telemetry, ComfyUI and server error logs" className="p-1 bg-slate-900 hover:bg-slate-800 text-rose-400 border border-slate-800 rounded cursor-pointer"><Trash2 className="w-3 h-3" /></button>
          </div>
        </div>
        <div className="h-44 overflow-y-auto space-y-1 custom-scrollbar text-[10px] pr-2">
          {filteredLogs.length === 0 ? <div className="text-slate-600 italic py-4 text-center">No telemetry logs in buffer.</div> : filteredLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-2 hover:bg-slate-900/50 p-0.5 rounded">
              <span className="text-slate-600 shrink-0 text-[9px]">[{log.timestamp}]</span>
              <span className={`px-1 rounded text-[9px] font-bold shrink-0 ${log.level === 'RULE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : log.level === 'WARN' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : log.level === 'SEC' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' : 'bg-sky-500/10 text-sky-400 border border-sky-500/30'}`}>{log.level}</span>
              {log.ruleId && <span className="text-amber-400 font-mono text-[9px] shrink-0">[{log.ruleId}]</span>}
              <span className="text-slate-300 break-all">{log.message}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-rose-500/20 rounded-md bg-rose-950/10 p-3">
        <div className="flex items-center justify-between gap-3 border-b border-rose-500/15 pb-2 mb-2">
          <div className="flex items-center gap-2">
            <ServerCrash className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-widest">DASHBOARD ERROR LOG</span>
            <span className="text-[9px] bg-rose-500/10 text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/20">{serverErrors.length} ERRORS</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => void loadServerErrors()} title="Refresh server errors" className="p-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded cursor-pointer"><RefreshCw className={`w-3 h-3 ${serverLoading ? 'animate-spin' : ''}`} /></button>
            <button onClick={handleCopyErrors} title="Copy server errors" className="p-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded cursor-pointer"><Copy className="w-3 h-3" /></button>
            <button onClick={handleClear} title="Clear all error logs" className="p-1 bg-slate-900 hover:bg-slate-800 text-rose-400 border border-slate-800 rounded cursor-pointer"><Trash2 className="w-3 h-3" /></button>
          </div>
        </div>
        <div className="text-[9px] text-slate-500 mb-2">Captures Express/body-parser failures, API 4xx/5xx responses and request-aborted errors. Use COPY ERRORS to paste the complete diagnostic into chat.</div>
        <div className="max-h-72 overflow-y-auto space-y-2 custom-scrollbar pr-2">
          {serverError ? <div className="text-amber-400 py-2">Unable to read error log: {serverError}</div> : serverErrors.length === 0 ? <div className="text-slate-600 italic py-4 text-center">No server errors recorded.</div> : serverErrors.slice().reverse().map(error => (
            <div key={error.id} className="rounded border border-slate-800 bg-slate-950/70 p-2">
              <div className="flex flex-wrap gap-2 text-[9px] mb-1">
                <span className="text-slate-500">{new Date(error.timestamp).toLocaleTimeString()}</span>
                <span className="text-rose-300 font-bold">{error.source.toUpperCase()}</span>
                {error.method && <span className="text-sky-300">{error.method}</span>}
                {error.status && <span className="text-amber-300">HTTP {error.status}</span>}
                {error.url && <span className="text-slate-500 break-all">{error.url}</span>}
              </div>
              <pre className="whitespace-pre-wrap break-words text-[10px] text-slate-300">{error.message}{error.stack && error.stack !== error.message ? `\n${error.stack}` : ''}</pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
