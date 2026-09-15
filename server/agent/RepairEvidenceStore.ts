import fs from 'fs/promises';
import path from 'path';

export type RepairEvidenceStatus = 'running' | 'repaired' | 'validated' | 'failed' | 'rolled_back' | 'completed';

export interface RepairEvidenceRecord {
  id: string;
  taskId?: string;
  status: RepairEvidenceStatus;
  cycle: number;
  timestamp: string;
  request?: string;
  diagnostic?: string;
  targetFile?: string;
  repairSummary?: string;
  validation?: { passed: boolean; summary?: string };
  verification?: { passed: boolean; summary?: string };
  rollback?: boolean;
}

export class RepairEvidenceStore {
  private readonly filePath: string;
  private writeChain: Promise<void> = Promise.resolve();

  constructor(workspaceRoot: string) {
    this.filePath = path.join(workspaceRoot, '.gina', 'agent', 'repair-history.jsonl');
  }

  async append(record: Omit<RepairEvidenceRecord, 'timestamp'> & { timestamp?: string }): Promise<RepairEvidenceRecord> {
    const normalized: RepairEvidenceRecord = {
      ...record,
      timestamp: record.timestamp || new Date().toISOString(),
    };
    await this.enqueue(async () => {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      const line = JSON.stringify(normalized) + '\n';
      const temp = `${this.filePath}.${process.pid}.tmp`;
      let existing = '';
      try { existing = await fs.readFile(this.filePath, 'utf8'); } catch { /* first write */ }
      await fs.writeFile(temp, existing + line, 'utf8');
      await fs.rename(temp, this.filePath);
    });
    return normalized;
  }

  async list(taskId?: string): Promise<RepairEvidenceRecord[]> {
    try {
      const text = await fs.readFile(this.filePath, 'utf8');
      const records = text.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line) as RepairEvidenceRecord);
      return taskId ? records.filter(record => record.taskId === taskId) : records;
    } catch {
      return [];
    }
  }

  async latest(taskId: string): Promise<RepairEvidenceRecord | undefined> {
    const records = await this.list(taskId);
    return records.at(-1);
  }

  private enqueue(operation: () => Promise<void>): Promise<void> {
    this.writeChain = this.writeChain.then(operation, operation);
    return this.writeChain;
  }
}
