import React, { useState } from 'react';
import { Download, Copy, Check, FileText, Share2, X, Printer, Trophy, Eye, ExternalLink } from 'lucide-react';
import { Tournament, Player } from '../types';
import { buildRegistrationUrl, buildReadOnlyBracketUrl } from '../utils/sessionHelper';

interface ExportShareModalProps {
  tournament: Tournament | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ExportShareModal: React.FC<ExportShareModalProps> = ({
  tournament,
  isOpen,
  onClose
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen || !tournament) return null;

  const playerMap = new Map<string, Player>();
  tournament.players.forEach((p) => playerMap.set(p.id, p));

  const readOnlyUrl = buildReadOnlyBracketUrl(tournament);
  const regUrl = buildRegistrationUrl(tournament);

  const generateReportText = () => {
    const lines: string[] = [];
    const sessionTag = tournament.id ? `#${tournament.id.slice(-6).toUpperCase()}` : '';
    lines.push(`🏆【${tournament.name}】雙翼賽程戰報總覽 (場次 ${sessionTag})`);
    lines.push(`📅 賽制規模：${tournament.targetSize} 人雙翼淘汰賽 (${tournament.matchTargetScore || 4} 分陀螺競程)`);
    lines.push(`⚡ 目前狀態：${tournament.status === 'completed' ? '已圓滿完賽' : '激戰進行中'}\n`);

    if (tournament.rankings?.champion) {
      lines.push(`👑【最終榮譽榜】`);
      lines.push(`🥇 冠軍：${tournament.rankings.champion.name} (${tournament.rankings.champion.beybladeName})`);
      if (tournament.rankings.runnerUp) {
        lines.push(`🥈 亞軍：${tournament.rankings.runnerUp.name} (${tournament.rankings.runnerUp.beybladeName})`);
      }
      if (tournament.rankings.thirdPlace) {
        lines.push(`🥉 季軍：${tournament.rankings.thirdPlace.name} (${tournament.rankings.thirdPlace.beybladeName})`);
      }
      if (tournament.rankings.fourthPlace) {
        lines.push(`🏅 殿軍：${tournament.rankings.fourthPlace.name} (${tournament.rankings.fourthPlace.beybladeName})`);
      }
      lines.push('');
    }

    lines.push(`⚔️【各場次比分紀錄】`);
    tournament.matches.forEach((m) => {
      const p1 = m.player1Id ? playerMap.get(m.player1Id) : null;
      const p2 = m.player2Id ? playerMap.get(m.player2Id) : null;
      const statusText = m.status === 'completed' ? `[${m.player1Score}:${m.player2Score} 完賽]` : m.status === 'bye' ? '[輪空晉級]' : '[未完賽]';
      lines.push(`• #${m.matchNumber} ${m.label}: ${p1 ? p1.name : '待定'} vs ${p2 ? p2.name : '待定'} ${statusText}`);
    });

    lines.push(`\n🌐 線上即時唯讀賽程表（數據實時同步，不可修改戰績）：\n${readOnlyUrl}`);
    lines.push(`\n🔗 LINE 選手登記專屬連結：\n${regUrl}`);
    return lines.join('\n');
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(generateReportText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyReadOnlyUrl = () => {
    navigator.clipboard.writeText(readOnlyUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(tournament, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `beyblade_tournament_${tournament.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-[#0a0c12] border border-[#ffffff15] rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-[0_0_60px_rgba(0,0,0,0.9)] text-[#e0e6ed] relative">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#00f2ff] to-transparent opacity-80" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 rounded-xl hover:bg-[#ffffff10] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#00f2ff]/15 border border-[#00f2ff]/30 flex items-center justify-center text-[#00f2ff] shadow-[0_0_15px_rgba(0,242,255,0.2)]">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white tracking-wide">匯出賽事資料與 LINE 戰報</h3>
            <p className="text-xs text-gray-400 font-mono">一鍵複製格式化文字傳送至 LINE 群組，或分享唯讀即時賽程網址</p>
          </div>
        </div>

        {/* Quick Action buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mb-5 font-mono">
          <button
            onClick={handleCopyReadOnlyUrl}
            className="p-3 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-300 transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Eye className="w-4 h-4" />}
            {copiedLink ? '已複製唯讀網址！' : '複製唯讀即時賽程網址'}
          </button>

          <button
            onClick={handleCopyText}
            className="p-3 bg-[#00f2ff]/10 hover:bg-[#00f2ff]/20 border border-[#00f2ff]/30 rounded-xl text-xs font-bold text-[#00f2ff] transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,242,255,0.1)]"
          >
            {copied ? <Check className="w-4 h-4 text-[#00f2ff]" /> : <Copy className="w-4 h-4" />}
            {copied ? '已複製戰報！' : '複製 LINE 群戰報'}
          </button>

          <button
            onClick={handleDownloadJSON}
            className="p-3 bg-[#7000ff]/15 hover:bg-[#7000ff]/25 border border-[#7000ff]/30 rounded-xl text-xs font-bold text-purple-300 transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(112,0,255,0.1)]"
          >
            <Download className="w-4 h-4" />
            下載 JSON 備份
          </button>

          <button
            onClick={handlePrint}
            className="p-3 bg-[#11141d] hover:bg-[#ffffff10] border border-[#ffffff10] rounded-xl text-xs font-bold text-gray-300 transition-all flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            列印 / PDF
          </button>
        </div>

        {/* Text Preview */}
        <div className="space-y-2">
          <label className="block text-xs font-mono font-semibold text-gray-300">LINE 群組發布文字預覽：</label>
          <textarea
            readOnly
            value={generateReportText()}
            rows={10}
            className="w-full p-3 bg-[#05070a] border border-[#ffffff15] rounded-xl text-xs font-mono text-gray-300 focus:outline-none focus:border-[#00f2ff] resize-none"
          />
        </div>

        <div className="flex justify-end pt-4 border-t border-[#ffffff10] mt-4">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-[#11141d] hover:bg-[#ffffff15] text-gray-300 text-xs font-semibold border border-[#ffffff10]"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
