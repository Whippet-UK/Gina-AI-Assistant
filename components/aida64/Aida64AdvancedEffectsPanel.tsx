import React from 'react';
import { AdvancedRenderEffects } from '../../data/aida64AdvancedRenderEffects';

export function Aida64AdvancedEffectsPanel({effects,onChange}:{effects:AdvancedRenderEffects;onChange:(e:AdvancedRenderEffects)=>void}){
 const set=(path:string,v:any)=>{const next=structuredClone(effects) as any;const parts=path.split('.');let o=next;for(let i=0;i<parts.length-1;i++)o=o[parts[i]];o[parts.at(-1)!]=v;onChange(next)};
 const n=(label:string,path:string,step=.01)=><label>{label}<input type="number" step={step} value={path.split('.').reduce((o,k)=>(o as any)[k],effects as any)} onChange={e=>set(path,+e.target.value)}/></label>;
 const b=(label:string,path:string)=><label><input type="checkbox" checked={path.split('.').reduce((o,k)=>(o as any)[k],effects as any)} onChange={e=>set(path,e.target.checked)}/>{label}</label>;
 return <section className="aida64-advanced-effects">
  <h3>Advanced Renderer Effects</h3>
  <fieldset><legend>3D / Lighting</legend>{n('X tilt','perspective.x',1)}{n('Y tilt','perspective.y',1)}{n('Camera distance','perspective.cameraDistance',10)}{n('Focal depth','perspective.focalDepth',10)}{n('Key intensity','lights.key.intensity')}{n('Fill intensity','lights.fill.intensity')}{n('Rim intensity','lights.rim.intensity')}{n('Colour temperature','lights.temperature',100)}{n('Bloom threshold','bloom.threshold')}{n('Bloom intensity','bloom.intensity')}</fieldset>
  <fieldset><legend>Glass / Materials</legend>{n('Reflection','glass.reflection')}{n('Refraction','glass.refraction')}{n('Condensation','glass.condensation')}{n('Droplets','glass.droplets')}{n('Dust','glass.dust')}{n('Scratches','glass.scratches')}{n('Fingerprints','glass.fingerprints')}{n('Metal roughness','metal.roughness')}{n('Metal anisotropy','metal.anisotropy')}</fieldset>
  <fieldset><legend>Needle</legend>{b('Counterweight','needle.counterweight')}{b('Hub','needle.hub')}{n('Bevel','needle.bevel')}{n('Reflection','needle.reflection')}{n('Motion blur','needle.motionBlur')}{n('Ghosting','needle.ghosting')}{n('Overshoot','needle.overshoot')}{n('Vibration','needle.vibration')}</fieldset>
  <fieldset><legend>Animation</legend>{b('Emergency flash','animation.emergencyFlash')}{b('Warning strobe','animation.warningStrobe')}{b('Critical pulse','animation.criticalPulse')}{b('Startup sweep','animation.startupSweep')}{n('LED failure','animation.ledFailure')}{n('Over-temperature glow','animation.overTempGlow')}{n('Electrical overload','animation.overload')}{n('Particle trail','animation.particleTrail')}</fieldset>
  <fieldset><legend>Export</legend>{n('PNG compression','export.pngCompression',1)}{n('Edge cleanup','export.edgeCleanup')}{b('Subpixel LED','export.subpixelLED')}{b('Transparent background','export.transparent')}{b('Halo protection','export.haloProtection')}{b('Bloom protection','export.bloomProtection')}</fieldset>
 </section>
}
