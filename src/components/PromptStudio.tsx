import React, { useEffect, useMemo, useState } from 'react';
import {
  Workflow, RefreshCw, Play, Image as ImageIcon, ShieldCheck, Sliders, SlidersHorizontal, Activity,
  ChevronDown, Cpu, Zap, AlertTriangle, Download, Sparkles, Wand2, Save,
  RotateCcw, Info, Maximize2, Trash2, CheckCircle2, Lock, Unlock, Check, CheckSquare,
  Layout, Layers, Monitor, X, Upload, Paperclip, FileImage
} from 'lucide-react';
import { useProjectState } from '../context/ProjectStateContext';
import { useGenerationJob } from '../context/GenerationJobContext';
import { VRAMHistoryGraph } from './VRAMHistoryGraph';
import { SystemTelemetry } from '../types';
import { compositeLayoutOntoImage } from '../utils/aida64LayoutCompiler';

interface PromptStudioProps {
  onAddLog: (level: 'INFO'|'WARN'|'SEC'|'RULE', message: string, ruleId?: string) => void;
  onClearCache?: () => void;
  telemetry?: SystemTelemetry;
  stagedReferenceImage?: { filename: string; name: string; bytes: number; previewUrl: string } | null;
}
interface WorkflowSummary {
  id: string;
  fileName: string;
  nodeCount: number;
  bindings: { key: string; nodeId: string; input: string; classType: string; confidence: string }[];
  capabilities: string[];
  warnings: string[];
  nodes?: any[];
  workflow?: any;
}
interface Control {
  key: string; nodeId: string; input: string; classType: string; confidence: string;
  currentValue?: any; options?: any[]; min?: number; max?: number; step?: number;
}
interface CapabilityData {
  hardware?: { name?: string; memoryTotalMB?: number };
  comfy?: { online?: boolean };
  generators?: any[];
  models?: any[];
}

const ratioOptions = [
  { id: '1:1', label: 'Square', width: 1024, height: 1024 },
  { id: '16:9', label: 'Landscape', width: 1024, height: 576 },
  { id: 'aida64', label: 'AIDA64 Panel', width: 1024, height: 600 },
  { id: '9:16', label: 'Vertical / Shorts', width: 576, height: 1024 },
  { id: '4:3', label: 'Classic', width: 1024, height: 768 },
  { id: '3:4', label: 'Portrait Classic', width: 768, height: 1024 },
];

const resolutionPresets = [
  { label: '512 × 512', width: 512, height: 512, budget: 'LOW', ratio: '1:1' },
  { label: '768 × 768', width: 768, height: 768, budget: 'LOW', ratio: '1:1' },
  { label: '1024 × 1024', width: 1024, height: 1024, budget: 'STANDARD', ratio: '1:1' },
  { label: '1024 × 576', width: 1024, height: 576, budget: 'STANDARD', ratio: '16:9' },
  { label: '1024 × 600', width: 1024, height: 600, budget: 'AIDA64', ratio: 'aida64' },
  { label: '576 × 1024', width: 576, height: 1024, budget: 'STANDARD', ratio: '9:16' },
  { label: '1024 × 768', width: 1024, height: 768, budget: 'STANDARD', ratio: '4:3' },
  { label: '768 × 1024', width: 768, height: 1024, budget: 'STANDARD', ratio: '3:4' },
];

const stylePresets = [
  'None',
  'Cinematic Photorealistic',
  'Editorial Photography',
  'Film Still',
  'Digital Illustration',
  'Anime / Stylized',
];

const humanize = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const isPromptKey = (key: string) => ['prompt','positive_prompt','negative_prompt'].includes(key);
const isDimensionKey = (key: string) => ['width','height'].includes(key);
const isSeedKey = (key: string) => ['seed'].includes(key);
const isAdvancedKey = (key: string) => ['cfg','cfg_scale','guidance','denoise','denoise_strength','batch_size','batch','sampler','sampler_name','scheduler','scheduler_name'].includes(key);

