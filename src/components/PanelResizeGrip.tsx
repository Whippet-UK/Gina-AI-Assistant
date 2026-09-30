import React, { useCallback, useEffect, useRef, useState } from 'react';

interface UseResizablePanelOptions {
  storageKey: string;
  defaultHeight: number;
  minHeight?: number;
  maxHeight?: number;
  defaultWidth?: number | null; // null = 100% full width
  minWidth?: number;
  maxWidth?: number;
  defaultX?: number;
  defaultY?: number;
}

export interface PanelPosition {
  x: number;
  y: number;
}

const POSITION_VERSION = 'v2';
const Z_INDEX_STORAGE_KEY = 'gina.ui.panel.zIndex.v1';

const readStoredNumber = (key: string, fallback: number): number => {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null || raw === '') return fallback;
    const value = Number(raw);
    return Number.isFinite(value) ? value : fallback;
  } catch {
    return fallback;
  }
};

const readStoredDimension = (key: string, fallback: number | null, min: number, max: number): number | null => {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null || raw === '' || raw === 'full') return fallback;
    const value = Number(raw);
    if (!Number.isFinite(value)) return fallback;
    return Math.min(max, Math.max(min, value));
  } catch {
    return fallback;
  }
};

const nextZIndex = (): number => {
  const next = Math.max(20, readStoredNumber(Z_INDEX_STORAGE_KEY, 20) + 1);
  try { localStorage.setItem(Z_INDEX_STORAGE_KEY, String(next)); } catch {}
  return next;
};

const defaultPositionFor = (storageKey: string): PanelPosition => {
  const defaults: Record<string, PanelPosition> = {
    'gina.ui.trace.executionTimeline': { x: 0, y: 0 },
    'gina.ui.trace.liveAgentTrace': { x: 0, y: 0 },
    'gina.ui.trace.runtimeTelemetry': { x: 0, y: 0 },
    'gina.ui.trace.mcpToolLogs': { x: 0, y: 0 },
    'gina.ui.trace.contextAllocation': { x: 0, y: 0 },
    'gina.ui.trace.hardwareSafety': { x: 0, y: 0 },
    'gina.ui.widget.telemetry': { x: 0, y: 0 },
    'gina.ui.widget.electricity': { x: 0, y: 0 },
    'gina.ui.widget.commercial': { x: 0, y: 0 },
    'gina.ui.widget.llamaLog': { x: 0, y: 0 },
    'gina.ui.widget.bottomEngine': { x: 0, y: 0 },
    'gina.ui.widget.promptBox': { x: 0, y: 0 }
  };
  return defaults[storageKey] || { x: 0, y: 0 };
};

const positionStorageKey = (storageKey: string, axis: 'x' | 'y') => `${storageKey}.position.${POSITION_VERSION}.${axis}`;
const zIndexStorageKey = (storageKey: string) => `${storageKey}.zIndex.${POSITION_VERSION}`;

