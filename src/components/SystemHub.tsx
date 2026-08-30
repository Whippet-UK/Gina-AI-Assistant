import React, { useState } from 'react';
import { Activity, FileText, Gauge, HardDrive, ScrollText, ShieldCheck, Workflow, Wrench } from 'lucide-react';
import { LocalProjectStateBar } from './LocalProjectStateBar';
import { LTXDiagnostic } from './LTXDiagnostic';
import { ModelPreWarmPanel } from './ModelPreWarmPanel';
import { VRAMOomFrequencyChart } from './VRAMOomFrequencyChart';
import { LocalCapabilityPanel } from './LocalCapabilityPanel';
import { HardwareStack } from './HardwareStack';
import { AppFeaturesGuide } from './AppFeaturesGuide';
import { MilestoneChecklist } from './MilestoneChecklist';
import { ComfyUINodeGraph } from './ComfyUINodeGraph';
import { RulesMatrix } from './RulesMatrix';
import { LiveConsoleLog } from './LiveConsoleLog';
import { MilestoneWorkbench } from './MilestoneWorkbench';
import { TestSuitePanel } from './TestSuitePanel';
import { NextMilestonesWorkbench } from './NextMilestonesWorkbench';
import { SystemTelemetry, LogEntry } from '../types';

interface SystemHubProps {
  telemetry: SystemTelemetry;
  logs: LogEntry[];
  activeSavePoint: string;
  logWithOomCheck: (level: 'INFO' | 'WARN' | 'SEC' | 'RULE', message: string, ruleId?: string) => void;
  handleClearCache: (isAutoTrigger?: boolean, unloadModels?: boolean) => Promise<void>;
  onClearLogs: () => void;
}

type SystemTab = 'overview' | 'hardware' | 'models' | 'automation' | 'safeguards' | 'logs';

const tabs: { id: SystemTab; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'overview', label: 'OVERVIEW', icon: Activity, description: 'Project state, capabilities and factory status' },
  { id: 'hardware', label: 'HARDWARE', icon: Gauge, description: 'GPU, VRAM, thermal and resource telemetry' },
  { id: 'models', label: 'MODELS & WORKFLOWS', icon: Workflow, description: 'Model readiness, pre-warm and ComfyUI workflows' },
  { id: 'automation', label: 'AUTOMATION', icon: Wrench, description: 'Workflow ingestion, orchestration, health and diagnostics' },
  { id: 'safeguards', label: 'SAFEGUARDS', icon: ShieldCheck, description: 'Rules, restore points and operational protections' },
  { id: 'logs', label: 'LOGS', icon: ScrollText, description: 'Errors, telemetry and copy-ready diagnostics' },
];

export const SystemHub: React.FC<SystemHubProps> = ({
  telemetry, logs, activeSavePoint, logWithOomCheck, handleClearCache, onClearLogs
}) => {
  const [activeTab, setActiveTab] = useState<SystemTab>('overview');
  const active = tabs.find(tab => tab.id === activeTab) || tabs[0];
  const ActiveIcon = active.icon;

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[10px] uppercase tracking-[0.25em] text-emerald-400 font-bold">Local engine control center</div>
        <div className="flex items-end justify-between gap-4 mt-1">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-slate-100">System</h1>
            <p className="text-xs text-slate-500 mt-1">Everything that supports Gina's local engine, organized by function instead of stacked panels.</p>
          </div>
          <div className="hidden lg:flex items-center gap-2 text-[9px] font-mono text-slate-600 uppercase"><HardDrive className="w-3.5 h-3.5" /> Local only</div>
        </div>
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-lg p-1.5 shadow-md">
        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                title={tab.description}
                className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-md border text-[10px] font-bold tracking-widest transition-colors cursor-pointer ${selected ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm' : 'bg-slate-950 text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900 hover:border-slate-800'}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2 px-1 text-[9px] font-mono text-slate-500 uppercase tracking-wider">
        <ActiveIcon className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-slate-300">{active.label}</span>
        <span className="text-slate-700">·</span>
        <span>{active.description}</span>
      </div>

      <div className="min-w-0">
        {activeTab === 'overview' && (
          <div className="space-y-5">
            <LocalProjectStateBar />
            <LocalCapabilityPanel onAddLog={logWithOomCheck} />
            <AppFeaturesGuide />
          </div>
        )}

        {activeTab === 'hardware' && (
          <div className="space-y-5">
            <HardwareStack telemetry={telemetry} onAddLog={logWithOomCheck} onClearCache={() => handleClearCache(false, true)} />
            <VRAMOomFrequencyChart telemetry={telemetry} onAddLog={logWithOomCheck} onClearCache={() => handleClearCache(false, true)} />
          </div>
        )}

        {activeTab === 'models' && (
          <div className="space-y-5">
            <LTXDiagnostic />
            <ModelPreWarmPanel onAddLog={logWithOomCheck} onClearCache={() => handleClearCache(false, true)} />
            <ComfyUINodeGraph onAddLog={logWithOomCheck} />
          </div>
        )}

        {activeTab === 'automation' && (
          <div className="space-y-5">
            <NextMilestonesWorkbench />
            <MilestoneWorkbench />
            <TestSuitePanel />
          </div>
        )}

        {activeTab === 'safeguards' && (
          <div className="space-y-5">
            <MilestoneChecklist activeRestorePoint={activeSavePoint} />
            <RulesMatrix />
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-5">
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-md bg-rose-500/10 border border-rose-500/20"><FileText className="w-4 h-4 text-rose-400" /></div>
                <div>
                  <div className="text-xs font-bold text-slate-200 uppercase tracking-widest">Diagnostic logs</div>
                  <div className="text-[10px] text-slate-500 mt-1">Use <strong className="text-slate-300">COPY ERRORS</strong> in the log panel when you need to send me a failure report.</div>
                </div>
              </div>
              <div className="text-[9px] font-mono text-slate-600">SERVER · COMFYUI · TELEMETRY</div>
            </div>
            <LiveConsoleLog logs={logs} onClearLogs={onClearLogs} />
          </div>
        )}
      </div>
    </div>
  );
};
