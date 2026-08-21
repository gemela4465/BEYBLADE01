import { Tournament, Player } from '../types';

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
  updates: { status?: 'pending' | 'approved' | 'rejected'; isSeed?: boolean; seedRank?: number }
): Promise<boolean> {
  try {
    const res = await fetch(`/api/tournaments/${encodeURIComponent(tournamentId)}/players/${encodeURIComponent(playerId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.ok;
  } catch (err) {
    console.error('[API] Error updating player status:', err);
    return false;
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
