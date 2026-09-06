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
      try { (this.socket as any).binaryType = 'arraybuffer'; } catch {}
    } catch (error) {
      this.emit('comfy_error', error);
      this.scheduleReconnect();
      return;
    }
    this.socket.addEventListener('open', () => {
      this.connected = true;
      try { (this.socket as any).binaryType = 'arraybuffer'; } catch {}
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
    this.socket.addEventListener('message', (event) => {
      const data = event.data;
      if (typeof data === 'string') {
        this.handleMessage(data);
      } else {
        this.handleBinaryMessage(data);
      }
    });
  }

  private scheduleReconnect() { if (!this.reconnectTimer) this.reconnectTimer = setTimeout(() => { this.reconnectTimer = undefined; this.connect(); }, 2000); }

  private async handleBinaryMessage(data: any) {
    try {
      let buffer: Buffer | null = null;
      if (typeof Blob !== 'undefined' && data instanceof Blob) {
        const arrayBuf = await data.arrayBuffer();
        buffer = Buffer.from(arrayBuf);
      } else if (Buffer.isBuffer(data)) {
        buffer = data;
      } else if (data instanceof ArrayBuffer) {
        buffer = Buffer.from(data);
      } else if (ArrayBuffer.isView(data)) {
        buffer = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
      }

      if (!buffer || buffer.length < 8) return;

      // Locate image magic headers (JPEG: FF D8 FF, PNG: 89 50 4E 47)
      let imageBytes: Buffer | null = null;
      let mime = 'image/jpeg';

      const jpegIndex = buffer.indexOf(Buffer.from([0xff, 0xd8, 0xff]));
      const pngIndex = buffer.indexOf(Buffer.from([0x89, 0x50, 0x4e, 0x47]));

      if (pngIndex !== -1 && (jpegIndex === -1 || pngIndex < jpegIndex)) {
        imageBytes = buffer.subarray(pngIndex);
        mime = 'image/png';
      } else if (jpegIndex !== -1) {
        imageBytes = buffer.subarray(jpegIndex);
        mime = 'image/jpeg';
      } else if (buffer.length > 8) {
        // Fallback to offset 8 if standard header was sent without identifiable magic
        const eventType = buffer.readUInt32BE(0);
        const imageType = buffer.readUInt32BE(4);
        if (eventType === 1 || eventType === 2) {
          imageBytes = buffer.subarray(8);
          mime = imageType === 2 ? 'image/png' : 'image/jpeg';
        }
      }

      if (imageBytes && imageBytes.length > 0) {
        const base64 = imageBytes.toString('base64');
        const previewDataUrl = `data:${mime};base64,${base64}`;

        // Find the active running or queued job
        const runningJob = this.jobs.list().find(j => j.status === 'RUNNING' || j.status === 'QUEUED') || this.jobs.list()[0];
        if (runningJob) {
          this.jobs.update(runningJob.id, { preview: previewDataUrl, status: 'RUNNING' });
          this.jobs.event(runningJob.id, 'preview', {
            preview: previewDataUrl,
            step: runningJob.currentStep,
            totalSteps: runningJob.totalSteps
          });
        }
      }
    } catch (err) {
      // Non-critical; ignore corrupted intermediate preview frame
    }
  }

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
