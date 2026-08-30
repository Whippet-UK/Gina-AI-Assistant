import React, { useState, useEffect } from 'react';
import { Activity, HardDrive, CheckCircle2, XCircle, RefreshCw, Cpu, ShieldAlert, Server } from 'lucide-react';

export const ComfyUIStatusIndicator: React.FC<{ activeView?: string }> = ({ activeView }) => {
  const [online, setOnline] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const checkConnectivity = async () => {
    setChecking(true);
    try {
      const proxyRes = await fetch('/api/comfy/health');
      if (proxyRes.ok) {
        const data = await proxyRes.json();
        setOnline(!!data.online);
      } else {
        setOnline(false);
      }
    } catch {
      setOnline(false);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkConnectivity();
    const interval = setInterval(checkConnectivity, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span
      className="inline-flex items-center gap-1.5 ml-1"
      title={`ComfyUI Backend (127.0.0.1:8188): ${online ? 'ONLINE & READY' : checking ? 'CHECKING...' : 'OFFLINE'}`}
    >
      <span className="relative flex h-2 w-2">
        {online && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${
          online === null || checking
            ? 'bg-amber-400'
            : online
            ? 'bg-emerald-400'
            : 'bg-rose-500'
        }`} />
      </span>
      <span className={`text-[9px] font-mono font-bold uppercase hidden sm:inline ${
        activeView === 'video'
          ? (online ? 'text-slate-950 font-extrabold' : 'text-slate-900')
          : (online ? 'text-emerald-400' : 'text-rose-400')
      }`}>
        {online ? 'ONLINE' : online === false ? 'OFFLINE' : '...'}
      </span>
    </span>
  );
};

export const LTXDiagnostic: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [comfyDirectStatus, setComfyDirectStatus] = useState<{ checked: boolean; success: boolean; latencyMs?: number; error?: string }>({ checked: false, success: false });
  const [modelFileStatus, setModelFileStatus] = useState<{ checked: boolean; exists: boolean; path?: string; sizeGB?: number; error?: string }>({ checked: false, exists: false });
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null);

  const runDiagnostic = async () => {
    setLoading(true);
    const start = Date.now();

    // 1. Fetch via backend proxy endpoint /api/comfy/health
    let directSuccess = false;
    let directError = '';
    let latencyMs = 0;

    try {
      const proxyRes = await fetch('/api/comfy/health');
      latencyMs = Date.now() - start;
      if (proxyRes.ok) {
        const proxyData = await proxyRes.json();
        if (proxyData.online) {
          directSuccess = true;
          if (proxyData.latencyMs) latencyMs = proxyData.latencyMs;
        } else {
          directError = proxyData.error || 'ComfyUI offline';
        }
      } else {
        directError = `HTTP ${proxyRes.status} from proxy`;
      }
    } catch (err: any) {
      latencyMs = Date.now() - start;
      directError = err?.message || 'Failed to reach ComfyUI proxy';
    }

    setComfyDirectStatus({
      checked: true,
      success: directSuccess,
      latencyMs,
      error: directSuccess ? undefined : directError
    });

    // 2. Backend endpoint filesystem check for LTX-2.3 checkpoint file
    try {
      const fileRes = await fetch('/api/diagnostics/check-model');
      if (fileRes.ok) {
        const fileData = await fileRes.json();
        setModelFileStatus({
          checked: true,
          exists: fileData.exists,
          path: fileData.path,
          sizeGB: fileData.sizeGB,
          error: fileData.error
        });
      } else {
        setModelFileStatus({
          checked: true,
          exists: false,
          error: `HTTP ${fileRes.status} checking backend filesystem`
        });
      }
    } catch (fileErr: any) {
      setModelFileStatus({
        checked: true,
        exists: false,
        error: fileErr?.message || 'Failed to query model diagnostic API'
      });
    }

    setLastCheckTime(new Date().toLocaleTimeString());
    setLoading(false);
  };

  useEffect(() => {
    runDiagnostic();
  }, []);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              LTX-2.3 & ComfyUI Connectivity Diagnostic
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Direct verification of local ComfyUI instance (http://127.0.0.1:8188) and LTX-2.3 checkpoint file.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={runDiagnostic}
          disabled={loading}
          className="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Running Diagnostic...' : 'Run Connectivity Check'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ComfyUI Connectivity Status */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-sky-400" />
              ComfyUI Server Endpoint
            </span>
            <span className="text-[10px] font-mono text-slate-500">http://127.0.0.1:8188</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded bg-slate-900/60 border border-slate-800">
            <div className="space-y-1">
              <div className="text-xs font-bold text-slate-200">
                {comfyDirectStatus.checked ? (
                  comfyDirectStatus.success ? (
                    <span className="text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> ComfyUI Online & Reachable
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4" /> ComfyUI Unreachable
                    </span>
                  )
                ) : (
                  <span className="text-slate-500">Checking...</span>
                )}
              </div>
              <div className="text-[10px] font-mono text-slate-400">
                {comfyDirectStatus.error ? comfyDirectStatus.error : `Latency: ${comfyDirectStatus.latencyMs || 0}ms`}
              </div>
            </div>

            <div className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase ${
              comfyDirectStatus.success ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
            }`}>
              {comfyDirectStatus.success ? 'ONLINE' : 'OFFLINE'}
            </div>
          </div>
        </div>

        {/* LTX-2.3 Model File System Status */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              LTX-2.3 Checkpoint File Check
            </span>
            <span className="text-[10px] font-mono text-slate-500">models/checkpoints/</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded bg-slate-900/60 border border-slate-800">
            <div className="space-y-1">
              <div className="text-xs font-bold text-slate-200">
                {modelFileStatus.checked ? (
                  modelFileStatus.exists ? (
                    <span className="text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Model Confirmed On Disk
                    </span>
                  ) : (
                    <span className="text-red-400 flex items-center gap-1.5">
                      <XCircle className="w-4 h-4" /> File Not Found
                    </span>
                  )
                ) : (
                  <span className="text-slate-500">Checking...</span>
                )}
              </div>
              <div className="text-[10px] font-mono text-slate-400 truncate max-w-xs" title={modelFileStatus.path}>
                {modelFileStatus.exists
                  ? `Size: ${modelFileStatus.sizeGB || 'N/A'} GB`
                  : modelFileStatus.error || 'C:\\Gina_AI\\ComfyUI_windows_portable\\ComfyUI\\models\\checkpoints\\ltxv-2b-0.9.8-distilled-fp8.safetensors'}
              </div>
            </div>

            <div className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase ${
              modelFileStatus.exists ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
            }`}>
              {modelFileStatus.exists ? 'VERIFIED' : 'MISSING'}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1">
        <span>Target Model: ltxv-2b-0.9.8-distilled-fp8.safetensors</span>
        {lastCheckTime && <span>Last Checked: {lastCheckTime}</span>}
      </div>
    </div>
  );
};
