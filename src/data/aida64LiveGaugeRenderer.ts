import { GaugeFactoryAdvancedConfig, GaugeLayer, GaugeScale, WarningZone } from './aida64GaugeFactoryAdvanced';

export interface LiveGaugeRenderOptions {
  state:number;
  width:number;
  height:number;
  seed:number;
  pixelRatio?:number;
  background?:string;
}
const clamp=(v:number,a=0,b=1)=>Math.max(a,Math.min(b,v));
const deg=(v:number)=>v*Math.PI/180;
const seeded=(seed:number,n:number)=>{let x=(seed^Math.imul(n+1,0x9e3779b9))|0;x=Math.imul(x^(x>>>16),0x85ebca6b);x=Math.imul(x^(x>>>13),0xc2b2ae35);return ((x^(x>>>16))>>>0)/4294967295;};

export function mapScale(value:number,scale:GaugeScale){
 const t=clamp((value-scale.min)/(scale.max-scale.min||1));
 if(scale.type==='logarithmic') return Math.log10(1+9*t);
 if(scale.type==='exponential') return (Math.exp(3*t)-1)/(Math.exp(3)-1);
 if(scale.type==='custom'&&scale.customMap?.length){
   const m=scale.customMap, p=t*(m.length-1), i=Math.floor(p), f=p-i;
   return i>=m.length-1?m[m.length-1]:m[i]+(m[i+1]-m[i])*f;
 }
 return t;
}
export function colourRamp(value:number,stops:Array<{at:number;colour:string}>){
 if(!stops.length)return '#ffffff';
 const s=[...stops].sort((a,b)=>a.at-b.at);
 if(value<=s[0].at)return s[0].colour;
 if(value>=s[s.length-1].at)return s[s.length-1].colour;
 let a=s[0],b=s[1]; for(let i=1;i<s.length;i++){if(value<=s[i].at){a=s[i-1];b=s[i];break;}}
 const t=(value-a.at)/(b.at-a.at||1);
 const h=(c:string)=>{const x=c.replace('#','');return [parseInt(x.slice(0,2),16),parseInt(x.slice(2,4),16),parseInt(x.slice(4,6),16)]};
 const A=h(a.colour),B=h(b.colour);
 return '#'+A.map((x,i)=>Math.round(x+(B[i]-x)*t).toString(16).padStart(2,'0')).join('');
}
function roundedRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function renderScale(ctx:CanvasRenderingContext2D,cfg:GaugeFactoryAdvancedConfig,value:number,w:number,h:number){
 const g=cfg.geometry, cx=w/2,cy=h/2,R=Math.min(w,h)/2*g.outerRadius;
 for(const s of cfg.scales.filter(x=>x.enabled)){
   const start=deg(s.angleStart), span=deg(s.angleEnd-s.angleStart);
   for(let i=0;i<=s.majorTicks-1;i++){
     const t=i/(s.majorTicks-1||1),a=start+span*t, len=R*s.tickLength;
     ctx.save();ctx.translate(cx+Math.cos(a)*R,cy+Math.sin(a)*R);ctx.rotate(a+Math.PI/2);
     ctx.strokeStyle=s.colour;ctx.globalAlpha=s.opacity;ctx.lineWidth=Math.max(1,w*s.tickWidth);
     ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-len);ctx.stroke();ctx.restore();
     if(s.minorTicks>0&&i<s.majorTicks-1)for(let j=1;j<s.minorTicks;j++){
       const q=(i+j/s.minorTicks)/(s.majorTicks-1),aa=start+span*q;
       ctx.save();ctx.translate(cx+Math.cos(aa)*R,cy+Math.sin(aa)*R);ctx.rotate(aa+Math.PI/2);
       ctx.lineWidth=Math.max(.5,w*s.tickWidth*.55);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-len*.55);ctx.stroke();ctx.restore();
     }
   }
 }
}
function renderTrack(ctx:CanvasRenderingContext2D,cfg:GaugeFactoryAdvancedConfig,state:number,w:number,h:number){
 const g=cfg.geometry,cx=w/2,cy=h/2,R=Math.min(w,h)/2*g.outerRadius;
 ctx.save();ctx.lineCap='round';ctx.lineWidth=Math.max(2,w*g.thickness);
 ctx.strokeStyle='#303030';ctx.beginPath();ctx.arc(cx,cy,R,deg(g.angleStart),deg(g.angleEnd));ctx.stroke();
 const ramp=cfg.colourRamps.find(x=>x.id==='value')?.stops||[];
 ctx.strokeStyle=colourRamp(state,ramp);ctx.beginPath();ctx.arc(cx,cy,R,deg(g.angleStart),deg(g.angleStart+(g.angleEnd-g.angleStart)*state/100));ctx.stroke();ctx.restore();
 for(const z of cfg.warningZones.filter(x=>x.enabled)){const a=deg(g.angleStart+(g.angleEnd-g.angleStart)*z.from/100),b=deg(g.angleStart+(g.angleEnd-g.angleStart)*z.to/100);ctx.save();ctx.globalAlpha=z.opacity;ctx.strokeStyle=z.colour;ctx.lineWidth=Math.max(2,w*(z.outerRadius-z.innerRadius));ctx.beginPath();ctx.arc(cx,cy,R*((z.outerRadius+z.innerRadius)/2),a,b);ctx.stroke();ctx.restore();}
}
function renderNeedle(ctx:CanvasRenderingContext2D,cfg:GaugeFactoryAdvancedConfig,state:number,w:number,h:number){
 const g=cfg.geometry,cx=w/2,cy=h/2,R=Math.min(w,h)/2*g.outerRadius;
 const a=deg(g.angleStart+(g.angleEnd-g.angleStart)*state/100);
 ctx.save();ctx.translate(cx,cy);ctx.rotate(a);ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=7;
 ctx.fillStyle='#eeeeee';ctx.beginPath();ctx.moveTo(-w*.012,0);ctx.lineTo(w*.018,0);ctx.lineTo(w*.018,-R*.88);ctx.lineTo(0,-R*.96);ctx.lineTo(-w*.012,-R*.88);ctx.closePath();ctx.fill();
 ctx.shadowBlur=0;ctx.fillStyle='#202020';ctx.beginPath();ctx.arc(0,0,w*.045,0,Math.PI*2);ctx.fill();ctx.fillStyle='#bdbdbd';ctx.beginPath();ctx.arc(0,0,w*.025,0,Math.PI*2);ctx.fill();ctx.restore();
}
function renderPhysical(ctx:CanvasRenderingContext2D,cfg:GaugeFactoryAdvancedConfig,w:number,h:number){
 const cx=w/2,cy=h/2,R=Math.min(w,h)/2;
 const b=cfg.layers.find(l=>l.type==='background'), glass=cfg.layers.find(l=>l.id==='glass');
 if(b?.visible){ctx.fillStyle=b.colour;ctx.fillRect(0,0,w,h);}
 ctx.save();const gr=ctx.createRadialGradient(cx-R*.2,cy-R*.25,R*.05,cx,cy,R);gr.addColorStop(0,'rgba(255,255,255,.16)');gr.addColorStop(.55,'rgba(255,255,255,.02)');gr.addColorStop(1,'rgba(0,0,0,.28)');ctx.fillStyle=gr;ctx.fillRect(0,0,w,h);ctx.restore();
 ctx.save();ctx.lineWidth=w*.035;ctx.strokeStyle='#171717';ctx.shadowColor='rgba(0,0,0,.8)';ctx.shadowBlur=18;ctx.beginPath();ctx.arc(cx,cy,R*.91,0,Math.PI*2);ctx.stroke();ctx.restore();
 if(glass?.visible){ctx.save();ctx.globalAlpha=.10;ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(cx-R*.22,cy-R*.35,R*.42,R*.16,-.4,0,Math.PI*2);ctx.fill();ctx.restore();}
}
export function renderLiveGauge(canvas:HTMLCanvasElement,cfg:GaugeFactoryAdvancedConfig,opt:LiveGaugeRenderOptions){
 const dpr=opt.pixelRatio||window.devicePixelRatio||1,ctx=canvas.getContext('2d');if(!ctx)throw new Error('2D canvas unavailable');
 canvas.width=Math.round(opt.width*dpr);canvas.height=Math.round(opt.height*dpr);canvas.style.width=opt.width+'px';canvas.style.height=opt.height+'px';ctx.setTransform(dpr,0,0,dpr,0,0);
 const w=opt.width,h=opt.height;ctx.clearRect(0,0,w,h);if(opt.background){ctx.fillStyle=opt.background;ctx.fillRect(0,0,w,h);}
 renderPhysical(ctx,cfg,w,h);renderTrack(ctx,cfg,clamp(opt.state,0,100),w,h);renderScale(ctx,cfg,opt.state,w,h);renderNeedle(ctx,cfg,opt.state,w,h);
 const value=cfg.layers.find(l=>l.type==='value'),label=cfg.layers.find(l=>l.type==='label');
 const ramp=cfg.colourRamps.find(x=>x.id==='value')?.stops||[];
 ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
 if(value?.visible){ctx.fillStyle=colourRamp(opt.state,ramp);ctx.font=`700 ${Math.max(16,w*.10*value.scaleX)}px Arial`;ctx.fillText(String(Math.round(opt.state)),w/2+value.x*w,h/2+value.y*h);}
 if(label?.visible){ctx.fillStyle=label.colour;ctx.font=`600 ${Math.max(9,w*.035*label.scaleX)}px Arial`;ctx.fillText('VALUE',w/2+label.x*w,h/2+label.y*h);}
 ctx.restore();
}
