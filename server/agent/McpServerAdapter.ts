import { getToolCatalog, getToolDefinition, type AgentToolDefinition } from './AgentToolCatalog.js';

export interface McpAdapterOptions {
  execute: (action: string, parameters: Record<string, any>) => Promise<any>;
  isEnabled: () => boolean;
  requiresApproval: (action: string) => boolean;
  requestApproval: (action: string, parameters: Record<string, any>, reason: string) => Promise<any>;
  getApproval?: (id: string) => Promise<any>;
  maxResultChars?: number;
}

const PROTOCOL_VERSION = '2025-06-18';
const DEFAULT_MAX_RESULT_CHARS = 30000;

function jsonRpc(id: any, result: any) { return { jsonrpc: '2.0', id, result }; }
function jsonRpcError(id: any, code: number, message: string, data?: any) {
  return { jsonrpc: '2.0', id, error: { code, message, ...(data === undefined ? {} : { data }) } };
}

function toJsonSchema(def: AgentToolDefinition) {
  const properties: Record<string, any> = {};
  const required: string[] = [];
  for (const [name, parameter] of Object.entries(def.parameters || {})) {
    const type = parameter.type === 'string[]' || parameter.type === 'edit[]' ? 'array' : parameter.type === 'number' ? 'number' : parameter.type === 'boolean' ? 'boolean' : 'string';
    properties[name] = {
      type,
      description: parameter.description,
      ...(parameter.type === 'string[]' ? { items: { type: 'string' } } : {}),
      ...(parameter.type === 'edit[]' ? { items: { type: 'object', properties: { oldText: { type: 'string' }, newText: { type: 'string' } }, required: ['oldText', 'newText'], additionalProperties: false } } : {})
    };
    if (parameter.required) required.push(name);
  }
  return { type: 'object', properties, required, additionalProperties: false };
}

function annotations(def: AgentToolDefinition) {
  const destructive = def.risk === 'write' || def.risk === 'execute' || def.risk === 'system';
  const openWorld = def.risk === 'network';
  return {
    readOnlyHint: !destructive,
    destructiveHint: destructive,
    idempotentHint: def.action.startsWith('read_') || def.action.startsWith('inspect_') || def.action.includes('search') || def.action === 'get_file_info' || def.action === 'list_allowed_directories',
    openWorldHint: openWorld
  };
}

function validateArguments(def: AgentToolDefinition, input: any) {
  const args = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const errors: string[] = [];
  for (const [name, parameter] of Object.entries(def.parameters || {})) {
    const value = args[name];
    if (parameter.required && (value === undefined || value === null || value === '')) errors.push(`Missing required parameter: ${name}`);
    if (value === undefined || value === null) continue;
    if (parameter.type === 'string' && typeof value !== 'string') errors.push(`${name} must be a string`);
    if (parameter.type === 'number' && typeof value !== 'number') errors.push(`${name} must be a number`);
    if (parameter.type === 'boolean' && typeof value !== 'boolean') errors.push(`${name} must be a boolean`);
    if ((parameter.type === 'string[]' || parameter.type === 'edit[]') && !Array.isArray(value)) errors.push(`${name} must be an array`);
  }
  return errors;
}

function compactResult(value: any, maxChars: number) {
  const raw = typeof value === 'string' ? value : JSON.stringify(value);
  if (raw.length <= maxChars) return { value, truncated: false, raw };
  const clipped = raw.slice(0, Math.max(0, maxChars - 180));
  return { value: { truncated: true, preview: clipped, originalChars: raw.length, hint: 'Result was clipped by Gina MCP context protection. Use tool parameters such as maxResults/head/tail where supported.' }, truncated: true, raw: clipped };
}

export interface McpTelemetrySample {
  id: string;
  timestamp: string;
  action: string;
  durationMs: number;
  ok: boolean;
}

export class McpServerAdapter {
  private readonly maxResultChars: number;
  private readonly telemetry: McpTelemetrySample[] = [];
  private requestCount = 0;
  private errorCount = 0;

  constructor(private readonly options: McpAdapterOptions) {
    this.maxResultChars = options.maxResultChars || DEFAULT_MAX_RESULT_CHARS;
  }

