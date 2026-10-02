import { mkdirSync, accessSync, constants, writeFileSync, readFileSync, existsSync } from 'node:fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

export interface TraceEvent {
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
  metadata?: Record<string, any>;
}

export interface AuditRecord {
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

export interface MetricSnapshot {
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

export interface AlertItem {
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

export interface AlertThresholds {
  vramWarningPct: number;
  vramCriticalPct: number;
  maxLatencyMs: number;
  maxErrorRatePct: number;
  rateLimitPerMinute: number;
}

class LocalObservabilityEngine {
  private traces: TraceEvent[] = [];
  private maxTraces = 500;
  private db: DatabaseSync | null = null;
  private dbPath: string = '';
  private subscribers: Set<(trace: TraceEvent) => void> = new Set();
  
  // Metrics accumulators
  private requestLatencies: number[] = [];
  private requestCount = 0;
  private errorCount = 0;
  private toolCount = 0;
  private tokenCount = 0;
  private lastMinuteRequests: number[] = [];
  
  // Rate limiting (IP -> timestamps)
  private ipRateLimits: Map<string, number[]> = new Map();

  // Thresholds
  public thresholds: AlertThresholds = {
    vramWarningPct: 85,
    vramCriticalPct: 92,
    maxLatencyMs: 3500,
    maxErrorRatePct: 5,
    rateLimitPerMinute: 600,
  };

  public activeAlerts: AlertItem[] = [];

  constructor() {
    this.initDatabase();
  }

