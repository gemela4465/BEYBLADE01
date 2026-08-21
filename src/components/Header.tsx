import React from 'react';
import { Trophy, Users, Shield, Award, Swords, Link2, Monitor, RefreshCw, Plus, Download, Radio, Bot } from 'lucide-react';
import { Tournament } from '../types';

interface HeaderProps {
  tournament: Tournament | null;
  activeTab: 'bracket' | 'players' | 'line-invite' | 'scoreboard' | 'podium';
  onTabChange: (tab: 'bracket' | 'players' | 'line-invite' | 'scoreboard' | 'podium') => void;
  onOpenCreateModal: () => void;
  onOpenExportModal: () => void;
  onToggleLineOnlyMode?: () => void;
  pendingCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  tournament,
  activeTab,
  onTabChange,
  onOpenCreateModal,
  onOpenExportModal,
  onToggleLineOnlyMode,
  pendingCount
}) => {
  const approvedCount = tournament?.players.filter((p) => p.status === 'approved').length || 0;
  const completedMatches = tournament?.matches.filter((m) => m.status === 'completed' || m.status === 'bye').length || 0;
  const totalMatches = tournament?.matches.length || 0;
  const progressPercent = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;

  return (
    <header className="bg-[#0a0c12] border-b border-[#ffffff10] text-[#e0e6ed] sticky top-0 z-40 shadow-[0_4px_30px_rgba(0,242,255,0.08)] backdrop-blur-md">
      {/* Top Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between py-3 gap-3">
          {/* Logo & Cyber Tournament Brand */}
          <div className="flex items-center gap-3.5 w-full md:w-auto">
            <div className="w-10 h-10 bg-gradient-to-tr from-[#00f2ff] to-[#7000ff] rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(0,242,255,0.5)] shrink-0">
              <span className="text-white font-black text-xl italic font-mono">B</span>
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black tracking-tight uppercase italic text-white">
                  {tournament?.name || '2026 戰鬥陀螺雙翼對戰賽'}
                </h1>
                {tournament && (
                  <>
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 shadow-[0_0_10px_rgba(0,242,255,0.2)]">
                      {tournament.targetSize} 人雙翼賽制
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-[#ffffff0a] text-gray-300 border border-[#ffffff15]">
                      #{tournament.id.replace('tour_', '').slice(-8).toUpperCase()}
                    </span>
                  </>
                )}
                {tournament?.status === 'completed' && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1 font-mono">
                    <Trophy className="w-3 h-3" /> 已完賽
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[#00f2ff] uppercase tracking-[0.2em] font-medium flex items-center gap-2 mt-0.5">
                <span>TOURNAMENT SYSTEM V2.0</span>
                <span className="text-gray-600">•</span>
                <span className="text-gray-400">0-11分陀螺競程</span>
                <span className="text-gray-600">•</span>
                <span className="text-gray-400">雙翼樹狀圖</span>
              </p>
            </div>
          </div>

          {/* HUD Status & Actions */}
          <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto justify-end flex-wrap">
            {onToggleLineOnlyMode && (
              <button
                id="btn-preview-line-invite"
                onClick={onToggleLineOnlyMode}
                className="px-3 py-2 rounded-lg bg-[#06C755]/15 hover:bg-[#06C755]/25 text-[#06C755] text-xs font-mono font-bold border border-[#06C755]/40 transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,199,85,0.15)]"
                title="切換至 LINE 專屬報名頁面 (僅顯示場次與登記內容)"
              >
                <Link2 className="w-3.5 h-3.5" />
                LINE 報名視角
              </button>
            )}

            <button
              id="btn-export-share"
              onClick={onOpenExportModal}
              className="px-3.5 py-2 rounded-lg bg-[#ffffff05] hover:bg-[#ffffff10] text-[#e0e6ed] text-xs font-medium border border-[#ffffff10] transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-[#00f2ff]" />
              戰報與匯出
            </button>
            <button
              id="btn-new-tournament"
              onClick={onOpenCreateModal}
              className="px-4 py-2 bg-[#00f2ff] text-black font-bold rounded-lg shadow-[0_0_20px_rgba(0,242,255,0.3)] hover:brightness-110 active:scale-95 transition-all text-xs flex items-center gap-1.5 uppercase tracking-wide"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              開賽 / 重設賽程
            </button>
          </div>
        </div>

        {/* HUD Sub-Bar */}
        {tournament && (
          <div className="py-2 border-t border-[#ffffff0a] flex flex-wrap items-center justify-between text-xs text-gray-400 gap-3">
            <div className="flex items-center gap-4 flex-wrap text-[11px]">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#00f2ff]" />
                <span className="text-gray-400">參賽登記:</span>
                <span className="font-mono font-bold text-white">
                  {approvedCount} / {tournament.targetSize} 人
                </span>
                {approvedCount < tournament.targetSize && (
                  <span className="text-amber-400 font-mono">({tournament.targetSize - approvedCount} 缺額設輪空)</span>
                )}
              </div>
              <div className="w-[1px] h-3 bg-gray-800 hidden sm:block" />
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-gray-400">種子機制:</span>
                <span className="font-semibold text-purple-300 font-mono">
                  {tournament.seedMode === 'manual' ? `指定種子 (${tournament.seedCount}名)` : tournament.seedMode === 'random' ? `隨機 (${tournament.seedCount}名)` : '無種子'}
                </span>
              </div>
              <div className="w-[1px] h-3 bg-gray-800 hidden sm:block" />
              <div className="flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5 text-[#00f2ff]" />
                <span className="text-gray-400">晉級條件:</span>
                <span className="font-mono text-[#00f2ff] font-bold">率先得 {tournament.matchTargetScore} 分 (上限11分)</span>
              </div>
            </div>

            {totalMatches > 0 && (
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-gray-400">進度:</span>
                <div className="w-24 bg-[#11141d] rounded-full h-1.5 overflow-hidden border border-[#ffffff15]">
                  <div
                    className="bg-gradient-to-r from-[#00f2ff] via-[#7000ff] to-emerald-400 h-full transition-all duration-500 shadow-[0_0_10px_rgba(0,242,255,0.5)]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="font-mono font-bold text-white">{progressPercent}%</span>
              </div>
            )}
          </div>
        )}

        {/* Cyber Tab Navigation */}
        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar pt-1 border-t border-[#ffffff0a]">
          <button
            id="tab-bracket"
            onClick={() => onTabChange('bracket')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap uppercase tracking-wider ${
              activeTab === 'bracket'
                ? 'text-[#00f2ff] border-[#00f2ff] bg-[#00f2ff]/10 shadow-[0_0_15px_rgba(0,242,255,0.15)]'
                : 'text-gray-400 border-transparent hover:text-white hover:bg-[#ffffff05]'
            }`}
          >
            <Swords className="w-4 h-4" />
            雙翼賽程表 (Bracket)
          </button>

          <button
            id="tab-players"
            onClick={() => onTabChange('players')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap uppercase tracking-wider ${
              activeTab === 'players'
                ? 'text-[#00f2ff] border-[#00f2ff] bg-[#00f2ff]/10 shadow-[0_0_15px_rgba(0,242,255,0.15)]'
                : 'text-gray-400 border-transparent hover:text-white hover:bg-[#ffffff05]'
            }`}
          >
            <Users className="w-4 h-4" />
            成員審核與登記
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold rounded bg-rose-500 text-white animate-pulse">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            id="tab-line-invite"
            onClick={() => onTabChange('line-invite')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap uppercase tracking-wider ${
              activeTab === 'line-invite'
                ? 'text-emerald-400 border-emerald-400 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                : 'text-gray-400 border-transparent hover:text-white hover:bg-[#ffffff05]'
            }`}
          >
            <Bot className="w-4 h-4 text-emerald-400" />
            LINE BOT 報名傳送門
          </button>

          <button
            id="tab-scoreboard"
            onClick={() => onTabChange('scoreboard')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap uppercase tracking-wider ${
              activeTab === 'scoreboard'
                ? 'text-purple-400 border-purple-400 bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                : 'text-gray-400 border-transparent hover:text-white hover:bg-[#ffffff05]'
            }`}
          >
            <Monitor className="w-4 h-4" />
            擂台大螢幕 (Scoreboard)
          </button>

          <button
            id="tab-podium"
            onClick={() => onTabChange('podium')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap uppercase tracking-wider ${
              activeTab === 'podium'
                ? 'text-amber-400 border-amber-400 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                : 'text-gray-400 border-transparent hover:text-white hover:bg-[#ffffff05]'
            }`}
          >
            <Award className="w-4 h-4" />
            冠亞季殿軍榜
            {tournament?.status === 'completed' && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

