import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";

export interface LocalLlmConfig {
  executablePath: string;
  modelPath: string;
  host: string;
  port: number;
  gpuLayers: number;
  contextSize: number;
  threads: number;
  timeoutMs: number;
  mmprojPath?: string;
}

export interface LocalLlmStatus {
  configured: boolean;
  running: boolean;
  ready: boolean;
  pid: number | null;
  port: number;
  modelPath: string;
  modelName: string;
  gpuLayers: number;
  contextSize: number;
  threads: number;
  backend: "CUDA" | "unknown";
  lastError: string | null;
  startedAt: string | null;
  recentLog: string[];
  multimodal: boolean;
  mmprojPath: string | null;
}

function envNumber(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : fallback;
}


type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
type ImageAttachment = { name: string; mime: string; localPath: string };

/**
 * Gemma's Jinja template is intentionally strict: after the optional system
 * instruction it expects user/assistant/user/assistant turns.  Frontends and
 * agents can legitimately produce consecutive messages (especially after a
 * failed request), so the LLM boundary must be defensive and repair them.
 */
function normalizeChatMessages(messages: ChatMessage[], contextSize: number, hardFallback = false): ChatMessage[] {
  const source = Array.isArray(messages) ? messages : [];
  const systemParts: string[] = [];
  const turns: ChatMessage[] = [];

  for (const message of source) {
    if (!message || !["system", "user", "assistant"].includes(message.role)) continue;
    const content = String(message.content ?? "")
      .replace(/\u0000/g, "")
      .trim();
    if (!content) continue;

    if (message.role === "system") {
      systemParts.push(content);
      continue;
    }

    const previous = turns[turns.length - 1];
    if (previous && previous.role === message.role) {
      previous.content = `${previous.content}\n\n${content}`;
    } else {
      turns.push({ role: message.role, content });
    }
  }

  // Drop orphaned assistant turns at the beginning. A conversation must start
  // with a user turn for Gemma.
  while (turns.length && turns[0].role !== "user") turns.shift();
  if (!turns.length) return [];

  // A hard fallback intentionally sends only the latest user request. This is
  // used after a template/parser failure so one malformed history can never
  // make Gina permanently unusable.
  if (hardFallback) {
    const latestUser = [...turns].reverse().find(t => t.role === "user");
    return latestUser ? [{ role: "user", content: latestUser.content.slice(0, 24000) }] : [];
  }

  // Keep only a small number of turns. Current-task text gets priority over old
  // history, which is especially important for pasted CVs and documents.
  while (turns.length > 8) turns.shift();

  // Do not send a separate system role to Gemma. Folding the instruction into
  // the first user turn guarantees that the Jinja template sees only the strict
  // user/assistant alternation it requires across llama.cpp versions.
  if (systemParts.length) {
    turns[0].content = `${systemParts.join("\n\n")}\n\n${turns[0].content}`;
  }

  const safeContext = Math.max(4096, contextSize);
  // Keep a generous margin for tokenizer differences, chat-template tokens and
  // generated output. This is deliberately below the advertised context size.
  // Keep a conservative prompt budget. llama.cpp counts tokens, not characters,
  // and pasted CVs can contain unusually token-dense text. Leave headroom for
  // the model output and template overhead.
  const budgetChars = Math.max(8000, Math.min(18000, Math.floor(safeContext * 1.85)));
  const selected: ChatMessage[] = [];
  let used = 0;

  for (let i = turns.length - 1; i >= 0; i--) {
    const turn = turns[i];
    const allowance = i === turns.length - 1
      ? Math.min(18000, budgetChars - used)
      : Math.min(3500, budgetChars - used);
    if (allowance <= 0) break;
    const content = turn.content.length <= allowance
      ? turn.content
      : `${turn.content.slice(0, Math.max(0, allowance - 120))}\n...[older context clipped]`;
    selected.unshift({ role: turn.role, content });
    used += content.length;
    if (used >= budgetChars) break;
  }

  // If clipping happened to leave an invalid beginning, recover from the newest
  // user request rather than ever sending an invalid role sequence.
  while (selected.length && selected[0].role !== "user") selected.shift();

  // Final invariant: after system folding, every role must alternate and the
  // request must end on user. If anything violates that invariant, fall back to
  // the newest user turn rather than ever handing malformed history to Jinja.
  const valid = selected.length > 0 && selected[selected.length - 1].role === "user" &&
    selected.every((m, i) => m.role === (i % 2 === 0 ? "user" : "assistant"));
  if (!valid) {
    const latestUser = [...turns].reverse().find(t => t.role === "user");
    return latestUser ? [{ role: "user", content: latestUser.content.slice(0, 16000) }] : [];
  }
  return selected;
}

