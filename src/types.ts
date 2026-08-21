export type BeybladeType = 'attack' | 'defense' | 'stamina' | 'balance';

export interface Player {
  id: string;
  name: string;
  lineId?: string;
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
  notes?: string;
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

export type TournamentStatus = 'registration' | 'ready' | 'in_progress' | 'completed';

export interface Tournament {
  id: string;
  name: string;
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
}

export interface PresetBeyblade {
  name: string;
  type: BeybladeType;
  combo: string;
  color: string;
}
