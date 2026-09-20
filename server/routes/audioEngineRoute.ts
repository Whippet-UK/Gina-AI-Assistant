import { Router, Request, Response } from 'express';
import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import fsSync, { readFileSync, existsSync } from 'node:fs';
import { listVoices, setFavorite, upsertVoice } from '../audio/VoiceDatabase.js';
import { generateFallbackPreviewWav } from '../audio/previewFallback.js';

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
const safeFilename = (name: string) => path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');

const CHECK_ENV_SCRIPT = [
  path.resolve(process.cwd(), 'scripts', 'check_audio_env.py'),
  path.resolve(GINA_ROOT, 'scripts', 'check_audio_env.py')
].find(p => {
  try { return readFileSync(p, 'utf8').length > 0; } catch { return false; }
}) || path.resolve(process.cwd(), 'scripts', 'check_audio_env.py');

const SETUP_DEPS_SCRIPT = [
  path.resolve(process.cwd(), 'scripts', 'setup_audio_deps.py'),
  path.resolve(GINA_ROOT, 'scripts', 'setup_audio_deps.py')
].find(p => {
  try { return readFileSync(p, 'utf8').length > 0; } catch { return false; }
}) || path.resolve(process.cwd(), 'scripts', 'setup_audio_deps.py');

function formatPythonError(error: any): string {
  const raw = String(error?.stderr || error?.message || error || '').trim();
  if (!raw) return 'Python interpreter check failed.';
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  // Prioritize meaningful import or traceback error lines
  const errorLine = [...lines].reverse().find(l => l.startsWith('Import check failed:') || l.includes('Error:') || l.includes('Exception:'));
  if (errorLine) return errorLine;
  const tail = lines.slice(-3).join(' · ');
  return tail.length > 350 ? (lines[lines.length - 1] || tail.slice(-350)) : tail;
}

function pythonCandidates(): PythonCandidate[] {
  const candidates: PythonCandidate[] = [];
  if (CONFIGURED_PYTHON) candidates.push({label:'GINA_AUDIO_PYTHON', command:CONFIGURED_PYTHON, args:[], executable:CONFIGURED_PYTHON});

  try {
    const raw = readFileSync(PYTHON_BINDING_FILE, 'utf8');
    const bound = String(JSON.parse(raw)?.python || '').trim();
    if (bound) candidates.push({label:'Saved Gina audio interpreter', command:bound, args:[], executable:bound});
  } catch {}

  const gEnvWin = path.join(GINA_ROOT, 'g_env', 'Scripts', 'python.exe');
  const gEnvLinux = path.join(GINA_ROOT, 'g_env', 'bin', 'python3');
  const gEnvLinuxAlt = path.join(GINA_ROOT, 'g_env', 'bin', 'python');

  if (fsSync.existsSync(gEnvWin)) {
    candidates.push({label:'Gina g_env', command:gEnvWin, args:[], executable:gEnvWin});
  } else if (fsSync.existsSync(gEnvLinux)) {
    candidates.push({label:'Gina g_env', command:gEnvLinux, args:[], executable:gEnvLinux});
  } else if (fsSync.existsSync(gEnvLinuxAlt)) {
    candidates.push({label:'Gina g_env', command:gEnvLinuxAlt, args:[], executable:gEnvLinuxAlt});
  } else if (process.platform === 'win32') {
    candidates.push({label:'Gina g_env', command:gEnvWin, args:[], executable:gEnvWin});
  }

  if (process.platform === 'win32') {
    candidates.push({label:'Windows python command', command:'python', args:[], executable:'python'});
    candidates.push({label:'Windows Python Launcher 3.12', command:'py', args:['-3.12'], executable:'py -3.12'});
    candidates.push({label:'Windows Python Launcher default', command:'py', args:[], executable:'py'});
    const localAppData = process.env.LOCALAPPDATA || '';
    if (localAppData) {
      for (const pyVer of ['Python312', 'Python311', 'Python310']) {
        const p = path.join(localAppData, 'Programs', 'Python', pyVer, 'python.exe');
        if (fsSync.existsSync(p)) {
          candidates.push({label:`Windows ${pyVer}`, command:p, args:[], executable:p});
        }
      }
    }
  } else {
    candidates.push({label:'System python3', command:'python3', args:[], executable:'python3'});
    candidates.push({label:'System python', command:'python', args:[], executable:'python'});
  }

  const unique = new Map<string, PythonCandidate>();
  for (const candidate of candidates) unique.set(`${candidate.command}|${candidate.args.join(' ')}`, candidate);
  return [...unique.values()];
}

