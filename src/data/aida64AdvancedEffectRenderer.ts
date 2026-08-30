import { AdvancedRenderEffects } from './aida64AdvancedRenderEffects';
const clamp=(v:number,a=0,b=1)=>Math.max(a,Math.min(b,v));
function hex(c:string){const s=c.replace('#','');return [parseInt(s.slice(0,2),16),parseInt(s.slice(2,4),16),parseInt(s.slice(4,6),16)];}
function rgba(c:string,a:number){const [r,g,b]=hex(c);return `rgba(${r},${g},${b},${a})`;}
function noise(seed:number,x:number,y:number){let n=(seed+Math.imul(x+17,374761393)+Math.imul(y+31,668265263))|0;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
export function applyAdvancedEffects(ctx:CanvasRenderingContext2D,e:AdvancedRenderEffects,state:number,w:number,h:number,time=0){
 const cx=w/2,cy=h/2,R=Math.min(w,h)/2;
 if(e.perspective.enabled&&(e.perspective.x||e.perspective.y)){
   const px=e.perspective.x*.002,py=e.perspective.y*.002;
   ctx.transform(1,py,px,1,-cx*px,-cy*py);
 }
 if(e.lights.key.enabled||e.lights.fill.enabled||e.lights.rim.enabled){
   const add=(l:{enabled:boolean;colour:string;intensity:number;angle:number})=>{if(!l.enabled)return;const a=l.angle*Math.PI/180,x=cx+Math.cos(a)*R,y=cy+Math.sin(a)*R,g=ctx.createRadialGradient(x,y,0,cx,cy,R*1.5);g.addColorStop(0,rgba(l.colour,.16*l.intensity));g.addColorStop(1,'rgba(0,0,0,0)');ctx.save();ctx.globalCompositeOperation='screen';ctx.fillStyle=g;ctx.fillRect(0,0,w,h);ctx.restore();};
   add(e.lights.key);add(e.lights.fill);add(e.lights.rim);
 }
 if(e.glass.enabled&&e.glass.reflection>0){ctx.save();ctx.globalAlpha=e.glass.reflection;ctx.globalCompositeOperation='screen';ctx.fillStyle='rgba(255,255,255,.55)';ctx.beginPath();ctx.ellipse(cx-R*.18,cy-R*.38,R*.5,R*.12,-.45,0,Math.PI*2);ctx.fill();ctx.restore();}
 if(e.glass.enabled&&e.glass.condensation>0){ctx.save();for(let i=0;i<Math.floor(e.glass.condensation*35);i++){const x=noise(e.export.seed,i,1)*w,y=noise(e.export.seed,i,2)*h,r=1+noise(e.export.seed,i,3)*3;ctx.fillStyle='rgba(255,255,255,.10)';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}ctx.restore();}
 if(e.glass.enabled&&e.glass.dust>0){ctx.save();for(let i=0;i<Math.floor(e.glass.dust*120);i++){const x=noise(e.export.seed,i,4)*w,y=noise(e.export.seed,i,5)*h;ctx.fillStyle=`rgba(255,255,255,${.04+noise(e.export.seed,i,6)*.08})`;ctx.fillRect(x,y,1,1);}ctx.restore();}
 if(e.shadows.enabled){ctx.save();ctx.globalAlpha=e.shadows.opacity;ctx.shadowColor='#000';ctx.shadowBlur=e.shadows.blur;ctx.shadowOffsetX=e.shadows.offsetX;ctx.shadowOffsetY=e.shadows.offsetY;ctx.strokeStyle='rgba(0,0,0,.01)';ctx.beginPath();ctx.arc(cx,cy,R*.88,0,Math.PI*2);ctx.stroke();ctx.restore();}
 if(e.bloom.enabled&&e.bloom.intensity>0){ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=e.bloom.intensity*.16;ctx.filter=`blur(${e.bloom.radius}px)`;ctx.drawImage(ctx.canvas,0,0,w,h);ctx.restore();}
 if(e.animation.criticalPulse&&state>=90){ctx.save();ctx.globalAlpha=.08*(.5+.5*Math.sin(time/90));ctx.fillStyle='#ff2020';ctx.fillRect(0,0,w,h);ctx.restore();}
 if(e.animation.warningStrobe&&state>=75){ctx.save();ctx.globalAlpha=(time%500<80)?.12:0;ctx.fillStyle='#ffb000';ctx.fillRect(0,0,w,h);ctx.restore();}
 if(e.animation.emergencyFlash&&state>=95){ctx.save();ctx.globalAlpha=(time%400<100)?.18:0;ctx.fillStyle='#ff0000';ctx.fillRect(0,0,w,h);ctx.restore();}
 if(e.animation.overTempGlow>0){ctx.save();ctx.globalAlpha=e.animation.overTempGlow*clamp((state-70)/30)*.18;ctx.fillStyle='#ff4000';ctx.fillRect(0,0,w,h);ctx.restore();}
 if(e.animation.particleTrail>0){ctx.save();for(let i=0;i<20*e.animation.particleTrail;i++){const a=state/100*Math.PI*1.5-Math.PI*.75-(i*.04);const rr=R*.7+noise(e.export.seed,i,9)*R*.18;ctx.fillStyle='rgba(255,255,255,.2)';ctx.beginPath();ctx.arc(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr,1+noise(e.export.seed,i,10)*2,0,Math.PI*2);ctx.fill();}ctx.restore();}
}
