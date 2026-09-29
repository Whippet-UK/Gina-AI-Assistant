/**
 * Unified Studio profile index — Web Search, Code Engine, Video Gen.
 */

export {
  GLOBAL_SEARCH_DEFAULTS,
  GINA_SEARCH_PROFILES,
  GINA_SEARCH_CATEGORIES,
  extractSearchShortcode,
  resolveSearchProfile,
  type SearchProfile,
  type ResolvedSearchConfig,
} from './ginaSearchProfiles';

export {
  GLOBAL_CODE_DEFAULTS,
  GINA_CODE_PROFILES,
  GINA_CODE_CATEGORIES,
  PYTHON_VERSIONS,
  extractCodeShortcode,
  resolveCodeProfile,
  filterCodeProfiles,
  type CodeProfile,
  type ResolvedCodeConfig,
  type PythonVersion,
} from './ginaCodeProfiles';

export {
  GLOBAL_VIDEO_DEFAULTS,
  GINA_VIDEO_PROFILES,
  GINA_VIDEO_CATEGORIES,
  extractVideoShortcode,
  resolveVideoProfile,
  composeVideoPrompt,
  type VideoProfile,
  type ResolvedVideoConfig,
} from './ginaVideoProfiles';

import { resolveSearchProfile, type ResolvedSearchConfig } from './ginaSearchProfiles';
import { resolveCodeProfile, type ResolvedCodeConfig } from './ginaCodeProfiles';
import { resolveVideoProfile, type ResolvedVideoConfig } from './ginaVideoProfiles';

export type StudioProfileKind = 'web-search' | 'code-engine' | 'video-generation';

export type ResolvedStudioConfig =
  | { kind: 'web-search'; config: ResolvedSearchConfig }
  | { kind: 'code-engine'; config: ResolvedCodeConfig }
  | { kind: 'video-generation'; config: ResolvedVideoConfig };

/** Mode-aware shortcode resolve for the active studio tab. */
export function resolveStudioShortcode(mode: StudioProfileKind, text: string): ResolvedStudioConfig {
  if (mode === 'web-search') return { kind: 'web-search', config: resolveSearchProfile(text) };
  if (mode === 'code-engine') return { kind: 'code-engine', config: resolveCodeProfile(text) };
  return { kind: 'video-generation', config: resolveVideoProfile(text) };
}
