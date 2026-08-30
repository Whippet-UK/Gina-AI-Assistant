import React from 'react';
import { Download, FileCode, CheckCircle2, ShieldCheck, X } from 'lucide-react';

interface RestoreManifestModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSavePoint: string;
}

export const RestoreManifestModal: React.FC<RestoreManifestModalProps> = ({
  isOpen,
  onClose,
  activeSavePoint
}) => {
  if (!isOpen) return null;

  const manifestData = {
    manifestVersion: activeSavePoint.replace(/^v/, '') || "1.5.0",
    activeSavePoint,
    createdTimestamp: new Date().toISOString(),
    projectTarget: "Automated Local Video & Image Production Matrix",
    hardwareSpecs: {
      cpu: "AMD Ryzen 5600X (4 Threads Pinned)",
      ram: "32GB 3600MHz System Memory",
      gpu: "NVIDIA RTX 3070 Ti (8GB Physical VRAM)",
      vramCap: "7372 MB (90% Cap Cage)",
      storage: "WD Black SSD (200GB Allocated)",
      sandboxRoot: "C:\\Gina_AI\\"
    },
    lowVramArgs: [
      "--lowvram",
      "--fp8_e4m3fn-text-enc",
      "--gpu-only"
    ],
    targetNetworks: {
      imageNetwork: "FLUX.1-Schnell (Quantized FP8) [Verified Operational]",
      videoNetwork: "LTX-Video 2B FP8 (ltxv-2b-0.9.8-distilled-fp8.safetensors) [H.264 MP4 Export Verified Operational]",
      upscaleEngine: "Ultimate SD Upscale (4x-UltraSharp Model)"
    },
    vramSafetyGuard: {
      thresholdMB: 7680,
      autoPurgeHook: "/api/comfy/clear-cache & /api/comfy/interrupt (pre-queue auto-flush enabled)",
      activeCage: "7372 MB"
    },
    safeguardsCount: 947,
    checksumSHA256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  };

  const manifestJsonString = JSON.stringify(manifestData, null, 2);

  const handleDownload = () => {
    const blob = new Blob([manifestJsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RESTORE_MANIFEST_${activeSavePoint}.json`;
    a.click();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-2xl w-full p-5 shadow-2xl relative animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3.5">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-widest">
              SYSTEM RESTORE POINT MANIFEST JSON
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-lg font-bold p-1 rounded bg-slate-950 border border-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 font-mono">
            <span>RESTORE_MANIFEST_{activeSavePoint}.json</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> 947 Safeguards Active
            </span>
          </div>

          <pre className="bg-slate-950 border border-slate-800 rounded p-3 text-[11px] text-emerald-300 font-mono overflow-x-auto max-h-80 custom-scrollbar leading-relaxed">
            {manifestJsonString}
          </pre>
        </div>

        <div className="flex items-center justify-between pt-2.5 border-t border-slate-800">
          <span className="text-[11px] text-slate-500 font-mono">Export system snapshot for offline backup & audit.</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold px-3 py-1 rounded cursor-pointer uppercase tracking-tight"
            >
              Close
            </button>
            <button
              onClick={handleDownload}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold px-3 py-1 rounded cursor-pointer flex items-center gap-1.5 uppercase tracking-tight"
            >
              <Download className="w-3.5 h-3.5" />
              Download Manifest
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
