import React, { useState, useEffect } from 'react';
import { BackgroundSettings, MattingMode, EdgeRefineMode, MattingEngineType } from '../../types';
import { PRESET_COLORS, PresetColor } from '../../utils/photoSpecs';
import { subscribeAIModelStatus, AIModelStatus } from '../../utils/aiMatting';
import {
  Palette,
  Pipette,
  Check,
  Sliders,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Eraser,
  Paintbrush,
  Eye,
  RotateCcw,
  Layers,
  Sparkle,
  Cpu,
  Zap,
  ShieldCheck,
  Wand2,
} from 'lucide-react';

interface StepBackgroundProps {
  bgSettings: BackgroundSettings;
  onChangeBg: (settings: BackgroundSettings) => void;
  activeBrushTool?: 'none' | 'erase' | 'restore' | 'eyedropper';
  onChangeBrushTool?: (tool: 'none' | 'erase' | 'restore' | 'eyedropper') => void;
  brushSize?: number;
  onChangeBrushSize?: (size: number) => void;
  onNext: () => void;
  onPrev: () => void;
}

export const StepBackground: React.FC<StepBackgroundProps> = ({
  bgSettings,
  onChangeBg,
  activeBrushTool = 'none',
  onChangeBrushTool,
  brushSize = 28,
  onChangeBrushSize,
  onNext,
  onPrev,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customHex, setCustomHex] = useState(bgSettings.color || '#FFFFFF');
  const [aiStatus, setAiStatus] = useState<AIModelStatus>('uninitialized');
  const [aiBackend, setAiBackend] = useState<'webgpu' | 'wasm' | 'none'>('none');

  useEffect(() => {
    return subscribeAIModelStatus((status, backend) => {
      setAiStatus(status);
      setAiBackend(backend);
    });
  }, []);

  const handleSelectPreset = (preset: PresetColor) => {
    if (preset.type === 'gradient') {
      onChangeBg({
        ...bgSettings,
        type: 'gradient',
        color: preset.value,
        gradientStart: preset.gradientStart,
        gradientEnd: preset.gradientEnd,
      });
    } else {
      setCustomHex(preset.value);
      onChangeBg({
        ...bgSettings,
        type: 'solid',
        color: preset.value,
        gradientStart: undefined,
        gradientEnd: undefined,
      });
    }
  };

  const handleCustomColorChange = (hex: string) => {
    setCustomHex(hex);
    onChangeBg({
      ...bgSettings,
      type: 'solid',
      color: hex,
      gradientStart: undefined,
      gradientEnd: undefined,
    });
  };

  const handleSelectMattingMode = (mode: MattingMode) => {
    onChangeBg({
      ...bgSettings,
      mattingMode: mode,
    });
  };

  const handleSelectEdgeRefine = (refine: EdgeRefineMode) => {
    onChangeBg({
      ...bgSettings,
      edgeRefine: refine,
    });
  };

  const handleSelectEngine = (engine: MattingEngineType) => {
    onChangeBg({
      ...bgSettings,
      engine,
    });
  };

  const handleUndoLastStroke = () => {
    if (!bgSettings.brushStrokes || bgSettings.brushStrokes.length === 0) return;
    const nextStrokes = [...bgSettings.brushStrokes];
    nextStrokes.pop();
    onChangeBg({
      ...bgSettings,
      brushStrokes: nextStrokes,
    });
  };

  const handleClearAllStrokes = () => {
    onChangeBg({
      ...bgSettings,
      brushStrokes: [],
      sampledBgPoints: [],
    });
  };

  const strokeCount = (bgSettings.brushStrokes?.length || 0) + (bgSettings.sampledBgPoints?.length || 0);

  const currentEngine = bgSettings.engine || 'ai_modnet';

  return (
    <div className="space-y-4">
      {/* Step Header */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-bold text-[#2A2460]">一键智能人像抠图与换底</h2>
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-[#5AC8C3]/10 text-[#208B86] text-[11px] font-semibold">
            <Sparkles className="w-3 h-3" />
            <span>发丝级 Alpha Matting</span>
          </span>
        </div>
        <p className="text-[13px] text-[#666666] mt-1">
          深度融合 MODNet 神经网络与导向滤波技术，彻底解决发丝边缘、白衣穿透与杂色光晕
        </p>
      </div>

      {/* Matting Engine Architecture Selection (算法选型方案) */}
      <div className="p-3.5 rounded-[18px] bg-[#FFFFFF] border border-[#EEEEEE] shadow-[0_4px_12px_rgba(42,36,96,0.04)] space-y-2.5">
        <div className="flex items-center justify-between text-[13px] font-bold text-[#2A2460]">
          <div className="flex items-center space-x-1.5">
            <Cpu className="w-4 h-4 text-[#7B68EE]" />
            <span>核心抠图计算引擎</span>
          </div>
          <div className="flex items-center space-x-1 text-[11px]">
            {currentEngine === 'ai_modnet' && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center space-x-1 ${
                aiBackend === 'webgpu'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : aiStatus === 'loading'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                <span>
                  {aiBackend === 'webgpu'
                    ? 'WebGPU 硬件加速'
                    : aiStatus === 'loading'
                    ? '模型载入中'
                    : 'WASM+SIMD 高性能'}
                </span>
              </span>
            )}
            {currentEngine === 'bayesian_dual' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                🚀 毫秒即时纯算
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            id="engine-ai-modnet"
            onClick={() => handleSelectEngine('ai_modnet')}
            className={`p-3 rounded-[14px] text-left transition-all border relative ${
              currentEngine === 'ai_modnet'
                ? 'border-[#7B68EE] bg-gradient-to-br from-[#7B68EE]/10 to-[#5AC8C3]/10 text-[#2A2460] shadow-sm ring-2 ring-[#7B68EE]/20'
                : 'border-[#EEEEEE] bg-[#F9FAFB] hover:border-[#D1D5DB] text-[#555555]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold flex items-center space-x-1">
                <span>🤖 MODNet 神经网络</span>
              </span>
              {currentEngine === 'ai_modnet' && <Check className="w-4 h-4 text-[#7B68EE]" />}
            </div>
            <div className="text-[11px] text-[#666666] mt-1 leading-snug">
              免 Trimap 发丝级 Alpha 通道，真实保留每一缕碎发与织物纹理
            </div>
          </button>

          <button
            type="button"
            id="engine-bayesian-dual"
            onClick={() => handleSelectEngine('bayesian_dual')}
            className={`p-3 rounded-[14px] text-left transition-all border relative ${
              currentEngine === 'bayesian_dual'
                ? 'border-[#7B68EE] bg-gradient-to-br from-[#7B68EE]/10 to-[#5AC8C3]/10 text-[#2A2460] shadow-sm ring-2 ring-[#7B68EE]/20'
                : 'border-[#EEEEEE] bg-[#F9FAFB] hover:border-[#D1D5DB] text-[#555555]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold flex items-center space-x-1">
                <span>⚡ 贝叶斯双模算法</span>
              </span>
              {currentEngine === 'bayesian_dual' && <Check className="w-4 h-4 text-[#7B68EE]" />}
            </div>
            <div className="text-[11px] text-[#666666] mt-1 leading-snug">
              空间-色彩混合数学算法，零等待秒级响应，人体几何强力保护
            </div>
          </button>
        </div>
      </div>

      {/* Algorithmic Scene Mode Presets */}
      <div className="p-3.5 rounded-[18px] bg-[#FFFFFF] border border-[#EEEEEE] shadow-[0_4px_12px_rgba(42,36,96,0.04)] space-y-2.5">
        <div className="flex items-center justify-between text-[13px] font-bold text-[#2A2460]">
          <div className="flex items-center space-x-1.5">
            <Sparkle className="w-4 h-4 text-[#7B68EE]" />
            <span>抠图场景算法模式</span>
          </div>
          <span className="text-[11px] text-[#888888] font-normal">根据原图环境智能调整</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            {
              id: 'standard' as MattingMode,
              title: '标准均衡',
              desc: '纯色墙/自然景深',
            },
            {
              id: 'complex' as MattingMode,
              title: '高难复杂',
              desc: '办公椅/窗户杂色',
            },
            {
              id: 'studio' as MattingMode,
              title: '白衣/防穿透',
              desc: '浅色衣服/精细发丝',
            },
          ].map(m => {
            const isActive = (bgSettings.mattingMode || 'standard') === m.id;
            return (
              <button
                key={m.id}
                type="button"
                id={`matting-mode-${m.id}`}
                onClick={() => handleSelectMattingMode(m.id)}
                className={`p-2.5 rounded-[14px] text-left transition-all border ${
                  isActive
                    ? 'border-[#7B68EE] bg-gradient-to-br from-[#7B68EE]/10 to-[#5AC8C3]/10 text-[#2A2460] shadow-sm ring-1 ring-[#7B68EE]/30'
                    : 'border-[#EEEEEE] bg-[#F9FAFB] hover:border-[#D1D5DB] text-[#555555]'
                }`}
              >
                <div className="text-[12px] font-bold flex items-center justify-between">
                  <span>{m.title}</span>
                  {isActive && <Check className="w-3.5 h-3.5 text-[#7B68EE]" />}
                </div>
                <div className="text-[10px] text-[#888888] mt-0.5 leading-tight">{m.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preset Color Swatches */}
      <div className="p-4 rounded-[20px] bg-[#FFFFFF] border border-[#EEEEEE] shadow-[0_4px_12px_rgba(42,36,96,0.04)] space-y-3">
        <div className="flex items-center justify-between text-[13px] font-bold text-[#2A2460]">
          <div className="flex items-center space-x-1.5">
            <Palette className="w-4 h-4 text-[#7B68EE]" />
            <span>证件照规范底色</span>
          </div>
          <span className="text-[11px] text-[#888888] font-normal">点击秒级切换</span>
        </div>

        {/* Solid & Gradient Preset Grid */}
        <div className="grid grid-cols-3 gap-2.5">
          {PRESET_COLORS.map(preset => {
            const isSelected =
              preset.type === 'gradient'
                ? bgSettings.type === 'gradient' &&
                  bgSettings.gradientStart === preset.gradientStart
                : bgSettings.type === 'solid' &&
                  bgSettings.color.toUpperCase() === preset.value.toUpperCase();

            return (
              <button
                key={preset.id}
                id={`bg-preset-${preset.id}`}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`relative flex items-center space-x-2.5 p-2 rounded-[12px] border transition-all duration-150 min-h-[44px] ${
                  isSelected
                    ? 'border-[#7B68EE] ring-2 ring-[#7B68EE]/20 shadow-sm bg-[#F5F7FA]'
                    : 'border-[#EEEEEE] hover:border-[#cccccc] bg-white'
                }`}
              >
                <div
                  className="w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0 shadow-inner"
                  style={{
                    background: preset.value,
                    border: preset.border ? `1px solid ${preset.border}` : 'none',
                  }}
                >
                  {isSelected && (
                    <Check
                      className="w-4 h-4"
                      style={{ color: preset.textColor }}
                    />
                  )}
                </div>

                <div className="text-left overflow-hidden">
                  <div className="text-[12px] font-medium text-[#2A2460] truncate">
                    {preset.label}
                  </div>
                  <div className="text-[10px] text-[#888888] truncate font-mono">
                    {preset.type === 'gradient' ? '渐变' : preset.value}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom Color Picker & HEX Input */}
        <div className="pt-3 border-t border-[#EEEEEE] flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <label
              htmlFor="custom-color-picker"
              className="relative w-9 h-9 rounded-[8px] border border-[#EEEEEE] overflow-hidden cursor-pointer shadow-inner flex items-center justify-center group flex-shrink-0"
              style={{ backgroundColor: bgSettings.color }}
            >
              <input
                id="custom-color-picker"
                type="color"
                value={customHex.startsWith('#') ? customHex : '#FFFFFF'}
                onChange={e => handleCustomColorChange(e.target.value)}
                className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
              />
              <Pipette className="w-4 h-4 text-gray-500 opacity-60 group-hover:opacity-100" />
            </label>

            <div>
              <div className="text-[12px] font-semibold text-[#2A2460]">自定义底色</div>
              <div className="text-[10px] text-[#888888]">取色器或输入HEX代码</div>
            </div>
          </div>

          <div className="flex items-center space-x-1 border border-[#EEEEEE] rounded-[8px] px-2 py-1 bg-[#F5F7FA]">
            <span className="text-[11px] text-[#888888] font-mono">#</span>
            <input
              type="text"
              maxLength={6}
              value={customHex.replace('#', '')}
              onChange={e => {
                const val = '#' + e.target.value;
                setCustomHex(val);
                if (/^#[0-9A-F]{6}$/i.test(val)) {
                  handleCustomColorChange(val);
                }
              }}
              className="w-16 bg-transparent text-[12px] font-mono text-[#2A2460] focus:outline-none uppercase"
              placeholder="FFFFFF"
            />
          </div>
        </div>
      </div>

      {/* Interactive Touch-up Brush & Tools */}
      <div className="p-4 rounded-[20px] bg-[#FFFFFF] border border-[#EEEEEE] shadow-[0_4px_12px_rgba(42,36,96,0.04)] space-y-3">
        <div className="flex items-center justify-between text-[13px] font-bold text-[#2A2460]">
          <div className="flex items-center space-x-1.5">
            <Paintbrush className="w-4 h-4 text-[#A56EFF]" />
            <span>交互涂抹精修</span>
          </div>
          {strokeCount > 0 && (
            <span className="text-[11px] text-[#7B68EE] font-medium">已记录 {strokeCount} 处精修</span>
          )}
        </div>

        {/* Brush Tools Selector */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { id: 'none' as const, label: '全自动抠图', icon: Sparkles },
            { id: 'erase' as const, label: '橡皮擦除', icon: Eraser },
            { id: 'restore' as const, label: '恢复主体', icon: Paintbrush },
            { id: 'eyedropper' as const, label: '背景吸管', icon: Pipette },
          ].map(tool => {
            const isActive = activeBrushTool === tool.id;
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                type="button"
                id={`brush-tool-${tool.id}`}
                onClick={() => onChangeBrushTool && onChangeBrushTool(tool.id)}
                className={`py-2 px-1.5 rounded-[12px] flex flex-col items-center justify-center space-y-1 transition-all border ${
                  isActive
                    ? 'border-[#7B68EE] bg-[#7B68EE] text-white shadow-sm ring-2 ring-[#7B68EE]/20'
                    : 'border-[#EEEEEE] bg-[#F9FAFB] hover:border-[#D1D5DB] text-[#444444]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[11px] font-medium whitespace-nowrap">{tool.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tip for Active Tool */}
        {activeBrushTool !== 'none' && (
          <div className="p-2.5 rounded-[12px] bg-[#F5F7FA] border border-[#EEEEEE] space-y-2">
            <div className="text-[11px] text-[#666666]">
              {activeBrushTool === 'erase' && '💡 在预览画面涂抹拖动，即可精准擦除顽固背景杂质或死角'}
              {activeBrushTool === 'restore' && '💡 在预览画面涂抹拖动，即可找回被误扣掉的衣物边缘或发丝'}
              {activeBrushTool === 'eyedropper' && '💡 点击预览画面中的残留背景杂色，即可直接将其列入消除色库'}
            </div>

            {(activeBrushTool === 'erase' || activeBrushTool === 'restore') && (
              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-[11px] text-[#666666] flex-shrink-0">笔刷粗细</span>
                <input
                  type="range"
                  min="10"
                  max="60"
                  value={brushSize}
                  onChange={e => onChangeBrushSize && onChangeBrushSize(Number(e.target.value))}
                  className="w-full h-1.5 bg-[#DDDDDD] rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-[11px] font-mono text-[#7B68EE] font-semibold w-8 text-right">
                  {brushSize}px
                </span>
              </div>
            )}

            {strokeCount > 0 && (
              <div className="flex items-center justify-end space-x-2 pt-1 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={handleUndoLastStroke}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] text-[#555555] bg-white border border-[#D1D5DB] rounded-[8px] hover:bg-gray-50"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>撤销上一笔</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearAllStrokes}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] text-[#E86C5D] bg-white border border-[#E86C5D]/30 rounded-[8px] hover:bg-red-50"
                >
                  <span>清空手动涂抹</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Advanced Matting Fine-Tuning Drawer */}
      <div className="p-4 rounded-[20px] bg-[#FFFFFF] border border-[#EEEEEE] shadow-[0_4px_12px_rgba(42,36,96,0.04)]">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between text-[13px] font-bold text-[#2A2460]"
        >
          <div className="flex items-center space-x-1.5">
            <Sliders className="w-4 h-4 text-[#5AC8C3]" />
            <span>发丝导向滤波与防溢色微调</span>
          </div>
          <span className="text-[11px] text-[#7B68EE]">
            {showAdvanced ? '收起设置' : '展开高阶调优'}
          </span>
        </button>

        {showAdvanced && (
          <div className="mt-3 pt-3 border-t border-[#EEEEEE] space-y-3.5">
            {/* Guided Filter Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[12px] font-semibold text-[#2A2460] flex items-center space-x-1">
                  <Wand2 className="w-3.5 h-3.5 text-[#7B68EE]" />
                  <span>原图导向滤波 (Guided Filter)</span>
                </div>
                <div className="text-[10px] text-[#888888]">
                  以原生超清相机照片为引导图，将单根高频发丝像素精准对齐到透明通道
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  onChangeBg({ ...bgSettings, guidedFilter: bgSettings.guidedFilter === false })
                }
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  bgSettings.guidedFilter !== false ? 'bg-[#7B68EE]' : 'bg-[#E2E8F0]'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    bgSettings.guidedFilter !== false ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Guided Filter Radius */}
            {bgSettings.guidedFilter !== false && (
              <div className="pl-3 border-l-2 border-[#7B68EE]/30 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-[#555555]">
                  <span>导向滤波窗口半径</span>
                  <span className="font-mono text-[#7B68EE] font-semibold">
                    {bgSettings.guidedRadius || 3}px
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={bgSettings.guidedRadius || 3}
                  onChange={e =>
                    onChangeBg({ ...bgSettings, guidedRadius: Number(e.target.value) })
                  }
                  className="w-full h-1.5 bg-[#EEEEEE] rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}

            {/* Color Decontamination Toggle */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <div className="text-[12px] font-semibold text-[#2A2460] flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#208B86]" />
                  <span>发丝防溢色净化 (Color Decontamination)</span>
                </div>
                <div className="text-[10px] text-[#888888]">
                  消除原背景杂光在半透明发丝与衣服轮廓产生的反光光晕与脏边
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  onChangeBg({
                    ...bgSettings,
                    decontamination: bgSettings.decontamination === false,
                  })
                }
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  bgSettings.decontamination !== false ? 'bg-[#208B86]' : 'bg-[#E2E8F0]'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    bgSettings.decontamination !== false ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Edge Refine Mode */}
            <div>
              <div className="text-[12px] font-semibold text-[#2A2460] mb-1.5 flex items-center space-x-1">
                <Layers className="w-3.5 h-3.5 text-[#7B68EE]" />
                <span>边缘轮廓质感</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'natural' as EdgeRefineMode, label: '自然发丝', desc: '微羽化' },
                  { id: 'smooth' as EdgeRefineMode, label: '柔滑圆润', desc: '双边平滑' },
                  { id: 'sharp' as EdgeRefineMode, label: '清晰硬边', desc: '适合西装' },
                ].map(item => {
                  const isActive = (bgSettings.edgeRefine || 'natural') === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectEdgeRefine(item.id)}
                      className={`p-2 rounded-[10px] text-center border text-[11px] transition-all ${
                        isActive
                          ? 'border-[#7B68EE] bg-[#7B68EE]/10 text-[#2A2460] font-bold'
                          : 'border-[#EEEEEE] bg-[#F9FAFB] text-[#666666]'
                      }`}
                    >
                      <div>{item.label}</div>
                      <div className="text-[9px] text-[#888888]">{item.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tolerance */}
            <div>
              <div className="flex items-center justify-between text-[12px] mb-1 text-[#2A2460]">
                <span>抠图敏感度 (Tolerance)</span>
                <span className="font-mono text-[#7B68EE] font-semibold">
                  {bgSettings.tolerance}%
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="90"
                value={bgSettings.tolerance}
                onChange={e =>
                  onChangeBg({ ...bgSettings, tolerance: Number(e.target.value) })
                }
                className="w-full h-1.5 bg-[#EEEEEE] rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-[10px] text-[#888888] mt-1">
                原图背景杂乱时可适当调高，细微发丝保留更多时可调低
              </p>
            </div>

            {/* Alpha Mask Quality Inspection Mode */}
            <div className="flex items-center justify-between pt-2 border-t border-[#EEEEEE]">
              <div>
                <div className="text-[12px] font-semibold text-[#2A2460] flex items-center space-x-1.5">
                  <Eye className="w-3.5 h-3.5 text-[#5AC8C3]" />
                  <span>黑白剪影蒙版质检视图</span>
                </div>
                <div className="text-[10px] text-[#888888]">
                  在预览窗口高对比度显示人物剪影，检验边缘透光、微发丝与空洞
                </div>
              </div>
              <button
                type="button"
                id="toggle-alpha-mask-btn"
                onClick={() =>
                  onChangeBg({
                    ...bgSettings,
                    showAlphaMaskOnly: !bgSettings.showAlphaMaskOnly,
                  })
                }
                className={`px-3 py-1 rounded-[10px] text-[11px] font-bold transition-all border ${
                  bgSettings.showAlphaMaskOnly
                    ? 'bg-[#2A2460] text-white border-[#2A2460]'
                    : 'bg-white text-[#555555] border-[#D1D5DB]'
                }`}
              >
                {bgSettings.showAlphaMaskOnly ? '查看彩色' : '查看蒙版'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center space-x-3 pt-2">
        <button
          type="button"
          onClick={onPrev}
          className="flex-1 inline-flex items-center justify-center space-x-1 py-3 px-4 rounded-[20px] border border-[#EEEEEE] bg-[#FFFFFF] hover:bg-[#F5F7FA] text-[#666666] text-[14px] font-medium min-h-[48px] transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>上一步：智能美颜</span>
        </button>

        <button
          type="button"
          id="bg-next-btn"
          onClick={onNext}
          className="flex-1 inline-flex items-center justify-center space-x-1 py-3 px-4 rounded-[20px] bg-gradient-to-r from-[#A56EFF] to-[#7B68EE] hover:from-[#7B68EE] hover:to-[#6A5ACD] text-white text-[14px] font-bold shadow-[0_4px_12px_rgba(123,104,238,0.25)] min-h-[48px] transition-all active:scale-98"
        >
          <span>下一步：规格与下载</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};


