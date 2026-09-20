import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  AudioLines,
  ChevronDown,
  ChevronUp,
  Dice5,
  Download,
  Heart,
  Loader2,
  Lock,
  Plus,
  Play,
  Search,
  Sparkles,
  Square,
  Trash2,
  Upload,
  Volume2,
  Wand2,
  Wrench,
  Terminal,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Cpu,
  Zap,
  Clock,
  Copy,
  Check
} from 'lucide-react';

interface VoiceRecord {
  voice_id:string; speaker_name:string; gender:string; age_group:string; primary_language:string; accent_dialect:string;
  tone_tags:string[]; engine_compatibility:string[]; xtts_embedding_path:string|null; bark_prompt_path:string|null;
  preview_audio_url:string|null; category:'system'|'cloned'|'community'; favorite:boolean;
}
interface Row { id:string; text:string; engine:'bark'|'xtts_v2'; voicePreset:string; language:string; }

interface ActiveJobState {
  id?: string;
  status?: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';
  stage?: string;
  message?: string;
  percent?: number;
  device?: string;
  vramWarning?: boolean;
  row?: number;
  totalRows?: number;
  engine?: string;
  startTime?: number;
  elapsedSec?: number;
  logs?: string[];
  result?: any;
  error?: string;
}

const LANGUAGES = ['en','es','fr','de','it','pt','pl','tr','ru','nl','cs','ar','zh-cn','ja','ko','hu'];
const BARK_TAGS = ['[laughter]','[giggle]','[sigh]','[gasp]','[clears throat]','[hesitation]','[whispers]','[music]','[applause]','[laughter in background]','...'];
const DEFAULT_ROWS: Row[] = [{ id:'row_1', text:'', engine:'xtts_v2', voicePreset:'xtts_ana_florence', language:'en' }];

