import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { PhotoSpec, WorkflowStep, CompositionSettings, FaceDetectionResult, BackgroundSettings, HistorySnapshot } from '../types';
import { PHOTO_SPECS, COMMON_QUICK_SPECS } from '../utils/photoSpecs';
import { HistoryTimelinePanel } from './HistoryTimelinePanel';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Eye,
  Scan,
  Sparkles,
  Loader2,
  Maximize2,
  Smartphone,
  ChevronDown,
  Check,
  Search,
  Wand2,
  X,
  ScanFace,
  Undo2,
  Redo2,
  Scissors,
  Printer,
  History,
} from 'lucide-react';

interface PreviewStageProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  originalImage: HTMLImageElement | null;
  spec: PhotoSpec;
  specs?: PhotoSpec[];
  onSelectSpec?: (spec: PhotoSpec) => void;
  onAutoMatchSpec?: () => void;
  isProcessing: boolean;
  processingMessage: string;
  step: WorkflowStep;
  showGuides: boolean;
  onToggleGuides: () => void;
  faceResult?: FaceDetectionResult | null;
  showFaceBox?: boolean;
  onToggleFaceBox?: () => void;
  showPrintCropGuide?: boolean;
  onTogglePrintCropGuide?: () => void;
  printPreviewMode?: 'single' | 'sheet';
  onChangePrintPreviewMode?: (mode: 'single' | 'sheet') => void;
  onRotateImage: () => void;
  onZoom: (delta: number) => void;
  onResetZoom: () => void;
  composition: CompositionSettings;
  onChangeComposition?: (
    composition: CompositionSettings | ((prev: CompositionSettings) => CompositionSettings)
  ) => void;
  onScaleChange?: (scale: number) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  undoStack?: HistorySnapshot[];
  redoStack?: HistorySnapshot[];
  currentSnapshot?: HistorySnapshot;
  onJumpToSnapshot?: (targetIndex: number) => void;
  onResetToInitial?: () => void;
  bgSettings?: BackgroundSettings;
  onChangeBg?: (settings: BackgroundSettings) => void;
  activeBrushTool?: 'none' | 'erase' | 'restore' | 'eyedropper';
  brushSize?: number;
}

