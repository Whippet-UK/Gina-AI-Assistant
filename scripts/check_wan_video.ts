import fs from 'fs/promises';
import path from 'path';

export type WanEngineId = 'wan22-ti2v-5b' | 'wan21-i2v-14b';

export interface WanAssetCheck {
  name: string;
  path: string;
  exists: boolean;
  bytes?: number;
}

export interface WanVideoDiagnosticResult {
  timestamp: string;
  comfyUrl: string;
  comfyResponsive: boolean;
  comfyLatencyMs?: number;
  objectInfoLoaded: boolean;
  assets: WanAssetCheck[];
  engines: Record<WanEngineId, {
    backbone: WanAssetCheck;
    vae: WanAssetCheck;
    available: boolean;
    expectedWorkflow: string;
  }>;
  sharedTextEncoder: WanAssetCheck;
  ggufNodeLoaded: boolean;
  tiledVaeNodeLoaded: boolean;
  recommendations: string[];
}

const ASSETS = {
  wan22Backbone: 'models/unet/Wan2.2-TI2V-5B-Q4_K_M.gguf',
  wan21Backbone: 'models/unet/wan2.1-i2v-14b-480p-Q4_K_M.gguf',
  sharedTextEncoder: 'models/clip/umt5_xxl_fp8_e4m3fn_scaled.safetensors',
  wan22Vae: 'models/vae/wan2.2_vae.safetensors',
  wan21Vae: 'models/vae/wan2.1_vae.safetensors',
} as const;

async function inspectFile(root: string, name: string, relativePath: string): Promise<WanAssetCheck> {
  const resolved = path.resolve(root, relativePath);
  try {
    const stat = await fs.stat(resolved);
    if (!stat.isFile()) return { name, path: resolved, exists: false };
    return { name, path: resolved, exists: true, bytes: stat.size };
  } catch {
    return { name, path: resolved, exists: false };
  }
}

export async function runWanVideoDiagnostic(): Promise<WanVideoDiagnosticResult> {
  const comfyUrl = process.env.COMFY_URL || 'http://127.0.0.1:8188';
  const comfyRoot = process.env.COMFY_ROOT || 'C:\\Gina_AI\\ComfyUI_windows_portable\\ComfyUI';
  const assets = await Promise.all([
    inspectFile(comfyRoot, 'Wan 2.2 TI2V 5B GGUF', ASSETS.wan22Backbone),
    inspectFile(comfyRoot, 'Wan 2.1 I2V 14B GGUF', ASSETS.wan21Backbone),
    inspectFile(comfyRoot, 'Shared UMT5 XXL scaled FP8', ASSETS.sharedTextEncoder),
    inspectFile(comfyRoot, 'Wan 2.2 VAE', ASSETS.wan22Vae),
    inspectFile(comfyRoot, 'Wan 2.1 VAE', ASSETS.wan21Vae),
  ]);

  let comfyResponsive = false;
  let comfyLatencyMs: number | undefined;
  let objectInfoLoaded = false;
  let ggufNodeLoaded = false;
  let tiledVaeNodeLoaded = false;
  const started = Date.now();

  try {
    const response = await fetch(`${comfyUrl}/system_stats`, { signal: AbortSignal.timeout(4000) });
    comfyLatencyMs = Date.now() - started;
    comfyResponsive = response.ok;
  } catch {
    comfyLatencyMs = Date.now() - started;
  }

  if (comfyResponsive) {
    try {
      const response = await fetch(`${comfyUrl}/object_info`, { signal: AbortSignal.timeout(6000) });
      if (response.ok) {
        const info: any = await response.json();
        objectInfoLoaded = true;
        ggufNodeLoaded = Boolean(info?.UnetLoaderGGUF);
        tiledVaeNodeLoaded = Boolean(info?.VAEDecodeTiled);
      }
    } catch {
      objectInfoLoaded = false;
    }
  }

  const [wan22Backbone, wan21Backbone, sharedTextEncoder, wan22Vae, wan21Vae] = assets;
  const engines = {
    'wan22-ti2v-5b': {
      backbone: wan22Backbone,
      vae: wan22Vae,
      available: wan22Backbone.exists && wan22Vae.exists && sharedTextEncoder.exists && ggufNodeLoaded && tiledVaeNodeLoaded,
      expectedWorkflow: 'workflows/wan_video_22.json'
    },
    'wan21-i2v-14b': {
      backbone: wan21Backbone,
      vae: wan21Vae,
      available: wan21Backbone.exists && wan21Vae.exists && sharedTextEncoder.exists && ggufNodeLoaded,
      expectedWorkflow: 'workflows/wan_i2v_14b.json'
    }
  } satisfies Record<WanEngineId, {
    backbone: WanAssetCheck;
    vae: WanAssetCheck;
    available: boolean;
    expectedWorkflow: string;
  }>;

  const recommendations: string[] = [];
  if (!comfyResponsive) recommendations.push(`ComfyUI is not responding at ${comfyUrl}.`);
  if (!ggufNodeLoaded) recommendations.push('UnetLoaderGGUF is not registered; install/enable the ComfyUI-GGUF custom node in the active g_env.');
  if (!tiledVaeNodeLoaded) recommendations.push('VAEDecodeTiled is not registered; the Wan 2.2 low-VRAM workflow cannot safely enforce tiled decoding.');
  if (!sharedTextEncoder.exists) recommendations.push(`Missing shared text encoder: ${sharedTextEncoder.path}`);
  if (!wan22Backbone.exists) recommendations.push(`Missing Wan 2.2 backbone: ${wan22Backbone.path}`);
  if (!wan22Vae.exists) recommendations.push(`Missing Wan 2.2 VAE: ${wan22Vae.path}`);
  if (!wan21Backbone.exists) recommendations.push(`Missing Wan 2.1 I2V backbone: ${wan21Backbone.path}`);
  if (!wan21Vae.exists) recommendations.push(`Missing Wan 2.1 VAE: ${wan21Vae.path}`);
  if (!recommendations.length) recommendations.push('Wan video environment passed file, ComfyUI, GGUF-loader and tiled-VAE checks.');

  return {
    timestamp: new Date().toISOString(),
    comfyUrl,
    comfyResponsive,
    comfyLatencyMs,
    objectInfoLoaded,
    assets,
    engines,
    sharedTextEncoder,
    ggufNodeLoaded,
    tiledVaeNodeLoaded,
    recommendations
  };
}

if (process.argv[1]?.endsWith('check_wan_video.ts') || process.argv[1]?.endsWith('check_wan_video.js')) {
  runWanVideoDiagnostic().then(result => {
    console.log(JSON.stringify(result, null, 2));
  }).catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
