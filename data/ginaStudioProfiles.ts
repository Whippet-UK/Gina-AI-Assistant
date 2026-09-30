/**
 * Unified Studio profile index — Web Search, Code Engine, Video Gen, Image Studio.
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

export {
  GLOBAL_IMAGE_DEFAULTS,
  GINA_IMAGE_PROFILES,
  extractImageShortcode,
  resolveImageProfile,
  type ImageProfile,
  type ResolvedImageConfig,
} from './ginaImageProfiles';

import { resolveSearchProfile, type ResolvedSearchConfig } from './ginaSearchProfiles';
import { resolveCodeProfile, type ResolvedCodeConfig } from './ginaCodeProfiles';
import { resolveVideoProfile, type ResolvedVideoConfig } from './ginaVideoProfiles';
import { resolveImageProfile, type ResolvedImageConfig } from './ginaImageProfiles';

export type StudioProfileKind =
  | 'web-search'
  | 'code-engine'
  | 'video-generation'
  | 'image-studio';

export type ResolvedStudioConfig =
  | { kind: 'web-search'; config: ResolvedSearchConfig }
  | { kind: 'code-engine'; config: ResolvedCodeConfig }
  | { kind: 'video-generation'; config: ResolvedVideoConfig }
  | { kind: 'image-studio'; config: ResolvedImageConfig };

/** Mode-aware shortcode resolve for the active studio tab. */
export function resolveStudioShortcode(mode: StudioProfileKind, text: string): ResolvedStudioConfig {
  if (mode === 'web-search') return { kind: 'web-search', config: resolveSearchProfile(text) };
  if (mode === 'code-engine') return { kind: 'code-engine', config: resolveCodeProfile(text) };
  if (mode === 'image-studio') return { kind: 'image-studio', config: resolveImageProfile(text) };
  return { kind: 'video-generation', config: resolveVideoProfile(text) };
}


export {
  GLOBAL_AGENT_DEFAULTS,
  GINA_AGENT_PROFILES,
  GINA_AGENT_CATEGORIES,
  filterAgentProfiles,
  extractAgentShortcode,
  resolveAgentProfile,
  composeAgentSystemAddon,
  AGENT_IMPORT_PROTOCOL,
  type AgentProfile,
  type ResolvedAgentConfig,
} from './ginaAgentProfiles';

export { GINA_GIT_REPOS, getGitRepo, type GinaGitRepo } from './ginaGitRepos';
