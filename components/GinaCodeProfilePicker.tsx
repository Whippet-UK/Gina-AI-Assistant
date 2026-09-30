import React, { useMemo, useState } from 'react';
import { Search, Code2, X } from 'lucide-react';
import {
  GINA_CODE_PROFILES,
  GINA_CODE_CATEGORIES,
  PYTHON_VERSIONS,
  filterCodeProfiles,
  type CodeProfile,
  type PythonVersion,
} from '../data/ginaCodeProfiles';

export interface GinaCodeProfilePickerProps {
  selectedId?: string | null;
  pythonVersion: PythonVersion;
  onPythonVersionChange: (v: PythonVersion) => void;
  onSelect: (profile: CodeProfile) => void;
  onInsertShortcode?: (shortcode: string) => void;
  className?: string;
}

export const GinaCodeProfilePicker: React.FC<GinaCodeProfilePickerProps> = ({
  selectedId = null,
  pythonVersion,
  onPythonVersionChange,
  onSelect,
  onInsertShortcode,
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');

  const filtered = useMemo(() => {
    let list = filterCodeProfiles(query);
    if (category !== 'all') list = list.filter((p) => p.category === category);
    return list;
  }, [query, category]);

  const showPython = useMemo(() => {
    if (selectedId && /python|fastapi|flask|django|pytest|pandas|numpy/i.test(selectedId)) return true;
    if (/python|fastapi|flask|django|pytest|pandas|numpy/i.test(query)) return true;
    return category === 'backend' || category === 'all';
  }, [selectedId, query, category]);

  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-950/90 ${className}`}>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 px-3 py-2">
        <Code2 className="h-3.5 w-3.5 text-violet-400 shrink-0" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
          Code profiles
        </span>
        <span className="text-[9px] font-mono text-slate-600">
          {filtered.length}/{GINA_CODE_PROFILES.length}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {showPython && (
            <label className="flex items-center gap-1.5 text-[9px] font-mono text-slate-500">
              <span className="uppercase tracking-wider">Python</span>
              <select
                value={pythonVersion}
                onChange={(e) => onPythonVersionChange(e.target.value as PythonVersion)}
                className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] text-emerald-300 outline-none focus:border-emerald-500/50"
                title="CPython target for Python profiles"
              >
                {PYTHON_VERSIONS.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-slate-800/80">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-600" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search shortcodes (react, python, api…)"
            className="w-full rounded-lg border border-slate-800 bg-slate-900 py-1.5 pl-7 pr-7 text-[11px] text-slate-200 outline-none placeholder:text-slate-600 focus:border-violet-500/40"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-500 hover:text-slate-300"
              title="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-[10px] text-slate-300 outline-none"
        >
          <option value="all">All categories</option>
          {GINA_CODE_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="max-h-48 overflow-y-auto custom-scrollbar p-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
        {filtered.length === 0 && (
          <div className="col-span-full py-6 text-center text-[11px] text-slate-600">
            No profiles match “{query}”
          </div>
        )}
        {filtered.map((p) => {
          const active = selectedId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onSelect(p);
                onInsertShortcode?.(`[id: '${p.id}'] `);
              }}
              className={`text-left rounded-lg border px-2.5 py-2 transition ${
                active
                  ? 'border-violet-500/50 bg-violet-500/10 shadow-[0_0_12px_rgba(139,92,246,0.15)]'
                  : 'border-slate-800 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-900'
              }`}
              title={p.positivePrompt.slice(0, 200)}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-semibold text-slate-200 truncate">{p.name}</span>
                <span className="text-[8px] font-mono text-slate-600 shrink-0">{p.category}</span>
              </div>
              <div className="mt-0.5 font-mono text-[9px] text-violet-300/90 truncate">
                [id: '{p.id}']
              </div>
              {p.settings?.targetEnvironment && (
                <div className="mt-0.5 text-[8px] text-slate-600 truncate">{p.settings.targetEnvironment}</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default GinaCodeProfilePicker;