export const PromptStudio: React.FC<PromptStudioProps> = ({ onAddLog, onClearCache, telemetry, stagedReferenceImage }) => {
  const { projectState, updatePromptStudio, updateAiStudio, setSavedAssets, setActiveAida64Layout } = useProjectState();
  const cfg = projectState.promptStudio;
  const activeLayout = projectState.activeAida64Layout;
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  // Ensure default starts with flux_image or image workflow, avoiding video workflow pollution
  const initialWorkflowId = projectState.aiStudio.workflowId && projectState.aiStudio.workflowId !== 'ltx_video'
    ? projectState.aiStudio.workflowId
    : 'flux_image';
  const [selected, setSelected] = useState(initialWorkflowId);
  const [workflow, setWorkflow] = useState<WorkflowSummary | null>(null);
  const { job, output, outputLoading, submitting: loading, startJob, cancelJob } = useGenerationJob();
  const [controls, setControls] = useState<Control[]>([]);
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [capabilities, setCapabilities] = useState<CapabilityData | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [technicalOpen, setTechnicalOpen] = useState(false);
  const [resolution, setResolution] = useState('1024 × 600');
  const [customSize, setCustomSize] = useState(false);
  const [showNegative, setShowNegative] = useState(false);
  const [saving, setSaving] = useState(false);
  const [purgingVram, setPurgingVram] = useState(false);
  const [fusingLayout, setFusingLayout] = useState(false);
  const [autoFuseEnabled, setAutoFuseEnabled] = useState(true);
  const [dimBaseImage, setDimBaseImage] = useState(0.35);
  const [showConduits, setShowConduits] = useState(true);
  const [showHexBolts, setShowHexBolts] = useState(true);
  const [showFusionOptions, setShowFusionOptions] = useState(false);
  const [livePanelOpen, setLivePanelOpen] = useState(true);
  const [fullWorkflowOpen, setFullWorkflowOpen] = useState(false);
  const [liveEvents, setLiveEvents] = useState<Array<{timestamp:string;event:string;payload:any}>>([]);
  const [resolvedWorkflow, setResolvedWorkflow] = useState<Record<string, any> | null>(null);

  // Seed lock / Keep image mode
  const [lockSeed, setLockSeed] = useState<boolean>(false);
  const [keptSeed, setKeptSeed] = useState<number | null>(null);
  const [keptImageUrl, setKeptImageUrl] = useState<string | null>(null);
  const [keepNotification, setKeepNotification] = useState<string | null>(null);
  const [promotingImage, setPromotingImage] = useState(false);

  // Local reference-image input for ComfyUI workflows that expose LoadImage.
  const [referenceImage, setReferenceImage] = useState<{ filename: string; name: string; bytes: number; previewUrl: string } | null>(null);

  useEffect(() => {
    if (stagedReferenceImage) {
      setReferenceImage(stagedReferenceImage);
      onAddLog('INFO', `AIDA64 template guide attached as the visual reference: ${stagedReferenceImage.name}.`);
    }
  }, [stagedReferenceImage]);
  const [uploadingReference, setUploadingReference] = useState(false);
  const [referenceUploadError, setReferenceUploadError] = useState<string | null>(null);
  const referenceFileInputRef = React.useRef<HTMLInputElement | null>(null);

  const loadWorkflows = async () => {
    try {
      const r = await fetch('/api/workflows', { cache: 'no-store' });
      const data = await r.json();
      const list: WorkflowSummary[] = data.workflows || [];
      setWorkflows(list);
      // Prioritize flux_image or image-generating workflows for Creator Studio
      const fluxWf = list.find(w => w.id === 'flux_image');
      const imageWf = list.find(w => w.id.includes('flux') || w.id.includes('image') || !w.id.includes('video'));
      if (!selected || selected === 'ltx_video') {
        setSelected(fluxWf?.id || imageWf?.id || list[0]?.id || 'flux_image');
      }
    } catch (e:any) { onAddLog('WARN', `Workflow registry unavailable: ${e.message}`); }
  };

  const loadCapabilities = async () => {
    try {
      const r = await fetch('/api/capabilities', { cache: 'no-store' });
      if (r.ok) setCapabilities(await r.json());
    } catch (e:any) { onAddLog('WARN', `Local capability map unavailable: ${e.message}`); }
  };

  useEffect(() => { loadWorkflows(); loadCapabilities(); }, []);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    Promise.all([
      fetch(`/api/workflows/${encodeURIComponent(selected)}`, { cache: 'no-store' }).then(r => r.json()),
      fetch(`/api/workflows/${encodeURIComponent(selected)}/controls`, { cache: 'no-store' }).then(r => r.json())
    ]).then(([definition, controlData]) => {
      if (cancelled) return;
      setWorkflow(definition);
      const list: Control[] = controlData.controls || [];
      setControls(list);
      const initial: Record<string, any> = {};
      list.forEach(c => { if (c.currentValue !== undefined && c.currentValue !== null) initial[c.key] = c.currentValue; });
      setParameters(prev => {
        const merged = { ...initial };
        // Keep only explicit prompt-studio values that are not workflow-owned controls.
        // This prevents stale localStorage values (e.g. 512×512) from silently
        // disagreeing with the actual ComfyUI workflow (1024×600 AIDA64 baseline).
        for (const [key, value] of Object.entries(prev)) {
          if (!['width','height','steps','sampler','sampler_name','scheduler','scheduler_name','denoise','batch_size','seed'].includes(key)) merged[key] = value;
        }
        if (activeLayout?.screen?.width === 1024 && activeLayout?.screen?.height === 600) { merged.width = 1024; merged.height = 600; }
        return merged;
      });
      const preferredWidth = activeLayout?.screen?.width === 1024 && activeLayout?.screen?.height === 600 ? 1024 : Number(initial.width || 1024);
      const preferredHeight = activeLayout?.screen?.width === 1024 && activeLayout?.screen?.height === 600 ? 600 : Number(initial.height || 576);
      const width = preferredWidth;
      const height = preferredHeight;
      if (activeLayout?.screen?.width === 1024 && activeLayout?.screen?.height === 600) { updatePromptStudio({ aspectRatio: 'aida64' }); }
      const preset = resolutionPresets.find(p => p.width === width && p.height === height);
      if (preset) updatePromptStudio({ aspectRatio: preset.ratio });
      setResolution(preset?.label || `${width} × ${height}`);
      setCustomSize(!preset);
    }).catch(() => { if (!cancelled) { setWorkflow(null); setControls([]); } });
    updateAiStudio({ workflowId: selected });
    return () => { cancelled = true; };
  }, [selected, activeLayout, updatePromptStudio]);

  const dimensionControls = useMemo(() => controls.filter(c => isDimensionKey(c.key)), [controls]);
  const visibleControls = useMemo(() => controls.filter(c => !isPromptKey(c.key) && !isDimensionKey(c.key)), [controls]);
  const basicControls = useMemo(() => visibleControls.filter(c => !isAdvancedKey(c.key) && !isSeedKey(c.key)), [visibleControls]);
  const advancedControls = useMemo(() => visibleControls.filter(c => isAdvancedKey(c.key) && !c.key.startsWith('node_')), [visibleControls]);
  const genericWorkflowControls = useMemo(() => visibleControls.filter(c => c.key.startsWith('node_')), [visibleControls]);
  const seedControl = useMemo(() => controls.find(c => isSeedKey(c.key)), [controls]);
  const inputImageControl = useMemo(() => controls.find(c => c.key === 'input_image'), [controls]);
  const hasPrompt = controls.some(c => ['prompt','positive_prompt'].includes(c.key));
  const hasNegativePrompt = controls.some(c => c.key === 'negative_prompt');
  const hasDimensions = dimensionControls.length > 0;
  const hasAdvanced = advancedControls.length > 0 || !!seedControl;
  const hasGenericWorkflowControls = genericWorkflowControls.length > 0;
  const online = capabilities?.comfy?.online !== false;
  const gpuName = capabilities?.hardware?.name || 'Local NVIDIA GPU';
  const vram = capabilities?.hardware?.memoryTotalMB ? `${(capabilities.hardware.memoryTotalMB / 1024).toFixed(1)} GB` : '8 GB';
  const workflowModelNode = workflow?.nodes?.find((n:any) => ['UnetLoaderGGUF','UNETLoader','CheckpointLoaderSimple','CheckpointLoader'].includes(n.classType));
  const workflowModelKey = workflowModelNode ? (workflowModelNode.inputs?.unet_name !== undefined ? `node_${workflowModelNode.id}_unet_name` : workflowModelNode.inputs?.ckpt_name !== undefined ? `node_${workflowModelNode.id}_ckpt_name` : `node_${workflowModelNode.id}_model_name`) : '';
  const workflowModelValue = (workflowModelKey && parameters[workflowModelKey] !== undefined ? parameters[workflowModelKey] : (workflowModelNode?.inputs?.unet_name || workflowModelNode?.inputs?.ckpt_name || workflowModelNode?.inputs?.model_name || 'Not exposed'));
  const workflowModelLabel = workflowModelValue === 'flux1-schnell-Q4_K_S.gguf' ? 'FLUX.1-Schnell GGUF Q4_K_S' : String(workflowModelValue);

  const selectedRatio = cfg.aspectRatio || 'aida64';
  const ratio = ratioOptions.find(r => r.id === selectedRatio) || ratioOptions[1];
  const availableResolutions = resolutionPresets.filter(p => p.ratio === selectedRatio);
  const isImageJob = !job?.workflowId || job?.workflowId === 'flux_image' || output?.job?.workflowId === 'flux_image';
  const rawOutput = output?.outputs?.[0]?.url;
  const isMediaImage = rawOutput && (isImageJob || rawOutput.toLowerCase().includes('.png') || rawOutput.toLowerCase().includes('.jpg') || rawOutput.toLowerCase().includes('.jpeg'));
  const activeOutput = isMediaImage ? rawOutput : undefined;
  const isBusy = loading || job?.status === 'QUEUED' || job?.status === 'RUNNING';

  useEffect(() => {
    if (!job?.id) { setLiveEvents([]); setResolvedWorkflow(null); return; }
    let cancelled = false;
    let timer: any = null;
    const refreshRuntime = async () => {
      try {
        const [historyRes, workflowRes] = await Promise.all([
          fetch(`/api/jobs/${encodeURIComponent(job.id)}/events/history`, { cache:'no-store' }),
          fetch(`/api/jobs/${encodeURIComponent(job.id)}/workflow`, { cache:'no-store' })
        ]);
        if (cancelled) return;
        if (historyRes.ok) { const data = await historyRes.json(); setLiveEvents(Array.isArray(data.events) ? data.events : []); }
        if (workflowRes.ok) { const data = await workflowRes.json(); setResolvedWorkflow(data.workflow || null); }
        if (!isBusy && (historyRes.status === 404 || workflowRes.status === 404)) {
          if (timer) clearInterval(timer);
        }
      } catch {}
    };
    refreshRuntime();
    timer = setInterval(refreshRuntime, isBusy ? 500 : 3000);
    return () => { cancelled = true; if (timer) clearInterval(timer); };
  }, [job?.id, isBusy]);

  const setPrompt = (v:string) => updatePromptStudio({ promptInput: v });
  const setNegativePrompt = (v:string) => updatePromptStudio({ negativePrompt: v });

  const applyRatio = (value: string) => {
    updatePromptStudio({ aspectRatio: value });
    const matching = resolutionPresets.find(p => p.ratio === value && p.budget === 'STANDARD') || resolutionPresets.find(p => p.ratio === value);
    if (matching) {
      setResolution(matching.label);
      setCustomSize(false);
      setParameters(p => ({
        ...p,
        ...(dimensionControls.some(c=>c.key==='width') ? { width: matching.width } : {}),
        ...(dimensionControls.some(c=>c.key==='height') ? { height: matching.height } : {})
      }));
    }
  };

  const applyResolution = (value: string) => {
    setResolution(value);
    const preset = resolutionPresets.find(p => p.label === value);
    if (!preset) return;
    setCustomSize(false);
    setParameters(p => ({
      ...p,
      ...(dimensionControls.some(c=>c.key==='width') ? { width: preset.width } : {}),
      ...(dimensionControls.some(c=>c.key==='height') ? { height: preset.height } : {})
    }));
  };

  const updateControl = (key: string, value: any) => setParameters(prev => ({ ...prev, [key]: value }));

  const randomizeSeed = () => {
    if (!seedControl) return;
    updateControl(seedControl.key, Math.floor(Math.random() * 2147483647));
  };

  const renderControl = (c: Control) => {
    const value = parameters[c.key] ?? c.currentValue ?? '';
    const options = c.options?.filter(o => typeof o === 'string' || typeof o === 'number') || [];
    return <label key={`${c.key}-${c.nodeId}`} className="text-[9px] text-slate-500 uppercase font-bold">
      {humanize(c.key)}
      <span className="block mt-1">
        {options.length ? <select value={value} onChange={e=>updateControl(c.key, e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-[10px] text-slate-200 normal-case font-mono focus:outline-none focus:border-emerald-500/50">{options.map(o=><option key={String(o)} value={o}>{String(o)}</option>)}</select>
        : typeof value === 'boolean' ? <input type="checkbox" checked={value} onChange={e=>updateControl(c.key, e.target.checked)} className="mt-2" />
        : typeof value === 'string' ? <input type="text" value={value} onChange={e=>updateControl(c.key, e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-[10px] text-slate-200 normal-case font-mono focus:outline-none focus:border-emerald-500/50" />
        : <input type="number" value={value} min={c.min} max={c.max} step={c.step ?? 1} onChange={e=>updateControl(c.key, e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-[10px] text-slate-200 normal-case font-mono focus:outline-none focus:border-emerald-500/50" />}
      </span>
    </label>;
  };

  const handleReferenceImage = async (file?: File) => {
    if (!file) return;
    const allowed = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/bmp', 'image/gif']);
    const extension = `.${file.name.split('.').pop()?.toLowerCase() || ''}`;
    const allowedExtensions = new Set(['.png','.jpg','.jpeg','.webp','.bmp','.gif']);
    const maxBytes = 12 * 1024 * 1024;
    if (!allowed.has(file.type) && !allowedExtensions.has(extension)) {
      setReferenceUploadError('Supported image types: PNG, JPG/JPEG, WEBP, BMP and GIF.');
      return;
    }
    if (file.size > maxBytes) {
      setReferenceUploadError('Image is too large. Maximum local upload size is 12 MB.');
      return;
    }

    setUploadingReference(true);
    setReferenceUploadError(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Unable to read the selected image.'));
        reader.onload = () => resolve(String(reader.result || ''));
        reader.readAsDataURL(file);
      });

      const response = await fetch('/api/comfy/upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'X-Gina-Filename': encodeURIComponent(file.name),
          'X-Gina-Mime': file.type || 'application/octet-stream'
        },
        body: await file.arrayBuffer()
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok || !data.filename) {
        throw new Error(data.error || `Local image upload failed (HTTP ${response.status}).`);
      }

      setReferenceImage({
        filename: data.filename,
        name: file.name,
        bytes: Number(data.bytes || file.size),
        previewUrl: dataUrl
      });
      onAddLog('INFO', `Uploaded local reference image "${file.name}" to ComfyUI input.`);
    } catch (error: any) {
      setReferenceUploadError(error?.message || 'Local image upload failed.');
      onAddLog('WARN', `Reference image upload failed: ${error?.message || 'unknown error'}`);
    } finally {
      setUploadingReference(false);
      if (referenceFileInputRef.current) referenceFileInputRef.current.value = '';
    }
  };

  const handlePurgeVram = async () => {
    setPurgingVram(true);
    try {
      if (onClearCache) {
        onClearCache();
      } else {
        await fetch('/api/comfy/clear-cache', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ unload_models: true, free_memory: true })
        });
      }
      onAddLog('SEC', 'Flushed VRAM cache & unloaded background models. GPU VRAM is now ready for Flux synthesis.', 'RULE_VRAM_PURGE');
    } catch (e: any) {
      onAddLog('WARN', `Failed to purge VRAM: ${e?.message || 'Error'}`);
    } finally {
      setPurgingVram(false);
    }
  };

  const handleResetFluxPreset = () => {
    setSelected('flux_image');
    setResolution('1024 × 600');
    setCustomSize(false);
    updatePromptStudio({
      targetNetwork: 'FLUX.1-Schnell (GGUF Q4_K_S)',
      aspectRatio: 'aida64',
      stylePreset: 'Cinematic Photorealistic'
    });
    onAddLog('INFO', 'Reset Creator Workspace to FLUX.1-Schnell GGUF AIDA64 defaults (1024×600).');
  };

  const handleKeepImage = async () => {
    if (!activeOutput || !job) return;
    setPromotingImage(true);
    setKeepNotification('Importing generated image as the next reference…');
    try {
      const response = await fetch('/api/comfy/promote-output', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id, outputIndex: 0 })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok || !data.filename) {
        throw new Error(data.error || `Failed to import generated image (HTTP ${response.status}).`);
      }

      const currentActiveSeed = typeof parameters[seedControl?.key || 'seed'] === 'number'
        ? parameters[seedControl?.key || 'seed']
        : (typeof job.parameters?.seed === 'number' ? job.parameters.seed : null);

      // A generated output is now a real ComfyUI input image, not merely a seed lock.
      setReferenceImage({
        filename: data.filename,
        name: `gina-generated-${job.id.slice(0, 8)}.png`,
        bytes: Number(data.bytes || 0),
        previewUrl: activeOutput
      });
      setKeptSeed(currentActiveSeed);
      setKeptImageUrl(activeOutput);
      setLockSeed(true);

      // If the current workflow cannot consume an input image, switch to Gina's
      // validated FLUX reference workflow so the promoted image actually affects the next run.
      if (!inputImageControl) {
        const referenceWorkflow = workflows.find(w => w.id === 'flux_image_reference');
        if (referenceWorkflow) setSelected(referenceWorkflow.id);
      }
      setKeepNotification('Image imported as the active reference. The next generation will work from its pixels.');
      onAddLog('INFO', `Promoted generated image ${job.id.slice(0, 8)} to ComfyUI input ${data.filename}. Next generation will use the image as a real reference${inputImageControl ? '' : ' via flux_image_reference'}.`);
    } catch (error: any) {
      setKeepNotification(null);
      onAddLog('WARN', `Could not make generated image the next reference: ${error?.message || 'unknown error'}`);
    } finally {
      setPromotingImage(false);
    }
    setTimeout(() => setKeepNotification(null), 5000);
  };

  const handleUnlockImage = () => {
    setLockSeed(false);
    setKeptSeed(null);
    setKeptImageUrl(null);
    setKeepNotification('Image unlocked. Random seeds active for new diverse concepts.');
    onAddLog('INFO', 'Unlocked seed. Subsequent generations will explore new distinct image variations.');
    setTimeout(() => setKeepNotification(null), 3000);
  };

  const generate = async () => {
    if (!cfg.promptInput.trim() || !selected) return;
    const bound: Record<string, any> = { ...parameters };
    const promptControl = controls.find(c => ['prompt','positive_prompt'].includes(c.key));

    // Automated prompt sanitization: strips words that cause Flux to hallucinate dials, needles, or text
    let cleanPrompt = cfg.promptInput;
    if (cleanPrompt.toLowerCase().includes('aida64') || cleanPrompt.toLowerCase().includes('chassis') || cleanPrompt.toLowerCase().includes('telemetry')) {
      cleanPrompt = cleanPrompt
        .replace(/\b(remove|without|no|delete|omit)\s+(numbers?|needles?|text|words?|digits?|gauges?|speedometers?)\b/gi, '')
        .replace(/\b(speedometers?|tachometers?|speedo|rev counter|gauge needles?|pointer needles?)\b/gi, 'dark socket')
        .replace(/\b(numbers?|readouts?|digits?)\b/gi, 'blank dark slot')
        .replace(/\s{2,}/g, ' ')
        .trim();
    }

    if (promptControl) bound[promptControl.key] = cleanPrompt;
    if (inputImageControl && referenceImage) bound[inputImageControl.key] = referenceImage.filename;
    if (hasNegativePrompt && cfg.negativePrompt) bound.negative_prompt = cfg.negativePrompt;
    else if (hasNegativePrompt) bound.negative_prompt = '';
    const preset = resolutionPresets.find(p => p.label === resolution);
    if (preset) {
      if (dimensionControls.some(c=>c.key==='width')) bound.width = preset.width;
      if (dimensionControls.some(c=>c.key==='height')) bound.height = preset.height;
    }

    // Seed logic: If seed is not locked, generate a completely new random seed so every click yields a fresh, unique image
    if (seedControl) {
      if (lockSeed && keptSeed !== null) {
        bound[seedControl.key] = keptSeed;
        updateControl(seedControl.key, keptSeed);
      } else {
        const freshSeed = Math.floor(Math.random() * 2147483647);
        bound[seedControl.key] = freshSeed;
        updateControl(seedControl.key, freshSeed);
      }
    }

    if (selected === 'flux_image') {
      const promptBinding = controls.find(c => ['prompt','positive_prompt'].includes(c.key));
      const steps = controls.find(c => c.key === 'steps');
      onAddLog('INFO', `FLUX text-to-image: prompt bound to #${promptBinding?.nodeId ?? '?'} ${promptBinding?.input ?? 'text'}; ${String(bound[promptBinding?.key || 'prompt'] || '').slice(0, 180)}; steps=${bound[steps?.key || 'steps'] ?? 'workflow default'}; reference=none.`);
    }
    onAddLog('INFO', `Submitting local workflow '${selected}' to ComfyUI (Seed: ${bound.seed ?? 'auto'}).`);
    await startJob(selected, bound);
  };

  const saveAsset = async () => {
    if (!activeOutput || !job) return;
    setSaving(true);
    const asset = {
      id: `asset-${Date.now()}`,
      title: `Gina image ${new Date().toLocaleString()}`,
      type: 'image' as const,
      url: activeOutput,
      fileFormat: 'PNG',
      timestamp: new Date().toISOString(),
      promptUsed: cfg.promptInput,
      jobId: job.id,
      workflowId: job.workflowId,
      seed: typeof job.parameters?.seed === 'number' ? job.parameters.seed : undefined,
    };
    try {
      const response = await fetch('/api/assets', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(asset) });
      const data = await response.json().catch(()=>({}));
      if (!response.ok || !data.ok) throw new Error(data.error || `HTTP ${response.status}`);
      setSavedAssets(prev => [data.asset, ...prev.filter(a => a.id !== data.asset.id)]);
      onAddLog('INFO', `Saved generated image ${data.asset.id} to the persistent Gina asset library.`);
    } catch (error:any) {
      setSavedAssets(prev => [asset, ...prev]);
      onAddLog('WARN', `Server asset persistence failed; kept local copy: ${error?.message || 'unknown error'}`);
    }
    setSaving(false);
  };


  const handleFuseTemplateLayout = async () => {
    if (!activeOutput || !activeLayout) return;
    setFusingLayout(true);
    try {
      onAddLog('INFO', `Fusing AIDA64 template layout (${activeLayout.screen.width}x${activeLayout.screen.height}, ${activeLayout.items.length} items) onto image at exact coordinates.`);
      const fusedUrl = await compositeLayoutOntoImage(
        activeOutput,
        activeLayout.screen,
        activeLayout.items,
        activeLayout.themeId,
        {
          dimBaseImage,
          showConduits,
          showHexBolts,
          showTickMarks: true
        }
      );
      setKeptImageUrl(fusedUrl);
      
      const asset = {
        id: `fused-layout-${Date.now()}`,
        title: `AIDA64 Fused Image ${activeLayout.screen.width}x${activeLayout.screen.height}`,
        type: 'image' as const,
        url: fusedUrl,
        fileFormat: 'PNG',
        timestamp: new Date().toISOString(),
        promptUsed: cfg.promptInput
      };
      setSavedAssets(prev => [asset, ...prev]);
      onAddLog('INFO', `Saved fused template image ${asset.id} to library with exact dial coordinates.`);
    } catch (err: any) {
      onAddLog('WARN', `Failed to fuse layout onto image: ${err.message}`);
    } finally {
      setFusingLayout(false);
    }
  };

  const downloadOutput = () => {
    if (!activeOutput) return;
    const a = document.createElement('a');
    a.href = activeOutput;
    a.download = `gina-${job?.id?.slice(0,8) || 'image'}.png`;
    a.target = '_blank';
    document.body.appendChild(a); a.click(); a.remove();
  };

  const variation = async () => {
    if (!cfg.promptInput.trim() || !selected) return;
    const bound: Record<string, any> = { ...parameters };
    const promptControl = controls.find(c => ['prompt','positive_prompt'].includes(c.key));
    if (promptControl) bound[promptControl.key] = cfg.promptInput;
    if (inputImageControl && referenceImage) bound[inputImageControl.key] = referenceImage.filename;
    if (hasNegativePrompt) bound.negative_prompt = cfg.negativePrompt || '';
    if (dimensionControls.some(c=>c.key==='width')) bound.width = Number(parameters.width || ratio.width);
    if (dimensionControls.some(c=>c.key==='height')) bound.height = Number(parameters.height || ratio.height);
    const freshSeed = Math.floor(Math.random() * 2147483647);
    if (seedControl) {
      bound[seedControl.key] = freshSeed;
      updateControl(seedControl.key, freshSeed);
    }
    await startJob(selected, bound);
  };

  const statusLabel = job?.status === 'COMPLETED'
    ? (outputLoading ? 'FINALISING OUTPUT' : 'COMPLETED')
    : job?.status || 'READY';

  return <section className="bg-[#181818] border border-[#2d2d2d] rounded-2xl overflow-hidden mb-5 shadow-2xl">
    <div className="px-4 py-3 border-b border-[#303030] bg-[#202020] flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center"><Sparkles className="w-4 h-4 text-emerald-400"/></div>
        <div><h2 className="text-sm font-bold text-white tracking-wide">GINA IMAGE STUDIO</h2><p className="text-[9px] text-zinc-500">Fooocus-inspired focused creation · local ComfyUI · FLUX.1-Schnell GGUF</p></div>
      </div>
      <div className="flex items-center gap-2 text-[9px] font-mono">
        <span className={`px-2 py-1 rounded-md border ${online?'border-emerald-500/30 text-emerald-300 bg-emerald-500/10':'border-rose-500/30 text-rose-300 bg-rose-500/10'}`}>{online?'● READY':'● OFFLINE'}</span>
        <span className="hidden sm:inline px-2 py-1 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-400">{gpuName} · {vram}</span>
      </div>
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] min-h-[650px]">
      <div className="bg-[#121212] p-4 md:p-5 order-2 xl:order-1">
        <div className="mb-4">
          <label className="text-[9px] text-zinc-500 uppercase tracking-[0.18em] font-bold">Prompt</label>
          <textarea rows={5} value={cfg.promptInput} onChange={e=>setPrompt(e.target.value)}
            placeholder="Describe the image you want to create…"
            disabled={!hasPrompt}
            className="mt-2 w-full bg-[#202020] border border-[#3a3a3a] focus:border-emerald-500/60 rounded-xl p-3.5 text-sm text-zinc-100 leading-6 outline-none resize-none placeholder:text-zinc-600 disabled:opacity-40"/>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          <label className="text-[9px] text-zinc-500 uppercase font-bold">Aspect ratio
            <select value={selectedRatio} onChange={e=>applyRatio(e.target.value)} disabled={!hasDimensions}
              className="mt-1.5 w-full bg-[#202020] border border-[#383838] rounded-lg px-2.5 py-2.5 text-[10px] text-zinc-200 outline-none">
              {ratioOptions.map(r=><option key={r.id} value={r.id}>{r.id} · {r.label}</option>)}
            </select>
          </label>
          <label className="text-[9px] text-zinc-500 uppercase font-bold">Image size
            <select value={resolution} onChange={e=>applyResolution(e.target.value)} disabled={!hasDimensions || customSize}
              className="mt-1.5 w-full bg-[#202020] border border-[#383838] rounded-lg px-2.5 py-2.5 text-[10px] text-zinc-200 outline-none">
              {availableResolutions.map(p=><option key={p.label} value={p.label}>{p.label}</option>)}
              {customSize && <option value={resolution}>{resolution} · CUSTOM</option>}
            </select>
          </label>
          <label className="text-[9px] text-zinc-500 uppercase font-bold">Style
            <select value={cfg.stylePreset || 'None'} onChange={e=>updatePromptStudio({stylePreset:e.target.value})}
              className="mt-1.5 w-full bg-[#202020] border border-[#383838] rounded-lg px-2.5 py-2.5 text-[10px] text-zinc-200 outline-none">
              {stylePresets.map(x=><option key={x}>{x}</option>)}
            </select>
          </label>
          <div className="text-[9px] text-zinc-500 uppercase font-bold">Engine
            <div className="mt-1.5 px-2.5 py-2.5 rounded-lg bg-[#202020] border border-emerald-500/25 text-emerald-300 font-mono truncate" title={String(workflowModelValue)}>{workflowModelLabel}</div>
          </div>
        </div>

        <div className="bg-[#1b1b1b] border border-[#303030] rounded-xl p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[9px] text-zinc-400 uppercase tracking-widest font-bold flex items-center gap-2"><ImageIcon className="w-3.5 h-3.5 text-emerald-400"/> Image input</div>
            <span className="text-[8px] text-zinc-600 font-mono">OPTIONAL · LOCAL ONLY</span>
          </div>
          <input ref={referenceFileInputRef} type="file" accept=".png,.jpg,.jpeg,.webp,.bmp,.gif,image/png,image/jpeg,image/webp,image/bmp,image/gif" className="hidden" onChange={e=>void handleReferenceImage(e.target.files?.[0])}/>
          {!referenceImage ? (
            <button type="button" onClick={()=>referenceFileInputRef.current?.click()} disabled={uploadingReference}
              className="w-full rounded-lg border border-dashed border-[#494949] hover:border-emerald-500/50 bg-[#151515] py-3.5 text-center disabled:opacity-50">
              <Upload className="w-4 h-4 mx-auto text-zinc-500 mb-1"/><div className="text-[9px] text-zinc-300 font-bold">{uploadingReference?'UPLOADING…':'DROP / CHOOSE REFERENCE IMAGE'}</div><div className="text-[8px] text-zinc-600 mt-1">PNG · JPG · WEBP · BMP · GIF · 12 MB MAX</div>
            </button>
          ) : (
            <div className="flex items-center gap-3 bg-[#151515] rounded-lg border border-[#333] p-2">
              <img src={referenceImage.previewUrl} className="w-14 h-14 rounded object-cover" alt="Reference"/>
              <div className="min-w-0 flex-1"><div className="text-[10px] text-zinc-200 font-bold truncate">{referenceImage.name}</div><div className="text-[8px] text-zinc-600 font-mono">{(referenceImage.bytes/1024/1024).toFixed(2)} MB</div><div className="text-[8px] text-emerald-400 mt-1">{inputImageControl?'READY FOR WORKFLOW':'UPLOADED — REFERENCE WORKFLOW REQUIRED'}</div></div>
              <button type="button" onClick={()=>setReferenceImage(null)} className="p-1.5 text-zinc-500 hover:text-rose-300"><X className="w-3.5 h-3.5"/></button>
            </div>
          )}
          {referenceUploadError && <div className="mt-2 p-2 rounded bg-rose-500/5 border border-rose-500/20 text-[8px] text-rose-300">{referenceUploadError}</div>}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <button type="button" onClick={()=>setShowNegative(v=>!v)} className="px-3 py-2 rounded-lg bg-[#202020] border border-[#343434] text-[9px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5"><ChevronDown className={`w-3 h-3 ${showNegative?'rotate-180':''}`}/> Negative prompt</button>
          <button type="button" onClick={()=>setAdvancedOpen(v=>!v)} className="px-3 py-2 rounded-lg bg-[#202020] border border-[#343434] text-[9px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5"><SlidersHorizontal className="w-3 h-3"/> Advanced</button>
          <button type="button" onClick={()=>setTechnicalOpen(v=>!v)} className="px-3 py-2 rounded-lg bg-[#202020] border border-[#343434] text-[9px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5"><Info className="w-3 h-3"/> Technical</button>
          <button type="button" onClick={handleResetFluxPreset} className="px-3 py-2 rounded-lg bg-[#202020] border border-[#343434] text-[9px] text-zinc-400 hover:text-emerald-300 flex items-center gap-1.5"><RotateCcw className="w-3 h-3"/> Reset FLUX preset</button>
        </div>

        {showNegative && hasNegativePrompt && <textarea rows={3} value={cfg.negativePrompt} onChange={e=>setNegativePrompt(e.target.value)} placeholder="Optional things to avoid…" className="mb-4 w-full bg-[#202020] border border-[#3a3a3a] rounded-xl p-3 text-[10px] text-zinc-300 outline-none resize-none"/>}

        {advancedOpen && <div className="mb-4 bg-[#1b1b1b] border border-[#303030] rounded-xl p-3.5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {seedControl && <label className="text-[9px] text-zinc-500 uppercase font-bold">Seed
              <span className="block mt-1 relative"><input type="number" value={parameters[seedControl.key] ?? seedControl.currentValue ?? ''} min={0} max={2147483647} onChange={e=>updateControl(seedControl.key,Number(e.target.value))} className="w-full bg-[#151515] border border-[#383838] rounded-lg px-2.5 py-2 text-[10px] text-zinc-200 font-mono pr-8"/><button type="button" onClick={randomizeSeed} className="absolute right-1 top-1 p-1 text-zinc-500 hover:text-emerald-400"><RotateCcw className="w-3 h-3"/></button></span>
            </label>}
            {basicControls.map(renderControl)}
          </div>
          {hasAdvanced && <div className="mt-3 pt-3 border-t border-[#303030] grid grid-cols-2 md:grid-cols-3 gap-3">{advancedControls.map(renderControl)}</div>}
        </div>}

        {customSize && hasDimensions && <div className="mb-4 flex flex-wrap gap-3 text-[9px] text-zinc-500">
          {dimensionControls.map(c=><label key={c.key} className="flex items-center gap-2 uppercase">{c.key}<input type="number" value={parameters[c.key]??c.currentValue??''} min={c.min} max={c.max} step={c.step??8} onChange={e=>updateControl(c.key,Number(e.target.value))} className="w-20 bg-[#202020] border border-[#383838] rounded px-2 py-1.5 text-zinc-300"/></label>)}
        </div>}

        {activeLayout && <div className="mb-4 bg-sky-500/5 border border-sky-500/20 rounded-xl p-3">
          <div className="flex items-center justify-between"><div className="text-[9px] text-sky-300 font-bold uppercase tracking-widest">AIDA64 template locked</div><button onClick={()=>setActiveAida64Layout(null)} className="text-zinc-600 hover:text-zinc-200"><X className="w-3 h-3"/></button></div>
          <div className="text-[9px] text-zinc-500 mt-1 font-mono">{activeLayout.screen.width}×{activeLayout.screen.height} · {activeLayout.items.length} mapped sockets · exact layout fusion available after generation</div>
        </div>}

        <div className="flex gap-2">
          <button onClick={generate} disabled={isBusy || promotingImage || !selected || !cfg.promptInput.trim() || !hasPrompt || !online || (!!inputImageControl && !referenceImage)}
            className="flex-1 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-black text-xs tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10">
            <Play className="w-4 h-4 fill-current"/>{loading?'SUBMITTING…':isBusy?'GENERATING…':'GENERATE'}
          </button>
          <button type="button" onClick={handlePurgeVram} disabled={purgingVram} className="px-4 rounded-xl bg-[#242424] border border-[#3a3a3a] text-[9px] text-zinc-300 hover:text-amber-300" title="Purge ComfyUI VRAM"><Trash2 className="w-4 h-4 mx-auto"/><span className="block mt-1">{purgingVram?'…':'VRAM'}</span></button>
          {isBusy && <button type="button" onClick={cancelJob} className="px-4 rounded-xl bg-rose-600 text-white text-[9px] font-bold">CANCEL</button>}
        </div>

        {technicalOpen && <div className="mt-4 bg-[#1b1b1b] border border-[#303030] rounded-xl p-3.5">
          {workflow ? <><div className="flex flex-wrap gap-1 mb-3">{workflow.capabilities.map(c=><span key={c} className="px-1.5 py-0.5 rounded bg-[#252525] border border-[#353535] text-[8px] text-sky-300">{c}</span>)}</div><div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-auto custom-scrollbar">{workflow.bindings.map(b=><div key={`${b.key}-${b.nodeId}`} className="bg-[#151515] rounded p-1.5"><div className="text-[8px] text-emerald-400 font-bold">{humanize(b.key)}</div><div className="text-[8px] text-zinc-600 font-mono">#{b.nodeId} · {b.input}</div></div>)}</div></> : <div className="text-[9px] text-zinc-600">No workflow details available.</div>}
        </div>}
      </div>

      <div className="order-1 xl:order-2 bg-[#0d0d0d] border-b xl:border-b-0 xl:border-l border-[#303030] p-3 md:p-4">
        <div className="flex items-center justify-between mb-2"><div><div className="text-[10px] text-white font-bold uppercase tracking-widest">Preview</div><div className="text-[8px] text-zinc-600 font-mono">{ratio.id} · {resolution} · {statusLabel}</div></div>{lockSeed&&<span className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-[8px] text-amber-300 flex items-center gap-1"><Lock className="w-2.5 h-2.5"/> KEPT</span>}</div>
        <div className="rounded-xl border border-[#333] bg-black overflow-hidden aspect-square xl:aspect-[3/4] flex items-center justify-center relative">
          {activeOutput ? <img src={activeOutput} alt="Latest local generation" className="w-full h-full object-contain"/> : <div className="text-center text-zinc-700"><ImageIcon className="w-9 h-9 mx-auto mb-2 opacity-30"/><div className="text-[9px] font-mono">{isBusy?'GENERATING…':'YOUR IMAGE APPEARS HERE'}</div></div>}
          {isBusy && <div className="absolute inset-x-0 bottom-0 bg-black/70 p-2"><div className="h-1 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-400" style={{width:`${Math.max(0,Math.min(100,job?.progress||0))}%`}}/></div><div className="text-[8px] text-zinc-500 font-mono mt-1">{job?.currentStep?`step ${job.currentStep}/${job.totalSteps||'?'} · `:''}{job?.progress||0}%</div></div>}
        </div>
        {keepNotification && <div className="mt-2 px-2 py-1.5 rounded bg-emerald-500/5 border border-emerald-500/20 text-[8px] text-emerald-300">{keepNotification}</div>}
        {activeOutput && job?.status==='COMPLETED' && <div className="mt-3 space-y-2">
          {activeLayout && <button type="button" disabled={fusingLayout||isBusy} onClick={handleFuseTemplateLayout} className="w-full py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-[9px] font-bold"><Zap className="w-3 h-3 inline mr-1"/>{fusingLayout?'FUSING…':'FUSE AIDA64 LAYOUT'}</button>}
          {!lockSeed ? <button type="button" onClick={handleKeepImage} className="w-full py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[9px] font-bold"><CheckSquare className="w-3 h-3 inline mr-1"/>{promotingImage?'IMPORTING…':'KEEP IMAGE & WORK FROM IT'}</button> : <button type="button" onClick={handleUnlockImage} className="w-full py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[9px] font-bold"><Unlock className="w-3 h-3 inline mr-1"/>UNLOCK IMAGE</button>}
          <div className="grid grid-cols-3 gap-1.5"><button onClick={variation} disabled={isBusy||promotingImage} className="py-2 rounded-lg bg-[#202020] border border-[#333] text-[8px] text-zinc-300"><Wand2 className="w-3 h-3 inline mr-1"/>Variation</button><button onClick={downloadOutput} className="py-2 rounded-lg bg-[#202020] border border-[#333] text-[8px] text-zinc-300"><Download className="w-3 h-3 inline mr-1"/>Save file</button><button onClick={saveAsset} disabled={saving} className="py-2 rounded-lg bg-[#202020] border border-[#333] text-[8px] text-zinc-300"><Save className="w-3 h-3 inline mr-1"/>Library</button></div>
        </div>}
        <div className="mt-3 pt-3 border-t border-[#292929] flex items-center justify-between text-[8px] text-zinc-600 font-mono"><span>FLUX · COMFYUI · LOCAL</span><button onClick={()=>{loadWorkflows();loadCapabilities();}} className="hover:text-zinc-300 flex items-center gap-1"><RefreshCw className="w-3 h-3"/> refresh</button></div>
      </div>
    </div>
  </section>;

};