  getTelemetry() {
    return {
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      history: [...this.telemetry]
    };
  }

  getTools() {
    return getToolCatalog().map(def => ({
      name: def.action,
      title: def.title,
      description: `${def.description} This tool executes through Gina's local broker; it does not grant access beyond Gina's configured policy.`,
      inputSchema: toJsonSchema(def),
      outputSchema: { type: 'object', additionalProperties: true },
      annotations: annotations(def),
      _meta: { category: def.category, risk: def.risk, approval: def.approval, deterministicIntents: def.deterministicIntents }
    }));
  }

  async handle(request: any) {
    const id = request?.id ?? null;
    if (!request || request.jsonrpc !== '2.0' || typeof request.method !== 'string') return jsonRpcError(id, -32600, 'Invalid JSON-RPC request.');
    try {
      switch (request.method) {
        case 'initialize':
          return jsonRpc(id, { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'Gina AI Factory MCP Server', version: '1.20.8' } });
        case 'notifications/initialized':
          return id === null ? undefined : jsonRpc(id, {});
        case 'ping':
          return jsonRpc(id, {});
        case 'tools/list':
          return jsonRpc(id, { tools: this.getTools() });
        case 'tools/call':
          return await this.callTool(id, request.params || {});
        default:
          return jsonRpcError(id, -32601, `Unsupported MCP method: ${request.method}`);
      }
    } catch (error: any) {
      return jsonRpcError(id, -32603, error?.message || 'MCP server error.');
    }
  }

  private async callTool(id: any, params: any) {
    if (!this.options.isEnabled()) return jsonRpcError(id, -32001, 'Gina full local agent access is disabled. Enable it before using MCP tools.');
    const name = String(params?.name || '').trim();
    const def = getToolDefinition(name);
    if (!def) return jsonRpcError(id, -32602, `Unknown Gina tool: ${name}`);
    const args = params?.arguments && typeof params.arguments === 'object' ? params.arguments : {};
    const validationErrors = validateArguments(def, args);
    if (validationErrors.length) return jsonRpcError(id, -32602, 'Invalid tool arguments.', { action: name, errors: validationErrors, inputSchema: toJsonSchema(def) });
    if (this.options.requiresApproval(name)) {
      const approvalId = typeof params?._meta?.approvalId === 'string' ? params._meta.approvalId : '';
      const existing = approvalId && this.options.getApproval ? await this.options.getApproval(approvalId) : null;
      if (!existing || existing.action !== name || existing.status !== 'approved') {
        const approval = await this.options.requestApproval(name, args, 'MCP tool execution requires explicit Gina approval. Approve it in Gina before retrying this MCP call with _meta.approvalId.');
        return jsonRpc(id, { content: [{ type: 'text', text: JSON.stringify({ requiresApproval: true, approval }) }], isError: true, structuredContent: { requiresApproval: true, approval } });
      }
    }
    const startedAt = Date.now();
    this.requestCount += 1;
    try {
      const result = await this.options.execute(name, args);
      const compacted = compactResult(result, this.maxResultChars);
      this.recordTelemetry(name, Date.now() - startedAt, true);
      return jsonRpc(id, {
        content: [{ type: 'text', text: compacted.raw }],
        structuredContent: compacted.value,
        isError: false,
        _meta: { action: name, truncated: compacted.truncated }
      });
    } catch (error: any) {
      const message = error?.message || String(error);
      this.errorCount += 1;
      this.recordTelemetry(name, Date.now() - startedAt, false);
      return jsonRpc(id, { content: [{ type: 'text', text: message }], isError: true, structuredContent: { ok: false, action: name, error: message, actionable: true, hint: 'Inspect the error, correct the tool arguments or capability state, then retry.' } });
    }
  }

  private recordTelemetry(action: string, durationMs: number, ok: boolean) {
    this.telemetry.unshift({
      id: `mcp_${Date.now()}_${this.telemetry.length}`,
      timestamp: new Date().toISOString(),
      action,
      durationMs,
      ok
    });
    if (this.telemetry.length > 120) this.telemetry.pop();
  }
}
