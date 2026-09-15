export type ToolSelectionMode = 'act' | 'answer' | 'clarify';

export interface ToolCandidate {
  action: string;
  score: number;
  reason: string;
  risk: 'read' | 'write' | 'execute' | 'network' | 'system';
}

export interface ToolSelection {
  mode: ToolSelectionMode;
  intent: string;
  selected: ToolCandidate[];
  allowedActions: string[];
  budget: number;
  confidence: number;
}

const TOOL_RULES: Array<{ actions: string[]; terms: RegExp[]; reason: string; risk: ToolCandidate['risk']; weight: number }> = [
  { actions:['read_text_file','read_file','get_file_info'], terms:[/\b(read|open|inspect|show|view)\b/i, /\.(ts|tsx|js|jsx|json|md|css|py|bat|ps1|yml|yaml)\b/i], reason:'source/file inspection', risk:'read', weight:8 },
  { actions:['edit_file','patch_file','write_file','read_text_file','get_file_info','validate_project','project_integrity_check','git_diff'], terms:[/\b(edit|change|modify|update|fix|patch|rewrite|refactor)\b/i, /\b(file|code|component|function|bug|error)\b/i], reason:'code/file change', risk:'write', weight:10 },
  { actions:['create_directory','write_file','get_file_info'], terms:[/\b(create|make|add)\b/i, /\b(directory|folder|file)\b/i], reason:'create filesystem item', risk:'write', weight:7 },
  { actions:['search_files','directory_tree','list_directory','list_directory_with_sizes','get_file_info','read_multiple_files'], terms:[/\b(find|search|locate|where|references|files|folder|directory|tree)\b/i], reason:'project discovery', risk:'read', weight:9 },
  { actions:['execute_command','validate_project'], terms:[/\b(run|execute|test|build|compile|lint|npm|pnpm|yarn|powershell|command)\b/i], reason:'command/validation', risk:'execute', weight:10 },
  { actions:['web_search','web_research','web_fetch'], terms:[/\b(web|internet|online|search|look up|latest|current|news|documentation|docs|github)\b/i], reason:'public web research', risk:'network', weight:9 },
  { actions:['network_test'], terms:[/\b(internet|network|connectivity|connection|online access|access the internet)\b/i, /\btest\b/i], reason:'network diagnostic', risk:'network', weight:10 },
  { actions:['knowledge_search','remember','recall_memory'], terms:[/\b(remember|memory|learned|knowledge|what did we decide|preference)\b/i], reason:'persistent knowledge', risk:'read', weight:9 },
  { actions:['git_status','git_diff','git_workspace_diff','git_log','git_branch','git_commit'], terms:[/\bgit\b/i, /\b(commit|branch|diff|repository|repo|status)\b/i], reason:'git repository operation', risk:'execute', weight:9 },
  { actions:['github_clone','github_sync','github_push','create_github_pr'], terms:[/\bgithub\b/i, /\bclone|pull|push|pull request|pr\b/i], reason:'GitHub operation', risk:'network', weight:10 },
  { actions:['inspect_system','inspect_capabilities','comfy_clear_cache','llm_start','llm_stop','llm_restart'], terms:[/\b(system|hardware|gpu|vram|cpu|model|llm|comfy|comfyui)\b/i], reason:'runtime/system operation', risk:'system', weight:7 },
  { actions:['read_media_file'], terms:[/\b(image|photo|picture|audio|video|media)\b/i], reason:'media inspection', risk:'read', weight:7 },
  { actions:['remember'], terms:[/\bremember this|remember that|save this|keep this in mind\b/i], reason:'store durable memory', risk:'write', weight:12 },
];

const ALWAYS_CONTEXT = ['inspect_capabilities','inspect_project_context','read_text_file','get_file_info'];

