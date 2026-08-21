import React, { useState, useRef } from 'react';
import { 
  Trophy, Swords, ZoomIn, ZoomOut, RotateCcw, Award, 
  Sparkles, CheckCircle2, ChevronRight, Shield
} from 'lucide-react';
import { Match, Player, Tournament } from '../types';
import { MatchCard } from './MatchCard';

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
  const containerRef = useRef<HTMLDivElement>(null);

  const playerMap = new Map<string, Player>();
  tournament.players.forEach((p) => playerMap.set(p.id, p));

  const matches = tournament.matches;
  const maxRound = Math.max(...matches.map((m) => m.round), 1);

  // Group matches by round for single-wing layout (left-to-right progression)
  // For rounds 1 to (maxRound - 1): Order Left Wing matches, then Right Wing matches
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

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Zoom Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0a0c12]/80 border border-[#ffffff10] rounded-xl text-xs">
        <div className="flex items-center gap-2 text-gray-300 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>單側由左至右階層圖 (Left-to-Right Single-Wing Bracket)</span>
          <span className="text-gray-500">|</span>
          <span className="text-gray-400">從第 1 輪循序推進至總冠軍戰</span>
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

      {/* Single-Wing Tree Board */}
      <div className="w-full bg-[#07090f]/90 border border-[#ffffff10] rounded-2xl overflow-x-auto overflow-y-auto p-6 min-h-[700px] shadow-[0_0_50px_rgba(0,0,0,0.8)] relative cyber-grid-bg">
        <div
          ref={containerRef}
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            transition: 'transform 0.15s ease-out'
          }}
          className="flex items-start gap-12 min-w-max py-8 px-4"
        >
          {roundsData.map((roundCol, roundIdx) => {
            const isFinalRound = roundIdx === roundsData.length - 1;
            const isSemiRound = roundIdx === roundsData.length - 2 && roundsData.length > 2;

            return (
              <div
                key={`single-round-${roundCol.round}`}
                className="flex flex-col space-y-4 min-w-[280px]"
              >
                {/* Round Header */}
                <div
                  className={`text-center py-2 px-3.5 rounded-xl text-xs font-black uppercase tracking-wider font-mono shadow-md border ${
                    isFinalRound
                      ? 'bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                      : isSemiRound
                      ? 'bg-purple-500/15 border-purple-500/40 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.15)]'
                      : 'bg-[#00f2ff]/10 border-[#00f2ff]/30 text-[#00f2ff] shadow-[0_0_10px_rgba(0,242,255,0.1)]'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    {isFinalRound && <Trophy className="w-3.5 h-3.5 text-amber-400 animate-bounce" />}
                    <span>{roundCol.heading}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 font-normal mt-0.5">
                    {isFinalRound ? '冠亞季殿決賽' : `${roundCol.matches.length} 場對決`}
                  </div>
                </div>

                {/* Match Cards in this round column */}
                <div className="flex flex-col justify-around flex-1 space-y-8 pt-2">
                  {roundCol.matches.map((match, mIdx) => {
                    const isGrandFinalMatch = match.bracketWing === 'final';
                    const isThirdPlaceMatch = match.bracketWing === 'third_place';

                    return (
                      <div
                        key={match.id}
                        className="relative flex items-center group"
                      >
                        {/* Wing indicator badge on left of card */}
                        {!isFinalRound && (
                          <span
                            className={`absolute -left-3 top-1/2 -translate-y-1/2 w-2 h-8 rounded-l border-l border-y ${
                              match.bracketWing === 'left'
                                ? 'bg-[#00f2ff]/30 border-[#00f2ff]'
                                : 'bg-[#7000ff]/30 border-purple-500'
                            }`}
                            title={match.bracketWing === 'left' ? '左翼賽區' : '右翼賽區'}
                          />
                        )}

                        <div className="flex flex-col gap-2 w-full">
                          {isThirdPlaceMatch && (
                            <div className="text-center text-[11px] font-bold text-amber-400 flex items-center justify-center gap-1 font-mono pt-2">
                              <Award className="w-3 h-3" /> 季殿軍戰 (3rd Place Match)
                            </div>
                          )}

                          <MatchCard
                            match={match}
                            playerMap={playerMap}
                            onSelectMatch={onSelectMatch}
                            isCenter={isGrandFinalMatch}
                            isReadOnly={isReadOnly}
                            highlightedPlayerName={highlightedPlayerName}
                          />

                          {/* Winner announcement if Grand Final is complete */}
                          {isGrandFinalMatch && tournament.rankings?.champion && (
                            <div className="w-full bg-gradient-to-r from-amber-950/50 via-amber-900/40 to-amber-950/50 border border-amber-500/60 rounded-2xl p-4 text-center space-y-2 mt-2 shadow-2xl">
                              <div className="w-9 h-9 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-400 mx-auto border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                                <Trophy className="w-5 h-5 animate-pulse" />
                              </div>
                              <div>
                                <div className="text-[10px] font-black uppercase text-amber-400 tracking-widest font-mono">
                                  ★ 大會總冠軍 ★
                                </div>
                                <div className="text-base font-black text-white mt-0.5">
                                  {tournament.rankings.champion.name}
                                </div>
                                <div className="text-xs text-amber-300 font-mono">
                                  {tournament.rankings.champion.beybladeName}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Connector line to next column on right */}
                        {!isFinalRound && (
                          <div className="hidden lg:block absolute -right-12 top-1/2 w-12 h-[2px] bg-gradient-to-r from-[#00f2ff]/40 to-[#00f2ff]/10 pointer-events-none" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
