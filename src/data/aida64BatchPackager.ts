export interface Aida64PackageOptions {
  prefix:string; folderName:string; manifestName:string;
  frameCount:number; startIndex:number; digits:number;
  includeManifest:boolean; includeConfig:boolean;
}
export interface PackageValidation {valid:boolean; errors:string[]; warnings:string[];}
export const DEFAULT_AIDA64_PACKAGE_OPTIONS:Aida64PackageOptions={
 prefix:'gauge',folderName:'AIDA64_Gauge_100_State',manifestName:'manifest.json',
 frameCount:100,startIndex:0,digits:3,includeManifest:true,includeConfig:true
};
export function expectedFrameNames(o:Aida64PackageOptions){
 return Array.from({length:o.frameCount},(_,i)=>`${o.prefix}_${String(o.startIndex+i).padStart(o.digits,'0')}.png`);
}
export function validatePackageNames(files:string[],o:Aida64PackageOptions):PackageValidation{
 const expected=expectedFrameNames(o),set=new Set(files),errors:string[]=[],warnings:string[]=[];
 expected.forEach(n=>{if(!set.has(n))errors.push(`Missing frame: ${n}`)});
 files.filter(n=>n.toLowerCase().endsWith('.png')).forEach(n=>{if(!expected.includes(n))warnings.push(`Unexpected PNG: ${n}`)});
 if(new Set(files).size!==files.length)errors.push('Duplicate filenames detected');
 return {valid:errors.length===0,errors,warnings};
}
export function createAida64PackageManifest(o:Aida64PackageOptions,files:string[]){
 return {format:'AIDA64-100-STATE',version:1,prefix:o.prefix,frameCount:o.frameCount,
 startIndex:o.startIndex,digits:o.digits,frames:files.filter(x=>x.endsWith('.png')).sort(),
 generatedAt:new Date().toISOString()};
}
export async function packageFramesAsZip(frames:{filename:string;blob:Blob}[],o:Aida64PackageOptions){
 const JSZipCtor=(globalThis as any).JSZip;
 if(!JSZipCtor) throw new Error('ZIP exporter requires JSZip to be available in the application bundle.');
 const zip=new JSZipCtor(),folder=zip.folder(o.folderName);
 if(!folder) throw new Error('Unable to create package folder');
 for(const f of frames) folder.file(f.filename,f.blob);
 const names=frames.map(f=>f.filename),check=validatePackageNames(names,o);
 if(!check.valid) throw new Error(check.errors.join('\n'));
 if(o.includeManifest) folder.file(o.manifestName,JSON.stringify(createAida64PackageManifest(o,names),null,2));
 if(o.includeConfig) folder.file('aida64-package.json',JSON.stringify(o,null,2));
 return zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});
}
