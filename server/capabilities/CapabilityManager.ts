import fs from 'fs/promises';
import path from 'path';

export interface LocalModel {
  id: string;
  fileName: string;
  category: 'checkpoint'|'unet'|'clip'|'vae'|'text-encoder'|'projector'|'other';
  path: string;
  exists: boolean;
  sizeGB?: number;
  purpose: string;
  enabled: boolean;
  note?: string;
  discovered?: boolean;
}

export interface LocalCapabilities {
  generatedAt: string;
  localOnly: true;
  hardware: any;
  comfy: { online: boolean; url: string; latencyMs?: number; error?: string; nodeClassCount?: number };
  models: LocalModel[];
  customNodes: { id:string; directory:string; installed:boolean; matchedClasses:string[] }[];
  nodeClasses: string[];
  workflows: { id:string; fileName:string; nodeCount:number; capabilities:string[] }[];
  generators: { id: string; label: string; type: 'image'|'video'|'llm'; status: 'validated'|'installed'|'unavailable'|'not-configured'; workflowIds: string[]; modelIds: string[]; notes: string[] }[];
  controls: { key: string; label: string; type: 'text'|'number'|'select'|'toggle'; values?: string[]; min?: number; max?: number; step?: number; source?: string }[];
  runtime: { gemmaVisionReady: boolean; comfyConnected: boolean; gpuAvailable: boolean; ggufReady:boolean; gifStudioReady:boolean; rifeReady:boolean; ltxReady:boolean; nodeGraphSyncReady:boolean };
}

type ModelSeed = Omit<LocalModel, 'path'|'exists'|'sizeGB'> & { relative:string; aliases?:string[] };

const knownModels: ModelSeed[] = [
  { id:'flux-schnell-gguf', fileName:'flux1-schnell-Q4_K_S.gguf', category:'unet', relative:'models/unet/flux1-schnell-Q4_K_S.gguf', purpose:'FLUX.1 Schnell GGUF image generation', enabled:true, aliases:['flux1-schnell-q4_k_s.gguf','flux1-schnell-q4_k_m.gguf'] },
  { id:'clip-l', fileName:'clip_l.safetensors', category:'clip', relative:'models/clip/clip_l.safetensors', purpose:'FLUX CLIP-L text encoder', enabled:true },
  { id:'t5xxl-fp8', fileName:'t5xxl_fp8_e4m3fn.safetensors', category:'clip', relative:'models/clip/t5xxl_fp8_e4m3fn.safetensors', purpose:'FLUX T5-XXL text encoder', enabled:true },
  { id:'flux-vae', fileName:'ae.safetensors', category:'vae', relative:'models/vae/ae.safetensors', purpose:'FLUX autoencoder', enabled:true },
  { id:'gemma-3-12b-it', fileName:'gemma-3-12b-it-Q4_K_M.gguf', category:'other', relative:'..\\models\\llm\\gemma-3-12b-it-Q4_K_M.gguf', purpose:'Gemma local instruction model via llama.cpp CUDA', enabled:true },
  { id:'gemma-mmproj', fileName:'mmproj-q8_0.gguf', category:'projector', relative:'..\\models\\llm\\mmproj-q8_0.gguf', purpose:'Gemma multimodal vision projector', enabled:true, note:'Current preferred local projector; scanner also accepts other mmproj*.gguf files.' },
];

function classifyModel(fileName:string, rel:string): {category:LocalModel['category']; purpose:string; id:string; note?:string}|null {
  const n=fileName.toLowerCase(); const r=rel.toLowerCase();
  if (n.includes('mmproj')) return {category:'projector',purpose:'Multimodal vision projector',id:`mmproj-${fileName.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}`};
  if (n.includes('flux') && (n.includes('gguf') || r.includes('unet'))) return {category:'unet',purpose:'FLUX image generation model',id:`flux-${fileName.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`};
  if (n.includes('ltx') || n.includes('ltxv')) return {category:'checkpoint',purpose:'LTX-Video generation model',id:`ltx-${fileName.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`};
  if (n.includes('rife')) return {category:'other',purpose:'RIFE optical-flow interpolation model',id:`rife-${fileName.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`};
  if (n.includes('clip_l')) return {category:'clip',purpose:'CLIP-L text encoder',id:'clip-l-discovered'};
  if (n.includes('t5xxl')) return {category:'clip',purpose:'T5-XXL text encoder',id:'t5xxl-discovered'};
  if (n === 'ae.safetensors' || n.includes('vae')) return {category:'vae',purpose:'VAE decoder/autoencoder',id:`vae-${fileName.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`};
  if (n.includes('gemma') && n.endsWith('.gguf')) return {category:'other',purpose:'Gemma local LLM model',id:`gemma-${fileName.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`};
  return null;
}

