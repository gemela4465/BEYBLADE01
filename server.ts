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
  score?: number;
  totalPointsScored?: number;
  status: 'pending' | 'approved' | 'rejected';
  registeredAt?: number;
  lineId?: string;
  beybladeName?: string;
  beybladeType?: any;
  customCombo?: string;
  blade?: string;
  clubOrTeam?: string;
  teamName?: string;
  notes?: string;
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
  status: 'pending' | 'ready' | 'in_progress' | 'completed';
  nextMatchId: string | null;
  nextMatchSlot: 1 | 2 | null;
  targetScore: number;
  roundsHistory: any[];
}

interface Tournament {
  id: string;
  name: string;
  targetSize: number;
  matchTargetScore: number;
  seedMode: 'none' | 'manual' | 'random';
  seedCount: number;
  status: 'setup' | 'registration' | 'in_progress' | 'completed';
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
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "tournaments.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error("Failed to create data directory:", err);
  }
}

// In-memory cache + file backing
let tournamentsDb: Record<string, Tournament> = {};

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
}

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(tournamentsDb, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing database file:", err);
  }
}

loadDb();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // API Routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", tournamentCount: Object.keys(tournamentsDb).length });
  });

  // Get all tournaments
  app.get("/api/tournaments", (_req, res) => {
    res.json(Object.values(tournamentsDb));
  });

  // Get single tournament by ID
  app.get("/api/tournaments/:id", (req, res) => {
    const { id } = req.params;
    const tournament = tournamentsDb[id];
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }
    res.json(tournament);
  });

  // Create or full save tournament
  app.post("/api/tournaments", (req, res) => {
    const tournament: Tournament = req.body;
    if (!tournament || !tournament.id) {
      return res.status(400).json({ error: "Invalid tournament data" });
    }

    // Preserve existing registered players if updating tournament from a client that didn't have latest pending players
    const existing = tournamentsDb[tournament.id];
    if (existing && existing.players && tournament.players) {
      const playerMap = new Map<string, Player>();
      // Put new incoming players
      tournament.players.forEach((p) => playerMap.set(p.id, p));
      // Ensure any pending players on server that might have been submitted concurrently are not erased
      existing.players.forEach((p) => {
        if (!playerMap.has(p.id)) {
          playerMap.set(p.id, p);
        }
      });
      tournament.players = Array.from(playerMap.values());
    }

    tournamentsDb[tournament.id] = tournament;
    saveDb();
    res.json(tournament);
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
      // Create minimal tournament structure
      tournament = {
        id,
        name: "戰鬥陀螺 X 雙翼爭霸賽",
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

    // Check if player already registered with same ID or same name/lineId
    const existingIndex = tournament.players.findIndex(
      (p) => p.id === player.id || (player.name && p.name === player.name && player.lineId && p.lineId === player.lineId)
    );

    const newPlayer: Player = {
      id: player.id || `p_line_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: player.name.trim(),
      score: 0,
      totalPointsScored: 0,
      status: 'pending',
      registeredAt: player.registeredAt || Date.now(),
      lineId: player.lineId ? player.lineId.trim() : undefined,
      beybladeName: player.beybladeName ? player.beybladeName.trim() : '未指定陀螺',
      beybladeType: player.beybladeType || 'Attack',
      customCombo: player.customCombo ? player.customCombo.trim() : undefined,
      teamName: player.teamName ? player.teamName.trim() : undefined,
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

  // Approve / Reject / Update player status
  app.patch("/api/tournaments/:id/players/:playerId", (req, res) => {
    const { id, playerId } = req.params;
    const { status, isSeed, seedRank } = req.body;

    const tournament = tournamentsDb[id];
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    const player = tournament.players.find((p) => p.id === playerId);
    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    if (status) player.status = status;
    if (typeof isSeed === "boolean") player.isSeed = isSeed;
    if (typeof seedRank === "number") player.seedRank = seedRank;

    saveDb();
    res.json({ success: true, player, tournament });
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

  // Helper: Find active tournament
  function getActiveTournament(requestedId?: string): Tournament | null {
    if (requestedId && tournamentsDb[requestedId]) {
      return tournamentsDb[requestedId];
    }
    const all = Object.values(tournamentsDb);
    if (all.length === 0) return null;
    // Prioritize non-completed tournament
    const active = all.find((t) => t.status !== 'completed');
    return active || all[all.length - 1];
  }

  // Parse LINE registration message text
  function parseRegistrationText(text: string): { isRegistration: boolean; shortName?: string; beyblade?: string } {
    const trimmed = text.trim();
    // Patterns:
    // +1 弦仔 飛翼鳳凰 9-60GF
    // +1 弦仔
    // + 弦仔
    // 報名 弦仔 蒼穹龍騎士
    // 登記 弦仔
    const regMatch = trimmed.match(/^(\+1|\+ ?\d*|報名|登記)\s*([^\s\n]+)(?:\s+(.*))?$/i);
    if (regMatch) {
      const shortName = regMatch[2]?.trim();
      const beyblade = regMatch[3]?.trim();
      return {
        isRegistration: true,
        shortName: shortName || undefined,
        beyblade: beyblade || undefined
      };
    }

    if (trimmed === '+1' || trimmed === '報名' || trimmed === '登記') {
      return {
        isRegistration: true,
        shortName: undefined
      };
    }

    return { isRegistration: false };
  }

  // Handle bot command & return reply string + updated tournament
  function processBotCommand(
    text: string,
    sourceUser: { userId: string; displayName?: string },
    targetTournamentId?: string
  ): { replyText: string; registered: boolean; player?: Player; tournament?: Tournament } {
    const trimmed = text.trim();
    const tournament = getActiveTournament(targetTournamentId);

    if (!tournament) {
      return {
        replyText: `⚠️ 目前尚未建立進行中的戰鬥陀螺雙翼賽事場次，請主辦方先於後台建立賽程！`,
        registered: false
      };
    }

    const { isRegistration, shortName, beyblade } = parseRegistrationText(trimmed);

    if (isRegistration) {
      const finalShortName = shortName || sourceUser.displayName || '群組選手';
      const beybladeName = beyblade || '戰鬥陀螺 X (現場指定)';

      // Ensure players array
      if (!Array.isArray(tournament.players)) {
        tournament.players = [];
      }

      // Check existing registration by lineId or shortName
      const existing = tournament.players.find(
        (p) => (sourceUser.userId && p.lineId === sourceUser.userId) || p.name.toLowerCase() === finalShortName.toLowerCase()
      );

      const approvedCount = tournament.players.filter((p) => p.status === 'approved').length;
      const pendingCount = tournament.players.filter((p) => p.status === 'pending').length;
      const remainingSlots = Math.max(0, tournament.targetSize - approvedCount);

      if (existing) {
        // Update existing player
        existing.name = finalShortName;
        existing.lineId = sourceUser.userId;
        if (beyblade) existing.beybladeName = beyblade;
        saveDb();

        const statusLabel = existing.status === 'approved' ? '✅ 已通過審核正式排入賽程' : '⏳ 等待主辦方審核中';
        return {
          replyText: `🔄【報名資料已更新】\n👤 選手簡稱：${existing.name}\n🆔 LINE ID：${sourceUser.userId} (已自動鎖定)\n⚙️ 出戰陀螺：${existing.beybladeName}\n🏆 賽事場次：${tournament.name}\n📌 狀態：${statusLabel}\n🔥 本場剩餘名額：${remainingSlots} / ${tournament.targetSize}`,
          registered: true,
          player: existing,
          tournament
        };
      }

      const newPlayer: Player = {
        id: `p_bot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: finalShortName,
        lineId: sourceUser.userId,
        beybladeName: beybladeName,
        beybladeType: 'attack',
        blade: beyblade ? beyblade : '9-60GF',
        customCombo: beyblade ? beyblade : '9-60GF',
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

      console.log(`[LINE Bot Webhook] Registered player "${newPlayer.name}" (LINE ID: ${sourceUser.userId}) to tournament "${tournament.name}"`);

      return {
        replyText: `🌀【戰鬥陀螺 X 雙翼賽事 報名成功！】\n👤 選手簡稱：${newPlayer.name}\n🆔 LINE ID：${sourceUser.userId} (自動帶入)\n⚙️ 出戰陀螺：${newPlayer.beybladeName}\n🏆 場次：${tournament.name}\n⏳ 狀態：已送達主辦方審核佇列！\n🔥 目前核准：${approvedCount} 人 | 待審核：${pendingCount + 1} 人 | 剩餘名額：${remainingSlots} 人`,
        registered: true,
        player: newPlayer,
        tournament
      };
    }

    // Query commands
    if (trimmed === '名單' || trimmed === '查榜' || trimmed === '目前名額' || trimmed === '報名名單' || trimmed === '名額') {
      const approved = tournament.players.filter((p) => p.status === 'approved');
      const pending = tournament.players.filter((p) => p.status === 'pending');
      const approvedList = approved.length > 0 
        ? approved.map((p, i) => `${i + 1}. ${p.name} (${p.beybladeName || '陀螺'})`).join('\n')
        : '（尚無正式核准選手）';

      const pendingList = pending.length > 0
        ? `\n⏳ 待審核佇列 (${pending.length} 人)：\n` + pending.map((p) => `• ${p.name} [LINE ID: ${p.lineId || '自動帶入'}]`).join('\n')
        : '';

      return {
        replyText: `📋【${tournament.name} 目前參賽榜單】\n⚡ 賽制規模：${tournament.targetSize} 人雙翼對決（${tournament.matchTargetScore} 分獲勝）\n✅ 正式參賽 (${approved.length}/${tournament.targetSize})：\n${approvedList}${pendingList}\n\n👉 報名請直接傳送：「+1 選手簡稱 陀螺名稱」`,
        registered: false,
        tournament
      };
    }

    if (trimmed === '賽程' || trimmed === '對戰表' || trimmed === '樹狀圖' || trimmed === '比分') {
      const activeMatches = tournament.matches.filter((m) => m.status === 'in_progress');
      const matchInfo = activeMatches.length > 0
        ? `🔥 當前激戰中的對戰：\n` + activeMatches.map((m) => `• #${m.matchNumber} ${m.label}: ${m.score1} vs ${m.score2}`).join('\n')
        : `⚡ 目前狀態：${tournament.status === 'in_progress' ? '賽事進行中' : tournament.status === 'completed' ? '賽事已完賽' : '登記報名階段'}`;

      return {
        replyText: `⚔️【${tournament.name} 賽程狀態】\n${matchInfo}\n🎯 獲勝分制：${tournament.matchTargetScore} 分\n🏆 總規模：${tournament.targetSize} 人雙翼淘汰賽`,
        registered: false,
        tournament
      };
    }

    if (trimmed === '幫助' || trimmed === '說明' || trimmed === 'help' || trimmed === 'BOT' || trimmed === 'bot') {
      return {
        replyText: `🌀【戰鬥陀螺 X 雙翼賽事 LINE BOT 指令說明】\n\n1️⃣ 快速報名：\n傳送「+1 簡稱 陀螺名稱」\n（例：+1 弦仔 飛翼鳳凰 9-60GF）\n✨ 系統會自動帶入您的 LINE ID，無須手動輸入！\n\n2️⃣ 查詢名單：傳送「查榜」或「名單」\n3️⃣ 查詢賽程：傳送「賽程」或「對戰表」`,
        registered: false,
        tournament
      };
    }

    return {
      replyText: `👋 您好！這是戰鬥陀螺 X 雙翼對決賽事 BOT。\n\n• 快速報名：傳送「+1 選手簡稱 陀螺名稱」\n• 查詢名單：傳送「查榜」\n• 查詢賽程：傳送「賽程」`,
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
        if (event.type === "message" && event.message?.type === "text") {
          const messageText = event.message.text;
          const userId = event.source?.userId || `line_user_${Date.now()}`;
          const replyToken = event.replyToken;

          console.log(`[LINE Webhook Message] User: ${userId}, Text: "${messageText}"`);

          // Attempt to get user LINE display name if available
          let displayName: string | undefined = undefined;
          if (userId.startsWith("U")) {
            const profile = await getLineUserProfile(userId);
            if (profile?.displayName) {
              displayName = profile.displayName;
            }
          }

          const result = processBotCommand(messageText, { userId, displayName });

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
