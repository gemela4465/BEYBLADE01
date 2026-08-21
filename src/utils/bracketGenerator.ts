import { Match, Player, Tournament, TournamentSize } from '../types';

/**
 * Standard tournament bracket seed order generator for power of 2
 */
function getSeedOrder(size: number): number[] {
  let rounds = Math.log2(size) - 1;
  let pls = [1, 2];
  for (let i = 0; i < rounds; i++) {
    const nextPls: number[] = [];
    const sum = pls.length * 2 + 1;
    for (const p of pls) {
      nextPls.push(p);
      nextPls.push(sum - p);
    }
    pls = nextPls;
  }
  return pls;
}

export function getRoundLabel(round: number, totalRounds: number, wing: 'left' | 'right' | 'final' | 'third_place', matchIdx: number): string {
  if (wing === 'final') return '🏆 冠軍爭霸總決賽 (Grand Final)';
  if (wing === 'third_place') return '🥉 季殿軍爭奪戰 (3rd Place Match)';

  const wingName = wing === 'left' ? '左翼' : '右翼';
  const remainingInWingRounds = totalRounds - round; // 1 means semi-final, 2 means quarter-final, etc.

  if (remainingInWingRounds === 1) {
    return `${wingName} 準決賽 (Semi-Final)`;
  }
  if (remainingInWingRounds === 2) {
    return `${wingName} 8強賽 (Quarter-Final) 第 ${matchIdx + 1} 場`;
  }
  if (remainingInWingRounds === 3) {
    return `${wingName} 16強賽 第 ${matchIdx + 1} 場`;
  }
  if (remainingInWingRounds === 4) {
    return `${wingName} 32強賽 第 ${matchIdx + 1} 場`;
  }
  if (remainingInWingRounds === 5) {
    return `${wingName} 64強賽 第 ${matchIdx + 1} 場`;
  }
  if (remainingInWingRounds === 6) {
    return `${wingName} 128強預賽 第 ${matchIdx + 1} 場`;
  }

  return `${wingName} 第 ${round} 輪 第 ${matchIdx + 1} 場`;
}

/**
 * Generates all matches for a Dual-Wing Tournament Bracket
 */
