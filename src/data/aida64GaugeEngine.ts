
export type GaugeMaterial =
  | 'clean'|'glass'|'acrylic'|'chrome'|'brushedMetal'|'carbon'
  | 'anodised'|'plastic'|'rubber'|'frosted'|'holographic'|'crt'|'lcd'|'oled'|'vfd'|'nixie';

export type GaugeDisplayType =
  | 'numeric'|'sevenSegment'|'dotMatrix'|'ticker'|'odometer'|'lcd'|'oled'|'vfd'|'nixie'
  | 'bar'|'vu'|'spectrum'|'matrix'|'radialHistogram'|'segmentedArc';

export type GaugeCurve =
  | 'linear'|'easeIn'|'easeOut'|'easeInOut'|'exponential'|'stepped'
  | 'threshold'|'warningRamp'|'spring'|'bounce';

export interface GaugeLight {
  id:string; enabled:boolean; x:number; y:number; z:number; angle:number;
  intensity:number; radius:number; colour:string; temperature:number;
}

export interface GaugeTimelineLayer {
  id:string; name:string; enabled:boolean; start:number; end:number;
  opacity:number; scale:number; x:number; y:number; rotation:number;
  blur:number; curve:GaugeCurve; colour?:string;
  shadow:boolean; glow:number; blendMode?:GlobalCompositeOperation;
}

export interface GaugePhysicalOptions {
  bevel:number; depth:number; innerShadow:number; edgeHighlight:number;
  perspectiveX:number; perspectiveY:number; perspectiveZ:number; cameraDistance:number;
  glassThickness:number; refraction:number; reflection:number;
  contactShadow:number; ambientOcclusion:number; roughness:number; metallic:number;
  textureScale:number; wear:number; scratches:number; dust:number; condensation:number;
  droplets:number; fingerprint:number; rust:number;
}

export interface GaugeNeedleOptions {
  counterweight:boolean; hub:boolean; bevel:number; reflection:number;
  glow:number; shadow:number; trail:number; motionBlur:number; ghosting:number;
  acceleration:number; overshoot:number; vibration:number;
  startupSweep:boolean; calibrationSweep:boolean;
}

export interface GaugeExportOptions {
  supersample:1|2|4|8; downsample:'nearest'|'bilinear'|'bicubic'|'lanczos';
  transparent:boolean; pngCompression:0|1|2|3|4|5|6|7|8|9;
  edgeCleanup:number; haloProtection:boolean; bloomProtection:boolean;
  seed:number; resolutionScale:number;
}

export interface GaugeEngineConfig {
  material:GaugeMaterial;
  display:GaugeDisplayType;
  layers:GaugeTimelineLayer[];
  lights:GaugeLight[];
  physical:GaugePhysicalOptions;
  needle:GaugeNeedleOptions;
  export:GaugeExportOptions;
  background:{ type:'solid'|'gradient'|'texture'|'carbon'|'brushedMetal'; textureScale:number; angle:number; };
  effects:{
    warningFlash:boolean; warningPulse:number; criticalStrobe:boolean;
    heat:number; electrical:number; particles:number; scan:number;
    glare:number; lensFlare:number; crtFlicker:number; dither:number;
  };
}

export const DEFAULT_GAUGE_ENGINE_CONFIG:GaugeEngineConfig={
  material:'clean', display:'numeric',
  layers:[], lights:[
    {id:'key',enabled:true,x:-.35,y:-.35,z:1,angle:35,intensity:1,radius:1,colour:'#ffffff',temperature:6500},
    {id:'fill',enabled:true,x:.35,y:-.1,z:.7,angle:145,intensity:.35,radius:.8,colour:'#4aa3ff',temperature:8000},
    {id:'rim',enabled:true,x:0,y:.45,z:.9,angle:180,intensity:.4,radius:.6,colour:'#ff3344',temperature:3200}
  ],
  physical:{bevel:.5,depth:.5,innerShadow:.35,edgeHighlight:.5,perspectiveX:0,perspectiveY:0,perspectiveZ:0,cameraDistance:2,
    glassThickness:.3,refraction:.08,reflection:.5,contactShadow:.5,ambientOcclusion:.35,roughness:.35,metallic:.5,
    textureScale:1,wear:0,scratches:0,dust:0,condensation:0,droplets:0,fingerprint:0,rust:0},
  needle:{counterweight:true,hub:true,bevel:.4,reflection:.35,glow:.7,shadow:.6,trail:.35,motionBlur:.25,ghosting:.2,
    acceleration:.5,overshoot:0,vibration:0,startupSweep:false,calibrationSweep:false},
  export:{supersample:2,downsample:'lanczos',transparent:false,pngCompression:6,edgeCleanup:.5,haloProtection:true,bloomProtection:true,seed:195,
    resolutionScale:1},
  background:{type:'gradient',textureScale:1,angle:90},
  effects:{warningFlash:false,warningPulse:.6,criticalStrobe:false,heat:.5,electrical:.25,particles:.25,scan:.2,glare:.25,lensFlare:.15,crtFlicker:.15,dither:.1}
};

export const GAUGE_DISPLAY_LIBRARY:GaugeDisplayType[]=
 ['numeric','sevenSegment','dotMatrix','ticker','odometer','lcd','oled','vfd','nixie',
  'bar','vu','spectrum','matrix','radialHistogram','segmentedArc'];

export const GAUGE_MATERIAL_LIBRARY:GaugeMaterial[]=
 ['clean','glass','acrylic','chrome','brushedMetal','carbon','anodised','plastic','rubber',
  'frosted','holographic','crt','lcd','oled','vfd','nixie'];

export const GAUGE_CURVE_LIBRARY:GaugeCurve[]=
 ['linear','easeIn','easeOut','easeInOut','exponential','stepped','threshold','warningRamp','spring','bounce'];

export function seededNoise(seed:number, index:number){
  let x=(seed^Math.imul(index+1,0x45d9f3b))|0;
  x=Math.imul(x^(x>>>16),0x45d9f3b); x=Math.imul(x^(x>>>16),0x45d9f3b);
  return ((x^(x>>>16))>>>0)/4294967295;
}

export function stateCurve(state:number, curve:GaugeCurve){
  const t=Math.max(0,Math.min(1,state/100));
  switch(curve){
    case 'easeIn': return t*t;
    case 'easeOut': return 1-(1-t)*(1-t);
    case 'easeInOut': return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
    case 'exponential': return t===0?0:Math.pow(2,10*(t-1));
    case 'stepped': return Math.round(t*10)/10;
    case 'threshold': return t<.75?0:(t-.75)/.25;
    case 'warningRamp': return t<.6?0:t<.8?(t-.6)/.2:1;
    case 'spring': return 1-Math.exp(-6*t)*Math.cos(12*t);
    case 'bounce': return t<.8?1-Math.pow(1-t/.8,2):Math.abs(Math.sin((t-.8)*Math.PI*7))*(1-t);
    default:return t;
  }
}
