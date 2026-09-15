import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Paintbrush, Eraser, RotateCcw, Undo2, Check, AlertCircle, Sparkles } from 'lucide-react';

export interface MaskData {
  dataUrl: string;
  blob: Blob;
  hasMask: boolean;
  coveragePercent: number;
}

interface GinaInpaintCanvasProps {
  imageUrl: string;
  imageName?: string;
  onMaskChange: (mask: MaskData | null) => void;
  disabled?: boolean;
}

export const GinaInpaintCanvas: React.FC<GinaInpaintCanvasProps> = ({
  imageUrl,
  imageName = 'Reference Image',
  onMaskChange,
  disabled = false
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  const [brushSize, setBrushSize] = useState<number>(36);
  const [overlayColor, setOverlayColor] = useState<'purple' | 'red' | 'cyan'>('purple');
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasMask, setHasMask] = useState(false);
  const [coveragePercent, setCoveragePercent] = useState<number>(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [naturalDims, setNaturalDims] = useState<{ w: number; h: number }>({ w: 1024, h: 1024 });

  // History stack for Undo
  const historyRef = useRef<ImageData[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  // Color mappings for visual mask overlay
  const overlayColors = {
    purple: { stroke: 'rgba(217, 70, 239, 0.55)', label: 'Magenta' },
    red: { stroke: 'rgba(239, 68, 68, 0.55)', label: 'Red' },
    cyan: { stroke: 'rgba(6, 182, 212, 0.55)', label: 'Cyan' }
  };

  // Setup canvas resolution to match image natural resolution
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const w = img.naturalWidth || 1024;
    const h = img.naturalHeight || 1024;
    setNaturalDims({ w, h });
    setImageLoaded(true);

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, w, h);
        historyRef.current = [];
        setCanUndo(false);
        setHasMask(false);
        setCoveragePercent(0);
        onMaskChange(null);
      }
    }
  };

  // Convert mouse/touch event coordinates to Canvas natural coordinate space
  const getCanvasCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const saveHistoryState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    try {
      const state = ctx.getImageData(0, 0, canvas.width, canvas.height);
      historyRef.current.push(state);
      if (historyRef.current.length > 12) {
        historyRef.current.shift();
      }
      setCanUndo(true);
    } catch {
      // Ignore security errors on cross-origin images
    }
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || !historyRef.current.length) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const previousState = historyRef.current.pop();
    if (previousState) {
      ctx.putImageData(previousState, 0, 0);
      setCanUndo(historyRef.current.length > 0);
      exportMask();
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    saveHistoryState();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasMask(false);
    setCoveragePercent(0);
    onMaskChange(null);
  };

  const handleInvert = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    saveHistoryState();
    const w = canvas.width;
    const h = canvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha > 20) {
        // Was masked -> make transparent
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 0;
      } else {
        // Was transparent -> make masked
        data[i] = 217;
        data[i + 1] = 70;
        data[i + 2] = 239;
        data[i + 3] = 140;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    exportMask();
  };

  // Export black & white binary mask (white = inpaint area, black = preserved area)
  const exportMask = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    let maskedPixels = 0;
    const totalPixels = w * h;

    // Create offscreen canvas for ComfyUI binary mask
    const offscreen = document.createElement('canvas');
    offscreen.width = w;
    offscreen.height = h;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    const maskImgData = offCtx.createImageData(w, h);
    const maskPixels = maskImgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha > 15) {
        maskedPixels++;
        // White for inpaint region
        maskPixels[i] = 255;
        maskPixels[i + 1] = 255;
        maskPixels[i + 2] = 255;
        maskPixels[i + 3] = 255;
      } else {
        // Black for unmasked/frozen region
        maskPixels[i] = 0;
        maskPixels[i + 1] = 0;
        maskPixels[i + 2] = 0;
        maskPixels[i + 3] = 255;
      }
    }

    offCtx.putImageData(maskImgData, 0, 0);

    const coverage = (maskedPixels / totalPixels) * 100;
    setCoveragePercent(Math.round(coverage * 10) / 10);
    setHasMask(maskedPixels > 50);

    if (maskedPixels > 50) {
      offscreen.toBlob((blob) => {
        if (blob) {
          const dataUrl = offscreen.toDataURL('image/png');
          onMaskChange({
            dataUrl,
            blob,
            hasMask: true,
            coveragePercent: Math.round(coverage * 10) / 10
          });
        }
      }, 'image/png');
    } else {
      onMaskChange(null);
    }
  }, [onMaskChange]);

  // Pointer drawing handlers
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);
    saveHistoryState();
    setIsDrawing(true);

    const pt = getCanvasCoordinates(e);
    lastPointRef.current = pt;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = overlayColors[overlayColor].stroke;
    }

    // Single point dot
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pt = getCanvasCoordinates(e);
    const lastPt = lastPointRef.current || pt;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = overlayColors[overlayColor].stroke;
    }

    ctx.beginPath();
    ctx.moveTo(lastPt.x, lastPt.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    ctx.restore();

    lastPointRef.current = pt;
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas && e.pointerId !== undefined) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // Pointer might already be released
      }
    }
    setIsDrawing(false);
    lastPointRef.current = null;
    exportMask();
  };

  return (
    <div className="space-y-3 bg-[#0a0e17] border border-[#232a3d] rounded-xl p-3">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1f2638] pb-2.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTool('brush')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
              tool === 'brush'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'bg-[#121826] text-zinc-400 hover:text-zinc-200 border border-[#232b40]'
            }`}
            title="Brush: paint over regions you want to recolor or regenerate"
          >
            <Paintbrush className="w-3.5 h-3.5" />
            <span>Brush</span>
          </button>

          <button
            type="button"
            onClick={() => setTool('eraser')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
              tool === 'eraser'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'bg-[#121826] text-zinc-400 hover:text-zinc-200 border border-[#232b40]'
            }`}
            title="Eraser: remove mask from regions you want to freeze completely"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Eraser</span>
          </button>

          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-all ${
              canUndo
                ? 'bg-[#121826] text-zinc-300 hover:text-white border-[#232b40]'
                : 'bg-[#0e121c] text-zinc-600 border-[#192030] cursor-not-allowed'
            }`}
            title="Undo last stroke"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="px-2.5 py-1.5 rounded-lg border border-[#232b40] bg-[#121826] text-zinc-400 hover:text-rose-400 hover:border-rose-500/40 text-xs flex items-center gap-1 transition-all"
            title="Clear the entire mask"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>

          <button
            type="button"
            onClick={handleInvert}
            className="px-2.5 py-1.5 rounded-lg border border-[#232b40] bg-[#121826] text-zinc-400 hover:text-cyan-400 hover:border-cyan-500/40 text-xs flex items-center gap-1 transition-all"
            title="Invert mask: freeze current selection and paint everything else"
          >
            <span>Invert</span>
          </button>
        </div>

        {/* Mask Status Badge */}
        <div className="flex items-center gap-2">
          {hasMask ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
              <Check className="w-3 h-3 text-purple-400" />
              Mask Active: {coveragePercent}%
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono text-zinc-400 bg-zinc-900/60 border border-zinc-800">
              <AlertCircle className="w-3 h-3 text-zinc-500" />
              Draw over dog to mask
            </span>
          )}
        </div>
      </div>

      {/* Secondary Controls: Brush Size & Mask Overlay Color */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-[#0e1320] px-3 py-2 rounded-lg border border-[#1b2234]">
        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
          <span className="text-zinc-400 font-mono text-[11px] uppercase tracking-wider shrink-0">
            Brush Size: <span className="text-white font-bold">{brushSize}px</span>
          </span>
          <input
            type="range"
            min={8}
            max={120}
            step={2}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
          {/* Live Brush Size Indicator Circle */}
          <div
            className="rounded-full border border-purple-400 bg-purple-500/40 shrink-0"
            style={{ width: Math.min(brushSize, 32), height: Math.min(brushSize, 32) }}
            title={`Brush diameter: ${brushSize}px`}
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-zinc-500 text-[10px] font-mono uppercase">Color:</span>
          {(['purple', 'red', 'cyan'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setOverlayColor(c)}
              className={`w-4 h-4 rounded-full border transition-all ${
                c === 'purple' ? 'bg-purple-500' : c === 'red' ? 'bg-red-500' : 'bg-cyan-500'
              } ${overlayColor === c ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'}`}
              title={`Overlay color: ${overlayColors[c].label}`}
            />
          ))}
        </div>
      </div>

      {/* Main Canvas + Reference Image Viewport */}
      <div
        ref={containerRef}
        className="relative mx-auto max-h-[500px] w-full flex items-center justify-center rounded-xl overflow-hidden bg-black/90 border border-[#2a334a] select-none touch-none"
        style={{ minHeight: '280px' }}
      >
        {/* Underlying Reference Image */}
        <img
          ref={imageRef}
          src={imageUrl}
          alt={imageName}
          onLoad={handleImageLoad}
          crossOrigin="anonymous"
          className="max-h-[500px] w-auto max-w-full object-contain pointer-events-none block"
        />

        {/* Interactive Drawing Canvas Overlay */}
        <canvas
          ref={canvasRef}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          className={`absolute inset-0 w-full h-full object-contain ${
            tool === 'brush' ? 'cursor-crosshair' : 'cursor-cell'
          }`}
          style={{ touchAction: 'none' }}
        />

        {/* Empty state or loading */}
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-zinc-400 text-xs">
            Loading reference image canvas…
          </div>
        )}
      </div>

      {/* Explanatory Footnote */}
      <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono px-1">
        <span className="flex items-center gap-1 text-purple-300">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          Painted areas will regenerate to white fur. Unpainted regions remain 100% frozen bit-for-bit.
        </span>
        <span className="text-zinc-500">
          Resolution: {naturalDims.w}×{naturalDims.h}
        </span>
      </div>
    </div>
  );
};
