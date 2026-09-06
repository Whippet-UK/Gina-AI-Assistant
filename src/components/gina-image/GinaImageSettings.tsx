import React, { useState } from 'react';
import {
  Settings, Palette, Cpu, Sliders, Check, RotateCcw,
  Sparkles, Search, Layers, Activity, Trash2, Info
} from 'lucide-react';
import { GINA_IMAGE_STYLES, GinaImageStyle } from '../../data/ginaImageStyles';
import { SystemTelemetry } from '../../types';

export type GinaSettingsTab = 'setting' | 'style' | 'model' | 'advanced';

export interface AspectRatioOption {
  id: string;
  label: string;
  w: number;
  h: number;
  ratio: string;
}

export const GINA_ASPECT_RATIOS: AspectRatioOption[] = [
  { id: '1:1', label: '1024 × 1024 (1:1)', w: 1024, h: 1024, ratio: '1:1' },
  { id: 'aida64', label: '1024 × 600 (AIDA64 LCD)', w: 1024, h: 600, ratio: '128:75' },
  { id: '1152_896', label: '1152 × 896 (4:3)', w: 1152, h: 896, ratio: '4:3' },
  { id: '896_1152', label: '896 × 1152 (3:4)', w: 896, h: 1152, ratio: '3:4' },
  { id: '1216_832', label: '1216 × 832 (3:2)', w: 1216, h: 832, ratio: '3:2' },
  { id: '832_1216', label: '832 × 1216 (2:3)', w: 832, h: 1216, ratio: '2:3' },
  { id: '1344_768', label: '1344 × 768 (16:9)', w: 1344, h: 768, ratio: '16:9' },
  { id: '768_1344', label: '768 × 1344 (9:16)', w: 768, h: 1344, ratio: '9:16' },
  { id: '1280_768', label: '1280 × 768 (15:9)', w: 1280, h: 768, ratio: '15:9' },
  { id: '768_1280', label: '768 × 1280 (9:15)', w: 768, h: 1280, ratio: '9:15' },
  { id: '1408_704', label: '1408 × 704 (2:1)', w: 1408, h: 704, ratio: '2:1' },
  { id: '704_1408', label: '704 × 1408 (1:2)', w: 704, h: 1408, ratio: '1:2' },
  { id: '960_1088', label: '960 × 1088 (4:5)', w: 960, h: 1088, ratio: '4:5' },
  { id: '1088_960', label: '1088 × 960 (5:4)', w: 1088, h: 960, ratio: '5:4' }
];

export const GINA_PERFORMANCE_PRESETS = [
  {
    id: 'speed',
    label: 'Speed (Default)',
    steps: 4,
    desc: '4 Steps · Recommended for FLUX.1-Schnell (Fastest generation, ~2-4s)'
  },
  {
    id: 'quality',
    label: 'Quality',
    steps: 8,
    desc: '8 Steps · Maximum photorealistic details, fine textures'
  },
  {
    id: 'extreme_speed',
    label: 'Extreme Speed',
    steps: 2,
    desc: '2 Steps · Draft mode for rapid prompt ideation'
  }
];

interface GinaImageSettingsProps {
  activeTab: GinaSettingsTab;
  onTabChange: (tab: GinaSettingsTab) => void;

  // Setting tab
  performance: string;
  onChangePerformance: (p: string, steps: number) => void;
  selectedRatio: string;
  onSelectRatio: (ratioId: string, w: number, h: number) => void;
  width: number;
  height: number;
  onChangeWidth: (w: number) => void;
  onChangeHeight: (h: number) => void;
  customSize: boolean;
  onToggleCustomSize: () => void;
  imageNumber: number;
  onChangeImageNumber: (n: number) => void;
  negativePrompt: string;
  onChangeNegativePrompt: (val: string) => void;
  seed: number;
  onChangeSeed: (seed: number) => void;
  randomSeed: boolean;
  onToggleRandomSeed: () => void;
  onRandomizeSeed: () => void;

  // Style tab
  selectedStyles: string[];
  onToggleStyle: (styleId: string) => void;
  onClearStyles: () => void;
  onSelectGinaV2Default: () => void;

