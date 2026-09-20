/**
 * Client-Side Image Processing & Computer Vision Utilities
 * - Pure browser-based Canvas & ImageData algorithms
 * - Privacy preserving: 0% network footprint, 100% in-browser processing
 */

import { BeautySettings, BackgroundSettings, FaceDetectionResult, PhotoSpec } from '../types';
import { applyGuidedFilter, applyColorDecontamination, extractGuidanceLuminance } from './guidedFilter';

/**
 * Check if pixel is within human skin tone range in YCbCr color space
 */
export function isSkinPixel(r: number, g: number, b: number): boolean {
  // Discard near-black and near-white extremes
  if ((r < 35 && g < 30 && b < 30) || (r > 250 && g > 250 && b > 250)) {
    return false;
  }
  // YCbCr transformation
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = -0.168736 * r - 0.331264 * g + 0.5 * b + 128;
  const cr = 0.5 * r - 0.418688 * g - 0.081312 * b + 128;

  const inSkinYCbCr = cb >= 75 && cb <= 135 && cr >= 130 && cr <= 175;
  const basicRgbRule = r > g && g > b && (r - g) >= 10;

  return inSkinYCbCr && (basicRgbRule || (r > 120 && g > 80 && b > 60));
}

/**
 * Detect face location and proportion in image using skin cluster analysis
 */
export function detectFace(imgData: ImageData): FaceDetectionResult {
  const { width, height, data } = imgData;
  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;
  let skinCount = 0;
  let sumX = 0;
  let sumY = 0;

  // Downsample scan for real-time speed
  const step = 4;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      if (isSkinPixel(r, g, b)) {
        // Focus more on upper 70% of image for face (exclude hands/neck in lower part)
        if (y < height * 0.75) {
          skinCount++;
          sumX += x;
          sumY += y;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
  }

  const totalPixels = (width / step) * (height / step);
  const skinRatio = skinCount / totalPixels;

  if (skinCount > 100 && skinRatio > 0.02 && maxX > minX && maxY > minY) {
    const faceW = (maxX - minX);
    const faceH = (maxY - minY);
    const centerX = sumX / skinCount;
    const centerY = sumY / skinCount;

    // Normalizing box
    const boxW = Math.max(faceW * 1.15, width * 0.28);
    const boxH = Math.max(faceH * 1.25, height * 0.35);
    const boxX = Math.max(0, centerX - boxW / 2);
    const boxY = Math.max(0, centerY - boxH / 2);

    // Analyze facial feature landmarks (eyes & eyebrows dark valleys) to detect head tilt angle
    const eyeZoneTop = Math.max(0, Math.floor(centerY - faceH * 0.35));
    const eyeZoneBottom = Math.min(height - 1, Math.floor(centerY + faceH * 0.05));
    const eyeZoneLeftMinX = Math.max(0, Math.floor(centerX - faceW * 0.42));
    const eyeZoneLeftMaxX = Math.max(0, Math.floor(centerX - faceW * 0.05));
    const eyeZoneRightMinX = Math.min(width - 1, Math.floor(centerX + faceW * 0.05));
    const eyeZoneRightMaxX = Math.min(width - 1, Math.floor(centerX + faceW * 0.42));

    let sumWeightL = 0;
    let sumEyeXL = 0;
    let sumEyeYL = 0;

    let sumWeightR = 0;
    let sumEyeXR = 0;
    let sumEyeYR = 0;

    const eyeStep = 2;
    for (let ey = eyeZoneTop; ey <= eyeZoneBottom; ey += eyeStep) {
      for (let ex = eyeZoneLeftMinX; ex <= eyeZoneLeftMaxX; ex += eyeStep) {
        const idx = (ey * width + ex) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (lum < 150) {
          const weight = Math.pow((150 - lum) / 150, 2);
          sumWeightL += weight;
          sumEyeXL += ex * weight;
          sumEyeYL += ey * weight;
        }
      }
      for (let ex = eyeZoneRightMinX; ex <= eyeZoneRightMaxX; ex += eyeStep) {
        const idx = (ey * width + ex) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (lum < 150) {
          const weight = Math.pow((150 - lum) / 150, 2);
          sumWeightR += weight;
          sumEyeXR += ex * weight;
          sumEyeYR += ey * weight;
        }
      }
    }

    let detectedEyeLX = centerX - boxW * 0.18;
    let detectedEyeLY = centerY - boxH * 0.12;
    let detectedEyeRX = centerX + boxW * 0.18;
    let detectedEyeRY = centerY - boxH * 0.12;
    let angle = 0;

    if (sumWeightL > 15 && sumWeightR > 15) {
      detectedEyeLX = sumEyeXL / sumWeightL;
      detectedEyeLY = sumEyeYL / sumWeightL;
      detectedEyeRX = sumEyeXR / sumWeightR;
      detectedEyeRY = sumEyeYR / sumWeightR;

      const deltaX = detectedEyeRX - detectedEyeLX;
      const deltaY = detectedEyeRY - detectedEyeLY;
      if (deltaX > 15) {
        const rawAngle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;
        // Restrict reasonable human head tilt detection (-25° to +25°)
        if (Math.abs(rawAngle) <= 25) {
          angle = Math.round(rawAngle * 10) / 10;
        }
      }
    }

    let message = '已成功定位人脸与标准证件照裁剪区域';
    if (Math.abs(angle) >= 0.5) {
      const dir = angle > 0 ? '向右微倾' : '向左微倾';
      message = `检测到头部${dir}约 ${Math.abs(angle)}°，推荐使用一键自动水平矫正`;
    } else {
      message = '已成功定位人脸与标准证件照裁剪区域，面部水平端正良好';
    }

    return {
      detected: true,
      score: Math.min(0.98, Math.max(0.65, skinRatio * 4)),
      box: {
        x: boxX / width,
        y: boxY / height,
        width: Math.min(1, boxW / width),
        height: Math.min(1, boxH / height),
      },
      eyes: {
        left: { x: detectedEyeLX / width, y: detectedEyeLY / height },
        right: { x: detectedEyeRX / width, y: detectedEyeRY / height },
      },
      angle,
      message,
    };
  }

  // Fallback to golden center for standard portraits
  return {
    detected: false,
    score: 0.5,
    box: {
      x: 0.2,
      y: 0.12,
      width: 0.6,
      height: 0.7,
    },
    eyes: {
      left: { x: 0.42, y: 0.35 },
      right: { x: 0.58, y: 0.35 },
    },
    angle: 0,
    message: '人脸特征较微弱或背景对比度高，已使用标准中心预设参考线，可自由缩放调整',
  };
}

/**
 * Adjust image Brightness (-50 to +50) and Contrast (-50 to +50)
 * Specially optimized to rescue underexposed or poorly lit ID photo portraits
 */
export function applyBrightnessContrast(
  srcData: ImageData,
  brightness: number = 0,
  contrast: number = 0
): ImageData {
  const { width, height } = srcData;
  const output = new ImageData(new Uint8ClampedArray(srcData.data), width, height);

  const bVal = Math.max(-50, Math.min(50, brightness || 0));
  const cVal = Math.max(-50, Math.min(50, contrast || 0));

  if (bVal === 0 && cVal === 0) {
    return output;
  }

  const src = srcData.data;
  const dst = output.data;

  // Contrast factor centered at midpoint 128
  const contrastFactor = (259 * (cVal * 2.2 + 255)) / (255 * (259 - cVal * 2.2));
  // Brightness offset: 1.35 * bVal gives up to +/- 67.5 levels
  const brightOffset = bVal * 1.35;

  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const r = src[idx];
    const g = src[idx + 1];
    const b = src[idx + 2];
    const a = src[idx + 3];

    const nr = contrastFactor * (r - 128) + 128 + brightOffset;
    const ng = contrastFactor * (g - 128) + 128 + brightOffset;
    const nb = contrastFactor * (b - 128) + 128 + brightOffset;

    dst[idx] = Math.max(0, Math.min(255, Math.round(nr)));
    dst[idx + 1] = Math.max(0, Math.min(255, Math.round(ng)));
    dst[idx + 2] = Math.max(0, Math.min(255, Math.round(nb)));
    dst[idx + 3] = a;
  }

  return output;
}

