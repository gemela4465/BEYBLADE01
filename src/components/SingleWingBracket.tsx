import React, { useState, useRef } from 'react';
import { 
  Trophy, Swords, ZoomIn, ZoomOut, RotateCcw, Award, 
  Sparkles, CheckCircle2, ChevronRight, Shield, GitBranch, ArrowRight
} from 'lucide-react';
import { Match, Player, Tournament } from '../types';
import { MatchCard } from './MatchCard';

interface SingleWingBracketProps {
  tournament: Tournament;
  onSelectMatch: (match: Match) => void;
  isReadOnly?: boolean;
  highlightedPlayerName?: string;
}

interface TreeMatchNode {
  match: Match;
  prevMatches: TreeMatchNode[];
}

export const SingleWingBracket: React.FC<SingleWingBracketProps> = ({
  tournament,
  onSelectMatch,
  isReadOnly = false,
  highlightedPlayerName
}) => {
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const playerMap = new Map<string, Player>();
  tournament.players.forEach((p) => playerMap.set(p.id, p));

  const matches = tournament.matches;
  const maxRound = Math.max(...matches.map((m) => m.round), 1);

  // Group matches by round for single-wing layout (left-to-right progression)
  // To ensure the tree pairs align properly:
  // For Round 1 to wing finals: Order left wing matches first (in order), then right wing matches
  const roundsData: { round: number; heading: string; matches: Match[] }[] = [];

  const getRoundHeading = (r: number, totalRounds: number) => {
    const diff = totalRounds - r;
    if (diff === 0) return '🏆 總決賽 & 季軍戰';
    if (diff === 1) return '準決賽 (Semi-Finals)';
    if (diff === 2) return '8強賽 (Quarter-Finals)';
    if (diff === 3) return '16強賽';
    if (diff === 4) return '32強賽';
    if (diff === 5) return '64強賽';
    return `第 ${r} 輪`;
  };

  // Build ordered rounds
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
    heading: '🏆 決賽之巔 (Finals)',
    matches: finalsMatches
  });

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.15, 1.6));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.15, 0.45));
  const handleZoomReset = () => setZoom(1);

  // Helper to check if a match has a confirmed winner
  const hasWinner = (m?: Match) => !!m?.winnerId && (m.status === 'completed' || m.status === 'bye');

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Zoom & Info Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0a0c12]/80 border border-[#ffffff10] rounded-xl text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2 text-gray-300 font-mono">
          <span className="w-2 h-2 rounded-full bg-[#00f2ff] animate-ping" />
          <span className="font-bold text-white flex items-center gap-1.5">
            <GitBranch className="w-4 h-4 text-[#00f2ff]" />
            單側樹狀圖 (由左至右)
          </span>
          <span className="text-gray-500">|</span>
          <span className="text-gray-400 hidden sm:inline">第 1 輪對決路徑依序匯流至第 2 輪與總決賽</span>
        </div>

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

      {/* Single-Wing Tree Board with Battle Paths (對戰路徑) */}
      <div className="w-full bg-[#07090f]/90 border border-[#ffffff10] rounded-2xl overflow-x-auto overflow-y-auto p-6 min-h-[720px] shadow-[0_0_50px_rgba(0,0,0,0.8)] relative cyber-grid-bg">
        <div
          ref={containerRef}
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            transition: 'transform 0.15s ease-out'
          }}
          className="flex items-stretch min-w-max py-8 px-4"
        >
          {roundsData.map((roundCol, roundIdx) => {
            const isFinalRound = roundIdx === roundsData.length - 1;
            const isSemiRound = roundIdx === roundsData.length - 2 && roundsData.length > 2;
            const nextRoundCol = !isFinalRound ? roundsData[roundIdx + 1] : null;

            return (
              <React.Fragment key={`single-round-col-${roundCol.round}`}>
                {/* 1. Round Column */}
                <div className="flex flex-col space-y-4 min-w-[270px] max-w-[280px]">
                  {/* Round Header */}
                  <div
                    className={`text-center py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider font-mono shadow-md border ${
                      isFinalRound
                        ? 'bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                        : isSemiRound
                        ? 'bg-purple-500/15 border-purple-500/40 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.15)]'
                        : 'bg-[#00f2ff]/10 border-[#00f2ff]/30 text-[#00f2ff] shadow-[0_0_10px_rgba(0,242,255,0.1)]'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      {isFinalRound ? (
                        <Trophy className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00f2ff]" />
                      )}
                      <span>{roundCol.heading}</span>
                    </div>
                    <div className="text-[10px] text-gray-400 font-normal mt-0.5">
                      {isFinalRound ? '冠亞季殿決賽' : `${roundCol.matches.length} 場對決`}
                    </div>
                  </div>

                  {/* Match Cards Container: Distributed evenly along the vertical tree axis */}
                  <div className="flex flex-col justify-around flex-1 py-2 space-y-6">
                    {roundCol.matches.map((match, mIdx) => {
                      const isGrandFinalMatch = match.bracketWing === 'final';
                      const isThirdPlaceMatch = match.bracketWing === 'third_place';
                      const isMatchCompleted = hasWinner(match);

                      return (
                        <div
                          key={match.id}
                          className="relative flex flex-col justify-center items-center group w-full my-auto"
                        >
                          {/* Left Wing / Right Wing Zone Tag */}
                          {!isFinalRound && (
                            <div className="w-full flex items-center justify-between text-[10px] font-mono text-gray-400 mb-1 px-1">
                              <span className="flex items-center gap-1 font-bold">
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    match.bracketWing === 'left' ? 'bg-[#00f2ff]' : 'bg-purple-400'
                                  }`}
                                />
                                <span className={match.bracketWing === 'left' ? 'text-[#00f2ff]' : 'text-purple-300'}>
                                  {match.bracketWing === 'left' ? '左翼賽區' : '右翼賽區'}
                                </span>
                              </span>
                              <span className="text-gray-500">#{match.matchNumber}</span>
                            </div>
                          )}

                          {isThirdPlaceMatch && (
                            <div className="text-center text-[11px] font-bold text-amber-400 flex items-center justify-center gap-1 font-mono mb-1.5">
                              <Award className="w-3.5 h-3.5" /> 季殿軍爭奪戰 (3rd Place Match)
                            </div>
                          )}

                          {/* Match Card */}
                          <div className="w-full relative">
                            <MatchCard
                              match={match}
                              playerMap={playerMap}
                              onSelectMatch={onSelectMatch}
                              isCenter={isGrandFinalMatch}
                              isReadOnly={isReadOnly}
                              highlightedPlayerName={highlightedPlayerName}
                            />
                          </div>

                          {/* Winner Trophy Podium Banner for Grand Final */}
                          {isGrandFinalMatch && tournament.rankings?.champion && (
                            <div className="w-full bg-gradient-to-r from-amber-950/60 via-amber-900/40 to-amber-950/60 border-2 border-amber-500/70 rounded-2xl p-4 text-center space-y-2 mt-4 shadow-[0_0_30px_rgba(245,158,11,0.3)] animate-fade-in">
                              <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-400 mx-auto border border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.5)]">
                                <Trophy className="w-6 h-6 animate-pulse text-amber-300" />
                              </div>
                              <div>
                                <div className="text-[11px] font-black uppercase text-amber-400 tracking-widest font-mono">
                                  ★ 本場大會總冠軍 ★
                                </div>
                                <div className="text-lg font-black text-white mt-0.5 tracking-wide">
                                  {tournament.rankings.champion.name}
                                </div>
                                <div className="text-xs text-amber-300 font-mono font-bold mt-0.5">
                                  {tournament.rankings.champion.beybladeName || '戰鬥陀螺 X'}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Connecting Tree Bracket Battle Path Column (對戰路徑) */}
                {!isFinalRound && nextRoundCol && (
                  <div className="flex flex-col justify-around min-w-[64px] max-w-[70px] pointer-events-none py-12 px-1">
                    {/* For standard binary tree branch pairing */}
                    {Array.from({ length: Math.ceil(roundCol.matches.length / 2) }).map((_, pairIdx) => {
                      const upperMatch = roundCol.matches[pairIdx * 2];
                      const lowerMatch = roundCol.matches[pairIdx * 2 + 1];
                      const nextMatch = nextRoundCol.matches[pairIdx];

                      const upperWinner = hasWinner(upperMatch);
                      const lowerWinner = hasWinner(lowerMatch);
                      const isUpperAdvancing = upperWinner && nextMatch && (nextMatch.player1Id === upperMatch?.winnerId || nextMatch.player2Id === upperMatch?.winnerId);
                      const isLowerAdvancing = lowerWinner && nextMatch && (nextMatch.player1Id === lowerMatch?.winnerId || nextMatch.player2Id === lowerMatch?.winnerId);

                      return (
                        <div
                          key={`bracket-wire-pair-${roundCol.round}-${pairIdx}`}
                          className="flex flex-col justify-center items-stretch flex-1 relative my-2 min-h-[140px]"
                        >
                          <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
                            <defs>
                              <linearGradient id={`grad-active-${roundCol.round}-${pairIdx}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#00f2ff" stopOpacity="0.9" />
                                <stop offset="100%" stopColor="#10b981" stopOpacity="1" />
                              </linearGradient>
                            </defs>

                            {/* Top branch line coming from Upper Match */}
                            <path
                              d="M 0,25% L 50%,25% L 50%,50%"
                              fill="none"
                              stroke={isUpperAdvancing ? `url(#grad-active-${roundCol.round}-${pairIdx})` : '#ffffff20'}
                              strokeWidth={isUpperAdvancing ? 3 : 1.5}
                              strokeDasharray={isUpperAdvancing ? 'none' : '4,3'}
                              className={isUpperAdvancing ? 'drop-shadow-[0_0_8px_rgba(0,242,255,0.8)]' : ''}
                            />

                            {/* Bottom branch line coming from Lower Match */}
                            <path
                              d="M 0,75% L 50%,75% L 50%,50%"
                              fill="none"
                              stroke={isLowerAdvancing ? `url(#grad-active-${roundCol.round}-${pairIdx})` : '#ffffff20'}
                              strokeWidth={isLowerAdvancing ? 3 : 1.5}
                              strokeDasharray={isLowerAdvancing ? 'none' : '4,3'}
                              className={isLowerAdvancing ? 'drop-shadow-[0_0_8px_rgba(0,242,255,0.8)]' : ''}
                            />

                            {/* Stem line leading into Next Match */}
                            <path
                              d="M 50%,50% L 100%,50%"
                              fill="none"
                              stroke={isUpperAdvancing || isLowerAdvancing ? '#10b981' : '#ffffff25'}
                              strokeWidth={isUpperAdvancing || isLowerAdvancing ? 3 : 1.5}
                              className={isUpperAdvancing || isLowerAdvancing ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]' : ''}
                            />

                            {/* Glowing node at junction */}
                            {(isUpperAdvancing || isLowerAdvancing) && (
                              <circle
                                cx="50%"
                                cy="50%"
                                r="3.5"
                                fill="#00f2ff"
                                className="animate-ping"
                              />
                            )}
                            <circle
                              cx="50%"
                              cy="50%"
                              r="2.5"
                              fill={isUpperAdvancing || isLowerAdvancing ? '#10b981' : '#ffffff40'}
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
