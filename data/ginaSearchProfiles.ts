/**
 * Web Search Studio — profile dictionary + shortcode resolver.
 * Unknown / missing shortcodes fall back to GLOBAL_SEARCH_DEFAULTS.
 */

export type SearchDepth = 'Standard' | 'Recursive' | 'Shallow';
export type SearchTimeframe =
  | 'Anytime'
  | 'Past 24 Hours'
  | 'Past Week'
  | 'Past Month'
  | 'Past Year';

export interface SearchSettings {
  depth: SearchDepth;
  maxResults: number;
  concurrencyLimit: number;
  crawlImages: boolean;
  autoVerifyFacts: boolean;
  fallbackToCache: boolean;
  searchEngine: string;
}

export interface SearchAdvanced {
  timeframe: SearchTimeframe | string;
  freshnessStrictness: number;
  scrapingStrategy: string;
  maxTokensPerSource: number;
  temperature: number;
}

export interface SearchProfile {
  id: string;
  name: string;
  category: 'intelligence' | 'realtime' | 'general' | string;
  positivePrompt: string;
  settings?: Partial<SearchSettings>;
  advanced?: Partial<SearchAdvanced>;
}

/** Safe baseline applied when no profile shortcode matches. */
export const GLOBAL_SEARCH_DEFAULTS = {
  settings: {
    depth: 'Standard' as SearchDepth,
    maxResults: 5,
    concurrencyLimit: 3,
    crawlImages: false,
    autoVerifyFacts: true,
    fallbackToCache: true,
    searchEngine: 'Google + Brave API Hybrid',
  } satisfies SearchSettings,
  advanced: {
    timeframe: 'Anytime',
    freshnessStrictness: 0.1,
    scrapingStrategy: 'Readability',
    maxTokensPerSource: 1500,
    temperature: 0.15,
  } satisfies SearchAdvanced,
};

export const GINA_SEARCH_PROFILES: SearchProfile[] = [
  {
    id: 'deep_research',
    name: 'Deep Academic Research',
    category: 'intelligence',
    positivePrompt:
      'Synthesise comprehensive intelligence reports. For every major claim, create a granular footnote tracking publishing dates, verified domain authorities, and direct citation quotes.',
    settings: {
      depth: 'Recursive',
      maxResults: 15,
      concurrencyLimit: 6,
      autoVerifyFacts: true,
    },
    advanced: {
      timeframe: 'Past Year',
      freshnessStrictness: 0.85,
      scrapingStrategy: 'Puppeteer Full DOM Parser',
      maxTokensPerSource: 4000,
      temperature: 0.05,
    },
  },
  {
    id: 'live_news',
    name: 'Live Up-to-the-Minute Feed',
    category: 'realtime',
    positivePrompt:
      'Isolate the most immediate real-time updates. Highlight conflicting accounts across timelines and list chronological development logs explicitly.',
    settings: {
      depth: 'Standard',
      maxResults: 10,
      autoVerifyFacts: false,
    },
    advanced: {
      timeframe: 'Past 24 Hours',
      freshnessStrictness: 1.0,
      scrapingStrategy: 'RSS & News Pipeline Filter',
      temperature: 0.2,
    },
  },
  {
    id: 'product_compare',
    name: 'Product Comparison',
    category: 'shopping',
    positivePrompt:
      'Compare products with price ranges, key specs, pros/cons, and cite retailer or review sources with dates.',
    settings: { depth: 'Standard', maxResults: 10, autoVerifyFacts: true },
    advanced: { timeframe: 'Past Month', temperature: 0.1 },
  },
  {
    id: 'local_places',
    name: 'Local Places & Services',
    category: 'local',
    positivePrompt:
      'Find local businesses/services with addresses, hours, and recent reviews. Prefer official sites.',
    settings: { depth: 'Shallow', maxResults: 8, crawlImages: false },
    advanced: { timeframe: 'Past Year', temperature: 0.15 },
  },
  {
    id: 'tech_docs',
    name: 'Technical Docs Lookup',
    category: 'intelligence',
    positivePrompt:
      'Prefer official documentation, RFCs, and GitHub READMEs. Quote version numbers and API signatures accurately.',
    settings: { depth: 'Recursive', maxResults: 12, autoVerifyFacts: true },
    advanced: { timeframe: 'Anytime', maxTokensPerSource: 3000, temperature: 0.05 },
  },
  {
    id: 'breaking_news',
    name: 'Breaking News Desk',
    category: 'realtime',
    positivePrompt:
      'Prioritise primary sources from the last 24–48 hours. Flag unverified social claims. Timeline-first briefing.',
    settings: { depth: 'Standard', maxResults: 12, concurrencyLimit: 5 },
    advanced: { timeframe: 'Past 24 Hours', freshnessStrictness: 0.95, temperature: 0.1 },
  },
  {
    id: 'fact_check',
    name: 'Fact Check',
    category: 'intelligence',
    positivePrompt:
      'Claim-by-claim verification with supporting and opposing sources. Rate confidence and note gaps.',
    settings: { depth: 'Recursive', maxResults: 15, autoVerifyFacts: true },
    advanced: { timeframe: 'Anytime', freshnessStrictness: 0.7, temperature: 0.05 },
  },
  {
    id: 'quick_answer',
    name: 'Quick Answer',
    category: 'general',
    positivePrompt:
      'Give a concise direct answer first, then 2–4 supporting links. Skip long essays unless asked.',
    settings: { depth: 'Shallow', maxResults: 5 },
    advanced: { timeframe: 'Anytime', temperature: 0.2 },
  },
];

