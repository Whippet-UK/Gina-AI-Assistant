export interface StateExportOptions {
 frameCount:number;
 width:number;
 height:number;
 supersample:1|2|4|8;
 transparent:boolean;
 pngCompression:number;
 seed:number;
 prefix:string;
 startIndex:number;
 includeManifest:boolean;
}
export interface StateExportFrame {
 index:number;
 value:number;
 filename:string;
 blob:Blob;
}
export const DEFAULT_STATE_EXPORT_OPTIONS:StateExportOptions={
 frameCount:100,width:1024,height:1024,supersample:2,transparent:true,
 pngCompression:6,seed:1337,prefix:'gauge',startIndex:0,includeManifest:true
};

function canvasToBlob(canvas:HTMLCanvasElement,quality:number):Promise<Blob>{
 return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG export failed')),'image/png',Math.max(.1,Math.min(1,1-quality/10))));
}
export async function generate100StateImages(
 renderFrame:(canvas:HTMLCanvasElement,value:number,index:number,seed:number)=>void,
 options:StateExportOptions=DEFAULT_STATE_EXPORT_OPTIONS,
 onProgress?:(completed:number,total:number)=>void
):Promise<StateExportFrame[]>{
 const count=Math.max(1,options.frameCount|0),scale=options.supersample;
 const canvas=document.createElement('canvas');canvas.width=options.width*scale;canvas.height=options.height*scale;
 const ctx=canvas.getContext('2d')!;
 const frames:StateExportFrame[]=[];
 for(let i=0;i<count;i++){
   if(options.transparent)ctx.clearRect(0,0,canvas.width,canvas.height);
   else{ctx.save();ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.restore();}
   renderFrame(canvas,i/(count-1||1)*100,i,(options.seed+i*2654435761)>>>0);
   const blob=await canvasToBlob(canvas,options.pngCompression);
   const number=String(options.startIndex+i).padStart(3,'0');
   frames.push({index:i,value:i/(count-1||1)*100,filename:`${options.prefix}_${number}.png`,blob});
   onProgress?.(i+1,count);
 }
 return frames;
}
export function createStateManifest(frames:StateExportFrame[],options:StateExportOptions){
 return {version:1,frameCount:frames.length,width:options.width,height:options.height,
 supersample:options.supersample,transparent:options.transparent,seed:options.seed,
 frames:frames.map(f=>({index:f.index,value:f.value,filename:f.filename}))};
}
export async function downloadStateFrame(frame:StateExportFrame){
 const a=document.createElement('a');a.href=URL.createObjectURL(frame.blob);a.download=frame.filename;a.click();
 setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
