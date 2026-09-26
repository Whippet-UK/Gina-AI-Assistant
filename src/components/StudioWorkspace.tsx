import React, { useEffect, useMemo, useState } from 'react';
import { Code2, Globe2, Image as ImageIcon, Play, RefreshCw, Search, Sparkles, Video } from 'lucide-react';
import { LocalLlmStudio } from './LocalLlmStudio';
import { PromptStudio } from './PromptStudio';
import { VideoStudio } from './VideoStudio';
import type { LogEntry, SystemTelemetry } from '../types';

export type StudioMode = 'web-search' | 'web-app' | 'code-engine' | 'image-studio' | 'video-generation';

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
      <nav className="studio-tabs" aria-label="Studio modes">
        {MODES.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setMode(id)} className={`studio-tab ${mode === id ? 'is-active' : ''}`}><Icon className="w-3.5 h-3.5" />{label}</button>)}
      </nav>
    </header>

    <div className="studio-workspace-grid">
      <aside className="studio-chat-column">
        <div className="studio-column-header"><div><div className="studio-eyebrow">CHAT TERMINAL</div><div className="studio-column-title">Gina Assistant</div></div><span className="studio-runtime-pill">LOCAL</span></div>
        <div className="studio-chat-scroll"><LocalLlmStudio onAddLog={onAddLog} studioMode={mode} onWebAppArtifact={setCode} /></div>
      </aside>

      <main className="studio-artifact-column">
        <div className="studio-context-strip"><div><span className="studio-eyebrow">ACTIVE MODE</span><div className="studio-context-title">{modeHeader.label}</div></div><div className="studio-context-meta">40vw CHAT · FLEX ARTIFACT</div></div>

        {mode === 'web-search' && <section className="studio-mode-card">
          <div className="studio-mode-card-title"><Search className="w-4 h-4 text-sky-400" /> Public Web Search</div>
          <div className="studio-search-row"><input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void runSearch(); }} placeholder="Search the public web…" /><button type="button" onClick={() => void runSearch()} disabled={searching}><Search className="w-4 h-4" />{searching ? 'Searching' : 'Search'}</button></div>
          <div className="studio-results">{searchResults.length ? searchResults.map((r, i) => <article key={`${r.url}-${i}`} className="studio-result"><div className="studio-result-title">{r.title || r.url || 'Result'}</div><div className="studio-result-url">{r.url}</div><p>{r.snippet}</p></article>) : <div className="studio-empty">Run a search to populate the artifact panel with current web results.</div>}</div>
        </section>}

        {mode === 'web-app' && <section className="studio-code-card">
          <div className="studio-mode-card-title"><Globe2 className="w-4 h-4 text-emerald-400" /> Live Web App Artifact</div>
          <textarea value={code} onChange={e => setCode(e.target.value)} spellCheck={false} className="studio-code-editor" />
          <div className="studio-code-actions"><button type="button" onClick={() => setArtifactVersion(v => v + 1)}><Play className="w-3.5 h-3.5" /> Run artifact</button><span>Version {artifactVersion + 1} · sandboxed preview</span></div>
        </section>}

        {mode === 'code-engine' && <section className="studio-mode-card"><div className="studio-mode-card-title"><Code2 className="w-4 h-4 text-violet-400" /> Code Engine</div><div className="studio-code-log">{logs.slice(0, 16).map(log => <div key={log.id}><span>[{log.level}]</span> {log.message}</div>)}</div><div className="studio-empty">Project mutations and validation remain brokered by the existing Gina agent runtime.</div></section>}

        {mode === 'image-studio' && <div className="studio-native-panel"><PromptStudio onAddLog={onAddLog} onClearCache={onClearCache} telemetry={telemetry} stagedReferenceImage={null} /></div>}
        {mode === 'video-generation' && <div className="studio-native-panel"><VideoStudio onAddLog={onAddLog} logs={logs} telemetry={telemetry} onClearCache={onClearCache} /></div>}

        {(mode === 'web-app' || mode === 'code-engine' || mode === 'web-search') && <ArtifactFrame key={`${mode}-${artifactVersion}`} mode={mode} html={mode === 'web-app' ? code : ''} source={mode === 'web-app' ? 'live HTML preview' : mode === 'web-search' ? 'search results' : 'runtime log'} onRefresh={() => setArtifactVersion(v => v + 1)} />}
      </main>
    </div>
  </div>;
};