  private initDatabase() {
    const root = process.env.GINA_ROOT || (process.platform === 'win32' ? 'C:\\Gina_AI' : process.cwd());
    const dataDir = path.join(root, 'data', 'observability');
    try {
      mkdirSync(dataDir, { recursive: true });
      this.dbPath = path.join(dataDir, 'observability.sqlite');
      this.db = new DatabaseSync(this.dbPath);
      
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id TEXT PRIMARY KEY,
          timestamp TEXT NOT NULL,
          actor TEXT NOT NULL,
          role TEXT NOT NULL,
          action TEXT NOT NULL,
          resource TEXT NOT NULL,
          status TEXT NOT NULL,
          ip TEXT NOT NULL,
          details TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);

        CREATE TABLE IF NOT EXISTS trace_history (
          id TEXT PRIMARY KEY,
          timestamp TEXT NOT NULL,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          target TEXT,
          command TEXT,
          code_snippet TEXT,
          duration_ms REAL,
          status TEXT NOT NULL,
          details TEXT,
          error TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_trace_timestamp ON trace_history(timestamp);
      `);
      console.log(`[ObservabilityEngine] Initialized SQLite audit & trace store at: ${this.dbPath}`);
    } catch (err: any) {
      console.warn('[ObservabilityEngine] Local SQLite initialization notice (in-memory mode active):', err?.message);
      this.db = null;
    }
  }

  /** Record a live execution trace event (command, file read/write, code snippet, etc.) */
  public recordTrace(trace: Omit<TraceEvent, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): TraceEvent {
    const event: TraceEvent = {
      id: trace.id || `trace-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: trace.timestamp || new Date().toISOString(),
      type: trace.type,
      title: trace.title,
      target: trace.target,
      command: trace.command,
      codeSnippet: trace.codeSnippet,
      durationMs: trace.durationMs,
      status: trace.status,
      details: trace.details,
      error: trace.error,
      metadata: trace.metadata,
    };

    this.traces.unshift(event);
    if (this.traces.length > this.maxTraces) {
      this.traces.pop();
    }

    if (event.type === 'tool_call' || event.type === 'command' || event.type === 'file_write') {
      this.toolCount++;
    }

    // Persist to SQLite asynchronously
    if (this.db) {
      try {
        const stmt = this.db.prepare(`
          INSERT INTO trace_history (id, timestamp, type, title, target, command, code_snippet, duration_ms, status, details, error)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
          event.id,
          event.timestamp,
          event.type,
          event.title,
          event.target || null,
          event.command || null,
          event.codeSnippet ? event.codeSnippet.slice(0, 10000) : null,
          event.durationMs ?? null,
          event.status,
          event.details || null,
          event.error || null
        );
      } catch {}
    }

    // Broadcast to live subscribers (WebSockets / SSE)
    for (const sub of this.subscribers) {
      try { sub(event); } catch {}
    }

    // Also broadcast to global comfy WebSocket if available
    try {
      const g = global as any;
      if (g.comfyWebSocketServer?.broadcast) {
        g.comfyWebSocketServer.broadcast({
          type: 'OBSERVABILITY_LIVE_TRACE',
          payload: event
        });
      }
    } catch {}

    return event;
  }

  /** Subscribe to live trace events */
  public subscribe(cb: (trace: TraceEvent) => void): () => void {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  }

  /** Query recent traces */
  public getRecentTraces(limit = 100, typeFilter?: string): TraceEvent[] {
    if (typeFilter && typeFilter !== 'all') {
      return this.traces.filter(t => t.type === typeFilter).slice(0, limit);
    }
    return this.traces.slice(0, limit);
  }

  /** Record an audit log event */
  public recordAudit(record: Omit<AuditRecord, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): AuditRecord {
    const entry: AuditRecord = {
      id: record.id || `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: record.timestamp || new Date().toISOString(),
      actor: record.actor || 'system',
      role: record.role || 'viewer',
      action: record.action,
      resource: record.resource,
      status: record.status,
      ip: record.ip || '127.0.0.1',
      details: record.details,
    };

    if (this.db) {
      try {
        const stmt = this.db.prepare(`
          INSERT INTO audit_logs (id, timestamp, actor, role, action, resource, status, ip, details)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
          entry.id,
          entry.timestamp,
          entry.actor,
          entry.role,
          entry.action,
          entry.resource,
          entry.status,
          entry.ip,
          entry.details || null
        );
      } catch (e: any) {
        console.warn('[ObservabilityEngine] Audit insert note:', e?.message);
      }
    }

    return entry;
  }

  /** Query audit logs with pagination and filters */
  public getAuditLogs(options?: { limit?: number; actor?: string; role?: string; status?: string }): AuditRecord[] {
    const limit = options?.limit || 100;
    if (!this.db) return [];
    try {
      let query = 'SELECT * FROM audit_logs WHERE 1=1';
      const params: any[] = [];
      if (options?.actor) {
        query += ' AND actor = ?';
        params.push(options.actor);
      }
      if (options?.role) {
        query += ' AND role = ?';
        params.push(options.role);
      }
      if (options?.status) {
        query += ' AND status = ?';
        params.push(options.status);
      }
      query += ' ORDER BY timestamp DESC LIMIT ?';
      params.push(limit);

      const stmt = this.db.prepare(query);
      return stmt.all(...params) as unknown as AuditRecord[];
    } catch {
      return [];
    }
  }

  /** Export audit logs as CSV or JSON */
  public exportAuditLogs(format: 'json' | 'csv' = 'json'): string {
    const logs = this.getAuditLogs({ limit: 1000 });
    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    }
    const headers = ['id', 'timestamp', 'actor', 'role', 'action', 'resource', 'status', 'ip', 'details'];
    const rows = logs.map(l => [
      l.id,
      l.timestamp,
      `"${l.actor.replace(/"/g, '""')}"`,
      l.role,
      `"${l.action.replace(/"/g, '""')}"`,
      `"${l.resource.replace(/"/g, '""')}"`,
      l.status,
      l.ip,
      `"${(l.details || '').replace(/"/g, '""')}"`
    ].join(','));
    return [headers.join(','), ...rows].join('\n');
  }

  /** Automated Archival of logs older than X days */
  public archiveOldLogs(days = 30): { archivedCount: number; archivePath?: string } {
    if (!this.db) return { archivedCount: 0 };
    try {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const countStmt = this.db.prepare('SELECT COUNT(*) as cnt FROM audit_logs WHERE timestamp < ?');
      const countRow: any = countStmt.get(cutoffDate);
      const count = Number(countRow?.cnt || 0);

      if (count > 0) {
        const root = process.env.GINA_ROOT || (process.platform === 'win32' ? 'C:\\Gina_AI' : process.cwd());
        const archiveDir = path.join(root, 'data', 'observability', 'archives');
        mkdirSync(archiveDir, { recursive: true });
        const archivePath = path.join(archiveDir, `audit_archive_${Date.now()}.json`);

        const oldLogs = this.db.prepare('SELECT * FROM audit_logs WHERE timestamp < ?').all(cutoffDate);
        writeFileSync(archivePath, JSON.stringify(oldLogs, null, 2));

        this.db.prepare('DELETE FROM audit_logs WHERE timestamp < ?').run(cutoffDate);
        this.db.prepare('DELETE FROM trace_history WHERE timestamp < ?').run(cutoffDate);

        this.recordAudit({
          actor: 'system_archiver',
          role: 'system',
          action: 'LOG_ARCHIVE',
          resource: archivePath,
          status: 'success',
          ip: '127.0.0.1',
          details: `Archived ${count} records older than ${days} days.`
        });

        return { archivedCount: count, archivePath };
      }
      return { archivedCount: 0 };
    } catch (err: any) {
      return { archivedCount: 0 };
    }
  }

  /** Rate limiter check */
  public checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetSec: number } {
    const now = Date.now();
    const windowMs = 60000;
    const limit = this.thresholds.rateLimitPerMinute;
    
    let timestamps = this.ipRateLimits.get(ip) || [];
    timestamps = timestamps.filter(t => now - t < windowMs);
    
    if (timestamps.length >= limit) {
      this.ipRateLimits.set(ip, timestamps);
      return { allowed: false, remaining: 0, resetSec: Math.ceil((windowMs - (now - timestamps[0])) / 1000) };
    }
    
    timestamps.push(now);
    this.ipRateLimits.set(ip, timestamps);
    return { allowed: true, remaining: limit - timestamps.length, resetSec: 60 };
  }

