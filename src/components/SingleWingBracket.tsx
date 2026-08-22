import React, { useState, useRef } from 'react';
import { 
  Trophy, Swords, ZoomIn, ZoomOut, RotateCcw, Award, 
  Sparkles, CheckCircle2, ChevronRight, Shield, GitBranch, ArrowRight, Zap
} from 'lucide-react';
import { Match, Player, Tournament } from '../types';
import { MatchCard } from './MatchCard';
import { PlayerPathVisualizer } from './PlayerPathVisualizer';

interface SingleWingBracketProps {
  tournament: Tournament;
  onSelectMatch: (match: Match) => void;
  isReadOnly?: boolean;
  highlightedPlayerName?: string;
}

export const SingleWingBracket: React.FC<SingleWingBracketProps> = ({
  tournament,
  onSelectMatch,
  isReadOnly = false,
  highlightedPlayerName
}) => {
  const [zoom, setZoom] = useState(1);
  const [trackedPlayerId, setTrackedPlayerId] = useState<string | null>(null);
  const [showPathVisualizer, setShowPathVisualizer] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const playerMap = new Map<string, Player>();
  tournament.players.forEach((p) => playerMap.set(p.id, p));

  const matches = tournament.matches || [];
  const maxRound = Math.max(...matches.map((m) => m.round), 1);

  // Build ordered rounds for single-wing layout (left-to-right progression)
  const roundsData: { round: number; heading: string; matches: Match[] }[] = [];

  const getRoundHeading = (r: number, totalRounds: number) => {
    const diff = totalRounds - r;
    if (diff === 0) return '🏆 總決賽';
    if (diff === 1) return '準決賽 (4強)';
    if (diff === 2) return '8強賽';
    if (diff === 3) return '16強賽';
    if (diff === 4) return '32強賽';
    if (diff === 5) return '64強賽';
    return `第 ${r} 輪`;
  };

  // Group matches round by round
  for (let r = 1; r < maxRound; r++) {
    const leftMatchesInRound = matches
      .filter((m) => m.bracketWing === 'left' && m.round === r)
      .sort((a, b) => a.matchIndex - b.matchIndex);
    const rightMatchesInRound = matches
      .filter((m) => m.bracketWing === 'right' && m.round === r)
      .sort((a, b) => a.matchIndex - b.matchIndex);

    roundsData.push({
      round: r,
      heading: getRoundHeading(r, maxRound),
      matches: [...leftMatchesInRound, ...rightMatchesInRound]
    });
  }

  // Finals Round
  const grandFinal = matches.find((m) => m.bracketWing === 'final');
  const thirdPlace = matches.find((m) => m.bracketWing === 'third_place');
  const finalsMatches: Match[] = [];
  if (grandFinal) finalsMatches.push(grandFinal);
  if (thirdPlace) finalsMatches.push(thirdPlace);

  roundsData.push({
    round: maxRound,
    heading: '🏆 總決賽之巔',
    matches: finalsMatches
  });

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.15, 1.6));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.15, 0.45));
  const handleZoomReset = () => setZoom(1);

  // Helper to check if a match has a confirmed winner
  const hasWinner = (m?: Match) => !!m?.winnerId && (m.status === 'completed' || m.status === 'bye');

  // Find champion winning route player IDs
  const championId = tournament.rankings?.champion?.id || grandFinal?.winnerId;

  return (
    <div id="single-wing-bracket-board" className="w-full flex flex-col space-y-4">
      {/* Zoom & Info Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0a0c12]/80 border border-[#ffffff10] rounded-xl text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2 text-gray-300 font-mono">
          <span className="w-2 h-2 rounded-full bg-[#00f2ff] animate-ping" />
          <span className="font-bold text-white flex items-center gap-1.5">
            <GitBranch className="w-4 h-4 text-[#00f2ff]" />
            單側樹狀圖 (由左至右對戰晉級路徑)
          </span>
          <span className="text-gray-500">|</span>
          <span className="text-emerald-400 font-bold hidden sm:inline flex items-center gap-1">
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
            線條指示 (含箭頭與勝者晉級動線)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Battle Path Visualizer */}
          <button
            onClick={() => setShowPathVisualizer((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              showPathVisualizer
                ? 'bg-[#00f2ff]/20 text-[#00f2ff] border-[#00f2ff]/50 shadow-[0_0_10px_rgba(0,242,255,0.2)]'
                : 'bg-[#05070a] text-gray-400 hover:text-white border-[#ffffff15]'
            }`}
            title="開啟/關閉選手晉級戰績路徑檢視器"
          >
            <GitBranch className="w-3.5 h-3.5 text-[#00f2ff]" />
            <span>戰績路徑</span>
          </button>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-[#05070a] px-2 py-1 rounded-lg border border-[#ffffff10] text-gray-300">
            <button
              onClick={handleZoomOut}
              className="p-1 hover:text-white rounded hover:bg-[#ffffff10] transition-colors"
              title="縮小"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="w-12 text-center font-mono font-bold text-[11px] text-[#00f2ff]">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1 hover:text-white rounded hover:bg-[#ffffff10] transition-colors"
              title="放大"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomReset}
              className="p-1 hover:text-white rounded hover:bg-[#ffffff10] transition-colors ml-1"
              title="重設大小"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Battle Path Visualizer Component (Requirement 3: 賽程表要有戰績的路徑) */}
      {showPathVisualizer && (
        <div className="w-full animate-fadeIn">
          <PlayerPathVisualizer
            tournament={tournament}
            selectedPlayerId={trackedPlayerId}
            onSelectPlayer={(pId) => setTrackedPlayerId(pId)}
            onSelectMatch={onSelectMatch}
          />
        </div>
      )}

      {/* Single-Wing Tree Board with Dynamic Battle Paths (戰勝路徑) */}
      <div className="w-full bg-[#07090f]/90 border border-[#ffffff10] rounded-2xl overflow-x-auto overflow-y-auto p-6 min-h-[680px] shadow-[0_0_50px_rgba(0,0,0,0.8)] relative cyber-grid-bg">
        <div
          ref={containerRef}
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            transition: 'transform 0.15s ease-out'
          }}
          className="flex items-stretch min-w-max py-4 px-2 single-wing-tree-container"
        >
          {roundsData.map((roundCol, roundIdx) => {
            const isFinalRound = roundIdx === roundsData.length - 1;
            const isSemiRound = roundIdx === roundsData.length - 2 && roundsData.length > 2;
            const nextRoundCol = !isFinalRound ? roundsData[roundIdx + 1] : null;

            return (
              <React.Fragment key={`single-round-col-${roundCol.round}`}>
                {/* 1. Round Column: Compact width tailored for 152px MatchCards */}
                <div className="flex flex-col space-y-3 min-w-[160px] max-w-[168px]">
                  {/* Round Header */}
                  <div
                    className={`text-center py-1.5 px-2 rounded-lg text-xs font-black uppercase tracking-wider font-mono shadow-md border ${
                      isFinalRound
                        ? 'bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                        : isSemiRound
                        ? 'bg-purple-500/15 border-purple-500/40 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.15)]'
                        : 'bg-[#00f2ff]/10 border-[#00f2ff]/30 text-[#00f2ff] shadow-[0_0_10px_rgba(0,242,255,0.1)]'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      {isFinalRound ? (
                        <Trophy className="w-3 h-3 text-amber-400 animate-bounce" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00f2ff]" />
                      )}
                      <span className="truncate">{roundCol.heading}</span>
                    </div>
                    <div className="text-[9px] text-gray-400 font-normal mt-0.5">
                      {isFinalRound ? '決賽之巔' : `${roundCol.matches.length} 場對決`}
                    </div>
                  </div>

                  {/* Match Cards Container */}
                  <div className="flex flex-col justify-around flex-1 py-1 space-y-4">
                    {roundCol.matches.map((match) => {
                      const isGrandFinalMatch = match.bracketWing === 'final';
                      const isThirdPlaceMatch = match.bracketWing === 'third_place';
                      const isMatchCompleted = hasWinner(match);
                      const isChampionMatch = championId && (match.winnerId === championId || match.player1Id === championId || match.player2Id === championId);

                      return (
                        <div
                          key={match.id}
                          className="relative flex flex-col justify-center items-center group w-full my-auto"
                        >
                          {/* Zone Indicator */}
                          {!isFinalRound && (
                            <div className="w-full flex items-center justify-between text-[9px] font-mono text-gray-400 mb-0.5 px-0.5">
                              <span className="flex items-center gap-1 font-bold">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    match.bracketWing === 'left' ? 'bg-[#00f2ff]' : 'bg-purple-400'
                                  }`}
                                />
                                <span className={match.bracketWing === 'left' ? 'text-[#00f2ff]' : 'text-purple-300'}>
                                  {match.bracketWing === 'left' ? '左翼' : '右翼'}
                                </span>
                              </span>
                              <span className="text-gray-500 font-semibold">#{match.matchNumber}</span>
                            </div>
                          )}

                          {isThirdPlaceMatch && (
                            <div className="text-center text-[10px] font-bold text-amber-400 flex items-center justify-center gap-1 font-mono mb-1">
                              <Award className="w-3 h-3" /> 季軍爭奪戰
                            </div>
                          )}

                          {/* Match Card */}
                          <div className="relative">
                            <MatchCard
                              match={match}
                              playerMap={playerMap}
                              onSelectMatch={(m) => {
                                if (m.winnerId) setTrackedPlayerId(m.winnerId);
                                onSelectMatch(m);
                              }}
                              isCenter={isGrandFinalMatch}
                              isReadOnly={isReadOnly}
                              highlightedPlayerName={highlightedPlayerName || (trackedPlayerId ? playerMap.get(trackedPlayerId)?.name : undefined)}
                            />

                            {/* Victory Path Node Badge */}
                            {isMatchCompleted && match.winnerId && (
                              <div className="absolute -right-2 top-1/2 -translate-y-1/2 bg-emerald-500 text-slate-950 rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-black shadow-[0_0_8px_rgba(16,185,129,0.9)] z-20 border border-white/40 animate-pulse" title={`勝出晉級：${playerMap.get(match.winnerId)?.name}`}>
                                ✓
                              </div>
                            )}
                          </div>

                          {/* Winner Podium for Final */}
                          {isGrandFinalMatch && tournament.rankings?.champion && (
                            <div className="w-full bg-gradient-to-r from-amber-950/70 via-amber-900/50 to-amber-950/70 border border-amber-500/70 rounded-xl p-2.5 text-center space-y-1 mt-3 shadow-[0_0_25px_rgba(245,158,11,0.3)] animate-fadeIn">
                              <div className="w-7 h-7 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-400 mx-auto border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.5)]">
                                <Trophy className="w-4 h-4 animate-bounce text-amber-300" />
                              </div>
                              <div>
                                <div className="text-[9px] font-black uppercase text-amber-400 tracking-wider font-mono">
                                  ★ 大會總冠軍 ★
                                </div>
                                <div className="text-xs font-black text-white truncate px-1">
                                  {tournament.rankings.champion.name}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Connecting Tree Bracket 戰勝路徑 (Victory Battle Paths) */}
                {!isFinalRound && nextRoundCol && (
                  <div className="flex flex-col justify-around min-w-[50px] max-w-[56px] pointer-events-none py-6 px-0.5">
                    {Array.from({ length: Math.ceil(roundCol.matches.length / 2) }).map((_, pairIdx) => {
                      const upperMatch = roundCol.matches[pairIdx * 2];
                      const lowerMatch = roundCol.matches[pairIdx * 2 + 1];
                      const nextMatch = nextRoundCol.matches[pairIdx];

                      const upperWinnerId = upperMatch?.winnerId;
                      const lowerWinnerId = lowerMatch?.winnerId;

                      const isUpperWinner = hasWinner(upperMatch);
                      const isLowerWinner = hasWinner(lowerMatch);

                      const isUpperAdvancing = isUpperWinner && nextMatch && (nextMatch.player1Id === upperWinnerId || nextMatch.player2Id === upperWinnerId);
                      const isLowerAdvancing = isLowerWinner && nextMatch && (nextMatch.player1Id === lowerWinnerId || nextMatch.player2Id === lowerWinnerId);

                      const isChampionUpper = championId && upperWinnerId === championId;
                      const isChampionLower = championId && lowerWinnerId === championId;

                      const isTrackedUpper = trackedPlayerId && (upperWinnerId === trackedPlayerId || upperMatch?.player1Id === trackedPlayerId || upperMatch?.player2Id === trackedPlayerId);
                      const isTrackedLower = trackedPlayerId && (lowerWinnerId === trackedPlayerId || lowerMatch?.player1Id === trackedPlayerId || lowerMatch?.player2Id === trackedPlayerId);

                      const gradId = `single-grad-path-${roundCol.round}-${pairIdx}`;

                      return (
                        <div
                          key={`single-bracket-wire-${roundCol.round}-${pairIdx}`}
                          className="flex flex-col justify-center items-stretch flex-1 relative my-1 min-h-[110px]"
                        >
                          <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
                            <defs>
                              {/* Arrow Head Markers for Line Indicators */}
                              <marker
                                id={`arrow-neutral-${roundCol.round}-${pairIdx}`}
                                viewBox="0 0 10 10"
                                refX="8"
                                refY="5"
                                markerWidth="6"
                                markerHeight="6"
                                orient="auto-start-reverse"
                              >
                                <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
                              </marker>

                              <marker
                                id={`arrow-advancing-${roundCol.round}-${pairIdx}`}
                                viewBox="0 0 10 10"
                                refX="8"
                                refY="5"
                                markerWidth="7"
                                markerHeight="7"
                                orient="auto-start-reverse"
                              >
                                <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
                              </marker>

                              <marker
                                id={`arrow-tracked-${roundCol.round}-${pairIdx}`}
                                viewBox="0 0 10 10"
                                refX="8"
                                refY="5"
                                markerWidth="7"
                                markerHeight="7"
                                orient="auto-start-reverse"
                              >
                                <path d="M 0 0 L 10 5 L 0 10 z" fill="#00f2ff" />
                              </marker>

                              <marker
                                id={`arrow-gold-${roundCol.round}-${pairIdx}`}
                                viewBox="0 0 10 10"
                                refX="8"
                                refY="5"
                                markerWidth="8"
                                markerHeight="8"
                                orient="auto-start-reverse"
                              >
                                <path d="M 0 0 L 10 5 L 0 10 z" fill="#fbbf24" />
                              </marker>

                              <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#00f2ff" stopOpacity="0.9" />
                                <stop offset="100%" stopColor="#10b981" stopOpacity="1" />
                              </linearGradient>
                              <linearGradient id={`gold-grad-${roundCol.round}-${pairIdx}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#f59e0b" stopOpacity="1" />
                                <stop offset="100%" stopColor="#fbbf24" stopOpacity="1" />
                              </linearGradient>
                            </defs>

                            {/* Top Branch (Upper Match -> Joint) */}
                            <path
                              d="M 0,25% L 50%,25% L 50%,50%"
                              fill="none"
                              stroke={
                                isChampionUpper
                                  ? `url(#gold-grad-${roundCol.round}-${pairIdx})`
                                  : isTrackedUpper
                                  ? '#00f2ff'
                                  : isUpperAdvancing
                                  ? `url(#${gradId})`
                                  : '#475569'
                              }
                              strokeWidth={isChampionUpper ? 3.5 : isTrackedUpper || isUpperAdvancing ? 2.8 : 1.8}
                              strokeDasharray={isUpperAdvancing ? 'none' : '4,3'}
                              className={
                                isChampionUpper
                                  ? 'drop-shadow-[0_0_10px_rgba(245,158,11,0.9)]'
                                  : isTrackedUpper || isUpperAdvancing
                                  ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                                  : ''
                              }
                            />

                            {/* Bottom Branch (Lower Match -> Joint) */}
                            <path
                              d="M 0,75% L 50%,75% L 50%,50%"
                              fill="none"
                              stroke={
                                isChampionLower
                                  ? `url(#gold-grad-${roundCol.round}-${pairIdx})`
                                  : isTrackedLower
                                  ? '#00f2ff'
                                  : isLowerAdvancing
                                  ? `url(#${gradId})`
                                  : '#475569'
                              }
                              strokeWidth={isChampionLower ? 3.5 : isTrackedLower || isLowerAdvancing ? 2.8 : 1.8}
                              strokeDasharray={isLowerAdvancing ? 'none' : '4,3'}
                              className={
                                isChampionLower
                                  ? 'drop-shadow-[0_0_10px_rgba(245,158,11,0.9)]'
                                  : isTrackedLower || isLowerAdvancing
                                  ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                                  : ''
                              }
                            />

                            {/* Junction Center Pivot Node */}
                            <circle
                              cx="50%"
                              cy="50%"
                              r={isChampionUpper || isChampionLower ? 4.5 : isUpperAdvancing || isLowerAdvancing ? 4 : 2.5}
                              fill={
                                isChampionUpper || isChampionLower
                                  ? '#fbbf24'
                                  : isUpperAdvancing || isLowerAdvancing
                                  ? '#10b981'
                                  : '#64748b'
                              }
                              stroke="#0a0c12"
                              strokeWidth="1.5"
                              className={isUpperAdvancing || isLowerAdvancing ? 'drop-shadow-[0_0_6px_rgba(16,185,129,0.9)]' : ''}
                            />

                            {/* Stem line leading into Next Match with Arrow Indicator (Joint -> 98%) */}
                            <path
                              d="M 50%,50% L 96%,50%"
                              fill="none"
                              stroke={
                                isChampionUpper || isChampionLower
                                  ? '#fbbf24'
                                  : isUpperAdvancing || isLowerAdvancing
                                  ? '#10b981'
                                  : '#64748b'
                              }
                              strokeWidth={isChampionUpper || isChampionLower ? 3.5 : isUpperAdvancing || isLowerAdvancing ? 2.8 : 1.8}
                              markerEnd={
                                isChampionUpper || isChampionLower
                                  ? `url(#arrow-gold-${roundCol.round}-${pairIdx})`
                                  : isUpperAdvancing || isLowerAdvancing
                                  ? `url(#arrow-advancing-${roundCol.round}-${pairIdx})`
                                  : `url(#arrow-neutral-${roundCol.round}-${pairIdx})`
                              }
                              className={
                                isChampionUpper || isChampionLower
                                  ? 'drop-shadow-[0_0_10px_rgba(245,158,11,0.9)]'
                                  : isUpperAdvancing || isLowerAdvancing
                                  ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                                  : ''
                              }
                            />
                          </svg>
                        </div>
                      );
                    })}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
