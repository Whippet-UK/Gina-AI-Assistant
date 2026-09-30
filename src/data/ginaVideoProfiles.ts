/**
 * Video Gen Studio — profile dictionary + shortcode resolver.
 * Unknown / missing shortcodes fall back to GLOBAL_VIDEO_DEFAULTS.
 * Runtime generation still routes through local Wan 2.1 / ComfyUI when available.
 */

export interface VideoSettings {
  aspectRatio: string;
  resolution: string;
  frameRate: number;
  durationSeconds: number;
  motionIntensity: number;
  upscalePass: string;
  videoModel: string;
}

export interface VideoAdvanced {
  cfg: number;
  steps: number;
  cameraControl: string;
  seed: number;
  temporalConsistency: number;
}

export interface VideoProfile {
  id: string;
  name: string;
  category: 'production' | 'ui_assets' | 'general' | string;
  positivePrompt: string;
  settings?: Partial<VideoSettings>;
  advanced?: Partial<VideoAdvanced>;
}

/** Safe baseline applied when no profile shortcode matches. */
export const GLOBAL_VIDEO_DEFAULTS = {
  settings: {
    aspectRatio: '16:9',
    resolution: '1920x1080',
    frameRate: 24,
    durationSeconds: 4,
    motionIntensity: 5,
    upscalePass: 'Real-ESRGAN Video',
    /** Local default; cloud labels are profile metadata only. */
    videoModel: 'Wan 2.1 1.3B (local ComfyUI)',
  } satisfies VideoSettings,
  advanced: {
    cfg: 6.0,
    steps: 50,
    cameraControl: 'Static pan',
    seed: -1,
    temporalConsistency: 0.8,
  } satisfies VideoAdvanced,
};

export const GINA_VIDEO_PROFILES: VideoProfile[] = [
  {
    id: 'cinematic_motion',
    name: 'Hollywood Cinematic Camera Move',
    category: 'production',
    positivePrompt:
      '35mm anamorphic camera lens capture, dramatic dynamic lighting setups, slow intentional crane down shot, smooth parallax background depth tracking, photorealistic material rendering',
    settings: {
      frameRate: 24,
      durationSeconds: 8,
      motionIntensity: 7,
    },
    advanced: {
      cfg: 7.0,
      steps: 65,
      cameraControl: 'Continuous sweeping drone paths',
      temporalConsistency: 0.9,
    },
  },
  {
    id: 'looping_background',
    name: 'Seamless Looping Animation Asset',
    category: 'ui_assets',
    positivePrompt:
      'Vaporwave digital grid matrix background animation, seamless infinite looping configuration. The initial frame sequence matches the final boundary framework flawlessly.',
    settings: {
      aspectRatio: '16:9',
      durationSeconds: 5,
      motionIntensity: 3,
    },
    advanced: {
      cfg: 5.0,
      steps: 40,
      cameraControl: 'Locked static tripod axis',
      temporalConsistency: 1.0,
    },
  },
  {
    id: 'product_spin',
    name: 'Product Turntable',
    category: 'product',
    positivePrompt:
      'Clean product hero on neutral backdrop, slow orbital turntable motion, even studio lighting, sharp edges.',
    settings: { aspectRatio: '1:1', durationSeconds: 3, motionIntensity: 3 },
    advanced: { cameraControl: 'Orbit', temporalConsistency: 0.9 },
  },
  {
    id: 'ui_micro',
    name: 'UI Micro-Interaction',
    category: 'ui_assets',
    positivePrompt:
      'Short UI motion clip: button hover, modal open, or card flip. Flat design, high contrast, loop-friendly.',
    settings: { aspectRatio: '16:9', durationSeconds: 2, motionIntensity: 2, resolution: '1280x720' },
    advanced: { cameraControl: 'Static', temporalConsistency: 0.95 },
  },
  {
    id: 'timelapse_sky',
    name: 'Sky Timelapse',
    category: 'production',
    positivePrompt:
      'Accelerated sky / cloud motion, natural colour grade, stable horizon, subtle camera drift.',
    settings: { aspectRatio: '16:9', durationSeconds: 4, motionIntensity: 7 },
    advanced: { cameraControl: 'Slow pan', temporalConsistency: 0.75 },
  },
  {
    id: 'loop_seamless',
    name: 'Seamless Loop',
    category: 'general',
    positivePrompt:
      'Seamless looping motion; first and last frames match. Avoid one-shot narrative endings.',
    settings: { durationSeconds: 2, motionIntensity: 4 },
    advanced: { temporalConsistency: 0.92 },
  },
  {
    id: 'ad_hook_3s',
    name: '3s Ad Hook',
    category: 'product',
    positivePrompt:
      'Attention-grabbing 3-second product hook, bold motion, readable focal subject, social-safe framing.',
    settings: { aspectRatio: '9:16', durationSeconds: 3, motionIntensity: 6, resolution: '1080x1920' },
    advanced: { cameraControl: 'Push-in', cfg: 5.5 },
  },
];

