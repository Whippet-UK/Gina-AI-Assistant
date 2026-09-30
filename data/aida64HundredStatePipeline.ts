export interface GaugeStateFrame {
  index:number; value:number; t:number;
  easedValue:number; needleAngle:number; lightSweep:number;
  bloom:number; glow:number; fluidWave:number; crtPhase:number; noiseSeed:number;
}
export interface HundredStatePipelineConfig {
  frameCount:number; easing:'linear'|'smoothstep'|'easeInOutCubic'|'spring';
  startValue:number; endValue:number; durationMs:number;
  needleAcceleration:number; overshoot:number; vibration:number;
  lightSweepAmount:number; bloomAmount:number; fluidMotion:number;
  crtFlicker:number; seededNoise:number; seed:number;
}
const clamp=(v:number,a=0,b=1)=>Math.max(a,Math.min(b,v));
function ease(t:number,mode:HundredStatePipelineConfig['easing']){
  t=clamp(t);
  if(mode==='linear') return t;
  if(mode==='smoothstep') return t*t*(3-2*t);
  if(mode==='easeInOutCubic') return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  const s=Math.sin(t*Math.PI); return clamp(t+s*.08);
}
export function buildHundredStateFrames(c:HundredStatePipelineConfig):GaugeStateFrame[]{
 const count=Math.max(1,c.frameCount||100), frames:GaugeStateFrame[]=[];
 for(let i=0;i<count;i++){
  const t=count===1?0:i/(count-1), e=ease(t,c.easing);
  const value=c.startValue+(c.endValue-c.startValue)*e;
  const acceleration=Math.sin(t*Math.PI)*c.needleAcceleration;
  const overshoot=Math.sin(t*Math.PI*2)*c.overshoot;
  const vibration=Math.sin(t*Math.PI*18)*c.vibration*(1-Math.abs(2*t-1));
  frames.push({index:i,value,t,easedValue:clamp(value/100),
   needleAngle:-135+(270*clamp(value/100))+acceleration+overshoot+vibration,
   lightSweep:c.lightSweepAmount*e,
   bloom:c.bloomAmount*(.55+.45*Math.sin(t*Math.PI)),
   glow:c.bloomAmount*clamp(value/100),
   fluidWave:c.fluidMotion*Math.sin(t*Math.PI*2),
   crtPhase:c.crtFlicker*(i%8)/8,
   noiseSeed:(c.seed+i*2654435761)>>>0});
 }
 return frames;
}
export const DEFAULT_HUNDRED_STATE_PIPELINE:HundredStatePipelineConfig={
 frameCount:100,easing:'easeInOutCubic',startValue:0,endValue:100,durationMs:2500,
 needleAcceleration:.0,overshoot:.0,vibration:0,lightSweepAmount:1,bloomAmount:1,
 fluidMotion:1,crtFlicker:1,seededNoise:1,seed:1337
};
