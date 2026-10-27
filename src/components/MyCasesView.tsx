import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  FilePlus2,
  Filter,
  FolderOpen,
  Search,
} from 'lucide-react';
import {
  INCIDENT_CATEGORIES,
  IncidentCategory,
  IncidentRecord,
  KAVACH_CASE_STATUSES,
  KavachCaseStatus,
  WORKFLOW_STAGES,
} from '../types/incident';
import { downloadIncidentPdf } from '../utils/pdfGenerator';
import { getStatusBadgeClasses } from './DashboardView';

interface MyCasesViewProps {
  cases: IncidentRecord[];
  onOpenCase: (caseCode: string) => void;
  onCreateNew: () => void;
}

type SortOption = 'updated-desc' | 'created-desc' | 'incident-desc' | 'incident-asc';

export function MyCasesView({ cases, onOpenCase, onCreateNew }: MyCasesViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | KavachCaseStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | IncidentCategory>('all');
  const [sortBy, setSortBy] = useState<SortOption>('updated-desc');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const filteredCases = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return cases
      .filter((c) => {
        if (statusFilter !== 'all' && c.kavachStatus !== statusFilter) return false;
        if (categoryFilter !== 'all' && c.category !== categoryFilter) return false;
        if (!q) return true;
        return (
          c.caseCode.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.platform.toLowerCase().includes(q) ||
          (c.location || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'updated-desc') return b.updatedAt.localeCompare(a.updatedAt);
        if (sortBy === 'created-desc') return b.createdAt.localeCompare(a.createdAt);
        if (sortBy === 'incident-desc') return (b.date || '').localeCompare(a.date || '');
        return (a.date || '').localeCompare(b.date || '');
      });
  }, [cases, searchQuery, statusFilter, categoryFilter, sortBy]);

  const handleCopy = (caseCode: string) => {
    navigator.clipboard?.writeText(caseCode);
    setCopiedCode(caseCode);
    setTimeout(() => {
      setCopiedCode((prev) => (prev === caseCode ? null : prev));
    }, 1800);
  };

  const getCategoryLabel = (cat: IncidentCategory) =>
    INCIDENT_CATEGORIES.find((c) => c.value === cat)?.label || cat;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
            Permanent Case Repository
          </span>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            My Cases ({cases.length})
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Search, filter, reopen, edit, and export any incident case saved under your account.
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateNew}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/25 shrink-0 cursor-pointer"
        >
          <FilePlus2 className="h-4 w-4" />
          Create New Case
        </button>
      </div>

      {/* Search, Filter & Sort Toolbar */}
      <div className="rounded-2xl bg-[#0A1428]/90 border border-blue-400/20 p-4 sm:p-5 grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
        <div className="md:col-span-5 relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by KAVACH Case ID (e.g., KAV-...) or title..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#060D1B] border border-slate-700 focus:border-cyan-400 focus:outline-none text-xs sm:text-sm text-white placeholder:text-slate-500"
          />
        </div>

        <div className="md:col-span-3 flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400 shrink-0 hidden sm:block" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | KavachCaseStatus)}
            aria-label="Filter by status"
            className="w-full px-3 py-2.5 rounded-xl bg-[#060D1B] border border-slate-700 focus:border-cyan-400 focus:outline-none text-xs sm:text-sm text-white"
          >
            <option value="all">All Statuses</option>
            {KAVACH_CASE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as 'all' | IncidentCategory)}
            aria-label="Filter by category"
            className="w-full px-3 py-2.5 rounded-xl bg-[#060D1B] border border-slate-700 focus:border-cyan-400 focus:outline-none text-xs sm:text-sm text-white"
          >
            <option value="all">All Categories</option>
            {INCIDENT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            aria-label="Sort cases"
            className="w-full px-3 py-2.5 rounded-xl bg-[#060D1B] border border-slate-700 focus:border-cyan-400 focus:outline-none text-xs sm:text-sm text-white"
          >
            <option value="updated-desc">Recently Updated</option>
            <option value="created-desc">Newest Created</option>
            <option value="incident-desc">Incident Date (Newest)</option>
            <option value="incident-asc">Incident Date (Oldest)</option>
          </select>
        </div>
      </div>

      {/* Case List */}
      {cases.length === 0 ? (
        <div className="rounded-2xl bg-[#0A1428]/90 border border-blue-400/20 px-6 py-16 text-center">
          <FolderOpen className="h-10 w-10 text-cyan-400 mx-auto" />
          <h2 className="mt-4 text-lg font-bold text-white">Your Case Repository Is Empty</h2>
          <p className="mt-1.5 text-sm text-slate-400 max-w-md mx-auto">
            Every case you save will appear here permanently with its unique KAVACH Case ID,
            timeline, evidence inventory, and status history.
          </p>
          <button
            type="button"
            onClick={onCreateNew}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold cursor-pointer"
          >
            <FilePlus2 className="h-4 w-4" />
            Create New Case
          </button>
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="rounded-2xl bg-[#0A1428]/90 border border-slate-800 px-6 py-12 text-center">
          <p className="text-sm font-semibold text-white">No matching cases found</p>
          <p className="mt-1 text-xs text-slate-400">
            Try clearing your search term or resetting the status/category filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setCategoryFilter('all');
            }}
            className="mt-4 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-300 cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCases.map((item) => {
            const stageNum = item.workflowStage || 1;
            const stageMeta =
              WORKFLOW_STAGES.find((s) => s.stage === stageNum) || WORKFLOW_STAGES[0];
            return (
              <div
                key={item.caseCode}
                className="rounded-2xl bg-[#0A1428]/90 hover:bg-[#0D1B35]/95 border border-blue-400/20 hover:border-cyan-400/35 p-5 sm:p-6 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5"
              >
                <div className="space-y-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#060D1B] border border-cyan-400/35 font-mono text-xs font-bold text-cyan-300">
                      {item.caseCode}
                      <button
                        type="button"
                        onClick={() => handleCopy(item.caseCode)}
                        title="Copy KAVACH Case ID"
                        className="text-slate-400 hover:text-white cursor-pointer"
                      >
                        {copiedCode === item.caseCode ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </span>

                    <span
                      className={`px-2.5 py-0.5 rounded-md border text-xs font-semibold ${getStatusBadgeClasses(
                        item.kavachStatus
                      )}`}
                    >
                      {item.kavachStatus}
                    </span>

                    <span className="px-2.5 py-0.5 rounded-md bg-blue-950/70 border border-cyan-400/30 text-xs font-semibold text-cyan-200">
                      Step {stageNum}/7 · {stageMeta.shortLabel}
                    </span>

                    <span className="px-2.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-300">
                      {getCategoryLabel(item.category)}
                    </span>

                    {(item.structuredReport || item.aiSummary) && (
                      <span className="px-2.5 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-400/30 text-xs text-emerald-200">
                        AI Report Saved
                      </span>
                    )}

                    {item.officialTracking.acknowledgementNumber && (
                      <span className="px-2.5 py-0.5 rounded-md bg-indigo-950/70 border border-indigo-400/35 text-xs text-indigo-200">
                        Official Ack Logged: {item.officialTracking.acknowledgementNumber}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenCase(item.caseCode)}
                    className="text-left block text-lg font-bold text-white hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    {item.title}
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-400">
                    <span>
                      Created:{' '}
                      {new Date(item.createdAt).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: '2-digit',
                      })}
                    </span>
                    <span>
                      Last Updated:{' '}
                      {new Date(item.updatedAt).toLocaleString('en-IN', {
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span>Evidence: {item.evidence.length}</span>
                    <span>Timeline Events: {item.timeline.filter((t) => t.confirmed).length}</span>
                  </div>

                  {item.latestActivity && (
                    <p className="text-xs text-slate-400 pt-0.5">
                      <span className="text-slate-500">Latest Activity:</span>{' '}
                      <span className="text-slate-300">{item.latestActivity}</span>
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => downloadIncidentPdf(item)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#060D1B] hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5 text-cyan-400" />
                    Download PDF
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenCase(item.caseCode)}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-md shadow-blue-600/20 cursor-pointer"
                  >
                    {stageNum < 7 ? `Continue Case (Step ${stageNum}/7)` : 'Open & Manage Case'}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
