import React, { useState, useEffect } from 'react';
import { Swords, Trophy, Play, Pause, RotateCcw, Volume2, Flame, Shield, Award } from 'lucide-react';
import { Tournament, Match, Player } from '../types';
import { FINISH_RULES } from '../data/beybladeData';

interface ScoreboardDisplayProps {
  tournament: Tournament;
  onSelectMatch: (match: Match) => void;
  onQuickScore: (matchId: string, p1Score: number, p2Score: number) => void;
}

export const ScoreboardDisplay: React.FC<ScoreboardDisplayProps> = ({
  tournament,
  onSelectMatch,
  onQuickScore
}) => {
  const matches = tournament.matches;
  const playerMap = new Map<string, Player>();
  tournament.players.forEach((p) => playerMap.set(p.id, p));

  // Find active or first uncompleted match with players
  const activeMatches = matches.filter(
    (m) => m.player1Id && m.player2Id && m.status !== 'bye'
  );

  const [selectedMatchId, setSelectedMatchId] = useState<string>(
    activeMatches.find((m) => m.status === 'in_progress')?.id ||
    activeMatches.find((m) => m.status === 'pending')?.id ||
    matches[0]?.id || ''
  );

  const currentMatch = matches.find((m) => m.id === selectedMatchId) || matches[0];
  const p1 = currentMatch?.player1Id ? playerMap.get(currentMatch.player1Id) : null;
  const p2 = currentMatch?.player2Id ? playerMap.get(currentMatch.player2Id) : null;

  // Countdown timer state for "3, 2, 1, Go Shoot!"
  const [countdown, setCountdown] = useState<string | null>(null);
  const [isCounting, setIsCounting] = useState(false);

  const triggerGoShoot = () => {
    if (isCounting) return;
    setIsCounting(true);
    setCountdown('3');
    setTimeout(() => setCountdown('2'), 1000);
    setTimeout(() => setCountdown('1'), 2000);
    setTimeout(() => {
      setCountdown('GO SHOOT! 🔥');
      setTimeout(() => {
        setCountdown(null);
        setIsCounting(false);
      }, 1500);
    }, 3000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Match Selector Dropdown / Pills */}
      <div className="bg-[#0a0c12] border border-[#ffffff10] p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00f2ff] animate-ping" />
          <span className="text-xs font-mono font-bold text-white tracking-wider uppercase">大螢幕對戰投影台 (Live Arena Display)</span>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-mono text-gray-400">焦點對決場次：</label>
          <select
            value={selectedMatchId}
            onChange={(e) => setSelectedMatchId(e.target.value)}
            className="bg-[#05070a] border border-[#ffffff15] text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-[#00f2ff] font-mono"
          >
            {matches.map((m) => {
              const mp1 = m.player1Id ? playerMap.get(m.player1Id) : null;
              const mp2 = m.player2Id ? playerMap.get(m.player2Id) : null;
              return (
                <option key={m.id} value={m.id}>
                  #{m.matchNumber} {m.label} ({mp1 ? mp1.name : '待定'} vs {mp2 ? mp2.name : '待定'}) - {m.status === 'completed' ? '已完賽' : '進行中'}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Main Stadium Jumbotron (大螢幕看板) */}
      <div className="bg-gradient-to-b from-[#0e111a] via-[#080a10] to-[#05070a] border-2 border-[#00f2ff]/40 rounded-3xl p-6 sm:p-10 shadow-[0_0_60px_rgba(0,242,255,0.15)] relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#00f2ff] to-transparent opacity-80" />

        {/* Stage Header */}
        <div className="text-center space-y-1 mb-8">
          <div className="inline-block px-4 py-1 rounded-full bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 text-xs font-black tracking-widest uppercase font-mono shadow-[0_0_15px_rgba(0,242,255,0.2)]">
            {currentMatch?.label || '焦點決戰'}
          </div>
          <div className="text-xs font-mono text-gray-400">
            率先獲得 {currentMatch?.targetScore || 4} 分晉級 (最高 11 分)
          </div>
        </div>

        {/* Go Shoot Overlay */}
        {countdown && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in">
            <div className="text-5xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00f2ff] via-amber-300 to-red-500 animate-bounce tracking-widest text-center font-mono">
              {countdown}
            </div>
          </div>
        )}

        {/* Battle Arena Scoreboard */}
        <div className="grid grid-cols-1 md:grid-cols-11 gap-6 items-center">
          {/* Player 1 Left Stage (Blue/Cyan) */}
          <div className="md:col-span-4 bg-[#11141d]/90 border border-[#00f2ff]/40 rounded-2xl p-6 text-center space-y-4 shadow-xl">
            <span className="inline-block px-3 py-1 rounded text-xs font-black bg-[#00f2ff] text-black font-mono tracking-wider">
              1P 藍方
            </span>
            <div className="space-y-1">
              <h3 className="text-2xl sm:text-3xl font-black text-white truncate">
                {p1?.name || '待定選手'}
              </h3>
              <div className="text-sm font-bold text-[#00f2ff] font-mono">
                {p1?.beybladeName || '未指定戰鬥陀螺'}
              </div>
              <div className="text-xs text-gray-400 font-mono">
                {p1?.clubOrTeam || '自由選手'} {p1?.blade ? `(${p1.blade})` : ''}
              </div>
            </div>
            <div className="text-6xl sm:text-7xl font-black font-mono text-[#00f2ff] py-2">
              {currentMatch?.player1Score || 0}
            </div>
          </div>

          {/* Center VS & Go Shoot Controls */}
          <div className="md:col-span-3 flex flex-col items-center justify-center space-y-4 py-4">
            <div className="text-3xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-[#00f2ff] to-[#7000ff]">
              VS
            </div>

            <button
              id="btn-go-shoot-trigger"
              onClick={triggerGoShoot}
              disabled={isCounting}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#00f2ff] to-[#7000ff] hover:opacity-90 text-black font-black text-xs uppercase tracking-wider font-mono shadow-[0_0_20px_rgba(0,242,255,0.4)] transition-all flex items-center gap-2 active:scale-95 animate-pulse"
            >
              <Flame className="w-4 h-4 text-black" />
              3, 2, 1, GO SHOOT!
            </button>

            {currentMatch && (
              <button
                onClick={() => onSelectMatch(currentMatch)}
                className="text-xs font-mono text-gray-400 hover:text-[#00f2ff] underline"
              >
                開啟詳細計分裁判台 ➔
              </button>
            )}
          </div>

          {/* Player 2 Right Stage (Red/Purple) */}
          <div className="md:col-span-4 bg-[#11141d]/90 border border-rose-500/40 rounded-2xl p-6 text-center space-y-4 shadow-xl">
            <span className="inline-block px-3 py-1 rounded text-xs font-black bg-rose-500 text-white font-mono tracking-wider">
              2P 紅方
            </span>
            <div className="space-y-1">
              <h3 className="text-2xl sm:text-3xl font-black text-white truncate">
                {p2?.name || (currentMatch?.status === 'bye' ? '輪空 (BYE)' : '待定選手')}
              </h3>
              <div className="text-sm font-bold text-rose-400 font-mono">
                {p2?.beybladeName || '未指定戰鬥陀螺'}
              </div>
              <div className="text-xs text-gray-400 font-mono">
                {p2?.clubOrTeam || '自由選手'} {p2?.blade ? `(${p2.blade})` : ''}
              </div>
            </div>
            <div className="text-6xl sm:text-7xl font-black font-mono text-rose-400 py-2">
              {currentMatch?.player2Score || 0}
            </div>
          </div>
        </div>

        {/* Live Rounds Log Ticker */}
        {currentMatch?.roundsHistory && currentMatch.roundsHistory.length > 0 && (
          <div className="mt-8 pt-6 border-t border-[#ffffff10]">
            <h4 className="text-xs font-mono font-bold text-gray-400 mb-3 text-center uppercase tracking-wider">
              當前對決戰況即時跑馬燈
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {currentMatch.roundsHistory.slice(-3).map((r, i) => (
                <div
                  key={i}
                  className="p-2.5 bg-[#05070a] rounded-lg border border-[#ffffff10] text-xs font-mono text-gray-300 flex items-center justify-between"
                >
                  <span>局 {r.roundNum}: {r.finishType.toUpperCase()} (+{r.points})</span>
                  <span className={r.winner === 'p1' ? 'text-[#00f2ff] font-bold' : 'text-rose-400 font-bold'}>
                    {r.winner === 'p1' ? p1?.name : p2?.name} 得分
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