async function walkModelFiles(root:string, maxDepth=4):Promise<{fileName:string;fullPath:string;rel:string}[]> {
  const out:{fileName:string;fullPath:string;rel:string}[]=[];
  const allowed=new Set(['.gguf','.safetensors','.bin','.pth','.pt','.ckpt','.onnx']);
  async function walk(dir:string,depth:number){
    if(depth>maxDepth || out.length>=500) return;
    let entries:any[]=[]; try{entries=await fs.readdir(dir,{withFileTypes:true} as any) as any;}catch{return;}
    for(const e of entries){
      if(out.length>=500) return;
      const full=path.join(dir,e.name); if(e.isDirectory()){ if(!['output','temp','user','cache','preview','__pycache__'].includes(e.name.toLowerCase())) await walk(full,depth+1); }
      else if(e.isFile() && allowed.has(path.extname(e.name).toLowerCase())) out.push({fileName:e.name,fullPath:full,rel:path.relative(root,full)});
    }
  }
  await walk(root,0); return out;
}

async function statModel(fullPath:string, item:ModelSeed):Promise<LocalModel>{
  try{const st=await fs.stat(fullPath); return {...item,path:fullPath,exists:true,sizeGB:Number((st.size/1024**3).toFixed(2)),discovered:false};}
  catch{return {...item,path:fullPath,exists:false,discovered:false};}
}

async function scanCustomNodes(comfyRoot:string, objectInfo?:any){
  const dir=path.join(comfyRoot,'custom_nodes'); const installed:string[]=[];
  try{for(const e of await fs.readdir(dir,{withFileTypes:true})){if(e.isDirectory()) installed.push(e.name);}}catch{}
  const classes=Object.keys(objectInfo||{});
  return installed.map(name=>({
    id:name.toLowerCase().replace(/[^a-z0-9]+/g,'-'), directory:name, installed:true,
    matchedClasses:classes.filter(c=>c.toLowerCase().includes(name.toLowerCase().replace(/^comfyui[-_]/,''))).slice(0,30)
  }));
}

export async function scanLocalModels(comfyRoot:string){
  const root=path.resolve(comfyRoot); const ginaRoot=process.env.GINA_ROOT||'C:\\Gina_AI';
  const fixed=await Promise.all(knownModels.map(async item=>{
    const full=item.id.startsWith('gemma-')||item.id==='gemma-mmproj' ? path.join(ginaRoot,'models','llm',item.fileName) : path.join(root,item.relative);
    // Preferred projector can have changed name; resolve exact first, then mmproj scan below.
    return statModel(full,item);
  }));
  const files=await walkModelFiles(root,4);
  const llmFiles=await walkModelFiles(path.join(ginaRoot,'models','llm'),3);
  const all=[...files,...llmFiles]; const seen=new Set(fixed.map(x=>x.path.toLowerCase()));
  const discovered:LocalModel[]=[];
  for(const f of all){if(seen.has(f.fullPath.toLowerCase())) continue; const c=classifyModel(f.fileName,f.rel); if(!c) continue; seen.add(f.fullPath.toLowerCase()); const st=await fs.stat(f.fullPath).catch(()=>null); discovered.push({id:c.id,fileName:f.fileName,category:c.category,path:f.fullPath,exists:true,sizeGB:st?Number((st.size/1024**3).toFixed(2)):undefined,purpose:c.purpose,enabled:true,note:c.note,discovered:true});}
  // If current projector is mmproj-q8_0, don't advertise the obsolete F16 projector as the preferred model.
  const projectorDiscovered=discovered.find(m=>m.category==='projector') || null;
  const fixedProjector=fixed.find(m=>m.id==='gemma-mmproj');
  if(projectorDiscovered && !fixedProjector?.exists){ fixed.push({...projectorDiscovered,id:'gemma-mmproj',fileName:projectorDiscovered.fileName,purpose:'Gemma multimodal vision projector',note:'Discovered automatically from the local LLM model directory.',discovered:true}); }
  return [...fixed,...discovered];
}

