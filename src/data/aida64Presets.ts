import { Aida64ScreenPreset, Aida64GaugeSequenceConfig, Aida64DialConfig, Aida64GaugeStyle, Aida64TelemetryPodConfig, Aida64ShapeType, Aida64PanelItem } from '../types';

export const AIDA64_SCREEN_PRESETS: Aida64ScreenPreset[] = [
  {
    id: 'res_1024x600',
    label: '1024 × 600',
    width: 1024,
    height: 600,
    diagonal: '7.0" Mini IPS',
    category: 'mini',
    description: 'Standard 7-inch mini display for internal case mounting or PSU shroud.'
  },
  {
    id: 'res_1920x480',
    label: '1920 × 480',
    width: 1920,
    height: 480,
    diagonal: '8.8" Bar LCD',
    category: 'bar',
    description: 'Ultrawide elongated bar screen commonly mounted above GPU or at case base.'
  },
  {
    id: 'res_1920x515',
    label: '1920 × 515',
    width: 1920,
    height: 515,
    diagonal: '12.6" Stretched',
    category: 'bar',
    description: 'Dual-chamber corner pillar display with high pixel density.'
  },
  {
    id: 'res_800x480',
    label: '800 × 480',
    width: 800,
    height: 480,
    diagonal: '5.0" Compact',
    category: 'mini',
    description: 'Compact 5-inch screen fit for front drive bays or side glass corners.'
  },
  {
    id: 'res_480x480',
    label: '480 × 480',
    width: 480,
    height: 480,
    diagonal: 'Round / Square AIO',
    category: 'aio',
    description: 'Liquid cooler pump cap LCD (Kraken, Corsair, Lian Li LCD pump heads).'
  },
  {
    id: 'res_1280x800',
    label: '1280 × 800',
    width: 1280,
    height: 800,
    diagonal: '8.0" / 10.1" Tablet',
    category: 'standard',
    description: 'External tablet or secondary side monitor.'
  }
];

export const AIDA64_THEMES = [
  {
    id: 'cyberpunk_red',
    name: 'Cyberpunk Crimson',
    primaryColor: '#ef4444',
    secondaryColor: '#f97316',
    accentColor: '#dc2626',
    bgColor: '#050508',
    glowColor: 'rgba(239, 68, 68, 0.4)',
    promptKeywords: 'cyberpunk crimson red glowing telemetry chassis, dark brushed titanium backplate, illuminated neon red cooling conduits, futuristic tactical military HUD bezel, solid pitch black empty display cutout bays, matte black carbon fiber texture, blank dark glass mounting sockets, symmetrical chamfered sci-fi frame, ultra clean dark UI backdrop, 8k resolution, Unreal Engine 5 render style'
  },
  {
    id: 'cyber_cyan',
    name: 'Neon Cyber Cyan',
    primaryColor: '#06b6d4',
    secondaryColor: '#3b82f6',
    accentColor: '#0891b2',
    bgColor: '#040914',
    glowColor: 'rgba(6, 182, 212, 0.4)',
    promptKeywords: 'high-tech neon cyan and electric blue telemetry chassis, solid pitch black empty sensor sockets, glowing circuit traces, spacecraft cockpit HUD console backplate, chamfered edge brackets, dark matte finish, aerospace HUD design with empty circular dark sockets and horizontal blank rectangular mounting bays, ultra sharp'
  },
  {
    id: 'amber_matrix',
    name: 'Industrial Amber',
    primaryColor: '#f59e0b',
    secondaryColor: '#ea580c',
    accentColor: '#d97706',
    bgColor: '#0a0702',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    promptKeywords: 'heavy industrial mecha telemetry chassis, dark gunmetal frame, bright amber orange hazard accents, ventilation grille cutouts, rugged reinforced brackets, tactical monitoring console with empty dark recessed cavities, solid black glass interior, high contrast'
  },
  {
    id: 'stealth_dark',
    name: 'Stealth Carbon Matrix',
    primaryColor: '#64748b',
    secondaryColor: '#94a3b8',
    accentColor: '#475569',
    bgColor: '#030712',
    glowColor: 'rgba(148, 163, 184, 0.25)',
    promptKeywords: 'minimalist stealth carbon fiber hardware monitor dashboard, dark monochrome anodized aluminum, subtle silver bevels, ultra-clean recessed bays, solid pitch black empty sockets, pure pristine blank layout'
  },
  {
    id: 'toxic_green',
    name: 'Matrix Neon Green',
    primaryColor: '#10b981',
    secondaryColor: '#84cc16',
    accentColor: '#059669',
    bgColor: '#020d08',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    promptKeywords: 'cyber matrix neon emerald green telemetry panel, dark obsidian glass, glowing power lines, futuristic laboratory HUD frame, empty rounded pill slots and circular dark housings, clean dark recessed cavities, solid pitch black interior, sharp vector edges'
  }
];

export const DEFAULT_DIAL_CONFIG: Aida64DialConfig = {
  size: 300,
  themeColor: '#ef4444',
  accentColor: '#dc2626',
  hasOuterLedTrack: true,
  heroType: 'circle',
  bannerTitle: 'CPU TELEMETRY',
  orientation: 'left',
  slots: [
    { id: 'slot_banner', label: 'COMPONENT ID', icon: 'none', unit: '', type: 'banner' },
    { id: 'slot_hero', label: 'UTIL / TEMP', icon: 'none', unit: '%', type: 'hero' },
    { id: 'slot_mhz', label: 'CLOCK', icon: 'freq', unit: 'MHz', type: 'pill' },
    { id: 'slot_fan1', label: 'FAN 1', icon: 'fan', unit: 'RPM', type: 'pill' },
    { id: 'slot_fan2', label: 'FAN 2 / PUMP', icon: 'pump', unit: 'RPM', type: 'pill' },
    { id: 'slot_tray', label: 'THERMAL DIODE', icon: 'temp', unit: '°C', type: 'tray' }
  ]
};

