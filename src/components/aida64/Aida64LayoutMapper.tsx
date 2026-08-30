import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Copy, Check, Eye, EyeOff, Layout, Move, Sliders, Sparkles, Monitor, Download,
  ArrowUpRight, ShieldCheck, Plus, Trash2, Copy as DuplicateIcon, Lock, Unlock,
  Maximize2, ZoomIn, ZoomOut, RotateCcw, Upload, Grid, Layers, Palette,
  ChevronDown, ArrowUp, ArrowDown, AlignLeft, AlignCenter, AlignRight, Gauge,
  Activity, Cpu, HardDrive, Wifi, Zap, Thermometer, Wind, Undo, Redo,
  CheckCircle2, CornerDownRight, Box, Text, FileText, Image, RefreshCw,
  FolderOpen, SlidersHorizontal, MousePointer, Disc, Battery, Clock,
  Wand2, FileArchive, Play, Radio, ChevronRight
} from 'lucide-react';
import {
  AIDA64_SCREEN_PRESETS,
  AIDA64_PANEL_TEMPLATES,
  AIDA64_SHAPES_CATALOG,
  AIDA64_THEMES,
  DEFAULT_GAUGE_CONFIG,
  GAUGE_STYLES_REGISTRY,
  Aida64ShapeDefinition
} from '../../data/aida64Presets';
import {
  Aida64PanelItem,
  SystemTelemetry,
  Aida64ScreenPreset,
  Aida64GaugeStyle,
  Aida64ShapeType
} from '../../types';
import { SimpleZip } from '../../utils/zipWriter';
import {
  compileLayoutToSpatialPrompt,
  renderLayoutControlMaskCanvas,
  generateAida64CoordinateSheet,
  renderLayoutChassisArtworkCanvas,
  compositeLayoutOntoImage
} from '../../utils/aida64LayoutCompiler';
import { useProjectState } from '../../context/ProjectStateContext';

interface Aida64LayoutMapperProps {
  telemetry?: SystemTelemetry;
  backgroundUrl?: string;
  injectedItem?: Aida64PanelItem | null;
  onItemInjectedAck?: () => void;
  onSendToPromptStudio?: (prompt: string, width: number, height: number) => void;
}

const PRESET_COLORS = [
  { label: 'Crimson Red', value: '#ef4444' },
  { label: 'Cyber Cyan', value: '#06b6d4' },
  { label: 'Hazard Amber', value: '#f59e0b' },
  { label: 'Matrix Emerald', value: '#10b981' },
  { label: 'Electric Purple', value: '#a855f7' },
  { label: 'Titanium White', value: '#ffffff' },
  { label: 'Neon Blue', value: '#3b82f6' },
  { label: 'Slate Gray', value: '#94a3b8' }
];

const GRID_SNAP_OPTIONS = [
  { label: '1px (Off)', value: 1 },
  { label: '4px', value: 4 },
  { label: '8px', value: 8 },
  { label: '10px', value: 10 },
  { label: '16px', value: 16 },
  { label: '20px', value: 20 }
];

