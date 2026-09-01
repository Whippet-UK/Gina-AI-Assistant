import React, { useMemo, useState } from 'react';
import { Activity, CheckCircle2, Copy, Fan, Gauge, Plus, Thermometer, Zap } from 'lucide-react';
import { AIDA64_SCREEN_PRESETS } from '../../data/aida64Presets';
import { Aida64PanelItem, Aida64ScreenPreset } from '../../types';

interface Aida64SensorTemplateGeneratorProps {
  onAddToAssembler: (item: Aida64PanelItem) => void;
}

/**
 * Engineering template generator for the four core AIDA64 monitoring groups.
 * The generated objects are deliberately clean cavities: no baked labels,
 * numbers or sample telemetry. Sensor identity lives in metadata so the
 * assembler can be positioned with exact X/Y values and later bound to AIDA64.
 */
const SENSOR_GROUPS = [
  {
    id: 'temperature',
    label: 'TEMPERATURE',
    icon: Thermometer,
    color: '#ef4444',
    sensors: [
      ['CPU Package', '°C'],
      ...Array.from({ length: 16 }, (_, i) => [`CPU Core ${i + 1}`, '°C'] as [string, string]),
      ['GPU Core', '°C'],
      ['GPU Hot Spot', '°C'],
      ['GPU VRAM / Memory', '°C'],
      ['Motherboard Chipset', '°C'],
      ['Motherboard VRM', '°C'],
      ['Storage Drive 1', '°C'],
      ['Storage Drive 2', '°C'],
      ['Storage Drive 3', '°C'],
    ]
  },
  {
    id: 'voltage',
    label: 'VOLTAGE',
    icon: Zap,
    color: '#f59e0b',
    sensors: [
      ['CPU Vcore', 'V'],
      ['+12V Rail', 'V'],
      ['+5V Rail', 'V'],
      ['+3.3V Rail', 'V'],
      ['GPU VDDC', 'V'],
    ]
  },
  {
    id: 'cooling',
    label: 'COOLING / FANS',
    icon: Fan,
    color: '#06b6d4',
    sensors: [
      ['CPU_FAN', 'RPM'],
      ['AIO / PUMP', 'RPM'],
      ['GPU Fans', 'RPM'],
      ['CHASSIS / SYS Fans', 'RPM'],
    ]
  },
  {
    id: 'power',
    label: 'POWER / UTILISATION',
    icon: Gauge,
    color: '#10b981',
    sensors: [
      ['CPU Power', 'W'],
      ['GPU Power', 'W'],
      ['CPU Utilisation', '%'],
      ['GPU Utilisation', '%'],
    ]
  }
] as const;

const flattenSensors = () => SENSOR_GROUPS.flatMap(group =>
  group.sensors.map(([name, unit]) => ({ group: group.id, groupLabel: group.label, name, unit, color: group.color }))
);

const makeBlankItems = (preset: Aida64ScreenPreset): Aida64PanelItem[] => {
  const sensors = flattenSensors();
  const columns = preset.width >= 1600 ? 8 : preset.width >= 1000 ? 6 : preset.width >= 800 ? 4 : 3;
  const gap = Math.max(10, Math.round(preset.width * 0.012));
  const marginX = Math.max(18, Math.round(preset.width * 0.025));
  const top = Math.max(18, Math.round(preset.height * 0.06));
  const availableWidth = preset.width - marginX * 2 - gap * (columns - 1);
  const slotWidth = Math.floor(availableWidth / columns);
  const rows = Math.ceil(sensors.length / columns);
  const rowGap = Math.max(10, Math.round(preset.height * 0.018));
  const slotHeight = Math.max(44, Math.min(72, Math.floor((preset.height - top - 22 - rowGap * (rows - 1)) / rows)));

  return sensors.map((sensor, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    return {
      id: `sensor_template_${sensor.group}_${index}_${Date.now()}`,
      name: `${sensor.groupLabel}: ${sensor.name}`,
      type: 'value_box',
      x: marginX + col * (slotWidth + gap),
      y: top + row * (slotHeight + rowGap),
      width: slotWidth,
      height: slotHeight,
      sensorType: sensor.name,
      testValue: '',
      unit: sensor.unit,
      color: sensor.color,
      scale: 1,
      bgColor: '#020617',
      borderColor: sensor.color,
      opacity: 1,
      zIndex: 10,
      fontSize: 16,
      textAlign: 'center',
      renderMode: 'clean_cavity',
      isPlaceholderMask: true,
      locked: false,
      aspectRatioLocked: false
    };
  });
};

