import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  Sparkles, Play, Square, Dices, X, RefreshCw, Layers, SlidersHorizontal,
  ChevronDown, ChevronUp, Image as ImageIcon, ShieldCheck, Activity, Trash2
} from 'lucide-react';
import { useProjectState } from '../context/ProjectStateContext';
import { useGenerationJob } from '../context/GenerationJobContext';
import { SystemTelemetry } from '../types';
import { compositeLayoutOntoImage } from '../utils/aida64LayoutCompiler';
import { GINA_IMAGE_STYLES, GinaImageStyle } from '../data/ginaImageStyles';
import { GinaImagePreview, HistoryItem } from './gina-image/GinaImagePreview';
import { GinaImageInput, InputImageMode } from './gina-image/GinaImageInput';
import {
  GinaImageSettings,
  GinaSettingsTab,
  GINA_ASPECT_RATIOS,
  GINA_PERFORMANCE_PRESETS
} from './gina-image/GinaImageSettings';
import { VRAMHistoryGraph } from './VRAMHistoryGraph';

interface PromptStudioProps {
  onAddLog: (level: 'INFO' | 'WARN' | 'SEC' | 'RULE', message: string, ruleId?: string) => void;
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
  key: string;
  nodeId: string;
  input: string;
  classType: string;
  confidence: string;
  currentValue?: any;
  options?: any[];
  min?: number;
  max?: number;
  step?: number;
}

interface CapabilityData {
  hardware?: { name?: string; memoryTotalMB?: number };
  comfy?: { online?: boolean };
  generators?: any[];
  models?: any[];
}

const SURPRISE_PROMPTS = [
  'A sleek futuristic telemetry cockpit with glowing illuminated conduits, carbon fiber housing, dramatic ambient lighting',
  'Cinematic photograph of a high-tech robotic laboratory, neon cyan backlighting, hyper-detailed mechanical joints, 35mm lens',
  'Minimalist architectural pavilion in the misty mountains at dawn, smooth concrete, volumetric morning fog, warm interior glow',
  'Cyberpunk street market in the rain, neon reflections on wet asphalt, holographic signage, atmospheric volumetric steam',
  'AIDA64 hardware telemetry screen background, dark brushed titanium plate, hex bolts, illuminated fiber conduits, zero glare',
  'Ethereal crystal sanctuary floating in a bioluminescent nebula, intricate geometric facets, prism refractions, cosmic dust',
  'Vintage analog synthesizer studio with patch cables, warm vacuum tube glow, VU meters with amber needles, 1970s aesthetic',
  'Detailed mechanical watch movement interior, polished brass gears, ruby bearings, macro photograph, studio lighting'
];

