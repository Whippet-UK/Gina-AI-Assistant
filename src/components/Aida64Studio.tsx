import React, { useState } from 'react';
import { Monitor, Gauge, Sliders, Layers, Download, CheckCircle2, LayoutGrid, ExternalLink, Activity, RefreshCw, Cpu, HardDrive, Zap, WifiOff } from 'lucide-react';
import { Aida64ChassisGenerator } from './aida64/Aida64ChassisGenerator';
import { Aida64DialDesigner } from './aida64/Aida64DialDesigner';
import { Aida64StateGaugeGenerator } from './aida64/Aida64StateGaugeGenerator';
import { Aida64TelemetryPodDesigner } from './aida64/Aida64TelemetryPodDesigner';
import { Aida64LayoutMapper } from './aida64/Aida64LayoutMapper';
import { Aida64TelemetryPanel } from './aida64/Aida64TelemetryPanel';
import { useAida64Telemetry } from '../hooks/useAida64Telemetry';
import { Aida64CanvasAssembler } from './aida64/Aida64CanvasAssembler';
import { SystemTelemetry, Aida64PanelItem } from '../types';
import { useProjectState } from '../context/ProjectStateContext';

interface Aida64StudioProps {
  telemetry?: SystemTelemetry;
  onSendToPromptStudio: (prompt: string, width: number, height: number) => void;
}