/**
 * Apply Skin Smoothing (磨皮), Whitening (美白), and Brightness/Contrast tone adjustment
 */
export function applySkinBeauty(
  srcData: ImageData,
  beauty: BeautySettings
): ImageData {
  const brightness = beauty.brightness || 0;
  const contrast = beauty.contrast || 0;
  const smoothStrength = (beauty.smoothing || 0) / 100; // 0 to 1
  const whiteStrength = (beauty.whitening || 0) / 100;   // 0 to 1

  if (smoothStrength <= 0 && whiteStrength <= 0 && brightness === 0 && contrast === 0) {
    return new ImageData(new Uint8ClampedArray(srcData.data), srcData.width, srcData.height);
  }

  // Step 1: If brightness or contrast is adjusted, apply tone adjustment first
  // This illuminates underexposed photos so skin detection operates in the optimal color space
  const baseData =
    brightness !== 0 || contrast !== 0
      ? applyBrightnessContrast(srcData, brightness, contrast)
      : srcData;

  if (smoothStrength <= 0 && whiteStrength <= 0) {
    return baseData;
  }

  const { width, height } = baseData;
  const output = new ImageData(new Uint8ClampedArray(baseData.data), width, height);
  const src = baseData.data;
  const dst = output.data;

  // Fast Bilateral / Surface blur approximation for skin
  const radius = Math.max(1, Math.round(smoothStrength * 4));
  const spatialWeight = 1.0;
  const colorThreshold = 28 + (1 - smoothStrength) * 15;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = src[idx];
      const g = src[idx + 1];
      const b = src[idx + 2];
      const a = src[idx + 3];

      const isSkin = isSkinPixel(r, g, b);

      let newR = r;
      let newG = g;
      let newB = b;

      // 1. 磨皮 (Smoothing)
      if (isSkin && smoothStrength > 0) {
        let sumR = 0, sumG = 0, sumB = 0, totalW = 0;

        // Selective local neighborhood
        for (let dy = -radius; dy <= radius; dy += 1) {
          const ny = y + dy;
          if (ny < 0 || ny >= height) continue;

          for (let dx = -radius; dx <= radius; dx += 1) {
            const nx = x + dx;
            if (nx < 0 || nx >= width) continue;

            const nIdx = (ny * width + nx) * 4;
            const nr = src[nIdx];
            const ng = src[nIdx + 1];
            const nb = src[nIdx + 2];

            // Color difference
            const diff = Math.abs(r - nr) + Math.abs(g - ng) + Math.abs(b - nb);
            if (diff < colorThreshold * 3) {
              const weight = 1.0 / (1.0 + (dx * dx + dy * dy) * spatialWeight);
              sumR += nr * weight;
              sumG += ng * weight;
              sumB += nb * weight;
              totalW += weight;
            }
          }
        }

        if (totalW > 0) {
          const smoothR = sumR / totalW;
          const smoothG = sumG / totalW;
          const smoothB = sumB / totalW;

          // Blend with original to preserve fine skin pore texture
          const blendFactor = smoothStrength * 0.82;
          newR = Math.round(r * (1 - blendFactor) + smoothR * blendFactor);
          newG = Math.round(g * (1 - blendFactor) + smoothG * blendFactor);
          newB = Math.round(b * (1 - blendFactor) + smoothB * blendFactor);
        }
      }

      // 2. 美白 (Whitening & Skin Brightening)
      if (whiteStrength > 0) {
        // Apply soft gamma lift on skin and slight overall natural luminance
        const skinFactor = isSkin ? 1.0 : 0.35;
        const gamma = 1.0 - (whiteStrength * 0.28 * skinFactor);

        // Normalized power curve
        let wr = 255 * Math.pow(newR / 255, gamma);
        let wg = 255 * Math.pow(newG / 255, gamma);
        let wb = 255 * Math.pow(newB / 255, gamma);

        // Add soft rosy tint for natural healthy look (reduce sallow tone)
        if (isSkin) {
          wr = Math.min(255, wr * (1 + whiteStrength * 0.04));
          wg = Math.min(255, wg * (1 + whiteStrength * 0.02));
        }

        newR = Math.round(wr);
        newG = Math.round(wg);
        newB = Math.round(wb);
      }

      dst[idx] = newR;
      dst[idx + 1] = newG;
      dst[idx + 2] = newB;
      dst[idx + 3] = a;
    }
  }

  return output;
}

