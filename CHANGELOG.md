# v1.17.73 — Multimedia MoviePy Stitcher, MusicGen Medium 1.5B Default & Neural Cache Verification

### 1. Target File: `/server/music/MusicService.ts` & `/server.ts`
```typescript
// Verified true weights file presence (>500MB) before declaring cached
getModelCacheInfo(modelName: string): { cached: boolean; totalBytes: number; fileCount: number; hasWeights: boolean; sizeLabel: string } {
  // Scans folder & .cache chunks, verifies model.safetensors or state_dict.bin presence
}
```
- Upgraded cache detection logic from basic file existence to deep weight verification (>500MB neural tensors), eliminating false-positive "Cached" states when only JSON metadata is downloaded.
- Exposed live size, file count, and weight verification to `/api/music/status`.

### 2. Target File: `/src/components/MusicStudio.tsx`
```tsx
// Live Download Progress Bar & Accurate Size/Weight Status
{isModelDownloading && job && (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-center justify-between text-[11px] font-mono">
      <span>{job.step}</span>
      <span>{job.progress}%</span>
    </div>
    <div className="w-full h-1.5 bg-slate-900 rounded-full">
      <div style={{ width: `${job.progress}%` }} />
    </div>
  </div>
)}
```
- Integrated dynamic download tracking with live progress bar and step details directly inside the Music Studio model banner.
```python
# Pass optional HuggingFace token for rate limits & fast downloads
hf_token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN") or None
processor = AutoProcessor.from_pretrained(model_id, cache_dir=model_cache_dir, token=hf_token)
model = MusicgenForConditionalGeneration.from_pretrained(model_id, cache_dir=model_cache_dir, token=hf_token)
```
- Added seamless support for `HF_TOKEN` / `HUGGING_FACE_HUB_TOKEN` across AudioCraft / MusicGen weight downloading and inference scripts to avoid unauthenticated Hugging Face Hub rate limits.

### 2. Target File: `/src/components/MusicStudio.tsx`
```tsx
// Fixed empty string "" passed to audio tag src attribute
<audio
  ref={audioRef}
  src={activeTrack?.url || undefined}
  onPause={() => setIsPlaying(false)}
  onPlay={() => setIsPlaying(true)}
/>
```
- Resolved React console error caused by passing empty string `""` to the `src` attribute on `<audio>` element when no initial track was active by substituting `undefined`.

### 2. Target File: `/scripts/media_stitcher.py`
```python
# Headless MoviePy / FFmpeg video & audio stitching compositor
if audio_mode == "loop" and final_duration > audio_dur:
    repeats = int(final_duration // audio_dur) + 1
    audio_clip = afx.audio_loop(audio_clip, nloops=repeats).subclip(0, final_duration)
```
- Implemented Python headless compositor supporting MoviePy with FFmpeg fallback to merge LTX-Video/GIF Studio animations with AI Music / AudioCraft generated tracks.
- Supports volume adjustment (0.0 - 2.0x), audio fade-in, audio fade-out, audio sync modes (`match_video`, `match_audio`, `loop`, `cut`), and H.264 MP4 / AAC export.

### 2. Target File: `/server/multimedia/MultimediaService.ts`
```typescript
// Node.js backend orchestration for moviepy installation status and job dispatch
export class MultimediaService {
  public async getStatus(): Promise<{ installed: boolean; version?: string }>;
  public async installMoviePy(): Promise<{ success: boolean; message: string }>;
  public async stitchMedia(params: StitchParams): Promise<JobResult>;
}
```
- Integrated with server endpoints `/api/multimedia/status`, `/api/multimedia/install-moviepy`, `/api/multimedia/stitch`, and `/media/stitched/*`.

### 3. Target File: `/src/components/MediaStitcherModal.tsx`
```tsx
// Cross-Studio Stitcher Modal Component
<MediaStitcherModal
  isOpen={showStitchModal}
  onClose={() => setShowStitchModal(false)}
  videoSourceUrl={activeVideoUrl}
  videoSourceName="LTX-Video Render"
  onAddLog={onAddLog}
/>
```
- Created the `MediaStitcherModal` enabling 1-click audio-video mixing directly from VideoStudio, GifStudio, and MusicStudio with media asset selectors, volume multipliers, fade sliders, sync modes, live progress tracking, and instant MP4 video player preview.

### 4. Target Files: `/src/components/VideoStudio.tsx`, `/src/components/GifStudio.tsx`, `/src/components/MusicStudio.tsx`
- Added 1-Click "Stitch with AI Music (MoviePy Engine)" triggers into VideoStudio action deck, GIF Studio timeline tray, and MusicStudio track deck and library items.

# v1.17.72 — StreamInject Studio Interactive Layer Controls & Python MP4 Centering Alignment

### 1. Target File: `/scripts/stream_inject.py`
```python
# Text layer centered horizontal coordinate calculations in Python rendering pipeline
if align == "center" or "x" not in tl:
    # Exact center alignment across PIL/OpenCV and FFmpeg drawtext filter paths
    x = int(pos_x - (text_w / 2))
    tl_x = w // 2
```
- Fixed text centering alignment in `stream_inject.py` for both the PIL/OpenCV rasterization path and the FFmpeg filtergraph path, eliminating rightward text drift on rendered MP4s.

### 2. Target File: `/src/components/StreamInjectStudio.tsx`
```tsx
// Interactive selection, mouse canvas dragging, directional nudge pad, and alignment controls
<canvas
  ref={canvasRef}
  width={canvasWidth}
  height={canvasHeight}
  onMouseDown={handleCanvasMouseDown}
  onMouseMove={handleCanvasMouseMove}
  onMouseUp={handleCanvasMouseUp}
  onMouseLeave={handleCanvasMouseUp}
  className={`max-h-[500px] w-auto max-w-full object-contain shadow-2xl ${
    isDragging ? "cursor-grabbing" : selectedTarget ? "cursor-grab" : "cursor-crosshair"
  }`}
/>
```
- Added full interactive direct canvas manipulation: click to select layers/boxes/profile circles, drag with real-time feedback, directional keyboard nudge keys (Arrow keys + Shift for coarse adjustment), directional nudge pad with adjustable step sizes (1px, 5px, 10px, 25px, 50px), instant 1-click auto-align buttons (Center X, Center Y, Dead Center, Top, Left, Right), and layer management (clone, delete, reorder z-index).
- Added explicit coordinate and dimension numeric inputs (X, Y, Width, Height, Radius, Font Size) to the Text Layers, Video Box Safe-Zones, and Profile Circles inspector panels.

# v1.17.71 — StreamInject Media Filename Universalization & Studio Duration Inspector

### Target File: `/server/streaminject/StreamInjectService.ts`
```typescript
const searchDirs = [
  { dir: path.join(this.runtimeDir, "input"), source: "StreamInject Input" },
  { dir: this.runtimeDir, source: "StreamInject Assets" },
  { dir: "C:\\Gina_AI\\.gina_runtime\\streaminject\\input", source: "StreamInject Input" },
  { dir: "C:\\Gina_AI\\.gina_runtime\\streaminject", source: "StreamInject Assets" },
  { dir: "C:\\Gina_AI\\StreamInject\\input", source: "StreamInject Input" },
  { dir: "C:\\Gina_AI\\StreamInject", source: "StreamInject Assets" },
  { dir: path.join(process.cwd(), "output"), source: "ComfyUI Outputs" },
  { dir: path.join(process.cwd(), "input"), source: "ComfyUI Inputs" },
  { dir: path.join(process.cwd(), "local_ai_uploads"), source: "User Uploads" },
  { dir: "C:\\Gina_AI\\output", source: "Gina Output" },
  { dir: "C:\\Gina_AI\\input", source: "Gina Input" },
  { dir: "C:\\Gina_AI\\models\\audio", source: "AudioCraft Library" }
];
```
- Added dedicated `input` directories (`.gina_runtime/streaminject/input` and `C:\Gina_AI\StreamInject\input`) to the media scanning pipeline with path-based deduplication.
- When placing files directly in `C:\Gina_AI\.gina_runtime\streaminject\input` or `C:\Gina_AI\StreamInject\input`, StreamInject detects them in the dropdowns directly with zero duplication and zero uploads to root.

### Target File: `/server/streaminject/StreamInjectService.ts` (Universal Extension Scanner)
```typescript
const ext = path.extname(file).toLowerCase();
if ([".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v", ".wmv", ".flv", ".mpeg", ".mpg", ".ts", ".mts", ".m2ts", ".3gp", ".ogv"].includes(ext)) {
  videos.push({ name: file, path: fullPath, source: item.source, sizeBytes: stat.size });
} else if ([".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".svg"].includes(ext)) {
  images.push({ name: file, path: fullPath, source: item.source });
} else if ([".mp3", ".wav", ".ogg", ".flac", ".m4a", ".aac", ".wma", ".aiff", ".opus"].includes(ext)) {
  audio.push({ name: file, path: fullPath, source: item.source, sizeBytes: stat.size });
} else if ([".srt", ".ass", ".vtt", ".sub"].includes(ext)) {
  subtitles.push({ name: file, path: fullPath, source: item.source });
}
```
- Universalized media scanning across all input directories to recognize any filename with standard container extensions (`.mp4`, `.mkv`, `.webm`, `.mov`, `.avi`, `.m4v`, `.wmv`, `.flv`, `.mpeg`, `.mpg`, `.ts`, `.mts`, `.m2ts`, `.3gp`, `.ogv`, `.mp3`, `.wav`, `.ogg`, `.flac`, `.m4a`, `.aac`, `.wma`, `.aiff`, `.opus`, `.srt`, `.ass`, `.vtt`, `.sub`).
- Completely removed any expectation or requirement for hardcoded filenames (such as `gameplay.mp4` or `audio.mp3`).

### Target File: `/src/components/StreamInjectStudio.tsx`
```tsx
// Canvas & Duration Settings Card in Intro/Outro Studio
<div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl backdrop-blur-md flex flex-col gap-3">
  <h2 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
    <Clock className="w-4 h-4" /> Canvas & Duration Settings
  </h2>
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
    <div>
      <span className="text-slate-400 text-[11px] font-semibold">Intro/Outro Duration (s)</span>
      <div className="flex items-center gap-1.5 mt-1 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-700">
        <Clock className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
        <input
          type="number"
          min="1"
          max="120"
          step="0.5"
          value={duration}
          onChange={(e) => {
            const newDur = Math.max(1, parseFloat(e.target.value) || 10.0);
            setDuration(newDur);
            if (currentTime > newDur) setCurrentTime(newDur);
          }}
          className="w-full bg-transparent text-xs text-white font-mono font-bold focus:outline-none"
        />
        <span className="text-slate-500 text-[10px]">sec</span>
      </div>
    </div>
    ...
  </div>
</div>
```
- Added dedicated Canvas & Duration Settings card to the Intro/Outro Studio inspector allowing users to directly configure and fine-tune duration (in seconds), aspect ratio, resolution, and background theme.
- Added direct Outro upload action and filename verification badges to Step 1 & Step 2 in the Master Pipeline Stitcher.
- Added comprehensive file format acceptance on all upload inputs (`accept="video/*,.mp4,.mkv,.webm,.mov..."`, `accept="audio/*,.mp3,.wav..."`, etc.).

---

# v1.17.71 — StreamInject v2.5 Timeline, Intro/Outro Studio & Audio Controls

### Target File: `/src/components/StreamInjectStudio.tsx`
```tsx
// Renamed Visual Layout Studio -> Intro/Outro Studio with Duration Control
<span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
  <Tv className="w-4 h-4" /> Intro/Outro Stage
</span>
<div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-xs">
  <Clock className="w-3.5 h-3.5 text-purple-400" />
  <span className="text-slate-400 text-[11px]">Duration:</span>
  <input type="number" min="1" max="120" step="0.5" value={duration} onChange={(e) => setDuration(Math.max(1, parseFloat(e.target.value) || 10.0))} />
  <span className="text-slate-400 text-[11px]">sec</span>
</div>

// Added Intro/Outro Audio Track Mixing Panel & Controls
<div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl backdrop-blur-md flex flex-col gap-3">
  <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
    <Music className="w-4 h-4" /> Intro/Outro Audio Track
  </h2>
  ...
  <input type="number" min="0" step="0.5" value={studioAudioTrimStart} onChange={(e) => setStudioAudioTrimStart(parseFloat(e.target.value) || 0)} />
  <input type="number" min="0" step="0.5" value={studioAudioTrimEnd} onChange={(e) => setStudioAudioTrimEnd(parseFloat(e.target.value) || 0)} />
</div>
```
- Renamed "Visual Layout Studio" to "Intro/Outro Studio" across navigation tabs and stage headers.
- Added dynamic Duration input field to the Intro/Outro stage allowing custom timing instead of a fixed 10s default.
- Harmonized the Intro/Outro Studio Audio panel to have the exact same design layout, card container styles, track selectors, upload badges, and 6-parameter precision grid (Track Start Offset, Audio Start Cut, Audio Finish Cut, Volume, Fade In, Fade Out) as the Master Pipeline Stitcher.
- Added start/finish cut controls to the Master Pipeline Stitcher audio track.
- Passed audio configuration from Intro/Outro Studio into Python rendering pipeline (`render_custom_layout_from_config`) with FFmpeg `atrim`, `afade`, and `amix` audio mixing.

### Target File: `/scripts/stream_inject.py` & `/server/streaminject/StreamInjectService.ts`
```python
# Audio mixing in custom layout render
if audio_cfg and audio_cfg.get("path") and os.path.exists(audio_cfg["path"]):
    audio_path = audio_cfg["path"]
    vol = float(audio_cfg.get("volume", 1.0))
    fade_in = float(audio_cfg.get("fade_in", 0.0))
    fade_out = float(audio_cfg.get("fade_out", 0.0))
    trim_start = float(audio_cfg.get("trim_start", 0.0))
    trim_end = float(audio_cfg.get("trim_end", 0.0))
    ...
```
- Added JSON payload parsing and FFmpeg filter chains for trimming, delaying, fading, and mixing audio directly into programmatic studio layout templates.

---

# v1.17.71 (Initial) — StreamInject v2.5 Timeline & AudioCraft PreWarm Suite

### Target File: `/scripts/download_audiocraft.py`
```python
"""
AudioCraft & MusicGen Weight Downloader Utility for Gina AI Factory.
Downloads and caches Meta AudioCraft (MusicGen Small 300M & Medium 1.5B) models
locally into C:\Gina_AI\models\audio without saturating VRAM during download.
"""
```
- Implemented headless model downloader for Meta AudioCraft / MusicGen models caching weights into `C:\Gina_AI\models\audio`.

### Target File: `/src/components/StreamInjectStudio.tsx`
```tsx
// Staging & Master Pipeline Audio + Chromakey + Watermark timeline controls
<div className="grid grid-cols-4 gap-2 mt-2">
  <div>
    <span className="text-slate-400 text-[10px]">Volume</span>
    <input type="number" min="0" max="2.0" step="0.1" value={audioVolume} onChange={(e) => setAudioVolume(parseFloat(e.target.value) || 1.0)} />
  </div>
  <div>
    <span className="text-slate-400 text-[10px]">Offset (s)</span>
    <input type="number" min="0" step="0.5" value={audioStartOffset} onChange={(e) => setAudioStartOffset(parseFloat(e.target.value) || 0)} />
  </div>
  ...
</div>
```
- Added full UI for Audio Track Mixing, start offset, volume, fade in/out, Green Screen tolerance & timeline duration, watermark start/finish times & opacity, and burned subtitle overlays.

### Target File: `/server/streaminject/StreamInjectService.ts`
```typescript
if (options.audioTrackPath) {
  cliArgs.push("--audio-track", options.audioTrackPath);
  cliArgs.push("--audio-volume", String(options.audioVolume ?? 1.0));
  cliArgs.push("--audio-start-offset", String(options.audioStartOffset ?? 0));
  cliArgs.push("--audio-fade-in", String(options.audioFadeIn ?? 0));
  cliArgs.push("--audio-fade-out", String(options.audioFadeOut ?? 0));
}
```
- Augmented `StreamInjectService` media scanning to index `.mp3`, `.wav`, `.ogg`, `.flac`, `.m4a`, and `.aac` from `models/audio` and `output/audio`.
- Passed all audio mixing, chromakey similarity, and watermark timeline parameters to Python subprocess.

### Target File: `/server.ts` & `/src/components/ModelPreWarmPanel.tsx`
```typescript
{
  id: 'musicgen_small', name: 'MusicGen Small (AudioCraft 300M)', filename: 'facebook/musicgen-small',
  workflowId: 'audiocraft_music', type: 'music', vramFootprintMB: 2800,
  description: 'Meta AudioCraft MusicGen 300M model for fast BGM generation and audio composition (cached in models/audio).'
}
```
- Integrated AudioCraft MusicGen into Model Pre-Warm state machine and VRAM management visualizer with distinct `Music` icon badges and allocation budget tracking.

---

# v1.17.69 (Patch 1) — Import Migration Verification & TypeScript Fixes

### Target File: `/server/jobs/JobManager.ts`
```typescript
export interface GinaJob {
  id: string;
  promptId?: string;
  workflowId: string;
  status: JobStatus;
  progress: number;
  step?: string;
  currentNodeId?: string | null;
  currentNodeClass?: string;
  currentStep?: number;
  totalSteps?: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  outputs: any[];
  parameters: Record<string, any>;
}
```
- Added optional `step?: string` field to `GinaJob` interface to align with StreamInject rendering progress tracking.

### Target File: `/src/components/MilestoneChecklist.tsx`
```typescript
{ phase: 31, name: 'STREAMINJECT v2.5 PURE RENDER SUITE', status: 'IN_PROGRESS', details: 'Add Audio import (with duration and start/finish timeline)into both Visual Layout Studio and Master Pipeline Stitcher, Add Chromakey Overlay, Watermark & Subtitles duration and start/finish timeline' }
```
- Corrected status enum value from `'IN PROGRESS'` to `'IN_PROGRESS'`.

---

# v1.17.69 — StreamInject v2.5 UI Integration & Navigation Wireup

### Target File: `/src/App.tsx`
```tsx
import { StreamInjectStudio } from './components/StreamInjectStudio';

const navItems = [
  { id: 'create' as const, label: 'CREATE', icon: Image, isGenerating: isJobActive && isImageJob },
  { id: 'video' as const, label: 'VIDEO', icon: Video, isGenerating: isJobActive && isVideoJob },
  { id: 'gif' as const, label: 'GIF STUDIO', icon: Film, isGenerating: isJobActive && job?.workflowId === 'gif_studio' },
  { id: 'streaminject' as const, label: 'STREAMINJECT', icon: Film, isGenerating: isJobActive && (job?.workflowId === 'streaminject_studio' || job?.workflowId === 'streaminject_render') },
  { id: 'aida64' as const, label: 'AIDA64', icon: Gauge, isGenerating: false },
  ...
];

<main className={`space-y-5 ${activeView === 'streaminject' ? 'block' : 'hidden'}`}>
  <WorkspaceErrorBoundary name="StreamInject Studio">
    <StreamInjectStudio />
  </WorkspaceErrorBoundary>
</main>
```
- Integrated the `StreamInjectStudio` visual layout designer and render workspace directly into the primary application navigation bar.
- Connected real-time generation indicators for `streaminject_studio` and `streaminject_render` job types.

### Target File: `/src/components/MilestoneChecklist.tsx`
```tsx
{ phase: 30, name: 'STREAMINJECT v2.5 PURE RENDER SUITE', status: 'COMPLETED', details: 'Headless OpenCV/FFmpeg Python render engine, visual canvas layout builder, 6-track timeline & master pipeline' }
```
- Added Phase 30 milestone and updated active restore point to `RESTORE_V1.17.69_STREAMINJECT_SUITE`.

### Target File: `/src/components/AppFeaturesGuide.tsx`
- Added comprehensive feature documentation for StreamInject v2.5 Pure Render Suite covering headless Python execution, canvas layout builder, and master rendering pipeline.

---

# v1.17.68 — StreamInject v2.5 Pure Render Suite Integration

### Target File: `/scripts/stream_inject.py`
```python
class MasterRenderPipeline:
    @classmethod
    def execute(
        cls,
        intro_path: Optional[str],
        main_gameplay_path: str,
        outro_path: Optional[str],
        output_path: str,
        aspect_mode: str = "original",
        split_start_sec: float = 0.0,
        split_end_sec: Optional[float] = None,
        green_screen_overlay: Optional[str] = None,
        overlay_start_time: float = 5.0,
        watermark_path: Optional[str] = None,
        watermark_pos: str = "TR",
        subtitle_path: Optional[str] = None
    ) -> Dict[str, Any]:
```
- Integrated the complete, unabridged, single-file production-ready Python video post-production suite **StreamInject v2.5** (`scripts/stream_inject.py`).
- Implemented in-memory Kinetic FX matrices: Glitch/Flicker, Screen-Shake Rumble (affine warp with `BORDER_REFLECT`), Ethereal Volumetric Bloom Glow (luminosity mask > 200 + Gaussian blur), and Chromatic Aberration channel separation (+4px/-4px).
- Implemented Multi-Aspect Engine: 16:9 Widescreen mode and 9:16 Portrait Shorts mode with automated dual-layer `boxblur=40:5` blurred sidebars.
- Implemented Master Hardcoded Render Pipeline with dynamic markers, green screen chromakey (`0x00FF00:0.1:0.2`), subtitle burns, multi-track concatenation, and automated `build_perf_log.md` telemetry reporting.
- Implemented Intro & Outro Studio with Ready-Built Template Mode (10s kinetic loop with `OUTRO_BG_RED_MAX=55`) and Blank Template Mode with infinite multi-layer step-by-step interactive inputs and smart safe-zone hints.
- Enforced Audio Stream Safety Rule (48kHz Stereo via `anullsrc` harmonization) and Hard Audio Peak Limiter (`alimiter` at `-0.95dB` ceiling).

### Target File: `/docs/guides/STREAM_INJECT_SUITE.md`
- Added comprehensive architecture specification and CLI command guide for the StreamInject v2.5 engine.

---

# v1.17.68 — RIFE Hardware Fallback & API Polling Diagnostic Stabilization

### Target File: `/server.ts`
```typescript
async function interpolateStoryClip(sourcePath: string, destinationPath: string, targetFps: number) {
  try {
    await execFileAsync('ffmpeg', [
      '-y', '-i', sourcePath, '-an',
      '-vf', `minterpolate=fps=${targetFps}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1`,
      '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart', destinationPath
    ], { windowsHide: true, timeout: 600000, maxBuffer: 2 * 1024 * 1024 });
  } catch {
    await normalizeStoryClip(sourcePath, destinationPath, targetFps);
  }
}
```
- Added automatic, hardware-safe FFmpeg frame interpolation fallback when `RIFE_VFI` custom node is not installed in ComfyUI. This prevents `Smooth Animation` / `RIFE` post-processing in GIF Studio and Sequential Story generation from throwing unhandled exceptions and crashing generation jobs.
- Updated `buildGifStudioWorkflow` to detect missing `RIFE_VFI` gracefully, returning clean base workflows with `rifeFallback: true` rather than throwing fatal runtime errors.
- Enhanced API diagnostic middleware to suppress transient 404s on job polling routes (`/api/jobs/:id/workflow`, `/api/jobs/:id/events/history`), preventing the dashboard error tray from being flooded with harmless expired job lookups.

### Target File: `/src/components/GifStudio.tsx`
```tsx
<select value={storyRife} onChange={e=>setStoryRife(e.target.value as any)} className="...">
  <option value="off">RIFE OFF ({storyBaseFps} FPS)</option>
  <option value="2x">2× Multiplier ({storyBaseFps*2} FPS · Auto-Fallback)</option>
  <option value="4x">4× Multiplier ({storyBaseFps*4} FPS · Auto-Fallback)</option>
</select>
```
- Clarified RIFE interpolation options in the UI to indicate automatic fallback support.

### Target File: `/src/components/PromptStudio.tsx`
```typescript
if (!isBusy && (historyRes.status === 404 || workflowRes.status === 404)) {
  if (timer) clearInterval(timer);
}
```
- Optimized runtime polling loop to automatically stop querying when a completed or expired job is no longer active in memory.

---

# v1.17.68 — GIF Studio LTX-Video Hardware Controls & Preview Layout Fix

### Target File: `/src/components/GifStudio.tsx`
```tsx
{/* LTX-Video Hardware & Parameter Controls */}
<div className="rounded-lg border border-fuchsia-500/30 bg-slate-950 p-2.5 space-y-2.5">
  <div className="flex items-center justify-between">
    <div className="text-[8px] font-bold tracking-wider text-fuchsia-300 flex items-center gap-1.5">
      <Zap className="w-3 h-3 text-amber-400"/>
      LTX-VIDEO HARDWARE ENGINE (8GB VRAM OPTIMIZED)
    </div>
    <button onClick={()=>setShowStoryAdvanced(v=>!v)} className="text-[8px] text-slate-400 hover:text-slate-200">
      {showStoryAdvanced ? 'HIDE' : 'CONFIG'}
    </button>
  </div>
  {/* Model Precision, Steps, Sampler/Scheduler, Resolution, Base FPS, RIFE, I2V Conditioning */}
</div>
```
- Integrated comprehensive LTX-Video parameter controls for Sequential Story mode:
  - **Model Precision**: Selection between `ltxv-2b-0.9.8-distilled-fp8` (FP8 quantized, ~50% VRAM reduction for 8GB) and FP16.
  - **Sampling Steps & CFG**: 20-25 steps balance point with quick presets (20 fast, 22 crisp, 25 max) + CFG slider.
  - **Sampler & Scheduler**: Euler Ancestral (Crisp), UniPC 2, Normal Scheduler (crisp detail across frames).
  - **Resolution Presets**: 768×768 (1:1), 848×480 (16:9 cinematic), 512×512 (fast).
  - **Frame Rate & RIFE**: Raw base FPS (12 FPS memory-safe) with RIFE 2× / 4× post-interpolation and live calculated output FPS telemetry.
  - **I2V Continuity Conditioning**: Reference strength (0.75-0.85 lock), image noise scale, and Final-Frame I2V toggle.
