export interface HardwareMetric { name: string; value: string; subtext: string; iconName: string; }
export interface SystemTelemetry { vramUsedMB: number; vramTotalMB: number; gpuTempC: number; cpuThreadsActive: number; cpuThreadsCap: number; ramUsedGB: number; ramTotalGB: number; ssdFreeGB: number; thermalBrakeActive: boolean; }
export interface RuleSafeguard { id: string; range: string; category: string; title: string; rules: string[]; severity: 'CRITICAL'|'HIGH'|'MEDIUM'|'STANDARD'; locked: boolean; }
export interface LifecyclePhase { phase: number; name: string; status: 'COMPLETED'|'IN_PROGRESS'|'PENDING'; details: string; }
export interface RestorePoint { id: string; label: string; description: string; timestamp: string; status: 'ACTIVE'|'LOCKED'|'PENDING'; }
export interface VerificationCheck { id: string; label: string; passed: boolean; details: string; }
export interface LogEntry { id: string; timestamp: string; level: 'INFO'|'WARN'|'SEC'|'RULE'; ruleId?: string; message: string; }

export interface SavedAsset {
  id: string;
  title: string;
  type: 'image'|'video'|'audio'|'lyrics'|'analysis'|'prompt';
  url?: string;
  textContent?: string;
  fileFormat: string;
  timestamp: string;
  promptUsed?: string;
  jobId?: string;
  workflowId?: string;
  seed?: number;
}

export interface ComfyErrorLog {
  id: string;
  timestamp: string;
  line: string;
  isOOM: boolean;
  nodeId?: string;
  nodeType?: string;
  jobId?: string;
}

export interface ComfyUiWorkflowConfig {
  workflowId: string;
  checkpointModel: string;
  positivePrompt: string;
  negativePrompt: string;
  samplerSteps: number;
  cfgScale: number;
  samplerName: string;
  scheduler: string;
  vaeModel: string;
  outputResolution: string;
  outputFormat: string;
}

export interface PromptStudioConfig {
  promptInput: string;
  negativePrompt?: string;
  targetNetwork: string;
  aspectRatio: string;
  stylePreset: string;
}

export interface AiStudioConfig {
  activeTab: 'creator'|'video'|'jobs'|'shorts'|'assets';
  workflowId: string;
  videoWorkflowId: string;
  defaultAspectRatio: '1:1'|'16:9'|'9:16'|'aida64'|'4:3'|'3:4';
}

export interface ActiveAida64LayoutData {
  screen: { width: number; height: number; label?: string };
  items: Aida64PanelItem[];
  themeId: string;
  timestamp?: string;
}

export interface FullProjectState {
  version: string;
  lastSavedTimestamp: string;
  activeSavePoint: string;
  comfyUiWorkflow: ComfyUiWorkflowConfig;
  promptStudio: PromptStudioConfig;
  aiStudio: AiStudioConfig;
  savedAssets: SavedAsset[];
  activeAida64Layout?: ActiveAida64LayoutData | null;
}

export interface PreWarmModelDef {
  id: string;
  name: string;
  filename: string;
  workflowId: string;
  type: 'image' | 'video' | 'shorts' | 'audio' | 'music';
  vramFootprintMB: number;
  description: string;
}

export interface ModelPreWarmState {
  activeModel: string | null;
  activeWorkflowId: string | null;
  status: 'idle' | 'warm' | 'cold' | 'unloaded' | 'switching';
  lastActionTimestamp: string;
  targetGpuCageMB: number;
  models: PreWarmModelDef[];
}

export interface Aida64ScreenPreset {
  id: string;
  label: string;
  width: number;
  height: number;
  diagonal: string;
  category: 'bar' | 'mini' | 'aio' | 'standard';
  description: string;
}

export interface Aida64DialSlot {
  id: string;
  label: string;
  icon: 'fan' | 'pump' | 'temp' | 'freq' | 'm2' | 'volt' | 'watt' | 'mem' | 'none';
  unit: string;
  type: 'pill' | 'banner' | 'hero' | 'tray';
}

export interface Aida64DialConfig {
  size: number;
  themeColor: string;
  accentColor: string;
  hasOuterLedTrack: boolean;
  heroType: 'circle' | 'chamfer' | 'square';
  bannerTitle: string;
  slots: Aida64DialSlot[];
  orientation: 'left' | 'right' | 'center';
}

