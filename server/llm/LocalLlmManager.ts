import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { loadAgentSkills, getActiveAgentSkillsPrompt } from "../agent/AgentSkillLoader";
import { estimateTokens, runtimeTelemetry, PromptTelemetrySource } from "../telemetry/RuntimeTelemetry";
import { getLocalLlmModel, LOCAL_LLM_MODELS, type LocalLlmEngine } from "./LocalLlmModelCatalog";
export type { LocalLlmEngine };

export interface LocalLlmConfig {
  executablePath: string;
  modelPath: string;
  host: string;
  port: number;
  gpuLayers: number;
  contextSize: number;
  threads: number;
  timeoutMs: number;
  mmprojPath?: string;
}

export interface LocalLlmStatus {
  configured: boolean;
  running: boolean;
  ready: boolean;
  pid: number | null;
  port: number;
  modelPath: string;
  modelName: string;
  gpuLayers: number;
  contextSize: number;
  threads: number;
  backend: "CUDA" | "unknown";
  lastError: string | null;
  startedAt: string | null;
  recentLog: string[];
  multimodal: boolean;
  mmprojPath: string | null;
  engine: LocalLlmEngine;
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: any };
type ImageAttachment = { name: string; mime: string; localPath: string };

function envNumber(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : fallback;
}

function normalizeChatMessages(messages: ChatMessage[], hardFallback = false): ChatMessage[] {
  const source = Array.isArray(messages) ? messages : [];
  const systemParts: string[] = [];
  const turns: ChatMessage[] = [];
  for (const message of source) {
    if (!message || !["system", "user", "assistant"].includes(message.role)) continue;
    const content = typeof message.content === "string" ? message.content.replace(/\u0000/g, "").trim() : message.content;
    if (typeof content === "string" && !content) continue;
    if (message.role === "system") { systemParts.push(String(content)); continue; }
    const previous = turns[turns.length - 1];
    if (previous && previous.role === message.role && typeof previous.content === "string" && typeof content === "string") previous.content = `${previous.content}\n\n${content}`;
    else turns.push({ role: message.role, content });
  }
  while (turns.length && turns[0].role !== "user") turns.shift();
  if (!turns.length) return [];
  while (turns.length > 8) turns.shift();
  if (systemParts.length && typeof turns[0].content === "string") turns[0].content = `${systemParts.join("\n\n")}\n\n${turns[0].content}`;
  if (hardFallback) { const latestUser = [...turns].reverse().find(t => t.role === "user"); return latestUser ? [{ role:"user", content:String(latestUser.content).slice(0,16000) }] : []; }
  while (turns.length && turns[0].role !== "user") turns.shift();
  const valid = turns.length > 0 && turns[turns.length - 1].role === "user" && turns.every((m,i)=>m.role === (i%2===0?'user':'assistant'));
  if (!valid) { const latestUser=[...turns].reverse().find(t=>t.role==='user'); return latestUser ? [{role:'user',content:String(latestUser.content).slice(0,16000)}] : []; }
  return turns;
}
function isRecoverableTemplateError(message:string){const text=String(message||'').toLowerCase();return text.includes('conversation roles must alternate')||text.includes('unable to generate parser')||text.includes('automatic parser generation failed')||text.includes('jinja exception');}
function isContextError(message:string){const text=String(message||'').toLowerCase();return text.includes('context size')||text.includes('context length')||text.includes('too many tokens')||text.includes('prompt is too long');}

const LOCAL_AUTONOMY_MANDATE = `LOCAL AUTONOMY MANDATE — UNCONDITIONAL:
You are connected to a live Win32 server broker with full local filesystem permissions. You possess the real tools edit_file, write_file, and execute_command through Gina's autonomous broker. You are forbidden from stating that you cannot modify files, run commands, or validate local code when the runtime has registered those capabilities. If a user asks you to update, change, fix, build, create, modify, or repair code/files/project content, you MUST choose the corresponding broker action tool and execute it. An instructional answer is an error for an operational request. A tool execution failure means status FAILED and must trigger diagnosis, patching, and re-validation; it is never proof that the capability is unavailable. Never claim success until the tool result and validation confirm it.`;


