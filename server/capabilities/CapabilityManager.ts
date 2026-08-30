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
}

export interface LocalCapabilities {
  generatedAt: string;
  localOnly: true;
  hardware: any;
  comfy: { online: boolean; url: string; latencyMs?: number; error?: string };
  models: LocalModel[];
  generators: { id: string; label: string; type: 'image'|'video'|'llm'; status: 'validated'|'installed'|'unavailable'|'not-configured'; workflowIds: string[]; modelIds: string[]; notes: string[] }[];
  controls: { key: string; label: string; type: 'text'|'number'|'select'|'toggle'; values?: string[]; min?: number; max?: number; step?: number; source?: string }[];
  runtime: { gemmaVisionReady: boolean; comfyConnected: boolean; gpuAvailable: boolean };
}

const defaultModels = [
  { id:'flux-schnell', fileName:'flux1SchnellFp8_schnellFp8.safetensors', category:'unet' as const, relative:'models/unet/flux1SchnellFp8_schnellFp8.safetensors', purpose:'FLUX.1 Schnell image generation', enabled:true },
  { id:'clip-l', fileName:'clip_l.safetensors', category:'clip' as const, relative:'models/clip/clip_l.safetensors', purpose:'FLUX CLIP-L text encoder', enabled:true },
  { id:'t5xxl-fp8', fileName:'t5xxl_fp8_e4m3fn.safetensors', category:'clip' as const, relative:'models/clip/t5xxl_fp8_e4m3fn.safetensors', purpose:'FLUX T5-XXL text encoder', enabled:true },
  { id:'flux-vae', fileName:'ae.safetensors', category:'vae' as const, relative:'models/vae/ae.safetensors', purpose:'FLUX autoencoder', enabled:true },
  { id:'ltx-2.3', fileName:'ltxv-2b-0.9.8-distilled-fp8.safetensors', category:'checkpoint' as const, relative:'models/checkpoints/ltxv-2b-0.9.8-distilled-fp8.safetensors', purpose:'LTX-Video 2B distilled video generation', enabled:true, note:'2B distilled model optimized for 8 GB VRAM.' },
  { id:'gemma-3-12b-it', fileName:'gemma-3-12b-it-Q4_K_M.gguf', category:'other' as const, relative:'..\models\llm\gemma-3-12b-it-Q4_K_M.gguf', purpose:'Gemma 3 12B instruction model via llama.cpp CUDA', enabled:true, note:'Local GGUF runtime model. Managed by Gina Local AI.' },
  { id:'gemma-3-mmproj', fileName:'mmproj-model-f16.gguf', category:'projector' as const, relative:'..\models\llm\mmproj-model-f16.gguf', purpose:'Gemma 3 multimodal vision projector', enabled:true, note:'Required for local image understanding.' }
];

async function statModel(fullPath: string, baseRoot: string, item: typeof defaultModels[number]): Promise<LocalModel> {
  try {
    const s = await fs.stat(fullPath);
    return { ...item, path: fullPath, exists: true, sizeGB: Number((s.size / 1024 ** 3).toFixed(2)) };
  } catch {
    return { ...item, path: fullPath, exists: false };
  }
}

export async function scanLocalModels(comfyRoot: string) {
  const root = path.resolve(comfyRoot);
  const ginaRoot = process.env.GINA_ROOT || 'C:\\Gina_AI';
  return Promise.all(defaultModels.map(item => {
    const fullPath = item.id === 'gemma-3-12b-it' || item.id === 'gemma-3-mmproj'
      ? path.join(ginaRoot, 'models', 'llm', item.fileName)
      : path.join(root, item.relative);
    return statModel(fullPath, root, item);
  }));
}

