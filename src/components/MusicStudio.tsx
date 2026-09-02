import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Music, Sparkles, Mic, Volume2, VolumeX, Play, Pause, Download, Trash2,
  Sliders, ChevronDown, ChevronUp, Info, HelpCircle, Layers, RefreshCw,
  FastForward, Scissors, FileText, Split, Radio, Check, CheckCircle2,
  ExternalLink, Disc, Disc3, ShieldAlert, Cpu, Video
} from 'lucide-react';
import { useGenerationJob } from '../context/GenerationJobContext';
import { MediaStitcherModal } from './MediaStitcherModal';
import { SystemTelemetry } from '../types';

export interface MusicStudioProps {
  telemetry?: SystemTelemetry;
  onAddLog?: (level: 'INFO' | 'WARN' | 'SEC' | 'RULE', message: string, ruleId?: string) => void;
  onClearCache?: () => void;
  onSendToStreamInject?: (audioUrl: string, title: string) => void;
}

export interface TrackItem {
  filename: string;
  name: string;
  url: string;
  durationSec: number;
  bytes: number;
  createdAt: string;
}

// Style preset collections for the # dropdowns
const GENRE_LIST = [
  'Cyberpunk', 'Synthwave', 'EDM / Dance', 'Pop', 'Hip-Hop', 'Trap', 'Lo-Fi Chill',
  'Phonk', 'Rock', 'Heavy Metal', 'Classical / Orchestral', 'Cinematic Soundscape',
  'Jazz', 'R&B / Soul', 'Trance', 'Drum & Bass', 'Dubstep', 'Ambient Drone',
  'Acoustic Folk', 'House / Deep House', 'Techno / Industrial', 'Future Bass', 'Funk', 'Reggae'
];

const MOOD_LIST = [
  'Euphoric & Uplifting', 'Dark & Gritty', 'Melancholic & Emotional', 'Energetic & Punchy',
  'Chill & Relaxed', 'Epic & Heroic', 'Aggressive & Intense', 'Romantic & Sweet',
  'Mysterious & Ethereal', 'Futuristic & Sci-Fi', 'Nostalgic 80s', 'Tense & Suspenseful',
  'Hypnotic & Trippy', 'Peaceful & Meditative', 'Bouncy & Playful', 'Triumphant'
];

const VOICE_LIST = [
  'Male Lead Vocal', 'Female Lead Vocal', 'Dual Harmony / Duet', 'Cybernetic Vocoder',
  'Choir / Ethereal Backing', 'Raspy Rocker', 'Soft Whispering', 'Auto-Tune Pop Vocal',
  'Deep Baritone', 'High Soprano', 'Breathy Vocal', 'Soulful Gospel'
];

const TEMPO_LIST = [
  'Slow (70 BPM - Downtempo)', 'Medium (95 BPM - Groovy)', 'Standard (120 BPM - 4/4 Dance)',
  'Fast (135 BPM - Driving)', 'Ultra-Fast (160 BPM - DnB / Phonk)', 'Half-Time Beat', 'Double-Time Beat', '3/4 Waltz'
];

