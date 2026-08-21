import { PresetBeyblade, FinishType } from '../types';

export const POPULAR_BEYBLADES: PresetBeyblade[] = [
  { name: '蒼穹神劍 (Dran Sword)', type: 'attack', combo: '3-60F (Flat)', color: '#3B82F6' },
  { name: '爆炎神劍 (Dran Buster)', type: 'attack', combo: '1-60A (Accel)', color: '#2563EB' },
  { name: '地獄魔鐮 (Hells Scythe)', type: 'balance', combo: '4-60T (Taper)', color: '#DC2626' },
  { name: '地獄魔鏈 (Hells Chain)', type: 'balance', combo: '5-60HT (High Taper)', color: '#B91C1C' },
  { name: '巫師魔箭 (Wizard Arrow)', type: 'stamina', combo: '4-80B (Ball)', color: '#EAB308' },
  { name: '魔導神杖 (Wizard Rod)', type: 'stamina', combo: '5-70DB (Disc Ball)', color: '#CA8A04' },
  { name: '騎士堅盾 (Knight Shield)', type: 'defense', combo: '3-80N (Needle)', color: '#10B981' },
  { name: '騎士長矛 (Knight Lance)', type: 'defense', combo: '4-80HN (High Needle)', color: '#059669' },
  { name: '鳳凰飛翼 (Phoenix Wing)', type: 'attack', combo: '9-60GF (Gear Flat)', color: '#EF4444' },
  { name: '鳳凰火羽 (Phoenix Feather)', type: 'attack', combo: '3-60F (Flat)', color: '#F97316' },
  { name: '狂鯊巨刃 (Shark Edge)', type: 'attack', combo: '3-60LF (Low Flat)', color: '#06B6D4' },
  { name: '犀牛狂角 (Rhino Horn)', type: 'defense', combo: '3-80S (Spike)', color: '#6B7280' },
  { name: '飛龍毒牙 (Viper Tail)', type: 'stamina', combo: '5-80O (Orb)', color: '#8B5CF6' },
  { name: '鈷藍龍帝 (Cobalt Drake)', type: 'attack', combo: '4-60F (Flat)', color: '#1D4ED8' },
  { name: '黑白巨龍 (Cobalt Dragoon)', type: 'attack', combo: '2-60C (Cyclone)', color: '#4338CA' },
  { name: '暴君狂爪 (Tyranno Beat)', type: 'attack', combo: '4-70Q (Quake)', color: '#D97706' },
  { name: '獨角戰獸 (Unicorn Sting)', type: 'balance', combo: '5-60GP (Gear Point)', color: '#EC4899' },
  { name: '飛翼雄獅 (Leon Claw)', type: 'balance', combo: '5-60P (Point)', color: '#F59E0B' },
  { name: '翼神雄獅 (Leon Crest)', type: 'defense', combo: '7-60GN (Gear Needle)', color: '#D97706' },
  { name: '白虎霸刃 (Weiss Tiger)', type: 'balance', combo: '3-60U (Unite)', color: '#94A3B8' }
];

export const FINISH_RULES: Record<FinishType, { name: string; enName: string; points: number; desc: string; badgeColor: string }> = {
  spin: {
    name: '迴轉獲勝 (Spin Finish)',
    enName: 'Spin Finish',
    points: 1,
    desc: '對手陀螺先停止旋轉，我方持續旋轉 (+1 分)',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40'
  },
  over: {
    name: '擊出場外 (Over Finish)',
    enName: 'Over Finish',
    points: 2,
    desc: '將對手陀螺擊出戰鬥盤Over區外 (+2 分)',
    badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/40'
  },
  burst: {
    name: '爆裂擊碎 (Burst Finish)',
    enName: 'Burst Finish',
    points: 2,
    desc: '將對手陀螺本體擊散拆解分離 (+2 分)',
    badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/40'
  },
  xtreme: {
    name: '極限衝擊 (Xtreme Finish)',
    enName: 'Xtreme Finish',
    points: 3,
    desc: '利用 X-Line 軌道將對手擊入 Xtreme Pocket 極限袋角 (+3 分)',
    badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/40'
  },
  penalty: {
    name: '違規罰分 (Penalty)',
    enName: 'Penalty Point',
    points: 1,
    desc: '發射失誤、搶先發射或裁判判罰 (+1 分)',
    badgeColor: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40'
  },
  manual: {
    name: '自訂調整 (Custom Point)',
    enName: 'Manual Score',
    points: 1,
    desc: '裁判手動修正比分 (+1 分)',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
  }
};

