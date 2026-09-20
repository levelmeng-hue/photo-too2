/**
 * Deep Learning Portrait Matting Engine (MODNet + WebGPU/WASM)
 * Integrates ONNX Runtime Web for sub-pixel hair strand precision
 */
import * as ort from 'onnxruntime-web';
import { BackgroundSettings } from '../types';
import { applyGuidedFilter, extractGuidanceLuminance } from './guidedFilter';

export type AIModelStatus = 'uninitialized' | 'loading' | 'ready' | 'inferencing' | 'fallback';

let sessionPromise: Promise<ort.InferenceSession | null> | null = null;
let currentStatus: AIModelStatus = 'uninitialized';
let activeBackend: 'webgpu' | 'wasm' | 'none' = 'none';
const statusListeners = new Set<(status: AIModelStatus, backend: 'webgpu' | 'wasm' | 'none') => void>();

export function subscribeAIModelStatus(listener: (status: AIModelStatus, backend: 'webgpu' | 'wasm' | 'none') => void) {
  statusListeners.add(listener);
  listener(currentStatus, activeBackend);
  return () => {
    statusListeners.delete(listener);
  };
}

function updateStatus(status: AIModelStatus, backend: 'webgpu' | 'wasm' | 'none' = activeBackend) {
  currentStatus = status;
  activeBackend = backend;
  statusListeners.forEach(fn => fn(status, backend));
}

export function getAIModelStatus(): { status: AIModelStatus; backend: 'webgpu' | 'wasm' | 'none' } {
  return { status: currentStatus, backend: activeBackend };
}

/**
 * Initialize ONNX Runtime session for MODNet
 */
export async function initAIModel(): Promise<ort.InferenceSession | null> {
  if (sessionPromise) {
    return sessionPromise;
  }

  sessionPromise = (async () => {
    try {
      updateStatus('loading', 'none');

      // Configure WASM paths with CDN to avoid Vite dev server intercepting /public/ *.mjs dynamic imports
      if (typeof window !== 'undefined') {
        ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/';
        if (navigator.hardwareConcurrency) {
          ort.env.wasm.numThreads = Math.min(4, Math.max(1, Math.floor(navigator.hardwareConcurrency / 2)));
        }
        ort.env.wasm.simd = true;
      }

      // Check WebGPU availability
      const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;
      const providers: ort.InferenceSession.ExecutionProviderConfig[] = hasWebGPU
        ? ['webgpu', 'wasm']
        : ['wasm'];

      // Model location
      const modelUrl = '/models/modnet_quantized.onnx';

      const session = await ort.InferenceSession.create(modelUrl, {
        executionProviders: providers,
        graphOptimizationLevel: 'all',
      });

      const actualBackend = hasWebGPU ? 'webgpu' : 'wasm';
      updateStatus('ready', actualBackend);
      return session;
    } catch (err) {
      console.warn('Failed to load WebGPU/local ONNX model, attempting WASM fallback:', err);
      try {
        // Fallback to pure wasm with jsdelivr cdn paths if local wasm had issue
        ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.0/dist/';
        const session = await ort.InferenceSession.create('/models/modnet_quantized.onnx', {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'basic',
        });
        updateStatus('ready', 'wasm');
        return session;
      } catch (fallbackErr) {
        console.error('All AI matting session attempts failed. Falling back to Bayesian engine:', fallbackErr);
        updateStatus('fallback', 'none');
        return null;
      }
    }
  })();

  return sessionPromise;
}

/**
 * Preprocess an ImageData to 1x3x512x512 Float32Array tensor
 * Normalization: (pixel / 127.5) - 1.0 (range [-1, 1])
 */
function preprocessToMODNet(imageData: ImageData, targetSize = 512): ort.Tensor {
  const { width, height, data } = imageData;
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = targetSize;
  tempCanvas.height = targetSize;
  const ctx = tempCanvas.getContext('2d')!;

  // Draw scaled onto 512x512
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = width;
  srcCanvas.height = height;
  srcCanvas.getContext('2d')!.putImageData(imageData, 0, 0);

  ctx.drawImage(srcCanvas, 0, 0, targetSize, targetSize);
  const resizedData = ctx.getImageData(0, 0, targetSize, targetSize).data;

  const floatData = new Float32Array(1 * 3 * targetSize * targetSize);
  const planeSize = targetSize * targetSize;

  for (let i = 0; i < planeSize; i++) {
    const idx = i * 4;
    const r = resizedData[idx];
    const g = resizedData[idx + 1];
    const b = resizedData[idx + 2];

    floatData[i] = r / 127.5 - 1.0;                  // R channel
    floatData[planeSize + i] = g / 127.5 - 1.0;      // G channel
    floatData[2 * planeSize + i] = b / 127.5 - 1.0;  // B channel
  }

  return new ort.Tensor('float32', floatData, [1, 3, targetSize, targetSize]);
}

/**
 * Bilinear upsample a 512x512 float alpha matte to native (targetW, targetH)
 */
