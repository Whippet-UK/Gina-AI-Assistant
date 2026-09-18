export type PromptTelemetrySource = 'local' | 'web' | 'local+web';

export interface PromptTelemetryRecord {
  id?: string;
  suite?: string;
  source: PromptTelemetrySource;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  maxTokens?: number;
  contextSize?: number;
  durationMs: number;
  tokensPerSecond?: number;
  promptTokensPerSecond?: number;
  completionTokensPerSecond?: number;
  firstTokenLatencyMs?: number | null;
  iteration?: number | null;
  toolCalls?: number;
  contextBreakdown?: Record<string, number>;
  webSearched?: boolean;
  webProvider?: string | null;
  success?: boolean;
  timestamp?: string;
}

export interface TelemetryTotals {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  durationMs: number;
  toolCalls: number;
  webRequests: number;
  successes: number;
}

export interface TelemetrySnapshot {
  requestCount: number;
  latest: PromptTelemetryRecord | null;
  totals: TelemetryTotals;
  history: PromptTelemetryRecord[];
}

export function estimateTokens(content: any): number {
  if (!content) return 0;
  if (typeof content === 'string') {
    return Math.max(1, Math.ceil(content.length / 4));
  }
  if (Array.isArray(content)) {
    let total = 0;
    for (const item of content) {
      total += estimateTokens(item?.content || item);
    }
    return Math.max(1, total);
  }
  try {
    return Math.max(1, Math.ceil(JSON.stringify(content).length / 4));
  } catch {
    return 1;
  }
}

export class RuntimeTelemetry {
  private history: PromptTelemetryRecord[] = [];
  private totals: TelemetryTotals = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    durationMs: 0,
    toolCalls: 0,
    webRequests: 0,
    successes: 0
  };
  private requestCount = 0;
  private latest: PromptTelemetryRecord | null = null;

  recordPrompt(record: PromptTelemetryRecord): PromptTelemetryRecord {
    this.requestCount++;
    const fullRecord: PromptTelemetryRecord = {
      ...record,
      id: record.id || Math.random().toString(36).substring(2, 10),
      timestamp: record.timestamp || new Date().toISOString()
    };
    this.latest = fullRecord;
    this.history.unshift(fullRecord);
    if (this.history.length > 100) {
      this.history.pop();
    }

    this.totals.promptTokens += Number(record.promptTokens || 0);
    this.totals.completionTokens += Number(record.completionTokens || 0);
    this.totals.totalTokens += Number(record.totalTokens || 0);
    this.totals.durationMs += Number(record.durationMs || 0);
    this.totals.toolCalls += Number(record.toolCalls || 0);
    if (record.webSearched || record.source === 'web' || record.source === 'local+web') {
      this.totals.webRequests++;
    }
    if (record.success !== false) {
      this.totals.successes++;
    }

    return fullRecord;
  }

  getSnapshot(): TelemetrySnapshot {
    return {
      requestCount: this.requestCount,
      latest: this.latest,
      totals: { ...this.totals },
      history: [...this.history]
    };
  }

  reset() {
    this.history = [];
    this.totals = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      durationMs: 0,
      toolCalls: 0,
      webRequests: 0,
      successes: 0
    };
    this.requestCount = 0;
    this.latest = null;
  }
}

export const runtimeTelemetry = new RuntimeTelemetry();
