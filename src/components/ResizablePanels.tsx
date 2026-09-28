import React, { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_SPLIT = 'gina.ui.chatSplitPct';
const STORAGE_HEIGHT = 'gina.ui.workspaceHeightPx';
const STORAGE_BORDER = 'gina.ui.panelBorderPx';
const STORAGE_RADIUS = 'gina.ui.panelRadiusPx';

function readNum(key: string, fallback: number, min: number, max: number): number {
  try {
    const v = Number(localStorage.getItem(key));
    if (Number.isFinite(v)) return Math.min(max, Math.max(min, v));
  } catch {}
  return fallback;
}

/** Apply shared panel chrome vars so every tab can pick them up. */
export function applyGinaPanelChrome(borderPx?: number, radiusPx?: number) {
  const b = borderPx ?? readNum(STORAGE_BORDER, 1, 0, 6);
  const r = radiusPx ?? readNum(STORAGE_RADIUS, 8, 0, 24);
  try {
    document.documentElement.style.setProperty('--gina-panel-border', `${b}px`);
    document.documentElement.style.setProperty('--gina-panel-radius', `${r}px`);
    localStorage.setItem(STORAGE_BORDER, String(b));
    localStorage.setItem(STORAGE_RADIUS, String(r));
  } catch {}
}

export function useGinaPanelChrome() {
  const [borderPx, setBorderPx] = useState(() => readNum(STORAGE_BORDER, 1, 0, 6));
  const [radiusPx, setRadiusPx] = useState(() => readNum(STORAGE_RADIUS, 8, 0, 24));

  useEffect(() => {
    applyGinaPanelChrome(borderPx, radiusPx);
  }, [borderPx, radiusPx]);

  return { borderPx, setBorderPx, radiusPx, setRadiusPx };
}

/** Tailwind-friendly class + inline style for shared grey panel frames. */
export const ginaPanelStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
  borderWidth: 'var(--gina-panel-border, 1px)',
  borderStyle: 'solid',
  borderColor: 'rgb(30 41 59)', // slate-800
  borderRadius: 'var(--gina-panel-radius, 0.5rem)',
  ...extra
});

type SplitProps = {
  left: React.ReactNode;
  right: React.ReactNode;
  /** Default left width % (chat / response). Video-preview-like: ~58–65 */
  defaultLeftPct?: number;
  minLeftPct?: number;
  maxLeftPct?: number;
  className?: string;
  /** Optional fixed/min height; drag bottom edge to resize */
  resizableHeight?: boolean;
  defaultHeightPx?: number;
  minHeightPx?: number;
  maxHeightPx?: number;
};

/**
 * Horizontal split: large primary pane (left) + secondary pane (right),
 * with a drag handle. Optional bottom-edge height drag.
 * Sizes persist in localStorage.
 */
export const ResizableSplit: React.FC<SplitProps> = ({
  left,
  right,
  defaultLeftPct = 62,
  minLeftPct = 35,
  maxLeftPct = 80,
  className = '',
  resizableHeight = true,
  defaultHeightPx = 560,
  minHeightPx = 320,
  maxHeightPx = 1200
}) => {
  const [leftPct, setLeftPct] = useState(() => readNum(STORAGE_SPLIT, defaultLeftPct, minLeftPct, maxLeftPct));
  const [heightPx, setHeightPx] = useState(() => readNum(STORAGE_HEIGHT, defaultHeightPx, minHeightPx, maxHeightPx));
  const shellRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<'x' | 'y' | null>(null);

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragging.current || !shellRef.current) return;
      const rect = shellRef.current.getBoundingClientRect();
      if (dragging.current === 'x') {
        const pct = ((e.clientX - rect.left) / rect.width) * 100;
        const next = Math.min(maxLeftPct, Math.max(minLeftPct, pct));
        setLeftPct(next);
        try {
          localStorage.setItem(STORAGE_SPLIT, String(Math.round(next * 10) / 10));
        } catch {}
      } else if (dragging.current === 'y') {
        const h = e.clientY - rect.top;
        const next = Math.min(maxHeightPx, Math.max(minHeightPx, h));
        setHeightPx(next);
        try {
          localStorage.setItem(STORAGE_HEIGHT, String(Math.round(next)));
        } catch {}
      }
    },
    [maxLeftPct, minLeftPct, maxHeightPx, minHeightPx]
  );

  const onPointerUp = useCallback(() => {
    dragging.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  const startX = (e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = 'x';
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };
  const startY = (e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = 'y';
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <div
      ref={shellRef}
      className={`relative flex min-w-0 flex-col ${className}`}
      style={resizableHeight ? { height: heightPx, minHeight: minHeightPx } : undefined}
    >
      <div className="flex min-h-0 flex-1 min-w-0">
        <div className="min-h-0 min-w-0 overflow-hidden flex flex-col" style={{ width: `${leftPct}%`, flex: 'none' }}>
          {left}
        </div>
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize chat and preview"
          onPointerDown={startX}
          className="group relative z-10 w-2 shrink-0 cursor-col-resize bg-slate-900/80 hover:bg-emerald-500/30 active:bg-emerald-500/50 transition-colors"
          title="Drag to resize"
        >
          <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-slate-700 group-hover:bg-emerald-400/60" />
        </div>
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden flex flex-col">{right}</div>
      </div>
      {resizableHeight && (
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize workspace height"
          onPointerDown={startY}
          className="group relative h-2 shrink-0 cursor-row-resize bg-slate-900/80 hover:bg-emerald-500/30 active:bg-emerald-500/50 transition-colors"
          title="Drag to change height"
        >
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-slate-700 group-hover:bg-emerald-400/60" />
        </div>
      )}
    </div>
  );
};

/** Compact chrome controls for border / radius (shared across tabs). */
export const PanelChromeControls: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { borderPx, setBorderPx, radiusPx, setRadiusPx } = useGinaPanelChrome();
  return (
    <div className={`flex flex-wrap items-center gap-3 text-[9px] font-mono text-slate-500 ${className}`}>
      <label className="flex items-center gap-1.5">
        <span className="uppercase tracking-wider text-slate-600">Border</span>
        <input
          type="range"
          min={0}
          max={6}
          step={1}
          value={borderPx}
          onChange={(e) => setBorderPx(Number(e.target.value))}
          className="w-16 accent-emerald-500"
        />
        <span className="text-slate-400 w-4">{borderPx}</span>
      </label>
      <label className="flex items-center gap-1.5">
        <span className="uppercase tracking-wider text-slate-600">Radius</span>
        <input
          type="range"
          min={0}
          max={20}
          step={2}
          value={radiusPx}
          onChange={(e) => setRadiusPx(Number(e.target.value))}
          className="w-16 accent-emerald-500"
        />
        <span className="text-slate-400 w-5">{radiusPx}</span>
      </label>
    </div>
  );
};

