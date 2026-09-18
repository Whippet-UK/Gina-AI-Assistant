import fs from "fs/promises";
import fsSync from "fs";
import path from "path";

export interface TemporalFact {
  id: string;
  subject: string;
  predicate: string;
  value: string;
  sourceAuthority: string;
  observedAt: string;
  valid: boolean;
  supersededBy?: string;
}

export class TemporalFactStore {
  private readonly storeFile: string;
  private facts: Map<string, TemporalFact> = new Map();
  private loaded = false;

  constructor(private readonly ginaRoot: string) {
    const dir = path.join(ginaRoot, ".gina", "knowledge");
    this.storeFile = path.join(dir, "facts.jsonl");
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
            const fact: TemporalFact = JSON.parse(line);
            if (fact?.id) {
              this.facts.set(fact.id, fact);
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
      const lines = Array.from(this.facts.values()).map(f => JSON.stringify(f));
      await fs.writeFile(this.storeFile, lines.join("\n") + (lines.length ? "\n" : ""), "utf-8");
    } catch (err) {
      console.error("[TemporalFactStore] Failed to persist facts:", err);
    }
  }

  async stats() {
    await this.ensureLoaded();
    const all = Array.from(this.facts.values());
    const valid = all.filter(f => f.valid);
    return {
      total: all.length,
      valid: valid.length,
      superseded: all.length - valid.length
    };
  }

  async search(query: string, limit = 8): Promise<TemporalFact[]> {
    await this.ensureLoaded();
    const clean = query.toLowerCase().trim();
    if (!clean) return [];
    const terms = clean.split(/\s+/).filter(t => t.length > 2);

    return Array.from(this.facts.values())
      .filter(f => f.valid)
      .filter(f => {
        const text = `${f.subject} ${f.predicate} ${f.value}`.toLowerCase();
        return terms.some(t => text.includes(t));
      })
      .slice(0, limit);
  }

  async recordFact(subject: string, predicate: string, value: string, sourceAuthority: string): Promise<TemporalFact> {
    await this.ensureLoaded();
    const cleanSub = subject.trim();
    const cleanPred = predicate.trim();
    const cleanVal = value.trim();

    // Mark previous matching facts as superseded
    const newId = `fact_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    for (const existing of this.facts.values()) {
      if (
        existing.valid &&
        existing.subject.toLowerCase() === cleanSub.toLowerCase() &&
        existing.predicate.toLowerCase() === cleanPred.toLowerCase()
      ) {
        existing.valid = false;
        existing.supersededBy = newId;
      }
    }

    const newFact: TemporalFact = {
      id: newId,
      subject: cleanSub,
      predicate: cleanPred,
      value: cleanVal,
      sourceAuthority: sourceAuthority || 'web',
      observedAt: new Date().toISOString(),
      valid: true
    };

    this.facts.set(newId, newFact);
    await this.persistAll();
    return newFact;
  }

  async extractAndStore(
    query: string,
    pages: Array<{ url: string; title?: string; content?: string }>,
    results: Array<{ url: string; snippet: string }>
  ): Promise<TemporalFact[]> {
    const extracted: TemporalFact[] = [];
    const combinedTexts: Array<{ text: string; source: string }> = [
      ...pages.map(p => ({ text: `${p.title || ''} ${p.content || ''}`, source: p.url })),
      ...results.map(r => ({ text: r.snippet, source: r.url }))
    ];

    // Extraction patterns for high-frequency volatile political and leadership offices
    const patterns = [
      {
        regex: /(?:current\s+)?Prime Minister of (?:the\s+)?(UK|United Kingdom|Britain|Canada|Australia|Japan|India|France)\s+is\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
        subject: (m: RegExpMatchArray) => `Prime Minister of ${m[1]}`,
        predicate: 'current_officeholder',
        value: (m: RegExpMatchArray) => m[2].trim()
      },
      {
        regex: /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+(?:is|became|serves as|elected as)\s+(?:the\s+)?(?:current\s+)?Prime Minister of (?:the\s+)?(UK|United Kingdom|Britain|Canada|Australia|Japan|India)/i,
        subject: (m: RegExpMatchArray) => `Prime Minister of ${m[2]}`,
        predicate: 'current_officeholder',
        value: (m: RegExpMatchArray) => m[1].trim()
      },
      {
        regex: /(?:current\s+)?President of (?:the\s+)?(United States|US|USA|France|Ukraine|Russia)\s+is\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
        subject: (m: RegExpMatchArray) => `President of ${m[1]}`,
        predicate: 'current_officeholder',
        value: (m: RegExpMatchArray) => m[2].trim()
      },
      {
        regex: /(?:CEO of|chief executive of)\s+([A-Z][a-z0-9]+)\s+is\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
        subject: (m: RegExpMatchArray) => `CEO of ${m[1]}`,
        predicate: 'current_ceo',
        value: (m: RegExpMatchArray) => m[2].trim()
      }
    ];

    for (const item of combinedTexts) {
      if (!item.text) continue;
      for (const pat of patterns) {
        const match = item.text.match(pat.regex);
        if (match) {
          const sub = pat.subject(match);
          const pred = pat.predicate;
          const val = pat.value(match);

          // Avoid duplicate extractions in same run
          const already = extracted.find(f => f.subject === sub && f.value === val);
          if (!already) {
            let hostname = 'web';
            try { hostname = new URL(item.source).hostname; } catch {}
            const fact = await this.recordFact(sub, pred, val, hostname);
            extracted.push(fact);
          }
        }
      }
    }

    return extracted;
  }
}
