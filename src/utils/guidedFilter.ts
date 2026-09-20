/**
 * Guided Filter & Color Decontamination Engine (导向滤波与色彩防溢色引擎)
 * Based on Kaiming He et al. (IEEE TPAMI / ECCV)
 * Performs edge-preserving alpha matte refinement using high-resolution native guidance
 */

/**
 * Separable O(1) Fast Box Filter using 1D running sums
 */
export function fastBoxFilter(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const dst = new Float32Array(w * h);
  const temp = new Float32Array(w * h);
  const clampedR = Math.max(1, Math.min(20, Math.round(r)));

  // 1. Horizontal pass
  for (let y = 0; y < h; y++) {
    const rowOffset = y * w;
    let sum = 0;
    // Pre-fill window
    for (let x = -clampedR; x <= clampedR; x++) {
      const cx = Math.max(0, Math.min(w - 1, x));
      sum += src[rowOffset + cx];
    }
    temp[rowOffset] = sum;

    for (let x = 1; x < w; x++) {
      const prevX = Math.max(0, x - clampedR - 1);
      const nextX = Math.min(w - 1, x + clampedR);
      sum += src[rowOffset + nextX] - src[rowOffset + prevX];
      temp[rowOffset + x] = sum;
    }
  }

  // 2. Vertical pass
  const windowArea = (2 * clampedR + 1) * (2 * clampedR + 1);
  for (let x = 0; x < w; x++) {
    let sum = 0;
    // Pre-fill window
    for (let y = -clampedR; y <= clampedR; y++) {
      const cy = Math.max(0, Math.min(h - 1, y));
      sum += temp[cy * w + x];
    }
    dst[x] = sum / windowArea;

    for (let y = 1; y < h; y++) {
      const prevY = Math.max(0, y - clampedR - 1);
      const nextY = Math.min(h - 1, y + clampedR);
      sum += temp[nextY * w + x] - temp[prevY * w + x];
      dst[y * w + x] = sum / windowArea;
    }
  }

  return dst;
}

/**
 * Extract normalized luminance [0, 1] from high-res ImageData as Guidance Image I
 */
export function extractGuidanceLuminance(imageData: ImageData): Float32Array {
  const { data, width, height } = imageData;
  const lum = new Float32Array(width * height);
  const len = width * height;

  for (let i = 0; i < len; i++) {
    const idx = i * 4;
    // Perceptual Rec. 709 luminance
    lum[i] = (0.2126 * data[idx] + 0.7152 * data[idx + 1] + 0.0722 * data[idx + 2]) / 255.0;
  }
  return lum;
}

/**
 * Apply Guided Filter: q = mean_a * I + mean_b
 * High-frequency hair details from the native camera image I are transferred to alpha matte p
 */
export function applyGuidedFilter(
  guideLum: Float32Array,
  alphaIn: Float32Array,
  w: number,
  h: number,
  radius: number = 3,
  eps: number = 1e-4
): Float32Array {
  const len = w * h;
  const II = new Float32Array(len);
  const Ip = new Float32Array(len);

  for (let i = 0; i < len; i++) {
    const g = guideLum[i];
    const p = alphaIn[i];
    II[i] = g * g;
    Ip[i] = g * p;
  }

  const meanI = fastBoxFilter(guideLum, w, h, radius);
  const meanP = fastBoxFilter(alphaIn, w, h, radius);
  const corrI = fastBoxFilter(II, w, h, radius);
  const corrIp = fastBoxFilter(Ip, w, h, radius);

  const a = new Float32Array(len);
  const b = new Float32Array(len);

  for (let i = 0; i < len; i++) {
    const mI = meanI[i];
    const mP = meanP[i];
    const varI = Math.max(0, corrI[i] - mI * mI);
    const covIp = corrIp[i] - mI * mP;

    // Linear coefficient a = cov(I, p) / (var(I) + eps)
    const coeffA = covIp / (varI + eps);
    // Linear coefficient b = mean_p - a * mean_I
    const coeffB = mP - coeffA * mI;

    a[i] = coeffA;
    b[i] = coeffB;
  }

  const meanA = fastBoxFilter(a, w, h, radius);
  const meanB = fastBoxFilter(b, w, h, radius);

  const outAlpha = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    // q = mean_a * I + mean_b
    const q = meanA[i] * guideLum[i] + meanB[i];
    outAlpha[i] = Math.max(0, Math.min(1, q));
  }

  return outAlpha;
}

/**
 * Color Decontamination (发丝与边缘防溢色校正)
 * When swapping backgrounds, original background tint bleeding into fine hair strands
 * (semi-transparent boundary pixels) is neutralized using confident foreground colors.
 */
export function applyColorDecontamination(
  srcData: ImageData,
  alphaMatte: Float32Array,
  w: number,
  h: number
): ImageData {
  const output = new ImageData(new Uint8ClampedArray(srcData.data), w, h);
  const data = output.data;

  // Boundary pixels where 0.05 < alpha < 0.92 often contain original background light spill
  const searchR = 3;

  for (let y = 0; y < h; y++) {
    const rowOffset = y * w;
    for (let x = 0; x < w; x++) {
      const idx = rowOffset + x;
      const alpha = alphaMatte[idx];

      if (alpha > 0.05 && alpha < 0.90) {
        // Search local neighborhood for confident foreground pixels (alpha >= 0.92)
        let fgR = 0, fgG = 0, fgB = 0, fgCount = 0;

        for (let dy = -searchR; dy <= searchR; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= h) continue;
          const nRow = ny * w;
          for (let dx = -searchR; dx <= searchR; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= w) continue;
            const nIdx = nRow + nx;
            if (alphaMatte[nIdx] >= 0.88) {
              const pIdx = nIdx * 4;
              fgR += data[pIdx];
              fgG += data[pIdx + 1];
              fgB += data[pIdx + 2];
              fgCount++;
            }
          }
        }

        if (fgCount > 0) {
          const avgR = fgR / fgCount;
          const avgG = fgG / fgCount;
          const avgB = fgB / fgCount;

          const pIdx = idx * 4;
          const blendWeight = (1 - alpha) * 0.75; // stronger decontamination for thinner strands
          data[pIdx] = Math.round(data[pIdx] * (1 - blendWeight) + avgR * blendWeight);
          data[pIdx + 1] = Math.round(data[pIdx + 1] * (1 - blendWeight) + avgG * blendWeight);
          data[pIdx + 2] = Math.round(data[pIdx + 2] * (1 - blendWeight) + avgB * blendWeight);
        }
      }
    }
  }

  return output;
}
