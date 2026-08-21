import React, { useState, useEffect, useRef } from 'react';
import { 
  Tournament, Player, Match, TournamentSize, BattleRoundRecord, BeybladeType 
} from './types';
import { SAMPLE_PLAYERS, POPULAR_BEYBLADES } from './data/beybladeData';
import { generateDualWingBracket, recordMatchResult } from './utils/bracketGenerator';
import { 
  loadInitialTournament, 
  saveTournamentToStore, 
  buildRegistrationUrl, 
  buildAdminUrl, 
  buildReadOnlyBracketUrl,
  parseTournamentSessionFromUrl 
} from './utils/sessionHelper';
import {
  fetchTournamentApi,
  saveTournamentApi,
  registerPlayerApi,
  updatePlayerStatusApi,
  setActiveTournamentApi,
  approveAllPlayersApi,
  broadcastOpenTournamentApi,
  resetTournamentApi,
  archiveTournamentApi
} from './utils/api';
import { Header } from './components/Header';
import { DualWingBracket } from './components/DualWingBracket';
import { PlayerManagement } from './components/PlayerManagement';
import { LineInviteView } from './components/LineInviteView';
import { MatchRefereeModal } from './components/MatchRefereeModal';
import { PodiumRankings } from './components/PodiumRankings';
import { ScoreboardDisplay } from './components/ScoreboardDisplay';
import { CreateTournamentModal } from './components/CreateTournamentModal';
import { ExportShareModal } from './components/ExportShareModal';
import { ResetTournamentModal } from './components/ResetTournamentModal';
import { TournamentHistoryModal } from './components/TournamentHistoryModal';
import { BroadcastAnnouncementModal } from './components/BroadcastAnnouncementModal';
import { SpectatorLiveBracketView } from './components/SpectatorLiveBracketView';
import { Trophy, Swords, Users, Shield, Plus, Sparkles } from 'lucide-react';