  // Model tab
  baseModel: string;
  onChangeBaseModel: (model: string) => void;
  selectedWorkflow?: string;
  onSelectWorkflow?: (wfId: string) => void;
  loras: { enabled: boolean; model: string; weight: number }[];
  onChangeLora: (index: number, partial: { enabled?: boolean; model?: string; weight?: number }) => void;
  workflowModelLabel: string;

  // Advanced tab
  guidanceScale: number;
  onChangeGuidanceScale: (val: number) => void;
  steps: number;
  onChangeSteps: (val: number) => void;
  sampler: string;
  onChangeSampler: (val: string) => void;
  scheduler: string;
  onChangeScheduler: (val: string) => void;
  denoise: number;
  onChangeDenoise: (val: number) => void;

  // Telemetry & Hardware
  telemetry?: SystemTelemetry;
  gpuName: string;
  vramTotal: string;
  onPurgeVram: () => void;
  purgingVram: boolean;
  workflowDetails?: { capabilities: string[]; bindings: any[] } | null;
}

export const GinaImageSettings: React.FC<GinaImageSettingsProps> = ({
  activeTab,
  onTabChange,
  performance,
  onChangePerformance,
  selectedRatio,
  onSelectRatio,
  width,
  height,
  onChangeWidth,
  onChangeHeight,
  customSize,
  onToggleCustomSize,
  imageNumber,
  onChangeImageNumber,
  negativePrompt,
  onChangeNegativePrompt,
  seed,
  onChangeSeed,
  randomSeed,
  onToggleRandomSeed,
  onRandomizeSeed,
  selectedStyles,
  onToggleStyle,
  onClearStyles,
  onSelectGinaV2Default,
  baseModel,
  onChangeBaseModel,
  selectedWorkflow = 'flux_image',
  onSelectWorkflow,
  loras,
  onChangeLora,
  workflowModelLabel,
  guidanceScale,
  onChangeGuidanceScale,
  steps,
  onChangeSteps,
  sampler,
  onChangeSampler,
  scheduler,
  onChangeScheduler,
  denoise,
  onChangeDenoise,
  telemetry,
  gpuName,
  vramTotal,
  onPurgeVram,
  purgingVram,
  workflowDetails
}) => {
  const [styleSearch, setStyleSearch] = useState('');
  const [styleCategory, setStyleCategory] = useState<string>('all');

  const filteredStyles = GINA_IMAGE_STYLES.filter((s) => {
    const matchesCat = styleCategory === 'all' || s.category === styleCategory;
    const matchesSearch =
      s.name.toLowerCase().includes(styleSearch.toLowerCase()) ||
      s.description.toLowerCase().includes(styleSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="bg-[#101520] border border-[#262c3b] rounded-xl overflow-hidden mb-4 shadow-xl">
      {/* 4 Tabs Bar */}
      <div className="flex items-center border-b border-[#21262d] bg-[#0c101a] text-xs font-mono">
        <button
          type="button"
          onClick={() => onTabChange('setting')}
          className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 font-bold transition-colors border-b-2 ${
            activeTab === 'setting'
              ? 'border-blue-500 text-blue-400 bg-[#161d2d]'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-[#121724]'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Setting</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('style')}
          className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 font-bold transition-colors border-b-2 relative ${
            activeTab === 'style'
              ? 'border-blue-500 text-blue-400 bg-[#161d2d]'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-[#121724]'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Style</span>
          {selectedStyles.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-blue-500 text-white font-bold">
              {selectedStyles.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onTabChange('model')}
          className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 font-bold transition-colors border-b-2 ${
            activeTab === 'model'
              ? 'border-blue-500 text-blue-400 bg-[#161d2d]'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-[#121724]'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Model</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('advanced')}
          className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 font-bold transition-colors border-b-2 ${
            activeTab === 'advanced'
              ? 'border-blue-500 text-blue-400 bg-[#161d2d]'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-[#121724]'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Advanced</span>
        </button>
      </div>

      {/* TAB CONTENT */}
      <div className="p-4">
        {/* TAB 1: SETTING */}
        {activeTab === 'setting' && (
          <div className="space-y-4">
            {/* Performance Selection */}
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5 font-mono">
                Performance
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {GINA_PERFORMANCE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onChangePerformance(p.id, p.steps)}
                    className={`p-2.5 rounded-lg text-left border transition-all ${
                      performance === p.id
                        ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                        : 'bg-[#0a0e17] border-[#252b3d] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    <div className="text-xs font-bold font-sans flex items-center justify-between">
                      <span>{p.label}</span>
                      {performance === p.id && <Check className="w-3.5 h-3.5 text-blue-400" />}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono mt-0.5 leading-snug">
                      {p.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratios Visual Cards */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                  Aspect Ratios
                </label>
                <button
                  type="button"
                  onClick={onToggleCustomSize}
                  className="text-[10px] font-mono text-blue-400 hover:text-blue-300"
                >
                  {customSize ? 'Use Presets' : 'Custom Dimensions'}
                </button>
              </div>

              {!customSize ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {GINA_ASPECT_RATIOS.map((r) => {
                    const isSelected = selectedRatio === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => onSelectRatio(r.id, r.w, r.h)}
                        className={`p-2 rounded-lg text-left border transition-all ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500 text-white'
                            : 'bg-[#0a0e17] border-[#252b3d] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-mono font-bold">
                          <span>{r.id}</span>
                          <span className="text-[10px] text-zinc-500">{r.ratio}</span>
                        </div>
                        <div className="text-[10px] text-zinc-400 truncate mt-0.5">
                          {r.w} × {r.h}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 bg-[#0a0e17] border border-[#252b3d] rounded-lg grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 block mb-1">
                      Width: {width}px
                    </span>
                    <input
                      type="range"
                      min={512}
                      max={1536}
                      step={64}
                      value={width}
                      onChange={(e) => onChangeWidth(Number(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 block mb-1">
                      Height: {height}px
                    </span>
                    <input
                      type="range"
                      min={512}
                      max={1536}
                      step={64}
                      value={height}
                      onChange={(e) => onChangeHeight(Number(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Image Number & Seed */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5 font-mono">
                  Image Number
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => onChangeImageNumber(num)}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-bold font-mono transition-all ${
                        imageNumber === num
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-[#0a0e17] border-[#252b3d] text-zinc-400 hover:text-white'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                    Seed
                  </label>
                  <label className="flex items-center gap-1.5 text-[10px] text-zinc-400 cursor-pointer select-none font-mono">
                    <input
                      type="checkbox"
                      checked={randomSeed}
                      onChange={onToggleRandomSeed}
                      className="w-3.5 h-3.5 rounded bg-zinc-800 border-zinc-700 text-blue-500 focus:ring-0"
                    />
                    <span>Random</span>
                  </label>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    value={seed}
                    disabled={randomSeed}
                    onChange={(e) => onChangeSeed(Number(e.target.value))}
                    className="w-full bg-[#0a0e17] border border-[#252b3d] rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 font-mono pr-8 disabled:opacity-40"
                  />
                  {!randomSeed && (
                    <button
                      type="button"
                      onClick={onRandomizeSeed}
                      className="absolute right-1.5 top-1.5 text-zinc-500 hover:text-blue-400 p-0.5"
                      title="Generate new seed"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Negative Prompt */}
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1 font-mono">
                Negative Prompt
              </label>
              <textarea
                rows={2}
                value={negativePrompt}
                onChange={(e) => onChangeNegativePrompt(e.target.value)}
                placeholder="Unwanted elements to avoid (blurry, haze, bad anatomy, text...)"
                className="w-full bg-[#0a0e17] border border-[#252b3d] rounded-lg p-2.5 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none resize-none focus:border-blue-500/60"
              />
            </div>
          </div>
        )}

        {/* TAB 2: STYLE */}
        {activeTab === 'style' && (
          <div className="space-y-3">
            {/* Search and Category Filter */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  value={styleSearch}
                  onChange={(e) => setStyleSearch(e.target.value)}
                  placeholder="Search Gina styles..."
                  className="w-full bg-[#0a0e17] border border-[#252b3d] rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onSelectGinaV2Default}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-[10px] font-bold text-emerald-300 hover:bg-emerald-600/30 whitespace-nowrap"
                >
                  Default (Gina V2)
                </button>
                {selectedStyles.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearStyles}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[10px] font-mono text-zinc-400 hover:text-white whitespace-nowrap"
                  >
                    Clear ({selectedStyles.length})
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {['all', 'core', 'photo', 'art', 'scifi', 'atmosphere', 'special'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setStyleCategory(cat)}
                  className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono transition-all ${
                    styleCategory === cat
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-[#0a0e17] text-zinc-400 hover:text-white border border-[#252b3d]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Styles Checkbox Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredStyles.map((style) => {
                const isChecked = selectedStyles.includes(style.id);
                return (
                  <div
                    key={style.id}
                    onClick={() => onToggleStyle(style.id)}
                    className={`p-2 rounded-lg border cursor-pointer select-none transition-all flex items-start gap-2.5 ${
                      isChecked
                        ? 'bg-blue-600/15 border-blue-500/70 text-white'
                        : 'bg-[#0a0e17] border-[#252b3d] text-zinc-300 hover:border-zinc-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="w-3.5 h-3.5 mt-0.5 rounded bg-zinc-800 border-zinc-700 text-blue-500 focus:ring-0 pointer-events-none"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold leading-tight">{style.name}</span>
                        <span
                          className={`text-[8px] uppercase font-mono px-1 py-0.2 rounded border ${
                            style.badgeColor || 'border-zinc-700 text-zinc-400'
                          }`}
                        >
                          {style.category}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5 line-clamp-2 leading-tight font-sans">
                        {style.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: MODEL */}
        {activeTab === 'model' && (
          <div className="space-y-4">
            {/* Base Model Selector */}
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5 font-mono">
                Active Generation Engine & Checkpoint
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (onSelectWorkflow) onSelectWorkflow('flux_image');
                    onChangeBaseModel('flux1-schnell-Q4_K_S.gguf');
                  }}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedWorkflow === 'flux_image'
                      ? 'bg-blue-950/40 border-blue-500 shadow-sm shadow-blue-500/10'
                      : 'bg-[#0a0e17] border-[#252b3d] hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white font-mono">FLUX.1-Schnell GGUF</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                      selectedWorkflow === 'flux_image'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}>
                      {selectedWorkflow === 'flux_image' ? 'ACTIVE' : 'READY'}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono">Q4_K_S UNet · 4-step generation</div>
                  <div className="text-[9px] text-emerald-400 font-mono mt-1">~6.2 GB VRAM · T5-XXL FP8</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onSelectWorkflow) onSelectWorkflow('sdxl_juggernaut');
                    onChangeBaseModel('Juggernaut-XL_v9_RunDiffusionPhoto_v2.safetensors');
                  }}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedWorkflow === 'sdxl_juggernaut'
                      ? 'bg-emerald-950/40 border-emerald-500 shadow-sm shadow-emerald-500/10'
                      : 'bg-[#0a0e17] border-[#252b3d] hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white font-mono">Juggernaut-XL v9</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                      selectedWorkflow === 'sdxl_juggernaut'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}>
                      {selectedWorkflow === 'sdxl_juggernaut' ? 'ACTIVE' : 'READY'}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono">RunDiffusionPhoto SDXL · Fooocus speed</div>
                  <div className="text-[9px] text-emerald-400 font-mono mt-1">~4.9 GB VRAM · 8-12s · Zero T5</div>
                </button>
              </div>
            </div>

            {/* Model Details & Encoders */}
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="p-2.5 rounded bg-[#0a0e17] border border-[#252b3d]">
                <span className="text-zinc-500 block uppercase">Text Encoder</span>
                <span className="text-zinc-300 font-bold truncate block">
                  {selectedWorkflow === 'sdxl_juggernaut'
                    ? 'SDXL Dual OpenCLIP + ViT-L'
                    : 't5xxl_fp8_e4m3fn.safetensors'}
                </span>
              </div>
              <div className="p-2.5 rounded bg-[#0a0e17] border border-[#252b3d]">
                <span className="text-zinc-500 block uppercase">VAE Decoder</span>
                <span className="text-zinc-300 font-bold truncate block">
                  {selectedWorkflow === 'sdxl_juggernaut'
                    ? 'SDXL Baked Native VAE'
                    : 'ae.safetensors (FLUX VAE)'}
                </span>
              </div>
            </div>

            {/* LoRA Slots */}
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2 font-mono">
                LoRA Slots
              </label>
              <div className="space-y-2">
                {loras.map((lora, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-[#0a0e17] border border-[#252b3d] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={lora.enabled}
                        onChange={(e) => onChangeLora(idx, { enabled: e.target.checked })}
                        className="w-3.5 h-3.5 rounded bg-zinc-800 border-zinc-700 text-blue-500"
                      />
                      <span className="font-mono text-zinc-400 font-bold">LoRA #{idx + 1}:</span>
                      <span className="text-zinc-300 font-mono text-[11px]">
                        {lora.model || 'None (Load from models/loras/)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-zinc-500">Weight:</span>
                      <input
                        type="number"
                        min={-2}
                        max={2}
                        step={0.1}
                        value={lora.weight}
                        disabled={!lora.enabled}
                        onChange={(e) => onChangeLora(idx, { weight: parseFloat(e.target.value) })}
                        className="w-16 bg-[#161d2d] border border-zinc-700 rounded px-1.5 py-0.5 text-xs text-zinc-200 font-mono disabled:opacity-40"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ADVANCED */}
        {activeTab === 'advanced' && (
          <div className="space-y-4">
            {/* Sampling Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mb-1">
                  <span>Guidance Scale (CFG):</span>
                  <span className="text-blue-300 font-bold">{guidanceScale.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={1.0}
                  max={10.0}
                  step={0.5}
                  value={guidanceScale}
                  onChange={(e) => onChangeGuidanceScale(parseFloat(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mb-1">
                  <span>Sampling Steps:</span>
                  <span className="text-blue-300 font-bold">{steps}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={20}
                  step={1}
                  value={steps}
                  onChange={(e) => onChangeSteps(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mb-1">
                  <span>Denoise:</span>
                  <span className="text-blue-300 font-bold">{denoise.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  value={denoise}
                  onChange={(e) => onChangeDenoise(parseFloat(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>
            </div>

            {/* Sampler & Scheduler Selectors */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1 font-mono">
                  Sampler
                </label>
                <select
                  value={sampler}
                  onChange={(e) => onChangeSampler(e.target.value)}
                  className="w-full bg-[#0a0e17] border border-[#252b3d] rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 outline-none font-mono"
                >
                  {['euler', 'dpmpp_2m', 'dpmpp_sde', 'heun', 'lms', 'ddim'].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1 font-mono">
                  Scheduler
                </label>
                <select
                  value={scheduler}
                  onChange={(e) => onChangeScheduler(e.target.value)}
                  className="w-full bg-[#0a0e17] border border-[#252b3d] rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 outline-none font-mono"
                >
                  {['simple', 'normal', 'karras', 'exponential', 'sgm_uniform'].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Hardware Sentinel & VRAM Controls */}
            <div className="p-3 bg-[#0a0e17] border border-[#252b3d] rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs font-bold text-zinc-200 font-mono">
                    Hardware Sentinel: {gpuName}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">Total: {vramTotal}</span>
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-2 border-t border-[#1e2433]">
                <span>RTX 3070 Ti Cage: 7372 MB (90% limit) · Thermal brake: 80°C</span>
                <button
                  type="button"
                  onClick={onPurgeVram}
                  disabled={purgingVram}
                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{purgingVram ? 'Purging…' : 'Purge VRAM Cache'}</span>
                </button>
              </div>
            </div>

            {/* Technical Node Graph Diagnostics */}
            {workflowDetails && (
              <div className="p-2.5 bg-[#0a0e17] border border-[#252b3d] rounded-lg text-[10px] font-mono">
                <div className="flex items-center justify-between text-zinc-400 font-bold mb-1">
                  <span>ComfyUI Workflow Engine</span>
                  <span className="text-blue-400">
                    {workflowDetails.bindings?.length || 0} active bindings
                  </span>
                </div>
                <div className="text-zinc-600 flex flex-wrap gap-1 mt-1">
                  {workflowDetails.capabilities?.map((c) => (
                    <span
                      key={c}
                      className="px-1.5 py-0.5 rounded bg-[#161d2d] text-zinc-400 border border-[#252b3d]"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
