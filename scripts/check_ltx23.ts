import fs from 'fs/promises';
import path from 'path';

export interface LtxDiagnosticResult {
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
  ltxNodesFound?: string[];
  recommendations: string[];
}

export async function runLtxDiagnostic(): Promise<LtxDiagnosticResult> {
  const comfyUrl = process.env.COMFY_URL || 'http://127.0.0.1:8188';
  const comfyRoot = process.env.COMFY_ROOT || 'C:\\Gina_AI\\ComfyUI_windows_portable\\ComfyUI';
  const modelSubpath = path.join('models', 'checkpoints', 'ltxv-2b-0.9.8-distilled-fp8.safetensors');
  const candidatePaths = [
    path.join(comfyRoot, modelSubpath),
    'C:\\Gina_AI\\ComfyUI_windows_portable\\ComfyUI\\models\\checkpoints\\ltxv-2b-0.9.8-distilled-fp8.safetensors',
    'C:\\Gina_AI\\ComfyUI_windows_portable\\ComfyUI\\models\\checkpoints\\ltx-video-2.0.safetensors',
    'C:\\Gina_AI\\ComfyUI_windows_portable\\ComfyUI\\models\\diffusion_models\\ltxv-2b-0.9.8-distilled-fp8.safetensors',
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

  // 2. Check ComfyUI /object_info for checkpoint, CLIP models, and LTX nodes
  let modelInComfyObjectInfo = false;
  let comfyCheckpointsList: string[] | undefined;
  let clipModelsList: string[] | undefined;
  let ltxNodesFound: string[] = [];

  if (comfyResponsive) {
    try {
      const objRes = await fetch(`${comfyUrl}/object_info`, { signal: AbortSignal.timeout(6000) });
      if (objRes.ok) {
        const objData = await objRes.json();
        const ckptList = objData?.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0];
        if (Array.isArray(ckptList)) {
          comfyCheckpointsList = ckptList;
          modelInComfyObjectInfo = ckptList.some((name: string) =>
            name.toLowerCase().includes('ltx-2.3') || name.toLowerCase().includes('ltx')
          );
        }
        const clipList = objData?.CLIPLoader?.input?.required?.clip_name?.[0];
        if (Array.isArray(clipList)) {
          clipModelsList = clipList;
        }
        ltxNodesFound = Object.keys(objData).filter(key => key.toLowerCase().includes('ltx'));
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
    recommendations.push(`LTX-Video 2B model file not found on disk. Place ltxv-2b-0.9.8-distilled-fp8.safetensors into C:\\Gina_AI\\ComfyUI_windows_portable\\ComfyUI\\models\\checkpoints\\.`);
  } else {
    recommendations.push(`LTX-Video 2B model (ltxv-2b-0.9.8-distilled-fp8.safetensors) verified on disk.`);
  }

  if (comfyResponsive && ltxNodesFound.length === 0) {
    recommendations.push(`No custom LTX nodes loaded in ComfyUI. Check the ComfyUI diagnostic log and verify the LTX-Video custom node installation.`);
  } else if (comfyResponsive && ltxNodesFound.length > 0) {
    recommendations.push(`Loaded ${ltxNodesFound.length} LTX custom node(s) in ComfyUI.`);
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
    ltxNodesFound,
    recommendations
  };
}

// Allow direct CLI execution: npx tsx scripts/check_ltx23.ts
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('check_ltx23.ts')) {
  runLtxDiagnostic().then((res) => {
    console.log('====================================================');
    console.log(' GINA AI FACTORY — LTX-2.3 & COMFYUI DIAGNOSTIC');
    console.log('====================================================');
    console.log(`Timestamp:            ${res.timestamp}`);
    console.log(`ComfyUI URL:          ${res.comfyUrl}`);
    console.log(`ComfyUI Responsive:   ${res.comfyResponsive ? '✅ PASS' : '❌ FAIL'} (${res.comfyLatencyMs}ms)`);
    console.log(`LTX-2.3 Model File:   ${res.modelFound ? '✅ FOUND' : '❌ NOT FOUND'}`);
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
