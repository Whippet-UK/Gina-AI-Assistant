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
    <div className={`rounded-xl border border-slate-800 bg-slate-950/90 ${className}`}>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 px-3 py-2">
        <Icon className={`h-3.5 w-3.5 shrink-0 ${accentColor}`} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">{meta.title}</span>

        {/* Dual-tab selector for Web App and Code Engine */}
        {mode === 'web-app' && (
          <div className="flex items-center gap-1 bg-slate-900/90 rounded-lg p-0.5 border border-slate-800">
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
          <div className="flex items-center gap-1 bg-slate-900/90 rounded-lg p-0.5 border border-slate-800">
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

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/80 px-3 py-2">
        <div className="relative min-w-[160px] flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-600" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholderText}
            className="w-full rounded-lg border border-slate-800 bg-slate-900 py-1.5 pl-7 pr-7 text-[11px] text-slate-200 outline-none placeholder:text-slate-600 focus:border-slate-600"
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
          className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-[10px] text-slate-300 outline-none"
        >
          <option value="all">All categories</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="custom-scrollbar grid max-h-48 grid-cols-1 gap-1.5 overflow-y-auto p-2 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 && (
          <div className="col-span-full py-6 text-center text-[11px] text-slate-600">
            No profiles match “{query}”
          </div>
        )}
        {filtered.map((p) => {
          const isAgent = 'avatar' in p || GINA_AGENT_PROFILES.some((a) => a.id === p.id);
          const active = isAgent
            ? (agentProfileId === p.id || (activeKind === 'agents' && selectedId === p.id))
            : (codeProfileId === p.id || (activeKind !== 'agents' && selectedId === p.id));
          const iconName = ('icon' in p && p.icon) || (isAgent ? 'Bot' : 'Code2');
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onSelect(p);
                onInsertShortcode?.(`[id: '${p.id}'] `);
              }}
              className={`rounded-lg border px-2.5 py-2 text-left transition ${
                active
                  ? 'border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.12)]'
                  : 'border-slate-800 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-900'
              }`}
              title={p.positivePrompt.slice(0, 220)}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="flex min-w-0 items-center gap-1.5">
                  {'avatar' in p && (p as { avatar?: string }).avatar ? (
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-[13px] leading-none"
                      title="Profile"
                    >
                      {(p as { avatar?: string }).avatar}
                    </span>
                  ) : (
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-900 ${accentColor}`}>
                      <ProfileIcon name={iconName} className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <span className="truncate text-[10px] font-semibold text-slate-200">{p.name}</span>
                </span>
                <span className="shrink-0 text-[8px] font-mono text-slate-600">{p.category}</span>
              </div>
              <div className={`mt-0.5 truncate font-mono text-[9px] ${accentColor}`}>[id: '{p.id}']</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default GinaStudioProfilePicker;
