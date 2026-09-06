import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { spawn } from "child_process";
import { JobManager } from "../jobs/JobManager.js";

export interface StitchOptions {
  videoPath: string;
  audioPath: string;
  outputFilename?: string;
  audioVolume?: number;
  videoVolume?: number;
  fadeIn?: number;
  fadeOut?: number;
  loopVideo?: boolean;
  syncMode?: "match_video" | "match_audio" | "custom" | "shortest";
  duration?: number;
}

export interface StitchResult {
  outputFilename: string;
  outputUrl: string;
  outputPath: string;
  duration: number;
}

export class MultimediaService {
  private outputDir: string;
  private pythonPath: string;
  private scriptPath: string;

  constructor(workspaceRoot: string) {
    this.outputDir = path.join(workspaceRoot, "local_ai_uploads", "stitched");
    this.scriptPath = path.join(workspaceRoot, "scripts", "media_stitcher.py");

    const winPython = "C:\\Gina_AI\\g_env\\Scripts\\python.exe";
    this.pythonPath = fsSync.existsSync(winPython) ? winPython : (process.platform === "win32" ? "python" : "python3");

    fsSync.mkdirSync(this.outputDir, { recursive: true });
  }

  getOutputDir(): string {
    return this.outputDir;
  }

  async checkMoviePyInstalled(): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn(this.pythonPath, ["-c", "import moviepy.editor; print('MOVIEPY_OK')"]);
      let stdout = "";
      proc.stdout.on("data", (d) => { stdout += d.toString(); });
      proc.on("close", (code) => {
        resolve(code === 0 && stdout.includes("MOVIEPY_OK"));
      });
      proc.on("error", () => {
        resolve(false);
      });
    });
  }

  async installMoviePy(): Promise<{ ok: boolean; output: string }> {
    return new Promise((resolve) => {
      const proc = spawn(this.pythonPath, ["-m", "pip", "install", "moviepy==1.0.3"]);
      let log = "";
      proc.stdout.on("data", (d) => { log += d.toString(); });
      proc.stderr.on("data", (d) => { log += d.toString(); });
      proc.on("close", (code) => {
        resolve({ ok: code === 0, output: log });
      });
      proc.on("error", (err) => {
        resolve({ ok: false, output: err.message });
      });
    });
  }

  async stitchMedia(
    jobId: string,
    options: StitchOptions,
    jobManager: JobManager
  ): Promise<StitchResult> {
    const timestamp = Date.now();
    const cleanBase = path.basename(options.videoPath, path.extname(options.videoPath)) || "video";
    const outName = options.outputFilename || `stitched_${cleanBase}_${timestamp}.mp4`;
    const outputPath = path.join(this.outputDir, outName);

    jobManager.update(jobId, {
      status: "RUNNING",
      progress: 10,
      step: "1/3: Initializing Multimedia Stitcher & Probing Streams",
      currentStep: 1,
      totalSteps: 3
    });

    const args = [
      this.scriptPath,
      "--video_path", options.videoPath,
      "--audio_path", options.audioPath,
      "--output_path", outputPath,
      "--audio_volume", String(options.audioVolume ?? 1.0),
      "--video_volume", String(options.videoVolume ?? 0.0),
      "--fade_in", String(options.fadeIn ?? 0.5),
      "--fade_out", String(options.fadeOut ?? 1.0),
      "--sync_mode", options.syncMode || "match_video"
    ];

    if (options.loopVideo) {
      args.push("--loop_video");
    }
    if (options.duration && options.duration > 0) {
      args.push("--duration", String(options.duration));
    }

    return new Promise((resolve, reject) => {
      console.log(`[MultimediaService] Spawning Python stitcher: ${this.pythonPath} ${args.join(" ")}`);
      const proc = spawn(this.pythonPath, args);

      let stdout = "";
      let stderr = "";
      let jsonResult: any = null;

      proc.stdout.on("data", (chunk) => {
        const text = chunk.toString();
        stdout += text;
        const lines = text.split("\n");
        for (const line of lines) {
          if (!line.trim()) continue;
          console.log(`[MediaStitcher STDOUT] ${line}`);
          if (line.includes("MoviePy") || line.includes("FFmpeg")) {
            jobManager.update(jobId, { progress: 45, step: "2/3: Merging Video & Audio Layers", currentStep: 2 });
          } else if (line.includes("Writing") || line.includes("Export")) {
            jobManager.update(jobId, { progress: 80, step: "3/3: Encoding Final Master MP4", currentStep: 3 });
          }
          if (line.startsWith("JSON_RESULT:")) {
            try {
              jsonResult = JSON.parse(line.replace("JSON_RESULT:", "").trim());
            } catch (err) {
              console.error("[MultimediaService] Failed to parse JSON_RESULT:", err);
            }
          }
        }
      });

      proc.stderr.on("data", (chunk) => {
        const text = chunk.toString();
        stderr += text;
        console.warn(`[MediaStitcher STDERR] ${text}`);
      });

      proc.on("close", (code) => {
        console.log(`[MultimediaService] Stitcher exited with code: ${code}`);
        if (code === 0 && (jsonResult?.ok || fsSync.existsSync(outputPath))) {
          const duration = jsonResult?.duration || options.duration || 10;
          const outputUrl = `/media/stitched/${encodeURIComponent(outName)}`;

          jobManager.update(jobId, {
            status: "COMPLETED",
            progress: 100,
            completedAt: new Date().toISOString(),
            outputs: [{
              filename: outName,
              url: outputUrl,
              duration
            }]
          });

          resolve({
            outputFilename: outName,
            outputUrl,
            outputPath,
            duration
          });
        } else {
          const errMessage = jsonResult?.error || stderr || `Process failed with exit code ${code}`;
          jobManager.update(jobId, {
            status: "FAILED",
            error: errMessage,
            completedAt: new Date().toISOString()
          });
          reject(new Error(errMessage));
        }
      });

      proc.on("error", (err) => {
        jobManager.update(jobId, {
          status: "FAILED",
          error: err.message,
          completedAt: new Date().toISOString()
        });
        reject(err);
      });
    });
  }
}
