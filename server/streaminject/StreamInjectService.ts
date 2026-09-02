import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import { spawn } from "child_process";
import { JobManager } from "../jobs/JobManager.js";

export interface StreamInjectRenderOptions {
  mainGameplayPath: string;
  introPath?: string;
  outroPath?: string;
  aspectMode?: "original" | "short";
  splitStartSec?: number;
  splitEndSec?: number;
  greenScreenOverlay?: string;
  overlayStartTime?: number;
  overlayFinishTime?: number;
  chromaColor?: string;
  chromaSimilarity?: number;
  chromaBlend?: number;
  watermarkPath?: string;
  watermarkPos?: "TL" | "TR" | "BL" | "BR";
  watermarkStartTime?: number;
  watermarkFinishTime?: number;
  watermarkOpacity?: number;
  audioTrackPath?: string;
  audioStartTime?: number;
  audioTrimStart?: number;
  audioTrimEnd?: number;
  audioVolume?: number;
  audioFadeIn?: number;
  audioFadeOut?: number;
  subtitlePath?: string;
  outputFilename?: string;
}

export interface StreamInjectStudioOptions {
  width?: number;
  height?: number;
  duration?: number;
  fps?: number;
  background?: {
    type?: "radial" | "linear" | "image";
    max_red?: number;
    image_path?: string;
  };
  text_layers?: Array<{
    text: string;
    size?: number;
    color?: string;
    animation?: "bounce" | "flicker" | "static";
    x?: number;
    y?: number;
  }>;
  video_boxes?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    label?: string;
    border_color?: string;
  }>;
  profile_circles?: Array<{
    x: number;
    y: number;
    radius: number;
    pulse?: boolean;
    glow_color?: string;
  }>;
  vfx?: {
    enable_glitch?: boolean;
    enable_shake?: boolean;
    enable_bloom?: boolean;
    enable_chroma?: boolean;
  };
  audio?: {
    path?: string;
    start_offset?: number;
    trim_start?: number;
    trim_end?: number;
    volume?: number;
    fade_in?: number;
    fade_out?: number;
  };
  outputFilename?: string;
}

export class StreamInjectService {
  private runtimeDir: string;
  private pythonBinary: string;

  constructor(baseDir: string = process.cwd()) {
    this.runtimeDir = path.join(baseDir, ".gina_runtime", "streaminject");
    const inputDir = path.join(this.runtimeDir, "input");
    if (!fsSync.existsSync(inputDir)) {
      fsSync.mkdirSync(inputDir, { recursive: true });
    }
    this.pythonBinary = this.detectPythonBinary();
  }

  public getRuntimeDir(): string {
    return this.runtimeDir;
  }

  private detectPythonBinary(): string {
    const candidates = [
      path.join(process.cwd(), "g_env", "Scripts", "python.exe"),
      "C:\\Gina_AI\\g_env\\Scripts\\python.exe",
      "python3",
      "python"
    ];
    for (const c of candidates) {
      if (fsSync.existsSync(c)) return c;
    }
    return process.platform === "win32" ? "python" : "python3";
  }

