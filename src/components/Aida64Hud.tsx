import React from 'react';
import { useAida64Telemetry } from '../hooks/useAida64Telemetry';
export const Aida64Hud: React.FC = () => {
  const { snapshot } = useAida64Telemetry(500);
  const gpu = snapshot.sensors.find(s => /gpu.*util/i.test(s.label));
  const temp = snapshot.sensors.find(s => /gpu.*temp/i.test(s.label));
  const vram = snapshot.sensors.find(s => /vram.*used/i.test(s.label));
  const ram = snapshot.sensors.find(s => /ram.*used|memory.*used/i.test(s.label));
  return <div className="min-h-screen bg-black/70 text-emerald-300 font-mono p-4 select-none"><div className="max-w-[1200px] mx-auto border border-emerald-500/40 bg-slate-950/75 backdrop-blur rounded-xl p-5 shadow-2xl"><div className="flex justify-between items-center mb-5"><div><div className="text-[10px] tracking-[0.3em] text-emerald-500">GINA AIDA64 TELEMETRY HUD</div><div className="text-2xl font-bold text-slate-100">SYSTEM STATUS</div></div><div className="text-right text-[10px]">{snapshot.connected ? 'LIVE' : 'WAITING'}<div>{new Date(snapshot.timestamp).toLocaleTimeString()}</div></div></div><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[['GPU UTIL',gpu],['GPU TEMP',temp],['VRAM USED',vram],['RAM USED',ram]].map(([label,s]:any)=><div key={label} className="border border-slate-800 bg-black/40 rounded-lg p-4"><div className="text-[10px] text-slate-500">{label}</div><div className="text-3xl font-bold text-emerald-300 mt-2">{s ? `${Math.round(s.value)}${s.unit || ''}` : '—'}</div></div>)}</div><div className="mt-5 text-[9px] text-slate-600">DPI-aware browser HUD mode · use the browser window's native border controls for placement.</div></div></div>;
};
