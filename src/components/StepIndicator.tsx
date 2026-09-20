import React from 'react';
import { WorkflowStep } from '../types';
import { Upload, Wand2, Palette, Download, FastForward } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: WorkflowStep;
  onSelectStep: (step: WorkflowStep) => void;
  onQuickGenerateAll: () => void;
  isReady: boolean;
}

const STEPS: { key: WorkflowStep; label: string; desc: string; icon: React.ElementType }[] = [
  { key: 'upload', label: '1. 上传照片', desc: '人脸识别与检测', icon: Upload },
  { key: 'beauty', label: '2. 智能美颜', desc: '自然磨皮与美白', icon: Wand2 },
  { key: 'background', label: '3. 一键换底', desc: '智能抠图与底色', icon: Palette },
  { key: 'generate', label: '4. 规格与下载', desc: '标准裁剪排版', icon: Download },
];

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  onSelectStep,
  onQuickGenerateAll,
  isReady,
}) => {
  const currentIdx = STEPS.findIndex(s => s.key === currentStep);

  return (
    <div className="sticky bottom-0 z-30 w-full bg-[#FFFFFF]/98 backdrop-blur-md border-t border-[#EEEEEE] py-2 sm:py-3 px-4 sm:px-6 shadow-[0_-4px_16px_rgba(42,36,96,0.06)]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Step Buttons */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-3 w-full md:w-auto">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isActive = currentStep === step.key;
            const isCompleted = idx < currentIdx;

            return (
              <button
                key={step.key}
                id={`step-nav-${step.key}`}
                disabled={!isReady && idx > 0}
                onClick={() => onSelectStep(step.key)}
                className={`flex items-center space-x-2 py-2 px-2.5 sm:px-4 rounded-[12px] text-left transition-all duration-200 min-h-[44px] ${
                  isActive
                    ? 'bg-gradient-to-r from-[#A56EFF] to-[#7B68EE] text-white shadow-[0_4px_12px_rgba(123,104,238,0.25)] font-semibold scale-[1.02]'
                    : isCompleted
                    ? 'bg-[#f0faf0] text-[#2A2460] hover:bg-[#E3F9E9]'
                    : !isReady && idx > 0
                    ? 'opacity-40 cursor-not-allowed text-[#999999]'
                    : 'text-[#666666] hover:bg-[#F5F7FA] hover:text-[#2A2460]'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0 text-[12px] font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : isCompleted
                      ? 'bg-[#5AC8C3] text-white'
                      : 'bg-[#EEEEEE] text-[#666666]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="hidden sm:block leading-tight">
                  <div className="text-[13px] font-medium truncate">{step.label}</div>
                  <div
                    className={`text-[10px] truncate ${
                      isActive ? 'text-white/80' : 'text-[#888888]'
                    }`}
                  >
                    {step.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* 1-Click Fast Workflow Button */}
        {isReady && currentStep !== 'generate' && (
          <button
            id="quick-generate-btn"
            onClick={onQuickGenerateAll}
            className="w-full md:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 h-[44px] rounded-[20px] bg-gradient-to-r from-[#FFB347] to-[#F5A623] hover:from-[#F5A623] hover:to-[#FF9800] text-white text-[14px] font-bold shadow-[0_4px_12px_rgba(255,179,71,0.35)] active:scale-98 transition-all"
            title="自动运行推荐美颜、标准白底抠图并直接生成标准证件照"
          >
            <FastForward className="w-4 h-4" />
            <span>一键生成证件照</span>
          </button>
        )}
      </div>
    </div>
  );
};
