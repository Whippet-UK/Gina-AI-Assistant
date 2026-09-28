/**
 * Agent model routing for Gina low-VRAM multi-port layout.
 *
 * Ports (Start_Local_LLM.bat + Start_Utility_Agents.bat):
 *   8080  Qwen3.5-9B          — central orchestrator (no mmproj / early-fusion)
 *   8081  Qwen2.5-Coder-7B    — self-healing / code repair
 *   8082  Qwen2.5-VL-7B       — visual diagnostics (+ mmproj-F16)
 */

export type AgentModelRole = 'general' | 'coder' | 'vision' | 'repair' | 'research';

export interface ModelEndpoint {
  id: string;
  role: AgentModelRole;
  /** llama-server base URL */
  baseUrl: string;
  port: number;
  modelFile: string;
  /** Empty string = no projector (QWEN35 early-fusion / coder) */
  visionProjectorPath: string;
  hasVisionAdapter: boolean;
  contextSize: number;
  maxTokensDefault: number;
}

export interface ModelRoute {
  role: AgentModelRole;
  modelHint: string | null;
  reason: string;
  maxTokens: number;
  requiresVision: boolean;
  requiresWeb: boolean;
  /** Resolved endpoint when multi-port pool is active */
  endpoint?: ModelEndpoint;
}

/** Catalog of parallel local engines — do not point orchestrator at a missing mmproj. */
export const AGENT_MODEL_CATALOG: Record<string, ModelEndpoint> = {
  qwen35: {
    id: 'qwen35',
    role: 'general',
    baseUrl: 'http://127.0.0.1:8080',
    port: 8080,
    modelFile: 'Qwen3.5-9B-Q4_K_M.gguf',
    visionProjectorPath: '',
    hasVisionAdapter: false,
    contextSize: 8192,
    maxTokensDefault: 1024
  },
  'qwen-coder': {
    id: 'qwen-coder',
    role: 'coder',
    baseUrl: 'http://127.0.0.1:8081',
    port: 8081,
    modelFile: 'qwen2.5-coder-7b-instruct-q5_k_m.gguf',
    visionProjectorPath: '',
    hasVisionAdapter: false,
    contextSize: 16384,
    maxTokensDefault: 2048
  },
  'qwen-vl': {
    id: 'qwen-vl',
    role: 'vision',
    baseUrl: 'http://127.0.0.1:8082',
    port: 8082,
    modelFile: 'Qwen2.5-VL-7B-Instruct-Q4_K_M.gguf',
    visionProjectorPath: 'C:\\Gina_AI\\models\\llm\\mmproj-F16.gguf',
    hasVisionAdapter: true,
    contextSize: 8192,
    maxTokensDefault: 1536
  },
  'qwen-general': {
    id: 'qwen-general',
    role: 'general',
    baseUrl: 'http://127.0.0.1:8080',
    port: 8080,
    modelFile: 'Qwen3.5-9B-Q4_K_M.gguf',
    visionProjectorPath: '',
    hasVisionAdapter: false,
    contextSize: 8192,
    maxTokensDefault: 1024
  }
};

export function getEndpointForHint(modelHint: string | null | undefined): ModelEndpoint {
  const key = String(modelHint || 'qwen35').toLowerCase();
  if (key.includes('coder') || key === 'repair') return AGENT_MODEL_CATALOG['qwen-coder'];
  if (key.includes('vl') || key.includes('vision')) return AGENT_MODEL_CATALOG['qwen-vl'];
  if (key.includes('35') || key.includes('general')) return AGENT_MODEL_CATALOG.qwen35;
  return AGENT_MODEL_CATALOG.qwen35;
}

export function routeAgentModel(
  prompt: string,
  intent: string,
  opts: { hasImage?: boolean; availableModels?: string[] } = {}
): ModelRoute {
  const text = String(prompt || '');
  const hasImage = Boolean(opts.hasImage) || /\\b(image|photo|picture|screenshot|vision|visual)\\b/i.test(text);
  const coder =
    /\\b(code|coding|typescript|javascript|python|component|function|bug|fix|edit|refactor|compile|build|test|repository|repo)\\b/i.test(text) ||
    intent === 'code-task' ||
    intent === 'file-operation';
  const research = intent === 'web-research' || /\\b(research|documentation|latest|current|look up|search)\\b/i.test(text);

  if (hasImage) {
    const endpoint = AGENT_MODEL_CATALOG['qwen-vl'];
    return {
      role: 'vision',
      modelHint: 'qwen-vl',
      reason: 'Image evidence is present or explicitly requested — route to VL utility on :8082.',
      maxTokens: endpoint.maxTokensDefault,
      requiresVision: true,
      requiresWeb: research,
      endpoint
    };
  }
  if (coder) {
    const endpoint = AGENT_MODEL_CATALOG['qwen-coder'];
    return {
      role: 'coder',
      modelHint: 'qwen-coder',
      reason: 'Software/project operation — route to Coder utility on :8081.',
      maxTokens: endpoint.maxTokensDefault,
      requiresVision: false,
      requiresWeb: research,
      endpoint
    };
  }
  if (research) {
    const endpoint = AGENT_MODEL_CATALOG.qwen35;
    return {
      role: 'research',
      modelHint: 'qwen-general',
      reason: 'Research is grounded by server-side web tools; QWEN35 on :8080 summarizes evidence.',
      maxTokens: 1536,
      requiresVision: false,
      requiresWeb: true,
      endpoint
    };
  }
  const endpoint = AGENT_MODEL_CATALOG.qwen35;
  return {
    role: 'general',
    modelHint: 'qwen-general',
    reason: 'General conversation — QWEN35 orchestrator on :8080 (no vision projector).',
    maxTokens: endpoint.maxTokensDefault,
    requiresVision: false,
    requiresWeb: false,
    endpoint
  };
}
