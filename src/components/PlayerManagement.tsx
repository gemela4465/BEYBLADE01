import React, { useState } from 'react';
import { 
  Users, CheckCircle2, XCircle, Shield, Sparkles, Plus, Trash2, 
  Edit3, Shuffle, ArrowRight, Swords, AlertCircle, RefreshCw, UserCheck
} from 'lucide-react';
import { Player, Tournament, BeybladeType } from '../types';
import { POPULAR_BEYBLADES, SAMPLE_PLAYERS } from '../data/beybladeData';

interface PlayerManagementProps {
  tournament: Tournament | null;
  onApprovePlayer: (playerId: string) => void;
  onRejectPlayer: (playerId: string) => void;
  onApproveAllPending: () => void;
  onAddPlayer: (playerData: Omit<Player, 'id' | 'status' | 'registeredAt'>, autoApprove?: boolean) => void;
  onRemovePlayer: (playerId: string) => void;
  onUpdatePlayer: (player: Player) => void;
  onGenerateBracket: () => void;
  onSetSeedStatus: (playerId: string, isSeed: boolean, seedNumber?: number) => void;
  onRandomizeSeeds: (seedCount: number) => void;
  onPopulateSamplePlayers: (count: number) => void;
  onRefreshRoster?: () => void;
}

export const PlayerManagement: React.FC<PlayerManagementProps> = ({
  tournament,
  onApprovePlayer,
  onRejectPlayer,
  onApproveAllPending,
  onAddPlayer,
  onRemovePlayer,
  onUpdatePlayer,
  onGenerateBracket,
  onSetSeedStatus,
  onRandomizeSeeds,
  onPopulateSamplePlayers,
  onRefreshRoster
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    if (onRefreshRoster) {
      onRefreshRoster();
    }
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // Manual Add Form State
  const [manualName, setManualName] = useState('');
  const [manualLineId, setManualLineId] = useState('');
  const [manualBeyblade, setManualBeyblade] = useState(POPULAR_BEYBLADES[0].name);
  const [manualType, setManualType] = useState<BeybladeType>('attack');
  const [manualCombo, setManualCombo] = useState(POPULAR_BEYBLADES[0].combo);
  const [manualClub, setManualClub] = useState('戰鬥陀螺菁英隊');
  const [manualIsSeed, setManualIsSeed] = useState(false);
  const [manualSeedNum, setManualSeedNum] = useState<number | undefined>(undefined);

  const players = tournament?.players || [];
  const pendingPlayers = players.filter((p) => p.status === 'pending');
  const approvedPlayers = players.filter((p) => p.status === 'approved');
  const targetSize = tournament?.targetSize || 16;
  const isFull = approvedPlayers.length >= targetSize;

  const handleCreateManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) return;

    onAddPlayer(
      {
        name: manualName.trim(),
        lineId: manualLineId.trim() || undefined,
        beybladeName: manualBeyblade,
        beybladeType: manualType,
        blade: manualCombo,
        clubOrTeam: manualClub.trim() || '個人選手',
        isSeed: manualIsSeed,
        seedNumber: manualIsSeed ? manualSeedNum : undefined
      },
      true // auto-approved since admin manually added
    );

    setManualName('');
    setManualLineId('');
    setManualIsSeed(false);
    setManualSeedNum(undefined);
    setShowAddModal(false);
  };

  const handleUpdatePlayerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;
    onUpdatePlayer(editingPlayer);
    setEditingPlayer(null);
  };

  const getAttributeBadge = (type: BeybladeType) => {
    switch (type) {
      case 'attack':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-red-500/20 text-red-400 border border-red-500/40">⚔️ 攻擊</span>;
      case 'defense':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">🛡️ 防禦</span>;
      case 'stamina':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">🔄 持久</span>;
      case 'balance':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-purple-500/20 text-purple-400 border border-purple-500/40">⚖️ 平衡</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Top Banner & Generation Action */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
              管理者審核後台
            </span>
            <span className="text-xs text-slate-400">
              預定賽制規模：{targetSize} 人雙翼對抗
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            成員審核登記與種子排位管理
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            審核 LINE 群組送來的報名名單，確認成員登記無誤後，即可點擊生成雙翼對戰賽程表！
          </p>
        </div>

        {/* Big Action: Generate Bracket */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <button
            id="btn-generate-bracket"
            onClick={onGenerateBracket}
            disabled={approvedPlayers.length < 2}
            className={`px-6 py-3.5 rounded-xl font-black text-sm shadow-xl flex items-center justify-center gap-2.5 transition-all ${
              approvedPlayers.length >= 2
                ? 'bg-gradient-to-r from-orange-500 via-red-500 to-rose-600 hover:from-orange-600 hover:to-rose-700 text-white shadow-orange-500/25 active:scale-95 animate-pulse'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            <Swords className="w-5 h-5" />
            <span>
              {approvedPlayers.length >= targetSize
                ? '名額已滿！生成雙翼賽程表 ➔'
                : `確認完成登記 (${approvedPlayers.length}/${targetSize}人)，立即生成賽程 ➔`}
            </span>
          </button>
        </div>
      </div>

      {/* Quick Fill / Tools bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-300">
          <span className="font-semibold text-white">⚡ 管理者快速工具：</span>
          <button
            id="btn-quick-fill-size"
            onClick={() => onPopulateSamplePlayers(targetSize)}
            className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg font-medium transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            一鍵填滿 {targetSize} 位真實陀螺選手 (含LINE/陀螺)
          </button>
          <button
            id="btn-random-seed"
            onClick={() => onRandomizeSeeds(Math.min(4, Math.max(2, targetSize / 4)))}
            className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-lg font-medium transition-colors flex items-center gap-1.5"
          >
            <Shuffle className="w-3.5 h-3.5 text-purple-400" />
            隨機抽籤指定 {Math.min(4, Math.max(2, targetSize / 4))} 位種子
          </button>
        </div>

        <button
          id="btn-open-manual-add"
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          手動新增參賽成員
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Pending Approval Queue from LINE (LINE 待審核成員列表) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4 gap-2 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold">
                  {pendingPlayers.length}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-base">待審核報名列表 (LINE 佇列)</h3>
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      即時連線同步
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">由群組點擊參加送出的成員名單（自動即時匯入）</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-manual-sync-players"
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-all text-xs flex items-center gap-1"
                  title="立即與伺服器重新同步名單"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#00f2ff]' : ''}`} />
                  <span className="hidden sm:inline text-[11px]">同步名單</span>
                </button>

                {pendingPlayers.length > 0 && (
                  <button
                    id="btn-approve-all"
                    onClick={onApproveAllPending}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow transition-all flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    一鍵全數審核通過
                  </button>
                )}
              </div>
            </div>

            {pendingPlayers.length === 0 ? (
              <div className="text-center py-10 px-4 text-slate-500 space-y-2">
                <UserCheck className="w-10 h-10 mx-auto text-slate-600" />
                <p className="text-sm font-semibold text-slate-400">目前沒有待審核的 LINE 報名成員</p>
                <p className="text-xs">分享 LINE 邀請連結給群組成員，或點擊上方「一鍵填滿」測試！</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {pendingPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700 hover:border-slate-600 transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{player.name}</span>
                          {player.lineId && (
                            <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800">
                              @{player.lineId}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">{player.clubOrTeam || '自由選手'}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          id={`btn-approve-${player.id}`}
                          onClick={() => onApprovePlayer(player.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow flex items-center gap-1 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          確認登記
                        </button>
                        <button
                          id={`btn-reject-${player.id}`}
                          onClick={() => onRejectPlayer(player.id)}
                          className="p-1 bg-slate-700 hover:bg-red-600/40 text-slate-400 hover:text-red-300 rounded-lg transition-colors"
                          title="退回申請"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs bg-slate-900/60 p-2 rounded-lg border border-slate-700/50">
                      <span className="text-slate-300 font-medium">{player.beybladeName}</span>
                      <div className="flex items-center gap-1.5">
                        {getAttributeBadge(player.beybladeType)}
                        {player.blade && (
                          <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                            {player.blade}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Approved Registered Member List & Seed Management (已確認參賽名單) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-800 mb-4 gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold">
                  {approvedPlayers.length}
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">已登記參賽名單 ({approvedPlayers.length} / {targetSize})</h3>
                  <p className="text-[11px] text-slate-400">已審核完成之正式參賽者，可指定種子序號</p>
                </div>
              </div>

              <div className="text-xs text-slate-400 font-medium">
                種子選手：
                <span className="text-purple-400 font-bold ml-1">
                  {approvedPlayers.filter((p) => p.isSeed).length} 位
                </span>
              </div>
            </div>

            {approvedPlayers.length === 0 ? (
              <div className="text-center py-12 px-4 text-slate-500 space-y-3">
                <Users className="w-12 h-12 mx-auto text-slate-600" />
                <p className="text-base font-bold text-slate-400">尚未有確認登記的正式參賽成員</p>
                <p className="text-xs max-w-sm mx-auto">
                  請審核左側待審核的 LINE 報名成員，或點擊「手動新增」/「一鍵填滿」快速載入選手！
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
                {approvedPlayers.map((player, index) => (
                  <div
                    key={player.id}
                    className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      player.isSeed
                        ? 'bg-purple-950/20 border-purple-500/40 shadow-sm'
                        : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
                    }`}
                  >
                    {/* Player Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0">
                        {index + 1}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-sm truncate">{player.name}</span>
                          {player.isSeed && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500 text-white shadow flex items-center gap-1 shrink-0">
                              <Shield className="w-3 h-3" />
                              第 {player.seedNumber || index + 1} 種子
                            </span>
                          )}
                          {player.lineId && (
                            <span className="text-[10px] text-emerald-400 font-mono">@{player.lineId}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span className="text-slate-300 font-medium">{player.beybladeName}</span>
                          <span>•</span>
                          <span>{player.clubOrTeam || '自由選手'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Attributes & Seed Controls */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {getAttributeBadge(player.beybladeType)}

                      {/* Seed Toggle button */}
                      <button
                        id={`btn-toggle-seed-${player.id}`}
                        onClick={() => {
                          const newIsSeed = !player.isSeed;
                          onSetSeedStatus(player.id, newIsSeed, newIsSeed ? index + 1 : undefined);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 ${
                          player.isSeed
                            ? 'bg-purple-600 text-white border-purple-500 shadow'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-purple-300'
                        }`}
                        title="切換是否為種子選手"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        {player.isSeed ? `種子 #${player.seedNumber || index + 1}` : '設為種子'}
                      </button>

                      {/* Edit button */}
                      <button
                        onClick={() => setEditingPlayer(player)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg border border-slate-700 transition-colors"
                        title="編輯資料"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete button */}
                      <button
                        onClick={() => onRemovePlayer(player.id)}
                        className="p-1.5 bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 rounded-lg border border-slate-700 transition-colors"
                        title="移除成員"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual Add Player Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-slate-100">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-400" />
              手動登記參賽成員
            </h3>
            <form onSubmit={handleCreateManual} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">選手名稱 *</label>
                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="選手姓名/稱呼"
                    required
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">LINE ID</label>
                  <input
                    type="text"
                    value={manualLineId}
                    onChange={(e) => setManualLineId(e.target.value)}
                    placeholder="LINE 帳號 (選填)"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">選擇使用陀螺</label>
                <select
                  value={manualBeyblade}
                  onChange={(e) => {
                    setManualBeyblade(e.target.value);
                    const b = POPULAR_BEYBLADES.find((item) => item.name === e.target.value);
                    if (b) {
                      setManualType(b.type);
                      setManualCombo(b.combo);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                >
                  {POPULAR_BEYBLADES.map((b) => (
                    <option key={b.name} value={b.name}>
                      {b.name} ({b.combo})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">陀螺屬性</label>
                  <select
                    value={manualType}
                    onChange={(e) => setManualType(e.target.value as BeybladeType)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                  >
                    <option value="attack">⚔️ 攻擊型 (Attack)</option>
                    <option value="defense">🛡️ 防禦型 (Defense)</option>
                    <option value="stamina">🔄 持久型 (Stamina)</option>
                    <option value="balance">⚖️ 平衡型 (Balance)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">所屬戰隊/俱樂部</label>
                  <input
                    type="text"
                    value={manualClub}
                    onChange={(e) => setManualClub(e.target.value)}
                    placeholder="例：Team Persona"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">指定為種子選手</div>
                  <div className="text-[11px] text-slate-400">安排在種子保護籤位</div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={manualIsSeed}
                    onChange={(e) => setManualIsSeed(e.target.checked)}
                    className="w-4 h-4 accent-purple-500 rounded"
                  />
                  {manualIsSeed && (
                    <input
                      type="number"
                      min={1}
                      max={targetSize}
                      value={manualSeedNum || 1}
                      onChange={(e) => setManualSeedNum(parseInt(e.target.value) || 1)}
                      className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                      placeholder="序號"
                    />
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
                >
                  完成新增
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Player Modal */}
      {editingPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-100">
            <h3 className="text-lg font-bold text-white mb-4">編輯選手資料</h3>
            <form onSubmit={handleUpdatePlayerSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">選手名稱</label>
                <input
                  type="text"
                  value={editingPlayer.name}
                  onChange={(e) => setEditingPlayer({ ...editingPlayer, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">陀螺名稱</label>
                <input
                  type="text"
                  value={editingPlayer.beybladeName}
                  onChange={(e) => setEditingPlayer({ ...editingPlayer, beybladeName: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">屬性</label>
                  <select
                    value={editingPlayer.beybladeType}
                    onChange={(e) => setEditingPlayer({ ...editingPlayer, beybladeType: e.target.value as BeybladeType })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                  >
                    <option value="attack">⚔️ 攻擊</option>
                    <option value="defense">🛡️ 防禦</option>
                    <option value="stamina">🔄 持久</option>
                    <option value="balance">⚖️ 平衡</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">戰隊/俱樂部</label>
                  <input
                    type="text"
                    value={editingPlayer.clubOrTeam || ''}
                    onChange={(e) => setEditingPlayer({ ...editingPlayer, clubOrTeam: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPlayer(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
                >
                  儲存變更
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
