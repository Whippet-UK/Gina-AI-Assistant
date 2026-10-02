import React, { useMemo, useState } from 'react';
import {
  Search,
  X,
  Globe2,
  ImageIcon,
  Video,
  Code2,
  Bot,
  BookOpen,
  Newspaper,
  Radio,
  ShieldCheck,
  ShoppingCart,
  MapPin,
  FileCode,
  Zap,
  Clapperboard,
  Infinity,
  RotateCw,
  MousePointerClick,
  CloudSun,
  RefreshCw,
  Megaphone,
  Scan,
  Stamp,
  Pencil,
  Sparkles,
  Package,
  Palette,
  Blend,
  ZoomIn,
  Shapes,
  Atom,
  Layers,
  Component,
  Box,
  Server,
  Plug,
  Monitor,
  Smartphone,
  Container,
  FlaskConical,
  Database,
  Layout,
  Rocket,
  Bug,
  GitBranch,
  FileText,
  ClipboardCheck,
  GraduationCap,
  Circle,
  type LucideIcon,
} from 'lucide-react';
import {
  GINA_SEARCH_PROFILES,
  GINA_SEARCH_CATEGORIES,
  filterSearchProfiles,
  type SearchProfile,
} from '../data/ginaSearchProfiles';
import {
  GINA_IMAGE_PROFILES,
  GINA_IMAGE_CATEGORIES,
  filterImageProfiles,
  type ImageProfile,
} from '../data/ginaImageProfiles';
import {
  GINA_VIDEO_PROFILES,
  GINA_VIDEO_CATEGORIES,
  filterVideoProfiles,
  type VideoProfile,
} from '../data/ginaVideoProfiles';
import {
  GINA_CODE_PROFILES,
  GINA_CODE_CATEGORIES,
  GINA_WEB_APP_CODE_PROFILES,
  filterCodeProfiles,
  filterWebAppCodeProfiles,
  PYTHON_VERSIONS,
  type CodeProfile,
  type PythonVersion,
} from '../data/ginaCodeProfiles';
import {
  GINA_AGENT_PROFILES,
  GINA_AGENT_CATEGORIES,
  filterAgentProfiles,
  type AgentProfile,
} from '../data/ginaAgentProfiles';

export type StudioProfileMode =
  | 'web-search'
  | 'code-engine'
  | 'image-studio'
  | 'video-generation'
  | 'web-app'
  | 'agent';

type AnyProfile = SearchProfile | ImageProfile | VideoProfile | CodeProfile | AgentProfile;

const ICON_MAP: Record<string, LucideIcon> = {
  Search,
  Globe2,
  ImageIcon,
  Video,
  Code2,
  Bot,
  BookOpen,
  Newspaper,
  Radio,
  ShieldCheck,
  ShoppingCart,
  MapPin,
  FileCode,
  Zap,
  Clapperboard,
  Infinity,
  RotateCw,
  MousePointerClick,
  CloudSun,
  RefreshCw,
  Megaphone,
  Scan,
  Stamp,
  Pencil,
  Sparkles,
  Package,
  Palette,
  Blend,
  ZoomIn,
  Shapes,
  Atom,
  Layers,
  Component,
  Box,
  Server,
  Plug,
  Monitor,
  Smartphone,
  Container,
  FlaskConical,
  Database,
  Layout,
  Rocket,
  Bug,
  GitBranch,
  FileText,
  ClipboardCheck,
  GraduationCap,
  Circle,
};

function ProfileIcon({ name, className }: { name?: string; className?: string }) {
  const Icon = (name && ICON_MAP[name]) || Circle;
  return <Icon className={className || 'h-3.5 w-3.5 shrink-0'} />;
}

export interface GinaStudioProfilePickerProps {
  mode: StudioProfileMode;
  selectedId?: string | null;
  agentProfileId?: string | null;
  codeProfileId?: string | null;
  onSelect: (profile: AnyProfile) => void;
  onInsertShortcode?: (shortcode: string) => void;
  pythonVersion?: PythonVersion;
  onPythonVersionChange?: (v: PythonVersion) => void;
  className?: string;
}