  /** Security anomaly & threat detection */
  public detectThreat(req: { path: string; query: any; body: any; ip: string }): { threat: boolean; reason?: string } {
    const raw = (req.path + ' ' + JSON.stringify(req.query || {}) + ' ' + JSON.stringify(req.body || {})).toLowerCase();
    
    // Directory traversal
    if (/\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\/|\.\.%2f/i.test(raw)) {
      this.recordAudit({
        actor: 'anonymous',
        role: 'viewer',
        action: 'SECURITY_THREAT_DETECTED',
        resource: req.path,
        status: 'denied',
        ip: req.ip,
        details: 'Path traversal attack pattern detected'
      });
      this.triggerAlert('critical', 'Security Threat: Path Traversal Attempt', `IP ${req.ip} attempted path traversal on ${req.path}`);
      return { threat: true, reason: 'Path traversal pattern detected' };
    }

    // Remote Code / Command Injection
    if (/;\s*(?:rm|del|shutdown|curl\s+http|wget\s+http|nc\s+-e|powershell\s+-enc)/i.test(raw)) {
      this.recordAudit({
        actor: 'anonymous',
        role: 'viewer',
        action: 'SECURITY_THREAT_DETECTED',
        resource: req.path,
        status: 'denied',
        ip: req.ip,
        details: 'Command injection attack pattern detected'
      });
      this.triggerAlert('critical', 'Security Threat: Command Injection Attempt', `IP ${req.ip} attempted command injection on ${req.path}`);
      return { threat: true, reason: 'Command injection pattern detected' };
    }

    return { threat: false };
  }

