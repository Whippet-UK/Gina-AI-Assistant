import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { AudioLines, ChevronDown, Dice5, Download, Heart, Lock, Plus, Play, Search, Sparkles, Trash2, Upload, Wand2 } from 'lucide-react';

interface VoiceRecord {
  voice_id:string; speaker_name:string; gender:string; age_group:string; primary_language:string; accent_dialect:string;
  tone_tags:string[]; engine_compatibility:string[]; xtts_embedding_path:string|null; bark_prompt_path:string|null;
  preview_audio_url:string|null; category:'system'|'cloned'|'community'; favorite:boolean;
}
interface Row { id:string; text:string; engine:'bark'|'xtts_v2'; voicePreset:string; language:string; }

const LANGUAGES = ['en','es','fr','de','it','pt','pl','tr','ru','nl','cs','ar','zh-cn','ja','ko','hu'];
const BARK_TAGS = ['[laughter]','[giggle]','[sigh]','[gasp]','[clears throat]','[hesitation]','[whispers]','[music]','[applause]','[laughter in background]','...'];
const DEFAULT_ROWS: Row[] = [{ id:'row_1', text:'', engine:'xtts_v2', voicePreset:'xtts_ana_florence', language:'en' }];

function makeSeed() { return Math.floor(Math.random() * 2147483647); }

