import React, { useState } from 'react';
import { BeautySettings } from '../../types';
import {
  Wand2,
  Sparkles,
  Sun,
  SunMedium,
  Contrast,
  Smile,
  Eye,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  Check,
  ChevronDown,
  Minus,
  Plus
} from 'lucide-react';

interface StepBeautyProps {
  beauty: BeautySettings;
  onChangeBeauty: (settings: BeautySettings) => void;
  onApplyPreset: () => void;
  onResetBeauty: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export const StepBeauty: React.FC<StepBeautyProps> = ({
  beauty,
  onChangeBeauty,
  onApplyPreset,
  onResetBeauty,
  onNext,
  onPrev,
}) => {
  // 画面明暗与光影调节功能 默认收起状态
  const [isLightExpanded, setIsLightExpanded] = useState<boolean>(false);
  const brightness = beauty.brightness ?? 0;
  const contrast = beauty.contrast ?? 0;
  const isLightModified = brightness !== 0 || contrast !== 0;

  const updateSetting = (key: keyof BeautySettings, value: number) => {
    onChangeBeauty({
      ...beauty,
      [key]: value,
    });
  };

  const applyLightPreset = (b: number, c: number) => {
    onChangeBeauty({
      ...beauty,
      brightness: b,
      contrast: c,
    });
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-[#2A2460]">智能美颜与明暗调节</h2>
          <p className="text-[13px] text-[#666666] mt-1">
            微调光影曝光、肤质质感与面部轮廓，符合证件照规范
          </p>
        </div>

        {/* Reset */}
        <button
          type="button"
          id="beauty-reset-all-btn"
          onClick={onResetBeauty}
          className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-[8px] border border-[#EEEEEE] text-[12px] text-[#666666] hover:text-[#2A2460] hover:bg-[#F5F7FA] transition-all cursor-pointer"
          title="将所有美颜及明暗参数恢复为0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>重置全部</span>
        </button>
      </div>

      {/* 1-Click Recommended Natural Preset Button */}
      <button
        id="apply-natural-beauty-btn"
        type="button"
        onClick={onApplyPreset}
        className="w-full flex items-center justify-between p-3.5 rounded-[16px] bg-gradient-to-r from-[#A56EFF]/10 via-[#7B68EE]/15 to-[#FFB347]/15 border border-[#7B68EE]/30 hover:border-[#7B68EE] text-[#2A2460] transition-all shadow-[0_4px_12px_rgba(123,104,238,0.08)] group active:scale-98 cursor-pointer"
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-[12px] bg-gradient-to-tr from-[#A56EFF] to-[#7B68EE] flex items-center justify-center text-white shadow-[0_4px_12px_rgba(123,104,238,0.25)]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="text-[14px] font-bold flex items-center space-x-1.5">
              <span>一键自然美颜</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FFB347] text-white font-semibold">
                推荐
              </span>
            </div>
            <div className="text-[11px] text-[#666666]">
              适度磨皮+智能透亮白皙，保留面部特征质感
            </div>
          </div>
        </div>
        <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[#7B68EE] shadow-xs group-hover:translate-x-1 transition-transform">
          <Check className="w-4 h-4" />
        </div>
      </button>

      {/* 1. 明暗调节专区 (Brightness & Contrast Adjustment) - 默认收起折叠面板，移动端深度交互适配 */}
      <div className="rounded-[20px] bg-[#FFFFFF] border border-[#EEEEEE] shadow-[0_4px_12px_rgba(42,36,96,0.04)] overflow-hidden transition-all">
        {/* Accordion Header (符合谷歌 Material 3 移动端 48dp+ 触控规范) */}
        <button
          type="button"
          id="toggle-light-adjust-accordion"
          onClick={() => setIsLightExpanded(prev => !prev)}
          aria-expanded={isLightExpanded}
          aria-controls="light-adjust-content"
          className="w-full p-3.5 sm:p-4 flex items-center justify-between text-left hover:bg-[#FDFDFF] active:bg-[#F5F7FA] transition-colors cursor-pointer select-none touch-manipulation min-h-[56px]"
        >
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-[12px] bg-[#FFA500]/12 flex items-center justify-center text-[#FFA500] shrink-0 shadow-xs">
              <SunMedium className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[14px] sm:text-[15px] font-bold text-[#2A2460]">
                  画面明暗与光影调节
                </span>
                {isLightModified ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFA500]/15 text-[#D97706] font-mono font-bold">
                    {`已调节 亮${brightness > 0 ? '+' : ''}${brightness} / 对${contrast > 0 ? '+' : ''}${contrast}`}
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F0F0F0] text-[#777777] font-medium hidden xs:inline">
                    默认收起
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#888888] mt-0.5 line-clamp-1">
                {isLightModified
                  ? '已应用光影优化，点击可展开微调'
                  : '针对弱光、阴天或曝光不足照片提亮与反差补偿（点击展开）'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0 ml-2">
            {isLightModified && (
              <span
                role="button"
                tabIndex={0}
                id="reset-light-tone-btn"
                onClick={e => {
                  e.stopPropagation();
                  applyLightPreset(0, 0);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    applyLightPreset(0, 0);
                  }
                }}
                className="text-[11px] text-[#888888] hover:text-[#7B68EE] px-2.5 py-1.5 rounded-lg bg-[#F5F7FA] hover:bg-[#FAF9FF] active:scale-95 transition-all cursor-pointer font-medium touch-manipulation min-h-[32px] flex items-center"
                title="将亮度与对比度复原为 0"
              >
                还原
              </span>
            )}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-[#666666] transition-transform duration-200 ${
                isLightExpanded ? 'rotate-180 text-[#7B68EE] bg-[#7B68EE]/10' : 'bg-[#F5F7FA]'
              }`}
            >
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </button>

        {/* Collapsible Content Section (展开后的精细调控区) */}
        {isLightExpanded && (
          <div
            id="light-adjust-content"
            className="p-4 pt-2 border-t border-[#F0F0F0] space-y-4 animate-in fade-in-50 duration-200"
          >
            {/* Quick Light Presets: 移动端 2x2 网格，触控高度 >= 44px */}
            <div>
              <div className="text-[12px] font-medium text-[#555555] mb-2 flex items-center justify-between">
                <span>常用补光场景推荐：</span>
                <span className="text-[11px] text-[#999999]">点击一键匹配光线</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  id="light-preset-normal"
                  onClick={() => applyLightPreset(0, 0)}
                  className={`min-h-[44px] py-2 px-2.5 rounded-[12px] text-[12px] font-medium border transition-all cursor-pointer text-center flex flex-col items-center justify-center touch-manipulation active:scale-[0.98] ${
                    brightness === 0 && contrast === 0
                      ? 'bg-[#7B68EE]/12 border-[#7B68EE] text-[#7B68EE] font-bold shadow-xs'
                      : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#555555] hover:bg-[#F3F4F6]'
                  }`}
                >
                  <span className="leading-tight">原片光线</span>
                  <span className="text-[10px] opacity-70 font-mono mt-0.5">默认 0</span>
                </button>
                <button
                  type="button"
                  id="light-preset-mild"
                  onClick={() => applyLightPreset(15, 10)}
                  className={`min-h-[44px] py-2 px-2.5 rounded-[12px] text-[12px] font-medium border transition-all cursor-pointer text-center flex flex-col items-center justify-center touch-manipulation active:scale-[0.98] ${
                    brightness === 15 && contrast === 10
                      ? 'bg-[#FFA500]/15 border-[#FFA500] text-[#D97706] font-bold shadow-xs'
                      : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#555555] hover:bg-[#FFFBEB]'
                  }`}
                  title="适度提亮曝光 (+15) 并强化五官层次 (+10)"
                >
                  <span className="leading-tight">微光轻补</span>
                  <span className="text-[10px] text-[#D97706] font-mono mt-0.5">+15 / +10</span>
                </button>
                <button
                  type="button"
                  id="light-preset-boost"
                  onClick={() => applyLightPreset(28, 16)}
                  className={`min-h-[44px] py-2 px-2.5 rounded-[12px] text-[12px] font-medium border transition-all cursor-pointer text-center flex flex-col items-center justify-center touch-manipulation active:scale-[0.98] ${
                    brightness === 28 && contrast === 16
                      ? 'bg-[#FFA500]/15 border-[#FFA500] text-[#D97706] font-bold shadow-xs'
                      : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#555555] hover:bg-[#FFFBEB]'
                  }`}
                  title="深度提亮昏暗场景 (+28) 并拉高对比度 (+16)"
                >
                  <span className="leading-tight">暗光强补</span>
                  <span className="text-[10px] text-[#D97706] font-mono mt-0.5">+28 / +16</span>
                </button>
                <button
                  type="button"
                  id="light-preset-dim"
                  onClick={() => applyLightPreset(-15, -6)}
                  className={`min-h-[44px] py-2 px-2.5 rounded-[12px] text-[12px] font-medium border transition-all cursor-pointer text-center flex flex-col items-center justify-center touch-manipulation active:scale-[0.98] ${
                    brightness === -15 && contrast === -6
                      ? 'bg-[#64748B]/15 border-[#64748B] text-[#334155] font-bold shadow-xs'
                      : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#555555] hover:bg-[#F1F5F9]'
                  }`}
                  title="压暗过曝面部与背景 (-15)"
                >
                  <span className="leading-tight">压暗抑光</span>
                  <span className="text-[10px] text-[#475569] font-mono mt-0.5">-15 / -6</span>
                </button>
              </div>
            </div>

            <div className="border-t border-[#F0F0F0]" />

            {/* 1.1 图片亮度 (Brightness Slider with Mobile Steppers) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[13px]">
                <div className="flex items-center space-x-2 font-bold text-[#2A2460]">
                  <Sun className="w-4 h-4 text-[#FFA500]" />
                  <span>图片亮度</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span
                    className={`font-mono text-[12px] font-bold px-2 py-0.5 rounded-[6px] ${
                      brightness > 0
                        ? 'bg-[#FFA500]/15 text-[#D97706]'
                        : brightness < 0
                        ? 'bg-[#64748B]/15 text-[#334155]'
                        : 'bg-[#F5F7FA] text-[#666666]'
                    }`}
                  >
                    {brightness > 0 ? `+${brightness}` : brightness}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-[#888888]">
                提升阴影采光与整体曝光，解决弱光环境下人脸昏暗问题
              </p>

              {/* Slider with +/- Stepper Buttons for precise mobile touch */}
              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  id="brightness-step-down"
                  onClick={() => updateSetting('brightness', Math.max(-50, brightness - 5))}
                  className="w-10 h-10 rounded-xl bg-[#F5F7FA] hover:bg-[#EEEEEE] active:scale-95 text-[#444444] flex items-center justify-center shrink-0 touch-manipulation cursor-pointer border border-[#E5E7EB]"
                  title="降低亮度 5"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <div className="flex-1 py-2 flex items-center">
                  <input
                    id="beauty-brightness-slider"
                    type="range"
                    min="-50"
                    max="50"
                    step="1"
                    value={brightness}
                    onChange={e => updateSetting('brightness', Number(e.target.value))}
                    className="w-full h-3 bg-[#EAEAEA] rounded-full appearance-none cursor-pointer accent-[#FFA500] touch-pan-x"
                  />
                </div>

                <button
                  type="button"
                  id="brightness-step-up"
                  onClick={() => updateSetting('brightness', Math.min(50, brightness + 5))}
                  className="w-10 h-10 rounded-xl bg-[#F5F7FA] hover:bg-[#EEEEEE] active:scale-95 text-[#444444] flex items-center justify-center shrink-0 touch-manipulation cursor-pointer border border-[#E5E7EB]"
                  title="增加亮度 5"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="flex justify-between items-center text-[10px] text-[#999999] pt-0.5 font-mono">
                <span>-50 偏暗</span>
                <button
                  type="button"
                  onClick={() => updateSetting('brightness', 0)}
                  className="px-2.5 py-1 rounded-full bg-[#F5F7FA] hover:bg-[#EEEEEE] active:scale-95 text-[#666666] font-medium transition-all cursor-pointer touch-manipulation"
                  title="点击恢复原片默认亮度"
                >
                  0 (恢复原片)
                </button>
                <span>+50 强提亮</span>
              </div>
            </div>

            <div className="border-t border-[#F0F0F0]" />

            {/* 1.2 画面对比度 (Contrast Slider with Mobile Steppers) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[13px]">
                <div className="flex items-center space-x-2 font-bold text-[#2A2460]">
                  <Contrast className="w-4 h-4 text-[#7B68EE]" />
                  <span>画面对比度</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span
                    className={`font-mono text-[12px] font-bold px-2 py-0.5 rounded-[6px] ${
                      contrast > 0
                        ? 'bg-[#7B68EE]/15 text-[#7B68EE]'
                        : contrast < 0
                        ? 'bg-[#64748B]/15 text-[#334155]'
                        : 'bg-[#F5F7FA] text-[#666666]'
                    }`}
                  >
                    {contrast > 0 ? `+${contrast}` : contrast}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-[#888888]">
                增强五官明暗层次与发丝边缘反差，避免提亮后画面发灰发雾
              </p>

              {/* Slider with +/- Stepper Buttons for precise mobile touch */}
              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  id="contrast-step-down"
                  onClick={() => updateSetting('contrast', Math.max(-50, contrast - 5))}
                  className="w-10 h-10 rounded-xl bg-[#F5F7FA] hover:bg-[#EEEEEE] active:scale-95 text-[#444444] flex items-center justify-center shrink-0 touch-manipulation cursor-pointer border border-[#E5E7EB]"
                  title="降低对比度 5"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <div className="flex-1 py-2 flex items-center">
                  <input
                    id="beauty-contrast-slider"
                    type="range"
                    min="-50"
                    max="50"
                    step="1"
                    value={contrast}
                    onChange={e => updateSetting('contrast', Number(e.target.value))}
                    className="w-full h-3 bg-[#EAEAEA] rounded-full appearance-none cursor-pointer accent-[#7B68EE] touch-pan-x"
                  />
                </div>

                <button
                  type="button"
                  id="contrast-step-up"
                  onClick={() => updateSetting('contrast', Math.min(50, contrast + 5))}
                  className="w-10 h-10 rounded-xl bg-[#F5F7FA] hover:bg-[#EEEEEE] active:scale-95 text-[#444444] flex items-center justify-center shrink-0 touch-manipulation cursor-pointer border border-[#E5E7EB]"
                  title="增加对比度 5"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="flex justify-between items-center text-[10px] text-[#999999] pt-0.5 font-mono">
                <span>-50 柔和低反差</span>
                <button
                  type="button"
                  onClick={() => updateSetting('contrast', 0)}
                  className="px-2.5 py-1 rounded-full bg-[#F5F7FA] hover:bg-[#EEEEEE] active:scale-95 text-[#666666] font-medium transition-all cursor-pointer touch-manipulation"
                  title="点击恢复原片默认对比度"
                >
                  0 (恢复原片)
                </button>
                <span>+50 鲜明高反差</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. 肤质与面部轮廓微调专区 (Skin & Face Morphing) */}
      <div className="p-4 rounded-[20px] bg-[#FFFFFF] border border-[#EEEEEE] shadow-[0_4px_12px_rgba(42,36,96,0.04)] space-y-4">
        <div className="text-[14px] font-bold text-[#2A2460] flex items-center space-x-1.5">
          <Wand2 className="w-4 h-4 text-[#7B68EE]" />
          <span>肤质修饰与微调塑形</span>
        </div>

        {/* 2.1 磨皮 (Smoothing) */}
        <div>
          <div className="flex items-center justify-between text-[13px] mb-1.5">
            <div className="flex items-center space-x-2 font-bold text-[#2A2460]">
              <span className="text-[12px] text-[#7B68EE]">●</span>
              <span>智能磨皮</span>
            </div>
            <span className="font-mono text-[12px] font-semibold text-[#7B68EE] px-2 py-0.5 rounded-[6px] bg-[#7B68EE]/10">
              {beauty.smoothing}
            </span>
          </div>
          <p className="text-[11px] text-[#888888] mb-2">
            平滑肌肤粗糙与细小瑕疵，双边滤波保留毛孔纹理
          </p>
          <div className="py-1 flex items-center">
            <input
              id="beauty-smoothing-slider"
              type="range"
              min="0"
              max="100"
              value={beauty.smoothing}
              onChange={e => updateSetting('smoothing', Number(e.target.value))}
              className="w-full h-3 bg-[#EAEAEA] rounded-full appearance-none cursor-pointer accent-[#7B68EE] touch-pan-x"
            />
          </div>
        </div>

        <div className="border-t border-[#EEEEEE]" />

        {/* 2.2 美白 (Whitening) */}
        <div>
          <div className="flex items-center justify-between text-[13px] mb-1.5">
            <div className="flex items-center space-x-2 font-bold text-[#2A2460]">
              <span className="text-[12px] text-[#FFB347]">●</span>
              <span>肤色透亮美白</span>
            </div>
            <span className="font-mono text-[12px] font-semibold text-[#FFB347] px-2 py-0.5 rounded-[6px] bg-[#FFB347]/10">
              {beauty.whitening}
            </span>
          </div>
          <p className="text-[11px] text-[#888888] mb-2">
            校准暗沉发黄，自然提升肤色通透感，避免假白过曝
          </p>
          <div className="py-1 flex items-center">
            <input
              id="beauty-whitening-slider"
              type="range"
              min="0"
              max="100"
              value={beauty.whitening}
              onChange={e => updateSetting('whitening', Number(e.target.value))}
              className="w-full h-3 bg-[#EAEAEA] rounded-full appearance-none cursor-pointer accent-[#FFB347] touch-pan-x"
            />
          </div>
        </div>

        <div className="border-t border-[#EEEEEE]" />

        {/* 2.3 瘦脸 (Face Slimming) */}
        <div>
          <div className="flex items-center justify-between text-[13px] mb-1.5">
            <div className="flex items-center space-x-2 font-bold text-[#2A2460]">
              <Smile className="w-4 h-4 text-[#5AC8C3]" />
              <span>微调瘦脸</span>
            </div>
            <span className="font-mono text-[12px] font-semibold text-[#5AC8C3] px-2 py-0.5 rounded-[6px] bg-[#5AC8C3]/10">
              {beauty.slimming}
            </span>
          </div>
          <p className="text-[11px] text-[#888888] mb-2">
            轻微收敛下颌曲线，证件照建议保持真实轮廓（推荐 0-25）
          </p>
          <div className="py-1 flex items-center">
            <input
              id="beauty-slimming-slider"
              type="range"
              min="0"
              max="100"
              value={beauty.slimming}
              onChange={e => updateSetting('slimming', Number(e.target.value))}
              className="w-full h-3 bg-[#EAEAEA] rounded-full appearance-none cursor-pointer accent-[#5AC8C3] touch-pan-x"
            />
          </div>
        </div>

        <div className="border-t border-[#EEEEEE]" />

        {/* 2.4 大眼 (Big Eyes) */}
        <div>
          <div className="flex items-center justify-between text-[13px] mb-1.5">
            <div className="flex items-center space-x-2 font-bold text-[#2A2460]">
              <Eye className="w-4 h-4 text-[#5B8BD6]" />
              <span>自然大眼</span>
            </div>
            <span className="font-mono text-[12px] font-semibold text-[#5B8BD6] px-2 py-0.5 rounded-[6px] bg-[#5B8BD6]/10">
              {beauty.bigEyes}
            </span>
          </div>
          <p className="text-[11px] text-[#888888] mb-2">
            轻微放大眼部瞳孔，增强神采，建议适度调节
          </p>
          <div className="py-1 flex items-center">
            <input
              id="beauty-bigeyes-slider"
              type="range"
              min="0"
              max="100"
              value={beauty.bigEyes}
              onChange={e => updateSetting('bigEyes', Number(e.target.value))}
              className="w-full h-3 bg-[#EAEAEA] rounded-full appearance-none cursor-pointer accent-[#5B8BD6] touch-pan-x"
            />
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center space-x-3 pt-2">
        <button
          type="button"
          onClick={onPrev}
          className="flex-1 inline-flex items-center justify-center space-x-1 py-3 px-4 rounded-[20px] border border-[#EEEEEE] bg-[#FFFFFF] hover:bg-[#F5F7FA] text-[#666666] text-[14px] font-medium min-h-[48px] transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>上一步：照片上传</span>
        </button>

        <button
          type="button"
          id="beauty-next-btn"
          onClick={onNext}
          className="flex-1 inline-flex items-center justify-center space-x-1 py-3 px-4 rounded-[20px] bg-gradient-to-r from-[#A56EFF] to-[#7B68EE] hover:from-[#7B68EE] hover:to-[#6A5ACD] text-white text-[14px] font-bold shadow-[0_4px_12px_rgba(123,104,238,0.25)] min-h-[48px] transition-all active:scale-98 cursor-pointer"
        >
          <span>下一步：一键换底</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