export type Aida64GaugeStyle =
  | 'segmented_arc'
  | 'smooth_arc'
  | 'radial_ticks'
  | 'led_ladder'
  | 'dual_ring'
  | 'progress_ring'
  | 'digital_arc'
  | 'needle_gauge'
  | 'half_arc'
  | 'corner_gauge'
  | 'radar_tactical'
  | 'led_bar_h'
  | 'segment_bar_h'
  | 'thermal_bar_h'
  | 'industrial_bar_h'
  | 'segment_ladder_v'
  | 'thermal_bar_v'
  | 'radial_bar'
  | 'donut_meter'
  | 'speedometer_classic'
  | 'compass_ring'
  | 'cyber_hud_ring'
  | 'concentric_dual'
  | 'battery_bar_h'
  | 'vu_meter_h'
  | 'progress_bar_h'
  | 'industrial_meter_h'
  | 'ladder_vu_v'
  | 'thermometer_v'
  | 'seven_segment'
  | 'mechanical_dial'
  | 'radial_bars_true'
  | 'multi_ring_telemetry'
  | 'waveform_scope'
  | 'horizon_level'
  | 'compass_needle'
  | 'dot_matrix_ring'
  | 'battery_cells_v'
  | 'thermometer_bulb_v';

export interface Aida64GaugeSequenceConfig {
  frameCount: number;
  width: number;
  height: number;
  style: Aida64GaugeStyle;
  startAngleDeg: number;
  endAngleDeg: number;
  innerRadius: number;
  outerRadius: number;
  segmentCount: number;
  segmentGapDeg: number;
  primaryColor: string;
  warningColor: string;
  criticalColor: string;
  warningThreshold: number;
  criticalThreshold: number;
  trackColor: string;
  showTrack: boolean;
  glowIntensity: number;
  scale?: number;
  needleColor?: string;
  needleGlowEnabled?: boolean;
  needleGlowColor?: string;
  needleGlowRadius?: number;
  needleGlowIntensity?: number;
  needleGlowColorMode?: 'needle' | 'state' | 'custom';
  centerTextFormat?: 'percent' | 'value' | 'none';
  showCenterValue?: boolean;
  centerValueScale?: number;
  centerValueColor?: string;
  centerValueColorMode?: 'state' | 'custom';
  centerValueGlowEnabled?: boolean;
  centerValueGlowColor?: string;
  centerValueGlowRadius?: number;
  centerValueFontFamily?: 'digital' | 'monospace' | 'sans-serif';
  centerValueLcdGhost?: boolean;
  centerValueOffsetX?: number;
  centerValueOffsetY?: number;
  showMetricLabel?: boolean;
  metricLabel?: string;
  metricLabelScale?: number;
  metricLabelColor?: string;
  metricLabelColorMode?: 'state' | 'custom';
  metricLabelGlowEnabled?: boolean;
  metricLabelGlowColor?: string;
  metricLabelGlowRadius?: number;
  metricLabelFontFamily?: 'digital' | 'monospace' | 'sans-serif';
  metricLabelOffsetX?: number;
  metricLabelOffsetY?: number;
  metricUnit?: string;
  showSegmentNumbers?: boolean;
  segmentNumbersFormat?: '0-100' | '1-100' | 'step-10' | 'step-20' | 'step-25' | 'segments';
  segmentNumbersScale?: number;
  segmentNumbersOffset?: number;
  segmentNumbersColor?: string;
  segmentNumbersColorMode?: 'state' | 'custom' | 'track';
  segmentNumbersGlow?: boolean;
  segmentNumbersGlowColor?: string;
  secondaryValue?: number; // for dual_ring temp
  roundedEnds?: boolean;
  gapRotationDeg?: number;
  rotationDeg?: number;
  sweepAngleDeg?: number;
  colorMode?: 'single' | '2-color-gradient' | '3-color-gradient' | 'threshold';
  gradientColor1?: string;
  gradientColor2?: string;
  gradientColor3?: string;
  activeThickness?: number;
  activeOpacity?: number;
  trackThickness?: number;
  trackOpacity?: number;
  glowEnabled?: boolean;
  glowColor?: string;
  glowStrength?: number;
  lightingEnabled?: boolean;
  lightingMode?: 'neon' | 'bloom' | 'sci-fi' | 'industrial';
  lightingIntensity?: number;
  lightingRadius?: number;
  lightingBloom?: number;
  lightingCore?: boolean;
  lightingCoreIntensity?: number;
  lightingTrackGlow?: boolean;
  lightingPulse?: number;
  lightingColorMode?: 'state' | 'custom';
  lightingCustomColor?: string;
  materialStyle?: 'none' | 'glass' | 'acrylic' | 'brushed-metal' | 'chrome' | 'carbon-fibre' | 'anodized' | 'frosted' | 'holographic' | 'crt' | 'led' | 'liquid';
  materialOpacity?: number;
  materialHighlight?: number;
  glassReflection?: number;
  glassTint?: string;
  needleShadowEnabled?: boolean;
  needleTrailEnabled?: boolean;
  needleTrailLength?: number;
  needleTrailOpacity?: number;
  peakHoldEnabled?: boolean;
  peakHoldValue?: number;
  minimumMarkerEnabled?: boolean;
  minimumMarkerValue?: number;
  warningZoneEnabled?: boolean;
  warningZoneOpacity?: number;
  criticalZoneOpacity?: number;
  tickHighlightEnabled?: boolean;
  tickHighlightWidth?: number;
  scanlinesEnabled?: boolean;
  scanlineOpacity?: number;
  scanlineSpacing?: number;
  scanlineSoftness?: number;
  hudGridEnabled?: boolean;
  hudGridOpacity?: number;
  hudGridSize?: number;
  glitchEnabled?: boolean;
  glitchAmount?: number;
  chromaticEnabled?: boolean;
  chromaticAmount?: number;
  particleEnabled?: boolean;
  particleCount?: number;
  particleOpacity?: number;
  sparkEnabled?: boolean;
  sparkCount?: number;
  energyArcEnabled?: boolean;
  energyArcCount?: number;
  rotatingRingEnabled?: boolean;
  rotatingRingCount?: number;
  rotatingRingOpacity?: number;
  vignetteEnabled?: boolean;
  vignetteStrength?: number;
  grainEnabled?: boolean;
  grainAmount?: number;
  ambientLightEnabled?: boolean;
  ambientLightOpacity?: number;
  depthBlur?: number;
  effectCurve?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'exponential' | 'stepped' | 'threshold' | 'warning-ramp';
  effectEngineEnabled?: boolean; effectPreset?: string; effectIntensity?: number; effectQuality?: 'draft' | 'balanced' | 'high';
  depthEnabled?: boolean; depthAmount?: number; bevelAmount?: number; innerShadowAmount?: number;
  reflectionEnabled?: boolean; reflectionAmount?: number; parallaxEnabled?: boolean; parallaxAmount?: number;
  directionalLightEnabled?: boolean; directionalLightAngle?: number; directionalLightAmount?: number;
  lightSources?: Array<{color:string; angle:number; intensity:number; radius:number; enabled:boolean}>;
  dynamicShadowEnabled?: boolean; shadowAmount?: number; specularEnabled?: boolean; specularAmount?: number;
  liquidEnabled?: boolean; liquidAmount?: number; bubbleCount?: number; turbulenceAmount?: number;
  digitalDisplayMode?: 'none'|'seven-segment'|'dot-matrix'|'ticker'|'odometer'; digitalDisplayEnabled?: boolean;
  crtEnabled?: boolean; crtCurvature?: number; crtFlicker?: number; heatEnabled?: boolean; heatAmount?: number;
  electricalEnabled?: boolean; electricalAmount?: number; motionBlurEnabled?: boolean; motionBlurAmount?: number;
  ghostingEnabled?: boolean; ghostingAmount?: number; sweepEnabled?: boolean; sweepAmount?: number;
  ditherEnabled?: boolean; ditherAmount?: number; glareEnabled?: boolean; glareAmount?: number;
  lensFlareEnabled?: boolean; lensFlareAmount?: number; edgeGlowEnabled?: boolean; edgeGlowAmount?: number;
  ambientOcclusionEnabled?: boolean; ambientOcclusionAmount?: number;
  backgroundTexture?: 'none'|'noise'|'grid'|'carbon'|'brushed-metal'; backgroundTextureAmount?: number;
  gradientBackgroundEnabled?: boolean; gradientBackgroundStart?: string; gradientBackgroundEnd?: string; noiseResistance?: number;
}

