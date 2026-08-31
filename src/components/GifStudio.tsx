import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Film, Upload, Play, Pause, Sparkles, SlidersHorizontal, Repeat2, Gauge, Thermometer,
  Cpu, Activity, Download, Type, Move, X, RefreshCw, CheckCircle2, AlertTriangle,
  ChevronDown, ChevronRight, FileVideo, Image as ImageIcon, Zap, Layers3, Clock3
} from 'lucide-react';
import { useGenerationJob } from '../context/GenerationJobContext';
import { SystemTelemetry } from '../types';

interface GifStudioProps {
  telemetry: SystemTelemetry;
  onAddLog: (level: 'INFO'|'WARN'|'SEC'|'RULE', message: string, ruleId?: string) => void;
  onClearCache?: () => void;
}

interface StudioAsset { id: string; name: string; path: string; kind: 'video'|'image'; bytes: number; createdAt: string; url?: string; }
interface NodeMeta { id: string; classType: string; inputs: Record<string, any>; status?: 'pending'|'running'|'done'; }

const clamp = (n:number, min:number, max:number) => Math.max(min, Math.min(max, n));

const withPreviewCacheBust = (url:string, token:string) => { if (!url) return url; try { const u = new URL(url, window.location.origin); u.searchParams.set('_gif_preview', token || String(Date.now())); return u.toString(); } catch { return url; } };