export const UnifiedAudioDeck: React.FC<{ onAddLog?: (level:'INFO'|'WARN'|'SEC'|'RULE', message:string) => void }> = ({ onAddLog }) => {
  const [engine, setEngine] = useState<'bark'|'xtts_v2'>('xtts_v2');
  const [mode, setMode] = useState<'standard'|'hybrid'>('standard');
  const [text, setText] = useState('');
  const [rows, setRows] = useState<Row[]>(DEFAULT_ROWS);
  const [voices, setVoices] = useState<VoiceRecord[]>([]);
  const [voiceSearch, setVoiceSearch] = useState('');
  const [voiceCategory, setVoiceCategory] = useState<'system'|'cloned'|'community'>('system');
  const [voiceId, setVoiceId] = useState('xtts_ana_florence');
  const [language, setLanguage] = useState('en');
  const [clonePath, setClonePath] = useState<string|null>(null);
  const [temperature, setTemperature] = useState(0.7);
  const [repetitionPenalty, setRepetitionPenalty] = useState(2);
  const [lengthPenalty, setLengthPenalty] = useState(0);
  const [seed, setSeed] = useState(-1);
  const [seedLocked, setSeedLocked] = useState(false);
  const [stripTags, setStripTags] = useState(true);
  const [autoSplit, setAutoSplit] = useState(true);
  const [normalize, setNormalize] = useState(true);
  const [trimSilence, setTrimSilence] = useState(true);
  const [pitchShiftSemitones, setPitchShiftSemitones] = useState(0);
  const [formantShift, setFormantShift] = useState(1);
  const [speedFactor, setSpeedFactor] = useState(1);
  const [enableStreaming, setEnableStreaming] = useState(false);
  const [format, setFormat] = useState<'wav'|'mp3'|'flac'>('wav');
  const [batchSize, setBatchSize] = useState(1);
  const [batchMode, setBatchMode] = useState<'iterate_seeds'|'iterate_voices'>('iterate_seeds');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [audioDiagnostics, setAudioDiagnostics] = useState<{ok:boolean; python?:string; databasePath?:string; imports?:string[]; error?:string} | null>(null);
  const [result, setResult] = useState<{url:string; path:string; bytes:number; seed:number}|null>(null);
  const [batchResults, setBatchResults] = useState<Array<{url:string;path:string;bytes:number;seed:number}>>([]);
  const [previewUrl, setPreviewUrl] = useState<string|null>(null);
  const [activeRowId, setActiveRowId] = useState('row_1');
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement|null>>({});

  const loadVoices = useCallback(async () => {
    try {
      const query = new URLSearchParams({ category:voiceCategory, q:voiceSearch });
      const r = await fetch(`/api/audio/voices?${query.toString()}`, { cache:'no-store' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      setVoices(Array.isArray(d.voices) ? d.voices : []);
    } catch (e:any) { setError(e?.message || 'Unable to load voice database.'); }
  }, [voiceCategory, voiceSearch]);
  useEffect(() => { void loadVoices(); }, [loadVoices]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/audio/diagnostics', { cache:'no-store' })
      .then(async r => { const d = await r.json().catch(() => ({})); return { ok:r.ok && Boolean(d.ok), ...d }; })
      .then(d => { if (!cancelled) setAudioDiagnostics(d); })
      .catch(e => { if (!cancelled) setAudioDiagnostics({ok:false,error:e?.message || 'Audio diagnostics request failed.'}); });
    return () => { cancelled = true; };
  }, []);

  const selectedVoice = useMemo(() => voices.find(v => v.voice_id === voiceId) || null, [voices, voiceId]);
  const filteredVoices = useMemo(() => voices.filter(v => {
    if (engine === 'bark' && !v.engine_compatibility.includes('bark')) return false;
    if (engine === 'xtts_v2' && !v.engine_compatibility.includes('xtts')) return false;
    return true;
  }), [voices, engine]);

  const uploadClone = useCallback(async (file:File) => {
    setError(null);
    try {
      const ext = `.${file.name.split('.').pop()?.toLowerCase() || ''}`;
      if (!['.wav','.mp3'].includes(ext)) throw new Error('XTTS voice cloning accepts WAV or MP3.');
      if (file.size > 30 * 1024 * 1024) throw new Error('Voice sample is limited to 30 MB.');
      const r = await fetch('/api/audio/voice-clone', { method:'POST', headers:{'Content-Type':file.type || 'application/octet-stream','X-Gina-Filename':encodeURIComponent(file.name)}, body:await file.arrayBuffer() });
      const d = await r.json(); if (!r.ok || !d.ok) throw new Error(d.error || `Upload failed (HTTP ${r.status})`);
      setClonePath(d.path); setVoiceId(d.voice?.voice_id || ''); setVoiceCategory('cloned');
      await loadVoices();
      onAddLog?.('INFO', `XTTS voice reference '${file.name}' is stored locally and ready for cloning.`);
    } catch (e:any) { setError(e?.message || 'Voice sample upload failed.'); }
  }, [loadVoices, onAddLog]);

  const drop = useDropzone({ onDrop: files => { if (files[0]) void uploadClone(files[0]); }, accept:{'audio/wav':['.wav'],'audio/mpeg':['.mp3']}, multiple:false, disabled:engine !== 'xtts_v2' });

  const insertTag = (tag:string, rowId?:string) => {
    const id = rowId || activeRowId;
    const el = textareaRefs.current[id];
    if (!el) {
      if (mode === 'standard') setText(prev => `${prev}${prev ? ' ' : ''}${tag}`);
      else setRows(prev => prev.map(row => row.id === id ? {...row,text:`${row.text}${row.text ? ' ' : ''}${tag}`} : row));
      return;
    }
    const value = mode === 'standard' ? text : rows.find(r => r.id === id)?.text || '';
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? start;
    const next = `${value.slice(0,start)}${tag}${value.slice(end)}`;
    if (mode === 'standard') setText(next); else setRows(prev => prev.map(row => row.id === id ? {...row,text:next} : row));
    requestAnimationFrame(() => { el.focus(); const caret=start + tag.length; el.setSelectionRange(caret,caret); });
  };

  const toggleFavorite = async (voice:VoiceRecord) => {
    try { await fetch(`/api/audio/voices/${encodeURIComponent(voice.voice_id)}/favorite`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({favorite:!voice.favorite})}); await loadVoices(); }
    catch (e:any) { setError(e?.message || 'Unable to update favorite.'); }
  };

  const previewVoice = async (voice:VoiceRecord) => {
    setError(null);
    try {
      const r = await fetch('/api/audio/preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({voice_id:voice.voice_id,engine:voice.engine_compatibility.includes('bark') ? 'bark' : 'xtts_v2',voice_preset:voice.bark_prompt_path || voice.speaker_name,speaker:voice.speaker_name,speaker_wav:voice.xtts_embedding_path || undefined})});
      const d = await r.json(); if (!r.ok || !d.ok) throw new Error(d.error || 'Preview failed.');
      setPreviewUrl(d.url);
    } catch (e:any) { setError(e?.message || 'Voice preview failed.'); }
  };

  const addRow = () => setRows(prev => [...prev,{id:`row_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,text:'',engine:'xtts_v2',voicePreset:'xtts_ana_florence',language:'en'}]);
  const removeRow = (id:string) => setRows(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);

  const generate = async () => {
    setGenerating(true); setError(null); setResult(null); setBatchResults([]);
    try {
      const basePayload:any = { engine, mode, text, timeline:rows, voice_preset:selectedVoice?.bark_prompt_path || selectedVoice?.speaker_name || voiceId, speaker:selectedVoice?.speaker_name, speaker_wav:clonePath || selectedVoice?.xtts_embedding_path || undefined, language, temperature, repetition_penalty:repetitionPenalty, length_penalty:lengthPenalty, seed, seed_locked:seedLocked, strip_tags_on_xtts:stripTags, auto_split_chunks:autoSplit, normalize, trim_silence:trimSilence, pitch_shift_semitones:pitchShiftSemitones, formant_shift:formantShift, speed_factor:speedFactor, enable_streaming:enableStreaming && batchSize === 1, output_format:format };
      const results:any[] = [];
      for (let i=0; i<Math.max(1,Math.min(4,batchSize)); i++) {
        const payload = {...basePayload};
        if (batchMode === 'iterate_seeds') payload.seed = seedLocked ? seed : (seed < 0 ? makeSeed() : seed + i);
        if (batchMode === 'iterate_voices' && filteredVoices[i]) { payload.voice_preset = filteredVoices[i].bark_prompt_path || filteredVoices[i].speaker_name; payload.speaker = filteredVoices[i].speaker_name; payload.speaker_wav = filteredVoices[i].xtts_embedding_path || payload.speaker_wav; }
        const r = await fetch('/api/audio/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
        if (enableStreaming && batchSize === 1) {
          if (!r.ok) { const failure = await r.json().catch(() => ({})); throw new Error(failure.error || `Generation failed (HTTP ${r.status})`); }
          const blob = await r.blob();
          const url = URL.createObjectURL(blob);
          results.push({ok:true,url,path:'streamed',bytes:blob.size,seed:Number(payload.seed)});
        } else {
          const d = await r.json(); if (!r.ok || !d.ok) throw new Error(d.error || `Generation failed (HTTP ${r.status})`);
          results.push(d);
        }
      }
      const first = results[0]; setResult(first); setBatchResults(results); onAddLog?.('SEC', `Unified Audio generated ${results.length} variation${results.length===1?'':'s'} using ${engine === 'bark' ? 'Bark' : 'XTTS v2'}.`);
    } catch (e:any) { setError(e?.message || 'Unified audio generation failed.'); }
    finally { setGenerating(false); }
  };

  return <section className="rounded-xl border border-slate-800 bg-slate-950/95 p-5 shadow-xl space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
      <div><div className="text-[10px] uppercase tracking-[.25em] text-emerald-400 font-bold">Voice Audio Generation Engine</div><h2 className="text-xl font-semibold text-slate-100 mt-1 flex items-center gap-2"><AudioLines className="w-5 h-5 text-emerald-400"/>Bark + XTTS v2 Voice Audio Generation</h2><p className="text-xs text-slate-500 mt-1">Local, self-hosted speech generation, cloning and stitched multi-engine timelines.</p></div>
      <div className="flex gap-2">
        {(['bark','xtts_v2'] as const).map(id => <button key={id} onClick={()=>setEngine(id)} className={`px-4 py-2 rounded border text-[10px] font-bold uppercase tracking-wider ${engine===id?'border-emerald-400 bg-emerald-500/15 text-emerald-300':'border-slate-700 bg-slate-900 text-slate-400'}`}>{id==='bark'?'BARK':'XTTS v2'}</button>)}
        <select value={mode} onChange={e=>setMode(e.target.value as any)} className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-[10px] font-bold uppercase text-slate-300"><option value="standard">Standard</option><option value="hybrid">Hybrid / Stitched</option></select>
      </div>
    </div>

    <div className={`rounded-lg border p-3 text-[9px] font-mono ${audioDiagnostics?.ok ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`font-bold uppercase tracking-widest ${audioDiagnostics?.ok ? 'text-emerald-300' : 'text-amber-300'}`}>{audioDiagnostics?.ok ? 'AUDIO ENGINE READY' : 'AUDIO ENGINE NEEDS ATTENTION'}</span>
        {audioDiagnostics?.python && <span className="text-slate-500 truncate" title={audioDiagnostics.python}>Python: {audioDiagnostics.python}</span>}
        {audioDiagnostics?.databasePath && <span className="text-slate-600 truncate" title={audioDiagnostics.databasePath}>DB: {audioDiagnostics.databasePath}</span>}
        {audioDiagnostics?.imports?.length ? <span className="text-slate-600 truncate" title={audioDiagnostics.imports.join(' · ')}>Python imports: {audioDiagnostics.imports.map(x=>x.split(/[\\/]/).pop()).join(' · ')}</span> : null}
      </div>
      {!audioDiagnostics?.ok && <div className="mt-1 text-amber-200/80 break-words">{audioDiagnostics?.error || 'Checking TTS, Bark and pydub…'}</div>}
    </div>

    <div className="grid grid-cols-12 gap-5 min-w-0">
      <div className="col-span-12 xl:col-span-8 space-y-4 min-w-0">
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
          <div className="flex items-center justify-between mb-2"><span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{mode==='standard'?'Main Text':'Hybrid Timeline'}</span>{mode==='hybrid'&&<button onClick={addRow} className="px-2 py-1 rounded border border-emerald-500/30 text-emerald-300 text-[9px] flex items-center gap-1"><Plus className="w-3 h-3"/> Add row</button>}</div>
          {mode==='standard' ? <div><textarea ref={el=>{textareaRefs.current.row_1=el}} value={text} onFocus={()=>setActiveRowId('row_1')} onChange={e=>setText(e.target.value)} rows={9} placeholder={engine==='bark'?'Write expressive dialogue and use the Bark quick-insert cues below…':'Write clean narration or paste your script…'} className="w-full resize-y min-h-[180px] bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 outline-none focus:border-emerald-500/50"/><div className="mt-2 text-[8px] text-slate-600">Sentence splitting: {autoSplit?'ON':'OFF'} · tags stripped on XTTS: {stripTags?'ON':'OFF'}</div></div> : <div className="space-y-2">{rows.map((row,index)=><div key={row.id} className="rounded border border-slate-800 bg-slate-950 p-2"><div className="flex items-center gap-2 mb-2"><span className="text-[8px] font-mono text-slate-600">ROW {index+1}</span><select value={row.engine} onChange={e=>setRows(prev=>prev.map(r=>r.id===row.id?{...r,engine:e.target.value as any}:r))} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[9px] text-slate-300"><option value="bark">Bark</option><option value="xtts_v2">XTTS v2</option></select><select value={row.language} onChange={e=>setRows(prev=>prev.map(r=>r.id===row.id?{...r,language:e.target.value}:r))} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[9px] text-slate-300">{LANGUAGES.map(l=><option key={l}>{l}</option>)}</select><button onClick={()=>removeRow(row.id)} className="ml-auto text-slate-600 hover:text-rose-300"><Trash2 className="w-3.5 h-3.5"/></button></div><textarea ref={el=>{textareaRefs.current[row.id]=el}} value={row.text} onFocus={()=>setActiveRowId(row.id)} onChange={e=>setRows(prev=>prev.map(r=>r.id===row.id?{...r,text:e.target.value}:r))} rows={3} placeholder={`Sentence block ${index+1}…`} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 outline-none focus:border-emerald-500/50"/>{row.engine==='bark'&&<div className="mt-2 flex flex-wrap gap-1">{BARK_TAGS.map(tag=><button key={tag} onClick={()=>insertTag(tag,row.id)} className="px-1.5 py-1 rounded bg-slate-900 border border-slate-700 text-[8px] text-sky-300">{tag}</button>)}</div>}</div>)}</div>}
        </div>

        {engine==='bark' && <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3"><div className="text-[9px] font-bold uppercase tracking-widest text-sky-300 mb-2">Bark Quick Insert</div><div className="flex flex-wrap gap-1.5">{BARK_TAGS.map(tag=><button key={tag} onClick={()=>insertTag(tag)} className="px-2 py-1 rounded border border-sky-500/20 bg-slate-950 text-[9px] text-sky-300 hover:border-sky-400/40">{tag}</button>)}</div></div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 space-y-3"><div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Hyperparameters</div><label className="block text-[9px] text-slate-500">Temperature <b className="text-slate-300">{temperature.toFixed(2)}</b><input type="range" min="0.1" max="1.2" step="0.05" value={temperature} onChange={e=>setTemperature(Number(e.target.value))} className="w-full"/></label>{engine==='xtts_v2'&&<><label className="block text-[9px] text-slate-500">Repetition Penalty <b className="text-slate-300">{repetitionPenalty.toFixed(2)}</b><input type="range" min="1" max="3" step="0.05" value={repetitionPenalty} onChange={e=>setRepetitionPenalty(Number(e.target.value))} className="w-full"/></label><label className="block text-[9px] text-slate-500">Length Penalty <b className="text-slate-300">{lengthPenalty.toFixed(2)}</b><input type="range" min="-1" max="1" step="0.05" value={lengthPenalty} onChange={e=>setLengthPenalty(Number(e.target.value))} className="w-full"/></label></>}<div className="flex gap-2"><input type="number" value={seed} onChange={e=>setSeed(Number(e.target.value))} className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs font-mono text-slate-300"/><button title="Randomize seed" onClick={()=>setSeed(makeSeed())} className="p-2 rounded border border-slate-700 text-slate-300"><Dice5 className="w-4 h-4"/></button><button title="Freeze seed" onClick={()=>setSeedLocked(v=>!v)} className={`p-2 rounded border ${seedLocked?'border-emerald-400 text-emerald-300':'border-slate-700 text-slate-500'}`}><Lock className="w-4 h-4"/></button></div></div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 space-y-3"><div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Output Hub</div><div className="flex gap-2">{(['wav','mp3','flac'] as const).map(f=><button key={f} onClick={()=>setFormat(f)} className={`flex-1 py-1.5 rounded border text-[9px] font-bold uppercase ${format===f?'border-emerald-400 text-emerald-300 bg-emerald-500/10':'border-slate-700 text-slate-500'}`}>{f}</button>)}</div><label className="flex items-center gap-2 text-[9px] text-slate-400"><input type="checkbox" checked={normalize} onChange={e=>setNormalize(e.target.checked)}/> Loudness normalization</label><label className="flex items-center gap-2 text-[9px] text-slate-400"><input type="checkbox" checked={trimSilence} onChange={e=>setTrimSilence(e.target.checked)}/> Trim leading/trailing silence</label><label className="flex items-center gap-2 text-[9px] text-slate-400"><input type="checkbox" checked={autoSplit} onChange={e=>setAutoSplit(e.target.checked)}/> Auto-split sentences</label><label className="flex items-center gap-2 text-[9px] text-slate-400"><input type="checkbox" checked={stripTags} onChange={e=>setStripTags(e.target.checked)}/> Auto-strip tags on XTTS</label><label className="flex items-center gap-2 text-[9px] text-slate-400"><input type="checkbox" checked={enableStreaming} onChange={e=>setEnableStreaming(e.target.checked)} disabled={batchSize > 1}/> HTTP audio streaming (single variation)</label></div>
        </div>

        <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 space-y-3">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-violet-300">Physical Audio Manipulation</div>
            <div className="text-[8px] text-slate-500 mt-1">Post-processes the final rendered audio locally, after Bark/XTTS generation.</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="block text-[9px] text-slate-500">Pitch Tuning <b className="text-slate-300">{pitchShiftSemitones > 0 ? '+' : ''}{pitchShiftSemitones} st</b><input aria-label="Pitch Tuning Slider" type="range" min="-12" max="12" step="1" value={pitchShiftSemitones} onChange={e=>setPitchShiftSemitones(Number(e.target.value))} className="w-full"/><span className="text-[8px] text-slate-600">-12 to +12 semitones</span></label>
            <label className="block text-[9px] text-slate-500">Formant Shifter <b className="text-slate-300">{formantShift.toFixed(2)}x</b><input aria-label="Formant Shifter" type="range" min="0.5" max="1.5" step="0.01" value={formantShift} onChange={e=>setFormantShift(Number(e.target.value))} className="w-full"/><span className="text-[8px] text-slate-600">0.5x deeper · 1.5x brighter</span></label>
            <label className="block text-[9px] text-slate-500">Playback Rate <b className="text-slate-300">{speedFactor.toFixed(2)}x</b><input aria-label="Playback Rate" type="range" min="0.5" max="2" step="0.01" value={speedFactor} onChange={e=>setSpeedFactor(Number(e.target.value))} className="w-full"/><span className="text-[8px] text-slate-600">Pitch-preserving time stretch</span></label>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3"><div className="flex items-center justify-between"><div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Batch Variations</div><div className="flex items-center gap-2"><input type="range" min="1" max="4" value={batchSize} onChange={e=>setBatchSize(Number(e.target.value))}/><span className="text-xs font-mono text-emerald-300">{batchSize}</span><select value={batchMode} onChange={e=>setBatchMode(e.target.value as any)} className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[9px] text-slate-300"><option value="iterate_seeds">Iterate Seeds</option><option value="iterate_voices">Iterate Voices</option></select></div></div></div>

        {error && <div className="p-3 rounded border border-rose-500/30 bg-rose-500/5 text-xs text-rose-300">{error}</div>}
        <button onClick={()=>void generate()} disabled={generating || !(mode==='standard'?text.trim():rows.some(r=>r.text.trim()))} className="w-full py-3 rounded-lg bg-emerald-500 text-slate-950 font-bold uppercase tracking-widest text-[10px] disabled:opacity-30 flex items-center justify-center gap-2">{generating?<><Sparkles className="w-4 h-4 animate-pulse"/> Generating locally…</>:<><Wand2 className="w-4 h-4"/> Generate Audio</>}</button>
        {batchResults.length > 0 && <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3"><div className="text-[9px] uppercase tracking-widest text-emerald-300 font-bold mb-2">Batch Matrix · {batchResults.length} variation{batchResults.length===1?'':'s'}</div><div className="grid grid-cols-1 md:grid-cols-2 gap-2">{batchResults.map((item,index)=><div key={`${item.seed}-${index}`} className="rounded border border-slate-800 bg-slate-950 p-2"><div className="flex items-center justify-between text-[8px] font-mono text-slate-500"><span>Variation {index+1} · Seed {item.seed}</span><a href={item.url} download className="text-emerald-300 flex items-center gap-1"><Download className="w-3 h-3"/>Save</a></div><audio controls src={item.url} className="w-full mt-2"/></div>)}</div></div>}
      </div>

      <aside className="col-span-12 xl:col-span-4 rounded-lg border border-slate-800 bg-slate-900/50 p-3 min-w-0"><div className="flex items-center justify-between mb-3"><div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Voice Database</div><Search className="w-3.5 h-3.5 text-slate-600"/></div><div className="flex gap-1 mb-2">{(['system','cloned','community'] as const).map(c=><button key={c} onClick={()=>setVoiceCategory(c)} className={`flex-1 py-1.5 rounded border text-[8px] font-bold uppercase ${voiceCategory===c?'border-emerald-400 text-emerald-300':'border-slate-700 text-slate-500'}`}>{c==='cloned'?'My Cloned Voices':c==='community'?'Shared':'System Presets'}</button>)}</div><input value={voiceSearch} onChange={e=>setVoiceSearch(e.target.value)} placeholder="Search speaker, accent or tone…" className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-300 mb-3"/><div className="space-y-1.5 max-h-[420px] overflow-y-auto custom-scrollbar">{filteredVoices.map(v=><div key={v.voice_id} className={`p-2 rounded border ${voiceId===v.voice_id?'border-emerald-500/40 bg-emerald-500/5':'border-slate-800 bg-slate-950'}`}><div className="flex items-start gap-2"><button onClick={()=>setVoiceId(v.voice_id)} className="flex-1 text-left min-w-0"><div className="text-xs text-slate-200 font-semibold truncate">{v.speaker_name}</div><div className="text-[8px] text-slate-600 truncate">{v.gender} · {v.age_group} · {v.primary_language} · {v.accent_dialect}</div><div className="flex flex-wrap gap-1 mt-1">{v.engine_compatibility.map(e=><span key={e} className={`px-1 rounded text-[7px] font-bold uppercase ${e==='xtts'?'bg-emerald-500/15 text-emerald-300':'bg-sky-500/15 text-sky-300'}`}>{e==='xtts'?'XTTS':'BARK'}</span>)}{v.tone_tags.slice(0,3).map(t=><span key={t} className="px-1 rounded bg-slate-800 text-slate-500 text-[7px]">{t}</span>)}</div></button><button title="Preview voice" onClick={()=>void previewVoice(v)} className="p-1.5 rounded border border-slate-700 text-slate-400"><Play className="w-3 h-3"/></button><button title="Favorite" onClick={()=>void toggleFavorite(v)} className={`p-1.5 rounded border ${v.favorite?'border-amber-400/50 text-amber-300':'border-slate-700 text-slate-600'}`}><Heart className="w-3 h-3" fill={v.favorite?'currentColor':'none'}/></button></div></div>)}{!filteredVoices.length&&<div className="text-[9px] text-slate-600 text-center py-8">No matching voices.</div>}</div>{engine==='xtts_v2'&&<div {...drop.getRootProps()} className={`mt-3 rounded-lg border border-dashed p-4 text-center cursor-pointer ${drop.isDragActive?'border-emerald-400 bg-emerald-500/10':'border-slate-700 bg-slate-950'}`}><input {...drop.getInputProps()}/><Upload className="w-5 h-5 mx-auto text-emerald-300"/><div className="text-[9px] font-bold text-slate-300 mt-2">Drop 3–10s XTTS reference</div><div className="text-[8px] text-slate-600 mt-1">WAV or MP3 · clean speech · stored locally</div>{clonePath&&<div className="text-[8px] text-emerald-300 mt-2 truncate">Clone ready: {clonePath.split(/[\\/]/).pop()}</div>}</div>}{engine==='xtts_v2'&&<select value={language} onChange={e=>setLanguage(e.target.value)} className="mt-3 w-full bg-slate-950 border border-slate-800 rounded px-2 py-2 text-[9px] text-slate-300">{LANGUAGES.map(l=><option key={l}>{l}</option>)}</select>}{previewUrl&&<div className="mt-3"><audio controls src={previewUrl} className="w-full"/></div>}</aside>
    </div>
  </section>;
};
