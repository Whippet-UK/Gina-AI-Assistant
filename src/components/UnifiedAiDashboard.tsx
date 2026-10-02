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

      <main className="flex-1 min-h-0 p-4 flex flex-col gap-3 w-full font-mono text-xs">
        {/* Pure Flat Text Telemetry Stream (No Container Boxes) */}
        <section className="flex flex-wrap items-center gap-x-5 gap-y-1.5 py-1.5 border-b border-zinc-800/50 text-[11px]">
          <span className="text-zinc-500 uppercase tracking-wider text-[9px]">VELOCITY: <strong className="text-emerald-400 font-bold">{tokensPerSec ? `${tokensPerSec.toFixed(1)} Tok/s` : '—'}</strong></span>
          <span className="text-zinc-500 uppercase tracking-wider text-[9px]">QUEUE: <strong className="text-zinc-200">{String(activePrompts)}</strong></span>
          <span className="text-zinc-500 uppercase tracking-wider text-[9px]">LATENCY: <strong className="text-zinc-200">{latency ? `${latency} ms` : '—'}</strong></span>
          <span className="text-zinc-500 uppercase tracking-wider text-[9px]">CACHE: <strong className="text-sky-300">{cacheMb ? `${cacheMb} MB` : '—'}</strong></span>
          <span className="text-zinc-500 uppercase tracking-wider text-[9px]">POWER: <strong className="text-amber-300">{powerW ? `${powerW.toFixed(0)} W` : 'Set watts'}</strong></span>
          <span className="text-zinc-500 uppercase tracking-wider text-[9px]">COST: <strong className="text-emerald-400">{responseCost ? `£${responseCost.toFixed(6)}` : '—'}</strong></span>
          <span className="text-zinc-500 uppercase tracking-wider text-[9px]">EST/DAY: <strong className="text-zinc-300">{dailyCost ? `£${dailyCost.toFixed(2)}/day` : '—'}</strong></span>
          <span className="text-zinc-500 uppercase tracking-wider text-[9px]">MODEL: <strong className="text-emerald-400">Open-2.5-NL-7B-Instruct</strong></span>
        </section>

        {showConfig && (
          <div className="flex flex-wrap items-center gap-3 py-2 border-b border-zinc-800/40 text-[10px]">
            <label className="flex items-center gap-1.5 text-zinc-400">
              WATTS:
              <input value={powerInput} onChange={e => setPowerInput(e.target.value)} placeholder={powerW ? String(powerW) : '650'} type="number" min="0" className="w-20 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-200 text-xs" />
            </label>
            <label className="flex items-center gap-1.5 text-zinc-400">
              TARIFF £/kWh:
              <input value={costInput} onChange={e => setCostInput(e.target.value)} placeholder={costPerKwh.toFixed(4)} type="number" min="0.0001" step="0.0001" className="w-24 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-200 text-xs" />
            </label>
            <button type="button" onClick={saveCostSystem} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded px-2.5 py-1 text-[10px] font-bold">SAVE</button>
          </div>
        )}

        {/* Collapsed [id:] Preset Selector Menu (Strict max-height: 200px) */}
        <div className="flex items-center gap-2 py-1 border-b border-zinc-800/40 max-h-[200px]">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider shrink-0">PRESET:</span>
          <select
            onChange={e => { if (e.target.value) { setPrompt(e.target.value); } }}
            className="flex-1 bg-transparent border border-zinc-800/80 rounded px-2 py-1 text-[11px] text-emerald-400 outline-none cursor-pointer max-h-[200px]"
          >
            <option value="" className="bg-zinc-950 text-zinc-400">⚡ Select [id:] Cheat Code or Preset Task…</option>
            <option value="[id: 'rover_2d_sandbox'] Build a 2D web app using HTML5 Canvas, Tailwind CSS, and vanilla JS featuring arena, obstacles, goal, and AI rover with 8-ray LiDAR." className="bg-zinc-950 text-zinc-200">[id: 'rover_2d_sandbox'] 2D Rover Arena + 8-Ray LiDAR</option>
            <option value="[id: 'claude_streaming_engine'] Explain the 3 core rules of real-time auto-scrolling with user-interrupt detection." className="bg-zinc-950 text-zinc-200">[id: 'claude_streaming_engine'] Auto-Scroll &amp; User Interrupt Architecture</option>
            <option value="[id: 'fastapi_microservice'] Implement a high-performance Python FastAPI service with WebSockets." className="bg-zinc-950 text-zinc-200">[id: 'fastapi_microservice'] Python FastAPI Streaming Generator</option>
          </select>
        </div>

        {/* Pure Flat Text Log Stream (Raw terminal output directly on page layout) */}
        <section className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col py-1 space-y-1">
          {steps.length === 0 && <div className="text-[11px] text-zinc-600">No prompt activity on screen. Ready for input.</div>}
          {steps.map(step => {
            const open = !!expandedItems[step.id];
            return (
              <div key={step.id} className="text-[11px] font-mono leading-5">
                <div
                  onClick={() => step.isExpandable && setExpandedItems(prev => ({ ...prev, [step.id]: !prev[step.id] }))}
                  className="flex items-center gap-2 cursor-pointer text-zinc-300 hover:text-white"
                >
                  <span className="text-zinc-600 select-none">❯</span>
                  <span className={step.type === 'command' ? 'text-amber-400 font-semibold' : 'text-emerald-400'}>[{step.type.toUpperCase()}]</span>
                  <span className="text-zinc-200">{step.title}</span>
                  {step.isExpandable && <span className="text-zinc-600 text-[10px]">{open ? '▲ collapse' : '▼ expand'}</span>}
                </div>
                {open && step.details && (
                  <pre className="mt-1 pl-4 text-[10px] text-zinc-400 whitespace-pre-wrap border-l border-zinc-800/80">{step.details}</pre>
                )}
              </div>
            );
          })}
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
