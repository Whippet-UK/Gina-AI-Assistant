import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

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

export interface QueuedJobRequest {
  id: string;
  workflowId: string;
  parameters: Record<string, any>;
  resolve: (job: GinaJob | null) => void;
  reject: (err: any) => void;
  queuedAt: number;
}

interface GenerationJobContextValue {
  job: GinaJob | null;
  output: { job?: GinaJob; outputs: any[] } | null;
  outputLoading: boolean;
  submitting: boolean;
  isCooldownActive: boolean;
  cooldownRemainingSec: number;
  queuedRequestsCount: number;
  triggerCooldownBreath: (reason?: string, durationMs?: number) => void;
  startJob: (workflowId: string, parameters: Record<string, any>) => Promise<GinaJob | null>;
  cancelJob: () => Promise<void>;
  adoptJob: (jobId: string) => Promise<GinaJob | null>;
  refreshJob: () => Promise<void>;
  clearCurrentOutput: () => void;
}

const GenerationJobContext = createContext<GenerationJobContextValue | undefined>(undefined);

const withCacheBust = (url: string, jobId: string) =>
  `${url}${url.includes('?') ? '&' : '?'}gina_job=${encodeURIComponent(jobId)}`;

export const GenerationJobProvider: React.FC<{
  children: React.ReactNode;
  onAddLog?: (level: 'INFO'|'WARN'|'SEC'|'RULE', message: string, ruleId?: string) => void;
  isCooldownActive?: boolean;
  cooldownRemainingSec?: number;
  onTriggerCooldown?: (reason?: string, durationMs?: number) => void;
}> = ({
  children,
  onAddLog,
  isCooldownActive: externalCooldownActive,
  cooldownRemainingSec: externalCooldownRemainingSec,
  onTriggerCooldown
}) => {
  const [job, setJob] = useState<GinaJob | null>(null);
  const [output, setOutput] = useState<{ job?: GinaJob; outputs: any[] } | null>(null);
  const [outputLoading, setOutputLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const activeJobIdRef = useRef<string | null>(null);
  const outputLoadingJobRef = useRef<string | null>(null);
  const outputResolvedJobRef = useRef<string | null>(null);
  const onAddLogRef = useRef(onAddLog);
  onAddLogRef.current = onAddLog;

  // Internal cooldown state if not controlled externally
  const [internalCooldownActive, setInternalCooldownActive] = useState(false);
  const [internalCooldownRemaining, setInternalCooldownRemaining] = useState(0);
  const cooldownTimerRef = useRef<any>(null);
  const requestQueueRef = useRef<QueuedJobRequest[]>([]);
  const [queuedRequestsCount, setQueuedRequestsCount] = useState(0);

  const isCooldownActive = externalCooldownActive !== undefined ? externalCooldownActive : internalCooldownActive;
  const cooldownRemainingSec = externalCooldownRemainingSec !== undefined ? externalCooldownRemainingSec : internalCooldownRemaining;

  const triggerCooldownBreath = useCallback((reason = 'VRAM OOM Stabilization Cooldown', durationMs = 5000) => {
    if (onTriggerCooldown) {
      onTriggerCooldown(reason, durationMs);
      return;
    }
    setInternalCooldownActive(true);
    setInternalCooldownRemaining(Math.ceil(durationMs / 1000));
    onAddLogRef.current?.('RULE', `Rule 011-020 [VRAMGuard Breath]: ${reason}. Initiating 5-second automatic cooldown. Incoming generation requests queued for GPU stabilization.`, '011-020');

    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    const startMs = Date.now();
    const endMs = startMs + durationMs;

    cooldownTimerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endMs - Date.now()) / 1000));
      setInternalCooldownRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
        setInternalCooldownActive(false);
        onAddLogRef.current?.('SEC', 'VRAMGuard Cooldown Complete: GPU VRAM stabilized. Releasing queued generation jobs.');
      }
    }, 500);
  }, [onTriggerCooldown]);

  const loadOutput = useCallback(async (jobId: string) => {
    if (outputResolvedJobRef.current === jobId || outputLoadingJobRef.current === jobId) return;
    outputLoadingJobRef.current = jobId;
    setOutputLoading(true);
    for (let attempt = 0; attempt < 15; attempt += 1) {
      if (activeJobIdRef.current !== jobId) return;
      try {
        const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/output?attempt=${attempt + 1}&_=${Date.now()}`, { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          if (data.outputs?.length && activeJobIdRef.current === jobId) {
            const freshOutputs = data.outputs.map((item: any) => ({ ...item, url: withCacheBust(item.url, jobId) }));
            setOutput({ ...data, outputs: freshOutputs });
            if (data.job) setJob(data.job);
            outputResolvedJobRef.current = jobId;
            outputLoadingJobRef.current = null;
            setOutputLoading(false);
            return;
          }
        }
      } catch {
        // Keep polling; ComfyUI may expose history a moment after execution completes.
      }
      await new Promise(resolve => setTimeout(resolve, 350));
    }
    if (activeJobIdRef.current === jobId) setOutputLoading(false);
    if (outputLoadingJobRef.current === jobId) outputLoadingJobRef.current = null;
  }, []);

  const attachToJob = useCallback((jobId: string) => {
    activeJobIdRef.current = jobId;
  }, []);

  // The event listener lives above the navigation tabs. Changing screens therefore
  // cannot unsubscribe from a running ComfyUI job.
  useEffect(() => {
    if (!job?.id) return;
    const jobId = job.id;
    attachToJob(jobId);
    const source = new EventSource(`/api/jobs/${encodeURIComponent(jobId)}/events`);

    source.addEventListener('job', (event) => {
      if (activeJobIdRef.current !== jobId) return;
      const next = JSON.parse((event as MessageEvent).data) as GinaJob;
      setJob(next);
      if (next.status === 'COMPLETED') {
        if (outputResolvedJobRef.current !== jobId) loadOutput(jobId);
        onAddLogRef.current?.('INFO', `Local ComfyUI job ${jobId.slice(0, 8)} completed. Finalising output...`);
      } else if (next.status === 'FAILED') {
        setOutputLoading(false);
        onAddLogRef.current?.('WARN', `Local ComfyUI job failed: ${next.error || 'unknown error'}`);
      }
    });

    source.addEventListener('progress', (event) => {
      if (activeJobIdRef.current !== jobId) return;
      const data = JSON.parse((event as MessageEvent).data);
      setJob(prev => prev && prev.id === jobId ? {
        ...prev,
        status: 'RUNNING',
        progress: data.max ? Math.min(100, Math.round((data.value / data.max) * 100)) : prev.progress,
        currentStep: data.value,
        totalSteps: data.max
      } : prev);
    });

    source.addEventListener('node_executing', (event) => {
      if (activeJobIdRef.current !== jobId) return;
      const data = JSON.parse((event as MessageEvent).data);
      setJob(prev => prev && prev.id === jobId ? { ...prev, currentNodeId: data.node } : prev);
    });

    source.onerror = () => {
      // The server owns the job. Do not cancel or clear local state if the browser
      // temporarily loses the SSE connection. The polling backup below will catch up.
      source.close();
    };

    return () => {
      source.close();
      // Deliberately do NOT clear activeJobIdRef or the job here.
      // This provider remains mounted while the user changes Gina tabs.
    };
  }, [job?.id, attachToJob, loadOutput]);

  // Restore an active server-side job after a browser refresh and provide a light
  // polling backup for missed SSE messages.
  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      try {
        const response = await fetch('/api/jobs', { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        const jobs: GinaJob[] = Array.isArray(data.jobs) ? data.jobs : [];
        const candidate = jobs.find(j => j.status === 'RUNNING' || j.status === 'QUEUED') || jobs[0];
        if (!cancelled && candidate && !activeJobIdRef.current) {
          setJob(candidate);
          if (candidate.status === 'COMPLETED' && candidate.outputs?.length) {
            setOutput({ job: candidate, outputs: candidate.outputs.map(item => ({ ...item, url: withCacheBust(item.url, candidate.id) })) });
          } else if (candidate.status === 'COMPLETED') {
            activeJobIdRef.current = candidate.id;
            await loadOutput(candidate.id);
          }
        }
      } catch {
        // The normal Create screen will report service errors; restoration is best-effort.
      }
    };
    restore();
    return () => { cancelled = true; };
  }, [loadOutput]);

  useEffect(() => {
    if (!job?.id || (job.status !== 'QUEUED' && job.status !== 'RUNNING')) return;
    const timer = setInterval(async () => {
      try {
        const response = await fetch(`/api/jobs/${encodeURIComponent(job.id)}`, { cache: 'no-store' });
        if (!response.ok || activeJobIdRef.current !== job.id) return;
        const latest = await response.json() as GinaJob;
        setJob(latest);
        if (latest.status === 'COMPLETED' && outputResolvedJobRef.current !== latest.id) await loadOutput(latest.id);
      } catch {
        // SSE remains the primary event path.
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [job?.id, job?.status, loadOutput]);

  const executeJobSubmission = useCallback(async (workflowId: string, parameters: Record<string, any>) => {
    setSubmitting(true);
    setOutput(null);
    setOutputLoading(false);
    outputLoadingJobRef.current = null;
    outputResolvedJobRef.current = null;
    setJob(null);
    activeJobIdRef.current = null;
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId, parameters })
      });
      const data = await response.json();
      if (!response.ok) {
        const errorMsg = typeof data.error === 'string' ? data.error : (data.error?.message || `Queue submission failed (HTTP ${response.status})`);
        const failedJob: GinaJob = {
          id: data.jobId || `fail-${Date.now()}`,
          workflowId,
          status: 'FAILED',
          progress: 0,
          createdAt: new Date().toISOString(),
          error: errorMsg,
          outputs: [],
          parameters
        };
        activeJobIdRef.current = failedJob.id;
        setJob(failedJob);
        onAddLogRef.current?.('WARN', `Job submission failed: ${errorMsg}`);
        return failedJob;
      }
      const freshJob: GinaJob = {
        ...data.job,
        status: 'QUEUED',
        progress: 0,
        currentStep: undefined,
        totalSteps: undefined,
        currentNodeId: null,
        currentNodeClass: undefined,
        outputs: []
      };
      activeJobIdRef.current = freshJob.id;
      setJob(freshJob);
      onAddLogRef.current?.('INFO', `Local job ${freshJob.id.slice(0, 8)} queued; progress reset to 0%.`);
      return freshJob;
    } catch (error: any) {
      const errorMsg = error?.message || 'unknown submission error';
      const failedJob: GinaJob = {
        id: `fail-${Date.now()}`,
        workflowId,
        status: 'FAILED',
        progress: 0,
        createdAt: new Date().toISOString(),
        error: errorMsg,
        outputs: [],
        parameters
      };
      setJob(failedJob);
      onAddLogRef.current?.('WARN', `Local generation failed: ${errorMsg}`);
      return failedJob;
    } finally {
      setSubmitting(false);
    }
  }, []);

  // Drain queued requests automatically when cooldown transitions to inactive
  useEffect(() => {
    if (!isCooldownActive && requestQueueRef.current.length > 0) {
      const nextRequest = requestQueueRef.current.shift();
      setQueuedRequestsCount(requestQueueRef.current.length);
      if (nextRequest) {
        onAddLogRef.current?.('SEC', `VRAMGuard Breath Complete: Executing held generation job for workflow '${nextRequest.workflowId}'.`);
        executeJobSubmission(nextRequest.workflowId, nextRequest.parameters)
          .then(nextRequest.resolve)
          .catch(nextRequest.reject);
      }
    }
  }, [isCooldownActive, executeJobSubmission]);

  const startJob = useCallback(async (workflowId: string, parameters: Record<string, any>): Promise<GinaJob | null> => {
    if (isCooldownActive) {
      onAddLogRef.current?.(
        'RULE',
        `Rule 011-020 [VRAMGuard Cooldown Active]: System is currently in a 5-second VRAM stabilization breath (${cooldownRemainingSec}s remaining). Queuing generation request for '${workflowId}'...`,
        '011-020'
      );
      return new Promise<GinaJob | null>((resolve, reject) => {
        const queuedItem: QueuedJobRequest = {
          id: `queued_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          workflowId,
          parameters,
          resolve,
          reject,
          queuedAt: Date.now()
        };
        requestQueueRef.current.push(queuedItem);
        setQueuedRequestsCount(requestQueueRef.current.length);
      });
    }

    return executeJobSubmission(workflowId, parameters);
  }, [isCooldownActive, cooldownRemainingSec, executeJobSubmission]);

  const adoptJob = useCallback(async (jobId: string): Promise<GinaJob | null> => {
    try {
      const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, { cache: 'no-store' });
      if (!response.ok) return null;
      const adopted = await response.json() as GinaJob;
      activeJobIdRef.current = adopted.id;
      outputResolvedJobRef.current = null;
      outputLoadingJobRef.current = null;
      setOutput(null);
      setJob(adopted);
      setSubmitting(adopted.status === 'QUEUED' || adopted.status === 'RUNNING');
      return adopted;
    } catch (error: any) {
      onAddLogRef.current?.('WARN', `Unable to attach UI to generation job ${jobId.slice(0, 8)}: ${error?.message || 'request failed'}`);
      return null;
    }
  }, []);

  const cancelJob = useCallback(async () => {
    try {
      // Clear client-side held queue
      requestQueueRef.current = [];
      setQueuedRequestsCount(0);

      // Call server interrupt API to cancel ComfyUI execution
      const response = await fetch('/api/comfy/interrupt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok && !data.cancelled) {
        throw new Error(data?.error || `Cancel failed (HTTP ${response.status})`);
      }

      // Update local state to CANCELLED
      setSubmitting(false);
      setOutputLoading(false);
      if (job) {
        setJob({
          ...job,
          status: 'CANCELLED',
          completedAt: new Date().toISOString()
        });
      }
      onAddLogRef.current?.('WARN', data?.flushed === false ? 'Generation stopped and queue cleared, but VRAM flush did not complete.' : 'Generation stopped by user. ComfyUI interrupted, queue cleared, and VRAM flushed.');
    } catch (err: any) {
      onAddLogRef.current?.('WARN', `Failed to cancel job: ${err?.message || err}`);
    }
  }, [job]);

  const refreshJob = useCallback(async () => {
    if (!job?.id) return;
    try {
      const response = await fetch(`/api/jobs/${encodeURIComponent(job.id)}`, { cache: 'no-store' });
      if (response.ok) setJob(await response.json());
    } catch { /* best effort */ }
  }, [job?.id]);

  const clearCurrentOutput = useCallback(() => { setOutput(null); outputResolvedJobRef.current = null; }, []);

  return (
    <GenerationJobContext.Provider value={{
      job,
      output,
      outputLoading,
      submitting,
      isCooldownActive,
      cooldownRemainingSec,
      queuedRequestsCount,
      triggerCooldownBreath,
      startJob,
      cancelJob,
      adoptJob,
      refreshJob,
      clearCurrentOutput
    }}>
      {children}
    </GenerationJobContext.Provider>
  );
};

export const useGenerationJob = () => {
  const value = useContext(GenerationJobContext);
  if (!value) throw new Error('useGenerationJob must be used inside GenerationJobProvider');
  return value;
};