export const DEFAULT_GAUGE_CONFIG: Aida64GaugeSequenceConfig = {
  frameCount: 100,
  width: 300,
  height: 300,
  style: 'segmented_arc',
  startAngleDeg: 140,
  endAngleDeg: 400,
  innerRadius: 108,
  outerRadius: 132,
  segmentCount: 24,
  segmentGapDeg: 2.5,
  primaryColor: '#ef4444',
  warningColor: '#f59e0b',
  criticalColor: '#dc2626',
  warningThreshold: 75,
  criticalThreshold: 90,
  trackColor: '#1e293b',
  showTrack: true,
  glowIntensity: 12,
  roundedEnds: true,
  gapRotationDeg: 0,
  colorMode: 'threshold',
  gradientColor1: '#38bdf8',
  gradientColor2: '#10b981',
  gradientColor3: '#ef4444',
  activeThickness: 24,
  activeOpacity: 1,
  trackThickness: 24,
  trackOpacity: 0.35,
  glowEnabled: true,
  glowColor: '#ef4444',
  glowStrength: 12,
  lightingEnabled: true,
  lightingMode: 'neon',
  lightingIntensity: 0.65,
  lightingRadius: 0.95,
  lightingBloom: 12,
  lightingCore: true,
  lightingCoreIntensity: 0.75,
  lightingTrackGlow: false,
  lightingPulse: 0,
  lightingColorMode: 'state',
  lightingCustomColor: '#ffffff',
  materialStyle: 'none',
  materialOpacity: 0.22,
  materialHighlight: 0.5,
  glassReflection: 0.35,
  glassTint: '#ffffff',
  needleShadowEnabled: true,
  needleTrailEnabled: false,
  needleTrailLength: 0.18,
  needleTrailOpacity: 0.45,
  peakHoldEnabled: false,
  peakHoldValue: 100,
  minimumMarkerEnabled: false,
  minimumMarkerValue: 0,
  warningZoneEnabled: false,
  warningZoneOpacity: 0.18,
  criticalZoneOpacity: 0.24,
  tickHighlightEnabled: false,
  tickHighlightWidth: 2,
  scanlinesEnabled: false,
  scanlineOpacity: 0.08,
  scanlineSpacing: 4,
  scanlineSoftness: 0,
  hudGridEnabled: false,
  hudGridOpacity: 0.08,
  hudGridSize: 24,
  glitchEnabled: false,
  glitchAmount: 0.08,
  chromaticEnabled: false,
  chromaticAmount: 3,
  particleEnabled: false,
  particleCount: 18,
  particleOpacity: 0.22,
  sparkEnabled: false,
  sparkCount: 10,
  energyArcEnabled: false,
  energyArcCount: 2,
  rotatingRingEnabled: false,
  rotatingRingCount: 2,
  rotatingRingOpacity: 0.3,
  vignetteEnabled: true,
  vignetteStrength: 0.28,
  grainEnabled: false,
  grainAmount: 0.04,
  ambientLightEnabled: true,
  ambientLightOpacity: 0.08,
  depthBlur: 0,
  effectCurve: 'linear',
  scale: 1,
  needleColor: '#ffffff',
  needleGlowEnabled: true,
  needleGlowColor: '#ef4444',
  needleGlowRadius: 10,
  needleGlowIntensity: 0.85,
  needleGlowColorMode: 'needle',
  centerTextFormat: 'percent',
  showCenterValue: true,
  centerValueScale: 1,
  centerValueColor: '#ffffff',
  centerValueColorMode: 'state',
  centerValueGlowEnabled: true,
  centerValueGlowColor: '#38bdf8',
  centerValueGlowRadius: 10,
  centerValueFontFamily: 'digital',
  centerValueLcdGhost: false,
  centerValueOffsetX: 0,
  centerValueOffsetY: 0,
  showMetricLabel: true,
  metricLabel: 'CPU LOAD',
  metricLabelScale: 1,
  metricLabelColor: '#ef4444',
  metricLabelColorMode: 'state',
  metricLabelGlowEnabled: true,
  metricLabelGlowColor: '#38bdf8',
  metricLabelGlowRadius: 6,
  metricLabelFontFamily: 'sans-serif',
  metricLabelOffsetX: 0,
  metricLabelOffsetY: 0,
  metricUnit: '%',
  showSegmentNumbers: false,
  segmentNumbersFormat: '0-100',
  segmentNumbersScale: 1,
  segmentNumbersOffset: 12,
  segmentNumbersColor: '#94a3b8',
  segmentNumbersColorMode: 'state',
  segmentNumbersGlow: false,
  segmentNumbersGlowColor: '#38bdf8'
};

export interface GaugeStyleMeta {
  id: Aida64GaugeStyle;
  name: string;
  category: 'circular' | 'horizontal' | 'vertical';
  description: string;
  defaultConfig: Partial<Aida64GaugeSequenceConfig>;
}