export interface ResolvedVideoConfig {
  profileId: string | null;
  profileName: string;
  positivePrompt: string;
  settings: VideoSettings;
  advanced: VideoAdvanced;
  usedFallback: boolean;
  prompt: string;
}

const SHORTCODE_RE = /\[id:\s*['"]([a-zA-Z0-9_-]+)['"]\s*\]/gi;

export function extractVideoShortcode(text: string): { id: string | null; remainder: string } {
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
 * Merge a named profile (or shortcode in free text) over GLOBAL_VIDEO_DEFAULTS.
 * Unknown ids → full safe defaults, usedFallback=true.
 */
export function resolveVideoProfile(
  input: string | { id?: string; prompt?: string } | null | undefined
): ResolvedVideoConfig {
  let id: string | null = null;
  let prompt = '';

  if (typeof input === 'string') {
    const parsed = extractVideoShortcode(input);
    id = parsed.id;
    prompt = parsed.remainder || (parsed.id ? '' : input.trim());
  } else if (input && typeof input === 'object') {
    id = input.id ? String(input.id) : null;
    if (input.prompt) {
      const parsed = extractVideoShortcode(input.prompt);
      if (!id) id = parsed.id;
      prompt = parsed.remainder || (parsed.id ? '' : String(input.prompt).trim());
    }
  }

  const profile = id
    ? GINA_VIDEO_PROFILES.find((p) => p.id.toLowerCase() === id!.toLowerCase())
    : undefined;

  const usedFallback = Boolean(id) && !profile;

  return {
    profileId: profile?.id ?? null,
    profileName: profile?.name ?? 'Standard Video Generation',
    positivePrompt: profile?.positivePrompt ?? '',
    settings: {
      ...GLOBAL_VIDEO_DEFAULTS.settings,
      ...(profile?.settings || {}),
    },
    advanced: {
      ...GLOBAL_VIDEO_DEFAULTS.advanced,
      ...(profile?.advanced || {}),
    },
    usedFallback,
    prompt,
  };
}

/** Compose final positive prompt: profile style + user text. */
export function composeVideoPrompt(resolved: ResolvedVideoConfig): string {
  const parts = [resolved.positivePrompt, resolved.prompt].map((s) => s.trim()).filter(Boolean);
  return parts.join(', ');
}

export function filterVideoProfiles(query: string): VideoProfile[] {
  const q = query.trim().toLowerCase();
  if (!q) return GINA_VIDEO_PROFILES;
  return GINA_VIDEO_PROFILES.filter((p) => {
    const hay = `${p.id} ${p.name} ${p.category} ${p.positivePrompt}`.toLowerCase();
    return q.split(/\s+/).every((token) => hay.includes(token));
  });
}

export const GINA_VIDEO_CATEGORIES: { id: string; label: string }[] = [
  { id: 'production', label: 'Production / Cinematic' },
  { id: 'ui_assets', label: 'UI / Loop Assets' },
  { id: 'general', label: 'General' },
];
