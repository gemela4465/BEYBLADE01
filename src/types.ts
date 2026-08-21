export type BeybladeType = 'attack' | 'defense' | 'stamina' | 'balance';

export interface VipPlayer {
  id: string;
  name: string;
  lineId?: string;
  lineAvatar?: string;
  beybladeName: string;
  beybladeType: BeybladeType;
  blade?: string;
  clubOrTeam?: string;
  addedAt: number;
  isSeed?: boolean;
  notes?: string;
}

export interface Player {
  id: string;
  name: string;
  lineId?: string;
  registeredByLineId?: string; // LINE ID of the person who registered on behalf of this player
  registeredInGroupId?: string; // LINE Group ID or Room ID where registration originated
  isProxy?: boolean; // True if registered via ++1 (替人報名)
  lineAvatar?: string;
  beybladeName: string;
  beybladeType: BeybladeType;
  blade?: string;
  ratchet?: string;
  bit?: string;
  clubOrTeam?: string;
  status: 'pending' | 'approved' | 'rejected';
  registeredAt: number;
  seedNumber?: number; // 1, 2, 3...
  isSeed: boolean;
  isVip?: boolean; // True if designated as a VIP / 優質選手
  isReserve?: boolean; // True if auto-filled placeholder reserve player (預備選手)
  reserveIndex?: number; // 1, 2, 3, 4...
  isRepechage?: boolean; // True if this player entered via repechage (敗部復活)
  revivedFromMatchId?: string; // ID of match where player originally lost
  originalReserveId?: string; // Original reserve placeholder ID replaced by this player
  replacedByPlayerId?: string; // If this reserve was replaced by a repechage player
  notes?: string;
  pendingCancelConfirm?: boolean; // For approved players requesting -1
  notificationSent?: boolean; // True if LINE push notification was sent upon approval
}

export type FinishType = 'spin' | 'over' | 'burst' | 'xtreme' | 'penalty' | 'manual';

export interface BattleRoundRecord {
  roundNum: number;
  winner: 'p1' | 'p2' | 'draw';
  finishType: FinishType;
  points: number;
  description: string;
  timestamp: number;
}

export interface Match {
  id: string;
  bracketWing: 'left' | 'right' | 'final' | 'third_place';
  round: number; // 1 = 1st round, 2 = 2nd round, etc.
  matchIndex: number; // index in this round
  matchNumber: number; // global match order #
  label: string; // e.g. "左翼 16強 第1場", "總冠軍決賽", "季殿軍爭奪戰"
  
  player1Id: string | null;
  player2Id: string | null;
  player1Score: number; // 0 - 11
  player2Score: number; // 0 - 11
  
  winnerId: string | null;
  loserId: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'bye';
  
  targetScore: number; // usually 4, 7, or 11
  roundsHistory: BattleRoundRecord[];
  
  nextMatchId?: string; // winner moves here
  nextMatchSlot?: 1 | 2;
  loserNextMatchId?: string; // for semi-final losers moving to 3rd place match
  loserNextMatchSlot?: 1 | 2;
  
  scheduledTime?: string;
  tableOrStadium?: string;
}

export type TournamentSize = 4 | 8 | 16 | 32 | 64 | 128;

export type TournamentStatus = 'registration' | 'ready' | 'in_progress' | 'completed' | 'cancelled';

export interface Tournament {
  id: string;
  name: string; // Full formatted title: e.g. "20260821-第1場-戰鬥陀螺 X 雙翼極限爭霸賽"
  datePrefix?: string; // e.g. "20260821"
  sessionNumber?: string; // e.g. "第1場"
  customTitle?: string; // e.g. "戰鬥陀螺 X 雙翼極限爭霸賽"
  
  startTime?: string; // e.g. "2026/08/21 19:00"
  registrationDeadline?: string; // e.g. "2026/08/21 18:00"
  
  targetSize: TournamentSize;
  matchTargetScore: number; // e.g. 4, 7, 11 (max 11)
  status: TournamentStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  
  seedMode: 'none' | 'manual' | 'random';
  seedCount: number;
  
  players: Player[];
  matches: Match[];
  
  rankings?: {
    champion?: Player;
    runnerUp?: Player;
    thirdPlace?: Player;
    fourthPlace?: Player;
  };

  isArchived?: boolean;
  archivedAt?: number;
  archiveNote?: string;
}

export interface PresetBeyblade {
  name: string;
  type: BeybladeType;
  combo: string;
  color: string;
}

export interface LineGroupInfo {
  id: string; // Group ID (starts with C) or Room ID (starts with R)
  name?: string;
  type: 'group' | 'room' | 'user';
  joinedAt: number;
  lastActiveAt: number;
  messageCount?: number;
}

