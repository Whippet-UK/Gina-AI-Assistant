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
  vocalLanguage?: string;
  engine?: string;
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
  // AudioCraft models are mutually exclusive on the target 8 GB workstation.
  // This lane serializes downloads and generations so a second heavy audio model
  // cannot start while another one is resident.
  private audioLane: Promise<void> = Promise.resolve();

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

  private async acquireAudioLane(): Promise<() => void> {
    let release!: () => void;
    const turn = new Promise<void>((resolve) => { release = resolve; });
    const previous = this.audioLane;
    this.audioLane = previous.then(() => turn);
    await previous;
    return release;
  }

  private getManagedModelPath(modelName: string): string {
    return path.join(this.modelsDir, modelName.replace(/[\\\/]+/g, "_"));
  }

  private getHubSnapshotPath(modelName: string): string | null {
    // Resolve an already-downloaded Hugging Face snapshot without contacting the
    // Hub. Hugging Face snapshots on Windows can contain symlink/junction-like
    // entries, so use statSync() on the actual paths instead of Dirent.isFile().
    if (modelName !== "facebook/musicgen-medium") return null;

    const candidateRoots = [
      path.join(this.modelsDir, "models--facebook--musicgen-medium", "snapshots"),
      path.join("C:\\Users", process.env.USERNAME || "", ".cache", "huggingface", "hub", "models--facebook--musicgen-medium", "snapshots")
    ];

    const isRegularFile = (filePath: string): boolean => {
      try { return fsSync.statSync(filePath).isFile(); } catch { return false; }
    };

    const isCompleteSnapshot = (candidate: string) => {
      const hasConfig = isRegularFile(path.join(candidate, "config.json"));
      const hasProcessorConfig = isRegularFile(path.join(candidate, "preprocessor_config.json"));
      const hasTokenizer = isRegularFile(path.join(candidate, "tokenizer.json")) ||
        isRegularFile(path.join(candidate, "spiece.model"));
      const hasWeights = isRegularFile(path.join(candidate, "model.safetensors")) ||
        isRegularFile(path.join(candidate, "pytorch_model.bin")) ||
        isRegularFile(path.join(candidate, "model.safetensors.index.json")) ||
        isRegularFile(path.join(candidate, "pytorch_model.bin.index.json"));
      return hasConfig && hasWeights && (hasProcessorConfig || hasTokenizer);
    };

    const found: { path: string; mtime: number; hasSafe: boolean }[] = [];
    for (const hubRoot of candidateRoots) {
      try {
        if (!fsSync.existsSync(hubRoot)) continue;
        for (const entry of fsSync.readdirSync(hubRoot, { withFileTypes: true })) {
          const candidate = path.join(hubRoot, entry.name);
          let stat;
          try { stat = fsSync.statSync(candidate); } catch { continue; }
          if (!stat.isDirectory() || !isCompleteSnapshot(candidate)) continue;
          found.push({
            path: candidate,
            mtime: stat.mtimeMs,
            hasSafe: isRegularFile(path.join(candidate, "model.safetensors"))
          });
        }
      } catch { /* local cache may be absent/inaccessible */ }
    }

    found.sort((a, b) => (Number(b.hasSafe) - Number(a.hasSafe)) || (b.mtime - a.mtime));
    return found[0]?.path || null;
  }

  private getSnapshotRevision(snapshotPath: string): string | null {
    const normalized = path.normalize(snapshotPath);
    const marker = `${path.sep}models--facebook--musicgen-medium${path.sep}snapshots${path.sep}`;
    const index = normalized.toLowerCase().indexOf(marker.toLowerCase());
    if (index < 0) return null;
    const tail = normalized.slice(index + marker.length);
    return tail.split(path.sep)[0] || null;
  }

  private getSnapshotRefs(snapshotPath: string): string[] {
    const revision = this.getSnapshotRevision(snapshotPath);
    if (!revision) return [];
    const root = path.join(this.modelsDir, "models--facebook--musicgen-medium", "refs");
    const refs: string[] = [];
    const walk = (dir: string, prefix = "") => {
      try {
        for (const entry of fsSync.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          const refName = prefix ? `${prefix}/${entry.name}` : entry.name;
          if (entry.isDirectory()) walk(full, refName);
          else if (entry.isFile()) {
            try {
              if (fsSync.readFileSync(full, "utf8").trim() === revision) refs.push(refName);
            } catch { /* ignore unreadable ref */ }
          }
        }
      } catch { /* refs are optional */ }
    };
    walk(root);
    return refs;
  }

  getModelResolution(modelName: string): { path: string; source: string; revision: string | null; refs: string[] } {
    try {
      const resolved = this.getResolvedModelPath(modelName);
      const revision = modelName === "facebook/musicgen-medium" ? this.getSnapshotRevision(resolved) : null;
      const refs = revision ? this.getSnapshotRefs(resolved) : [];
      return {
        path: resolved,
        source: revision ? "Hugging Face local snapshot" : "Gina managed model directory",
        revision,
        refs
      };
    } catch (error: any) {
      console.warn(`[MusicService] Model resolution telemetry failed for ${modelName}: ${error?.message || error}`);
      return {
        path: this.getManagedModelPath(modelName),
        source: "Gina managed model directory",
        revision: null,
        refs: []
      };
    }
  }

  getResolvedModelPath(modelName: string): string {
    return this.getModelCacheCandidates(modelName)[0] || this.getManagedModelPath(modelName);
  }

  private getModelCacheCandidates(modelName: string): string[] {
    // MusicGen Medium uses the already-complete Transformers/Hugging Face
    // snapshot when present. This is a LOCAL snapshot only: HF Hub network
    // resolution is disabled during generation. Other models continue to use
    // Gina's managed directories.
    const hubSnapshot = this.getHubSnapshotPath(modelName);
    if (hubSnapshot) return [hubSnapshot];
    const managed = this.getManagedModelPath(modelName);
    return fsSync.existsSync(managed) ? [managed] : [];
  }

  private getModelWeightPath(modelName: string): string {
    return this.getResolvedModelPath(modelName);
  }

  getModelBackend(modelName: string): { backend: string; weightFiles: string[] } {
    const resolved = this.getResolvedModelPath(modelName);
    const weightFiles: string[] = [];
    try {
      for (const entry of fsSync.readdirSync(resolved, { withFileTypes: true })) {
        const fullPath = path.join(resolved, entry.name);
        let stat;
        try { stat = fsSync.statSync(fullPath); } catch { continue; }
        if (!stat.isFile()) continue;
        const lower = entry.name.toLowerCase();
        if ((lower.endsWith('.safetensors') || lower.endsWith('.bin') || lower.endsWith('.pt')) && stat.size > 200 * 1024 * 1024) {
          weightFiles.push(entry.name);
        }
      }
    } catch { /* resolved model directory may not exist yet */ }

    if (modelName === 'facebook/audiogen-medium') {
      return { backend: 'AudioCraft / AudioGen checkpoint', weightFiles };
    }
    if (weightFiles.some(f => f.toLowerCase().endsWith('.safetensors'))) {
      return { backend: 'Transformers / Safetensors', weightFiles };
    }
    if (weightFiles.some(f => f.toLowerCase() === 'pytorch_model.bin')) {
      return { backend: 'Transformers / PyTorch weights', weightFiles };
    }
    return { backend: 'Transformers local checkpoint', weightFiles };
  }

  getOutputDir(): string {
    return this.outputDir;
  }

  getModelCacheInfo(modelName: string): { cached: boolean; totalBytes: number; fileCount: number; hasWeights: boolean; sizeLabel: string } {
    const candidates = this.getModelCacheCandidates(modelName);
    let totalBytes = 0;
    let fileCount = 0;
    let hasWeights = false;
    const seen = new Set<string>();

    for (const candidate of candidates) {
      try {
        const entries = fsSync.readdirSync(candidate, { withFileTypes: true });
        let preferredWeight: { name: string; bytes: number } | null = null;
        const alternateWeights: { name: string; bytes: number }[] = [];

        for (const entry of entries) {
          const fullPath = path.join(candidate, entry.name);
          let stats;
          try { stats = fsSync.statSync(fullPath); } catch { continue; }
          if (!stats.isFile()) continue;
          if (seen.has(fullPath.toLowerCase())) continue;
          seen.add(fullPath.toLowerCase());
          fileCount++;
          const lower = entry.name.toLowerCase();
          const isWeight = (lower.endsWith(".safetensors") || lower.endsWith(".bin") || lower.endsWith(".pt")) &&
            stats.size > 200 * 1024 * 1024;
          if (isWeight) {
            if (lower === "model.safetensors") preferredWeight = { name: entry.name, bytes: stats.size };
            else if (lower === "pytorch_model.bin") alternateWeights.push({ name: entry.name, bytes: stats.size });
            else alternateWeights.push({ name: entry.name, bytes: stats.size });
          } else {
            // Config/tokenizer/metadata files are tiny; include them in the
            // cache footprint without double-counting alternate model formats.
            totalBytes += stats.size;
          }
        }

        const selectedWeight = preferredWeight || alternateWeights[0] || null;
        if (selectedWeight) {
          totalBytes += selectedWeight.bytes;
          hasWeights = true;
        }

        // A complete AudioGen checkpoint is represented by state_dict.bin plus
        // compression_state_dict.bin. For MusicGen, only one large Transformers
        // weight representation is counted even when a snapshot contains both.
        if (modelName === "facebook/audiogen-medium") {
          hasWeights = fsSync.existsSync(path.join(candidate, "state_dict.bin")) &&
            fsSync.existsSync(path.join(candidate, "compression_state_dict.bin"));
        }
      } catch {
        // Ignore read permission or locked file warnings.
      }
    }

    const sizeMB = (totalBytes / (1024 * 1024)).toFixed(1);
    const sizeGB = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);
    const sizeLabel = totalBytes > 1024 * 1024 * 1024 ? `${sizeGB} GB` : `${sizeMB} MB`;
    return { cached: hasWeights, totalBytes, fileCount, hasWeights, sizeLabel };
  }

  checkModelCached(modelName: string): boolean {
    return this.getModelCacheInfo(modelName).cached;
  }

  async downloadModel(jobId: string, modelName: string, jobManager: JobManager): Promise<{ ok: boolean; message: string }> {
    const releaseLane = await this.acquireAudioLane();
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
          if (line.includes("Starting weight snapshot") || line.includes("Starting/resuming Hugging Face cache download")) {
            jobManager.update(jobId, {
              progress: 15,
              step: `2/3: Fetching file manifest for ${modelName}...`,
              currentStep: 2
            });
          } else if (line.includes("Downloading") || line.includes("Fetching") || line.includes("Reconstructing") || line.includes("%|")) {
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

      child.on("error", (error) => {
        const message = `AudioCraft download process error: ${error.message}`;
        jobManager.update(jobId, { status: "FAILED", error: message, completedAt: new Date().toISOString() });
        releaseLane();
        reject(error);
      });

      child.on("close", (code) => {
        if (code === 0) {
          const cacheInfo = this.getModelCacheInfo(modelName);
          jobManager.update(jobId, {
            status: "COMPLETED",
            progress: 100,
            step: `SUCCESS: ${modelName} fully cached (${cacheInfo.sizeLabel}). Ready for generation.`,
            outputs: [{ model: modelName, cached: true, size: cacheInfo.sizeLabel }]
          });
          releaseLane();
          resolve({ ok: true, message: `Model ${modelName} downloaded and cached successfully (${cacheInfo.sizeLabel})` });
        } else {
          const err = `AudioCraft download failed with exit code ${code}`;
          jobManager.update(jobId, { status: "FAILED", error: err });
          releaseLane();
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

  private getAceStepBaseUrl(): string {
    return process.env.ACESTEP_API_URL || "http://127.0.0.1:8001";
  }

  private async fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  private async getAceStepHealth(): Promise<{ ok: boolean; detail?: string }> {
    try {
      const response = await this.fetchWithTimeout(`${this.getAceStepBaseUrl()}/health`, {}, 5000);
      if (!response.ok) return { ok: false, detail: `HTTP ${response.status}` };
      const payload: any = await response.json();
      return payload?.code === 200 || payload?.data?.status === "ok"
        ? { ok: true }
        : { ok: false, detail: payload?.error || "ACE-Step health response was not ready" };
    } catch (error: any) {
      return { ok: false, detail: error?.message || "ACE-Step API is not reachable" };
    }
  }

  private async generateAceStepSong(
    jobId: string,
    options: MusicGenOptions,
    outputPath: string,
    outputFilename: string,
    jobManager: JobManager,
    releaseLane: () => void
  ): Promise<{ outputFilename: string; outputUrl: string; duration: number }> {
    const baseUrl = this.getAceStepBaseUrl();
    const duration = Math.max(10, Math.min(600, Number(options.duration || 20)));
    const lyrics = (options.lyrics || "").trim();
    if (!lyrics) {
      const message = "Singing generation requires lyrics. Enter lyrics or enable No Vocals for an instrumental track.";
      jobManager.update(jobId, { status: "FAILED", error: message, completedAt: new Date().toISOString() });
      releaseLane();
      throw new Error(message);
    }

    const health = await this.getAceStepHealth();
    if (!health.ok) {
      const message = `ACE-Step singing service is not ready at ${baseUrl}. ${health.detail || "Start the ACE-Step API first."}`;
      jobManager.update(jobId, { status: "FAILED", error: message, completedAt: new Date().toISOString() });
      releaseLane();
      throw new Error(message);
    }

    const vocalLanguage = options.vocalLanguage || "en";
    const vocalHint = options.vocalType && options.vocalType !== "Surprise Me" ? ` ${options.vocalType}.` : "";
    const prompt = [
      options.style || "modern song",
      options.moods || "",
      options.tempo || "",
      vocalHint,
      options.negativeStyle ? `Avoid: ${options.negativeStyle}` : "",
      "Create a complete song with a clearly audible lead vocal singing the supplied lyrics."
    ].filter(Boolean).join(", ");

    jobManager.update(jobId, {
      status: "RUNNING",
      progress: 10,
      step: "1/5: ACE-Step singing engine connected — lyrics + vocal conditioning",
      currentStep: 1,
      totalSteps: 5,
      parameters: {
        ...options,
        engine: "ace-step-1.5",
        __audioSnapshot: {
          engine: "ACE-Step 1.5",
          api: baseUrl,
          lmModel: "acestep-5Hz-lm-0.6B",
          backend: "pt",
          offloadToCpu: true,
          network: "local-only"
        }
      }
    });

    try {
      const requestBody = {
        prompt,
        lyrics,
        thinking: true,
        vocal_language: vocalLanguage,
        audio_format: "wav",
        audio_duration: duration,
        model: "acestep-v15-turbo",
        inference_steps: 8,
        guidance_scale: 7.0,
        batch_size: 1,
        lm_model_path: "acestep-5Hz-lm-0.6B",
        lm_backend: "pt",
        lm_temperature: 0.85,
        use_random_seed: true,
        use_format: false
      };

      const submitResponse = await this.fetchWithTimeout(`${baseUrl}/release_task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      }, 15000);
      const submitPayload: any = await submitResponse.json().catch(() => ({}));
      if (!submitResponse.ok || submitPayload?.code !== 200 || !submitPayload?.data?.task_id) {
        throw new Error(submitPayload?.error || submitPayload?.detail || `ACE-Step task submission failed (HTTP ${submitResponse.status})`);
      }

      const taskId = submitPayload.data.task_id;
      jobManager.update(jobId, {
        progress: 25,
        step: `2/5: ACE-Step task queued (${taskId.slice(0, 8)})`,
        currentStep: 2,
        totalSteps: 5,
        parameters: { ...options, engine: "ace-step-1.5", aceStepTaskId: taskId }
      });

      let resultItem: any = null;
      let pollCount = 0;
      const deadline = Date.now() + Math.max(180000, duration * 30000);
      while (Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        pollCount += 1;
        const queryResponse = await this.fetchWithTimeout(`${baseUrl}/query_result`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task_id_list: [taskId] })
        }, 15000);
        const queryPayload: any = await queryResponse.json().catch(() => ({}));
        if (!queryResponse.ok || queryPayload?.code !== 200) {
          throw new Error(queryPayload?.error || `ACE-Step status query failed (HTTP ${queryResponse.status})`);
        }

        const item = Array.isArray(queryPayload.data) ? queryPayload.data[0] : null;
        if (!item || item.status === 0) {
          jobManager.update(jobId, {
            progress: Math.min(85, 30 + Math.min(55, pollCount * 2)),
            step: "3/5: ACE-Step synthesizing music + sung vocals",
            currentStep: 3,
            totalSteps: 5
          });
          continue;
        }
        if (item.status === 2) {
          throw new Error(typeof item.result === "string" ? item.result : "ACE-Step generation failed");
        }
        if (item.status === 1) {
          let parsed: any[] = [];
          try { parsed = typeof item.result === "string" ? JSON.parse(item.result) : (Array.isArray(item.result) ? item.result : []); } catch {}
          resultItem = parsed[0] || null;
          break;
        }
      }

      if (!resultItem?.file) throw new Error("ACE-Step timed out before returning an audio file.");

      jobManager.update(jobId, { progress: 90, step: "4/5: Downloading completed WAV into Gina Audio Library", currentStep: 4, totalSteps: 5 });
      const audioUrl = resultItem.file.startsWith("http") ? resultItem.file : `${baseUrl}${resultItem.file}`;
      const audioResponse = await this.fetchWithTimeout(audioUrl, {}, Math.max(30000, Math.round(duration * 5000)));
      if (!audioResponse.ok) throw new Error(`ACE-Step audio download failed (HTTP ${audioResponse.status})`);
      const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
      await fs.writeFile(outputPath, audioBuffer);

      jobManager.update(jobId, {
        status: "COMPLETED",
        progress: 100,
        completedAt: new Date().toISOString(),
        step: "5/5: Song saved — Audio Deck can load the finished WAV",
        currentStep: 5,
        totalSteps: 5,
        outputs: [{
          filename: outputFilename,
          url: `/media/audio/${encodeURIComponent(outputFilename)}`,
          duration,
          engine: "ACE-Step 1.5",
          hasVocals: true,
          lyrics
        }]
      });

      return {
        outputFilename,
        outputUrl: `/media/audio/${encodeURIComponent(outputFilename)}`,
        duration
      };
    } catch (error) {
      jobManager.update(jobId, { status: "FAILED", error: error instanceof Error ? error.message : String(error), completedAt: new Date().toISOString() });
      throw error;
    } finally {
      releaseLane();
    }
  }

  async generateMusic(jobId: string, options: MusicGenOptions, jobManager: JobManager): Promise<{ outputFilename: string; outputUrl: string; duration: number }> {
    const releaseLane = await this.acquireAudioLane();
    const timestamp = Date.now();
    const cleanTitle = (options.songName || "track").trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
    const outputFilename = `music_${timestamp}_${cleanTitle}.wav`;
    const outputPath = path.join(this.outputDir, outputFilename);

    const requestedModel = options.model || "facebook/musicgen-small";
    const wantsSinging = !!options.lyrics?.trim() && options.noVocals !== true && requestedModel !== "facebook/audiogen-medium";
    const useAceStep = requestedModel === "ace-step-1.5" || requestedModel === "auto" || wantsSinging;

    if (useAceStep) {
      return this.generateAceStepSong(jobId, { ...options, engine: "ace-step-1.5" }, outputPath, outputFilename, jobManager, releaseLane);
    }

    const modelName = requestedModel === "auto" ? "facebook/musicgen-small" : requestedModel;
    const modelPath = this.getModelWeightPath(modelName);
    const cacheInfo = this.getModelCacheInfo(modelName);
    const backendInfo = this.getModelBackend(modelName);

    jobManager.update(jobId, {
      status: "RUNNING",
      progress: 5,
      step: `1/5: Audio lane acquired — ${modelName} verified locally (${cacheInfo.sizeLabel})`,
      currentStep: 1,
      totalSteps: 5,
      parameters: { ...options, engine: modelName === 'facebook/audiogen-medium' ? 'audiogen' : 'musicgen', __audioSnapshot: { modelName, modelPath, backend: backendInfo.backend, weightFiles: backendInfo.weightFiles, sequential: true, network: 'disabled' } }
    });

    if (!cacheInfo.cached) {
      releaseLane();
      const message = `Model ${modelName} is not installed in Gina's managed model directory: ${modelPath}. Use Download Model first. Generate will not download models.`;
      jobManager.update(jobId, {
        status: "FAILED",
        progress: 0,
        step: `ERROR: ${message}`,
        error: message,
        completedAt: new Date().toISOString()
      });
      throw new Error(message);
    }

    const args = [
      this.scriptPath,
      "generate",
      "--mode", options.mode || "text_to_song",
      "--duration", String(options.duration || 15.0),
      "--output_path", outputPath,
      "--model", modelName,
      "--model_path", modelPath,
      "--cache_dir", this.modelsDir,
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

      const handleEngineLog = (text: string) => {
        const lines = text.toString().split(/\r?\n/);
        for (const line of lines) {
          if (!line.trim()) continue;
          console.log(`[AudioCraft] ${line}`);

          if (line.includes("Loading cached MusicGen") || line.includes("Loading cached AudioGen")) {
            jobManager.update(jobId, { progress: 20, step: `2/5: Loading cached neural model (local-only) — ${options.model}`, currentStep: 2, totalSteps: 5 });
          } else if (line.includes("Processor ready") || line.includes("Model loaded")) {
            jobManager.update(jobId, { progress: 40, step: "3/5: Model loaded; preparing generation tensors", currentStep: 3, totalSteps: 5 });
          } else if (line.includes("Generating audio tensors") || (line.includes("Generating") && line.includes("tokens"))) {
            jobManager.update(jobId, { progress: 65, step: `4/5: Synthesizing ${options.duration || 15}s of ${options.model === 'facebook/audiogen-medium' ? 'SFX / atmosphere' : 'music'}`, currentStep: 4, totalSteps: 5 });
          } else if (line.includes("Saved master audio") || line.includes("Saved SFX/atmosphere")) {
            jobManager.update(jobId, { progress: 95, step: "5/5: Writing master WAV and releasing VRAM", currentStep: 5, totalSteps: 5 });
          } else if (line.includes("Local generation error")) {
            jobManager.update(jobId, { step: `ERROR: ${line.substring(0, 180)}` });
          }

          if (line.startsWith("JSON_RESULT:")) {
            try {
              jsonResult = JSON.parse(line.replace("JSON_RESULT:", ""));
            } catch (err) {
              console.error("[MusicService] Failed to parse JSON result:", err);
            }
          }
        }
      };

      child.stdout.on("data", (data) => handleEngineLog(data.toString()));
      child.stderr.on("data", (data) => handleEngineLog(data.toString()));

      child.on("error", (error) => {
        const message = `AudioCraft generation process error: ${error.message}`;
        jobManager.update(jobId, { status: "FAILED", error: message, completedAt: new Date().toISOString() });
        releaseLane();
        reject(error);
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
          releaseLane();
          resolve({
            outputFilename,
            outputUrl: `/media/audio/${encodeURIComponent(outputFilename)}`,
            duration: options.duration || 15
          });
        } else {
          const errMessage = `AudioCraft generation exited with code ${code}`;
          jobManager.update(jobId, {
            status: "FAILED",
            error: errMessage,
            completedAt: new Date().toISOString()
          });
          releaseLane();
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