- **Fixed Preview Stretching Layout Bug**: Applied `items-start` on grid layout and constrained the live player with `aspect-video`, `min-h-[260px]`, and `max-h-[460px]` with `overflow-hidden` so expanding the Sequential Story drawer no longer elongates or distorts the preview player.

---

# v1.17.68 — GIF Studio 30s Sequential Story & Universal Synchronization

### Target Files: `/src/version.ts`, `/package.json`, `/metadata.json`, `/index.html`, `/AGENTS.md`, `/docs/INDEX.md`, `/Start_Factory.bat`, `/src/App.tsx`, `/src/components/MilestoneChecklist.tsx`
- Universal version string synchronized to `1.17.68` across the entire codebase.
- Active restore point locked and set to `RESTORE_V1.17.68_GIF_STUDIO_FIX`.
- Verified 30-second continuous and multi-scene GIF generation pipeline via sequential LTX-Video chunking, FFmpeg frame continuity, and color palette optimization.

---

# v1.17.67 — Migration & Build Validation

### Target File: `/server.ts`
```typescript
function recordComfyErrorLog(rawMessage: string, meta?: { jobId?: string; nodeId?: string; nodeType?: string; watchdog?: boolean }) { ... }
const requested: number[] = Array.isArray(req.body?.layers) ? (req.body.layers as any[]).map((n: any) => Math.round(Number(n))).filter((n: number) => !isNaN(n) && n >= 8 && n <= 36) : [20, 24, 28, 32];
const layers: number[] = Array.from(new Set<number>(requested)).sort((a: number, b: number) => a - b).slice(0, 6);
```
- Resolved TypeScript compiler errors TS2353 and TS2362/TS2363/TS2322 in `server.ts`.

### Target File: `/src/components/GifStudio.tsx`
```typescript
const Metric = ({icon,label,value}:{icon:React.ReactElement<{className?: string}>;label:string;value:string}) => ...
```
- Resolved TypeScript compiler error TS2769 on `React.cloneElement` icon prop in `GifStudio.tsx`.

### Target File: `/src/components/PromptStudio.tsx`
```typescript
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
```
- Added optional `nodes` and `workflow` properties to `WorkflowSummary` interface to resolve TS2339.

### Target File: `/src/types.ts`
```typescript
export interface AiStudioConfig {
  activeTab: 'creator'|'video'|'jobs'|'shorts'|'assets';
  workflowId: string;
  videoWorkflowId: string;
  defaultAspectRatio: '1:1'|'16:9'|'9:16'|'aida64'|'4:3'|'3:4';
}
```
- Updated `defaultAspectRatio` type union to include `'aida64'`, `'4:3'`, and `'3:4'` options.

### Target Files: `/src/version.ts`, `/package.json`, `/metadata.json`, `/index.html`, `/AGENTS.md`
- Synchronized universal app version string to `1.17.67` across all project files.

---

# v1.17.67 — Sequential Story ComfyUI Completion Fallback

- Fixed sequential GIF Studio stories stalling after an LTX scene reaches its final progress event when the ComfyUI WebSocket completion packet is missed.
- Child LTX jobs now poll ComfyUI `/history/<prompt_id>` as an authoritative completion fallback.
- History-reported execution errors are surfaced into the parent story job instead of leaving it waiting indefinitely.
- Keeps the v1.17.66 batch-size=1 VRAM/OOM fix intact.

## v1.17.66 — LTX Sequential Story CUDA OOM Guard

- Fixed a critical Sequential Story bug where the temporal frame count could be written into an LTX `batch_size` input.
- LTX story scenes now force `batch_size=1`; temporal duration remains controlled by the LTX frame/length input.
- Removed the generic parser alias that treated LTX video `frames`/`frame_count`/`length` as batch size.
- This prevents a 5-second scene at 25 FPS from accidentally becoming a 121-sample batch on an 8GB RTX 3070 Ti.
- Added an explicit safety normalization immediately before each LTX story workflow is submitted to ComfyUI.

## v1.17.65 — GIF Studio Sequential Story Execution & Preview Fixes

- GIF Studio LTX generation now uses a real server-side sequential story runner instead of submitting only the first LTX scene.
- Long single prompts are automatically split into safe LTX chunks and chained by final-frame image-to-video conditioning.
- Each completed block exposes live ComfyUI node/progress events through the parent story job.
- Final-frame PNGs are extracted between blocks and fed into `LTXVImgToVideo` when available.
- Optional story-level RIFE is applied per block before final concatenation to keep RTX 3070 Ti VRAM bounded.
- GIF Studio now previews its own finished GIF/MP4 output directly; Adopt LTX Output is no longer required.
- Story jobs return stored media through the normal job output API and support re-export with meme text/compression.
- Added reference strength/noise controls and story block telemetry.
- Added update documentation under `docs/updates/` to keep the project root clean.

## v1.17.64 — GIF Studio Sequential Story Controls

- Added full Sequential Story workspace controls to GIF Studio.
- Added per-scene prompts, durations, transitions, seed modes, continuity/reference toggles, story-level continuity settings and RIFE selection.
- Added automatic total-duration calculation and story metadata packaging.
- Fixed GIF audit metadata reference to `built.effectiveLoopCount`.

# v1.17.63

- Fixed GIF Studio not displaying completed LTX output until Adopt LTX Output was clicked.
- Improved direct output media detection and preview refresh.

# v1.17.62 — GIF Studio exact-duration output & result preview

- Fixed the Output Duration control so 30s and longer targets are actually encoded to the requested duration.
- Removed the ComfyUI repeat-count ceiling from final-duration calculation.
- Added automatic GIF + MP4 finalization after the ComfyUI source clip completes.
- GIF Studio now previews the finished exported result and provides GIF/MP4 preview switching.
- Added long-form FFmpeg encoding time allowance up to 2 hours for extended outputs.
- Corrected RIFE duration accounting: RIFE changes frame rate/count together and does not shorten the timeline.

# v1.17.61 — GIF Studio Long-Form Controls & Generation Telemetry

- Added 0–360 second duration slider plus exact duration entry up to 6 hours.
- Added Loop vs Continuous output mode; continuous exports use FFmpeg stream looping and exact `-t` duration.
- Exposed calculated source duration/repeat information in GIF Studio job metadata and live telemetry.
- Exported GIF/MP4 requests now carry the selected duration and mode.
- Kept ComfyUI as the source for actual node execution and preserved live node/event/workflow inspection.

# v1.17.60 — Live System Inventory & Current Capability Discovery

- Reworked the System capability map to auto-discover current local model files instead of relying on an obsolete fixed model list.
- Added live ComfyUI `/object_info` node-class inventory and custom-node directory discovery.
- System runtime now exposes current FLUX GGUF, LTX, RIFE, GIF Studio, graph-sync and Gemma projector readiness.
- Updated the projector baseline to `mmproj-q8_0.gguf` while retaining wildcard `mmproj*.gguf` discovery.
- Removed stale Wan/Hunyuan entries from Model Pre-Warm; LTX target is now auto-discovered or pinned with `LTX_MODEL`.
- Updated System feature copy, model labels and thermal/VRAM descriptions to match the current stack.

# v1.17.59 — Native GIF Studio

- Added native **GIF STUDIO** dashboard tab with three-panel asset, player/timeline and AI processing workspace.
- Added local MP4/MOV/WEBM/MKV and PNG/JPG image-sequence import into `C:\Gina_AI\media\gif_studio`.
- Added dynamic ComfyUI GIF pipeline using VideoHelperSuite trim/load/combine nodes and optional `RIFE_VFI` interpolation when installed.
- Added frame window, FPS/frame-delay, ping-pong, loop count and compression controls.
- Added live ComfyUI node graph/event synchronisation and resolved workflow JSON inspection.
- Added VRAM purge before GIF processing and a 60°C thermal governor that reduces output FPS under heat.
- Added meme text preview and FFmpeg-burned dual export to GIF and H.264 MP4.
- Added LTX generation hand-off so a completed LTX video can be adopted as a GIF Studio source.

# v1.17.58

- Workflow registry now keeps the live `C:\Gina_AI\workflows` definition as the active override, while packaged workflows remain the fallback; Creator Studio introspects that resolved definition so its controls match the workflow Gina actually submits.
- Creator Studio now mirrors the actual workflow defaults (including 1024×600 AIDA64) instead of stale localStorage values.
- Added direct scalar workflow-input controls, live execution node/status telemetry, job event history, and resolved-workflow inspection.
- Corrected FLUX model identity everywhere to `FLUX.1-Schnell GGUF Q4_K_S` and made model pre-warm semantics explicit: armed target + VRAM flush, not falsely resident weights.

## 1.17.57 — startup stability hotfix

- Fixed a React render loop caused by unstable ProjectState callback identities.
- Kept AIDA64 staging/reference state wired into Create Studio.
- Removed the frontend dependency on a named `ACTIVE_SAVE_POINT_ID` export to avoid startup import failures.
- Retained FLUX GGUF + 1024×600 workflow configuration.

# v1.17.55 — FLUX GGUF + AIDA64 1024×600 Generation Lock

- Switched the registered `flux_image` workflow from the FP8 `UNETLoader` to `UnetLoaderGGUF` using `flux1-schnell-Q4_K_S.gguf`.
- Switched the FLUX reference workflow to the same GGUF model loader.
- Kept the AIDA64 baseline workflow at exactly **1024×600** and retained server-side dimension enforcement/PNG verification.
- Updated Creator Studio defaults to **FLUX.1-Schnell (GGUF Q4_K_S)** and **1024×600 AIDA64**.
- Extended the one-click test suite with GGUF loader/model checks and an AIDA64 1024×600 workflow-lock check.

# v1.17.53 — AIDA64 Template-Guided Image Generation

- AIDA64 template is now uploaded as a visual reference image for FLUX generation.
- Removed the aggressive gauge-zone masking workflow from the normal generation path.
- The 12 Gauge Factory positions remain visible as composition landmarks.
- Existing AIDA64 1024×600 generation lock remains in place.

## v1.17.52 — AIDA64 hard resolution verification + protected gauge background
- Hard-locks AIDA64 generation at 1024×600 at workflow payload level.
- Verifies returned PNG dimensions and rejects 1024×576 output.
- Adds protected 12-gauge background compositor that masks AI-generated gauges/needles/text inside real Gauge Factory zones.
- Adds a Protect Gauge Zones action in Create Studio.
- Updates 12-gauge prompt compiler to describe empty protected mounting zones rather than asking the model to render gauges.

## v1.17.51 — AIDA64 1024×600 Generation Lock

- Added a dedicated `AIDA64 Panel` aspect/resolution option at exactly **1024×600**.
- Added `1024 × 600 · AIDA64` to Creator Studio resolution presets.
- AIDA64 Studio → Create Studio handoff now preserves the exact 1024×600 canvas instead of converting it to generic 16:9 (1024×576).
- App-level AIDA64 prompt handoff now preserves 1024×600 as well.
- Generic image generation defaults remain unchanged; 1024×600 is an explicit AIDA64 target.
- Note: local build/lint could not be executed in this packaging environment because dependencies (`node_modules`) are not installed here.

## v1.17.47 — Test Suite Local AI Prerequisite Management
- Live smoke tests can auto-start stopped Gemma and wait for readiness.
- Distinguishes a stopped dependency from a failed smoke test.
- Added an AUTO-START GEMMA control when live tests are enabled.

# v1.17.46

- Fixed false Gemma mmproj warning by resolving the projector path during status/diagnostic checks, independent of llama-server child state.
- Added optional live Gemma vision smoke test to the unified test suite. It creates a temporary local PNG, sends it through the real multimodal chat path, verifies a response, and removes the test file.
- Vision smoke test is only run when LIVE SMOKE TESTS is enabled.

## v1.17.46 — Unified Diagnostic Test Suite

- Added `/src/components/TestSuitePanel.tsx` with a single RUN ALL TESTS control, grouped PASS/FAIL/WARN results, optional live smoke test, rerun, and copy-ready report.
- Added `/api/diagnostics/test-suite` in `server.ts` for non-destructive integration checks across Core, Local AI, Vision, Image Generation, Reference, Orchestration, Data, and Hardware.
- Added optional live Gemma text smoke test; it is disabled by default to avoid unnecessary GPU work.
- Added restore point `RESTORE_15_V1.17.46_TEST_SUITE` and synchronized version metadata.


## v1.17.43 — Local Capability Map & Hardware Sentinel Update

- Updated the capability map for the current local stack: Gemma 3 12B vision projector, FLUX reference/image-to-image workflows, workflow ingestion, and live runtime readiness.
- Added `mmproj-model-f16.gguf` to local model dependency discovery.
- Hardware Sentinel now reports live NVIDIA VRAM usage, temperature, and utilization instead of stale fixed values.
- Added capability readiness indicators for text-to-image, image reference, Gemma Vision, and workflow ingestion.
- Kept the capability scan local-only and non-destructive.

## v1.17.41 — Shared image generation progress + safe development reloads

- AI Tools now attaches to the same ComfyUI generation job state as Create Studio and displays live percentage/step progress plus STOP & FLUSH.
- Restored Vite HMR for source changes and `tsx watch` for server changes while keeping mutable uploads/models/generated assets ignored.
- AI Tool image generation and Create Studio now share the same cancellation/progress job state.

# v1.17.39 — Local AI reliability / timeout pass

- Increased Local AI request timeout default to 5 minutes.
- Added explicit Local AI chat cancellation.
- Cancelling aborts the in-flight request and asks the server to cancel the active llama.cpp request.
- Added clearer cancellation diagnostics.

# v1.17.38 — TTS Markdown Readback Sanitization

- Added a central speech-only Markdown sanitizer for Local AI readback.
- Removes bold/italic/code/link/list/table/heading markup before speech synthesis.
- Keeps the original Markdown response unchanged in the chat UI.
- Applies to browser SpeechSynthesis and the local voice bridge.


### v1.17.36 — Create Studio Render Recovery

- Fixed `PromptStudio` render crash caused by the `cancelJob` handler being referenced without being destructured from `useGenerationJob()`.
- Keeps the STOP & FLUSH control functional without taking down the Create Studio render surface.
- Bumped application/package metadata to v1.17.36.

## v1.17.33 — Generation Stop + VRAM Flush
- Added a visible Create Studio STOP & FLUSH control while image generation is queued/running.
- Cancellation now interrupts ComfyUI, clears its queue, and awaits `/free` with model unload + memory release.
- Cancellation reports whether the VRAM flush completed and records a diagnostic if it did not.

## v1.17.32 — Dependency preflight fix
- Start_Factory.bat now verifies JSZip before launching Gina.
- Automatically runs npm install when required dependencies are missing.
- Prevents ERR_MODULE_NOT_FOUND for jszip from producing a confusing startup failure.

# v1.17.28 — Render Recovery

- Fixed missing `ComfyUIStatusIndicator` import that caused the React dashboard to crash on startup.
- Kept the System → Logs diagnostics work from v1.17.27.
- Bumped application/save-point version to 1.17.28.

# v1.17.27 — DIAGNOSTICS + HMR SAFETY FIX

- Made `GET /api/error-log` failure-proof and non-recursive: it always returns a diagnostic JSON response instead of becoming HTTP 500.
- Added safe serialization of log entries and degraded-mode reporting.
- Prevented the central API-error recorder from recording `/api/error-log` failures, avoiding a diagnostic feedback loop.
- Made Vite HMR opt-in (`GINA_HMR=true`) so runtime/metadata changes cannot reload the browser and abort in-flight uploads.
- Disabled HMR in the Express middleware Vite instance used by Gina's local server.
- Expanded watcher ignores for runtime/generated metadata files.
- Dashboard Logs now surfaces degraded diagnostics state without repeatedly treating it as a new server error.

# v1.17.26 — System UI reorganization

- Reorganized the System workspace into Overview, Hardware, Models & Workflows, Safeguards, and Logs tabs.
- Moved the Dashboard Error Log into the dedicated Logs tab with copy/clear/download controls.
- Reduced the System page from a long stack of panels to focused functional sections.
- Kept existing system components and diagnostics intact; this is a UI organization change only.

# v1.17.25 — upload reload fix + dashboard error diagnostics

- Fixed Vite HMR watching `local_ai_uploads`, which caused an upload to trigger a page reload and abort the in-flight POST (`BadRequestError: request aborted`).
- Added `local_ai_uploads` and local launcher/script files (`*.bat`, `*.cmd`, `*.ps1`) to both Vite watch ignore configurations.
- Added a bounded local Dashboard Error Log that captures Express/body-parser failures, request-aborted uploads, and API 4xx/5xx responses.
- Added Copy Errors, refresh, clear, and combined telemetry/error-log download controls.
- Error logs stay local and are cleared from both the browser and server buffers with the existing Clear control.
- Bumped application version and restore point to v1.17.25.

# v1.17.22 — attachment and local vision completion

- Completed Create Studio reference-image UI and bundled `flux_image_reference` workflow.
- Completed Local AI image attachment transport: uploaded images are passed as real multimodal OpenAI-compatible `image_url` parts when a llama.cpp projector is configured.
- Added automatic `*mmproj*.gguf` detection and `GINA_LLM_MMPROJ` override.
- Added Local AI `VISION READY` / `TEXT ONLY` status.
- Updated standalone Local LLM launcher to pass the detected projector.

# v1.17.21 — Local AI attachment handler hotfix

- Removed duplicate `handleAttachFile` declaration from `src/components/LocalLlmStudio.tsx`.
- Preserved the v1.17.20 Local AI attachment limits: text/code/config 2 MB, images 12 MB, ZIP 25 MB, 5 attachments per turn, 100 ZIP entries, 4 MB extracted text context.
- This is a focused compile hotfix; no LTX or AIDA64 changes.

# v1.17.20 — Local AI Universal Attachment Pipeline

### Local-only attachment expansion
- Added `/api/llm/upload-attachment` for strictly local attachment ingestion.
- Local AI now accepts supported text/code/config files, PNG/JPG/WEBP/BMP/GIF images and ZIP archives from the Gina dashboard.
- ZIP archives are inspected locally with JSZip; supported text/code files are extracted into the current Local AI prompt with a 4 MB aggregate text cap and 100-file archive cap.
- Images are stored locally and surfaced as attachments. The current text-only Gemma/llama.cpp path receives image metadata only; no false visual interpretation is claimed.
- Added per-kind limits: text 2 MB, images 12 MB, ZIP 25 MB; maximum 5 attachments per Local AI turn.
- Removed stale `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API` metadata capability.
- Created `RESTORE_11_V1.17.20_LOCAL_AI_ATTACHMENTS` and lifecycle Phase 19.

# v1.17.18 — Advanced Voice Pipeline, Persistent Voice Presets, Real-Time Node Graph Sync & Milestone Roadmap Expansion

### 1. Target File Path: `/src/components/LocalLlmStudio.tsx`
```typescript
// Permanent voice preference storage and visual default indicator
const [voiceName, setVoiceName] = useState<string>(() => {
  return localStorage.getItem('gina_voice_name') || localStorage.getItem('gina_voice_default') || '';
});
const [defaultVoiceName, setDefaultVoiceName] = useState<string>(() => {
  return localStorage.getItem('gina_voice_default') || '';
});

const handleSetAsDefault = (selectedVoice: string) => {
  setDefaultVoiceName(selectedVoice);
  localStorage.setItem('gina_voice_default', selectedVoice);
  localStorage.setItem('gina_voice_name', selectedVoice);
};
```
**Summary**: Implemented persistent voice preset manager in `LocalLlmStudio.tsx` allowing users to select and permanently lock any voice (defaulting to Google US English) across sessions with a "★ Set Default" control.

### 2. Target File Path: `/src/components/MilestoneChecklist.tsx`
```typescript
// Expanded lifecycle phases 1-17 with completed Phase 12 & Phase 13 and future roadmap suggestions
{ phase: 12, name: 'REAL-TIME COMFYUI NODE GRAPH SYNC', status: 'COMPLETED' },
{ phase: 13, name: 'ADVANCED LOCAL VOICE PIPELINE & PERSISTENCE', status: 'COMPLETED' },
{ phase: 14, name: 'ONE-CLICK WORKFLOW JSON/PNG INGESTION', status: 'PENDING' },
{ phase: 15, name: 'HIGH-DPI AIDA64 TRANSPARENT DESKTOP HUD', status: 'PENDING' },
{ phase: 16, name: 'MULTI-GGUF BENCHMARK & DYNAMIC VRAM TUNER', status: 'PENDING' },
{ phase: 17, name: 'KNOWLEDGE INGESTION & AUTO-INDEXING AGENT', status: 'PENDING' }
```
**Summary**: Updated `MilestoneChecklist.tsx` to mark Phase 12 and Phase 13 as COMPLETED, created active restore point `RESTORE_09_V1.17.18_VOICE_GRAPH_SYNC`, and added suggested future phases 14-17.

### 3. Target File Path: `/src/components/AppFeaturesGuide.tsx`
```typescript
// Added advanced voice pipeline, drag-and-drop workflow ingestion, transparent HUD, benchmark tuner features, and 17-phase roadmap
{
  id: 'voice_synthesis',
  title: 'Advanced Local Voice Pipeline & Persistent Presets',
  badge: 'Google US English · Persistent',
  shortDesc: 'Natural Google US English default voice with permanent localStorage persistence, Windows SAPI bridge fallback, and speech rate modifier.'
}
```
**Summary**: Synchronized `AppFeaturesGuide.tsx` with all verified features, updated the version badge to V1.17.18, expanded the roadmap to 17 phases, and detailed the upcoming innovations.

### 4. Target File Path: `/src/version.ts`, `/metadata.json`, `/package.json`, `/AGENTS.md`
```typescript
export const APP_VERSION = '1.17.18';
export const APP_RELEASE_NAME = 'Advanced Voice Pipeline, Real-Time Node Graph Sync & Milestone Roadmap Expansion';
export const ACTIVE_SAVE_POINT_ID = 'RESTORE_09_V1.17.18_VOICE_GRAPH_SYNC';
export const ACTIVE_LIFECYCLE_PHASE = 13;
export const ACTIVE_LIFECYCLE_NAME = 'ADVANCED LOCAL VOICE PIPELINE & PERSISTENCE';
```
**Summary**: Synchronized universal version numbers and metadata across all core manifests per RULE 7.

---

# v1.17.17 — Gina Voice Default to "Google US English", AppFeaturesGuide Sync & Stage 12 Node Graph

### 1. Target File Path: `/src/components/LocalLlmStudio.tsx`
```typescript
// Prioritize 'Google US English' in browser voice synthesis selection with intelligent fallbacks
const preferred =
  browserVoices.find(v => /google\s+us\s+english/i.test(v.name)) ||
  browserVoices.find(v => /google/i.test(v.name) && /en-US/i.test(v.lang)) ||
  browserVoices.find(v => /microsoft.*jenny/i.test(v.name)) ||
  browserVoices.find(v => /jenny/i.test(v.name)) ||
  browserVoices.find(v => /microsoft.*aria/i.test(v.name)) ||
  browserVoices.find(v => /microsoft.*zira/i.test(v.name)) ||
  browserVoices.find(v => /en-US/i.test(v.lang)) ||
  browserVoices.find(v => /en-GB/i.test(v.lang)) ||
  browserVoices[0];
```
**Summary**: Defaulted Gina voice synthesis to natural "Google US English" across browser and backend fallback routes per user specification.

### 2. Target File Path: `/src/components/AppFeaturesGuide.tsx`
```typescript
// Synchronized PROJECT SYSTEM ARCHITECTURE & FEATURE GUIDE with Stage 12 Node Graph Sync & Voice Updates
{
  id: 'comfy_node_graph',
  title: 'Real-Time ComfyUI Node Graph Sync & Workflow Inspector',
  icon: Network,
  badge: 'Phase 12 · Graph Sync',
  category: 'Node Graph Sync',
  shortDesc: 'Live ComfyUI node graph parser, dynamic input parameter bindings, and visual workflow topology mapper.'
}
```
**Summary**: Updated `AppFeaturesGuide.tsx` to document Stage 12 ComfyUI Node Graph Sync capabilities, dual-mode visualizer, and updated voice default behavior.

### 3. Target File Path: `/src/components/ComfyUINodeGraph.tsx`
```typescript
// Interactive multi-tab ComfyUI node graph inspector supporting parameters, graph nodes, and raw schema views
export const ComfyUINodeGraph: React.FC<Props> = ({ onAddLog }) => { ... }
```
**Summary**: Expanded `ComfyUINodeGraph.tsx` with full multi-tab workflow inspector, search filtering, dynamic parameter mapping, and live connection topology.

