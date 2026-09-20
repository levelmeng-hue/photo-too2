import React, { useRef, useEffect } from 'react';
import { HistorySnapshot } from '../types';
import {
  History,
  Undo2,
  Redo2,
  Sparkles,
  Palette,
  Scissors,
  RotateCw,
  Clock,
  CheckCircle2,
  ArrowLeftRight,
  RotateCcw,
  X,
  Layers,
  Wand2,
  Sliders,
  Image as ImageIcon,
} from 'lucide-react';

export interface TimelineNode extends HistorySnapshot {
  status: 'past' | 'present' | 'future';
  index: number;
}

interface HistoryTimelinePanelProps {
  undoStack: HistorySnapshot[];
  redoStack: HistorySnapshot[];
  currentSnapshot: HistorySnapshot;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onJumpToSnapshot: (targetIndex: number) => void;
  isOpen: boolean;
  onClose: () => void;
  onResetToInitial?: () => void;
}

export const HistoryTimelinePanel: React.FC<HistoryTimelinePanelProps> = ({
  undoStack,
  redoStack,
  currentSnapshot,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onJumpToSnapshot,
  isOpen,
  onClose,
  onResetToInitial,
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const activeItemRef = useRef<HTMLDivElement | null>(null);

  // Close panel on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      // Auto-scroll to current active item
      setTimeout(() => {
        if (activeItemRef.current) {
          activeItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Build complete linear timeline
  const pastNodes: TimelineNode[] = undoStack.map((snap, idx) => ({
    ...snap,
    status: 'past',
    index: idx,
  }));

  const presentNode: TimelineNode = {
    ...currentSnapshot,
    status: 'present',
    index: undoStack.length,
    description: currentSnapshot.description || '当前最新编辑状态',
  };

  const futureNodes: TimelineNode[] = redoStack
    .slice()
    .reverse()
    .map((snap, idx) => ({
      ...snap,
      status: 'future',
      index: undoStack.length + 1 + idx,
    }));

  const allTimelineNodes: TimelineNode[] = [...pastNodes, presentNode, ...futureNodes];
  const currentIndex = undoStack.length;
  const totalNodes = allTimelineNodes.length;
  const progressPercent = totalNodes > 1 ? (currentIndex / (totalNodes - 1)) * 100 : 100;

  // Helper to format time
  const formatTime = (ts: number) => {
    if (!ts) return '';
    const date = new Date(ts);
    return date.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Helper to get step-appropriate icon
  const getNodeIcon = (description: string = '', step?: string) => {
    if (description.includes('初始') || description.includes('原图') || description.includes('载入')) {
      return <ImageIcon className="w-3.5 h-3.5" />;
    }
    if (description.includes('美颜') || description.includes('磨皮') || description.includes('美白') || description.includes('大眼') || description.includes('瘦脸')) {
      return <Sparkles className="w-3.5 h-3.5" />;
    }
    if (description.includes('背景') || description.includes('底色') || description.includes('换底') || description.includes('吸取') || description.includes('涂抹')) {
      return <Palette className="w-3.5 h-3.5" />;
    }
    if (description.includes('规格') || description.includes('尺寸') || description.includes('裁剪')) {
      return <Scissors className="w-3.5 h-3.5" />;
    }
    if (description.includes('旋转') || description.includes('翻转')) {
      return <RotateCw className="w-3.5 h-3.5" />;
    }
    if (description.includes('智能') || description.includes('一键') || description.includes('自动')) {
      return <Wand2 className="w-3.5 h-3.5" />;
    }
    if (description.includes('构图') || description.includes('缩放') || description.includes('位置')) {
      return <Sliders className="w-3.5 h-3.5" />;
    }
    if (step === 'beauty') return <Sparkles className="w-3.5 h-3.5" />;
    if (step === 'background') return <Palette className="w-3.5 h-3.5" />;
    return <Layers className="w-3.5 h-3.5" />;
  };

  // Helper to get step badge text
  const getStepBadge = (node: TimelineNode) => {
    if (node.description?.includes('初始')) return '原始照片';
    if (node.step === 'upload') return '上传/构图';
    if (node.step === 'beauty') return '美颜光影';
    if (node.step === 'background') return '抠图换底';
    if (node.step === 'generate') return '排版生成';
    return '参数调整';
  };

  return (
    <div
      ref={panelRef}
      id="history-timeline-dropdown-panel"
      className="absolute top-[calc(100%+8px)] right-0 w-[340px] sm:w-[420px] max-h-[560px] bg-white rounded-[20px] shadow-[0_20px_50px_rgba(42,36,96,0.22)] border border-[#E2E8F0] flex flex-col z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 select-none"
    >
      {/* 1. Header */}
      <div className="p-3.5 bg-gradient-to-r from-[#FAF9FF] to-[#F5F7FA] border-b border-[#EEEEEE] flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-[10px] bg-gradient-to-tr from-[#7B68EE] to-[#A56EFF] flex items-center justify-center text-white shadow-xs">
            <History className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-[13px] font-bold text-[#2A2460]">编辑历史记录与快照</h3>
              <span className="px-1.5 py-0.5 rounded-[6px] text-[10px] font-bold bg-[#7B68EE]/10 text-[#7B68EE] border border-[#7B68EE]/20">
                {currentIndex + 1} / {totalNodes}
              </span>
            </div>
            <p className="text-[10px] text-[#888888] mt-0.5">
              点击任意节点即可瞬间跳转并重绘画布预览
            </p>
          </div>
        </div>

        <button
          type="button"
          id="history-panel-close-btn"
          onClick={onClose}
          className="p-1 rounded-[8px] text-[#999999] hover:text-[#2A2460] hover:bg-black/5 transition-all"
          title="关闭面板"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Visual Progress Bar & Jump Track */}
      <div className="px-4 py-3 bg-[#FFFFFF] border-b border-[#EEEEEE] space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[#666666] font-medium flex items-center space-x-1">
            <Clock className="w-3 h-3 text-[#7B68EE]" />
            <span>快照时间轴进度</span>
          </span>
          <span className="font-mono font-bold text-[#7B68EE]">
            {Math.round(progressPercent)}%
          </span>
        </div>

        {/* Interactive Track */}
        <div className="relative w-full h-2.5 bg-[#EEF2F6] rounded-full overflow-hidden flex items-center">
          <div
            className="h-full bg-gradient-to-r from-[#5AC8C3] via-[#7B68EE] to-[#A56EFF] transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Quick dot indicator jump track */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-[#888888]">初始载入</span>
          <div className="flex items-center space-x-1">
            {allTimelineNodes.map((node) => {
              const isCurrent = node.status === 'present';
              const isPast = node.status === 'past';
              return (
                <button
                  key={node.index}
                  type="button"
                  onClick={() => onJumpToSnapshot(node.index)}
                  className={`transition-all rounded-full ${
                    isCurrent
                      ? 'w-3 h-3 bg-[#7B68EE] ring-2 ring-[#7B68EE]/40 ring-offset-1 scale-110'
                      : isPast
                      ? 'w-2 h-2 bg-[#5AC8C3] hover:scale-125'
                      : 'w-2 h-2 bg-[#D1D5DB] hover:bg-[#7B68EE] hover:scale-125'
                  }`}
                  title={`快照 #${node.index + 1}: ${node.description || '操作'}`}
                />
              );
            })}
          </div>
          <span className="text-[10px] text-[#888888]">最新状态</span>
        </div>
      </div>

      {/* 3. Snapshot List */}
      <div className="flex-1 overflow-y-auto max-h-[300px] p-3 space-y-1.5 divide-y divide-[#F5F7FA]">
        {allTimelineNodes.map((node) => {
          const isCurrent = node.status === 'present';
          const isPast = node.status === 'past';
          const isFuture = node.status === 'future';

          return (
            <div
              key={node.index}
              ref={isCurrent ? activeItemRef : undefined}
              onClick={() => onJumpToSnapshot(node.index)}
              className={`pt-1.5 first:pt-0 p-2.5 rounded-[12px] transition-all cursor-pointer group flex items-start justify-between border ${
                isCurrent
                  ? 'bg-gradient-to-r from-[#FAF9FF] to-[#F4F1FF] border-[#7B68EE] shadow-[0_4px_12px_rgba(123,104,238,0.12)] ring-1 ring-[#7B68EE]/30'
                  : isPast
                  ? 'bg-white hover:bg-[#F8FAFC] border-transparent hover:border-[#E2E8F0]'
                  : 'bg-[#FAFAFA]/70 hover:bg-[#F3F4F6] border-dashed border-[#E5E7EB] opacity-75 hover:opacity-100'
              }`}
            >
              {/* Left Column: Number + Icon + Info */}
              <div className="flex items-start space-x-2.5 min-w-0 flex-1 pr-2">
                {/* Step Node Dot / Icon */}
                <div
                  className={`w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                    isCurrent
                      ? 'bg-gradient-to-tr from-[#7B68EE] to-[#A56EFF] text-white shadow-xs'
                      : isPast
                      ? 'bg-[#5AC8C3]/15 text-[#008B8B] group-hover:bg-[#5AC8C3]/25'
                      : 'bg-[#E5E7EB] text-[#888888] group-hover:bg-[#7B68EE]/20 group-hover:text-[#7B68EE]'
                  }`}
                >
                  {getNodeIcon(node.description, node.step)}
                </div>

                {/* Node Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-1.5 flex-wrap">
                    <span
                      className={`text-[12px] font-bold ${
                        isCurrent ? 'text-[#7B68EE]' : 'text-[#2A2460] group-hover:text-[#7B68EE]'
                      }`}
                    >
                      {node.description || (node.index === 0 ? '初始原图载入' : `历史步骤 #${node.index + 1}`)}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/5 text-[#666666]">
                      {getStepBadge(node)}
                    </span>
                  </div>

                  {/* Summary parameters snippet */}
                  <div className="flex items-center space-x-2 text-[10px] text-[#888888] font-mono mt-1 flex-wrap gap-y-0.5">
                    {node.bgSettings && (
                      <span className="flex items-center space-x-1">
                        <span
                          className="w-2 h-2 rounded-full border border-black/10 inline-block"
                          style={{ backgroundColor: node.bgSettings.color || '#FFFFFF' }}
                        />
                        <span>{node.bgSettings.type === 'gradient' ? '渐变底' : '底色'}</span>
                      </span>
                    )}
                    {node.beauty && (node.beauty.smoothing > 0 || node.beauty.whitening > 0) && (
                      <span>
                        磨皮{node.beauty.smoothing}/美白{node.beauty.whitening}
                      </span>
                    )}
                    {node.composition && (
                      <span>
                        缩放{Math.round((node.composition.scale || 1) * 100)}%
                      </span>
                    )}
                    {node.timestamp && (
                      <span className="text-[#AAAAAA]">{formatTime(node.timestamp)}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Status Tag / Action */}
              <div className="shrink-0 flex flex-col items-end space-y-1">
                {isCurrent && (
                  <span className="px-2 py-0.5 rounded-[6px] text-[10px] font-bold bg-[#7B68EE] text-white flex items-center space-x-1 shadow-xs animate-pulse">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>当前节点</span>
                  </span>
                )}
                {isPast && (
                  <span className="px-1.5 py-0.5 rounded-[4px] text-[10px] font-medium bg-[#5AC8C3]/10 text-[#008B8B] group-hover:bg-[#7B68EE]/10 group-hover:text-[#7B68EE] transition-all">
                    点击回退
                  </span>
                )}
                {isFuture && (
                  <span className="px-1.5 py-0.5 rounded-[4px] text-[10px] font-medium bg-[#F3F4F6] text-[#666666] group-hover:bg-[#7B68EE]/15 group-hover:text-[#7B68EE] transition-all">
                    点击重做
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Footer Controls */}
      <div className="p-3 bg-[#FAF9FF] border-t border-[#EEEEEE] flex items-center justify-between gap-2">
        {/* Reset to Initial Node */}
        {onResetToInitial && currentIndex > 0 && (
          <button
            type="button"
            id="history-reset-initial-btn"
            onClick={() => {
              onJumpToSnapshot(0);
            }}
            className="px-2.5 py-1.5 rounded-[8px] text-[11px] font-medium text-[#666666] hover:text-[#2A2460] hover:bg-white border border-transparent hover:border-[#EEEEEE] transition-all flex items-center space-x-1"
            title="一键还原至最初刚载入照片的状态"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#888888]" />
            <span>还原初始</span>
          </button>
        )}

        <div className="flex items-center space-x-2 ml-auto">
          {/* Quick Undo */}
          <button
            type="button"
            id="history-panel-undo-btn"
            disabled={!canUndo}
            onClick={onUndo}
            className={`px-2.5 py-1.5 rounded-[8px] text-[11px] font-medium transition-all flex items-center space-x-1 border ${
              canUndo
                ? 'bg-white border-[#E2E8F0] text-[#2A2460] hover:border-[#7B68EE] hover:text-[#7B68EE] shadow-xs active:scale-95'
                : 'bg-transparent border-transparent text-[#CCCCCC] opacity-40 cursor-not-allowed'
            }`}
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>撤销</span>
          </button>

          {/* Quick Redo */}
          <button
            type="button"
            id="history-panel-redo-btn"
            disabled={!canRedo}
            onClick={onRedo}
            className={`px-2.5 py-1.5 rounded-[8px] text-[11px] font-medium transition-all flex items-center space-x-1 border ${
              canRedo
                ? 'bg-white border-[#E2E8F0] text-[#2A2460] hover:border-[#7B68EE] hover:text-[#7B68EE] shadow-xs active:scale-95'
                : 'bg-transparent border-transparent text-[#CCCCCC] opacity-40 cursor-not-allowed'
            }`}
          >
            <Redo2 className="w-3.5 h-3.5" />
            <span>重做</span>
          </button>
        </div>
      </div>
    </div>
  );
};
