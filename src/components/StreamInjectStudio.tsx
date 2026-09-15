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
  Music,
  FileVideo,
  Eye,
  Settings2,
  Trash2,
  Plus,
  Compass,
  Maximize2,
  Move,
  AlignCenter,
  AlignLeft,
  AlignRight,
  ChevronUp,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  CircleDot,
  Square,
  Type,
  Copy,
  Crosshair,
  Waves,
  Activity,
  Cpu,
  Wand2
} from "lucide-react";

export interface PhysicsLayer {
  id: string;
  type: "shockwave" | "wave_line" | "vortex" | "page_curl" | "crt_scanlines" | "datamosh" | "liquid_flow" | "volumetric_glow";
  name: string;
  enabled: boolean;
  params: {
    cx?: number;
    cy?: number;
    y?: number;
    radius?: number;
    amplitude?: number;
    width?: number;
    wave_width?: number;
    frequency?: number;
    color?: string;
    thickness?: number;
    max_radius?: number;
    max_angle_deg?: number;
    angle?: number;
    curl_angle?: number;
    roll_width_pct?: number;
    progress?: number;
    opacity?: number;
    aberration_px?: number;
    block_size?: number;
    macroblock_size?: number;
    probability?: number;
    viscosity?: number;
    zoom_speed?: number;
    intensity?: number;
    glow_color?: string;
    speed?: number;
  };
}

interface TextLayer {
  text: string;
  size: number;
  color: string;
  glow_color?: string;
  glow_blur?: number;
  stroke_color?: string;
  stroke_width?: number;
  letter_spacing?: number;
  animation: "bounce" | "flicker" | "static" | "squash_and_stretch" | "elastic_spring" | "kinetic_dispersion" | "cinematic_fade";
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
  category?: "physics" | "classic";
  config: {
    width: number;
    height: number;
    duration: number;
    fps: number;
    background: {
      type: "radial" | "linear" | "image" | "spotlight";
      max_red?: number;
      image_path?: string;
      center_color?: string;
      edge_color?: string;
      show_grid?: boolean;
    };
    text_layers: TextLayer[];
    video_boxes: VideoBox[];
    profile_circles: ProfileCircle[];
    physics_layers?: PhysicsLayer[];
    vfx: {
      enable_glitch: boolean;
      enable_shake: boolean;
      enable_bloom: boolean;
      enable_chroma: boolean;
    };
  };
}

const DEFAULT_PRESETS: Preset[] = [
  {
    id: "the_whippet_cinematic_intro",
    name: "The Whippet — Cinematic Spotlight Intro (16:9)",
    description: "Signature cinematic studio title card featuring deep midnight indigo spotlight vignette, electric cyan neon-glow typography, wide-tracked subtitle, and smooth luminous fade-in.",
    aspectRatio: "16:9",
    category: "classic",
    config: {
      width: 1920,
      height: 1080,
      duration: 15.0,
      fps: 30.0,
      background: {
        type: "spotlight",
        max_red: 25,
        center_color: "#261c42",
        edge_color: "#07060a",
        show_grid: false
      },
      text_layers: [
        {
          text: "THE WHIPPET",
          size: 92,
          color: "#FFFFFF",
          glow_color: "#00E5FF",
          glow_blur: 28,
          stroke_color: "#00E5FF",
          stroke_width: 3.5,
          animation: "cinematic_fade",
          x: 960,
          y: 495
        },
        {
          text: "A WHIPPET PRODUCTION",
          size: 26,
          color: "#FFFFFF",
          glow_color: "#00E5FF",
          glow_blur: 8,
          letter_spacing: 6,
          animation: "cinematic_fade",
          x: 960,
          y: 575
        }
      ],
      video_boxes: [],
      profile_circles: [],
      physics_layers: [
        {
          id: "phys_whippet_spotlight",
          type: "volumetric_glow",
          name: "Deep Indigo Vignette Spotlight",
          enabled: true,
          params: {
            cx: 960,
            cy: 540,
            radius: 460,
            zoom_speed: 0.5,
            intensity: 0.85,
            glow_color: "#302254"
          }
        }
      ],
      vfx: {
        enable_glitch: false,
        enable_shake: false,
        enable_bloom: true,
        enable_chroma: false
      }
    }
  },
  {
    id: "physics_squash_stretch_intro",
    name: "Kinetic Squash & Stretch Intro (16:9)",
    description: "Physics-driven intro featuring native gravitational drop, impact squash/stretch deformation, harmonic spring settling, and luminous volumetric glow aura.",
    aspectRatio: "16:9",
    category: "physics",
    config: {
      width: 1920,
      height: 1080,
      duration: 8.0,
      fps: 30.0,
      background: { type: "radial", max_red: 50 },
      text_layers: [
        { text: "GINA MOTION DYNAMICS", size: 72, color: "#00FFCC", animation: "squash_and_stretch", x: 960, y: 320 },
        { text: "VECTORIZED HIGH-PERFORMANCE GRAPHICS", size: 28, color: "#FFFFFF", animation: "elastic_spring", x: 960, y: 460 }
      ],
      video_boxes: [
        { x: 560, y: 550, width: 800, height: 450, label: "MAIN HIGHLIGHT", border_color: "#00FFCC" }
      ],
      profile_circles: [],
      physics_layers: [
        {
          id: "phys_glow_1",
          type: "volumetric_glow",
          name: "Volumetric Aura Pulse",
          enabled: true,
          params: { cx: 960, cy: 380, zoom_speed: 1.8, intensity: 0.8, glow_color: "#00FFCC" }
        },
        {
          id: "phys_shock_1",
          type: "shockwave",
          name: "Impact Refractive Blast",
          enabled: true,
          params: { cx: 960, cy: 540, radius: 180, amplitude: 35, width: 45 }
        }
      ],
      vfx: { enable_glitch: false, enable_shake: true, enable_bloom: true, enable_chroma: true }
    }
  },
  {
    id: "physics_shockwave_wave_outro",
    name: "Radial Shockwave & Wave Line Outro (16:9)",
    description: "High-impact video endscreen with rolling sinusoidal wave line, radial shockwave refractive displacement, dual 16:9 video slots, and harmonic CTA.",
    aspectRatio: "16:9",
    category: "physics",
    config: {
      width: 1920,
      height: 1080,
      duration: 10.0,
      fps: 30.0,
      background: { type: "radial", max_red: 55 },
      text_layers: [
        { text: "THANKS FOR WATCHING", size: 64, color: "#FFFFFF", animation: "elastic_spring", x: 960, y: 130 },
        { text: "SUBSCRIBE FOR FUTURE RELEASES", size: 28, color: "#FF0077", animation: "flicker", x: 960, y: 210 }
      ],
      video_boxes: [
        { x: 140, y: 350, width: 640, height: 360, label: "PREVIOUS VIDEO", border_color: "#00FFFF" },
        { x: 1140, y: 350, width: 640, height: 360, label: "RECOMMENDED", border_color: "#FF0077" }
      ],
      profile_circles: [
        { x: 960, y: 530, radius: 125, pulse: true, glow_color: "#00FFFF" }
      ],
      physics_layers: [
        {
          id: "phys_wave_1",
          type: "wave_line",
          name: "Rolling Sine Wave Horizon",
          enabled: true,
          params: { amplitude: 30, frequency: 0.015, color: "#00FFFF", thickness: 3 }
        },
        {
          id: "phys_shock_2",
          type: "shockwave",
          name: "Center Radial Blast",
          enabled: true,
          params: { cx: 960, cy: 530, radius: 220, amplitude: 40, width: 50 }
        }
      ],
      vfx: { enable_glitch: false, enable_shake: false, enable_bloom: true, enable_chroma: true }
    }
  },
  {
    id: "physics_liquid_flow_crt_outro",
    name: "Liquid Optical Flow & CRT Glitch (16:9)",
    description: "Atmospheric cyber-retro studio template utilizing fluid dynamic liquid flow warping, phosphor CRT scanline separation, and kinetic character dispersion.",
    aspectRatio: "16:9",
    category: "physics",
    config: {
      width: 1920,
      height: 1080,
      duration: 10.0,
      fps: 30.0,
      background: { type: "radial", max_red: 40 },
      text_layers: [
        { text: "TRANSMISSION COMPLETE", size: 68, color: "#39FF14", animation: "kinetic_dispersion", x: 960, y: 150 },
        { text: "SIGNAL FREQUENCY ARCHIVED", size: 26, color: "#FFFFFF", animation: "static", x: 960, y: 230 }
      ],
      video_boxes: [
        { x: 180, y: 330, width: 720, height: 405, label: "DATA ARCHIVE", border_color: "#39FF14" }
      ],
      profile_circles: [
        { x: 1350, y: 530, radius: 140, pulse: true, glow_color: "#39FF14" }
      ],
      physics_layers: [
        {
          id: "phys_crt_1",
          type: "crt_scanlines",
          name: "CRT Phosphor Grid & Aberration",
          enabled: true,
          params: { opacity: 0.25, aberration_px: 4 }
        },
        {
          id: "phys_liquid_1",
          type: "liquid_flow",
          name: "Fluid Viscous Warp",
          enabled: true,
          params: { viscosity: 18 }
        }
      ],
      vfx: { enable_glitch: true, enable_shake: false, enable_bloom: true, enable_chroma: false }
    }
  },
  {
    id: "physics_datamosh_spring_shorts",
    name: "Viral 9:16 Datamosh & Elastic Spring Shorts (9:16)",
    description: "High-retention 9:16 vertical shorts layout with H.264 macroblock corruption datamosh glitch, rubber-band spring tracked CTA, and 3D page curl roll transition.",
    aspectRatio: "9:16",
    category: "physics",
    config: {
      width: 1080,
      height: 1920,
      duration: 8.0,
      fps: 30.0,
      background: { type: "linear", max_red: 45 },
      text_layers: [
        { text: "WAIT FOR THE END!", size: 54, color: "#FFCC00", animation: "squash_and_stretch", x: 540, y: 240 },
        { text: "SUBSCRIBE FOR PART 2", size: 38, color: "#FFFFFF", animation: "elastic_spring", x: 540, y: 330 },
        { text: "@GinaAIFactory", size: 34, color: "#00FFFF", animation: "flicker", x: 540, y: 1740 }
      ],
      video_boxes: [
        { x: 90, y: 480, width: 900, height: 900, label: "MAIN HIGHLIGHT", border_color: "#FFCC00" }
      ],
      profile_circles: [
        { x: 540, y: 1540, radius: 115, pulse: true, glow_color: "#FF0077" }
      ],
      physics_layers: [
        {
          id: "phys_mosh_1",
          type: "datamosh",
          name: "Macroblock Datamosh Corruption",
          enabled: true,
          params: { block_size: 16, probability: 0.3 }
        },
        {
          id: "phys_curl_1",
          type: "page_curl",
          name: "3D Page Curl Fold",
          enabled: true,
          params: { roll_width_pct: 0.15, progress: 0.35 }
        }
      ],
      vfx: { enable_glitch: true, enable_shake: true, enable_bloom: true, enable_chroma: true }
    }
  },
  {
    id: "cyberpunk_dual_box_outro",
    name: "Cyberpunk Crimson Dual-Box Outro (16:9)",
    description: "10-second kinetic loop with radial crimson glow (capped <= 55), dual 16:9 video boxes, subscribe pulse circle, and glitch/shake/bloom VFX matrix.",
    aspectRatio: "16:9",
    category: "classic",
    config: {
      width: 1920,
      height: 1080,
      duration: 10.0,
      fps: 30.0,
      background: { type: "radial", max_red: 55 },
      text_layers: [
        { text: "THANKS FOR WATCHING", size: 68, color: "#FFFFFF", animation: "bounce", x: 960, y: 140 },
        { text: "SUBSCRIBE FOR NEXT MISSION", size: 30, color: "#00FFFF", animation: "flicker", x: 960, y: 220 }
      ],
      video_boxes: [
        { x: 140, y: 360, width: 620, height: 350, label: "PREVIOUS VIDEO", border_color: "#00FFFF" },
        { x: 1160, y: 360, width: 620, height: 350, label: "RECOMMENDED", border_color: "#FF0055" }
      ],
      profile_circles: [
        { x: 960, y: 535, radius: 130, pulse: true, glow_color: "#00FFFF" }
      ],
      vfx: { enable_glitch: true, enable_shake: true, enable_bloom: true, enable_chroma: true }
    }
  },
  {
    id: "shorts_kinetic_viral",
    name: "Viral Shorts 9:16 Kinetic Converter",
    description: "Vertical 1080x1920 portrait format with center spotlight, blurred kinetic sidebars, top & bottom banner cards, and subscribe CTA.",
    aspectRatio: "9:16",
    category: "classic",
    config: {
      width: 1080,
      height: 1920,
      duration: 10.0,
      fps: 30.0,
      background: { type: "linear", max_red: 45 },
      text_layers: [
        { text: "GINA AI FACTORY", size: 56, color: "#00FFFF", animation: "bounce", x: 540, y: 220 },
        { text: "FOLLOW & DROP A LIKE", size: 36, color: "#FFFFFF", animation: "static", x: 540, y: 300 },
        { text: "@GinaAIFactory", size: 32, color: "#FFCC00", animation: "flicker", x: 540, y: 1720 }
      ],
      video_boxes: [
        { x: 90, y: 460, width: 900, height: 900, label: "MAIN CLIP", border_color: "#00FFFF" }
      ],
      profile_circles: [
        { x: 540, y: 1520, radius: 110, pulse: true, glow_color: "#FF0055" }
      ],
      vfx: { enable_glitch: true, enable_shake: true, enable_bloom: true, enable_chroma: true }
    }
  },
  {
    id: "clean_gamer_minimal",
    name: "Clean Gamer Minimal Endscreen (16:9)",
    description: "High-contrast minimalist dark palette with single left feature frame, channel branding on the right, and subtle kinetic shimmer.",
    aspectRatio: "16:9",
    category: "classic",
    config: {
      width: 1920,
      height: 1080,
      duration: 10.0,
      fps: 30.0,
      background: { type: "radial", max_red: 35 },
      text_layers: [
        { text: "WATCH NEXT", size: 52, color: "#FFFFFF", animation: "static", x: 1350, y: 380 },
        { text: "DAILY GENERATIVE AI & GAMING", size: 26, color: "#AAAAAA", animation: "static", x: 1350, y: 450 }
      ],
      video_boxes: [
        { x: 160, y: 260, width: 960, height: 540, label: "LATEST UPLOAD", border_color: "#FFFFFF" }
      ],
      profile_circles: [
        { x: 1350, y: 640, radius: 100, pulse: true, glow_color: "#00FFCC" }
      ],
      vfx: { enable_glitch: false, enable_shake: false, enable_bloom: true, enable_chroma: false }
    }
  },
  {
    id: "neon_burst_intro",
    name: "Neon Burst 5s Intro Sting",
    description: "Fast 5-second high-energy intro hook with aggressive shake, chromatic aberration, and neon flicker headers.",
    aspectRatio: "16:9",
    category: "classic",
    config: {
      width: 1920,
      height: 1080,
      duration: 5.0,
      fps: 30.0,
      background: { type: "radial", max_red: 55 },
      text_layers: [
        { text: "GINA AI FACTORY", size: 76, color: "#FF0055", animation: "bounce", x: 960, y: 440 },
        { text: "POWERED BY LOCAL HARDWARE", size: 32, color: "#00FFFF", animation: "flicker", x: 960, y: 560 }
      ],
      video_boxes: [],
      profile_circles: [],
      vfx: { enable_glitch: true, enable_shake: true, enable_bloom: true, enable_chroma: true }
    }
  }
];

interface MediaAsset {
  name: string;
  path: string;
  source: string;
  sizeBytes?: number;
}