  /** Trigger an alert */
  public triggerAlert(severity: AlertItem['severity'], title: string, message: string, metric = 'system', currentValue = 0, threshold = 0) {
    const alert: AlertItem = {
      id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      severity,
      title,
      message,
      metric,
      currentValue,
      threshold,
      acknowledged: false,
    };
    this.activeAlerts.unshift(alert);
    if (this.activeAlerts.length > 50) this.activeAlerts.pop();

    this.recordTrace({
      type: 'security',
      title: `[ALERT: ${severity.toUpperCase()}] ${title}`,
      details: message,
      status: severity === 'critical' ? 'error' : 'running'
    });
  }

  /** Record HTTP request telemetry */
  public recordHttpRequest(durationMs: number, status: number) {
    this.requestCount++;
    this.requestLatencies.push(durationMs);
    if (this.requestLatencies.length > 500) this.requestLatencies.shift();
    if (status >= 400) this.errorCount++;

    const now = Date.now();
    this.lastMinuteRequests.push(now);
    this.lastMinuteRequests = this.lastMinuteRequests.filter(t => now - t < 60000);

    // Latency anomaly threshold check
    if (durationMs > this.thresholds.maxLatencyMs) {
      this.triggerAlert('warning', 'High Request Latency Detected', `Endpoint took ${durationMs.toFixed(0)}ms (threshold: ${this.thresholds.maxLatencyMs}ms)`, 'latency_ms', durationMs, this.thresholds.maxLatencyMs);
    }
  }

  /** Record LLM generation telemetry */
  public recordLlmGeneration(tokens: number, durationMs: number) {
    this.tokenCount += tokens;
    const tps = durationMs > 0 ? (tokens / (durationMs / 1000)) : 0;
    this.recordTrace({
      type: 'llm_generation',
      title: `Generated ${tokens} tokens (${tps.toFixed(1)} t/s)`,
      durationMs,
      status: 'success',
      details: `Inference duration: ${(durationMs / 1000).toFixed(2)}s · Total tokens: ${this.tokenCount}`
    });
  }

  /** Calculate current metrics snapshot */
  public getSnapshot(hardwareTelemetry?: any): MetricSnapshot {
    const sorted = [...this.requestLatencies].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p95LatencyMs = sorted[p95Index] || 0;
    const avgLatencyMs = sorted.length ? (sorted.reduce((a, b) => a + b, 0) / sorted.length) : 0;
    const qps = +(this.lastMinuteRequests.length / 60).toFixed(2);

    const vramUsed = Number(hardwareTelemetry?.vramUsedMB || 0);
    const vramTotal = Number(hardwareTelemetry?.vramTotalMB || 7372);
    const vramPct = vramTotal > 0 ? (vramUsed / vramTotal) * 100 : 0;

    // Check VRAM anomaly
    if (vramPct >= this.thresholds.vramCriticalPct) {
      if (!this.activeAlerts.some(a => a.metric === 'vram' && !a.acknowledged && Date.now() - new Date(a.timestamp).getTime() < 30000)) {
        this.triggerAlert('critical', 'Critical VRAM Pressure (>92%)', `VRAM at ${vramPct.toFixed(1)}% (${vramUsed}MB / ${vramTotal}MB)`, 'vram', vramPct, this.thresholds.vramCriticalPct);
      }
    } else if (vramPct >= this.thresholds.vramWarningPct) {
      if (!this.activeAlerts.some(a => a.metric === 'vram' && !a.acknowledged && Date.now() - new Date(a.timestamp).getTime() < 60000)) {
        this.triggerAlert('warning', 'High VRAM Usage Warning', `VRAM at ${vramPct.toFixed(1)}% (${vramUsed}MB / ${vramTotal}MB)`, 'vram', vramPct, this.thresholds.vramWarningPct);
      }
    }

    return {
      httpRequestsTotal: this.requestCount,
      httpErrorsTotal: this.errorCount,
      toolExecutionsTotal: this.toolCount,
      tokensGeneratedTotal: this.tokenCount,
      avgLatencyMs: Math.round(avgLatencyMs),
      p95LatencyMs: Math.round(p95LatencyMs),
      qps,
      vramUsedMB: vramUsed,
      vramTotalMB: vramTotal,
      ramUsedGB: Number(hardwareTelemetry?.ramUsedGB || 0),
      ramTotalGB: Number(hardwareTelemetry?.ramTotalGB || 32),
      cpuPercent: Number(hardwareTelemetry?.gpuUtilizationPercent || 0),
      alertsActive: this.activeAlerts.slice(0, 5),
    };
  }

