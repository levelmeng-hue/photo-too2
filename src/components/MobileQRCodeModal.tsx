import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Smartphone, X, Copy, Check, ExternalLink, Sparkles } from 'lucide-react';

interface MobileQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileQRCodeModal: React.FC<MobileQRCodeModalProps> = ({ isOpen, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Determine current active URL (fallback to deployed dev url if in special iframe environment)
  const currentUrl =
    typeof window !== 'undefined' && window.location.href && !window.location.href.includes('about:blank')
      ? window.location.href
      : 'https://ais-dev-fcn63vuxahtayd4anlzme2-328073494652.asia-southeast1.run.app';

  useEffect(() => {
    if (!isOpen) return;

    QRCode.toDataURL(currentUrl, {
      width: 320,
      margin: 1.5,
      color: {
        dark: '#2A2460',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('Error generating QR code:', err));
  }, [isOpen, currentUrl]);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = currentUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="mobile-qrcode-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        id="mobile-qrcode-modal"
        onClick={e => e.stopPropagation()}
        className="bg-[#FFFFFF] rounded-[24px] shadow-[0_20px_60px_rgba(42,36,96,0.18)] border border-[#EEEEEE] w-full max-w-sm overflow-hidden flex flex-col"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 pb-3 flex items-center justify-between border-b border-[#F0F0F0]">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-[12px] bg-[#7B68EE]/12 text-[#7B68EE] flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-[#2A2460] flex items-center space-x-1.5">
                <span>手机端扫码测试</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#5AC8C3]/15 text-[#008B8B] font-semibold">
                  触控优化
                </span>
              </h3>
              <p className="text-[11px] text-[#888888]">用手机浏览器或微信扫一扫体验</p>
            </div>
          </div>
          <button
            type="button"
            id="close-qrcode-modal-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F5F7FA] hover:bg-[#EEEEEE] text-[#666666] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 flex flex-col items-center text-center">
          {/* QR Code Container */}
          <div className="p-3 bg-white rounded-[20px] border border-[#EEEEEE] shadow-[0_6px_20px_rgba(42,36,96,0.06)] relative group mb-3">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="手机端扫码测试二维码"
                className="w-56 h-56 rounded-[12px] object-contain"
              />
            ) : (
              <div className="w-56 h-56 rounded-[12px] bg-[#F5F7FA] flex items-center justify-center text-[#888888] text-[13px]">
                正在生成二维码...
              </div>
            )}
            <div className="absolute inset-x-0 -bottom-2 flex justify-center">
              <span className="px-2.5 py-0.5 rounded-full bg-[#2A2460] text-white text-[10px] font-medium shadow-xs flex items-center space-x-1">
                <Sparkles className="w-2.5 h-2.5 text-[#5AC8C3]" />
                <span>实时同步测试环境</span>
              </span>
            </div>
          </div>

          <p className="text-[12px] text-[#555555] font-medium mt-2">
            手机相机、微信扫一扫或浏览器扫码直接打开
          </p>

          {/* URL Box & Copy */}
          <div className="w-full mt-3 p-2.5 rounded-[12px] bg-[#F8F9FB] border border-[#E5E7EB] flex items-center justify-between text-left">
            <span className="text-[11px] font-mono text-[#666666] truncate flex-1 mr-2">
              {currentUrl}
            </span>
            <button
              type="button"
              id="copy-mobile-url-btn"
              onClick={handleCopy}
              className={`px-2.5 py-1 rounded-[8px] text-[11px] font-medium flex items-center space-x-1 shrink-0 transition-all cursor-pointer ${
                copied
                  ? 'bg-[#10B981] text-white'
                  : 'bg-white text-[#2A2460] hover:bg-[#FAF9FF] hover:text-[#7B68EE] border border-[#DDDDDD]'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>已复制</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>复制链接</span>
                </>
              )}
            </button>
          </div>

          {/* Feature Highlights */}
          <div className="w-full mt-3 pt-3 border-t border-[#F0F0F0] text-left text-[11px] text-[#666666] space-y-1">
            <div className="flex items-center space-x-1.5">
              <span className="text-[#10B981] font-bold">✓</span>
              <span>已适配移动端手势触控与 48dp+ 舒适操作规范</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-[#10B981] font-bold">✓</span>
              <span>画面光影调节默认收起，滑块配备左右实体步进键</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-[#10B981] font-bold">✓</span>
              <span>支持手机相册上传、自拍直接抠图及 6 寸排版预览</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