export function buildCapabilities(args:{hardware:any; comfy:any; models:LocalModel[]; workflows:any[]; customNodes?:any[]; nodeClasses?:string[]}):LocalCapabilities{
  const has=(id:string)=>!!args.models.find(m=>m.id===id&&m.exists);
  const hasLike=(re:RegExp)=>args.models.some(m=>m.exists&&re.test(m.fileName));
  const flux=has('flux-schnell-gguf')&&has('clip-l')&&has('t5xxl-fp8')&&has('flux-vae');
  const ltx=hasLike(/ltx/i); const rife=hasLike(/rife/i);
  const mmproj=has('gemma-mmproj')||hasLike(/mmproj.*\.gguf$/i);
  const gemma=has('gemma-3-12b-it')||hasLike(/gemma.*\.gguf$/i);
  const workflowSummaries=args.workflows.map(w=>({id:w.id,fileName:w.fileName,nodeCount:w.nodeCount,capabilities:w.capabilities||[]}));
  const imageW=args.workflows.filter(w=>w.capabilities?.includes('image-output')).map(w=>w.id);
  const videoW=args.workflows.filter(w=>w.capabilities?.includes('video-output')).map(w=>w.id);
  const gifW=args.workflows.filter(w=>w.id==='gif_studio'||w.capabilities?.some((c:string)=>/gif|frame|rife/i.test(c))).map(w=>w.id);
  const controls:LocalCapabilities['controls']=[
    {key:'prompt',label:'Prompt',type:'text',source:'workflow binding'},
    {key:'negative_prompt',label:'Negative prompt',type:'text',source:'workflow binding'},
    {key:'seed',label:'Seed',type:'number',min:0,max:2147483647,step:1,source:'workflow binding'},
    {key:'steps',label:'Steps',type:'number',min:1,max:100,step:1,source:'workflow binding'},
    {key:'cfg',label:'CFG',type:'number',min:0,max:30,step:.1,source:'workflow binding'},
    {key:'width',label:'Width',type:'number',min:64,max:2048,step:8,source:'workflow binding'},
    {key:'height',label:'Height',type:'number',min:64,max:2048,step:8,source:'workflow binding'},
    {key:'frames',label:'Frames',type:'number',min:1,max:241,step:1,source:'workflow binding'},
    {key:'fps',label:'FPS',type:'number',min:1,max:60,step:1,source:'workflow binding'},
    {key:'denoise',label:'Denoise',type:'number',min:0,max:1,step:.01,source:'workflow binding'}
  ];
  const comfyOnline=!!args.comfy.online; const classes=(args.nodeClasses||[]).map(x=>String(x).toLowerCase()); const graph=classes.length>0; const hasNode=(...names:string[])=>names.some(n=>classes.includes(n.toLowerCase()) || classes.some(c=>c.includes(n.toLowerCase()))); const rifeNode=hasNode('RIFE_VFI'); const vhsNode=hasNode('VHS_LoadVideo','VHS_LoadImagesPath','VHS_VideoCombine');
  const ltxW=videoW.filter((id:string)=>/ltx/i.test(id));
  return {
    generatedAt:new Date().toISOString(),localOnly:true,hardware:args.hardware,
    comfy:{...args.comfy,nodeClassCount:args.nodeClasses?.length||0},models:args.models,customNodes:args.customNodes||[],nodeClasses:args.nodeClasses||[],workflows:workflowSummaries,
    runtime:{gemmaVisionReady:gemma&&mmproj,comfyConnected:comfyOnline,gpuAvailable:!!args.hardware?.available,ggufReady:hasLike(/\.gguf$/i),gifStudioReady:comfyOnline&&(gifW.length>0||vhsNode), rifeReady:comfyOnline&&(rife||rifeNode), ltxReady:comfyOnline&&(ltx&&ltxW.length>0 || hasNode('LTXVideoSampler','LTXVSampler','LTXVLoader','LTXVideoLoader')), nodeGraphSyncReady:comfyOnline&&graph},
    generators:[
      {id:'flux-image',label:'FLUX.1 Schnell GGUF Q4_K_S',type:'image',status:flux&&imageW.length?'validated':flux?'installed':'unavailable',workflowIds:imageW,modelIds:['flux-schnell-gguf','clip-l','t5xxl-fp8','flux-vae'],notes:['Uses the active UnetLoaderGGUF workflow when registered.']},
      {id:'ltx-video',label:ltxW.length?'LTX-Video (installed variant)':'LTX-Video',type:'video',status:ltx&&ltxW.length?'validated':ltx?'installed':'unavailable',workflowIds:ltxW,modelIds:args.models.filter(m=>m.exists&&/ltx/i.test(m.fileName)).map(m=>m.id),notes:['Version/model identity is derived from the installed local files and workflow, not a stale hard-coded filename.']},
      {id:'rife-motion',label:'RIFE Motion Studio',type:'video',status:(rife||rifeNode)?'validated':'unavailable',workflowIds:gifW,modelIds:args.models.filter(m=>m.exists&&/rife/i.test(m.fileName)).map(m=>m.id),notes:[rife||rifeNode?'RIFE runtime node/model detected locally.':'No RIFE runtime detected.']},
      {id:'gif-studio',label:'GIF Studio · VHS + RIFE',type:'video',status:gifW.length?'validated':comfyOnline?'installed':'unavailable',workflowIds:gifW,modelIds:[],notes:['Trim, optional interpolation, ping-pong looping and GIF/MP4 export.']},
      {id:'gemma-local-llm',label:'Gemma Local GGUF',type:'llm',status:gemma&&mmproj?'validated':gemma?'installed':'unavailable',workflowIds:[],modelIds:args.models.filter(m=>m.exists&&/gemma|mmproj/i.test(m.fileName)).map(m=>m.id),notes:[mmproj?'Multimodal projector detected.':'Text model detected; multimodal projector not detected.']}
    ],controls
  };
}

export { scanCustomNodes };