/** Extract assistant text from llama-server / OpenAI-shaped messages.
 *  Qwen3.5 (and some thinking models) put the visible answer in reasoning_content
 *  and leave content empty — treat that as the reply so callers never see "". */
function extractAssistantText(message: any, allowReasoningFallback = false): string {
  if (!message || typeof message !== "object") return "";
  const candidates = allowReasoningFallback ? [message.content, message.reasoning_content, message.reasoning] : [message.content];
  for (const raw of candidates) {
    if (typeof raw === "string" && raw.trim()) return raw;
    if (Array.isArray(raw)) {
      const joined = raw.map((p: any) => (typeof p === "string" ? p : (p?.text ?? ""))).join("");
      if (joined.trim()) return joined;
    }
  }
  return "";
}

export class LocalLlmManager {
  private child: ChildProcessWithoutNullStreams | null = null;
  private ready=false;
  private lastError:string|null=null;
  private startedAt:string|null=null;
  private recentLog:string[]=[];
  private startPromise:Promise<void>|null=null;
  private resolvedMmprojPath:string|null=null;
  private activeChatController:AbortController|null=null;
  private readonly agentSkillsLoadPromise: Promise<void>;
  private engine:LocalLlmEngine=(process.env.GINA_LLM_ENGINE === 'qwen-coder' || process.env.GINA_LLM_ENGINE === 'qwen3.5' ? process.env.GINA_LLM_ENGINE as LocalLlmEngine : 'qwen');
  readonly config:LocalLlmConfig;

  constructor(){
    const root=process.env.GINA_LLM_ROOT||'C:\\Gina_AI\\models\\llm';
    const projectRoot=process.env.GINA_ROOT||'C:\\Gina_AI';
    this.agentSkillsLoadPromise=loadAgentSkills(projectRoot).then(()=>undefined).catch((error:any)=>{
      this.appendDiagnostic(`AGENT SKILL LOAD ERROR: ${error?.message||String(error)}`);
    });
    const toolsRoot=process.env.GINA_LLAMA_ROOT||'C:\\Gina_AI\\tools\\llama.cpp';
    const configuredModel=process.env.GINA_LLM_MODEL||'';
    const executablePath=process.env.GINA_LLM_EXE||path.join(toolsRoot,'llama-server.exe');
    const model=getLocalLlmModel(this.engine);
    this.config={executablePath,modelPath:configuredModel||path.join(root,model.modelFile),host:process.env.GINA_LLM_HOST||'127.0.0.1',port:envNumber('GINA_LLM_PORT',8080),gpuLayers:envNumber('GINA_LLM_GPU_LAYERS',model.defaultGpuLayers),contextSize:envNumber('GINA_LLM_CONTEXT',model.defaultContextSize),threads:envNumber('GINA_LLM_THREADS',6),timeoutMs:envNumber('GINA_LLM_TIMEOUT_MS',300000),mmprojPath:process.env.GINA_LLM_MMPROJ||undefined};
  }

  private defaultModelPath(root:string,engine:LocalLlmEngine){return path.join(root,getLocalLlmModel(engine).modelFile);}

  private defaultMmprojPath(root:string,engine:LocalLlmEngine){const file=getLocalLlmModel(engine).mmprojFile;return file?path.join(root,file):null;}
  private isKnownIncompatibleMmproj(engine:LocalLlmEngine, candidate:string|null|undefined):boolean{
    if(!candidate) return false;
    if(engine !== 'qwen3.5') return false;
    // mmproj-F16.gguf is the Qwen 2.5-VL 7B projector (n_embd = 3584). Qwen3.5-9B's official
    // config reports n_embd = 4096, matched by mmproj-BF16.gguf, so the F16 file must never be
    // auto-paired with the qwen3.5 engine even if it is found alongside the model.
    return /^mmproj-F16\.gguf$/i.test(path.basename(candidate));
  }

