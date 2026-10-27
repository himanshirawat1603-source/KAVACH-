import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileText,
  History,
  ListChecks,
  Trash2,
} from 'lucide-react';
import { getRecommendationsForIncident } from '../data/verifiedDirectory';
import {
  IncidentRecord,
  KAVACH_CASE_STATUSES,
  KavachCaseStatus,
  PRIVATE_SUPPORT_STATUSES,
  PrivateSupportStatus,
  PrivateSupportTrackingEntry,
  WORKFLOW_STAGES,
  WorkflowStageNumber,
} from '../types/incident';
import {
  deleteCaseRecord,
  updateCaseRecord,
  updateCaseStatusRecord,
} from '../utils/apiClient';
import {
  downloadIncidentPdf,
  generatePlainTextReport,
  triggerFileDownload,
} from '../utils/pdfGenerator';
import { CaseGuidedWorkflow } from './CaseGuidedWorkflow';
import { getStatusBadgeClasses } from './DashboardView';

export type CaseDetailSection =
  | 'resume'
  | 'details'
  | 'evidence'
  | 'timeline'
  | 'ai-assistant'
  | 'missing-info'
  | 'review'
  | 'status-history'
  | 'official-filing';

interface CaseDetailViewProps {
  incident: IncidentRecord;
  initialSection?: CaseDetailSection;
  onUpdated: (updated: IncidentRecord) => void;
  onDeleted: (caseCode: string) => void;
  onBack: () => void;
}

function mapSectionToStage(section: CaseDetailSection): WorkflowStageNumber | null {
  switch (section) {
    case 'details':
      return 1;
    case 'evidence':
      return 2;
    case 'ai-assistant':
      return 3;
    case 'missing-info':
      return 4;
    case 'timeline':
      return 5;
    case 'review':
      return 6;
    case 'official-filing':
      return 7;
    case 'resume':
    case 'status-history':
    default:
      return null;
  }
}

