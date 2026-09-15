import path from 'path';
import { RepairEvidenceStore } from './RepairEvidenceStore';

export interface RepairDiagnostic {
  taskId?: string;
  request: string;
  cycle: number;
  error: string;
  candidateFiles: string[];
}

export interface RepairAttempt {
  taskId?: string;
  request: string;
  cycle: number;
  targetFile: string;
  summary: string;
}

export interface RepairValidation {
  taskId?: string;
  cycle: number;
  passed: boolean;
  summary: string;
}

export interface RepairOrchestrationResult {
  ok: boolean;
  cycles: number;
  reason?: string;
}

/**
 * Phase 52 persistence/guard layer for the autonomous repair loop.
 * It does not perform edits itself; the existing broker/LLM repair path remains
 * responsible for edits. This layer makes every diagnosis, repair, validation,
 * rollback and completion machine-auditable and bounds repeated failures.
 */
export class AutonomousRepairOrchestrator {
  private readonly evidence: RepairEvidenceStore;
  private readonly maxCycles: number;
  private readonly seenFailures = new Map<string, number>();

  constructor(workspaceRoot: string, maxCycles = 3) {
    this.evidence = new RepairEvidenceStore(workspaceRoot);
    this.maxCycles = Math.min(3, Math.max(1, maxCycles));
  }

  async diagnose(input: RepairDiagnostic): Promise<RepairOrchestrationResult> {
    const signature = this.failureSignature(input.error, input.candidateFiles);
    const repeats = (this.seenFailures.get(signature) || 0) + 1;
    this.seenFailures.set(signature, repeats);
    await this.evidence.append({
      id: this.id(), taskId: input.taskId, status: 'running', cycle: input.cycle,
      request: input.request, diagnostic: input.error.slice(0, 8000),
    });
    if (input.cycle > this.maxCycles || repeats > 1) {
      return { ok: false, cycles: input.cycle, reason: repeats > 1 ? 'Repeated identical failure detected; repair loop must stop.' : 'Repair cycle budget exhausted.' };
    }
    return { ok: true, cycles: input.cycle };
  }

  async recordRepair(input: RepairAttempt): Promise<void> {
    const rel = input.targetFile.replaceAll('\\', '/');
    if (path.isAbsolute(rel) || rel.split('/').includes('..')) throw new Error('Unsafe repair evidence target.');
    await this.evidence.append({
      id: this.id(), taskId: input.taskId, status: 'repaired', cycle: input.cycle,
      request: input.request, targetFile: rel, repairSummary: input.summary.slice(0, 4000),
    });
  }

  async recordValidation(input: RepairValidation): Promise<void> {
    await this.evidence.append({
      id: this.id(), taskId: input.taskId, status: input.passed ? 'validated' : 'failed', cycle: input.cycle,
      validation: { passed: input.passed, summary: input.summary.slice(0, 4000) },
    });
  }

  async recordRollback(taskId: string | undefined, cycle: number, summary: string): Promise<void> {
    await this.evidence.append({
      id: this.id(), taskId, status: 'rolled_back', cycle,
      rollback: true, repairSummary: summary.slice(0, 4000),
    });
  }

  async complete(taskId: string | undefined, cycle: number, passed: boolean, summary: string): Promise<void> {
    await this.evidence.append({
      id: this.id(), taskId, status: passed ? 'completed' : 'failed', cycle,
      verification: { passed, summary: summary.slice(0, 4000) },
    });
  }

  async history(taskId?: string) { return this.evidence.list(taskId); }

  private failureSignature(error: string, files: string[]): string {
    return `${error.replace(/\s+/g, ' ').trim().slice(0, 1200)}|${files.map(f => f.replaceAll('\\', '/')).sort().join(',')}`;
  }

  private id(): string { return `repair_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`; }
}