export interface Aida64TelemetrySlot {
  id: string;
  label: string;
  sensorKey: string;
  testValue: string;
  unit: string;
  icon: 'cpu' | 'gpu' | 'temp' | 'fan' | 'clock' | 'volt' | 'watt' | 'mem' | 'm2' | 'net' | 'load' | 'none';
  color?: string;
  showMiniBar?: boolean;
}

export interface Aida64TelemetryPodConfig {
  id: string;
  podType: 'cpu' | 'gpu' | 'memory' | 'storage_net' | 'custom';
  title: string;
  subtitle: string;
  themeColor: string;
  accentColor: string;
  width: number;
  height: number;
  heroSensor: string;
  heroLabel: string;
  heroValue: string;
  heroUnit: string;
  heroPercent: number;
  showHeroGauge: boolean;
  slots: Aida64TelemetrySlot[];
}

export type Aida64ShapeType =
  | 'dial_circle'
  | 'dial_with_boxes'
  | 'box_rectangle'
  | 'box_chamfer'
  | 'box_hexagon'
  | 'box_pill'
  | 'box_bracket'
  | 'box_cut_corner'
  | 'temp_wing_angled'
  | 'voltage_wattage_banner'
  | 'telemetry_slot_3'
  | 'telemetry_slot_4'
  | 'ram_stick_module'
  | 'network_transfer_pod'
  | 'disk_activity_pod'
  | 'fps_counter_badge'
  | 'hardware_logo_badge'
  | 'avatar_stage_cutout'
  | 'battery_indicator_pod'
  | 'clock_date_pod'
  | 'linear_gauge_slot'
  | 'custom_shape_box';

