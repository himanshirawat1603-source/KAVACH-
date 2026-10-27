import { useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FilePlus2,
  FolderOpen,
  History,
  Import,
  ShieldCheck,
} from 'lucide-react';
import {
  INCIDENT_CATEGORIES,
  IncidentRecord,
  KavachCaseStatus,
  KavachUser,
  WORKFLOW_STAGES,
  WorkspaceTab,
} from '../types/incident';
import { downloadIncidentPdf } from '../utils/pdfGenerator';

interface DashboardViewProps {
  user: KavachUser;
  cases: IncidentRecord[];
  unimportedLegacyDrafts: IncidentRecord[];
  importingLegacy: boolean;
  onImportLegacyDrafts: () => void;
  onNavigateTab: (tab: WorkspaceTab) => void;
  onOpenCase: (caseCode: string) => void;
}

export function getStatusBadgeClasses(status: KavachCaseStatus): string {
  switch (status) {
    case 'Draft':
      return 'bg-slate-800/90 text-slate-200 border-slate-600/60';
    case 'Ready for Submission':
      return 'bg-blue-950/80 text-cyan-300 border-cyan-400/35';
    case 'Submitted Externally':
      return 'bg-indigo-950/80 text-indigo-200 border-indigo-400/40';
    case 'Under Review':
      return 'bg-amber-950/70 text-amber-200 border-amber-400/40';
    case 'Resolved':
      return 'bg-emerald-950/70 text-emerald-300 border-emerald-400/40';
    case 'Closed':
      return 'bg-slate-900/90 text-slate-400 border-slate-700';
  }
}