export const PreviewStage: React.FC<PreviewStageProps> = ({
  canvasRef,
  originalImage,
  spec,
  specs = PHOTO_SPECS,
  onSelectSpec,
  onAutoMatchSpec,
  isProcessing,
  processingMessage,
  step,
  showGuides,
  onToggleGuides,
  faceResult,
  showFaceBox,
  onToggleFaceBox,
  showPrintCropGuide = true,
  onTogglePrintCropGuide,
  printPreviewMode = 'single',
  onChangePrintPreviewMode,
  onRotateImage,
  onZoom,
  onResetZoom,
  composition,
  onChangeComposition,
  onScaleChange,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  undoStack = [],
  redoStack = [],
  currentSnapshot,
  onJumpToSnapshot,
  onResetToInitial,
  bgSettings,
  onChangeBg,
  activeBrushTool = 'none',
  brushSize = 28,
}) => {
  const [internalShowFaceBox, setInternalShowFaceBox] = useState<boolean>(true);
  const [brushCursorPos, setBrushCursorPos] = useState<{ x: number; y: number } | null>(null);
  const activeStrokeRef = useRef<{ id: string; type: 'erase' | 'restore'; points: { x: number; y: number }[]; size: number } | null>(null);
  const isBrushingRef = useRef<boolean>(false);
  const effectiveShowFaceBox = showFaceBox !== undefined ? showFaceBox : internalShowFaceBox;
  const handleToggleFaceBox = onToggleFaceBox || (() => setInternalShowFaceBox(prev => !prev));
  const [isComparingOriginal, setIsComparingOriginal] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTouchFeedback, setActiveTouchFeedback] = useState<string | null>(null);

  // History timeline popover dropdown state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const historyDropdownRef = useRef<HTMLDivElement | null>(null);

  // Spec Selector Dropdown & Filter state
  const [specDropdownOpen, setSpecDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [specCategoryTab, setSpecCategoryTab] = useState<'all' | 'common' | 'document' | 'visa'>('all');
  const specDropdownRef = useRef<HTMLDivElement | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const compositionRef = useRef(composition);
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Close spec dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        specDropdownRef.current &&
        !specDropdownRef.current.contains(e.target as Node)
      ) {
        setSpecDropdownOpen(false);
      }
    };
    if (specDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [specDropdownOpen]);

  // Keep ref synchronized with current composition
  useEffect(() => {
    compositionRef.current = composition;
  }, [composition]);

  // Touch gesture tracker refs
  const pinchStateRef = useRef<{
    isPinching: boolean;
    initialDistance: number;
    initialScale: number;
  }>({
    isPinching: false,
    initialDistance: 0,
    initialScale: 1.0,
  });

  const dragTrackerRef = useRef<{
    startX: number;
    startY: number;
    initialOffsetX: number;
    initialOffsetY: number;
    isDragging: boolean;
  }>({
    startX: 0,
    startY: 0,
    initialOffsetX: 0,
    initialOffsetY: 0,
    isDragging: false,
  });

  const lastTapRef = useRef<number>(0);

  // Helper to show transient touch feedback HUD
  const triggerFeedback = useCallback((text: string) => {
    setActiveTouchFeedback(text);
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = setTimeout(() => {
      setActiveTouchFeedback(null);
    }, 1200);
  }, []);

  // Update scale safely
  const updateScale = useCallback(
    (newScale: number) => {
      const clamped = Math.max(0.5, Math.min(2.5, Number(newScale.toFixed(2))));
      if (onScaleChange) {
        onScaleChange(clamped);
      } else if (onChangeComposition) {
        onChangeComposition(prev => ({
          ...prev,
          scale: clamped,
        }));
      }
    },
    [onScaleChange, onChangeComposition]
  );

  // Update offset safely
  const updateOffset = useCallback(
    (offsetX: number, offsetY: number) => {
      if (onChangeComposition) {
        onChangeComposition(prev => ({
          ...prev,
          offsetX: Math.round(Math.max(-200, Math.min(200, offsetX))),
          offsetY: Math.round(Math.max(-200, Math.min(200, offsetY))),
        }));
      }
    },
    [onChangeComposition]
  );

  // Attach native non-passive touch listeners to container to allow e.preventDefault()
  // which prevents default browser pinch-zooming the whole page on mobile
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onTouchStart = (e: TouchEvent) => {
      // 1. Double tap detection (reset zoom or quick center)
      const now = Date.now();
      if (e.touches.length === 1 && now - lastTapRef.current < 300) {
        onResetZoom();
        triggerFeedback('双击已重置 100%');
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;

      // 2. Dual touch -> Pinch to Zoom
      if (e.touches.length === 2) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const dist = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );

        pinchStateRef.current = {
          isPinching: true,
          initialDistance: dist > 0 ? dist : 1,
          initialScale: compositionRef.current.scale || 1.0,
        };
        dragTrackerRef.current.isDragging = false;
        setIsPinching(true);
        setIsDragging(false);
        return;
      }

      // 3. Single touch -> Pan / Drag repositioning
      if (e.touches.length === 1 && !pinchStateRef.current.isPinching) {
        const touch = e.touches[0];
        dragTrackerRef.current = {
          startX: touch.clientX,
          startY: touch.clientY,
          initialOffsetX: compositionRef.current.offsetX || 0,
          initialOffsetY: compositionRef.current.offsetY || 0,
          isDragging: true,
        };
        setIsDragging(true);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      // 2-finger Pinch-to-zoom in progress
      if (e.touches.length === 2 && pinchStateRef.current.isPinching) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDist = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );

        if (pinchStateRef.current.initialDistance > 0) {
          const ratio = currentDist / pinchStateRef.current.initialDistance;
          const targetScale = pinchStateRef.current.initialScale * ratio;
          updateScale(targetScale);
        }
        return;
      }

      // 1-finger Drag in progress
      if (e.touches.length === 1 && dragTrackerRef.current.isDragging) {
        e.preventDefault();
        const touch = e.touches[0];
        const dx = touch.clientX - dragTrackerRef.current.startX;
        const dy = touch.clientY - dragTrackerRef.current.startY;
        updateOffset(
          dragTrackerRef.current.initialOffsetX + dx,
          dragTrackerRef.current.initialOffsetY + dy
        );
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2 && pinchStateRef.current.isPinching) {
        pinchStateRef.current.isPinching = false;
        setIsPinching(false);
        triggerFeedback(`缩放至 ${Math.round(compositionRef.current.scale * 100)}%`);
      }

      if (e.touches.length === 0) {
        dragTrackerRef.current.isDragging = false;
        setIsDragging(false);
      }
    };

    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd);
    container.addEventListener('touchcancel', onTouchEnd);

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [updateScale, updateOffset, onResetZoom, triggerFeedback]);

  // Desktop Mouse Wheel support (zoom)
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    updateScale(composition.scale + delta);
  };

  // Desktop Mouse Drag Support
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only primary mouse button
    if (e.button !== 0) return;
    dragTrackerRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialOffsetX: composition.offsetX,
      initialOffsetY: composition.offsetY,
      isDragging: true,
    };
    setIsDragging(true);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!dragTrackerRef.current.isDragging) return;
      const dx = moveEvent.clientX - dragTrackerRef.current.startX;
      const dy = moveEvent.clientY - dragTrackerRef.current.startY;
      updateOffset(
        dragTrackerRef.current.initialOffsetX + dx,
        dragTrackerRef.current.initialOffsetY + dy
      );
    };

    const onMouseUp = () => {
      dragTrackerRef.current.isDragging = false;
      setIsDragging(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Filter specs for dropdown
  const filteredDropdownSpecs = specs.filter(s => {
    if (specCategoryTab !== 'all' && s.category !== specCategoryTab) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.usage.toLowerCase().includes(q) ||
      (s.shortLabel && s.shortLabel.toLowerCase().includes(q)) ||
      `${s.widthPx}x${s.heightPx}`.includes(q) ||
      `${s.widthMm}x${s.heightMm}`.includes(q)
    );
  });

  // Derived Face Result Box Overlay in Canvas Coordinates
  const faceOverlay = useMemo(() => {
    if (!faceResult || !faceResult.detected || !originalImage) return null;

    const tw = spec.widthPx;
    const th = spec.heightPx;
    const sw = originalImage.naturalWidth || originalImage.width || tw;
    const sh = originalImage.naturalHeight || originalImage.height || th;

    const baseScale = Math.max(tw / sw, th / sh) * (composition.scale || 1);
    const targetCenterX = tw * 0.5 + (composition.offsetX || 0);
    const targetCenterY = th * 0.48 + (composition.offsetY || 0);

    const drawW = sw * baseScale;
    const drawH = sh * baseScale;

    // Face center in original normalized coordinates
    const faceCenterNormX = faceResult.box.x + faceResult.box.width * 0.5;
    const faceCenterNormY = faceResult.box.y + faceResult.box.height * 0.42;

    const drawX = -faceCenterNormX * drawW;
    const drawY = -faceCenterNormY * drawH;

    // In local transformed coordinate system centered at (targetCenterX, targetCenterY):
    const boxW = faceResult.box.width * drawW;
    const boxH = faceResult.box.height * drawH;
    const boxX = -0.5 * boxW;
    const boxY = -0.42 * boxH;

    // Viewfinder corner brackets path
    const cL = Math.max(8, Math.min(22, boxW * 0.14));
    const cornerPath = [
      `M ${boxX} ${boxY + cL} L ${boxX} ${boxY} L ${boxX + cL} ${boxY}`,
      `M ${boxX + boxW - cL} ${boxY} L ${boxX + boxW} ${boxY} L ${boxX + boxW} ${boxY + cL}`,
      `M ${boxX} ${boxY + boxH - cL} L ${boxX} ${boxY + boxH} L ${boxX + cL} ${boxY + boxH}`,
      `M ${boxX + boxW - cL} ${boxY + boxH} L ${boxX + boxW} ${boxY + boxH} L ${boxX + boxW} ${boxY + boxH - cL}`,
    ].join(' ');

    // Eye coordinates if detected
    let leftEye: { x: number; y: number } | null = null;
    let rightEye: { x: number; y: number } | null = null;
    if (faceResult.eyes) {
      leftEye = {
        x: drawX + faceResult.eyes.left.x * drawW,
        y: drawY + faceResult.eyes.left.y * drawH,
      };
      rightEye = {
        x: drawX + faceResult.eyes.right.x * drawW,
        y: drawY + faceResult.eyes.right.y * drawH,
      };
    }

    // Ratio of face height compared to total ID photo specification height
    const heightRatio = Math.round((boxH / th) * 100);

    return {
      targetCenterX,
      targetCenterY,
      rotation: composition.rotation || 0,
      boxX,
      boxY,
      boxW,
      boxH,
      cornerPath,
      leftEye,
      rightEye,
      heightRatio,
    };
  }, [faceResult, originalImage, spec, composition]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-5 relative">
      {/* Top Toolbar overlay */}
      <div className="w-full flex items-center justify-between mb-3 flex-wrap gap-2 z-20">
        {/* Left: Spec Selector & Common Quick Buttons & Auto Match */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 relative flex-wrap gap-y-1.5" ref={specDropdownRef}>
          {/* Main Spec Selector Button with Dropdown Trigger */}
          <button
            type="button"
            id="current-spec-trigger-btn"
            onClick={() => setSpecDropdownOpen(!specDropdownOpen)}
            className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-[10px] bg-[#FFFFFF] border text-[#2A2460] text-[12px] font-medium shadow-[0_2px_6px_rgba(42,36,96,0.04)] hover:border-[#7B68EE] hover:bg-[#FAF9FF] transition-all cursor-pointer min-h-[36px] ${
              specDropdownOpen ? 'border-[#7B68EE] ring-2 ring-[#7B68EE]/20' : 'border-[#EEEEEE]'
            }`}
            title="点击切换证件照常用标准规格（一寸、二寸、身份证、签证等）"
          >
            <span className="w-2 h-2 rounded-full bg-[#5AC8C3] animate-pulse"></span>
            <span className="font-bold text-[#2A2460]">{spec.name}</span>
            <span className="text-[#888888] hidden sm:inline">
              ({spec.widthPx} × {spec.heightPx} px)
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F5F7FA] text-[#666666] font-mono">
              {spec.dpi} DPI
            </span>
            {composition.rotation !== 0 && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded bg-[#7B68EE]/10 text-[#7B68EE] font-mono font-semibold"
                title="当前水平微调旋转角度"
              >
                旋转: {composition.rotation > 0 ? `+${composition.rotation}` : composition.rotation}°
              </span>
            )}
            <ChevronDown
              className={`w-3.5 h-3.5 text-[#666666] transition-transform duration-200 ${
                specDropdownOpen ? 'rotate-180 text-[#7B68EE]' : ''
              }`}
            />
          </button>

          {/* Quick Common Spec Pills (一键直达高频规格) */}
          <div className="hidden lg:flex items-center space-x-1 bg-[#FFFFFF] p-1 rounded-[10px] border border-[#EEEEEE] shadow-[0_2px_6px_rgba(42,36,96,0.04)]">
            {COMMON_QUICK_SPECS.slice(0, 5).map(s => {
              const isSelected = s.id === spec.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectSpec?.(s)}
                  className={`px-2 py-1 rounded-[6px] text-[11px] font-medium transition-all ${
                    isSelected
                      ? 'bg-[#7B68EE] text-white shadow-xs font-bold'
                      : 'text-[#555555] hover:text-[#2A2460] hover:bg-[#F5F7FA]'
                  }`}
                  title={`${s.name} (${s.description} · ${s.usage})`}
                >
                  {s.shortLabel || s.name}
                </button>
              );
            })}
          </div>

          {/* Intelligent Auto Match Button */}
          {onAutoMatchSpec && (
            <button
              type="button"
              id="spec-auto-match-btn"
              onClick={onAutoMatchSpec}
              className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-[10px] bg-gradient-to-r from-[#A56EFF]/15 to-[#7B68EE]/15 hover:from-[#A56EFF]/25 hover:to-[#7B68EE]/25 border border-[#7B68EE]/30 text-[#7B68EE] text-[11px] font-bold shadow-xs transition-all active:scale-95 min-h-[36px]"
              title="根据当前照片原始比例与人脸位置，自动智能匹配最适合的国家标准规格及构图比例"
            >
              <Wand2 className="w-3.5 h-3.5 text-[#7B68EE]" />
              <span>自动匹配</span>
            </button>
          )}

          {/* Spec Dropdown Popover */}
          {specDropdownOpen && (
            <div className="absolute top-[calc(100%+6px)] left-0 w-[320px] sm:w-[390px] max-h-[480px] bg-white rounded-[16px] shadow-[0_16px_40px_rgba(42,36,96,0.18)] border border-[#EEEEEE] flex flex-col z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Header with Search */}
              <div className="p-3 border-b border-[#EEEEEE] bg-[#FAF9FF] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-[#2A2460] flex items-center space-x-1">
                    <Scan className="w-3.5 h-3.5 text-[#7B68EE]" />
                    <span>常用标准规格库</span>
                  </span>
                  <span className="text-[10px] text-[#888888]">
                    共 {specs.length} 款国家标准
                  </span>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#999999] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="搜索规格、考试名称或尺寸 (如 身份证、四六级、25x35)..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-7 py-1.5 bg-white border border-[#E2E8F0] rounded-[8px] text-[11px] text-[#2A2460] placeholder-[#A0AEC0] focus:outline-none focus:border-[#7B68EE]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#999999] hover:text-[#333333]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Auto Match Action inside Dropdown */}
                {onAutoMatchSpec && (
                  <button
                    type="button"
                    onClick={() => {
                      onAutoMatchSpec();
                      setSpecDropdownOpen(false);
                    }}
                    className="w-full p-2 rounded-[8px] bg-gradient-to-r from-[#7B68EE]/10 to-[#5AC8C3]/10 border border-[#7B68EE]/20 hover:border-[#7B68EE]/50 flex items-center justify-between text-left transition-all group"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-[6px] bg-gradient-to-tr from-[#7B68EE] to-[#5AC8C3] flex items-center justify-center text-white shadow-xs">
                        <Wand2 className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-[#2A2460] group-hover:text-[#7B68EE]">
                          🎯 智能推荐 · 自动匹配最佳规格
                        </div>
                        <p className="text-[10px] text-[#666666]">
                          根据当前照片宽高比与面部尺寸智能选定并适配构图
                        </p>
                      </div>
                    </div>
                  </button>
                )}

                {/* Category tabs inside dropdown */}
                <div className="flex space-x-1 pt-1">
                  {[
                    { key: 'all', label: '全部' },
                    { key: 'common', label: '常用尺寸' },
                    { key: 'document', label: '证件考证' },
                    { key: 'visa', label: '出境签证' },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setSpecCategoryTab(tab.key as any)}
                      className={`flex-1 py-1 px-1.5 rounded-[6px] text-[11px] font-medium transition-all ${
                        specCategoryTab === tab.key
                          ? 'bg-[#7B68EE] text-white font-bold'
                          : 'text-[#666666] hover:bg-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Specs List */}
              <div className="flex-1 overflow-y-auto max-h-[260px] p-2 space-y-1">
                {filteredDropdownSpecs.length === 0 ? (
                  <div className="py-6 text-center text-[12px] text-[#999999]">
                    未搜索到符合条件的规格
                  </div>
                ) : (
                  filteredDropdownSpecs.map(s => {
                    const isSelected = s.id === spec.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          onSelectSpec?.(s);
                          setSpecDropdownOpen(false);
                        }}
                        className={`w-full p-2.5 rounded-[10px] text-left transition-all flex items-center justify-between group border ${
                          isSelected
                            ? 'bg-[#FAF9FF] border-[#7B68EE] text-[#7B68EE] shadow-xs'
                            : 'border-transparent hover:bg-[#F5F7FA] text-[#2A2460]'
                        }`}
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-center space-x-1.5 flex-wrap">
                            <span className="font-bold text-[12px]">
                              {s.name}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/5 font-mono text-[#555555]">
                              {s.description}
                            </span>
                            <span className="text-[10px] text-[#888888] font-mono">
                              {s.widthPx}×{s.heightPx}px · {s.dpi}DPI
                            </span>
                          </div>
                          <p className="text-[11px] text-[#666666] truncate mt-0.5">
                            {s.usage}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-[#7B68EE] text-white flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center space-x-1.5 bg-[#FFFFFF] p-1 rounded-[10px] border border-[#EEEEEE] shadow-[0_2px_6px_rgba(42,36,96,0.04)]">
          {/* Face detection box overlay toggle (帮助用户直观构图调整) */}
          <button
            type="button"
            id="toggle-face-box-btn"
            onClick={handleToggleFaceBox}
            className={`px-2.5 py-1 rounded-[6px] text-[12px] font-medium transition-all flex items-center space-x-1.5 min-h-[32px] cursor-pointer ${
              effectiveShowFaceBox
                ? 'bg-[#5AC8C3]/15 text-[#008B8B] font-bold border border-[#5AC8C3]/40'
                : 'text-[#666666] hover:bg-[#F5F7FA]'
            }`}
            title="切换人脸识别检测框与半透明构图覆盖层（显示 faceResult.box 构图位置与占比）"
          >
            <ScanFace className="w-3.5 h-3.5 text-[#008B8B]" />
            <span className="hidden sm:inline">人脸构图框</span>
            {faceResult?.detected && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#5AC8C3] ml-0.5 animate-pulse" />
            )}
          </button>

          {/* Guide lines toggle */}
          <button
            id="toggle-guides-btn"
            onClick={onToggleGuides}
            className={`px-2.5 py-1 rounded-[6px] text-[12px] font-medium transition-all flex items-center space-x-1 min-h-[32px] ${
              showGuides
                ? 'bg-[#7B68EE]/10 text-[#7B68EE]'
                : 'text-[#666666] hover:bg-[#F5F7FA]'
            }`}
            title="切换证件照人像标准参考线（头顶留白、视线水平）"
          >
            <Scan className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">标准参考线</span>
          </button>

          {/* Print crop guide dashed frame toggle (即时切换排版裁剪虚线参考框) */}
          {onTogglePrintCropGuide && (
            <button
              type="button"
              id="preview-toggle-print-crop-btn"
              onClick={onTogglePrintCropGuide}
              className={`px-2.5 py-1 rounded-[6px] text-[12px] font-medium transition-all flex items-center space-x-1.5 min-h-[32px] cursor-pointer ${
                showPrintCropGuide
                  ? 'bg-[#FFB347]/15 text-[#D97706] font-bold border border-[#FFB347]/40 shadow-xs'
                  : 'text-[#666666] hover:bg-[#F5F7FA]'
              }`}
              title="即时显示/隐藏打印排版时的裁剪虚线参考框与十字定位角标"
            >
              <Scissors className="w-3.5 h-3.5 text-[#D97706]" />
              <span className="hidden sm:inline">裁剪虚线框</span>
              {showPrintCropGuide && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFB347] ml-0.5" />
              )}
            </button>
          )}

          {/* Undo, Timeline Progress Bar / Pill, Redo, and Dropdown Jump Panel */}
          {onUndo && onRedo && (
            <div className="relative flex items-center space-x-1" ref={historyDropdownRef}>
              {/* Undo Button */}
              <button
                id="preview-undo-btn"
                type="button"
                disabled={!canUndo}
                onClick={onUndo}
                className={`p-1.5 rounded-[6px] min-w-[32px] min-h-[32px] flex items-center justify-center transition-all ${
                  canUndo
                    ? 'text-[#2A2460] hover:bg-[#F5F7FA] hover:text-[#7B68EE] active:scale-95 cursor-pointer'
                    : 'text-[#CCCCCC] opacity-40 cursor-not-allowed'
                }`}
                title={canUndo ? '撤销最近一次调整 (Ctrl+Z)' : '暂无可撤销操作'}
              >
                <Undo2 className="w-4 h-4" />
              </button>

              {/* History Timeline Progress Bar & Jump Pill */}
              <button
                type="button"
                id="preview-history-timeline-btn"
                onClick={() => setIsHistoryOpen(prev => !prev)}
                className={`px-2 py-1 rounded-[8px] text-[11px] font-medium transition-all flex items-center space-x-1.5 min-h-[32px] border cursor-pointer select-none ${
                  isHistoryOpen
                    ? 'bg-[#7B68EE] text-white border-[#7B68EE] shadow-xs'
                    : ((undoStack?.length || 0) + (redoStack?.length || 0)) > 0
                    ? 'bg-[#FAF9FF] hover:bg-[#F4F1FF] text-[#2A2460] hover:text-[#7B68EE] border-[#7B68EE]/30 shadow-2xs'
                    : 'bg-[#F5F7FA] text-[#888888] border-[#EEEEEE] hover:bg-[#FAF9FF]'
                }`}
                title="查看编辑历史快照时间轴与进度条，支持快速跳转至任意节点"
              >
                <History className={`w-3.5 h-3.5 ${isHistoryOpen ? 'text-white' : 'text-[#7B68EE]'}`} />
                
                {/* Mini Linear Progress Bar */}
                <div className="w-10 sm:w-14 h-1.5 bg-black/10 rounded-full overflow-hidden hidden xs:flex items-center">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isHistoryOpen ? 'bg-white' : 'bg-[#7B68EE]'
                    }`}
                    style={{
                      width: `${
                        ((undoStack?.length || 0) + 1 + (redoStack?.length || 0)) > 1
                          ? ((undoStack?.length || 0) /
                              Math.max(1, (undoStack?.length || 0) + (redoStack?.length || 0))) *
                            100
                          : 100
                      }%`,
                    }}
                  />
                </div>

                <span className="font-mono font-bold text-[10.5px]">
                  {(undoStack?.length || 0) + 1}/{(undoStack?.length || 0) + 1 + (redoStack?.length || 0)}
                </span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isHistoryOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Redo Button */}
              <button
                id="preview-redo-btn"
                type="button"
                disabled={!canRedo}
                onClick={onRedo}
                className={`p-1.5 rounded-[6px] min-w-[32px] min-h-[32px] flex items-center justify-center transition-all ${
                  canRedo
                    ? 'text-[#2A2460] hover:bg-[#F5F7FA] hover:text-[#7B68EE] active:scale-95 cursor-pointer'
                    : 'text-[#CCCCCC] opacity-40 cursor-not-allowed'
                }`}
                title={canRedo ? '重做恢复操作 (Ctrl+Y)' : '暂无可重做操作'}
              >
                <Redo2 className="w-4 h-4" />
              </button>

              {/* History Timeline Dropdown Panel */}
              <HistoryTimelinePanel
                undoStack={undoStack}
                redoStack={redoStack}
                currentSnapshot={
                  currentSnapshot || {
                    beauty: { smoothing: 0, whitening: 0, slimming: 0, bigEyes: 0 },
                    bgSettings: bgSettings || {
                      type: 'solid',
                      color: '#FFFFFF',
                      tolerance: 35,
                      feather: 1.5,
                      deFringe: true,
                    },
                    composition,
                    spec,
                    step,
                    description: '当前状态',
                    timestamp: Date.now(),
                  }
                }
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={onUndo}
                onRedo={onRedo}
                onJumpToSnapshot={(idx) => {
                  onJumpToSnapshot?.(idx);
                  setIsHistoryOpen(false);
                }}
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                onResetToInitial={() => {
                  if (onResetToInitial) {
                    onResetToInitial();
                  } else {
                    onJumpToSnapshot?.(0);
                  }
                  setIsHistoryOpen(false);
                }}
              />

              <div className="h-4 w-px bg-[#EEEEEE]" />
            </div>
          )}

          {/* Rotate button */}
          <button
            id="rotate-btn"
            onClick={onRotateImage}
            className="p-1.5 rounded-[6px] text-[#666666] hover:bg-[#F5F7FA] hover:text-[#2A2460] min-w-[32px] min-h-[32px] flex items-center justify-center transition-all"
            title="顺时针旋转90度"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-[#EEEEEE]" />

          {/* Zoom Out */}
          <button
            id="zoom-out-btn"
            onClick={() => onZoom(-0.1)}
            className="p-1.5 rounded-[6px] text-[#666666] hover:bg-[#F5F7FA] hover:text-[#2A2460] min-w-[32px] min-h-[32px] flex items-center justify-center transition-all"
            title="缩小人像"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Current Scale Display */}
          <span
            id="zoom-scale-badge"
            className="px-1 text-[11px] font-mono font-bold text-[#2A2460] min-w-[42px] text-center select-none"
            title="当前人像构图缩放比例"
          >
            {Math.round((composition.scale || 1) * 100)}%
          </span>

          {/* Zoom In */}
          <button
            id="zoom-in-btn"
            onClick={() => onZoom(0.1)}
            className="p-1.5 rounded-[6px] text-[#666666] hover:bg-[#F5F7FA] hover:text-[#2A2460] min-w-[32px] min-h-[32px] flex items-center justify-center transition-all"
            title="放大人像"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Reset Zoom */}
          <button
            id="zoom-reset-btn"
            onClick={onResetZoom}
            className="p-1.5 rounded-[6px] text-[#666666] hover:bg-[#F5F7FA] hover:text-[#2A2460] min-w-[32px] min-h-[32px] flex items-center justify-center transition-all"
            title="还原缩放 100% (居中)"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Canvas Container Frame with Pinch-to-Zoom and Touch Support */}
      <div
        ref={containerRef}
        id="preview-stage-container"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        style={{ touchAction: 'none' }}
        className={`relative w-full flex-1 min-h-[340px] sm:min-h-[460px] flex items-center justify-center bg-[#ECEFF3] rounded-[16px] border border-[#E2E8F0] overflow-hidden p-4 select-none cursor-grab ${
          isDragging ? 'cursor-grabbing' : ''
        }`}
      >
        {/* Subtle grid pattern background to show transparency or framing */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle, #2A2460 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }}
        />

        {/* Floating Pinch-To-Zoom Touch HUD Indicator */}
        {isPinching && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-full bg-[#2A2460]/90 backdrop-blur-md text-white text-[12px] font-semibold flex items-center space-x-2 shadow-[0_4px_16px_rgba(42,36,96,0.3)] animate-in fade-in pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-[#FFB347] animate-pulse" />
            <span>双指缩放中</span>
            <span className="font-mono text-[#5AC8C3] font-bold">
              {Math.round(composition.scale * 100)}%
            </span>
          </div>
        )}

        {/* General touch feedback toast (e.g., reset, scale change) */}
        {!isPinching && activeTouchFeedback && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded-full bg-[#2A2460]/85 backdrop-blur-md text-white text-[11px] font-medium flex items-center space-x-1.5 shadow-md pointer-events-none animate-in fade-in">
            <Smartphone className="w-3 h-3 text-[#5AC8C3]" />
            <span>{activeTouchFeedback}</span>
          </div>
        )}

        {/* 6-Inch Print Sheet Layout HUD Indicator */}
        {printPreviewMode === 'sheet' && step === 'generate' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-full bg-[#2A2460]/90 backdrop-blur-md text-white text-[11px] font-semibold flex items-center space-x-2 shadow-md pointer-events-none animate-in fade-in">
            <Printer className="w-3.5 h-3.5 text-[#FFB347]" />
            <span>6 寸相纸排版整页预览 ({spec.printPerSheet6Inch || 4} 张带裁剪虚线)</span>
          </div>
        )}

        {/* Live Canvas */}
        <div
          className={`relative shadow-[0_12px_32px_rgba(42,36,96,0.16)] rounded-[4px] overflow-hidden bg-white max-w-full max-h-full flex items-center justify-center ${
            step === 'background' && activeBrushTool !== 'none'
              ? 'pointer-events-auto cursor-crosshair select-none'
              : 'pointer-events-none'
          }`}
          onPointerDown={e => {
            if (step !== 'background' || !activeBrushTool || activeBrushTool === 'none') return;
            const rect = e.currentTarget.getBoundingClientRect();
            const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

            if (activeBrushTool === 'eyedropper') {
              if (onChangeBg && bgSettings) {
                const existing = bgSettings.sampledBgPoints || [];
                onChangeBg({
                  ...bgSettings,
                  sampledBgPoints: [...existing, { x: nx, y: ny }],
                });
                triggerFeedback('已吸取该位置杂色，已融入背景消除！');
              }
            } else if (activeBrushTool === 'erase' || activeBrushTool === 'restore') {
              isBrushingRef.current = true;
              activeStrokeRef.current = {
                id: Date.now().toString(),
                type: activeBrushTool,
                points: [{ x: nx, y: ny }],
                size: brushSize || 28,
              };
            }
          }}
          onPointerMove={e => {
            if (step !== 'background' || !activeBrushTool || activeBrushTool === 'none') return;
            const rect = e.currentTarget.getBoundingClientRect();
            setBrushCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

            if (isBrushingRef.current && activeStrokeRef.current) {
              const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
              activeStrokeRef.current.points.push({ x: nx, y: ny });
            }
          }}
          onPointerUp={() => {
            if (isBrushingRef.current && activeStrokeRef.current && onChangeBg && bgSettings) {
              isBrushingRef.current = false;
              const existingStrokes = bgSettings.brushStrokes || [];
              onChangeBg({
                ...bgSettings,
                brushStrokes: [...existingStrokes, activeStrokeRef.current],
              });
              activeStrokeRef.current = null;
              triggerFeedback(activeBrushTool === 'erase' ? '已手动抹除残留背景' : '已手动恢复主体轮廓');
            }
          }}
          onPointerLeave={() => {
            setBrushCursorPos(null);
            if (isBrushingRef.current && activeStrokeRef.current && onChangeBg && bgSettings) {
              isBrushingRef.current = false;
              const existingStrokes = bgSettings.brushStrokes || [];
              onChangeBg({
                ...bgSettings,
                brushStrokes: [...existingStrokes, activeStrokeRef.current],
              });
              activeStrokeRef.current = null;
            }
          }}
        >
          <canvas
            ref={canvasRef}
            className={`max-w-full max-h-[500px] object-contain block transition-opacity duration-200 ${
              isComparingOriginal ? 'opacity-0' : 'opacity-100'
            }`}
          />

          {/* Interactive Brush Cursor Indicator */}
          {step === 'background' && activeBrushTool && activeBrushTool !== 'none' && brushCursorPos && (
            <div
              className={`pointer-events-none absolute rounded-full border-2 -translate-x-1/2 -translate-y-1/2 z-40 ${
                activeBrushTool === 'erase'
                  ? 'border-[#E86C5D] bg-[#E86C5D]/20'
                  : activeBrushTool === 'restore'
                  ? 'border-[#5AC8C3] bg-[#5AC8C3]/20'
                  : 'border-[#7B68EE] bg-[#7B68EE]/20'
              }`}
              style={{
                left: brushCursorPos.x,
                top: brushCursorPos.y,
                width: Math.max(12, Math.round((brushSize || 28) * 0.45)),
                height: Math.max(12, Math.round((brushSize || 28) * 0.45)),
              }}
            />
          )}

          {/* Print Layout Crop Reference Dashed Box Overlay (打印排版裁剪虚线参考框) */}
          {showPrintCropGuide && !isComparingOriginal && printPreviewMode !== 'sheet' && (
            <svg
              viewBox={`0 0 ${spec.widthPx} ${spec.heightPx}`}
              className="absolute inset-0 w-full h-full pointer-events-none z-18"
              style={{ overflow: 'visible' }}
            >
              <defs>
                <filter id="printCropGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="1" floodColor="#000000" floodOpacity="0.45" />
                </filter>
              </defs>

              {/* 1. 外层裁切主虚线框 (Main Cutting Boundary Dashed Frame) */}
              <rect
                x="1.5"
                y="1.5"
                width={spec.widthPx - 3}
                height={spec.heightPx - 3}
                fill="none"
                stroke="#000000"
                strokeWidth="2"
                strokeOpacity="0.35"
                strokeDasharray="6 4"
              />
              <rect
                x="1.5"
                y="1.5"
                width={spec.widthPx - 3}
                height={spec.heightPx - 3}
                fill="none"
                stroke="#FFB347"
                strokeWidth="1.5"
                strokeDasharray="6 4"
                filter="url(#printCropGlow)"
              />

              {/* 2. 内层冲印出血与安全留白虚线框 (Inner Print Safe Margin ~4%) */}
              <rect
                x={Math.round(spec.widthPx * 0.045)}
                y={Math.round(spec.heightPx * 0.04)}
                width={Math.round(spec.widthPx * 0.91)}
                height={Math.round(spec.heightPx * 0.92)}
                fill="none"
                stroke="#5AC8C3"
                strokeWidth="1"
                strokeDasharray="4 3"
                strokeOpacity="0.8"
              />

              {/* 3. 打印裁切四角定位十字标 (Corner Alignment Scissor Crosshairs) */}
              <g strokeWidth="2" strokeLinecap="square">
                {/* Top Left Corner */}
                <line x1="0" y1="0" x2="16" y2="0" stroke="#FFB347" />
                <line x1="0" y1="0" x2="0" y2="16" stroke="#FFB347" />

                {/* Top Right Corner */}
                <line x1={spec.widthPx} y1="0" x2={spec.widthPx - 16} y2="0" stroke="#FFB347" />
                <line x1={spec.widthPx} y1="0" x2={spec.widthPx} y2="16" stroke="#FFB347" />

                {/* Bottom Left Corner */}
                <line x1="0" y1={spec.heightPx} x2="16" y2={spec.heightPx} stroke="#FFB347" />
                <line x1="0" y1={spec.heightPx} x2="0" y2={spec.heightPx - 16} stroke="#FFB347" />

                {/* Bottom Right Corner */}
                <line x1={spec.widthPx} y1={spec.heightPx} x2={spec.widthPx - 16} y2={spec.heightPx} stroke="#FFB347" />
                <line x1={spec.widthPx} y1={spec.heightPx} x2={spec.widthPx} y2={spec.heightPx - 16} stroke="#FFB347" />
              </g>

              {/* 4. 裁切线文字与剪刀指示标 HUD 标签 */}
              <g transform={`translate(${Math.round(spec.widthPx * 0.5 - 48)}, 6)`}>
                <rect
                  x="0"
                  y="0"
                  width="96"
                  height="18"
                  rx="9"
                  fill="#2A2460"
                  fillOpacity="0.88"
                />
                <text
                  x="48"
                  y="12.5"
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize="9.5"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  ✂ 裁剪虚线参考
                </text>
              </g>

              {/* Bottom center spec size pill */}
              <g transform={`translate(${Math.round(spec.widthPx * 0.5 - 65)}, ${spec.heightPx - 24})`}>
                <rect
                  x="0"
                  y="0"
                  width="130"
                  height="18"
                  rx="9"
                  fill="#2A2460"
                  fillOpacity="0.88"
                />
                <text
                  x="65"
                  y="12.5"
                  textAnchor="middle"
                  fill="#5AC8C3"
                  fontSize="9"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {spec.widthMm}×{spec.heightMm}mm · 300DPI
                </text>
              </g>
            </svg>
          )}

          {/* Compare Original Overlay Image (when user holds button) */}
          {originalImage && isComparingOriginal && (
            <img
              src={originalImage.src}
              alt="Original"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            />
          )}

          {/* Standard ID Photo Composition Guideline Overlay */}
          {showGuides && (
            <div className="absolute inset-0 pointer-events-none z-10">
              {/* Head top limit line (12% margin) */}
              <div className="absolute top-[12%] left-0 right-0 border-b border-dashed border-[#5B6DFC]/80">
                <span className="absolute right-2 -top-4 text-[9px] font-medium bg-[#5B6DFC] text-white px-1 rounded shadow-sm">
                  头顶留白线 (10~15%)
                </span>
              </div>

              {/* Eye level horizontal line (approx 42% height) */}
              <div className="absolute top-[42%] left-0 right-0 border-b border-dashed border-[#5AC8C3]/80">
                <span className="absolute right-2 -top-4 text-[9px] font-medium bg-[#5AC8C3] text-white px-1 rounded shadow-sm">
                  视线水平线
                </span>
              </div>

              {/* Chin level line (approx 68% height) */}
              <div className="absolute top-[68%] left-0 right-0 border-b border-dashed border-[#E86C5D]/80">
                <span className="absolute right-2 -top-4 text-[9px] font-medium bg-[#E86C5D] text-white px-1 rounded shadow-sm">
                  下巴基准线
                </span>
              </div>

              {/* Vertical center axis line */}
              <div className="absolute left-[50%] top-0 bottom-0 border-r border-dashed border-[#7B68EE]/60"></div>

              {/* Head oval framing box */}
              <div className="absolute left-[20%] right-[20%] top-[14%] bottom-[32%] border border-dashed border-[#7B68EE]/40 rounded-[50%]" />
            </div>
          )}

          {/* Face Result Detection Box Translucent Overlay (人脸检测与构图半透明覆盖层) */}
          {effectiveShowFaceBox && faceOverlay && (
            <svg
              viewBox={`0 0 ${spec.widthPx} ${spec.heightPx}`}
              className="absolute inset-0 w-full h-full pointer-events-none z-15"
              style={{ overflow: 'visible' }}
            >
              <defs>
                <linearGradient id="faceBoxOverlayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7B68EE" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#5AC8C3" stopOpacity="0.14" />
                </linearGradient>
              </defs>

              <g
                transform={`translate(${faceOverlay.targetCenterX}, ${faceOverlay.targetCenterY}) rotate(${faceOverlay.rotation})`}
              >
                {/* 1. 半透明填充与边框 (Translucent Face Box) */}
                <rect
                  x={faceOverlay.boxX}
                  y={faceOverlay.boxY}
                  width={faceOverlay.boxW}
                  height={faceOverlay.boxH}
                  rx={Math.max(4, Math.min(10, faceOverlay.boxW * 0.04))}
                  fill="url(#faceBoxOverlayGrad)"
                  stroke="#7B68EE"
                  strokeWidth="1.5"
                  strokeDasharray="6 4"
                />

                {/* 2. 取景器四角高亮标记 (Viewfinder Corner Accents) */}
                <path
                  d={faceOverlay.cornerPath}
                  fill="none"
                  stroke="#5AC8C3"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* 3. 人脸中心十字标 (Face Center Crosshair) */}
                <g opacity="0.85">
                  <line
                    x1="-10"
                    y1={faceOverlay.boxY + faceOverlay.boxH * 0.5}
                    x2="10"
                    y2={faceOverlay.boxY + faceOverlay.boxH * 0.5}
                    stroke="#7B68EE"
                    strokeWidth="1.5"
                  />
                  <line
                    x1="0"
                    y1={faceOverlay.boxY + faceOverlay.boxH * 0.5 - 10}
                    x2="0"
                    y2={faceOverlay.boxY + faceOverlay.boxH * 0.5 + 10}
                    stroke="#7B68EE"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx="0"
                    cy={faceOverlay.boxY + faceOverlay.boxH * 0.5}
                    r="2.5"
                    fill="#7B68EE"
                  />
                </g>

                {/* 4. 双眼水平连线与瞳孔点 (Eye Axis Line & Eye Landmarks) */}
                {faceOverlay.leftEye && faceOverlay.rightEye && (
                  <g opacity="0.9">
                    <line
                      x1={faceOverlay.leftEye.x}
                      y1={faceOverlay.leftEye.y}
                      x2={faceOverlay.rightEye.x}
                      y2={faceOverlay.rightEye.y}
                      stroke="#5AC8C3"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                    />
                    <circle
                      cx={faceOverlay.leftEye.x}
                      cy={faceOverlay.leftEye.y}
                      r="4"
                      fill="none"
                      stroke="#5AC8C3"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx={faceOverlay.rightEye.x}
                      cy={faceOverlay.rightEye.y}
                      r="4"
                      fill="none"
                      stroke="#5AC8C3"
                      strokeWidth="1.5"
                    />
                  </g>
                )}

                {/* 5. 构图比例实时提示胶囊 (Real-time Composition HUD Pill) */}
                <g
                  transform={`translate(0, ${
                    faceOverlay.boxY < 24 ? faceOverlay.boxY + 22 : faceOverlay.boxY - 8
                  })`}
                >
                  <rect
                    x="-75"
                    y="-18"
                    width="150"
                    height="20"
                    rx="10"
                    fill="rgba(42, 36, 96, 0.9)"
                    stroke={
                      faceOverlay.heightRatio >= 55 && faceOverlay.heightRatio <= 72
                        ? '#5AC8C3'
                        : '#FFB347'
                    }
                    strokeWidth="1.2"
                  />
                  <text
                    x="0"
                    y="-4"
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="10"
                    fontFamily="system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
                    fontWeight="bold"
                  >
                    {`人脸占比: ${faceOverlay.heightRatio}% ${
                      faceOverlay.heightRatio >= 55 && faceOverlay.heightRatio <= 72
                        ? '(适中)'
                        : faceOverlay.heightRatio < 55
                        ? '(偏小)'
                        : '(偏大)'
                    }`}
                  </text>
                </g>
              </g>
            </svg>
          )}

          {/* Processing Loading Spinner */}
          {isProcessing && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 z-20 transition-all">
              <div className="w-12 h-12 rounded-[12px] bg-gradient-to-tr from-[#A56EFF] to-[#7B68EE] flex items-center justify-center text-white mb-3 shadow-[0_4px_12px_rgba(123,104,238,0.3)]">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <p className="text-[14px] font-bold text-[#2A2460]">
                {processingMessage || '处理中...'}
              </p>
              <p className="text-[11px] text-[#888888] mt-1">
                本地多线程实时渲染，稍候即可
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Floating Bar: Compare Original Button & Quick Tips */}
      <div className="w-full flex items-center justify-between mt-3 px-1 flex-wrap gap-2">
        <div className="text-[11px] text-[#888888] flex items-center space-x-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#FFB347] shrink-0" />
          <span>移动端支持双指捏合缩放人像、单指平移拖拽，双击可还原居中</span>
        </div>

        {/* Press & Hold to Compare Original */}
        {originalImage && (
          <button
            id="compare-original-btn"
            onMouseDown={() => setIsComparingOriginal(true)}
            onMouseUp={() => setIsComparingOriginal(false)}
            onMouseLeave={() => setIsComparingOriginal(false)}
            onTouchStart={() => setIsComparingOriginal(true)}
            onTouchEnd={() => setIsComparingOriginal(false)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-[20px] bg-[#FFFFFF] border border-[#EEEEEE] hover:bg-[#F5F7FA] active:bg-[#EEEEEE] text-[#2A2460] text-[12px] font-semibold transition-all shadow-[0_2px_6px_rgba(42,36,96,0.04)] select-none cursor-pointer"
            title="长按此按钮查看上传时的原始照片"
          >
            <Eye className="w-3.5 h-3.5 text-[#7B68EE]" />
            <span>按住对比原图</span>
          </button>
        )}
      </div>
    </div>
  );
};