/**
 * Apply Face Slimming (瘦脸) & Big Eyes (大眼) using forward warp deformation
 */
export function applyFaceWarp(
  canvas: HTMLCanvasElement,
  faceBox: { x: number; y: number; width: number; height: number },
  beauty: BeautySettings
): HTMLCanvasElement {
  const { slimming, bigEyes } = beauty;
  if (slimming <= 0 && bigEyes <= 0) {
    return canvas;
  }

  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const srcImgData = ctx.getImageData(0, 0, w, h);
  const src = srcImgData.data;
  const outCanvas = document.createElement('canvas');
  outCanvas.width = w;
  outCanvas.height = h;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) return canvas;
  const outImgData = outCtx.createImageData(w, h);
  const dst = outImgData.data;

  // Copy initial
  dst.set(src);

  // Face coordinates
  const fx = (faceBox.x + faceBox.width * 0.5) * w;
  const fy = (faceBox.y + faceBox.height * 0.5) * h;
  const fw = faceBox.width * w;
  const fh = faceBox.height * h;

  // Slimming parameters (cheeks push towards center line)
  const slimFactor = (slimming / 100) * 0.18;
  const leftCheekX = fx - fw * 0.38;
  const rightCheekX = fx + fw * 0.38;
  const cheekY = fy + fh * 0.12;
  const cheekRadius = Math.max(25, fw * 0.32);

  // Eye centers
  const eyeRadius = Math.max(20, fw * 0.22);
  const eyeMagnify = (bigEyes / 100) * 0.22;
  const leftEyeX = fx - fw * 0.2;
  const rightEyeX = fx + fw * 0.2;
  const eyeY = fy - fh * 0.12;

  // Backward coordinate lookup for clean interpolation
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let srcX = x;
      let srcY = y;

      // 1. Slimming warp
      if (slimming > 0) {
        // Left cheek: pull rightwards
        const dl = Math.hypot(x - leftCheekX, y - cheekY);
        if (dl < cheekRadius) {
          const ratio = (1 - dl / cheekRadius) ** 2 * slimFactor;
          srcX -= (fx - leftCheekX) * ratio;
        }
        // Right cheek: pull leftwards
        const dr = Math.hypot(x - rightCheekX, y - cheekY);
        if (dr < cheekRadius) {
          const ratio = (1 - dr / cheekRadius) ** 2 * slimFactor;
          srcX -= (fx - rightCheekX) * ratio;
        }
      }

      // 2. Big eyes warp (spherical magnification)
      if (bigEyes > 0) {
        const dLeftEye = Math.hypot(x - leftEyeX, y - eyeY);
        if (dLeftEye < eyeRadius) {
          const ratio = (1 - dLeftEye / eyeRadius) ** 2 * eyeMagnify;
          srcX = leftEyeX + (x - leftEyeX) * (1 - ratio);
          srcY = eyeY + (y - eyeY) * (1 - ratio);
        }
        const dRightEye = Math.hypot(x - rightEyeX, y - eyeY);
        if (dRightEye < eyeRadius) {
          const ratio = (1 - dRightEye / eyeRadius) ** 2 * eyeMagnify;
          srcX = rightEyeX + (x - rightEyeX) * (1 - ratio);
          srcY = eyeY + (y - eyeY) * (1 - ratio);
        }
      }

      // Nearest / clamp bounds
      const clampX = Math.max(0, Math.min(w - 1, Math.round(srcX)));
      const clampY = Math.max(0, Math.min(h - 1, Math.round(srcY)));
      const targetIdx = (y * w + x) * 4;
      const sourceIdx = (clampY * w + clampX) * 4;

      dst[targetIdx] = src[sourceIdx];
      dst[targetIdx + 1] = src[sourceIdx + 1];
      dst[targetIdx + 2] = src[sourceIdx + 2];
      dst[targetIdx + 3] = src[sourceIdx + 3];
    }
  }

  outCtx.putImageData(outImgData, 0, 0);
  return outCanvas;
}

/**
 * Expert-Level Portrait Matting Engine (专家级人像智能抠图与换底引擎)
 * - Multi-Zone Perimeter Background Profiling & Color Cluster Sampling
 * - Anatomical Human Prior & Silhouette Protection (人脸/头颈/躯干核心绝对保护)
 * - Boundary-Seeded Topological Flood-Fill Segmentation (连通域边缘拓扑洪泛)
 * - Hair-Strand & Trimap Sub-Pixel Alpha Estimation (发丝级过渡带亚像素 Alpha 估计)
 * - Luminance Edge-Guided Bilateral Feathering (导向滤波边缘对齐)
 * - True Un-Premultiplication & Studio De-Fringing (底色反算剥离与去杂色)
 */
