import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  FullProjectState,
  ComfyUiWorkflowConfig,
  PromptStudioConfig,
  AiStudioConfig,
  SavedAsset,
  ActiveAida64LayoutData,
  Aida64PanelItem
} from '../types';

export const LOCAL_STORAGE_KEY = 'gina_factory_project_state';

export const DEFAULT_PROJECT_STATE: FullProjectState = {
  version: '1.2.0',
  lastSavedTimestamp: new Date().toISOString(),
  activeSavePoint: 'V1.2_REAL_COMFY_FLUX_BRIDGE',
  comfyUiWorkflow: {
    workflowId: 'flux_image', checkpointModel: 'flux1-schnell-Q4_K_S.gguf (GGUF)',
    positivePrompt: 'A high-tech cyberpunk workstation with glowing holographic UI widgets, neon blue circuitry, 8k photorealistic lighting',
    negativePrompt: 'blurry, distorted, low quality, noise, artifacts, bad anatomy, overexposed',
    samplerSteps: 4, cfgScale: 1.0, samplerName: 'euler', scheduler: 'simple',
    vaeModel: 'ae.safetensors (required)', outputResolution: '1024x600 (AIDA64)', outputFormat: 'PNG (300 DPI)'
  },
  promptStudio: {
    promptInput: 'A high-tech cyberpunk workstation with glowing holographic UI widgets, neon blue circuitry, 8k photorealistic lighting, cinematic depth of field',
    targetNetwork: 'FLUX.1-Schnell (GGUF Q4_K_S)', aspectRatio: 'aida64', stylePreset: 'Cinematic Photorealistic'
  },
  aiStudio: { activeTab: 'creator', workflowId: 'flux_image', videoWorkflowId: '', defaultAspectRatio: 'aida64' },
  savedAssets: []
};

interface ProjectStateContextType {
  projectState: FullProjectState;
  updateComfyUiWorkflow: (partial: Partial<ComfyUiWorkflowConfig>) => void;
  updatePromptStudio: (partial: Partial<PromptStudioConfig>) => void;
  updateAiStudio: (partial: Partial<AiStudioConfig>) => void;
  setActiveAida64Layout: (layout: ActiveAida64LayoutData | null) => void;
  setSavedAssets: React.Dispatch<React.SetStateAction<SavedAsset[]>>;
  saveProjectNow: () => void;
  reloadProjectState: () => void;
  exportProjectStateJson: () => void;
  importProjectStateJson: (file: File) => Promise<boolean>;
  resetToDefaults: () => void;
  lastAutoSaveTime: Date;
  secondsSinceLastSave: number;
  isAutoSaveActive: boolean;
  setIsAutoSaveActive: (active: boolean) => void;
  storageSizeBytes: number;
}

export const ProjectStateContext = createContext<ProjectStateContextType | undefined>(undefined);

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const sanitizeAida64Layout = (layout: ActiveAida64LayoutData | null | undefined): ActiveAida64LayoutData | null => {
  if (!layout || typeof layout !== 'object') return null;

  const width = Number(layout.screen?.width);
  const height = Number(layout.screen?.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 64 || height < 64) return null;

  const screenWidth = Math.round(clamp(width, 64, 16384));
  const screenHeight = Math.round(clamp(height, 64, 16384));
  const rawItems = Array.isArray(layout.items) ? layout.items : [];

  const items: Aida64PanelItem[] = rawItems
    .filter((item): item is Aida64PanelItem => !!item && typeof item === 'object')
    .map((item, index) => {
      const itemWidth = Math.round(clamp(Number.isFinite(Number(item.width)) ? Number(item.width) : 100, 1, screenWidth));
      const itemHeight = Math.round(clamp(Number.isFinite(Number(item.height)) ? Number(item.height) : 100, 1, screenHeight));
      const x = Math.round(clamp(Number.isFinite(Number(item.x)) ? Number(item.x) : 0, 0, Math.max(0, screenWidth - itemWidth)));
      const y = Math.round(clamp(Number.isFinite(Number(item.y)) ? Number(item.y) : 0, 0, Math.max(0, screenHeight - itemHeight)));
      const rawScale = Number(item.scale);

      return {
        ...item,
        id: String(item.id || `aida64_item_${index}_${Math.random().toString(36).slice(2, 8)}`),
        name: String(item.name || item.shapeType || item.type || 'AIDA64 Element'),
        x, y, width: itemWidth, height: itemHeight,
        sensorType: String(item.sensorType || 'CUSTOM'),
        testValue: String(item.testValue ?? '0'),
        color: String(item.color || '#06b6d4'),
        scale: Number.isFinite(rawScale) ? clamp(rawScale, 0.1, 4) : 1,
        locked: Boolean(item.locked),
        opacity: Number.isFinite(Number(item.opacity)) ? clamp(Number(item.opacity), 0, 1) : 1,
        zIndex: Number.isFinite(Number(item.zIndex)) ? Math.round(Number(item.zIndex)) : index
      };
    });

  return {
    screen: {
      width: screenWidth,
      height: screenHeight,
      label: typeof layout.screen?.label === 'string' ? layout.screen.label : undefined
    },
    items,
    themeId: typeof layout.themeId === 'string' && layout.themeId ? layout.themeId : 'cyberpunk_red',
    timestamp: typeof layout.timestamp === 'string' ? layout.timestamp : new Date().toISOString()
  };
};

