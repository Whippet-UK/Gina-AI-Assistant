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
  async recall(query:string, limit=12, minScore=3) {
    await this.ensureLoaded();
    const clean = String(query || '').trim().toLowerCase();
    if (!clean) return [];
    const terms = [...new Set(clean.split(/[^a-z0-9_./:-]+/i).filter(term => term.length >= 3))];
    if (!terms.length) return [];

    const scored = this.entries.map(entry => {
      const key = String(entry.key || '').toLowerCase();
      const value = String(entry.value || '').toLowerCase();
      const kind = String(entry.kind || '').toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (key.includes(term)) score += 4;
        if (value.includes(term)) score += 1;
        if (kind.includes(term)) score += 1;
      }
      return { entry, score };
    })
      .filter(item => item.score >= Math.max(1, minScore))
      .sort((a, b) => b.score - a.score || String(b.entry.timestamp).localeCompare(String(a.entry.timestamp)));

    return scored.slice(0, Math.max(1, Math.min(50, limit))).map(item => item.entry);
  }
  async compactForPrompt(limit=20) { return JSON.stringify((await this.list('')).slice(0,limit)); }
}
