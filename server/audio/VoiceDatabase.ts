import { accessSync, constants, mkdirSync } from 'node:fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

export type VoiceGender = 'Male' | 'Female' | 'Non-binary';
export type VoiceAgeGroup = 'Child' | 'Young Adult' | 'Middle Aged' | 'Senior';

export interface VoiceRecord {
  voice_id: string;
  speaker_name: string;
  gender: VoiceGender;
  age_group: VoiceAgeGroup;
  primary_language: string;
  accent_dialect: string;
  tone_tags: string[];
  engine_compatibility: string[];
  xtts_embedding_path: string | null;
  bark_prompt_path: string | null;
  preview_audio_url: string | null;
  category: 'system' | 'cloned' | 'community';
  favorite: boolean;
}

const ROOT = process.env.GINA_ROOT || (process.platform === 'win32' ? 'C:\\Gina_AI' : process.cwd());
const PRIMARY_DB_DIR = path.join(ROOT, 'data', 'audio');
const FALLBACK_DB_DIR = path.join(ROOT, '.gina', 'data', 'audio');
let ACTIVE_DB_DIR = PRIMARY_DB_DIR;
let ACTIVE_DB_PATH = path.join(ACTIVE_DB_DIR, 'voices.sqlite');
export const DB_PATH = ACTIVE_DB_PATH;

function ensureDbLocation(): string {
  const locations = [PRIMARY_DB_DIR, FALLBACK_DB_DIR];
  let lastError: any = null;
  for (const dir of locations) {
    const candidate = path.join(dir, 'voices.sqlite');
    try {
      mkdirSync(dir, { recursive: true });
      accessSync(dir, constants.R_OK | constants.W_OK);
      // Directory permissions alone do not prove SQLite can open the file.
      // Probe the actual database path so a stale/corrupt/unavailable primary
      // file automatically falls back to the private .gina database.
      const probe = new DatabaseSync(candidate);
      probe.exec('PRAGMA user_version;');
      probe.close();
      ACTIVE_DB_DIR = dir;
      ACTIVE_DB_PATH = candidate;
      return candidate;
    } catch (error) {
      lastError = error;
      try {
        // If a primary DB file exists but cannot be opened, leave it intact for
        // recovery and move to the fallback rather than repeatedly failing boot.
        if (dir === PRIMARY_DB_DIR) console.warn(`[VoiceDatabase] Primary SQLite unavailable at ${candidate}; using fallback.`, error);
      } catch {}
    }
  }
  throw new Error(`Voice database could not be opened in either location. Tried ${locations.join(' and ')}. ${lastError?.message || ''}`);
}

export function testDatabase(): { ok:boolean; writable:boolean; path:string; error?:string } {
  try {
    const target = ensureDbLocation();
    const probe = new DatabaseSync(target);
    probe.exec('PRAGMA user_version;');
    probe.close();
    return { ok:true, writable:true, path:target };
  } catch (error:any) {
    return { ok:false, writable:false, path:ACTIVE_DB_PATH, error:error?.message || String(error) };
  }
}