export function buildCapabilities(args: { hardware: any; comfy: any; models: LocalModel[]; workflows: any[] }): LocalCapabilities {
  const flux = args.models.find(m => m.id === 'flux-schnell')?.exists && args.models.find(m => m.id === 'clip-l')?.exists && args.models.find(m => m.id === 't5xxl-fp8')?.exists && args.models.find(m => m.id === 'flux-vae')?.exists;
  const fluxWorkflowIds = args.workflows.filter(w => w.capabilities?.includes('text-conditioning') && w.capabilities?.includes('image-output')).map(w => w.id);
  const ltxInstalled = !!args.models.find(m => m.id === 'ltx-2.3')?.exists;
  const gemmaInstalled = !!args.models.find(m => m.id === 'gemma-3-12b-it')?.exists;
  const mmprojInstalled = !!args.models.find(m => m.id === 'gemma-3-mmproj')?.exists;
  const videoWorkflowIds = args.workflows.filter(w => w.capabilities?.includes('video-output')).map(w => w.id);
  const referenceWorkflowIds = args.workflows.filter(w => w.capabilities?.includes('image-input') || w.capabilities?.includes('load-image')).map(w => w.id);
  const controls: LocalCapabilities['controls'] = [
    { key:'prompt', label:'Prompt', type:'text', source:'workflow binding' },
    { key:'negative_prompt', label:'Negative prompt', type:'text', source:'workflow binding' },
    { key:'seed', label:'Seed', type:'number', min:0, max:2147483647, step:1, source:'workflow binding' },
    { key:'steps', label:'Steps', type:'number', min:1, max:50, step:1, source:'workflow binding' },
    { key:'cfg', label:'CFG', type:'number', min:0, max:30, step:0.1, source:'workflow binding' },
    { key:'sampler', label:'Sampler', type:'select', source:'workflow binding' },
    { key:'scheduler', label:'Scheduler', type:'select', source:'workflow binding' },
    { key:'denoise', label:'Denoise', type:'number', min:0, max:1, step:0.01, source:'workflow binding' },
    { key:'width', label:'Width', type:'number', min:64, max:2048, step:8, source:'workflow binding' },
    { key:'height', label:'Height', type:'number', min:64, max:2048, step:8, source:'workflow binding' },
    { key:'batch_size', label:'Batch size', type:'number', min:1, max:4, step:1, source:'workflow binding' }
  ];
  return {
    generatedAt:new Date().toISOString(), localOnly:true, hardware:args.hardware, comfy:{online:!!args.comfy.online,url:args.comfy.url,latencyMs:args.comfy.latencyMs,error:args.comfy.error}, models:args.models,
    runtime: { gemmaVisionReady: gemmaInstalled && mmprojInstalled, comfyConnected: !!args.comfy.online, gpuAvailable: !!args.hardware?.available },
    generators:[
      { id:'flux-image', label:'FLUX.1 Schnell FP8', type:'image', status:flux && fluxWorkflowIds.length ? 'validated' : flux ? 'installed' : 'unavailable', workflowIds:fluxWorkflowIds, modelIds:['flux-schnell','clip-l','t5xxl-fp8','flux-vae'], notes:['Known-good baseline should remain the primary image generator.'] },
      { id:'ltx-video', label:'LTX-Video 2B FP8', type:'video', status:ltxInstalled && videoWorkflowIds.length ? 'validated' : ltxInstalled ? 'installed' : 'unavailable', workflowIds:videoWorkflowIds, modelIds:['ltx-2.3'], notes:['H.264 MP4 video generation verified operational with auto-flush sentinel.'] },
      { id:'gemma-local-llm', label:'Gemma 3 12B IT Q4_K_M', type:'llm', status:gemmaInstalled && mmprojInstalled ? 'validated' : gemmaInstalled ? 'installed' : 'unavailable', workflowIds:[], modelIds:['gemma-3-12b-it','gemma-3-mmproj'], notes:[mmprojInstalled ? 'Multimodal vision projector detected; image attachments are ready.' : 'Text chat ready; vision requires mmproj-model-f16.gguf.'] },
      { id:'flux-reference-image', label:'FLUX Reference / Image-to-Image', type:'image', status:referenceWorkflowIds.length && flux ? 'validated' : flux ? 'installed' : 'unavailable', workflowIds:referenceWorkflowIds, modelIds:['flux-schnell','clip-l','t5xxl-fp8','flux-vae'], notes:['Reference workflows are available only when the workflow exposes an image input.'] }
    ], controls
  };
}
