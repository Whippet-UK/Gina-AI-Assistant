import React, { useMemo, useState } from 'react';
import {
  ChevronRight, Terminal, FileCode, Copy, ThumbsUp, ThumbsDown,
  RotateCw, CheckCircle2, Cpu, Zap, Layers, Activity, Send, Settings2,
} from 'lucide-react';

type PromptMode = '🌐 Web-Search' | '📱 Web-App' | '💻 Code Engine' | '🖼️ Image Studio' | '📼 Video Out';

interface LogStep {
  id: string;
  type: 'command' | 'file-edit' | 'info';
  title: string;
  details?: string;
  isExpandable: boolean;
}

interface Telemetry {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  durationMs: number;
  tokensPerSecond: number;
  promptTokensPerSecond: number;
  completionTokensPerSecond: number;
  source: 'local' | 'web' | 'local+web';
  webSearched?: boolean;
  webProvider?: string | null;
  toolCalls?: number;
}

const PROMPT_MODES: PromptMode[] = ['🌐 Web-Search', '📱 Web-App', '💻 Code Engine', '🖼️ Image Studio', '📼 Video Out'];
const DAY_RATE = 0.3157;

export default function UnifiedAiDashboard() {
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [showConfig, setShowConfig] = useState(false);
  const [activeTab, setActiveTab] = useState<PromptMode>('🌐 Web-Search');
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [lastPrompt, setLastPrompt] = useState('');
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [history, setHistory] = useState<Telemetry[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Ready · waiting for a prompt');
  const [vote, setVote] = useState<'up' | 'down' | null>(null);
  const [copied, setCopied] = useState(false);
  const [costPerKwh, setCostPerKwh] = useState(() => {
    try { return Number(localStorage.getItem('gina_dashboard_cost_per_kwh') || DAY_RATE); } catch { return DAY_RATE; }
  });
  const [costInput, setCostInput] = useState('');
  const [powerW, setPowerW] = useState(() => {
    try { return Number(localStorage.getItem('gina_dashboard_power_w') || 0); } catch { return 0; }
  });
  const [powerInput, setPowerInput] = useState('');
  const [steps, setSteps] = useState<LogStep[]>([]);
  const [nextId, setNextId] = useState(1);

  const activePrompts = loading ? 1 : 0;
  const tokensPerSec = telemetry?.completionTokensPerSecond ?? telemetry?.tokensPerSecond ?? 0;
  const latency = telemetry?.durationMs ?? 0;
  const cacheMb = telemetry ? Math.round(telemetry.totalTokens * 0.0016) : 0;

  const responseCost = useMemo(() => {
    if (!powerW || !latency || !costPerKwh) return 0;
    return (powerW / 1000) * (latency / 3_600_000) * costPerKwh;
  }, [powerW, latency, costPerKwh]);

  const dailyCost = useMemo(
    () => powerW && costPerKwh ? (powerW / 1000) * 24 * costPerKwh : 0,
    [powerW, costPerKwh],
  );

  const throughput = useMemo(() => {
    if (!history.length) return [0, 0, 0, 0, 0, 0, 0, 0];
    return history.slice(-8).map(item => Math.max(0, item.completionTokensPerSecond || item.tokensPerSecond || 0));
  }, [history]);

  const addStep = (step: Omit<LogStep, 'id'>) => {
    const id = `step-${nextId}`;
    setNextId(value => value + 1);
    setSteps(prev => [...prev, { ...step, id }].slice(-30));
    if (step.isExpandable) setExpandedItems(prev => ({ ...prev, [id]: true }));
  };

  const sendPrompt = async (override?: string) => {
    const text = (override ?? prompt).trim();
    if (!text || loading) return;

    setLoading(true);
    setStatus('Generating · live local runtime');
    setVote(null);
    setCopied(false);
    setLastPrompt(text);
    setPrompt('');
    addStep({
      type: 'command',
      title: `Prompt submitted · ${activeTab}`,
      details: `$ POST /api/llm/chat\n[MODE] ${activeTab}\n[PROMPT]\n${text}`,
      isExpandable: true,
    });

    try {
      const res = await fetch('/api/llm/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are Gina, the local AI assistant. Current workspace mode: ${activeTab}. Answer the user's request directly. Do not expose hidden reasoning.`,
            },
            { role: 'user', content: text },
          ],
          temperature: 0.7,
          maxTokens: 512,
          suite: 'Unified AI Dashboard',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Local LLM request failed (HTTP ${res.status}).`);

      const reply = String(data?.choices?.[0]?.message?.content || '').trim();
      if (!reply) throw new Error('The local model returned an empty response.');

      const rawTelemetry = data?.ginaTelemetry;
      const nextTelemetry: Telemetry = {
        promptTokens: Number(rawTelemetry?.promptTokens || 0),
        completionTokens: Number(rawTelemetry?.completionTokens || 0),
        totalTokens: Number(rawTelemetry?.totalTokens || 0),
        durationMs: Number(rawTelemetry?.durationMs || 0),
        tokensPerSecond: Number(rawTelemetry?.tokensPerSecond || 0),
        promptTokensPerSecond: Number(rawTelemetry?.promptTokensPerSecond || 0),
        completionTokensPerSecond: Number(rawTelemetry?.completionTokensPerSecond || rawTelemetry?.tokensPerSecond || 0),
        source: rawTelemetry?.source === 'local+web' ? 'local+web' : rawTelemetry?.source === 'web' ? 'web' : 'local',
        webSearched: !!rawTelemetry?.webSearched,
        webProvider: rawTelemetry?.webProvider || null,
        toolCalls: Number(rawTelemetry?.toolCalls || 0),
      };
      setTelemetry(nextTelemetry);
      setHistory(prev => [...prev, nextTelemetry].slice(-40));
      setResponse(reply);
      setStatus(`Completed · ${nextTelemetry.totalTokens.toLocaleString()} tokens · ${nextTelemetry.durationMs} ms`);

      addStep({
        type: 'info',
        title: `Response received · ${nextTelemetry.source}`,
        details: `[TELEMETRY]\nPrompt: ${nextTelemetry.promptTokens.toLocaleString()} tokens\nCompletion: ${nextTelemetry.completionTokens.toLocaleString()} tokens\nTotal: ${nextTelemetry.totalTokens.toLocaleString()} tokens\nLatency: ${nextTelemetry.durationMs} ms\nGeneration: ${nextTelemetry.completionTokensPerSecond.toFixed(1)} tok/s\nTool calls: ${nextTelemetry.toolCalls}\nWeb searched: ${nextTelemetry.webSearched ? 'yes' : 'no'}${nextTelemetry.webProvider ? `\nProvider: ${nextTelemetry.webProvider}` : ''}\n\n[RESPONSE]\n${reply}`,
        isExpandable: true,
      });
    } catch (error: any) {
      const message = error?.message || 'Local AI request failed.';
      setResponse(`Error: ${message}`);
      setStatus('Failed · see validation trace');
      addStep({ type: 'info', title: 'Prompt failed', details: message, isExpandable: true });
    } finally {
      setLoading(false);
    }
  };

  const clearScreen = () => {
    setSteps([]);
    setExpandedItems({});
    setResponse('');
    setStatus('Screen cleared · ready for a new prompt');
  };

  const copyResponse = async () => {
    if (!response) return;
    try {
      await navigator.clipboard.writeText(response);
      setCopied(true);
      setStatus('Response copied to clipboard');
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setStatus('Clipboard access was blocked by the browser');
    }
  };

  const saveCostSystem = () => {
    const rate = costInput ? Number(costInput) : costPerKwh;
    const power = powerInput ? Number(powerInput) : powerW;
    if (!Number.isFinite(rate) || rate <= 0 || !Number.isFinite(power) || power < 0) {
      setStatus('Enter a valid electricity rate and system wattage');
      return;
    }
    setCostPerKwh(rate);
    setPowerW(power);
    setCostInput('');
    setPowerInput('');
    try {
      localStorage.setItem('gina_dashboard_cost_per_kwh', String(rate));
      localStorage.setItem('gina_dashboard_power_w', String(power));
    } catch {}
    setShowConfig(false);
    setStatus(`Cost system saved · £${rate.toFixed(4)}/kWh · ${power} W`);
  };

  const voteResponse = (next: 'up' | 'down') => {
    setVote(prev => prev === next ? null : next);
    setStatus(next === 'up' ? 'Response marked helpful' : 'Response marked not helpful');
  };

  return (
    <div className="w-full min-h-screen bg-[#07090E] text-zinc-300 font-sans flex flex-col overflow-x-hidden">
      <header className="w-full shrink-0 bg-[#0B0F17] border-b border-zinc-900 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-1.5 overflow-x-auto min-w-0">
          {PROMPT_MODES.map(tab => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded whitespace-nowrap ${activeTab === tab ? 'bg-blue-600 text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}>
              {tab}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="bg-emerald-950 text-emerald-400 border border-emerald-900 px-2 py-1 rounded text-[10px]">⚡ TELEMETRY</span>
          <span className="bg-amber-950 text-amber-400 border border-amber-900 px-2 py-1 rounded text-[10px]">🔌 POWER</span>
          <span className="bg-blue-950 text-blue-400 border border-blue-900 px-2 py-1 rounded text-[10px]">💾 SAVINGS</span>
          <button type="button" onClick={() => setShowConfig(v => !v)} className="text-zinc-500 hover:text-zinc-300 px-2 py-1 border border-zinc-800 rounded">
            ⚙️ Config
          </button>
          <button type="button" onClick={clearScreen} className="text-rose-500 hover:text-rose-400 px-2 py-1 border border-zinc-800 rounded">
            🧹 CLEAR SCREEN
          </button>
        </div>
      </header>

      <main className="flex-1 min-h-0 p-4 flex flex-col gap-4 w-full">
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#0B0F17] border border-zinc-900 p-3 rounded-lg">
          <MetricCard icon={<Layers className="w-3 h-3" />} label="Token Generation Velocity" value={tokensPerSec ? `${tokensPerSec.toFixed(1)} Tok/s` : '—'} />
          <MetricCard icon={<Activity className="w-3 h-3" />} label="Active Prompt Queue" value={String(activePrompts)} />
          <MetricCard icon={<Cpu className="w-3 h-3" />} label="Context Window Inference Latency" value={latency ? `${latency} ms` : '—'} />
          <MetricCard icon={<Zap className="w-3 h-3" />} label="Local Response Pipeline Cache Load" value={cacheMb ? `${cacheMb} MB` : '—'} />
        </section>

        <section className="bg-[#0B0F17] border border-zinc-900 p-3 rounded-lg flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3 text-[11px] font-mono text-amber-500 border-b border-zinc-900 pb-2">
            <span>🔌 AI CORE RUNTIME &amp; GENERATION POWER CALCULATOR</span>
            <button type="button" onClick={() => setShowConfig(v => !v)} className="bg-amber-500 text-black px-2 py-0.5 rounded text-[10px] font-bold">SET COST SYSTEMS</button>
          </div>
          {showConfig && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-[#0E131F] border border-zinc-800 rounded p-3">
              <label className="text-[10px] font-mono text-zinc-500">SYSTEM WATTS<input value={powerInput} onChange={e => setPowerInput(e.target.value)} placeholder={powerW ? String(powerW) : 'e.g. 650'} type="number" min="0" className="mt-1 w-full bg-[#07090E] border border-zinc-800 rounded px-2 py-1 text-zinc-200" /></label>
              <label className="text-[10px] font-mono text-zinc-500">ELECTRICITY £/kWh<input value={costInput} onChange={e => setCostInput(e.target.value)} placeholder={costPerKwh.toFixed(4)} type="number" min="0.0001" step="0.0001" className="mt-1 w-full bg-[#07090E] border border-zinc-800 rounded px-2 py-1 text-zinc-200" /></label>
              <button type="button" onClick={saveCostSystem} className="self-end bg-emerald-600 hover:bg-emerald-500 text-white rounded px-3 py-1.5 text-xs font-bold">SAVE COST SYSTEM</button>
            </div>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <RuntimeMetric label="Prompt Load" value={telemetry ? `${telemetry.promptTokens.toLocaleString()} tokens` : 'Waiting for prompt'} />
            <RuntimeMetric label="Generation Power" value={powerW ? `${powerW.toFixed(0)} W` : 'Set system watts'} />
            <RuntimeMetric label="Response Computation Cost" value={responseCost ? `£${responseCost.toFixed(6)}` : '—'} />
            <RuntimeMetric label="Estimated Price / Day" value={dailyCost ? `£${dailyCost.toFixed(2)} / day` : 'Set power + tariff'} />
          </div>
        </section>

        <section className="bg-[#0B0F17] border border-zinc-900 p-3 rounded-lg flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3 text-[11px] font-mono text-blue-400 border-b border-zinc-900 pb-2">
            <span>📊 PROMPT BENCHMARKS &amp; MODEL ALLOCATIONS</span>
            <span className="text-[10px] text-zinc-600">Node Version: 1.20.14</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
            <RuntimeMetric label="Local Model" value="Open-2.5-NL-7B-Instruct" valueClass="text-emerald-500 font-bold" />
            <RuntimeMetric label="Comparison Target" value="gemini-2.5-flash" valueClass="text-blue-400" />
            <RuntimeMetric label="Total Prompt Tokens" value={telemetry ? telemetry.promptTokens.toLocaleString() : '—'} />
            <RuntimeMetric label="Evaluation / Safety Window" value={telemetry ? `${telemetry.durationMs} ms · ${telemetry.source}` : 'Awaiting inference'} />
          </div>
        </section>

        <section className="flex flex-col gap-3 min-h-0 flex-1">
          <div className="bg-[#1E1E20] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
            {steps.length === 0 && <div className="p-5 text-xs font-mono text-zinc-600">No prompt activity on screen.</div>}
            <div className="divide-y divide-zinc-800/60">
              {steps.map(step => {
                const open = !!expandedItems[step.id];
                return (
                  <div key={step.id}>
                    <button type="button" onClick={() => step.isExpandable && setExpandedItems(prev => ({ ...prev, [step.id]: !prev[step.id] }))}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-zinc-800/20">
                      <div className="flex items-center gap-3 min-w-0 font-mono text-xs">
                        {step.type === 'command' ? <Terminal className="w-4 h-4 text-zinc-500 shrink-0" /> : step.type === 'file-edit' ? <FileCode className="w-4 h-4 text-zinc-400 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-zinc-500 shrink-0" />}
                        <span className="text-zinc-200 truncate">{step.title}</span>
                      </div>
                      {step.isExpandable && <ChevronRight className={`w-4 h-4 text-zinc-600 transition-transform ${open ? 'rotate-90 text-zinc-400' : ''}`} />}
                    </button>
                    {open && step.details && (
                      <div className="px-4 pb-3.5 pt-0.5 grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
                        <pre className="bg-[#141416] border border-zinc-800/80 rounded-lg p-2.5 font-mono text-[10.5px] text-zinc-400 min-h-[130px] whitespace-pre-wrap overflow-x-auto">{step.details}</pre>
                        <div className="bg-[#141416] border border-zinc-800/80 rounded-lg p-2.5 min-h-[130px]">
                          <div className="flex justify-between text-[9px] font-mono text-zinc-500 mb-2">
                            <span>LIVE MCP / PROMPT THROUGHPUT · LAST 40s</span>
                            <span className="text-emerald-400">{tokensPerSec ? `${tokensPerSec.toFixed(1)} tok/s` : 'Awaiting data'}</span>
                          </div>
                          <svg viewBox="0 0 100 40" className="w-full h-20" preserveAspectRatio="none" role="img" aria-label="Prompt throughput graph">
                            {throughput.length > 1 && <path d={throughput.map((v, i) => `${(i/(throughput.length-1))*100},${36-Math.min(30,(v/Math.max(...throughput,1))*30)}`).join(' L ')} fill="none" stroke="#3b82f6" strokeWidth="1.5" />}
                            {throughput.length > 1 && <path d={`M ${throughput.map((v,i)=>`${(i/(throughput.length-1))*100},${36-Math.min(30,(v/Math.max(...throughput,1))*30)}`).join(' L ')} L 100 40 L 0 40 Z`} fill="#3b82f6" fillOpacity="0.15" />}
                          </svg>
                          <div className="flex justify-between text-[8.5px] font-mono text-zinc-600 border-t border-zinc-800/60 pt-1"><span>-40s</span><span>Live prompt history</span><span>Now</span></div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full shrink-0 bg-[#0B0F17] border-t border-zinc-900 px-4 py-3 flex flex-col gap-2 text-xs font-mono">
        {response && (
          <div className="flex items-start gap-2 text-zinc-400 text-[11px] max-h-24 overflow-y-auto">
            <span className="text-emerald-500">✳</span><span className="whitespace-pre-wrap">{response}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-zinc-600 font-bold">❯</span>
          <input type="text" value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendPrompt(); } }} placeholder="Start the Local LLM loop..." disabled={loading}
            className="bg-transparent border-none text-zinc-300 outline-none w-full min-w-0 placeholder:text-zinc-600" aria-label="Dashboard prompt" />
          <button type="button" onClick={() => void sendPrompt()} disabled={!prompt.trim() || loading} className="p-1.5 text-blue-400 hover:text-blue-300 disabled:text-zinc-700" title="Send prompt"><Send className="w-3.5 h-3.5" /></button>
          <button type="button" onClick={() => void copyResponse()} disabled={!response} className="p-1.5 text-zinc-500 hover:text-zinc-300 disabled:text-zinc-800" title={copied ? 'Copied' : 'Copy response'}><Copy className="w-3.5 h-3.5" /></button>
          <button type="button" onClick={() => voteResponse('up')} disabled={!response} className={`p-1.5 ${vote === 'up' ? 'text-emerald-400' : 'text-zinc-500'} disabled:text-zinc-800`} title="Upvote"><ThumbsUp className="w-3.5 h-3.5" /></button>
          <button type="button" onClick={() => voteResponse('down')} disabled={!response} className={`p-1.5 ${vote === 'down' ? 'text-rose-400' : 'text-zinc-500'} disabled:text-zinc-800`} title="Downvote"><ThumbsDown className="w-3.5 h-3.5" /></button>
          <button type="button" onClick={() => void sendPrompt(lastPrompt)} disabled={!lastPrompt || loading} className="p-1.5 text-zinc-500 hover:text-zinc-300 disabled:text-zinc-800" title="Retry last prompt"><RotateCw className="w-3.5 h-3.5" /></button>
          <div className="w-4 h-4 rounded-full bg-[#e05638]/10 text-[#e05638] flex items-center justify-center font-bold text-[10px] ml-1">✳</div>
        </div>
        <div className="flex items-center gap-2 text-[9px] text-zinc-600"><Settings2 className="w-3 h-3" /><span>{status}</span>{telemetry?.webSearched && <span>· web: {telemetry.webProvider || 'verified'}</span>}<span className="ml-auto">Cost rate: £{costPerKwh.toFixed(4)}/kWh {powerW ? `· ${powerW}W` : ''}</span></div>
      </footer>
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="p-3 bg-[#0E131F] border border-zinc-900 rounded flex flex-col gap-1 min-w-0"><span className="text-[10px] font-mono text-zinc-500 uppercase flex items-center gap-1.5 leading-tight">{icon}{label}</span><span className="text-sm font-semibold font-mono text-zinc-100 truncate">{value}</span></div>;
}

function RuntimeMetric({ label, value, valueClass = 'text-zinc-200' }: { label: string; value: string; valueClass?: string }) {
  return <div className="min-w-0"><span className="text-[10px] block font-mono text-zinc-500 leading-tight">{label}</span><span className={`text-xs font-mono truncate block mt-0.5 ${valueClass}`}>{value}</span></div>;
}
