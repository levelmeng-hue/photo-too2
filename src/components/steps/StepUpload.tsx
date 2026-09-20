import React, { useState, useRef } from 'react';
import { FaceDetectionResult, CompositionSettings, PhotoSpec } from '../../types';
import {
  UploadCloud,
  Camera,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  RotateCw,
  FlipHorizontal,
  ArrowRight,
  Sparkles,
  Info,
  Compass,
  RotateCcw,
  Wand2
} from 'lucide-react';

interface StepUploadProps {
  onImageLoaded: (img: HTMLImageElement, filename: string) => void;
  faceResult: FaceDetectionResult | null;
  onNext: () => void;
  onLoadSample: (gender: 'male' | 'female') => void;
  onRotateImage: () => void;
  onFlipImage: () => void;
  hasImage: boolean;
  composition: CompositionSettings;
  onAutoCorrectTilt: () => void;
  onChangeComposition?: (
    composition: CompositionSettings | ((prev: CompositionSettings) => CompositionSettings)
  ) => void;
  selectedSpec?: PhotoSpec;
  onAutoMatchSpec?: () => void;
}

export const StepUpload: React.FC<StepUploadProps> = ({
  onImageLoaded,
  faceResult,
  onNext,
  onLoadSample,
  onRotateImage,
  onFlipImage,
  hasImage,
  composition,
  onAutoCorrectTilt,
  onChangeComposition,
  selectedSpec,
  onAutoMatchSpec,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // File handler
  const handleFile = (file: File) => {
    setErrorMsg(null);

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('图片大小超过 10MB 限制，请上传 10MB 以内的清晰正面照。');
      return;
    }

    // Validate type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('仅支持 JPG、JPEG、PNG、WebP 格式的图片。');
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      if (e.target?.result) {
        const img = new Image();
        img.onload = () => {
          onImageLoaded(img, file.name);
        };
        img.src = e.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Webcam capture
  const startCamera = async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
      });
      streamRef.current = stream;
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      setErrorMsg('无法调用摄像头设备，请检查浏览器权限设置或直接上传本地照片。');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const img = new Image();
    img.onload = () => {
      onImageLoaded(img, `camera_${Date.now()}.jpg`);
      stopCamera();
    };
    img.src = canvas.toDataURL('image/jpeg', 0.95);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  return (
    <div className="space-y-4">
      {/* Step Header */}
      <div>
        <h2 className="text-[18px] font-bold text-[#2A2460]">上传正面人脸照片</h2>
        <p className="text-[13px] text-[#666666] mt-1">
          建议选择光线均匀、面部无大面积遮挡的正面免冠照片
        </p>
      </div>

      {/* Upload Drag & Drop Box */}
      <div
        id="upload-dropzone"
        onDragOver={e => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-[20px] p-6 text-center cursor-pointer transition-all duration-200 ${
          dragOver
            ? 'border-[#7B68EE] bg-[#7B68EE]/5 scale-[1.01]'
            : hasImage
            ? 'border-[#5AC8C3] bg-[#f0faf0]'
            : 'border-[#cccccc] hover:border-[#7B68EE] bg-[#FFFFFF] hover:bg-[#F5F7FA]'
        } shadow-[0_4px_12px_rgba(42,36,96,0.04)]`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={e => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
            }
          }}
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <div
            className={`w-14 h-14 rounded-[14px] flex items-center justify-center transition-transform ${
              hasImage
                ? 'bg-[#5AC8C3] text-white'
                : 'bg-gradient-to-tr from-[#A56EFF]/15 to-[#7B68EE]/20 text-[#7B68EE]'
            }`}
          >
            {hasImage ? (
              <CheckCircle2 className="w-7 h-7 text-white" />
            ) : (
              <UploadCloud className="w-7 h-7 text-[#7B68EE]" />
            )}
          </div>

          <div>
            <p className="text-[15px] font-bold text-[#2A2460]">
              {hasImage ? '照片已载入，点击可更换照片' : '点击上传 或 拖拽照片到此处'}
            </p>
            <p className="text-[12px] text-[#888888] mt-1">
              支持 JPG、PNG、WebP · 单张限制 10MB · 浏览器本地运算
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="flex items-center space-x-2 p-3 rounded-[12px] bg-[#FFF5F5] border border-[#E86C5D]/30 text-[#E86C5D] text-[13px]">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Quick Actions Row */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          id="camera-capture-btn"
          onClick={startCamera}
          className="inline-flex items-center justify-center space-x-2 px-3 py-2.5 rounded-[12px] border border-[#EEEEEE] bg-[#FFFFFF] hover:bg-[#F5F7FA] text-[#2A2460] text-[13px] font-medium transition-all shadow-[0_2px_6px_rgba(42,36,96,0.04)] min-h-[44px]"
        >
          <Camera className="w-4 h-4 text-[#5B8BD6]" />
          <span>摄像头拍照</span>
        </button>

        <div className="flex space-x-1.5">
          <button
            type="button"
            onClick={() => onLoadSample('male')}
            className="flex-1 inline-flex items-center justify-center px-2 py-2 rounded-[12px] border border-[#EEEEEE] bg-[#FFFFFF] hover:bg-[#F5F7FA] text-[#2A2460] text-[12px] font-medium transition-all shadow-[0_2px_6px_rgba(42,36,96,0.04)] min-h-[44px]"
          >
            男士示例照
          </button>
          <button
            type="button"
            onClick={() => onLoadSample('female')}
            className="flex-1 inline-flex items-center justify-center px-2 py-2 rounded-[12px] border border-[#EEEEEE] bg-[#FFFFFF] hover:bg-[#F5F7FA] text-[#2A2460] text-[12px] font-medium transition-all shadow-[0_2px_6px_rgba(42,36,96,0.04)] min-h-[44px]"
          >
            女士示例照
          </button>
        </div>
      </div>

      {/* Face Detection & Image Quality Status Card */}
      {hasImage && faceResult && (
        <div
          className={`p-4 rounded-[16px] border transition-all ${
            faceResult.detected
              ? 'bg-[#f0faf0] border-[#d4edd6]'
              : 'bg-[#fef9e7] border-[#fde8a1]'
          }`}
        >
          <div className="flex items-start space-x-3">
            <div
              className={`w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0 ${
                faceResult.detected
                  ? 'bg-[#5AC8C3] text-white'
                  : 'bg-[#FFB347] text-white'
              }`}
            >
              {faceResult.detected ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between flex-wrap gap-1.5">
                <h4 className="text-[14px] font-bold text-[#2A2460]">
                  {faceResult.detected ? '人脸识别成功' : '人脸检测提示'}
                </h4>
                <div className="flex items-center space-x-1.5">
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                      faceResult.detected
                        ? 'bg-[#1E7E34]/10 text-[#1E7E34]'
                        : 'bg-[#B7791F]/10 text-[#B7791F]'
                    }`}
                  >
                    置信度: {Math.round(faceResult.score * 100)}%
                  </span>
                  {faceResult.angle !== undefined && (
                    <span
                      id="face-tilt-badge"
                      className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex items-center space-x-1 ${
                        Math.abs(faceResult.angle) >= 0.5
                          ? 'bg-[#7B68EE]/10 text-[#7B68EE] border border-[#7B68EE]/20'
                          : 'bg-[#1E7E34]/10 text-[#1E7E34] border border-[#1E7E34]/20'
                      }`}
                      title={`检测到的人脸倾斜角度：${faceResult.angle > 0 ? `+${faceResult.angle}` : faceResult.angle}°`}
                    >
                      <Compass className="w-3 h-3" />
                      <span>
                        {Math.abs(faceResult.angle) >= 0.5
                          ? `头部倾斜: ${faceResult.angle > 0 ? `+${faceResult.angle}` : faceResult.angle}°`
                          : '头部水平: 端正'}
                      </span>
                    </span>
                  )}
                </div>
              </div>
              <p className="text-[12px] text-[#666666] mt-1 leading-relaxed">
                {faceResult.message}
              </p>
            </div>
          </div>

          {/* Orientation and Auto Level Correction Block */}
          <div className="mt-3.5 pt-3 border-t border-black/5 flex flex-col space-y-2.5">
            {/* Row 1: Auto Leveling Button & Status */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-1.5">
                <span className="text-[12px] font-semibold text-[#2A2460]">头部姿态校正：</span>
                {composition.rotation !== 0 && (
                  <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-[#7B68EE]/10 text-[#7B68EE]">
                    当前角度: {composition.rotation > 0 ? `+${composition.rotation}` : composition.rotation}°
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {/* 1-Click Auto Horizontal Leveling */}
                <button
                  type="button"
                  id="auto-correct-tilt-btn"
                  onClick={onAutoCorrectTilt}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-[10px] bg-gradient-to-r from-[#A56EFF] to-[#7B68EE] hover:from-[#7B68EE] hover:to-[#6A5ACD] text-white text-[12px] font-bold shadow-[0_2px_8px_rgba(123,104,238,0.25)] transition-all active:scale-95"
                  title={
                    faceResult.angle
                      ? `根据检测角度 (${faceResult.angle > 0 ? `+${faceResult.angle}` : faceResult.angle}°) 自动调整旋转，使头部水平端正`
                      : '自动校正头部至绝对水平 0°'
                  }
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#FFD700]" />
                  <span>一键自动水平矫正</span>
                  {faceResult.angle !== undefined && Math.abs(faceResult.angle) >= 0.2 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/25 font-mono">
                      {-faceResult.angle > 0 ? `+${-faceResult.angle}` : -faceResult.angle}°
                    </span>
                  )}
                </button>

                {/* Reset angle if changed */}
                {composition.rotation !== 0 && (
                  <button
                    type="button"
                    id="reset-tilt-btn"
                    onClick={() => {
                      if (onChangeComposition) {
                        onChangeComposition(prev => ({ ...prev, rotation: 0 }));
                      }
                    }}
                    className="inline-flex items-center space-x-1 px-2 py-1.5 rounded-[10px] border border-[#EEEEEE] bg-white hover:bg-[#F5F7FA] text-[11px] text-[#666666] transition-all"
                    title="重置旋转角度为 0°"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>重置0°</span>
                  </button>
                )}
              </div>
            </div>

            {/* Row 2: Micro-adjustment slider and 90° rotate / flip */}
            <div className="flex items-center justify-between pt-2 border-t border-dashed border-black/5 text-[11px] flex-wrap gap-2">
              <div className="flex items-center space-x-2">
                <span className="text-[#888888]">微调角度:</span>
                <input
                  type="range"
                  min="-15"
                  max="15"
                  step="0.2"
                  value={composition.rotation || 0}
                  onChange={e => {
                    if (onChangeComposition) {
                      onChangeComposition(prev => ({
                        ...prev,
                        rotation: Number(Number(e.target.value).toFixed(1)),
                      }));
                    }
                  }}
                  className="w-24 h-1.5 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#7B68EE]"
                />
                <span className="font-mono text-[#2A2460] min-w-[36px]">
                  {composition.rotation > 0 ? `+${composition.rotation}` : composition.rotation || 0}°
                </span>
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  id="adjust-rotate-btn"
                  onClick={onRotateImage}
                  className="inline-flex items-center space-x-1 px-2 py-1 rounded-[8px] bg-white border border-[#EEEEEE] text-[11px] text-[#2A2460] hover:bg-[#F5F7FA]"
                  title="顺时针旋转90°"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>旋转90°</span>
                </button>
                <button
                  type="button"
                  id="adjust-flip-btn"
                  onClick={onFlipImage}
                  className="inline-flex items-center space-x-1 px-2 py-1 rounded-[8px] bg-white border border-[#EEEEEE] text-[11px] text-[#2A2460] hover:bg-[#F5F7FA]"
                  title="水平镜像翻转"
                >
                  <FlipHorizontal className="w-3 h-3" />
                  <span>水平翻转</span>
                </button>
              </div>
            </div>

            {/* Row 3: 常用标准匹配与画布联动提示 */}
            {selectedSpec && (
              <div className="pt-2.5 border-t border-black/5 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 rounded-full bg-[#7B68EE]/10 flex items-center justify-center text-[#7B68EE]">
                    <Sparkles className="w-3 h-3" />
                  </div>
                  <div className="text-[11px] text-[#2A2460]">
                    <span>当前规格：</span>
                    <span className="font-bold text-[#7B68EE]">{selectedSpec.name}</span>
                    <span className="text-[#888888] ml-1">
                      ({selectedSpec.widthPx}×{selectedSpec.heightPx}px · {selectedSpec.dpi}DPI)
                    </span>
                  </div>
                </div>

                {onAutoMatchSpec && (
                  <button
                    type="button"
                    id="upload-auto-match-spec-btn"
                    onClick={onAutoMatchSpec}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-[8px] bg-gradient-to-r from-[#A56EFF]/15 to-[#7B68EE]/15 hover:from-[#A56EFF]/25 hover:to-[#7B68EE]/25 border border-[#7B68EE]/30 text-[#7B68EE] text-[11px] font-bold transition-all active:scale-95"
                    title="根据照片比例与人脸位置自动智能匹配最适合的标准规格与构图"
                  >
                    <Wand2 className="w-3 h-3" />
                    <span>智能自动匹配</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Guidelines checklist */}
      <div className="p-3.5 rounded-[16px] bg-[#FFFFFF] border border-[#EEEEEE] shadow-[0_2px_6px_rgba(42,36,96,0.04)]">
        <div className="flex items-center space-x-1.5 text-[12px] font-bold text-[#2A2460] mb-2">
          <Info className="w-3.5 h-3.5 text-[#5B8BD6]" />
          <span>证件照规范拍摄建议</span>
        </div>
        <ul className="text-[11px] text-[#666666] space-y-1 pl-4 list-disc">
          <li>保持正面直视镜头，双肩自然平齐，露出眉毛与双耳</li>
          <li>避免佩戴粗框眼镜、反光饰品或帽子</li>
          <li>背景尽量平整、无强光逆光，可显著提高智能抠图精度</li>
        </ul>
      </div>

      {/* Next Step CTA */}
      {hasImage && (
        <button
          id="upload-next-btn"
          onClick={onNext}
          className="w-full flex items-center justify-center space-x-2 py-3.5 px-6 rounded-[20px] bg-gradient-to-r from-[#A56EFF] to-[#7B68EE] hover:from-[#7B68EE] hover:to-[#6A5ACD] text-white text-[15px] font-bold shadow-[0_4px_12px_rgba(123,104,238,0.3)] transition-all active:scale-98 min-h-[48px]"
        >
          <span>下一步：智能美颜</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      )}

      {/* Camera Capture Modal */}
      {showCamera && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[20px] max-w-md w-full p-5 shadow-[0_12px_32px_rgba(42,36,96,0.2)]">
            <h3 className="text-[16px] font-bold text-[#2A2460] mb-3">
              拍摄证件照照片
            </h3>
            <div className="relative rounded-[12px] overflow-hidden bg-black aspect-[3/4] flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Face Guide Oval */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[65%] h-[68%] border-2 border-dashed border-white/80 rounded-[50%]" />
              </div>
            </div>
            <p className="text-[11px] text-[#888888] text-center mt-2">
              请将头部置于虚线椭圆中央，正面面向镜头
            </p>
            <div className="mt-4 flex space-x-3">
              <button
                type="button"
                onClick={stopCamera}
                className="flex-1 py-2.5 rounded-[8px] border border-[#EEEEEE] text-[#666666] font-medium text-[13px] hover:bg-[#F5F7FA]"
              >
                取消
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                className="flex-1 py-2.5 rounded-[8px] bg-gradient-to-r from-[#A56EFF] to-[#7B68EE] text-white font-bold text-[13px] shadow-[0_4px_12px_rgba(123,104,238,0.25)] flex items-center justify-center space-x-1"
              >
                <Camera className="w-4 h-4" />
                <span>拍照完成</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