export const GAUGE_STYLES_REGISTRY: GaugeStyleMeta[] = [
  // Circular
  {
    id: 'segmented_arc',
    name: 'Segmented Arc',
    category: 'circular',
    description: 'Chunky tactical LED segments curved along a 260° arc. Ideal for CPU & GPU loads.',
    defaultConfig: {
      startAngleDeg: 140,
      endAngleDeg: 400,
      innerRadius: 108,
      outerRadius: 132,
      segmentCount: 24,
      segmentGapDeg: 2.5
    }
  },
  {
    id: 'smooth_arc',
    name: 'Smooth Continuous Arc',
    category: 'circular',
    description: 'Clean modern smooth continuous gradient stroke with rounded caps and outer glow.',
    defaultConfig: {
      startAngleDeg: 140,
      endAngleDeg: 400,
      innerRadius: 112,
      outerRadius: 128,
      glowIntensity: 16
    }
  },
  {
    id: 'radial_ticks',
    name: 'Radial Tachometer Ticks',
    category: 'circular',
    description: 'Mechanical instrumentation tachometer with fine minor and major radial tick marks.',
    defaultConfig: {
      startAngleDeg: 140,
      endAngleDeg: 400,
      innerRadius: 100,
      outerRadius: 134,
      segmentCount: 40
    }
  },
  {
    id: 'led_ladder',
    name: 'LED Ring Dots',
    category: 'circular',
    description: 'Distinct illuminated circular LED beads arranged in an orbital circular array.',
    defaultConfig: {
      startAngleDeg: 140,
      endAngleDeg: 400,
      innerRadius: 110,
      outerRadius: 130,
      segmentCount: 28,
      segmentGapDeg: 4
    }
  },
  {
    id: 'dual_ring',
    name: 'Dual Concentric Ring',
    category: 'circular',
    description: 'Outer ring renders primary load %, inner ring renders thermal diode temperature °C.',
    defaultConfig: {
      startAngleDeg: 140,
      endAngleDeg: 400,
      innerRadius: 85,
      outerRadius: 132,
      segmentCount: 20
    }
  },
  {
    id: 'progress_ring',
    name: 'Minimal Progress Ring',
    category: 'circular',
    description: 'Ultra-clean 360° closed circle progress bar with percentage readout in center.',
    defaultConfig: {
      startAngleDeg: -90,
      endAngleDeg: 270,
      innerRadius: 115,
      outerRadius: 125,
      showTrack: true
    }
  },
  {
    id: 'digital_arc',
    name: 'Digital Sci-Fi HUD Arc',
    category: 'circular',
    description: 'Angular aerospace telemetry arc with stepped brackets, hash marks, and target crosshairs.',
    defaultConfig: {
      startAngleDeg: 130,
      endAngleDeg: 410,
      innerRadius: 100,
      outerRadius: 130,
      segmentCount: 18,
      segmentGapDeg: 3
    }
  },
  {
    id: 'needle_gauge',
    name: 'Analogue Needle Dial',
    category: 'circular',
    description: 'Automotive racing instrument dial with sweeping mechanical pivot needle and dial marks.',
    defaultConfig: {
      startAngleDeg: 135,
      endAngleDeg: 405,
      innerRadius: 60,
      outerRadius: 130,
      needleColor: '#ef4444'
    }
  },
  {
    id: 'half_arc',
    name: '180° Half Arc Gauge',
    category: 'circular',
    description: '180-degree top hemisphere semi-circle gauge. Excellent for compact 100-140px vertical bays.',
    defaultConfig: {
      startAngleDeg: 180,
      endAngleDeg: 360,
      innerRadius: 90,
      outerRadius: 120,
      segmentCount: 16
    }
  },
  {
    id: 'corner_gauge',
    name: 'Corner Quadrant Gauge',
    category: 'circular',
    description: '90-degree quadrant arc designed to wrap around screen corners or rectangular bezel edges.',
    defaultConfig: {
      startAngleDeg: 180,
      endAngleDeg: 270,
      innerRadius: 70,
      outerRadius: 125,
      segmentCount: 12
    }
  },
  {
    id: 'radar_tactical',
    name: 'Radar Tactical Gauge',
    category: 'circular',
    description: 'Tactical polygon sweep with concentric range rings and segmented outer perimeter.',
    defaultConfig: {
      startAngleDeg: 0,
      endAngleDeg: 360,
      innerRadius: 30,
      outerRadius: 130,
      segmentCount: 32
    }
  },

  // Horizontal Bars
  {
    id: 'led_bar_h',
    name: 'Horizontal LED Bar',
    category: 'horizontal',
    description: 'Horizontal linear strip of rectangular LED blocks. Fits wide sensor matrices and RAM bays.',
    defaultConfig: {
      width: 280,
      height: 36,
      segmentCount: 20
    }
  },
  {
    id: 'segment_bar_h',
    name: 'Horizontal Segment Bar',
    category: 'horizontal',
    description: 'Chunky angled hazard segment bar with high contrast active state coloring.',
    defaultConfig: {
      width: 280,
      height: 40,
      segmentCount: 14
    }
  },
  {
    id: 'thermal_bar_h',
    name: 'Horizontal Thermal Gradient Bar',
    category: 'horizontal',
    description: 'Continuous smooth thermal temperature meter with color gradient transitions (Blue → Green → Orange → Red).',
    defaultConfig: {
      width: 280,
      height: 32
    }
  },
  {
    id: 'industrial_bar_h',
    name: 'Industrial Heavy Segment Bar',
    category: 'horizontal',
    description: 'Rugged mechanical heavy-gauge bar with chamfered segment tiles and metal border.',
    defaultConfig: {
      width: 300,
      height: 44,
      segmentCount: 10
    }
  },

  // Vertical Bars
  {
    id: 'segment_ladder_v',
    name: 'Vertical Segment Ladder',
    category: 'vertical',
    description: 'Vertical ascending ladder segments. Perfect for VRAM, RAM, and PCIe bus monitoring.',
    defaultConfig: {
      width: 48,
      height: 240,
      segmentCount: 20
    }
  },
  {
    id: 'thermal_bar_v',
    name: 'Vertical Thermal Column',
    category: 'vertical',
    description: 'Vertical thermometer column with glowing bulb base and graduated thermal levels.',
    defaultConfig: {
      width: 44,
      height: 240
    }
  },

  // Genuinely distinct gauge geometries
  {
    id: 'seven_segment',
    name: 'Seven-Segment Digital',
    category: 'circular',
    description: 'Large seven-segment digital readout framed by a technical bezel; ideal when the number is the hero.',
    defaultConfig: { startAngleDeg: 0, endAngleDeg: 360, innerRadius: 96, outerRadius: 132, showTrack: true }
  },
  {
    id: 'mechanical_dial',
    name: 'Mechanical Instrument Dial',
    category: 'circular',
    description: 'Full instrument face with major/minor graduations, a hub, pointer and warning-zone bands.',
    defaultConfig: { startAngleDeg: 135, endAngleDeg: 405, innerRadius: 64, outerRadius: 132, segmentCount: 30, needleColor: '#ffffff' }
  },
  {
    id: 'radial_bars_true',
    name: 'Radial Bar Chart',
    category: 'circular',
    description: 'Discrete rectangular bars radiating outward from the centre rather than following an arc stroke.',
    defaultConfig: { startAngleDeg: 0, endAngleDeg: 360, innerRadius: 62, outerRadius: 132, segmentCount: 32, segmentGapDeg: 2 }
  },
  {
    id: 'multi_ring_telemetry',
    name: 'Triple Telemetry Rings',
    category: 'circular',
    description: 'Three independent concentric rings for primary load, secondary activity and thermal context.',
    defaultConfig: { startAngleDeg: -90, endAngleDeg: 270, innerRadius: 58, outerRadius: 132, segmentCount: 28, segmentGapDeg: 2 }
  },
  {
    id: 'waveform_scope',
    name: 'Oscilloscope Waveform',
    category: 'circular',
    description: 'Oscilloscope-style live trace inside a framed display; the sensor value controls waveform amplitude and intensity.',
    defaultConfig: { startAngleDeg: 0, endAngleDeg: 360, innerRadius: 94, outerRadius: 132, segmentCount: 32 }
  },
  {
    id: 'horizon_level',
    name: 'Attitude Horizon',
    category: 'circular',
    description: 'Aircraft-style artificial horizon with pitch ladder and centre aircraft marker.',
    defaultConfig: { startAngleDeg: 0, endAngleDeg: 360, innerRadius: 92, outerRadius: 132 }
  },
  {
    id: 'compass_needle',
    name: 'Compass Needle',
    category: 'circular',
    description: 'Navigational compass face with cardinal markers, rotating needle and outer degree ticks.',
    defaultConfig: { startAngleDeg: 0, endAngleDeg: 360, innerRadius: 86, outerRadius: 132, segmentCount: 36, needleColor: '#ef4444' }
  },
  {
    id: 'dot_matrix_ring',
    name: 'Dot Matrix Ring',
    category: 'circular',
    description: 'Dense matrix of individual dots that light progressively around the circumference.',
    defaultConfig: { startAngleDeg: -90, endAngleDeg: 270, innerRadius: 104, outerRadius: 128, segmentCount: 48, segmentGapDeg: 1 }
  },
  {
    id: 'battery_cells_v',
    name: 'Vertical Battery Cells',
    category: 'vertical',
    description: 'Battery-shaped vertical enclosure with discrete charge cells and terminal cap.',
    defaultConfig: { width: 70, height: 250, segmentCount: 10 }
  },
  {
    id: 'thermometer_bulb_v',
    name: 'Bulb Thermometer',
    category: 'vertical',
    description: 'Classic thermometer silhouette with a circular bulb, graduated tube and threshold marks.',
    defaultConfig: { width: 64, height: 260, segmentCount: 10 }
  }

];

