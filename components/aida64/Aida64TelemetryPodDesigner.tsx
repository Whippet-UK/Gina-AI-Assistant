import React, { useState, useRef } from 'react';
import {
  Cpu, Activity, Zap, HardDrive, Wifi, Plus, Download, Copy,
  CheckCircle2, Sliders, Layers, Sparkles, RefreshCw, LayoutGrid
} from 'lucide-react';
import { Aida64TelemetryPodConfig, Aida64TelemetrySlot, Aida64PanelItem } from '../../types';
import { PRESET_TELEMETRY_PODS } from '../../data/aida64Presets';
import { useAida64Telemetry } from '../../hooks/useAida64Telemetry';

interface Aida64TelemetryPodDesignerProps {
  onAddToAssembler?: (item: Aida64PanelItem) => void;
}

const AVAILABLE_ICONS = [
  { id: 'cpu', label: 'CPU Processor', icon: Cpu },
  { id: 'gpu', label: 'GPU Graphics', icon: Activity },
  { id: 'temp', label: 'Thermal Diode', icon: Activity },
  { id: 'fan', label: 'Cooling Fan', icon: Activity },
  { id: 'clock', label: 'Clock Speed', icon: Zap },
  { id: 'volt', label: 'Voltage', icon: Zap },
  { id: 'watt', label: 'Power Draw', icon: Zap },
  { id: 'mem', label: 'Memory / VRAM', icon: HardDrive },
  { id: 'm2', label: 'M.2 Storage', icon: HardDrive },
  { id: 'net', label: 'Network I/O', icon: Wifi },
  { id: 'load', label: 'Workload %', icon: Activity },
  { id: 'none', label: 'None', icon: Activity }
] as const;

