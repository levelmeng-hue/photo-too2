import { PhotoSpec, FaceDetectionResult, CompositionSettings } from '../types';

export const PHOTO_SPECS: PhotoSpec[] = [
  {
    id: '1-inch',
    name: '一寸 (标准)',
    shortLabel: '一寸',
    category: 'common',
    widthPx: 295,
    heightPx: 413,
    widthMm: 25,
    heightMm: 35,
    dpi: 300,
    description: '25mm × 35mm',
    usage: '各类证书、英语四六级、普通简历、健康证、工作证',
    printPerSheet6Inch: 8,
    isCommon: true,
  },
  {
    id: '2-inch',
    name: '二寸 (标准)',
    shortLabel: '二寸',
    category: 'common',
    widthPx: 413,
    heightPx: 579,
    widthMm: 35,
    heightMm: 49,
    dpi: 300,
    description: '35mm × 49mm',
    usage: '公务员考试、求职简历、硕士考研、毕业证书、各类资格证',
    printPerSheet6Inch: 4,
    isCommon: true,
  },
  {
    id: 'small-2-inch',
    name: '小二寸',
    shortLabel: '小二寸',
    category: 'common',
    widthPx: 413,
    heightPx: 531,
    widthMm: 35,
    heightMm: 45,
    dpi: 300,
    description: '35mm × 45mm',
    usage: '国际标准护照、申根签证、欧洲多国签证、出国交流',
    printPerSheet6Inch: 4,
    isCommon: true,
  },
  {
    id: 'id-card',
    name: '二代身份证',
    shortLabel: '身份证',
    category: 'document',
    widthPx: 358,
    heightPx: 441,
    widthMm: 26,
    heightMm: 32,
    dpi: 350,
    description: '26mm × 32mm (350 DPI)',
    usage: '中华人民共和国居民身份证数字相片、社保卡',
    printPerSheet6Inch: 6,
    isCommon: true,
  },
  {
    id: 'large-1-inch',
    name: '大一寸',
    shortLabel: '大一寸',
    category: 'common',
    widthPx: 390,
    heightPx: 567,
    widthMm: 33,
    heightMm: 48,
    dpi: 300,
    description: '33mm × 48mm',
    usage: '中国护照、港澳通行证、旅行证、出入境通行证',
    printPerSheet6Inch: 4,
    isCommon: true,
  },
  {
    id: 'teacher-cert',
    name: '教师资格证',
    shortLabel: '教资',
    category: 'document',
    widthPx: 295,
    heightPx: 413,
    widthMm: 25,
    heightMm: 35,
    dpi: 300,
    description: '25mm × 35mm (一寸)',
    usage: '全国中小学教师资格考试笔试/面试准考证及认定',
    printPerSheet6Inch: 8,
    isCommon: true,
  },
  {
    id: 'cet-exam',
    name: '英语四六级 (CET)',
    shortLabel: '四六级',
    category: 'document',
    widthPx: 240,
    heightPx: 320,
    widthMm: 20,
    heightMm: 27,
    dpi: 300,
    description: '240px × 320px (3:4)',
    usage: '全国大学英语四六级考试网上报名系统准考相片',
    printPerSheet6Inch: 8,
    isCommon: true,
  },
  {
    id: 'small-1-inch',
    name: '小一寸',
    shortLabel: '小一寸',
    category: 'common',
    widthPx: 260,
    heightPx: 378,
    widthMm: 22,
    heightMm: 32,
    dpi: 300,
    description: '22mm × 32mm',
    usage: '驾照体检、机动车驾驶证、职业资格考试准考证',
    printPerSheet6Inch: 9,
  },
  {
    id: 'driver-license',
    name: '驾驶证 (车管所)',
    shortLabel: '驾照',
    category: 'document',
    widthPx: 260,
    heightPx: 378,
    widthMm: 22,
    heightMm: 32,
    dpi: 300,
    description: '22mm × 32mm',
    usage: '机动车驾驶证体检及交管12123制证相片',
    printPerSheet6Inch: 9,
    isCommon: true,
  },
  {
    id: 'social-security',
    name: '社保卡 / 医保卡',
    shortLabel: '社保卡',
    category: 'document',
    widthPx: 358,
    heightPx: 441,
    widthMm: 26,
    heightMm: 32,
    dpi: 350,
    description: '26mm × 32mm (350 DPI)',
    usage: '社会保障卡申领、电子社保卡人像',
    printPerSheet6Inch: 6,
  },
  {
    id: 'large-2-inch',
    name: '大二寸',
    shortLabel: '大二寸',
    category: 'common',
    widthPx: 413,
    heightPx: 626,
    widthMm: 35,
    heightMm: 53,
    dpi: 300,
    description: '35mm × 53mm',
    usage: '部分行业认证、部分高级职称证书、特殊出入境用途',
    printPerSheet6Inch: 4,
  },
  {
    id: 'us-visa',
    name: '美国签证 (正方形)',
    shortLabel: '美签',
    category: 'visa',
    widthPx: 600,
    heightPx: 600,
    widthMm: 51,
    heightMm: 51,
    dpi: 300,
    description: '51mm × 51mm (2×2 英寸)',
    usage: '美国签证 DS-160、绿卡、印度签证',
    printPerSheet6Inch: 2,
    isCommon: true,
  },
  {
    id: 'japan-visa',
    name: '日本签证',
    shortLabel: '日签',
    category: 'visa',
    widthPx: 531,
    heightPx: 531,
    widthMm: 45,
    heightMm: 45,
    dpi: 300,
    description: '45mm × 45mm',
    usage: '日本单次及多次往返个人旅游/商务签证',
    printPerSheet6Inch: 4,
  },
];