const STORAGE_OUTER_W = 'gina.ui.outerWidthPct';
const STORAGE_OUTER_H = 'gina.ui.outerMinHeightPx';

/**
 * Global outer frame for every suite: drag right edge = width, bottom = height,
 * Border/Radius sliders change the shared chrome for all panels inside.
 */
export const OuterWorkspaceFrame: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = ''
}) => {
  const { borderPx, setBorderPx, radiusPx, setRadiusPx } = useGinaPanelChrome();
  const [widthPct, setWidthPct] = useState(() => readNum(STORAGE_OUTER_W, 100, 50, 100));
  const [minHeightPx, setMinHeightPx] = useState(() => readNum(STORAGE_OUTER_H, 0, 0, 2000));
  const shellRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<'w' | 'h' | null>(null);

  const onMove = useCallback((e: PointerEvent) => {
    if (!dragging.current || !shellRef.current) return;
    const parent = shellRef.current.parentElement;
    if (!parent) return;
    const prect = parent.getBoundingClientRect();
    if (dragging.current === 'w') {
      const pct = ((e.clientX - prect.left) / prect.width) * 100;
      const next = Math.min(100, Math.max(50, pct));
      setWidthPct(next);
      try { localStorage.setItem(STORAGE_OUTER_W, String(Math.round(next * 10) / 10)); } catch {}
    } else if (dragging.current === 'h') {
      const rect = shellRef.current.getBoundingClientRect();
      const h = e.clientY - rect.top;
      const next = Math.min(2000, Math.max(280, h));
      setMinHeightPx(next);
      try { localStorage.setItem(STORAGE_OUTER_H, String(Math.round(next))); } catch {}
    }
  }, []);

  const onUp = useCallback(() => {
    dragging.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [onMove, onUp]);

  return (
    <div className={`relative mx-auto min-w-0 ${className}`} style={{ width: `${widthPct}%`, maxWidth: '100%' }}>
      <div
        ref={shellRef}
        className="relative bg-slate-950/60 shadow-2xl min-w-0 overflow-visible"
        style={{
          ...ginaPanelStyle({ borderColor: 'rgb(51 65 85)' }),
          minHeight: minHeightPx > 0 ? minHeightPx : undefined,
          padding: '1rem'
        }}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
          <div className="text-[9px] font-mono uppercase tracking-wider text-slate-500">
            Suite frame · drag right / bottom edges · border applies to all suites
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[9px] font-mono text-slate-500">
            <label className="flex items-center gap-1.5">
              <span className="uppercase tracking-wider text-slate-600">Border</span>
              <input type="range" min={0} max={6} step={1} value={borderPx} onChange={(e) => setBorderPx(Number(e.target.value))} className="w-16 accent-emerald-500" />
              <span className="text-slate-400 w-4">{borderPx}</span>
            </label>
            <label className="flex items-center gap-1.5">
              <span className="uppercase tracking-wider text-slate-600">Radius</span>
              <input type="range" min={0} max={20} step={2} value={radiusPx} onChange={(e) => setRadiusPx(Number(e.target.value))} className="w-16 accent-emerald-500" />
              <span className="text-slate-400 w-5">{radiusPx}</span>
            </label>
            <label className="flex items-center gap-1.5">
              <span className="uppercase tracking-wider text-slate-600">Width</span>
              <input
                type="range"
                min={50}
                max={100}
                step={1}
                value={widthPct}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setWidthPct(v);
                  try { localStorage.setItem(STORAGE_OUTER_W, String(v)); } catch {}
                }}
                className="w-20 accent-emerald-500"
              />
              <span className="text-slate-400 w-8">{Math.round(widthPct)}%</span>
            </label>
          </div>
        </div>
        {children}
        {/* right edge width handle */}
        <div
          role="separator"
          aria-label="Resize suite frame width"
          onPointerDown={(e) => {
            e.preventDefault();
            dragging.current = 'w';
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
          }}
          className="absolute top-0 right-0 z-20 h-full w-2 cursor-col-resize hover:bg-emerald-500/25 active:bg-emerald-500/40"
          title="Drag to change outer width"
        />
        {/* bottom edge height handle */}
        <div
          role="separator"
          aria-label="Resize suite frame height"
          onPointerDown={(e) => {
            e.preventDefault();
            dragging.current = 'h';
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';
          }}
          className="absolute bottom-0 left-0 z-20 h-2 w-full cursor-row-resize hover:bg-emerald-500/25 active:bg-emerald-500/40"
          title="Drag to change outer height"
        />
      </div>
    </div>
  );
};
