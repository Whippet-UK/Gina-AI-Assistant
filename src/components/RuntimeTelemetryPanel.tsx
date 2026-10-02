import React, { useEffect, useRef, useState } from 'react';
import { SystemTelemetry } from '../types';

interface RuntimeTelemetryPanelProps {
  telemetry: SystemTelemetry;
  onClose: () => void;
}

interface Snapshot {
  requestCount: number;
  latest: any;
  totals: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    durationMs: number;
    toolCalls: number;
    webRequests: number;
    successes: number;
  };
  history: any[];
}

const DAY_RATE_KWH = 0.3157;
const NIGHT_RATE_KWH = 0.1390;
const DAILY_STANDING_CHARGE = 0.5472;

function ts() {
  return new Date().toISOString().slice(11, 23);
}

/** Text-only live telemetry stream — no cards, borders, or metric boxes. */
export const RuntimeTelemetryPanel: React.FC<RuntimeTelemetryPanelProps> = ({ telemetry, onClose }) => {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [sessionCost, setSessionCost] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const streamRef = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    try {
      const r = await fetch('/api/runtime/telemetry', { cache: 'no-store' });
      if (r.ok) setSnapshot(await r.json());
    } catch {
      /* keep last snapshot */
    }
  };

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 1000);
    return () => clearInterval(id);
  }, []);

  const effectiveSystemPowerW =
    Number(telemetry.systemPowerW || telemetry.estimatedWallPowerW || 0) > 0
      ? Number(telemetry.systemPowerW || telemetry.estimatedWallPowerW)
      : Number(telemetry.gpuPowerW || 0) + Number(telemetry.cpuPowerW || 0) + Number(telemetry.otherHardwarePowerW || 35);

  useEffect(() => {
    const costInterval = setInterval(() => {
      const currentDate = new Date();
      setNow(currentDate);
      setSessionCost(prev => {
        const hour = currentDate.getHours();
        const activeRate = hour >= 7 && hour < 23 ? DAY_RATE_KWH : NIGHT_RATE_KWH;
        const kw = effectiveSystemPowerW / 1000;
        return prev + (kw * activeRate) / 3600 + DAILY_STANDING_CHARGE / 86400;
      });
    }, 1000);
    return () => clearInterval(costInterval);
  }, [effectiveSystemPowerW]);

  useEffect(() => {
    if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [snapshot, telemetry, sessionCost]);

  const currentHour = now.getHours();
  const isDayRate = currentHour >= 7 && currentHour < 23;
  const rateMode = isDayRate ? 'DAY' : 'NIGHT';
  const currentRate = isDayRate ? DAY_RATE_KWH : NIGHT_RATE_KWH;
  const estimatedDailyCost = (effectiveSystemPowerW / 1000) * ((DAY_RATE_KWH * 16) + (NIGHT_RATE_KWH * 8)) + DAILY_STANDING_CHARGE;
  const latest = snapshot?.latest;
  const gpuPowerW = Number(telemetry.gpuPowerW || 0);
  const source =
    latest?.source === 'local+web' ? 'LOCAL+WEB' : latest?.source === 'web' ? 'WEB' : 'LOCAL';

  const lines: string[] = [
    `${ts()}  TELEMETRY  inference=${source}  vram=${(telemetry.vramUsedMB / 1024).toFixed(2)}/${(telemetry.vramTotalMB / 1024).toFixed(2)}GB  gpu=${telemetry.gpuTempC}°C  ${gpuPowerW}W`,
    `${ts()}  POWER      wall≈${effectiveSystemPowerW}W  cpu=${telemetry.cpuPowerW ?? '—'}W  rate=${rateMode} £${currentRate.toFixed(4)}/kWh  session=£${sessionCost.toFixed(4)}  est/day=£${estimatedDailyCost.toFixed(2)}`,
    `${ts()}  TOKENS     prompt=${latest ? Number(latest.promptTokens || 0).toLocaleString() : '—'}  total=${latest ? Number(latest.totalTokens || 0).toLocaleString() : '—'}  ${latest ? Number(latest.completionTokensPerSecond || 0).toFixed(1) : '—'} t/s  web=${latest?.webSearched ? latest.webProvider || 'USED' : 'off'}`,
    `${ts()}  SESSION    prompts=${snapshot?.totals?.promptTokens?.toLocaleString() || 0}tok  completions=${snapshot?.totals?.completionTokens?.toLocaleString() || 0}tok  requests=${snapshot?.requestCount || 0}  ok=${snapshot?.totals?.successes || 0}  tools=${snapshot?.totals?.toolCalls || 0}`,
  ];

  for (const item of (snapshot?.history || []).slice(0, 20)) {
    lines.push(
      `${ts()}  ITER  ${item.suite || 'suite'}  ${item.source === 'local+web' ? 'LOCAL+WEB' : String(item.source || 'LOCAL').toUpperCase()}  ${Number(item.promptTokens || 0)} in / ${Number(item.completionTokens || 0)} out  ${Number(item.durationMs || 0)}ms  ${Number(item.completionTokensPerSecond || 0).toFixed(1)}t/s`
    );
  }

  if (!(snapshot?.history || []).length) {
    lines.push(`${ts()}  ITER  waiting for first local LLM prompt iteration…`);
  }

  return (
    <div className="gina-console-shell max-w-4xl w-full mx-auto">
      <div className="gina-console-toolbar">
        <span className="text-[10px] font-bold tracking-[0.2em] text-emerald-400 uppercase">Live runtime telemetry</span>
        <span className="text-[10px] font-mono text-slate-500">text stream · no frames</span>
        <button type="button" onClick={onClose} className="ml-auto gina-console-action text-slate-400">
          close
        </button>
      </div>
      <div ref={streamRef} className="gina-console-stream font-mono text-[11px] leading-5 max-h-[70vh]">
        {lines.map((line, i) => (
          <div key={i} className="gina-console-line text-slate-300 whitespace-pre-wrap">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
};