// Pre-configured 7-Value Telemetry Pods
export const PRESET_TELEMETRY_PODS: Aida64TelemetryPodConfig[] = [
  {
    id: 'pod_cpu_7',
    podType: 'cpu',
    title: 'CPU PROCESSOR',
    subtitle: 'AMD Ryzen / Intel Core',
    themeColor: '#ef4444',
    accentColor: '#f97316',
    width: 280,
    height: 380,
    heroSensor: 'CPU %',
    heroLabel: 'UTILISATION',
    heroValue: '67',
    heroUnit: '%',
    heroPercent: 67,
    showHeroGauge: true,
    slots: [
      { id: 'cpu_s1', label: 'CORE TEMP', sensorKey: 'CPU Diode', testValue: '54', unit: '°C', icon: 'temp', color: '#ef4444', showMiniBar: true },
      { id: 'cpu_s2', label: 'CLOCK FREQ', sensorKey: 'CPU Clock', testValue: '4.80', unit: 'GHz', icon: 'clock', color: '#38bdf8', showMiniBar: true },
      { id: 'cpu_s3', label: 'PKG POWER', sensorKey: 'CPU Power', testValue: '49.9', unit: 'W', icon: 'watt', color: '#f59e0b', showMiniBar: true },
      { id: 'cpu_s4', label: 'CORE VOLTAGE', sensorKey: 'CPU VCore', testValue: '1.10', unit: 'V', icon: 'volt', color: '#a855f7', showMiniBar: false },
      { id: 'cpu_s5', label: 'FAN 1 SPEED', sensorKey: 'CPU Fan', testValue: '978', unit: 'RPM', icon: 'fan', color: '#10b981', showMiniBar: true },
      { id: 'cpu_s6', label: 'PACKAGE LOAD', sensorKey: 'CPU Total', testValue: '67', unit: '%', icon: 'load', color: '#ef4444', showMiniBar: true },
      { id: 'cpu_s7', label: 'SOC / DIODE', sensorKey: 'CPU SOC', testValue: '42', unit: '°C', icon: 'temp', color: '#06b6d4', showMiniBar: false }
    ]
  },
  {
    id: 'pod_gpu_7',
    podType: 'gpu',
    title: 'GPU GRAPHICS',
    subtitle: 'NVIDIA RTX 3070 Ti (8GB)',
    themeColor: '#10b981',
    accentColor: '#06b6d4',
    width: 280,
    height: 380,
    heroSensor: 'GPU %',
    heroLabel: 'CORE UTILISATION',
    heroValue: '82',
    heroUnit: '%',
    heroPercent: 82,
    showHeroGauge: true,
    slots: [
      { id: 'gpu_s1', label: 'GPU TEMP', sensorKey: 'GPU Temp', testValue: '58', unit: '°C', icon: 'temp', color: '#10b981', showMiniBar: true },
      { id: 'gpu_s2', label: 'HOTSPOT TEMP', sensorKey: 'GPU Hotspot', testValue: '66', unit: '°C', icon: 'temp', color: '#ef4444', showMiniBar: true },
      { id: 'gpu_s3', label: 'CORE CLOCK', sensorKey: 'GPU Core Clock', testValue: '1770', unit: 'MHz', icon: 'clock', color: '#38bdf8', showMiniBar: true },
      { id: 'gpu_s4', label: 'MEMORY CLOCK', sensorKey: 'GPU Mem Clock', testValue: '9500', unit: 'MHz', icon: 'clock', color: '#a855f7', showMiniBar: true },
      { id: 'gpu_s5', label: 'VRAM USED', sensorKey: 'GPU VRAM', testValue: '5120', unit: 'MB', icon: 'mem', color: '#f59e0b', showMiniBar: true },
      { id: 'gpu_s6', label: 'POWER DRAW', sensorKey: 'GPU Power', testValue: '218', unit: 'W', icon: 'watt', color: '#ef4444', showMiniBar: true },
      { id: 'gpu_s7', label: 'FAN RPM', sensorKey: 'GPU Fan', testValue: '1293', unit: 'RPM', icon: 'fan', color: '#10b981', showMiniBar: true }
    ]
  },
  {
    id: 'pod_mem_7',
    podType: 'memory',
    title: 'SYSTEM MEMORY',
    subtitle: 'DDR4 / DDR5 Dual Channel',
    themeColor: '#a855f7',
    accentColor: '#ec4899',
    width: 280,
    height: 380,
    heroSensor: 'MEM %',
    heroLabel: 'RAM ALLOCATION',
    heroValue: '44',
    heroUnit: '%',
    heroPercent: 44,
    showHeroGauge: true,
    slots: [
      { id: 'mem_s1', label: 'USED MEMORY', sensorKey: 'RAM Used', testValue: '14.2', unit: 'GB', icon: 'mem', color: '#a855f7', showMiniBar: true },
      { id: 'mem_s2', label: 'FREE MEMORY', sensorKey: 'RAM Free', testValue: '17.8', unit: 'GB', icon: 'mem', color: '#10b981', showMiniBar: true },
      { id: 'mem_s3', label: 'MEMORY SPEED', sensorKey: 'RAM Speed', testValue: '3600', unit: 'MT/s', icon: 'clock', color: '#38bdf8', showMiniBar: false },
      { id: 'mem_s4', label: 'CAS LATENCY', sensorKey: 'RAM Timings', testValue: '16-18-18', unit: 'CR1', icon: 'clock', color: '#94a3b8', showMiniBar: false },
      { id: 'mem_s5', label: 'DIMM 1 TEMP', sensorKey: 'RAM Temp 1', testValue: '38', unit: '°C', icon: 'temp', color: '#06b6d4', showMiniBar: true },
      { id: 'mem_s6', label: 'DIMM 2 TEMP', sensorKey: 'RAM Temp 2', testValue: '39', unit: '°C', icon: 'temp', color: '#06b6d4', showMiniBar: true },
      { id: 'mem_s7', label: 'PAGEFILE USED', sensorKey: 'Swap Used', testValue: '4.8', unit: 'GB', icon: 'm2', color: '#f59e0b', showMiniBar: true }
    ]
  },
  {
    id: 'pod_storage_net_7',
    podType: 'storage_net',
    title: 'STORAGE & NET',
    subtitle: 'NVMe Gen4 & Gigabit I/O',
    themeColor: '#06b6d4',
    accentColor: '#3b82f6',
    width: 280,
    height: 380,
    heroSensor: 'NET DL',
    heroLabel: 'DOWNLOAD SPEED',
    heroValue: '142',
    heroUnit: 'MB/s',
    heroPercent: 70,
    showHeroGauge: true,
    slots: [
      { id: 'sn_s1', label: 'NVMe 1 READ', sensorKey: 'Disk Read 1', testValue: '3450', unit: 'MB/s', icon: 'm2', color: '#06b6d4', showMiniBar: true },
      { id: 'sn_s2', label: 'NVMe 1 WRITE', sensorKey: 'Disk Write 1', testValue: '1280', unit: 'MB/s', icon: 'm2', color: '#3b82f6', showMiniBar: true },
      { id: 'sn_s3', label: 'NVMe 1 TEMP', sensorKey: 'Disk Temp 1', testValue: '44', unit: '°C', icon: 'temp', color: '#10b981', showMiniBar: true },
      { id: 'sn_s4', label: 'NVMe 2 TEMP', sensorKey: 'Disk Temp 2', testValue: '48', unit: '°C', icon: 'temp', color: '#f59e0b', showMiniBar: true },
      { id: 'sn_s5', label: 'WAN DOWNLOAD', sensorKey: 'Net DL', testValue: '142.5', unit: 'MB/s', icon: 'net', color: '#10b981', showMiniBar: true },
      { id: 'sn_s6', label: 'WAN UPLOAD', sensorKey: 'Net UL', testValue: '28.4', unit: 'MB/s', icon: 'net', color: '#38bdf8', showMiniBar: true },
      { id: 'sn_s7', label: 'GATEWAY PING', sensorKey: 'Net Ping', testValue: '9', unit: 'ms', icon: 'net', color: '#10b981', showMiniBar: false }
    ]
  }
];

export interface Aida64ShapeDefinition {
  shapeType: Aida64ShapeType;
  name: string;
  category: 'dial' | 'boxes' | 'thermal' | 'banner' | 'stack' | 'memory' | 'system' | 'visual';
  description: string;
  defaultWidth: number;
  defaultHeight: number;
  defaultColor: string;
  previewIcon: string;
  factoryItem: (id: string, x: number, y: number) => Aida64PanelItem;
}