const MODE_META: Record<
  StudioProfileMode,
  { title: string; accent: string; Icon: LucideIcon; placeholder: string }
> = {
  'web-search': {
    title: 'Search profiles',
    accent: 'text-sky-400',
    Icon: Globe2,
    placeholder: 'Search profiles (news, research, product…)',
  },
  'code-engine': {
    title: 'Code Engine profiles',
    accent: 'text-violet-400',
    Icon: Code2,
    placeholder: 'Search code shortcodes (react, python, api…)',
  },
  'image-studio': {
    title: 'Image profiles',
    accent: 'text-emerald-400',
    Icon: ImageIcon,
    placeholder: 'Search profiles (watermark, img2img, packshot…)',
  },
  'video-generation': {
    title: 'Video profiles',
    accent: 'text-amber-400',
    Icon: Video,
    placeholder: 'Search profiles (cinematic, loop, product…)',
  },
  'web-app': {
    title: 'Web App profiles',
    accent: 'text-emerald-400',
    Icon: Globe2,
    placeholder: 'Search web app profiles (coder, react, html5…)',
  },
  agent: {
    title: 'AI Agent profiles',
    accent: 'text-fuchsia-400',
    Icon: Bot,
    placeholder: 'Search agent roles (coder, research, ops…)',
  },
};

