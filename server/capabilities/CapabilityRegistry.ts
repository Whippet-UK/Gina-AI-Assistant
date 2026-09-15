import fs from 'fs/promises';
import path from 'path';

export type CapabilityState = 'available' | 'unavailable' | 'failed' | 'unknown';
export type CapabilityMode = 'act' | 'answer' | 'clarify';

export interface CapabilityRecord {
  id: string;
  label: string;
  category: string;
  state: CapabilityState;
  tool?: string;
  evidence?: string;
  lastChecked?: string;
  lastSuccess?: string;
  lastFailure?: string;
  failureReason?: string;
  actionPolicy: 'prefer-execute' | 'explain-only' | 'confirm-first';
}

export interface CapabilityPlan {
  mode: CapabilityMode;
  intent: string;
  requiredCapabilities: string[];
  availableCapabilities: string[];
  unavailableCapabilities: string[];
  recommendedActions: string[];
  reason: string;
}

const TOOL_CAPABILITIES: Record<string, Omit<CapabilityRecord, 'state'>> = {
  read_file:{id:'filesystem.read',label:'Read local files',category:'filesystem',tool:'read_file',evidence:'runtime broker',actionPolicy:'prefer-execute'},
  read_text_file:{id:'filesystem.read_text',label:'Read complete UTF-8 text files',category:'filesystem',tool:'read_text_file',evidence:'runtime broker',actionPolicy:'prefer-execute'},
  read_media_file:{id:'filesystem.read_media',label:'Read local media as typed binary content',category:'filesystem',tool:'read_media_file',evidence:'runtime broker',actionPolicy:'prefer-execute'},
  read_multiple_files:{id:'filesystem.read_multiple',label:'Read multiple local files in one operation',category:'filesystem',tool:'read_multiple_files',evidence:'runtime broker',actionPolicy:'prefer-execute'},

  write_file:{id:'filesystem.write',label:'Create or modify local files',category:'filesystem',tool:'write_file',evidence:'runtime broker',actionPolicy:'prefer-execute'},
  patch_file:{id:'filesystem.patch',label:'Apply focused edits to local files',category:'filesystem',tool:'patch_file',evidence:'runtime broker',actionPolicy:'prefer-execute'},
  edit_file:{id:'filesystem.edit',label:'Apply structured multi-edit file changes with dry-run diff',category:'filesystem',tool:'edit_file',evidence:'runtime broker',actionPolicy:'prefer-execute'},
  create_directory:{id:'filesystem.mkdir',label:'Create local directories',category:'filesystem',tool:'create_directory',evidence:'runtime broker',actionPolicy:'prefer-execute'},
  list_directory_with_sizes:{id:'filesystem.list_sizes',label:'List directory entries with sizes',category:'filesystem',tool:'list_directory_with_sizes',evidence:'runtime broker',actionPolicy:'prefer-execute'},
  move_file:{id:'filesystem.move',label:'Move or rename local files and directories',category:'filesystem',tool:'move_file',evidence:'runtime broker',actionPolicy:'confirm-first'},
  directory_tree:{id:'filesystem.tree',label:'Build recursive directory trees',category:'filesystem',tool:'directory_tree',evidence:'runtime broker',actionPolicy:'prefer-execute'},
  get_file_info:{id:'filesystem.info',label:'Inspect local file metadata',category:'filesystem',tool:'get_file_info',evidence:'runtime broker',actionPolicy:'prefer-execute'},
  list_allowed_directories:{id:'filesystem.allowed_roots',label:'List directories the agent may access',category:'filesystem',tool:'list_allowed_directories',evidence:'runtime broker',actionPolicy:'prefer-execute'},

  list_directory:{id:'filesystem.list',label:'List local directories',category:'filesystem',tool:'list_directory',evidence:'runtime broker',actionPolicy:'prefer-execute'},
  search_files:{id:'filesystem.search',label:'Search project files',category:'filesystem',tool:'search_files',evidence:'runtime broker',actionPolicy:'prefer-execute'},
  read_project_bundle:{id:'project.context',label:'Load project context bundle',category:'project',tool:'read_project_bundle',evidence:'runtime broker',actionPolicy:'prefer-execute'},
  execute_command:{id:'execution.command',label:'Execute local commands',category:'execution',tool:'execute_command',evidence:'runtime broker',actionPolicy:'prefer-execute'},
  validate_project:{id:'project.validate',label:'Run project validation',category:'engineering',tool:'validate_project',evidence:'runtime broker',actionPolicy:'prefer-execute'},
  project_integrity_check:{id:'project.integrity',label:'Run project integrity gate',category:'engineering',tool:'project_integrity_check',evidence:'runtime broker',actionPolicy:'prefer-execute'},
  run_repair_loop:{id:'engineering.repair',label:'Run autonomous repair loop',category:'engineering',tool:'run_repair_loop',evidence:'runtime broker',actionPolicy:'prefer-execute'},
  git_status:{id:'git.status',label:'Inspect Git status',category:'git',tool:'git_status',evidence:'runtime broker',actionPolicy:'prefer-execute'},
  git_diff:{id:'git.diff',label:'Inspect Git diff',category:'git',tool:'git_diff',evidence:'runtime broker',actionPolicy:'prefer-execute'},
  git_commit:{id:'git.commit',label:'Create Git commits',category:'git',tool:'git_commit',evidence:'runtime broker',actionPolicy:'confirm-first'},
  github_clone:{id:'github.clone',label:'Clone GitHub repositories',category:'github',tool:'github_clone',evidence:'runtime broker',actionPolicy:'confirm-first'},
  github_push:{id:'github.push',label:'Push Git changes',category:'github',tool:'github_push',evidence:'runtime broker',actionPolicy:'confirm-first'},
  create_github_pr:{id:'github.pull_request',label:'Create GitHub pull requests',category:'github',tool:'create_github_pr',evidence:'runtime broker',actionPolicy:'confirm-first'},
  web_search:{id:'web.search',label:'Search the public web',category:'network',tool:'web_search',evidence:'server broker',actionPolicy:'prefer-execute'},
  web_fetch:{id:'web.fetch',label:'Fetch a public web page',category:'network',tool:'web_fetch',evidence:'server broker',actionPolicy:'prefer-execute'},
  web_research:{id:'web.research',label:'Research the public web',category:'network',tool:'web_research',evidence:'server broker',actionPolicy:'prefer-execute'},
  network_test:{id:'network.diagnostic',label:'Test public internet connectivity',category:'network',tool:'network_test',evidence:'server broker',actionPolicy:'prefer-execute'},
  inspect_system:{id:'system.inspect',label:'Inspect local runtime and hardware',category:'system',tool:'inspect_system',evidence:'runtime broker',actionPolicy:'prefer-execute'},
  inspect_capabilities:{id:'capabilities.inspect',label:'Inspect Gina capability registry',category:'system',tool:'inspect_capabilities',evidence:'runtime broker',actionPolicy:'prefer-execute'},
  inspect_project_map:{id:'project.map',label:'Inspect project dependency/surface map',category:'project',tool:'inspect_project_map',evidence:'runtime broker',actionPolicy:'prefer-execute'},
  verify_definition_of_done:{id:'project.definition_of_done',label:'Run Definition-of-Done gate',category:'engineering',tool:'verify_definition_of_done',evidence:'runtime broker',actionPolicy:'prefer-execute'},
  research_docs:{id:'research.documentation',label:'Research current technical documentation',category:'research',tool:'research_docs',evidence:'server research broker',actionPolicy:'prefer-execute'},
  verify_compatibility:{id:'research.compatibility',label:'Verify package/code compatibility',category:'research',tool:'verify_compatibility',evidence:'server research broker',actionPolicy:'prefer-execute'},
  comfy_clear_cache:{id:'comfy.memory.purge',label:'Purge ComfyUI model memory safely',category:'hardware',tool:'comfy_clear_cache',evidence:'runtime broker',actionPolicy:'prefer-execute'},
  llm_start:{id:'llm.start',label:'Start local LLM runtime',category:'ai',tool:'llm_start',evidence:'runtime broker',actionPolicy:'prefer-execute'},
  llm_stop:{id:'llm.stop',label:'Stop local LLM runtime',category:'ai',tool:'llm_stop',evidence:'runtime broker',actionPolicy:'confirm-first'},
  llm_restart:{id:'llm.restart',label:'Restart local LLM runtime',category:'ai',tool:'llm_restart',evidence:'runtime broker',actionPolicy:'prefer-execute'},
  remember:{id:'memory.write',label:'Store durable project memory',category:'memory',tool:'remember',evidence:'runtime broker',actionPolicy:'prefer-execute'},
  recall_memory:{id:'memory.read',label:'Recall durable project memory',category:'memory',tool:'recall_memory',evidence:'runtime broker',actionPolicy:'prefer-execute'},
  knowledge_search:{id:'knowledge.search',label:'Search learned and project knowledge',category:'knowledge',tool:'knowledge_search',evidence:'local knowledge base + RAG',actionPolicy:'prefer-execute'},
};

