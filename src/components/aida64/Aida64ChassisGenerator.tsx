import React, { useState } from 'react';
import { Monitor, Sparkles, Copy, Check, ArrowRight, ShieldCheck, Eye, EyeOff, Layers, Sliders, RefreshCw } from 'lucide-react';
import { AIDA64_SCREEN_PRESETS, AIDA64_THEMES } from '../../data/aida64Presets';
import { Aida64ScreenPreset } from '../../types';

interface Aida64ChassisGeneratorProps {
  onSendToGenerator: (prompt: string, width: number, height: number) => void;
  onSelectChassisBackground: (imageUrl: string, resolution: { width: number; height: number }) => void;
  currentBgUrl?: string;
}

export const Aida64ChassisGenerator: React.FC<Aida64ChassisGeneratorProps> = ({
  onSendToGenerator,
  onSelectChassisBackground,
  currentBgUrl
}) => {
  const [selectedPreset, setSelectedPreset] = useState<Aida64ScreenPreset>(AIDA64_SCREEN_PRESETS[0]);
  const [selectedTheme, setSelectedTheme] = useState(AIDA64_THEMES[0]);
  const [layoutStyle, setLayoutStyle] = useState<'dual_pod' | 'triple_cluster' | 'stretched_bar' | 'aio_single'>('dual_pod');
  const [customStyleNotes, setCustomStyleNotes] = useState<string>('');
  const [showAioCircleMask, setShowAioCircleMask] = useState<boolean>(selectedPreset.id === 'res_480x480');
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);

  // Generate engineered zero-text prompt based on selections
  const constructedPrompt = React.useMemo(() => {
    let layoutKeywords = '';
    if (layoutStyle === 'dual_pod') {
      layoutKeywords = 'symmetrical dual large circular empty socket pods on left and right, solid pitch black interior glass, center recessed bay with horizontal pill-shaped empty cavities, chamfered outer sci-fi bezel border';
    } else if (layoutStyle === 'triple_cluster') {
      layoutKeywords = 'triple cluster chassis with three prominent circular empty dark bays, lower pill-shaped dark mounting cutouts, high-tech bracket fasteners';
    } else if (layoutStyle === 'stretched_bar') {
      layoutKeywords = 'panoramic ultrawide telemetry bar layout with left circular dark socket, middle multi-row dark cutout slots, right vertical LED status ladder';
    } else {
      layoutKeywords = 'single center circular dark socket bezel for round display cap, symmetrical radial telemetry border, deep matte black background';
    }

    const basePrompt = `futuristic custom AIDA64 PC hardware monitoring sensor panel background chassis, ${selectedTheme.promptKeywords}, ${layoutKeywords}, exact aspect ratio ${selectedPreset.width}x${selectedPreset.height}, precision engineered cutouts and blank dark slots, ultra clean dark UI backdrop, 8k resolution, Unreal Engine 5 render style`;

    return customStyleNotes.trim() ? `${basePrompt}, ${customStyleNotes.trim()}` : basePrompt;
  }, [selectedPreset, selectedTheme, layoutStyle, customStyleNotes]);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(constructedPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleApplyToGenerator = () => {
    onSendToGenerator(constructedPrompt, selectedPreset.width, selectedPreset.height);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left Column: Screen Size & Theme Controls */}
      <div className="lg:col-span-7 space-y-4">
        {/* Screen Resolution Selector */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Monitor className="w-4 h-4 text-emerald-400" />
              <span>Target Screen Form-Factor & Resolution</span>
            </h3>
            <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded">
              {selectedPreset.width} × {selectedPreset.height} px
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {AIDA64_SCREEN_PRESETS.map((preset) => {
              const isSelected = selectedPreset.id === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    setSelectedPreset(preset);
                    if (preset.id === 'res_480x480') setShowAioCircleMask(true);
                  }}
                  className={`text-left p-2.5 rounded border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/15 border-emerald-400 text-slate-100 shadow-sm ring-1 ring-emerald-500/50'
                      : 'bg-slate-950/70 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-slate-200">{preset.label}</span>
                    <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">
                      {preset.category}
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-400/90 font-medium mt-1">{preset.diagonal}</div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5">{preset.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Theme Aesthetic Selector */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Chassis Color & Lighting Theme</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {AIDA64_THEMES.map((theme) => {
              const isSelected = selectedTheme.id === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => setSelectedTheme(theme)}
                  className={`flex items-center gap-3 p-2.5 rounded border transition-all text-left cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800/90 border-slate-600 text-slate-100 ring-1 ring-slate-500'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div
                    className="w-5 h-5 rounded-full shrink-0 border border-white/20 shadow-sm"
                    style={{ backgroundColor: theme.primaryColor, boxShadow: `0 0 10px ${theme.primaryColor}66` }}
                  />
                  <div className="overflow-hidden">
                    <div className="font-semibold text-xs text-slate-200">{theme.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-xs" style={{ backgroundColor: theme.primaryColor }} />
                      <span className="w-2 h-2 rounded-xs" style={{ backgroundColor: theme.secondaryColor }} />
                      <span className="w-2 h-2 rounded-xs" style={{ backgroundColor: theme.accentColor }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Zone Layout Architecture */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-sky-400" />
            <span>Zone Layout Cutout Architecture</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'dual_pod' as const, label: 'Dual Dials', desc: 'Left/Right dial pods' },
              { id: 'triple_cluster' as const, label: 'Triple Cluster', desc: '3-dial dashboard' },
              { id: 'stretched_bar' as const, label: 'Panoramic Bar', desc: 'Linear bar monitor' },
              { id: 'aio_single' as const, label: 'Single Center', desc: 'Round/Square AIO' },
            ].map((layout) => (
              <button
                key={layout.id}
                onClick={() => setLayoutStyle(layout.id)}
                className={`p-2 rounded border text-left cursor-pointer transition-all ${
                  layoutStyle === layout.id
                    ? 'bg-sky-500/15 border-sky-400 text-sky-300'
                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="font-bold text-xs">{layout.label}</div>
                <div className="text-[9px] text-slate-500 mt-0.5">{layout.desc}</div>
              </button>
            ))}
          </div>

          <div className="mt-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between mb-1">
              <span>Additional Custom Accents (Optional)</span>
              <span className="text-slate-500 font-normal">e.g., carbon weave, titanium bolts</span>
            </label>
            <input
              type="text"
              value={customStyleNotes}
              onChange={(e) => setCustomStyleNotes(e.target.value)}
              placeholder="e.g. honeycomb mesh background, matte gunmetal chassis, brushed aluminum bevels"
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Right Column: Live Prompt & Generation Actions */}
      <div className="lg:col-span-5 space-y-4">
        {/* Zero-Text Prompt Preview Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Zero-Text Prompt Recipe</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
                NO GHOST TEXT
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800/90 rounded p-3 text-[11px] font-mono text-slate-300 leading-relaxed max-h-[160px] overflow-y-auto custom-scrollbar select-all">
              {constructedPrompt}
            </div>

            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleCopyPrompt}
                className="flex-1 px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPrompt ? 'Prompt Copied!' : 'Copy Prompt'}</span>
              </button>
              <button
                onClick={handleApplyToGenerator}
                className="flex-1 px-3 py-2 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
              >
                <span>Send to Generator</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Aspect Ratio Preview Canvas Guide */}
          <div className="mt-4 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Aspect Ratio Bounds Guide ({selectedPreset.width}:{selectedPreset.height})
              </span>
              <button
                onClick={() => setShowAioCircleMask(!showAioCircleMask)}
                className={`text-[10px] font-mono flex items-center gap-1 px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                  showAioCircleMask
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
                }`}
              >
                {showAioCircleMask ? <Eye className="w-3 h-3 text-amber-400" /> : <EyeOff className="w-3 h-3" />}
                <span>AIO Circle Mask</span>
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded p-2 flex items-center justify-center min-h-[160px] relative overflow-hidden">
              <div
                className="relative border-2 border-dashed border-emerald-500/50 bg-slate-900/60 rounded flex items-center justify-center overflow-hidden transition-all duration-300 shadow-inner"
                style={{
                  width: selectedPreset.width > selectedPreset.height ? '100%' : '140px',
                  aspectRatio: `${selectedPreset.width} / ${selectedPreset.height}`,
                  maxHeight: '140px',
                }}
              >
                {currentBgUrl ? (
                  <img
                    src={currentBgUrl}
                    alt="Active Chassis Background"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-2 text-center">
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">
                      {selectedPreset.label}
                    </span>
                    <span className="text-[9px] text-slate-500">
                      {selectedPreset.diagonal} · {layoutStyle.replace('_', ' ')}
                    </span>
                  </div>
                )}

                {/* Round AIO Cooler Mask Overlay */}
                {showAioCircleMask && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-[90%] h-[90%] rounded-full border-2 border-amber-400/80 bg-transparent shadow-[0_0_0_999px_rgba(2,6,23,0.7)] flex items-center justify-center">
                      <span className="text-[9px] font-mono text-amber-300 bg-slate-950/80 px-1.5 py-0.5 rounded border border-amber-500/30">
                        AIO PUMP CAP SAFE AREA
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