export function DashboardView({
  user,
  cases,
  unimportedLegacyDrafts,
  importingLegacy,
  onImportLegacyDrafts,
  onNavigateTab,
  onOpenCase,
}: DashboardViewProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const totalCases = cases.length;
  const resolvedCases = cases.filter(
    (c) => c.kavachStatus === 'Resolved' || c.kavachStatus === 'Closed'
  ).length;
  const openCases = totalCases - resolvedCases;

  const recentCases = [...cases]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);

  const handleCopyCaseId = (caseCode: string) => {
    navigator.clipboard?.writeText(caseCode);
    setCopiedCode(caseCode);
    setTimeout(() => {
      setCopiedCode((prev) => (prev === caseCode ? null : prev));
    }, 1800);
  };

  const getCategoryLabel = (cat: IncidentRecord['category']) =>
    INCIDENT_CATEGORIES.find((c) => c.value === cat)?.label || cat;

  return (
    <div className="space-y-8">
      {/* Welcome & Quick Action Header */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0A162E] via-[#0D1E3D] to-[#091326] border border-blue-400/25 p-6 sm:p-8 shadow-[0_16px_40px_rgba(2,6,23,0.6)] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
            Citizen Safety Workspace
          </p>
          <h1 className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome, {user.name}
          </h1>
          <p className="mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed">
            Document incidents clearly, organize supporting files and timelines, generate structured
            AI reports with missing-information reviews, and track every case permanently under your
            private account.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigateTab('create-case')}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-cyan-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/30 border border-cyan-300/25 transition-all cursor-pointer"
          >
            <FilePlus2 className="h-4 w-4" />
            Create New Case
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('official-portals')}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-[#081122] hover:bg-[#0F1E3A] text-slate-200 text-sm font-semibold border border-blue-400/20 hover:border-cyan-400/40 transition-all cursor-pointer"
          >
            Official Portals
            <ExternalLink className="h-4 w-4 text-cyan-400" />
          </button>
        </div>
      </div>

      {/* Non-destructive Legacy Browser Draft Import Banner */}
      {unimportedLegacyDrafts.length > 0 && (
        <div className="rounded-2xl bg-blue-950/50 border border-cyan-400/30 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Import className="h-5 w-5 text-cyan-300 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-white">
                {unimportedLegacyDrafts.length} Saved Browser{' '}
                {unimportedLegacyDrafts.length === 1 ? 'Draft' : 'Drafts'} Found on This Device
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Import your earlier local drafts into your permanent KAVACH account database without
                deleting any existing records.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={importingLegacy}
            onClick={onImportLegacyDrafts}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-semibold shrink-0 cursor-pointer"
          >
            {importingLegacy ? 'Importing Drafts...' : 'Import Into My Account'}
          </button>
        </div>
      )}

      {/* Key Case Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="rounded-2xl bg-[#0A1428]/90 border border-blue-400/20 p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Cases
            </span>
            <FolderOpen className="h-5 w-5 text-blue-400" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-white tabular-nums">{totalCases}</p>
          <p className="mt-1 text-xs text-slate-400">
            Saved permanently in your private account
          </p>
        </div>

        <div className="rounded-2xl bg-[#0A1428]/90 border border-blue-400/20 p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Open Cases
            </span>
            <Clock className="h-5 w-5 text-cyan-400" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-cyan-300 tabular-nums">{openCases}</p>
          <p className="mt-1 text-xs text-slate-400">
            Draft, Ready for Submission, Submitted, or Under Review
          </p>
        </div>

        <div className="rounded-2xl bg-[#0A1428]/90 border border-blue-400/20 p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Resolved / Closed
            </span>
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-emerald-300 tabular-nums">
            {resolvedCases}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Completed documentation & archived cases
          </p>
        </div>
      </div>

      {/* Recently Updated Cases OR Clean Empty State */}
      <div className="rounded-2xl bg-[#0A1428]/90 border border-blue-400/20 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Recently Updated Cases</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Each case carries a permanent KAVACH Case ID for private reference and PDF export.
            </p>
          </div>
          {cases.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigateTab('case-history')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
              >
                <History className="h-3.5 w-3.5 text-cyan-400" />
                Case History
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('my-cases')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 hover:text-cyan-200 cursor-pointer"
              >
                View All Cases
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {recentCases.length === 0 ? (
          <div className="px-6 py-14 text-center max-w-lg mx-auto">
            <div className="h-12 w-12 rounded-2xl bg-blue-600/20 border border-blue-400/30 flex items-center justify-center text-cyan-300 mx-auto">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-white">No Cases Documented Yet</h3>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Start by documenting an incident. KAVACH will generate a permanent Case ID (for
              example, <code className="text-cyan-300 font-mono">KAV-A7K9P2Q4</code>), organize your
              evidence and timeline, generate an AI report, and prepare a downloadable PDF report.
            </p>
            <button
              type="button"
              onClick={() => onNavigateTab('create-case')}
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/25 cursor-pointer"
            >
              <FilePlus2 className="h-4 w-4" />
              Create Your First Case
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {recentCases.map((item) => {
              const stageNum = item.workflowStage || 1;
              const stageMeta =
                WORKFLOW_STAGES.find((s) => s.stage === stageNum) || WORKFLOW_STAGES[0];
              return (
                <div
                  key={item.caseCode}
                  className="px-6 py-4 hover:bg-[#0E1B34]/75 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#060D1B] border border-cyan-400/30 font-mono text-xs font-bold text-cyan-300">
                        {item.caseCode}
                        <button
                          type="button"
                          onClick={() => handleCopyCaseId(item.caseCode)}
                          title="Copy KAVACH Case ID"
                          className="text-slate-400 hover:text-white ml-0.5 cursor-pointer"
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

                      <span className="text-xs text-slate-400">
                        {getCategoryLabel(item.category)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenCase(item.caseCode)}
                      className="text-left block text-base font-bold text-white hover:text-cyan-300 transition-colors truncate max-w-2xl cursor-pointer"
                    >
                      {item.title}
                    </button>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                      <span>Incident Date: {item.date || 'Unspecified'}</span>
                      {item.platform && <span>Platform: {item.platform}</span>}
                      <span>Evidence: {item.evidence.length}</span>
                      <span>
                        Updated:{' '}
                        {new Date(item.updatedAt).toLocaleString('en-IN', {
                          month: 'short',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => downloadIncidentPdf(item)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#070F1E] hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5 text-cyan-400" />
                      PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenCase(item.caseCode)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600/90 hover:bg-blue-500 text-xs font-semibold text-white transition-colors cursor-pointer"
                    >
                      {stageNum < 7 ? `Resume (Step ${stageNum}/7)` : 'Open Case'}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