export const GifStudio: React.FC<GifStudioProps> = ({ telemetry, onAddLog }) => {
  const { job, output, outputLoading, submitting, startJob, cancelJob } = useGenerationJob();
  const [assets, setAssets] = useState<StudioAsset[]>([]);
  const [assetId, setAssetId] = useState('');
  const [sourceMode, setSourceMode] = useState<'asset'|'ltx'>('asset');
  const [prompt, setPrompt] = useState('A small cinematic mechanical dial rotating smoothly, clean studio lighting, subtle reflections');
  const [negativePrompt, setNegativePrompt] = useState('blurry, flicker, duplicate frames, warped geometry');
  const [ltxSteps, setLtxSteps] = useState(18);
  const [startFrame, setStartFrame] = useState(0);
  const [endFrame, setEndFrame] = useState(24);
  const [fps, setFps] = useState(25);
  const [smooth, setSmooth] = useState(false);
  const [rifeMultiplier, setRifeMultiplier] = useState(2);
  const [pingPong, setPingPong] = useState(false);
  const [loopCount, setLoopCount] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(30);
  const [durationMode, setDurationMode] = useState<'loop'|'continuous'>('loop');
  const [generationMode, setGenerationMode] = useState<'single'|'story'>('single');
  const [storyScenes, setStoryScenes] = useState<Array<{id:string; title:string; prompt:string; duration:number; transition:'cut'|'crossfade'|'hold'; continuity:boolean; reference:boolean; seedMode:'random'|'fixed'|'previous'; seed:number}>>([
    {id:'scene_1', title:'Scene 01', prompt:'', duration:5, transition:'cut', continuity:true, reference:true, seedMode:'random', seed:1},
    {id:'scene_2', title:'Scene 02', prompt:'', duration:5, transition:'cut', continuity:true, reference:true, seedMode:'random', seed:2},
    {id:'scene_3', title:'Scene 03', prompt:'', duration:5, transition:'cut', continuity:true, reference:true, seedMode:'random', seed:3}
  ]);
  const [activeSceneId, setActiveSceneId] = useState('scene_1');
  const [storyRife, setStoryRife] = useState<'off'|'2x'|'4x'>('off');
  const [storyAutoGenerate, setStoryAutoGenerate] = useState(true);
  const [storyKeepCharacter, setStoryKeepCharacter] = useState(true);
  const [storyKeepEnvironment, setStoryKeepEnvironment] = useState(true);
  const [storyKeepCamera, setStoryKeepCamera] = useState(true);
  const [storyUseFinalFrame, setStoryUseFinalFrame] = useState(true);
  const [storyReferenceStrength, setStoryReferenceStrength] = useState(1);
  const [storyReferenceNoise, setStoryReferenceNoise] = useState(0.15);
  const [storyRunning, setStoryRunning] = useState(false);
  const [compression, setCompression] = useState(50);
  const [memo, setMemo] = useState('');
  const [fontSize, setFontSize] = useState(42);
  const [strokeWidth, setStrokeWidth] = useState(6);
  const [textX, setTextX] = useState(50);
  const [textY, setTextY] = useState(88);
  const [textEnabled, setTextEnabled] = useState(false);
  const [activeNode, setActiveNode] = useState<string|null>(null);
  const [nodes, setNodes] = useState<NodeMeta[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [workflowJson, setWorkflowJson] = useState<any>(null);
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [showNodes, setShowNodes] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportUrls, setExportUrls] = useState<{gif?:string; mp4?:string}>({});
  const [previewFormat, setPreviewFormat] = useState<'gif'|'mp4'>('gif');
  const autoExportJobRef = useRef<string|null>(null);
  const [error, setError] = useState<string|null>(null);
  const [rifeAvailable, setRifeAvailable] = useState<boolean|null>(null);
  const [draggingText, setDraggingText] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement|null>(null);
  const previewVideoRef = useRef<HTMLVideoElement|null>(null);

  const storyTotalDuration = useMemo(() => storyScenes.reduce((sum, scene) => sum + Math.max(0.1, Number(scene.duration) || 0), 0), [storyScenes]);
  const activeScene = useMemo(() => storyScenes.find(s => s.id === activeSceneId) || storyScenes[0], [storyScenes, activeSceneId]);
  const updateScene = (id:string, patch:Partial<(typeof storyScenes)[number]>) => setStoryScenes(prev => prev.map(s => s.id === id ? {...s, ...patch} : s));
  const addScene = () => { const id=`scene_${Date.now()}`; setStoryScenes(prev=>[...prev,{id,title:`Scene ${String(prev.length+1).padStart(2,'0')}`,prompt:'',duration:5,transition:'cut',continuity:true,reference:true,seedMode:'random',seed:Math.floor(Math.random()*1e9)}]); setActiveSceneId(id); };
  const duplicateScene = (scene:(typeof storyScenes)[number]) => { const id=`scene_${Date.now()}`; setStoryScenes(prev=>{ const i=prev.findIndex(s=>s.id===scene.id); const copy={...scene,id,title:`${scene.title} COPY`,seed:Math.floor(Math.random()*1e9)}; return [...prev.slice(0,i+1),copy,...prev.slice(i+1)]; }); setActiveSceneId(id); };
  const removeScene = (id:string) => setStoryScenes(prev=>prev.length<=1 ? prev : prev.filter(s=>s.id!==id));

  const activeAsset = useMemo(() => assets.find(a => a.id === assetId) || null, [assets, assetId]);
  const isGifJob = job?.workflowId === 'gif_studio' || job?.workflowId === 'gif_story';
  // Directly preview ComfyUI/LTX output; ADOPT is optional and is not required just to see it.
  const mediaOutputs = (output?.outputs || []).filter((o:any) => {
    const filename = String(o?.file?.filename || '');
    const mime = String(o?.file?.mime || o?.mime || '').toLowerCase();
    return /\.(gif|mp4|webm|mov|mkv|avi|webp)(\?|$)/i.test(filename) || mime.startsWith('video/') || mime === 'image/gif' || mime === 'image/webp';
  });
  const activeOutput = mediaOutputs.find((o:any) => {
    const filename = String(o?.file?.filename || '').toLowerCase();
    const mime = String(o?.file?.mime || o?.mime || '').toLowerCase();
    return previewFormat === 'gif' ? filename.endsWith('.gif') || mime === 'image/gif' : /\.(mp4|webm|mov|mkv|avi)$/i.test(filename) || mime.startsWith('video/');
  }) || mediaOutputs[0] || output?.outputs?.[0];
  const activeOutputUrl = activeOutput?.url ? withPreviewCacheBust(activeOutput.url, output?.job?.id || job?.id || '') : '';
  const sourceUrl = (previewFormat === 'mp4' ? exportUrls.mp4 : exportUrls.gif) || activeOutputUrl || activeAsset?.url || '';
  const previewIsVideo = /\.(mp4|webm|mov|mkv|avi)(\?|$)/i.test(sourceUrl) || String(activeOutput?.file?.mime || '').toLowerCase().startsWith('video/');

  const loadAssets = async () => {
    try {
      const r = await fetch('/api/gif-studio/assets', { cache:'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setAssets(Array.isArray(d.assets) ? d.assets : []);
      if (!assetId && d.assets?.[0]) setAssetId(d.assets[0].id);
    } catch (e:any) { setError(e?.message || 'Unable to read GIF Studio media library'); }
  };

  useEffect(() => { void loadAssets(); fetch('/api/gif-studio/capabilities',{cache:'no-store'}).then(r=>r.json()).then(d=>setRifeAvailable(Boolean(d?.capabilities?.rife))).catch(()=>setRifeAvailable(null)); }, []);

  useEffect(() => {
    if (!job?.id || !['gif_studio','gif_story'].includes(job.workflowId)) return;
    const poll = async () => {
      try {
        const [h, d] = await Promise.all([
          fetch(`/api/jobs/${encodeURIComponent(job.id)}/history`, {cache:'no-store'}),
          fetch(`/api/jobs/${encodeURIComponent(job.id)}/debug`, {cache:'no-store'})
        ]);
        if (h.ok) {
          const data = await h.json();
          const hist = Array.isArray(data.history) ? data.history : [];
          setEvents(hist.slice(-80).reverse());
          const current = data.job?.currentNodeId ?? job.currentNodeId ?? null;
          setActiveNode(current);
          const nodeMeta = Array.isArray(data.job?.parameters?.__nodeMeta) ? data.job.parameters.__nodeMeta : [];
          setNodes(nodeMeta.map((n:any) => ({...n, status: n.id === current ? 'running' : hist.some((e:any)=>e.event==='node_executed' && e.payload?.node === n.id) ? 'done' : 'pending'})));
          if (data.job?.parameters?.__workflowSnapshot) setWorkflowJson(data.job.parameters.__workflowSnapshot);
          if (data.job?.status === 'COMPLETED' && data.job?.id && data.job?.workflowId === 'gif_studio') void autoFinalize(data.job.id);
        }
      } catch {}
    };
    void poll();
    const timer = window.setInterval(poll, 650);
    return () => window.clearInterval(timer);
  }, [job?.id, job?.workflowId, job?.currentNodeId]);

  // When an LTX job completes, switch the player to its actual output in GIF Studio.
  useEffect(() => {
    if (job?.workflowId !== 'ltx_video' || job.status !== 'COMPLETED' || !activeOutputUrl) return;
    const name = String(activeOutput?.file?.filename || '');
    setPreviewFormat(/\.(mp4|webm|mov|mkv|avi)(\?|$)/i.test(name) || String(activeOutput?.file?.mime || '').toLowerCase().startsWith('video/') ? 'mp4' : 'gif');
  }, [job?.workflowId, job?.status, activeOutputUrl]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current; const ctx = canvas.getContext('2d'); if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);
    if (!textEnabled || !memo.trim()) return;
    ctx.font = `700 ${fontSize}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = strokeWidth; ctx.strokeStyle = 'black'; ctx.fillStyle = 'white';
    const x = w * clamp(textX,0,100)/100; const y = h * clamp(textY,0,100)/100;
    ctx.strokeText(memo.trim(), x, y); ctx.fillText(memo.trim(), x, y);
  }, [memo, fontSize, strokeWidth, textX, textY, textEnabled]);

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    const batchId = files.length > 1 ? `batch_${Date.now()}_${Math.random().toString(36).slice(2,7)}` : '';
    for (const file of Array.from(files)) {
      const ext = file.name.toLowerCase().split('.').pop() || '';
      const allowed = ['mp4','mov','webm','mkv','png','jpg','jpeg','webp','bmp'];
      if (!allowed.includes(ext)) continue;
      try {
        const response = await fetch('/api/gif-studio/upload', {
          method:'POST', headers:{'Content-Type': file.type || 'application/octet-stream', 'X-Gina-Filename': encodeURIComponent(file.name), 'X-Gina-Mime': file.type || '', ...(batchId ? {'X-Gina-Batch': batchId} : {})},
          body:file
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || `Upload failed (${response.status})`);
      } catch (e:any) { setError(e?.message || 'Upload failed'); }
    }
    await loadAssets();
  };

  const submit = async () => {
    setError(null); setExportUrls({});
    if (sourceMode === 'asset' && !activeAsset) { setError('Select an MP4/MOV or image sequence first.'); return; }
    if (sourceMode === 'asset' && !activeAsset?.path) { setError('Selected asset has no local path.'); return; }
    if (endFrame < startFrame) { setError('End frame must be greater than or equal to start frame.'); return; }
    const params = {
      generationMode,
      story: generationMode==='story' ? { scenes: storyScenes, totalDurationSeconds: storyTotalDuration, useFinalFrame: storyUseFinalFrame, keepCharacter: storyKeepCharacter, keepEnvironment: storyKeepEnvironment, keepCamera: storyKeepCamera, rife: storyRife, autoGenerate: storyAutoGenerate, referenceStrength: storyReferenceStrength, referenceNoise: storyReferenceNoise } : null,
      sourceMode,
      sourcePath: activeAsset?.path || '',
      sourceKind: activeAsset?.kind || 'video',
      prompt, negative_prompt: negativePrompt,
      steps: ltxSteps,
      start_frame: startFrame, end_frame: endFrame,
      fps, smooth_animation: smooth, rife_multiplier: rifeMultiplier,
      pingpong: pingPong, loop_count: loopCount, duration_seconds: durationSeconds, duration_mode: durationMode,
      compression, filename_prefix: 'GinaAI_GIF_Studio'
    };
    try {
      if (sourceMode === 'ltx') {
        // GIF Studio owns the complete LTX production now. Even "Single Clip"
        // uses the same streamed story engine when a duration exceeds one safe
        // LTX chunk, so the 30s control cannot silently become a 1–2s source.
        const scenes = generationMode === 'story'
          ? storyScenes
          : [{ id:'single_clip', title:'Single Clip', prompt, duration:Math.max(0.1, durationSeconds || 1), transition:'cut', continuity:true, reference:true, seedMode:'random', seed:Math.floor(Math.random()*1e9) }];
        const storyParams = {
          ...params,
          duration_seconds: scenes.reduce((sum:number, scene:any) => sum + Math.max(0.1, Number(scene.duration) || 0.1), 0),
          width: 512,
          height: 512,
          model: 'ltxv-2b-0.9.8-distilled-fp8.safetensors',
          story: {
            scenes,
            totalDurationSeconds: scenes.reduce((sum:number, scene:any) => sum + Math.max(0.1, Number(scene.duration) || 0.1), 0),
            useFinalFrame: storyUseFinalFrame,
            keepCharacter: storyKeepCharacter,
            keepEnvironment: storyKeepEnvironment,
            keepCamera: storyKeepCamera,
            rife: storyRife,
            autoGenerate: storyAutoGenerate
          }
        };
        await startJob('gif_story', storyParams);
        onAddLog('INFO', generationMode==='story'
          ? `GIF Studio: sequential story queued — ${scenes.length} blocks / ${storyTotalDuration.toFixed(1)}s.`
          : `GIF Studio: continuous LTX clip queued — ${scenes[0].duration}s streamed in safe generation blocks.`);
      } else {
        await startJob('gif_studio', params);
        onAddLog('INFO', `GIF Studio queued: frames ${startFrame}–${endFrame}, ${fps}fps${smooth ? `, RIFE ${rifeMultiplier}×` : ''}.`);
      }
    } catch (e:any) { setError(e?.message || 'Unable to queue GIF Studio workflow'); }
  };

  const exportFormat = async (format:'gif'|'mp4') => {
    if (!job?.id || !isGifJob) { setError('Run the GIF Studio processing workflow first.'); return; }
    setExporting(true); setError(null);
    try {
      const r = await fetch('/api/gif-studio/export', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ jobId:job.id, format, compression, text:textEnabled ? memo : '', textX, textY, fontSize, strokeWidth, durationSeconds, durationMode }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || `Export failed (${r.status})`);
      setExportUrls(prev => ({...prev, [format]: d.url}));
      onAddLog('SEC', `GIF Studio ${format.toUpperCase()} export completed.`);
    } catch (e:any) { setError(e?.message || 'Export failed'); }
    finally { setExporting(false); }
  };

  // A ComfyUI GIF is the short source clip. Final duration is produced by FFmpeg
  // after ComfyUI finishes, so 30s/5min/1h does not depend on VHS loop_count limits.
  const autoFinalize = async (jobId: string) => {
    if (autoExportJobRef.current === jobId) return;
    autoExportJobRef.current = jobId;
    setExporting(true); setError(null);
    try {
      const bodyBase = { jobId, compression, text:textEnabled ? memo : '', textX, textY, fontSize, strokeWidth, durationSeconds, durationMode };
      const results: any = {};
      for (const format of ['gif','mp4'] as const) {
        const r = await fetch('/api/gif-studio/export', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...bodyBase, format}) });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || `${format.toUpperCase()} export failed (${r.status})`);
        results[format] = d.url;
      }
      setExportUrls(results);
      setPreviewFormat('gif');
      onAddLog('INFO', `GIF Studio final output ready: ${durationSeconds > 0 ? `${durationSeconds}s` : 'source duration'} (GIF + MP4).`);
      await loadAssets();
    } catch (e:any) {
      autoExportJobRef.current = null;
      setError(e?.message || 'Final GIF/MP4 export failed');
    } finally { setExporting(false); }
  };

  const adoptLtx = async () => {
    if (!job?.id || job.workflowId !== 'ltx_video' || job.status !== 'COMPLETED') return;
    try {
      const r = await fetch('/api/gif-studio/adopt-job', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({jobId:job.id})});
      const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Could not adopt LTX output');
      await loadAssets(); setAssetId(d.asset.id); setSourceMode('asset'); onAddLog('INFO', `Adopted LTX output as GIF Studio source: ${d.asset.name}`);
    } catch (e:any) { setError(e?.message || 'Could not adopt LTX output'); }
  };

  const progress = isGifJob ? job?.progress || 0 : 0;
  const currentNode = nodes.find(n => n.id === activeNode);
  const moveText = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggingText || !textEnabled) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setTextX(clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100));
    setTextY(clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100));
  };

  return <div className="space-y-4">
    <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)_390px] gap-4">
      <section className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-4">
        <div className="flex items-center justify-between"><div><div className="text-[9px] tracking-[.25em] text-emerald-400 font-bold">ASSET + GENERATION CONTROL</div><h2 className="text-lg font-semibold text-slate-100 mt-1">GIF Studio</h2></div><Film className="w-5 h-5 text-emerald-400" /></div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-3">
          <div className="flex items-center justify-between"><div><div className="text-[9px] font-bold tracking-[.2em] text-fuchsia-300">GENERATION MODE</div><div className="text-[8px] text-slate-600 mt-1">Choose whether this is one clip or a multi-scene production.</div></div><select value={generationMode} onChange={e=>setGenerationMode(e.target.value as any)} className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-[10px] text-slate-200"><option value="single">SINGLE CLIP</option><option value="story">SEQUENTIAL STORY</option></select></div>
          {generationMode==='story' && <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-[8px]"><div className="rounded border border-slate-800 p-2"><span className="text-slate-600">SCENES</span><div className="font-mono text-fuchsia-300 mt-1">{storyScenes.length}</div></div><div className="rounded border border-slate-800 p-2"><span className="text-slate-600">TOTAL</span><div className="font-mono text-fuchsia-300 mt-1">{storyTotalDuration.toFixed(1)}s</div></div><div className="rounded border border-slate-800 p-2"><span className="text-slate-600">RIFE</span><div className="font-mono text-fuchsia-300 mt-1">{storyRife.toUpperCase()}</div></div></div>
            <div className="space-y-1">{storyScenes.map((scene,i)=><div key={scene.id} onClick={()=>setActiveSceneId(scene.id)} className={`rounded border p-2 cursor-pointer ${activeSceneId===scene.id?'border-fuchsia-500/50 bg-fuchsia-500/10':'border-slate-800 bg-slate-950/40'}`}><div className="flex items-center justify-between text-[8px]"><span className="font-mono text-slate-300">{String(i+1).padStart(2,'0')} · {scene.title}</span><span className="text-slate-500">{scene.duration}s · {scene.transition}</span></div><div className="text-[8px] text-slate-600 truncate mt-1">{scene.prompt || 'No prompt yet'}</div></div>)}</div>
            {activeScene && <div className="rounded border border-fuchsia-500/20 bg-slate-950 p-2 space-y-2"><div className="grid grid-cols-[1fr_90px] gap-2"><label className="text-[8px] text-slate-500">SCENE TITLE<input value={activeScene.title} onChange={e=>updateScene(activeScene.id,{title:e.target.value})} className="mt-1 w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs"/></label><label className="text-[8px] text-slate-500">SECONDS<input type="number" min="0.1" max="3600" step="0.1" value={activeScene.duration} onChange={e=>updateScene(activeScene.id,{duration:Math.max(0.1,Number(e.target.value)||0.1)})} className="mt-1 w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs"/></label></div>
              <label className="text-[8px] text-slate-500">SCENE PROMPT<textarea value={activeScene.prompt} onChange={e=>updateScene(activeScene.id,{prompt:e.target.value})} rows={4} className="mt-1 w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 resize-none" placeholder="Describe only what happens in this scene…"/></label>
              <div className="grid grid-cols-2 gap-2"><label className="text-[8px] text-slate-500">TRANSITION<select value={activeScene.transition} onChange={e=>updateScene(activeScene.id,{transition:e.target.value as any})} className="mt-1 w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs"><option value="cut">CUT</option><option value="crossfade">CROSSFADE</option><option value="hold">HOLD FINAL FRAME</option></select></label><label className="text-[8px] text-slate-500">SEED<select value={activeScene.seedMode} onChange={e=>updateScene(activeScene.id,{seedMode:e.target.value as any})} className="mt-1 w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs"><option value="random">RANDOM</option><option value="fixed">FIXED</option><option value="previous">PREVIOUS</option></select></label></div>
              <div className="grid grid-cols-2 gap-2 text-[8px]"><button onClick={()=>updateScene(activeScene.id,{continuity:!activeScene.continuity})} className={`rounded border py-2 ${activeScene.continuity?'border-emerald-500/40 text-emerald-300':'border-slate-800 text-slate-500'}`}>CHARACTER CONTINUITY {activeScene.continuity?'ON':'OFF'}</button><button onClick={()=>updateScene(activeScene.id,{reference:!activeScene.reference})} className={`rounded border py-2 ${activeScene.reference?'border-cyan-500/40 text-cyan-300':'border-slate-800 text-slate-500'}`}>PREVIOUS FRAME {activeScene.reference?'ON':'OFF'}</button></div>
              <div className="flex gap-2"><button onClick={()=>duplicateScene(activeScene)} className="flex-1 rounded border border-slate-800 py-1.5 text-[8px] text-slate-400">DUPLICATE</button><button onClick={()=>removeScene(activeScene.id)} className="flex-1 rounded border border-red-500/20 py-1.5 text-[8px] text-red-300">DELETE</button></div>
            </div>}
            <button onClick={addScene} className="w-full rounded border border-dashed border-fuchsia-500/30 py-2 text-[9px] font-bold text-fuchsia-300">+ ADD SCENE</button>
            <div className="grid grid-cols-2 gap-2"><button onClick={()=>setStoryUseFinalFrame(v=>!v)} className={`rounded border py-2 text-[8px] font-bold ${storyUseFinalFrame?'border-cyan-500/40 text-cyan-300':'border-slate-800 text-slate-500'}`}>FINAL FRAME → NEXT {storyUseFinalFrame?'ON':'OFF'}</button><select value={storyRife} onChange={e=>setStoryRife(e.target.value as any)} className="bg-slate-900 border border-slate-800 rounded px-2 text-[8px] text-slate-300"><option value="off">RIFE OFF</option><option value="2x">RIFE 2×</option><option value="4x">RIFE 4×</option></select></div>
<div className="grid grid-cols-2 gap-2"><label className="text-[8px] text-slate-500">REFERENCE STRENGTH <input type="number" min="0" max="1" step="0.05" value={storyReferenceStrength} onChange={e=>setStoryReferenceStrength(clamp(Number(e.target.value),0,1))} className="mt-1 w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs"/></label><label className="text-[8px] text-slate-500">IMAGE NOISE <input type="number" min="0" max="1" step="0.05" value={storyReferenceNoise} onChange={e=>setStoryReferenceNoise(clamp(Number(e.target.value),0,1))} className="mt-1 w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs"/></label></div>
<div className="text-[8px] text-slate-600">RIFE is a story-level post/interpolation option. Final-frame continuity is separate and is applied automatically between blocks when the active ComfyUI LTX image-to-video node is available.</div>
            <div className="grid grid-cols-3 gap-1"><button onClick={()=>setStoryKeepCharacter(v=>!v)} className={`rounded border py-1.5 text-[7px] ${storyKeepCharacter?'border-emerald-500/30 text-emerald-300':'border-slate-800 text-slate-600'}`}>KEEP CHARACTER</button><button onClick={()=>setStoryKeepEnvironment(v=>!v)} className={`rounded border py-1.5 text-[7px] ${storyKeepEnvironment?'border-emerald-500/30 text-emerald-300':'border-slate-800 text-slate-600'}`}>KEEP ENVIRONMENT</button><button onClick={()=>setStoryKeepCamera(v=>!v)} className={`rounded border py-1.5 text-[7px] ${storyKeepCamera?'border-emerald-500/30 text-emerald-300':'border-slate-800 text-slate-600'}`}>KEEP CAMERA</button></div>
            <label className="flex items-center gap-2 text-[8px] text-slate-500"><input type="checkbox" checked={storyAutoGenerate} onChange={e=>setStoryAutoGenerate(e.target.checked)}/> AUTO-GENERATE SCENES IN ORDER</label>
          </div>}
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-slate-800 p-1 bg-slate-900"><button onClick={()=>setSourceMode('asset')} className={`py-2 text-[10px] font-bold rounded ${sourceMode==='asset'?'bg-emerald-500 text-slate-950':'text-slate-400'}`}>LOCAL ASSET</button><button onClick={()=>setSourceMode('ltx')} className={`py-2 text-[10px] font-bold rounded ${sourceMode==='ltx'?'bg-emerald-500 text-slate-950':'text-slate-400'}`}>LTX GENERATE</button></div>
        <label className="block border border-dashed border-slate-700 hover:border-emerald-500/60 rounded-lg p-4 text-center cursor-pointer bg-slate-900/60"><Upload className="w-5 h-5 mx-auto text-emerald-400"/><div className="text-[10px] text-slate-300 font-bold mt-2">IMPORT MP4 / MOV / PNG ARRAY</div><div className="text-[9px] text-slate-600 mt-1">Stored locally in C:\Gina_AI\media\gif_studio</div><input type="file" multiple accept="video/mp4,video/quicktime,video/webm,image/png,image/jpeg,image/webp" className="hidden" onChange={e=>void handleUpload(e.target.files)} /></label>
        {assets.length > 0 && <select value={assetId} onChange={e=>setAssetId(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-2 text-xs text-slate-200"><option value="">Select local source…</option>{assets.map(a=><option key={a.id} value={a.id}>{a.kind==='video'?'🎥':'🖼️'} {a.name}</option>)}</select>}
        {activeAsset && <div className="rounded border border-slate-800 bg-slate-900/70 p-2 text-[9px] font-mono text-slate-500 break-all"><span className="text-slate-300">SOURCE</span><br/>{activeAsset.path}</div>}
        {sourceMode==='ltx' && <div className="space-y-2"><label className="text-[9px] uppercase tracking-wider text-slate-500">LTX prompt</label><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} rows={4} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 resize-none"/><label className="text-[9px] uppercase tracking-wider text-slate-500">Negative</label><textarea value={negativePrompt} onChange={e=>setNegativePrompt(e.target.value)} rows={2} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 resize-none"/></div>}
        <div className="space-y-3 border-t border-slate-800 pt-3"><div className="flex justify-between text-[10px]"><span className="text-slate-400">START FRAME</span><span className="font-mono text-emerald-400">{startFrame}</span></div><input type="range" min="0" max="500" value={startFrame} onChange={e=>setStartFrame(Number(e.target.value))} className="w-full"/><div className="flex justify-between text-[10px]"><span className="text-slate-400">END FRAME</span><span className="font-mono text-emerald-400">{endFrame}</span></div><input type="range" min={startFrame} max="500" value={endFrame} onChange={e=>setEndFrame(Number(e.target.value))} className="w-full"/></div>
        <div className="grid grid-cols-2 gap-2"><label className="text-[9px] text-slate-500">FPS<input type="number" min="1" max="60" value={fps} onChange={e=>setFps(clamp(Number(e.target.value),1,60))} className="mt-1 w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs"/></label><label className="text-[9px] text-slate-500">FRAME DELAY MS<input type="number" min="16" max="1000" value={Math.round(1000/fps)} onChange={e=>setFps(clamp(Math.round(1000/Math.max(16,Number(e.target.value))),1,60))} className="mt-1 w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs"/></label></div>
        <div className="grid grid-cols-2 gap-2"><button onClick={()=>setSmooth(v=>!v)} disabled={rifeAvailable===false} className={`rounded border px-2 py-2 text-[9px] font-bold ${smooth?'border-emerald-500/50 bg-emerald-500/10 text-emerald-300':'border-slate-800 text-slate-500'} disabled:opacity-40`}>RIFE SMOOTH {rifeAvailable===false?'UNAVAILABLE':smooth?'ON':'OFF'}</button><select value={rifeMultiplier} onChange={e=>setRifeMultiplier(Number(e.target.value))} disabled={!smooth} className="bg-slate-900 border border-slate-800 rounded px-2 text-xs"><option value={2}>2× RIFE</option><option value={4}>4× RIFE</option></select></div>
        <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/50 p-2">
          <div className="flex items-center justify-between"><span className="text-[9px] font-bold tracking-wider text-cyan-300">OUTPUT DURATION</span><span className="font-mono text-[10px] text-cyan-300">{Math.floor(durationSeconds/60)}:{String(durationSeconds%60).padStart(2,'0')}</span></div>
          <input type="range" min="0" max="360" step="1" value={Math.min(360,durationSeconds)} onChange={e=>setDurationSeconds(Number(e.target.value))} className="w-full"/>
          <div className="flex justify-between text-[8px] text-slate-600"><span>0s</span><span>60s</span><span>120s</span><span>240s</span><span>360s</span></div>
          <label className="text-[8px] text-slate-500">EXACT DURATION (SECONDS)
            <input type="number" min="0" max="21600" value={durationSeconds} onChange={e=>setDurationSeconds(clamp(Number(e.target.value),0,21600))} className="mt-1 w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs"/>
          </label>
          <div className="grid grid-cols-3 gap-1">
            <button onClick={()=>setDurationMode('loop')} className={`rounded border py-2 text-[8px] font-bold ${durationMode==='loop'?'border-amber-500/50 bg-amber-500/10 text-amber-300':'border-slate-800 text-slate-500'}`}>LOOP</button>
            <button onClick={()=>setDurationMode('continuous')} className={`rounded border py-2 text-[8px] font-bold ${durationMode==='continuous'?'border-cyan-500/50 bg-cyan-500/10 text-cyan-300':'border-slate-800 text-slate-500'}`}>CONTINUOUS</button>
            <button onClick={()=>setPingPong(v=>!v)} className={`rounded border py-2 text-[8px] font-bold ${pingPong?'border-amber-500/50 bg-amber-500/10 text-amber-300':'border-slate-800 text-slate-500'}`}><Repeat2 className="inline w-3 h-3 mr-1"/>PING-PONG</button>
          </div>
          <div className="text-[8px] text-slate-600">Loop mode calculates repeats from target duration. Continuous mode preserves forward playback and uses the encoder to extend the source to the requested duration.</div>
        </div>
        <button onClick={()=>void submit()} disabled={submitting || (isGifJob && (job?.status==='RUNNING'||job?.status==='QUEUED'))} className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs py-3 flex items-center justify-center gap-2 disabled:opacity-50"><Play className="w-4 h-4"/>{submitting?'QUEUEING…':'PROCESS GIF LOCALLY'}</button>
        {job?.status==='RUNNING' && <button onClick={()=>void cancelJob()} className="w-full rounded border border-red-500/30 text-red-300 text-[10px] py-2">CANCEL / PURGE VRAM</button>}
        {job?.workflowId==='ltx_video' && job.status==='COMPLETED' && <button onClick={()=>void adoptLtx()} className="w-full rounded border border-cyan-500/40 text-cyan-300 text-[10px] py-2">ADOPT LTX OUTPUT AS GIF SOURCE</button>}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 min-h-[650px] flex flex-col">
        <div className="flex items-center justify-between mb-3"><div><div className="text-[9px] tracking-[.25em] text-cyan-400 font-bold">LIVE PLAYER + TIMELINE HUD</div><div className="text-sm text-slate-200 font-semibold">Frame range {startFrame} → {endFrame}</div></div><div className="flex items-center gap-2 text-[9px] font-mono text-slate-500"><button onClick={()=>setPreviewFormat('gif')} className={`px-2 py-1 rounded border ${previewFormat==='gif'?'border-emerald-500/50 text-emerald-300':'border-slate-800'}`}>GIF {exportUrls.gif?'✓':''}</button><button onClick={()=>setPreviewFormat('mp4')} className={`px-2 py-1 rounded border ${previewFormat==='mp4'?'border-cyan-500/50 text-cyan-300':'border-slate-800'}`}>MP4 {exportUrls.mp4?'✓':''}</button><span>{fps} FPS</span><span>{Math.round(1000/fps)}ms/frame</span></div></div>
        <div className="relative flex-1 min-h-[330px] rounded-xl border border-slate-800 bg-[#030712] overflow-hidden flex items-center justify-center">
          {sourceUrl && previewIsVideo ? <video key={sourceUrl} ref={previewVideoRef} src={sourceUrl} controls loop muted autoPlay playsInline className="max-w-full max-h-full object-contain"/> : sourceUrl ? <img key={sourceUrl} src={sourceUrl} className="max-w-full max-h-full object-contain" alt="GIF Studio result"/> : <div className="text-center text-slate-600"><Film className="w-12 h-12 mx-auto mb-3 opacity-30"/><div className="text-xs">No processed result yet</div><div className="text-[9px] mt-1">Run the workflow to create the final GIF/MP4.</div></div>}
          <canvas ref={canvasRef} width={900} height={500} className={`absolute inset-0 w-full h-full ${textEnabled&&memo?'opacity-100 pointer-events-auto cursor-move':'opacity-0 pointer-events-none'}`} onPointerDown={()=>setDraggingText(true)} onPointerMove={moveText} onPointerUp={()=>setDraggingText(false)} onPointerCancel={()=>setDraggingText(false)} />
          {job && isGifJob && <div className="absolute top-3 left-3 right-3 flex items-center gap-2"><div className="flex-1 h-1.5 rounded bg-slate-800 overflow-hidden"><div className="h-full bg-emerald-400 transition-all" style={{width:`${progress}%`}}/></div><span className="text-[9px] font-mono text-emerald-300">{progress}%</span></div>}
        </div>
        <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3"><div className="relative h-7"><div className="absolute top-3 left-0 right-0 h-1 bg-slate-700 rounded"/><div className="absolute top-3 h-1 bg-emerald-500 rounded" style={{left:`${Math.min(100,startFrame/500*100)}%`,right:`${100-Math.min(100,endFrame/500*100)}%`}}/></div><div className="flex justify-between text-[8px] font-mono text-slate-600"><span>0</span><span>250</span><span>500</span></div></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-3"><Metric icon={<Activity/>} label="GPU" value={`${telemetry.gpuTempC}°C`}/><Metric icon={<Cpu/>} label="VRAM" value={`${(telemetry.vramUsedMB/1024).toFixed(1)}GB / ${(telemetry.vramTotalMB/1024).toFixed(1)}GB`}/><Metric icon={<Clock3/>} label="NODE" value={currentNode?.classType || 'idle'}/><Metric icon={<Zap/>} label="JOB" value={job?.status || 'READY'}/></div><div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
          <div className="flex items-center justify-between"><span className="text-[9px] font-bold tracking-wider text-slate-300">GENERATION TELEMETRY</span><span className="text-[8px] font-mono text-slate-600">{events.length} events</span></div>
          {job?.workflowId==='gif_story' && <div className="mb-2 rounded border border-fuchsia-500/20 bg-fuchsia-500/5 p-2 text-[8px] font-mono text-fuchsia-300">STORY BLOCK {job.parameters?.__storyCurrentScene || 0} / {job.parameters?.__storySceneCount || 0} · {job.parameters?.__storyReferenceUsed ? 'FINAL-FRAME I2V ACTIVE' : 'TEXT-TO-VIDEO'} </div>}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-[8px]">
            <div><span className="text-slate-600">WORKFLOW</span><div className="font-mono text-cyan-300">{job?.workflowId || '—'}</div></div><div><span className="text-slate-600">MODE</span><div className="font-mono text-fuchsia-300">{generationMode==='story'?'SEQUENTIAL STORY':'SINGLE CLIP'}</div></div>
            <div><span className="text-slate-600">FRAME TARGET</span><div className="font-mono text-slate-300">{Math.max(1,endFrame-startFrame+1)}</div></div>
            <div><span className="text-slate-600">OUTPUT</span><div className="font-mono text-slate-300">{fps * (generationMode==='story' ? (storyRife==='4x' ? 4 : storyRife==='2x' ? 2 : 1) : (smooth ? rifeMultiplier : 1))} FPS</div></div>
            <div><span className="text-slate-600">DURATION</span><div className="font-mono text-slate-300">{Math.floor(durationSeconds/60)}:{String(durationSeconds%60).padStart(2,'0')}</div></div>
          </div>
          <div className="mt-2 text-[8px] font-mono text-slate-500 break-all">NODE {currentNode?.id || '—'} · {currentNode?.classType || 'idle'} · {currentNode?.inputs ? JSON.stringify(currentNode.inputs) : 'waiting'}</div>
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2"><button onClick={()=>setTextEnabled(v=>!v)} className={`border rounded px-3 py-2 text-[9px] font-bold ${textEnabled?'border-cyan-500/50 text-cyan-300':'border-slate-800 text-slate-500'}`}><Type className="inline w-3 h-3 mr-1"/>MEME TEXT LAYER</button><button onClick={()=>void exportFormat('gif')} disabled={exporting||!isGifJob} className="border border-emerald-500/40 rounded px-3 py-2 text-[9px] font-bold text-emerald-300 disabled:opacity-40"><Download className="inline w-3 h-3 mr-1"/>EXPORT GIF</button></div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-3 max-h-[820px] overflow-auto custom-scrollbar">
        <div className="flex items-center justify-between"><div><div className="text-[9px] tracking-[.25em] text-amber-400 font-bold">AI PROCESSING TRAY</div><div className="text-sm text-slate-200 font-semibold">ComfyUI Node Graph Sync</div></div><Layers3 className="w-5 h-5 text-amber-400"/></div>
        <div className="grid grid-cols-2 gap-2 text-[9px]"><div className="rounded border border-slate-800 p-2"><span className="text-slate-600">CURRENT NODE</span><div className="text-emerald-300 font-mono mt-1">{currentNode?.id || '—'} · {currentNode?.classType || 'idle'}</div></div><div className="rounded border border-slate-800 p-2"><span className="text-slate-600">THERMAL TARGET</span><div className={telemetry.gpuTempC>60?'text-amber-300':'text-emerald-300'}>{telemetry.gpuTempC}°C / 60°C</div></div></div>
        <div className="space-y-2"><ToggleRow label="Trim / Frame Window" on/><ToggleRow label="RIFE Optical Flow" on={generationMode==='story' ? storyRife!=='off' : smooth}/><ToggleRow label="Ping-Pong Loop" on={pingPong}/><ToggleRow label="Quantized GIF Compiler" on/><ToggleRow label="VRAM Active Purge" on={isGifJob}/><ToggleRow label="Thermal Governor" on/></div>
        <div className="border-t border-slate-800 pt-3"><button onClick={()=>setShowNodes(v=>!v)} className="w-full flex items-center justify-between text-[10px] font-bold text-slate-300">NODE EXECUTION {showNodes?<ChevronDown/>:<ChevronRight/>}</button>{showNodes && <div className="mt-2 space-y-1">{nodes.map(n=><div key={n.id} className={`rounded border px-2 py-2 ${n.status==='running'?'border-emerald-500/60 bg-emerald-500/10':n.status==='done'?'border-slate-700 bg-slate-900':'border-slate-900 bg-slate-950'}`}><div className="flex justify-between text-[9px]"><span className="font-mono text-slate-300">#{n.id} {n.classType}</span><span className={n.status==='running'?'text-emerald-300':n.status==='done'?'text-slate-500':'text-slate-700'}>{n.status}</span></div>{n.status==='running' && <div className="text-[8px] text-slate-500 mt-1 truncate">inputs: {JSON.stringify(n.inputs)}</div>}</div>)}</div>}</div>
        <div className="border-t border-slate-800 pt-3"><div className="flex items-center justify-between"><span className="text-[10px] font-bold text-slate-300">EVENT STREAM</span><span className="text-[8px] font-mono text-slate-600">{events.length}</span></div><div className="mt-2 max-h-40 overflow-auto space-y-1">{events.map((e,i)=><div key={i} className="text-[8px] font-mono text-slate-500"><span className="text-slate-700">{new Date(e.timestamp).toLocaleTimeString()}</span> {e.event} {e.payload?.node ? `#${e.payload.node}`:''}</div>)}</div></div>
        <div className="border-t border-slate-800 pt-3"><button onClick={()=>setShowWorkflow(v=>!v)} className="w-full flex items-center justify-between text-[10px] font-bold text-slate-300">RESOLVED WORKFLOW JSON {showWorkflow?<ChevronDown/>:<ChevronRight/>}</button>{showWorkflow && <pre className="mt-2 max-h-52 overflow-auto text-[7px] leading-3 font-mono text-slate-500 whitespace-pre-wrap">{JSON.stringify(workflowJson,null,2)}</pre>}</div>
        <div className="border-t border-slate-800 pt-3 space-y-2"><div className="text-[9px] tracking-wider text-slate-500">MEME TEXT PARAMETERS</div><label className="text-[8px] text-slate-500">TEXT<input value={memo} onChange={e=>setMemo(e.target.value)} className="mt-1 w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs"/></label><div className="grid grid-cols-2 gap-2"><label className="text-[8px] text-slate-500">SIZE<input type="number" value={fontSize} onChange={e=>setFontSize(Number(e.target.value))} className="mt-1 w-full bg-slate-900 border border-slate-800 rounded px-2 py-1"/></label><label className="text-[8px] text-slate-500">STROKE<input type="number" value={strokeWidth} onChange={e=>setStrokeWidth(Number(e.target.value))} className="mt-1 w-full bg-slate-900 border border-slate-800 rounded px-2 py-1"/></label></div><div className="grid grid-cols-2 gap-2"><label className="text-[8px] text-slate-500">X %<input type="range" min="0" max="100" value={textX} onChange={e=>setTextX(Number(e.target.value))} className="w-full"/></label><label className="text-[8px] text-slate-500">Y %<input type="range" min="0" max="100" value={textY} onChange={e=>setTextY(Number(e.target.value))} className="w-full"/></label></div><div className="grid grid-cols-2 gap-2"><button onClick={()=>void exportFormat('gif')} disabled={exporting||!isGifJob} className="border border-emerald-500/40 rounded py-2 text-[9px] text-emerald-300">GIF {exportUrls.gif?'✓':''}</button><button onClick={()=>void exportFormat('mp4')} disabled={exporting||!isGifJob} className="border border-cyan-500/40 rounded py-2 text-[9px] text-cyan-300">MP4 {exportUrls.mp4?'✓':''}</button></div></div>
        {exportUrls.gif && <a href={exportUrls.gif} download className="block text-center text-[9px] text-emerald-300">Open exported GIF</a>}{exportUrls.mp4 && <a href={exportUrls.mp4} download className="block text-center text-[9px] text-cyan-300">Open exported MP4</a>}
      </section>
    </div>
    {error && <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-300 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0"/>{error}<button className="ml-auto" onClick={()=>setError(null)}><X className="w-4 h-4"/></button></div>}
  </div>;
};

const Metric = ({icon,label,value}:{icon:React.ReactElement<{className?: string}>;label:string;value:string}) => <div className="rounded border border-slate-800 bg-slate-900/60 p-2"><div className="flex items-center gap-1 text-[8px] text-slate-600 uppercase">{React.cloneElement(icon,{className:'w-3 h-3'})}{label}</div><div className="text-[10px] font-mono text-slate-300 mt-1 truncate">{value}</div></div>;
const ToggleRow = ({label,on}:{label:string;on:boolean}) => <div className="flex items-center justify-between rounded border border-slate-900 bg-slate-900/40 px-2 py-2 text-[9px]"><span className="text-slate-400">{label}</span><span className={`px-1.5 py-0.5 rounded font-bold ${on?'bg-emerald-500/10 text-emerald-300':'bg-slate-800 text-slate-600'}`}>{on?'ON':'OFF'}</span></div>;