export const SAMPLE_PLAYERS = [
  { name: '黑須風見 (Kazami)', lineId: 'kazami_x', beybladeName: '蒼穹神劍 (Dran Sword)', beybladeType: 'attack' as const, clubOrTeam: 'Team Persona', isSeed: true, seedNumber: 1 },
  { name: '風見弦 (Bird)', lineId: 'bird_strike', beybladeName: '地獄魔鐮 (Hells Scythe)', beybladeType: 'balance' as const, clubOrTeam: 'Team Persona', isSeed: true, seedNumber: 2 },
  { name: '七色繁 (Multi)', lineId: 'multi_rainbow', beybladeName: '巫師魔箭 (Wizard Arrow)', beybladeType: 'stamina' as const, clubOrTeam: 'Team Persona', isSeed: true, seedNumber: 3 },
  { name: '萬獸王 (King)', lineId: 'lion_king99', beybladeName: '飛翼雄獅 (Leon Claw)', beybladeType: 'balance' as const, clubOrTeam: 'Team Zooganic', isSeed: true, seedNumber: 4 },
  { name: '藤原燃 (Burn)', lineId: 'phoenix_burn', beybladeName: '鳳凰飛翼 (Phoenix Wing)', beybladeType: 'attack' as const, clubOrTeam: 'Team Yggdrasil', isSeed: false },
  { name: '冥殿神 (Meiden)', lineId: 'hells_chain_m', beybladeName: '地獄魔鏈 (Hells Chain)', beybladeType: 'balance' as const, clubOrTeam: '極限突擊隊', isSeed: false },
  { name: '白星刃 (Blade)', lineId: 'white_tiger_x', beybladeName: '白虎霸刃 (Weiss Tiger)', beybladeType: 'balance' as const, clubOrTeam: '台灣陀螺俱樂部', isSeed: false },
  { name: '迅雷赤羽 (Akaba)', lineId: 'akaba_x_blade', beybladeName: '爆炎神劍 (Dran Buster)', beybladeType: 'attack' as const, clubOrTeam: '台北爆旋戰隊', isSeed: false },
  { name: '龍堂寺 (Ryuto)', lineId: 'cobalt_drake', beybladeName: '鈷藍龍帝 (Cobalt Drake)', beybladeType: 'attack' as const, clubOrTeam: '新竹疾風會', isSeed: false },
  { name: '神崎葵 (Aoi)', lineId: 'aoi_wizard', beybladeName: '魔導神杖 (Wizard Rod)', beybladeType: 'stamina' as const, clubOrTeam: '台中旋風盟', isSeed: false },
  { name: '鮫島鋼 (Samejima)', lineId: 'shark_edge_pro', beybladeName: '狂鯊巨刃 (Shark Edge)', beybladeType: 'attack' as const, clubOrTeam: '高雄巨浪戰隊', isSeed: false },
  { name: '金城鐵壁 (Kaneshiro)', lineId: 'knight_shield', beybladeName: '騎士堅盾 (Knight Shield)', beybladeType: 'defense' as const, clubOrTeam: '台南磐石堂', isSeed: false },
  { name: '夜叉丸 (Yasha)', lineId: 'viper_tail_x', beybladeName: '飛翼雄獅 (Leon Crest)', beybladeType: 'defense' as const, clubOrTeam: '桃園鬥神殿', isSeed: false },
  { name: '幻影流星 (Meteor)', lineId: 'unicorn_sting', beybladeName: '獨角戰獸 (Unicorn Sting)', beybladeType: 'balance' as const, clubOrTeam: 'LINE陀螺交流群', isSeed: false },
  { name: '雷霆狂角 (Thunder)', lineId: 'rhino_horn_x', beybladeName: '犀牛狂角 (Rhino Horn)', beybladeType: 'defense' as const, clubOrTeam: 'LINE陀螺交流群', isSeed: false },
  { name: '暴君疾風 (Tyrant)', lineId: 'tyranno_beat', beybladeName: '暴君狂爪 (Tyranno Beat)', beybladeType: 'attack' as const, clubOrTeam: 'LINE陀螺交流群', isSeed: false }
];
