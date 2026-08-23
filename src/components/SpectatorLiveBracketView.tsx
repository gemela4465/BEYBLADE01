import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, Swords, Shield, Award, Search, Radio, Share2, Copy, Check, 
  RefreshCw, Layers, ExternalLink, Flame, Sparkles, Clock, Eye, AlertCircle, ArrowUpRight, LogOut
} from 'lucide-react';
import { Tournament, Match, Player } from '../types';
import { DualWingBracket } from './DualWingBracket';
import { PodiumRankings } from './PodiumRankings';
import { SpectatorMatchDetailModal } from './SpectatorMatchDetailModal';
import { fetchTournamentApi } from '../utils/api';
import { saveTournamentToStore, buildReadOnlyBracketUrl } from '../utils/sessionHelper';

interface SpectatorLiveBracketViewProps {
  initialTournament: Tournament;
  onSwitchToAdmin?: () => void;
}

export const SpectatorLiveBracketView: React.FC<SpectatorLiveBracketViewProps> = ({
  initialTournament,
  onSwitchToAdmin
}) => {
  const [tournament, setTournament] = useState<Tournament>(initialTournament);
  const [activeTab, setActiveTab] = useState<'bracket' | 'podium' | 'matches'>('bracket');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [dataUpdatedFlash, setDataUpdatedFlash] = useState<boolean>(false);

  const prevTournamentRef = useRef<string>(JSON.stringify(initialTournament));

  // Poll server every 2 seconds for real-time live match scores & bracket progression
  useEffect(() => {
    if (!tournament?.id) return;

    const pollServer = async () => {
      try {
        const latest = await fetchTournamentApi(tournament.id);
        if (latest && latest.id === tournament.id) {
          const currentStr = JSON.stringify(latest);
          if (currentStr !== prevTournamentRef.current) {
            prevTournamentRef.current = currentStr;
            setTournament(latest);
            saveTournamentToStore(latest);
            setDataUpdatedFlash(true);
            setTimeout(() => setDataUpdatedFlash(false), 2000);
          }
          setLastSyncTime(new Date());
        }
      } catch (e) {
        console.warn('[Spectator Live Sync] poll failed', e);
      }
    };

    const interval = setInterval(pollServer, 2000);
    return () => clearInterval(interval);
  }, [tournament?.id]);

  const handleManualSync = async () => {
    if (!tournament?.id || isSyncing) return;
    setIsSyncing(true);
    try {
      const latest = await fetchTournamentApi(tournament.id);
      if (latest) {
        setTournament(latest);
        saveTournamentToStore(latest);
        setLastSyncTime(new Date());
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopySpectatorUrl = () => {
    const url = buildReadOnlyBracketUrl(tournament);
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const completedMatchesCount = tournament.matches.filter((m) => m.status === 'completed' || m.status === 'bye').length;
  const totalMatchesCount = tournament.matches.length;
  const approvedPlayersCount = tournament.players.filter((p) => p.status === 'approved').length;

  const playerMap = new Map<string, Player>();
  tournament.players.forEach((p) => playerMap.set(p.id, p));

  return (
    <div className="min-h-screen bg-[#05070a] text-[#e0e6ed] flex flex-col font-sans selection:bg-[#00f2ff] selection:text-black relative overflow-x-hidden">
      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#00f2ff]/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-[#7000ff]/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 cyber-grid-bg opacity-30" />
      </div>

      {/* Top Live Spectator Header */}
      <header className="sticky top-0 z-40 bg-[#07090f]/95 border-b border-[#ffffff10] backdrop-blur-md px-4 sm:px-8 py-3 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Brand & Tournament Info */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00f2ff]/20 to-[#7000ff]/30 border border-[#00f2ff]/40 flex items-center justify-center text-[#00f2ff] shadow-[0_0_20px_rgba(0,242,255,0.2)]">
                <Swords className="w-5 h-5 animate-pulse" />
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#06C755] rounded-full border-2 border-[#07090f] animate-ping" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white truncate">
                  {tournament.customTitle || tournament.name}
                </h1>
                {tournament.sessionNumber && (
                  <span className="px-2 py-0.5 text-[10px] font-mono font-black rounded bg-[#7000ff]/30 text-purple-300 border border-[#7000ff]/50">
                    {tournament.sessionNumber}
                  </span>
                )}
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <Eye className="w-3 h-3" /> 線上即時賽程
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-mono flex items-center gap-2">
                <span>{tournament.targetSize} 人淘汰賽</span>
                <span>•</span>
                <span>目標 {tournament.matchTargetScore} 分晉級</span>
                <span>•</span>
                <span>進度 {completedMatchesCount}/{totalMatchesCount} 場</span>
              </p>
            </div>
          </div>

          {/* Center/Right: Live Sync Status, Search & Sharing */}
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
            {/* Live Indicator */}
            <div className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-2 transition-all ${
              dataUpdatedFlash 
                ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                : 'bg-[#0a0c12] border-[#ffffff10] text-gray-400'
            }`}>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-gray-300">LIVE</span>
              <span className="text-[10px] text-gray-500 hidden sm:inline">
                {lastSyncTime.toLocaleTimeString()}
              </span>
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="p-1 hover:text-white rounded hover:bg-[#ffffff10] transition-colors"
                title="手動立即同步最新賽況"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-[#00f2ff]' : ''}`} />
              </button>
            </div>

            {/* Quick Player Search / Highlight */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜尋選手姓名 / 查榜..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#05070a] border border-[#ffffff15] text-xs text-white pl-8 pr-3 py-1.5 rounded-lg w-36 sm:w-44 focus:outline-none focus:border-[#00f2ff] font-mono placeholder:text-gray-600"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Copy Spectator URL */}
            <button
              onClick={handleCopySpectatorUrl}
              className="px-3 py-1.5 rounded-lg bg-[#ffffff10] hover:bg-[#ffffff20] text-gray-200 text-xs font-mono font-medium border border-[#ffffff15] transition-all flex items-center gap-1.5"
              title="複製唯讀即時賽程網址"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">已複製！</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-[#00f2ff]" />
                  <span>分享賽程</span>
                </>
              )}
            </button>

            {/* 離開按鈕（關閉網頁） */}
            <button
              onClick={() => {
                if (window.opener) {
                  window.close();
                } else {
                  // If window.close() is blocked by browser for directly opened tabs, try closing or fallback to history
                  window.close();
                  if (!window.closed && onSwitchToAdmin) {
                    onSwitchToAdmin();
                  }
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-rose-300 border border-red-500/30 text-xs font-mono font-bold flex items-center gap-1 transition-all"
              title="離開並關閉此賽程看板網頁"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>離開</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto mt-3 pt-2 border-t border-[#ffffff08] flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('bracket')}
            className={`px-4 py-2 rounded-lg text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'bracket'
                ? 'bg-[#00f2ff] text-black shadow-[0_0_15px_rgba(0,242,255,0.3)]'
                : 'text-gray-400 hover:text-white hover:bg-[#ffffff08]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>賽程表樹狀圖</span>
          </button>

          <button
            onClick={() => setActiveTab('podium')}
            className={`px-4 py-2 rounded-lg text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'podium'
                ? 'bg-[#00f2ff] text-black shadow-[0_0_15px_rgba(0,242,255,0.3)]'
                : 'text-gray-400 hover:text-white hover:bg-[#ffffff08]'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>榮譽榜（冠亞季殿軍）</span>
          </button>

          <button
            onClick={() => setActiveTab('matches')}
            className={`px-4 py-2 rounded-lg text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'matches'
                ? 'bg-[#00f2ff] text-black shadow-[0_0_15px_rgba(0,242,255,0.3)]'
                : 'text-gray-400 hover:text-white hover:bg-[#ffffff08]'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>全場對決清單 ({totalMatchesCount} 場)</span>
          </button>
        </div>
      </header>

      {/* Main Spectator Content View */}
      <main className="flex-1 py-6 relative z-10">
        {/* Notice ticker */}
        <div className="max-w-7xl mx-auto px-4 mb-4">
          <div className="bg-[#0a0c12]/90 border border-[#00f2ff]/20 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-2 text-gray-300">
              <span className="w-2 h-2 rounded-full bg-[#00f2ff] animate-ping" />
              <span className="font-bold text-[#00f2ff]">即時連線中：</span>
              <span>所有戰績與晉級名單由現場裁判實時記錄，本頁面每 2 秒自動同步，無需手動重整。點擊任意場次可查閱各回合擊倒細節。</span>
            </div>
            {searchQuery && (
              <span className="px-2 py-0.5 rounded bg-[#00f2ff]/20 text-[#00f2ff] font-bold">
                正在高亮顯示：「{searchQuery}」
              </span>
            )}
          </div>
        </div>

        {/* Tab 1: Dual-Wing Bracket (Read-Only) */}
        {activeTab === 'bracket' && (
          <div className="px-4">
            <DualWingBracket
              tournament={tournament}
              onSelectMatch={(m) => setSelectedMatch(m)}
              isReadOnly={true}
              highlightedPlayerName={searchQuery}
            />
          </div>
        )}

        {/* Tab 2: Podium Rankings (Hero Standings) */}
        {activeTab === 'podium' && (
          <div className="px-4">
            <PodiumRankings
              tournament={tournament}
              onSelectMatchById={(matchId) => {
                const m = tournament.matches.find((item) => item.id === matchId);
                if (m) setSelectedMatch(m);
              }}
            />
          </div>
        )}

        {/* Tab 4: All Matches List View (Spectator List) */}
        {activeTab === 'matches' && (
          <div className="max-w-5xl mx-auto px-4 space-y-4">
            <div className="bg-[#0a0c12] border border-[#ffffff10] rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-[#ffffff10] flex items-center justify-between bg-[#07090f]">
                <div>
                  <h3 className="font-bold text-white text-sm uppercase tracking-wide">
                    全賽程場次即時戰況表
                  </h3>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    共 {totalMatchesCount} 場對決 • 已完賽 {completedMatchesCount} 場
                  </p>
                </div>
                <div className="text-xs font-mono text-[#00f2ff] font-bold">
                  點擊場次可查看詳細各回合比分
                </div>
              </div>

              <div className="divide-y divide-[#ffffff08]">
                {tournament.matches.map((m) => {
                  const p1 = m.player1Id ? playerMap.get(m.player1Id) : null;
                  const p2 = m.player2Id ? playerMap.get(m.player2Id) : null;
                  const isCompleted = m.status === 'completed';
                  const isBye = m.status === 'bye';
                  const isP1Match = searchQuery && p1?.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
                  const isP2Match = searchQuery && p2?.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
                  const isMatchHighlighted = isP1Match || isP2Match;

                  return (
                    <div
                      key={m.id}
                      onClick={() => {
                        if (p1 || p2) setSelectedMatch(m);
                      }}
                      className={`p-4 hover:bg-[#ffffff05] transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer ${
                        isMatchHighlighted ? 'bg-[#00f2ff]/10 border-l-4 border-l-[#00f2ff]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 rounded bg-[#05070a] border border-[#ffffff15] text-[#00f2ff] font-mono font-bold text-xs">
                          #{m.matchNumber}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            <span>{m.label}</span>
                            <span className="text-gray-500 font-mono text-[11px]">
                              ({m.bracketWing === 'left' ? '左翼' : m.bracketWing === 'right' ? '右翼' : '中央總決賽'})
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 font-mono mt-0.5">
                            {p1 ? p1.name : '待定'} vs {p2 ? p2.name : (isBye ? '輪空' : '待定')}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="text-right">
                          <span className="font-mono text-sm font-black text-white px-2 py-0.5 rounded bg-[#05070a] border border-[#ffffff10]">
                            {p1 ? m.player1Score : '-'} : {p2 ? m.player2Score : '-'}
                          </span>
                        </div>

                        <div>
                          {isBye ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 font-mono">
                              輪空 (BYE)
                            </span>
                          ) : isCompleted ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono">
                              ✓ 已完賽
                            </span>
                          ) : p1 && p2 ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/40 font-mono animate-pulse">
                              ⚡ 進行中
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-500 font-mono">
                              ⏳ 等待勝者
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Spectator Read-Only Match Detail Modal */}
      <SpectatorMatchDetailModal
        match={selectedMatch}
        players={tournament.players}
        isOpen={!!selectedMatch}
        onClose={() => setSelectedMatch(null)}
      />

      {/* Spectator Footer */}
      <footer className="bg-[#07090f]/90 border-t border-[#ffffff10] text-[#717b8c] text-xs py-4 px-4 sm:px-8 relative z-10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#06C755]" />
            <span className="font-mono text-gray-400">
              戰鬥陀螺 X 雙翼爭霸賽 • 線上即時賽程看板 (Spectator Live View)
            </span>
          </div>
          <div className="font-mono text-gray-500 text-[11px]">
            數據每 2 秒自動即時同步 • 裁判大會官方授權公佈
          </div>
        </div>
      </footer>
    </div>
  );
};