export const AIDA64_SHAPES_CATALOG: Aida64ShapeDefinition[] = [
  {
    shapeType: 'dial_with_boxes',
    name: 'CPU Dial with Value Box Cutouts',
    category: 'dial',
    description: 'Circular gauge with internal cavities/boxes specifically shaped for CPU %, Clock MHz, and Temp °C readouts.',
    defaultWidth: 260,
    defaultHeight: 260,
    defaultColor: '#ef4444',
    previewIcon: 'disc',
    factoryItem: (id, x, y) => ({
      id,
      name: 'CPU Dial (Integrated Value Boxes)',
      type: 'dial',
      shapeType: 'dial_with_boxes',
      x,
      y,
      width: 260,
      height: 260,
      sensorType: 'CPU SENSORS',
      testValue: '14',
      unit: '%',
      color: '#ef4444',
      scale: 1,
      gaugePercent: 14,
      bannerTitle: 'CPU',
      shapeSlots: [
        { id: 'sb_1', label: 'USAGE', testValue: '14', unit: '%', shapeType: 'box_chamfer', color: '#ef4444' },
        { id: 'sb_2', label: 'CLOCK', testValue: '4464', unit: 'MHz', shapeType: 'box_rectangle', color: '#ef4444' },
        { id: 'sb_3', label: 'TEMP', testValue: '61', unit: '°C', shapeType: 'box_cut_corner', color: '#ef4444' }
      ]
    })
  },
  {
    shapeType: 'box_chamfer',
    name: 'Chamfered Sci-Fi Value Box',
    category: 'boxes',
    description: 'Precision angled chamfered telemetry cutout box. Perfect for placing inside dials or standalone telemetry grids.',
    defaultWidth: 110,
    defaultHeight: 44,
    defaultColor: '#ef4444',
    previewIcon: 'box',
    factoryItem: (id, x, y) => ({
      id,
      name: 'Chamfered Value Box',
      type: 'value_box',
      shapeType: 'box_chamfer',
      boxShape: 'chamfer',
      x,
      y,
      width: 110,
      height: 44,
      sensorType: 'CPU CLOCK',
      testValue: '4464',
      unit: 'MHz',
      color: '#ef4444',
      scale: 1
    })
  },
  {
    shapeType: 'box_hexagon',
    name: 'Hexagonal Cyber Value Box',
    category: 'boxes',
    description: 'Futuristic angular hexagon socket box for thermal or voltage metric readouts.',
    defaultWidth: 100,
    defaultHeight: 52,
    defaultColor: '#06b6d4',
    previewIcon: 'box',
    factoryItem: (id, x, y) => ({
      id,
      name: 'Hexagon Value Box',
      type: 'value_box',
      shapeType: 'box_hexagon',
      boxShape: 'hexagon',
      x,
      y,
      width: 100,
      height: 52,
      sensorType: 'CPU TEMP',
      testValue: '61',
      unit: '°C',
      color: '#06b6d4',
      scale: 1
    })
  },
  {
    shapeType: 'box_cut_corner',
    name: 'Cut-Corner Angular Box',
    category: 'boxes',
    description: 'Beveled opposite-corner telemetry box for high-tech industrial dashboards.',
    defaultWidth: 120,
    defaultHeight: 46,
    defaultColor: '#f59e0b',
    previewIcon: 'box',
    factoryItem: (id, x, y) => ({
      id,
      name: 'Cut-Corner Box',
      type: 'value_box',
      shapeType: 'box_cut_corner',
      boxShape: 'cut_corner',
      x,
      y,
      width: 120,
      height: 46,
      sensorType: 'CPU VOLTAGE',
      testValue: '1.260',
      unit: 'V',
      color: '#f59e0b',
      scale: 1
    })
  },
  {
    shapeType: 'box_pill',
    name: 'Rounded Stadium Pill Box',
    category: 'boxes',
    description: 'Sleek rounded capsule pill socket box for compact single or dual values.',
    defaultWidth: 100,
    defaultHeight: 38,
    defaultColor: '#10b981',
    previewIcon: 'box',
    factoryItem: (id, x, y) => ({
      id,
      name: 'Pill Value Box',
      type: 'value_box',
      shapeType: 'box_pill',
      boxShape: 'pill',
      x,
      y,
      width: 100,
      height: 38,
      sensorType: 'FAN RPM',
      testValue: '1440',
      unit: 'RPM',
      color: '#10b981',
      scale: 1
    })
  },
  {
    shapeType: 'box_bracket',
    name: 'HUD Bracket Framing Box',
    category: 'boxes',
    description: 'Corner-bracketed HUD telemetry box with open side styling for clean digital readouts.',
    defaultWidth: 110,
    defaultHeight: 42,
    defaultColor: '#a855f7',
    previewIcon: 'box',
    factoryItem: (id, x, y) => ({
      id,
      name: 'HUD Bracket Box',
      type: 'value_box',
      shapeType: 'box_bracket',
      boxShape: 'bracket',
      x,
      y,
      width: 110,
      height: 42,
      sensorType: 'POWER WATTAGE',
      testValue: '55.7',
      unit: 'W',
      color: '#a855f7',
      scale: 1
    })
  },
  {
    shapeType: 'box_rectangle',
    name: 'Standard Recessed Bezel Box',
    category: 'boxes',
    description: 'Classic crisp rectangular recessed glass cavity box with chamfered inner lip.',
    defaultWidth: 100,
    defaultHeight: 40,
    defaultColor: '#ffffff',
    previewIcon: 'box',
    factoryItem: (id, x, y) => ({
      id,
      name: 'Rectangular Value Box',
      type: 'value_box',
      shapeType: 'box_rectangle',
      boxShape: 'rectangle',
      x,
      y,
      width: 100,
      height: 40,
      sensorType: 'USAGE %',
      testValue: '14',
      unit: '%',
      color: '#ffffff',
      scale: 1
    })
  },
  {
    shapeType: 'dial_circle',
    name: 'Circular Dial Socket',
    category: 'dial',
    description: 'Circular gauge bezel housing with radial percentage arc and central readout (CPU / GPU dial).',
    defaultWidth: 240,
    defaultHeight: 240,
    defaultColor: '#ef4444',
    previewIcon: 'disc',
    factoryItem: (id, x, y) => ({
      id,
      name: 'CPU Radial Dial',
      type: 'dial',
      shapeType: 'dial_circle',
      x,
      y,
      width: 240,
      height: 240,
      sensorType: 'CPU %',
      testValue: '14',
      unit: '%',
      color: '#ef4444',
      scale: 1,
      gaugePercent: 14,
      bannerTitle: 'CPU'
    })
  },
  {
    shapeType: 'temp_wing_angled',
    name: 'Angled Temperature Wing',
    category: 'thermal',
    description: 'Sleek aerodynamic angled pod with thermometer glyph, status LED dot, and thermal readout (as shown in reference design).',
    defaultWidth: 260,
    defaultHeight: 80,
    defaultColor: '#ef4444',
    previewIcon: 'thermometer',
    factoryItem: (id, x, y) => ({
      id,
      name: 'CPU Temp Angled Wing',
      type: 'shape_pod',
      shapeType: 'temp_wing_angled',
      x,
      y,
      width: 260,
      height: 80,
      sensorType: 'CPU TEMP',
      testValue: '61',
      unit: '°C',
      color: '#ef4444',
      scale: 1,
      icon: 'thermometer'
    })
  },
  {
    shapeType: 'voltage_wattage_banner',
    name: 'Chamfered Voltage & Power Banner',
    category: 'banner',
    description: 'Horizontal pill banner displaying Dual Power metrics (e.g. 1.260 V | 55.67 W) with chamfered sci-fi edges.',
    defaultWidth: 260,
    defaultHeight: 46,
    defaultColor: '#ef4444',
    previewIcon: 'zap',
    factoryItem: (id, x, y) => ({
      id,
      name: 'CPU Power & Voltage Banner',
      type: 'shape_pod',
      shapeType: 'voltage_wattage_banner',
      x,
      y,
      width: 260,
      height: 46,
      sensorType: 'POWER & VOLT',
      testValue: '1.260 V',
      secondaryValue: '55.67 W',
      unit: '',
      color: '#ef4444',
      scale: 1
    })
  },
  {
    shapeType: 'telemetry_slot_3',
    name: '3-Row Telemetry Stack',
    category: 'stack',
    description: 'Stacked 3-row sensor readout block with Clock MHz, Fan 1 RPM, and Fan 2/Pump RPM with spinning rotor icons.',
    defaultWidth: 220,
    defaultHeight: 120,
    defaultColor: '#ef4444',
    previewIcon: 'list',
    factoryItem: (id, x, y) => ({
      id,
      name: 'Fan & Clock Stack',
      type: 'shape_pod',
      shapeType: 'telemetry_slot_3',
      x,
      y,
      width: 220,
      height: 120,
      sensorType: 'SPEED & FANS',
      testValue: '4464 MHz',
      color: '#ef4444',
      scale: 1,
      shapeSlots: [
        { id: 's1', label: 'CLOCK', testValue: '4464', unit: 'MHz', icon: 'clock', color: '#ef4444' },
        { id: 's2', label: 'FAN 1', testValue: '1442', unit: 'RPM', icon: 'fan', color: '#ef4444' },
        { id: 's3', label: 'FAN 2', testValue: '2385', unit: 'RPM', icon: 'fan', color: '#ef4444' }
      ]
    })
  },
  {
    shapeType: 'ram_stick_module',
    name: 'RAM Stick Heat-Spreader Bar',
    category: 'memory',
    description: 'Bottom DDR4/DDR5 heat spreader module outline with memory utilization bar, Used MB, Clock MHz, and DDR speed.',
    defaultWidth: 640,
    defaultHeight: 60,
    defaultColor: '#ef4444',
    previewIcon: 'hard-drive',
    factoryItem: (id, x, y) => ({
      id,
      name: 'System RAM Module Bar',
      type: 'shape_pod',
      shapeType: 'ram_stick_module',
      x,
      y,
      width: 640,
      height: 60,
      sensorType: 'RAM & TIMINGS',
      testValue: '51%',
      secondaryValue: '16522 MB',
      tertiaryValue: '1776 MHz | DDR4-3552',
      unit: '%',
      color: '#ef4444',
      scale: 1
    })
  },
  {
    shapeType: 'network_transfer_pod',
    name: 'Network Download/Upload Pill',
    category: 'system',
    description: 'Header Network Traffic pill with Download speed, Total session transfer, and Upload speed.',
    defaultWidth: 320,
    defaultHeight: 70,
    defaultColor: '#06b6d4',
    previewIcon: 'wifi',
    factoryItem: (id, x, y) => ({
      id,
      name: 'Network Traffic Monitor',
      type: 'shape_pod',
      shapeType: 'network_transfer_pod',
      x,
      y,
      width: 320,
      height: 70,
      sensorType: 'NETWORK',
      testValue: '0.0 MB/s DL',
      secondaryValue: '174.0 GB TOT',
      tertiaryValue: '0.0 MB/s UL',
      unit: '',
      color: '#06b6d4',
      scale: 1
    })
  },
  {
    shapeType: 'disk_activity_pod',
    name: 'Storage Read/Write Pod',
    category: 'system',
    description: 'Center storage activity block with Read speed, Write speed, and Used storage readouts.',
    defaultWidth: 180,
    defaultHeight: 80,
    defaultColor: '#ef4444',
    previewIcon: 'database',
    factoryItem: (id, x, y) => ({
      id,
      name: 'Disk I/O Activity',
      type: 'shape_pod',
      shapeType: 'disk_activity_pod',
      x,
      y,
      width: 180,
      height: 80,
      sensorType: 'DISK I/O',
      testValue: '0.0 MB/s',
      secondaryValue: '0.6 MB/s',
      tertiaryValue: '680 GB',
      unit: '',
      color: '#ef4444',
      scale: 1
    })
  },
  {
    shapeType: 'fps_counter_badge',
    name: 'Central FPS Counter Stage',
    category: 'system',
    description: 'Prominent high-contrast digital RTSS FPS counter with glowing frame.',
    defaultWidth: 160,
    defaultHeight: 70,
    defaultColor: '#06b6d4',
    previewIcon: 'activity',
    factoryItem: (id, x, y) => ({
      id,
      name: 'RTSS Frame Rate Badge',
      type: 'shape_pod',
      shapeType: 'fps_counter_badge',
      x,
      y,
      width: 160,
      height: 70,
      sensorType: 'RTSS FPS',
      testValue: '144',
      unit: 'FPS',
      color: '#06b6d4',
      scale: 1,
      fontSize: 32
    })
  },
  {
    shapeType: 'avatar_stage_cutout',
    name: 'Avatar / Character Art Stage',
    category: 'visual',
    description: 'Center vertical mounting stage for character art, samurai girl portrait, or game logo cutout.',
    defaultWidth: 180,
    defaultHeight: 280,
    defaultColor: '#94a3b8',
    previewIcon: 'image',
    factoryItem: (id, x, y) => ({
      id,
      name: 'Center Art Cutout Stage',
      type: 'shape_pod',
      shapeType: 'avatar_stage_cutout',
      x,
      y,
      width: 180,
      height: 280,
      sensorType: 'ART CUTOUT',
      testValue: 'SAMURAI ART',
      unit: '',
      color: '#ffffff',
      scale: 1
    })
  },
  {
    shapeType: 'battery_indicator_pod',
    name: 'Battery / Power Segment Pod',
    category: 'system',
    description: 'Center battery cell icon with 5-segment charge gauge for laptops or portable HUDs.',
    defaultWidth: 160,
    defaultHeight: 40,
    defaultColor: '#f59e0b',
    previewIcon: 'battery',
    factoryItem: (id, x, y) => ({
      id,
      name: 'Power Level Pod',
      type: 'shape_pod',
      shapeType: 'battery_indicator_pod',
      x,
      y,
      width: 160,
      height: 40,
      sensorType: 'BATTERY',
      testValue: '100',
      unit: '%',
      color: '#f59e0b',
      scale: 1
    })
  },
  {
    shapeType: 'clock_date_pod',
    name: 'Time & Date Corner Box',
    category: 'system',
    description: 'Top-left digital system clock with 24h time and calendar date (e.g. 16:14  15/06/2026).',
    defaultWidth: 180,
    defaultHeight: 44,
    defaultColor: '#ffffff',
    previewIcon: 'clock',
    factoryItem: (id, x, y) => ({
      id,
      name: 'System Time & Date',
      type: 'shape_pod',
      shapeType: 'clock_date_pod',
      x,
      y,
      width: 180,
      height: 44,
      sensorType: 'TIME & DATE',
      testValue: '16:14  15/06/2026',
      unit: '',
      color: '#ffffff',
      scale: 1
    })
  },
  {
    shapeType: 'hardware_logo_badge',
    name: 'Hardware Logo Badge',
    category: 'banner',
    description: 'Top hardware badge container (e.g. AMD Ryzen 5 5600X, GeForce RTX 3070 Ti, AORUS Master).',
    defaultWidth: 160,
    defaultHeight: 40,
    defaultColor: '#ea580c',
    previewIcon: 'cpu',
    factoryItem: (id, x, y) => ({
      id,
      name: 'Ryzen Hardware Badge',
      type: 'shape_pod',
      shapeType: 'hardware_logo_badge',
      x,
      y,
      width: 160,
      height: 40,
      sensorType: 'CPU ID',
      testValue: 'ZEN • RYZEN 5 5600X',
      unit: '',
      color: '#ea580c',
      scale: 1
    })
  }
];

