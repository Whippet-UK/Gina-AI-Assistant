export type AgentModelRole = 'general'|'coder'|'vision'|'repair'|'research';
export interface ModelRoute { role:AgentModelRole; modelHint:string|null; reason:string; maxTokens:number; requiresVision:boolean; requiresWeb:boolean; }

export function routeAgentModel(prompt:string, intent:string, opts:{hasImage?:boolean; availableModels?:string[]}={}): ModelRoute {
  const text=String(prompt||'');
  const hasImage=Boolean(opts.hasImage) || /\b(image|photo|picture|screenshot|vision|visual)\b/i.test(text);
  const coder=/\b(code|coding|typescript|javascript|python|component|function|bug|fix|edit|refactor|compile|build|test|repository|repo)\b/i.test(text) || intent==='code-task' || intent==='file-operation';
  const research=intent==='web-research' || /\b(research|documentation|latest|current|look up|search)\b/i.test(text);
  if (hasImage) return {role:'vision',modelHint:'qwen-vl',reason:'Image evidence is present or explicitly requested.',maxTokens:1536,requiresVision:true,requiresWeb:research};
  if (coder) return {role:'coder',modelHint:'qwen-coder',reason:'Software/project operation requires code-oriented reasoning.',maxTokens:2048,requiresVision:false,requiresWeb:research};
  if (research) return {role:'research',modelHint:'qwen-general',reason:'Research is grounded by server-side web tools; local model summarizes evidence.',maxTokens:1536,requiresVision:false,requiresWeb:true};
  return {role:'general',modelHint:'qwen-general',reason:'General conversation or lightweight reasoning.',maxTokens:1024,requiresVision:false,requiresWeb:false};
}
