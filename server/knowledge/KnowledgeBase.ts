import fs from "fs/promises";
import fsSync from "fs";
import path from "path";

export interface KnowledgeEntry {
  id: string;
  kind: 'solution' | 'rule' | 'fact' | 'pattern' | 'lesson';
  title: string;
  content: string;
  keywords: string[];
  source: string;
  confidence: 'high' | 'medium' | 'low';
  verified: boolean;
  archived?: boolean;
  usageCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export class KnowledgeBase {
  private readonly storeFile: string;
  private entries: Map<string, KnowledgeEntry> = new Map();
  private loaded = false;

  constructor(private readonly ginaRoot: string) {
    const dir = path.join(ginaRoot, ".gina", "knowledge");
    this.storeFile = path.join(dir, "knowledge.jsonl");
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
            const entry: KnowledgeEntry = JSON.parse(line);
            if (entry?.id) {
              this.entries.set(entry.id, entry);
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
      const lines = Array.from(this.entries.values()).map(e => JSON.stringify(e));
      await fs.writeFile(this.storeFile, lines.join("\n") + (lines.length ? "\n" : ""), "utf-8");
    } catch (err) {
      console.error("[KnowledgeBase] Failed to persist knowledge:", err);
    }
  }

  async stats() {
    await this.ensureLoaded();
    const all = Array.from(this.entries.values());
    const active = all.filter(e => !e.archived);
    return {
      total: all.length,
      active: active.length,
      archived: all.length - active.length,
      solutions: active.filter(e => e.kind === 'solution').length,
      verified: active.filter(e => e.verified).length
    };
  }

  async list(query = '', limit = 100): Promise<KnowledgeEntry[]> {
    await this.ensureLoaded();
    const cleanQuery = query.toLowerCase().trim();
    return Array.from(this.entries.values())
      .filter(e => {
        if (!cleanQuery) return true;
        return (
          e.title.toLowerCase().includes(cleanQuery) ||
          e.content.toLowerCase().includes(cleanQuery) ||
          e.keywords.some(k => k.toLowerCase().includes(cleanQuery))
        );
      })
      .slice(0, limit);
  }

  async search(query: string, limit = 8): Promise<Array<{ entry: KnowledgeEntry; score: number }>> {
    await this.ensureLoaded();
    const clean = query.toLowerCase().trim();
    if (!clean) return [];
    const terms = clean.split(/\s+/).filter(t => t.length > 2);

    const matches = Array.from(this.entries.values())
      .filter(e => !e.archived)
      .map(entry => {
        let score = 0;
        const titleLower = entry.title.toLowerCase();
        const contentLower = entry.content.toLowerCase();
        for (const term of terms) {
          if (titleLower.includes(term)) score += 3;
          if (contentLower.includes(term)) score += 1;
          if (entry.keywords.some(k => k.toLowerCase().includes(term))) score += 2;
        }
        return { entry, score };
      })
      .filter(m => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return matches;
  }

  async upsert(data: Partial<KnowledgeEntry> & { title: string; content: string }): Promise<KnowledgeEntry> {
    await this.ensureLoaded();
    const id = data.id || `kn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const existing = this.entries.get(id);

    const entry: KnowledgeEntry = {
      id,
      kind: data.kind || existing?.kind || 'lesson',
      title: data.title,
      content: data.content,
      keywords: data.keywords || existing?.keywords || [],
      source: data.source || existing?.source || 'user',
      confidence: data.confidence || existing?.confidence || 'high',
      verified: data.verified !== undefined ? data.verified : true,
      archived: data.archived !== undefined ? data.archived : false,
      usageCount: existing?.usageCount || 0,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.entries.set(id, entry);
    await this.persistAll();
    return entry;
  }

  async learnLesson(data: {
    title: string;
    content: string;
    source?: string;
    keywords?: string[];
    confidence?: 'high' | 'medium' | 'low';
    verified?: boolean;
  }): Promise<KnowledgeEntry> {
    return this.upsert({
      ...data,
      kind: 'lesson',
      source: data.source || 'user',
      confidence: data.confidence || 'high',
      verified: data.verified !== false
    });
  }

  async archive(id: string): Promise<KnowledgeEntry | null> {
    await this.ensureLoaded();
    const entry = this.entries.get(id);
    if (!entry) return null;
    entry.archived = true;
    entry.updatedAt = new Date().toISOString();
    await this.persistAll();
    return entry;
  }

  async promptContext(query: string, maxChars = 2400): Promise<string> {
    const hits = await this.search(query, 5);
    if (!hits.length) return '';

    let accumulated = '### RELEVANT LEARNED KNOWLEDGE:\n';
    for (const hit of hits) {
      const entry = hit.entry;
      const snippet = `- [${entry.kind.toUpperCase()}] ${entry.title}: ${entry.content.trim()}\n`;
      if ((accumulated + snippet).length > maxChars) break;
      accumulated += snippet;
      entry.usageCount = (entry.usageCount || 0) + 1;
    }
    return accumulated.trim();
  }

  async learnFromAgentRun(data: {
    prompt: string;
    summary: string;
    actions: string[];
    success: boolean;
    source: string;
  }): Promise<KnowledgeEntry | null> {
    if (!data.success || !data.summary) return null;
    const title = `Solution for: ${data.prompt.slice(0, 80)}`;
    const content = `Problem: ${data.prompt}\nResolution: ${data.summary}\nActions taken: ${data.actions.join(', ')}`;
    return this.upsert({
      kind: 'solution',
      title,
      content,
      source: data.source,
      keywords: data.actions,
      confidence: 'high',
      verified: true
    });
  }
}
