import React, { useEffect, useMemo, useState } from 'react';
import { Code2, Columns, Globe2, Image as ImageIcon, Maximize, Maximize2, Minimize2, Play, RefreshCw, Search, Sparkles, Video } from 'lucide-react';
import { LocalLlmStudio } from './LocalLlmStudio';
import { PromptStudio } from './PromptStudio';
import { VideoStudio } from './VideoStudio';
import type { LogEntry, SystemTelemetry } from '../types';

export type StudioMode = 'web-search' | 'web-app' | 'code-engine' | 'image-studio' | 'video-generation';
export type LayoutMode = 'assistant-fullscreen' | 'split' | 'artifact-fullscreen';

interface Props {
  telemetry: SystemTelemetry;
  logs: LogEntry[];
  onAddLog: (level: 'INFO'|'WARN'|'SEC'|'RULE', message: string, ruleId?: string) => void;
  onClearCache: () => void;
}

const MODES: Array<{id: StudioMode; label: string; icon: React.ElementType}> = [
  { id: 'web-search', label: 'Web Search', icon: Search },
  { id: 'web-app', label: 'Web App', icon: Globe2 },
  { id: 'code-engine', label: 'Code Engine', icon: Code2 },
  { id: 'image-studio', label: 'Image Studio', icon: ImageIcon },
  { id: 'video-generation', label: 'Video Generation', icon: Video },
];

function ArtifactFrame({ mode, html, source, onRefresh }: { mode: StudioMode; html: string; source: string; onRefresh: () => void }) {
  const srcDoc = useMemo(() => html || `<!doctype html><html><body style="margin:0;background:#020617;color:#cbd5e1;font-family:system-ui;display:grid;place-items:center;height:100vh"><div style="text-align:center"><div style="font-size:42px">✦</div><h2>Artifact canvas ready</h2><p>Use Web App to edit a live HTML artifact, or choose another studio mode.</p></div></body></html>`, [html]);
  return <section className="studio-artifact-panel">
    <div className="studio-artifact-toolbar">
      <div className="min-w-0"><div className="studio-eyebrow">ARTIFACT VIEW</div><div className="studio-artifact-title">{source || MODES.find(x => x.id === mode)?.label}</div></div>
      <button type="button" onClick={onRefresh} className="studio-icon-button" title="Refresh artifact"><RefreshCw className="w-3.5 h-3.5" /></button>
    </div>
    <div className="studio-artifact-canvas">
      <iframe title="Live artifact" srcDoc={srcDoc} sandbox="allow-scripts" className="studio-artifact-frame" />
    </div>
  </section>;
}