  private effectiveGpuLayers(engine:LocalLlmEngine):number{
    return Number(process.env.GINA_LLM_GPU_LAYERS)>0 ? envNumber('GINA_LLM_GPU_LAYERS',getLocalLlmModel(engine).defaultGpuLayers) : getLocalLlmModel(engine).defaultGpuLayers;
  }

  private async syncPersistedEnginePreference(){
    if(this.child && !this.child.killed) return;
    const root=process.env.GINA_ROOT||'C:\\Gina_AI';
    const memoryPath=path.join(root,'.gina','agent-memory.json');
    try{
      const parsed=JSON.parse(await fs.readFile(memoryPath,'utf8'));
      const entries=Array.isArray(parsed?.entries)?parsed.entries:[];
      const preference=entries.find((entry:any)=>entry?.key==='local_llm_engine'&&(entry?.value==='qwen'||entry?.value==='qwen-coder'||entry?.value==='qwen3.5'));
      const preferred=preference?.value as LocalLlmEngine|undefined;
      if(preferred && preferred!==this.engine){
        this.engine=preferred;
        const modelRoot=process.env.GINA_LLM_ROOT||'C:\\Gina_AI\\models\\llm';
        this.config.modelPath=process.env.GINA_LLM_MODEL||this.defaultModelPath(modelRoot,preferred);
        this.config.gpuLayers=this.effectiveGpuLayers(preferred);
        this.config.contextSize=getLocalLlmModel(preferred).defaultContextSize;
        this.config.mmprojPath=undefined;
        this.resolvedMmprojPath=null;
        this.appendDiagnostic(`ENGINE PREFERENCE SYNC: ${preferred}`);
      }
    }catch{}
  }

  getEngine():LocalLlmEngine{return this.engine;}
  getModelSelection(){return { engine:this.engine, modelPath:this.config.modelPath, modelName:path.basename(this.config.modelPath), mmprojPath:this.resolvedMmprojPath, multimodal:!!this.resolvedMmprojPath };}
  async setEngine(engine:LocalLlmEngine):Promise<LocalLlmStatus>{
    if(!(engine in LOCAL_LLM_MODELS)) throw new Error(`Unsupported local LLM engine. Use one of: ${Object.keys(LOCAL_LLM_MODELS).join(', ')}.`);
    if(this.child&&!this.child.killed)await this.stop();
    this.engine=engine;
    const root=process.env.GINA_LLM_ROOT||'C:\\Gina_AI\\models\\llm';
    this.config.modelPath=process.env.GINA_LLM_MODEL||this.defaultModelPath(root,engine);
    this.config.gpuLayers=this.effectiveGpuLayers(engine);
    this.config.contextSize=envNumber('GINA_LLM_CONTEXT',getLocalLlmModel(engine).defaultContextSize);
    this.config.mmprojPath=undefined;
    this.resolvedMmprojPath=null;
    return this.status(await this.isConfigured());
  }

  private async resolveModelPath():Promise<string>{
    if(process.env.GINA_LLM_MODEL){this.config.modelPath=process.env.GINA_LLM_MODEL;return this.config.modelPath;}
    const directExists=await fs.stat(this.config.modelPath).then(s=>s.isFile()).catch(()=>false);
    if(directExists)return this.config.modelPath;
    const root=path.dirname(this.config.modelPath);
    try{
      const files=await fs.readdir(root);
      for(const pattern of getLocalLlmModel(this.engine).modelPatterns){
        const match=files.find(n=>pattern.test(n)&&!/mmproj/i.test(n));
        if(match){this.config.modelPath=path.join(root,match);return this.config.modelPath;}
      }
    }catch{}
    return this.config.modelPath;
  }