export const PromptStudio: React.FC<PromptStudioProps> = ({
  onAddLog,
  onClearCache,
  telemetry,
  stagedReferenceImage
}) => {
  const {
    projectState,
    updatePromptStudio,
    updateAiStudio,
    setSavedAssets,
    setActiveAida64Layout
  } = useProjectState();

  const cfg = projectState.promptStudio;
  const activeLayout = projectState.activeAida64Layout;

  // Workflow & ComfyUI state
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const initialWorkflowId =
    projectState.aiStudio.workflowId && projectState.aiStudio.workflowId !== 'ltx_video'
      ? projectState.aiStudio.workflowId
      : 'flux_image';
  const [selectedWorkflow, setSelectedWorkflow] = useState(initialWorkflowId);
  const [workflow, setWorkflow] = useState<WorkflowSummary | null>(null);
  const [controls, setControls] = useState<Control[]>([]);
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [capabilities, setCapabilities] = useState<CapabilityData | null>(null);

  // Job & Output
  const { job, output, outputLoading, submitting: loading, startJob, cancelJob } = useGenerationJob();

  // Gina Core UI Toggles
  const [inputImageOpen, setInputImageOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<GinaSettingsTab>('setting');
  const [vramGraphOpen, setVramGraphOpen] = useState(false);

  // Gina Parameters
  const [performance, setPerformance] = useState('speed'); // extreme_speed, speed, quality
  const [customSize, setCustomSize] = useState(false);
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(600);
  const [imageNumber, setImageNumber] = useState(1);
  const [randomSeed, setRandomSeed] = useState(true);
  const [seedValue, setSeedValue] = useState(123456789);

  // Gina Styles (Default to Gina V2)
  const [selectedStyles, setSelectedStyles] = useState<string[]>(['gina_v2']);

  // Model Tab
  const [baseModel, setBaseModel] = useState('flux1-schnell-Q4_K_S.gguf');
  const [loras, setLoras] = useState([
    { enabled: false, model: '', weight: 1.0 },
    { enabled: false, model: '', weight: 1.0 },
    { enabled: false, model: '', weight: 1.0 }
  ]);

  // Advanced Sampling
  const [guidanceScale, setGuidanceScale] = useState(3.5);
  const [steps, setSteps] = useState(4); // FLUX.1-Schnell default
  const [sampler, setSampler] = useState('euler');
  const [scheduler, setScheduler] = useState('simple');
  const [denoise, setDenoise] = useState(1.0);

  // Input Image
  const [inputImageMode, setInputImageMode] = useState<InputImageMode>('image_prompt');
  const [referenceImage, setReferenceImage] = useState<{
    filename: string;
    name: string;
    bytes: number;
    previewUrl: string;
  } | null>(null);
  const [imageWeight, setImageWeight] = useState(0.85);
  const [stopAt, setStopAt] = useState(0.85);
  const [uploadingReference, setUploadingReference] = useState(false);
  const [referenceUploadError, setReferenceUploadError] = useState<string | null>(null);

  // Seed Lock & Promote Output
  const [lockSeed, setLockSeed] = useState(false);
  const [keptSeed, setKeptSeed] = useState<number | null>(null);
  const [keptImageUrl, setKeptImageUrl] = useState<string | null>(null);
  const [keepNotification, setKeepNotification] = useState<string | null>(null);
  const [promotingImage, setPromotingImage] = useState(false);

  // Operations
  const [savingAsset, setSavingAsset] = useState(false);
  const [fusingLayout, setFusingLayout] = useState(false);
  const [purgingVram, setPurgingVram] = useState(false);

  // Session History
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Textarea Ref for shortcut
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // When AIDA64 sends a staged reference
  useEffect(() => {
    if (stagedReferenceImage) {
      setReferenceImage(stagedReferenceImage);
      setInputImageOpen(true);
      onAddLog('INFO', `AIDA64 guide image attached to Gina Image Input: ${stagedReferenceImage.name}.`);
    }
  }, [stagedReferenceImage]);

  // Load Workflows & Capabilities
  const loadWorkflows = async () => {
    try {
      const r = await fetch('/api/workflows', { cache: 'no-store' });
      const data = await r.json();
      const list: WorkflowSummary[] = data.workflows || [];
      setWorkflows(list);
      const fluxWf = list.find((w) => w.id === 'flux_image');
      const imageWf = list.find((w) => w.id.includes('flux') || w.id.includes('image') || !w.id.includes('video'));
      if (!selectedWorkflow || selectedWorkflow === 'ltx_video') {
        setSelectedWorkflow(fluxWf?.id || imageWf?.id || list[0]?.id || 'flux_image');
      }
    } catch (e: any) {
      onAddLog('WARN', `Workflow registry unavailable: ${e.message}`);
    }
  };

  const loadCapabilities = async () => {
    try {
      const r = await fetch('/api/capabilities', { cache: 'no-store' });
      if (r.ok) setCapabilities(await r.json());
    } catch (e: any) {
      onAddLog('WARN', `Local capability map unavailable: ${e.message}`);
    }
  };

  useEffect(() => {
    loadWorkflows();
    loadCapabilities();
  }, []);

  // Sync with ComfyUI controls for selected workflow
  useEffect(() => {
    if (!selectedWorkflow) return;
    let cancelled = false;

    Promise.all([
      fetch(`/api/workflows/${encodeURIComponent(selectedWorkflow)}`, { cache: 'no-store' }).then((r) => r.json()),
      fetch(`/api/workflows/${encodeURIComponent(selectedWorkflow)}/controls`, { cache: 'no-store' }).then((r) => r.json())
    ])
      .then(([definition, controlData]) => {
        if (cancelled) return;
        setWorkflow(definition);
        const list: Control[] = controlData.controls || [];
        setControls(list);

        const initial: Record<string, any> = {};
        list.forEach((c) => {
          if (c.currentValue !== undefined && c.currentValue !== null) {
            initial[c.key] = c.currentValue;
          }
        });

        // Set initial dimensions & steps from workflow
        if (initial.width) setWidth(Number(initial.width));
        if (initial.height) setHeight(Number(initial.height));
        if (initial.steps) setSteps(Number(initial.steps));
        if (initial.sampler) setSampler(String(initial.sampler));
        if (initial.scheduler) setScheduler(String(initial.scheduler));
        if (initial.denoise !== undefined) setDenoise(Number(initial.denoise));

        setParameters((prev) => ({
          ...initial,
          ...prev
        }));
      })
      .catch(() => {
        if (!cancelled) {
          setWorkflow(null);
          setControls([]);
        }
      });

    updateAiStudio({ workflowId: selectedWorkflow });
    return () => {
      cancelled = true;
    };
  }, [selectedWorkflow]);

  // Ratio setup
  const selectedRatio = cfg.aspectRatio || 'aida64';
  const currentRatioDef = GINA_ASPECT_RATIOS.find((r) => r.id === selectedRatio) || GINA_ASPECT_RATIOS[1];

  const handleSelectRatio = (ratioId: string, w: number, h: number) => {
    updatePromptStudio({ aspectRatio: ratioId });
    setWidth(w);
    setHeight(h);
    setCustomSize(false);
  };

  // Performance Preset Change
  const handleChangePerformance = (presetId: string, stepCount: number) => {
    setPerformance(presetId);
    setSteps(stepCount);
    onAddLog('INFO', `Gina performance profile set to '${presetId}' (${stepCount} steps).`);
  };

  // Hardware details
  const online = capabilities?.comfy?.online !== false;
  const gpuName = capabilities?.hardware?.name || 'NVIDIA GeForce RTX 3070 Ti (8GB)';
  const vramTotal = capabilities?.hardware?.memoryTotalMB
    ? `${(capabilities.hardware.memoryTotalMB / 1024).toFixed(1)} GB`
    : '8.0 GB';

  const workflowModelNode = workflow?.nodes?.find((n: any) =>
    ['UnetLoaderGGUF', 'UNETLoader', 'CheckpointLoaderSimple', 'CheckpointLoader'].includes(n.classType)
  );
  const workflowModelValue =
    workflowModelNode?.inputs?.unet_name ||
    workflowModelNode?.inputs?.ckpt_name ||
    workflowModelNode?.inputs?.model_name ||
    baseModel;
  const workflowModelLabel =
    workflowModelValue === 'flux1-schnell-Q4_K_S.gguf'
      ? 'FLUX.1-Schnell GGUF Q4_K_S'
      : String(workflowModelValue);

  // Active Output Detection
  const rawOutput = output?.outputs?.[0]?.url;
  const isImageJob =
    !job?.workflowId || job?.workflowId === 'flux_image' || output?.job?.workflowId === 'flux_image';
  const isMediaImage =
    rawOutput &&
    (isImageJob ||
      rawOutput.toLowerCase().includes('.png') ||
      rawOutput.toLowerCase().includes('.jpg') ||
      rawOutput.toLowerCase().includes('.jpeg'));
  const activeOutput = isMediaImage ? rawOutput : undefined;
  const isBusy = loading || job?.status === 'QUEUED' || job?.status === 'RUNNING';

  // Record completed outputs in Session History
  useEffect(() => {
    if (activeOutput && job?.status === 'COMPLETED' && !outputLoading) {
      setHistory((prev) => {
        if (prev.some((h) => h.url === activeOutput)) return prev;
        const newItem: HistoryItem = {
          id: job.id || `img-${Date.now()}`,
          url: activeOutput,
          prompt: cfg.promptInput,
          seed: typeof parameters.seed === 'number' ? parameters.seed : seedValue,
          width,
          height,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          ratioLabel: selectedRatio,
          styles: selectedStyles,
          workflowId: selectedWorkflow
        };
        return [newItem, ...prev.slice(0, 19)]; // Keep recent 20 images
      });
    }
  }, [activeOutput, job?.status, outputLoading]);

  // Handle Style Selection
  const handleToggleStyle = (styleId: string) => {
    setSelectedStyles((prev) =>
      prev.includes(styleId) ? prev.filter((id) => id !== styleId) : [...prev, styleId]
    );
  };

  const handleClearStyles = () => {
    setSelectedStyles([]);
  };

  const handleSelectGinaV2Default = () => {
    setSelectedStyles(['gina_v2']);
  };

  // Build Final Prompt with Gina Styles
  const buildFinalPrompt = (rawPrompt: string) => {
    let positive = rawPrompt.trim();

    // Clean any hallucination triggers for AIDA64 panels
    if (
      positive.toLowerCase().includes('aida64') ||
      positive.toLowerCase().includes('chassis') ||
      positive.toLowerCase().includes('telemetry')
    ) {
      positive = positive
        .replace(/\b(remove|without|no|delete|omit)\s+(numbers?|needles?|text|words?|digits?|gauges?|speedometers?)\b/gi, '')
        .replace(/\b(speedometers?|tachometers?|speedo|rev counter|gauge needles?|pointer needles?)\b/gi, 'dark socket')
        .replace(/\b(numbers?|readouts?|digits?)\b/gi, 'blank dark slot')
        .replace(/\s{2,}/g, ' ')
        .trim();
    }

    // Apply active Gina style modifiers
    for (const styleId of selectedStyles) {
      const style = GINA_IMAGE_STYLES.find((s) => s.id === styleId);
      if (style?.positivePrompt) {
        positive += `, ${style.positivePrompt}`;
      }
    }

    // Build negative prompt
    const negativeParts: string[] = [];
    if (cfg.negativePrompt?.trim()) {
      negativeParts.push(cfg.negativePrompt.trim());
    }
    for (const styleId of selectedStyles) {
      const style = GINA_IMAGE_STYLES.find((s) => s.id === styleId);
      if (style?.negativePrompt) {
        negativeParts.push(style.negativePrompt);
      }
    }

    return {
      positive,
      negative: negativeParts.join(', ')
    };
  };

  // Upload Reference Image
  const handleUploadImage = async (file: File) => {
    const allowed = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/bmp', 'image/gif']);
    const extension = `.${file.name.split('.').pop()?.toLowerCase() || ''}`;
    const allowedExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif']);
    const maxBytes = 12 * 1024 * 1024;

    if (!allowed.has(file.type) && !allowedExtensions.has(extension)) {
      setReferenceUploadError('Supported image types: PNG, JPG, WEBP, BMP, GIF.');
      return;
    }
    if (file.size > maxBytes) {
      setReferenceUploadError('Maximum file upload size is 12 MB.');
      return;
    }

    setUploadingReference(true);
    setReferenceUploadError(null);

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Failed to read image.'));
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
        throw new Error(data.error || `Upload failed (HTTP ${response.status}).`);
      }

      setReferenceImage({
        filename: data.filename,
        name: file.name,
        bytes: Number(data.bytes || file.size),
        previewUrl: dataUrl
      });
      onAddLog('INFO', `Gina Image Input loaded: "${file.name}" into ComfyUI.`);
    } catch (err: any) {
      setReferenceUploadError(err.message || 'Image upload failed.');
      onAddLog('WARN', `Input image upload failed: ${err.message}`);
    } finally {
      setUploadingReference(false);
    }
  };

  // Generate Action
  const handleGenerate = async () => {
    if (!cfg.promptInput.trim() || !selectedWorkflow || isBusy) return;

    const { positive, negative } = buildFinalPrompt(cfg.promptInput);
    const bound: Record<string, any> = { ...parameters };

    // Prompt bindings
    const promptControl = controls.find((c) => ['prompt', 'positive_prompt'].includes(c.key));
    if (promptControl) bound[promptControl.key] = positive;

    const negControl = controls.find((c) => c.key === 'negative_prompt');
    if (negControl && negative) bound[negControl.key] = negative;

    // Dimensions
    if (controls.some((c) => c.key === 'width')) bound.width = width;
    if (controls.some((c) => c.key === 'height')) bound.height = height;

    // Sampling settings
    if (controls.some((c) => c.key === 'steps')) bound.steps = steps;
    if (controls.some((c) => c.key === 'sampler')) bound.sampler = sampler;
    if (controls.some((c) => c.key === 'scheduler')) bound.scheduler = scheduler;
    if (controls.some((c) => c.key === 'denoise')) bound.denoise = denoise;
    if (controls.some((c) => c.key === 'batch_size')) bound.batch_size = imageNumber;

    // Seed logic
    const seedControl = controls.find((c) => ['seed', 'noise_seed'].includes(c.key));
    let effectiveSeed = seedValue;
    if (lockSeed && keptSeed !== null) {
      effectiveSeed = keptSeed;
    } else if (randomSeed) {
      effectiveSeed = Math.floor(Math.random() * 2147483647);
      setSeedValue(effectiveSeed);
    }
    if (seedControl) bound[seedControl.key] = effectiveSeed;

    // Input image reference
    const inputImageControl = controls.find((c) => c.key === 'input_image');
    if (inputImageControl && referenceImage) {
      bound[inputImageControl.key] = referenceImage.filename;
    }

    onAddLog(
      'INFO',
      `[Gina Image Studio] Generating with ${workflowModelLabel} (${width}×${height}, ${steps} steps, seed ${effectiveSeed}). Styles: [${selectedStyles.join(', ')}]`
    );

    await startJob(selectedWorkflow, bound);
  };

  // Keyboard shortcut Ctrl+Enter to generate
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleGenerate();
    }
  };

  // Surprise Me / Randomize prompt
  const handleSurpriseMe = () => {
    const randomPrompt = SURPRISE_PROMPTS[Math.floor(Math.random() * SURPRISE_PROMPTS.length)];
    updatePromptStudio({ promptInput: randomPrompt });
  };

  // Vary Subtle / Strong
  const handleVary = async (strength: 'subtle' | 'strong') => {
    if (!cfg.promptInput.trim() || isBusy) return;
    const freshSeed = Math.floor(Math.random() * 2147483647);
    setSeedValue(freshSeed);
    setLockSeed(false);

    if (strength === 'subtle') {
      setDenoise(0.45);
      onAddLog('INFO', `Gina Vary (Subtle): set denoise to 0.45, seed ${freshSeed}.`);
    } else {
      setDenoise(0.85);
      onAddLog('INFO', `Gina Vary (Strong): set denoise to 0.85, seed ${freshSeed}.`);
    }

    setTimeout(() => {
      handleGenerate();
    }, 50);
  };

  // Keep Image & Work From It
  const handleKeepImage = async () => {
    if (!activeOutput || !job) return;
    setPromotingImage(true);
    setKeepNotification('Importing generated image into ComfyUI as reference…');

    try {
      const response = await fetch('/api/comfy/promote-output', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id, outputIndex: 0 })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok || !data.filename) {
        throw new Error(data.error || `Failed to promote image (HTTP ${response.status}).`);
      }

      const activeSeed =
        typeof parameters.seed === 'number'
          ? parameters.seed
          : typeof job.parameters?.seed === 'number'
          ? job.parameters.seed
          : seedValue;

      setReferenceImage({
        filename: data.filename,
        name: `gina-promoted-${job.id.slice(0, 8)}.png`,
        bytes: Number(data.bytes || 0),
        previewUrl: activeOutput
      });
      setInputImageOpen(true);
      setKeptSeed(activeSeed);
      setKeptImageUrl(activeOutput);
      setLockSeed(true);

      setKeepNotification('Image imported as active input reference! Seed locked for consistent iteration.');
      onAddLog('INFO', `Promoted generated image ${job.id.slice(0, 8)} to ComfyUI input ${data.filename}.`);
    } catch (err: any) {
      setKeepNotification(null);
      onAddLog('WARN', `Could not promote image: ${err.message}`);
    } finally {
      setPromotingImage(false);
      setTimeout(() => setKeepNotification(null), 5000);
    }
  };

  const handleUnlockImage = () => {
    setLockSeed(false);
    setKeptSeed(null);
    setKeptImageUrl(null);
    setKeepNotification('Seed unlocked. Ready for diverse concept explorations.');
    onAddLog('INFO', 'Unlocked seed for fresh generations.');
    setTimeout(() => setKeepNotification(null), 3000);
  };

  // Save to Library
  const handleSaveAsset = async () => {
    if (!activeOutput || !job) return;
    setSavingAsset(true);
    const asset = {
      id: `asset-${Date.now()}`,
      title: `Gina Image ${new Date().toLocaleTimeString()}`,
      type: 'image' as const,
      url: activeOutput,
      fileFormat: 'PNG',
      timestamp: new Date().toISOString(),
      promptUsed: cfg.promptInput,
      jobId: job.id,
      workflowId: job.workflowId,
      seed: typeof job.parameters?.seed === 'number' ? job.parameters.seed : seedValue
    };

    try {
      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(asset)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || `HTTP ${response.status}`);
      setSavedAssets((prev) => [data.asset, ...prev.filter((a) => a.id !== data.asset.id)]);
      onAddLog('INFO', `Saved image ${data.asset.id} to Gina Asset Library.`);
    } catch (err: any) {
      setSavedAssets((prev) => [asset, ...prev]);
      onAddLog('WARN', `Local asset saved; server sync warning: ${err.message}`);
    } finally {
      setSavingAsset(false);
    }
  };

  // Download
  const handleDownload = () => {
    if (!activeOutput) return;
    const a = document.createElement('a');
    a.href = activeOutput;
    a.download = `gina-${job?.id?.slice(0, 8) || 'image'}.png`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Fuse AIDA64 Layout
  const handleFuseLayout = async () => {
    if (!activeOutput || !activeLayout) return;
    setFusingLayout(true);
    try {
      onAddLog(
        'INFO',
        `Fusing AIDA64 sensor panel (${activeLayout.screen.width}×${activeLayout.screen.height}, ${activeLayout.items.length} dials) onto image.`
      );
      const fusedUrl = await compositeLayoutOntoImage(
        activeOutput,
        activeLayout.screen,
        activeLayout.items,
        activeLayout.themeId,
        {
          dimBaseImage: 0.35,
          showConduits: true,
          showHexBolts: true,
          showTickMarks: true
        }
      );

      const asset = {
        id: `fused-layout-${Date.now()}`,
        title: `AIDA64 Sensor Panel ${activeLayout.screen.width}×${activeLayout.screen.height}`,
        type: 'image' as const,
        url: fusedUrl,
        fileFormat: 'PNG',
        timestamp: new Date().toISOString(),
        promptUsed: cfg.promptInput
      };
      setSavedAssets((prev) => [asset, ...prev]);
      onAddLog('INFO', `Saved fused sensor panel ${asset.id} to asset library.`);
    } catch (err: any) {
      onAddLog('WARN', `Failed to fuse layout: ${err.message}`);
    } finally {
      setFusingLayout(false);
    }
  };

  // Purge VRAM Cache
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
      onAddLog('SEC', 'Flushed VRAM cache & unloaded background models.', 'RULE_VRAM_PURGE');
    } catch (e: any) {
      onAddLog('WARN', `Failed to purge VRAM: ${e.message}`);
    } finally {
      setPurgingVram(false);
    }
  };

  // Upscale & Describe helpers
  const handleUpscale = (factor: number, fast: boolean = false) => {
    const targetW = Math.min(1920, Math.round(width * factor));
    const targetH = Math.min(1080, Math.round(height * factor));
    setWidth(targetW);
    setHeight(targetH);
    onAddLog('INFO', `Configured Fooocus upscale: ${targetW}×${targetH} (${factor}x) with ${fast ? 'fast' : 'detail'} pass.`);
    handleGenerate();
  };

  const handleApplyDescribedPrompt = (text: string) => {
    updatePromptStudio({ promptInput: text });
    onAddLog('INFO', 'Applied described image prompt to Prompt Studio.');
  };

  return (
    <section className="bg-[#0b0f19] border border-[#30363d] rounded-2xl overflow-hidden mb-5 shadow-2xl">
      {/* Top Gina Header Bar */}
      <div className="px-4 py-3 border-b border-[#21262d] bg-[#161b22] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center shadow-inner">
            <Sparkles className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-white tracking-wider font-mono">
                GINA IMAGE STUDIO
              </h2>
              <span className="px-2 py-0.2 rounded bg-blue-500/15 border border-blue-500/30 text-[9px] text-blue-300 font-mono">
                FLUX.1-Schnell GGUF
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 font-mono">
              Prompt-focused creation · ComfyUI local backend · RTX 3070 Ti 8GB VRAM cage
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span
            className={`px-2.5 py-1 rounded-md border flex items-center gap-1.5 font-bold ${
              online
                ? 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10'
                : 'border-rose-500/30 text-rose-300 bg-rose-500/10'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            {online ? 'COMFYUI READY' : 'OFFLINE'}
          </span>

          <button
            type="button"
            onClick={() => setVramGraphOpen((v) => !v)}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white transition-colors"
            title="Toggle Live VRAM Monitor"
          >
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span>VRAM: {vramTotal}</span>
          </button>

          <button
            type="button"
            onClick={handlePurgeVram}
            disabled={purgingVram}
            className="p-1.5 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-amber-300 transition-colors"
            title="Purge VRAM Cache"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Optional VRAM Telemetry Graph Drawer */}
      {vramGraphOpen && (
        <div className="bg-[#0d1117] border-b border-[#21262d] p-3 animate-in fade-in">
          <VRAMHistoryGraph telemetry={telemetry} />
        </div>
      )}

      {/* Authentic Fooocus Main Workspace */}
      <div
        className={`p-4 sm:p-5 bg-[#0d1117] ${
          advancedOpen
            ? 'grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-5 items-start'
            : 'max-w-5xl mx-auto w-full flex flex-col gap-4'
        }`}
      >
        {/* Left Column (Fooocus scale=2): Output Canvas + (Optional Input Image) + Prompt Box + Checkboxes */}
        <div className="flex flex-col gap-4 min-w-0">
          {/* Main Unobstructed Image Preview & History (Centerpiece) */}
          <GinaImagePreview
            activeOutput={activeOutput}
            job={job}
            outputLoading={outputLoading}
            isBusy={isBusy}
            history={history}
            onSelectHistory={(item) => {
              updatePromptStudio({ promptInput: item.prompt });
              if (item.width && item.height) {
                setWidth(item.width);
                setHeight(item.height);
              }
              if (item.seed) setSeedValue(item.seed);
            }}
            onVary={handleVary}
            onKeepImage={handleKeepImage}
            onUnlockImage={handleUnlockImage}
            lockSeed={lockSeed}
            promotingImage={promotingImage}
            keepNotification={keepNotification}
            onDownload={handleDownload}
            onSaveAsset={handleSaveAsset}
            savingAsset={savingAsset}
            activeLayout={activeLayout}
            onFuseLayout={handleFuseLayout}
            fusingLayout={fusingLayout}
            resolutionLabel={`${width} × ${height}`}
            ratioLabel={currentRatioDef.label}
          />

          {/* Drawer: Input Image Tabs (Appears when [x] Input Image is checked) */}
          {inputImageOpen && (
            <GinaImageInput
              referenceImage={referenceImage}
              onSetReferenceImage={setReferenceImage}
              onUploadImage={handleUploadImage}
              uploading={uploadingReference}
              uploadError={referenceUploadError}
              imageWeight={imageWeight}
              onChangeImageWeight={setImageWeight}
              stopAt={stopAt}
              onChangeStopAt={setStopAt}
              mode={inputImageMode}
              onChangeMode={setInputImageMode}
              activeOutputUrl={activeOutput}
              onUseActiveOutput={() => {
                if (activeOutput && job) {
                  handleKeepImage();
                }
              }}
              hasInputImageWorkflow={controls.some((c) => c.key === 'input_image')}
              onVarySubtle={() => handleVary('subtle')}
              onVaryStrong={() => handleVary('strong')}
              onUpscale={handleUpscale}
              onApplyDescribedPrompt={handleApplyDescribedPrompt}
            />
          )}

          {/* AIDA64 Active Panel Notice */}
          {activeLayout && (
            <div className="px-3.5 py-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 flex items-center justify-between">
              <div className="text-xs font-mono">
                <span className="font-bold">AIDA64 Layout Active:</span> {activeLayout.screen.width}×{activeLayout.screen.height} · {activeLayout.items.length} sensor sockets mapped.
              </div>
              <button
                type="button"
                onClick={() => setActiveAida64Layout(null)}
                className="text-zinc-500 hover:text-white"
                title="Detach layout"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Active Style Tags Strip */}
          {selectedStyles.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 px-1">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mr-1">
                Styles:
              </span>
              {selectedStyles.map((styleId) => {
                const style = GINA_IMAGE_STYLES.find((s) => s.id === styleId);
                return (
                  <span
                    key={styleId}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-600/20 border border-blue-500/40 text-[10px] font-semibold text-blue-300"
                  >
                    <span>{style?.name || styleId}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleStyle(styleId)}
                      className="hover:text-white transition-colors"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {/* Prompt Input & Generate Button Box */}
          <div className="relative flex flex-col sm:flex-row gap-2 bg-[#161b22] border border-[#30363d] rounded-2xl p-2.5 shadow-xl focus-within:border-blue-500/70 transition-all">
            <textarea
              ref={textareaRef}
              rows={3}
              value={cfg.promptInput}
              onChange={(e) => updatePromptStudio({ promptInput: e.target.value })}
              onKeyDown={handleKeyDown}
              placeholder="Type prompt here or paste parameters... (Press Ctrl+Enter to generate)"
              className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 p-2 outline-none resize-none leading-relaxed font-sans"
            />

            <div className="flex sm:flex-col justify-end gap-2 flex-shrink-0">
              {!isBusy ? (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!cfg.promptInput.trim() || !online}
                  className="w-full sm:w-36 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-extrabold text-xs tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all active:scale-95"
                >
                  <Play className="w-4 h-4 fill-current" />
                  GENERATE
                </button>
              ) : (
                <button
                  type="button"
                  onClick={cancelJob}
                  className="w-full sm:w-36 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition-all animate-pulse"
                >
                  <Square className="w-4 h-4 fill-current" />
                  CANCEL
                </button>
              )}
            </div>
          </div>

          {/* Fooocus Bottom Checkbox Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5 text-xs">
            <div className="flex items-center gap-5">
              {/* [ ] Input Image Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer select-none font-semibold text-zinc-300 hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={inputImageOpen}
                  onChange={(e) => setInputImageOpen(e.target.checked)}
                  className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-blue-500 focus:ring-0 cursor-pointer"
                />
                <span>Input Image</span>
                {referenceImage && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400" title="Reference Image Attached" />
                )}
              </label>

              {/* [x] Advanced Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer select-none font-semibold text-zinc-300 hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={advancedOpen}
                  onChange={(e) => setAdvancedOpen(e.target.checked)}
                  className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-blue-500 focus:ring-0 cursor-pointer"
                />
                <span>Advanced</span>
                {advancedOpen ? (
                  <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                )}
              </label>
            </div>

            {/* Quick Actions / Helpers */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSurpriseMe}
                className="px-2.5 py-1 rounded-lg bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] text-[10px] text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors"
                title="Surprise Me (Random Prompt)"
              >
                <Dices className="w-3.5 h-3.5 text-blue-400" />
                <span>Surprise Me</span>
              </button>

              {cfg.promptInput && (
                <button
                  type="button"
                  onClick={() => updatePromptStudio({ promptInput: '' })}
                  className="px-2 py-1 rounded-lg bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] text-[10px] text-zinc-400 hover:text-rose-400 transition-colors"
                  title="Clear Prompt"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (Fooocus scale=1): Advanced Settings Tabs (Setting | Style | Model | Advanced) */}
        {advancedOpen && (
          <div className="w-full shrink-0 animate-in fade-in slide-in-from-right-2 duration-200">
            <GinaImageSettings
              activeTab={activeSettingsTab}
              onTabChange={setActiveSettingsTab}
              performance={performance}
              onChangePerformance={handleChangePerformance}
              selectedRatio={selectedRatio}
              onSelectRatio={handleSelectRatio}
              width={width}
              height={height}
              onChangeWidth={setWidth}
              onChangeHeight={setHeight}
              customSize={customSize}
              onToggleCustomSize={() => setCustomSize((v) => !v)}
              imageNumber={imageNumber}
              onChangeImageNumber={setImageNumber}
              negativePrompt={cfg.negativePrompt || ''}
              onChangeNegativePrompt={(val) => updatePromptStudio({ negativePrompt: val })}
              seed={seedValue}
              onChangeSeed={setSeedValue}
              randomSeed={randomSeed}
              onToggleRandomSeed={() => setRandomSeed((v) => !v)}
              onRandomizeSeed={() => setSeedValue(Math.floor(Math.random() * 2147483647))}
              selectedStyles={selectedStyles}
              onToggleStyle={handleToggleStyle}
              onClearStyles={handleClearStyles}
              onSelectGinaV2Default={handleSelectGinaV2Default}
              baseModel={baseModel}
              onChangeBaseModel={setBaseModel}
              loras={loras}
              onChangeLora={(idx, partial) =>
                setLoras((prev) => prev.map((l, i) => (i === idx ? { ...l, ...partial } : l)))
              }
              workflowModelLabel={workflowModelLabel}
              guidanceScale={guidanceScale}
              onChangeGuidanceScale={setGuidanceScale}
              steps={steps}
              onChangeSteps={setSteps}
              sampler={sampler}
              onChangeSampler={setSampler}
              scheduler={scheduler}
              onChangeScheduler={setScheduler}
              denoise={denoise}
              onChangeDenoise={setDenoise}
              telemetry={telemetry}
              gpuName={gpuName}
              vramTotal={vramTotal}
              onPurgeVram={handlePurgeVram}
              purgingVram={purgingVram}
              workflowDetails={
                workflow
                  ? {
                      capabilities: workflow.capabilities,
                      bindings: workflow.bindings
                    }
                  : null
              }
            />
          </div>
        )}
      </div>
    </section>
  );
};
