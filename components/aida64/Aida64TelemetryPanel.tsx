import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock, Cpu, HardDrive, LayoutGrid, Monitor, RefreshCw, Search, ShieldCheck, Waves, Wifi, WifiOff, Zap } from 'lucide-react';
import { Aida64SensorBinding } from '../../types';
import { Aida64SensorReading, defaultAida64Binding, normaliseAida64Value, useAida64Telemetry } from '../../hooks/useAida64Telemetry';

const STORAGE_KEY = 'aida64_sensor_bindings';

const category = (sensor: Aida64SensorReading) => {
  const text = `${sensor.id} ${sensor.label}`.toLowerCase();
  if (text.includes('gpu') || text.includes('graphics') || text.includes('geforce') || text.includes('radeon')) return 'GPU';
  if (text.includes('cpu') || text.includes('core') || text.includes('processor') || text.includes('ryzen')) return 'CPU';
  if (text.includes('memory') || text.includes('ram') || text.includes('vram')) return 'MEMORY';
  if (text.includes('fan') || text.includes('pump') || text.includes('rpm') || text.includes('cooler')) return 'COOLING';
  if (text.includes('network') || text.includes('download') || text.includes('upload') || text.includes('nic')) return 'NETWORK';
  if (text.includes('drive') || text.includes('disk') || text.match(/\b[c-z]:/)) return 'STORAGE';
  if (text.includes('volt') || text.includes('vcore') || text.includes('motherboard')) return 'MOTHERBOARD';
  if (text.includes('date') || text.includes('time') || text.includes('year') || text.includes('month') || text.includes('day') || text.includes('uptime') || sensor.kind === 'sys') return 'SYSTEM';
  return 'OTHER';
};

const getCategoryIcon = (cat: string) => {
  switch (cat) {
    case 'GPU': return Monitor;
    case 'CPU': return Cpu;
    case 'MEMORY': return LayoutGrid;
    case 'COOLING': return Waves;
    case 'STORAGE': return HardDrive;
    case 'NETWORK': return Wifi;
    case 'MOTHERBOARD': return Zap;
    case 'SYSTEM': return Clock;
    default: return Activity;
  }
};