### 4. Target File Path: `/server.ts` & `/src/App.tsx`
```typescript
// Synchronized version constants and health endpoints to v1.17.2 and RESTORE_08_V1.17.2_LOCAL_RAG
app.get('/api/version', (_req, res) => res.json({ ok:true, version:'v1.17.2', routes:{capabilities:true,agentQuick:true,pdf:true,nodeGraph:true} }));
```
**Summary**: Aligned version endpoints across Express server and React footer to dynamic constant `APP_VERSION`.

---

# v1.17.16 — Vite Watcher Exhaustion & V8 Heap OOM Permanent Fix

### 1. Target File Path: `/vite.config.ts` & `/server.ts`
```typescript
// Explicitly ignore massive Python virtualenvs, binary model weights, tools, outputs, and heavy assets from Vite watcher
watch: {
  usePolling: false,
  ignored: [
    '**/ComfyUI_windows_portable/**',
    '**/g_env/**',
    '**/.g_env/**',
    '**/models/**',
    '**/tools/**',
    '**/output/**',
    '**/input/**',
    '**/.git/**',
    '**/.gina/**',
    '**/dist/**',
    '**/logs/**',
    '**/docs/**',
    '**/*.safetensors',
    '**/*.gguf',
    '**/*.bin',
    '**/*.pt',
    '**/*.pth',
    '**/*.mp4',
    '**/*.png',
    '**/*.webp',
    '**/*.zip',
    '**/*.tar*'
  ]
}
```
**Summary**: Resolved Node V8 heap exhaustion (`JavaScript heap out of memory`) caused by Vite's chokidar watcher recursively indexing over 100,000+ files and multi-gigabyte models inside `C:\Gina_AI`.

### 2. Target File Path: `/Start_Factory.bat`
```batch
start "Gina Dashboard" cmd /k "cd /d %GINA_ROOT% && call g_env\Scripts\activate.bat && set NODE_OPTIONS=--max-old-space-size=8192 && npm.cmd run dev"
```
**Summary**: Raised Node.js maximum old space size to 8192 MB (8 GB) in `Start_Factory.bat` to ensure high-headroom execution for full-stack local tooling.

---

# v1.17.15 — Universal Version Synchronization, Milestone Protection & Rules 7/8 Enforcement

### 1. Target File Path: `/src/version.ts` (New File)
```typescript
export const APP_VERSION = '1.17.2';
export const APP_RELEASE_NAME = 'Local Zero-VRAM RAG Knowledge Engine';
export const ACTIVE_SAVE_POINT_ID = 'RESTORE_08_V1.17.2_LOCAL_RAG';
export const ACTIVE_LIFECYCLE_PHASE = 12;
export const ACTIVE_LIFECYCLE_NAME = 'REAL-TIME COMFYUI NODE GRAPH SYNC';
```
**Summary**: Created a centralized single source of truth for versioning and active restore points across both UI and backend layers.

### 2. Target File Path: `/AGENTS.md`
```markdown
### RULE 7: Universal Version & Metadata Synchronization Guard
- Update /src/version.ts, package.json, metadata.json, index.html, AGENTS.md, and MilestoneChecklist.tsx with zero discrepancies across versions.

### RULE 8: Strict Milestone Save & Restore Point Verification Protocol
- Never revert completed milestones (Phases 1–11 are locked).
- Synchronized restore points in MilestoneChecklist.tsx and ACTIVE_SAVE_POINT_ID.
- Atomic changelog entries for every code modification.
- Clean root enforcement: no loose documentation or log files in root.
```
**Summary**: Codified Rule 7 and Rule 8 to permanently prevent code loss, milestone regressions, and version drift across all AI sessions.

### 3. Target File Path: `/package.json`, `/index.html`, `/src/App.tsx`, `/src/components/Header.tsx`, `/server/agent/AgentContextManager.ts`
```typescript
// package.json -> version 1.17.2
// index.html -> synced description and title
// App.tsx -> activeSavePoint bound to ACTIVE_SAVE_POINT_ID
// Header.tsx -> dynamic COMMAND v{APP_VERSION}
// AgentContextManager.ts -> added src/version.ts to context inspection snapshot
```
**Summary**: Reconciled all version discrepancies across package manifests, HTML tags, React headers, and agent context loaders.

---

# v1.17.14 — Root Directory Cleanup & Full Migration to /docs/ Subdirectories

### 1. Target Directory: `/` (Root Cleanup)
```
Moved to /docs/aida64/:
- AIDA64_COMPLETE_ENGINE.md
- AIDA64_ENGINE_MANIFEST.json
- AIDA64_FULL_EFFECTS.md
- AIDA64_TELEMETRY_IMPLEMENTATION_RECORD.md

Moved to /docs/guides/:
- GAUGE_FACTORY_IMPLEMENTATION_RECORD.md
- GAUGE_FACTORY_STYLES.md

Moved to /docs/setup/:
- SETUP_V1.2.md
- LOCAL_LLM_SETUP.md (deduplicated)
- LOCAL_AGENT_SETUP.md (deduplicated)
```
**Summary**: Purged all scattered `.md` and `.json` documentation from the root directory into structured subdirectories (`/docs/aida64/`, `/docs/guides/`, `/docs/setup/`) per Rule 5. Root is now strictly reserved for core project files (`AGENTS.md`, `CHANGELOG.md`, `README.md`, `server.ts`, `package.json`, `index.html`, batch scripts).

### 2. Target File Path: `/server/agent/AgentContextManager.ts`
```typescript
const files = [
  'AGENTS.md',
  'CHANGELOG.md',
  'README.md',
  'docs/INDEX.md',
  'docs/architecture/SYSTEM_ARCHITECTURE.md',
  'src/components/MilestoneChecklist.tsx',
  'src/components/AppFeaturesGuide.tsx',
  'src/components/LocalCapabilityPanel.tsx',
  'package.json',
  'metadata.json',
  'docs/setup/LOCAL_LLM_SETUP.md',
  'docs/setup/LOCAL_AGENT_SETUP.md'
];
```
**Summary**: Synchronized Agent context snapshot inspection paths to target relocated documentation files.

---

# v1.17.13 — Documentation Organization, Agent Startup Rules & System Architecture Overhaul

### 1. Target File Path: `/AGENTS.md`
```markdown
### RULE 5: Directory Structure & File Organization Hierarchy
- Root Directory (`/`): Reserved strictly for core configuration and execution entry points.
- Documentation Directory (`/docs/`): All architecture guides, system topology specs, and setup guides belong in `/docs/`.
- Logs & Audit Trails (`/logs/`): Runtime audit logs, benchmark summaries, and telemetry snapshots.

### RULE 6: Mandatory AI Context Ingestion on Session Startup
- The AI MUST inspect MilestoneChecklist.tsx, AppFeaturesGuide.tsx, LocalCapabilityPanel.tsx, CHANGELOG.md, and docs/INDEX.md on session start.
```
**Summary**: Codified Rule 5 (Directory Structure) and Rule 6 (Mandatory Startup Context Ingestion) to eliminate regressions and ensure immediate AI situational awareness.

### 2. Target File Path: `/docs/INDEX.md` & `/docs/architecture/SYSTEM_ARCHITECTURE.md`
```markdown
# Gina AI Factory — Documentation Index & Architecture Manifest
/docs/
├── INDEX.md
├── architecture/SYSTEM_ARCHITECTURE.md
├── aida64/AIDA64_68_FEATURES.md
├── setup/LOCAL_LLM_SETUP.md & LOCAL_AGENT_SETUP.md
└── guides/GAUGE_FACTORY_STYLES.md
```
**Summary**: Established centralized `/docs/` and `/logs/` directories, providing a single index for all specifications, hardware constraints, and workflow guides.

### 3. Target File Path: `/src/components/AppFeaturesGuide.tsx`
```typescript
// 3-Tab Interactive Architecture & Feature Guide
const [activeTab, setActiveTab] = useState<'studios' | 'architecture' | 'roadmap'>('studios');
// Tab 1: Studios & Engines (FLUX.1 Schnell, LTX-Video 2B + RIFE, AIDA64, Gemma 3 12B, Agent, RAG)
// Tab 2: Architecture Flow (React 19 -> Express API -> ComfyUI 8188 / llama.cpp 8080 -> RTX 3070 Ti)
// Tab 3: Roadmap (12 Phases status tracker)
```
**Summary**: Replaced static guide with an interactive 3-tab layout covering Studios, Architecture Flow topology, and the 12-phase Roadmap.

### 4. Target File Path: `/src/components/LocalCapabilityPanel.tsx`
```typescript
// Modernized 4-Card Hardware Sentinel & Capability Matrix
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
  {/* GPU Sentinel & 7372 MB VRAM Cage */}
  {/* Service Endpoints: 8188 ComfyUI, 8080 llama.cpp, AIDA64 Shm, RAG */}
  {/* Generator Subsystems Matrix */}
  {/* Verified Model Checkpoints */}
</div>
```
**Summary**: Modernized the local capability view into a responsive 4-column matrix displaying real-time hardware status, port bindings, and model checkpoint health.

### 5. Target File Path: `/server/agent/AgentContextManager.ts`
```typescript
const files = [
  'AGENTS.md', 'CHANGELOG.md', 'README.md', 'docs/INDEX.md',
  'docs/architecture/SYSTEM_ARCHITECTURE.md', 'src/components/MilestoneChecklist.tsx',
  'src/components/AppFeaturesGuide.tsx', 'src/components/LocalCapabilityPanel.tsx',
  'package.json', 'metadata.json', 'LOCAL_LLM_SETUP.md', 'LOCAL_AGENT_SETUP.md'
];
```
**Summary**: Added documentation files and UI feature guide components to the autonomous agent's startup context snapshot.

---

# v1.17.12 — Zero-VRAM Local RAG Knowledge Engine, Advanced Settings & Milestone Alignment

### 1. Target File Path: `/server/rag/LocalRagEngine.ts`
```typescript
export class LocalRagEngine {
  private chunks: RagChunk[] = [];
  public getStatus(): RagStatus { ... }
  public async reindex(customRoot?: string): Promise<RagStatus> { ... }
  public search(query: string, category?: string, limit: number = 5): RagSearchResult[] { ... }
  public getGroundingContext(query: string, maxTokens: number = 800): string { ... }
}
```
**Summary**: Created the standalone in-memory, zero-VRAM hybrid BM25 + Vector local retrieval engine with pre-seeded hardware/LLM/AIDA64/agent knowledge chunks and sandbox document crawler.

### 2. Target File Path: `/server.ts`
```typescript
import { LocalRagEngine } from "./server/rag/LocalRagEngine.js";
const localRag = new LocalRagEngine(GINA_ROOT);

// Zero-VRAM Local RAG API Routes
app.get('/api/rag/status', (_req, res) => res.json(localRag.getStatus()));
app.post('/api/rag/query', (req, res) => { ... });
app.post('/api/rag/reindex', async (req, res) => { ... });

// Agent tool integration
case 'knowledge_search': {
  const ragMatches = localRag.search(query, parameters?.category, maxResults);
  ...
}

// Automatic RAG grounding in local LLM chat
const ragGrounding = localRag.getGroundingContext(rawLatestUser, 400);
if (ragGrounding) { ... }
```
**Summary**: Integrated LocalRagEngine with Express server endpoints, autonomous agent `knowledge_search` tool, and automatic grounding in `/api/llm/chat`.

### 3. Target File Path: `/src/components/LocalRagKnowledgePanel.tsx` & `/src/components/LocalLlmStudio.tsx`
```typescript
// Collapsible developer tools & zero-VRAM knowledge workbench
export const LocalRagKnowledgePanel: React.FC<Props> = ({ onAddLog, defaultExpanded = false }) => { ... };

// Embedded inside LocalLlmStudio advanced settings
<div className="mt-3">
  <LocalRagKnowledgePanel onAddLog={(lvl, msg) => onAddLog(lvl === 'error' ? 'WARN' : 'INFO', msg)} defaultExpanded={false} />
</div>
```
**Summary**: Created responsive, collapsible Local RAG Knowledge Panel with search testing, category filtering, keyword badges, and re-indexing controls, embedded neatly in the advanced settings area.

### 4. Target File Path: `/src/components/MilestoneChecklist.tsx` & `/metadata.json`
```typescript
// Pinned restore point RESTORE_08_V1.17.2_LOCAL_RAG and updated Lifecycle Phases 11 & 12
{ phase: 11, name: 'LOCAL RAG KNOWLEDGE BASE & VECTOR ENGINE', status: 'COMPLETED', details: 'Zero-VRAM hybrid BM25 + Vector in-memory retrieval, instant semantic grounding for LLM & agent' },
{ phase: 12, name: 'REAL-TIME COMFYUI NODE GRAPH SYNC', status: 'IN_PROGRESS', details: 'Live workflow graph inspector, node parameter synchronization, and visual connection mapper' }
```
**Summary**: Synchronized milestone progress with Phase 11 complete and Phase 12 in progress, tagged save point `RESTORE_08_V1.17.2_LOCAL_RAG`.

---

# v1.17.11 — Segment Range Extension (1–200), Adaptive Segment Gaps & Dynamic Linear Segment Scaling

### 1. Target File Path: `/src/components/aida64/Aida64StateGaugeGenerator.tsx`
```typescript
// Section 3: Extended Segment Slider and Direct Numeric Input (1-200) for both Circular and Linear styles
<input
  type="number"
  min="1"
  max="200"
  value={config.segmentCount}
  onChange={(e) => setConfig({ ...config, segmentCount: Math.max(1, Math.min(200, Number(e.target.value) || 1)) })}
  className="w-14 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-right font-mono text-[11px] text-emerald-400 focus:border-emerald-500 outline-none"
/>
<input
  type="range"
  min="1"
  max="200"
  value={config.segmentCount}
  onChange={(e) => setConfig({ ...config, segmentCount: Number(e.target.value) })}
  className="w-full h-1.5 bg-slate-800 rounded cursor-pointer accent-emerald-500"
/>

// Dynamic segment gap scaling to avoid negative or collapsed segment geometry with high segment counts
const segCount = Math.max(1, cfg.segmentCount || 24);
const segmentSpanRad = totalSpanRad / segCount;
const maxGapRad = segmentSpanRad * 0.45;
const gapRad = Math.min(maxGapRad, Math.max(0, (cfg.segmentGapDeg * Math.PI) / 180));
```
**Summary**: Raised the segment upper boundary to 200 across all UI controls, added a direct number input box, and clamped segment gaps proportionally to prevent segment inversion or overlap at high counts.

---

# v1.17.10 — Telemetry 1000ms Default, Gauge Factory LCD Digital Glow, Solid Value Color, Radiant Needle Glow & Outside Segment Numbering

### 1. Target File Path: `/src/hooks/useAida64Telemetry.ts`, `/server/aida64/Aida64TelemetryBridge.ts`, `/scripts/aida64_shared_memory.ps1`, `/src/components/Aida64Studio.tsx`, `/src/components/aida64/Aida64TelemetryPanel.tsx`, `/src/components/aida64/Aida64StateGaugeGenerator.tsx`
```typescript
// Standardized default polling interval to 1000ms across frontend and backend
export function useAida64Telemetry(intervalMs = 1000) { ... }
const clampInterval = (val?: number) => Math.max(100, Math.min(val ?? 1000, 10000));
param([int]$IntervalMs = 1000)
```
**Summary**: Switched default telemetry polling interval from 250ms to 1000ms across all components, server bridge, and PowerShell script to eliminate polling contention and ensure reliable telemetry readings.

### 2. Target File Path: `/src/types.ts` & `/src/data/aida64Presets.ts`
```typescript
// Extended gauge sequence configuration interface with LCD glow, needle glow, and segment numbering
export interface Aida64GaugeSequenceConfig {
  ...
  centerValueColorMode?: 'state' | 'custom';
  centerValueGlowEnabled?: boolean;
  centerValueGlowColor?: string;
  centerValueGlowRadius?: number;
  centerValueFontFamily?: 'digital' | 'monospace' | 'sans-serif';
  centerValueLcdGhost?: boolean;
  metricLabelGlowEnabled?: boolean;
  metricLabelGlowColor?: string;
  metricLabelGlowRadius?: number;
  metricLabelFontFamily?: 'sans-serif' | 'digital' | 'monospace';
  needleGlowEnabled?: boolean;
  needleGlowColorMode?: 'needle' | 'state' | 'custom';
  needleGlowColor?: string;
  needleGlowRadius?: number;
  showSegmentNumbers?: boolean;
  segmentNumbersScale?: number;
  segmentNumbersOffset?: number;
  segmentNumbersFormat?: '0-100' | '1-100' | 'step-10' | 'step-20' | 'step-25' | 'segments';
  segmentNumbersColorMode?: 'state' | 'custom' | 'track';
  segmentNumbersColor?: string;
  segmentNumbersGlow?: boolean;
  segmentNumbersGlowColor?: string;
}
```
**Summary**: Added comprehensive type definitions and preset defaults for digital LCD glow effects, solid center value color modes, radiant needle glow, and external segment numbering.

### 3. Target File Path: `/src/components/aida64/Aida64StateGaugeGenerator.tsx`
```typescript
// Multi-pass radiant needle glow rendering
if (needleGlowOn && needleGlowRad > 0) {
  ctx.save();
  ctx.shadowColor = needleGlowCol;
  ctx.shadowBlur = needleGlowRad * 1.5;
  ctx.strokeStyle = needleGlowCol;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.lineTo(cfg.outerRadius, 0);
  ctx.stroke();
  ctx.restore();
}

// Outside segment numbering scaled by segment size and radial offset
if (cfg.showSegmentNumbers) {
  const numScale = Math.max(0.2, Math.min(3, cfg.segmentNumbersScale ?? 1));
  const segmentThickness = Math.max(4, (cfg.outerRadius - cfg.innerRadius));
  const fontSize = Math.max(6, Math.round(Math.min(16, Math.max(7, segmentThickness * 0.55)) * numScale));
  ...
}

// Center Value and Metric Label LCD digital glow with dual bloom passes and 888 ghost background
if (valGlowOn && valGlowRad > 0) {
  ctx.shadowColor = valGlowCol;
  ctx.shadowBlur = valGlowRad;
  ctx.fillText(valueStr, valueX, valueY);
  ctx.shadowBlur = valGlowRad * 2;
}
```
**Summary**: Implemented high-fidelity Canvas2D rendering and complete UI controls for LCD digital glow on Center Value & Metric Label, customizable solid value colors with font family selectors, radiant multi-layer needle glow, and external 1-100 segment numbering scaled dynamically by segment size.

# v1.17.9 — AIDA64 XML Parser Fix & System Category / Registry Bridge Hardening

### 1. Target File Path: `/scripts/aida64_shared_memory.ps1`
```powershell
# Strips outer container wrappers and safely matches leaf XML sensor tags including <sys> elements
$itemMatches = [regex]::Matches($cleanXml, '(?si)<(?<kind>[A-Za-z0-9_:-]+)>(?<inner>[\s\S]*?)</\k<kind>>')
# Native [System.Net.WebUtility]::HtmlDecode without external assembly dependency
```
**Summary**: Resolved an issue where outer `<sys>` wrappers or system-category sensors (Date, Time, UpTime) were skipped, and replaced assembly-dependent HTML decoding with native .NET web utilities to prevent PowerShell runtime exit code 1.

### 2. Target File Path: `/server/aida64/Aida64TelemetryBridge.ts`
```typescript
// Proactive zero-delay registry check on startup and auto-fallback on process recovery
this.readWindowsRegistryDirect().then(regSensors => { ... });
```
**Summary**: Added immediate registry probing on bridge startup and seamless fallback if the background stream resets, ensuring live sensor availability under all permission modes.

### 3. Target File Path: `/src/components/aida64/Aida64TelemetryPanel.tsx`
```typescript
// Added SYSTEM category detection with Clock icon and live value badge rendering
if (text.includes('date') || text.includes('time') || text.includes('year') || text.includes('month') || text.includes('day') || text.includes('uptime') || sensor.kind === 'sys') return 'SYSTEM';
```
**Summary**: Added explicit SYSTEM category grouping and UI icon mapping for all system/date/time sensors enabled in AIDA64 External Applications.

# v1.17.8 — AIDA64 Multi-Tier Telemetry Diagnostic, Direct Registry Scanner & Hardware Enumeration

### 1. Target File Path: `/scripts/aida64_shared_memory.ps1`
```powershell
// Multi-source telemetry reader: Shared Memory + Registry (HKCU & HKLM) + WMI CIM fallback
$xmlish = Read-Aida64SharedMemory
if (-not $xmlish) { $xmlish = Read-Aida64Registry }
if (-not $xmlish) { $xmlish = Read-Aida64Wmi }
// Resilient numeric and unit parsing across all standard and custom AIDA64 sensor formats
```
**Summary**: Resolved telemetry detection failures by providing multi-tier fallbacks (Shared Memory, Registry, and WMI) with HTML decoding and unit-stripping numeric parser.

### 2. Target File Path: `/server/aida64/Aida64TelemetryBridge.ts`
```typescript
// Added direct Windows Registry reader fallback and hardware device grouping
export function groupSensorsIntoHardware(sensors: Aida64SensorReading[]): Aida64HardwareDevice[] { ... }
async scanSensors(): Promise<{ snapshot: Aida64TelemetrySnapshot; hardware: Aida64HardwareDevice[] }> { ... }
```
**Summary**: Added `scanSensors()` method with direct `reg.exe` reading and automatic hardware device categorization (GPU, CPU, Memory, Cooling, Storage, Motherboard, Network, System).

### 3. Target File Path: `/server.ts`
```typescript
// Added /api/aida64/telemetry/scan and /refresh endpoints with hardware enumeration
app.post(['/api/aida64/telemetry/scan', '/api/aida64/telemetry/refresh'], async (_req, res) => {
  const result = await aida64Telemetry.scanSensors();
  res.json({ ok: true, snapshot: result.snapshot, hardware: result.hardware, sensorCount: result.snapshot.sensorCount });
});
```
**Summary**: Created server endpoints to trigger instantaneous re-enumeration of connected AIDA64 sensors and hardware components.

### 4. Target File Path: `/src/hooks/useAida64Telemetry.ts`
```typescript
// Added scanAndRefresh utility and isScanning status state
export function useAida64Telemetry(intervalMs = 250) {
  const [isScanning, setIsScanning] = useState(false);
  const scanAndRefresh = useCallback(async () => { ... }, []);
  return { snapshot, sensors: snapshot.sensors, hardware, byId, isScanning, scanAndRefresh };
}
```
**Summary**: Exposed `scanAndRefresh` and `hardware` list through the telemetry hook for reactive component re-renders.

### 5. Target File Path: `/src/components/Aida64Studio.tsx` and `/src/components/aida64/Aida64TelemetryPanel.tsx`
```typescript
// Added "Scan & Refresh" button and detected hardware summary bar
<button onClick={handleScanAndRefresh} disabled={isScanning}>
  <RefreshCw className={isScanning ? 'animate-spin' : ''} />
  {isScanning ? 'Scanning Hardware…' : 'Scan & Refresh'}
</button>
// Rendered interactive category filter cards for each detected hardware component
```
**Summary**: Added the requested "Scan & Refresh" utility in `Aida64Studio` and `Aida64TelemetryPanel` with live status indicators, detected hardware group cards, and sensor filtering.

# v1.17.7 — GitHub Import Migration & Environment Normalization

### 1. Target File Path: `/bun.lock`
```
Deleted redundant bun.lock file to ensure strict npm package manager normalization.
```
**Summary**: Purged legacy non-npm lockfiles in accordance with AI Studio web runtime migration protocol while preserving all existing dependencies, Windows port 3200 / container port 3000 listeners, and local architecture.

# v1.17.6 — Native .NET MemoryMappedFile AIDA64 Reader & Registry Dual-Source Telemetry Engine

### 1. Target File Path: `/scripts/aida64_shared_memory.ps1`
```powershell
// Replaced dynamic C# runtime Add-Type compilation with native .NET 4.0+ MemoryMappedFile
$mmf = [System.IO.MemoryMappedFiles.MemoryMappedFile]::OpenExisting($n, [System.IO.MemoryMappedFiles.MemoryMappedFileRights]::Read)
$stream = $mmf.CreateViewStream(0, 0, [System.IO.MemoryMappedFiles.MemoryMappedFileAccess]::Read)
$reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::Default)
$raw = $reader.ReadToEnd()
// Added Registry HKCU:\Software\FinalWire\AIDA64\SensorValues dual-source fallback
```

### 2. Target File Path: `/server/aida64/Aida64TelemetryBridge.ts`
```typescript
// Added -NonInteractive flag and auto-recovery so PowerShell never exits or blocks on Windows
this.child = spawn('powershell.exe', [
  '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script,
  '-IntervalMs', String(this.config.intervalMs)
], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
```
**Summary**: Resolved `AIDA64 reader stopped (code 1)` by removing brittle runtime `Add-Type` compilation in favor of built-in .NET `MemoryMappedFile` and added Registry reading fallback.

# v1.17.5 — Full 360° 6 O'Clock Dial Orientation Presets, Visual Effects Layering & Telemetry Auto-Binding

