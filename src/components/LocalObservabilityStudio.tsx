import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Activity, Shield, AlertTriangle, Terminal, Database, FileText, Download, RefreshCw, Server, CheckCircle, XCircle, Sliders, ExternalLink, HardDrive, Cpu, Lock, Play, Pause, Bell } from 'lucide-react';

export interface ObservabilityTrace {
  id: string;
  timestamp: string;
  type: 'command' | 'file_read' | 'file_write' | 'file_edit' | 'tool_call' | 'test' | 'api_request' | 'security' | 'llm_generation';
  title: string;
  target?: string;
  command?: string;
  codeSnippet?: string;
  durationMs?: number;
  status: 'running' | 'success' | 'error';
  details?: string;
  error?: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  resource: string;
  status: string;
  ip: string;
  details?: string;
}

export interface MetricData {
  httpRequestsTotal: number;
  httpErrorsTotal: number;
  toolExecutionsTotal: number;
  tokensGeneratedTotal: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  qps: number;
  vramUsedMB: number;
  vramTotalMB: number;
  ramUsedGB: number;
  ramTotalGB: number;
  cpuPercent: number;
  alertsActive: Array<{
    id: string;
    timestamp: string;
    severity: 'info' | 'warning' | 'critical';
    title: string;
    message: string;
    metric: string;
    currentValue: number;
    threshold: number;
    acknowledged: boolean;
  }>;
}

