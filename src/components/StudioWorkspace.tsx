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
  onAddLog: (level: 'INFO' | 'WARN' | 'SEC' | 'RULE', message: string, ruleId?: string) => void;
  onClearCache: () => void;
}

const MODES: Array<{ id: StudioMode; label: string; icon: React.ElementType }> = [
  { id: 'web-search', label: 'Web Search', icon: Search },
  { id: 'web-app', label: 'Web App', icon: Globe2 },
  { id: 'code-engine', label: 'Code Engine', icon: Code2 },
  { id: 'image-studio', label: 'Image Studio', icon: ImageIcon },
  { id: 'video-generation', label: 'Video Generation', icon: Video },
];

function ArtifactFrame({ mode, html, source, onRefresh }: { mode: StudioMode; html: string; source: string; onRefresh: () => void }) {
  const srcDoc = useMemo(
    () =>
      html ||
      `<!doctype html><html><body style="margin:0;background:#000;color:#94a3b8;font-family:system-ui;display:grid;place-items:center;height:100vh"><div style="text-align:center"><h2 style="color:#e2e8f0;font-weight:500">Artifact canvas</h2><p style="font-size:13px">Use Web App mode to edit a live HTML preview.</p></div></body></html>`,
    [html]
  );
  return (
    <section className="gina-grok-artifact flex flex-col h-full min-h-0">
      <div className="gina-grok-modes flex items-center justify-between gap-2 px-3 py-1.5 shrink-0">
        <div className="text-[11px] text-slate-500 font-mono truncate">{source || MODES.find(x => x.id === mode)?.label}</div>
        <button type="button" onClick={onRefresh} className="gina-console-action text-slate-500" title="Refresh artifact">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <iframe title="Live artifact" srcDoc={srcDoc} sandbox="allow-scripts" className="w-full h-full border-0 bg-white" />
      </div>
    </section>
  );
}

