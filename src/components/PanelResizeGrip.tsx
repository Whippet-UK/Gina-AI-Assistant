import React, { useRef, useState, useCallback, useEffect } from 'react';

interface UseResizablePanelOptions {
  storageKey: string;
  defaultHeight: number;
  minHeight?: number;
  maxHeight?: number;
  defaultWidth?: number | null; // null = 100% full width
  minWidth?: number;
  maxWidth?: number;
}

export function useResizablePanel({
  storageKey,
  defaultHeight,
  minHeight = 50,
  maxHeight = 1200,
  defaultWidth = null,
  minWidth = 240,
  maxWidth = 3840
}: UseResizablePanelOptions) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Height state
  const [height, setHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}.height`);
      if (saved) {
        const val = Number(saved);
        if (Number.isFinite(val) && val >= minHeight) return Math.min(maxHeight, val);
      }
    } catch {}
    return defaultHeight;
  });

  // Width state (null means full 100% container width)
  const [width, setWidth] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}.width`);
      if (saved && saved !== 'full') {
        const val = Number(saved);
        if (Number.isFinite(val) && val >= minWidth) return Math.min(maxWidth, val);
      }
    } catch {}
    return defaultWidth;
  });

  const [isResizing, setIsResizing] = useState(false);
  const heightRef = useRef(height);
  heightRef.current = height;
  const widthRef = useRef(width);
  widthRef.current = width;

  const startDrag = useCallback(
    (e: React.PointerEvent, mode: 'height' | 'width' | 'both') => {
      // Only drag on primary mouse button
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      setIsResizing(true);

      const startX = e.clientX;
      const startY = e.clientY;
      const initialHeight = heightRef.current;
      const rect = panelRef.current?.getBoundingClientRect();
      const initialWidth = rect ? rect.width : (widthRef.current ?? 800);

      const prevCursor = document.body.style.cursor;
      const prevSelect = document.body.style.userSelect;
      document.body.style.userSelect = 'none';
      if (mode === 'height') document.body.style.cursor = 'row-resize';
      else if (mode === 'width') document.body.style.cursor = 'col-resize';
      else document.body.style.cursor = 'nwse-resize';

      // Temporarily disable iframe pointer events so drags across preview iframe don't lose pointer tracking
      const iframes = Array.from(document.querySelectorAll('iframe'));
      iframes.forEach(iframe => {
        (iframe as HTMLElement).style.pointerEvents = 'none';
      });

      const onPointerMove = (ev: PointerEvent) => {
        ev.preventDefault();
        ev.stopPropagation();

        if (mode === 'height' || mode === 'both') {
          const deltaY = ev.clientY - startY;
          const nextH = Math.max(minHeight, Math.min(maxHeight, Math.round(initialHeight + deltaY)));
          setHeight(nextH);
          try {
            localStorage.setItem(`${storageKey}.height`, String(nextH));
          } catch {}
        }

        if (mode === 'width' || mode === 'both') {
          const deltaX = ev.clientX - startX;
          const nextW = Math.max(minWidth, Math.min(maxWidth, Math.round(initialWidth + deltaX)));
          setWidth(nextW);
          try {
            localStorage.setItem(`${storageKey}.width`, String(nextW));
          } catch {}
        }
      };

      const cleanup = () => {
        setIsResizing(false);
        document.body.style.cursor = prevCursor;
        document.body.style.userSelect = prevSelect;
        iframes.forEach(iframe => {
          (iframe as HTMLElement).style.pointerEvents = '';
        });
        window.removeEventListener('pointermove', onPointerMove, true);
        window.removeEventListener('pointerup', onPointerUp, true);
        window.removeEventListener('pointercancel', onPointerUp, true);
      };

      const onPointerUp = (ev: PointerEvent) => {
        ev.preventDefault();
        cleanup();
      };

      window.addEventListener('pointermove', onPointerMove, { capture: true, passive: false });
      window.addEventListener('pointerup', onPointerUp, { capture: true });
      window.addEventListener('pointercancel', onPointerUp, { capture: true });
    },
    [storageKey, minHeight, maxHeight, minWidth, maxWidth]
  );

  const onBottomPointerDown = useCallback((e: React.PointerEvent) => startDrag(e, 'height'), [startDrag]);
  const onRightPointerDown = useCallback((e: React.PointerEvent) => startDrag(e, 'width'), [startDrag]);
  const onCornerPointerDown = useCallback((e: React.PointerEvent) => startDrag(e, 'both'), [startDrag]);

  const resetWidth = useCallback(() => {
    setWidth(null);
    try {
      localStorage.setItem(`${storageKey}.width`, 'full');
    } catch {}
  }, [storageKey]);

  return {
    panelRef,
    height,
    width,
    isResizing,
    setHeight,
    setWidth,
    resetWidth,
    onBottomPointerDown,
    onRightPointerDown,
    onCornerPointerDown
  };
}

