import React, { useState, useRef } from 'react';
import { 
  Trophy, Swords, ZoomIn, ZoomOut, RotateCcw, Award, 
  Sparkles, CheckCircle2, ChevronRight, Shield, GitBranch, ArrowRight, Zap
} from 'lucide-react';
import { Match, Player, Tournament, TournamentStatus } from '../types';
import { MatchCard } from './MatchCard';
import { BracketRouteImage, MatchWinnerSlot } from './BracketRouteImage';

interface SingleWingBracketProps {
  tournament: Tournament;
  onSelectMatch: (match: Match) => void;
  isReadOnly?: boolean;
  canScore?: boolean;
  tournamentStatus?: TournamentStatus;
  highlightedPlayerName?: string;
  zoom?: number;
}

export const SingleWingBracket: React.FC<SingleWingBracketProps> = ({
  tournament,
  onSelectMatch,
  isReadOnly = false,
  canScore = true,
  tournamentStatus,
  highlightedPlayerName,
  zoom: externalZoom,
}) => {
  const [internalZoom] = useState(1);
  const zoom = externalZoom ?? internalZoom;
  const [trackedPlayerId, setTrackedPlayerId] = useState<string | null>(null);
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

  // Helper to check if a match has a confirmed winner
  const hasWinner = (m?: Match) => !!m?.winnerId && (m.status === 'completed' || m.status === 'bye');

  // Find champion winning route player IDs
  const championId = tournament.rankings?.champion?.id || grandFinal?.winnerId;

  return (
    <div id="single-wing-bracket-board" className="w-full flex flex-col space-y-4">
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
                {/* 1. Round Column: Compact width tailored for 154px MatchCards */}
                <div className="flex flex-col min-w-[156px] max-w-[162px]">
                  {/* Fixed-height Round Header (h-[32px] mb-3) */}
                  <div
                    className={`text-center px-2 rounded-lg text-xs font-black uppercase tracking-wider font-mono shadow-md border h-[32px] mb-3 flex items-center justify-center shrink-0 ${
                      isFinalRound
                        ? 'bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                        : isSemiRound
                        ? 'bg-purple-500/15 border-purple-500/40 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.15)]'
                        : 'bg-[#00f2ff]/10 border-[#00f2ff]/30 text-[#00f2ff] shadow-[0_0_10px_rgba(0,242,255,0.1)]'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      {isFinalRound ? (
                        <Trophy className="w-3 h-3 text-amber-400" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00f2ff]" />
                      )}
                      <span className="truncate">{roundCol.heading}</span>
                    </div>
                  </div>

                  {/* Match Cards Container */}
                  <div className="flex flex-col justify-around flex-1 py-1 space-y-4">
                    {roundCol.matches.map((match) => {
                      const isGrandFinalMatch = match.bracketWing === 'final';
                      const isThirdPlaceMatch = match.bracketWing === 'third_place';
                      const isMatchCompleted = hasWinner(match);

                      return (
                        <div
                          key={match.id}
                          className="relative flex flex-col justify-center items-center group w-full my-auto"
                        >
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
                              canScore={canScore}
                              tournamentStatus={tournamentStatus || tournament.status}
                              highlightedPlayerName={highlightedPlayerName || (trackedPlayerId ? playerMap.get(trackedPlayerId)?.name : undefined)}
                            />
                          </div>

                          {/* Winner Podium for Final */}
                          {isGrandFinalMatch && tournament.rankings?.champion && (
                            <div className="w-full bg-gradient-to-r from-amber-950/70 via-amber-900/50 to-amber-950/70 border border-amber-500/70 rounded-xl p-2 text-center space-y-0.5 mt-2 shadow-[0_0_20px_rgba(245,158,11,0.25)]">
                              <div className="w-6 h-6 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-400 mx-auto border border-amber-500/50">
                                <Trophy className="w-3.5 h-3.5 text-amber-300" />
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
                  <div className="flex flex-col min-w-[56px] max-w-[64px] pointer-events-none self-stretch">
                    {/* Header spacer to perfectly align line heights with match cards (h-[32px] mb-3) */}
                    <div className="h-[32px] mb-3 invisible select-none shrink-0" />

                    <div className="flex flex-col justify-around flex-1 py-1">
                      {Array.from({ length: Math.ceil(roundCol.matches.length / 2) }).map((_, pairIdx) => {
                        const upperMatch = roundCol.matches[pairIdx * 2];
                        const lowerMatch = roundCol.matches[pairIdx * 2 + 1];

                        const upperWinnerId = upperMatch?.winnerId;
                        const lowerWinnerId = lowerMatch?.winnerId;

                        const upperSlot: MatchWinnerSlot =
                          (upperMatch?.status === 'completed' || upperMatch?.status === 'bye') && upperWinnerId
                            ? upperWinnerId === upperMatch?.player1Id
                              ? 'p1'
                              : upperWinnerId === upperMatch?.player2Id
                              ? 'p2'
                              : 'p1'
                            : 'none';

                        const lowerSlot: MatchWinnerSlot =
                          (lowerMatch?.status === 'completed' || lowerMatch?.status === 'bye') && lowerWinnerId
                            ? lowerWinnerId === lowerMatch?.player1Id
                              ? 'p1'
                              : lowerWinnerId === lowerMatch?.player2Id
                              ? 'p2'
                              : 'p1'
                            : 'none';

                        const isChampionUpper = Boolean(championId && upperWinnerId === championId);
                        const isChampionLower = Boolean(championId && lowerWinnerId === championId);

                        const isTrackedUpper = Boolean(
                          trackedPlayerId &&
                            (upperWinnerId === trackedPlayerId ||
                              upperMatch?.player1Id === trackedPlayerId ||
                              upperMatch?.player2Id === trackedPlayerId)
                        );
                        const isTrackedLower = Boolean(
                          trackedPlayerId &&
                            (lowerWinnerId === trackedPlayerId ||
                              lowerMatch?.player1Id === trackedPlayerId ||
                              lowerMatch?.player2Id === trackedPlayerId)
                        );

                        return (
                          <div
                            key={`single-bracket-wire-${roundCol.round}-${pairIdx}`}
                            className="flex flex-col justify-center items-stretch flex-1 relative my-1 min-h-[90px]"
                          >
                            <BracketRouteImage
                              direction="left-to-right"
                              upperWinnerSlot={upperSlot}
                              lowerWinnerSlot={lowerSlot}
                              isUpperChampion={isChampionUpper}
                              isLowerChampion={isChampionLower}
                              isUpperTracked={isTrackedUpper}
                              isLowerTracked={isTrackedLower}
                              colorTheme="emerald"
                            />
                          </div>
                        );
                      })}
                    </div>
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
