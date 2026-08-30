import { Aida64PanelItem, Aida64ScreenPreset } from '../types';
import { AIDA64_THEMES } from '../data/aida64Presets';

export interface CompiledLayoutPrompt {
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
  itemCount: number;
  zonesSummary: string;
}

/**
 * Compiles an interactive AIDA64 canvas layout into an engineered spatial prompt
 * for ComfyUI / Flux.1 image generation with EXACT coordinates, dimensions, and negative-space constraints.
 */
export function compileLayoutToSpatialPrompt(
  screen: { width: number; height: number },
  items: Aida64PanelItem[],
  themeId: string = 'cyberpunk_red',
  customThemeDesc?: string
): CompiledLayoutPrompt {
  const theme = AIDA64_THEMES.find(t => t.id === themeId) || AIDA64_THEMES[0];

  const w = screen.width;
  const h = screen.height;
  const midX = w / 2;
  const midY = h / 2;

  // Group items by spatial zones
  const topItems: Aida64PanelItem[] = [];
  const bottomItems: Aida64PanelItem[] = [];
  const leftItems: Aida64PanelItem[] = [];
  const rightItems: Aida64PanelItem[] = [];
  const centerItems: Aida64PanelItem[] = [];

  items.forEach(item => {
    const itemCenterX = item.x + item.width / 2;
    const itemCenterY = item.y + item.height / 2;

    if (itemCenterY < h * 0.22) {
      topItems.push(item);
    } else if (itemCenterY > h * 0.78) {
      bottomItems.push(item);
    } else if (itemCenterX < midX - w * 0.12) {
      leftItems.push(item);
    } else if (itemCenterX > midX + w * 0.12) {
      rightItems.push(item);
    } else {
      centerItems.push(item);
    }
  });

  const dials = items.filter(i => i.type === 'dial' || i.shapeType === 'dial_circle' || i.shapeType === 'dial_with_boxes');
  const standaloneBoxes = items.filter(i => i.type === 'value_box' || (i.shapeType && i.shapeType.startsWith('box_')));

  // Detailed coordinate and bounding box list
  const coordinateBlueprintEntries: string[] = [];

  // 1. Dial Blueprint Entries with Exact Pixel Bounds & percentages
  dials.forEach((dial, idx) => {
    const dialRadius = Math.min(dial.width, dial.height) / 2;
    const dialCenterX = Math.round(dial.x + dial.width / 2);
    const dialCenterY = Math.round(dial.y + dial.height / 2);
    const xPctStart = Math.round((dial.x / w) * 100);
    const xPctEnd = Math.round(((dial.x + dial.width) / w) * 100);
    const yPctStart = Math.round((dial.y / h) * 100);
    const yPctEnd = Math.round(((dial.y + dial.height) / h) * 100);
    const posLabel = dialCenterX < midX - 40 ? 'LEFT' : dialCenterX > midX + 40 ? 'RIGHT' : 'CENTER';

    // Find inner value boxes
    const innerBoxes = items.filter(other => {
      if (other.id === dial.id) return false;
      const otherCenterX = other.x + other.width / 2;
      const otherCenterY = other.y + other.height / 2;
      const dist = Math.hypot(otherCenterX - dialCenterX, otherCenterY - dialCenterY);
      return dist < dialRadius * 0.85;
    });

    let innerBoxText = '';
    if (innerBoxes.length > 0) {
      const boxDetails = innerBoxes.map(b => 
        `${b.width}x${b.height}px ${b.boxShape || b.shapeType || 'chamfered'} socket at x=${b.x}, y=${b.y}`
      ).join(', ');
      innerBoxText = ` containing ${innerBoxes.length} embedded metric cutout cavities (${boxDetails})`;
    }

    coordinateBlueprintEntries.push(
      `DIAL #${idx + 1} [${posLabel} ZONE]: Circular bezel centered at X=${dialCenterX}px, Y=${dialCenterY}px (Diameter ${dial.width}px, spanning horizontal bounds ${xPctStart}%-${xPctEnd}% and vertical bounds ${yPctStart}%-${yPctEnd}%)${innerBoxText}`
    );
  });

  // 2. Standalone Boxes / Wings / Banners with Exact Pixel Bounds
  const otherItems = items.filter(i => !dials.some(d => d.id === i.id));
  otherItems.forEach((item, idx) => {
    const xPctStart = Math.round((item.x / w) * 100);
    const xPctEnd = Math.round(((item.x + item.width) / w) * 100);
    const yPctStart = Math.round((item.y / h) * 100);
    const yPctEnd = Math.round(((item.y + item.height) / h) * 100);
    const shape = item.boxShape || item.shapeType || 'box';

    coordinateBlueprintEntries.push(
      `SLOT #${idx + 1} (${shape}): Position at X=${item.x}px, Y=${item.y}px, size ${item.width}x${item.height}px (${xPctStart}%-${xPctEnd}% width)`
    );
  });

  // 3. Negative Space & Composition Rules
  const compositionRules: string[] = [];
  compositionRules.push(`TOTAL CIRCULAR DIALS: EXACTLY ${dials.length}.`);

  const centerDials = centerItems.filter(i => i.type === 'dial' || i.shapeType === 'dial_circle' || i.shapeType === 'dial_with_boxes');
  if (dials.length === 2 && centerDials.length === 0) {
    compositionRules.push(
      `STRICT COMPOSITION CONSTRAINT: Symmetrical dual-dial layout format. Exactly TWO circular gauges (one on left side, one on right side). The middle center corridor (X=${Math.round(w * 0.38)}px to X=${Math.round(w * 0.62)}px) MUST REMAIN COMPLETELY EMPTY OF DIALS. The center is a smooth dark brushed titanium conduit bridge.`
    );
  } else if (dials.length === 1) {
    const single = dials[0];
    const pos = single.x + single.width / 2 < midX ? 'left' : single.x + single.width / 2 > midX ? 'right' : 'center';
    compositionRules.push(
      `STRICT COMPOSITION CONSTRAINT: Exactly ONE circular gauge placed on the ${pos}. All other areas are flat backplate telemetry bays.`
    );
  }

  const promptStructure = [
    `Professional custom AIDA64 sensor panel chassis backplate, ${w}x${h} resolution, engineered high-tech PC hardware monitoring dashboard layout.`,
    customThemeDesc || theme.promptKeywords,
    `[EXACT 2D TEMPLATE BLUEPRINT MATRIX]:`,
    compositionRules.join(' '),
    coordinateBlueprintEntries.join('; ') + '.',
    `All display pods, value boxes, and dial circles have solid pitch-black empty glass interior cutouts, crisp precision chamfered carbon and aluminum bezels, illuminated neon conduits connecting sockets, flush mounting hex bolts.`,
    `EMPTY RECESSED CAVITIES ONLY - all digital text, numbers, and sensor metrics will be rendered at runtime by AIDA64 software overlay.`,
    `ZERO TEXT, zero numbers, zero letters, blank display cavities, pristine dark UI backdrop, Unreal Engine 5 octane render style, 8k resolution, razor sharp vector lines.`
  ].join(' ');

  const negativePrompt = [
    'text, letters, words, font, watermark, numbers, digits, symbols',
    dials.length === 2 && centerDials.length === 0 ? 'third dial, 3 dials, middle gauge, central dial, dial in center, crowded middle' : '',
    'blurry, low resolution, messy layout, asymmetrical, crooked, noisy, artifacts, distorted circles, cracked glass'
  ].filter(Boolean).join(', ');

  const zonesSummary = `${leftItems.length} Left, ${rightItems.length} Right, ${centerItems.length} Center, ${topItems.length} Top, ${bottomItems.length} Bottom (${dials.length} Dials, ${items.length} Total Sockets)`;

  return {
    prompt: promptStructure,
    negativePrompt,
    width: w,
    height: h,
    itemCount: items.length,
    zonesSummary
  };
}