  /** Render Prometheus formatted metrics exposition */
  public getPrometheusMetrics(hardware?: any): string {
    const snap = this.getSnapshot(hardware);
    const vramBytes = snap.vramUsedMB * 1024 * 1024;
    const vramTotalBytes = snap.vramTotalMB * 1024 * 1024;
    const ramBytes = snap.ramUsedGB * 1024 * 1024 * 1024;

    return `# HELP gina_http_requests_total Total number of HTTP requests processed by Gina Local Backend
# TYPE gina_http_requests_total counter
gina_http_requests_total ${snap.httpRequestsTotal}

# HELP gina_http_errors_total Total number of HTTP 4xx/5xx errors
# TYPE gina_http_errors_total counter
gina_http_errors_total ${snap.httpErrorsTotal}

# HELP gina_tool_executions_total Total number of agent tool actions (read/write/exec)
# TYPE gina_tool_executions_total counter
gina_tool_executions_total ${snap.toolExecutionsTotal}

# HELP gina_llm_tokens_generated_total Total LLM tokens generated across sessions
# TYPE gina_llm_tokens_generated_total counter
gina_llm_tokens_generated_total ${snap.tokensGeneratedTotal}

# HELP gina_http_request_duration_ms Average HTTP request duration in milliseconds
# TYPE gina_http_request_duration_ms gauge
gina_http_request_duration_ms{quantile="avg"} ${snap.avgLatencyMs}
gina_http_request_duration_ms{quantile="0.95"} ${snap.p95LatencyMs}

# HELP gina_qps Current queries per second
# TYPE gina_qps gauge
gina_qps ${snap.qps}

# HELP gina_vram_used_bytes GPU VRAM currently in use
# TYPE gina_vram_used_bytes gauge
gina_vram_used_bytes ${vramBytes}

# HELP gina_vram_total_bytes Total GPU VRAM capacity
# TYPE gina_vram_total_bytes gauge
gina_vram_total_bytes ${vramTotalBytes}

# HELP gina_ram_used_bytes System RAM currently in use
# TYPE gina_ram_used_bytes gauge
gina_ram_used_bytes ${ramBytes}

# HELP gina_active_alerts_total Number of active unacknowledged alerts
# TYPE gina_active_alerts_total gauge
gina_active_alerts_total ${this.activeAlerts.filter(a => !a.acknowledged).length}
`;
  }

