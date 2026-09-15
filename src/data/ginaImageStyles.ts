export interface GinaImageStyle {
  id: string;
  name: string;
  category: 'core' | 'photo' | 'art' | 'scifi' | 'atmosphere' | 'special';
  description: string;
  positivePrompt: string;
  negativePrompt?: string;
  badgeColor?: string;
}

export const GINA_IMAGE_STYLES: GinaImageStyle[] = [
  {
    id: 'gina_v2',
    name: 'Gina V2',
    category: 'core',
    description: 'Pristine balanced contrast, clean surface textures, optical depth and natural specular highlights',
    positivePrompt: 'highly detailed, sharp focus, elegant optical lighting, natural textures, balanced dynamic range, cinematic clarity',
    negativePrompt: 'blurry, haze, oversaturated, deformed, cartoonish, low resolution',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  },
  {
    id: 'gina_enhance',
    name: 'Gina Enhance',
    category: 'core',
    description: 'Hyper-sharp micro-details, edge clarity, and deep tonal fidelity',
    positivePrompt: 'ultra-sharp details, micro textures, crystalline edge clarity, rich tonal gradation, 8k resolution, photorealistic masterpiece',
    negativePrompt: 'soft, blurry, chromatic aberration, artifacts',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  },
  {
    id: 'gina_sharp',
    name: 'Gina Sharp',
    category: 'core',
    description: 'Zero blur, high edge-acutance, clean geometric definition',
    positivePrompt: 'razor-sharp edges, crisp geometry, clean acutance, zero motion blur, immaculate focal clarity',
    negativePrompt: 'smudge, motion blur, bokeh fuzz, fuzzy edges',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  },
  {
    id: 'cinematic',
    name: 'Cinematic Cinema',
    category: 'photo',
    description: 'Anamorphic lens flares, dramatic 35mm film grading, volumetric lighting',
    positivePrompt: 'cinematic film still, anamorphic lens, shallow depth of field, dramatic atmospheric rim lighting, Panavision 35mm, Kodak Vision3 color tone',
    negativePrompt: 'flat lighting, amateur snapshot, mobile phone camera, washed out',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40'
  },
  {
    id: 'photographic',
    name: 'Master Photography',
    category: 'photo',
    description: 'High-end DSLR studio shot with prime 85mm f/1.4 lens and Profoto softbox',
    positivePrompt: 'award-winning studio photography, shot on Hasselblad H6D-100c, 85mm prime lens, f/1.8, soft diffused Rembrandt lighting, raw photograph',
    negativePrompt: 'illustration, 3d render, plastic skin, painting, fake',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40'
  },
  {
    id: 'anime',
    name: 'Modern Anime',
    category: 'art',
    description: 'Makoto Shinkai aesthetic, luminous skies, vibrant palettes, cel shading',
    positivePrompt: 'modern anime aesthetic, Makoto Shinkai style, vibrant luminous colors, exquisite cel shading, volumetric clouds, anime wallpaper masterpiece',
    negativePrompt: 'photorealistic, western comic, 3d cgi, muddy colors',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40'
  },
  {
    id: 'digital_art',
    name: 'Concept Digital Art',
    category: 'art',
    description: 'ArtStation trending digital painting, expressive brushwork, high concept design',
    positivePrompt: 'digital concept painting, trending on ArtStation, dynamic brushwork, intricate concept design, vivid lighting, matte painting masterpiece',
    negativePrompt: 'photograph, amateur doodle, pixelated',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40'
  },
  {
    id: 'fantasy_art',
    name: 'Epic Fantasy',
    category: 'art',
    description: 'High fantasy, mystical atmosphere, golden hour illumination',
    positivePrompt: 'epic high fantasy art, ethereal atmosphere, mystical glow, golden hour illumination, Tolkien aesthetic, majestic grandeur',
    negativePrompt: 'modern, sci-fi, industrial, brutalist',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40'
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    category: 'scifi',
    description: 'Rain-slicked asphalt, neon magenta/cyan reflections, high-tech dystopian city',
    positivePrompt: 'cyberpunk metropolis at night, glowing neon cyan and magenta illumination, wet reflective ground, holographic billboards, atmospheric fog',
    negativePrompt: 'pastoral, daylight, rustic, sunny rural',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
  },
  {
    id: 'scifi_hardware',
    name: 'Sci-Fi Hardware & Cockpit',
    category: 'scifi',
    description: 'Machined aerospace titanium, illuminated conduit tubes, carbon chassis, HUD telemetry',
    positivePrompt: 'aerospace cockpit interior, machined titanium chassis, illuminated data conduits, carbon fiber weave, military telemetry readouts, industrial hard-surface design',
    negativePrompt: 'fantasy, organic, floral, wood, antique',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
  },
  {
    id: 'aida64_chassis',
    name: 'AIDA64 Dark Chassis',
    category: 'scifi',
    description: 'Brushed dark alloy plate, zero glare, recessed sockets engineered for sensor overlay',
    positivePrompt: 'dark brushed gunmetal backplate, matte finish, recessed circular mounting slots, clean bevels, zero text, zero labels, zero glare, telemetry sensor template backdrop',
    negativePrompt: 'numbers, dials, needles, speedometers, gauges, text, words, watermark',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
  },
  {
    id: 'atmosphere_dark',
    name: 'Dark Moody Atmosphere',
    category: 'atmosphere',
    description: 'Low-key chiaroscuro, mysterious shadows, deep obsidian tones',
    positivePrompt: 'dark moody chiaroscuro lighting, deep black shadows, selective directional spotlight, atmospheric haze, evocative mystery',
    negativePrompt: 'high-key, washed out, bright sunny, white background',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  },
  {
    id: 'watercolor',
    name: 'Luminous Watercolor',
    category: 'art',
    description: 'Transparent pigment bleeds, soft paper texture, artistic pigment pooling',
    positivePrompt: 'traditional watercolor on cold-press paper, fluid pigment washes, soft edges, delicate color bleeding, artistic splatter, luminous transparencies',
    negativePrompt: 'oil painting, digital airbrush, 3d render',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40'
  },
  {
    id: 'neon_punk',
    name: 'Neon Punk Vibrant',
    category: 'special',
    description: 'Electric UV glow, ultraviolet luminescence, saturated high contrast',
    positivePrompt: 'neon punk aesthetic, electric UV radiance, blacklight luminescence, saturated vivid contrast, hyper-modern synthwave energy',
    negativePrompt: 'sepia, dull, monochrome, muted earthy',
    badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/40'
  },
  {
    id: 'isometric_3d',
    name: 'Isometric 3D Diorama',
    category: 'special',
    description: 'Orthographic miniature scene, octane render, soft ambient occlusion',
    positivePrompt: 'isometric 3D diorama render, orthographic camera angle, Octane render, miniature tilt-shift effect, soft ambient occlusion, clean stylized geometry',
    negativePrompt: 'perspective distortion, flat 2d, sketch',
    badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/40'
  },
  {
    id: 'origami',
    name: 'Papercraft Origami',
    category: 'special',
    description: 'Intricate folded paper geometry, delicate creasing, warm directional light',
    positivePrompt: 'intricate origami papercraft, folded geometric paper sculpture, delicate paper grain, crisp folds, soft paper shadows, craft masterpiece',
    negativePrompt: 'metallic, liquid, gloss, digital brush',
    badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/40'
  }
];
