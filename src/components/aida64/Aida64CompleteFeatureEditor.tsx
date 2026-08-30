import React from 'react';
import { AIDA64_ALL_FEATURES, Aida64TimelineTrack, DEFAULT_AIDA64_TIMELINE } from '../../data/aida64CompleteFeatureRegistry';

export function Aida64CompleteFeatureEditor({enabled,onChange,timeline,onTimelineChange}:{
 enabled:Record<string,boolean>; onChange:(v:Record<string,boolean>)=>void;
 timeline?:Aida64TimelineTrack[]; onTimelineChange?:(v:Aida64TimelineTrack[])=>void;
}){
 const tracks=timeline||DEFAULT_AIDA64_TIMELINE;
 const toggle=(id:string)=>onChange({...enabled,[id]:enabled[id]===false});
 return <section className="aida64-complete-feature-editor">
  <h3>Complete Gauge Feature Engine</h3>
  <div className="aida64-feature-grid">
   {AIDA64_ALL_FEATURES.map(f=><label key={f.id}>
    <input type="checkbox" checked={enabled[f.id]!==false} onChange={()=>toggle(f.id)}/>
    {f.name}
   </label>)}
  </div>
  <h4>State Timeline</h4>
  {tracks.map((t,i)=><div key={t.featureId}>
   <b>{t.featureId}</b>
   <input type="checkbox" checked={t.enabled} onChange={e=>onTimelineChange?.(tracks.map((x,j)=>j===i?{...x,enabled:e.target.checked}:x))}/>
   {t.keyframes.map((k,j)=><span key={j} style={{marginLeft:8}}>S{k.state}: {k.value.toFixed(2)}</span>)}
  </div>)}
  <small>{AIDA64_ALL_FEATURES.length} feature modules • all state-aware • 10 curves supported</small>
 </section>
}
