import React, { useRef } from 'react';
import {
  Save,
  RotateCcw,
  Download,
  Upload,
  HardDrive,
  CheckCircle2,
  Clock,
  Trash2,
  Sliders,
  Sparkles,
  Network
} from 'lucide-react';
import { useProjectState } from '../context/ProjectStateContext';

export const LocalProjectStateBar: React.FC = () => {
  const {
    projectState,
    saveProjectNow,
    reloadProjectState,
    exportProjectStateJson,
    importProjectStateJson,
    resetToDefaults,
    secondsSinceLastSave,
    isAutoSaveActive,
    setIsAutoSaveActive,
    storageSizeBytes
  } = useProjectState();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await importProjectStateJson(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formattedKb = (storageSizeBytes / 1024).toFixed(1);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 shadow-md font-mono text-xs mb-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Status & Indicator */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-emerald-500/30 px-2.5 py-1 rounded text-[11px]">
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400 font-bold uppercase">LOCAL PROJECT STATE:</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className={`w-2 h-2 rounded-full bg-emerald-400 ${isAutoSaveActive ? 'animate-ping' : ''}`} />
              {isAutoSaveActive ? 'AUTO-SYNC ACTIVE' : 'PAUSED'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <Clock className="w-3 h-3 text-sky-400" />
            <span>
              Last Saved:{' '}
              <strong className="text-slate-200">
                {secondsSinceLastSave === 0 ? 'Just now' : `${secondsSinceLastSave}s ago`}
              </strong>
            </span>
            <span className="text-slate-700">|</span>
            <span className="text-slate-500">
              Payload Size: <strong className="text-amber-400">{formattedKb} KB</strong>
            </span>
          </div>

          {/* Configuration badges */}
          <div className="hidden xl:flex items-center gap-1.5 text-[10px]">
            <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-300 flex items-center gap-1">
              <Network className="w-3 h-3 text-amber-400" />
              ComfyUI: <strong className="text-emerald-400">{projectState.comfyUiWorkflow.checkpointModel}</strong> ({projectState.comfyUiWorkflow.samplerSteps} steps)
            </span>
            <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-sky-400" />
              Creator: <strong className="text-emerald-400">LOCAL / COMFYUI</strong>
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Save Now Button */}
          <button
            onClick={saveProjectNow}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1.5 rounded text-[11px] flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 uppercase tracking-tight shadow"
            title="Immediately force save all settings to localStorage"
          >
            <Save className="w-3.5 h-3.5" /> SAVE STATE NOW
          </button>

          {/* Reload State Button */}
          <button
            onClick={() => {
              if (confirm('Reload work from last saved Local Project State in localStorage?')) {
                reloadProjectState();
              }
            }}
            className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 px-2.5 py-1.5 rounded text-[11px] flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            title="Reload state from localStorage"
          >
            <RotateCcw className="w-3.5 h-3.5 text-sky-400" /> RELOAD WORK
          </button>

          {/* Export JSON Button */}
          <button
            onClick={exportProjectStateJson}
            className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 px-2.5 py-1.5 rounded text-[11px] flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            title="Download formatted JSON bundle of full project state"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" /> EXPORT .JSON
          </button>

          {/* Import JSON Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 px-2.5 py-1.5 rounded text-[11px] flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            title="Upload JSON file to restore project state"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" /> IMPORT .JSON
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />

          {/* Auto-Save Toggle Button */}
          <button
            onClick={() => setIsAutoSaveActive(!isAutoSaveActive)}
            className={`px-2.5 py-1.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
              isAutoSaveActive
                ? 'bg-slate-900 text-emerald-400 border-emerald-500/40'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
            title="Toggle background periodic auto-save"
          >
            {isAutoSaveActive ? 'AUTO-SAVE ON' : 'AUTO-SAVE OFF'}
          </button>

          {/* Reset Defaults Button */}
          <button
            onClick={() => {
              if (confirm('Reset Local Project State to factory defaults? This clears your localStorage configuration.')) {
                resetToDefaults();
              }
            }}
            className="bg-slate-900 hover:bg-rose-950 hover:text-rose-300 text-slate-500 border border-slate-800 p-1.5 rounded transition-all cursor-pointer"
            title="Reset to factory defaults"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