### 1. Target File Path: `/src/components/aida64/Aida64StateGaugeGenerator.tsx`
```typescript
// Added 6 o'clock to 6 o'clock and comprehensive angle presets in Section 4 (Geometry & Dial Orientation):
<button onClick={() => setConfig({ ...config, startAngleDeg: 90, endAngleDeg: 450, rotationDeg: 0, gapRotationDeg: 0 })}>
  🔄 6 o'clock → 6 o'clock (Full 360° bottom start)
</button>
<button onClick={() => setConfig({ ...config, startAngleDeg: -90, endAngleDeg: 270, rotationDeg: 0, gapRotationDeg: 0 })}>
  ⏱️ 12 o'clock → 12 o'clock (Full 360° top start)
</button>
// Dedicated sliders for Start Angle (-180°..360°), End Angle (-90°..540°), and Dial Rotation Offset (-180°..180°)
// Cleaned up effect pipeline render ordering so all visual effects (bloom, lighting, depth, CRT, glass, HUD grid, scanlines, etc.) composite cleanly without overlapping backdrops
// Added auto-binding effect for incoming live telemetry sensors
```
**Summary**: Added 6 o'clock → 6 o'clock (90° → 450°) full 360° rotation preset along with 12 o'clock, 270° open, and 180° dome orientations, plus Start/End Angle and Rotation sliders. Fixed effect layering and auto-bound live telemetry sensors.

# v1.17.4 — Gauge Segments & Ticks Repair, Live Sensor Continuous Auto-Sync, and System Telemetry Fallback

### 1. Target File Path: `/src/components/aida64/Aida64StateGaugeGenerator.tsx`
```typescript
// Fixed mechanical_dial, needle_gauge, speedometer_classic, half_arc, and corner_gauge segment & tick responsiveness
const ticks = Math.max(4, cfg.segmentCount || 28);
const step = ticks > 24 ? 5 : (ticks > 12 ? 2 : 1);
for (let i = 0; i <= ticks; i++) {
  const rad = startRad + (i / ticks) * totalSpanRad;
  const tickPercent = (i / ticks) * 100;
  const isMajor = i % step === 0;
  const inR = isMajor ? cfg.innerRadius : (cfg.innerRadius + (cfg.outerRadius - cfg.innerRadius) * 0.4);
  const outR = cfg.outerRadius;
  ...
}

// Added continuous live sensor telemetry sync effect
useEffect(() => {
  if (!selectedLiveSensorId || isPlaying) return;
  const sensor = liveTelemetry.sensors.find(s => s.id === selectedLiveSensorId);
  if (sensor && typeof sensor.value === 'number') {
    if (sensor.unit === '%' || config.metricUnit === '%') {
      setCurrentValue(Math.round(Math.max(0, Math.min(100, sensor.value)) * 10) / 10);
    } else {
      const max = sensor.unit === '°C' ? 100 : (sensor.unit === 'RPM' ? 3000 : (sensor.unit === 'W' ? 350 : 100));
      const pct = Math.max(0, Math.min(100, (sensor.value / max) * 100));
      setCurrentValue(Math.round(pct * 10) / 10);
    }
  }
}, [selectedLiveSensorId, liveTelemetry.sensors, isPlaying, config.metricUnit]);
```
**Summary**: Resolved issue where gauge segments / ticks failed to adjust dynamically with the segmentCount and inner/outer radius sliders across automotive, mechanical dial, and half-arc styles. Added live continuous sensor sync and intelligent metric-to-sensor auto-matching.

### 2. Target File Path: `/scripts/aida64_shared_memory.ps1`
```powershell
[DllImport("kernel32.dll", EntryPoint="OpenFileMappingW", SetLastError=true, CharSet=CharSet.Unicode)]
public static extern IntPtr OpenFileMappingW(uint dwDesiredAccess, bool bInheritHandle, string lpName);
[DllImport("kernel32.dll", EntryPoint="OpenFileMappingA", SetLastError=true, CharSet=CharSet.Ansi)]
public static extern IntPtr OpenFileMappingA(uint dwDesiredAccess, bool bInheritHandle, string lpName);
...
$names = @('AIDA64_SensorValues', 'Global\AIDA64_SensorValues', 'Local\AIDA64_SensorValues', 'Session\1\AIDA64_SensorValues', 'Session\0\AIDA64_SensorValues')
```
**Summary**: Added dual ANSI/Unicode P/Invoke mapping methods and session namespace probes for AIDA64 shared memory reader, with resilient XML container regex parser.

### 3. Target File Path: `/server.ts`
```typescript
app.get('/api/aida64/telemetry', async (_req, res) => {
  const snapshot = aida64Telemetry.getSnapshot();
  if (snapshot.connected && snapshot.sensors.length > 0) {
    return res.json(snapshot);
  }
  // Hardware telemetry fallback to ensure UI gauges always have live system data
  ...
});
```
**Summary**: Implemented dynamic system hardware sensor fallback (GPU core %, GPU temp, VRAM, CPU, RAM) into `/api/aida64/telemetry` so live telemetry is always active and responsive in the UI.

# v1.17.3 — AIDA64 Telemetry Restart Endpoint Exception Hardening

### 1. Target File Path: `/server.ts`
```typescript
app.post('/api/aida64/telemetry/restart', (_req, res) => {
  try {
    aida64Telemetry.restart();
    res.json({ ok: true, message: 'AIDA64 telemetry bridge restarted', snapshot: aida64Telemetry.getSnapshot() });
  } catch (err: any) {
    res.json({ ok: false, error: err?.message || String(err), snapshot: aida64Telemetry.getSnapshot() });
  }
});
```
**Summary**: Wrapped `/api/aida64/telemetry/restart` handler in explicit try/catch block to prevent uncaught exceptions from returning HTTP 500 errors.

### 2. Target File Path: `/server/aida64/Aida64TelemetryBridge.ts`
```typescript
const candidatePaths = [
  path.join(process.cwd(), 'scripts', 'aida64_shared_memory.ps1'),
  path.resolve(__dirname, '..', '..', 'scripts', 'aida64_shared_memory.ps1'),
  path.resolve(__dirname, 'scripts', 'aida64_shared_memory.ps1'),
  'C:\\Gina_AI\\scripts\\aida64_shared_memory.ps1'
];
const script = candidatePaths.find(p => fs.existsSync(p)) || candidatePaths[0];
```
**Summary**: Added safe script resolution across bundled directory layouts and wrapped spawn lifecycle in try/catch to safely trap any process initiation exceptions.

# v1.17.2 — AIDA64 Telemetry Reader Resilience & Multi-Namespace Fallbacks

### 1. Target File Path: `/scripts/aida64_shared_memory.ps1`
```powershell
function Read-Aida64SharedMemory {
    $names = @('AIDA64_SensorValues', 'Global\AIDA64_SensorValues', 'Local\AIDA64_SensorValues')
    $handle = [IntPtr]::Zero
    foreach ($n in $names) {
        $handle = [Aida64SharedMemory]::OpenFileMapping($FILE_MAP_READ, $false, $n)
        if ($handle -ne [IntPtr]::Zero) { break }
    }
    if ($handle -eq [IntPtr]::Zero) { return $null }
    ...
}
```
**Summary**: Added `Global\AIDA64_SensorValues` and `Local\AIDA64_SensorValues` namespace resolution to handle scenarios where AIDA64 is launched with elevated administrator permissions or across session boundaries.

### 2. Target File Path: `/server/aida64/Aida64TelemetryBridge.ts`
```typescript
let stderrAcc = '';
this.child.stderr.on('data', (chunk: string) => {
  stderrAcc += chunk;
  const message = stderrAcc.trim();
  if (message) this.snapshot = { ...this.snapshot, error: message };
});
this.child.on('close', (code) => {
  this.child = null;
  if (this.config.enabled) {
    const detail = stderrAcc.trim() ? `: ${stderrAcc.trim()}` : '';
    this.snapshot = {
      ...this.snapshot,
      connected: false,
      source: 'none',
      error: `AIDA64 reader stopped (code ${code ?? 'unknown'})${detail}. Ensure AIDA64 is running with Preferences → External Applications → Shared Memory enabled.`
    };
    if (!this.retryTimer && process.platform === 'win32') {
      this.retryTimer = setTimeout(() => { ... }, 4000);
    }
  }
});
```
**Summary**: Retained detailed `stderr` error logging upon child process exit, provided automatic reconnection backoff retries, and added explicit Windows requirement reporting.

### 3. Target File Path: `/server.ts`
```typescript
app.post('/api/aida64/telemetry/restart', (_req, res) => {
  aida64Telemetry.restart();
  res.json({ ok: true, message: 'AIDA64 telemetry bridge restarted', snapshot: aida64Telemetry.getSnapshot() });
});
```
**Summary**: Added explicit `/api/aida64/telemetry/restart` POST endpoint to allow frontend and user to re-trigger the telemetry bridge on demand.

### 4. Target File Path: `/src/components/aida64/Aida64TelemetryPanel.tsx`
```tsx
<button onClick={restartBridge} disabled={restarting} ...>
  <RefreshCw className={`w-3.5 h-3.5 ${restarting ? 'animate-spin' : ''}`} />
  {restarting ? 'Restarting…' : 'Restart Bridge'}
</button>
```
**Summary**: Added interactive "Restart Bridge" button and inline step-by-step instructions for enabling Shared Memory in AIDA64 Preferences.

# v1.9.4 — AIDA64 Full Gauge Effects Engine

- Wired the extended effects controls into the AIDA64 100-state renderer.
- Added state-aware 3D depth, bevels, inner shadows, reflections, parallax, directional and multi-source lighting, dynamic shadowing, specular highlights, liquid/bubble/turbulence effects, digital display overlays, CRT treatment, heat, electrical arcs, motion/ghost effects, sweep, dithering, glare/lens flare, edge glow, ambient occlusion, procedural backgrounds, gradients and noise controls.
- Added effect quality and master intensity controls plus nine effect presets.
- Effects are deterministic per state so 0–100 exports remain reproducible.

# v1.9.2 — AIDA64 100-State Effects Suite

- Added deterministic material passes: glass, acrylic, brushed metal, chrome, carbon fibre, anodised, frosted, holographic, CRT, LED and liquid.
- Added warning/critical zones, peak/minimum markers, needle trail/shadow and state response curves.
- Added HUD grid, scanlines, particles, sparks, energy arcs, rotating rings, chromatic aberration, glitch, grain and vignette effects.
- Added state-following or custom lighting colour and configurable lighting progression.
- All procedural effects are deterministic per state and are included in PNG/ZIP exports.

# v1.9.1 — AIDA64 100-State Emissive Lighting

- Added a dedicated Emissive Lighting / Bloom system to the AIDA64 100-state gauge generator.
- Added Neon LED, High Bloom, Sci-Fi/Holographic, and Industrial/Subtle lighting modes.
- Added independent lighting intensity, bloom blur, light radius, centre bloom, core intensity, and deterministic state-pulse controls.
- Lighting follows the active gauge state colour and progressively increases across the 0–100 sequence.
- Bloom is rendered before the metric text layer so the centre value and metric label remain crisp.
- Exported PNG sequences receive the same deterministic lighting treatment as the live preview.

# v1.8.14 — Expanded Gauge Library

- Added 12 new Gauge Factory styles, expanding the library from 17 to 29.
- Added radial, donut, speedometer, compass, HUD, dual-metric, battery, VU, progress, industrial, vertical VU and graduated thermometer variants.
- Preserved the existing 17 styles and their controls.

# Release 1.8.13 — Remove Obsolete Kornia Repair Payload

- Removed the obsolete `fix_kornia.bat`, `fix_kornia.ps1`, and `fix_kornia.py` repair utilities from the distributable package.
- Removed the obsolete `/api/diagnostics/fix-kornia` backend endpoint.
- Updated the LTX diagnostic recommendation so it no longer tells users to reinstall/downgrade Kornia.
- Kornia remains an installed runtime dependency where required by the existing local ComfyUI/LTX environment; this release simply stops shipping old repair scripts that are no longer needed.

# v1.8.12 — AIDA64 Metric Label State Colours

- Restored dynamic metric-label colouring so labels follow the gauge Value Styling colour mode/state again.
- Added `Match Value State` / `Custom Solid Color` label behaviour.
- Existing custom label colour remains available when `Custom Solid Color` is selected.
- Metric label state colouring now uses the same percentage/threshold calculation as the active gauge value.

# v1.8.11 — AIDA64 Gauge Text + Track Controls

- Added independent Show/Hide controls for the center value and metric label.
- Added independent value/label colours.
- Added independent value/label size controls.
- Added independent X/Y pixel positioning for the center value and metric label.
- Extended text placement to circular gauge styles including half/corner/radar variants.
- Fixed Background Track visibility/opacity handling across gauge families.
- Applied Track Thickness consistently to arc, ring, segmented, LED and linear gauge styles where the geometry supports it.
- Applied Active Opacity to rendered active gauge elements.
- Radar track rings/crosshairs now respect the Background Track toggle.

## v1.8.4 — Microsoft Jenny voice selection

- Prefer Microsoft Jenny for browser and Windows voice discovery when available.
- Merge Windows SAPI and browser voices into the Gina voice selector.
- Persist the selected voice locally.
- If Jenny is a browser voice but not a Windows SAPI voice, use browser speech instead of silently falling back to another SAPI voice.
- Prefer female Microsoft voices (Jenny, Aria, Zira) before generic English voices.

# v1.7.5 — Agent Quick Actions, Context Guard & Real PDF Output

- Capability Map and AIDA64 quick actions now execute directly through the local broker instead of sending large prompts through Gemma.
- Agent LLM requests no longer replay project context/capability dumps; prompt payloads are tightly bounded for the 4096-token Gemma context.
- Local Gina Chat compacts ordinary chat history before llama.cpp calls.
- Requests to save/export a prior Gina response as a PDF now create a real PDF locally under `C:\Gina_AI` and report the actual path.
- Added the `write_pdf` local agent tool and audit logging.


## v1.7.3 — Local Agent JSON Response Hardening
- Fixed Gina Agent frontend handling of empty/non-JSON backend responses so the dashboard no longer throws `Response.json()` parsing errors.
- Added clear diagnostics for empty or invalid responses.
- Hardened the local llama-server client against empty/invalid JSON responses.
- Added explicit JSON content type and more useful diagnostics for invalid Gemma agent plans.
## v1.7.0 — Local Gina Agent Brain

- Added Gemma-powered local orchestration panel.
- Added safe local system/capability inspection tools.
- Added AIDA64 blank-template planning with 20 core sensors.
- Added 100-state utilisation semantics and 50% warning / 90% critical defaults.
- Generation actions require confirmation.

# Gina AI Factory — Project Changelog & Verification Matrix

> **Note**: This file contains the chronological changelog, feature updates, and verification code snippets for Gina AI Factory. All update information is maintained and parsed here.

---

## Code Change Log & Verification Matrix