export default function App() {
  const initial = loadInitialTournament();
  const [tournament, setTournament] = useState<Tournament | null>(initial.tournament);
  const [isLineOnlyMode, setIsLineOnlyMode] = useState<boolean>(initial.isRegisterMode);
  const [isViewOnlyModeState, setIsViewOnlyModeState] = useState<boolean>(initial.isViewOnlyMode);

  const [activeTab, setActiveTab] = useState<'bracket' | 'players' | 'line-invite' | 'scoreboard' | 'podium'>('bracket');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const isSyncingRef = useRef(false);

  // Sync with server on initial mount
  useEffect(() => {
    if (tournament?.id) {
      fetchTournamentApi(tournament.id).then((serverTour) => {
        if (serverTour) {
          setTournament(serverTour);
          saveTournamentToStore(serverTour);
          setActiveTournamentApi(serverTour.id);
        } else {
          // If not on server, save current state to server
          saveTournamentApi(tournament);
          setActiveTournamentApi(tournament.id);
        }
      });
    }
  }, []);

  // Background polling for real-time registrations from LINE on any device
  useEffect(() => {
    if (!tournament?.id) return;

    const interval = setInterval(async () => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      try {
        const serverTour = await fetchTournamentApi(tournament.id);
        if (serverTour && serverTour.id === tournament.id) {
          // Check if players count or player status changed
          const localPlayersJson = JSON.stringify(tournament.players);
          const serverPlayersJson = JSON.stringify(serverTour.players);

          if (localPlayersJson !== serverPlayersJson) {
            console.log('[Real-time Sync] Detected updated registrations from server!');
            setTournament((prev) => {
              if (!prev || prev.id !== serverTour.id) return prev;
              const merged: Tournament = {
                ...prev,
                players: serverTour.players,
                // keep local matches if currently playing match, otherwise take server matches
                matches: prev.matches.length > 0 ? prev.matches : serverTour.matches
              };
              saveTournamentToStore(merged);
              return merged;
            });
          }
        }
      } catch (err) {
        console.warn('[Sync Error]', err);
      } finally {
        isSyncingRef.current = false;
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [tournament?.id, tournament?.players]);

  // Listen to popstate / url changes and reload matching session if changed
  useEffect(() => {
    const handleLocationChange = () => {
      const urlSession = parseTournamentSessionFromUrl();
      setIsLineOnlyMode(urlSession.isRegisterMode);
      setIsViewOnlyModeState(urlSession.isViewOnlyMode);
      if (urlSession.tid && (!tournament || tournament.id !== urlSession.tid)) {
        const loaded = loadInitialTournament();
        setTournament(loaded.tournament);
        if (loaded.tournament.id) {
          fetchTournamentApi(loaded.tournament.id).then((res) => {
            if (res) {
              setTournament(res);
              saveTournamentToStore(res);
              setActiveTournamentApi(res.id);
            }
          });
        }
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, [tournament]);

  // Save to multi-session storage whenever tournament changes
  useEffect(() => {
    if (tournament) {
      saveTournamentToStore(tournament);
    }
  }, [tournament]);

  // Create a new tournament with full metadata (Requirement 1, 1.1)
  const handleCreateTournament = async (config: {
    name: string;
    datePrefix?: string;
    sessionNumber?: string;
    customTitle?: string;
    startTime?: string;
    registrationDeadline?: string;
    targetSize: TournamentSize;
    targetScore: number;
    seedMode: 'none' | 'manual' | 'random';
    seedCount: number;
    populateSamplePlayers: boolean;
    broadcastToLine?: boolean;
  }) => {
    let initialPlayers: Player[] = [];

    if (config.populateSamplePlayers) {
      // Build sample players matching the target size
      initialPlayers = Array.from({ length: config.targetSize }, (_, idx) => {
        const sample = SAMPLE_PLAYERS[idx % SAMPLE_PLAYERS.length];
        const isSeed = config.seedMode !== 'none' && idx < config.seedCount;
        const b = POPULAR_BEYBLADES[idx % POPULAR_BEYBLADES.length];
        return {
          id: `player_${idx + 1}_${Date.now()}`,
          name: idx < SAMPLE_PLAYERS.length ? sample.name : `陀螺戰士 #${idx + 1} (${sample.name.split(' ')[0]})`,
          lineId: sample.lineId ? `${sample.lineId}_${idx + 1}` : undefined,
          beybladeName: b.name,
          beybladeType: b.type,
          blade: b.combo,
          clubOrTeam: sample.clubOrTeam || '戰鬥陀螺交流群',
          status: 'approved' as const,
          registeredAt: Date.now() - (config.targetSize - idx) * 60000,
          isSeed,
          seedNumber: isSeed ? idx + 1 : undefined
        };
      });
    }

    const newTournament = generateDualWingBracket(
      config.name,
      config.targetSize,
      initialPlayers,
      config.seedMode,
      config.seedCount,
      config.targetScore
    );

    // Attach extended tournament metadata (Requirements 1 & 1.1)
    newTournament.datePrefix = config.datePrefix;
    newTournament.sessionNumber = config.sessionNumber;
    newTournament.customTitle = config.customTitle;
    newTournament.startTime = config.startTime;
    newTournament.registrationDeadline = config.registrationDeadline;

    saveTournamentToStore(newTournament);
    await saveTournamentApi(newTournament);
    await setActiveTournamentApi(newTournament.id);
    
    // Automatically broadcast open tournament announcement to LINE group & followers if requested
    if (config.broadcastToLine !== false) {
      await broadcastOpenTournamentApi(newTournament.id);
    }

    setTournament(newTournament);
    setActiveTab('bracket');

    // Update URL to point to this new tournament session
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.origin + window.location.pathname);
      url.searchParams.set('tid', newTournament.id);
      window.history.pushState({}, '', url.toString());
    }
  };

  // Reset / Cancel Tournament before match (Requirement 7)
  const handleResetTournament = async (options: {
    keepApproved: boolean;
    newSessionNumber?: string;
    newCustomTitle?: string;
    newStartTime?: string;
    newDeadline?: string;
  }) => {
    if (!tournament) return;
    const res = await resetTournamentApi(tournament.id, options);
    if (res.success && res.tournament) {
      setTournament(res.tournament);
      saveTournamentToStore(res.tournament);
      await setActiveTournamentApi(res.tournament.id);
    } else {
      // Local fallback reset
      const keptPlayers = options.keepApproved
        ? tournament.players.filter((p) => p.status === 'approved')
        : [];
      
      const resetTour = generateDualWingBracket(
        options.newCustomTitle ? `${tournament.datePrefix || ''}-${options.newSessionNumber || ''}-${options.newCustomTitle}` : tournament.name,
        tournament.targetSize,
        keptPlayers,
        tournament.seedMode,
        tournament.seedCount,
        tournament.matchTargetScore
      );
      resetTour.sessionNumber = options.newSessionNumber || tournament.sessionNumber;
      resetTour.customTitle = options.newCustomTitle || tournament.customTitle;
      resetTour.startTime = options.newStartTime || tournament.startTime;
      resetTour.registrationDeadline = options.newDeadline || tournament.registrationDeadline;
      
      setTournament(resetTour);
      saveTournamentToStore(resetTour);
      saveTournamentApi(resetTour);
      setActiveTournamentApi(resetTour.id);
    }
    setActiveTab('players');
  };

  // Register a player from LINE Portal (defaults to 'pending' for organizer review)
  const handleRegisterFromLine = async (playerData: Omit<Player, 'id' | 'status' | 'registeredAt'>) => {
    if (!tournament) return;

    const fallbackPlayer: Player = {
      ...playerData,
      id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      status: 'pending',
      registeredAt: Date.now()
    };

    // Optimistically update local state
    setTournament((prev) => {
      if (!prev) return null;
      const updated = {
        ...prev,
        players: [...prev.players, fallbackPlayer]
      };
      saveTournamentToStore(updated);
      return updated;
    });

    // Send to backend API so the host and other participants immediately receive it
    const res = await registerPlayerApi(tournament.id, playerData, tournament);
    if (res && res.tournament) {
      setTournament(res.tournament);
      saveTournamentToStore(res.tournament);
    }
  };

  // Organizer approves a player (triggers LINE push notification to player & group)
  const handleApprovePlayer = async (playerId: string) => {
    if (!tournament) return;
    const updatedPlayers = tournament.players.map((p) => (p.id === playerId ? { ...p, status: 'approved' as const, notificationSent: true } : p));
    const updatedTour: Tournament = {
      ...tournament,
      players: updatedPlayers
    };
    setTournament(updatedTour);
    saveTournamentToStore(updatedTour);

    // Call server API which triggers LINE notification (Requirement 5)
    await updatePlayerStatusApi(tournament.id, playerId, {
      status: 'approved',
      sendLineNotification: true
    });
  };

  // Organizer rejects a player
  const handleRejectPlayer = async (playerId: string) => {
    if (!tournament) return;
    const updatedPlayers = tournament.players.filter((p) => p.id !== playerId);
    const updatedTour: Tournament = {
      ...tournament,
      players: updatedPlayers
    };
    setTournament(updatedTour);
    saveTournamentToStore(updatedTour);
    await updatePlayerStatusApi(tournament.id, playerId, {
      status: 'rejected',
      sendLineNotification: false
    });
  };

  // Approve all pending players (Requirement 5 batch approval)
  const handleApproveAllPending = async () => {
    if (!tournament) return;
    const res = await approveAllPlayersApi(tournament.id);
    if (res && res.tournament) {
      setTournament(res.tournament);
      saveTournamentToStore(res.tournament);
    } else {
      const updatedPlayers = tournament.players.map((p) => ({ ...p, status: 'approved' as const, notificationSent: true }));
      const updatedTour: Tournament = {
        ...tournament,
        players: updatedPlayers
      };
      setTournament(updatedTour);
      saveTournamentToStore(updatedTour);
      saveTournamentApi(updatedTour);
    }
  };

  // Add a player directly (e.g. from Admin manual modal)
  const handleAddPlayer = (playerData: Omit<Player, 'id' | 'status' | 'registeredAt'>, autoApprove = true) => {
    if (!tournament) return;

    const newPlayer: Player = {
      ...playerData,
      id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      status: autoApprove ? 'approved' : 'pending',
      registeredAt: Date.now()
    };

    const updatedTour: Tournament = {
      ...tournament,
      players: [...tournament.players, newPlayer]
    };
    setTournament(updatedTour);
    saveTournamentToStore(updatedTour);
    saveTournamentApi(updatedTour);
  };

  // Remove player
  const handleRemovePlayer = (playerId: string) => {
    if (!tournament) return;
    const updatedTour: Tournament = {
      ...tournament,
      players: tournament.players.filter((p) => p.id !== playerId)
    };
    setTournament(updatedTour);
    saveTournamentToStore(updatedTour);
    saveTournamentApi(updatedTour);
  };

  // Update player
  const handleUpdatePlayer = (updatedPlayer: Player) => {
    if (!tournament) return;
    const updatedTour: Tournament = {
      ...tournament,
      players: tournament.players.map((p) => (p.id === updatedPlayer.id ? updatedPlayer : p))
    };
    setTournament(updatedTour);
    saveTournamentToStore(updatedTour);
    saveTournamentApi(updatedTour);
  };

  // Seed toggling
  const handleSetSeedStatus = (playerId: string, isSeed: boolean, seedNumber?: number) => {
    if (!tournament) return;
    const updatedTour: Tournament = {
      ...tournament,
      players: tournament.players.map((p) =>
        p.id === playerId ? { ...p, isSeed, seedNumber: isSeed ? seedNumber : undefined } : p
      )
    };
    setTournament(updatedTour);
    saveTournamentToStore(updatedTour);
    saveTournamentApi(updatedTour);
  };

  // Randomize seeds among approved players
  const handleRandomizeSeeds = (seedCount: number) => {
    if (!tournament) return;
    const approved = tournament.players.filter((p) => p.status === 'approved');
    const shuffled = [...approved].sort(() => Math.random() - 0.5);

    const updatedMap = new Map<string, { isSeed: boolean; seedNumber?: number }>();
    shuffled.forEach((p, idx) => {
      if (idx < seedCount) {
        updatedMap.set(p.id, { isSeed: true, seedNumber: idx + 1 });
      } else {
        updatedMap.set(p.id, { isSeed: false, seedNumber: undefined });
      }
    });

    const updatedTour: Tournament = {
      ...tournament,
      seedMode: 'random',
      seedCount,
      players: tournament.players.map((p) => {
        const update = updatedMap.get(p.id);
        return update ? { ...p, ...update } : p;
      })
    };
    setTournament(updatedTour);
    saveTournamentToStore(updatedTour);
    saveTournamentApi(updatedTour);
  };

  // Quick populate sample players for specific count
  const handlePopulateSamplePlayers = (count: number) => {
    if (!tournament) return;
    const newPlayers: Player[] = Array.from({ length: count }, (_, idx) => {
      const sample = SAMPLE_PLAYERS[idx % SAMPLE_PLAYERS.length];
      const isSeed = idx < Math.min(4, count / 2);
      const b = POPULAR_BEYBLADES[idx % POPULAR_BEYBLADES.length];
      return {
        id: `player_sample_${idx + 1}_${Date.now()}`,
        name: idx < SAMPLE_PLAYERS.length ? sample.name : `陀螺戰士 #${idx + 1} (${sample.name.split(' ')[0]})`,
        lineId: sample.lineId ? `${sample.lineId}_${idx + 1}` : undefined,
        beybladeName: b.name,
        beybladeType: b.type,
        blade: b.combo,
        clubOrTeam: sample.clubOrTeam || '戰鬥陀螺菁英會',
        status: 'approved',
        registeredAt: Date.now() - (count - idx) * 30000,
        isSeed,
        seedNumber: isSeed ? idx + 1 : undefined
      };
    });

    const updatedTour: Tournament = {
      ...tournament,
      players: newPlayers
    };
    setTournament(updatedTour);
    saveTournamentToStore(updatedTour);
    saveTournamentApi(updatedTour);
  };

  // Re-generate Dual-Wing Bracket based on approved players
  const handleGenerateBracket = () => {
    if (!tournament) return;
    const newTournament = generateDualWingBracket(
      tournament.name,
      tournament.targetSize,
      tournament.players,
      tournament.seedMode,
      tournament.seedCount,
      tournament.matchTargetScore
    );
    newTournament.datePrefix = tournament.datePrefix;
    newTournament.sessionNumber = tournament.sessionNumber;
    newTournament.customTitle = tournament.customTitle;
    newTournament.startTime = tournament.startTime;
    newTournament.registrationDeadline = tournament.registrationDeadline;

    setTournament(newTournament);
    saveTournamentToStore(newTournament);
    saveTournamentApi(newTournament);
    setActiveTab('bracket');
  };

  // Record a match result (scores 0-11) and advance winner
  const handleSaveMatchResult = (
    matchId: string,
    p1Score: number,
    p2Score: number,
    roundsHistory: BattleRoundRecord[]
  ) => {
    if (!tournament) return;
    const updated = recordMatchResult(tournament, matchId, p1Score, p2Score, roundsHistory);
    setTournament(updated);
    saveTournamentToStore(updated);
    saveTournamentApi(updated);

    // If tournament completed, jump to podium
    if (updated.status === 'completed' && updated.rankings?.champion) {
      setActiveTab('podium');
    }
  };

  const pendingCount = tournament?.players.filter((p) => p.status === 'pending').length || 0;
  const approvedCount = tournament?.players.filter((p) => p.status === 'approved').length || 0;

  // Handle switching between admin mode and pure registration mode / spectator mode
  const handleSwitchToAdmin = () => {
    setIsLineOnlyMode(false);
    setIsViewOnlyModeState(false);
    if (tournament) {
      const adminUrl = buildAdminUrl(tournament);
      window.history.pushState({}, '', adminUrl);
    } else {
      const url = new URL(window.location.href);
      url.searchParams.delete('mode');
      url.searchParams.delete('invite');
      window.history.pushState({}, '', url.toString());
    }
  };

  const handleSwitchToLineMode = () => {
    setIsLineOnlyMode(true);
    setIsViewOnlyModeState(false);
    if (tournament) {
      const regUrl = buildRegistrationUrl(tournament);
      window.history.pushState({}, '', regUrl);
    } else {
      const url = new URL(window.location.href);
      url.searchParams.set('mode', 'register');
      window.history.pushState({}, '', url.toString());
    }
  };

  const handleSwitchToSpectatorMode = () => {
    setIsViewOnlyModeState(true);
    setIsLineOnlyMode(false);
    if (tournament) {
      const viewUrl = buildReadOnlyBracketUrl(tournament);
      window.history.pushState({}, '', viewUrl);
    } else {
      const url = new URL(window.location.href);
      url.searchParams.set('mode', 'view');
      window.history.pushState({}, '', url.toString());
    }
  };

  // 1. Pure Read-Only Spectator Live Bracket View (單獨網頁，不可修改戰績，數據即時自動更新)
  if (isViewOnlyModeState && tournament) {
    return (
      <SpectatorLiveBracketView
        initialTournament={tournament}
        onSwitchToAdmin={handleSwitchToAdmin}
      />
    );
  }

  // 2. Pure LINE Registration view (只顯示場次與登記內容，其他完全不顯示)
  if (isLineOnlyMode) {
    return (
      <div className="min-h-screen bg-[#05070a] text-[#e0e6ed] flex flex-col font-sans selection:bg-[#00f2ff] selection:text-black relative overflow-x-hidden">
        {/* Ambient background */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-0 left-1/3 w-96 h-96 bg-[#00f2ff]/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-[#06C755]/5 rounded-full blur-3xl" />
          <div className="absolute inset-0 cyber-grid-bg opacity-25" />
        </div>

        <main className="flex-1 py-4 sm:py-6 relative z-10">
          <LineInviteView
            tournament={tournament}
            onRegisterPlayer={handleRegisterFromLine}
            pendingCount={pendingCount}
            approvedCount={approvedCount}
            isStandaloneMode={true}
            onSwitchToAdmin={handleSwitchToAdmin}
          />
        </main>

        <footer className="py-4 text-center text-xs font-mono text-gray-500 border-t border-[#ffffff0a] relative z-10">
          <span>戰鬥陀螺 X 雙翼爭霸賽 • LINE 賽事登記系統</span>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070a] text-[#e0e6ed] flex flex-col font-sans selection:bg-[#00f2ff] selection:text-black relative overflow-x-hidden">
      {/* Immersive background aura */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#00f2ff]/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-[#7000ff]/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 cyber-grid-bg opacity-30" />
      </div>

      {/* Top Navigation & Status Bar */}
      <Header
        tournament={tournament}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenHistoryModal={() => setIsHistoryModalOpen(true)}
        onOpenResetModal={() => setIsResetModalOpen(true)}
        onOpenBroadcastModal={() => setIsBroadcastModalOpen(true)}
        onToggleLineOnlyMode={handleSwitchToLineMode}
        onToggleSpectatorMode={handleSwitchToSpectatorMode}
        pendingCount={pendingCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 py-6 relative z-10">
        {tournament && (
          <>
            {activeTab === 'bracket' && (
              <DualWingBracket
                tournament={tournament}
                onSelectMatch={(m) => setSelectedMatch(m)}
                onOpenCreateModal={() => setIsCreateModalOpen(true)}
              />
            )}

            {activeTab === 'players' && (
              <PlayerManagement
                tournament={tournament}
                onApprovePlayer={handleApprovePlayer}
                onRejectPlayer={handleRejectPlayer}
                onApproveAllPending={handleApproveAllPending}
                onAddPlayer={handleAddPlayer}
                onRemovePlayer={handleRemovePlayer}
                onUpdatePlayer={handleUpdatePlayer}
                onGenerateBracket={handleGenerateBracket}
                onSetSeedStatus={handleSetSeedStatus}
                onRandomizeSeeds={handleRandomizeSeeds}
                onPopulateSamplePlayers={handlePopulateSamplePlayers}
                onRefreshRoster={async () => {
                  if (tournament?.id) {
                    const res = await fetchTournamentApi(tournament.id);
                    if (res) {
                      setTournament(res);
                      saveTournamentToStore(res);
                    }
                  }
                }}
              />
            )}

            {activeTab === 'line-invite' && (
              <LineInviteView
                tournament={tournament}
                onRegisterPlayer={handleRegisterFromLine}
                pendingCount={pendingCount}
                approvedCount={approvedCount}
                isStandaloneMode={false}
              />
            )}

            {activeTab === 'scoreboard' && (
              <ScoreboardDisplay
                tournament={tournament}
                onSelectMatch={(m) => setSelectedMatch(m)}
                onQuickScore={(matchId, p1, p2) => handleSaveMatchResult(matchId, p1, p2, [])}
              />
            )}

            {activeTab === 'podium' && (
              <PodiumRankings
                tournament={tournament}
                onSelectMatchById={(matchId) => {
                  const m = tournament.matches.find((item) => item.id === matchId);
                  if (m) setSelectedMatch(m);
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Immersive HUD Footer */}
      <footer className="bg-[#0a0c12]/90 border-t border-[#ffffff10] text-[#717b8c] text-[11px] py-3 px-4 sm:px-8 relative z-10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-3 font-mono">
            <span className="flex items-center gap-1.5 text-green-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
              ARENA ONLINE
            </span>
            <span>•</span>
            <span>BEYBLADE X DUAL-WING ENGINE</span>
            <span>•</span>
            <span className="text-gray-400">LATENCY: 12ms</span>
          </div>
          <div className="font-mono text-gray-500">
            SYSTEM 0-11 PTS MATCH TRACKER • LINE INVITATION INTEGRATION
          </div>
        </div>
      </footer>

      {/* Match Referee Scoring Modal (0 - 11 分) */}
      <MatchRefereeModal
        match={selectedMatch}
        players={tournament?.players || []}
        isOpen={Boolean(selectedMatch)}
        onClose={() => setSelectedMatch(null)}
        onSaveMatchResult={handleSaveMatchResult}
      />

      {/* Create Tournament Modal */}
      <CreateTournamentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateTournament}
        currentSize={tournament?.targetSize || 16}
      />

      {/* Reset Tournament Modal (Requirement 7) */}
      {tournament && (
        <ResetTournamentModal
          isOpen={isResetModalOpen}
          onClose={() => setIsResetModalOpen(false)}
          tournament={tournament}
          onReset={handleResetTournament}
        />
      )}

      {/* Tournament History Modal (Requirement 6) */}
      {tournament && (
        <TournamentHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          currentTournament={tournament}
          onLoadArchivedTournament={(archivedTour) => {
            setTournament(archivedTour);
            saveTournamentToStore(archivedTour);
            setActiveTournamentApi(archivedTour.id);
          }}
          onTournamentArchived={(archivedTour) => {
            setTournament(archivedTour);
            saveTournamentToStore(archivedTour);
          }}
        />
      )}

      {/* Broadcast Announcement to LINE Modal (補發通知到 LINE 群) */}
      <BroadcastAnnouncementModal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        tournament={tournament}
      />

      {/* Export & LINE Share Modal */}
      <ExportShareModal
        tournament={tournament}
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
}