/**
 * Draws the high-contrast geometric layout control mask on an HTML5 canvas
 * (Exact visual structure to Photo 1 aida64_orange_lcd_3D_DYNAMIC.png)
 */
export function renderLayoutControlMaskCanvas(
  canvas: HTMLCanvasElement,
  screen: { width: number; height: number },
  items: Aida64PanelItem[],
  options: {
    colorCode?: boolean;
    highContrast?: boolean;
    showBorders?: boolean;
    showOutlines?: boolean;
  } = {}
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = screen.width;
  const h = screen.height;
  canvas.width = w;
  canvas.height = h;

  // Background: Solid Pitch Black
  ctx.fillStyle = '#05070c';
  ctx.fillRect(0, 0, w, h);

  // Outer frame & subtle grid guidelines
  ctx.strokeStyle = options.highContrast ? '#222736' : '#141a29';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, w - 20, h - 20);

  // Center alignment crosshairs
  ctx.strokeStyle = '#1e2638';
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w / 2, h);
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Render each item as a geometric socket mask
  items.forEach((item, idx) => {
    ctx.save();

    const isCircle = item.type === 'dial' || item.shapeType === 'dial_circle';
    const isTempWing = item.shapeType === 'temp_wing_angled';
    const isBanner = item.shapeType === 'voltage_wattage_banner';
    const isRam = item.shapeType === 'ram_stick_module';
    const isArt = item.shapeType === 'avatar_stage_cutout';

    // Socket fill color
    if (options.colorCode) {
      ctx.fillStyle = item.color || '#38bdf8';
      ctx.strokeStyle = '#ffffff';
    } else {
      // High-contrast mask shades (Dark Slate / Charcoal sockets with crisp borders like Photo 1)
      ctx.fillStyle = options.highContrast ? '#1c2130' : '#121622';
      ctx.strokeStyle = '#333e56';
    }
    ctx.lineWidth = 3;

    if (isCircle) {
      // Circular Dial Socket (Outer Bezel + Inner Recessed Bay)
      const radius = Math.min(item.width, item.height) / 2;
      const centerX = item.x + item.width / 2;
      const centerY = item.y + item.height / 2;

      // Outer bezel ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Inner circular core
      ctx.fillStyle = '#080a10';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.75, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = options.colorCode ? item.color : '#475569';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (isTempWing) {
      // Aerodynamic Angled Wing (Photo 2 Reference)
      const x = item.x;
      const y = item.y;
      const bw = item.width;
      const bh = item.height;

      ctx.beginPath();
      ctx.moveTo(x + 16, y);
      ctx.lineTo(x + bw, y);
      ctx.lineTo(x + bw - 20, y + bh);
      ctx.lineTo(x, y + bh);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner LED indicator dot
      ctx.fillStyle = options.colorCode ? item.color : '#ef4444';
      ctx.beginPath();
      ctx.arc(x + bw - 14, y + bh / 2, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (isBanner) {
      // Chamfered Voltage / Power Banner
      const x = item.x;
      const y = item.y;
      const bw = item.width;
      const bh = item.height;
      const chamfer = 10;

      ctx.beginPath();
      ctx.moveTo(x + chamfer, y);
      ctx.lineTo(x + bw - chamfer, y);
      ctx.lineTo(x + bw, y + chamfer);
      ctx.lineTo(x + bw, y + bh - chamfer);
      ctx.lineTo(x + bw - chamfer, y + bh);
      ctx.lineTo(x + chamfer, y + bh);
      ctx.lineTo(x, y + bh - chamfer);
      ctx.lineTo(x, y + chamfer);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (item.shapeType === 'box_chamfer' || item.boxShape === 'chamfer') {
      // Chamfered Value Box
      const x = item.x;
      const y = item.y;
      const bw = item.width;
      const bh = item.height;
      const c = Math.min(10, Math.min(bw, bh) * 0.25);

      ctx.beginPath();
      ctx.moveTo(x + c, y);
      ctx.lineTo(x + bw - c, y);
      ctx.lineTo(x + bw, y + c);
      ctx.lineTo(x + bw, y + bh - c);
      ctx.lineTo(x + bw - c, y + bh);
      ctx.lineTo(x + c, y + bh);
      ctx.lineTo(x, y + bh - c);
      ctx.lineTo(x, y + c);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (item.shapeType === 'box_hexagon' || item.boxShape === 'hexagon') {
      // Hexagonal Pointed Value Box
      const x = item.x;
      const y = item.y;
      const bw = item.width;
      const bh = item.height;
      const pointW = Math.min(14, bw * 0.2);

      ctx.beginPath();
      ctx.moveTo(x + pointW, y);
      ctx.lineTo(x + bw - pointW, y);
      ctx.lineTo(x + bw, y + bh / 2);
      ctx.lineTo(x + bw - pointW, y + bh);
      ctx.lineTo(x + pointW, y + bh);
      ctx.lineTo(x, y + bh / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (item.shapeType === 'box_cut_corner' || item.boxShape === 'cut_corner') {
      // Opposite Cut Corner Box
      const x = item.x;
      const y = item.y;
      const bw = item.width;
      const bh = item.height;
      const c = Math.min(12, Math.min(bw, bh) * 0.3);

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + bw - c, y);
      ctx.lineTo(x + bw, y + c);
      ctx.lineTo(x + bw, y + bh);
      ctx.lineTo(x + c, y + bh);
      ctx.lineTo(x, y + bh - c);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (item.shapeType === 'box_pill' || item.boxShape === 'pill') {
      // Pill / Stadium Capsule Box
      const x = item.x;
      const y = item.y;
      const bw = item.width;
      const bh = item.height;
      const r = bh / 2;

      ctx.beginPath();
      ctx.arc(x + r, y + r, r, Math.PI * 0.5, Math.PI * 1.5);
      ctx.arc(x + bw - r, y + r, r, Math.PI * 1.5, Math.PI * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (item.shapeType === 'box_bracket' || item.boxShape === 'bracket') {
      // HUD Bracket Box
      const x = item.x;
      const y = item.y;
      const bw = item.width;
      const bh = item.height;
      const bl = 8;

      ctx.fillRect(x, y, bw, bh);
      ctx.strokeRect(x, y, bw, bh);

      // Bracket accents
      ctx.strokeStyle = options.colorCode ? item.color : '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y + bl);
      ctx.lineTo(x, y);
      ctx.lineTo(x + bl, y);
      ctx.moveTo(x + bw - bl, y);
      ctx.lineTo(x + bw, y);
      ctx.lineTo(x + bw, y + bl);
      ctx.stroke();
    } else if (isRam) {
      // RAM Heat Spreader Module
      const x = item.x;
      const y = item.y;
      const bw = item.width;
      const bh = item.height;

      // Module body
      ctx.fillRect(x, y, bw, bh);
      ctx.strokeRect(x, y, bw, bh);

      // Top light bar strip
      ctx.fillStyle = options.colorCode ? item.color : '#475569';
      ctx.fillRect(x + 10, y + 4, bw - 20, 6);
    } else if (isArt) {
      // Character / Avatar Stage Cutout
      const x = item.x;
      const y = item.y;
      const bw = item.width;
      const bh = item.height;

      ctx.fillStyle = options.highContrast ? '#141824' : '#0c0f17';
      ctx.fillRect(x, y, bw, bh);
      ctx.strokeStyle = '#475569';
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(x, y, bw, bh);
      ctx.setLineDash([]);
    } else {
      // Standard Chamfered / Rounded Tech Box
      const x = item.x;
      const y = item.y;
      const bw = item.width;
      const bh = item.height;

      ctx.fillRect(x, y, bw, bh);
      ctx.strokeRect(x, y, bw, bh);
    }

    ctx.restore();
  });
}

/**
 * Generates an AIDA64 Sensor Coordinates Map
 */
export function generateAida64CoordinateSheet(
  screen: { width: number; height: number },
  items: Aida64PanelItem[]
) {
  const header = `AIDA64 SENSORPANEL COORDINATES EXPORT
Display Resolution: ${screen.width} x ${screen.height} px
Total Mapped Elements: ${items.length}
Generated by Gina AI Factory AIDA64 Layout Compiler
========================================================================================\n\n`;

  const rows = items.map((item, idx) => {
    return `[#${String(idx + 1).padStart(2, '0')}] ${item.name.padEnd(28)} | Type: ${item.type.padEnd(14)} | Pos: (${String(item.x).padStart(4)}, ${String(item.y).padStart(4)}) | Size: ${String(item.width).padStart(4)}x${String(item.height).padStart(4)} px | Sensor: ${item.sensorType}`;
  }).join('\n');

  const jsonExport = {
    version: '1.5.0',
    screen: {
      width: screen.width,
      height: screen.height
    },
    totalElements: items.length,
    elements: items.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      shapeType: item.shapeType,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      sensorBinding: item.sensorType,
      sampleValue: item.testValue,
      unit: item.unit,
      themeColor: item.color
    }))
  };

  return {
    txt: header + rows,
    json: JSON.stringify(jsonExport, null, 2)
  };
}

/**
 * High-definition photorealistic canvas chassis artwork generator & layout compositor.
 * Renders the exact dials, CNC bezels, conduits, and dark glass cavities at the EXACT pixel coordinates.
 */
export function renderLayoutChassisArtworkCanvas(
  canvas: HTMLCanvasElement,
  screen: { width: number; height: number },
  items: Aida64PanelItem[],
  themeId: string = 'cyberpunk_red',
  options: {
    baseImage?: CanvasImageSource | null;
    dimBaseImage?: number; // 0 to 1, default 0.85
    showConduits?: boolean;
    showHexBolts?: boolean;
    showTickMarks?: boolean;
    highResScale?: number;
  } = {}
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = screen.width;
  const h = screen.height;
  canvas.width = w;
  canvas.height = h;

  const theme = AIDA64_THEMES.find(t => t.id === themeId) || AIDA64_THEMES[0];
  const primaryColor = theme.primaryColor || '#ef4444';
  const secondaryColor = theme.secondaryColor || '#f97316';
  const accentColor = theme.accentColor || '#38bdf8';

  // 1. Base Layer: AI Background Image OR Procedural High-Tech Titanium/Carbon Backplate
  if (options.baseImage) {
    ctx.drawImage(options.baseImage, 0, 0, w, h);
    // Subtle darkening vignette so UI sockets pop
    const dim = options.dimBaseImage !== undefined ? options.dimBaseImage : 0.4;
    if (dim > 0) {
      ctx.fillStyle = `rgba(5, 7, 13, ${dim})`;
      ctx.fillRect(0, 0, w, h);
    }
  } else {
    // Deep slate-carbon brushed background
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#06080e');
    bgGrad.addColorStop(0.5, '#0b0f19');
    bgGrad.addColorStop(1, '#05070d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Carbon-fiber / hex micro-mesh pattern
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 1;
    const step = 16;
    for (let x = 0; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + h, h);
      ctx.stroke();
    }
    for (let x = w; x > -h; x -= step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x - h, h);
      ctx.stroke();
    }
    ctx.restore();

    // Ambient radial lighting blooms behind key dial clusters
    const dials = items.filter(i => i.type === 'dial' || i.shapeType === 'dial_circle' || i.shapeType === 'dial_with_boxes');
    dials.forEach(d => {
      const cx = d.x + d.width / 2;
      const cy = d.y + d.height / 2;
      const r = Math.max(d.width, d.height) * 0.9;
      const radialGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      radialGlow.addColorStop(0, `${primaryColor}22`);
      radialGlow.addColorStop(0.6, `${secondaryColor}08`);
      radialGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = radialGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Outer Chassis Frame Bezel with chamfered corners
    ctx.save();
    const framePad = 12;
    const chamfer = 24;
    ctx.beginPath();
    ctx.moveTo(framePad + chamfer, framePad);
    ctx.lineTo(w - framePad - chamfer, framePad);
    ctx.lineTo(w - framePad, framePad + chamfer);
    ctx.lineTo(w - framePad, h - framePad - chamfer);
    ctx.lineTo(w - framePad - chamfer, h - framePad);
    ctx.lineTo(framePad + chamfer, h - framePad);
    ctx.lineTo(framePad, h - framePad - chamfer);
    ctx.lineTo(framePad, framePad + chamfer);
    ctx.closePath();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Inner subtle glow border
    ctx.strokeStyle = `${primaryColor}44`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  // 2. High-Tech Neon Cooling Conduits connecting items across the backplate
  if (options.showConduits !== false && items.length > 1) {
    ctx.save();
    ctx.strokeStyle = `${primaryColor}66`;
    ctx.shadowColor = primaryColor;
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2;

    const dialItems = items.filter(i => i.type === 'dial' || i.shapeType === 'dial_circle' || i.shapeType === 'dial_with_boxes');
    if (dialItems.length >= 2) {
      // Connect dials with a sleek horizontal / stepped conduit
      const d1 = dialItems[0];
      const d2 = dialItems[1];
      const c1x = d1.x + d1.width / 2;
      const c1y = d1.y + d1.height / 2;
      const c2x = d2.x + d2.width / 2;
      const c2y = d2.y + d2.height / 2;

      ctx.beginPath();
      ctx.moveTo(c1x + d1.width / 2 + 8, c1y);
      ctx.lineTo(w / 2 - 40, c1y);
      ctx.lineTo(w / 2, c1y - 20);
      ctx.lineTo(w / 2 + 40, c2y);
      ctx.lineTo(c2x - d2.width / 2 - 8, c2y);
      ctx.stroke();

      // Mini conduit node brackets
      ctx.fillStyle = primaryColor;
      ctx.beginPath();
      ctx.arc(w / 2, c1y - 20, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 3. Render Each Item at Exact Coordinates (Dials, Value Boxes, Pods, Wings)
  items.forEach((item) => {
    ctx.save();

    const isCircle = item.type === 'dial' || item.shapeType === 'dial_circle' || item.shapeType === 'dial_with_boxes';
    const isTempWing = item.shapeType === 'temp_wing_angled';
    const isBanner = item.shapeType === 'voltage_wattage_banner';
    const isRam = item.shapeType === 'ram_stick_module';
    const isArt = item.shapeType === 'avatar_stage_cutout';
    const itemThemeColor = item.color || primaryColor;

    if (isCircle) {
      // EXACT CIRCULAR DIAL HOUSING & RECESSED BEZEL
      const radius = Math.min(item.width, item.height) / 2;
      const cx = item.x + item.width / 2;
      const cy = item.y + item.height / 2;

      // Outer Glow Halo
      ctx.shadowColor = itemThemeColor;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `${itemThemeColor}88`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Outer CNC Machined Bezel Ring (Titanium / Graphite Gradient)
      const bezelThickness = Math.max(8, radius * 0.12);
      const bezelGrad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
      bezelGrad.addColorStop(0, '#334155');
      bezelGrad.addColorStop(0.3, '#1e293b');
      bezelGrad.addColorStop(0.7, '#0f172a');
      bezelGrad.addColorStop(1, '#1e293b');

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = bezelGrad;
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Laser Index Tick Marks around Bezel
      if (options.showTickMarks !== false) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.5;
        const tickCount = 24;
        for (let t = 0; t < tickCount; t++) {
          const angle = (t / tickCount) * Math.PI * 2;
          const isMajor = t % 6 === 0;
          const tickLen = isMajor ? bezelThickness * 0.7 : bezelThickness * 0.4;
          const rOuter = radius - 2;
          const rInner = rOuter - tickLen;

          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * rInner, cy + Math.sin(angle) * rInner);
          ctx.lineTo(cx + Math.cos(angle) * rOuter, cy + Math.sin(angle) * rOuter);
          ctx.stroke();
        }
      }

      // Flush CNC Hex Screws on Bezel (45, 135, 225, 315 deg)
      if (options.showHexBolts !== false) {
        const screwAngles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
        const screwR = radius - bezelThickness * 0.5;
        screwAngles.forEach(ang => {
          const sx = cx + Math.cos(ang) * screwR;
          const sy = cy + Math.sin(ang) * screwR;
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Hex slot
          ctx.fillStyle = '#cbd5e1';
          ctx.beginPath();
          ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Inner Recessed Optical Glass Cavity (Pitch Black, ZERO Mock Text)
      const innerR = radius - bezelThickness;
      const innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, innerR);
      innerGrad.addColorStop(0, '#030407');
      innerGrad.addColorStop(0.85, '#06080e');
      innerGrad.addColorStop(1, '#0a0d16');

      ctx.beginPath();
      ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
      ctx.fillStyle = innerGrad;
      ctx.fill();

      // Recessed Inner Shadow Lip & Neon Guide Track
      ctx.strokeStyle = '#020305';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.strokeStyle = `${itemThemeColor}44`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Subtle Center Alignment Reticle
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 16, cy);
      ctx.lineTo(cx + 16, cy);
      ctx.moveTo(cx, cy - 16);
      ctx.lineTo(cx, cy + 16);
      ctx.stroke();

    } else if (isTempWing) {
      // Aerodynamic Angled Thermal Wing Pod
      const x = item.x;
      const y = item.y;
      const bw = item.width;
      const bh = item.height;

      ctx.beginPath();
      ctx.moveTo(x + 16, y);
      ctx.lineTo(x + bw, y);
      ctx.lineTo(x + bw - 20, y + bh);
      ctx.lineTo(x, y + bh);
      ctx.closePath();

      ctx.fillStyle = '#0a0e17';
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Neon Accent Stripe
      ctx.beginPath();
      ctx.moveTo(x + 18, y + 3);
      ctx.lineTo(x + bw - 3, y + 3);
      ctx.strokeStyle = itemThemeColor;
      ctx.lineWidth = 2;
      ctx.stroke();

    } else if (isBanner) {
      // Chamfered Voltage / Power Banner
      const x = item.x;
      const y = item.y;
      const bw = item.width;
      const bh = item.height;
      const c = 10;

      ctx.beginPath();
      ctx.moveTo(x + c, y);
      ctx.lineTo(x + bw - c, y);
      ctx.lineTo(x + bw, y + c);
      ctx.lineTo(x + bw, y + bh - c);
      ctx.lineTo(x + bw - c, y + bh);
      ctx.lineTo(x + c, y + bh);
      ctx.lineTo(x, y + bh - c);
      ctx.lineTo(x, y + c);
      ctx.closePath();

      ctx.fillStyle = '#080c14';
      ctx.fill();
      ctx.strokeStyle = `${itemThemeColor}aa`;
      ctx.lineWidth = 2;
      ctx.stroke();

    } else {
      // EXACT VALUE BOX GEOMETRIC CAVITY (Chamfer, Hexagon, Cut Corner, Pill, Bracket, Rectangle)
      const x = item.x;
      const y = item.y;
      const bw = item.width;
      const bh = item.height;
      const shape = item.boxShape || (item.shapeType && item.shapeType.replace('box_', '')) || 'chamfer';

      ctx.beginPath();
      if (shape === 'chamfer') {
        const c = Math.min(10, Math.min(bw, bh) * 0.25);
        ctx.moveTo(x + c, y);
        ctx.lineTo(x + bw - c, y);
        ctx.lineTo(x + bw, y + c);
        ctx.lineTo(x + bw, y + bh - c);
        ctx.lineTo(x + bw - c, y + bh);
        ctx.lineTo(x + c, y + bh);
        ctx.lineTo(x, y + bh - c);
        ctx.lineTo(x, y + c);
        ctx.closePath();
      } else if (shape === 'hexagon') {
        const pointW = Math.min(14, bw * 0.2);
        ctx.moveTo(x + pointW, y);
        ctx.lineTo(x + bw - pointW, y);
        ctx.lineTo(x + bw, y + bh / 2);
        ctx.lineTo(x + bw - pointW, y + bh);
        ctx.lineTo(x + pointW, y + bh);
        ctx.lineTo(x, y + bh / 2);
        ctx.closePath();
      } else if (shape === 'cut_corner') {
        const c = Math.min(12, Math.min(bw, bh) * 0.3);
        ctx.moveTo(x, y);
        ctx.lineTo(x + bw - c, y);
        ctx.lineTo(x + bw, y + c);
        ctx.lineTo(x + bw, y + bh);
        ctx.lineTo(x + c, y + bh);
        ctx.lineTo(x, y + bh - c);
        ctx.closePath();
      } else if (shape === 'pill') {
        const r = bh / 2;
        ctx.arc(x + r, y + r, r, Math.PI * 0.5, Math.PI * 1.5);
        ctx.arc(x + bw - r, y + r, r, Math.PI * 1.5, Math.PI * 0.5);
        ctx.closePath();
      } else if (shape === 'bracket') {
        ctx.rect(x, y, bw, bh);
      } else {
        // Rectangle with subtle 4px rounded corner
        const r = 4;
        ctx.roundRect ? ctx.roundRect(x, y, bw, bh, r) : ctx.rect(x, y, bw, bh);
      }

      // Outer Cavity Shadow & Bezel Fill
      ctx.fillStyle = '#030509';
      ctx.fill();

      // Precision CNC border with subtle neon accent
      ctx.strokeStyle = `${itemThemeColor}cc`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Recessed dark glass gradient
      const boxGrad = ctx.createLinearGradient(x, y, x, y + bh);
      boxGrad.addColorStop(0, 'rgba(255, 255, 255, 0.04)');
      boxGrad.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
      ctx.fillStyle = boxGrad;
      ctx.fill();

      // If HUD bracket, draw corner reticles
      if (shape === 'bracket') {
        const bl = Math.min(8, Math.min(bw, bh) * 0.3);
        ctx.strokeStyle = itemThemeColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Top-left
        ctx.moveTo(x, y + bl);
        ctx.lineTo(x, y);
        ctx.lineTo(x + bl, y);
        // Top-right
        ctx.moveTo(x + bw - bl, y);
        ctx.lineTo(x + bw, y);
        ctx.lineTo(x + bw, y + bl);
        // Bottom-right
        ctx.moveTo(x + bw, y + bh - bl);
        ctx.lineTo(x + bw, y + bh);
        ctx.lineTo(x + bw - bl, y + bh);
        // Bottom-left
        ctx.moveTo(x + bl, y + bh);
        ctx.lineTo(x, y + bh);
        ctx.lineTo(x, y + bh - bl);
        ctx.stroke();
      }
    }

    ctx.restore();
  });
}

/**
 * Composites the active layout dials and value boxes onto an existing AI image
 * and returns the combined DataURL / PNG.
 */
export function compositeLayoutOntoImage(
  baseImageUrl: string,
  screen: { width: number; height: number },
  items: Aida64PanelItem[],
  themeId: string = 'cyberpunk_red',
  options: {
    overlayStrength?: number;
    dimBaseImage?: number;
    showConduits?: boolean;
    showHexBolts?: boolean;
    showTickMarks?: boolean;
  } = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      renderLayoutChassisArtworkCanvas(canvas, screen, items, themeId, {
        baseImage: img,
        dimBaseImage: options.dimBaseImage !== undefined ? options.dimBaseImage : 0.35,
        showConduits: options.showConduits !== false,
        showHexBolts: options.showHexBolts !== false,
        showTickMarks: options.showTickMarks !== false
      });
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (err) => reject(new Error('Failed to load base image for layout fusion: ' + err));
    img.src = baseImageUrl;
  });
}