// Pre-assembled Complete Panel Templates
export interface Aida64PanelTemplate {
  id: string;
  name: string;
  resolutionId: string;
  width: number;
  height: number;
  description: string;
  category: 'gaming' | 'ultrawide' | 'aio' | 'compact';
  items: any[];
}

export const AIDA64_PANEL_TEMPLATES: Aida64PanelTemplate[] = [
  {
    id: 'template_clean_blank_1024_600',
    name: 'Clean Blank Layout Map (1024×600)',
    resolutionId: 'res_1024x600',
    width: 1024,
    height: 600,
    description: 'Empty clean blueprint canvas. Start from scratch by adding circular dial bezels and geometric value boxes.',
    category: 'gaming',
    items: []
  },
  {
    id: 'template_clean_dual_dials_map',
    name: 'Clean Dual Bezel Wireframe Map (1024×600)',
    resolutionId: 'res_1024x600',
    width: 1024,
    height: 600,
    description: 'Clean circular bezel outlines with nested geometric value boxes. Zero text/numbers—pure spatial map for AI chassis generation.',
    category: 'gaming',
    items: [
      // Left CPU Circle Bezel
      { id: 'cpu_circle_bezel', name: 'CPU Circle Bezel', type: 'dial', shapeType: 'dial_circle', x: 60, y: 150, width: 260, height: 260, sensorType: 'CPU BEZEL', testValue: '', unit: '', color: '#ef4444', scale: 1 },
      { id: 'cpu_box_clock', name: 'CPU Clock Box', type: 'value_box', shapeType: 'box_chamfer', boxShape: 'chamfer', x: 135, y: 220, width: 110, height: 42, sensorType: 'CPU CLOCK', testValue: '', unit: '', color: '#ef4444', scale: 1, zIndex: 20 },
      { id: 'cpu_box_temp', name: 'CPU Temp Box', type: 'value_box', shapeType: 'box_hexagon', boxShape: 'hexagon', x: 140, y: 280, width: 100, height: 44, sensorType: 'CPU TEMP', testValue: '', unit: '', color: '#ef4444', scale: 1, zIndex: 20 },

      // Right GPU Circle Bezel
      { id: 'gpu_circle_bezel', name: 'GPU Circle Bezel', type: 'dial', shapeType: 'dial_circle', x: 704, y: 150, width: 260, height: 260, sensorType: 'GPU BEZEL', testValue: '', unit: '', color: '#10b981', scale: 1 },
      { id: 'gpu_box_clock', name: 'GPU Clock Box', type: 'value_box', shapeType: 'box_chamfer', boxShape: 'chamfer', x: 779, y: 220, width: 110, height: 42, sensorType: 'GPU CLOCK', testValue: '', unit: '', color: '#10b981', scale: 1, zIndex: 20 },
      { id: 'gpu_box_temp', name: 'GPU Temp Box', type: 'value_box', shapeType: 'box_hexagon', boxShape: 'hexagon', x: 784, y: 280, width: 100, height: 44, sensorType: 'GPU TEMP', testValue: '', unit: '', color: '#10b981', scale: 1, zIndex: 20 },

      // Center Geometric Boxes
      { id: 'center_fps_box', name: 'FPS Badge Box', type: 'value_box', shapeType: 'box_pill', boxShape: 'pill', x: 442, y: 140, width: 140, height: 50, sensorType: 'FPS BADGE', testValue: '', unit: '', color: '#06b6d4', scale: 1 },
      { id: 'center_art_stage', name: 'Art Stage Cutout', type: 'shape_pod', shapeType: 'avatar_stage_cutout', x: 422, y: 220, width: 180, height: 260, sensorType: 'ART STAGE', testValue: '', unit: '', color: '#ffffff', scale: 1 }
    ]
  },
  {
    id: 'template_crimson_dual_dial_photo',
    name: '1024×600 Dual Dial Crimson HUD (Photo Reference)',
    resolutionId: 'res_1024x600',
    width: 1024,
    height: 600,
    description: 'Exact recreation of the reference photo: Top Clock & Network, Dual CPU/GPU Dials, Angled Temp Wings, Center 0 FPS & Art Cutout, and Bottom Vengeance RAM Module.',
    category: 'gaming',
    items: [
      // Top Row
      { id: 'top_clock', name: 'Clock & Date', type: 'shape_pod', shapeType: 'clock_date_pod', x: 40, y: 20, width: 160, height: 40, sensorType: 'CLOCK', testValue: '16:14  15/06/2026', unit: '', color: '#ffffff', scale: 1 },
      { id: 'top_cpu_badge', name: 'Ryzen 5 Badge', type: 'shape_pod', shapeType: 'hardware_logo_badge', x: 210, y: 20, width: 140, height: 40, sensorType: 'CPU ID', testValue: 'RYZEN 5 5600X', unit: '', color: '#ea580c', scale: 1 },
      { id: 'top_net', name: 'Network Transfer', type: 'shape_pod', shapeType: 'network_transfer_pod', x: 370, y: 15, width: 280, height: 60, sensorType: 'NET', testValue: '0.0 MB/s', secondaryValue: '174.0 GB', tertiaryValue: '0.0 MB/s', unit: '', color: '#06b6d4', scale: 1 },
      { id: 'top_hz', name: 'Refresh Rate', type: 'shape_pod', shapeType: 'hardware_logo_badge', x: 860, y: 20, width: 120, height: 40, sensorType: 'MONITOR', testValue: '144 HZ', unit: '', color: '#06b6d4', scale: 1 },

      // Left CPU Zone
      { id: 'cpu_banner', name: 'CPU Power Banner', type: 'shape_pod', shapeType: 'voltage_wattage_banner', x: 70, y: 120, width: 240, height: 40, sensorType: 'CPU POWER', testValue: '1.260 V', secondaryValue: '55.67 W', unit: '', color: '#ef4444', scale: 1 },
      { id: 'cpu_dial', name: 'CPU Dial Socket', type: 'dial', shapeType: 'dial_circle', x: 50, y: 180, width: 160, height: 160, sensorType: 'CPU %', testValue: '14', unit: '%', color: '#ef4444', scale: 1, gaugePercent: 14, bannerTitle: 'CPU' },
      { id: 'cpu_stack', name: 'CPU Speed Stack', type: 'shape_pod', shapeType: 'telemetry_slot_3', x: 220, y: 180, width: 140, height: 160, sensorType: 'CPU CLOCK & FANS', testValue: '4464 MHz', color: '#ef4444', scale: 1, shapeSlots: [
        { id: 'cs1', label: 'CLOCK', testValue: '4464', unit: 'MHz', icon: 'clock', color: '#ef4444' },
        { id: 'cs2', label: 'FAN 1', testValue: '1442', unit: 'RPM', icon: 'fan', color: '#ef4444' },
        { id: 'cs3', label: 'FAN 2', testValue: '2385', unit: 'RPM', icon: 'fan', color: '#ef4444' }
      ] },
      { id: 'cpu_temp_wing', name: 'CPU Temp Wing', type: 'shape_pod', shapeType: 'temp_wing_angled', x: 50, y: 360, width: 240, height: 75, sensorType: 'CPU TEMP', testValue: '61', unit: '°C', color: '#ef4444', scale: 1, icon: 'thermometer' },

      // Center Zone
      { id: 'center_fps', name: 'Center FPS Badge', type: 'shape_pod', shapeType: 'fps_counter_badge', x: 440, y: 110, width: 140, height: 60, sensorType: 'FPS', testValue: '0', unit: 'FPS', color: '#06b6d4', scale: 1, fontSize: 32 },
      { id: 'center_battery', name: 'Battery Bar', type: 'shape_pod', shapeType: 'battery_indicator_pod', x: 440, y: 180, width: 140, height: 35, sensorType: 'BATTERY', testValue: '85', unit: '%', color: '#ef4444', scale: 1 },
      { id: 'center_disk', name: 'Disk Activity', type: 'shape_pod', shapeType: 'disk_activity_pod', x: 440, y: 225, width: 140, height: 70, sensorType: 'DISK', testValue: '0.0 MB/s', secondaryValue: '0.6 MB/s', tertiaryValue: '680 GB', unit: '', color: '#ef4444', scale: 1 },
      { id: 'center_art', name: 'Samurai Art Stage', type: 'shape_pod', shapeType: 'avatar_stage_cutout', x: 330, y: 300, width: 140, height: 180, sensorType: 'ART', testValue: 'SAMURAI', unit: '', color: '#ffffff', scale: 1 },

      // Right GPU Zone
      { id: 'gpu_banner', name: 'GPU Power Banner', type: 'shape_pod', shapeType: 'voltage_wattage_banner', x: 710, y: 120, width: 240, height: 40, sensorType: 'GPU POWER', testValue: '0.806 V', secondaryValue: '80.95 W', unit: '', color: '#ef4444', scale: 1 },
      { id: 'gpu_dial', name: 'GPU Dial Socket', type: 'dial', shapeType: 'dial_circle', x: 690, y: 180, width: 160, height: 160, sensorType: 'GPU %', testValue: '18', unit: '%', color: '#ef4444', scale: 1, gaugePercent: 18, bannerTitle: 'GPU' },
      { id: 'gpu_stack', name: 'GPU Speed Stack', type: 'shape_pod', shapeType: 'telemetry_slot_3', x: 860, y: 180, width: 140, height: 160, sensorType: 'GPU CLOCK & FANS', testValue: '795 MHz', color: '#ef4444', scale: 1, shapeSlots: [
        { id: 'gs1', label: 'CLOCK', testValue: '795', unit: 'MHz', icon: 'clock', color: '#ef4444' },
        { id: 'gs2', label: 'FAN 1', testValue: '1039', unit: 'RPM', icon: 'fan', color: '#ef4444' },
        { id: 'gs3', label: 'FAN 2', testValue: '53', unit: 'RPM', icon: 'fan', color: '#ef4444' }
      ] },
      { id: 'gpu_temp_wing', name: 'GPU Temp Wing', type: 'shape_pod', shapeType: 'temp_wing_angled', x: 710, y: 360, width: 240, height: 75, sensorType: 'GPU TEMP', testValue: '49', unit: '°C', color: '#ef4444', scale: 1, icon: 'thermometer' },

      // Bottom RAM Row
      { id: 'bottom_ram', name: 'Vengeance RAM Module', type: 'shape_pod', shapeType: 'ram_stick_module', x: 70, y: 490, width: 880, height: 65, sensorType: 'RAM', testValue: '51%', secondaryValue: '16522 MB', tertiaryValue: '1776 MHz | DDR4-3552', unit: '%', color: '#ef4444', scale: 1 }
    ]
  },
  {
    id: 'template_1024_600_gaming',
    name: '1024×600 Dual Pod Gaming Station',
    resolutionId: 'res_1024x600',
    width: 1024,
    height: 600,
    description: 'Flagship 7-inch gaming panel featuring side-by-side 7-value CPU and GPU telemetry pods with center FPS & Memory monitors.',
    category: 'gaming',
    items: [
      { id: 'pod_cpu_main', name: 'CPU 7-Value Pod', type: 'telemetry_pod', x: 28, y: 50, width: 280, height: 380, sensorType: 'CPU POD', testValue: '67%', unit: '%', color: '#ef4444', scale: 1, podConfig: PRESET_TELEMETRY_PODS[0] },
      { id: 'center_fps', name: 'Central RTSS Frame Rate', type: 'value_box', x: 348, y: 60, width: 328, height: 110, sensorType: 'FPS', testValue: '165', unit: 'FPS', color: '#06b6d4', scale: 1, fontSize: 32 },
      { id: 'center_ram_bar', name: 'System RAM Utilisation Bar', type: 'linear_bar', x: 348, y: 190, width: 328, height: 44, sensorType: 'RAM %', testValue: '14.2 / 32 GB (44%)', unit: '', color: '#a855f7', scale: 1, gaugePercent: 44 },
      { id: 'center_fan_speeds', name: 'Cooling Fans RPM Matrix', type: 'value_box', x: 348, y: 250, width: 328, height: 180, sensorType: 'FANS', testValue: 'CPU Fan: 978 RPM\nAIO Pump: 2240 RPM\nGPU Fan: 1293 RPM\nChassis Front: 850 RPM', unit: '', color: '#10b981', scale: 1, fontSize: 13 },
      { id: 'pod_gpu_main', name: 'GPU 7-Value Pod', type: 'telemetry_pod', x: 716, y: 50, width: 280, height: 380, sensorType: 'GPU POD', testValue: '82%', unit: '%', color: '#10b981', scale: 1, podConfig: PRESET_TELEMETRY_PODS[1] },
      { id: 'bottom_storage_bar', name: 'M.2 NVMe I/O Status Bar', type: 'label', x: 28, y: 460, width: 968, height: 100, sensorType: 'STORAGE', testValue: 'M.2 NVMe #1: 3450 MB/s READ | 1280 MB/s WRITE (44°C)   •   M.2 NVMe #2: 0.0 MB/s READ | 0.0 MB/s WRITE (48°C)\nWAN IP: 84.70.176.134   •   LAN IP: 192.168.1.148   •   PCI-E 4.0 x16 @ 4.0 x16 Active Link', unit: '', color: '#ffffff', scale: 1, fontSize: 12 }
    ]
  },
  {
    id: 'template_1920_480_ultrawide',
    name: '1920×480 Ultrawide Bar Chassis Monitor',
    resolutionId: 'res_1920x480',
    width: 1920,
    height: 480,
    description: 'Elongated 8.8-inch screen layout with 3 horizontal pods (CPU, GPU, RAM) and central tactical gauges.',
    category: 'ultrawide',
    items: [
      { id: 'uw_cpu_pod', name: 'CPU Instrumentation Pod', type: 'telemetry_pod', x: 30, y: 40, width: 280, height: 380, sensorType: 'CPU POD', testValue: '54°C', unit: '', color: '#ef4444', scale: 1, podConfig: PRESET_TELEMETRY_PODS[0] },
      { id: 'uw_dial_center_1', name: 'CPU Speed Radial Dial', type: 'dial', x: 350, y: 70, width: 260, height: 260, sensorType: 'CPU CLOCK', testValue: '4796', unit: 'MHz', color: '#ef4444', scale: 1, gaugePercent: 78 },
      { id: 'uw_fps_box', name: 'Central FPS Display', type: 'value_box', x: 650, y: 120, width: 240, height: 160, sensorType: 'FPS', testValue: '144', unit: 'FPS', color: '#06b6d4', scale: 1, fontSize: 36 },
      { id: 'uw_dial_center_2', name: 'GPU Speed Radial Dial', type: 'dial', x: 930, y: 70, width: 260, height: 260, sensorType: 'GPU CLOCK', testValue: '1770', unit: 'MHz', color: '#10b981', scale: 1, gaugePercent: 65 },
      { id: 'uw_gpu_pod', name: 'GPU Instrumentation Pod', type: 'telemetry_pod', x: 1230, y: 40, width: 280, height: 380, sensorType: 'GPU POD', testValue: '58°C', unit: '', color: '#10b981', scale: 1, podConfig: PRESET_TELEMETRY_PODS[1] },
      { id: 'uw_mem_pod', name: 'Memory Instrumentation Pod', type: 'telemetry_pod', x: 1550, y: 40, width: 280, height: 380, sensorType: 'RAM POD', testValue: '14.2 GB', unit: '', color: '#a855f7', scale: 1, podConfig: PRESET_TELEMETRY_PODS[2] }
    ]
  },
  {
    id: 'template_480_480_aio',
    name: '480×480 AIO Cooler Round LCD Cap',
    resolutionId: 'res_480x480',
    width: 480,
    height: 480,
    description: 'Circular AIO water pump LCD display with prominent central CPU temperature dial and 4 corner stats.',
    category: 'aio',
    items: [
      { id: 'aio_hero_dial', name: 'Hero CPU Temp Radial Dial', type: 'dial', x: 70, y: 70, width: 340, height: 340, sensorType: 'CPU TEMP', testValue: '54', unit: '°C', color: '#ef4444', scale: 1, gaugePercent: 54 },
      { id: 'aio_pump_rpm', name: 'AIO Pump Speed', type: 'value_box', x: 30, y: 20, width: 140, height: 40, sensorType: 'PUMP', testValue: '2240 RPM', unit: '', color: '#06b6d4', scale: 1, fontSize: 11 },
      { id: 'aio_cpu_load', name: 'CPU Load %', type: 'value_box', x: 310, y: 20, width: 140, height: 40, sensorType: 'CPU %', testValue: '67 % LOAD', unit: '', color: '#ef4444', scale: 1, fontSize: 11 },
      { id: 'aio_gpu_temp', name: 'GPU Temp', type: 'value_box', x: 30, y: 420, width: 140, height: 40, sensorType: 'GPU TEMP', testValue: '58 °C GPU', unit: '', color: '#10b981', scale: 1, fontSize: 11 },
      { id: 'aio_fan_speed', name: 'Rad Fan Speed', type: 'value_box', x: 310, y: 420, width: 140, height: 40, sensorType: 'FAN', testValue: '978 RPM RAD', unit: '', color: '#f59e0b', scale: 1, fontSize: 11 }
    ]
  }
];


