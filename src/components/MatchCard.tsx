import React from 'react';
import { Trophy, Shield, Check, Lock } from 'lucide-react';
import { Match, Player, TournamentStatus } from '../types';

interface MatchCardProps {
  match: Match;
  playerMap: Map<string, Player>;
  onSelectMatch: (match: Match) => void;
  isCenter?: boolean;
  isReadOnly?: boolean;
  canScore?: boolean;
  tournamentStatus?: TournamentStatus;
  highlightedPlayerName?: string;
}

export const MatchCard: React.FC<MatchCardProps> = ({
  match,
  playerMap,
  onSelectMatch,
  isCenter = false,
  isReadOnly = false,
  canScore = true,
  tournamentStatus,
  highlightedPlayerName
}) => {
  const p1 = match.player1Id ? playerMap.get(match.player1Id) : null;
  const p2 = match.player2Id ? playerMap.get(match.player2Id) : null;

  const isCompleted = match.status === 'completed';
  const isBye = match.status === 'bye';
  const isReady = p1 && p2 && !isCompleted;

  const isP1Highlighted = highlightedPlayerName && p1?.name.toLowerCase().includes(highlightedPlayerName.toLowerCase().trim());
  const isP2Highlighted = highlightedPlayerName && p2?.name.toLowerCase().includes(highlightedPlayerName.toLowerCase().trim());
  const hasHighlight = isP1Highlighted || isP2Highlighted;

  const isP1Winner = isCompleted && match.winnerId === p1?.id;
  const isP2Winner = isCompleted && match.winnerId === p2?.id;

  const p1DisplayName = p1 ? p1.name : isBye && !p2 ? '—' : '待定';
  const p2DisplayName = p2 ? p2.name : isBye ? '輪空' : '待定';

  // Determine clickability: only allow scoring interaction during in_progress
  const isInteractive = isReadOnly || canScore;
  const lockTooltip = !isReadOnly && !canScore
    ? tournamentStatus === 'completed'
      ? '賽事已結束：賽程與計分已封存鎖定，不開放裁判計分台'
      : '尚未開賽：請先點擊上方「正式開賽 (Start)」按鈕以開放裁判計分台'
    : undefined;

  return (
    <div
      id={`match-card-${match.id}`}
      onClick={() => {
        if (p1 || p2) onSelectMatch(match);
      }}
      title={lockTooltip}
      className={`relative w-[154px] h-[74px] rounded-lg transition-all duration-150 overflow-hidden border select-none shrink-0 flex flex-col justify-between ${
        !isInteractive
          ? 'cursor-not-allowed opacity-80 hover:opacity-90 border-slate-700/60 bg-[#080a10]'
          : 'cursor-pointer'
      } ${
        hasHighlight
          ? 'bg-[#0e1726] border-[#00f2ff] shadow-[0_0_20px_rgba(0,242,255,0.4)] ring-2 ring-[#00f2ff]/70 scale-[1.03] z-10'
          : isCenter
          ? `bg-[#0e111a] border-amber-400/80 shadow-[0_0_18px_rgba(245,158,11,0.25)] ${isInteractive ? 'hover:border-amber-300 hover:scale-[1.02]' : ''}`
          : isCompleted
          ? `bg-[#0a0c12] border-[#ffffff15] ${isInteractive ? 'hover:border-[#00f2ff]/50' : ''}`
          : isReady
          ? `bg-[#0a0c12] border-[#00f2ff]/40 ${isInteractive ? 'hover:border-[#00f2ff] shadow-[0_0_10px_rgba(0,242,255,0.1)]' : ''}`
          : 'bg-[#07090f]/90 border-[#ffffff0a] opacity-80'
      }`}
    >
      {/* Top Streamlined Header Bar: 場次號碼 */}
      <div className="h-[20px] px-2 bg-[#05070a] border-b border-[#ffffff10] flex items-center justify-between text-[10px] font-mono leading-tight shrink-0">
        <div className="flex items-center gap-1 font-bold truncate">
          {match.bracketWing === 'final' ? (
            <span className="text-amber-400 font-black flex items-center gap-0.5">
              <Trophy className="w-2.5 h-2.5" /> 總決賽
            </span>
          ) : match.bracketWing === 'third_place' ? (
            <span className="text-amber-300/90 font-black">🥉 季軍賽</span>
          ) : (
            <span className="text-[#00f2ff] font-bold">#{match.matchNumber}</span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[9px] shrink-0 font-medium">
          {!isInteractive && (
            <Lock className="w-2.5 h-2.5 text-slate-500" />
          )}
          {isBye ? (
            <span className="text-gray-500">輪空</span>
          ) : isCompleted ? (
            <span className="text-emerald-400 font-bold">完賽</span>
          ) : isReady ? (
            <span className="text-orange-400 font-bold">進行中</span>
          ) : (
            <span className="text-gray-600">待定</span>
          )}
        </div>
      </div>

      {/* Players & Scores Section: 選手簡稱 (預設 6 個中文字寬度) + 得分 */}
      <div className="p-1 space-y-0.5 flex-1 flex flex-col justify-center">
        {/* Player 1 Row */}
        <div
          className={`h-[24px] px-1.5 rounded flex items-center justify-between transition-colors ${
            isP1Winner
              ? 'bg-emerald-950/50 text-white font-bold border border-emerald-500/40'
              : isCompleted && match.loserId === p1?.id
              ? 'bg-[#07090f]/40 text-gray-500'
              : p1
              ? 'bg-[#11141d]/70 text-gray-200 hover:bg-[#11141d]'
              : 'bg-[#07090f]/30 text-gray-600'
          }`}
          title={p1?.name}
        >
          <div className="flex items-center gap-1 min-w-0 pr-0.5">
            {/* Player Name: width preset for 6 Chinese characters */}
            <span
              className={`text-[11px] leading-tight w-[6em] max-w-[6em] truncate ${
                isP1Winner ? 'text-emerald-300 font-black' : p1 ? 'text-gray-200 font-bold' : 'text-gray-500'
              }`}
            >
              {p1DisplayName}
            </span>
            {p1?.isSeed && (
              <span className="text-[8px] font-mono px-0.5 py-0 rounded bg-[#7000ff]/20 text-purple-300 shrink-0 leading-none" title={`第 ${p1.seedNumber} 種子`}>
                #{p1.seedNumber}
              </span>
            )}
            {p1?.isReserve && (
              <span className="text-[8px] font-mono px-0.5 py-0 rounded bg-amber-500/20 text-amber-300 shrink-0 leading-none">
                備
              </span>
            )}
            {p1?.isRepechage && (
              <span className="text-[8px] font-mono px-0.5 py-0 rounded bg-amber-500/30 text-amber-300 font-bold shrink-0 leading-none">
                復
              </span>
            )}
          </div>

          <div
            className={`w-5 h-4.5 rounded flex items-center justify-center text-[11px] font-mono font-black shrink-0 ${
              isP1Winner
                ? 'bg-emerald-500 text-black font-bold shadow-[0_0_6px_rgba(16,185,129,0.6)]'
                : 'bg-[#05070a] text-white border border-[#ffffff15]'
            }`}
          >
            {p1 ? match.player1Score : '-'}
          </div>
        </div>

        {/* Player 2 Row */}
        <div
          className={`h-[24px] px-1.5 rounded flex items-center justify-between transition-colors ${
            isP2Winner
              ? 'bg-emerald-950/50 text-white font-bold border border-emerald-500/40'
              : isCompleted && match.loserId === p2?.id
              ? 'bg-[#07090f]/40 text-gray-500'
              : p2
              ? 'bg-[#11141d]/70 text-gray-200 hover:bg-[#11141d]'
              : 'bg-[#07090f]/30 text-gray-600'
          }`}
          title={p2?.name}
        >
          <div className="flex items-center gap-1 min-w-0 pr-0.5">
            {/* Player Name: width preset for 6 Chinese characters */}
            <span
              className={`text-[11px] leading-tight w-[6em] max-w-[6em] truncate ${
                isP2Winner ? 'text-emerald-300 font-black' : p2 ? 'text-gray-200 font-bold' : 'text-gray-500'
              }`}
            >
              {p2DisplayName}
            </span>
            {p2?.isSeed && (
              <span className="text-[8px] font-mono px-0.5 py-0 rounded bg-[#7000ff]/20 text-purple-300 shrink-0 leading-none" title={`第 ${p2.seedNumber} 種子`}>
                #{p2.seedNumber}
              </span>
            )}
            {p2?.isReserve && (
              <span className="text-[8px] font-mono px-0.5 py-0 rounded bg-amber-500/20 text-amber-300 shrink-0 leading-none">
                備
              </span>
            )}
            {p2?.isRepechage && (
              <span className="text-[8px] font-mono px-0.5 py-0 rounded bg-amber-500/30 text-amber-300 font-bold shrink-0 leading-none">
                復
              </span>
            )}
          </div>

          <div
            className={`w-5 h-4.5 rounded flex items-center justify-center text-[11px] font-mono font-black shrink-0 ${
              isP2Winner
                ? 'bg-emerald-500 text-black font-bold shadow-[0_0_6px_rgba(16,185,129,0.6)]'
                : 'bg-[#05070a] text-white border border-[#ffffff15]'
            }`}
          >
            {p2 ? match.player2Score : '-'}
          </div>
        </div>
      </div>
    </div>
  );
};

