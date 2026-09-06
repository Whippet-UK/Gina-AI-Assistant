import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Video, Play, Sparkles, SlidersHorizontal, RefreshCw, Zap,
  Download, Film, ShieldCheck, Cpu, ChevronDown, Save,
  RotateCcw, Info, Layers, Clock, Activity, Gauge, FileJson, AlertCircle, AlertTriangle, X, Trash2, Check
} from 'lucide-react';
import { useProjectState } from '../context/ProjectStateContext';
import { useGenerationJob } from '../context/GenerationJobContext';
import { LTXWorkflowGenerator } from './LTXWorkflowGenerator';
import { ComfyErrorOverlay } from './ComfyErrorOverlay';
import { VRAMHistoryGraph } from './VRAMHistoryGraph';
import { MediaStitcherModal } from './MediaStitcherModal';
import { LogEntry, SystemTelemetry } from '../types';
import { getRecentOOMErrors } from '../App';

interface VideoStudioProps {
  onAddLog: (level: 'INFO' | 'WARN' | 'SEC' | 'RULE', message: string, ruleId?: string) => void;
  logs?: LogEntry[];
  telemetry?: SystemTelemetry;
  onClearCache?: () => void;
}

const durationOptions = [
  { seconds: 1, frames: 25, label: '1.0s (25 frames)', vram: '2.8 GB VRAM' },
  { seconds: 2, frames: 49, label: '2.0s (49 frames)', vram: '4.2 GB VRAM' },
  { seconds: 3, frames: 73, label: '3.0s (73 frames)', vram: '5.6 GB VRAM — Recommended' },
  { seconds: 4, frames: 97, label: '4.0s (97 frames)', vram: '6.9 GB VRAM — 8GB Max Cap' },
  { seconds: 5, frames: 121, label: '5.0s (121 frames)', vram: '7.8 GB VRAM — High Swapping Risk' },
];

const videoResolutionPresets = [
  { label: '768 × 512 · 16:9 Landscape', width: 768, height: 512, ratio: '16:9', vram: 'STANDARD (8GB Safe)' },
  { label: '512 × 768 · 9:16 Shorts / Vertical', width: 512, height: 768, ratio: '9:16', vram: 'STANDARD (8GB Safe)' },
  { label: '512 × 512 · 1:1 Compact Square', width: 512, height: 512, ratio: '1:1', vram: 'LOW (Fastest)' },
];

const motionScalePresets = [
  { label: 'Subtle / Micro Motion', val: 0.5 },
  { label: 'Balanced Cinematic', val: 1.0 },
  { label: 'Dynamic Sweep', val: 1.5 },
  { label: 'High Action / Fast Motion', val: 2.2 },
];

interface LtxPreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  icon: string;
  motionScale: number;
  durationSec: number;
  frames: number;
  fps: number;
  steps: number;
  cfgScale: number;
  resolutionLabel: string;
  width: number;
  height: number;
  cameraMotion: string;
  isSafe8GB?: boolean;
  interpolationMultiplier?: 1 | 2 | 4;
}

const ltxParameterPresets: LtxPreset[] = [
  {
    id: 'compact_fast',
    name: '8GB Safe · Fast 1.0s',
    badge: '1:1 · 1s · 25 frames · 100% 8GB Safe',
    description: 'Compact 512x512 resolution with 1.0s (25 frames @ 25fps) for instant, completely crash-free generation under 8GB VRAM.',
    icon: '🚀',
    motionScale: 1.0,
    durationSec: 1,
    frames: 25,
    fps: 25,
    steps: 18,
    cfgScale: 3.0,
    resolutionLabel: '512 × 512 · 1:1 Compact Square',
    width: 512,
    height: 512,
    cameraMotion: 'None / Static Camera',
    isSafe8GB: true,
    interpolationMultiplier: 1
  },
  {
    id: 'rife_2x_smooth',
    name: '8GB Safe · 2× RIFE 50fps',
    badge: '1:1 · 25 frames → 50fps · Smooth 2.0s',
    description: 'Generates 25 safe keyframes and applies 2× RIFE frame interpolation for ultra-smooth 50fps motion without VRAM penalty.',
    icon: '✨',
    motionScale: 1.0,
    durationSec: 1,
    frames: 25,
    fps: 50,
    steps: 20,
    cfgScale: 3.0,
    resolutionLabel: '512 × 512 · 1:1 Compact Square',
    width: 512,
    height: 512,
    cameraMotion: 'Slow Cinematic Pan',
    isSafe8GB: true,
    interpolationMultiplier: 2
  },
  {
    id: 'rife_4x_slomo',
    name: '8GB Safe · 4× RIFE 60fps Slomo',
    badge: '1:1 · 25 frames → 100fps · 4s Slomo',
    description: 'Generates 25 safe keyframes and applies 4× RIFE frame interpolation for silky 60fps slow-motion cinematic video on 8GB VRAM.',
    icon: '📽️',
    motionScale: 1.2,
    durationSec: 1,
    frames: 25,
    fps: 60,
    steps: 22,
    cfgScale: 3.2,
    resolutionLabel: '512 × 512 · 1:1 Compact Square',
    width: 512,
    height: 512,
    cameraMotion: 'Slow Dolly Push In',
    isSafe8GB: true,
    interpolationMultiplier: 4
  },
  {
    id: 'cinematic',
    name: 'Cinematic Sweep (12GB+ GPU)',
    badge: '16:9 · 3s · 73 frames · 12GB+ Req',
    description: 'Filmic 768x512 sweep, 3.0s duration (73 frames). Note: Exceeds 8GB VRAM — requires 12GB+ GPU to prevent OOM.',
    icon: '🎬',
    motionScale: 0.8,
    durationSec: 3,
    frames: 73,
    fps: 24,
    steps: 28,
    cfgScale: 3.5,
    resolutionLabel: '768 × 512 · 16:9 Landscape',
    width: 768,
    height: 512,
    cameraMotion: 'Pan Right & Slow Zoom',
    isSafe8GB: false,
    interpolationMultiplier: 1
  },
  {
    id: 'vertical_shorts',
    name: 'Shorts Reel (12GB+ GPU)',
    badge: '9:16 · 3s · 73 frames · 12GB+ Req',
    description: 'Vertical 512x768 aspect ratio for Shorts/Reels, 3.0s duration. Note: Exceeds 8GB VRAM — requires 12GB+ GPU to prevent OOM.',
    icon: '📱',
    motionScale: 1.2,
    durationSec: 3,
    frames: 73,
    fps: 25,
    steps: 25,
    cfgScale: 3.2,
    resolutionLabel: '512 × 768 · 9:16 Shorts / Vertical',
    width: 512,
    height: 768,
    cameraMotion: 'Slow Dolly Push In',
    isSafe8GB: false,
    interpolationMultiplier: 1
  }
];

