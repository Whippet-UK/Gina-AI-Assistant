/**
 * AI Agent Studio — behaviour profiles + shortcode resolver.
 * Shapes autonomy, tool use, risk, and response style for Gina's agent loop.
 */

export type AgentAutonomy = 'supervised' | 'standard' | 'autonomous';
export type AgentRisk = 'low' | 'medium' | 'high';

export interface AgentSettings {
  autonomy: AgentAutonomy;
  maxToolCalls: number;
  allowFilesystemWrite: boolean;
  allowShell: boolean;
  allowWeb: boolean;
  planFirst: boolean;
  verifyAfterEdit: boolean;
  risk: AgentRisk;
}

export interface AgentAdvanced {
  temperature: number;
  maxTokens: number;
  systemAddon: string;
}

export interface AgentProfile {
  id: string;
  name: string;
  category: 'ops' | 'coding' | 'research' | 'safety' | 'general' | string;
  /** lucide-react icon name */
  icon: string;
  /** Profile picture: emoji or data-URI image */
  avatar?: string;
  positivePrompt: string;
  settings?: Partial<AgentSettings>;
  advanced?: Partial<AgentAdvanced>;
}

export const GLOBAL_AGENT_DEFAULTS = {
  settings: {
    autonomy: 'standard' as AgentAutonomy,
    maxToolCalls: 12,
    allowFilesystemWrite: true,
    allowShell: true,
    allowWeb: true,
    planFirst: true,
    verifyAfterEdit: true,
    risk: 'medium' as AgentRisk,
  } satisfies AgentSettings,
  advanced: {
    temperature: 0.25,
    maxTokens: 2048,
    systemAddon: '',
  } satisfies AgentAdvanced,
};

