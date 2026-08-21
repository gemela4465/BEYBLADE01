import React, { useState } from 'react';
import { Share2, Send, X, ExternalLink, Image as ImageIcon, Copy, Check, Sparkles, Radio, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Tournament } from '../types';
import { buildReadOnlyBracketUrl } from '../utils/sessionHelper';
import { broadcastBracketApi, uploadBracketImageApi } from '../utils/api';
import { toPng } from 'html-to-image';

interface BroadcastBracketModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament | null;
  bracketContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export const BroadcastBracketModal: React.FC<BroadcastBracketModalProps> = ({
  isOpen,
  onClose,
  tournament,
  bracketContainerRef
}) => {
  const [includeImage, setIncludeImage] = useState<boolean>(true);
  const [customMessage, setCustomMessage] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [snapshotPreview, setSnapshotPreview] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [broadcastResult, setBroadcastResult] = useState<{
    success: boolean;
    broadcastSuccess: boolean;
    pushedGroupCount?: number;
    totalGroups?: number;
    error?: string;
  } | null>(null);

  if (!isOpen || !tournament) return null;

  const readOnlyUrl = buildReadOnlyBracketUrl(tournament);
  const approvedCount = tournament.players.filter((p) => p.status === 'approved').length;

  const defaultMessage = `⚔️【${tournament.name} 雙翼賽程表發布】
⚡ 賽程樹狀圖已正式生成，雙翼對決即將全面開打！

📊 賽制資訊：
• 參賽規模：${approvedCount} / ${tournament.targetSize} 人
• 爭霸分制：率先奪得 ${tournament.matchTargetScore} 分晉級
• 賽程架構：左翼 ${tournament.targetSize / 2} 強 ⚔️ 右翼 ${tournament.targetSize / 2} 強 ➔ 中央總決賽

🌐 線上即時賽程表（免登入唯讀查看，即時同步更新）：
${readOnlyUrl}

💬 LINE 快速指令：傳送「賽程」或「查榜」即可隨時查看最新比分！`;

  // Capture current bracket element screenshot using html-to-image
  const handleCaptureBracket = async (): Promise<string | null> => {
    setIsCapturing(true);
    try {
      // Find element to capture
      const targetElement = bracketContainerRef?.current || document.getElementById('dual-wing-bracket-board') || document.querySelector('.dual-wing-tree-container');
      if (!targetElement) {
        console.warn('Bracket DOM element not found for snapshot, continuing with text link');
        return null;
      }

      const dataUrl = await toPng(targetElement as HTMLElement, {
        cacheBust: true,
        backgroundColor: '#05070a',
        pixelRatio: 1.5,
        quality: 0.92,
        style: {
          transform: 'scale(1)',
        }
      });
      setSnapshotPreview(dataUrl);
      return dataUrl;
    } catch (err) {
      console.error('Failed to capture bracket snapshot:', err);
      return null;
    } finally {
      setIsCapturing(false);
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(readOnlyUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSendBroadcast = async () => {
    setIsBroadcasting(true);
    setBroadcastResult(null);

    let uploadedImageUrl: string | undefined = undefined;

    if (includeImage) {
      let base64 = snapshotPreview;
      if (!base64) {
        base64 = await handleCaptureBracket();
      }
      if (base64) {
        const uploadRes = await uploadBracketImageApi(base64, `bracket_${tournament.id}.png`);
        if (uploadRes.success && uploadRes.imageUrl) {
          uploadedImageUrl = uploadRes.imageUrl;
        }
      }
    }

    const messageToSend = customMessage.trim() || defaultMessage;
    const res = await broadcastBracketApi(tournament.id, {
      message: messageToSend,
      imageUrl: uploadedImageUrl,
      readOnlyUrl
    });

    setIsBroadcasting(false);
    setBroadcastResult(res);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-[#0a0c12] border border-[#00f2ff]/30 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-[0_0_60px_rgba(0,242,255,0.15)] text-[#e0e6ed] relative max-h-[90vh] flex flex-col">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#00f2ff] to-transparent opacity-80" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 rounded-xl hover:bg-[#ffffff10] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#00f2ff]/15 border border-[#00f2ff]/30 flex items-center justify-center text-[#00f2ff] shadow-[0_0_15px_rgba(0,242,255,0.2)]">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white tracking-wide flex items-center gap-2">
              發布賽程表至 LINE 群組
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00f2ff]/20 text-[#00f2ff] border border-[#00f2ff]/30">
                唯讀防篡改
              </span>
            </h3>
            <p className="text-xs text-gray-400 font-mono">
              一鍵發送至所有 LINE 群組與好友，包含即時賽程樹狀圖照片與唯讀查閱連結
            </p>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Read-Only Link Bar */}
          <div className="p-3 bg-[#11141d] border border-[#ffffff10] rounded-xl flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-mono text-gray-400 flex items-center gap-1 mb-0.5">
                <ExternalLink className="w-3.5 h-3.5 text-[#00f2ff]" />
                本場次唯讀即時賽程網址（選手可查看、不能編輯）：
              </div>
              <div className="text-xs font-mono text-[#00f2ff] truncate">
                {readOnlyUrl}
              </div>
            </div>
            <button
              onClick={handleCopyUrl}
              className="px-3 py-1.5 bg-[#00f2ff]/15 hover:bg-[#00f2ff]/25 border border-[#00f2ff]/30 rounded-lg text-xs font-mono font-bold text-[#00f2ff] flex items-center gap-1.5 transition-all shrink-0"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedLink ? '已複製' : '複製網址'}
            </button>
          </div>

          {/* Include Image Option */}
          <div className="p-4 bg-[#11141d]/80 border border-[#ffffff15] rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-mono font-bold text-gray-200">
                <input
                  type="checkbox"
                  checked={includeImage}
                  onChange={(e) => setIncludeImage(e.target.checked)}
                  className="w-4 h-4 rounded border-[#ffffff30] text-[#00f2ff] bg-black focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <ImageIcon className="w-4 h-4 text-amber-400" />
                附帶賽程表即時截圖照片（LINE 圖片訊息）
              </label>

              {includeImage && (
                <button
                  onClick={handleCaptureBracket}
                  disabled={isCapturing}
                  className="text-[11px] font-mono text-[#00f2ff] hover:text-[#00f2ff]/80 flex items-center gap-1 border border-[#00f2ff]/20 px-2 py-0.5 rounded"
                >
                  <RefreshCw className={`w-3 h-3 ${isCapturing ? 'animate-spin' : ''}`} />
                  {isCapturing ? '生成截圖中...' : snapshotPreview ? '重新截圖' : '立即預覽截圖'}
                </button>
              )}
            </div>

            {includeImage && snapshotPreview && (
              <div className="relative rounded-xl border border-[#ffffff15] overflow-hidden bg-black/60 max-h-36">
                <img
                  src={snapshotPreview}
                  alt="賽程表預覽"
                  className="w-full h-full object-contain max-h-36"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute bottom-1 right-2 text-[10px] font-mono text-gray-400 bg-black/80 px-1.5 py-0.5 rounded">
                  📸 賽程表快照預覽
                </div>
              </div>
            )}
          </div>

          {/* Broadcast Message Customizer */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-semibold text-gray-300">
                LINE 廣播文字內容（可直接發送或自訂修改）：
              </label>
              <button
                onClick={() => setCustomMessage(defaultMessage)}
                className="text-[11px] font-mono text-[#00f2ff] hover:underline"
              >
                還原預設範本
              </button>
            </div>
            <textarea
              value={customMessage || defaultMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={7}
              className="w-full p-3 bg-[#05070a] border border-[#ffffff15] rounded-xl text-xs font-mono text-gray-300 focus:outline-none focus:border-[#00f2ff] resize-none"
            />
          </div>

          {/* Result Alert */}
          {broadcastResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-mono flex items-start gap-2.5 ${
                broadcastResult.broadcastSuccess || (broadcastResult.pushedGroupCount && broadcastResult.pushedGroupCount > 0)
                  ? 'bg-[#06C755]/10 border-[#06C755]/40 text-[#06C755]'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
            >
              {broadcastResult.broadcastSuccess || (broadcastResult.pushedGroupCount && broadcastResult.pushedGroupCount > 0) ? (
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-bold">
                  {broadcastResult.broadcastSuccess || (broadcastResult.pushedGroupCount && broadcastResult.pushedGroupCount > 0)
                    ? '✅ 賽程表已成功推播至 LINE 群組與好友！'
                    : 'ℹ️ 廣播已發送（若群組未收到請確認 Bot 是否已加入群組）'}
                </div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  已成功推播 {broadcastResult.pushedGroupCount || 0} 個 LINE 群組 / 聊天室
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-[#ffffff10] mt-4">
          <div className="text-[11px] font-mono text-gray-500">
            自動同步至 Webhook 活躍群組
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#11141d] hover:bg-[#ffffff15] text-gray-300 text-xs font-semibold border border-[#ffffff10]"
            >
              關閉
            </button>
            <button
              onClick={handleSendBroadcast}
              disabled={isBroadcasting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#06C755] to-[#00f2ff] hover:opacity-90 text-black text-xs font-black font-mono flex items-center gap-2 shadow-[0_0_20px_rgba(6,199,85,0.4)] disabled:opacity-50"
            >
              {isBroadcasting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {isBroadcasting ? '發送推播中...' : '立即發布賽程至 LINE 群'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