function isRecoverableTemplateError(message: string): boolean {
  const text = String(message || "").toLowerCase();
  return text.includes("conversation roles must alternate") ||
    text.includes("unable to generate parser for this template") ||
    text.includes("automatic parser generation failed") ||
    text.includes("jinja exception");
}

function isContextError(message: string): boolean {
  const text = String(message || "").toLowerCase();
  return text.includes("context size") || text.includes("context length") || text.includes("too many tokens") || text.includes("prompt is too long");
}

export class LocalLlmManager {
  private child: ChildProcessWithoutNullStreams | null = null;
  private ready = false;
  private lastError: string | null = null;
  private startedAt: string | null = null;
  private recentLog: string[] = [];
  private startPromise: Promise<void> | null = null;
  private resolvedMmprojPath: string | null = null;
  private activeChatController: AbortController | null = null;

  readonly config: LocalLlmConfig;

  constructor() {
    const root = process.env.GINA_LLM_ROOT || "C:\\Gina_AI\\models\\llm";
    const toolsRoot = process.env.GINA_LLAMA_ROOT || "C:\\Gina_AI\\tools\\llama.cpp";
    const modelPath = process.env.GINA_LLM_MODEL || path.join(root, "gemma-3-12b-it-Q4_K_M.gguf");
    const executablePath = process.env.GINA_LLM_EXE || path.join(toolsRoot, "llama-server.exe");

    const configuredMmproj = process.env.GINA_LLM_MMPROJ || "";
    const autoMmproj = configuredMmproj || "";

    this.config = {
      executablePath,
      modelPath,
      host: process.env.GINA_LLM_HOST || "127.0.0.1",
      port: envNumber("GINA_LLM_PORT", 8080),
      gpuLayers: envNumber("GINA_LLM_GPU_LAYERS", 28),
      contextSize: envNumber("GINA_LLM_CONTEXT", 8192),
      threads: envNumber("GINA_LLM_THREADS", 6),
      timeoutMs: envNumber("GINA_LLM_TIMEOUT_MS", 300000),
      mmprojPath: autoMmproj || undefined,
    };
  }

  private async resolveMmprojPath(): Promise<string | null> {
    if (this.config.mmprojPath) {
      this.resolvedMmprojPath = await fs.stat(this.config.mmprojPath).then(s => s.isFile() ? this.config.mmprojPath! : null).catch(() => null);
      return this.resolvedMmprojPath;
    }
    const root = path.dirname(this.config.modelPath);
    try {
      const files = await fs.readdir(root);
      const match = files.find(name => /mmproj.*\.gguf$/i.test(name) || /gemma.*mmproj.*\.gguf$/i.test(name));
      this.resolvedMmprojPath = match ? path.join(root, match) : null;
      return this.resolvedMmprojPath;
    } catch {
      return null;
    }
  }

  async getStatus(): Promise<LocalLlmStatus> {
    const configured = await this.isConfigured();
    // Resolve the projector independently of the child process so diagnostics
    // can report the real on-disk multimodal capability even before/restart of
    // llama-server. This also keeps externally started/previously running
    // servers from producing a false "mmproj missing" warning.
    await this.resolveMmprojPath();
    if (this.child && !this.child.killed) {
      this.ready = await this.checkHealth();
    } else {
      this.ready = false;
    }
    return this.status(configured);
  }

  async isConfigured(): Promise<boolean> {
    const [exe, model] = await Promise.all([
      fs.stat(this.config.executablePath).then(s => s.isFile()).catch(() => false),
      fs.stat(this.config.modelPath).then(s => s.isFile()).catch(() => false),
    ]);
    return exe && model;
  }