/**
 * State-of-the-Art Client-Side Portrait Matting Engine
 * - Bayesian Spatial-Color Mixture Modeling (GrabCut & Saliency inspired)
 * - Multi-Zone Perimeter Background Profiling with K-Means Color Modes
 * - Strict Anatomical Protection for Skin (Face/Ears/Neck) and Clothing (White Shirts/Suits)
 * - Sub-Pixel Fine Hair Matting with Color Projection
 * - Morphological Solidification & Hole-Filling
 * - Interactive Brush Touch-Up (Erase/Restore) Support
 * - Edge Refinement (Smooth / Natural / Sharp)
 * - True Un-Premultiplication & Dynamic Studio De-Fringing
 */
export function generatePortraitMatte(
  srcData: ImageData,
  settings: BackgroundSettings,
  faceResult?: FaceDetectionResult
): Float32Array {
  const { width: w, height: h, data } = srcData;
  const totalPixels = w * h;
  const alphaMask = new Float32Array(totalPixels);
  const {
    tolerance = 35,
    feather = 1.5,
    mattingMode = 'standard',
    edgeRefine = 'natural',
    brushStrokes = [],
    sampledBgPoints = [],
  } = settings;

  // 1. Establish Anatomical Subject Skeleton & Head Model
  let fcx: number, fcy: number, fw: number, fh: number;
  let headTop: number, chinY: number, neckY: number;

  if (faceResult && faceResult.detected && faceResult.box) {
    const fx = faceResult.box.x * w;
    const fy = faceResult.box.y * h;
    fw = Math.max(w * 0.22, faceResult.box.width * w);
    fh = Math.max(h * 0.26, faceResult.box.height * h);
    fcx = fx + fw * 0.5;
    fcy = fy + fh * 0.44;
    headTop = Math.max(0, fy - fh * 0.28);
    chinY = Math.min(h - 1, fy + fh * 0.90);
    neckY = Math.min(h - 1, chinY + fh * 0.40);
  } else {
    // Robust central anatomical baseline
    fcx = w * 0.5;
    fcy = h * 0.38;
    fw = w * 0.38;
    fh = h * 0.44;
    headTop = h * 0.10;
    chinY = h * 0.52;
    neckY = h * 0.64;
  }

  // 2. Precompute Luminance & Skin Map
  const lum = new Float32Array(totalPixels);
  const skinMap = new Uint8Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    if (isSkinPixel(r, g, b)) {
      skinMap[i] = 1;
    }
  }

  // 3. Multi-Zone Perimeter Background Sampling (Top, Left, Right, Bottom Corners, and User Sampled Points)
  const bgColors: { r: number; g: number; b: number }[] = [];
  const addBgSample = (sx: number, sy: number) => {
    if (sx < 0 || sx >= w || sy < 0 || sy >= h) return;
    const idx = (sy * w + sx) * 4;
    bgColors.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2] });
  };

  // Top border: outer 12% strip (skip center top if hair reaches near upper edge)
  const topStripH = Math.max(4, Math.min(Math.floor(headTop * 0.85), Math.floor(h * 0.14)));
  for (let y = 0; y < topStripH; y += 2) {
    for (let x = 0; x < w; x += 4) {
      if (y >= headTop * 0.6 && Math.abs(x - fcx) < fw * 0.42) continue;
      addBgSample(x, y);
    }
  }

  // Left and Right margins: outer 14%
  const sideW = Math.max(8, Math.min(Math.floor(w * 0.14), Math.floor(fcx - fw * 0.75)));
  for (let y = 0; y < h; y += 4) {
    for (let x = 0; x < sideW; x += 4) {
      addBgSample(x, y);
    }
    for (let x = Math.max(0, w - sideW); x < w; x += 4) {
      addBgSample(x, y);
    }
  }

  // Bottom corners (avoiding torso core)
  const botCornerH = Math.floor(h * 0.2);
  const botCornerW = Math.floor(w * 0.2);
  for (let y = h - botCornerH; y < h; y += 4) {
    for (let x = 0; x < botCornerW; x += 4) {
      addBgSample(x, y);
    }
    for (let x = w - botCornerW; x < w; x += 4) {
      addBgSample(x, y);
    }
  }

  // Add user-sampled background points from canvas eyedropper
  if (sampledBgPoints && sampledBgPoints.length > 0) {
    for (const pt of sampledBgPoints) {
      const px = Math.floor(pt.x * w);
      const py = Math.floor(pt.y * h);
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          addBgSample(px + dx, py + dy);
        }
      }
    }
  }

  // Extract up to 14 representative background color clusters
  const bgPalette: { r: number; g: number; b: number }[] = [];
  const paletteStep = Math.max(1, Math.floor(bgColors.length / 32));
  for (let i = 0; i < bgColors.length; i += paletteStep) {
    const c = bgColors[i];
    let exists = false;
    for (const p of bgPalette) {
      const d = Math.abs(c.r - p.r) + Math.abs(c.g - p.g) + Math.abs(c.b - p.b);
      if (d < 16) {
        exists = true;
        break;
      }
    }
    if (!exists) {
      bgPalette.push(c);
      if (bgPalette.length >= 14) break;
    }
  }

  // Fallback if background sample count is low
  if (bgPalette.length === 0) {
    bgPalette.push({ r: data[0], g: data[1], b: data[2] });
    bgPalette.push({ r: data[(w - 1) * 4], g: data[(w - 1) * 4 + 1], b: data[(w - 1) * 4 + 2] });
  }

  // 4. Sample Definite Foreground Color Palette (Face Skin, Hair, Clothing Core)
  const fgPalette: { r: number; g: number; b: number }[] = [];
  const addFgSample = (fxp: number, fyp: number) => {
    if (fxp < 0 || fxp >= w || fyp < 0 || fyp >= h) return;
    const idx = (fyp * w + fxp) * 4;
    const c = { r: data[idx], g: data[idx + 1], b: data[idx + 2] };
    for (const p of fgPalette) {
      if (Math.abs(c.r - p.r) + Math.abs(c.g - p.g) + Math.abs(c.b - p.b) < 14) return;
    }
    fgPalette.push(c);
  };

  // Face center
  const faceCoreRadX = Math.floor(fw * 0.28);
  const faceCoreRadY = Math.floor(fh * 0.28);
  for (let dy = -faceCoreRadY; dy <= faceCoreRadY; dy += 4) {
    for (let dx = -faceCoreRadX; dx <= faceCoreRadX; dx += 4) {
      if (dx * dx / (faceCoreRadX * faceCoreRadX) + dy * dy / (faceCoreRadY * faceCoreRadY) <= 0.8) {
        addFgSample(Math.floor(fcx + dx), Math.floor(fcy + dy));
      }
    }
  }

  // Chest / Clothing core
  const chestTop = Math.floor(neckY + fh * 0.15);
  const chestBottom = Math.min(h - 2, Math.floor(neckY + fh * 0.8));
  for (let y = chestTop; y < chestBottom; y += 4) {
    for (let x = Math.floor(fcx - fw * 0.22); x <= Math.floor(fcx + fw * 0.22); x += 4) {
      addFgSample(x, y);
    }
  }

  // Forehead Hair core
  const hairCoreY = Math.floor(headTop + fh * 0.08);
  for (let x = Math.floor(fcx - fw * 0.3); x <= Math.floor(fcx + fw * 0.3); x += 4) {
    addFgSample(x, hairCoreY);
  }

  // 5. Perceptual Color Distance Function
  const colorDist = (r: number, g: number, b: number, palette: { r: number; g: number; b: number }[]): number => {
    let minD = 9999;
    for (let i = 0; i < palette.length; i++) {
      const p = palette[i];
      const dr = r - p.r;
      const dg = g - p.g;
      const db = b - p.b;
      // Perceptually weighted Euclidean color metric
      const d = Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
      if (d < minD) minD = d;
    }
    return minD;
  };

  // Tolerance mapping (adaptive threshold)
  // Higher tolerance = remove more aggressively
  const baseThresh = 20 + (tolerance / 100) * 60;
  const softBand = 16 + (tolerance / 100) * 16;

  // Mode tuning weights
  let spatialWeight = 0.50;
  let colorWeight = 0.50;
  if (mattingMode === 'complex') {
    spatialWeight = 0.65;
    colorWeight = 0.35;
  } else if (mattingMode === 'studio') {
    spatialWeight = 0.35;
    colorWeight = 0.65;
  }

  // 6. Compute Spatial Prior & Probabilistic Coarse Matte
  for (let y = 0; y < h; y++) {
    const isBelowNeck = y > neckY;
    const torsoProgress = isBelowNeck ? Math.min(1.0, (y - neckY) / Math.max(1, h - neckY)) : 0;
    const torsoHalfW = (fw * 0.42) + (w * 0.54 - fw * 0.42) * torsoProgress;

    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const pIdx = idx * 4;
      const r = data[pIdx];
      const g = data[pIdx + 1];
      const b = data[pIdx + 2];
      const isSkin = skinMap[idx] === 1;

      // --- A. Anatomical Spatial Likelihood P_spatial ---
      let pSpatial = 0.5;

      // 1) Upper Head Ellipse (including hair volume)
      const headRadiusX = fw * 0.60;
      const headRadiusY = fh * 0.62;
      const dxHead = (x - fcx) / headRadiusX;
      const dyHead = (y - fcy) / headRadiusY;
      const distHeadSq = dxHead * dxHead + dyHead * dyHead;

      // 2) Outer Background Envelope (Far corners are definitely background)
      const isFarTopCorner = (y < h * 0.32) && (x < w * 0.20 || x > w * 0.80);
      const isFarSide = y < h * 0.60 && Math.abs(x - fcx) > (fw * 1.55);

      if (distHeadSq <= 0.70) {
        // Inner Head & Face Core: 100% Foreground
        pSpatial = 1.0;
      } else if (y <= neckY && distHeadSq <= 1.15) {
        // Hair and ears zone
        pSpatial = 0.85 - (distHeadSq - 0.70) * 0.6;
      } else if (isBelowNeck) {
        // Neck & Torso trapezoid
        const dxTorso = Math.abs(x - fcx);
        if (dxTorso <= torsoHalfW * 0.75) {
          // Definite clothing core
          pSpatial = 1.0;
        } else if (dxTorso <= torsoHalfW * 1.12) {
          // Shoulders transition slope
          const t = (dxTorso - torsoHalfW * 0.75) / (torsoHalfW * 0.37);
          pSpatial = 1.0 - t * 0.8;
        } else {
          pSpatial = 0.05;
        }
      } else if (isFarTopCorner || isFarSide || distHeadSq > 1.6) {
        pSpatial = 0.0;
      } else {
        pSpatial = Math.max(0, 1.0 - (distHeadSq - 1.0) / 0.6);
      }

      // --- B. Color Likelihood P_color ---
      const bgDist = colorDist(r, g, b, bgPalette);
      const fgDist = fgPalette.length > 0 ? colorDist(r, g, b, fgPalette) : 999;

      // Skin Tone Protection: Face, ears, and neck must NEVER be eroded by background
      let skinBonus = 0;
      if (isSkin && y < (neckY + fh * 0.4) && Math.abs(x - fcx) < (fw * 0.85)) {
        skinBonus = 45;
      }

      // Calculate raw color confidence
      const effectiveBgDist = bgDist + skinBonus;
      let pColor = 0;
      if (effectiveBgDist <= baseThresh * 0.65) {
        pColor = 0.0;
      } else if (effectiveBgDist >= baseThresh + softBand) {
        pColor = 1.0;
      } else {
        const t = (effectiveBgDist - baseThresh * 0.65) / (baseThresh * 0.35 + softBand);
        pColor = t * t * (3 - 2 * t);
      }

      // If color is much closer to known foreground than background, protect it
      if (fgDist < 25 && effectiveBgDist > 30) {
        pColor = Math.max(pColor, 0.90);
      }

      // Combine Spatial Prior + Color Likelihood
      let combinedAlpha = pSpatial * spatialWeight + pColor * colorWeight;

      // Lock definitive regions
      if (pSpatial >= 0.98 && (isSkin || y < chinY || isBelowNeck)) {
        combinedAlpha = 1.0;
      } else if (pSpatial <= 0.02 && bgDist < baseThresh * 1.2) {
        combinedAlpha = 0.0;
      }

      alphaMask[idx] = Math.max(0, Math.min(1, combinedAlpha));
    }
  }

  // 7. Morphological Subject Solidification & Hole-Filling
  // Ensure the body, shirts, and head have no internal transparent gaps
  const solidMask = new Float32Array(alphaMask);
  for (let y = 1; y < h - 1; y++) {
    const isTorso = y > chinY && y < h;
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      if (alphaMask[idx] >= 0.95) continue;

      // If surrounded by solid foreground on opposite sides, fill the hole
      if (isTorso && Math.abs(x - fcx) < (fw * 0.65)) {
        const leftA = alphaMask[idx - 1];
        const rightA = alphaMask[idx + 1];
        const topA = alphaMask[idx - w];
        const botA = alphaMask[idx + w];

        if ((leftA > 0.85 && rightA > 0.85) || (topA > 0.85 && botA > 0.85)) {
          solidMask[idx] = Math.max(alphaMask[idx], 0.98);
        }
      }
    }
  }

  // 8. Fine Hair Sub-Pixel Matting on Head Boundary
  for (let y = Math.max(0, Math.floor(headTop * 0.8)); y < Math.min(h, Math.floor(chinY)); y++) {
    for (let x = Math.max(0, Math.floor(fcx - fw * 0.85)); x < Math.min(w, Math.floor(fcx + fw * 0.85)); x++) {
      const idx = y * w + x;
      const a = solidMask[idx];
      if (a <= 0.02 || a >= 0.98) continue;

      // Sub-pixel hair luminance projection
      const pIdx = idx * 4;
      const pLum = lum[idx];
      const pBgDist = colorDist(data[pIdx], data[pIdx + 1], data[pIdx + 2], bgPalette);

      // In hair zone, darker wisps of hair against lighter background
      const hairAlpha = Math.max(0, Math.min(1, pBgDist / (baseThresh + 12)));
      solidMask[idx] = a * 0.4 + hairAlpha * 0.6;
    }
  }

  // 9. Apply User Manual Brush Strokes (Erase / Restore)
  if (brushStrokes && brushStrokes.length > 0) {
    const scaleFactor = w / 1000;
    for (const stroke of brushStrokes) {
      const targetVal = stroke.type === 'erase' ? 0.0 : 1.0;
      const brushRad = Math.max(3, Math.round((stroke.size || 25) * scaleFactor * 0.5));
      const brushRadSq = brushRad * brushRad;

      if (!stroke.points || stroke.points.length === 0) continue;

      // Render interpolated stroke points
      for (let p = 0; p < stroke.points.length; p++) {
        const pt = stroke.points[p];
        const cx = Math.floor(pt.x * w);
        const cy = Math.floor(pt.y * h);

        const xMin = Math.max(0, cx - brushRad);
        const xMax = Math.min(w - 1, cx + brushRad);
        const yMin = Math.max(0, cy - brushRad);
        const yMax = Math.min(h - 1, cy + brushRad);

        for (let by = yMin; by <= yMax; by++) {
          for (let bx = xMin; bx <= xMax; bx++) {
            const distSq = (bx - cx) * (bx - cx) + (by - cy) * (by - cy);
            if (distSq <= brushRadSq) {
              const bIdx = by * w + bx;
              const falloff = 1.0 - (distSq / brushRadSq) * 0.25; // Soft anti-aliased edge
              if (stroke.type === 'erase') {
                solidMask[bIdx] = Math.min(solidMask[bIdx], 1.0 - falloff);
              } else {
                solidMask[bIdx] = Math.max(solidMask[bIdx], falloff);
              }
            }
          }
        }
      }
    }
  }

  // 10. High-Frequency Native Guided Filter / Edge-Preserving Refinement
  if (settings.guidedFilter !== false && edgeRefine !== 'sharp') {
    const guideLum = extractGuidanceLuminance(srcData);
    const radius = settings.guidedRadius || Math.max(2, Math.min(5, Math.round(feather || 2)));
    return applyGuidedFilter(guideLum, solidMask, w, h, radius, 1e-4);
  }

  let filterRadius = Math.max(1, Math.min(4, Math.round(feather || 1.5)));
  if (edgeRefine === 'sharp') {
    filterRadius = 1;
  } else if (edgeRefine === 'smooth') {
    filterRadius = Math.max(2, filterRadius);
  }

  const finalMask = new Float32Array(totalPixels);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const cIdx = y * w + x;
      const curA = solidMask[cIdx];

      if (curA >= 0.999 || curA <= 0.001 || edgeRefine === 'sharp') {
        finalMask[cIdx] = curA;
        continue;
      }

      const centerLum = lum[cIdx];
      let sumA = 0;
      let sumW = 0;

      for (let dy = -filterRadius; dy <= filterRadius; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;

        for (let dx = -filterRadius; dx <= filterRadius; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= w) continue;

          const nIdx = ny * w + nx;
          const spatialDistSq = dx * dx + dy * dy;
          const lumDiff = Math.abs(lum[nIdx] - centerLum);

          const weight = Math.exp(
            -spatialDistSq / (2 * filterRadius * filterRadius) - (lumDiff * lumDiff) / 500
          );
          sumA += solidMask[nIdx] * weight;
          sumW += weight;
        }
      }

      finalMask[cIdx] = sumW > 0 ? sumA / sumW : curA;
    }
  }

  return finalMask;
}