/**
 * Top Common Specifications for Instant Quick Select
 */
export const COMMON_QUICK_SPECS = PHOTO_SPECS.filter(s => s.isCommon);

/**
 * Automatically match the most suitable ID photo spec based on image dimensions and face detection
 */
export function autoMatchSpec(
  imgWidth: number,
  imgHeight: number,
  faceResult?: FaceDetectionResult | null,
  specs: PhotoSpec[] = PHOTO_SPECS
): {
  spec: PhotoSpec;
  confidence: number;
  reason: string;
  recommendedComposition?: Partial<CompositionSettings>;
} {
  if (imgWidth <= 0 || imgHeight <= 0) {
    return {
      spec: specs[0],
      confidence: 0.9,
      reason: '默认匹配最常用标准一寸规格',
    };
  }

  const imgRatio = imgWidth / imgHeight;

  // Score each spec based on ratio similarity and commonality
  let bestSpec = specs[0];
  let minDiff = Infinity;

  for (const spec of specs) {
    const specRatio = spec.widthPx / spec.heightPx;
    let diff = Math.abs(imgRatio - specRatio);

    // If image is near square (ratio > 0.92 and < 1.08), strongly prioritize square visa
    if (Math.abs(imgRatio - 1.0) <= 0.08 && spec.widthPx === spec.heightPx) {
      diff *= 0.35;
    }

    // Prioritize high-frequency common specs
    if (spec.id === '1-inch' || spec.id === '2-inch' || spec.id === 'small-2-inch' || spec.id === 'id-card') {
      diff *= 0.88;
    }

    if (diff < minDiff) {
      minDiff = diff;
      bestSpec = spec;
    }
  }

  // Calculate recommendation confidence
  const matchPercent = Math.max(75, Math.min(99, Math.round((1 - minDiff) * 100)));
  const reason = `匹配度 ${matchPercent}% · 原始比例 ${(imgRatio).toFixed(2)}:1 最契合「${bestSpec.name}」(${bestSpec.description})`;

  // Calculate recommended composition settings to fit standard ID photo head room and proportion
  let recommendedComposition: Partial<CompositionSettings> | undefined = undefined;

  if (faceResult && faceResult.detected && faceResult.box) {
    // Standard rule: face height should occupy ~60% to 65% of the target photo height
    const targetFaceOccupancy = 0.62;
    const currentFaceHeight = faceResult.box.height; // normalized to original image height

    // Optimal scale factor
    let optScale = 1.0;
    if (currentFaceHeight > 0.05 && currentFaceHeight < 0.95) {
      optScale = targetFaceOccupancy / currentFaceHeight;
      // Clamp to natural range [0.75, 1.8]
      optScale = Math.max(0.75, Math.min(1.8, Number(optScale.toFixed(2))));
    }

    // Optimal vertical offset: align eyes to ~42% of photo height or headroom ~12%
    let optOffsetY = 0;
    const faceCenterNormY = faceResult.box.y + faceResult.box.height * 0.42;
    // Expected center Y is 0.48; if face center is different, adjust offset in pixels relative to spec height
    const diffNormY = 0.48 - faceCenterNormY;
    optOffsetY = Math.round(diffNormY * bestSpec.heightPx * 0.4);
    optOffsetY = Math.max(-60, Math.min(60, optOffsetY));

    // Rotation correction if detected
    const optRotation = faceResult.angle ? Number((-faceResult.angle).toFixed(1)) : 0;

    recommendedComposition = {
      scale: optScale,
      offsetX: 0,
      offsetY: optOffsetY,
      rotation: optRotation,
    };
  }

  return {
    spec: bestSpec,
    confidence: matchPercent / 100,
    reason,
    recommendedComposition,
  };
}

