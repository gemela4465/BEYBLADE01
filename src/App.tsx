import React, { useState, useEffect, useRef } from 'react';
import { 
  Tournament, Player, Match, TournamentSize, BattleRoundRecord, BeybladeType, TournamentPrizes 
} from './types';
import { SAMPLE_PLAYERS, POPULAR_BEYBLADES } from './data/beybladeData';
import { generateDualWingBracket, recordMatchResult, substitutePlayerInMatch } from './utils/bracketGenerator';
import { 
  loadInitialTournament, 
  saveTournamentToStore, 
  clearActiveTournamentInStore,
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
  archiveTournamentApi,
  deletePlayerApi,
  saveVipPlayerApi,
  importVipPlayersApi,
  startTournamentApi,
  finishTournamentApi,
  fetchVipPlayersApi
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
import { Trophy, Swords, Users, Shield, Plus, Sparkles, Archive } from 'lucide-react';

export default function App() {
  const initial = loadInitialTournament();
  const [tournament, setTournament] = useState<Tournament | null>(initial.tournament);
  const [isLineOnlyMode, setIsLineOnlyMode] = useState<boolean>(initial.isRegisterMode);
  const [isViewOnlyModeState, setIsViewOnlyModeState] = useState<boolean>(initial.isViewOnlyMode);

  const [activeTab, setActiveTab] = useState<'bracket' | 'players' | 'scoreboard' | 'podium'>('bracket');
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
          // If server tournament is completed or archived and we are in normal admin mode
          if (
            (serverTour.status === 'completed' || serverTour.isArchived) &&
            !initial.isViewOnlyMode &&
            !initial.isRegisterMode
          ) {
            setTournament(null);
            clearActiveTournamentInStore();
          } else {
            setTournament(serverTour);
            saveTournamentToStore(serverTour);
            if (serverTour.status !== 'completed' && !serverTour.isArchived) {
              setActiveTournamentApi(serverTour.id);
            }
          }
        } else {
          // If not on server, only save if not completed/archived
          if (tournament.status !== 'completed' && !tournament.isArchived) {
            saveTournamentApi(tournament);
            setActiveTournamentApi(tournament.id);
          }
        }
      });
    } else {
      // If there is no local tournament, query server to see if there is an active ongoing tournament
      fetch('/api/tournaments')
        .then((r) => r.json())
        .then((all: Tournament[]) => {
          if (Array.isArray(all)) {
            const activeOnServer = all.find((t) => t.status !== 'completed' && !t.isArchived);
            if (activeOnServer) {
              setTournament(activeOnServer);
              saveTournamentToStore(activeOnServer);
              setActiveTournamentApi(activeOnServer.id);
            }
          }
        })
        .catch(() => {});
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
    prizes?: TournamentPrizes;
  }) => {
    let newTournament: Tournament;

    if (config.populateSamplePlayers) {
      // Requirement 2: 5. 預載優質選手資料 產生資料來源是 優質名單 不是系統隨機選手
      // Fetch actual registered VIP players from the backend VIP registry
      const vipList = await fetchVipPlayersApi();
      const qualityCount = vipList.length;

      if (qualityCount > 0) {
        const sizeOptions: TournamentSize[] = [4, 8, 16, 32, 64, 128];
        let adjustedTargetSize: TournamentSize = config.targetSize;
        
        if (adjustedTargetSize < qualityCount) {
          adjustedTargetSize = sizeOptions.find((s) => s >= qualityCount) || 16;
        }

        // Build all real VIP players from registry
        const initialPlayers: Player[] = vipList.map((vip, idx) => {
          const isSeed = config.seedMode !== 'none' && idx < config.seedCount ? true : (vip.isSeed ?? false);
          return {
            id: `vip_${vip.id || idx + 1}_${Date.now()}_${idx}`,
            name: vip.name,
            lineId: vip.lineId,
            beybladeName: vip.beybladeName || '戰鬥陀螺 X',
            beybladeType: vip.beybladeType || 'attack',
            blade: vip.blade || '9-60GF',
            clubOrTeam: vip.clubOrTeam || '優質選手隊',
            teamName: vip.clubOrTeam || '優質選手隊',
            status: 'approved' as const,
            isVip: true,
            registeredAt: Date.now() - (qualityCount - idx) * 60000,
            isSeed,
            seedNumber: isSeed ? idx + 1 : undefined,
            score: 0,
            totalPointsScored: 0
          };
        });

        newTournament = generateDualWingBracket(
          config.name,
          adjustedTargetSize,
          initialPlayers,
          config.seedMode,
          config.seedCount,
          config.targetScore
        );
      } else {
        // When VIP registry is empty, start clean with 0 players (no random players generated)
        newTournament = {
          id: `tour_${Date.now()}`,
          name: config.name,
          targetSize: config.targetSize,
          matchTargetScore: config.targetScore,
          seedMode: config.seedMode,
          seedCount: config.seedCount,
          status: 'registration',
          players: [],
          matches: [],
          createdAt: Date.now()
        };
      }
    } else {
      // Clean new tournament session for LINE and manual registrations: start in 'registration' status with 0 members
      newTournament = {
        id: `tour_${Date.now()}`,
        name: config.name,
        targetSize: config.targetSize,
        matchTargetScore: config.targetScore,
        seedMode: config.seedMode,
        seedCount: config.seedCount,
        status: 'registration',
        players: [],
        matches: [],
        createdAt: Date.now()
      };
    }

    // Attach extended tournament metadata (Requirements 1 & 1.1)
    newTournament.datePrefix = config.datePrefix;
    newTournament.sessionNumber = config.sessionNumber;
    newTournament.customTitle = config.customTitle;
    newTournament.startTime = config.startTime;
    newTournament.registrationDeadline = config.registrationDeadline;
    newTournament.prizes = config.prizes;

    saveTournamentToStore(newTournament);
    await saveTournamentApi(newTournament);
    await setActiveTournamentApi(newTournament.id);
    
    // Automatically broadcast open tournament announcement to LINE group & followers if requested
    if (config.broadcastToLine !== false) {
      await broadcastOpenTournamentApi(newTournament.id);
    }

    setTournament(newTournament);
    setActiveTab(config.populateSamplePlayers ? 'bracket' : 'players');

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
      // Purge any reserve players from returned tournament players list
      const cleanTour = {
        ...res.tournament,
        players: (res.tournament.players || []).filter((p: Player) => !p.isReserve && !p.id.startsWith('player_reserve_'))
      };
      setTournament(cleanTour);
      saveTournamentToStore(cleanTour);
      await setActiveTournamentApi(cleanTour.id);
    } else {
      // Local fallback reset
      const keptPlayers = options.keepApproved
        ? tournament.players.filter((p) => p.status === 'approved' && !p.isReserve && !p.id.startsWith('player_reserve_'))
        : [];
      
      const resetTour: Tournament = {
        id: tournament.id,
        name: options.newCustomTitle ? `${tournament.datePrefix || ''}-${options.newSessionNumber || ''}-${options.newCustomTitle}` : tournament.name,
        datePrefix: tournament.datePrefix,
        sessionNumber: options.newSessionNumber || tournament.sessionNumber,
        customTitle: options.newCustomTitle || tournament.customTitle,
        startTime: options.newStartTime || tournament.startTime,
        registrationDeadline: options.newDeadline || tournament.registrationDeadline,
        targetSize: tournament.targetSize,
        matchTargetScore: tournament.matchTargetScore,
        seedMode: tournament.seedMode,
        seedCount: tournament.seedCount,
        status: 'registration',
        players: keptPlayers,
        matches: [],
        createdAt: Date.now()
      };
      
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

  // Remove player (fully calls DELETE API as well)
  const handleRemovePlayer = async (playerId: string) => {
    if (!tournament) return;
    const updatedTour: Tournament = {
      ...tournament,
      players: tournament.players.filter((p) => p.id !== playerId)
    };
    setTournament(updatedTour);
    saveTournamentToStore(updatedTour);
    await deletePlayerApi(tournament.id, playerId);
  };

  // Toggle player VIP status (優質選手)
  const handleToggleVip = async (player: Player) => {
    if (!tournament) return;
    const newIsVip = !player.isVip;
    const updatedTour: Tournament = {
      ...tournament,
      players: tournament.players.map((p) => (p.id === player.id ? { ...p, isVip: newIsVip } : p))
    };
    setTournament(updatedTour);
    saveTournamentToStore(updatedTour);
    saveTournamentApi(updatedTour);

    if (newIsVip) {
      await saveVipPlayerApi({
        id: `vip_${player.id.replace('player_', '').replace('p_bot_', '')}`,
        name: player.name,
        lineId: player.lineId,
        beybladeName: player.beybladeName,
        beybladeType: player.beybladeType,
        blade: player.blade,
        clubOrTeam: player.clubOrTeam,
        isSeed: player.isSeed
      });
    }
  };

  // Import VIP players into tournament pending queue
  const handleImportVip = async (vipIds?: string[]) => {
    if (!tournament) return;
    const res = await importVipPlayersApi(tournament.id, vipIds);
    if (res && res.tournament) {
      setTournament(res.tournament);
      saveTournamentToStore(res.tournament);
    } else {
      const serverTour = await fetchTournamentApi(tournament.id);
      if (serverTour) {
        setTournament(serverTour);
        saveTournamentToStore(serverTour);
      }
    }
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
    const approved = tournament.players.filter((p) => p.status === 'approved' && !p.isReserve && !p.id.startsWith('player_reserve_'));
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
    const realApprovedPlayers = tournament.players.filter(
      (p) => p.status === 'approved' && !p.isReserve && !p.id.startsWith('player_reserve_')
    );
    const newTournament = generateDualWingBracket(
      tournament.name,
      tournament.targetSize,
      realApprovedPlayers,
      tournament.seedMode,
      tournament.seedCount,
      tournament.matchTargetScore
    );
    newTournament.id = tournament.id;
    newTournament.datePrefix = tournament.datePrefix;
    newTournament.sessionNumber = tournament.sessionNumber;
    newTournament.customTitle = tournament.customTitle;
    newTournament.startTime = tournament.startTime;
    newTournament.registrationDeadline = tournament.registrationDeadline;

    // Retain real pending players
    const pendingPlayers = tournament.players.filter(
      (p) => p.status === 'pending' && !p.isReserve && !p.id.startsWith('player_reserve_')
    );
    newTournament.players = [...newTournament.players, ...pendingPlayers];

    setTournament(newTournament);
    saveTournamentToStore(newTournament);
    saveTournamentApi(newTournament);
    setActiveTab('bracket');
  };

  // Start tournament handler (Requirement 1: 賽程表增加開賽按鈕)
  const handleStartTournament = async () => {
    if (!tournament) return;
    try {
      const res = await startTournamentApi(tournament.id, true);
      if (res.success && res.tournament) {
        setTournament(res.tournament);
        saveTournamentToStore(res.tournament);
      } else {
        const updated: Tournament = {
          ...tournament,
          status: 'in_progress'
        };
        setTournament(updated);
        saveTournamentToStore(updated);
        saveTournamentApi(updated);
      }
      setActiveTab('bracket');
    } catch (err) {
      console.error('Error starting tournament:', err);
    }
  };

  // Finish tournament handler (Requirement 2: 增加完賽按鈕，自動存檔備查，並把主頁清空，等候新增賽事)
  const handleFinishTournament = async () => {
    if (!tournament) return;
    try {
      const res = await finishTournamentApi(tournament.id);
      // Auto-archive
      await archiveTournamentApi(tournament.id);
      
      // Update local storage so this tournament is marked completed/archived
      if (res && res.tournament) {
        saveTournamentToStore(res.tournament);
      } else {
        saveTournamentToStore({
          ...tournament,
          status: 'completed',
          isArchived: true,
          completedAt: Date.now(),
          archivedAt: Date.now()
        });
      }

      // Clear active tournament state and localStorage
      setTournament(null);
      clearActiveTournamentInStore();
      
      // Clean query params so refreshing the browser remains in clean home state
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('tid');
        url.searchParams.delete('tname');
        url.searchParams.delete('size');
        url.searchParams.delete('score');
        url.searchParams.delete('seeds');
        url.searchParams.delete('smode');
        url.searchParams.delete('created');
        url.searchParams.delete('mode');
        url.searchParams.delete('session');
        window.history.pushState({}, '', url.pathname + (url.search ? url.search : ''));
      }
    } catch (err) {
      console.error('Error finishing tournament:', err);
      setTournament(null);
      clearActiveTournamentInStore();
    }
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

  // Substitute a player or execute repechage revival for a match slot
  const handleSubstitutePlayer = (
    matchId: string,
    slot: 1 | 2,
    newPlayer: Player,
    isRepechage: boolean = true
  ) => {
    if (!tournament) return;
    const updated = substitutePlayerInMatch(tournament, matchId, slot, newPlayer, isRepechage);
    setTournament(updated);
    saveTournamentToStore(updated);
    saveTournamentApi(updated);

    const updatedMatch = updated.matches.find((m) => m.id === matchId);
    if (updatedMatch) {
      setSelectedMatch(updatedMatch);
    }
  };

  const pendingCount = tournament?.players.filter((p) => p.status === 'pending' && !p.isReserve && !p.id.startsWith('player_reserve_')).length || 0;
  const approvedCount = tournament?.players.filter((p) => p.status === 'approved' && !p.isReserve && !p.id.startsWith('player_reserve_')).length || 0;

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
        onStartTournament={handleStartTournament}
        onFinishTournament={handleFinishTournament}
        pendingCount={pendingCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 py-6 relative z-10">
        {!tournament ? (
          <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-6 animate-fadeIn">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-tr from-[#00f2ff]/20 via-[#06C755]/20 to-[#7000ff]/20 border border-[#00f2ff]/40 flex items-center justify-center shadow-[0_0_30px_rgba(0,242,255,0.2)]">
              <Trophy className="w-10 h-10 text-[#00f2ff]" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white tracking-tight uppercase">
                目前無進行中賽事
              </h2>
              <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                賽程已結束存檔備查，主頁已重置清空。您可以立即點擊下方按鈕建立下一場全新比賽，或從存檔庫中查閱過往戰績！
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              <button
                id="btn-empty-new-tournament"
                onClick={() => setIsCreateModalOpen(true)}
                className="px-6 py-3 bg-[#00f2ff] hover:bg-[#00d8e6] text-black font-black rounded-xl text-sm shadow-[0_0_25px_rgba(0,242,255,0.35)] active:scale-95 transition-all flex items-center gap-2"
              >
                <Plus className="w-5 h-5 stroke-[3]" />
                建立新賽事
              </button>
              <button
                id="btn-empty-history-archive"
                onClick={() => setIsHistoryModalOpen(true)}
                className="px-6 py-3 bg-purple-900/40 hover:bg-purple-900/60 border border-purple-500/40 text-purple-200 font-bold rounded-xl text-sm transition-all flex items-center gap-2"
              >
                <Archive className="w-4 h-4 text-purple-400" />
                查看歷史賽事備查庫
              </button>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'bracket' && (
              <DualWingBracket
                tournament={tournament}
                onSelectMatch={(m) => setSelectedMatch(m)}
                onOpenCreateModal={() => setIsCreateModalOpen(true)}
                onStartTournament={handleStartTournament}
                onFinishTournament={handleFinishTournament}
                onRegenerateBracket={handleGenerateBracket}
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
                onToggleVip={handleToggleVip}
                onImportVip={handleImportVip}
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
        tournament={tournament || undefined}
        isOpen={Boolean(selectedMatch)}
        onClose={() => setSelectedMatch(null)}
        onSaveMatchResult={handleSaveMatchResult}
        onSubstitutePlayer={handleSubstitutePlayer}
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
