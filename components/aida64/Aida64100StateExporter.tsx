import React,{useState} from 'react';
import {generate100StateImages,DEFAULT_STATE_EXPORT_OPTIONS,StateExportOptions} from '../../data/aida64100StateImageGenerator';

export function Aida64100StateExporter({renderFrame}:{renderFrame:(canvas:HTMLCanvasElement,value:number,index:number,seed:number)=>void}){
 const [o,setO]=useState<StateExportOptions>(DEFAULT_STATE_EXPORT_OPTIONS);
 const [progress,setProgress]=useState(0); const [busy,setBusy]=useState(false);
 const [frames,setFrames]=useState<any[]>([]);
 const set=(k:keyof StateExportOptions,v:any)=>setO(x=>({...x,[k]:v}));
 async function run(){setBusy(true);setProgress(0);try{const f=await generate100StateImages(renderFrame,o,(n,t)=>setProgress(Math.round(n/t*100)));setFrames(f)}finally{setBusy(false)}}
 return <section className="aida64-100-state-exporter">
  <h3>100-State Image Generator</h3>
  <label>Width <input type="number" value={o.width} onChange={e=>set('width',+e.target.value)}/></label>
  <label>Height <input type="number" value={o.height} onChange={e=>set('height',+e.target.value)}/></label>
  <label>Supersample <select value={o.supersample} onChange={e=>set('supersample',+e.target.value as any)}><option>1</option><option>2</option><option>4</option><option>8</option></select></label>
  <label>PNG compression <input type="number" min="0" max="9" value={o.pngCompression} onChange={e=>set('pngCompression',+e.target.value)}/></label>
  <label>Prefix <input value={o.prefix} onChange={e=>set('prefix',e.target.value)}/></label>
  <label><input type="checkbox" checked={o.transparent} onChange={e=>set('transparent',e.target.checked)}/> Transparent background</label>
  <button disabled={busy} onClick={run}>{busy?'Generating…':'Generate 100 PNG States'}</button>
  {busy&&<progress max="100" value={progress}/>}
  {frames.length>0&&<p>{frames.length} frames generated and ready for export.</p>}
 </section>
}