export function MusicStudio({ telemetry, onAddLog, onClearCache, onSendToStreamInject }: MusicStudioProps) {
  // Main Studio Mode Switcher
  const [suiteMode, setSuiteMode] = useState<
    'text_to_song' | 'song_cover' | 'extend' | 'edit' | 'lyrics_gen' | 'stem_remover' | 'library'
  >('text_to_song');

  // Generator State (Matches Reference Image)
  const [generatorTier, setGeneratorTier] = useState<'expert' | 'basic'>('expert');
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem('gina_music_model') || 'facebook/musicgen-medium';
  });
  const [modelStatusMap, setModelStatusMap] = useState<Record<string, { cached: boolean; hasWeights: boolean; sizeLabel: string; fileCount: number }>>({
    'facebook/musicgen-medium': { cached: false, hasWeights: false, sizeLabel: '0 MB', fileCount: 0 },
    'facebook/musicgen-small': { cached: true, hasWeights: true, sizeLabel: '2.3 GB', fileCount: 14 },
    'facebook/audiogen-medium': { cached: false, hasWeights: false, sizeLabel: '0 MB', fileCount: 0 },
  });
  const [isDownloadingModel, setIsDownloadingModel] = useState<boolean>(false);
  const [songName, setSongName] = useState<string>('');
  const [musicalStyle, setMusicalStyle] = useState<string>('');
  const [lyrics, setLyrics] = useState<string>('');
  const [noVocals, setNoVocals] = useState<boolean>(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(true);
  const [negativeStyle, setNegativeStyle] = useState<string>('');
  const [vocalType, setVocalType] = useState<string>('Surprise Me');
  const [isHidden, setIsHidden] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(15);
  const [guidanceScale, setGuidanceScale] = useState<number>(3.0);
  const [temperature, setTemperature] = useState<number>(1.0);

  // Dropdown Drawer Popovers (# Genre, # Moods, # Voices, # Tempos)
  const [activeDropdown, setActiveDropdown] = useState<'genre' | 'moods' | 'voices' | 'tempos' | null>(null);

  // AI Lyrics Generator Modal / Sub-State
  const [isLyricsModalOpen, setIsLyricsModalOpen] = useState<boolean>(false);
  const [lyricTheme, setLyricTheme] = useState<string>('');
  const [lyricLanguage, setLyricLanguage] = useState<string>('English');
  const [isWritingLyrics, setIsWritingLyrics] = useState<boolean>(false);

  // Audio Cover / Extension / Stem Removal States
  const [coverAudioFile, setCoverAudioFile] = useState<File | null>(null);
  const [extendTimestamp, setExtendTimestamp] = useState<number>(10);
  const [editStartSec, setEditStartSec] = useState<number>(5);
  const [editEndSec, setEditEndSec] = useState<number>(12);
  const [stemAudioFile, setStemAudioFile] = useState<File | null>(null);
  const [separatedStems, setSeparatedStems] = useState<{ vocals?: string; instrumental?: string } | null>(null);

  // Track Library & Audio Playback
  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [activeTrack, setActiveTrack] = useState<TrackItem | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackProgress, setPlaybackProgress] = useState<number>(0);
  const [showStitchModal, setShowStitchModal] = useState<boolean>(false);
  const [selectedStitchAudio, setSelectedStitchAudio] = useState<{ url: string; name: string } | null>(null);
  const [volume, setVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Job Context
  const { job, adoptJob } = useGenerationJob();
  const isJobActive = job ? (job.status === 'RUNNING' || job.status === 'QUEUED') : false;
  const isMusicGenerating = isJobActive && job?.workflowId === 'music_studio';
  const isStemSplitting = isJobActive && job?.workflowId === 'stem_separation';
  const isModelDownloading = isJobActive && job?.workflowId === 'audiocraft_download';

  // Load Tracks & Model Status on mount
  const fetchModelStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/music/status');
      if (res.ok) {
        const data = await res.json();
        if (data.availableModels) {
          const map: Record<string, { cached: boolean; hasWeights: boolean; sizeLabel: string; fileCount: number }> = {};
          data.availableModels.forEach((m: any) => {
            map[m.id] = {
              cached: !!m.cached,
              hasWeights: !!m.hasWeights,
              sizeLabel: m.sizeLabel || '0 MB',
              fileCount: m.fileCount || 0
            };
          });
          setModelStatusMap(map);
        }
      }
    } catch (err) {
      console.error('Failed to query music model status:', err);
    }
  }, []);

  const handleDownloadModel = async (modelId: string) => {
    setIsDownloadingModel(true);
    onAddLog?.('INFO', `Starting 1-click HuggingFace weights download for '${modelId}'...`);
    try {
      const res = await fetch('/api/music/models/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelId })
      });
      const data = await res.json();
      if (data.ok && data.jobId) {
        adoptJob(data.jobId);
        onAddLog?.('SEC', `AudioCraft model download job started: ${data.jobId}`);
      } else {
        onAddLog?.('WARN', `Failed to start model download: ${data.error}`);
      }
    } catch (err: any) {
      onAddLog?.('WARN', `Download request failed: ${err.message}`);
    } finally {
      setIsDownloadingModel(false);
      fetchModelStatus();
    }
  };

  const fetchTracks = useCallback(async () => {
    try {
      const res = await fetch('/api/music/tracks');
      if (res.ok) {
        const data = await res.json();
        if (data.tracks) {
          setTracks(data.tracks);
          if (!activeTrack && data.tracks.length > 0) {
            setActiveTrack(data.tracks[0]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load music tracks:', err);
    }
  }, [activeTrack]);

  useEffect(() => {
    fetchTracks();
    fetchModelStatus();
    const timer = setInterval(fetchModelStatus, 8000);
    return () => clearInterval(timer);
  }, [fetchTracks, fetchModelStatus]);

  // Audio Playback Listener
  useEffect(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      if (audio.duration) {
        setPlaybackProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setPlaybackProgress(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [activeTrack]);

  const togglePlayTrack = (track: TrackItem) => {
    if (activeTrack?.filename === track.filename) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play();
        setIsPlaying(true);
      }
    } else {
      setActiveTrack(track);
      setIsPlaying(true);
      setTimeout(() => {
        audioRef.current?.play();
      }, 50);
    }
  };

  // Helper for tag insertion
  const handleAddStyleTag = (tag: string) => {
    if (!musicalStyle) {
      setMusicalStyle(tag);
    } else if (!musicalStyle.toLowerCase().includes(tag.toLowerCase())) {
      setMusicalStyle(`${musicalStyle}, ${tag}`);
    }
    setActiveDropdown(null);
  };

  const handleInsertLyricSection = (sectionTag: string) => {
    const formattedTag = `\n[${sectionTag}]\n`;
    setLyrics((prev) => `${prev}${prev ? '\n' : ''}${formattedTag}`);
  };

  // AI Lyrics Writer (Local Gemma 3 12B / Built-in songwriter)
  const handleGenerateAiLyrics = async () => {
    setIsWritingLyrics(true);
    onAddLog?.('INFO', `Dispatching songwriting prompt to local Gemma 3 12B LLM...`);
    try {
      const res = await fetch('/api/music/write-lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: lyricTheme || songName || 'Cyberpunk neon adventure',
          style: musicalStyle || 'Synthwave / Cyberpunk',
          mood: 'Energetic and cinematic',
          language: lyricLanguage
        })
      });
      const data = await res.json();
      if (data.ok && data.lyrics) {
        setLyrics(data.lyrics);
        setIsLyricsModalOpen(false);
        onAddLog?.('SEC', `AI Lyrics generated successfully (${data.lyrics.split('\n').length} lines).`);
      } else {
        onAddLog?.('WARN', `Lyrics generation error: ${data.error || 'Unknown'}`);
      }
    } catch (err: any) {
      onAddLog?.('WARN', `Failed to write lyrics: ${err.message}`);
    } finally {
      setIsWritingLyrics(false);
    }
  };

  // Main Music Generation Trigger
  const handleGenerateSong = async () => {
    onAddLog?.('RULE', `Rule 011: VRAM cage safety check for AudioCraft MusicGen.`);
    try {
      const res = await fetch('/api/music/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: suiteMode,
          songName: songName || 'Cyberpunk Neon Vibe',
          style: musicalStyle,
          lyrics: lyrics,
          noVocals: noVocals,
          negativeStyle: negativeStyle,
          vocalType: vocalType,
          duration: duration,
          model: selectedModel,
          guidanceScale: guidanceScale,
          temperature: temperature,
          splitStart: suiteMode === 'extend' ? extendTimestamp : editStartSec
        })
      });

      const data = await res.json();
      if (res.ok && data.jobId) {
        await adoptJob(data.jobId);
        onAddLog?.('INFO', `Music generation job queued: ID ${data.jobId}`);
      } else {
        onAddLog?.('WARN', `Music job rejected: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      onAddLog?.('WARN', `Failed to start music generation: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Audio Element */}
      <audio
        ref={audioRef}
        src={activeTrack?.url || undefined}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />

      {/* Top Header & 7 Feature Modes Tabs Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-gradient-to-tr from-amber-500 to-pink-500 text-slate-950 font-bold">
              <Music className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              AI Music Generator Suite <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-mono">AudioCraft & MusicGen</span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Produce complete songs, transform styles, generate lyrics, extend tracks, and isolate vocals on local hardware.
          </p>
        </div>

        {/* 7 Modes Quick Switcher */}
        <div className="flex items-center gap-1.5 flex-wrap bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setSuiteMode('text_to_song')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              suiteMode === 'text_to_song'
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Text / Lyrics to Song
          </button>
          <button
            onClick={() => setSuiteMode('song_cover')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              suiteMode === 'song_cover'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Disc3 className="w-3.5 h-3.5" /> AI Song Cover
          </button>
          <button
            onClick={() => setSuiteMode('extend')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              suiteMode === 'extend'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FastForward className="w-3.5 h-3.5" /> Music Extension
          </button>
          <button
            onClick={() => setSuiteMode('edit')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              suiteMode === 'edit'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" /> AI Music Editor
          </button>
          <button
            onClick={() => setSuiteMode('stem_remover')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              suiteMode === 'stem_remover'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Split className="w-3.5 h-3.5" /> Voice Remover
          </button>
          <button
            onClick={() => setSuiteMode('library')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              suiteMode === 'library'
                ? 'bg-slate-800 text-emerald-400 font-bold border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" /> Tracks ({tracks.length})
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form: Exactly matches user's reference screenshot */}
        <div className="lg:col-span-7 flex flex-col gap-5 p-6 rounded-3xl bg-[#090D16] border border-slate-800/80 shadow-2xl relative">
          
          {/* Top Pill Bar: [ Expert | Basic ] and Model Version Dropdown */}
          <div className="flex items-center justify-between pb-2">
            {/* Expert / Basic Toggle Pill */}
            <div className="flex items-center p-1 rounded-full bg-slate-900 border border-slate-800">
              <button
                type="button"
                onClick={() => setGeneratorTier('expert')}
                className={`px-6 py-1.5 rounded-full text-xs font-bold transition-all ${
                  generatorTier === 'expert'
                    ? 'bg-gradient-to-r from-[#FFA270] via-[#F472B6] to-[#C084FC] text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Expert
              </button>
              <button
                type="button"
                onClick={() => setGeneratorTier('basic')}
                className={`px-6 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  generatorTier === 'basic'
                    ? 'bg-slate-800 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Basic
              </button>
            </div>

            {/* Model Version Dropdown (e.g. V5.5 / MusicGen Small / Medium) */}
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  localStorage.setItem('gina_music_model', e.target.value);
                }}
                className="appearance-none bg-slate-900 hover:bg-slate-850 border border-slate-700/80 text-purple-300 font-mono text-xs font-semibold px-3 py-1.5 pr-7 rounded-full focus:outline-none focus:border-purple-400 cursor-pointer"
              >
                <option value="facebook/musicgen-medium">V6.0 Pro (MusicGen Medium 1.5B · High-Fi)</option>
                <option value="facebook/musicgen-small">V5.5 (MusicGen Small 300M · Fast BGM)</option>
                <option value="facebook/audiogen-medium">V5.5 SFX (AudioGen Atmosphere 1.5B)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-purple-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Model Cache & VRAM Sentinel Banner */}
          {(() => {
            const currentStatus = modelStatusMap[selectedModel] || { cached: false, hasWeights: false, sizeLabel: '0 MB', fileCount: 0 };
            return (
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                    <span className="text-slate-300 font-medium">
                      {selectedModel === 'facebook/musicgen-medium' ? 'MusicGen Medium 1.5B (Preferred)' : 'MusicGen Small 300M'}
                    </span>
                    {currentStatus.hasWeights ? (
                      <span className="flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" /> Cached Locally ({currentStatus.sizeLabel})
                      </span>
                    ) : isModelDownloading ? (
                      <span className="flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono border border-purple-500/30 animate-pulse">
                        <RefreshCw className="w-3 h-3 animate-spin" /> Downloading Weights ({currentStatus.sizeLabel || 'fetching chunk...'})
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
                        <Download className="w-3 h-3" /> Ready to Cache (~5.8 GB)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {!currentStatus.hasWeights && !isModelDownloading && (
                      <button
                        type="button"
                        disabled={isDownloadingModel}
                        onClick={() => handleDownloadModel(selectedModel)}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-[11px] font-bold shadow transition-all disabled:opacity-50"
                      >
                        <Download className="w-3 h-3" />
                        Download 1.5B Weights Now
                      </button>
                    )}

                    <span className="text-[10px] font-mono text-slate-500 hidden sm:inline" title="Gina isolates memory allocations & executes tasks sequentially to prevent VRAM exhaustion on 8GB GPUs.">
                      Sequential 8GB VRAM Safe (~4.8GB max)
                    </span>
                  </div>
                </div>

                {/* Live Download Progress Bar when downloading */}
                {isModelDownloading && job && (
                  <div className="mt-1 pt-2 border-t border-slate-800/80 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-purple-300 font-semibold truncate max-w-md">
                        {job.step || 'Downloading AudioCraft weights via HuggingFace...'}
                      </span>
                      <span className="text-purple-400 font-bold">{job.progress ?? 20}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300 rounded-full"
                        style={{ width: `${job.progress ?? 20}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>Saving to: C:\Gina_AI\models\audio\facebook_musicgen-medium\</span>
                      <span>Chunks buffered in .cache folder</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* 1. Song Name Field */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
              <span className="flex items-center gap-1.5">
                Song Name <HelpCircle className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300 cursor-help" />
              </span>
              <span className="text-[11px] font-mono text-slate-500">{songName.length}/80</span>
            </div>
            <input
              type="text"
              maxLength={80}
              value={songName}
              onChange={(e) => setSongName(e.target.value)}
              placeholder="Enter song name"
              className="w-full bg-[#0D121F] border border-slate-800 focus:border-purple-500/60 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
            />
          </div>

          {/* 2. Style Field with # Dropdowns */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
              <span className="flex items-center gap-1.5">
                Style <HelpCircle className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300 cursor-help" />
              </span>
              <span className="text-[11px] font-mono text-slate-500">{musicalStyle.length} / 1000</span>
            </div>

            <div className="flex flex-col bg-[#0D121F] border border-slate-800 rounded-2xl p-3 gap-3 focus-within:border-purple-500/60 transition-colors">
              <textarea
                rows={3}
                maxLength={1000}
                value={musicalStyle}
                onChange={(e) => setMusicalStyle(e.target.value)}
                placeholder="Enter musical style (e.g. 120 BPM cyberpunk dark synthwave with heavy analog bassline, punchy drums and euphoric synth leads)"
                className="w-full bg-transparent border-none text-xs text-slate-100 placeholder-slate-600 focus:outline-none resize-none"
              />

              {/* Tag Dropdowns: # Genre >, # Moods >, # Voices >, # Tempos > */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={() => setActiveDropdown(activeDropdown === 'genre' ? null : 'genre')}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                    activeDropdown === 'genre'
                      ? 'bg-purple-900/30 border-purple-500 text-purple-200'
                      : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="font-semibold text-slate-300"># Genre</span>
                  <span className="text-slate-500">&gt;</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveDropdown(activeDropdown === 'moods' ? null : 'moods')}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                    activeDropdown === 'moods'
                      ? 'bg-pink-900/30 border-pink-500 text-pink-200'
                      : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="font-semibold text-slate-300"># Moods</span>
                  <span className="text-slate-500">&gt;</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveDropdown(activeDropdown === 'voices' ? null : 'voices')}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                    activeDropdown === 'voices'
                      ? 'bg-cyan-900/30 border-cyan-500 text-cyan-200'
                      : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="font-semibold text-slate-300"># Voices</span>
                  <span className="text-slate-500">&gt;</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveDropdown(activeDropdown === 'tempos' ? null : 'tempos')}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                    activeDropdown === 'tempos'
                      ? 'bg-amber-900/30 border-amber-500 text-amber-200'
                      : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="font-semibold text-slate-300"># Tempos</span>
                  <span className="text-slate-500">&gt;</span>
                </button>
              </div>

              {/* Flyout Selection Tray for Active Tag Dropdown */}
              {activeDropdown && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap gap-1.5 max-h-40 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                  {(activeDropdown === 'genre'
                    ? GENRE_LIST
                    : activeDropdown === 'moods'
                    ? MOOD_LIST
                    : activeDropdown === 'voices'
                    ? VOICE_LIST
                    : TEMPO_LIST
                  ).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleAddStyleTag(item)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-purple-900/50 hover:text-purple-200 border border-slate-800 text-[11px] text-slate-300 transition-colors"
                    >
                      + {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 3. Lyrics Field & "Write Lyrics" Button */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                Lyrics <HelpCircle className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300 cursor-help" />
              </span>

              {/* Glowing "Write Lyrics" Button */}
              <button
                type="button"
                onClick={() => setIsLyricsModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#FBBF24] via-[#F472B6] to-[#A855F7] text-slate-950 font-bold text-xs hover:brightness-110 shadow-lg shadow-pink-900/30 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" /> Write Lyrics
              </button>
            </div>

            <div className="flex flex-col bg-[#0D121F] border border-slate-800 rounded-2xl p-3 gap-2.5 focus-within:border-purple-500/60 transition-colors">
              {/* Quick Tag Insertion Toolbar */}
              <div className="flex items-center gap-1.5 flex-wrap pb-1 border-b border-slate-800/40 text-[10px]">
                <span className="text-slate-500 font-mono">Insert:</span>
                {['Verse 1', 'Chorus', 'Verse 2', 'Bridge', 'Drop', 'Outro'].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => handleInsertLyricSection(sec)}
                    className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-slate-300 transition-colors"
                  >
                    [{sec}]
                  </button>
                ))}
              </div>

              <textarea
                rows={5}
                maxLength={5000}
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                placeholder="Type your lyrics here (Use [Verse], [Chorus], [Bridge], [Drop], [Outro] to structure your song)..."
                className="w-full bg-transparent border-none text-xs text-slate-100 placeholder-slate-600 focus:outline-none resize-none font-sans leading-relaxed"
              />

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                {/* No Vocals Toggle Switch */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div className="relative inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={noVocals}
                      onChange={(e) => setNoVocals(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                  </div>
                  <span className="text-xs text-slate-300 font-medium flex items-center gap-1">
                    no vocals <HelpCircle className="w-3 h-3 text-slate-500" />
                  </span>
                </label>

                <span className="text-[11px] font-mono text-slate-500">{lyrics.length}/5000</span>
              </div>
            </div>
          </div>

          {/* 4. Advanced Options Accordion */}
          <div className="flex flex-col rounded-2xl bg-[#0D121F] border border-slate-800 overflow-hidden">
            <button
              type="button"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="flex items-center justify-between p-3.5 text-xs font-bold text-slate-200 hover:bg-slate-900/50 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2 text-purple-300">
                <Sliders className="w-4 h-4" /> Advanced Options
              </span>
              {isAdvancedOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {isAdvancedOpen && (
              <div className="p-4 pt-1 flex flex-col gap-4 border-t border-slate-800/60 text-xs">
                {/* Negative Style */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-slate-300 font-semibold text-[11px]">
                    <span className="flex items-center gap-1">
                      Negative Style <HelpCircle className="w-3 h-3 text-slate-500" />
                    </span>
                    <span className="font-mono text-slate-500">{negativeStyle.length}/1000</span>
                  </div>
                  <input
                    type="text"
                    maxLength={1000}
                    value={negativeStyle}
                    onChange={(e) => setNegativeStyle(e.target.value)}
                    placeholder="Avoid styles, e.g. heavy metal, rap, distorted bass"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Vocal Type Dropdown */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-slate-300 font-semibold text-[11px] flex items-center gap-1">
                    Vocal Type <HelpCircle className="w-3 h-3 text-slate-500" />
                  </span>
                  <div className="relative">
                    <select
                      value={vocalType}
                      onChange={(e) => setVocalType(e.target.value)}
                      className="w-full appearance-none bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500 cursor-pointer"
                    >
                      <option value="Surprise Me">Surprise Me (Auto Harmonic Match)</option>
                      <option value="Male Lead Vocal">Male Lead Vocal</option>
                      <option value="Female Lead Vocal">Female Lead Vocal</option>
                      <option value="Dual / Duet Harmony">Dual / Duet Harmony</option>
                      <option value="Cybernetic / Vocoder">Cybernetic / Vocoder</option>
                      <option value="Raspy Rocker">Raspy Rocker</option>
                      <option value="Ethereal Soprano">Ethereal Soprano</option>
                      <option value="Deep Baritone">Deep Baritone</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Hidden Switch & Duration Slider */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-1">
                  <label className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer">
                    <span className="text-slate-300 font-medium text-xs flex items-center gap-1">
                      Hidden / Private <HelpCircle className="w-3 h-3 text-slate-500" />
                    </span>
                    <div className="relative inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={isHidden}
                        onChange={(e) => setIsHidden(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                    </div>
                  </label>

                  <div className="flex flex-col gap-1 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-semibold">Track Duration:</span>
                      <span className="font-mono text-purple-300 font-bold">{duration}s</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={30}
                      step={1}
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 5. Main Generate Button (Exact Style from Screenshot) */}
          <button
            type="button"
            disabled={isMusicGenerating}
            onClick={handleGenerateSong}
            className={`w-full py-4 rounded-2xl font-extrabold text-sm md:text-base flex items-center justify-center gap-2 transition-all shadow-xl cursor-pointer ${
              isMusicGenerating
                ? 'bg-purple-900/40 text-purple-300 border border-purple-500/30 animate-pulse cursor-wait'
                : 'bg-gradient-to-r from-[#A78BFA] via-[#C084FC] to-[#F472B6] hover:brightness-110 text-slate-950 shadow-purple-950/50'
            }`}
          >
            {isMusicGenerating ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" /> Synthesizing Audio ({job?.progress || 0}%)...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" /> Generate
              </>
            )}
          </button>
        </div>

        {/* Right Column: Audio Player, Active Stems & Live Studio Output */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          
          {/* Active Audio Waveform & Playback Deck */}
          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-md flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <Disc className="w-4 h-4 animate-spin-slow" /> Master Audio Deck
              </span>
              {activeTrack && (
                <span className="text-[10px] font-mono text-slate-400">
                  {(activeTrack.bytes / (1024 * 1024)).toFixed(1)} MB
                </span>
              )}
            </div>

            {activeTrack ? (
              <div className="flex flex-col gap-3">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
                  <span className="text-sm font-bold text-slate-100 truncate">{activeTrack.name}</span>
                  
                  {/* Dynamic Synthetic Waveform Visualizer */}
                  <div className="h-16 w-full flex items-center justify-between gap-0.5 px-2 bg-slate-900/50 rounded-xl overflow-hidden">
                    {Array.from({ length: 48 }).map((_, i) => {
                      const isActive = (i / 48) * 100 <= playbackProgress;
                      const heightPercent = 20 + Math.abs(Math.sin((i * 12) + (isPlaying ? Date.now() * 0.005 : 0))) * 70;
                      return (
                        <div
                          key={i}
                          style={{ height: `${heightPercent}%` }}
                          className={`w-1 rounded-full transition-all duration-75 ${
                            isActive ? 'bg-gradient-to-t from-pink-500 to-purple-400' : 'bg-slate-800'
                          }`}
                        />
                      );
                    })}
                  </div>

                  {/* Playhead Progress Bar */}
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${playbackProgress}%` }}
                      className="h-full bg-purple-500 transition-all duration-100"
                    />
                  </div>
                </div>

                {/* Deck Controls */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => togglePlayTrack(activeTrack)}
                      className="p-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-slate-950 font-bold hover:brightness-110 shadow-lg transition-all"
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-slate-950" />}
                    </button>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-200">
                        {isPlaying ? 'Playing Audio' : 'Paused'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">{activeTrack.filename}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStitchAudio({ url: activeTrack.url, name: activeTrack.name });
                        setShowStitchModal(true);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-indigo-900/40 hover:bg-indigo-900/70 border border-indigo-500/40 text-indigo-300 font-semibold text-xs transition-colors flex items-center gap-1"
                      title="Stitch Audio with Video (MoviePy)"
                    >
                      <Video className="w-3.5 h-3.5" /> Stitch
                    </button>
                    {onSendToStreamInject && (
                      <button
                        type="button"
                        onClick={() => onSendToStreamInject(activeTrack.url, activeTrack.name)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-900/40 hover:bg-emerald-900/70 border border-emerald-500/30 text-emerald-300 font-semibold text-xs transition-colors flex items-center gap-1"
                        title="Send to StreamInject Timeline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> BGM
                      </button>
                    )}
                    <a
                      href={activeTrack.url}
                      download={activeTrack.filename}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Download Master WAV"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
                <Music className="w-8 h-8 text-slate-600" />
                <span>No track loaded yet. Click Generate to compose your first master song.</span>
              </div>
            )}
          </div>

          {/* Track Library List */}
          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-md flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-emerald-400" /> Saved Creations ({tracks.length})
              </span>
              <button
                type="button"
                onClick={fetchTracks}
                className="p-1 text-slate-400 hover:text-slate-200"
                title="Refresh Tracks"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
              {tracks.length === 0 ? (
                <span className="text-xs text-slate-500 italic p-4 text-center">No audio files found.</span>
              ) : (
                tracks.map((track) => (
                  <div
                    key={track.filename}
                    onClick={() => setActiveTrack(track)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                      activeTrack?.filename === track.filename
                        ? 'bg-purple-950/40 border-purple-500/60 shadow-md'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePlayTrack(track);
                        }}
                        className="p-1.5 rounded-full bg-slate-800 hover:bg-purple-600 text-slate-200 transition-colors"
                      >
                        {activeTrack?.filename === track.filename && isPlaying ? (
                          <Pause className="w-3 h-3" />
                        ) : (
                          <Play className="w-3 h-3 fill-slate-200" />
                        )}
                      </button>
                      <div className="flex flex-col truncate">
                        <span className="font-semibold text-slate-200 truncate">{track.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(track.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStitchAudio({ url: track.url, name: track.name });
                          setShowStitchModal(true);
                        }}
                        className="p-1.5 text-indigo-400 hover:text-indigo-200"
                        title="Stitch Audio with Video"
                      >
                        <Video className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={track.url}
                        download={track.filename}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 text-slate-400 hover:text-slate-200"
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Lyrics Writer Modal (Powered by local Gemma 3 12B) */}
      {isLyricsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-pink-500/20 text-pink-300 font-bold">
                  <Sparkles className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-white">AI Songwriter & Lyricist (Gemma 3 12B)</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLyricsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div>
                <span className="text-slate-300 font-semibold text-[11px]">Theme / Story Topic:</span>
                <input
                  type="text"
                  value={lyricTheme}
                  onChange={(e) => setLyricTheme(e.target.value)}
                  placeholder="e.g. A midnight race through a rainy neon Tokyo cyber highway"
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <span className="text-slate-300 font-semibold text-[11px]">Language:</span>
                <select
                  value={lyricLanguage}
                  onChange={(e) => setLyricLanguage(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-pink-500"
                >
                  <option value="English">English</option>
                  <option value="Japanese">Japanese / Romaji</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                  <option value="Korean">Korean</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsLyricsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isWritingLyrics}
                onClick={handleGenerateAiLyrics}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-slate-950 font-bold text-xs hover:brightness-110 shadow-lg transition-all flex items-center gap-1.5"
              >
                {isWritingLyrics ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {isWritingLyrics ? 'Composing Lyrics...' : 'Write Lyrics Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multimedia MoviePy Video/Audio Stitching Modal */}
      <MediaStitcherModal
        isOpen={showStitchModal}
        onClose={() => {
          setShowStitchModal(false);
          setSelectedStitchAudio(null);
        }}
        audioSourceUrl={selectedStitchAudio?.url || activeTrack?.url || undefined}
        audioSourceName={selectedStitchAudio?.name || activeTrack?.name || undefined}
        onAddLog={onAddLog}
      />
    </div>
  );
}
