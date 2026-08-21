import { Tournament, Player, VipPlayer } from '../types';

export async function startTournamentApi(
  tournamentId: string,
  broadcastToLine: boolean = true
): Promise<{ success: boolean; tournament?: Tournament }> {
  try {
    const res = await fetch(`/api/tournaments/${encodeURIComponent(tournamentId)}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ broadcastToLine }),
    });
    if (!res.ok) return { success: false };
    return await res.json();
  } catch (err) {
    console.error('[API] Error starting tournament:', err);
    return { success: false };
  }
}

export async function finishTournamentApi(
  tournamentId: string
): Promise<{ success: boolean; tournament?: Tournament }> {
  try {
    const res = await fetch(`/api/tournaments/${encodeURIComponent(tournamentId)}/finish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return { success: false };
    return await res.json();
  } catch (err) {
    console.error('[API] Error finishing tournament:', err);
    return { success: false };
  }
}

export async function deletePlayerApi(
  tournamentId: string,
  playerId: string
): Promise<{ success: boolean; tournament?: Tournament }> {
  try {
    const res = await fetch(`/api/tournaments/${encodeURIComponent(tournamentId)}/players/${encodeURIComponent(playerId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) return { success: false };
    return await res.json();
  } catch (err) {
    console.error('[API] Error deleting player from tournament:', err);
    return { success: false };
  }
}

export async function fetchVipPlayersApi(): Promise<VipPlayer[]> {
  try {
    const res = await fetch('/api/vip-players');
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn('[API] Could not fetch VIP players:', err);
    return [];
  }
}

export async function saveVipPlayerApi(vip: Partial<VipPlayer>): Promise<{ success: boolean; vipPlayer?: VipPlayer }> {
  try {
    const res = await fetch('/api/vip-players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vip),
    });
    if (!res.ok) return { success: false };
    return await res.json();
  } catch (err) {
    console.error('[API] Error saving VIP player:', err);
    return { success: false };
  }
}

export async function deleteVipPlayerApi(vipId: string): Promise<{ success: boolean }> {
  try {
    const res = await fetch(`/api/vip-players/${encodeURIComponent(vipId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) return { success: false };
    return await res.json();
  } catch (err) {
    console.error('[API] Error deleting VIP player:', err);
    return { success: false };
  }
}

export async function importVipPlayersApi(
  tournamentId: string,
  vipIds?: string[]
): Promise<{ success: boolean; addedCount: number; addedPlayers: Player[]; tournament?: Tournament }> {
  try {
    const res = await fetch(`/api/tournaments/${encodeURIComponent(tournamentId)}/import-vip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vipIds }),
    });
    if (!res.ok) return { success: false, addedCount: 0, addedPlayers: [] };
    return await res.json();
  } catch (err) {
    console.error('[API] Error importing VIP players:', err);
    return { success: false, addedCount: 0, addedPlayers: [] };
  }
}

export async function fetchTournamentApi(id: string): Promise<Tournament | null> {
  try {
    const res = await fetch(`/api/tournaments/${encodeURIComponent(id)}`);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Failed to fetch tournament: ${res.statusText}`);
    }
    const data = await res.json();
    return data as Tournament;
  } catch (err) {
    console.warn('[API] Could not fetch tournament from server, using local fallback:', err);
    return null;
  }
}

export async function saveTournamentApi(tournament: Tournament): Promise<Tournament | null> {
  try {
    const res = await fetch(`/api/tournaments/${encodeURIComponent(tournament.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tournament),
    });

    if (res.status === 404 || !res.ok) {
      // Try POST if not existing
      const postRes = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tournament),
      });
      if (!postRes.ok) throw new Error(`Failed to create tournament: ${postRes.statusText}`);
      return await postRes.json();
    }
    return await res.json();
  } catch (err) {
    console.warn('[API] Could not save tournament to server:', err);
    return null;
  }
}

export async function registerPlayerApi(
  tournamentId: string,
  player: Partial<Player>,
  tournamentFallback?: Tournament
): Promise<{ success: boolean; player: Player; tournament: Tournament } | null> {
  try {
    const res = await fetch(`/api/tournaments/${encodeURIComponent(tournamentId)}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player, tournamentFallback }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Server returned ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error('[API] Error registering player via server:', err);
    return null;
  }
}

export async function updatePlayerStatusApi(
  tournamentId: string,
  playerId: string,
  updates: { status?: 'pending' | 'approved' | 'rejected'; isSeed?: boolean; seedRank?: number; sendLineNotification?: boolean }
): Promise<{ success: boolean; notificationSent?: boolean }> {
  try {
    const res = await fetch(`/api/tournaments/${encodeURIComponent(tournamentId)}/players/${encodeURIComponent(playerId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) return { success: false };
    const data = await res.json();
    return { success: true, notificationSent: data.notificationSent };
  } catch (err) {
    console.error('[API] Error updating player status:', err);
    return { success: false };
  }
}

export async function fetchTournamentHistoryApi(): Promise<Tournament[]> {
  try {
    const res = await fetch('/api/tournaments/history');
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn('[API] Could not fetch tournament history:', err);
    return [];
  }
}

export async function archiveTournamentApi(
  tournamentId: string,
  note?: string
): Promise<{ success: boolean; tournament?: Tournament }> {
  try {
    const res = await fetch(`/api/tournaments/${encodeURIComponent(tournamentId)}/archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    if (!res.ok) return { success: false };
    return await res.json();
  } catch (err) {
    console.error('[API] Error archiving tournament:', err);
    return { success: false };
  }
}

export async function resetTournamentApi(
  tournamentId: string,
  options: {
    keepApproved: boolean;
    newSessionNumber?: string;
    newCustomTitle?: string;
    newStartTime?: string;
    newDeadline?: string;
  }
): Promise<{ success: boolean; tournament?: Tournament }> {
  try {
    const res = await fetch(`/api/tournaments/${encodeURIComponent(tournamentId)}/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    if (!res.ok) return { success: false };
    return await res.json();
  } catch (err) {
    console.error('[API] Error resetting tournament:', err);
    return { success: false };
  }
}

export async function setActiveTournamentApi(
  tournamentId: string
): Promise<{ success: boolean; activeTournamentId?: string }> {
  try {
    const res = await fetch(`/api/tournaments/${encodeURIComponent(tournamentId)}/set-active`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return { success: false };
    return await res.json();
  } catch (err) {
    console.error('[API] Error setting active tournament for LINE bot:', err);
    return { success: false };
  }
}

export async function approveAllPlayersApi(
  tournamentId: string
): Promise<{ success: boolean; approvedCount: number; notificationsSentCount: number; tournament?: Tournament }> {
  try {
    const res = await fetch(`/api/tournaments/${encodeURIComponent(tournamentId)}/players/approve-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[API] Error approving all pending players:', err);
    return { success: false, approvedCount: 0, notificationsSentCount: 0 };
  }
}

export async function broadcastOpenTournamentApi(
  tournamentId: string,
  customAnnouncement?: string
): Promise<{
  success: boolean;
  broadcastSuccess: boolean;
  pushedGroupCount?: number;
  pushedGroups?: string[];
  failedGroups?: string[];
  totalGroups?: number;
  announcementText: string;
}> {
  try {
    const res = await fetch(`/api/tournaments/${encodeURIComponent(tournamentId)}/broadcast-open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customAnnouncement }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[API] Error broadcasting tournament open announcement:', err);
    return { success: false, broadcastSuccess: false, announcementText: '' };
  }
}

export async function broadcastAnnouncementApi(
  tournamentId: string,
  message?: string
): Promise<{
  success: boolean;
  broadcastSuccess: boolean;
  pushedGroupCount?: number;
  pushedGroups?: string[];
  failedGroups?: string[];
  totalGroups?: number;
  announcementText: string;
}> {
  try {
    const res = await fetch(`/api/tournaments/${encodeURIComponent(tournamentId)}/broadcast-announcement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[API] Error broadcasting announcement to LINE:', err);
    return { success: false, broadcastSuccess: false, announcementText: '' };
  }
}

export async function uploadBracketImageApi(
  imageBase64: string,
  filename?: string
): Promise<{
  success: boolean;
  filename?: string;
  imageUrl?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/upload-bracket-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, filename }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: any) {
    console.error('[API] Error uploading bracket image snapshot:', err);
    return { success: false, error: err.message };
  }
}

export async function broadcastBracketApi(
  tournamentId: string,
  options?: {
    message?: string;
    imageUrl?: string;
    readOnlyUrl?: string;
  }
): Promise<{
  success: boolean;
  broadcastSuccess: boolean;
  pushedGroupCount?: number;
  pushedGroups?: string[];
  failedGroups?: string[];
  totalGroups?: number;
  announcementText: string;
  imageUrl?: string | null;
  readOnlyUrl?: string;
}> {
  try {
    const res = await fetch(`/api/tournaments/${encodeURIComponent(tournamentId)}/broadcast-bracket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {}),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[API] Error broadcasting bracket to LINE:', err);
    return { success: false, broadcastSuccess: false, announcementText: '' };
  }
}

export async function broadcastMatchApi(
  tournamentId: string,
  options?: {
    matchId?: string;
    message?: string;
    readOnlyUrl?: string;
  }
): Promise<{
  success: boolean;
  broadcastSuccess: boolean;
  pushedGroupCount?: number;
  pushedGroups?: string[];
  failedGroups?: string[];
  totalGroups?: number;
  announcementText: string;
  readOnlyUrl?: string;
}> {
  try {
    const res = await fetch(`/api/tournaments/${encodeURIComponent(tournamentId)}/broadcast-match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {}),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[API] Error broadcasting live match status to LINE:', err);
    return { success: false, broadcastSuccess: false, announcementText: '' };
  }
}

export async function fetchConnectedGroupsApi(): Promise<{
  totalCount: number;
  groups: Array<{
    id: string;
    name?: string;
    type: 'group' | 'room' | 'user';
    joinedAt: number;
    lastActiveAt: number;
    messageCount: number;
  }>;
  activeTournamentId: string | null;
}> {
  try {
    const res = await fetch('/api/line/groups');
    if (!res.ok) return { totalCount: 0, groups: [], activeTournamentId: null };
    return await res.json();
  } catch (err) {
    console.error('[API] Error fetching connected LINE groups:', err);
    return { totalCount: 0, groups: [], activeTournamentId: null };
  }
}

export async function addConnectedGroupApi(
  id: string,
  name?: string,
  type: 'group' | 'room' = 'group'
): Promise<{ success: boolean; group?: any }> {
  try {
    const res = await fetch('/api/line/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name, type }),
    });
    if (!res.ok) return { success: false };
    return await res.json();
  } catch (err) {
    console.error('[API] Error adding connected group:', err);
    return { success: false };
  }
}

export async function deleteConnectedGroupApi(groupId: string): Promise<{ success: boolean }> {
  try {
    const res = await fetch(`/api/line/groups/${encodeURIComponent(groupId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) return { success: false };
    return await res.json();
  } catch (err) {
    console.error('[API] Error removing connected group:', err);
    return { success: false };
  }
}

export async function sendTestPushApi(
  targetId: string,
  message: string
): Promise<{ success: boolean; targetId: string; message: string }> {
  try {
    const res = await fetch('/api/line/send-test-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId, message }),
    });
    if (!res.ok) return { success: false, targetId, message };
    return await res.json();
  } catch (err) {
    console.error('[API] Error sending test push:', err);
    return { success: false, targetId, message };
  }
}


export async function simulateLineBotMessageApi(
  message: string,
  simulatedUser: { name: string; lineId: string },
  tournamentId?: string
): Promise<{ replyText: string; registered: boolean; player?: Player; tournament?: Tournament } | null> {
  try {
    const res = await fetch('/api/line/simulate-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, simulatedUser, tournamentId }),
    });

    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[API] Error simulating LINE Bot message:', err);
    return null;
  }
}

export async function fetchLineBotStatusApi(): Promise<{
  hasAccessToken: boolean;
  hasSecret: boolean;
  webhookUrl: string;
  liffId: string | null;
} | null> {
  try {
    const res = await fetch('/api/line/status');
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}
