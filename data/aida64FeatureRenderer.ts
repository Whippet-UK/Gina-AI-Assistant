import { Aida64Feature, Aida64TimelineTrack, Aida64TimelineKeyframe } from './aida64CompleteFeatureRegistry';

export interface Aida64RenderContext {
  ctx: CanvasRenderingContext2D;
  state: number;
  width: number;
  height: number;
  seed: number;
  pixelRatio: number;
  features: Record<string, boolean>;
  tracks: Aida64TimelineTrack[];
}

const clamp=(n:number,a=0,b=1)=>Math.max(a,Math.min(b,n));
const seeded=(seed:number,i:number)=>{let x=(seed^Math.imul(i+1,0x45d9f3b))|0;x=Math.imul(x^(x>>>16),0x45d9f3b);x=Math.imul(x^(x>>>16),0x45d9f3b);return ((x^(x>>>16))>>>0)/4294967295;};

export function timelineValue(track:Aida64TimelineTrack|undefined,state:number){
  if(!track||!track.enabled||!track.keyframes.length) return 0;
  const k=track.keyframes;
  if(state<=k[0].state)return k[0].value;
  if(state>=k[k.length-1].state)return k[k.length-1].value;
  let a=k[0],b=k[1];
  for(let i=1;i<k.length;i++){if(state<=k[i].state){a=k[i-1];b=k[i];break;}}
  const t=clamp((state-a.state)/(b.state-a.state));
  const c=a.curve;
  const f=c==='easeIn'?t*t:c==='easeOut'?1-(1-t)*(1-t):c==='easeInOut'?(t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2):c==='exponential'?(t===0?0:Math.pow(2,10*(t-1))):c==='stepped'?Math.round(t*10)/10:c==='threshold'?(t<.75?0:(t-.75)/.25):c==='warningRamp'?(t<.6?0:t<.8?(t-.6)/.2:1):c==='spring'?1-Math.exp(-6*t)*Math.cos(12*t):c==='bounce'?Math.abs(Math.sin(t*Math.PI*5))*(1-t)*.3+t:t;
  return a.value+(b.value-a.value)*f;
}

export function applyFeatureStack(base:CanvasRenderingContext2D,ctx:Aida64RenderContext){
  const {state,width,height,features,tracks}=ctx;
  const value=(id:string)=>timelineValue(tracks.find(t=>t.featureId===id),state);
  if(features.perspective3d){ base.save(); base.globalAlpha=.12; base.fillStyle='#ffffff'; base.fillRect(0,0,width,height); base.restore(); }
  if(features.ambientOcclusion||features.shadowCatcher){ base.save(); base.globalAlpha=.08; base.fillStyle='#000'; base.beginPath(); base.ellipse(width/2,height*.88,width*.38,height*.06,0,0,Math.PI*2); base.fill(); base.restore(); }
  if(features.bloomThreshold){ const b=value('bloomThreshold'); if(b>0){base.save();base.shadowBlur=18*b;base.shadowColor='rgba(255,255,255,.75)';base.globalAlpha=.18*b;base.strokeStyle='#fff';base.lineWidth=3;base.strokeRect(3,3,width-6,height-6);base.restore();}}
  if(features.animatedLightSweep){ const p=value('animatedLightSweep'); base.save();base.globalAlpha=.14;base.translate(width*p,height*.5);base.rotate(.15);const g=base.createLinearGradient(-width*.15,0,width*.15,0);g.addColorStop(0,'transparent');g.addColorStop(.5,'white');g.addColorStop(1,'transparent');base.fillStyle=g;base.fillRect(-width*.15,-height,width*.3,height*2);base.restore(); }
  if(features.seededNoise){ base.save();base.globalAlpha=.035;for(let i=0;i<Math.min(1500,width*height/40);i++){const x=seeded(ctx.seed,i)*width,y=seeded(ctx.seed,i+9000)*height;base.fillStyle=seeded(ctx.seed,i+17000)>.5?'#fff':'#000';base.fillRect(x,y,1,1);}base.restore(); }
  if(features.vignette){const g=base.createRadialGradient(width/2,height/2,Math.min(width,height)*.25,width/2,height/2,Math.max(width,height)*.65);g.addColorStop(0,'transparent');g.addColorStop(1,'rgba(0,0,0,.35)');base.save();base.fillStyle=g;base.fillRect(0,0,width,height);base.restore();}
}

export function applyStateIllumination(ctx:Aida64RenderContext){
  const {ctx:base,state,width,height,features}=ctx;
  const high=state/100;
  if(features.criticalPulse&&state>=90){base.save();base.globalAlpha=.12+high*.18;base.fillStyle=state>=97?'#ff2020':'#ff8c00';base.fillRect(0,0,width,height);base.restore();}
  if(features.warningStrobe&&state>=80&&state%4<2){base.save();base.globalAlpha=.08;base.fillStyle='#ff3300';base.fillRect(0,0,width,height);base.restore();}
  if(features.overTemperature&&state>=85){base.save();base.shadowBlur=20;base.shadowColor='#ff3300';base.globalAlpha=(state-85)/150;base.strokeStyle='#ff3300';base.lineWidth=5;base.strokeRect(4,4,width-8,height-8);base.restore();}
  if(features.electricalOverload&&state>=95){for(let i=0;i<4;i++){if(seeded(ctx.seed,state*7+i)>.45){base.save();base.globalAlpha=.5;base.strokeStyle='#fff';base.lineWidth=1+seeded(ctx.seed,i)*2;base.beginPath();base.moveTo(width*.7+i*7,height*.25);base.lineTo(width*.7+i*11,height*(.18+seeded(ctx.seed,i+40)*.2));base.stroke();base.restore();}}}
}
