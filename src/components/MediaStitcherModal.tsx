import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Music, Film, Play, Sliders, Volume2, Sparkles, Check,
  AlertCircle, RefreshCw, Download, Zap, X, Clock, Layers,
  Flame, CheckCircle2, ChevronDown, Repeat, HelpCircle
} from 'lucide-react';
import { useGenerationJob } from '../context/GenerationJobContext';
import { AudioTrackMeta } from '../../server/music/MusicService';

interface MediaStitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoSourceUrl?: string;
  videoSourceName?: string;
  audioSourceUrl?: string;
  audioSourceName?: string;
  onAddLog?: (level: 'INFO' | 'WARN' | 'SEC' | 'RULE', message: string, ruleId?: string) => void;
}

export const MediaStitcherModal: React.FC<MediaStitcherModalProps> = ({
  isOpen,
  onClose,
  videoSourceUrl,
  videoSourceName,
  audioSourceUrl,
  audioSourceName,
  onAddLog
}) => {
  const { job, adoptJob } = useGenerationJob();
  const isJobActive = job ? (job.status === 'RUNNING' || job.status === 'QUEUED') : false;
  const isStitching = isJobActive && job?.workflowId === 'media_stitch';

  const [moviePyInstalled, setMoviePyInstalled] = useState<boolean | null>(null);
  const [installingMoviePy, setInstallingMoviePy] = useState(false);
  const [installLogs, setInstallLogs] = useState<string>('');

  // Audio track selection
  const [audioTracks, setAudioTracks] = useState<AudioTrackMeta[]>([]);
  const [selectedAudioUrl, setSelectedAudioUrl] = useState<string>('');
  const [loadingTracks, setLoadingTracks] = useState(false);

  // Video and Audio parameters
  const [customVideoPath, setCustomVideoPath] = useState<string>('');
  const [audioVolume, setAudioVolume] = useState<number>(1.0);
  const [videoVolume, setVideoVolume] = useState<number>(0.0);
  const [fadeIn, setFadeIn] = useState<number>(0.5);
  const [fadeOut, setFadeOut] = useState<number>(1.0);
  const [syncMode, setSyncMode] = useState<'match_video' | 'match_audio' | 'custom' | 'shortest'>('match_video');
  const [loopVideo, setLoopVideo] = useState<boolean>(true);
  const [customDuration, setCustomDuration] = useState<number>(15);

  // Result state
  const [stitchedResultUrl, setStitchedResultUrl] = useState<string | null>(null);
  const [stitchedDuration, setStitchedDuration] = useState<number>(0);

  // Check MoviePy Status
  const checkStatus = async () => {
    try {
      const res = await fetch('/api/multimedia/status');
      if (res.ok) {
        const data = await res.json();
        setMoviePyInstalled(data.moviePyInstalled);
      }
    } catch {
      setMoviePyInstalled(false);
    }
  };

  // Fetch Available Generated Audio Tracks
  const fetchAudioTracks = async () => {
    setLoadingTracks(true);
    try {
      const res = await fetch('/api/music/tracks');
      if (res.ok) {
        const data = await res.json();
        setAudioTracks(data.tracks || []);
        if (data.tracks?.length > 0 && !selectedAudioUrl) {
          setSelectedAudioUrl(data.tracks[0].url);
        }
      }
    } catch (err) {
      console.error('Failed to load audio tracks', err);
    } finally {
      setLoadingTracks(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkStatus();
      fetchAudioTracks();
      if (videoSourceUrl) {
        setCustomVideoPath(videoSourceUrl);
      }
      if (audioSourceUrl) {
        setSelectedAudioUrl(audioSourceUrl);
      }
    }
  }, [isOpen, videoSourceUrl, audioSourceUrl]);

  // Install MoviePy Handler
  const handleInstallMoviePy = async () => {
    setInstallingMoviePy(true);
    setInstallLogs('Beginning pip install moviepy in local g_env Python...\n');
    onAddLog?.('INFO', 'Initiated MoviePy multimedia engine installation in g_env');
    try {
      const res = await fetch('/api/multimedia/install-moviepy', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setMoviePyInstalled(true);
        setInstallLogs((prev) => prev + '\n' + (data.output || 'MoviePy successfully installed!'));
        onAddLog?.('INFO', 'MoviePy library verified and ready for multimedia stitching');
      } else {
        setInstallLogs((prev) => prev + '\nError: ' + (data.output || 'Installation failed'));
        onAddLog?.('WARN', `MoviePy installation notice: ${data.output || 'Failed'}`);
      }
    } catch (err: any) {
      setInstallLogs((prev) => prev + '\nException: ' + err.message);
    } finally {
      setInstallingMoviePy(false);
    }
  };

  // Trigger Stitching Job
  const handleStitch = async () => {
    const activeVideo = customVideoPath || videoSourceUrl;
    if (!activeVideo || !selectedAudioUrl) {
      onAddLog?.('WARN', 'Select both a video source and an audio soundtrack to stitch');
      return;
    }

    onAddLog?.('INFO', `Queueing multimedia stitch: [${activeVideo}] + [${selectedAudioUrl}]`);
    try {
      const res = await fetch('/api/multimedia/stitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoPath: activeVideo,
          audioPath: selectedAudioUrl,
          audioVolume,
          videoVolume,
          fadeIn,
          fadeOut,
          loopVideo,
          syncMode,
          duration: customDuration
        })
      });

      const data = await res.json();
      if (res.ok && data.jobId) {
        await adoptJob(data.jobId);
        onAddLog?.('INFO', `Multimedia stitch job queued: ID ${data.jobId}`);
      } else {
        onAddLog?.('WARN', `Stitch job rejected: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      onAddLog?.('WARN', `Failed to queue multimedia stitch: ${err.message}`);
    }
  };

  // Watch for job completion
  useEffect(() => {
    if (job?.workflowId === 'media_stitch' && job.status === 'COMPLETED' && job.outputs?.[0]?.url) {
      setStitchedResultUrl(job.outputs[0].url);
      setStitchedDuration(job.outputs[0].duration || 0);
      onAddLog?.('INFO', `Multimedia master render ready: ${job.outputs[0].filename}`);
    }
  }, [job]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col custom-scrollbar"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 border border-indigo-500/40 rounded-xl text-indigo-400 shadow-md">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  Multimedia Audio + Video Stitching Suite
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    MoviePy + FFmpeg
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Fuse LTX-Video clips & GIF animations with generated AudioCraft songs & soundtracks
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* MoviePy Status & Auto-Installer Sentry */}
            <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
              moviePyInstalled
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}>
              <div className="flex items-start gap-3">
                {moviePyInstalled ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <span>Python MoviePy Library:</span>
                    <span className="font-mono">{moviePyInstalled ? 'Installed & Ready' : 'Not Detected in g_env'}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {moviePyInstalled
                      ? 'Local MoviePy engine active with multi-track mixing, volume crossfades & frame synchronization.'
                      : 'Install moviepy into C:\\Gina_AI\\g_env with 1 click to unlock high-precision Python video/audio compositing.'}
                  </p>
                </div>
              </div>

              {!moviePyInstalled && (
                <button
                  type="button"
                  onClick={handleInstallMoviePy}
                  disabled={installingMoviePy}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-lg flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50 shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${installingMoviePy ? 'animate-spin' : ''}`} />
                  {installingMoviePy ? 'Installing MoviePy...' : '1-Click Install MoviePy'}
                </button>
              )}
            </div>

            {installLogs && (
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-400 max-h-24 overflow-y-auto whitespace-pre-wrap">
                {installLogs}
              </div>
            )}

            {/* Two Column Grid: Inputs vs Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Media Selection */}
              <div className="space-y-4">
                {/* Video Source Card */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Film className="w-4 h-4 text-emerald-400" />
                    1. Video Track Source
                  </label>

                  {videoSourceUrl ? (
                    <div className="flex items-center gap-3 bg-slate-900 p-2.5 rounded-lg border border-slate-700/60">
                      <div className="w-16 h-12 bg-black rounded overflow-hidden flex items-center justify-center shrink-0 border border-slate-800">
                        <video src={videoSourceUrl} className="w-full h-full object-cover" muted />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-200 truncate">
                          {videoSourceName || 'Active Studio Video Render'}
                        </div>
                        <div className="text-[10px] font-mono text-emerald-400 truncate">{videoSourceUrl}</div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="text"
                        placeholder="Path or URL (e.g., /media/video.mp4 or C:\Gina_AI\media\...)"
                        value={customVideoPath}
                        onChange={(e) => setCustomVideoPath(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}
                </div>

                {/* Audio Soundtrack Card */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Music className="w-4 h-4 text-indigo-400" />
                      2. AI Music Soundtrack
                    </label>
                    <button
                      type="button"
                      onClick={fetchAudioTracks}
                      className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingTracks ? 'animate-spin' : ''}`} /> Refresh Tracks
                    </button>
                  </div>

                  {audioTracks.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                      {audioTracks.map((t) => (
                        <div
                          key={t.filename}
                          onClick={() => setSelectedAudioUrl(t.url)}
                          className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                            selectedAudioUrl === t.url
                              ? 'bg-indigo-500/15 border-indigo-400 text-slate-100 shadow-md shadow-indigo-500/10'
                              : 'bg-slate-900 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`p-1.5 rounded ${selectedAudioUrl === t.url ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                              <Play className="w-3 h-3 fill-current" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold truncate">{t.name}</div>
                              <div className="text-[9px] font-mono text-slate-500">{t.durationSec}s · {t.style || 'AudioCraft BGM'}</div>
                            </div>
                          </div>
                          {selectedAudioUrl === t.url && (
                            <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 text-center space-y-2">
                      <Music className="w-6 h-6 mx-auto text-slate-600" />
                      <div className="text-xs text-slate-400 font-medium">No AudioCraft tracks generated yet</div>
                      <p className="text-[10px] text-slate-500">
                        Generate music in the Music Suite tab first, or enter an audio path below.
                      </p>
                      <input
                        type="text"
                        placeholder="Path to .wav / .mp3"
                        value={selectedAudioUrl}
                        onChange={(e) => setSelectedAudioUrl(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200"
                      />
                    </div>
                  )}

                  {Boolean(selectedAudioUrl) && (
                    <audio src={selectedAudioUrl || undefined} controls className="w-full h-8 mt-2" />
                  )}
                </div>
              </div>

              {/* Right Column: Stitching Parameters */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-4">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-fuchsia-400" />
                  3. MoviePy Audio/Video Compositing Controls
                </label>

                {/* Duration Sync Mode */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-bold block">DURATION SYNC MODE</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'match_video', label: 'Match Video Duration', desc: 'Loops audio or trims to video length' },
                      { id: 'match_audio', label: 'Match Audio Duration', desc: 'Loops video to full song length' },
                      { id: 'shortest', label: 'Shortest Stream', desc: 'Trims at the earliest finish' },
                      { id: 'custom', label: 'Custom Duration', desc: 'Explicit seconds timeline' },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setSyncMode(mode.id as any)}
                        className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                          syncMode === mode.id
                            ? 'bg-fuchsia-500/15 border-fuchsia-400 text-fuchsia-200'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-[11px] font-bold">{mode.label}</div>
                        <div className="text-[9px] text-slate-500 mt-0.5">{mode.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {syncMode === 'custom' && (
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Target Duration (Seconds)</label>
                    <input
                      type="number"
                      value={customDuration}
                      onChange={(e) => setCustomDuration(Number(e.target.value))}
                      min={1}
                      max={300}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono"
                    />
                  </div>
                )}

                {/* Volume Multipliers */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-bold">MUSIC VOLUME</span>
                      <span className="font-mono text-indigo-400">{Math.round(audioVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={2}
                      step={0.05}
                      value={audioVolume}
                      onChange={(e) => setAudioVolume(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-bold">ORIGINAL VIDEO AUDIO</span>
                      <span className="font-mono text-emerald-400">{Math.round(videoVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={videoVolume}
                      onChange={(e) => setVideoVolume(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Audio Fades */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Fade-In (Sec)</label>
                    <input
                      type="number"
                      value={fadeIn}
                      onChange={(e) => setFadeIn(parseFloat(e.target.value) || 0)}
                      step={0.1}
                      min={0}
                      max={5}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Fade-Out (Sec)</label>
                    <input
                      type="number"
                      value={fadeOut}
                      onChange={(e) => setFadeOut(parseFloat(e.target.value) || 0)}
                      step={0.1}
                      min={0}
                      max={5}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono"
                    />
                  </div>
                </div>

                {/* Looping Toggle */}
                <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    <Repeat className="w-3.5 h-3.5 text-cyan-400" />
                    Auto-Loop Video Stream
                  </div>
                  <button
                    type="button"
                    onClick={() => setLoopVideo(!loopVideo)}
                    className={`px-3 py-1 rounded text-[10px] font-bold border cursor-pointer transition-colors ${
                      loopVideo
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'bg-slate-950 text-slate-500 border-slate-800'
                    }`}
                  >
                    {loopVideo ? 'LOOP ENABLED' : 'NO LOOP'}
                  </button>
                </div>

                {/* Render Stitch Button */}
                <button
                  type="button"
                  onClick={handleStitch}
                  disabled={isStitching || (!customVideoPath && !videoSourceUrl) || !selectedAudioUrl}
                  className="w-full py-3 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-emerald-500 hover:opacity-95 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  {isStitching ? `Stitching Video & Soundtrack (${job?.progress || 0}%)...` : 'Render Stitched Multimedia Master'}
                </button>
              </div>
            </div>

            {/* Output Master Player */}
            {stitchedResultUrl && (
              <div className="p-4 bg-slate-950 rounded-xl border border-emerald-500/40 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    Stitched Multimedia Master Video Complete
                  </div>
                  <a
                    href={stitchedResultUrl}
                    download="stitched_multimedia_master.mp4"
                    className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] rounded flex items-center gap-1.5 uppercase tracking-wider"
                  >
                    <Download className="w-3 h-3" /> Download MP4
                  </a>
                </div>

                <div className="relative aspect-video max-h-72 bg-black rounded-lg overflow-hidden mx-auto flex items-center justify-center border border-slate-800">
                  <video
                    src={stitchedResultUrl}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
