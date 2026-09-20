import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  WorkflowStep,
  PhotoSpec,
  BeautySettings,
  BackgroundSettings,
  CompositionSettings,
  FaceDetectionResult,
  HistorySnapshot,
} from './types';
import { PHOTO_SPECS, PRESET_COLORS, autoMatchSpec } from './utils/photoSpecs';
import {
  detectFace,
  applySkinBeauty,
  applyFaceWarp,
  generatePortraitMatte,
  renderWithBackground,
  cropToSpec,
  generatePrintSheet,
  downloadCanvasImage,
} from './utils/imageProcessing';
import { runAIMatting, initAIModel, subscribeAIModelStatus, AIModelStatus } from './utils/aiMatting';
import { createSamplePortraitCanvas } from './utils/sampleImages';
import { Header } from './components/Header';
import { StepIndicator } from './components/StepIndicator';
import { PreviewStage } from './components/PreviewStage';
import { StepUpload } from './components/steps/StepUpload';
import { StepBeauty } from './components/steps/StepBeauty';
import { StepBackground } from './components/steps/StepBackground';
import { StepGenerate } from './components/steps/StepGenerate';
import { MobileQRCodeModal } from './components/MobileQRCodeModal';
import { ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  // Step state
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('upload');

  // Image source state
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [imageName, setImageName] = useState<string>('portrait.jpg');
  const [faceResult, setFaceResult] = useState<FaceDetectionResult | null>(null);

  // AI Matting Engine State
  const [aiModelStatus, setAiModelStatus] = useState<AIModelStatus>('uninitialized');
  const [aiBackend, setAiBackend] = useState<'webgpu' | 'wasm' | 'none'>('none');
  const renderRunIdRef = useRef<number>(0);

  // Settings
  const [selectedSpec, setSelectedSpec] = useState<PhotoSpec>(PHOTO_SPECS[0]);
  const [beauty, setBeauty] = useState<BeautySettings>({
    smoothing: 0,
    whitening: 0,
    slimming: 0,
    bigEyes: 0,
    brightness: 0,
    contrast: 0,
  });
  const [bgSettings, setBgSettings] = useState<BackgroundSettings>({
    type: 'solid',
    color: '#FFFFFF',
    tolerance: 35,
    feather: 1.5,
    deFringe: true,
    mattingMode: 'standard',
    edgeRefine: 'natural',
    engine: 'ai_modnet',
    guidedFilter: true,
    guidedRadius: 3,
    decontamination: true,
    brushStrokes: [],
    sampledBgPoints: [],
    showAlphaMaskOnly: false,
  });
  const [activeBrushTool, setActiveBrushTool] = useState<'none' | 'erase' | 'restore' | 'eyedropper'>('none');
  const [brushSize, setBrushSize] = useState<number>(28);
  const [composition, setComposition] = useState<CompositionSettings>({
    scale: 1.0,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
  });

  // UI state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingMessage, setProcessingMessage] = useState<string>('');
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [showFaceBox, setShowFaceBox] = useState<boolean>(true);
  const [showPrintCropGuide, setShowPrintCropGuide] = useState<boolean>(true);
  const [printPreviewMode, setPrintPreviewMode] = useState<'single' | 'sheet'>('single');
  const [isQRCodeModalOpen, setIsQRCodeModalOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Operation Stack (Stack) state management for Undo / Redo
  const [undoStack, setUndoStack] = useState<HistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<HistorySnapshot[]>([]);

  // Synchronized refs to avoid stale closure during rapid user events
  const beautyRef = useRef(beauty);
  const bgSettingsRef = useRef(bgSettings);
  const compositionRef = useRef(composition);
  const selectedSpecRef = useRef(selectedSpec);
  const currentStepRef = useRef(currentStep);
  const printPreviewModeRef = useRef(printPreviewMode);

  useEffect(() => {
    beautyRef.current = beauty;
  }, [beauty]);
  useEffect(() => {
    bgSettingsRef.current = bgSettings;
  }, [bgSettings]);
  useEffect(() => {
    compositionRef.current = composition;
  }, [composition]);
  useEffect(() => {
    selectedSpecRef.current = selectedSpec;
  }, [selectedSpec]);
  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);
  useEffect(() => {
    printPreviewModeRef.current = printPreviewMode;
  }, [printPreviewMode]);

  // Interaction tracking for continuous slider dragging / canvas pan
  const isInteractingRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isUndoRedoActiveRef = useRef<boolean>(false);

  // Canvas references
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const intermediateCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const singlePhotoCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Show Toast helper
  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);

  // 3. Main Image Rendering Pipeline Core Execution
  const executeRenderPipeline = useCallback(async (
    targetBeauty: BeautySettings,
    targetBg: BackgroundSettings,
    targetComp: CompositionSettings,
    targetSpec: PhotoSpec,
    targetStep: WorkflowStep,
    targetPrintMode: 'single' | 'sheet' = printPreviewModeRef.current
  ) => {
    if (!originalImage || !previewCanvasRef.current) return;
    const runId = ++renderRunIdRef.current;

    try {
      const baseCanvas = document.createElement('canvas');
      const maxDim = 1000;
      let sw = originalImage.naturalWidth || originalImage.width;
      let sh = originalImage.naturalHeight || originalImage.height;
      if (sw > maxDim || sh > maxDim) {
        if (sw > sh) {
          sh = Math.round((sh * maxDim) / sw);
          sw = maxDim;
        } else {
          sw = Math.round((sw * maxDim) / sh);
          sh = maxDim;
        }
      }
      baseCanvas.width = sw;
      baseCanvas.height = sh;
      const baseCtx = baseCanvas.getContext('2d');
      if (!baseCtx) return;

      baseCtx.drawImage(originalImage, 0, 0, sw, sh);

      // A. Apply Beauty (Smoothing & Whitening & Brightness & Contrast)
      let currentCanvas = baseCanvas;
      const hasToneAdjust =
        (targetBeauty.brightness !== undefined && targetBeauty.brightness !== 0) ||
        (targetBeauty.contrast !== undefined && targetBeauty.contrast !== 0);
      if (targetBeauty.smoothing > 0 || targetBeauty.whitening > 0 || hasToneAdjust) {
        const srcImgData = baseCtx.getImageData(0, 0, sw, sh);
        const beautifiedData = applySkinBeauty(srcImgData, targetBeauty);
        baseCtx.putImageData(beautifiedData, 0, 0);
      }

      // B. Apply Face Slimming / Big Eyes Warp
      if (targetBeauty.slimming > 0 || targetBeauty.bigEyes > 0) {
        const faceBox = faceResult?.box || { x: 0.2, y: 0.15, width: 0.6, height: 0.7 };
        currentCanvas = applyFaceWarp(currentCanvas, faceBox, targetBeauty);
      }

      // C. Portrait Matting & Background Replacement
      const compositeCanvas = document.createElement('canvas');
      const compCtx = currentCanvas.getContext('2d')!;
      const compData = compCtx.getImageData(0, 0, sw, sh);

      let alphaMatte: Float32Array;
      if (targetBg.engine !== 'bayesian_dual') {
        const aiMatte = await runAIMatting(compData, targetBg);
        if (aiMatte) {
          alphaMatte = aiMatte;
        } else {
          alphaMatte = generatePortraitMatte(compData, targetBg, faceResult || undefined);
        }
      } else {
        alphaMatte = generatePortraitMatte(compData, targetBg, faceResult || undefined);
      }

      // Guard against race conditions from rapid parameter changes
      if (runId !== renderRunIdRef.current) return;

      renderWithBackground(compData, alphaMatte, targetBg, compositeCanvas);

      // Save for downloads
      intermediateCanvasRef.current = compositeCanvas;

      // D. Crop to Selected Spec & Composition
      const finalCanvas = cropToSpec(
        compositeCanvas,
        targetSpec,
        targetComp,
        faceResult || undefined,
        targetBg.color
      );
      singlePhotoCanvasRef.current = finalCanvas;

      // Draw to preview display
      const preview = previewCanvasRef.current;
      if (preview) {
        if (targetStep === 'generate' && targetPrintMode === 'sheet') {
          const sheetCanvas = generatePrintSheet(finalCanvas, targetSpec);
          preview.width = sheetCanvas.width;
          preview.height = sheetCanvas.height;
          const prevCtx = preview.getContext('2d');
          if (prevCtx) {
            prevCtx.drawImage(sheetCanvas, 0, 0);
          }
        } else {
          preview.width = finalCanvas.width;
          preview.height = finalCanvas.height;
          const prevCtx = preview.getContext('2d');
          if (prevCtx) {
            prevCtx.drawImage(finalCanvas, 0, 0);
          }
        }
      }
    } catch (e) {
      console.error('Render pipeline error:', e);
    }
  }, [originalImage, faceResult]);

  // Apply a historical snapshot to UI state AND force instant canvas redraw to that exact snapshot
  const applySnapshot = useCallback((targetSnapshot: HistorySnapshot, toastMsg?: string) => {
    isUndoRedoActiveRef.current = true;

    // 1. Immediately sync react states
    setBeauty(targetSnapshot.beauty);
    setBgSettings(targetSnapshot.bgSettings);
    setComposition(targetSnapshot.composition);
    if (targetSnapshot.spec) {
      setSelectedSpec(targetSnapshot.spec);
    }
    if (targetSnapshot.step && targetSnapshot.step !== currentStepRef.current) {
      setCurrentStep(targetSnapshot.step);
    }

    // 2. Immediately update refs so there is zero stale data window
    beautyRef.current = targetSnapshot.beauty;
    bgSettingsRef.current = targetSnapshot.bgSettings;
    compositionRef.current = targetSnapshot.composition;
    if (targetSnapshot.spec) {
      selectedSpecRef.current = targetSnapshot.spec;
    }
    if (targetSnapshot.step) {
      currentStepRef.current = targetSnapshot.step;
    }

    // 3. Immediately redraw canvas with exact snapshot parameters (prevent visual desynchronization)
    executeRenderPipeline(
      targetSnapshot.beauty,
      targetSnapshot.bgSettings,
      targetSnapshot.composition,
      targetSnapshot.spec || selectedSpecRef.current,
      targetSnapshot.step || currentStepRef.current,
      printPreviewModeRef.current
    );

    setTimeout(() => {
      isUndoRedoActiveRef.current = false;
    }, 60);

    if (toastMsg) {
      showToast(toastMsg, 'info');
    }
  }, [executeRenderPipeline, showToast]);

  // Push a snapshot onto the undo stack before a continuous adjustment begins
  const recordBeforeInteraction = useCallback((description: string) => {
    if (isUndoRedoActiveRef.current) return;

    if (!isInteractingRef.current) {
      const snapshot: HistorySnapshot = {
        beauty: { ...beautyRef.current },
        bgSettings: { ...bgSettingsRef.current },
        composition: { ...compositionRef.current },
        spec: selectedSpecRef.current,
        step: currentStepRef.current,
        description,
        timestamp: Date.now(),
      };

      setUndoStack(prev => {
        const next = [...prev, snapshot];
        if (next.length > 30) next.shift(); // Keep max 30 levels
        return next;
      });
      setRedoStack([]); // Clear redo stack on new branch of operations
      isInteractingRef.current = true;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      isInteractingRef.current = false;
    }, 450);
  }, []);

  // Record a discrete single action immediately (e.g. presets, button clicks, rotations)
  const recordDiscreteAction = useCallback((description: string, applyAction: () => void) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    isInteractingRef.current = false;

    const snapshot: HistorySnapshot = {
      beauty: { ...beautyRef.current },
      bgSettings: { ...bgSettingsRef.current },
      composition: { ...compositionRef.current },
      spec: selectedSpecRef.current,
      step: currentStepRef.current,
      description,
      timestamp: Date.now(),
    };

    setUndoStack(prev => {
      const next = [...prev, snapshot];
      if (next.length > 30) next.shift();
      return next;
    });
    setRedoStack([]);

    applyAction();
  }, []);

  // Undo operation handler: pops previous snapshot and redraws canvas immediately
  const handleUndo = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    isInteractingRef.current = false;

    if (undoStack.length === 0) return;

    const previousSnapshot = undoStack[undoStack.length - 1];
    const newUndo = undoStack.slice(0, -1);

    // Create snapshot of present state to push to redoStack
    const currentSnapshot: HistorySnapshot = {
      beauty: { ...beautyRef.current },
      bgSettings: { ...bgSettingsRef.current },
      composition: { ...compositionRef.current },
      spec: selectedSpecRef.current,
      step: currentStepRef.current,
      description: previousSnapshot.description,
      timestamp: Date.now(),
    };

    setRedoStack(prevRedo => [...prevRedo, currentSnapshot]);
    setUndoStack(newUndo);

    applySnapshot(
      previousSnapshot,
      previousSnapshot.description
        ? `已撤销：${previousSnapshot.description}`
        : '已撤销最近一次操作'
    );
  }, [undoStack, applySnapshot]);

  // Redo operation handler: applies next snapshot and redraws canvas immediately
  const handleRedo = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    isInteractingRef.current = false;

    if (redoStack.length === 0) return;

    const nextSnapshot = redoStack[redoStack.length - 1];
    const newRedo = redoStack.slice(0, -1);

    // Create snapshot of present state to push to undoStack
    const currentSnapshot: HistorySnapshot = {
      beauty: { ...beautyRef.current },
      bgSettings: { ...bgSettingsRef.current },
      composition: { ...compositionRef.current },
      spec: selectedSpecRef.current,
      step: currentStepRef.current,
      description: nextSnapshot.description,
      timestamp: Date.now(),
    };

    setUndoStack(prevUndo => [...prevUndo, currentSnapshot]);
    setRedoStack(newRedo);

    applySnapshot(
      nextSnapshot,
      nextSnapshot.description
        ? `已恢复：${nextSnapshot.description}`
        : '已重做操作'
    );
  }, [redoStack, applySnapshot]);

  // Jump directly to ANY snapshot index on the timeline
  const handleJumpToSnapshot = useCallback((targetIndex: number) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    isInteractingRef.current = false;

    const currentSnapshot: HistorySnapshot = {
      beauty: { ...beautyRef.current },
      bgSettings: { ...bgSettingsRef.current },
      composition: { ...compositionRef.current },
      spec: selectedSpecRef.current,
      step: currentStepRef.current,
      description: '当前状态',
      timestamp: Date.now(),
    };

    // Full timeline: [undo[0], undo[1], ..., current, redo[last], ..., redo[0]]
    const allTimeline = [...undoStack, currentSnapshot, ...redoStack.slice().reverse()];
    const currentIndex = undoStack.length;

    if (targetIndex < 0 || targetIndex >= allTimeline.length || targetIndex === currentIndex) {
      return;
    }

    const targetSnapshot = allTimeline[targetIndex];
    const newUndoStack = allTimeline.slice(0, targetIndex);
    const newRedoStack = allTimeline.slice(targetIndex + 1).reverse();

    setUndoStack(newUndoStack);
    setRedoStack(newRedoStack);

    applySnapshot(
      targetSnapshot,
      targetSnapshot.description
        ? `已跳转至快照：${targetSnapshot.description}`
        : `已跳转至快照 #${targetIndex + 1}`
    );
  }, [undoStack, redoStack, applySnapshot]);

  // Global Keyboard Shortcuts (Ctrl+Z / Cmd+Z for Undo, Ctrl+Y / Cmd+Y / Ctrl+Shift+Z for Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Wrapped Handlers for continuous parameter updates with stack recording
  const handleBeautyChange = useCallback((newBeauty: BeautySettings) => {
    recordBeforeInteraction('美颜与光影调整');
    setBeauty(newBeauty);
  }, [recordBeforeInteraction]);

  const handleBgSettingsChange = useCallback((newBg: BackgroundSettings) => {
    recordBeforeInteraction('背景底色调整');
    setBgSettings(newBg);
  }, [recordBeforeInteraction]);

  const handleCompositionChange = useCallback((
    newComp: CompositionSettings | ((prev: CompositionSettings) => CompositionSettings)
  ) => {
    recordBeforeInteraction('构图位置与缩放');
    setComposition(newComp);
  }, [recordBeforeInteraction]);

  // 1. Image Loaded Handler
  const handleImageLoaded = (img: HTMLImageElement, filename: string) => {
    setIsProcessing(true);
    setProcessingMessage('正在智能检测人脸与图像质量...');
    setImageName(filename);
    setOriginalImage(img);
    setUndoStack([]);
    setRedoStack([]);

    // Run face detection on downscaled canvas
    setTimeout(() => {
      const tempCanvas = document.createElement('canvas');
      const maxDim = 800;
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      tempCanvas.width = w;
      tempCanvas.height = h;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const result = detectFace(imgData);
        setFaceResult(result);
      }
      setIsProcessing(false);
      showToast('照片载入完成，已就绪！', 'success');
    }, 150);
  };

  // 2. Load Built-in Procedural Sample Portrait
  const handleLoadSample = (gender: 'male' | 'female') => {
    setIsProcessing(true);
    setProcessingMessage('正在生成高清标准试用照...');
    setTimeout(() => {
      const sampleCanvas = createSamplePortraitCanvas(gender);
      const img = new Image();
      img.onload = () => {
        handleImageLoaded(img, `示例照_${gender === 'male' ? '男士' : '女士'}.jpg`);
      };
      img.src = sampleCanvas.toDataURL('image/jpeg', 0.95);
    }, 100);
  };

  // Initial load with male sample photo for instant out-of-the-box experience
  useEffect(() => {
    handleLoadSample('male');
  }, []);

  // Initialize AI Matting Model (ONNX MODNet) in background
  useEffect(() => {
    const unsub = subscribeAIModelStatus((status, backend) => {
      setAiModelStatus(status);
      setAiBackend(backend);
    });
    initAIModel().catch(err => {
      console.warn('AI Matting init failed, will use algorithmic fallback:', err);
    });
    return () => unsub();
  }, []);

  // 3. Main Image Rendering Pipeline
  const runRenderPipeline = useCallback(() => {
    return executeRenderPipeline(
      beauty,
      bgSettings,
      composition,
      selectedSpec,
      currentStep,
      printPreviewMode
    );
  }, [executeRenderPipeline, beauty, bgSettings, composition, selectedSpec, currentStep, printPreviewMode]);

  // Trigger render on parameter changes
  useEffect(() => {
    runRenderPipeline();
  }, [runRenderPipeline]);

  // Re-run render when AI Model finishes loading to instantly upgrade to AI matte
  useEffect(() => {
    if (aiModelStatus === 'ready' && originalImage && bgSettings.engine !== 'bayesian_dual') {
      runRenderPipeline();
    }
  }, [aiModelStatus, originalImage, bgSettings.engine, runRenderPipeline]);

  // Reset all settings and clear history stacks
  const handleResetAll = () => {
    setOriginalImage(null);
    setFaceResult(null);
    setCurrentStep('upload');
    setBeauty({ smoothing: 0, whitening: 0, slimming: 0, bigEyes: 0, brightness: 0, contrast: 0 });
    setBgSettings({
      type: 'solid',
      color: '#FFFFFF',
      tolerance: 35,
      feather: 1.5,
      deFringe: true,
      mattingMode: 'standard',
      edgeRefine: 'natural',
      engine: 'ai_modnet',
      guidedFilter: true,
      guidedRadius: 3,
      decontamination: true,
      brushStrokes: [],
      sampledBgPoints: [],
      showAlphaMaskOnly: false,
    });
    setComposition({ scale: 1.0, offsetX: 0, offsetY: 0, rotation: 0 });
    setSelectedSpec(PHOTO_SPECS[0]);
    setShowPrintCropGuide(true);
    setPrintPreviewMode('single');
    setUndoStack([]);
    setRedoStack([]);
    showToast('已重置所有设置与操作历史', 'info');
  };

  // 1-Click Fast Workflow
  const handleQuickGenerateAll = () => {
    setIsProcessing(true);
    setProcessingMessage('正在执行一键智能流程：美颜微调、智能抠图、标准尺寸生成...');
    recordDiscreteAction('一键智能生成全流程', () => {
      // Set recommended natural beauty preset
      setBeauty({
        smoothing: 45,
        whitening: 35,
        slimming: 15,
        bigEyes: 12,
        brightness: 0,
        contrast: 0,
      });
      // Ensure white background
      setBgSettings(prev => ({
        ...prev,
        type: 'solid',
        color: '#FFFFFF',
      }));
    });

    setTimeout(() => {
      // Jump to export step
      setCurrentStep('generate');
      setIsProcessing(false);
      showToast('一键全流程已完成！可直接下载或微调', 'success');
    }, 300);
  };

  // Switch Spec with Instant Canvas Linkage
  const handleSelectSpec = (newSpec: PhotoSpec) => {
    setSelectedSpec(newSpec);
    showToast(`已切换规格为：「${newSpec.name}」(${newSpec.description})，画布已联动更新！`, 'info');
  };

  // 1-Click Intelligent Spec and Canvas Auto-Matching
  const handleAutoMatchSpec = () => {
    if (!originalImage) {
      showToast('请先上传或载入人像照片', 'error');
      return;
    }

    const matchResult = autoMatchSpec(
      originalImage.width,
      originalImage.height,
      faceResult,
      PHOTO_SPECS
    );

    setSelectedSpec(matchResult.spec);

    if (matchResult.recommendedComposition) {
      recordDiscreteAction(`智能匹配规格构图（${matchResult.spec.name}）`, () => {
        setComposition(prev => ({
          ...prev,
          ...matchResult.recommendedComposition,
        }));
      });
    }

    showToast(
      `🎯 已自动匹配规格：「${matchResult.spec.name}」(${matchResult.spec.description})，画布比例与人脸构图已自动联动！`,
      'success'
    );
  };

  // Image rotation with operation stack recording
  const handleRotate = () => {
    recordDiscreteAction('顺时针旋转90°', () => {
      setComposition(prev => ({
        ...prev,
        rotation: (prev.rotation + 90) % 360,
      }));
    });
    showToast(`照片已顺时针旋转90°`, 'info');
  };

  // 1-Click Auto Horizontal Leveling for Head Tilt based on detectFace
  const handleAutoCorrectTilt = () => {
    if (!faceResult) {
      showToast('未检测到人脸特征，请先载入清晰正脸照', 'error');
      return;
    }

    const detectedAngle = faceResult.angle ?? 0;
    // To correct a head tilt of detectedAngle (clockwise = +deg), counter-rotate by -detectedAngle
    const targetRotation = Number((-detectedAngle).toFixed(1));

    recordDiscreteAction('人脸水平回正', () => {
      setComposition(prev => ({
        ...prev,
        rotation: targetRotation,
      }));
    });

    if (Math.abs(detectedAngle) < 0.2) {
      showToast('人脸水平轴线良好，已校准至标准水平 (0.0°)', 'info');
    } else {
      const dirText = detectedAngle > 0 ? '逆时针回正' : '顺时针回正';
      showToast(
        `已一键自动水平矫正人脸（${dirText} ${Math.abs(detectedAngle)}°，设为 ${targetRotation > 0 ? '+' : ''}${targetRotation}°）`,
        'success'
      );
    }
  };

  // Image horizontal flip
  const handleFlip = () => {
    if (!originalImage) return;
    const canvas = document.createElement('canvas');
    canvas.width = originalImage.width;
    canvas.height = originalImage.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(originalImage, 0, 0);
    const img = new Image();
    img.onload = () => {
      setOriginalImage(img);
      showToast('照片已水平翻转', 'info');
    };
    img.src = canvas.toDataURL('image/jpeg', 0.95);
  };

  // Zoom helpers with stack tracking
  const handleZoom = (delta: number) => {
    recordDiscreteAction(delta > 0 ? '放大人像' : '缩小人像', () => {
      setComposition(prev => ({
        ...prev,
        scale: Math.max(0.5, Math.min(2.5, Number((prev.scale + delta).toFixed(2)))),
      }));
    });
  };

  const handleScaleChange = (newScale: number) => {
    recordBeforeInteraction('构图缩放微调');
    setComposition(prev => ({
      ...prev,
      scale: Math.max(0.5, Math.min(2.5, Number(newScale.toFixed(2)))),
    }));
  };

  const handleResetZoom = () => {
    recordDiscreteAction('还原构图居中 100%', () => {
      setComposition(prev => ({
        ...prev,
        scale: 1.0,
        offsetX: 0,
        offsetY: 0,
      }));
    });
  };

  // Download Single Photo
  const handleDownloadSingle = (format: 'image/jpeg' | 'image/png') => {
    const targetCanvas = singlePhotoCanvasRef.current || previewCanvasRef.current;
    if (!targetCanvas) return;
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const colorLabel =
      bgSettings.type === 'solid'
        ? bgSettings.color.toUpperCase() === '#FFFFFF'
          ? '白底'
          : bgSettings.color.toUpperCase() === '#D9001B' || bgSettings.color.toUpperCase() === '#FF0000'
          ? '红底'
          : '蓝底'
        : '渐变底';

    const ext = format === 'image/png' ? 'png' : 'jpg';
    const filename = `证件照_${selectedSpec.name}_${colorLabel}_${today}.${ext}`;
    downloadCanvasImage(targetCanvas, filename, format, 0.95);
    showToast(`已成功下载 ${selectedSpec.name} 高清证件照！`, 'success');
  };

  // Download 6-Inch Print Sheet
  const handleDownloadPrintSheet = () => {
    const targetCanvas = singlePhotoCanvasRef.current || previewCanvasRef.current;
    if (!targetCanvas) return;
    setIsProcessing(true);
    setProcessingMessage('正在排版 6 寸相纸打印图 (带裁剪辅助虚线)...');
    setTimeout(() => {
      const sheetCanvas = generatePrintSheet(targetCanvas, selectedSpec);
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const filename = `6寸打印排版_${selectedSpec.name}_${today}.jpg`;
      downloadCanvasImage(sheetCanvas, filename, 'image/jpeg', 0.95);
      setIsProcessing(false);
      showToast('已生成 6 寸相纸排版图，可直接送冲印！', 'success');
    }, 200);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FA]">
      {/* 1. Header Navigation with Undo / Redo */}
      <Header
        onLoadSample={handleLoadSample}
        onReset={handleResetAll}
        hasImage={!!originalImage}
        onOpenQRCodeModal={() => setIsQRCodeModalOpen(true)}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {/* 2. Main Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Left Side: Real-time Interactive Canvas Preview (Col 7) */}
        <section className="lg:col-span-7 bg-[#FFFFFF] rounded-[20px] shadow-[0_4px_12px_rgba(42,36,96,0.06)] border border-[#EEEEEE] overflow-hidden flex flex-col min-h-[420px] sm:min-h-[580px]">
          <PreviewStage
            canvasRef={previewCanvasRef}
            originalImage={originalImage}
            spec={selectedSpec}
            specs={PHOTO_SPECS}
            onSelectSpec={handleSelectSpec}
            onAutoMatchSpec={handleAutoMatchSpec}
            isProcessing={isProcessing}
            processingMessage={processingMessage}
            step={currentStep}
            showGuides={showGuides}
            onToggleGuides={() => setShowGuides(!showGuides)}
            faceResult={faceResult}
            showFaceBox={showFaceBox}
            onToggleFaceBox={() => setShowFaceBox(!showFaceBox)}
            showPrintCropGuide={showPrintCropGuide}
            onTogglePrintCropGuide={() => {
              setShowPrintCropGuide(prev => !prev);
              showToast(!showPrintCropGuide ? '已在预览窗口显示打印排版裁剪虚线参考框' : '已在预览窗口隐藏裁剪虚线参考框', 'info');
            }}
            printPreviewMode={printPreviewMode}
            onChangePrintPreviewMode={setPrintPreviewMode}
            onRotateImage={handleRotate}
            onZoom={handleZoom}
            onResetZoom={handleResetZoom}
            composition={composition}
            onChangeComposition={handleCompositionChange}
            onScaleChange={handleScaleChange}
            canUndo={undoStack.length > 0}
            canRedo={redoStack.length > 0}
            onUndo={handleUndo}
            onRedo={handleRedo}
            undoStack={undoStack}
            redoStack={redoStack}
            currentSnapshot={{
              beauty,
              bgSettings,
              composition,
              spec: selectedSpec,
              step: currentStep,
              description: '当前最新编辑状态',
              timestamp: Date.now(),
            }}
            onJumpToSnapshot={handleJumpToSnapshot}
            onResetToInitial={() => handleJumpToSnapshot(0)}
            bgSettings={bgSettings}
            onChangeBg={handleBgSettingsChange}
            activeBrushTool={activeBrushTool}
            brushSize={brushSize}
          />
        </section>

        {/* Right Side: Step Operations Control Panel (Col 5) */}
        <section className="lg:col-span-5 bg-[#FFFFFF] rounded-[20px] shadow-[0_4px_12px_rgba(42,36,96,0.06)] border border-[#EEEEEE] p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex-1">
            {/* Step 1: Upload */}
            {currentStep === 'upload' && (
              <StepUpload
                onImageLoaded={handleImageLoaded}
                faceResult={faceResult}
                onNext={() => setCurrentStep('beauty')}
                onLoadSample={handleLoadSample}
                onRotateImage={handleRotate}
                onFlipImage={handleFlip}
                hasImage={!!originalImage}
                composition={composition}
                onAutoCorrectTilt={handleAutoCorrectTilt}
                onChangeComposition={handleCompositionChange}
                selectedSpec={selectedSpec}
                onAutoMatchSpec={handleAutoMatchSpec}
              />
            )}

            {/* Step 2: Beauty */}
            {currentStep === 'beauty' && (
              <StepBeauty
                beauty={beauty}
                onChangeBeauty={handleBeautyChange}
                onApplyPreset={() => {
                  recordDiscreteAction('应用自然美颜预设', () => {
                    setBeauty(prev => ({
                      ...prev,
                      smoothing: 45,
                      whitening: 35,
                      slimming: 15,
                      bigEyes: 12,
                    }));
                  });
                  showToast('已应用自然智能美颜参数', 'success');
                }}
                onResetBeauty={() => {
                  recordDiscreteAction('重置美颜与光影', () => {
                    setBeauty({ smoothing: 0, whitening: 0, slimming: 0, bigEyes: 0, brightness: 0, contrast: 0 });
                  });
                  showToast('美颜与明暗光影参数已重置为 0', 'info');
                }}
                onNext={() => setCurrentStep('background')}
                onPrev={() => setCurrentStep('upload')}
              />
            )}

            {/* Step 3: Background */}
            {currentStep === 'background' && (
              <StepBackground
                bgSettings={bgSettings}
                onChangeBg={handleBgSettingsChange}
                activeBrushTool={activeBrushTool}
                onChangeBrushTool={setActiveBrushTool}
                brushSize={brushSize}
                onChangeBrushSize={setBrushSize}
                onNext={() => {
                  setActiveBrushTool('none');
                  setCurrentStep('generate');
                }}
                onPrev={() => {
                  setActiveBrushTool('none');
                  setCurrentStep('beauty');
                }}
              />
            )}

            {/* Step 4: Generate & Download */}
            {currentStep === 'generate' && (
              <StepGenerate
                selectedSpec={selectedSpec}
                onSelectSpec={handleSelectSpec}
                onAutoMatchSpec={handleAutoMatchSpec}
                composition={composition}
                onChangeComposition={handleCompositionChange}
                onDownloadSingle={handleDownloadSingle}
                onDownloadPrintSheet={handleDownloadPrintSheet}
                onPrev={() => setCurrentStep('background')}
                showPrintCropGuide={showPrintCropGuide}
                onTogglePrintCropGuide={() => {
                  setShowPrintCropGuide(prev => !prev);
                  showToast(!showPrintCropGuide ? '已在预览窗口显示打印排版裁剪虚线参考框' : '已在预览窗口隐藏裁剪虚线参考框', 'info');
                }}
                printPreviewMode={printPreviewMode}
                onChangePrintPreviewMode={setPrintPreviewMode}
              />
            )}
          </div>

          {/* Privacy Security Assurance Banner at bottom of panel */}
          <div className="mt-5 pt-3 border-t border-[#EEEEEE] flex items-center justify-between text-[11px] text-[#888888]">
            <div className="flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#5AC8C3]" />
              <span>全流程纯前端处理 · 绝不向后端发送您的照片</span>
            </div>
            <span className="font-mono">Ver 2.5</span>
          </div>
        </section>
      </main>

      {/* 3. Bottom Step Flow Navigation Bar */}
      <StepIndicator
        currentStep={currentStep}
        onSelectStep={setCurrentStep}
        onQuickGenerateAll={handleQuickGenerateAll}
        isReady={!!originalImage}
      />

      {/* Global Floating Toast */}
      {toast && (
        <div
          className={`fixed bottom-20 right-5 z-50 flex items-center space-x-2 py-2.5 px-4 rounded-[12px] shadow-[0_8px_24px_rgba(42,36,96,0.16)] text-[13px] font-semibold text-white animate-bounce ${
            toast.type === 'success'
              ? 'bg-[#2A2460]'
              : toast.type === 'error'
              ? 'bg-[#E86C5D]'
              : 'bg-[#5B8BD6]'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-[#5AC8C3]" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-white" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Mobile QR Code Modal for Phone Testing */}
      <MobileQRCodeModal
        isOpen={isQRCodeModalOpen}
        onClose={() => setIsQRCodeModalOpen(false)}
      />
    </div>
  );
}
