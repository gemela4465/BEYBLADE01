import React, { useState, useEffect } from 'react';
import { Archive, X, Calendar, Trophy, Users, FileText, CheckCircle2, Download, RefreshCw, Plus, Clock } from 'lucide-react';
import { Tournament } from '../types';
import { fetchTournamentHistoryApi, archiveTournamentApi } from '../utils/api';

interface TournamentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTournament: Tournament;
  onLoadArchivedTournament: (tournament: Tournament) => void;
  onTournamentArchived: (archivedTournament: Tournament) => void;
}

export const TournamentHistoryModal: React.FC<TournamentHistoryModalProps> = ({
  isOpen,
  onClose,
  currentTournament,
  onLoadArchivedTournament,
  onTournamentArchived
}) => {
  const [historyList, setHistoryList] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [archiveNote, setArchiveNote] = useState('');
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveSuccessMsg, setArchiveSuccessMsg] = useState('');
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const data = await fetchTournamentHistoryApi();
      setHistoryList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
      setArchiveSuccessMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleArchiveCurrent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsArchiving(true);
    try {
      const result = await archiveTournamentApi(currentTournament.id, archiveNote);
      if (result.success && result.tournament) {
        setArchiveSuccessMsg(`✅ 已成功將「${result.tournament.name}」存檔歸檔備查！`);
        setArchiveNote('');
        onTournamentArchived(result.tournament);
        loadHistory();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleExportJson = (t: Tournament) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(t, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${t.name.replace(/\s+/g, '_')}_record.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0a0c12] border border-[#ffffff20] rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-[0_0_60px_rgba(0,0,0,0.9)] text-[#e0e6ed] relative my-8">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#00f2ff] via-[#7000ff] to-[#06C755] opacity-90" />

        <button
          id="btn-close-history-modal"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 rounded-xl hover:bg-[#ffffff10] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7000ff]/20 border border-[#7000ff]/40 flex items-center justify-center text-purple-400 shadow-[0_0_15px_rgba(112,0,255,0.2)]">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-wide">賽事存檔記錄備查庫 (History Records)</h2>
              <p className="text-xs text-gray-400 font-mono">歷次賽事完整存檔、報名名單、對戰籤表比分與冠亞軍留存</p>
            </div>
          </div>

          <button
            onClick={loadHistory}
            className="p-2 rounded-xl bg-[#11141d] hover:bg-[#ffffff10] text-gray-400 hover:text-white text-xs flex items-center gap-1.5 font-mono"
            title="重新載入記錄"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">重新整理</span>
          </button>
        </div>

        {/* Current Tournament Quick Archive Panel */}
        <div className="p-4 bg-[#05070a] border border-[#ffffff15] rounded-2xl mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00f2ff] animate-pulse" />
              <span>將當前進行中的賽事存檔存查</span>
            </div>
            <span className="text-xs font-mono text-[#00f2ff]">
              「{currentTournament.name}」
            </span>
          </div>

          <form onSubmit={handleArchiveCurrent} className="flex flex-col sm:flex-row gap-2.5 mt-3">
            <input
              type="text"
              value={archiveNote}
              onChange={(e) => setArchiveNote(e.target.value)}
              placeholder="備註說明 (例如: 決賽精采對決 / 第1場結賽存檔)..."
              className="flex-1 px-3.5 py-2 bg-[#11141d] border border-[#ffffff15] rounded-xl text-white text-xs font-mono focus:outline-none focus:border-[#7000ff]"
            />
            <button
              type="submit"
              disabled={isArchiving}
              className="px-4 py-2 bg-[#7000ff] hover:bg-[#8524ff] disabled:opacity-50 text-white rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(112,0,255,0.4)] whitespace-nowrap"
            >
              <Archive className="w-3.5 h-3.5" />
              {isArchiving ? '存檔中...' : '確認存檔備查'}
            </button>
          </form>

          {archiveSuccessMsg && (
            <div className="mt-2.5 p-2 bg-emerald-950/40 border border-emerald-500/40 rounded-lg text-emerald-400 text-xs font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{archiveSuccessMsg}</span>
            </div>
          )}
        </div>

        {/* History List Table / Cards */}
        <div className="space-y-3 font-mono">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            歷史存檔列表 ({historyList.length} 場記錄)
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-gray-500 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#00f2ff]" />
              載入存檔記錄中...
            </div>
          ) : historyList.length === 0 ? (
            <div className="py-10 text-center text-gray-500 border border-dashed border-[#ffffff10] rounded-2xl">
              <Archive className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <p className="text-xs">目前尚無歷史存檔記錄。將賽事完賽後點擊上方「確認存檔備查」即可保存！</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
              {historyList.map((t, idx) => {
                const approvedCount = t.players?.filter(p => p.status === 'approved').length || 0;
                return (
                  <div
                    key={t.id || idx}
                    className="p-4 bg-[#05070a] border border-[#ffffff10] hover:border-[#7000ff]/50 rounded-2xl transition-all space-y-2.5 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="text-sm font-bold text-white group-hover:text-[#00f2ff] transition-colors">
                          {t.name}
                        </div>
                        <div className="text-[11px] text-gray-400 flex items-center gap-2">
                          <span>規模：{t.targetSize} 人</span>
                          <span>•</span>
                          <span>已審核：{approvedCount} 人</span>
                          <span>•</span>
                          <span>狀態：{t.status === 'completed' ? '🏆 已完賽' : t.status === 'in_progress' ? '⚔️ 進行中' : '⏳ 待開賽'}</span>
                        </div>
                      </div>
                    </div>

                    {(t.startTime || t.registrationDeadline) && (
                      <div className="text-[10px] text-gray-400 bg-[#11141d] p-2 rounded-lg space-y-0.5">
                        {t.startTime && <div>⏰ 開賽時間：{t.startTime}</div>}
                        {t.registrationDeadline && <div>⏳ 報名截止：{t.registrationDeadline}</div>}
                      </div>
                    )}

                    {t.archiveNote && (
                      <div className="text-xs text-purple-300/80 bg-purple-950/20 border border-purple-900/30 p-2 rounded-lg flex items-start gap-1.5">
                        <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{t.archiveNote}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-[#ffffff08] text-xs">
                      <button
                        onClick={() => handleExportJson(t)}
                        className="px-2.5 py-1 rounded-lg bg-[#11141d] hover:bg-[#ffffff15] text-gray-300 flex items-center gap-1 text-[11px] transition-colors"
                        title="下載 JSON 備查檔"
                      >
                        <Download className="w-3.5 h-3.5" />
                        匯出 JSON
                      </button>

                      <button
                        onClick={() => {
                          onLoadArchivedTournament(t);
                          onClose();
                        }}
                        className="px-3 py-1 rounded-lg bg-[#00f2ff]/15 hover:bg-[#00f2ff]/25 border border-[#00f2ff]/40 text-[#00f2ff] font-bold text-[11px] transition-colors flex items-center gap-1"
                      >
                        載入檢視此場賽事
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
