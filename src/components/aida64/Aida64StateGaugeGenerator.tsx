import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sliders, Download, Play, Pause, RefreshCw, Sparkles, Check, Layers, AlertTriangle,
  FileArchive, Gauge, Plus, Copy, Eye, Move, Maximize2, ShieldCheck, CheckCircle2, ChevronDown
} from 'lucide-react';
import { SimpleZip } from '../../utils/zipWriter';
import { Aida64GaugeSequenceConfig, Aida64GaugeStyle, Aida64PanelItem } from '../../types';
import { DEFAULT_GAUGE_CONFIG, GAUGE_STYLES_REGISTRY, GaugeStyleMeta } from '../../data/aida64Presets';
import { useAida64Telemetry } from '../../hooks/useAida64Telemetry';

interface Aida64StateGaugeGeneratorProps {
  onAddToAssembler?: (item: Aida64PanelItem) => void;
}

const METRIC_PRESETS = [
  { id: 'cpu_load', label: 'CPU Utilisation', unit: '%', defaultPrimary: '#ef4444', defaultWarn: '#f59e0b', defaultCrit: '#dc2626' },
  { id: 'gpu_load', label: 'GPU Utilisation', unit: '%', defaultPrimary: '#10b981', defaultWarn: '#f59e0b', defaultCrit: '#dc2626' },
  { id: 'ram_load', label: 'Memory Utilisation', unit: '%', defaultPrimary: '#a855f7', defaultWarn: '#ec4899', defaultCrit: '#dc2626' },
  { id: 'vram_load', label: 'VRAM Allocation', unit: '%', defaultPrimary: '#06b6d4', defaultWarn: '#f59e0b', defaultCrit: '#ef4444' },
  { id: 'cpu_temp', label: 'CPU Temperature', unit: '°C', defaultPrimary: '#38bdf8', defaultWarn: '#f59e0b', defaultCrit: '#ef4444' },
  { id: 'gpu_temp', label: 'GPU Temperature', unit: '°C', defaultPrimary: '#10b981', defaultWarn: '#f59e0b', defaultCrit: '#ef4444' },
  { id: 'fan_rpm', label: 'Fan Speed', unit: 'RPM', defaultPrimary: '#10b981', defaultWarn: '#38bdf8', defaultCrit: '#ef4444' },
  { id: 'pkg_power', label: 'Package Power', unit: 'W', defaultPrimary: '#f59e0b', defaultWarn: '#ea580c', defaultCrit: '#dc2626' },
  { id: 'net_speed', label: 'Network Bandwidth', unit: 'MB/s', defaultPrimary: '#06b6d4', defaultWarn: '#3b82f6', defaultCrit: '#10b981' }
];

const SCALE_PRESETS = [
  { label: '25%', value: 0.25 },
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
  { label: '100%', value: 1.0 },
  { label: '125%', value: 1.25 },
  { label: '150%', value: 1.5 },
  { label: '200%', value: 2.0 }
];

const LINEAR_GAUGE_STYLES: Aida64GaugeStyle[] = [
  'led_bar_h', 'segment_bar_h', 'thermal_bar_h', 'industrial_bar_h',
  'battery_bar_h', 'vu_meter_h', 'progress_bar_h', 'industrial_meter_h',
  'segment_ladder_v', 'thermal_bar_v', 'ladder_vu_v', 'thermometer_v'
];

const isLinearGaugeStyle = (style: Aida64GaugeStyle) => LINEAR_GAUGE_STYLES.includes(style);

