import React, { useState, useEffect, useRef } from "react";
import {
  Film,
  Layers,
  Sparkles,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  Tv,
  Smartphone,
  Flame,
  Zap,
  Volume2,
  FileVideo,
  Eye,
  Settings2,
  Trash2,
  Plus,
  Compass,
  Maximize2
} from "lucide-react";

interface TextLayer {
  text: string;
  size: number;
  color: string;
  animation: "bounce" | "flicker" | "static";
  x?: number;
  y?: number;
}

interface VideoBox {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  border_color?: string;
}

interface ProfileCircle {
  x: number;
  y: number;
  radius: number;
  pulse?: boolean;
  glow_color?: string;
}

interface Preset {
  id: string;
  name: string;
  description: string;
  aspectRatio: "16:9" | "9:16";
  config: {
    width: number;
    height: number;
    duration: number;
    fps: number;
    background: { type: "radial" | "linear" | "image"; max_red?: number; image_path?: string };
    text_layers: TextLayer[];
    video_boxes: VideoBox[];
    profile_circles: ProfileCircle[];
    vfx: {
      enable_glitch: boolean;
      enable_shake: boolean;
      enable_bloom: boolean;
      enable_chroma: boolean;
    };
  };
}

interface MediaAsset {
  name: string;
  path: string;
  source: string;
  sizeBytes?: number;
}

