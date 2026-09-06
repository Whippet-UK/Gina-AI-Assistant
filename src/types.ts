export interface HardwareMetric { name: string; value: string; subtext: string; iconName: string; }
export interface SystemTelemetry { vramUsedMB: number; vramTotalMB: number; gpuTempC: number; cpuThreadsActive: number; cpuThreadsCap: number; ramUsedGB: number; ramTotalGB: number; ssdFreeGB: number; thermalBrakeActive: boolean; }
export interface RuleSafeguard { id: string; range: string; category: string; title: string; rules: string[]; severity: 'CRITICAL'|'HIGH'|'MEDIUM'|'STANDARD'; locked: boolean; }
export interface LifecyclePhase { phase: number; name: string; status: 'COMPLETED'|'IN_PROGRESS'|'PENDING'; details: string; }
export interface RestorePoint { id: string; label: string; description: string; timestamp: string; status: 'ACTIVE'|'LOCKED'|'PENDING'; }
export interface VerificationCheck { id: string; label: string; passed: boolean; details: string; }
export interface LogEntry { id: string; timestamp: string; level: 'INFO'|'WARN'|'SEC'|'RULE'; ruleId?: string; message: string; }

export interface SavedAsset {
  id: string;
  title: string;
  type: 'image'|'video'|'audio'|'lyrics'|'analysis'|'prompt';
  url?: string;
  textContent?: string;
  fileFormat: string;
  timestamp: string;
  promptUsed?: string;
  jobId?: string;
  workflowId?: string;
  seed?: number;
}

export interface ComfyErrorLog {
  id: string;
  timestamp: string;
  line: string;
  isOOM: boolean;
  nodeId?: string;
  nodeType?: string;
  jobId?: string;
}

export interface ComfyUiWorkflowConfig {
  workflowId: string;
  checkpointModel: string;
  positivePrompt: string;
  negativePrompt: string;
  samplerSteps: number;
  cfgScale: number;
  samplerName: string;
  scheduler: string;
  vaeModel: string;
  outputResolution: string;
  outputFormat: string;
}

export interface PromptStudioConfig {
  promptInput: string;
  negativePrompt?: string;
  targetNetwork: string;
  aspectRatio: string;
  stylePreset: string;
}

export type LocalLlmEngine = 'qwen'|'gemma';

export interface AiStudioConfig {
  activeTab: 'creator'|'video'|'jobs'|'shorts'|'assets';
  workflowId: string;
  videoWorkflowId: string;
  defaultAspectRatio: '1:1'|'16:9'|'9:16'|'aida64'|'4:3'|'3:4';
  localLlmEngine: LocalLlmEngine;
}

export interface ActiveAida64LayoutData {
  screen: { width: number; height: number; label?: string };
  items: Aida64PanelItem[];
  themeId: string;
  timestamp?: string;
}

export interface FullProjectState {
  version: string;
  lastSavedTimestamp: string;
  activeSavePoint: string;
  comfyUiWorkflow: ComfyUiWorkflowConfig;
  promptStudio: PromptStudioConfig;
  aiStudio: AiStudioConfig;
  savedAssets: SavedAsset[];
  activeAida64Layout?: ActiveAida64LayoutData | null;
}

export interface PreWarmModelDef {
  id: string;
  name: string;
  filename: string;
  workflowId: string;
  type: 'image' | 'video' | 'shorts' | 'audio' | 'music';
  vramFootprintMB: number;
  description: string;
}

export interface ModelPreWarmState {
  activeModel: string | null;
  activeWorkflowId: string | null;
  status: 'idle' | 'warm' | 'cold' | 'unloaded' | 'switching';
  lastActionTimestamp: string;
  targetGpuCageMB: number;
  models: PreWarmModelDef[];
}

export interface Aida64ScreenPreset {
  id: string;
  label: string;
  width: number;
  height: number;
  diagonal: string;
  category: 'bar' | 'mini' | 'aio' | 'standard';
  description: string;
}

export interface Aida64DialSlot {
  id: string;
  label: string;
  icon: 'fan' | 'pump' | 'temp' | 'freq' | 'm2' | 'volt' | 'watt' | 'mem' | 'none';
  unit: string;
  type: 'pill' | 'banner' | 'hero' | 'tray';
}

export interface Aida64DialConfig {
  size: number;
  themeColor: string;
  accentColor: string;
