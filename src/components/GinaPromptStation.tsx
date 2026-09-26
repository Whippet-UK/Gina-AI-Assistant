import React, { useMemo, useState } from 'react';
import {
  ChevronRight, Terminal, FileCode, Clipboard, Heart, HeartCracked,
  RefreshCw, Cpu, Zap, Activity, Copy, Send
} from 'lucide-react';
import type { LogEntry, SystemTelemetry } from '../types';

interface LogStep {
  id: string;
  timestamp: string;
  title: string;
  details: string;
  isExpandable: boolean;
}

interface GinaPromptStationProps {
  telemetry: SystemTelemetry;
  logs: LogEntry[];
}

const REFERENCE_BENCHMARKS = [
  { label: 'MMLU Multi-Task', value: 86.4, suffix: '%' },
  { label: 'HumanEval Python', value: 79.2, suffix: '%' },
  { label: 'GSM8K Math Logic', value: 91.5, suffix: '%' },
  { label: '95th Percentile Latency', value: 299, suffix: ' ms' },
];

export default function GinaPromptStation({ telemetry, logs }: GinaPromptStationProps) {
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [isConfigHidden, setIsConfigHidden] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState('Ready · waiting for a prompt');
  const [isSending, setIsSending] = useState(false);
  const [vote, setVote] = useState<'up' | 'down' | null>(null);

  const gpuTemp = Number.isFinite(telemetry.gpuTempC) ? telemetry.gpuTempC : 0;
  const powerDraw = Number(telemetry.estimatedWallPowerW || telemetry.systemPowerW || telemetry.gpuPowerW || 0);
  const activeJobs = telemetry.thermalBrakeActive ? 1 : 0;

  const steps: LogStep[] = useMemo(() => {
    const mapped = logs.slice(0, 12).map((log, index) => ({
      id: log.id || `log-${index}`,
      timestamp: log.timestamp,
      title: log.message,
      details: `[${log.level}] ${log.message}${log.ruleId ? `\\n[RULE] ${log.ruleId}` : ''}`,
      isExpandable: true,
    }));
    if (response) {
      mapped.unshift({
        id: 'prompt-response',
        timestamp: new Date().toISOString().slice(11, 19),
        title: 'Latest Local LLM response',
        details: `[GINA CORE] Local response completed.\\n\\n[RESPONSE]\\n${response}`,
        isExpandable: true,
      });
    }
    return mapped;
  }, [logs, response]);

  const selectedStep = steps.find(step => expandedItems[step.id]) || steps[0];

  const sendPrompt = async () => {
    const text = prompt.trim();
    if (!text || isSending) return;
    setIsSending(true);
    setStatus('Generating · local runtime');
    setVote(null);
    try {
      const res = await fetch('/api/llm/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'You are Gina, the local AI assistant. Answer directly and do not expose hidden reasoning.' },
            { role: 'user', content: text },
          ],
          temperature: 0.7,
          maxTokens: 512,
          suite: 'GINA Prompt Station',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Local LLM request failed (HTTP ${res.status}).`);
      const reply = String(data?.choices?.[0]?.message?.content || '').trim();
      if (!reply) throw new Error('The local model returned an empty response.');
      setResponse(reply);
      setPrompt('');
      const t = data?.ginaTelemetry;
      setStatus(`Completed · ${Number(t?.totalTokens || 0).toLocaleString()} tokens · ${Number(t?.durationMs || 0)} ms`);
    } catch (error: any) {
      setResponse(`Error: ${error?.message || 'Local AI request failed.'}`);
      setStatus('Failed · see console trace');
    } finally {
      setIsSending(false);
    }
  };

  const clearScreen = () => {
    setPrompt('');
    setResponse('');
    setExpandedItems({});
    setStatus('Screen cleared · ready for a new prompt');
  };

  const copyResponse = async () => {
    if (!response) return;
    try {
      await navigator.clipboard.writeText(response);
      setStatus('Response copied to clipboard');
    } catch {
      setStatus('Clipboard access was blocked by the browser');
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#07090E] text-zinc-300 font-sans flex flex-col overflow-x-hidden select-none">
      <header className="w-full bg-[#0B0F17] border-b border-zinc-900 px-4 py-3.5 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <h1 className="text-sm font-bold tracking-tight text-zinc-100 uppercase">GINA AI FACTORY</h1>
          <span className="text-[10px] text-zinc-600 bg-zinc-900/80 px-1.5 py-0.5 rounded border border-zinc-800">V2.4.9-LOCAL</span>
        </div>
        <button type="button" onClick={() => setIsConfigHidden(value => !value)} className="text-zinc-400 hover:text-zinc-200 px-3 py-1.5 border border-zinc-800 rounded bg-zinc-900/40 transition-colors">
          ⚙️ {isConfigHidden ? 'Show Config' : 'Hide Config'}
        </button>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-3.5 w-full mx-auto">
        <section className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-[#0B0F17] border border-zinc-900/80 p-3 rounded-lg font-mono">
          <Metric label="Generation Speed" value="Live API" detail="Streaming rate supplied by Local LLM telemetry" icon={<Activity className="w-3 h-3" />} />
          <Metric label="Active Context Window" value="Runtime" detail="Use Local LLM context configuration" icon={<Cpu className="w-3 h-3" />} />
          <Metric label="Queue Depth Pending" value={`${activeJobs} active`} detail={activeJobs ? 'Generation currently active' : 'No active generation job'} icon={<Activity className="w-3 h-3" />} />
          <Metric label="Core Temperature" value={`${gpuTemp.toFixed(1)} °C`} detail={gpuTemp >= 80 ? 'Thermal warning' : 'Thermal ceiling: 85°C'} icon={<Zap className="w-3 h-3" />} />
        </section>

        {!isConfigHidden && (
          <section className="bg-[#0B0F17] border border-zinc-900/80 p-3 rounded-lg flex flex-col gap-2 font-mono">
            <span className="text-[10px] text-amber-500 tracking-wider uppercase">⚡ ELECTRICITY METRIC GRIDS</span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-zinc-900 pt-2">
              <RuntimeMetric label="Power Draw Actual" value={powerDraw ? `${powerDraw.toFixed(1)} W` : 'Unavailable'} detail={telemetry.powerSource || 'Hardware telemetry'} />
              <RuntimeMetric label="Studio Efficiency" value="Live inference" detail="Calculated when LLM telemetry reports token rate" />
              <RuntimeMetric label="Carbon Equivalent Index" value="Unavailable" detail="No carbon-intensity feed exposed by current telemetry API" />
              <RuntimeMetric label="Cooling Fan Speed" value="Unavailable" detail="No fan RPM field exposed by current telemetry API" />
            </div>
          </section>
        )}

        <section className="bg-[#0B0F17] border border-zinc-900/80 p-3 rounded-lg flex flex-col gap-2 font-mono">
          <span className="text-[10px] text-blue-400 tracking-wider uppercase">📈 COMMERCIAL BENCHMARK TRACKERS</span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-zinc-900 pt-2">
            {REFERENCE_BENCHMARKS.map(item => (
              <div key={item.label}>
                <span className="text-[9px] block text-zinc-500">{item.label}</span>
                <span className="text-xs text-zinc-200 font-bold">{item.value}{item.suffix}</span>
                {item.suffix === '%' && <div className="w-full bg-zinc-800 h-1 rounded mt-1 overflow-hidden"><div className="bg-blue-500 h-full" style={{ width: `${item.value}%` }} /></div>}
                <span className="text-[8.5px] block text-zinc-600">Reference benchmark · not a live test</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#1E1E20] border border-zinc-800 rounded-xl p-3 flex flex-col gap-2 font-mono shadow-inner">
          <div className="flex justify-between items-center text-[10px] text-zinc-500 border-b border-zinc-800 pb-2">
            <span>🐚 MONOSPACE CONSOLE PROMPT LOGS</span>
            <span>{steps.length} ACTIVE BUFFERS</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
            <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
              {steps.length === 0 && <div className="p-3 text-[10px] text-zinc-600">No execution logs available.</div>}
              {steps.map(step => (
                <button type="button" key={step.id} onClick={() => setExpandedItems({ [step.id]: !expandedItems[step.id] })}
                  className={`text-left p-2 rounded border transition-all text-[11px] ${expandedItems[step.id] ? 'bg-zinc-800/80 border-zinc-700' : 'bg-zinc-900/40 border-zinc-900 hover:border-zinc-800'}`}>
                  <div className="flex justify-between text-zinc-500 text-[9px] mb-1"><span>{step.id}</span><span>{step.timestamp}</span></div>
                  <p className="text-zinc-200 line-clamp-2 leading-tight tracking-tight">{step.title}</p>
                </button>
              ))}
            </div>
            <div className="md:col-span-2 bg-[#0C0E12] border border-zinc-800/80 rounded-lg p-3 min-h-[220px] max-h-[220px] overflow-y-auto relative">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-1.5 mb-2 text-[10px]">
                <span className="text-zinc-500 flex items-center gap-1.5"><Terminal className="w-3 h-3" /> LIVE CORE TERMINAL</span>
                <span className="text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-900">LIVE</span>
              </div>
              <pre className="text-[10.5px] text-zinc-400 font-mono leading-relaxed whitespace-pre-wrap">{selectedStep?.details || 'Waiting for execution output...'}</pre>
            </div>
          </div>
        </section>

        <section className="bg-[#0B0F17] border border-zinc-900 p-3 rounded-lg flex flex-col gap-2 font-mono">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-zinc-400 font-medium">● MCP THROUGHPUT VECTORS</span>
            <span className="text-blue-500 font-bold">Live telemetry channel</span>
          </div>
          <span className="text-[9.5px] text-zinc-500 max-w-2xl leading-normal tracking-tight">The chart is reserved for measured MCP throughput. It does not invent a synthetic data stream when no MCP samples are available.</span>
          <div className="h-28 w-full bg-[#0C0E12] border border-zinc-900 rounded-lg p-2 mt-1 relative flex flex-col justify-between overflow-hidden">
            <div className="absolute left-2 top-2 bottom-8 text-[8px] text-zinc-700 flex flex-col justify-between"><span>100%</span><span>75%</span><span>50%</span><span>25%</span></div>
            <div className="w-full flex-1 flex items-end pl-8 pb-1">
              <svg viewBox="0 0 100 30" className="w-full h-full overflow-visible" preserveAspectRatio="none" role="img" aria-label="MCP throughput vectors">
                <path d="M 0 29 L 100 29" fill="none" stroke="#1f2937" strokeWidth="1" />
              </svg>
            </div>
            <div className="flex justify-between items-center border-t border-zinc-900 pt-1 text-[8.5px] text-zinc-600 pl-8"><span>-40s</span><span>No MCP samples</span><span>Now</span></div>
          </div>
        </section>
      </main>

      <footer className="w-full bg-[#0B0F17] border-t border-zinc-900 px-4 py-2.5 flex flex-col gap-2 text-[11px] font-mono">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-zinc-500">
            <span className="text-emerald-500">🛡️ GINA Core Secure</span>
            <span>Buffer memory: clear</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void copyResponse()} disabled={!response} className="p-1 text-zinc-500 hover:text-zinc-300 disabled:text-zinc-800" title="Copy response"><Clipboard className="w-3.5 h-3.5" /></button>
            <button type="button" onClick={() => setVote(vote === 'up' ? null : 'up')} disabled={!response} className={`p-1 ${vote === 'up' ? 'text-emerald-400' : 'text-zinc-500'} disabled:text-zinc-800`} title="Upvote"><Heart className="w-3.5 h-3.5" /></button>
            <button type="button" onClick={() => setVote(vote === 'down' ? null : 'down')} disabled={!response} className={`p-1 ${vote === 'down' ? 'text-rose-400' : 'text-zinc-500'} disabled:text-zinc-800`} title="Downvote"><HeartCracked className="w-3.5 h-3.5" /></button>
            <button type="button" onClick={clearScreen} className="p-1 text-zinc-500 hover:text-rose-400 flex items-center gap-1 border border-zinc-900 px-2 py-0.5 rounded bg-zinc-900/20"><RefreshCw className="w-3 h-3" /> Reset history</button>
            <div className="w-4 h-4 rounded-full bg-[#e05638]/10 text-[#e05638] flex items-center justify-center font-bold text-[9px]">✳</div>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-zinc-900 pt-2">
          <span className="text-zinc-600 font-bold">❯</span>
          <input value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void sendPrompt(); } }}
            placeholder="Start the Local LLM loop..." disabled={isSending}
            className="bg-transparent border-none text-zinc-300 outline-none w-full min-w-0 placeholder:text-zinc-600" aria-label="GINA prompt" />
          <button type="button" onClick={() => void sendPrompt()} disabled={!prompt.trim() || isSending} className="p-1.5 text-blue-400 disabled:text-zinc-700" title="Send prompt"><Send className="w-3.5 h-3.5" /></button>
          <span className="text-[9px] text-zinc-600 ml-auto whitespace-nowrap">{isSending ? 'Generating…' : status}</span>
        </div>
      </footer>
    </div>
  );
}

function Metric({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: React.ReactNode }) {
  return <div className="p-3 bg-[#0E131F] border border-zinc-900 rounded flex flex-col gap-1 min-w-0">
    <span className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1">{icon}{label}</span>
    <span className="text-lg font-bold text-zinc-100 truncate">{value}</span>
    <span className="text-[9px] text-zinc-500 leading-tight">{detail}</span>
  </div>;
}

function RuntimeMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div>
    <span className="text-[9px] block text-zinc-500">{label}</span>
    <span className="text-xs text-zinc-200">{value}</span>
    <span className="text-[8.5px] block text-zinc-600">{detail}</span>
  </div>;
}