async function interpreterCheck(candidate: PythonCandidate): Promise<{ok:boolean; error?:string; executable?:string}> {
  try {
    const result = await execFileAsync(candidate.command, [...candidate.args, CHECK_ENV_SCRIPT], { cwd: GINA_ROOT, windowsHide: true, timeout: 25000, maxBuffer: 1024 * 1024 });
    const lines = String(result.stdout || '').trim().split(/\r?\n/).filter(Boolean);
    return {ok:true, executable:lines[0] || candidate.executable || candidate.command};
  } catch (error:any) {
    const detail = formatPythonError(error);
    return {ok:false, error:detail};
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

let lastPythonCheckTime = 0;
let lastPythonCheckError = '';

export interface ActiveAudioJob {
  id: string;
  startTime: number;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';
  stage: string;
  message: string;
  percent: number;
  device: string;
  vramWarning: boolean;
  row: number;
  totalRows: number;
  engine: string;
  logs: string[];
  childProcess?: any;
  result?: any;
  error?: string;
}

let activeAudioJob: ActiveAudioJob | null = null;
const sseClients: Set<Response> = new Set();

function broadcastAudioEvent(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

function pushAudioLog(text: string) {
  const line = text.trim();
  if (!line) return;
  const timestamp = new Date().toLocaleTimeString('en-GB', { hour12: false });
  const formatted = `[${timestamp}] ${line}`;
  if (activeAudioJob) {
    activeAudioJob.logs.push(formatted);
    if (activeAudioJob.logs.length > 250) {
      activeAudioJob.logs.splice(0, activeAudioJob.logs.length - 250);
    }
  }
  broadcastAudioEvent('log', { text: formatted, raw: line, timestamp });
}

async function getUsablePython(): Promise<PythonCandidate | null> {
  if (resolvedPython) return resolvedPython;
  const now = Date.now();
  if (now - lastPythonCheckTime < 10000 && lastPythonCheckError) {
    return null;
  }
  lastPythonCheckTime = now;
  try {
    return await resolvePython();
  } catch (err: any) {
    lastPythonCheckError = err?.message || String(err);
    return null;
  }
}

async function runPython(payload: any): Promise<any> {
  await fs.mkdir(AUDIO_ROOT, { recursive: true });
  const python = await resolvePython();
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      COQUI_TOS_AGREED: '1',
      PYTHONUNBUFFERED: '1',
      PYTHONIOENCODING: 'utf-8',
      SUNO_USE_SMALL_MODELS: 'True',
      SUNO_OFFLOAD_CPU: 'True',
    };

    const child = spawn(python.command, [...python.args, SCRIPT], {
      cwd: GINA_ROOT,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env,
    });

    const totalRows = Array.isArray(payload.timeline) && payload.timeline.length > 0 ? payload.timeline.length : 1;
    const initialEngine = payload.engine || (Array.isArray(payload.timeline) && payload.timeline[0]?.engine) || 'bark';

    activeAudioJob = {
      id: `audio_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      startTime: Date.now(),
      status: 'running',
      stage: 'initializing',
      message: 'Initializing local audio synthesis engine...',
      percent: 3,
      device: 'auto',
      vramWarning: false,
      row: 1,
      totalRows,
      engine: initialEngine,
      logs: [],
      childProcess: child,
    };

    pushAudioLog(`Starting audio synthesis (mode: ${payload.mode || 'standard'}, engine: ${initialEngine}, total rows: ${totalRows})`);
    broadcastAudioEvent('status', {
      id: activeAudioJob.id,
      status: 'running',
      stage: activeAudioJob.stage,
      message: activeAudioJob.message,
      percent: activeAudioJob.percent,
      device: activeAudioJob.device,
      vramWarning: activeAudioJob.vramWarning,
      row: activeAudioJob.row,
      totalRows: activeAudioJob.totalRows,
      engine: activeAudioJob.engine,
      startTime: activeAudioJob.startTime,
    });

    let stdout = '';
    let stderr = '';
    let stderrBuffer = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');

    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });

    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
      stderrBuffer += chunk;
      const lines = stderrBuffer.split(/\r?\n/);
      stderrBuffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith('GINA_AUDIO_PROGRESS:')) {
          try {
            const prog = JSON.parse(trimmed.slice('GINA_AUDIO_PROGRESS:'.length));
            if (activeAudioJob && activeAudioJob.status === 'running') {
              if (prog.stage) activeAudioJob.stage = prog.stage;
              if (typeof prog.percent === 'number') activeAudioJob.percent = prog.percent;
              if (prog.message) activeAudioJob.message = prog.message;
              if (prog.device) activeAudioJob.device = prog.device;
              if (typeof prog.vram_warning === 'boolean') activeAudioJob.vramWarning = prog.vram_warning;
              if (typeof prog.row === 'number') activeAudioJob.row = prog.row;
              if (typeof prog.total_rows === 'number') activeAudioJob.totalRows = prog.total_rows;
              if (prog.engine) activeAudioJob.engine = prog.engine;
              pushAudioLog(`▶ ${prog.message}`);
              broadcastAudioEvent('progress', {
                id: activeAudioJob.id,
                stage: activeAudioJob.stage,
                percent: activeAudioJob.percent,
                message: activeAudioJob.message,
                device: activeAudioJob.device,
                vramWarning: activeAudioJob.vramWarning,
                row: activeAudioJob.row,
                totalRows: activeAudioJob.totalRows,
                engine: activeAudioJob.engine,
              });
            }
          } catch {}
        } else {
          pushAudioLog(trimmed);
        }
      }
    });

    child.on('error', (err) => {
      if (activeAudioJob) {
        activeAudioJob.status = 'failed';
        activeAudioJob.error = err.message;
        pushAudioLog(`✖ Process spawn error: ${err.message}`);
        broadcastAudioEvent('failed', { id: activeAudioJob.id, error: err.message });
      }
      reject(err);
    });

    child.on('close', (code) => {
      let parsed: any = null;
      try {
        parsed = JSON.parse(stdout.trim().split(/\r?\n/).filter(Boolean).pop() || '{}');
      } catch {}

      if (activeAudioJob && activeAudioJob.status === 'running') {
        if (code === 0 && parsed?.ok) {
          activeAudioJob.status = 'completed';
          activeAudioJob.percent = 100;
          activeAudioJob.message = 'Audio synthesis completed successfully.';
          activeAudioJob.result = parsed;
          pushAudioLog('✔ Audio generation completed successfully.');
          broadcastAudioEvent('completed', { id: activeAudioJob.id, result: parsed });
        } else {
          activeAudioJob.status = 'failed';
          const err = parsed?.error || stderr.trim() || `Unified audio backend exited with code ${code}`;
          activeAudioJob.error = err;
          pushAudioLog(`✖ Audio generation failed: ${err}`);
          broadcastAudioEvent('failed', { id: activeAudioJob.id, error: err });
        }
      }

      if (activeAudioJob?.status === 'cancelled') {
        return reject(new Error('Audio generation was cancelled.'));
      }

      if (code !== 0 || !parsed?.ok) {
        return reject(new Error(parsed?.error || stderr.trim() || `Unified audio backend exited with code ${code}`));
      }
      resolve(parsed);
    });

    try {
      child.stdin.end(JSON.stringify(payload));
    } catch (stdinErr: any) {
      reject(stdinErr);
    }
  });
}

router.post('/repair', async (req: Request, res: Response) => {
  resolvedPython = null;
  lastPythonCheckTime = 0;
  lastPythonCheckError = '';
  req.setTimeout(300000);
  res.setTimeout(300000);
  res.setHeader('Content-Type', 'application/json');

  const candidates = pythonCandidates();
  let py: PythonCandidate | undefined = candidates.find(c => {
    if (path.isAbsolute(c.command)) return fsSync.existsSync(c.command);
    return true;
  });
  if (!py) py = candidates[0];

  if (!py || (path.isAbsolute(py.command) && !fsSync.existsSync(py.command))) {
    return res.status(200).json({
      ok: false,
      error: `No viable Python interpreter found. Ensure Python is installed in C:\\Gina_AI\\g_env or available in system PATH. Checked: ${candidates.map(c => c.command).join(', ')}`,
      needsManualSetup: true
    });
  }

  try {
    const out = await execFileAsync(py.command, [...py.args, SETUP_DEPS_SCRIPT], { cwd: GINA_ROOT, windowsHide: true, timeout: 240000, maxBuffer: 10 * 1024 * 1024 });
    const check = await resolvePython().catch(() => null);
    return res.json({
      ok: Boolean(check),
      message: check ? 'Audio dependencies repaired successfully.' : 'Repair script executed. Verifying interpreter...',
      output: String(out.stdout || '').trim(),
      python: check?.executable || py.command
    });
  } catch (err: any) {
    return res.status(200).json({
      ok: false,
      error: err?.message || 'Repair script execution failed.',
      stderr: String(err?.stderr || '').trim()
    });
  }
});

router.get('/diagnostics', async (_req: Request, res: Response) => {
  const db = await import('../audio/VoiceDatabase.js');
  res.setHeader('Content-Type', 'application/json');
  try {
    const python = await resolvePython();
    const version = await execFileAsync(python.command, [...python.args, CHECK_ENV_SCRIPT], { cwd: GINA_ROOT, windowsHide: true, timeout: 20000, maxBuffer: 1024 * 1024 });
    const dbCheck = db.testDatabase();
    res.json({ ok:true, databasePath: dbCheck.path, databaseWritable: dbCheck.writable, python: python.executable || python.command, imports: String(version.stdout || '').trim().split(/\r?\n/).filter(Boolean), candidates: pythonCandidates().map(c => ({label:c.label, command:c.command, args:c.args})) });
  } catch (error: any) {
    let dbCheck:any = null;
    try { dbCheck = db.testDatabase(); } catch (dbError:any) { dbCheck = {ok:false, error:String(dbError?.message || dbError)}; }
    res.json({ ok:false, databasePath: dbCheck?.path || db.CURRENT_DB_PATH, databaseWritable: dbCheck?.writable ?? false, databaseError: dbCheck?.error || null, error:error?.message || 'Unified audio dependencies are not available.', candidates: pythonCandidates().map(c => ({label:c.label, command:c.command, args:c.args})) });
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

router.get('/active-status', (_req: Request, res: Response) => {
  if (!activeAudioJob) {
    return res.json({ ok: true, active: false, job: null });
  }
  const isRunning = activeAudioJob.status === 'running';
  const elapsedSec = Math.floor((Date.now() - activeAudioJob.startTime) / 1000);
  res.json({
    ok: true,
    active: isRunning,
    job: {
      id: activeAudioJob.id,
      status: activeAudioJob.status,
      stage: activeAudioJob.stage,
      message: activeAudioJob.message,
      percent: activeAudioJob.percent,
      device: activeAudioJob.device,
      vramWarning: activeAudioJob.vramWarning,
      row: activeAudioJob.row,
      totalRows: activeAudioJob.totalRows,
      engine: activeAudioJob.engine,
      startTime: activeAudioJob.startTime,
      elapsedSec,
      logs: activeAudioJob.logs.slice(-50),
      result: activeAudioJob.result,
      error: activeAudioJob.error,
    },
  });
});

router.get('/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  sseClients.add(res);

  if (activeAudioJob) {
    const elapsedSec = Math.floor((Date.now() - activeAudioJob.startTime) / 1000);
    res.write(`event: status\ndata: ${JSON.stringify({
      id: activeAudioJob.id,
      status: activeAudioJob.status,
      stage: activeAudioJob.stage,
      message: activeAudioJob.message,
      percent: activeAudioJob.percent,
      device: activeAudioJob.device,
      vramWarning: activeAudioJob.vramWarning,
      row: activeAudioJob.row,
      totalRows: activeAudioJob.totalRows,
      engine: activeAudioJob.engine,
      elapsedSec,
      logs: activeAudioJob.logs.slice(-30),
    })}\n\n`);
  } else {
    res.write(`event: status\ndata: ${JSON.stringify({ status: 'idle' })}\n\n`);
  }

  const keepAlive = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(keepAlive);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(res);
  });
});

router.post('/cancel', (_req: Request, res: Response) => {
  if (!activeAudioJob || activeAudioJob.status !== 'running') {
    return res.json({ ok: true, message: 'No active audio generation to cancel.' });
  }

  const job = activeAudioJob;
  job.status = 'cancelled';
  job.message = 'Audio generation was cancelled by user.';
  pushAudioLog('⚠ Audio generation was cancelled by user.');

  if (job.childProcess) {
    try {
      const pid = job.childProcess.pid;
      if (process.platform === 'win32' && pid) {
        spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true });
      } else {
        job.childProcess.kill('SIGTERM');
      }
    } catch (err: any) {
      console.error('Failed to terminate child audio process:', err);
    }
  }

  broadcastAudioEvent('cancelled', { id: job.id, message: 'Generation cancelled.' });
  res.json({ ok: true, message: 'Audio generation cancelled.' });
});

router.post('/generate', async (req: Request, res: Response) => {
  req.setTimeout(600000);
  res.setTimeout(600000);
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
  } catch (error:any) {
    res.status(500).json({ ok:false, error:error?.message || 'Unified audio generation failed.', logs: activeAudioJob?.logs || [] });
  }
});

router.post('/preview', async (req: Request, res: Response) => {
  const voiceId = String(req.body?.voice_id || '').trim();
  const speakerName = req.body?.speaker || req.body?.voice_preset || 'Voice Preview';

  const python = await getUsablePython();
  if (!python) {
    try {
      const fallback = await generateFallbackPreviewWav(voiceId || 'preview_sample', speakerName);
      if (voiceId) {
        const voice = (await listVoices({ q: voiceId }))[0];
        if (voice) await upsertVoice({ ...voice, preview_audio_url: fallback.url });
      }
      return res.json({
        ok: true,
        ...fallback,
        mode: 'acoustic_sample'
      });
    } catch (fallbackErr: any) {
      return res.status(500).json({ ok: false, error: fallbackErr?.message || 'Unable to synthesize preview.' });
    }
  }

  try {
    const result = await runPython({
      engine: req.body?.engine || 'bark',
      mode: 'standard',
      text: 'Hello, this is a preview of my voice style.',
      voice_preset: req.body?.voice_preset || 'v2/en_speaker_6',
      speaker: req.body?.speaker,
      speaker_wav: req.body?.speaker_wav,
      output_format: 'wav',
      normalize: true,
      trim_silence: true,
      temperature: 0.7
    });
    if (voiceId) {
      const voice = (await listVoices({ q: voiceId }))[0];
      if (voice) await upsertVoice({ ...voice, preview_audio_url: result.url });
    }
    return res.json(result);
  } catch (_error: any) {
    try {
      const fallback = await generateFallbackPreviewWav(voiceId || 'preview_sample', speakerName);
      if (voiceId) {
        const voice = (await listVoices({ q: voiceId }))[0];
        if (voice) await upsertVoice({ ...voice, preview_audio_url: fallback.url });
      }
      return res.json({
        ok: true,
        ...fallback,
        mode: 'acoustic_sample'
      });
    } catch (fallbackErr: any) {
      return res.status(500).json({ ok: false, error: fallbackErr?.message || 'Unable to synthesize preview.' });
    }
  }
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