  async start(): Promise<LocalLlmStatus> {
    if (this.child && !this.child.killed) {
      await this.waitForReady(5000).catch(() => undefined);
      return this.status(await this.isConfigured());
    }

    if (this.startPromise) {
      await this.startPromise;
      return this.status(await this.isConfigured());
    }

    const configured = await this.isConfigured();
    this.resolvedMmprojPath = await this.resolveMmprojPath();
    if (!configured) {
      throw new Error(`Local LLM is not configured. Expected llama-server at ${this.config.executablePath} and model at ${this.config.modelPath}.`);
    }

    this.lastError = null;
    this.ready = false;
    this.recentLog = [];

    this.startPromise = new Promise<void>((resolve, reject) => {
      const args = [
        "--model", this.config.modelPath,
        "--host", this.config.host,
        "--port", String(this.config.port),
        "--n-gpu-layers", String(this.config.gpuLayers),
        "--ctx-size", String(this.config.contextSize),
        "--threads", String(this.config.threads),
      ];
      if (this.resolvedMmprojPath) args.push("--mmproj", this.resolvedMmprojPath);

      const child = spawn(this.config.executablePath, args, {
        cwd: path.dirname(this.config.executablePath),
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env },
      });

      this.child = child;
      this.startedAt = new Date().toISOString();

      const addLog = (chunk: Buffer | string) => {
        const lines = String(chunk).split(/\r?\n/).map(line => line.trim()).filter(Boolean);
        for (const line of lines) this.recentLog.push(line.slice(0, 500));
        if (this.recentLog.length > 40) this.recentLog.splice(0, this.recentLog.length - 40);
      };

      child.stdout.on("data", addLog);
      child.stderr.on("data", addLog);

      child.once("error", (error) => {
        this.lastError = error.message;
        this.ready = false;
        this.child = null;
        reject(error);
      });

      child.once("exit", (code, signal) => {
        addLog(`[llama-server exited] code=${code ?? "null"} signal=${signal ?? "null"}`);
        if (!this.ready && code !== 0 && !this.lastError) {
          this.lastError = `llama-server exited before becoming ready (code ${code ?? "unknown"}).`;
        }
        this.ready = false;
        this.child = null;
      });

      void this.waitForReady(this.config.timeoutMs)
        .then(() => {
          this.ready = true;
          resolve();
        })
        .catch(error => {
          this.lastError = error instanceof Error ? error.message : String(error);
          if (this.child && !this.child.killed) this.child.kill();
          this.child = null;
          reject(error);
        });
    }).finally(() => {
      this.startPromise = null;
    });

