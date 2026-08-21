import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

interface Player {
  id: string;
  name: string;
  seedRank?: number;
  seedNumber?: number;
  isSeed?: boolean;
  isReserve?: boolean;
  reserveIndex?: number;
  score?: number;
  totalPointsScored?: number;
  status: 'pending' | 'approved' | 'rejected';
  registeredAt?: number;
  lineId?: string;
  registeredByLineId?: string;
  registeredInGroupId?: string;
  notificationSent?: boolean;
  isProxy?: boolean;
  beybladeName?: string;
  beybladeType?: any;
  customCombo?: string;
  blade?: string;
  clubOrTeam?: string;
  teamName?: string;
  notes?: string;
  pendingCancelConfirm?: boolean;
}

interface Match {
  id: string;
  matchNumber: number;
  round: number;
  wing: 'left' | 'right' | 'final' | 'third_place';
  roundName: string;
  label: string;
  player1Id: string | null;
  player2Id: string | null;
  score1: number;
  score2: number;
  winnerId: string | null;
  loserId: string | null;
  status: 'pending' | 'ready' | 'in_progress' | 'completed' | 'bye';
  nextMatchId: string | null;
  nextMatchSlot: 1 | 2 | null;
  targetScore: number;
  roundsHistory: any[];
}

interface Tournament {
  id: string;
  name: string;
  datePrefix?: string;
  sessionNumber?: string;
  customTitle?: string;
  startTime?: string;
  registrationDeadline?: string;
  targetSize: number;
  matchTargetScore: number;
  seedMode: 'none' | 'manual' | 'random';
  seedCount: number;
  status: 'setup' | 'registration' | 'in_progress' | 'completed' | 'cancelled';
  players: Player[];
  matches: Match[];
  rankings?: {
    champion: Player | null;
    runnerUp: Player | null;
    thirdPlace: Player | null;
    fourthPlace: Player | null;
  };
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  isArchived?: boolean;
  archivedAt?: number;
  archiveNote?: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const DB_FILE = path.join(DATA_DIR, "tournaments.json");
const HISTORY_FILE = path.join(DATA_DIR, "tournaments_history.json");
const GROUPS_FILE = path.join(DATA_DIR, "line_groups.json");
const ACTIVE_FILE = path.join(DATA_DIR, "active_tournament.json");

// Ensure data & uploads directories exist
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error("Failed to create data directory:", err);
  }
}
if (!fs.existsSync(UPLOADS_DIR)) {
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch (err) {
    console.error("Failed to create uploads directory:", err);
  }
}

// In-memory cache + file backing
let tournamentsDb: Record<string, Tournament> = {};
let tournamentsHistoryDb: Record<string, Tournament> = {};
let connectedLineGroups: Record<string, {
  id: string;
  name?: string;
  type: 'group' | 'room' | 'user';
  joinedAt: number;
  lastActiveAt: number;
  messageCount: number;
}> = {};
let currentActiveTournamentId: string | null = null;

function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      tournamentsDb = JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading database file:", err);
    tournamentsDb = {};
  }

  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const histData = fs.readFileSync(HISTORY_FILE, "utf-8");
      tournamentsHistoryDb = JSON.parse(histData);
    }
  } catch (err) {
    console.error("Error reading history database file:", err);
    tournamentsHistoryDb = {};
  }

  try {
    if (fs.existsSync(GROUPS_FILE)) {
      const groupsData = fs.readFileSync(GROUPS_FILE, "utf-8");
      connectedLineGroups = JSON.parse(groupsData);
    }
  } catch (err) {
    console.error("Error reading line groups file:", err);
    connectedLineGroups = {};
  }

  try {
    if (fs.existsSync(ACTIVE_FILE)) {
      const activeData = fs.readFileSync(ACTIVE_FILE, "utf-8");
      const parsed = JSON.parse(activeData);
      currentActiveTournamentId = parsed.activeId || null;
    }
  } catch (err) {
    console.error("Error reading active tournament file:", err);
  }
}

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(tournamentsDb, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing database file:", err);
  }
}

function saveHistoryDb() {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(tournamentsHistoryDb, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing history database file:", err);
  }
}

