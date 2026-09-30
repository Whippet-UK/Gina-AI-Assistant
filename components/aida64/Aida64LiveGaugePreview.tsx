import React,{useEffect,useRef,useState} from 'react';
import { GaugeFactoryAdvancedConfig } from '../../data/aida64GaugeFactoryAdvanced';
import { renderLiveGauge } from '../../data/aida64LiveGaugeRenderer';

export function Aida64LiveGaugePreview({config}:{config:GaugeFactoryAdvancedConfig}){
 const ref=useRef<HTMLCanvasElement>(null),[state,setState]=useState(50),[playing,setPlaying]=useState(false);
 useEffect(()=>{if(!ref.current)return;renderLiveGauge(ref.current,config,{state,width:420,height:420,seed:1234});},[config,state]);
 useEffect(()=>{if(!playing)return;const id=setInterval(()=>setState(s=>s>=100?0:s+1),30);return()=>clearInterval(id)},[playing]);
 return <section className="aida64-live-preview">
  <h3>Live 0–100 Gauge Preview</h3><canvas ref={ref}/><div>
   <input aria-label="Gauge state" type="range" min="0" max="100" value={state} onChange={e=>setState(+e.target.value)}/>
   <output>{state}%</output><button onClick={()=>setPlaying(v=>!v)}>{playing?'Pause':'Play 100 States'}</button>
  </div>
 </section>
}
