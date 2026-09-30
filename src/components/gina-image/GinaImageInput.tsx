import React, { useRef, useState } from 'react';
import {
  Upload, X, Image as ImageIcon, Sparkles, User, Scissors, Grid,
  Maximize2, Wand2, Paintbrush, FileText, ArrowRight, Check, RefreshCw, Undo2, RotateCcw
} from 'lucide-react';
import { GinaInpaintCanvas, MaskData } from './GinaInpaintCanvas';

export type InputImageMode = 'image_prompt' | 'face_swap' | 'pyracanny' | 'cpds';
export type InputImageTab = 'upscale_variation' | 'image_prompt' | 'inpaint_outpaint' | 'describe';

interface ImagePromptSlot {
  id: number;
  image: { filename: string; name: string; bytes: number; previewUrl: string } | null;
  mode: InputImageMode;
  weight: number;
  stopAt: number;
}

interface GinaImageInputProps {
  referenceImage: {
    filename: string;
    name: string;
    bytes: number;
    previewUrl: string;
  } | null;
  onSetReferenceImage: (img: { filename: string; name: string; bytes: number; previewUrl: string } | null) => void;
  onUploadImage: (file: File) => Promise<void>;
  uploading: boolean;
  uploadError: string | null;
  imageWeight: number;
  onChangeImageWeight: (weight: number) => void;
  stopAt: number;
  onChangeStopAt: (stopAt: number) => void;
  mode: InputImageMode;
  onChangeMode: (mode: InputImageMode) => void;
  activeOutputUrl?: string;
  onUseActiveOutput: () => void;
  hasInputImageWorkflow: boolean;
  onVarySubtle?: () => void;
  onVaryStrong?: () => void;
  onUpscale?: (factor: number, fast?: boolean) => void;
  onApplyDescribedPrompt?: (describedText: string) => void;
  inpaintMask?: { filename: string; previewUrl: string } | null;
  onSetInpaintMask?: (mask: { filename: string; previewUrl: string } | null) => void;
  onTriggerInpaint?: (additionalPrompt?: string) => void;
  visionEngine?: 'qwen3.5' | 'qwen';
}