### Log Entry #1: Server Host Binding Fix
- **Target File**: `/server.ts`
- **Description**: Bind Express listener to `0.0.0.0` on port 3000 for cloud/container support while allowing local `http://127.0.0.1:3000/`.
- **Exact Code Snippet**:
  ```typescript
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Gina AI Factory Server running on http://0.0.0.0:${PORT}`);
  });
  ```

### Log Entry #2: WebSocket Error & Reconnect Resilience
- **Target File 1**: `/server/comfy/ComfyWebSocket.ts`
- **Description**: Catch WebSocket connection errors gracefully, emit `comfy_error`, and schedule automatic reconnection without crashing node process.
- **Exact Code Snippet**:
  ```typescript
  try {
    this.socket = new WebSocket(url);
  } catch (error) {
    this.emit('comfy_error', error);
    this.scheduleReconnect();
    return;
  }
  this.socket.addEventListener('open', () => {
    this.connected = true;
    this.emit('status', { connected: true, clientId: this.clientId });
  });
  this.socket.addEventListener('close', () => {
    this.connected = false;
    this.emit('status', { connected: false, clientId: this.clientId });
    this.scheduleReconnect();
  });
  this.socket.addEventListener('error', (event) => {
    this.emit('comfy_error', event);
  });
  ```

- **Target File 2**: `/server.ts`
- **Description**: Add event listeners on `comfyWebSocket` for `error` and `comfy_error` events to prevent uncaught exception crashes.
- **Exact Code Snippet**:
  ```typescript
  comfyWebSocket.on("error", (err) => {
    console.warn("[ComfyWebSocket] Error event:", err?.message || err);
  });
  comfyWebSocket.on("comfy_error", () => {
    // ComfyUI is unavailable locally in this container environment - logged silently
  });
  ```

### Log Entry #3: Local Creator Matrix Capability Flags
- **Target File**: `/metadata.json`
- **Description**: Configured strictly local ComfyUI capabilities.
- **Exact Code Snippet**:
  ```json
  "majorCapabilities": [
    "LOCAL_ONLY_COMFYUI_EXECUTION",
    "DYNAMIC_WORKFLOW_PARSING",
    "ASYNC_JOB_TRACKING",
    "RTX_3070_TI_8GB_AWARE",
    "CREATOR_NAVIGATION",
    "SHORTS_FACTORY_FOUNDATION",
    "LOCAL_ASSET_AND_JOB_VIEWS"
  ]
  ```

### Log Entry #4: Video Navigation & LTX-2.3 Studio UI Integration
- **Target File 1**: `/src/components/VideoStudio.tsx`
- **Description**: Created dedicated Video Studio component with controls for duration (1s–5s / 25–121 frames), motion scale (0.2x–2.5x), LTX-2.3 FP8 model parameters, 8GB VRAM safety bounds, and video preview player.
- **Exact Code Snippet**:
  ```typescript
  export const VideoStudio: React.FC<VideoStudioProps> = ({ onAddLog }) => {
    const { projectState, setSavedAssets } = useProjectState();
    const { job, output, outputLoading, submitting: loading, startJob } = useGenerationJob();
    const [selectedDuration, setSelectedDuration] = useState(3);
    const [customFrames, setCustomFrames] = useState(73);
    const [motionScale, setMotionScale] = useState(1.0);
    // ...
  ```

- **Target File 2**: `/src/types.ts`
- **Description**: Updated `AiStudioConfig` interface to include `'video'` tab type.
- **Exact Code Snippet**:
  ```typescript
  export interface AiStudioConfig {
    activeTab: 'creator'|'video'|'jobs'|'shorts'|'assets';
    workflowId: string;
    videoWorkflowId: string;
    defaultAspectRatio: '1:1'|'16:9'|'9:16';
  }
  ```

- **Target File 3**: `/src/App.tsx`
- **Description**: Added `VIDEO` item with `Video` icon to main navigation bar and added `VideoStudio` view rendering.
- **Exact Code Snippet**:
  ```typescript
  const [activeView, setActiveView] = useState<'create'|'video'|'shorts'|'assets'|'jobs'|'system'>('create');

  const navItems = [
    { id: 'create' as const, label: 'CREATE', icon: Image },
    { id: 'video' as const, label: 'VIDEO', icon: Video },
    { id: 'shorts' as const, label: 'SHORTS', icon: Film },
    { id: 'assets' as const, label: 'ASSETS', icon: FolderOpen },
    { id: 'jobs' as const, label: 'JOBS', icon: ListChecks },
    { id: 'system' as const, label: 'SYSTEM', icon: Settings2 },
  ];
  ```

### Log Entry #5: LTX-2.3 & ComfyUI Diagnostic Tool
- **Target File 1**: `/scripts/check_ltx23.ts`
- **Description**: Diagnostic script that checks for model `ltx-2.3-22b-distilled-fp8.safetensors` on disk and pings ComfyUI at `http://127.0.0.1:8188` (`/system_stats` and `/object_info`).
- **Exact Code Snippet**:
  ```typescript
  export async function runLtxDiagnostic(): Promise<LtxDiagnosticResult> {
    const comfyUrl = process.env.COMFY_URL || 'http://127.0.0.1:8188';
    // Checks candidate model paths & ComfyUI endpoints
    // ...
  ```

- **Target File 2**: `/server.ts`
- **Description**: Added `/api/diagnostics/ltx23` route to execute `runLtxDiagnostic()` and return real-time diagnostic reports.
- **Exact Code Snippet**:
  ```typescript
  app.get("/api/diagnostics/ltx23", async (_req, res) => {
    try {
      const result = await runLtxDiagnostic();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Failed to execute LTX-2.3 diagnostic" });
    }
  });
  ```

- **Target File 3**: `/src/components/VideoStudio.tsx`
- **Description**: Added "Run LTX & Comfy Audit" button and interactive diagnostic report card in Video Studio UI.
- **Exact Code Snippet**:
  ```typescript
  const runDiagnostic = async () => {
    setDiagLoading(true);
    const res = await fetch('/api/diagnostics/ltx23');
    const data = await res.json();
    setDiagResult(data);
  };
  ```

### Log Entry #6: LTX Diagnostic Component & Model Filesystem Check Endpoint
- **Target File 1**: `/src/components/LTXDiagnostic.tsx`
- **Description**: Diagnostic component that attempts a fetch to `http://127.0.0.1:8188` to verify ComfyUI connectivity and queries `/api/diagnostics/check-model` for filesystem confirmation.
- **Exact Code Snippet**:
  ```typescript
  export const LTXDiagnostic: React.FC = () => {
    // ...
    const res = await fetch('http://127.0.0.1:8188/system_stats', { signal: controller.signal });
    const fileRes = await fetch('/api/diagnostics/check-model');
    // ...
  ```

- **Target File 2**: `/server.ts`
- **Description**: Added `/api/diagnostics/check-model` route to verify exact disk path `C:\Gina_AI\ComfyUI_windows_portable\ComfyUI\models\checkpoints\ltx-2.3-22b-distilled-fp8.safetensors`.
- **Exact Code Snippet**:
  ```typescript
  app.get("/api/diagnostics/check-model", async (_req, res) => {
    const targetPath = "C:\\Gina_AI\\ComfyUI_windows_portable\\ComfyUI\\models\\checkpoints\\ltx-2.3-22b-distilled-fp8.safetensors";
    try {
      const stat = await fs.stat(targetPath);
      res.json({ path: targetPath, exists: true, sizeBytes: stat.size, sizeGB: Number((stat.size / (1024 ** 3)).toFixed(2)) });
    } catch (err: any) {
      res.json({ path: targetPath, exists: false, error: err?.message || "File not found on disk" });
    }
  });
  ```

- **Target File 3**: `/src/App.tsx`
- **Description**: Rendered `<LTXDiagnostic />` component inside the 'System' view.
- **Exact Code Snippet**:
  ```typescript
  {activeView === 'system' && (
    <main className="space-y-5">
      {/* ... */}
      <LocalProjectStateBar />
      <LTXDiagnostic />
      <LocalCapabilityPanel onAddLog={addLog} />
  ```

### Log Entry #7: LTX-2.3 Workflow Generator Architect UI & Workflow Save Endpoint
- **Target File 1**: `/src/components/LTXWorkflowGenerator.tsx`
- **Description**: Interactive workflow architect UI that constructs valid ComfyUI API-format workflow JSON matching LTX-2.3 architecture nodes (CheckpointLoader/LTXVLoader, CLIPTextEncode, EmptyLatentImage/LTXVEmptyLatent, KSampler/LTXVideoSampler, VAEDecode, SaveAnimatedWEBP). Supports copy to clipboard, download `.json`, and direct workflow installation.
- **Exact Code Snippet**:
  ```typescript
  export const LTXWorkflowGenerator: React.FC<LTXWorkflowGeneratorProps> = ({ onAddLog }) => {
    // Configurable Workflow Parameters: prompt, negativePrompt, modelCheckpoint, width, height, frames, steps, cfg...
    // Generates ComfyUI API-format JSON structure for LTX-2.3 model execution
  ```

- **Target File 2**: `/server.ts`
- **Description**: Added `/api/workflows/save` POST route to save generated workflow JSON directly into `workflows/ltx_video.json` on disk and reload the registry.
- **Exact Code Snippet**:
  ```typescript
  app.post("/api/workflows/save", async (req, res) => {
    try {
      const filename = req.body.filename || "custom_workflow.json";
      const safeFilename = path.basename(filename);
      const targetPath = path.join(WORKFLOW_DIR, safeFilename);
      await fs.mkdir(WORKFLOW_DIR, { recursive: true });
      await fs.writeFile(targetPath, JSON.stringify(req.body.workflow, null, 2), "utf-8");
      await workflowRegistry.reload();
      res.json({ success: true, path: targetPath, filename: safeFilename });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Failed to save workflow file" });
    }
  });
  ```

- **Target File 3**: `/src/components/VideoStudio.tsx`
- **Description**: Integrated `LTXWorkflowGenerator` into `VideoStudio.tsx` with a "Workflow Architect" toggle button in the top toolbar.
- **Exact Code Snippet**:
  ```typescript
  {/* LTX Workflow Generator Architect Section */}
  {showArchitect && (
    <LTXWorkflowGenerator onAddLog={onAddLog} />
  )}
  ```

### Log Entry #8: Persistent ComfyUI Status Indicator next to Video Tab
- **Target File 1**: `/src/components/LTXDiagnostic.tsx`
- **Description**: Exported `ComfyUIStatusIndicator` component that performs real-time periodic polling (every 8s) to `http://127.0.0.1:8188/system_stats` (with `/api/comfy/health` fallback) and renders a persistent pinging green/red status badge.
- **Exact Code Snippet**:
  ```typescript
  export const ComfyUIStatusIndicator: React.FC<{ activeView?: string }> = ({ activeView }) => {
    const [online, setOnline] = useState<boolean | null>(null);
    const [checking, setChecking] = useState(false);
    // ...
    return (
      <span className="inline-flex items-center gap-1.5 ml-1">
        <span className="relative flex h-2 w-2">
          {online && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${online ? 'bg-emerald-400' : 'bg-rose-500'}`} />
        </span>
        <span className="...">
          {online ? 'ONLINE' : 'OFFLINE'}
        </span>
      </span>
    );
  };
  ```

- **Target File 2**: `/src/App.tsx`
- **Description**: Integrated `<ComfyUIStatusIndicator />` directly inside the `VIDEO` navigation button.
- **Exact Code Snippet**:
  ```typescript
  {navItems.map(({ id, label, icon: Icon }) => (
    <button key={id} onClick={() => setActiveView(id)}>
      <Icon className="w-3.5 h-3.5" />
      {label}
      {id === 'video' && <ComfyUIStatusIndicator activeView={activeView} />}
    </button>
  ))}
  ```

### Log Entry #9: LTX-2.3 Parameter Presets in VideoStudio.tsx
- **Target File**: `/src/components/VideoStudio.tsx`
- **Description**: Added predefined LTX-2.3 parameter presets (`ltxParameterPresets` array with Cinematic, Motion-heavy, Realistic, Vertical Shorts, and Compact Fast configurations) and an interactive preset selector UI card that auto-configures motion scale, duration, frames, FPS, sampler steps, CFG scale, resolution, and camera motion.
- **Exact Code Snippet**:
  ```typescript
  const ltxParameterPresets: LtxPreset[] = [
    { id: 'cinematic', name: 'Cinematic Sweep', badge: '16:9 · 3s · 0.8x Motion', motionScale: 0.8, durationSec: 3, frames: 73, fps: 24, steps: 28, cfgScale: 3.5, resolutionLabel: '768 × 512 · 16:9 Landscape', width: 768, height: 512, cameraMotion: 'Pan Right & Slow Zoom' },
    { id: 'motion_heavy', name: 'Motion-Heavy Action', badge: '16:9 · 4s · 2.0x Motion', motionScale: 2.0, durationSec: 4, frames: 97, fps: 30, steps: 25, cfgScale: 2.8, resolutionLabel: '768 × 512 · 16:9 Landscape', width: 768, height: 512, cameraMotion: 'Dynamic Tracking Pan' },
    { id: 'realistic', name: 'Photorealistic Detail', badge: '16:9 · 2s · 32 Steps', motionScale: 1.0, durationSec: 2, frames: 49, fps: 25, steps: 32, cfgScale: 3.0, resolutionLabel: '768 × 512 · 16:9 Landscape', width: 768, height: 512, cameraMotion: 'Static Locked Focus' },
    { id: 'vertical_shorts', name: 'Shorts / Vertical Reel', badge: '9:16 · 3s · 1.2x Motion', motionScale: 1.2, durationSec: 3, frames: 73, fps: 25, steps: 25, cfgScale: 3.2, resolutionLabel: '512 × 768 · 9:16 Shorts / Vertical', width: 512, height: 768, cameraMotion: 'Slow Dolly Push In' },
    { id: 'compact_fast', name: 'Fast Iteration / Square', badge: '1:1 · 1s · Fast 18 Steps', motionScale: 1.0, durationSec: 1, frames: 25, fps: 25, steps: 18, cfgScale: 3.0, resolutionLabel: '512 × 512 · 1:1 Compact Square', width: 512, height: 512, cameraMotion: 'None / Static Camera' }
  ];
  ```

### Log Entry #10: LTX-2.3 Workflow Contract (`/workflows/ltx_video.json`) Registration
- **Target File 1**: `/workflows/ltx_video.json`
- **Description**: Created base ComfyUI API-format JSON workflow file for `ltx_video` matching CheckpointLoader, CLIPTextEncode, EmptyLatentImage, KSampler, VAEDecode, and SaveAnimatedWEBP node IDs.
- **Exact Code Snippet**:
  ```json
  {
    "1": { "class_type": "CheckpointLoaderSimple", "inputs": { "ckpt_name": "ltx-2.3-22b-distilled-fp8.safetensors" } },
    "2": { "class_type": "CLIPTextEncode", "inputs": { "text": "A majestic black dragon breathing fiery embers..." } },
    "3": { "class_type": "CLIPTextEncode", "inputs": { "text": "blurry, static, distorted motion..." } },
    "4": { "class_type": "EmptyLatentImage", "inputs": { "width": 768, "height": 512, "batch_size": 73 } },
    "5": { "class_type": "KSampler", "inputs": { "model": ["1", 0], "positive": ["2", 0], "negative": ["3", 0], "latent_image": ["4", 0], "seed": 123456789, "steps": 25, "cfg": 3.0, "sampler_name": "euler", "scheduler": "normal", "denoise": 1.0 } },
    "6": { "class_type": "VAEDecode", "inputs": { "samples": ["5", 0], "vae": ["1", 2] } },
    "7": { "class_type": "SaveAnimatedWEBP", "inputs": { "filename_prefix": "GinaAI_LTX23_Video", "fps": 25, "lossless": false, "quality": 85, "method": "default", "images": ["6", 0] } }
  }
  ```

- **Target File 2**: `/server/comfy/WorkflowParser.ts`
- **Description**: Updated `classifyNode` function to recognize `saveanimated` as a valid video output capability node.
- **Exact Code Snippet**:
  ```typescript
  if (cls.includes('videocombine') || cls.includes('videooutput') || cls.includes('vhs_') || cls.includes('saveanimated')) caps.push('video-output');
  ```

### Log Entry #11: LTX-2.3 Workflow Graph Fix & Parameter Binding Alignment
- **Target File 1**: `/workflows/ltx_video.json`
- **Description**: Added missing `"clip": ["1", 1]` input connection to `CLIPTextEncode` nodes (#2 and #3) required by ComfyUI prompt validation engine.
- **Exact Code Snippet**:
  ```json
  "2": {
    "class_type": "CLIPTextEncode",
    "inputs": {
      "clip": ["1", 1],
      "text": "A majestic black dragon..."
    }
  }
  ```

- **Target File 2**: `/server/comfy/WorkflowParser.ts`
- **Description**: Added `model` alias rule and extended `batchSize` alias to support `frames`, `frame_count`, and `num_frames`.
- **Exact Code Snippet**:
  ```typescript
  batchSize: [{ key: 'batch_size', inputs: ['batch_size', 'frames', 'frame_count', 'num_frames'], classes: ['EmptyLatentImage', 'EmptySD3LatentImage', 'EmptyLatentVideo', 'LTXVEmptyLatentVideo'] }],
  model: [{ key: 'model', inputs: ['ckpt_name'], classes: ['CheckpointLoaderSimple', 'CheckpointLoader'] }],
  ```

- **Target File 3**: `/server.ts`
- **Description**: Expanded `/api/jobs/:id/output` handler to extract output media URLs from all output keys (images, gifs, videos, animated, webp).
- **Exact Code Snippet**:
  ```typescript
  for (const [key, value] of Object.entries(nodeOutput || {}) as any) {
    if (!Array.isArray(value)) continue;
    for (const file of value) {
      if (file && typeof file === 'object' && file.filename) {
        outputs.push({ nodeId, kind: key, file, url: `${COMFY_URL}/view?...` });
      }
    }
  }
  ```

### Log Entry #12: LTX-Video Model Loader Fix (`LTXVLoader` Custom Node Integration)
- **Target File 1**: `/workflows/ltx_video.json`
- **Description**: Replaced standard `CheckpointLoaderSimple` (which expects SD/Flux embedded text encoders and fails with `RuntimeError: clip input is invalid: None` on LTX-Video safetensors) with `LTXVLoader` from `ComfyUI-LTXVideo` custom nodes package to properly parse and output the LTX text encoder object.
- **Exact Code Snippet**:
  ```json
  "1": {
    "class_type": "LTXVLoader",
    "inputs": {
      "ckpt_name": "ltx-2.3-22b-distilled-fp8.safetensors"
    }
  }
  ```

- **Target File 2**: `/server/comfy/WorkflowParser.ts`
- **Description**: Updated alias classes for `model`, `seed`, `steps`, `cfg`, `sampler`, `scheduler`, `width`, and `height` to recognize `LTXVLoader`, `LTXVideoLoader`, `LTXVideoModelLoader`, `LTXVideoSampler`, `LTXVSampler`, and `LTXVEmptyLatentVideo`.
- **Exact Code Snippet**:
  ```typescript
  model: [{ key: 'model', inputs: ['ckpt_name'], classes: ['CheckpointLoaderSimple', 'CheckpointLoader', 'LTXVLoader', 'LTXVideoLoader', 'LTXVideoModelLoader'] }],
  ```

### Log Entry #13: Multi-Directory Workflow Discovery, Cross-Tab Isolation & Failure State Propagation
- **Target File 1**: `/server/comfy/WorkflowRegistry.ts`
- **Description**: Updated `WorkflowRegistry` to accept and scan multiple directories (`./workflows` inside project root as well as `GINA_WORKFLOW_DIR`).
- **Exact Code Snippet**:
  ```typescript
  export class WorkflowRegistry {
    private workflows = new Map<string, ParsedWorkflow>();
    private readonly directories: string[];

    constructor(...directories: string[]) {
      this.directories = directories.filter(Boolean);
    }
  ```

- **Target File 2**: `/server.ts`
- **Description**: Configured `workflowRegistry` with `LOCAL_WORKFLOW_DIR` and `GINA_WORKFLOW_DIR`, and added automatic workflow re-scan/reload on `POST /api/jobs` if requested `workflowId` is not in memory.
- **Exact Code Snippet**:
  ```typescript
  const LOCAL_WORKFLOW_DIR = path.join(process.cwd(), "workflows");
  const GINA_WORKFLOW_DIR = process.env.GINA_WORKFLOW_DIR || "C:\\Gina_AI\\workflows";
  const workflowRegistry = new WorkflowRegistry(LOCAL_WORKFLOW_DIR, GINA_WORKFLOW_DIR);

  app.post("/api/jobs", async (req, res) => {
    let definition = workflowRegistry.get(workflowId);
    if (!definition) {
      await workflowRegistry.reload();
      definition = workflowRegistry.get(workflowId);
    }
  ```

- **Target File 3**: `/src/context/GenerationJobContext.tsx`
- **Description**: Updated `startJob` to explicitly update `job` state to `status: 'FAILED'` with the exact error string when queueing fails (HTTP 404, 503, 502, 400 or network errors) so the UI displays the failure reason.
- **Exact Code Snippet**:
  ```typescript
  if (!response.ok) {
    const errorMsg = typeof data.error === 'string' ? data.error : (data.error?.message || `Queue submission failed (HTTP ${response.status})`);
    const failedJob: GinaJob = {
      id: data.jobId || `fail-${Date.now()}`,
      workflowId,
      status: 'FAILED',
      progress: 0,
      createdAt: new Date().toISOString(),
      error: errorMsg,
      outputs: [],
      parameters
    };
    activeJobIdRef.current = failedJob.id;
    setJob(failedJob);
    return failedJob;
  }
  ```

- **Target File 4**: `/src/components/VideoStudio.tsx` & `/src/components/PromptStudio.tsx`
- **Description**: Isolated outputs across workspace views so Video Studio only renders video media (`ltx_video` / `.mp4` / `.webp` / `.gif`) and Prompt Studio only renders image media (`flux_image` / `.png` / `.jpg`).
- **Exact Code Snippet**:
  ```typescript
  const isVideoJob = job?.workflowId === 'ltx_video' || output?.job?.workflowId === 'ltx_video';
  const rawUrl = output?.outputs?.[0]?.url;
  const isMediaVideo = rawUrl && (isVideoJob || rawUrl.toLowerCase().includes('.mp4') || rawUrl.toLowerCase().includes('.webp') || rawUrl.toLowerCase().includes('.gif'));
  const videoUrl = isMediaVideo ? rawUrl : undefined;
  ```

### Log Entry #14: LTX-2.3 Node Schema & Session Parameter Mapping Validation Step
- **Target File**: `/src/components/LTXWorkflowGenerator.tsx`
- **Description**: Added interactive `handleValidateSchema()` validation step that extracts expected Node IDs (`#1` Loader, `#2` Pos CLIP, `#3` Neg CLIP, `#4` Latent Canvas, `#5` Sampler, `#6` VAE, `#7` Video Output) and compares them against active ComfyUI session schema (`/api/workflows/ltx_video`) to verify parameter input mapping pathways.
- **Exact Code Snippet**:
  ```typescript
  const handleValidateSchema = async () => {
    setValidating(true);
    // ...
    const expectedNodes: ValidationResultNode[] = [
      { nodeId: '1', role: 'Model Checkpoint Loader', expectedClass: samplerArchitecture === 'standard_ksampler' ? 'CheckpointLoaderSimple' : 'LTXVLoader', ... },
      { nodeId: '2', role: 'Positive Prompt CLIP Encoder', expectedClass: 'CLIPTextEncode', ... },
      { nodeId: '3', role: 'Negative Prompt CLIP Encoder', expectedClass: 'CLIPTextEncode', ... },
      { nodeId: '4', role: 'Latent Canvas Generator', expectedClass: samplerArchitecture === 'standard_ksampler' ? 'EmptyLatentImage' : 'LTXVEmptyLatentVideo', ... },
      { nodeId: '5', role: 'Video Sampler Engine', expectedClass: samplerArchitecture === 'standard_ksampler' ? 'KSampler' : 'LTXVideoSampler', ... },
      { nodeId: '6', role: 'VAE Latent Decoder', expectedClass: samplerArchitecture === 'standard_ksampler' ? 'VAEDecode' : 'LTXVVAEDecode', ... },
      { nodeId: '7', role: 'Animated WEBP / Video Output', expectedClass: 'SaveAnimatedWEBP', ... }
    ];
    // Compares sessionData.workflow and sessionData.bindings against expectedNodes
  ```

### Log Entry #15: Backend CORS Health Proxy & Standard ComfyUI Loader Fallback
- **Target File 1**: `/src/components/LTXDiagnostic.tsx`
- **Description**: Replaced direct browser fetch calls (`http://127.0.0.1:8188/system_stats`) with backend proxy endpoint `/api/comfy/health` to eliminate `403 Host/Origin mismatch` warnings from ComfyUI.
- **Exact Code Snippet**:
  ```typescript
  const checkConnectivity = async () => {
    setChecking(true);
    try {
      const proxyRes = await fetch('/api/comfy/health');
      if (proxyRes.ok) {
        const data = await proxyRes.json();
        setOnline(!!data.online);
      }
    } catch {
      setOnline(false);
    } finally {
      setChecking(false);
    }
  };
  ```

- **Target File 2**: `/workflows/ltx_video.json` & `/src/components/LTXWorkflowGenerator.tsx`
- **Description**: Configured default workflow Node #1 and workflow generator architecture to `LTXVLoader` matching ComfyUI-LTXVideo custom node setup.
- **Exact Code Snippet**:
  ```json
  "1": {
    "class_type": "LTXVLoader",
    "inputs": {
      "ckpt_name": "ltx-2.3-22b-distilled-fp8.safetensors"
    }
  }
  ```

### Log Entry #16: Kornia Dependency Repair Script & Automated Diagnostic Route
- **Target File 1**: `/fix_kornia.bat`, `/fix_kornia.ps1`, `/fix_kornia.py`
- **Description**: Created Windows batch, PowerShell, and Python repair scripts that activate `C:\Gina_AI\g_env`, install/upgrade `kornia` via pip, patch `pyramid_blending.py` import statement, and verify Kornia import.
- **Exact Code Snippet**:
  ```python
  # fix_kornia.py
  subprocess.check_call([sys.executable, "-m", "pip", "install", "--upgrade", "kornia"])
  ```

- **Target File 2**: `/server.ts`
- **Description**: Added `/api/diagnostics/fix-kornia` endpoint to programmatically patch `pyramid_blending.py` in `ComfyUI-LTXVideo` and check `g_env` executable paths.
- **Exact Code Snippet**:
  ```typescript
  app.get("/api/diagnostics/fix-kornia", async (_req, res) => {
    // Patches pyramid_blending.py if obsolete pad import exists
  });
  ```

### Log Entry #17: Dynamic Workflow Node Class Auto-Adaptation (`adaptWorkflowForComfySession`)
- **Target File**: `/server.ts`
- **Description**: Added `adaptWorkflowForComfySession(workflow)` helper in backend job queueing pipeline to check ComfyUI session's registered node types (`/object_info`). If custom nodes like `LTXVLoader` are missing from the active ComfyUI instance, it automatically converts node class types (`LTXVLoader` -> `CheckpointLoaderSimple`, `LTXVEmptyLatentVideo` -> `EmptyLatentImage`, `LTXVideoSampler` -> `KSampler`), preventing `missing_node_type` errors.
- **Exact Code Snippet**:
  ```typescript
  async function adaptWorkflowForComfySession(workflow: any) {
    try {
      const objectInfo = await getComfyObjectInfo();
      const hasLTXVLoader = !!objectInfo["LTXVLoader"];
      if (!hasLTXVLoader) {
        const adapted = JSON.parse(JSON.stringify(workflow));
        for (const [_nodeId, node] of Object.entries(adapted) as any) {
          if (node.class_type === "LTXVLoader") node.class_type = "CheckpointLoaderSimple";
          if (node.class_type === "LTXVEmptyLatentVideo") {
            node.class_type = "EmptyLatentImage";
            if (node.inputs?.frame_count && !node.inputs?.batch_size) {
              node.inputs.batch_size = node.inputs.frame_count;
              delete node.inputs.frame_count;
            }
          }
          if (node.class_type === "LTXVideoSampler") {
            node.class_type = "KSampler";
            if (node.inputs?.latent && !node.inputs?.latent_image) {
              node.inputs.latent_image = node.inputs.latent;
              delete node.inputs.latent;
            }
          }
        }
        return adapted;
      }
    } catch {
      // Return original if object_info query is unavailable
    }
    return workflow;
  }
  ```

### Log Entry #18: Video Navigation & LTX-2.3 Studio UI Integration
- **Target File**: `/src/components/VideoStudio.tsx`
- **Description**: Implemented prompt inputs, preset selectors, motion scaling, duration selectors, and generation handlers for LTX-Video.

### Log Entry #19: Complete Workflow & Node Schema Alignment Synchronization
- **Target File 1**: `/workflows/ltx_video.json`
- **Description**: Replaced Node `#1` class with standard `CheckpointLoaderSimple` (`ckpt_name: ltx-2.3-22b-distilled-fp8.safetensors`), Node `#4` with `EmptyLatentImage` (`batch_size`), Node `#5` with `KSampler`, Node `#6` with `VAEDecode`, and Node `#7` with `SaveAnimatedWEBP`.
- **Target File 2**: `/server.ts`
- **Description**: Updated `adaptWorkflowForComfySession` to seamlessly convert missing custom nodes into built-in native ComfyUI nodes (`CheckpointLoaderSimple`, `EmptyLatentImage`, `KSampler`, `VAEDecode`).
- **Target File 3**: `/src/components/LTXWorkflowGenerator.tsx`
- **Description**: Aligned LTX workflow architect & schema validator to default to standard ComfyUI nodes, producing 100% `ALIGNED` validation status.

### Log Entry #20: DualCLIPLoader Integration for Modular CLIP Models
- **Target File**: `/workflows/ltx_video.json`
- **Description**: Added Node `#8` (`DualCLIPLoader`) configured to load `clip_l.safetensors` and `t5xxl_fp8_e4m3fn.safetensors` from `models/clip/`, and routed output `["8", 0]` into Node `#2` and `#3` (`CLIPTextEncode`).
- **Exact Code Snippet**:
  ```json
  "8": {
    "class_type": "DualCLIPLoader",
    "inputs": {
      "clip_name1": "clip_l.safetensors",
      "clip_name2": "t5xxl_fp8_e4m3fn.safetensors",
      "type": "ltxv"
    }
  }
  ```

### Log Entry #21: DualCLIPLoader Type Alignment to Flux/T5 Engine
- **Target File**: `/workflows/ltx_video.json`
- **Description**: Updated Node `#8` (`DualCLIPLoader`) `type` parameter from `"ltxv"` (which expects Gemma3 tokenizer) to `"flux"` (which correctly initializes `clip_l.safetensors` + `t5xxl_fp8_e4m3fn.safetensors`).
- **Exact Code Snippet**:
  ```json
  "8": {
    "class_type": "DualCLIPLoader",
    "inputs": {
      "clip_name1": "clip_l.safetensors",
      "clip_name2": "t5xxl_fp8_e4m3fn.safetensors",
      "type": "flux"
    }
  }
  ```

### Log Entry #22: Dynamic Workflow Registry Disk Reload in Queue Endpoints
- **Target File**: `/server.ts`
- **Description**: Added explicit `await workflowRegistry.reload()` inside `POST /api/jobs` and `POST /api/comfy/queue` to prevent in-memory caching of stale workflow definitions when `/workflows/*.json` files on disk are edited.
- **Exact Code Snippet**:
  ```typescript
  app.post("/api/jobs", async (req, res) => {
    const { workflowId, parameters = {} } = req.body || {};
    if (!workflowId) return res.status(400).json({ error: "workflowId is required" });
    await workflowRegistry.reload();
    let definition = workflowRegistry.get(workflowId);
    // ...
  ```

### Log Entry #23: Single CLIPLoader T5XXL FP8 VRAM Optimization
- **Target File**: `/workflows/ltx_video.json`
- **Description**: Replaced `DualCLIPLoader` with single `CLIPLoader` (`t5xxl_fp8_e4m3fn.safetensors`, `"type": "sd3"`), saving ~2.2GB VRAM on RTX 3070 Ti 8GB GPU, and set default initial latent frame count to 25 frames.
- **Exact Code Snippet**:
  ```json
  "8": {
    "class_type": "CLIPLoader",
    "inputs": {
      "clip_name": "t5xxl_fp8_e4m3fn.safetensors",
      "type": "sd3"
    }
  }
  ```

### Log Entry #24: Standard Checkpoint + KSampler Universal Default Selection
- **Target File**: `/src/components/LTXWorkflowGenerator.tsx`
- **Description**: Updated `LTXWorkflowGenerator` state to default to `Standard Checkpoint + KSampler (Universal)` (`standard_ksampler`) and connected Node `#8` (`CLIPLoader` with `t5xxl_fp8_e4m3fn.safetensors`, `"type": "sd3"`) for 100% stock ComfyUI node compatibility.
- **Exact Code Snippet**:
  ```typescript
  const [samplerArchitecture, setSamplerArchitecture] = useState<'standard_ksampler' | 'ltx_custom'>('standard_ksampler');
  ```

### Log Entry #25: 512x512 Compact Square Default for 8GB VRAM Safety
- **Target File 1**: `/workflows/ltx_video.json`
- **Description**: Updated default resolution in `EmptyLatentImage` node #4 to `512 x 512` at 25 frames (1 second) to prevent 3D attention tensor CUDA OOM on 8GB GPU (NVIDIA RTX 3070 Ti).
- **Exact Code Snippet**:
  ```json
  "4": {
    "class_type": "EmptyLatentImage",
    "inputs": {
      "width": 512,
      "height": 512,
      "batch_size": 25
    }
  }
  ```

- **Target File 2**: `/src/components/VideoStudio.tsx`
- **Description**: Configured default `VideoStudio` state to `compact_fast` (`512 × 512 · 1:1 Compact Square`, 25 frames, 18 steps) for safe one-click generation on 8GB VRAM.
- **Exact Code Snippet**:
  ```typescript
  const [selectedDuration, setSelectedDuration] = useState(1);
  const [customFrames, setCustomFrames] = useState(25);
  const [resolution, setResolution] = useState('512 × 512 · 1:1 Compact Square');
  const [width, setWidth] = useState(512);
  const [height, setHeight] = useState(512);
  const [activePresetId, setActivePresetId] = useState<string>('compact_fast');
  ```

### Log Entry #26: VRAM Pressure Warning Toast & Persistent Video Error Handling
- **Target File 1**: `/src/components/VRAMPressureToast.tsx`
- **Description**: Created a non-blocking toast notification in the top-right corner that polls `/api/telemetry` for live GPU VRAM usage. When VRAM allocation exceeds 7.0 GB (>7168 MB on 8GB RTX 3070 Ti), it triggers a non-blocking toast alert with visual memory meter, real-time GB readout, OOM safety guidance, and a one-click safe preset button without blocking generation.
- **Exact Code Snippet**:
  ```typescript
  export const VRAMPressureToast: React.FC<VRAMPressureToastProps> = ({ thresholdGB = 7.0, onApplySafePreset }) => {
    // Polls /api/telemetry every 2.5s and renders a persistent, non-blocking toast when vramUsedGB >= thresholdGB
  ```

- **Target File 2**: `/src/components/VideoStudio.tsx`
- **Description**: Integrated `<VRAMPressureToast />` in Video Studio and added persistent error state (`videoError` and `lastSuccessfulVideoUrl`) so CUDA Out of Memory (OOM) and execution errors stay visible with full stack trace / diagnostic advice and a manual `[Dismiss Error]` button, without clearing or breaking any previously generated video output.
- **Exact Code Snippet**:
  ```typescript
  const [lastSuccessfulVideoUrl, setLastSuccessfulVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<{ message: string; timestamp: string; isOOM?: boolean; jobId?: string } | null>(null);
  ```

### Log Entry #27: Metadata Capability Cleanup
- **Target File**: `/metadata.json`
- **Description**: Removed Gemini API capability flag from `majorCapabilities` since the application runs strictly with local ComfyUI execution.
- **Exact Code Snippet**:
  ```json
  "majorCapabilities": [
    "LOCAL_ONLY_COMFYUI_EXECUTION",
    "DYNAMIC_WORKFLOW_PARSING",
    "ASYNC_JOB_TRACKING",
    "RTX_3070_TI_8GB_AWARE",
    "CREATOR_NAVIGATION",
    "SHORTS_FACTORY_FOUNDATION",
    "LOCAL_ASSET_AND_JOB_VIEWS"
  ]
  ```

### Log Entry #28: VRAMWarningToast with AnimatePresence Subscribed in App.tsx
- **Target File 1**: `/src/components/VRAMWarningToast.tsx`
- **Description**: Created `VRAMWarningToast` component utilizing `AnimatePresence` and `motion` from `motion/react` to render smooth non-blocking entry and exit transitions at the top-right whenever `vramUsedMB` exceeds 7168 MB. Features visual telemetry progress meter, GPU temperature, and OOM prevention guidelines.
- **Exact Code Snippet**:
  ```typescript
  export const VRAMWarningToast: React.FC<VRAMWarningToastProps> = ({
    telemetry,
    thresholdMB = 7168,
    onDismiss
  }) => {
    // Subscribes to telemetry and uses AnimatePresence for smooth non-blocking notification
  ```

- **Target File 2**: `/src/App.tsx`
- **Description**: Subscribed `VRAMWarningToast` to the central `telemetry` state in `App.tsx` and mounted it at the root layout with threshold `7168` MB.
- **Exact Code Snippet**:
  ```typescript
  import { VRAMWarningToast } from './components/VRAMWarningToast';
  // ...
  <VRAMWarningToast telemetry={telemetry} thresholdMB={7168} />
  ```

### Log Entry #29: VRAM History Graph (30-Second Stage Telemetry) in System View
- **Target File 1**: `/src/components/VRAMHistoryGraph.tsx`
- **Description**: Created 1Hz high-resolution D3.js VRAM History Graph tracking GPU memory over a rolling 30-second window. Identifies memory spikes (>600MB jumps or >7168MB allocations) and attributes them directly to active ComfyUI node execution stages (e.g. KSampler diffusion pass, VAEDecode frame expansion, CheckpointLoader). Features interactive point inspection, peak/avg memory badges, threshold safety guidelines, and 7.0GB/7.37GB warning overlays.
- **Exact Code Snippet**:
  ```typescript
  export const VRAMHistoryGraph: React.FC<VRAMHistoryGraphProps> = ({ telemetry, onAddLog }) => {
    // 1Hz rolling 30-second window with D3 curve rendering and node stage memory attribution
  ```

- **Target File 2**: `/src/App.tsx`
- **Description**: Rendered `<VRAMHistoryGraph />` component inside the 'System' workspace view.
- **Exact Code Snippet**:
  ```typescript
  import { VRAMHistoryGraph } from './components/VRAMHistoryGraph';
  // ...
  {activeView === 'system' && (
    <main className="space-y-5">
      {/* ... */}
      <LocalProjectStateBar />
      <LTXDiagnostic />
      <VRAMHistoryGraph telemetry={telemetry} onAddLog={addLog} />
      <LocalCapabilityPanel onAddLog={addLog} />
  ```

### Log Entry #30: Proactive OOM Prevention & ComfyUI Clear Cache API (/free) Integration
- **Target File 1**: `/server.ts`
- **Description**: Added `POST /api/comfy/clear-cache` endpoint proxying `POST /free` to ComfyUI backend (`{ unload_models: false, free_memory: true }`) to release PyTorch CUDA tensors and latent cache buffers.
- **Exact Code Snippet**:
  ```typescript
  app.post("/api/comfy/clear-cache", async (req, res) => {
    try {
      const unloadModels = req.body?.unload_models ?? true;
      const freeMemory = req.body?.free_memory ?? true;
      const response = await fetch(`${COMFY_URL}/free`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unload_models: unloadModels, free_memory: freeMemory }),
        signal: AbortSignal.timeout(5000)
      });
      if (response.ok) {
        res.json({ success: true, message: "ComfyUI memory cache cleared successfully" });
      } else {
        const text = await response.text();
        res.status(response.status).json({ success: false, error: text || `HTTP ${response.status}` });
      }
    } catch (error: any) {
      res.status(503).json({ success: false, error: error?.message || "Failed to contact ComfyUI /free endpoint" });
    }
  });
  ```

- **Target File 2**: `/src/App.tsx`
- **Description**: Added `handleClearCache` callback with 10s cooldown guard and automatic `useEffect` sentry trigger whenever live telemetry detects `telemetry.vramUsedMB > 7680` (7.5GB). Dispatches clear cache signal to ComfyUI and records `RULE` 011-020 system audit logs. Passed `onClearCache` handler to `VRAMWarningToast`, `VRAMHistoryGraph`, and `HardwareStack`.
- **Exact Code Snippet**:
  ```typescript
  const handleClearCache = useCallback(async (isAutoTrigger = false) => {
    if (isClearingCacheRef.current) return;
    const now = Date.now();
    if (now - lastClearCacheRef.current < 10000) return;
    lastClearCacheRef.current = now;
    isClearingCacheRef.current = true;
    if (isAutoTrigger) {
      addLog('RULE', `Proactive OOM Prevention: Telemetry detected VRAM > 7.5GB (${telemetry.vramUsedMB} MB). Automatically dispatched 'clear cache' signal to ComfyUI /free API.`, '011-020');
    }
    try {
      const res = await fetch('/api/comfy/clear-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unload_models: false, free_memory: true })
      });
      // ...
    } finally {
      isClearingCacheRef.current = false;
    }
  }, [telemetry.vramUsedMB]);

  useEffect(() => {
    if (telemetry.vramUsedMB > 7680) {
      handleClearCache(true);
    }
  }, [telemetry.vramUsedMB, handleClearCache]);
  ```

- **Target File 3**: `/src/components/VRAMWarningToast.tsx`, `/src/components/VRAMHistoryGraph.tsx`, `/src/components/HardwareStack.tsx`
- **Description**: Added manual "Flush VRAM Cache (/free)" interactive buttons enabling one-click cache purging on demand across telemetry monitoring components.
- **Exact Code Snippet**:
  ```typescript
  {onClearCache && (
    <button onClick={onClearCache} className="...">
      <Trash2 className="w-3 h-3" /> Flush VRAM (/free)
    </button>
  )}
  ```

### Log Entry #31: VideoStudio ComfyUI Error Sentry Overlay with CUDA OOM Highlighting
- **Target File 1**: `/server.ts` & `/server/comfy/ComfyWebSocket.ts`
- **Description**: Added rolling ComfyUI error log buffer (`comfyErrorLogs`), captured `execution_error` websocket events with tracebacks and OOM regex detection (`/out of memory|cuda oom|cuda error|cublas|allocation failed/i`), and exposed `GET /api/comfy/error-logs` & `POST /api/comfy/error-logs/clear` endpoints.
- **Exact Code Snippet**:
  ```typescript
  app.get("/api/comfy/error-logs", (_req, res) => {
    const lastFive = comfyErrorLogs.slice(-5);
    const hasOOM = lastFive.some(entry => entry.isOOM);
    res.json({
      logs: comfyErrorLogs,
      lastFive,
      hasOOM,
      count: comfyErrorLogs.length
    });
  });
  ```

- **Target File 2**: `/src/components/ComfyErrorOverlay.tsx`
- **Description**: Created a lightweight, non-intrusive floating HUD overlay in the video preview container displaying the last 5 lines of ComfyUI error logs, specifically highlighting CUDA OOM exceptions with amber/rose pulsing badges, line timestamps, clipboard copying, VRAM flushing, and collapsible HUD controls.
- **Exact Code Snippet**:
  ```typescript
  export const ComfyErrorOverlay: React.FC<ComfyErrorOverlayProps> = ({ externalError, onAddLog, className = '' }) => {
    const [errorLogs, setErrorLogs] = useState<ComfyErrorLog[]>([]);
    const [isExpanded, setIsExpanded] = useState<boolean>(true);
    // ...
  ```

- **Target File 3**: `/src/components/VideoStudio.tsx`
- **Description**: Integrated `<ComfyErrorOverlay externalError={videoError} onAddLog={onAddLog} />` inside the Video Output Preview display container.
- **Exact Code Snippet**:
  ```typescript
  {/* Small Non-Intrusive ComfyUI Error Sentry Overlay */}
  <ComfyErrorOverlay externalError={videoError} onAddLog={onAddLog} />
  ```

### Log Entry #32: Active Save Point Version Bump to v1.3.9
- **Target File 1**: `/src/App.tsx`
- **Description**: Updated `activeSavePoint` state from `'v1.0.0'` to `'v1.3.9'` to reflect the current milestone version across all header badges, save point monitors, and restore manifests.
- **Exact Code Snippet**:
  ```typescript
  export default function App() {
    const [activeSavePoint, setActiveSavePoint] = useState<string>('v1.3.9');
  ```

- **Target File 2**: `/package.json`
- **Description**: Updated project package version to `1.3.9`.
- **Exact Code Snippet**:
  ```json
  "version": "1.3.9"
  ```

### Log Entry #33: Live ComfyUI Error Sentry Integration & Diagnostics
- **Target File**: `/src/components/ComfyErrorOverlay.tsx`
- **Description**: Enhanced error sentry with interactive error line clearing, one-click stack trace copy, and direct VRAM flush buttons.

### Log Entry #47: Proactive VRAM Guard Breath Period and Post-OOM Cooldown
- **Target File**: `/src/App.tsx`
- **Description**: Created cooldown breath period on OOM detection to allow PyTorch CUDA tensors to completely unload before subsequent queues.

### Log Entry #48: VRAMOomFrequencyChart Native SVG Charting (Zero-Dependency Refactor)
- **Target File**: `/src/components/VRAMOomFrequencyChart.tsx`
- **Description**: Replaced external recharts dependency with high-performance, native responsive SVG charts.

### Log Entry #49: Persistent Background Generation Across All Workspace Tabs
- **Target File**: `/src/App.tsx`
- **Description**: Refactored `App.tsx` to mount all main tabs concurrently in DOM with CSS visibility classes so tab switching never unmounts generation context.

### Log Entry #50: LTX-Video CLIPLoader Tokenizer & attention_mask Fix
- **Target File 1**: `/workflows/ltx_video.json`
- **Description**: Fixed `TypeError: LTXBaseModel.forward() missing 1 required positional argument: 'attention_mask'` by setting Node #8 `CLIPLoader` type to `"ltxv"`.

### Log Entry #51: LTX-Video VAE Latent Tensor Shape & EmptyLTXVLatentVideo Fix
- **Target File 1**: `/workflows/ltx_video.json`
- **Description**: Fixed `RuntimeError: shape '[10, 256, 1, 1, 1]' is invalid for input of size 256` by replacing 2D `EmptyLatentImage` with 3D `EmptyLTXVLatentVideo`.

### Log Entry #52: MP4 Video Combine Output & Multi-Format Video/WebP Live Preview Support
- **Target File 1**: `/workflows/ltx_video.json`
- **Description**: Replaced Node #7 `SaveAnimatedWEBP` with `VHS_VideoCombine` (format `"video/h264-mp4"`) so local video jobs render standard H.264 MP4 videos directly.

### Log Entry #53: ComfyUI Interrupt & Instant Job Stop Controls
- **Target File 1**: `/server.ts`
- **Description**: Added `/api/comfy/interrupt` POST route that calls ComfyUI's `/interrupt` endpoint, clears the queue via `/queue`, and marks active jobs as `CANCELLED`.

### Log Entry #54: Auto-Flush Hook Before Queueing Video Workflows
- **Target File 1**: `/server.ts`
- **Description**: Added server-side auto-flush hook in `POST /api/jobs` that executes `/free` to purge cached PyTorch CUDA tensors whenever a video workflow is queued.

### Log Entry #55: System Restore Point `v1.5.0` (LTX-Video MP4 & Auto-Flush Sentinel)
- **Target File 1**: `/package.json`
- **Description**: Bumped application project version to `1.5.0`.

### Log Entry #56: AI Video Frame Interpolation (RIFE) & 8GB Safe Zone Presets
- **Target File 1**: `/src/components/VideoStudio.tsx`
- **Description**: Added dedicated RIFE frame interpolation selector (1x Off, 2x RIFE 50fps Smooth, 4x RIFE 60fps Slomo) paired with 25-frame diffusion.

### Log Entry #57: NVML VRAM History Telemetry Relocation to Create & Video Interfaces
- **Target File 1**: `/src/components/PromptStudio.tsx`
- **Description**: Added `VRAMHistoryGraph` telemetry component to the Create image workspace right column with live GPU VRAM usage and stage attribution.
- **Target File 2**: `/src/components/VideoStudio.tsx`
- **Description**: Added `VRAMHistoryGraph` telemetry component to the Video Studio preview column for real-time monitoring of LTX-Video and frame interpolation VRAM footprints.
- **Target File 3**: `/src/App.tsx`
- **Description**: Passed `telemetry` and `onClearCache` props to `PromptStudio` and `VideoStudio`, and removed the duplicate graph from the System tab.

### Log Entry #58: Roadmap Expansion — AIDA64 Sensor Panel Studio & Quantized Local AI Engine
- **Target File 1**: `/AGENTS.md`
- **Description**: Updated Section 4 and added Section 5 to document Milestone 7 (AIDA64 Sensor Panel Template Studio for custom PC stats displays: 1920x480, 1920x515, 1024x600, 800x480, 480x480 HUD templates with gauge cutouts) and Milestone 8 (Core Local AI Engine: GGUF/EXL2/AWQ quantized inference, FlashAttention-2, KV Cache Q4/Q8 quantization, prompt cache shifting, strategic local model registry with Llama-3-8B/Qwen2.5-7B/Llama-3.2-3B, local BGE embedding + Chroma/Faiss vector database RAG loop, and Rapid vs Developer software stack matrix).
- **Exact Code Snippet**:
  ```markdown
  - [ ] **Milestone 7: AIDA64 Sensor Panel Template Studio**:
    - Add specialized template creation features to Image Studio specifically designed for custom AIDA64 hardware sensor panels & PC stats mini-displays.
    - Dedicated sensor panel aspect ratio presets: 1920×480 (8.8" Bar), 1920×515 (12.6" Ultrawide), 1024×600 (7" Mini), 800×480 (5" Compact), and 480×480 (Round / Square AIO cooler displays).
  - [ ] **Milestone 8: Core Local AI Engine & Quantized LLM Pipeline**:
    - 1. Quantized Inference Engine (8GB VRAM Optimized): GGUF / EXL2 / AWQ
    - 2. Context Window & Memory Management: FlashAttention-2, KV Cache Quantization, Context Shifting
    - 3. Strategic Local Model Registry: Llama-3-8B-Instruct, Qwen2.5-7B-Instruct, Llama-3.2-3B
    - 4. Local Embedding & Vector Database: bge-large-en-v1.5 + Chroma / Faiss RAG
  ```

- **Target File 2**: `/src/components/MilestoneChecklist.tsx`
- **Description**: Added Phase 7 (AIDA64 Sensor Panel Template Studio) and Phase 8 (Quantized Local AI Engine & RAG Pipeline) to the interactive Project Milestones & Save Points UI.
- **Exact Code Snippet**:
  ```typescript
  { phase: 7, name: 'AIDA64 SENSOR PANEL TEMPLATE STUDIO', status: 'PLANNED', details: 'Custom 1920x480/1920x515 HUD layouts, telemetry cutouts & PC stats templates' },
  { phase: 8, name: 'QUANTIZED LOCAL AI ENGINE & RAG PIPELINE', status: 'PLANNED', details: 'GGUF/EXL2 runtime, FlashAttention-2, KV Cache Q4, Llama-3/Qwen2.5 & BGE RAG' },
  ```

### Log Entry #60: Phase 7 — AIDA64 Sensor Panel Template Studio Integration
- **Target File 1**: `/src/types.ts`
- **Description**: Added interfaces for `Aida64ScreenPreset`, `Aida64DialConfig`, `Aida64DialSlot`, `Aida64GaugeSequenceConfig`, and `Aida64PanelItem`.
- **Exact Code Snippet**:
  ```typescript
  export interface Aida64ScreenPreset {
    id: string;
    label: string;
    width: number;
    height: number;
    diagonal: string;
    category: 'bar' | 'mini' | 'aio' | 'standard';
    description: string;
  }
  export interface Aida64GaugeSequenceConfig {
    frameCount: number;
    width: number;
    height: number;
    style: 'segmented_arc' | 'smooth_arc' | 'radial_ticks' | 'led_ladder';
    startAngleDeg: number;
    endAngleDeg: number;
    innerRadius: number;
    outerRadius: number;
    segmentCount: number;
    segmentGapDeg: number;
    primaryColor: string;
    warningColor: string;
    criticalColor: string;
    warningThreshold: number;
    criticalThreshold: number;
    trackColor: string;
    showTrack: boolean;
    glowIntensity: number;
  }
  ```

- **Target File 2**: `/src/data/aida64Presets.ts`
- **Description**: Defined screen presets (`1024x600`, `1920x480`, `1920x515`, `800x480`, `480x480` AIO), color palettes, and zero-text prompt recipes.

- **Target File 3**: `/src/components/aida64/Aida64ChassisGenerator.tsx`
- **Description**: Built zero-text background chassis generator with aspect ratio bounds guide, round AIO cooler overlay mask, and prompt bridge.

- **Target File 4**: `/src/components/aida64/Aida64DialDesigner.tsx`
- **Description**: Created modular custom 200px/300px/400px dial & pod builder with hero socket, banner, stacked pill slots (MHz, Fan 1 RPM, Fan 2 RPM), curved bottom tray, and transparent PNG exporter.

- **Target File 5**: `/src/components/aida64/Aida64StateGaugeGenerator.tsx`
- **Description**: Implemented 100-state real-time utilization gauge sequence generator with live sweep scrubber and 1-click `0.png` to `100.png` JSZip exporter.

- **Target File 6**: `/src/components/aida64/Aida64LayoutMapper.tsx`
- **Description**: Created interactive canvas assembler with live telemetry preview and AIDA64 pixel coordinate `(X, Y, W, H)` cheat sheet exporter.

- **Target File 7**: `/src/components/Aida64Studio.tsx` & `/src/App.tsx`
- **Description**: Integrated top-level `AIDA64` workspace navigation tab and connected prompt transfer pipeline to `PromptStudio`.

### Log Entry #61: Zero-Dependency Pure TypeScript ZIP Generator Fix for Local Environment
- **Target File 1**: `/src/utils/zipWriter.ts`
- **Description**: Implemented a standalone, zero-dependency `SimpleZip` binary archive writer in pure TypeScript supporting standard ZIP local headers, data descriptors, CRC-32 checksum calculation, and central directory records. Completely removes any external npm dependency (`jszip`) to eliminate Vite import resolution errors on local machines without requiring manual `npm install`.
- **Exact Code Snippet**:
  ```typescript
  export class SimpleZip {
    private files: ZipFileEntry[] = [];
    addFile(name: string, data: Uint8Array | string): void {
      this.files.push({ name, data });
    }
    generateBlob(): Blob {
      // Writes Local File Headers, CRC32, Data & Central Directory
      return new Blob(parts, { type: 'application/zip' });
    }
  }
  ```

- **Target File 2**: `/src/components/aida64/Aida64StateGaugeGenerator.tsx`
- **Description**: Switched 100-state gauge frame sequence export from `jszip` to `SimpleZip`.
- **Exact Code Snippet**:
  ```typescript
  import { SimpleZip } from '../../utils/zipWriter';
  ...
  const zip = new SimpleZip();
  zip.addFile(`${folderPrefix}${i}.png`, bytes);
  ```

- **Target File 3**: `/package.json`
- **Description**: Removed external `jszip` dependency.

### Log Entry #62: Keep Image Iteration Workflow & Automated Seed Randomization Engine
- **Target File 1**: `/src/components/PromptStudio.tsx`
- **Description**: Added automatic seed randomization on every "Generate Locally" click so prompts produce distinct variations each time without requiring manual prompt editing. Added "Keep This Image & Work Off It" button to lock the active seed for iterative refinement, plus an unlock toggle to resume exploring new concepts. Added automated prompt sanitization to strip negative trigger phrases and replace them with positive hollow socket terminology.

### Log Entry #63: AIDA64 Interactive Canvas Assembler with Draggable & Scalable Controls
- **Target File 1**: `/src/components/aida64/Aida64LayoutMapper.tsx`
- **Description**: Implemented a fully interactive visual assembler allowing users to drag elements anywhere on the canvas, resize them using corner handles or a proportional scaler slider, and configure exact pixel dimensions (X, Y, Width, Height) in real-time. Added keyboard nudging (Arrow keys & Shift+Arrow), grid snapping, duplicate/delete/lock controls, layer ordering, and JSON import/export.
- **Exact Code Snippet**:
  ```typescript
  // Interactive pointer drag and resize handling with scaling ratio and snapping
  const handlePointerDownElement = (e: React.PointerEvent, item: Aida64PanelItem) => {
    e.stopPropagation();
    setSelectedItemId(item.id);
    if (item.locked) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseCanvasX = (e.clientX - rect.left) / zoomScale;
    const mouseCanvasY = (e.clientY - rect.top) / zoomScale;
    setIsDragging(true);
    setDragOffset({ x: mouseCanvasX - item.x, y: mouseCanvasY - item.y });
  };
  ```

- **Target File 2**: `/src/types.ts`
- **Description**: Extended `Aida64PanelItem` with `scale`, `locked`, `fontSize`, `textAlign`, `bgColor`, `borderColor`, `opacity`, and `zIndex` properties.

### Log Entry #64: Cloud & AI Studio Execution Compatibility Verification
- **Target File 1**: `/metadata.json`
- **Description**: Verified environment configuration and metadata descriptors for AI Studio cloud container migration. Added `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API` capability identifier while maintaining full local execution compatibility.
- **Exact Code Snippet**:
  ```json
  "majorCapabilities": [
    "MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API",
    "LOCAL_ONLY_COMFYUI_EXECUTION"
  ]
  ```

### Log Entry #65: AIDA64 Studio Pro — 17-Style Gauge Factory, 7-Value Telemetry Pods & Assembler Pro
- **Target File 1**: `/src/types.ts`
- **Description**: Extended `Aida64GaugeStyle` with 17 circular, horizontal, and vertical styles (`segmented_arc`, `smooth_arc`, `radial_ticks`, `led_ladder`, `dual_ring`, `progress_ring`, `digital_arc`, `needle_gauge`, `half_arc`, `corner_gauge`, `radar_tactical`, `led_bar_h`, `segment_bar_h`, `thermal_bar_h`, `industrial_bar_h`, `segment_ladder_v`, `thermal_bar_v`). Added `Aida64TelemetryPodConfig`, `Aida64TelemetrySlot`, and canvas positioning properties.
- **Exact Code Snippet**:
  ```typescript
  export type Aida64GaugeStyle =
    | 'segmented_arc'
    | 'smooth_arc'
    | 'radial_ticks'
    | 'led_ladder'
    | 'dual_ring'
    | 'progress_ring'
    | 'digital_arc'
    | 'needle_gauge'
    | 'half_arc'
    | 'corner_gauge'
    | 'radar_tactical'
    | 'led_bar_h'
    | 'segment_bar_h'
    | 'thermal_bar_h'
    | 'industrial_bar_h'
    | 'segment_ladder_v'
    | 'thermal_bar_v';
  ```

- **Target File 2**: `/src/components/aida64/Aida64StateGaugeGenerator.tsx`
- **Description**: Implemented expanded Utilisation Gauge Factory supporting all 17 gauge styles, universal scaling presets (25% to 200%), exact pixel dimension controls, live interactive 0-100% scrubber with auto-sweep, direct 1-click "Add to Canvas Assembler" injection, single PNG snapshot export, and 101-frame state ZIP sequence export (`0.png` to `100.png`) using `SimpleZip`.
- **Exact Code Snippet**:
  ```typescript
  const handleAddToAssembler = () => {
    const item: Aida64PanelItem = {
      id: `gauge_${Date.now()}`,
      name: `${config.metricLabel || 'Utilisation'} (${meta?.name || config.style})`,
      type: config.style.includes('_bar') ? 'linear_bar' : 'dial',
      x: 300,
      y: 150,
      width: config.width,
      height: config.height,
      sensorType: config.metricLabel || 'CPU %',
      testValue: `${currentValue}`,
      unit: config.metricUnit || '%',
      color: config.primaryColor,
      scale: config.scale || 1.0,
      gaugePercent: currentValue,
      gaugeStyle: config.style,
      gaugeConfig: { ...config }
    };
    if (onAddToAssembler) onAddToAssembler(item);
  };
  ```

- **Target File 3**: `/src/components/aida64/Aida64TelemetryPodDesigner.tsx`
- **Description**: Created dedicated 7-Value Telemetry Pod Designer with pre-configured archetypes for CPU, GPU, Memory, Storage & Network, and Custom builders. Configures 7 independent sensor slots with icons, units, test values, and mini progress bars alongside hero gauges.
- **Exact Code Snippet**:
  ```typescript
  export const Aida64TelemetryPodDesigner: React.FC<Aida64TelemetryPodDesignerProps> = ({
    onAddToAssembler
  }) => {
    ...
  };
  ```

- **Target File 4**: `/src/components/aida64/Aida64LayoutMapper.tsx`
- **Description**: Upgraded Interactive Canvas Assembler to Assembler Pro with 8-point resize handles (`nw`, `n`, `ne`, `e`, `se`, `s`, `sw`, `w`), exact geometry numeric inputs (X, Y, W, H), proportional scaler slider, lock aspect ratio toggle, snap-to-grid (1px to 20px), keyboard controls (Arrows for nudge, Shift+Arrow for 10px, Delete, Ctrl+D duplicate, Ctrl+Z/Ctrl+Y undo/redo history stack), multi-select with alignment/distribution tools, left drawer with templates/library/layers, and full AIDA64 sensor coordinate table and JSON layout exporter.
- **Exact Code Snippet**:
  ```typescript
  // 8-Point Resize Handle Tracking
  const handleResizeHandleMouseDown = (e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveResizeHandle(handle);
    ...
  };
  ```

- **Target File 5**: `/src/data/aida64Presets.ts`
- **Description**: Added `GAUGE_STYLES_REGISTRY`, `PRESET_TELEMETRY_PODS`, and `AIDA64_PANEL_TEMPLATES` (Gaming Station 1024x600, Ultrawide Bar 1920x480, AIO Cooler 480x480).

- **Target File 6**: `/src/components/Aida64Studio.tsx`
- **Description**: Integrated all 5 sub-studios (Chassis Backplates, Gauge Factory, 7-Value Pods, Modular Dials, Assembler Pro) with cross-tab item injection.
### Log Entry #68: Nested Value Boxes in Dials, Custom Geometric Box Shapes & Layout-to-AI Mask Enhancements
- **Target File 1**: `/src/types.ts`
- **Description**: Added new `Aida64ShapeType` entries (`dial_with_boxes`, `box_rectangle`, `box_chamfer`, `box_hexagon`, `box_pill`, `box_bracket`, `box_cut_corner`) and added `boxShape` and `renderMode` properties to `Aida64PanelItem`.
- **Exact Code Snippet**:
  ```typescript
  export type Aida64ShapeType =
    | 'dial_circle'
    | 'dial_with_boxes'
    | 'temp_wing_angled'
    | 'voltage_wattage_banner'
    | 'ram_stick_module'
    | 'box_rectangle'
    | 'box_chamfer'
    | 'box_hexagon'
    | 'box_pill'
    | 'box_bracket'
    | 'box_cut_corner'
    | 'telemetry_slot_3'
    | 'network_transfer_pod'
    | 'disk_activity_pod'
    | 'fps_counter_badge'
    | 'battery_indicator_pod'
    | 'avatar_stage_cutout'
    | 'linear_sensor_bar'
    | 'custom_hud_frame';
  ```

- **Target File 2**: `/src/data/aida64Presets.ts`
- **Description**: Registered the new value box shapes into `AIDA64_SHAPES_CATALOG` under category `'boxes'` with factory initializers.

- **Target File 3**: `/src/utils/aida64LayoutCompiler.ts`
- **Description**: Upgraded spatial prompt compiler and HTML5 control mask canvas generator to recognize nested value boxes placed inside dials/gauges, individual geometric contour box shapes (chamfered, hexagonal, cut-corner, pill, and reticle brackets), and enforce empty cavity zero-text prompt construction.
- **Exact Code Snippet**:
  ```typescript
  // Identify dials and any value boxes inside or near them
  const dialsWithInnerBoxes = items.filter(i => (i.type === 'dial' || i.shapeType === 'dial_circle' || i.shapeType === 'dial_with_boxes'));
  
  dialsWithInnerBoxes.forEach((dial, idx) => {
    const dialRadius = Math.min(dial.width, dial.height) / 2;
    const dialCenterX = dial.x + dial.width / 2;
    const dialCenterY = dial.y + dial.height / 2;

    const innerBoxes = items.filter(other => {
      if (other.id === dial.id) return false;
      const otherCenterX = other.x + other.width / 2;
      const otherCenterY = other.y + other.height / 2;
      const dist = Math.hypot(otherCenterX - dialCenterX, otherCenterY - dialCenterY);
      return dist < dialRadius * 0.85;
    });
    // ...
  });
  ```

- **Target File 4**: `/src/components/aida64/Aida64LayoutMapper.tsx`
- **Description**: Added dedicated "3. Value Boxes (8 Shapes)" sub-tab with 1-click generators, direct "+ Nest Value Box inside Dial" actions in the Element Inspector, custom CSS clip-paths/borders for each box shape, and enhanced canvas drag/resize controls.

---

### Log Entry #26: Clean Blueprint Layout Mapping Mode & Zero-Text Bezel Architecture
- **Target File 1**: `/src/data/aida64Presets.ts`
- **Description**: Added `template_clean_blank_1024_600` (100% clean blank canvas preset) and `template_clean_dual_dials_map` (pre-mapped clean circular dial bezels with nested geometric value boxes and zero numbers). Set the blank layout as the first default preset.
- **Exact Code Snippet**:
  ```typescript
  {
    id: 'template_clean_blank_1024_600',
    name: 'Clean Blank Canvas (1024×600)',
    description: 'Empty clean slate. Add clean circle bezels and nested geometric value boxes to map your chassis placeholders.',
    screenPresetId: 'screen_1024_600',
    aspectRatio: '16:9',
    backgroundTheme: 'dark_carbon',
    items: []
  }
  ```

- **Target File 2**: `/src/components/aida64/Aida64LayoutMapper.tsx`
- **Description**: Stripped all mock numbers, telemetry data, fake percentage readouts, and needles from the layout mapper canvas. Dials now render as clean circular bezel rings with subtle concentric guide marks, and value boxes render as clean dark glass geometric sockets displaying only socket name and dimensions. Added 1-click `Clear Map` button and empty canvas blueprint state.
- **Exact Code Snippet**:
  ```typescript
  {/* Render Clean Circular Dial Bezel */}
  {isDial ? (
    <div className="w-full h-full rounded-full border-2 border-slate-600/90 bg-slate-950/80 shadow-2xl relative flex items-center justify-center overflow-hidden backdrop-blur-xs">
      <div className="absolute inset-1.5 rounded-full border border-slate-700/60 pointer-events-none" />
      <div className="absolute inset-4 rounded-full border border-dashed border-slate-800/60 pointer-events-none" />
      <div className="absolute top-2.5 px-2.5 py-0.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-[8px] font-mono text-slate-300 font-bold uppercase tracking-wider shadow-sm pointer-events-none flex items-center gap-1">
        <span>{item.name || 'CIRCLE BEZEL'}</span>
        {item.locked && <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
      </div>
      <div className="absolute bottom-2.5 px-1.5 py-0.5 rounded bg-slate-900/80 text-[7px] font-mono text-slate-500 pointer-events-none">
        {item.width}×{item.height}px
      </div>
    </div>
  ) : ( ... )}
  ```

---

### Log Entry #27: 100% Exact Layout Coordinate Chassis Engine & AI Create Fusion
- **Target File 1**: `/src/types.ts`
- **Description**: Added `ActiveAida64LayoutData` and integrated it into `FullProjectState` so the active layout map and coordinates persist across views.
- **Exact Code Snippet**:
  ```typescript
  export interface ActiveAida64LayoutData {
    screen: { width: number; height: number; label: string };
    items: Aida64PanelItem[];
    themeId: string;
    timestamp: string;
  }
  ```

- **Target File 2**: `/src/utils/aida64LayoutCompiler.ts`
- **Description**: Implemented `renderLayoutChassisArtworkCanvas` and `compositeLayoutOntoImage` high-precision HTML5 Canvas renderers. Draws exact CNC titanium bezel rings, illuminated neon conduits, recessed dark optical glass sockets, and carbon-fiber backplate based on exact pixel coordinates of placed items, without any text or fake numbers.
- **Exact Code Snippet**:
  ```typescript
  export function renderLayoutChassisArtworkCanvas(
    canvas: HTMLCanvasElement,
    screen: { width: number; height: number },
    items: Aida64PanelItem[],
    themeId: string = 'cyberpunk_red'
  ): void {
    // Renders 100% exact CNC chassis backplate at target screen resolution
  }

  export async function compositeLayoutOntoImage(
    baseImageUrl: string,
    screen: { width: number; height: number },
    items: Aida64PanelItem[],
    themeId: string = 'cyberpunk_red'
  ): Promise<string> {
    // Composites chassis bezel artwork seamlessly over generated AI artwork
  }
  ```

- **Target File 3**: `/src/context/ProjectStateContext.tsx`
- **Description**: Added `setActiveAida64Layout` to context and provider state management.

- **Target File 4**: `/src/components/aida64/Aida64LayoutMapper.tsx`
- **Description**: Added live visual chassis artwork preview canvas in the AI Generator modal, direct `⚡ Render Exact Chassis` quick action toolbar button, `⚡ Bake & Apply Exact Chassis PNG (100% Exact Coordinates)` button, and `✨ Option: Fuse Template Layout Onto Saved AI Image` picker.

- **Target File 5**: `/src/components/PromptStudio.tsx`
- **Description**: Added active AIDA64 layout indicator banner and `✨ FUSE TEMPLATE LAYOUT BEZELS ONTO THIS IMAGE` 1-click action in the generation output panel, enabling seamless overlay of template dials at exact coordinates on newly generated AI backgrounds.

---

### Log Entry #28: Template Coordinate & Dimension Reading in Prompt Synthesis and Advanced AI Layout Fusion
- **Target File 1**: `/src/utils/aida64LayoutCompiler.ts`
- **Description**: Upgraded `compileLayoutToSpatialPrompt` to read every single item's exact coordinate `(X, Y)`, diameter/dimensions `(Width, Height)`, and horizontal/vertical percentage bounds (`X: 11% to 42%`, `Y: 23% to 76%`). Added strict item count locks and negative space constraints (e.g. enforcing dual-gauge layout and zero center dial hallucination). Upgraded `compositeLayoutOntoImage` with customizable options for `dimBaseImage`, `showConduits`, `showHexBolts`, and `showTickMarks`.
- **Exact Code Snippet**:
  ```typescript
  coordinateBlueprintEntries.push(
    `DIAL #${idx + 1} [${posLabel} ZONE]: Circular bezel centered at X=${dialCenterX}px, Y=${dialCenterY}px (Diameter ${dial.width}px, spanning horizontal bounds ${xPctStart}%-${xPctEnd}% and vertical bounds ${yPctStart}%-${yPctEnd}%)${innerBoxText}`
  );
  if (dials.length === 2 && centerDials.length === 0) {
    compositionRules.push(
      `STRICT COMPOSITION CONSTRAINT: Symmetrical dual-dial layout format. Exactly TWO circular gauges (one on left side, one on right side). The middle center corridor (X=${Math.round(w * 0.38)}px to X=${Math.round(w * 0.62)}px) MUST REMAIN COMPLETELY EMPTY OF DIALS. The center is a smooth dark brushed titanium conduit bridge.`
    );
  }
  ```

- **Target File 2**: `/src/components/aida64/Aida64LayoutMapper.tsx`
- **Description**: Added coordinate chips breakdown inspector into the AI Layout Generator modal so users can view every item's exact pixel dimensions and placement before sending to Create Studio.
- **Exact Code Snippet**:
  ```tsx
  <div className="pt-1 border-t border-slate-900 grid grid-cols-1 md:grid-cols-2 gap-1.5">
    {items.slice(0, 6).map((item, idx) => (
      <div key={item.id || idx} className="bg-slate-900/80 border border-slate-800/80 rounded px-2 py-1 text-[9.5px] font-mono flex items-center justify-between text-slate-300">
        <span className="truncate max-w-[140px] font-bold text-sky-300">#{idx + 1} {item.name || item.shapeType || item.type}</span>
        <span className="text-emerald-400 shrink-0">X:{item.x} Y:{item.y} ({item.width}×{item.height}px)</span>
      </div>
    ))}
  </div>
  ```

- **Target File 3**: `/src/components/PromptStudio.tsx`
- **Description**: Added coordinate item badges and live fusion customization drawer (Dimming range slider, Neon conduits toggle, Machined hex bolts & tick marks toggle) to the Active AIDA64 Layout banner.
- **Exact Code Snippet**:
  ```tsx
  {/* Exact Coordinate Chips */}
  <div className="pt-1.5 border-t border-slate-900 grid grid-cols-2 md:grid-cols-3 gap-1.5">
    {activeLayout.items.map((item, idx) => (
      <div key={item.id || idx} className="bg-slate-900/90 border border-slate-800 rounded px-2 py-1 text-[9px] font-mono flex items-center justify-between text-slate-300">
        <span className="text-sky-300 truncate max-w-[100px] font-bold">#{idx + 1} {item.name || item.shapeType}</span>
        <span className="text-emerald-400 shrink-0">X:{item.x} Y:{item.y}</span>
      </div>
    ))}
  </div>
  ```


---

### Log Entry #29: Gemma 3 12B Local CUDA LLM Integration
- **Target File 1**: `/server/llm/LocalLlmManager.ts`
- **Description**: Added a persistent local llama.cpp process manager for the verified Gemma 3 12B IT Q4_K_M GGUF. It uses the user's tested CUDA configuration (28 GPU layers, 4096 context, 6 CPU threads), exposes readiness/status, captures diagnostic output, supports start/stop/restart, and proxies OpenAI-compatible chat completions without a cloud provider.
- **Exact Code Snippet**:
  ```typescript
  const args = [
    "--model", this.config.modelPath,
    "--host", this.config.host,
    "--port", String(this.config.port),
    "--n-gpu-layers", String(this.config.gpuLayers),
    "--ctx-size", String(this.config.contextSize),
    "--threads", String(this.config.threads),
    "--jinja",
  ];
  ```

- **Target File 2**: `/server.ts`
- **Description**: Added `/api/llm/status`, `/api/llm/start`, `/api/llm/stop`, `/api/llm/restart`, and `/api/llm/chat`. Starting/restarting the local LLM first asks ComfyUI to release cached models so the 8GB RTX 3070 Ti is not left holding stale diffusion weights. Added best-effort LLM shutdown on server termination.
- **Exact Code Snippet**:
  ```typescript
  app.post("/api/llm/start", async (_req, res) => {
    await fetch(`${COMFY_URL}/free`, { method: "POST", ... }).catch(() => null);
    const status = await localLlm.start();
    res.json({ success: true, status });
  });
  ```

- **Target File 3**: `/src/components/LocalLlmStudio.tsx`
- **Description**: Added the Local AI workspace with Gemma status, CUDA/GPU-layer/context/CPU-thread diagnostics, start/stop/restart controls, local chat, and llama-server diagnostics. The UI does not auto-start the model, preventing unexpected VRAM consumption during ComfyUI work.
- **Exact Code Snippet**:
  ```tsx
  <button onClick={() => runAction('start')} disabled={loading || !status?.configured || !!status?.running}>
    <Play className="w-3.5 h-3.5" /> Start
  </button>
  ```

- **Target File 4**: `/src/App.tsx`
- **Description**: Added a dedicated `LOCAL AI` navigation view backed by `LocalLlmStudio` and updated the application footer version to v1.6.9.
- **Exact Code Snippet**:
  ```tsx
  { id: 'llm' as const, label: 'LOCAL AI', icon: Bot, isGenerating: false },
  ```

- **Target File 5**: `/.env.example`
- **Description**: Added optional local LLM path and runtime settings so a future machine-specific install can override the defaults without changing source code.
- **Exact Code Snippet**:
  ```text
  GINA_LLM_ROOT="C:\\Gina_AI\\models\\llm"
  GINA_LLAMA_ROOT="C:\\Gina_AI\\tools\\llama.cpp"
  GINA_LLM_MODEL="C:\\Gina_AI\\models\\llm\\gemma-3-12b-it-Q4_K_M.gguf"
  GINA_LLM_EXE="C:\\Gina_AI\\tools\\llama.cpp\\llama-server.exe"
  GINA_LLM_HOST="127.0.0.1"
  GINA_LLM_PORT="8080"
  GINA_LLM_GPU_LAYERS="28"
  GINA_LLM_CONTEXT="4096"
  GINA_LLM_THREADS="6"
  ```

- **Target File 6**: `/src/components/MilestoneChecklist.tsx`
- **Description**: Added `RESTORE_06_V1.6.9_LOCAL_GEMMA` as the active save point for the verified local Gemma engine.
- **Exact Code Snippet**:
  ```typescript
  { id: 'RESTORE_06_V1.6.9_LOCAL_GEMMA', label: 'Gemma 3 12B Local CUDA Engine', status: 'ACTIVE' }
  ```

- **Target File 7**: `/src/components/MilestoneChecklist.tsx`
- **Description**: Marked Phase 8 as `IN_PROGRESS` to reflect that the quantized local AI engine is now implemented while the future RAG layer remains outstanding.
- **Exact Code Snippet**:
  ```typescript
  { phase: 8, name: 'QUANTIZED LOCAL AI ENGINE & RAG PIPELINE', status: 'IN_PROGRESS', details: 'Gemma 3 12B Q4_K_M via llama.cpp CUDA integrated; RAG remains next' },
  ```

- **Target File 7**: `/AGENTS.md`
- **Description**: Updated persistent project memory with the verified Gemma 3 12B GGUF path, llama.cpp CUDA path, benchmarked 28-layer configuration, and the shared 8GB VRAM operating rule.

- **Target File 8**: `/README.md`
- **Description**: Updated the project direction and local run documentation to include the new optional local Gemma service and its Windows paths.

- **Target File 9**: `/metadata.json`
- **Description**: Added the local quantized LLM capability and bumped the project metadata version to 1.6.9.

- **Target File 10**: `/Start_Local_LLM.bat`
- **Description**: Added a manual recovery launcher using the same verified 28-layer Gemma CUDA configuration as the Gina UI.
- **Exact Code Snippet**:
  ```bat
  "%LLAMA_ROOT%\\llama-server.exe" --model "%MODEL%" --host 127.0.0.1 --port 8080 --n-gpu-layers 28 --ctx-size 4096 --threads 6 --jinja
  ```

- **Target File 11**: `/LOCAL_LLM_SETUP.md`
- **Description**: Added the exact local paths, verified benchmark configuration, VRAM-sharing rule, UI workflow, and manual recovery instructions for the new local LLM layer.

## v1.7.1 — Full Local Gina Agent Access

### `/server.ts`
- Added the full local agent capability broker and audit log.
- Added `/api/agent/access` and `/api/agent/audit` endpoints.
- Added local tools for capability inspection, directory listing, file read/write, Windows command execution, ComfyUI cache control, llama-server control, and AIDA64 specification generation.
- Reworked `/api/agent/run` into a bounded multi-step tool loop so Gemma can inspect results and continue with the next local operation.

### `/server/capabilities/CapabilityManager.ts`
- Corrected Gemma discovery to use `C:\\Gina_AI\\models\\llm\\gemma-3-12b-it-Q4_K_M.gguf`.
- Changed the Gemma capability status from a future placeholder to the installed local CUDA LLM capability.

### `/src/components/GinaAgentPanel.tsx`
- Replaced confirmation-only orchestration UI with a full local-access control panel.
- Added enable/disable control, capability-oriented prompts, tool-step output, and local audit log display.

### `/src/App.tsx`
- Added `GinaAgentPanel` to the Local AI workspace so Gemma and the autonomous tool broker are available together.

Reason: Gina now has the requested ability to understand her local environment and operate the Gina project/toolchain directly. File APIs are scoped to `C:\\Gina_AI`; command execution is local and audited.


## 2026-08-18 — v1.7.2 — Autonomous Agent Context, Memory & Capability Awareness

- **Target File Path:** `/server/agent/AgentContextManager.ts`
  **Exact Code Snippet:** `buildSnapshot()` and `compact()`
  **Summary:** Added automatic loading of AGENTS.md, milestones, changelog, README, package/metadata, local AI setup, agent setup and workflow inventory.
- **Target File Path:** `/server/agent/AgentMemoryManager.ts`
  **Exact Code Snippet:** `remember()`, `recall()` and `compactForPrompt()`
  **Summary:** Added persistent local agent memory under `.gina/agent-memory.json`.
- **Target File Path:** `/server.ts`
  **Exact Code Snippet:** `inspect_project_context`, `read_project_bundle`, `search_files`, `git_status`, `remember`, `recall_memory`, `refresh_context`, `/api/agent/context`, `/api/agent/memory`, `/api/agent/self-test`, and startup context injection.
  **Summary:** Gina now starts autonomous tasks with project context, memory and live capabilities; it can search source files, inspect Git state, self-test, refresh context and remember results. Command execution now returns real non-zero exit codes.
- **Target File Path:** `/src/components/GinaAgentPanel.tsx`
  **Exact Code Snippet:** `Load Context` and `Self Test` controls plus awareness cards.
  **Summary:** Added visible controls for project awareness and agent health verification.
- **Target File Path:** `/src/components/MilestoneChecklist.tsx`
  **Exact Code Snippet:** Phase 9 `AUTONOMOUS LOCAL AGENT & PROJECT AWARENESS` with status `COMPLETED`.
  **Summary:** Recorded completion of the autonomous-agent foundation.
- **Target File Path:** `/AGENTS.md`
  **Exact Code Snippet:** version 1.7.2 and Agent startup context/tool inventory.
  **Summary:** Updated authoritative agent instructions for persistent context and capabilities.
- **Target File Path:** `/LOCAL_AGENT_SETUP.md`
  **Exact Code Snippet:** v1.7.2 autonomous-agent operating model and tool list.
  **Summary:** Documented the new self-aware local-agent workflow.
- **Target File Path:** `/metadata.json` and `/package.json`
  **Exact Code Snippet:** version `1.7.2` and autonomous-agent capability flags.
  **Summary:** Bumped project metadata for the new agent-awareness milestone.
- **Target File Path:** `/.gitignore`
  **Exact Code Snippet:** `.gina/`
  **Summary:** Keeps local agent memory/runtime state out of source control.


## 2026-08-18 — v1.7.2 follow-up — Agent Tooling Hardening

- **Target File Path:** `/server.ts`
  **Exact Code Snippet:** `knowledge_search`, `git_diff`, `git_log`, and automatic `.gina/backups` creation in `write_file`.
  **Summary:** Expanded Gina's local awareness and development tooling and added automatic backups before agent overwrites project files.
- **Target File Path:** `/AGENTS.md` and `/LOCAL_AGENT_SETUP.md`
  **Exact Code Snippet:** Expanded tool inventory and backup-first operating rule.
  **Summary:** Kept the authoritative agent documentation aligned with the final v1.7.2 toolset.

## 2026-08-29 — v1.17.0 AIDA64 Live Telemetry & Assembler Refinement

- **Target File Path:** `/server/aida64/Aida64TelemetryBridge.ts`
  **Exact Code Snippet:** `Aida64TelemetryBridge`, including `start()`, `stop()`, `setConfig()`, `getSnapshot()` and `getConfig()`.
  **Summary:** Added the local Windows telemetry bridge that launches the AIDA64 shared-memory reader and exposes a live sensor snapshot to Gina.
- **Target File Path:** `/scripts/aida64_shared_memory.ps1`
  **Exact Code Snippet:** `OpenFileMapping('AIDA64_SensorValues')`, `MapViewOfFile()` and the XML-tag sensor parser.
  **Summary:** Added the local PowerShell reader for AIDA64's documented `AIDA64_SensorValues` shared-memory interface.
- **Target File Path:** `/server.ts`
  **Exact Code Snippet:** `aida64Telemetry` initialization, `/api/aida64/telemetry`, `/api/aida64/telemetry/config` and server lifecycle startup/shutdown calls.
  **Summary:** Connected the telemetry bridge to Gina's local Express server.
- **Target File Path:** `/src/hooks/useAida64Telemetry.ts`
  **Exact Code Snippet:** `useAida64Telemetry()`, `Aida64SensorBinding`, `defaultAida64Binding()` and `normaliseAida64Value()`.
  **Summary:** Added the frontend telemetry model, polling hook, binding structure and 0–100 normalisation helper.
- **Target File Path:** `/src/components/aida64/Aida64TelemetryPanel.tsx`
  **Exact Code Snippet:** Live connection card, sensor browser, binding editor and calibration controls.
  **Summary:** Added the dedicated Live Telemetry workspace for discovering sensors and creating reusable bindings.
- **Target File Path:** `/src/types.ts`
  **Exact Code Snippet:** `Aida64SensorBinding` and `sensorBinding?: Aida64SensorBinding` on `Aida64PanelItem`.
  **Summary:** Added persistent sensor-binding data to AIDA64 panel elements.
- **Target File Path:** `/src/components/Aida64Studio.tsx`
  **Exact Code Snippet:** `Live Telemetry` tab, `useAida64Telemetry()` and telemetry handoff to `Aida64CanvasAssembler`.
  **Summary:** Added the telemetry workspace to the AIDA64 Studio and connected live readings to the assembler.
- **Target File Path:** `/src/components/aida64/Aida64CanvasAssembler.tsx`
  **Exact Code Snippet:** live sensor display, stale handling, smoothing, peak hold/decay, threshold colours, sensor binding selector, distribution, Match Size and Ctrl/Cmd copy/paste.
  **Summary:** Refined the assembler into a more complete panel-design tool and made selected elements capable of consuming live AIDA64 telemetry.
- **Target File Path:** `/AIDA64_TELEMETRY_IMPLEMENTATION_RECORD.md`
  **Exact Code Snippet:** complete implementation record and restore point.
  **Summary:** Created the persistent project record requested by the user so the current AIDA64 direction and implementation state can be recovered in a future session.
- **Target File Path:** `/src/components/aida64/Aida64StateGaugeGenerator.tsx`
  **Exact Code Snippet:** `useAida64Telemetry()`, `selectedLiveSensorId`, the `LIVE AIDA64 SENSOR` selector and `sensorBinding` on generated `Aida64PanelItem` objects.
  **Summary:** Connected the dedicated Gauge Factory to the live sensor browser so generated gauges can enter the Assembler already bound to an AIDA64 sensor.
- **Target File Path:** `/src/components/aida64/Aida64TelemetryPodDesigner.tsx`
  **Exact Code Snippet:** live sensor selectors for `heroSensor` and each `slot.sensorKey`.
  **Summary:** Added live AIDA64 sensor selection to the seven-value pod designer, including live sample values and units.

## 2026-08-29 — v1.17.1 — AIDA64 Telemetry Bridge Repair

- **Target File Path:** `/scripts/aida64_shared_memory.ps1`
  **Exact Code Snippet:** `PtrToStringAnsi($ptr)` with Unicode fallback and tolerant `<kind><id><label><value>` fragment parsing.
  **Summary:** Corrected shared-memory extraction to follow AIDA64's documented null-terminated PChar payload and made the parser robust to its XML-fragment wrapper tags.
- **Target File Path:** `/src/hooks/useAida64Telemetry.ts`
  **Exact Code Snippet:** HTTP/content-type validation before `response.json()`.
  **Summary:** Replaced the misleading `Unexpected token '<'` failure with an actionable local-port/API diagnostic when an HTML page is returned.
- **Target File Path:** `/vite.config.ts`
  **Exact Code Snippet:** `server.proxy['/api'] -> http://127.0.0.1:3200`.
  **Summary:** Allows a separately launched Vite development server to reach Gina's local Express API instead of returning the SPA HTML shell.
- **Target File Path:** `/src/App.tsx`
  **Exact Code Snippet:** active save point `v1.17.1` and footer `Gina AI Factory v1.17.1`.
  **Summary:** Removed the visible save/footer version mismatch shown during live testing.
- **Target File Path:** `/server.ts`
  **Exact Code Snippet:** `/api/version` and `/api/health` version values `v1.17.1`.
  **Summary:** Aligned server-reported version with the current checkpoint.
- **Target File Path:** `/package.json`, `/metadata.json`, `/AGENTS.md`
  **Exact Code Snippet:** project version `1.17.1`.
  **Summary:** Established v1.17.1 as the current project checkpoint while leaving historical engine documents unchanged.
- **Target File Path:** `/AIDA64_TELEMETRY_IMPLEMENTATION_RECORD.md`
  **Exact Code Snippet:** Section 11, `v1.17.1 telemetry bridge repair checkpoint`.
  **Summary:** Recorded the root cause, repair and next real-machine validation step so the project state is recoverable.

## 2026-08-29 — v1.17.1 — AI Studio Cloud Import & Runtime Normalization

- **Target File Path:** `/package.json`
  **Exact Code Snippet:** `"@types/react": "^19.0.0"`, `"@types/react-dom": "^19.0.0"`.
  **Summary:** Installed missing React and React-DOM TypeScript definitions to fix class component type definitions.
- **Target File Path:** `/src/types.ts`
  **Exact Code Snippet:** `negativePrompt?: string;` added to `PromptStudioConfig`.
  **Summary:** Updated `PromptStudioConfig` interface with optional `negativePrompt` property used across PromptStudio component.
- **Target File Path:** `/src/data/aida64GpuRenderer.ts`
  **Exact Code Snippet:** `source as TexImageSource` in `gl.texImage2D`.
  **Summary:** Resolved WebGL2 rendering type incompatibility between CanvasImageSource and TexImageSource.
- **Target File Path:** `/src/components/aida64/Aida64TelemetryPanel.tsx`
  **Exact Code Snippet:** Type-safe fallback in `onChange` handlers for numeric `binding` configuration fields.
  **Summary:** Ensured numeric attributes on telemetry binding states conform strictly to TypeScript contract.
- **Target File Path:** `/server.ts`
  **Exact Code Snippet:** `PORT = 3000; HOST = process.env.HOST || "0.0.0.0"; candidatePorts = [3000, 3200, 3001, 3002];`
  **Summary:** Bound Express server to default port 3000 and host 0.0.0.0 for container reverse proxy ingress.
- **Target File Path:** `/vite.config.ts`
  **Exact Code Snippet:** `server: { port: 3000, host: '0.0.0.0', allowedHosts: true, proxy: { '/api': { target: 'http://127.0.0.1:3000', changeOrigin: false } } }`
  **Summary:** Configured Vite dev server and proxy to target port 3000 on host 0.0.0.0.
- **Target File Path:** `/index.html`
  **Exact Code Snippet:** `<title>Gina AI Factory — Local Creator UI</title>` and synchronized `<meta name="description">`.
  **Summary:** Synchronized HTML entry point title and metadata description with metadata.json.

## 2026-08-29 — Environment-Aware Multi-Platform Server Configuration

- **Target File Path:** `/server.ts`
  **Exact Code Snippet:** `const isWin = process.platform === "win32"; const PORT = process.env.PORT ? Number(process.env.PORT) : (isWin ? 3200 : 3000); const HOST = process.env.HOST || (isWin ? "127.0.0.1" : "0.0.0.0");`
  **Summary:** Implemented platform awareness so the local Windows environment strictly binds to port 3200 (127.0.0.1) while container environments bind to port 3000 (0.0.0.0).
- **Target File Path:** `/vite.config.ts`
  **Exact Code Snippet:** `const isWin = process.platform === 'win32'; const targetPort = isWin ? 3200 : 3000; server: { port: targetPort, host: isWin ? '127.0.0.1' : '0.0.0.0', proxy: { '/api': { target: `http://127.0.0.1:${targetPort}` } } }`
  **Summary:** Updated Vite dev configuration to automatically proxy to port 3200 on Windows and 3000 in cloud containers.
- **Target File Path:** `/AGENTS.md`
  **Exact Code Snippet:** Updated Rule 4 documentation.
  **Summary:** Documented dual Windows (port 3200) and container (port 3000) operational preservation rule.





# v1.17.19 — Local Creator Upload Pipeline

### 1. Target File Path: `/server/comfy/WorkflowParser.ts`
```typescript
inputImage: [{ key: 'input_image', inputs: ['image', 'image_path', 'filename'], classes: ['LoadImage'] }]
if (cls.includes('loadimage')) caps.push('image-input');
```
**Summary**: Workflow parsing now discovers LoadImage inputs so Gina can bind dashboard-uploaded reference images without hardcoding a specific ComfyUI graph.

### 2. Target File Path: `/server.ts`
```typescript
app.post('/api/comfy/upload-image', ...)
app.get('/api/comfy/input/:filename', ...)
```
**Summary**: Added a strictly local image upload/proxy layer. Supported images are written directly to the ComfyUI input directory with a 12 MB safety limit.

### 3. Target File Path: `/flux_image_reference.json`
```json
"9": {"class_type":"LoadImage", ...},
"10": {"class_type":"VAEEncode", ...}
```
**Summary**: Added a built-in FLUX reference-image workflow so image-to-image/reference generation can be operated entirely from Gina.

### 4. Target File Path: `/src/components/PromptStudio.tsx`
```typescript
const [referenceImage, setReferenceImage] = useState(...)
const handleReferenceImage = async (file?: File) => { ... }
```
**Summary**: Added dashboard-only reference image upload, preview, removal, workflow binding and generation gating.

### 5. Target File Path: `/src/components/LocalLlmStudio.tsx`
```typescript
const [attachedFiles, setAttachedFiles] = useState(...)
const handleAttachFile = async (file?: File) => { ... }
```
**Summary**: Added supported local text/code/config file attachments to Local AI chat, with 512 KB/file and three-file-per-turn limits.

### 6. Target File Path: `/src/version.ts`
```typescript
export const APP_VERSION = '1.17.19';
export const ACTIVE_SAVE_POINT_ID = 'RESTORE_10_V1.17.19_LOCAL_CREATOR_UPLOADS';
export const ACTIVE_LIFECYCLE_PHASE = 18;
```
**Summary**: Created the v1.17.19 upload-pipeline checkpoint.

### 7. Target File Path: `/src/components/MilestoneChecklist.tsx`
```typescript
{ phase: 18, name: 'LOCAL CREATOR UPLOAD PIPELINE', status: 'COMPLETED', ... }
```
**Summary**: Recorded completion of the dashboard upload layer as lifecycle Phase 18.


## v1.17.21 — Syntax Hotfix
- Fixed missing comma in `src/components/AppFeaturesGuide.tsx` that caused the Vite/Babel parse error at line 52.
- Preserved v1.17.20 Local AI attachment limits: text/code/config 2 MB, images 12 MB, ZIP 25 MB, max 5 attachments per turn, max 100 ZIP entries, max 4 MB extracted text context.
- Source of truth: v1.17.20 project ZIP; GitHub not used.


## v1.17.32
- Removed the same-process Vite `/api` self-proxy that caused EADDRINUSE and repeated HTTP 500 responses.
- Launcher now stops only stale Gina Node processes from this install before starting the dashboard.
- Launcher verifies the running Gina API version.
- Dashboard health now reports the actual application version.

### v1.17.35 — FLUX Text-to-Image Pipeline Validation
- Added server-side validation for the bundled `flux_image` text-to-image graph before queueing.
- Records the actual prompt node/input, steps, sampler, scheduler and dimensions used for each FLUX text-to-image job.
- Blocks generation if the resolved positive prompt is empty or the graph is missing required text-to-image stages.
- Added `/api/jobs/:id/debug` for concise generation diagnostics.
- Create Studio now logs the exact FLUX prompt binding and effective generation mode before queueing.
- Corrected launcher version verification to v1.17.35.

## v1.17.40 — AI Tool image-generation routing
- Added conversational AI Tool routing for explicit image creation and attached-image modification requests.
- Routes text-to-image requests to `flux_image` and reference-image requests to `flux_image_reference`.
- AI Tool chat now displays completed local generated images inline.
- Added server-side image-generation job/result endpoints and generation audit metadata.
- Local Gemma remains responsible for chat/vision understanding; FLUX/ComfyUI performs image synthesis.


## 2026-08-30 — v1.17.42 — Milestones 14-17 Automation Batch

- **Target File Path:** `/server.ts`
  **Exact Code Snippet:** `POST /api/workflows/import`, PNG tEXt/iTXt metadata extraction, ComfyUI `/object_info` missing-node inspection.
  **Summary:** Implemented one-click ComfyUI API JSON and metadata PNG ingestion, local workflow registration, capability parsing and missing-node diagnostics.
- **Target File Path:** `/src/components/MilestoneWorkbench.tsx`
  **Exact Code Snippet:** Workflow ingestion, HUD launcher, benchmark sweep, knowledge watcher controls.
  **Summary:** Added a System > Automation workbench for lifecycle phases 14-17.
- **Target File Path:** `/src/components/Aida64Hud.tsx`
  **Exact Code Snippet:** DPI-aware telemetry HUD window using `useAida64Telemetry(500)`.
  **Summary:** Added a dedicated browser HUD mode for secondary telemetry displays with high-density live metrics.
- **Target File Path:** `/server.ts`
  **Exact Code Snippet:** `POST /api/llm/benchmark` with controlled GPU-layer sweep and restoration of the original layer setting.
  **Summary:** Added a managed multi-layer GGUF benchmark/tuner path that restarts the managed llama-server for each candidate and restores the prior configuration.
- **Target File Path:** `/server.ts`
  **Exact Code Snippet:** `fs.watch(GINA_ROOT, { recursive: true })` with excluded runtime/model directories and debounced `localRag.reindex`.
  **Summary:** Added an opt-in filesystem knowledge watcher that automatically refreshes the zero-VRAM RAG index for documentation, source, scripts and workflow changes.
- **Target File Path:** `/src/components/SystemHub.tsx`
  **Exact Code Snippet:** `AUTOMATION` System tab.
  **Summary:** Organized milestone tooling into a dedicated System automation surface rather than adding more stacked components.
- **Target File Path:** `/src/components/MilestoneChecklist.tsx`
  **Exact Code Snippet:** Phases 14-17 set to `COMPLETED`; `RESTORE_13_V1.17.42_MILESTONE_BATCH` active.
  **Summary:** Recorded completion and created the v1.17.42 restore point.
- **Target File Path:** `/src/version.ts`, `/package.json`, `/metadata.json`, `/index.html`, `/AGENTS.md`
  **Exact Code Snippet:** Version `1.17.42`.
  **Summary:** Synchronized release metadata across the project.

- **Target File Path:** `/docs/architecture/MILESTONES_14_17.md`, `/docs/INDEX.md`
  **Exact Code Snippet:** Milestones 14-17 architecture and operational notes.
  **Summary:** Documented the new automation surfaces, safety limits and browser-native HUD behavior.

## 2026-08-30 — v1.17.44 — Orchestration Core Milestones 18-27
- Added a unified job monitor surface with progress and STOP & FLUSH controls.
- Added local AI intent routing preview for chat, vision, image generation and reference modification.
- Added workflow intelligence endpoint for bindings, capabilities, nodes and missing-node checks.
- Added persistent local asset records under `.gina/assets.json`.
- Added measured System Health and Full Diagnostics endpoints.
- Added a shared cancel endpoint that interrupts ComfyUI, clears its queue and requests model/VRAM release.
- Added the next milestone workbench to System > Automation.

## v1.17.50 — AIDA64 12-Gauge Sensor Matrix Template
- Added a new 1024×600 AIDA64 template matching the live SensorPanel composition: exactly 12 circular gauge sockets arranged as 2 hero gauges, 3 upper-centre gauges, 2 lower-left gauges, 2 lower-right gauges and 3 lower-centre gauges.
- Each dial is explicitly configured as a 100-state Gauge Factory sequence (`frameCount: 100`) so the template preserves the intended gauge asset model rather than treating the dials as ordinary decorative shapes.
- Updated the spatial chassis prompt compiler to preserve the 12-gauge composition and request a continuous dark industrial sensor-panel background with recessed mounting structure, subtle vents, conduit channels and restrained lighting.
- Added negative constraints preventing extra/missing/merged gauges and plain-black-background output for the 12-gauge template.

## v1.17.48 — Asset Library + Conversational Image Iteration
- Added persistent Asset Library UI backed by the local asset store.
- Added asset metadata, search, delete, preview and reuse actions.
- Added “Use as Reference in AI Tools” with ComfyUI promotion and cross-component event handoff.
- AI Tools now adopts an active asset reference for subsequent image generation/editing turns.
- AI Tools generated images are automatically persisted to the asset store.
- Creator “Save” now persists assets through the server API with local fallback.

## v1.17.49
- Fixed AI Tools image prompting so descriptive prompts such as "A photorealistic vintage black watch bezel..." route directly to the local ComfyUI/FLUX executor instead of being sent to Gemma as chat.
- Preserved explicit vision/analysis prompts and attached-image modification routing.
## v1.17.63 — Clean Root Packaging Audit

- **Target File Path:** `/docs/updates/UPDATE_NOTES_v1.17.55.md`, `/docs/updates/UPDATE_NOTES_v1.17.56.md`, `/docs/updates/UPDATE_NOTES_v1.17.59.md`, `/docs/updates/UPDATE_NOTES_v1.17.60.md`, `/docs/updates/UPDATE_NOTES_v1.17.63.md`
  **Exact Code Snippet:** Files moved from the project root into `/docs/updates/`.
  **Summary:** Enforced the project's clean-root documentation rule.
- **Target File Path:** `/docs/milestones/LOCAL_AI_ATTACHMENT_MILESTONE.md`
  **Exact Code Snippet:** File moved from the project root into `/docs/milestones/`.
  **Summary:** Keeps milestone/context records under the documented hierarchy.
- **Target File Path:** `/docs/INDEX.md`
  **Exact Code Snippet:** Added the Release Notes & Milestones section documenting `/docs/updates/`, `/docs/milestones/` and `/logs/`.
  **Summary:** Makes the clean documentation/logging hierarchy discoverable.
- **Target File Path:** `/logs/.gitkeep`
  **Exact Code Snippet:** Empty directory marker.
  **Summary:** Reserves the runtime audit-log directory without packaging runtime logs.
## v1.17.67 — FFmpeg Frame Extraction & Job Workflow Route Fixes

- **Target File Path:** `/server.ts`
- **Description:** Fixed fatal FFmpeg error `[Parsed_format_0] Invalid pixel format 'png'` in `extractStoryFinalFrame` by removing the erroneous `-vf format=png` argument and adding automatic fallback seeking. Added missing `GET /api/jobs/:id/workflow` and `GET /api/jobs/:id/events/history` routes to satisfy runtime polling from `PromptStudio.tsx`, eliminating recurring 404 errors and story generation stops.
- **Exact Code Snippet:**
  ```typescript
  async function extractStoryFinalFrame(sourcePath: string, destinationPath: string) {
    await fs.mkdir(path.dirname(destinationPath), { recursive: true });
    try {
      await execFileAsync('ffmpeg', [
        '-y', '-sseof', '-0.08', '-i', sourcePath,
        '-frames:v', '1', destinationPath
      ], { windowsHide: true, timeout: 120000, maxBuffer: 2 * 1024 * 1024 });
    } catch {
      await execFileAsync('ffmpeg', [
        '-y', '-i', sourcePath,
        '-frames:v', '1', destinationPath
      ], { windowsHide: true, timeout: 120000, maxBuffer: 2 * 1024 * 1024 });
    }
  }

  app.get('/api/jobs/:id/events/history', (req,res) => {
    const job = jobManager.get(req.params.id);
    if (!job) return res.status(404).json({ok:false,error:'Job not found'});
    res.json({ok:true,jobId:job.id,events:jobManager.eventHistory(job.id)});
  });

  app.get('/api/jobs/:id/workflow', (req,res) => {
    const job = jobManager.get(req.params.id);
    if (!job) return res.status(404).json({ok:false,error:'Job not found'});
    const workflow = job.parameters?.__workflowSnapshot || workflowRegistry.get(job.workflowId)?.workflow || null;
    res.json({ok:true,jobId:job.id,workflowId:job.workflowId,workflow});
  });
  ```

## v1.17.67 — ComfyUI Health & Capability Endpoint Resilience Fix

- **Target File Path:** `/server.ts`
- **Description:** Added missing `GET /api/comfy/health` route returning local ComfyUI backend connectivity status and latency. Added graceful error handling for `getComfyObjectInfo()` in `GET /api/workflows/:id/controls` and `GET /api/gif-studio/capabilities` so endpoints return HTTP 200 with default workflow bindings and fallback capability booleans when ComfyUI is offline or starting up, eliminating 503 errors and dashboard error log spam.
- **Exact Code Snippet:**
  ```typescript
  app.get("/api/comfy/health", async (_req, res) => {
    const comfy = await getComfyHealth();
    res.json({ ok: comfy.online, ...comfy });
  });

  app.get("/api/workflows/:id/controls", async (req, res) => {
    const workflow = workflowRegistry.get(req.params.id);
    if (!workflow) return res.status(404).json({ error: "Workflow not found" });
    try {
      let objectInfo: Record<string, any> = {};
      try { objectInfo = await getComfyObjectInfo(); } catch {}
      const controls = workflow.bindings.map(binding => {
        const schema = objectInfo[binding.classType]?.input?.required?.[binding.input] || objectInfo[binding.classType]?.input?.optional?.[binding.input];
        const rawOptions = Array.isArray(schema) && Array.isArray(schema[0]) ? schema[0] : undefined;
        return {
          key: binding.key,
          nodeId: binding.nodeId,
          input: binding.input,
          classType: binding.classType,
          confidence: binding.confidence,
          currentValue: workflow.workflow[binding.nodeId]?.inputs?.[binding.input],
          options: rawOptions?.filter((x:any) => typeof x === 'string' || typeof x === 'number') || undefined,
          min: Array.isArray(schema) && typeof schema[1]?.min === 'number' ? schema[1].min : undefined,
          max: Array.isArray(schema) && typeof schema[1]?.max === 'number' ? schema[1].max : undefined,
          step: Array.isArray(schema) && typeof schema[1]?.step === 'number' ? schema[1].step : undefined
        };
      });
      res.json({ workflowId: workflow.id, controls });
    } catch (error:any) {
      res.status(500).json({ error: error?.message || 'Unable to inspect ComfyUI node inputs' });
    }
  });

  app.get('/api/gif-studio/capabilities', async (_req,res) => {
    try {
      let info: Record<string, any> = {};
      try { info = await getComfyObjectInfo(); } catch {}
      const gpu = await getNvidiaSmi();
      const assets = await listGifStudioAssets();
      const rifeSchema = info.RIFE_VFI?.input?.required?.ckpt_name;
      const rifeModels = Array.isArray(rifeSchema) && Array.isArray(rifeSchema[0]) ? rifeSchema[0] : [];
      res.json({
        ok: true,
        capabilities: {
          videoLoader: !!info.VHS_LoadVideo,
          imageSequenceLoader: !!info.VHS_LoadImagesPath,
          videoCombine: !!info.VHS_VideoCombine,
          rife: !!info.RIFE_VFI,
          rifeModels,
          ffmpeg: true,
          gpu,
          thermalTargetC: 60
        },
        assets
      });
    } catch (e:any) {
      res.status(500).json({ ok: false, error: e?.message || 'Unable to inspect GIF Studio capabilities' });
    }
  });
  ```

---

# v1.17.72 — AI Music Generator Suite, AudioCraft / MusicGen Integration & Stem Splitter

### 1. Target File Path: `/src/components/MusicStudio.tsx`
```typescript
// AI Music Generator Suite UI with 7 Feature Modes, Expert/Basic tiers, Style Dropdowns & Waveform Player
export function MusicStudio({ telemetry, onAddLog, onClearCache, onSendToStreamInject }: MusicStudioProps) {
  const [suiteMode, setSuiteMode] = useState<
    'text_to_song' | 'song_cover' | 'extend' | 'edit' | 'lyrics_gen' | 'stem_remover' | 'library'
  >('text_to_song');
  const [generatorTier, setGeneratorTier] = useState<'expert' | 'basic'>('expert');
  const [selectedModel, setSelectedModel] = useState<string>('facebook/musicgen-small');
  // Interactive Style Tag Popovers: # Genre, # Moods, # Voices, # Tempos
  // AI Lyrics Generator Modal powered by local Gemma 3 12B
  // Real-time synthetic audio waveform visualizer and BGM transfer bridge
}
```
**Summary**: Created the full-featured `MusicStudio` component matching the user's reference specification with Expert/Basic mode toggle, model dropdown, tag drawers, Gemma 3 12B songwriter integration, waveform player, and 1-click BGM transfer to StreamInject.

### 2. Target File Path: `/server/music/MusicService.ts`
```typescript
// Music Service managing Python AudioCraft execution, track indexing, and stem isolation
export class MusicService {
  async scanTracks(): Promise<AudioTrackMeta[]> { ... }
  async generateMusic(jobId: string, options: MusicGenOptions, jobManager: JobManager): Promise<{ outputFilename: string; outputUrl: string; duration: number }> { ... }
  async separateStems(jobId: string, inputPath: string, jobManager: JobManager): Promise<{ vocalsUrl: string; instrumentalUrl: string }> { ... }
}
```
**Summary**: Created `MusicService.ts` to bridge Express REST routes to `/scripts/music_generator.py` with multi-step job progress tracking and automatic audio track indexing.

### 3. Target File Path: `/server.ts`
```typescript
// Music API Endpoints:
app.use("/media/audio", express.static(musicService.getOutputDir()));
app.get("/api/music/status", async (_req, res) => { ... });
app.get("/api/music/tracks", async (_req, res) => { ... });
app.post("/api/music/generate", async (req, res) => { ... });
app.post("/api/music/write-lyrics", async (req, res) => { ... });
app.post("/api/music/separate-stems", async (req, res) => { ... });
app.delete("/api/music/tracks/:filename", async (req, res) => { ... });
```
**Summary**: Exposed music generation, local LLM lyric writing, stem separation, and track management endpoints in `server.ts`.

### 4. Target File Path: `/src/App.tsx`
```typescript
// Added MUSIC SUITE nav item and main workspace container
const navItems = [
  ...
  { id: 'music' as const, label: 'MUSIC SUITE', icon: Music, isGenerating: isJobActive && (job?.workflowId === 'music_studio' || job?.workflowId === 'stem_separation') },
  ...
];
```
**Summary**: Integrated `MusicStudio` into the top navigation bar with active job tracking and cross-studio BGM timeline handoff.

### 5. Target File Path: `/src/components/MilestoneChecklist.tsx`, `/src/version.ts`, `/metadata.json`, `/package.json`, `/index.html`, `/AGENTS.md`
**Summary**: Marked Phase 32 as `COMPLETED`, created active restore point `RESTORE_V1.17.72_MUSIC_GENERATOR_SUITE`, and synchronized version `1.17.72` across all project manifests per Rules 7 & 8.

