import React, { useState } from 'react';
import { PhotoSpec, CompositionSettings } from '../../types';
import { PHOTO_SPECS } from '../../utils/photoSpecs';
import {
  Download,
  Printer,
  Sliders,
  Crop,
  Layers,
  ArrowLeft,
  CheckCircle,
  FileCheck,
  RotateCcw,
  Sparkles,
  Scissors
} from 'lucide-react';

interface StepGenerateProps {
  selectedSpec: PhotoSpec;
  onSelectSpec: (spec: PhotoSpec) => void;
  onAutoMatchSpec?: () => void;
  composition: CompositionSettings;
  onChangeComposition: (composition: CompositionSettings) => void;
  onDownloadSingle: (format: 'image/jpeg' | 'image/png') => void;
  onDownloadPrintSheet: () => void;
  onPrev: () => void;
  showPrintCropGuide?: boolean;
  onTogglePrintCropGuide?: () => void;
  printPreviewMode?: 'single' | 'sheet';
  onChangePrintPreviewMode?: (mode: 'single' | 'sheet') => void;
}

export const StepGenerate: React.FC<StepGenerateProps> = ({
  selectedSpec,
  onSelectSpec,
  onAutoMatchSpec,
  composition,
  onChangeComposition,
  onDownloadSingle,
  onDownloadPrintSheet,
  onPrev,
  showPrintCropGuide = true,
  onTogglePrintCropGuide,
  printPreviewMode = 'single',
  onChangePrintPreviewMode,
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'common' | 'document' | 'visa' | 'custom'>('all');
  const [customW, setCustomW] = useState('295');
  const [customH, setCustomH] = useState('413');
  const [customUnit, setCustomUnit] = useState<'px' | 'mm'>('px');
  const [customDpi, setCustomDpi] = useState(300);
  const [downloadFormat, setDownloadFormat] = useState<'image/jpeg' | 'image/png'>('image/jpeg');

  const filteredSpecs =
    activeCategory === 'all'
      ? PHOTO_SPECS
      : PHOTO_SPECS.filter(s => s.category === activeCategory);

  const handleApplyCustomSpec = () => {
    let wPx = parseInt(customW) || 295;
    let hPx = parseInt(customH) || 413;
    let wMm = Math.round((wPx / customDpi) * 25.4);
    let hMm = Math.round((hPx / customDpi) * 25.4);

    if (customUnit === 'mm') {
      wMm = parseInt(customW) || 25;
      hMm = parseInt(customH) || 35;
      wPx = Math.round((wMm / 25.4) * customDpi);
      hPx = Math.round((hMm / 25.4) * customDpi);
    }

    const customSpec: PhotoSpec = {
      id: 'custom-' + Date.now(),
      name: `自定义尺寸 (${wMm}×${hMm}mm)`,
      category: 'custom',
      widthPx: wPx,
      heightPx: hPx,
      widthMm: wMm,
      heightMm: hMm,
      dpi: customDpi,
      description: `${wMm}mm × ${hMm}mm (${wPx}×${hPx}px)`,
      usage: '用户自定义规格',
      printPerSheet6Inch: 4,
    };
    onSelectSpec(customSpec);
  };

  const updateComp = (key: keyof CompositionSettings, val: number) => {
    onChangeComposition({
      ...composition,
      [key]: val,
    });
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-[#2A2460]">规格选择与高清下载</h2>
          <p className="text-[13px] text-[#666666] mt-1">
            符合国家证件照标准比例，支持单张高清与 6 寸排版打印相纸
          </p>
        </div>
        {onAutoMatchSpec && (
          <button
            type="button"
            id="step-generate-auto-match-btn"
            onClick={onAutoMatchSpec}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-[10px] bg-gradient-to-r from-[#A56EFF]/15 to-[#7B68EE]/15 hover:from-[#A56EFF]/25 hover:to-[#7B68EE]/25 border border-[#7B68EE]/30 text-[#7B68EE] text-[12px] font-bold shadow-xs transition-all active:scale-95 shrink-0 ml-2"
            title="根据当前照片原始比例与人脸位置，自动智能匹配最适合的国家标准规格及构图比例"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#7B68EE]" />
            <span>智能自动匹配</span>
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex space-x-1 p-1 bg-[#FFFFFF] border border-[#EEEEEE] rounded-[12px] shadow-[0_2px_6px_rgba(42,36,96,0.02)]">
        {[
          { key: 'all', label: '全部' },
          { key: 'common', label: '常用尺寸' },
          { key: 'document', label: '证件考证' },
          { key: 'visa', label: '出境签证' },
          { key: 'custom', label: '自定义' },
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveCategory(tab.key as any)}
            className={`flex-1 py-1.5 px-2 rounded-[8px] text-[12px] font-medium transition-all ${
              activeCategory === tab.key
                ? 'bg-[#7B68EE] text-white font-semibold shadow-xs'
                : 'text-[#666666] hover:bg-[#F5F7FA]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Specifications Grid */}
      {activeCategory !== 'custom' ? (
        <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
          {filteredSpecs.map(spec => {
            const isSelected = selectedSpec.id === spec.id;
            return (
              <button
                key={spec.id}
                id={`spec-btn-${spec.id}`}
                type="button"
                onClick={() => onSelectSpec(spec)}
                className={`text-left p-3 rounded-[14px] border transition-all duration-150 min-h-[70px] flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#7B68EE] bg-[#7B68EE]/5 ring-2 ring-[#7B68EE]/20 shadow-xs'
                    : 'border-[#EEEEEE] bg-white hover:border-[#cccccc]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-[13px] font-bold text-[#2A2460] leading-snug">
                    {spec.name}
                  </span>
                  {isSelected && (
                    <CheckCircle className="w-4 h-4 text-[#7B68EE] flex-shrink-0 ml-1" />
                  )}
                </div>
                <div className="text-[11px] text-[#888888] font-mono mt-1">
                  {spec.description}
                </div>
                <div className="text-[10px] text-[#666666] truncate mt-0.5">
                  {spec.usage}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* Custom dimensions input */
        <div className="p-4 rounded-[16px] bg-[#FFFFFF] border border-[#EEEEEE] space-y-3">
          <div className="flex items-center justify-between text-[13px] font-bold text-[#2A2460]">
            <span>自定义尺寸规格</span>
            <div className="flex space-x-1 border border-[#EEEEEE] rounded-[6px] p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setCustomUnit('px')}
                className={`px-2 py-0.5 rounded-[4px] ${
                  customUnit === 'px' ? 'bg-[#7B68EE] text-white font-medium' : 'text-[#666666]'
                }`}
              >
                像素 (px)
              </button>
              <button
                type="button"
                onClick={() => setCustomUnit('mm')}
                className={`px-2 py-0.5 rounded-[4px] ${
                  customUnit === 'mm' ? 'bg-[#7B68EE] text-white font-medium' : 'text-[#666666]'
                }`}
              >
                毫米 (mm)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-[#888888] block mb-1">
                宽 ({customUnit})
              </label>
              <input
                type="number"
                value={customW}
                onChange={e => setCustomW(e.target.value)}
                className="w-full h-9 px-2.5 rounded-[8px] border border-[#EEEEEE] text-[13px] text-[#2A2460] focus:border-[#7B68EE] outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-[#888888] block mb-1">
                高 ({customUnit})
              </label>
              <input
                type="number"
                value={customH}
                onChange={e => setCustomH(e.target.value)}
                className="w-full h-9 px-2.5 rounded-[8px] border border-[#EEEEEE] text-[13px] text-[#2A2460] focus:border-[#7B68EE] outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[12px] text-[#666666]">打印分辨率 (DPI):</span>
            <select
              value={customDpi}
              onChange={e => setCustomDpi(Number(e.target.value))}
              className="h-8 px-2 rounded-[6px] border border-[#EEEEEE] text-[12px] bg-white text-[#2A2460]"
            >
              <option value="300">300 DPI (高清标准)</option>
              <option value="350">350 DPI (身份证标准)</option>
              <option value="600">600 DPI (超高清档案)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleApplyCustomSpec}
            className="w-full py-2 rounded-[8px] bg-[#7B68EE] text-white text-[12px] font-bold hover:bg-[#6A5ACD] transition-all"
          >
            应用自定义尺寸
          </button>
        </div>
      )}

      {/* Composition Fine-Tuning (Zoom & Position offset) */}
      <div className="p-3.5 rounded-[16px] bg-[#FFFFFF] border border-[#EEEEEE] shadow-[0_2px_6px_rgba(42,36,96,0.02)] space-y-2.5">
        <div className="flex items-center justify-between text-[12px] font-bold text-[#2A2460]">
          <div className="flex items-center space-x-1.5">
            <Crop className="w-3.5 h-3.5 text-[#7B68EE]" />
            <span>人像构图与头顶留白微调</span>
          </div>
          <button
            type="button"
            onClick={() =>
              onChangeComposition({ scale: 1.0, offsetX: 0, offsetY: 0, rotation: 0 })
            }
            className="text-[11px] text-[#7B68EE] hover:underline flex items-center space-x-0.5"
          >
            <RotateCcw className="w-3 h-3" />
            <span>还原中心</span>
          </button>
        </div>

        {/* Scale */}
        <div className="flex items-center space-x-3 text-[11px]">
          <span className="w-16 text-[#666666]">人像缩放:</span>
          <input
            type="range"
            min="0.5"
            max="2.5"
            step="0.02"
            value={composition.scale}
            onChange={e => updateComp('scale', Number(e.target.value))}
            className="flex-1 h-1.5 bg-[#EEEEEE] rounded-lg appearance-none cursor-pointer"
          />
          <span className="w-10 text-right font-mono text-[#2A2460]">
            {Math.round(composition.scale * 100)}%
          </span>
        </div>

        {/* Vertical Offset */}
        <div className="flex items-center space-x-3 text-[11px]">
          <span className="w-16 text-[#666666]">上下位置:</span>
          <input
            type="range"
            min="-100"
            max="100"
            step="1"
            value={composition.offsetY}
            onChange={e => updateComp('offsetY', Number(e.target.value))}
            className="flex-1 h-1.5 bg-[#EEEEEE] rounded-lg appearance-none cursor-pointer"
          />
          <span className="w-10 text-right font-mono text-[#2A2460]">
            {composition.offsetY > 0 ? `+${composition.offsetY}` : composition.offsetY}px
          </span>
        </div>

        {/* Rotation / Tilt */}
        <div className="flex items-center space-x-3 text-[11px]">
          <span className="w-16 text-[#666666]">水平旋转:</span>
          <input
            type="range"
            min="-15"
            max="15"
            step="0.2"
            value={composition.rotation || 0}
            onChange={e => updateComp('rotation', Number(Number(e.target.value).toFixed(1)))}
            className="flex-1 h-1.5 bg-[#EEEEEE] rounded-lg appearance-none cursor-pointer"
          />
          <span className="w-10 text-right font-mono text-[#2A2460]">
            {composition.rotation > 0 ? `+${composition.rotation}` : composition.rotation || 0}°
          </span>
        </div>
      </div>

      {/* Print Layout Crop Dashed Box Toggle Switch (打印排版裁剪虚线参考框切换开关) */}
      <div className="p-3.5 rounded-[16px] bg-[#FFFFFF] border border-[#EEEEEE] shadow-[0_2px_6px_rgba(42,36,96,0.02)] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div
              className={`w-8 h-8 rounded-[10px] flex items-center justify-center transition-colors ${
                showPrintCropGuide
                  ? 'bg-[#FFB347]/20 text-[#D97706]'
                  : 'bg-[#F5F7FA] text-[#888888]'
              }`}
            >
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[13px] font-bold text-[#2A2460] flex items-center space-x-1.5">
                <span>打印排版裁剪虚线参考框</span>
                {showPrintCropGuide && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#FFB347]/15 text-[#D97706] font-semibold">
                    已显示
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#666666] mt-0.5">
                在左侧预览窗口即时显示裁剪虚线、出血安全留白与四角定位剪刀标
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          {onTogglePrintCropGuide && (
            <button
              type="button"
              role="switch"
              id="toggle-print-crop-guide-switch"
              aria-checked={showPrintCropGuide}
              onClick={onTogglePrintCropGuide}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#7B68EE]/40 ${
                showPrintCropGuide ? 'bg-[#FFB347]' : 'bg-[#E2E8F0]'
              }`}
              title={showPrintCropGuide ? '点击在预览窗口隐藏裁剪虚线参考框' : '点击在预览窗口即时显示裁剪虚线参考框'}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  showPrintCropGuide ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          )}
        </div>

        {/* View mode switcher when active */}
        {showPrintCropGuide && onChangePrintPreviewMode && (
          <div className="pt-2 border-t border-[#F0F0F0] flex items-center justify-between text-[11px]">
            <span className="text-[#666666]">预览排版视图:</span>
            <div className="flex space-x-1 p-0.5 bg-[#F5F7FA] rounded-[8px] border border-[#EEEEEE]">
              <button
                type="button"
                id="preview-mode-single-btn"
                onClick={() => onChangePrintPreviewMode('single')}
                className={`px-2 py-1 rounded-[6px] font-medium transition-all ${
                  printPreviewMode === 'single'
                    ? 'bg-[#FFFFFF] text-[#2A2460] font-bold shadow-xs'
                    : 'text-[#666666] hover:text-[#2A2460]'
                }`}
              >
                单张裁剪框 ({selectedSpec.widthMm}×{selectedSpec.heightMm}mm)
              </button>
              <button
                type="button"
                id="preview-mode-sheet-btn"
                onClick={() => onChangePrintPreviewMode('sheet')}
                className={`px-2 py-1 rounded-[6px] font-medium transition-all ${
                  printPreviewMode === 'sheet'
                    ? 'bg-[#FFFFFF] text-[#7B68EE] font-bold shadow-xs'
                    : 'text-[#666666] hover:text-[#7B68EE]'
                }`}
              >
                6 寸排版整页 ({selectedSpec.printPerSheet6Inch || 4}张)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Download Format selection */}
      <div className="flex items-center justify-between px-1 text-[12px]">
        <span className="text-[#666666]">导出图片格式:</span>
        <div className="flex space-x-2">
          <label className="flex items-center space-x-1 cursor-pointer">
            <input
              type="radio"
              name="format"
              value="image/jpeg"
              checked={downloadFormat === 'image/jpeg'}
              onChange={() => setDownloadFormat('image/jpeg')}
              className="accent-[#7B68EE]"
            />
            <span className="text-[#2A2460] font-medium">JPG (标准300DPI)</span>
          </label>
          <label className="flex items-center space-x-1 cursor-pointer">
            <input
              type="radio"
              name="format"
              value="image/png"
              checked={downloadFormat === 'image/png'}
              onChange={() => setDownloadFormat('image/png')}
              className="accent-[#7B68EE]"
            />
            <span className="text-[#2A2460] font-medium">PNG (无损原画)</span>
          </label>
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div className="space-y-2.5 pt-1">
        {/* 1. Download Single High-Def Photo */}
        <button
          type="button"
          id="download-single-btn"
          onClick={() => onDownloadSingle(downloadFormat)}
          className="w-full flex items-center justify-center space-x-2 py-3.5 px-6 rounded-[20px] bg-gradient-to-r from-[#FFB347] to-[#F5A623] hover:from-[#F5A623] hover:to-[#FF9800] text-white text-[15px] font-bold shadow-[0_4px_12px_rgba(255,179,71,0.35)] transition-all active:scale-98 min-h-[48px]"
        >
          <Download className="w-5 h-5" />
          <span>下载单张高清证件照 ({selectedSpec.name})</span>
        </button>

        {/* 2. Download 6-Inch Printable Sheet */}
        <button
          type="button"
          id="download-print-sheet-btn"
          onClick={onDownloadPrintSheet}
          className="w-full flex items-center justify-center space-x-2 py-3 px-6 rounded-[20px] bg-gradient-to-r from-[#A56EFF] to-[#7B68EE] hover:from-[#7B68EE] hover:to-[#6A5ACD] text-white text-[14px] font-bold shadow-[0_4px_12px_rgba(123,104,238,0.25)] transition-all active:scale-98 min-h-[44px]"
        >
          <Printer className="w-4 h-4" />
          <span>下载 6 寸相纸排版打印图 (带裁剪辅助线)</span>
        </button>
      </div>

      {/* Prev button */}
      <div className="pt-1">
        <button
          type="button"
          onClick={onPrev}
          className="w-full inline-flex items-center justify-center space-x-1 py-2.5 px-4 rounded-[12px] border border-[#EEEEEE] bg-[#FFFFFF] hover:bg-[#F5F7FA] text-[#666666] text-[13px] font-medium transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>返回上一步：调整底色</span>
        </button>
      </div>
    </div>
  );
};