function makeSeed() { return Math.floor(Math.random() * 2147483647); }
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

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
  const [repairing, setRepairing] = useState(false);
  const [repairLog, setRepairLog] = useState<string|null>(null);
  const [error, setError] = useState<string|null>(null);
  const [audioDiagnostics, setAudioDiagnostics] = useState<{ok:boolean; python?:string; databasePath?:string; imports?:string[]; error?:string} | null>(null);
  const [result, setResult] = useState<{url:string; path:string; bytes:number; seed:number}|null>(null);
  const [batchResults, setBatchResults] = useState<Array<{url:string;path:string;bytes:number;seed:number}>>([]);
  const [previewUrl, setPreviewUrl] = useState<string|null>(null);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string|null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string|null>(null);
  const audioRef = useRef<HTMLAudioElement|null>(null);
  const [activeRowId, setActiveRowId] = useState('row_1');
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement|null>>({});

  // Real-time live audio execution state & telemetry
  const [activeJob, setActiveJob] = useState<ActiveJobState | null>(null);
  const [jobLogs, setJobLogs] = useState<string[]>([]);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [showLogs, setShowLogs] = useState<boolean>(true);
  const [copiedLog, setCopiedLog] = useState<boolean>(false);
  const [freeingVram, setFreeingVram] = useState<boolean>(false);
  const [vramFreedMessage, setVramFreedMessage] = useState<string | null>(null);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  const fetchDiagnostics = useCallback(async () => {
    try {
      const r = await fetch('/api/audio/diagnostics', { cache:'no-store' });
      const d = await r.json().catch(() => ({}));
      setAudioDiagnostics({ ok: r.ok && Boolean(d.ok), ...d });
    } catch (e: any) {
      setAudioDiagnostics({ ok: false, error: e?.message || 'Audio diagnostics request failed.' });
    }
  }, []);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairLog(null);
    try {
      onAddLog?.('INFO', 'Running Unified Audio dependency repair...');
      const res = await fetch('/api/audio/repair', { method: 'POST' });
      const rawText = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(rawText);
      } catch {
        // Not valid JSON
      }
      if (!res.ok || !data?.ok) {
        const detail = data?.error || (rawText.trim() ? `Server response: ${rawText.slice(0, 260)}` : `Server returned empty response (${res.status}).`);
        throw new Error(detail);
      }
      onAddLog?.('SEC', 'Unified Audio dependencies repaired successfully.');
      setRepairLog(data.message || 'Repaired successfully.');
      await fetchDiagnostics();
    } catch (err: any) {
      const msg = err?.message || 'Repair script execution failed.';
      onAddLog?.('WARN', `Audio repair error: ${msg}`);
      setRepairLog(`Repair error: ${msg}`);
    } finally {
      setRepairing(false);
    }
  };

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
    void fetchDiagnostics();
  }, [fetchDiagnostics]);

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

  const checkActiveStatus = useCallback(async () => {
    try {
      const r = await fetch('/api/audio/active-status');
      const d = await r.json();
      if (d.ok && d.active && d.job) {
        setGenerating(true);
        setActiveJob(d.job);
        setElapsedSec(d.job.elapsedSec || 0);
        if (Array.isArray(d.job.logs) && d.job.logs.length) {
          setJobLogs(d.job.logs);
        }
      }
    } catch {
      // Ignore network errors on background poll
    }
  }, []);

  useEffect(() => {
    void checkActiveStatus();

    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource('/api/audio/events');

        eventSource.addEventListener('status', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            if (data.status === 'running') {
              setActiveJob(data);
              setGenerating(true);
              if (typeof data.elapsedSec === 'number') setElapsedSec(data.elapsedSec);
              if (Array.isArray(data.logs) && data.logs.length) {
                setJobLogs(data.logs);
              }
            }
          } catch {
            // ignore parse error
          }
        });

        eventSource.addEventListener('progress', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            setActiveJob(prev => ({
              ...prev,
              ...data,
              status: 'running',
            }));
            if (data.message) {
              const formatted = `[${new Date().toLocaleTimeString()}] ${data.message}`;
              setJobLogs(prev => [...prev.slice(-80), formatted]);
            }
          } catch {
            // ignore
          }
        });

        eventSource.addEventListener('log', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            if (data.line) {
              const formatted = `[${new Date().toLocaleTimeString()}] ${data.line}`;
              setJobLogs(prev => [...prev.slice(-80), formatted]);
            }
          } catch {
            // ignore
          }
        });

        eventSource.addEventListener('completed', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            setActiveJob(prev => ({ ...prev, ...data, status: 'completed', percent: 100 }));
            setGenerating(false);
            setJobLogs(prev => [...prev.slice(-80), `[${new Date().toLocaleTimeString()}] ✔ Audio generation completed.`]);
          } catch {
            setGenerating(false);
          }
        });

        eventSource.addEventListener('failed', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            setActiveJob(prev => ({ ...prev, ...data, status: 'failed' }));
            setError(data.error || 'Audio generation failed.');
            setGenerating(false);
            setJobLogs(prev => [...prev.slice(-80), `[${new Date().toLocaleTimeString()}] ❌ Failed: ${data.error || 'Unknown error'}`]);
          } catch {
            setGenerating(false);
          }
        });

        eventSource.addEventListener('cancelled', () => {
          setActiveJob(prev => ({ ...prev, status: 'cancelled', message: 'Cancelled by user.' }));
          setGenerating(false);
          setJobLogs(prev => [...prev.slice(-80), `[${new Date().toLocaleTimeString()}] ⚠ Generation cancelled.`]);
        });

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          reconnectTimeout = setTimeout(connectSSE, 4000);
        };
      } catch {
        reconnectTimeout = setTimeout(connectSSE, 5000);
      }
    };

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [checkActiveStatus]);

  useEffect(() => {
    if (!generating) return;
    const interval = setInterval(() => {
      setElapsedSec(s => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [generating]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [jobLogs]);

  const cancelGeneration = async () => {
    try {
      onAddLog?.('WARN', 'Requesting audio generation cancellation...');
      await fetch('/api/audio/cancel', { method: 'POST' });
      setGenerating(false);
      setActiveJob(prev => prev ? { ...prev, status: 'cancelled', message: 'Cancelled by user.' } : null);
      setJobLogs(prev => [...prev.slice(-80), `[${new Date().toLocaleTimeString()}] ⚠ Cancelled by user.`]);
    } catch (e: any) {
      setError(e?.message || 'Failed to cancel audio generation.');
    }
  };

  const handleFreeGpuVram = async () => {
    setFreeingVram(true);
    setVramFreedMessage(null);
    try {
      onAddLog?.('INFO', 'Purging ComfyUI model cache to recover GPU VRAM...');
      const r = await fetch('/api/comfy/clear-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unload_models: true, free_memory: true })
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.success) {
        setVramFreedMessage('GPU VRAM freed successfully! ComfyUI models evicted from VRAM.');
        onAddLog?.('SEC', 'GPU VRAM recovered: ComfyUI cache unloaded.');
      } else {
        setVramFreedMessage(d.message || d.error || 'VRAM purge request completed.');
      }
      await fetchDiagnostics();
    } catch (e: any) {
      setVramFreedMessage(`Free VRAM error: ${e?.message || e}`);
    } finally {
      setFreeingVram(false);
    }
  };

  const handleCopyLogs = () => {
    const textToCopy = jobLogs.join('\n');
    navigator.clipboard?.writeText(textToCopy);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  const stopPreview = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayingVoiceId(null);
  };

  const previewVoice = async (voice:VoiceRecord) => {
    setError(null);
    if (playingVoiceId === voice.voice_id) {
      stopPreview();
      return;
    }

    if (voice.preview_audio_url) {
      setPreviewUrl(voice.preview_audio_url);
      setPlayingVoiceId(voice.voice_id);
      if (audioRef.current) {
        audioRef.current.src = voice.preview_audio_url;
        audioRef.current.play().catch(() => {});
      }
      return;
    }

    setPreviewingVoiceId(voice.voice_id);
    try {
      const r = await fetch('/api/audio/preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({voice_id:voice.voice_id,engine:voice.engine_compatibility.includes('bark') ? 'bark' : 'xtts_v2',voice_preset:voice.bark_prompt_path || voice.speaker_name,speaker:voice.speaker_name,speaker_wav:voice.xtts_embedding_path || undefined})});
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error || 'Preview failed.');
      setPreviewUrl(d.url);
      setPlayingVoiceId(voice.voice_id);
      setVoices(prev => prev.map(v => v.voice_id === voice.voice_id ? { ...v, preview_audio_url: d.url } : v));
      if (audioRef.current) {
        audioRef.current.src = d.url;
        audioRef.current.play().catch(() => {});
      }
    } catch (e:any) { setError(e?.message || 'Voice preview failed.'); }
    finally { setPreviewingVoiceId(null); }
  };

  const addRow = () => setRows(prev => [...prev,{id:`row_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,text:'',engine:'xtts_v2',voicePreset:'xtts_ana_florence',language:'en'}]);
  const removeRow = (id:string) => setRows(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    setResult(null);
    setBatchResults([]);
    setElapsedSec(0);
    const startMsg = `Starting ${engine === 'bark' ? 'Bark' : 'XTTS v2'} synthesis request...`;
    setJobLogs([`[${new Date().toLocaleTimeString()}] ${startMsg}`]);
    setActiveJob({
      status: 'running',
      stage: 'Connecting',
      message: 'Dispatching audio job to Python backend...',
      percent: 5,
      engine: engine === 'bark' ? 'Bark' : 'XTTS v2',
      startTime: Date.now(),
      elapsedSec: 0,
    });
    try {
      const basePayload:any = { engine, mode, text, timeline:rows, voice_preset:selectedVoice?.bark_prompt_path || selectedVoice?.speaker_name || voiceId, speaker:selectedVoice?.speaker_name, speaker_wav:clonePath || selectedVoice?.xtts_embedding_path || undefined, language, temperature, repetition_penalty:repetitionPenalty, length_penalty:lengthPenalty, seed, seed_locked:seedLocked, strip_tags_on_xtts:stripTags, auto_split_chunks:autoSplit, normalize, trim_silence:trimSilence, pitch_shift_semitones:pitchShiftSemitones, formant_shift:formantShift, speed_factor:speedFactor, enable_streaming:enableStreaming && batchSize === 1, output_format:format };
      const results:any[] = [];
      for (let i=0; i<Math.max(1,Math.min(4,batchSize)); i++) {
        const payload = {...basePayload};
        if (batchMode === 'iterate_seeds') payload.seed = seedLocked ? seed : (seed < 0 ? makeSeed() : seed + i);
        if (batchMode === 'iterate_voices' && filteredVoices[i]) { payload.voice_preset = filteredVoices[i].bark_prompt_path || filteredVoices[i].speaker_name; payload.speaker = filteredVoices[i].speaker_name; payload.speaker_wav = filteredVoices[i].xtts_embedding_path || payload.speaker_wav; }
        const r = await fetch('/api/audio/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
        if (enableStreaming && batchSize === 1) {
          if (!r.ok) {
            const failure = await r.json().catch(() => ({}));
            if (Array.isArray(failure.logs) && failure.logs.length) {
              setJobLogs(failure.logs);
            }
            throw new Error(failure.error || `Generation failed (HTTP ${r.status})`);
          }
          const blob = await r.blob();
          const url = URL.createObjectURL(blob);
          results.push({ok:true,url,path:'streamed',bytes:blob.size,seed:Number(payload.seed)});
        } else {
          const d = await r.json();
          if (!r.ok || !d.ok) {
            if (Array.isArray(d?.logs) && d.logs.length) {
              setJobLogs(d.logs);
            }
            throw new Error(d?.error || `Generation failed (HTTP ${r.status})`);
          }
          results.push(d);
        }
      }
      const first = results[0];
      setResult(first);
      setBatchResults(results);
      setActiveJob(prev => ({ ...(prev || {}), status: 'completed', percent: 100, message: 'Audio synthesis complete!' }));
      onAddLog?.('SEC', `Unified Audio generated ${results.length} variation${results.length===1?'':'s'} using ${engine === 'bark' ? 'Bark' : 'XTTS v2'}.`);
    } catch (e:any) {
      const errorMsg = e?.message || 'Unified audio generation failed.';
      setError(errorMsg);
      setActiveJob(prev => ({ ...(prev || {}), status: 'failed', error: errorMsg }));
    } finally {
      setGenerating(false);
    }
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
      {!audioDiagnostics?.ok && (
        <div className="mt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="text-amber-200/80 break-words flex-1 text-[10px]">
            <div>{audioDiagnostics?.error || 'Checking TTS, Bark and pydub…'}</div>
            <div className="mt-1 text-[9px] text-amber-300/70 font-sans">
              To resolve on your PC: Click <strong>Run Auto Repair</strong> or run <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-200 font-mono">repair_audio.bat</code> in <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-200 font-mono">C:\Gina_AI</code>.
            </div>
          </div>
          <button
            onClick={() => void handleRepair()}
            disabled={repairing}
            className="px-3 py-1.5 rounded border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
          >
            <Wrench className={`w-3.5 h-3.5 ${repairing ? 'animate-spin' : ''}`} />
            {repairing ? 'Repairing Dependencies...' : 'Run Auto Repair'}
          </button>
        </div>
      )}
      {repairLog && (
        <div className="mt-1.5 text-[9px] text-slate-400 font-mono border-t border-slate-800/80 pt-1.5">
          {repairLog}
        </div>
      )}
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

        {error && (
          <div className="p-3 rounded-lg border border-rose-500/40 bg-rose-500/10 text-xs text-rose-200 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-rose-300">Generation Failed</div>
                  <div className="text-[11px] text-rose-200/90 mt-0.5 break-words font-mono">{error}</div>
                </div>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-slate-400 hover:text-rose-200 text-[9px] uppercase tracking-wider shrink-0"
              >
                Dismiss
              </button>
            </div>
            {(error.toLowerCase().includes('module') || error.toLowerCase().includes('import') || error.toLowerCase().includes('torch') || error.toLowerCase().includes('tts') || error.toLowerCase().includes('bark')) && (
              <div className="pt-2 border-t border-rose-500/20 flex items-center justify-between">
                <span className="text-[10px] text-rose-300">Missing Python audio dependencies detected.</span>
                <button
                  onClick={() => void handleRepair()}
                  disabled={repairing}
                  className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-[9px] font-bold text-rose-100 flex items-center gap-1 cursor-pointer"
                >
                  <Wrench className={`w-3 h-3 ${repairing ? 'animate-spin' : ''}`} />
                  {repairing ? 'Repairing...' : 'Run Auto Repair'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Live Audio Generation & Diagnostics Monitor */}
        {(generating || (activeJob && (activeJob.status === 'running' || activeJob.status === 'completed' || activeJob.status === 'failed' || activeJob.status === 'cancelled'))) && (
          <div className="rounded-xl border border-emerald-500/30 bg-slate-900/90 p-4 space-y-3 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                {generating ? (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                ) : activeJob?.status === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : activeJob?.status === 'cancelled' ? (
                  <XCircle className="w-4 h-4 text-amber-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                )}
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-200">
                  {generating ? 'SYNTHESIZING AUDIO' : activeJob?.status === 'completed' ? 'SYNTHESIS COMPLETE' : activeJob?.status === 'cancelled' ? 'SYNTHESIS CANCELLED' : 'SYNTHESIS STOPPED'}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[8px] font-bold uppercase text-slate-300 font-mono">
                  {activeJob?.engine || (engine === 'bark' ? 'BARK' : 'XTTS v2')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {activeJob?.device && (
                  <span className={`px-2 py-0.5 rounded border text-[8px] font-mono flex items-center gap-1 ${
                    activeJob.device === 'cuda'
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                      : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                  }`}>
                    {activeJob.device === 'cuda' ? <Zap className="w-3 h-3 text-emerald-400" /> : <Cpu className="w-3 h-3 text-amber-400" />}
                    {activeJob.device === 'cuda' ? 'CUDA GPU' : 'CPU MODE'}
                  </span>
                )}
                <span className="text-[10px] font-mono text-slate-300 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {formatTime(elapsedSec)}
                </span>
                {generating && (
                  <button
                    onClick={cancelGeneration}
                    className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Progress Bar & Stage description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-300 font-medium truncate">
                  {activeJob?.message || (generating ? 'Running voice synthesis backend...' : 'Ready.')}
                </span>
                <span className="font-mono font-bold text-emerald-400 shrink-0 ml-2">
                  {Math.round(activeJob?.percent ?? (generating ? 10 : 0))}%
                </span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className={`h-full transition-all duration-300 ${
                    activeJob?.status === 'failed'
                      ? 'bg-rose-500'
                      : activeJob?.status === 'cancelled'
                      ? 'bg-amber-500'
                      : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(3, activeJob?.percent ?? (generating ? 15 : 0)))}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[8px] font-mono text-slate-500">
                <span>Stage: {activeJob?.stage || (generating ? 'Processing' : 'Idle')}</span>
                {activeJob?.totalRows ? (
                  <span>Row {activeJob.row || 1} of {activeJob.totalRows}</span>
                ) : (
                  <span>Format: {format.toUpperCase()} · Seed: {seedLocked ? seed : 'Auto'}</span>
                )}
              </div>
            </div>

            {/* VRAM Pressure Warning and One-Click Cache Purge */}
            {(activeJob?.vramWarning || activeJob?.device === 'cpu') && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-[10px] text-amber-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div className="flex items-start gap-2 flex-1">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-amber-300">GPU VRAM Constrained · Running Safely on CPU</div>
                      <div className="text-[9px] text-amber-200/80 mt-0.5">
                        ComfyUI or background models currently occupy ~7.5 GB of your 8 GB VRAM. Generation is executing on CPU to prevent CUDA OOM crash.
                      </div>
                      {vramFreedMessage && (
                        <div className="mt-1 text-[9px] text-emerald-300 font-mono">{vramFreedMessage}</div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleFreeGpuVram}
                    disabled={freeingVram}
                    className="px-2.5 py-1.5 rounded bg-amber-500/25 hover:bg-amber-500/35 border border-amber-500/50 text-amber-100 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
                  >
                    <RotateCcw className={`w-3 h-3 ${freeingVram ? 'animate-spin' : ''}`} />
                    {freeingVram ? 'Freeing VRAM...' : 'Free GPU VRAM (Unload ComfyUI)'}
                  </button>
                </div>
              </div>
            )}

            {/* Real-time Process Terminal Log Box */}
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-2 text-[10px]">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5 mb-1.5">
                <button
                  onClick={() => setShowLogs(prev => !prev)}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 font-mono text-[9px] font-bold uppercase tracking-wider cursor-pointer"
                >
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  Live Process Terminal Output ({jobLogs.length} lines)
                  {showLogs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCopyLogs}
                    className="px-2 py-0.5 rounded border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200 text-[8px] font-mono flex items-center gap-1 cursor-pointer"
                  >
                    {copiedLog ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedLog ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    onClick={() => setJobLogs([])}
                    className="px-2 py-0.5 rounded border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200 text-[8px] font-mono cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>
              {showLogs && (
                <div
                  ref={logContainerRef}
                  className="max-h-40 overflow-y-auto font-mono text-[9px] text-slate-400 space-y-1 custom-scrollbar bg-slate-950/80 p-2 rounded border border-slate-900"
                >
                  {jobLogs.length === 0 ? (
                    <div className="text-slate-600 italic">Waiting for process output events...</div>
                  ) : (
                    jobLogs.map((log, idx) => (
                      <div
                        key={idx}
                        className={`leading-relaxed break-all ${
                          log.includes('❌') || log.includes('Error') || log.includes('Traceback') || log.includes('FAILED')
                            ? 'text-rose-400'
                            : log.includes('⚠') || log.includes('WARNING') || log.includes('warning')
                            ? 'text-amber-400'
                            : log.includes('✔') || log.includes('Saved') || log.includes('complete')
                            ? 'text-emerald-300'
                            : 'text-slate-300'
                        }`}
                      >
                        {log}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <button
          onClick={() => void generate()}
          disabled={generating || !(mode === 'standard' ? text.trim() : rows.some(r => r.text.trim()))}
          className="w-full py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold uppercase tracking-widest text-[10px] disabled:opacity-30 flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-lg"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              Generating Audio ({formatTime(elapsedSec)} · {activeJob?.stage || 'Synthesizing'} {Math.round(activeJob?.percent || 0)}%)
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              Generate Audio
            </>
          )}
        </button>

        {batchResults.length > 0 && <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3"><div className="text-[9px] uppercase tracking-widest text-emerald-300 font-bold mb-2">Batch Matrix · {batchResults.length} variation{batchResults.length===1?'':'s'}</div><div className="grid grid-cols-1 md:grid-cols-2 gap-2">{batchResults.map((item,index)=><div key={`${item.seed}-${index}`} className="rounded border border-slate-800 bg-slate-950 p-2"><div className="flex items-center justify-between text-[8px] font-mono text-slate-500"><span>Variation {index+1} · Seed {item.seed}</span><a href={item.url} download className="text-emerald-300 flex items-center gap-1"><Download className="w-3 h-3"/>Save</a></div><audio controls src={item.url} className="w-full mt-2"/></div>)}</div></div>}
      </div>

      <aside className="col-span-12 xl:col-span-4 rounded-lg border border-slate-800 bg-slate-900/50 p-3 min-w-0">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Voice Database</div>
          <Search className="w-3.5 h-3.5 text-slate-600"/>
        </div>
        <div className="flex gap-1 mb-2">
          {(['system','cloned','community'] as const).map(c => (
            <button key={c} onClick={()=>setVoiceCategory(c)} className={`flex-1 py-1.5 rounded border text-[8px] font-bold uppercase ${voiceCategory===c?'border-emerald-400 text-emerald-300':'border-slate-700 text-slate-500'}`}>
              {c==='cloned'?'My Cloned Voices':c==='community'?'Shared':'System Presets'}
            </button>
          ))}
        </div>
        <input value={voiceSearch} onChange={e=>setVoiceSearch(e.target.value)} placeholder="Search speaker, accent or tone…" className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-300 mb-3"/>
        <div className="space-y-1.5 max-h-[420px] overflow-y-auto custom-scrollbar">
          {filteredVoices.map(v => (
            <div key={v.voice_id} className={`p-2 rounded border ${voiceId===v.voice_id?'border-emerald-500/40 bg-emerald-500/5':'border-slate-800 bg-slate-950'}`}>
              <div className="flex items-start gap-2">
                <button onClick={()=>setVoiceId(v.voice_id)} className="flex-1 text-left min-w-0">
                  <div className="text-xs text-slate-200 font-semibold truncate">{v.speaker_name}</div>
                  <div className="text-[8px] text-slate-600 truncate">{v.gender} · {v.age_group} · {v.primary_language} · {v.accent_dialect}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {v.engine_compatibility.map(e => (
                      <span key={e} className={`px-1 rounded text-[7px] font-bold uppercase ${e==='xtts'?'bg-emerald-500/15 text-emerald-300':'bg-sky-500/15 text-sky-300'}`}>
                        {e==='xtts'?'XTTS':'BARK'}
                      </span>
                    ))}
                    {v.tone_tags.slice(0,3).map(t => (
                      <span key={t} className="px-1 rounded bg-slate-800 text-slate-500 text-[7px]">{t}</span>
                    ))}
                  </div>
                </button>
                <button
                  title={previewingVoiceId === v.voice_id ? "Generating preview..." : playingVoiceId === v.voice_id ? "Stop preview" : "Preview voice"}
                  onClick={() => void previewVoice(v)}
                  disabled={previewingVoiceId === v.voice_id}
                  className={`p-1.5 rounded border transition-colors ${
                    playingVoiceId === v.voice_id
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 animate-pulse'
                      : previewingVoiceId === v.voice_id
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                      : 'border-slate-700 text-slate-400 hover:text-emerald-300 hover:border-emerald-500/40'
                  }`}
                >
                  {previewingVoiceId === v.voice_id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : playingVoiceId === v.voice_id ? (
                    <Square className="w-3 h-3 fill-emerald-300" />
                  ) : (
                    <Play className="w-3 h-3" />
                  )}
                </button>
                <button title="Favorite" onClick={()=>void toggleFavorite(v)} className={`p-1.5 rounded border ${v.favorite?'border-amber-400/50 text-amber-300':'border-slate-700 text-slate-600'}`}>
                  <Heart className="w-3 h-3" fill={v.favorite?'currentColor':'none'}/>
                </button>
              </div>
            </div>
          ))}
          {!filteredVoices.length && <div className="text-[9px] text-slate-600 text-center py-8">No matching voices.</div>}
        </div>
        {engine==='xtts_v2' && (
          <div {...drop.getRootProps()} className={`mt-3 rounded-lg border border-dashed p-4 text-center cursor-pointer ${drop.isDragActive?'border-emerald-400 bg-emerald-500/10':'border-slate-700 bg-slate-950'}`}>
            <input {...drop.getInputProps()}/>
            <Upload className="w-5 h-5 mx-auto text-emerald-300"/>
            <div className="text-[9px] font-bold text-slate-300 mt-2">Drop 3–10s XTTS reference</div>
            <div className="text-[8px] text-slate-600 mt-1">WAV or MP3 · clean speech · stored locally</div>
            {clonePath && <div className="text-[8px] text-emerald-300 mt-2 truncate">Clone ready: {clonePath.split(/[\\/]/).pop()}</div>}
          </div>
        )}
        {engine==='xtts_v2' && (
          <select value={language} onChange={e=>setLanguage(e.target.value)} className="mt-3 w-full bg-slate-950 border border-slate-800 rounded px-2 py-2 text-[9px] text-slate-300">
            {LANGUAGES.map(l=><option key={l}>{l}</option>)}
          </select>
        )}
        <div className="mt-3 border-t border-slate-800/80 pt-2.5">
          {playingVoiceId && (
            <div className="flex items-center justify-between text-[9px] text-emerald-300 mb-1.5 font-medium">
              <span className="flex items-center gap-1.5"><Volume2 className="w-3.5 h-3.5 animate-pulse text-emerald-400" /> Playing: {voices.find(x => x.voice_id === playingVoiceId)?.speaker_name || 'Voice sample'}</span>
              <button onClick={stopPreview} className="text-slate-400 hover:text-rose-300 text-[8px] uppercase tracking-wider">Stop</button>
            </div>
          )}
          <audio
            ref={audioRef}
            controls
            src={previewUrl || undefined}
            onEnded={() => setPlayingVoiceId(null)}
            onPause={() => setPlayingVoiceId(null)}
            className={`w-full ${previewUrl ? 'block' : 'hidden'}`}
          />
        </div>
      </aside>
    </div>
  </section>;
};