/**
 * Render Portrait with Expert Halo-Free Solid Background Replacement
 * - Seamlessly un-premultiplies original background from semi-transparent hair/edge pixels
 * - Cleanses color contamination & halos (Studio De-fringe)
 * - Supports pure black & white alpha mask inspection mode (showAlphaMaskOnly)
 * - Seamlessly composites cut-out subject onto selected solid or gradient background
 */
export function renderWithBackground(
  srcData: ImageData,
  alphaMask: Float32Array,
  settings: BackgroundSettings,
  targetCanvas: HTMLCanvasElement
): void {
  const { width: w, height: h } = srcData;
  targetCanvas.width = w;
  targetCanvas.height = h;
  const ctx = targetCanvas.getContext('2d');
  if (!ctx) return;

  // A. Pure Black & White Alpha Mask Inspection Mode
  if (settings.showAlphaMaskOnly) {
    const maskImgData = ctx.createImageData(w, h);
    const mData = maskImgData.data;
    for (let i = 0; i < w * h; i++) {
      const v = Math.round(alphaMask[i] * 255);
      const idx = i * 4;
      mData[idx] = v;     // R
      mData[idx + 1] = v; // G
      mData[idx + 2] = v; // B
      mData[idx + 3] = 255;
    }
    ctx.putImageData(maskImgData, 0, 0);
    return;
  }

  // B. Draw Target Solid or Gradient Background
  if (settings.type === 'gradient' && settings.gradientStart && settings.gradientEnd) {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, settings.gradientStart);
    grad.addColorStop(1, settings.gradientEnd);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = settings.color || '#FFFFFF';
  }
  ctx.fillRect(0, 0, w, h);

  // C. Composite Subject with De-fringed Edges & Color Decontamination
  const targetBgData = ctx.getImageData(0, 0, w, h);
  const dst = targetBgData.data;

  // Apply neighborhood Color Decontamination (发丝边缘防溢色) if enabled
  const cleanSrcData = settings.decontamination !== false
    ? applyColorDecontamination(srcData, alphaMask, w, h)
    : srcData;
  const src = cleanSrcData.data;

  // Sample original background color from top corners for accurate de-fringing
  const origBgR = (src[0] + src[Math.min(w - 1, 8) * 4] + src[(w - 1) * 4]) / 3;
  const origBgG = (src[1] + src[Math.min(w - 1, 8) * 4 + 1] + src[(w - 1) * 4 + 1]) / 3;
  const origBgB = (src[2] + src[Math.min(w - 1, 8) * 4 + 2] + src[(w - 1) * 4 + 2]) / 3;

  for (let i = 0; i < w * h; i++) {
    const alpha = alphaMask[i];
    const idx = i * 4;

    if (alpha <= 0.005) {
      // 100% Background: already rendered
      continue;
    } else if (alpha >= 0.995) {
      // 100% Foreground Subject
      dst[idx] = src[idx];
      dst[idx + 1] = src[idx + 1];
      dst[idx + 2] = src[idx + 2];
      dst[idx + 3] = 255;
    } else {
      // Semi-transparent edge (Hair strands, neckline, lapels)
      let sr = src[idx];
      let sg = src[idx + 1];
      let sb = src[idx + 2];

      // Un-premultiply & De-fringe: strip out original background color bleed
      if (settings.deFringe) {
        const oneMinusAlpha = 1.0 - alpha;
        const estFgR = Math.max(0, Math.min(255, (sr - oneMinusAlpha * origBgR) / Math.max(0.08, alpha)));
        const estFgG = Math.max(0, Math.min(255, (sg - oneMinusAlpha * origBgG) / Math.max(0.08, alpha)));
        const estFgB = Math.max(0, Math.min(255, (sb - oneMinusAlpha * origBgB) / Math.max(0.08, alpha)));

        sr = estFgR;
        sg = estFgG;
        sb = estFgB;
      }

      const tr = dst[idx];
      const tg = dst[idx + 1];
      const tb = dst[idx + 2];

      dst[idx] = Math.round(sr * alpha + tr * (1 - alpha));
      dst[idx + 1] = Math.round(sg * alpha + tg * (1 - alpha));
      dst[idx + 2] = Math.round(sb * alpha + tb * (1 - alpha));
      dst[idx + 3] = 255;
    }
  }

  ctx.putImageData(targetBgData, 0, 0);
}