export function generateDualWingBracket(
  name: string,
  targetSize: TournamentSize,
  players: Player[],
  seedMode: 'none' | 'manual' | 'random',
  seedCount: number,
  targetScore: number = 4
): Tournament {
  const approvedPlayers = players.filter((p) => p.status === 'approved');
  
  // Assign or reorganize seeds
  const playerSlots: (Player | null)[] = new Array(targetSize).fill(null);
  const processedPlayers = [...approvedPlayers];

  if (seedMode === 'random') {
    // Shuffle and pick top seedCount
    const shuffled = [...processedPlayers].sort(() => Math.random() - 0.5);
    shuffled.forEach((p, idx) => {
      if (idx < seedCount) {
        p.isSeed = true;
        p.seedNumber = idx + 1;
      } else {
        p.isSeed = false;
        p.seedNumber = undefined;
      }
    });
  } else if (seedMode === 'none') {
    processedPlayers.forEach((p) => {
      p.isSeed = false;
      p.seedNumber = undefined;
    });
  }

  // Get standard seed layout for size
  const seedLayout = getSeedOrder(targetSize); // length targetSize, 1-indexed seed ranks

  // Separate seeded and non-seeded
  const seededPlayers = processedPlayers
    .filter((p) => p.isSeed && p.seedNumber && p.seedNumber <= targetSize)
    .sort((a, b) => (a.seedNumber || 0) - (b.seedNumber || 0));

  const unseededPlayers = processedPlayers.filter((p) => !p.isSeed || !p.seedNumber);
  
  // Shuffle unseeded for fair distribution
  const shuffledUnseeded = [...unseededPlayers].sort(() => Math.random() - 0.5);

  // Place seeded players in their exact seed position
  const usedPlayerIds = new Set<string>();
  seededPlayers.forEach((sp) => {
    const targetSeedRank = sp.seedNumber!;
    const slotIdx = seedLayout.indexOf(targetSeedRank);
    if (slotIdx !== -1 && !playerSlots[slotIdx]) {
      playerSlots[slotIdx] = sp;
      usedPlayerIds.add(sp.id);
    }
  });

  // Fill remaining slots with unseeded players
  let unseededIdx = 0;
  for (let i = 0; i < targetSize; i++) {
    if (!playerSlots[i] && unseededIdx < shuffledUnseeded.length) {
      playerSlots[i] = shuffledUnseeded[unseededIdx++];
      if (playerSlots[i]) usedPlayerIds.add(playerSlots[i]!.id);
    }
  }

  // Split into Left Wing (0 to targetSize/2 - 1) and Right Wing (targetSize/2 to targetSize - 1)
  const halfSize = targetSize / 2;
  const leftSlots = playerSlots.slice(0, halfSize);
  const rightSlots = playerSlots.slice(halfSize);

  const totalWingRounds = Math.log2(halfSize); // for 8 size: half=4 => 2 rounds
  const totalRounds = totalWingRounds + 1; // last round is Center Finals

  let globalMatchNum = 1;
  const matches: Match[] = [];

  // Helper to build a wing's matches
  function buildWingMatches(wing: 'left' | 'right', slots: (Player | null)[]) {
    const wingMatchesByRound: Match[][] = [];

    // Round 1
    const r1Matches: Match[] = [];
    const r1MatchCount = slots.length / 2;
    for (let m = 0; m < r1MatchCount; m++) {
      const p1 = slots[m * 2];
      const p2 = slots[m * 2 + 1];

      const match: Match = {
        id: `match_${wing}_r1_${m}`,
        bracketWing: wing,
        round: 1,
        matchIndex: m,
        matchNumber: globalMatchNum++,
        label: getRoundLabel(1, totalRounds, wing, m),
        player1Id: p1 ? p1.id : null,
        player2Id: p2 ? p2.id : null,
        player1Score: 0,
        player2Score: 0,
        winnerId: null,
        loserId: null,
        status: 'pending',
        targetScore,
        roundsHistory: []
      };

      r1Matches.push(match);
    }
    wingMatchesByRound.push(r1Matches);

    // Subsequent rounds up to wing semi-final
    for (let r = 2; r <= totalWingRounds; r++) {
      const prevRoundMatches = wingMatchesByRound[r - 2];
      const currentMatchCount = prevRoundMatches.length / 2;
      const currentRoundMatches: Match[] = [];

      for (let m = 0; m < currentMatchCount; m++) {
        const match: Match = {
          id: `match_${wing}_r${r}_${m}`,
          bracketWing: wing,
          round: r,
          matchIndex: m,
          matchNumber: globalMatchNum++,
          label: getRoundLabel(r, totalRounds, wing, m),
          player1Id: null,
          player2Id: null,
          player1Score: 0,
          player2Score: 0,
          winnerId: null,
          loserId: null,
          status: 'pending',
          targetScore,
          roundsHistory: []
        };

        // Link previous matches to this match
        const prev1 = prevRoundMatches[m * 2];
        const prev2 = prevRoundMatches[m * 2 + 1];
        prev1.nextMatchId = match.id;
        prev1.nextMatchSlot = 1;
        prev2.nextMatchId = match.id;
        prev2.nextMatchSlot = 2;

        currentRoundMatches.push(match);
      }
      wingMatchesByRound.push(currentRoundMatches);
    }

    return wingMatchesByRound;
  }

  const leftWingRounds = buildWingMatches('left', leftSlots);
  const rightWingRounds = buildWingMatches('right', rightSlots);

  // Center Finals: Grand Final & 3rd Place Match
  const leftFinalMatch = leftWingRounds[leftWingRounds.length - 1][0];
  const rightFinalMatch = rightWingRounds[rightWingRounds.length - 1][0];

  const grandFinalMatch: Match = {
    id: `match_final_grand`,
    bracketWing: 'final',
    round: totalRounds,
    matchIndex: 0,
    matchNumber: globalMatchNum++,
    label: '🏆 冠軍爭霸總決賽 (Grand Final)',
    player1Id: null,
    player2Id: null,
    player1Score: 0,
    player2Score: 0,
    winnerId: null,
    loserId: null,
    status: 'pending',
    targetScore,
    roundsHistory: []
  };

  const thirdPlaceMatch: Match = {
    id: `match_final_third_place`,
    bracketWing: 'third_place',
    round: totalRounds,
    matchIndex: 1,
    matchNumber: globalMatchNum++,
    label: '🥉 季殿軍爭奪戰 (3rd Place Match)',
    player1Id: null,
    player2Id: null,
    player1Score: 0,
    player2Score: 0,
    winnerId: null,
    loserId: null,
    status: 'pending',
    targetScore,
    roundsHistory: []
  };

  // Link wing finals to Grand Final and 3rd Place Match
  leftFinalMatch.nextMatchId = grandFinalMatch.id;
  leftFinalMatch.nextMatchSlot = 1;
  leftFinalMatch.loserNextMatchId = thirdPlaceMatch.id;
  leftFinalMatch.loserNextMatchSlot = 1;

  rightFinalMatch.nextMatchId = grandFinalMatch.id;
  rightFinalMatch.nextMatchSlot = 2;
  rightFinalMatch.loserNextMatchId = thirdPlaceMatch.id;
  rightFinalMatch.loserNextMatchSlot = 2;

  // Flatten all matches
  leftWingRounds.forEach((r) => matches.push(...r));
  rightWingRounds.forEach((r) => matches.push(...r));
  matches.push(grandFinalMatch);
  matches.push(thirdPlaceMatch);

  // Process initial BYEs for Round 1 matches
  const matchMap = new Map<string, Match>();
  matches.forEach((m) => matchMap.set(m.id, m));

  // Check round 1 matches for BYE automatically
  matches.forEach((m) => {
    if (m.round === 1) {
      if (m.player1Id && !m.player2Id) {
        // P1 gets Bye
        m.winnerId = m.player1Id;
        m.status = 'bye';
        if (m.nextMatchId) {
          const nextM = matchMap.get(m.nextMatchId);
          if (nextM) {
            if (m.nextMatchSlot === 1) nextM.player1Id = m.player1Id;
            else if (m.nextMatchSlot === 2) nextM.player2Id = m.player1Id;
          }
        }
      } else if (!m.player1Id && m.player2Id) {
        // P2 gets Bye
        m.winnerId = m.player2Id;
        m.status = 'bye';
        if (m.nextMatchId) {
          const nextM = matchMap.get(m.nextMatchId);
          if (nextM) {
            if (m.nextMatchSlot === 1) nextM.player1Id = m.player2Id;
            else if (m.nextMatchSlot === 2) nextM.player2Id = m.player2Id;
          }
        }
      }
    }
  });

  const tournament: Tournament = {
    id: `tour_${Date.now()}`,
    name,
    targetSize,
    matchTargetScore: targetScore,
    status: 'in_progress',
    createdAt: Date.now(),
    startedAt: Date.now(),
    seedMode,
    seedCount,
    players: processedPlayers,
    matches
  };

  return tournament;
}