export function CaseDetailView({
  incident,
  initialSection = 'resume',
  onUpdated,
  onDeleted,
  onBack,
}: CaseDetailViewProps) {
  const [viewMode, setViewMode] = useState<'workflow' | 'status-history'>(
    initialSection === 'status-history' ? 'status-history' : 'workflow'
  );
  const [forcedStage, setForcedStage] = useState<WorkflowStageNumber | null>(
    mapSectionToStage(initialSection)
  );
  const [copiedId, setCopiedId] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Status Update State
  const [selectedNewStatus, setSelectedNewStatus] = useState<KavachCaseStatus>(
    incident.kavachStatus
  );
  const [statusNote, setStatusNote] = useState('');

  useEffect(() => {
    if (initialSection === 'status-history') {
      setViewMode('status-history');
      setForcedStage(null);
    } else {
      setViewMode('workflow');
      setForcedStage(mapSectionToStage(initialSection));
    }
  }, [initialSection, incident.caseCode]);

  useEffect(() => {
    setSelectedNewStatus(incident.kavachStatus);
  }, [incident.kavachStatus]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => {
      setFeedback((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  const handleCopyCaseCode = () => {
    navigator.clipboard?.writeText(incident.caseCode);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1800);
  };

  const handleStatusChangeSubmit = async () => {
    setSaving(true);
    try {
      const updated = await updateCaseStatusRecord(
        incident.caseCode,
        selectedNewStatus,
        statusNote.trim()
      );
      setStatusNote('');
      onUpdated(updated);
      showToast('success', `KAVACH status updated to "${selectedNewStatus}".`);
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Unable to update status.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogSupportOrg = async (
    orgId: string,
    orgName: string,
    officialUrl: string,
    status: PrivateSupportStatus
  ) => {
    const existingIdx = incident.privateSupportTracking.findIndex(
      (p) => p.organizationId === orgId
    );
    const nowIso = new Date().toISOString();
    let nextList: PrivateSupportTrackingEntry[];

    if (existingIdx >= 0) {
      nextList = incident.privateSupportTracking.map((item, idx) =>
        idx === existingIdx ? { ...item, status, updatedAt: nowIso } : item
      );
    } else {
      nextList = [
        ...incident.privateSupportTracking,
        {
          id: `pst-${Date.now()}`,
          organizationId: orgId,
          organizationName: orgName,
          officialUrl,
          status,
          dateContacted: nowIso.slice(0, 10),
          contactMethod: 'Official Website / Helpline',
          responseState: status === 'Response Reported by User' ? 'response-received' : 'pending',
          followUpDate: '',
          userNotes: '',
          updatedAt: nowIso,
        },
      ];
    }

    try {
      const updated = await updateCaseRecord(incident.caseCode, {
        privateSupportTracking: nextList,
        activityNote: `Updated support tracking for ${orgName}`,
      });
      onUpdated(updated);
      showToast('success', `Saved outreach status for ${orgName}.`);
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Unable to update support log.');
    }
  };

  const handleDeleteConfirmed = async () => {
    setSaving(true);
    try {
      await deleteCaseRecord(incident.caseCode);
      onDeleted(incident.caseCode);
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Unable to delete case.');
      setSaving(false);
    }
  };

  const recommendations = getRecommendationsForIncident(incident.category, incident.urgencyLevel);
  const currentStageNum: WorkflowStageNumber = incident.workflowStage || 1;
  const currentStageMeta =
    WORKFLOW_STAGES.find((s) => s.stage === currentStageNum) || WORKFLOW_STAGES[0];

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-300 hover:text-cyan-300 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Cases
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => downloadIncidentPdf(incident)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/25 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            Download PDF Report
          </button>

          <button
            type="button"
            onClick={() =>
              triggerFileDownload(
                generatePlainTextReport(incident),
                `${incident.caseCode.toLowerCase()}-report.txt`,
                'text/plain;charset=utf-8'
              )
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#081122] hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5 text-cyan-400" />
            TXT Export
          </button>

          <button
            type="button"
            onClick={() => setConfirmDeleteOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/50 border border-red-500/30 text-xs font-semibold text-red-300 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>

      {/* In-Page Delete Confirmation */}
      {confirmDeleteOpen && (
        <div className="rounded-2xl bg-red-950/60 border border-red-500/45 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-white">
              Permanently delete case {incident.caseCode}?
            </p>
            <p className="text-xs text-red-200 mt-0.5">
              This removes this case, its evidence log, AI report, and status history from your
              account.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setConfirmDeleteOpen(false)}
              className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
            >
              Keep Case
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleDeleteConfirmed}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-semibold text-white cursor-pointer"
            >
              Confirm Delete
            </button>
          </div>
        </div>
      )}

      {/* Permanent Case Header Card */}
      <div className="rounded-2xl bg-[#0A1428]/95 border border-blue-400/25 p-6 shadow-[0_14px_36px_rgba(2,6,23,0.65)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#060D1B] border border-cyan-400/40">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                KAVACH Case ID:
              </span>
              <span className="font-mono text-sm sm:text-base font-extrabold text-cyan-300">
                {incident.caseCode}
              </span>
              <button
                type="button"
                onClick={handleCopyCaseCode}
                title="Copy Permanent KAVACH Case ID"
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                {copiedId ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>

            <span
              className={`px-3 py-1 rounded-lg border text-xs font-semibold ${getStatusBadgeClasses(
                incident.kavachStatus
              )}`}
            >
              {incident.kavachStatus}
            </span>

            <span className="px-3 py-1 rounded-lg bg-blue-950/70 border border-cyan-400/30 text-xs font-semibold text-cyan-200">
              Step {currentStageNum}/7 · {currentStageMeta.shortLabel}
            </span>
          </div>

          <span className="text-xs text-slate-400">
            Internal KAVACH Reference — Not an Official Police Number
          </span>
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">{incident.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-400">
            <span className="capitalize">Category: {incident.category}</span>
            <span>Incident Date: {incident.date || 'Unspecified'}</span>
            {incident.platform && <span>Platform: {incident.platform}</span>}
            {incident.location && <span>Location: {incident.location}</span>}
            {incident.peopleInvolved && <span>Involved: {incident.peopleInvolved}</span>}
            <span>
              Updated:{' '}
              {new Date(incident.updatedAt).toLocaleString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`rounded-xl px-4 py-3 text-xs sm:text-sm flex items-center gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-200'
              : 'bg-red-950/60 border border-red-500/40 text-red-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Workspace Mode Switcher: 7-Stage Guided Workflow vs Status & Audit Log */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => setViewMode('workflow')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all cursor-pointer ${
            viewMode === 'workflow'
              ? 'bg-blue-600 text-white border-cyan-300/35 shadow-md shadow-blue-600/25'
              : 'bg-[#0A1428]/80 text-slate-300 border-slate-800 hover:border-blue-400/30 hover:text-white'
          }`}
        >
          <ListChecks className="h-4 w-4" />
          Guided Case Workflow (Steps 1–7)
        </button>

        <button
          type="button"
          onClick={() => setViewMode('status-history')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all cursor-pointer ${
            viewMode === 'status-history'
              ? 'bg-blue-600 text-white border-cyan-300/35 shadow-md shadow-blue-600/25'
              : 'bg-[#0A1428]/80 text-slate-300 border-slate-800 hover:border-blue-400/30 hover:text-white'
          }`}
        >
          <History className="h-4 w-4" />
          Status, Audit History & Support Log ({incident.statusHistory.length})
        </button>
      </div>

      {/* MODE 1: COMPLETE 7-STAGE GUIDED WORKFLOW */}
      {viewMode === 'workflow' && (
        <CaseGuidedWorkflow
          key={incident.caseCode}
          initialCase={incident}
          forcedInitialStage={forcedStage}
          hideCaseBanner={true}
          onCaseUpdated={onUpdated}
          onExitToMyCases={onBack}
        />
      )}

      {/* MODE 2: INTERNAL KAVACH STATUS, CHRONOLOGICAL AUDIT LOG & SUPPORT TRACKING */}
      {viewMode === 'status-history' && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-[#0A1428]/90 border border-blue-400/20 p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">
                Internal KAVACH Case Status & History
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Track your documentation progress inside KAVACH. Every status update is permanently
                logged in chronological order.
              </p>
            </div>

            <div className="rounded-xl bg-[#060D1B] border border-slate-800 p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Select KAVACH Status
                  </label>
                  <select
                    value={selectedNewStatus}
                    onChange={(e) => setSelectedNewStatus(e.target.value as KavachCaseStatus)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A1428] border border-slate-700 text-sm text-white"
                  >
                    {KAVACH_CASE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Status Change Note
                  </label>
                  <input
                    type="text"
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder="e.g., Reviewed evidence and exported PDF report"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A1428] border border-slate-700 text-sm text-white"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={handleStatusChangeSubmit}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                Record Status Update
              </button>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Chronological Status History</h3>
              <div className="relative pl-6 border-l border-blue-500/30 space-y-4">
                {incident.statusHistory.map((h) => (
                  <div key={h.id} className="relative">
                    <span className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full bg-cyan-400 border-2 border-[#0A1428]" />
                    <div className="rounded-xl bg-[#060D1B] border border-slate-800 p-4 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {h.previousStatus && (
                          <>
                            <span className="text-slate-400">{h.previousStatus}</span>
                            <span className="text-slate-500">→</span>
                          </>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded border font-semibold ${getStatusBadgeClasses(
                            h.newStatus
                          )}`}
                        >
                          {h.newStatus}
                        </span>
                        <span className="text-slate-400 ml-1">
                          {new Date(h.timestamp).toLocaleString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200">{h.note}</p>
                      <p className="text-[11px] text-slate-500">Updated by: {h.changedBy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-[#0A1428]/90 border border-blue-400/20 p-6 sm:p-8 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-white">
                Relevant Public Authorities & Support Organizations
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Matched to <strong className="text-slate-200 capitalize">{incident.category}</strong>
                . KAVACH provides verified public information only and claims no live partnership or
                automatic filing.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...recommendations.publicAuthorities, ...recommendations.privateSupport].map(
                (org) => {
                  const tracked = incident.privateSupportTracking.find(
                    (p) => p.organizationId === org.id
                  );
                  return (
                    <div
                      key={org.id}
                      className="rounded-xl bg-[#060D1B] border border-slate-800 p-4 flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-cyan-300">
                          {org.classificationLabel}
                        </span>
                        <h3 className="text-sm font-bold text-white">{org.name}</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">{org.whyRelevant}</p>
                        <ul className="text-[11px] text-slate-300 space-y-0.5 pt-1">
                          {org.contactMethods.map((m) => (
                            <li key={m}>• {m}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                        {org.officialUrl ? (
                          <a
                            href={org.officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                          >
                            Visit Official Website
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <span className="text-[11px] text-amber-300">
                            Verify local handbook contact
                          </span>
                        )}

                        <select
                          value={tracked?.status || 'Recommended'}
                          onChange={(e) =>
                            handleLogSupportOrg(
                              org.id,
                              org.name,
                              org.officialUrl,
                              e.target.value as PrivateSupportStatus
                            )
                          }
                          aria-label={`Log status for ${org.name}`}
                          className="px-2.5 py-1 rounded-lg bg-[#0A1428] border border-slate-700 text-[11px] text-slate-200"
                        >
                          {PRIVATE_SUPPORT_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
