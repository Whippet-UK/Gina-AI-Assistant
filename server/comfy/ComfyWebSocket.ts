import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { JobManager } from '../jobs/JobManager.js';

export class ComfyWebSocket extends EventEmitter {
  readonly clientId = `gina-${randomUUID()}`;
  private socket?: WebSocket;
  private reconnectTimer?: NodeJS.Timeout;
  private connected = false;

  constructor(private readonly comfyUrl: string, private readonly jobs: JobManager) { super(); }

  start() { this.connect(); }
  stop() { if (this.reconnectTimer) clearTimeout(this.reconnectTimer); this.socket?.close(); }

  private connect() {
    const base = this.comfyUrl.replace(/^http/, 'ws').replace(/\/$/, '');
    const url = `${base}/ws?clientId=${encodeURIComponent(this.clientId)}`;
    try {
      this.socket = new WebSocket(url);
    } catch (error) {
      this.emit('comfy_error', error);
      this.scheduleReconnect();
      return;
    }
    this.socket.addEventListener('open', () => {
      this.connected = true;
      this.emit('status', { connected: true, clientId: this.clientId });
    });
    this.socket.addEventListener('close', () => {
      this.connected = false;
      this.emit('status', { connected: false, clientId: this.clientId });
      this.scheduleReconnect();
    });
    this.socket.addEventListener('error', (event) => {
      this.emit('comfy_error', event);
    });
    this.socket.addEventListener('message', (event) => this.handleMessage(String(event.data)));
  }

  private scheduleReconnect() { if (!this.reconnectTimer) this.reconnectTimer = setTimeout(() => { this.reconnectTimer = undefined; this.connect(); }, 2000); }

  private handleMessage(raw: string) {
    let message: any;
    try { message = JSON.parse(raw); } catch { return; }
    const type = message.type;
    const payload = message.data || {};
    const promptId = payload.prompt_id;
    const job = promptId ? this.jobs.findByPromptId(promptId) : undefined;
    if (!job) return;

    if (type === 'execution_start') {
      this.jobs.update(job.id, { status: 'RUNNING', startedAt: job.startedAt || new Date().toISOString() });
      this.jobs.event(job.id, 'execution_start', payload);
    } else if (type === 'progress') {
      const total = Number(payload.max || 0), value = Number(payload.value || 0);
      this.jobs.update(job.id, { status: 'RUNNING', progress: total > 0 ? Math.round((value / total) * 100) : job.progress, currentStep: value, totalSteps: total });
      this.jobs.event(job.id, 'progress', payload);
    } else if (type === 'executing') {
      const nodeId = payload.node;
      if (nodeId === null) {
        this.jobs.update(job.id, { status: 'COMPLETED', progress: 100, currentNodeId: null, completedAt: new Date().toISOString() });
        this.jobs.event(job.id, 'execution_complete', payload);
        if (job.workflowId === 'gif_studio') {
          this.jobs.event(job.id, 'context_repool_armed', { workflowId: job.parameters?.__restoreWorkflowId || null, model: job.parameters?.__restoreModel || null });
        }
      } else {
        const nodeClass = job.parameters?.__nodeClasses?.[nodeId];
        this.jobs.update(job.id, { status: 'RUNNING', currentNodeId: nodeId, currentNodeClass: nodeClass });
        this.jobs.event(job.id, 'node_executing', payload);
        if (nodeClass === 'SaveImage' || nodeClass === 'VHS_VideoCombine' || nodeClass === 'VHS_VideoSave' || nodeClass === 'SaveAnimatedWEBP' || nodeClass?.toLowerCase().includes('save')) {
          this.jobs.event(job.id, 'output_node_executing', { ...payload, nodeClass });
        }
      }
    } else if (type === 'executed') {
      this.jobs.event(job.id, 'node_executed', payload);
    } else if (type === 'execution_error') {
      const error = payload.exception_message || payload.exception_type || 'ComfyUI execution error';
      this.jobs.update(job.id, { status: 'FAILED', error, completedAt: new Date().toISOString() });
      this.jobs.event(job.id, 'execution_error', payload);
      this.emit('execution_error', { job, payload });
    }
  }

  isConnected() { return this.connected; }
}