export const Aida64Studio: React.FC<Aida64StudioProps> = ({ telemetry, onSendToPromptStudio }) => {
  const { projectState, updatePromptStudio } = useProjectState();
  const { snapshot: aida64TelemetrySnapshot, hardware, isScanning, scanAndRefresh } = useAida64Telemetry(1000);
  const [activeTab, setActiveTab] = useState<'chassis' | 'telemetry' | 'dials' | 'gauges' | 'pods' | 'assembler' | 'aiLayout'>('chassis');
  const [currentBgUrl, setCurrentBgUrl] = useState<string | undefined>();
  const [currentResolution, setCurrentResolution] = useState({ width: 1024, height: 600 });
  const [notification, setNotification] = useState<string | null>(null);
  const [injectedItem, setInjectedItem] = useState<Aida64PanelItem | null>(null);
  const [aiPromptStaged, setAiPromptStaged] = useState(false);

  const showToast = (msg: string) => {
    setNotification(msg);
    window.setTimeout(() => setNotification(null), 3500);
  };

  const handleScanAndRefresh = async () => {
    try {
      const snap = await scanAndRefresh();
      const count = snap?.sensorCount || 0;
      const hwCount = snap?.hardware?.length || 0;
      showToast(`Scan complete: ${count} AIDA64 sensors detected across ${hwCount} hardware groups.`);
    } catch (err: any) {
      showToast(`Scan error: ${err?.message || 'Failed to scan AIDA64 sensors'}`);
    }
  };

  // AIDA64 owns the workflow. This callback only stages the prompt and resolution;
  // it never changes the application workspace. Create Studio is an explicit action.
  const handleSendPrompt = (prompt: string, width: number, height: number) => {
    try {
      const safeWidth = Math.max(64, Math.min(8192, Math.round(Number(width) || 1024)));
      const safeHeight = Math.max(64, Math.min(8192, Math.round(Number(height) || 600)));
      const safePrompt = typeof prompt === 'string' ? prompt.trim() : '';
      if (!safePrompt) {
        showToast('Cannot stage an empty AIDA64 AI prompt.');
        return;
      }

      const ratio = safeWidth === safeHeight ? '1:1' : safeHeight > safeWidth ? '9:16' : '16:9';
      updatePromptStudio({ promptInput: safePrompt, aspectRatio: ratio, stylePreset: 'None' });
      setCurrentResolution({ width: safeWidth, height: safeHeight });
      setAiPromptStaged(true);
      showToast(`AI chassis prompt staged for ${safeWidth}×${safeHeight}. AIDA64 Studio remains open.`);
    } catch (error: any) {
      console.error('[AIDA64] Failed to stage AI prompt:', error);
      showToast(`AIDA64 prompt staging failed: ${error?.message || 'unknown error'}`);
    }
  };

  const openCreateWithStagedPrompt = () => {
    try {
      const prompt = projectState.promptStudio.promptInput?.trim();
      if (!prompt) {
        showToast('Stage an AI chassis prompt first.');
        return;
      }
      onSendToPromptStudio(prompt, currentResolution.width, currentResolution.height);
    } catch (error: any) {
      console.error('[AIDA64] Create Studio handoff failed:', error);
      showToast(`Create Studio handoff failed: ${error?.message || 'unknown error'}`);
    }
  };

  const handleInjectIntoAssembler = (item: Aida64PanelItem) => {
    setInjectedItem(item);
    setActiveTab('assembler');
    showToast(`Injected "${item.name}" directly into Canvas Assembler!`);
  };

  const tabs = [
    { id: 'chassis' as const, label: '1. Chassis Backplates', icon: Monitor, desc: 'Zero-text backgrounds and screen presets' },
    { id: 'telemetry' as const, label: '2. Live Telemetry', icon: Activity, desc: 'AIDA64 shared-memory sensors, bindings and calibration' },
    { id: 'gauges' as const, label: '3. Gauge Factory', icon: Gauge, desc: '27 gauge styles, advanced lighting, scale and 100-state export' },
    { id: 'pods' as const, label: '4. 7-Value Pods', icon: LayoutGrid, desc: 'CPU, GPU, memory and storage telemetry' },
    { id: 'dials' as const, label: '5. Modular Dials', icon: Sliders, desc: 'Circular dial and telemetry element designer' },
    { id: 'assembler' as const, label: '6. Assembler Pro', icon: Layers, desc: 'Drag, resize, px input, scale and alignment' },
    { id: 'aiLayout' as const, label: '7. AI Layout Compiler', icon: Download, desc: 'Spatial prompt, mask and chassis tools' },
  ];

  return (
    <div className="space-y-5">
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.25em] text-emerald-400 font-bold">Hardware Monitoring Suite</span>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">AIDA64 WORKSPACE</span>
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                aida64TelemetrySnapshot.connected
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
              }`}>
                {aida64TelemetrySnapshot.connected ? `${aida64TelemetrySnapshot.sensorCount} SENSORS` : 'DISCONNECTED'}
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-100 mt-1">AIDA64 Sensor Panel Studio Pro</h2>
            <p className="text-xs text-slate-400 mt-0.5">Build the complete sensor panel here: chassis, gauges, telemetry pods, dials and exact-pixel assembly.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleScanAndRefresh}
              disabled={isScanning}
              className="px-3 py-1.5 rounded border border-emerald-500/40 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
              title="Scan and re-enumerate all AIDA64 sensors and connected hardware"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-emerald-400' : ''}`} />
              {isScanning ? 'Scanning Hardware…' : 'Scan & Refresh'}
            </button>
            <div className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-right font-mono text-[10px]">
              <span className="text-slate-500 block">TARGET GPU</span>
              <span className="text-emerald-400 font-bold">RTX 3070 Ti · 8GB</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-right font-mono text-[10px]">
              <span className="text-slate-500 block">CANVAS</span>
              <span className="text-sky-400 font-bold">{currentResolution.width}×{currentResolution.height}</span>
            </div>
          </div>
        </div>

        {/* Detected Hardware Status Bar */}
        {hardware.length > 0 && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-slate-950/70 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mr-1">Detected Hardware:</span>
              {hardware.map(hw => (
                <button
                  key={hw.id}
                  onClick={() => setActiveTab('telemetry')}
                  className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-300 text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
                  title={`${hw.name} (${hw.sensorCount} sensors) - click to view in Telemetry`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>{hw.name}</span>
                  <span className="text-emerald-400/80 text-[9px]">({hw.sensorCount})</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setActiveTab('telemetry')}
              className="text-[10px] text-emerald-400 hover:text-emerald-300 font-mono font-medium underline cursor-pointer"
            >
              Open Sensor Inspector ➔
            </button>
          </div>
        )}

        {aiPromptStaged && (
          <div className="mb-4 p-3 rounded-lg bg-sky-950/50 border border-sky-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-sky-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>AI chassis prompt staged. AIDA64 stays open while you assemble the panel.</span>
            </div>
            <button type="button" onClick={openCreateWithStagedPrompt} className="shrink-0 px-3 py-2 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-2">
              <ExternalLink className="w-3.5 h-3.5" />Open Create Studio
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${selected ? 'bg-emerald-500/15 border-emerald-400 text-slate-100 ring-1 ring-emerald-500/50' : 'bg-slate-950/70 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'}`}>
              <div className="flex items-center gap-2"><Icon className={`w-4 h-4 ${selected ? 'text-emerald-400' : 'text-slate-500'}`} /><span className="font-bold text-xs">{tab.label}</span></div>
              <div className="text-[10px] text-slate-500 mt-1">{tab.desc}</div>
            </button>;
          })}
        </div>
      </div>

      {notification && <div className="p-3 rounded-lg bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs font-mono flex items-center gap-2 shadow-lg"><CheckCircle2 className="w-4 h-4 text-emerald-400" /><span>{notification}</span></div>}

      {activeTab === 'telemetry' && <Aida64TelemetryPanel />}
      {activeTab === 'chassis' && <Aida64ChassisGenerator onSendToGenerator={handleSendPrompt} onSelectChassisBackground={(url, res) => { setCurrentBgUrl(url); setCurrentResolution(res); }} currentBgUrl={currentBgUrl} />}
      {activeTab === 'gauges' && <Aida64StateGaugeGenerator onAddToAssembler={handleInjectIntoAssembler} />}
      {activeTab === 'pods' && <Aida64TelemetryPodDesigner onAddToAssembler={handleInjectIntoAssembler} />}
      {activeTab === 'dials' && <Aida64DialDesigner />}
      {activeTab === 'assembler' && <Aida64CanvasAssembler backgroundUrl={currentBgUrl} injectedItem={injectedItem} onItemInjectedAck={() => setInjectedItem(null)} telemetry={telemetry} aida64Telemetry={aida64TelemetrySnapshot} />}
      {activeTab === 'aiLayout' && <Aida64LayoutMapper telemetry={telemetry} backgroundUrl={currentBgUrl} injectedItem={injectedItem} onItemInjectedAck={() => setInjectedItem(null)} onSendToPromptStudio={handleSendPrompt} />}
    </div>
  );
};

