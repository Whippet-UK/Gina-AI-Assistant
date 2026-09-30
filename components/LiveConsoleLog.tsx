import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, 
  Terminal, 
  FileCode, 
  Copy, 
  ThumbsUp, 
  ThumbsDown, 
  RotateCw, 
  CheckCircle2,
  AlertCircle,
  Loader2,
  ScrollText,
  Radio
} from 'lucide-react';
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

export function LiveConsoleLog({ logs: propLogs, onClearLogs }: LiveConsoleLogProps = {}) {
  const [logs, setLogs] = useState<AgentLogPacket[]>([
    {
      id: 'init-1',
      type: 'info',
      title: 'Gina Agent Telemetry Stream initialized',
      details: 'Connected to loopback agent telemetry channel on /comfy WebSocket.',
      isExpandable: true,
      status: 'success',
      timestamp: new Date().toISOString()
    }
  ]);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({ 'init-1': false });
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'stream' | 'system'>('stream');

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/comfy`;
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'AGENT_LOG_STREAM_UPDATE') {
              setLogs(prev => [...prev, data.payload]);
              if (data.payload.isExpandable) {
                setExpandedItems(prev => ({ ...prev, [data.payload.id]: true }));
              }
            } 
            
            if (data.type === 'AGENT_LOG_STREAM_PATCH') {
              setLogs(prev => prev.map(log => 
                log.id === data.payload.id ? { ...log, ...data.payload } : log
              ));
            }
          } catch (error) {
            console.error("Failed to parse runtime log buffer:", error);
          }
        };

        ws.onerror = () => {
          // Socket will close and trigger onclose
        };

        ws.onclose = () => {
          reconnectTimeout = setTimeout(connect, 3000);
        };
      } catch (err) {
        reconnectTimeout = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyLogs = () => {
    if (activeTab === 'stream') {
      const textToCopy = logs.map(l => `[${l.type.toUpperCase()}] ${l.title}\n${l.details || ''}`).join('\n\n');
      navigator.clipboard.writeText(textToCopy);
    } else if (propLogs) {
      const textToCopy = propLogs.map(l => `[${l.level}] ${l.timestamp} ${l.ruleId ? `[Rule ${l.ruleId}] ` : ''}${l.message}`).join('\n');
      navigator.clipboard.writeText(textToCopy);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearLogs = () => {
    if (activeTab === 'stream') {
      setLogs([]);
      setExpandedItems({});
    }
    if (onClearLogs) {
      onClearLogs();
    }
  };

  const triggerTestTrace = async () => {
    try {
      await fetch('/api/agent/test-motion-check', { method: 'POST' });
    } catch {}
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 bg-[#121214] text-zinc-200 font-sans rounded-xl border border-zinc-900 shadow-2xl">
      <div className="mb-3 text-xs text-zinc-400 font-mono flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 font-bold tracking-wider text-zinc-300">
            <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            STREAMING REPAIR AGENT TELEMETRY
          </span>
          {propLogs && propLogs.length > 0 && (
            <div className="flex items-center gap-1 ml-4 bg-zinc-900 border border-zinc-800 rounded-md p-0.5 text-[10px]">
              <button 
                onClick={() => setActiveTab('stream')}
                className={`px-2 py-0.5 rounded ${activeTab === 'stream' ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                Telemetry Stream
              </button>
              <button 
                onClick={() => setActiveTab('system')}
                className={`px-2 py-0.5 rounded flex items-center gap-1 ${activeTab === 'system' ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                <ScrollText className="w-2.5 h-2.5" /> System Logs ({propLogs.length})
              </button>
            </div>
          )}
        </div>
        {logs.some(l => l.status === 'pending') ? (
          <span className="text-[#e05638] flex items-center gap-1.5 animate-pulse font-sans">
            <Loader2 className="w-3 h-3 animate-spin" /> Execution Loop Active
          </span>
        ) : (
          <button 
            onClick={triggerTestTrace}
            className="text-[10px] text-zinc-500 hover:text-zinc-300 font-mono bg-zinc-900 hover:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-800 transition-colors"
          >
            Run Integrity Pass
          </button>
        )}
      </div>

      <div className="bg-[#1e1e20] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl transition-all duration-300">
        <div className="divide-y divide-zinc-800/60 max-h-[550px] overflow-y-auto custom-scrollbar">
          {activeTab === 'stream' ? (
            logs.length === 0 ? (
              <div className="p-12 text-center text-xs font-mono text-zinc-500 italic bg-[#1e1e20]">
                System idle. Awaiting structured workflow pipelines or agent run triggers...
              </div>
            ) : (
              logs.map((log) => {
                const isExpanded = !!expandedItems[log.id];
                return (
                  <div key={log.id} className="w-full transition-colors duration-150">
                    <button
                      onClick={() => log.isExpandable && toggleExpand(log.id)}
                      disabled={!log.isExpandable}
                      className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors duration-150 group
                        ${log.isExpandable ? 'hover:bg-zinc-800/20 cursor-pointer' : 'cursor-default'}
                      `}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {log.status === 'failure' ? (
                          <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                        ) : log.type === 'command' ? (
                          <Terminal className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                        ) : log.type === 'file-edit' ? (
                          <FileCode className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        )}
                        
                        <span className={`text-xs font-mono truncate tracking-tight
                          ${log.status === 'failure' ? 'text-rose-400' : log.type === 'info' ? 'text-zinc-500' : 'text-zinc-200 font-medium'}
                        `}>
                          {log.title}
                        </span>
                      </div>

                      {log.isExpandable && (
                        <ChevronRight 
                          className={`w-4 h-4 text-zinc-600 transition-transform duration-200 ml-2 flex-shrink-0
                            ${isExpanded ? 'rotate-90 text-zinc-300' : 'group-hover:text-zinc-400'}
                          `}
                        />
                      )}
                    </button>

                    <div className={`grid transition-all duration-200 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                      <div className="overflow-hidden bg-zinc-900/10">
                        {log.details && (
                          <div className="px-4 pb-3.5 pt-0.5">
                            <pre className="bg-[#141416] border border-zinc-800/80 rounded-lg p-3 font-mono text-[11px] text-zinc-400 whitespace-pre overflow-x-auto shadow-inner leading-relaxed">
                              {log.details}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )
          ) : (
            // System runtime logs tab view
            propLogs && propLogs.length > 0 ? (
              propLogs.map((log) => (
                <div key={log.id} className="px-4 py-2 text-xs font-mono flex items-start gap-3 hover:bg-zinc-800/20">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${
                    log.level === 'SEC' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                    log.level === 'RULE' ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' :
                    log.level === 'WARN' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                    'bg-zinc-800 text-zinc-300'
                  }`}>
                    {log.level}
                  </span>
                  <span className="text-zinc-500 text-[10px] shrink-0">{log.timestamp}</span>
                  {log.ruleId && <span className="text-cyan-400 text-[10px] shrink-0">[Rule {log.ruleId}]</span>}
                  <span className="text-zinc-300 leading-relaxed break-words">{log.message}</span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs font-mono text-zinc-500">No system logs recorded.</div>
            )
          )}
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 px-1">
        <div className="flex items-center gap-1">
          <button 
            onClick={handleCopyLogs}
            disabled={activeTab === 'stream' ? logs.length === 0 : (!propLogs || propLogs.length === 0)}
            className="p-2 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-zinc-800/40 transition-colors disabled:opacity-40" 
            title={copied ? "Copied!" : "Copy console log history"}
          >
            <Copy className={`w-3.5 h-3.5 ${copied ? 'text-emerald-500' : ''}`} />
          </button>
          <button className="p-2 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-zinc-800/40 transition-colors" title="Upvote workflow performance">
            <ThumbsUp className="w-3.5 h-3.5" />
          </button>
          <button className="p-2 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-zinc-800/40 transition-colors" title="Downvote output trace">
            <ThumbsDown className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={handleClearLogs}
            disabled={activeTab === 'stream' ? logs.length === 0 : (!propLogs || propLogs.length === 0)}
            className="p-2 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-zinc-800/40 transition-colors disabled:opacity-40" 
            title="Clear current stream matrix"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#e05638]/10 text-[#e05638] select-none text-[10px] font-bold" title="Integrity Anchor">
          ✳
        </div>
      </div>
    </div>
  );
}

export default LiveConsoleLog;
