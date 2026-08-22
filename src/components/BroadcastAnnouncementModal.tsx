import React, { useState, useEffect } from 'react';
import { Radio, X, Send, CheckCircle2, AlertCircle, RefreshCw, Users, MessageSquare, Clock, ShieldCheck, Sparkles, ExternalLink } from 'lucide-react';
import { Tournament } from '../types';
import { broadcastAnnouncementApi, fetchConnectedGroupsApi, setActiveTournamentApi } from '../utils/api';

interface BroadcastAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament | null;
}

export const BroadcastAnnouncementModal: React.FC<BroadcastAnnouncementModalProps> = ({
  isOpen,
  onClose,
  tournament
}) => {
  const [announcementText, setAnnouncementText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{
    success: boolean;
    broadcastSuccess: boolean;
    pushedGroupCount?: number;
    pushedGroups?: string[];
    totalGroups?: number;
    announcementText?: string;
  } | null>(null);

  const [groupStats, setGroupStats] = useState<{
    totalCount: number;
    groups: any[];
    activeTournamentId: string | null;
  }>({
    totalCount: 0,
    groups: [],
    activeTournamentId: null
  });

  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isActiveSet, setIsActiveSet] = useState(false);

  // Generate default announcement template when opened
  useEffect(() => {
    if (tournament && isOpen) {
      const startTimeDisplay = tournament.startTime || '依大會現場公布';
      const deadlineDisplay = tournament.registrationDeadline || '額滿為止';
      const approvedCount = tournament.players?.filter((p) => p.status === 'approved').length || 0;
      const remainingSlots = Math.max(0, tournament.targetSize - approvedCount);

      // Prize formatting: only display non-empty prizes (沒輸入 則不註記)
      let prizeSection = '';
      if (tournament.prizes) {
        const p = tournament.prizes;
        const items: string[] = [];
        if (p.champion?.trim()) items.push(`• 🥇 冠軍：${p.champion.trim()}`);
        if (p.runnerUp?.trim()) items.push(`• 🥈 亞軍：${p.runnerUp.trim()}`);
        if (p.thirdPlace?.trim()) items.push(`• 🥉 季軍：${p.thirdPlace.trim()}`);
        if (p.fourthPlace?.trim()) items.push(`• 🏅 殿軍：${p.fourthPlace.trim()}`);
        if (p.extraAwards?.trim()) items.push(`• 🎁 特別獎：${p.extraAwards.trim()}`);
        if (items.length > 0) {
          prizeSection = `\n\n🎁【大會獎項註記】\n${items.join('\n')}`;
        }
      }

      const defaultMsg = `📢【戰鬥陀螺 X 雙翼賽事 賽程公告】
🏆 賽事場次：${tournament.name}
⚡ 賽制規模：${tournament.targetSize} 人雙翼對決（${tournament.matchTargetScore} 分制）
🔥 本場剩餘名額：${remainingSlots} / ${tournament.targetSize}
⏰ 開賽時間：${startTimeDisplay}
⏳ 報名截止時間：${deadlineDisplay}${prizeSection}

📝 LINE 群友報名指令：
👉 本人報名：「+1 選手簡稱 陀螺名稱」
👉 替人代報：「++1 選手簡稱 陀螺名稱」
👉 取消報名：「-1 選手簡稱」
👉 查詢榜單：「查榜」或「名單」

名額有限，請各位陀螺手把握時間踴躍報名！`;

      setAnnouncementText(defaultMsg);
      setSendResult(null);
      loadGroupStats();
    }
  }, [tournament, isOpen]);

  const loadGroupStats = async () => {
    setIsLoadingStats(true);
    try {
      const data = await fetchConnectedGroupsApi();
      setGroupStats(data);
      if (tournament && data.activeTournamentId === tournament.id) {
        setIsActiveSet(true);
      }
    } catch (err) {
      console.warn('Failed to load group stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleSetAsActive = async () => {
    if (!tournament) return;
    const res = await setActiveTournamentApi(tournament.id);
    if (res.success) {
      setIsActiveSet(true);
      await loadGroupStats();
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournament || !announcementText.trim()) return;

    setIsSending(true);
    setSendResult(null);

    try {
      const result = await broadcastAnnouncementApi(tournament.id, announcementText.trim());
      setSendResult(result);
      // Also automatically mark this tournament as active for bot command routing
      await setActiveTournamentApi(tournament.id);
      setIsActiveSet(true);
      await loadGroupStats();
    } catch (err) {
      console.error('Error broadcasting:', err);
      setSendResult({
        success: false,
        broadcastSuccess: false,
        pushedGroupCount: 0,
        totalGroups: 0,
        announcementText: announcementText
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen || !tournament) return null;

  const approvedCount = tournament.players?.filter((p) => p.status === 'approved').length || 0;
  const remainingSlots = Math.max(0, tournament.targetSize - approvedCount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto font-sans">
      <div className="bg-[#0a0c12] border border-[#06C755]/40 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-[0_0_60px_rgba(6,199,85,0.25)] text-[#e0e6ed] relative">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#06C755] via-[#00f2ff] to-[#7000ff] opacity-90" />

        <button
          id="btn-close-broadcast-modal"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 rounded-xl hover:bg-[#ffffff10] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#06C755]/15 border border-[#06C755]/30 flex items-center justify-center text-[#06C755] shadow-[0_0_20px_rgba(6,199,85,0.3)] shrink-0">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                補發賽事通知至 LINE 群組
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#06C755]/20 text-[#06C755] border border-[#06C755]/40 font-mono">
                即時群發廣播
              </span>
            </div>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              一鍵將當前賽事（含時間、名額、報名指令）推播至所有已連動的 LINE 群組與好友
            </p>
          </div>
        </div>

        {/* Active Tournament Binding Alert */}
        <div className="p-4 bg-[#05070a] border border-[#ffffff15] rounded-2xl mb-5 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-bold text-white font-mono">當前綁定之 LINE BOT 接收賽事：</span>
              <span className="text-xs font-bold text-[#00f2ff] font-mono">{tournament.name}</span>
            </div>
            {!isActiveSet && (
              <button
                type="button"
                id="btn-set-as-active-tournament"
                onClick={handleSetAsActive}
                className="px-2.5 py-1 bg-[#00f2ff]/20 hover:bg-[#00f2ff]/30 text-[#00f2ff] border border-[#00f2ff]/40 rounded-lg text-xs font-bold font-mono transition-colors"
              >
                設為 LINE BOT 當前主要賽事
              </button>
            )}
            {isActiveSet && (
              <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800 font-mono flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 已鎖定為回覆賽事
              </span>
            )}
          </div>
          <div className="text-[11px] text-gray-400 flex items-center gap-3 font-mono pt-1 border-t border-[#ffffff0a] flex-wrap">
            <span>已連線群組數：<strong className="text-white">{groupStats.totalCount}</strong> 間</span>
            <span>•</span>
            <span>目前剩餘名額：<strong className="text-emerald-400">{remainingSlots} / {tournament.targetSize}</strong></span>
            <span>•</span>
            <span>開賽時間：<strong className="text-white">{tournament.startTime || '依大會公布'}</strong></span>
          </div>
        </div>

        {/* Send Success / Warning Card */}
        {sendResult && (
          <div className={`p-4 rounded-2xl mb-5 border font-mono text-xs ${
            sendResult.success
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
              : 'bg-amber-950/40 border-amber-500/50 text-amber-200'
          }`}>
            <div className="flex items-center gap-2 font-bold text-sm mb-1.5">
              {sendResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400" />
              )}
              <span>{sendResult.success ? '🎉 訊息已成功推播！' : '⚠️ 推播部分完成或已排入佇列'}</span>
            </div>
            <div className="space-y-1 text-[11px] text-gray-300">
              <p>• 已推播至 <strong>{sendResult.pushedGroupCount || 0}</strong> 個已連動的 LINE 群組與聊天室</p>
              <p>• 好友 1-on-1 廣播通知：{sendResult.broadcastSuccess ? '✅ 已送達' : '⏳ 備援發送完畢'}</p>
              <p>• 群友現在回覆「+1 簡稱 陀螺」即可直接報名本場賽事！</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSendBroadcast} className="space-y-4 font-mono">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#06C755]" />
                推播內容自訂與預覽 (支援 Emoji 與多行排版)：
              </label>
              <button
                type="button"
                onClick={() => {
                  const startTimeDisplay = tournament.startTime || '依大會現場公布';
                  const deadlineDisplay = tournament.registrationDeadline || '額滿為止';
                  setAnnouncementText(`📢【戰鬥陀螺 X 雙翼賽事 賽程公告】
🏆 賽事場次：${tournament.name}
⚡ 賽制規模：${tournament.targetSize} 人雙翼對決（${tournament.matchTargetScore} 分制）
🔥 本場剩餘名額：${remainingSlots} / ${tournament.targetSize}
⏰ 開賽時間：${startTimeDisplay}
⏳ 報名截止時間：${deadlineDisplay}

📝 LINE 群友報名指令：
👉 本人報名：「+1 選手簡稱 陀螺名稱」
👉 替人代報：「++1 選手簡稱 陀螺名稱」
👉 取消報名：「-1 選手簡稱」
👉 查詢榜單：「查榜」或「名單」

名額有限，請各位陀螺手把握時間踴躍報名！`);
                }}
                className="text-[11px] text-[#00f2ff] hover:underline"
              >
                重置為標準格式
              </button>
            </div>
            <textarea
              id="textarea-broadcast-content"
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              rows={9}
              className="w-full bg-[#05070a] border border-[#ffffff15] rounded-2xl p-4 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-[#06C755] focus:ring-1 focus:ring-[#06C755] transition-all leading-relaxed"
              placeholder="輸入要發送給 LINE 群組的比賽資訊..."
              required
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              id="btn-cancel-broadcast"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-[#ffffff15] text-gray-400 hover:text-white hover:bg-[#ffffff05] text-xs font-bold transition-colors"
            >
              關閉
            </button>
            <button
              type="submit"
              id="btn-confirm-send-broadcast"
              disabled={isSending || !announcementText.trim()}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg flex items-center gap-2 transition-all ${
                isSending || !announcementText.trim()
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-[#06C755] hover:bg-[#05b34c] text-white shadow-[0_0_20px_rgba(6,199,85,0.4)] active:scale-95'
              }`}
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  推播發送中...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  立即補發至 LINE 群組
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