export const StudioWorkspace: React.FC<Props> = ({ telemetry, logs, onAddLog, onClearCache }) => {
  const [mode, setMode] = useState<StudioMode>('web-app');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ title?: string; url?: string; snippet?: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [code, setCode] = useState(
    '<!doctype html>\n<html>\n  <body style="font-family:system-ui;padding:48px;background:#000;color:#e2e8f0">\n    <h1>Gina Web App</h1>\n    <p>Edit this artifact and watch the preview update live.</p>\n  </body>\n</html>'
  );
  const [artifactVersion, setArtifactVersion] = useState(0);

  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
    try {
      const saved = localStorage.getItem('gina_studio_layout_mode');
      if (saved === 'assistant-fullscreen' || saved === 'split' || saved === 'artifact-fullscreen') return saved as LayoutMode;
    } catch {}
    return 'assistant-fullscreen';
  });

  const [isTrueFullScreen, setIsTrueFullScreen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTrueFullScreen) setIsTrueFullScreen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTrueFullScreen]);

  const handleSetLayoutMode = (next: LayoutMode) => {
    setLayoutMode(next);
    try {
      localStorage.setItem('gina_studio_layout_mode', next);
    } catch {}
  };

  const [chatColWidth, setChatColWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('gina_studio_chat_width');
      if (saved) return Math.max(120, Math.min(window.innerWidth * 0.95, Number(saved)));
    } catch {}
    return Math.round(window.innerWidth * 0.42);
  });
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);

  useEffect(() => {
    if (!isDraggingSplit) return;
    const handleMouseMove = (e: MouseEvent) => {
      setChatColWidth(Math.max(120, Math.min(window.innerWidth * 0.95, e.clientX)));
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
      const res = await fetch('/api/agent/web-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      const results = Array.isArray(data?.results) ? data.results : Array.isArray(data?.items) ? data.items : [];
      setSearchResults(results);
      onAddLog('INFO', `Web search completed: ${results.length} result(s).`);
    } catch (error: any) {
      onAddLog('WARN', `Web search failed: ${error?.message || 'unknown error'}`);
    } finally {
      setSearching(false);
    }
  };

  if (layoutMode === 'assistant-fullscreen' || isTrueFullScreen) {
    return (
      <div className={`gina-grok-shell ${isTrueFullScreen ? 'is-immersive' : ''}`}>
        <div className="gina-grok-topbar">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-medium text-slate-200">Gina</span>
            <span className="text-slate-600">· local</span>
          </div>
          <nav className="gina-grok-modes flex items-center gap-1 overflow-x-auto custom-scrollbar" aria-label="Studio modes">
            {MODES.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" onClick={() => setMode(id)} className={`gina-grok-chip ${mode === id ? 'is-active' : ''}`}>
                <Icon className="w-3 h-3" />{label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2 ml-auto">
            <button type="button" onClick={() => handleSetLayoutMode('split')} className="gina-console-action text-slate-500" title="Split with artifact"><Columns className="w-3.5 h-3.5" /></button>
            <button type="button" onClick={() => setIsTrueFullScreen(!isTrueFullScreen)} className="gina-console-action text-slate-500" title={isTrueFullScreen ? 'Exit immersive' : 'Immersive'}>
              {isTrueFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
        <div className="gina-grok-chat-area flex-1 min-h-0">
          <LocalLlmStudio
            onAddLog={onAddLog}
            studioMode={mode}
            onWebAppArtifact={setCode}
            isFullScreen
            onToggleFullScreen={() => handleSetLayoutMode('split')}
            onModeChange={setMode}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="studio-shell gina-grok-shell">
      <header className="studio-modebar" style={{border:'none',background:'transparent',borderRadius:0}}>
        <div className="studio-brand text-emerald-300"><span className="studio-status-dot" /><span>GINA STUDIO</span></div>
        <nav className="studio-tabs custom-scrollbar" aria-label="Studio modes">
          {MODES.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className={`studio-tab ${mode === id ? 'is-active' : ''}`} onClick={() => setMode(id)}>
              <Icon className="w-3.5 h-3.5" /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={() => handleSetLayoutMode('assistant-fullscreen')} className="gina-console-action text-emerald-300"><Maximize2 className="w-3.5 h-3.5" /> Chat only</button>
        </div>
      </header>
      <div className="flex-1 min-h-0 flex" style={layoutMode === 'split' ? { display: 'grid', gridTemplateColumns: `${chatColWidth}px 6px 1fr` } : undefined}>
        {layoutMode !== 'artifact-fullscreen' && (
          <div className="min-h-0 min-w-0 overflow-hidden">
            <LocalLlmStudio onAddLog={onAddLog} studioMode={mode} onWebAppArtifact={setCode} isFullScreen={false} onToggleFullScreen={() => handleSetLayoutMode('assistant-fullscreen')} onModeChange={setMode} />
          </div>
        )}
        {layoutMode === 'split' && (
          <div className={`studio-split-resizer ${isDraggingSplit ? 'is-dragging' : ''}`} onMouseDown={e => { e.preventDefault(); setIsDraggingSplit(true); }}>
            <div className="studio-split-resizer-line" />
          </div>
        )}
        {layoutMode !== 'assistant-fullscreen' && (
          <div className="min-h-0 min-w-0 overflow-hidden">
            {mode === 'image-studio' ? (
              <div className="h-full overflow-auto p-2"><PromptStudio onAddLog={onAddLog} onClearCache={onClearCache} telemetry={telemetry} /></div>
            ) : mode === 'video-generation' ? (
              <div className="h-full overflow-auto p-2"><VideoStudio onAddLog={onAddLog} logs={logs} telemetry={telemetry} onClearCache={onClearCache} /></div>
            ) : mode === 'web-search' ? (
              <div className="h-full overflow-auto p-4 font-mono text-[12px] text-slate-400">
                <div className="flex gap-2 mb-3">
                  <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && void runSearch()} placeholder="Search…" className="gina-console-search flex-1" />
                  <button type="button" onClick={() => void runSearch()} className="gina-console-action text-emerald-300">{searching ? '…' : 'Go'}</button>
                </div>
                {searchResults.map((r, i) => (
                  <div key={i} className="py-1.5"><a href={r.url} target="_blank" rel="noreferrer" className="text-sky-400">{r.title || r.url}</a><div className="text-slate-600">{r.snippet}</div></div>
                ))}
              </div>
            ) : mode === 'code-engine' ? (
              <div className="h-full flex flex-col min-h-0">
                <textarea className="flex-1 w-full bg-black text-violet-300 font-mono text-[11px] p-3 border-0 outline-none resize-none" value={code} onChange={e => setCode(e.target.value)} spellCheck={false} />
                <div className="px-3 py-1"><button type="button" className="gina-console-action text-emerald-300" onClick={() => setArtifactVersion(v => v + 1)}><Play className="w-3 h-3" /> Preview</button></div>
              </div>
            ) : (
              <ArtifactFrame mode={mode} html={code} source="Live artifact" onRefresh={() => setArtifactVersion(v => v + 1)} key={artifactVersion} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
