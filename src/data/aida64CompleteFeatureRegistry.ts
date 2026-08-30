// Complete AIDA64 100-state feature registry.
// Each feature is independently addressable by the renderer/editor.
export type Aida64FeatureCategory =
  | 'perspective'|'glass'|'metal'|'environment'|'bezel'|'shadows'|'lighting'
  | 'needle'|'display'|'physical'|'illumination'|'export';

export interface Aida64Feature {
  id: string;
  name: string;
  category: Aida64FeatureCategory;
  implemented: boolean;
  rendererHook: string;
  stateAware: boolean;
}

export const AIDA64_ALL_FEATURES: Aida64Feature[] = [
  ['perspective3d','3D perspective controls','perspective','renderPerspective3D'],
  ['glassRealistic','Realistic glass','glass','renderGlass'],
  ['metalLighting','Anisotropic metal lighting','metal','renderMetalLighting'],
  ['environmentReflection','Procedural environment reflections','environment','renderEnvironmentReflection'],
  ['physicalBezelBuilder','Physical bezel builder','bezel','renderBezel'],
  ['shadowCatcher','Layer contact shadow catcher','shadows','renderShadowCatcher'],
  ['bloomThreshold','Brightness-threshold bloom','lighting','renderBloomThreshold'],
  ['colourTemperature','Independent colour temperature','lighting','renderColourTemperature'],
  ['multiLightStudio','Key/fill/rim studio lighting','lighting','renderMultiLightStudio'],
  ['animatedLightSweep','Animated light sweep','lighting','renderLightSweep'],
  ['needleCounterweight','Needle counterweight','needle','renderNeedleCounterweight'],
  ['needleHub','Needle hub/cap','needle','renderNeedleHub'],
  ['needleBevel','Needle bevel','needle','renderNeedleBevel'],
  ['needleReflection','Needle reflection','needle','renderNeedleReflection'],
  ['needleGlowFalloff','Needle glow falloff','needle','renderNeedleGlowFalloff'],
  ['needleAcceleration','Needle acceleration/deceleration','needle','renderNeedleAcceleration'],
  ['needleOvershoot','Needle overshoot/bounce','needle','renderNeedleOvershoot'],
  ['needleVibration','Mechanical needle vibration','needle','renderNeedleVibration'],
  ['needleShadow','Physical needle shadow','needle','renderNeedleShadow'],
  ['multiNeedle','Multiple independent needles','needle','renderMultiNeedle'],
  ['lcd','LCD display','display','renderLCD'],
  ['oled','OLED display','display','renderOLED'],
  ['vfd','VFD display','display','renderVFD'],
  ['nixie','Nixie-style display','display','renderNixie'],
  ['sevenSegment','Seven-segment display','display','renderSevenSegment'],
  ['dotMatrix','Dot-matrix display','display','renderDotMatrix'],
  ['flipOdometer','Flip/odometer display','display','renderFlipOdometer'],
  ['barGraph','Bar graph display','display','renderBarGraph'],
  ['vuMeter','VU meter','display','renderVUMeter'],
  ['spectrumAnalyser','Spectrum analyser','display','renderSpectrumAnalyser'],
  ['matrixDisplay','Matrix display','display','renderMatrixDisplay'],
  ['segmentedArc','Segmented arc display','display','renderSegmentedArc'],
  ['radialHistogram','Radial histogram display','display','renderRadialHistogram'],
  ['condensation','Glass condensation','physical','renderCondensation'],
  ['waterDroplets','Water droplets','physical','renderWaterDroplets'],
  ['glassDust','Dust on glass','physical','renderGlassDust'],
  ['scratches','Glass/metal scratches','physical','renderScratches'],
  ['fingerprint','Fingerprint/dirty glass','physical','renderFingerprint'],
  ['wornPaint','Worn paint','physical','renderWornPaint'],
  ['scratchedMetal','Scratched metal','physical','renderScratchedMetal'],
  ['rustWeathering','Rust/weathering','physical','renderRustWeathering'],
  ['carbonWeave','Carbon-fibre weave variation','physical','renderCarbonWeave'],
  ['plasticTexture','Plastic texture','physical','renderPlasticTexture'],
  ['rubberGasket','Rubber gasket','physical','renderRubberGasket'],
  ['screwsFasteners','Screws/fasteners','physical','renderScrews'],
  ['housingSeams','Housing seams','physical','renderHousingSeams'],
  ['redlineFlash','Emergency/redline flash','illumination','renderRedlineFlash'],
  ['warningStrobe','Warning strobe','illumination','renderWarningStrobe'],
  ['criticalPulse','Critical-value pulsing','illumination','renderCriticalPulse'],
  ['powerOnSequence','Power-on illumination sequence','illumination','renderPowerOn'],
  ['powerOffFade','Power-off fade','illumination','renderPowerOff'],
  ['startupSweep','Startup needle sweep','illumination','renderStartupSweep'],
  ['calibrationSweep','Needle calibration sweep','illumination','renderCalibrationSweep'],
  ['ledFailure','Seeded random LED failure','illumination','renderLEDFailure'],
  ['segmentFlicker','Segment flicker','illumination','renderSegmentFlicker'],
  ['overTemperature','Over-temperature glow','illumination','renderOverTemperature'],
  ['electricalOverload','Electrical overload effect','illumination','renderElectricalOverload'],
  ['supersampling','Supersampled rendering','export','renderSupersample'],
  ['downsamplingFilter','Selectable downsampling filter','export','renderDownsample'],
  ['vectorAntialias','Anti-aliased vector ticks','export','renderVectorAntialias'],
  ['subpixelLED','Subpixel LED rendering','export','renderSubpixelLED'],
  ['pngCompression','PNG compression controls','export','encodePNG'],
  ['transparentBackground','Transparent background','export','renderTransparent'],
  ['resolutionScale','2x/4x/8x export','export','renderResolutionScale'],
  ['seededNoise','Consistent seeded noise','export','renderSeededNoise'],
  ['edgeCleanup','Automatic edge cleanup','export','renderEdgeCleanup'],
  ['haloProtection','Halo clipping protection','export','renderHaloProtection'],
  ['bloomProtection','Bloom clipping protection','export','renderBloomProtection']
].map(([id,name,category,rendererHook])=>({id,name,category,implemented:true,rendererHook,stateAware:true} as Aida64Feature));

export const AIDA64_FEATURE_COUNT = AIDA64_ALL_FEATURES.length;

export interface Aida64TimelineKeyframe {
  state:number;
  value:number;
  curve:'linear'|'easeIn'|'easeOut'|'easeInOut'|'exponential'|'stepped'|'threshold'|'warningRamp'|'spring'|'bounce';
}

export interface Aida64TimelineTrack {
  featureId:string;
  enabled:boolean;
  keyframes:Aida64TimelineKeyframe[];
}

export const DEFAULT_AIDA64_TIMELINE: Aida64TimelineTrack[] = [
  {featureId:'animatedLightSweep',enabled:true,keyframes:[{state:0,value:0,curve:'easeInOut'},{state:100,value:1,curve:'easeInOut'}]},
  {featureId:'needleAcceleration',enabled:true,keyframes:[{state:0,value:0,curve:'easeOut'},{state:100,value:1,curve:'easeOut'}]},
  {featureId:'bloomThreshold',enabled:true,keyframes:[{state:0,value:0,curve:'warningRamp'},{state:100,value:1,curve:'warningRamp'}]},
  {featureId:'criticalPulse',enabled:true,keyframes:[{state:0,value:0,curve:'threshold'},{state:90,value:0,curve:'threshold'},{state:100,value:1,curve:'bounce'}]}
];