const PLAN_RULES: Array<{intent:string; mode:CapabilityMode; match:RegExp; capabilities:string[]; actions:string[]}> = [
  {intent:'network-diagnostic',mode:'act',match:/\b(ping|network access|internet access|internet connection|network connection|connectivity|test (?:the )?(?:network|internet)|online access)\b/i,capabilities:['network.diagnostic'],actions:['network_test']},
  {intent:'file-read',mode:'act',match:/\b(read|open|inspect|show|look at|list|find|search)\b.*(?:\bfile\b|\bsource\b|\bcode\b|\bfolder\b|\bdirectory\b|\blocal\b|\bproject\b)/i,capabilities:['filesystem.read','filesystem.search'],actions:['search_files','read_file']},
  {intent:'code-change',mode:'act',match:/^(?!.*\b(?:how do i|how can i|what is|explain|show me how)\b).*\b(?:fix|edit|modify|change|update|patch|repair|implement|refactor|rewrite|replace|remove|delete|create|make|write|save|rename|move|copy|add|append|prepend)\b.*(?:\bcode\b|\bfile\b|\bcomponent\b|\bfunction\b|\bbug\b|\berror\b|\bproject\b|\brepo(?:sitory)?\b|\btypescript\b|\bjavascript\b|\breact\b|\bserver\b|\bui\b|\bsource\b|\bimplementation\b|(?:src|server|docs|scripts|public|app|components|tests?)[\\/]\b[\w.-]+\.(?:ts|tsx|js|jsx|json|md|css|html|py|bat|ps1|txt)\b)/i,capabilities:['filesystem.read','filesystem.write','project.validate','project.integrity'],actions:['search_files','read_file','patch_file','write_file','validate_project','project_integrity_check','git_diff']},
  {intent:'run-command',mode:'act',match:/\b(run|execute|launch)\b.*\b(command|script|npm|pnpm|yarn|python|powershell|git|test|build|lint)\b/i,capabilities:['execution.command'],actions:['execute_command']},
  {intent:'git-operation',mode:'act',match:/\b(git status|git diff|commit|branch|push|pull request|pull-request|clone)\b/i,capabilities:['git.status','git.diff'],actions:['git_status','git_diff']},
  {intent:'web-research',mode:'act',match:/\b(search the web|search online|look(?: it)? up|browse|latest|current|news|headlines|release notes|documentation|docs|price|weather)\b/i,capabilities:['web.search'],actions:['web_search']},
  {intent:'knowledge-query',mode:'act',match:/\b(what did you learn|what have you learned|what do you remember about|search your knowledge|search learned knowledge|what have we learned)\b/i,capabilities:['knowledge.search'],actions:['knowledge_search']},
  {intent:'capability-query',mode:'answer',match:/\b(what can you|what are you able to|what can gina|your abilities|your capabilities|can you (?:read|write|edit|modify|access|run|execute|search|browse)|do you have access)\b/i,capabilities:['capabilities.inspect'],actions:['inspect_capabilities']},
];