  /** Generate OpenAPI 3.0.3 specification JSON */
  public getOpenApiSpec(): Record<string, any> {
    return {
      openapi: '3.0.3',
      info: {
        title: 'Gina AI Factory — Local Observability & Creator API',
        version: '1.20.21',
        description: 'Comprehensive, 100% local self-hosted REST API for observability, LLM execution, Prometheus metrics collection, audit logging, and tool execution.',
        contact: { name: 'Gina Local AI Engine', url: 'http://127.0.0.1:3000' }
      },
      servers: [
        { url: 'http://127.0.0.1:3000', description: 'Local Dev Server' },
        { url: 'http://127.0.0.1:3200', description: 'Windows Standalone Port' }
      ],
      paths: {
        '/metrics': {
          get: {
            summary: 'Prometheus Metrics Exposition Endpoint',
            description: 'Scraped by Prometheus and Grafana for metrics collection with persistent volume mapping.',
            responses: { '200': { description: 'Standard text/plain Prometheus metrics format' } }
          }
        },
        '/api/observability/metrics': {
          get: {
            summary: 'Observability Snapshot JSON',
            description: 'Returns real-time QPS, latencies, VRAM, RAM, and active alerts.',
            responses: { '200': { description: 'JSON metrics object' } }
          }
        },
        '/api/observability/traces': {
          get: {
            summary: 'Live Agent Execution Traces',
            description: 'Returns recent file read/write, code snippets, command execution, and test traces.',
            parameters: [
              { name: 'limit', in: 'query', schema: { type: 'integer', default: 100 } },
              { name: 'type', in: 'query', schema: { type: 'string', enum: ['all', 'command', 'file_read', 'file_write', 'test', 'security'] } }
            ],
            responses: { '200': { description: 'List of trace events' } }
          }
        },
        '/api/observability/audit': {
          get: {
            summary: 'System Audit Logs',
            description: 'Query audit logs for compliance, security checks, and activity monitoring.',
            responses: { '200': { description: 'List of audit records' } }
          }
        },
        '/api/observability/audit/export': {
          get: {
            summary: 'Export Audit Logs',
            description: 'Export audit logs as CSV or JSON for compliance record-keeping.',
            parameters: [{ name: 'format', in: 'query', schema: { type: 'string', enum: ['json', 'csv'] } }],
            responses: { '200': { description: 'Exported audit file' } }
          }
        },
        '/api/observability/alerts': {
          get: {
            summary: 'Active System Alerts & Thresholds',
            description: 'View active anomaly alerts and configure alert thresholds.',
            responses: { '200': { description: 'Alerts and thresholds' } }
          },
          post: {
            summary: 'Update Alert Thresholds',
            description: 'Set custom thresholds for VRAM, latency, error rates, and rate limiting.',
            requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
            responses: { '200': { description: 'Updated thresholds' } }
          }
        },
        '/api/observability/backup': {
          post: {
            summary: 'Automated Backup for Config & Metrics',
            description: 'Creates an atomic snapshot archive of configuration files and SQLite databases.',
            responses: { '200': { description: 'Backup archive created' } }
          }
        }
      }
    };
  }

  /** Create an automated backup of configuration and database files */
  public createBackup(): { success: boolean; backupFile?: string; sizeBytes?: number; error?: string } {
    try {
      const root = process.env.GINA_ROOT || (process.platform === 'win32' ? 'C:\\Gina_AI' : process.cwd());
      const backupDir = path.join(root, 'data', 'backups');
      mkdirSync(backupDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(backupDir, `gina_config_backup_${timestamp}.json`);

      const configManifest: Record<string, any> = {
        timestamp: new Date().toISOString(),
        version: '1.20.21',
        thresholds: this.thresholds,
        auditLogCount: this.getAuditLogs({ limit: 1 }).length,
        tracesCount: this.traces.length,
        systemSpecs: {
          node: process.version,
          platform: process.platform,
          arch: process.arch
        }
      };

      // Read package.json and metadata.json if present
      const pkgPath = path.join(process.cwd(), 'package.json');
      if (existsSync(pkgPath)) {
        try { configManifest.packageJson = JSON.parse(readFileSync(pkgPath, 'utf-8')); } catch {}
      }
      const metaPath = path.join(process.cwd(), 'metadata.json');
      if (existsSync(metaPath)) {
        try { configManifest.metadata = JSON.parse(readFileSync(metaPath, 'utf-8')); } catch {}
      }

      const content = JSON.stringify(configManifest, null, 2);
      writeFileSync(backupFile, content, 'utf-8');

      this.recordAudit({
        actor: 'admin',
        role: 'admin',
        action: 'AUTOMATED_BACKUP',
        resource: backupFile,
        status: 'success',
        ip: '127.0.0.1',
        details: `Backup snapshot created (${content.length} bytes)`
      });

      return { success: true, backupFile, sizeBytes: content.length };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Backup failed' };
    }
  }
}

export const observabilityEngine = new LocalObservabilityEngine();