  private async resolveMmprojPath():Promise<string|null>{
    const profile=getLocalLlmModel(this.engine);
    if(!profile.multimodal){ this.resolvedMmprojPath=null; return null; }
    if(this.config.mmprojPath){
      if(this.isKnownIncompatibleMmproj(this.engine,this.config.mmprojPath)){
        this.resolvedMmprojPath=null;
        this.appendDiagnostic(`MMProj compatibility guard: ignored incompatible ${path.basename(this.config.mmprojPath)} for Qwen3.5-9B (expects mmproj-BF16.gguf, 4096 hidden size); starting text-only until a matched projector is installed.`);
        return null;
      }
      this.resolvedMmprojPath=await fs.stat(this.config.mmprojPath).then(s=>s.isFile()?this.config.mmprojPath!:null).catch(()=>null);
      return this.resolvedMmprojPath;
    }
    const root=path.dirname(this.config.modelPath);
    const exact=this.defaultMmprojPath(root,this.engine);
    if(exact && !this.isKnownIncompatibleMmproj(this.engine,exact)){
      const exists=await fs.stat(exact).then(s=>s.isFile()).catch(()=>false);
      if(exists){this.resolvedMmprojPath=exact;return exact;}
    }
    try{
      const files=await fs.readdir(root);
      const patterns=profile.mmprojPatterns||[/mmproj.*\.gguf$/i];
      const match=patterns.flatMap(pattern=>files.filter(n=>pattern.test(n)))
        .find(n=>!this.isKnownIncompatibleMmproj(this.engine,n));
      this.resolvedMmprojPath=match?path.join(root,match):null;
      return this.resolvedMmprojPath;
    }catch{return null;}
  }

  async getStatus():Promise<LocalLlmStatus>{await this.syncPersistedEnginePreference();const configured=await this.isConfigured();await this.resolveMmprojPath();if(this.child&&!this.child.killed)this.ready=await this.checkHealth();else this.ready=false;return this.status(configured);}
  async isConfigured():Promise<boolean>{await this.resolveModelPath();const [exe,model]=await Promise.all([fs.stat(this.config.executablePath).then(s=>s.isFile()).catch(()=>false),fs.stat(this.config.modelPath).then(s=>s.isFile()).catch(()=>false)]);return exe&&model;}

