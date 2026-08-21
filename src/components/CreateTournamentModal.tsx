import React, { useState, useEffect } from 'react';
import { Trophy, Users, Shield, Sparkles, X, Swords, Calendar, Clock, Bell, RefreshCw } from 'lucide-react';
import { TournamentSize } from '../types';

interface CreateTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (config: {
    name: string;
    datePrefix: string;
    sessionNumber: string;
    customTitle: string;
    startTime: string;
    registrationDeadline: string;
    targetSize: TournamentSize;
    targetScore: number;
    seedMode: 'none' | 'manual' | 'random';
    seedCount: number;
    populateSamplePlayers: boolean;
    broadcastToLine?: boolean;
  }) => void;
  currentSize?: TournamentSize;
  initialValues?: {
    datePrefix?: string;
    sessionNumber?: string;
    customTitle?: string;
    startTime?: string;
    registrationDeadline?: string;
  };
}

export const CreateTournamentModal: React.FC<CreateTournamentModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  currentSize = 16,
  initialValues
}) => {
  const getTodayDateStr = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
  };

  const getDefaultTimes = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const startHour = String((d.getHours() + 2) % 24).padStart(2, '0');
    const deadlineHour = String((d.getHours() + 1) % 24).padStart(2, '0');
    return {
      start: `${yyyy}/${mm}/${dd} ${startHour}:00`,
      deadline: `${yyyy}/${mm}/${dd} ${deadlineHour}:00`
    };
  };

  const defaultTimes = getDefaultTimes();

  const [datePrefix, setDatePrefix] = useState(initialValues?.datePrefix || getTodayDateStr());
  const [sessionNumber, setSessionNumber] = useState(initialValues?.sessionNumber || '第1場');
  const [customTitle, setCustomTitle] = useState(initialValues?.customTitle || '黃家、皇家戰鬥陀螺賽程');
  
  const [startTime, setStartTime] = useState(initialValues?.startTime || defaultTimes.start);
  const [registrationDeadline, setRegistrationDeadline] = useState(initialValues?.registrationDeadline || defaultTimes.deadline);
  
  const [targetSize, setTargetSize] = useState<TournamentSize>(currentSize);
  const [targetScore, setTargetScore] = useState(4);
  const [seedMode, setSeedMode] = useState<'none' | 'manual' | 'random'>('manual');
  const [seedCount, setSeedCount] = useState(4);
  const [populateSamplePlayers, setPopulateSamplePlayers] = useState(false);
  const [broadcastToLine, setBroadcastToLine] = useState(true);

  useEffect(() => {
    if (isOpen) {
      if (initialValues?.datePrefix) setDatePrefix(initialValues.datePrefix);
      if (initialValues?.sessionNumber) setSessionNumber(initialValues.sessionNumber);
      if (initialValues?.customTitle) setCustomTitle(initialValues.customTitle);
      if (initialValues?.startTime) setStartTime(initialValues.startTime);
      if (initialValues?.registrationDeadline) setRegistrationDeadline(initialValues.registrationDeadline);
    }
  }, [isOpen, initialValues]);

  if (!isOpen) return null;

  const sizeOptions: TournamentSize[] = [4, 8, 16, 32, 64, 128];
  const fullTournamentName = `${datePrefix.trim()}-${sessionNumber.trim()}-${customTitle.trim()}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      name: fullTournamentName,
      datePrefix: datePrefix.trim(),
      sessionNumber: sessionNumber.trim(),
      customTitle: customTitle.trim(),
      startTime: startTime.trim(),
      registrationDeadline: registrationDeadline.trim(),
      targetSize,
      targetScore: Math.min(Math.max(targetScore, 1), 11),
      seedMode,
      seedCount: Math.min(seedCount, targetSize / 2),
      populateSamplePlayers,
      broadcastToLine
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0a0c12] border border-[#00f2ff]/30 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-[0_0_60px_rgba(0,0,0,0.9)] text-[#e0e6ed] relative my-8">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#06C755] via-[#00f2ff] to-[#7000ff] opacity-90" />

        <button
          id="btn-close-create-modal"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 rounded-xl hover:bg-[#ffffff10] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#00f2ff]/15 border border-[#00f2ff]/30 flex items-center justify-center text-[#00f2ff] shadow-[0_0_15px_rgba(0,242,255,0.2)]">
            <Swords className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-wide">🏆 新開賽事設定 (含 LINE 自動通知)</h2>
            <p className="text-xs text-gray-400 font-mono">前綴日期 + 場次 + 自訂名稱 • 設定開賽與報名截止時間</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name Preview Banner */}
          <div className="p-3.5 bg-[#05070a] border border-[#00f2ff]/30 rounded-2xl space-y-1">
            <span className="text-[10px] font-mono uppercase text-[#00f2ff] font-bold block">
              🏷️ 賽程全名預覽 (前綴 日期 + 場次 + 名稱)
            </span>
            <div className="text-sm font-black text-white font-mono break-all">
              {fullTournamentName}
            </div>
          </div>

          {/* Tournament Name Structured Breakdown (Requirement 1.1) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
            {/* Date Prefix */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#00f2ff]" />
                <span>日期前綴 (YYYYMMDD)</span>
              </label>
              <input
                id="input-tournament-date"
                type="text"
                value={datePrefix}
                onChange={(e) => setDatePrefix(e.target.value)}
                placeholder="20260821"
                required
                className="w-full px-3.5 py-2.5 bg-[#05070a] border border-[#ffffff15] rounded-xl text-white focus:outline-none focus:border-[#00f2ff] text-xs font-mono"
              />
            </div>

            {/* Session Number */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                場次編號
              </label>
              <input
                id="input-tournament-session"
                type="text"
                value={sessionNumber}
                onChange={(e) => setSessionNumber(e.target.value)}
                placeholder="第1場"
                required
                className="w-full px-3.5 py-2.5 bg-[#05070a] border border-[#ffffff15] rounded-xl text-white focus:outline-none focus:border-[#00f2ff] text-xs font-mono"
              />
            </div>

            {/* Custom Tournament Title */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                賽事名稱
              </label>
              <input
                id="input-tournament-custom-name"
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="雙翼極限爭霸賽"
                required
                className="w-full px-3.5 py-2.5 bg-[#05070a] border border-[#ffffff15] rounded-xl text-white focus:outline-none focus:border-[#00f2ff] text-xs font-mono"
              />
            </div>
          </div>

          {/* Start Time & Registration Deadline (Requirement 1 & 2) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
            {/* Start Time */}
            <div className="p-3 bg-[#05070a] rounded-xl border border-[#ffffff10] space-y-1.5">
              <label className="block text-xs font-semibold text-white flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#00f2ff]" />
                <span>開賽時間 (Start Time)</span>
              </label>
              <input
                id="input-tournament-start-time"
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="例如: 2026/8/21 19:00"
                required
                className="w-full px-3 py-2 bg-black border border-[#ffffff15] rounded-lg text-[#00f2ff] text-xs font-bold focus:outline-none focus:border-[#00f2ff]"
              />
              <span className="text-[10px] text-gray-400 block">格式：YYYY/M/D HH:MM</span>
            </div>

            {/* Registration Deadline */}
            <div className="p-3 bg-[#05070a] rounded-xl border border-[#ffffff10] space-y-1.5">
              <label className="block text-xs font-semibold text-white flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>報名截止時間 (Deadline)</span>
              </label>
              <input
                id="input-tournament-deadline"
                type="text"
                value={registrationDeadline}
                onChange={(e) => setRegistrationDeadline(e.target.value)}
                placeholder="例如: 2026/8/21 18:00"
                required
                className="w-full px-3 py-2 bg-black border border-[#ffffff15] rounded-lg text-amber-300 text-xs font-bold focus:outline-none focus:border-amber-400"
              />
              <span className="text-[10px] text-gray-400 block">逾時 LINE BOT 自動回覆報名已截止</span>
            </div>
          </div>

          {/* Bracket Size */}
          <div>
            <label className="block text-xs font-mono font-semibold text-gray-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>預定幾人賽制規模 (雙翼對稱)</span>
              <span className="text-[#00f2ff] font-bold">{targetSize} 人</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {sizeOptions.map((size) => (
                <button
                  key={size}
                  type="button"
                  id={`btn-size-${size}`}
                  onClick={() => {
                    setTargetSize(size);
                    if (seedCount > size / 2) setSeedCount(Math.max(2, size / 4));
                  }}
                  className={`py-2 px-3 rounded-xl font-mono font-bold text-xs border transition-all ${
                    targetSize === size
                      ? 'bg-[#00f2ff]/20 border-[#00f2ff] text-[#00f2ff] shadow-[0_0_15px_rgba(0,242,255,0.25)]'
                      : 'bg-[#11141d] border-[#ffffff10] text-gray-400 hover:bg-[#ffffff10] hover:text-white'
                  }`}
                >
                  {size} 人
                </button>
              ))}
            </div>
          </div>

          {/* Target Score & Seeds */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
            <div>
              <label className="block font-semibold text-gray-300 mb-1.5 flex items-center justify-between">
                <span>獲勝目標分 (0-11 分)</span>
                <span className="text-[#00f2ff] font-bold">{targetScore} 分獲勝</span>
              </label>
              <div className="flex items-center gap-1.5">
                {[3, 4, 7, 11].map((pts) => (
                  <button
                    key={pts}
                    type="button"
                    onClick={() => setTargetScore(pts)}
                    className={`flex-1 py-1.5 rounded-lg font-semibold border transition-all ${
                      targetScore === pts
                        ? 'bg-[#00f2ff]/20 border-[#00f2ff] text-[#00f2ff]'
                        : 'bg-[#11141d] border-[#ffffff10] text-gray-400 hover:text-white'
                    }`}
                  >
                    {pts} 分制
                  </button>
                ))}
              </div>
            </div>

            {/* Seed Count */}
            <div>
              <label className="block font-semibold text-gray-300 mb-1.5">
                種子選手數量 (Seeds)
              </label>
              <div className="flex items-center gap-1.5 font-mono">
                {[0, 2, 4, 8].filter((s) => s <= targetSize / 2).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setSeedCount(s);
                      if (s === 0) setSeedMode('none');
                      else if (seedMode === 'none') setSeedMode('manual');
                    }}
                    className={`flex-1 py-1.5 rounded-lg font-semibold border transition-all ${
                      seedCount === s
                        ? 'bg-[#7000ff]/25 border-[#7000ff] text-purple-300'
                        : 'bg-[#11141d] border-[#ffffff10] text-gray-400 hover:text-white'
                    }`}
                  >
                    {s === 0 ? '無' : `${s} 種子`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Broadcast to LINE Checkbox (Requirement 1) */}
          <div className="p-3 bg-[#05070a] rounded-xl border border-[#06C755]/40 flex items-center justify-between font-mono">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#06C755]/20 text-[#06C755] flex items-center justify-center font-bold">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>新開賽自動通知 LINE 群組</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800">
                    即時廣播
                  </span>
                </div>
                <div className="text-[11px] text-gray-400">建立後自動透過 LINE Messaging API 發送本場開賽與截止時間</div>
              </div>
            </div>
            <input
              id="checkbox-line-broadcast"
              type="checkbox"
              checked={broadcastToLine}
              onChange={(e) => setBroadcastToLine(e.target.checked)}
              className="w-5 h-5 accent-[#06C755] rounded cursor-pointer"
            />
          </div>

          {/* Populate sample */}
          <div className="p-3 bg-[#05070a] rounded-xl border border-[#ffffff10] flex items-center justify-between font-mono">
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-[#00f2ff]" />
              <div>
                <div className="text-xs font-semibold text-white">預載示範選手資料 (含 LINE 帳號 & 陀螺配裝)</div>
                <div className="text-[10px] text-gray-400">快速填入 {targetSize} 位示範選手以利快速預覽樹狀圖</div>
              </div>
            </div>
            <input
              id="checkbox-sample-players"
              type="checkbox"
              checked={populateSamplePlayers}
              onChange={(e) => setPopulateSamplePlayers(e.target.checked)}
              className="w-5 h-5 accent-[#00f2ff] rounded cursor-pointer"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#ffffff10]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#11141d] hover:bg-[#ffffff15] text-gray-300 text-xs font-semibold transition-colors border border-[#ffffff10]"
            >
              取消
            </button>
            <button
              type="submit"
              id="btn-confirm-create"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#06C755] via-[#00f2ff] to-[#7000ff] hover:opacity-95 text-black text-xs font-mono font-black uppercase tracking-wider shadow-[0_0_25px_rgba(0,242,255,0.4)] transition-all flex items-center gap-2 active:scale-95"
            >
              <Trophy className="w-4 h-4 text-black" />
              確認開賽並發布至 LINE
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

