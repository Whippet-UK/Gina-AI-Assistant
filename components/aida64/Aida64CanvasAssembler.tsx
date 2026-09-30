import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, Check, Copy,
  Download, Maximize2, MousePointer2, Redo2, Trash2, Undo2, ZoomIn, ZoomOut
} from 'lucide-react';
import {
  AIDA64_PANEL_TEMPLATES,
  AIDA64_SCREEN_PRESETS,
  AIDA64_SHAPES_CATALOG,
  GAUGE_STYLES_REGISTRY,
  Aida64ShapeDefinition
} from '../../data/aida64Presets';
import { Aida64GaugeStyle, Aida64PanelItem, Aida64ScreenPreset, SystemTelemetry, Aida64SensorBinding } from '../../types';
import { Aida64TelemetrySnapshot, normaliseAida64Value } from '../../hooks/useAida64Telemetry';

interface Aida64CanvasAssemblerProps {
  telemetry?: SystemTelemetry;
  backgroundUrl?: string;
  injectedItem?: Aida64PanelItem | null;
  onItemInjectedAck?: () => void;
  aida64Telemetry?: Aida64TelemetrySnapshot;
}

type DragMode = 'move' | 'resize';
type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface InteractionState {
  mode: DragMode;
  handle?: ResizeHandle;
  startClientX: number;
  startClientY: number;
  startItems: Record<string, Pick<Aida64PanelItem, 'x' | 'y' | 'width' | 'height' | 'scale'>>;
}

const SNAP_OPTIONS = [1, 4, 8, 16, 20];
const SCALE_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
const MIN_SIZE = 20;
const cloneItems = (items: Aida64PanelItem[]) => items.map(item => ({ ...item }));

