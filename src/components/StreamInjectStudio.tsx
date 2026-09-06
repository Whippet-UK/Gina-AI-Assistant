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
  Crosshair
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

  const [vfxGlitch, setVfxGlitch] = useState(true);
  const [vfxShake, setVfxShake] = useState(true);
  const [vfxBloom, setVfxBloom] = useState(true);
  const [vfxChroma, setVfxChroma] = useState(true);

  // Interactive Selection & Drag-and-Drop Movement State
  const [selectedTarget, setSelectedTarget] = useState<{ type: "text" | "box" | "circle"; index: number } | null>({ type: "text", index: 0 });
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

  // Presets and Media
  const [presets, setPresets] = useState<Preset[]>([]);
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
    setTextLayers(preset.config.text_layers || []);
    setVideoBoxes(preset.config.video_boxes || []);
    setProfileCircles(preset.config.profile_circles || []);
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
    }
  };

  // Move layer order in array
  const moveLayerOrder = (type: "text" | "box" | "circle", index: number, direction: -1 | 1) => {
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

  const hitTestElement = (cx: number, cy: number): { type: "text" | "box" | "circle"; index: number } | null => {
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
  }, [isPlaying, currentTime, duration, canvasWidth, canvasHeight, bgType, bgMaxRed, textLayers, videoBoxes, profileCircles, showGuides, vfxGlitch, vfxShake, vfxBloom, vfxChroma, selectedTarget]);

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
      audioFadeOut: audioFadeOut
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
                  </select>
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
                          </select>
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
                        <input
                          type="color"
                          value={box.border_color || "#00FFFF"}
                          onChange={(e) => {
                            const copy = [...videoBoxes];
                            copy[idx].border_color = e.target.value;
                            setVideoBoxes(copy);
                          }}
                          className="w-6 h-6 bg-transparent border-0 rounded cursor-pointer"
                          title="Border Glow Color"
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
                          <input
                            type="color"
                            value={circ.glow_color || "#00FFFF"}
                            onChange={(e) => {
                              const copy = [...profileCircles];
                              copy[idx].glow_color = e.target.value;
                              setProfileCircles(copy);
                            }}
                            className="w-5 h-5 bg-transparent border-0 rounded cursor-pointer"
                            title="Glow Color"
                          />
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
                    </div>
                  );
                })}
              </div>
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