export const StudioWorkspace: React.FC<Props> = ({ telemetry, logs, onAddLog, onClearCache }) => {
  const [mode, setMode] = useState<StudioMode>('web-app');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{title?: string; url?: string; snippet?: string}>>([]);
  const [searching, setSearching] = useState(false);
  const [code, setCode] = useState('<!doctype html>\n<html>\n  <body style="font-family:system-ui;padding:48px;background:#020617;color:#e2e8f0">\n    <h1>Gina Web App</h1>\n    <p>Edit this artifact and watch the preview update live.</p>\n  </body>\n</html>');
  const [artifactVersion, setArtifactVersion] = useState(0);

  // Layout mode: 'assistant-fullscreen' (Gina Assistant fills entire screen top-to-bottom), 'split' (side by side), 'artifact-fullscreen' (artifact only)
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
    try {
      const saved = localStorage.getItem('gina_studio_layout_mode');
      if (saved === 'assistant-fullscreen' || saved === 'split' || saved === 'artifact-fullscreen') return saved as LayoutMode;
    } catch {}
    return 'assistant-fullscreen'; // User explicitly requested Gina Assistant full screen view top to bottom
  });

  const [isTrueFullScreen, setIsTrueFullScreen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTrueFullScreen) {
        setIsTrueFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTrueFullScreen]);

  const handleSetLayoutMode = (next: LayoutMode) => {
    setLayoutMode(next);
    try { localStorage.setItem('gina_studio_layout_mode', next); } catch {}
  };

  // Dynamic resizable layout state
  const [chatColWidth, setChatColWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('gina_studio_chat_width');
      if (saved) return Math.max(280, Math.min(window.innerWidth * 0.75, Number(saved)));
    } catch {}
    return Math.round(window.innerWidth * 0.40);
  });
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);

  useEffect(() => {
    if (!isDraggingSplit) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(280, Math.min(window.innerWidth * 0.75, e.clientX));
      setChatColWidth(newWidth);
    };
    const handleMouseUp = () => {
      setIsDraggingSplit(false);
      try {
        localStorage.setItem('gina_studio_chat_width', String(chatColWidth));
      } catch {}
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSplit, chatColWidth]);

  useEffect(() => {
    if (mode !== 'web-search') return;
    setSearchResults([]);
  }, [mode]);

  const runSearch = async () => {
    if (!query.trim() || searching) return;
    setSearching(true);
    try {
      const res = await fetch('/api/agent/web-search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: query.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      const results = Array.isArray(data?.results) ? data.results : Array.isArray(data?.items) ? data.items : [];
      setSearchResults(results);
      onAddLog('INFO', `Web search completed: ${results.length} result(s).`);
    } catch (error: any) {
      onAddLog('WARN', `Web search failed: ${error?.message || 'unknown error'}`);
    } finally { setSearching(false); }
  };

  const modeHeader = MODES.find(x => x.id === mode)!;
  return <div className="studio-shell">
    <header className="studio-modebar">
      <div className="studio-brand"><Sparkles className="w-4 h-4 text-emerald-400" /><span>GINA LOCAL AI STUDIO</span><span className="studio-status-dot" /></div>
      
      {/* Studio modes */}
      <nav className="studio-tabs custom-scrollbar" aria-label="Studio modes">
        {MODES.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setMode(id)} className={`studio-tab ${mode === id ? 'is-active' : ''}`}><Icon className="w-3.5 h-3.5" />{label}</button>)}
      </nav>

      {/* Screen layout matrix controls */}
      <div className="flex items-center gap-1.5 ml-auto">
        <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 p-0.5 rounded-lg">
          <button
            type="button"
            onClick={() => handleSetLayoutMode('assistant-fullscreen')}
            className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
              layoutMode === 'assistant-fullscreen'
                ? 'bg-emerald-500 text-slate-950 shadow-sm font-extrabold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Gina Assistant Full Screen View Top-to-Bottom"
          >
            <Maximize2 className="w-3 h-3" /> Full Screen Assistant
          </button>
          <button
            type="button"
            onClick={() => handleSetLayoutMode('split')}
            className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
              layoutMode === 'split'
                ? 'bg-emerald-500 text-slate-950 shadow-sm font-extrabold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Side-by-side Split View"
          >
            <Columns className="w-3 h-3" /> Split View
          </button>
          <button
            type="button"
            onClick={() => handleSetLayoutMode('artifact-fullscreen')}
            className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
              layoutMode === 'artifact-fullscreen'
                ? 'bg-emerald-500 text-slate-950 shadow-sm font-extrabold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Artifact Focus Only"
          >
            <Globe2 className="w-3 h-3" /> Artifact Focus
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsTrueFullScreen(true)}
          className="px-2.5 py-1 rounded border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
          title="Enter Immersive Full Screen View Top-to-Bottom"
        >
          <Maximize className="w-3 h-3 text-emerald-400" />
          <span className="hidden sm:inline">Immersive</span>
        </button>

        {layoutMode === 'split' && (
          <div className="hidden lg:flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono border-l border-zinc-800 pl-2">
            <span>SPLIT: {Math.round(chatColWidth)}px</span>
            <button 
              type="button" 
              onClick={() => {
                const def = Math.round(window.innerWidth * 0.40);
                setChatColWidth(def);
                try { localStorage.setItem('gina_studio_chat_width', String(def)); } catch {}
              }}
              className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Reset split proportions to default (40% / 60%)"
            >
              Reset
            </button>
          </div>
        )}
      </div>
    </header>

    <div 
      className={`studio-workspace-grid ${layoutMode === 'assistant-fullscreen' ? 'is-fullscreen' : layoutMode === 'artifact-fullscreen' ? 'is-artifact-only' : ''}`} 
      style={{ '--chat-col-width': `${chatColWidth}px` } as React.CSSProperties}
    >
      <aside className={`studio-chat-column ${layoutMode === 'assistant-fullscreen' ? 'w-full max-w-full flex-1' : ''}`}>
        <div className="studio-column-header">
          <div className="flex items-center gap-3">
            <div>
              <div className="studio-eyebrow">CHAT TERMINAL</div>
              <div className="studio-column-title flex items-center gap-2">
                <span>Gina Assistant</span>
                <span className="studio-runtime-pill">LOCAL</span>
                {layoutMode === 'assistant-fullscreen' && (
                  <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
                    FULL SCREEN TOP TO BOTTOM
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSetLayoutMode(layoutMode === 'assistant-fullscreen' ? 'split' : 'assistant-fullscreen')}
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
              title={layoutMode === 'assistant-fullscreen' ? 'Switch to Split View' : 'Expand to Full Screen View Top to Bottom'}
            >
              {layoutMode === 'assistant-fullscreen' ? (
                <>
                  <Minimize2 className="w-3 h-3 text-slate-400" /> Split View
                </>
              ) : (
                <>
                  <Maximize2 className="w-3 h-3 text-emerald-400" /> Full Screen View
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsTrueFullScreen(true)}
              className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer"
              title="Open Immersive Edge-to-Edge Full Screen"
            >
              <Maximize className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="studio-chat-scroll custom-scrollbar flex-1 h-full">
          <LocalLlmStudio 
            onAddLog={onAddLog} 
            studioMode={mode} 
            onWebAppArtifact={setCode}
            isFullScreen={layoutMode === 'assistant-fullscreen'}
            onToggleFullScreen={() => handleSetLayoutMode(layoutMode === 'assistant-fullscreen' ? 'split' : 'assistant-fullscreen')}
            onModeChange={setMode}
          />
        </div>
      </aside>

      {/* Movable draggable divider bar */}
      {layoutMode === 'split' && (
        <div 
          className={`studio-split-resizer ${isDraggingSplit ? 'is-dragging' : ''}`} 
          onMouseDown={(e) => { e.preventDefault(); setIsDraggingSplit(true); }}
          title="Drag left or right to resize chat terminal vs artifact panel"
        >
          <div className="studio-split-resizer-line" />
        </div>
      )}

      {layoutMode !== 'assistant-fullscreen' && (
        <main className="studio-artifact-column custom-scrollbar">
          <div className="studio-context-strip">
            <div><span className="studio-eyebrow">ACTIVE MODE</span><div className="studio-context-title">{modeHeader.label}</div></div>
            <div className="studio-context-meta font-mono text-[10px] text-zinc-400">
              DRAGGABLE SPLIT · RESIZABLE ARTIFACT PANEL
            </div>
          </div>

          {mode === 'web-search' && <section className="studio-mode-card">
            <div className="studio-mode-card-title"><Search className="w-4 h-4 text-sky-400" /> Public Web Search</div>
            <div className="studio-search-row"><input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void runSearch(); }} placeholder="Search the public web…" /><button type="button" onClick={() => void runSearch()} disabled={searching}><Search className="w-4 h-4" />{searching ? 'Searching' : 'Search'}</button></div>
            <div className="studio-results custom-scrollbar">{searchResults.length ? searchResults.map((r, i) => <article key={`${r.url}-${i}`} className="studio-result"><div className="studio-result-title">{r.title || r.url || 'Result'}</div><div className="studio-result-url">{r.url}</div><p>{r.snippet}</p></article>) : <div className="studio-empty">Run a search to populate the artifact panel with current web results.</div>}</div>
          </section>}

          {mode === 'web-app' && <section className="studio-code-card">
            <div className="studio-mode-card-title"><Globe2 className="w-4 h-4 text-emerald-400" /> Live Web App Artifact</div>
            <textarea value={code} onChange={e => setCode(e.target.value)} spellCheck={false} className="studio-code-editor custom-scrollbar" />
            <div className="studio-code-actions"><button type="button" onClick={() => setArtifactVersion(v => v + 1)}><Play className="w-3.5 h-3.5" /> Run artifact</button><span>Version {artifactVersion + 1} · sandboxed preview</span></div>
          </section>}

          {mode === 'code-engine' && <section className="studio-mode-card"><div className="studio-mode-card-title"><Code2 className="w-4 h-4 text-violet-400" /> Code Engine</div><div className="studio-code-log custom-scrollbar">{logs.slice(0, 16).map(log => <div key={log.id}><span>[{log.level}]</span> {log.message}</div>)}</div><div className="studio-empty">Project mutations and validation remain brokered by the existing Gina agent runtime.</div></section>}

          {mode === 'image-studio' && <div className="studio-native-panel custom-scrollbar"><PromptStudio onAddLog={onAddLog} onClearCache={onClearCache} telemetry={telemetry} stagedReferenceImage={null} /></div>}
          {mode === 'video-generation' && <div className="studio-native-panel custom-scrollbar"><VideoStudio onAddLog={onAddLog} logs={logs} telemetry={telemetry} onClearCache={onClearCache} /></div>}

          {(mode === 'web-app' || mode === 'code-engine' || mode === 'web-search') && <ArtifactFrame key={`${mode}-${artifactVersion}`} mode={mode} html={mode === 'web-app' ? code : ''} source={mode === 'web-app' ? 'live HTML preview' : mode === 'web-search' ? 'search results' : 'runtime log'} onRefresh={() => setArtifactVersion(v => v + 1)} />}
        </main>
      )}
    </div>

    {/* True Immersive Fullscreen Overlay */}
    {isTrueFullScreen && (
      <div className="fixed inset-0 z-50 bg-[#020617] h-screen w-screen flex flex-col overflow-hidden">
        <header className="h-12 border-b border-slate-800 bg-slate-950/95 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold tracking-wider text-slate-200">GINA ASSISTANT</span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono text-[9px] font-bold">
              FULL SCREEN VIEW · TOP TO BOTTOM
            </span>
            <span className="studio-status-dot" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">Press Esc or</span>
            <button
              type="button"
              onClick={() => setIsTrueFullScreen(false)}
              className="px-3 py-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Minimize2 className="w-3.5 h-3.5" /> Exit Full Screen
            </button>
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-2 sm:p-4">
          <LocalLlmStudio
            onAddLog={onAddLog}
            studioMode={mode}
            onWebAppArtifact={setCode}
            isFullScreen={true}
            onToggleFullScreen={() => setIsTrueFullScreen(false)}
            onModeChange={setMode}
          />
        </div>
      </div>
    )}
  </div>;
};
