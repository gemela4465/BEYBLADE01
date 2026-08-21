import { Tournament, TournamentSize, Player } from '../types';
import { generateDualWingBracket } from './bracketGenerator';

const TOURNAMENT_STORE_KEY = 'BEYBLADE_DUAL_WING_TOURNAMENTS_STORE_V1';
const ACTIVE_TOURNAMENT_ID_KEY = 'BEYBLADE_ACTIVE_TOURNAMENT_ID_V1';

/**
 * Check if the current browser window is in view-only / readonly mode
 */
export function isViewOnlyMode(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  return mode === 'view' || mode === 'readonly' || mode === 'bracket_only';
}

/**
 * Builds the read-only live bracket URL that anyone can view but cannot edit
 */
export function buildReadOnlyBracketUrl(tournament: Tournament): string {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('mode', 'view');
  url.searchParams.set('tid', tournament.id);
  return url.toString();
}

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
  isViewOnlyMode: boolean;
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
      isViewOnlyMode: false,
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
  const isViewOnlyMode = mode === 'view' || mode === 'readonly' || mode === 'bracket_only';

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
    isViewOnlyMode,
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
export function loadInitialTournament(): {
  tournament: Tournament;
  isRegisterMode: boolean;
  isViewOnlyMode: boolean;
} {
  const urlSession = parseTournamentSessionFromUrl();
  const store = getAllTournamentsFromStore();

  // 1. If URL provides a specific session ID (tid)
  if (urlSession.tid) {
    if (store[urlSession.tid]) {
      // Found exact tournament in local storage!
      return {
        tournament: store[urlSession.tid],
        isRegisterMode: urlSession.isRegisterMode,
        isViewOnlyMode: urlSession.isViewOnlyMode
      };
    }

    // Not in local storage (e.g. fresh participant device opening LINE invite)
    // Construct the exact session based on URL params!
    const sessionName = urlSession.name || '戰鬥陀螺 X 雙翼爭霸賽';
    const sessionSize: TournamentSize = urlSession.targetSize || 16;
    const sessionScore = urlSession.targetScore || 4;
    const sessionSeedMode = urlSession.seedMode || 'manual';
    const sessionSeedCount = urlSession.seedCount ?? 4;

    const freshTournament: Tournament = {
      id: urlSession.tid,
      name: sessionName,
      targetSize: sessionSize,
      matchTargetScore: sessionScore,
      seedMode: sessionSeedMode,
      seedCount: sessionSeedCount,
      status: 'registration',
      players: [],
      matches: [],
      createdAt: urlSession.createdAt || Date.now(),
      startedAt: urlSession.createdAt || Date.now()
    };

    saveTournamentToStore(freshTournament);
    return {
      tournament: freshTournament,
      isRegisterMode: urlSession.isRegisterMode,
      isViewOnlyMode: urlSession.isViewOnlyMode
    };
  }

  // 2. No URL tid: check for last active tournament
  const activeId = localStorage.getItem(ACTIVE_TOURNAMENT_ID_KEY);
  if (activeId && store[activeId]) {
    return {
      tournament: store[activeId],
      isRegisterMode: urlSession.isRegisterMode,
      isViewOnlyMode: urlSession.isViewOnlyMode
    };
  }

  // 3. Fallback to any tournament in store
  const storedList = Object.values(store);
  if (storedList.length > 0) {
    return {
      tournament: storedList[storedList.length - 1],
      isRegisterMode: urlSession.isRegisterMode,
      isViewOnlyMode: urlSession.isViewOnlyMode
    };
  }

  // 4. Default fallback: generate clean registration tournament
  const defaultTour: Tournament = {
    id: `tour_${Date.now()}`,
    name: '2026 夏季戰鬥陀螺 X 雙翼極限爭霸賽',
    targetSize: 16,
    matchTargetScore: 4,
    seedMode: 'manual',
    seedCount: 4,
    status: 'registration',
    players: [],
    matches: [],
    createdAt: Date.now()
  };
  saveTournamentToStore(defaultTour);
  return {
    tournament: defaultTour,
    isRegisterMode: urlSession.isRegisterMode,
    isViewOnlyMode: urlSession.isViewOnlyMode
  };
}