export interface Aida64ShapeSlotItem {
  id: string;
  label: string;
  testValue: string;
  unit: string;
  icon?: string;
  color?: string;
  shapeType?: 'box_rectangle' | 'box_chamfer' | 'box_hexagon' | 'box_pill' | 'box_cut_corner';
}

export interface Aida64HardwareDevice {
  id: string;
  name: string;
  category: 'GPU' | 'CPU' | 'MEMORY' | 'MOTHERBOARD' | 'STORAGE' | 'COOLING' | 'NETWORK' | 'SYSTEM' | 'OTHER';
  sensorCount: number;
  sensors?: Array<{
    id: string;
    label: string;
    value: number;
    rawValue: string;
    unit: string;
    kind: string;
    updatedAt: string;
  }>;
}

export interface Aida64SensorBinding {
  sensorId: string;
  label: string;
  min: number;
  max: number;
  warning?: number;
  critical?: number;
  smoothingMs: number;
  peakHold: boolean;
  peakDecayMs: number;
  normalisation: 'linear' | 'inverse';
  staleTimeoutMs: number;
}

export interface Aida64PanelItem {
  id: string;
  name: string;
  type: 'dial' | 'value_box' | 'bar_graph' | 'label' | 'gauge_overlay' | 'linear_bar' | 'telemetry_pod' | 'sparkline' | 'panel_frame' | 'shape_pod';
  shapeType?: Aida64ShapeType;
  boxShape?: 'rectangle' | 'chamfer' | 'hexagon' | 'pill' | 'bracket' | 'cut_corner';
  x: number;
  y: number;
  width: number;
  height: number;
  sensorType: string;
  sensorBinding?: Aida64SensorBinding;
  testValue: string;
  unit?: string;
  color: string;
  scale?: number;
  locked?: boolean;
  fontSize?: number;
  textAlign?: 'left' | 'center' | 'right';
  bgColor?: string;
  borderColor?: string;
  opacity?: number;
  zIndex?: number;
  gaugePercent?: number;
  gaugeStyle?: Aida64GaugeStyle;
  gaugeConfig?: Partial<Aida64GaugeSequenceConfig>;
  podConfig?: Partial<Aida64TelemetryPodConfig>;
  shapeSlots?: Aida64ShapeSlotItem[];
  aspectRatioLocked?: boolean;
  icon?: string;
  isPlaceholderMask?: boolean;
  bannerTitle?: string;
  secondaryValue?: string;
  tertiaryValue?: string;
  renderMode?: 'clean_cavity' | 'sample_telemetry';
}

