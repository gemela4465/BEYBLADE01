import React from 'react';
import { 
  Trophy, Swords, Check, X, Shield, Award, Flame, Zap, Compass, Clock, History, Eye, Info
} from 'lucide-react';
import { Match, Player, BeybladeType } from '../types';
import { FINISH_RULES } from '../data/beybladeData';

interface SpectatorMatchDetailModalProps {
  match: Match | null;
  players: Player[];
  isOpen: boolean;
  onClose: () => void;
}

export const SpectatorMatchDetailModal: React.FC<SpectatorMatchDetailModalProps> = ({
  match,
  players,
  isOpen,
  onClose
}) => {
  if (!isOpen || !match) return null;

  const playerMap = new Map<string, Player>();
  players.forEach((p) => playerMap.set(p.id, p));

  const p1 = match.player1Id ? playerMap.get(match.player1Id) : null;
  const p2 = match.player2Id ? playerMap.get(match.player2Id) : null;

  const isCompleted = match.status === 'completed';
  const isBye = match.status === 'bye';
  const winner = match.winnerId ? playerMap.get(match.winnerId) : null;

  const getAttributeBadge = (type?: BeybladeType) => {
    switch (type) {
      case 'attack':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/40">攻擊型 (Attack)</span>;
      case 'defense':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">防禦型 (Defense)</span>;
      case 'stamina':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">持久型 (Stamina)</span>;
      case 'balance':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/40">平衡型 (Balance)</span>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-2xl bg-[#0a0c12] border-2 border-[#00f2ff]/40 rounded-2xl shadow-[0_0_50px_rgba(0,242,255,0.2)] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#07090f] border-b border-[#ffffff10] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00f2ff]/10 border border-[#00f2ff]/30 flex items-center justify-center text-[#00f2ff]">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">
                  {match.bracketWing === 'final' ? '🏆 總決賽對決戰況' : match.bracketWing === 'third_place' ? '🥉 季殿軍對決戰況' : `場次 #${match.matchNumber} ${match.label}`}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30">
                  唯讀看板
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono">
                勝出條件：率先取得 {match.targetScore || 4} 分者晉級
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#ffffff10] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          {/* Status banner */}
          {isCompleted ? (
            <div className="bg-gradient-to-r from-emerald-950/40 via-emerald-900/30 to-emerald-950/40 border border-emerald-500/40 rounded-xl p-3 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Trophy className="w-4 h-4 text-emerald-400" />
                <span>已完賽！勝者：{winner?.name || '無'}（率先達標）</span>
              </div>
              <span className="text-gray-400 text-[11px]">總比分：{match.player1Score} - {match.player2Score}</span>
            </div>
          ) : isBye ? (
            <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-3 text-center text-xs font-mono text-gray-400">
              ⚡ 本場為輪空局（BYE），選手直接保送晉級下輪
            </div>
          ) : (
            <div className="bg-[#00f2ff]/10 border border-[#00f2ff]/30 rounded-xl p-3 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-[#00f2ff] font-bold">
                <Swords className="w-4 h-4 animate-pulse" />
                <span>對決進行中 / 待裁判登錄完成</span>
              </div>
              <span className="text-gray-400 text-[11px]">目前比分：{match.player1Score} - {match.player2Score}</span>
            </div>
          )}

          {/* Stadium Face-off Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Player 1 Card */}
            <div className={`p-4 rounded-xl border relative transition-all ${
              match.winnerId === p1?.id && isCompleted
                ? 'bg-emerald-950/20 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                : 'bg-[#0e111a] border-[#ffffff10]'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-gray-400 font-bold">選手 1（藍方）</span>
                {match.winnerId === p1?.id && isCompleted && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-black flex items-center gap-1 font-mono">
                    <Check className="w-3 h-3 stroke-[3]" /> 獲勝晉級
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="text-lg font-black text-white truncate flex items-center gap-2 flex-wrap">
                    <span>{p1 ? p1.name : isBye ? '輪空' : '待定選手'}</span>
                    {p1?.isSeed && (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#7000ff]/20 text-purple-300 border border-[#7000ff]/50">
                        種子 #{p1.seedNumber}
                      </span>
                    )}
                    {p1?.isReserve && (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        預備席
                      </span>
                    )}
                    {p1?.isRepechage && (
                      <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-gradient-to-r from-purple-500/30 to-amber-500/30 text-amber-300 border border-amber-500/50">
                        ⚡ 敗部復活
                      </span>
                    )}
                  </div>
                  {p1 && (
                    <div className="text-xs text-[#00f2ff] font-mono truncate">
                      {p1.beybladeName}
                    </div>
                  )}
                  {p1 && <div>{getAttributeBadge(p1.beybladeType)}</div>}
                </div>

                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-mono font-black shrink-0 ${
                  match.winnerId === p1?.id && isCompleted
                    ? 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                    : 'bg-[#05070a] text-white border border-[#ffffff15]'
                }`}>
                  {p1 ? match.player1Score : '-'}
                </div>
              </div>
            </div>

            {/* Player 2 Card */}
            <div className={`p-4 rounded-xl border relative transition-all ${
              match.winnerId === p2?.id && isCompleted
                ? 'bg-emerald-950/20 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                : 'bg-[#0e111a] border-[#ffffff10]'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-gray-400 font-bold">選手 2（紅方）</span>
                {match.winnerId === p2?.id && isCompleted && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-black flex items-center gap-1 font-mono">
                    <Check className="w-3 h-3 stroke-[3]" /> 獲勝晉級
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="text-lg font-black text-white truncate flex items-center gap-2 flex-wrap">
                    <span>{p2 ? p2.name : isBye ? '輪空' : '待定選手'}</span>
                    {p2?.isSeed && (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#7000ff]/20 text-purple-300 border border-[#7000ff]/50">
                        種子 #{p2.seedNumber}
                      </span>
                    )}
                    {p2?.isReserve && (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        預備席
                      </span>
                    )}
                    {p2?.isRepechage && (
                      <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-gradient-to-r from-purple-500/30 to-amber-500/30 text-amber-300 border border-amber-500/50">
                        ⚡ 敗部復活
                      </span>
                    )}
                  </div>
                  {p2 && (
                    <div className="text-xs text-[#ff0055] font-mono truncate">
                      {p2.beybladeName}
                    </div>
                  )}
                  {p2 && <div>{getAttributeBadge(p2.beybladeType)}</div>}
                </div>

                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-mono font-black shrink-0 ${
                  match.winnerId === p2?.id && isCompleted
                    ? 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                    : 'bg-[#05070a] text-white border border-[#ffffff15]'
                }`}>
                  {p2 ? match.player2Score : '-'}
                </div>
              </div>
            </div>
          </div>

          {/* Rounds History Log */}
          <div className="bg-[#05070a] border border-[#ffffff10] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#ffffff10] pb-2">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-gray-300">
                <History className="w-4 h-4 text-[#00f2ff]" />
                <span>各回合擊倒獲勝細節 (Round History)</span>
              </div>
              <span className="text-[11px] font-mono text-gray-500">
                共 {match.roundsHistory?.length || 0} 回合
              </span>
            </div>

            {match.roundsHistory && match.roundsHistory.length > 0 ? (
              <div className="space-y-2">
                {match.roundsHistory.map((rec, idx) => {
                  const rule = FINISH_RULES[rec.finishType];
                  const winnerPlayer = rec.winner === 'p1' ? p1 : p2;
                  return (
                    <div
                      key={idx}
                      className="p-3 bg-[#0a0c12] border border-[#ffffff08] rounded-lg flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded bg-[#11141d] border border-[#ffffff15] flex items-center justify-center font-bold text-gray-400 text-[11px]">
                          #{rec.roundNum}
                        </span>
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{winnerPlayer ? winnerPlayer.name : (rec.winner === 'p1' ? '選手1' : '選手2')}</span>
                            <span className="text-gray-400">以</span>
                            <span className="text-[#00f2ff] font-black">{rule?.name || rec.finishType}</span>
                            <span className="text-gray-400">獲勝</span>
                          </div>
                          {rule && (
                            <div className="text-[11px] text-gray-500 mt-0.5">
                              {rule.desc}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black text-xs">
                          +{rec.points} 分
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-gray-500 font-mono">
                尚未有回合得分記錄
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer (Purely Read-Only Close) */}
        <div className="px-6 py-3.5 bg-[#07090f] border-t border-[#ffffff10] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-mono">
            <Info className="w-3.5 h-3.5 text-gray-400" />
            <span>此為即時同步唯讀看板，僅供觀看與查榜</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-[#ffffff10] hover:bg-[#ffffff20] text-white text-xs font-mono font-bold transition-all"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