function saveGroupsDb() {
  try {
    fs.writeFileSync(GROUPS_FILE, JSON.stringify(connectedLineGroups, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing groups database file:", err);
  }
}

function saveActiveTournamentFile() {
  try {
    fs.writeFileSync(ACTIVE_FILE, JSON.stringify({ activeId: currentActiveTournamentId, updatedAt: Date.now() }, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing active tournament file:", err);
  }
}

function recordConnectedGroup(id: string, type: 'group' | 'room' | 'user', name?: string) {
  if (!id) return;
  const existing = connectedLineGroups[id];
  const now = Date.now();
  connectedLineGroups[id] = {
    id,
    type,
    name: name || existing?.name || (type === 'group' ? `LINE 陀螺對戰群 (${id.substring(0, 8)})` : type === 'room' ? `LINE 聊天室 (${id.substring(0, 8)})` : `LINE 用戶 (${id.substring(0, 8)})`),
    joinedAt: existing?.joinedAt || now,
    lastActiveAt: now,
    messageCount: (existing?.messageCount || 0) + 1
  };
  saveGroupsDb();
}

loadDb();

// Helper: Format default timing strings
function getDefaultTimes() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const datePrefix = `${year}${month}${day}`;
  
  const startHour = String((now.getHours() + 2) % 24).padStart(2, '0');
  const deadlineHour = String((now.getHours() + 1) % 24).padStart(2, '0');
  
  const startTime = `${year}/${month}/${day} ${startHour}:00`;
  const registrationDeadline = `${year}/${month}/${day} ${deadlineHour}:00`;
  
  return { datePrefix, startTime, registrationDeadline };
}


async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "25mb" }));

  // Serve static uploaded bracket images for LINE messaging API
  app.use("/uploads", express.static(UPLOADS_DIR));

  // Upload bracket snapshot image for LINE image message broadcast
  app.post("/api/upload-bracket-image", (req, res) => {
    const { imageBase64, filename } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({ error: "imageBase64 is required" });
    }

    try {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(cleanBase64, "base64");
      const safeFilename = filename 
        ? `${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, "")}`
        : `bracket_${Date.now()}.png`;
      const filePath = path.join(UPLOADS_DIR, safeFilename);

      fs.writeFileSync(filePath, buffer);

      // Determine public base URL (handling forwarded proto/host from Render / proxies)
      const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
      const host = req.headers["x-forwarded-host"] || req.headers.host || "beyblade-4qyw.onrender.com";
      const imageUrl = `${protocol}://${host}/uploads/${safeFilename}`;

      res.json({
        success: true,
        filename: safeFilename,
        imageUrl
      });
    } catch (err) {
      console.error("[Upload Image Error]", err);
      res.status(500).json({ error: "Failed to save image" });
    }
  });

  // API Routes
  app.get("/api/health", (_req, res) => {
    res.json({ 
      status: "ok", 
      tournamentCount: Object.keys(tournamentsDb).length,
      historyCount: Object.keys(tournamentsHistoryDb).length
    });
  });

  // Get all tournaments
  app.get("/api/tournaments", (_req, res) => {
    res.json(Object.values(tournamentsDb));
  });

  // Get history / archived tournaments (Requirement 6)
  app.get("/api/tournaments/history", (_req, res) => {
    res.json(Object.values(tournamentsHistoryDb).sort((a, b) => (b.archivedAt || b.createdAt) - (a.archivedAt || a.createdAt)));
  });

  // Get single tournament by ID
  app.get("/api/tournaments/:id", (req, res) => {
    const { id } = req.params;
    const tournament = tournamentsDb[id] || tournamentsHistoryDb[id];
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }
    res.json(tournament);
  });

  // Create or full save tournament (Requirement 1 & 1.1)
  app.post("/api/tournaments", async (req, res) => {
    const incoming: Partial<Tournament> = req.body;
    if (!incoming || !incoming.id) {
      return res.status(400).json({ error: "Invalid tournament data" });
    }

    const defaultTimes = getDefaultTimes();
    const datePrefix = incoming.datePrefix || defaultTimes.datePrefix;
    const sessionNumber = incoming.sessionNumber || "第1場";
    const customTitle = incoming.customTitle || incoming.name || "戰鬥陀螺 X 雙翼極限爭霸賽";
    
    // Standard formatted name: Date + Session + CustomTitle (e.g. 20260821-第1場-戰鬥陀螺 X 雙翼極限爭霸賽)
    const formattedName = incoming.name?.includes(sessionNumber) && incoming.name?.includes(datePrefix)
      ? incoming.name
      : `${datePrefix}-${sessionNumber}-${customTitle}`;

    const tournament: Tournament = {
      id: incoming.id,
      name: formattedName,
      datePrefix,
      sessionNumber,
      customTitle,
      startTime: incoming.startTime || defaultTimes.startTime,
      registrationDeadline: incoming.registrationDeadline || defaultTimes.registrationDeadline,
      targetSize: incoming.targetSize || 16,
      matchTargetScore: incoming.matchTargetScore || 4,
      seedMode: incoming.seedMode || "manual",
      seedCount: incoming.seedCount || 4,
      status: incoming.status || "registration",
      players: Array.isArray(incoming.players) ? incoming.players : [],
      matches: Array.isArray(incoming.matches) ? incoming.matches : [],
      rankings: incoming.rankings,
      createdAt: incoming.createdAt || Date.now(),
      startedAt: incoming.startedAt,
      completedAt: incoming.completedAt,
      isArchived: incoming.isArchived || false
    };

    // Preserve existing registered players if updating tournament
    const existing = tournamentsDb[tournament.id];
    if (existing && existing.players && tournament.players) {
      const playerMap = new Map<string, Player>();
      tournament.players.forEach((p) => playerMap.set(p.id, p));
      existing.players.forEach((p) => {
        if (!playerMap.has(p.id)) {
          playerMap.set(p.id, p);
        }
      });
      tournament.players = Array.from(playerMap.values());
    }

    tournamentsDb[tournament.id] = tournament;
    saveDb();

    console.log(`[Tournament Created/Saved] ${tournament.name} (ID: ${tournament.id})`);
    res.json(tournament);
  });

  // Archive tournament for records (Requirement 6)
  app.post("/api/tournaments/:id/archive", (req, res) => {
    const { id } = req.params;
    const { note } = req.body || {};
    const tournament = tournamentsDb[id];
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    tournament.isArchived = true;
    tournament.archivedAt = Date.now();
    if (note) tournament.archiveNote = note;

    tournamentsHistoryDb[id] = JSON.parse(JSON.stringify(tournament));
    saveHistoryDb();
    saveDb();

    console.log(`[Tournament Archived] Archived tournament "${tournament.name}" (ID: ${id})`);
    res.json({ success: true, tournament });
  });

  // Reset or restart tournament before match (Requirement 7)
  app.post("/api/tournaments/:id/reset", (req, res) => {
    const { id } = req.params;
    const { keepApproved, newSessionNumber, newCustomTitle, newStartTime, newDeadline } = req.body || {};
    const tournament = tournamentsDb[id];
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    const defaultTimes = getDefaultTimes();
    if (newSessionNumber) tournament.sessionNumber = newSessionNumber;
    if (newCustomTitle) tournament.customTitle = newCustomTitle;
    if (newStartTime) tournament.startTime = newStartTime;
    if (newDeadline) tournament.registrationDeadline = newDeadline;

    const datePrefix = tournament.datePrefix || defaultTimes.datePrefix;
    const sessionNum = tournament.sessionNumber || "第1場";
    const customTitle = tournament.customTitle || "戰鬥陀螺 X 雙翼極限爭霸賽";
    tournament.name = `${datePrefix}-${sessionNum}-${customTitle}`;

    // Filter players based on keepApproved option (excluding any reserve players)
    if (keepApproved) {
      tournament.players = (tournament.players || []).filter(
        (p) => p.status === "approved" && !p.isReserve && !p.id.startsWith("player_reserve_")
      );
      // Reset match states on players
      tournament.players.forEach((p) => {
        p.score = 0;
        p.totalPointsScored = 0;
        p.pendingCancelConfirm = false;
      });
    } else {
      tournament.players = [];
    }

    tournament.matches = [];
    tournament.rankings = undefined;
    tournament.status = "registration";
    tournament.startedAt = undefined;
    tournament.completedAt = undefined;

    saveDb();
    console.log(`[Tournament Reset] Tournament ${id} reset. KeepApproved: ${keepApproved}. Players remaining: ${tournament.players.length}`);
    res.json({ success: true, tournament });
  });

  // Delete tournament
  app.delete("/api/tournaments/:id", (req, res) => {
    const { id } = req.params;
    let deleted = false;
    if (tournamentsDb[id]) {
      delete tournamentsDb[id];
      saveDb();
      deleted = true;
    }
    if (tournamentsHistoryDb[id]) {
      delete tournamentsHistoryDb[id];
      saveHistoryDb();
      deleted = true;
    }

    if (!deleted) {
      return res.status(404).json({ error: "Tournament not found" });
    }
    res.json({ success: true, message: "Tournament deleted" });
  });

  // Update tournament
  app.put("/api/tournaments/:id", (req, res) => {
    const { id } = req.params;
    const tournament: Tournament = req.body;
    if (!tournament || tournament.id !== id) {
      return res.status(400).json({ error: "ID mismatch or invalid payload" });
    }

    const existing = tournamentsDb[id];
    if (existing && existing.players && tournament.players) {
      const playerMap = new Map<string, Player>();
      tournament.players.forEach((p) => playerMap.set(p.id, p));
      existing.players.forEach((p) => {
        if (!playerMap.has(p.id)) {
          playerMap.set(p.id, p);
        }
      });
      tournament.players = Array.from(playerMap.values());
    }

    tournamentsDb[id] = tournament;
    saveDb();
    res.json(tournament);
  });

  // Register player endpoint (dedicated endpoint for LINE invitees)
  app.post("/api/tournaments/:id/register", (req, res) => {
    const { id } = req.params;
    const { player, tournamentFallback } = req.body;

    if (!player || !player.name) {
      return res.status(400).json({ error: "Player name is required" });
    }

    let tournament = tournamentsDb[id];

    // If tournament not found on server yet, initialize from fallback metadata
    if (!tournament && tournamentFallback) {
      tournament = {
        ...tournamentFallback,
        id,
        players: tournamentFallback.players || [],
        matches: tournamentFallback.matches || [],
        createdAt: tournamentFallback.createdAt || Date.now()
      };
      tournamentsDb[id] = tournament;
    }

    if (!tournament) {
      const defaultTimes = getDefaultTimes();
      tournament = {
        id,
        name: `${defaultTimes.datePrefix}-第1場-戰鬥陀螺 X 雙翼爭霸賽`,
        datePrefix: defaultTimes.datePrefix,
        sessionNumber: "第1場",
        customTitle: "戰鬥陀螺 X 雙翼爭霸賽",
        startTime: defaultTimes.startTime,
        registrationDeadline: defaultTimes.registrationDeadline,
        targetSize: 16,
        matchTargetScore: 4,
        seedMode: "manual",
        seedCount: 4,
        status: "registration",
        players: [],
        matches: [],
        createdAt: Date.now()
      };
      tournamentsDb[id] = tournament;
    }

    // Ensure players array exists
    if (!Array.isArray(tournament.players)) {
      tournament.players = [];
    }

    // Check if registration deadline passed
    const isDeadlinePassed = checkDeadlinePassed(tournament.registrationDeadline);
    if (isDeadlinePassed) {
      return res.status(400).json({ 
        error: "Registration deadline has passed",
        registrationDeadline: tournament.registrationDeadline
      });
    }

    // Check if player already registered with same ID or same name/lineId
    const existingIndex = tournament.players.findIndex(
      (p) => p.id === player.id || (player.name && p.name.toLowerCase() === player.name.trim().toLowerCase() && player.lineId && p.lineId === player.lineId)
    );

    const newPlayer: Player = {
      id: player.id || `p_line_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: player.name.trim(),
      score: 0,
      totalPointsScored: 0,
      status: 'pending',
      registeredAt: player.registeredAt || Date.now(),
      lineId: player.lineId ? player.lineId.trim() : undefined,
      registeredByLineId: player.registeredByLineId ? player.registeredByLineId.trim() : undefined,
      isProxy: !!player.isProxy,
      beybladeName: player.beybladeName ? player.beybladeName.trim() : '未指定陀螺',
      beybladeType: player.beybladeType || 'attack',
      blade: player.blade || player.customCombo || '9-60GF',
      customCombo: player.blade || player.customCombo || '9-60GF',
      clubOrTeam: player.clubOrTeam || 'LINE 群組報名',
      teamName: player.clubOrTeam || 'LINE 群組報名',
      notes: player.notes ? player.notes.trim() : undefined,
      isSeed: false
    };

    if (existingIndex >= 0) {
      // Update existing registration
      tournament.players[existingIndex] = {
        ...tournament.players[existingIndex],
        ...newPlayer,
        id: tournament.players[existingIndex].id
      };
    } else {
      tournament.players.push(newPlayer);
    }

    saveDb();
    console.log(`[LINE Registration] Player ${newPlayer.name} registered to tournament ${id}. Total players: ${tournament.players.length}`);
    res.json({ success: true, player: newPlayer, tournament });
  });

  // Helper to check if deadline passed
  function checkDeadlinePassed(deadlineStr?: string): boolean {
    if (!deadlineStr) return false;
    try {
      // Standardize format: "2026/08/21 18:00" -> "2026-08-21T18:00:00"
      const normalized = deadlineStr.replace(/\//g, "-").replace(" ", "T");
      const deadlineDate = new Date(normalized);
      if (isNaN(deadlineDate.getTime())) return false;
      return Date.now() > deadlineDate.getTime();
    } catch {
      return false;
    }
  }

  // Set active tournament for LINE bot interactions
  app.post("/api/tournaments/:id/set-active", (req, res) => {
    const { id } = req.params;
    if (tournamentsDb[id]) {
      currentActiveTournamentId = id;
      saveActiveTournamentFile();
      console.log(`[LINE Bot Active Tournament] Switched active tournament to: ${tournamentsDb[id].name} (ID: ${id})`);
      return res.json({ success: true, activeTournamentId: id, tournament: tournamentsDb[id] });
    }
    return res.status(404).json({ error: "Tournament not found" });
  });

  // Approve / Reject / Update player status with automatic LINE Push Notification to user & group
  app.patch("/api/tournaments/:id/players/:playerId", async (req, res) => {
    const { id, playerId } = req.params;
    const { status, isSeed, seedRank, sendLineNotification = true } = req.body;

    const tournament = tournamentsDb[id];
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    const player = tournament.players.find((p) => p.id === playerId);
    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    const previousStatus = player.status;
    if (status) player.status = status;
    if (typeof isSeed === "boolean") player.isSeed = isSeed;
    if (typeof seedRank === "number") player.seedRank = seedRank;
    player.pendingCancelConfirm = false;

    // Send LINE Push notification if newly approved
    let notificationSent = false;
    let groupNotificationSent = false;
    if (status === 'approved' && previousStatus !== 'approved' && sendLineNotification) {
      const recipientLineId = player.lineId || player.registeredByLineId;
      const approvedNoticeText = `🎉【審核通過通知】\n恭喜 選手「${player.name}」！\n🏆 賽事：${tournament.name}\n📌 狀態：✅ 已通過主辦方審核，正式排入雙翼賽程！\n⏰ 開賽時間：${tournament.startTime || '即將開賽'}\n🔥 祝您旗開得勝，勇奪冠軍！`;

      // 1. Send 1-on-1 push to player if they have a real LINE user ID
      if (recipientLineId && recipientLineId.startsWith("U")) {
        notificationSent = await sendLinePushMessage(recipientLineId, approvedNoticeText);
      }

      // 2. Also send notification to the LINE group where the player registered, or active groups
      const targetGroupId = player.registeredInGroupId;
      if (targetGroupId) {
        const groupNoticeText = `📢【選手審核通過公告】\n恭喜 選手「${player.name}」已通過主辦方審核，正式排入雙翼賽程！\n🏆 賽事：${tournament.name}\n⏰ 開賽時間：${tournament.startTime || '即將開賽'}\n🔥 目前正式核准名單：${tournament.players.filter(p => p.status === 'approved').length}/${tournament.targetSize} 人`;
        groupNotificationSent = await sendLinePushToGroup(targetGroupId, groupNoticeText);
      }

      player.notificationSent = notificationSent || groupNotificationSent;
    }

    saveDb();
    res.json({ success: true, player, tournament, notificationSent, groupNotificationSent });
  });

  // Approve ALL pending players in batch and send LINE notifications to users and groups
  app.post("/api/tournaments/:id/players/approve-all", async (req, res) => {
    const { id } = req.params;
    const tournament = tournamentsDb[id];
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    const pendingPlayers = (tournament.players || []).filter((p) => p.status === 'pending');
    if (pendingPlayers.length === 0) {
      return res.json({ success: true, approvedCount: 0, message: "No pending players to approve", tournament });
    }

    let notificationsSentCount = 0;
    const newlyApprovedNames: string[] = [];

    for (const player of pendingPlayers) {
      player.status = 'approved';
      player.pendingCancelConfirm = false;
      newlyApprovedNames.push(player.name);

      const recipientLineId = player.lineId || player.registeredByLineId;
      if (recipientLineId && recipientLineId.startsWith("U")) {
        const notice = `🎉【審核通過通知】\n恭喜 選手「${player.name}」！\n🏆 賽事：${tournament.name}\n📌 狀態：✅ 已通過主辦方審核，正式排入雙翼賽程！\n⏰ 開賽時間：${tournament.startTime || '即將開賽'}\n🔥 祝您旗開得勝，勇奪冠軍！`;
        const sent = await sendLinePushMessage(recipientLineId, notice);
        if (sent) {
          player.notificationSent = true;
          notificationsSentCount++;
        }
      }
    }

    // Push batch announcement to all connected groups & rooms
    const totalApproved = tournament.players.filter((p) => p.status === 'approved').length;
    const groupAnnouncement = `🎉【選手名單全體審核通過公告】\n🏆 賽事場次：${tournament.name}\n✅ 本次審核通過名單 (${newlyApprovedNames.length}人)：\n${newlyApprovedNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}\n\n📌 目前正式參賽總人數：${totalApproved} / ${tournament.targetSize} 人\n⏰ 開賽時間：${tournament.startTime || '即將開賽'}\n🔥 請各位選手做好熱身，準備開戰！`;
    
    await broadcastToAllGroupsAndFollowers(groupAnnouncement);

    saveDb();
    console.log(`[Batch Approve] Approved ${pendingPlayers.length} players for tournament ${id}. Individual notices sent: ${notificationsSentCount}`);

    res.json({
      success: true,
      approvedCount: pendingPlayers.length,
      notificationsSentCount,
      tournament
    });
  });

  // Broadcast tournament open announcement to LINE (Requirement 1 & Resend capability)
  app.post("/api/tournaments/:id/broadcast-open", async (req, res) => {
    const { id } = req.params;
    const { customAnnouncement } = req.body || {};
    const tournament = tournamentsDb[id];
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    currentActiveTournamentId = id;
    saveActiveTournamentFile();

    const approvedCount = (tournament.players || []).filter((p) => p.status === 'approved').length;
    const remainingSlots = Math.max(0, tournament.targetSize - approvedCount);

    const announcementText = customAnnouncement || `📢【新賽程開賽公告通知】\n🏆 賽事場次：${tournament.name}\n⚡ 賽制規模：${tournament.targetSize} 人雙翼極限爭霸（${tournament.matchTargetScore} 分制）\n⏰ 開賽時間：${tournament.startTime || '依大會公布'}\n⏳ 報名截止時間：${tournament.registrationDeadline || '額滿為止'}\n🔥 剩餘名額：${remainingSlots} 位\n\n📝 LINE 群組快速報名指令：\n• 本人報名：傳送「+1 選手簡稱 陀螺名稱」\n• 替人代報：傳送「++1 選手簡稱 陀螺名稱」\n• 取消報名：傳送「-1 選手簡稱」\n• 查詢榜單：傳送「查榜」\n\n歡迎各位陀螺手即刻卡位報名！`;

    const broadcastResult = await broadcastToAllGroupsAndFollowers(announcementText);
    res.json({
      success: true,
      broadcastSuccess: broadcastResult.broadcastSuccess,
      pushedGroupCount: broadcastResult.pushedGroupCount,
      pushedGroups: broadcastResult.pushedGroups,
      failedGroups: broadcastResult.failedGroups,
      totalGroups: broadcastResult.totalGroups,
      announcementText
    });
  });

  // Re-broadcast / Send custom tournament announcement to LINE groups and friends
  app.post("/api/tournaments/:id/broadcast-announcement", async (req, res) => {
    const { id } = req.params;
    const { message } = req.body || {};
    const tournament = tournamentsDb[id];
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    currentActiveTournamentId = id;
    saveActiveTournamentFile();

    const approvedCount = (tournament.players || []).filter((p) => p.status === 'approved').length;
    const remainingSlots = Math.max(0, tournament.targetSize - approvedCount);

    const announcementText = message || `📢【賽事最新進度與即時通知】\n🏆 賽事場次：${tournament.name}\n⚡ 賽制規模：${tournament.targetSize} 人雙翼爭霸（${tournament.matchTargetScore} 分制）\n⏰ 開賽時間：${tournament.startTime || '即將開賽'}\n⏳ 報名截止：${tournament.registrationDeadline || '額滿為止'}\n🔥 當前名額：已核准 ${approvedCount} 人 / 剩餘 ${remainingSlots} 位\n\n📝 快速指令：\n• 報名：「+1 選手簡稱 陀螺」\n• 代報：「++1 選手簡稱 陀螺」\n• 查榜：「查榜」\n• 賽程：「賽程」`;

    const broadcastResult = await broadcastToAllGroupsAndFollowers(announcementText);
    res.json({
      success: true,
      broadcastSuccess: broadcastResult.broadcastSuccess,
      pushedGroupCount: broadcastResult.pushedGroupCount,
      pushedGroups: broadcastResult.pushedGroups,
      failedGroups: broadcastResult.failedGroups,
      totalGroups: broadcastResult.totalGroups,
      announcementText
    });
  });

  // Broadcast Bracket Tree & Read-Only URL / Photo to LINE Groups & Friends (Requirement 5)
  app.post("/api/tournaments/:id/broadcast-bracket", async (req, res) => {
    const { id } = req.params;
    const { message, imageUrl, readOnlyUrl } = req.body || {};
    const tournament = tournamentsDb[id];
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    currentActiveTournamentId = id;
    saveActiveTournamentFile();

    // Determine default read-only URL if not explicitly provided
    const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host || "beyblade-4qyw.onrender.com";
    const fallbackViewUrl = `${protocol}://${host}/?mode=view&tid=${tournament.id}`;
    const effectiveViewUrl = readOnlyUrl || fallbackViewUrl;

    const approvedPlayers = (tournament.players || []).filter((p) => p.status === "approved");
    const activeMatches = (tournament.matches || []).filter((m) => m.status === "in_progress");
    const completedMatches = (tournament.matches || []).filter((m) => m.status === "completed");

    let statusLine = "⚡ 賽程樹狀圖已正式生成，雙翼對決即將全面開打！";
    if (tournament.status === "completed" && tournament.rankings?.champion) {
      statusLine = `🏆 賽事圓滿完賽！總冠軍：${tournament.rankings.champion.name}`;
    } else if (activeMatches.length > 0) {
      statusLine = `🔥 賽程激戰進行中（已完成 ${completedMatches.length} 場 / 進行中 ${activeMatches.length} 場）`;
    }

    const defaultText = `⚔️【${tournament.name} 雙翼賽程表發布】\n${statusLine}\n\n📊 賽制資訊：\n• 參賽人數：${approvedPlayers.length} / ${tournament.targetSize} 人\n• 爭霸分制：率先奪得 ${tournament.matchTargetScore} 分晉級\n• 賽程結構：左翼 ${tournament.targetSize / 2} 強 ⚔️ 右翼 ${tournament.targetSize / 2} 強 ➔ 中央總決賽\n\n🌐 線上即時賽程表（免登入唯讀查看，即時同步）：\n${effectiveViewUrl}\n\n💬 LINE 快速指令：傳送「賽程」或「查榜」即可隨時查看最新比分！`;

    const textToSend = message || defaultText;
    const messagesPayload: any[] = [];

    // If an image URL is attached, append an image message first
    if (imageUrl) {
      messagesPayload.push({
        type: "image",
        originalContentUrl: imageUrl,
        previewImageUrl: imageUrl
      });
    }

    messagesPayload.push({
      type: "text",
      text: textToSend
    });

    const broadcastResult = await broadcastToAllGroupsAndFollowers(messagesPayload);

    res.json({
      success: true,
      broadcastSuccess: broadcastResult.broadcastSuccess,
      pushedGroupCount: broadcastResult.pushedGroupCount,
      pushedGroups: broadcastResult.pushedGroups,
      failedGroups: broadcastResult.failedGroups,
      totalGroups: broadcastResult.totalGroups,
      announcementText: textToSend,
      imageUrl: imageUrl || null,
      readOnlyUrl: effectiveViewUrl
    });
  });

  // Broadcast Live Match Status / Score Update to LINE Groups (Requirement 5 手動補發即時賽況)
  app.post("/api/tournaments/:id/broadcast-match", async (req, res) => {
    const { id } = req.params;
    const { matchId, message, readOnlyUrl } = req.body || {};
    const tournament = tournamentsDb[id];
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    currentActiveTournamentId = id;
    saveActiveTournamentFile();

    const targetMatch = (tournament.matches || []).find((m) => m.id === matchId) || (tournament.matches || []).find((m) => m.status === 'in_progress');
    const playerMap = new Map<string, Player>();
    (tournament.players || []).forEach((p) => playerMap.set(p.id, p));

    const p1 = targetMatch?.player1Id ? playerMap.get(targetMatch.player1Id) : null;
    const p2 = targetMatch?.player2Id ? playerMap.get(targetMatch.player2Id) : null;

    const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host || "beyblade-4qyw.onrender.com";
    const fallbackViewUrl = `${protocol}://${host}/?mode=view&tid=${tournament.id}`;
    const effectiveViewUrl = readOnlyUrl || fallbackViewUrl;

    let matchStatusText = "";
    if (targetMatch) {
      const matchState = targetMatch.status === 'completed' ? '🏁 [已完賽]' : targetMatch.status === 'in_progress' ? '🔥 [激戰中]' : '⏳ [即將開打]';
      matchStatusText = `🥊【即時戰況速報】${targetMatch.label} ${matchState}\n` +
        `🔵 藍方 1P：${p1?.name || '待定'} [${p1?.beybladeName || '陀螺'}] ➔ ${targetMatch.score1} 分\n` +
        `🔴 紅方 2P：${p2?.name || '待定'} [${p2?.beybladeName || '陀螺'}] ➔ ${targetMatch.score2} 分\n` +
        `🎯 目標分制：率先奪得 ${targetMatch.targetScore || tournament.matchTargetScore} 分晉級\n`;
      
      if (targetMatch.winnerId) {
        const winner = playerMap.get(targetMatch.winnerId);
        matchStatusText += `🎉 獲勝晉級：${winner?.name || '選手'}\n`;
      }
    } else {
      const completedCount = (tournament.matches || []).filter((m) => m.status === 'completed').length;
      matchStatusText = `⚡【賽事即時進度更新】\n🏆 ${tournament.name}\n📊 目前已完成 ${completedCount} 場對決\n`;
    }

    const fullMessage = message || `${matchStatusText}\n🌐 線上即時賽況看板（唯讀免登入）：\n${effectiveViewUrl}\n\n隨時傳送「賽程」獲取最新對決狀態！`;

    const broadcastResult = await broadcastToAllGroupsAndFollowers(fullMessage);

    res.json({
      success: true,
      broadcastSuccess: broadcastResult.broadcastSuccess,
      pushedGroupCount: broadcastResult.pushedGroupCount,
      pushedGroups: broadcastResult.pushedGroups,
      failedGroups: broadcastResult.failedGroups,
      totalGroups: broadcastResult.totalGroups,
      announcementText: fullMessage,
      readOnlyUrl: effectiveViewUrl
    });
  });

  // Get all connected LINE groups & rooms
  app.get("/api/line/groups", (_req, res) => {
    const groupsList = Object.values(connectedLineGroups).sort((a, b) => b.lastActiveAt - a.lastActiveAt);
    res.json({
      totalCount: groupsList.length,
      groups: groupsList,
      activeTournamentId: currentActiveTournamentId
    });
  });

  // Manually add or register a LINE group ID
  app.post("/api/line/groups", (req, res) => {
    const { id, name, type = 'group' } = req.body || {};
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: "Group ID is required" });
    }
    recordConnectedGroup(id.trim(), type, name?.trim());
    res.json({ success: true, group: connectedLineGroups[id.trim()] });
  });

  // Delete / unregister a group
  app.delete("/api/line/groups/:groupId", (req, res) => {
    const { groupId } = req.params;
    if (connectedLineGroups[groupId]) {
      delete connectedLineGroups[groupId];
      saveGroupsDb();
      return res.json({ success: true, message: "Group removed" });
    }
    res.status(404).json({ error: "Group not found" });
  });

  // Send a test push message to a specific user or group
  app.post("/api/line/send-test-push", async (req, res) => {
    const { targetId, message } = req.body || {};
    if (!targetId || !message) {
      return res.status(400).json({ error: "targetId and message are required" });
    }

    const trimmedId = targetId.trim();
    let sent = false;
    if (trimmedId.startsWith("U")) {
      sent = await sendLinePushMessage(trimmedId, message);
    } else {
      sent = await sendLinePushToGroup(trimmedId, message);
    }

    res.json({ success: sent, targetId: trimmedId, message });
  });

  // LINE Channel Configuration
  const DEFAULT_LINE_CHANNEL_ID = "2011189628";
  const DEFAULT_LINE_CHANNEL_SECRET = "d8a986d66699ee0f22e948f7e1c8fa33";

  function getLineChannelId(): string {
    return process.env.LINE_CHANNEL_ID || DEFAULT_LINE_CHANNEL_ID;
  }

  function getLineChannelSecret(): string {
    return process.env.LINE_CHANNEL_SECRET || DEFAULT_LINE_CHANNEL_SECRET;
  }

  let cachedAccessToken: { token: string; expiresAt: number } | null = null;

  // Dynamically obtain or return Channel Access Token
  async function getLineAccessToken(): Promise<string | null> {
    if (process.env.LINE_CHANNEL_ACCESS_TOKEN) {
      return process.env.LINE_CHANNEL_ACCESS_TOKEN;
    }

    const now = Date.now();
    if (cachedAccessToken && cachedAccessToken.expiresAt > now + 60000) {
      return cachedAccessToken.token;
    }

    const channelId = getLineChannelId();
    const channelSecret = getLineChannelSecret();

    if (!channelId || !channelSecret) {
      return null;
    }

    try {
      const params = new URLSearchParams();
      params.append("grant_type", "client_credentials");
      params.append("client_id", channelId);
      params.append("client_secret", channelSecret);

      const response = await fetch("https://api.line.me/v2/oauth/accessToken", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("[LINE Token Error] HTTP", response.status, errText);
        return null;
      }

      const data = (await response.json()) as { access_token: string; expires_in?: number };
      if (data.access_token) {
        const expiresInSec = data.expires_in || 2592000;
        cachedAccessToken = {
          token: data.access_token,
          expiresAt: now + expiresInSec * 1000,
        };
        console.log(`[LINE Bot] Successfully acquired Channel Access Token for Channel ID ${channelId}`);
        return data.access_token;
      }
    } catch (err) {
      console.error("[LINE Token Exception]", err);
    }

    return null;
  }

  // Fetch LINE user profile (display name, avatar)
  async function getLineUserProfile(userId: string): Promise<{ displayName?: string; pictureUrl?: string } | null> {
    if (!userId || !userId.startsWith("U")) return null;
    const token = await getLineAccessToken();
    if (!token) return null;

    try {
      const res = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = (await res.json()) as { displayName?: string; pictureUrl?: string };
        return {
          displayName: data.displayName,
          pictureUrl: data.pictureUrl,
        };
      }
    } catch (err) {
      // Profile fetch is optional enhancement
    }
    return null;
  }

  // Send LINE Push message to specific user
  async function sendLinePushMessage(toUserId: string, text: string): Promise<boolean> {
    if (!toUserId) return false;
    const token = await getLineAccessToken();
    if (!token) return false;

    try {
      const resp = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: toUserId,
          messages: [{ type: "text", text }],
        }),
      });

      if (resp.ok) {
        console.log(`[LINE Push] Successfully sent notification to user ${toUserId}`);
        return true;
      } else {
        const err = await resp.text();
        console.warn(`[LINE Push Warning] HTTP ${resp.status} for user ${toUserId}: ${err}`);
      }
    } catch (err) {
      console.error("[LINE Push Exception]", err);
    }
    return false;
  }

  // Send LINE Push message (single text or multiple messages) to specific group / room
  async function sendLinePushToGroup(groupId: string, messagePayload: string | any[]): Promise<boolean> {
    if (!groupId) return false;
    const token = await getLineAccessToken();
    if (!token) return false;

    const messages = Array.isArray(messagePayload)
      ? messagePayload
      : [{ type: "text", text: messagePayload }];

    try {
      const resp = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: groupId,
          messages,
        }),
      });

      if (resp.ok) {
        console.log(`[LINE Push Group] Successfully pushed message to group/room ${groupId}`);
        return true;
      } else {
        const err = await resp.text();
        console.warn(`[LINE Push Group Warning] HTTP ${resp.status} for ${groupId}: ${err}`);
      }
    } catch (err) {
      console.error("[LINE Push Group Exception]", err);
    }
    return false;
  }

  // Broadcast LINE message to all 1-on-1 followers
  async function broadcastLineMessage(messagePayload: string | any[]): Promise<boolean> {
    const token = await getLineAccessToken();
    if (!token) return false;

    const messages = Array.isArray(messagePayload)
      ? messagePayload
      : [{ type: "text", text: messagePayload }];

    try {
      const resp = await fetch("https://api.line.me/v2/bot/message/broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages,
        }),
      });

      if (resp.ok) {
        console.log(`[LINE Broadcast] Successfully broadcasted message to 1-on-1 followers`);
        return true;
      } else {
        const err = await resp.text();
        console.warn(`[LINE Broadcast Warning] HTTP ${resp.status}: ${err}`);
      }
    } catch (err) {
      console.error("[LINE Broadcast Exception]", err);
    }
    return false;
  }

  // Broadcast to BOTH 1-on-1 followers AND all connected LINE Groups & Rooms
  async function broadcastToAllGroupsAndFollowers(messagePayload: string | any[]): Promise<{
    broadcastSuccess: boolean;
    pushedGroupCount: number;
    pushedGroups: string[];
    failedGroups: string[];
    totalGroups: number;
  }> {
    // 1. Broadcast to 1-on-1 followers
    const broadcastSuccess = await broadcastLineMessage(messagePayload);

    // 2. Push to all recorded groups & rooms
    const groupEntries = Object.values(connectedLineGroups);
    const pushedGroups: string[] = [];
    const failedGroups: string[] = [];

    for (const group of groupEntries) {
      const success = await sendLinePushToGroup(group.id, messagePayload);
      if (success) {
        pushedGroups.push(group.id);
      } else {
        failedGroups.push(group.id);
      }
    }

    console.log(`[LINE Multi-Broadcast] Broadcast: ${broadcastSuccess ? 'OK' : 'FAIL'}, Groups pushed: ${pushedGroups.length}/${groupEntries.length}`);

    return {
      broadcastSuccess,
      pushedGroupCount: pushedGroups.length,
      pushedGroups,
      failedGroups,
      totalGroups: groupEntries.length
    };
  }

  // Helper: Find active tournament
  function getActiveTournament(requestedId?: string): Tournament | null {
    if (requestedId && tournamentsDb[requestedId]) {
      return tournamentsDb[requestedId];
    }
    if (currentActiveTournamentId && tournamentsDb[currentActiveTournamentId]) {
      return tournamentsDb[currentActiveTournamentId];
    }
    const all = Object.values(tournamentsDb);
    if (all.length === 0) return null;
    // Prioritize non-completed tournament
    const active = all.find((t) => t.status !== 'completed' && !t.isArchived);
    return active || all[all.length - 1];
  }

  // Parse LINE registration message text (Requirements 3 & 4)
  function parseBotMessage(text: string): { 
    type: 'register' | 'proxy_register' | 'cancel' | 'query_list' | 'query_bracket' | 'help' | 'unknown';
    shortName?: string;
    beyblade?: string;
    isConfirmCancel?: boolean;
  } {
    const trimmed = text.trim();

    // 1. Proxy registration: ++1 AAA [陀螺] or ++ AAA [陀螺] (Requirement 3)
    const proxyMatch = trimmed.match(/^(\+\+1|\+\+|\+ ?\+ ?\d*|替報|代報)\s*([^\s\n]+)(?:\s+(.*))?$/i);
    if (proxyMatch) {
      return {
        type: 'proxy_register',
        shortName: proxyMatch[2]?.trim(),
        beyblade: proxyMatch[3]?.trim()
      };
    }

    // 2. Cancellation: -1 AAA [確認] or -1 (Requirement 4)
    const cancelMatch = trimmed.match(/^(-\s*1|-|取消|退賽)\s*([^\s\n]+)?(?:\s+(確認|confirm))?$/i);
    if (cancelMatch) {
      return {
        type: 'cancel',
        shortName: cancelMatch[2]?.trim(),
        isConfirmCancel: !!cancelMatch[3]
      };
    }

    // 3. Self registration: +1 AAA [陀螺] or + AAA [陀螺] (Requirement 2)
    const regMatch = trimmed.match(/^(\+1|\+ ?\d*|報名|登記)\s*([^\s\n]+)(?:\s+(.*))?$/i);
    if (regMatch) {
      return {
        type: 'register',
        shortName: regMatch[2]?.trim(),
        beyblade: regMatch[3]?.trim()
      };
    }

    if (trimmed === '+1' || trimmed === '報名' || trimmed === '登記') {
      return { type: 'register' };
    }

    // 4. Query List
    if (['名單', '查榜', '目前名額', '報名名單', '名額', '查詢'].includes(trimmed)) {
      return { type: 'query_list' };
    }

    // 5. Query Bracket
    if (['賽程', '對戰表', '樹狀圖', '比分', '對決'].includes(trimmed)) {
      return { type: 'query_bracket' };
    }

    // 6. Help
    if (['幫助', '說明', 'help', 'BOT', 'bot', '指令', '怎麼報名'].includes(trimmed)) {
      return { type: 'help' };
    }

    return { type: 'unknown' };
  }

  // Handle bot command & return reply string + updated tournament (Requirements 1, 2, 3, 4)
  function processBotCommand(
    text: string,
    sourceUser: { userId: string; displayName?: string; groupId?: string },
    targetTournamentId?: string
  ): { replyText: string; registered: boolean; player?: Player; tournament?: Tournament } {
    const tournament = getActiveTournament(targetTournamentId);

    if (!tournament) {
      return {
        replyText: `⚠️ 目前尚未建立進行中的戰鬥陀螺雙翼賽事場次，請主辦方先於後台建立賽程！`,
        registered: false
      };
    }

    const startTimeDisplay = tournament.startTime || '依大會現場公布';
    const deadlineDisplay = tournament.registrationDeadline || '額滿為止';
    const parsed = parseBotMessage(text);

    // Ensure players array
    if (!Array.isArray(tournament.players)) {
      tournament.players = [];
    }

    const approvedCount = tournament.players.filter(
      (p) => p.status === 'approved' && !p.isReserve && !p.id.startsWith('player_reserve_')
    ).length;
    const remainingSlots = Math.max(0, tournament.targetSize - approvedCount);

    // Check if registration deadline has passed (Requirement 1 & 1.1)
    const isDeadlinePassed = checkDeadlinePassed(tournament.registrationDeadline);

    // CASE 1: PROXY REGISTRATION (++1 AAA 陀螺名稱) - Requirement 3
    if (parsed.type === 'proxy_register') {
      if (isDeadlinePassed) {
        return {
          replyText: `⚠️【報名已截止】\n🏆 賽事場次：${tournament.name}\n⏰ 報名截止時間：${deadlineDisplay}\n目前本場次已截止受理新登記，請靜候賽程公布！`,
          registered: false,
          tournament
        };
      }

      const proxyPlayerName = parsed.shortName || '代報名選手';
      const beybladeName = parsed.beyblade || '戰鬥陀螺 X (現場指定)';

      // Check if proxy player under this name already registered by this user
      const existingProxy = tournament.players.find(
        (p) => !p.isReserve && p.name.toLowerCase() === proxyPlayerName.toLowerCase() && p.registeredByLineId === sourceUser.userId
      );

      if (existingProxy) {
        // Update existing proxy registration
        existingProxy.beybladeName = beybladeName;
        if (sourceUser.groupId) {
          existingProxy.registeredInGroupId = sourceUser.groupId;
        }
        if (parsed.beyblade) {
          existingProxy.blade = parsed.beyblade;
          existingProxy.customCombo = parsed.beyblade;
        }
        saveDb();

        const statusLabel = existingProxy.status === 'approved' ? '✅ 已通過審核正式排入賽程' : '⏳ 等待主辦方審核中';
        return {
          replyText: `🔄【報名資料已更新】\n👤 選手簡稱：${existingProxy.name}\n🏆 賽事場次：${tournament.name}\n📌 狀態：${statusLabel}\n🔥 本場剩餘名額：${remainingSlots} / ${tournament.targetSize}\n開賽時間: ${startTimeDisplay}\n報名截止時間: ${deadlineDisplay}`,
          registered: true,
          player: existingProxy,
          tournament
        };
      }

      const newProxyPlayer: Player = {
        id: `p_proxy_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: proxyPlayerName,
        registeredByLineId: sourceUser.userId,
        registeredInGroupId: sourceUser.groupId || undefined,
        isProxy: true,
        beybladeName: beybladeName,
        beybladeType: 'attack',
        blade: parsed.beyblade || '9-60GF',
        customCombo: parsed.beyblade || '9-60GF',
        clubOrTeam: `LINE 代報名 (${sourceUser.displayName || '群友'})`,
        teamName: `LINE 代報名 (${sourceUser.displayName || '群友'})`,
        status: 'pending',
        registeredAt: Date.now(),
        isSeed: false,
        score: 0,
        totalPointsScored: 0
      };

      tournament.players.push(newProxyPlayer);
      saveDb();

      console.log(`[LINE Bot Proxy Reg] Proxy player "${newProxyPlayer.name}" registered by User ${sourceUser.userId} (Group: ${sourceUser.groupId || 'none'}) to "${tournament.name}"`);

      return {
        replyText: `🔄【報名資料已更新】\n👤 選手簡稱：${newProxyPlayer.name}\n🏆 賽事場次：${tournament.name}\n📌 狀態：⏳ 待主辦方審核確認中\n🔥 本場剩餘名額：${remainingSlots} / ${tournament.targetSize}\n開賽時間: ${startTimeDisplay}\n報名截止時間: ${deadlineDisplay}`,
        registered: true,
        player: newProxyPlayer,
        tournament
      };
    }

    // CASE 2: SELF REGISTRATION (+1 AAA 陀螺名稱) - Requirement 2
    if (parsed.type === 'register') {
      if (isDeadlinePassed) {
        return {
          replyText: `⚠️【報名已截止】\n🏆 賽事場次：${tournament.name}\n⏰ 報名截止時間：${deadlineDisplay}\n目前本場次已截止受理新登記，請靜候賽程公布！`,
          registered: false,
          tournament
        };
      }

      const finalShortName = parsed.shortName || sourceUser.displayName || '群組選手';
      const beybladeName = parsed.beyblade || '戰鬥陀螺 X (現場指定)';

      // Check existing player by user's own LINE ID
      const existing = tournament.players.find(
        (p) => (!p.isReserve && !p.isProxy && p.lineId === sourceUser.userId) || (!p.isReserve && !p.isProxy && p.name.toLowerCase() === finalShortName.toLowerCase() && p.lineId === sourceUser.userId)
      );

      if (existing) {
        // Update existing player
        existing.name = finalShortName;
        existing.lineId = sourceUser.userId;
        if (sourceUser.groupId) {
          existing.registeredInGroupId = sourceUser.groupId;
        }
        if (parsed.beyblade) {
          existing.beybladeName = beybladeName;
          existing.blade = parsed.beyblade;
          existing.customCombo = parsed.beyblade;
        }
        saveDb();

        const statusLabel = existing.status === 'approved' ? '✅ 已通過審核正式排入賽程' : '⏳ 等待主辦方審核中';
        return {
          replyText: `🔄【報名資料已更新】\n👤 選手簡稱：${existing.name}\n🏆 賽事場次：${tournament.name}\n📌 狀態：${statusLabel}\n🔥 本場剩餘名額：${remainingSlots} / ${tournament.targetSize}\n開賽時間: ${startTimeDisplay}\n報名截止時間: ${deadlineDisplay}`,
          registered: true,
          player: existing,
          tournament
        };
      }

      const newPlayer: Player = {
        id: `p_bot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: finalShortName,
        lineId: sourceUser.userId,
        registeredInGroupId: sourceUser.groupId || undefined,
        isProxy: false,
        beybladeName: beybladeName,
        beybladeType: 'attack',
        blade: parsed.beyblade || '9-60GF',
        customCombo: parsed.beyblade || '9-60GF',
        clubOrTeam: 'LINE 群組報名',
        teamName: 'LINE 群組報名',
        status: 'pending',
        registeredAt: Date.now(),
        isSeed: false,
        score: 0,
        totalPointsScored: 0
      };

      tournament.players.push(newPlayer);
      saveDb();

      console.log(`[LINE Bot Webhook] Registered player "${newPlayer.name}" (LINE ID: ${sourceUser.userId}, Group: ${sourceUser.groupId || 'none'}) to tournament "${tournament.name}"`);

      return {
        replyText: `🔄【報名資料已更新】\n👤 選手簡稱：${newPlayer.name}\n🏆 賽事場次：${tournament.name}\n📌 狀態：⏳ 待主辦方審核確認中\n🔥 本場剩餘名額：${remainingSlots} / ${tournament.targetSize}\n開賽時間: ${startTimeDisplay}\n報名截止時間: ${deadlineDisplay}`,
        registered: true,
        player: newPlayer,
        tournament
      };
    }

    // CASE 3: CANCEL REGISTRATION (-1 AAA) - Requirement 4
    if (parsed.type === 'cancel') {
      const targetName = parsed.shortName;

      // Find player by name or by user's own lineId
      let targetPlayerIndex = -1;
      if (targetName) {
        targetPlayerIndex = tournament.players.findIndex(
          (p) => !p.isReserve && p.name.toLowerCase() === targetName.toLowerCase()
        );
      } else {
        targetPlayerIndex = tournament.players.findIndex(
          (p) => !p.isReserve && !p.isProxy && p.lineId === sourceUser.userId
        );
      }

      // If player not found
      if (targetPlayerIndex === -1) {
        return {
          replyText: `⚠️【取消報名失敗】\n找不到名為「${targetName || '您本人'}」的報名成員。\n請確認選手簡稱是否輸入正確（例如：「-1 選手簡稱」）！`,
          registered: false,
          tournament
        };
      }

      const targetPlayer = tournament.players[targetPlayerIndex];

      // If pending: cancel directly
      if (targetPlayer.status === 'pending') {
        const removedPlayerName = targetPlayer.name;
        tournament.players.splice(targetPlayerIndex, 1);
        saveDb();

        const updatedApproved = tournament.players.filter((p) => p.status === 'approved' && !p.isReserve && !p.id.startsWith('player_reserve_')).length;
        const updatedRemaining = Math.max(0, tournament.targetSize - updatedApproved);

        return {
          replyText: `🗑️【報名已取消】\n👤 選手簡稱：${removedPlayerName}\n🏆 賽事場次：${tournament.name}\n📌 狀態：已自審核佇列成功移除\n🔥 本場剩餘名額：${updatedRemaining} / ${tournament.targetSize}\n開賽時間: ${startTimeDisplay}\n報名截止時間: ${deadlineDisplay}`,
          registered: false,
          tournament
        };
      }

      // If approved: check for confirmation
      if (targetPlayer.status === 'approved') {
        if (parsed.isConfirmCancel) {
          const removedPlayerName = targetPlayer.name;
          tournament.players.splice(targetPlayerIndex, 1);
          saveDb();

          const updatedApproved = tournament.players.filter((p) => p.status === 'approved' && !p.isReserve && !p.id.startsWith('player_reserve_')).length;
          const updatedRemaining = Math.max(0, tournament.targetSize - updatedApproved);

          return {
            replyText: `🗑️【已核准選手 已正式退賽】\n👤 選手簡稱：${removedPlayerName}\n🏆 賽事場次：${tournament.name}\n📌 狀態：已自正式參賽名單中移除並釋出名額\n🔥 本場剩餘名額：${updatedRemaining} / ${tournament.targetSize}\n開賽時間: ${startTimeDisplay}\n報名截止時間: ${deadlineDisplay}`,
            registered: false,
            tournament
          };
        } else {
          targetPlayer.pendingCancelConfirm = true;
          saveDb();

          return {
            replyText: `⚠️【退賽確認提醒】\n選手「${targetPlayer.name}」已通過審核並排入正式名單！\n若確定取消退賽並釋出名額，請再次輸入：\n👉「-1 ${targetPlayer.name} 確認」\n或由主辦方於管理後台直接核准退賽。`,
            registered: false,
            tournament
          };
        }
      }
    }

    // CASE 4: QUERY LIST (查榜 / 名單)
    if (parsed.type === 'query_list') {
      const approved = tournament.players.filter((p) => p.status === 'approved' && !p.isReserve && !p.id.startsWith('player_reserve_'));
      const pending = tournament.players.filter((p) => p.status === 'pending' && !p.isReserve && !p.id.startsWith('player_reserve_'));
      const approvedList = approved.length > 0 
        ? approved.map((p, i) => `${i + 1}. ${p.name}${p.isProxy ? ' (代報)' : ''} [${p.beybladeName || '陀螺'}]`).join('\n')
        : '（尚無正式核准選手）';

      const pendingList = pending.length > 0
        ? `\n⏳ 待審核佇列 (${pending.length} 人)：\n` + pending.map((p) => `• ${p.name}${p.isProxy ? ' (代報)' : ''}`).join('\n')
        : '';

      return {
        replyText: `📋【${tournament.name} 目前參賽榜單】\n⚡ 賽制規模：${tournament.targetSize} 人雙翼對決（${tournament.matchTargetScore} 分獲勝）\n⏰ 開賽時間：${startTimeDisplay}\n⏳ 報名截止：${deadlineDisplay}\n🔥 剩餘名額：${remainingSlots} / ${tournament.targetSize}\n\n✅ 正式參賽 (${approved.length}/${tournament.targetSize})：\n${approvedList}${pendingList}\n\n👉 報名請傳送：「+1 簡稱 陀螺」\n👉 替人報名：「++1 簡稱 陀螺」\n👉 取消報名：「-1 簡稱」`,
        registered: false,
        tournament
      };
    }

    // CASE 5: QUERY BRACKET (賽程 / 樹狀圖 / 即時賽況)
    if (parsed.type === 'query_bracket') {
      const activeMatches = tournament.matches.filter((m) => m.status === 'in_progress');
      const completedCount = tournament.matches.filter((m) => m.status === 'completed' || m.status === 'bye').length;
      const totalMatches = tournament.matches.length;
      
      let championText = '';
      if (tournament.rankings?.champion) {
        championText = `\n👑 榮耀冠軍：${tournament.rankings.champion.name} (${tournament.rankings.champion.beybladeName})`;
      }

      const matchInfo = activeMatches.length > 0
        ? `🔥 當前激戰中的對戰：\n` + activeMatches.map((m) => `• #${m.matchNumber} ${m.label}: ${m.score1} vs ${m.score2}`).join('\n')
        : `⚡ 目前進度：已完賽 ${completedCount}/${totalMatches} 場 (${tournament.status === 'in_progress' ? '進行中' : tournament.status === 'completed' ? '已完賽' : '登記中'})`;

      return {
        replyText: `⚔️【${tournament.name} 即時賽程與戰況】\n${matchInfo}${championText}\n🎯 獲勝分制：${tournament.matchTargetScore} 分\n🏆 總規模：${tournament.targetSize} 人雙翼淘汰賽\n⏰ 開賽時間：${startTimeDisplay}\n\n🌐 線上即時唯讀賽程看板（即時連線更新）：\n請至官方發布的唯讀賽程連結查看完整樹狀圖與各回合擊倒比分！`,
        registered: false,
        tournament
      };
    }

    // CASE 6: HELP (幫助 / 指令)
    if (parsed.type === 'help') {
      return {
        replyText: `🌀【戰鬥陀螺 X 雙翼賽事 LINE BOT 指令說明】\n\n1️⃣ 本人快速報名：\n傳送「+1 選手簡稱 陀螺名稱」\n（例：+1 弦仔 飛翼鳳凰 9-60GF）\n\n2️⃣ 替他人代報名：\n傳送「++1 選手簡稱 陀螺名稱」\n（例：++1 弟弟 爆風巨神 3-60F）\n\n3️⃣ 取消報名：\n傳送「-1 選手簡稱」\n\n4️⃣ 查詢榜單名單：傳送「查榜」或「名單」\n5️⃣ 查詢賽程比分：傳送「賽程」或「對戰表」`,
        registered: false,
        tournament
      };
    }

    return {
      replyText: `👋 您好！這是戰鬥陀螺 X 雙翼對決賽事 BOT。\n\n• 本人報名：傳送「+1 選手簡稱 陀螺名稱」\n• 替人代報：傳送「++1 選手簡稱 陀螺名稱」\n• 取消報名：傳送「-1 選手簡稱」\n• 查詢名單：傳送「查榜」\n• 查詢賽程：傳送「賽程」`,
      registered: false,
      tournament
    };
  }


  // LINE Messaging API reply helper
  async function replyLineMessage(replyToken: string, text: string) {
    if (!replyToken) return;
    const accessToken = await getLineAccessToken();
    if (!accessToken) {
      console.warn("[LINE API] No Channel Access Token available to reply message.");
      return;
    }

    try {
      const resp = await fetch("https://api.line.me/v2/bot/message/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          replyToken,
          messages: [{ type: "text", text }],
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.error("[LINE API Reply Error]", resp.status, errText);
      }
    } catch (err) {
      console.error("[LINE API] Failed to reply message:", err);
    }
  }

  // CORS and Health Check for Webhook (Handles LINE Developers Console Verification & Ping)
  app.options("/api/line/webhook", (_req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD");
    res.header("Access-Control-Allow-Headers", "*");
    res.status(200).send("OK");
  });

  app.get("/api/line/webhook", (_req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.status(200).json({
      status: "ok",
      service: "Beyblade X LINE Messaging API Webhook",
      timestamp: Date.now(),
      message: "Webhook endpoint is operational and ready for LINE Developers verification."
    });
  });

  // LINE BOT Webhook endpoint (Real Messaging API)
  app.post("/api/line/webhook", async (req, res) => {
    // Always respond with 200 OK immediately for LINE verification compliance
    res.header("Access-Control-Allow-Origin", "*");

    try {
      const signature = req.headers["x-line-signature"];
      const events = req.body?.events;

      console.log(`[LINE Webhook Incoming] events count: ${Array.isArray(events) ? events.length : 0}, signature: ${signature ? "present" : "none"}`);

      // LINE Developers Console "Verify" button sends an empty events array []
      if (!Array.isArray(events) || events.length === 0) {
        return res.status(200).json({ status: "ok", message: "LINE Webhook verified successfully" });
      }

      // Process events in background
      for (const event of events) {
        const groupId = event.source?.groupId || event.source?.roomId;
        const userId = event.source?.userId || `line_user_${Date.now()}`;
        const replyToken = event.replyToken;

        // Record active group or room if event originates from one
        if (groupId) {
          recordConnectedGroup(groupId, event.source?.groupId ? 'group' : 'room');
        }
        if (userId && userId.startsWith("U")) {
          recordConnectedGroup(userId, 'user');
        }

        // Handle bot being invited to a LINE group or room, or followed by a user
        if (event.type === "join" || event.type === "follow") {
          console.log(`[LINE Webhook ${event.type}] Source:`, event.source);
          const activeTour = getActiveTournament();
          const welcomeText = activeTour
            ? `👋 大家好！戰鬥陀螺 X 雙翼賽事 BOT 已進駐本群！\n\n🏆 目前綁定賽事：${activeTour.name}\n⚡ 規模：${activeTour.targetSize} 人雙翼對決（${activeTour.matchTargetScore} 分制）\n⏰ 開賽時間：${activeTour.startTime || '依大會公布'}\n⏳ 報名截止：${activeTour.registrationDeadline || '額滿為止'}\n\n📝 群友指令快速指南：\n• 本人報名：「+1 選手簡稱 陀螺名稱」\n• 替人代報：「++1 選手簡稱 陀螺名稱」\n• 取消報名：「-1 選手簡稱」\n• 查詢榜單：「查榜」或「名單」\n• 查詢賽程：「賽程」\n\n歡迎各位陀螺手踴躍報名！`
            : `👋 大家好！戰鬥陀螺 X 雙翼賽事 BOT 已進駐本群！\n請主辦方於管理後台開啟新賽事後，群友即可在此直接發送「+1 簡稱 陀螺」報名！`;

          if (replyToken) {
            await replyLineMessage(replyToken, welcomeText);
          }
          continue;
        }

        // Handle text message commands
        if (event.type === "message" && event.message?.type === "text") {
          const messageText = event.message.text;

          console.log(`[LINE Webhook Message] User: ${userId}, Group: ${groupId || '1-on-1'}, Text: "${messageText}"`);

          // Attempt to get user LINE display name if available
          let displayName: string | undefined = undefined;
          if (userId.startsWith("U")) {
            const profile = await getLineUserProfile(userId);
            if (profile?.displayName) {
              displayName = profile.displayName;
            }
          }

          const result = processBotCommand(messageText, { userId, displayName, groupId });

          if (replyToken) {
            await replyLineMessage(replyToken, result.replyText);
          }
        }
      }

      return res.status(200).json({ status: "ok" });
    } catch (err) {
      console.error("[LINE Webhook Error]", err);
      // LINE requires 200 OK even on partial failures so it doesn't disable the webhook
      return res.status(200).json({ status: "ok", warning: "Encountered non-fatal error during processing" });
    }
  });

  // Simulated LINE Bot message endpoint for interactive testing in UI
  app.post("/api/line/simulate-message", (req, res) => {
    const { message, simulatedUser, tournamentId } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const user = {
      userId: simulatedUser?.lineId || `U${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      displayName: simulatedUser?.name || "選手"
    };

    const result = processBotCommand(message, user, tournamentId);
    res.json(result);
  });

  // LINE Bot status & configuration info endpoint
  app.get("/api/line/status", async (_req, res) => {
    const channelId = getLineChannelId();
    const channelSecret = getLineChannelSecret();
    const token = await getLineAccessToken();

    res.json({
      channelId,
      hasSecret: !!channelSecret,
      hasAccessToken: !!token,
      webhookUrl: "/api/line/webhook",
      liffId: process.env.LINE_LIFF_ID || null
    });
  });


  // Vite middleware for dev / static serving for prod
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`⚡ Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
