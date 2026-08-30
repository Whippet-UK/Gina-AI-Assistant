export interface GpuRendererConfig {
 enabled:boolean;
 backend:'webgl2'|'canvas-fallback';
 antialias:boolean;
 premultipliedAlpha:boolean;
 transparent:boolean;
 supersample:1|2|4;
 exposure:number;
 toneMapping:'none'|'reinhard'|'aces';
 glassQuality:'off'|'basic'|'high';
 materialQuality:'off'|'basic'|'high';
 crtQuality:'off'|'basic'|'high';
 fluidQuality:'off'|'basic'|'high';
}
export const DEFAULT_GPU_RENDERER_CONFIG:GpuRendererConfig={
 enabled:true,backend:'webgl2',antialias:true,premultipliedAlpha:true,transparent:false,
 supersample:2,exposure:1,toneMapping:'aces',
 glassQuality:'high',materialQuality:'high',crtQuality:'high',fluidQuality:'basic'
};
