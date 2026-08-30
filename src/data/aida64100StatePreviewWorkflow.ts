import { StateExportFrame, StateExportOptions, generate100StateImages, createStateManifest } from './aida64100StateImageGenerator';

export interface PreviewWorkflowState {
 frames:StateExportFrame[];
 selected:number;
 playing:boolean;
 fps:number;
 rangeStart:number;
 rangeEnd:number;
 error?:string;
}

export function createPreviewWorkflowState(count=100):PreviewWorkflowState{
 return {frames:[],selected:0,playing:false,fps:30,rangeStart:0,rangeEnd:Math.max(0,count-1)};
}

export async function generateRange(
 renderFrame:(canvas:HTMLCanvasElement,value:number,index:number,seed:number)=>void,
 options:StateExportOptions,
 start:number,end:number,
 onProgress?:(done:number,total:number)=>void
){
 const total=Math.max(0,end-start+1), frames:StateExportFrame[]=[];
 const local={...options,frameCount:total,startIndex:start};
 return generate100StateImages((canvas,value,index,seed)=>{
   const global=start+index;
   const valueForGlobal=options.frameCount<=1?options.startIndex:global/(options.frameCount-1)*100;
   renderFrame(canvas,valueForGlobal,global,seed);
 },local,onProgress);
}

export function validateFrameSequence(frames:StateExportFrame[]){
 const errors:string[]=[];
 frames.forEach((f,i)=>{if(f.index!==i)errors.push(`Frame index mismatch at ${i}`);});
 for(let i=1;i<frames.length;i++) if(frames[i].index<=frames[i-1].index) errors.push('Frame ordering is not strictly increasing');
 return {valid:errors.length===0,errors};
}

export function buildExportManifest(frames:StateExportFrame[],options:StateExportOptions){
 return {...createStateManifest(frames,options),generatedAt:new Date().toISOString(),
 sequenceValidation:validateFrameSequence(frames)};
}