export const LocalObservabilityStudio: React.FC<{
  isOpen?: boolean;
  onClose?: () => void;
}> = ({ isOpen = true, onClose }) => {
  const [activeTab, setActiveTab] = useState<'traces' | 'metrics' | 'alerts' | 'audit' | 'api' | 'docker'>('traces');
  const [traces, setTraces] = useState<ObservabilityTrace[]>([]);
  const [traceFilter, setTraceFilter] = useState<string>('all');
  const [autoRefreshTraces, setAutoRefreshTraces] = useState(true);
  const [metrics, setMetrics] = useState<MetricData | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [thresholds, setThresholds] = useState({
    vramWarningPct: 85,
    vramCriticalPct: 92,
    maxLatencyMs: 3500,
    maxErrorRatePct: 5,
    rateLimitPerMinute: 600,
  });
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>(null);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch real-time metrics
  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/observability/metrics');
      if (res.ok) {
        const data = await res.json();
        if (data.metrics) setMetrics(data.metrics);
      }
    } catch {}
  }, []);

  // Fetch live traces
  const fetchTraces = useCallback(async () => {
    try {
      const res = await fetch(`/api/observability/traces?limit=150&type=${traceFilter}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.traces)) setTraces(data.traces);
      }
    } catch {}
  }, [traceFilter]);

  // Fetch audit logs
  const fetchAuditLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/observability/audit?limit=100');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.auditLogs)) setAuditLogs(data.auditLogs);
      }
    } catch {}
  }, []);

  // Fetch alerts & thresholds
  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/observability/alerts');
      if (res.ok) {
        const data = await res.json();
        if (data.thresholds) setThresholds(data.thresholds);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchMetrics();
    fetchTraces();
    fetchAuditLogs();
    fetchAlerts();

    const interval = setInterval(() => {
      fetchMetrics();
      if (autoRefreshTraces) fetchTraces();
    }, 2500);

    return () => clearInterval(interval);
  }, [fetchMetrics, fetchTraces, fetchAuditLogs, fetchAlerts, autoRefreshTraces]);

  // Export audit logs
  const handleExportAudit = async (format: 'csv' | 'json') => {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/observability/audit/export?format=${format}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gina-audit-logs-${Date.now()}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setIsExporting(false);
    }
  };

  // Run automated backup
  const handleBackup = async () => {
    setBackupStatus('Creating backup archive…');
    try {
      const res = await fetch('/api/observability/backup', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setBackupStatus(`✓ Backup created successfully (${(data.sizeBytes / 1024).toFixed(1)} KB)`);
        fetchAuditLogs();
      } else {
        setBackupStatus(`✗ Backup failed: ${data.error}`);
      }
    } catch (err: any) {
      setBackupStatus(`✗ Backup failed: ${err?.message}`);
    }
    setTimeout(() => setBackupStatus(null), 6000);
  };

  // Save updated thresholds
  const handleSaveThresholds = async () => {
    try {
      const res = await fetch('/api/observability/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thresholds })
      });
      if (res.ok) {
        alert('Alert thresholds updated successfully.');
      }
    } catch {}
  };

  const vramPct = useMemo(() => {
    if (!metrics || !metrics.vramTotalMB) return 0;
    return Math.round((metrics.vramUsedMB / metrics.vramTotalMB) * 100);
  }, [metrics]);

  return (
    <div className="flex flex-col h-full bg-[#0d1117] text-[#e6edf3] font-sans rounded-xl border border-slate-800 overflow-hidden shadow-2xl">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-[#161b22] border-b border-slate-800 shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Local Observability &amp; Metrics Engine</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">100% SELF-HOSTED</span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">Prometheus /metrics · Live Traces · SQLite Audit · Zero Cloud Dependencies</p>
          </div>
        </div>

        {/* Global Action Badges */}
        <div className="flex items-center gap-2">
          <a
            href="/metrics"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700 transition-colors"
            title="View raw Prometheus exposition endpoint"
          >
            <Server className="w-3.5 h-3.5 text-cyan-400" />
            <span>/metrics</span>
            <ExternalLink className="w-3 h-3 text-slate-500" />
          </a>
          <button
            onClick={handleBackup}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-mono border border-emerald-500/40 transition-colors cursor-pointer"
            title="Create an automated snapshot backup of config & databases"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Auto-Backup</span>
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-800">
              ✕
            </button>
          )}
        </div>
      </div>

      {backupStatus && (
        <div className="px-4 py-1.5 bg-emerald-500/10 border-b border-emerald-500/30 text-xs font-mono text-emerald-300 flex items-center justify-between">
          <span>{backupStatus}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 bg-[#0d1117] border-b border-slate-800 overflow-x-auto shrink-0 text-xs font-mono">
        <button
          onClick={() => setActiveTab('traces')}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'traces'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Live Traces ({traces.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('metrics')}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'metrics'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Prometheus Metrics</span>
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'alerts'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Alerts &amp; Thresholds</span>
          {metrics && metrics.alertsActive.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Audit Log ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('api')}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'api'
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>REST API / Swagger</span>
        </button>

        <button
          onClick={() => setActiveTab('docker')}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'docker'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>Docker Stack Guide</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 custom-scrollbar">
        {/* TAB 1: LIVE TRACES & CODE STREAM */}
        {activeTab === 'traces' && (
          <div className="space-y-3">
            {/* Filter toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-[#161b22] border border-slate-800 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Filter:</span>
                {(['all', 'command', 'file_write', 'file_read', 'tool_call', 'test', 'security'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setTraceFilter(type)}
                    className={`px-2 py-1 rounded cursor-pointer transition-colors ${
                      traceFilter === type
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {type.toUpperCase().replace('_', ' ')}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAutoRefreshTraces(!autoRefreshTraces)}
                  className={`px-2 py-1 rounded flex items-center gap-1 cursor-pointer ${
                    autoRefreshTraces ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {autoRefreshTraces ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                  <span>{autoRefreshTraces ? 'Live Stream: ON' : 'Paused'}</span>
                </button>
                <button onClick={fetchTraces} className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer" title="Refresh now">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Trace List */}
            <div className="space-y-2">
              {traces.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs font-mono border border-slate-800/80 rounded-xl">
                  No trace events recorded yet. Run a prompt, execute a command, or generate code to see real-time execution steps.
                </div>
              ) : (
                traces.map((trace) => {
                  const isExpanded = expandedTraceId === trace.id;
                  const isErr = trace.status === 'error';
                  const isSuccess = trace.status === 'success';

                  return (
                    <div
                      key={trace.id}
                      className={`p-3 rounded-lg border transition-all ${
                        isErr
                          ? 'bg-rose-950/20 border-rose-500/40 text-rose-300'
                          : isSuccess
                          ? 'bg-[#161b22] border-slate-800 text-slate-200'
                          : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              trace.type === 'command'
                                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                                : trace.type === 'file_write' || trace.type === 'file_edit'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : trace.type === 'file_read'
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                                : trace.type === 'security'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {trace.type.toUpperCase().replace('_', ' ')}
                          </span>

                          <span className="font-bold text-slate-100">{trace.title}</span>

                          {trace.target && (
                            <span className="text-slate-400 truncate max-w-[280px]">
                              @ {trace.target}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-slate-500 text-[10px]">
                          {trace.durationMs != null && (
                            <span>{trace.durationMs}ms</span>
                          )}
                          <span>{new Date(trace.timestamp).toLocaleTimeString()}</span>
                          <span className={`font-bold ${isErr ? 'text-rose-400' : isSuccess ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {trace.status.toUpperCase()}
                          </span>
                          {(trace.codeSnippet || trace.command || trace.details) && (
                            <button
                              onClick={() => setExpandedTraceId(isExpanded ? null : trace.id)}
                              className="text-slate-400 hover:text-slate-100 font-bold px-1 rounded bg-slate-800 cursor-pointer"
                            >
                              {isExpanded ? '▲ Hide' : '▼ Details'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expandable Code Snippet / Details */}
                      {isExpanded && (
                        <div className="mt-2.5 pt-2 border-t border-slate-800 space-y-2 text-xs font-mono">
                          {trace.command && (
                            <div>
                              <div className="text-[10px] text-slate-400 uppercase font-bold">Executed Command:</div>
                              <pre className="p-2 rounded bg-black/60 border border-slate-800 text-emerald-300 overflow-x-auto">
                                $ {trace.command}
                              </pre>
                            </div>
                          )}

                          {trace.codeSnippet && (
                            <div>
                              <div className="text-[10px] text-slate-400 uppercase font-bold">Code Snippet / Content:</div>
                              <pre className="p-2.5 rounded bg-black/80 border border-slate-800 text-sky-300 max-h-64 overflow-y-auto custom-scrollbar whitespace-pre-wrap text-[11px] leading-relaxed">
                                {trace.codeSnippet}
                              </pre>
                            </div>
                          )}

                          {trace.details && (
                            <div className="text-slate-400 text-[11px]">
                              {trace.details}
                            </div>
                          )}
                          {trace.error && (
                            <div className="text-rose-400 text-[11px] font-bold">
                              Error: {trace.error}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PROMETHEUS METRICS */}
        {activeTab === 'metrics' && (
          <div className="space-y-4">
            {/* Quick Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-[#161b22] border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">HTTP Request Rate (QPS)</div>
                <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{metrics?.qps ?? '0.00'} /s</div>
                <div className="text-[10px] text-slate-500 font-mono mt-1">Total requests: {metrics?.httpRequestsTotal ?? 0}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#161b22] border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">Avg Latency (p95)</div>
                <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">{metrics?.p95LatencyMs ?? 0} ms</div>
                <div className="text-[10px] text-slate-500 font-mono mt-1">Avg: {metrics?.avgLatencyMs ?? 0} ms</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#161b22] border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">LLM Tokens Generated</div>
                <div className="text-2xl font-bold font-mono text-purple-400 mt-1">{metrics?.tokensGeneratedTotal?.toLocaleString() ?? 0}</div>
                <div className="text-[10px] text-slate-500 font-mono mt-1">Agent tool calls: {metrics?.toolExecutionsTotal ?? 0}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#161b22] border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">VRAM Utilization</div>
                <div className="text-2xl font-bold font-mono text-amber-400 mt-1">{vramPct}%</div>
                <div className="text-[10px] text-slate-500 font-mono mt-1">{metrics?.vramUsedMB ?? 0} MB / {metrics?.vramTotalMB ?? 7372} MB</div>
              </div>
            </div>

            {/* Hardware Telemetry Bar */}
            <div className="p-4 rounded-xl bg-[#161b22] border border-slate-800 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold uppercase tracking-wider text-slate-300">GPU VRAM &amp; System Memory Pressure</span>
                <span className="text-slate-400">{metrics?.ramUsedGB?.toFixed(1) || '0.0'} GB / {metrics?.ramTotalGB || 32} GB RAM</span>
              </div>

              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">GPU VRAM (RTX 3070 Ti 8GB Cage)</span>
                    <span className={`font-bold ${vramPct > 90 ? 'text-rose-400' : vramPct > 80 ? 'text-amber-400' : 'text-emerald-400'}`}>{vramPct}%</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${vramPct > 90 ? 'bg-rose-500' : vramPct > 80 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                      style={{ width: `${Math.min(100, Math.max(2, vramPct))}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Prometheus scrape instructions */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono space-y-2 text-slate-300">
              <div className="text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-2">
                <Server className="w-4 h-4" />
                <span>Prometheus Scraper Configuration</span>
              </div>
              <p className="text-slate-400">
                To collect metrics locally with your Prometheus instance, point your <code className="text-emerald-300">prometheus.yml</code> to this endpoint:
              </p>
              <pre className="p-3 rounded bg-black/60 border border-slate-800 text-slate-200 overflow-x-auto text-[11px]">
{`scrape_configs:
  - job_name: 'gina_local_engine'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['localhost:3000']
`}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 3: ALERTS & THRESHOLDS */}
        {activeTab === 'alerts' && (
          <div className="space-y-4 max-w-2xl font-mono text-xs">
            <div className="p-4 rounded-xl bg-[#161b22] border border-slate-800 space-y-3">
              <h3 className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>Custom Anomaly Thresholds &amp; Guards</span>
              </h3>
              <p className="text-slate-400 text-[11px]">
                These thresholds run locally on the Node.js backend and emit immediate alerts when anomalous spikes or out-of-memory risks are detected.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between gap-4">
                  <label className="text-slate-300">VRAM Warning Threshold (%):</label>
                  <input
                    type="number"
                    min="50"
                    max="99"
                    value={thresholds.vramWarningPct}
                    onChange={e => setThresholds({ ...thresholds, vramWarningPct: Number(e.target.value) })}
                    className="w-24 px-2 py-1 rounded bg-black border border-slate-700 text-slate-100 text-right"
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <label className="text-slate-300">Critical VRAM Auto-Flush Threshold (%):</label>
                  <input
                    type="number"
                    min="70"
                    max="99"
                    value={thresholds.vramCriticalPct}
                    onChange={e => setThresholds({ ...thresholds, vramCriticalPct: Number(e.target.value) })}
                    className="w-24 px-2 py-1 rounded bg-black border border-slate-700 text-slate-100 text-right"
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <label className="text-slate-300">Max Request Latency Threshold (ms):</label>
                  <input
                    type="number"
                    min="500"
                    max="30000"
                    step="500"
                    value={thresholds.maxLatencyMs}
                    onChange={e => setThresholds({ ...thresholds, maxLatencyMs: Number(e.target.value) })}
                    className="w-24 px-2 py-1 rounded bg-black border border-slate-700 text-slate-100 text-right"
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <label className="text-slate-300">Rate Limit (requests / min per IP):</label>
                  <input
                    type="number"
                    min="60"
                    max="10000"
                    value={thresholds.rateLimitPerMinute}
                    onChange={e => setThresholds({ ...thresholds, rateLimitPerMinute: Number(e.target.value) })}
                    className="w-24 px-2 py-1 rounded bg-black border border-slate-700 text-slate-100 text-right"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSaveThresholds}
                  className="px-4 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold uppercase tracking-wider cursor-pointer"
                >
                  Save Alert Thresholds
                </button>
              </div>
            </div>

            {/* Active alerts */}
            <div className="p-4 rounded-xl bg-[#161b22] border border-slate-800 space-y-2">
              <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">Active Incident Notifications</h4>
              {(!metrics?.alertsActive || metrics.alertsActive.length === 0) ? (
                <div className="text-slate-500 text-[11px] py-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>All local health parameters are operating within configured safe thresholds.</span>
                </div>
              ) : (
                metrics.alertsActive.map(a => (
                  <div key={a.id} className="p-2.5 rounded bg-rose-950/20 border border-rose-500/40 text-rose-300 flex items-center justify-between">
                    <div>
                      <div className="font-bold">{a.title}</div>
                      <div className="text-[10px] text-slate-400">{a.message}</div>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 uppercase">{a.severity}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT LOG EXPLORER */}
        {activeTab === 'audit' && (
          <div className="space-y-3 font-mono text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-[#161b22] border border-slate-800">
              <div className="text-slate-400 text-[11px]">
                Immutable SQLite Audit Ledger (<span className="text-emerald-400 font-bold">{auditLogs.length}</span> recorded security &amp; access entries)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportAudit('csv')}
                  disabled={isExporting}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3" /> Export CSV
                </button>
                <button
                  onClick={() => handleExportAudit('json')}
                  disabled={isExporting}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3" /> Export JSON
                </button>
              </div>
            </div>

            {/* Audit Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#161b22] text-slate-400 border-b border-slate-800">
                    <th className="p-2.5 font-bold">Timestamp</th>
                    <th className="p-2.5 font-bold">Actor</th>
                    <th className="p-2.5 font-bold">Role</th>
                    <th className="p-2.5 font-bold">Action</th>
                    <th className="p-2.5 font-bold">Resource</th>
                    <th className="p-2.5 font-bold">Status</th>
                    <th className="p-2.5 font-bold">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-[#0d1117]">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-slate-500">
                        No audit records currently stored.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/30">
                        <td className="p-2.5 text-slate-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString()}</td>
                        <td className="p-2.5 font-bold text-slate-200">{log.actor}</td>
                        <td className="p-2.5">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                            log.role === 'admin' ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {log.role}
                          </span>
                        </td>
                        <td className="p-2.5 text-cyan-300 font-bold">{log.action}</td>
                        <td className="p-2.5 text-slate-400 truncate max-w-[200px]" title={log.resource}>{log.resource}</td>
                        <td className="p-2.5">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            log.status === 'success' || log.status === 'allowed'
                              ? 'text-emerald-400 bg-emerald-500/10'
                              : 'text-rose-400 bg-rose-500/10'
                          }`}>
                            {log.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-500">{log.ip}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: REST API & SWAGGER SPEC */}
        {activeTab === 'api' && (
          <div className="space-y-4 font-mono text-xs">
            <div className="p-4 rounded-xl bg-[#161b22] border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sky-400" />
                  <span>OpenAPI 3.0 / Swagger REST Documentation</span>
                </h3>
                <a
                  href="/api/observability/swagger.json"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[10px] font-bold flex items-center gap-1"
                >
                  <span>Download OpenAPI JSON</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-slate-400 text-[11px]">
                Gina AI Factory provides real-time REST endpoints for Prometheus metrics, live trace collection, file inspection, and code execution.
              </p>
            </div>

            <div className="space-y-2">
              {[
                { method: 'GET', path: '/metrics', desc: 'Prometheus metrics exposition endpoint (QPS, latencies, VRAM, RAM, TPS)', tag: 'Metrics' },
                { method: 'GET', path: '/api/observability/metrics', desc: 'Real-time JSON snapshot with anomaly status and hardware pressure', tag: 'Metrics' },
                { method: 'GET', path: '/api/observability/traces', desc: 'Live execution trace history (commands, file operations, snippets)', tag: 'Tracing' },
                { method: 'GET', path: '/api/observability/audit', desc: 'Security audit ledger entries with actor, role, IP, and status', tag: 'Audit' },
                { method: 'GET', path: '/api/observability/audit/export', desc: 'Download audit ledger as CSV or JSON format for compliance', tag: 'Audit' },
                { method: 'GET / POST', path: '/api/observability/alerts', desc: 'Query active alerts and set custom thresholds for VRAM and latency', tag: 'Alerts' },
                { method: 'POST', path: '/api/observability/backup', desc: 'Trigger automated atomic snapshot backup of configs and SQLite DBs', tag: 'Backup' },
                { method: 'POST', path: '/api/agent/tool', desc: 'Execute agent filesystem tools (read_file, write_file, execute_command)', tag: 'Agent' },
              ].map((ep, i) => (
                <div key={i} className="p-3 rounded-lg bg-[#161b22] border border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/40">
                      {ep.method}
                    </span>
                    <span className="font-bold text-slate-100">{ep.path}</span>
                    <span className="text-slate-400 text-[11px]">— {ep.desc}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] bg-slate-800 text-slate-400">{ep.tag}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: DOCKER STACK DEPLOYMENT GUIDE */}
        {activeTab === 'docker' && (
          <div className="space-y-4 font-mono text-xs max-w-3xl">
            <div className="p-4 rounded-xl bg-[#161b22] border border-slate-800 space-y-3">
              <h3 className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-indigo-400" />
                <span>100% Local Docker Compose Setup (Prometheus + Grafana)</span>
              </h3>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Gina includes a containerized Docker Compose stack (<code className="text-emerald-300">docker-compose.observability.yml</code>) configured with persistent volume mapping and zero online cloud telemetry.
              </p>

              <div className="space-y-2">
                <div className="text-[11px] text-slate-300 font-bold">1. Spin up the containers locally:</div>
                <pre className="p-2.5 rounded bg-black/60 border border-slate-800 text-emerald-300 overflow-x-auto text-[11px]">
                  docker compose -f docker-compose.observability.yml up -d
                </pre>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] text-slate-300 font-bold">2. Ports &amp; Access URLs:</div>
                <ul className="list-disc pl-5 space-y-1 text-slate-300 text-[11px]">
                  <li><strong>Prometheus Dashboard:</strong> <a href="http://localhost:9090" target="_blank" rel="noreferrer" className="text-sky-400 underline">http://localhost:9090</a></li>
                  <li><strong>Grafana Dashboard:</strong> <a href="http://localhost:3001" target="_blank" rel="noreferrer" className="text-sky-400 underline">http://localhost:3001</a> (Default user: <code className="text-emerald-300">admin</code> / <code className="text-emerald-300">gina_local_admin</code>)</li>
                  <li><strong>Scrape Target:</strong> Automatically configured to scrape Gina at <code className="text-emerald-300">host.docker.internal:3000/metrics</code></li>
                </ul>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] text-slate-300 font-bold">3. Persistent Volume Mappings:</div>
                <div className="p-2.5 rounded bg-black/40 border border-slate-800 text-slate-400 text-[11px] space-y-1">
                  <div>• <code className="text-purple-300">prometheus_data</code>: 30-day TSDB time-series retention on disk</div>
                  <div>• <code className="text-purple-300">grafana_data</code>: Persistent dashboards, alerts, and settings</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
