import React, { useState } from 'react';
import {
  Download, Wand2, CheckSquare, Unlock, Save, Zap,
  Maximize2, Eye, Copy, Check, ChevronLeft, ChevronRight, Layers, Sparkles
} from 'lucide-react';
import { GinaJob } from '../../context/GenerationJobContext';

export interface HistoryItem {
  id: string;
  url: string;
  prompt: string;
  seed?: number;
  width?: number;
  height?: number;
  timestamp: string;
  ratioLabel?: string;
  styles?: string[];
  workflowId?: string;
}

export interface GinaImagePreviewProps {
  activeOutput?: string;
  job?: GinaJob | null;
  outputLoading: boolean;
  isBusy: boolean;
  history: HistoryItem[];
  onSelectHistory: (item: HistoryItem) => void;
  onVary: (strength: 'subtle' | 'strong') => void;
  onKeepImage: () => void;
  onUnlockImage: () => void;
  lockSeed: boolean;
  promotingImage: boolean;
  keepNotification: string | null;
  onDownload: () => void;
  onSaveAsset: () => void;
  savingAsset: boolean;
  activeLayout: any | null;
  onFuseLayout: () => void;
  fusingLayout: boolean;
  resolutionLabel: string;
  ratioLabel: string;
}

export const GinaImagePreview: React.FC<GinaImagePreviewProps> = ({
  activeOutput,
  job,
  outputLoading,
  isBusy,
  history,
  onSelectHistory,
  onVary,
  onKeepImage,
  onUnlockImage,
  lockSeed,
  promotingImage,
  keepNotification,
  onDownload,
  onSaveAsset,
  savingAsset,
  activeLayout,
  onFuseLayout,
  fusingLayout,
  resolutionLabel,
  ratioLabel
}) => {
  const [fullscreen, setFullscreen] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const currentJobPrompt = (job?.parameters?.prompt || job?.parameters?.positive_prompt || '') as string;

  const handleCopyPrompt = () => {
    if (!currentJobPrompt) return;
    navigator.clipboard.writeText(currentJobPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const progressPercent = Math.max(0, Math.min(100, job?.progress || 0));

  return (
    <div className="flex flex-col bg-[#090d16] border border-[#262d3e] rounded-xl overflow-hidden shadow-xl">
      {/* Top Preview Status Strip */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#21262d] bg-[#0f1420] text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white uppercase tracking-wider font-mono text-[11px]">
            Preview
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">
            {ratioLabel} · {resolutionLabel}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {lockSeed && (
            <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-[9px] font-mono text-amber-300 flex items-center gap-1">
              <CheckSquare className="w-3 h-3" /> SEED LOCKED
            </span>
          )}

          {job?.status === 'RUNNING' && (
            <span className="px-2 py-0.5 rounded bg-blue-500/20 border border-blue-500/40 text-[9px] font-mono text-blue-300 animate-pulse">
              SAMPLING · {progressPercent}%
            </span>
          )}

          {job?.status === 'QUEUED' && (
            <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-[9px] font-mono text-amber-300">
              COMFYUI QUEUE
            </span>
          )}
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div className="relative flex-1 min-h-[380px] lg:min-h-[440px] flex items-center justify-center p-3 bg-black/80 overflow-hidden group">
        {activeOutput ? (
          <div className="relative max-w-full max-h-full flex items-center justify-center">
            <img
              src={activeOutput}
              alt="Gina Generated Output"
              className="max-h-[60vh] xl:max-h-[68vh] w-auto object-contain rounded-lg shadow-2xl border border-[#21262d] transition-all"
            />

            {/* Floating Top-Right Utility Overlay */}
            <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-md p-1 rounded-lg border border-white/10">
              <button
                type="button"
                onClick={() => setFullscreen(true)}
                className="p-1.5 text-zinc-300 hover:text-white hover:bg-white/10 rounded transition-colors"
                title="View Fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onDownload}
                className="p-1.5 text-zinc-300 hover:text-white hover:bg-white/10 rounded transition-colors"
                title="Download Image"
              >
                <Download className="w-4 h-4" />
              </button>

              {currentJobPrompt && (
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="p-1.5 text-zinc-300 hover:text-white hover:bg-white/10 rounded transition-colors"
                  title="Copy Prompt"
                >
                  {copiedPrompt ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center p-6 select-none">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-center mx-auto mb-3 text-zinc-600">
              <Layers className="w-8 h-8 opacity-40" />
            </div>
            <div className="text-xs font-semibold text-zinc-400">Gina Image Canvas</div>
            <div className="text-[10px] text-zinc-600 font-mono mt-1 max-w-[220px]">
              {isBusy ? 'Generating with local FLUX.1-Schnell…' : 'Type a prompt and press Generate (Ctrl+Enter)'}
            </div>
          </div>
        )}

        {/* Live Step Progress Bar Overlay */}
        {isBusy && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 flex flex-col gap-1.5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-blue-300 font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-blue-400" />
                {job?.status === 'QUEUED' ? 'Waiting in ComfyUI queue…' : 'Denoising latents…'}
              </span>
              <span className="text-zinc-400">
                {job?.currentStep !== undefined ? `Step ${job.currentStep}/${job.totalSteps || '?'} · ` : ''}
                {progressPercent}%
              </span>
            </div>

            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-200"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Keep Image Notification Banner */}
      {keepNotification && (
        <div className="mx-3 mt-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-300 animate-in fade-in flex items-center gap-2">
          <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{keepNotification}</span>
        </div>
      )}

      {/* Gina Post-Generation Actions Bar */}
      {activeOutput && !isBusy && (
        <div className="p-3 border-t border-[#21262d] bg-[#0c101a] space-y-2">
          {/* Main Action Rows */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onVary('subtle')}
              className="py-2 px-3 rounded-lg bg-[#161b26] hover:bg-[#212738] border border-[#2d3345] text-xs font-semibold text-zinc-200 hover:text-white flex items-center justify-center gap-1.5 transition-all active:scale-95"
              title="Vary Subtle (Denoise 0.45): Refines details while strictly keeping composition"
            >
              <Wand2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Vary (Subtle)</span>
            </button>

            <button
              type="button"
              onClick={() => onVary('strong')}
              className="py-2 px-3 rounded-lg bg-[#161b26] hover:bg-[#212738] border border-[#2d3345] text-xs font-semibold text-zinc-200 hover:text-white flex items-center justify-center gap-1.5 transition-all active:scale-95"
              title="Vary Strong (Denoise 0.85): Generates fresh creative variation of concept"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Vary (Strong)</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {!lockSeed ? (
              <button
                type="button"
                onClick={onKeepImage}
                disabled={promotingImage}
                className="py-2 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-semibold text-emerald-300 flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                title="Promote output directly into Input Image and lock seed for continued tuning"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>{promotingImage ? 'Importing…' : 'Keep Image'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onUnlockImage}
                className="py-2 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-semibold text-amber-300 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                title="Unlock seed to explore completely new seeds"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Unlock Image</span>
              </button>
            )}

            <button
              type="button"
              onClick={onSaveAsset}
              disabled={savingAsset}
              className="py-2 px-3 rounded-lg bg-[#161b26] hover:bg-[#212738] border border-[#2d3345] text-xs font-semibold text-zinc-200 hover:text-white flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
              title="Save generation into persistent Gina Asset Library"
            >
              <Save className="w-3.5 h-3.5 text-zinc-400" />
              <span>{savingAsset ? 'Saving…' : 'Save to Library'}</span>
            </button>
          </div>

          {/* Special AIDA64 Sensor Panel Layout Fusion (When Active) */}
          {activeLayout && (
            <button
              type="button"
              onClick={onFuseLayout}
              disabled={fusingLayout}
              className="w-full py-2 px-3 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-xs font-bold text-sky-300 flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
              title="Fuse real-time AIDA64 hardware dials and sensor telemetry directly onto this image"
            >
              <Zap className="w-3.5 h-3.5 text-sky-400" />
              <span>{fusingLayout ? 'Fusing Telemetry Panel…' : 'Fuse AIDA64 Sensor Panel'}</span>
            </button>
          )}
        </div>
      )}

      {/* Session History Carousel */}
      {history.length > 0 && (
        <div className="p-3 border-t border-[#21262d] bg-[#070a10]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
              Session History ({history.length})
            </span>
            <span className="text-[9px] text-zinc-600 font-mono">Click to reload</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {history.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectHistory(item)}
                className={`relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border transition-all ${
                  item.url === activeOutput
                    ? 'border-blue-500 ring-2 ring-blue-500/40'
                    : 'border-[#21262d] hover:border-zinc-500 opacity-70 hover:opacity-100'
                }`}
                title={`${item.prompt} (${item.timestamp})`}
              >
                <img src={item.url} alt="History thumbnail" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen Modal View */}
      {fullscreen && activeOutput && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-md animate-in fade-in"
          onClick={() => setFullscreen(false)}
        >
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-mono text-white"
          >
            ✕ Close [Esc]
          </button>
          <img
            src={activeOutput}
            alt="Fullscreen View"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