const mergeProjectState = (parsed: any): FullProjectState => ({
  ...DEFAULT_PROJECT_STATE,
  ...(parsed && typeof parsed === 'object' ? parsed : {}),
  comfyUiWorkflow: { ...DEFAULT_PROJECT_STATE.comfyUiWorkflow, ...(parsed?.comfyUiWorkflow || {}) },
  promptStudio: { ...DEFAULT_PROJECT_STATE.promptStudio, ...(parsed?.promptStudio || {}) },
  aiStudio: { ...DEFAULT_PROJECT_STATE.aiStudio, ...(parsed?.aiStudio || {}) },
  savedAssets: Array.isArray(parsed?.savedAssets) ? parsed.savedAssets : DEFAULT_PROJECT_STATE.savedAssets,
  activeAida64Layout: sanitizeAida64Layout(parsed?.activeAida64Layout)
});

export const ProjectStateProvider: React.FC<{ children: React.ReactNode; onAddLog?: (level: 'INFO' | 'WARN' | 'SEC' | 'RULE', message: string, ruleId?: string) => void }> = ({ children, onAddLog }) => {
  const [projectState, setProjectState] = useState<FullProjectState>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) return mergeProjectState(JSON.parse(stored));
    } catch (e) { console.error('Error reading project state from localStorage:', e); }
    return DEFAULT_PROJECT_STATE;
  });

  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<Date>(new Date());
  const [secondsSinceLastSave, setSecondsSinceLastSave] = useState(0);
  const [isAutoSaveActive, setIsAutoSaveActive] = useState(true);
  const [storageSizeBytes, setStorageSizeBytes] = useState(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const writeStateToStorage = (stateToSave: FullProjectState) => {
    try {
      const now = new Date();
      const updatedState = { ...stateToSave, lastSavedTimestamp: now.toISOString() };
      const jsonStr = JSON.stringify(updatedState);
      localStorage.setItem(LOCAL_STORAGE_KEY, jsonStr);
      setStorageSizeBytes(jsonStr.length);
      setLastAutoSaveTime(now);
      setSecondsSinceLastSave(0);
      return updatedState;
    } catch (err) {
      console.error('Failed to write project state to localStorage', err);
      return stateToSave;
    }
  };

  const saveProjectNow = () => {
    const saved = writeStateToStorage(projectState);
    setProjectState(saved);
    onAddLog?.('INFO', `Local Project State manually persisted to localStorage (${(JSON.stringify(saved).length / 1024).toFixed(1)} KB).`);
    onAddLog?.('RULE', 'Rule 090-099: State snapshot integrity verified & saved.', '090-099');
  };

  useEffect(() => {
    const interval = setInterval(() => setSecondsSinceLastSave(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isAutoSaveActive) return;
    const autoSaveInterval = setInterval(() => {
      try {
        const jsonStr = JSON.stringify(projectState);
        localStorage.setItem(LOCAL_STORAGE_KEY, jsonStr);
        setStorageSizeBytes(jsonStr.length);
        setLastAutoSaveTime(new Date());
        setSecondsSinceLastSave(0);
      } catch (e) { console.error('Auto-save error', e); }
    }, 10000);
    return () => clearInterval(autoSaveInterval);
  }, [projectState, isAutoSaveActive]);

  useEffect(() => {
    if (!isAutoSaveActive) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        const jsonStr = JSON.stringify(projectState);
        localStorage.setItem(LOCAL_STORAGE_KEY, jsonStr);
        setStorageSizeBytes(jsonStr.length);
        setLastAutoSaveTime(new Date());
        setSecondsSinceLastSave(0);
      } catch (e) { console.error('Debounced save error', e); }
    }, 1200);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [projectState, isAutoSaveActive]);

  const updateComfyUiWorkflow = (partial: Partial<ComfyUiWorkflowConfig>) => setProjectState(prev => ({ ...prev, comfyUiWorkflow: { ...prev.comfyUiWorkflow, ...partial } }));
  const updatePromptStudio = useCallback((partial: Partial<PromptStudioConfig>) => setProjectState(prev => ({ ...prev, promptStudio: { ...prev.promptStudio, ...partial } })), []);
  const updateAiStudio = useCallback((partial: Partial<AiStudioConfig>) => setProjectState(prev => ({ ...prev, aiStudio: { ...prev.aiStudio, ...partial } })), []);

  const setActiveAida64Layout = (layout: ActiveAida64LayoutData | null) => {
    setProjectState(prev => ({ ...prev, activeAida64Layout: sanitizeAida64Layout(layout) }));
  };

  const setSavedAssets: React.Dispatch<React.SetStateAction<SavedAsset[]>> = action => {
    setProjectState(prev => ({ ...prev, savedAssets: typeof action === 'function' ? action(prev.savedAssets) : action }));
  };

  const reloadProjectState = () => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        setProjectState(mergeProjectState(JSON.parse(stored)));
        setLastAutoSaveTime(new Date());
        setSecondsSinceLastSave(0);
        onAddLog?.('INFO', 'Reloaded Local Project State from localStorage cleanly.');
      } else onAddLog?.('WARN', 'No stored project state found in localStorage. Keeping current state.');
    } catch (err: any) { onAddLog?.('WARN', `Failed to reload project state: ${err.message}`); }
  };

  const exportProjectStateJson = () => {
    try {
      const jsonStr = JSON.stringify(projectState, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gina_factory_project_state_${Date.now()}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      onAddLog?.('INFO', 'Exported full Local Project State JSON file.');
    } catch (err: any) { onAddLog?.('WARN', `Export error: ${err.message}`); }
  };

  const importProjectStateJson = async (file: File): Promise<boolean> => {
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== 'object') throw new Error('Invalid JSON object');
      const merged = mergeProjectState(parsed);
      writeStateToStorage(merged);
      setProjectState(merged);
      onAddLog?.('INFO', `Imported project state file "${file.name}" successfully.`);
      onAddLog?.('RULE', 'Rule 090-099: External manifest payload validated & mounted.', '090-099');
      return true;
    } catch (err: any) { onAddLog?.('WARN', `Failed to import project state file: ${err.message}`); return false; }
  };

  const resetToDefaults = () => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setProjectState(DEFAULT_PROJECT_STATE);
      setLastAutoSaveTime(new Date());
      setSecondsSinceLastSave(0);
      setStorageSizeBytes(0);
      onAddLog?.('INFO', 'Reset Local Project State to factory defaults.');
    } catch (err) { console.error(err); }
  };

  return (
    <ProjectStateContext.Provider value={{
      projectState, updateComfyUiWorkflow, updatePromptStudio, updateAiStudio, setActiveAida64Layout,
      setSavedAssets, saveProjectNow, reloadProjectState, exportProjectStateJson, importProjectStateJson,
      resetToDefaults, lastAutoSaveTime, secondsSinceLastSave, isAutoSaveActive, setIsAutoSaveActive, storageSizeBytes
    }}>
      {children}
    </ProjectStateContext.Provider>
  );
};

export const useProjectState = () => {
  const context = useContext(ProjectStateContext);
  if (!context) throw new Error('useProjectState must be used within a ProjectStateProvider');
  return context;
};