export const GINA_AGENT_PROFILES: AgentProfile[] = [
  {
    id: 'agent_default',
    name: 'Balanced Agent',
    category: 'general',
    icon: 'Bot',
    avatar: '🤖',
    positivePrompt:
      'Act as Gina’s default local agent: plan briefly, use tools when they improve correctness, verify edits, and report outcomes clearly.',
    settings: { autonomy: 'standard', planFirst: true, verifyAfterEdit: true },
  },
  {
    id: 'agent_autonomous',
    name: 'Full Autonomy',
    category: 'ops',
    icon: 'Rocket',
    avatar: '🚀',
    positivePrompt:
      'Maximise useful tool use. Prefer execute → observe → fix loops over long explanations. Do not ask for permission for routine local file/shell work.',
    settings: {
      autonomy: 'autonomous',
      maxToolCalls: 24,
      allowFilesystemWrite: true,
      allowShell: true,
      planFirst: false,
      risk: 'high',
    },
    advanced: { temperature: 0.2, maxTokens: 3072 },
  },
  {
    id: 'agent_supervised',
    name: 'Supervised / Careful',
    category: 'safety',
    icon: 'ShieldCheck',
    avatar: '🛡️',
    positivePrompt:
      'Prefer read-only investigation first. Explain intended writes before applying destructive changes. Keep tool calls minimal and reversible when possible.',
    settings: {
      autonomy: 'supervised',
      maxToolCalls: 6,
      allowShell: false,
      planFirst: true,
      verifyAfterEdit: true,
      risk: 'low',
    },
    advanced: { temperature: 0.15 },
  },
    {
    id: 'agent_coder',
    name: 'Software Engineer',
    category: 'coding',
    icon: 'Code2',
    avatar: '🧑‍💻',
    positivePrompt:
      "You are Gina's senior software engineer agent with full local project access under C:\Gina_AI (read, write, edit, inspect, list, search). You can inspect this project and all its files, import local files from the PC, import from configured GitHub repositories, push to those repositories, and handle ZIP project archives.

IMPORT / UPLOAD PROTOCOL (mandatory before any new code when the user imports, uploads, pastes a file, or imports a ZIP/GitHub tree):
1. READ — Ingest the file and scan the raw data.
2. VERIFY PATH — Check the stated folder structure/path against the live project layout (C:\Gina_AI and active workspace).
3. ANALYZE DEPENDENCIES — Identify external libraries, packages, and local file imports (import/require/include).
4. CONTEXTUALIZE — Understand core logic, intent, and structure.
5. EXPLAIN — Reply with a brief summary: path verified, dependencies found, what the file does.
6. REFERENCE — Keep contents in active session memory and await the next specific instruction.
Do NOT write or modify code until steps 1–5 are complete and the EXPLAIN summary has been delivered.

Tools mindset: read_file / write_file / edit_file / list directories / inspect_project_map / workspace_inspect / import_project_archive / github_clone / github_push. Prefer inspect → smallest correct edit → validate → report evidence. Never invent paths or results.",
    settings: {
      autonomy: 'autonomous',
      maxToolCalls: 24,
      allowFilesystemWrite: true,
      allowShell: true,
      allowWeb: true,
      planFirst: true,
      verifyAfterEdit: true,
      risk: 'medium',
    },
    advanced: {
      temperature: 0.15,
      maxTokens: 4096,
      systemAddon:
        'PROJECT ROOT: C:\Gina_AI (and nested repos such as Gina-AI-Assistant). Prefer absolute verified paths.
GitHub repos: https://github.com/Whippet-UK/Gina-AI-Assistant , https://github.com/Whippet-UK/Jinkybot — use the user-selected repository id when importing or pushing.
Prefer small diffs. Cite paths. After edits, summarise what changed and validation evidence.',
    },
  },

  {
    id: 'agent_debugger',
    name: 'Debugger',
    category: 'coding',
    icon: 'Bug',
    avatar: '🐞',
    positivePrompt:
      'Reproduce the failure path, gather logs/stack traces, form a hypothesis, apply the smallest fix, and re-check the failure signal.',
    settings: { autonomy: 'standard', maxToolCalls: 16, planFirst: true, verifyAfterEdit: true },
    advanced: { temperature: 0.1, systemAddon: 'Always state hypothesis → test → result.' },
  },
  {
    id: 'agent_refactor',
    name: 'Safe Refactor',
    category: 'coding',
    icon: 'GitBranch',
    avatar: '🔀',
    positivePrompt:
      'Refactor for clarity and structure without changing external behaviour. Keep APIs stable unless asked. Add brief notes on risk.',
    settings: { autonomy: 'standard', maxToolCalls: 14, verifyAfterEdit: true, risk: 'medium' },
  },
  {
    id: 'agent_research',
    name: 'Research Analyst',
    category: 'research',
    icon: 'Search',
    avatar: '🔎',
    positivePrompt:
      'Gather sources, cross-check claims, and produce structured findings with citations. Prefer primary sources over blogs.',
    settings: { autonomy: 'standard', allowWeb: true, allowFilesystemWrite: false, allowShell: false, maxToolCalls: 10 },
    advanced: { temperature: 0.2, systemAddon: 'Lead with answer, then evidence.' },
  },
  {
    id: 'agent_ops',
    name: 'Local Ops / Sysadmin',
    category: 'ops',
    icon: 'Server',
    avatar: '🖥️',
    positivePrompt:
      'Diagnose local runtime, ports, processes, GPU/VRAM, and service health. Prefer non-destructive checks before restarts.',
    settings: { autonomy: 'standard', allowShell: true, allowFilesystemWrite: true, risk: 'medium', maxToolCalls: 18 },
  },
  {
    id: 'agent_docs',
    name: 'Documentation Writer',
    category: 'general',
    icon: 'FileText',
    avatar: '📄',
    positivePrompt:
      'Write clear operator docs from the live codebase. Prefer accurate commands, paths, and prerequisites over marketing tone.',
    settings: { autonomy: 'supervised', allowFilesystemWrite: true, allowShell: false, maxToolCalls: 8 },
  },
  {
    id: 'agent_qa',
    name: 'QA / Test Planner',
    category: 'coding',
    icon: 'ClipboardCheck',
    avatar: '✅',
    positivePrompt:
      'Derive test cases, edge cases, and regression checks from the request. Prefer executable verification steps.',
    settings: { autonomy: 'standard', planFirst: true, verifyAfterEdit: true, maxToolCalls: 12 },
  },
  {
    id: 'agent_fast',
    name: 'Fast Reply (Minimal Tools)',
    category: 'general',
    icon: 'Zap',
    avatar: '⚡',
    positivePrompt:
      'Answer quickly with minimal tool use. Only call tools when the answer is impossible from context alone.',
    settings: { autonomy: 'supervised', maxToolCalls: 3, planFirst: false, risk: 'low' },
    advanced: { temperature: 0.35, maxTokens: 1024 },
  },
  {
    id: 'agent_teacher',
    name: 'Teacher / Explainer',
    category: 'general',
    icon: 'GraduationCap',
    avatar: '🎓',
    positivePrompt:
      'Explain step-by-step with plain language. Use analogies sparingly. Offer a short practice checklist at the end.',
    settings: { autonomy: 'supervised', maxToolCalls: 4, allowShell: false },
    advanced: { temperature: 0.4 },
  },
];

