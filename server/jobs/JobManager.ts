import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';

export type JobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface GinaJob {
  id: string;
  promptId?: string;
  workflowId: string;
  status: JobStatus;
  progress: number;
  currentNodeId?: string | null;
  currentNodeClass?: string;
  currentStep?: number;
  totalSteps?: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  outputs: any[];
  parameters: Record<string, any>;
}

export class JobManager extends EventEmitter {
  private jobs = new Map<string, GinaJob>();
  create(workflowId: string, parameters: Record<string, any>) {
    const job: GinaJob = { id: randomUUID(), workflowId, status: 'QUEUED', progress: 0, createdAt: new Date().toISOString(), outputs: [], parameters };
    this.jobs.set(job.id, job); this.emit('job', job); return job;
  }
  get(id: string) { return this.jobs.get(id); }
  list() { return [...this.jobs.values()].sort((a,b) => b.createdAt.localeCompare(a.createdAt)); }
  update(id: string, patch: Partial<GinaJob>) { const job = this.jobs.get(id); if (!job) return; Object.assign(job, patch); this.emit('job', job); return job; }
  event(id: string, event: string, payload: any = {}) { const job = this.jobs.get(id); if (!job) return; this.emit('event', { job, event, payload }); }
  findByPromptId(promptId: string) { return [...this.jobs.values()].find(j => j.promptId === promptId); }
}
