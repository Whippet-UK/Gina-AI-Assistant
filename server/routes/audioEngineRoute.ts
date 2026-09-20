import { Router, Request, Response } from 'express';
import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { readFileSync } from 'node:fs';
import { listVoices, setFavorite, upsertVoice } from '../audio/VoiceDatabase.js';

const router = Router();
const GINA_ROOT = process.env.GINA_ROOT || (process.platform === 'win32' ? 'C:\\Gina_AI' : process.cwd());
const AUDIO_ROOT = path.resolve(GINA_ROOT, 'media', 'unified_audio');
const CLONE_ROOT = path.resolve(GINA_ROOT, 'media', 'unified_audio', 'voices', 'clones');
const CONFIGURED_PYTHON = process.env.GINA_AUDIO_PYTHON || '';
const PYTHON_BINDING_FILE = path.join(GINA_ROOT, '.gina', 'audio_python.json');
type PythonCandidate = { label:string; command:string; args:string[]; executable?:string };
let resolvedPython: PythonCandidate | null = null;
const SCRIPT = path.resolve(process.cwd(), 'scripts', 'unified_audio_backend.py');
const execFileAsync = promisify(execFile);

function pythonCandidates(): PythonCandidate[] {
  const candidates: PythonCandidate[] = [];
  if (CONFIGURED_PYTHON) candidates.push({label:'GINA_AUDIO_PYTHON', command:CONFIGURED_PYTHON, args:[], executable:CONFIGURED_PYTHON});
  candidates.push({label:'Gina g_env', command:path.join(GINA_ROOT, 'g_env', 'Scripts', 'python.exe'), args:[], executable:path.join(GINA_ROOT, 'g_env', 'Scripts', 'python.exe')});
  try {
    const raw = readFileSync(PYTHON_BINDING_FILE, 'utf8');
    const bound = String(JSON.parse(raw)?.python || '').trim();
    if (bound) candidates.unshift({label:'Saved Gina audio interpreter', command:bound, args:[], executable:bound});
  } catch {}
  candidates.push({label:'Windows python command', command:'python', args:[], executable:'python'});
  if (process.platform === 'win32') {
    candidates.push({label:'Windows Python Launcher 3.12', command:'py', args:['-3.12'], executable:'py -3.12'});
    candidates.push({label:'Windows Python Launcher default', command:'py', args:[], executable:'py'});
  }
  const unique = new Map<string, PythonCandidate>();
  for (const candidate of candidates) unique.set(`${candidate.command}|${candidate.args.join(' ')}`, candidate);
  return [...unique.values()];
}

async function interpreterCheck(candidate: PythonCandidate): Promise<{ok:boolean; error?:string; executable?:string}> {
  try {
    const result = await execFileAsync(candidate.command, [...candidate.args, '-c', 'import sys; import TTS, bark, pydub; print(sys.executable); print(TTS.__file__); print(bark.__file__); print(pydub.__file__)'], { cwd: GINA_ROOT, windowsHide: true, timeout: 20000, maxBuffer: 1024 * 1024 });
    const lines = String(result.stdout || '').trim().split(/\r?\n/).filter(Boolean);
    return {ok:true, executable:lines[0] || candidate.executable || candidate.command};
  } catch (error:any) {
    const detail = String(error?.stderr || error?.message || error || '').trim().replace(/\s+/g,' ').slice(0,500);
    return {ok:false, error:detail || 'Python interpreter check failed.'};
  }
}

async function resolvePython(): Promise<PythonCandidate> {
  if (resolvedPython) return resolvedPython;
  const diagnostics:string[] = [];
  for (const candidate of pythonCandidates()) {
    const result = await interpreterCheck(candidate);
    if (result.ok) {
      resolvedPython = {...candidate, executable:result.executable || candidate.executable};
      return resolvedPython;
    }
    diagnostics.push(`${candidate.label}: ${result.error}`);
  }
  throw new Error(`Unified audio Python environment is not usable. TTS, bark and pydub must import in the same interpreter. ${diagnostics.join(' | ')}`);
}

