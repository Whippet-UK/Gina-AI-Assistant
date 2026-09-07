import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";

export type LocalLlmEngine = "qwen" | "gemma";

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

export interface ImageGenerationOptions {
  activeWorkflow: "flux_image.json" | "sdxl_juggernaut.json" | string;
  dogBreed?: string;
  dogColor?: string;
  youtubeChannelName?: string;
  backgroundPhotoDescription?: string;
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

export class LocalLlmManager {
  private child: ChildProcessWithoutNullStreams | null = null;
  private ready=false;
  private lastError:string|null=null;
  private startedAt:string|null=null;
  private recentLog:string[]=[];
  private startPromise:Promise<void>|null=null;
  private resolvedMmprojPath:string|null=null;
  private activeChatController:AbortController|null=null;
  private engine:LocalLlmEngine=(process.env.GINA_LLM_ENGINE === 'gemma' ? 'gemma' : 'qwen');
  readonly config:LocalLlmConfig;

  constructor(){
    const root=process.env.GINA_LLM_ROOT||'C:\\Gina_AI\\models\\llm';
    const toolsRoot=process.env.GINA_LLAMA_ROOT||'C:\\Gina_AI\\tools\\llama.cpp';
    const configuredModel=process.env.GINA_LLM_MODEL||'';
    const executablePath=process.env.GINA_LLM_EXE||path.join(toolsRoot,'llama-server.exe');
    this.config={executablePath,modelPath:configuredModel||this.defaultModelPath(root,this.engine),host:process.env.GINA_LLM_HOST||'127.0.0.1',port:envNumber('GINA_LLM_PORT',8080),gpuLayers:envNumber('GINA_LLM_GPU_LAYERS',28),contextSize:envNumber('GINA_LLM_CONTEXT',8192),threads:envNumber('GINA_LLM_THREADS',6),timeoutMs:envNumber('GINA_LLM_TIMEOUT_MS',300000),mmprojPath:process.env.GINA_LLM_MMPROJ||undefined};
  }

  private defaultModelPath(root:string,engine:LocalLlmEngine){return path.join(root,engine==='qwen'?'Qwen2.5-VL-7B-Instruct-Q4_K_M.gguf':'gemma-3-12b-it-Q4_K_M.gguf');}

