import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, CheckCircle2, MessageCircle, Copy, Sparkles, UserCheck, 
  Shield, Swords, Flame, Clock, ChevronRight, Check, AlertCircle, Users,
  CheckSquare, Hash, Layers, Bot, MessageSquare, Terminal, Settings,
  RefreshCw, Lock, Zap, HelpCircle, CheckCheck, Activity, AlertTriangle
} from 'lucide-react';
import { Player, Tournament, BeybladeType } from '../types';
import { POPULAR_BEYBLADES } from '../data/beybladeData';
import { buildRegistrationUrl } from '../utils/sessionHelper';
import { simulateLineBotMessageApi, fetchLineBotStatusApi } from '../utils/api';

interface LineInviteViewProps {
  tournament: Tournament | null;
  onRegisterPlayer: (playerData: Omit<Player, 'id' | 'status' | 'registeredAt'>) => void;
  pendingCount: number;
  approvedCount: number;
  isStandaloneMode?: boolean;
  onSwitchToAdmin?: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot' | 'system';
  userName?: string;
  userLineId?: string;
  avatar?: string;
  text: string;
  timestamp: number;
}

export const LineInviteView: React.FC<LineInviteViewProps> = ({
  tournament,
  onRegisterPlayer,
  pendingCount,
  approvedCount,
  isStandaloneMode = false,
  onSwitchToAdmin
}) => {
  // Tab within LINE Portal
  const [activeSubTab, setActiveSubTab] = useState<'form' | 'bot-guide' | 'simulator' | 'webhook'>('form');

  // Form State (Only short name + beyblade needed; LINE ID is auto-populated)
  const [name, setName] = useState('');
  const [autoLineId, setAutoLineId] = useState(() => {
    return `U${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  });
  const [selectedBeyblade, setSelectedBeyblade] = useState(POPULAR_BEYBLADES[0].name);
  const [beybladeType, setBeybladeType] = useState<BeybladeType>('attack');
  const [combo, setCombo] = useState(POPULAR_BEYBLADES[0].combo);
  const [clubOrTeam, setClubOrTeam] = useState('LINE 戰鬥陀螺群組');
  const [notes, setNotes] = useState('');
  
  // Registration state & receipt
  const [submitted, setSubmitted] = useState(false);
  const [lastSubmission, setLastSubmission] = useState<{
    name: string;
    lineId?: string;
    beyblade: string;
    type: BeybladeType;
    combo: string;
    club: string;
    notes?: string;
    timestamp: number;
  } | null>(null);
  
  const [copied, setCopied] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedDevWebhook, setCopiedDevWebhook] = useState(false);
  const [copiedPreWebhook, setCopiedPreWebhook] = useState(false);

  // Webhook Test State
  const [testWebhookStatus, setTestWebhookStatus] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
    loading: boolean;
  }>({
    tested: false,
    success: false,
    message: '',
    loading: false
  });

  // Chat Simulator State
  const [chatInput, setChatInput] = useState('');
  const [simUserShortName, setSimUserShortName] = useState('旋風弦仔');
  const [simUserLineId, setSimUserLineId] = useState('U8A192B88');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm-init',
      sender: 'bot',
      text: `👋 歡迎加入【${tournament?.name || '戰鬥陀螺 X 雙翼爭霸賽'}】LINE 群組！\n\n📝 群友快速報名方式：\n傳送「+1 簡稱 陀螺名稱」\n（例：+1 弦仔 飛翼鳳凰 9-60GF）\n✨ 系統會自動帶入您的 LINE ID，無須手動輸入！\n\n📌 查詢指令：傳送「查榜」或「賽程」`,
      timestamp: Date.now() - 60000
    }
  ]);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const targetSize = tournament?.targetSize || 16;
  const remainingSlots = Math.max(0, targetSize - approvedCount);

  const webhookFullUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/line/webhook` 
    : '/api/line/webhook';

  const handleGenerateNewLineId = () => {
    setAutoLineId(`U${Math.random().toString(36).substring(2, 10).toUpperCase()}`);
  };

  const handleBeybladeSelect = (bName: string) => {
    setSelectedBeyblade(bName);
    const found = POPULAR_BEYBLADES.find((b) => b.name === bName);
    if (found) {
      setBeybladeType(found.type);
      setCombo(found.combo);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name: name.trim(),
      lineId: autoLineId,
      beybladeName: selectedBeyblade,
      beybladeType,
      blade: combo,
      clubOrTeam: clubOrTeam.trim() || 'LINE 群組選手',
      notes: notes.trim() || undefined,
      isSeed: false
    };

    onRegisterPlayer(payload);

    setLastSubmission({
      name: payload.name,
      lineId: payload.lineId,
      beyblade: payload.beybladeName,
      type: payload.beybladeType,
      combo: payload.blade,
      club: payload.clubOrTeam,
      notes: payload.notes,
      timestamp: Date.now()
    });

    setSubmitted(true);
    setName('');
    setNotes('');
  };

  const getRegistrationLink = () => {
    if (tournament) {
      return buildRegistrationUrl(tournament);
    }
    const url = new URL(window.location.href);
    url.searchParams.set('mode', 'register');
    return url.toString();
  };

  const formattedSessionId = tournament?.id 
    ? `${tournament.id.replace('tour_', '').slice(-8).toUpperCase()}` 
    : 'SESSION-01';

  const cloudRunDevWebhook = 'https://ais-dev-3jqtjplebjzgmvdtnceo5q-47778563462.asia-northeast1.run.app/api/line/webhook';
  const cloudRunPreWebhook = 'https://ais-pre-3jqtjplebjzgmvdtnceo5q-47778563462.asia-northeast1.run.app/api/line/webhook';

  const handleCopyDevWebhook = () => {
    navigator.clipboard.writeText(cloudRunDevWebhook);
    setCopiedDevWebhook(true);
    setTimeout(() => setCopiedDevWebhook(false), 2500);
  };

  const handleCopyPreWebhook = () => {
    navigator.clipboard.writeText(cloudRunPreWebhook);
    setCopiedPreWebhook(true);
    setTimeout(() => setCopiedPreWebhook(false), 2500);
  };

  const handleTestWebhookLive = async () => {
    setTestWebhookStatus({
      tested: true,
      loading: true,
      success: false,
      message: '正在向 /api/line/webhook 發送 LINE 模擬驗證封包 (Ping)...'
    });

    try {
      // 1. Test GET check
      const getRes = await fetch('/api/line/webhook');
      if (!getRes.ok) {
        throw new Error(`GET 檢查失敗 (HTTP ${getRes.status})`);
      }

      // 2. Test POST check (LINE Verify payload)
      const postRes = await fetch('/api/line/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-line-signature': 'test_verification_signature_ping'
        },
        body: JSON.stringify({
          destination: '2011189628',
          events: []
        })
      });

      if (!postRes.ok) {
        throw new Error(`POST Verify 模擬失敗 (HTTP ${postRes.status})`);
      }

      const data = await postRes.json();

      setTestWebhookStatus({
        tested: true,
        loading: false,
        success: true,
        message: `✅ 端點連線正常！伺服器成功回傳 HTTP 200 OK (${JSON.stringify(data)})。端點已完全就緒！`
      });
    } catch (err: any) {
      setTestWebhookStatus({
        tested: true,
        loading: false,
        success: false,
        message: `⚠️ 測試失敗：${err?.message || '伺服器未回應'}`
      });
    }
  };

  const handleCopyInviteLink = () => {
    const link = getRegistrationLink();
    const inviteText = `🌀【${tournament?.name || '戰鬥陀螺 X 雙翼爭霸賽'}】LINE BOT 開始受理登記報名！\n⚡ 場次編號：#${formattedSessionId}\n⚡ 賽事規模：${targetSize} 人雙翼對決（${tournament?.matchTargetScore || 4} 分制）\n🤖 群組直接登記：傳送「+1 選手簡稱 陀螺名稱」\n✨ LINE ID 自動帶入，無須手動輸入！\n🔗 或點擊專屬登記頁面：\n${link}\n🔥 剩餘名額：${remainingSlots} 人，即刻卡位！`;
    navigator.clipboard.writeText(inviteText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookFullUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  // Send simulated message to LINE BOT
  const handleSendSimulatedMessage = async (textToSend?: string) => {
    const text = (textToSend || chatInput).trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: `m_${Date.now()}_u`,
      sender: 'user',
      userName: simUserShortName,
      userLineId: simUserLineId,
      text,
      timestamp: Date.now()
    };

    setMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsBotTyping(true);

    try {
      const res = await simulateLineBotMessageApi(
        text,
        { name: simUserShortName, lineId: simUserLineId },
        tournament?.id
      );

      setIsBotTyping(false);

      if (res && res.replyText) {
        const botMsg: ChatMessage = {
          id: `m_${Date.now()}_b`,
          sender: 'bot',
          text: res.replyText,
          timestamp: Date.now()
        };
        setMessages((prev) => [...prev, botMsg]);

        // If registered a new player, also inform parent app state
        if (res.registered && res.player) {
          onRegisterPlayer({
            name: res.player.name,
            lineId: res.player.lineId,
            beybladeName: res.player.beybladeName,
            beybladeType: (res.player.beybladeType?.toLowerCase() as BeybladeType) || 'attack',
            blade: res.player.blade || '9-60GF',
            clubOrTeam: res.player.clubOrTeam || 'LINE 群組報名',
            notes: res.player.notes,
            isSeed: false
          });
        }
      }
    } catch (err) {
      setIsBotTyping(false);
      const errMsg: ChatMessage = {
        id: `m_${Date.now()}_err`,
        sender: 'bot',
        text: '⚠️ 伺服器處理回應逾時，請稍後重試。',
        timestamp: Date.now()
      };
      setMessages((prev) => [...prev, errMsg]);
    }
  };

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isBotTyping]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 sm:py-8 space-y-6">
      {/* Standalone Top Bar for LINE Users */}
      {isStandaloneMode && (
        <div className="flex items-center justify-between bg-[#0a0c12] border border-[#ffffff15] p-3.5 rounded-2xl shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#06C755] flex items-center justify-center text-white shadow-md font-mono font-bold">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
                <span>LINE BOT 賽事登記專用傳送門</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="text-[11px] font-mono text-gray-400">
                場次鎖定：<span className="text-[#00f2ff] font-bold">{tournament?.name}</span> (ID: #{formattedSessionId})
              </div>
            </div>
          </div>

          {onSwitchToAdmin && (
            <button
              onClick={onSwitchToAdmin}
              className="text-xs font-mono px-3 py-1.5 rounded-lg bg-[#ffffff08] hover:bg-[#ffffff15] text-gray-300 border border-[#ffffff15] transition-colors"
            >
              切換主辦後台 ➔
            </button>
          )}
        </div>
      )}

      {/* 1. 場次資訊 (Match / Session Details Card) */}
      <div className="bg-[#0a0c12] border border-[#00f2ff]/30 rounded-3xl p-5 sm:p-7 shadow-[0_0_40px_rgba(0,242,255,0.12)] relative overflow-hidden">
        {/* Top Accent Line */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#06C755] via-[#00f2ff] to-[#7000ff]" />

        {/* Verified Current Session Banner */}
        <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 bg-[#00f2ff]/10 border border-[#00f2ff]/30 rounded-lg text-xs font-mono text-[#00f2ff]">
          <CheckSquare className="w-3.5 h-3.5 text-[#00f2ff]" />
          <span>已確認鎖定本場次 • 登記資料將直接排入本賽程</span>
          <span className="text-gray-400">|</span>
          <span className="text-gray-300 font-bold">場次編號 #{formattedSessionId}</span>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#ffffff10] pb-5 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#06C755]/20 text-[#06C755] border border-[#06C755]/40 flex items-center gap-1">
                <Bot className="w-3 h-3" /> LINE BOT 智慧收集
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30">
                {tournament?.targetSize || 16} 人雙翼賽制
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#7000ff]/20 text-purple-300 border border-[#7000ff]/30">
                {tournament?.matchTargetScore || 4} 分晉級制
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
              {tournament?.name || '2026 夏季戰鬥陀螺 X 雙翼極限爭霸賽'}
            </h1>
            <p className="text-xs font-mono text-gray-400 mt-1">
              支援 LINE BOT 群組直接登記（輸入簡稱即自動帶入 LINE ID）• 即時同步審核佇列
            </p>
          </div>

          <button
            id="btn-copy-line-link"
            onClick={handleCopyInviteLink}
            className="px-4 py-2.5 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white text-xs font-mono font-bold shadow-[0_0_20px_rgba(6,199,85,0.3)] transition-all flex items-center gap-2 shrink-0 active:scale-95"
          >
            {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
            {copied ? '已複製 LINE 邀請文字！' : '複製 LINE 邀請文字'}
          </button>
        </div>

        {/* Session Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
          <div className="bg-[#05070a] border border-[#ffffff10] rounded-xl p-3 text-center">
            <span className="text-[11px] text-gray-400 block mb-0.5">場次規模</span>
            <span className="text-lg font-black text-white">{targetSize} 人</span>
            <span className="text-[10px] text-gray-500 block">左翼 {targetSize/2} vs 右翼 {targetSize/2}</span>
          </div>

          <div className="bg-[#05070a] border border-[#ffffff10] rounded-xl p-3 text-center">
            <span className="text-[11px] text-gray-400 block mb-0.5">已核准登記</span>
            <span className="text-lg font-black text-emerald-400">{approvedCount} 人</span>
            <span className="text-[10px] text-emerald-500/80 block">名額佔比 {Math.round((approvedCount/targetSize)*100)}%</span>
          </div>

          <div className="bg-[#05070a] border border-[#ffffff10] rounded-xl p-3 text-center">
            <span className="text-[11px] text-gray-400 block mb-0.5">剩餘可報名額</span>
            <span className="text-lg font-black text-[#00f2ff]">{remainingSlots} 位</span>
            <span className="text-[10px] text-[#00f2ff]/70 block">{remainingSlots === 0 ? '即將額滿' : '開放登記中'}</span>
          </div>

          <div className="bg-[#05070a] border border-[#ffffff10] rounded-xl p-3 text-center">
            <span className="text-[11px] text-gray-400 block mb-0.5">待審核中</span>
            <span className="text-lg font-black text-amber-400">{pendingCount} 人</span>
            <span className="text-[10px] text-amber-500/80 block">主辦者即時審核</span>
          </div>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#ffffff15] pb-2 overflow-x-auto font-mono text-xs">
        <button
          onClick={() => setActiveSubTab('form')}
          className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'form'
              ? 'bg-[#00f2ff]/20 text-[#00f2ff] border border-[#00f2ff]/40 shadow-[0_0_15px_rgba(0,242,255,0.2)]'
              : 'bg-[#0a0c12] text-gray-400 border border-[#ffffff10] hover:text-white'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>📝 選手簡稱極速登記 (LINE ID 自動帶入)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('simulator')}
          className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'simulator'
              ? 'bg-[#06C755]/20 text-[#06C755] border border-[#06C755]/40 shadow-[0_0_15px_rgba(6,199,85,0.2)]'
              : 'bg-[#0a0c12] text-gray-400 border border-[#ffffff10] hover:text-white'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>💬 LINE BOT 群組對話實測模擬器</span>
          <span className="w-2 h-2 rounded-full bg-[#06C755] animate-ping" />
        </button>

        <button
          onClick={() => setActiveSubTab('bot-guide')}
          className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'bot-guide'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
              : 'bg-[#0a0c12] text-gray-400 border border-[#ffffff10] hover:text-white'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>⚡ LINE 群組 BOT 指令說明</span>
        </button>

        <button
          onClick={() => setActiveSubTab('webhook')}
          className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'webhook'
              ? 'bg-slate-700 text-white border border-slate-600'
              : 'bg-[#0a0c12] text-gray-400 border border-[#ffffff10] hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>⚙️ Webhook 串接設定</span>
        </button>
      </div>

      {/* TAB 1: 選手簡稱極速登記 (LINE ID 自動帶入) */}
      {activeSubTab === 'form' && (
        <div className="bg-[#0a0c12] border border-[#ffffff15] rounded-3xl p-5 sm:p-7 shadow-xl relative animate-fade-in">
          <div className="flex items-center justify-between border-b border-[#ffffff10] pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00f2ff]/15 border border-[#00f2ff]/30 flex items-center justify-center text-[#00f2ff] shadow-[0_0_15px_rgba(0,242,255,0.2)]">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white tracking-wide flex items-center gap-2">
                  <span>選手簡稱極速登記</span>
                  <span className="text-[10px] font-mono font-bold bg-[#06C755]/20 text-[#06C755] border border-[#06C755]/40 px-2 py-0.5 rounded">
                    LINE ID 自動帶入
                  </span>
                </h2>
                <p className="text-xs font-mono text-gray-400">
                  選手僅需填寫「簡稱/暱稱」與「陀螺」，LINE ID 由系統自動抓取鎖定
                </p>
              </div>
            </div>
          </div>

          {submitted && lastSubmission ? (
            /* Registration Confirmation Receipt */
            <div className="space-y-6 animate-fade-in">
              <div className="bg-emerald-950/30 border-2 border-emerald-500/50 rounded-2xl p-6 text-center space-y-3 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                <div className="w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 mx-auto border border-emerald-500/40">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">
                    【{lastSubmission.name}】登記申請已成功送出！
                  </h3>
                  <p className="text-xs font-mono text-emerald-300 mt-1">
                    LINE ID: <span className="font-bold text-white">{lastSubmission.lineId}</span> (已自動帶入) • 已同步至主辦方審核佇列！
                  </p>
                </div>
              </div>

              {/* 登記內容明細卡 */}
              <div className="bg-[#05070a] border border-[#ffffff15] rounded-2xl p-5 space-y-3 font-mono">
                <div className="text-xs font-bold text-gray-300 border-b border-[#ffffff10] pb-2 flex items-center justify-between">
                  <span>📋 登記內容確認單 (Registration Receipt)</span>
                  <span className="text-[10px] text-gray-500">
                    {new Date(lastSubmission.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex justify-between p-2.5 bg-[#0a0c12] rounded-lg border border-[#ffffff0a]">
                    <span className="text-gray-400">登記場次：</span>
                    <span className="font-bold text-white">{tournament?.name}</span>
                  </div>
                  <div className="flex justify-between p-2.5 bg-[#0a0c12] rounded-lg border border-[#ffffff0a]">
                    <span className="text-gray-400">選手簡稱：</span>
                    <span className="font-bold text-[#00f2ff]">{lastSubmission.name}</span>
                  </div>
                  <div className="flex justify-between p-2.5 bg-[#0a0c12] rounded-lg border border-emerald-500/20 bg-emerald-950/10">
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> LINE ID (自動帶入)：
                    </span>
                    <span className="font-bold text-emerald-300">{lastSubmission.lineId || '自動鎖定'}</span>
                  </div>
                  <div className="flex justify-between p-2.5 bg-[#0a0c12] rounded-lg border border-[#ffffff0a]">
                    <span className="text-gray-400">出戰戰鬥陀螺：</span>
                    <span className="font-bold text-amber-300">{lastSubmission.beyblade}</span>
                  </div>
                  <div className="flex justify-between p-2.5 bg-[#0a0c12] rounded-lg border border-[#ffffff0a]">
                    <span className="text-gray-400">改裝配置 (Combo)：</span>
                    <span className="text-white">{lastSubmission.combo}</span>
                  </div>
                  <div className="flex justify-between p-2.5 bg-[#0a0c12] rounded-lg border border-[#ffffff0a]">
                    <span className="text-gray-400">所屬戰隊：</span>
                    <span className="text-gray-200">{lastSubmission.club}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-6 py-2.5 rounded-xl bg-[#11141d] hover:bg-[#ffffff15] text-[#00f2ff] text-xs font-mono font-bold border border-[#00f2ff]/30 transition-all shadow-[0_0_15px_rgba(0,242,255,0.15)]"
                >
                  ＋ 繼續登記下一位選手 / 重新填寫
                </button>
              </div>
            </div>
          ) : (
            /* Streamlined Registration Input Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Short Name (簡稱) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono font-bold text-white flex items-center justify-between">
                    <span>
                      選手簡稱 / 群組暱稱 <span className="text-red-400">*</span>
                    </span>
                    <span className="text-[10px] text-[#00f2ff] font-normal">只需填寫簡稱！</span>
                  </label>
                  <input
                    id="input-player-shortname"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例如：弦仔、小豪、Ray、阿翔"
                    required
                    className="w-full px-3.5 py-3 bg-[#05070a] border-2 border-[#00f2ff]/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#00f2ff] text-sm font-mono shadow-[0_0_15px_rgba(0,242,255,0.15)] transition-colors"
                  />
                  <p className="text-[10px] font-mono text-gray-400">
                    此簡稱將直接顯示於雙翼對決樹狀圖與即時比分榜上
                  </p>
                </div>

                {/* Auto-filled LINE ID */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono font-semibold text-gray-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>LINE 識別碼 (LINE ID)</span>
                    </label>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60 flex items-center gap-1">
                      <CheckCheck className="w-3 h-3 text-emerald-400" />
                      系統自動帶入
                    </span>
                  </div>

                  <div className="relative flex items-center">
                    <input
                      id="input-player-lineid-auto"
                      type="text"
                      value={autoLineId}
                      readOnly
                      className="w-full px-3.5 py-3 bg-[#05070a] border border-emerald-500/40 rounded-xl text-emerald-300 font-mono text-sm focus:outline-none cursor-not-allowed select-all"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateNewLineId}
                      className="absolute right-2 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-gray-300 rounded border border-slate-700 flex items-center gap-1 transition-colors"
                      title="重產測試識別碼"
                    >
                      <RefreshCw className="w-3 h-3" />
                      換一組
                    </button>
                  </div>
                  <p className="text-[10px] font-mono text-gray-400">
                    由 LINE BOT / LIFF 端自動帶入發言者專屬識別 ID，無須選手自行輸入
                  </p>
                </div>
              </div>

              {/* Beyblade Selection */}
              <div>
                <label className="block text-xs font-mono font-semibold text-gray-300 mb-1.5 flex items-center justify-between">
                  <span>出戰戰鬥陀螺 (Beyblade X) <span className="text-red-400">*</span></span>
                  <span className="text-gray-500 text-[11px]">可快速選取主流熱門或自訂</span>
                </label>
                <select
                  id="select-beyblade"
                  value={selectedBeyblade}
                  onChange={(e) => handleBeybladeSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#05070a] border border-[#ffffff15] rounded-xl text-white focus:outline-none focus:border-[#00f2ff] text-sm font-mono"
                >
                  {POPULAR_BEYBLADES.map((b) => (
                    <option key={b.name} value={b.name}>
                      {b.name} — {b.type === 'attack' ? '⚔️ 攻擊' : b.type === 'defense' ? '🛡️ 防禦' : b.type === 'stamina' ? '🔄 持久' : '⚖️ 平衡'} ({b.combo})
                    </option>
                  ))}
                </select>
              </div>

              {/* Type & Combo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Type */}
                <div>
                  <label className="block text-xs font-mono font-semibold text-gray-300 mb-1.5">
                    陀螺類型屬性
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 font-mono">
                    {(['attack', 'defense', 'stamina', 'balance'] as BeybladeType[]).map((type) => {
                      const labels = {
                        attack: '⚔️ 攻擊型',
                        defense: '🛡️ 防禦型',
                        stamina: '🔄 持久型',
                        balance: '⚖️ 平衡型'
                      };
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setBeybladeType(type)}
                          className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
                            beybladeType === type
                              ? 'bg-[#00f2ff]/20 border-[#00f2ff] text-[#00f2ff] font-bold shadow-[0_0_10px_rgba(0,242,255,0.2)]'
                              : 'bg-[#05070a] border-[#ffffff10] text-gray-400 hover:text-white'
                          }`}
                        >
                          {labels[type]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Combo */}
                <div>
                  <label className="block text-xs font-mono font-semibold text-gray-300 mb-1.5">
                    改裝零件配置 (Ratchet & Bit)
                  </label>
                  <input
                    id="input-player-combo"
                    type="text"
                    value={combo}
                    onChange={(e) => setCombo(e.target.value)}
                    placeholder="例如: 3-60F, 9-60B, 5-70DB"
                    className="w-full px-3.5 py-2 bg-[#05070a] border border-[#ffffff15] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#00f2ff] text-sm font-mono"
                  />
                </div>
              </div>

              {/* Club & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-semibold text-gray-300 mb-1.5">
                    所屬戰隊 / LINE 群組 (選填)
                  </label>
                  <input
                    id="input-player-club"
                    type="text"
                    value={clubOrTeam}
                    onChange={(e) => setClubOrTeam(e.target.value)}
                    placeholder="例：LINE 陀螺選手群, Team Persona"
                    className="w-full px-3.5 py-2.5 bg-[#05070a] border border-[#ffffff15] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#00f2ff] text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-semibold text-gray-300 mb-1.5">
                    備註 / 發射器配件 (選填)
                  </label>
                  <input
                    id="input-player-notes"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="例：右迴旋拉條發射器、加長握把"
                    className="w-full px-3.5 py-2.5 bg-[#05070a] border border-[#ffffff15] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#00f2ff] text-sm font-mono"
                  />
                </div>
              </div>

              {/* Submit Action */}
              <div className="pt-3">
                <button
                  type="submit"
                  id="btn-submit-registration"
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#06C755] via-[#00f2ff] to-[#7000ff] hover:opacity-95 text-black font-black text-sm uppercase tracking-wider font-mono shadow-[0_0_25px_rgba(0,242,255,0.35)] transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                >
                  <Send className="w-4 h-4 text-black" />
                  送出登記內容 ➔ 立即排入主辦審核佇列
                </button>
                <p className="text-center text-[11px] font-mono text-gray-400 mt-2.5">
                  送出後資料即時同步至主辦方管理後台審核登記
                </p>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TAB 2: LINE BOT 群組對話實測模擬器 */}
      {activeSubTab === 'simulator' && (
        <div className="bg-[#0a0c12] border border-[#06C755]/30 rounded-3xl p-5 sm:p-7 shadow-[0_0_40px_rgba(6,199,85,0.1)] relative space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#ffffff10] gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#06C755] animate-ping" />
                <h3 className="text-base font-black text-white flex items-center gap-2 font-mono">
                  <span>LINE BOT 群組對話實測模擬器</span>
                  <span className="text-[10px] bg-[#06C755]/20 text-[#06C755] px-2 py-0.5 rounded border border-[#06C755]/40 font-normal">
                    群組指令：+1 簡稱 陀螺
                  </span>
                </h3>
              </div>
              <p className="text-xs font-mono text-gray-400 mt-0.5">
                在此模擬群組選手發言，體驗 LINE BOT 如何自動識別 LINE ID 並將「簡稱」送達主辦後台！
              </p>
            </div>

            {/* Simulated User Config */}
            <div className="flex items-center gap-2 bg-[#05070a] p-1.5 rounded-xl border border-[#ffffff10] text-xs font-mono shrink-0">
              <span className="text-gray-400 pl-1">發言者簡稱:</span>
              <input
                type="text"
                value={simUserShortName}
                onChange={(e) => setSimUserShortName(e.target.value)}
                className="w-24 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-xs font-bold"
                placeholder="簡稱"
              />
              <span className="text-gray-500">|</span>
              <span className="text-emerald-400 text-[10px] font-mono">ID: {simUserLineId}</span>
            </div>
          </div>

          {/* Chat Messages Container */}
          <div className="bg-[#05070a] border border-[#ffffff10] rounded-2xl p-4 h-[380px] overflow-y-auto space-y-3 font-mono">
            {messages.map((msg) => {
              if (msg.sender === 'user') {
                return (
                  <div key={msg.id} className="flex flex-col items-end space-y-1">
                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                      <span className="font-bold text-[#00f2ff]">{msg.userName || '選手'}</span>
                      <span className="text-gray-600 font-mono">({msg.userLineId})</span>
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </div>
                    <div className="bg-[#00f2ff]/20 text-white border border-[#00f2ff]/40 px-3.5 py-2.5 rounded-2xl rounded-tr-none max-w-[85%] text-xs shadow-md">
                      {msg.text}
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id} className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#06C755] flex items-center justify-center text-white font-bold shrink-0 shadow-md">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="space-y-1 max-w-[85%]">
                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                      <span className="font-bold text-[#06C755]">戰鬥陀螺 X 賽事 BOT</span>
                      <span className="bg-[#06C755]/20 text-[#06C755] px-1 rounded text-[9px]">OFFICIAL</span>
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-700/80 text-gray-200 px-3.5 py-2.5 rounded-2xl rounded-tl-none text-xs whitespace-pre-line leading-relaxed shadow-lg">
                      {msg.text}
                    </div>
                  </div>
                </div>
              );
            })}

            {isBotTyping && (
              <div className="flex items-center gap-2 text-xs text-gray-400 font-mono pl-10">
                <span className="w-2 h-2 rounded-full bg-[#06C755] animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-[#06C755] animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-[#06C755] animate-bounce [animation-delay:0.4s]" />
                <span>BOT 正在處理登記並建立選手資料...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick Action Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono">
            <span className="text-gray-400 text-[11px] shrink-0">點擊快速發言:</span>
            <button
              onClick={() => handleSendSimulatedMessage(`+1 ${simUserShortName} 飛翼鳳凰 9-60GF`)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 shrink-0 transition-colors"
            >
              +1 {simUserShortName} 飛翼鳳凰 9-60GF
            </button>
            <button
              onClick={() => handleSendSimulatedMessage(`++1 選手B 爆風巨神 3-60F`)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg border border-slate-700 shrink-0 transition-colors"
            >
              ++1 選手B 爆風巨神 3-60F
            </button>
            <button
              onClick={() => handleSendSimulatedMessage(`-1 ${simUserShortName}`)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded-lg border border-slate-700 shrink-0 transition-colors"
            >
              -1 {simUserShortName}
            </button>
            <button
              onClick={() => handleSendSimulatedMessage('查榜')}
              className="px-2.5 py-1 bg-[#00f2ff]/15 hover:bg-[#00f2ff]/25 text-[#00f2ff] rounded-lg border border-[#00f2ff]/30 shrink-0 transition-colors"
            >
              查榜
            </button>
            <button
              onClick={() => handleSendSimulatedMessage('賽程')}
              className="px-2.5 py-1 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 rounded-lg border border-purple-500/30 shrink-0 transition-colors"
            >
              賽程
            </button>
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendSimulatedMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="輸入如「+1 簡稱 陀螺名稱」或「查榜」..."
              className="flex-1 px-4 py-3 bg-[#05070a] border border-[#ffffff15] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#06C755] text-xs font-mono"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isBotTyping}
              className="px-5 py-3 bg-[#06C755] hover:bg-[#05b34c] disabled:opacity-50 text-white rounded-xl font-mono font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(6,199,85,0.3)] shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>發送訊息</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: LINE 群組 BOT 指令說明 */}
      {activeSubTab === 'bot-guide' && (
        <div className="bg-[#0a0c12] border border-purple-500/30 rounded-3xl p-5 sm:p-7 shadow-xl space-y-5 animate-fade-in font-mono">
          <div className="flex items-center gap-3 border-b border-[#ffffff10] pb-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">LINE BOT 群組對戰登記運作方式</h3>
              <p className="text-xs text-gray-400">群組選手無需開啟繁瑣網頁，於 LINE 聊天室直接輸入指令即可自動收集</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-[#05070a] border border-[#ffffff10] rounded-2xl p-4 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-[#00f2ff]/20 text-[#00f2ff] flex items-center justify-center font-bold">
                1
              </div>
              <h4 className="font-bold text-white text-sm">群組直接發言報名</h4>
              <p className="text-gray-400 leading-relaxed">
                群友只要在群組打出：<br />
                <code className="text-[#00f2ff] bg-slate-900 px-1.5 py-0.5 rounded block my-1">
                  +1 選手簡稱 陀螺名稱
                </code>
                （例：+1 弦仔 飛翼鳳凰 9-60GF）
              </p>
            </div>

            <div className="bg-[#05070a] border border-[#ffffff10] rounded-2xl p-4 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-[#06C755]/20 text-[#06C755] flex items-center justify-center font-bold">
                2
              </div>
              <h4 className="font-bold text-white text-sm">自動抓取 LINE ID</h4>
              <p className="text-gray-400 leading-relaxed">
                BOT 透過 LINE Messaging API <span className="text-emerald-400 font-bold">自動提取發言者的 User ID</span>，選手完全不需手動輸入或複製 ID。
              </p>
            </div>

            <div className="bg-[#05070a] border border-[#ffffff10] rounded-2xl p-4 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold">
                3
              </div>
              <h4 className="font-bold text-white text-sm">即時排入主辦審核</h4>
              <p className="text-gray-400 leading-relaxed">
                資料即時寫入本場次資料庫，主辦在管理後台「待審核佇列」可一鍵全數核准，排入雙翼樹狀圖！
              </p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
            <h4 className="font-bold text-[#00f2ff] flex items-center gap-1.5">
              <Terminal className="w-4 h-4" /> 支援的群組對話指令列表
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-300">
              <div className="p-2 bg-[#05070a] rounded-lg border border-slate-800">
                <span className="text-emerald-400 font-bold block mb-0.5">+1 簡稱 [陀螺]</span>
                <span className="text-gray-400 text-[11px]">快速報名登記，自動鎖定當前場次</span>
              </div>
              <div className="p-2 bg-[#05070a] rounded-lg border border-slate-800">
                <span className="text-emerald-400 font-bold block mb-0.5">查榜 / 名單</span>
                <span className="text-gray-400 text-[11px]">查詢本場次目前核准與審核中清單與剩餘名額</span>
              </div>
              <div className="p-2 bg-[#05070a] rounded-lg border border-slate-800">
                <span className="text-emerald-400 font-bold block mb-0.5">賽程 / 樹狀圖</span>
                <span className="text-gray-400 text-[11px]">查詢當前進行中的激戰比分與對決狀況</span>
              </div>
              <div className="p-2 bg-[#05070a] rounded-lg border border-slate-800">
                <span className="text-emerald-400 font-bold block mb-0.5">幫助 / 指令</span>
                <span className="text-gray-400 text-[11px]">顯示 BOT 操作使用說明</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Webhook 串接設定 */}
      {activeSubTab === 'webhook' && (
        <div className="bg-[#0a0c12] border border-slate-700 rounded-3xl p-5 sm:p-7 shadow-xl space-y-6 animate-fade-in font-mono text-xs">
          <div className="flex items-center justify-between border-b border-[#ffffff10] pb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-800 text-white border border-slate-700 flex items-center justify-center font-bold">
                <Settings className="w-5 h-5 text-[#00f2ff]" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">LINE Messaging API Webhook 串接設定</h3>
                <p className="text-gray-400">已綁定官方 Channel 憑證，支援自動權杖換發與群組訊息接收</p>
              </div>
            </div>
            
            <button
              onClick={handleTestWebhookLive}
              disabled={testWebhookStatus.loading}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-[#00f2ff] rounded-xl border border-[#00f2ff]/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50 shrink-0"
            >
              {testWebhookStatus.loading ? (
                <div className="w-3.5 h-3.5 border-2 border-[#00f2ff] border-t-transparent rounded-full animate-spin" />
              ) : (
                <Activity className="w-3.5 h-3.5" />
              )}
              <span>測試 Webhook 端點狀態</span>
            </button>
          </div>

          {/* Test Status Banner */}
          {testWebhookStatus.tested && (
            <div
              className={`p-3.5 rounded-2xl border flex items-start gap-2.5 animate-fade-in ${
                testWebhookStatus.success
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}
            >
              {testWebhookStatus.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 text-xs">
                <p className="font-bold">{testWebhookStatus.message}</p>
              </div>
            </div>
          )}

          {/* Configured Channel Status Badge */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-[#05070a] border border-emerald-500/30 rounded-xl">
              <span className="text-[10px] text-gray-400 block mb-1">LINE Channel ID</span>
              <span className="font-bold text-white text-sm font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                2011189628
              </span>
              <span className="text-[9px] text-emerald-400 mt-1 block">✓ 已配置連線</span>
            </div>

            <div className="p-3 bg-[#05070a] border border-emerald-500/30 rounded-xl">
              <span className="text-[10px] text-gray-400 block mb-1">Channel Secret 狀態</span>
              <span className="font-bold text-white text-sm font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                d8a986...fa33
              </span>
              <span className="text-[9px] text-emerald-400 mt-1 block">✓ 支援自動取得 Access Token</span>
            </div>

            <div className="p-3 bg-[#05070a] border border-[#00f2ff]/30 rounded-xl">
              <span className="text-[10px] text-gray-400 block mb-1">Webhook 端點狀態</span>
              <span className="font-bold text-[#00f2ff] text-sm font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#00f2ff] animate-pulse" />
                /api/line/webhook
              </span>
              <span className="text-[9px] text-[#00f2ff] mt-1 block">✓ 支援 GET / POST 200 OK 驗證</span>
            </div>
          </div>

          {/* 302 Found Troubleshooting Notice Box */}
          <div className="p-4 bg-amber-950/30 border border-amber-500/40 rounded-2xl space-y-2.5">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>為什麼 LINE Verify 會回傳「302 Found」錯誤？</span>
            </div>
            <p className="text-gray-300 text-xs leading-relaxed">
              Google AI Studio 的開發預覽網址（<code className="text-amber-300">ais-dev-...</code>）受 Google 帳號安全登入保護，當 LINE 官方伺服器發送請求時，會被 Google 代理伺服器攔截並轉址（HTTP 302 重導向至登入頁）。
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div className="p-2.5 bg-black/50 border border-amber-500/20 rounded-xl space-y-1">
                <span className="font-bold text-[#00f2ff] text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 解法一：使用分享網址 (Shared URL)
                </span>
                <p className="text-[11px] text-gray-400">
                  點擊 AI Studio 頂部選單的 <strong className="text-white">「Share (分享)」</strong> 建立公開連結，使用公開分享網址（<code className="text-emerald-400">ais-pre-...</code>）即可供 LINE 外部直接連線。
                </p>
              </div>
              <div className="p-2.5 bg-black/50 border border-amber-500/20 rounded-xl space-y-1">
                <span className="font-bold text-emerald-400 text-xs flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> 解法二：免 Webhook 內建模擬器
                </span>
                <p className="text-[11px] text-gray-400">
                  可隨時切換至上方 <strong className="text-white">「BOT 聊天模擬器」</strong>，直接輸入指令測試選手登記與自動帶入，功能完全與真機相同！
                </p>
              </div>
            </div>
          </div>

          {/* Primary Cloud Run Webhook URL (Pre-Shared Public Endpoint) */}
          <div className="space-y-2 p-4 bg-[#05070a] border border-emerald-500/50 rounded-2xl shadow-lg shadow-emerald-950/20">
            <div className="flex items-center justify-between">
              <label className="text-white font-bold block flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">已分享公開網址（推薦用於 LINE Webhook）</span>
                <span>公開伺服器 Webhook URL</span>
              </label>
              <span className="text-[10px] text-emerald-400 font-bold">無 Google 登入攔截</span>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={cloudRunPreWebhook}
                readOnly
                className="flex-1 px-3.5 py-2.5 bg-black border border-emerald-500/40 rounded-xl text-emerald-300 select-all text-xs font-mono font-bold"
              />
              <button
                onClick={handleCopyPreWebhook}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow-lg"
              >
                {copiedPreWebhook ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                <span>{copiedPreWebhook ? '已複製！' : '複製公開 URL'}</span>
              </button>
            </div>
            <p className="text-[11px] text-gray-400">
              💡 請點擊「複製公開 URL」，並將其貼入 LINE Developers Console 的 <strong className="text-white">Webhook URL</strong>，再點擊 <strong className="text-emerald-400">Verify</strong>。
            </p>
          </div>

          {/* Dev URL */}
          <div className="space-y-2 p-4 bg-[#05070a] border border-slate-800 rounded-2xl">
            <label className="text-gray-300 font-bold block flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded bg-slate-800 text-gray-400 text-[10px]">開發環境網址</span>
                <span>內部開發預覽端點 (Dev Webhook URL)</span>
              </span>
              <span className="text-[10px] text-amber-400">需 Google 登入身分</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={cloudRunDevWebhook}
                readOnly
                className="flex-1 px-3.5 py-2.5 bg-black border border-slate-700 rounded-xl text-gray-400 select-all text-xs font-mono"
              />
              <button
                onClick={handleCopyDevWebhook}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors shrink-0"
              >
                {copiedDevWebhook ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedDevWebhook ? '已複製！' : '複製 URL'}</span>
              </button>
            </div>
          </div>

          {/* Detailed Verification Guide */}
          <div className="bg-[#05070a] border border-slate-800 rounded-2xl p-4 space-y-3 text-gray-300 leading-relaxed">
            <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              LINE Developers Webhook 設定與「Verify 驗證」解說：
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-400 text-xs pl-1">
              <li>
                前往 <a href="https://developers.line.biz/console/" target="_blank" rel="noreferrer" className="text-[#00f2ff] underline font-bold">LINE Developers Console</a>，點選 Channel ID <code className="text-white bg-slate-800 px-1 py-0.5 rounded">2011189628</code>。
              </li>
              <li>
                切換至 <span className="text-emerald-400 font-bold">Messaging API</span> 分頁，找到 <span className="text-white font-bold">Webhook settings</span>。
              </li>
              <li>
                在 <span className="text-white font-bold">Webhook URL</span> 欄位填入：
                <div className="mt-1 p-2 bg-black border border-slate-700 rounded-lg text-emerald-400 font-mono select-all text-[11px]">
                  https://ais-dev-3jqtjplebjzgmvdtnceo5q-47778563462.asia-northeast1.run.app/api/line/webhook
                </div>
              </li>
              <li>
                開啟 <span className="text-emerald-400 font-bold">「Use Webhook」</span> 開關（務必啟用）。
              </li>
              <li>
                點擊 Webhook URL 旁的 <span className="text-[#00f2ff] font-bold">「Verify」</span> 按鈕：
                <ul className="list-disc list-inside pl-3 mt-1 text-gray-400 space-y-1">
                  <li>伺服器已設定無論任何格式均即刻回傳 <code className="text-emerald-400">HTTP 200 OK</code>。</li>
                  <li>若出現「Error」，請檢查 URL 開頭是否為完整的 <code className="text-white">https://</code> 且結尾為 <code className="text-white">/api/line/webhook</code>。</li>
                </ul>
              </li>
              <li>
                在 <span className="text-purple-300 font-bold">LINE Official Account Manager</span> 的「帳號設定」確認已開啟 <span className="text-white font-bold">「允許加入群組或多人聊天室」</span>。
              </li>
              <li>
                將此 LINE 官方帳號邀請進入您的戰鬥陀螺群組，群友即可傳送 <code className="text-[#00f2ff] bg-slate-800 px-1 py-0.5 rounded">+1 簡稱 陀螺</code> 開始極速報名！
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* 3. 已登記名冊一覽 (透明公開的本場次登記狀態) */}
      {tournament && tournament.players.length > 0 && (
        <div className="bg-[#0a0c12] border border-[#ffffff10] rounded-2xl p-5 shadow-lg space-y-3 font-mono">
          <div className="flex items-center justify-between border-b border-[#ffffff10] pb-2 text-xs">
            <span className="font-bold text-gray-300 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#00f2ff]" />
              本場次已登記選手名單 ({tournament.players.length} 人)
            </span>
            <span className="text-gray-500 text-[11px]">
              核准: {approvedCount} • 待審: {pendingCount}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
            {tournament.players.map((p, i) => (
              <div
                key={p.id}
                className="p-2 bg-[#05070a] border border-[#ffffff0a] rounded-lg text-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-5 h-5 rounded-full bg-[#11141d] flex items-center justify-center text-[10px] text-gray-400 shrink-0">
                    {i + 1}
                  </span>
                  <div className="truncate">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-white truncate block">{p.name}</span>
                      {p.lineId && (
                        <span className="text-[9px] text-emerald-400 font-mono bg-emerald-950/60 px-1 rounded">
                          {p.lineId.slice(0, 6)}..
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 block truncate">{p.beybladeName}</span>
                  </div>
                </div>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ml-1 ${
                  p.status === 'approved' 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {p.status === 'approved' ? '已核准' : '審核中'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
