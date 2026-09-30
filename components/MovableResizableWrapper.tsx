import React, { useCallback, useEffect, useRef, useState } from 'react';

const storageKey = (id: string) => `gina.ui.movable.${id}`;

type LayoutState = { x: number; y: number; width: number | null; height: number | null };

function readLayout(id: string): LayoutState {
  try {
    const raw = localStorage.getItem(storageKey(id));
    if (!raw) return { x: 0, y: 0, width: null, height: null };
    const parsed = JSON.parse(raw);
    return {
      x: Number(parsed.x) || 0,
      y: Number(parsed.y) || 0,
      width: parsed.width == null ? null : Number(parsed.width),
      height: parsed.height == null ? null : Number(parsed.height),
    };
  } catch {
    return { x: 0, y: 0, width: null, height: null };
  }
}

function writeLayout(id: string, state: LayoutState) {
  try {
    localStorage.setItem(storageKey(id), JSON.stringify(state));
  } catch {}
}

export interface MovableResizableWrapperProps {
  /** Unique key for localStorage persistence */
  id: string;
  children: React.ReactNode;
  className?: string;
  /** Allow free drag (default true) */
  movable?: boolean;
  /** Allow bottom-right resize (default true) */
  resizable?: boolean;
  minWidth?: number;
  minHeight?: number;
  /** When false, only shows handle chrome without forcing absolute positioning */
  floating?: boolean;
}

/**
 * Lightweight movable/resizable shell with localStorage persistence.
 * Drag via the [::] handle only so child inputs/buttons stay usable.
 */
export const MovableResizableWrapper: React.FC<MovableResizableWrapperProps> = ({
  id,
  children,
  className = '',
  movable = true,
  resizable = true,
  minWidth = 160,
  minHeight = 36,
  floating = false,
}) => {
  const [layout, setLayout] = useState<LayoutState>(() => readLayout(id));
  const dragRef = useRef<{ ox: number; oy: number; sx: number; sy: number } | null>(null);
  const resizeRef = useRef<{ ox: number; oy: number; sw: number; sh: number } | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    writeLayout(id, layout);
  }, [id, layout]);

  const onDragStart = useCallback(
    (e: React.PointerEvent) => {
      if (!movable) return;
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      dragRef.current = { ox: e.clientX, oy: e.clientY, sx: layout.x, sy: layout.y };
    },
    [movable, layout.x, layout.y]
  );

  const onResizeStart = useCallback(
    (e: React.PointerEvent) => {
      if (!resizable || !shellRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      const rect = shellRef.current.getBoundingClientRect();
      resizeRef.current = {
        ox: e.clientX,
        oy: e.clientY,
        sw: layout.width ?? rect.width,
        sh: layout.height ?? rect.height,
      };
    },
    [resizable, layout.width, layout.height]
  );

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (dragRef.current) {
        const dx = e.clientX - dragRef.current.ox;
        const dy = e.clientY - dragRef.current.oy;
        setLayout((prev) => ({
          ...prev,
          x: dragRef.current!.sx + dx,
          y: dragRef.current!.sy + dy,
        }));
      } else if (resizeRef.current) {
        const dw = e.clientX - resizeRef.current.ox;
        const dh = e.clientY - resizeRef.current.oy;
        setLayout((prev) => ({
          ...prev,
          width: Math.max(minWidth, resizeRef.current!.sw + dw),
          height: Math.max(minHeight, resizeRef.current!.sh + dh),
        }));
      }
    };
    const up = () => {
      dragRef.current = null;
      resizeRef.current = null;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [minWidth, minHeight]);

  const style: React.CSSProperties = {
    transform: movable && (layout.x || layout.y) ? `translate(${layout.x}px, ${layout.y}px)` : undefined,
    width: layout.width ?? undefined,
    height: layout.height ?? undefined,
    minWidth,
    minHeight,
    position: floating ? 'relative' : undefined,
    zIndex: floating || layout.x || layout.y ? 5 : undefined,
  };

  return (
    <div
      ref={shellRef}
      className={`group/movable relative ${className}`}
      style={style}
      data-movable-id={id}
    >
      {movable && (
        <button
          type="button"
          onPointerDown={onDragStart}
          className="absolute -left-1 top-1 z-20 cursor-grab active:cursor-grabbing rounded border border-slate-700/80 bg-slate-900/90 px-1 py-0.5 font-mono text-[9px] leading-none text-slate-500 opacity-40 hover:opacity-100 hover:text-emerald-300 select-none"
          title="Drag to move (position saved)"
          aria-label="Drag handle"
        >
          [::]
        </button>
      )}
      <div className={movable ? 'pl-5' : undefined}>{children}</div>
      {resizable && (
        <div
          onPointerDown={onResizeStart}
          className="absolute bottom-0 right-0 z-20 h-3 w-3 cursor-se-resize opacity-30 hover:opacity-100"
          title="Resize"
          aria-label="Resize handle"
        >
          <div className="absolute bottom-0.5 right-0.5 h-1.5 w-1.5 border-b-2 border-r-2 border-slate-500" />
        </div>
      )}
    </div>
  );
};

export default MovableResizableWrapper;
