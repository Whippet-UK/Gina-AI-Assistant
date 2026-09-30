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
  PYTHON_VERSIONS,
  filterCodeProfiles,
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
    title: 'Code profiles',
    accent: 'text-violet-400',
    Icon: Code2,
    placeholder: 'Search shortcodes (react, python, api…)',
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
    title: 'AI Agent profiles',
    accent: 'text-fuchsia-400',
    Icon: Bot,
    placeholder: 'Search agent roles (coder, research, ops…)',
  },
  agent: {
    title: 'AI Agent profiles',
    accent: 'text-fuchsia-400',
    Icon: Bot,
    placeholder: 'Search agent roles (coder, research, ops…)',
  },
};

function listForMode(mode: StudioProfileMode, query: string, category: string): AnyProfile[] {
  let list: AnyProfile[] =
    mode === 'web-search'
      ? filterSearchProfiles(query)
      : mode === 'image-studio'
        ? filterImageProfiles(query)
        : mode === 'video-generation'
          ? filterVideoProfiles(query)
          : mode === 'web-app' || mode === 'agent'
            ? filterAgentProfiles(query)
            : filterCodeProfiles(query);
  if (category !== 'all') list = list.filter((p) => p.category === category);
  return list;
}

function categoriesForMode(mode: StudioProfileMode) {
  if (mode === 'web-search') return GINA_SEARCH_CATEGORIES;
  if (mode === 'image-studio') return GINA_IMAGE_CATEGORIES;
  if (mode === 'video-generation') return GINA_VIDEO_CATEGORIES;
  if (mode === 'web-app' || mode === 'agent') return GINA_AGENT_CATEGORIES;
  return GINA_CODE_CATEGORIES;
}

function totalCount(mode: StudioProfileMode) {
  if (mode === 'web-search') return GINA_SEARCH_PROFILES.length;
  if (mode === 'image-studio') return GINA_IMAGE_PROFILES.length;
  if (mode === 'video-generation') return GINA_VIDEO_PROFILES.length;
  if (mode === 'web-app' || mode === 'agent') return GINA_AGENT_PROFILES.length;
  return GINA_CODE_PROFILES.length;
}

function defaultIconForMode(mode: StudioProfileMode): string {
  if (mode === 'web-search') return 'Globe2';
  if (mode === 'image-studio') return 'ImageIcon';
  if (mode === 'video-generation') return 'Video';
  if (mode === 'web-app' || mode === 'agent') return 'Bot';
  return 'Code2';
}

export const GinaStudioProfilePicker: React.FC<GinaStudioProfilePickerProps> = ({
  mode,
  selectedId = null,
  onSelect,
  onInsertShortcode,
  pythonVersion = '3.11',
  onPythonVersionChange,
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const meta = MODE_META[mode] || MODE_META['web-app'];
  const Icon = meta.Icon;
  const filtered = useMemo(() => listForMode(mode, query, category), [mode, query, category]);
  const cats = categoriesForMode(mode);
  const total = totalCount(mode);

  const showPython =
    mode === 'code-engine' &&
    (category === 'backend' ||
      category === 'all' ||
      /python|fastapi|flask|django/i.test(`${selectedId || ''} ${query}`));

  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-950/90 ${className}`}>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 px-3 py-2">
        <Icon className={`h-3.5 w-3.5 shrink-0 ${meta.accent}`} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">{meta.title}</span>
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
            placeholder={meta.placeholder}
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
          const active = selectedId === p.id;
          const iconName = ('icon' in p && p.icon) || defaultIconForMode(mode);
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
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-900 ${meta.accent}`}>
                      <ProfileIcon name={iconName} className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <span className="truncate text-[10px] font-semibold text-slate-200">{p.name}</span>
                </span>
                <span className="shrink-0 text-[8px] font-mono text-slate-600">{p.category}</span>
              </div>
              <div className={`mt-0.5 truncate font-mono text-[9px] ${meta.accent}`}>[id: '{p.id}']</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default GinaStudioProfilePicker;