export const GinaImageInput: React.FC<GinaImageInputProps> = ({
  referenceImage,
  onSetReferenceImage,
  onUploadImage,
  uploading,
  uploadError,
  imageWeight,
  onChangeImageWeight,
  stopAt,
  onChangeStopAt,
  mode,
  onChangeMode,
  activeOutputUrl,
  onUseActiveOutput,
  hasInputImageWorkflow,
  onVarySubtle,
  onVaryStrong,
  onUpscale,
  onApplyDescribedPrompt,
  inpaintMask,
  onSetInpaintMask,
  onTriggerInpaint,
  visionEngine = 'qwen3.5'
}) => {
  // Smarter tab tracking array layer
  const [activeTab, setActiveTab] = useState<InputImageTab>('image_prompt');
  
  // PERSISTENT MEMORY WORKAROUND LAYER:
  // Keeps your image elements mounted even when your dashboard triggers cleanups
  const [localImageBackup, setLocalImageBackup] = useState<{
    filename: string;
    name: string;
    bytes: number;
    previewUrl: string;
  } | null>(null);

  // Sync references to our local state manager cache bucket securely
  React.useEffect(() => {
    if (referenceImage) {
      setLocalImageBackup(referenceImage);
    }
  }, [referenceImage]);

  // Keep slot 1 synced using our smart local backup pointer variables
  React.useEffect(() => {
    const currentDisplayImage = referenceImage || localImageBackup;
    setSlots(prev => prev.map((s, idx) => 
      idx === 0 ? { ...s, image: currentDisplayImage, mode, weight: imageWeight, stopAt } : s
    ));
  }, [referenceImage, localImageBackup, mode, imageWeight, stopAt]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const describeFileInputRef = useRef<HTMLInputElement | null>(null);
  const inpaintFileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  
  // Upscale / Variation state
  const [variationMethod, setVariationMethod] = useState<'disabled' | 'subtle' | 'strong' | 'upscale_15' | 'upscale_2' | 'upscale_fast_2'>('disabled');
  // Gina-AI-Assistant-style order of processing for enhance/upscale relative to Image Prompt mixture
  const [orderOfProcessing, setOrderOfProcessing] = useState<'before_first' | 'after_last'>('before_first');
  // Advanced panel under Image Prompt (weight/stop/mode per slot)
  const [imagePromptAdvanced, setImagePromptAdvanced] = useState(false);

  // Inpaint / Outpaint state
  const [inpaintMethod, setInpaintMethod] = useState<'default' | 'improve_detail' | 'modify_content'>('default');
  const [outpaintLeft, setOutpaintLeft] = useState(false);
  const [outpaintRight, setOutpaintRight] = useState(false);
  const [outpaintTop, setOutpaintTop] = useState(false);
  const [outpaintBottom, setOutpaintBottom] = useState(false);
  const [inpaintAdditionalPrompt, setInpaintAdditionalPrompt] = useState('pure white whippet fur, photorealistic, pristine white coat');
  const [brushSize, setBrushSize] = useState(30);

  // Active inpaint mask data & upload state
  const [currentMaskData, setCurrentMaskData] = useState<MaskData | null>(null);
  const [uploadingMask, setUploadingMask] = useState(false);
  const [inpaintMaskUploaded, setInpaintMaskUploaded] = useState<{ filename: string; previewUrl: string } | null>(null);

  const handleMaskChange = async (mask: MaskData | null) => {
    setCurrentMaskData(mask);
    if (!mask || !mask.hasMask) {
      setInpaintMaskUploaded(null);
      onSetInpaintMask?.(null);
      return;
    }

    setUploadingMask(true);
    try {
      const filename = `mask_${Date.now()}.png`;
      const response = await fetch('/api/comfy/upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'image/png',
          'X-Gina-Filename': encodeURIComponent(filename),
          'X-Gina-Mime': 'image/png'
        },
        body: await mask.blob.arrayBuffer()
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.ok && data.filename) {
        const uploaded = { filename: data.filename, previewUrl: mask.dataUrl };
        setInpaintMaskUploaded(uploaded);
        onSetInpaintMask?.(uploaded);
      }
    } catch (e) {
      console.warn('Mask upload error:', e);
    } finally {
      setUploadingMask(false);
    }
  };

  const handleExecuteInpaint = async () => {
    if (!currentMaskData || !currentMaskData.hasMask) return;
    let maskInfo = inpaintMaskUploaded;
    if (!maskInfo) {
      setUploadingMask(true);
      try {
        const filename = `mask_${Date.now()}.png`;
        const response = await fetch('/api/comfy/upload-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'image/png',
            'X-Gina-Filename': encodeURIComponent(filename),
            'X-Gina-Mime': 'image/png'
          },
          body: await currentMaskData.blob.arrayBuffer()
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok && data.ok && data.filename) {
          maskInfo = { filename: data.filename, previewUrl: currentMaskData.dataUrl };
          setInpaintMaskUploaded(maskInfo);
          onSetInpaintMask?.(maskInfo);
        }
      } catch (err: any) {
        console.error('Failed to upload mask:', err);
        setUploadingMask(false);
        return;
      } finally {
        setUploadingMask(false);
      }
    }

    if (onTriggerInpaint) {
      onTriggerInpaint(inpaintAdditionalPrompt);
    }
  };

  // Describe state
  const [describeContentType, setDescribeContentType] = useState<'photo' | 'anime'>('photo');
  const [describing, setDescribing] = useState(false);
  const [describedResult, setDescribedResult] = useState<string | null>(null);

  // Multiple Image Prompt slots (1 to 4)
  const [activeSlot, setActiveSlot] = useState<number>(1);
  const [slots, setSlots] = useState<ImagePromptSlot[]>([
    { id: 1, image: referenceImage, mode, weight: imageWeight, stopAt },
    { id: 2, image: null, mode: 'image_prompt', weight: 0.85, stopAt: 0.85 },
    { id: 3, image: null, mode: 'face_swap', weight: 0.95, stopAt: 0.9 },
    { id: 4, image: null, mode: 'pyracanny', weight: 0.6, stopAt: 0.5 }
  ]);
  // Keep slot 1 synced with referenceImage prop
  React.useEffect(() => {
    setSlots(prev => prev.map((s, idx) => idx === 0 ? { ...s, image: referenceImage, mode, weight: imageWeight, stopAt } : s));
  }, [referenceImage, mode, imageWeight, stopAt]);

  // Automated prompt optimization & execution states
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState<string>('');
  const [automationConfig] = useState({
    dogBreed: "Whippet",
    dogColor: "pure white",
    youtubeChannelName: "THE WHIPPET",
    backgroundPhotoDescription: "a beautiful woman with long dark hair looking forward"
  });

  const handleAutomatedPipelineRun = async (activeWorkflowName: string) => {
    setIsOptimizing(true);
    setPipelineStatus('Querying local prompt registry schema...');

    try {
      const response = await fetch('/api/llm/optimize-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activeWorkflow: activeWorkflowName,
          ...automationConfig
        })
      });
      
      const payload = await response.json();
      const promptData: string | string[] = payload.prompt;
      let targetTextPrompt = '';

      if (typeof promptData === 'string') {
        targetTextPrompt = promptData;
        setPipelineStatus('Injecting unified target string into Flux engine...');
        if (onApplyDescribedPrompt) onApplyDescribedPrompt(promptData);
      } else if (Array.isArray(promptData)) {
        targetTextPrompt = promptData[0]; // Isolate base subject layout string
        setPipelineStatus('Multi-pass pipeline generated. Applying Pass 1 (Base Subject)...');
        if (onApplyDescribedPrompt) onApplyDescribedPrompt(targetTextPrompt);
        
        setInpaintAdditionalPrompt(`[Monitor UI Step]: ${promptData[1]} | [Background Wall Step]: ${promptData[2]}`);
      }

      setPipelineStatus(
        Array.isArray(promptData)
          ? 'Optimized subject, monitor, and background layers synchronized to the main prompt.'
          : 'Optimized scene prompt synchronized to the main prompt.'
      );
    } catch (err) {
      console.error('Pipeline loop processing error:', err);
      setPipelineStatus('Error routing metrics to engine runtime.');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onUploadImage(file);
    }
  };

  const handleModeChange = (newMode: InputImageMode) => {
    onChangeMode(newMode);
    let defWeight = 0.85;
    let defStop = 0.85;
    if (newMode === 'face_swap') {
      defWeight = 0.95;
      defStop = 0.9;
    } else if (newMode === 'pyracanny') {
      defWeight = 0.6;
      defStop = 0.5;
    } else if (newMode === 'cpds') {
      defWeight = 0.7;
      defStop = 0.6;
    }
    onChangeImageWeight(defWeight);
    onChangeStopAt(defStop);
  };

  const handleDescribeImage = async () => {
    if (!referenceImage && !activeOutputUrl) return;
    if (!referenceImage) {
      setDescribedResult('Use the active output as a reference first, then run Describe again.');
      return;
    }
    setDescribing(true);
    setDescribedResult(null);
    try {
      const response = await fetch('/api/llm/describe-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: referenceImage.filename, contentType: describeContentType, engine: visionEngine })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok || !data.description) {
        throw new Error(data.error || `Vision description failed (HTTP ${response.status}).`);
      }
      setDescribedResult(String(data.description).trim());
      // Applying immediately keeps the described image and the next generation in sync.
      if (onApplyDescribedPrompt) onApplyDescribedPrompt(String(data.description).trim());
    } catch (err: any) {
      setDescribedResult(`Unable to describe image: ${err?.message || err}`);
    } finally {
      setDescribing(false);
    }
  };

  return (
    <div className="bg-[#121722] border border-[#2b3347] rounded-xl overflow-hidden shadow-2xl transition-all">
      {/* Gina-AI-Assistant-style Sub-tabs header */}
      <div className="flex border-b border-[#21262d] bg-[#0d111a] px-2 pt-1 gap-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('upscale_variation')}
          className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'upscale_variation'
              ? 'bg-[#121722] text-white border-t-2 border-blue-500 font-bold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#161c28]'
          }`}
        >
          <Wand2 className="w-3.5 h-3.5 text-blue-400" />
          <span>Upscale or Variation</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('image_prompt')}
          className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'image_prompt'
              ? 'bg-[#121722] text-white border-t-2 border-blue-500 font-bold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#161c28]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>Image Prompt</span>
          {referenceImage && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('inpaint_outpaint')}
          className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'inpaint_outpaint'
              ? 'bg-[#121722] text-white border-t-2 border-blue-500 font-bold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#161c28]'
          }`}
        >
          <Paintbrush className="w-3.5 h-3.5 text-purple-400" />
          <span>Inpaint or Outpaint</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('describe')}
          className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'describe'
              ? 'bg-[#121722] text-white border-t-2 border-blue-500 font-bold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#161c28]'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-amber-400" />
          <span>Describe</span>
        </button>
      </div>

      <div className="p-4">
        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.bmp,.gif,image/png,image/jpeg,image/webp,image/bmp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onUploadImage(file);
          }}
        />
        {/* TAB 1: Upscale or Variation */}
        {activeTab === 'upscale_variation' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
              <span className="text-zinc-400">
                Generate subtle or strong variations of an image, or upscale by 1.5x / 2.0x.
              </span>
              {activeOutputUrl && (
                <button
                  type="button"
                  onClick={onUseActiveOutput}
                  className="text-blue-400 hover:text-blue-300 font-mono text-[11px] underline flex items-center gap-1"
                >
                  Load Active Output Image
                </button>
              )}
            </div>

            {/* Smart Local Backup Display Condition Layer */}
            {!(referenceImage || localImageBackup) ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  dragOver ? 'border-blue-500 bg-blue-500/10' : 'border-[#2d3548] hover:border-blue-500/50 bg-[#0a0e17]'
                }`}
              >
                <Upload className="w-6 h-6 mx-auto text-zinc-500 mb-2" />
                <div className="text-xs font-bold text-zinc-200">
                  {uploading ? 'Uploading to ComfyUI…' : 'Drop Image Here or Click to Upload for Variation/Upscale'}
                </div>
                <div className="text-[10px] text-zinc-500 mt-1 font-mono">
                  PNG · JPG · WEBP · 12 MB MAX
                </div>
              </div>
            ) : (
              <div className="bg-[#0a0e17] rounded-xl border border-[#282f42] p-3 flex items-center gap-3">
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#38415c] shrink-0 bg-black">
                  {/* Pull cleanly from our persistent local cache layer */}
                  <img src={(referenceImage || localImageBackup)?.previewUrl} alt="Variation Target" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-zinc-200 truncate font-mono">{(referenceImage || localImageBackup)?.name}</div>
                  <div className="text-[10px] text-zinc-500 font-mono font-bold">
                    ComfyUI Status Cache Locked · Ready for Variations
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onSetReferenceImage(null);
                    setLocalImageBackup(null); // Clear both variables manually on click
                  }}
                  className="p-1 text-zinc-500 hover:text-rose-400"
                  title="Clear image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Variation & Upscale Radios — Gina-AI-Assistant layout */}
            <div>
              <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2">Upscale or Variation:</div>
              <div className="flex flex-wrap gap-2 text-xs">
                {[
                  { id: 'disabled', label: 'Disabled' },
                  { id: 'subtle', label: 'Vary (Subtle)' },
                  { id: 'strong', label: 'Vary (Strong)' },
                  { id: 'upscale_15', label: 'Upscale (1.5x)' },
                  { id: 'upscale_2', label: 'Upscale (2x)' },
                  { id: 'upscale_fast_2', label: 'Upscale (Fast 2x)' }
                ].map((m) => (
                  <label
                    key={m.id}
                    className={`px-3 py-2 rounded-lg border cursor-pointer transition-all flex items-center gap-2 ${
                      variationMethod === m.id
                        ? 'border-blue-500 bg-blue-500/15 text-white shadow'
                        : 'border-[#262d3e] bg-[#0c101a] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="variation_method"
                      value={m.id}
                      checked={variationMethod === m.id}
                      onChange={() => {
                        setVariationMethod(m.id as any);
                        if (m.id === 'subtle' && onVarySubtle) onVarySubtle();
                        if (m.id === 'strong' && onVaryStrong) onVaryStrong();
                        if (m.id === 'upscale_15' && onUpscale) onUpscale(1.5);
                        if (m.id === 'upscale_2' && onUpscale) onUpscale(2.0);
                        if (m.id === 'upscale_fast_2' && onUpscale) onUpscale(2.0, true);
                      }}
                      className="accent-blue-500"
                    />
                    <span className="font-semibold text-xs">{m.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Order of Processing — Before First / After Last Enhancement */}
            <div className="pt-2 border-t border-[#1e2433]">
              <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1">Order of Processing</div>
              <p className="text-[10px] text-zinc-500 mb-2">
                Use before to enhance small details and after to enhance large areas.
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                {[
                  { id: 'before_first', label: 'Before First Enhancement' },
                  { id: 'after_last', label: 'After Last Enhancement' }
                ].map((o) => (
                  <label
                    key={o.id}
                    className={`px-3 py-2 rounded-lg border cursor-pointer transition-all flex items-center gap-2 ${
                      orderOfProcessing === o.id
                        ? 'border-blue-500 bg-blue-500/15 text-white shadow'
                        : 'border-[#262d3e] bg-[#0c101a] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="order_of_processing"
                      value={o.id}
                      checked={orderOfProcessing === o.id}
                      onChange={() => setOrderOfProcessing(o.id as 'before_first' | 'after_last')}
                      className="accent-blue-500"
                    />
                    <span className="font-semibold text-xs">{o.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* TAB 2: Image Prompt — Gina-AI-Assistant-style 2×2 drop zones (Image Mixture Engine) */}
        {activeTab === 'image_prompt' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-zinc-400">
                Drop up to 4 reference images. Slot 1 is the primary identity/style anchor so edits (e.g. &quot;add sunglasses&quot;) stay on the same subject.
              </p>
              {activeOutputUrl && (
                <button
                  type="button"
                  onClick={onUseActiveOutput}
                  className="text-blue-400 hover:text-blue-300 font-mono text-[10px] underline shrink-0"
                >
                  Use Active Output
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {slots.map((slot, idx) => {
                const isPrimary = idx === 0;
                const displayImg = isPrimary ? (referenceImage || localImageBackup || slot.image) : slot.image;
                return (
                  <div
                    key={slot.id}
                    className={`relative rounded-xl border min-h-[140px] flex flex-col items-center justify-center transition-all ${
                      displayImg
                        ? 'border-[#38415c] bg-[#0a0e17]'
                        : 'border-dashed border-[#2d3548] bg-[#0d121c] hover:border-blue-500/50 cursor-pointer'
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      const file = e.dataTransfer.files?.[0];
                      if (!file) return;
                      setActiveSlot(slot.id);
                      void onUploadImage(file);
                    }}
                    onClick={() => {
                      setActiveSlot(slot.id);
                      if (!displayImg) fileInputRef.current?.click();
                    }}
                  >
                    {displayImg ? (
                      <>
                        <img
                          src={displayImg.previewUrl}
                          alt={`Slot ${slot.id}`}
                          className="absolute inset-0 w-full h-full object-cover rounded-xl opacity-90"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent rounded-xl" />
                        <div className="relative z-10 w-full p-2 flex items-end justify-between mt-auto">
                          <span className="text-[10px] font-mono text-white/90 truncate max-w-[70%]">
                            {displayImg.name || `Image ${slot.id}`}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isPrimary) {
                                onSetReferenceImage(null);
                                setLocalImageBackup(null);
                              }
                              setSlots(prev => prev.map((s, i) => i === idx ? { ...s, image: null } : s));
                            }}
                            className="p-1 rounded bg-black/50 text-zinc-300 hover:text-rose-400"
                            title="Clear slot"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {isPrimary && (
                          <span className="absolute top-2 left-2 text-[9px] font-mono font-bold bg-emerald-600/80 text-white px-1.5 py-0.5 rounded">
                            PRIMARY
                          </span>
                        )}
                      </>
                    ) : (
                      <div className="text-center px-3 py-6 pointer-events-none">
                        <div className="text-sm font-semibold text-zinc-300">Drop Image Here</div>
                        <div className="text-[11px] text-zinc-500 my-0.5">- or -</div>
                        <div className="text-sm font-semibold text-zinc-300">Click to Upload</div>
                        {!isPrimary && (
                          <div className="text-[9px] text-zinc-600 mt-2 font-mono">Slot {slot.id}</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={imagePromptAdvanced}
                  onChange={(e) => setImagePromptAdvanced(e.target.checked)}
                  className="accent-blue-500 rounded"
                />
                <span className="text-xs text-zinc-300 font-medium">Advanced</span>
              </label>
            </div>

            {imagePromptAdvanced && (
              <div className="space-y-3 pt-2 border-t border-[#1e2433]">
                <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                  Active slot: Image {activeSlot} — Control Mode
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'image_prompt', label: 'ImagePrompt', icon: <Sparkles className="w-3.5 h-3.5 text-blue-400" />, desc: 'Style & atmosphere' },
                    { id: 'face_swap', label: 'FaceSwap', icon: <User className="w-3.5 h-3.5 text-emerald-400" />, desc: 'Facial likeness' },
                    { id: 'pyracanny', label: 'PyraCanny', icon: <Scissors className="w-3.5 h-3.5 text-purple-400" />, desc: 'Edge structure' },
                    { id: 'cpds', label: 'CPDS', icon: <Grid className="w-3.5 h-3.5 text-amber-400" />, desc: 'Depth & geometry' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleModeChange(m.id as InputImageMode)}
                      className={`p-2 rounded-lg border text-left flex flex-col transition-all ${
                        mode === m.id
                          ? 'bg-blue-600/20 border-blue-500 text-white shadow'
                          : 'bg-[#0d121c] border-[#22283a] text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        {m.icon}
                        <span>{m.label}</span>
                      </div>
                      <span className="text-[9px] text-zinc-500 mt-1">{m.desc}</span>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-1">
                      <span>Image Weight:</span>
                      <span className="text-blue-300 font-bold">{imageWeight.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={0.0}
                      max={2.0}
                      step={0.05}
                      value={imageWeight}
                      onChange={(e) => onChangeImageWeight(parseFloat(e.target.value))}
                      className="w-full accent-blue-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-1">
                      <span>Stop At:</span>
                      <span className="text-blue-300 font-bold">{stopAt.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={0.0}
                      max={1.0}
                      step={0.05}
                      value={stopAt}
                      onChange={(e) => onChangeStopAt(parseFloat(e.target.value))}
                      className="w-full accent-blue-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            <p className="text-[10px] text-zinc-500">
              * &quot;Image Prompt&quot; is powered by Gina-AI-Assistant Image Mixture Engine (v1.20.16).{' '}
              <a
                href="https://github.com/Whippet-UK/Gina-AI-Assistant"
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:underline"
              >
                Documentation
              </a>
            </p>
          </div>
        )}

        {/* TAB 3: Inpaint or Outpaint */}
        {activeTab === 'inpaint_outpaint' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-zinc-300 font-medium">
                Paint over the exact area you want to change (e.g. paint the dog to change its fur to white).
                Unpainted areas remain 100% frozen bit-for-bit.
              </div>
              {referenceImage && (
                <div className="text-[11px] font-mono text-purple-400 bg-purple-500/10 border border-purple-500/30 px-2.5 py-1 rounded-md">
                  Active Reference: {referenceImage.name}
                </div>
              )}
            </div>

            {/* Interactive Canvas or Empty Image Prompt */}
            {referenceImage ? (
              <GinaInpaintCanvas
                imageUrl={referenceImage.previewUrl}
                imageName={referenceImage.name}
                onMaskChange={handleMaskChange}
                disabled={uploadingMask}
              />
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#2b354c] hover:border-purple-500/60 bg-[#0c101a] rounded-xl p-8 text-center cursor-pointer transition-all space-y-3"
              >
                <div className="w-12 h-12 mx-auto rounded-xl bg-purple-600/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Paintbrush className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-200">
                    Upload an Image to Begin Inpainting
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    Upload your dog picture or any reference image to mask and edit specific elements.
                  </div>
                </div>
                <div className="flex justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition-all"
                  >
                    Select Image File
                  </button>
                  {activeOutputUrl && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUseActiveOutput();
                      }}
                      className="px-4 py-2 bg-[#171f30] hover:bg-[#1f2a42] text-zinc-200 border border-[#2b354c] text-xs font-bold rounded-lg transition-all"
                    >
                      Use Latest Output Image
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Inpaint Instructions & Presets */}
            {referenceImage && (
              <div className="space-y-3 bg-[#0c111d] border border-[#1f273b] p-3.5 rounded-xl">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                    Inpaint Instructions (What to generate in the masked area):
                  </label>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-zinc-500">Quick Presets:</span>
                    <button
                      type="button"
                      onClick={() => setInpaintAdditionalPrompt('pure white whippet fur, pristine white coat, photorealistic texture, natural soft fur lighting')}
                      className="px-2 py-0.5 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-mono transition-all"
                    >
                      🐕 White Whippet Fur
                    </button>
                    <button
                      type="button"
                      onClick={() => setInpaintAdditionalPrompt('golden retriever fur, soft golden honey fur texture, photorealistic')}
                      className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-mono transition-all"
                    >
                      🦮 Golden Fur
                    </button>
                    <button
                      type="button"
                      onClick={() => setInpaintAdditionalPrompt('black sleek fur, shiny dark coat, photorealistic lighting')}
                      className="px-2 py-0.5 rounded bg-zinc-700/40 hover:bg-zinc-700/60 text-zinc-300 border border-zinc-600 font-mono transition-all"
                    >
                      🐈‍⬛ Black Fur
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inpaintAdditionalPrompt}
                    onChange={(e) => setInpaintAdditionalPrompt(e.target.value)}
                    placeholder="e.g. pure white whippet fur, pristine white coat, natural fur highlights..."
                    className="flex-1 bg-[#0a0e17] border border-[#262e42] rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-purple-500"
                  />
                </div>

                {/* Primary Action Button */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                  <button
                    type="button"
                    disabled={!currentMaskData?.hasMask || uploadingMask}
                    onClick={handleExecuteInpaint}
                    className={`flex-1 w-full py-3 px-5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg ${
                      currentMaskData?.hasMask && !uploadingMask
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/30 cursor-pointer scale-[1.01]'
                        : 'bg-zinc-800/70 text-zinc-500 cursor-not-allowed border border-zinc-700/40'
                    }`}
                  >
                    <Paintbrush className="w-4 h-4" />
                    <span>
                      {uploadingMask
                        ? 'Syncing Mask to ComfyUI…'
                        : currentMaskData?.hasMask
                        ? `🎨 Generate Inpaint (${currentMaskData.coveragePercent}% Masked — Background 100% Frozen)`
                        : 'Draw Over the Dog to Mask for Inpainting'}
                    </span>
                  </button>

                  {inpaintMaskUploaded && (
                    <div className="text-[11px] font-mono text-purple-300 bg-purple-500/10 border border-purple-500/30 px-3 py-2.5 rounded-xl shrink-0 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-purple-400" />
                      <span>Mask Ready: {inpaintMaskUploaded.filename}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Inpaint Method selection */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
              {[
                { id: 'default', label: 'Inpaint / Outpaint (Default)', desc: 'Standard fill masked areas' },
                { id: 'improve_detail', label: 'Improve Detail (Face/Hand)', desc: 'Gentle detail refinement' },
                { id: 'modify_content', label: 'Modify Content', desc: 'Replace masked subject with prompt' }
              ].map((m) => (
                <label
                  key={m.id}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                    inpaintMethod === m.id
                      ? 'border-purple-500 bg-purple-500/10 text-white'
                      : 'border-[#262d3e] bg-[#0c101a] text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="inpaint_method"
                      value={m.id}
                      checked={inpaintMethod === m.id}
                      onChange={() => setInpaintMethod(m.id as any)}
                      className="accent-purple-500"
                    />
                    <span className="font-bold">{m.label}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 mt-1">{m.desc}</span>
                </label>
              ))}
            </div>

            {/* Outpaint Direction Checkboxes */}
            <div className="bg-[#0a0e17] border border-[#212738] rounded-xl p-3">
              <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-2">
                Outpaint Expansion Directions:
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-zinc-300">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={outpaintLeft}
                    onChange={(e) => setOutpaintLeft(e.target.checked)}
                    className="accent-purple-500"
                  />
                  <span>Left</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={outpaintRight}
                    onChange={(e) => setOutpaintRight(e.target.checked)}
                    className="accent-purple-500"
                  />
                  <span>Right</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={outpaintTop}
                    onChange={(e) => setOutpaintTop(e.target.checked)}
                    className="accent-purple-500"
                  />
                  <span>Top</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={outpaintBottom}
                    onChange={(e) => setOutpaintBottom(e.target.checked)}
                    className="accent-purple-500"
                  />
                  <span>Bottom</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Describe */}
        {activeTab === 'describe' && (
          <div className="space-y-4">
            <div className="text-xs text-zinc-400">
              Upload an image to automatically deconstruct it into a meticulous reconstruction prompt. The description is pixel-grounded by the selected vision engine (Qwen3.5 or Qwen 2.5-VL) and is applied to the main prompt automatically.
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="text-zinc-400 font-bold">Content Type:</span>
              <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300">
                <input
                  type="radio"
                  name="describe_content"
                  checked={describeContentType === 'photo'}
                  onChange={() => setDescribeContentType('photo')}
                  className="accent-amber-500"
                />
                <span>Photo</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300">
                <input
                  type="radio"
                  name="describe_content"
                  checked={describeContentType === 'anime'}
                  onChange={() => setDescribeContentType('anime')}
                  className="accent-amber-500"
                />
                <span>Anime</span>
              </label>
            </div>

            <button
              type="button"
              onClick={handleDescribeImage}
              disabled={describing || (!referenceImage && !activeOutputUrl)}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              {describing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {describing ? 'Analyzing Image Features…' : 'Describe this Image into Prompt'}
            </button>

            {describedResult && (
              <div className="p-3 bg-[#0d121c] border border-amber-500/40 rounded-xl space-y-2 animate-in fade-in">
                <div className="text-[10px] font-mono text-amber-300 uppercase font-bold">
                  Extracted Image Prompt:
                </div>
                <div className="text-xs text-zinc-200 font-sans leading-relaxed">
                  {describedResult}
                </div>
                {onApplyDescribedPrompt && (
                  <button
                    type="button"
                    onClick={() => onApplyDescribedPrompt(describedResult)}
                    className="px-3 py-1 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs hover:bg-amber-500/30 flex items-center gap-1.5 transition-colors"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>Re-apply to Main Prompt</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* AUTOMATED PROMPT OPTIMIZATION PANEL INJECTION */}
        <div className="mt-4 p-3 bg-[#0d111a] rounded-xl border border-[#21262d] shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> 
              <span>Automated Scene Alignment</span>
            </span>
          </div>
          <button
            type="button"
            disabled={isOptimizing}
            onClick={() => handleAutomatedPipelineRun(hasInputImageWorkflow ? 'sdxl_juggernaut_reference.json' : 'sdxl_juggernaut.json')}
            className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-2 transition-all shadow-md group"
          >
            {isOptimizing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />}
            <span>{isOptimizing ? 'Optimizing Targets...' : 'Sync Optimized Character & Assets Layout'}</span>
          </button>
          {pipelineStatus && (
            <div className="mt-2 text-[10px] text-indigo-400 font-mono animate-pulse pl-1 border-l border-indigo-500/40">
              &gt; {pipelineStatus}
            </div>
          )}
        </div>

        {uploadError && (
          <div className="mt-3 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[10px] text-rose-300 font-mono">
            {uploadError}
          </div>
        )}
      </div>
    </div>
  );
};