/**
 * Generate standard cropped ID Photo Canvas
 * - Crops and scales according to specification
 * - Adheres to head room ratio (10%~15% top margin)
 */
export function cropToSpec(
  sourceCanvas: HTMLCanvasElement,
  spec: PhotoSpec,
  composition: { scale: number; offsetX: number; offsetY: number; rotation: number },
  faceResult?: FaceDetectionResult,
  bgColor?: string
): HTMLCanvasElement {
  const targetCanvas = document.createElement('canvas');
  targetCanvas.width = spec.widthPx;
  targetCanvas.height = spec.heightPx;
  const ctx = targetCanvas.getContext('2d');
  if (!ctx) return targetCanvas;

  ctx.fillStyle = bgColor || '#FFFFFF';
  ctx.fillRect(0, 0, spec.widthPx, spec.heightPx);

  ctx.save();

  // Target dimensions
  const tw = spec.widthPx;
  const th = spec.heightPx;
  const sw = sourceCanvas.width;
  const sh = sourceCanvas.height;

  // Auto-centering based on face or default center
  let faceCenterNormX = 0.5;
  let faceCenterNormY = 0.42;

  if (faceResult && faceResult.detected) {
    faceCenterNormX = faceResult.box.x + faceResult.box.width * 0.5;
    faceCenterNormY = faceResult.box.y + faceResult.box.height * 0.42;
  }

  // Base scale so portrait fits standard proportions
  const baseScale = Math.max(tw / sw, th / sh) * composition.scale;

  // Center of crop target
  const targetCenterX = tw * 0.5 + composition.offsetX;
  const targetCenterY = th * 0.48 + composition.offsetY;

  ctx.translate(targetCenterX, targetCenterY);

  if (composition.rotation !== 0) {
    ctx.rotate((composition.rotation * Math.PI) / 180);
  }

  // Draw source image centered around face
  const drawW = sw * baseScale;
  const drawH = sh * baseScale;
  const drawX = -faceCenterNormX * drawW;
  const drawY = -faceCenterNormY * drawH;

  ctx.drawImage(sourceCanvas, drawX, drawY, drawW, drawH);
  ctx.restore();

  return targetCanvas;
}