    await this.startPromise;
    return this.status(true);
  }

  async stop(): Promise<LocalLlmStatus> {
    if (!this.child || this.child.killed) {
      this.ready = false;
      return this.status(await this.isConfigured());
    }

    const child = this.child;
    this.ready = false;
    child.kill();
    await new Promise<void>(resolve => {
      const timer = setTimeout(resolve, 3000);
      child.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
    });
    this.child = null;
    return this.status(await this.isConfigured());
  }

  async restart(): Promise<LocalLlmStatus> {
    await this.stop();
    return this.start();
  }

  async cancelChat(): Promise<boolean> {
    const controller = this.activeChatController;
    if (!controller) return false;
    controller.abort();
    this.activeChatController = null;
    this.appendDiagnostic("CHAT CANCELLED BY USER — flushing llama.cpp process/VRAM");

    // llama.cpp does not provide a reliable model-unload endpoint across the
    // versions Gina supports. Stopping the managed server is the deterministic
    // way to release its CUDA allocations after a cancelled generation.
    if (this.child && !this.child.killed) {
      const child = this.child;
      this.ready = false;
      child.kill();
      await new Promise<void>(resolve => {
        const timer = setTimeout(resolve, 5000);
        child.once("exit", () => { clearTimeout(timer); resolve(); });
      });
      this.child = null;
    }
    this.appendDiagnostic("CHAT CANCEL COMPLETE — llama.cpp stopped and VRAM released; restart Local AI to continue");
    return true;
  }

  async chat(messages: Array<{ role: "system" | "user" | "assistant"; content: string }>, options?: { temperature?: number; maxTokens?: number }, attachments: ImageAttachment[] = []) {
    const status = await this.getStatus();
    if (!status.ready) throw new Error("Local LLM is not running. Start Gemma first.");

    const requestedMax = Number.isFinite(Number(options?.maxTokens)) ? Number(options?.maxTokens) : 768;
    const maxTokens = Math.min(1024, Math.max(64, Math.round(requestedMax)));

    const request = async (normalized: ChatMessage[], label: string) => {
      if (!normalized.length || normalized[normalized.length - 1].role !== "user") {
        throw new Error("Local LLM conversation could not be normalized into a valid user turn.");
      }
      const requestMessages: any[] = normalized.map(message => ({ ...message }));
      const imageAttachments = attachments.filter(a => a && a.localPath && /^image\//i.test(a.mime));
      if (imageAttachments.length) {
        const mmprojPath = await this.resolveMmprojPath();
        if (!mmprojPath) throw new Error("Image attachment received, but no local multimodal projector (mmproj) is configured. Set GINA_LLM_MMPROJ or place an *mmproj*.gguf beside the Gemma model.");
        const latest = requestMessages[requestMessages.length - 1];
        if (!latest || latest.role !== "user") throw new Error("Image attachments require a user turn.");
        const parts: any[] = [{ type: "text", text: String(latest.content || "") }];
        for (const attachment of imageAttachments.slice(0, 5)) {
          const buffer = await fs.readFile(attachment.localPath);
          const base64 = buffer.toString("base64");
          parts.push({ type: "image_url", image_url: { url: `data:${attachment.mime};base64,${base64}` } });
        }
        latest.content = parts;
      }
      this.appendDiagnostic(`${label}: ${requestMessages.length} turns, latest=${String(normalized[normalized.length - 1].content).length} chars${imageAttachments.length ? `, images=${imageAttachments.length}` : ""}`);
      const controller = new AbortController();
      this.activeChatController = controller;
      const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
      try {
        const response = await fetch(`http://${this.config.host}:${this.config.port}/v1/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: path.basename(this.config.modelPath),
            messages: requestMessages,
            temperature: options?.temperature ?? 0.7,
            max_tokens: maxTokens,
            stream: false,
          }),
          signal: controller.signal,
        });

        const bodyText = await response.text();
        if (!bodyText.trim()) {
          throw new Error(`llama-server returned an empty response (HTTP ${response.status}).`);
        }

        let data: any;
        try {
          data = JSON.parse(bodyText);
        } catch {
          throw new Error(`llama-server returned invalid JSON (HTTP ${response.status}).`);
        }

        if (!response.ok) {
          const detail = data?.error?.message || data?.error || `llama-server returned HTTP ${response.status}`;
          throw new Error(String(detail));
        }
        return data;
      } finally {
        clearTimeout(timeout);
        if (this.activeChatController === controller) this.activeChatController = null;
      }
    };

    const normalized = normalizeChatMessages(messages, this.config.contextSize);
    try {
      const data = await request(normalized, "CHAT");
      this.lastError = null;
      return data;
    } catch (firstError: any) {
      const firstMessage = firstError?.message || String(firstError);
      this.lastError = firstMessage;
      this.appendDiagnostic(`CHAT ERROR: ${firstMessage}`);

      // First recovery: remove all history/system instructions and retry only the
      // current user request. This specifically defeats Gemma role-template errors.
      if (isRecoverableTemplateError(firstMessage)) {
        const fallback = normalizeChatMessages(messages, this.config.contextSize, true);
        try {
          this.appendDiagnostic("RECOVERY: retrying with a single user turn");
          const data = await request(fallback, "RECOVERY");
          this.lastError = null;
          return data;
        } catch (fallbackError: any) {
          const fallbackMessage = fallbackError?.message || String(fallbackError);
          this.lastError = fallbackMessage;
          this.appendDiagnostic(`RECOVERY FAILED: ${fallbackMessage}`);
        }
      }

      // Second recovery: context failures and transient server failures are retried
      // with only the newest user message. The user should never have to manually
      // clear the conversation after a bad turn, 503, or oversized document.
      if (isContextError(firstMessage) || isRecoverableTemplateError(firstMessage) || /HTTP 5\d\d|temporar|server busy|overloaded|empty response/i.test(firstMessage)) {
        const minimal = normalizeChatMessages(messages, this.config.contextSize, true);
        try {
          this.appendDiagnostic("RECOVERY: retrying minimal context");
          const data = await request(minimal, "MINIMAL");
          this.lastError = null;
          return data;
        } catch (minimalError: any) {
          const minimalMessage = minimalError?.message || String(minimalError);
          this.lastError = minimalMessage;
          this.appendDiagnostic(`MINIMAL RECOVERY FAILED: ${minimalMessage}`);
        }
      }

      throw new Error(`${firstMessage} (Gina recovery attempts were also exhausted.)`);
    }
  }

  private appendDiagnostic(message: string) {
    const line = String(message).replace(/\s+/g, " ").trim().slice(0, 500);
    if (!line) return;
    this.recentLog.push(`[chat] ${line}`);
    if (this.recentLog.length > 40) this.recentLog.splice(0, this.recentLog.length - 40);
  }

  private async waitForReady(timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (!this.child || this.child.killed) throw new Error(this.lastError || "llama-server stopped before becoming ready.");
      if (await this.checkHealth()) return;
      await new Promise(resolve => setTimeout(resolve, 350));
    }
    throw new Error(`Timed out waiting for llama-server on http://${this.config.host}:${this.config.port}.`);
  }

  private async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`http://${this.config.host}:${this.config.port}/health`, {
        signal: AbortSignal.timeout(1200),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private status(configured: boolean): LocalLlmStatus {
    return {
      configured,
      running: !!this.child && !this.child.killed,
      ready: this.ready,
      pid: this.child?.pid ?? null,
      port: this.config.port,
      modelPath: this.config.modelPath,
      modelName: path.basename(this.config.modelPath),
      gpuLayers: this.config.gpuLayers,
      contextSize: this.config.contextSize,
      threads: this.config.threads,
      backend: fsSync.existsSync(path.join(path.dirname(this.config.executablePath), "ggml-cuda.dll")) ? "CUDA" : "unknown",
      lastError: this.lastError,
      startedAt: this.startedAt,
      recentLog: [...this.recentLog],
      multimodal: !!this.resolvedMmprojPath,
      mmprojPath: this.resolvedMmprojPath,
    };
  }
}