async function runPython(payload: any): Promise<any> {
  await fs.mkdir(AUDIO_ROOT, { recursive: true });
  return new Promise((resolve, reject) => {
    resolvePython().then((python) => {
    const child = spawn(python.command, [...python.args, SCRIPT], { cwd: GINA_ROOT, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = ''; let stderr = '';
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => { stdout += chunk; }); child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => {
      let parsed: any = null;
      try { parsed = JSON.parse(stdout.trim().split(/\r?\n/).filter(Boolean).pop() || '{}'); } catch {}
      if (code !== 0 || !parsed?.ok) return reject(new Error(parsed?.error || stderr.trim() || `Unified audio backend exited with code ${code}`));
      resolve(parsed);
    });
    child.stdin.end(JSON.stringify(payload));
    });
  }).catch(reject);
}

router.get('/diagnostics', async (_req: Request, res: Response) => {
  const db = await import('../audio/VoiceDatabase.js');
  try {
    const python = await resolvePython();
    const version = await execFileAsync(python.command, [...python.args, '-c', 'import sys; print(sys.executable); import TTS, bark, pydub; print(TTS.__file__); print(bark.__file__); print(pydub.__file__)'], { cwd: GINA_ROOT, windowsHide: true, timeout: 20000, maxBuffer: 1024 * 1024 });
    const dbCheck = db.testDatabase();
    res.json({ ok:true, databasePath: dbCheck.path, databaseWritable: dbCheck.writable, python: python.executable || python.command, imports: String(version.stdout || '').trim().split(/\r?\n/).filter(Boolean), candidates: pythonCandidates().map(c => ({label:c.label, command:c.command, args:c.args})) });
  } catch (error: any) {
    let dbCheck:any = null;
    try { dbCheck = db.testDatabase(); } catch (dbError:any) { dbCheck = {ok:false, error:String(dbError?.message || dbError)}; }
    res.status(503).json({ ok:false, databasePath: dbCheck?.path || db.CURRENT_DB_PATH, databaseWritable: dbCheck?.writable ?? false, databaseError: dbCheck?.error || null, error:error?.message || 'Unified audio dependencies are not available.', candidates: pythonCandidates().map(c => ({label:c.label, command:c.command, args:c.args})) });
  }
});

router.get('/voices', async (req: Request, res: Response) => {
  try {
    const voices = await listVoices({ category: String(req.query.category || ''), q: String(req.query.q || ''), gender: String(req.query.gender || ''), language: String(req.query.language || ''), accent: String(req.query.accent || ''), tone: String(req.query.tone || '') });
    res.json({ ok: true, voices });
  } catch (error: any) { res.status(500).json({ ok: false, error: error?.message || 'Voice database query failed.' }); }
});

router.post('/voices/:voiceId/favorite', async (req: Request, res: Response) => {
  try { setFavorite(req.params.voiceId, Boolean(req.body?.favorite)); res.json({ ok: true }); }
  catch (error: any) { res.status(500).json({ ok:false, error:error?.message || 'Unable to update favorite.' }); }
});

