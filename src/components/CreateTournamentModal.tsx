import React, { useState } from 'react';
import { Trophy, Users, Shield, Sparkles, X, Swords } from 'lucide-react';
import { TournamentSize } from '../types';

interface CreateTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (config: {
    name: string;
    targetSize: TournamentSize;
    targetScore: number;
    seedMode: 'none' | 'manual' | 'random';
    seedCount: number;
    populateSamplePlayers: boolean;
  }) => void;
  currentSize?: TournamentSize;
}

export const CreateTournamentModal: React.FC<CreateTournamentModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  currentSize = 16
}) => {
  const [name, setName] = useState('2026 戰鬥陀螺 X 雙翼極限爭霸公開賽');
  const [targetSize, setTargetSize] = useState<TournamentSize>(currentSize);
  const [targetScore, setTargetScore] = useState(4);
  const [seedMode, setSeedMode] = useState<'none' | 'manual' | 'random'>('manual');
  const [seedCount, setSeedCount] = useState(4);
  const [populateSamplePlayers, setPopulateSamplePlayers] = useState(true);

  if (!isOpen) return null;

  const sizeOptions: TournamentSize[] = [4, 8, 16, 32, 64, 128];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      name: name.trim() || '戰鬥陀螺雙翼對戰賽',
      targetSize,
      targetScore: Math.min(Math.max(targetScore, 1), 11),
      seedMode,
      seedCount: Math.min(seedCount, targetSize / 2),
      populateSamplePlayers
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0a0c12] border border-[#ffffff15] rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-[0_0_60px_rgba(0,0,0,0.9)] text-[#e0e6ed] relative">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#00f2ff] to-transparent opacity-80" />

        <button
          id="btn-close-create-modal"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 rounded-xl hover:bg-[#ffffff10] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#00f2ff]/15 border border-[#00f2ff]/30 flex items-center justify-center text-[#00f2ff] shadow-[0_0_15px_rgba(0,242,255,0.2)]">
            <Swords className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-wide">主辦者開賽設定</h2>
            <p className="text-xs text-gray-400 font-mono">設定賽程名稱、預定規模 (4-128人) 與種子機制</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Tournament Name */}
          <div>
            <label className="block text-xs font-mono font-semibold text-gray-300 uppercase tracking-wider mb-2">
              賽事名稱 (Tournament Name)
            </label>
            <input
              id="input-tournament-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="請輸入賽事名稱..."
              required
              className="w-full px-4 py-2.5 bg-[#05070a] border border-[#ffffff15] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#00f2ff] font-mono transition-colors text-sm"
            />
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
                  className={`py-2.5 px-3 rounded-xl font-mono font-bold text-sm border transition-all ${
                    targetSize === size
                      ? 'bg-[#00f2ff]/20 border-[#00f2ff] text-[#00f2ff] shadow-[0_0_15px_rgba(0,242,255,0.25)]'
                      : 'bg-[#11141d] border-[#ffffff10] text-gray-400 hover:bg-[#ffffff10] hover:text-white'
                  }`}
                >
                  {size} 人
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 font-mono mt-1.5">
              左翼 {targetSize / 2} 人 vs 右翼 {targetSize / 2} 人，最終於中央決賽會師，並設有季殿軍戰。
            </p>
          </div>

          {/* Target Score */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>單場獲勝目標比分 (0-11 分)</span>
                <span className="text-[#00f2ff] font-bold">{targetScore} 分獲勝</span>
              </label>
              <div className="flex items-center gap-2">
                {[3, 4, 7, 11].map((pts) => (
                  <button
                    key={pts}
                    type="button"
                    onClick={() => setTargetScore(pts)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      targetScore === pts
                        ? 'bg-[#00f2ff]/20 border-[#00f2ff] text-[#00f2ff]'
                        : 'bg-[#11141d] border-[#ffffff10] text-gray-400 hover:text-white'
                    }`}
                  >
                    {pts} 分制
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                陀螺標準賽通常為 4 分制 (Over 2分 / Burst 2分 / Xtreme 3分)
              </p>
            </div>

            {/* Seed Count */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                種子成員數量 (Seeds)
              </label>
              <div className="flex items-center gap-2 font-mono">
                {[0, 2, 4, 8].filter((s) => s <= targetSize / 2).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setSeedCount(s);
                      if (s === 0) setSeedMode('none');
                      else if (seedMode === 'none') setSeedMode('manual');
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      seedCount === s
                        ? 'bg-[#7000ff]/25 border-[#7000ff] text-purple-300'
                        : 'bg-[#11141d] border-[#ffffff10] text-gray-400 hover:text-white'
                    }`}
                  >
                    {s === 0 ? '無' : `${s} 種子`}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-500 mt-1 font-mono">種子選手依標準雙翼保護法分流兩翼</p>
            </div>
          </div>

          {/* Seed Mode */}
          {seedCount > 0 && (
            <div>
              <label className="block text-xs font-mono font-semibold text-gray-300 uppercase tracking-wider mb-2">
                種子產生方式 (Seed Assignment)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  id="btn-seed-manual"
                  onClick={() => setSeedMode('manual')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    seedMode === 'manual'
                      ? 'bg-[#7000ff]/20 border-[#7000ff] text-purple-200'
                      : 'bg-[#11141d] border-[#ffffff10] text-gray-400 hover:bg-[#ffffff10]'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm text-white mb-1">
                    <Shield className="w-4 h-4 text-purple-400" />
                    指定種子成員
                  </div>
                  <div className="text-xs text-gray-400 font-mono">由主辦者在成員名單手動指派第 1~{seedCount} 號種子</div>
                </button>

                <button
                  type="button"
                  id="btn-seed-random"
                  onClick={() => setSeedMode('random')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    seedMode === 'random'
                      ? 'bg-[#7000ff]/20 border-[#7000ff] text-purple-200'
                      : 'bg-[#11141d] border-[#ffffff10] text-gray-400 hover:bg-[#ffffff10]'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm text-white mb-1">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    隨機抽籤產生
                  </div>
                  <div className="text-xs text-gray-400 font-mono">系統自動從審核名單隨機抽選 {seedCount} 名種子</div>
                </button>
              </div>
            </div>
          )}

          {/* Populate sample */}
          <div className="p-3 bg-[#05070a] rounded-xl border border-[#ffffff10] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-[#00f2ff]" />
              <div>
                <div className="text-sm font-semibold text-white">預載示範參賽者資料 (含 LINE 帳號 & 陀螺配裝)</div>
                <div className="text-xs text-gray-400 font-mono">快速填入 {targetSize} 位陀螺選手方便立即測試賽程</div>
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
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#00f2ff] to-[#7000ff] hover:opacity-90 text-black text-xs font-mono font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(0,242,255,0.4)] transition-all flex items-center gap-2"
            >
              <Trophy className="w-4 h-4 text-black" />
              確認開賽並生成設定
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
