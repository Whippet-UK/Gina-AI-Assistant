
import React from 'react';
import { GaugeEngineConfig, GAUGE_DISPLAY_LIBRARY, GAUGE_MATERIAL_LIBRARY, GAUGE_CURVE_LIBRARY } from '../../data/aida64GaugeEngine';

export function Aida64GaugeEngineEditor({config,onChange}:{config:GaugeEngineConfig;onChange:(c:GaugeEngineConfig)=>void}){
 const set=(patch:Partial<GaugeEngineConfig>)=>onChange({...config,...patch});
 const physical=(k:keyof GaugeEngineConfig['physical'],v:number)=>set({physical:{...config.physical,[k]:v}});
 const needle=(k:keyof GaugeEngineConfig['needle'],v:any)=>set({needle:{...config.needle,[k]:v}});
 const exp=(k:keyof GaugeEngineConfig['export'],v:any)=>set({export:{...config.export,[k]:v}});
 return <section className="aida64-gauge-engine-editor">
  <h3>Gauge Engine</h3>
  <label>Material <select value={config.material} onChange={e=>set({material:e.target.value as any})}>{GAUGE_MATERIAL_LIBRARY.map(x=><option key={x}>{x}</option>)}</select></label>
  <label>Display <select value={config.display} onChange={e=>set({display:e.target.value as any})}>{GAUGE_DISPLAY_LIBRARY.map(x=><option key={x}>{x}</option>)}</select></label>
  <fieldset><legend>3D / Physical</legend>
   {(['bevel','depth','innerShadow','edgeHighlight','glassThickness','refraction','reflection','contactShadow','ambientOcclusion','roughness','metallic','wear','scratches','dust','condensation','droplets','fingerprint','rust'] as const).map(k=>
    <label key={k}>{k}<input type="range" min="0" max="1" step=".01" value={config.physical[k]} onChange={e=>physical(k,+e.target.value)}/></label>)}
   <label>Perspective X <input type="range" min="-30" max="30" value={config.physical.perspectiveX} onChange={e=>physical('perspectiveX',+e.target.value)}/></label>
   <label>Perspective Y <input type="range" min="-30" max="30" value={config.physical.perspectiveY} onChange={e=>physical('perspectiveY',+e.target.value)}/></label>
  </fieldset>
  <fieldset><legend>Needle / Motion</legend>
   {(['bevel','reflection','glow','shadow','trail','motionBlur','ghosting','acceleration','overshoot','vibration'] as const).map(k=>
    <label key={k}>{k}<input type="range" min="0" max="1" step=".01" value={config.needle[k]} onChange={e=>needle(k,+e.target.value)}/></label>)}
   {(['counterweight','hub','startupSweep','calibrationSweep'] as const).map(k=>
    <label key={k}><input type="checkbox" checked={config.needle[k]} onChange={e=>needle(k,e.target.checked)}/>{k}</label>)}
  </fieldset>
  <fieldset><legend>Background / Lighting</legend>
   <select value={config.background.type} onChange={e=>set({background:{...config.background,type:e.target.value as any}})}>
    <option>solid</option><option>gradient</option><option>texture</option><option>carbon</option><option>brushedMetal</option>
   </select>
   {config.lights.map((l,i)=><div key={l.id}><b>{l.id}</b><input type="range" min="0" max="2" step=".01" value={l.intensity}
    onChange={e=>set({lights:config.lights.map((x,j)=>j===i?{...x,intensity:+e.target.value}:x)})}/></div>)}
  </fieldset>
  <fieldset><legend>100-State Effects</legend>
   {Object.entries(config.effects).map(([k,v])=><label key={k}>{k}<input type={typeof v==='boolean'?'checkbox':'range'} min="0" max="1" step=".01"
    checked={typeof v==='boolean'?v:undefined} value={typeof v==='boolean'?undefined:v}
    onChange={e=>set({effects:{...config.effects,[k]:typeof v==='boolean'?e.target.checked:+e.target.value}})}/></label>)}
  </fieldset>
  <fieldset><legend>Export</legend>
   <label>Supersample <select value={config.export.supersample} onChange={e=>exp('supersample',+e.target.value)}><option>1</option><option>2</option><option>4</option><option>8</option></select></label>
   <label>Seed <input type="number" value={config.export.seed} onChange={e=>exp('seed',+e.target.value)}/></label>
   <label>Transparent <input type="checkbox" checked={config.export.transparent} onChange={e=>exp('transparent',e.target.checked)}/></label>
  </fieldset>
  <small>All state-dependent effects are deterministic from the configured seed.</small>
 </section>
}
