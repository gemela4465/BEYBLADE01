import React, { useState, useEffect } from 'react';
import { 
  Swords, Trophy, Check, X, Shield, Plus, Minus, RotateCcw, 
  Flame, Zap, Compass, AlertTriangle, FileText, ArrowRight, History,
  Sparkles, RefreshCw, UserCheck, AlertCircle
} from 'lucide-react';
import { Match, Player, BattleRoundRecord, FinishType, Tournament } from '../types';
import { FINISH_RULES } from '../data/beybladeData';
import { getEligibleRepechagePlayers } from '../utils/bracketGenerator';

interface MatchRefereeModalProps {
  match: Match | null;
  players: Player[];
  tournament?: Tournament;
  isOpen: boolean;
  onClose: () => void;
  onSaveMatchResult: (
    matchId: string,
    p1Score: number,
    p2Score: number,
    roundsHistory: BattleRoundRecord[]
  ) => void;
  onSubstitutePlayer?: (
    matchId: string,
    slot: 1 | 2,
    newPlayer: Player,
    isRepechage?: boolean
  ) => void;
}

export const MatchRefereeModal: React.FC<MatchRefereeModalProps> = ({
  match,
  players,
  tournament,
  isOpen,
  onClose,
  onSaveMatchResult,
  onSubstitutePlayer
}) => {
  if (!isOpen || !match || (tournament && tournament.status !== 'in_progress')) return null;

  const playerMap = new Map<string, Player>();
  players.forEach((p) => playerMap.set(p.id, p));

  const p1 = match.player1Id ? playerMap.get(match.player1Id) : null;
  const p2 = match.player2Id ? playerMap.get(match.player2Id) : null;

  const [p1Score, setP1Score] = useState<number>(match.player1Score || 0);
  const [p2Score, setP2Score] = useState<number>(match.player2Score || 0);
  const [roundsHistory, setRoundsHistory] = useState<BattleRoundRecord[]>(match.roundsHistory || []);
  const [customNote, setCustomNote] = useState('');
  const [targetScore, setTargetScore] = useState<number>(match.targetScore || 4);

  // Substitution / Repechage drawer state
  const [substituteSlot, setSubstituteSlot] = useState<1 | 2 | null>(null);
  const [repechageSuccessMsg, setRepechageSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (match) {
      setP1Score(match.player1Score || 0);
      setP2Score(match.player2Score || 0);
      setRoundsHistory(match.roundsHistory || []);
      setTargetScore(match.targetScore || 4);
      setSubstituteSlot(null);
      setRepechageSuccessMsg(null);
    }
  }, [match]);

  const handleAddRound = (winner: 'p1' | 'p2', finishType: FinishType) => {
    const rule = FINISH_RULES[finishType];
    const points = rule.points;

    let newP1 = p1Score;
    let newP2 = p2Score;

    if (winner === 'p1') {
      newP1 = Math.min(11, p1Score + points);
      setP1Score(newP1);
    } else {
      newP2 = Math.min(11, p2Score + points);
      setP2Score(newP2);
    }

    const newRecord: BattleRoundRecord = {
      roundNum: roundsHistory.length + 1,
      winner,
      finishType,
      points,
      description: `${winner === 'p1' ? (p1?.name || '選手1') : (p2?.name || '選手2')} 以【${rule.name}】獲得 ${points} 分${customNote ? ` (${customNote})` : ''}`,
      timestamp: Date.now()
    };

    setRoundsHistory([...roundsHistory, newRecord]);
    setCustomNote('');
  };

  const handleUndoRound = () => {
    if (roundsHistory.length === 0) return;
    const last = roundsHistory[roundsHistory.length - 1];
    if (last.winner === 'p1') {
      setP1Score((prev) => Math.max(0, prev - last.points));
    } else if (last.winner === 'p2') {
      setP2Score((prev) => Math.max(0, prev - last.points));
    }
    setRoundsHistory(roundsHistory.slice(0, -1));
  };

  const handleResetScores = () => {
    if (window.confirm('確定要清空本場對決之比分與競程記錄嗎？')) {
      setP1Score(0);
      setP2Score(0);
      setRoundsHistory([]);
    }
  };

  const handleConfirmAndSave = () => {
    onSaveMatchResult(match.id, p1Score, p2Score, roundsHistory);
    onClose();
  };

  const handleSelectRepechagePlayer = (selectedPlayer: Player, isRepechage: boolean = true) => {
    if (!substituteSlot || !onSubstitutePlayer) return;
    onSubstitutePlayer(match.id, substituteSlot, selectedPlayer, isRepechage);
    setRepechageSuccessMsg(`已成功將 ${substituteSlot === 1 ? '1P 藍方' : '2P 紅方'} 替換為【${selectedPlayer.name}】${isRepechage ? '(敗部復活)' : ''}`);
    setSubstituteSlot(null);
    setTimeout(() => setRepechageSuccessMsg(null), 3000);
  };

  const handleRestoreReservePlayer = (slot: 1 | 2) => {
    if (!onSubstitutePlayer) return;
    const reserveIndex = slot === 1 ? (match.matchIndex * 2 + 1) : (match.matchIndex * 2 + 2);
    const restoredReserve: Player = {
      id: `player_reserve_${reserveIndex}_${Date.now()}`,
      name: `預備選手 ${reserveIndex}`,
      beybladeName: '預備陀螺 (待定)',
      beybladeType: 'balance',
      clubOrTeam: '大會預備席 (可敗部復活)',
      status: 'approved',
      registeredAt: Date.now(),
      isSeed: false,
      isReserve: true,
      reserveIndex
    };
    onSubstitutePlayer(match.id, slot, restoredReserve, false);
    setRepechageSuccessMsg(`已將 ${slot === 1 ? '1P 藍方' : '2P 紅方'} 恢復為【${restoredReserve.name}】預備席`);
    setSubstituteSlot(null);
    setTimeout(() => setRepechageSuccessMsg(null), 3000);
  };

  // Eligible eliminated players for repechage
  const eligibleRepechageList = tournament ? getEligibleRepechagePlayers(tournament) : [];

  // Determine tentative winner
  const isMatchDecided = p1Score !== p2Score && (p1Score >= targetScore || p2Score >= targetScore || p1Score === 11 || p2Score === 11);
  const leadingPlayer = p1Score > p2Score ? p1 : p2Score > p1Score ? p2 : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0a0c12] border border-[#ffffff15] rounded-3xl max-w-4xl w-full p-5 sm:p-7 shadow-[0_0_60px_rgba(0,0,0,0.9)] text-[#e0e6ed] relative my-auto">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#00f2ff] to-transparent opacity-80" />

        {/* Close Button */}
        <button
          id="btn-close-referee-modal"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 rounded-xl hover:bg-[#ffffff10] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#ffffff10] pb-4 mb-6 gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00f2ff]/15 border border-[#00f2ff]/30 flex items-center justify-center text-[#00f2ff] shadow-[0_0_15px_rgba(0,242,255,0.2)]">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-xs font-bold text-[#00f2ff]">{match.label}</span>
                <span className="text-gray-600">•</span>
                <span className="text-xs text-gray-400">場次編號 #{match.matchNumber}</span>
              </div>
              <h2 className="text-xl font-black text-white mt-0.5 tracking-wide">
                陀螺對戰競程裁判計分台 (0 - 11 分)
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#05070a] px-3 py-1.5 rounded-xl border border-[#ffffff10] text-xs font-mono">
            <span className="text-gray-400">獲勝制：</span>
            <span className="font-bold text-[#00f2ff]">{targetScore} 分晉級 (上限11分)</span>
          </div>
        </div>

        {/* Success Alert for Repechage / Substitution */}
        {repechageSuccessMsg && (
          <div className="mb-5 p-3 rounded-xl bg-[#06C755]/20 border border-[#06C755]/50 text-[#06C755] text-xs font-mono font-bold flex items-center gap-2 shadow-lg animate-fade-in">
            <UserCheck className="w-4 h-4 text-[#06C755]" />
            <span>{repechageSuccessMsg}</span>
          </div>
        )}

        {/* Side-by-side Battle Arena */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative mb-6">
          {/* Player 1 (Left Corner - Blue) */}
          <div className={`p-5 rounded-2xl border transition-all ${
            p1Score > p2Score && isMatchDecided
              ? 'bg-[#0e1626] border-[#00f2ff] shadow-[0_0_20px_rgba(0,242,255,0.2)]'
              : 'bg-[#11141d]/90 border-[#ffffff10]'
          }`}>
            <div className="flex items-center justify-between mb-3 font-mono">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#00f2ff] text-black">
                  1P 藍方
                </span>
                {p1?.isSeed && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#7000ff]/20 text-purple-300 border border-[#7000ff]/40">
                    第 {p1.seedNumber} 種子
                  </span>
                )}
                {p1?.isReserve && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    預備選手席位
                  </span>
                )}
                {p1?.isRepechage && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gradient-to-r from-purple-500/30 to-amber-500/30 text-amber-300 border border-amber-500/50 flex items-center gap-0.5">
                    ⚡ 敗部復活
                  </span>
                )}
              </div>
              {p1Score > p2Score && isMatchDecided && (
                <span className="text-xs font-bold text-[#00f2ff] flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> 獲勝領先
                </span>
              )}
            </div>

            <div className="space-y-1 mb-3">
              <div className="text-lg font-black text-white">{p1?.name || '待定選手'}</div>
              <div className="text-xs text-[#00f2ff] font-mono font-semibold">{p1?.beybladeName || '未指定陀螺'}</div>
              <div className="text-[11px] text-gray-400 font-mono">
                {p1?.blade ? `配件: ${p1.blade}` : ''} {p1?.clubOrTeam ? `• ${p1.clubOrTeam}` : ''}
              </div>
            </div>

            {/* Repechage / Substitute Trigger Button for 1P */}
            {onSubstitutePlayer && match.status !== 'completed' && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => setSubstituteSlot(substituteSlot === 1 ? null : 1)}
                  className="w-full py-1.5 px-3 rounded-lg bg-gradient-to-r from-amber-500/15 via-purple-500/15 to-[#00f2ff]/15 hover:from-amber-500/25 hover:to-[#00f2ff]/25 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {p1?.isReserve ? '⚡ 選擇落敗正規選手【敗部復活】參賽' : p1?.isRepechage ? '🔄 變更敗部復活選手 / 恢復預備席' : '🔄 替換此席位參賽選手'}
                  </span>
                </button>
              </div>
            )}

            {/* Score Display & Manual Adjust */}
            <div className="flex items-center justify-between bg-[#05070a] p-3 rounded-xl border border-[#ffffff10] mb-4">
              <div className="text-xs text-gray-400 font-mono">目前比分 (0-11)</div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setP1Score((s) => Math.max(0, s - 1))}
                  className="w-8 h-8 rounded-lg bg-[#11141d] hover:bg-[#ffffff15] text-gray-200 font-bold flex items-center justify-center transition-colors border border-[#ffffff10]"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="w-12 text-center text-3xl font-black font-mono text-[#00f2ff]">
                  {p1Score}
                </div>
                <button
                  onClick={() => setP1Score((s) => Math.min(11, s + 1))}
                  className="w-8 h-8 rounded-lg bg-[#11141d] hover:bg-[#ffffff15] text-gray-200 font-bold flex items-center justify-center transition-colors border border-[#ffffff10]"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Beyblade Finish Scoring Buttons */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-mono font-semibold text-gray-400">一鍵判定 1P 得分獲勝方式：</div>
              <div className="grid grid-cols-2 gap-2 font-mono">
                <button
                  onClick={() => handleAddRound('p1', 'spin')}
                  className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-colors flex items-center justify-between"
                >
                  <span>🌀 迴轉 (Spin)</span>
                  <span className="font-mono bg-amber-500/20 px-1.5 py-0.5 rounded">+1</span>
                </button>
                <button
                  onClick={() => handleAddRound('p1', 'over')}
                  className="p-2 bg-[#00f2ff]/10 hover:bg-[#00f2ff]/20 text-[#00f2ff] border border-[#00f2ff]/30 rounded-xl text-xs font-bold transition-colors flex items-center justify-between"
                >
                  <span>💥 場外 (Over)</span>
                  <span className="font-mono bg-[#00f2ff]/20 px-1.5 py-0.5 rounded">+2</span>
                </button>
                <button
                  onClick={() => handleAddRound('p1', 'burst')}
                  className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition-colors flex items-center justify-between"
                >
                  <span>⚡ 爆裂 (Burst)</span>
                  <span className="font-mono bg-rose-500/20 px-1.5 py-0.5 rounded">+2</span>
                </button>
                <button
                  onClick={() => handleAddRound('p1', 'xtreme')}
                  className="p-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold transition-colors flex items-center justify-between"
                >
                  <span>🔥 極限 (Xtreme)</span>
                  <span className="font-mono bg-purple-500/20 px-1.5 py-0.5 rounded">+3</span>
                </button>
              </div>
            </div>
          </div>

          {/* Player 2 (Right Corner - Red) */}
          <div className={`p-5 rounded-2xl border transition-all ${
            p2Score > p1Score && isMatchDecided
              ? 'bg-[#220d18] border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
              : 'bg-[#11141d]/90 border-[#ffffff10]'
          }`}>
            <div className="flex items-center justify-between mb-3 font-mono">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-500 text-white">
                  2P 紅方
                </span>
                {p2?.isSeed && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#7000ff]/20 text-purple-300 border border-[#7000ff]/40">
                    第 {p2.seedNumber} 種子
                  </span>
                )}
                {p2?.isReserve && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    預備選手席位
                  </span>
                )}
                {p2?.isRepechage && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gradient-to-r from-purple-500/30 to-amber-500/30 text-amber-300 border border-amber-500/50 flex items-center gap-0.5">
                    ⚡ 敗部復活
                  </span>
                )}
              </div>
              {p2Score > p1Score && isMatchDecided && (
                <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> 獲勝領先
                </span>
              )}
            </div>

            <div className="space-y-1 mb-3">
              <div className="text-lg font-black text-white">{p2?.name || (match.status === 'bye' ? '輪空 (BYE)' : '待定選手')}</div>
              <div className="text-xs text-rose-300 font-mono font-semibold">{p2?.beybladeName || '未指定陀螺'}</div>
              <div className="text-[11px] text-gray-400 font-mono">
                {p2?.blade ? `配件: ${p2.blade}` : ''} {p2?.clubOrTeam ? `• ${p2.clubOrTeam}` : ''}
              </div>
            </div>

            {/* Repechage / Substitute Trigger Button for 2P */}
            {onSubstitutePlayer && match.status !== 'completed' && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => setSubstituteSlot(substituteSlot === 2 ? null : 2)}
                  className="w-full py-1.5 px-3 rounded-lg bg-gradient-to-r from-amber-500/15 via-purple-500/15 to-rose-500/15 hover:from-amber-500/25 hover:to-rose-500/25 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {p2?.isReserve ? '⚡ 選擇落敗正規選手【敗部復活】參賽' : p2?.isRepechage ? '🔄 變更敗部復活選手 / 恢復預備席' : '🔄 替換此席位參賽選手'}
                  </span>
                </button>
              </div>
            )}

            {/* Score Display & Manual Adjust */}
            <div className="flex items-center justify-between bg-[#05070a] p-3 rounded-xl border border-[#ffffff10] mb-4">
              <div className="text-xs text-gray-400 font-mono">目前比分 (0-11)</div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setP2Score((s) => Math.max(0, s - 1))}
                  className="w-8 h-8 rounded-lg bg-[#11141d] hover:bg-[#ffffff15] text-gray-200 font-bold flex items-center justify-center transition-colors border border-[#ffffff10]"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="w-12 text-center text-3xl font-black font-mono text-rose-400">
                  {p2Score}
                </div>
                <button
                  onClick={() => setP2Score((s) => Math.min(11, s + 1))}
                  className="w-8 h-8 rounded-lg bg-[#11141d] hover:bg-[#ffffff15] text-gray-200 font-bold flex items-center justify-center transition-colors border border-[#ffffff10]"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Beyblade Finish Scoring Buttons */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-mono font-semibold text-gray-400">一鍵判定 2P 得分獲勝方式：</div>
              <div className="grid grid-cols-2 gap-2 font-mono">
                <button
                  onClick={() => handleAddRound('p2', 'spin')}
                  className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-colors flex items-center justify-between"
                >
                  <span>🌀 迴轉 (Spin)</span>
                  <span className="font-mono bg-amber-500/20 px-1.5 py-0.5 rounded">+1</span>
                </button>
                <button
                  onClick={() => handleAddRound('p2', 'over')}
                  className="p-2 bg-[#00f2ff]/10 hover:bg-[#00f2ff]/20 text-[#00f2ff] border border-[#00f2ff]/30 rounded-xl text-xs font-bold transition-colors flex items-center justify-between"
                >
                  <span>💥 場外 (Over)</span>
                  <span className="font-mono bg-[#00f2ff]/20 px-1.5 py-0.5 rounded">+2</span>
                </button>
                <button
                  onClick={() => handleAddRound('p2', 'burst')}
                  className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition-colors flex items-center justify-between"
                >
                  <span>⚡ 爆裂 (Burst)</span>
                  <span className="font-mono bg-rose-500/20 px-1.5 py-0.5 rounded">+2</span>
                </button>
                <button
                  onClick={() => handleAddRound('p2', 'xtreme')}
                  className="p-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold transition-colors flex items-center justify-between"
                >
                  <span>🔥 極限 (Xtreme)</span>
                  <span className="font-mono bg-purple-500/20 px-1.5 py-0.5 rounded">+3</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Repechage / Substitute Selector Panel */}
        {substituteSlot && (
          <div className="bg-[#0e1422] border-2 border-amber-500/60 rounded-2xl p-4 sm:p-5 mb-6 shadow-[0_0_30px_rgba(245,158,11,0.2)] animate-fade-in space-y-4">
            <div className="flex items-center justify-between border-b border-[#ffffff10] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                    <span>⚡ 選擇選手進行【敗部復活】或替換 {substituteSlot === 1 ? '1P 藍方' : '2P 紅方'}</span>
                  </h4>
                  <p className="text-[11px] text-gray-400 font-mono">
                    規則說明：在比賽還沒結果前，可隨時將預備席替換為已落敗之正規選手進行敗部復活參賽！
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSubstituteSlot(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#ffffff10]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List A: Eliminated regular players (Top Recommendation) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-amber-300">
                <span className="flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  已落敗之正規選手名單 (優先推薦敗部復活)：
                </span>
                <span className="text-gray-400 text-[11px]">共 {eligibleRepechageList.length} 位選手</span>
              </div>

              {eligibleRepechageList.length === 0 ? (
                <div className="p-3 rounded-xl bg-[#05070a] border border-[#ffffff0a] text-center text-xs font-mono text-gray-500">
                  目前尚未有其他正規賽事產生落敗選手，或所有落敗選手均已在其他席位。
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {eligibleRepechageList.map((item) => (
                    <button
                      key={item.player.id}
                      type="button"
                      onClick={() => handleSelectRepechagePlayer(item.player, true)}
                      className="p-2.5 bg-[#070a12] hover:bg-amber-500/15 border border-[#ffffff10] hover:border-amber-500/50 rounded-xl text-left transition-all flex items-center justify-between group"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold text-white group-hover:text-amber-300 truncate flex items-center gap-1.5">
                          <span>{item.player.name}</span>
                          {item.player.isSeed && (
                            <span className="text-[9px] px-1 rounded bg-[#7000ff]/30 text-purple-300">
                              #{item.player.seedNumber}種子
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono truncate">
                          {item.player.beybladeName} • 在 #{item.matchNumber} {item.lostInMatchLabel} 落敗 ({item.scoreSummary})
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold shrink-0 group-hover:bg-amber-500 group-hover:text-black transition-colors">
                        點擊復活 ➔
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* List B: Select any registered player or restore placeholder */}
            <div className="pt-2 border-t border-[#ffffff10] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-400">其他選手：</span>
                <select
                  onChange={(e) => {
                    const sel = playerMap.get(e.target.value);
                    if (sel) handleSelectRepechagePlayer(sel, false);
                  }}
                  defaultValue=""
                  className="bg-[#05070a] border border-[#ffffff20] text-xs font-mono text-gray-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-[#00f2ff]"
                >
                  <option value="" disabled>從大會登記名單手動選擇選手...</option>
                  {players.filter((p) => p.status === 'approved' && !p.isReserve).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.beybladeName}) {p.clubOrTeam ? `- ${p.clubOrTeam}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => handleRestoreReservePlayer(substituteSlot)}
                className="px-3 py-1.5 bg-[#11141d] hover:bg-[#ffffff15] text-gray-400 hover:text-white rounded-lg text-xs font-mono border border-[#ffffff10] transition-colors"
              >
                ↩️ 恢復為原始預備選手席位
              </button>
            </div>
          </div>
        )}

        {/* Battle Logs & Rounds History (比賽競程記錄) */}
        <div className="bg-[#05070a] border border-[#ffffff10] rounded-2xl p-4 mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-white">
              <History className="w-4 h-4 text-[#00f2ff]" />
              <span>比賽競程詳細記錄 ({roundsHistory.length} 回合)</span>
            </div>
            <div className="flex items-center gap-2 font-mono">
              {roundsHistory.length > 0 && (
                <button
                  onClick={handleUndoRound}
                  className="px-2.5 py-1 bg-[#11141d] hover:bg-[#ffffff15] text-gray-300 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors border border-[#ffffff10]"
                >
                  <RotateCcw className="w-3 h-3" />
                  撤銷上一局
                </button>
              )}
              <button
                onClick={handleResetScores}
                className="px-2.5 py-1 bg-[#11141d] hover:bg-rose-900/40 text-gray-400 hover:text-rose-300 rounded-lg text-xs font-medium transition-colors border border-[#ffffff10]"
              >
                重置記錄
              </button>
            </div>
          </div>

          {roundsHistory.length === 0 ? (
            <div className="text-center py-4 text-xs font-mono text-gray-500">
              尚無回合記錄，點擊上方 🌀/💥/⚡/🔥 按鈕或微調比分開始記錄競程！
            </div>
          ) : (
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 font-mono">
              {roundsHistory.map((rec, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-[#0a0c12] rounded-lg border border-[#ffffff0a] text-xs flex items-center justify-between text-gray-300"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#11141d] border border-[#ffffff10] flex items-center justify-center font-bold text-[10px] text-[#00f2ff]">
                      {rec.roundNum}
                    </span>
                    <span>{rec.description}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    rec.winner === 'p1' ? 'bg-[#00f2ff]/20 text-[#00f2ff] border border-[#00f2ff]/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}>
                    {rec.winner === 'p1' ? '1P 藍方勝' : '2P 紅方勝'} (+{rec.points}分)
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Custom Note input for this round */}
          <div className="flex items-center gap-2 pt-1 border-t border-[#ffffff10]">
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="輸入本局裁判備註 (例：X-Dash 極速衝撞爆裂、反擊擊出...)"
              className="flex-1 px-3 py-1.5 bg-[#0a0c12] border border-[#ffffff15] rounded-lg text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#00f2ff] font-mono"
            />
          </div>
        </div>

        {/* Footer Actions: Save and Advance */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="text-xs text-gray-400 font-mono">
            {p1Score === p2Score ? (
              <span className="text-amber-400 font-medium">⚠️ 目前平手，請持續對決直至分出勝負</span>
            ) : leadingPlayer ? (
              <span className="text-[#00f2ff] font-bold flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                將由 【{leadingPlayer.name}】 ({p1Score > p2Score ? `${p1Score}:${p2Score}` : `${p2Score}:${p1Score}`}) 晉級下一輪
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#11141d] hover:bg-[#ffffff15] text-gray-300 text-xs font-semibold transition-colors border border-[#ffffff10]"
            >
              取消
            </button>
            <button
              id="btn-confirm-save-match"
              onClick={handleConfirmAndSave}
              disabled={p1Score === p2Score && !match.winnerId}
              className={`px-5 py-2 rounded-lg text-xs font-bold font-mono uppercase tracking-wider transition-all flex items-center gap-2 ${
                p1Score !== p2Score
                  ? 'bg-gradient-to-r from-[#00f2ff] to-[#7000ff] text-black shadow-[0_0_20px_rgba(0,242,255,0.4)] active:scale-95'
                  : 'bg-[#11141d] text-gray-600 cursor-not-allowed border border-[#ffffff0a]'
              }`}
            >
              <Check className="w-4 h-4" />
              確認比賽結果並晉級勝者
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

