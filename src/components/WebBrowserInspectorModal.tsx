import React, { useEffect, useState } from 'react';
import { X, Globe2, Search, ExternalLink, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight, BookOpen, Layers, Terminal } from 'lucide-react';

interface BrowserStatus {
  enabled: boolean;
  provider: string;
  note: string;
  engine: string;
  chromeAvailable: boolean;
  chromePath: string | null;
  chromeName: string | null;
  mode: string;
}

interface WebSearchResultItem {
  title: string;
  url: string;
  snippet: string;
  source?: string;
}

interface BrowserPageItem {
  url: string;
  title: string;
  content: string;
  truncated?: boolean;
  engine?: string;
}

interface NetworkTestResult {
  ok: boolean;
  successful: number;
  total: number;
  results: Array<{
    name: string;
    url: string;
    ok: boolean;
    status?: number;
    latencyMs?: number;
    error?: string;
  }>;
}

interface WebBrowserInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectQuery?: (query: string) => void;
}

export const WebBrowserInspectorModal: React.FC<WebBrowserInspectorModalProps> = ({ isOpen, onClose, onSelectQuery }) => {
  const [status, setStatus] = useState<BrowserStatus | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<WebSearchResultItem[]>([]);
  const [pages, setPages] = useState<BrowserPageItem[]>([]);
  const [activeTab, setActiveTab] = useState<'search' | 'page' | 'network'>('search');
  const [activePage, setActivePage] = useState<BrowserPageItem | null>(null);
  const [networkTest, setNetworkTest] = useState<NetworkTestResult | null>(null);
  const [testingNetwork, setTestingNetwork] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ query: string; time: string; resultCount: number }>>([]);

  const loadStatus = async () => {
    try {
      const res = await fetch('/api/web/browser/status');
      if (res.ok) {
        setStatus(await res.json());
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isOpen) {
      void loadStatus();
    }
  }, [isOpen]);

  const handleSearch = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const q = (customQuery ?? query).trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      // Check if it's a direct URL
      if (/^https?:\/\//i.test(q)) {
        const pageRes = await fetch('/api/web/browser/open', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: q })
        });
        const pageData = await pageRes.json();
        if (!pageData.ok) throw new Error(pageData.error || 'Failed to open page');
        setActivePage(pageData.page);
        setActiveTab('page');
        setHistory(prev => [{ query: q, time: new Date().toLocaleTimeString(), resultCount: 1 }, ...prev.slice(0, 19)]);
      } else {
        const res = await fetch('/api/web/browser/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q, maxResults: 8, pagesToOpen: 2 })
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || 'Browser search failed');
        setResults(data.result?.results || []);
        setPages(data.result?.pages || []);
        if (data.result?.pages?.length > 0) {
          setActivePage(data.result.pages[0]);
        }
        setActiveTab('search');
        setHistory(prev => [{ query: q, time: new Date().toLocaleTimeString(), resultCount: data.result?.results?.length || 0 }, ...prev.slice(0, 19)]);
      }
    } catch (err: any) {
      setError(err?.message || 'Web query failed');
    } finally {
      setLoading(false);
    }
  };

  const runNetworkDiagnostic = async () => {
    setTestingNetwork(true);
    setActiveTab('network');
    try {
      const res = await fetch('/api/network/test');
      if (res.ok) {
        setNetworkTest(await res.json());
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Network diagnostic endpoint error');
      }
    } catch (err: any) {
      setError(err?.message || 'Network test failed');
    } finally {
      setTestingNetwork(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Globe2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">Gina Web Browser &amp; Internet Inspector</h3>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {status?.engine || 'HTTP Fetcher'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                Controlled public web research &middot; Safe outbound sandbox &middot; {status?.provider || 'DuckDuckGo HTML'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void runNetworkDiagnostic()}
              disabled={testingNetwork}
              className="px-2.5 py-1 rounded border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Test outbound HTTPS connectivity to public services"
            >
              <RefreshCw className={`w-3 h-3 ${testingNetwork ? 'animate-spin' : ''}`} />
              {testingNetwork ? 'Testing…' : 'Network Test'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Engine Status Banner */}
        <div className="px-5 py-2.5 bg-slate-950/50 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-slate-300">
              <span className={`w-2 h-2 rounded-full ${status?.enabled ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              {status?.enabled ? 'WEB ACCESS ENABLED' : 'WEB ACCESS DISABLED'}
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">
              Engine: <span className="text-sky-300 font-semibold">{status?.chromeAvailable ? `Chromium (${status.chromeName})` : 'HTTP fetcher (fallback)'}</span>
            </span>
            {status?.chromePath && (
              <span className="text-slate-500 truncate max-w-xs" title={status.chromePath}>
                Path: {status.chromePath}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <span>Timeout: 30s</span>
            <span>&middot;</span>
            <span>Max Chars: 30,000</span>
          </div>
        </div>

        {/* Search Input Bar */}
        <form onSubmit={handleSearch} className="p-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search the web (e.g. cheapest return flight to philippines from london heathrow) or enter full URL..."
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Globe2 className="w-3.5 h-3.5" />}
              {loading ? 'Browsing…' : 'Search & Fetch'}
            </button>
          </div>

          {/* Quick suggestions */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className="text-slate-500 font-mono mr-1">Try:</span>
            {[
              'cheapest return flight to philippines from london heathrow',
              'latest bbc news headlines',
              'nvidia rtx 3070 ti current price',
              'london weather forecast today'
            ].map(promptText => (
              <button
                key={promptText}
                type="button"
                onClick={() => {
                  setQuery(promptText);
                  void handleSearch(undefined, promptText);
                }}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono transition-colors border border-slate-700/60"
              >
                {promptText}
              </button>
            ))}
          </div>
        </form>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-5 border-b border-slate-800 bg-slate-950/40 text-xs font-mono">
          <button
            onClick={() => setActiveTab('search')}
            className={`px-3 py-2 border-b-2 font-bold transition-colors ${activeTab === 'search' ? 'border-sky-400 text-sky-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            Search Results ({results.length})
          </button>
          <button
            onClick={() => setActiveTab('page')}
            className={`px-3 py-2 border-b-2 font-bold transition-colors ${activeTab === 'page' ? 'border-sky-400 text-sky-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            Opened Page {activePage ? `(${activePage.title.slice(0, 24)}…)` : '(0)'}
          </button>
          <button
            onClick={() => setActiveTab('network')}
            className={`px-3 py-2 border-b-2 font-bold transition-colors ${activeTab === 'network' ? 'border-sky-400 text-sky-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            Network Diagnostic
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Web Research Notice</div>
                <div className="text-[11px] mt-0.5 font-mono">{error}</div>
              </div>
            </div>
          )}

          {/* TAB 1: Search Results */}
          {activeTab === 'search' && (
            <div>
              {results.length === 0 && !loading && (
                <div className="py-12 text-center text-slate-500 text-xs font-mono">
                  <Globe2 className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p>No web results loaded yet.</p>
                  <p className="text-[10px] text-slate-600 mt-1">Enter a search query or flight request above and click &quot;Search &amp; Fetch&quot;.</p>
                </div>
              )}

              {loading && (
                <div className="py-12 text-center text-sky-300 text-xs font-mono">
                  <RefreshCw className="w-8 h-8 text-sky-400 animate-spin mx-auto mb-2" />
                  <p>Querying DuckDuckGo / Brave and fetching top pages with Headless Browser…</p>
                </div>
              )}

              {results.length > 0 && (
                <div className="space-y-3">
                  <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between pb-1 border-b border-slate-800">
                    <span>Showing top {results.length} results for: <strong className="text-slate-300">&quot;{query}&quot;</strong></span>
                    <span>Provider: {status?.provider || 'DuckDuckGo'}</span>
                  </div>

                  {results.map((item, idx) => (
                    <div key={idx} className="p-3.5 rounded-lg border border-slate-800 bg-slate-950/60 hover:border-sky-500/40 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-semibold text-sky-300 hover:text-sky-200 hover:underline flex items-center gap-1.5"
                          >
                            {item.title}
                            <ExternalLink className="w-3 h-3 text-slate-500" />
                          </a>
                          <div className="text-[10px] font-mono text-emerald-400/90 mt-0.5 truncate max-w-lg">
                            {item.url}
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            setLoading(true);
                            try {
                              const pageRes = await fetch('/api/web/browser/open', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ url: item.url })
                              });
                              const pageData = await pageRes.json();
                              if (pageData.ok && pageData.page) {
                                setActivePage(pageData.page);
                                setActiveTab('page');
                              }
                            } catch {
                              // ignore
                            } finally {
                              setLoading(false);
                            }
                          }}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono shrink-0 transition-colors flex items-center gap-1"
                        >
                          <BookOpen className="w-3 h-3" /> Fetch Page
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-slate-300 leading-relaxed font-sans">
                        {item.snippet}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Opened Page Content */}
          {activeTab === 'page' && (
            <div>
              {!activePage ? (
                <div className="py-12 text-center text-slate-500 text-xs font-mono">
                  <BookOpen className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p>No page content loaded yet. Click &quot;Fetch Page&quot; next to any search result.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-950/80">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-100">{activePage.title}</h4>
                        <a href={activePage.url} target="_blank" rel="noreferrer" className="text-[10px] text-sky-400 hover:underline font-mono truncate block mt-0.5">
                          {activePage.url}
                        </a>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 shrink-0 text-right">
                        <div>{activePage.engine || 'HTTP fetcher'}</div>
                        <div className="text-slate-500">{activePage.content.length.toLocaleString()} characters</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border border-slate-800 bg-slate-950 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto">
                    {activePage.content}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Network Diagnostics */}
          {activeTab === 'network' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-950/80 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-200">Public Internet Diagnostic Sentry</div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                    Tests outbound HTTPS roundtrip connectivity to authoritative global test endpoints.
                  </div>
                </div>
                <button
                  onClick={() => void runNetworkDiagnostic()}
                  disabled={testingNetwork}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingNetwork ? 'animate-spin' : ''}`} />
                  {testingNetwork ? 'Testing…' : 'Run Live Diagnostic'}
                </button>
              </div>

              {networkTest && (
                <div className="space-y-2">
                  <div className={`p-3 rounded-lg border flex items-center gap-2 text-xs font-mono font-bold ${networkTest.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/30 bg-rose-500/10 text-rose-300'}`}>
                    {networkTest.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
                    <span>{networkTest.ok ? 'PUBLIC OUTBOUND INTERNET ACCESS CONFIRMED' : 'PUBLIC OUTBOUND INTERNET ACCESS RESTRICTED'}</span>
                    <span className="ml-auto font-normal">
                      {networkTest.successful} / {networkTest.total} endpoints reachable
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {networkTest.results.map((res, i) => (
                      <div key={i} className="p-2.5 rounded border border-slate-800 bg-slate-950/60 font-mono text-[11px] flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-200">{res.name}</div>
                          <div className="text-[9px] text-slate-500 truncate max-w-[200px]">{res.url}</div>
                        </div>
                        <div className="text-right">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${res.ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                            {res.ok ? `HTTP ${res.status || 200}` : 'FAILED'}
                          </span>
                          {res.latencyMs != null && (
                            <div className="text-[9px] text-slate-400 mt-0.5">{res.latencyMs}ms</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>Private/local IP ranges (127.0.0.1, 10.x, 192.168.x) are strictly sandboxed and blocked.</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase tracking-wider transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