export const Aida64StateGaugeGenerator: React.FC<Aida64StateGaugeGeneratorProps> = ({
  onAddToAssembler
}) => {
  const [config, setConfig] = useState<Aida64GaugeSequenceConfig>(DEFAULT_GAUGE_CONFIG);
  const [currentValue, setCurrentValue] = useState<number>(67);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);
  const [zipProgress, setZipProgress] = useState<number>(0);
  const [copiedInstructions, setCopiedInstructions] = useState<boolean>(false);
  const [selectedMetric, setSelectedMetric] = useState<string>('cpu_load');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'circular' | 'horizontal' | 'vertical'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedLiveSensorId, setSelectedLiveSensorId] = useState('');
  const { snapshot: liveTelemetry } = useAida64Telemetry(1000);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };
  const applyEffectPreset = (id: string) => {
    const base:any = { effectEngineEnabled:true, effectPreset:id, effectQuality:'balanced', effectIntensity:1,
      depthEnabled:false, reflectionEnabled:false, parallaxEnabled:false, directionalLightEnabled:false,
      dynamicShadowEnabled:false, specularEnabled:false, liquidEnabled:false, digitalDisplayEnabled:false,
      crtEnabled:false, heatEnabled:false, electricalEnabled:false, motionBlurEnabled:false, ghostingEnabled:false,
      sweepEnabled:false, ditherEnabled:false, glareEnabled:false, lensFlareEnabled:false, edgeGlowEnabled:false,
      ambientOcclusionEnabled:false, gradientBackgroundEnabled:false, backgroundTexture:'none' };
    if(id==='cleanInstrument') Object.assign(base,{depthEnabled:true,bevelAmount:.45,innerShadowAmount:.25,ambientOcclusionEnabled:true,ambientOcclusionAmount:.35});
    if(id==='neonCyberpunk') Object.assign(base,{reflectionEnabled:true,reflectionAmount:.35,directionalLightEnabled:true,directionalLightAmount:.7,specularEnabled:true,glareEnabled:true,lensFlareEnabled:true,edgeGlowEnabled:true,electricalEnabled:true,electricalAmount:.25,backgroundTexture:'grid',backgroundTextureAmount:.08});
    if(id==='militaryHud') Object.assign(base,{directionalLightEnabled:true,directionalLightAngle:-35,directionalLightAmount:.45,sweepEnabled:true,sweepAmount:.35,edgeGlowEnabled:true,edgeGlowAmount:.25,backgroundTexture:'grid',backgroundTextureAmount:.14});
    if(id==='raceCar') Object.assign(base,{depthEnabled:true,bevelAmount:.8,innerShadowAmount:.6,reflectionEnabled:true,reflectionAmount:.25,specularEnabled:true,heatEnabled:true,electricalEnabled:true,needleTrailEnabled:true,backgroundTexture:'carbon',backgroundTextureAmount:.35});
    if(id==='sciFiReactor') Object.assign(base,{depthEnabled:true,reflectionEnabled:true,parallaxEnabled:true,parallaxAmount:.45,directionalLightEnabled:true,specularEnabled:true,electricalEnabled:true,electricalAmount:.75,edgeGlowEnabled:true,glareEnabled:true,lensFlareEnabled:true,backgroundTexture:'grid',backgroundTextureAmount:.1});
    if(id==='retroCrt') Object.assign(base,{crtEnabled:true,crtCurvature:.35,crtFlicker:.1,ditherEnabled:true,ditherAmount:.2,ghostingEnabled:true,ghostingAmount:.25,backgroundTexture:'noise',backgroundTextureAmount:.08});
    if(id==='glassPremium') Object.assign(base,{depthEnabled:true,bevelAmount:.9,reflectionEnabled:true,reflectionAmount:.8,specularEnabled:true,specularAmount:.8,ambientOcclusionEnabled:true,ambientOcclusionAmount:.45});
    if(id==='industrial') Object.assign(base,{depthEnabled:true,bevelAmount:.85,innerShadowAmount:.75,directionalLightEnabled:true,directionalLightAmount:.65,dynamicShadowEnabled:true,shadowAmount:.65,specularEnabled:true,backgroundTexture:'brushed-metal',backgroundTextureAmount:.3});
    if(id==='holographic') Object.assign(base,{parallaxEnabled:true,parallaxAmount:.6,directionalLightEnabled:true,sweepEnabled:true,glitchEnabled:true,chromaticEnabled:true,edgeGlowEnabled:true,backgroundTexture:'grid',backgroundTextureAmount:.12});
    setConfig(prev=>({...prev,...base}));
  };

  // Switch Metric helper
  const handleSelectMetric = (metricId: string) => {
    setSelectedMetric(metricId);
    const m = METRIC_PRESETS.find(p => p.id === metricId);
    if (m) {
      setConfig(prev => ({
        ...prev,
        primaryColor: m.defaultPrimary,
        warningColor: m.defaultWarn,
        criticalColor: m.defaultCrit,
        metricLabel: m.label.toUpperCase(),
        metricUnit: m.unit,
        centerValueColor: '#ffffff',
        metricLabelColor: m.defaultPrimary,
        metricLabelColorMode: 'state'
      }));

      // Auto-match live sensor if present
      if (liveTelemetry.sensors.length > 0) {
        const match = liveTelemetry.sensors.find(s => {
          const t = `${s.id} ${s.label}`.toLowerCase();
          if (metricId.includes('cpu') && t.includes('cpu')) return true;
          if (metricId.includes('gpu_temp') && t.includes('gpu') && (t.includes('temp') || t.includes('diode'))) return true;
          if (metricId.includes('gpu') && t.includes('gpu')) return true;
          if (metricId.includes('vram') && (t.includes('vram') || t.includes('memory') || t.includes('gpu mem'))) return true;
          if (metricId.includes('ram') && (t.includes('ram') || t.includes('memory'))) return true;
          if (metricId.includes('fan') && (t.includes('fan') || t.includes('pump') || t.includes('rpm'))) return true;
          return false;
        });
        if (match) setSelectedLiveSensorId(match.id);
      }
    }
  };

  // Switch Style helper
  const handleSelectStyle = (styleId: Aida64GaugeStyle) => {
    const meta = GAUGE_STYLES_REGISTRY.find(s => s.id === styleId);
    if (!meta) return;

    setConfig(prev => {
      const isHorizontal = meta.category === 'horizontal';
      const isVertical = meta.category === 'vertical';

      let newWidth = prev.width;
      let newHeight = prev.height;

      if (isHorizontal) {
        newWidth = meta.defaultConfig.width || 280;
        newHeight = meta.defaultConfig.height || 40;
      } else if (isVertical) {
        newWidth = meta.defaultConfig.width || 48;
        newHeight = meta.defaultConfig.height || 240;
      } else {
        newWidth = 300;
        newHeight = 300;
      }

      return {
        ...prev,
        style: styleId,
        width: newWidth,
        height: newHeight,
        ...meta.defaultConfig
      };
    });
  };

  // Draw gauge state onto canvas for a specific percentage (0 to 100)
  const drawGaugeFrame = useCallback((ctx: CanvasRenderingContext2D, percent: number, cfg: Aida64GaugeSequenceConfig) => {
    const width = cfg.width;
    const height = cfg.height;
    const center = Math.min(width, height) / 2;
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.clearRect(0, 0, width, height);

    // Advanced visual settings & utilities
    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
    const hexToRgb = (hex: string) => {
      const clean = (hex || '#ffffff').replace('#', '');
      const normalized = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
      const n = parseInt(normalized.slice(0, 6), 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    };
    const rgbToHex = (r: number, g: number, b: number) =>
      `#${[r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
    const mixHex = (a: string, b: string, t: number) => {
      const A = hexToRgb(a); const B = hexToRgb(b); const x = clamp01(t);
      return rgbToHex(A.r + (B.r - A.r) * x, A.g + (B.g - A.g) * x, A.b + (B.b - A.b) * x);
    };
    const colorMode = cfg.colorMode || 'threshold';
    const getColorForPercent = (p: number) => {
      const pct = Math.max(0, Math.min(100, p)) / 100;
      if (colorMode === 'single') return cfg.primaryColor;
      if (colorMode === '2-color-gradient') return mixHex(cfg.gradientColor1 || cfg.primaryColor, cfg.gradientColor3 || cfg.criticalColor, pct);
      if (colorMode === '3-color-gradient') {
        const c1 = cfg.gradientColor1 || cfg.primaryColor;
        const c2 = cfg.gradientColor2 || cfg.warningColor;
        const c3 = cfg.gradientColor3 || cfg.criticalColor;
        return pct <= 0.5 ? mixHex(c1, c2, pct * 2) : mixHex(c2, c3, (pct - 0.5) * 2);
      }
      if (p > cfg.criticalThreshold) return cfg.criticalColor;
      if (p > cfg.warningThreshold) return cfg.warningColor;
      return cfg.primaryColor;
    };
    const glowEnabled = cfg.glowEnabled ?? (cfg.glowIntensity > 0);
    const glowStrength = cfg.glowStrength ?? cfg.glowIntensity ?? 0;
    const glowColor = cfg.glowColor || '#ffffff';
    const rotationDeg = Number(cfg.rotationDeg ?? cfg.gapRotationDeg ?? 0);
    const trackOpacity = clamp01(Number(cfg.trackOpacity ?? 0.35));
    const activeOpacity = clamp01(Number(cfg.activeOpacity ?? 1));
    const activeThickness = Math.max(1, Number(cfg.activeThickness ?? (cfg.outerRadius - cfg.innerRadius)));
    const trackThickness = Math.max(1, Number(cfg.trackThickness ?? activeThickness));

    const seeded = (n: number) => { const x = Math.sin((n + 1) * 12.9898 + percent * 78.233) * 43758.5453; return x - Math.floor(x); };
    const effectOn = cfg.effectEngineEnabled ?? false;
    const EI = Math.max(0, Math.min(2, Number(cfg.effectIntensity ?? 1)));
    const q = cfg.effectQuality ?? 'balanced';
    const qualityScale = q === 'draft' ? 0.55 : q === 'high' ? 1.25 : 1;
    const e = (v: number, d = 1) => Math.max(0, Math.min(2, Number(v ?? d) * EI));
    const stateCurve = (p: number) => {
      const x = clamp01(p / 100);
      switch (cfg.effectCurve) {
        case 'ease-in': return x * x;
        case 'ease-out': return 1 - (1 - x) ** 2;
        case 'ease-in-out': return x < 0.5 ? 2 * x * x : 1 - ((-2 * x + 2) ** 2) / 2;
        case 'exponential': return x ** 2.4;
        case 'stepped': return Math.round(x * 10) / 10;
        case 'threshold': return p >= cfg.warningThreshold ? x : x * 0.35;
        case 'warning-ramp': return p < cfg.warningThreshold ? x * 0.35 : (p - cfg.warningThreshold) / Math.max(1, 100 - cfg.warningThreshold);
        default: return x;
      }
    };
    const sp = stateCurve(percent);

    // 1. Render Backdrop FIRST so textures and gradients sit behind the gauge dial
    if (cfg.gradientBackgroundEnabled) {
      const g = ctx.createLinearGradient(0, 0, width, height);
      g.addColorStop(0, cfg.gradientBackgroundStart || '#020617');
      g.addColorStop(1, cfg.gradientBackgroundEnd || '#000000');
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
    const tex = cfg.backgroundTexture || 'none';
    const a = clamp01(Number(cfg.backgroundTextureAmount ?? 0.12)) * EI;
    if (tex !== 'none' && a > 0) {
      ctx.save();
      ctx.globalAlpha = a * 0.35;
      ctx.strokeStyle = '#ffffff';
      ctx.fillStyle = '#ffffff';
      if (tex === 'grid') {
        for (let x = 0; x < width; x += 12) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
        }
        for (let y = 0; y < height; y += 12) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
        }
      } else if (tex === 'carbon') {
        for (let y = -height; y < height * 2; y += 8) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y + width); ctx.stroke();
        }
      } else if (tex === 'brushed-metal') {
        for (let i = 0; i < height * 2; i += 3) {
          ctx.globalAlpha = a * 0.08;
          ctx.fillRect(0, i, width, 1);
        }
      } else {
        for (let i = 0; i < Math.round(width * height * 0.004); i++) {
          ctx.fillRect(Math.floor(seeded(i + 700) * width), Math.floor(seeded(i + 900) * height), 1, 1);
        }
      }
      ctx.restore();
    }

    // Lighting system
    const lightingEnabled = cfg.lightingEnabled ?? false;
    const lightingMode = cfg.lightingMode ?? 'neon';
    const lightingIntensity = clamp01(Number(cfg.lightingIntensity ?? 0.65));
    const lightingRadius = Math.max(0.2, Math.min(1.5, Number(cfg.lightingRadius ?? 0.95)));
    const lightingBloom = Math.max(0, Math.min(40, Number(cfg.lightingBloom ?? 12)));
    const lightingCore = cfg.lightingCore ?? true;
    const lightingCoreIntensity = clamp01(Number(cfg.lightingCoreIntensity ?? 0.75));
    const lightingPulse = clamp01(Number(cfg.lightingPulse ?? 0));
    const lightingColor = cfg.lightingColorMode === 'custom' ? (cfg.lightingCustomColor || '#ffffff') : getColorForPercent(percent);
    const activeLightColor = lightingColor;
    const t = clamp01(percent / 100);
    const effectProgress = sp;
    const lightStrength = lightingEnabled ? lightingIntensity * (0.18 + 0.82 * effectProgress) : 0;

    // Ambient coloured light behind the instrument
    if (lightingEnabled && lightStrength > 0) {
      const rgb = hexToRgb(activeLightColor);
      const radius = Math.max(20, center * lightingRadius);
      const ambient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      const modeScale = lightingMode === 'bloom' ? 1.15 : lightingMode === 'sci-fi' ? 1.0 : lightingMode === 'industrial' ? 0.72 : 0.9;
      const coreA = Math.min(0.24, 0.10 * lightStrength * modeScale);
      ambient.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${coreA})`);
      ambient.addColorStop(0.35, `rgba(${rgb.r},${rgb.g},${rgb.b},${coreA * 0.42})`);
      ambient.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
      ctx.save();
      ctx.fillStyle = ambient;
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.8;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    if (cfg.style === 'seven_segment') {
      const r = Math.min(width, height) * 0.42;
      if (cfg.showTrack) {
        ctx.save(); ctx.strokeStyle = cfg.trackColor; ctx.globalAlpha = trackOpacity; ctx.lineWidth = 3;
        ctx.strokeRect(centerX-r, centerY-r*0.62, r*2, r*1.24); ctx.restore();
      }
      const value = Math.round(percent).toString().padStart(3, ' ');
      const segments: Record<string, number[]> = {
        '0':[0,1,2,3,4,5], '1':[1,2], '2':[0,1,6,4,3], '3':[0,1,6,2,3],
        '4':[5,6,1,2], '5':[0,5,6,2,3], '6':[0,5,6,4,2,3], '7':[0,1,2],
        '8':[0,1,2,3,4,5,6], '9':[0,1,2,3,5,6]
      };
      const drawDigit=(cx:number,cy:number,d:string,scale:number)=>{
        const on=new Set(segments[d]||[]), w=28*scale,h=50*scale,t=6*scale;
        const parts=[[cx-w/2,cy-h/2,cx+w/2-t,cy-h/2+t],[cx+w/2-t,cy-h/2,cx+w/2,cy-t/2],[cx+w/2-t,cy+t/2,cx+w/2,cy+h/2-t],[cx-w/2,cy+h/2-t,cx+w/2-t,cy+h/2],[cx-w/2,cy+t/2,cx-w/2+t,cy+h/2-t],[cx-w/2,cy-h/2,cx-w/2+t,cy-t/2],[cx-w/2,cy-h/2-t/2,cx+w/2-t,cy+t/2]];
        parts.forEach((q,i)=>{ctx.save();ctx.fillStyle=on.has(i)?getColorForPercent(percent):cfg.trackColor;ctx.globalAlpha=on.has(i)?activeOpacity:(cfg.showTrack?trackOpacity:0.12);ctx.fillRect(q[0],q[1],q[2]-q[0],q[3]-q[1]);ctx.restore();});
      };
      const chars=value.split(''); chars.forEach((d,i)=>drawDigit(centerX+(i-1)*42,centerY,d,1));
    } else if (cfg.style === 'mechanical_dial') {
      const r = cfg.outerRadius || (Math.min(width, height) / 2 - 10);
      const inner = cfg.innerRadius || (r - 28);
      const start = (((cfg.startAngleDeg ?? 135) + rotationDeg) * Math.PI) / 180;
      const end = (((cfg.endAngleDeg ?? 405) + rotationDeg) * Math.PI) / 180;
      const ticks = Math.max(4, cfg.segmentCount || 30);
      const step = ticks > 24 ? 5 : (ticks > 12 ? 2 : 1);
      if (cfg.showTrack) {
        ctx.save();
        ctx.strokeStyle = cfg.trackColor;
        ctx.globalAlpha = trackOpacity;
        ctx.lineWidth = trackThickness;
        ctx.beginPath();
        ctx.arc(centerX, centerY, (r + inner) / 2, start, end);
        ctx.stroke();
        ctx.restore();
      }
      for (let i = 0; i <= ticks; i++) {
        const a = start + ((end - start) * i) / ticks;
        const major = i % step === 0;
        const r1 = major ? inner : (inner + (r - inner) * 0.45);
        const r2 = r;
        ctx.save();
        ctx.strokeStyle = (i / ticks) * 100 <= percent ? getColorForPercent((i / ticks) * 100) : cfg.trackColor;
        ctx.globalAlpha = (i / ticks) * 100 <= percent ? activeOpacity : (cfg.showTrack ? trackOpacity : 0);
        ctx.lineWidth = major ? 3 : 1.5;
        ctx.beginPath();
        ctx.moveTo(centerX + Math.cos(a) * r1, centerY + Math.sin(a) * r1);
        ctx.lineTo(centerX + Math.cos(a) * r2, centerY + Math.sin(a) * r2);
        ctx.stroke();
        ctx.restore();
      }
      const a = start + (end - start) * (percent / 100);
      ctx.save();
      ctx.strokeStyle = cfg.needleColor || getColorForPercent(percent);
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + Math.cos(a) * (r - 6), centerY + Math.sin(a) * (r - 6));
      ctx.stroke();
      ctx.fillStyle = cfg.needleColor || '#fff';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (cfg.style === 'radial_bars_true') {
      const count = cfg.segmentCount || 32, inner = cfg.innerRadius || 62, outer = cfg.outerRadius || 132, span = Math.PI * 2 / count;
      const maxGap = span * 0.45;
      const gap = Math.min(maxGap, Math.max(0, (cfg.segmentGapDeg || 2) * Math.PI / 180));
      const active = Math.round(count * percent / 100);
      for (let i = 0; i < count; i++) {
        const a = -Math.PI / 2 + i * span + gap / 2, b = -Math.PI / 2 + (i + 1) * span - gap / 2, rr = inner + (outer - inner) * (Math.min(i + 1, active) / count);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(centerX + Math.cos(a) * inner, centerY + Math.sin(a) * inner);
        ctx.lineTo(centerX + Math.cos(a) * rr, centerY + Math.sin(a) * rr);
        ctx.lineTo(centerX + Math.cos(b) * rr, centerY + Math.sin(b) * rr);
        ctx.lineTo(centerX + Math.cos(b) * inner, centerY + Math.sin(b) * inner);
        ctx.closePath();
        ctx.fillStyle = i < active ? getColorForPercent((i + 1) / count * 100) : cfg.trackColor;
        ctx.globalAlpha = i < active ? activeOpacity : (cfg.showTrack ? trackOpacity : 0);
        ctx.fill();
        ctx.restore();
      }
    } else if (cfg.style === 'multi_ring_telemetry') {
      const vals=[percent,Math.max(0,Math.min(100,percent*0.72+14)),Math.max(0,Math.min(100,100-percent*0.45))], colors=[getColorForPercent(percent),cfg.warningColor,cfg.criticalColor];
      vals.forEach((v,j)=>{const rr=72+j*26, start=-Math.PI/2, end=start+Math.PI*2*v/100;ctx.save();ctx.lineWidth=12;ctx.lineCap='round';if(cfg.showTrack){ctx.strokeStyle=cfg.trackColor;ctx.globalAlpha=trackOpacity;ctx.beginPath();ctx.arc(centerX,centerY,rr,0,Math.PI*2);ctx.stroke();}ctx.strokeStyle=colors[j];ctx.globalAlpha=activeOpacity;ctx.beginPath();ctx.arc(centerX,centerY,rr,start,end);ctx.stroke();ctx.restore();});
    } else if (cfg.style === 'waveform_scope') {
      const r=Math.min(width,height)*0.42;ctx.save();ctx.strokeStyle=cfg.trackColor;ctx.globalAlpha=trackOpacity;ctx.lineWidth=1;ctx.strokeRect(centerX-r,centerY-r*0.62,r*2,r*1.24);ctx.restore();
      ctx.save();ctx.strokeStyle=getColorForPercent(percent);ctx.globalAlpha=activeOpacity;ctx.lineWidth=3;ctx.shadowColor=glowColor;ctx.shadowBlur=glowStrength/2;ctx.beginPath();for(let x=-r;x<=r;x+=3){const amp=(r*0.34)*(percent/100);const y=Math.sin((x+r)/r*Math.PI*5)*amp*(0.45+0.55*percent/100);const px=centerX+x,py=centerY+y;x===-r?ctx.moveTo(px,py):ctx.lineTo(px,py);}ctx.stroke();ctx.restore();
    } else if (cfg.style === 'horizon_level') {
      const r=Math.min(width,height)*0.43, pitch=(percent-50)*0.7, roll=(percent-50)*0.12*Math.PI/180;ctx.save();ctx.beginPath();ctx.arc(centerX,centerY,r,0,Math.PI*2);ctx.clip();ctx.translate(centerX,centerY);ctx.rotate(roll);ctx.fillStyle='#12304a';ctx.fillRect(-r,-r*2+pitch,r*2,r*2);ctx.fillStyle='#8a5a32';ctx.fillRect(-r,pitch,r*2,r*2);ctx.strokeStyle='#e2e8f0';ctx.lineWidth=2;for(let i=-3;i<=3;i++){const y=pitch+i*24;ctx.beginPath();ctx.moveTo(-35,y);ctx.lineTo(35,y);ctx.stroke();}ctx.restore();ctx.save();ctx.strokeStyle=getColorForPercent(percent);ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(centerX-32,centerY);ctx.lineTo(centerX-8,centerY);ctx.moveTo(centerX+8,centerY);ctx.lineTo(centerX+32,centerY);ctx.stroke();ctx.restore();
    } else if (cfg.style === 'compass_needle') {
      const r=Math.min(width,height)*0.43;ctx.save();ctx.strokeStyle=cfg.trackColor;ctx.globalAlpha=trackOpacity;ctx.lineWidth=2;ctx.beginPath();ctx.arc(centerX,centerY,r,0,Math.PI*2);ctx.stroke();ctx.restore();
      for(let i=0;i<36;i++){const a=-Math.PI/2+i*Math.PI*2/36;const rr=i%9===0?r-18:r-10;ctx.save();ctx.strokeStyle='#cbd5e1';ctx.globalAlpha=0.75;ctx.lineWidth=i%9===0?3:1;ctx.beginPath();ctx.moveTo(centerX+Math.cos(a)*rr,centerY+Math.sin(a)*rr);ctx.lineTo(centerX+Math.cos(a)*r,centerY+Math.sin(a)*r);ctx.stroke();ctx.restore();}
      const a=-Math.PI/2+Math.PI*2*percent/100;ctx.save();ctx.strokeStyle=cfg.needleColor||'#ef4444';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(centerX-Math.cos(a)*28,centerY-Math.sin(a)*28);ctx.lineTo(centerX+Math.cos(a)*(r-22),centerY+Math.sin(a)*(r-22));ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(centerX,centerY,7,0,Math.PI*2);ctx.fill();ctx.restore();
    } else if (cfg.style === 'dot_matrix_ring') {
      const count = cfg.segmentCount || 48, rr = (cfg.innerRadius + cfg.outerRadius) / 2, active = Math.round(count * percent / 100);
      const dotRadius = Math.max(1.2, Math.min(5, (Math.PI * 2 * rr) / (count * 2.8)));
      for (let i = 0; i < count; i++) {
        const a = -Math.PI / 2 + i * Math.PI * 2 / count;
        ctx.save();
        ctx.fillStyle = i < active ? getColorForPercent((i + 1) / count * 100) : cfg.trackColor;
        ctx.globalAlpha = i < active ? activeOpacity : (cfg.showTrack ? trackOpacity : 0.12);
        ctx.beginPath();
        ctx.arc(centerX + Math.cos(a) * rr, centerY + Math.sin(a) * rr, dotRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else if (cfg.style === 'battery_cells_v' || cfg.style === 'thermometer_bulb_v') {
      const pad = 12, tubeW = cfg.style === 'battery_cells_v' ? width * 0.55 : width * 0.25, tubeH = height - 36, x = centerX - tubeW / 2, y = 12;
      if (cfg.style === 'battery_cells_v') {
        ctx.save();
        ctx.strokeStyle = cfg.trackColor;
        ctx.globalAlpha = trackOpacity;
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, tubeW, tubeH);
        ctx.fillStyle = cfg.trackColor;
        ctx.fillRect(centerX - 10, 2, 20, 10);
        ctx.restore();
        const count = cfg.segmentCount || 10;
        const gap = Math.min(4, Math.max(1, (tubeH - 8) / (count * 4)));
        const cellH = Math.max(1, (tubeH - 8 - (count - 1) * gap) / count);
        const active = Math.round(count * percent / 100);
        for (let i = 0; i < count; i++) {
          const yy = y + tubeH - 4 - (i + 1) * cellH - i * gap;
          ctx.save();
          ctx.fillStyle = i < active ? getColorForPercent((i + 1) / count * 100) : cfg.trackColor;
          ctx.globalAlpha = i < active ? activeOpacity : (cfg.showTrack ? trackOpacity : 0);
          ctx.fillRect(x + 4, yy, tubeW - 8, cellH);
          ctx.restore();
        }
      } else {
        const bulbR = width * 0.22, stemW = tubeW, stemX = centerX - stemW / 2, stemY = 18, stemH = height - 58;
        ctx.save();
        ctx.fillStyle = cfg.trackColor;
        ctx.globalAlpha = trackOpacity;
        ctx.fillRect(stemX, stemY, stemW, stemH);
        ctx.beginPath();
        ctx.arc(centerX, height - 24, bulbR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        const activeH = stemH * percent / 100;
        ctx.save();
        ctx.fillStyle = getColorForPercent(percent);
        ctx.globalAlpha = activeOpacity;
        ctx.fillRect(stemX + 3, stemY + stemH - activeH, stemW - 6, activeH);
        ctx.beginPath();
        ctx.arc(centerX, height - 24, bulbR - 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        for (let i = 0; i <= 10; i++) {
          const yy = stemY + stemH - (stemH * i / 10);
          ctx.save();
          ctx.strokeStyle = '#e2e8f0';
          ctx.globalAlpha = 0.7;
          ctx.lineWidth = i % 5 === 0 ? 2 : 1;
          ctx.beginPath();
          ctx.moveTo(stemX + stemW + 4, yy);
          ctx.lineTo(stemX + stemW + (i % 5 === 0 ? 14 : 9), yy);
          ctx.stroke();
          ctx.restore();
        }
      }
    } else if (cfg.style === 'segmented_arc' || cfg.style === 'radial_bar') {
      const startRad = ((cfg.startAngleDeg + rotationDeg) * Math.PI) / 180;
      const endRad = (cfg.endAngleDeg * Math.PI) / 180;
      const totalSpanRad = endRad - startRad;
      const segCount = Math.max(1, cfg.segmentCount || 24);
      const segmentSpanRad = totalSpanRad / segCount;
      const maxGapRad = segmentSpanRad * 0.45;
      const gapRad = Math.min(maxGapRad, Math.max(0, (cfg.segmentGapDeg * Math.PI) / 180));
      const activeSegments = Math.round((percent / 100) * segCount);

      for (let i = 0; i < segCount; i++) {
        const segStart = startRad + i * segmentSpanRad + gapRad / 2;
        const segEnd = startRad + (i + 1) * segmentSpanRad - gapRad / 2;
        const segPercent = ((i + 1) / segCount) * 100;
        const isActive = i < activeSegments;
        const color = getColorForPercent(segPercent);

        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, cfg.outerRadius, segStart, segEnd, false);
        ctx.arc(centerX, centerY, cfg.innerRadius, segEnd, segStart, true);
        ctx.closePath();

        if (isActive) {
          if (glowEnabled && glowStrength > 0) {
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = glowStrength;
          }
          ctx.globalAlpha = activeOpacity;
          ctx.fillStyle = color;
          ctx.fill();
        } else if (cfg.showTrack) {
          const trackInner = Math.max(1, cfg.outerRadius - trackThickness);
          ctx.beginPath();
          ctx.arc(centerX, centerY, cfg.outerRadius, segStart, segEnd, false);
          ctx.arc(centerX, centerY, trackInner, segEnd, segStart, true);
          ctx.closePath();
          ctx.globalAlpha = trackOpacity;
          ctx.fillStyle = cfg.trackColor;
          ctx.fill();
        }
        ctx.restore();
      }
    } else if (cfg.style === 'smooth_arc' || cfg.style === 'donut_meter') {
      const startRad = ((cfg.startAngleDeg + rotationDeg) * Math.PI) / 180;
      const endRad = (cfg.endAngleDeg * Math.PI) / 180;
      const totalSpanRad = endRad - startRad;
      const currentEndRad = startRad + (percent / 100) * totalSpanRad;

      // Track
      if (cfg.showTrack) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, (cfg.innerRadius + cfg.outerRadius) / 2, startRad, endRad, false);
        ctx.strokeStyle = cfg.trackColor;
        ctx.lineWidth = trackThickness;
        ctx.globalAlpha = trackOpacity;
        ctx.lineCap = (cfg.roundedEnds ?? true) ? 'round' : 'butt';
        ctx.stroke();
        ctx.restore();
      }

      // Active Arc
      if (percent > 0) {
        const color = getColorForPercent(percent);
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, (cfg.innerRadius + cfg.outerRadius) / 2, startRad, currentEndRad, false);
        ctx.strokeStyle = color;
        ctx.lineWidth = activeThickness;
        ctx.globalAlpha = activeOpacity;
        ctx.lineCap = (cfg.roundedEnds ?? true) ? 'round' : 'butt';
        if (glowEnabled && glowStrength > 0) {
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = glowStrength;
        }
        ctx.stroke();
        ctx.restore();
      }
    } else if (cfg.style === 'radial_ticks' || cfg.style === 'compass_ring') {
      const startRad = ((cfg.startAngleDeg + rotationDeg) * Math.PI) / 180;
      const endRad = (cfg.endAngleDeg * Math.PI) / 180;
      const totalSpanRad = endRad - startRad;
      const tickCount = cfg.segmentCount;
      const activeTicks = Math.round((percent / 100) * tickCount);

      for (let i = 0; i <= tickCount; i++) {
        const rad = startRad + (i / tickCount) * totalSpanRad;
        const isActive = i <= activeTicks;
        const tickPercent = (i / tickCount) * 100;
        const color = getColorForPercent(tickPercent);

        const isMajor = i % 5 === 0;
        const inR = isMajor ? cfg.innerRadius - 6 : cfg.innerRadius;
        const outR = isMajor ? cfg.outerRadius + 4 : cfg.outerRadius;

        const x1 = centerX + inR * Math.cos(rad);
        const y1 = centerY + inR * Math.sin(rad);
        const x2 = centerX + outR * Math.cos(rad);
        const y2 = centerY + outR * Math.sin(rad);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineWidth = isMajor ? 3.5 : 2;
        ctx.strokeStyle = isActive ? color : (cfg.showTrack ? cfg.trackColor : 'transparent');
        ctx.globalAlpha = isActive ? activeOpacity : (cfg.showTrack ? trackOpacity : 0);
        if (isActive && cfg.glowIntensity > 0) {
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = glowStrength;
        }
        ctx.stroke();
        ctx.restore();
      }
    } else if (cfg.style === 'led_ladder') {
      const startRad = ((cfg.startAngleDeg + rotationDeg) * Math.PI) / 180;
      const endRad = (cfg.endAngleDeg * Math.PI) / 180;
      const totalSpanRad = endRad - startRad;
      const count = cfg.segmentCount;
      const activeLeds = Math.round((percent / 100) * count);
      const midRadius = (cfg.innerRadius + cfg.outerRadius) / 2;
      const dotRadius = Math.max(3, activeThickness / 3.2);

      for (let i = 0; i < count; i++) {
        const rad = startRad + (i / (count - 1 || 1)) * totalSpanRad;
        const dotPercent = ((i + 1) / count) * 100;
        const isActive = i < activeLeds;
        const color = getColorForPercent(dotPercent);

        const x = centerX + midRadius * Math.cos(rad);
        const y = centerY + midRadius * Math.sin(rad);

        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, isActive ? dotRadius : Math.max(2, trackThickness / 3.2), 0, Math.PI * 2);
        if (isActive) {
          if (glowEnabled && glowStrength > 0) {
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = glowStrength;
          }
          ctx.globalAlpha = activeOpacity;
          ctx.fillStyle = color;
        } else {
          ctx.globalAlpha = cfg.showTrack ? trackOpacity : 0;
          ctx.fillStyle = cfg.trackColor;
        }
        ctx.fill();
        ctx.restore();
      }
    } else if (cfg.style === 'dual_ring' || cfg.style === 'concentric_dual') {
      // Outer Ring = Primary Utilization (percent)
      // Inner Ring = Secondary Temp/Value
      const secVal = cfg.secondaryValue !== undefined ? cfg.secondaryValue : Math.round(35 + (percent / 100) * 45); // default 35-80°C
      const startRad = ((cfg.startAngleDeg + rotationDeg) * Math.PI) / 180;
      const endRad = (cfg.endAngleDeg * Math.PI) / 180;
      const totalSpanRad = endRad - startRad;

      const outerSpan = (percent / 100) * totalSpanRad;
      const innerSpan = ((secVal - 30) / 70) * totalSpanRad; // 30°C to 100°C range

      // Tracks
      if (cfg.showTrack) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, cfg.outerRadius, startRad, endRad, false);
        ctx.strokeStyle = cfg.trackColor;
        ctx.lineWidth = trackThickness;
        ctx.globalAlpha = trackOpacity;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(centerX, centerY, cfg.innerRadius, startRad, endRad, false);
        ctx.strokeStyle = cfg.trackColor;
        ctx.lineWidth = Math.max(2, Math.round(trackThickness * 0.8));
        ctx.globalAlpha = trackOpacity;
        ctx.stroke();
        ctx.restore();
      }

      // Outer Arc
      if (percent > 0) {
        const color = getColorForPercent(percent);
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, cfg.outerRadius, startRad, startRad + outerSpan, false);
        ctx.strokeStyle = color;
        ctx.lineWidth = trackThickness;
        ctx.globalAlpha = activeOpacity;
        ctx.lineCap = (cfg.roundedEnds ?? true) ? 'round' : 'butt';
        if (glowEnabled && glowStrength > 0) {
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = glowStrength;
        }
        ctx.stroke();
        ctx.restore();
      }

      // Inner Arc (Cyan/Orange Temp indicator)
      if (innerSpan > 0) {
        const innerColor = secVal > 75 ? '#ef4444' : secVal > 60 ? '#f59e0b' : '#06b6d4';
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, cfg.innerRadius, startRad, startRad + Math.max(0.01, innerSpan), false);
        ctx.strokeStyle = innerColor;
        ctx.lineWidth = Math.max(2, Math.round(trackThickness * 0.8));
        ctx.globalAlpha = activeOpacity;
        ctx.lineCap = (cfg.roundedEnds ?? true) ? 'round' : 'butt';
        ctx.stroke();
        ctx.restore();
      }
    } else if (cfg.style === 'progress_ring') {
      const startRad = ((-90 + rotationDeg) * Math.PI) / 180;
      const activeSpan = (percent / 100) * Math.PI * 2;
      const radius = (cfg.innerRadius + cfg.outerRadius) / 2;
      const thickness = cfg.activeThickness ?? (cfg.outerRadius - cfg.innerRadius);

      // Track
      if (cfg.showTrack) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = cfg.trackColor;
        ctx.lineWidth = trackThickness;
        ctx.globalAlpha = trackOpacity;
        ctx.stroke();
        ctx.restore();
      }

      // Active
      if (percent > 0) {
        const color = getColorForPercent(percent);
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startRad, startRad + activeSpan, false);
        ctx.strokeStyle = color;
        ctx.lineWidth = activeThickness;
        ctx.globalAlpha = activeOpacity;
        ctx.lineCap = (cfg.roundedEnds ?? true) ? 'round' : 'butt';
        if (glowEnabled && glowStrength > 0) {
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = glowStrength;
        }
        ctx.stroke();
        ctx.restore();
      }
    } else if (cfg.style === 'digital_arc' || cfg.style === 'cyber_hud_ring') {
      // Tech HUD Arc with stepped brackets and hash marks
      const startRad = ((cfg.startAngleDeg + rotationDeg) * Math.PI) / 180;
      const endRad = (cfg.endAngleDeg * Math.PI) / 180;
      const totalSpanRad = endRad - startRad;
      const segments = cfg.segmentCount || 16;
      const activeSegs = Math.round((percent / 100) * segments);

      for (let i = 0; i < segments; i++) {
        const rad = startRad + (i / (segments - 1)) * totalSpanRad;
        const segPercent = ((i + 1) / segments) * 100;
        const isActive = i < activeSegs;
        const color = getColorForPercent(segPercent);

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(rad);

        // Draw bracket segment
        ctx.fillStyle = isActive ? color : (cfg.showTrack ? cfg.trackColor : 'transparent');
        ctx.globalAlpha = isActive ? activeOpacity : (cfg.showTrack ? trackOpacity : 0);
        if (isActive && cfg.glowIntensity > 0) {
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = glowStrength;
        }
        const segmentHeight = isActive ? activeThickness : trackThickness;
        ctx.fillRect(cfg.innerRadius, -segmentHeight / 2, cfg.outerRadius - cfg.innerRadius, segmentHeight);
        ctx.restore();
      }
    } else if (cfg.style === 'needle_gauge' || cfg.style === 'speedometer_classic') {
      // Automotive Tachometer with rotating mechanical needle
      const startRad = ((cfg.startAngleDeg + rotationDeg) * Math.PI) / 180;
      const endRad = (cfg.endAngleDeg * Math.PI) / 180;
      const totalSpanRad = endRad - startRad;
      const needleRad = startRad + (percent / 100) * totalSpanRad;

      // Draw background track arc
      if (cfg.showTrack) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, (cfg.innerRadius + cfg.outerRadius) / 2, startRad, endRad, false);
        ctx.strokeStyle = cfg.trackColor;
        ctx.lineWidth = trackThickness;
        ctx.globalAlpha = trackOpacity;
        ctx.lineCap = (cfg.roundedEnds ?? true) ? 'round' : 'butt';
        ctx.stroke();
        ctx.restore();
      }

      // Draw dynamic gauge tick marks based on segmentCount and inner/outer radius
      const ticks = Math.max(4, cfg.segmentCount || 28);
      const step = ticks > 24 ? 5 : (ticks > 12 ? 2 : 1);
      for (let i = 0; i <= ticks; i++) {
        const rad = startRad + (i / ticks) * totalSpanRad;
        const tickPercent = (i / ticks) * 100;
        const isMajor = i % step === 0;
        const inR = isMajor ? cfg.innerRadius : (cfg.innerRadius + (cfg.outerRadius - cfg.innerRadius) * 0.4);
        const outR = cfg.outerRadius;

        const x1 = centerX + inR * Math.cos(rad);
        const y1 = centerY + inR * Math.sin(rad);
        const x2 = centerX + outR * Math.cos(rad);
        const y2 = centerY + outR * Math.sin(rad);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineWidth = isMajor ? 3 : 1.5;
        ctx.strokeStyle = tickPercent <= percent ? getColorForPercent(tickPercent) : (cfg.showTrack ? cfg.trackColor : '#334155');
        ctx.globalAlpha = tickPercent <= percent ? activeOpacity : (cfg.showTrack ? trackOpacity : 0.2);
        if (tickPercent <= percent && glowEnabled && glowStrength > 0) {
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = glowStrength / 2;
        }
        ctx.stroke();
        ctx.restore();
      }

      // Draw Needle reaching outerRadius
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(needleRad);

      const needleColor = cfg.needleColor || '#ef4444';
      const needleGlowOn = cfg.needleGlowEnabled ?? true;
      const needleGlowCol = cfg.needleGlowColorMode === 'state'
        ? getColorForPercent(percent)
        : (cfg.needleGlowColorMode === 'custom' && cfg.needleGlowColor ? cfg.needleGlowColor : needleColor);
      const needleGlowRad = cfg.needleGlowRadius ?? (cfg.needleShadowEnabled === false ? 0 : 10);

      // Multi-layer luminous glow halo behind needle
      if (needleGlowOn && needleGlowRad > 0) {
        ctx.save();
        ctx.shadowColor = needleGlowCol;
        ctx.shadowBlur = needleGlowRad * 1.5;
        ctx.strokeStyle = needleGlowCol;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(cfg.outerRadius, 0);
        ctx.stroke();
        ctx.restore();
      }

      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(cfg.outerRadius - 8, -2.5);
      ctx.lineTo(cfg.outerRadius, 0);
      ctx.lineTo(cfg.outerRadius - 8, 2.5);
      ctx.closePath();

      ctx.fillStyle = needleColor;
      if (needleGlowOn && needleGlowRad > 0) {
        ctx.shadowColor = needleGlowCol;
        ctx.shadowBlur = needleGlowRad;
      } else if (cfg.needleShadowEnabled !== false) {
        ctx.shadowColor = needleColor;
        ctx.shadowBlur = 8;
      }
      ctx.fill();

      // Center pivot cap
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = needleColor;
      if (needleGlowOn && needleGlowRad > 0) {
        ctx.shadowColor = needleGlowCol;
        ctx.shadowBlur = needleGlowRad / 2;
      }
      ctx.stroke();
      ctx.restore();
    } else if (cfg.style === 'half_arc') {
      // 180-degree top hemisphere
      const startRad = ((180 + rotationDeg) * Math.PI) / 180;
      const endRad = ((360 + rotationDeg) * Math.PI) / 180;
      const radius = (cfg.innerRadius + cfg.outerRadius) / 2;
      const count = cfg.segmentCount || 16;
      const segGap = (cfg.segmentGapDeg || 2.5) * Math.PI / 180;
      const spanRad = Math.PI / count;
      const activeSegs = Math.round((percent / 100) * count);

      if (count > 0 && cfg.segmentGapDeg && cfg.segmentGapDeg > 0) {
        // Segmented rendering
        for (let i = 0; i < count; i++) {
          const s = startRad + i * spanRad + segGap / 2;
          const e = startRad + (i + 1) * spanRad - segGap / 2;
          const isActive = i < activeSegs;
          const segPercent = ((i + 1) / count) * 100;
          const color = getColorForPercent(segPercent);

          ctx.save();
          ctx.beginPath();
          ctx.arc(centerX, height - 10, cfg.outerRadius, s, e, false);
          ctx.arc(centerX, height - 10, cfg.innerRadius, e, s, true);
          ctx.closePath();
          if (isActive) {
            ctx.fillStyle = color;
            ctx.globalAlpha = activeOpacity;
            if (glowEnabled && glowStrength > 0) {
              ctx.shadowColor = glowColor;
              ctx.shadowBlur = glowStrength;
            }
            ctx.fill();
          } else if (cfg.showTrack) {
            ctx.fillStyle = cfg.trackColor;
            ctx.globalAlpha = trackOpacity;
            ctx.fill();
          }
          ctx.restore();
        }
      } else {
        // Continuous smooth arc
        const activeSpan = (percent / 100) * Math.PI;
        if (cfg.showTrack) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(centerX, height - 10, radius, startRad, endRad, false);
          ctx.strokeStyle = cfg.trackColor;
          ctx.lineWidth = trackThickness;
          ctx.globalAlpha = trackOpacity;
          ctx.stroke();
          ctx.restore();
        }
        if (percent > 0) {
          const color = getColorForPercent(percent);
          ctx.save();
          ctx.beginPath();
          ctx.arc(centerX, height - 10, radius, startRad, startRad + activeSpan, false);
          ctx.strokeStyle = color;
          ctx.lineWidth = activeThickness;
          ctx.globalAlpha = activeOpacity;
          ctx.lineCap = (cfg.roundedEnds ?? true) ? 'round' : 'butt';
          if (glowEnabled && glowStrength > 0) {
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = glowStrength;
          }
          ctx.stroke();
          ctx.restore();
        }
      }
    } else if (cfg.style === 'corner_gauge') {
      // 90° quadrant corner arc
      const startRad = ((180 + rotationDeg) * Math.PI) / 180;
      const endRad = ((270 + rotationDeg) * Math.PI) / 180;
      const activeSpan = (percent / 100) * (Math.PI * 0.5);
      const radius = (cfg.innerRadius + cfg.outerRadius) / 2;
      const thickness = cfg.activeThickness ?? (cfg.outerRadius - cfg.innerRadius);

      if (cfg.showTrack) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(width - 10, height - 10, radius, startRad, endRad, false);
        ctx.strokeStyle = cfg.trackColor;
        ctx.lineWidth = trackThickness;
        ctx.globalAlpha = trackOpacity;
        ctx.stroke();
        ctx.restore();
      }

      if (percent > 0) {
        const color = getColorForPercent(percent);
        ctx.save();
        ctx.beginPath();
        ctx.arc(width - 10, height - 10, radius, startRad, startRad + activeSpan, false);
        ctx.strokeStyle = color;
        ctx.lineWidth = activeThickness;
        ctx.globalAlpha = activeOpacity;
        ctx.lineCap = (cfg.roundedEnds ?? true) ? 'round' : 'butt';
        if (glowEnabled && glowStrength > 0) {
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = glowStrength;
        }
        ctx.stroke();
        ctx.restore();
      }
    } else if (cfg.style === 'radar_tactical') {
      // Concentric range rings with sweep fill
      const maxR = Math.min(width, height) / 2 - 10;

      // Concentric rings + crosshairs use the same Background Track controls.
      if (cfg.showTrack) {
        [0.3, 0.6, 0.9].forEach(factor => {
          ctx.save();
          ctx.beginPath();
          ctx.arc(centerX, centerY, maxR * factor, 0, Math.PI * 2);
          ctx.strokeStyle = cfg.trackColor;
          ctx.globalAlpha = trackOpacity;
          ctx.lineWidth = Math.max(1, Math.min(3, trackThickness / 12));
          ctx.stroke();
          ctx.restore();
        });

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(centerX - maxR, centerY);
        ctx.lineTo(centerX + maxR, centerY);
        ctx.moveTo(centerX, centerY - maxR);
        ctx.lineTo(centerX, centerY + maxR);
        ctx.strokeStyle = cfg.trackColor;
        ctx.globalAlpha = trackOpacity;
        ctx.lineWidth = Math.max(1, Math.min(3, trackThickness / 12));
        ctx.stroke();
        ctx.restore();
      }

      // Sweep pie sector
      if (percent > 0) {
        const color = getColorForPercent(percent);
        const sweepSpan = (percent / 100) * Math.PI * 2;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, maxR, -Math.PI / 2, -Math.PI / 2 + sweepSpan);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.35;
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
    } else if (cfg.style === 'led_bar_h' || cfg.style === 'battery_bar_h' || cfg.style === 'vu_meter_h') {
      // Horizontal LED blocks
      const pad = 4;
      const count = Math.max(1, cfg.segmentCount || 20);
      const gap = Math.min(3, Math.max(1, (width - pad * 2) / (count * 4)));
      const segWidth = Math.max(1, (width - pad * 2 - (count - 1) * gap) / count);
      const availableH = height - pad * 2;
      const activeCount = Math.round((percent / 100) * count);

      for (let i = 0; i < count; i++) {
        const x = pad + i * (segWidth + gap);
        const segPercent = ((i + 1) / count) * 100;
        const isActive = i < activeCount;
        const segHeight = Math.min(availableH, isActive ? activeThickness : trackThickness);
        const y = pad + (availableH - segHeight) / 2;
        const color = getColorForPercent(segPercent);

        ctx.save();
        ctx.fillStyle = isActive ? color : cfg.trackColor;
        ctx.globalAlpha = isActive ? activeOpacity : (cfg.showTrack ? trackOpacity : 0);
        if (isActive && cfg.glowIntensity > 0) {
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = glowStrength / 2;
        }
        ctx.fillRect(x, y, segWidth, segHeight);
        ctx.restore();
      }
    } else if (cfg.style === 'segment_bar_h') {
      // Chunky Angled Segments
      const pad = 4;
      const count = Math.max(1, cfg.segmentCount || 14);
      const gap = Math.min(4, Math.max(1, (width - pad * 2) / (count * 4)));
      const segWidth = Math.max(1.5, (width - pad * 2 - (count - 1) * gap) / count);
      const availableH = height - pad * 2;
      const activeCount = Math.round((percent / 100) * count);
      const skew = Math.min(6, Math.max(0.5, segWidth * 0.35));

      for (let i = 0; i < count; i++) {
        const x = pad + i * (segWidth + gap);
        const segPercent = ((i + 1) / count) * 100;
        const isActive = i < activeCount;
        const segHeight = Math.min(availableH, isActive ? activeThickness : trackThickness);
        const y = pad + (availableH - segHeight) / 2;
        const color = getColorForPercent(segPercent);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x + skew, y);
        ctx.lineTo(x + segWidth, y);
        ctx.lineTo(x + segWidth - skew, y + segHeight);
        ctx.lineTo(x, y + segHeight);
        ctx.closePath();

        ctx.fillStyle = isActive ? color : cfg.trackColor;
        ctx.globalAlpha = isActive ? activeOpacity : (cfg.showTrack ? trackOpacity : 0);
        if (isActive && cfg.glowIntensity > 0) {
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = glowStrength / 2;
        }
        ctx.fill();
        ctx.restore();
      }
    } else if (cfg.style === 'thermal_bar_h' || cfg.style === 'progress_bar_h') {
      // Horizontal Thermal Gradient Bar
      const pad = 4;
      const barW = width - pad * 2;
      const barH = height - pad * 2;

      // Track
      if (cfg.showTrack) {
        ctx.save();
        ctx.fillStyle = cfg.trackColor;
        ctx.globalAlpha = trackOpacity;
        const trackH = Math.min(barH, trackThickness);
        const trackY = pad + (barH - trackH) / 2;
        ctx.fillRect(pad, trackY, barW, trackH);
        ctx.restore();
      }

      // Active gradient
      if (percent > 0) {
        const activeW = (percent / 100) * barW;
        const activeH = Math.min(barH, activeThickness);
        const activeY = pad + (barH - activeH) / 2;
        ctx.save();
        const grad = ctx.createLinearGradient(pad, 0, pad + barW, 0);
        grad.addColorStop(0, '#38bdf8');
        grad.addColorStop(0.4, '#10b981');
        grad.addColorStop(0.75, '#f59e0b');
        grad.addColorStop(1.0, '#ef4444');

        ctx.fillStyle = grad;
        ctx.globalAlpha = activeOpacity;
        if (glowEnabled && glowStrength > 0) {
          ctx.shadowColor = getColorForPercent(percent);
          ctx.shadowBlur = glowStrength / 2;
        }
        ctx.fillRect(pad, activeY, activeW, activeH);
        ctx.restore();
      }
    } else if (cfg.style === 'industrial_bar_h' || cfg.style === 'industrial_meter_h') {
      // Heavy Industrial Tile Bar
      const pad = 6;
      const count = Math.max(1, cfg.segmentCount || 10);
      const gap = Math.min(4, Math.max(1, (width - pad * 2) / (count * 4)));
      const segWidth = Math.max(1.5, (width - pad * 2 - (count - 1) * gap) / count);
      const availableH = height - pad * 2;
      const activeCount = Math.round((percent / 100) * count);

      for (let i = 0; i < count; i++) {
        const x = pad + i * (segWidth + gap);
        const segPercent = ((i + 1) / count) * 100;
        const isActive = i < activeCount;
        const segHeight = Math.min(availableH, isActive ? activeThickness : trackThickness);
        const y = pad + (availableH - segHeight) / 2;
        const color = getColorForPercent(segPercent);

        ctx.save();
        ctx.fillStyle = isActive ? color : cfg.trackColor;
        ctx.globalAlpha = isActive ? activeOpacity : (cfg.showTrack ? trackOpacity : 0);
        ctx.fillRect(x, y, segWidth, segHeight);

        // Metallic border
        ctx.globalAlpha = isActive ? activeOpacity : (cfg.showTrack ? trackOpacity : 0);
        ctx.strokeStyle = isActive ? '#ffffff' : '#334155';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, segWidth, segHeight);
        ctx.restore();
      }
    } else if (cfg.style === 'segment_ladder_v' || cfg.style === 'ladder_vu_v') {
      // Vertical Segment Ladder
      const pad = 4;
      const count = Math.max(1, cfg.segmentCount || 20);
      const gap = Math.min(3, Math.max(1, (height - pad * 2) / (count * 4)));
      const segHeight = Math.max(1, (height - pad * 2 - (count - 1) * gap) / count);
      const availableW = width - pad * 2;
      const activeCount = Math.round((percent / 100) * count);

      for (let i = 0; i < count; i++) {
        const y = height - pad - (i + 1) * segHeight - i * gap;
        const segPercent = ((i + 1) / count) * 100;
        const isActive = i < activeCount;
        const segWidth = Math.min(availableW, isActive ? activeThickness : trackThickness);
        const x = pad + (availableW - segWidth) / 2;
        const color = getColorForPercent(segPercent);

        ctx.save();
        ctx.fillStyle = isActive ? color : cfg.trackColor;
        ctx.globalAlpha = isActive ? activeOpacity : (cfg.showTrack ? trackOpacity : 0);
        if (isActive && cfg.glowIntensity > 0) {
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = glowStrength / 2;
        }
        ctx.fillRect(x, y, segWidth, segHeight);
        ctx.restore();
      }
    } else if (cfg.style === 'thermal_bar_v' || cfg.style === 'thermometer_v') {
      // Vertical Thermometer
      const pad = 6;
      const barW = width - pad * 2;
      const barH = height - pad * 2;

      // Track
      if (cfg.showTrack) {
        ctx.save();
        ctx.fillStyle = cfg.trackColor;
        ctx.globalAlpha = trackOpacity;
        const trackW = Math.min(barW, trackThickness);
        const trackX = pad + (barW - trackW) / 2;
        ctx.fillRect(trackX, pad, trackW, barH);
        ctx.restore();
      }

      // Gradient
      if (percent > 0) {
        const activeH = (percent / 100) * barH;
        const activeW = Math.min(barW, activeThickness);
        const activeX = pad + (barW - activeW) / 2;
        const activeY = height - pad - activeH;

        ctx.save();
        const grad = ctx.createLinearGradient(0, height - pad, 0, pad);
        grad.addColorStop(0, '#38bdf8');
        grad.addColorStop(0.4, '#10b981');
        grad.addColorStop(0.75, '#f59e0b');
        grad.addColorStop(1.0, '#ef4444');

        ctx.fillStyle = grad;
        ctx.globalAlpha = activeOpacity;
        if (glowEnabled && glowStrength > 0) {
          ctx.shadowColor = getColorForPercent(percent);
          ctx.shadowBlur = glowStrength / 2;
        }
        ctx.fillRect(activeX, activeY, activeW, activeH);
        ctx.restore();
      }
    }

    // Advanced deterministic effects layer for the 100-state export.
    const materialStyle = cfg.materialStyle || 'none';
    const materialOpacity = clamp01(Number(cfg.materialOpacity ?? 0.22));
    const materialHighlight = clamp01(Number(cfg.materialHighlight ?? 0.5));
    const isCircular = !isLinearGaugeStyle(cfg.style);

    if (cfg.depthEnabled) {
      const d = e(cfg.depthAmount ?? 0.45), b = e(cfg.bevelAmount ?? 0.55), sh = e(cfg.innerShadowAmount ?? 0.35);
      ctx.save();
      ctx.lineWidth = Math.max(1, 2 + d * 3);
      ctx.strokeStyle = `rgba(255,255,255,${0.08 * b})`;
      ctx.strokeRect(1, 1, width - 2, height - 2);
      const sg = ctx.createLinearGradient(0, 0, width, height);
      sg.addColorStop(0, `rgba(255,255,255,${0.12 * b})`);
      sg.addColorStop(0.35, 'rgba(255,255,255,0)');
      sg.addColorStop(1, `rgba(0,0,0,${0.2 * d})`);
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 0.18 * sh;
      ctx.filter = `blur(${2 + d * 3}px)`;
      ctx.fillStyle = '#000';
      ctx.fillRect(3, 3, width - 6, height - 6);
      ctx.restore();
    }

    if (cfg.dynamicShadowEnabled) {
      const shAmt = e(cfg.shadowAmount ?? 0.5);
      const ang = (Number(cfg.directionalLightAngle ?? -45) * Math.PI) / 180;
      const dist = Math.max(2, 6 * shAmt);
      const shadowCopy = document.createElement('canvas');
      shadowCopy.width = width;
      shadowCopy.height = height;
      const sc = shadowCopy.getContext('2d');
      if (sc) {
        sc.drawImage(ctx.canvas, 0, 0);
        ctx.save();
        ctx.globalCompositeOperation = 'destination-over';
        ctx.globalAlpha = 0.35 * shAmt;
        ctx.filter = `blur(${Math.max(2, 5 * shAmt)}px)`;
        ctx.drawImage(shadowCopy, -Math.cos(ang) * dist, -Math.sin(ang) * dist);
        ctx.restore();
      }
    }

    if (cfg.directionalLightEnabled) {
      const a = (Number(cfg.directionalLightAngle ?? -45) * Math.PI) / 180, len = Math.max(width, height) * 1.4, x0 = centerX - Math.cos(a) * len, y0 = centerY - Math.sin(a) * len, x1 = centerX + Math.cos(a) * len, y1 = centerY + Math.sin(a) * len;
      const rgb = hexToRgb(activeLightColor), g = ctx.createLinearGradient(x0, y0, x1, y1);
      const op = 0.02 * e(cfg.directionalLightAmount ?? 0.8) * (0.4 + 0.6 * sp);
      g.addColorStop(0, `rgba(255,255,255,${op})`);
      g.addColorStop(0.5, `rgba(${rgb.r},${rgb.g},${rgb.b},${op * 0.55})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save();
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    if (cfg.lightSources?.length) {
      for (const ls of cfg.lightSources) {
        if (!ls?.enabled) continue;
        const a = (ls.angle * Math.PI) / 180, r = Math.max(width, height) * Math.max(0.2, ls.radius || 1), x = centerX + Math.cos(a) * r * 0.35, y = centerY + Math.sin(a) * r * 0.35, c = hexToRgb(ls.color || activeLightColor), g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(${c.r},${c.g},${c.b},${clamp01(ls.intensity) * 0.16 * EI})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
    }

    if (cfg.ambientOcclusionEnabled) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 0.08 * e(cfg.ambientOcclusionAmount ?? 0.7);
      ctx.filter = 'blur(7px)';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 12;
      ctx.strokeRect(6, 6, width - 12, height - 12);
      ctx.restore();
    }

    if (cfg.reflectionEnabled) {
      const a = clamp01(Number(cfg.reflectionAmount ?? 0.6)) * EI;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.22 * a;
      const g = ctx.createLinearGradient(0, 0, width, height);
      g.addColorStop(0, 'rgba(255,255,255,.55)');
      g.addColorStop(0.18, 'rgba(255,255,255,.08)');
      g.addColorStop(0.42, 'rgba(255,255,255,0)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    if (cfg.specularEnabled) {
      const a = clamp01(Number(cfg.specularAmount ?? 0.55)) * EI;
      const x = (percent / 100) * width, y = height * 0.18 + Math.sin(sp * Math.PI) * height * 0.18;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.45 * a;
      ctx.filter = 'blur(4px)';
      const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(8, width * 0.12));
      g.addColorStop(0, '#fff');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    if (cfg.parallaxEnabled) {
      const pa = e(cfg.parallaxAmount ?? 0.35), dx = Math.sin(sp * Math.PI) * pa * 4, dy = Math.cos(sp * Math.PI) * pa * 2;
      const copy = document.createElement('canvas');
      copy.width = width;
      copy.height = height;
      const cc = copy.getContext('2d');
      if (cc) {
        cc.drawImage(ctx.canvas, 0, 0);
        ctx.save();
        ctx.globalAlpha = 0.16 * pa;
        ctx.drawImage(copy, dx, dy);
        ctx.restore();
      }
    }

    if (cfg.liquidEnabled) {
      const amt = e(cfg.liquidAmount ?? 0.65), c = hexToRgb(activeLightColor), fill = height * (0.18 + 0.72 * t);
      ctx.save();
      ctx.globalAlpha = 0.14 * amt;
      ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},1)`;
      ctx.beginPath();
      ctx.ellipse(centerX, height - fill * 0.15, width * 0.32, Math.max(3, height * 0.025), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.45 * amt;
      for (let i = 0; i < Math.round((cfg.bubbleCount ?? 8) * qualityScale); i++) {
        const bx = centerX + (seeded(i + 1100) - 0.5) * width * 0.5, by = height - (seeded(i + 1200) * fill);
        ctx.beginPath();
        ctx.arc(bx, by, 1 + seeded(i + 1300) * 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (cfg.heatEnabled) {
      const h = e(cfg.heatAmount ?? 0.65) * (0.3 + 0.7 * sp);
      const warm = percent >= cfg.criticalThreshold ? '#ff2d00' : percent >= cfg.warningThreshold ? '#ff9d00' : activeLightColor;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.14 * h;
      ctx.fillStyle = warm;
      ctx.filter = `blur(${6 + 12 * h}px)`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    if (cfg.electricalEnabled) {
      const n = Math.round(2 + 6 * e(cfg.electricalAmount ?? 0.5) * (0.3 + 0.7 * sp));
      ctx.save();
      ctx.strokeStyle = activeLightColor;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1.2;
      for (let i = 0; i < n; i++) {
        let x = centerX + (seeded(i + 1400) - 0.5) * width * 0.7, y = centerY + (seeded(i + 1500) - 0.5) * height * 0.7;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let j = 0; j < 4; j++) {
          x += (seeded(i * 7 + j + 1600) - 0.5) * 18;
          y += (seeded(i * 7 + j + 1700) - 0.5) * 18;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    if (cfg.digitalDisplayEnabled && cfg.digitalDisplayMode && cfg.digitalDisplayMode !== 'none') {
      const text = `${Math.round(percent).toString().padStart(3, '0')}${cfg.digitalDisplayMode === 'ticker' ? ' %' : ''}`;
      ctx.save();
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.font = `bold ${Math.max(10, Math.round(center * 0.13))}px monospace`;
      ctx.fillStyle = activeLightColor;
      ctx.shadowColor = activeLightColor;
      ctx.shadowBlur = 5;
      ctx.globalAlpha = 0.78;
      ctx.fillText(text, width - 8, height - 7);
      ctx.restore();
    }

    if (cfg.motionBlurEnabled || cfg.ghostingEnabled) {
      const amount = e(cfg.motionBlurEnabled ? cfg.motionBlurAmount ?? 0.35 : cfg.ghostingAmount ?? 0.25);
      const copy = document.createElement('canvas');
      copy.width = width;
      copy.height = height;
      const cc = copy.getContext('2d');
      if (cc) {
        cc.drawImage(ctx.canvas, 0, 0);
        ctx.save();
        ctx.globalAlpha = 0.10 * amount;
        ctx.filter = `blur(${1 + amount * 4}px)`;
        ctx.drawImage(copy, (sp - 0.5) * amount * 10, 0);
        ctx.restore();
      }
    }

    if (cfg.sweepEnabled) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.18 * e(cfg.sweepAmount ?? 0.4);
      const x = sp * width;
      const g = ctx.createLinearGradient(x - 30, 0, x + 30, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, activeLightColor);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 30, 0, 60, height);
      ctx.restore();
    }

    if (cfg.edgeGlowEnabled) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.22 * e(cfg.edgeGlowAmount ?? 0.5);
      ctx.shadowColor = activeLightColor;
      ctx.shadowBlur = 12;
      ctx.strokeStyle = activeLightColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, width - 2, height - 2);
      ctx.restore();
    }

    if (cfg.glareEnabled) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.14 * e(cfg.glareAmount ?? 0.4);
      ctx.filter = 'blur(7px)';
      ctx.fillStyle = '#fff';
      ctx.fillRect(width * 0.1, height * 0.08, width * 0.8, 2);
      ctx.restore();
    }

    if (cfg.lensFlareEnabled) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.18 * e(cfg.lensFlareAmount ?? 0.35);
      const x = width * 0.18 + sp * width * 0.64;
      ctx.fillStyle = '#fff';
      ctx.fillRect(x - 30, centerY, 60, 1);
      ctx.fillRect(x, centerY - 30, 1, 60);
      ctx.beginPath();
      ctx.arc(x, centerY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (cfg.ditherEnabled) {
      const a = clamp01(Number(cfg.ditherAmount ?? 0.25)) * EI;
      ctx.save();
      ctx.globalAlpha = 0.16 * a;
      for (let y = 0; y < height; y += 2) {
        for (let x = 0; x < width; x += 2) {
          if (((x + y) / 2) % 2 === 0) ctx.fillRect(x, y, 1, 1);
        }
      }
      ctx.restore();
    }

    if (cfg.crtEnabled) {
      const curv = clamp01(Number(cfg.crtCurvature ?? 0.25)), flick = clamp01(Number(cfg.crtFlicker ?? 0.08));
      ctx.save();
      ctx.globalAlpha = 0.13;
      ctx.fillStyle = '#000';
      for (let y = 0; y < height; y += 3) ctx.fillRect(0, y, width, 1);
      ctx.globalAlpha = 0.05 * flick * (0.5 + 0.5 * Math.sin(percent * 2.3));
      ctx.fillRect(0, 0, width, height);
      if (curv > 0) {
        ctx.globalAlpha = 0.08 * curv;
        ctx.strokeStyle = activeLightColor;
        ctx.strokeRect(1, 1, width - 2, height - 2);
      }
      ctx.restore();
    }

    if (cfg.digitalDisplayMode === 'dot-matrix' || cfg.digitalDisplayMode === 'seven-segment' || cfg.digitalDisplayMode === 'odometer') {
      const cols = cfg.digitalDisplayMode === 'dot-matrix' ? 18 : Math.max(7, Math.round(width / 16)), rows = cfg.digitalDisplayMode === 'dot-matrix' ? 6 : 5;
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = activeLightColor;
      const sx = width * 0.5 - cols * 2, sy = height * 0.72;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (seeded(r * cols + c + 1900) < (0.18 + 0.62 * sp)) {
            ctx.fillRect(sx + c * 4, sy + r * 4, 2, 2);
          }
        }
      }
      ctx.restore();
    }

    if (isCircular && cfg.warningZoneEnabled) {
      const start = ((cfg.startAngleDeg + rotationDeg) * Math.PI) / 180, end = (cfg.endAngleDeg * Math.PI) / 180;
      const radius = (cfg.innerRadius + cfg.outerRadius) / 2, thickness = Math.max(2, activeThickness * 0.72);
      const warn = Math.max(0, Math.min(100, cfg.warningThreshold)), crit = Math.max(warn, Math.min(100, cfg.criticalThreshold));
      const zone = (a:number,b:number,color:string,alpha:number) => { if (b <= a) return; ctx.save(); ctx.beginPath(); ctx.arc(centerX, centerY, radius, start+(a/100)*(end-start), start+(b/100)*(end-start)); ctx.strokeStyle=color; ctx.lineWidth=thickness; ctx.globalAlpha=clamp01(alpha); ctx.stroke(); ctx.restore(); };
      zone(warn, crit, cfg.warningColor, Number(cfg.warningZoneOpacity ?? 0.18)); zone(crit, 100, cfg.criticalColor, Number(cfg.criticalZoneOpacity ?? 0.24));
    }

    if (isCircular && (cfg.peakHoldEnabled || cfg.minimumMarkerEnabled)) {
      const start = ((cfg.startAngleDeg + rotationDeg) * Math.PI) / 180, end = (cfg.endAngleDeg * Math.PI) / 180, radius = cfg.outerRadius + 4;
      const marker = (value:number,color:string) => { const a=start+clamp01(value/100)*(end-start); ctx.save(); ctx.translate(centerX,centerY); ctx.rotate(a); ctx.fillStyle=color; ctx.beginPath(); ctx.moveTo(radius+6,0); ctx.lineTo(radius-5,-5); ctx.lineTo(radius-5,5); ctx.closePath(); ctx.fill(); ctx.restore(); };
      if (cfg.peakHoldEnabled) marker(cfg.peakHoldValue ?? percent, cfg.criticalColor || '#ef4444'); if (cfg.minimumMarkerEnabled) marker(cfg.minimumMarkerValue ?? 0, cfg.gradientColor1 || cfg.primaryColor);
    }

    if (isCircular && cfg.needleTrailEnabled && (cfg.style === 'needle_gauge' || cfg.style === 'speedometer_classic' || cfg.style === 'compass_needle')) {
      const start = cfg.style === 'compass_needle' ? -Math.PI/2 : ((cfg.startAngleDeg + rotationDeg) * Math.PI)/180;
      const end = cfg.style === 'compass_needle' ? start + Math.PI*2 : (cfg.endAngleDeg * Math.PI)/180;
      const len = Math.max(0.02, Math.min(0.45, Number(cfg.needleTrailLength ?? 0.18))); ctx.save(); ctx.lineCap='round';
      for (let i=10;i>=1;i--) { const q=Math.max(0,t-len*(i/10)), a=start+q*(end-start); ctx.beginPath(); ctx.moveTo(centerX,centerY); ctx.lineTo(centerX+Math.cos(a)*(cfg.outerRadius-8),centerY+Math.sin(a)*(cfg.outerRadius-8)); ctx.strokeStyle=cfg.needleColor||activeLightColor; ctx.globalAlpha=clamp01(Number(cfg.needleTrailOpacity ?? 0.45))*(1-i/11); ctx.lineWidth=Math.max(1,5-i*0.25); ctx.stroke(); } ctx.restore();
    }

    if (materialStyle !== 'none') {
      ctx.save(); ctx.globalAlpha=materialOpacity;
      if (['glass','acrylic','frosted','holographic'].includes(materialStyle)) { const tint=hexToRgb(cfg.glassTint||'#ffffff'); const g=ctx.createLinearGradient(0,0,width,height); g.addColorStop(0,`rgba(${tint.r},${tint.g},${tint.b},${0.02+materialHighlight*0.08})`); g.addColorStop(.45,'rgba(255,255,255,0)'); g.addColorStop(1,'rgba(255,255,255,0)'); ctx.fillStyle=g; ctx.fillRect(0,0,width,height); if((cfg.glassReflection??0)>0){ctx.globalAlpha=materialOpacity*clamp01(cfg.glassReflection??0);ctx.fillStyle='rgba(255,255,255,.1)';ctx.beginPath();ctx.ellipse(centerX-width*.12,centerY-height*.28,width*.32,height*.09,-.35,0,Math.PI*2);ctx.fill();}}
      else if (['brushed-metal','chrome','anodized','carbon-fibre'].includes(materialStyle)) { const g=ctx.createLinearGradient(0,0,width,0); g.addColorStop(0,'rgba(255,255,255,.02)'); g.addColorStop(.5,`rgba(255,255,255,${.08+materialHighlight*.12})`); g.addColorStop(1,'rgba(0,0,0,.05)'); ctx.fillStyle=g;ctx.fillRect(0,0,width,height); if(materialStyle==='carbon-fibre'){ctx.globalAlpha*=.35;ctx.strokeStyle='#fff';for(let y=-height;y<height*2;y+=8){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y+width);ctx.stroke();}}}
      else if (materialStyle==='crt') { ctx.fillStyle='rgba(0,0,0,.08)';ctx.fillRect(0,0,width,height); }
      else if (materialStyle==='led') { ctx.fillStyle=activeLightColor;ctx.globalAlpha*=.035+effectProgress*.04;ctx.fillRect(0,0,width,height); }
      else if (materialStyle==='liquid') { const g=ctx.createRadialGradient(centerX,height,0,centerX,height,Math.max(width,height)); const c=hexToRgb(activeLightColor);g.addColorStop(0,`rgba(${c.r},${c.g},${c.b},.12)`);g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,width,height); } ctx.restore();
    }

    if (cfg.hudGridEnabled) { const size=Math.max(8,Number(cfg.hudGridSize??24));ctx.save();ctx.strokeStyle=activeLightColor;ctx.globalAlpha=clamp01(Number(cfg.hudGridOpacity??.08));for(let x=0;x<=width;x+=size){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,height);ctx.stroke();}for(let y=0;y<=height;y+=size){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}ctx.restore(); }
    if (cfg.scanlinesEnabled) { const spacing=Math.max(2,Number(cfg.scanlineSpacing??4));ctx.save();ctx.fillStyle=activeLightColor;ctx.globalAlpha=clamp01(Number(cfg.scanlineOpacity??.08));for(let y=0;y<height;y+=spacing)ctx.fillRect(0,y,width,1);ctx.restore(); }

    if (cfg.particleEnabled || cfg.sparkEnabled) { const base=Number(cfg.particleCount??18), count=Math.max(0,Math.min(200,base+(cfg.sparkEnabled?Number(cfg.sparkCount??10):0)));ctx.save();for(let i=0;i<count;i++){const r=Math.min(width,height)*(.18+seeded(i)*.36),a=seeded(i+31)*Math.PI*2,x=centerX+Math.cos(a)*r,y=centerY+Math.sin(a)*r,sz=cfg.sparkEnabled&&i>=base?1+seeded(i+91)*2:.6+seeded(i+61)*1.8;ctx.fillStyle=activeLightColor;ctx.globalAlpha=clamp01(Number(cfg.particleOpacity??.22))*(.45+.55*effectProgress);ctx.fillRect(x,y,sz,sz);}ctx.restore(); }
    if (cfg.energyArcEnabled && isCircular) { const count=Math.max(1,Math.min(8,Number(cfg.energyArcCount??2))),radius=(cfg.innerRadius+cfg.outerRadius)/2;ctx.save();ctx.strokeStyle=activeLightColor;ctx.lineWidth=1.5;ctx.globalAlpha=.35+effectProgress*.25;for(let i=0;i<count;i++){const a0=seeded(i+101)*Math.PI*2,span=.08+seeded(i+121)*.28;ctx.beginPath();ctx.arc(centerX,centerY,radius+(seeded(i+141)-.5)*16,a0,a0+span);ctx.stroke();}ctx.restore(); }
    if (cfg.rotatingRingEnabled && isCircular) { const count=Math.max(1,Math.min(6,Number(cfg.rotatingRingCount??2)));ctx.save();ctx.strokeStyle=activeLightColor;ctx.globalAlpha=clamp01(Number(cfg.rotatingRingOpacity??.3));for(let i=0;i<count;i++){const r=cfg.outerRadius+10+i*7,off=t*Math.PI*(i%2?-1:1);ctx.beginPath();ctx.arc(centerX,centerY,r,off,off+Math.PI*(.25+.12*i));ctx.stroke();}ctx.restore(); }

    if (cfg.chromaticEnabled || cfg.glitchEnabled) { const amount=Math.max(0,Number(cfg.chromaticAmount??3)),glitch=clamp01(Number(cfg.glitchAmount??.08));const source=document.createElement('canvas');source.width=width;source.height=height;const sc=source.getContext('2d');if(sc){sc.drawImage(ctx.canvas,0,0);ctx.save();ctx.globalCompositeOperation='screen';if(cfg.chromaticEnabled&&amount){ctx.globalAlpha=.18;ctx.drawImage(source,amount,0);ctx.globalAlpha=.12;ctx.drawImage(source,-amount,0);}if(cfg.glitchEnabled&&glitch){for(let i=0;i<Math.max(1,Math.round(2+glitch*10));i++){const y=Math.floor(seeded(i+201)*height),h=Math.max(1,Math.floor(seeded(i+211)*8)),dx=Math.round((seeded(i+221)-.5)*glitch*40);ctx.globalAlpha=.12;ctx.drawImage(source,0,y,width,h,dx,y,width,h);}}ctx.restore();}}
    if (cfg.grainEnabled) { const amount=clamp01(Number(cfg.grainAmount??.04));ctx.save();ctx.globalAlpha=amount;ctx.fillStyle='#fff';for(let i=0;i<Math.round(width*height*.008);i++){ctx.fillRect(Math.floor(seeded(i+301)*width),Math.floor(seeded(i+401)*height),1,1);}ctx.restore(); }
    if (cfg.vignetteEnabled) { const strength=clamp01(Number(cfg.vignetteStrength??.28)),v=ctx.createRadialGradient(centerX,centerY,Math.min(width,height)*.25,centerX,centerY,Math.max(width,height)*.72);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(.72,`rgba(0,0,0,${strength*.35})`);v.addColorStop(1,`rgba(0,0,0,${strength})`);ctx.save();ctx.fillStyle=v;ctx.fillRect(0,0,width,height);ctx.restore(); }

    // Dedicated post-render bloom. We copy only the gauge graphics rendered so far
    // (text is drawn afterwards), blur that copy, then add it back with a light blend.
    // This gives the 100 exported states a proper emissive/LED feel without making
    // the metric text itself fuzzy.
    if (lightingEnabled && lightStrength > 0 && lightingBloom > 0) {
      const glowCanvas = document.createElement('canvas');
      glowCanvas.width = width;
      glowCanvas.height = height;
      const glowCtx = glowCanvas.getContext('2d');
      if (glowCtx) {
        glowCtx.drawImage(ctx.canvas, 0, 0);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(0.9, lightStrength * (lightingMode === 'bloom' ? 0.78 : lightingMode === 'sci-fi' ? 0.62 : lightingMode === 'industrial' ? 0.38 : 0.55));
        ctx.filter = `blur(${Math.max(1, lightingBloom)}px)`;
        ctx.drawImage(glowCanvas, 0, 0);
        if (lightingBloom > 5) {
          ctx.globalAlpha *= 0.42;
          ctx.filter = `blur(${Math.max(1, lightingBloom * 0.42)}px)`;
          ctx.drawImage(glowCanvas, 0, 0);
        }
        ctx.restore();
      }
    }

    // Optional bright core/bloom in the centre, useful for the high-tech circular
    // references where the active state appears to illuminate the instrument face.
    if (lightingEnabled && lightingCore && lightStrength > 0) {
      const rgb = hexToRgb(activeLightColor);
      const coreRadius = Math.max(8, center * 0.34 * lightingRadius);
      const core = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreRadius);
      const a = Math.min(0.32, lightingCoreIntensity * lightStrength * 0.32);
      core.addColorStop(0, `rgba(255,255,255,${a * (lightingMode === 'sci-fi' ? 0.8 : 1)})`);
      core.addColorStop(0.18, `rgba(${rgb.r},${rgb.g},${rgb.b},${a * 0.72})`);
      core.addColorStop(0.65, `rgba(${rgb.r},${rgb.g},${rgb.b},${a * 0.16})`);
      core.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
      ctx.save();
      ctx.fillStyle = core;
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.85;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // Optional pulse is deterministic per state, so exported frames never depend on
    // wall-clock timing. A value of 0 disables it; higher values create a gentle
    // highlight variation across the 0-100 sequence.
    if (lightingEnabled && lightingPulse > 0 && percent > 0) {
      const pulse = 0.72 + 0.28 * Math.sin((percent / 100) * Math.PI * 2);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = lightingPulse * pulse * 0.16;
      ctx.fillStyle = activeLightColor;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // Outside Segment Numbering (0-100 / 1-100, scalable by segment size)
    if (cfg.showSegmentNumbers) {
      ctx.save();
      const numScale = Math.max(0.2, Math.min(3, cfg.segmentNumbersScale ?? 1));
      const numOffset = Number(cfg.segmentNumbersOffset ?? 14);
      const isCirc = !isLinearGaugeStyle(cfg.style);
      const numGlow = cfg.segmentNumbersGlow ?? false;
      const numGlowColor = cfg.segmentNumbersGlowColor || '#38bdf8';
      const numColorMode = cfg.segmentNumbersColorMode || 'state';
      const customNumColor = cfg.segmentNumbersColor || '#94a3b8';

      if (isCirc) {
        const startRad = ((cfg.startAngleDeg + rotationDeg) * Math.PI) / 180;
        const endRad = (cfg.endAngleDeg * Math.PI) / 180;
        const totalSpanRad = endRad - startRad;
        const numRadius = cfg.outerRadius + numOffset;
        const segmentThickness = Math.max(4, (cfg.outerRadius - cfg.innerRadius));
        // Size proportional to segment size & scale slider
        const fontSize = Math.max(6, Math.round(Math.min(16, Math.max(7, segmentThickness * 0.55)) * numScale));
        ctx.font = `bold ${fontSize}px "Courier New", monospace, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Determine number list based on format
        let values: { val: number; label: string; pct: number }[] = [];
        const fmt = cfg.segmentNumbersFormat || '0-100';
        if (fmt === '1-100') {
          const steps = [1, 20, 40, 60, 80, 100];
          values = steps.map(v => ({ val: v, label: String(v), pct: v }));
        } else if (fmt === 'step-10') {
          const steps = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
          values = steps.map(v => ({ val: v, label: String(v), pct: v }));
        } else if (fmt === 'step-20') {
          const steps = [0, 20, 40, 60, 80, 100];
          values = steps.map(v => ({ val: v, label: String(v), pct: v }));
        } else if (fmt === 'step-25') {
          const steps = [0, 25, 50, 75, 100];
          values = steps.map(v => ({ val: v, label: String(v), pct: v }));
        } else if (fmt === 'segments') {
          const count = Math.max(1, Math.min(200, cfg.segmentCount || 10));
          const step = count > 100 ? 20 : count > 50 ? 10 : count > 25 ? 5 : count > 15 ? 2 : 1;
          for (let i = step; i <= count; i += step) {
            values.push({ val: i, label: String(i), pct: (i / count) * 100 });
          }
          if (values.length === 0 || values[values.length - 1].val !== count) {
            values.push({ val: count, label: String(count), pct: 100 });
          }
        } else {
          // '0-100' default: 0, 20, 40, 60, 80, 100 (or 0, 10..100 if radius > 90)
          const steps = cfg.outerRadius > 90 ? [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100] : [0, 20, 40, 60, 80, 100];
          values = steps.map(v => ({ val: v, label: String(v), pct: v }));
        }

        for (const item of values) {
          const t = item.pct / 100;
          const rad = startRad + t * totalSpanRad;
          const nx = centerX + numRadius * Math.cos(rad);
          const ny = centerY + numRadius * Math.sin(rad);

          const isActive = item.pct <= percent;
          let textColor = customNumColor;
          if (numColorMode === 'state') {
            textColor = isActive ? getColorForPercent(item.pct) : (cfg.showTrack ? cfg.trackColor : '#475569');
          } else if (numColorMode === 'track') {
            textColor = cfg.trackColor || '#64748b';
          }

          ctx.save();
          ctx.fillStyle = textColor;
          if (numGlow && (isActive || numColorMode === 'custom')) {
            ctx.shadowColor = (isActive ? getColorForPercent(item.pct) : numGlowColor);
            ctx.shadowBlur = 6 * numScale;
          }
          ctx.fillText(item.label, nx, ny);
          ctx.restore();
        }
      } else {
        // Horizontal / vertical linear gauges
        const isHoriz = cfg.style.includes('_h') || cfg.style.includes('horizontal');
        const pad = 6;
        const fontSize = Math.max(6, Math.round(9 * numScale));
        ctx.font = `bold ${fontSize}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (isHoriz) {
          const barW = width - pad * 2;
          const steps = [0, 25, 50, 75, 100];
          for (const s of steps) {
            const nx = pad + (s / 100) * barW;
            const ny = Math.max(fontSize / 2, Math.min(height - fontSize / 2, centerY - (cfg.activeThickness / 2) - numOffset));
            const isActive = s <= percent;
            ctx.save();
            ctx.fillStyle = numColorMode === 'state' ? (isActive ? getColorForPercent(s) : '#475569') : customNumColor;
            if (numGlow && isActive) {
              ctx.shadowColor = getColorForPercent(s);
              ctx.shadowBlur = 4 * numScale;
            }
            ctx.fillText(String(s), nx, ny);
            ctx.restore();
          }
        } else {
          const barH = height - pad * 2;
          const steps = [0, 25, 50, 75, 100];
          for (const s of steps) {
            const ny = height - pad - (s / 100) * barH;
            const nx = Math.max(fontSize, centerX + (cfg.activeThickness / 2) + numOffset);
            const isActive = s <= percent;
            ctx.save();
            ctx.fillStyle = numColorMode === 'state' ? (isActive ? getColorForPercent(s) : '#475569') : customNumColor;
            if (numGlow && isActive) {
              ctx.shadowColor = getColorForPercent(s);
              ctx.shadowBlur = 4 * numScale;
            }
            ctx.fillText(String(s), nx, ny);
            ctx.restore();
          }
        }
      }
      ctx.restore();
    }

    // Optional value/metric text. Each line can be hidden, recoloured, resized and moved independently.
    if (cfg.centerTextFormat !== 'none' && !isLinearGaugeStyle(cfg.style)) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const showCenterValue = cfg.showCenterValue ?? true;
      const valueScale = Math.max(0.25, Math.min(2, cfg.centerValueScale ?? 1));
      const showMetricLabel = cfg.showMetricLabel ?? Boolean(cfg.metricLabel);
      const valueOffsetX = Number(cfg.centerValueOffsetX ?? 0);
      const valueOffsetY = Number(cfg.centerValueOffsetY ?? 0);
      const labelOffsetX = Number(cfg.metricLabelOffsetX ?? 0);
      const labelOffsetY = Number(cfg.metricLabelOffsetY ?? 0);
      const labelScale = Math.max(0.25, Math.min(2, cfg.metricLabelScale ?? 1));
      const valueX = centerX + valueOffsetX;
      const labelX = centerX + labelOffsetX;
      const valueY = centerY - (showMetricLabel ? Math.max(6, Math.round(center * 0.025)) : 0) + valueOffsetY;
      const labelY = centerY + Math.round(center * 0.22) + labelOffsetY;

      // 1. Render Center Value with LCD Digital Glow
      if (showCenterValue) {
        const valColorMode = cfg.centerValueColorMode || 'state';
        const activeValColor = valColorMode === 'custom'
          ? (cfg.centerValueColor || '#ffffff')
          : getColorForPercent(percent);

        const valFontFamily = cfg.centerValueFontFamily === 'digital'
          ? '"Courier New", "Lucida Console", "Consolas", monospace'
          : (cfg.centerValueFontFamily === 'sans-serif' ? 'system-ui, -apple-system, sans-serif' : 'monospace');
        const valFontSize = Math.max(8, Math.round(center * 0.32 * valueScale));
        ctx.font = `bold ${valFontSize}px ${valFontFamily}`;

        const valueStr = `${Math.round(percent)}${cfg.metricUnit || '%'}`;

        // Optional 888 ghost background for realistic LCD look
        if (cfg.centerValueLcdGhost) {
          ctx.save();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
          const ghostStr = `888${cfg.metricUnit || '%'}`.slice(-valueStr.length);
          ctx.fillText(ghostStr, valueX, valueY);
          ctx.restore();
        }

        // LCD Digital Glow effect
        const valGlowOn = cfg.centerValueGlowEnabled ?? true;
        const valGlowCol = cfg.centerValueGlowColor || activeValColor;
        const valGlowRad = cfg.centerValueGlowRadius ?? 10;

        ctx.save();
        ctx.fillStyle = activeValColor;
        if (valGlowOn && valGlowRad > 0) {
          ctx.shadowColor = valGlowCol;
          ctx.shadowBlur = valGlowRad;
          // Dual pass for phosphor/LCD bloom
          ctx.fillText(valueStr, valueX, valueY);
          ctx.shadowBlur = valGlowRad * 2;
        }
        ctx.fillText(valueStr, valueX, valueY);
        ctx.restore();
      }

      // 2. Render Metric Label with LCD Digital Glow
      if (showMetricLabel && cfg.metricLabel) {
        const labelFontFamily = cfg.metricLabelFontFamily === 'digital'
          ? '"Courier New", "Lucida Console", "Consolas", monospace'
          : (cfg.metricLabelFontFamily === 'monospace' ? 'monospace' : 'sans-serif');
        const labelFontSize = Math.max(9, Math.round(center * 0.11 * labelScale));
        ctx.font = `bold ${labelFontSize}px ${labelFontFamily}`;

        const labelColorMode = cfg.metricLabelColorMode || 'state';
        const activeLabelColor = labelColorMode === 'custom'
          ? (cfg.metricLabelColor || getColorForPercent(percent))
          : getColorForPercent(percent);

        const lblGlowOn = cfg.metricLabelGlowEnabled ?? true;
        const lblGlowCol = cfg.metricLabelGlowColor || activeLabelColor;
        const lblGlowRad = cfg.metricLabelGlowRadius ?? 6;

        ctx.save();
        ctx.fillStyle = activeLabelColor;
        if (lblGlowOn && lblGlowRad > 0) {
          ctx.shadowColor = lblGlowCol;
          ctx.shadowBlur = lblGlowRad;
          ctx.fillText(cfg.metricLabel, labelX, labelY);
          ctx.shadowBlur = lblGlowRad * 1.6;
        }
        ctx.fillText(cfg.metricLabel, labelX, labelY);
        ctx.restore();
      }
      ctx.restore();
    }
  }, []);

  // Update canvas on parameter change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawGaugeFrame(ctx, currentValue, config);
  }, [currentValue, config, drawGaugeFrame]);

  // Continuously sync currentValue with selected live AIDA64 sensor when bound
  useEffect(() => {
    if (!selectedLiveSensorId && liveTelemetry.sensors.length > 0 && !isPlaying) {
      const match = liveTelemetry.sensors.find(s => {
        const t = `${s.id} ${s.label}`.toLowerCase();
        if (selectedMetric.includes('cpu') && t.includes('cpu')) return true;
        if (selectedMetric.includes('gpu_temp') && t.includes('gpu') && (t.includes('temp') || t.includes('diode'))) return true;
        if (selectedMetric.includes('gpu') && t.includes('gpu')) return true;
        if (selectedMetric.includes('vram') && (t.includes('vram') || t.includes('memory') || t.includes('gpu mem'))) return true;
        if (selectedMetric.includes('ram') && (t.includes('ram') || t.includes('memory'))) return true;
        return false;
      }) || liveTelemetry.sensors[0];
      if (match) setSelectedLiveSensorId(match.id);
    }
  }, [liveTelemetry.sensors, selectedMetric, selectedLiveSensorId, isPlaying]);

  useEffect(() => {
    if (!selectedLiveSensorId || isPlaying) return;
    const sensor = liveTelemetry.sensors.find(s => s.id === selectedLiveSensorId);
    if (sensor && typeof sensor.value === 'number') {
      if (sensor.unit === '%' || config.metricUnit === '%') {
        setCurrentValue(Math.round(Math.max(0, Math.min(100, sensor.value)) * 10) / 10);
      } else {
        const max = sensor.unit === '°C' ? 100 : (sensor.unit === 'RPM' ? 3000 : (sensor.unit === 'W' ? 350 : 100));
        const pct = Math.max(0, Math.min(100, (sensor.value / max) * 100));
        setCurrentValue(Math.round(pct * 10) / 10);
      }
    }
  }, [selectedLiveSensorId, liveTelemetry.sensors, isPlaying, config.metricUnit]);

  // Sweep animation playback
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    let direction = 1;
    let val = currentValue;

    const tick = () => {
      val += direction * 0.8;
      if (val >= 100) {
        val = 100;
        direction = -1;
      } else if (val <= 0) {
        val = 0;
        direction = 1;
      }
      setCurrentValue(Math.round(val * 10) / 10);
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying]);

  // Direct 1-Click "Add to Assembler" handler
  const handleAddToAssembler = () => {
    const meta = GAUGE_STYLES_REGISTRY.find(s => s.id === config.style);
    const item: Aida64PanelItem = {
      id: `gauge_${Date.now()}`,
      name: `${config.metricLabel || 'Utilisation'} (${meta?.name || config.style})`,
      type: config.style.includes('_bar') ? 'linear_bar' : 'dial',
      x: 300,
      y: 150,
      width: config.width,
      height: config.height,
      sensorType: config.metricLabel || 'CPU %',
      testValue: `${currentValue}`,
      unit: config.metricUnit || '%',
      color: config.primaryColor,
      scale: config.scale || 1.0,
      gaugePercent: currentValue,
      gaugeStyle: config.style,
      gaugeConfig: { ...config },
      sensorBinding: selectedLiveSensorId ? { sensorId: selectedLiveSensorId, label: liveTelemetry.sensors.find(s => s.id === selectedLiveSensorId)?.label || config.metricLabel || 'AIDA64 Sensor', min: 0, max: config.metricUnit === '%' ? 100 : 100, warning: config.warningThreshold, critical: config.criticalThreshold, smoothingMs: 150, peakHold: false, peakDecayMs: 2000, normalisation: 'linear', staleTimeoutMs: 2000 } : undefined
    };

    if (onAddToAssembler) {
      onAddToAssembler(item);
      showToast(`Added ${config.width}×${config.height} ${meta?.name || 'Gauge'} to Canvas Assembler!`);
    } else {
      // Fallback: save into localStorage layout directly
      try {
        const saved = localStorage.getItem('aida64_custom_layout');
        const list: Aida64PanelItem[] = saved ? JSON.parse(saved) : [];
        list.push(item);
        localStorage.setItem('aida64_custom_layout', JSON.stringify(list));
        showToast(`Saved ${config.width}×${config.height} ${meta?.name || 'Gauge'} directly into layout store!`);
      } catch (e) {
        showToast('Gauge saved to layout storage.');
      }
    }
  };

  // Export 100 PNG frames into ZIP archive
  const handleExportZip = async () => {
    setIsExportingZip(true);
    setZipProgress(0);

    try {
      const zip = new SimpleZip();
      const offscreen = document.createElement('canvas');
      offscreen.width = config.width;
      offscreen.height = config.height;
      const ctx = offscreen.getContext('2d');
      if (!ctx) throw new Error('Failed to create offscreen context');

      const styleMeta = GAUGE_STYLES_REGISTRY.find(s => s.id === config.style);
      const folderName = `${config.style}_${config.width}x${config.height}`;

      // Render 0 to 100 frames
      for (let i = 0; i <= 100; i++) {
        drawGaugeFrame(ctx, i, config);

        const dataUrl = offscreen.toDataURL('image/png');
        const base64Data = dataUrl.split(',')[1];
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let j = 0; j < len; j++) {
          bytes[j] = binaryString.charCodeAt(j);
        }

        zip.addFile(`${folderName}/${i}.png`, bytes);
        setZipProgress(Math.round(((i + 1) / 101) * 100));

        if (i % 10 === 0) {
          await new Promise(r => setTimeout(r, 0));
        }
      }

      // Add readme and spec
      const readme = `AIDA64 SensorPanel State Gauge Sequence
Style: ${styleMeta?.name || config.style}
Resolution: ${config.width}x${config.height}
Frames: 0.png to 100.png (101 total states)
Generated via Gina AI Factory — Local Creator Engine

AIDA64 Import Instructions:
1. Open AIDA64 -> File -> Preferences -> SensorPanel -> Custom Gauges.
2. Click 'New Gauge', set type to 'Image Gauge'.
3. Select the folder containing '0.png' to '100.png'.
4. Bind to hardware sensor: ${config.metricLabel || 'CPU / GPU Utilisation'}.
5. Set Min Value = 0, Max Value = 100.
`;
      zip.addFile(`${folderName}/README_AIDA64.txt`, readme);

      const blob = zip.generateBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AIDA64_Gauge_${config.style}_${config.width}x${config.height}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('101-frame state ZIP archive generated successfully!');
    } catch (err: any) {
      showToast(`ZIP export failed: ${err?.message || 'Error'}`);
    } finally {
      setIsExportingZip(false);
      setZipProgress(0);
    }
  };

  // Download Single PNG snapshot
  const handleDownloadSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `aida64_gauge_${config.style}_${currentValue}pct.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`Downloaded ${config.width}×${config.height} PNG frame snapshot!`);
  };

  const filteredStyles = GAUGE_STYLES_REGISTRY.filter(
    s => selectedCategory === 'all' || s.category === selectedCategory
  );

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toastMessage && (
        <div className="p-3 rounded-lg bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs font-mono flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Metric & Category Quick Selector */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-3 mb-4">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">
              0% – 100% Utilisation Gauge Factory
            </span>
            <h3 className="text-base font-bold text-slate-100 mt-0.5">
              Expanded Representation Style Studio
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Generate pixel-perfect circular dials, horizontal LED bars, and vertical ladders. Export single frames, 101-state ZIPs, or push directly to Canvas.
            </p>
          </div>

          {/* Scale & Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleAddToAssembler}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add to Assembler</span>
            </button>
            <button
              onClick={handleExportZip}
              disabled={isExportingZip}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <FileArchive className="w-3.5 h-3.5" />
              <span>{isExportingZip ? `Zipping (${zipProgress}%)...` : 'Export 100-State ZIP'}</span>
            </button>
            <button
              onClick={handleDownloadSnapshot}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium flex items-center gap-1.5 cursor-pointer border border-slate-700"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PNG Snapshot</span>
            </button>
          </div>
        </div>

        {/* Target Metric Selector */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            1. Target Sensor Metric
          </label>
          <div className="flex flex-wrap gap-1.5">
            {METRIC_PRESETS.map((m) => (
              <button
                key={m.id}
                onClick={() => handleSelectMetric(m.id)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-medium border transition-all cursor-pointer ${
                  selectedMetric === m.id
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold ring-1 ring-emerald-500/40'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                }`}
              >
                {m.label} ({m.unit})
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2.5 items-center">
            <label className="text-[10px] font-semibold text-slate-400">
              <span className="flex items-center justify-between mb-1">
                <span>LIVE SENSOR BINDING</span>
                {liveTelemetry.connected && (
                  <span className="text-[9px] text-emerald-400 font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    {liveTelemetry.sensors.length} sensors live
                  </span>
                )}
              </span>
              <select
                value={selectedLiveSensorId}
                onChange={e => {
                  const sId = e.target.value;
                  setSelectedLiveSensorId(sId);
                  const sensor = liveTelemetry.sensors.find(s => s.id === sId);
                  if (sensor && typeof sensor.value === 'number') {
                    if (sensor.unit === '%' || config.metricUnit === '%') {
                      setCurrentValue(Math.max(0, Math.min(100, sensor.value)));
                    }
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-200 focus:border-emerald-500 outline-none"
              >
                <option value="">Manual / Slider Testing Mode</option>
                {liveTelemetry.sensors.map(sensor => (
                  <option key={sensor.id} value={sensor.id}>
                    {sensor.label} ({sensor.value} {sensor.unit})
                  </option>
                ))}
              </select>
            </label>
            <div className="bg-slate-950/80 border border-slate-800 rounded p-2 text-xs flex items-center justify-between min-h-[46px]">
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Active Telemetry Source</div>
                <div className="text-slate-200 font-mono font-medium truncate max-w-[200px]">
                  {selectedLiveSensorId
                    ? `${liveTelemetry.sensors.find(s => s.id === selectedLiveSensorId)?.label || selectedLiveSensorId}: ${liveTelemetry.sensors.find(s => s.id === selectedLiveSensorId)?.value ?? ''} ${liveTelemetry.sensors.find(s => s.id === selectedLiveSensorId)?.unit ?? ''}`
                    : 'Manual Scrubbing Mode'}
                </div>
              </div>
              {selectedLiveSensorId && (
                <button
                  onClick={() => setSelectedLiveSensorId('')}
                  className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded cursor-pointer transition-colors"
                >
                  Unbind
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Studio Grid: Left Config / Center Live View / Right Styles */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Style Selector Gallery (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <span className="text-xs font-bold text-slate-200">2. Gauge Styles ({GAUGE_STYLES_REGISTRY.length})</span>
              <div className="flex items-center gap-1">
                {(['all', 'circular', 'horizontal', 'vertical'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredStyles.map((s) => {
                const isSelected = config.style === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelectStyle(s.id)}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-400 text-slate-100 ring-1 ring-emerald-500/50'
                        : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-xs flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                        <span>{s.name}</span>
                      </div>
                      <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded">
                        {s.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{s.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Live Canvas View & Interactive Scrubber (4 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 flex flex-col items-center">
            <div className="w-full flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200">Live Telemetry Preview</span>
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">
                  {Math.round(currentValue)}{config.metricUnit || '%'}
                </span>
              </div>

              {/* Play / Pause Sweep */}
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 cursor-pointer transition-all ${
                  isPlaying
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Pause Sweep' : 'Auto Sweep'}</span>
              </button>
            </div>

            {/* Canvas Stage */}
            <div className="w-full bg-slate-950 border border-slate-800 rounded-lg p-4 flex items-center justify-center min-h-[340px] relative overflow-hidden">
              {/* Subtle background grid pattern */}
              <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
                  backgroundSize: '16px 16px'
                }}
              />

              <canvas
                ref={canvasRef}
                width={config.width}
                height={config.height}
                className="max-w-full max-h-[300px] object-contain drop-shadow-xl z-10"
              />
            </div>

            {/* Value Scrubber Slider */}
            <div className="w-full mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>0%</span>
                <span className="text-slate-200 font-bold">STATE VALUE: {currentValue}%</span>
                <span>100%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={currentValue}
                onChange={(e) => {
                  setIsPlaying(false);
                  setCurrentValue(Number(e.target.value));
                }}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />

              {/* Quick Stepper Buttons */}
              <div className="flex items-center justify-center gap-1.5 pt-1">
                {[0, 25, 50, 75, 90, 100].map((v) => (
                  <button
                    key={v}
                    onClick={() => {
                      setIsPlaying(false);
                      setCurrentValue(v);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer ${
                      currentValue === v
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {v}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Dimension, Scale & Color Customizer (3 cols) */}
        <div className="lg:col-span-3 space-y-3 max-h-[760px] overflow-y-auto pr-1 custom-scrollbar">
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 space-y-4 text-xs">
            <span className="font-bold text-slate-200 border-b border-slate-800 pb-1.5 block">
              3. Size & Scale Multiplier
            </span>

            {/* Exact Pixel Dimensions */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">WIDTH (PX)</label>
                <input
                  type="number"
                  value={config.width}
                  onChange={(e) => setConfig({ ...config, width: Math.max(20, Number(e.target.value)) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 font-mono text-slate-200"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">HEIGHT (PX)</label>
                <input
                  type="number"
                  value={config.height}
                  onChange={(e) => setConfig({ ...config, height: Math.max(20, Number(e.target.value)) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 font-mono text-slate-200"
                />
              </div>
            </div>

            {/* Quick Sizing Presets */}
            <div>
              <label className="text-[10px] font-mono text-slate-400 block mb-1">UNIVERSAL SCALE</label>
              <div className="grid grid-cols-4 gap-1">
                {SCALE_PRESETS.map((sc) => (
                  <button
                    key={sc.label}
                    onClick={() => {
                      const base = 300;
                      const newW = Math.round(base * sc.value);
                      setConfig(prev => ({
                        ...prev,
                        scale: sc.value,
                        width: isLinearGaugeStyle(prev.style) ? Math.round((prev.width || 280) * sc.value) : newW,
                        height: isLinearGaugeStyle(prev.style) ? Math.round((prev.height || 40) * sc.value) : newW
                      }));
                    }}
                    className={`p-1 rounded text-[10px] font-mono border cursor-pointer ${
                      config.scale === sc.value
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {sc.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Radius & Segments */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              {!isLinearGaugeStyle(config.style) && (
                <>
                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                      <span>INNER RADIUS</span>
                      <span>{config.innerRadius}px</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="140"
                      value={config.innerRadius}
                      onChange={(e) => setConfig({ ...config, innerRadius: Number(e.target.value) })}
                      className="w-full h-1.5 bg-slate-800 rounded cursor-pointer accent-emerald-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                      <span>OUTER RADIUS</span>
                      <span>{config.outerRadius}px</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="180"
                      value={config.outerRadius}
                      onChange={(e) => setConfig({ ...config, outerRadius: Number(e.target.value) })}
                      className="w-full h-1.5 bg-slate-800 rounded cursor-pointer accent-emerald-500"
                    />
                  </div>
                </>
              )}

              <div>
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mb-1">
                  <span>SEGMENTS / TICKS (1–200)</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      max="200"
                      value={config.segmentCount}
                      onChange={(e) => setConfig({ ...config, segmentCount: Math.max(1, Math.min(200, Number(e.target.value) || 1)) })}
                      className="w-14 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-right font-mono text-[11px] text-emerald-400 focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>
                <input
                  type="range"
                  min="1"
                  max="200"
                  value={config.segmentCount}
                  onChange={(e) => setConfig({ ...config, segmentCount: Number(e.target.value) })}
                  className="w-full h-1.5 bg-slate-800 rounded cursor-pointer accent-emerald-500"
                />
              </div>
            </div>

            {/* Color Thresholds */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="font-bold text-slate-300 block text-[11px]">Colors & Thresholds</span>
              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <label className="text-[9px] text-slate-400 block mb-1">PRIMARY</label>
                  <input
                    type="color"
                    value={config.primaryColor}
                    onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                    className="w-full h-7 rounded bg-slate-950 border border-slate-800 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-amber-400 block mb-1">WARN ({config.warningThreshold}%)</label>
                  <input
                    type="color"
                    value={config.warningColor}
                    onChange={(e) => setConfig({ ...config, warningColor: e.target.value })}
                    className="w-full h-7 rounded bg-slate-950 border border-slate-800 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-rose-400 block mb-1">CRIT ({config.criticalThreshold}%)</label>
                  <input
                    type="color"
                    value={config.criticalColor}
                    onChange={(e) => setConfig({ ...config, criticalColor: e.target.value })}
                    className="w-full h-7 rounded bg-slate-950 border border-slate-800 cursor-pointer"
                  />
                </div>
              </div>

              {/* Glow Intensity */}
              <div>
                <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                  <span>GLOW INTENSITY</span>
                  <span>{config.glowIntensity}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={config.glowIntensity}
                  onChange={(e) => setConfig({ ...config, glowIntensity: Number(e.target.value) })}
                  className="w-full h-1.5 bg-slate-800 rounded cursor-pointer accent-emerald-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 text-[11px] uppercase tracking-wider">4. Advanced Visual Settings</span>
                <span className="text-[9px] font-mono text-emerald-400">LIVE</span>
              </div>

              <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[9px] font-bold tracking-[0.18em] text-slate-500 uppercase">Geometry & Dial Orientation</div>
                  <span className="text-[9px] font-mono text-cyan-400 font-semibold">ROTATION & ANGLES</span>
                </div>

                {/* Dial Angle Presets */}
                <div className="space-y-1.5">
                  <label className="text-[9px] text-slate-400 block">Dial Angle Presets</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, startAngleDeg: 90, endAngleDeg: 450, rotationDeg: 0, gapRotationDeg: 0 })}
                      className={`px-2 py-1.5 rounded text-[9px] font-medium border text-left flex flex-col transition-all ${
                        config.startAngleDeg === 90 && config.endAngleDeg === 450
                          ? 'border-emerald-400/80 bg-emerald-950/40 text-emerald-300 shadow-sm shadow-emerald-950'
                          : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className="font-semibold flex items-center gap-1">🔄 6 o'clock → 6 o'clock</span>
                      <span className="text-[8px] text-slate-400">Full 360° bottom start</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, startAngleDeg: -90, endAngleDeg: 270, rotationDeg: 0, gapRotationDeg: 0 })}
                      className={`px-2 py-1.5 rounded text-[9px] font-medium border text-left flex flex-col transition-all ${
                        config.startAngleDeg === -90 && config.endAngleDeg === 270
                          ? 'border-emerald-400/80 bg-emerald-950/40 text-emerald-300 shadow-sm shadow-emerald-950'
                          : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className="font-semibold flex items-center gap-1">⏱️ 12 o'clock → 12 o'clock</span>
                      <span className="text-[8px] text-slate-400">Full 360° top start</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, startAngleDeg: 135, endAngleDeg: 405, rotationDeg: 0, gapRotationDeg: 0 })}
                      className={`px-2 py-1.5 rounded text-[9px] font-medium border text-left flex flex-col transition-all ${
                        config.startAngleDeg === 135 && config.endAngleDeg === 405
                          ? 'border-emerald-400/80 bg-emerald-950/40 text-emerald-300 shadow-sm shadow-emerald-950'
                          : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className="font-semibold flex items-center gap-1">🏎️ Bottom Open 270°</span>
                      <span className="text-[8px] text-slate-400">Standard automotive gauge</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, startAngleDeg: -45, endAngleDeg: 225, rotationDeg: 0, gapRotationDeg: 0 })}
                      className={`px-2 py-1.5 rounded text-[9px] font-medium border text-left flex flex-col transition-all ${
                        config.startAngleDeg === -45 && config.endAngleDeg === 225
                          ? 'border-emerald-400/80 bg-emerald-950/40 text-emerald-300 shadow-sm shadow-emerald-950'
                          : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className="font-semibold flex items-center gap-1">🔘 Top Open 270°</span>
                      <span className="text-[8px] text-slate-400">Arch tachometer</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, startAngleDeg: 180, endAngleDeg: 360, rotationDeg: 0, gapRotationDeg: 0 })}
                      className={`px-2 py-1.5 rounded text-[9px] font-medium border text-left flex flex-col transition-all ${
                        config.startAngleDeg === 180 && config.endAngleDeg === 360
                          ? 'border-emerald-400/80 bg-emerald-950/40 text-emerald-300 shadow-sm shadow-emerald-950'
                          : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className="font-semibold flex items-center gap-1">📈 Upper Half (180°)</span>
                      <span className="text-[8px] text-slate-400">Top dome meter</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, startAngleDeg: 0, endAngleDeg: 180, rotationDeg: 0, gapRotationDeg: 0 })}
                      className={`px-2 py-1.5 rounded text-[9px] font-medium border text-left flex flex-col transition-all ${
                        config.startAngleDeg === 0 && config.endAngleDeg === 180
                          ? 'border-emerald-400/80 bg-emerald-950/40 text-emerald-300 shadow-sm shadow-emerald-950'
                          : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className="font-semibold flex items-center gap-1">📉 Lower Half (180°)</span>
                      <span className="text-[8px] text-slate-400">Bottom cradle meter</span>
                    </button>
                  </div>
                </div>

                {/* Direct Angle & Rotation Sliders */}
                <div className="space-y-2 pt-1 border-t border-slate-900">
                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                      <span>Start Angle (°)</span>
                      <span className="text-cyan-400">{config.startAngleDeg ?? 135}° {config.startAngleDeg === 90 ? '(6 o\'clock)' : config.startAngleDeg === -90 ? '(12 o\'clock)' : ''}</span>
                    </div>
                    <input
                      type="range"
                      min="-180"
                      max="360"
                      step="5"
                      value={config.startAngleDeg ?? 135}
                      onChange={(e) => setConfig({ ...config, startAngleDeg: Number(e.target.value) })}
                      className="w-full h-1.5 bg-slate-800 rounded cursor-pointer accent-cyan-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                      <span>End Angle (°)</span>
                      <span className="text-cyan-400">{config.endAngleDeg ?? 405}° {config.endAngleDeg === 450 ? '(6 o\'clock)' : config.endAngleDeg === 270 ? '(12 o\'clock)' : ''}</span>
                    </div>
                    <input
                      type="range"
                      min="-90"
                      max="540"
                      step="5"
                      value={config.endAngleDeg ?? 405}
                      onChange={(e) => setConfig({ ...config, endAngleDeg: Number(e.target.value) })}
                      className="w-full h-1.5 bg-slate-800 rounded cursor-pointer accent-cyan-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                      <span>Dial Rotation Offset (°)</span>
                      <span className="text-emerald-400">{config.rotationDeg ?? config.gapRotationDeg ?? 0}°</span>
                    </div>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="1"
                      value={config.rotationDeg ?? config.gapRotationDeg ?? 0}
                      onChange={(e) => {
                        const rot = Number(e.target.value);
                        setConfig({ ...config, rotationDeg: rot, gapRotationDeg: rot });
                      }}
                      className="w-full h-1.5 bg-slate-800 rounded cursor-pointer accent-emerald-500"
                    />
                  </div>
                </div>

                <label className="flex items-center justify-between text-[10px] text-slate-300">
                  <span>Rounded Ends</span>
                  <input type="checkbox" checked={config.roundedEnds ?? true}
                    onChange={e => setConfig({ ...config, roundedEnds: e.target.checked })}
                    className="accent-emerald-500" />
                </label>
                <div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1"><span>Segment Gap Size (°)</span><span>{config.segmentGapDeg.toFixed(1)}°</span></div>
                  <input type="range" min="0" max="12" step="0.5" value={config.segmentGapDeg}
                    onChange={e => setConfig({ ...config, segmentGapDeg: Number(e.target.value) })}
                    className="w-full h-1.5 bg-slate-800 rounded cursor-pointer accent-emerald-500" />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1"><span>Radius (px)</span><span>{config.outerRadius}</span></div>
                  <input type="range" min="30" max="160" value={config.outerRadius}
                    onChange={e => {
                      const outer = Number(e.target.value);
                      const thickness = config.activeThickness ?? (config.outerRadius - config.innerRadius);
                      setConfig({ ...config, outerRadius: outer, innerRadius: Math.max(10, outer - thickness) });
                    }}
                    className="w-full h-1.5 bg-slate-800 rounded cursor-pointer accent-emerald-500" />
                </div>
              </div>

              {/* Center Value & Metric Label (LCD Digital Glow & Solid Color Options) */}
              <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[9px] font-bold tracking-[0.18em] text-slate-500 uppercase">Center Value & Metric Label</div>
                  <span className="text-[9px] font-mono text-emerald-400">LCD DIGITAL</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center justify-between text-[10px] text-slate-300 bg-slate-900/60 rounded px-2 py-1.5">
                    <span>Show Value</span>
                    <input type="checkbox" checked={config.showCenterValue ?? true} onChange={e => setConfig({ ...config, showCenterValue: e.target.checked })} className="accent-emerald-500" />
                  </label>
                  <label className="flex items-center justify-between text-[10px] text-slate-300 bg-slate-900/60 rounded px-2 py-1.5">
                    <span>Show Label</span>
                    <input type="checkbox" checked={config.showMetricLabel ?? Boolean(config.metricLabel)} onChange={e => setConfig({ ...config, showMetricLabel: e.target.checked })} className="accent-emerald-500" />
                  </label>
                </div>

                {/* Value Controls */}
                <div className="rounded border border-slate-800/80 bg-slate-900/40 p-2 space-y-2">
                  <div className="text-[9px] font-bold tracking-[0.14em] text-cyan-400 uppercase flex items-center justify-between">
                    <span>Center Value Display</span>
                    <span className="text-[8px] text-slate-400 font-mono">{Math.round((config.centerValueScale ?? 1) * 100)}% scale</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-slate-400 block mb-1">Color Mode</label>
                      <select
                        value={config.centerValueColorMode || 'state'}
                        onChange={e => setConfig({ ...config, centerValueColorMode: e.target.value as 'state' | 'custom' })}
                        className="w-full h-7 rounded bg-slate-900 border border-slate-800 text-[9px] text-slate-200"
                      >
                        <option value="state">Match Value State</option>
                        <option value="custom">Custom Solid Color</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-400 block mb-1">Font Style</label>
                      <select
                        value={config.centerValueFontFamily || 'monospace'}
                        onChange={e => setConfig({ ...config, centerValueFontFamily: e.target.value as any })}
                        className="w-full h-7 rounded bg-slate-900 border border-slate-800 text-[9px] text-slate-200"
                      >
                        <option value="digital">Digital 7-Segment LCD</option>
                        <option value="monospace">Monospace Tech</option>
                        <option value="sans-serif">Clean Sans</option>
                      </select>
                    </div>
                  </div>

                  {config.centerValueColorMode === 'custom' && (
                    <div>
                      <label className="text-[9px] text-slate-400 block mb-1">Solid Value Color</label>
                      <input
                        type="color"
                        value={config.centerValueColor || '#ffffff'}
                        onChange={e => setConfig({ ...config, centerValueColor: e.target.value })}
                        className="w-full h-7 rounded bg-slate-950 border border-slate-800 cursor-pointer"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <label className="flex items-center justify-between text-[9px] text-slate-300 bg-slate-950/60 rounded px-2 py-1">
                      <span>LCD Glow</span>
                      <input
                        type="checkbox"
                        checked={config.centerValueGlowEnabled ?? true}
                        onChange={e => setConfig({ ...config, centerValueGlowEnabled: e.target.checked })}
                        className="accent-cyan-500"
                      />
                    </label>
                    <label className="flex items-center justify-between text-[9px] text-slate-300 bg-slate-950/60 rounded px-2 py-1">
                      <span>Ghost Digits (888)</span>
                      <input
                        type="checkbox"
                        checked={config.centerValueLcdGhost ?? false}
                        onChange={e => setConfig({ ...config, centerValueLcdGhost: e.target.checked })}
                        className="accent-cyan-500"
                      />
                    </label>
                  </div>

                  {(config.centerValueGlowEnabled ?? true) && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <div className="flex justify-between text-[8px] font-mono text-slate-400 mb-1">
                          <span>Glow Radius</span>
                          <span>{config.centerValueGlowRadius ?? 10}px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="30"
                          value={config.centerValueGlowRadius ?? 10}
                          onChange={e => setConfig({ ...config, centerValueGlowRadius: Number(e.target.value) })}
                          className="w-full h-1.5 bg-slate-800 rounded cursor-pointer accent-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="text-[8px] text-slate-400 block mb-1">Custom Glow (Opt)</label>
                        <input
                          type="color"
                          value={config.centerValueGlowColor || '#38bdf8'}
                          onChange={e => setConfig({ ...config, centerValueGlowColor: e.target.value })}
                          className="w-full h-6 rounded bg-slate-950 border border-slate-800 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                      <span>Value Size Scale</span>
                      <span>{Math.round((config.centerValueScale ?? 1) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="25"
                      max="200"
                      step="5"
                      value={Math.round((config.centerValueScale ?? 1) * 100)}
                      onChange={e => setConfig({ ...config, centerValueScale: Number(e.target.value) / 100 })}
                      className="w-full h-1.5 bg-slate-800 rounded cursor-pointer accent-emerald-500"
                    />
                  </div>
                </div>

                {/* Metric Label Controls */}
                <div className="rounded border border-slate-800/80 bg-slate-900/40 p-2 space-y-2">
                  <div className="text-[9px] font-bold tracking-[0.14em] text-emerald-400 uppercase flex items-center justify-between">
                    <span>Metric Label Display</span>
                    <span className="text-[8px] text-slate-400 font-mono">{Math.round((config.metricLabelScale ?? 1) * 100)}% scale</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-slate-400 block mb-1">Color Mode</label>
                      <select
                        value={config.metricLabelColorMode || 'state'}
                        onChange={e => setConfig({ ...config, metricLabelColorMode: e.target.value as 'state' | 'custom' })}
                        className="w-full h-7 rounded bg-slate-900 border border-slate-800 text-[9px] text-slate-200"
                      >
                        <option value="state">Match Value State</option>
                        <option value="custom">Custom Solid Color</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-400 block mb-1">Font Style</label>
                      <select
                        value={config.metricLabelFontFamily || 'sans-serif'}
                        onChange={e => setConfig({ ...config, metricLabelFontFamily: e.target.value as any })}
                        className="w-full h-7 rounded bg-slate-900 border border-slate-800 text-[9px] text-slate-200"
                      >
                        <option value="sans-serif">Clean Sans</option>
                        <option value="digital">Digital 7-Segment LCD</option>
                        <option value="monospace">Monospace Tech</option>
                      </select>
                    </div>
                  </div>

                  {config.metricLabelColorMode === 'custom' && (
                    <div>
                      <label className="text-[9px] text-slate-400 block mb-1">Custom Label Color</label>
                      <input
                        type="color"
                        value={config.metricLabelColor || config.primaryColor}
                        onChange={e => setConfig({ ...config, metricLabelColor: e.target.value })}
                        className="w-full h-7 rounded bg-slate-950 border border-slate-800 cursor-pointer"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <label className="flex items-center justify-between text-[9px] text-slate-300 bg-slate-950/60 rounded px-2 py-1">
                      <span>Label Glow</span>
                      <input
                        type="checkbox"
                        checked={config.metricLabelGlowEnabled ?? true}
                        onChange={e => setConfig({ ...config, metricLabelGlowEnabled: e.target.checked })}
                        className="accent-emerald-500"
                      />
                    </label>
                    <div>
                      <div className="flex justify-between text-[8px] font-mono text-slate-400 mb-1">
                        <span>Glow Radius</span>
                        <span>{config.metricLabelGlowRadius ?? 6}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="24"
                        value={config.metricLabelGlowRadius ?? 6}
                        onChange={e => setConfig({ ...config, metricLabelGlowRadius: Number(e.target.value) })}
                        className="w-full h-1.5 bg-slate-800 rounded cursor-pointer accent-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                      <span>Label Size Scale</span>
                      <span>{Math.round((config.metricLabelScale ?? 1) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="25"
                      max="200"
                      step="5"
                      value={Math.round((config.metricLabelScale ?? 1) * 100)}
                      onChange={e => setConfig({ ...config, metricLabelScale: Number(e.target.value) / 100 })}
                      className="w-full h-1.5 bg-slate-800 rounded cursor-pointer accent-emerald-500"
                    />
                  </div>
                </div>

                {/* Independent Offset Coordinates */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-2">
                    <div className="text-[9px] uppercase tracking-wider text-slate-500">Value Position</div>
                    <div>
                      <div className="flex justify-between text-[9px] text-slate-500"><span>X</span><span>{Math.round(config.centerValueOffsetX ?? 0)}px</span></div>
                      <input type="range" min="-120" max="120" value={config.centerValueOffsetX ?? 0} onChange={e => setConfig({ ...config, centerValueOffsetX: Number(e.target.value) })} className="w-full h-1.5 accent-emerald-500" />
                    </div>
                    <div>
                      <div className="flex justify-between text-[9px] text-slate-500"><span>Y</span><span>{Math.round(config.centerValueOffsetY ?? 0)}px</span></div>
                      <input type="range" min="-120" max="120" value={config.centerValueOffsetY ?? 0} onChange={e => setConfig({ ...config, centerValueOffsetY: Number(e.target.value) })} className="w-full h-1.5 accent-emerald-500" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-[9px] uppercase tracking-wider text-slate-500">Label Position</div>
                    <div>
                      <div className="flex justify-between text-[9px] text-slate-500"><span>X</span><span>{Math.round(config.metricLabelOffsetX ?? 0)}px</span></div>
                      <input type="range" min="-120" max="120" value={config.metricLabelOffsetX ?? 0} onChange={e => setConfig({ ...config, metricLabelOffsetX: Number(e.target.value) })} className="w-full h-1.5 accent-emerald-500" />
                    </div>
                    <div>
                      <div className="flex justify-between text-[9px] text-slate-500"><span>Y</span><span>{Math.round(config.metricLabelOffsetY ?? 0)}px</span></div>
                      <input type="range" min="-120" max="120" value={config.metricLabelOffsetY ?? 0} onChange={e => setConfig({ ...config, metricLabelOffsetY: Number(e.target.value) })} className="w-full h-1.5 accent-emerald-500" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Outside Segment Numbering (1-100 Sizeable by Segment Size) */}
              <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[9px] font-bold tracking-[0.18em] text-slate-500 uppercase">Outside Segment Numbering</div>
                  <input
                    type="checkbox"
                    checked={config.showSegmentNumbers ?? false}
                    onChange={e => setConfig({ ...config, showSegmentNumbers: e.target.checked })}
                    className="accent-cyan-500"
                  />
                </div>

                {(config.showSegmentNumbers ?? false) && (
                  <div className="space-y-3 pt-1 border-t border-slate-900">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] text-slate-400 block mb-1">Number Sequence</label>
                        <select
                          value={config.segmentNumbersFormat || '0-100'}
                          onChange={e => setConfig({ ...config, segmentNumbersFormat: e.target.value as any })}
                          className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-[9px] text-slate-200"
                        >
                          <option value="0-100">0 to 100 Scale</option>
                          <option value="1-100">1 to 100 Scale</option>
                          <option value="step-10">Step 10 (0..100)</option>
                          <option value="step-20">Step 20 (0..100)</option>
                          <option value="step-25">Step 25 (0..100)</option>
                          <option value="segments">Segment Indices (1..N)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-400 block mb-1">Color Mode</label>
                        <select
                          value={config.segmentNumbersColorMode || 'state'}
                          onChange={e => setConfig({ ...config, segmentNumbersColorMode: e.target.value as any })}
                          className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-[9px] text-slate-200"
                        >
                          <option value="state">Follow Active State</option>
                          <option value="custom">Custom Solid Color</option>
                          <option value="track">Match Track Color</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                        <span>Number Size (Segment Relative)</span>
                        <span className="text-cyan-400">{Math.round((config.segmentNumbersScale ?? 1) * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="30"
                        max="250"
                        step="5"
                        value={Math.round((config.segmentNumbersScale ?? 1) * 100)}
                        onChange={e => setConfig({ ...config, segmentNumbersScale: Number(e.target.value) / 100 })}
                        className="w-full h-1.5 bg-slate-800 rounded cursor-pointer accent-cyan-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                        <span>Radial Offset Distance</span>
                        <span className="text-emerald-400">+{config.segmentNumbersOffset ?? 14}px</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="40"
                        step="1"
                        value={config.segmentNumbersOffset ?? 14}
                        onChange={e => setConfig({ ...config, segmentNumbersOffset: Number(e.target.value) })}
                        className="w-full h-1.5 bg-slate-800 rounded cursor-pointer accent-emerald-500"
                      />
                    </div>

                    {config.segmentNumbersColorMode === 'custom' && (
                      <div>
                        <label className="text-[9px] text-slate-400 block mb-1">Solid Number Color</label>
                        <input
                          type="color"
                          value={config.segmentNumbersColor || '#94a3b8'}
                          onChange={e => setConfig({ ...config, segmentNumbersColor: e.target.value })}
                          className="w-full h-7 rounded bg-slate-950 border border-slate-800 cursor-pointer"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center justify-between text-[9px] text-slate-300 bg-slate-900/60 rounded px-2 py-1.5">
                        <span>Digital Glow</span>
                        <input
                          type="checkbox"
                          checked={config.segmentNumbersGlow ?? true}
                          onChange={e => setConfig({ ...config, segmentNumbersGlow: e.target.checked })}
                          className="accent-cyan-500"
                        />
                      </label>
                      <input
                        type="color"
                        value={config.segmentNumbersGlowColor || '#38bdf8'}
                        onChange={e => setConfig({ ...config, segmentNumbersGlowColor: e.target.value })}
                        className="w-full h-7 rounded bg-slate-950 border border-slate-800 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Needle Styling & Radiant Glow */}
              {(config.style === 'needle_gauge' || config.style === 'speedometer_classic') && (
                <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[9px] font-bold tracking-[0.18em] text-slate-500 uppercase">Needle Styling & Glow</div>
                    <span className="text-[9px] font-mono text-rose-400">NEEDLE</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-slate-400 block mb-1">Needle Color</label>
                      <input
                        type="color"
                        value={config.needleColor || '#ef4444'}
                        onChange={e => setConfig({ ...config, needleColor: e.target.value })}
                        className="w-full h-7 rounded bg-slate-950 border border-slate-800 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-400 block mb-1">Glow Color Mode</label>
                      <select
                        value={config.needleGlowColorMode || 'needle'}
                        onChange={e => setConfig({ ...config, needleGlowColorMode: e.target.value as any })}
                        className="w-full h-7 rounded bg-slate-900 border border-slate-800 text-[9px] text-slate-200"
                      >
                        <option value="needle">Match Needle Color</option>
                        <option value="state">Follow Active State</option>
                        <option value="custom">Custom Color</option>
                      </select>
                    </div>
                  </div>

                  {config.needleGlowColorMode === 'custom' && (
                    <div>
                      <label className="text-[9px] text-slate-400 block mb-1">Custom Needle Glow Color</label>
                      <input
                        type="color"
                        value={config.needleGlowColor || '#ef4444'}
                        onChange={e => setConfig({ ...config, needleGlowColor: e.target.value })}
                        className="w-full h-7 rounded bg-slate-950 border border-slate-800 cursor-pointer"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center justify-between text-[9px] text-slate-300 bg-slate-900/60 rounded px-2 py-1.5">
                      <span>Needle Glow</span>
                      <input
                        type="checkbox"
                        checked={config.needleGlowEnabled ?? true}
                        onChange={e => setConfig({ ...config, needleGlowEnabled: e.target.checked })}
                        className="accent-rose-500"
                      />
                    </label>
                    <label className="flex items-center justify-between text-[9px] text-slate-300 bg-slate-900/60 rounded px-2 py-1.5">
                      <span>Needle Shadow</span>
                      <input
                        type="checkbox"
                        checked={config.needleShadowEnabled ?? true}
                        onChange={e => setConfig({ ...config, needleShadowEnabled: e.target.checked })}
                        className="accent-rose-500"
                      />
                    </label>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                      <span>Needle Glow Radius</span>
                      <span>{config.needleGlowRadius ?? 10}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      value={config.needleGlowRadius ?? 10}
                      onChange={e => setConfig({ ...config, needleGlowRadius: Number(e.target.value) })}
                      className="w-full h-1.5 bg-slate-800 rounded cursor-pointer accent-rose-500"
                    />
                  </div>
                </div>
              )}

              <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-3 space-y-3">
                <div className="text-[9px] font-bold tracking-[0.18em] text-slate-500 uppercase">Value Styling</div>
                <div>
                  <label className="text-[9px] text-slate-400 block mb-1">Color Mode</label>
                  <select value={config.colorMode || 'threshold'}
                    onChange={e => setConfig({ ...config, colorMode: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-[10px] text-slate-200">
                    <option value="single">Single Color</option>
                    <option value="2-color-gradient">2-Color Gradient</option>
                    <option value="3-color-gradient">3-Color Gradient</option>
                    <option value="threshold">Threshold Colors</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ['gradientColor1', 'A'], ['gradientColor2', 'B'], ['gradientColor3', 'C']
                  ].map(([key, label]) => (
                    <div key={key}>
                      <label className="text-[9px] text-slate-500 block mb-1">{label}</label>
                      <input type="color" value={(config as any)[key] || '#ffffff'}
                        onChange={e => setConfig({ ...config, [key]: e.target.value } as Aida64GaugeSequenceConfig)}
                        className="w-full h-7 rounded bg-slate-950 border border-slate-800 cursor-pointer" />
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1"><span>Thickness</span><span>{config.activeThickness ?? (config.outerRadius - config.innerRadius)}px</span></div>
                  <input type="range" min="2" max="80" value={config.activeThickness ?? (config.outerRadius - config.innerRadius)}
                    onChange={e => {
                      const t = Number(e.target.value);
                      setConfig({ ...config, activeThickness: t, innerRadius: Math.max(10, config.outerRadius - t) });
                    }}
                    className="w-full h-1.5 bg-slate-800 rounded cursor-pointer accent-emerald-500" />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1"><span>Opacity</span><span>{Math.round((config.activeOpacity ?? 1) * 100)}%</span></div>
                  <input type="range" min="0" max="1" step="0.01" value={config.activeOpacity ?? 1}
                    onChange={e => setConfig({ ...config, activeOpacity: Number(e.target.value) })}
                    className="w-full h-1.5 bg-slate-800 rounded cursor-pointer accent-emerald-500" />
                </div>
              </div>

              <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[9px] font-bold tracking-[0.18em] text-slate-500 uppercase">Background Track</div>
                  <input type="checkbox" checked={config.showTrack}
                    onChange={e => setConfig({ ...config, showTrack: e.target.checked })}
                    className="accent-emerald-500" />
                </div>
                <div className="grid grid-cols-[1fr_56px] gap-2 items-center">
                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1"><span>Thickness</span><span>{config.trackThickness ?? 24}px</span></div>
                    <input type="range" min="2" max="80" value={config.trackThickness ?? 24}
                      onChange={e => setConfig({ ...config, trackThickness: Number(e.target.value) })}
                      className="w-full h-1.5 bg-slate-800 rounded cursor-pointer accent-emerald-500" />
                  </div>
                  <input type="color" value={config.trackColor}
                    onChange={e => setConfig({ ...config, trackColor: e.target.value })}
                    className="w-full h-7 rounded bg-slate-950 border border-slate-800 cursor-pointer" />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1"><span>Opacity</span><span>{Math.round((config.trackOpacity ?? 0.35) * 100)}%</span></div>
                  <input type="range" min="0" max="1" step="0.01" value={config.trackOpacity ?? 0.35}
                    onChange={e => setConfig({ ...config, trackOpacity: Number(e.target.value) })}
                    className="w-full h-1.5 bg-slate-800 rounded cursor-pointer accent-emerald-500" />
                </div>
              </div>

              <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[9px] font-bold tracking-[0.18em] text-slate-500 uppercase">Glow Effect</div>
                  <input type="checkbox" checked={config.glowEnabled ?? true}
                    onChange={e => setConfig({ ...config, glowEnabled: e.target.checked })}
                    className="accent-emerald-500" />
                </div>
                <div className="grid grid-cols-[1fr_56px] gap-2 items-center">
                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1"><span>Strength</span><span>{config.glowStrength ?? config.glowIntensity}</span></div>
                    <input type="range" min="0" max="40" value={config.glowStrength ?? config.glowIntensity}
                      onChange={e => setConfig({ ...config, glowStrength: Number(e.target.value), glowIntensity: Number(e.target.value) })}
                      className="w-full h-1.5 bg-slate-800 rounded cursor-pointer accent-emerald-500" />
                  </div>
                  <input type="color" value={config.glowColor || config.primaryColor}
                    onChange={e => setConfig({ ...config, glowColor: e.target.value })}
                    className="w-full h-7 rounded bg-slate-950 border border-slate-800 cursor-pointer" />
                </div>
              </div>

              <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[9px] font-bold tracking-[0.18em] text-slate-500 uppercase">Emissive Lighting / Bloom</div>
                  <input type="checkbox" checked={config.lightingEnabled ?? false}
                    onChange={e => setConfig({ ...config, lightingEnabled: e.target.checked })}
                    className="accent-emerald-500" />
                </div>
                <div>
                  <label className="text-[9px] text-slate-400 block mb-1">Lighting Style</label>
                  <select value={config.lightingMode || 'neon'}
                    onChange={e => setConfig({ ...config, lightingMode: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-[10px] text-slate-200">
                    <option value="neon">Neon LED</option>
                    <option value="bloom">High Bloom</option>
                    <option value="sci-fi">Sci-Fi / Holographic</option>
                    <option value="industrial">Industrial / Subtle</option>
                  </select>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1"><span>Light Intensity</span><span>{Math.round((config.lightingIntensity ?? 0.65) * 100)}%</span></div>
                  <input type="range" min="0" max="1" step="0.01" value={config.lightingIntensity ?? 0.65}
                    onChange={e => setConfig({ ...config, lightingIntensity: Number(e.target.value) })}
                    className="w-full h-1.5 bg-slate-800 rounded cursor-pointer accent-emerald-500" />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1"><span>Bloom Blur</span><span>{Math.round(config.lightingBloom ?? 12)}px</span></div>
                  <input type="range" min="0" max="40" value={config.lightingBloom ?? 12}
                    onChange={e => setConfig({ ...config, lightingBloom: Number(e.target.value) })}
                    className="w-full h-1.5 bg-slate-800 rounded cursor-pointer accent-emerald-500" />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1"><span>Light Radius</span><span>{Math.round((config.lightingRadius ?? 0.95) * 100)}%</span></div>
                  <input type="range" min="0.2" max="1.5" step="0.01" value={config.lightingRadius ?? 0.95}
                    onChange={e => setConfig({ ...config, lightingRadius: Number(e.target.value) })}
                    className="w-full h-1.5 bg-slate-800 rounded cursor-pointer accent-emerald-500" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center justify-between text-[10px] text-slate-300 bg-slate-900/60 rounded px-2 py-1.5"><span>Centre Bloom</span><input type="checkbox" checked={config.lightingCore ?? true} onChange={e => setConfig({ ...config, lightingCore: e.target.checked })} className="accent-emerald-500" /></label>
                  <label className="flex items-center justify-between text-[10px] text-slate-300 bg-slate-900/60 rounded px-2 py-1.5"><span>Track Glow</span><input type="checkbox" checked={config.lightingTrackGlow ?? false} onChange={e => setConfig({ ...config, lightingTrackGlow: e.target.checked })} className="accent-emerald-500" /></label>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1"><span>Core Intensity</span><span>{Math.round((config.lightingCoreIntensity ?? 0.75) * 100)}%</span></div>
                  <input type="range" min="0" max="1" step="0.01" value={config.lightingCoreIntensity ?? 0.75}
                    onChange={e => setConfig({ ...config, lightingCoreIntensity: Number(e.target.value) })}
                    className="w-full h-1.5 bg-slate-800 rounded cursor-pointer accent-emerald-500" />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1"><span>State Pulse</span><span>{Math.round((config.lightingPulse ?? 0) * 100)}%</span></div>
                  <input type="range" min="0" max="1" step="0.01" value={config.lightingPulse ?? 0}
                    onChange={e => setConfig({ ...config, lightingPulse: Number(e.target.value) })}
                    className="w-full h-1.5 bg-slate-800 rounded cursor-pointer accent-emerald-500" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-[9px] text-slate-400 block mb-1">Light Colour</label><select value={config.lightingColorMode || 'state'} onChange={e => setConfig({ ...config, lightingColorMode: e.target.value as any })} className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-[10px]"><option value="state">Follow State</option><option value="custom">Custom</option></select></div>
                  <input type="color" value={config.lightingCustomColor || '#ffffff'} onChange={e => setConfig({ ...config, lightingCustomColor: e.target.value })} className="w-full h-7 rounded bg-slate-950 border border-slate-800 cursor-pointer mt-4" />
                </div>
                <div><label className="text-[9px] text-slate-400 block mb-1">State Effects Curve</label><select value={config.effectCurve || 'linear'} onChange={e => setConfig({ ...config, effectCurve: e.target.value as any })} className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-[10px]"><option value="linear">Linear</option><option value="ease-in">Ease In</option><option value="ease-out">Ease Out</option><option value="ease-in-out">Ease In / Out</option><option value="exponential">Exponential</option><option value="stepped">Stepped</option><option value="threshold">Threshold</option><option value="warning-ramp">Warning Ramp</option></select></div>
                <div className="rounded border border-slate-800 bg-slate-900/40 p-2 space-y-2"><div className="text-[9px] font-bold tracking-[0.16em] text-slate-500 uppercase">Materials</div><select value={config.materialStyle || 'none'} onChange={e => setConfig({ ...config, materialStyle: e.target.value as any })} className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-[10px]"><option value="none">None</option><option value="glass">Glass</option><option value="acrylic">Acrylic</option><option value="brushed-metal">Brushed Metal</option><option value="chrome">Chrome</option><option value="carbon-fibre">Carbon Fibre</option><option value="anodized">Anodised</option><option value="frosted">Frosted</option><option value="holographic">Holographic</option><option value="crt">CRT</option><option value="led">LED</option><option value="liquid">Liquid</option></select><div><div className="flex justify-between text-[9px] text-slate-500"><span>Material Opacity</span><span>{Math.round((config.materialOpacity ?? .22)*100)}%</span></div><input type="range" min="0" max="1" step=".01" value={config.materialOpacity ?? .22} onChange={e => setConfig({ ...config, materialOpacity: Number(e.target.value) })} className="w-full h-1.5 accent-emerald-500" /></div></div>
                <div className="rounded border border-slate-800 bg-slate-900/40 p-2 space-y-2"><div className="text-[9px] font-bold tracking-[0.16em] text-slate-500 uppercase">Instrument Effects</div><div className="grid grid-cols-2 gap-2">{[['Warning Zones','warningZoneEnabled'],['Peak Hold','peakHoldEnabled'],['Min Marker','minimumMarkerEnabled'],['Needle Trail','needleTrailEnabled'],['Needle Shadow','needleShadowEnabled']].map(([label,key]) => <label key={key} className="text-[9px] flex justify-between bg-slate-950/60 p-1.5 rounded">{label}<input type="checkbox" checked={(config as any)[key] ?? (key==='needleShadowEnabled')} onChange={e => setConfig({ ...config, [key]: e.target.checked } as any)} /></label>)}</div></div>
                <div className="rounded border border-slate-800 bg-slate-900/40 p-2 space-y-2"><div className="text-[9px] font-bold tracking-[0.16em] text-slate-500 uppercase">HUD / Atmosphere</div><div className="grid grid-cols-2 gap-2">{[['Scanlines','scanlinesEnabled'],['HUD Grid','hudGridEnabled'],['Particles','particleEnabled'],['Sparks','sparkEnabled'],['Energy Arcs','energyArcEnabled'],['Rotating Rings','rotatingRingEnabled'],['Chromatic','chromaticEnabled'],['Glitch','glitchEnabled'],['Grain','grainEnabled'],['Vignette','vignetteEnabled']].map(([label,key]) => <label key={key} className="text-[9px] flex justify-between bg-slate-950/60 p-1.5 rounded">{label}<input type="checkbox" checked={(config as any)[key] ?? (key==='vignetteEnabled')} onChange={e => setConfig({ ...config, [key]: e.target.checked } as any)} /></label>)}</div><div><div className="flex justify-between text-[9px] text-slate-500"><span>Particle Count</span><span>{config.particleCount ?? 18}</span></div><input type="range" min="0" max="100" value={config.particleCount ?? 18} onChange={e => setConfig({ ...config, particleCount: Number(e.target.value) })} className="w-full h-1.5 accent-emerald-500" /></div></div>
                <div className="rounded border border-cyan-900/60 bg-slate-900/50 p-2 space-y-2">
                  <div className="flex items-center justify-between"><div className="text-[9px] font-bold tracking-[0.16em] text-cyan-400 uppercase">Full Effects Engine</div><label className="text-[9px] flex gap-2 items-center">Enabled<input type="checkbox" checked={config.effectEngineEnabled ?? false} onChange={e=>setConfig({...config,effectEngineEnabled:e.target.checked})}/></label></div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">{['cleanInstrument','neonCyberpunk','militaryHud','raceCar','sciFiReactor','retroCrt','glassPremium','industrial','holographic'].map(id=><button key={id} type="button" onClick={()=>applyEffectPreset(id)} className={`px-1.5 py-1 rounded border text-[8px] ${config.effectPreset===id?'border-cyan-400 text-cyan-300':'border-slate-700 text-slate-400'}`}>{id.replace(/([A-Z])/g,' $1')}</button>)}</div>
                  <div className="grid grid-cols-2 gap-2"><div><label className="text-[9px] text-slate-400">Quality</label><select value={config.effectQuality||'balanced'} onChange={e=>setConfig({...config,effectQuality:e.target.value as any})} className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-[9px]"><option value="draft">Draft</option><option value="balanced">Balanced</option><option value="high">High</option></select></div><div><label className="text-[9px] text-slate-400">Intensity {Math.round((config.effectIntensity??1)*100)}%</label><input className="w-full" type="range" min="0" max="2" step=".01" value={config.effectIntensity??1} onChange={e=>setConfig({...config,effectIntensity:+e.target.value})}/></div></div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">{[
                    ['3D Depth','depthEnabled'],['Reflections','reflectionEnabled'],['Parallax','parallaxEnabled'],['Directional Light','directionalLightEnabled'],['Multi-Light','lightSources'],['Dynamic Shadows','dynamicShadowEnabled'],['Specular','specularEnabled'],['Liquid','liquidEnabled'],['Digital Display','digitalDisplayEnabled'],['CRT','crtEnabled'],['Heat','heatEnabled'],['Electrical','electricalEnabled'],['Motion Blur','motionBlurEnabled'],['Ghosting','ghostingEnabled'],['Sweep','sweepEnabled'],['Dither','ditherEnabled'],['Glare','glareEnabled'],['Lens Flare','lensFlareEnabled'],['Edge Glow','edgeGlowEnabled'],['AO','ambientOcclusionEnabled'],['Gradient BG','gradientBackgroundEnabled']
                  ].map(([label,key])=><label key={key} className="text-[8px] flex justify-between items-center bg-slate-950/60 px-1.5 py-1 rounded"><span>{label}</span><input type="checkbox" checked={key==='lightSources'?Boolean(config.lightSources?.length):(config as any)[key]??false} onChange={ev=>{if(key==='lightSources'){setConfig({...config,lightSources:ev.target.checked?[{color:config.primaryColor,angle:-45,intensity:.8,radius:1,enabled:true}]:[]});}else setConfig({...config,[key]:ev.target.checked} as any)}}/></label>)}</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">{[
                    ['Depth','depthAmount'],['Reflection','reflectionAmount'],['Shadow','shadowAmount'],['Specular','specularAmount'],['Liquid','liquidAmount'],['Heat','heatAmount'],['Electrical','electricalAmount'],['Blur','motionBlurAmount'],['Ghost','ghostingAmount'],['Sweep','sweepAmount'],['Glare','glareAmount'],['Edge','edgeGlowAmount']
                  ].map(([label,key])=><div key={key}><label className="text-[8px] text-slate-500">{label}</label><input className="w-full" type="range" min="0" max="1" step=".01" value={(config as any)[key]??.5} onChange={e=>setConfig({...config,[key]:+e.target.value} as any)}/></div>)}</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2"><div><label className="text-[8px] text-slate-500">Digital</label><select value={config.digitalDisplayMode||'none'} onChange={e=>setConfig({...config,digitalDisplayMode:e.target.value as any})} className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-[8px]"><option value="none">None</option><option value="seven-segment">Seven Segment</option><option value="dot-matrix">Dot Matrix</option><option value="ticker">Ticker</option><option value="odometer">Odometer</option></select></div><div><label className="text-[8px] text-slate-500">Light Angle</label><input className="w-full" type="range" min="-180" max="180" value={config.directionalLightAngle??-45} onChange={e=>setConfig({...config,directionalLightAngle:+e.target.value})}/></div><div><label className="text-[8px] text-slate-500">CRT Curve</label><input className="w-full" type="range" min="0" max="1" step=".01" value={config.crtCurvature??.25} onChange={e=>setConfig({...config,crtCurvature:+e.target.value})}/></div><div><label className="text-[8px] text-slate-500">Noise Resistance</label><input className="w-full" type="range" min="0" max="1" step=".01" value={config.noiseResistance??.5} onChange={e=>setConfig({...config,noiseResistance:+e.target.value})}/></div></div>
                </div>
                <div className="text-[9px] text-slate-500">Lighting follows the active state colour, so the 0–100 export progressively illuminates rather than applying one identical glow to every frame.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