/**
 * Updates a match result and advances winner and loser appropriately
 */
export function recordMatchResult(
  tournament: Tournament,
  matchId: string,
  player1Score: number,
  player2Score: number,
  roundsHistory: Match['roundsHistory']
): Tournament {
  const matchMap = new Map<string, Match>();
  tournament.matches.forEach((m) => matchMap.set(m.id, { ...m }));

  const currentMatch = matchMap.get(matchId);
  if (!currentMatch) return tournament;

  currentMatch.player1Score = player1Score;
  currentMatch.player2Score = player2Score;
  currentMatch.roundsHistory = roundsHistory;

  if (player1Score === player2Score) {
    // Incomplete or tie
    currentMatch.status = 'in_progress';
    currentMatch.winnerId = null;
    currentMatch.loserId = null;
  } else {
    currentMatch.status = 'completed';
    if (player1Score > player2Score) {
      currentMatch.winnerId = currentMatch.player1Id;
      currentMatch.loserId = currentMatch.player2Id;
    } else {
      currentMatch.winnerId = currentMatch.player2Id;
      currentMatch.loserId = currentMatch.player1Id;
    }

    // Advance winner to next match
    if (currentMatch.nextMatchId && currentMatch.winnerId) {
      const nextMatch = matchMap.get(currentMatch.nextMatchId);
      if (nextMatch) {
        if (currentMatch.nextMatchSlot === 1) {
          nextMatch.player1Id = currentMatch.winnerId;
        } else if (currentMatch.nextMatchSlot === 2) {
          nextMatch.player2Id = currentMatch.winnerId;
        }
      }
    }

    // Advance loser if semi-final to 3rd place match
    if (currentMatch.loserNextMatchId && currentMatch.loserId) {
      const loserMatch = matchMap.get(currentMatch.loserNextMatchId);
      if (loserMatch) {
        if (currentMatch.loserNextMatchSlot === 1) {
          loserMatch.player1Id = currentMatch.loserId;
        } else if (currentMatch.loserNextMatchSlot === 2) {
          loserMatch.player2Id = currentMatch.loserId;
        }
      }
    }
  }

  // Check rankings if Grand Final and 3rd Place are completed
  const grandFinal = matchMap.get('match_final_grand');
  const thirdPlace = matchMap.get('match_final_third_place');
  const playerMap = new Map<string, Player>();
  tournament.players.forEach((p) => playerMap.set(p.id, p));

  let rankings = tournament.rankings;
  let tournamentStatus = tournament.status;

  if (grandFinal && grandFinal.status === 'completed' && grandFinal.winnerId && grandFinal.loserId) {
    const champion = playerMap.get(grandFinal.winnerId);
    const runnerUp = playerMap.get(grandFinal.loserId);
    let thirdPlacePlayer: Player | undefined;
    let fourthPlacePlayer: Player | undefined;

    if (thirdPlace && thirdPlace.status === 'completed' && thirdPlace.winnerId && thirdPlace.loserId) {
      thirdPlacePlayer = playerMap.get(thirdPlace.winnerId);
      fourthPlacePlayer = playerMap.get(thirdPlace.loserId);
      tournamentStatus = 'completed';
    }

    rankings = {
      champion,
      runnerUp,
      thirdPlace: thirdPlacePlayer,
      fourthPlace: fourthPlacePlayer
    };
  }

  return {
    ...tournament,
    status: tournamentStatus,
    completedAt: tournamentStatus === 'completed' ? Date.now() : tournament.completedAt,
    matches: Array.from(matchMap.values()),
    rankings
  };
}
