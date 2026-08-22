import React from 'react';
import { Trophy, Swords, GitBranch, ArrowRight, CheckCircle2, XCircle, Clock, Award, Shield, User } from 'lucide-react';
import { Tournament, Match, Player } from '../types';

interface PlayerPathVisualizerProps {
  tournament: Tournament;
  selectedPlayerId: string | null;
  onSelectPlayer: (playerId: string | null) => void;
  onSelectMatch?: (match: Match) => void;
}

export const PlayerPathVisualizer: React.FC<PlayerPathVisualizerProps> = ({
  tournament,
  selectedPlayerId,
  onSelectPlayer,
  onSelectMatch
}) => {
  const playerMap = new Map<string, Player>();
  tournament.players.forEach((p) => playerMap.set(p.id, p));

  const allPlayers = tournament.players.filter((p) => p.status === 'approved' || p.status === 'pending');
  const championId = tournament.rankings?.champion?.id || tournament.matches.find((m) => m.bracketWing === 'final')?.winnerId;

  // Active target player (defaults to selectedPlayerId, or champion if completed, or first seed)
  const activePlayerId = selectedPlayerId || (tournament.status === 'completed' && championId ? championId : null);
  const activePlayer = activePlayerId ? playerMap.get(activePlayerId) : null;

  // Find all matches on this player's journey
  const playerMatches: Match[] = [];
  if (activePlayerId) {
    const relevant = tournament.matches.filter(
      (m) => m.player1Id === activePlayerId || m.player2Id === activePlayerId || m.winnerId === activePlayerId
    );
    // Sort by round ascending
    relevant.sort((a, b) => a.round - b.round || a.matchIndex - b.matchIndex);
    playerMatches.push(...relevant);
  }

  const getRoundLabel = (m: Match) => {
    if (m.bracketWing === 'final') return '🏆 總決賽';
    if (m.bracketWing === 'third_place') return '🥉 季軍賽';
    const totalRounds = Math.max(...tournament.matches.map((x) => x.round), 1);
    const diff = totalRounds - m.round;
    if (diff === 1) return `準決賽 (${m.bracketWing === 'left' ? '左翼' : '右翼'})`;
    if (diff === 2) return `8強賽 (${m.bracketWing === 'left' ? '左翼' : '右翼'})`;
    if (diff === 3) return `16強賽 (${m.bracketWing === 'left' ? '左翼' : '右翼'})`;
    return `第 ${m.round} 輪 (${m.bracketWing === 'left' ? '左翼' : '右翼'})`;
  };

  return (
    <div className="w-full bg-[#0a0c14]/90 border border-[#00f2ff]/30 rounded-2xl p-4 shadow-[0_0_30px_rgba(0,0,0,0.7)] backdrop-blur-md">
      {/* Header & Player Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#ffffff10]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#00f2ff]/15 border border-[#00f2ff]/40 flex items-center justify-center text-[#00f2ff]">
            <GitBranch className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5 font-mono">
              <span>戰績路徑檢視器 (Tournament Battle Path)</span>
              <span className="px-1.5 py-0.2 text-[9px] rounded bg-[#00f2ff]/20 text-[#00f2ff] font-bold">
                晉級歷程
              </span>
            </h4>
            <p className="text-[11px] text-gray-400 font-mono">
              點擊選手或從下拉選單切換，即時追蹤該選手在各輪對戰的戰績與晉級路徑
            </p>
          </div>
        </div>

        {/* Player Selection Dropdown */}
        <div className="flex items-center gap-2">
          <select
            id="select-path-player"
            value={activePlayerId || ''}
            onChange={(e) => onSelectPlayer(e.target.value || null)}
            className="bg-[#05070a] border border-[#00f2ff]/40 text-gray-200 text-xs font-mono rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#00f2ff] focus:ring-1 focus:ring-[#00f2ff]"
          >
            <option value="">-- 請選擇欲追蹤戰績路徑的選手 --</option>
            {allPlayers.map((p) => {
              const isChamp = championId === p.id;
              return (
                <option key={p.id} value={p.id}>
                  {isChamp ? '👑 [冠軍] ' : ''}
                  {p.name} ({p.beybladeName || '陀螺'})
                  {p.isSeed ? ` [#${p.seedNumber}種子]` : ''}
                </option>
              );
            })}
          </select>

          {activePlayerId && (
            <button
              onClick={() => onSelectPlayer(null)}
              className="px-2 py-1 text-xs text-gray-400 hover:text-white rounded hover:bg-[#ffffff10] transition-colors"
              title="清除追蹤"
            >
              重設
            </button>
          )}
        </div>
      </div>

      {/* Path Sequence Display */}
      {activePlayer ? (
        <div className="pt-3 space-y-3">
          {/* Player Summary Card */}
          <div className="flex items-center justify-between flex-wrap gap-2 px-3 py-2 bg-[#05070a]/80 rounded-xl border border-[#ffffff10]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#00f2ff]/30 to-purple-600/30 border border-[#00f2ff]/50 flex items-center justify-center font-bold text-white text-xs">
                {activePlayer.name.slice(0, 2)}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-white">{activePlayer.name}</span>
                  {activePlayer.isSeed && (
                    <span className="px-1 py-0.2 text-[9px] font-mono bg-purple-500/20 text-purple-300 rounded border border-purple-500/30">
                      第 {activePlayer.seedNumber} 種子
                    </span>
                  )}
                  {championId === activePlayer.id && (
                    <span className="px-1.5 py-0.2 text-[9px] font-black font-mono bg-amber-500/20 text-amber-300 rounded border border-amber-500/40 flex items-center gap-0.5">
                      <Trophy className="w-2.5 h-2.5 text-amber-400" /> 冠軍得主
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-gray-400 font-mono">
                  陀螺：{activePlayer.beybladeName} {activePlayer.blade ? `(${activePlayer.blade})` : ''} • 所屬：{activePlayer.clubOrTeam || '戰鬥陀螺交流群'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="text-center">
                <div className="text-[10px] text-gray-500">出戰場數</div>
                <div className="font-black text-cyan-300">{playerMatches.length} 場</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-gray-500">勝場</div>
                <div className="font-black text-emerald-400">
                  {playerMatches.filter((m) => m.winnerId === activePlayer.id).length} 勝
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-gray-500">當前狀態</div>
                <div className="font-bold text-white">
                  {championId === activePlayer.id
                    ? '🏆 榮獲冠軍'
                    : playerMatches.some((m) => m.loserId === activePlayer.id)
                    ? '⚔️ 已完賽止步'
                    : '🔥 激戰晉級中'}
                </div>
              </div>
            </div>
          </div>

          {/* Stepped Journey Path Cards */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
            {playerMatches.length === 0 ? (
              <div className="text-xs text-gray-500 font-mono py-2">
                尚無該選手的賽程紀錄
              </div>
            ) : (
              playerMatches.map((m, idx) => {
                const isP1 = m.player1Id === activePlayer.id;
                const isP2 = m.player2Id === activePlayer.id;
                const isWinner = m.winnerId === activePlayer.id;
                const isLoser = m.loserId === activePlayer.id;
                const isBye = m.status === 'bye';
                const isCompleted = m.status === 'completed' || isBye;

                const myScore = isP1 ? m.player1Score : m.player2Score;
                const oppId = isP1 ? m.player2Id : m.player1Id;
                const opp = oppId ? playerMap.get(oppId) : null;
                const oppScore = isP1 ? m.player2Score : m.player1Score;

                const isLast = idx === playerMatches.length - 1;

                return (
                  <React.Fragment key={`path-step-${m.id}`}>
                    <div
                      onClick={() => onSelectMatch && onSelectMatch(m)}
                      className={`min-w-[190px] max-w-[210px] p-2.5 rounded-xl border transition-all cursor-pointer select-none shrink-0 ${
                        isWinner
                          ? 'bg-gradient-to-b from-emerald-950/40 to-[#0a0c12] border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:border-emerald-400'
                          : isLoser
                          ? 'bg-[#0a0c12] border-[#ffffff15] hover:border-gray-500 opacity-80'
                          : 'bg-[#0a0c12] border-[#00f2ff]/40 shadow-[0_0_10px_rgba(0,242,255,0.1)] hover:border-[#00f2ff]'
                      }`}
                    >
                      {/* Step Header */}
                      <div className="flex items-center justify-between text-[10px] font-mono border-b border-[#ffffff10] pb-1 mb-1.5">
                        <span className="font-bold text-gray-300">{getRoundLabel(m)}</span>
                        <span className="text-[#00f2ff] font-bold">#{m.matchNumber}</span>
                      </div>

                      {/* Opponent & Score Details */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-white truncate max-w-[90px]">
                            {activePlayer.name}
                          </span>
                          <span className={`font-mono font-black text-sm ${isWinner ? 'text-emerald-400' : 'text-gray-300'}`}>
                            {myScore}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400 truncate max-w-[90px]">
                            {opp ? opp.name : isBye ? '輪空' : '待定'}
                          </span>
                          <span className="font-mono font-black text-sm text-gray-400">
                            {opp ? oppScore : '-'}
                          </span>
                        </div>
                      </div>

                      {/* Result Badge */}
                      <div className="mt-2 pt-1 border-t border-[#ffffff10] flex items-center justify-between text-[10px] font-mono">
                        {isBye ? (
                          <span className="text-cyan-400 font-bold">輪空自動晉級</span>
                        ) : isWinner ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> 獲勝晉級
                          </span>
                        ) : isLoser ? (
                          <span className="text-rose-400 font-bold flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-rose-400" /> 止步本輪
                          </span>
                        ) : (
                          <span className="text-orange-400 font-bold flex items-center gap-1 animate-pulse">
                            <Clock className="w-3 h-3 text-orange-400" /> 進行中
                          </span>
                        )}

                        {m.bracketWing === 'final' && isWinner && (
                          <span className="text-amber-400 font-black flex items-center gap-0.5">
                            <Trophy className="w-3 h-3 text-amber-400 animate-bounce" /> 奪冠！
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Step Connector Arrow */}
                    {!isLast && (
                      <div className="flex items-center px-1 text-emerald-400">
                        <ArrowRight className="w-4 h-4 animate-pulse" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="pt-2 text-center text-xs text-gray-500 font-mono py-1">
          💡 請從上方下拉選單選擇欲查詢的選手，即可一覽該選手由第 1 輪至總決賽的完整戰績路徑與比分！
        </div>
      )}
    </div>
  );
};
