/**
 * Image Creation Studio — profile dictionary + shortcode resolver.
 * Complements ginaImageStyles (visual styles) with generation intent profiles.
 */

export interface ImageSettings {
  preferReferenceEdit: boolean;
  defaultDenoise: number;
  transparentBackground: boolean;
  watermarkMode: boolean;
  stepsBias: number | null;
}

export interface ImageAdvanced {
  negativeBoost: string;
  outputHint: 'rgb' | 'rgba';
  temperature: number;
}

export interface ImageProfile {
  id: string;
  name: string;
  category: 'generation' | 'edit' | 'watermark' | 'general' | string;
  positivePrompt: string;
  settings?: Partial<ImageSettings>;
  advanced?: Partial<ImageAdvanced>;
}

export const GLOBAL_IMAGE_DEFAULTS = {
  settings: {
    preferReferenceEdit: false,
    defaultDenoise: 1.0,
    transparentBackground: false,
    watermarkMode: false,
    stepsBias: null,
  } satisfies ImageSettings,
  advanced: {
    negativeBoost: '',
    outputHint: 'rgb' as const,
    temperature: 0.2,
  } satisfies ImageAdvanced,
};

export const GINA_IMAGE_PROFILES: ImageProfile[] = [
  {
    id: 'photoreal',
    name: 'Photoreal Generation',
    category: 'generation',
    positivePrompt: 'photorealistic, natural lighting, high detail, sharp focus',
    settings: { preferReferenceEdit: false, defaultDenoise: 1.0 },
  },
  {
    id: 'transparent_cutout',
    name: 'Transparent Cutout',
    category: 'watermark',
    positivePrompt:
      'isolated subject on pure solid white background, centered, no environment, clean edges, cutout ready',
    settings: { transparentBackground: true, watermarkMode: true, defaultDenoise: 1.0 },
    advanced: {
      outputHint: 'rgba',
      negativeBoost:
        'busy background, landscape, room interior, complex scene, gradient sky, shadow on background, textured backdrop',
    },
  },
  {
    id: 'watermark_logo',
    name: 'Watermark Logo',
    category: 'watermark',
    positivePrompt:
      'flat vector logo watermark, simple graphic mark, transparent-ready, high contrast silhouette, pure graphic design',
    settings: { transparentBackground: true, watermarkMode: true },
    advanced: {
      outputHint: 'rgba',
      negativeBoost: 'photograph, photorealistic, person, landscape, 3d render',
    },
  },
  {
    id: 'img2img_edit',
    name: 'Reference Edit (img2img)',
    category: 'edit',
    positivePrompt: 'preserve identity and composition of the reference image; apply only the requested change',
    settings: { preferReferenceEdit: true, defaultDenoise: 0.45 },
    advanced: {
      negativeBoost: 'different person, new face, identity change, full restyle',
    },
  },
  {
    id: 'inpaint_local',
    name: 'Local Inpaint',
    category: 'edit',
    positivePrompt: 'edit only the masked region; keep unmasked pixels unchanged',
    settings: { preferReferenceEdit: true, defaultDenoise: 0.55 },
  },
  {
    id: 'anime_key',
    name: 'Anime Key Visual',
    category: 'generation',
    positivePrompt: 'anime key visual, clean linework, vibrant cel shading, expressive eyes, detailed background optional',
    settings: { preferReferenceEdit: false, defaultDenoise: 1.0 },
  },
  {
    id: 'product_packshot',
    name: 'Product Packshot',
    category: 'generation',
    positivePrompt: 'studio packshot, softbox lighting, pure seamless background, commercial product photo, sharp edges',
    settings: { transparentBackground: false, defaultDenoise: 1.0 },
    advanced: { negativeBoost: 'hands, people, cluttered scene' },
  },
  {
    id: 'concept_art',
    name: 'Concept Art',
    category: 'generation',
    positivePrompt: 'concept art, painterly environment design, readable silhouette, cinematic lighting, production-ready',
    settings: { defaultDenoise: 1.0 },
  },
  {
    id: 'style_transfer',
    name: 'Style Transfer Edit',
    category: 'edit',
    positivePrompt: 'restyle the reference image only; preserve composition and subject identity',
    settings: { preferReferenceEdit: true, defaultDenoise: 0.55 },
    advanced: { negativeBoost: 'new person, different face, layout change' },
  },
  {
    id: 'upscale_detail',
    name: 'Detail / Upscale Intent',
    category: 'edit',
    positivePrompt: 'enhance fine detail and sharpness while preserving the original subject and framing',
    settings: { preferReferenceEdit: true, defaultDenoise: 0.35 },
  },
  {
    id: 'icon_set',
    name: 'Flat Icon',
    category: 'watermark',
    positivePrompt: 'flat vector icon, simple shapes, limited palette, centered, transparent-ready, no photorealism',
    settings: { transparentBackground: true, watermarkMode: true },
    advanced: {
      outputHint: 'rgba',
      negativeBoost: 'photograph, 3d render, complex background, text walls',
    },
  },
];

export interface ResolvedImageConfig {
  profileId: string | null;
  profileName: string;
  positivePrompt: string;
  settings: ImageSettings;
  advanced: ImageAdvanced;
  usedFallback: boolean;
  prompt: string;
}

const SHORTCODE_RE = /\[id:\s*['"]([a-zA-Z0-9_-]+)['"]\s*\]/gi;

export function extractImageShortcode(text: string): { id: string | null; remainder: string } {
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

export function resolveImageProfile(
  input: string | { id?: string; prompt?: string } | null | undefined
): ResolvedImageConfig {
  let id: string | null = null;
  let prompt = '';

  if (typeof input === 'string') {
    const parsed = extractImageShortcode(input);
    id = parsed.id;
    prompt = parsed.remainder || (parsed.id ? '' : input.trim());
  } else if (input && typeof input === 'object') {
    id = input.id ? String(input.id) : null;
    if (input.prompt) {
      const parsed = extractImageShortcode(input.prompt);
      if (!id) id = parsed.id;
      prompt = parsed.remainder || (parsed.id ? '' : String(input.prompt).trim());
    }
  }

  const profile = id
    ? GINA_IMAGE_PROFILES.find((p) => p.id.toLowerCase() === id!.toLowerCase())
    : undefined;

  return {
    profileId: profile?.id ?? null,
    profileName: profile?.name ?? 'Standard Image Generation',
    positivePrompt: profile?.positivePrompt ?? '',
    settings: {
      ...GLOBAL_IMAGE_DEFAULTS.settings,
      ...(profile?.settings || {}),
    },
    advanced: {
      ...GLOBAL_IMAGE_DEFAULTS.advanced,
      ...(profile?.advanced || {}),
    },
    usedFallback: Boolean(id) && !profile,
    prompt,
  };
}


export const GINA_IMAGE_CATEGORIES: { id: string; label: string }[] = [
  { id: 'generation', label: 'Generation' },
  { id: 'edit', label: 'Edit / img2img' },
  { id: 'watermark', label: 'Watermark / Cutout' },
  { id: 'general', label: 'General' },
];

export function filterImageProfiles(query: string): ImageProfile[] {
  const q = query.trim().toLowerCase();
  if (!q) return GINA_IMAGE_PROFILES;
  return GINA_IMAGE_PROFILES.filter((p) => {
    const hay = `${p.id} ${p.name} ${p.category} ${p.positivePrompt}`.toLowerCase();
    return q.split(/\s+/).every((token) => hay.includes(token));
  });
}
