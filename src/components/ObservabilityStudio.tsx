import React, { useState, useEffect } from 'react';
import {
  Activity, Shield, Bell, Download, RefreshCw, Terminal, FileCode, CheckCircle,
  AlertTriangle, XCircle, Database, Server, Cpu, HardDrive, Zap, Lock,
  ExternalLink, Sliders, Play, Copy, Check
} from 'lucide-react';

interface MetricSnapshot {
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
  alertsActive: AlertItem[];
}

interface TraceEvent {
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

interface AuditRecord {
  id: string;
  timestamp: string;
  actor: string;
  role: 'admin' | 'auditor' | 'viewer' | 'system';
  action: string;
  resource: string;
  status: 'allowed' | 'denied' | 'success' | 'failure';
  ip: string;
  details?: string;
}

interface AlertItem {
  id: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  metric: string;
  currentValue: number;
  threshold: number;
  acknowledged: boolean;
}

export const ObservabilityStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'metrics' | 'traces' | 'audit' | 'alerts' | 'docker'>('metrics');
  const [metrics, setMetrics] = useState<MetricSnapshot | null>(null);
  const [traces, setTraces] = useState<TraceEvent[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [thresholds, setThresholds] = useState({
    vramLimitMB: 7372,
    p95LatencyMs: 2500,
    httpErrorRatePercent: 5,
    cpuThresholdPercent: 85
  });
  const [traceFilter, setTraceFilter] = useState<string>('all');
  const [auditRoleFilter, setAuditRoleFilter] = useState<string>('all');
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [copiedDockerCmd, setCopiedDockerCmd] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Poll metrics and traces
  const fetchData = async () => {
    try {
      setIsRefreshing(true);
      const [mRes, tRes, aRes, alRes] = await Promise.all([
        fetch('/api/observability/metrics').then(r => r.ok ? r.json() : null),
        fetch(`/api/observability/traces?limit=150&type=${traceFilter}`).then(r => r.ok ? r.json() : null),
        fetch(`/api/observability/audit?limit=100${auditRoleFilter !== 'all' ? `&role=${auditRoleFilter}` : ''}`).then(r => r.ok ? r.json() : null),
        fetch('/api/observability/alerts').then(r => r.ok ? r.json() : null),
      ]);

      if (mRes?.metrics) setMetrics(mRes.metrics);
      if (tRes?.traces) setTraces(tRes.traces);
      if (aRes?.auditLogs) setAuditLogs(aRes.auditLogs);
      if (alRes?.alerts) setAlerts(alRes.alerts);
      if (alRes?.thresholds) setThresholds(alRes.thresholds);
    } catch (err) {
      console.error('Failed to fetch observability data', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [traceFilter, auditRoleFilter]);

  // Connect to SSE live trace stream
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/observability/stream');
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.type) {
            setTraces((prev) => [data as TraceEvent, ...prev.slice(0, 150)]);
          }
        } catch {}
      };
    } catch {}

    return () => {
      if (es) es.close();
    };
  }, []);

  const handleUpdateThresholds = async () => {
    try {
      const res = await fetch('/api/observability/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thresholds })
      });
      if (res.ok) {
        setBackupStatus('Alert thresholds updated successfully.');
        setTimeout(() => setBackupStatus(null), 3000);
      }
    } catch (err: any) {
      setBackupStatus(`Failed to update thresholds: ${err.message}`);
    }
  };

  const handleTriggerBackup = async () => {
    try {
      setBackupStatus('Creating backup snapshot…');
      const res = await fetch('/api/observability/backup', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setBackupStatus(`Backup snapshot created: ${data.backupFile} (${Math.round((data.sizeBytes || 0) / 1024)} KB)`);
      } else {
        setBackupStatus(`Backup error: ${data.error}`);
      }
      setTimeout(() => setBackupStatus(null), 8000);
    } catch (err: any) {
      setBackupStatus(`Backup request failed: ${err.message}`);
    }
  };

  const handleExportAudit = (format: 'csv' | 'json') => {
    window.open(`/api/observability/audit/export?format=${format}`, '_blank');
  };

  return (
    <div className="w-full space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-800 bg-slate-900/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Activity className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-100">Local Observability &amp; Prometheus Engine</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            100% Local Self-Hosted Observability Stack · Lightweight Prometheus &amp; Grafana Compatible · Zero External Cloud Dependencies
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/metrics"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-mono text-cyan-300 transition-colors"
            title="Open standard Prometheus text exposition format"
          >
            <span>/metrics</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <a
            href="/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-mono text-emerald-300 transition-colors"
            title="Open interactive Swagger UI REST API Documentation"
          >
            <span>Swagger API</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <button
            type="button"
            onClick={fetchData}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {backupStatus && (
        <div className="p-3 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{backupStatus}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('metrics')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
            activeTab === 'metrics'
              ? 'bg-cyan-500/10 border border-cyan-500/40 text-cyan-300'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Real-time Metrics</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('traces')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
            activeTab === 'traces'
              ? 'bg-cyan-500/10 border border-cyan-500/40 text-cyan-300'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Live Tool Traces &amp; Snippets ({traces.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
            activeTab === 'audit'
              ? 'bg-cyan-500/10 border border-cyan-500/40 text-cyan-300'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Audit Logs &amp; RBAC</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('alerts')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
            activeTab === 'alerts'
              ? 'bg-cyan-500/10 border border-cyan-500/40 text-cyan-300'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Alerts &amp; Thresholds {alerts.length > 0 && `(${alerts.length})`}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('docker')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
            activeTab === 'docker'
              ? 'bg-cyan-500/10 border border-cyan-500/40 text-cyan-300'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>Prometheus + Grafana Docker</span>
        </button>
      </div>

      {/* Tab 1: Real-Time Metrics */}
      {activeTab === 'metrics' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 font-mono">
              <div className="text-[10px] uppercase text-slate-500 font-bold">HTTP Requests</div>
              <div className="text-xl font-bold text-slate-100 mt-1">{metrics?.httpRequestsTotal?.toLocaleString() || '0'}</div>
              <div className="text-[9px] text-slate-500 mt-0.5">Errors: {metrics?.httpErrorsTotal || 0}</div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 font-mono">
              <div className="text-[10px] uppercase text-slate-500 font-bold">Throughput (QPS)</div>
              <div className="text-xl font-bold text-emerald-400 mt-1">{(metrics?.qps || 0).toFixed(1)} req/s</div>
              <div className="text-[9px] text-slate-500 mt-0.5">Rolling 10s rate</div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 font-mono">
              <div className="text-[10px] uppercase text-slate-500 font-bold">p95 Latency</div>
              <div className="text-xl font-bold text-cyan-400 mt-1">{(metrics?.p95LatencyMs || 0).toFixed(0)} ms</div>
              <div className="text-[9px] text-slate-500 mt-0.5">Avg: {(metrics?.avgLatencyMs || 0).toFixed(0)} ms</div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 font-mono">
              <div className="text-[10px] uppercase text-slate-500 font-bold">VRAM Footprint</div>
              <div className={`text-xl font-bold mt-1 ${(metrics?.vramUsedMB || 0) > 7372 ? 'text-amber-400' : 'text-slate-100'}`}>
                {metrics?.vramUsedMB || 0} MB
              </div>
              <div className="text-[9px] text-slate-500 mt-0.5">Cap: {metrics?.vramTotalMB || 8192} MB (90% Cage)</div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 font-mono">
              <div className="text-[10px] uppercase text-slate-500 font-bold">System RAM</div>
              <div className="text-xl font-bold text-slate-100 mt-1">{(metrics?.ramUsedGB || 0).toFixed(1)} GB</div>
              <div className="text-[9px] text-slate-500 mt-0.5">Total: {(metrics?.ramTotalGB || 0).toFixed(1)} GB</div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 font-mono">
              <div className="text-[10px] uppercase text-slate-500 font-bold">Tool Executions</div>
              <div className="text-xl font-bold text-violet-400 mt-1">{metrics?.toolExecutionsTotal || 0}</div>
              <div className="text-[9px] text-slate-500 mt-0.5">Code, reads, commands</div>
            </div>
          </div>

          {/* Architecture comparison box */}
          <div className="p-4 rounded-xl border border-cyan-500/20 bg-[#0d1424] space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
              <Zap className="w-4 h-4" />
              <span>Self-Hosted Local Architecture vs. Cloud SigNoz</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Unlike <strong>SigNoz Community Edition</strong> (which requires ClickHouse, Zookeeper, and OTel collector daemon requiring 4–8GB RAM on your workstation), Gina’s built-in <strong>Local Observability Engine</strong> runs in-process via Node.js and local SQLite using under <strong>25MB RAM</strong> and <strong>0MB VRAM</strong>, exposing native Prometheus metrics on <code>/metrics</code>.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">✓ Zero VRAM impact</span>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">✓ Standard Prometheus /metrics</span>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">✓ Live code snippets in traces</span>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">✓ Automated config snapshots</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Live Tool Traces & Snippets */}
      {activeTab === 'traces' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-mono text-[11px]">Filter Trace Type:</span>
              {(['all', 'command', 'file_write', 'file_read', 'test', 'tool_call'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTraceFilter(t)}
                  className={`px-2 py-1 rounded font-mono text-[10px] uppercase cursor-pointer ${
                    traceFilter === t
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                      : 'text-slate-400 hover:text-white bg-slate-800'
                  }`}
                >
                  {t.replace('_', ' ')}
                </button>
              ))}
            </div>
            <span className="text-[11px] font-mono text-slate-500">Live SSE Stream Connected</span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
            {traces.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                No execution traces recorded yet. Execute an agent coding turn or run a validation to observe real-time step traces!
              </div>
            ) : (
              traces.map((trace) => (
                <div
                  key={trace.id}
                  className="p-3 rounded-lg border border-slate-800 bg-[#11161d] font-mono text-xs space-y-1.5 transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                        trace.type === 'command' ? 'bg-amber-950/80 text-amber-300 border border-amber-600/40' :
                        trace.type === 'file_write' || trace.type === 'file_edit' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/40' :
                        trace.type === 'file_read' ? 'bg-sky-950/80 text-sky-300 border border-sky-600/40' :
                        trace.type === 'test' ? 'bg-violet-950/80 text-violet-300 border border-violet-600/40' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {trace.type.replace('_', ' ')}
                      </span>

                      <span className="font-bold text-slate-200 truncate">{trace.title}</span>

                      {trace.target && (
                        <span className="text-slate-400 text-[11px] truncate max-w-[280px]">
                          → {trace.target}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {trace.durationMs != null && (
                        <span className="text-slate-500 text-[10px]">{trace.durationMs}ms</span>
                      )}
                      <span className={`text-[10px] uppercase font-bold ${
                        trace.status === 'success' ? 'text-emerald-400' :
                        trace.status === 'running' ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {trace.status}
                      </span>
                      <span className="text-slate-600 text-[10px]">
                        {new Date(trace.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  {trace.command && (
                    <div className="p-2 rounded bg-black/50 border border-slate-800 text-amber-300 text-[11px] overflow-x-auto">
                      <span className="text-slate-500 mr-2">$</span>
                      {trace.command}
                    </div>
                  )}

                  {trace.codeSnippet && (
                    <div className="p-2 rounded bg-black/60 border border-slate-800 text-emerald-300 text-[11px] overflow-x-auto max-h-48 custom-scrollbar">
                      <pre><code>{trace.codeSnippet}</code></pre>
                    </div>
                  )}

                  {trace.details && (
                    <div className="text-slate-400 text-[11px]">{trace.details}</div>
                  )}

                  {trace.error && (
                    <div className="text-rose-400 text-[11px] bg-rose-950/30 p-1.5 rounded border border-rose-500/20">
                      {trace.error}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Audit Logs & RBAC */}
      {activeTab === 'audit' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border border-slate-800 bg-slate-900/60 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[11px]">Role Filter:</span>
              {(['all', 'admin', 'auditor', 'viewer', 'system'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setAuditRoleFilter(r)}
                  className={`px-2 py-0.5 rounded text-[10px] uppercase cursor-pointer ${
                    auditRoleFilter === r
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                      : 'text-slate-400 hover:text-white bg-slate-800'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleExportAudit('csv')}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer text-[10px]"
              >
                <Download className="w-3 h-3" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportAudit('json')}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer text-[10px]"
              >
                <Download className="w-3 h-3" />
                <span>Export JSON</span>
              </button>
            </div>
          </div>

          <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#11161d]">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Actor / Role</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Resource</th>
                  <th className="py-2.5 px-3">IP Address</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 text-[11px]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/40">
                    <td className="py-2 px-3 text-slate-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString()}</td>
                    <td className="py-2 px-3">
                      <span className="font-bold text-slate-200">{log.actor}</span>
                      <span className="ml-1 text-[9px] uppercase px-1 py-0.5 rounded bg-slate-800 text-slate-400">{log.role}</span>
                    </td>
                    <td className="py-2 px-3 text-cyan-300">{log.action}</td>
                    <td className="py-2 px-3 text-slate-400 truncate max-w-xs" title={log.resource}>{log.resource}</td>
                    <td className="py-2 px-3 text-slate-500">{log.ip}</td>
                    <td className="py-2 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                        log.status === 'allowed' || log.status === 'success'
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-950/80 text-rose-300 border border-rose-500/30'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Alerts & Thresholds */}
      {activeTab === 'alerts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-200">Custom Alert Thresholds</h3>
              </div>
              <button
                type="button"
                onClick={handleUpdateThresholds}
                className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold cursor-pointer transition-colors"
              >
                Save Thresholds
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>VRAM Limit (MB):</span>
                  <span className="text-cyan-400 font-bold">{thresholds.vramLimitMB} MB</span>
                </div>
                <input
                  type="range"
                  min="4000"
                  max="8192"
                  step="64"
                  value={thresholds.vramLimitMB}
                  onChange={(e) => setThresholds({ ...thresholds, vramLimitMB: Number(e.target.value) })}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>p95 Latency Alert (ms):</span>
                  <span className="text-cyan-400 font-bold">{thresholds.p95LatencyMs} ms</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="10000"
                  step="250"
                  value={thresholds.p95LatencyMs}
                  onChange={(e) => setThresholds({ ...thresholds, p95LatencyMs: Number(e.target.value) })}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>HTTP Error Rate Alert (%):</span>
                  <span className="text-cyan-400 font-bold">{thresholds.httpErrorRatePercent}%</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="25"
                  step="1"
                  value={thresholds.httpErrorRatePercent}
                  onChange={(e) => setThresholds({ ...thresholds, httpErrorRatePercent: Number(e.target.value) })}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>CPU Spike Threshold (%):</span>
                  <span className="text-cyan-400 font-bold">{thresholds.cpuThresholdPercent}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="99"
                  step="5"
                  value={thresholds.cpuThresholdPercent}
                  onChange={(e) => setThresholds({ ...thresholds, cpuThresholdPercent: Number(e.target.value) })}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleTriggerBackup}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
              >
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                <span>Create Automated Backup Snapshot</span>
              </button>
            </div>
          </div>

          {/* Active Alerts List */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-slate-200">Active Anomaly &amp; Health Alerts</h3>
            </div>

            <div className="space-y-2 max-h-[360px] overflow-y-auto custom-scrollbar">
              {alerts.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
                  No active alerts. All hardware metrics and services are operating within configured safe thresholds.
                </div>
              ) : (
                alerts.map((al) => (
                  <div
                    key={al.id}
                    className="p-3 rounded-lg border border-amber-500/30 bg-amber-950/20 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-bold text-amber-300">
                      <span>{al.title}</span>
                      <span className="text-[10px] text-slate-500">{new Date(al.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-300 text-[11px]">{al.message}</p>
                    <div className="text-[10px] font-mono text-slate-500">
                      Current: {al.currentValue} | Threshold: {al.threshold}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Prometheus + Grafana Docker */}
      {activeTab === 'docker' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
              <Server className="w-4 h-4" />
              <span>Containerized Prometheus &amp; Grafana Stack</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              To archive and visualize long-term metrics in Grafana dashboards, run the pre-configured local Docker Compose stack. It binds persistent volumes to <code>prometheus_data</code> and <code>grafana_data</code> and scrapes Gina on port 3000/3200 every 5 seconds.
            </p>

            <div className="p-3 rounded-lg bg-black/60 border border-slate-800 font-mono text-xs text-cyan-300 flex items-center justify-between">
              <code>docker compose -f docker-compose.observability.yml up -d</code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText('docker compose -f docker-compose.observability.yml up -d');
                  setCopiedDockerCmd(true);
                  setTimeout(() => setCopiedDockerCmd(false), 2000);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] cursor-pointer"
              >
                {copiedDockerCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedDockerCmd ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-lg border border-slate-800 bg-[#11161d] space-y-1">
                <div className="text-xs font-bold text-slate-200">Prometheus Server</div>
                <div className="text-[11px] font-mono text-slate-400">Endpoint: http://localhost:9090</div>
                <div className="text-[10px] text-slate-500">Scrapes /metrics on host every 5s with 30-day TSDB retention.</div>
              </div>

              <div className="p-3 rounded-lg border border-slate-800 bg-[#11161d] space-y-1">
                <div className="text-xs font-bold text-slate-200">Grafana Dashboard</div>
                <div className="text-[11px] font-mono text-slate-400">Endpoint: http://localhost:3001</div>
                <div className="text-[10px] text-slate-500">Credentials: admin / gina_local_admin (pre-provisioned datasource).</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
