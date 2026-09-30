export interface GinaImageStyle {
  id: string;
  name: string;
  category: 'traditional' | 'photo' | 'digital' | 'classic' | 'alternative' | 'core' | 'medium' | 'material' | 'photography' | 'lighting' | 'color';
  description: string;
  positivePrompt: string;
  negativePrompt?: string;
  badgeColor?: string;
}

export const GINA_IMAGE_STYLES: GinaImageStyle[] = [
  // —— Core (kept for backward compatibility) ——
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

  // —— 1. Traditional Art Mediums ——
  {
    id: 'watercolor',
    name: 'Watercolor',
    category: 'traditional',
    description: 'Soft, translucent, fluid edges with gentle color bleeds',
    positivePrompt: 'watercolor painting, soft translucent washes, fluid edges, gentle color bleeds, paper texture, delicate wet-on-wet technique',
    negativePrompt: 'photorealistic, hard edges, digital, oil paint, thick impasto',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40'
  },
  {
    id: 'oil_painting',
    name: 'Oil Painting',
    category: 'traditional',
    description: 'Rich textures, visible brushstrokes, and deep color layering',
    positivePrompt: 'oil painting, rich impasto textures, visible brushstrokes, deep color layering, classical fine art, canvas grain',
    negativePrompt: 'digital, flat, watercolor, photograph, smooth plastic',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  },
  {
    id: 'charcoal_sketch',
    name: 'Charcoal / Sketch',
    category: 'traditional',
    description: 'Monochromatic, high-contrast hand-drawn shading and rough lines',
    positivePrompt: 'charcoal sketch, monochromatic, high-contrast hand-drawn shading, rough expressive lines, graphite texture, paper grain',
    negativePrompt: 'color, photorealistic, digital smooth, painting',
    badgeColor: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40'
  },
  {
    id: 'gouache',
    name: 'Gouache',
    category: 'traditional',
    description: 'Opaque, matte water-based paint with solid color blocks',
    positivePrompt: 'gouache painting, opaque matte finish, solid color blocks, flat water-based paint, illustration style, paper surface',
    negativePrompt: 'glossy, translucent watercolor, photorealistic, 3d',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
  },
  {
    id: 'ink_wash',
    name: 'Ink Wash',
    category: 'traditional',
    description: 'Traditional East Asian fluid black ink gradients and expressive strokes',
    positivePrompt: 'ink wash painting, sumi-e, fluid black ink gradients, expressive brush strokes, East Asian traditional style, rice paper',
    negativePrompt: 'western oil, color photograph, digital render',
    badgeColor: 'bg-stone-500/20 text-stone-300 border-stone-500/40'
  },
  {
    id: 'risograph',
    name: 'Risograph',
    category: 'traditional',
    description: 'Vibrant, grainy, screen-print-like aesthetic with slight color misalignments',
    positivePrompt: 'risograph print, vibrant grainy texture, screen-print aesthetic, slight color misregistration, limited ink palette, paper stock',
    negativePrompt: 'photorealistic, smooth digital, high gloss',
    badgeColor: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40'
  },
  {
    id: 'pastel_drawing',
    name: 'Pastel Drawing',
    category: 'traditional',
    description: 'Soft, chalky textures with gentle, blended color transitions',
    positivePrompt: 'pastel drawing, soft chalky textures, gentle blended color transitions, powdery pigment, textured paper',
    negativePrompt: 'hard edges, oil paint, digital sharp, photograph',
    badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/40'
  },

  // —— 2. Photography & Cinematic Styles ——
  {
    id: 'cinematic',
    name: 'Cinematic',
    category: 'photo',
    description: 'Dramatic film lighting, intentional anamorphic framing, and deep narrative mood',
    positivePrompt: 'cinematic film still, dramatic lighting, anamorphic framing, deep narrative mood, Panavision look, film grain',
    negativePrompt: 'flat lighting, amateur snapshot, mobile phone, washed out',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40'
  },
  {
    id: 'bw_photography',
    name: 'Black and White Photography',
    category: 'photo',
    description: 'High-contrast or soft-gradient monochromatic images focusing on texture and form',
    positivePrompt: 'black and white photography, monochrome, high contrast or soft gradient, focus on texture and form, silver gelatin look',
    negativePrompt: 'color, oversaturated, digital illustration',
    badgeColor: 'bg-zinc-500/20 text-zinc-200 border-zinc-500/40'
  },
  {
    id: 'macro_photography',
    name: 'Macro Photography',
    category: 'photo',
    description: 'Extreme close-up shots with a very shallow depth of field and blurry backgrounds',
    positivePrompt: 'macro photography, extreme close-up, very shallow depth of field, creamy bokeh background, fine detail, optical macro lens',
    negativePrompt: 'wide shot, deep focus, landscape, illustration',
    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40'
  },
  {
    id: 'film_noir',
    name: 'Film Noir',
    category: 'photo',
    description: 'Gritty, high-contrast shadows, moody atmospheres, and vintage lighting',
    positivePrompt: 'film noir, gritty high-contrast shadows, moody atmosphere, vintage hard lighting, chiaroscuro, 1940s cinema',
    negativePrompt: 'bright daylight, colorful, cheerful, modern digital',
    badgeColor: 'bg-slate-500/20 text-slate-300 border-slate-500/40'
  },
  {
    id: 'polaroid_vintage',
    name: 'Polaroid / Vintage Snapshot',
    category: 'photo',
    description: 'Faded colors, light leaks, soft focus, and retro borders',
    positivePrompt: 'polaroid photo, vintage snapshot, faded colors, light leaks, soft focus, retro instant film border, nostalgic',
    negativePrompt: 'sharp digital, modern HDR, clean studio',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40'
  },
  {
    id: 'hdr',
    name: 'HDR (High Dynamic Range)',
    category: 'photo',
    description: 'Hyper-detailed lighting, hyper-real clarity, and intense color saturation',
    positivePrompt: 'HDR photography, hyper-detailed lighting, hyper-real clarity, intense color saturation, high dynamic range, crisp detail',
    negativePrompt: 'flat, underexposed, washed out, soft focus',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
  },

  // —— 3. Digital, Illustration & Animation ——
  {
    id: 'flat_vector',
    name: 'Flat Vector',
    category: 'digital',
    description: 'Clean geometric lines, solid shapes, and zero gradients',
    positivePrompt: 'flat vector illustration, clean geometric lines, solid shapes, zero gradients, minimal design, graphic design',
    negativePrompt: 'photorealistic, 3d, gradients, texture noise, painting',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
  },
  {
    id: 'watermark_logo',
    name: 'Watermark / Logo Mark',
    category: 'digital',
    description: 'Simple graphic logo or text watermark for video overlays — not a photograph',
    positivePrompt: 'flat vector logo watermark, simple graphic mark, clean typography, transparent background feel, solid shapes, minimal design, high contrast silhouette, broadcast lower-third friendly, no photorealism, no 3d render, pure graphic design',
    negativePrompt: 'photograph, photorealistic, realistic person, landscape, 3d render, soft shadows, complex scene, noisy texture, stock photo',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
  },
  {
    id: 'flat_icon',
    name: 'Flat Icon / Badge',
    category: 'digital',
    description: 'App-icon style badge for overlays and channel branding',
    positivePrompt: 'flat app icon, badge logo, centered simple symbol, bold silhouette, limited color palette, crisp edges, transparent-ready graphic, vector illustration',
    negativePrompt: 'photograph, photorealistic, 3d, blurry, complex background scene',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
  },
  {
    id: 'pixel_art',
    name: 'Pixel Art',
    category: 'digital',
    description: 'Blocky, low-resolution 8-bit or 16-bit video game aesthetics',
    positivePrompt: 'pixel art, 8-bit or 16-bit, blocky low-resolution, retro video game aesthetic, limited palette',
    negativePrompt: 'smooth, high resolution, photorealistic, anti-aliased',
    badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/40'
  },
  {
    id: 'anime_manga',
    name: 'Anime / Manga',
    category: 'digital',
    description: 'Clean linework, large expressive eyes, and dynamic Japanese animation styling',
    positivePrompt: 'anime manga style, clean linework, large expressive eyes, dynamic Japanese animation, cel shading, vibrant colors',
    negativePrompt: 'photorealistic, western comic, 3d cgi, muddy colors',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40'
  },
  {
    id: 'pixar_3d',
    name: '3D Render / Pixar Style',
    category: 'digital',
    description: 'Smooth clay-like or digital 3D modeling with soft studio lighting',
    positivePrompt: 'Pixar style 3D render, smooth clay-like surfaces, soft studio lighting, appealing character design, subsurface scattering',
    negativePrompt: '2d, flat, sketch, photoreal human skin pores',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40'
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk / Cybernoir',
    category: 'digital',
    description: 'Neon lighting, rain-slicked futuristic cityscapes, and high-tech glow',
    positivePrompt: 'cyberpunk cybernoir, neon lighting, rain-slicked futuristic cityscape, high-tech glow, holographic signs, night atmosphere',
    negativePrompt: 'pastoral, daylight, rustic, sunny rural',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
  },
  {
    id: 'cel_shading',
    name: 'Cel-Shading',
    category: 'digital',
    description: 'Flat, comic-book style shading with hard shadow boundaries',
    positivePrompt: 'cel-shaded, flat comic-book style shading, hard shadow boundaries, bold outlines, graphic novel look',
    negativePrompt: 'soft gradients, photorealistic, painterly brush',
    badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
  },

  // —— 4. Classic & Historic Art Movements ——
  {
    id: 'surrealism',
    name: 'Surrealism',
    category: 'classic',
    description: 'Dreamlike, illogical, and bizarre juxtapositions of real objects',
    positivePrompt: 'surrealism, dreamlike, illogical bizarre juxtapositions, Magritte Dali inspired, uncanny real objects',
    negativePrompt: 'mundane realism, documentary, ordinary scene',
    badgeColor: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40'
  },
  {
    id: 'impressionism',
    name: 'Impressionism',
    category: 'classic',
    description: 'Visible, short brushstrokes emphasizing light shifting over time',
    positivePrompt: 'impressionist painting, visible short brushstrokes, emphasis on shifting light, Monet style, outdoor light',
    negativePrompt: 'photorealistic, hard edges, digital flat, dark noir',
    badgeColor: 'bg-lime-500/20 text-lime-300 border-lime-500/40'
  },
  {
    id: 'pop_art',
    name: 'Pop Art',
    category: 'classic',
    description: 'Bold commercial colors, heavy outlines, and retro comic grid patterns',
    positivePrompt: 'pop art, bold commercial colors, heavy outlines, retro comic halftone, Warhol Lichtenstein style',
    negativePrompt: 'muted, photorealistic, soft watercolor, dark realism',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40'
  },
  {
    id: 'art_deco',
    name: 'Art Deco',
    category: 'classic',
    description: 'Sleek, symmetrical, geometric luxury patterns with metallic accents',
    positivePrompt: 'art deco, sleek symmetrical geometric luxury, metallic gold accents, 1920s elegant patterns',
    negativePrompt: 'organic chaos, rustic, grunge, medieval',
    badgeColor: 'bg-amber-500/20 text-amber-200 border-amber-500/40'
  },
  {
    id: 'baroque',
    name: 'Baroque',
    category: 'classic',
    description: 'Ornate, deeply dramatic chiaroscuro lighting and grand compositions',
    positivePrompt: 'baroque painting, ornate, dramatic chiaroscuro, grand composition, Caravaggio Rembrandt lighting',
    negativePrompt: 'minimal, flat modern, cartoon, digital vector',
    badgeColor: 'bg-yellow-600/20 text-yellow-200 border-yellow-600/40'
  },
  {
    id: 'cubism',
    name: 'Cubism',
    category: 'classic',
    description: 'Multi-angled, fragmented geometric object representations',
    positivePrompt: 'cubism, multi-angled fragmented geometric forms, Picasso Braque style, analytical cubist planes',
    negativePrompt: 'photorealistic, smooth continuous form, impressionist soft',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40'
  },

  // —— 5. Alternative & Material-Based Styles ——
  {
    id: 'paper_collage',
    name: 'Paper Collage / Cut-Paper',
    category: 'alternative',
    description: 'Layered paper edges, physical shadow casting, and mixed textures',
    positivePrompt: 'paper collage, cut-paper art, layered paper edges, physical shadow casting, mixed paper textures, handmade',
    negativePrompt: 'smooth digital, photorealistic, 3d render without paper',
    badgeColor: 'bg-stone-500/20 text-stone-300 border-stone-500/40'
  },
  {
    id: 'steampunk',
    name: 'Steampunk',
    category: 'alternative',
    description: 'Victorian-industrial fusion with brass, gears, and steam-powered tech',
    positivePrompt: 'steampunk, Victorian industrial, brass gears, steam-powered machinery, copper pipes, clockwork aesthetic',
    negativePrompt: 'modern plastic, cyberpunk neon only, minimalist',
    badgeColor: 'bg-amber-600/20 text-amber-300 border-amber-600/40'
  },
  {
    id: 'stained_glass',
    name: 'Stained Glass',
    category: 'alternative',
    description: 'Thick dark borders enclosing luminous, jewel-toned colored glass panels',
    positivePrompt: 'stained glass window, thick dark lead borders, luminous jewel-toned colored glass panels, light through glass',
    negativePrompt: 'photograph, oil painting, soft edges, no borders',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  },
  {
    id: 'claymation',
    name: 'Claymation',
    category: 'alternative',
    description: 'Stop-motion textured clay figures with tangible physical imperfections',
    positivePrompt: 'claymation, stop-motion clay figures, tangible physical imperfections, fingerprint texture, Aardman style',
    negativePrompt: 'smooth CGI, photorealistic, 2d flat illustration',
    badgeColor: 'bg-orange-500/20 text-orange-200 border-orange-500/40'
  }
,

  // —— Medium (prompt cheat sheet) ——
  { id: 'medium_stencil', name: 'Stencil', category: 'medium', description: 'Hard-edged stencil art with spray or cut-out look', positivePrompt: 'stencil art, hard edges, spray-paint stencil aesthetic, high contrast silhouette', negativePrompt: 'soft photorealism, complex gradients', badgeColor: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40' },
  { id: 'medium_papercraft', name: 'Papercraft', category: 'medium', description: 'Folded and layered paper craft construction', positivePrompt: 'papercraft, folded paper, layered paper construction, paper texture, handmade craft', negativePrompt: 'photograph, 3d plastic, oil paint', badgeColor: 'bg-stone-500/20 text-stone-300 border-stone-500/40' },
  { id: 'medium_marker', name: 'Marker Illustration', category: 'medium', description: 'Bold marker pen illustration with solid fills', positivePrompt: 'marker illustration, bold marker pen, solid color fills, illustration board', negativePrompt: 'photorealistic, soft oil painting', badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
  { id: 'medium_graffiti', name: 'Graffiti', category: 'medium', description: 'Street graffiti tags and murals', positivePrompt: 'graffiti art, street mural, spray paint tags, urban wall art', negativePrompt: 'studio photo, clean corporate design', badgeColor: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40' },
  { id: 'medium_quilling', name: 'Quilling', category: 'medium', description: 'Rolled paper quilling filigree', positivePrompt: 'paper quilling, rolled paper strips, filigree paper art, delicate coils', negativePrompt: 'photograph, digital flat', badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  { id: 'medium_collage', name: 'Collage', category: 'medium', description: 'Mixed media collage of cut pieces', positivePrompt: 'collage, mixed media cutouts, layered paper collage, scrapbook texture', negativePrompt: 'single smooth photo', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  { id: 'medium_mosaic', name: 'Mosaic', category: 'medium', description: 'Tile mosaic of small colored pieces', positivePrompt: 'mosaic art, small colored tiles, tessellated pieces, mosaic pattern', negativePrompt: 'smooth continuous photo', badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40' },

  // —— Material ——
  { id: 'mat_porcelain', name: 'Porcelain', category: 'material', description: 'Smooth glazed porcelain surface', positivePrompt: 'porcelain material, smooth glazed ceramic, fine china texture', negativePrompt: 'rough wood, fabric', badgeColor: 'bg-slate-500/20 text-slate-200 border-slate-500/40' },
  { id: 'mat_light', name: 'Light / Luminous', category: 'material', description: 'Subject made of pure light', positivePrompt: 'made of light, luminous body, glowing translucent energy form', negativePrompt: 'opaque matte solid', badgeColor: 'bg-yellow-500/20 text-yellow-200 border-yellow-500/40' },
  { id: 'mat_candy', name: 'Candy', category: 'material', description: 'Candy-like glossy sugar surface', positivePrompt: 'candy material, glossy sugar coating, confectionery texture', negativePrompt: 'matte metal, stone', badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/40' },
  { id: 'mat_bubbles', name: 'Bubbles', category: 'material', description: 'Iridescent soap-bubble surfaces', positivePrompt: 'soap bubbles, iridescent bubble surface, transparent sphere film', negativePrompt: 'solid opaque block', badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
  { id: 'mat_crystals', name: 'Crystals', category: 'material', description: 'Faceted crystal and gem surfaces', positivePrompt: 'crystal material, faceted gem, refractive crystal geometry', negativePrompt: 'soft fabric, matte plastic', badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/40' },
  { id: 'mat_ceramic', name: 'Ceramic', category: 'material', description: 'Fired ceramic glaze and clay body', positivePrompt: 'ceramic material, glazed pottery, kiln-fired clay', negativePrompt: 'metal chrome, liquid', badgeColor: 'bg-orange-500/20 text-orange-200 border-orange-500/40' },
  { id: 'mat_plastic', name: 'Plastic', category: 'material', description: 'Smooth molded plastic', positivePrompt: 'plastic material, injection-molded plastic, smooth polymer surface', negativePrompt: 'organic wood grain', badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
  { id: 'mat_wood', name: 'Wood', category: 'material', description: 'Natural wood grain', positivePrompt: 'wood material, natural wood grain, timber texture', negativePrompt: 'metal, glass, plastic shine', badgeColor: 'bg-amber-600/20 text-amber-300 border-amber-600/40' },
  { id: 'mat_metal', name: 'Metal', category: 'material', description: 'Brushed or polished metal', positivePrompt: 'metal material, brushed steel, polished metal surface, metallic reflections', negativePrompt: 'wood, fabric, matte clay', badgeColor: 'bg-zinc-500/20 text-zinc-200 border-zinc-500/40' },
  { id: 'mat_water', name: 'Water', category: 'material', description: 'Liquid water surface and flow', positivePrompt: 'water material, liquid water surface, flowing transparent water', negativePrompt: 'dry solid, fire', badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { id: 'mat_glass', name: 'Glass', category: 'material', description: 'Transparent refractive glass', positivePrompt: 'glass material, transparent glass, refractive clear glass', negativePrompt: 'opaque solid, matte', badgeColor: 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40' },
  { id: 'mat_sand', name: 'Sand', category: 'material', description: 'Granular sand surface', positivePrompt: 'sand material, granular sand texture, desert sand grains', negativePrompt: 'smooth glass, liquid metal', badgeColor: 'bg-yellow-600/20 text-yellow-200 border-yellow-600/40' },
  { id: 'mat_rain', name: 'Rain', category: 'material', description: 'Rain-slicked wet surfaces', positivePrompt: 'rain material, rain-slicked surface, water droplets on surface', negativePrompt: 'dry dusty desert only', badgeColor: 'bg-slate-500/20 text-slate-300 border-slate-500/40' },

  // —— Photography style ——
  { id: 'photo_high_key', name: 'High Key Photography', category: 'photography', description: 'Bright, low-contrast high-key lighting', positivePrompt: 'high key photography, bright low contrast, soft white background lighting', negativePrompt: 'low key dark moody', badgeColor: 'bg-blue-500/20 text-blue-200 border-blue-500/40' },
  { id: 'photo_low_key', name: 'Low Key Photography', category: 'photography', description: 'Dark, high-contrast low-key lighting', positivePrompt: 'low key photography, dark high contrast, selective lighting on black', negativePrompt: 'bright high key washed out', badgeColor: 'bg-zinc-600/20 text-zinc-200 border-zinc-600/40' },
  { id: 'photo_low_angle', name: 'Low Angle', category: 'photography', description: 'Camera looking upward', positivePrompt: 'low angle photography, camera looking up, heroic upward perspective', negativePrompt: 'top-down bird eye', badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { id: 'photo_high_angle', name: 'High Angle', category: 'photography', description: 'Camera looking downward', positivePrompt: 'high angle photography, camera looking down, elevated viewpoint', negativePrompt: 'worm eye low angle', badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { id: 'photo_extreme_closeup', name: 'Extreme Close-Up', category: 'photography', description: 'Tight facial or detail crop', positivePrompt: 'extreme close-up photography, tight crop on detail, macro facial framing', negativePrompt: 'wide establishing shot', badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40' },
  { id: 'photo_low_shutter', name: 'Low Shutter Speed', category: 'photography', description: 'Motion blur from slow shutter', positivePrompt: 'low shutter speed photography, motion blur trails, long exposure motion', negativePrompt: 'frozen sharp action only', badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
  { id: 'photo_bokeh', name: 'Bokeh Photography', category: 'photography', description: 'Creamy out-of-focus bokeh balls', positivePrompt: 'bokeh photography, creamy bokeh background, circular light orbs, shallow DOF', negativePrompt: 'deep focus everything sharp', badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/40' },
  { id: 'photo_silhouette', name: 'Silhouette Photography', category: 'photography', description: 'Subject as dark silhouette', positivePrompt: 'silhouette photography, dark silhouette against bright background, rim outline', negativePrompt: 'fully lit front face detail', badgeColor: 'bg-zinc-500/20 text-zinc-200 border-zinc-500/40' },
  { id: 'photo_studio', name: 'Studio Lighting', category: 'photography', description: 'Controlled studio softboxes', positivePrompt: 'studio lighting photography, softbox key light, controlled studio setup', negativePrompt: 'harsh outdoor noon sun only', badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { id: 'photo_birds_eye', name: "Bird's-Eye View", category: 'photography', description: 'Straight-down overhead view', positivePrompt: "bird's-eye view, top-down overhead photography, nadir camera", negativePrompt: 'eye-level street view', badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
  { id: 'photo_worms_eye', name: "Worm's-Eye View", category: 'photography', description: 'Ground-level looking up', positivePrompt: "worm's-eye view, ground-level upward photography, extreme low perspective", negativePrompt: 'aerial top-down', badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
  { id: 'photo_dutch', name: 'Dutch Angle', category: 'photography', description: 'Tilted camera horizon', positivePrompt: 'dutch angle photography, tilted camera, canted horizon, dynamic diagonal frame', negativePrompt: 'level horizon only', badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/40' },
  { id: 'photo_long_exposure', name: 'Long Exposure', category: 'photography', description: 'Long exposure light trails', positivePrompt: 'long exposure photography, light trails, silky water long exposure', negativePrompt: 'instant snapshot freeze', badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },

  // —— Lighting ——
  { id: 'light_natural', name: 'Natural Lighting', category: 'lighting', description: 'Soft natural ambient light', positivePrompt: 'natural lighting, soft ambient daylight, realistic outdoor light', negativePrompt: 'harsh neon only', badgeColor: 'bg-amber-500/20 text-amber-200 border-amber-500/40' },
  { id: 'light_shadow', name: 'Light and Shadow', category: 'lighting', description: 'Strong interplay of light and shadow', positivePrompt: 'dramatic light and shadow, strong contrast lighting, defined shadows', negativePrompt: 'flat even lighting', badgeColor: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40' },
  { id: 'light_volumetric', name: 'Volumetric Lighting', category: 'lighting', description: 'Visible light beams in atmosphere', positivePrompt: 'volumetric lighting, god-ray beams, atmospheric light shafts', negativePrompt: 'flat ambient only', badgeColor: 'bg-yellow-500/20 text-yellow-200 border-yellow-500/40' },
  { id: 'light_neon', name: 'Neon Lighting', category: 'lighting', description: 'Colored neon glow', positivePrompt: 'neon lighting, colored neon glow, night neon signs', negativePrompt: 'daylight only', badgeColor: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40' },
  { id: 'light_golden', name: 'Golden Hour', category: 'lighting', description: 'Warm sunset golden hour', positivePrompt: 'golden hour lighting, warm sunset light, long golden shadows', negativePrompt: 'cold blue hour only', badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
  { id: 'light_blue_hour', name: 'Blue Hour', category: 'lighting', description: 'Cool twilight blue hour', positivePrompt: 'blue hour lighting, cool twilight, deep blue sky light', negativePrompt: 'harsh midday sun', badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { id: 'light_backlight', name: 'Backlighting', category: 'lighting', description: 'Light from behind the subject', positivePrompt: 'backlighting, rim light from behind, glowing edge silhouette', negativePrompt: 'front-only flat light', badgeColor: 'bg-amber-500/20 text-amber-200 border-amber-500/40' },
  { id: 'light_chiaroscuro', name: 'Chiaroscuro', category: 'lighting', description: 'Classical dramatic chiaroscuro', positivePrompt: 'chiaroscuro lighting, classical dramatic light-dark contrast, Rembrandt light', negativePrompt: 'flat even illumination', badgeColor: 'bg-stone-500/20 text-stone-300 border-stone-500/40' },
  { id: 'light_god_rays', name: 'God Rays', category: 'lighting', description: 'Crepuscular god rays', positivePrompt: 'god rays, crepuscular rays, beams of light through atmosphere', negativePrompt: 'diffuse overcast only', badgeColor: 'bg-yellow-500/20 text-yellow-200 border-yellow-500/40' },
  { id: 'light_candle', name: 'Candlelight', category: 'lighting', description: 'Warm flickering candle light', positivePrompt: 'candlelight, warm flickering candle illumination, intimate warm glow', negativePrompt: 'cold fluorescent', badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
  { id: 'light_street', name: 'Street Lighting', category: 'lighting', description: 'Urban street lamps at night', positivePrompt: 'street lighting, urban night street lamps, sodium or LED street glow', negativePrompt: 'bright studio daylight', badgeColor: 'bg-amber-600/20 text-amber-300 border-amber-600/40' },
  { id: 'light_softbox', name: 'Softbox Lighting', category: 'lighting', description: 'Soft diffused softbox', positivePrompt: 'softbox lighting, soft diffused key light, beauty softbox', negativePrompt: 'hard bare bulb shadows', badgeColor: 'bg-slate-500/20 text-slate-200 border-slate-500/40' },
  { id: 'light_moon', name: 'Moonlight', category: 'lighting', description: 'Cool moonlight night scene', positivePrompt: 'moonlight, cool blue moonlight night, lunar illumination', negativePrompt: 'bright sunny day', badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
  { id: 'light_fairy', name: 'Fairy Lights', category: 'lighting', description: 'String fairy lights bokeh', positivePrompt: 'fairy lights, string lights bokeh, warm twinkle lights', negativePrompt: 'harsh single spotlight', badgeColor: 'bg-yellow-500/20 text-yellow-200 border-yellow-500/40' },

  // —— Color and palette ——
  { id: 'color_cool', name: 'Cool Tones', category: 'color', description: 'Cool blue-green palette', positivePrompt: 'cool color tones, blue green palette, cold color grading', negativePrompt: 'warm orange red only', badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
  { id: 'color_warm', name: 'Warm Tones', category: 'color', description: 'Warm orange-red palette', positivePrompt: 'warm color tones, orange red palette, warm color grading', negativePrompt: 'cold blue only', badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
  { id: 'color_pastels', name: 'Pastels', category: 'color', description: 'Soft pastel palette', positivePrompt: 'pastel colors, soft pastel palette, muted light hues', negativePrompt: 'neon oversaturated', badgeColor: 'bg-pink-500/20 text-pink-200 border-pink-500/40' },
  { id: 'color_vibrant', name: 'Vibrant', category: 'color', description: 'Highly saturated vibrant colors', positivePrompt: 'vibrant colors, highly saturated palette, vivid color punch', negativePrompt: 'desaturated muted', badgeColor: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40' },
  { id: 'color_earth', name: 'Earth Tones', category: 'color', description: 'Natural earth browns and ochres', positivePrompt: 'earth tones, ochre brown green palette, natural earthy colors', negativePrompt: 'neon synthetic', badgeColor: 'bg-amber-600/20 text-amber-300 border-amber-600/40' },
  { id: 'color_jewel', name: 'Jewel Tones', category: 'color', description: 'Rich jewel-tone palette', positivePrompt: 'jewel tones, emerald ruby sapphire palette, rich saturated jewels', negativePrompt: 'pastel washed out', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  { id: 'color_mono_blue', name: 'Monochromatic Blues', category: 'color', description: 'Single-hue blue range', positivePrompt: 'monochromatic blue, blue-only palette, tonal blue range', negativePrompt: 'full rainbow', badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { id: 'color_earthy_red', name: 'Earthy Reds and Oranges', category: 'color', description: 'Rust red and burnt orange', positivePrompt: 'earthy reds and oranges, rust burnt sienna palette', negativePrompt: 'cool cyan only', badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40' },
  { id: 'color_neon_graffiti', name: 'Neon Graffiti', category: 'color', description: 'Neon spray-paint palette', positivePrompt: 'neon graffiti colors, fluorescent spray palette, electric neon hues', negativePrompt: 'muted earth tones only', badgeColor: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40' },
  { id: 'color_autumn', name: 'Autumn Leaves', category: 'color', description: 'Autumn foliage palette', positivePrompt: 'autumn leaves colors, fall foliage palette, gold crimson brown', negativePrompt: 'spring green only', badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
  { id: 'color_deep_sea', name: 'Deep Sea Blues', category: 'color', description: 'Deep ocean blue-green', positivePrompt: 'deep sea blues, ocean abyss palette, teal indigo underwater colors', negativePrompt: 'desert sand palette', badgeColor: 'bg-blue-600/20 text-blue-300 border-blue-600/40' },
  { id: 'color_grayscale', name: 'Grayscale', category: 'color', description: 'Neutral grayscale only', positivePrompt: 'grayscale, neutral gray tones, black and white tonal range', negativePrompt: 'full color saturation', badgeColor: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40' },
  { id: 'color_sepia', name: 'Sepia', category: 'color', description: 'Vintage sepia tone', positivePrompt: 'sepia tone, vintage brown monochrome, aged photo sepia', negativePrompt: 'modern full color', badgeColor: 'bg-amber-600/20 text-amber-200 border-amber-600/40' },
  { id: 'color_primary', name: 'Primary Colors', category: 'color', description: 'Bold red yellow blue primaries', positivePrompt: 'primary colors, red yellow blue bold palette, pure primaries', negativePrompt: 'muted tertiary only', badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40' },
  { id: 'color_rainbow', name: 'Rainbow Spectrum', category: 'color', description: 'Full rainbow spectrum', positivePrompt: 'rainbow spectrum, full prismatic colors, spectral rainbow', negativePrompt: 'monochrome only', badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/40' },
  { id: 'color_metallics', name: 'Metallics', category: 'color', description: 'Gold silver copper metallic colors', positivePrompt: 'metallic colors, gold silver copper palette, reflective metal hues', negativePrompt: 'flat matte pastel', badgeColor: 'bg-yellow-600/20 text-yellow-200 border-yellow-600/40' },

  // —— Transparent / watermark helper ——
  { id: 'transparent_bg', name: 'Transparent Background', category: 'digital', description: 'Isolated subject for watermark/logo — use Make Transparent after generate', positivePrompt: 'isolated subject on pure solid white background, centered, no environment, no ground plane, clean cutout ready, high contrast edges, product packshot style, no shadows on background', negativePrompt: 'busy background, landscape, room interior, complex scene, gradient sky', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
];

export const GINA_STYLE_CATEGORIES: { id: GinaImageStyle['category']; label: string }[] = [
  { id: 'core', label: 'Gina Core' },
  { id: 'traditional', label: 'Traditional Art Mediums' },
  { id: 'medium', label: 'Medium' },
  { id: 'material', label: 'Material' },
  { id: 'photo', label: 'Photography & Cinematic' },
  { id: 'photography', label: 'Photography Style' },
  { id: 'lighting', label: 'Lighting' },
  { id: 'color', label: 'Color & Palette' },
  { id: 'digital', label: 'Digital, Illustration & Animation' },
  { id: 'classic', label: 'Classic & Historic Art Movements' },
  { id: 'alternative', label: 'Alternative & Material-Based' }
];
