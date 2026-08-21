import React from 'react';
import { Shield, Trophy, Swords, Check, ArrowRight, Clock } from 'lucide-react';
import { Match, Player, BeybladeType } from '../types';

interface MatchCardProps {
  match: Match;
  playerMap: Map<string, Player>;
  onSelectMatch: (match: Match) => void;
  isCenter?: boolean;
}

export const MatchCard: React.FC<MatchCardProps> = ({
  match,
  playerMap,
  onSelectMatch,
  isCenter = false
}) => {
  const p1 = match.player1Id ? playerMap.get(match.player1Id) : null;
  const p2 = match.player2Id ? playerMap.get(match.player2Id) : null;

  const isCompleted = match.status === 'completed';
  const isBye = match.status === 'bye';
  const isInProgress = match.status === 'in_progress' || (p1 && p2 && !isCompleted);

  const getAttributeColor = (type?: BeybladeType) => {
    switch (type) {
      case 'attack':
        return 'text-red-400 border-red-500/40 bg-red-500/10';
      case 'defense':
        return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
      case 'stamina':
        return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
      case 'balance':
        return 'text-purple-400 border-purple-500/40 bg-purple-500/10';
      default:
        return 'text-slate-400 border-slate-700 bg-slate-800';
    }
  };

  const getStatusBadge = () => {
    if (isBye) {
      return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">輪空晉級 (BYE)</span>;
    }
    if (isCompleted) {
      return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">已完賽</span>;
    }
    if (p1 && p2) {
      return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/40 animate-pulse">可開戰 (0-11分)</span>;
    }
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-500">等待勝者</span>;
  };

  return (
    <div
      id={`match-card-${match.id}`}
      onClick={() => {
        if (p1 || p2) onSelectMatch(match);
      }}
      className={`relative w-72 rounded-xl transition-all duration-200 cursor-pointer overflow-hidden border ${
        isCenter
          ? 'bg-[#0e111a] border-amber-400/80 shadow-[0_0_30px_rgba(245,158,11,0.25)] hover:border-amber-300'
          : match.status === 'completed'
          ? 'bg-[#0a0c12] border-[#ffffff15] hover:border-[#00f2ff]/50'
          : p1 && p2
          ? 'bg-[#0a0c12] border-[#00f2ff]/50 hover:border-[#00f2ff] shadow-[0_0_15px_rgba(0,242,255,0.1)]'
          : 'bg-[#07090f]/80 border-[#ffffff0a] opacity-75 hover:opacity-100 hover:border-[#ffffff20]'
      }`}
    >
      {/* Header Bar */}
      <div className="px-3 py-1.5 bg-[#05070a]/90 border-b border-[#ffffff10] flex items-center justify-between text-[11px] font-mono">
        <div className="flex items-center gap-1.5 font-bold text-gray-300">
          {match.bracketWing === 'final' ? (
            <span className="text-amber-400 font-black flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" /> 總冠軍戰
            </span>
          ) : match.bracketWing === 'third_place' ? (
            <span className="text-amber-300/90 font-black">🥉 季殿軍戰</span>
          ) : (
            <span className="text-[#00f2ff] font-bold">場次 #{match.matchNumber}</span>
          )}
          <span className="text-gray-600">•</span>
          <span className="text-gray-400 truncate max-w-[120px]">{match.label}</span>
        </div>
        <div>{getStatusBadge()}</div>
      </div>

      {/* Players Section */}
      <div className="p-2 space-y-1.5">
        {/* Player 1 */}
        <div
          className={`p-2 rounded-lg transition-all flex items-center justify-between ${
            match.winnerId === p1?.id && isCompleted
              ? 'bg-emerald-950/40 border border-emerald-500/50 font-bold text-white shadow-[0_0_10px_rgba(16,185,129,0.15)]'
              : match.loserId === p1?.id && isCompleted
              ? 'bg-[#07090f]/50 text-gray-600 line-through border border-transparent'
              : p1
              ? 'bg-[#11141d]/80 text-gray-200 border border-[#ffffff0a] hover:border-[#ffffff18]'
              : 'bg-[#07090f]/30 text-gray-600 border border-dashed border-[#ffffff10]'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <div className="w-5 h-5 rounded bg-[#05070a] border border-[#ffffff15] flex items-center justify-center text-[10px] font-mono font-bold text-[#00f2ff] shrink-0">
              {p1?.isSeed ? (
                <Shield className="w-3 h-3 text-purple-400" />
              ) : (
                '1'
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold truncate text-white">
                  {p1 ? p1.name : isBye && !p2 ? '—' : '待定選手'}
                </span>
                {p1?.isSeed && (
                  <span className="text-[9px] font-mono font-black px-1 rounded bg-[#7000ff]/20 text-purple-300 border border-[#7000ff]/50 shrink-0">
                    #{p1.seedNumber}
                  </span>
                )}
              </div>
              {p1 && (
                <div className="text-[10px] text-gray-400 truncate flex items-center gap-1 font-mono">
                  <span>{p1.beybladeName}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {p1 && isCompleted && match.winnerId === p1.id && (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <div
              className={`w-8 h-7 rounded flex items-center justify-center text-sm font-mono font-black ${
                match.winnerId === p1?.id && isCompleted
                  ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                  : 'bg-[#05070a] text-white border border-[#ffffff15]'
              }`}
            >
              {p1 ? match.player1Score : '-'}
            </div>
          </div>
        </div>

        {/* VS Divider */}
        <div className="flex items-center justify-center text-[9px] font-mono font-black text-gray-600 uppercase tracking-widest py-0.5">
          VS
        </div>

        {/* Player 2 */}
        <div
          className={`p-2 rounded-lg transition-all flex items-center justify-between ${
            match.winnerId === p2?.id && isCompleted
              ? 'bg-emerald-950/40 border border-emerald-500/50 font-bold text-white shadow-[0_0_10px_rgba(16,185,129,0.15)]'
              : match.loserId === p2?.id && isCompleted
              ? 'bg-[#07090f]/50 text-gray-600 line-through border border-transparent'
              : p2
              ? 'bg-[#11141d]/80 text-gray-200 border border-[#ffffff0a] hover:border-[#ffffff18]'
              : 'bg-[#07090f]/30 text-gray-600 border border-dashed border-[#ffffff10]'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <div className="w-5 h-5 rounded bg-[#05070a] border border-[#ffffff15] flex items-center justify-center text-[10px] font-mono font-bold text-[#00f2ff] shrink-0">
              {p2?.isSeed ? (
                <Shield className="w-3 h-3 text-purple-400" />
              ) : (
                '2'
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold truncate text-white">
                  {p2 ? p2.name : isBye ? '輪空 (BYE)' : '待定選手'}
                </span>
                {p2?.isSeed && (
                  <span className="text-[9px] font-mono font-black px-1 rounded bg-[#7000ff]/20 text-purple-300 border border-[#7000ff]/50 shrink-0">
                    #{p2.seedNumber}
                  </span>
                )}
              </div>
              {p2 && (
                <div className="text-[10px] text-gray-400 truncate flex items-center gap-1 font-mono">
                  <span>{p2.beybladeName}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {p2 && isCompleted && match.winnerId === p2.id && (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <div
              className={`w-8 h-7 rounded flex items-center justify-center text-sm font-mono font-black ${
                match.winnerId === p2?.id && isCompleted
                  ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                  : 'bg-[#05070a] text-white border border-[#ffffff15]'
              }`}
            >
              {p2 ? match.player2Score : '-'}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom hint */}
      <div className="px-3 py-1 bg-[#05070a]/70 border-t border-[#ffffff0a] text-[10px] text-gray-400 flex items-center justify-between font-mono">
        <span>{match.roundsHistory.length > 0 ? `已戰 ${match.roundsHistory.length} 回合` : '0-11分 高者晉級'}</span>
        <span className="text-[#00f2ff] font-bold hover:underline flex items-center gap-0.5">
          點擊裁判計分 ➔
        </span>
      </div>
    </div>
  );
};
