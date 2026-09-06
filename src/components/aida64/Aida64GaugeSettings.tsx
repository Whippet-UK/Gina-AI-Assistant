import React, { useMemo, useState } from 'react';
import { ChevronDown, RotateCcw, Sparkles } from 'lucide-react';

type ColorMode = '3-Color Gradient' | 'Solid' | '2-Color Gradient';

interface GaugeSettings {
  roundedEnds: boolean;
  gapSize: number;
  gapRotation: number;
  radius: number;
  colorMode: ColorMode;
  colors: [string, string, string];
  thickness: number;
  opacity: number;
  trackEnabled: boolean;
  trackColor: string;
  trackThickness: number;
  trackOpacity: number;
  glowEnabled: boolean;
  glowColor: string;
  glowStrength: number;
}

const initialSettings: GaugeSettings = {
  roundedEnds: true,
  gapSize: 30,
  gapRotation: 307,
  radius: 97,
  colorMode: '3-Color Gradient',
  colors: ['#4568ff', '#10e6c0', '#ff1717'],
  thickness: 5,
  opacity: 1,
  trackEnabled: true,
  trackColor: '#a8a8a8',
  trackThickness: 17,
  trackOpacity: 0,
  glowEnabled: true,
  glowColor: '#ff4444',
  glowStrength: 14,
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const polar = (cx: number, cy: number, radius: number, angle: number) => {
  const radians = ((angle - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
};

const arcPath = (cx: number, cy: number, radius: number, startAngle: number, endAngle: number) => {
  const start = polar(cx, cy, radius, endAngle);
  const end = polar(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
};

const RangeRow: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}> = ({ label, value, min, max, step = 1, suffix = '', onChange }) => (
  <div className="grid grid-cols-[1fr_172px_60px] items-center gap-4 py-2">
    <label className="text-[13px] text-slate-200">{label}</label>
    <input
      aria-label={label}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={event => onChange(Number(event.target.value))}
      className="w-full accent-blue-500"
    />
    <div className="h-8 rounded border border-slate-600 bg-slate-700/80 flex items-center justify-center text-xs font-mono text-slate-100">
      {value}{suffix}
    </div>
  </div>
);

const Toggle: React.FC<{ checked: boolean; onChange: (checked: boolean) => void }> = ({ checked, onChange }) => (
  <button
    type="button"
    aria-pressed={checked}
    onClick={() => onChange(!checked)}
    className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-blue-500' : 'bg-slate-600'}`}
  >
    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
  </button>
);

const ColorDot: React.FC<{ color: string; onChange: (color: string) => void }> = ({ color, onChange }) => (
  <label className="relative inline-flex cursor-pointer">
    <span className="block w-4 h-4 rounded-full border border-slate-500 shadow-sm" style={{ backgroundColor: color }} />
    <input
      aria-label="Gauge color"
      type="color"
      value={color}
      onChange={event => onChange(event.target.value)}
      className="absolute inset-0 opacity-0 cursor-pointer"
    />
  </label>
);

export const Aida64GaugeSettings: React.FC = () => {
  const [settings, setSettings] = useState<GaugeSettings>(initialSettings);

  const set = <K extends keyof GaugeSettings>(key: K, value: GaugeSettings[K]) => {
    setSettings(current => ({ ...current, [key]: value }));
  };

  const preview = useMemo(() => {
    const cx = 150;
    const cy = 150;
    const r = clamp(settings.radius, 40, 115);
    const start = settings.gapRotation;
    const end = 360 - settings.gapSize / 2;
    const adjustedStart = start + settings.gapSize / 2;
    const trackStart = adjustedStart;
    const trackEnd = 360 - settings.gapSize / 2;
    const gradientId = 'aida64-gauge-gradient';
    const glowId = 'aida64-gauge-glow';
    return { cx, cy, r, start, end, adjustedStart, trackStart, trackEnd, gradientId, glowId };
  }, [settings]);

  const reset = () => setSettings(initialSettings);

  return (
    <div className="grid xl:grid-cols-[minmax(0,1fr)_330px] gap-5">
      <section className="bg-[#242424] border border-slate-700/70 rounded-xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500 font-semibold">Gauge factory</div>
            <h3 className="text-lg font-semibold text-slate-100">Gauge Preview</h3>
          </div>
          <button type="button" onClick={reset} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-xs text-slate-200 hover:bg-slate-700">
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>
        <div className="min-h-[520px] rounded-xl border border-slate-700 bg-[#191919] flex items-center justify-center overflow-hidden">
          <svg viewBox="0 0 300 300" className="w-[min(74vw,480px)] h-auto" role="img" aria-label="Live gauge preview">
            <defs>
              <linearGradient id={preview.gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={settings.colors[0]} />
                <stop offset="50%" stopColor={settings.colors[1]} />
                <stop offset="100%" stopColor={settings.colors[2]} />
              </linearGradient>
              <filter id={preview.glowId} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation={settings.glowStrength / 2.5} result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <circle cx="150" cy="150" r="122" fill="#151515" stroke="#303030" strokeWidth="2" />
            {settings.trackEnabled && (
              <path
                d={arcPath(preview.cx, preview.cy, preview.r, preview.trackStart, preview.trackEnd)}
                fill="none"
                stroke={settings.trackColor}
                strokeWidth={settings.trackThickness}
                strokeOpacity={settings.trackOpacity}
                strokeLinecap={settings.roundedEnds ? 'round' : 'butt'}
              />
            )}
            <path
              d={arcPath(preview.cx, preview.cy, preview.r, preview.adjustedStart, preview.trackEnd)}
              fill="none"
              stroke={settings.colorMode === 'Solid' ? settings.colors[0] : `url(#${preview.gradientId})`}
              strokeWidth={settings.thickness}
              strokeOpacity={settings.opacity}
              strokeLinecap={settings.roundedEnds ? 'round' : 'butt'}
              filter={settings.glowEnabled ? `url(#${preview.glowId})` : undefined}
            />
            <circle cx="150" cy="150" r="68" fill="#1d1d1d" stroke="#343434" />
            <text x="150" y="143" textAnchor="middle" fill="#f5f5f5" fontSize="28" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontWeight="700">72</text>
            <text x="150" y="164" textAnchor="middle" fill="#7d8794" fontSize="11" fontFamily="ui-sans-serif, system-ui">CPU LOAD</text>
          </svg>
        </div>
      </section>

      <aside className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg font-semibold text-slate-100">Settings</h3>
          <Sparkles className="w-4 h-4 text-blue-400" />
        </div>

        <div className="rounded-2xl overflow-hidden border border-slate-700/70 bg-[#242424]">
          <div className="px-4 py-2.5 bg-[#3a3a3a] text-[10px] uppercase tracking-[0.2em] text-slate-400 font-semibold">Geometry</div>
          <div className="p-4">
            <div className="flex items-center justify-between py-2">
              <span className="text-[13px] text-slate-200">Rounded Ends</span>
              <Toggle checked={settings.roundedEnds} onChange={value => set('roundedEnds', value)} />
            </div>
            <RangeRow label="Gap Size (°)" value={settings.gapSize} min={0} max={90} onChange={value => set('gapSize', value)} />
            <RangeRow label="Gap Rotation (°)" value={settings.gapRotation} min={0} max={359} onChange={value => set('gapRotation', value)} />
            <RangeRow label="Radius (px)" value={settings.radius} min={40} max={115} onChange={value => set('radius', value)} />
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden border border-slate-700/70 bg-[#242424]">
          <div className="px-4 py-2.5 bg-[#3a3a3a] text-[10px] uppercase tracking-[0.2em] text-slate-400 font-semibold">Value Styling</div>
          <div className="p-4">
            <div className="flex items-center justify-between gap-3 py-2">
              <span className="text-[13px] text-slate-200">Color Mode</span>
              <div className="relative w-[185px]">
                <select
                  value={settings.colorMode}
                  onChange={event => set('colorMode', event.target.value as ColorMode)}
                  className="appearance-none w-full h-9 rounded-md border border-slate-600 bg-[#4a4a4a] px-3 pr-8 text-xs text-slate-100 outline-none"
                >
                  <option>3-Color Gradient</option>
                  <option>2-Color Gradient</option>
                  <option>Solid</option>
                </select>
                <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-slate-300 pointer-events-none" />
              </div>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-[13px] text-slate-200">Colors</span>
              <div className="flex items-center gap-6 pr-10">
                {settings.colors.map((color, index) => (
                  <ColorDot key={index} color={color} onChange={value => {
                    const colors: [string, string, string] = [...settings.colors] as [string, string, string];
                    colors[index] = value;
                    set('colors', colors);
                  }} />
                ))}
              </div>
            </div>
            <RangeRow label="Thickness" value={settings.thickness} min={1} max={24} onChange={value => set('thickness', value)} />
            <RangeRow label="Opacity" value={settings.opacity} min={0} max={1} step={0.01} onChange={value => set('opacity', value)} />
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden border border-slate-700/70 bg-[#242424]">
          <div className="px-4 py-2.5 bg-[#3a3a3a] flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-semibold">Background Track</span>
            <Toggle checked={settings.trackEnabled} onChange={value => set('trackEnabled', value)} />
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between py-2">
              <span className="text-[13px] text-slate-200">Color</span>
              <ColorDot color={settings.trackColor} onChange={value => set('trackColor', value)} />
            </div>
            <RangeRow label="Thickness" value={settings.trackThickness} min={1} max={30} onChange={value => set('trackThickness', value)} />
            <RangeRow label="Opacity" value={settings.trackOpacity} min={0} max={1} step={0.01} onChange={value => set('trackOpacity', value)} />
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden border border-slate-700/70 bg-[#242424]">
          <div className="px-4 py-2.5 bg-[#3a3a3a] flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-semibold">Glow Effect</span>
            <Toggle checked={settings.glowEnabled} onChange={value => set('glowEnabled', value)} />
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between py-2">
              <span className="text-[13px] text-slate-200">Color</span>
              <ColorDot color={settings.glowColor} onChange={value => set('glowColor', value)} />
            </div>
            <RangeRow label="Strength" value={settings.glowStrength} min={0} max={30} onChange={value => set('glowStrength', value)} />
          </div>
        </div>
      </aside>
    </div>
  );
};