export const Aida64LayoutMapper: React.FC<Aida64LayoutMapperProps> = ({
  telemetry,
  backgroundUrl,
  injectedItem,
  onItemInjectedAck,
  onSendToPromptStudio
}) => {
  const [selectedScreen, setSelectedScreen] = useState<Aida64ScreenPreset>(AIDA64_SCREEN_PRESETS[0]);
  const [items, setItems] = useState<Aida64PanelItem[]>(() => {
    const saved = localStorage.getItem('aida64_custom_layout');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        // fallback
      }
    }
    // Default to reference photo template
    return AIDA64_PANEL_TEMPLATES[0].items;
  });

  // Selection & History State
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([items[0]?.id || '']);
  const [history, setHistory] = useState<Aida64PanelItem[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Viewport & Tools State
  const [activeTab, setActiveTab] = useState<'shapes' | 'boxes' | 'dials' | 'templates' | 'gauges_100' | 'layers' | 'inspector'>('shapes');
  const [showLiveTelemetry, setShowLiveTelemetry] = useState<boolean>(false);
  const [showControlMaskMode, setShowControlMaskMode] = useState<boolean>(false);
  const [showGridLines, setShowGridLines] = useState<boolean>(true);
  const [gridSnap, setGridSnap] = useState<number>(8);
  const [zoomScale, setZoomScale] = useState<number>(0.85);
  const [activeCustomBg, setActiveCustomBg] = useState<string | undefined>(backgroundUrl);
  const [copiedCoords, setCopiedCoords] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 100-State Gauge Configuration State
  const [gaugeTestPercent, setGaugeTestPercent] = useState<number>(65);
  const [selectedGaugeStyle, setSelectedGaugeStyle] = useState<Aida64GaugeStyle>('segmented_arc');
  const [isExportingGaugeZip, setIsExportingGaugeZip] = useState<boolean>(false);

  const { projectState, setActiveAida64Layout, setSavedAssets } = useProjectState();

  // AI Layout Generator Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [selectedThemeId, setSelectedThemeId] = useState<string>('cyberpunk_red');
  const [customPromptText, setCustomPromptText] = useState<string>('');
  const [maskColorCode, setMaskColorCode] = useState<boolean>(false);
  const [selectedFuseAssetId, setSelectedFuseAssetId] = useState<string>('');

  // Canvas interaction refs & state
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const chassisPreviewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Dragging & 8-Point Resizing State
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeResizeHandle, setActiveResizeHandle] = useState<string | null>(null);
  const [resizeInitial, setResizeInitial] = useState<{
    mouseX: number;
    mouseY: number;
    itemsMap: Record<string, { x: number; y: number; width: number; height: number }>;
  }>({ mouseX: 0, mouseY: 0, itemsMap: {} });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Push new state into history stack
  const pushHistory = useCallback((newItems: Aida64PanelItem[]) => {
    setHistory(prev => {
      const upToCurrent = prev.slice(0, historyIndex + 1);
      return [...upToCurrent, newItems];
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  // Undo action
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevStep = history[historyIndex - 1];
      setItems(prevStep);
      setHistoryIndex(historyIndex - 1);
      showToast('Undo performed');
    }
  }, [history, historyIndex]);

  // Redo action
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextStep = history[historyIndex + 1];
      setItems(nextStep);
      setHistoryIndex(historyIndex + 1);
      showToast('Redo performed');
    }
  }, [history, historyIndex]);

  // Initialize first history entry
  useEffect(() => {
    if (history.length === 0 && items.length > 0) {
      setHistory([items]);
      setHistoryIndex(0);
    }
  }, [history.length, items]);

  // Handle injected item from Gauge Generator or Pod Designer
  useEffect(() => {
    if (injectedItem) {
      setItems(prev => {
        const next = [...prev, injectedItem];
        pushHistory(next);
        return next;
      });
      setSelectedItemIds([injectedItem.id]);
      setActiveTab('inspector');
      showToast(`Inserted "${injectedItem.name}" onto Canvas!`);
      if (onItemInjectedAck) onItemInjectedAck();
    }
  }, [injectedItem, onItemInjectedAck, pushHistory]);

  // Update background when prop changes
  useEffect(() => {
    if (backgroundUrl) {
      setActiveCustomBg(backgroundUrl);
    }
  }, [backgroundUrl]);

  // Persist layout to local storage
  useEffect(() => {
    try {
      localStorage.setItem('aida64_custom_layout', JSON.stringify(items));
    } catch (e) {
      // ignore
    }
  }, [items]);

  // Grid Snap helper
  const snap = (val: number, snapSize: number) => {
    if (snapSize <= 1) return Math.round(val);
    return Math.round(val / snapSize) * snapSize;
  };

  // Primary selected item
  const primarySelectedId = selectedItemIds[0] || null;
  const primarySelectedItem = items.find(i => i.id === primarySelectedId) || null;

  // Multi-item updater
  const updateItems = (ids: string[], updates: Partial<Aida64PanelItem> | ((item: Aida64PanelItem) => Partial<Aida64PanelItem>)) => {
    const updated = items.map(item => {
      if (ids.includes(item.id)) {
        const patch = typeof updates === 'function' ? updates(item) : updates;
        return { ...item, ...patch };
      }
      return item;
    });
    setItems(updated);
    pushHistory(updated);
  };

  // Single item updater helper
  const updateSingleItem = (id: string, updates: Partial<Aida64PanelItem>) => {
    updateItems([id], updates);
  };

  // Duplicate selected items
  const handleDuplicate = useCallback(() => {
    if (selectedItemIds.length === 0) return;
    const newItems: Aida64PanelItem[] = [];
    const newIds: string[] = [];

    items.forEach(item => {
      newItems.push(item);
      if (selectedItemIds.includes(item.id)) {
        const dupeId = `${item.id}_copy_${Date.now()}`;
        newIds.push(dupeId);
        newItems.push({
          ...item,
          id: dupeId,
          name: `${item.name} (Copy)`,
          x: item.x + 20,
          y: item.y + 20
        });
      }
    });

    setItems(newItems);
    setSelectedItemIds(newIds);
    pushHistory(newItems);
    showToast(`Duplicated ${newIds.length} item(s)`);
  }, [items, selectedItemIds, pushHistory]);

  // Delete selected items
  const handleDelete = useCallback(() => {
    if (selectedItemIds.length === 0) return;
    const filtered = items.filter(i => !selectedItemIds.includes(i.id));
    setItems(filtered);
    setSelectedItemIds([]);
    pushHistory(filtered);
    showToast(`Removed selected item(s)`);
  }, [items, selectedItemIds, pushHistory]);

  // Keyboard Shortcuts (Arrow keys, Shift+Arrows, Del, Ctrl+D, Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicate();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDelete();
        return;
      }

      // Nudge position with arrow keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedItemIds.length > 0) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;
        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;

        updateItems(selectedItemIds, (item) => ({
          x: Math.max(0, Math.min(selectedScreen.width - item.width, item.x + dx)),
          y: Math.max(0, Math.min(selectedScreen.height - item.height, item.y + dy))
        }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItemIds, selectedScreen, handleUndo, handleRedo, handleDuplicate, handleDelete]);

  // Add Shape Definition from Catalog
  const handleAddShape = (shapeDef: Aida64ShapeDefinition) => {
    const newId = `shape_${shapeDef.shapeType}_${Date.now()}`;
    const x = Math.round(selectedScreen.width / 2 - shapeDef.defaultWidth / 2);
    const y = Math.round(selectedScreen.height / 2 - shapeDef.defaultHeight / 2);
    const newItem = shapeDef.factoryItem(newId, x, y);

    setItems(prev => {
      const next = [...prev, newItem];
      pushHistory(next);
      return next;
    });
    setSelectedItemIds([newId]);
    setActiveTab('inspector');
    showToast(`Added "${shapeDef.name}" to canvas!`);
  };

  // Add Specialized Dial
  const handleAddDial = (type: 'left_cpu' | 'right_gpu' | 'center_aio') => {
    const dialId = `dial_${type}_${Date.now()}`;
    let x = 50;
    let y = 180;
    let name = 'CPU Dial Socket';
    let sensorType = 'CPU %';
    let color = '#ef4444';
    let size = 240;

    if (type === 'right_gpu') {
      x = selectedScreen.width - size - 50;
      name = 'GPU Dial Socket';
      sensorType = 'GPU %';
      color = '#ef4444';
    } else if (type === 'center_aio') {
      x = Math.round(selectedScreen.width / 2 - size / 2);
      y = Math.round(selectedScreen.height / 2 - size / 2);
      name = 'AIO Hero Dial Socket';
      sensorType = 'CPU TEMP';
      color = '#06b6d4';
      size = 320;
    }

    const newDial: Aida64PanelItem = {
      id: dialId,
      name,
      type: 'dial',
      shapeType: 'dial_circle',
      x,
      y,
      width: size,
      height: size,
      sensorType,
      testValue: type === 'center_aio' ? '54' : '14',
      unit: type === 'center_aio' ? '°C' : '%',
      color,
      scale: 1,
      gaugePercent: type === 'center_aio' ? 54 : 14,
      gaugeStyle: selectedGaugeStyle,
      bannerTitle: type === 'right_gpu' ? 'GPU' : 'CPU'
    };

    setItems(prev => {
      const next = [...prev, newDial];
      pushHistory(next);
      return next;
    });
    setSelectedItemIds([dialId]);
    setActiveTab('inspector');
    showToast(`Added ${name} (${size}x${size}px) to canvas!`);
  };

  // Add individual standalone or inside-dial Value Box
  const handleAddValueBox = (boxShape: 'chamfer' | 'hexagon' | 'cut_corner' | 'pill' | 'bracket' | 'rectangle', targetDialId?: string) => {
    const boxId = `box_${boxShape}_${Date.now()}`;
    let x = 120;
    let y = 120;
    let w = 110;
    let h = 44;
    let sensor = 'CPU CLOCK';
    let name = `${boxShape.charAt(0).toUpperCase() + boxShape.slice(1)} Value Box`;
    let color = '#ef4444';

    if (boxShape === 'hexagon') {
      w = 100; h = 50; sensor = 'CPU TEMP'; color = '#06b6d4';
    } else if (boxShape === 'cut_corner') {
      w = 120; h = 46; sensor = 'CPU VOLT'; color = '#f59e0b';
    } else if (boxShape === 'pill') {
      w = 100; h = 38; sensor = 'FAN RPM'; color = '#10b981';
    } else if (boxShape === 'bracket') {
      w = 110; h = 42; sensor = 'POWER'; color = '#a855f7';
    }

    if (targetDialId) {
      const targetDial = items.find(i => i.id === targetDialId);
      if (targetDial) {
        x = targetDial.x + Math.round((targetDial.width - w) / 2);
        y = targetDial.y + Math.round((targetDial.height - h) / 2);
        name = `${targetDial.name.split(' ')[0]} ${sensor} Box`;
      }
    } else if (selectedItemIds.length === 1) {
      const targetDial = items.find(i => i.id === selectedItemIds[0] && (i.type === 'dial' || i.shapeType === 'dial_circle' || i.shapeType === 'dial_with_boxes'));
      if (targetDial) {
        x = targetDial.x + Math.round((targetDial.width - w) / 2);
        y = targetDial.y + Math.round((targetDial.height - h) / 2);
        name = `${targetDial.name.split(' ')[0]} ${sensor} Box`;
      }
    }

    const newBox: Aida64PanelItem = {
      id: boxId,
      name,
      type: 'value_box',
      shapeType: `box_${boxShape}` as Aida64ShapeType,
      boxShape,
      x,
      y,
      width: w,
      height: h,
      sensorType: sensor,
      testValue: sensor === 'CPU TEMP' ? '61' : sensor === 'CPU VOLT' ? '1.26' : '4464',
      unit: sensor === 'CPU TEMP' ? '°C' : sensor === 'CPU VOLT' ? 'V' : 'MHz',
      color,
      scale: 1,
      zIndex: 20
    };

    setItems(prev => {
      const next = [...prev, newBox];
      pushHistory(next);
      return next;
    });
    setSelectedItemIds([boxId]);
    setActiveTab('inspector');
    showToast(`Added ${name} (${boxShape})!`);
  };

  // Apply complete panel template
  const handleApplyTemplate = (templateId: string) => {
    const tmpl = AIDA64_PANEL_TEMPLATES.find(t => t.id === templateId);
    if (!tmpl) return;

    const matchedScreen = AIDA64_SCREEN_PRESETS.find(s => s.id === tmpl.resolutionId) || {
      id: tmpl.resolutionId,
      label: `${tmpl.width} × ${tmpl.height}`,
      width: tmpl.width,
      height: tmpl.height,
      diagonal: 'Custom',
      category: 'standard',
      description: tmpl.description
    };

    setSelectedScreen(matchedScreen as Aida64ScreenPreset);
    setItems(tmpl.items);
    setSelectedItemIds([tmpl.items[0]?.id || '']);
    pushHistory(tmpl.items);
    showToast(`Applied "${tmpl.name}" layout template!`);
  };

  // Mouse Handlers for Dragging & 8-Point Resizing
  const handleItemMouseDown = (e: React.MouseEvent, item: Aida64PanelItem) => {
    e.stopPropagation();
    if (item.locked) return;

    if (e.shiftKey) {
      setSelectedItemIds(prev =>
        prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
      );
    } else {
      if (!selectedItemIds.includes(item.id)) {
        setSelectedItemIds([item.id]);
      }
    }

    setIsDragging(true);
    setDragOffset({ x: e.clientX, y: e.clientY });
  };

  const handleResizeHandleMouseDown = (e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    setActiveResizeHandle(handle);
    const itemsMap: Record<string, { x: number; y: number; width: number; height: number }> = {};
    items.forEach(i => {
      if (selectedItemIds.includes(i.id)) {
        itemsMap[i.id] = { x: i.x, y: i.y, width: i.width, height: i.height };
      }
    });
    setResizeInitial({
      mouseX: e.clientX,
      mouseY: e.clientY,
      itemsMap
    });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    // 1. Handle Dragging Position
    if (isDragging && selectedItemIds.length > 0) {
      const dx = (e.clientX - dragOffset.x) / zoomScale;
      const dy = (e.clientY - dragOffset.y) / zoomScale;

      if (Math.abs(dx) >= 1 || Math.abs(dy) >= 1) {
        updateItems(selectedItemIds, (item) => {
          const newX = snap(item.x + dx, gridSnap);
          const newY = snap(item.y + dy, gridSnap);
          return {
            x: Math.max(0, Math.min(selectedScreen.width - item.width, newX)),
            y: Math.max(0, Math.min(selectedScreen.height - item.height, newY))
          };
        });
        setDragOffset({ x: e.clientX, y: e.clientY });
      }
    }

    // 2. Handle 8-Point Resizing
    if (activeResizeHandle && selectedItemIds.length > 0) {
      const dx = (e.clientX - resizeInitial.mouseX) / zoomScale;
      const dy = (e.clientY - resizeInitial.mouseY) / zoomScale;

      updateItems(selectedItemIds, (item) => {
        const init = resizeInitial.itemsMap[item.id];
        if (!init) return {};

        let newX = init.x;
        let newY = init.y;
        let newW = init.width;
        let newH = init.height;

        if (activeResizeHandle.includes('e')) newW = snap(init.width + dx, gridSnap);
        if (activeResizeHandle.includes('s')) newH = snap(init.height + dy, gridSnap);
        if (activeResizeHandle.includes('w')) {
          const widthDelta = snap(dx, gridSnap);
          newW = init.width - widthDelta;
          newX = init.x + widthDelta;
        }
        if (activeResizeHandle.includes('n')) {
          const heightDelta = snap(dy, gridSnap);
          newH = init.height - heightDelta;
          newY = init.y + heightDelta;
        }

        // Maintain square aspect ratio for circular dials
        if (item.type === 'dial' || item.shapeType === 'dial_circle' || item.aspectRatioLocked) {
          const maxDim = Math.max(newW, newH);
          newW = maxDim;
          newH = maxDim;
        }

        return {
          x: Math.max(0, newX),
          y: Math.max(0, newY),
          width: Math.max(20, newW),
          height: Math.max(20, newH)
        };
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
    setActiveResizeHandle(null);
  };

  // Compile Spatial Prompt for AI Generation
  const compiledPrompt = compileLayoutToSpatialPrompt(
    selectedScreen,
    items,
    selectedThemeId,
    customPromptText.trim() ? customPromptText : undefined
  );

  // Re-render live chassis artwork preview whenever modal is open or settings change
  useEffect(() => {
    if (isAiModalOpen && chassisPreviewCanvasRef.current) {
      renderLayoutChassisArtworkCanvas(
        chassisPreviewCanvasRef.current,
        selectedScreen,
        items,
        selectedThemeId
      );
    }
  }, [isAiModalOpen, selectedThemeId, items, selectedScreen]);

  // 1. Instant Precision Chassis Backplate Render & Apply (100% Exact Coordinates)
  const handleRenderPrecisionChassisArtwork = (applyAsCanvasBg = true, download = true) => {
    const canvas = document.createElement('canvas');
    renderLayoutChassisArtworkCanvas(canvas, selectedScreen, items, selectedThemeId);

    const url = canvas.toDataURL('image/png');

    if (applyAsCanvasBg) {
      setActiveCustomBg(url);
    }

    // Save into asset library
    const asset = {
      id: `chassis-${Date.now()}`,
      title: `AIDA64 Chassis ${selectedScreen.width}x${selectedScreen.height} (${selectedThemeId})`,
      type: 'image' as const,
      url: url,
      fileFormat: 'PNG',
      timestamp: new Date().toISOString(),
      promptUsed: compiledPrompt.prompt
    };
    setSavedAssets(prev => [asset, ...prev]);

    if (download) {
      const a = document.createElement('a');
      a.href = url;
      a.download = `AIDA64_Chassis_${selectedScreen.width}x${selectedScreen.height}_${selectedThemeId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    showToast('⚡ Precision Chassis Backplate rendered at 100% exact layout coordinates!');
  };

  // 2. Transfer Prompt and Register Active Layout for AI Studio Generation
  const handleLaunchAiGeneration = () => {
    // Register active template layout so Create Studio knows exact dial positions
    setActiveAida64Layout({
      screen: { width: selectedScreen.width, height: selectedScreen.height, label: selectedScreen.label },
      items: items,
      themeId: selectedThemeId,
      timestamp: new Date().toISOString()
    });

    if (onSendToPromptStudio) {
      onSendToPromptStudio(compiledPrompt.prompt, selectedScreen.width, selectedScreen.height);
      setIsAiModalOpen(false);
      showToast(`Registered exact layout coordinates and transferred prompt to Image Creator Studio!`);
    }
  };

  // 3. Fuse Layout Bezels onto an Existing Image
  const handleFuseWithSelectedImage = async (imageUrl: string) => {
    try {
      showToast('Fusing exact layout dials onto selected image…');
      const fusedUrl = await compositeLayoutOntoImage(
        imageUrl,
        selectedScreen,
        items,
        selectedThemeId
      );

      setActiveCustomBg(fusedUrl);

      const asset = {
        id: `fused-chassis-${Date.now()}`,
        title: `AIDA64 Fused Chassis ${selectedScreen.width}x${selectedScreen.height}`,
        type: 'image' as const,
        url: fusedUrl,
        fileFormat: 'PNG',
        timestamp: new Date().toISOString(),
        promptUsed: compiledPrompt.prompt
      };
      setSavedAssets(prev => [asset, ...prev]);

      setIsAiModalOpen(false);
      showToast('✨ Successfully fused exact template layout onto image!');
    } catch (err: any) {
      console.error(err);
      showToast('Failed to fuse layout onto image: ' + err.message);
    }
  };

  // Render & Download Layout Control Mask PNG
  const handleDownloadControlMask = () => {
    const canvas = document.createElement('canvas');
    renderLayoutControlMaskCanvas(canvas, selectedScreen, items, {
      colorCode: maskColorCode,
      highContrast: true
    });

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `AIDA64_ControlMask_${selectedScreen.width}x${selectedScreen.height}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Layout Control Mask PNG downloaded!');
  };

  // Export 100-State Dial Gauge Set ZIP
  const handleExport100StateDialZip = async () => {
    setIsExportingGaugeZip(true);
    try {
      const zip = new SimpleZip();
      const dialItem = items.find(i => i.type === 'dial' || i.shapeType === 'dial_circle') || {
        width: 300,
        height: 300,
        color: '#ef4444'
      };

      const canvas = document.createElement('canvas');
      const size = Math.max(100, dialItem.width);
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      const center = size / 2;
      const radius = size * 0.42;

      for (let frame = 0; frame <= 100; frame++) {
        ctx.clearRect(0, 0, size, size);

        // Background track
        ctx.beginPath();
        ctx.arc(center, center, radius, Math.PI * 0.75, Math.PI * 2.25);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = size * 0.08;
        ctx.stroke();

        // Active state arc
        const endAngle = Math.PI * 0.75 + (Math.PI * 1.5 * (frame / 100));
        ctx.beginPath();
        ctx.arc(center, center, radius, Math.PI * 0.75, endAngle);
        ctx.strokeStyle = dialItem.color || '#ef4444';
        ctx.lineWidth = size * 0.08;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Center percentage readout
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(size * 0.22)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${frame}%`, center, center);

        const dataUrl = canvas.toDataURL('image/png');
        const base64Data = dataUrl.split(',')[1];
        const binaryStr = atob(base64Data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let b = 0; b < binaryStr.length; b++) {
          bytes[b] = binaryStr.charCodeAt(b);
        }

        zip.addFile(`${frame}.png`, bytes);
      }

      // Add README info
      zip.addFile(
        'README.txt',
        `AIDA64 100-State Gauge Sequence\nResolution: ${size}x${size} px\nFrames: 0.png - 100.png\nImport directly into AIDA64 SensorPanel via "Gauge" -> "Image Sequence".`
      );

      const blob = zip.generateBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AIDA64_Gauge_100Frames_${size}x${size}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('100-State Gauge ZIP successfully exported!');
    } catch (err: any) {
      showToast(`Export error: ${err.message}`);
    } finally {
      setIsExportingGaugeZip(false);
    }
  };

  // Export AIDA64 Coordinates Sheet
  const handleCopyAida64Coords = () => {
    const sheet = generateAida64CoordinateSheet(selectedScreen, items);
    navigator.clipboard.writeText(sheet.txt);
    setCopiedCoords(true);
    showToast('AIDA64 Coordinates Table copied to clipboard!');
    setTimeout(() => setCopiedCoords(false), 2500);
  };

  // Export JSON Manifest
  const handleExportJson = () => {
    const sheet = generateAida64CoordinateSheet(selectedScreen, items);
    const blob = new Blob([sheet.json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AIDA64_Layout_${selectedScreen.width}x${selectedScreen.height}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Layout JSON exported successfully!');
  };

  // Clear canvas to completely blank template
  const handleClearCanvas = () => {
    setItems([]);
    setSelectedItemIds([]);
    pushHistory([]);
    showToast('Clean blank canvas ready');
  };

  // Render Element on Canvas (Clean Blueprint Wireframe Mode: Zero Mock Numbers, Clean Bezels)
  const renderItemElement = (item: Aida64PanelItem) => {
    const isSelected = selectedItemIds.includes(item.id);
    const isDial = item.type === 'dial' || item.shapeType === 'dial_circle' || item.shapeType === 'dial_with_boxes';
    const isValueBox = item.type === 'value_box' || (item.shapeType && item.shapeType.startsWith('box_'));

    // High-Contrast Control Mask Mode rendering (for AI generation mask)
    if (showControlMaskMode) {
      const isCircle = isDial;
      const isTempWing = item.shapeType === 'temp_wing_angled';
      const isBanner = item.shapeType === 'voltage_wattage_banner';
      const isRam = item.shapeType === 'ram_stick_module';
      const isArt = item.shapeType === 'avatar_stage_cutout';

      return (
        <div
          key={item.id}
          onMouseDown={(e) => handleItemMouseDown(e, item)}
          style={{
            position: 'absolute',
            left: `${item.x}px`,
            top: `${item.y}px`,
            width: `${item.width}px`,
            height: `${item.height}px`,
            zIndex: item.zIndex || 10,
            cursor: item.locked ? 'default' : 'move'
          }}
          className={`select-none ${isSelected ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-black z-40' : ''}`}
        >
          {isCircle ? (
            <div className="w-full h-full rounded-full bg-[#1a202c] border-2 border-[#4a5568] flex items-center justify-center relative shadow-lg">
              <div className="w-3/4 h-3/4 rounded-full bg-[#0d1117] border border-[#2d3748] flex items-center justify-center">
                <span className="text-[10px] font-mono font-bold text-slate-400 text-center px-1">
                  {item.name}
                </span>
              </div>
            </div>
          ) : isTempWing ? (
            <div className="w-full h-full bg-[#1a202c] border-2 border-[#4a5568] rounded-r-2xl rounded-l-md flex items-center justify-between px-3 relative shadow-lg">
              <span className="text-[10px] font-mono font-bold text-slate-300 truncate">{item.name}</span>
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm" />
            </div>
          ) : isBanner ? (
            <div className="w-full h-full bg-[#1a202c] border-2 border-[#4a5568] rounded flex items-center justify-center px-2 relative shadow-lg">
              <span className="text-[10px] font-mono font-bold text-slate-300 truncate">{item.name}</span>
            </div>
          ) : isRam ? (
            <div className="w-full h-full bg-[#1a202c] border-2 border-[#4a5568] rounded flex flex-col justify-between p-1 relative shadow-lg">
              <div className="w-full h-1.5 bg-[#4a5568] rounded" />
              <span className="text-[10px] font-mono font-bold text-slate-300 text-center truncate">{item.name}</span>
            </div>
          ) : isArt ? (
            <div className="w-full h-full bg-[#0d1117] border-2 border-dashed border-[#4a5568] rounded flex items-center justify-center p-2 relative">
              <span className="text-[10px] font-mono font-bold text-slate-500 text-center">ART CUTOUT STAGE</span>
            </div>
          ) : (
            <div className="w-full h-full bg-[#1a202c] border-2 border-[#4a5568] rounded flex items-center justify-center p-1 relative shadow-lg">
              <span className="text-[10px] font-mono font-bold text-slate-300 text-center truncate">{item.name}</span>
            </div>
          )}
        </div>
      );
    }

    // Standard Clean Blueprint Wireframe Mode
    return (
      <div
        key={item.id}
        onMouseDown={(e) => handleItemMouseDown(e, item)}
        style={{
          position: 'absolute',
          left: `${item.x}px`,
          top: `${item.y}px`,
          width: `${item.width}px`,
          height: `${item.height}px`,
          zIndex: item.zIndex || (isDial ? 5 : 15),
          cursor: item.locked ? 'default' : 'move'
        }}
        className={`group select-none transition-shadow ${
          isSelected
            ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-slate-950 shadow-2xl z-40'
            : 'hover:ring-1 hover:ring-sky-400/70'
        }`}
      >
        {/* Render Clean Circular Dial Bezel */}
        {isDial ? (
          <div className="w-full h-full rounded-full border-2 border-slate-600/90 bg-slate-950/80 shadow-2xl relative flex items-center justify-center overflow-hidden backdrop-blur-xs">
            {/* Outer Concentric Bezel Ring Accent */}
            <div className="absolute inset-1.5 rounded-full border border-slate-700/60 pointer-events-none" />
            <div className="absolute inset-4 rounded-full border border-dashed border-slate-800/60 pointer-events-none" />

            {/* Subtle Center Crosshairs Guide */}
            <div className="absolute w-full h-[1px] bg-slate-800/30 pointer-events-none" />
            <div className="absolute h-full w-[1px] bg-slate-800/30 pointer-events-none" />
            <div className="w-5 h-5 rounded-full border border-slate-700/50 bg-slate-900/50 pointer-events-none" />

            {/* Top Bezel Pill Label */}
            <div className="absolute top-2.5 px-2.5 py-0.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-[8px] font-mono text-slate-300 font-bold uppercase tracking-wider shadow-sm pointer-events-none flex items-center gap-1">
              <span>{item.name || 'CIRCLE BEZEL'}</span>
              {item.locked && <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
            </div>

            {/* Bottom Coordinate & Dimension Badge */}
            <div className="absolute bottom-2.5 px-1.5 py-0.5 rounded bg-slate-900/80 text-[7px] font-mono text-slate-500 pointer-events-none">
              {item.width}×{item.height}px
            </div>
          </div>
        ) : isValueBox ? (
          /* Render Clean Geometric Value Boxes (8 Shapes: Chamfer, Hexagon, Cut Corner, Pill, Bracket, Rectangle) */
          <div className="w-full h-full relative flex items-center justify-center p-0.5">
            {item.boxShape === 'chamfer' || item.shapeType === 'box_chamfer' ? (
              <div className="w-full h-full flex flex-col items-center justify-center border-2 border-slate-600 bg-slate-950/90 [clip-path:polygon(8px_0%,calc(100%-8px)_0%,100%_8px,100%_calc(100%-8px),calc(100%-8px)_100%,8px_100%,0%_calc(100%-8px),0%_8px)] p-1 shadow-md">
                <span className="text-[9px] font-mono font-bold text-slate-200 tracking-wider uppercase text-center px-1 truncate max-w-full">
                  {item.sensorType || item.name || 'CHAMFER BOX'}
                </span>
                <span className="text-[7px] font-mono text-slate-500">{item.width}×{item.height}</span>
              </div>
            ) : item.boxShape === 'hexagon' || item.shapeType === 'box_hexagon' ? (
              <div className="w-full h-full flex flex-col items-center justify-center border-2 border-cyan-700/80 bg-slate-950/90 [clip-path:polygon(12px_0%,calc(100%-12px)_0%,100%_50%,calc(100%-12px)_100%,12px_100%,0%_50%)] p-1 shadow-md">
                <span className="text-[9px] font-mono font-bold text-cyan-300 tracking-wider uppercase text-center px-1 truncate max-w-full">
                  {item.sensorType || item.name || 'HEXAGON BOX'}
                </span>
                <span className="text-[7px] font-mono text-cyan-600">{item.width}×{item.height}</span>
              </div>
            ) : item.boxShape === 'cut_corner' || item.shapeType === 'box_cut_corner' ? (
              <div className="w-full h-full flex flex-col items-center justify-center border-2 border-amber-700/80 bg-slate-950/90 [clip-path:polygon(0%_0%,calc(100%-12px)_0%,100%_12px,100%_100%,12px_100%,0%_calc(100%-12px))] p-1 shadow-md">
                <span className="text-[9px] font-mono font-bold text-amber-300 tracking-wider uppercase text-center px-1 truncate max-w-full">
                  {item.sensorType || item.name || 'CUT-CORNER BOX'}
                </span>
                <span className="text-[7px] font-mono text-amber-600">{item.width}×{item.height}</span>
              </div>
            ) : item.boxShape === 'pill' || item.shapeType === 'box_pill' ? (
              <div className="w-full h-full flex flex-col items-center justify-center border-2 border-emerald-700/80 bg-slate-950/90 rounded-full px-2 py-1 shadow-md">
                <span className="text-[9px] font-mono font-bold text-emerald-300 tracking-wider uppercase text-center px-1 truncate max-w-full">
                  {item.sensorType || item.name || 'PILL CAPSULE'}
                </span>
                <span className="text-[7px] font-mono text-emerald-600">{item.width}×{item.height}</span>
              </div>
            ) : item.boxShape === 'bracket' || item.shapeType === 'box_bracket' ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950/90 border-x-2 border-y border-purple-500/80 rounded-xs p-1 shadow-md">
                <span className="text-[9px] font-mono font-bold text-purple-300 tracking-wider uppercase text-center px-1 truncate max-w-full">
                  {item.sensorType || item.name || 'BRACKET BOX'}
                </span>
                <span className="text-[7px] font-mono text-purple-500">{item.width}×{item.height}</span>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950/90 border-2 border-slate-700 rounded p-1 shadow-md">
                <span className="text-[9px] font-mono font-bold text-slate-200 tracking-wider uppercase text-center px-1 truncate max-w-full">
                  {item.sensorType || item.name || 'VALUE BOX'}
                </span>
                <span className="text-[7px] font-mono text-slate-500">{item.width}×{item.height}</span>
              </div>
            )}
          </div>
        ) : (
          /* Render Clean Geometric Shape Pods & Modules */
          <div className="w-full h-full bg-slate-950/90 rounded border border-slate-800 p-2 overflow-hidden flex flex-col justify-between relative backdrop-blur-xs">
            {/* Header Label Bar */}
            <div className="flex items-center justify-between text-[10px] font-mono leading-none border-b border-slate-800/60 pb-1">
              <span className="font-bold text-slate-300 truncate max-w-[80%]">{item.name}</span>
              {item.locked && <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
            </div>

            {/* Shape Pod Content Outline */}
            {item.shapeType === 'temp_wing_angled' ? (
              <div className="flex-1 flex items-center justify-between px-2 bg-slate-900/60 rounded-r-xl border border-red-800/40 my-1">
                <div className="flex items-center gap-1.5">
                  <Thermometer className="w-4 h-4 text-red-500 shrink-0" />
                  <span className="text-[9px] font-mono font-bold text-slate-300 uppercase">
                    {item.sensorType || 'THERMAL WING SOCKET'}
                  </span>
                </div>
                <span className="text-[7px] font-mono text-slate-500">EMPTY CAVITY</span>
              </div>
            ) : item.shapeType === 'voltage_wattage_banner' ? (
              <div className="flex-1 flex items-center justify-around bg-slate-900/60 border border-slate-800 rounded px-2 my-0.5">
                <span className="text-[9px] font-mono font-bold text-slate-300">[ VOLTAGE CAVITY ]</span>
                <span className="text-slate-600 font-mono">|</span>
                <span className="text-[9px] font-mono font-bold text-slate-300">[ POWER CAVITY ]</span>
              </div>
            ) : item.shapeType === 'ram_stick_module' ? (
              <div className="flex-1 flex flex-col justify-between py-1 bg-slate-900/60 border border-slate-800 rounded p-1.5">
                <div className="flex items-center justify-between text-[9px] font-mono font-bold text-slate-300">
                  <span>[ RAM MODULE SOCKET ]</span>
                  <span className="text-slate-500">{item.width}×{item.height}</span>
                </div>
                <div className="w-full bg-slate-950 rounded h-1.5 border border-slate-800 my-0.5" />
                <span className="text-[8px] font-mono text-slate-500 text-right truncate">
                  [ FREQUENCY & CAPACITY CAVITY ]
                </span>
              </div>
            ) : item.shapeType === 'telemetry_slot_3' ? (
              <div className="flex-1 flex flex-col justify-around gap-1 py-1">
                {['METRIC SOCKET 1', 'METRIC SOCKET 2', 'METRIC SOCKET 3'].map((label, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[9px] font-mono bg-slate-900/70 px-1.5 py-0.5 rounded border border-slate-800">
                    <span className="text-slate-400 font-bold">{label}</span>
                    <span className="text-[7px] text-slate-600">EMPTY CAVITY</span>
                  </div>
                ))}
              </div>
            ) : item.shapeType === 'network_transfer_pod' ? (
              <div className="flex-1 flex items-center justify-around text-center py-1 bg-cyan-950/20 border border-cyan-800/30 rounded">
                <div><span className="text-[8px] font-mono text-cyan-400 font-bold block">[ DL SOCKET ]</span></div>
                <div><span className="text-[8px] font-mono text-slate-400 font-bold block">[ TOTAL SOCKET ]</span></div>
                <div><span className="text-[8px] font-mono text-cyan-400 font-bold block">[ UL SOCKET ]</span></div>
              </div>
            ) : item.shapeType === 'disk_activity_pod' ? (
              <div className="flex-1 flex flex-col justify-around space-y-0.5 text-[9px] font-mono px-1">
                <div className="flex justify-between"><span className="text-slate-400">[ READ CAVITY ]</span><span className="text-[7px] text-slate-600">EMPTY</span></div>
                <div className="flex justify-between"><span className="text-slate-400">[ WRITE CAVITY ]</span><span className="text-[7px] text-slate-600">EMPTY</span></div>
                <div className="flex justify-between"><span className="text-slate-400">[ STORAGE CAVITY ]</span><span className="text-[7px] text-slate-600">EMPTY</span></div>
              </div>
            ) : item.shapeType === 'fps_counter_badge' ? (
              <div className="flex-1 flex flex-col items-center justify-center bg-cyan-950/30 border border-cyan-800/40 rounded p-1">
                <span className="text-xs font-black font-mono text-cyan-400 leading-none">
                  [ FPS BADGE SOCKET ]
                </span>
                <span className="text-[8px] font-mono text-cyan-600 font-bold mt-0.5">CENTRAL HUD CAVITY</span>
              </div>
            ) : item.shapeType === 'avatar_stage_cutout' ? (
              <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-700 rounded bg-slate-900/40 text-center p-2">
                <Image className="w-5 h-5 text-slate-600 mb-1" />
                <span className="text-[9px] font-mono text-slate-400 font-bold">ART STAGE</span>
                <span className="text-[8px] font-mono text-slate-600">CHARACTER CUTOUT</span>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-slate-900/50 border border-slate-800 rounded p-1">
                <span className="text-[9px] font-mono font-bold text-slate-300 uppercase">
                  {item.sensorType || item.name}
                </span>
                <span className="text-[7px] font-mono text-slate-500">{item.width}×{item.height}</span>
              </div>
            )}

            {/* Coordinate Watermark Badge */}
            <div className="text-[8px] font-mono text-slate-500 flex justify-between border-t border-slate-800/40 pt-0.5 mt-0.5">
              <span>{item.x},{item.y}</span>
              <span>{item.width}×{item.height}</span>
            </div>
          </div>
        )}

        {/* 8-Point Resize Handles (Active only when selected and unlocked) */}
        {isSelected && !item.locked && (
          <>
            <div
              onMouseDown={(e) => handleResizeHandleMouseDown(e, 'nw')}
              className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-emerald-400 border-2 border-slate-950 rounded-xs cursor-nw-resize z-50 hover:scale-125"
            />
            <div
              onMouseDown={(e) => handleResizeHandleMouseDown(e, 'ne')}
              className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-emerald-400 border-2 border-slate-950 rounded-xs cursor-ne-resize z-50 hover:scale-125"
            />
            <div
              onMouseDown={(e) => handleResizeHandleMouseDown(e, 'se')}
              className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-emerald-400 border-2 border-slate-950 rounded-xs cursor-se-resize z-50 hover:scale-125"
            />
            <div
              onMouseDown={(e) => handleResizeHandleMouseDown(e, 'sw')}
              className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-emerald-400 border-2 border-slate-950 rounded-xs cursor-sw-resize z-50 hover:scale-125"
            />
            <div
              onMouseDown={(e) => handleResizeHandleMouseDown(e, 'n')}
              className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-2 bg-emerald-400 border-1 border-slate-950 rounded-xs cursor-n-resize z-50 hover:scale-125"
            />
            <div
              onMouseDown={(e) => handleResizeHandleMouseDown(e, 's')}
              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-2 bg-emerald-400 border-1 border-slate-950 rounded-xs cursor-s-resize z-50 hover:scale-125"
            />
            <div
              onMouseDown={(e) => handleResizeHandleMouseDown(e, 'e')}
              className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2 h-3 bg-emerald-400 border-1 border-slate-950 rounded-xs cursor-e-resize z-50 hover:scale-125"
            />
            <div
              onMouseDown={(e) => handleResizeHandleMouseDown(e, 'w')}
              className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-2 h-3 bg-emerald-400 border-1 border-slate-950 rounded-xs cursor-w-resize z-50 hover:scale-125"
            />
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 rounded-lg bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs font-mono flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Primary Workflow Top Action Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-3">
          {/* 1. Template Size Selector */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded px-3 py-1.5">
              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5" />
                <span>1. Screen Size:</span>
              </span>
              <select
                value={selectedScreen.id}
                onChange={(e) => {
                  const found = AIDA64_SCREEN_PRESETS.find(p => p.id === e.target.value);
                  if (found) setSelectedScreen(found);
                }}
                className="bg-transparent text-xs font-mono text-slate-200 border-none cursor-pointer focus:outline-none"
              >
                {AIDA64_SCREEN_PRESETS.map((scr) => (
                  <option key={scr.id} value={scr.id} className="bg-slate-900">
                    {scr.label} ({scr.diagonal})
                  </option>
                ))}
              </select>
              <span className="text-[10px] font-mono text-slate-500 pl-1 border-l border-slate-800">
                {selectedScreen.width} × {selectedScreen.height} px
              </span>
            </div>

            {/* View Mode Toggle: Live Telemetry vs Geometric Control Mask */}
            <button
              onClick={() => setShowControlMaskMode(!showControlMaskMode)}
              className={`px-3 py-1.5 rounded text-xs font-mono font-medium flex items-center gap-1.5 cursor-pointer border transition-all ${
                showControlMaskMode
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>{showControlMaskMode ? 'Layout Mask Mode (Active)' : 'Live Telemetry View'}</span>
            </button>
          </div>

          {/* Core Action: AI Generation & Chassis Trigger */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRenderPrecisionChassisArtwork(true, false)}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-sky-400 hover:text-sky-300 border border-sky-500/40 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
              title="Immediately renders and sets the 100% exact chassis backplate directly onto the canvas"
            >
              <Zap className="w-4 h-4 text-sky-400" />
              <span>⚡ Render Exact Chassis</span>
            </button>
            <button
              onClick={() => setIsAiModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold font-mono flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/50 ring-1 ring-emerald-400/50 hover:scale-[1.02] transition-all"
            >
              <Sparkles className="w-4 h-4 text-emerald-200 animate-spin" style={{ animationDuration: '6s' }} />
              <span>Generate Design with AI from Layout</span>
            </button>
          </div>
        </div>

        {/* Studio Sub-Navigation & Quick Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {/* Quick Sub-Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveTab('dials')}
              className={`px-3 py-1.5 rounded text-xs font-bold font-mono flex items-center gap-1.5 cursor-pointer transition-all ${
                activeTab === 'dials' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Disc className="w-3.5 h-3.5" />
              <span>2. Dials</span>
            </button>
            <button
              onClick={() => setActiveTab('boxes')}
              className={`px-3 py-1.5 rounded text-xs font-bold font-mono flex items-center gap-1.5 cursor-pointer transition-all ${
                activeTab === 'boxes' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3. Value Boxes (8 Shapes)</span>
            </button>
            <button
              onClick={() => setActiveTab('shapes')}
              className={`px-3 py-1.5 rounded text-xs font-bold font-mono flex items-center gap-1.5 cursor-pointer transition-all ${
                activeTab === 'shapes' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Shapes & Pods</span>
            </button>
            <button
              onClick={() => setActiveTab('gauges_100')}
              className={`px-3 py-1.5 rounded text-xs font-bold font-mono flex items-center gap-1.5 cursor-pointer transition-all ${
                activeTab === 'gauges_100' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" />
              <span>4. 100-State Gauges</span>
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-3 py-1.5 rounded text-xs font-bold font-mono flex items-center gap-1.5 cursor-pointer transition-all ${
                activeTab === 'templates' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layout className="w-3.5 h-3.5" />
              <span>Complete Templates</span>
            </button>
            <button
              onClick={() => setActiveTab('layers')}
              className={`px-3 py-1.5 rounded text-xs font-bold font-mono flex items-center gap-1.5 cursor-pointer transition-all ${
                activeTab === 'layers' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Layers ({items.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('inspector')}
              className={`px-3 py-1.5 rounded text-xs font-bold font-mono flex items-center gap-1.5 cursor-pointer transition-all ${
                activeTab === 'inspector' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Inspector</span>
            </button>
          </div>

          {/* Quick Canvas Controls */}
          <div className="flex items-center gap-2">
            {/* Undo / Redo */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded p-0.5">
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                title="Undo (Ctrl+Z)"
                className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30 cursor-pointer"
              >
                <Undo className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                title="Redo (Ctrl+Y)"
                className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30 cursor-pointer"
              >
                <Redo className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Grid Snap Selector */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded px-2 py-0.5">
              <Grid className="w-3 h-3 text-slate-400" />
              <select
                value={gridSnap}
                onChange={(e) => setGridSnap(Number(e.target.value))}
                className="bg-transparent text-[11px] font-mono text-slate-300 border-none cursor-pointer"
              >
                {GRID_SNAP_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>
                    Snap: {g.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded p-0.5">
              <button
                onClick={() => setZoomScale(Math.max(0.3, zoomScale - 0.1))}
                className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono text-slate-400 px-1">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                onClick={() => setZoomScale(Math.min(1.5, zoomScale + 0.1))}
                className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Clear Canvas / Start Blank */}
            <button
              onClick={handleClearCanvas}
              className="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 rounded text-xs font-mono font-medium flex items-center gap-1 cursor-pointer border border-rose-800/60"
              title="Clear all placeholders to start with a clean empty template"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear Map</span>
            </button>

            {/* Export & Copy Buttons */}
            <button
              onClick={handleCopyAida64Coords}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono font-medium flex items-center gap-1 cursor-pointer border border-slate-700"
            >
              {copiedCoords ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedCoords ? 'Copied!' : 'Copy Coords'}</span>
            </button>
            <button
              onClick={handleExportJson}
              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-medium flex items-center gap-1 cursor-pointer shadow"
            >
              <Download className="w-3 h-3" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio 3-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Side: Shapes & Components Catalog (3 cols) */}
        <div className="lg:col-span-3 space-y-3">
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5 text-xs">
            {/* Tab: Shapes Gallery (Up to 8+ Input Shapes Matching Reference Photo) */}
            {activeTab === 'shapes' && (
              <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1 custom-scrollbar">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-800 flex justify-between">
                  <span>Input Shapes Gallery</span>
                  <span className="text-emerald-400">{AIDA64_SHAPES_CATALOG.length} Shapes</span>
                </div>

                {AIDA64_SHAPES_CATALOG.map((shape) => (
                  <div
                    key={shape.shapeType}
                    onClick={() => handleAddShape(shape)}
                    className="p-2.5 rounded-lg border border-slate-800 bg-slate-950/70 hover:border-emerald-500/70 hover:bg-slate-900/80 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Plus className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-125 transition-transform" />
                        <span className="font-bold text-slate-200">{shape.name}</span>
                      </div>
                      <span className="px-1.5 py-0.5 bg-slate-800 text-slate-400 text-[9px] font-mono rounded">
                        {shape.defaultWidth}×{shape.defaultHeight}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-tight">{shape.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Tab: 8 Value Box Shapes */}
            {activeTab === 'boxes' && (
              <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1 custom-scrollbar">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-800 flex justify-between">
                  <span>8 Geometric Value Boxes</span>
                  <span className="text-emerald-400">Place Anywhere</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Click any shape to place on canvas, or select a dial to nest the box directly inside the dial face.
                </p>

                {[
                  { shape: 'chamfer' as const, name: 'Chamfered Corner Box', desc: 'Symmetrical 45° angled corners for high-tech HUD look.' },
                  { shape: 'hexagon' as const, name: 'Hexagonal Pointed Box', desc: 'Pointed angular ends for prominent telemetry readouts.' },
                  { shape: 'cut_corner' as const, name: 'Opposite Cut Corner Box', desc: 'Stealth combat HUD aesthetic with diagonal notches.' },
                  { shape: 'pill' as const, name: 'Pill / Stadium Capsule', desc: 'Smooth curved stadium capsule for clocks & fans.' },
                  { shape: 'bracket' as const, name: 'Corner Bracket HUD Box', desc: 'Futuristic reticle bracket corners around metrics.' },
                  { shape: 'rectangle' as const, name: 'Precision Beveled Box', desc: 'Ultra-clean clean bezel cavity box for frequencies.' }
                ].map((b) => (
                  <div
                    key={b.shape}
                    onClick={() => handleAddValueBox(b.shape)}
                    className="p-2.5 rounded-lg border border-slate-800 bg-slate-950/70 hover:border-emerald-500/70 hover:bg-slate-900/80 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Plus className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-125 transition-transform" />
                        <span className="font-bold text-slate-200">{b.name}</span>
                      </div>
                      <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-400 text-[9px] font-mono rounded border border-emerald-800/50">
                        + Add Box
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-tight">{b.desc}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Tab: Dials Selector */}
            {activeTab === 'dials' && (
              <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1 custom-scrollbar">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-800">
                  Quick Add Dials
                </div>

                <div
                  onClick={() => handleAddDial('left_cpu')}
                  className="p-3 rounded-lg border border-slate-800 bg-slate-950/70 hover:border-red-500 hover:bg-slate-900/80 cursor-pointer transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">Left CPU Dial (240px)</span>
                    <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[9px] font-mono rounded">LEFT</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Circular bezel socket with radial CPU percentage arc.</p>
                </div>

                <div
                  onClick={() => handleAddDial('right_gpu')}
                  className="p-3 rounded-lg border border-slate-800 bg-slate-950/70 hover:border-red-500 hover:bg-slate-900/80 cursor-pointer transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">Right GPU Dial (240px)</span>
                    <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[9px] font-mono rounded">RIGHT</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Symmetrical right-side circular dial socket for GPU telemetry.</p>
                </div>

                <div
                  onClick={() => handleAddDial('center_aio')}
                  className="p-3 rounded-lg border border-slate-800 bg-slate-950/70 hover:border-cyan-500 hover:bg-slate-900/80 cursor-pointer transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">AIO Hero Dial (320px)</span>
                    <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 text-[9px] font-mono rounded">CENTER</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Large prominent round pump cap LCD dial socket.</p>
                </div>
              </div>
            )}

            {/* Tab: 100-State Gauge Configuration */}
            {activeTab === 'gauges_100' && (
              <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1 custom-scrollbar">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-800 flex justify-between">
                  <span>100-State Gauge Config</span>
                  <span className="text-emerald-400">17 Styles</span>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">GAUGE ARC STYLE</label>
                  <select
                    value={selectedGaugeStyle}
                    onChange={(e) => setSelectedGaugeStyle(e.target.value as Aida64GaugeStyle)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 font-mono text-slate-200 text-xs"
                  >
                    {GAUGE_STYLES_REGISTRY.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.category})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Interactive Test Slider */}
                <div>
                  <div className="flex justify-between text-[10px] font-mono mb-1">
                    <span className="text-slate-400">TEST SLIDER VALUE</span>
                    <span className="text-emerald-400 font-bold">{gaugeTestPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={gaugeTestPercent}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setGaugeTestPercent(val);
                      // Update any selected dials
                      updateItems(selectedItemIds, { gaugePercent: val });
                    }}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Batch 100-State ZIP Exporter */}
                <button
                  onClick={handleExport100StateDialZip}
                  disabled={isExportingGaugeZip}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow disabled:opacity-50"
                >
                  <FileArchive className="w-3.5 h-3.5" />
                  <span>{isExportingGaugeZip ? 'Packaging Frames...' : 'Export 100-State Dial ZIP'}</span>
                </button>
              </div>
            )}

            {/* Tab: Templates */}
            {activeTab === 'templates' && (
              <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1 custom-scrollbar">
                {AIDA64_PANEL_TEMPLATES.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    onClick={() => handleApplyTemplate(tmpl.id)}
                    className="p-3 rounded-lg border border-slate-800 bg-slate-950/70 hover:border-emerald-500 hover:bg-slate-900/70 cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">{tmpl.name}</span>
                      <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] font-mono rounded">
                        {tmpl.width}×{tmpl.height}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{tmpl.description}</p>
                    <span className="text-[9px] font-mono text-slate-500 block mt-2">
                      Contains {tmpl.items.length} pre-mapped elements
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Tab: Layers */}
            {activeTab === 'layers' && (
              <div className="space-y-1.5 max-h-[580px] overflow-y-auto pr-1 custom-scrollbar">
                {items.map((item, idx) => {
                  const isSelected = selectedItemIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItemIds([item.id])}
                      className={`p-2 rounded flex items-center justify-between text-xs font-mono cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300'
                          : 'bg-slate-950 border border-slate-800/80 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate max-w-[140px]">
                        <span className="text-[9px] text-slate-600">#{idx + 1}</span>
                        <span className="truncate">{item.name}</span>
                      </div>

                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => updateSingleItem(item.id, { locked: !item.locked })}
                          title={item.locked ? 'Unlock' : 'Lock'}
                          className="p-1 text-slate-400 hover:text-slate-200"
                        >
                          {item.locked ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Center Canvas Stage (6 cols) */}
        <div className="lg:col-span-6 space-y-3">
          <div
            ref={canvasContainerRef}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex items-center justify-center min-h-[580px] overflow-auto relative select-none"
          >
            {/* The Actual Scaled AIDA64 Screen Canvas */}
            <div
              ref={canvasRef}
              style={{
                width: `${selectedScreen.width}px`,
                height: `${selectedScreen.height}px`,
                transform: `scale(${zoomScale})`,
                transformOrigin: 'top center',
                backgroundImage: activeCustomBg ? `url(${activeCustomBg})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
              className="bg-[#05070e] border border-slate-700/80 shadow-2xl relative shrink-0 transition-transform"
            >
              {/* Optional Visual Grid Lines */}
              {showGridLines && (
                <div
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage: `linear-gradient(to right, #94a3b8 1px, transparent 1px), linear-gradient(to bottom, #94a3b8 1px, transparent 1px)`,
                    backgroundSize: `${gridSnap * 4}px ${gridSnap * 4}px`
                  }}
                />
              )}

              {/* Empty Canvas Blueprint State */}
              {items.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6 text-center">
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center mb-3 bg-slate-900/50">
                    <Plus className="w-6 h-6 text-slate-500" />
                  </div>
                  <span className="text-sm font-bold font-mono text-slate-300 uppercase tracking-wider">
                    Clean Layout Canvas Ready
                  </span>
                  <span className="text-xs font-mono text-slate-500 max-w-md mt-1">
                    Add circular dial bezels and geometric value boxes from the left sidebar to map your layout placeholders. The AI will draw the actual background and chassis art around this map.
                  </span>
                </div>
              )}

              {/* Render all elements */}
              {items.map((item) => renderItemElement(item))}
            </div>
          </div>
        </div>

        {/* Right Side: Element Inspector (3 cols) */}
        <div className="lg:col-span-3 space-y-3">
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5 text-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-slate-200">Element Inspector</span>
              {primarySelectedItem && (
                <span className="text-[10px] font-mono text-emerald-400">
                  {primarySelectedItem.shapeType || primarySelectedItem.type.toUpperCase()}
                </span>
              )}
            </div>

            {primarySelectedItem ? (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">ELEMENT NAME</label>
                  <input
                    type="text"
                    value={primarySelectedItem.name}
                    onChange={(e) => updateSingleItem(primarySelectedItem.id, { name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 font-mono text-slate-200"
                  />
                </div>

                {/* Geometry Inputs */}
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-2 rounded border border-slate-800">
                  <div>
                    <label className="text-[9px] font-mono text-slate-400 block mb-0.5">POS X (PX)</label>
                    <input
                      type="number"
                      value={primarySelectedItem.x}
                      onChange={(e) => updateSingleItem(primarySelectedItem.id, { x: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1 font-mono text-slate-200 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-mono text-slate-400 block mb-0.5">POS Y (PX)</label>
                    <input
                      type="number"
                      value={primarySelectedItem.y}
                      onChange={(e) => updateSingleItem(primarySelectedItem.id, { y: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1 font-mono text-slate-200 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-mono text-slate-400 block mb-0.5">WIDTH (PX)</label>
                    <input
                      type="number"
                      value={primarySelectedItem.width}
                      onChange={(e) => updateSingleItem(primarySelectedItem.id, { width: Math.max(20, Number(e.target.value)) })}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1 font-mono text-slate-200 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-mono text-slate-400 block mb-0.5">HEIGHT (PX)</label>
                    <input
                      type="number"
                      value={primarySelectedItem.height}
                      onChange={(e) => updateSingleItem(primarySelectedItem.id, { height: Math.max(20, Number(e.target.value)) })}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1 font-mono text-slate-200 text-xs"
                    />
                  </div>
                </div>

                {/* Custom Box / Dial Quick Actions */}
                {primarySelectedItem.type === 'dial' || primarySelectedItem.shapeType === 'dial_circle' || primarySelectedItem.shapeType === 'dial_with_boxes' ? (
                  <div className="space-y-1.5 pt-1 border-t border-slate-800">
                    <label className="text-[10px] font-mono text-emerald-400 block font-bold">
                      + NEST VALUE BOX INSIDE THIS DIAL
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { shape: 'chamfer' as const, label: 'Chamfer' },
                        { shape: 'hexagon' as const, label: 'Hexagon' },
                        { shape: 'cut_corner' as const, label: 'Cut Corner' },
                        { shape: 'pill' as const, label: 'Pill' },
                        { shape: 'bracket' as const, label: 'Bracket' },
                        { shape: 'rectangle' as const, label: 'Bevel' }
                      ].map((b) => (
                        <button
                          key={b.shape}
                          onClick={() => handleAddValueBox(b.shape, primarySelectedItem.id)}
                          className="py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-emerald-500/50 rounded text-[9px] font-mono cursor-pointer transition-colors"
                        >
                          +{b.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (primarySelectedItem.type === 'value_box' || (primarySelectedItem.shapeType && primarySelectedItem.shapeType.startsWith('box_'))) ? (
                  <div className="space-y-1.5 pt-1 border-t border-slate-800">
                    <label className="text-[10px] font-mono text-slate-400 block">VALUE BOX CONTOUR SHAPE</label>
                    <select
                      value={primarySelectedItem.boxShape || 'chamfer'}
                      onChange={(e) => updateSingleItem(primarySelectedItem.id, { 
                        boxShape: e.target.value as any,
                        shapeType: `box_${e.target.value}` as Aida64ShapeType 
                      })}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 font-mono text-slate-200 text-xs"
                    >
                      <option value="chamfer">Chamfered 45° Box</option>
                      <option value="hexagon">Hexagonal Pointed Box</option>
                      <option value="cut_corner">Opposite Cut Corner Box</option>
                      <option value="pill">Pill Stadium Capsule</option>
                      <option value="bracket">HUD Corner Bracket Box</option>
                      <option value="rectangle">Precision Beveled Box</option>
                    </select>
                  </div>
                ) : null}

                {/* Sensor Type & Sample Value */}
                <div className="space-y-2 pt-1 border-t border-slate-800">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">SENSOR BINDING</label>
                    <input
                      type="text"
                      value={primarySelectedItem.sensorType}
                      onChange={(e) => updateSingleItem(primarySelectedItem.id, { sensorType: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 font-mono text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">SAMPLE VALUE / TEST</label>
                    <input
                      type="text"
                      value={primarySelectedItem.testValue}
                      onChange={(e) => updateSingleItem(primarySelectedItem.id, { testValue: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 font-mono text-slate-200"
                    />
                  </div>
                </div>

                {/* Color Selector */}
                <div className="space-y-1.5 pt-1 border-t border-slate-800">
                  <label className="text-[10px] font-mono text-slate-400 block">THEME COLOR</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primarySelectedItem.color || '#ef4444'}
                      onChange={(e) => updateSingleItem(primarySelectedItem.id, { color: e.target.value })}
                      className="w-7 h-7 rounded bg-slate-950 border border-slate-800 cursor-pointer"
                    />
                    <div className="flex flex-wrap gap-1 flex-1">
                      {PRESET_COLORS.slice(0, 6).map((c) => (
                        <button
                          key={c.value}
                          onClick={() => updateSingleItem(primarySelectedItem.id, { color: c.value })}
                          className="w-4 h-4 rounded-full border border-slate-700 cursor-pointer"
                          style={{ backgroundColor: c.value }}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={handleDuplicate}
                    className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium text-xs flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <DuplicateIcon className="w-3.5 h-3.5" />
                    <span>Duplicate</span>
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 py-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-rose-300 rounded font-medium text-xs flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500">
                <MousePointer className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p className="text-xs">Click any element on the canvas to inspect and customize its shape properties.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Layout Generator Modal (The Core Feature) */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-bold text-slate-100">
                    Generate Chassis Design with AI from Layout
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Transforms your {items.length} placed shapes & dials into an engineered zero-text chassis background render.
                </p>
              </div>
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Layout Summary Pill */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
              <div>
                <span className="text-slate-500 block">RESOLUTION</span>
                <span className="text-emerald-400 font-bold">{selectedScreen.width} × {selectedScreen.height} px</span>
              </div>
              <div>
                <span className="text-slate-500 block">SHAPES PLACED</span>
                <span className="text-slate-200 font-bold">{items.length} Items</span>
              </div>
              <div>
                <span className="text-slate-500 block">SPATIAL ZONES</span>
                <span className="text-slate-200 font-bold">{compiledPrompt.zonesSummary}</span>
              </div>
              <div>
                <span className="text-slate-500 block">ZERO-TEXT</span>
                <span className="text-sky-400 font-bold">STRICT ENFORCED</span>
              </div>
            </div>

            {/* Live 100% Coordinate Chassis Preview Canvas */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-200">
                  <Monitor className="w-3.5 h-3.5 text-sky-400" />
                  <span>Exact Chassis Layout Artwork Preview (100% Coordinate Match)</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                  {selectedScreen.width} × {selectedScreen.height} px · {items.length} Elements
                </span>
              </div>
              <div className="relative rounded overflow-hidden border border-slate-800/80 bg-black flex items-center justify-center max-h-56">
                <canvas
                  ref={chassisPreviewCanvasRef}
                  className="max-h-52 w-auto object-contain rounded shadow-inner"
                  width={selectedScreen.width}
                  height={selectedScreen.height}
                />
              </div>
              
              {/* Detailed Coordinates Inspector Chips */}
              <div className="pt-1 border-t border-slate-900 grid grid-cols-1 md:grid-cols-2 gap-1.5">
                {items.slice(0, 6).map((item, idx) => (
                  <div key={item.id || idx} className="bg-slate-900/80 border border-slate-800/80 rounded px-2 py-1 text-[9.5px] font-mono flex items-center justify-between text-slate-300">
                    <span className="truncate max-w-[140px] font-bold text-sky-300">
                      #{idx + 1} {item.name || item.shapeType || item.type}
                    </span>
                    <span className="text-emerald-400 shrink-0">
                      X:{item.x} Y:{item.y} ({item.width}×{item.height}px)
                    </span>
                  </div>
                ))}
                {items.length > 6 && (
                  <div className="text-[9.5px] font-mono text-slate-500 italic px-1 flex items-center">
                    + {items.length - 6} more mapped coordinate sockets embedded into prompt
                  </div>
                )}
              </div>

              <p className="text-[10px] text-slate-400 font-mono">
                ⚡ Reads all exact dimensions, bounds, and coordinates from your template and embeds them into the spatial prompt for pixel-accurate hardware mounting.
              </p>
            </div>

            {/* Theme Selector */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                SELECT AESTHETIC CHASSIS THEME:
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {AIDA64_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setSelectedThemeId(theme.id)}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                      selectedThemeId === theme.id
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <span className="w-2.5 h-2.5 rounded-full shadow" style={{ backgroundColor: theme.primaryColor }} />
                      <span>{theme.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Fuse with Existing AI Image / Asset */}
            {projectState.savedAssets.filter(a => a.type === 'image' && a.url).length > 0 && (
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
                <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Image className="w-3.5 h-3.5 text-amber-400" />
                  <span>Option: Fuse Template Layout Onto Saved AI Image</span>
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedFuseAssetId}
                    onChange={(e) => setSelectedFuseAssetId(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded p-2 text-xs font-mono text-slate-200"
                  >
                    <option value="">-- Choose a generated AI wallpaper / image --</option>
                    {projectState.savedAssets
                      .filter(a => a.type === 'image' && a.url)
                      .map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.title} ({new Date(asset.timestamp).toLocaleTimeString()})
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    disabled={!selectedFuseAssetId}
                    onClick={() => {
                      const found = projectState.savedAssets.find(a => a.id === selectedFuseAssetId);
                      if (found?.url) {
                        handleFuseWithSelectedImage(found.url);
                      }
                    }}
                    className={`px-3 py-2 rounded text-xs font-bold font-mono transition-all ${
                      selectedFuseAssetId
                        ? 'bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 cursor-pointer'
                        : 'bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    ✨ Fuse Layout onto Image
                  </button>
                </div>
              </div>
            )}

            {/* Compiled Spatial Prompt */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-300">
                  COMPILED ZERO-TEXT SPATIAL PROMPT (Auto-Synthesized):
                </label>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(compiledPrompt.prompt);
                    showToast('Prompt copied to clipboard!');
                  }}
                  className="text-[10px] font-mono text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy Prompt</span>
                </button>
              </div>
              <textarea
                rows={3}
                value={customPromptText || compiledPrompt.prompt}
                onChange={(e) => setCustomPromptText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-slate-300 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleDownloadControlMask}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 cursor-pointer border border-slate-700"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>Download Mask (PNG)</span>
                </button>
                <button
                  onClick={handleExport100StateDialZip}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 cursor-pointer border border-slate-700"
                >
                  <FileArchive className="w-3.5 h-3.5 text-slate-400" />
                  <span>Export 100-State Dial ZIP</span>
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleRenderPrecisionChassisArtwork(true, true)}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 cursor-pointer shadow-lg ring-1 ring-sky-400/50"
                  title="Directly bake and apply this 100% exact layout chassis backplate to the canvas"
                >
                  <Zap className="w-4 h-4 text-sky-200" />
                  <span>⚡ Bake & Apply Exact Chassis PNG</span>
                </button>
                <button
                  onClick={handleLaunchAiGeneration}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold font-mono flex items-center gap-2 cursor-pointer shadow-lg ring-1 ring-emerald-400/50"
                >
                  <Wand2 className="w-4 h-4" />
                  <span>Send to Create Studio & Fuse AI</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