  private async syncPersistedEnginePreference(){
    if(this.child && !this.child.killed) return;
    const root=process.env.GINA_ROOT||'C:\\Gina_AI';
    const memoryPath=path.join(root,'.gina','agent-memory.json');
    try{
      const parsed=JSON.parse(await fs.readFile(memoryPath,'utf8'));
      const entries=Array.isArray(parsed?.entries)?parsed.entries:[];
      const preference=entries.find((entry:any)=>entry?.key==='local_llm_engine'&&(entry?.value==='qwen'||entry?.value==='gemma'));
      const preferred=preference?.value as LocalLlmEngine|undefined;
      if(preferred && preferred!==this.engine){
        this.engine=preferred;
        const modelRoot=process.env.GINA_LLM_ROOT||'C:\\Gina_AI\\models\\llm';
        this.config.modelPath=process.env.GINA_LLM_MODEL||this.defaultModelPath(modelRoot,preferred);
        this.config.mmprojPath=undefined;
        this.resolvedMmprojPath=null;
        this.appendDiagnostic(`ENGINE PREFERENCE SYNC: ${preferred}`);
      }
    }catch{}
  }
  getEngine():LocalLlmEngine{return this.engine;}
  getModelSelection(){return { engine:this.engine, modelPath:this.config.modelPath, modelName:path.basename(this.config.modelPath), mmprojPath:this.resolvedMmprojPath, multimodal:!!this.resolvedMmprojPath };}
  async setEngine(engine:LocalLlmEngine):Promise<LocalLlmStatus>{if(engine!=='qwen'&&engine!=='gemma')throw new Error('Unsupported local LLM engine. Use qwen or gemma.');if(this.child&&!this.child.killed)await this.stop();this.engine=engine;const root=process.env.GINA_LLM_ROOT||'C:\\Gina_AI\\models\\llm';this.config.modelPath=process.env.GINA_LLM_MODEL||this.defaultModelPath(root,engine);this.config.mmprojPath=undefined;this.resolvedMmprojPath=null;return this.status(await this.isConfigured());}
  private async resolveModelPath():Promise<string>{if(process.env.GINA_LLM_MODEL){this.config.modelPath=process.env.GINA_LLM_MODEL;return this.config.modelPath;}const directExists=await fs.stat(this.config.modelPath).then(s=>s.isFile()).catch(()=>false);if(directExists)return this.config.modelPath;const root=path.dirname(this.config.modelPath);try{const files=await fs.readdir(root);const patterns=this.engine==='qwen'?[/^qwen.*2\.5.*vl.*\.gguf$/i,/^qwen.*\.gguf$/i]:[/^gemma.*\.gguf$/i];for(const pattern of patterns){const match=files.find(n=>pattern.test(n)&&!/mmproj/i.test(n));if(match){this.config.modelPath=path.join(root,match);return this.config.modelPath;}}}catch{}return this.config.modelPath;}
  private async resolveMmprojPath():Promise<string|null>{if(this.engine!=='qwen'&&!this.config.mmprojPath){this.resolvedMmprojPath=null;return null;}if(this.config.mmprojPath){this.resolvedMmprojPath=await fs.stat(this.config.mmprojPath).then(s=>s.isFile()?this.config.mmprojPath!:null).catch(()=>null);return this.resolvedMmprojPath;}const root=path.dirname(this.config.modelPath);try{const files=await fs.readdir(root);const match=files.find(name=>/qwen.*mmproj.*\.gguf$/i.test(name)||/^mmproj-f16\.gguf$/i.test(name)||/mmproj.*qwen.*\.gguf$/i.test(name));this.resolvedMmprojPath=match?path.join(root,match):null;return this.resolvedMmprojPath;}catch{return null;}}
  async getStatus():Promise<LocalLlmStatus>{await this.syncPersistedEnginePreference();const configured=await this.isConfigured();await this.resolveMmprojPath();if(this.child&&!this.child.killed)this.ready=await this.checkHealth();else this.ready=false;return this.status(configured);}
  async isConfigured():Promise<boolean>{await this.resolveModelPath();const [exe,model]=await Promise.all([fs.stat(this.config.executablePath).then(s=>s.isFile()).catch(()=>false),fs.stat(this.config.modelPath).then(s=>s.isFile()).catch(()=>false)]);return exe&&model;}
  async start():Promise<LocalLlmStatus>{await this.syncPersistedEnginePreference();if(this.child&&!this.child.killed){await this.waitForReady(5000).catch(()=>undefined);return this.status(await this.isConfigured());}if(this.startPromise){await this.startPromise;return this.status(await this.isConfigured());}const configured=await this.isConfigured();this.resolvedMmprojPath=await this.resolveMmprojPath();if(!configured)throw new Error(`Local LLM is not configured for ${this.engine}. Expected llama-server at ${this.config.executablePath} and model at ${this.config.modelPath}.`);this.lastError=null;this.ready=false;this.recentLog=[];const engine=this.engine;this.startPromise=new Promise<void>((resolve,reject)=>{const args=['--model',this.config.modelPath,'--host',this.config.host,'--port',String(this.config.port),'--n-gpu-layers',String(this.config.gpuLayers),'--ctx-size',String(this.config.contextSize),'--threads',String(this.config.threads),'--jinja'];if(this.resolvedMmprojPath)args.push('--mmproj',this.resolvedMmprojPath);const child=spawn(this.config.executablePath,args,{cwd:path.dirname(this.config.executablePath),windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env}});this.child=child;this.startedAt=new Date().toISOString();const addLog=(chunk:Buffer|string)=>{const lines=String(chunk).split(/\r?\n/).map(line=>line.trim()).filter(Boolean);for(const line of lines)this.recentLog.push(line.slice(0,1000));if(this.recentLog.length>60)this.recentLog.splice(0,this.recentLog.length-60);};child.stdout.on('data',addLog);child.stderr.on('data',addLog);child.once('error',error=>{this.lastError=`${engine} llama-server spawn error: ${error.message}`;this.ready=false;this.child=null;reject(error);});child.once('exit',(code,signal)=>{addLog(`[llama-server exited] engine=${engine} code=${code??'null'} signal=${signal??'null'}`);if(!this.ready&&code!==0){const detail=this.recentLog.slice(-8).join(' | ');this.lastError=`${engine} llama-server exited before becoming ready (code ${code??'unknown'}).${detail?` ${detail}`:''}`;}this.ready=false;this.child=null;});void this.waitForReady(this.config.timeoutMs).then(()=>{this.ready=true;resolve();}).catch(error=>{this.lastError=error instanceof Error?error.message:String(error);if(this.child&&!this.child.killed)this.child.kill();this.child=null;reject(error);});}).finally(()=>{this.startPromise=null;});await this.startPromise;return this.status(true);}
  async stop():Promise<LocalLlmStatus>{if(!this.child||this.child.killed){this.ready=false;return this.status(await this.isConfigured());}const child=this.child;this.ready=false;child.kill();await new Promise<void>(resolve=>{const timer=setTimeout(resolve,3000);child.once('exit',()=>{clearTimeout(timer);resolve();});});this.child=null;return this.status(await this.isConfigured());}
  async restart():Promise<LocalLlmStatus>{await this.stop();return this.start();}
  async cancelChat():Promise<boolean>{const controller=this.activeChatController;if(!controller)return false;controller.abort();this.activeChatController=null;if(this.child&&!this.child.killed)await this.stop();this.appendDiagnostic('CHAT CANCEL COMPLETE — llama.cpp stopped and VRAM released; restart Local AI to continue');return true;}
  async chat(messages:ChatMessage[],options?:{temperature?:number;maxTokens?:number},attachments:ImageAttachment[]=[]){const status=await this.getStatus();if(!status.ready)throw new Error(`Local ${this.engine==='qwen'?'Qwen':'Gemma'} engine is not running. Start the local AI engine first.`);const maxTokens=Math.min(1024,Math.max(64,Math.round(Number(options?.maxTokens)||768)));const request=async(normalized:ChatMessage[],label:string)=>{if(!normalized.length||normalized[normalized.length-1].role!=='user')throw new Error('Local LLM conversation could not be normalized into a valid user turn.');const requestMessages:any[]=normalized.map(m=>({...m}));const imageAttachments=attachments.filter(a=>a?.localPath&&/^image\//i.test(a.mime));if(imageAttachments.length){if(this.engine!=='qwen')throw new Error('Gemma engine does not have the configured Qwen vision projector. Select Qwen 2.5-VL for image input.');if(!this.resolvedMmprojPath)throw new Error('Qwen vision is selected, but no mmproj GGUF was found beside the Qwen model.');const latest=requestMessages[requestMessages.length-1];const parts:any[]=[{type:'text',text:String(latest.content||'')}];for(const attachment of imageAttachments.slice(0,5)){const buffer=await fs.readFile(attachment.localPath);parts.push({type:'image_url',image_url:{url:`data:${attachment.mime};base64,${buffer.toString('base64')}`}});}latest.content=parts;}this.appendDiagnostic(`${label}: engine=${this.engine}, model=${path.basename(this.config.modelPath)}, turns=${requestMessages.length}${imageAttachments.length?`, images=${imageAttachments.length}`:''}`);const controller=new AbortController();this.activeChatController=controller;const timeout=setTimeout(()=>controller.abort(),this.config.timeoutMs);try{const response=await fetch(`http://${this.config.host}:${this.config.port}/v1/chat/completions`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:path.basename(this.config.modelPath),messages:requestMessages,temperature:options?.temperature??0.7,max_tokens:maxTokens,stream:false}),signal:controller.signal});const bodyText=await response.text();if(!bodyText.trim())throw new Error(`llama-server returned an empty response (HTTP ${response.status}).`);let data:any;try{data=JSON.parse(bodyText);}catch{throw new Error(`llama-server returned invalid JSON (HTTP ${response.status}).`);}if(!response.ok)throw new Error(String(data?.error?.message||data?.error||`llama-server returned HTTP ${response.status}`));return data;}finally{clearTimeout(timeout);if(this.activeChatController===controller)this.activeChatController=null;}};const normalized=normalizeChatMessages(messages);try{const data=await request(normalized,'CHAT');this.lastError=null;return data;}catch(firstError:any){const firstMessage=firstError?.message||String(firstError);this.lastError=firstMessage;this.appendDiagnostic(`CHAT ERROR: ${firstMessage}`);if(isRecoverableTemplateError(firstMessage)||isContextError(firstMessage)||/HTTP 5\d\d|temporar|server busy|overloaded|empty response/i.test(firstMessage)){const fallback=normalizeChatMessages(messages,true);try{const data=await request(fallback,'RECOVERY');this.lastError=null;return data;}catch(fallbackError:any){this.lastError=fallbackError?.message||String(fallbackError);}}throw new Error(`${firstMessage} (Gina recovery attempts were also exhausted.)`);}}
  private appendDiagnostic(message:string){const line=String(message).replace(/\s+/g,' ').trim().slice(0,1000);if(!line)return;this.recentLog.push(`[chat] ${line}`);if(this.recentLog.length>60)this.recentLog.splice(0,this.recentLog.length-60);}
  private async waitForReady(timeoutMs:number):Promise<void>{const deadline=Date.now()+timeoutMs;while(Date.now()<deadline){if(!this.child||this.child.killed)throw new Error(this.lastError||'llama-server stopped before becoming ready.');if(await this.checkHealth())return;await new Promise(resolve=>setTimeout(resolve,350));}throw new Error(`Timed out waiting for llama-server on http://${this.config.host}:${this.config.port} using ${this.engine}. Recent server log: ${this.recentLog.slice(-8).join(' | ')}`);}
  private async checkHealth():Promise<boolean>{try{const response=await fetch(`http://${this.config.host}:${this.config.port}/health`,{signal:AbortSignal.timeout(1200)});return response.ok;}catch{return false;}}
  private status(configured:boolean):LocalLlmStatus{return{configured,running:!!this.child&&!this.child.killed,ready:this.ready,pid:this.child?.pid??null,port:this.config.port,modelPath:this.config.modelPath,modelName:path.basename(this.config.modelPath),gpuLayers:this.config.gpuLayers,contextSize:this.config.contextSize,threads:this.config.threads,backend:fsSync.existsSync(path.join(path.dirname(this.config.executablePath),'ggml-cuda.dll'))?'CUDA':'unknown',lastError:this.lastError,startedAt:this.startedAt,recentLog:[...this.recentLog],multimodal:!!this.resolvedMmprojPath,mmprojPath:this.resolvedMmprojPath,engine:this.engine};}

  /**
   * Automatically optimizes and structures image generation prompts 
   * based on the active swappable engine configuration.
   */
  public optimizeImagePrompt(options: ImageGenerationOptions): string | string[] {
    const breed = options.dogBreed || "Whippet";
    const color = options.dogColor || "pure white";
    const channelName = options.youtubeChannelName || "THE WHIPPET";
    const photoDesc = options.backgroundPhotoDescription || "a beautiful woman with long dark hair looking forward";

    // 1. SDXL Juggernaut Strategy: Multi-pass sequential execution array
    if (options.activeWorkflow === 'sdxl_juggernaut.json') {
      return [
        `A 3D Pixar-style animated ${breed} dog character with ${color} fur sitting at a dark wooden gaming desk, hands positioned flat typing on an RGB keyboard, facing a computer screen. Cozy room interior, sharp neon LED light strips glowing in background corners, cinematic gaming lighting setup, 3D digital art render.`,
        `A sharp, highly legible dark-mode YouTube channel webpage layout interface on a glass monitor, video layout thumbnails, crisp bold text that reads "${channelName}", clean UI graphic design layout.`,
        `A highly detailed, realistic framed photograph profile of a real person, specifically ${photoDesc}, sharp facial features, authentic portrait photography, studio lighting.`
    }

    // 2. Flux Strategy: Complex, single-pass dense description
    if (options.activeWorkflow === 'flux_image.json') {
      return `A 3D Pixar-style digital illustration of an anthropomorphic ${breed} dog with ${color} fur, sitting forward at a wooden gaming desk, using human-like paws to type on a mechanical RGB keyboard. The dog is looking at a computer monitor screen. The screen displays a dark-mode YouTube channel layout with video grids and the channel name "${channelName}" clearly legible in clean typography. In the background on the far-left dark wall, hanging inside a black frame, is a highly realistic photographic portrait of a real woman, specifically ${photoDesc}. Cozy room ambient, cyan and magenta LED light strips on the wall corners, volumetric studio lighting, highly detailed 3D octane style render.`;
      ];
    }

    // Fallback prompt pattern
    return `3D Pixar style character of a ${color} ${breed} dog at a gaming PC desk typing, 3D render.`;
  }
}
