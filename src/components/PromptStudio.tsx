import React, { useEffect, useMemo, useState } from 'react';
import {
  Workflow, RefreshCw, Play, Image as ImageIcon, ShieldCheck, Sliders, SlidersHorizontal,
  ChevronDown, Cpu, Zap, AlertTriangle, Download, Sparkles, Wand2, Save,
  RotateCcw, Info, Maximize2, Trash2, CheckCircle2, ShieldAlert, Lock, Unlock, Check, CheckSquare,
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
}
interface WorkflowSummary {
  id: string;
  fileName: string;
  nodeCount: number;
  bindings: { key: string; nodeId: string; input: string; classType: string; confidence: string }[];
  capabilities: string[];
  warnings: string[];
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
  { id: '9:16', label: 'Vertical / Shorts', width: 576, height: 1024 },
  { id: '4:3', label: 'Classic', width: 1024, height: 768 },
  { id: '3:4', label: 'Portrait Classic', width: 768, height: 1024 },
];

const resolutionPresets = [
  { label: '512 × 512', width: 512, height: 512, budget: 'LOW', ratio: '1:1' },
  { label: '768 × 768', width: 768, height: 768, budget: 'LOW', ratio: '1:1' },
  { label: '1024 × 1024', width: 1024, height: 1024, budget: 'STANDARD', ratio: '1:1' },
  { label: '1024 × 576', width: 1024, height: 576, budget: 'STANDARD', ratio: '16:9' },
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

export const PromptStudio: React.FC<PromptStudioProps> = ({ onAddLog, onClearCache, telemetry }) => {
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
  const [resolution, setResolution] = useState('1024 × 576');
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

  // Seed lock / Keep image mode
  const [lockSeed, setLockSeed] = useState<boolean>(false);
  const [keptSeed, setKeptSeed] = useState<number | null>(null);
  const [keptImageUrl, setKeptImageUrl] = useState<string | null>(null);
  const [keepNotification, setKeepNotification] = useState<string | null>(null);
  const [promotingImage, setPromotingImage] = useState(false);

  // Local reference-image input for ComfyUI workflows that expose LoadImage.
  const [referenceImage, setReferenceImage] = useState<{ filename: string; name: string; bytes: number; previewUrl: string } | null>(null);
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
      setParameters(prev => ({ ...initial, ...prev }));
      const width = Number(initial.width || 1024);
      const height = Number(initial.height || 576);
      const preset = resolutionPresets.find(p => p.width === width && p.height === height);
      setResolution(preset?.label || `${width} × ${height}`);
      setCustomSize(!preset);
    }).catch(() => { if (!cancelled) { setWorkflow(null); setControls([]); } });
    updateAiStudio({ workflowId: selected });
    return () => { cancelled = true; };
  }, [selected]);

  const dimensionControls = useMemo(() => controls.filter(c => isDimensionKey(c.key)), [controls]);
  const visibleControls = useMemo(() => controls.filter(c => !isPromptKey(c.key) && !isDimensionKey(c.key)), [controls]);
  const basicControls = useMemo(() => visibleControls.filter(c => !isAdvancedKey(c.key) && !isSeedKey(c.key)), [visibleControls]);
  const advancedControls = useMemo(() => visibleControls.filter(c => isAdvancedKey(c.key)), [visibleControls]);
  const seedControl = useMemo(() => controls.find(c => isSeedKey(c.key)), [controls]);
  const inputImageControl = useMemo(() => controls.find(c => c.key === 'input_image'), [controls]);
  const hasPrompt = controls.some(c => ['prompt','positive_prompt'].includes(c.key));
  const hasNegativePrompt = controls.some(c => c.key === 'negative_prompt');
  const hasDimensions = dimensionControls.length > 0;
  const hasAdvanced = advancedControls.length > 0 || !!seedControl;
  const online = capabilities?.comfy?.online !== false;
  const gpuName = capabilities?.hardware?.name || 'Local NVIDIA GPU';
  const vram = capabilities?.hardware?.memoryTotalMB ? `${(capabilities.hardware.memoryTotalMB / 1024).toFixed(1)} GB` : '8 GB';

  const selectedRatio = cfg.aspectRatio || '16:9';
  const ratio = ratioOptions.find(r => r.id === selectedRatio) || ratioOptions[1];
  const availableResolutions = resolutionPresets.filter(p => p.ratio === selectedRatio);
  const isImageJob = !job?.workflowId || job?.workflowId === 'flux_image' || output?.job?.workflowId === 'flux_image';
  const rawOutput = output?.outputs?.[0]?.url;
  const isMediaImage = rawOutput && (isImageJob || rawOutput.toLowerCase().includes('.png') || rawOutput.toLowerCase().includes('.jpg') || rawOutput.toLowerCase().includes('.jpeg'));
  const activeOutput = isMediaImage ? rawOutput : undefined;
  const isBusy = loading || job?.status === 'QUEUED' || job?.status === 'RUNNING';

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
    setResolution('1024 × 576');
    setCustomSize(false);
    updatePromptStudio({
      targetNetwork: 'FLUX.1-Schnell (FP8)',
      aspectRatio: '16:9',
      stylePreset: 'Cinematic Photorealistic'
    });
    onAddLog('INFO', 'Reset Creator Workspace to FLUX.1-Schnell FP8 defaults (1024×576 16:9).');
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

  return <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 md:p-5 mb-5 shadow-sm">
    <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-800 pb-4 mb-5 gap-3">
      <div>
        <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-emerald-400" /><h2 className="text-sm font-bold text-slate-100 uppercase tracking-widest">CREATE</h2></div>
        <p className="text-[10px] text-slate-500 mt-1">Local image creation · workflow-aware controls</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[9px] font-mono">
        <span className="px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 flex items-center gap-1.5"><Cpu className="w-3 h-3"/>{gpuName} · {vram}</span>
        <span className={`px-2.5 py-1 rounded-lg border ${online?'border-emerald-500/20 text-emerald-400 bg-emerald-500/5':'border-rose-500/20 text-rose-400 bg-rose-500/5'}`}>{online?'● LOCAL READY':'● COMFYUI OFFLINE'}</span>
      </div>
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
      <div className="xl:col-span-7 space-y-4">
        {/* Active AIDA64 Layout Banner */}
        {activeLayout && (
          <div className="bg-slate-950 border border-sky-500/40 rounded-xl p-3.5 space-y-2 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs">
                <Monitor className="w-4 h-4 text-sky-400 shrink-0" />
                <div>
                  <div className="font-bold text-sky-300 flex items-center gap-1.5 font-mono">
                    <span>Active AIDA64 Template:</span>
                    <span className="text-emerald-400">{activeLayout.screen.width} × {activeLayout.screen.height} px</span>
                    <span className="text-slate-400">({activeLayout.items.length} mapped sockets)</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Prompt is injected with exact coordinate dimensions & negative spaces. Fuses 100% exact dials around the AI design.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowFusionOptions(v => !v)}
                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded text-[9.5px] font-mono flex items-center gap-1 cursor-pointer"
                >
                  <Sliders className="w-3 h-3 text-sky-400" />
                  <span>{showFusionOptions ? 'Hide Settings' : 'Fusion Settings'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAida64Layout(null)}
                  className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 cursor-pointer"
                  title="Clear active AIDA64 layout binding"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Exact Coordinate Chips */}
            <div className="pt-1.5 border-t border-slate-900 grid grid-cols-2 md:grid-cols-3 gap-1.5">
              {activeLayout.items.map((item, idx) => (
                <div key={item.id || idx} className="bg-slate-900/90 border border-slate-800 rounded px-2 py-1 text-[9px] font-mono flex items-center justify-between text-slate-300">
                  <span className="text-sky-300 truncate max-w-[100px] font-bold">#{idx + 1} {item.name || item.shapeType}</span>
                  <span className="text-emerald-400 shrink-0">X:{item.x} Y:{item.y}</span>
                </div>
              ))}
            </div>

            {/* Fusion Customization Options */}
            {showFusionOptions && (
              <div className="pt-2 border-t border-slate-900 grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-900/40 p-2.5 rounded-lg">
                <div>
                  <label className="text-[9px] font-mono text-slate-400 block mb-1">
                    AI BACKGROUND DIM: {Math.round(dimBaseImage * 100)}%
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={dimBaseImage}
                    onChange={(e) => setDimBaseImage(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showConduits"
                    checked={showConduits}
                    onChange={(e) => setShowConduits(e.target.checked)}
                    className="rounded border-slate-700 text-sky-500 focus:ring-0"
                  />
                  <label htmlFor="showConduits" className="text-[10px] font-mono text-slate-300 cursor-pointer">
                    Illuminated Neon Conduits
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showHexBolts"
                    checked={showHexBolts}
                    onChange={(e) => setShowHexBolts(e.target.checked)}
                    className="rounded border-slate-700 text-sky-500 focus:ring-0"
                  />
                  <label htmlFor="showHexBolts" className="text-[10px] font-mono text-slate-300 cursor-pointer">
                    Machined Hex Bolts & Ticks
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Prompt</label>
          <textarea rows={7} value={cfg.promptInput} onChange={e=>setPrompt(e.target.value)} placeholder={hasPrompt ? 'Describe what you want Gina to create…' : 'Selected workflow has no detected text binding.'} disabled={!hasPrompt} className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs leading-5 text-slate-200 focus:outline-none focus:border-emerald-500/50 resize-none disabled:opacity-40" />
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div>
                <div className="text-[9px] text-slate-400 uppercase font-bold tracking-widest flex items-center gap-1.5"><FileImage className="w-3.5 h-3.5 text-sky-400" /> Reference image</div>
                <div className="text-[9px] text-slate-600 mt-0.5">Local only · fed into the workflow's image input</div>
              </div>
              <span className="text-[8px] font-mono text-emerald-400 border border-emerald-500/20 bg-emerald-500/5 rounded px-1.5 py-0.5">12 MB MAX</span>
            </div>

            <input
              ref={referenceFileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.webp,.bmp,.gif,image/png,image/jpeg,image/webp,image/bmp,image/gif"
              className="hidden"
              onChange={e => void handleReferenceImage(e.target.files?.[0])}
            />

            {!referenceImage ? (
              <button
                type="button"
                onClick={() => referenceFileInputRef.current?.click()}
                disabled={uploadingReference}
                className="w-full border border-dashed border-slate-700 hover:border-sky-500/50 bg-slate-900/60 hover:bg-sky-500/5 rounded-lg p-4 text-center transition-colors disabled:opacity-50"
              >
                <Upload className="w-5 h-5 mx-auto text-sky-400 mb-1.5" />
                <div className="text-[10px] text-slate-300 font-bold">{uploadingReference ? 'UPLOADING LOCALLY…' : 'UPLOAD REFERENCE IMAGE'}</div>
                <div className="text-[9px] text-slate-600 mt-1">PNG · JPG/JPEG · WEBP · BMP · GIF</div>
              </button>
            ) : (
              <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-lg p-2">
                <img src={referenceImage.previewUrl} alt="Reference" className="w-16 h-16 object-cover rounded border border-slate-700" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] text-slate-200 font-bold truncate">{referenceImage.name}</div>
                  <div className="text-[9px] text-slate-500 font-mono mt-0.5">{(referenceImage.bytes / 1024 / 1024).toFixed(2)} MB · uploaded to local ComfyUI input</div>
                  {inputImageControl ? <div className="text-[9px] text-emerald-400 mt-1">READY — this image will be bound to #{inputImageControl.nodeId} · {inputImageControl.input}</div> : <div className="text-[9px] text-amber-300 mt-1">UPLOADED — switch to a reference workflow to use it.</div>}
                </div>
                <button type="button" onClick={() => setReferenceImage(null)} className="p-1.5 rounded border border-slate-700 bg-slate-950 text-slate-500 hover:text-rose-300 hover:border-rose-500/40" title="Remove reference image"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}

            {referenceUploadError && <div className="mt-2 text-[9px] text-rose-300 border border-rose-500/20 bg-rose-500/5 rounded p-2">{referenceUploadError}</div>}
            {!inputImageControl && (
              <div className="mt-2 rounded border border-amber-500/20 bg-amber-500/5 p-2 text-[9px] text-amber-300">
                The selected workflow does not expose a LoadImage input, so this reference cannot affect generation yet.
                {workflows.some(w => w.id === 'flux_image_reference') && (
                  <button type="button" onClick={() => setSelected('flux_image_reference')} className="ml-2 px-2 py-1 rounded border border-amber-500/30 text-amber-200 hover:bg-amber-500/10 font-bold">SWITCH TO REFERENCE WORKFLOW</button>
                )}
              </div>
            )}
          </div>

        {hasNegativePrompt && <div>
          <button onClick={()=>setShowNegative(v=>!v)} className="flex items-center gap-1.5 text-[9px] text-slate-500 uppercase font-bold tracking-widest hover:text-slate-300"><ChevronDown className={`w-3 h-3 transition-transform ${showNegative?'rotate-180':''}`}/> Negative prompt</button>
          {showNegative && <textarea rows={3} value={cfg.negativePrompt} onChange={e=>setNegativePrompt(e.target.value)} placeholder="Optional things to avoid…" className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] text-slate-300 focus:outline-none focus:border-emerald-500/50 resize-none" />}
        </div>}

        {/* VRAM Safety & Flux Fast Action Bar */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-200 flex items-center gap-1.5">
                <span>Model Engine:</span>
                <span className="text-emerald-400 font-mono font-bold">FLUX.1-Schnell FP8</span>
              </div>
              <p className="text-[9px] text-slate-500">
                {selected === 'flux_image' ? 'Active: flux_image workflow (4-step euler latent diffusion)' : `Active workflow: ${selected}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selected !== 'flux_image' && (
              <button
                type="button"
                onClick={handleResetFluxPreset}
                className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[9.5px] font-bold font-mono transition-colors cursor-pointer"
                title="Switch workflow to standard flux_image"
              >
                Switch to Flux.1
              </button>
            )}
            <button
              type="button"
              onClick={handlePurgeVram}
              disabled={purgingVram}
              className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[9.5px] font-bold font-mono flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Purge ComfyUI GPU memory (/free) to clear video tensors and prevent CUDA OOM"
            >
              <Trash2 className="w-3 h-3 text-amber-400" />
              <span>{purgingVram ? 'Purging VRAM…' : 'Purge VRAM Cache'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="text-[9px] text-slate-500 uppercase font-bold">Workflow<span className="block mt-1.5"><select value={selected} onChange={e=>setSelected(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2.5 text-[10px] text-slate-200 font-mono focus:outline-none focus:border-emerald-500/50"><option value="">Select local workflow</option>{workflows.map(w=><option key={w.id} value={w.id}>{w.id}</option>)}</select></span></label>
          <label className="text-[9px] text-slate-500 uppercase font-bold">Aspect ratio<span className="block mt-1.5"><select value={selectedRatio} onChange={e=>applyRatio(e.target.value)} disabled={!hasDimensions} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2.5 text-[10px] text-slate-200 font-mono focus:outline-none focus:border-emerald-500/50 disabled:opacity-40">{ratioOptions.map(r=><option key={r.id} value={r.id}>{r.id} · {r.label}</option>)}</select></span></label>
          <label className="text-[9px] text-slate-500 uppercase font-bold">Size<span className="block mt-1.5"><select value={resolution} onChange={e=>applyResolution(e.target.value)} disabled={!hasDimensions || customSize} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2.5 text-[10px] text-slate-200 font-mono focus:outline-none focus:border-emerald-500/50 disabled:opacity-40">{availableResolutions.map(p=><option key={p.label} value={p.label}>{p.label} · {p.budget}</option>)}{customSize && <option value={resolution}>{resolution} · CUSTOM</option>}</select></span></label>
        </div>

        {hasDimensions && <div className="flex items-center gap-3 text-[9px] text-slate-500">
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={customSize} onChange={e=>setCustomSize(e.target.checked)} /> Custom workflow dimensions</label>
          {customSize && dimensionControls.map(c => <label key={c.key} className="flex items-center gap-1">{c.key}<input type="number" value={parameters[c.key] ?? c.currentValue ?? ''} min={c.min} max={c.max} step={c.step ?? 8} onChange={e=>updateControl(c.key, Number(e.target.value))} className="w-20 bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-300 font-mono" /></label>)}
        </div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-[9px] text-slate-500 uppercase font-bold">Style preset<span className="block mt-1.5"><select value={cfg.stylePreset || 'None'} onChange={e=>updatePromptStudio({ stylePreset: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2.5 text-[10px] text-slate-200 focus:outline-none focus:border-emerald-500/50">{stylePresets.map(s=><option key={s}>{s}</option>)}</select></span></label>
          <label className="text-[9px] text-slate-500 uppercase font-bold">Model<span className="block mt-1.5"><select value={cfg.targetNetwork} onChange={e=>updatePromptStudio({ targetNetwork:e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2.5 text-[10px] text-slate-200 focus:outline-none focus:border-emerald-500/50"><option>FLUX.1-Schnell (FP8)</option></select></span></label>
        </div>

        {(basicControls.length > 0 || seedControl) && <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between mb-3"><div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Generation settings</div><span className="text-[9px] text-slate-600">Only supported workflow inputs</span></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {seedControl && <label className="text-[9px] text-slate-500 uppercase font-bold">Seed<span className="block mt-1.5 relative"><input type="number" value={parameters[seedControl.key] ?? seedControl.currentValue ?? ''} min={0} max={2147483647} onChange={e=>updateControl(seedControl.key, Number(e.target.value))} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-[10px] text-slate-200 font-mono pr-8"/><button type="button" onClick={randomizeSeed} className="absolute right-1 top-1 p-1 text-slate-500 hover:text-emerald-400" title="Randomise seed"><RotateCcw className="w-3 h-3"/></button></span></label>}
            {basicControls.map(renderControl)}
          </div>
        </div>}

        {hasAdvanced && <div className="bg-slate-950 border border-slate-800 rounded-xl">
          <button onClick={()=>setAdvancedOpen(v=>!v)} className="w-full px-3.5 py-3 flex items-center justify-between text-[9px] text-slate-400 uppercase font-bold tracking-widest"><span className="flex items-center gap-1.5"><SlidersHorizontal className="w-3 h-3"/>Advanced controls</span><ChevronDown className={`w-3 h-3 transition-transform ${advancedOpen?'rotate-180':''}`}/></button>
          {advancedOpen && <div className="border-t border-slate-800 p-3.5 grid grid-cols-2 sm:grid-cols-3 gap-3">{advancedControls.map(renderControl)}</div>}
        </div>}

        <div className="flex items-center gap-2 text-[9px] text-slate-600"><Zap className="w-3 h-3 text-emerald-500"/> Gina exposes controls from the selected ComfyUI workflow instead of assuming capabilities.</div>
        <div className="flex items-center gap-2">
          <button onClick={generate} disabled={isBusy || promotingImage || !selected || !cfg.promptInput.trim() || !hasPrompt || !online || (!!inputImageControl && !referenceImage)} className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold px-3 py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"><Play className="w-3.5 h-3.5 fill-current"/>{loading ? 'SUBMITTING…' : isBusy ? 'GENERATION RUNNING…' : 'GENERATE LOCALLY'}</button>
          {isBusy && (
            <button type="button" onClick={cancelJob} className="shrink-0 bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors" title="Cancel generation, clear ComfyUI queue, and flush VRAM">
              <X className="w-3.5 h-3.5" /> STOP &amp; FLUSH
            </button>
          )}
        </div>
      </div>

      <div className="xl:col-span-5 space-y-3">
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest flex items-center gap-1.5">
                <span>Preview</span>
                {lockSeed && (
                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[8px] font-mono flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> SEED LOCKED (KEEP ACTIVE)
                  </span>
                )}
              </div>
              <div className="text-[9px] text-slate-600 mt-0.5">{ratio.id} · {resolution}</div>
            </div>
            <Maximize2 className="w-3.5 h-3.5 text-slate-600"/>
          </div>

          {keepNotification && (
            <div className="mb-2 p-2 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[9px] font-mono flex items-center gap-1.5 animate-in fade-in">
              <Check className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>{keepNotification}</span>
            </div>
          )}

          <div className="w-full aspect-[16/10] min-h-[360px] rounded-lg border border-slate-800 bg-black overflow-hidden flex items-center justify-center relative">
            {activeOutput ? (
              <img src={activeOutput} alt="Latest local generation" className="w-full h-full object-contain" />
            ) : (
              <div className="text-center text-[10px] text-slate-700 font-mono">
                <ImageIcon className="w-7 h-7 mx-auto mb-2 opacity-30"/>
                {isBusy ? 'GENERATING…' : 'NO OUTPUT YET'}
              </div>
            )}

            {lockSeed && keptImageUrl && (
              <div className="absolute top-2 right-2 px-2 py-1 rounded bg-slate-950/90 border border-amber-500/60 text-amber-400 text-[8.5px] font-mono flex items-center gap-1 shadow-lg">
                <Lock className="w-2.5 h-2.5 text-amber-400" />
                <span>KEPT BASE IMAGE</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-3 min-h-6">
            <div className="text-[9px] font-mono text-slate-500">{job ? `${statusLabel} · ${job.progress || 0}%` : 'READY'}</div>
            {job && <div className="text-[9px] font-mono text-slate-600">{job.currentStep ? `step ${job.currentStep}/${job.totalSteps || '?'}` : ''}</div>}
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-400 transition-[width] duration-200" style={{width:`${Math.max(0, Math.min(100, job?.progress || 0))}%`}}/></div>
          {outputLoading && <div className="mt-2 text-[9px] text-slate-600 font-mono">Finalising output…</div>}
          
          {activeOutput && job?.status === 'COMPLETED' && (
            <div className="space-y-2 mt-3">
              {/* Active Layout Fusion Action */}
              {activeLayout && (
                <button
                  type="button"
                  disabled={fusingLayout || isBusy}
                  onClick={handleFuseTemplateLayout}
                  className="w-full py-2 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10px] flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
                  title="Overlays the exact titanium dials, bezel tracks, and neon conduits from your template directly onto this AI wallpaper"
                >
                  <Zap className="w-3.5 h-3.5 text-sky-200" />
                  <span>{fusingLayout ? 'FUSING EXACT LAYOUT BEZELS…' : '✨ FUSE TEMPLATE LAYOUT BEZELS ONTO THIS IMAGE'}</span>
                </button>
              )}

              {/* Keep Image & Seed Controls */}
              <div className="grid grid-cols-2 gap-2">
                {!lockSeed ? (
                  <button
                    type="button"
                    onClick={handleKeepImage}
                    className="col-span-2 py-2 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 font-bold text-[10px] flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{promotingImage ? 'IMPORTING IMAGE AS NEXT REFERENCE…' : 'KEEP THIS IMAGE & WORK OFF IT'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleUnlockImage}
                    className="col-span-2 py-2 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-bold text-[10px] flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <Unlock className="w-3.5 h-3.5 text-amber-400" />
                    <span>UNLOCK IMAGE (GENERATE NEW RANDOM CONCEPTS)</span>
                  </button>
                )}
              </div>

              {/* Standard Output Action Row */}
              <div className="grid grid-cols-3 gap-2">
                <button onClick={variation} disabled={isBusy || promotingImage} className="border border-slate-800 bg-slate-900 hover:bg-slate-800 rounded-lg py-2 text-[9px] text-slate-300 flex items-center justify-center gap-1"><Wand2 className="w-3 h-3"/> Variation</button>
                <button onClick={downloadOutput} className="border border-slate-800 bg-slate-900 hover:bg-slate-800 rounded-lg py-2 text-[9px] text-slate-300 flex items-center justify-center gap-1"><Download className="w-3 h-3"/> Download</button>
                <button onClick={saveAsset} disabled={saving} className="border border-slate-800 bg-slate-900 hover:bg-slate-800 rounded-lg py-2 text-[9px] text-slate-300 flex items-center justify-center gap-1"><Save className="w-3 h-3"/> Save</button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl">
          <button onClick={()=>setTechnicalOpen(v=>!v)} className="w-full px-3.5 py-3 flex items-center justify-between text-[9px] text-slate-500 uppercase font-bold tracking-widest"><span className="flex items-center gap-1.5"><Info className="w-3 h-3"/> Workflow details</span><ChevronDown className={`w-3 h-3 transition-transform ${technicalOpen?'rotate-180':''}`}/></button>
          {technicalOpen && <div className="border-t border-slate-800 p-3.5 space-y-3">
            {workflow ? <>
              <div className="flex flex-wrap gap-1">{workflow.capabilities.map(c=><span key={c} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-sky-300">{c}</span>)}</div>
              <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-auto custom-scrollbar">{workflow.bindings.map(b=><div key={`${b.key}-${b.nodeId}`} className="bg-slate-900 border border-slate-800 rounded p-1.5"><div className="text-[9px] text-emerald-400 font-bold">{humanize(b.key)}</div><div className="text-[9px] text-slate-500 font-mono">#{b.nodeId} · {b.input}</div></div>)}</div>
              {workflow.warnings.map(w=><div key={w} className="text-[9px] text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded p-1.5 flex gap-1"><AlertTriangle className="w-3 h-3 shrink-0"/>{w}</div>)}
            </> : <div className="text-[10px] text-slate-500 py-3 text-center"><SlidersHorizontal className="w-5 h-5 mx-auto mb-1 opacity-40"/>No workflow details available.</div>}
            <button onClick={()=>{loadWorkflows();loadCapabilities();}} className="text-[9px] text-slate-500 hover:text-slate-200 flex items-center gap-1"><RefreshCw className="w-3 h-3"/> Refresh local capabilities</button>
          </div>}
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
  </section>;
};
