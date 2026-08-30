import React from 'react';
import { GaugeFactoryAdvancedConfig, GaugeLayer, ADVANCED_FEATURES_69_100 } from '../../data/aida64GaugeFactoryAdvanced';

export function Aida64VisualLayerEditor({config,onChange}:{config:GaugeFactoryAdvancedConfig;onChange:(c:GaugeFactoryAdvancedConfig)=>void}){
 const updateLayer=(id:string,p:Partial<GaugeLayer>)=>onChange({...config,layers:config.layers.map(l=>l.id===id?{...l,...p}:l)});
 const move=(i:number,d:number)=>{const a=[...config.layers],j=i+d;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];onChange({...config,layers:a});};
 return <section className="aida64-visual-layer-editor">
  <h3>Visual Layer Editor</h3>
  {config.layers.map((l,i)=><div key={l.id} className="aida64-layer-row">
   <button onClick={()=>move(i,-1)} disabled={i===0}>↑</button><button onClick={()=>move(i,1)} disabled={i===config.layers.length-1}>↓</button>
   <input type="checkbox" checked={l.visible} onChange={e=>updateLayer(l.id,{visible:e.target.checked})}/>
   <strong>{l.name}</strong>
   <label>X <input type="number" step=".01" value={l.x} onChange={e=>updateLayer(l.id,{x:+e.target.value})}/></label>
   <label>Y <input type="number" step=".01" value={l.y} onChange={e=>updateLayer(l.id,{y:+e.target.value})}/></label>
   <label>Size <input type="number" step=".01" value={l.scaleX} onChange={e=>updateLayer(l.id,{scaleX:+e.target.value,scaleY:+e.target.value})}/></label>
   <label>Opacity <input type="range" min="0" max="1" step=".01" value={l.opacity} onChange={e=>updateLayer(l.id,{opacity:+e.target.value})}/></label>
   <input type="color" value={l.colour} onChange={e=>updateLayer(l.id,{colour:e.target.value})}/>
  </div>)}
  <h4>Advanced controls</h4><div>{ADVANCED_FEATURES_69_100.map(x=><span key={x}>{x}</span>)}</div>
 </section>
}
