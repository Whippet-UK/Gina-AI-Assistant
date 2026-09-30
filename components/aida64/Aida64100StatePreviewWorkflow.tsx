import React,{useEffect,useMemo,useState} from 'react';
import {PreviewWorkflowState,createPreviewWorkflowState,generateRange,validateFrameSequence} from '../../data/aida64100StatePreviewWorkflow';
import {DEFAULT_STATE_EXPORT_OPTIONS,StateExportOptions} from '../../data/aida64100StateImageGenerator';

export function Aida64100StatePreviewWorkflow({renderFrame}:{renderFrame:(canvas:HTMLCanvasElement,value:number,index:number,seed:number)=>void}){
 const [s,setS]=useState<PreviewWorkflowState>(()=>createPreviewWorkflowState(100));
 const [o,setO]=useState<StateExportOptions>(DEFAULT_STATE_EXPORT_OPTIONS);
 const [busy,setBusy]=useState(false);
 const set=(k:keyof StateExportOptions,v:any)=>setO(x=>({...x,[k]:v}));
 useEffect(()=>{if(!s.playing||!s.frames.length)return;const id=window.setInterval(()=>setS(x=>({...x,selected:(x.selected+1)%x.frames.length})),1000/Math.max(1,s.fps));return()=>clearInterval(id)},[s.playing,s.fps,s.frames.length]);
 const validation=useMemo(()=>validateFrameSequence(s.frames),[s.frames]);
 async function generate(){
  setBusy(true);setS(x=>({...x,error:undefined}));
  try{const frames=await generateRange(renderFrame,o,s.rangeStart,s.rangeEnd,(done,total)=>setS(x=>({...x,error:`Generating ${done}/${total}`})));setS(x=>({...x,frames,selected:0,error:undefined}))}
  catch(e:any){setS(x=>({...x,error:e?.message||'Generation failed'}))}
  finally{setBusy(false)}
 }
 async function downloadAll(){
  for(const f of s.frames){const a=document.createElement('a');a.href=URL.createObjectURL(f.blob);a.download=f.filename;a.click();await new Promise(r=>setTimeout(r,25));URL.revokeObjectURL(a.href)}
 }
 const selected=s.frames[s.selected];
 return <section className="aida64-100-state-preview">
  <h3>100-State Preview & Export</h3>
  <div className="aida64-preview-controls">
   <button onClick={()=>setS(x=>({...x,playing:!x.playing}))}>{s.playing?'Pause':'Play'}</button>
   <button onClick={()=>setS(x=>({...x,selected:Math.max(0,x.selected-1)}))}>◀</button>
   <button onClick={()=>setS(x=>({...x,selected:Math.min(Math.max(0,x.frames.length-1),x.selected+1)}))}>▶</button>
   <label>FPS <input type="number" min="1" max="120" value={s.fps} onChange={e=>setS(x=>({...x,fps:+e.target.value}))}/></label>
  </div>
  <div className="aida64-range-controls">
   <label>Start <input type="number" min="0" max={o.frameCount-1} value={s.rangeStart} onChange={e=>setS(x=>({...x,rangeStart:+e.target.value}))}/></label>
   <label>End <input type="number" min="0" max={o.frameCount-1} value={s.rangeEnd} onChange={e=>setS(x=>({...x,rangeEnd:+e.target.value}))}/></label>
   <button disabled={busy||s.rangeEnd<s.rangeStart} onClick={generate}>{busy?'Generating…':'Generate range'}</button>
   <button disabled={!s.frames.length||!validation.valid} onClick={downloadAll}>Export PNG sequence</button>
  </div>
  {selected&&<div className="aida64-selected-frame"><strong>Frame {selected.index}</strong> — {selected.value.toFixed(1)}%</div>}
  <div className="aida64-frame-strip">{s.frames.map((f,i)=><button key={f.filename} title={`${f.index}: ${f.value.toFixed(1)}%`} onClick={()=>setS(x=>({...x,selected:i}))} aria-label={`Select frame ${f.index}`}>{f.index+1}</button>)}</div>
  {s.error&&<div className="aida64-export-status">{s.error}</div>}
  {!validation.valid&&<div className="aida64-export-status">Sequence validation failed: {validation.errors.join('; ')}</div>}
 </section>
}