let db: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (db) return db;
  // node:sqlite does not create parent directories. Ensure Gina's audio data
  // directory exists before opening the database so a first-run install cannot
  // fail with "unable to open database file".
  const databasePath = ensureDbLocation();
  const instance = new DatabaseSync(databasePath);
  instance.exec(`
    CREATE TABLE IF NOT EXISTS voices (
      voice_id TEXT PRIMARY KEY,
      speaker_name TEXT NOT NULL,
      gender TEXT NOT NULL,
      age_group TEXT NOT NULL,
      primary_language TEXT NOT NULL,
      accent_dialect TEXT NOT NULL,
      tone_tags TEXT NOT NULL DEFAULT '[]',
      engine_compatibility TEXT NOT NULL DEFAULT '[]',
      xtts_embedding_path TEXT,
      bark_prompt_path TEXT,
      preview_audio_url TEXT,
      category TEXT NOT NULL DEFAULT 'system',
      favorite INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  seedSystemPresets(instance);
  db = instance;
  return instance;
}

function seedSystemPresets(instance: DatabaseSync) {
  const presets: VoiceRecord[] = [
    // XTTS v2 ships with named Coqui speakers in addition to voice cloning.
    // Keep these as real system presets so the main speech voice is selectable
    // without forcing every user to upload a reference recording.
    { voice_id:'xtts_ana_florence', speaker_name:'Ana Florence', gender:'Female', age_group:'Young Adult', primary_language:'en', accent_dialect:'English', tone_tags:['Natural','Narration'], engine_compatibility:['xtts'], xtts_embedding_path:null, bark_prompt_path:null, preview_audio_url:null, category:'system', favorite:false },
    { voice_id:'xtts_claribel_dervla', speaker_name:'Claribel Dervla', gender:'Female', age_group:'Young Adult', primary_language:'en', accent_dialect:'English', tone_tags:['Clear','Natural'], engine_compatibility:['xtts'], xtts_embedding_path:null, bark_prompt_path:null, preview_audio_url:null, category:'system', favorite:false },
    { voice_id:'xtts_daisy_studious', speaker_name:'Daisy Studious', gender:'Female', age_group:'Young Adult', primary_language:'en', accent_dialect:'English', tone_tags:['Warm','Narration'], engine_compatibility:['xtts'], xtts_embedding_path:null, bark_prompt_path:null, preview_audio_url:null, category:'system', favorite:false },
    { voice_id:'xtts_andrew_chipper', speaker_name:'Andrew Chipper', gender:'Male', age_group:'Young Adult', primary_language:'en', accent_dialect:'English', tone_tags:['Natural','Narration'], engine_compatibility:['xtts'], xtts_embedding_path:null, bark_prompt_path:null, preview_audio_url:null, category:'system', favorite:false },
    { voice_id:'xtts_craig_gutsy', speaker_name:'Craig Gutsy', gender:'Male', age_group:'Middle Aged', primary_language:'en', accent_dialect:'English', tone_tags:['Deep','Steady'], engine_compatibility:['xtts'], xtts_embedding_path:null, bark_prompt_path:null, preview_audio_url:null, category:'system', favorite:false },
    { voice_id:'xtts_royston_min', speaker_name:'Royston Min', gender:'Male', age_group:'Young Adult', primary_language:'en', accent_dialect:'English', tone_tags:['Natural','Casual'], engine_compatibility:['xtts'], xtts_embedding_path:null, bark_prompt_path:null, preview_audio_url:null, category:'system', favorite:false },
    { voice_id:'bark_en_speaker_0', speaker_name:'Bark Speaker 0', gender:'Male', age_group:'Young Adult', primary_language:'en', accent_dialect:'English', tone_tags:['Narration','Natural'], engine_compatibility:['bark'], xtts_embedding_path:null, bark_prompt_path:'v2/en_speaker_0', preview_audio_url:null, category:'system', favorite:false },
    { voice_id:'bark_en_speaker_1', speaker_name:'Bark Speaker 1', gender:'Female', age_group:'Young Adult', primary_language:'en', accent_dialect:'English', tone_tags:['Warm','Narration'], engine_compatibility:['bark'], xtts_embedding_path:null, bark_prompt_path:'v2/en_speaker_1', preview_audio_url:null, category:'system', favorite:false },
    { voice_id:'bark_en_speaker_2', speaker_name:'Bark Speaker 2', gender:'Male', age_group:'Middle Aged', primary_language:'en', accent_dialect:'English', tone_tags:['Deep','Narration'], engine_compatibility:['bark'], xtts_embedding_path:null, bark_prompt_path:'v2/en_speaker_2', preview_audio_url:null, category:'system', favorite:false },
    { voice_id:'bark_en_speaker_3', speaker_name:'Bark Speaker 3', gender:'Male', age_group:'Young Adult', primary_language:'en', accent_dialect:'English', tone_tags:['Casual','Natural'], engine_compatibility:['bark'], xtts_embedding_path:null, bark_prompt_path:'v2/en_speaker_3', preview_audio_url:null, category:'system', favorite:false },
    { voice_id:'bark_en_speaker_4', speaker_name:'Bark Speaker 4', gender:'Male', age_group:'Middle Aged', primary_language:'en', accent_dialect:'English', tone_tags:['Corporate','Steady'], engine_compatibility:['bark'], xtts_embedding_path:null, bark_prompt_path:'v2/en_speaker_4', preview_audio_url:null, category:'system', favorite:false },
    { voice_id:'bark_en_speaker_5', speaker_name:'Bark Speaker 5', gender:'Female', age_group:'Young Adult', primary_language:'en', accent_dialect:'English', tone_tags:['Energetic','Clear'], engine_compatibility:['bark'], xtts_embedding_path:null, bark_prompt_path:'v2/en_speaker_5', preview_audio_url:null, category:'system', favorite:false },
    { voice_id:'bark_en_speaker_6', speaker_name:'Bark Speaker 6', gender:'Female', age_group:'Middle Aged', primary_language:'en', accent_dialect:'English', tone_tags:['Clear','Corporate'], engine_compatibility:['bark'], xtts_embedding_path:null, bark_prompt_path:'v2/en_speaker_6', preview_audio_url:null, category:'system', favorite:false },
    { voice_id:'bark_en_speaker_7', speaker_name:'Bark Speaker 7', gender:'Male', age_group:'Senior', primary_language:'en', accent_dialect:'English', tone_tags:['Deep','Calming'], engine_compatibility:['bark'], xtts_embedding_path:null, bark_prompt_path:'v2/en_speaker_7', preview_audio_url:null, category:'system', favorite:false },
    { voice_id:'bark_en_speaker_8', speaker_name:'Bark Speaker 8', gender:'Female', age_group:'Middle Aged', primary_language:'en', accent_dialect:'English', tone_tags:['Warm','Steady'], engine_compatibility:['bark'], xtts_embedding_path:null, bark_prompt_path:'v2/en_speaker_8', preview_audio_url:null, category:'system', favorite:false },
    { voice_id:'bark_en_speaker_9', speaker_name:'Bark Speaker 9', gender:'Male', age_group:'Young Adult', primary_language:'en', accent_dialect:'English', tone_tags:['Natural','Narration'], engine_compatibility:['bark'], xtts_embedding_path:null, bark_prompt_path:'v2/en_speaker_9', preview_audio_url:null, category:'system', favorite:false },
  ];
  const insert = instance.prepare(`INSERT OR IGNORE INTO voices (voice_id,speaker_name,gender,age_group,primary_language,accent_dialect,tone_tags,engine_compatibility,xtts_embedding_path,bark_prompt_path,preview_audio_url,category,favorite,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const now = new Date().toISOString();
  for (const voice of presets) insert.run(voice.voice_id,voice.speaker_name,voice.gender,voice.age_group,voice.primary_language,voice.accent_dialect,JSON.stringify(voice.tone_tags),JSON.stringify(voice.engine_compatibility),voice.xtts_embedding_path,voice.bark_prompt_path,voice.preview_audio_url,voice.category,0,now,now);
}

function mapRow(row: any): VoiceRecord {
  return {
    voice_id: String(row.voice_id), speaker_name: String(row.speaker_name), gender: row.gender,
    age_group: row.age_group, primary_language: String(row.primary_language), accent_dialect: String(row.accent_dialect),
    tone_tags: JSON.parse(String(row.tone_tags || '[]')), engine_compatibility: JSON.parse(String(row.engine_compatibility || '[]')),
    xtts_embedding_path: row.xtts_embedding_path || null, bark_prompt_path: row.bark_prompt_path || null,
    preview_audio_url: row.preview_audio_url || null, category: row.category, favorite: Boolean(row.favorite)
  };
}

export async function listVoices(filters: { category?: string; q?: string; gender?: string; language?: string; accent?: string; tone?: string } = {}): Promise<VoiceRecord[]> {
  const instance = getDb();
  const rows = instance.prepare(`SELECT * FROM voices WHERE (? = '' OR category = ?) AND (? = '' OR lower(speaker_name || ' ' || accent_dialect || ' ' || tone_tags) LIKE lower(?)) AND (? = '' OR gender = ?) AND (? = '' OR primary_language = ?) AND (? = '' OR lower(accent_dialect) LIKE lower(?)) AND (? = '' OR lower(tone_tags) LIKE lower(?)) ORDER BY favorite DESC, speaker_name ASC`).all(
    filters.category || '', filters.category || '', filters.q || '', `%${filters.q || ''}%`, filters.gender || '', filters.gender || '', filters.language || '', filters.language || '', filters.accent || '', `%${filters.accent || ''}%`, filters.tone || '', `%${filters.tone || ''}%`
  );
  return rows.map(mapRow);
}

export async function upsertVoice(voice: VoiceRecord): Promise<VoiceRecord> {
  const instance = getDb(); const now = new Date().toISOString();
  instance.prepare(`INSERT INTO voices (voice_id,speaker_name,gender,age_group,primary_language,accent_dialect,tone_tags,engine_compatibility,xtts_embedding_path,bark_prompt_path,preview_audio_url,category,favorite,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(voice_id) DO UPDATE SET speaker_name=excluded.speaker_name,gender=excluded.gender,age_group=excluded.age_group,primary_language=excluded.primary_language,accent_dialect=excluded.accent_dialect,tone_tags=excluded.tone_tags,engine_compatibility=excluded.engine_compatibility,xtts_embedding_path=excluded.xtts_embedding_path,bark_prompt_path=excluded.bark_prompt_path,preview_audio_url=excluded.preview_audio_url,category=excluded.category,updated_at=excluded.updated_at`).run(voice.voice_id,voice.speaker_name,voice.gender,voice.age_group,voice.primary_language,voice.accent_dialect,JSON.stringify(voice.tone_tags),JSON.stringify(voice.engine_compatibility),voice.xtts_embedding_path,voice.bark_prompt_path,voice.preview_audio_url,voice.category,voice.favorite ? 1 : 0,now,now);
  return (await listVoices({ q: voice.voice_id }))[0] || voice;
}

export function setFavorite(voiceId: string, favorite: boolean): void {
  getDb().prepare('UPDATE voices SET favorite=?, updated_at=? WHERE voice_id=?').run(favorite ? 1 : 0, new Date().toISOString(), voiceId);
}

export { ACTIVE_DB_PATH as CURRENT_DB_PATH };
