import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LogEntry } from '../types';

export interface AgentLogPacket {
  id: string;
  type: 'command' | 'file-edit' | 'info';
  title: string;
  details?: string;
  isExpandable: boolean;
  status: 'pending' | 'success' | 'failure';
  timestamp?: string;
}

interface LiveConsoleLogProps {
  logs?: LogEntry[];
  onClearLogs?: () => void;
}

function ts() {
  return new Date().toISOString().slice(11, 23);
}

function levelTone(level: string): string {
  if (level === 'WARN' || level === 'failure') return 'text-amber-400';
  if (level === 'SEC' || level === 'RULE') return 'text-sky-400';
  if (level === 'success' || level === 'OK') return 'text-emerald-400';
  if (level === 'error') return 'text-rose-400';
  return 'text-slate-400';
}

/** Borderless unified console for System → Logs. */
export function LiveConsoleLog({ logs: propLogs, onClearLogs }: LiveConsoleLogProps = {}) {
  const [streamLogs, setStreamLogs] = useState<AgentLogPacket[]>([
    {
      id: 'init-1',
      type: 'info',
      title: 'Gina agent telemetry stream ready',
      details: 'Listening on local /comfy WebSocket.',
      isExpandable: false,
      status: 'success',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'stream' | 'system'>('system');
  const streamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/comfy`;
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const connect = () => {
      if (closed) return;
      try {
        ws = new WebSocket(wsUrl);
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'AGENT_LOG_STREAM_UPDATE' && data.payload) {
              setStreamLogs((prev) => [...prev.slice(-400), data.payload as AgentLogPacket]);
            }
            if (data.type === 'AGENT_LOG_STREAM_PATCH' && data.payload?.id) {
              setStreamLogs((prev) =>
                prev.map((log) => (log.id === data.payload.id ? { ...log, ...data.payload } : log))
              );
            }
          } catch {
            /* ignore malformed */
          }
        };
        ws.onclose = () => {
          if (!closed) reconnectTimeout = setTimeout(connect, 3000);
        };
        ws.onerror = () => {
          try { ws?.close(); } catch {}
        };
      } catch {
        if (!closed) reconnectTimeout = setTimeout(connect, 5000);
      }
    };

    connect();
    return () => {
      closed = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      try { ws?.close(); } catch {}
    };
  }, []);

  useEffect(() => {
    if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [streamLogs, propLogs, activeTab]);

  const systemLines = useMemo(() => {
    const list = Array.isArray(propLogs) ? propLogs : [];
    return list.map((log, i) => ({
      key: log.id || `sys-${i}`,
      cls: levelTone(log.level || 'INFO'),
      text: `${log.timestamp || ts()}  ${(log.level || 'INFO').padEnd(5)}  ${log.ruleId ? `[${log.ruleId}] ` : ''}${log.message || ''}`,
    }));
  }, [propLogs]);

  const streamLines = useMemo(() => {
    return streamLogs.map((log, i) => {
      const t = log.timestamp ? String(log.timestamp).slice(11, 23) : ts();
      const st = (log.status || 'pending').toUpperCase();
      const detail = log.details ? `  — ${String(log.details).replace(/\s+/g, ' ').slice(0, 240)}` : '';
      return {
        key: log.id || `st-${i}`,
        cls: levelTone(log.status || 'info'),
        text: `${t}  ${st.padEnd(8)}  ${(log.type || 'info').toUpperCase()}  ${log.title || ''}${detail}`,
      };
    });
  }, [streamLogs]);

  const lines = activeTab === 'stream' ? streamLines : systemLines;

  const handleCopy = async () => {
    const text = lines.map((l) => l.text).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const handleClear = () => {
    if (activeTab === 'stream') setStreamLogs([]);
    else onClearLogs?.();
  };

  return (
    <div className="gina-console-shell w-full min-h-[320px]">
      <div className="gina-console-toolbar">
        <span className="text-[10px] font-bold tracking-[0.2em] text-emerald-400 uppercase">Live console</span>
        <button type="button" className={`gina-console-action ${activeTab === 'system' ? 'text-emerald-300' : 'text-slate-500'}`} onClick={() => setActiveTab('system')}>System</button>
        <button type="button" className={`gina-console-action ${activeTab === 'stream' ? 'text-emerald-300' : 'text-slate-500'}`} onClick={() => setActiveTab('stream')}>Agent stream</button>
        <button type="button" onClick={() => void handleCopy()} className="ml-auto gina-console-action text-slate-500" title="Copy visible log">{copied ? 'copied' : 'copy'}</button>
        <button type="button" onClick={handleClear} className="gina-console-action text-slate-500 hover:text-rose-300" title="Clear">clear</button>
      </div>
      <div ref={streamRef} className="gina-console-stream font-mono text-[11px] leading-5 overflow-y-auto custom-scrollbar flex-1 min-h-[240px] max-h-[60vh]">
        {lines.length === 0 ? (
          <div className="gina-console-line text-slate-600">{ts()}  IDLE     no log lines yet…</div>
        ) : (
          lines.map((line) => (
            <div key={line.key} className={`gina-console-line whitespace-pre-wrap break-words ${line.cls}`}>{line.text}</div>
          ))
        )}
      </div>
    </div>
  );
}

export default LiveConsoleLog;