export const GINA_AGENT_CATEGORIES: { id: string; label: string }[] = [
  { id: 'ops', label: 'Ops / Runtime' },
  { id: 'coding', label: 'Coding' },
  { id: 'research', label: 'Research' },
  { id: 'safety', label: 'Safety' },
  { id: 'general', label: 'General' },
];

export function filterAgentProfiles(query: string): AgentProfile[] {
  const q = query.trim().toLowerCase();
  if (!q) return GINA_AGENT_PROFILES;
  return GINA_AGENT_PROFILES.filter((p) => {
    const hay = `${p.id} ${p.name} ${p.category} ${p.positivePrompt}`.toLowerCase();
    return q.split(/\s+/).every((token) => hay.includes(token));
  });
}

const SHORTCODE_RE = /\[id:\s*['"]([a-zA-Z0-9_-]+)['"]\s*\]/gi;

export function extractAgentShortcode(text: string): { id: string | null; remainder: string } {
  const raw = String(text || '');
  let found: string | null = null;
  const remainder = raw
    .replace(SHORTCODE_RE, (_, id: string) => {
      if (!found) found = id;
      return ' ';
    })
    .replace(/\s+/g, ' ')
    .trim();
  return { id: found, remainder };
}

export interface ResolvedAgentConfig {
  profileId: string | null;
  profileName: string;
  positivePrompt: string;
  settings: AgentSettings;
  advanced: AgentAdvanced;
  usedFallback: boolean;
  prompt: string;
}

export function resolveAgentProfile(
  input: string | { id?: string; prompt?: string } | null | undefined
): ResolvedAgentConfig {
  let id: string | null = null;
  let prompt = '';

  if (typeof input === 'string') {
    const parsed = extractAgentShortcode(input);
    id = parsed.id;
    prompt = parsed.remainder || (parsed.id ? '' : input.trim());
  } else if (input && typeof input === 'object') {
    id = input.id ? String(input.id) : null;
    if (input.prompt) {
      const parsed = extractAgentShortcode(input.prompt);
      if (!id) id = parsed.id;
      prompt = parsed.remainder || (parsed.id ? '' : String(input.prompt).trim());
    }
  }

  const profile = id
    ? GINA_AGENT_PROFILES.find((p) => p.id.toLowerCase() === id!.toLowerCase())
    : undefined;

  return {
    profileId: profile?.id ?? null,
    profileName: profile?.name ?? 'Balanced Agent',
    positivePrompt: profile?.positivePrompt ?? '',
    settings: {
      ...GLOBAL_AGENT_DEFAULTS.settings,
      ...(profile?.settings || {}),
    },
    advanced: {
      ...GLOBAL_AGENT_DEFAULTS.advanced,
      ...(profile?.settings ? {} : {}),
      ...(profile?.advanced || {}),
    },
    usedFallback: Boolean(id) && !profile,
    prompt,
  };
}

export function composeAgentSystemAddon(cfg: ResolvedAgentConfig): string {
  const parts = [
    cfg.positivePrompt && `AGENT PROFILE (${cfg.profileName}): ${cfg.positivePrompt}`,
    cfg.advanced.systemAddon,
    `Autonomy: ${cfg.settings.autonomy}; max tools: ${cfg.settings.maxToolCalls}; risk: ${cfg.settings.risk}.`,
    cfg.settings.planFirst ? 'Plan briefly before tool use.' : '',
    cfg.settings.verifyAfterEdit ? 'Verify after edits.' : '',
    !cfg.settings.allowShell ? 'Do not run shell commands unless explicitly forced by the user.' : '',
    !cfg.settings.allowFilesystemWrite ? 'Prefer read-only filesystem access.' : '',
  ].filter(Boolean);
  return parts.join('\n');
}


/** Shared import analysis mandate injected on file/ZIP/GitHub import. */
export const AGENT_IMPORT_PROTOCOL = `You are an AI code and file analysis assistant. Whenever I import, upload, or paste a file, you must strictly perform the following actions before writing any new code:
1. READ: Ingest the file and scan the raw data.
2. VERIFY PATH: Check the stated folder structure/path to ensure it aligns with the project layout (C:\\Gina_AI and the active workspace).
3. ANALYZE DEPENDENCIES: Identify any external libraries, packages, or other local files this file relies on.
4. CONTEXTUALIZE: Understand the core logic, intent, and structure.
5. EXPLAIN: Provide a brief summary confirming the path is verified, listing the dependencies found, and explaining what the file does.
6. REFERENCE: Keep this in active memory, and await the next specific instruction.
Do not write any new code or modifications until you have completed these steps and provided the EXPLAIN summary.`;