export function useResizablePanel({
  storageKey,
  defaultHeight,
  minHeight = 50,
  maxHeight = 1200,
  defaultWidth = null,
  minWidth = 240,
  maxWidth = 3840,
  defaultX,
  defaultY
}: UseResizablePanelOptions) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const defaults = defaultPositionFor(storageKey);

  const [height, setHeight] = useState<number>(() => {
    const saved = readStoredNumber(`${storageKey}.height`, defaultHeight);
    return Math.min(maxHeight, Math.max(minHeight, saved));
  });

  const [width, setWidth] = useState<number | null>(() =>
    readStoredDimension(`${storageKey}.width`, defaultWidth, minWidth, maxWidth)
  );

  // Position is stored under a v2 key so the earlier absolute-position implementation
  // cannot leak its broken coordinates into this flow-preserving layout.
  const [position, setPosition] = useState<PanelPosition>(() => ({
    x: Math.max(0, readStoredNumber(positionStorageKey(storageKey, 'x'), defaultX ?? defaults.x)),
    y: Math.max(0, readStoredNumber(positionStorageKey(storageKey, 'y'), defaultY ?? defaults.y))
  }));

  const [zIndex, setZIndex] = useState<number>(() =>
    Math.max(20, readStoredNumber(zIndexStorageKey(storageKey), readStoredNumber(Z_INDEX_STORAGE_KEY, 20)))
  );
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const heightRef = useRef(height);
  const widthRef = useRef(width);
  const positionRef = useRef(position);
  const zIndexRef = useRef(zIndex);

  heightRef.current = height;
  widthRef.current = width;
  positionRef.current = position;
  zIndexRef.current = zIndex;

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    // Keep panels in their original document flow. translate() provides the free-form
    // visual offset without turning a nested child into an absolute-positioned overlay.
    panel.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
    panel.style.zIndex = String(zIndex);
    panel.style.willChange = isDragging || isResizing ? 'transform, width, height' : 'auto';
  }, [position, zIndex, isDragging, isResizing]);

  const persistPosition = useCallback((next: PanelPosition) => {
    try {
      localStorage.setItem(positionStorageKey(storageKey, 'x'), String(next.x));
      localStorage.setItem(positionStorageKey(storageKey, 'y'), String(next.y));
      localStorage.setItem(zIndexStorageKey(storageKey), String(zIndexRef.current));
    } catch {}
  }, [storageKey]);

  const startDrag = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const initial = positionRef.current;
    const startX = e.clientX;
    const startY = e.clientY;
    const raisedZ = nextZIndex();
    zIndexRef.current = raisedZ;
    setZIndex(raisedZ);
    setIsDragging(true);

    const onMove = (event: PointerEvent) => {
      event.preventDefault();
      const next = {
        x: Math.max(0, Math.round(initial.x + event.clientX - startX)),
        y: Math.max(0, Math.round(initial.y + event.clientY - startY))
      };
      positionRef.current = next;
      setPosition(next);
    };

    const cleanup = () => {
      const finalPosition = positionRef.current;
      setIsDragging(false);
      persistPosition(finalPosition);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', cleanup, true);
      window.removeEventListener('pointercancel', cleanup, true);
    };

    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', onMove, { capture: true, passive: false });
    window.addEventListener('pointerup', cleanup, { capture: true, once: true });
    window.addEventListener('pointercancel', cleanup, { capture: true, once: true });
  }, [persistPosition]);

  const startResize = useCallback(
    (e: React.PointerEvent, mode: 'height' | 'width' | 'both') => {
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
      document.body.style.cursor = mode === 'height' ? 'row-resize' : mode === 'width' ? 'col-resize' : 'nwse-resize';

      const iframes = Array.from(document.querySelectorAll('iframe'));
      const previousIframePointerEvents = iframes.map(iframe => (iframe as HTMLElement).style.pointerEvents);
      iframes.forEach(iframe => {
        (iframe as HTMLElement).style.pointerEvents = 'none';
      });

      const onMove = (event: PointerEvent) => {
        event.preventDefault();

        if (mode === 'height' || mode === 'both') {
          const nextHeight = Math.max(minHeight, Math.min(maxHeight, Math.round(initialHeight + event.clientY - startY)));
          heightRef.current = nextHeight;
          setHeight(nextHeight);
        }

        if (mode === 'width' || mode === 'both') {
          const nextWidth = Math.max(minWidth, Math.min(maxWidth, Math.round(initialWidth + event.clientX - startX)));
          widthRef.current = nextWidth;
          setWidth(nextWidth);
        }
      };

      const cleanup = () => {
        setIsResizing(false);
        document.body.style.cursor = prevCursor;
        document.body.style.userSelect = prevSelect;
        iframes.forEach((iframe, index) => {
          (iframe as HTMLElement).style.pointerEvents = previousIframePointerEvents[index] || '';
        });
        try {
          localStorage.setItem(`${storageKey}.height`, String(heightRef.current));
          localStorage.setItem(`${storageKey}.width`, widthRef.current == null ? 'full' : String(widthRef.current));
        } catch {}
        window.removeEventListener('pointermove', onMove, true);
        window.removeEventListener('pointerup', cleanup, true);
        window.removeEventListener('pointercancel', cleanup, true);
      };

      window.addEventListener('pointermove', onMove, { capture: true, passive: false });
      window.addEventListener('pointerup', cleanup, { capture: true, once: true });
      window.addEventListener('pointercancel', cleanup, { capture: true, once: true });
    },
    [storageKey, minHeight, maxHeight, minWidth, maxWidth]
  );

  const resetWidth = useCallback(() => {
    widthRef.current = null;
    setWidth(null);
    try { localStorage.setItem(`${storageKey}.width`, 'full'); } catch {}
  }, [storageKey]);

  const resetPosition = useCallback(() => {
    const next = { x: defaultX ?? defaults.x, y: defaultY ?? defaults.y };
    positionRef.current = next;
    setPosition(next);
    const raisedZ = nextZIndex();
    zIndexRef.current = raisedZ;
    setZIndex(raisedZ);
    persistPosition(next);
  }, [defaultX, defaultY, defaults.x, defaults.y, persistPosition]);

  return {
    panelRef,
    height,
    width,
    position,
    isResizing,
    isDragging,
    setHeight,
    setWidth,
    setPosition,
    resetWidth,
    resetPosition,
    onDragStart: startDrag,
    onBottomPointerDown: (e: React.PointerEvent) => startResize(e, 'height'),
    onRightPointerDown: (e: React.PointerEvent) => startResize(e, 'width'),
    onCornerPointerDown: (e: React.PointerEvent) => startResize(e, 'both')
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
  className = ''
}) => {
  const handleBottom = onBottomPointerDown || onResize;

  return (
    <>
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

      {handleBottom && (
        <div
          role="separator"
          aria-label={`Resize ${label} height`}
          onPointerDown={handleBottom}
          style={{ touchAction: 'none' }}
          className={`w-full relative flex items-center justify-center py-2 cursor-row-resize select-none group border-t border-slate-800/60 hover:bg-slate-800/40 active:bg-slate-800/70 transition-colors shrink-0 z-20 ${className}`}
          title="Drag up or down to adjust height"
        >
          <div className="w-14 h-1.5 rounded-full bg-slate-600 group-hover:bg-slate-400 group-active:bg-emerald-400 transition-colors shadow-sm" />
          {width && onResetWidth && (
            <button
              type="button"
              onClick={event => {
                event.stopPropagation();
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

      {onCornerPointerDown && (
        <div
          role="separator"
          aria-label={`Resize ${label} width and height`}
          onPointerDown={onCornerPointerDown}
          onDoubleClick={onResetWidth}
          style={{ touchAction: 'none' }}
          className="absolute right-0 bottom-0 w-4 h-4 cursor-nwse-resize select-none z-30 flex items-end justify-end p-0.5 group"
          title="Drag corner to adjust width and height"
        >
          <svg
            className="w-3 h-3 text-slate-600 group-hover:text-slate-300 group-active:text-emerald-400 transition-colors"
            viewBox="0 0 10 10"
            fill="currentColor"
            aria-hidden="true"
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