export interface ResolvedSearchConfig {
  profileId: string | null;
  profileName: string;
  positivePrompt: string;
  settings: SearchSettings;
  advanced: SearchAdvanced;
  /** True when an unknown shortcode fell back to global defaults. */
  usedFallback: boolean;
  /** Remaining user query after shortcode stripping. */
  query: string;
}

const SHORTCODE_RE = /\[id:\s*['"]([a-zA-Z0-9_-]+)['"]\s*\]/gi;

/** Extract first `[id: '…']` shortcode from free text (if any). */
export function extractSearchShortcode(text: string): { id: string | null; remainder: string } {
  const raw = String(text || '');
  let found: string | null = null;
  const remainder = raw
    .replace(SHORTCODE_RE, (_, id: string) => {
      if (!found) found = id;
      return ' ';
    })
    .replace(/\s+/g, ' ')
    .trim();
  return { id: found, remainder };
}

/**
 * Merge a named profile (or shortcode in free text) over GLOBAL_SEARCH_DEFAULTS.
 * Unknown ids → full safe defaults, usedFallback=true.
 */
export function resolveSearchProfile(
  input: string | { id?: string; query?: string } | null | undefined
): ResolvedSearchConfig {
  let id: string | null = null;
  let query = '';

  if (typeof input === 'string') {
    const parsed = extractSearchShortcode(input);
    id = parsed.id;
    query = parsed.remainder || (parsed.id ? '' : input.trim());
  } else if (input && typeof input === 'object') {
    id = input.id ? String(input.id) : null;
    if (input.query) {
      const parsed = extractSearchShortcode(input.query);
      if (!id) id = parsed.id;
      query = parsed.remainder || (parsed.id ? '' : String(input.query).trim());
    }
  }

  const profile = id
    ? GINA_SEARCH_PROFILES.find((p) => p.id.toLowerCase() === id!.toLowerCase())
    : undefined;

  const usedFallback = Boolean(id) && !profile;

  return {
    profileId: profile?.id ?? null,
    profileName: profile?.name ?? 'Standard Search',
    positivePrompt: profile?.positivePrompt ?? '',
    settings: {
      ...GLOBAL_SEARCH_DEFAULTS.settings,
      ...(profile?.settings || {}),
    },
    advanced: {
      ...GLOBAL_SEARCH_DEFAULTS.advanced,
      ...(profile?.advanced || {}),
    },
    usedFallback,
    query,
  };
}

export const GINA_SEARCH_CATEGORIES: { id: string; label: string }[] = [
  { id: 'intelligence', label: 'Intelligence / Research' },
  { id: 'realtime', label: 'Realtime / News' },
  { id: 'shopping', label: 'Shopping / Products' },
  { id: 'local', label: 'Local / Places' },
  { id: 'general', label: 'General' },
];

export function filterSearchProfiles(query: string): SearchProfile[] {
  const q = query.trim().toLowerCase();
  if (!q) return GINA_SEARCH_PROFILES;
  return GINA_SEARCH_PROFILES.filter((p) => {
    const hay = `${p.id} ${p.name} ${p.category} ${p.positivePrompt}`.toLowerCase();
    return q.split(/\s+/).every((token) => hay.includes(token));
  });
}