export const VideoStudio: React.FC<VideoStudioProps> = ({ onAddLog, logs = [], telemetry, onClearCache }) => {
  const { projectState, setSavedAssets } = useProjectState();
  const { job, output, outputLoading, submitting: loading, startJob, cancelJob } = useGenerationJob();
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await cancelJob();
      onAddLog('WARN', 'User triggered manual generation stop. ComfyUI interrupted and VRAM cache cleared.');
      // Also trigger a VRAM flush to immediately free any memory
      await fetch('/api/comfy/clear-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unload_models: false, free_memory: true })
      }).catch(() => null);
    } finally {
      setCancelling(false);
    }
  };

  // Track recent OOM errors from logs via useEffect and acknowledged OOM entries
  const [recentOOMErrors, setRecentOOMErrors] = useState<LogEntry[]>([]);
  const [acknowledgedOOMIds, setAcknowledgedOOMIds] = useState<string[]>([]);
  const [dismissOOMOverlay, setDismissOOMOverlay] = useState<boolean>(false);

  useEffect(() => {
    const oomList = getRecentOOMErrors(logs);
    const activeOOMList = oomList.filter(l => {
      const key = l.id ? String(l.id) : `${l.timestamp}-${l.message}`;
      return !acknowledgedOOMIds.includes(key);
    });
    setRecentOOMErrors(activeOOMList);
    if (activeOOMList.length > 0) {
      setDismissOOMOverlay(false);
    }
  }, [logs, acknowledgedOOMIds]);

  const handleClearSingleOOM = (log: LogEntry, idx: number) => {
    const logKey = log.id ? String(log.id) : `${log.timestamp}-${log.message}`;
    setAcknowledgedOOMIds(prev => [...prev, logKey]);
    setRecentOOMErrors(prev => prev.filter((_, i) => i !== idx && (l => (l.id ? String(l.id) : `${l.timestamp}-${l.message}`) !== logKey)));
    if (onAddLog) {
      onAddLog('INFO', `Acknowledged CUDA memory failure: ${log.message.slice(0, 60)}...`, 'RULE_VRAM_SAFETY');
    }
  };

  // Video generation states
  const [prompt, setPrompt] = useState('A majestic black dragon breathing fiery embers in an obsidian cavern, slow cinematic camera pan, 8k resolution');
  const [negativePrompt, setNegativePrompt] = useState('blurry, static, distorted motion, flickering, low resolution, bad anatomy');
  const [showNegative, setShowNegative] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(1); // 1 second = 25 frames
  const [customFrames, setCustomFrames] = useState(25);
  const [fps, setFps] = useState(25);
  const [motionScale, setMotionScale] = useState(1.0);
  const [resolution, setResolution] = useState('512 × 512 · 1:1 Compact Square');
  const [width, setWidth] = useState(512);
  const [height, setHeight] = useState(512);
  const [seed, setSeed] = useState(Math.floor(Math.random() * 1000000000));
  const [isRandomSeed, setIsRandomSeed] = useState(true);
  const [steps, setSteps] = useState(18);
  const [cfgScale, setCfgScale] = useState(3.0);
  const [cameraMotion, setCameraMotion] = useState('None / Static Camera');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [savingAsset, setSavingAsset] = useState(false);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagResult, setDiagResult] = useState<any>(null);
  const [showArchitect, setShowArchitect] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string>('compact_fast');
  const [interpolationMultiplier, setInterpolationMultiplier] = useState<1 | 2 | 4>(1);
  const [showStitchModal, setShowStitchModal] = useState(false);

  // Persistent Video Error and Video URL state so failures do not disappear automatically
  // and do not destroy previously generated video outputs
  const [lastSuccessfulVideoUrl, setLastSuccessfulVideoUrl] = useState<string | null>(null);
  const [flushingVram, setFlushingVram] = useState<boolean>(false);
  const [videoError, setVideoError] = useState<{
    message: string;
    timestamp: string;
    isOOM?: boolean;
    jobId?: string;
  } | null>(null);

  const handleFlushVramHeader = async () => {
    setFlushingVram(true);
    onAddLog('INFO', 'Video Studio Header: Flushing ComfyUI VRAM and purging PyTorch CUDA tensor cache (/free)...');
    try {
      const res = await fetch('/api/comfy/clear-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unload_models: false, free_memory: true })
      });
      if (res.ok) {
        onAddLog('SEC', 'VRAM Cache Purged: PyTorch CUDA cache freed successfully.');
      } else {
        onAddLog('WARN', 'VRAM Flush: ComfyUI returned non-200 status.');
      }
    } catch (err: any) {
      onAddLog('WARN', `VRAM Flush failed: ${err?.message || err}`);
    } finally {
      setFlushingVram(false);
    }
  };

  const applyPreset = (preset: LtxPreset) => {
    setActivePresetId(preset.id);
    setMotionScale(preset.motionScale);
    setSelectedDuration(preset.durationSec);
    setCustomFrames(preset.frames);
    setFps(preset.fps);
    setSteps(preset.steps);
    setCfgScale(preset.cfgScale);
    setResolution(preset.resolutionLabel);
    setWidth(preset.width);
    setHeight(preset.height);
    setCameraMotion(preset.cameraMotion);
    if (preset.interpolationMultiplier) {
      setInterpolationMultiplier(preset.interpolationMultiplier);
    }
    onAddLog('INFO', `Loaded LTX-2.3 Preset: "${preset.name}" (${preset.badge})`);
  };

  const runDiagnostic = async () => {
    setDiagLoading(true);
    onAddLog('INFO', 'Running LTX-2.3 & ComfyUI diagnostic audit...');
    try {
      const res = await fetch('/api/diagnostics/ltx23');
      const data = await res.json();
      setDiagResult(data);
      if (data.comfyResponsive && data.modelFound) {
        onAddLog('INFO', `Diagnostic PASSED: ComfyUI responsive (${data.comfyLatencyMs}ms), LTX-2.3 model found.`);
      } else {
        onAddLog('WARN', `Diagnostic WARN: ComfyUI responsive: ${data.comfyResponsive}, Model found: ${data.modelFound}`);
      }
    } catch (err: any) {
      onAddLog('WARN', `Diagnostic failed: ${err?.message || err}`);
    } finally {
      setDiagLoading(false);
    }
  };

  // Keep custom frames in sync with selected duration option unless overridden
  const activeDurationOpt = durationOptions.find(d => d.seconds === selectedDuration) || durationOptions[2];

  useEffect(() => {
    setCustomFrames(activeDurationOpt.frames);
  }, [selectedDuration]);

  const handleResolutionChange = (resLabel: string) => {
    setResolution(resLabel);
    const found = videoResolutionPresets.find(p => p.label === resLabel);
    if (found) {
      setWidth(found.width);
      setHeight(found.height);
    }
  };

  const handleRandomizeSeed = () => {
    const newSeed = Math.floor(Math.random() * 1000000000);
    setSeed(newSeed);
  };

  const handleGenerateVideo = async () => {
    if (!prompt.trim()) {
      onAddLog('WARN', 'Please enter a video prompt before generating.');
      return;
    }

    const currentSeed = isRandomSeed ? Math.floor(Math.random() * 1000000000) : seed;
    if (isRandomSeed) setSeed(currentSeed);

    // Auto-Flush Hook: ensure GPU memory is cleared before loading LTX-Video tensors
    onAddLog('INFO', 'Auto-Flush Hook: Pre-clearing ComfyUI VRAM cache (/free) before loading video model...');
    await fetch('/api/comfy/clear-cache', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unload_models: false, free_memory: true })
    }).catch(() => null);

    onAddLog('INFO', `Submitting LTX-2.3 Video Job: "${prompt.slice(0, 45)}..." (${customFrames} frames @ ${fps}fps, motion scale ${motionScale})`);

    const resultJob = await startJob('ltx_video', {
      prompt,
      negative_prompt: negativePrompt,
      duration_sec: selectedDuration,
      frames: customFrames,
      batch_size: customFrames,
      fps,
      motion_scale: motionScale,
      width,
      height,
      seed: currentSeed,
      steps,
      cfg: cfgScale,
      camera_motion: cameraMotion,
      model: 'ltxv-2b-0.9.8-distilled-fp8.safetensors'
    });

    if (!resultJob) {
      onAddLog('WARN', 'Job submission failed or was rejected by local server.');
    } else if (resultJob.status === 'FAILED' && resultJob.error) {
      const isOOM = /out of memory|cuda oom|cuda error/i.test(resultJob.error);
      setVideoError({
        message: resultJob.error,
        timestamp: new Date().toLocaleTimeString(),
        isOOM,
        jobId: resultJob.id
      });
    }
  };

  const handleSaveToAssets = () => {
    const targetUrl = activeVideoUrl;
    if (!targetUrl) return;
    setSavingAsset(true);
    const newAsset = {
      id: Math.random().toString(36).substring(2, 9),
      title: `LTX-2.3 Video: ${prompt.slice(0, 30)}...`,
      type: 'video' as const,
      url: targetUrl,
      fileFormat: 'mp4',
      timestamp: new Date().toISOString(),
      promptUsed: prompt,
      workflowId: 'ltx_video',
      seed
    };
    setSavedAssets(prev => [newAsset, ...prev]);
    onAddLog('INFO', 'Video saved to Local Assets library.');
    setTimeout(() => setSavingAsset(false), 600);
  };

  const isVideoJob = job?.workflowId === 'ltx_video' || output?.job?.workflowId === 'ltx_video';
  const isBusy = (loading && (job?.workflowId === 'ltx_video' || !job)) || (job?.workflowId === 'ltx_video' && (job?.status === 'QUEUED' || job?.status === 'RUNNING'));
  const rawUrl = output?.outputs?.[0]?.url;
  const isMediaVideo = rawUrl && (isVideoJob || rawUrl.toLowerCase().includes('format=mp4') || rawUrl.toLowerCase().includes('.mp4') || rawUrl.toLowerCase().includes('.webp') || rawUrl.toLowerCase().includes('.gif'));
  const activeVideoUrl = (isMediaVideo ? rawUrl : undefined) || lastSuccessfulVideoUrl;

  // Persist successful video URL across sessions/jobs
  useEffect(() => {
    if (isMediaVideo && rawUrl) {
      setLastSuccessfulVideoUrl(rawUrl);
    }
  }, [isMediaVideo, rawUrl]);

  // Persist failure state so error remains visible until dismissed or new success
  useEffect(() => {
    if (job?.workflowId === 'ltx_video' && job?.status === 'FAILED' && job?.error) {
      const isOOM = /out of memory|cuda oom|cuda error/i.test(job.error);
      setVideoError({
        message: job.error,
        timestamp: new Date().toLocaleTimeString(),
        isOOM,
        jobId: job.id
      });
    } else if (job?.workflowId === 'ltx_video' && job?.status === 'COMPLETED') {
      setVideoError(null);
    }
  }, [job?.id, job?.status, job?.error, job?.workflowId]);

  const isAnimatedWebPOrGif = Boolean(activeVideoUrl && (
    activeVideoUrl.toLowerCase().includes('.webp') ||
    activeVideoUrl.toLowerCase().includes('.gif') ||
    activeVideoUrl.toLowerCase().includes('format=webp') ||
    activeVideoUrl.toLowerCase().includes('format=gif')
  ));

  return (
    <div className="space-y-6 relative">
      {/* Top Banner Status */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">LTX-2.3 Video Generator</h2>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                22B Distilled FP8
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Strictly local text-to-video workflow tuned for 8 GB VRAM (RTX 3070 Ti).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[10px] font-mono">
          <button
            type="button"
            onClick={() => setShowArchitect(!showArchitect)}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors cursor-pointer font-sans text-xs font-bold border ${
              showArchitect
                ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            {showArchitect ? 'Hide Architect' : 'Workflow Architect'}
          </button>
          <button
            type="button"
            onClick={handleFlushVramHeader}
            disabled={flushingVram}
            className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors cursor-pointer font-sans text-xs font-bold"
            title="Flush intermediate GPU tensors and purge PyTorch CUDA cache"
          >
            <Trash2 className={`w-3.5 h-3.5 ${flushingVram ? 'animate-spin' : ''}`} />
            {flushingVram ? 'Flushing...' : 'Flush VRAM'}
          </button>
          <button
            type="button"
            onClick={runDiagnostic}
            disabled={diagLoading}
            className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors cursor-pointer font-sans text-xs font-bold"
          >
            <Gauge className={`w-3.5 h-3.5 ${diagLoading ? 'animate-spin' : ''}`} />
            {diagLoading ? 'Checking...' : 'Run LTX & Comfy Audit'}
          </button>
          <div className="bg-slate-950 px-3 py-1.5 rounded border border-slate-800 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">FLAGS:</span>
            <span className="text-emerald-400 font-bold">--lowvram --fp8</span>
          </div>
          <div className="bg-slate-950 px-3 py-1.5 rounded border border-slate-800 flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400">VRAM CAGE:</span>
            <span className="text-slate-200">7372 MB Max</span>
          </div>
        </div>
      </div>

      {/* Diagnostic Results Card if active */}
      {diagResult && (
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 font-bold text-slate-200">
              <Gauge className="w-4 h-4 text-emerald-400" />
              LTX-2.3 & COMFYUI DIAGNOSTIC REPORT
            </div>
            <button
              type="button"
              onClick={() => setDiagResult(null)}
              className="text-slate-500 hover:text-slate-300 text-[10px]"
            >
              [Dismiss]
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className={`p-2.5 rounded border ${diagResult.comfyResponsive ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
              <div className="text-[10px] text-slate-400">COMFYUI STATUS</div>
              <div className="font-bold">{diagResult.comfyResponsive ? '✅ RESPONSIVE' : '❌ UNREACHABLE'}</div>
              <div className="text-[9px] text-slate-400 mt-1">{diagResult.comfyUrl} ({diagResult.comfyLatencyMs || 0}ms)</div>
            </div>

            <div className={`p-2.5 rounded border ${diagResult.modelFound ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'}`}>
              <div className="text-[10px] text-slate-400">LTX-2.3 MODEL FILE</div>
              <div className="font-bold">{diagResult.modelFound ? '✅ FOUND ON DISK' : '⚠️ NOT DETECTED'}</div>
              <div className="text-[9px] text-slate-400 mt-1">
                {diagResult.modelPathsChecked?.find((p: any) => p.exists)?.sizeGB ? `${diagResult.modelPathsChecked.find((p: any) => p.exists).sizeGB} GB` : 'Check checkpoints folder'}
              </div>
            </div>

            <div className={`p-2.5 rounded border ${diagResult.modelInComfyObjectInfo ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
              <div className="text-[10px] text-slate-400">COMFYUI RECOGNITION</div>
              <div className="font-bold">{diagResult.modelInComfyObjectInfo ? '✅ RECOGNIZED IN LIST' : 'ℹ️ CHECKPOINT NOT LOADED'}</div>
              <div className="text-[9px] text-slate-400 mt-1">{diagResult.comfyCheckpointsList?.length || 0} checkpoints in ComfyUI list</div>
            </div>
          </div>

          <div className="space-y-1 pt-1 border-t border-slate-900">
            <div className="text-[10px] text-slate-400 font-bold">RECOMMENDATIONS:</div>
            {diagResult.recommendations?.map((r: string, idx: number) => (
              <div key={idx} className="text-[11px] text-slate-300 flex items-start gap-1.5">
                <span className="text-emerald-400">•</span> {r}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LTX Workflow Generator Architect Section */}
      {showArchitect && (
        <LTXWorkflowGenerator onAddLog={onAddLog} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Video Parameter Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* LTX-2.3 Preset Selector */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                LTX-2.3 Parameter Presets
              </label>
              <span className="text-[10px] font-mono text-slate-500">Auto-configures Motion, Duration & Sampling</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {ltxParameterPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={`p-2 rounded border text-left transition-all cursor-pointer ${
                    activePresetId === preset.id
                      ? 'bg-emerald-500/15 border-emerald-400 text-slate-100 shadow-md shadow-emerald-500/10'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold truncate">
                    <span>{preset.icon}</span>
                    <span className="truncate">{preset.name}</span>
                  </div>
                  <div className={`text-[9px] font-mono mt-1 truncate ${activePresetId === preset.id ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {preset.badge}
                  </div>
                </button>
              ))}
            </div>

            {/* Active Preset Description Banner */}
            {activePresetId && (
              <div className="bg-slate-950/80 p-2.5 rounded border border-slate-800 text-[11px] text-slate-400">
                <strong className="text-emerald-400">{ltxParameterPresets.find(p => p.id === activePresetId)?.name}: </strong>
                {ltxParameterPresets.find(p => p.id === activePresetId)?.description}
              </div>
            )}
          </div>

          {/* Prompt Section */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Video Prompt
              </label>
              <button
                type="button"
                onClick={() => setShowNegative(!showNegative)}
                className="text-[10px] text-slate-400 hover:text-slate-200 underline font-mono"
              >
                {showNegative ? 'Hide Negative Prompt' : '+ Add Negative Prompt'}
              </button>
            </div>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="Describe the motion, scene, lighting, camera movement, and subject in detail..."
              className="w-full bg-slate-950 border border-slate-800 rounded-md p-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 custom-scrollbar"
            />

            {showNegative && (
              <div className="space-y-1 pt-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Negative Prompt
                </label>
                <textarea
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  rows={2}
                  placeholder="Things to avoid in motion or aesthetics..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-xs text-slate-300 placeholder-slate-700 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            )}
          </div>

          {/* Video Motion & Timing Parameters */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Duration & Frame Count
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                {customFrames} Frames ({selectedDuration}s @ {fps}fps)
              </span>
            </div>

            {/* Duration Selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-slate-300">Target Duration (8GB VRAM Safe Bounds)</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {durationOptions.map((opt) => (
                  <button
                    key={opt.seconds}
                    type="button"
                    onClick={() => setSelectedDuration(opt.seconds)}
                    className={`p-2.5 rounded border text-left transition-colors ${
                      selectedDuration === opt.seconds
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{opt.seconds}.0 Seconds</div>
                    <div className="text-[9px] font-mono text-slate-500 mt-0.5">{opt.frames} frames</div>
                    <div className={`text-[8px] font-mono mt-1 ${selectedDuration === opt.seconds ? 'text-emerald-400' : 'text-slate-600'}`}>
                      {opt.vram}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Motion Scale Slider */}
            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-sky-400" />
                  Motion Scale / Temporal Intensity
                </label>
                <span className="text-xs font-mono font-bold text-sky-400">{motionScale.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="2.5"
                step="0.1"
                value={motionScale}
                onChange={(e) => setMotionScale(parseFloat(e.target.value))}
                className="w-full accent-sky-400 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                <span>0.2x (Static / Smooth)</span>
                <span>1.0x (Standard Cinematic)</span>
                <span>2.5x (High Dynamic)</span>
              </div>
            </div>

            {/* AI Frame Interpolation (RIFE) Control */}
            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  AI Frame Interpolation (ComfyUI RIFE VFI)
                </label>
                <span className="text-[10px] font-mono font-bold text-emerald-400">
                  {interpolationMultiplier === 1 ? '1× (Native 25fps)' : interpolationMultiplier === 2 ? '2× RIFE (50fps Smooth)' : '4× RIFE (60fps Slomo)'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { mult: 1 as const, label: '1× Off', sub: '25 Raw Frames', badge: '1.0s @ 25fps', safe: true },
                  { mult: 2 as const, label: '2× RIFE Smooth', sub: '50 Interp Frames', badge: '50fps Smooth · 8GB Safe', safe: true },
                  { mult: 4 as const, label: '4× RIFE Slomo', sub: '100 Interp Frames', badge: '60fps Slomo · 8GB Safe', safe: true }
                ].map((item) => (
                  <button
                    key={item.mult}
                    type="button"
                    onClick={() => {
                      setInterpolationMultiplier(item.mult);
                      if (item.mult === 1) setFps(25);
                      if (item.mult === 2) setFps(50);
                      if (item.mult === 4) setFps(60);
                      onAddLog('INFO', `Frame Interpolation set to ${item.label} (${item.badge})`);
                    }}
                    className={`p-2 rounded border text-left transition-colors cursor-pointer ${
                      interpolationMultiplier === item.mult
                        ? 'bg-emerald-500/15 border-emerald-400 text-slate-100 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{item.label}</div>
                    <div className="text-[9px] font-mono text-slate-400 mt-0.5">{item.sub}</div>
                    <div className={`text-[8px] font-mono mt-1 ${interpolationMultiplier === item.mult ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                      {item.badge}
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                💡 <strong className="text-emerald-400">8GB VRAM Superpower:</strong> RIFE computes frames pairwise (consuming only ~1.2GB VRAM), giving you buttery smooth high-frame-rate video without diffusion OOM spikes.
              </p>
            </div>
          </div>

          {/* Resolution & Format */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-3">
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              Resolution & Aspect Ratio
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {videoResolutionPresets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleResolutionChange(preset.label)}
                  className={`p-2.5 rounded border text-left transition-colors ${
                    resolution === preset.label
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold">{preset.width} × {preset.height}</div>
                  <div className="text-[9px] font-mono text-slate-500 mt-0.5">{preset.ratio} Ratio</div>
                  <div className="text-[8px] font-mono text-emerald-400 mt-1">{preset.vram}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Controls Collapsible */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-3">
            <button
              type="button"
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="w-full flex items-center justify-between text-xs font-bold text-slate-300 hover:text-slate-100 uppercase tracking-wider"
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                Advanced Generation Controls (LTX Sampler, Steps, Seed)
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
            </button>

            {advancedOpen && (
              <div className="space-y-4 pt-3 border-t border-slate-800">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Sampling Steps</label>
                    <input
                      type="number"
                      value={steps}
                      onChange={(e) => setSteps(parseInt(e.target.value) || 25)}
                      min={10}
                      max={50}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Guidance / CFG Scale</label>
                    <input
                      type="number"
                      step="0.5"
                      value={cfgScale}
                      onChange={(e) => setCfgScale(parseFloat(e.target.value) || 3.0)}
                      min={1.0}
                      max={10.0}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Seed Control */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-slate-400 font-bold">Seed Control</label>
                    <button
                      type="button"
                      onClick={handleRandomizeSeed}
                      className="text-[9px] font-mono text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Randomize
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={seed}
                      onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setIsRandomSeed(!isRandomSeed)}
                      className={`px-3 py-1.5 rounded text-[10px] font-mono border whitespace-nowrap ${
                        isRandomSeed
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      {isRandomSeed ? 'Random On' : 'Fixed'}
                    </button>
                  </div>
                </div>

                {/* Camera Motion Style */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Camera Motion Preset</label>
                  <select
                    value={cameraMotion}
                    onChange={(e) => setCameraMotion(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Pan Right & Slow Zoom">Pan Right & Slow Zoom</option>
                    <option value="Pan Left & Tilt Up">Pan Left & Tilt Up</option>
                    <option value="Orbital Sweep">Orbital Sweep</option>
                    <option value="Forward Push-In">Forward Push-In</option>
                    <option value="Static Tripod Mount">Static Tripod Mount</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Submit & Stop Generation Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGenerateVideo}
              disabled={isBusy}
              className={`flex-1 py-3.5 px-4 rounded-md font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg ${
                isBusy
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 cursor-pointer'
              }`}
            >
              {isBusy ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating Video ({job?.progress || 0}%)...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-slate-950" />
                  Generate LTX-2.3 Video Locally
                </>
              )}
            </button>

            {isBusy && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="py-3.5 px-4 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-md font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950/50 border border-rose-500/60 cursor-pointer transition-all shrink-0"
                title="Stop generation immediately & clear queue"
              >
                <X className="w-4 h-4 text-white" />
                {cancelling ? 'Stopping...' : 'Stop Job'}
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Video Preview & Output Player (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Film className="w-3.5 h-3.5 text-emerald-400" />
                Video Output Preview
              </label>
              <span className="text-[10px] font-mono text-slate-500">
                {width} × {height} {isAnimatedWebPOrGif ? 'WEBP' : 'MP4'}
              </span>
            </div>

            {/* Persistent Video Error Banner (when a video already exists or above container) */}
            {videoError && (
              <div className="bg-rose-950/70 border border-rose-500/50 rounded-lg p-3 text-rose-200 font-mono text-[11px] space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-rose-300">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{videoError.isOOM ? 'CUDA Out of Memory Error' : 'Local Generation Error'}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-900/60 text-rose-300 border border-rose-800">
                      {videoError.timestamp}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVideoError(null)}
                    className="p-1 hover:bg-rose-900/60 text-rose-400 hover:text-rose-200 rounded transition-colors"
                    title="Dismiss Error"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-[10px] bg-black/40 p-2 rounded border border-rose-900/40 text-rose-300/90 whitespace-pre-wrap max-h-32 overflow-y-auto leading-relaxed">
                  {videoError.message}
                </div>

                {videoError.isOOM && (
                  <div className="text-[10px] text-amber-300/90 flex items-start gap-1.5 bg-amber-950/30 p-2 rounded border border-amber-900/40">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>OOM Recovery:</strong> Switch to <span className="underline font-bold">512 × 512</span> and limit duration to <span className="underline font-bold">1.0s (25 frames)</span> to fit inside the 8GB RTX 3070 Ti VRAM budget.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Video Display Container */}
            <div className="relative aspect-[16/10] bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center">
              {isBusy ? (
                <div className="text-center p-6 space-y-3">
                  <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-200">Processing LTX-2.3 Frames</div>
                    <div className="text-[10px] font-mono text-emerald-400">
                      {job?.status === 'QUEUED' ? 'Queued in local ComfyUI...' : `Rendering ${customFrames} frames (${job?.progress || 0}%)`}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="mt-2 text-[10px] font-bold px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded border border-rose-500 shadow-md inline-flex items-center gap-1.5 cursor-pointer transition-all uppercase tracking-wider"
                  >
                    <X className="w-3.5 h-3.5" />
                    {cancelling ? 'Stopping...' : 'Stop Generation'}
                  </button>
                </div>
              ) : activeVideoUrl ? (
                isAnimatedWebPOrGif ? (
                  <div className="relative w-full h-full flex items-center justify-center bg-black">
                    <img
                      src={activeVideoUrl}
                      alt="Generated LTX-2.3 Video Preview"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[9px] font-mono bg-slate-950/80 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 shadow-lg">
                      <Film className="w-3 h-3 text-emerald-400" />
                      <span>Animated WebP Preview</span>
                    </div>
                  </div>
                ) : (
                  <video
                    key={activeVideoUrl}
                    src={activeVideoUrl}
                    controls
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    className="w-full h-full object-contain bg-black"
                  />
                )
              ) : videoError ? (
                <div className="text-center p-6 space-y-2 text-rose-400">
                  <AlertCircle className="w-10 h-10 mx-auto text-rose-500" />
                  <div className="text-xs font-bold text-rose-300">
                    {videoError.isOOM ? 'CUDA Out of Memory (OOM)' : 'Generation Failed'}
                  </div>
                  <div className="text-[10px] font-mono text-rose-400/90 max-w-sm bg-rose-950/40 p-2.5 rounded border border-rose-900/50 mx-auto text-left whitespace-pre-wrap max-h-24 overflow-y-auto">
                    {videoError.message}
                  </div>
                  <button
                    type="button"
                    onClick={() => setVideoError(null)}
                    className="mt-2 text-[10px] px-2.5 py-1 bg-rose-900/40 hover:bg-rose-900/70 text-rose-200 border border-rose-800 rounded font-sans cursor-pointer transition-colors"
                  >
                    Dismiss Error
                  </button>
                </div>
              ) : (
                <div className="text-center p-6 space-y-2 text-slate-600">
                  <Film className="w-10 h-10 mx-auto opacity-40" />
                  <div className="text-xs font-medium">No video generated yet</div>
                  <div className="text-[10px] text-slate-600 max-w-xs">
                    Set your duration, motion scale, and prompt then click "Generate LTX-2.3 Video Locally".
                  </div>
                </div>
              )}

              {/* Floating Semi-Transparent CUDA OOM Overlay at Bottom-Left */}
              <AnimatePresence>
                {recentOOMErrors.length > 0 && !dismissOOMOverlay && (
                  <motion.div
                    id="video-preview-oom-overlay"
                    className="video-preview-oom-overlay absolute bottom-2 left-2 z-20 max-w-[280px] sm:max-w-xs bg-slate-950/90 backdrop-blur-md border border-red-500/70 rounded-md p-2.5 shadow-2xl shadow-red-950/80 pointer-events-auto"
                    initial={{ opacity: 0, y: 12, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-red-500/40 pb-1.5 mb-1.5">
                      <div className="flex items-center gap-1.5 text-red-400 text-[10px] font-bold uppercase tracking-wide">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-pulse flex-shrink-0" />
                        <span>CUDA OOM Detected ({recentOOMErrors.length})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDismissOOMOverlay(true)}
                        className="text-red-400/80 hover:text-red-200 p-0.5 rounded hover:bg-red-500/20 transition-colors cursor-pointer"
                        title="Dismiss OOM overlay"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      <AnimatePresence initial={false}>
                        {recentOOMErrors.slice(0, 5).map((log, idx) => (
                          <motion.div
                            key={log.id || `oom-${log.timestamp}-${idx}`}
                            className="text-[9.5px] font-mono text-red-300 bg-red-950/60 p-2 rounded border border-red-800/60 leading-snug break-words space-y-1.5"
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8, scale: 0.95 }}
                            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                            layout
                          >
                            <div className="flex items-center justify-between text-[8px] text-red-400 font-sans">
                              <span className="font-semibold">{log.timestamp}</span>
                              <span className="bg-red-900/80 text-red-100 px-1 rounded text-[7.5px] font-bold">OOM #{idx + 1}</span>
                            </div>
                            <p className="text-red-200 font-bold">{log.message}</p>
                            <div className="flex items-center justify-end pt-0.5">
                              <button
                                type="button"
                                onClick={() => handleClearSingleOOM(log, idx)}
                                className="px-2 py-0.5 bg-red-900/50 hover:bg-red-800 text-red-100 border border-red-700/80 rounded text-[8px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm shadow-red-950"
                                title="Acknowledge memory failure and clear log entry"
                              >
                                <Check className="w-2.5 h-2.5 text-red-200" />
                                <span>Clear</span>
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Small Non-Intrusive ComfyUI Error Sentry Overlay */}
              <ComfyErrorOverlay
                externalError={videoError}
                recentOOMErrors={recentOOMErrors}
                onAddLog={onAddLog}
              />
            </div>

            {/* Actions for generated video */}
            {activeVideoUrl && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <a
                    href={activeVideoUrl}
                    download={`ltx_video_${seed}.${isAnimatedWebPOrGif ? 'webp' : 'mp4'}`}
                    className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {isAnimatedWebPOrGif ? 'Download WebP' : 'Download MP4'}
                  </a>

                  <button
                    type="button"
                    onClick={handleSaveToAssets}
                    disabled={savingAsset}
                    className="flex-1 py-2 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingAsset ? 'Saved!' : 'Save to Assets'}
                  </button>
                </div>

                {/* 1-Click MoviePy Multimedia Stitch Button */}
                <button
                  type="button"
                  onClick={() => setShowStitchModal(true)}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-indigo-500/20 via-fuchsia-500/20 to-emerald-500/20 hover:from-indigo-500/30 hover:to-emerald-500/30 text-indigo-200 border border-indigo-500/40 rounded-lg text-[10px] font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-950/40 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                  <span>Stitch with AI Music (MoviePy Engine)</span>
                </button>
              </div>
            )}
          </div>

          {/* VRAM & Hardware Info Note */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3.5 text-[10px] font-mono text-slate-400 space-y-2">
            <div className="flex items-center justify-between text-slate-300 font-bold border-b border-slate-800 pb-1">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" /> 8GB VRAM Hardware Guidance
              </span>
              <span>RTX 3070 Ti</span>
            </div>
            <ul className="space-y-1 list-disc list-inside text-slate-500">
              <li>Keep duration under 4.0s (97 frames) to prevent RAM swapping on 8GB VRAM.</li>
              <li>768 × 512 resolution gives optimal speed and memory balance.</li>
              <li>ComfyUI flags <code className="text-emerald-400">--lowvram --fp8_e4m3fn-text-enc</code> are required.</li>
            </ul>
          </div>

          {telemetry && (
            <VRAMHistoryGraph
              telemetry={telemetry}
              onAddLog={onAddLog}
              onClearCache={onClearCache}
            />
          )}
        </div>
      </div>

      {/* Multimedia MoviePy Video/Audio Stitching Modal */}
      <MediaStitcherModal
        isOpen={showStitchModal}
        onClose={() => setShowStitchModal(false)}
        videoSourceUrl={activeVideoUrl || undefined}
        videoSourceName={prompt ? `LTX: ${prompt.slice(0, 30)}...` : 'LTX-Video Render'}
        onAddLog={onAddLog}
      />
    </div>
  );
};
