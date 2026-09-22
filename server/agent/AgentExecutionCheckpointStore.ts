import fs from "fs/promises";
import fsSync from "fs";
import path from "path";

export interface ExecutionCheckpoint {
  taskId: string;
  prompt: string;
  status: string;
  step: number;
  steps: any[];
  finalSummary?: string;
  updatedAt?: string;
}

export class AgentExecutionCheckpointStore {
  private readonly storeFile: string;
  private memoryCache: Map<string, ExecutionCheckpoint> = new Map();
  private loaded = false;

  constructor(private readonly ginaRoot: string) {
    const dir = path.join(ginaRoot, ".gina", "agent");
    this.storeFile = path.join(dir, "checkpoints.jsonl");
  }

  private async ensureLoaded() {
    if (this.loaded) return;
    this.loaded = true;
    try {
      if (fsSync.existsSync(this.storeFile)) {
        const raw = await fs.readFile(this.storeFile, "utf-8");
        const lines = raw.split("\n").filter(l => l.trim().length > 0);
        for (const line of lines) {
          try {
            const data: ExecutionCheckpoint = JSON.parse(line);
            if (data?.taskId) {
              this.memoryCache.set(data.taskId, data);
            }
          } catch {}
        }
      }
    } catch {}
  }

  private async persistAll() {
    try {
      const dir = path.dirname(this.storeFile);
      if (!fsSync.existsSync(dir)) {
        await fs.mkdir(dir, { recursive: true });
      }
      const lines = Array.from(this.memoryCache.values()).map(v => JSON.stringify(v));
      await fs.writeFile(this.storeFile, lines.join("\n") + (lines.length ? "\n" : ""), "utf-8");
    } catch (err) {
      console.error("[AgentExecutionCheckpointStore] Failed to persist checkpoints:", err);
    }
  }

  async save(checkpoint: ExecutionCheckpoint): Promise<ExecutionCheckpoint> {
    await this.ensureLoaded();
    const entry: ExecutionCheckpoint = {
      ...checkpoint,
      updatedAt: new Date().toISOString()
    };
    this.memoryCache.set(entry.taskId, entry);
    await this.persistAll();
    return entry;
  }

  async get(taskId: string): Promise<ExecutionCheckpoint | null> {
    await this.ensureLoaded();
    return this.memoryCache.get(taskId) || null;
  }

  async list(limit = 50): Promise<ExecutionCheckpoint[]> {
    await this.ensureLoaded();
    return Array.from(this.memoryCache.values())
      .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
      .slice(0, limit);
  }

  async clear(taskId: string): Promise<void> {
    await this.ensureLoaded();
    if (this.memoryCache.delete(taskId)) {
      await this.persistAll();
    }
  }
}