export const Aida64TelemetryPanel: React.FC = () => {
  const [intervalMs, setIntervalMs] = useState(1000);
  const { snapshot, sensors, hardware, isScanning, scanAndRefresh } = useAida64Telemetry(intervalMs);
  const [query, setQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [binding, setBinding] = useState<Aida64SensorBinding>(defaultAida64Binding());
  const [saved, setSaved] = useState<Record<string, Aida64SensorBinding>>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
  });
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const selectedSensor = sensors.find(sensor => sensor.id === selectedId);

  useEffect(() => {
    if (!selectedSensor) return;
    setBinding(saved[selectedSensor.id] || defaultAida64Binding(selectedSensor));
  }, [selectedId, selectedSensor, saved]);

  const filtered = useMemo(() => sensors.filter(sensor => {
    const q = query.toLowerCase().trim();
    const matchesQuery = !q || `${sensor.id} ${sensor.label} ${sensor.unit} ${sensor.kind}`.toLowerCase().includes(q);
    const matchesCat = !activeCategoryFilter || category(sensor) === activeCategoryFilter;
    return matchesQuery && matchesCat;
  }), [query, sensors, activeCategoryFilter]);

  const grouped = useMemo(() => filtered.reduce<Record<string, Aida64SensorReading[]>>((acc, sensor) => {
    const key = category(sensor); (acc[key] ||= []).push(sensor); return acc;
  }, {}), [filtered]);

  const saveBinding = () => {
    if (!binding.sensorId) return;
    const next = { ...saved, [binding.sensorId]: binding };
    setSaved(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const handleScanAndRefresh = async () => {
    setScanMessage('Scanning AIDA64 shared memory and hardware registers…');
    try {
      const snap = await scanAndRefresh();
      const count = snap?.sensorCount || 0;
      const hwCount = snap?.hardware?.length || 0;
      setScanMessage(`Scan complete: ${count} active sensor${count === 1 ? '' : 's'} detected across ${hwCount} hardware group${hwCount === 1 ? '' : 's'}.`);
      setTimeout(() => setScanMessage(null), 4000);
    } catch (err: any) {
      setScanMessage(`Scan error: ${err?.message || 'Failed to scan'}`);
      setTimeout(() => setScanMessage(null), 5000);
    }
  };

  const updateConfig = async (next: number) => {
    setIntervalMs(next);
    await fetch('/api/aida64/telemetry/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ intervalMs: next }) });
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Control Center */}
      <section className="bg-slate-900/90 border border-slate-800 rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-bold">Hardware Telemetry Bus</span>
              <span className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[9px] font-mono px-1.5 py-0.2 rounded font-bold">
                {snapshot.source.toUpperCase()}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-100 mt-1">AIDA64 Telemetry & Sensor Bridge</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live hardware sensors from AIDA64 Shared Memory, Windows Registry, or local hardware counters for gauges, pods and dials.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleScanAndRefresh}
              disabled={isScanning}
              className="px-3 py-2 rounded border border-emerald-500/40 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
              title="Scan and re-enumerate all AIDA64 sensors and hardware"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-emerald-400' : ''}`} />
              {isScanning ? 'Scanning Sensors…' : 'Scan & Refresh'}
            </button>
            <div className={`px-3 py-2 rounded border text-xs font-mono flex items-center gap-2 ${snapshot.connected ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-amber-950/30 border-amber-500/30 text-amber-300'}`}>
              {snapshot.connected ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <WifiOff className="w-4 h-4 text-amber-400" />}
              {snapshot.connected ? 'BRIDGE ACTIVE' : 'AIDA64 DISCONNECTED'}
            </div>
          </div>
        </div>

        {scanMessage && (
          <div className="mt-3 px-3 py-2 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{scanMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mt-4">
          <Metric label="Active Sensors" value={String(snapshot.sensorCount)} />
          <Metric label="Hardware Devices" value={String(hardware.length || (snapshot.connected ? 1 : 0))} />
          <Metric label="Data Source" value={snapshot.source} />
          <Metric label="Update Rate" value={`${snapshot.updateRateHz} Hz`} />
          <Metric label="Bus Latency" value={`${snapshot.latencyMs} ms`} />
          <label className="bg-slate-950 border border-slate-800 rounded p-2 text-[9px] text-slate-500">
            UI POLL INTERVAL
            <select value={intervalMs} onChange={e => updateConfig(Number(e.target.value))} className="block mt-1 w-full bg-slate-900 border border-slate-800 rounded p-1 text-[10px] text-slate-200">
              {[100, 250, 500, 1000].map(v => <option key={v} value={v}>{v} ms</option>)}
            </select>
          </label>
        </div>

        {/* Detected Hardware Summary Cards */}
        {hardware.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Detected Hardware Devices ({hardware.length})</span>
              {activeCategoryFilter && (
                <button
                  onClick={() => setActiveCategoryFilter(null)}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 underline font-mono cursor-pointer"
                >
                  Clear Category Filter
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {hardware.map(hw => {
                const Icon = getCategoryIcon(hw.category);
                const isSelected = activeCategoryFilter === hw.category;
                return (
                  <button
                    key={hw.id}
                    onClick={() => setActiveCategoryFilter(isSelected ? null : hw.category)}
                    className={`p-2.5 rounded border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-400 ring-1 ring-emerald-500/50'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-emerald-400 font-bold">
                        {hw.sensorCount}
                      </span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-200 truncate mt-1.5">{hw.name}</div>
                    <div className="text-[9px] text-slate-500 uppercase">{hw.category}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!snapshot.connected && (
          <div className="mt-4 p-3 rounded bg-amber-950/20 border border-amber-500/30 text-xs text-amber-200 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <div className="font-semibold text-amber-300">AIDA64 shared memory not detected</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{snapshot.error || 'AIDA64 shared memory reader is waiting for active AIDA64 instances.'}</div>
              </div>
            </div>
            <div className="text-[11px] text-slate-300 pl-6 space-y-1 mt-2 bg-slate-950/70 p-3 rounded border border-slate-800">
              <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> 3-Step Setup Checklist:
              </div>
              <div>1. Open <strong className="text-slate-100">AIDA64 Extreme / Engineer</strong> on Windows.</div>
              <div>2. Go to <strong className="text-slate-100">File ➔ Preferences</strong> (or press <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-[10px]">Shift+F8</kbd>).</div>
              <div>3. In the left navigation, click <strong className="text-slate-100">External Applications</strong>.</div>
              <div>4. Check <strong className="text-emerald-400">"Enable shared memory"</strong> and check <strong className="text-emerald-400">"Enable Writing to Registry"</strong>.</div>
              <div>5. Click <strong className="text-slate-100">Apply & OK</strong>, keep AIDA64 running, then click <strong className="text-emerald-300">"Scan & Refresh"</strong> above.</div>
            </div>
          </div>
        )}
      </section>

      {/* Sensor Browser & Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <section className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-200">
              Sensor Browser {activeCategoryFilter && <span className="text-emerald-400">({activeCategoryFilter})</span>}
            </span>
            <span className="text-[9px] text-slate-500">{filtered.length} of {sensors.length} sensors</span>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search sensor name, ID (e.g. TCPU, GPU, RAM)…"
              className="w-full pl-8 pr-3 bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-200 placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div className="max-h-[560px] overflow-y-auto space-y-3 pr-1">
            {(Object.entries(grouped) as [string, Aida64SensorReading[]][]).map(([group, groupSensors]) => (
              <div key={group} className="space-y-1">
                <div className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center justify-between px-1">
                  <span>{group}</span>
                  <span className="text-slate-600">{groupSensors.length}</span>
                </div>
                {groupSensors.map(sensor => (
                  <button
                    key={sensor.id}
                    onClick={() => setSelectedId(sensor.id)}
                    className={`w-full text-left p-2 rounded border transition-all cursor-pointer ${
                      selectedId === sensor.id
                        ? 'border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/30'
                        : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-[11px] font-medium text-slate-200 truncate">{sensor.label}</span>
                      <span className="text-[11px] font-mono text-emerald-300 font-bold shrink-0">
                        {sensor.value} {sensor.unit}
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-500 mt-0.5 flex items-center justify-between">
                      <span className="font-mono">{sensor.id}</span>
                      <span className="capitalize">{sensor.kind}</span>
                    </div>
                  </button>
                ))}
              </div>
            ))}
            {!filtered.length && (
              <div className="py-12 text-center text-slate-500 text-xs">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No matching sensors found. Try clicking "Scan & Refresh" above.
              </div>
            )}
          </div>
        </section>

        <section className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-lg p-4">
          {selectedSensor ? (
            <>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Selected Live Sensor</div>
                  <div className="text-base font-bold text-slate-100 mt-0.5">{selectedSensor.label}</div>
                  <div className="text-[10px] text-slate-400 font-mono">ID: {selectedSensor.id} · Type: {selectedSensor.kind}</div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-2xl font-bold text-emerald-300">{selectedSensor.value} {selectedSensor.unit}</div>
                  <div className="text-[9px] text-slate-500">RAW: {selectedSensor.rawValue}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="MIN" value={binding.min} onChange={v => setBinding({ ...binding, min: typeof v === 'number' ? v : 0 })} />
                <Field label="MAX" value={binding.max} onChange={v => setBinding({ ...binding, max: typeof v === 'number' ? v : 100 })} />
                <Field label="WARNING THRESHOLD" value={binding.warning ?? ''} onChange={v => setBinding({ ...binding, warning: v === '' ? undefined : Number(v) })} />
                <Field label="CRITICAL THRESHOLD" value={binding.critical ?? ''} onChange={v => setBinding({ ...binding, critical: v === '' ? undefined : Number(v) })} />
                <Field label="SMOOTHING (MS)" value={binding.smoothingMs} onChange={v => setBinding({ ...binding, smoothingMs: typeof v === 'number' ? v : 0 })} />
                <Field label="STALE TIMEOUT (MS)" value={binding.staleTimeoutMs} onChange={v => setBinding({ ...binding, staleTimeoutMs: typeof v === 'number' ? v : 0 })} />
                <Field label="PEAK DECAY (MS)" value={binding.peakDecayMs} onChange={v => setBinding({ ...binding, peakDecayMs: typeof v === 'number' ? v : 0 })} />
                <label className="text-[9px] text-slate-500">
                  NORMALISATION
                  <select
                    value={binding.normalisation}
                    onChange={e => setBinding({ ...binding, normalisation: e.target.value as 'linear' | 'inverse' })}
                    className="mt-1 w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-200"
                  >
                    <option value="linear">Linear (0 ➔ 100%)</option>
                    <option value="inverse">Inverse (100 ➔ 0%)</option>
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap gap-3 mt-4">
                <label className="text-xs text-slate-300 flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={binding.peakHold} onChange={e => setBinding({ ...binding, peakHold: e.target.checked })} />
                  Enable Peak Hold Indicator
                </label>
              </div>
              <div className="mt-4 p-3 bg-slate-950 border border-slate-800 rounded-lg">
                <div className="text-[9px] uppercase tracking-wider text-slate-500 mb-2 font-bold">Normalised Gauge Output</div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-sky-400 transition-all duration-200"
                      style={{ width: `${Math.min(100, Math.max(0, normaliseAida64Value(selectedSensor.value, binding)))}%` }}
                    />
                  </div>
                  <span className="font-mono text-sm text-emerald-300 font-bold min-w-[50px] text-right">
                    {normaliseAida64Value(selectedSensor.value, binding)}%
                  </span>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={saveBinding} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-xs font-bold text-white transition-colors cursor-pointer">
                  Save Sensor Binding
                </button>
                <button onClick={() => setBinding(defaultAida64Binding(selectedSensor))} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300 transition-colors cursor-pointer">
                  Reset
                </button>
              </div>
            </>
          ) : (
            <div className="py-28 text-center text-slate-500">
              <Activity className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <div className="text-xs font-semibold text-slate-400">Select any sensor on the left to calibrate min/max bounds and bindings.</div>
              <div className="text-[11px] text-slate-600 mt-1">Bindings map live readings to 0–100% ranges for state gauges, bars and dials.</div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-slate-950 border border-slate-800 rounded p-2">
    <div className="text-[8px] uppercase tracking-wider text-slate-500">{label}</div>
    <div className="text-[11px] font-mono text-slate-200 mt-1 truncate font-bold">{value}</div>
  </div>
);

const Field = ({ label, value, onChange }: { label: string; value: number | string; onChange: (value: number | '') => void }) => (
  <label className="text-[9px] text-slate-500">
    {label}
    <input
      type="number"
      value={value}
      onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      className="mt-1 w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-200 font-mono"
    />
  </label>
);
