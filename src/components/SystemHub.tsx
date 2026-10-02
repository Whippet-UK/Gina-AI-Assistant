import React, { useState } from 'react';
import { Activity, FileText, Gauge, HardDrive, ScrollText, ShieldCheck, Workflow, Wrench } from 'lucide-react';
import { LocalProjectStateBar } from './LocalProjectStateBar';
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
    <div className="gina-suite-page space-y-3">
      <div className="gina-suite-titleblock">
        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Local engine</div>
        <div className="flex items-end justify-between gap-4 mt-0.5">
          <div>
            <h1 className="text-xl font-semibold text-slate-100">System</h1>
            <p className="text-[11px] text-slate-500 mt-0.5">Models, ComfyUI, telemetry, safeguards, logs — local only.</p>
          </div>
          <div className="hidden lg:flex items-center gap-2 text-[9px] font-mono text-slate-600"><HardDrive className="w-3.5 h-3.5" /> local</div>
        </div>
      </div>

      <div className="gina-suite-tabs">
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
                className={`gina-grok-chip shrink-0 flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold tracking-wide transition-colors cursor-pointer ${selected ? 'is-active' : ''}`}
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

      <div className="min-w-0 gina-suite-panel">
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
            <div className="gina-suite-panel flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <FileText className="w-4 h-4 text-rose-400 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-slate-200 uppercase tracking-widest">Diagnostic logs</div>
                  <div className="text-[10px] text-slate-500 mt-1">Use COPY ERRORS in the log panel when you need a failure report.</div>
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