router.post('/voice-clone', expressRawAudio(), async (req: Request, res: Response) => {
  try {
    const original = safeFilename(decodeURIComponent(String(req.headers['x-gina-filename'] || 'voice-reference.wav')));
    const ext = path.extname(original).toLowerCase();
    if (!['.wav','.mp3'].includes(ext)) return res.status(400).json({ ok:false, error:'XTTS cloning accepts WAV or MP3 references.' });
    const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || []);
    if (!buffer.length) return res.status(400).json({ ok:false, error:'Voice reference is empty.' });
    if (buffer.length > 30 * 1024 * 1024) return res.status(413).json({ ok:false, error:'Voice reference exceeds 30 MB.' });
    await fs.mkdir(CLONE_ROOT, { recursive:true });
    const filename = `clone_${Date.now()}_${Math.random().toString(36).slice(2,8)}${ext}`;
    const target = path.join(CLONE_ROOT, filename);
    await fs.writeFile(target, buffer);
    try {
      const probe = await execFileAsync('ffprobe', ['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',target], { windowsHide:true, timeout:15000, maxBuffer:1024*1024 });
      const duration = Number(String(probe.stdout || '').trim());
      if (!Number.isFinite(duration) || duration < 3 || duration > 10) {
        await fs.rm(target,{force:true});
        return res.status(400).json({ok:false,error:`XTTS voice reference must be 3–10 seconds; received ${Number.isFinite(duration) ? duration.toFixed(2) : 'an unreadable'} seconds.`});
      }
    } catch (probeError:any) {
      await fs.rm(target,{force:true});
      return res.status(400).json({ok:false,error:`Could not validate the voice sample duration with ffprobe: ${probeError?.message || probeError}`});
    }
    const voiceId = `clone_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
    const voice = await upsertVoice({ voice_id:voiceId, speaker_name:path.basename(original, ext), gender:'Non-binary', age_group:'Young Adult', primary_language:'en', accent_dialect:'Custom', tone_tags:['Cloned','Custom'], engine_compatibility:['xtts'], xtts_embedding_path:target, bark_prompt_path:null, preview_audio_url:null, category:'cloned', favorite:false });
    res.status(201).json({ ok:true, path:target, voice });
  } catch (error:any) { res.status(500).json({ ok:false, error:error?.message || 'Voice clone upload failed.' }); }
});

router.post('/generate', async (req: Request, res: Response) => {
  try {
    const payload = { ...req.body };
    if (payload.voiceClonePath) {
      const candidate = path.resolve(String(payload.voiceClonePath));
      if (!candidate.startsWith(CLONE_ROOT + path.sep) && !candidate.startsWith(AUDIO_ROOT + path.sep)) throw new Error('Voice clone path is outside Gina audio storage.');
      payload.speaker_wav = candidate;
    }
    const result = await runPython(payload);
    if (Boolean(payload.enable_streaming)) {
      const contentType = payload.output_format === 'mp3' ? 'audio/mpeg' : payload.output_format === 'flac' ? 'audio/flac' : 'audio/wav';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', String(result.bytes));
      res.setHeader('Content-Disposition', `inline; filename=\"${path.basename(result.path)}\"`);
      const stream = (await import('fs')).createReadStream(result.path);
      stream.on('error', error => { if (!res.headersSent) res.status(500); res.end(String(error)); });
      stream.pipe(res);
      return;
    }
    res.json(result);
  } catch (error:any) { res.status(500).json({ ok:false, error:error?.message || 'Unified audio generation failed.' }); }
});

router.post('/preview', async (req: Request, res: Response) => {
  try {
    const result = await runPython({ engine:req.body?.engine || 'bark', mode:'standard', text:'Hello, this is a preview of my voice style.', voice_preset:req.body?.voice_preset || 'v2/en_speaker_6', speaker:req.body?.speaker, speaker_wav:req.body?.speaker_wav, output_format:'wav', normalize:true, trim_silence:true, temperature:0.7 });
    const voiceId = String(req.body?.voice_id || '').trim();
    if (voiceId) { const voice = (await listVoices({ q:voiceId }))[0]; if (voice) await upsertVoice({...voice, preview_audio_url:result.url}); }
    res.json(result);
  } catch (error:any) { res.status(500).json({ ok:false, error:error?.message || 'Voice preview failed.' }); }
});

function expressRawAudio() {
  return (req: Request, res: Response, next: (error?: any) => void) => {
    const declared = Number(req.headers['content-length'] || 0);
    if (declared > 30 * 1024 * 1024) { res.status(413).json({ok:false,error:'Voice reference exceeds 30 MB.'}); return; }
    const chunks: Buffer[] = [];
    let received = 0;
    req.on('data', chunk => { const buffer = Buffer.from(chunk); received += buffer.length; if (received > 30 * 1024 * 1024) { req.destroy(); return; } chunks.push(buffer); });
    req.on('end', () => { (req as any).body = Buffer.concat(chunks); next(); });
    req.on('error', (error) => next(error));
  };
}

export default router;