export const GinaStudioProfilePicker: React.FC<GinaStudioProfilePickerProps> = ({
  mode,
  selectedId = null,
  agentProfileId = null,
  codeProfileId = null,
  onSelect,
  onInsertShortcode,
  pythonVersion = '3.11',
  onPythonVersionChange,
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');

  // Sub-tab for modes with dual profile choices:
  // in 'web-app': 'agents' (AI Agent Profiles) vs 'web-code' (Web App Code Profiles)
  // in 'code-engine': 'code' (Code Profiles) vs 'agents' (AI Agent Profiles)
  const [subTab, setSubTab] = useState<'agents' | 'code' | 'web-code'>(() => {
    if (mode === 'web-app') {
      if (selectedId && GINA_WEB_APP_CODE_PROFILES.some((p) => p.id === selectedId)) return 'web-code';
      return 'agents';
    }
    if (mode === 'code-engine') {
      if (selectedId && GINA_AGENT_PROFILES.some((p) => p.id === selectedId)) return 'agents';
      return 'code';
    }
    return 'agents';
  });

  const activeKind: 'web-search' | 'image-studio' | 'video-generation' | 'agents' | 'code' | 'web-code' =
    mode === 'web-search'
      ? 'web-search'
      : mode === 'image-studio'
      ? 'image-studio'
      : mode === 'video-generation'
      ? 'video-generation'
      : mode === 'web-app'
      ? subTab === 'web-code'
        ? 'web-code'
        : 'agents'
      : mode === 'code-engine'
      ? subTab === 'agents'
        ? 'agents'
        : 'code'
      : 'agents';

  const meta = MODE_META[mode] || MODE_META['web-app'];
  const Icon =
    activeKind === 'agents'
      ? Bot
      : activeKind === 'code' || activeKind === 'web-code'
      ? Code2
      : meta.Icon;

  const accentColor =
    activeKind === 'agents'
      ? 'text-fuchsia-400'
      : activeKind === 'web-code'
      ? 'text-emerald-400'
      : activeKind === 'code'
      ? 'text-violet-400'
      : meta.accent;

  const cats = useMemo(() => {
    if (activeKind === 'web-search') return GINA_SEARCH_CATEGORIES;
    if (activeKind === 'image-studio') return GINA_IMAGE_CATEGORIES;
    if (activeKind === 'video-generation') return GINA_VIDEO_CATEGORIES;
    if (activeKind === 'agents') return GINA_AGENT_CATEGORIES;
    if (activeKind === 'web-code') {
      const activeCats = new Set(GINA_WEB_APP_CODE_PROFILES.map((p) => p.category));
      return GINA_CODE_CATEGORIES.filter((c) => activeCats.has(c.id));
    }
    return GINA_CODE_CATEGORIES;
  }, [activeKind]);

  const filtered = useMemo(() => {
    let list: AnyProfile[] = [];
    if (activeKind === 'web-search') list = filterSearchProfiles(query);
    else if (activeKind === 'image-studio') list = filterImageProfiles(query);
    else if (activeKind === 'video-generation') list = filterVideoProfiles(query);
    else if (activeKind === 'agents') list = filterAgentProfiles(query);
    else if (activeKind === 'web-code') list = filterWebAppCodeProfiles(query);
    else list = filterCodeProfiles(query);

    if (category !== 'all') list = list.filter((p) => p.category === category);
    return list;
  }, [activeKind, query, category]);

  const allList = useMemo(() => {
    if (activeKind === 'web-search') return GINA_SEARCH_PROFILES;
    if (activeKind === 'image-studio') return GINA_IMAGE_PROFILES;
    if (activeKind === 'video-generation') return GINA_VIDEO_PROFILES;
    if (activeKind === 'agents') return GINA_AGENT_PROFILES;
    if (activeKind === 'web-code') return GINA_WEB_APP_CODE_PROFILES;
    return GINA_CODE_PROFILES;
  }, [activeKind]);

  const selectedProfile = useMemo(() => {
    if (!selectedId) return null;
    return allList.find((p) => p.id === selectedId) || null;
  }, [allList, selectedId]);

  const total = useMemo(() => {
    if (activeKind === 'web-search') return GINA_SEARCH_PROFILES.length;
    if (activeKind === 'image-studio') return GINA_IMAGE_PROFILES.length;
    if (activeKind === 'video-generation') return GINA_VIDEO_PROFILES.length;
    if (activeKind === 'agents') return GINA_AGENT_PROFILES.length;
    if (activeKind === 'web-code') return GINA_WEB_APP_CODE_PROFILES.length;
    return GINA_CODE_PROFILES.length;
  }, [activeKind]);

  const showPython =
    activeKind === 'code' &&
    (category === 'backend' ||
      category === 'all' ||
      /python|fastapi|flask|django/i.test(`${selectedId || ''} ${query}`));

  const placeholderText =
    activeKind === 'agents'
      ? 'Search AI agent roles (coder, research, ops, debugger…)'
      : activeKind === 'web-code'
      ? 'Search web app code profiles (react, html5, landing, vue, css…)'
      : meta.placeholder;

  return (
    <div className={`bg-transparent border-0 shadow-none p-0 ${className}`}>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/40 py-1.5">
        <Icon className={`h-3.5 w-3.5 shrink-0 ${accentColor}`} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">{meta.title}</span>

        {/* Dual-tab selector for Web App and Code Engine */}
        {mode === 'web-app' && (
          <div className="flex items-center gap-1 p-0.5">
            <button
              type="button"
              onClick={() => { setSubTab('agents'); setCategory('all'); }}
              className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all ${
                subTab === 'agents'
                  ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bot className="w-2.5 h-2.5 inline mr-1" />
              AI Agent Profiles ({GINA_AGENT_PROFILES.length})
            </button>
            <button
              type="button"
              onClick={() => { setSubTab('web-code'); setCategory('all'); }}
              className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all ${
                subTab === 'web-code'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-2.5 h-2.5 inline mr-1" />
              Web App Code Profiles ({GINA_WEB_APP_CODE_PROFILES.length})
            </button>
          </div>
        )}

        {mode === 'code-engine' && (
          <div className="flex items-center gap-1 p-0.5">
            <button
              type="button"
              onClick={() => { setSubTab('code'); setCategory('all'); }}
              className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all ${
                subTab === 'code'
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-2.5 h-2.5 inline mr-1" />
              Code Profiles ({GINA_CODE_PROFILES.length})
            </button>
            <button
              type="button"
              onClick={() => { setSubTab('agents'); setCategory('all'); }}
              className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all ${
                subTab === 'agents'
                  ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bot className="w-2.5 h-2.5 inline mr-1" />
              AI Agent Profiles ({GINA_AGENT_PROFILES.length})
            </button>
          </div>
        )}

        <span className="text-[9px] font-mono text-slate-600">
          {filtered.length}/{total}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {showPython && onPythonVersionChange && (
            <label className="flex items-center gap-1.5 text-[9px] font-mono text-slate-500">
              <span className="uppercase tracking-wider">Python</span>
              <select
                value={pythonVersion}
                onChange={(e) => onPythonVersionChange(e.target.value as PythonVersion)}
                className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] text-emerald-300 outline-none focus:border-emerald-500/50"
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

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/40 py-1.5">
        <div className="relative min-w-[160px] flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-600" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholderText}
            className="w-full rounded border border-slate-800/80 bg-slate-900/60 py-1 pl-7 pr-7 text-[11px] text-slate-200 outline-none placeholder:text-slate-600 focus:border-slate-600"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-500 hover:text-slate-300"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded border border-slate-800/80 bg-slate-900/60 px-2 py-1 text-[10px] text-slate-300 outline-none"
        >
          <option value="all">All categories</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Minimal Native Dropdown Selector Zone (Strict max-height: 200px) */}
      <div className="py-2 max-h-[200px] flex flex-col justify-between gap-2 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2">
          {/* Native HTML Select Dropdown for [id:] Cheat Codes */}
          <div className="flex-1 min-w-[220px]">
            <select
              value={selectedId || ''}
              onChange={(e) => {
                const p = filtered.find((item) => item.id === e.target.value) || allList.find((item) => item.id === e.target.value);
                if (p) {
                  onSelect(p);
                  onInsertShortcode?.(`[id: '${p.id}'] `);
                }
              }}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-mono text-emerald-300 outline-none hover:border-emerald-500/50 focus:border-emerald-400 cursor-pointer"
            >
              <option value="" disabled className="text-slate-500 font-sans">
                ⚡ Select [id:] Cheat Code or Preset Profile… ({filtered.length} available)
              </option>
              {filtered.map((p) => {
                const isAgent = 'avatar' in p || GINA_AGENT_PROFILES.some((a) => a.id === p.id);
                return (
                  <option key={p.id} value={p.id} className="bg-slate-950 text-slate-200">
                    [id: '{p.id}'] — {p.name} ({p.category})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Quick Insert Active Shortcode Button */}
          {selectedProfile && (
            <button
              type="button"
              onClick={() => onInsertShortcode?.(`[id: '${selectedProfile.id}'] `)}
              className="px-2.5 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold tracking-tight cursor-pointer shrink-0 transition-colors"
              title="Insert this cheat code into prompt"
            >
              + Insert [id: '{selectedProfile.id}']
            </button>
          )}
        </div>

        {/* Selected Cheat Code Summary Strip (Ultra-compact, pure text, borderless) */}
        {selectedProfile ? (
          <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between gap-3 truncate pt-1 border-t border-slate-800/60">
            <span className="truncate">
              <strong className="text-slate-200">{selectedProfile.name}</strong> · <span className="text-emerald-400">[id: '{selectedProfile.id}']</span>: {selectedProfile.positivePrompt.slice(0, 110)}…
            </span>
            <span className="text-[9px] text-slate-500 uppercase tracking-widest shrink-0">{selectedProfile.category}</span>
          </div>
        ) : (
          <div className="text-[10px] font-mono text-slate-600 truncate pt-1">
            Choose a cheat code above to automatically inject system instructions, coding frameworks, or agent profiles.
          </div>
        )}
      </div>
    </div>
  );
};

export default GinaStudioProfilePicker;
