import React,{useState} from 'react';
import {Aida64PackageOptions,DEFAULT_AIDA64_PACKAGE_OPTIONS,validatePackageNames,packageFramesAsZip} from '../../data/aida64BatchPackager';

export function Aida64BatchPackager({frames}:{frames:{filename:string;blob:Blob}[]}){
 const [o,setO]=useState<Aida64PackageOptions>(DEFAULT_AIDA64_PACKAGE_OPTIONS);
 const [status,setStatus]=useState(''); const [busy,setBusy]=useState(false);
 const set=(k:keyof Aida64PackageOptions,v:any)=>setO(x=>({...x,[k]:v}));
 const validation=validatePackageNames(frames.map(f=>f.filename),o);
 async function run(){
  setBusy(true);setStatus('');
  try{
   const blob=await packageFramesAsZip(frames,o);
   const a=document.createElement('a');a.href=URL.createObjectURL(blob);
   a.download=`${o.folderName}.zip`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
   setStatus(`Package created: ${frames.length} frames`);
  }catch(e:any){setStatus(e?.message||'Packaging failed')}
  finally{setBusy(false)}
 }
 return <section className="aida64-batch-packager">
  <h3>AIDA64 Batch Package</h3>
  <label>Prefix <input value={o.prefix} onChange={e=>set('prefix',e.target.value)}/></label>
  <label>Folder <input value={o.folderName} onChange={e=>set('folderName',e.target.value)}/></label>
  <label>Start index <input type="number" value={o.startIndex} onChange={e=>set('startIndex',+e.target.value)}/></label>
  <label>Digits <input type="number" min="1" max="6" value={o.digits} onChange={e=>set('digits',+e.target.value)}/></label>
  <label><input type="checkbox" checked={o.includeManifest} onChange={e=>set('includeManifest',e.target.checked)}/> Include manifest</label>
  <label><input type="checkbox" checked={o.includeConfig} onChange={e=>set('includeConfig',e.target.checked)}/> Include package config</label>
  <p>{frames.length} frames loaded — {validation.valid?'sequence valid':'sequence has errors'}</p>
  {!validation.valid&&<pre>{validation.errors.join('\n')}</pre>}
  {validation.warnings.length>0&&<pre>{validation.warnings.join('\n')}</pre>}
  <button disabled={busy||!validation.valid||!frames.length} onClick={run}>{busy?'Packaging…':'Generate & Package AIDA64 ZIP'}</button>
  {status&&<p>{status}</p>}
 </section>
}
