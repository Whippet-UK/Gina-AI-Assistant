import fs from 'fs/promises';
import path from 'path';

export interface WanDiagnosticResult {
  timestamp: string;
  comfyUrl: string;
  comfyResponsive: boolean;
  comfyLatencyMs?: number;
  comfySystemStats?: any;
  modelFound: boolean;
  modelPathsChecked: { path: string; exists: boolean; sizeGB?: number }[];
  modelInComfyObjectInfo: boolean;
  comfyCheckpointsList?: string[];
  clipModelsList?: string[];
  wanNodesFound?: string[];
  recommendations: string[];
}

export async function runWanDiagnostic(): Promise<WanDiagnosticResult> {
  const comfyUrl = process.env.COMFY_URL || 'http://127.0.0.1:8188';
  const comfyRoot = process.env.COMFY_ROOT || 'C:\\Gina_AI\\ComfyUI_windows_portable\\ComfyUI';
  const candidatePaths = [
    path.join(comfyRoot, 'models', 'diffusion_models', 'wan2.1_t2v_1.3B_bf16.safetensors'),
    path.join(comfyRoot, 'models', 'checkpoints', 'wan2.1_t2v_1.3B_bf16.safetensors'),
    'C:\\Gina_AI\\ComfyUI_windows_portable\\ComfyUI\\models\\diffusion_models\\wan2.1_t2v_1.3B_bf16.safetensors',
    'C:\\Gina_AI\\ComfyUI_windows_portable\\ComfyUI\\models\\checkpoints\\wan2.1_t2v_1.3B_bf16.safetensors',
    'C:\\Gina_AI\\ComfyUI_windows_portable\\ComfyUI\\models\\checkpoints\\wan2.1-1.3b.safetensors',
  ];

  const modelPathsChecked: { path: string; exists: boolean; sizeGB?: number }[] = [];
  let modelFound = false;

  for (const candidate of candidatePaths) {
    try {
      const stat = await fs.stat(candidate);
      const sizeGB = Number((stat.size / (1024 ** 3)).toFixed(2));
      modelPathsChecked.push({ path: candidate, exists: true, sizeGB });
      modelFound = true;
    } catch {
      modelPathsChecked.push({ path: candidate, exists: false });
    }
  }

  // 1. Check ComfyUI responsiveness
  let comfyResponsive = false;
  let comfyLatencyMs: number | undefined;
  let comfySystemStats: any = null;
  const start = Date.now();

  try {
    const res = await fetch(`${comfyUrl}/system_stats`, { signal: AbortSignal.timeout(4000) });
    comfyLatencyMs = Date.now() - start;
    if (res.ok) {
      comfyResponsive = true;
      comfySystemStats = await res.json();
    }
  } catch {
    comfyLatencyMs = Date.now() - start;
  }

  // 2. Check ComfyUI /object_info for checkpoint, CLIP models, and Wan nodes
  let modelInComfyObjectInfo = false;
  let comfyCheckpointsList: string[] | undefined;
  let clipModelsList: string[] | undefined;
  let wanNodesFound: string[] = [];

  if (comfyResponsive) {
    try {
      const objRes = await fetch(`${comfyUrl}/object_info`, { signal: AbortSignal.timeout(6000) });
      if (objRes.ok) {
        const objData = await objRes.json();
        const ckptList = objData?.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0];
        if (Array.isArray(ckptList)) {
          comfyCheckpointsList = ckptList;
          modelInComfyObjectInfo = ckptList.some((name: string) =>
            name.toLowerCase().includes('wan')
          );
        }
        const clipList = objData?.CLIPLoader?.input?.required?.clip_name?.[0];
        if (Array.isArray(clipList)) {
          clipModelsList = clipList;
        }
        wanNodesFound = Object.keys(objData).filter(key => key.toLowerCase().includes('wan'));
      }
    } catch {
      // object_info check failed silently
    }
  }

  // Build recommendations
  const recommendations: string[] = [];
  if (!comfyResponsive) {
    recommendations.push(`ComfyUI is not responding at ${comfyUrl}. Launch ComfyUI via start_factory.bat or python main.py --lowvram --fp8_e4m3fn-text-enc.`);
  } else {
    recommendations.push(`ComfyUI responded successfully in ${comfyLatencyMs}ms.`);
  }

  if (!modelFound) {
    recommendations.push(`Wan 2.1 1.3B model file not found on disk. Place wan2.1_t2v_1.3B_bf16.safetensors into C:\\Gina_AI\\ComfyUI_windows_portable\\ComfyUI\\models\\diffusion_models\\ or models\\checkpoints\\.`);
  } else {
    recommendations.push(`Wan 2.1 1.3B model (wan2.1_t2v_1.3B_bf16.safetensors) verified on disk.`);
  }

  if (comfyResponsive && wanNodesFound.length === 0) {
    recommendations.push(`No custom Wan nodes loaded in ComfyUI. Check the ComfyUI diagnostic log and verify Wan 2.1 custom node installation.`);
  } else if (comfyResponsive && wanNodesFound.length > 0) {
    recommendations.push(`Loaded ${wanNodesFound.length} Wan custom node(s) in ComfyUI.`);
  }

  return {
    timestamp: new Date().toISOString(),
    comfyUrl,
    comfyResponsive,
    comfyLatencyMs,
    comfySystemStats,
    modelFound,
    modelPathsChecked,
    modelInComfyObjectInfo,
    comfyCheckpointsList,
    clipModelsList,
    wanNodesFound,
    recommendations
  };
}

if (process.argv[1]?.endsWith('check_wan21.ts') || process.argv[1]?.endsWith('check_wan21.js')) {
  runWanDiagnostic().then((res) => {
    console.log('====================================================');
    console.log(' GINA AI FACTORY — WAN 2.1 & COMFYUI DIAGNOSTIC');
    console.log('====================================================');
    console.log(`Timestamp:            ${res.timestamp}`);
    console.log(`ComfyUI URL:          ${res.comfyUrl}`);
    console.log(`ComfyUI Responsive:   ${res.comfyResponsive ? '✅ PASS' : '❌ FAIL'} (${res.comfyLatencyMs}ms)`);
    console.log(`Wan 2.1 Model File:   ${res.modelFound ? '✅ FOUND' : '❌ NOT FOUND'}`);
    console.log(`ComfyUI Recognized:   ${res.modelInComfyObjectInfo ? '✅ YES' : '⚠️ NOT IN CKPT LIST'}`);
    console.log('\nModel Paths Checked:');
    res.modelPathsChecked.forEach((p) => {
      console.log(`  [${p.exists ? 'EXISTS' : 'MISSING'}] ${p.path} ${p.sizeGB ? `(${p.sizeGB} GB)` : ''}`);
    });
    console.log('\nRecommendations:');
    res.recommendations.forEach((r) => console.log(`  • ${r}`));
    console.log('====================================================');
  });
}
