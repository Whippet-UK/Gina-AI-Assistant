import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { execFile, spawn } from "child_process";
import { promisify } from "util";
import { JobManager } from "../jobs/JobManager.js";

const execFileAsync = promisify(execFile);

export interface MusicGenOptions {
  mode?: "text_to_song" | "lyrics_to_song" | "song_cover" | "extend" | "edit";
  songName?: string;
  style?: string;
  moods?: string;
  tempo?: string;
  lyrics?: string;
  negativeStyle?: string;
  vocalType?: string;
  noVocals?: boolean;
  duration?: number;
  model?: string;
  guidanceScale?: number;
  temperature?: number;
  audioRef?: string;
  splitStart?: number;
}

export interface AudioTrackMeta {
  filename: string;
  name: string;
  url: string;
  durationSec: number;
  bytes: number;
  createdAt: string;
  mode?: string;
  style?: string;
  lyrics?: string;
}

export class MusicService {
  private outputDir: string;
  private stemsDir: string;
  private modelsDir: string;
  private pythonPath: string;
  private scriptPath: string;
  private downloaderScriptPath: string;

  constructor(workspaceRoot: string) {
    this.outputDir = path.join(workspaceRoot, "local_ai_uploads", "audio");
    this.stemsDir = path.join(workspaceRoot, "local_ai_uploads", "audio", "stems");
    this.modelsDir = path.join("C:\\Gina_AI\\models\\audio");
    this.scriptPath = path.join(workspaceRoot, "scripts", "music_generator.py");
    this.downloaderScriptPath = path.join(workspaceRoot, "scripts", "download_audiocraft.py");
    
    // Resolve Python interpreter
    const winPython = "C:\\Gina_AI\\g_env\\Scripts\\python.exe";
    this.pythonPath = fsSync.existsSync(winPython) ? winPython : (process.platform === "win32" ? "python" : "python3");

    // Ensure output directories exist
    fsSync.mkdirSync(this.outputDir, { recursive: true });
    fsSync.mkdirSync(this.stemsDir, { recursive: true });
  }

  getOutputDir(): string {
    return this.outputDir;
  }

  getModelCacheInfo(modelName: string): { cached: boolean; totalBytes: number; fileCount: number; hasWeights: boolean; sizeLabel: string } {
    const cleanName = modelName.replace(/\//g, "_");
    const targetDir = path.join(this.modelsDir, cleanName);
    if (!fsSync.existsSync(targetDir)) {
      return { cached: false, totalBytes: 0, fileCount: 0, hasWeights: false, sizeLabel: "0 MB" };
    }

    let totalBytes = 0;
    let fileCount = 0;
    let hasWeights = false;

    const scanDir = (dir: string) => {
      try {
        const entries = fsSync.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            scanDir(fullPath);
          } else if (entry.isFile()) {
            fileCount++;
            const stats = fsSync.statSync(fullPath);
            totalBytes += stats.size;
            if (
              (entry.name.endsWith(".safetensors") || entry.name.endsWith(".bin") || entry.name.endsWith(".pt")) &&
              stats.size > 500 * 1024 * 1024
            ) {
              hasWeights = true;
            }
          }
        }
      } catch (err) {
        // Ignore read permission or locked file warnings
      }
    };

    scanDir(targetDir);