export function StreamInjectStudio() {
  const [activeTab, setActiveTab] = useState<"studio" | "pipeline" | "history">("studio");
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("16:9");
  
  // Studio Canvas State
  const [canvasWidth, setCanvasWidth] = useState(1920);
  const [canvasHeight, setCanvasHeight] = useState(1080);
  const [duration, setDuration] = useState(10.0);
  const [bgType, setBgType] = useState<"radial" | "linear" | "image">("radial");
  const [bgMaxRed, setBgMaxRed] = useState(55);
  
  const [textLayers, setTextLayers] = useState<TextLayer[]>([
    { text: "THANKS FOR WATCHING", size: 68, color: "#FFFFFF", animation: "bounce", x: 960, y: 140 },
    { text: "SUBSCRIBE FOR NEXT MISSION", size: 30, color: "#00FFFF", animation: "flicker", x: 960, y: 220 }
  ]);

  const [videoBoxes, setVideoBoxes] = useState<VideoBox[]>([
    { x: 140, y: 360, width: 620, height: 350, label: "PREVIOUS VIDEO", border_color: "#00FFFF" },
    { x: 1160, y: 360, width: 620, height: 350, label: "RECOMMENDED", border_color: "#FF0055" }
  ]);

  const [profileCircles, setProfileCircles] = useState<ProfileCircle[]>([
    { x: 960, y: 535, radius: 130, pulse: true, glow_color: "#00FFFF" }
  ]);

  const [vfxGlitch, setVfxGlitch] = useState(true);
  const [vfxShake, setVfxShake] = useState(true);
  const [vfxBloom, setVfxBloom] = useState(true);
  const [vfxChroma, setVfxChroma] = useState(true);

  // Master Pipeline State
  const [gameplayPath, setGameplayPath] = useState<string>("");
  const [introPath, setIntroPath] = useState<string>("");
  const [outroPath, setOutroPath] = useState<string>("");
  const [pipelineAspect, setPipelineAspect] = useState<"original" | "short">("original");
  const [splitStart, setSplitStart] = useState<number>(0);
  const [splitEnd, setSplitEnd] = useState<number>(0);
  const [chromaOverlay, setChromaOverlay] = useState<string>("");
  const [overlayStart, setOverlayStart] = useState<number>(5);
  const [watermarkPath, setWatermarkPath] = useState<string>("");
  const [watermarkPos, setWatermarkPos] = useState<"TL" | "TR" | "BL" | "BR">("TR");
  const [subtitlePath, setSubtitlePath] = useState<string>("");

  // Presets and Media
  const [presets, setPresets] = useState<Preset[]>([]);
  const [mediaFiles, setMediaFiles] = useState<{ videos: MediaAsset[]; images: MediaAsset[]; subtitles: MediaAsset[] }>({
    videos: [],
    images: [],
    subtitles: []
  });

  // Render & Job State
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<number>(0);
  const [jobStep, setJobStep] = useState<string>("");
  const [jobError, setJobError] = useState<string | null>(null);
  const [completedVideoUrl, setCompletedVideoUrl] = useState<string | null>(null);

  // Interactive Live Canvas Simulation
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0.0);
  const [showGuides, setShowGuides] = useState(true);

  // Fetch presets and media files on mount
  useEffect(() => {
    fetchPresets();
    fetchMediaFiles();
  }, []);

  const fetchPresets = async () => {
    try {
      const res = await fetch("/api/streaminject/presets");
      const data = await res.json();
      if (data.ok && Array.isArray(data.presets)) {
        setPresets(data.presets);
      }
    } catch (e) {
      console.warn("Failed to fetch presets", e);
    }
  };

  const fetchMediaFiles = async () => {
    try {
      const res = await fetch("/api/streaminject/media-files");
      const data = await res.json();
      if (data.ok) {
        setMediaFiles({
          videos: data.videos || [],
          images: data.images || [],
          subtitles: data.subtitles || []
        });
        if (data.videos.length > 0 && !gameplayPath) {
          setGameplayPath(data.videos[0].path);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch media files", e);
    }
  };

  const applyPreset = (preset: Preset) => {
    setAspectRatio(preset.aspectRatio);
    setCanvasWidth(preset.config.width);
    setCanvasHeight(preset.config.height);
    setDuration(preset.config.duration);
    setBgType(preset.config.background.type);
    setBgMaxRed(preset.config.background.max_red || 55);
    setTextLayers(preset.config.text_layers || []);
    setVideoBoxes(preset.config.video_boxes || []);
    setProfileCircles(preset.config.profile_circles || []);
    setVfxGlitch(preset.config.vfx.enable_glitch);
    setVfxShake(preset.config.vfx.enable_shake);
    setVfxBloom(preset.config.vfx.enable_bloom);
    setVfxChroma(preset.config.vfx.enable_chroma);
    setCurrentTime(0);
  };

  // Switch Aspect Ratio
  const handleAspectChange = (aspect: "16:9" | "9:16") => {
    setAspectRatio(aspect);
    if (aspect === "9:16") {
      setCanvasWidth(1080);
      setCanvasHeight(1920);
      setTextLayers([
        { text: "GINA AI FACTORY", size: 56, color: "#00FFFF", animation: "bounce", x: 540, y: 220 },
        { text: "FOLLOW & LIKE FOR MORE", size: 34, color: "#FFFFFF", animation: "static", x: 540, y: 300 },
        { text: "@GinaAIFactory", size: 32, color: "#FFCC00", animation: "flicker", x: 540, y: 1720 }
      ]);
      setVideoBoxes([
        { x: 90, y: 460, width: 900, height: 900, label: "MAIN CLIP", border_color: "#00FFFF" }
      ]);
      setProfileCircles([
        { x: 540, y: 1520, radius: 110, pulse: true, glow_color: "#FF0055" }
      ]);
    } else {
      setCanvasWidth(1920);
      setCanvasHeight(1080);
      setTextLayers([
        { text: "THANKS FOR WATCHING", size: 68, color: "#FFFFFF", animation: "bounce", x: 960, y: 140 },
        { text: "SUBSCRIBE FOR NEXT MISSION", size: 30, color: "#00FFFF", animation: "flicker", x: 960, y: 220 }
      ]);
      setVideoBoxes([
        { x: 140, y: 360, width: 620, height: 350, label: "PREVIOUS VIDEO", border_color: "#00FFFF" },
        { x: 1160, y: 360, width: 620, height: 350, label: "RECOMMENDED", border_color: "#FF0055" }
      ]);
      setProfileCircles([
        { x: 960, y: 535, radius: 130, pulse: true, glow_color: "#00FFFF" }
      ]);
    }
  };

  // Real-time Canvas Rendering Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTimestamp = performance.now();

    const render = (now: number) => {
      const delta = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      if (isPlaying) {
        setCurrentTime((prev) => {
          const next = prev + delta;
          return next >= duration ? 0 : next;
        });
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          drawCanvas(ctx, canvas.width, canvas.height, currentTime);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, currentTime, duration, canvasWidth, canvasHeight, bgType, bgMaxRed, textLayers, videoBoxes, profileCircles, showGuides, vfxGlitch, vfxShake, vfxBloom, vfxChroma]);

  const drawCanvas = (ctx: CanvasRenderingContext2D, w: number, h: number, time: number) => {
    ctx.save();
    ctx.clearRect(0, 0, w, h);

    // Apply Screen Shake VFX in initial 1.2s
    if (vfxShake && time <= 1.2) {
      const shakeAmt = (1.2 - time) * 6;
      const sx = (Math.random() - 0.5) * shakeAmt;
      const sy = (Math.random() - 0.5) * shakeAmt;
      ctx.translate(sx, sy);
    }

    // 1. Draw Background
    if (bgType === "radial") {
      const radGrad = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, Math.max(w, h) / 1.5);
      radGrad.addColorStop(0, `rgb(${bgMaxRed}, 8, 18)`);
      radGrad.addColorStop(0.6, `rgb(${Math.floor(bgMaxRed * 0.4)}, 4, 8)`);
      radGrad.addColorStop(1, "#030005");
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, w, h);
    } else {
      const linGrad = ctx.createLinearGradient(0, 0, 0, h);
      linGrad.addColorStop(0, `rgb(${bgMaxRed}, 10, 20)`);
      linGrad.addColorStop(1, "#030005");
      ctx.fillStyle = linGrad;
      ctx.fillRect(0, 0, w, h);
    }

    // Background Cyber Grid
    ctx.strokeStyle = "rgba(255, 0, 80, 0.08)";
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // 2. Draw Video Boxes
    videoBoxes.forEach((box, idx) => {
      const bx = (box.x / canvasWidth) * w;
      const by = (box.y / canvasHeight) * h;
      const bw = (box.width / canvasWidth) * w;
      const bh = (box.height / canvasHeight) * h;

      // Dark translucent video container fill
      ctx.fillStyle = "rgba(10, 15, 25, 0.75)";
      ctx.fillRect(bx, by, bw, bh);

      // Glowing border
      ctx.strokeStyle = box.border_color || (idx === 0 ? "#00FFFF" : "#FF0055");
      ctx.lineWidth = 3;
      ctx.shadowColor = box.border_color || "#00FFFF";
      ctx.shadowBlur = vfxBloom ? 14 : 0;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.shadowBlur = 0;

      // Inner video icon or simulated static video waveform
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      ctx.beginPath();
      const iconSize = Math.min(bw, bh) * 0.25;
      const cx = bx + bw / 2;
      const cy = by + bh / 2;
      ctx.moveTo(cx - iconSize / 2, cy - iconSize / 2);
      ctx.lineTo(cx + iconSize / 2, cy);
      ctx.lineTo(cx - iconSize / 2, cy + iconSize / 2);
      ctx.closePath();
      ctx.fill();

      // Label
      if (box.label) {
        ctx.fillStyle = "#E0E0E0";
        ctx.font = `bold ${Math.max(12, Math.floor(h * 0.024))}px sans-serif`;
        ctx.fillText(box.label, bx + 12, by + Math.max(22, Math.floor(h * 0.032)));
      }

      // Aspect ratio tag
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = `${Math.max(10, Math.floor(h * 0.018))}px monospace`;
      ctx.fillText(`${box.width}×${box.height}`, bx + 12, by + bh - 10);
    });

    // 3. Draw Profile Circle Safe-Zones
    profileCircles.forEach((circ) => {
      const cx = (circ.x / canvasWidth) * w;
      const cy = (circ.y / canvasHeight) * h;
      const cr = (circ.radius / canvasHeight) * h;

      const pulseOffset = circ.pulse ? Math.sin(time * 5.0) * (cr * 0.08) : 0;
      const activeRadius = Math.max(10, cr + pulseOffset);

      // Fill
      ctx.fillStyle = "rgba(20, 25, 40, 0.85)";
      ctx.beginPath();
      ctx.arc(cx, cy, activeRadius, 0, Math.PI * 2);
      ctx.fill();

      // Glowing outer ring
      ctx.strokeStyle = circ.glow_color || "#00FFFF";
      ctx.lineWidth = 3;
      ctx.shadowColor = circ.glow_color || "#00FFFF";
      ctx.shadowBlur = vfxBloom ? 16 : 0;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Inner pulse ripple ring
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(5, activeRadius - 10), 0, Math.PI * 2);
      ctx.stroke();

      // Avatar Icon
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.beginPath();
      ctx.arc(cx, cy - activeRadius * 0.2, activeRadius * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy + activeRadius * 0.5, activeRadius * 0.45, Math.PI, 0, false);
      ctx.fill();

      // Subscribe badge hint
      ctx.fillStyle = "#FF0055";
      ctx.font = `bold ${Math.max(10, Math.floor(activeRadius * 0.22))}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("SUBSCRIBE", cx, cy + activeRadius + 20);
      ctx.textAlign = "left";
    });

    // 4. Draw Text Layers
    textLayers.forEach((tl) => {
      let animOffset = 0;
      let alpha = 1.0;

      if (tl.animation === "bounce") {
        animOffset = Math.sin(time * 4.0) * (h * 0.015);
      } else if (tl.animation === "flicker" && vfxGlitch && Math.random() < 0.25 && time < 2.0) {
        alpha = 0.3;
      }

      ctx.save();
      ctx.globalAlpha = alpha;
      const fontSize = Math.max(14, (tl.size / canvasHeight) * h);
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = tl.color || "#FFFFFF";

      const scaleX = w / canvasWidth;
      const scaleY = h / canvasHeight;

      let posX = tl.x !== undefined ? tl.x * scaleX : w / 2;
      let posY = (tl.y !== undefined ? tl.y * scaleY : h * 0.3) + animOffset;

      ctx.textAlign = "center";
      if (vfxBloom) {
        ctx.shadowColor = tl.color || "#FFFFFF";
        ctx.shadowBlur = 12;
      }

      // Chromatic Aberration Simulation (Offset red & cyan)
      if (vfxChroma && time <= 2.5) {
        ctx.fillStyle = "rgba(255, 0, 80, 0.7)";
        ctx.fillText(tl.text, posX + 3, posY);
        ctx.fillStyle = "rgba(0, 255, 255, 0.7)";
        ctx.fillText(tl.text, posX - 3, posY);
      }

      ctx.fillStyle = tl.color || "#FFFFFF";
      ctx.fillText(tl.text, posX, posY);
      ctx.restore();
    });

    // 5. Overlay Visual Guides if enabled
    if (showGuides) {
      ctx.strokeStyle = "rgba(0, 255, 200, 0.25)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      // Center crosshairs
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      ctx.setLineDash([]);
    }

    ctx.restore();
  };

  // Trigger Studio Template Generation via Python
  const handleBakeStudioTemplate = async () => {
    setJobStatus("STARTING");
    setJobProgress(5);
    setJobStep("Submitting render request to Python Engine...");
    setJobError(null);
    setCompletedVideoUrl(null);

    const payload = {
      width: canvasWidth,
      height: canvasHeight,
      duration: duration,
      fps: 30.0,
      background: {
        type: bgType,
        max_red: bgMaxRed
      },
      text_layers: textLayers,
      video_boxes: videoBoxes,
      profile_circles: profileCircles,
      vfx: {
        enable_glitch: vfxGlitch,
        enable_shake: vfxShake,
        enable_bloom: vfxBloom,
        enable_chroma: vfxChroma
      }
    };

    try {
      const res = await fetch("/api/streaminject/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to queue studio template");
      }

      setActiveJobId(data.jobId);
      pollJobStatus(data.jobId);
    } catch (e: any) {
      setJobStatus("FAILED");
      setJobError(e.message || "Failed to submit render request");
    }
  };

  // Trigger Master Pipeline Execution via Python
  const handleExecuteMasterPipeline = async () => {
    if (!gameplayPath) {
      alert("Please select or upload a main gameplay video first.");
      return;
    }

    setJobStatus("STARTING");
    setJobProgress(5);
    setJobStep("Initiating Master Multi-Track Pipeline...");
    setJobError(null);
    setCompletedVideoUrl(null);

    const payload = {
      mainGameplayPath: gameplayPath,
      introPath: introPath || undefined,
      outroPath: outroPath || undefined,
      aspectMode: pipelineAspect,
      splitStartSec: splitStart > 0 ? splitStart : undefined,
      splitEndSec: splitEnd > 0 ? splitEnd : undefined,
      greenScreenOverlay: chromaOverlay || undefined,
      overlayStartTime: overlayStart,
      watermarkPath: watermarkPath || undefined,
      watermarkPos: watermarkPos,
      subtitlePath: subtitlePath || undefined
    };

    try {
      const res = await fetch("/api/streaminject/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to queue master render");
      }

      setActiveJobId(data.jobId);
      pollJobStatus(data.jobId);
    } catch (e: any) {
      setJobStatus("FAILED");
      setJobError(e.message || "Failed to submit master render");
    }
  };

  const pollJobStatus = (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}/output`);
        const data = await res.json();
        if (data && data.job) {
          setJobStatus(data.job.status);
          setJobProgress(data.job.progress || 0);
          setJobStep(data.job.step || data.job.status);

          if (data.job.status === "COMPLETED") {
            clearInterval(interval);
            if (data.outputs && data.outputs.length > 0) {
              setCompletedVideoUrl(data.outputs[0].url);
            }
            fetchMediaFiles();
          } else if (data.job.status === "FAILED") {
            clearInterval(interval);
            setJobError(data.job.error || "Render pipeline execution failed");
          }
        }
      } catch (err) {
        console.warn("Polling job status error:", err);
      }
    }, 1200);
  };

  // Upload local media
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: "gameplay" | "intro" | "outro" | "watermark" | "chroma") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      try {
        const res = await fetch("/api/streaminject/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, base64Data })
        });
        const data = await res.json();
        if (data.ok) {
          if (targetField === "gameplay") setGameplayPath(data.path);
          if (targetField === "intro") setIntroPath(data.path);
          if (targetField === "outro") setOutroPath(data.path);
          if (targetField === "watermark") setWatermarkPath(data.path);
          if (targetField === "chroma") setChromaOverlay(data.path);
          await fetchMediaFiles();
        } else {
          throw new Error(data.error || "Upload failed");
        }
      } catch (err) {
        console.error("Upload error:", err);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-full flex flex-col gap-6 text-slate-100 p-6 bg-slate-950/80 min-h-screen">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border border-purple-500/20 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <Film className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">
                STREAMINJECT v2.5
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                PURE RENDER SUITE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Zero-External Dependency Headless Media Engine • Programmatic Multi-Track Layouts • Native FFmpeg & OpenCV Execution
            </p>
          </div>
        </div>

        {/* Studio Navigation Tabs */}
        <div className="flex items-center bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 shadow-inner">
          <button
            onClick={() => setActiveTab("studio")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "studio"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Visual Layout Studio
          </button>
          <button
            onClick={() => setActiveTab("pipeline")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "pipeline"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-4 h-4" />
            Master Pipeline Stitcher
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "history"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Clock className="w-4 h-4" />
            Render Telemetry & Outputs
          </button>
        </div>
      </div>

      {/* TAB 1: VISUAL LAYOUT STUDIO */}
      {activeTab === "studio" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left Column: Live Interactive Canvas Stage (7 Cols) */}
          <div className="xl:col-span-7 flex flex-col gap-4 bg-slate-900/70 p-5 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-md">
            {/* Canvas Stage Header Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                  <Tv className="w-4 h-4" /> Real-time Interactive Stage
                </span>
                <span className="text-xs text-slate-500">({canvasWidth}×{canvasHeight} • {duration}s)</span>
              </div>

              {/* Aspect Ratio Selector */}
              <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => handleAspectChange("16:9")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
                    aspectRatio === "16:9" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Tv className="w-3.5 h-3.5" /> 16:9 Widescreen
                </button>
                <button
                  onClick={() => handleAspectChange("9:16")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
                    aspectRatio === "9:16" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" /> 9:16 Shorts
                </button>
              </div>
            </div>

            {/* Canvas Display Frame */}
            <div className="relative w-full flex items-center justify-center bg-black/90 rounded-xl overflow-hidden border border-purple-500/20 shadow-2xl min-h-[380px] aspect-video">
              <canvas
                ref={canvasRef}
                width={canvasWidth}
                height={canvasHeight}
                className="max-h-[500px] w-auto max-w-full object-contain shadow-2xl"
              />

              {/* Aspect Badge */}
              <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/70 backdrop-blur border border-white/10 text-[10px] font-mono text-cyan-300">
                {canvasWidth}×{canvasHeight} • {aspectRatio}
              </div>

              {/* Guide Overlay Toggle */}
              <button
                onClick={() => setShowGuides(!showGuides)}
                className={`absolute top-3 right-3 px-2.5 py-1 rounded text-[11px] font-semibold border backdrop-blur transition-all ${
                  showGuides
                    ? "bg-purple-600/60 border-purple-400 text-white"
                    : "bg-black/60 border-white/10 text-slate-400"
                }`}
              >
                {showGuides ? "Guides ON" : "Guides OFF"}
              </button>
            </div>

            {/* Playback Controls & Timeline Scrubber */}
            <div className="flex flex-col gap-2 p-3 bg-slate-950/80 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>{currentTime.toFixed(2)}s</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setCurrentTime(0);
                      setIsPlaying(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-white transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-2 rounded-full bg-purple-600 text-white hover:bg-purple-500 transition-all shadow-md shadow-purple-600/30"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                </div>
                <span>{duration.toFixed(2)}s</span>
              </div>

              <input
                type="range"
                min="0"
                max={duration}
                step="0.05"
                value={currentTime}
                onChange={(e) => {
                  setCurrentTime(parseFloat(e.target.value));
                  setIsPlaying(false);
                }}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            {/* Render Action Footer */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span>48kHz Harmonized Audio • -0.95dB Hard Ceiling</span>
              </div>
              <button
                onClick={handleBakeStudioTemplate}
                disabled={jobStatus === "STARTING" || jobStatus === "RUNNING"}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-sm shadow-lg shadow-purple-600/40 disabled:opacity-50 transition-all cursor-pointer"
              >
                <Flame className="w-4 h-4" />
                BAKE TEMPLATE VIA PYTHON
              </button>
            </div>

            {/* Completed Output Preview Card if ready */}
            {completedVideoUrl && (
              <div className="mt-3 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> RENDER COMPLETE (PYTHON ACCELERATED)
                  </span>
                  <a
                    href={completedVideoUrl}
                    download
                    className="flex items-center gap-1 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Master MP4
                  </a>
                </div>
                <video
                  src={completedVideoUrl}
                  controls
                  autoPlay
                  loop
                  className="w-full rounded-lg border border-emerald-500/20 max-h-[260px] bg-black"
                />
              </div>
            )}
          </div>

          {/* Right Column: Studio Inspector & Preset Controls (5 Cols) */}
          <div className="xl:col-span-5 flex flex-col gap-4">
            {/* Presets Gallery Accordion */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl backdrop-blur-md flex flex-col gap-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Studio Quick Presets
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className="flex flex-col items-start p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-purple-500/50 text-left transition-all group"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-slate-200 group-hover:text-purple-300 transition-colors">
                        {preset.name}
                      </span>
                      <span className="px-1.5 py-0.5 text-[9px] rounded bg-purple-500/20 text-purple-300 font-mono">
                        {preset.aspectRatio}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-tight">
                      {preset.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Kinetic VFX Matrix Switches */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl backdrop-blur-md flex flex-col gap-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Zap className="w-4 h-4" /> Part 1: Kinetic VFX Matrix
              </h2>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vfxGlitch}
                    onChange={(e) => setVfxGlitch(e.target.checked)}
                    className="accent-purple-500"
                  />
                  <span>Glitch / Neon Flicker</span>
                </label>
                <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vfxShake}
                    onChange={(e) => setVfxShake(e.target.checked)}
                    className="accent-purple-500"
                  />
                  <span>Screen Shake Rumble</span>
                </label>
                <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vfxBloom}
                    onChange={(e) => setVfxBloom(e.target.checked)}
                    className="accent-purple-500"
                  />
                  <span>Volumetric Bloom Glow</span>
                </label>
                <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vfxChroma}
                    onChange={(e) => setVfxChroma(e.target.checked)}
                    className="accent-purple-500"
                  />
                  <span>Chromatic Aberration</span>
                </label>
              </div>
            </div>

            {/* Text Layers Inspector */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl backdrop-blur-md flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4" /> Kinetic Typography Layers
                </h2>
                <button
                  onClick={() =>
                    setTextLayers([
                      ...textLayers,
                      { text: "NEW KINETIC HEADER", size: 48, color: "#FFFFFF", animation: "bounce", x: canvasWidth / 2, y: canvasHeight * 0.4 }
                    ])
                  }
                  className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Layer
                </button>
              </div>

              <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                {textLayers.map((layer, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={layer.text}
                        onChange={(e) => {
                          const copy = [...textLayers];
                          copy[idx].text = e.target.value;
                          setTextLayers(copy);
                        }}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                        placeholder="Text message..."
                      />
                      <button
                        onClick={() => setTextLayers(textLayers.filter((_, i) => i !== idx))}
                        className="p-1 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-400 text-[10px]">Font Size</span>
                        <input
                          type="number"
                          value={layer.size}
                          onChange={(e) => {
                            const copy = [...textLayers];
                            copy[idx].size = parseInt(e.target.value, 10) || 32;
                            setTextLayers(copy);
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">Color</span>
                        <input
                          type="color"
                          value={layer.color}
                          onChange={(e) => {
                            const copy = [...textLayers];
                            copy[idx].color = e.target.value;
                            setTextLayers(copy);
                          }}
                          className="w-full h-6 bg-slate-900 border border-slate-700 rounded cursor-pointer"
                        />
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">Animation</span>
                        <select
                          value={layer.animation}
                          onChange={(e) => {
                            const copy = [...textLayers];
                            copy[idx].animation = e.target.value as any;
                            setTextLayers(copy);
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-xs text-white"
                        >
                          <option value="bounce">Bounce</option>
                          <option value="flicker">Flicker</option>
                          <option value="static">Static</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Video Box Safe-Zones Inspector */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl backdrop-blur-md flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Maximize2 className="w-4 h-4" /> 16:9 Video Box Safe-Zones
                </h2>
                <button
                  onClick={() =>
                    setVideoBoxes([
                      ...videoBoxes,
                      { x: 100, y: 400, width: 500, height: 280, label: "NEW VIDEO BOX", border_color: "#00FFCC" }
                    ])
                  }
                  className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Box
                </button>
              </div>

              <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
                {videoBoxes.map((box, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-200">{box.label || `Box #${idx + 1}`}</span>
                      <span className="text-[10px] text-slate-400 ml-2">
                        ({box.x}, {box.y}, {box.width}×{box.height})
                      </span>
                    </div>
                    <button
                      onClick={() => setVideoBoxes(videoBoxes.filter((_, i) => i !== idx))}
                      className="p-1 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MASTER PIPELINE STITCHER */}
      {activeTab === "pipeline" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Pipeline Configuration (8 Cols) */}
          <div className="lg:col-span-8 flex flex-col gap-5 p-6 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Layers className="w-5 h-5 text-purple-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Master Hardcoded Multi-Track Assembler
              </h2>
            </div>

            {/* Step 1: Main Gameplay Video */}
            <div className="flex flex-col gap-2.5 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
              <label className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                Step 1: Primary Gameplay Stream (Required)
              </label>
              <div className="flex gap-2">
                <select
                  value={gameplayPath}
                  onChange={(e) => setGameplayPath(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="">-- Select from local assets / ComfyUI outputs --</option>
                  {mediaFiles.videos.map((v, i) => (
                    <option key={i} value={v.path}>
                      [{v.source}] {v.name}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" /> Upload
                  <input type="file" accept=".mp4,.mkv,.webm,.mov,.avi,.m4v,.wmv,.flv,.mpeg,.mpg,.ts,.mts,.m2ts,.3gp,video/*" className="hidden" onChange={(e) => handleFileUpload(e, "gameplay")} />
                </label>
              </div>

              {/* Trim Controls & Aspect */}
              <div className="grid grid-cols-3 gap-3 mt-2 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px]">Slice Start (sec)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={splitStart}
                    onChange={(e) => setSplitStart(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  />
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Slice End (sec, 0=Full)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={splitEnd}
                    onChange={(e) => setSplitEnd(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  />
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Target Aspect</span>
                  <select
                    value={pipelineAspect}
                    onChange={(e) => setPipelineAspect(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  >
                    <option value="original">16:9 Widescreen (1920x1080)</option>
                    <option value="short">9:16 Shorts (Blurred Sidebars)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Step 2: Intro & Outro Staging */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                <label className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                  Step 2A: Intro Video Hook (Optional)
                </label>
                <select
                  value={introPath}
                  onChange={(e) => setIntroPath(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="">-- None (Skip Intro) --</option>
                  {mediaFiles.videos.map((v, i) => (
                    <option key={i} value={v.path}>
                      {v.name}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" /> Upload Intro
                  <input type="file" accept=".mp4,.mkv,.webm,.mov,.avi,.m4v,.wmv,.flv,.mpeg,.mpg,.ts,.mts,.m2ts,.3gp,video/*" className="hidden" onChange={(e) => handleFileUpload(e, "intro")} />
                </label>
              </div>

              <div className="flex flex-col gap-2 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                <label className="text-xs font-bold text-pink-300 uppercase tracking-wider">
                  Step 2B: Outro / Endscreen (Optional)
                </label>
                <select
                  value={outroPath}
                  onChange={(e) => setOutroPath(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="">-- None (Skip Outro) --</option>
                  {mediaFiles.videos.map((v, i) => (
                    <option key={i} value={v.path}>
                      {v.name}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" /> Upload CTA
                  <input type="file" accept=".mp4,.mkv,.webm,.mov,.avi,.m4v,.wmv,.flv,.mpeg,.mpg,.ts,.mts,.m2ts,.3gp,video/*" className="hidden" onChange={(e) => handleFileUpload(e, "outro")} />
                </label>
              </div>
            </div>

            {/* Step 3: Chromakey Overlay, Watermark & Subtitles */}
            <div className="flex flex-col gap-3 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
              <label className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                Step 3: Chromakey Overlay, Watermark & Subtitles
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px]">Green Screen Overlay (0x00FF00)</span>
                  <select
                    value={chromaOverlay}
                    onChange={(e) => setChromaOverlay(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white mt-1"
                  >
                    <option value="">-- None --</option>
                    {mediaFiles.videos.map((v, i) => (
                      <option key={i} value={v.path}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px]">Overlay Trigger Time (sec)</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={overlayStart}
                    onChange={(e) => setOverlayStart(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white mt-1"
                  />
                </div>

                <div>
                  <span className="text-slate-400 text-[11px]">Logo Watermark (.PNG)</span>
                  <select
                    value={watermarkPath}
                    onChange={(e) => setWatermarkPath(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white mt-1"
                  >
                    <option value="">-- None --</option>
                    {mediaFiles.images.map((img, i) => (
                      <option key={i} value={img.path}>
                        {img.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px]">Watermark Alignment</span>
                  <select
                    value={watermarkPos}
                    onChange={(e) => setWatermarkPos(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white mt-1"
                  >
                    <option value="TR">Top-Right (TR)</option>
                    <option value="TL">Top-Left (TL)</option>
                    <option value="BR">Bottom-Right (BR)</option>
                    <option value="BL">Bottom-Left (BL)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Step 4: Execute Master Pipeline Button */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Zap className="w-4 h-4 text-purple-400" />
                <span>Zero-Resolve Native Post-Production Suite</span>
              </div>
              <button
                onClick={handleExecuteMasterPipeline}
                disabled={jobStatus === "STARTING" || jobStatus === "RUNNING"}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 hover:opacity-90 text-white font-bold text-sm shadow-xl shadow-purple-600/40 disabled:opacity-50 transition-all cursor-pointer"
              >
                <Flame className="w-5 h-5" />
                EXECUTE MASTER PIPELINE (PYTHON ENGINE)
              </button>
            </div>
          </div>

          {/* Right Monitor & Telemetry Panel (4 Cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Live Progress Card */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl backdrop-blur-md flex flex-col gap-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> Live Render Monitor
              </h2>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Pipeline Status:</span>
                  <span className={`font-mono font-bold ${
                    jobStatus === "COMPLETED" ? "text-emerald-400" :
                    jobStatus === "FAILED" ? "text-red-400" :
                    jobStatus === "RUNNING" ? "text-purple-400 animate-pulse" : "text-slate-400"
                  }`}>
                    {jobStatus || "IDLE"}
                  </span>
                </div>

                {jobStatus && (
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-300"
                      style={{ width: `${jobProgress}%` }}
                    />
                  </div>
                )}

                {jobStep && (
                  <p className="text-[11px] text-slate-300 font-mono mt-1 bg-slate-950 p-2 rounded border border-slate-800/80">
                    {jobStep}
                  </p>
                )}

                {jobError && (
                  <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-xs text-red-300">
                    <AlertCircle className="w-4 h-4 inline mr-1 text-red-400" />
                    {jobError}
                  </div>
                )}
              </div>
            </div>

            {/* Completed Output Preview */}
            {completedVideoUrl && (
              <div className="p-5 rounded-2xl bg-slate-900/70 border border-emerald-500/30 shadow-xl backdrop-blur-md flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Final Master Output
                  </h2>
                  <a
                    href={completedVideoUrl}
                    download
                    className="flex items-center gap-1 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                </div>
                <video
                  src={completedVideoUrl}
                  controls
                  autoPlay
                  className="w-full rounded-xl border border-slate-800 bg-black"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: RENDER TELEMETRY & OUTPUTS */}
      {activeTab === "history" && (
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-2xl backdrop-blur-md flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <FileVideo className="w-5 h-5 text-purple-400" />
              StreamInject Asset Library & Telemetry Snapshots
            </h2>
            <button
              onClick={fetchMediaFiles}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Refresh Assets
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mediaFiles.videos.map((vid, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 truncate max-w-[200px]">
                    {vid.name}
                  </span>
                  <span className="px-2 py-0.5 text-[9px] rounded bg-purple-500/20 text-purple-300 font-mono">
                    {vid.source}
                  </span>
                </div>
                <video
                  src={`/media/streaminject/${vid.name}`}
                  controls
                  className="w-full rounded-lg bg-black border border-slate-800 max-h-[160px]"
                />
                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <span>{vid.sizeBytes ? `${(vid.sizeBytes / 1024 / 1024).toFixed(1)} MB` : "Ready"}</span>
                  <a
                    href={`/media/streaminject/${vid.name}`}
                    download
                    className="flex items-center gap-1 text-purple-400 hover:text-purple-300 font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
