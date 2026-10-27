import React, { useState, useEffect } from 'react';
import {
  Activity,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Building2,
  HeartHandshake,
  Plus,
  Save,
  Clock,
  ArrowRight,
  Lock,
} from 'lucide-react';
import {
  IncidentRecord,
  KAVACH_INTERNAL_STATUSES,
  KavachInternalStatus,
  PRIVATE_SUPPORT_STATUSES,
  PrivateSupportStatus,
  PrivateSupportTrackingEntry,
  ReviewerCaseStatus,
  WorkspaceTab,
} from '../types/incident';
import { VERIFIED_SUPPORT_DIRECTORY } from '../data/verifiedDirectory';
import { describeSubmissionState } from '../utils/pdfGenerator';

interface CaseTrackingViewProps {
  incidents: IncidentRecord[];
  incident: IncidentRecord | null;
  onSelectIncident: (id: string) => void;
  onUpdateIncident: (patch: Partial<IncidentRecord>, activityNote?: string) => void;
  onNavigateTab: (tab: WorkspaceTab) => void;
}

const OFFICIAL_PORTAL_PRESETS = [
  {
    label: 'National Cyber Crime Reporting Portal (cybercrime.gov.in)',
    portalUrl: 'https://cybercrime.gov.in/',
    statusCheckUrl: 'https://www.cybercrime.gov.in/Webform/chkackstatus.aspx',
  },
  {
    label: 'Emergency Response Support System (112.gov.in)',
    portalUrl: 'https://112.gov.in/',
    statusCheckUrl: 'https://112.gov.in/',
  },
  {
    label: 'MWCD Women Helpline Directory (wcd.gov.in)',
    portalUrl: 'https://wcd.gov.in/women/help',
    statusCheckUrl: 'https://wcd.gov.in/women/help',
  },
];

