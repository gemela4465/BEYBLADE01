import React, { useState, useRef } from 'react';
import { 
  Trophy, Swords, ZoomIn, ZoomOut, RotateCcw, Award, Layers, 
  Maximize2, Filter, ChevronLeft, ChevronRight, Sparkles, CheckCircle2,
  Radio, Share2, ExternalLink, Play, CheckCheck, RefreshCw, GitBranch, AlertCircle, ShieldCheck,
  ArrowRight, ArrowLeft
} from 'lucide-react';
import { Match, Player, Tournament } from '../types';
import { MatchCard } from './MatchCard';
import { BroadcastBracketModal } from './BroadcastBracketModal';
import { SingleWingBracket } from './SingleWingBracket';
import { isViewOnlyMode } from '../utils/sessionHelper';

interface DualWingBracketProps {
  tournament: Tournament;
  onSelectMatch: (match: Match) => void;
  onOpenCreateModal?: () => void;
  onStartTournament?: () => void;
  onFinishTournament?: () => void;
  onRegenerateBracket?: () => void;
  isReadOnly?: boolean;
  highlightedPlayerName?: string;
}

export const DualWingBracket: React.FC<DualWingBracketProps> = ({
  tournament,
  onSelectMatch,
  onOpenCreateModal,
  onStartTournament,
  onFinishTournament,
  onRegenerateBracket,
  isReadOnly = false,
  highlightedPlayerName
}) => {
  const [zoom, setZoom] = useState(1);
  const [viewMode, setViewMode] = useState<'bracket' | 'single-wing' | 'rounds' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const v = urlParams.get('view');
      if (v === 'single' || v === 'single-wing') return 'single-wing';
      if (v === 'rounds') return 'rounds';
      if (v === 'list') return 'list';
    }
    return 'bracket';
  });
  const [selectedRoundFilter, setSelectedRoundFilter] = useState<number | 'all'>('all');
  const [trackedPlayerId, setTrackedPlayerId] = useState<string | null>(null);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState<boolean>(false);
  const [showStartConfirm, setShowStartConfirm] = useState<boolean>(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState<boolean>(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState<boolean>(false);
  const bracketContainerRef = useRef<HTMLDivElement>(null);
  const effectiveReadOnly = isViewOnlyMode() || isReadOnly;

  const playerMap = new Map<string, Player>();
  tournament.players.forEach((p) => playerMap.set(p.id, p));

  const matches = tournament.matches;
  const leftMatches = matches.filter((m) => m.bracketWing === 'left');
  const rightMatches = matches.filter((m) => m.bracketWing === 'right');
  const grandFinalMatch = matches.find((m) => m.bracketWing === 'final');
  const thirdPlaceMatch = matches.find((m) => m.bracketWing === 'third_place');

  const completedMatchesCount = matches.filter((m) => m.status === 'completed' || m.status === 'bye').length;
  const isStarted = tournament.status === 'in_progress';
  const isCompleted = tournament.status === 'completed';
  const isPreStart = !isStarted && !isCompleted;

  // Calculate maximum wing rounds
  const maxRound = Math.max(...matches.map((m) => m.round), 1);
  const wingRoundsCount = maxRound - 1; // last round is Center Finals

  // Group left and right matches by round
  const leftMatchesByRound: Match[][] = [];
  const rightMatchesByRound: Match[][] = [];

  for (let r = 1; r <= wingRoundsCount; r++) {
    leftMatchesByRound.push(leftMatches.filter((m) => m.round === r).sort((a, b) => a.matchIndex - b.matchIndex));
    rightMatchesByRound.push(rightMatches.filter((m) => m.round === r).sort((a, b) => a.matchIndex - b.matchIndex));
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

  const championId = tournament.rankings?.champion?.id || grandFinalMatch?.winnerId;

  // Helper to check winner
  const hasWinner = (m?: Match) => !!m?.winnerId && (m.status === 'completed' || m.status === 'bye');

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Tournament Status Lifecycle Banner (Requirements 1, 2, 4) */}
      <div className="max-w-7xl mx-auto w-full px-4">
        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl ${
          isStarted
            ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-emerald-950/40 border-emerald-500/40'
            : isCompleted
            ? 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/40 border-amber-500/40'
            : 'bg-gradient-to-r from-cyan-950/40 via-slate-900 to-purple-950/40 border-cyan-500/40'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border font-mono font-bold shrink-0 ${
              isStarted
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse'
                : isCompleted
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
            }`}>
              {isStarted ? <Play className="w-5 h-5 fill-emerald-400" /> : isCompleted ? <Trophy className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black font-mono border ${
                  isStarted
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                    : isCompleted
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                }`}>
                  {isStarted ? '🔥 賽事進行中 (已開賽)' : isCompleted ? '🏁 賽事已完賽存檔' : '⏳ 賽程已產生 (未開賽)'}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {isStarted 
                    ? '籤位已全面鎖定 • 進行各輪對抗中' 
                    : isCompleted 
                    ? '戰績與名次已永久鎖定備查' 
                    : '已排定對陣籤位 • 未開賽前可重新產生或調整'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                {isStarted
                  ? '規則限制：開賽後不允許刪除已參賽選手（仍可隨時新增選手作為敗部復活或候補）'
                  : isCompleted
                  ? '比分已無法修改，賽事紀錄已自動存檔備查'
                  : '未開賽狀態下，若刪除選手將自動遞補為預備選手，亦可隨時重新產生賽程'}
              </p>
            </div>
          </div>

          {/* Action Buttons: Start Tournament & Finish Tournament & Regenerate */}
          {!effectiveReadOnly && (
            <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0 flex-wrap">
              {/* Regenerate Bracket button (Requirement 4: 未開賽前賽程可以重新產生) */}
              {isPreStart && onRegenerateBracket && (
                <button
                  id="btn-regenerate-bracket"
                  onClick={() => setShowRegenConfirm(true)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 font-mono"
                  title="依目前選手清單與種子設定重新洗牌產生對陣表"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                  重新產生賽程
                </button>
              )}

              {/* Start Tournament button (Requirement 1: 賽程表增加開賽按鈕) */}
              {isPreStart && onStartTournament && (
                <button
                  id="btn-start-tournament-action"
                  onClick={() => setShowStartConfirm(true)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition-all active:scale-95 uppercase tracking-wider font-mono animate-pulse"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  正式開賽 (Start)
                </button>
              )}

              {/* Finish Tournament button (比賽結束 按鈕) */}
              {(isStarted || completedMatchesCount === matches.length) && !isCompleted && onFinishTournament && (
                <button
                  id="btn-finish-tournament-action"
                  onClick={() => setShowFinishConfirm(true)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 flex items-center gap-2 transition-all active:scale-95 uppercase tracking-wider font-mono"
                  title="比賽結束：點擊後自動存檔備查，並發布 LINE 冠亞季殿軍選手訊息與完賽通知"
                >
                  <CheckCheck className="w-4 h-4" />
                  🏁 比賽結束
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bracket Controls Bar */}
      <div className="max-w-7xl mx-auto w-full px-4 flex flex-wrap items-center justify-between gap-3 bg-[#0a0c12]/90 border border-[#ffffff10] p-3 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.4)] backdrop-blur-md">
        {/* Left: View Mode Switches */}
        <div className="flex items-center gap-1.5 bg-[#05070a] p-1 rounded-lg border border-[#ffffff10] flex-wrap">
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
            雙翼對稱樹狀圖
          </button>

          <button
            id="view-mode-single-wing"
            onClick={() => setViewMode('single-wing')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 uppercase tracking-wider ${
              viewMode === 'single-wing'
                ? 'bg-[#00f2ff] text-black shadow-[0_0_15px_rgba(0,242,255,0.3)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
            單側樹狀圖 (由左至右)
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
          <span className="font-mono text-gray-300">{tournament.targetSize} 人淘汰賽（左翼 {tournament.targetSize / 2} 人 ⚔️ 右翼 {tournament.targetSize / 2} 人）</span>
        </div>

        {/* Right: Zoom, Share & Quick Tools */}
        <div className="flex items-center gap-2">
          {!effectiveReadOnly && (
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
          {/* Shared SVG Markers for Directional Advancement Arrows */}
          <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
            <defs>
              {/* Right-pointing arrows (Left Wing -> Center) */}
              <marker id="dual-arrow-emerald-right" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#10b981" />
              </marker>
              <marker id="dual-arrow-cyan-right" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#00f2ff" />
              </marker>
              <marker id="dual-arrow-gold-right" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#fbbf24" />
              </marker>
              <marker id="dual-arrow-neutral-right" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#475569" />
              </marker>

              {/* Left-pointing arrows (Right Wing -> Center) */}
              <marker id="dual-arrow-purple-left" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 10 1.5 L 1 5 L 10 8.5 z" fill="#c084fc" />
              </marker>
              <marker id="dual-arrow-cyan-left" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 10 1.5 L 1 5 L 10 8.5 z" fill="#00f2ff" />
              </marker>
              <marker id="dual-arrow-gold-left" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 10 1.5 L 1 5 L 10 8.5 z" fill="#fbbf24" />
              </marker>
              <marker id="dual-arrow-neutral-left" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                <path d="M 10 1.5 L 1 5 L 10 8.5 z" fill="#475569" />
              </marker>
            </defs>
          </svg>

          {/* Advancement Connection Banner Indicator */}
          <div className="flex items-center justify-between px-3 py-1.5 mb-4 bg-[#0a0c12]/80 border border-[#ffffff0a] rounded-lg text-xs text-gray-400 font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-gray-300 font-bold">雙翼晉級連線指示：</span>
              <span className="text-emerald-400 font-semibold">各場次完賽後，獲勝選手透過亮色光芒實線與箭頭指示晉級至下一輪</span>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-[10px]">
              <span className="flex items-center gap-1.5 text-[#00f2ff]">
                <span className="w-3 h-0.5 bg-[#00f2ff] inline-block" /> 左翼晉級動線
              </span>
              <span className="flex items-center gap-1.5 text-purple-300">
                <span className="w-3 h-0.5 bg-purple-400 inline-block" /> 右翼晉級動線
              </span>
              <span className="flex items-center gap-1.5 text-amber-300">
                <span className="w-3 h-0.5 bg-amber-400 inline-block" /> 冠軍軌跡
              </span>
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-3 h-0.5 bg-slate-600 inline-block border-t border-dashed" /> 待定路徑
              </span>
            </div>
          </div>

          <div
            ref={bracketContainerRef}
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out'
            }}
            className="flex items-center justify-center gap-4 min-w-max mx-auto py-8 dual-wing-tree-container"
          >
            {/* ====== LEFT WING (Left-to-Right Progression) ====== */}
            <div className="flex items-center gap-2">
              {leftMatchesByRound.map((roundMatches, roundIdx) => {
                const roundNumber = roundIdx + 1;
                const heading = getRoundHeading(roundNumber, maxRound);
                const nextRoundMatches = roundIdx < wingRoundsCount - 1 ? leftMatchesByRound[roundIdx + 1] : null;

                return (
                  <React.Fragment key={`left-round-col-${roundNumber}`}>
                    <div className="flex flex-col space-y-3 min-w-[154px] max-w-[160px]">
                      <div className="text-center py-1.5 px-2 bg-[#00f2ff]/10 border border-[#00f2ff]/30 rounded-lg text-[11px] font-black text-[#00f2ff] uppercase tracking-wider shadow-[0_0_10px_rgba(0,242,255,0.15)] font-mono">
                        左翼 {heading}
                      </div>

                      <div className="flex flex-col justify-around flex-1 space-y-6">
                        {roundMatches.map((match) => {
                          return (
                            <div key={match.id} className="relative flex items-center justify-center">
                              <MatchCard
                                match={match}
                                playerMap={playerMap}
                                onSelectMatch={(m) => {
                                  if (m.winnerId) setTrackedPlayerId(m.winnerId);
                                  onSelectMatch(m);
                                }}
                                isReadOnly={effectiveReadOnly}
                                highlightedPlayerName={highlightedPlayerName || (trackedPlayerId ? playerMap.get(trackedPlayerId)?.name : undefined)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* SVG Tree Bracket Connector (Left-to-Right) */}
                    {nextRoundMatches && (
                      <div className="flex flex-col justify-around min-w-[48px] max-w-[54px] pointer-events-none py-6">
                        {Array.from({ length: Math.ceil(roundMatches.length / 2) }).map((_, pairIdx) => {
                          const upperMatch = roundMatches[pairIdx * 2];
                          const lowerMatch = roundMatches[pairIdx * 2 + 1];
                          const nextMatch = nextRoundMatches[pairIdx];

                          const upperWinnerId = upperMatch?.winnerId;
                          const lowerWinnerId = lowerMatch?.winnerId;

                          const isUpperWinner = hasWinner(upperMatch);
                          const isLowerWinner = hasWinner(lowerMatch);

                          const isUpperAdvancing = isUpperWinner;
                          const isLowerAdvancing = isLowerWinner;
                          const isAnyAdvancing = isUpperAdvancing || isLowerAdvancing;

                          const isChampionUpper = championId && upperWinnerId === championId;
                          const isChampionLower = championId && lowerWinnerId === championId;

                          const isTrackedUpper = trackedPlayerId && (upperWinnerId === trackedPlayerId || upperMatch?.player1Id === trackedPlayerId || upperMatch?.player2Id === trackedPlayerId);
                          const isTrackedLower = trackedPlayerId && (lowerWinnerId === trackedPlayerId || lowerMatch?.player1Id === trackedPlayerId || lowerMatch?.player2Id === trackedPlayerId);

                          return (
                            <div key={`left-tree-${roundNumber}-${pairIdx}`} className="flex flex-col justify-center items-stretch flex-1 relative my-1 min-h-[90px]">
                              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
                                {/* Upper Branch: from top left match (0, 25%) to fork junction (50%, 50%) */}
                                <path
                                  d="M 0,25% L 50%,25% L 50%,50%"
                                  fill="none"
                                  stroke={
                                    isChampionUpper
                                      ? '#fbbf24'
                                      : isTrackedUpper
                                      ? '#00f2ff'
                                      : isUpperAdvancing
                                      ? '#10b981'
                                      : '#334155'
                                  }
                                  strokeWidth={isChampionUpper ? 3.5 : isTrackedUpper || isUpperAdvancing ? 2.6 : 1.6}
                                  strokeDasharray={isUpperAdvancing ? 'none' : '3,3'}
                                  className={
                                    isChampionUpper
                                      ? 'drop-shadow-[0_0_8px_rgba(245,158,11,0.9)]'
                                      : isTrackedUpper || isUpperAdvancing
                                      ? 'drop-shadow-[0_0_6px_rgba(16,185,129,0.85)]'
                                      : ''
                                  }
                                />

                                {/* Lower Branch: from bottom left match (0, 75%) to fork junction (50%, 50%) */}
                                <path
                                  d="M 0,75% L 50%,75% L 50%,50%"
                                  fill="none"
                                  stroke={
                                    isChampionLower
                                      ? '#fbbf24'
                                      : isTrackedLower
                                      ? '#00f2ff'
                                      : isLowerAdvancing
                                      ? '#10b981'
                                      : '#334155'
                                  }
                                  strokeWidth={isChampionLower ? 3.5 : isTrackedLower || isLowerAdvancing ? 2.6 : 1.6}
                                  strokeDasharray={isLowerAdvancing ? 'none' : '3,3'}
                                  className={
                                    isChampionLower
                                      ? 'drop-shadow-[0_0_8px_rgba(245,158,11,0.9)]'
                                      : isTrackedLower || isLowerAdvancing
                                      ? 'drop-shadow-[0_0_6px_rgba(16,185,129,0.85)]'
                                      : ''
                                  }
                                />

                                {/* Pivot Junction Node at (50%, 50%) */}
                                <circle
                                  cx="50%"
                                  cy="50%"
                                  r={isChampionUpper || isChampionLower ? 4.5 : isAnyAdvancing ? 3.5 : 2}
                                  fill={
                                    isChampionUpper || isChampionLower
                                      ? '#fbbf24'
                                      : isTrackedUpper || isTrackedLower
                                      ? '#00f2ff'
                                      : isAnyAdvancing
                                      ? '#10b981'
                                      : '#475569'
                                  }
                                />

                                {/* Stem Line into next round match on the right */}
                                <path
                                  d="M 50%,50% L 100%,50%"
                                  fill="none"
                                  stroke={
                                    isChampionUpper || isChampionLower
                                      ? '#fbbf24'
                                      : isTrackedUpper || isTrackedLower
                                      ? '#00f2ff'
                                      : isAnyAdvancing
                                      ? '#10b981'
                                      : '#334155'
                                  }
                                  strokeWidth={isChampionUpper || isChampionLower ? 3.5 : isAnyAdvancing ? 2.6 : 1.6}
                                  strokeDasharray={isAnyAdvancing ? 'none' : '3,3'}
                                  className={
                                    isChampionUpper || isChampionLower
                                      ? 'drop-shadow-[0_0_8px_rgba(245,158,11,0.9)]'
                                      : isAnyAdvancing
                                      ? 'drop-shadow-[0_0_6px_rgba(16,185,129,0.85)]'
                                      : ''
                                  }
                                  markerEnd={
                                    isChampionUpper || isChampionLower
                                      ? 'url(#dual-arrow-gold-right)'
                                      : isTrackedUpper || isTrackedLower
                                      ? 'url(#dual-arrow-cyan-right)'
                                      : isAnyAdvancing
                                      ? 'url(#dual-arrow-emerald-right)'
                                      : 'url(#dual-arrow-neutral-right)'
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

            {/* Left Semi-Final -> Center Grand Final Bridge Connector */}
            {(() => {
              const leftSemiMatch = leftMatchesByRound[wingRoundsCount - 1]?.[0];
              const isLeftSemiWinner = hasWinner(leftSemiMatch);
              const leftSemiWinnerPlayer = leftSemiMatch?.winnerId ? playerMap.get(leftSemiMatch.winnerId) : null;
              const isChampionLeftSemi = championId && leftSemiMatch?.winnerId === championId;

              return (
                <div className="flex flex-col items-center justify-center min-w-[52px] max-w-[64px] pointer-events-none relative self-center">
                  <svg className="w-full h-12 overflow-visible" preserveAspectRatio="none">
                    <path
                      d="M 0,50% L 100%,50%"
                      fill="none"
                      stroke={
                        isChampionLeftSemi
                          ? '#fbbf24'
                          : isLeftSemiWinner
                          ? '#00f2ff'
                          : '#334155'
                      }
                      strokeWidth={isChampionLeftSemi ? 3.5 : isLeftSemiWinner ? 2.8 : 1.6}
                      strokeDasharray={isLeftSemiWinner ? 'none' : '3,3'}
                      className={
                        isChampionLeftSemi
                          ? 'drop-shadow-[0_0_10px_rgba(245,158,11,0.9)]'
                          : isLeftSemiWinner
                          ? 'drop-shadow-[0_0_8px_rgba(0,242,255,0.85)]'
                          : ''
                      }
                      markerEnd={
                        isChampionLeftSemi
                          ? 'url(#dual-arrow-gold-right)'
                          : isLeftSemiWinner
                          ? 'url(#dual-arrow-cyan-right)'
                          : 'url(#dual-arrow-neutral-right)'
                      }
                    />
                    <circle
                      cx="50%"
                      cy="50%"
                      r={isLeftSemiWinner ? 4 : 2}
                      fill={isChampionLeftSemi ? '#fbbf24' : isLeftSemiWinner ? '#00f2ff' : '#475569'}
                    />
                  </svg>
                  {isLeftSemiWinner && leftSemiWinnerPlayer && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-[#00f2ff]/20 border border-[#00f2ff]/50 text-[#00f2ff] text-[9px] font-mono font-bold whitespace-nowrap shadow-[0_0_10px_rgba(0,242,255,0.3)] animate-pulse">
                      左翼晉級
                    </div>
                  )}
                </div>
              );
            })()}

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
                    onSelectMatch={(m) => {
                      if (m.winnerId) setTrackedPlayerId(m.winnerId);
                      onSelectMatch(m);
                    }}
                    isCenter={true}
                    isReadOnly={effectiveReadOnly}
                    highlightedPlayerName={highlightedPlayerName || (trackedPlayerId ? playerMap.get(trackedPlayerId)?.name : undefined)}
                  />
                </div>
              )}

              {/* Victory Connection Line down to Champion Podium */}
              {tournament.rankings?.champion && (
                <div className="flex flex-col items-center -my-3 pointer-events-none">
                  <div className="w-0.5 h-6 bg-gradient-to-b from-amber-400 to-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)] animate-pulse" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.9)] animate-bounce" />
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
                      onSelectMatch={(m) => {
                        if (m.winnerId) setTrackedPlayerId(m.winnerId);
                        onSelectMatch(m);
                      }}
                      isReadOnly={effectiveReadOnly}
                      highlightedPlayerName={highlightedPlayerName || (trackedPlayerId ? playerMap.get(trackedPlayerId)?.name : undefined)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Right Semi-Final -> Center Grand Final Bridge Connector */}
            {(() => {
              const rightSemiMatch = rightMatchesByRound[wingRoundsCount - 1]?.[0];
              const isRightSemiWinner = hasWinner(rightSemiMatch);
              const rightSemiWinnerPlayer = rightSemiMatch?.winnerId ? playerMap.get(rightSemiMatch.winnerId) : null;
              const isChampionRightSemi = championId && rightSemiMatch?.winnerId === championId;

              return (
                <div className="flex flex-col items-center justify-center min-w-[52px] max-w-[64px] pointer-events-none relative self-center">
                  <svg className="w-full h-12 overflow-visible" preserveAspectRatio="none">
                    <path
                      d="M 100%,50% L 0%,50%"
                      fill="none"
                      stroke={
                        isChampionRightSemi
                          ? '#fbbf24'
                          : isRightSemiWinner
                          ? '#c084fc'
                          : '#334155'
                      }
                      strokeWidth={isChampionRightSemi ? 3.5 : isRightSemiWinner ? 2.8 : 1.6}
                      strokeDasharray={isRightSemiWinner ? 'none' : '3,3'}
                      className={
                        isChampionRightSemi
                          ? 'drop-shadow-[0_0_10px_rgba(245,158,11,0.9)]'
                          : isRightSemiWinner
                          ? 'drop-shadow-[0_0_8px_rgba(192,132,252,0.85)]'
                          : ''
                      }
                      markerEnd={
                        isChampionRightSemi
                          ? 'url(#dual-arrow-gold-left)'
                          : isRightSemiWinner
                          ? 'url(#dual-arrow-purple-left)'
                          : 'url(#dual-arrow-neutral-left)'
                      }
                    />
                    <circle
                      cx="50%"
                      cy="50%"
                      r={isRightSemiWinner ? 4 : 2}
                      fill={isChampionRightSemi ? '#fbbf24' : isRightSemiWinner ? '#c084fc' : '#475569'}
                    />
                  </svg>
                  {isRightSemiWinner && rightSemiWinnerPlayer && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-500/50 text-purple-300 text-[9px] font-mono font-bold whitespace-nowrap shadow-[0_0_10px_rgba(192,132,252,0.3)] animate-pulse">
                      右翼晉級
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ====== RIGHT WING (Right-to-Left Progression towards Center) ====== */}
            <div className="flex items-center gap-2">
              {rightMatchesByRound
                .slice()
                .reverse()
                .map((roundMatches, reverseIdx) => {
                  const roundNumber = wingRoundsCount - reverseIdx;
                  const heading = getRoundHeading(roundNumber, maxRound);
                  const isInitialRightRound = reverseIdx === wingRoundsCount - 1; // Round 1 on far right
                  const prevSourceRoundMatches = !isInitialRightRound ? rightMatchesByRound[roundNumber - 2] : null;

                  return (
                    <React.Fragment key={`right-round-col-${roundNumber}`}>
                      <div className="flex flex-col space-y-3 min-w-[154px] max-w-[160px]">
                        <div className="text-center py-1.5 px-2 bg-[#7000ff]/10 border border-[#7000ff]/30 rounded-lg text-[11px] font-black text-purple-300 uppercase tracking-wider shadow-[0_0_10px_rgba(112,0,255,0.15)] font-mono">
                          右翼 {heading}
                        </div>

                        <div className="flex flex-col justify-around flex-1 space-y-6">
                          {roundMatches.map((match) => (
                            <div key={match.id} className="relative flex items-center justify-center">
                              <MatchCard
                                match={match}
                                playerMap={playerMap}
                                onSelectMatch={(m) => {
                                  if (m.winnerId) setTrackedPlayerId(m.winnerId);
                                  onSelectMatch(m);
                                }}
                                isReadOnly={effectiveReadOnly}
                                highlightedPlayerName={highlightedPlayerName || (trackedPlayerId ? playerMap.get(trackedPlayerId)?.name : undefined)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right-to-Left SVG Tree Connector (joining pairs from right round into this round on the left) */}
                      {!isInitialRightRound && prevSourceRoundMatches && (
                        <div className="flex flex-col justify-around min-w-[48px] max-w-[54px] pointer-events-none py-6">
                          {Array.from({ length: roundMatches.length }).map((_, pairIdx) => {
                            const nextMatch = roundMatches[pairIdx];
                            const upperMatch = prevSourceRoundMatches[pairIdx * 2];
                            const lowerMatch = prevSourceRoundMatches[pairIdx * 2 + 1];

                            const upperWinnerId = upperMatch?.winnerId;
                            const lowerWinnerId = lowerMatch?.winnerId;

                            const isUpperWinner = hasWinner(upperMatch);
                            const isLowerWinner = hasWinner(lowerMatch);

                            const isUpperAdvancing = isUpperWinner;
                            const isLowerAdvancing = isLowerWinner;
                            const isAnyAdvancing = isUpperAdvancing || isLowerAdvancing;

                            const isChampionUpper = championId && upperWinnerId === championId;
                            const isChampionLower = championId && lowerWinnerId === championId;

                            const isTrackedUpper = trackedPlayerId && (upperWinnerId === trackedPlayerId || upperMatch?.player1Id === trackedPlayerId || upperMatch?.player2Id === trackedPlayerId);
                            const isTrackedLower = trackedPlayerId && (lowerWinnerId === trackedPlayerId || lowerMatch?.player1Id === trackedPlayerId || lowerMatch?.player2Id === trackedPlayerId);

                            return (
                              <div key={`right-tree-${roundNumber}-${pairIdx}`} className="flex flex-col justify-center items-stretch flex-1 relative my-1 min-h-[90px]">
                                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
                                  {/* Upper Branch: from top right match (100%, 25%) to fork junction (50%, 50%) */}
                                  <path
                                    d="M 100%,25% L 50%,25% L 50%,50%"
                                    fill="none"
                                    stroke={
                                      isChampionUpper
                                        ? '#fbbf24'
                                        : isTrackedUpper
                                        ? '#00f2ff'
                                        : isUpperAdvancing
                                        ? '#c084fc'
                                        : '#334155'
                                    }
                                    strokeWidth={isChampionUpper ? 3.5 : isTrackedUpper || isUpperAdvancing ? 2.6 : 1.6}
                                    strokeDasharray={isUpperAdvancing ? 'none' : '3,3'}
                                    className={
                                      isChampionUpper
                                        ? 'drop-shadow-[0_0_8px_rgba(245,158,11,0.9)]'
                                        : isTrackedUpper || isUpperAdvancing
                                        ? 'drop-shadow-[0_0_6px_rgba(192,132,252,0.85)]'
                                        : ''
                                    }
                                  />

                                  {/* Lower Branch: from bottom right match (100%, 75%) to fork junction (50%, 50%) */}
                                  <path
                                    d="M 100%,75% L 50%,75% L 50%,50%"
                                    fill="none"
                                    stroke={
                                      isChampionLower
                                        ? '#fbbf24'
                                        : isTrackedLower
                                        ? '#00f2ff'
                                        : isLowerAdvancing
                                        ? '#c084fc'
                                        : '#334155'
                                    }
                                    strokeWidth={isChampionLower ? 3.5 : isTrackedLower || isLowerAdvancing ? 2.6 : 1.6}
                                    strokeDasharray={isLowerAdvancing ? 'none' : '3,3'}
                                    className={
                                      isChampionLower
                                        ? 'drop-shadow-[0_0_8px_rgba(245,158,11,0.9)]'
                                        : isTrackedLower || isLowerAdvancing
                                        ? 'drop-shadow-[0_0_6px_rgba(192,132,252,0.85)]'
                                        : ''
                                    }
                                  />

                                  {/* Pivot Junction Node at (50%, 50%) */}
                                  <circle
                                    cx="50%"
                                    cy="50%"
                                    r={isChampionUpper || isChampionLower ? 4.5 : isAnyAdvancing ? 3.5 : 2}
                                    fill={
                                      isChampionUpper || isChampionLower
                                        ? '#fbbf24'
                                        : isTrackedUpper || isTrackedLower
                                        ? '#00f2ff'
                                        : isAnyAdvancing
                                        ? '#c084fc'
                                        : '#475569'
                                    }
                                  />

                                  {/* Stem Line exiting to the LEFT into next round match on the left */}
                                  <path
                                    d="M 50%,50% L 0%,50%"
                                    fill="none"
                                    stroke={
                                      isChampionUpper || isChampionLower
                                        ? '#fbbf24'
                                        : isTrackedUpper || isTrackedLower
                                        ? '#00f2ff'
                                        : isAnyAdvancing
                                        ? '#c084fc'
                                        : '#334155'
                                    }
                                    strokeWidth={isChampionUpper || isChampionLower ? 3.5 : isAnyAdvancing ? 2.6 : 1.6}
                                    strokeDasharray={isAnyAdvancing ? 'none' : '3,3'}
                                    className={
                                      isChampionUpper || isChampionLower
                                        ? 'drop-shadow-[0_0_8px_rgba(245,158,11,0.9)]'
                                        : isAnyAdvancing
                                        ? 'drop-shadow-[0_0_6px_rgba(192,132,252,0.85)]'
                                        : ''
                                    }
                                    markerEnd={
                                      isChampionUpper || isChampionLower
                                        ? 'url(#dual-arrow-gold-left)'
                                        : isTrackedUpper || isTrackedLower
                                        ? 'url(#dual-arrow-cyan-left)'
                                        : isAnyAdvancing
                                        ? 'url(#dual-arrow-purple-left)'
                                        : 'url(#dual-arrow-neutral-left)'
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
      )}

      {/* VIEW 2: Single-Wing Hierarchy View (Requirement 5) */}
      {viewMode === 'single-wing' && (
        <SingleWingBracket
          tournament={tournament}
          onSelectMatch={onSelectMatch}
          isReadOnly={effectiveReadOnly}
          highlightedPlayerName={highlightedPlayerName}
        />
      )}

      {/* VIEW 3: Rounds & Stages View */}
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
                    isReadOnly={effectiveReadOnly}
                    highlightedPlayerName={highlightedPlayerName}
                  />
                </div>
              ))}
          </div>
        </div>
      )}

      {/* VIEW 4: List View */}
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

      {/* Start Tournament Confirmation Modal (Requirement 1) */}
      {showStartConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-emerald-400">
              <div className="p-3 bg-emerald-500/20 rounded-xl border border-emerald-500/40">
                <Play className="w-6 h-6 fill-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">確認正式開賽？</h3>
                <p className="text-xs text-slate-400">場次：{tournament.name}</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700 text-xs font-mono text-slate-300 space-y-2 leading-relaxed">
              <div className="text-emerald-300 font-bold">⚡ 開賽後將啟用以下賽事規則保護：</div>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                <li>已排定籤位之選手名單將全面鎖定，<span className="text-amber-300 font-bold">不允許刪除已參賽選手</span>。</li>
                <li>賽事進行中<span className="text-emerald-300 font-bold">仍可隨時新增選手</span>作為敗部復活候補。</li>
                <li>可於擂台計分板進行各輪對決與分數即時登記。</li>
              </ul>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowStartConfirm(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                取消
              </button>
              <button
                type="button"
                id="btn-confirm-start-tournament"
                onClick={() => {
                  setShowStartConfirm(false);
                  if (onStartTournament) onStartTournament();
                }}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-emerald-500/30 flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                確認正式開賽 ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finish Tournament Confirmation Modal (比賽結束 確認視窗) */}
      {showFinishConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="p-3 bg-amber-500/20 rounded-xl border border-amber-500/40">
                <CheckCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">確認比賽結束？</h3>
                <p className="text-xs text-slate-400">場次：{tournament.name}</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700 text-xs font-mono text-slate-300 space-y-2 leading-relaxed">
              <div className="text-amber-300 font-bold">🏁 比賽結束作業說明：</div>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                <li>賽事比分將<span className="text-rose-400 font-bold">全面永久鎖定</span>，不可再修改。</li>
                <li>系統將<span className="text-amber-300 font-bold">自動發布 LINE 冠、亞、季、殿軍榮譽榜選手訊息與完賽通知</span>至所有群組與好友。</li>
                <li>系統將自動將完整賽事紀錄、比分歷程與榮譽榜<span className="text-amber-300 font-bold">存檔至歷史備查庫</span>。</li>
                <li>完成後將<span className="text-cyan-300 font-bold">清空主頁</span>，等候建立下一場全新賽事。</li>
              </ul>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowFinishConfirm(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                返回賽事
              </button>
              <button
                type="button"
                id="btn-confirm-finish-tournament"
                onClick={() => {
                  setShowFinishConfirm(false);
                  if (onFinishTournament) onFinishTournament();
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:brightness-110 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/30 flex items-center gap-2"
              >
                <CheckCheck className="w-4 h-4" />
                確認比賽結束並發布 LINE ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate Bracket Confirmation Modal (Requirement 4) */}
      {showRegenConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-cyan-400">
              <div className="p-3 bg-cyan-500/20 rounded-xl border border-cyan-500/40">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">確認重新產生賽程？</h3>
                <p className="text-xs text-slate-400">未開賽狀態可重新抽籤與排定籤位</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700 text-xs font-mono text-slate-300 space-y-2 leading-relaxed">
              <p>系統將依據目前「選手審核與登記」中已通過的選手名單與種子設定，重新生成全新的雙翼籤位表。</p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRegenConfirm(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                取消
              </button>
              <button
                type="button"
                id="btn-confirm-regenerate-bracket"
                onClick={() => {
                  setShowRegenConfirm(false);
                  if (onRegenerateBracket) onRegenerateBracket();
                }}
                className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-cyan-500/30 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                確認重新產生 ➔
              </button>
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