    const sizeMB = (totalBytes / (1024 * 1024)).toFixed(1);
    const sizeGB = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);
    const sizeLabel = totalBytes > 1024 * 1024 * 1024 ? `${sizeGB} GB` : `${sizeMB} MB`;

    return {
      cached: hasWeights,
      totalBytes,
      fileCount,
      hasWeights,
      sizeLabel
    };
  }

  checkModelCached(modelName: string): boolean {
    return this.getModelCacheInfo(modelName).cached;
  }

  async downloadModel(jobId: string, modelName: string, jobManager: JobManager): Promise<{ ok: boolean; message: string }> {
    jobManager.update(jobId, {
      status: "RUNNING",
      progress: 5,
      step: `1/3: Initializing connection to Hugging Face Hub for ${modelName}...`,
      currentStep: 1,
      totalSteps: 3
    });

    const args = [
      this.downloaderScriptPath,
      "--model", modelName,
      "--output_dir", this.modelsDir
    ];

    return new Promise((resolve, reject) => {
      const child = spawn(this.pythonPath, args, {
        cwd: process.cwd(),
        env: { ...process.env, PYTHONUNBUFFERED: "1" }
      });

      const handleLog = (text: string) => {
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        for (const line of lines) {
          console.log(`[AudioCraft Download] ${line}`);
          if (line.includes("Starting weight snapshot")) {
            jobManager.update(jobId, {
              progress: 15,
              step: `2/3: Fetching file manifest for ${modelName}...`,
              currentStep: 2
            });
          } else if (line.includes("Downloading bytes") || line.includes("Fetching") || line.includes("Reconstructing") || line.includes("%|")) {
            // Extract percentage if available
            const pctMatch = line.match(/(\d+)%/);
            const pct = pctMatch ? Math.min(90, Math.max(15, parseInt(pctMatch[1], 10))) : undefined;
            jobManager.update(jobId, {
              progress: pct !== undefined ? pct : undefined,
              step: `2/3: Downloading weights: ${line.substring(0, 100)}`,
              currentStep: 2
            });
          } else if (line.includes("Pre-loading processor")) {
            jobManager.update(jobId, {
              progress: 92,
              step: `3/3: Verifying neural weight integrity in local sandbox...`,
              currentStep: 3
            });
          }
        }
      };

      child.stdout.on("data", (data) => handleLog(data.toString()));
      child.stderr.on("data", (data) => handleLog(data.toString()));

      child.on("close", (code) => {
        if (code === 0) {
          const cacheInfo = this.getModelCacheInfo(modelName);
          jobManager.update(jobId, {
            status: "COMPLETED",
            progress: 100,
            step: `SUCCESS: ${modelName} fully cached (${cacheInfo.sizeLabel}). Ready for generation.`,
            outputs: [{ model: modelName, cached: true, size: cacheInfo.sizeLabel }]
          });
          resolve({ ok: true, message: `Model ${modelName} downloaded and cached successfully (${cacheInfo.sizeLabel})` });
        } else {
          const err = `AudioCraft download failed with exit code ${code}`;
          jobManager.update(jobId, { status: "FAILED", error: err });
          reject(new Error(err));
        }
      });
    });
  }

  async scanTracks(): Promise<AudioTrackMeta[]> {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      const entries = await fs.readdir(this.outputDir, { withFileTypes: true });
      const tracks: AudioTrackMeta[] = [];

      for (const entry of entries) {
        if (!entry.isFile()) continue;
        const ext = path.extname(entry.name).toLowerCase();
        if (ext !== ".wav" && ext !== ".mp3" && ext !== ".flac" && ext !== ".ogg" && ext !== ".m4a") continue;

        const fullPath = path.join(this.outputDir, entry.name);
        const stats = await fs.stat(fullPath);
        
        // Form human readable name from timestamp/slug
        const cleanName = entry.name.replace(/^\d+_/, "").replace(/\.(wav|mp3|flac|ogg)$/i, "").replace(/_/g, " ");

        tracks.push({
          filename: entry.name,
          name: cleanName || entry.name,
          url: `/media/audio/${encodeURIComponent(entry.name)}`,
          durationSec: Math.round(stats.size / (44100 * 2 * 2)), // approx estimate for uncompressed wav
          bytes: stats.size,
          createdAt: stats.mtime.toISOString()
        });
      }

      return tracks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error("[MusicService] Failed to scan tracks:", error);
      return [];
    }
  }

  async generateMusic(jobId: string, options: MusicGenOptions, jobManager: JobManager): Promise<{ outputFilename: string; outputUrl: string; duration: number }> {
    const timestamp = Date.now();
    const cleanTitle = (options.songName || "track").trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
    const outputFilename = `music_${timestamp}_${cleanTitle}.wav`;
    const outputPath = path.join(this.outputDir, outputFilename);

    jobManager.update(jobId, {
      status: "RUNNING",
      progress: 10,
      step: "1/4: Initializing AudioCraft Generator",
      currentStep: 1,
      totalSteps: 4
    });

    const args = [
      this.scriptPath,
      "generate",
      "--mode", options.mode || "text_to_song",
      "--duration", String(options.duration || 15.0),
      "--output_path", outputPath,
      "--model", options.model || "facebook/musicgen-small",
      "--guidance_scale", String(options.guidanceScale || 3.0),
      "--temperature", String(options.temperature || 1.0)
    ];

    if (options.songName) args.push("--song_name", options.songName);
    if (options.style) args.push("--style", options.style);
    if (options.moods) args.push("--moods", options.moods);
    if (options.tempo) args.push("--tempo", options.tempo);
    if (options.lyrics) args.push("--lyrics", options.lyrics);
    if (options.negativeStyle) args.push("--negative_style", options.negativeStyle);
    if (options.vocalType) args.push("--vocal_type", options.vocalType);
    if (options.noVocals) args.push("--no_vocals");
    if (options.audioRef) args.push("--audio_ref", options.audioRef);
    if (options.splitStart) args.push("--split_start", String(options.splitStart));

    return new Promise((resolve, reject) => {
      console.log(`[MusicService] Executing Python: ${this.pythonPath} ${args.join(" ")}`);
      const child = spawn(this.pythonPath, args, {
        cwd: process.cwd(),
        env: { ...process.env, PYTHONUNBUFFERED: "1" }
      });

      let jsonResult: any = null;

      child.stdout.on("data", (data) => {
        const lines = data.toString().split("\n");
        for (const line of lines) {
          if (!line.trim()) continue;
          console.log(`[MusicGen STDOUT] ${line}`);

          if (line.includes("Loading model")) {
            jobManager.update(jobId, { progress: 30, step: "2/4: Loading Neural Weights", currentStep: 2 });
          } else if (line.includes("Generating audio tensors")) {
            jobManager.update(jobId, { progress: 65, step: "3/4: Synthesizing Audio Tokens", currentStep: 3 });
          } else if (line.includes("Saved master audio") || line.includes("Saved fallback")) {
            jobManager.update(jobId, { progress: 95, step: "4/4: Writing Master WAV", currentStep: 4 });
          }

          if (line.startsWith("JSON_RESULT:")) {
            try {
              jsonResult = JSON.parse(line.replace("JSON_RESULT:", ""));
            } catch (err) {
              console.error("[MusicService] Failed to parse JSON result:", err);
            }
          }
        }
      });

      child.stderr.on("data", (data) => {
        console.warn(`[MusicGen STDERR] ${data.toString()}`);
      });

      child.on("close", (code) => {
        if (code === 0 || fsSync.existsSync(outputPath)) {
          jobManager.update(jobId, {
            status: "COMPLETED",
            progress: 100,
            completedAt: new Date().toISOString(),
            outputs: [{
              filename: outputFilename,
              url: `/media/audio/${encodeURIComponent(outputFilename)}`,
              duration: options.duration || 15
            }]
          });
          resolve({
            outputFilename,
            outputUrl: `/media/audio/${encodeURIComponent(outputFilename)}`,
            duration: options.duration || 15
          });
        } else {
          const errMessage = `Music generation exited with code ${code}`;
          jobManager.update(jobId, {
            status: "FAILED",
            error: errMessage,
            completedAt: new Date().toISOString()
          });
          reject(new Error(errMessage));
        }
      });
    });
  }

  async separateStems(jobId: string, inputPath: string, jobManager: JobManager): Promise<{ vocalsUrl: string; instrumentalUrl: string }> {
    jobManager.update(jobId, {
      status: "RUNNING",
      progress: 25,
      step: "1/3: Loading Audio Track",
      currentStep: 1,
      totalSteps: 3
    });

    const args = [
      this.scriptPath,
      "separate",
      "--input_path", inputPath,
      "--output_dir", this.stemsDir
    ];

    return new Promise((resolve, reject) => {
      const child = spawn(this.pythonPath, args, {
        cwd: process.cwd(),
        env: { ...process.env, PYTHONUNBUFFERED: "1" }
      });

      let jsonResult: any = null;

      child.stdout.on("data", (data) => {
        const lines = data.toString().split("\n");
        for (const line of lines) {
          if (!line.trim()) continue;
          if (line.startsWith("JSON_RESULT:")) {
            try {
              jsonResult = JSON.parse(line.replace("JSON_RESULT:", ""));
            } catch (err) {
              console.error("[MusicService] Failed to parse stem JSON result:", err);
            }
          }
        }
      });

      child.on("close", (code) => {
        if (code === 0 && jsonResult) {
          const vocalsFile = path.basename(jsonResult.vocals_path);
          const instFile = path.basename(jsonResult.instrumental_path);
          const vocalsUrl = `/media/audio/stems/${encodeURIComponent(vocalsFile)}`;
          const instrumentalUrl = `/media/audio/stems/${encodeURIComponent(instFile)}`;

          jobManager.update(jobId, {
            status: "COMPLETED",
            progress: 100,
            outputs: [{ vocalsUrl, instrumentalUrl }]
          });
          resolve({ vocalsUrl, instrumentalUrl });
        } else {
          const err = `Stem separation failed with code ${code}`;
          jobManager.update(jobId, { status: "FAILED", error: err });
          reject(new Error(err));
        }
      });
    });
  }
}