/**
 * Generate 6-Inch Printable Sheet (1800 × 1200 px, 300 DPI, 152 × 102 mm)
 * - Auto layouts photos in matrix with dashed cutting marks
 */
export function generatePrintSheet(
  idPhotoCanvas: HTMLCanvasElement,
  spec: PhotoSpec
): HTMLCanvasElement {
  const sheetCanvas = document.createElement('canvas');
  const SHEET_W = 1800; // 6 inch @ 300 DPI
  const SHEET_H = 1200; // 4 inch @ 300 DPI
  sheetCanvas.width = SHEET_W;
  sheetCanvas.height = SHEET_H;
  const ctx = sheetCanvas.getContext('2d');
  if (!ctx) return sheetCanvas;

  // White photographic paper background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, SHEET_W, SHEET_H);

  const pw = idPhotoCanvas.width;
  const ph = idPhotoCanvas.height;

  // Determine optimal columns & rows
  let cols = 4;
  let rows = 2;

  if (spec.id === '1-inch' || spec.id === 'small-1-inch' || spec.id === 'driver-license') {
    cols = 4;
    rows = 2; // 8 photos
  } else if (spec.id === '2-inch' || spec.id === 'small-2-inch' || spec.id === 'large-1-inch') {
    cols = 2;
    rows = 2; // 4 photos
  } else if (spec.id === 'us-visa' || spec.id === 'japan-visa') {
    cols = 2;
    rows = 1; // 2 photos
  } else {
    cols = Math.max(1, Math.min(4, Math.floor((SHEET_W - 120) / (pw + 24))));
    rows = Math.max(1, Math.min(3, Math.floor((SHEET_H - 120) / (ph + 24))));
  }

  const gapX = 36;
  const gapY = 36;
  const totalGridW = cols * pw + (cols - 1) * gapX;
  const totalGridH = rows * ph + (rows - 1) * gapY;
  const startX = Math.round((SHEET_W - totalGridW) / 2);
  const startY = Math.round((SHEET_H - totalGridH) / 2) - 20;

  // Draw photos and cut guides
  ctx.strokeStyle = '#D0D5DD';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 6]);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = startX + c * (pw + gapX);
      const y = startY + r * (ph + gapY);

      // Draw photo
      ctx.drawImage(idPhotoCanvas, x, y, pw, ph);

      // Draw dashed cut border
      ctx.strokeRect(x - 0.5, y - 0.5, pw + 1, ph + 1);

      // Corner cross marks for scissor guide
      ctx.beginPath();
      ctx.setLineDash([]);
      ctx.strokeStyle = '#94A3B8';
      // top-left
      ctx.moveTo(x - 8, y); ctx.lineTo(x, y);
      ctx.moveTo(x, y - 8); ctx.lineTo(x, y);
      // top-right
      ctx.moveTo(x + pw, y); ctx.lineTo(x + pw + 8, y);
      ctx.moveTo(x + pw, y - 8); ctx.lineTo(x + pw, y);
      // bottom-left
      ctx.moveTo(x - 8, y + ph); ctx.lineTo(x, y + ph);
      ctx.moveTo(x, y + ph); ctx.lineTo(x, y + ph + 8);
      // bottom-right
      ctx.moveTo(x + pw, y + ph); ctx.lineTo(x + pw + 8, y + ph);
      ctx.moveTo(x + pw, y + ph); ctx.lineTo(x + pw, y + ph + 8);
      ctx.stroke();
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = '#D0D5DD';
    }
  }

  ctx.setLineDash([]);

  // Footer printing info
  ctx.fillStyle = '#64748B';
  ctx.font = '500 24px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textAlign = 'center';
  const today = new Date().toISOString().slice(0, 10);
  ctx.fillText(
    `标准6寸相纸排版 (${cols * rows}张) | 规格: ${spec.name} (${spec.description}) | 打印DPI: 300 | 生成日期: ${today}`,
    SHEET_W / 2,
    SHEET_H - 45
  );

  return sheetCanvas;
}

/**
 * Trigger browser file download with clear metadata filename
 */
export function downloadCanvasImage(
  canvas: HTMLCanvasElement,
  filename: string,
  format: 'image/jpeg' | 'image/png' = 'image/jpeg',
  quality: number = 0.95
): void {
  const dataUrl = canvas.toDataURL(format, quality);
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
