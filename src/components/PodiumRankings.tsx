import React, { useEffect } from 'react';
import { Trophy, Award, Medal, Crown, Sparkles, Share2, Swords, Shield } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Tournament, Player } from '../types';

interface PodiumRankingsProps {
  tournament: Tournament;
  onSelectMatchById?: (matchId: string) => void;
}

export const PodiumRankings: React.FC<PodiumRankingsProps> = ({
  tournament
}) => {
  const rankings = tournament.rankings;
  const isComplete = tournament.status === 'completed' || (rankings?.champion && rankings?.runnerUp);

  useEffect(() => {
    if (rankings?.champion) {
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // fallback if canvas not available
      }
    }
  }, [rankings?.champion]);

  const grandFinalMatch = tournament.matches.find((m) => m.bracketWing === 'final');
  const thirdPlaceMatch = tournament.matches.find((m) => m.bracketWing === 'third_place');

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-8 animate-fade-in">
      {/* Top Banner */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-black uppercase tracking-wider shadow-[0_0_15px_rgba(245,158,11,0.2)]">
          <Trophy className="w-4 h-4" />
          雙翼淘汰賽榮譽之巔
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wide">
          {tournament.name} — 榮譽名人堂
        </h2>
        <p className="text-xs sm:text-sm text-gray-400 font-mono">
          依決賽與季殿軍戰裁決，頒發 <strong className="text-white">冠、亞、季、殿軍</strong> 四大最高榮譽！
        </p>
      </div>

      {/* 3D Dynamic Podium (冠 亞 季 殿) */}
      <div className="bg-[#0a0c12]/90 border border-[#ffffff10] rounded-3xl p-6 sm:p-10 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end justify-center pt-6">
          
          {/* 2nd Place: Runner-up (亞軍) */}
          <div className="order-2 sm:order-1 flex flex-col items-center">
            {rankings?.runnerUp ? (
              <div className="w-full bg-[#11141d]/90 border border-[#ffffff20] rounded-2xl p-4 text-center space-y-2 shadow-lg hover:border-white/40 transition-all">
                <div className="w-12 h-12 rounded-full bg-[#ffffff10] text-gray-200 border border-[#ffffff30] flex items-center justify-center mx-auto shadow">
                  <Medal className="w-7 h-7" />
                </div>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-black bg-gray-200 text-black">
                  🥈 亞軍 (2nd Place)
                </span>
                <h4 className="font-black text-lg text-white truncate">{rankings.runnerUp.name}</h4>
                <div className="text-xs text-gray-300 font-mono font-semibold">{rankings.runnerUp.beybladeName}</div>
                <div className="text-[11px] text-gray-500 font-mono">{rankings.runnerUp.clubOrTeam || '自由選手'}</div>
              </div>
            ) : (
              <div className="w-full bg-[#05070a] border border-dashed border-[#ffffff10] rounded-2xl p-6 text-center text-gray-600 text-xs font-mono">
                <Medal className="w-8 h-8 mx-auto mb-2 opacity-40" />
                亞軍 (待決賽誕生)
              </div>
            )}
            <div className="w-full bg-gradient-to-b from-[#1c2230] to-[#0d1017] h-24 rounded-t-xl mt-3 flex items-center justify-center text-gray-300 font-mono font-black text-xl border-t-2 border-gray-400">
              2nd
            </div>
          </div>

          {/* 1st Place: Champion (冠軍) - Center Highest */}
          <div className="order-1 sm:order-2 flex flex-col items-center sm:-mt-6">
            {rankings?.champion ? (
              <div className="w-full bg-gradient-to-b from-amber-950/70 via-[#161a26] to-[#0d1017] border-2 border-amber-400 rounded-3xl p-5 text-center space-y-2.5 shadow-[0_0_40px_rgba(245,158,11,0.3)] hover:scale-105 transition-transform">
                <div className="relative inline-block">
                  <Crown className="w-8 h-8 text-amber-400 absolute -top-4 -left-2 -rotate-12 animate-bounce" />
                  <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 border-2 border-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/30">
                    <Trophy className="w-9 h-9 animate-pulse" />
                  </div>
                </div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-black bg-gradient-to-r from-amber-400 to-orange-500 text-black shadow-md">
                  👑 總冠軍 (Champion)
                </span>
                <h3 className="font-black text-xl text-white truncate">{rankings.champion.name}</h3>
                <div className="text-xs text-amber-300 font-mono font-bold">{rankings.champion.beybladeName}</div>
                <div className="text-[11px] text-gray-400 font-mono">{rankings.champion.clubOrTeam || '自由選手'}</div>
              </div>
            ) : (
              <div className="w-full bg-[#05070a] border border-dashed border-amber-500/30 rounded-2xl p-6 text-center text-amber-500/60 text-xs font-mono">
                <Trophy className="w-10 h-10 mx-auto mb-2 text-amber-500/40" />
                總冠軍 (爭奪中)
              </div>
            )}
            <div className="w-full bg-gradient-to-b from-amber-500 to-amber-700 h-36 rounded-t-xl mt-3 flex items-center justify-center text-black font-mono font-black text-3xl border-t-2 border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.4)]">
              1st 🏆
            </div>
          </div>

          {/* 3rd Place: 季軍 */}
          <div className="order-3 flex flex-col items-center">
            {rankings?.thirdPlace ? (
              <div className="w-full bg-[#11141d]/90 border border-amber-700/60 rounded-2xl p-4 text-center space-y-2 shadow-lg">
                <div className="w-12 h-12 rounded-full bg-amber-700/20 text-amber-500 border border-amber-600/40 flex items-center justify-center mx-auto shadow">
                  <Award className="w-7 h-7" />
                </div>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-black bg-amber-700/40 text-amber-300 border border-amber-600/40">
                  🥉 季軍 (3rd Place)
                </span>
                <h4 className="font-black text-lg text-white truncate">{rankings.thirdPlace.name}</h4>
                <div className="text-xs text-amber-200/80 font-mono font-semibold">{rankings.thirdPlace.beybladeName}</div>
                <div className="text-[11px] text-gray-500 font-mono">{rankings.thirdPlace.clubOrTeam || '自由選手'}</div>
              </div>
            ) : (
              <div className="w-full bg-[#05070a] border border-dashed border-[#ffffff10] rounded-2xl p-6 text-center text-gray-600 text-xs font-mono">
                <Award className="w-8 h-8 mx-auto mb-2 opacity-40" />
                季軍 (季軍戰決定)
              </div>
            )}
            <div className="w-full bg-gradient-to-b from-[#3a200f] to-[#1a100a] h-20 rounded-t-xl mt-3 flex items-center justify-center text-amber-300 font-mono font-black text-xl border-t-2 border-amber-600">
              3rd
            </div>
          </div>

          {/* 4th Place: 殿軍 */}
          <div className="order-4 flex flex-col items-center">
            {rankings?.fourthPlace ? (
              <div className="w-full bg-[#11141d]/80 border border-[#ffffff15] rounded-2xl p-4 text-center space-y-2 shadow-lg">
                <div className="w-12 h-12 rounded-full bg-[#05070a] text-gray-400 border border-[#ffffff10] flex items-center justify-center mx-auto shadow">
                  <Shield className="w-6 h-6" />
                </div>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#1c2230] text-gray-300 border border-[#ffffff15]">
                  🏅 殿軍 (4th Place)
                </span>
                <h4 className="font-black text-lg text-white truncate">{rankings.fourthPlace.name}</h4>
                <div className="text-xs text-gray-400 font-mono font-semibold">{rankings.fourthPlace.beybladeName}</div>
                <div className="text-[11px] text-gray-500 font-mono">{rankings.fourthPlace.clubOrTeam || '自由選手'}</div>
              </div>
            ) : (
              <div className="w-full bg-[#05070a] border border-dashed border-[#ffffff10] rounded-2xl p-6 text-center text-gray-600 text-xs font-mono">
                <Shield className="w-8 h-8 mx-auto mb-2 opacity-40" />
                殿軍 (季軍戰次位)
              </div>
            )}
            <div className="w-full bg-gradient-to-b from-[#161a26] to-[#07090f] h-16 rounded-t-xl mt-3 flex items-center justify-center text-gray-400 font-mono font-black text-lg border-t-2 border-gray-600">
              4th
            </div>
          </div>

        </div>
      </div>

      {/* Match Recap Cards for Finals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Grand Final Recap */}
        {grandFinalMatch && (
          <div className="bg-[#0a0c12] border border-[#ffffff10] rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs border-b border-[#ffffff10] pb-2.5 font-mono">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <Trophy className="w-4 h-4" />
                總冠軍決賽戰報 (Grand Final)
              </span>
              <span className={`px-2 py-0.5 rounded font-bold ${
                grandFinalMatch.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-[#00f2ff]/20 text-[#00f2ff] border border-[#00f2ff]/30'
              }`}>
                {grandFinalMatch.status === 'completed' ? '完賽' : '進行中'}
              </span>
            </div>
            <div className="flex items-center justify-around py-3">
              <div className="text-center">
                <div className="text-sm font-bold text-white">
                  {rankings?.champion?.name || '左翼冠軍'}
                </div>
                <div className="text-2xl font-black font-mono text-amber-400 mt-1">
                  {grandFinalMatch.player1Score}
                </div>
              </div>
              <div className="text-xs font-mono font-black text-gray-600">VS</div>
              <div className="text-center">
                <div className="text-sm font-bold text-white">
                  {rankings?.runnerUp?.name || '右翼冠軍'}
                </div>
                <div className="text-2xl font-black font-mono text-amber-400 mt-1">
                  {grandFinalMatch.player2Score}
                </div>
              </div>
            </div>
            {grandFinalMatch.roundsHistory.length > 0 && (
              <div className="text-[11px] text-gray-400 space-y-1 bg-[#05070a] p-2.5 rounded-xl border border-[#ffffff10] font-mono">
                {grandFinalMatch.roundsHistory.map((r, i) => (
                  <div key={i} className="flex justify-between">
                    <span>第 {r.roundNum} 局: {r.description}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3rd Place Match Recap */}
        {thirdPlaceMatch && (
          <div className="bg-[#0a0c12] border border-[#ffffff10] rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs border-b border-[#ffffff10] pb-2.5 font-mono">
              <span className="font-bold text-amber-300/90 flex items-center gap-1.5">
                <Award className="w-4 h-4" />
                季殿軍戰報 (3rd Place Match)
              </span>
              <span className={`px-2 py-0.5 rounded font-bold ${
                thirdPlaceMatch.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-[#00f2ff]/20 text-[#00f2ff] border border-[#00f2ff]/30'
              }`}>
                {thirdPlaceMatch.status === 'completed' ? '完賽' : '進行中'}
              </span>
            </div>
            <div className="flex items-center justify-around py-3">
              <div className="text-center">
                <div className="text-sm font-bold text-white">
                  {rankings?.thirdPlace?.name || '左翼準決賽'}
                </div>
                <div className="text-2xl font-black font-mono text-amber-300/80 mt-1">
                  {thirdPlaceMatch.player1Score}
                </div>
              </div>
              <div className="text-xs font-mono font-black text-gray-600">VS</div>
              <div className="text-center">
                <div className="text-sm font-bold text-white">
                  {rankings?.fourthPlace?.name || '右翼準決賽'}
                </div>
                <div className="text-2xl font-black font-mono text-amber-300/80 mt-1">
                  {thirdPlaceMatch.player2Score}
                </div>
              </div>
            </div>
            {thirdPlaceMatch.roundsHistory.length > 0 && (
              <div className="text-[11px] text-gray-400 space-y-1 bg-[#05070a] p-2.5 rounded-xl border border-[#ffffff10] font-mono">
                {thirdPlaceMatch.roundsHistory.map((r, i) => (
                  <div key={i} className="flex justify-between">
                    <span>第 {r.roundNum} 局: {r.description}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Prize Awards Box if configured */}
      {tournament.prizes && (tournament.prizes.champion || tournament.prizes.runnerUp || tournament.prizes.thirdPlace || tournament.prizes.fourthPlace || tournament.prizes.extraNotes) && (
        <div className="bg-[#0d111c]/90 border border-amber-500/30 rounded-2xl p-5 shadow-xl space-y-3 font-mono">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <Trophy className="w-4 h-4" />
            <span>大會獎項註記與頒發項目</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {tournament.prizes.champion && (
              <div className="p-3 bg-amber-950/30 border border-amber-500/40 rounded-xl space-y-1">
                <div className="text-amber-400 font-black">👑 冠軍獎項：</div>
                <div className="text-white">{tournament.prizes.champion}</div>
              </div>
            )}
            {tournament.prizes.runnerUp && (
              <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl space-y-1">
                <div className="text-slate-300 font-black">🥈 亞軍獎項：</div>
                <div className="text-white">{tournament.prizes.runnerUp}</div>
              </div>
            )}
            {tournament.prizes.thirdPlace && (
              <div className="p-3 bg-amber-950/20 border border-amber-700/30 rounded-xl space-y-1">
                <div className="text-amber-500 font-black">🥉 季軍獎項：</div>
                <div className="text-white">{tournament.prizes.thirdPlace}</div>
              </div>
            )}
            {tournament.prizes.fourthPlace && (
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                <div className="text-slate-400 font-black">🏅 殿軍獎項：</div>
                <div className="text-white">{tournament.prizes.fourthPlace}</div>
              </div>
            )}
          </div>
          {tournament.prizes.extraNotes && (
            <div className="p-3 bg-purple-950/20 border border-purple-800/40 rounded-xl text-xs space-y-1">
              <div className="text-purple-300 font-bold">🎁 特別加碼 / 額外獎勵：</div>
              <div className="text-purple-200">{tournament.prizes.extraNotes}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
