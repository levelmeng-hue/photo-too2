/**
 * Types and interfaces for the Online ID Photo Generator
 */

export type WorkflowStep = 'upload' | 'beauty' | 'background' | 'generate';

export interface PhotoSpec {
  id: string;
  name: string;
  category: 'common' | 'document' | 'visa' | 'custom';
  widthPx: number; // At standard 300 DPI
  heightPx: number; // At standard 300 DPI
  widthMm: number;
  heightMm: number;
  dpi: number;
  description: string;
  usage: string;
  printPerSheet6Inch?: number;
  isCommon?: boolean;
  shortLabel?: string;
}

export interface BeautySettings {
  smoothing: number; // 磨皮 0-100
  whitening: number; // 美白 0-100
  slimming: number;  // 瘦脸 0-100
  bigEyes: number;   // 大眼 0-100
  brightness?: number; // 亮度调节 -50 到 +50 (0 为原片默认)
  contrast?: number;   // 对比度调节 -50 到 +50 (0 为原片默认)
}

export type BgType = 'solid' | 'gradient';
export type MattingMode = 'standard' | 'complex' | 'studio';
export type EdgeRefineMode = 'smooth' | 'natural' | 'sharp';
export type MattingEngineType = 'ai_modnet' | 'bayesian_dual';

export interface BrushStroke {
  id: string;
  type: 'erase' | 'restore'; // erase background or restore subject
  points: { x: number; y: number }[]; // normalized 0..1 coordinates
  size: number; // brush diameter in px relative to 1000px canonical scale
}

export interface BackgroundSettings {
  type: BgType;
  color: string;
  gradientStart?: string;
  gradientEnd?: string;
  tolerance: number; // 抠图色彩容差 0-100
  feather: number;   // 边缘羽化 0-10
  deFringe: boolean; // 去边缘光晕杂色
  mattingMode?: MattingMode; // 抠图场景算法模式
  edgeRefine?: EdgeRefineMode; // 边缘轮廓模式
  engine?: MattingEngineType; // 抠图计算引擎 (MODNet 神经网络 / 贝叶斯双模算法)
  guidedFilter?: boolean; // 原图高频边缘导向滤波 (Guided Filter)
  guidedRadius?: number; // 导向滤波窗口半径 1-10
  decontamination?: boolean; // 发丝边缘防溢色校正 (Color Decontamination)
  brushStrokes?: BrushStroke[]; // 手动涂抹擦除/恢复笔迹
  sampledBgPoints?: { x: number; y: number }[]; // 用户手动吸取的背景点 (0..1)
  showAlphaMaskOnly?: boolean; // 黑白纯蒙版对比预览
}

export interface FaceDetectionResult {
  detected: boolean;
  score: number;
  box: {
    x: number; // 0-1 normalized
    y: number;
    width: number;
    height: number;
  };
  eyes?: {
    left: { x: number; y: number };
    right: { x: number; y: number };
  };
  angle?: number; // Face horizontal tilt angle in degrees (e.g. +2.5° or -1.8°)
  message: string;
}

export interface CompositionSettings {
  scale: number; // 0.5 to 2.5
  offsetX: number; // px offset
  offsetY: number; // px offset
  rotation: number; // 0, 90, 180, 270 degrees
}

export interface HistorySnapshot {
  id?: string;
  beauty: BeautySettings;
  bgSettings: BackgroundSettings;
  composition: CompositionSettings;
  spec?: PhotoSpec;
  step?: WorkflowStep;
  description?: string;
  timestamp: number;
}

