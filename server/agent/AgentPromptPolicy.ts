export interface AgentPromptPolicy {
  mode: 'act'|'answer'|'clarify';
  taskType: 'code'|'file'|'web'|'network'|'knowledge'|'capability'|'chat';
  explicitTargets: string[];
  destructive: boolean;
  modelProfile: 'coder'|'vision'|'general';
}

const PATH_RE = /(?:[A-Za-z]:[\\/][^\s"'`]+|(?:\.?\.?[\\/]|(?:src|server|docs|scripts|public|app|components|tests?)[\\/])[^\s"'`]+|\b[\w.-]+\.(?:ts|tsx|js|jsx|mjs|cjs|json|md|css|html|py|bat|ps1|txt)\b)/gi;
const ACTION_RE = /\b(?:edit|modify|change|update|patch|repair|fix|implement|refactor|rewrite|replace|remove|delete|create|make|build|scaffold|develop|write|save|rename|move|copy|add|append|prepend|run|execute|test|commit|push|clone)\b/i;
const EXPLAIN_RE = /^(?:how|why|what is|what are|explain|tell me how|show me how|can you explain|could you explain)\b/i;

export function extractExplicitTargets(text:string): string[] {
  const seen = new Set<string>();
  for (const match of String(text||'').matchAll(PATH_RE)) { const value=String(match[0]).replace(/[),.;:]+$/,''); if(value) seen.add(value); }
  return [...seen].slice(0,20);
}

export function buildAgentPromptPolicy(text:string, modelName:string, taskType:AgentPromptPolicy['taskType']='code'): AgentPromptPolicy {
  const q=String(text||'').trim();
  const explicitTargets=extractExplicitTargets(q);
  const model=/coder|code/i.test(modelName)?'coder':/vl|vision|multimodal/i.test(modelName)?'vision':'general';
  const destructive=/\b(delete|remove|overwrite|replace|rename|move|push|commit)\b/i.test(q);
  const mode=EXPLAIN_RE.test(q) && !ACTION_RE.test(q.slice(0,120)) ? 'answer' : ACTION_RE.test(q) ? 'act' : 'clarify';
  return {mode,taskType,explicitTargets,destructive,modelProfile:model};
}

export function autonomousEngineeringContract(policy:AgentPromptPolicy): string {
  const modelRule = policy.modelProfile==='coder'
    ? 'MODEL PROFILE: coding-first local model. Prefer precise file/tool reasoning and compact JSON; do not waste tokens explaining basic coding concepts.'
    : policy.modelProfile==='vision'
      ? 'MODEL PROFILE: vision-capable local model. Use image evidence when supplied, but for code tasks use the same deterministic tool contract as a coding model.'
      : 'MODEL PROFILE: general local text model. Keep reasoning compact and rely on tools for repository facts rather than guessing.';
  return `\nAUTONOMOUS ENGINEERING CONTRACT — HARD RULES\n${modelRule}\n- This is an EXECUTION task. Do not teach the user how to perform the requested operation; perform it.\n- Answer only after the requested operation has been attempted.\n- For code/file changes: inspect target -> read relevant code -> make the smallest correct edit -> validate -> inspect diff/integrity -> report exact result.\n- Never invent file contents, paths, test results, tool results, or capabilities.\n- A tool failure means the capability exists but the operation failed; diagnose and retry when safe.\n- Do not stop after reading when the user asked for an edit.\n- Do not declare completion after WRITE_FILE alone. Validation and diff/integrity evidence are required.\n- Preserve unrelated code and existing project conventions. Do not replace an entire file when a focused edit is sufficient.\n- If the requested target is explicit, use that exact target unless runtime evidence proves it does not exist.\n- If ambiguity remains after inspection, ask one focused clarification rather than editing a guessed file.\n- Destructive operations require explicit user intent; do not silently broaden scope.\n- Keep tool parameters compact. Put large source content only in write_file when a focused patch is not possible.\n- FINAL RESPONSE: concise factual summary of actions, files changed, validation result, and any remaining blocker.\n${policy.explicitTargets.length ? `EXPLICIT TARGETS: ${policy.explicitTargets.join(', ')}` : 'EXPLICIT TARGETS: none; discover the correct target before editing.'}\n`;
}
