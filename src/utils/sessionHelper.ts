import { Tournament, TournamentSize, Player } from '../types';
import { generateDualWingBracket } from './bracketGenerator';

const TOURNAMENT_STORE_KEY = 'BEYBLADE_DUAL_WING_TOURNAMENTS_STORE_V1';
const ACTIVE_TOURNAMENT_ID_KEY = 'BEYBLADE_ACTIVE_TOURNAMENT_ID_V1';

/**
 * Builds the exact LINE registration link for the current tournament session
 */
export function buildRegistrationUrl(tournament: Tournament): string {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('mode', 'register');
  url.searchParams.set('tid', tournament.id);
  url.searchParams.set('tname', encodeURIComponent(tournament.name));
  url.searchParams.set('size', String(tournament.targetSize));
  url.searchParams.set('score', String(tournament.matchTargetScore));
  url.searchParams.set('seeds', String(tournament.seedCount || 0));
  url.searchParams.set('smode', tournament.seedMode || 'manual');
  url.searchParams.set('created', String(tournament.createdAt || Date.now()));
  return url.toString();
}

/**
 * Builds the admin dashboard URL for this session
 */
export function buildAdminUrl(tournament?: Tournament | null): string {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.origin + window.location.pathname);
  if (tournament) {
    url.searchParams.set('tid', tournament.id);
  }
  return url.toString();
}

/**
 * Parses tournament session metadata from the current URL query parameters
 */
export function parseTournamentSessionFromUrl(): {
  isRegisterMode: boolean;
  tid: string | null;
  name: string | null;
  targetSize: TournamentSize | null;
  targetScore: number | null;
  seedCount: number | null;
  seedMode: 'none' | 'manual' | 'random' | null;
  createdAt: number | null;
} {
  if (typeof window === 'undefined') {
    return {
      isRegisterMode: false,
      tid: null,
      name: null,
      targetSize: null,
      targetScore: null,
      seedCount: null,
      seedMode: null,
      createdAt: null
    };
  }

  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  const invite = params.get('invite');
  const isRegisterMode = mode === 'register' || invite === 'line' || window.location.hash === '#register';

  const tid = params.get('tid');
  const rawTname = params.get('tname');
  let name: string | null = null;
  if (rawTname) {
    try {
      name = decodeURIComponent(rawTname);
    } catch {
      name = rawTname;
    }
  }

  const rawSize = Number(params.get('size'));
  const validSizes: TournamentSize[] = [4, 8, 16, 32, 64, 128];
  const targetSize: TournamentSize | null = validSizes.includes(rawSize as TournamentSize) 
    ? (rawSize as TournamentSize) 
    : null;

  const rawScore = Number(params.get('score'));
  const targetScore = rawScore > 0 ? rawScore : null;

  const rawSeeds = Number(params.get('seeds'));
  const seedCount = !isNaN(rawSeeds) ? rawSeeds : null;

  const rawSmode = params.get('smode');
  const seedMode = (rawSmode === 'none' || rawSmode === 'manual' || rawSmode === 'random') 
    ? rawSmode 
    : null;

  const rawCreated = Number(params.get('created'));
  const createdAt = !isNaN(rawCreated) && rawCreated > 0 ? rawCreated : null;

  return {
    isRegisterMode,
    tid,
    name,
    targetSize,
    targetScore,
    seedCount,
    seedMode,
    createdAt
  };
}

/**
 * Loads all tournaments from local storage
 */
export function getAllTournamentsFromStore(): Record<string, Tournament> {
  try {
    const raw = localStorage.getItem(TOURNAMENT_STORE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to read tournaments store', e);
  }
  return {};
}

/**
 * Saves a tournament into the multi-session store
 */
export function saveTournamentToStore(tournament: Tournament): void {
  try {
    const store = getAllTournamentsFromStore();
    store[tournament.id] = tournament;
    localStorage.setItem(TOURNAMENT_STORE_KEY, JSON.stringify(store));
    localStorage.setItem(ACTIVE_TOURNAMENT_ID_KEY, tournament.id);
  } catch (e) {
    console.error('Failed to save tournament to store', e);
  }
}

/**
 * Retrieves the active tournament from storage or hydrates it from URL parameters
 */
export function loadInitialTournament(): { tournament: Tournament; isRegisterMode: boolean } {
  const urlSession = parseTournamentSessionFromUrl();
  const store = getAllTournamentsFromStore();

  // 1. If URL provides a specific session ID (tid)
  if (urlSession.tid) {
    if (store[urlSession.tid]) {
      // Found exact tournament in local storage!
      return {
        tournament: store[urlSession.tid],
        isRegisterMode: urlSession.isRegisterMode
      };
    }

    // Not in local storage (e.g. fresh participant device opening LINE invite)
    // Construct the exact session based on URL params!
    const sessionName = urlSession.name || '戰鬥陀螺 X 雙翼爭霸賽';
    const sessionSize: TournamentSize = urlSession.targetSize || 16;
    const sessionScore = urlSession.targetScore || 4;
    const sessionSeedMode = urlSession.seedMode || 'manual';
    const sessionSeedCount = urlSession.seedCount ?? 4;

    const freshTournament = generateDualWingBracket(
      sessionName,
      sessionSize,
      [], // clean participant roster for fresh registration
      sessionSeedMode,
      sessionSeedCount,
      sessionScore
    );

    // Override ID and timestamp to match the creator's exact session
    freshTournament.id = urlSession.tid;
    if (urlSession.createdAt) {
      freshTournament.createdAt = urlSession.createdAt;
      freshTournament.startedAt = urlSession.createdAt;
    }

    saveTournamentToStore(freshTournament);
    return {
      tournament: freshTournament,
      isRegisterMode: urlSession.isRegisterMode
    };
  }

  // 2. No URL tid: check for last active tournament
  const activeId = localStorage.getItem(ACTIVE_TOURNAMENT_ID_KEY);
  if (activeId && store[activeId]) {
    return {
      tournament: store[activeId],
      isRegisterMode: urlSession.isRegisterMode
    };
  }

  // 3. Fallback to any tournament in store
  const storedList = Object.values(store);
  if (storedList.length > 0) {
    return {
      tournament: storedList[storedList.length - 1],
      isRegisterMode: urlSession.isRegisterMode
    };
  }

  // 4. Default fallback: generate standard tournament
  const defaultTour = generateDualWingBracket(
    '2026 夏季戰鬥陀螺 X 雙翼極限爭霸賽',
    16,
    [],
    'manual',
    4,
    4
  );
  saveTournamentToStore(defaultTour);
  return {
    tournament: defaultTour,
    isRegisterMode: urlSession.isRegisterMode
  };
}
