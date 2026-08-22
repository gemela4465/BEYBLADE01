import React, { useState, useEffect } from 'react';
import { 
  Users, CheckCircle2, XCircle, Shield, Sparkles, Plus, Trash2, 
  Edit3, Shuffle, ArrowRight, Swords, AlertCircle, RefreshCw, UserCheck, Bell, UserPlus,
  Star, BookmarkPlus, Zap, Settings2, Check, ExternalLink, Lock, CheckCheck
} from 'lucide-react';
import { Player, Tournament, BeybladeType, VipPlayer } from '../types';
import { POPULAR_BEYBLADES, SAMPLE_PLAYERS } from '../data/beybladeData';
import { fetchVipPlayersApi, saveVipPlayerApi, deleteVipPlayerApi, importVipPlayersApi } from '../utils/api';

interface PlayerManagementProps {
  tournament: Tournament | null;
  onApprovePlayer: (playerId: string) => void;
  onRejectPlayer: (playerId: string) => void;
  onApproveAllPending: () => void;
  onAddPlayer: (playerData: Omit<Player, 'id' | 'status' | 'registeredAt'>, autoApprove?: boolean) => void;
  onRemovePlayer: (playerId: string) => void;
  onUpdatePlayer: (player: Player) => void;
  onToggleVip?: (player: Player) => void;
  onImportVip?: (vipIds?: string[]) => void;
  onGenerateBracket: () => void;
  onSetSeedStatus: (playerId: string, isSeed: boolean, seedNumber?: number) => void;
  onRandomizeSeeds: (seedCount: number) => void;
  onPopulateSamplePlayers?: (count: number) => void;
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
  onToggleVip,
  onImportVip,
  onGenerateBracket,
  onSetSeedStatus,
  onRandomizeSeeds,
  onPopulateSamplePlayers,
  onRefreshRoster
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showVipModal, setShowVipModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [vipList, setVipList] = useState<VipPlayer[]>([]);
  const [isImportingVip, setIsImportingVip] = useState(false);
  const [vipFeedback, setVipFeedback] = useState<string | null>(null);
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);

  // VIP Management Form State
  const [newVipName, setNewVipName] = useState('');
  const [newVipLineId, setNewVipLineId] = useState('');
  const [newVipBeyblade, setNewVipBeyblade] = useState(POPULAR_BEYBLADES[0].name);
  const [newVipType, setNewVipType] = useState<BeybladeType>('attack');
  const [newVipBlade, setNewVipBlade] = useState(POPULAR_BEYBLADES[0].combo);
  const [newVipClub, setNewVipClub] = useState('戰鬥陀螺菁英隊');
  const [newVipIsSeed, setNewVipIsSeed] = useState(false);

  // Fetch VIP list on mount and when modal opens
  const refreshVipList = async () => {
    const list = await fetchVipPlayersApi();
    setVipList(list);
  };

  useEffect(() => {
    refreshVipList();
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    if (onRefreshRoster) {
      onRefreshRoster();
    }
    refreshVipList();
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
  const [manualIsVip, setManualIsVip] = useState(false);
  const [seedCountToDraw, setSeedCountToDraw] = useState<number>(() =>
    tournament?.seedCount && tournament.seedCount > 0
      ? tournament.seedCount
      : Math.min(4, Math.max(2, Math.floor((tournament?.targetSize || 16) / 4)))
  );

  const isTournamentStarted = tournament?.status === 'in_progress';
  const isTournamentCompleted = tournament?.status === 'completed';

  // Strictly filter out any reserve players: only allow LINE participants and manually added participants
  // Requirement: 賽事完賽後 選手審核 的待審核報名列表 與 已登記參賽名單 全部清空
  const rawPlayers = isTournamentCompleted ? [] : (tournament?.players || []);
  const players = rawPlayers.filter((p) => !p.isReserve && !p.id.startsWith('player_reserve_'));
  const pendingPlayers = players.filter((p) => p.status === 'pending');
  const approvedPlayers = players.filter((p) => p.status === 'approved');
  const targetSize = tournament?.targetSize || 16;
  const isFull = approvedPlayers.length >= targetSize;

  const handleCreateManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (isTournamentCompleted) return;
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
        seedNumber: manualIsSeed ? manualSeedNum : undefined,
        isVip: manualIsVip
      },
      true // auto-approved since admin manually added
    );

    if (manualIsVip) {
      saveVipPlayerApi({
        name: manualName.trim(),
        lineId: manualLineId.trim() || undefined,
        beybladeName: manualBeyblade,
        beybladeType: manualType,
        blade: manualCombo,
        clubOrTeam: manualClub.trim() || '個人選手',
        isSeed: manualIsSeed
      }).then(() => refreshVipList());
    }

    setManualName('');
    setManualLineId('');
    setManualIsSeed(false);
    setManualSeedNum(undefined);
    setManualIsVip(false);
    setShowAddModal(false);
  };

  const handleUpdatePlayerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isTournamentCompleted) return;
    if (!editingPlayer) return;
    onUpdatePlayer(editingPlayer);
    setEditingPlayer(null);
  };

  // Toggle VIP directly on a player
  const handleToggleVipClick = async (player: Player) => {
    if (isTournamentCompleted) return;
    if (onToggleVip) {
      onToggleVip(player);
    } else {
      const newVip = !player.isVip;
      onUpdatePlayer({ ...player, isVip: newVip });
      if (newVip) {
        await saveVipPlayerApi({
          name: player.name,
          lineId: player.lineId,
          beybladeName: player.beybladeName,
          beybladeType: player.beybladeType,
          blade: player.blade,
          clubOrTeam: player.clubOrTeam,
          isSeed: player.isSeed
        });
      }
    }
    refreshVipList();
  };

  // Quick import all VIP players to pending queue
  const handleQuickImportVip = async () => {
    if (!tournament || isTournamentCompleted) return;
    setIsImportingVip(true);
    try {
      if (onImportVip) {
        await onImportVip();
      } else {
        const res = await importVipPlayersApi(tournament.id);
        if (res && res.addedCount > 0) {
          if (onRefreshRoster) onRefreshRoster();
        }
      }
      setVipFeedback(`已快速將優質選手加入待審核名單！`);
      setTimeout(() => setVipFeedback(null), 3500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsImportingVip(false);
    }
  };

  // Add a new VIP player to the global registry
  const handleCreateVipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVipName.trim()) return;

    await saveVipPlayerApi({
      name: newVipName.trim(),
      lineId: newVipLineId.trim() || undefined,
      beybladeName: newVipBeyblade,
      beybladeType: newVipType,
      blade: newVipBlade,
      clubOrTeam: newVipClub.trim() || '戰鬥陀螺菁英隊',
      isSeed: newVipIsSeed
    });

    setNewVipName('');
    setNewVipLineId('');
    setNewVipIsSeed(false);
    await refreshVipList();
    setVipFeedback(`成功將 ${newVipName.trim()} 登錄為優質選手！`);
    setTimeout(() => setVipFeedback(null), 3000);
  };

  // Delete a VIP player from global registry
  const handleDeleteVip = async (vipId: string, name: string) => {
    await deleteVipPlayerApi(vipId);
    await refreshVipList();
    setVipFeedback(`已將 ${name} 從優質選手清單移除`);
    setTimeout(() => setVipFeedback(null), 2500);
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
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#06C755]/20 text-[#06C755] border border-[#06C755]/30 flex items-center gap-1 font-mono">
              <Bell className="w-3 h-3" />
              LINE BOT 審核中心
            </span>
            <span className="text-xs text-slate-400 font-mono">
              預定賽制：{targetSize} 人雙翼對抗 • 開賽時間：{tournament?.startTime || '未設定'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            選手審核登記與種子排位管理
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            審核 LINE 群組送來的報名名單（支援 <code className="text-emerald-400 font-mono">+1</code> 與代報 <code className="text-purple-400 font-mono">++1 AAA</code>），通過後自動推播通知用戶！
          </p>
        </div>

        {/* Big Action: Generate Bracket (Requirement: 賽事開賽後 選手審核 的賽程產生 要鎖住) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <button
            id="btn-generate-bracket"
            onClick={onGenerateBracket}
            disabled={approvedPlayers.length < 2 || isTournamentStarted || isTournamentCompleted}
            className={`px-6 py-3.5 rounded-xl font-black text-sm shadow-xl flex items-center justify-center gap-2.5 transition-all ${
              isTournamentStarted
                ? 'bg-slate-800 text-amber-300/80 border border-amber-500/40 cursor-not-allowed shadow-none'
                : isTournamentCompleted
                ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed shadow-none'
                : approvedPlayers.length >= 2
                ? 'bg-gradient-to-r from-orange-500 via-red-500 to-rose-600 hover:from-orange-600 hover:to-rose-700 text-white shadow-orange-500/25 active:scale-95 animate-pulse'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
            title={
              isTournamentStarted
                ? '賽事已正式開賽，賽程籤位已鎖定不可重新產生，以維護賽事公正性'
                : isTournamentCompleted
                ? '賽事已完賽存檔，賽程已鎖定'
                : '審核通過選手後即可生成雙翼對稱賽程表'
            }
          >
            {isTournamentStarted ? (
              <>
                <Lock className="w-5 h-5 text-amber-400" />
                <span>🔒 賽事進行中（賽程籤位已鎖定）</span>
              </>
            ) : isTournamentCompleted ? (
              <>
                <CheckCheck className="w-5 h-5 text-slate-400" />
                <span>🏁 賽事已完賽存檔（賽程已鎖定）</span>
              </>
            ) : (
              <>
                <Swords className="w-5 h-5" />
                <span>
                  {approvedPlayers.length >= targetSize
                    ? '名額已滿！生成雙翼賽程表 ➔'
                    : approvedPlayers.length >= 2
                    ? `未滿員生成 (${approvedPlayers.length}/${targetSize}人，自動安排預備選手1~${targetSize - approvedPlayers.length}席) ➔`
                    : `審核通過至少 2 人即可生成賽程 (${approvedPlayers.length}/${targetSize}) ➔`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tournament Completed Banner if completed (Requirement: 賽事完賽後 選手審核清空) */}
      {isTournamentCompleted && (
        <div className="p-4 bg-gradient-to-r from-amber-950/30 via-slate-900 to-amber-950/30 border-2 border-amber-500/40 rounded-2xl flex items-center justify-between gap-3 text-amber-200 text-xs font-mono shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <CheckCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-amber-300 text-sm">本場賽事已圓滿完賽並存檔備查</div>
              <div className="text-slate-400 mt-0.5">待審核報名列表與已登記參賽名單已全數清空歸零，等候主辦方新增下一場新賽事。</div>
            </div>
          </div>
        </div>
      )}

      {/* VIP Feedback Alert if any */}
      {vipFeedback && (
        <div className="p-3 bg-amber-500/15 border border-amber-500/40 rounded-xl flex items-center justify-between text-amber-300 text-xs font-mono animate-fadeIn">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>{vipFeedback}</span>
          </div>
          <button onClick={() => setVipFeedback(null)} className="text-amber-400 hover:text-white font-bold">✕</button>
        </div>
      )}

      {/* Tools bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800 font-mono">
        <div className="flex items-center gap-2.5 flex-wrap text-xs text-slate-300">
          <span className="font-semibold text-white">⚡ 管理者快速工具：</span>
          
          {/* Quick Import VIPs button */}
          <button
            id="btn-quick-import-vip"
            onClick={handleQuickImportVip}
            disabled={isImportingVip || isTournamentStarted || isTournamentCompleted}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 ${
              isTournamentStarted || isTournamentCompleted
                ? 'bg-slate-800/50 text-slate-500 border border-slate-800 cursor-not-allowed'
                : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
            }`}
            title="將已儲存的優質選手快速帶入待審核清單"
          >
            <Star className={`w-3.5 h-3.5 text-amber-400 fill-amber-400 ${isImportingVip ? 'animate-spin' : ''}`} />
            快速產生優質選手至待審核 ({vipList.length}人)
          </button>

          {/* Manage VIP Pool modal button */}
          <button
            id="btn-manage-vip-pool"
            onClick={() => {
              refreshVipList();
              setShowVipModal(true);
            }}
            className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-lg font-medium transition-colors flex items-center gap-1.5"
          >
            <Settings2 className="w-3.5 h-3.5 text-purple-400" />
            管理優質選手名冊
          </button>

          {/* Seed Selection & Draw Tool (抽籤前可指定種子人數) */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700/80 rounded-lg p-1">
            <div className="flex items-center gap-1 pl-1 text-slate-300 text-xs font-semibold">
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">指定種子:</span>
              <span className="sm:hidden">種子:</span>
            </div>

            {/* Seed Count Dropdown Selector */}
            <select
              id="select-seed-count"
              value={seedCountToDraw}
              onChange={(e) => setSeedCountToDraw(Number(e.target.value))}
              disabled={isTournamentStarted || isTournamentCompleted}
              className="bg-slate-900 text-purple-300 font-bold border border-slate-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-purple-500 transition-colors cursor-pointer"
            >
              {[1, 2, 3, 4, 6, 8, 12, 16]
                .filter((n) => n <= targetSize)
                .map((n) => (
                  <option key={n} value={n}>
                    {n} 位種子
                  </option>
                ))}
            </select>

            {/* Stepper Buttons for fine-grained adjustment */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setSeedCountToDraw((prev) => Math.max(1, prev - 1))}
                disabled={isTournamentStarted || isTournamentCompleted || seedCountToDraw <= 1}
                className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs rounded-l border-y border-l border-slate-700 transition-colors"
                title="減少 1 位"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => setSeedCountToDraw((prev) => Math.min(targetSize, prev + 1))}
                disabled={isTournamentStarted || isTournamentCompleted || seedCountToDraw >= targetSize}
                className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs rounded-r border border-slate-700 transition-colors"
                title="增加 1 位"
              >
                +
              </button>
            </div>

            {/* Draw Seeds Action Button */}
            <button
              id="btn-random-seed"
              onClick={() => {
                if (approvedPlayers.length === 0) {
                  setVipFeedback('⚠️ 尚未有審核通過的參賽選手，請先審核通過選手後再進行抽籤');
                  setTimeout(() => setVipFeedback(null), 3500);
                  return;
                }
                const actualDrawCount = Math.min(seedCountToDraw, approvedPlayers.length);
                onRandomizeSeeds(actualDrawCount);
                setVipFeedback(`🎲 已隨機抽選出 ${actualDrawCount} 位種子選手（指定為第 1~${actualDrawCount} 種子）！`);
                setTimeout(() => setVipFeedback(null), 3500);
              }}
              disabled={isTournamentStarted || isTournamentCompleted}
              className={`px-3 py-1 rounded-md font-bold transition-all flex items-center gap-1.5 text-xs shadow-sm active:scale-95 ${
                isTournamentStarted || isTournamentCompleted
                  ? 'bg-slate-800 text-slate-500 border border-slate-800 cursor-not-allowed'
                  : approvedPlayers.length === 0
                  ? 'bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 border border-purple-800/50'
                  : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/20'
              }`}
              title={`隨機抽選 ${seedCountToDraw} 位種子選手`}
            >
              <Shuffle className="w-3.5 h-3.5 text-purple-200" />
              <span>抽籤種子</span>
            </button>
          </div>
        </div>

        <button
          id="btn-open-manual-add"
          disabled={isTournamentCompleted}
          onClick={() => setShowAddModal(true)}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            isTournamentCompleted
              ? 'bg-slate-800/50 text-slate-500 border border-slate-800 cursor-not-allowed'
              : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          手動新增參賽選手
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Pending Approval Queue from LINE (LINE 待審核選手列表) */}
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
                  <p className="text-[11px] text-slate-400">審核通過時將自動透過 LINE 發送通知給選手</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-manual-sync-players"
                  onClick={handleManualRefresh}
                  disabled={isRefreshing || isTournamentCompleted}
                  className={`p-1.5 rounded-lg border transition-all text-xs flex items-center gap-1 ${
                    isTournamentCompleted
                      ? 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                  title={isTournamentCompleted ? '賽事已完賽存檔' : '立即與伺服器重新同步名單'}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#00f2ff]' : ''}`} />
                  <span className="hidden sm:inline text-[11px]">同步名單</span>
                </button>

                {pendingPlayers.length > 0 && (
                  <button
                    id="btn-approve-all"
                    disabled={isTournamentCompleted}
                    onClick={onApproveAllPending}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow transition-all flex items-center gap-1 ${
                      isTournamentCompleted
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    一鍵全審核並推播
                  </button>
                )}
              </div>
            </div>

            {pendingPlayers.length === 0 ? (
              <div className="text-center py-10 px-4 text-slate-500 space-y-2 font-mono">
                <UserCheck className="w-10 h-10 mx-auto text-slate-600" />
                <p className="text-sm font-semibold text-slate-400">目前沒有待審核的 LINE 報名選手</p>
                <p className="text-xs">分享 LINE 邀請連結或群組指令 <code className="text-emerald-400">+1</code> 立即報名！</p>
                <button
                  disabled={isTournamentCompleted}
                  onClick={handleQuickImportVip}
                  className={`mt-3 px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                    isTournamentCompleted
                      ? 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                      : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  點此快速匯入優質選手
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 font-mono">
                {pendingPlayers.map((player) => (
                  <div
                    key={player.id}
                    className={`p-3.5 rounded-xl border transition-all space-y-2 ${
                      player.isVip 
                        ? 'bg-amber-950/20 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.06)]' 
                        : 'bg-slate-800/80 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-sm">{player.name}</span>
                          
                          {/* VIP Badge */}
                          {player.isVip && (
                            <span className="text-[10px] text-amber-300 bg-amber-950/80 border border-amber-600/60 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold shadow-sm">
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                              優質選手
                            </span>
                          )}

                          {player.isProxy && (
                            <span className="text-[10px] text-purple-300 bg-purple-950/70 border border-purple-800 px-1.5 py-0.5 rounded flex items-center gap-1 font-semibold">
                              <UserPlus className="w-3 h-3 text-purple-400" />
                              代報選手
                            </span>
                          )}
                          {player.lineId && (
                            <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800">
                              @{player.lineId}
                            </span>
                          )}
                        </div>
                        {player.registeredByLineId && player.registeredByLineId !== player.lineId && (
                          <div className="text-[10px] text-purple-300/80 mt-0.5">
                            由 LINE ID @{player.registeredByLineId} 替人代報
                          </div>
                        )}
                        <div className="text-xs text-slate-400 mt-0.5">{player.clubOrTeam || '自由選手'}</div>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        {/* Toggle VIP button */}
                        <button
                          id={`btn-toggle-vip-${player.id}`}
                          disabled={isTournamentCompleted}
                          onClick={() => handleToggleVipClick(player)}
                          className={`p-1.5 rounded-lg border text-xs transition-colors flex items-center ${
                            isTournamentCompleted
                              ? 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                              : player.isVip
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-amber-300 hover:border-amber-500/30'
                          }`}
                          title={isTournamentCompleted ? '賽事已結束' : player.isVip ? '取消優質選手標記' : '設為優質選手並儲存名冊'}
                        >
                          <Star className={`w-3.5 h-3.5 ${player.isVip ? 'text-amber-400 fill-amber-400' : ''}`} />
                        </button>

                        <button
                          id={`btn-approve-${player.id}`}
                          disabled={isTournamentCompleted}
                          onClick={() => onApprovePlayer(player.id)}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg shadow flex items-center gap-1 transition-colors ${
                            isTournamentCompleted
                              ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          }`}
                          title={isTournamentCompleted ? '賽事已結束' : '通過審核並向選手發送 LINE 通知'}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          審核通過
                        </button>
                        <button
                          id={`btn-reject-${player.id}`}
                          disabled={isTournamentCompleted}
                          onClick={() => onRejectPlayer(player.id)}
                          className={`p-1 rounded-lg transition-colors ${
                            isTournamentCompleted
                              ? 'bg-slate-900 text-slate-600 cursor-not-allowed'
                              : 'bg-slate-700 hover:bg-red-600/40 text-slate-400 hover:text-red-300'
                          }`}
                          title={isTournamentCompleted ? '賽事已結束' : '退回申請'}
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

        {/* Right: Approved Registered Member List & Seed Management (已確認參賽選手名單) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl font-mono">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-800 mb-4 gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold">
                  {approvedPlayers.length}
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">已登記參賽名單 ({approvedPlayers.length} / {targetSize})</h3>
                  <p className="text-[11px] text-slate-400">已審核完成之正式參賽選手，可指定種子序號或刪除選手</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                <div>
                  種子選手：
                  <span className="text-purple-400 font-bold ml-1">
                    {approvedPlayers.filter((p) => p.isSeed).length} 位
                  </span>
                </div>
                <div>
                  優質選手：
                  <span className="text-amber-400 font-bold ml-1">
                    {approvedPlayers.filter((p) => p.isVip).length} 位
                  </span>
                </div>
              </div>
            </div>

            {approvedPlayers.length === 0 ? (
              <div className="text-center py-12 px-4 text-slate-500 space-y-3">
                <Users className="w-12 h-12 mx-auto text-slate-600" />
                <p className="text-base font-bold text-slate-400">尚未有確認登記的正式參賽選手</p>
                <p className="text-xs max-w-sm mx-auto">
                  請審核左側待審核的 LINE 報名選手，或點擊「手動新增參賽選手」/「快速產生優質選手」快速載入選手！
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
                {approvedPlayers.map((player, index) => (
                  <div
                    key={player.id}
                    className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      player.pendingCancelConfirm
                        ? 'bg-amber-950/30 border-amber-500/50 shadow-sm'
                        : player.isVip
                        ? 'bg-amber-950/15 border-amber-500/35 shadow-sm'
                        : player.isSeed
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
                          
                          {/* VIP Badge */}
                          {player.isVip && (
                            <span className="text-[10px] text-amber-300 bg-amber-950/80 border border-amber-600/60 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold">
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                              優質選手
                            </span>
                          )}

                          {player.isProxy && (
                            <span className="text-[10px] text-purple-300 bg-purple-950/70 border border-purple-800 px-1.5 py-0.5 rounded">
                              代報
                            </span>
                          )}
                          {player.pendingCancelConfirm && (
                            <span className="text-[10px] text-amber-300 bg-amber-950/80 border border-amber-700 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold">
                              <AlertCircle className="w-3 h-3 text-amber-400" />
                              LINE 提出取消確認中
                            </span>
                          )}
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

                    {/* Right Attributes & Controls */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {getAttributeBadge(player.beybladeType)}

                      {/* VIP Toggle button */}
                      <button
                        id={`btn-vip-approved-${player.id}`}
                        disabled={isTournamentCompleted}
                        onClick={() => handleToggleVipClick(player)}
                        className={`px-2 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 ${
                          isTournamentCompleted
                            ? 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                            : player.isVip
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-amber-300 hover:border-amber-500/30'
                        }`}
                        title={isTournamentCompleted ? '賽事已結束' : player.isVip ? '取消優質選手' : '設為優質選手'}
                      >
                        <Star className={`w-3.5 h-3.5 ${player.isVip ? 'text-amber-400 fill-amber-400' : ''}`} />
                        <span className="hidden sm:inline">{player.isVip ? '優質' : '設優質'}</span>
                      </button>

                      {/* Seed Toggle button */}
                      <button
                        id={`btn-toggle-seed-${player.id}`}
                        disabled={tournament?.status === 'in_progress' || tournament?.status === 'completed'}
                        onClick={() => {
                          const newIsSeed = !player.isSeed;
                          onSetSeedStatus(player.id, newIsSeed, newIsSeed ? index + 1 : undefined);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 ${
                          player.isSeed
                            ? 'bg-purple-600 text-white border-purple-500 shadow'
                            : tournament?.status === 'in_progress' || tournament?.status === 'completed'
                            ? 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed opacity-50'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-purple-300'
                        }`}
                        title={
                          tournament?.status === 'in_progress'
                            ? '賽事進行中，已排定種子不可修改'
                            : tournament?.status === 'completed'
                            ? '賽事已完賽存檔'
                            : '切換是否為種子選手'
                        }
                      >
                        <Shield className="w-3.5 h-3.5" />
                        {player.isSeed ? `種子 #${player.seedNumber || index + 1}` : '設種子'}
                      </button>

                      {/* Edit button */}
                      <button
                        id={`btn-edit-player-${player.id}`}
                        disabled={isTournamentCompleted}
                        onClick={() => setEditingPlayer(player)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          isTournamentCompleted
                            ? 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border-slate-700'
                        }`}
                        title={isTournamentCompleted ? '賽事已結束' : '編輯資料'}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete button (Direct & with confirmation state - Restricted when tournament is in_progress) */}
                      <button
                        id={`btn-delete-player-${player.id}`}
                        disabled={tournament?.status === 'in_progress' || tournament?.status === 'completed'}
                        onClick={() => setPlayerToDelete(player)}
                        className={`p-1.5 rounded-lg border transition-all shadow-sm active:scale-95 ${
                          tournament?.status === 'in_progress' || tournament?.status === 'completed'
                            ? 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed opacity-40'
                            : 'bg-rose-950/30 hover:bg-rose-600 text-rose-400 hover:text-white border-rose-800/60 hover:border-rose-500'
                        }`}
                        title={
                          tournament?.status === 'in_progress'
                            ? '開賽後不允許刪除已參賽選手（但仍可新增敗部復活選手）'
                            : tournament?.status === 'completed'
                            ? '賽程已結束存檔，不可刪除選手'
                            : '刪除選手'
                        }
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

      {/* Delete Confirmation Modal */}
      {playerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 bg-rose-500/20 rounded-xl border border-rose-500/30">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">確認刪除參賽選手</h3>
                <p className="text-xs text-slate-400">從本場已登記參賽名單中移除</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700 font-mono space-y-1">
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>{playerToDelete.name}</span>
                {playerToDelete.lineId && <span className="text-xs text-emerald-400">@{playerToDelete.lineId}</span>}
              </div>
              <div className="text-xs text-slate-400">陀螺：{playerToDelete.beybladeName} ({playerToDelete.blade || '標準'})</div>
            </div>

            {/* Notification when bracket is already generated but tournament not started */}
            {tournament?.matches && tournament.matches.length > 0 && tournament?.status !== 'in_progress' && (
              <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl text-xs font-mono text-amber-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  已產生賽程之自動遞補提示：
                </div>
                <p className="text-amber-200/90 leading-relaxed">
                  目前賽程已排定（未開賽）。刪除此選手後，系統將自動將其籤位調整為<span className="text-cyan-300 font-bold">「預備選手」</span>以維持籤表完整性。您亦可於賽程表點擊「重新產生賽程」。
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPlayerToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                取消
              </button>
              <button
                type="button"
                id="btn-confirm-delete-player"
                onClick={() => {
                  onRemovePlayer(playerToDelete.id);
                  setPlayerToDelete(null);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIP Registry Management Modal (優質選手名冊管理) */}
      {showVipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Star className="w-5 h-5 fill-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">優質選手名冊管理 (VIP Registry)</h3>
                  <p className="text-xs text-slate-400">
                    若選手透過 LINE 重新報名，系統將以 LINE 報名的簡稱為主並自動更新此名冊
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowVipModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Quick Action: Import all to tournament */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-amber-950/20 border border-amber-500/30 rounded-xl">
              <div className="text-xs text-amber-200">
                <span className="font-bold">現有已登錄優質選手：</span> {vipList.length} 位
              </div>
              <button
                onClick={() => {
                  handleQuickImportVip();
                  setShowVipModal(false);
                }}
                disabled={vipList.length === 0 || isImportingVip}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Zap className="w-3.5 h-3.5 fill-slate-950" />
                全部快速匯入待審核名單 ➔
              </button>
            </div>

            {/* VIP List Grid */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">已儲存之優質選手清單</h4>
              {vipList.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs font-mono bg-slate-800/40 rounded-xl">
                  目前名冊中尚未有優質選手，請在下方新增或於選手名單點擊「設為優質」
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {vipList.map((vip) => (
                    <div
                      key={vip.id}
                      className="p-3 bg-slate-800/90 rounded-xl border border-slate-700 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                          <span className="font-bold text-white text-xs truncate">{vip.name}</span>
                          {vip.lineId && (
                            <span className="text-[10px] text-emerald-400 font-mono truncate">@{vip.lineId}</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {vip.beybladeName} • {vip.clubOrTeam || '菁英戰隊'}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteVip(vip.id, vip.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-950/40 transition-colors shrink-0"
                        title="從優質選手名冊刪除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New VIP Form */}
            <form onSubmit={handleCreateVipSubmit} className="p-4 bg-slate-800/60 border border-slate-700/80 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                新增優質選手至永久名冊
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">選手姓名/簡稱 *</label>
                  <input
                    type="text"
                    value={newVipName}
                    onChange={(e) => setNewVipName(e.target.value)}
                    placeholder="例：戰鬥蒼鷹"
                    required
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">LINE 帳號 (選填)</label>
                  <input
                    type="text"
                    value={newVipLineId}
                    onChange={(e) => setNewVipLineId(e.target.value)}
                    placeholder="LINE ID"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">主要使用陀螺</label>
                  <select
                    value={newVipBeyblade}
                    onChange={(e) => {
                      setNewVipBeyblade(e.target.value);
                      const b = POPULAR_BEYBLADES.find((item) => item.name === e.target.value);
                      if (b) {
                        setNewVipType(b.type);
                        setNewVipBlade(b.combo);
                      }
                    }}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs"
                  >
                    {POPULAR_BEYBLADES.map((b) => (
                      <option key={b.name} value={b.name}>{b.name} ({b.combo})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">所屬戰隊/俱樂部</label>
                  <input
                    type="text"
                    value={newVipClub}
                    onChange={(e) => setNewVipClub(e.target.value)}
                    placeholder="例：戰鬥陀螺菁英隊"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newVipIsSeed}
                    onChange={(e) => setNewVipIsSeed(e.target.checked)}
                    className="w-4 h-4 accent-purple-500 rounded"
                  />
                  預設指定為種子選手
                </label>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  加入名冊
                </button>
              </div>
            </form>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowVipModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Player Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-slate-100">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-400" />
              手動登記參賽選手
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-amber-300 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400" />
                      設為優質選手
                    </div>
                    <div className="text-[11px] text-slate-400">同步儲存至常駐名冊</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={manualIsVip}
                    onChange={(e) => setManualIsVip(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
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

              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-400" />
                    標記為優質選手
                  </div>
                  <div className="text-[11px] text-slate-400">保留在常駐優質選手名冊中</div>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(editingPlayer.isVip)}
                  onChange={(e) => setEditingPlayer({ ...editingPlayer, isVip: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 rounded"
                />
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
