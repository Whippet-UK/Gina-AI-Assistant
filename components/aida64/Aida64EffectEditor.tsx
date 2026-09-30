import React from 'react';
import { AIDA64_EFFECT_PRESETS, GAUGE_EFFECT_LIBRARY, GaugeEffectLayer, GaugeEffectPreset } from '../../data/aida64Effects';

export interface Aida64EffectEditorProps {
  layers: GaugeEffectLayer[];
  onChange: (layers: GaugeEffectLayer[]) => void;
  onPreset?: (preset: GaugeEffectPreset) => void;
}

export function Aida64EffectEditor({ layers, onChange, onPreset }: Aida64EffectEditorProps) {
  const update = (index:number, patch:Partial<GaugeEffectLayer>) =>
    onChange(layers.map((l,i)=>i===index?{...l,...patch}:l));

  return (
    <section className="aida64-effect-editor" aria-label="AIDA64 Effects">
      <div className="aida64-effect-presets">
        {AIDA64_EFFECT_PRESETS.map(p=>(
          <button key={p.id} type="button" onClick={()=>onPreset?.(p)} title={p.description}>{p.name}</button>
        ))}
      </div>
      <div className="aida64-effect-layers">
        {layers.map((l,i)=>(
          <div className="aida64-effect-layer" key={l.id}>
            <label><input type="checkbox" checked={l.enabled}
              onChange={e=>update(i,{enabled:e.target.checked})}/>{l.effect}</label>
            <input aria-label="Intensity" type="range" min="0" max="2" step=".01" value={l.intensity}
              onChange={e=>update(i,{intensity:+e.target.value})}/>
            <input aria-label="Opacity" type="range" min="0" max="1" step=".01" value={l.opacity}
              onChange={e=>update(i,{opacity:+e.target.value})}/>
            <input aria-label="Blur" type="range" min="0" max="100" value={l.blur}
              onChange={e=>update(i,{blur:+e.target.value})}/>
            <input aria-label="Radius" type="range" min="0" max="4" step=".01" value={l.radius}
              onChange={e=>update(i,{radius:+e.target.value})}/>
            <input aria-label="Angle" type="range" min="-180" max="180" value={l.angle}
              onChange={e=>update(i,{angle:+e.target.value})}/>
            <select value={l.curve} onChange={e=>update(i,{curve:e.target.value as GaugeEffectLayer['curve']})}>
              <option value="linear">Linear</option><option value="easeIn">Ease in</option>
              <option value="easeOut">Ease out</option><option value="easeInOut">Ease in/out</option>
              <option value="exponential">Exponential</option><option value="stepped">Stepped</option>
              <option value="threshold">Threshold</option><option value="warningRamp">Warning ramp</option>
            </select>
            <input aria-label="Start state" type="number" min="0" max="100" value={l.startState}
              onChange={e=>update(i,{startState:+e.target.value})}/>
            <input aria-label="End state" type="number" min="0" max="100" value={l.endState}
              onChange={e=>update(i,{endState:+e.target.value})}/>
            <input aria-label="Colour" type="text" value={l.colour||''} placeholder="#00ffff"
              onChange={e=>update(i,{colour:e.target.value||undefined})}/>
          </div>
        ))}
      </div>
      <small>{GAUGE_EFFECT_LIBRARY.length} effect modules available</small>
    </section>
  );
}
