import React from 'react';
import { ShieldCheck, Sparkles, RefreshCw, UserCheck, QrCode, Undo2, Redo2 } from 'lucide-react';

interface HeaderProps {
  onLoadSample: (gender: 'male' | 'female') => void;
  onReset: () => void;
  hasImage: boolean;
  onOpenQRCodeModal?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onLoadSample,
  onReset,
  hasImage,
  onOpenQRCodeModal,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}) => {
  return (
    <header className="w-full bg-[#FFFFFF] border-b border-[#EEEEEE] shadow-[0_2px_6px_rgba(42,36,96,0.04)] sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-[12px] bg-gradient-to-tr from-[#A56EFF] to-[#7B68EE] flex items-center justify-center text-white shadow-[0_4px_12px_rgba(123,104,238,0.25)]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-[17px] sm:text-[19px] font-bold text-[#2A2460] tracking-tight leading-none">
                证件照在线生成
              </h1>
              <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-[6px] text-[11px] font-medium bg-[#f0faf0] text-[#1E7E34] border border-[#d4edd6]">
                纯本地运算
              </span>
            </div>
            <p className="text-[11px] text-[#888888] mt-0.5 hidden sm:block">
              智能美颜 · 发丝级抠图换底 · 标准尺寸裁剪 · 6寸排版打印
            </p>
          </div>
        </div>

        {/* Right Tools & Security Badge */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Privacy Badge */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-[20px] bg-[#F5F7FA] text-[#2A2460] text-[12px] font-medium border border-[#EEEEEE]">
            <ShieldCheck className="w-4 h-4 text-[#5AC8C3]" />
            <span className="hidden sm:inline">照片不出本地 · 保护隐私</span>
            <span className="sm:hidden">本地安全</span>
          </div>

          {/* Quick Demo Sample Button */}
          <div className="relative group">
            <button
              id="header-sample-btn"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 h-9 rounded-[8px] border border-[#EEEEEE] bg-[#FFFFFF] hover:bg-[#F5F7FA] text-[#2A2460] text-[13px] font-medium transition-all shadow-[0_2px_6px_rgba(42,36,96,0.04)] active:scale-95"
              title="载入标准示例人像照片进行功能试用"
            >
              <UserCheck className="w-4 h-4 text-[#7B68EE]" />
              <span className="hidden sm:inline">示例照体验</span>
              <span className="sm:hidden">示例</span>
            </button>
            <div className="absolute right-0 top-full mt-1.5 w-36 bg-white rounded-[12px] shadow-[0_8px_24px_rgba(42,36,96,0.12)] border border-[#EEEEEE] p-1.5 hidden group-hover:block z-50 animate-fadeIn">
              <button
                onClick={() => onLoadSample('male')}
                className="w-full text-left px-3 py-2 rounded-[8px] text-[13px] text-[#333333] hover:bg-[#F5F7FA] hover:text-[#7B68EE] flex items-center justify-between"
              >
                <span>男士标准照</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-[#f0faf0] text-[#1E7E34] rounded">西装</span>
              </button>
              <button
                onClick={() => onLoadSample('female')}
                className="w-full text-left px-3 py-2 rounded-[8px] text-[13px] text-[#333333] hover:bg-[#F5F7FA] hover:text-[#7B68EE] flex items-center justify-between"
              >
                <span>女士自然照</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-[#fef9e7] text-[#B7791F] rounded">正装</span>
              </button>
            </div>
          </div>

          {/* Undo and Redo Operation Stack Buttons */}
          {hasImage && onUndo && onRedo && (
            <div className="flex items-center space-x-0.5 bg-[#F5F7FA] p-0.5 rounded-[8px] border border-[#EEEEEE]">
              <button
                id="header-undo-btn"
                type="button"
                disabled={!canUndo}
                onClick={onUndo}
                className={`px-2 py-1 h-8 rounded-[6px] transition-all flex items-center space-x-1 text-[12px] select-none ${
                  canUndo
                    ? 'text-[#2A2460] hover:bg-white hover:text-[#7B68EE] hover:shadow-xs active:scale-95 cursor-pointer font-medium'
                    : 'text-[#AAAAAA] opacity-40 cursor-not-allowed'
                }`}
                title={canUndo ? '撤销最近一次调整 (Ctrl+Z)' : '暂无可撤销操作'}
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">撤销</span>
              </button>

              <button
                id="header-redo-btn"
                type="button"
                disabled={!canRedo}
                onClick={onRedo}
                className={`px-2 py-1 h-8 rounded-[6px] transition-all flex items-center space-x-1 text-[12px] select-none ${
                  canRedo
                    ? 'text-[#2A2460] hover:bg-white hover:text-[#7B68EE] hover:shadow-xs active:scale-95 cursor-pointer font-medium'
                    : 'text-[#AAAAAA] opacity-40 cursor-not-allowed'
                }`}
                title={canRedo ? '重做恢复操作 (Ctrl+Y)' : '暂无可重做操作'}
              >
                <Redo2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">重做</span>
              </button>
            </div>
          )}

          {/* Mobile QR Code Test Button */}
          {onOpenQRCodeModal && (
            <button
              id="header-mobile-qr-btn"
              type="button"
              onClick={onOpenQRCodeModal}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 h-9 rounded-[8px] bg-gradient-to-r from-[#7B68EE]/10 to-[#5AC8C3]/15 hover:from-[#7B68EE]/20 hover:to-[#5AC8C3]/25 text-[#2A2460] text-[13px] font-medium border border-[#7B68EE]/25 transition-all shadow-[0_2px_6px_rgba(123,104,238,0.06)] active:scale-95 cursor-pointer"
              title="手机扫码测试（移动端自适应与触控体验）"
            >
              <QrCode className="w-4 h-4 text-[#7B68EE]" />
              <span className="hidden sm:inline font-semibold">手机扫码测试</span>
              <span className="sm:hidden">扫码</span>
            </button>
          )}

          {/* Reset button */}
          {hasImage && (
            <button
              id="header-reset-btn"
              onClick={onReset}
              className="inline-flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 h-9 rounded-[8px] border border-[#EEEEEE] bg-[#FFFFFF] hover:bg-[#FFF5F5] hover:text-[#E86C5D] text-[#666666] text-[13px] font-medium transition-all"
              title="清空当前照片并重新开始"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">重新开始</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
