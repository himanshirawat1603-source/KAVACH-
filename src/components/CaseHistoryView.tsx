import { useEffect, useState } from 'react';
import { ArrowRight, Clock, History, RefreshCw, Search } from 'lucide-react';
import { KavachCaseStatus } from '../types/incident';
import { fetchGlobalCaseHistory, GlobalCaseHistoryItem } from '../utils/apiClient';
import { getStatusBadgeClasses } from './DashboardView';

interface CaseHistoryViewProps {
  onOpenCase: (caseCode: string) => void;
}

export function CaseHistoryView({ onOpenCase }: CaseHistoryViewProps) {
  const [history, setHistory] = useState<GlobalCaseHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadHistory = async () => {
    setLoading(true);
    try {
      const items = await fetchGlobalCaseHistory();
      setHistory(items);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const filtered = history.filter((item) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      item.caseCode.toLowerCase().includes(q) ||
      item.caseTitle.toLowerCase().includes(q) ||
      item.newStatus.toLowerCase().includes(q) ||
      item.note.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
            Chronological Status Audit Trail
          </span>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Case History
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Every status change across your KAVACH cases is permanently recorded with timestamps and
            notes.
          </p>
        </div>

        <button
          type="button"
          onClick={loadHistory}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0A1428] hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Log
        </button>
      </div>

      {/* Search */}
      <div className="rounded-2xl bg-[#0A1428]/90 border border-blue-400/20 p-4">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter history by KAVACH Case ID, case title, status, or note..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#060D1B] border border-slate-700 focus:border-cyan-400 focus:outline-none text-xs sm:text-sm text-white placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Timeline List */}
      <div className="rounded-2xl bg-[#0A1428]/90 border border-blue-400/20 p-6">
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">
            Loading chronological case history...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <History className="h-9 w-9 text-cyan-400 mx-auto" />
            <p className="mt-3 text-base font-bold text-white">No Status History Entries Yet</p>
            <p className="mt-1 text-xs text-slate-400">
              Create a case or update its status to build a permanent chronological audit log.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 border-l border-blue-500/30 space-y-6">
            {filtered.map((entry) => (
              <div key={entry.id} className="relative">
                <span className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full bg-cyan-400 border-2 border-[#0A1428]" />
                <div className="rounded-xl bg-[#060D1B] border border-slate-800 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono font-bold text-cyan-300 px-2 py-0.5 rounded bg-blue-950/60 border border-cyan-400/25">
                        {entry.caseCode}
                      </span>
                      {entry.previousStatus && (
                        <>
                          <span className="text-slate-400">{entry.previousStatus}</span>
                          <span className="text-slate-500">→</span>
                        </>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded border font-semibold ${getStatusBadgeClasses(
                          entry.newStatus as KavachCaseStatus
                        )}`}
                      >
                        {entry.newStatus}
                      </span>
                      <span className="inline-flex items-center gap-1 text-slate-400 ml-1">
                        <Clock className="h-3 w-3" />
                        {new Date(entry.timestamp).toLocaleString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="text-sm font-bold text-white">{entry.caseTitle}</p>
                    <p className="text-xs text-slate-300">{entry.note}</p>
                    <p className="text-[11px] text-slate-500">Recorded by: {entry.changedBy}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenCase(entry.caseCode)}
                    className="self-start md:self-center inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-blue-600 text-xs font-semibold text-white transition-colors shrink-0 cursor-pointer"
                  >
                    Open Case
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
