import fs from 'fs/promises';
import path from 'path';

export type AgentRunState = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface AgentRunEvent {
  id: number;
  type: string;
  timestamp: string;
  data: any;
}

export interface AgentRunRecord {
  id: string;
  prompt: string;
  createdAt: string;
  updatedAt: string;
  state: AgentRunState;
  summary?: string;
  error?: string;
  result?: any;
  events: AgentRunEvent[];
}

type Listener = (event: AgentRunEvent) => void;

export class AgentRunManager {
  private readonly runs = new Map<string, AgentRunRecord>();
  private readonly listeners = new Map<string, Set<Listener>>();
  private readonly cancelled = new Set<string>();

  constructor(private readonly root: string) {}

  get runRoot() { return path.join(this.root, '.gina', 'agent-runs'); }

  async ensure() { await fs.mkdir(this.runRoot, { recursive: true }); }

  private file(id: string) {
    const safe = String(id).replace(/[^a-zA-Z0-9_-]/g, '');
    return path.join(this.runRoot, `${safe}.json`);
  }

  async create(prompt: string): Promise<AgentRunRecord> {
    await this.ensure();
    const id = `agent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const run: AgentRunRecord = { id, prompt: String(prompt).slice(0, 5000), createdAt: now, updatedAt: now, state: 'QUEUED', events: [] };
    this.runs.set(id, run);
    await this.persist(run);
    return run;
  }

  async load(id: string): Promise<AgentRunRecord | null> {
    const cached = this.runs.get(id);
    if (cached) return cached;
    try {
      const raw = await fs.readFile(this.file(id), 'utf8');
      const run = JSON.parse(raw) as AgentRunRecord;
      if (!run || run.id !== id || !Array.isArray(run.events)) return null;
      this.runs.set(id, run);
      return run;
    } catch { return null; }
  }

  async list(limit = 20): Promise<AgentRunRecord[]> {
    await this.ensure();
    const entries = await fs.readdir(this.runRoot, { withFileTypes: true });
    const files = entries.filter(e => e.isFile() && e.name.endsWith('.json')).map(e => e.name);
    const runs: AgentRunRecord[] = [];
    for (const file of files.slice(-Math.max(1, Math.min(100, limit)))) {
      const run = await this.load(file.slice(0, -5));
      if (run) runs.push(run);
    }
    return runs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  }

  private async persist(run: AgentRunRecord) {
    run.updatedAt = new Date().toISOString();
    const temp = `${this.file(run.id)}.tmp`;
    await fs.writeFile(temp, JSON.stringify(run, null, 2), 'utf8');
    await fs.rename(temp, this.file(run.id));
  }

  async event(id: string, type: string, data: any) {
    const run = await this.load(id);
    if (!run) throw new Error(`Agent run not found: ${id}`);
    const nextId = run.events.length ? run.events[run.events.length - 1].id + 1 : 1;
    const event: AgentRunEvent = { id: nextId, type, timestamp: new Date().toISOString(), data };
    run.events.push(event);
    if (run.events.length > 500) run.events.splice(0, run.events.length - 500);
    await this.persist(run);
    for (const listener of this.listeners.get(id) || []) {
      try { listener(event); } catch { /* disconnected client */ }
    }
    return event;
  }

  async state(id: string, state: AgentRunState, extra: { summary?: string; error?: string; result?: any } = {}) {
    const run = await this.load(id);
    if (!run) throw new Error(`Agent run not found: ${id}`);
    run.state = state;
    if (extra.summary !== undefined) run.summary = extra.summary;
    if (extra.error !== undefined) run.error = extra.error;
    if (extra.result !== undefined) run.result = extra.result;
    await this.persist(run);
    await this.event(id, 'state', { state, summary: run.summary, error: run.error });
    return run;
  }

  subscribe(id: string, listener: Listener) {
    let set = this.listeners.get(id);
    if (!set) { set = new Set(); this.listeners.set(id, set); }
    set.add(listener);
    return () => {
      set?.delete(listener);
      if (set && set.size === 0) this.listeners.delete(id);
    };
  }

  cancel(id: string) {
    this.cancelled.add(id);
    return true;
  }

  isCancelled(id: string) { return this.cancelled.has(id); }

  clearCancel(id: string) { this.cancelled.delete(id); }
}
