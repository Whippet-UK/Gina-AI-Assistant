import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Cpu, X, ChevronDown, ChevronUp, ShieldAlert, Thermometer, Trash2 } from 'lucide-react';
import { SystemTelemetry } from '../types';

interface VRAMWarningToastProps {
  telemetry: SystemTelemetry;
  thresholdMB?: number;
  isCooldownActive?: boolean;
  cooldownRemainingSec?: number;
  queuedRequestsCount?: number;
  onDismiss?: () => void;
  onClearCache?: () => void;
}

export const VRAMWarningToast: React.FC<VRAMWarningToastProps> = ({
  telemetry,
  thresholdMB = 7168,
  isCooldownActive = false,
  cooldownRemainingSec = 0,
  queuedRequestsCount = 0,
  onDismiss,
  onClearCache
}) => {
  const [userDismissed, setUserDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [lastWarningTime, setLastWarningTime] = useState<string | null>(null);

  const vramUsed = telemetry.vramUsedMB || 0;
  const vramTotal = telemetry.vramTotalMB || 7372;
  const isOverThreshold = vramUsed > thresholdMB;

  // Auto-reset dismissed state if VRAM dips and spikes above threshold again or when cooldown initiates
  useEffect(() => {
    if (isOverThreshold || isCooldownActive) {
      if (!lastWarningTime) {
        setLastWarningTime(new Date().toLocaleTimeString());
      }
    } else {
      setUserDismissed(false);
      setLastWarningTime(null);
    }
  }, [isOverThreshold, isCooldownActive, lastWarningTime]);

  const handleDismiss = () => {
    setUserDismissed(true);
    if (onDismiss) onDismiss();
  };

  const vramUsedGB = (vramUsed / 1024).toFixed(2);
  const vramTotalGB = (vramTotal / 1024).toFixed(2);
  const vramPercent = Math.min(100, Math.round((vramUsed / vramTotal) * 100));

  const isVisible = (isOverThreshold || isCooldownActive) && !userDismissed;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.aside
          key="vram-warning-toast"
          id="vram-warning-toast"
          aria-label="VRAM Pressure Warning"
          initial={{ opacity: 0, y: -24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className={`fixed top-6 right-6 z-50 max-w-sm w-[calc(100vw-3rem)] sm:w-96 bg-slate-900/95 border-2 ${isCooldownActive ? 'border-cyan-500/80 shadow-cyan-500/20' : 'border-amber-500/70'} rounded-xl shadow-2xl backdrop-blur-md p-4 text-slate-100 font-sans pointer-events-auto`}
          style={{ boxShadow: isCooldownActive ? '0 12px 36px -4px rgba(6, 182, 212, 0.35)' : '0 12px 36px -4px rgba(245, 158, 11, 0.35)' }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2.5">
              <div className={`p-1.5 rounded-lg ${isCooldownActive ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'} border animate-pulse shrink-0`}>
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className={`text-xs font-bold ${isCooldownActive ? 'text-cyan-300' : 'text-amber-300'} uppercase tracking-wider`}>
                    {isCooldownActive ? 'VRAMGuard Cooldown Breath' : 'VRAM Pressure Warning'}
                  </h4>
                  {isCooldownActive ? (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse">
                      {cooldownRemainingSec}s COOLDOWN
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      &gt;{(thresholdMB / 1024).toFixed(1)} GB
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                  <span>RTX 3070 Ti (8GB)</span>
                  {lastWarningTime && <span>· {lastWarningTime}</span>}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setCollapsed(!collapsed)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                title={collapsed ? 'Expand telemetry details' : 'Collapse'}
                aria-label={collapsed ? 'Expand details' : 'Collapse details'}
              >
                {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                title="Dismiss warning"
                aria-label="Dismiss warning"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Body / Telemetry Meter */}
          <div className="mt-3 space-y-2.5 font-mono">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                VRAM Allocation
              </span>
              <span className="font-bold text-amber-300">
                {vramUsedGB} GB / {vramTotalGB} GB ({vramPercent}%)
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  vramPercent >= 95
                    ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                    : 'bg-gradient-to-r from-amber-400 to-amber-500'
                }`}
                style={{ width: `${Math.min(100, vramPercent)}%` }}
              />
            </div>

            {/* Extra Stats bar */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
              <span className="flex items-center gap-1">
                <Thermometer className="w-3 h-3 text-slate-500" />
                GPU Temp: <strong className="text-slate-200">{telemetry.gpuTempC}°C</strong>
              </span>
              <span>
                Safety Cage: <strong className="text-amber-400 font-mono">7372 MB</strong>
              </span>
            </div>

            {/* Collapsible Guidance */}
            {!collapsed && (
              <div className="pt-2 text-[10px] space-y-2 border-t border-slate-800/80 font-sans">
                {isCooldownActive ? (
                  <div className="bg-cyan-950/70 border border-cyan-500/40 rounded-lg p-2.5 space-y-1.5 text-cyan-200">
                    <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
                      <span>VRAM Stabilization Breath Active</span>
                      <span className="font-mono text-cyan-400">{cooldownRemainingSec}s remaining</span>
                    </div>
                    <p className="text-[9.5px] text-cyan-300/80 leading-relaxed font-sans">
                      An OOM event was detected via log telemetry. Generation requests are queued automatically during this 5-second breath to let CUDA tensor memory clear safely.
                    </p>
                    {queuedRequestsCount > 0 && (
                      <div className="text-[9px] font-mono text-amber-300 bg-amber-950/50 px-2 py-1 rounded border border-amber-500/30 flex items-center justify-between">
                        <span>Queued Generation Requests:</span>
                        <strong className="text-amber-200">{queuedRequestsCount} pending</strong>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="text-slate-300 leading-relaxed">
                      VRAM allocation exceeds <strong className="text-amber-300">7.0 GB</strong>. To prevent PyTorch{' '}
                      <strong className="text-rose-400">CUDA Out of Memory (OOM)</strong> exceptions:
                    </p>

                    <div className="bg-slate-950/90 rounded-md p-2 border border-slate-800 space-y-1 text-slate-400 font-mono text-[9.5px]">
                      <div className="flex items-center gap-1.5 text-slate-300 font-bold font-sans">
                        <ShieldAlert className="w-3 h-3 text-amber-400 shrink-0" />
                        Recommended Actions:
                      </div>
                      <div>• Video Studio: Select <strong className="text-emerald-400 font-sans">512 × 512</strong> (1.0s / 25 frames).</div>
                      <div>• Creator Studio: Use <strong className="text-emerald-400 font-sans">1:1 Square</strong> or standard batch 1.</div>
                      <div>• ComfyUI Flags: Ensure <code className="text-amber-300">--lowvram --fp8_e4m3fn-text-enc</code>.</div>
                    </div>
                  </>
                )}

                {onClearCache && (
                  <button
                    type="button"
                    onClick={onClearCache}
                    className="w-full mt-2 py-1.5 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg flex items-center justify-center gap-1.5 font-bold font-mono text-[10px] transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    Flush ComfyUI VRAM Cache (/free)
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
