import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { parseWorkflow, ParsedWorkflow } from './WorkflowParser.js';

export class WorkflowRegistry {
  private workflows = new Map<string, ParsedWorkflow>();
  private readonly directories: string[];

  constructor(...directories: string[]) {
    this.directories = directories.filter(Boolean);
  }

  async scan() {
    this.workflows.clear();
    for (const dir of this.directories) {
      if (!dir || !fsSync.existsSync(dir)) continue;
      try {
        const files = (await fs.readdir(dir)).filter(f => f.toLowerCase().endsWith('.json'));
        for (const file of files) {
          try {
            const raw = JSON.parse(await fs.readFile(path.join(dir, file), 'utf8'));
            const id = path.basename(file, path.extname(file));
            this.workflows.set(id, parseWorkflow(id, file, raw));
          } catch (error: any) {
            console.warn(`[WorkflowRegistry] Failed to load ${file} in ${dir}: ${error?.message || error}`);
          }
        }
      } catch (err: any) {
        console.warn(`[WorkflowRegistry] Could not read directory ${dir}: ${err?.message || err}`);
      }
    }
    return this.list();
  }

  list() { return [...this.workflows.values()]; }
  get(id: string) { return this.workflows.get(id); }
  async reload() { return this.scan(); }
}
