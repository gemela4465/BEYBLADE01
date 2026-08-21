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
 * Generates all matches for a Dual-Wing Tournament Bracket.
 * If approved players < targetSize, automatically generates Reserve Players (預備選手 1..N),
 * and places pairs of reserves into the tail matches of Round 1 across Left and Right wings.
 */
export function generateDualWingBracket(
  name: string,
  targetSize: TournamentSize,
  players: Player[],
  seedMode: 'none' | 'manual' | 'random',
  seedCount: number,
  targetScore: number = 4
): Tournament {
  // 1. Separate regular approved players from any old reserve placeholders
  const regularApprovedPlayers = players.filter((p) => p.status === 'approved' && !p.isReserve);
  
  // 2. If approved regular players < targetSize, automatically generate reserve players
  const reservesNeeded = Math.max(0, targetSize - regularApprovedPlayers.length);
  const reservePlayers: Player[] = [];

  for (let i = 1; i <= reservesNeeded; i++) {
    reservePlayers.push({
      id: `player_reserve_${i}_${Date.now()}`,
      name: `預備選手 ${i}`,
      beybladeName: '預備陀螺 (待定)',
      beybladeType: 'balance',
      clubOrTeam: '大會預備席 (可敗部復活)',
      status: 'approved',
      registeredAt: Date.now() + i,
      isSeed: false,
      isReserve: true,
      reserveIndex: i
    });
  }

  const processedRegularPlayers = [...regularApprovedPlayers];

  // 3. Handle seeds among regular players
  if (seedMode === 'random') {
    const shuffled = [...processedRegularPlayers].sort(() => Math.random() - 0.5);
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
    processedRegularPlayers.forEach((p) => {
      p.isSeed = false;
      p.seedNumber = undefined;
    });
  }

  // 4. Setup Round 1 match slots for Left and Right wings
  const halfSize = targetSize / 2; // e.g. 8 for 16-size
  const r1MatchCountPerWing = halfSize / 2; // e.g. 4 for 16-size (matches 0, 1, 2, 3)

  // Initialize R1 match slot arrays
  // Left: array of [slot1: Player | null, slot2: Player | null] for each R1 match
  const leftR1Slots: [Player | null, Player | null][] = Array.from(
    { length: r1MatchCountPerWing },
    () => [null, null]
  );
  const rightR1Slots: [Player | null, Player | null][] = Array.from(
    { length: r1MatchCountPerWing },
    () => [null, null]
  );

  // 5. Place Reserve Players into the LAST matches of Round 1 in Left & Right wings
  // Priority order for tail matches:
  // 1: Left wing match (r1MatchCountPerWing - 1)
  // 2: Right wing match (r1MatchCountPerWing - 1)
  // 3: Left wing match (r1MatchCountPerWing - 2)
  // 4: Right wing match (r1MatchCountPerWing - 2)
  // ...
  const tailMatchQueue: { wing: 'left' | 'right'; matchIdx: number }[] = [];
  for (let offset = 1; offset <= r1MatchCountPerWing; offset++) {
    const mIdx = r1MatchCountPerWing - offset;
    tailMatchQueue.push({ wing: 'left', matchIdx: mIdx });
    tailMatchQueue.push({ wing: 'right', matchIdx: mIdx });
  }

  let reservePtr = 0;
  const numPairs = Math.floor(reservesNeeded / 2);
  const hasOddReserve = reservesNeeded % 2 === 1;

  // Assign full pairs of reserves to tail matches (Reserve A vs Reserve B)
  for (let p = 0; p < numPairs; p++) {
    const target = tailMatchQueue[p];
    if (target) {
      const res1 = reservePlayers[reservePtr++];
      const res2 = reservePlayers[reservePtr++];
      if (target.wing === 'left') {
        leftR1Slots[target.matchIdx] = [res1, res2];
      } else {
        rightR1Slots[target.matchIdx] = [res1, res2];
      }
    }
  }

  // If odd number of reserves, place the single reserve in Slot 2 of the next tail match
  // (leaving Slot 1 open to be matched with a seed or regular player)
  if (hasOddReserve && reservePtr < reservePlayers.length) {
    const target = tailMatchQueue[numPairs];
    if (target) {
      const oddRes = reservePlayers[reservePtr++];
      if (target.wing === 'left') {
        leftR1Slots[target.matchIdx][1] = oddRes;
      } else {
        rightR1Slots[target.matchIdx][1] = oddRes;
      }
    }
  }

  // 6. Fill remaining open slots with regular / seeded players
  const seededPlayers = processedRegularPlayers
    .filter((p) => p.isSeed && p.seedNumber && p.seedNumber <= targetSize)
    .sort((a, b) => (a.seedNumber || 0) - (b.seedNumber || 0));

  const unseededPlayers = processedRegularPlayers.filter((p) => !p.isSeed || !p.seedNumber);
  const shuffledUnseeded = [...unseededPlayers].sort(() => Math.random() - 0.5);

  // Preferred seed slots order across Left & Right wings
  // Seed 1 -> Left Match 0 Slot 1
  // Seed 2 -> Right Match 0 Slot 1
  // Seed 3 -> Left Match 1 Slot 1 (or Left Match (L-1) Slot 1 if open)
  // Seed 4 -> Right Match 1 Slot 1
  const seedSlotsPriority: { wing: 'left' | 'right'; matchIdx: number; slot: 0 | 1 }[] = [];
  
  // Top seeds go to top of brackets
  seedSlotsPriority.push({ wing: 'left', matchIdx: 0, slot: 0 });
  seedSlotsPriority.push({ wing: 'right', matchIdx: 0, slot: 0 });
  for (let m = 1; m < r1MatchCountPerWing; m++) {
    seedSlotsPriority.push({ wing: 'left', matchIdx: m, slot: 0 });
    seedSlotsPriority.push({ wing: 'right', matchIdx: m, slot: 0 });
  }

  // Place seeds into open priority slots
  let seedPtr = 0;
  for (const sPos of seedSlotsPriority) {
    if (seedPtr >= seededPlayers.length) break;
    const currentSlot = sPos.wing === 'left' ? leftR1Slots[sPos.matchIdx][sPos.slot] : rightR1Slots[sPos.matchIdx][sPos.slot];
    if (!currentSlot) {
      if (sPos.wing === 'left') {
        leftR1Slots[sPos.matchIdx][sPos.slot] = seededPlayers[seedPtr++];
      } else {
        rightR1Slots[sPos.matchIdx][sPos.slot] = seededPlayers[seedPtr++];
      }
    }
  }

  // If any seeds left over (unlikely), place them in any open slot
  while (seedPtr < seededPlayers.length) {
    let placed = false;
    for (let m = 0; m < r1MatchCountPerWing && !placed; m++) {
      for (const slot of [0, 1] as const) {
        if (!leftR1Slots[m][slot]) {
          leftR1Slots[m][slot] = seededPlayers[seedPtr++];
          placed = true;
          break;
        }
        if (!rightR1Slots[m][slot]) {
          rightR1Slots[m][slot] = seededPlayers[seedPtr++];
          placed = true;
          break;
        }
      }
    }
    if (!placed) break;
  }

  // Fill all remaining open slots with unseeded regular players
  let unseededPtr = 0;
  for (let m = 0; m < r1MatchCountPerWing; m++) {
    for (const slot of [0, 1] as const) {
      if (!leftR1Slots[m][slot] && unseededPtr < shuffledUnseeded.length) {
        leftR1Slots[m][slot] = shuffledUnseeded[unseededPtr++];
      }
      if (!rightR1Slots[m][slot] && unseededPtr < shuffledUnseeded.length) {
        rightR1Slots[m][slot] = shuffledUnseeded[unseededPtr++];
      }
    }
  }

  // 7. Flatten R1 slots for Wing match generator
  const leftSlots: (Player | null)[] = [];
  leftR1Slots.forEach(([p1, p2]) => {
    leftSlots.push(p1, p2);
  });

  const rightSlots: (Player | null)[] = [];
  rightR1Slots.forEach(([p1, p2]) => {
    rightSlots.push(p1, p2);
  });

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

  // Combine regular approved players with the newly created reserve players
  const allTournamentPlayers = [...processedRegularPlayers, ...reservePlayers];

  // Process initial BYEs only if there are genuine unassigned slots (with reserves filling targetSize, there are no unassigned slots)
  const matchMap = new Map<string, Match>();
  matches.forEach((m) => matchMap.set(m.id, m));

  matches.forEach((m) => {
    if (m.round === 1) {
      if (m.player1Id && !m.player2Id) {
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
    players: allTournamentPlayers,
    matches
  };

  return tournament;
}

/**
 * Returns all regular players who have lost in any completed match and are eligible for Repechage (敗部復活)
 */
export function getEligibleRepechagePlayers(tournament: Tournament): {
  player: Player;
  lostInMatchLabel: string;
  matchNumber: number;
  matchId: string;
  scoreSummary: string;
}[] {
  const playerMap = new Map<string, Player>();
  tournament.players.forEach((p) => playerMap.set(p.id, p));

  const eligible: {
    player: Player;
    lostInMatchLabel: string;
    matchNumber: number;
    matchId: string;
    scoreSummary: string;
  }[] = [];

  const seenPlayerIds = new Set<string>();

  // Find all matches that completed with a loserId
  tournament.matches.forEach((m) => {
    if (m.status === 'completed' && m.loserId) {
      const loser = playerMap.get(m.loserId);
      // Only regular non-reserve players or previously revived players who were eliminated
      if (loser && !loser.isReserve && !seenPlayerIds.has(loser.id)) {
        seenPlayerIds.add(loser.id);
        const p1Score = m.player1Score;
        const p2Score = m.player2Score;
        const loserScore = m.loserId === m.player1Id ? p1Score : p2Score;
        const winnerScore = m.loserId === m.player1Id ? p2Score : p1Score;

        eligible.push({
          player: loser,
          lostInMatchLabel: m.label,
          matchNumber: m.matchNumber,
          matchId: m.id,
          scoreSummary: `${loserScore} : ${winnerScore}`
        });
      }
    }
  });

  return eligible;
}

/**
 * Substitutes a player (e.g. reserve slot) in an uncompleted match with a repechage / substitute player
 */
export function substitutePlayerInMatch(
  tournament: Tournament,
  matchId: string,
  slot: 1 | 2,
  newPlayer: Player,
  isRepechage: boolean = true
): Tournament {
  const updatedMatches = tournament.matches.map((m) => {
    if (m.id === matchId && m.status !== 'completed') {
      const updatedMatch = { ...m };
      if (slot === 1) {
        updatedMatch.player1Id = newPlayer.id;
      } else {
        updatedMatch.player2Id = newPlayer.id;
      }
      return updatedMatch;
    }
    return m;
  });

  // Check if player exists in tournament.players or needs to be added / updated
  const playerExists = tournament.players.some((p) => p.id === newPlayer.id);
  let updatedPlayers = [...tournament.players];

  if (!playerExists) {
    updatedPlayers.push({
      ...newPlayer,
      isRepechage
    });
  } else {
    updatedPlayers = updatedPlayers.map((p) => {
      if (p.id === newPlayer.id) {
        return {
          ...p,
          isRepechage: isRepechage || p.isRepechage
        };
      }
      return p;
    });
  }

  return {
    ...tournament,
    players: updatedPlayers,
    matches: updatedMatches
  };
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