function journalPath(root:string){ return path.join(root,'.gina','capabilities','history.jsonl'); }

export function buildCapabilityRegistry(contract:any, root:string, localInventory?:any): {generatedAt:string; version:1; capabilities:CapabilityRecord[]; summary:any; localInventory?:any} {
  const registered = new Set<string>(Array.isArray(contract?.registeredTools) ? contract.registeredTools : []);
  const capabilities:CapabilityRecord[] = Object.entries(TOOL_CAPABILITIES).map(([tool, meta]) => ({
    ...meta,
    state: registered.has(tool) ? 'available' : 'unavailable',
    lastChecked: new Date().toISOString(),
  }));
  const available = capabilities.filter(c=>c.state==='available').length;
  const failed = capabilities.filter(c=>c.state==='failed').length;
  return {generatedAt:new Date().toISOString(),version:1,capabilities,localInventory,summary:{total:capabilities.length,available,unavailable:capabilities.length-available-failed,failed,fullLocalAccess:Boolean(contract?.fullLocalAccess),webAccess:Boolean(contract?.network?.publicHttps),source:'runtime broker + local inventory'}};
}

export function planCapabilityIntent(text:string, registry:{capabilities:CapabilityRecord[]}): CapabilityPlan {
  const q=String(text||'').trim();
  const pathLike=/(?:^|[\s"'])(?:[A-Za-z]:[\\/]|\.?\.?[\\/]|(?:src|server|docs|scripts|public|app|components|tests?)[\\/])[^\s"'`]+|\b[\w.-]+\.(?:ts|tsx|js|jsx|mjs|cjs|json|md|css|html|py|bat|ps1|txt)\b/i.test(q);
  const actionLike=/\b(?:edit|modify|change|update|patch|repair|fix|implement|refactor|rewrite|replace|remove|delete|create|make|write|save|rename|move|copy|add|append|prepend)\b/i.test(q);
  const instructional=/^(?:how|why|what is|what are|explain|tell me how|show me how|can you explain|could you explain)\b/i.test(q);
  const rule=PLAN_RULES.find(r=>r.match.test(q));
  const effectiveRule=rule || (actionLike && pathLike && !instructional ? PLAN_RULES.find(r=>r.intent==='code-change') : undefined);
  if(!effectiveRule) return {mode:'answer',intent:'general-question',requiredCapabilities:[],availableCapabilities:[],unavailableCapabilities:[],recommendedActions:[],reason:'No executable capability pattern was detected; answer normally.'};
  const state=new Map(registry.capabilities.map(c=>[c.id,c.state]));
  const available=effectiveRule.capabilities.filter(id=>state.get(id)==='available');
  const unavailable=effectiveRule.capabilities.filter(id=>state.get(id)!=='available');
  const mode=unavailable.length ? 'clarify' : effectiveRule.mode;
  return {mode,intent:effectiveRule.intent,requiredCapabilities:effectiveRule.capabilities,availableCapabilities:available,unavailableCapabilities:unavailable,recommendedActions:effectiveRule.actions,reason:unavailable.length?`Required capabilities are not all registered: ${unavailable.join(', ')}`:`Runtime registry confirms the required capabilities are available; prefer execution over generic instructions.`};
}

export async function recordCapabilityOutcome(root:string, tool:string, success:boolean, result?:any): Promise<void> {
  try {
    const file=journalPath(root); await fs.mkdir(path.dirname(file),{recursive:true});
    const entry={timestamp:new Date().toISOString(),tool,success,state:success?'success':'failed',resultPreview:JSON.stringify(result||{}).slice(0,1200)};
    await fs.appendFile(file,JSON.stringify(entry)+'\n','utf8');
  } catch {}
}

export async function readCapabilityHistory(root:string, limit=100):Promise<any[]> {
  try { const raw=await fs.readFile(journalPath(root),'utf8'); return raw.trim().split(/\r?\n/).slice(-Math.max(1,limit)).map(x=>JSON.parse(x)).reverse(); } catch { return []; }
}

export function capabilityPrompt(registry:any): string {
  return `\nCAPABILITY INTELLIGENCE — MACHINE VERIFIED:\n${JSON.stringify(registry,null,2)}\n\nMANDATORY CAPABILITY BEHAVIOUR:\n- The runtime registry is the source of truth for what Gina can actually do.\n- If a requested capability is AVAILABLE, prefer using the registered broker action instead of giving the user generic instructions.\n- Never confuse FAILED with UNAVAILABLE. A failed execution means the capability exists but the operation failed.\n- Never claim SUCCESS without tool evidence.\n- For code/project work use inspect/read -> plan -> edit -> validate -> integrity check -> diff -> report.\n- For a capability question, report the verified registry rather than generic AI limitations.\n- Local LLM inference does not mean the Gina runtime is offline; the server may broker filesystem, command, Git and public web/network operations.\n`;
}