  async start():Promise<LocalLlmStatus>{
    await this.syncPersistedEnginePreference();
    if(this.child&&!this.child.killed){await this.waitForReady(5000).catch(()=>undefined);return this.status(await this.isConfigured());}
    if(this.startPromise){await this.startPromise;return this.status(await this.isConfigured());}
    const configured=await this.isConfigured();
    this.resolvedMmprojPath=await this.resolveMmprojPath();
    if(!configured) throw new Error(`Local LLM is not configured for ${this.engine}. Expected llama-server at ${this.config.executablePath} and model at ${this.config.modelPath}.`);
    this.lastError=null; this.ready=false; this.recentLog=[];
    const engine=this.engine;
    const launch=async(useMmproj:string|null)=>{
      this.startPromise=new Promise<void>((resolve,reject)=>{
        const args=['--model',this.config.modelPath,'--host',this.config.host,'--port',String(this.config.port),'--n-gpu-layers',String(this.config.gpuLayers),'--ctx-size',String(this.engine==='qwen-coder'?Math.max(this.config.contextSize,16384):this.config.contextSize),'--threads',String(this.config.threads),'--jinja'];
        if(getLocalLlmModel(this.engine).multimodal && useMmproj)args.push('--mmproj',useMmproj);
        const child=spawn(this.config.executablePath,args,{cwd:path.dirname(this.config.executablePath),windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env}});
        this.child=child; this.startedAt=new Date().toISOString();
        const addLog=(chunk:Buffer|string)=>{const lines=String(chunk).split(/\r?\n/).map(line=>line.trim()).filter(Boolean);for(const line of lines)this.recentLog.push(line.slice(0,1000));if(this.recentLog.length>60)this.recentLog.splice(0,this.recentLog.length-60);};
        child.stdout.on('data',addLog); child.stderr.on('data',addLog);
        child.once('error',error=>{this.lastError=`${engine} llama-server spawn error: ${error.message}`;this.ready=false;this.child=null;reject(error);});
        child.once('exit',(code,signal)=>{addLog(`[llama-server exited] engine=${engine} code=${code??'null'} signal=${signal??'null'}`);if(!this.ready&&code!==0){const detail=this.recentLog.slice(-8).join(' | ');this.lastError=`${engine} llama-server exited before becoming ready (code ${code??'unknown'}).${detail?` ${detail}`:''}`;}this.ready=false;this.child=null;});
        void this.waitForReady(this.config.timeoutMs).then(()=>{this.ready=true;resolve();}).catch(error=>{this.lastError=error instanceof Error?error.message:String(error);if(this.child&&!this.child.killed)this.child.kill();this.child=null;reject(error);});
      }).finally(()=>{this.startPromise=null;});
      return this.startPromise;
    };
    try{
      await launch(this.resolvedMmprojPath);
    }catch(error){
      const detail=String(this.lastError || (error instanceof Error ? error.message : String(error)));
      const mismatch=/mismatch between text model/i.test(detail)||/wrong mmproj/i.test(detail)||/load_multimodal_model/i.test(detail);
      if(engine==='qwen3.5' && this.resolvedMmprojPath && mismatch){
        this.appendDiagnostic(`MMProj mismatch detected for Qwen3.5-9B; retrying text-only startup without projector.`);
        this.resolvedMmprojPath=null;
        this.lastError=null; this.recentLog=[];
        await launch(null);
      }else{
        throw error;
      }
    }
    return this.status(true);
  }

  async stop():Promise<LocalLlmStatus>{if(!this.child||this.child.killed){this.ready=false;return this.status(await this.isConfigured());}const child=this.child;this.ready=false;child.kill();await new Promise<void>(resolve=>{const timer=setTimeout(resolve,3000);child.once('exit',()=>{clearTimeout(timer);resolve();});});this.child=null;return this.status(await this.isConfigured());}
  async restart():Promise<LocalLlmStatus>{await this.stop();return this.start();}
  async cancelChat():Promise<boolean>{const controller=this.activeChatController;if(!controller)return false;controller.abort();this.activeChatController=null;if(this.child&&!this.child.killed)await this.stop();this.appendDiagnostic('CHAT CANCEL COMPLETE — llama.cpp stopped and VRAM released; restart Local AI to continue');return true;}

  async chat(messages:ChatMessage[],options?:{temperature?:number;maxTokens?:number;suite?:string;telemetrySource?:PromptTelemetrySource;webProvider?:string|null;includeAgentSkills?:boolean;allowReasoningFallback?:boolean;contextBreakdown?:Record<string,number>;iteration?:number;toolCalls?:number},attachments:ImageAttachment[]=[]){
    await this.agentSkillsLoadPromise;
    const skillAwareMessages = Array.isArray(messages) ? [...messages] : [];
    const latestUserText = [...skillAwareMessages].reverse().find(message => message?.role === 'user');
    const operationalContext = this.engine === 'qwen-coder' || /\b(?:edit|modify|change|update|patch|repair|fix|implement|refactor|rewrite|replace|remove|delete|create|make|build|scaffold|develop|write|save)\b[\s\S]{0,220}\b(?:code|file|component|function|project|repo|repository|react|typescript|javascript|server|ui|app|website|dashboard)\b/i.test(String(latestUserText?.content || ''));
    if (operationalContext && !skillAwareMessages.some(message => message?.role === 'system' && String(message.content || '').includes('LOCAL AUTONOMY MANDATE'))) {
      skillAwareMessages.unshift({ role:'system', content: LOCAL_AUTONOMY_MANDATE });
    }
    if (options?.includeAgentSkills !== false) {
      const skillPrompt = getActiveAgentSkillsPrompt();
      if (!skillAwareMessages.some(message => message?.role === 'system' && String(message.content || '').includes('=== ACTIVE AGENT SKILLS'))) {
        skillAwareMessages.unshift({ role: 'system', content: skillPrompt });
      }
    }
    messages = skillAwareMessages;
    const status=await this.getStatus();if(!status.ready)throw new Error(`Local ${getLocalLlmModel(this.engine).label} engine is not running. Start the local AI engine first.`);const maxTokens=Math.min(1024,Math.max(64,Math.round(Number(options?.maxTokens)||768)));const request=async(normalized:ChatMessage[],label:string)=>{if(!normalized.length||normalized[normalized.length-1].role!=='user')throw new Error('Local LLM conversation could not be normalized into a valid user turn.');const requestMessages:any[]=normalized.map(m=>({...m}));const imageAttachments=attachments.filter(a=>a?.localPath&&/^image\//i.test(a.mime));if(imageAttachments.length){if(!this.resolvedMmprojPath)throw new Error(`${getLocalLlmModel(this.engine).label} vision is selected, but no multimodal projector GGUF was found beside the local model.`);const latest=requestMessages[requestMessages.length-1];const parts:any[]=[{type:'text',text:String(latest.content||'')}];for(const attachment of imageAttachments.slice(0,5)){const buffer=await fs.readFile(attachment.localPath);parts.push({type:'image_url',image_url:{url:`data:${attachment.mime};base64,${buffer.toString('base64')}`}});}latest.content=parts;}this.appendDiagnostic(`${label}: engine=${this.engine}, model=${path.basename(this.config.modelPath)}, turns=${requestMessages.length}${imageAttachments.length?`, images=${imageAttachments.length}`:''}`);const controller=new AbortController();this.activeChatController=controller;const timeout=setTimeout(()=>controller.abort(),this.config.timeoutMs);try{const response=await fetch(`http://${this.config.host}:${this.config.port}/v1/chat/completions`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:path.basename(this.config.modelPath),messages:requestMessages,temperature:options?.temperature??0.7,max_tokens:maxTokens,stream:false,...(this.engine==='qwen3.5'?{chat_template_kwargs:{enable_thinking:false}}:{})}),signal:controller.signal});const bodyText=await response.text();if(!bodyText.trim())throw new Error(`llama-server returned an empty response (HTTP ${response.status}).`);let data:any;try{data=JSON.parse(bodyText);}catch{throw new Error(`llama-server returned invalid JSON (HTTP ${response.status}).`);}if(!response.ok)throw new Error(String(data?.error?.message||data?.error||`llama-server returned HTTP ${response.status}`));return data;}finally{clearTimeout(timeout);if(this.activeChatController===controller)this.activeChatController=null;}};const normalized=normalizeChatMessages(messages);
    const startedAt=Date.now();
    const suite=String(options?.suite||'Local AI');
    const source:PromptTelemetrySource=options?.telemetrySource||'local';
    const recordTelemetry=(data:any,success:boolean)=>{
      const usage=data?.usage||{};
      const promptTokens=Number(usage.prompt_tokens||usage.promptTokens||estimateTokens(normalized));
      const completionTokens=Number(usage.completion_tokens||usage.completionTokens||estimateTokens(extractAssistantText(data?.choices?.[0]?.message, !!options?.allowReasoningFallback)||''));
      const durationMs=Date.now()-startedAt; const completionRate=durationMs>0?(completionTokens/(durationMs/1000)):0; const promptRate=durationMs>0?(promptTokens/(durationMs/1000)):0; const telemetry=runtimeTelemetry.recordPrompt({suite,source,promptTokens,completionTokens,totalTokens:Number(usage.total_tokens||usage.totalTokens||promptTokens+completionTokens),maxTokens:Math.min(1024,Math.max(64,Math.round(Number(options?.maxTokens)||768))),contextSize:this.config.contextSize,durationMs,tokensPerSecond:completionRate,promptTokensPerSecond:promptRate,completionTokensPerSecond:completionRate,firstTokenLatencyMs:null,iteration:options?.iteration??null,toolCalls:options?.toolCalls??0,contextBreakdown:options?.contextBreakdown,webSearched:source==='web'||source==='local+web',webProvider:options?.webProvider||null,success});
      if(data && typeof data==='object') data.ginaTelemetry=telemetry;
      return data;
    };
    try{const data=await request(normalized,'CHAT');this.lastError=null;const msg=data?.choices?.[0]?.message;const text=extractAssistantText(msg, !!options?.allowReasoningFallback);if(msg&&typeof msg==='object'&&text&&!(typeof msg.content==='string'&&msg.content.trim())){msg.content=text;}return recordTelemetry(data,true);}catch(firstError:any){const firstMessage=firstError?.message||String(firstError);this.lastError=firstMessage;this.appendDiagnostic(`CHAT ERROR: ${firstMessage}`);if(isRecoverableTemplateError(firstMessage)||isContextError(firstMessage)||/HTTP 5\d\d|temporar|server busy|overloaded|empty response/i.test(firstMessage)){const fallback=normalizeChatMessages(messages,true);try{const data=await request(fallback,'RECOVERY');this.lastError=null;const msg2=data?.choices?.[0]?.message;const text2=extractAssistantText(msg2, !!options?.allowReasoningFallback);if(msg2&&typeof msg2==='object'&&text2&&!(typeof msg2.content==='string'&&msg2.content.trim())){msg2.content=text2;}return recordTelemetry(data,true);}catch(fallbackError:any){this.lastError=fallbackError?.message||String(fallbackError);recordTelemetry({choices:[]},false);}}throw new Error(`${firstMessage} (Gina recovery attempts were also exhausted.)`);}}

  async generateCompletion(options: { systemPrompt?: string; prompt: string; temperature?: number; maxTokens?: number; suite?: string; telemetrySource?: PromptTelemetrySource; webProvider?: string | null }): Promise<string> {
    await this.agentSkillsLoadPromise;
    const skillPrompt = getActiveAgentSkillsPrompt();
    const baseSystemPrompt = options.systemPrompt || '';
    const systemContent = baseSystemPrompt.includes('=== ACTIVE AGENT SKILLS')
      ? baseSystemPrompt
      : `${baseSystemPrompt ? `${baseSystemPrompt}\n\n` : ''}${skillPrompt}`;
    const messages: ChatMessage[] = [
      { role: 'system', content: systemContent },
      { role: 'user', content: options.prompt }
    ];
    const res = await this.chat(messages, { temperature: options.temperature ?? 0.7, maxTokens: options.maxTokens ?? 1024, suite: options.suite, telemetrySource: options.telemetrySource, webProvider: options.webProvider });
    const msg = res?.choices?.[0]?.message;
    const text = extractAssistantText(msg);
    // Normalize so downstream callers always see a populated content field
    if (msg && typeof msg === "object" && text && !(typeof msg.content === "string" && msg.content.trim())) {
      msg.content = text;
    }
    return text;
  }

  private appendDiagnostic(message:string){const line=String(message).replace(/\s+/g,' ').trim().slice(0,1000);if(!line)return;this.recentLog.push(`[chat] ${line}`);if(this.recentLog.length>60)this.recentLog.splice(0,this.recentLog.length-60);}
  private async waitForReady(timeoutMs:number):Promise<void>{const deadline=Date.now()+timeoutMs;while(Date.now()<deadline){if(!this.child||this.child.killed)throw new Error(this.lastError||'llama-server stopped before becoming ready.');if(await this.checkHealth())return;await new Promise(resolve=>setTimeout(resolve,350));}throw new Error(`Timed out waiting for llama-server on http://${this.config.host}:${this.config.port} using ${this.engine}. Recent server log: ${this.recentLog.slice(-8).join(' | ')}`);}
  private async checkHealth():Promise<boolean>{try{const response=await fetch(`http://${this.config.host}:${this.config.port}/health`,{signal:AbortSignal.timeout(1200)});return response.ok;}catch{return false;}}
  private status(configured:boolean):LocalLlmStatus{return{configured,running:!!this.child&&!this.child.killed,ready:this.ready,pid:this.child?.pid??null,port:this.config.port,modelPath:this.config.modelPath,modelName:path.basename(this.config.modelPath),gpuLayers:this.config.gpuLayers,contextSize:this.engine==='qwen-coder'?Math.max(this.config.contextSize,16384):this.config.contextSize,threads:this.config.threads,backend:fsSync.existsSync(path.join(path.dirname(this.config.executablePath),'ggml-cuda.dll'))?'CUDA':'unknown',lastError:this.lastError,startedAt:this.startedAt,recentLog:[...this.recentLog],multimodal:!!this.resolvedMmprojPath,mmprojPath:this.resolvedMmprojPath,engine:this.engine};}
}