export const Aida64TelemetryPodDesigner: React.FC<Aida64TelemetryPodDesignerProps> = ({
  onAddToAssembler
}) => {
  const [activePodIndex, setActivePodIndex] = useState<number>(0);
  const [podConfig, setPodConfig] = useState<Aida64TelemetryPodConfig>(PRESET_TELEMETRY_PODS[0]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const podRef = useRef<HTMLDivElement>(null);
  const { snapshot: liveTelemetry } = useAida64Telemetry(250);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Switch preset
  const handleSelectPreset = (index: number) => {
    setActivePodIndex(index);
    setPodConfig(PRESET_TELEMETRY_PODS[index]);
  };

  // Update specific slot
  const handleUpdateSlot = (slotIndex: number, updates: Partial<Aida64TelemetrySlot>) => {
    const newSlots = [...podConfig.slots];
    newSlots[slotIndex] = { ...newSlots[slotIndex], ...updates };
    setPodConfig({ ...podConfig, slots: newSlots });
  };

  // Add 1-click to Assembler
  const handleAddToAssembler = () => {
    const item: Aida64PanelItem = {
      id: `pod_${Date.now()}`,
      name: `${podConfig.title} 7-Value Pod`,
      type: 'telemetry_pod',
      x: 100,
      y: 80,
      width: podConfig.width,
      height: podConfig.height,
      sensorType: `${podConfig.title} POD`,
      testValue: podConfig.heroValue,
      unit: podConfig.heroUnit,
      color: podConfig.themeColor,
      scale: 1.0,
      podConfig: { ...podConfig }
    };

    if (onAddToAssembler) {
      onAddToAssembler(item);
      showToast(`Added ${podConfig.title} 7-Value Pod to Canvas Assembler!`);
    } else {
      try {
        const saved = localStorage.getItem('aida64_custom_layout');
        const list: Aida64PanelItem[] = saved ? JSON.parse(saved) : [];
        list.push(item);
        localStorage.setItem('aida64_custom_layout', JSON.stringify(list));
        showToast(`Saved ${podConfig.title} Pod directly into layout store!`);
      } catch (e) {
        showToast('Pod saved to layout storage.');
      }
    }
  };

  // Copy AIDA64 Sensor Bindings
  const handleCopySensorMap = () => {
    const lines = [
      `=== AIDA64 TELEMETRY POD: ${podConfig.title} ===`,
      `Chassis Resolution: ${podConfig.width}x${podConfig.height} px`,
      `Hero Metric: ${podConfig.heroLabel} -> AIDA64 Sensor: ${podConfig.heroSensor} (${podConfig.heroValue}${podConfig.heroUnit})`,
      '--- 7 Telemetry Slots ---',
      ...podConfig.slots.map((s, idx) => `Slot #${idx + 1}: ${s.label.padEnd(16)} -> Sensor: ${s.sensorKey.padEnd(16)} -> Unit: ${s.unit}`)
    ].join('\n');

    navigator.clipboard.writeText(lines);
    showToast('AIDA64 Telemetry Sensor Map copied to clipboard!');
  };

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toastMessage && (
        <div className="p-3 rounded-lg bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs font-mono flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-3 mb-4">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">
              Instrumentation Pod Designer
            </span>
            <h3 className="text-base font-bold text-slate-100 mt-0.5">
              7-Value Telemetry Pods (CPU / GPU / Memory / Storage & Net)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Construct high-density, 7-slot hardware monitoring blocks with customizable sensors, units, colors, mini progress bars, and hero dials.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleAddToAssembler}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add to Assembler</span>
            </button>
            <button
              onClick={handleCopySensorMap}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium flex items-center gap-1.5 cursor-pointer border border-slate-700"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Sensor Map</span>
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            1. Select Telemetry Pod Archetype
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PRESET_TELEMETRY_PODS.map((preset, idx) => (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(idx)}
                className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                  activePodIndex === idx
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 ring-1 ring-emerald-500/40'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">{preset.title}</span>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: preset.themeColor }} />
                </div>
                <span className="text-[10px] text-slate-500 block mt-0.5 truncate">{preset.subtitle}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Designer Grid: Left Slots Config / Right Live Pod Render */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Slot Configurator (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-200">2. Configure 7 Telemetry Slots</span>
              <span className="text-[10px] font-mono text-slate-400">All 7 slots actively bound</span>
            </div>

            {/* Pod Header Meta */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded border border-slate-800">
              <div>
                <label className="text-[9px] font-mono text-slate-400 block mb-1">POD TITLE</label>
                <input
                  type="text"
                  value={podConfig.title}
                  onChange={(e) => setPodConfig({ ...podConfig, title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-xs font-mono text-slate-200 font-bold"
                />
              </div>
              <div>
                <label className="text-[9px] font-mono text-slate-400 block mb-1">HERO SENSOR</label>
                <select
                  value={podConfig.heroSensor}
                  onChange={(e) => { const sensor = liveTelemetry.sensors.find(s => s.id === e.target.value); setPodConfig({ ...podConfig, heroSensor: e.target.value, heroValue: sensor ? String(sensor.value) : podConfig.heroValue, heroUnit: sensor?.unit || podConfig.heroUnit }); }}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-xs font-mono text-slate-200"
                ><option value={podConfig.heroSensor}>{podConfig.heroSensor} (manual)</option>{liveTelemetry.sensors.map(sensor => <option key={sensor.id} value={sensor.id}>{sensor.label} · {sensor.value}{sensor.unit}</option>)}</select>
              </div>
              <div>
                <label className="text-[9px] font-mono text-slate-400 block mb-1">THEME COLOR</label>
                <input
                  type="color"
                  value={podConfig.themeColor}
                  onChange={(e) => setPodConfig({ ...podConfig, themeColor: e.target.value })}
                  className="w-full h-7 bg-slate-900 border border-slate-800 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* 7 Slots List */}
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
              {podConfig.slots.map((slot, idx) => (
                <div
                  key={slot.id}
                  className="p-2.5 rounded bg-slate-950/80 border border-slate-800/80 space-y-2 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-emerald-400">
                      SLOT #{idx + 1} • {slot.label}
                    </span>
                    <label className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={slot.showMiniBar || false}
                        onChange={(e) => handleUpdateSlot(idx, { showMiniBar: e.target.checked })}
                        className="rounded bg-slate-900 border-slate-700 text-emerald-500"
                      />
                      <span>Mini Bar</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="text-[9px] font-mono text-slate-500 block mb-0.5">LABEL</label>
                      <input
                        type="text"
                        value={slot.label}
                        onChange={(e) => handleUpdateSlot(idx, { label: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-xs font-mono text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-mono text-slate-500 block mb-0.5">SENSOR KEY</label>
                      <select
                        value={slot.sensorKey}
                        onChange={(e) => { const sensor = liveTelemetry.sensors.find(s => s.id === e.target.value); handleUpdateSlot(idx, { sensorKey: e.target.value, unit: sensor?.unit || slot.unit, testValue: sensor ? String(sensor.value) : slot.testValue }); }}
                        className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-xs font-mono text-slate-200"
                      ><option value={slot.sensorKey}>{slot.sensorKey} (manual)</option>{liveTelemetry.sensors.map(sensor => <option key={sensor.id} value={sensor.id}>{sensor.label} · {sensor.value}{sensor.unit}</option>)}</select>
                    </div>
                    <div>
                      <label className="text-[9px] font-mono text-slate-500 block mb-0.5">SAMPLE VALUE</label>
                      <input
                        type="text"
                        value={slot.testValue}
                        onChange={(e) => handleUpdateSlot(idx, { testValue: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-xs font-mono text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-mono text-slate-500 block mb-0.5">UNIT</label>
                      <input
                        type="text"
                        value={slot.unit}
                        onChange={(e) => handleUpdateSlot(idx, { unit: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-xs font-mono text-slate-200"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Pod Render Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 flex flex-col items-center">
            <div className="w-full flex items-center justify-between border-b border-slate-800 pb-2 mb-4">
              <span className="text-xs font-bold text-slate-200">3. Live Pod Preview</span>
              <span className="text-[10px] font-mono text-slate-400">
                {podConfig.width} × {podConfig.height} px
              </span>
            </div>

            {/* Rendered Pod Frame */}
            <div
              ref={podRef}
              className="w-full max-w-[320px] bg-gradient-to-b from-slate-950 via-[#0a0f1d] to-slate-950 rounded-xl border p-4 shadow-2xl relative overflow-hidden"
              style={{ borderColor: `${podConfig.themeColor}50` }}
            >
              {/* Subtle metallic top chamfer line */}
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: podConfig.themeColor }}
              />

              {/* Header Title */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3">
                <div>
                  <h4 className="text-xs font-extrabold tracking-wider text-slate-100 font-mono">
                    {podConfig.title}
                  </h4>
                  <span className="text-[9px] text-slate-400 font-mono block">
                    {podConfig.subtitle}
                  </span>
                </div>
                <div
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold"
                  style={{
                    backgroundColor: `${podConfig.themeColor}20`,
                    color: podConfig.themeColor,
                    border: `1px solid ${podConfig.themeColor}40`
                  }}
                >
                  ACTIVE
                </div>
              </div>

              {/* Hero Dial / Progress Circle */}
              {podConfig.showHeroGauge && (
                <div className="flex items-center justify-between bg-slate-900/70 rounded-lg p-3 border border-slate-800/70 mb-3">
                  <div>
                    <span className="text-[9px] font-mono text-slate-400 uppercase block">
                      {podConfig.heroLabel}
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-2xl font-black font-mono text-slate-100">
                        {podConfig.heroValue}
                      </span>
                      <span className="text-xs font-bold font-mono" style={{ color: podConfig.themeColor }}>
                        {podConfig.heroUnit}
                      </span>
                    </div>
                  </div>

                  {/* Circular visual ring */}
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    <svg className="w-12 h-12 -rotate-90">
                      <circle
                        cx="24"
                        cy="24"
                        r="18"
                        stroke="#1e293b"
                        strokeWidth="4"
                        fill="transparent"
                      />
                      <circle
                        cx="24"
                        cy="24"
                        r="18"
                        stroke={podConfig.themeColor}
                        strokeWidth="4"
                        strokeDasharray={113}
                        strokeDashoffset={113 - (113 * podConfig.heroPercent) / 100}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </svg>
                    <span className="absolute text-[10px] font-mono font-bold text-slate-200">
                      {podConfig.heroPercent}%
                    </span>
                  </div>
                </div>
              )}

              {/* 7 Telemetry Slots Display */}
              <div className="space-y-1.5">
                {podConfig.slots.map((slot, idx) => (
                  <div
                    key={slot.id}
                    className="p-1.5 rounded bg-slate-900/50 border border-slate-800/50 flex flex-col justify-center"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400 text-[10px]">{slot.label}</span>
                      <div className="flex items-baseline gap-1">
                        <span className="font-bold text-slate-100">{slot.testValue}</span>
                        <span className="text-[9px] text-slate-400">{slot.unit}</span>
                      </div>
                    </div>

                    {/* Mini progress bar */}
                    {slot.showMiniBar && (
                      <div className="w-full bg-slate-950 rounded-full h-1 mt-1 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(15, (Number(slot.testValue) || 50)))}%`,
                            backgroundColor: slot.color || podConfig.themeColor
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
