import React, { useState, useRef } from 'react';
import { 
  Trophy, Swords, ZoomIn, ZoomOut, RotateCcw, Award, Layers, 
  Maximize2, Filter, ChevronLeft, ChevronRight, Sparkles, CheckCircle2,
  Radio, Share2, ExternalLink
} from 'lucide-react';
import { Match, Player, Tournament } from '../types';
import { MatchCard } from './MatchCard';
import { BroadcastBracketModal } from './BroadcastBracketModal';
import { isViewOnlyMode } from '../utils/sessionHelper';

interface DualWingBracketProps {
  tournament: Tournament;
  onSelectMatch: (match: Match) => void;
  onOpenCreateModal: () => void;
}

export const DualWingBracket: React.FC<DualWingBracketProps> = ({
  tournament,
  onSelectMatch,
  onOpenCreateModal
}) => {
  const [zoom, setZoom] = useState(1);
  const [viewMode, setViewMode] = useState<'bracket' | 'rounds' | 'list'>('bracket');
  const [selectedRoundFilter, setSelectedRoundFilter] = useState<number | 'all'>('all');
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState<boolean>(false);
  const bracketContainerRef = useRef<HTMLDivElement>(null);
  const readOnly = isViewOnlyMode();

  const playerMap = new Map<string, Player>();
  tournament.players.forEach((p) => playerMap.set(p.id, p));

  const matches = tournament.matches;
  const leftMatches = matches.filter((m) => m.bracketWing === 'left');
  const rightMatches = matches.filter((m) => m.bracketWing === 'right');
  const grandFinalMatch = matches.find((m) => m.bracketWing === 'final');
  const thirdPlaceMatch = matches.find((m) => m.bracketWing === 'third_place');

  // Calculate maximum wing rounds
  const maxRound = Math.max(...matches.map((m) => m.round), 1);
  const wingRoundsCount = maxRound - 1; // last round is Center Finals

  // Group left and right matches by round
  const leftMatchesByRound: Match[][] = [];
  const rightMatchesByRound: Match[][] = [];

  for (let r = 1; r <= wingRoundsCount; r++) {
    leftMatchesByRound.push(leftMatches.filter((m) => m.round === r));
    rightMatchesByRound.push(rightMatches.filter((m) => m.round === r));
  }

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.15, 1.6));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.15, 0.45));
  const handleZoomReset = () => setZoom(1);

  const getRoundHeading = (r: number, totalRounds: number) => {
    const diff = totalRounds - r;
    if (diff === 1) return '準決賽 (Semi-Finals)';
    if (diff === 2) return '8強賽 (Quarter-Finals)';
    if (diff === 3) return '16強賽';
    if (diff === 4) return '32強賽';
    if (diff === 5) return '64強賽';
    if (diff === 6) return '128強預賽';
    return `第 ${r} 輪`;
  };

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Bracket Controls Bar */}
      <div className="max-w-7xl mx-auto w-full px-4 flex flex-wrap items-center justify-between gap-3 bg-[#0a0c12]/90 border border-[#ffffff10] p-3 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.4)] backdrop-blur-md">
        {/* Left: View Mode Switches */}
        <div className="flex items-center gap-1.5 bg-[#05070a] p-1 rounded-lg border border-[#ffffff10]">
          <button
            id="view-mode-dual-wing"
            onClick={() => setViewMode('bracket')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 uppercase tracking-wider ${
              viewMode === 'bracket'
                ? 'bg-[#00f2ff] text-black shadow-[0_0_15px_rgba(0,242,255,0.3)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            雙翼樹狀圖
          </button>
          <button
            id="view-mode-rounds"
            onClick={() => setViewMode('rounds')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 uppercase tracking-wider ${
              viewMode === 'rounds'
                ? 'bg-[#00f2ff] text-black shadow-[0_0_15px_rgba(0,242,255,0.3)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            分輪分組檢視
          </button>
          <button
            id="view-mode-list"
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 uppercase tracking-wider ${
              viewMode === 'list'
                ? 'bg-[#00f2ff] text-black shadow-[0_0_15px_rgba(0,242,255,0.3)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            對戰列表清單
          </button>
        </div>

        {/* Center: Tournament Scale Badge */}
        <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-gray-300">
          <span className="w-2 h-2 rounded-full bg-[#00f2ff] animate-ping" />
          <span className="font-mono text-gray-300">{tournament.targetSize} 人雙翼淘汰賽（左翼 {tournament.targetSize / 2} 人 ⚔️ 右翼 {tournament.targetSize / 2} 人）</span>
        </div>

        {/* Right: Zoom, Share & Quick Tools */}
        <div className="flex items-center gap-2">
          {!readOnly && (
            <button
              onClick={() => setIsBroadcastModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#06C755]/20 to-[#00f2ff]/20 hover:from-[#06C755]/30 hover:to-[#00f2ff]/30 border border-[#06C755]/40 text-[#06C755] text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(6,199,85,0.15)]"
              title="將賽程圖與唯讀網址發布至 LINE 群組"
            >
              <Radio className="w-3.5 h-3.5 text-[#06C755] animate-pulse" />
              <span>發布賽程至 LINE 群</span>
            </button>
          )}

          {viewMode === 'bracket' && (
            <div className="flex items-center gap-1 bg-[#05070a] px-2 py-1 rounded-lg border border-[#ffffff10] text-gray-300 text-xs">
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
          )}
        </div>
      </div>

      {/* VIEW 1: Dual-Wing Canvas (左翼 + 中央決賽 + 右翼) */}
      {viewMode === 'bracket' && (
        <div id="dual-wing-bracket-board" className="w-full bg-[#07090f]/90 border border-[#ffffff10] rounded-2xl overflow-x-auto overflow-y-auto p-6 min-h-[700px] shadow-[0_0_50px_rgba(0,0,0,0.8)] relative cyber-grid-bg">
          <div
            ref={bracketContainerRef}
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out'
            }}
            className="flex items-center justify-center gap-8 min-w-max mx-auto py-8 dual-wing-tree-container"
          >
            {/* ====== LEFT WING (Left-to-Right Progression) ====== */}
            <div className="flex items-center gap-8">
              {leftMatchesByRound.map((roundMatches, roundIdx) => {
                const roundNumber = roundIdx + 1;
                const heading = getRoundHeading(roundNumber, maxRound);
                return (
                  <div key={`left-round-${roundNumber}`} className="flex flex-col space-y-4">
                    <div className="text-center py-1.5 px-3 bg-[#00f2ff]/10 border border-[#00f2ff]/30 rounded-lg text-[11px] font-black text-[#00f2ff] uppercase tracking-wider shadow-[0_0_10px_rgba(0,242,255,0.15)] font-mono">
                      左翼 {heading}
                    </div>

                    <div className="flex flex-col justify-around flex-1 space-y-8">
                      {roundMatches.map((match) => (
                        <div key={match.id} className="relative flex items-center">
                          <MatchCard
                            match={match}
                            playerMap={playerMap}
                            onSelectMatch={onSelectMatch}
                          />
                          {/* Connecting circuit line to right */}
                          <div className="w-8 h-[2px] bg-gradient-to-r from-[#00f2ff]/40 to-[#00f2ff]/10 pointer-events-none" />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ====== CENTER STAGE (Grand Final & 3rd Place Match & Trophy) ====== */}
            <div className="flex flex-col items-center justify-center space-y-8 px-6 py-7 bg-gradient-to-b from-[#11141d] to-[#0a0c12] border-2 border-[#00f2ff]/40 rounded-3xl shadow-[0_0_50px_rgba(0,242,255,0.15)] min-w-[340px] relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#00f2ff] to-transparent opacity-80" />
              
              {/* Grand Final Center Heading */}
              <div className="text-center space-y-1">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 border border-amber-500/50 text-amber-300 text-xs font-black shadow-[0_0_15px_rgba(245,158,11,0.2)] font-mono">
                  <Trophy className="w-4 h-4 text-amber-400 animate-bounce" />
                  中央擂台 • 雙翼總決賽之巔
                </div>
                <h3 className="text-xs font-mono font-bold text-gray-400 tracking-wider">
                  左翼冠軍 VS 右翼冠軍
                </h3>
              </div>

              {/* Grand Final Match Card */}
              {grandFinalMatch && (
                <div className="transform hover:scale-105 transition-transform duration-200">
                  <MatchCard
                    match={grandFinalMatch}
                    playerMap={playerMap}
                    onSelectMatch={onSelectMatch}
                    isCenter={true}
                  />
                </div>
              )}

              {/* Winner Announcement if complete */}
              {tournament.rankings?.champion && (
                <div className="w-full bg-gradient-to-r from-amber-950/40 via-amber-900/30 to-amber-950/40 border border-amber-500/50 rounded-2xl p-4 text-center space-y-2 animate-fade-in shadow-xl">
                  <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-400 mx-auto border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                    <Trophy className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-[11px] font-black uppercase text-amber-400 tracking-widest font-mono">
                      ★ 榮耀冠軍誕生 ★
                    </div>
                    <div className="text-lg font-black text-white mt-0.5">
                      {tournament.rankings.champion.name}
                    </div>
                    <div className="text-xs text-amber-300/80 font-mono">
                      {tournament.rankings.champion.beybladeName}
                    </div>
                  </div>
                </div>
              )}

              {/* 3rd Place Match Card */}
              {thirdPlaceMatch && (
                <div className="pt-4 border-t border-[#ffffff10] w-full space-y-2">
                  <div className="text-center text-xs font-bold text-gray-400 flex items-center justify-center gap-1.5 font-mono">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    季殿軍排名戰 (3rd Place Match)
                  </div>
                  <div className="flex justify-center">
                    <MatchCard
                      match={thirdPlaceMatch}
                      playerMap={playerMap}
                      onSelectMatch={onSelectMatch}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ====== RIGHT WING (Right-to-Left Progression) ====== */}
            <div className="flex items-center gap-8">
              {rightMatchesByRound
                .slice()
                .reverse()
                .map((roundMatches, reverseIdx) => {
                  const roundNumber = wingRoundsCount - reverseIdx;
                  const heading = getRoundHeading(roundNumber, maxRound);
                  return (
                    <div key={`right-round-${roundNumber}`} className="flex flex-col space-y-4">
                      <div className="text-center py-1.5 px-3 bg-[#7000ff]/10 border border-[#7000ff]/30 rounded-lg text-[11px] font-black text-purple-300 uppercase tracking-wider shadow-[0_0_10px_rgba(112,0,255,0.15)] font-mono">
                        右翼 {heading}
                      </div>

                      <div className="flex flex-col justify-around flex-1 space-y-8">
                        {roundMatches.map((match) => (
                          <div key={match.id} className="relative flex items-center">
                            {/* Connecting circuit line to left */}
                            <div className="w-8 h-[2px] bg-gradient-to-l from-[#7000ff]/40 to-[#7000ff]/10 pointer-events-none" />
                            <MatchCard
                              match={match}
                              playerMap={playerMap}
                              onSelectMatch={onSelectMatch}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Rounds & Stages View */}
      {viewMode === 'rounds' && (
        <div className="max-w-7xl mx-auto w-full px-4 space-y-6">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
            <button
              onClick={() => setSelectedRoundFilter('all')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider font-mono ${
                selectedRoundFilter === 'all'
                  ? 'bg-[#00f2ff] text-black shadow-[0_0_15px_rgba(0,242,255,0.3)]'
                  : 'bg-[#0a0c12] text-gray-400 hover:text-white border border-[#ffffff10]'
              }`}
            >
              全部輪次
            </button>
            {Array.from({ length: maxRound }, (_, i) => i + 1).map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRoundFilter(r)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap uppercase tracking-wider font-mono ${
                  selectedRoundFilter === r
                    ? 'bg-[#00f2ff] text-black shadow-[0_0_15px_rgba(0,242,255,0.3)]'
                    : 'bg-[#0a0c12] text-gray-400 hover:text-white border border-[#ffffff10]'
                }`}
              >
                {r === maxRound ? '🏆 總決賽 & 季軍戰' : `第 ${r} 輪 (${getRoundHeading(r, maxRound)})`}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matches
              .filter((m) => selectedRoundFilter === 'all' || m.round === selectedRoundFilter)
              .map((match) => (
                <div key={match.id} className="flex justify-center">
                  <MatchCard
                    match={match}
                    playerMap={playerMap}
                    onSelectMatch={onSelectMatch}
                    isCenter={match.bracketWing === 'final'}
                  />
                </div>
              ))}
          </div>
        </div>
      )}

      {/* VIEW 3: List View */}
      {viewMode === 'list' && (
        <div className="max-w-5xl mx-auto w-full px-4 space-y-3">
          <div className="bg-[#0a0c12] border border-[#ffffff10] rounded-xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-[#ffffff10] flex items-center justify-between">
              <h3 className="font-bold text-white text-sm uppercase tracking-wide">全賽程對抗清單 (按場次序)</h3>
              <span className="text-xs text-gray-400 font-mono">共 {matches.length} 場對決</span>
            </div>
            <div className="divide-y divide-[#ffffff08]">
              {matches.map((m) => {
                const p1 = m.player1Id ? playerMap.get(m.player1Id) : null;
                const p2 = m.player2Id ? playerMap.get(m.player2Id) : null;
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      if (p1 || p2) onSelectMatch(m);
                    }}
                    className="p-3.5 hover:bg-[#ffffff05] transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-[#11141d] text-gray-300 border border-[#ffffff10] flex items-center justify-center text-xs font-mono font-bold">
                        #{m.matchNumber}
                      </span>
                      <div>
                        <div className="text-xs font-semibold text-[#00f2ff] font-mono">{m.label}</div>
                        <div className="flex items-center gap-2 text-sm font-bold text-white mt-0.5">
                          <span className={m.winnerId === p1?.id ? 'text-[#00f2ff]' : ''}>
                            {p1 ? p1.name : '待定'}
                          </span>
                          <span className="text-gray-600 font-normal">vs</span>
                          <span className={m.winnerId === p2?.id ? 'text-[#00f2ff]' : ''}>
                            {p2 ? p2.name : m.status === 'bye' ? '輪空' : '待定'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="text-sm font-black font-mono px-3 py-1 bg-[#05070a] rounded-lg border border-[#ffffff15] text-white">
                        {p1 ? m.player1Score : '-'} : {p2 ? m.player2Score : '-'}
                      </div>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-lg font-mono font-bold ${
                          m.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : m.status === 'bye'
                            ? 'bg-[#11141d] text-gray-500 border border-[#ffffff10]'
                            : 'bg-[#00f2ff]/15 text-[#00f2ff] border border-[#00f2ff]/30'
                        }`}
                      >
                        {m.status === 'completed' ? '已完賽' : m.status === 'bye' ? '輪空' : '進行中'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Bracket Modal (Requirement 5) */}
      <BroadcastBracketModal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        tournament={tournament}
        bracketContainerRef={bracketContainerRef}
      />
    </div>
  );
};