  public async scanAvailableMedia(): Promise<{
    videos: Array<{ name: string; path: string; source: string; sizeBytes?: number }>;
    images: Array<{ name: string; path: string; source: string }>;
    audio: Array<{ name: string; path: string; source: string; sizeBytes?: number }>;
    subtitles: Array<{ name: string; path: string; source: string }>;
  }> {
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

    const videos: Array<{ name: string; path: string; source: string; sizeBytes?: number }> = [];
    const images: Array<{ name: string; path: string; source: string }> = [];
    const audio: Array<{ name: string; path: string; source: string; sizeBytes?: number }> = [];
    const subtitles: Array<{ name: string; path: string; source: string }> = [];

    const seenVideos = new Set<string>();
    const seenImages = new Set<string>();
    const seenAudio = new Set<string>();
    const seenSubtitles = new Set<string>();

    for (const item of searchDirs) {
      try {
        if (!fsSync.existsSync(item.dir)) continue;
        const files = await fs.readdir(item.dir);
        for (const file of files) {
          const fullPath = path.join(item.dir, file);
          const stat = await fs.stat(fullPath).catch(() => null);
          if (!stat || !stat.isFile()) continue;

          const ext = path.extname(file).toLowerCase();
          if ([".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v", ".wmv", ".flv", ".mpeg", ".mpg", ".ts", ".mts", ".m2ts", ".3gp", ".ogv"].includes(ext)) {
            if (!seenVideos.has(fullPath)) {
              seenVideos.add(fullPath);
              videos.push({ name: file, path: fullPath, source: item.source, sizeBytes: stat.size });
            }
          } else if ([".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".svg"].includes(ext)) {
            if (!seenImages.has(fullPath)) {
              seenImages.add(fullPath);
              images.push({ name: file, path: fullPath, source: item.source });
            }
          } else if ([".mp3", ".wav", ".ogg", ".flac", ".m4a", ".aac", ".wma", ".aiff", ".opus"].includes(ext)) {
            if (!seenAudio.has(fullPath)) {
              seenAudio.add(fullPath);
              audio.push({ name: file, path: fullPath, source: item.source, sizeBytes: stat.size });
            }
          } else if ([".srt", ".ass", ".vtt", ".sub"].includes(ext)) {
            if (!seenSubtitles.has(fullPath)) {
              seenSubtitles.add(fullPath);
              subtitles.push({ name: file, path: fullPath, source: item.source });
            }
          }
        }
      } catch {
        // Skip inaccessible dirs
      }
    }

    return { videos, images, audio, subtitles };
  }

  public getPresets() {
    return [
      {
        id: "cyberpunk_dual_box_outro",
        name: "Cyberpunk Crimson Dual-Box Outro (16:9)",
        description: "10-second kinetic loop with radial crimson glow (capped <= 55), dual 16:9 video boxes, subscribe pulse circle, and glitch/shake/bloom VFX matrix.",
        aspectRatio: "16:9",
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
  }

  public async renderStudioTemplate(
    jobId: string,
    options: StreamInjectStudioOptions,
    jobManager: JobManager
  ): Promise<{ success: boolean; outputFilename: string; outputPath: string; url: string }> {
    const timestamp = Date.now();
    const filename = options.outputFilename || `studio_render_${timestamp}.mp4`;
    const outputPath = path.join(this.runtimeDir, filename);
    const layoutConfigFile = path.join(this.runtimeDir, `layout_${jobId}.json`);

    const layoutData = {
      width: options.width || 1920,
      height: options.height || 1080,
      duration: options.duration || 10.0,
      fps: options.fps || 30.0,
      background: options.background || { type: "radial", max_red: 55 },
      text_layers: options.text_layers || [],
      video_boxes: options.video_boxes || [],
      profile_circles: options.profile_circles || [],
      vfx: options.vfx || { enable_glitch: true, enable_shake: true, enable_bloom: true, enable_chroma: true },
      audio: options.audio || undefined
    };

    await fs.writeFile(layoutConfigFile, JSON.stringify(layoutData, null, 2), "utf-8");

    const scriptPath = path.join(process.cwd(), "scripts", "stream_inject.py");
    const args = [
      scriptPath,
      "studio",
      "--mode", "custom",
      "--layout-json", layoutConfigFile,
      "--output", outputPath
    ];

    jobManager.update(jobId, {
      status: "RUNNING",
      progress: 5,
      step: "Initializing Python Studio Render Pipeline..."
    });

    return new Promise((resolve, reject) => {
      const child = spawn(this.pythonBinary, args, {
        cwd: process.cwd(),
        env: { ...process.env, PYTHONUNBUFFERED: "1" }
      });

      let fullStdout = "";
      let fullStderr = "";

      child.stdout.on("data", (chunk: Buffer) => {
        const text = chunk.toString();
        fullStdout += text;
        console.log(`[StreamInject Studio Stdout] ${text.trim()}`);

        const matchProgress = text.match(/\[STREAMINJECT_PROGRESS:\s*(\d+)%\]/);
        if (matchProgress) {
          const pct = parseInt(matchProgress[1], 10);
          jobManager.update(jobId, {
            progress: pct,
            step: text.trim().slice(0, 100)
          });
        }
      });

      child.stderr.on("data", (chunk: Buffer) => {
        const text = chunk.toString();
        fullStderr += text;
        console.warn(`[StreamInject Studio Stderr] ${text.trim()}`);
      });

      child.on("close", async (code) => {
        // Cleanup layout json
        await fs.unlink(layoutConfigFile).catch(() => {});

        if (code === 0 && fsSync.existsSync(outputPath)) {
          const url = `/media/streaminject/${filename}`;
          const stat = await fs.stat(outputPath).catch(() => null);
          const outputEntry = {
            kind: "video",
            filename,
            url,
            path: outputPath,
            sizeBytes: stat?.size || 0
          };

          jobManager.update(jobId, {
            status: "COMPLETED",
            progress: 100,
            step: "Template Render Complete",
            completedAt: new Date().toISOString(),
            outputs: [outputEntry]
          });

          resolve({
            success: true,
            outputFilename: filename,
            outputPath,
            url
          });
        } else {
          const errMsg = `Python StreamInject exited with code ${code}. Stderr: ${fullStderr.slice(-400)}`;
          jobManager.update(jobId, {
            status: "FAILED",
            error: errMsg,
            completedAt: new Date().toISOString()
          });
          reject(new Error(errMsg));
        }
      });

      child.on("error", (err) => {
        const errMsg = `Failed to spawn Python StreamInject: ${err.message}`;
        jobManager.update(jobId, {
          status: "FAILED",
          error: errMsg,
          completedAt: new Date().toISOString()
        });
        reject(err);
      });
    });
  }

  public async renderMasterPipeline(
    jobId: string,
    options: StreamInjectRenderOptions,
    jobManager: JobManager
  ): Promise<{ success: boolean; outputFilename: string; outputPath: string; url: string }> {
    const timestamp = Date.now();
    const filename = options.outputFilename || `master_render_${timestamp}.mp4`;
    const outputPath = path.join(this.runtimeDir, filename);

    const scriptPath = path.join(process.cwd(), "scripts", "stream_inject.py");
    const args = [
      scriptPath,
      "render",
      "--gameplay", options.mainGameplayPath,
      "--output", outputPath,
      "--aspect", options.aspectMode || "original"
    ];

    if (options.introPath && fsSync.existsSync(options.introPath)) {
      args.push("--intro", options.introPath);
    }
    if (options.outroPath && fsSync.existsSync(options.outroPath)) {
      args.push("--outro", options.outroPath);
    }
    if (options.splitStartSec !== undefined && options.splitStartSec > 0) {
      args.push("--split-start", String(options.splitStartSec));
    }
    if (options.splitEndSec !== undefined && options.splitEndSec > 0) {
      args.push("--split-end", String(options.splitEndSec));
    }
    if (options.greenScreenOverlay && fsSync.existsSync(options.greenScreenOverlay)) {
      args.push("--chromakey", options.greenScreenOverlay);
      if (options.overlayStartTime !== undefined) {
        args.push("--overlay-start", String(options.overlayStartTime));
      }
      if (options.overlayFinishTime !== undefined) {
        args.push("--overlay-finish", String(options.overlayFinishTime));
      }
      if (options.chromaColor) {
        args.push("--chroma-color", options.chromaColor);
      }
      if (options.chromaSimilarity !== undefined) {
        args.push("--chroma-sim", String(options.chromaSimilarity));
      }
      if (options.chromaBlend !== undefined) {
        args.push("--chroma-blend", String(options.chromaBlend));
      }
    }
    if (options.watermarkPath && fsSync.existsSync(options.watermarkPath)) {
      args.push("--watermark", options.watermarkPath);
      if (options.watermarkPos) {
        args.push("--watermark-pos", options.watermarkPos);
      }
      if (options.watermarkStartTime !== undefined) {
        args.push("--watermark-start", String(options.watermarkStartTime));
      }
      if (options.watermarkFinishTime !== undefined) {
        args.push("--watermark-finish", String(options.watermarkFinishTime));
      }
      if (options.watermarkOpacity !== undefined) {
        args.push("--watermark-opacity", String(options.watermarkOpacity));
      }
    }
    if (options.subtitlePath && fsSync.existsSync(options.subtitlePath)) {
      args.push("--subtitles", options.subtitlePath);
    }
    if (options.audioTrackPath && fsSync.existsSync(options.audioTrackPath)) {
      args.push("--audio-track", options.audioTrackPath);
      if (options.audioStartTime !== undefined) {
        args.push("--audio-start", String(options.audioStartTime));
      }
      if (options.audioTrimStart !== undefined) {
        args.push("--audio-trim-start", String(options.audioTrimStart));
      }
      if (options.audioTrimEnd !== undefined) {
        args.push("--audio-trim-end", String(options.audioTrimEnd));
      }
      if (options.audioVolume !== undefined) {
        args.push("--audio-volume", String(options.audioVolume));
      }
      if (options.audioFadeIn !== undefined) {
        args.push("--audio-fade-in", String(options.audioFadeIn));
      }
      if (options.audioFadeOut !== undefined) {
        args.push("--audio-fade-out", String(options.audioFadeOut));
      }
    }

    jobManager.update(jobId, {
      status: "RUNNING",
      progress: 5,
      step: "Initializing Master Render Pipeline..."
    });

    return new Promise((resolve, reject) => {
      const child = spawn(this.pythonBinary, args, {
        cwd: process.cwd(),
        env: { ...process.env, PYTHONUNBUFFERED: "1" }
      });

      let fullStdout = "";
      let fullStderr = "";

      child.stdout.on("data", (chunk: Buffer) => {
        const text = chunk.toString();
        fullStdout += text;
        console.log(`[StreamInject Master Stdout] ${text.trim()}`);

        const matchProgress = text.match(/\[STREAMINJECT_PROGRESS:\s*(\d+)%\]/);
        if (matchProgress) {
          const pct = parseInt(matchProgress[1], 10);
          jobManager.update(jobId, {
            progress: pct,
            step: text.trim().slice(0, 100)
          });
        } else if (text.includes("Slice Main Gameplay")) {
          jobManager.update(jobId, { progress: 20, step: "Slicing Gameplay Track..." });
        } else if (text.includes("Harmonize Audio Stream")) {
          jobManager.update(jobId, { progress: 40, step: "Harmonizing 48kHz Stereo Audio..." });
        } else if (text.includes("Aspect Ratio")) {
          jobManager.update(jobId, { progress: 60, step: "Applying Multi-Aspect Transformation..." });
        } else if (text.includes("Concatenation")) {
          jobManager.update(jobId, { progress: 80, step: "Concatenating Master Timeline Clips..." });
        } else if (text.includes("Peak Limiter")) {
          jobManager.update(jobId, { progress: 92, step: "Mastering Audio Peak Limiter (-0.95dB)..." });
        }
      });

      child.stderr.on("data", (chunk: Buffer) => {
        const text = chunk.toString();
        fullStderr += text;
        console.warn(`[StreamInject Master Stderr] ${text.trim()}`);
      });

      child.on("close", async (code) => {
        if (code === 0 && fsSync.existsSync(outputPath)) {
          const url = `/media/streaminject/${filename}`;
          const stat = await fs.stat(outputPath).catch(() => null);
          const outputEntry = {
            kind: "video",
            filename,
            url,
            path: outputPath,
            sizeBytes: stat?.size || 0
          };

          jobManager.update(jobId, {
            status: "COMPLETED",
            progress: 100,
            step: "Master Render Complete",
            completedAt: new Date().toISOString(),
            outputs: [outputEntry]
          });

          resolve({
            success: true,
            outputFilename: filename,
            outputPath,
            url
          });
        } else {
          const errMsg = `Python StreamInject Master exited with code ${code}. Stderr: ${fullStderr.slice(-400)}`;
          jobManager.update(jobId, {
            status: "FAILED",
            error: errMsg,
            completedAt: new Date().toISOString()
          });
          reject(new Error(errMsg));
        }
      });

      child.on("error", (err) => {
        const errMsg = `Failed to spawn Python StreamInject Master: ${err.message}`;
        jobManager.update(jobId, {
          status: "FAILED",
          error: errMsg,
          completedAt: new Date().toISOString()
        });
        reject(err);
      });
    });
  }
}
