import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  RefreshCw,
  Cpu,
  Layers,
  FileText,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
  Sliders,
  Copy,
  Check,
  HardDrive
} from 'lucide-react';

interface RagSearchResult {
  chunk: {
    id: string;
    category: string;
    title: string;
    sourceFile: string;
    content: string;
    keywords: string[];
  };
  score: number;
  matchedKeywords: string[];
}

interface RagStatus {
  indexed: boolean;
  documentCount: number;
  chunkCount: number;
  totalWords: number;
  categories: Record<string, number>;
  lastIndexedAt: string | null;
  vramUsageMB: number;
  ramUsageKB: number;
  engine: string;
}

interface Props {
  onAddLog?: (level: 'info' | 'warn' | 'error' | 'success', message: string) => void;
  defaultExpanded?: boolean;
}

export const LocalRagKnowledgePanel: React.FC<Props> = ({ onAddLog, defaultExpanded = false }) => {
  const [isOpen, setIsOpen] = useState<boolean>(defaultExpanded);
  const [status, setStatus] = useState<RagStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [reindexing, setReindexing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('VRAM cage');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [results, setResults] = useState<RagSearchResult[]>([]);
  const [searchTime, setSearchTime] = useState<number>(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/rag/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
      // Ignore in mock/static mode
    }
  };

  const handleSearch = async (query: string = searchQuery, cat: string = selectedCategory) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), category: cat === 'ALL' ? undefined : cat, limit: 6 })
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        setSearchTime(data.searchTimeMs || 1);
        if (onAddLog) {
          onAddLog('info', `[LocalRAG] Query "${query}" matched ${data.totalMatches} chunks in ${data.searchTimeMs}ms`);
        }
      }
    } catch (err: any) {
      if (onAddLog) onAddLog('warn', `[LocalRAG] Query failed: ${err?.message || 'Network error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReindex = async () => {
    setReindexing(true);
    if (onAddLog) onAddLog('info', '[LocalRAG] Triggering sandbox document re-indexing pass...');
    try {
      const res = await fetch('/api/rag/reindex', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
        if (onAddLog) onAddLog('success', `[LocalRAG] Reindexing complete: ${data.status.chunkCount} chunks across ${data.status.documentCount} docs`);
        handleSearch();
      }
    } catch (err: any) {
      if (onAddLog) onAddLog('error', `[LocalRAG] Reindex error: ${err?.message}`);
    } finally {
      setReindexing(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    fetchStatus();
    handleSearch('VRAM cage', 'ALL');
  }, []);

  const categories = ['ALL', 'HARDWARE', 'LLM', 'AIDA64', 'AGENT', 'WORKFLOWS', 'ARCHITECTURE'];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-slate-900/60 hover:bg-slate-800/60 transition-colors text-left"
      >
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold text-slate-100">Local RAG Knowledge Engine & Vector Workbench</span>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                0 MB VRAM · Zero-GPU
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              In-memory BM25 + Vector semantic retrieval providing instant hardware, workflow, and sensor ground truth.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {status && (
            <div className="hidden md:flex items-center space-x-2 text-xs text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-emerald-400 font-mono font-semibold">{status.chunkCount}</span> chunks
              <span className="text-slate-600">·</span>
              <span className="text-cyan-400 font-mono font-semibold">{status.documentCount}</span> files
              <span className="text-slate-600">·</span>
              <span className="text-slate-300 font-mono font-semibold">{status.ramUsageKB} KB</span> RAM
            </div>
          )}
          {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 md:p-5 border-t border-slate-800 space-y-4">
          {/* Header Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">VRAM Footprint</div>
              <div className="text-base font-bold text-emerald-400 mt-0.5 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-400" /> 0.0 MB (Safe)
              </div>
              <div className="text-[10px] text-slate-400">Zero competition with Gemma/Flux</div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Indexed Chunks</div>
              <div className="text-base font-bold text-cyan-400 mt-0.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" /> {status?.chunkCount || 12} Chunks
              </div>
              <div className="text-[10px] text-slate-400">{status?.totalWords || 2400} total words</div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Documents</div>
              <div className="text-base font-bold text-sky-400 mt-0.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-sky-400" /> {status?.documentCount || 6} Doc Sources
              </div>
              <div className="text-[10px] text-slate-400">AGENTS.md, workflows, configs</div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Search Latency</div>
              <div className="text-base font-bold text-purple-400 mt-0.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" /> {searchTime}ms Instant
              </div>
              <div className="text-[10px] text-slate-400">In-memory CPU inverted index</div>
            </div>
          </div>

          {/* Search Bar & Controls */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch(searchQuery, selectedCategory)}
                placeholder="Search local knowledge (e.g. 'VRAM cage', 'Gemma 28 layers', 'AIDA64 68 sensors')..."
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSearch(searchQuery, selectedCategory)}
                disabled={loading}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>Search</span>
              </button>

              <button
                type="button"
                onClick={handleReindex}
                disabled={reindexing}
                title="Rescan sandbox and rebuild knowledge index"
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${reindexing ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
                <span className="hidden sm:inline">Re-Index</span>
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1.5">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat);
                  handleSearch(searchQuery, cat);
                }}
                className={`px-2.5 py-1 text-[11px] rounded-md font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-950/50 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {cat} {status?.categories?.[cat] ? `(${status.categories[cat]})` : ''}
              </button>
            ))}
          </div>

          {/* Query Results */}
          <div className="space-y-2.5">
            {results.length === 0 ? (
              <div className="bg-slate-950/40 border border-slate-800/60 rounded-lg p-6 text-center text-xs text-slate-400">
                {loading ? 'Searching local knowledge base...' : 'No matching knowledge chunks found. Try another query or trigger a Re-Index.'}
              </div>
            ) : (
              results.map(res => (
                <div
                  key={res.chunk.id}
                  className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 space-y-2 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-slate-800 text-slate-300 uppercase tracking-wider">
                          {res.chunk.category}
                        </span>
                        <h4 className="text-xs font-semibold text-slate-100">{res.chunk.title}</h4>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>Source: <code className="text-slate-300 font-mono">{res.chunk.sourceFile}</code></span>
                        <span>·</span>
                        <span className="text-emerald-400 font-semibold">Match Score: {res.score}%</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy(res.chunk.content, res.chunk.id)}
                      className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                      title="Copy knowledge snippet"
                    >
                      {copiedId === res.chunk.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <pre className="text-[11px] text-slate-300 font-sans whitespace-pre-wrap leading-relaxed bg-slate-900/60 p-2.5 rounded border border-slate-800/60">
                    {res.chunk.content}
                  </pre>

                  {res.chunk.keywords && res.chunk.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 items-center pt-1">
                      <span className="text-[9px] uppercase font-bold text-slate-400 mr-1">Indexed Keywords:</span>
                      {res.chunk.keywords.slice(0, 6).map((kw, i) => (
                        <span
                          key={i}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                            res.matchedKeywords.includes(kw)
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-900 text-slate-400'
                          }`}
                        >
                          #{kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
