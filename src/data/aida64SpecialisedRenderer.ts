import { SpecialisedRendererPasses } from './aida64SpecialisedRendererPasses';
const clamp=(v:number,a=0,b=1)=>Math.max(a,Math.min(b,v));
const hash=(n:number)=>{n=(n^61)^(n>>>16);n=n+((n<<3)|0);n=n^(n>>>4);n=Math.imul(n,0x27d4eb2d);n=n^(n>>>15);return (n>>>0)/4294967295};

export function renderSpecialisedPasses(ctx:CanvasRenderingContext2D,p:SpecialisedRendererPasses,state:number,w:number,h:number,time=0){
 const cx=w/2,cy=h/2,R=Math.min(w,h)/2;
 // Glass: Fresnel-like edge response, thickness/refraction approximation and reflection.
 if(p.glass.enabled){
  ctx.save();
  if(p.glass.refraction>0){const g=ctx.createRadialGradient(cx,cy,R*.2,cx,cy,R);g.addColorStop(0,'rgba(255,255,255,.01)');g.addColorStop(.72,'rgba(255,255,255,.03)');g.addColorStop(1,`rgba(180,220,255,${p.glass.refraction*.18})`);ctx.fillStyle=g;ctx.fillRect(0,0,w,h);}
  if(p.glass.reflection>0){ctx.globalCompositeOperation='screen';ctx.globalAlpha=p.glass.reflection;ctx.fillStyle='rgba(255,255,255,.45)';ctx.beginPath();ctx.ellipse(cx-R*.2,cy-R*.42,R*.52,R*.12,-.45,0,Math.PI*2);ctx.fill();}
  ctx.globalCompositeOperation='screen';ctx.globalAlpha=p.glass.fresnel*.12;ctx.strokeStyle='rgba(190,230,255,.8)';ctx.lineWidth=Math.max(1,w*p.glass.thickness*.5);ctx.beginPath();ctx.arc(cx,cy,R*.9,0,Math.PI*2);ctx.stroke();ctx.restore();
 }
 // Brushed/anisotropic metal approximation with directional bands and edge wear.
 if(p.metal.enabled){
  ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=p.metal.environment*.22;
  const a=p.metal.anisotropyRotation*Math.PI/180,step=Math.max(2,Math.round(2+p.metal.roughness*5));
  ctx.translate(cx,cy);ctx.rotate(a);ctx.translate(-cx,-cy);
  for(let y=-R;y<R;y+=step){ctx.fillStyle=`rgba(255,255,255,${.02+p.metal.anisotropy*.035})`;ctx.fillRect(cx-R,cy+y,w,1);}
  ctx.restore();
  if(p.metal.edgeWear>0){ctx.save();ctx.globalAlpha=p.metal.edgeWear*.25;ctx.strokeStyle='#d7d7d7';ctx.lineWidth=1;ctx.beginPath();ctx.arc(cx,cy,R*.915,0,Math.PI*2);ctx.stroke();ctx.restore();}
 }
 // Fluid: clipped liquid body, meniscus, surface shine, bubbles and turbulence.
 if(p.fluid.enabled){
  const level=clamp(p.fluid.level);const top=cy+R*.72-R*1.44*level;
  ctx.save();ctx.beginPath();ctx.arc(cx,cy,R*.72,0,Math.PI*2);ctx.clip();
  const g=ctx.createLinearGradient(0,top,0,cy+R*.75);g.addColorStop(0,'rgba(80,170,255,.65)');g.addColorStop(1,'rgba(20,70,150,.8)');ctx.fillStyle=g;ctx.fillRect(cx-R,top,w,R*1.5);
  ctx.globalCompositeOperation='screen';ctx.globalAlpha=p.fluid.surfaceShine*.5;ctx.beginPath();ctx.ellipse(cx,top,R*.58,R*.025,0,0,Math.PI*2);ctx.fill();
  for(let i=0;i<Math.floor(p.fluid.bubbles*70);i++){const x=cx+(hash(i*19)-.5)*R*1.25,y=top+hash(i*37)*Math.max(1,cy+R*.7-top),rr=1+hash(i*71)*3;ctx.globalAlpha=.12+hash(i*91)*.18;ctx.beginPath();ctx.arc(x,y,rr,0,Math.PI*2);ctx.stroke();}
  ctx.restore();
  ctx.save();ctx.globalAlpha=p.fluid.meniscus*.7;ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,R*.72,-Math.PI*.8,-Math.PI*.2);ctx.stroke();ctx.restore();
 }
 // CRT: barrel/curvature approximation, scanlines, phosphor, flicker, ghosting and vignette.
 if(p.crt.enabled){
  ctx.save();
  if(p.crt.scanlines>0){ctx.globalAlpha=p.crt.scanlines*.22;ctx.fillStyle='#000';for(let y=0;y<h;y+=Math.max(2,p.crt.pixelSize*2))ctx.fillRect(0,y,w,1);}
  if(p.crt.phosphor>0){ctx.globalAlpha=p.crt.phosphor*.05;ctx.globalCompositeOperation='screen';ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);}
  if(p.crt.flicker>0){ctx.globalAlpha=p.crt.flicker*(.5+.5*Math.sin(time/37));ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);}
  if(p.crt.vignette>0){const g=ctx.createRadialGradient(cx,cy,R*.3,cx,cy,R);g.addColorStop(.65,'rgba(0,0,0,0)');g.addColorStop(1,`rgba(0,0,0,${p.crt.vignette})`);ctx.globalAlpha=1;ctx.fillStyle=g;ctx.fillRect(0,0,w,h);}
  ctx.restore();
 }
}