export interface PresetColor {
  id: string;
  name: string;
  type: 'solid' | 'gradient';
  value: string;
  gradientStart?: string;
  gradientEnd?: string;
  label: string;
  textColor: string;
  border?: string;
}

export const PRESET_COLORS: PresetColor[] = [
  {
    id: 'white',
    name: '标准纯白',
    type: 'solid',
    value: '#FFFFFF',
    label: '白色',
    textColor: '#333333',
    border: '#E2E8F0',
  },
  {
    id: 'blue',
    name: '标准证件蓝',
    type: 'solid',
    value: '#438EDB',
    label: '蓝色',
    textColor: '#FFFFFF',
  },
  {
    id: 'blue-dark',
    name: '科技深蓝',
    type: 'solid',
    value: '#2D5BFF',
    label: '深蓝',
    textColor: '#FFFFFF',
  },
  {
    id: 'red',
    name: '标准证件红',
    type: 'solid',
    value: '#D9001B',
    label: '红色',
    textColor: '#FFFFFF',
  },
  {
    id: 'red-bright',
    name: '艳丽大红',
    type: 'solid',
    value: '#FF0000',
    label: '大红',
    textColor: '#FFFFFF',
  },
  {
    id: 'gray',
    name: '高级商务灰',
    type: 'solid',
    value: '#E6E8EB',
    label: '商务灰',
    textColor: '#2A2460',
  },
  {
    id: 'grad-blue',
    name: '渐变证件蓝',
    type: 'gradient',
    value: 'linear-gradient(180deg, #6AA2F4 0%, #2D5BFF 100%)',
    gradientStart: '#6AA2F4',
    gradientEnd: '#2D5BFF',
    label: '渐变蓝',
    textColor: '#FFFFFF',
  },
  {
    id: 'grad-red',
    name: '渐变党政红',
    type: 'gradient',
    value: 'linear-gradient(180deg, #F04F4F 0%, #C40B1D 100%)',
    gradientStart: '#F04F4F',
    gradientEnd: '#C40B1D',
    label: '渐变红',
    textColor: '#FFFFFF',
  },
  {
    id: 'grad-gray',
    name: '渐变质感灰',
    type: 'gradient',
    value: 'linear-gradient(180deg, #F5F7FA 0%, #B8C0CC 100%)',
    gradientStart: '#F5F7FA',
    gradientEnd: '#B8C0CC',
    label: '渐变灰',
    textColor: '#2A2460',
  },
];