export const Aida64SensorTemplateGenerator: React.FC<Aida64SensorTemplateGeneratorProps> = ({
  onAddToAssembler
}) => {
  const [preset, setPreset] = useState<Aida64ScreenPreset>(AIDA64_SCREEN_PRESETS[0]);
  const [includeHeadings, setIncludeHeadings] = useState(false);
  const [copied, setCopied] = useState(false);

  const sensors = useMemo(flattenSensors, []);

  const templatePrompt = useMemo(() => {
    const groupText = SENSOR_GROUPS.map(g =>
      `${g.label}: ${g.sensors.map(s => s[0]).join(', ')}`
    ).join('; ');
    return [
      `ENGINEERING-GRADE BLANK AIDA64 SENSOR PANEL TEMPLATE.`,
      `CANVAS: EXACTLY ${preset.width}x${preset.height}px.`,
      `Create only a physical chassis/backplate with precisely positioned empty sensor cavities for the four required monitoring groups.`,
      `REQUIRED GROUPS: ${groupText}.`,
      `Every sensor cavity is a blank dark recessed socket with no text, no numbers, no units, no logos and no sample telemetry.`,
      `Do not invent extra gauges, readouts, widgets or screens. Do not add decorative telemetry.`,
      `Preserve the exact canvas aspect ratio and leave each cavity empty so AIDA64 can provide the live value later.`,
      `The result is a reusable background/template, not a finished dashboard.`
    ].join(' ');
  }, [preset]);

  const handleBuild = () => {
    const items = makeBlankItems(preset);
    items.forEach(item => onAddToAssembler(item));
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(templatePrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="space-y-5">
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-[10px] uppercase tracking-[0.2em] font-bold">
              <Activity className="w-4 h-4" />
              Engineering Sensor Template
            </div>
            <h3 className="text-lg font-bold text-slate-100 mt-1">
              Full Hardware Safety Monitor — Blank Template
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Generates clean, empty sensor cavities for Temperature, Voltage, Cooling/Fans and Power/Utilisation.
              No sample numbers or labels are baked into the visual template. Position and bind the live AIDA64 values later in Assembler Pro.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-2 rounded bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy AI Template Prompt'}
            </button>
            <button
              onClick={handleBuild}
              className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Build Blank Template
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {AIDA64_SCREEN_PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => setPreset(p)}
              className={`p-2 rounded border text-left ${preset.id === p.id
                ? 'border-emerald-400 bg-emerald-500/10'
                : 'border-slate-800 bg-slate-950/60'}`}
            >
              <div className="text-xs font-mono font-bold text-slate-200">{p.label}</div>
              <div className="text-[9px] text-slate-500 mt-1">{p.category}</div>
            </button>
          ))}
        </div>

        <label className="mt-4 flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={includeHeadings}
            onChange={e => setIncludeHeadings(e.target.checked)}
          />
          Optional category headings (off = completely text-free template)
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SENSOR_GROUPS.map(group => {
          const Icon = group.icon;
          return (
            <div key={group.id} className="bg-slate-900/80 border border-slate-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-4 h-4" style={{ color: group.color }} />
                <span className="text-xs font-bold text-slate-200">{group.label}</span>
                <span className="ml-auto text-[10px] font-mono text-slate-500">{group.sensors.length} slots</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {group.sensors.map(([name, unit]) => (
                  <div key={name} className="px-2 py-1.5 rounded bg-slate-950 border border-slate-800 text-[10px]">
                    <span className="text-slate-300">{name}</span>
                    <span className="float-right font-mono text-slate-600">{unit}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">
          AIDA64 binding workflow
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-[10px] font-mono">
          <div className="p-2 rounded bg-slate-900 border border-slate-800">1. Build blank template</div>
          <div className="p-2 rounded bg-slate-900 border border-slate-800">2. Open Assembler Pro</div>
          <div className="p-2 rounded bg-slate-900 border border-slate-800">3. Set X / Y + W / H</div>
          <div className="p-2 rounded bg-slate-900 border border-slate-800">4. Bind AIDA64 sensor values</div>
        </div>
        <div className="mt-2 text-[10px] text-slate-500">
          {sensors.length} sensor cavities are generated. The visual layer is intentionally empty; sensor names and units remain metadata for precise AIDA64 implementation.
        </div>
      </div>
    </div>
  );
};
