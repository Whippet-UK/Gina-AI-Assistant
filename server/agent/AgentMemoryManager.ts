import fs from 'fs/promises';
import path from 'path';

export interface AgentMemoryEntry { id: string; timestamp: string; kind: 'fact'|'preference'|'decision'|'task'|'result'; key: string; value: string; source?: string; }

export class AgentMemoryManager {
  private readonly filePath: string;
  private entries: AgentMemoryEntry[] = [];
  private loaded = false;
  constructor(root: string) { this.filePath = path.join(root, '.gina', 'agent-memory.json'); }
  private async ensureLoaded() { if (this.loaded) return; try { const parsed = JSON.parse(await fs.readFile(this.filePath, 'utf8')); this.entries = Array.isArray(parsed?.entries) ? parsed.entries : []; } catch { this.entries = []; } this.loaded = true; }
  private async persist() { await fs.mkdir(path.dirname(this.filePath), { recursive: true }); await fs.writeFile(this.filePath, JSON.stringify({ version: 1, entries: this.entries.slice(0,500) }, null, 2), 'utf8'); }
  async list(query = '') { await this.ensureLoaded(); const q=query.trim().toLowerCase(); return this.entries.filter(e => !q || `${e.kind} ${e.key} ${e.value}`.toLowerCase().includes(q)).slice(0,100); }
  async remember(input: Omit<AgentMemoryEntry,'id'|'timestamp'>) { await this.ensureLoaded(); const entry:AgentMemoryEntry={...input,id:`mem_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,timestamp:new Date().toISOString()}; this.entries.unshift(entry); this.entries=this.entries.slice(0,500); await this.persist(); return entry; }
  async recall(query:string, limit=12) { return (await this.list(query)).slice(0,Math.max(1,Math.min(50,limit))); }
  async compactForPrompt(limit=20) { return JSON.stringify((await this.list('')).slice(0,limit)); }
}