export interface PanelResizeGripProps {
  onBottomPointerDown?: (e: React.PointerEvent) => void;
  onRightPointerDown?: (e: React.PointerEvent) => void;
  onCornerPointerDown?: (e: React.PointerEvent) => void;
  onResetWidth?: () => void;
  onResize?: (e: React.PointerEvent) => void; // backwards compat fallback
  label?: string;
  width?: number | null;
  height?: number;
  className?: string;
}

export const PanelResizeGrip: React.FC<PanelResizeGripProps> = ({
  onBottomPointerDown,
  onRightPointerDown,
  onCornerPointerDown,
  onResetWidth,
  onResize,
  label = 'panel',
  width,
  height,
  className = ''
}) => {
  const handleBottom = onBottomPointerDown || onResize;

  return (
    <>
      {/* Right Edge Grip: vertical bar for adjusting width */}
      {onRightPointerDown && (
        <div
          role="separator"
          aria-label={`Resize ${label} width`}
          onPointerDown={onRightPointerDown}
          onDoubleClick={onResetWidth}
          style={{ touchAction: 'none' }}
          className="absolute top-0 right-0 bottom-3 w-3 hover:w-4 cursor-col-resize select-none z-20 flex items-center justify-center group transition-all"
          title="Drag to adjust width (Double-click to reset to full width)"
        >
          <div className="w-1.5 h-10 rounded-full bg-slate-600/80 group-hover:bg-slate-300 group-active:bg-emerald-400 shadow-sm transition-colors" />
        </div>
      )}

      {/* Bottom Edge Grip: horizontal bar with the grey pill for adjusting height */}
      {handleBottom && (
        <div
          role="separator"
          aria-label={`Resize ${label} height`}
          onPointerDown={handleBottom}
          style={{ touchAction: 'none' }}
          className={`w-full relative flex items-center justify-center py-2 cursor-row-resize select-none group border-t border-slate-800/60 hover:bg-slate-800/40 active:bg-slate-800/70 transition-colors shrink-0 z-20 ${className}`}
          title="Drag up or down to adjust height"
        >
          {/* THE GREY PILL */}
          <div className="w-14 h-1.5 rounded-full bg-slate-600 group-hover:bg-slate-400 group-active:bg-emerald-400 transition-colors shadow-sm" />

          {/* Quick info & width reset button */}
          {width && onResetWidth && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onResetWidth();
              }}
              className="absolute right-3 text-[8px] font-mono text-slate-500 hover:text-emerald-400 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800 uppercase tracking-wider transition-colors"
              title="Reset width to 100% full width"
            >
              Reset 100%
            </button>
          )}
        </div>
      )}

      {/* Bottom-Right Corner Grip: for adjusting both width and height simultaneously */}
      {onCornerPointerDown && (
        <div
          role="separator"
          aria-label={`Resize ${label} width and height`}
          onPointerDown={onCornerPointerDown}
          onDoubleClick={onResetWidth}
          style={{ touchAction: 'none' }}
          className="absolute right-0 bottom-0 w-4 h-4 cursor-nwse-resize select-none z-30 flex items-end justify-end p-0.5 group"
          title="Drag corner to adjust width and height (Double-click to reset width)"
        >
          <svg
            className="w-3 h-3 text-slate-600 group-hover:text-slate-300 group-active:text-emerald-400 transition-colors"
            viewBox="0 0 10 10"
            fill="currentColor"
          >
            <circle cx="8" cy="8" r="1.2" />
            <circle cx="8" cy="4" r="1.2" />
            <circle cx="4" cy="8" r="1.2" />
          </svg>
        </div>
      )}
    </>
  );
};
