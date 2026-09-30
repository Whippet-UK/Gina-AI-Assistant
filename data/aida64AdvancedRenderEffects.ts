export interface AdvancedRenderEffects {
 perspective:{enabled:boolean;x:number;y:number;z:number;cameraDistance:number;focalDepth:number};
 glass:{enabled:boolean;reflection:number;refraction:number;edgeThickness:number;condensation:number;droplets:number;dust:number;scratches:number;fingerprints:number};
 metal:{enabled:boolean;anisotropy:number;roughness:number;rotation:number};
 lights:{key:{enabled:boolean;colour:string;intensity:number;angle:number};fill:{enabled:boolean;colour:string;intensity:number;angle:number};rim:{enabled:boolean;colour:string;intensity:number;angle:number};ambientColour:string;ambientIntensity:number;temperature:number;sweep:number};
 shadows:{enabled:boolean;opacity:number;blur:number;offsetX:number;offsetY:number};
 bloom:{enabled:boolean;threshold:number;intensity:number;radius:number};
 needle:{counterweight:boolean;hub:boolean;bevel:number;reflection:number;glowFalloff:number;motionBlur:number;ghosting:number;overshoot:number;vibration:number;shadow:boolean};
 digital:{mode:'lcd'|'oled'|'vfd'|'nixie'|'sevenSegment'|'dotMatrix'|'flip'|'bar'|'vu'|'spectrum'|'matrix'|'segmentedArc'|'radialHistogram';flicker:number;pixelDither:number};
 physical:{wornPaint:number;scratchedMetal:number;rust:number;carbonVariation:number;plastic:number;rubberGasket:number;screws:boolean;seams:boolean};
 animation:{emergencyFlash:boolean;warningStrobe:boolean;criticalPulse:boolean;powerOn:number;powerOff:number;startupSweep:boolean;calibrationSweep:boolean;ledFailure:number;overTempGlow:number;overload:number;particleTrail:number};
 export:{supersample:1|2|4|8;downsample:'nearest'|'bilinear'|'bicubic'|'lanczos';subpixelLED:boolean;pngCompression:number;transparent:boolean;edgeCleanup:number;haloProtection:boolean;bloomProtection:boolean;seed:number};
}
export const DEFAULT_ADVANCED_RENDER_EFFECTS:AdvancedRenderEffects={
 perspective:{enabled:true,x:0,y:0,z:0,cameraDistance:800,focalDepth:500},
 glass:{enabled:true,reflection:.25,refraction:.03,edgeThickness:.04,condensation:0,droplets:0,dust:0,scratches:0,fingerprints:0},
 metal:{enabled:true,anisotropy:.35,roughness:.32,rotation:0},
 lights:{key:{enabled:true,colour:'#ffffff',intensity:1,angle:35},fill:{enabled:true,colour:'#7dd3fc',intensity:.25,angle:210},rim:{enabled:true,colour:'#60a5fa',intensity:.3,angle:140},ambientColour:'#ffffff',ambientIntensity:.18,temperature:6500,sweep:0},
 shadows:{enabled:true,opacity:.4,blur:8,offsetX:3,offsetY:5},
 bloom:{enabled:true,threshold:.78,intensity:.35,radius:8},
 needle:{counterweight:true,hub:true,bevel:.5,reflection:.15,glowFalloff:.7,motionBlur:0,ghosting:0,overshoot:0,vibration:0,shadow:true},
 digital:{mode:'sevenSegment',flicker:0,pixelDither:0},
 physical:{wornPaint:0,scratchedMetal:0,rust:0,carbonVariation:0,plastic:.2,rubberGasket:.2,screws:true,seams:true},
 animation:{emergencyFlash:false,warningStrobe:false,criticalPulse:false,powerOn:500,powerOff:500,startupSweep:true,calibrationSweep:false,ledFailure:0,overTempGlow:0,overload:0,particleTrail:0},
 export:{supersample:2,downsample:'lanczos',subpixelLED:true,pngCompression:6,transparent:false,edgeCleanup:.15,haloProtection:true,bloomProtection:true,seed:1337}
};
