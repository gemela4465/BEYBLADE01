import React, { useState, useEffect } from 'react';
import { Trophy, Users, Shield, Sparkles, X, Swords, Calendar, Clock, Bell, ChevronUp, ChevronDown } from 'lucide-react';
import { TournamentSize } from '../types';
import { SAMPLE_PLAYERS } from '../data/beybladeData';

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

  const getTodayIsoDate = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const getDefaultTimes = () => {
    const d = new Date();
    const startHour = String((d.getHours() + 2) % 24).padStart(2, '0');
    return {
      startTime: `${startHour}:00`,
      deadlineTime: compute30MinBefore(`${startHour}:00`)
    };
  };

  // Helper to compute time 30 mins before HH:mm
  function compute30MinBefore(timeStr: string): string {
    if (!timeStr || !timeStr.includes(':')) return '18:30';
    const [hStr, mStr] = timeStr.split(':');
    let h = parseInt(hStr, 10);
    let m = parseInt(mStr, 10);
    if (isNaN(h)) h = 19;
    if (isNaN(m)) m = 0;
    m -= 30;
    if (m < 0) {
      m += 60;
      h = (h - 1 + 24) % 24;
    }
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // Parse session number from initial string (e.g. "第1場" -> 1, "0" -> 0)
  const parseSessionNumberInt = (val?: string): number => {
    if (!val || val === '0' || val === '第0場' || val === '無') return 0;
    const match = val.match(/\d+/);
    return match ? parseInt(match[0], 10) : 1;
  };

  // Parse time part (HH:mm) from full datetime string like "2026/08/21 19:00"
  const extractTimeOnly = (dtStr?: string, defaultFallback: string = '19:00'): string => {
    if (!dtStr) return defaultFallback;
    const match = dtStr.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      return `${match[1].padStart(2, '0')}:${match[2]}`;
    }
    return defaultFallback;
  };

  const defaultTimes = getDefaultTimes();

  const [datePrefix, setDatePrefix] = useState(initialValues?.datePrefix || getTodayDateStr());
  const [sessionNum, setSessionNum] = useState<number>(parseSessionNumberInt(initialValues?.sessionNumber));
  const [customTitle, setCustomTitle] = useState(initialValues?.customTitle || '黃家、皇家戰鬥陀螺賽程');
  
  // Time only states (HH:mm)
  const [startTimeTime, setStartTimeTime] = useState<string>(
    extractTimeOnly(initialValues?.startTime, defaultTimes.startTime)
  );
  const [deadlineTime, setDeadlineTime] = useState<string>(
    extractTimeOnly(initialValues?.registrationDeadline, defaultTimes.deadlineTime)
  );
  
  const [targetSize, setTargetSize] = useState<TournamentSize>(currentSize);
  const [targetScore, setTargetScore] = useState(4);
  
  // Requirement 4: 種子選手數量 (Seeds) 預設 無
  const [seedMode, setSeedMode] = useState<'none' | 'manual' | 'random'>('none');
  const [seedCount, setSeedCount] = useState(0);
  
  // Requirement 5: 預載優質選手資料
  const [populateSamplePlayers, setPopulateSamplePlayers] = useState(false);
  const [broadcastToLine, setBroadcastToLine] = useState(true);

  useEffect(() => {
    if (isOpen) {
      if (initialValues?.datePrefix) setDatePrefix(initialValues.datePrefix);
      if (initialValues?.sessionNumber !== undefined) setSessionNum(parseSessionNumberInt(initialValues.sessionNumber));
      if (initialValues?.customTitle) setCustomTitle(initialValues.customTitle);
      if (initialValues?.startTime) {
        const sTime = extractTimeOnly(initialValues.startTime, defaultTimes.startTime);
        setStartTimeTime(sTime);
        if (!initialValues.registrationDeadline) {
          setDeadlineTime(compute30MinBefore(sTime));
        }
      }
      if (initialValues?.registrationDeadline) {
        setDeadlineTime(extractTimeOnly(initialValues.registrationDeadline, defaultTimes.deadlineTime));
      }
    }
  }, [isOpen, initialValues]);

  if (!isOpen) return null;

  const sizeOptions: TournamentSize[] = [4, 8, 16, 32, 64, 128];
  
  // Format Date for display and API
  const formattedDateSlash = datePrefix.length === 8 
    ? `${datePrefix.slice(0, 4)}/${datePrefix.slice(4, 6)}/${datePrefix.slice(6, 8)}`
    : datePrefix;
  
  // ISO date format for <input type="date" /> (YYYY-MM-DD)
  const isoDateFormat = datePrefix.length === 8
    ? `${datePrefix.slice(0, 4)}-${datePrefix.slice(4, 6)}-${datePrefix.slice(6, 8)}`
    : getTodayIsoDate();

  // Session formatted text
  const sessionFormatted = sessionNum === 0 ? '' : `第${sessionNum}場`;

  // Full tournament name preview: if session is 0, session number is NOT displayed
  const fullTournamentName = sessionFormatted 
    ? `${datePrefix.trim()}-${sessionFormatted}-${customTitle.trim()}`
    : `${datePrefix.trim()}-${customTitle.trim()}`;

  // Handle Date change from picker
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value; // "YYYY-MM-DD"
    if (rawVal) {
      const cleanDigits = rawVal.replace(/-/g, '');
      setDatePrefix(cleanDigits);
    }
  };

  // Handle Start Time change -> Automatically update deadline to 30 mins before
  const handleStartTimeChange = (newTime: string) => {
    setStartTimeTime(newTime);
    const newDeadline = compute30MinBefore(newTime);
    setDeadlineTime(newDeadline);
  };

  // Handle Quality Players Preload toggle
  const handleQualityPlayersToggle = (checked: boolean) => {
    setPopulateSamplePlayers(checked);
    if (checked) {
      // Quality players count from data (e.g. 16)
      const qualityCount = SAMPLE_PLAYERS.length;
      if (targetSize < qualityCount) {
        // Automatically adjust scale to most suitable bracket size (e.g. 16)
        const suitable = sizeOptions.find((s) => s >= qualityCount) || 16;
        setTargetSize(suitable);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Combine date and time
    const fullStartTime = `${formattedDateSlash} ${startTimeTime}`;
    const fullDeadlineTime = `${formattedDateSlash} ${deadlineTime}`;

    onCreate({
      name: fullTournamentName,
      datePrefix: datePrefix.trim(),
      sessionNumber: sessionFormatted,
      customTitle: customTitle.trim(),
      startTime: fullStartTime,
      registrationDeadline: fullDeadlineTime,
      targetSize,
      targetScore: Math.min(Math.max(targetScore, 1), 11),
      seedMode,
      seedCount: seedMode === 'none' ? 0 : Math.min(seedCount, targetSize / 2),
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

        {/* Modal Header (Requirement: 新開賽事設定) */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#00f2ff]/15 border border-[#00f2ff]/30 flex items-center justify-center text-[#00f2ff] shadow-[0_0_15px_rgba(0,242,255,0.2)]">
            <Swords className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-wide">🏆 新開賽事設定</h2>
            <p className="text-xs text-gray-400 font-mono">前綴日期 + 場次 + 自訂名稱 • 設定開賽與報名截止時間</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name Preview Banner */}
          <div className="p-3.5 bg-[#05070a] border border-[#00f2ff]/30 rounded-2xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-[#00f2ff] font-bold block">
                🏷️ 賽程全名預覽
              </span>
              {sessionNum === 0 && (
                <span className="text-[10px] font-mono text-gray-400 bg-gray-800/80 px-2 py-0.5 rounded">
                  場次設為0（不顯示場次）
                </span>
              )}
            </div>
            <div className="text-base font-black text-white font-mono break-all tracking-tight text-cyan-300">
              {fullTournamentName}
            </div>
          </div>

          {/* Tournament Name Structured Breakdown: Compact Date & Session, Enlarged Tournament Name */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 font-mono items-end">
            {/* Date Prefix: Compact with Date Picker popup (Requirement: 點擊後跳出日期窗選擇) */}
            <div className="sm:col-span-3 space-y-1">
              <label className="block text-[11px] font-semibold text-gray-300 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#00f2ff]" />
                <span>日期前綴</span>
              </label>
              <div className="relative group">
                <input
                  id="input-tournament-date-picker"
                  type="date"
                  value={isoDateFormat}
                  onChange={handleDateChange}
                  className="w-full px-2.5 py-2 bg-[#05070a] border border-[#ffffff18] group-hover:border-[#00f2ff]/60 rounded-xl text-white focus:outline-none focus:border-[#00f2ff] text-xs font-mono cursor-pointer transition-colors"
                  title="點擊選擇比賽日期"
                />
              </div>
              <span className="text-[10px] text-cyan-400 block font-mono">前綴：{datePrefix}</span>
            </div>

            {/* Session Number: Compact with Stepper (Requirement: 點擊後跳出第?場可上下選擇，選0則不顯示場次) */}
            <div className="sm:col-span-3 space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-semibold text-gray-300">
                  場次編號
                </label>
                <span className="text-[10px] text-gray-400">{sessionNum === 0 ? '不顯示' : `第${sessionNum}場`}</span>
              </div>
              <div className="flex items-center bg-[#05070a] border border-[#ffffff18] rounded-xl overflow-hidden focus-within:border-[#00f2ff]">
                <select
                  id="select-tournament-session"
                  value={sessionNum}
                  onChange={(e) => setSessionNum(parseInt(e.target.value, 10))}
                  className="w-full px-2.5 py-2 bg-transparent text-white focus:outline-none text-xs font-mono cursor-pointer appearance-none"
                >
                  <option value={0} className="bg-[#0a0c12] text-gray-400">0 (不顯示場次)</option>
                  {Array.from({ length: 15 }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num} className="bg-[#0a0c12] text-white">
                      第 {num} 場
                    </option>
                  ))}
                </select>
                <div className="flex flex-col border-l border-[#ffffff15] shrink-0">
                  <button
                    type="button"
                    onClick={() => setSessionNum((prev) => Math.min(prev + 1, 20))}
                    className="p-1 hover:bg-[#ffffff15] text-gray-300 hover:text-cyan-300"
                    title="增加場次"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSessionNum((prev) => Math.max(prev - 1, 0))}
                    className="p-1 hover:bg-[#ffffff15] text-gray-300 hover:text-cyan-300 border-t border-[#ffffff10]"
                    title="減少場次 (0為不顯示)"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <span className="text-[10px] text-gray-400 block font-mono">
                {sessionNum === 0 ? '✓ 0=無場次' : `✓ 第${sessionNum}場`}
              </span>
            </div>

            {/* Custom Tournament Title: Enlarged Prominently (Requirement: 賽事名稱 放大) */}
            <div className="sm:col-span-6 space-y-1">
              <label className="block text-xs font-bold text-cyan-300 flex items-center justify-between">
                <span>賽事名稱 (主標題)</span>
                <span className="text-[10px] text-gray-400 font-normal">可自訂主要賽事名稱</span>
              </label>
              <input
                id="input-tournament-custom-name"
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="例如：黃家、皇家戰鬥陀螺賽程"
                required
                className="w-full px-3.5 py-2.5 bg-[#05070a] border-2 border-[#00f2ff]/40 rounded-xl text-white font-bold text-sm sm:text-base focus:outline-none focus:border-[#00f2ff] font-mono shadow-[0_0_15px_rgba(0,242,255,0.1)] transition-all"
              />
              <span className="text-[10px] text-gray-400 block font-mono truncate">
                名稱：{customTitle}
              </span>
            </div>
          </div>

          {/* Start Time & Registration Deadline (Requirement 1 & 2: 開賽時間只挑選時間，修改後截止時間自動提前30分，報名截止時間可挑選時間) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
            {/* Start Time (Time Picker only, date is fixed) */}
            <div className="p-3.5 bg-[#05070a] rounded-xl border border-[#00f2ff]/30 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#00f2ff]" />
                  <span>1. 開賽時間 (Start Time)</span>
                </label>
                <span className="text-[10px] text-cyan-400 font-bold">{formattedDateSlash}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="input-tournament-start-time"
                  type="time"
                  value={startTimeTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-black border border-[#00f2ff]/40 rounded-lg text-[#00f2ff] text-sm font-bold focus:outline-none focus:border-[#00f2ff] cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-gray-400">
                <span>變更時間自動連動截止時間</span>
                <span className="text-cyan-300 font-bold">{formattedDateSlash} {startTimeTime}</span>
              </div>
            </div>

            {/* Registration Deadline (Time Picker only, defaults to 30 mins before) */}
            <div className="p-3.5 bg-[#05070a] rounded-xl border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>2. 報名截止時間 (Deadline)</span>
                </label>
                <span className="text-[10px] text-amber-400 font-bold">{formattedDateSlash}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="input-tournament-deadline"
                  type="time"
                  value={deadlineTime}
                  onChange={(e) => setDeadlineTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-black border border-amber-500/40 rounded-lg text-amber-300 text-sm font-bold focus:outline-none focus:border-amber-400 cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-gray-400">
                <span className="text-amber-400/90">開賽前 30 分鐘自動截止</span>
                <span className="text-amber-300 font-bold">{formattedDateSlash} {deadlineTime}</span>
              </div>
            </div>
          </div>

          {/* Bracket Size (Requirement 3: 預定幾人賽制規模) */}
          <div>
            <label className="block text-xs font-mono font-semibold text-gray-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>3. 預定幾人賽制規模</span>
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
                    if (seedCount > size / 2) setSeedCount(0);
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

          {/* Target Score & Seeds (Requirement 4: 種子選手數量預設 無) */}
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

            {/* Seed Count (Requirement 4: 種子選手數量 (Seeds) 預設 無) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-gray-300">
                  4. 種子選手數量 (Seeds)
                </label>
                <span className="text-purple-400 font-bold">
                  {seedCount === 0 ? '無種子' : `${seedCount} 種子`}
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-mono">
                {[0, 2, 4, 8].filter((s) => s <= targetSize / 2).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setSeedCount(s);
                      if (s === 0) setSeedMode('none');
                      else setSeedMode('manual');
                    }}
                    className={`flex-1 py-1.5 rounded-lg font-semibold border transition-all ${
                      (s === 0 && (seedMode === 'none' || seedCount === 0)) || (s > 0 && seedMode !== 'none' && seedCount === s)
                        ? 'bg-[#7000ff]/25 border-[#7000ff] text-purple-300 shadow-[0_0_10px_rgba(112,0,255,0.25)]'
                        : 'bg-[#11141d] border-[#ffffff10] text-gray-400 hover:text-white'
                    }`}
                  >
                    {s === 0 ? '無' : `${s} 種子`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Broadcast to LINE Checkbox */}
          <div className="p-3 bg-[#05070a] rounded-xl border border-[#06C755]/40 flex items-center justify-between font-mono">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#06C755]/20 text-[#06C755] flex items-center justify-center font-bold shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>新開賽自動通知 LINE 群組</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800">
                    即時廣播
                  </span>
                </div>
                <div className="text-[11px] text-gray-400">建立後自動透過 LINE 發送本場開賽與截止時間</div>
              </div>
            </div>
            <input
              id="checkbox-line-broadcast"
              type="checkbox"
              checked={broadcastToLine}
              onChange={(e) => setBroadcastToLine(e.target.checked)}
              className="w-5 h-5 accent-[#06C755] rounded cursor-pointer shrink-0"
            />
          </div>

          {/* Quality Players Preload (Requirement 5: 預載優質選手資料，全部載入並自動調整規模) */}
          <div className="p-3.5 bg-[#05070a] rounded-xl border border-[#00f2ff]/30 flex items-center justify-between font-mono">
            <div className="flex items-center gap-2.5 pr-2">
              <div className="w-8 h-8 rounded-lg bg-[#00f2ff]/15 text-[#00f2ff] flex items-center justify-center font-bold shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>5. 預載優質選手資料 (含 LINE 帳號 & 陀螺配裝)</span>
                  <span className="text-[10px] text-cyan-300 bg-cyan-950/80 px-1.5 py-0.2 rounded border border-cyan-800">
                    全載入
                  </span>
                </div>
                <div className="text-[10px] text-gray-400 leading-snug mt-0.5">
                  不管幾人賽事全部載入，超過預定幾人賽事規模 自動調整 預定幾人賽制規模 最適合人數 ({SAMPLE_PLAYERS.length} 位優質選手)
                </div>
              </div>
            </div>
            <input
              id="checkbox-sample-players"
              type="checkbox"
              checked={populateSamplePlayers}
              onChange={(e) => handleQualityPlayersToggle(e.target.checked)}
              className="w-5 h-5 accent-[#00f2ff] rounded cursor-pointer shrink-0"
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