function upsampleAlphaBilinear(
  smallAlpha: Float32Array,
  smallW: number,
  smallH: number,
  targetW: number,
  targetH: number
): Float32Array {
  const result = new Float32Array(targetW * targetH);
  const scaleX = (smallW - 1) / Math.max(1, targetW - 1);
  const scaleY = (smallH - 1) / Math.max(1, targetH - 1);

  for (let y = 0; y < targetH; y++) {
    const srcY = y * scaleY;
    const y0 = Math.floor(srcY);
    const y1 = Math.min(smallH - 1, y0 + 1);
    const dy = srcY - y0;
    const invDy = 1 - dy;

    const row0 = y0 * smallW;
    const row1 = y1 * smallW;
    const targetRow = y * targetW;

    for (let x = 0; x < targetW; x++) {
      const srcX = x * scaleX;
      const x0 = Math.floor(srcX);
      const x1 = Math.min(smallW - 1, x0 + 1);
      const dx = srcX - x0;
      const invDx = 1 - dx;

      const p00 = smallAlpha[row0 + x0];
      const p10 = smallAlpha[row0 + x1];
      const p01 = smallAlpha[row1 + x0];
      const p11 = smallAlpha[row1 + x1];

      const val = (p00 * invDx + p10 * dx) * invDy + (p01 * invDx + p11 * dx) * dy;
      result[targetRow + x] = Math.max(0, Math.min(1, val));
    }
  }

  return result;
}

// In-memory cache of raw neural output for current image
let cachedRawMatte: {
  imgDataRef: ImageData;
  rawAlpha: Float32Array;
  width: number;
  height: number;
} | null = null;

/**
 * Run MODNet Deep Learning Matting
 * Returns high-precision Float32Array alpha matte [0, 1] aligned with native image resolution
 */
export async function runAIMatting(
  imageData: ImageData,
  settings: BackgroundSettings
): Promise<Float32Array | null> {
  const session = await initAIModel();
  if (!session) {
    return null;
  }

  const { width, height } = imageData;
  let rawUpsampledAlpha: Float32Array;

  // Use cached raw neural output if image content hasn't changed
  if (
    cachedRawMatte &&
    cachedRawMatte.imgDataRef === imageData &&
    cachedRawMatte.width === width &&
    cachedRawMatte.height === height
  ) {
    rawUpsampledAlpha = new Float32Array(cachedRawMatte.rawAlpha);
  } else {
    try {
      updateStatus('inferencing');
      const inputTensor = preprocessToMODNet(imageData, 512);

      const feeds: Record<string, ort.Tensor> = {};
      feeds[session.inputNames[0]] = inputTensor;

      const results = await session.run(feeds);
      const outputTensor = results[session.outputNames[0]];
      const raw512Alpha = outputTensor.data as Float32Array;

      // Upsample back to target resolution
      rawUpsampledAlpha = upsampleAlphaBilinear(raw512Alpha, 512, 512, width, height);

      // Cache for fast re-renders (when only feather/tolerance/brush changes)
      cachedRawMatte = {
        imgDataRef: imageData,
        rawAlpha: new Float32Array(rawUpsampledAlpha),
        width,
        height,
      };

      updateStatus('ready');
    } catch (err) {
      console.error('MODNet inference execution error:', err);
      updateStatus('fallback');
      return null;
    }
  }

  let finalAlpha: Float32Array<ArrayBufferLike> = new Float32Array(rawUpsampledAlpha);

  // 1. High-frequency Guided Filter refinement (导向滤波微观发丝级对齐)
  const useGuided = settings.guidedFilter !== false;
  if (useGuided) {
    const guideLum = extractGuidanceLuminance(imageData);
    const radius = settings.guidedRadius || 3;
    finalAlpha = applyGuidedFilter(guideLum, finalAlpha, width, height, radius, 1e-4);
  }

  // 2. Tolerance & Softness adjustments
  if (settings.tolerance !== undefined && settings.tolerance !== 35) {
    const delta = (settings.tolerance - 35) / 100;
    for (let i = 0; i < finalAlpha.length; i++) {
      let a = finalAlpha[i];
      if (a > 0.05 && a < 0.95) {
        if (delta > 0) {
          // more aggressive background removal
          a = Math.max(0, a - delta * (1 - a));
        } else {
          // retain more edges
          a = Math.min(1, a - delta * a);
        }
        finalAlpha[i] = a;
      }
    }
  }

  // 3. User Manual Brush Strokes (Eraser & Restorer)
  if (settings.brushStrokes && settings.brushStrokes.length > 0) {
    const scale = Math.sqrt(width * height) / 1000;
    for (const stroke of settings.brushStrokes) {
      const radius = Math.max(2, Math.round((stroke.size * scale) / 2));
      const radiusSq = radius * radius;
      const targetVal = stroke.type === 'erase' ? 0.0 : 1.0;

      for (const pt of stroke.points) {
        const cx = Math.round(pt.x * width);
        const cy = Math.round(pt.y * height);

        const minY = Math.max(0, cy - radius);
        const maxY = Math.min(height - 1, cy + radius);
        const minX = Math.max(0, cx - radius);
        const maxX = Math.min(width - 1, cx + radius);

        for (let y = minY; y <= maxY; y++) {
          const dy = y - cy;
          const rowOffset = y * width;
          for (let x = minX; x <= maxX; x++) {
            const dx = x - cx;
            const distSq = dx * dx + dy * dy;
            if (distSq <= radiusSq) {
              const falloff = 1 - Math.sqrt(distSq) / radius;
              const idx = rowOffset + x;
              finalAlpha[idx] = finalAlpha[idx] * (1 - falloff) + targetVal * falloff;
            }
          }
        }
      }
    }
  }

  return finalAlpha;
}
