export type GaugeGeometry = 'circle'|'semicircle'|'quarter'|'horizontal'|'vertical'|'customArc';
export type ScaleType = 'linear'|'logarithmic'|'exponential'|'custom';
export type LayerBlendMode = GlobalCompositeOperation|'normal';

export interface GaugeScale {
 id:string; enabled:boolean; type:ScaleType; min:number; max:number;
 angleStart:number; angleEnd:number; majorTicks:number; minorTicks:number; subMinorTicks:number;
 labelRadius:number; tickLength:number; tickWidth:number; colour:string; opacity:number; customMap?:number[];
}
export interface WarningZone { id:string; enabled:boolean; from:number; to:number; colour:string; opacity:number; innerRadius:number; outerRadius:number; }
export interface GaugeLayer {
 id:string; name:string; type:string; visible:boolean; x:number; y:number; z:number;
 width:number; height:number; rotation:number; opacity:number; scaleX:number; scaleY:number;
 skewX:number; skewY:number; colour:string; outlineColour:string; glowColour:string; blur:number;
 blendMode:LayerBlendMode; locked:boolean;
 state:{enabled:boolean; opacity:number; size:number; rotation:number; blur:number; colour:string; visibility:boolean};
 effects:string[];
}
export interface GaugeGeometryConfig {
 geometry:GaugeGeometry; innerRadius:number; outerRadius:number; angleStart:number; angleEnd:number;
 thickness:number; taperStart:number; taperEnd:number; customPath?:string;
}
export interface GaugeFactoryAdvancedConfig {
 geometry:GaugeGeometryConfig; scales:GaugeScale[]; warningZones:WarningZone[]; layers:GaugeLayer[];
 centreComposition:{value:boolean;label:boolean;unit:boolean;icon:boolean;secondaryValue:boolean;status:boolean};
 colourRamps:Array<{id:string;stops:Array<{at:number;colour:string}>}>;
 conditions:Array<{id:string;enabled:boolean;expression:string;effects:string[]}>;
 effectChains:Array<{id:string;name:string;enabled:boolean;effects:string[]}>;
}
export const ADVANCED_FEATURES_69_100 = [
  "arbitraryGaugeGeometry",
  "multipleScales",
  "nonlinearScales",
  "customTickGenerator",
  "customWarningZones",
  "segmentGaps",
  "variableWidthArcs",
  "splitGauges",
  "gaugeInGauge",
  "circularArcText",
  "customCentreComposition",
  "perLayerStateCurves",
  "perLayerAnimationTiming",
  "stateOpacity",
  "stateSize",
  "stateRotation",
  "stateColour",
  "stateBlurGlow",
  "stateVisibility",
  "conditionalTriggers",
  "customGradients",
  "valueDrivenColourRamps",
  "multipleColourStops",
  "separateFillOutlineGlow",
  "perComponentTransparency",
  "blendModes",
  "patternFills",
  "imageTextures",
  "svgVectorOverlays",
  "userEffectChains",
  "visualLayerEditor",
  "layerReordering",
  "layerLocking"
] as const;
export const AIDA64_ADVANCED_FEATURE_COUNT = ADVANCED_FEATURES_69_100.length;