export const Aida64CanvasAssembler: React.FC<Aida64CanvasAssemblerProps> = ({
  backgroundUrl,
  injectedItem,
  onItemInjectedAck,
  aida64Telemetry
}) => {
  const [screen, setScreen] = useState<Aida64ScreenPreset>(AIDA64_SCREEN_PRESETS[0]);
  const [items, setItems] = useState<Aida64PanelItem[]>(() => {
    try {
      const saved = localStorage.getItem('aida64_custom_layout');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore malformed local state.
    }
    return cloneItems(AIDA64_PANEL_TEMPLATES[0]?.items || []);
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [snapSize, setSnapSize] = useState(8);
  const [zoom, setZoom] = useState(0.85);
  const [activePanel, setActivePanel] = useState<'elements' | 'templates' | 'layers'>('elements');
  const [aspectLocked, setAspectLocked] = useState(true);
  const [history, setHistory] = useState<Aida64PanelItem[][]>(() => [cloneItems(items)]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [clipboardItems, setClipboardItems] = useState<Aida64PanelItem[]>([]);
  const [background, setBackground] = useState(backgroundUrl);
  const [liveValues, setLiveValues] = useState<Record<string, number>>({});
  const [peakValues, setPeakValues] = useState<Record<string, number>>({});
  const interactionRef = useRef<InteractionState | null>(null);
  const itemsRef = useRef<Aida64PanelItem[]>(items);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragChangedRef = useRef(false);

  const selected = useMemo(() => items.filter(item => selectedIds.includes(item.id)), [items, selectedIds]);
  const primary = selected[0] || null;

  useEffect(() => { setBackground(backgroundUrl); }, [backgroundUrl]);
  useEffect(() => {
    if (!aida64Telemetry?.sensors?.length) return;
    const now = Date.now();
    setLiveValues(prev => {
      const next = { ...prev };
      items.forEach(item => {
        const binding = item.sensorBinding;
        if (!binding) return;
        const sensor = aida64Telemetry.sensors.find(s => s.id === binding.sensorId);
        if (!sensor) return;
        const previous = prev[item.id];
        if (previous == null || binding.smoothingMs <= 0) next[item.id] = sensor.value;
        else {
          const sampleMs = aida64Telemetry.updateRateHz > 0 ? 1000 / aida64Telemetry.updateRateHz : 250;
          const alpha = 1 - Math.exp(-Math.max(50, sampleMs) / Math.max(1, binding.smoothingMs));
          next[item.id] = previous + (sensor.value - previous) * alpha;
        }
      });
      return next;
    });
    setPeakValues(prev => {
      const next = { ...prev };
      items.forEach(item => {
        const binding = item.sensorBinding;
        if (!binding?.peakHold) return;
        const value = liveValues[item.id];
        if (value == null) return;
        const old = prev[item.id];
        const sampleMs = aida64Telemetry.updateRateHz > 0 ? 1000 / aida64Telemetry.updateRateHz : 250;
        if (old == null) next[item.id] = value;
        else {
          const decay = 1 - Math.exp(-sampleMs / Math.max(1, binding.peakDecayMs));
          const decayed = old + (value - old) * decay;
          next[item.id] = Math.max(value, decayed);
        }
      });
      return next;
    });
    void now;
  }, [aida64Telemetry?.timestamp, aida64Telemetry?.sensors, items]);

  useEffect(() => {
    itemsRef.current = items;
    try { localStorage.setItem('aida64_custom_layout', JSON.stringify(items)); } catch { /* ignore */ }
  }, [items]);

  const commit = useCallback((nextItems: Aida64PanelItem[]) => {
    const snapshot = cloneItems(nextItems);
    setItems(snapshot);
    setHistory(prev => [...prev.slice(0, historyIndex + 1), cloneItems(snapshot)]);
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const snap = useCallback((value: number) => snapSize <= 1 ? Math.round(value) : Math.round(value / snapSize) * snapSize, [snapSize]);

  const addItem = useCallback((item: Aida64PanelItem) => {
    commit([...items, item]);
    setSelectedIds([item.id]);
  }, [commit, items]);

  const addShape = useCallback((shape: Aida64ShapeDefinition) => {
    const id = `shape_${shape.shapeType}_${Date.now()}`;
    const x = Math.max(0, Math.round((screen.width - shape.defaultWidth) / 2));
    const y = Math.max(0, Math.round((screen.height - shape.defaultHeight) / 2));
    addItem(shape.factoryItem(id, x, y));
  }, [addItem, screen.height, screen.width]);

  const addDial = useCallback((kind: 'cpu' | 'gpu' | 'hero') => {
    const size = kind === 'hero' ? 320 : 240;
    const id = `dial_${kind}_${Date.now()}`;
    const x = kind === 'gpu' ? Math.max(0, screen.width - size - 40) : Math.max(0, Math.round((screen.width - size) / 2));
    const y = Math.max(0, Math.round((screen.height - size) / 2));
    addItem({
      id,
      name: kind === 'cpu' ? 'CPU Utilisation Dial' : kind === 'gpu' ? 'GPU Utilisation Dial' : 'Hero Telemetry Dial',
      type: 'dial',
      shapeType: 'dial_circle',
      x, y, width: size, height: size,
      sensorType: kind === 'cpu' ? 'CPU %' : kind === 'gpu' ? 'GPU %' : 'CPU TEMP',
      testValue: kind === 'hero' ? '54' : '67',
      unit: kind === 'hero' ? '°C' : '%',
      color: kind === 'gpu' ? '#10b981' : kind === 'hero' ? '#06b6d4' : '#ef4444',
      scale: 1,
      gaugePercent: kind === 'hero' ? 54 : 67,
      gaugeStyle: 'segmented_arc'
    });
  }, [addItem, screen.height, screen.width]);

  const addGauge = useCallback((style: Aida64GaugeStyle) => {
    const meta = GAUGE_STYLES_REGISTRY.find(s => s.id === style);
    const width = meta?.defaultConfig.width || 300;
    const height = meta?.defaultConfig.height || 300;
    const id = `gauge_${style}_${Date.now()}`;
    addItem({
      id,
      name: meta?.name || 'AIDA64 Gauge',
      type: 'gauge_overlay',
      x: Math.max(0, Math.round((screen.width - width) / 2)),
      y: Math.max(0, Math.round((screen.height - height) / 2)),
      width, height,
      sensorType: 'CPU %', testValue: '67', unit: '%', color: '#ef4444',
      scale: 1, gaugePercent: 67, gaugeStyle: style
    });
  }, [addItem, screen.height, screen.width]);

  const addBox = useCallback(() => {
    const id = `box_${Date.now()}`;
    addItem({
      id, name: 'Telemetry Value Box', type: 'value_box', shapeType: 'box_chamfer', boxShape: 'chamfer',
      x: Math.max(0, Math.round((screen.width - 140) / 2)), y: Math.max(0, Math.round((screen.height - 48) / 2)),
      width: 140, height: 48, sensorType: 'CPU CLOCK', testValue: '4796', unit: 'MHz', color: '#ef4444', scale: 1
    });
  }, [addItem, screen.height, screen.width]);

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const nextIndex = historyIndex - 1;
    setHistoryIndex(nextIndex);
    setItems(cloneItems(history[nextIndex]));
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const nextIndex = historyIndex + 1;
    setHistoryIndex(nextIndex);
    setItems(cloneItems(history[nextIndex]));
  }, [history, historyIndex]);

  const deleteSelected = useCallback(() => {
    if (!selectedIds.length) return;
    commit(items.filter(item => !selectedIds.includes(item.id)));
    setSelectedIds([]);
  }, [commit, items, selectedIds]);

  const duplicateSelected = useCallback(() => {
    if (!selected.length) return;
    const now = Date.now();
    const duplicates = selected.map((item, index) => ({
      ...item, id: `${item.id}_copy_${now}_${index}`, name: `${item.name} Copy`,
      x: Math.min(screen.width - item.width, item.x + 20), y: Math.min(screen.height - item.height, item.y + 20)
    }));
    commit([...items, ...duplicates]);
    setSelectedIds(duplicates.map(item => item.id));
  }, [commit, items, screen.height, screen.width, selected]);

  const applyTemplate = useCallback((templateId: string) => {
    const template = AIDA64_PANEL_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;
    const preset = AIDA64_SCREEN_PRESETS.find(p => p.id === template.resolutionId);
    if (preset) setScreen(preset);
    const next = cloneItems(template.items);
    commit(next);
    setSelectedIds(next[0] ? [next[0].id] : []);
  }, [commit]);

  const updatePrimary = useCallback((patch: Partial<Aida64PanelItem>) => {
    if (!primary) return;
    commit(items.map(item => item.id === primary.id ? { ...item, ...patch } : item));
  }, [commit, items, primary]);

  const setScale = useCallback((value: number) => {
    if (!primary) return;
    const scale = Math.max(0.1, Math.min(4, value));
    const baseW = primary.width / (primary.scale || 1);
    const baseH = primary.height / (primary.scale || 1);
    updatePrimary({
      scale: Number(scale.toFixed(2)),
      width: Math.max(MIN_SIZE, Math.round(baseW * scale)),
      height: Math.max(MIN_SIZE, Math.round(baseH * scale))
    });
  }, [primary, updatePrimary]);

  const align = useCallback((mode: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (selected.length < 2) return;
    const bounds = {
      left: Math.min(...selected.map(i => i.x)), right: Math.max(...selected.map(i => i.x + i.width)),
      top: Math.min(...selected.map(i => i.y)), bottom: Math.max(...selected.map(i => i.y + i.height))
    };
    commit(items.map(item => {
      if (!selectedIds.includes(item.id)) return item;
      if (mode === 'left') return { ...item, x: bounds.left };
      if (mode === 'right') return { ...item, x: bounds.right - item.width };
      if (mode === 'center') return { ...item, x: Math.round(bounds.left + (bounds.right - bounds.left - item.width) / 2) };
      if (mode === 'top') return { ...item, y: bounds.top };
      if (mode === 'bottom') return { ...item, y: bounds.bottom - item.height };
      return { ...item, y: Math.round(bounds.top + (bounds.bottom - bounds.top - item.height) / 2) };
    }));
  }, [commit, items, selected, selectedIds]);

  const distribute = useCallback((axis: 'horizontal' | 'vertical') => {
    if (selected.length < 3) return;
    const sorted = [...selected].sort((a, b) => axis === 'horizontal' ? a.x - b.x : a.y - b.y);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const firstPos = axis === 'horizontal' ? first.x : first.y;
    const lastPos = axis === 'horizontal' ? (last.x + last.width) : (last.y + last.height);
    const totalSize = sorted.reduce((sum, item) => sum + (axis === 'horizontal' ? item.width : item.height), 0);
    const gap = Math.max(0, (lastPos - firstPos - totalSize) / Math.max(1, sorted.length - 1));
    let cursor = firstPos;
    const positions = new Map(sorted.map(item => {
      const position = cursor;
      cursor += (axis === 'horizontal' ? item.width : item.height) + gap;
      return [item.id, Math.round(position)] as const;
    }));
    commit(items.map(item => selectedIds.includes(item.id) ? (axis === 'horizontal' ? { ...item, x: positions.get(item.id) ?? item.x } : { ...item, y: positions.get(item.id) ?? item.y }) : item));
  }, [commit, items, selected, selectedIds]);

  const matchSize = useCallback((axis: 'width' | 'height' | 'both') => {
    if (selected.length < 2 || !primary) return;
    commit(items.map(item => {
      if (!selectedIds.includes(item.id)) return item;
      return { ...item, ...(axis === 'width' || axis === 'both' ? { width: primary.width } : {}), ...(axis === 'height' || axis === 'both' ? { height: primary.height } : {}) };
    }));
  }, [commit, items, primary, selected.length, selectedIds]);

  const copySelected = useCallback(() => {
    if (selected.length) setClipboardItems(cloneItems(selected));
  }, [selected]);

  const pasteSelected = useCallback(() => {
    if (!clipboardItems.length) return;
    const now = Date.now();
    const pasted = clipboardItems.map((item, index) => ({ ...item, id: `${item.id}_paste_${now}_${index}`, name: `${item.name} Copy`, x: Math.min(screen.width - item.width, item.x + 24), y: Math.min(screen.height - item.height, item.y + 24) }));
    commit([...items, ...pasted]);
    setSelectedIds(pasted.map(item => item.id));
  }, [clipboardItems, commit, items, screen.height, screen.width]);

  const bringForward = useCallback((direction: 'up' | 'down') => {
    if (!primary) return;
    updatePrimary({ zIndex: Math.max(0, (primary.zIndex || 0) + (direction === 'up' ? 1 : -1)) });
  }, [primary, updatePrimary]);

  const beginInteraction = useCallback((e: React.PointerEvent, mode: DragMode, handle?: ResizeHandle, item?: Aida64PanelItem) => {
    if (item?.locked) return;
    e.preventDefault();
    e.stopPropagation();

    let source: string[] = [];
    if (item) {
      if (e.shiftKey) {
        if (selectedIds.includes(item.id)) {
          setSelectedIds(prev => prev.filter(id => id !== item.id));
          return;
        }
        source = [...selectedIds, item.id];
        setSelectedIds(source);
      } else {
        source = selectedIds.includes(item.id) ? selectedIds : [item.id];
        setSelectedIds(source);
      }
    } else {
      source = selectedIds;
    }

    const startItems: InteractionState['startItems'] = {};
    items.forEach(candidate => {
      if (source.includes(candidate.id)) {
        startItems[candidate.id] = { x: candidate.x, y: candidate.y, width: candidate.width, height: candidate.height, scale: candidate.scale || 1 };
      }
    });

    interactionRef.current = { mode, handle, startClientX: e.clientX, startClientY: e.clientY, startItems };
    dragChangedRef.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [items, selectedIds]);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const interaction = interactionRef.current;
      const canvas = canvasRef.current;
      if (!interaction || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const scaleX = screen.width / rect.width;
      const scaleY = screen.height / rect.height;
      const dx = (e.clientX - interaction.startClientX) * scaleX;
      const dy = (e.clientY - interaction.startClientY) * scaleY;

      setItems(prev => prev.map(item => {
        const start = interaction.startItems[item.id];
        if (!start) return item;

        if (interaction.mode === 'move') {
          return { ...item, x: Math.max(0, Math.min(screen.width - item.width, snap(start.x + dx))), y: Math.max(0, Math.min(screen.height - item.height, snap(start.y + dy))) };
        }

        let x = start.x, y = start.y, width = start.width, height = start.height;
        const handle = interaction.handle!;
        if (handle.includes('e')) width = start.width + dx;
        if (handle.includes('s')) height = start.height + dy;
        if (handle.includes('w')) { width = start.width - dx; x = start.x + dx; }
        if (handle.includes('n')) { height = start.height - dy; y = start.y + dy; }

        const shouldLock = aspectLocked || item.type === 'dial' || item.shapeType === 'dial_circle';
        if (shouldLock) {
          const ratio = start.width / Math.max(1, start.height);
          const primaryDelta = Math.abs(dx) >= Math.abs(dy) ? width - start.width : height - start.height;
          const signed = primaryDelta >= 0 ? 1 : -1;
          if (handle.includes('e') || handle.includes('w')) height = start.height + signed * Math.abs(primaryDelta) / ratio;
          else width = start.width + signed * Math.abs(primaryDelta) * ratio;
          if (item.type === 'dial' || item.shapeType === 'dial_circle') {
            const size = Math.max(MIN_SIZE, Math.max(width, height));
            width = size; height = size;
          }
        }

        width = Math.max(MIN_SIZE, snap(width));
        height = Math.max(MIN_SIZE, snap(height));
        x = Math.max(0, Math.min(screen.width - width, snap(x)));
        y = Math.max(0, Math.min(screen.height - height, snap(y)));
        dragChangedRef.current = true;
        return { ...item, x, y, width, height, scale: Number((width / Math.max(MIN_SIZE, start.width / (start.scale || 1))).toFixed(2)) };
      }));
      dragChangedRef.current = true;
    };

    const onPointerUp = () => {
      if (!interactionRef.current) return;
      interactionRef.current = null;
      if (dragChangedRef.current) {
        const snapshot = cloneItems(itemsRef.current);
        setHistory(prev => [...prev.slice(0, historyIndex + 1), cloneItems(snapshot)]);
        setHistoryIndex(prev => prev + 1);
      }
      dragChangedRef.current = false;
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [aspectLocked, historyIndex, screen.height, screen.width, snap]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSelected(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') { e.preventDefault(); copySelected(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') { e.preventDefault(); pasteSelected(); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelected(); return; }
      if (!selectedIds.length || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
      const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
      commit(items.map(item => selectedIds.includes(item.id) ? { ...item, x: Math.max(0, Math.min(screen.width - item.width, item.x + dx)), y: Math.max(0, Math.min(screen.height - item.height, item.y + dy)) } : item));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [commit, copySelected, deleteSelected, duplicateSelected, items, pasteSelected, redo, screen.height, screen.width, selectedIds, undo]);

  useEffect(() => {
    if (!injectedItem) return;
    addItem(injectedItem);
    setActivePanel('layers');
    onItemInjectedAck?.();
  }, [addItem, injectedItem, onItemInjectedAck]);

  const renderItem = (item: Aida64PanelItem) => {
    const isSelected = selectedIds.includes(item.id);
    const isDial = item.type === 'dial' || item.shapeType === 'dial_circle' || item.shapeType === 'dial_with_boxes';
    const binding = item.sensorBinding;
    const liveSensor = binding ? aida64Telemetry?.sensors.find(sensor => sensor.id === binding.sensorId) : undefined;
    const isStale = !!binding && (!liveSensor || (Date.now() - new Date(liveSensor.updatedAt).getTime()) > binding.staleTimeoutMs);
    const rawLive = liveSensor?.value;
    const normalised = binding && rawLive != null ? normaliseAida64Value(rawLive, binding) : undefined;
    const peak = binding?.peakHold ? peakValues[item.id] : undefined;
    const displayRaw = isStale ? undefined : (rawLive != null ? liveValues[item.id] ?? rawLive : undefined);
    const displayValue = displayRaw != null ? (item.type === 'dial' || item.type === 'gauge_overlay' ? normaliseAida64Value(displayRaw, binding || { min: 0, max: 100, normalisation: 'linear' } as Aida64SensorBinding) : displayRaw) : undefined;
    const thresholdColour = binding && rawLive != null && binding.critical != null && rawLive >= binding.critical ? '#ef4444' : binding && rawLive != null && binding.warning != null && rawLive >= binding.warning ? '#f59e0b' : item.color;
    return (
      <div
        key={item.id}
        className={`absolute select-none ${isSelected ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-slate-950' : 'hover:ring-1 hover:ring-sky-400/60'}`}
        style={{ left: item.x, top: item.y, width: item.width, height: item.height, zIndex: item.zIndex || 1, cursor: item.locked ? 'not-allowed' : 'move' }}
        onPointerDown={e => beginInteraction(e, 'move', undefined, item)}
      >
        {isDial ? (
          <div className="w-full h-full rounded-full border-2 border-slate-600 bg-slate-950/90 flex items-center justify-center relative">
            <div className="absolute inset-2 rounded-full border border-slate-700/80" />
            <div className="absolute inset-5 rounded-full border border-dashed border-slate-800" />
            <div className="text-center font-mono">
              <div className="text-[9px] uppercase tracking-widest text-slate-500">{item.sensorType}</div>
              <div className="text-2xl font-black" style={{ color: thresholdColour }}>{isStale ? '--' : Math.round(displayValue ?? item.gaugePercent ?? (Number(item.testValue) || 0))}</div>
              <div className="text-[8px] text-slate-500">{isStale ? 'SENSOR OFFLINE' : (item.unit || '%')}</div>
              {peak != null && <div className="text-[7px] text-slate-600">PEAK {Math.round(normaliseAida64Value(peak, binding || { min: 0, max: 100, normalisation: 'linear' } as Aida64SensorBinding))}%</div>}
            </div>
          </div>
        ) : item.type === 'gauge_overlay' ? (
          <div className="w-full h-full rounded-lg border border-slate-700 bg-slate-950/90 flex items-center justify-center font-mono">
            <div className="text-center">
              <div className="text-[8px] uppercase tracking-wider text-slate-500">{item.gaugeStyle || 'GAUGE'}</div>
              <div className="text-2xl font-bold" style={{ color: thresholdColour }}>{isStale ? '--' : Math.round(displayValue ?? item.gaugePercent ?? 67)}%</div>
              <div className="mt-2 h-2 w-2/3 mx-auto bg-slate-800 rounded overflow-hidden"><div className="h-full" style={{ width: `${Math.max(0, Math.min(100, displayValue ?? item.gaugePercent ?? 67))}%`, background: thresholdColour }} /></div>
            </div>
          </div>
        ) : (
          <div className="w-full h-full rounded-md border border-slate-700 bg-slate-950/90 flex flex-col items-center justify-center px-2 font-mono">
            <div className="text-[9px] uppercase tracking-wider text-slate-400 truncate max-w-full">{item.sensorType || item.name}</div>
            <div className="text-sm font-bold" style={{ color: thresholdColour }}>{isStale ? '--' : (displayRaw != null ? `${Number(displayRaw).toFixed(Number.isInteger(displayRaw) ? 0 : 1)}` : item.testValue)}</div>
            <div className="text-[8px] text-slate-500">{isStale ? 'SENSOR OFFLINE' : item.unit}</div>
          </div>
        )}
        {isSelected && !item.locked && (['nw','n','ne','e','se','s','sw','w'] as ResizeHandle[]).map(handle => (
          <button key={handle} type="button" aria-label={`Resize ${handle}`} className={`absolute z-50 w-2.5 h-2.5 bg-emerald-400 border border-slate-950 rounded-sm ${
            handle === 'nw' ? '-top-1 -left-1 cursor-nwse-resize' : handle === 'n' ? '-top-1 left-1/2 -translate-x-1/2 cursor-ns-resize' : handle === 'ne' ? '-top-1 -right-1 cursor-nesw-resize' : handle === 'e' ? 'top-1/2 -right-1 -translate-y-1/2 cursor-ew-resize' : handle === 'se' ? '-bottom-1 -right-1 cursor-nwse-resize' : handle === 's' ? '-bottom-1 left-1/2 -translate-x-1/2 cursor-ns-resize' : handle === 'sw' ? '-bottom-1 -left-1 cursor-nesw-resize' : 'top-1/2 -left-1 -translate-y-1/2 cursor-ew-resize'
          }`} onPointerDown={e => beginInteraction(e, 'resize', handle, item)} />
        ))}
      </div>
    );
  };

  const exportJson = () => {
    const payload = { version: 2, screen: { id: screen.id, width: screen.width, height: screen.height, label: screen.label }, items, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `AIDA64_Layout_${screen.width}x${screen.height}.json`; a.click(); URL.revokeObjectURL(url);
  };

  const copyCoords = async () => {
    const text = items.map(i => `${i.name}\tX=${i.x}\tY=${i.y}\tW=${i.width}\tH=${i.height}\tScale=${i.scale || 1}x`).join('\n');
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  };

  return (
    <div className="space-y-3">
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2"><Maximize2 className="w-4 h-4 text-emerald-400" /><span className="font-bold text-slate-100">Assembler Pro — Fixed Canvas Engine</span><span className="text-[9px] font-mono text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded">DRAG / RESIZE / SCALE</span></div>
          <div className="flex items-center gap-1.5">
            <select value={screen.id} onChange={e => { const next = AIDA64_SCREEN_PRESETS.find(p => p.id === e.target.value); if (next) setScreen(next); }} className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-200">{AIDA64_SCREEN_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select>
            <select value={snapSize} onChange={e => setSnapSize(Number(e.target.value))} className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-200">{SNAP_OPTIONS.map(v => <option key={v} value={v}>Snap {v}px</option>)}</select>
            <button onClick={undo} disabled={historyIndex <= 0} className="p-1.5 bg-slate-950 border border-slate-800 rounded disabled:opacity-30"><Undo2 className="w-3.5 h-3.5" /></button>
            <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-1.5 bg-slate-950 border border-slate-800 rounded disabled:opacity-30"><Redo2 className="w-3.5 h-3.5" /></button>
            <button onClick={() => setZoom(z => Math.max(0.25, z - 0.1))} className="p-1.5 bg-slate-950 border border-slate-800 rounded"><ZoomOut className="w-3.5 h-3.5" /></button>
            <span className="w-10 text-center text-[10px] font-mono text-slate-400">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} className="p-1.5 bg-slate-950 border border-slate-800 rounded"><ZoomIn className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <aside className="lg:col-span-3 bg-slate-900/90 border border-slate-800 rounded-lg p-3 space-y-2">
          <div className="flex gap-1">{(['elements', 'templates', 'layers'] as const).map(tab => <button key={tab} onClick={() => setActivePanel(tab)} className={`flex-1 px-2 py-1.5 rounded text-[10px] font-bold uppercase ${activePanel === tab ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-950 text-slate-500 border border-slate-800'}`}>{tab}</button>)}</div>
          {activePanel === 'elements' && <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
            <div className="text-[9px] font-mono text-slate-500 uppercase">Shapes</div>
            {AIDA64_SHAPES_CATALOG.slice(0, 12).map(shape => <button key={shape.shapeType} onClick={() => addShape(shape)} className="w-full text-left p-2 rounded border border-slate-800 bg-slate-950 hover:border-emerald-500/50"><div className="flex justify-between text-[10px] text-slate-200"><span>{shape.name}</span><span className="text-slate-600">{shape.defaultWidth}×{shape.defaultHeight}</span></div></button>)}
            <div className="text-[9px] font-mono text-slate-500 uppercase pt-2">Dials</div>
            <button onClick={() => addDial('cpu')} className="w-full p-2 rounded border border-slate-800 bg-slate-950 text-left text-[10px] text-slate-200">+ CPU Dial</button>
            <button onClick={() => addDial('gpu')} className="w-full p-2 rounded border border-slate-800 bg-slate-950 text-left text-[10px] text-slate-200">+ GPU Dial</button>
            <button onClick={() => addDial('hero')} className="w-full p-2 rounded border border-slate-800 bg-slate-950 text-left text-[10px] text-slate-200">+ AIO Hero Dial</button>
            <button onClick={addBox} className="w-full p-2 rounded border border-slate-800 bg-slate-950 text-left text-[10px] text-slate-200">+ Telemetry Value Box</button>
            <div className="text-[9px] font-mono text-slate-500 uppercase pt-2">Gauge styles</div>
            {GAUGE_STYLES_REGISTRY.map(style => <button key={style.id} onClick={() => addGauge(style.id)} className="w-full p-2 rounded border border-slate-800 bg-slate-950 text-left text-[10px] text-slate-200">+ {style.name}</button>)}
          </div>}
          {activePanel === 'templates' && <div className="space-y-2 max-h-[620px] overflow-y-auto">{AIDA64_PANEL_TEMPLATES.map(t => <button key={t.id} onClick={() => applyTemplate(t.id)} className="w-full p-2.5 rounded border border-slate-800 bg-slate-950 text-left"><div className="text-[10px] font-bold text-slate-200">{t.name}</div><div className="text-[9px] text-slate-500 mt-1">{t.width}×{t.height} · {t.items.length} elements</div></button>)}</div>}
          {activePanel === 'layers' && <div className="space-y-1 max-h-[620px] overflow-y-auto">{items.map((item, index) => <button key={item.id} onClick={() => setSelectedIds([item.id])} className={`w-full p-2 rounded border text-left ${selectedIds.includes(item.id) ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-slate-800 bg-slate-950'}`}><div className="text-[9px] text-slate-200 truncate">#{index + 1} {item.name}</div><div className="text-[8px] text-slate-600">{item.x},{item.y} · {item.width}×{item.height}</div></button>)}</div>}
        </aside>

        <main className="lg:col-span-6 bg-slate-950 border border-slate-800 rounded-lg p-3 overflow-auto min-h-[680px] flex items-start justify-center">
          <div ref={canvasRef} className="relative shrink-0 border border-slate-700 bg-[#05070e] shadow-2xl" style={{ width: screen.width, height: screen.height, transform: `scale(${zoom})`, transformOrigin: 'top center', backgroundImage: background ? `url(${background})` : undefined, backgroundSize: 'cover' }} onPointerDown={e => { if (e.target === e.currentTarget) setSelectedIds([]); }}>
            <div className="absolute inset-0 pointer-events-none opacity-10" style={{ backgroundImage: `linear-gradient(to right, #94a3b8 1px, transparent 1px), linear-gradient(to bottom, #94a3b8 1px, transparent 1px)`, backgroundSize: `${snapSize * 4}px ${snapSize * 4}px` }} />
            {items.map(renderItem)}
          </div>
        </main>

        <aside className="lg:col-span-3 bg-slate-900/90 border border-slate-800 rounded-lg p-3">
          {primary ? <div className="space-y-3">
            <div className="flex items-center justify-between"><span className="font-bold text-slate-200 text-xs">Inspector</span><span className="text-[9px] text-emerald-400 font-mono">{selected.length} selected</span></div>
            <input value={primary.name} onChange={e => updatePrimary({ name: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs font-mono text-slate-200" />
            <div className="grid grid-cols-2 gap-2">{(['x','y','width','height'] as const).map(key => <label key={key} className="text-[9px] font-mono text-slate-500">{key.toUpperCase()} PX<input type="number" value={primary[key]} onChange={e => updatePrimary({ [key]: Math.max(key === 'x' || key === 'y' ? 0 : MIN_SIZE, Number(e.target.value)) })} className="mt-1 w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-200" /></label>)}</div>
            <div className="border-t border-slate-800 pt-2 space-y-2"><div className="flex justify-between text-[9px] font-mono"><span className="text-slate-500">SCALE</span><span className="text-emerald-400">{Math.round((primary.scale || 1) * 100)}%</span></div><input type="range" min="0.1" max="4" step="0.05" value={primary.scale || 1} onChange={e => setScale(Number(e.target.value))} className="w-full accent-emerald-500" /><div className="flex gap-1 flex-wrap">{SCALE_PRESETS.map(v => <button key={v} onClick={() => setScale(v)} className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-[9px] text-slate-300">{Math.round(v * 100)}%</button>)}</div><label className="flex items-center gap-2 text-[9px] text-slate-400"><input type="checkbox" checked={aspectLocked} onChange={e => setAspectLocked(e.target.checked)} /> Lock aspect ratio while resizing</label></div>
            <div className="border-t border-slate-800 pt-2 grid grid-cols-3 gap-1"><button onClick={() => align('left')} disabled={selected.length < 2} className="p-1.5 bg-slate-950 border border-slate-800 rounded disabled:opacity-30"><AlignLeft className="w-3.5 h-3.5 mx-auto" /></button><button onClick={() => align('center')} disabled={selected.length < 2} className="p-1.5 bg-slate-950 border border-slate-800 rounded disabled:opacity-30"><AlignCenter className="w-3.5 h-3.5 mx-auto" /></button><button onClick={() => align('right')} disabled={selected.length < 2} className="p-1.5 bg-slate-950 border border-slate-800 rounded disabled:opacity-30"><AlignRight className="w-3.5 h-3.5 mx-auto" /></button><button onClick={() => align('top')} disabled={selected.length < 2} className="p-1.5 bg-slate-950 border border-slate-800 rounded disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5 mx-auto" /></button><button onClick={() => align('middle')} disabled={selected.length < 2} className="p-1.5 bg-slate-950 border border-slate-800 rounded disabled:opacity-30"><Maximize2 className="w-3.5 h-3.5 mx-auto" /></button><button onClick={() => align('bottom')} disabled={selected.length < 2} className="p-1.5 bg-slate-950 border border-slate-800 rounded disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5 mx-auto" /></button></div>
            <div className="grid grid-cols-3 gap-1"><button onClick={() => distribute('horizontal')} disabled={selected.length < 3} className="p-1.5 bg-slate-950 border border-slate-800 rounded text-[8px] disabled:opacity-30">Dist H</button><button onClick={() => distribute('vertical')} disabled={selected.length < 3} className="p-1.5 bg-slate-950 border border-slate-800 rounded text-[8px] disabled:opacity-30">Dist V</button><button onClick={() => matchSize('both')} disabled={selected.length < 2} className="p-1.5 bg-slate-950 border border-slate-800 rounded text-[8px] disabled:opacity-30">Match Size</button></div>
            <div className="flex gap-1"><button onClick={() => bringForward('down')} className="flex-1 p-1.5 bg-slate-950 border border-slate-800 rounded text-[9px]">Down</button><button onClick={() => bringForward('up')} className="flex-1 p-1.5 bg-slate-950 border border-slate-800 rounded text-[9px]">Up</button></div>
            <div className="flex gap-1"><button onClick={duplicateSelected} className="flex-1 p-1.5 bg-slate-800 rounded text-[9px] flex items-center justify-center gap-1"><Copy className="w-3 h-3" />Duplicate</button><button onClick={deleteSelected} className="flex-1 p-1.5 bg-rose-950/60 border border-rose-800 rounded text-[9px] flex items-center justify-center gap-1"><Trash2 className="w-3 h-3" />Delete</button></div>
            <label className="flex items-center gap-2 text-[9px] text-slate-400"><input type="checkbox" checked={!!primary.locked} onChange={e => updatePrimary({ locked: e.target.checked })} /> {primary.locked ? 'Locked' : 'Unlocked'}</label>
            <div className="grid grid-cols-2 gap-1"><label className="text-[9px] text-slate-500">Sensor Label<input value={primary.sensorType} onChange={e => updatePrimary({ sensorType: e.target.value })} className="mt-1 w-full bg-slate-950 border border-slate-800 rounded p-1 text-[10px] text-slate-200" /></label><label className="text-[9px] text-slate-500">Test value<input value={primary.testValue} onChange={e => updatePrimary({ testValue: e.target.value })} className="mt-1 w-full bg-slate-950 border border-slate-800 rounded p-1 text-[10px] text-slate-200" /></label></div>
            <div className="border-t border-slate-800 pt-2 space-y-2"><div className="text-[9px] font-mono text-emerald-400">LIVE AIDA64 BINDING</div><select value={primary.sensorBinding?.sensorId || ''} onChange={e => { const sensor = aida64Telemetry?.sensors.find(s => s.id === e.target.value); if (!sensor) { updatePrimary({ sensorBinding: undefined }); return; } const current = primary.sensorBinding; updatePrimary({ sensorType: sensor.label, unit: sensor.unit, sensorBinding: { sensorId: sensor.id, label: sensor.label, min: current?.min ?? 0, max: current?.max ?? (sensor.unit === '%' ? 100 : 100), warning: current?.warning, critical: current?.critical, smoothingMs: current?.smoothingMs ?? 150, peakHold: current?.peakHold ?? false, peakDecayMs: current?.peakDecayMs ?? 2000, normalisation: current?.normalisation ?? 'linear', staleTimeoutMs: current?.staleTimeoutMs ?? 2000 } }); }} className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-[10px] text-slate-200"><option value="">Manual / test value</option>{(aida64Telemetry?.sensors || []).map(sensor => <option key={sensor.id} value={sensor.id}>{sensor.label} · {sensor.value}{sensor.unit}</option>)}</select>{primary.sensorBinding && <div className="grid grid-cols-2 gap-1"><label className="text-[8px] text-slate-500">MIN<input type="number" value={primary.sensorBinding.min} onChange={e => updatePrimary({ sensorBinding: { ...primary.sensorBinding!, min: Number(e.target.value) } })} className="mt-1 w-full bg-slate-950 border border-slate-800 rounded p-1 text-[10px] text-slate-200" /></label><label className="text-[8px] text-slate-500">MAX<input type="number" value={primary.sensorBinding.max} onChange={e => updatePrimary({ sensorBinding: { ...primary.sensorBinding!, max: Number(e.target.value) } })} className="mt-1 w-full bg-slate-950 border border-slate-800 rounded p-1 text-[10px] text-slate-200" /></label><label className="text-[8px] text-slate-500">WARNING<input type="number" value={primary.sensorBinding.warning ?? ''} onChange={e => updatePrimary({ sensorBinding: { ...primary.sensorBinding!, warning: e.target.value === '' ? undefined : Number(e.target.value) } })} className="mt-1 w-full bg-slate-950 border border-slate-800 rounded p-1 text-[10px] text-slate-200" /></label><label className="text-[8px] text-slate-500">CRITICAL<input type="number" value={primary.sensorBinding.critical ?? ''} onChange={e => updatePrimary({ sensorBinding: { ...primary.sensorBinding!, critical: e.target.value === '' ? undefined : Number(e.target.value) } })} className="mt-1 w-full bg-slate-950 border border-slate-800 rounded p-1 text-[10px] text-slate-200" /></label></div>}
            </div>
            <label className="text-[9px] text-slate-500">Colour<input type="color" value={primary.color || '#ef4444'} onChange={e => updatePrimary({ color: e.target.value })} className="mt-1 w-full h-7 bg-slate-950 border border-slate-800 rounded" /></label>
          </div> : <div className="py-16 text-center text-slate-500"><MousePointer2 className="w-8 h-8 mx-auto mb-2" /><div className="text-xs">Select an element to edit exact position, pixel size, scale and sensor binding.</div></div>}
        </aside>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 border border-slate-800 rounded-lg p-2"><div className="text-[9px] font-mono text-slate-500">{screen.width}×{screen.height}px · {items.length} elements · {selected.length} selected</div><div className="flex gap-1.5"><button onClick={copyCoords} className="px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-[9px] flex items-center gap-1">{copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}{copied ? 'Copied' : 'Copy Coords'}</button><button onClick={exportJson} className="px-2 py-1.5 bg-emerald-700 rounded text-[9px] flex items-center gap-1"><Download className="w-3 h-3" />Export JSON</button></div></div>
    </div>
  );
};
