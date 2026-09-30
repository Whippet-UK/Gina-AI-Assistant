import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Sliders, Pipette } from 'lucide-react';

export default function BackgroundRemover() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [targetColor, setTargetColor] = useState<{ r: number; g: number; b: number }>({ r: 255, g: 255, b: 255 });
  const [tolerance, setTolerance] = useState<number>(30);
  const [feather, setFeather] = useState<number>(10);
  const [isPicking, setIsPicking] = useState<boolean>(false);

  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Handle image upload layout
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        processImage(img, targetColor, tolerance, feather);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Process image pixels for real RGBA transparency
  const processImage = (
    img: HTMLImageElement,
    color: { r: number; g: number; b: number },
    tol: number,
    fth: number
  ) => {
    const canvas = outputCanvasRef.current;
    const srcCanvas = sourceCanvasRef.current;
    if (!canvas || !srcCanvas) return;

    const ctx = canvas.getContext('2d');
    const srcCtx = srcCanvas.getContext('2d');
    if (!ctx || !srcCtx) return;

    // Set canvas dimension bounds
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    srcCanvas.width = img.naturalWidth;
    srcCanvas.height = img.naturalHeight;

    // Draw reference image
    srcCtx.drawImage(img, 0, 0);
    ctx.drawImage(img, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    // Calculate alpha transparency boundaries per pixel
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Color distance formula
      const distance = Math.sqrt(
        Math.pow(r - color.r, 2) +
        Math.pow(g - color.g, 2) +
        Math.pow(b - color.b, 2)
      );

      if (distance < tol) {
        data[i + 3] = 0; // Pure alpha transparency
      } else if (distance < tol + fth) {
        // Linear interpolation for smooth edge feathering
        const factor = (distance - tol) / fth;
        data[i + 3] = Math.floor(factor * 255);
      }
    }

    ctx.putImageData(imgData, 0, 0);
  };

  // Re-run filter pipelines when state rules shift
  useEffect(() => {
    if (image) {
      processImage(image, targetColor, tolerance, feather);
    }
  }, [targetColor, tolerance, feather, image]);

  // Handle color sampler eye-dropper click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPicking || !sourceCanvasRef.current) return;
    const canvas = sourceCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height);

    const pixel = ctx.getImageData(x, y, 1, 1).data;
    setTargetColor({ r: pixel[0], g: pixel[1], b: pixel[2] });
    setIsPicking(false);
  };

  // Trigger high-res transparent PNG file save
  const downloadPng = () => {
    if (!outputCanvasRef.current) return;
    const link = document.createElement('a');
    link.download = 'transparent-export.png';
    link.href = outputCanvasRef.current.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="p-6 bg-slate-900 text-white rounded-xl shadow-lg max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Sliders className="w-5 h-5 text-indigo-400" /> Background Transparency Engine
        </h2>
        <label className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg cursor-pointer transition text-sm font-medium">
          <Upload className="w-4 h-4" /> Upload Source Image
          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        </label>
      </div>

      {image ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Control Station */}
          <div className="space-y-4 bg-slate-950 p-4 rounded-lg border border-slate-800">
            <h3 className="font-semibold text-sm tracking-wide uppercase text-slate-400">Settings</h3>
            
            <div className="space-y-2">
              <button 
                onClick={() => setIsPicking(!isPicking)}
                className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition ${isPicking ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 hover:bg-slate-700'}`}
              >
                <Pipette className="w-4 h-4" /> {isPicking ? 'Click Image to Sample' : 'Sample Background Color'}
              </button>
              <div className="flex items-center gap-3 mt-1 justify-between text-xs text-slate-400">
                <span>Selected:</span>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded border border-slate-700" style={{ backgroundColor: `rgb(${targetColor.r},${targetColor.g},${targetColor.b})` }} />
                  <code>rgb({targetColor.r}, {targetColor.g}, {targetColor.b})</code>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400 flex justify-between">
                <span>Color Tolerance</span>
                <span>{tolerance}</span>
              </label>
              <input type="range" min="1" max="200" value={tolerance} onChange={(e) => setTolerance(Number(e.target.value))} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400 flex justify-between">
                <span>Edge Feathering</span>
                <span>{feather}</span>
              </label>
              <input type="range" min="0" max="100" value={feather} onChange={(e) => setFeather(Number(e.target.value))} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
            </div>

            <button onClick={downloadPng} className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 py-2.5 px-4 rounded-lg font-medium transition mt-4 text-sm">
              <Download className="w-4 h-4" /> Download Alpha PNG
            </button>
          </div>

          {/* Hidden Canvas References & Sandbox Viewports */}
          <div className="md:col-span-2 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <span className="text-xs text-slate-400 font-medium">Source Selector</span>
                <div className="relative border border-slate-800 rounded-lg bg-slate-950 overflow-hidden flex items-center justify-center p-2 min-h-[220px]">
                  <canvas ref={sourceCanvasRef} onClick={handleCanvasClick} className={`max-w-full max-h-[300px] object-contain ${isPicking ? 'cursor-crosshair ring-2 ring-amber-400' : ''}`} />
                </div>
              </div>
              <div className="space-y-1.5">
                <span className="text-xs text-slate-400 font-medium">Alpha Output Preview</span>
                <div className="relative border border-slate-800 rounded-lg overflow-hidden flex items-center justify-center p-2 min-h-[220px]" style={{ backgroundImage: 'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)', backgroundSize: '16px 16px', backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px', backgroundColor: '#0f172a' }}>
                  <canvas ref={outputCanvasRef} className="max-w-full max-h-[300px] object-contain" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-slate-800 rounded-lg p-12 text-center text-slate-500 text-sm">
          Upload an image using the button above to begin stripping background colors.
        </div>
      )}
    </div>
  );
}
