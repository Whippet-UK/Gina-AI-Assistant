import React, { useState, useRef } from 'react';
import { Sliders, Download, Sparkles, Plus, Trash2, Eye, ShieldCheck, Fan, Flame, Cpu, Zap, HardDrive, Gauge } from 'lucide-react';
import { Aida64DialConfig, Aida64DialSlot } from '../../types';
import { DEFAULT_DIAL_CONFIG } from '../../data/aida64Presets';

interface Aida64DialDesignerProps {
  onExportDial?: (dialDataUrl: string, config: Aida64DialConfig) => void;
}

export const Aida64DialDesigner: React.FC<Aida64DialDesignerProps> = ({ onExportDial }) => {
  const [config, setConfig] = useState<Aida64DialConfig>(DEFAULT_DIAL_CONFIG);
  const [activeTab, setActiveTab] = useState<'slots' | 'styling' | 'preview'>('slots');
  const [testValues, setTestValues] = useState<{ [key: string]: string }>({
    slot_banner: 'RYZEN 5 5600X',
    slot_hero: '44',
    slot_mhz: '4796',
    slot_fan1: '1293',
    slot_fan2: '978',
    slot_tray: '48.5'
  });
  const [showSimulatedText, setShowSimulatedText] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Render SVG Dial representation
  const renderDialSvg = (includeText: boolean = showSimulatedText) => {
    const size = config.size;
    const center = size / 2;
    const isLeft = config.orientation === 'left';
    const primary = config.themeColor;
    const accent = config.accentColor;

    // Outer Bezel Radii
    const outerRadius = size * 0.46;
    const innerRadius = size * 0.43;
    const heroRadius = size * 0.23;
    const heroX = isLeft ? center * 0.65 : center * 1.35;
    const heroY = center * 1.05;

    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="w-full h-auto max-w-[340px] drop-shadow-2xl select-none"
      >
        <defs>
          {/* Glowing Filters */}
          <filter id="dialGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="redNeon" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id="bezelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#252b3b" />
            <stop offset="50%" stopColor="#0b0f19" />
            <stop offset="100%" stopColor="#1e2433" />
          </linearGradient>
          <linearGradient id="slotGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={primary} stopOpacity="0.9" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.95" />
          </linearGradient>
        </defs>

        {/* Outer Tech Chassis Ring */}
        <circle
          cx={center}
          cy={center}
          r={outerRadius}
          fill="url(#bezelGrad)"
          stroke={primary}
          strokeWidth="2.5"
          filter="url(#dialGlow)"
        />
        <circle
          cx={center}
          cy={center}
          r={innerRadius}
          fill="#05070e"
          stroke="#334155"
          strokeWidth="1.5"
        />

        {/* Outer Segmented LED Halo Track */}
        {config.hasOuterLedTrack && (
          <g stroke={primary} strokeWidth="3" strokeLinecap="round" filter="url(#redNeon)" opacity="0.85">
            {Array.from({ length: 18 }).map((_, idx) => {
              const startAngle = (isLeft ? 120 : 60) + idx * 12;
              const rad = (startAngle * Math.PI) / 180;
              const x1 = center + (innerRadius - 4) * Math.cos(rad);
              const y1 = center + (innerRadius - 4) * Math.sin(rad);
              const x2 = center + (innerRadius + 4) * Math.cos(rad);
              const y2 = center + (innerRadius + 4) * Math.sin(rad);
              return <line key={idx} x1={x1} y1={y1} x2={x2} y2={y2} />;
            })}
          </g>
        )}

        {/* Top Header Banner Slot */}
        <path
          d={`M ${center - size * 0.32} ${center - size * 0.31} 
              Q ${center} ${center - size * 0.35} ${center + size * 0.32} ${center - size * 0.31} 
              L ${center + size * 0.28} ${center - size * 0.20} 
              Q ${center} ${center - size * 0.24} ${center - size * 0.28} ${center - size * 0.20} Z`}
          fill="url(#slotGrad)"
          stroke="#000"
          strokeWidth="1"
          opacity="0.95"
        />

        {/* Hero Central / Side Cutout Socket */}
        <circle
          cx={heroX}
          cy={heroY}
          r={heroRadius + 4}
          fill="#0a0f1d"
          stroke="#1e293b"
          strokeWidth="3"
        />
        <circle
          cx={heroX}
          cy={heroY}
          r={heroRadius}
          fill="url(#slotGrad)"
          stroke="#000"
          strokeWidth="1.5"
        />

        {/* Stacked Right/Left Pill Slots */}
        {isLeft ? (
          // Right Stack for Left Gauge
          <g>
            {/* Pill 1: Clock/Freq */}
            <g transform={`translate(${center * 1.15}, ${center * 0.82})`}>
              <rect x="0" y="0" width={size * 0.22} height={size * 0.08} rx={size * 0.04} fill="url(#slotGrad)" stroke="#000" strokeWidth="1" />
              <circle cx={-size * 0.05} cy={size * 0.04} r={size * 0.03} fill="none" stroke={primary} strokeWidth="1.5" />
              <text x={size * 0.24} y={size * 0.055} fill={primary} fontSize={size * 0.045} fontWeight="bold" fontFamily="monospace">MHz</text>
            </g>

            {/* Pill 2: Fan 1 */}
            <g transform={`translate(${center * 1.15}, ${center * 1.05})`}>
              <rect x="0" y="0" width={size * 0.22} height={size * 0.08} rx={size * 0.04} fill="url(#slotGrad)" stroke="#000" strokeWidth="1" />
              <circle cx={-size * 0.05} cy={size * 0.04} r={size * 0.03} fill={primary} opacity="0.3" />
              <text x={size * 0.24} y={size * 0.055} fill={primary} fontSize={size * 0.045} fontWeight="bold" fontFamily="monospace">RPM</text>
            </g>

            {/* Pill 3: Fan 2 / Pump */}
            <g transform={`translate(${center * 1.15}, ${center * 1.28})`}>
              <rect x="0" y="0" width={size * 0.22} height={size * 0.08} rx={size * 0.04} fill="url(#slotGrad)" stroke="#000" strokeWidth="1" />
              <circle cx={-size * 0.05} cy={size * 0.04} r={size * 0.03} fill={primary} opacity="0.3" />
              <text x={size * 0.24} y={size * 0.055} fill={primary} fontSize={size * 0.045} fontWeight="bold" fontFamily="monospace">RPM</text>
            </g>
          </g>
        ) : (
          // Left Stack for Right Gauge
          <g>
            <g transform={`translate(${center * 0.35}, ${center * 0.82})`}>
              <rect x="0" y="0" width={size * 0.22} height={size * 0.08} rx={size * 0.04} fill="url(#slotGrad)" stroke="#000" strokeWidth="1" />
              <text x={-size * 0.12} y={size * 0.055} fill={primary} fontSize={size * 0.045} fontWeight="bold" fontFamily="monospace">MHz</text>
            </g>
            <g transform={`translate(${center * 0.35}, ${center * 1.05})`}>
              <rect x="0" y="0" width={size * 0.22} height={size * 0.08} rx={size * 0.04} fill="url(#slotGrad)" stroke="#000" strokeWidth="1" />
              <text x={-size * 0.12} y={size * 0.055} fill={primary} fontSize={size * 0.045} fontWeight="bold" fontFamily="monospace">RPM</text>
            </g>
            <g transform={`translate(${center * 0.35}, ${center * 1.28})`}>
              <rect x="0" y="0" width={size * 0.22} height={size * 0.08} rx={size * 0.04} fill="url(#slotGrad)" stroke="#000" strokeWidth="1" />
              <text x={-size * 0.12} y={size * 0.055} fill={primary} fontSize={size * 0.045} fontWeight="bold" fontFamily="monospace">RPM</text>
            </g>
          </g>
        )}

        {/* Bottom Curved Telemetry Tray */}
        <path
          d={`M ${center - size * 0.38} ${center + size * 0.36}
              Q ${center} ${center + size * 0.44} ${center + size * 0.38} ${center + size * 0.36}
              L ${center + size * 0.32} ${center + size * 0.25}
              Q ${center} ${center + size * 0.32} ${center - size * 0.32} ${center + size * 0.25} Z`}
          fill="url(#slotGrad)"
          stroke="#000"
          strokeWidth="1"
          opacity="0.95"
        />

        {/* Optional Simulated Dynamic AIDA64 Text/Values */}
        {includeText && (
          <g fontFamily="monospace" fontWeight="900" textAnchor="middle">
            <text x={center} y={center - size * 0.24} fill="#ffffff" fontSize={size * 0.05} letterSpacing="1">
              {testValues.slot_banner}
            </text>
            <text x={heroX} y={heroY + size * 0.04} fill="#ffffff" fontSize={size * 0.14}>
              {testValues.slot_hero}
            </text>
            <text x={heroX} y={heroY + size * 0.12} fill="#ffffff" fontSize={size * 0.04} opacity="0.8">
              % UTIL
            </text>
            {isLeft ? (
              <>
                <text x={center * 1.15 + size * 0.11} y={center * 0.82 + size * 0.055} fill="#ffffff" fontSize={size * 0.05}>
                  {testValues.slot_mhz}
                </text>
                <text x={center * 1.15 + size * 0.11} y={center * 1.05 + size * 0.055} fill="#ffffff" fontSize={size * 0.05}>
                  {testValues.slot_fan1}
                </text>
                <text x={center * 1.15 + size * 0.11} y={center * 1.28 + size * 0.055} fill="#ffffff" fontSize={size * 0.05}>
                  {testValues.slot_fan2}
                </text>
              </>
            ) : null}
            <text x={center} y={center + size * 0.34} fill="#ffffff" fontSize={size * 0.06}>
              {testValues.slot_tray}°C
            </text>
          </g>
        )}
      </svg>
    );
  };

  const handleDownloadPng = async () => {
    setIsExporting(true);
    try {
      const size = config.size;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const svgString = new XMLSerializer().serializeToString(
        document.querySelector('#svg-dial-container svg') as SVGElement
      );
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const blobURL = window.URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0);
        const pngUrl = canvas.toDataURL('image/png');

        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `aida64_dial_${config.orientation}_${config.size}px.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        window.URL.revokeObjectURL(blobURL);
        setIsExporting(false);
      };
      img.src = blobURL;
    } catch (err) {
      console.error('Failed to export PNG:', err);
      setIsExporting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left Column: Dial Parameters & Customizer */}
      <div className="lg:col-span-6 space-y-4">
        {/* Dimensions & Orientation */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Modular Dial Geometry & Sizing</span>
            </h3>
            <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded">
              {config.size} × {config.size} PX
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 mb-3">
            {[200, 300, 400].map((sz) => (
              <button
                key={sz}
                onClick={() => setConfig({ ...config, size: sz })}
                className={`py-2 px-3 rounded border text-xs font-mono font-bold cursor-pointer transition-all ${
                  config.size === sz
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {sz}px Pod
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {[
              { id: 'left' as const, label: 'Left Pod', desc: 'Hero on left, pills on right' },
              { id: 'right' as const, label: 'Right Pod', desc: 'Hero on right, pills on left' },
            ].map((ori) => (
              <button
                key={ori.id}
                onClick={() => setConfig({ ...config, orientation: ori.id })}
                className={`p-2.5 rounded border text-left cursor-pointer transition-all ${
                  config.orientation === ori.id
                    ? 'bg-slate-800 border-slate-600 text-slate-100 ring-1 ring-slate-500'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-xs">{ori.label}</div>
                <div className="text-[9px] text-slate-500">{ori.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Glow Color Customization */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Telemetry Slot & Bezel Palette</span>
          </h3>

          <div className="grid grid-cols-5 gap-2">
            {[
              { label: 'Crimson', color: '#ef4444', accent: '#b91c1c' },
              { label: 'Orange', color: '#f97316', accent: '#c2410c' },
              { label: 'Cyan', color: '#06b6d4', accent: '#0e7490' },
              { label: 'Amber', color: '#f59e0b', accent: '#b45309' },
              { label: 'Emerald', color: '#10b981', accent: '#047857' },
            ].map((pal) => (
              <button
                key={pal.label}
                onClick={() => setConfig({ ...config, themeColor: pal.color, accentColor: pal.accent })}
                className={`flex flex-col items-center gap-1.5 p-2 rounded border cursor-pointer transition-all ${
                  config.themeColor === pal.color
                    ? 'bg-slate-800 border-slate-500 ring-1 ring-white/20'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="w-5 h-5 rounded-full" style={{ backgroundColor: pal.color }} />
                <span className="text-[10px] text-slate-300 font-mono">{pal.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between pt-3 border-t border-slate-800">
            <span className="text-xs text-slate-300">Outer Segmented LED Halo Track</span>
            <input
              type="checkbox"
              checked={config.hasOuterLedTrack}
              onChange={(e) => setConfig({ ...config, hasOuterLedTrack: e.target.checked })}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Slot Config Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-400" />
              <span>Integrated Sensor Slot Configuration</span>
            </h3>
            <span className="text-[10px] text-emerald-400 font-mono">6 CUTOUT BAYS</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-300">Top Banner Header:</span>
              <span className="font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded">Component Title Slot</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-300">Central Socket:</span>
              <span className="font-mono text-emerald-400 bg-slate-900 px-2 py-0.5 rounded">Hero Dial / Temp / %</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-300">Triple Stacked Slots:</span>
              <span className="font-mono text-sky-400 bg-slate-900 px-2 py-0.5 rounded">MHz · Fan RPM · Pump RPM</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-300">Bottom Curved Tray:</span>
              <span className="font-mono text-amber-400 bg-slate-900 px-2 py-0.5 rounded">Thermal Diode / SSD Bay</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Live SVG Dial Render & PNG Downloader */}
      <div className="lg:col-span-6 space-y-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 flex flex-col items-center justify-between h-full">
          <div className="w-full flex items-center justify-between mb-3 border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Real-Time Modular Pod Preview
              </span>
            </div>

            <button
              onClick={() => setShowSimulatedText(!showSimulatedText)}
              className={`text-[10px] font-mono flex items-center gap-1.5 px-2.5 py-1 rounded border transition-colors cursor-pointer ${
                showSimulatedText
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showSimulatedText ? 'Simulated Telemetry (ON)' : 'Zero-Text Mode (OFF)'}</span>
            </button>
          </div>

          {/* SVG Pod Canvas Container */}
          <div
            id="svg-dial-container"
            className="w-full flex items-center justify-center p-6 bg-slate-950 border border-slate-800/80 rounded-lg min-h-[340px] shadow-inner relative overflow-hidden"
          >
            {/* Tech grid backdrop */}
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

            {renderDialSvg()}
          </div>

          {/* Export Action Strip */}
          <div className="w-full pt-4 mt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-3">
            <div className="text-[10px] text-slate-500 font-mono">
              Pure Alpha Transparent PNG · 300 DPI
            </div>
            <button
              onClick={handleDownloadPng}
              disabled={isExporting}
              className="w-full sm:w-auto sm:ml-auto px-4 py-2.5 rounded bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Exporting...' : 'Download Transparent PNG'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
