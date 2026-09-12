import React, { useRef, useState } from 'react';
import {
  Upload, X, Image as ImageIcon, Sparkles, User, Scissors, Grid,
  Maximize2, Wand2, Paintbrush, FileText, ArrowRight, Check, RefreshCw
} from 'lucide-react';

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
  onApplyDescribedPrompt
}) => {
  const [activeTab, setActiveTab] = useState<InputImageTab>('image_prompt');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const describeFileInputRef = useRef<HTMLInputElement | null>(null);
  const inpaintFileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Upscale / Variation state
  const [variationMethod, setVariationMethod] = useState<'disabled' | 'subtle' | 'strong' | 'upscale_15' | 'upscale_2' | 'upscale_fast_2'>('disabled');

  // Inpaint / Outpaint state
  const [inpaintMethod, setInpaintMethod] = useState<'default' | 'improve_detail' | 'modify_content'>('default');
  const [outpaintLeft, setOutpaintLeft] = useState(false);
  const [outpaintRight, setOutpaintRight] = useState(false);
  const [outpaintTop, setOutpaintTop] = useState(false);
  const [outpaintBottom, setOutpaintBottom] = useState(false);
  const [inpaintAdditionalPrompt, setInpaintAdditionalPrompt] = useState('');
  const [brushSize, setBrushSize] = useState(30);

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
    setPipelineStatus('Querying local LLM optimizer matrix...');

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

      if (typeof promptData === 'string') {
        setPipelineStatus('Injecting unified target string into Flux engine...');
        if (onApplyDescribedPrompt) onApplyDescribedPrompt(promptData);
      } else if (Array.isArray(promptData)) {
        setPipelineStatus('Multi-pass pipeline generated. Applying Pass 1 (Base Subject)...');
        if (onApplyDescribedPrompt) onApplyDescribedPrompt(promptData[0]);
        
        // Pass subsequent structural context instructions over into your inpaint inputs
        setInpaintAdditionalPrompt(`[Monitor UI Step]: ${promptData[1]} | [Background Wall Step]: ${promptData[2]}`);
      }

      setPipelineStatus('Prompts successfully synchronized to workspace inputs.');
    } catch (err) {
      console.error('Pipeline routing error:', err);
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

  const handleDescribeImage = () => {
    if (!referenceImage && !activeOutputUrl) return;
    setDescribing(true);
    setTimeout(() => {
      let simulatedPrompt = '';
      if (describeContentType === 'photo') {
        simulatedPrompt = 'photorealistic cinematic capture, natural lighting, high dynamic range, intricate textures, shallow depth of field, 35mm photograph, sharp focus';
      } else {
        simulatedPrompt = 'vibrant anime aesthetic, clean outlines, dynamic cel shading, soft ambient illumination, atmospheric digital illustration, detailed background';
      }
      setDescribedResult(simulatedPrompt);
      setDescribing(false);
    }, 800);
  };

  return (
    <div className="bg-[#121722] border border-[#2b3347] rounded-xl overflow-hidden shadow-2xl transition-all">
      {/* Fooocus-style Sub-tabs header */}
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

            {/* Dropzone or Preview */}
            {!referenceImage ? (
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
                  <img src={referenceImage.previewUrl} alt="Variation Target" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-zinc-200 truncate font-mono">{referenceImage.name}</div>
                  <div className="text-[10px] text-zinc-500 font-mono">{(referenceImage.bytes / 1024 / 1024).toFixed(2)} MB · Ready in ComfyUI</div>
                </div>
                <button
                  type="button"
                  onClick={() => onSetReferenceImage(null)}
                  className="p-1 text-zinc-500 hover:text-rose-400"
                  title="Clear image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Variation & Upscale Radios */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {[
                { id: 'disabled', label: 'Disabled', desc: 'Standard generation' },
                { id: 'subtle', label: 'Vary (Subtle)', desc: 'Small adjustments, preserves character' },
                { id: 'strong', label: 'Vary (Strong)', desc: 'Re-imagines prompt layout and textures' },
                { id: 'upscale_15', label: 'Upscale (1.5x)', desc: 'Crisp enlargement with detail injection' },
                { id: 'upscale_2', label: 'Upscale (2x)', desc: 'Ultra-high resolution doubling' },
                { id: 'upscale_fast_2', label: 'Upscale (Fast 2x)', desc: 'Fast bilinear + detail pass' }
              ].map((m) => (
                <label
                  key={m.id}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                    variationMethod === m.id
                      ? 'border-blue-500 bg-blue-500/10 text-white shadow'
                      : 'border-[#262d3e] bg-[#0c101a] text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
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
                    <span className="font-bold text-xs">{m.label}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 mt-1 leading-tight">{m.desc}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        {/* TAB 2: Image Prompt (4 Slots with ImagePrompt, FaceSwap, PyraCanny, CPDS) */}
        {activeTab === 'image_prompt' && (
          <div className="space-y-4">
            {/* Slot selector: Image 1, Image 2, Image 3, Image 4 */}
            <div className="flex items-center justify-between gap-2 border-b border-[#21262d] pb-2">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4].map((slotId) => (
                  <button
                    key={slotId}
                    type="button"
                    onClick={() => setActiveSlot(slotId)}
                    className={`px-3 py-1 rounded-md text-xs font-mono font-bold transition-all ${
                      activeSlot === slotId
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-[#182030] text-zinc-400 hover:text-white border border-[#2b354d]'
                    }`}
                  >
                    Image {slotId}
                    {slotId === 1 && referenceImage && <span className="ml-1 text-emerald-300">●</span>}
                  </button>
                ))}
              </div>

              {activeOutputUrl && (
                <button
                  type="button"
                  onClick={onUseActiveOutput}
                  className="text-blue-400 hover:text-blue-300 font-mono text-[10px] underline flex items-center gap-1"
                >
                  Use Active Output
                </button>
              )}
            </div>

            {/* Active Slot Configuration */}
            {activeSlot === 1 ? (
              <div>
                {!referenceImage ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                      dragOver ? 'border-blue-500 bg-blue-500/10' : 'border-[#2d3548] hover:border-blue-500/50 bg-[#0a0e17]'
                    }`}
                  >
                    <Upload className="w-5 h-5 mx-auto text-zinc-500 mb-1.5" />
                    <div className="text-xs font-bold text-zinc-200">
                      {uploading ? 'Uploading to ComfyUI…' : 'Drop Image 1 Here or Click to Upload'}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5 font-mono">
                      PNG · JPG · WEBP · BMP · GIF · 12 MB MAX
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#0a0e17] rounded-xl border border-[#282f42] p-3 flex items-center gap-3">
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#38415c] shrink-0 bg-black">
                      <img src={referenceImage.previewUrl} alt="Reference Preview" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-200 truncate font-mono">{referenceImage.name}</span>
                        <button
                          type="button"
                          onClick={() => onSetReferenceImage(null)}
                          className="p-1 text-zinc-500 hover:text-rose-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        {(referenceImage.bytes / 1024 / 1024).toFixed(2)} MB · ComfyUI: <span className="text-emerald-400">{referenceImage.filename}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4 Fooocus Modes: ImagePrompt, FaceSwap, PyraCanny, CPDS */}
                <div className="mt-3">
                  <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">Control Mode</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'image_prompt', label: 'ImagePrompt', icon: <Sparkles className="w-3.5 h-3.5 text-blue-400" />, desc: 'Style & visual atmosphere' },
                      { id: 'face_swap', label: 'FaceSwap', icon: <User className="w-3.5 h-3.5 text-emerald-400" />, desc: 'Facial likeness transfer' },
                      { id: 'pyracanny', label: 'PyraCanny', icon: <Scissors className="w-3.5 h-3.5 text-purple-400" />, desc: 'Contour & edge structure' },
                      { id: 'cpds', label: 'CPDS', icon: <Grid className="w-3.5 h-3.5 text-amber-400" />, desc: '3D depth & geometry' }
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleModeChange(m.id as InputImageMode)}
                        className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all ${
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
                </div>
                {/* Sliders: Image Weight & Stop At */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pt-3 border-t border-[#1e2433]">
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
            ) : (
              <div className="bg-[#0c101a] border border-[#21262d] rounded-xl p-6 text-center text-zinc-500 text-xs">
                <div className="font-semibold text-zinc-300 mb-1">Image Slot {activeSlot}</div>
                <p className="text-[11px] max-w-sm mx-auto">
                  Slot 1 is your active primary reference. Additional multi-image slots can be uploaded for multi-control synthesis (ImagePrompt + FaceSwap combo).
                </p>
                <button
                  type="button"
                  onClick={() => setActiveSlot(1)}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-300 text-xs font-mono hover:bg-blue-600/30"
                >
                  Configure Primary Image 1
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Inpaint or Outpaint */}
        {activeTab === 'inpaint_outpaint' && (
          <div className="space-y-4">
            <div className="text-xs text-zinc-400">
              Paint masked areas to regenerate, improve face/hands, or expand canvas bounds via outpainting.
            </div>

            {/* Inpaint Method selection */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
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

            {/* Inpaint Additional Prompt */}
            <div>
              <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
                Inpaint Additional Prompt (Optional):
              </label>
              <input
                type="text"
                value={inpaintAdditionalPrompt}
                onChange={(e) => setInpaintAdditionalPrompt(e.target.value)}
                placeholder="Specific instructions for the masked region (e.g. wearing sunglasses, glowing amulet)..."
                className="w-full bg-[#0d121c] border border-[#262e42] rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-purple-500"
              />
            </div>
          </div>
        )}

        {/* TAB 4: Describe */}
        {activeTab === 'describe' && (
          <div className="space-y-4">
            <div className="text-xs text-zinc-400">
              Upload an image to automatically deconstruct and extract prompt tags into your studio prompt box.
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
                    <span>Apply to Main Prompt</span>
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
            onClick={() => handleAutomatedPipelineRun(hasInputImageWorkflow ? 'sdxl_juggernaut.json' : 'flux_image.json')}
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