function hexToRgba(hex: string, alpha: number): string {
  if (!hex || typeof hex !== 'string') return `rgba(0, 255, 255, ${alpha})`;
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
  if (clean.length >= 6) {
    const r = parseInt(clean.substring(0, 2), 16) || 0;
    const g = parseInt(clean.substring(2, 4), 16) || 0;
    const b = parseInt(clean.substring(4, 6), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}

export function StreamInjectStudio() {
  const [activeTab, setActiveTab] = useState<"studio" | "pipeline" | "history">("studio");
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("16:9");
  
  // Studio Canvas State
  const [canvasWidth, setCanvasWidth] = useState(1920);
  const [canvasHeight, setCanvasHeight] = useState(1080);
  const [duration, setDuration] = useState(10.0);
  const [bgType, setBgType] = useState<"radial" | "linear" | "image" | "spotlight">("radial");
  const [bgMaxRed, setBgMaxRed] = useState(55);
  const [bgCenterColor, setBgCenterColor] = useState<string>("#370812");
  const [bgEdgeColor, setBgEdgeColor] = useState<string>("#030005");
  const [showBgGrid, setShowBgGrid] = useState<boolean>(true);
  
  // Studio Audio Track State (Intro/Outro Audio Injection)
  const [studioAudioPath, setStudioAudioPath] = useState<string>("");
  const [studioAudioStartOffset, setStudioAudioStartOffset] = useState<number>(0);
  const [studioAudioTrimStart, setStudioAudioTrimStart] = useState<number>(0);
  const [studioAudioTrimEnd, setStudioAudioTrimEnd] = useState<number>(0);
  const [studioAudioVolume, setStudioAudioVolume] = useState<number>(1.0);
  const [studioAudioFadeIn, setStudioAudioFadeIn] = useState<number>(0.5);
  const [studioAudioFadeOut, setStudioAudioFadeOut] = useState<number>(0.5);

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

  // Motion Physics & Geometric FX Layers
  const [physicsLayers, setPhysicsLayers] = useState<PhysicsLayer[]>([
    {
      id: "phys_glow_demo",
      type: "volumetric_glow",
      name: "Volumetric Glow Aura",
      enabled: true,
      params: { cx: 960, cy: 380, zoom_speed: 1.8, intensity: 0.75, glow_color: "#00FFFF" }
    },
    {
      id: "phys_wave_demo",
      type: "wave_line",
      name: "Rolling Sine Wave Horizon",
      enabled: false,
      params: { amplitude: 30, frequency: 0.015, color: "#00FFFF", thickness: 3 }
    }
  ]);

  // Presets filtering
  const [presetFilter, setPresetFilter] = useState<"all" | "physics" | "classic">("all");
  const [showAddPhysicsMenu, setShowAddPhysicsMenu] = useState<boolean>(false);

  const [vfxGlitch, setVfxGlitch] = useState(true);
  const [vfxShake, setVfxShake] = useState(true);
  const [vfxBloom, setVfxBloom] = useState(true);
  const [vfxChroma, setVfxChroma] = useState(true);

  // Interactive Selection & Drag-and-Drop Movement State
  const [selectedTarget, setSelectedTarget] = useState<{ type: "text" | "box" | "circle" | "physics"; index: number } | null>({ type: "text", index: 0 });
  const [nudgeStep, setNudgeStep] = useState<number>(10);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartCanvasPos, setDragStartCanvasPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragInitialElementPos, setDragInitialElementPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Master Pipeline State
  const [gameplayPath, setGameplayPath] = useState<string>("");
  const [introPath, setIntroPath] = useState<string>("");
  const [outroPath, setOutroPath] = useState<string>("");
  const [pipelineAspect, setPipelineAspect] = useState<"original" | "short">("original");
  const [splitStart, setSplitStart] = useState<number>(0);
  const [splitEnd, setSplitEnd] = useState<number>(0);
  const [chromaOverlay, setChromaOverlay] = useState<string>("");
  const [overlayStart, setOverlayStart] = useState<number>(5);
  const [overlayFinish, setOverlayFinish] = useState<number>(0);
  const [chromaColor, setChromaColor] = useState<string>("0x00FF00");
  const [chromaSimilarity, setChromaSimilarity] = useState<number>(0.15);
  const [chromaBlend, setChromaBlend] = useState<number>(0.1);
  const [watermarkPath, setWatermarkPath] = useState<string>("");
  const [watermarkPos, setWatermarkPos] = useState<"TL" | "TR" | "BL" | "BR">("TR");
  const [watermarkStart, setWatermarkStart] = useState<number>(0);
  const [watermarkFinish, setWatermarkFinish] = useState<number>(0);
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.85);
  const [subtitlePath, setSubtitlePath] = useState<string>("");
  const [audioTrackPath, setAudioTrackPath] = useState<string>("");
  const [audioStartOffset, setAudioStartOffset] = useState<number>(0);
  const [audioTrimStart, setAudioTrimStart] = useState<number>(0);
  const [audioTrimEnd, setAudioTrimEnd] = useState<number>(0);
  const [audioVolume, setAudioVolume] = useState<number>(1.0);
  const [audioFadeIn, setAudioFadeIn] = useState<number>(0.5);
  const [audioFadeOut, setAudioFadeOut] = useState<number>(0.5);
  const [stripAudio, setStripAudio] = useState<boolean>(false);

  // CPU-only static watermark eraser matrix (percentages of the source clip).
  const [removeWatermark, setRemoveWatermark] = useState<boolean>(false);
  const [wmX, setWmX] = useState<number>(85);
  const [wmY, setWmY] = useState<number>(5);
  const [wmW, setWmW] = useState<number>(12);
  const [wmH, setWmH] = useState<number>(8);
  const wmVideoRef = useRef<HTMLVideoElement | null>(null);
  const [wmIsPlaying, setWmIsPlaying] = useState<boolean>(false);
  const [wmVideoProgress, setWmVideoProgress] = useState<number>(0);

  // Presets and Media
  const [presets, setPresets] = useState<Preset[]>(DEFAULT_PRESETS);
  const [mediaFiles, setMediaFiles] = useState<{ videos: MediaAsset[]; images: MediaAsset[]; audio: MediaAsset[]; subtitles: MediaAsset[] }>({
    videos: [],
    images: [],
    audio: [],
    subtitles: []
  });

  // Render & Job State
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<number>(0);
  const [jobStep, setJobStep] = useState<string>("");
  const [jobError, setJobError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
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
          audio: data.audio || [],
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

  const handleAddPhysicsLayer = (type: PhysicsLayer["type"]) => {
    const id = `phys_${type}_${Date.now().toString(36)}`;
    let name = "";
    let params: PhysicsLayer["params"] = {};

    switch (type) {
      case "shockwave":
        name = "Radial Shockwave Blast";
        params = { cx: Math.round(canvasWidth * 0.5), cy: Math.round(canvasHeight * 0.5), radius: 200, amplitude: 40, width: 50, speed: 1.0 };
        break;
      case "wave_line":
        name = "Rolling Sine Wave Horizon";
        params = { y: Math.round(canvasHeight * 0.65), amplitude: 30, frequency: 0.015, color: "#00FFFF", thickness: 3 };
        break;
      case "vortex":
        name = "Localized Twirl Vortex";
        params = { cx: Math.round(canvasWidth * 0.5), cy: Math.round(canvasHeight * 0.5), radius: 220, angle: 180 };
        break;
      case "page_curl":
        name = "3D Page Curl Fold";
        params = { roll_width_pct: 0.25, curl_angle: 45, progress: 0.5 };
        break;
      case "crt_scanlines":
        name = "CRT Phosphor Scanlines & Aberration";
        params = { opacity: 0.3, aberration_px: 4 };
        break;
      case "datamosh":
        name = "Datamosh Block Glitch";
        params = { macroblock_size: 16, probability: 0.3 };
        break;
      case "liquid_flow":
        name = "Optical Liquid Flow Warp";
        params = { viscosity: 18 };
        break;
      case "volumetric_glow":
        name = "Volumetric Pulsing Aura";
        params = { cx: Math.round(canvasWidth * 0.5), cy: Math.round(canvasHeight * 0.4), zoom_speed: 1.8, intensity: 0.8, glow_color: "#00FFCC" };
        break;
    }

    const newLayer: PhysicsLayer = {
      id,
      type,
      name,
      enabled: true,
      params
    };

    setPhysicsLayers([...physicsLayers, newLayer]);
    setSelectedTarget({ type: "physics", index: physicsLayers.length });
    setShowAddPhysicsMenu(false);
  };

  // Keyboard shortcut listener for precise nudging
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedTarget) return;
      // Do not intercept if focus is inside an input or textarea
      if (["INPUT", "TEXTAREA", "SELECT"].includes((document.activeElement?.tagName || ""))) {
        return;
      }

      const step = e.shiftKey ? nudgeStep * 5 : nudgeStep;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        nudgeSelected(-step, 0);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        nudgeSelected(step, 0);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        nudgeSelected(0, -step);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        nudgeSelected(0, step);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedTarget, nudgeStep, textLayers, videoBoxes, profileCircles, canvasWidth, canvasHeight]);

  const applyPreset = (preset: Preset) => {
    setAspectRatio(preset.aspectRatio);
    setCanvasWidth(preset.config.width);
    setCanvasHeight(preset.config.height);
    setDuration(preset.config.duration);
    setBgType(preset.config.background.type);
    setBgMaxRed(preset.config.background.max_red || 55);
    setBgCenterColor(preset.config.background.center_color || (preset.config.background.type === "spotlight" ? "#261c42" : "#370812"));
    setBgEdgeColor(preset.config.background.edge_color || (preset.config.background.type === "spotlight" ? "#07060a" : "#030005"));
    setShowBgGrid(preset.config.background.show_grid ?? (preset.config.background.type !== "spotlight"));
    setTextLayers(preset.config.text_layers || []);
    setVideoBoxes(preset.config.video_boxes || []);
    setProfileCircles(preset.config.profile_circles || []);
    setPhysicsLayers(preset.config.physics_layers || []);
    setVfxGlitch(preset.config.vfx.enable_glitch);
    setVfxShake(preset.config.vfx.enable_shake);
    setVfxBloom(preset.config.vfx.enable_bloom);
    setVfxChroma(preset.config.vfx.enable_chroma);
    setCurrentTime(0);
    if (preset.config.text_layers?.length) {
      setSelectedTarget({ type: "text", index: 0 });
    } else if (preset.config.video_boxes?.length) {
      setSelectedTarget({ type: "box", index: 0 });
    } else if (preset.config.profile_circles?.length) {
      setSelectedTarget({ type: "circle", index: 0 });
    } else {
      setSelectedTarget(null);
    }
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

  // Nudge selected layer / box / circle by relative deltas
  const nudgeSelected = (dx: number, dy: number) => {
    if (!selectedTarget) return;
    if (selectedTarget.type === "text" && textLayers[selectedTarget.index]) {
      const copy = [...textLayers];
      const curX = copy[selectedTarget.index].x ?? canvasWidth / 2;
      const curY = copy[selectedTarget.index].y ?? canvasHeight * 0.3;
      copy[selectedTarget.index] = {
        ...copy[selectedTarget.index],
        x: Math.round(curX + dx),
        y: Math.round(curY + dy)
      };
      setTextLayers(copy);
    } else if (selectedTarget.type === "box" && videoBoxes[selectedTarget.index]) {
      const copy = [...videoBoxes];
      copy[selectedTarget.index] = {
        ...copy[selectedTarget.index],
        x: Math.round(copy[selectedTarget.index].x + dx),
        y: Math.round(copy[selectedTarget.index].y + dy)
      };
      setVideoBoxes(copy);
    } else if (selectedTarget.type === "circle" && profileCircles[selectedTarget.index]) {
      const copy = [...profileCircles];
      copy[selectedTarget.index] = {
        ...copy[selectedTarget.index],
        x: Math.round(copy[selectedTarget.index].x + dx),
        y: Math.round(copy[selectedTarget.index].y + dy)
      };
      setProfileCircles(copy);
    }
  };

  // Align selected layer / box / circle
  const alignSelected = (alignment: "center_x" | "center_y" | "center_both" | "top" | "bottom" | "left" | "right") => {
    if (!selectedTarget) return;
    if (selectedTarget.type === "text" && textLayers[selectedTarget.index]) {
      const copy = [...textLayers];
      let curX = copy[selectedTarget.index].x ?? canvasWidth / 2;
      let curY = copy[selectedTarget.index].y ?? canvasHeight * 0.3;

      if (alignment === "center_x" || alignment === "center_both") curX = Math.round(canvasWidth / 2);
      if (alignment === "center_y" || alignment === "center_both") curY = Math.round(canvasHeight / 2);
      if (alignment === "top") curY = Math.round(canvasHeight * 0.12);
      if (alignment === "bottom") curY = Math.round(canvasHeight * 0.88);
      if (alignment === "left") curX = Math.round(canvasWidth * 0.25);
      if (alignment === "right") curX = Math.round(canvasWidth * 0.75);

      copy[selectedTarget.index] = { ...copy[selectedTarget.index], x: curX, y: curY };
      setTextLayers(copy);
    } else if (selectedTarget.type === "box" && videoBoxes[selectedTarget.index]) {
      const copy = [...videoBoxes];
      const box = copy[selectedTarget.index];
      let bx = box.x;
      let by = box.y;

      if (alignment === "center_x" || alignment === "center_both") bx = Math.round((canvasWidth - box.width) / 2);
      if (alignment === "center_y" || alignment === "center_both") by = Math.round((canvasHeight - box.height) / 2);
      if (alignment === "left") bx = Math.round(canvasWidth * 0.07);
      if (alignment === "right") bx = Math.round(canvasWidth - box.width - canvasWidth * 0.07);
      if (alignment === "top") by = Math.round(canvasHeight * 0.1);
      if (alignment === "bottom") by = Math.round(canvasHeight - box.height - canvasHeight * 0.1);

      copy[selectedTarget.index] = { ...box, x: bx, y: by };
      setVideoBoxes(copy);
    } else if (selectedTarget.type === "circle" && profileCircles[selectedTarget.index]) {
      const copy = [...profileCircles];
      const circ = copy[selectedTarget.index];
      let cx = circ.x;
      let cy = circ.y;

      if (alignment === "center_x" || alignment === "center_both") cx = Math.round(canvasWidth / 2);
      if (alignment === "center_y" || alignment === "center_both") cy = Math.round(canvasHeight / 2);
      if (alignment === "top") cy = Math.round(canvasHeight * 0.25);
      if (alignment === "bottom") cy = Math.round(canvasHeight * 0.75);
      if (alignment === "left") cx = Math.round(canvasWidth * 0.25);
      if (alignment === "right") cx = Math.round(canvasWidth * 0.75);

      copy[selectedTarget.index] = { ...circ, x: cx, y: cy };
      setProfileCircles(copy);
    }
  };

  // Duplicate currently selected item
  const duplicateSelected = () => {
    if (!selectedTarget) return;
    if (selectedTarget.type === "text" && textLayers[selectedTarget.index]) {
      const source = textLayers[selectedTarget.index];
      const newLayer: TextLayer = {
        ...source,
        text: `${source.text} (COPY)`,
        y: Math.min(canvasHeight - 50, (source.y ?? canvasHeight * 0.3) + 60)
      };
      setTextLayers([...textLayers, newLayer]);
      setSelectedTarget({ type: "text", index: textLayers.length });
    } else if (selectedTarget.type === "box" && videoBoxes[selectedTarget.index]) {
      const source = videoBoxes[selectedTarget.index];
      const newBox: VideoBox = {
        ...source,
        label: `${source.label || "BOX"} COPY`,
        x: Math.min(canvasWidth - source.width, source.x + 40),
        y: Math.min(canvasHeight - source.height, source.y + 40)
      };
      setVideoBoxes([...videoBoxes, newBox]);
      setSelectedTarget({ type: "box", index: videoBoxes.length });
    } else if (selectedTarget.type === "circle" && profileCircles[selectedTarget.index]) {
      const source = profileCircles[selectedTarget.index];
      const newCircle: ProfileCircle = {
        ...source,
        x: Math.min(canvasWidth - source.radius, source.x + 50),
        y: Math.min(canvasHeight - source.radius, source.y + 50)
      };
      setProfileCircles([...profileCircles, newCircle]);
      setSelectedTarget({ type: "circle", index: profileCircles.length });
    } else if (selectedTarget.type === "physics" && physicsLayers[selectedTarget.index]) {
      const source = physicsLayers[selectedTarget.index];
      const newLayer: PhysicsLayer = {
        ...source,
        id: `phys_${Date.now()}`,
        name: `${source.name} Copy`,
        params: { ...source.params }
      };
      setPhysicsLayers([...physicsLayers, newLayer]);
      setSelectedTarget({ type: "physics", index: physicsLayers.length });
    }
  };

  // Delete currently selected item
  const deleteSelected = () => {
    if (!selectedTarget) return;
    if (selectedTarget.type === "text") {
      setTextLayers(textLayers.filter((_, i) => i !== selectedTarget.index));
      setSelectedTarget(null);
    } else if (selectedTarget.type === "box") {
      setVideoBoxes(videoBoxes.filter((_, i) => i !== selectedTarget.index));
      setSelectedTarget(null);
    } else if (selectedTarget.type === "circle") {
      setProfileCircles(profileCircles.filter((_, i) => i !== selectedTarget.index));
      setSelectedTarget(null);
    } else if (selectedTarget.type === "physics") {
      setPhysicsLayers(physicsLayers.filter((_, i) => i !== selectedTarget.index));
      setSelectedTarget(null);
    }
  };

  // Move layer order in array
  const moveLayerOrder = (type: "text" | "box" | "circle" | "physics", index: number, direction: -1 | 1) => {
    if (type === "text") {
      const targetIdx = index + direction;
      if (targetIdx < 0 || targetIdx >= textLayers.length) return;
      const copy = [...textLayers];
      const temp = copy[index];
      copy[index] = copy[targetIdx];
      copy[targetIdx] = temp;
      setTextLayers(copy);
      setSelectedTarget({ type: "text", index: targetIdx });
    } else if (type === "box") {
      const targetIdx = index + direction;
      if (targetIdx < 0 || targetIdx >= videoBoxes.length) return;
      const copy = [...videoBoxes];
      const temp = copy[index];
      copy[index] = copy[targetIdx];
      copy[targetIdx] = temp;
      setVideoBoxes(copy);
      setSelectedTarget({ type: "box", index: targetIdx });
    } else if (type === "circle") {
      const targetIdx = index + direction;
      if (targetIdx < 0 || targetIdx >= profileCircles.length) return;
      const copy = [...profileCircles];
      const temp = copy[index];
      copy[index] = copy[targetIdx];
      copy[targetIdx] = temp;
      setProfileCircles(copy);
      setSelectedTarget({ type: "circle", index: targetIdx });
    } else if (type === "physics") {
      const targetIdx = index + direction;
      if (targetIdx < 0 || targetIdx >= physicsLayers.length) return;
      const copy = [...physicsLayers];
      const temp = copy[index];
      copy[index] = copy[targetIdx];
      copy[targetIdx] = temp;
      setPhysicsLayers(copy);
      setSelectedTarget({ type: "physics", index: targetIdx });
    }
  };

  // Hit testing to select or begin dragging
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const scaleX = canvasWidth / rect.width;
    const scaleY = canvasHeight / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const hitTestElement = (cx: number, cy: number): { type: "text" | "box" | "circle" | "physics"; index: number } | null => {
    // 1. Check Profile Circles (Top priority for small precise circles)
    for (let i = profileCircles.length - 1; i >= 0; i--) {
      const circ = profileCircles[i];
      const distSq = (cx - circ.x) ** 2 + (cy - circ.y) ** 2;
      if (distSq <= (circ.radius + 20) ** 2) {
        return { type: "circle", index: i };
      }
    }

    // 2. Check Text Layers
    for (let i = textLayers.length - 1; i >= 0; i--) {
      const tl = textLayers[i];
      const tx = tl.x !== undefined ? tl.x : canvasWidth / 2;
      const ty = tl.y !== undefined ? tl.y : canvasHeight * 0.3;
      const approxWidth = Math.max(120, tl.text.length * (tl.size * 0.58));
      const halfW = approxWidth / 2;
      const topY = ty - tl.size;
      const bottomY = ty + tl.size * 0.3;

      if (cx >= tx - halfW && cx <= tx + halfW && cy >= topY && cy <= bottomY) {
        return { type: "text", index: i };
      }
    }

    // 3. Check Video Boxes
    for (let i = videoBoxes.length - 1; i >= 0; i--) {
      const box = videoBoxes[i];
      if (cx >= box.x && cx <= box.x + box.width && cy >= box.y && cy <= box.y + box.height) {
        return { type: "box", index: i };
      }
    }

    // 4. Check Physics Layers with centers
    for (let i = physicsLayers.length - 1; i >= 0; i--) {
      const pl = physicsLayers[i];
      if (pl.enabled && pl.params.cx !== undefined && pl.params.cy !== undefined) {
        const distSq = (cx - pl.params.cx) ** 2 + (cy - pl.params.cy) ** 2;
        if (distSq <= 60 ** 2) {
          return { type: "physics", index: i };
        }
      }
    }

    return null;
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    const hit = hitTestElement(coords.x, coords.y);
    if (hit) {
      setSelectedTarget(hit);
      setIsDragging(true);
      setDragStartCanvasPos(coords);

      if (hit.type === "text") {
        const tl = textLayers[hit.index];
        setDragInitialElementPos({
          x: tl.x !== undefined ? tl.x : canvasWidth / 2,
          y: tl.y !== undefined ? tl.y : canvasHeight * 0.3
        });
      } else if (hit.type === "box") {
        const box = videoBoxes[hit.index];
        setDragInitialElementPos({ x: box.x, y: box.y });
      } else if (hit.type === "circle") {
        const circ = profileCircles[hit.index];
        setDragInitialElementPos({ x: circ.x, y: circ.y });
      } else if (hit.type === "physics") {
        const pl = physicsLayers[hit.index];
        setDragInitialElementPos({
          x: pl.params.cx ?? canvasWidth / 2,
          y: pl.params.cy ?? canvasHeight / 2
        });
      }
    } else {
      setSelectedTarget(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !selectedTarget) return;
    const coords = getCanvasCoords(e);
    const dx = coords.x - dragStartCanvasPos.x;
    const dy = coords.y - dragStartCanvasPos.y;

    if (selectedTarget.type === "text" && textLayers[selectedTarget.index]) {
      const copy = [...textLayers];
      copy[selectedTarget.index] = {
        ...copy[selectedTarget.index],
        x: Math.round(dragInitialElementPos.x + dx),
        y: Math.round(dragInitialElementPos.y + dy)
      };
      setTextLayers(copy);
    } else if (selectedTarget.type === "box" && videoBoxes[selectedTarget.index]) {
      const copy = [...videoBoxes];
      copy[selectedTarget.index] = {
        ...copy[selectedTarget.index],
        x: Math.round(dragInitialElementPos.x + dx),
        y: Math.round(dragInitialElementPos.y + dy)
      };
      setVideoBoxes(copy);
    } else if (selectedTarget.type === "circle" && profileCircles[selectedTarget.index]) {
      const copy = [...profileCircles];
      copy[selectedTarget.index] = {
        ...copy[selectedTarget.index],
        x: Math.round(dragInitialElementPos.x + dx),
        y: Math.round(dragInitialElementPos.y + dy)
      };
      setProfileCircles(copy);
    } else if (selectedTarget.type === "physics" && physicsLayers[selectedTarget.index]) {
      const copy = [...physicsLayers];
      const pl = copy[selectedTarget.index];
      if (pl.params.cx !== undefined && pl.params.cy !== undefined) {
        pl.params.cx = Math.round(dragInitialElementPos.x + dx);
        pl.params.cy = Math.round(dragInitialElementPos.y + dy);
        setPhysicsLayers(copy);
      }
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
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
  }, [isPlaying, currentTime, duration, canvasWidth, canvasHeight, bgType, bgMaxRed, bgCenterColor, bgEdgeColor, showBgGrid, textLayers, videoBoxes, profileCircles, physicsLayers, showGuides, vfxGlitch, vfxShake, vfxBloom, vfxChroma, selectedTarget]);

  const drawCanvas = (ctx: CanvasRenderingContext2D, w: number, h: number, time: number) => {
    if (!w || !h || w <= 0 || h <= 0) return;
    ctx.save();
    try {
      ctx.clearRect(0, 0, w, h);

      // Apply Screen Shake VFX in initial 1.2s
      if (vfxShake && time <= 1.2) {
        const shakeAmt = (1.2 - time) * 6;
        const sx = (Math.random() - 0.5) * shakeAmt;
        const sy = (Math.random() - 0.5) * shakeAmt;
        ctx.translate(sx, sy);
      }

      // 1. Draw Background
      if (bgType === "spotlight") {
        const r0 = Math.max(0.1, 10);
        const r1 = Math.max(r0 + 10, Math.max(w, h) * 0.48);
        const radGrad = ctx.createRadialGradient(w / 2, h / 2, r0, w / 2, h / 2, r1);
        const centerCol = bgCenterColor || "#251b42";
        const edgeCol = bgEdgeColor || "#07060a";
        radGrad.addColorStop(0, centerCol);
        radGrad.addColorStop(0.35, hexToRgba(centerCol, 0.7));
        radGrad.addColorStop(0.7, hexToRgba(edgeCol, 0.9));
        radGrad.addColorStop(1, edgeCol);
        ctx.fillStyle = radGrad;
        ctx.fillRect(0, 0, w, h);
      } else if (bgType === "radial") {
        const r0 = Math.max(0.1, 20);
        const r1 = Math.max(r0 + 10, Math.max(w, h) / 1.5);
        const radGrad = ctx.createRadialGradient(w / 2, h / 2, r0, w / 2, h / 2, r1);
        const centerCol = bgCenterColor || `rgb(${bgMaxRed}, 8, 18)`;
        const edgeCol = bgEdgeColor || "#030005";
        radGrad.addColorStop(0, centerCol);
        radGrad.addColorStop(0.6, hexToRgba(centerCol, 0.4));
        radGrad.addColorStop(1, edgeCol);
        ctx.fillStyle = radGrad;
        ctx.fillRect(0, 0, w, h);
      } else {
        const linGrad = ctx.createLinearGradient(0, 0, 0, Math.max(1, h));
        const topCol = bgCenterColor || `rgb(${bgMaxRed}, 10, 20)`;
        const botCol = bgEdgeColor || "#030005";
        linGrad.addColorStop(0, topCol);
        linGrad.addColorStop(1, botCol);
        ctx.fillStyle = linGrad;
        ctx.fillRect(0, 0, w, h);
      }

      // Background Cyber Grid
      if (showBgGrid && bgType !== "spotlight") {
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
      }

      // 1.5 Draw Background-level Physics Layers (volumetric_glow, wave_line, liquid_flow)
      const scaleX = w / canvasWidth;
      const scaleY = h / canvasHeight;

      physicsLayers.forEach((pl, idx) => {
        if (!pl.enabled) return;
        ctx.save();

        if (pl.type === "volumetric_glow") {
          const pcx = (pl.params.cx ?? canvasWidth / 2) * scaleX;
          const pcy = (pl.params.cy ?? canvasHeight / 2) * scaleY;
          const pulse = 1.0 + Math.sin(time * 3.0 * (pl.params.speed ?? 1.0)) * 0.25;
          const radius = Math.max(1, Math.min(w, h) * 0.45 * pulse);
          const r0 = Math.max(0.1, Math.min(5, radius * 0.5));
          const r1 = Math.max(r0 + 5, radius);
          const grad = ctx.createRadialGradient(pcx, pcy, r0, pcx, pcy, r1);
          const glowColor = pl.params.glow_color || pl.params.color || "#00FFFF";
          grad.addColorStop(0, glowColor);
          grad.addColorStop(0.3, hexToRgba(glowColor, 0.4));
          grad.addColorStop(1, "transparent");
          ctx.globalAlpha = (pl.params.intensity ?? 0.8) * 0.4;
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(pcx, pcy, Math.max(0.1, radius), 0, Math.PI * 2);
          ctx.fill();
      } else if (pl.type === "wave_line") {
        const amp = (pl.params.amplitude ?? 30) * scaleY;
        const freq = (pl.params.frequency ?? 0.02) / scaleX;
        const baseY = (pl.params.y ?? canvasHeight * 0.65) * scaleY;
        ctx.beginPath();
        ctx.strokeStyle = pl.params.color || "#00FFFF";
        ctx.lineWidth = Math.max(1.5, (pl.params.thickness ?? 2) * scaleY);
        ctx.shadowColor = pl.params.color || "#00FFFF";
        ctx.shadowBlur = vfxBloom ? 10 : 2;
        for (let x = 0; x <= w; x += 6) {
          const y = baseY + Math.sin(x * freq + time * 4.0) * amp;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else if (pl.type === "liquid_flow") {
        ctx.strokeStyle = "rgba(0, 255, 200, 0.18)";
        ctx.lineWidth = 1.5;
        for (let row = 0; row < 4; row++) {
          ctx.beginPath();
          const base = (h * (0.2 + row * 0.22));
          for (let x = 0; x <= w; x += 10) {
            const y = base + Math.sin(x * 0.015 + time * 2.5 + row) * 14 + Math.cos(x * 0.008 + time * 1.8) * 8;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }

      ctx.restore();
    });

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
      ctx.fillText(`${box.width}×${box.height} @ (${box.x}, ${box.y})`, bx + 12, by + bh - 10);

      // Selection Frame if Active
      if (selectedTarget && selectedTarget.type === "box" && selectedTarget.index === idx) {
        ctx.save();
        ctx.strokeStyle = "#00FFCC";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(bx - 6, by - 6, bw + 12, bh + 12);
        ctx.setLineDash([]);

        // 4 Corner Anchor Handles
        ctx.fillStyle = "#00FFCC";
        const handleSize = 8;
        ctx.fillRect(bx - 6 - handleSize / 2, by - 6 - handleSize / 2, handleSize, handleSize);
        ctx.fillRect(bx + bw + 6 - handleSize / 2, by - 6 - handleSize / 2, handleSize, handleSize);
        ctx.fillRect(bx - 6 - handleSize / 2, by + bh + 6 - handleSize / 2, handleSize, handleSize);
        ctx.fillRect(bx + bw + 6 - handleSize / 2, by + bh + 6 - handleSize / 2, handleSize, handleSize);

        // Header Selected Tag
        ctx.fillStyle = "#00FFCC";
        ctx.fillRect(bx - 6, by - 26, Math.min(220, bw + 12), 20);
        ctx.fillStyle = "#000000";
        ctx.font = "bold 11px monospace";
        ctx.fillText(`BOX #${idx + 1} • ${box.width}×${box.height} (${box.x},${box.y})`, bx - 2, by - 12);
        ctx.restore();
      }
    });

    // 3. Draw Profile Circle Safe-Zones
    profileCircles.forEach((circ, idx) => {
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

      // Selection Frame if Active
      if (selectedTarget && selectedTarget.type === "circle" && selectedTarget.index === idx) {
        ctx.save();
        ctx.strokeStyle = "#00FFFF";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(cx - cr - 10, cy - cr - 10, (cr + 10) * 2, (cr + 10) * 2);
        ctx.setLineDash([]);

        // Floating info badge
        ctx.fillStyle = "#00FFFF";
        ctx.fillRect(cx - cr - 10, cy - cr - 30, 200, 20);
        ctx.fillStyle = "#000000";
        ctx.font = "bold 11px monospace";
        ctx.fillText(`PROFILE CIRCLE • (${circ.x}, ${circ.y}) R:${circ.radius}`, cx - cr - 6, cy - cr - 16);
        ctx.restore();
      }
    });

    // 4. Draw Text Layers
    textLayers.forEach((tl, idx) => {
      let animOffset = 0;
      let alpha = 1.0;
      let scaleFactorX = 1.0;
      let scaleFactorY = 1.0;

      if (tl.animation === "bounce") {
        animOffset = Math.sin(time * 4.0) * (h * 0.015);
      } else if (tl.animation === "flicker" && vfxGlitch && Math.random() < 0.25 && time < 2.0) {
        alpha = 0.3;
      } else if (tl.animation === "squash_and_stretch") {
        const cycle = Math.sin(time * 5.0);
        scaleFactorX = 1.0 + cycle * 0.22;
        scaleFactorY = 1.0 - cycle * 0.22;
      } else if (tl.animation === "elastic_spring") {
        const decay = Math.exp(-Math.min(time * 1.5, 4));
        const spring = Math.cos(time * 10.0) * decay;
        scaleFactorX = 1.0 + spring * 0.25;
        scaleFactorY = 1.0 + spring * 0.25;
      } else if (tl.animation === "kinetic_dispersion") {
        const disperse = Math.sin(time * 4.0) * 8;
        animOffset = (Math.random() - 0.5) * disperse * 0.5;
      } else if (tl.animation === "cinematic_fade") {
        // Smooth cinematic luminous fade-in matching The Whippet video (0 to 3.5s)
        alpha = Math.min(1.0, Math.max(0.15, time * 0.38));
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

      ctx.translate(posX, posY);
      ctx.scale(scaleFactorX, scaleFactorY);
      ctx.translate(-posX, -posY);

      ctx.textAlign = "center";

      // Letter spacing support for cinematic widescreen cards
      if (tl.letter_spacing) {
        try {
          (ctx as any).letterSpacing = `${Math.round(tl.letter_spacing * scaleX)}px`;
        } catch {
          // ignore if letterSpacing is unsupported
        }
      }

      const glowColor = tl.glow_color || (vfxBloom ? (tl.color || "#00FFFF") : undefined);
      const glowBlur = tl.glow_blur !== undefined ? (tl.glow_blur * scaleY) : (vfxBloom ? 18 : 0);

      // Neon electric glow stroke (e.g. The Whippet electric cyan outline)
      if (tl.stroke_color) {
        ctx.save();
        ctx.strokeStyle = tl.stroke_color;
        ctx.lineWidth = Math.max(1, (tl.stroke_width || 3) * scaleY);
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        if (glowColor) {
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = glowBlur * 1.5;
        }
        ctx.strokeText(tl.text, posX, posY);
        ctx.restore();
      }

      if (glowColor) {
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = glowBlur;
      }

      // Chromatic Aberration Simulation (Offset red & cyan)
      if ((vfxChroma && time <= 2.5) || tl.animation === "kinetic_dispersion") {
        ctx.fillStyle = "rgba(255, 0, 80, 0.7)";
        ctx.fillText(tl.text, posX + 3, posY);
        ctx.fillStyle = "rgba(0, 255, 255, 0.7)";
        ctx.fillText(tl.text, posX - 3, posY);
      }

      ctx.fillStyle = tl.color || "#FFFFFF";
      ctx.fillText(tl.text, posX, posY);
      ctx.restore();

      // Selection Frame if Active
      if (selectedTarget && selectedTarget.type === "text" && selectedTarget.index === idx) {
        ctx.save();
        ctx.font = `bold ${fontSize}px sans-serif`;
        const textMetrics = ctx.measureText(tl.text);
        const textW = textMetrics.width;
        const textH = fontSize * 1.2;
        const selX = posX - textW / 2 - 12;
        const selY = posY - fontSize + 2;

        ctx.strokeStyle = "#FF007F";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(selX, selY, textW + 24, textH + 8);
        ctx.setLineDash([]);

        // Selected Tag Badge
        ctx.fillStyle = "#FF007F";
        ctx.fillRect(selX, selY - 20, Math.min(230, textW + 24), 20);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 11px monospace";
        ctx.fillText(`TEXT #${idx + 1} • X:${tl.x ?? Math.round(canvasWidth/2)} Y:${tl.y ?? Math.round(canvasHeight*0.3)}`, selX + 4, selY - 6);
        ctx.restore();
      }
    });

    // 4.5 Draw Foreground Physics Layers (shockwave, vortex, page_curl, crt_scanlines, datamosh) & Selection Handles
    physicsLayers.forEach((pl, idx) => {
      if (!pl.enabled) return;
      ctx.save();

      if (pl.type === "shockwave") {
        const pcx = (pl.params.cx ?? canvasWidth / 2) * scaleX;
        const pcy = (pl.params.cy ?? canvasHeight / 2) * scaleY;
        const speed = pl.params.speed ?? 1.0;
        const progress = (time * speed) % 1.5;
        const maxR = Math.max(1, (pl.params.radius ?? 300) * scaleX);
        const curR = Math.max(0.1, maxR * (progress / 1.5));
        const waveWidth = Math.max(1, (pl.params.wave_width ?? 40) * scaleX);

        ctx.beginPath();
        ctx.arc(pcx, pcy, Math.max(0.1, curR), 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(0, 255, 255, 0.7)";
        ctx.lineWidth = Math.max(2, waveWidth * 0.3);
        ctx.shadowColor = "#00FFFF";
        ctx.shadowBlur = 15;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(pcx, pcy, Math.max(0.1, curR - waveWidth * 0.5), 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 0, 128, 0.4)";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (pl.type === "vortex") {
        const pcx = (pl.params.cx ?? canvasWidth / 2) * scaleX;
        const pcy = (pl.params.cy ?? canvasHeight / 2) * scaleY;
        const maxR = Math.max(1, (pl.params.radius ?? 250) * scaleX);
        const angleOffset = time * 3.0;

        ctx.save();
        ctx.translate(pcx, pcy);
        ctx.rotate(angleOffset);
        for (let ring = 0; ring < 3; ring++) {
          ctx.beginPath();
          ctx.arc(0, 0, Math.max(0.1, (maxR / 3) * (ring + 1)), 0, Math.PI * 1.6);
          ctx.strokeStyle = ring === 1 ? "#00FFFF" : "rgba(255, 0, 128, 0.5)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.restore();
      } else if (pl.type === "page_curl") {
        const curlW = w * (pl.params.roll_width_pct ?? 0.25);
        ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
        ctx.beginPath();
        ctx.moveTo(w, 0);
        ctx.lineTo(w - curlW, 0);
        ctx.lineTo(w, curlW);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(w - curlW, 0);
        ctx.lineTo(w, curlW);
        ctx.stroke();
      } else if (pl.type === "crt_scanlines") {
        const lineSpacing = 4;
        const lineAlpha = (pl.params.opacity ?? 0.25) * 0.3;
        ctx.fillStyle = `rgba(0, 0, 0, ${lineAlpha})`;
        for (let y = 0; y < h; y += lineSpacing) {
          ctx.fillRect(0, y, w, 1.5);
        }
      } else if (pl.type === "datamosh" && Math.random() < (pl.params.probability ?? 0.15)) {
        const blockSize = (pl.params.macroblock_size ?? 16) * scaleX;
        ctx.fillStyle = "rgba(0, 255, 200, 0.3)";
        for (let i = 0; i < 4; i++) {
          const gx = Math.random() * (w - blockSize * 3);
          const gy = Math.random() * (h - blockSize * 2);
          ctx.fillRect(gx, gy, blockSize * 2, blockSize);
        }
      }

      ctx.restore();

      // Selection Frame for Physics Layer
      if (selectedTarget && selectedTarget.type === "physics" && selectedTarget.index === idx) {
        ctx.save();
        const pcx = (pl.params.cx ?? canvasWidth / 2) * scaleX;
        const pcy = (pl.params.cy ?? canvasHeight / 2) * scaleY;

        ctx.strokeStyle = "#00FFFF";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);

        // Draw crosshair or bounding circle
        if (pl.params.cx !== undefined && pl.params.cy !== undefined) {
          ctx.beginPath();
          ctx.arc(pcx, pcy, 28, 0, Math.PI * 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(pcx - 36, pcy);
          ctx.lineTo(pcx + 36, pcy);
          ctx.moveTo(pcx, pcy - 36);
          ctx.lineTo(pcx, pcy + 36);
          ctx.stroke();

          // Info badge
          ctx.setLineDash([]);
          ctx.fillStyle = "#00FFFF";
          ctx.fillRect(pcx - 80, pcy - 50, 160, 20);
          ctx.fillStyle = "#000000";
          ctx.font = "bold 10px monospace";
          ctx.textAlign = "center";
          ctx.fillText(`PHYSICS • ${pl.name.toUpperCase()}`, pcx, pcy - 36);
        } else {
          ctx.strokeRect(10, 10, w - 20, h - 20);
          ctx.setLineDash([]);
          ctx.fillStyle = "#00FFFF";
          ctx.fillRect(14, 14, 180, 20);
          ctx.fillStyle = "#000000";
          ctx.font = "bold 10px monospace";
          ctx.fillText(`GLOBAL FX • ${pl.name.toUpperCase()}`, 20, 28);
        }
        ctx.restore();
      }
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
    } catch (err) {
      console.warn("[StreamInject] Draw error:", err);
    } finally {
      ctx.restore();
    }
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
        max_red: bgMaxRed,
        center_color: bgCenterColor,
        edge_color: bgEdgeColor,
        show_grid: showBgGrid
      },
      text_layers: textLayers,
      video_boxes: videoBoxes,
      profile_circles: profileCircles,
      physics_layers: physicsLayers,
      vfx: {
        enable_glitch: vfxGlitch,
        enable_shake: vfxShake,
        enable_bloom: vfxBloom,
        enable_chroma: vfxChroma
      },
      audio: studioAudioPath ? {
        path: studioAudioPath,
        start_offset: studioAudioStartOffset,
        trim_start: studioAudioTrimStart > 0 ? studioAudioTrimStart : undefined,
        trim_end: studioAudioTrimEnd > 0 ? studioAudioTrimEnd : undefined,
        volume: studioAudioVolume,
        fade_in: studioAudioFadeIn,
        fade_out: studioAudioFadeOut
      } : undefined
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
      overlayFinishTime: overlayFinish > 0 ? overlayFinish : undefined,
      chromaColor: chromaColor || "0x00FF00",
      chromaSimilarity: chromaSimilarity,
      chromaBlend: chromaBlend,
      watermarkPath: watermarkPath || undefined,
      watermarkPos: watermarkPos,
      watermarkStartTime: watermarkStart,
      watermarkFinishTime: watermarkFinish > 0 ? watermarkFinish : undefined,
      watermarkOpacity: watermarkOpacity,
      subtitlePath: subtitlePath || undefined,
      audioTrackPath: audioTrackPath || undefined,
      audioStartTime: audioStartOffset,
      audioTrimStart: audioTrimStart > 0 ? audioTrimStart : undefined,
      audioTrimEnd: audioTrimEnd > 0 ? audioTrimEnd : undefined,
      audioVolume: audioVolume,
      audioFadeIn: audioFadeIn,
      audioFadeOut: audioFadeOut,
      stripAudio: stripAudio,
      removeWatermark: removeWatermark,
      wmX: wmX,
      wmY: wmY,
      wmW: wmW,
      wmH: wmH
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
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: "gameplay" | "intro" | "outro" | "watermark" | "chroma" | "audio" | "subtitle" | "studio_audio") => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    // Guard against browser Base64 memory exhaustion on large files (> 35MB)
    if (file.size > 35 * 1024 * 1024) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setUploadError(
        `File "${file.name}" is ${sizeMb} MB. Browser HTTP uploads are capped at 35 MB. For large video recordings (e.g. 300MB - 50GB): copy the file to "C:\\Gina_AI\\.gina_runtime\\streaminject\\input" (or "C:\\Gina_AI\\StreamInject\\input") and select it from the dropdown, or paste its full local path directly into the custom path field below.`
      );
      // Reset input element so user can retry
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      try {
        const res = await fetch("/api/streaminject/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, base64Data, targetField })
        });
        const data = await res.json();
        if (data.ok) {
          if (targetField === "gameplay") setGameplayPath(data.path);
          if (targetField === "intro") setIntroPath(data.path);
          if (targetField === "outro") setOutroPath(data.path);
          if (targetField === "watermark") setWatermarkPath(data.path);
          if (targetField === "chroma") setChromaOverlay(data.path);
          if (targetField === "audio") setAudioTrackPath(data.path);
          if (targetField === "studio_audio") setStudioAudioPath(data.path);
          if (targetField === "subtitle") setSubtitlePath(data.path);
          await fetchMediaFiles();
        } else {
          throw new Error(data.error || "Upload failed");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setUploadError(message);
        console.error("Upload error:", err);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
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
            Intro/Outro Studio
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

      {/* Upload Warning / Information Banner */}
      {uploadError && (
        <div className="flex items-start justify-between gap-3 p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs shadow-lg animate-fadeIn">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="font-bold text-amber-300">Upload Information / Size Notice</span>
              <p className="text-amber-200/90 leading-relaxed">{uploadError}</p>
            </div>
          </div>
          <button
            onClick={() => setUploadError(null)}
            className="text-amber-400 hover:text-white p-1 rounded-md transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: INTRO/OUTRO STUDIO */}
      {activeTab === "studio" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left Column: Live Interactive Canvas Stage (7 Cols) */}
          <div className="xl:col-span-7 flex flex-col gap-4 bg-slate-900/70 p-5 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-md">
            {/* Canvas Stage Header Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                  <Tv className="w-4 h-4" /> Intro/Outro Stage
                </span>
                <span className="text-xs text-slate-500">({canvasWidth}×{canvasHeight})</span>
              </div>

              {/* Duration & Aspect Ratio Selector */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-xs">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-slate-400 text-[11px]">Duration:</span>
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
                    className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white text-center font-mono font-bold"
                  />
                  <span className="text-slate-400 text-[11px]">sec</span>
                </div>

                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  <button
                    onClick={() => handleAspectChange("16:9")}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
                      aspectRatio === "16:9" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Tv className="w-3.5 h-3.5" /> 16:9
                  </button>
                  <button
                    onClick={() => handleAspectChange("9:16")}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
                      aspectRatio === "9:16" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" /> 9:16
                  </button>
                </div>
              </div>
            </div>

            {/* Canvas Display Frame */}
            <div className="relative w-full flex items-center justify-center bg-black/90 rounded-xl overflow-hidden border border-purple-500/20 shadow-2xl min-h-[380px] aspect-video select-none">
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

              {/* Aspect Badge */}
              <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/70 backdrop-blur border border-white/10 text-[10px] font-mono text-cyan-300">
                {canvasWidth}×{canvasHeight} • {aspectRatio}
              </div>

              {/* Guide Overlay Toggle */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                <button
                  onClick={() => setShowGuides(!showGuides)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold border backdrop-blur transition-all ${
                    showGuides
                      ? "bg-purple-600/60 border-purple-400 text-white"
                      : "bg-black/60 border-white/10 text-slate-400"
                  }`}
                >
                  {showGuides ? "Guides ON" : "Guides OFF"}
                </button>
              </div>

              {/* Active Selection Overlay Indicator */}
              {selectedTarget && (
                <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur border border-purple-500/40 text-xs shadow-lg">
                  <Move className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                  <span className="text-slate-300 font-mono text-[11px]">
                    {selectedTarget.type === "text" && `Text #${selectedTarget.index + 1}: "${textLayers[selectedTarget.index]?.text?.slice(0, 16)}..."`}
                    {selectedTarget.type === "box" && `Box #${selectedTarget.index + 1}: ${videoBoxes[selectedTarget.index]?.label || "Video Box"}`}
                    {selectedTarget.type === "circle" && `Profile Circle #${selectedTarget.index + 1}`}
                  </span>
                  <span className="text-purple-300/60 text-[10px]">| Drag on canvas or use Arrow keys</span>
                </div>
              )}
            </div>

            {/* Interactive Transform Toolbar (Move, Align, Layer Order & Nudge Controls) */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-purple-500/30 shadow-lg flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-purple-500/20 text-purple-300">
                    <Crosshair className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      Layer Transform & Position Controls
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Select any text layer, video box, or circle to interactively reposition or align
                    </p>
                  </div>
                </div>

                {/* Layer Selector Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {textLayers.map((tl, i) => (
                    <button
                      key={`t-${i}`}
                      onClick={() => setSelectedTarget({ type: "text", index: i })}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold border transition-all ${
                        selectedTarget?.type === "text" && selectedTarget.index === i
                          ? "bg-pink-600/30 border-pink-400 text-pink-200 shadow-sm"
                          : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Type className="w-3 h-3 text-pink-400" /> T{i + 1}
                    </button>
                  ))}
                  {videoBoxes.map((vb, i) => (
                    <button
                      key={`b-${i}`}
                      onClick={() => setSelectedTarget({ type: "box", index: i })}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold border transition-all ${
                        selectedTarget?.type === "box" && selectedTarget.index === i
                          ? "bg-emerald-600/30 border-emerald-400 text-emerald-200 shadow-sm"
                          : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Square className="w-3 h-3 text-emerald-400" /> Box {i + 1}
                    </button>
                  ))}
                  {profileCircles.map((pc, i) => (
                    <button
                      key={`c-${i}`}
                      onClick={() => setSelectedTarget({ type: "circle", index: i })}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold border transition-all ${
                        selectedTarget?.type === "circle" && selectedTarget.index === i
                          ? "bg-cyan-600/30 border-cyan-400 text-cyan-200 shadow-sm"
                          : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <CircleDot className="w-3 h-3 text-cyan-400" /> Circle {i + 1}
                    </button>
                  ))}
                </div>
              </div>

              {selectedTarget ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 border-t border-slate-800/80">
                  {/* Directional Nudge Pad */}
                  <div className="flex items-center gap-2 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                    <div className="grid grid-cols-3 gap-1 w-24">
                      <div />
                      <button
                        onClick={() => nudgeSelected(0, -nudgeStep)}
                        title="Move Up (ArrowUp)"
                        className="p-1.5 rounded bg-slate-800 hover:bg-purple-600 text-slate-200 hover:text-white flex items-center justify-center transition-colors"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <div />
                      <button
                        onClick={() => nudgeSelected(-nudgeStep, 0)}
                        title="Move Left (ArrowLeft)"
                        className="p-1.5 rounded bg-slate-800 hover:bg-purple-600 text-slate-200 hover:text-white flex items-center justify-center transition-colors"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => alignSelected("center_both")}
                        title="Center Element on Screen"
                        className="p-1.5 rounded bg-purple-700/60 hover:bg-purple-600 text-purple-200 flex items-center justify-center transition-colors"
                      >
                        <Crosshair className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => nudgeSelected(nudgeStep, 0)}
                        title="Move Right (ArrowRight)"
                        className="p-1.5 rounded bg-slate-800 hover:bg-purple-600 text-slate-200 hover:text-white flex items-center justify-center transition-colors"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <div />
                      <button
                        onClick={() => nudgeSelected(0, nudgeStep)}
                        title="Move Down (ArrowDown)"
                        className="p-1.5 rounded bg-slate-800 hover:bg-purple-600 text-slate-200 hover:text-white flex items-center justify-center transition-colors"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <div />
                    </div>

                    <div className="flex flex-col gap-1.5 flex-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Nudge Step:</span>
                        <span className="font-mono font-bold text-purple-300">{nudgeStep}px</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 5, 10, 25, 50].map((step) => (
                          <button
                            key={step}
                            onClick={() => setNudgeStep(step)}
                            className={`flex-1 py-0.5 rounded text-[10px] font-mono font-semibold border transition-colors ${
                              nudgeStep === step
                                ? "bg-purple-600 border-purple-400 text-white"
                                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            {step}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Alignment Presets */}
                  <div className="flex flex-col justify-between gap-1.5 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Auto-Alignment
                    </span>
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        onClick={() => alignSelected("center_x")}
                        className="flex items-center justify-center gap-1 py-1 px-1.5 rounded bg-slate-900 hover:bg-slate-800 text-[11px] text-slate-200 border border-slate-800"
                        title="Center Horizontally"
                      >
                        <AlignCenter className="w-3 h-3 text-cyan-400" /> Center X
                      </button>
                      <button
                        onClick={() => alignSelected("center_y")}
                        className="flex items-center justify-center gap-1 py-1 px-1.5 rounded bg-slate-900 hover:bg-slate-800 text-[11px] text-slate-200 border border-slate-800"
                        title="Center Vertically"
                      >
                        <AlignCenter className="w-3 h-3 text-cyan-400 rotate-90" /> Center Y
                      </button>
                      <button
                        onClick={() => alignSelected("center_both")}
                        className="flex items-center justify-center gap-1 py-1 px-1.5 rounded bg-purple-900/40 hover:bg-purple-900/70 text-[11px] text-purple-200 border border-purple-500/30"
                        title="Dead Center"
                      >
                        <Crosshair className="w-3 h-3 text-purple-400" /> Center
                      </button>
                      <button
                        onClick={() => alignSelected("top")}
                        className="flex items-center justify-center gap-1 py-1 px-1.5 rounded bg-slate-900 hover:bg-slate-800 text-[11px] text-slate-200 border border-slate-800"
                      >
                        <AlignLeft className="w-3 h-3 text-slate-400 rotate-90" /> Top
                      </button>
                      <button
                        onClick={() => alignSelected("left")}
                        className="flex items-center justify-center gap-1 py-1 px-1.5 rounded bg-slate-900 hover:bg-slate-800 text-[11px] text-slate-200 border border-slate-800"
                      >
                        <AlignLeft className="w-3 h-3 text-slate-400" /> Left
                      </button>
                      <button
                        onClick={() => alignSelected("right")}
                        className="flex items-center justify-center gap-1 py-1 px-1.5 rounded bg-slate-900 hover:bg-slate-800 text-[11px] text-slate-200 border border-slate-800"
                      >
                        <AlignRight className="w-3 h-3 text-slate-400" /> Right
                      </button>
                    </div>
                  </div>

                  {/* Layer Operations (Z-Order, Duplicate, Delete) */}
                  <div className="flex flex-col justify-between gap-1.5 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Layer Actions
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => moveLayerOrder(selectedTarget.type, selectedTarget.index, -1)}
                        className="flex items-center justify-center gap-1 py-1 px-2 rounded bg-slate-900 hover:bg-slate-800 text-[11px] text-slate-300 border border-slate-800"
                      >
                        <ChevronUp className="w-3.5 h-3.5 text-purple-400" /> Move Up
                      </button>
                      <button
                        onClick={() => moveLayerOrder(selectedTarget.type, selectedTarget.index, 1)}
                        className="flex items-center justify-center gap-1 py-1 px-2 rounded bg-slate-900 hover:bg-slate-800 text-[11px] text-slate-300 border border-slate-800"
                      >
                        <ChevronDown className="w-3.5 h-3.5 text-purple-400" /> Move Down
                      </button>
                      <button
                        onClick={duplicateSelected}
                        className="flex items-center justify-center gap-1 py-1 px-2 rounded bg-slate-900 hover:bg-slate-800 text-[11px] text-cyan-300 border border-cyan-500/20"
                      >
                        <Copy className="w-3.5 h-3.5" /> Clone
                      </button>
                      <button
                        onClick={deleteSelected}
                        className="flex items-center justify-center gap-1 py-1 px-2 rounded bg-red-950/40 hover:bg-red-950/70 text-[11px] text-red-300 border border-red-500/30"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-slate-950/50 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                  Click any element on the canvas preview or use the selector buttons above to adjust its position and alignment.
                </div>
              )}
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
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Studio Quick Presets ({presets.length})
                </h2>
                {/* Category Filter Tabs */}
                <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setPresetFilter("all")}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                      presetFilter === "all"
                        ? "bg-purple-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    All ({presets.length})
                  </button>
                  <button
                    onClick={() => setPresetFilter("physics")}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 transition-colors ${
                      presetFilter === "physics"
                        ? "bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/30"
                        : "text-cyan-400 hover:text-cyan-300"
                    }`}
                  >
                    <Zap className="w-3 h-3" /> Physics FX ({presets.filter(p => !!p.config.physics_layers?.length || p.id.startsWith("physics_")).length})
                  </button>
                  <button
                    onClick={() => setPresetFilter("classic")}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                      presetFilter === "classic"
                        ? "bg-purple-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Classic ({presets.filter(p => !p.config.physics_layers?.length && !p.id.startsWith("physics_")).length})
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {presets
                  .filter((preset) => {
                    const isPhysics = !!preset.config.physics_layers?.length || preset.id.startsWith("physics_");
                    if (presetFilter === "physics") return isPhysics;
                    if (presetFilter === "classic") return !isPhysics;
                    return true;
                  })
                  .map((preset) => {
                    const isPhysics = !!preset.config.physics_layers?.length || preset.id.startsWith("physics_");
                    return (
                      <button
                        key={preset.id}
                        onClick={() => applyPreset(preset)}
                        className={`flex flex-col items-start p-3 rounded-xl bg-slate-950/70 border text-left transition-all group relative overflow-hidden ${
                          isPhysics
                            ? "border-cyan-500/30 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-950/30"
                            : "border-slate-800 hover:border-purple-500/50"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full gap-1">
                          <span className={`text-xs font-bold transition-colors ${
                            isPhysics ? "text-cyan-200 group-hover:text-cyan-100" : "text-slate-200 group-hover:text-purple-300"
                          }`}>
                            {preset.name}
                          </span>
                          <span className="px-1.5 py-0.5 text-[9px] rounded bg-purple-500/20 text-purple-300 font-mono flex-shrink-0">
                            {preset.aspectRatio}
                          </span>
                        </div>

                        {/* Physics Badges */}
                        {isPhysics && (
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono flex items-center gap-1">
                              <Zap className="w-2.5 h-2.5 text-cyan-400" /> GMPE Physics
                            </span>
                            {preset.config.physics_layers?.map((pl) => (
                              <span key={pl.id} className="px-1 py-0.2 text-[8px] rounded bg-slate-800 text-slate-300 font-mono">
                                {pl.type}
                              </span>
                            ))}
                          </div>
                        )}

                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-tight">
                          {preset.description}
                        </p>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Studio Canvas Dimensions, Duration & Background Inspector */}
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
                <div>
                  <span className="text-slate-400 text-[11px] font-semibold">Aspect & Resolution</span>
                  <select
                    value={aspectRatio}
                    onChange={(e) => handleAspectChange(e.target.value as "16:9" | "9:16")}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white mt-1"
                  >
                    <option value="16:9">16:9 (1920×1080 Landscape)</option>
                    <option value="9:16">9:16 (1080×1920 Portrait / Shorts)</option>
                  </select>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] font-semibold">Background Theme</span>
                  <select
                    value={bgType}
                    onChange={(e) => setBgType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white mt-1"
                  >
                    <option value="radial">Kinetic Dark Radial</option>
                    <option value="linear">Neon Linear Gradient</option>
                    <option value="spotlight">Cinematic Spotlight (Indigo Vignette)</option>
                  </select>
                </div>
              </div>

              {/* Background Color Customizer & Quick Palettes */}
              <div className="pt-2.5 mt-1 border-t border-slate-800/80 flex flex-col gap-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {/* Center / Primary Color */}
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-400 text-[10px] font-semibold flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full inline-block border border-white/20" style={{ backgroundColor: bgCenterColor }} />
                      {bgType === "linear" ? "Top Gradient Color" : "Center Glow Color"}
                    </span>
                    <div className="flex items-center gap-2 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                      <input
                        type="color"
                        value={bgCenterColor}
                        onChange={(e) => setBgCenterColor(e.target.value)}
                        className="w-6 h-6 bg-transparent border-0 rounded cursor-pointer shrink-0"
                        title="Pick Center Background Color"
                      />
                      <input
                        type="text"
                        value={bgCenterColor}
                        onChange={(e) => setBgCenterColor(e.target.value)}
                        className="w-full bg-transparent text-xs text-white font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Edge / Vignette Color */}
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-400 text-[10px] font-semibold flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full inline-block border border-white/20" style={{ backgroundColor: bgEdgeColor }} />
                      {bgType === "linear" ? "Bottom Gradient Color" : "Outer Edge / Vignette Color"}
                    </span>
                    <div className="flex items-center gap-2 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                      <input
                        type="color"
                        value={bgEdgeColor}
                        onChange={(e) => setBgEdgeColor(e.target.value)}
                        className="w-6 h-6 bg-transparent border-0 rounded cursor-pointer shrink-0"
                        title="Pick Edge Background Color"
                      />
                      <input
                        type="text"
                        value={bgEdgeColor}
                        onChange={(e) => setBgEdgeColor(e.target.value)}
                        className="w-full bg-transparent text-xs text-white font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Cyber Grid Toggle */}
                  <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-950/70 border border-slate-800 cursor-pointer text-slate-300 hover:text-white transition-colors">
                      <input
                        type="checkbox"
                        checked={showBgGrid}
                        onChange={(e) => setShowBgGrid(e.target.checked)}
                        className="accent-purple-500 rounded"
                      />
                      <span className="text-[11px] font-semibold">Overlay Cyber Grid</span>
                    </label>
                  </div>
                </div>

                {/* Quick Background Theme Palettes */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mr-1">Background Palettes:</span>
                  {[
                    { name: "Whippet Indigo", center: "#251b42", edge: "#07060a", type: "spotlight" as const, grid: false },
                    { name: "Midnight Crimson", center: "#370812", edge: "#030005", type: "radial" as const, grid: true },
                    { name: "Cyber Matrix", center: "#062c19", edge: "#020a06", type: "radial" as const, grid: true },
                    { name: "Neon Ocean", center: "#082436", edge: "#02070d", type: "radial" as const, grid: true },
                    { name: "Royal Violet", center: "#280938", edge: "#06020c", type: "radial" as const, grid: true },
                    { name: "Golden Solar", center: "#382405", edge: "#0c0701", type: "radial" as const, grid: true },
                    { name: "Stealth Noir", center: "#111115", edge: "#050507", type: "spotlight" as const, grid: false },
                  ].map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => {
                        setBgCenterColor(p.center);
                        setBgEdgeColor(p.edge);
                        setBgType(p.type);
                        setShowBgGrid(p.grid);
                      }}
                      className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-950 hover:bg-slate-800 border border-slate-700/80 text-[10px] text-slate-300 hover:text-white transition-all shadow-sm"
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.center }} />
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>
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
            {/* Text Layers Inspector */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl backdrop-blur-md flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4" /> Kinetic Typography Layers ({textLayers.length})
                </h2>
                <button
                  onClick={() => {
                    const newLayer: TextLayer = {
                      text: "NEW KINETIC HEADER",
                      size: 48,
                      color: "#FFFFFF",
                      animation: "bounce",
                      x: Math.round(canvasWidth / 2),
                      y: Math.round(canvasHeight * 0.4)
                    };
                    setTextLayers([...textLayers, newLayer]);
                    setSelectedTarget({ type: "text", index: textLayers.length });
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-pink-900/40 hover:bg-pink-900/70 border border-pink-500/30 text-xs font-semibold text-pink-200 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Layer
                </button>
              </div>

              <div className="flex flex-col gap-2.5 max-h-[280px] overflow-y-auto pr-1">
                {textLayers.map((layer, idx) => {
                  const isSelected = selectedTarget?.type === "text" && selectedTarget.index === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedTarget({ type: "text", index: idx })}
                      className={`p-3 rounded-xl transition-all cursor-pointer flex flex-col gap-2.5 border ${
                        isSelected
                          ? "bg-slate-900/90 border-pink-500 shadow-md shadow-pink-900/20"
                          : "bg-slate-950/70 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 font-mono text-[10px] font-bold">
                          T{idx + 1}
                        </span>
                        <input
                          type="text"
                          value={layer.text}
                          onChange={(e) => {
                            const copy = [...textLayers];
                            copy[idx].text = e.target.value;
                            setTextLayers(copy);
                          }}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:border-pink-400 focus:outline-none"
                          placeholder="Text message..."
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setTextLayers(textLayers.filter((_, i) => i !== idx));
                            if (isSelected) setSelectedTarget(null);
                          }}
                          className="p-1 text-red-400 hover:text-red-300 transition-colors"
                          title="Delete Layer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-400 text-[10px] font-semibold">Pos X</span>
                          <input
                            type="number"
                            value={layer.x ?? Math.round(canvasWidth / 2)}
                            onChange={(e) => {
                              const copy = [...textLayers];
                              copy[idx].x = parseInt(e.target.value, 10) || 0;
                              setTextLayers(copy);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] font-semibold">Pos Y</span>
                          <input
                            type="number"
                            value={layer.y ?? Math.round(canvasHeight * 0.3)}
                            onChange={(e) => {
                              const copy = [...textLayers];
                              copy[idx].y = parseInt(e.target.value, 10) || 0;
                              setTextLayers(copy);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] font-semibold">Font Size</span>
                          <input
                            type="number"
                            value={layer.size}
                            onChange={(e) => {
                              const copy = [...textLayers];
                              copy[idx].size = parseInt(e.target.value, 10) || 32;
                              setTextLayers(copy);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] font-semibold">Animation</span>
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
                            <option value="cinematic_fade">✨ Cinematic Luminous Fade-In</option>
                            <option value="squash_and_stretch">⚡ Squash & Stretch (Physics)</option>
                            <option value="elastic_spring">⚡ Elastic Spring (Physics)</option>
                            <option value="kinetic_dispersion">⚡ Kinetic Dispersion (Physics)</option>
                          </select>
                        </div>
                      </div>

                      {/* Text Layer Color & Style Controls */}
                      <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-2">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {/* Text Fill Color */}
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-400 text-[10px] font-semibold flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full inline-block border border-white/20" style={{ backgroundColor: layer.color || "#FFFFFF" }} />
                              Text Color
                            </span>
                            <div className="flex items-center gap-1.5 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                              <input
                                type="color"
                                value={layer.color || "#FFFFFF"}
                                onChange={(e) => {
                                  const copy = [...textLayers];
                                  copy[idx].color = e.target.value;
                                  setTextLayers(copy);
                                }}
                                className="w-5 h-5 bg-transparent border-0 rounded cursor-pointer shrink-0"
                                title="Text Fill Color"
                              />
                              <input
                                type="text"
                                value={layer.color || "#FFFFFF"}
                                onChange={(e) => {
                                  const copy = [...textLayers];
                                  copy[idx].color = e.target.value;
                                  setTextLayers(copy);
                                }}
                                className="w-full bg-transparent text-[11px] text-white font-mono focus:outline-none"
                              />
                            </div>
                          </div>

                          {/* Outline / Stroke Color */}
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-400 text-[10px] font-semibold flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full inline-block border border-white/20" style={{ backgroundColor: layer.stroke_color || "#00E5FF" }} />
                              Outline Stroke
                            </span>
                            <div className="flex items-center gap-1.5 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                              <input
                                type="color"
                                value={layer.stroke_color || "#00E5FF"}
                                onChange={(e) => {
                                  const copy = [...textLayers];
                                  copy[idx].stroke_color = e.target.value;
                                  if (!copy[idx].stroke_width) copy[idx].stroke_width = 3;
                                  setTextLayers(copy);
                                }}
                                className="w-5 h-5 bg-transparent border-0 rounded cursor-pointer shrink-0"
                                title="Outline Stroke Color"
                              />
                              <input
                                type="text"
                                value={layer.stroke_color || ""}
                                placeholder="None"
                                onChange={(e) => {
                                  const copy = [...textLayers];
                                  copy[idx].stroke_color = e.target.value;
                                  setTextLayers(copy);
                                }}
                                className="w-full bg-transparent text-[11px] text-white font-mono focus:outline-none"
                              />
                            </div>
                          </div>

                          {/* Glow / Aura Color */}
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-400 text-[10px] font-semibold flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full inline-block border border-white/20" style={{ backgroundColor: layer.glow_color || "#00FFFF" }} />
                              Glow / Aura
                            </span>
                            <div className="flex items-center gap-1.5 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                              <input
                                type="color"
                                value={layer.glow_color || "#00FFFF"}
                                onChange={(e) => {
                                  const copy = [...textLayers];
                                  copy[idx].glow_color = e.target.value;
                                  if (!copy[idx].glow_blur) copy[idx].glow_blur = 18;
                                  setTextLayers(copy);
                                }}
                                className="w-5 h-5 bg-transparent border-0 rounded cursor-pointer shrink-0"
                                title="Neon Glow Color"
                              />
                              <input
                                type="text"
                                value={layer.glow_color || ""}
                                placeholder="None"
                                onChange={(e) => {
                                  const copy = [...textLayers];
                                  copy[idx].glow_color = e.target.value;
                                  setTextLayers(copy);
                                }}
                                className="w-full bg-transparent text-[11px] text-white font-mono focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Sliders for Outline Width, Glow Blur, Letter Spacing */}
                        <div className="grid grid-cols-3 gap-2 text-[11px] pt-0.5">
                          <div>
                            <div className="flex justify-between text-[10px] text-slate-400">
                              <span>Stroke Width:</span>
                              <span className="font-mono text-cyan-400">{layer.stroke_width ?? 0}px</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="12"
                              step="0.5"
                              value={layer.stroke_width ?? 0}
                              onChange={(e) => {
                                const copy = [...textLayers];
                                copy[idx].stroke_width = parseFloat(e.target.value) || 0;
                                setTextLayers(copy);
                              }}
                              className="w-full accent-cyan-500 h-1 mt-1 cursor-pointer"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between text-[10px] text-slate-400">
                              <span>Glow Blur:</span>
                              <span className="font-mono text-cyan-400">{layer.glow_blur ?? 0}px</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="50"
                              step="1"
                              value={layer.glow_blur ?? 0}
                              onChange={(e) => {
                                const copy = [...textLayers];
                                copy[idx].glow_blur = parseInt(e.target.value, 10) || 0;
                                setTextLayers(copy);
                              }}
                              className="w-full accent-cyan-500 h-1 mt-1 cursor-pointer"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between text-[10px] text-slate-400">
                              <span>Tracking:</span>
                              <span className="font-mono text-purple-400">{layer.letter_spacing ?? 0}px</span>
                            </div>
                            <input
                              type="range"
                              min="-2"
                              max="20"
                              step="1"
                              value={layer.letter_spacing ?? 0}
                              onChange={(e) => {
                                const copy = [...textLayers];
                                copy[idx].letter_spacing = parseInt(e.target.value, 10) || 0;
                                setTextLayers(copy);
                              }}
                              className="w-full accent-purple-500 h-1 mt-1 cursor-pointer"
                            />
                          </div>
                        </div>

                        {/* Quick Color Palette Swatches */}
                        <div className="flex items-center gap-1 pt-1 flex-wrap">
                          <span className="text-[10px] text-slate-500 mr-1 font-semibold">Swatches:</span>
                          {[
                            { name: "Whippet Cyan", fill: "#FFFFFF", stroke: "#00E5FF", glow: "#00E5FF" },
                            { name: "Electric Blue", fill: "#00FFFF", stroke: "#0077FF", glow: "#00FFFF" },
                            { name: "Neon Pink", fill: "#FFFFFF", stroke: "#FF007F", glow: "#FF007F" },
                            { name: "Solar Gold", fill: "#FFF7D6", stroke: "#FFB700", glow: "#FFB700" },
                            { name: "Matrix Green", fill: "#E6FFF2", stroke: "#00FF66", glow: "#00FF66" },
                            { name: "Pure White", fill: "#FFFFFF", stroke: "", glow: "" }
                          ].map((palette) => (
                            <button
                              key={palette.name}
                              type="button"
                              onClick={() => {
                                const copy = [...textLayers];
                                copy[idx].color = palette.fill;
                                copy[idx].stroke_color = palette.stroke || undefined;
                                copy[idx].stroke_width = palette.stroke ? 3 : 0;
                                copy[idx].glow_color = palette.glow || undefined;
                                copy[idx].glow_blur = palette.glow ? 20 : 0;
                                setTextLayers(copy);
                              }}
                              className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] text-slate-300 transition-colors"
                            >
                              {palette.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Video Box Safe-Zones Inspector */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl backdrop-blur-md flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Maximize2 className="w-4 h-4" /> Video Box Safe-Zones ({videoBoxes.length})
                </h2>
                <button
                  onClick={() => {
                    const newBox: VideoBox = {
                      x: Math.round(canvasWidth * 0.1),
                      y: Math.round(canvasHeight * 0.4),
                      width: Math.round(canvasWidth * 0.35),
                      height: Math.round(canvasHeight * 0.35),
                      label: `VIDEO BOX #${videoBoxes.length + 1}`,
                      border_color: "#00FFCC"
                    };
                    setVideoBoxes([...videoBoxes, newBox]);
                    setSelectedTarget({ type: "box", index: videoBoxes.length });
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-900/40 hover:bg-emerald-900/70 border border-emerald-500/30 text-xs font-semibold text-emerald-200 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Box
                </button>
              </div>

              <div className="flex flex-col gap-2.5 max-h-[260px] overflow-y-auto pr-1">
                {videoBoxes.map((box, idx) => {
                  const isSelected = selectedTarget?.type === "box" && selectedTarget.index === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedTarget({ type: "box", index: idx })}
                      className={`p-3 rounded-xl transition-all cursor-pointer flex flex-col gap-2.5 border ${
                        isSelected
                          ? "bg-slate-900/90 border-emerald-500 shadow-md shadow-emerald-900/20"
                          : "bg-slate-950/70 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                          Box {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={box.label || ""}
                          onChange={(e) => {
                            const copy = [...videoBoxes];
                            copy[idx].label = e.target.value;
                            setVideoBoxes(copy);
                          }}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:border-emerald-400 focus:outline-none"
                          placeholder="Box Label (e.g. PREVIOUS VIDEO)"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setVideoBoxes(videoBoxes.filter((_, i) => i !== idx));
                            if (isSelected) setSelectedTarget(null);
                          }}
                          className="p-1 text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-400 text-[10px] font-semibold">X</span>
                          <input
                            type="number"
                            value={box.x}
                            onChange={(e) => {
                              const copy = [...videoBoxes];
                              copy[idx].x = parseInt(e.target.value, 10) || 0;
                              setVideoBoxes(copy);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] font-semibold">Y</span>
                          <input
                            type="number"
                            value={box.y}
                            onChange={(e) => {
                              const copy = [...videoBoxes];
                              copy[idx].y = parseInt(e.target.value, 10) || 0;
                              setVideoBoxes(copy);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] font-semibold">Width</span>
                          <input
                            type="number"
                            value={box.width}
                            onChange={(e) => {
                              const copy = [...videoBoxes];
                              copy[idx].width = Math.max(50, parseInt(e.target.value, 10) || 100);
                              setVideoBoxes(copy);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] font-semibold">Height</span>
                          <input
                            type="number"
                            value={box.height}
                            onChange={(e) => {
                              const copy = [...videoBoxes];
                              copy[idx].height = Math.max(50, parseInt(e.target.value, 10) || 100);
                              setVideoBoxes(copy);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white font-mono"
                          />
                        </div>
                      </div>

                      {/* Video Box Border Color & Palette */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 text-[10px] font-semibold flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full inline-block border border-white/20" style={{ backgroundColor: box.border_color || "#00FFFF" }} />
                            Border Glow:
                          </span>
                          <input
                            type="color"
                            value={box.border_color || "#00FFFF"}
                            onChange={(e) => {
                              const copy = [...videoBoxes];
                              copy[idx].border_color = e.target.value;
                              setVideoBoxes(copy);
                            }}
                            className="w-5 h-5 bg-transparent border-0 rounded cursor-pointer"
                            title="Border Glow Color"
                          />
                          <input
                            type="text"
                            value={box.border_color || "#00FFFF"}
                            onChange={(e) => {
                              const copy = [...videoBoxes];
                              copy[idx].border_color = e.target.value;
                              setVideoBoxes(copy);
                            }}
                            className="w-20 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-white font-mono"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          {[
                            { name: "Cyan", color: "#00FFFF" },
                            { name: "Pink", color: "#FF0055" },
                            { name: "Emerald", color: "#00FFCC" },
                            { name: "Amber", color: "#FFB700" },
                            { name: "Violet", color: "#A855F7" }
                          ].map((sw) => (
                            <button
                              key={sw.name}
                              type="button"
                              onClick={() => {
                                const copy = [...videoBoxes];
                                copy[idx].border_color = sw.color;
                                setVideoBoxes(copy);
                              }}
                              className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] text-slate-300 transition-colors"
                            >
                              {sw.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Profile Avatar Circles Safe-Zones Inspector */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl backdrop-blur-md flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <CircleDot className="w-4 h-4" /> Subscribe / Avatar Circles ({profileCircles.length})
                </h2>
                <button
                  onClick={() => {
                    const newCirc: ProfileCircle = {
                      x: Math.round(canvasWidth / 2),
                      y: Math.round(canvasHeight * 0.5),
                      radius: 120,
                      pulse: true,
                      glow_color: "#00FFFF"
                    };
                    setProfileCircles([...profileCircles, newCirc]);
                    setSelectedTarget({ type: "circle", index: profileCircles.length });
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-900/40 hover:bg-cyan-900/70 border border-cyan-500/30 text-xs font-semibold text-cyan-200 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Circle
                </button>
              </div>

              <div className="flex flex-col gap-2.5 max-h-[200px] overflow-y-auto pr-1">
                {profileCircles.map((circ, idx) => {
                  const isSelected = selectedTarget?.type === "circle" && selectedTarget.index === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedTarget({ type: "circle", index: idx })}
                      className={`p-3 rounded-xl transition-all cursor-pointer flex flex-col gap-2.5 border ${
                        isSelected
                          ? "bg-slate-900/90 border-cyan-500 shadow-md shadow-cyan-900/20"
                          : "bg-slate-950/70 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold">
                          Circle {idx + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={circ.pulse ?? true}
                              onChange={(e) => {
                                const copy = [...profileCircles];
                                copy[idx].pulse = e.target.checked;
                                setProfileCircles(copy);
                              }}
                              className="accent-cyan-500"
                            />
                            <span>Kinetic Pulse</span>
                          </label>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setProfileCircles(profileCircles.filter((_, i) => i !== idx));
                              if (isSelected) setSelectedTarget(null);
                            }}
                            className="p-1 text-red-400 hover:text-red-300 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-400 text-[10px] font-semibold">Center X</span>
                          <input
                            type="number"
                            value={circ.x}
                            onChange={(e) => {
                              const copy = [...profileCircles];
                              copy[idx].x = parseInt(e.target.value, 10) || 0;
                              setProfileCircles(copy);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] font-semibold">Center Y</span>
                          <input
                            type="number"
                            value={circ.y}
                            onChange={(e) => {
                              const copy = [...profileCircles];
                              copy[idx].y = parseInt(e.target.value, 10) || 0;
                              setProfileCircles(copy);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] font-semibold">Radius</span>
                          <input
                            type="number"
                            value={circ.radius}
                            onChange={(e) => {
                              const copy = [...profileCircles];
                              copy[idx].radius = Math.max(10, parseInt(e.target.value, 10) || 50);
                              setProfileCircles(copy);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white font-mono"
                          />
                        </div>
                      </div>

                      {/* Profile Circle Glow Color & Palette */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 text-[10px] font-semibold flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full inline-block border border-white/20" style={{ backgroundColor: circ.glow_color || "#00FFFF" }} />
                            Aura Glow:
                          </span>
                          <input
                            type="color"
                            value={circ.glow_color || "#00FFFF"}
                            onChange={(e) => {
                              const copy = [...profileCircles];
                              copy[idx].glow_color = e.target.value;
                              setProfileCircles(copy);
                            }}
                            className="w-5 h-5 bg-transparent border-0 rounded cursor-pointer"
                            title="Circle Aura Glow Color"
                          />
                          <input
                            type="text"
                            value={circ.glow_color || "#00FFFF"}
                            onChange={(e) => {
                              const copy = [...profileCircles];
                              copy[idx].glow_color = e.target.value;
                              setProfileCircles(copy);
                            }}
                            className="w-20 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-white font-mono"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          {[
                            { name: "Cyan", color: "#00FFFF" },
                            { name: "Pink", color: "#FF007F" },
                            { name: "Emerald", color: "#00FF66" },
                            { name: "Gold", color: "#FFB700" },
                            { name: "Purple", color: "#A855F7" }
                          ].map((sw) => (
                            <button
                              key={sw.name}
                              type="button"
                              onClick={() => {
                                const copy = [...profileCircles];
                                copy[idx].glow_color = sw.color;
                                setProfileCircles(copy);
                              }}
                              className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] text-slate-300 transition-colors"
                            >
                              {sw.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Motion & Geometric FX Layers (Physics Engine) Inspector */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-cyan-500/30 shadow-xl shadow-cyan-950/20 backdrop-blur-md flex flex-col gap-3 relative">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Waves className="w-4 h-4 text-cyan-400 animate-pulse" /> Motion & Geometric FX Layers ({physicsLayers.length})
                  </h2>
                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[9px] font-bold border border-cyan-500/30">
                    GMPE Vectorized
                  </span>
                </div>

                {/* Add Layer Dropdown Toggle */}
                <div className="relative">
                  <button
                    onClick={() => setShowAddPhysicsMenu(!showAddPhysicsMenu)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-cyan-500/20"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Physics FX <ChevronDown className="w-3 h-3 ml-0.5" />
                  </button>

                  {showAddPhysicsMenu && (
                    <div className="absolute right-0 top-full mt-1.5 w-64 p-2 bg-slate-950 border border-cyan-500/40 rounded-xl shadow-2xl shadow-black z-50 flex flex-col gap-1 text-xs">
                      <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 tracking-wider border-b border-slate-800">
                        Vectorized Python FX Suite
                      </div>
                      <button
                        onClick={() => handleAddPhysicsLayer("shockwave")}
                        className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-cyan-950/60 hover:text-cyan-300 text-slate-200 transition-colors text-left"
                      >
                        <span className="font-semibold">Radial Shockwave Blast</span>
                        <span className="text-[9px] font-mono text-cyan-400">Refractive</span>
                      </button>
                      <button
                        onClick={() => handleAddPhysicsLayer("wave_line")}
                        className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-cyan-950/60 hover:text-cyan-300 text-slate-200 transition-colors text-left"
                      >
                        <span className="font-semibold">Rolling Sine Wave Horizon</span>
                        <span className="text-[9px] font-mono text-cyan-400">Sinusoidal</span>
                      </button>
                      <button
                        onClick={() => handleAddPhysicsLayer("vortex")}
                        className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-cyan-950/60 hover:text-cyan-300 text-slate-200 transition-colors text-left"
                      >
                        <span className="font-semibold">Localized Twirl Vortex</span>
                        <span className="text-[9px] font-mono text-cyan-400">Radial Twist</span>
                      </button>
                      <button
                        onClick={() => handleAddPhysicsLayer("page_curl")}
                        className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-cyan-950/60 hover:text-cyan-300 text-slate-200 transition-colors text-left"
                      >
                        <span className="font-semibold">3D Page Curl Fold</span>
                        <span className="text-[9px] font-mono text-cyan-400">Cylindrical</span>
                      </button>
                      <button
                        onClick={() => handleAddPhysicsLayer("crt_scanlines")}
                        className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-cyan-950/60 hover:text-cyan-300 text-slate-200 transition-colors text-left"
                      >
                        <span className="font-semibold">CRT Scanlines & Aberration</span>
                        <span className="text-[9px] font-mono text-cyan-400">Phosphor</span>
                      </button>
                      <button
                        onClick={() => handleAddPhysicsLayer("datamosh")}
                        className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-cyan-950/60 hover:text-cyan-300 text-slate-200 transition-colors text-left"
                      >
                        <span className="font-semibold">Datamosh Block Glitch</span>
                        <span className="text-[9px] font-mono text-cyan-400">Macroblock</span>
                      </button>
                      <button
                        onClick={() => handleAddPhysicsLayer("liquid_flow")}
                        className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-cyan-950/60 hover:text-cyan-300 text-slate-200 transition-colors text-left"
                      >
                        <span className="font-semibold">Optical Liquid Flow Warp</span>
                        <span className="text-[9px] font-mono text-cyan-400">Viscous</span>
                      </button>
                      <button
                        onClick={() => handleAddPhysicsLayer("volumetric_glow")}
                        className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-cyan-950/60 hover:text-cyan-300 text-slate-200 transition-colors text-left"
                      >
                        <span className="font-semibold">Volumetric Pulsing Aura</span>
                        <span className="text-[9px] font-mono text-cyan-400">Luminous</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Empty state or list */}
              {physicsLayers.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center flex flex-col items-center gap-2.5">
                  <Waves className="w-8 h-8 text-cyan-500/50" />
                  <div className="text-xs text-slate-300 font-semibold">No Motion Physics Layers Active</div>
                  <p className="text-[11px] text-slate-400 max-w-sm">
                    Add native vectorized physics effects (shockwaves, harmonic sine waves, 3D page curls, CRT scanlines, liquid flows, or volumetric glow) rendered directly via NumPy and OpenCV.
                  </p>
                  <div className="flex flex-wrap gap-1.5 justify-center mt-1">
                    <button
                      onClick={() => handleAddPhysicsLayer("shockwave")}
                      className="px-2 py-1 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/30 text-[10px] text-cyan-300 font-semibold"
                    >
                      + Shockwave
                    </button>
                    <button
                      onClick={() => handleAddPhysicsLayer("wave_line")}
                      className="px-2 py-1 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/30 text-[10px] text-cyan-300 font-semibold"
                    >
                      + Rolling Wave
                    </button>
                    <button
                      onClick={() => handleAddPhysicsLayer("crt_scanlines")}
                      className="px-2 py-1 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/30 text-[10px] text-cyan-300 font-semibold"
                    >
                      + CRT Scanlines
                    </button>
                    <button
                      onClick={() => handleAddPhysicsLayer("volumetric_glow")}
                      className="px-2 py-1 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/30 text-[10px] text-cyan-300 font-semibold"
                    >
                      + Volumetric Glow
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-1">
                  {physicsLayers.map((layer, idx) => {
                    const isSelected = selectedTarget?.type === "physics" && selectedTarget.index === idx;
                    return (
                      <div
                        key={layer.id}
                        onClick={() => setSelectedTarget({ type: "physics", index: idx })}
                        className={`p-3.5 rounded-xl transition-all cursor-pointer flex flex-col gap-2.5 border ${
                          isSelected
                            ? "bg-slate-900/90 border-cyan-400 shadow-lg shadow-cyan-950/30"
                            : "bg-slate-950/70 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        {/* Layer Top Bar */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={layer.enabled}
                              onChange={(e) => {
                                const copy = [...physicsLayers];
                                copy[idx].enabled = e.target.checked;
                                setPhysicsLayers(copy);
                              }}
                              className="accent-cyan-400 w-4 h-4 cursor-pointer"
                              title={layer.enabled ? "Disable Layer" : "Enable Layer"}
                            />
                            <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[9px] font-bold uppercase tracking-wider flex-shrink-0">
                              {layer.type.replace("_", " ")}
                            </span>
                            <input
                              type="text"
                              value={layer.name}
                              onChange={(e) => {
                                const copy = [...physicsLayers];
                                copy[idx].name = e.target.value;
                                setPhysicsLayers(copy);
                              }}
                              className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-white focus:border-cyan-400 focus:outline-none truncate"
                            />
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Reorder Up */}
                            <button
                              disabled={idx === 0}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (idx > 0) {
                                  const copy = [...physicsLayers];
                                  const temp = copy[idx - 1];
                                  copy[idx - 1] = copy[idx];
                                  copy[idx] = temp;
                                  setPhysicsLayers(copy);
                                  setSelectedTarget({ type: "physics", index: idx - 1 });
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                              title="Move Up"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            {/* Reorder Down */}
                            <button
                              disabled={idx === physicsLayers.length - 1}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (idx < physicsLayers.length - 1) {
                                  const copy = [...physicsLayers];
                                  const temp = copy[idx + 1];
                                  copy[idx + 1] = copy[idx];
                                  copy[idx] = temp;
                                  setPhysicsLayers(copy);
                                  setSelectedTarget({ type: "physics", index: idx + 1 });
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                              title="Move Down"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            {/* Duplicate */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const clone: PhysicsLayer = {
                                  ...layer,
                                  id: `phys_${layer.type}_${Date.now().toString(36)}`,
                                  name: `${layer.name} (Copy)`,
                                  params: { ...layer.params }
                                };
                                const copy = [...physicsLayers];
                                copy.splice(idx + 1, 0, clone);
                                setPhysicsLayers(copy);
                                setSelectedTarget({ type: "physics", index: idx + 1 });
                              }}
                              className="p-1 text-slate-400 hover:text-cyan-300"
                              title="Duplicate Layer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            {/* Delete */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPhysicsLayers(physicsLayers.filter((_, i) => i !== idx));
                                setSelectedTarget(null);
                              }}
                              className="p-1 text-slate-400 hover:text-red-400"
                              title="Delete Layer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Parameter Controls Based on Type */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                          {/* Shockwave Parameters */}
                          {layer.type === "shockwave" && (
                            <>
                              <div>
                                <span className="text-slate-400 text-[10px] font-semibold">Center X</span>
                                <input
                                  type="number"
                                  value={layer.params.cx ?? Math.round(canvasWidth * 0.5)}
                                  onChange={(e) => {
                                    const copy = [...physicsLayers];
                                    copy[idx].params.cx = parseInt(e.target.value, 10) || 0;
                                    setPhysicsLayers(copy);
                                  }}
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white font-mono mt-0.5"
                                />
                              </div>
                              <div>
                                <span className="text-slate-400 text-[10px] font-semibold">Center Y</span>
                                <input
                                  type="number"
                                  value={layer.params.cy ?? Math.round(canvasHeight * 0.5)}
                                  onChange={(e) => {
                                    const copy = [...physicsLayers];
                                    copy[idx].params.cy = parseInt(e.target.value, 10) || 0;
                                    setPhysicsLayers(copy);
                                  }}
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white font-mono mt-0.5"
                                />
                              </div>
                              <div>
                                <span className="text-slate-400 text-[10px] font-semibold">Max Radius (px)</span>
                                <input
                                  type="number"
                                  value={layer.params.radius ?? 200}
                                  onChange={(e) => {
                                    const copy = [...physicsLayers];
                                    copy[idx].params.radius = Math.max(20, parseInt(e.target.value, 10) || 50);
                                    setPhysicsLayers(copy);
                                  }}
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white font-mono mt-0.5"
                                />
                              </div>
                              <div>
                                <span className="text-slate-400 text-[10px] font-semibold">Amplitude ({layer.params.amplitude ?? 40}px)</span>
                                <input
                                  type="range"
                                  min="5"
                                  max="100"
                                  value={layer.params.amplitude ?? 40}
                                  onChange={(e) => {
                                    const copy = [...physicsLayers];
                                    copy[idx].params.amplitude = parseInt(e.target.value, 10);
                                    setPhysicsLayers(copy);
                                  }}
                                  className="w-full accent-cyan-400 mt-1"
                                />
                              </div>
                              <div>
                                <span className="text-slate-400 text-[10px] font-semibold">Wave Width ({layer.params.width ?? 50}px)</span>
                                <input
                                  type="range"
                                  min="10"
                                  max="120"
                                  value={layer.params.width ?? 50}
                                  onChange={(e) => {
                                    const copy = [...physicsLayers];
                                    copy[idx].params.width = parseInt(e.target.value, 10);
                                    setPhysicsLayers(copy);
                                  }}
                                  className="w-full accent-cyan-400 mt-1"
                                />
                              </div>
                              <div>
                                <span className="text-slate-400 text-[10px] font-semibold">Speed ({layer.params.speed ?? 1.0}x)</span>
                                <input
                                  type="range"
                                  min="0.2"
                                  max="3.0"
                                  step="0.1"
                                  value={layer.params.speed ?? 1.0}
                                  onChange={(e) => {
                                    const copy = [...physicsLayers];
                                    copy[idx].params.speed = parseFloat(e.target.value);
                                    setPhysicsLayers(copy);
                                  }}
                                  className="w-full accent-cyan-400 mt-1"
                                />
                              </div>
                            </>
                          )}

                          {/* Wave Line Parameters */}
                          {layer.type === "wave_line" && (
                            <>
                              <div>
                                <span className="text-slate-400 text-[10px] font-semibold">Horizon Y</span>
                                <input
                                  type="number"
                                  value={layer.params.y ?? Math.round(canvasHeight * 0.65)}
                                  onChange={(e) => {
                                    const copy = [...physicsLayers];
                                    copy[idx].params.y = parseInt(e.target.value, 10) || 0;
                                    setPhysicsLayers(copy);
                                  }}
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white font-mono mt-0.5"
                                />
                              </div>
                              <div>
                                <span className="text-slate-400 text-[10px] font-semibold">Amplitude ({layer.params.amplitude ?? 30}px)</span>
                                <input
                                  type="range"
                                  min="5"
                                  max="100"
                                  value={layer.params.amplitude ?? 30}
                                  onChange={(e) => {
                                    const copy = [...physicsLayers];
                                    copy[idx].params.amplitude = parseInt(e.target.value, 10);
                                    setPhysicsLayers(copy);
                                  }}
                                  className="w-full accent-cyan-400 mt-1"
                                />
                              </div>
                              <div>
                                <span className="text-slate-400 text-[10px] font-semibold">Frequency ({layer.params.frequency ?? 0.015})</span>
                                <input
                                  type="range"
                                  min="0.005"
                                  max="0.04"
                                  step="0.001"
                                  value={layer.params.frequency ?? 0.015}
                                  onChange={(e) => {
                                    const copy = [...physicsLayers];
                                    copy[idx].params.frequency = parseFloat(e.target.value);
                                    setPhysicsLayers(copy);
                                  }}
                                  className="w-full accent-cyan-400 mt-1"
                                />
                              </div>
                              <div>
                                <span className="text-slate-400 text-[10px] font-semibold">Thickness ({layer.params.thickness ?? 3}px)</span>
                                <input
                                  type="number"
                                  min="1"
                                  max="15"
                                  value={layer.params.thickness ?? 3}
                                  onChange={(e) => {
                                    const copy = [...physicsLayers];
                                    copy[idx].params.thickness = parseInt(e.target.value, 10) || 3;
                                    setPhysicsLayers(copy);
                                  }}
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white font-mono mt-0.5"
                                />
                              </div>
                              <div className="col-span-2">
                                <span className="text-slate-400 text-[10px] font-semibold">Line Glow Color</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <input
                                    type="color"
                                    value={layer.params.color ?? "#00FFFF"}
                                    onChange={(e) => {
                                      const copy = [...physicsLayers];
                                      copy[idx].params.color = e.target.value;
                                      setPhysicsLayers(copy);
                                    }}
                                    className="w-7 h-7 rounded border border-slate-700 cursor-pointer bg-transparent"
                                  />
                                  <input
                                    type="text"
                                    value={layer.params.color ?? "#00FFFF"}
                                    onChange={(e) => {
                                      const copy = [...physicsLayers];
                                      copy[idx].params.color = e.target.value;
                                      setPhysicsLayers(copy);
                                    }}
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-white font-mono"
                                  />
                                </div>
                              </div>
                            </>
                          )}

                          {/* Vortex Parameters */}
                          {layer.type === "vortex" && (
                            <>
                              <div>
                                <span className="text-slate-400 text-[10px] font-semibold">Center X</span>
                                <input
                                  type="number"
                                  value={layer.params.cx ?? Math.round(canvasWidth * 0.5)}
                                  onChange={(e) => {
                                    const copy = [...physicsLayers];
                                    copy[idx].params.cx = parseInt(e.target.value, 10) || 0;
                                    setPhysicsLayers(copy);
                                  }}
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white font-mono mt-0.5"
                                />
                              </div>
                              <div>
                                <span className="text-slate-400 text-[10px] font-semibold">Center Y</span>
                                <input
                                  type="number"
                                  value={layer.params.cy ?? Math.round(canvasHeight * 0.5)}
                                  onChange={(e) => {
                                    const copy = [...physicsLayers];
                                    copy[idx].params.cy = parseInt(e.target.value, 10) || 0;
                                    setPhysicsLayers(copy);
                                  }}
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white font-mono mt-0.5"
                                />
                              </div>
                              <div>
                                <span className="text-slate-400 text-[10px] font-semibold">Vortex Radius</span>
                                <input
                                  type="number"
                                  value={layer.params.radius ?? 220}
                                  onChange={(e) => {
                                    const copy = [...physicsLayers];
                                    copy[idx].params.radius = Math.max(30, parseInt(e.target.value, 10) || 100);
                                    setPhysicsLayers(copy);
                                  }}
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white font-mono mt-0.5"
                                />
                              </div>
                              <div className="col-span-3">
                                <span className="text-slate-400 text-[10px] font-semibold">Twist Angle ({layer.params.angle ?? 180}°)</span>
                                <input
                                  type="range"
                                  min="-720"
                                  max="720"
                                  value={layer.params.angle ?? 180}
                                  onChange={(e) => {
                                    const copy = [...physicsLayers];
                                    copy[idx].params.angle = parseInt(e.target.value, 10);
                                    setPhysicsLayers(copy);
                                  }}
                                  className="w-full accent-cyan-400 mt-1"
                                />
                              </div>
                            </>
                          )}

                          {/* Page Curl Parameters */}
                          {layer.type === "page_curl" && (
                            <>
                              <div>
                                <span className="text-slate-400 text-[10px] font-semibold">Roll Width ({Math.round((layer.params.roll_width_pct ?? 0.25) * 100)}%)</span>
                                <input
                                  type="range"
                                  min="0.05"
                                  max="0.5"
                                  step="0.01"
                                  value={layer.params.roll_width_pct ?? 0.25}
                                  onChange={(e) => {
                                    const copy = [...physicsLayers];
                                    copy[idx].params.roll_width_pct = parseFloat(e.target.value);
                                    setPhysicsLayers(copy);
                                  }}
                                  className="w-full accent-cyan-400 mt-1"
                                />
                              </div>
                              <div>
                                <span className="text-slate-400 text-[10px] font-semibold">Curl Angle ({layer.params.curl_angle ?? 45}°)</span>
                                <input
                                  type="range"
                                  min="0"
                                  max="90"
                                  value={layer.params.curl_angle ?? 45}
                                  onChange={(e) => {
                                    const copy = [...physicsLayers];
                                    copy[idx].params.curl_angle = parseInt(e.target.value, 10);
                                    setPhysicsLayers(copy);
                                  }}
                                  className="w-full accent-cyan-400 mt-1"
                                />
                              </div>
                              <div>
                                <span className="text-slate-400 text-[10px] font-semibold">Fold Progress</span>
                                <input
                                  type="range"
                                  min="0.1"
                                  max="1.0"
                                  step="0.05"
                                  value={layer.params.progress ?? 0.5}
                                  onChange={(e) => {
                                    const copy = [...physicsLayers];
                                    copy[idx].params.progress = parseFloat(e.target.value);
                                    setPhysicsLayers(copy);
                                  }}
                                  className="w-full accent-cyan-400 mt-1"
                                />
                              </div>
                            </>
                          )}

                          {/* CRT Scanlines Parameters */}
                          {layer.type === "crt_scanlines" && (
                            <>
                              <div>
                                <span className="text-slate-400 text-[10px] font-semibold">Phosphor Opacity ({Math.round((layer.params.opacity ?? 0.3) * 100)}%)</span>
                                <input
                                  type="range"
                                  min="0.05"
                                  max="0.8"
                                  step="0.05"
                                  value={layer.params.opacity ?? 0.3}
                                  onChange={(e) => {
                                    const copy = [...physicsLayers];
                                    copy[idx].params.opacity = parseFloat(e.target.value);
                                    setPhysicsLayers(copy);
                                  }}
                                  className="w-full accent-cyan-400 mt-1"
                                />
                              </div>
                              <div>
                                <span className="text-slate-400 text-[10px] font-semibold">RGB Aberration ({layer.params.aberration_px ?? 4}px)</span>
                                <input
                                  type="range"
                                  min="0"
                                  max="16"
                                  value={layer.params.aberration_px ?? 4}
                                  onChange={(e) => {
                                    const copy = [...physicsLayers];
                                    copy[idx].params.aberration_px = parseInt(e.target.value, 10);
                                    setPhysicsLayers(copy);
                                  }}
                                  className="w-full accent-cyan-400 mt-1"
                                />
                              </div>
                            </>
                          )}

                          {/* Datamosh Parameters */}
                          {layer.type === "datamosh" && (
                            <>
                              <div>
                                <span className="text-slate-400 text-[10px] font-semibold">Macroblock Size</span>
                                <select
                                  value={layer.params.macroblock_size ?? 16}
                                  onChange={(e) => {
                                    const copy = [...physicsLayers];
                                    copy[idx].params.macroblock_size = parseInt(e.target.value, 10);
                                    setPhysicsLayers(copy);
                                  }}
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-white mt-0.5"
                                >
                                  <option value={8}>8×8 px</option>
                                  <option value={16}>16×16 px</option>
                                  <option value={24}>24×24 px</option>
                                  <option value={32}>32×32 px</option>
                                  <option value={64}>64×64 px</option>
                                </select>
                              </div>
                              <div>
                                <span className="text-slate-400 text-[10px] font-semibold">Glitch Probability ({Math.round((layer.params.probability ?? 0.3) * 100)}%)</span>
                                <input
                                  type="range"
                                  min="0.05"
                                  max="0.8"
                                  step="0.05"
                                  value={layer.params.probability ?? 0.3}
                                  onChange={(e) => {
                                    const copy = [...physicsLayers];
                                    copy[idx].params.probability = parseFloat(e.target.value);
                                    setPhysicsLayers(copy);
                                  }}
                                  className="w-full accent-cyan-400 mt-1"
                                />
                              </div>
                            </>
                          )}

                          {/* Liquid Flow Parameters */}
                          {layer.type === "liquid_flow" && (
                            <div className="col-span-3">
                              <span className="text-slate-400 text-[10px] font-semibold">Viscosity / Fluid Tension ({layer.params.viscosity ?? 18})</span>
                              <input
                                type="range"
                                min="5"
                                max="50"
                                value={layer.params.viscosity ?? 18}
                                onChange={(e) => {
                                  const copy = [...physicsLayers];
                                  copy[idx].params.viscosity = parseInt(e.target.value, 10);
                                  setPhysicsLayers(copy);
                                }}
                                className="w-full accent-cyan-400 mt-1"
                              />
                            </div>
                          )}

                          {/* Volumetric Glow Parameters */}
                          {layer.type === "volumetric_glow" && (
                            <>
                              <div>
                                <span className="text-slate-400 text-[10px] font-semibold">Center X</span>
                                <input
                                  type="number"
                                  value={layer.params.cx ?? Math.round(canvasWidth * 0.5)}
                                  onChange={(e) => {
                                    const copy = [...physicsLayers];
                                    copy[idx].params.cx = parseInt(e.target.value, 10) || 0;
                                    setPhysicsLayers(copy);
                                  }}
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white font-mono mt-0.5"
                                />
                              </div>
                              <div>
                                <span className="text-slate-400 text-[10px] font-semibold">Center Y</span>
                                <input
                                  type="number"
                                  value={layer.params.cy ?? Math.round(canvasHeight * 0.4)}
                                  onChange={(e) => {
                                    const copy = [...physicsLayers];
                                    copy[idx].params.cy = parseInt(e.target.value, 10) || 0;
                                    setPhysicsLayers(copy);
                                  }}
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white font-mono mt-0.5"
                                />
                              </div>
                              <div>
                                <span className="text-slate-400 text-[10px] font-semibold">Aura Intensity ({layer.params.intensity ?? 0.8})</span>
                                <input
                                  type="range"
                                  min="0.2"
                                  max="2.0"
                                  step="0.1"
                                  value={layer.params.intensity ?? 0.8}
                                  onChange={(e) => {
                                    const copy = [...physicsLayers];
                                    copy[idx].params.intensity = parseFloat(e.target.value);
                                    setPhysicsLayers(copy);
                                  }}
                                  className="w-full accent-cyan-400 mt-1"
                                />
                              </div>
                              <div>
                                <span className="text-slate-400 text-[10px] font-semibold">Pulse Speed ({layer.params.zoom_speed ?? 1.8}x)</span>
                                <input
                                  type="range"
                                  min="0.5"
                                  max="4.0"
                                  step="0.2"
                                  value={layer.params.zoom_speed ?? 1.8}
                                  onChange={(e) => {
                                    const copy = [...physicsLayers];
                                    copy[idx].params.zoom_speed = parseFloat(e.target.value);
                                    setPhysicsLayers(copy);
                                  }}
                                  className="w-full accent-cyan-400 mt-1"
                                />
                              </div>
                              <div className="col-span-2">
                                <span className="text-slate-400 text-[10px] font-semibold">Glow Tint</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <input
                                    type="color"
                                    value={layer.params.glow_color ?? "#00FFCC"}
                                    onChange={(e) => {
                                      const copy = [...physicsLayers];
                                      copy[idx].params.glow_color = e.target.value;
                                      setPhysicsLayers(copy);
                                    }}
                                    className="w-7 h-7 rounded border border-slate-700 cursor-pointer bg-transparent"
                                  />
                                  <input
                                    type="text"
                                    value={layer.params.glow_color ?? "#00FFCC"}
                                    onChange={(e) => {
                                      const copy = [...physicsLayers];
                                      copy[idx].params.glow_color = e.target.value;
                                      setPhysicsLayers(copy);
                                    }}
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-white font-mono"
                                  />
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Audio Track Mixing & Upload for Intro/Outro (Identical to Master Pipeline Audio Suite) */}
            <div className="flex flex-col gap-3 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-amber-400" />
                  Background Audio Track (Intro/Outro BGM)
                </label>
                {studioAudioPath && (
                  <button
                    onClick={() => setStudioAudioPath("")}
                    className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
                  >
                    Clear Audio
                  </button>
                )}
              </div>

              <div className="text-xs">
                <div>
                  <span className="text-slate-400 text-[11px]">Audio / BGM Track (AudioCraft / Uploaded)</span>
                  <select
                    value={studioAudioPath}
                    onChange={(e) => setStudioAudioPath(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white mt-1"
                  >
                    <option value="">-- None (Silent Audio Stream) --</option>
                    {mediaFiles.audio.map((a, i) => (
                      <option key={i} value={a.path}>
                        [{a.source}] {a.name}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2 mt-2">
                    <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-950/60 hover:bg-amber-900/60 border border-amber-500/20 text-[11px] font-semibold text-amber-200 cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" /> Upload Audio (.mp3, .wav)
                      <input type="file" accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a,.aac" className="hidden" onChange={(e) => handleFileUpload(e, "studio_audio")} />
                    </label>
                    {studioAudioPath && (
                      <span className="text-[9px] text-amber-400 font-mono truncate">
                        Audio loaded ({studioAudioPath.split("/").pop()?.split("\\").pop()})
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                    <div>
                      <span className="text-slate-400 text-[10px]">Track Start Offset (s)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={studioAudioStartOffset}
                        onChange={(e) => setStudioAudioStartOffset(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Audio Start Cut (s)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={studioAudioTrimStart}
                        onChange={(e) => setStudioAudioTrimStart(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Audio Finish Cut (s, 0=End)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={studioAudioTrimEnd}
                        onChange={(e) => setStudioAudioTrimEnd(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Volume ({studioAudioVolume.toFixed(1)}x)</span>
                      <input
                        type="number"
                        min="0"
                        max="2.0"
                        step="0.1"
                        value={studioAudioVolume}
                        onChange={(e) => setStudioAudioVolume(parseFloat(e.target.value) || 1.0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Fade In (s)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={studioAudioFadeIn}
                        onChange={(e) => setStudioAudioFadeIn(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Fade Out (s)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={studioAudioFadeOut}
                        onChange={(e) => setStudioAudioFadeOut(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
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
              {gameplayPath && (
                <div className="text-[10px] text-purple-400 font-mono truncate">
                  Loaded: {gameplayPath.split("/").pop()?.split("\\").pop()}
                </div>
              )}

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
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5" /> Upload Intro
                    <input type="file" accept=".mp4,.mkv,.webm,.mov,.avi,.m4v,.wmv,.flv,.mpeg,.mpg,.ts,.mts,.m2ts,.3gp,video/*" className="hidden" onChange={(e) => handleFileUpload(e, "intro")} />
                  </label>
                  {introPath && (
                    <span className="text-[10px] text-cyan-400 font-mono truncate">
                      {introPath.split("/").pop()?.split("\\").pop()}
                    </span>
                  )}
                </div>
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
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5" /> Upload Outro
                    <input type="file" accept=".mp4,.mkv,.webm,.mov,.avi,.m4v,.wmv,.flv,.mpeg,.mpg,.ts,.mts,.m2ts,.3gp,video/*" className="hidden" onChange={(e) => handleFileUpload(e, "outro")} />
                  </label>
                  {outroPath && (
                    <span className="text-[10px] text-pink-400 font-mono truncate">
                      {outroPath.split("/").pop()?.split("\\").pop()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Step 3: Chromakey Overlay & Watermark */}
            <div className="flex flex-col gap-3 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
              <label className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                Step 3: Chromakey Overlay & Watermark
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px]">Green Screen Overlay</span>
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
                  <div className="flex items-center gap-2 mt-2">
                    <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/20 text-[11px] font-semibold text-emerald-200 cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" /> Upload Overlay Video
                      <input type="file" accept="video/*,.mp4,.mkv,.webm,.mov,.avi,.m4v,.wmv,.flv,.mpeg,.mpg,.ts,.mts,.m2ts,.3gp" className="hidden" onChange={(e) => handleFileUpload(e, "chroma")} />
                    </label>
                    {chromaOverlay && <span className="text-[9px] text-emerald-400 font-mono truncate">Overlay selected</span>}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div>
                      <span className="text-slate-400 text-[10px]">Start (s)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={overlayStart}
                        onChange={(e) => setOverlayStart(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Finish (0=Full)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={overlayFinish}
                        onChange={(e) => setOverlayFinish(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Tolerance</span>
                      <input
                        type="number"
                        min="0.01"
                        max="1.0"
                        step="0.05"
                        value={chromaSimilarity}
                        onChange={(e) => setChromaSimilarity(parseFloat(e.target.value) || 0.15)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-white"
                      />
                    </div>
                  </div>
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
                  <div className="flex items-center gap-2 mt-2">
                    <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" /> Upload Watermark
                      <input type="file" accept=".png,.jpg,.jpeg,.webp,image/*" className="hidden" onChange={(e) => handleFileUpload(e, "watermark")} />
                    </label>
                    {watermarkPath && <span className="text-[9px] text-cyan-400 font-mono truncate">Watermark loaded</span>}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div>
                      <span className="text-slate-400 text-[10px]">Pos</span>
                      <select
                        value={watermarkPos}
                        onChange={(e) => setWatermarkPos(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-1 text-xs text-white"
                      >
                        <option value="TR">Top-Right</option>
                        <option value="TL">Top-Left</option>
                        <option value="BR">Bottom-Right</option>
                        <option value="BL">Bottom-Left</option>
                      </select>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Opacity</span>
                      <input
                        type="number"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={watermarkOpacity}
                        onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value) || 0.85)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Start (s)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={watermarkStart}
                        onChange={(e) => setWatermarkStart(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4: Audio Track Mixing & Subtitle Staging */}
            <div className="flex flex-col gap-3 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
              <label className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Step 4: Background Audio Track & Subtitles
              </label>

              <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-700/80 bg-slate-900/70 px-3 py-2.5">
                <div className="min-w-0">
                  <label htmlFor="stripAudioToggle" className="text-[11px] font-semibold text-slate-200 cursor-pointer">
                    Mute Source Video Audio
                  </label>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Wipes and drops embedded sound layers from inputs before processing.
                  </p>
                </div>
                <label className="relative inline-flex shrink-0 items-center cursor-pointer" aria-label="Mute Source Video Audio">
                  <input
                    id="stripAudioToggle"
                    type="checkbox"
                    checked={stripAudio}
                    onChange={(e) => setStripAudio(e.target.checked)}
                    className="sr-only peer"
                  />
                  <span className="w-10 h-5 rounded-full bg-slate-700 peer-checked:bg-amber-500 transition-colors" />
                  <span className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                </label>
              </div>
			  
              {/* =============================================================================== */}
              {/* CPU WATERMARK ERASER MATRIX CONTROL CHASSIS */}
              {/* =============================================================================== */}
              <div className="flex flex-col gap-3 p-3.5 rounded-lg border border-purple-500/20 bg-slate-900/40 mt-1">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <label htmlFor="removeWatermarkToggle" className="text-[11px] font-semibold text-slate-200 cursor-pointer">
                      Static Watermark Eraser Matrix
                    </label>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      OpenCV Telea inpainting pass. Runs entirely on CPU to prevent VRAM allocations.
                    </p>
                  </div>
                  <label className="relative inline-flex shrink-0 items-center cursor-pointer" aria-label="Static Watermark Eraser Matrix">
                    <input
                      id="removeWatermarkToggle"
                      type="checkbox"
                      checked={removeWatermark}
                      onChange={(e) => setRemoveWatermark(e.target.checked)}
                      className="sr-only peer"
                    />
                    <span className="w-10 h-5 rounded-full bg-slate-700 peer-checked:bg-purple-500 transition-colors" />
                    <span className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                  </label>
                </div>

                {removeWatermark && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80 animate-in fade-in duration-150">
                    {/* Bounding Area Coordinate Sliders */}
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-slate-400 font-bold">X OFFSET BOUNDARY</span>
                          <span className="text-purple-400 font-bold">{wmX}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={wmX}
                          onChange={(e) => setWmX(parseInt(e.target.value, 10))}
                          className="w-full accent-purple-500 cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-slate-400 font-bold">Y OFFSET BOUNDARY</span>
                          <span className="text-purple-400 font-bold">{wmY}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={wmY}
                          onChange={(e) => setWmY(parseInt(e.target.value, 10))}
                          className="w-full accent-purple-500 cursor-pointer"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="text-slate-400 font-bold">BOX WIDTH</span>
                            <span className="text-cyan-400 font-bold">{wmW}%</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="100"
                            step="1"
                            value={wmW}
                            onChange={(e) => setWmW(parseInt(e.target.value, 10))}
                            className="w-full accent-cyan-500 cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="text-slate-400 font-bold">BOX HEIGHT</span>
                            <span className="text-pink-400 font-bold">{wmH}%</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="100"
                            step="1"
                            value={wmH}
                            onChange={(e) => setWmH(parseInt(e.target.value, 10))}
                            className="w-full accent-pink-500 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Mask Target Grid Area Layout Simulator with Live Video Preview */}
                    <div className="bg-slate-950 rounded-xl border border-slate-800/80 p-2.5 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 uppercase tracking-wider">
                        <span>Watermark Region Mask View</span>
                        {gameplayPath && (
                          <span className="text-purple-400 font-semibold truncate max-w-[140px]">
                            {gameplayPath.split("/").pop()?.split("\\").pop()}
                          </span>
                        )}
                      </div>

                      {/* Quick Location Presets */}
                      <div className="flex items-center gap-1.5 mt-1.5 overflow-x-auto pb-1 text-[8px] font-mono">
                        <span className="text-slate-500 uppercase">Presets:</span>
                        <button
                          type="button"
                          onClick={() => { setWmX(85); setWmY(5); setWmW(12); setWmH(8); }}
                          className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-purple-300 border border-slate-800"
                        >
                          Top-Right
                        </button>
                        <button
                          type="button"
                          onClick={() => { setWmX(3); setWmY(5); setWmW(12); setWmH(8); }}
                          className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-purple-300 border border-slate-800"
                        >
                          Top-Left
                        </button>
                        <button
                          type="button"
                          onClick={() => { setWmX(85); setWmY(88); setWmW(12); setWmH(8); }}
                          className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-purple-300 border border-slate-800"
                        >
                          Bottom-Right
                        </button>
                        <button
                          type="button"
                          onClick={() => { setWmX(3); setWmY(88); setWmW(12); setWmH(8); }}
                          className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-purple-300 border border-slate-800"
                        >
                          Bottom-Left
                        </button>
                      </div>

                      <div className="relative w-full aspect-video bg-black rounded-lg border border-slate-800 overflow-hidden mt-1 select-none">
                        {gameplayPath ? (
                          <video
                            ref={wmVideoRef}
                            src={gameplayPath.startsWith("/media/") ? gameplayPath : `/api/streaminject/video-preview?path=${encodeURIComponent(gameplayPath)}`}
                            className="absolute inset-0 w-full h-full object-contain bg-black"
                            playsInline
                            muted
                            onTimeUpdate={(e) => {
                              const v = e.currentTarget;
                              if (v.duration && !isNaN(v.duration)) {
                                setWmVideoProgress((v.currentTime / v.duration) * 100);
                              }
                            }}
                            onEnded={() => setWmIsPlaying(false)}
                          />
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-slate-500 text-[10px] p-2 text-center">
                            <span>No gameplay stream selected</span>
                            <span className="text-[9px] text-slate-600">Select or upload a video in Step 1 to preview watermark</span>
                          </div>
                        )}

                        {/* Inpainting Mask Bounding Box */}
                        <div 
                          className="absolute border-2 border-dashed border-purple-400 bg-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.5)] transition-all pointer-events-none"
                          style={{
                            left: `${Math.min(wmX, 99)}%`,
                            top: `${Math.min(wmY, 99)}%`,
                            width: `${Math.min(wmW, 100 - Math.min(wmX, 99))}%`,
                            height: `${Math.min(wmH, 100 - Math.min(wmY, 99))}%`
                          }}
                        >
                          <span className="absolute -top-4 left-0 text-[8px] font-mono text-purple-300 bg-slate-950 px-1 border border-purple-500/60 rounded shadow whitespace-nowrap">
                            MASK ({wmX}%, {wmY}%) [{wmW}×{wmH}%]
                          </span>
                        </div>
                      </div>

                      {/* Video Scrubber & Playback Controls for Locating Watermark */}
                      {gameplayPath && (
                        <div className="mt-2 flex items-center gap-2 pt-1.5 border-t border-slate-800/80">
                          <button
                            type="button"
                            onClick={() => {
                              if (wmVideoRef.current) {
                                if (wmIsPlaying) {
                                  wmVideoRef.current.pause();
                                  setWmIsPlaying(false);
                                } else {
                                  wmVideoRef.current.play();
                                  setWmIsPlaying(true);
                                }
                              }
                            }}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-purple-400 transition-colors shrink-0"
                            title={wmIsPlaying ? "Pause Video" : "Play Video"}
                          >
                            {wmIsPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                          </button>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="0.1"
                            value={wmVideoProgress}
                            onChange={(e) => {
                              const pct = parseFloat(e.target.value);
                              setWmVideoProgress(pct);
                              if (wmVideoRef.current && wmVideoRef.current.duration) {
                                wmVideoRef.current.currentTime = (pct / 100) * wmVideoRef.current.duration;
                              }
                            }}
                            className="flex-1 accent-purple-500 cursor-pointer h-1.5"
                            title="Scrub video to locate watermark across frames"
                          />
                          <span className="text-[8px] font-mono text-slate-400 shrink-0">
                            {wmVideoRef.current?.currentTime ? `${wmVideoRef.current.currentTime.toFixed(1)}s` : "0.0s"}
                          </span>
                        </div>
                      )}

                      <div className="text-[8px] font-mono text-slate-500 mt-1.5">
                        Scrub video to a clear frame with the watermark, then adjust offset & dimensions.
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px]">Audio / BGM Track (AudioCraft / Uploaded)</span>
                  <select
                    value={audioTrackPath}
                    onChange={(e) => setAudioTrackPath(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white mt-1"
                  >
                    <option value="">-- None (Original Audio Only) --</option>
                    {mediaFiles.audio.map((a, i) => (
                      <option key={i} value={a.path}>
                        [{a.source}] {a.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2 mt-2">
                    <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-950/60 hover:bg-amber-900/60 border border-amber-500/20 text-[11px] font-semibold text-amber-200 cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" /> Upload Audio (.mp3, .wav)
                      <input type="file" accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a,.aac" className="hidden" onChange={(e) => handleFileUpload(e, "audio")} />
                    </label>
                    {audioTrackPath && <span className="text-[9px] text-amber-400 font-mono truncate">Audio loaded</span>}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                    <div>
                      <span className="text-slate-400 text-[10px]">Track Start Offset (s)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={audioStartOffset}
                        onChange={(e) => setAudioStartOffset(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Audio Start Cut (s)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={audioTrimStart}
                        onChange={(e) => setAudioTrimStart(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Audio Finish Cut (s, 0=End)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={audioTrimEnd}
                        onChange={(e) => setAudioTrimEnd(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Volume ({audioVolume.toFixed(1)}x)</span>
                      <input
                        type="number"
                        min="0"
                        max="2.0"
                        step="0.1"
                        value={audioVolume}
                        onChange={(e) => setAudioVolume(parseFloat(e.target.value) || 1.0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Fade In (s)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={audioFadeIn}
                        onChange={(e) => setAudioFadeIn(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Fade Out (s)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={audioFadeOut}
                        onChange={(e) => setAudioFadeOut(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px]">Subtitle Track (.srt, .ass, .vtt)</span>
                  <select
                    value={subtitlePath}
                    onChange={(e) => setSubtitlePath(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white mt-1"
                  >
                    <option value="">-- None (No Subtitles) --</option>
                    {mediaFiles.subtitles.map((sub, i) => (
                      <option key={i} value={sub.path}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2 mt-2">
                    <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" /> Upload Subtitles
                      <input type="file" accept=".srt,.ass,.vtt" className="hidden" onChange={(e) => handleFileUpload(e, "subtitle")} />
                    </label>
                    {subtitlePath && <span className="text-[9px] text-green-400 font-mono truncate">Subtitles loaded</span>}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">
                    Subtitles are burned directly onto video stream using libass and FFmpeg subtitle renderer.
                  </p>
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

          {uploadError && (
            <div className="px-4 py-3 rounded-xl border border-rose-500/30 bg-rose-950/30 text-[11px] text-rose-300 font-mono">
              Video upload: {uploadError}
            </div>
          )}

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
