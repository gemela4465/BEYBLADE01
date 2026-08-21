import React, { useState } from 'react';
import { RefreshCw, X, Users, AlertTriangle, Calendar, Clock, ShieldCheck, Check } from 'lucide-react';
import { Tournament } from '../types';

interface ResetTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament;
  onReset: (options: {
    keepApproved: boolean;
    newSessionNumber?: string;
    newCustomTitle?: string;
    newStartTime?: string;
    newDeadline?: string;
  }) => void;
}

export const ResetTournamentModal: React.FC<ResetTournamentModalProps> = ({
  isOpen,
  onClose,
  tournament,
  onReset
}) => {
  const approvedPlayersCount = tournament.players.filter(p => p.status === 'approved').length;
  const [keepApproved, setKeepApproved] = useState(true);
  const [sessionNumber, setSessionNumber] = useState(tournament.sessionNumber || '第1場');
  const [customTitle, setCustomTitle] = useState(tournament.customTitle || tournament.name);
  const [startTime, setStartTime] = useState(tournament.startTime || '');
  const [registrationDeadline, setRegistrationDeadline] = useState(tournament.registrationDeadline || '');

  if (!isOpen) return null;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    onReset({
      keepApproved,
      newSessionNumber: sessionNumber,
      newCustomTitle: customTitle,
      newStartTime: startTime,
      newDeadline: registrationDeadline
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0a0c12] border border-amber-500/30 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-[0_0_60px_rgba(0,0,0,0.9)] text-[#e0e6ed] relative">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-400 opacity-90" />

        <button
          id="btn-close-reset-modal"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 rounded-xl hover:bg-[#ffffff10] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-wide">賽事重置 / 重新開賽</h2>
            <p className="text-xs text-gray-400 font-mono">賽前取消並重設賽事狀態，可選擇是否保留已審核選手</p>
          </div>
        </div>

        <div className="p-3.5 bg-amber-950/20 border border-amber-500/30 rounded-2xl mb-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200/90 leading-relaxed font-mono">
            重置將會清除對戰樹狀籤表與進行中的對戰比分，並將賽事狀態恢復為「未開賽 (Pending)」。
          </div>
        </div>

        <form onSubmit={handleConfirm} className="space-y-4 font-mono">
          {/* Keep Approved Option (Requirement 7) */}
          <div className="p-4 bg-[#05070a] border border-[#ffffff15] rounded-2xl space-y-3">
            <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
              <span>已審核選手保留設定</span>
              <span className="text-[#00f2ff] font-bold">目前已審核 {approvedPlayersCount} 人</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                id="btn-keep-approved-yes"
                onClick={() => setKeepApproved(true)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  keepApproved
                    ? 'bg-[#00f2ff]/15 border-[#00f2ff] text-white shadow-[0_0_15px_rgba(0,242,255,0.2)]'
                    : 'bg-[#11141d] border-[#ffffff10] text-gray-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-400 mb-1">
                  <ShieldCheck className="w-4 h-4" />
                  保留已審核選手
                </div>
                <div className="text-[10px] text-gray-400">保留審核通過選手，僅清除待審核與樹狀圖籤位</div>
              </button>

              <button
                type="button"
                id="btn-keep-approved-no"
                onClick={() => setKeepApproved(false)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  !keepApproved
                    ? 'bg-rose-500/15 border-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                    : 'bg-[#11141d] border-[#ffffff10] text-gray-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-rose-400 mb-1">
                  <X className="w-4 h-4" />
                  清空所有選手名單
                </div>
                <div className="text-[10px] text-gray-400">完全清空所有報名選手，從 0 人重新開放報名</div>
              </button>
            </div>
          </div>

          {/* Adjust session and times if needed */}
          <div className="p-3.5 bg-[#05070a] border border-[#ffffff10] rounded-2xl space-y-3">
            <div className="text-xs font-bold text-gray-300">更新場次與時程 (選填)</div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">場次編號</label>
                <input
                  type="text"
                  value={sessionNumber}
                  onChange={(e) => setSessionNumber(e.target.value)}
                  placeholder="第2場"
                  className="w-full px-3 py-2 bg-[#11141d] border border-[#ffffff15] rounded-xl text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1">賽事名稱</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="自訂名稱"
                  className="w-full px-3 py-2 bg-[#11141d] border border-[#ffffff15] rounded-xl text-white text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">開賽時間</label>
                <input
                  type="text"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="2026/8/21 19:00"
                  className="w-full px-3 py-2 bg-[#11141d] border border-[#ffffff15] rounded-xl text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1">報名截止時間</label>
                <input
                  type="text"
                  value={registrationDeadline}
                  onChange={(e) => setRegistrationDeadline(e.target.value)}
                  placeholder="2026/8/21 18:00"
                  className="w-full px-3 py-2 bg-[#11141d] border border-[#ffffff15] rounded-xl text-white text-xs"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#ffffff10]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#11141d] hover:bg-[#ffffff15] text-gray-300 text-xs font-semibold"
            >
              取消
            </button>
            <button
              type="submit"
              id="btn-confirm-reset-tournament"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:opacity-95 text-black text-xs font-black uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all flex items-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4 text-black" />
              確認重置賽事
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