export function selectAgentTools(userPrompt: string, intent = 'code-task', previousActions: string[] = []): ToolSelection {
  const text = String(userPrompt || '').trim();
  const scores = new Map<string, { score:number; reasons:string[]; risk:ToolCandidate['risk'] }>();
  const add = (action:string, score:number, reason:string, risk:ToolCandidate['risk']) => {
    const existing = scores.get(action) || { score:0, reasons:[], risk };
    existing.score += score;
    if (!existing.reasons.includes(reason)) existing.reasons.push(reason);
    scores.set(action, existing);
  };

  for (const rule of TOOL_RULES) {
    const hits = rule.terms.filter(term => term.test(text)).length;
    if (!hits) continue;
    for (const action of rule.actions) add(action, rule.weight * hits, rule.reason, rule.risk);
  }

  // Intent is authoritative when deterministic routing already classified the request.
  if (intent === 'web-research') for (const a of ['web_search','web_research','web_fetch']) add(a, 20, 'runtime intent', 'network');
  if (intent === 'network-diagnostic') add('network_test', 25, 'runtime intent', 'network');
  if (intent === 'file-operation' || intent === 'code-task') for (const a of ['read_text_file','edit_file','validate_project','project_integrity_check']) add(a, 14, 'runtime intent', a.includes('edit') ? 'write' : 'read');
  if (intent === 'knowledge-query') for (const a of ['knowledge_search','remember','recall_memory']) add(a, 20, 'runtime intent', 'read');
  if (intent === 'capability-query') for (const a of ['inspect_capabilities','inspect_system']) add(a, 20, 'runtime intent', 'system');

  // Prevent immediate repetition unless the previous call was a read needed for a write.
  for (const action of previousActions.slice(-2)) {
    const item = scores.get(action);
    if (item) item.score -= 8;
  }

  for (const action of ALWAYS_CONTEXT) add(action, 2, 'safe context tool', 'read');

  const ranked = [...scores.entries()]
    .map(([action, value]) => ({ action, score: Math.max(0, value.score), reason: value.reasons.join('; '), risk:value.risk }))
    .filter(x => x.score > 0)
    .sort((a,b) => b.score - a.score || a.action.localeCompare(b.action));

  const mode: ToolSelectionMode = intent === 'general-chat' ? 'answer' : (intent === 'capability-query' || intent === 'knowledge-query' || intent === 'web-research' || intent === 'network-diagnostic' || intent === 'code-task' || intent === 'file-operation') ? 'act' : 'clarify';
  const domainAllow: Record<string,string[]|undefined> = {
    'web-research':['web_search','web_research','web_fetch'],
    'network-diagnostic':['network_test'],
    'knowledge-query':['knowledge_search','remember','recall_memory'],
    'capability-query':['inspect_capabilities','inspect_system'],
    'code-task':['read_text_file','read_file','read_multiple_files','search_files','get_file_info','edit_file','patch_file','write_file','create_directory','directory_tree','list_directory','list_directory_with_sizes','execute_command','validate_project','project_integrity_check','git_status','git_diff','git_workspace_diff','git_log','git_branch','git_commit'],
    'file-operation':['read_text_file','read_file','read_multiple_files','search_files','get_file_info','edit_file','patch_file','write_file','create_directory','directory_tree','list_directory','list_directory_with_sizes','move_file'],
  };
  const filtered = domainAllow[intent] ? ranked.filter(x => domainAllow[intent]!.includes(x.action)) : ranked;
  const maxTools = mode === 'act' ? (intent === 'code-task' || intent === 'file-operation' ? 10 : 6) : 5;
  const selected = filtered.slice(0, maxTools);
  const confidence = selected.length ? Math.min(0.99, Math.max(0.35, selected[0].score / 30)) : 0.2;
  const budget = mode === 'act' ? (intent === 'code-task' || intent === 'file-operation' ? 12 : 6) : 0;

  return { mode, intent, selected, allowedActions: selected.map(x => x.action), budget, confidence };
}

export function formatToolSelection(selection: ToolSelection): string {
  if (selection.mode === 'answer') return 'TOOL ROUTER: answer directly; no execution tools are required.';
  return `TOOL ROUTER: expose only these relevant executable actions for this step (do not invent others):\n${selection.selected.map(t => `- ${t.action} — ${t.reason}`).join('\n')}\nTool-call budget for this task: ${selection.budget}. Routing confidence: ${selection.confidence.toFixed(2)}.`;
}
