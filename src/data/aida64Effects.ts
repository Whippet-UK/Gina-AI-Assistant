export type GaugeEffectId =
  | 'neon' | 'bloom' | 'centreLight' | 'rimLight' | 'lightSpill'
  | 'lensFlare' | 'pulse' | 'breathing' | 'overdrive'
  | 'glass' | 'acrylic' | 'brushedMetal' | 'chrome' | 'carbon'
  | 'anodised' | 'frosted' | 'holographic' | 'crt' | 'led' | 'liquid'
  | 'needleShadow' | 'needleGlow' | 'needleTrail' | 'peakHold' | 'minMarker'
  | 'warningZone' | 'activeSegment' | 'tickHighlight'
  | 'scanlines' | 'scanSweep' | 'hudGrid' | 'hexGrid' | 'circuits'
  | 'digitalNoise' | 'glitch' | 'chromatic' | 'particles' | 'sparks'
  | 'energyArcs' | 'rotatingRings' | 'smoke' | 'dust' | 'energyParticles'
  | 'grain' | 'vignette' | 'depthBlur' | 'ambientLight' | 'shadowFalloff'
  | 'bevel' | 'reflection' | 'parallax' | 'directionalLight' | 'specular'
  | 'meniscus' | 'bubbles' | 'turbulence' | 'sevenSegment' | 'dotMatrix'
  | 'ticker' | 'odometer' | 'crtCurvature' | 'phosphor' | 'barrelDistortion'
  | 'heat' | 'electricalArc' | 'particleTrail' | 'motionBlur' | 'ghosting'
  | 'sweep' | 'dither' | 'glare' | 'edgeGlow' | 'ambientOcclusion'
  | 'bezel' | 'backgroundTexture' | 'gradientBackground';

export type GaugeEffectCurve =
  | 'linear' | 'easeIn' | 'easeOut' | 'easeInOut'
  | 'exponential' | 'stepped' | 'threshold' | 'warningRamp';

export interface GaugeEffectLayer {
  id: string;
  effect: GaugeEffectId;
  enabled: boolean;
  intensity: number;
  opacity: number;
  blur: number;
  radius: number;
  angle: number;
  colour?: string;
  curve: GaugeEffectCurve;
  startState: number;
  endState: number;
  blendMode?: GlobalCompositeOperation;
}

export interface GaugeEffectPreset {
  id: string;
  name: string;
  description: string;
  layers: GaugeEffectLayer[];
}

const L = (
  id: string,
  effect: GaugeEffectId,
  intensity = 1,
  colour?: string,
  curve: GaugeEffectCurve = 'linear'
): GaugeEffectLayer => ({
  id, effect, enabled: true, intensity, opacity: 1, blur: 0, radius: 1,
  angle: 0, colour, curve, startState: 0, endState: 100
});

export const AIDA64_EFFECT_PRESETS: GaugeEffectPreset[] = [
  { id:'cleanInstrument', name:'Clean Instrument', description:'Sharp restrained instrumentation.',
    layers:[L('ambient','ambientLight',.25),L('bevel','bevel',.45),L('vignette','vignette',.2)] },
  { id:'neonCyberpunk', name:'Neon Cyberpunk', description:'Emissive lighting, bloom and digital atmosphere.',
    layers:[L('neon','neon',1),L('bloom','bloom',.9),L('chromatic','chromatic',.35),L('particles','particles',.35),L('glare','glare',.3),L('vignette','vignette',.3)] },
  { id:'militaryHud', name:'Military HUD', description:'Tactical grid, scan and restrained illumination.',
    layers:[L('hud','hudGrid',.8),L('scan','scanSweep',.55),L('circuits','circuits',.3),L('active','activeSegment',.7),L('vignette','vignette',.35)] },
  { id:'raceCar', name:'Race Car', description:'High-contrast motorsport instrument.',
    layers:[L('carbon','carbon',.8),L('needle','needleGlow',.9),L('trail','needleTrail',.65),L('warning','warningZone',1),L('overdrive','overdrive',.8,'#ff3b30','warningRamp'),L('bezel','bezel',.7)] },
  { id:'sciFiReactor', name:'Sci-Fi Reactor', description:'Layered energy rings and intense emissive bloom.',
    layers:[L('rings','rotatingRings',.9),L('energy','energyArcs',.75),L('bloom','bloom',1),L('particles','energyParticles',.7),L('centre','centreLight',.9),L('glare','glare',.35)] },
  { id:'retroCrt', name:'Retro CRT', description:'Phosphor glow, scanlines, curvature and noise.',
    layers:[L('crt','crt',1),L('phosphor','phosphor',.9),L('scanlines','scanlines',.7),L('noise','digitalNoise',.35),L('curve','crtCurvature',.5),L('grain','grain',.3)] },
  { id:'glassPremium', name:'Glass Premium', description:'Glossy glass and polished physical instrument.',
    layers:[L('glass','glass',.9),L('reflection','reflection',.8),L('specular','specular',.7),L('bevel','bevel',.8),L('ao','ambientOcclusion',.45),L('vignette','vignette',.2)] },
  { id:'industrial', name:'Industrial', description:'Metal housing with practical illumination.',
    layers:[L('metal','brushedMetal',.9),L('bezel','bezel',.8),L('shadow','shadowFalloff',.7),L('ambient','ambientLight',.3),L('active','activeSegment',.8)] },
  { id:'holographic', name:'Holographic', description:'Transparent futuristic display with interference.',
    layers:[L('holo','holographic',1),L('chromatic','chromatic',.45),L('scan','scanlines',.45),L('glitch','glitch',.25),L('particles','particles',.3)] }
];

export const GAUGE_EFFECT_LIBRARY: GaugeEffectId[] = [
  'neon','bloom','centreLight','rimLight','lightSpill','lensFlare','pulse','breathing','overdrive',
  'glass','acrylic','brushedMetal','chrome','carbon','anodised','frosted','holographic','crt','led','liquid',
  'needleShadow','needleGlow','needleTrail','peakHold','minMarker','warningZone','activeSegment','tickHighlight',
  'scanlines','scanSweep','hudGrid','hexGrid','circuits','digitalNoise','glitch','chromatic','particles','sparks',
  'energyArcs','rotatingRings','smoke','dust','energyParticles','grain','vignette','depthBlur','ambientLight',
  'shadowFalloff','bevel','reflection','parallax','directionalLight','specular','meniscus','bubbles','turbulence',
  'sevenSegment','dotMatrix','ticker','odometer','crtCurvature','phosphor','barrelDistortion','heat','electricalArc',
  'particleTrail','motionBlur','ghosting','sweep','dither','glare','edgeGlow','ambientOcclusion','bezel',
  'backgroundTexture','gradientBackground'
];