export const CaseTrackingView: React.FC<CaseTrackingViewProps> = ({
  incidents,
  incident,
  onSelectIncident,
  onUpdateIncident,
  onNavigateTab,
}) => {
  // Section A: KAVACH Internal Case Tracking local form state
  const [selectedInternalStatus, setSelectedInternalStatus] = useState<KavachInternalStatus>(
    incident?.internalTracking.currentStatus || 'Draft'
  );
  const [internalNoteDraft, setInternalNoteDraft] = useState(
    incident?.internalTracking.userNotes || ''
  );
  const [statusHistoryNote, setStatusHistoryNote] = useState('');
  const [internalFeedback, setInternalFeedback] = useState<string | null>(null);

  // Prototype Reviewer Sync state
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // Section B: Official Government Tracking local form state
  const [govAuthority, setGovAuthority] = useState(
    incident?.officialTracking.authorityOrPortal ||
      'National Cyber Crime Reporting Portal (cybercrime.gov.in)'
  );
  const [govPortalUrl, setGovPortalUrl] = useState(
    incident?.officialTracking.portalUrl || 'https://cybercrime.gov.in/'
  );
  const [govStatusUrl, setGovStatusUrl] = useState(
    incident?.officialTracking.statusCheckUrl ||
      'https://www.cybercrime.gov.in/Webform/chkackstatus.aspx'
  );
  const [govAckNumber, setGovAckNumber] = useState(
    incident?.officialTracking.acknowledgementNumber || ''
  );
  const [govSubmissionDate, setGovSubmissionDate] = useState(
    incident?.officialTracking.submissionDate || ''
  );
  const [govManualStatus, setGovManualStatus] = useState(
    incident?.officialTracking.lastManualStatus || ''
  );
  const [govManualCheckDate, setGovManualCheckDate] = useState(
    incident?.officialTracking.lastManualCheckDate || ''
  );
  const [govUserNotes, setGovUserNotes] = useState(incident?.officialTracking.userNotes || '');
  const [govFeedback, setGovFeedback] = useState<string | null>(null);

  // Section C: Private / Non-Government Support Tracking
  const verifiedPrivateOrgs = VERIFIED_SUPPORT_DIRECTORY.filter(
    (item) => item.sector === 'private-support' && item.informationVerified
  );
  const [newOrgId, setNewOrgId] = useState(verifiedPrivateOrgs[0]?.id || 'icall-tiss');
  const [privateFeedback, setPrivateFeedback] = useState<string | null>(null);

  // Sync local fields when active incident changes
  useEffect(() => {
    if (!incident) return;
    setSelectedInternalStatus(incident.internalTracking.currentStatus);
    setInternalNoteDraft(incident.internalTracking.userNotes || '');
    setStatusHistoryNote('');
    setSyncMessage(null);

    setGovAuthority(
      incident.officialTracking.authorityOrPortal ||
        'National Cyber Crime Reporting Portal (cybercrime.gov.in)'
    );
    setGovPortalUrl(incident.officialTracking.portalUrl || 'https://cybercrime.gov.in/');
    setGovStatusUrl(
      incident.officialTracking.statusCheckUrl ||
        'https://www.cybercrime.gov.in/Webform/chkackstatus.aspx'
    );
    setGovAckNumber(incident.officialTracking.acknowledgementNumber || '');
    setGovSubmissionDate(incident.officialTracking.submissionDate || '');
    setGovManualStatus(incident.officialTracking.lastManualStatus || '');
    setGovManualCheckDate(incident.officialTracking.lastManualCheckDate || '');
    setGovUserNotes(incident.officialTracking.userNotes || '');
  }, [incident?.id]);

  if (!incident) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
        <p className="font-display text-lg font-semibold text-[#0B1220]">
          Select an Incident Record to Track
        </p>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          Choose a saved KAVACH incident report from your Citizen Dashboard to view and update its
          three separate tracking tracks.
        </p>
        <button
          type="button"
          onClick={() => onNavigateTab('dashboard')}
          className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg cursor-pointer"
        >
          Return to Citizen Dashboard
        </button>
      </div>
    );
  }

  const submissionMeta = describeSubmissionState(incident.submissionState);

  const handleSaveInternalTracking = (e: React.FormEvent) => {
    e.preventDefault();
    const nowIso = new Date().toISOString();
    const statusChanged = selectedInternalStatus !== incident.internalTracking.currentStatus;

    const nextHistory =
      statusChanged || statusHistoryNote.trim()
        ? [
            {
              id: `hist-${Date.now()}`,
              status: selectedInternalStatus,
              timestamp: nowIso,
              actor: 'Citizen' as const,
              note:
                statusHistoryNote.trim() ||
                `Updated internal KAVACH status to "${selectedInternalStatus}".`,
            },
            ...incident.internalTracking.history,
          ]
        : incident.internalTracking.history;

    const nextSubmissionState =
      selectedInternalStatus === 'User Confirmed External Submission'
        ? 'user-confirmed-external'
        : selectedInternalStatus === 'External Submission Pending User Action'
          ? 'awaiting-external-action'
          : incident.submissionState;

    onUpdateIncident(
      {
        submissionState: nextSubmissionState,
        internalTracking: {
          ...incident.internalTracking,
          currentStatus: selectedInternalStatus,
          userNotes: internalNoteDraft,
          history: nextHistory,
        },
      },
      `Updated KAVACH internal status to "${selectedInternalStatus}"`
    );

    setStatusHistoryNote('');
    setInternalFeedback('Saved KAVACH internal case status and notes locally.');
    setTimeout(() => setInternalFeedback(null), 3500);
  };

  const handleSyncPrototypeReviewer = async () => {
    if (!incident.internalTracking.prototypeAccessToken) {
      setSyncMessage({
        ok: false,
        text: 'This case has not been submitted to the KAVACH Prototype Review Queue yet (no per-case token present).',
      });
      return;
    }

    setSyncLoading(true);
    setSyncMessage(null);
    try {
      const response = await fetch(
        `/api/prototype-review/citizen-sync/${encodeURIComponent(incident.caseCode)}`,
        {
          headers: {
            'x-kavach-case-token': incident.internalTracking.prototypeAccessToken,
          },
        }
      );
      const data = await response.json();
      if (!response.ok) {
        setSyncMessage({
          ok: false,
          text: data.error || 'Could not sync KAVACH Prototype Review status.',
        });
        return;
      }

      const syncedReviewerStatus = data.reviewerStatus as ReviewerCaseStatus;
      const nowIso = new Date().toISOString();
      const statusChanged =
        syncedReviewerStatus !== incident.internalTracking.prototypeReviewerStatus ||
        data.reviewNotes !== incident.internalTracking.prototypeReviewerNotes;

      const updatedHistory = statusChanged
        ? [
            {
              id: `hist-sync-${Date.now()}`,
              status: `Prototype Queue: ${syncedReviewerStatus}`,
              timestamp: nowIso,
              actor: 'Prototype Reviewer' as const,
              note:
                data.reviewNotes ||
                'Synced status from KAVACH Prototype Review Queue (not an official government status).',
            },
            ...incident.internalTracking.history,
          ]
        : incident.internalTracking.history;

      onUpdateIncident(
        {
          internalTracking: {
            ...incident.internalTracking,
            prototypeReviewerStatus: syncedReviewerStatus,
            prototypeReviewerNotes: data.reviewNotes || '',
            prototypeLastSyncedAt: nowIso,
            history: updatedHistory,
          },
        },
        `Synced KAVACH Prototype Reviewer status: ${syncedReviewerStatus}`
      );

      setSyncMessage({
        ok: true,
        text: `Synced from KAVACH Prototype Review Queue: "${syncedReviewerStatus}" (Internal prototype status only — not a government agency update).`,
      });
    } catch {
      setSyncMessage({
        ok: false,
        text: 'Network error while contacting local KAVACH prototype backend.',
      });
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSaveOfficialTracking = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedAck = govAckNumber.trim();
    const nextSubmissionState = trimmedAck
      ? 'user-confirmed-external'
      : incident.submissionState;

    const nextInternalStatus: KavachInternalStatus =
      trimmedAck &&
      (incident.internalTracking.currentStatus === 'Draft' ||
        incident.internalTracking.currentStatus === 'Report Prepared' ||
        incident.internalTracking.currentStatus === 'Ready for External Submission' ||
        incident.internalTracking.currentStatus === 'External Submission Pending User Action')
        ? 'User Confirmed External Submission'
        : incident.internalTracking.currentStatus;

    onUpdateIncident(
      {
        submissionState: nextSubmissionState,
        internalTracking: {
          ...incident.internalTracking,
          currentStatus: nextInternalStatus,
        },
        officialTracking: {
          authorityOrPortal: govAuthority.trim() || 'Official Government Portal',
          portalUrl: govPortalUrl.trim() || 'https://cybercrime.gov.in/',
          statusCheckUrl:
            govStatusUrl.trim() || 'https://www.cybercrime.gov.in/Webform/chkackstatus.aspx',
          acknowledgementNumber: trimmedAck,
          submissionDate: govSubmissionDate,
          lastManualStatus: govManualStatus.trim(),
          lastManualCheckDate: govManualCheckDate,
          userNotes: govUserNotes.trim(),
          isLiveVerified: false,
        },
      },
      trimmedAck
        ? `Recorded user-reported external acknowledgement (${trimmedAck})`
        : 'Updated user-reported official complaint tracking notes'
    );

    setGovFeedback(
      'Saved user-reported official complaint details locally. Marked as not independently verified.'
    );
    setTimeout(() => setGovFeedback(null), 4000);
  };

  const handleAddPrivateOrgTracker = () => {
    const org = verifiedPrivateOrgs.find((item) => item.id === newOrgId);
    if (!org) return;

    const alreadyExists = incident.privateSupportTracking.some(
      (entry) => entry.organizationId === org.id
    );
    if (alreadyExists) {
      setPrivateFeedback(`${org.name} is already listed in your Private Support tracker below.`);
      setTimeout(() => setPrivateFeedback(null), 3500);
      return;
    }

    const nowIso = new Date().toISOString();
    const newEntry: PrivateSupportTrackingEntry = {
      id: `priv-${Date.now()}`,
      organizationId: org.id,
      organizationName: org.name,
      officialUrl: org.officialUrl || '',
      status: 'Recommended',
      dateContacted: '',
      contactMethod: org.contactMethods[0] || 'Official website / helpline',
      responseState: 'not-contacted',
      followUpDate: '',
      userNotes: '',
      updatedAt: nowIso,
    };

    onUpdateIncident(
      {
        privateSupportTracking: [...incident.privateSupportTracking, newEntry],
      },
      `Added ${org.name} to Private Support Tracking`
    );
    setPrivateFeedback(`Added ${org.name} to your user-reported support log.`);
    setTimeout(() => setPrivateFeedback(null), 3500);
  };

  const handleUpdatePrivateEntry = (
    entryId: string,
    patch: Partial<PrivateSupportTrackingEntry>
  ) => {
    const updatedList = incident.privateSupportTracking.map((entry) =>
      entry.id === entryId
        ? {
            ...entry,
            ...patch,
            updatedAt: new Date().toISOString(),
          }
        : entry
    );
    onUpdateIncident(
      { privateSupportTracking: updatedList },
      'Updated user-reported private support outreach log'
    );
    setPrivateFeedback('Updated private support tracking entry.');
    setTimeout(() => setPrivateFeedback(null), 3000);
  };

  const handleRemovePrivateEntry = (entryId: string) => {
    const updatedList = incident.privateSupportTracking.filter((e) => e.id !== entryId);
    onUpdateIncident(
      { privateSupportTracking: updatedList },
      'Removed entry from Private Support Tracking'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Case Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#0B1220] tracking-tight">
            Case Status &amp; Multi-Track Follow-Up
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            KAVACH strictly separates internal preparation states, user-recorded official portal
            filings, and user-recorded non-governmental support outreach.
          </p>
        </div>

        {incidents.length > 1 && (
          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="track-case-select" className="text-xs font-semibold text-slate-600">
              Active Case:
            </label>
            <select
              id="track-case-select"
              value={incident.id}
              onChange={(e) => onSelectIncident(e.target.value)}
              className="px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg text-[#0B1220] focus:outline-none focus:border-[#2563EB]"
            >
              {incidents.map((inc) => (
                <option key={inc.id} value={inc.id}>
                  {inc.caseCode} — {inc.title ? inc.title.slice(0, 34) : 'Untitled Draft'}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Top Case Summary Banner */}
      <div className="bg-[#0B1220] text-white border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-mono text-[#22D3EE] font-semibold tabular-nums">
              {incident.caseCode}
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-300 capitalize">{incident.category}</span>
            {incident.isDemo && (
              <>
                <span className="text-slate-500">·</span>
                <span className="text-amber-300 font-medium">Fictional Sample Data</span>
              </>
            )}
          </div>
          <h2 className="font-display text-base sm:text-lg font-semibold text-white">
            {incident.title || 'Untitled Incident Report'}
          </h2>
          <p className="text-xs text-slate-400">
            Submission Architecture Tier:{' '}
            <strong className="text-slate-200">{submissionMeta.shortLabel}</strong> —{' '}
            {submissionMeta.explanation}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('submit-help')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0B1220] bg-[#22D3EE] hover:bg-cyan-300 rounded-lg transition-colors shrink-0 cursor-pointer"
        >
          <span>Open Submit / Get Help</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* =================================================================== */}
      {/* TRACK A: KAVACH INTERNAL CASE TRACKING                              */}
      {/* =================================================================== */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <Activity className="w-5 h-5 text-[#2563EB] shrink-0 mt-0.5" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-base font-bold text-[#0B1220]">
                  A. KAVACH Internal Case Tracking
                </h2>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span className="text-xs font-semibold text-[#2563EB]">
                  KAVACH Workspace State Only
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Tracks your report preparation lifecycle inside KAVACH. Internal statuses do not
                represent police or government case progress.
              </p>
            </div>
          </div>

          <div className="font-mono text-xs text-slate-600 shrink-0 tabular-nums">
            ID: {incident.caseCode}
          </div>
        </div>

        {internalFeedback && (
          <div
            role="status"
            className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2 text-xs font-medium text-emerald-900"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{internalFeedback}</span>
          </div>
        )}

        <form onSubmit={handleSaveInternalTracking} className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-6 space-y-4">
            <div>
              <label
                htmlFor="internal-status-select"
                className="block text-xs font-semibold text-[#0B1220] mb-1.5"
              >
                Current KAVACH Internal Status
              </label>
              <select
                id="internal-status-select"
                value={selectedInternalStatus}
                onChange={(e) => setSelectedInternalStatus(e.target.value as KavachInternalStatus)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-[#0B1220] focus:outline-none focus:border-[#2563EB]"
              >
                {KAVACH_INTERNAL_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="internal-history-note"
                className="block text-xs font-semibold text-[#0B1220] mb-1.5"
              >
                Status Change / Milestone Note (Optional)
              </label>
              <input
                id="internal-history-note"
                type="text"
                value={statusHistoryNote}
                onChange={(e) => setStatusHistoryNote(e.target.value)}
                placeholder="e.g., Completed PDF review and verified witness timestamp"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg text-[#0B1220] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div>
              <label
                htmlFor="internal-user-notes"
                className="block text-xs font-semibold text-[#0B1220] mb-1.5"
              >
                Personal Preparation Notes
              </label>
              <textarea
                id="internal-user-notes"
                rows={3}
                value={internalNoteDraft}
                onChange={(e) => setInternalNoteDraft(e.target.value)}
                placeholder="Record private reminders, checklist items, or next steps..."
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg text-[#0B1220] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Internal Status &amp; Notes</span>
            </button>
          </div>

          {/* Right column: Prototype Reviewer Sync + Status History */}
          <div className="lg:col-span-6 space-y-4">
            {/* Prototype Reviewer Sync Card */}
            <div className="bg-[#F8FAFC] border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-display text-xs font-bold text-[#0B1220] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>KAVACH Prototype Reviewer Queue Sync</span>
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Protected by a per-case token so private submissions are never publicly
                    enumerable. Reflects internal KAVACH demo reviewer feedback only.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSyncPrototypeReviewer}
                  disabled={syncLoading || !incident.internalTracking.prototypeQueueSubmitted}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0B1220] bg-white hover:bg-slate-100 border border-slate-300 rounded-lg disabled:opacity-50 cursor-pointer shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncLoading ? 'animate-spin' : ''}`} />
                  <span>Sync Status</span>
                </button>
              </div>

              {incident.internalTracking.prototypeQueueSubmitted ? (
                <div className="bg-white border border-slate-200 rounded p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">Prototype Queue Status:</span>
                    <span className="font-semibold text-[#0B1220]">
                      {incident.internalTracking.prototypeReviewerStatus ||
                        'Received by KAVACH Review System'}
                    </span>
                  </div>
                  {incident.internalTracking.prototypeReviewerNotes && (
                    <p className="text-slate-600 pt-1 border-t border-slate-100">
                      <strong>Reviewer Note:</strong>{' '}
                      {incident.internalTracking.prototypeReviewerNotes}
                    </p>
                  )}
                  {incident.internalTracking.prototypeLastSyncedAt && (
                    <p className="text-[11px] font-mono text-slate-400 tabular-nums">
                      Last synced:{' '}
                      {new Date(incident.internalTracking.prototypeLastSyncedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Not submitted to the KAVACH Prototype Review Queue. Your draft remains exclusively
                  in browser localStorage unless you explicitly submit it in{' '}
                  <button
                    type="button"
                    onClick={() => onNavigateTab('submit-help')}
                    className="text-[#2563EB] font-semibold underline cursor-pointer"
                  >
                    Submit / Get Help
                  </button>
                  .
                </p>
              )}

              {syncMessage && (
                <div
                  className={`p-2.5 rounded border text-xs ${
                    syncMessage.ok
                      ? 'bg-blue-50 border-blue-200 text-blue-950'
                      : 'bg-amber-50 border-amber-200 text-amber-950'
                  }`}
                >
                  {syncMessage.text}
                </div>
              )}
            </div>

            {/* Internal Status History */}
            <div className="border border-slate-200 rounded-lg p-4">
              <p className="font-display text-xs font-bold text-[#0B1220] mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Internal Status History ({incident.internalTracking.history.length})</span>
              </p>
              <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                {incident.internalTracking.history.map((item) => (
                  <div
                    key={item.id}
                    className="text-xs border-l-2 border-[#2563EB] pl-3 py-0.5 space-y-0.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-[#0B1220]">{item.status}</span>
                      <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-600">{item.note}</p>
                    <p className="text-[11px] text-slate-400">Recorded by: {item.actor}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </form>
      </section>

      {/* =================================================================== */}
      {/* TRACK B: OFFICIAL GOVERNMENT COMPLAINT TRACKING                     */}
      {/* =================================================================== */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <Building2 className="w-5 h-5 text-[#0B1220] shrink-0 mt-0.5" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-base font-bold text-[#0B1220]">
                  B. Official Government Complaint Tracking
                </h2>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span className="text-xs font-semibold text-amber-800">
                  User-reported — not independently verified
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Official portals like <code className="font-mono">cybercrime.gov.in</code> require
                citizen OTP and CAPTCHA authentication and do not expose public status APIs. Record
                your official acknowledgement number here and check live updates directly on the
                government website.
              </p>
            </div>
          </div>

          <a
            href={
              govStatusUrl.trim() || 'https://www.cybercrime.gov.in/Webform/chkackstatus.aspx'
            }
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0B1220] hover:bg-slate-800 rounded-lg transition-colors shrink-0"
          >
            <span>Track on Official Website</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#22D3EE]" />
          </a>
        </div>

        {/* Anti-fabrication disclosure */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3.5 flex items-start gap-2.5 text-xs text-amber-950">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong>Honest Verification Boundary:</strong> KAVACH never scrapes government portals,
            bypasses OTP/CAPTCHA controls, or generates fake police acknowledgement numbers. Every
            field below is strictly maintained by you for your personal records.
          </div>
        </div>

        {govFeedback && (
          <div
            role="status"
            className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2 text-xs font-medium text-emerald-900"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{govFeedback}</span>
          </div>
        )}

        <form onSubmit={handleSaveOfficialTracking} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-6">
              <label
                htmlFor="gov-preset"
                className="block text-xs font-semibold text-[#0B1220] mb-1.5"
              >
                Select Official Portal Preset (or customize below)
              </label>
              <select
                id="gov-preset"
                value={
                  OFFICIAL_PORTAL_PRESETS.find((p) => p.portalUrl === govPortalUrl)?.portalUrl ||
                  'custom'
                }
                onChange={(e) => {
                  const chosen = OFFICIAL_PORTAL_PRESETS.find(
                    (p) => p.portalUrl === e.target.value
                  );
                  if (chosen) {
                    setGovAuthority(chosen.label);
                    setGovPortalUrl(chosen.portalUrl);
                    setGovStatusUrl(chosen.statusCheckUrl);
                  }
                }}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg text-[#0B1220] focus:outline-none focus:border-[#2563EB]"
              >
                {OFFICIAL_PORTAL_PRESETS.map((preset) => (
                  <option key={preset.portalUrl} value={preset.portalUrl}>
                    {preset.label}
                  </option>
                ))}
                <option value="custom">Custom Official Authority / State Portal</option>
              </select>
            </div>

            <div className="md:col-span-6">
              <label
                htmlFor="gov-authority-name"
                className="block text-xs font-semibold text-[#0B1220] mb-1.5"
              >
                Authority or Portal Name
              </label>
              <input
                id="gov-authority-name"
                type="text"
                value={govAuthority}
                onChange={(e) => setGovAuthority(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg text-[#0B1220] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div className="md:col-span-4">
              <label
                htmlFor="gov-ack-num"
                className="block text-xs font-semibold text-[#0B1220] mb-1.5"
              >
                User-Entered Official Acknowledgement / Complaint No.
              </label>
              <input
                id="gov-ack-num"
                type="text"
                value={govAckNumber}
                onChange={(e) => setGovAckNumber(e.target.value)}
                placeholder="Enter only after filing on official portal"
                className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg text-[#0B1220] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div className="md:col-span-4">
              <label
                htmlFor="gov-sub-date"
                className="block text-xs font-semibold text-[#0B1220] mb-1.5"
              >
                External Submission Date
              </label>
              <input
                id="gov-sub-date"
                type="date"
                value={govSubmissionDate}
                onChange={(e) => setGovSubmissionDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg text-[#0B1220] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div className="md:col-span-4">
              <label
                htmlFor="gov-status-url"
                className="block text-xs font-semibold text-[#0B1220] mb-1.5"
              >
                Official Status Check URL
              </label>
              <input
                id="gov-status-url"
                type="url"
                value={govStatusUrl}
                onChange={(e) => setGovStatusUrl(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg text-[#0B1220] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div className="md:col-span-6">
              <label
                htmlFor="gov-manual-status"
                className="block text-xs font-semibold text-[#0B1220] mb-1.5"
              >
                Last Manually Recorded Portal Status (User-Reported)
              </label>
              <input
                id="gov-manual-status"
                type="text"
                value={govManualStatus}
                onChange={(e) => setGovManualStatus(e.target.value)}
                placeholder="e.g., Complaint Accepted by State Nodal Cell (checked via OTP)"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg text-[#0B1220] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div className="md:col-span-3">
              <label
                htmlFor="gov-check-date"
                className="block text-xs font-semibold text-[#0B1220] mb-1.5"
              >
                Date Last Checked Manually
              </label>
              <input
                id="gov-check-date"
                type="date"
                value={govManualCheckDate}
                onChange={(e) => setGovManualCheckDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg text-[#0B1220] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div className="md:col-span-3 flex items-end">
              <a
                href="https://cybercrime.gov.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <span>cybercrime.gov.in</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="md:col-span-12">
              <label
                htmlFor="gov-notes"
                className="block text-xs font-semibold text-[#0B1220] mb-1.5"
              >
                Your Official Filing Notes (Station Name, Officer Reference, Follow-Up Reminders)
              </label>
              <textarea
                id="gov-notes"
                rows={2}
                value={govUserNotes}
                onChange={(e) => setGovUserNotes(e.target.value)}
                placeholder="Record any follow-up instructions shown on your official portal receipt..."
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg text-[#0B1220] focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Official Complaint Log (User-Reported)</span>
            </button>

            <span className="text-[11px] text-slate-500">
              Verification state: <strong>User-reported — not independently verified</strong>
            </span>
          </div>
        </form>
      </section>

      {/* =================================================================== */}
      {/* TRACK C: PRIVATE / NON-GOVERNMENT SUPPORT TRACKING                  */}
      {/* =================================================================== */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <HeartHandshake className="w-5 h-5 text-[#2563EB] shrink-0 mt-0.5" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-base font-bold text-[#0B1220]">
                  C. Private / Non-Government Support Tracking
                </h2>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span className="text-xs font-semibold text-amber-800">
                  User-reported — not independently verified
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Track independent helplines, counseling services, and digital-rights organizations
                you have shortlisted or contacted. KAVACH has no live data feed with private NGOs.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <select
              aria-label="Select verified non-governmental support organization"
              value={newOrgId}
              onChange={(e) => setNewOrgId(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-[#0B1220] focus:outline-none focus:border-[#2563EB]"
            >
              {verifiedPrivateOrgs.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAddPrivateOrgTracker}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#0B1220] hover:bg-slate-800 rounded-lg cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Tracker</span>
            </button>
          </div>
        </div>

        {privateFeedback && (
          <div
            role="status"
            className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2 text-xs font-medium text-emerald-900"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{privateFeedback}</span>
          </div>
        )}

        {incident.privateSupportTracking.length === 0 ? (
          <div className="bg-[#F8FAFC] border border-slate-200 rounded-lg p-6 text-center space-y-2">
            <p className="text-sm font-semibold text-[#0B1220]">
              No Non-Governmental Support Organizations Logged Yet
            </p>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              Select a verified organization above or explore tailored recommendations in{' '}
              <button
                type="button"
                onClick={() => onNavigateTab('find-help')}
                className="text-[#2563EB] font-semibold underline cursor-pointer"
              >
                Find the Right Help
              </button>
              .
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {incident.privateSupportTracking.map((entry) => (
              <div
                key={entry.id}
                className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-4 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-sm font-bold text-[#0B1220]">
                        {entry.organizationName}
                      </h3>
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      <span className="text-[11px] font-medium text-slate-600">
                        User-reported — not independently verified
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-500 mt-0.5 tabular-nums">
                      Last updated locally: {new Date(entry.updatedAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {entry.officialUrl && (
                      <a
                        href={entry.officialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          if (entry.status === 'Recommended') {
                            handleUpdatePrivateEntry(entry.id, {
                              status: 'Contact Information Viewed',
                            });
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#2563EB] bg-white border border-slate-200 hover:bg-blue-50 rounded-md"
                      >
                        <span>Official Website</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemovePrivateEntry(entry.id)}
                      className="px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 rounded-md cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Support Outreach Status
                    </label>
                    <select
                      value={entry.status}
                      onChange={(e) =>
                        handleUpdatePrivateEntry(entry.id, {
                          status: e.target.value as PrivateSupportStatus,
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-[#0B1220]"
                    >
                      {PRIVATE_SUPPORT_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Date Contacted
                    </label>
                    <input
                      type="date"
                      value={entry.dateContacted}
                      onChange={(e) =>
                        handleUpdatePrivateEntry(entry.id, { dateContacted: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-md text-[#0B1220]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Response State (User-Logged)
                    </label>
                    <select
                      value={entry.responseState}
                      onChange={(e) =>
                        handleUpdatePrivateEntry(entry.id, {
                          responseState: e.target.value as
                            | 'not-contacted'
                            | 'pending'
                            | 'response-received',
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-[#0B1220]"
                    >
                      <option value="not-contacted">Not Yet Contacted</option>
                      <option value="pending">Awaiting Response</option>
                      <option value="response-received">Response Received</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Follow-Up Reminder Date
                    </label>
                    <input
                      type="date"
                      value={entry.followUpDate}
                      onChange={(e) =>
                        handleUpdatePrivateEntry(entry.id, { followUpDate: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-md text-[#0B1220]"
                    />
                  </div>

                  <div className="sm:col-span-2 lg:col-span-4">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Outreach Channel &amp; Notes
                    </label>
                    <input
                      type="text"
                      value={entry.userNotes}
                      onChange={(e) =>
                        handleUpdatePrivateEntry(entry.id, { userNotes: e.target.value })
                      }
                      placeholder="Record helpline call times, counselor guidance, or ticket reference..."
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-[#0B1220]"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-start gap-2 text-xs text-slate-600">
          <ShieldAlert className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
          <span>
            Want to test how an internal reviewer updates a submitted KAVACH prototype case and how
            those updates sync back to Section A? Open the{' '}
            <button
              type="button"
              onClick={() => onNavigateTab('authority-dashboard')}
              className="text-[#2563EB] font-semibold underline cursor-pointer"
            >
              Authority / Case Reviewer Prototype Dashboard
            </button>
            .
          </span>
        </div>
      </section>
    </div>
  );
};
