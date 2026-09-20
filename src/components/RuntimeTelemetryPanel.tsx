import React, { useEffect, useState } from 'react';
import { Activity, Brain, Globe2, Cpu, Hash, RefreshCw, X, Zap } from 'lucide-react';
import { SystemTelemetry } from '../types';
import { VRAMHistoryGraph } from './VRAMHistoryGraph';

interface RuntimeTelemetryPanelProps { telemetry: SystemTelemetry; onClose: () => void; }
interface Snapshot { requestCount:number; latest:any; totals:{promptTokens:number;completionTokens:number;totalTokens:number;durationMs:number;toolCalls:number;webRequests:number;successes:number}; history:any[]; }

const DAY_RATE_KWH = 0.3157; // 7 AM - 11 PM (£/kWh)
const NIGHT_RATE_KWH = 0.1390; // 11 PM - 7 AM (£/kWh)
const DAILY_STANDING_CHARGE = 0.5472; // £/day

export const RuntimeTelemetryPanel: React.FC<RuntimeTelemetryPanelProps> = ({ telemetry, onClose }) => {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sessionCost, setSessionCost] = useState<number>(0);
  const [now, setNow] = useState<Date>(() => new Date());

  const refresh = async () => {
    setRefreshing(true);
    try { const r=await fetch('/api/runtime/telemetry',{cache:'no-store'}); if(r.ok) setSnapshot(await r.json()); } finally { setRefreshing(false); }
  };
  useEffect(() => { void refresh(); const id=setInterval(()=>void refresh(),1000); return()=>clearInterval(id); }, []);

  // Live electricity cost calculation
  const effectiveSystemPowerW = Number(telemetry.systemPowerW || telemetry.estimatedWallPowerW || 0) > 0
    ? Number(telemetry.systemPowerW || telemetry.estimatedWallPowerW)
    : (Number(telemetry.gpuPowerW || 0) + Number(telemetry.cpuPowerW || 0) + Number(telemetry.otherHardwarePowerW || 35));

  useEffect(() => {
    const costInterval = setInterval(() => {
      const currentDate = new Date();
      setNow(currentDate);
      setSessionCost(prev => {
        const hour = currentDate.getHours();
        const activeRate = (hour >= 7 && hour < 23) ? DAY_RATE_KWH : NIGHT_RATE_KWH;
        const kw = effectiveSystemPowerW / 1000;
        const energyCostPerSec = (kw * activeRate) / 3600;
        const standingChargePerSec = DAILY_STANDING_CHARGE / 86400;
        return prev + energyCostPerSec + standingChargePerSec;
      });
    }, 1000);
    return () => clearInterval(costInterval);
  }, [effectiveSystemPowerW]);

  const currentHour = now.getHours();
  const isDayRate = currentHour >= 7 && currentHour < 23;
  const rateMode: 'DAY' | 'NIGHT' = isDayRate ? 'DAY' : 'NIGHT';
  const currentRate = isDayRate ? DAY_RATE_KWH : NIGHT_RATE_KWH;
  const systemPowerW = effectiveSystemPowerW;
  const gpuPowerW = Number(telemetry.gpuPowerW || 0);
  const powerKw = Math.max(0, gpuPowerW) / 1000;

  // Estimated daily cost based on current GPU power consumption (16h day + 8h night + standing charge)
  const estimatedDailyEnergyCost = (powerKw * 16 * DAY_RATE_KWH) + (powerKw * 8 * NIGHT_RATE_KWH);
  const estimatedDailyCost = estimatedDailyEnergyCost + DAILY_STANDING_CHARGE;

  const latest=snapshot?.latest;
  const source=latest?.source==='local+web' ? 'LOCAL + WEB' : latest?.source==='web' ? 'WEB' : 'LOCAL';
  return <section className="w-full max-w-3xl mx-auto rounded-xl border border-slate-800 bg-slate-950/95 shadow-2xl overflow-hidden">
    <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-800">
      <div><div className="text-[9px] font-extrabold tracking-[0.2em] text-emerald-400">LIVE RUNTIME TELEMETRY</div><div className="text-[8px] text-slate-500 mt-0.5">All suites · prompt iterations · local/web inference · 30-second VRAM stage history</div></div>
      <div className="flex items-center gap-2"><button onClick={()=>void refresh()} className="p-1 rounded border border-slate-800 text-slate-500 hover:text-white" title="Refresh telemetry"><RefreshCw className={`w-3 h-3 ${refreshing?'animate-spin':''}`}/></button><button onClick={onClose} className="p-1 rounded border border-slate-800 text-slate-500 hover:text-white"><X className="w-3 h-3"/></button></div>
    </header>
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-1.5 p-2">
      <Metric icon={<Brain/>} label="INFERENCE" value={source}/>
      <Metric icon={<Hash/>} label="PROMPT TOKENS" value={latest ? latest.promptTokens.toLocaleString() : '—'} />
      <Metric icon={<Hash/>} label="TOTAL TOKENS" value={latest ? latest.totalTokens.toLocaleString() : '—'} />
      <Metric icon={<Globe2/>} label="WEB SEARCH" value={latest?.webSearched ? (latest.webProvider || 'USED') : 'NOT USED'} />
      <Metric icon={<Cpu/>} label="VRAM NOW" value={`${(telemetry.vramUsedMB/1024).toFixed(2)} GB`} />
      <Metric icon={<Activity/>} label="TOKENS / SEC" value={latest ? `${Number(latest.completionTokensPerSecond||0).toFixed(1)} t/s` : '—'} />
      <Metric icon={<Hash/>} label="CONTEXT" value={latest ? `${Number(latest.promptTokens||0).toLocaleString()} in` : '—'} />
    </div>

    {/* Electricity Cost Telemetry */}
    <div className="mx-2 mb-2 p-2.5 rounded-lg border border-slate-800 bg-slate-900/60">
      <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-1.5 mb-2">
        <div className="flex items-center gap-1.5 text-[9px] font-bold tracking-wider text-emerald-400">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          WHOLE-PC ELECTRICITY & RUNNING COST
        </div>
        <div className="flex items-center gap-1.5 text-[9px] font-mono">
          <span className="text-slate-500">RATE MODE:</span>
          <span className={`px-1.5 py-0.5 rounded font-bold ${isDayRate ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'}`}>
            {rateMode} (£{currentRate.toFixed(4)}/kWh)
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[9px] font-mono">
        <div className="bg-slate-950/70 border border-slate-800/80 p-2 rounded">
          <span className="text-slate-500 block text-[8px] uppercase tracking-wider">Whole PC / Wall Estimate</span>
          <span className="text-slate-200 font-bold text-sm">{systemPowerW} W</span>
          <span className="text-slate-500 text-[8px] block mt-0.5">{(powerKw).toFixed(3)} kW · CPU {telemetry.cpuPowerW ?? '—'}W · GPU {gpuPowerW}W</span>
        </div>
        <div className="bg-slate-950/70 border border-slate-800/80 p-2 rounded">
          <span className="text-slate-500 block text-[8px] uppercase tracking-wider">Current Rate Mode</span>
          <span className="text-emerald-400 font-bold text-sm">{rateMode}</span>
          <span className="text-slate-500 text-[8px] block mt-0.5">{isDayRate ? '7 AM - 11 PM' : '11 PM - 7 AM'}</span>
        </div>
        <div className="bg-slate-950/70 border border-slate-800/80 p-2 rounded">
          <span className="text-slate-500 block text-[8px] uppercase tracking-wider">Cumulative Session Cost</span>
          <span className="text-amber-300 font-bold text-sm">£{sessionCost.toFixed(4)}</span>
          <span className="text-slate-500 text-[8px] block mt-0.5">incl. standing charge</span>
        </div>
        <div className="bg-slate-950/70 border border-slate-800/80 p-2 rounded">
          <span className="text-slate-500 block text-[8px] uppercase tracking-wider">Estimated Daily Cost</span>
          <span className="text-emerald-300 font-bold text-sm">£{estimatedDailyCost.toFixed(2)}/day</span>
          <span className="text-slate-500 text-[8px] block mt-0.5">£{(powerKw * currentRate).toFixed(4)}/hr · {(powerKw * currentRate * 100).toFixed(2)}p/hr</span>
        </div>
      </div>
      <div className="mt-2 text-[8px] text-slate-500 flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-800/60 font-mono">
        <span>Day Rate: £0.3157/kWh (07:00–23:00)</span>
        <span>Night Rate: £0.1390/kWh (23:00–07:00)</span>
        <span>Daily Standing Charge: £0.5472/day · {telemetry.powerSource || 'estimated system draw'}</span>
      </div>
    </div>

    <div className="px-2 pb-2"><VRAMHistoryGraph telemetry={telemetry}/></div>
    <div className="mx-2 mb-2 rounded-lg border border-slate-800 overflow-hidden">
      <div className="px-2 py-1.5 bg-slate-900/70 text-[8px] font-bold tracking-wider text-slate-500">LIVE PROMPT ITERATIONS</div>
      <div className="max-h-28 overflow-auto">
        {(snapshot?.history || []).slice(0, 12).map((item:any) => <div key={item.id} className="grid grid-cols-[1fr_.65fr_.7fr_.7fr_.65fr_.55fr] gap-2 px-2 py-1 border-t border-slate-900 text-[8px] font-mono text-slate-400"><span className="truncate text-slate-300">{item.suite || 'Unknown'}</span><span>{item.source === 'local+web' ? 'LOCAL+WEB' : String(item.source||'LOCAL').toUpperCase()}</span><span>{Number(item.promptTokens||0).toLocaleString()} in</span><span>{Number(item.completionTokens||0).toLocaleString()} out</span><span>{Number(item.durationMs||0)}ms</span><span>{Number(item.completionTokensPerSecond||0).toFixed(1)}t/s</span></div>)}
        {!snapshot?.history?.length && <div className="px-2 py-2 text-[8px] text-slate-600">Waiting for the first local LLM prompt iteration…</div>}
      </div>
    </div>
    <div className="px-3 py-1.5 border-t border-slate-800 grid grid-cols-3 gap-2 text-[9px] font-mono">
      <div><span className="text-slate-600">PROMPTS / SESSION</span><div className="text-slate-200 mt-0.5">{snapshot?.totals.promptTokens.toLocaleString() || '0'} tokens</div></div>
      <div><span className="text-slate-600">COMPLETIONS</span><div className="text-slate-200 mt-0.5">{snapshot?.totals.completionTokens.toLocaleString() || '0'} tokens</div></div>
      <div><span className="text-slate-600">LLM REQUESTS</span><div className="text-slate-200 mt-0.5">{snapshot?.requestCount || 0} · {snapshot?.totals.successes || 0} OK</div></div>
      <div><span className="text-slate-600">AVG TIME</span><div className="text-slate-200 mt-0.5">{snapshot?.requestCount ? Math.round(snapshot.totals.durationMs / snapshot.requestCount) : 0} ms</div></div>
      <div><span className="text-slate-600">TOOL CALLS</span><div className="text-slate-200 mt-0.5">{snapshot?.totals.toolCalls || 0}</div></div>
    </div>
  </section>;
};

function Metric({icon,label,value}:{icon:React.ReactNode;label:string;value:string}) { return <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2"><div className="flex items-center gap-1.5 text-slate-500 text-[8px] font-bold tracking-wider">{React.cloneElement(icon as React.ReactElement<{ className?: string }>,{className:'w-3 h-3'})}{label}</div><div className="text-[11px] font-mono font-bold text-slate-200 mt-0.5 truncate">{value}</div></div>; }

