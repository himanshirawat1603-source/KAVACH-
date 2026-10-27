import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  Download,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Send,
  Globe,
  Loader2,
  ArrowRight,
  Lock,
  HeartHandshake,
} from 'lucide-react';
import {
  IncidentRecord,
  PrivateSupportStatus,
  PrivateSupportTrackingEntry,
  WorkspaceTab,
} from '../types/incident';
import { VERIFIED_SUPPORT_DIRECTORY } from '../data/verifiedDirectory';
import { describeSubmissionState, downloadIncidentPdf } from '../utils/pdfGenerator';

interface SubmitHelpViewProps {
  incident: IncidentRecord | null;
  focusedSupportId?: string | null;
  onUpdateIncident: (patch: Partial<IncidentRecord>, activityNote?: string) => void;
  onNavigateTab: (tab: WorkspaceTab) => void;
  onLogPdfDownload: (inc: IncidentRecord) => void;
}

interface OfficialPortalEntry {
  id: string;
  title: string;
  url: string;
  statusUrl?: string;
  purpose: string;
  authorityLabel: string;
}

const OFFICIAL_GOVERNMENT_PORTALS: OfficialPortalEntry[] = [
  {
    id: 'nccrp-cybercrime-gov',
    title: 'National Cyber Crime Reporting Portal',
    url: 'https://cybercrime.gov.in/',
    statusUrl: 'https://www.cybercrime.gov.in/Webform/chkackstatus.aspx',
    authorityLabel: 'Ministry of Home Affairs, Government of India',
    purpose:
      'Official portal for reporting online harassment, cyberbullying, impersonation, threats, and cyber financial frauds (Helpline 1930).',
  },
  {
    id: 'erss-112',
    title: 'Emergency Response Support System (112)',
    url: 'https://112.gov.in/',
    authorityLabel: 'Ministry of Home Affairs — Pan-India Emergency Service',
    purpose:
      'Immediate emergency assistance connecting citizens to Police, Fire, Health, and Women safety dispatch (Voice call: 112).',
  },
  {
    id: 'wcd-women-help',
    title: 'Women Helpline & Support Directory',
    url: 'https://wcd.gov.in/women/help',
    authorityLabel: 'Ministry of Women & Child Development, Government of India',
    purpose:
      'Official Women Helpline (181), One Stop Centre information, and support services for women.',
  },
];

interface PortalInspectResult {
  url: string;
  embedVerifiedPermitted: boolean;
  status: string;
  reason: string;
}

export const SubmitHelpView: React.FC<SubmitHelpViewProps> = ({
  incident,
  focusedSupportId,
  onUpdateIncident,
  onNavigateTab,
  onLogPdfDownload,
}) => {
  const [selectedPortal, setSelectedPortal] = useState<OfficialPortalEntry>(() => {
    const found = OFFICIAL_GOVERNMENT_PORTALS.find((p) => p.id === focusedSupportId);
    return found || OFFICIAL_GOVERNMENT_PORTALS[0];
  });
  const [portalCheck, setPortalCheck] = useState<PortalInspectResult | null>(null);
  const [checkingPortal, setCheckingPortal] = useState(false);
  const [showEmbeddedAttempt, setShowEmbeddedAttempt] = useState(false);

  // Safe Fallback External Confirmation Form
  const [ackNumber, setAckNumber] = useState(
    incident?.officialTracking.acknowledgementNumber || ''
  );
  const [submissionDate, setSubmissionDate] = useState(
    incident?.officialTracking.submissionDate || new Date().toISOString().slice(0, 10)
  );
  const [ackSavedNotice, setAckSavedNotice] = useState<string | null>(null);

  // Module 6 Direct Submission Architecture State
  const [targetConnector, setTargetConnector] = useState<
    'nccrp-cybercrime-gov' | 'kavach-prototype-review'
  >('kavach-prototype-review');
  const [directConsentChecked, setDirectConsentChecked] = useState(false);
  const [showPayloadPreview, setShowPayloadPreview] = useState(false);
  const [directLoading, setDirectLoading] = useState(false);
  const [directResponseBanner, setDirectResponseBanner] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  // Module 7 Private Org Contact Logging
  const privateOrgs = VERIFIED_SUPPORT_DIRECTORY.filter(
    (d) => d.sector === 'private-support' && d.informationVerified
  );
  const [selectedPrivateOrgId, setSelectedPrivateOrgId] = useState<string>(() => {
    const matched = privateOrgs.find((o) => o.id === focusedSupportId);
    return matched?.id || privateOrgs[0]?.id || 'icall-tiss';
  });
  const [privContacted, setPrivContacted] = useState(false);
  const [privMethod, setPrivMethod] = useState('Official Website Contact Page');
  const [privResponseState, setPrivResponseState] = useState<
    'not-contacted' | 'pending' | 'response-received'
  >('pending');
  const [privNotes, setPrivNotes] = useState('');
  const [privSavedToast, setPrivSavedToast] = useState<string | null>(null);

  useEffect(() => {
    if (focusedSupportId) {
      const gov = OFFICIAL_GOVERNMENT_PORTALS.find((p) => p.id === focusedSupportId);
      if (gov) setSelectedPortal(gov);
      const priv = privateOrgs.find((o) => o.id === focusedSupportId);
      if (priv) setSelectedPrivateOrgId(priv.id);
    }
  }, [focusedSupportId]);

  useEffect(() => {
    if (incident) {
      setAckNumber(incident.officialTracking.acknowledgementNumber || '');
      setSubmissionDate(
        incident.officialTracking.submissionDate || new Date().toISOString().slice(0, 10)
      );
    }
  }, [incident?.id]);

  // Inspect selected official portal framing headers safely from server without bypassing CSP/XFO
  useEffect(() => {
    let active = true;
    setCheckingPortal(true);
    setShowEmbeddedAttempt(false);
    setPortalCheck(null);

    fetch(`/api/portals/inspect?url=${encodeURIComponent(selectedPortal.url)}`)
      .then((r) => r.json())
      .then((data) => {
        if (active) setPortalCheck(data);
      })
      .catch(() => {
        if (active) {
          setPortalCheck({
            url: selectedPortal.url,
            embedVerifiedPermitted: false,
            status: 'unverified-or-restricted',
            reason:
              'Embedding could not be verified. Open the official portal directly in a new browser tab.',
          });
        }
      })
      .finally(() => {
        if (active) setCheckingPortal(false);
      });

    return () => {
      active = false;
    };
  }, [selectedPortal.url]);

  if (!incident) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-4">
        <p className="font-display text-lg font-bold text-[#0B1220]">
          Select or Create an Incident Draft First
        </p>
        <p className="text-xs text-slate-600 max-w-md mx-auto">
          You can still visit official portals directly at{' '}
          <a
            href="https://cybercrime.gov.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#2563EB] underline"
          >
            cybercrime.gov.in
          </a>{' '}
          or{' '}
          <a
            href="https://112.gov.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#2563EB] underline"
          >
            112.gov.in
          </a>
          , or select a report from your Citizen Dashboard to export a PDF and track progress.
        </p>
        <button
          type="button"
          onClick={() => onNavigateTab('dashboard')}
          className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] rounded-lg cursor-pointer"
        >
          Go to Citizen Dashboard
        </button>
      </div>
    );
  }

  const handleMarkPortalOpened = () => {
    const nextHistory = [
      ...incident.internalTracking.history,
      {
        id: `hist-${Date.now()}`,
        status: 'External Submission Pending User Action',
        timestamp: new Date().toISOString(),
        actor: 'Citizen' as const,
        note: `Opened ${selectedPortal.title} (${selectedPortal.url}) in new tab to review external submission steps.`,
      },
    ];

    onUpdateIncident(
      {
        submissionState:
          incident.submissionState === 'user-confirmed-external'
            ? 'user-confirmed-external'
            : 'awaiting-external-action',
        internalTracking: {
          ...incident.internalTracking,
          currentStatus:
            incident.internalTracking.currentStatus === 'User Confirmed External Submission'
              ? 'User Confirmed External Submission'
              : 'External Submission Pending User Action',
          history: nextHistory,
        },
        officialTracking: {
          ...incident.officialTracking,
          authorityOrPortal: `${selectedPortal.title} (${selectedPortal.url})`,
          portalUrl: selectedPortal.url,
          statusCheckUrl:
            selectedPortal.statusUrl || incident.officialTracking.statusCheckUrl,
        },
      },
      `Opened official external portal ${selectedPortal.url} (awaiting citizen filing).`
    );
  };

  const handleSaveExternalConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedAck = ackNumber.trim();
    const nowIso = new Date().toISOString();

    const nextHistory = [
      ...incident.internalTracking.history,
      {
        id: `hist-${Date.now()}`,
        status: 'User Confirmed External Submission',
        timestamp: nowIso,
        actor: 'Citizen' as const,
        note: trimmedAck
          ? `Citizen recorded external portal submission with reference "${trimmedAck}" (user-reported, unverified by API).`
          : 'Citizen recorded completing submission on external official portal (user-reported, unverified by API).',
      },
    ];

    onUpdateIncident(
      {
        submissionState: 'user-confirmed-external',
        internalTracking: {
          ...incident.internalTracking,
          currentStatus: 'User Confirmed External Submission',
          history: nextHistory,
        },
        officialTracking: {
          ...incident.officialTracking,
          authorityOrPortal: `${selectedPortal.title}`,
          portalUrl: selectedPortal.url,
          statusCheckUrl:
            selectedPortal.statusUrl || 'https://www.cybercrime.gov.in/Webform/chkackstatus.aspx',
          acknowledgementNumber: trimmedAck,
          submissionDate,
          isLiveVerified: false,
        },
      },
      `Recorded user-confirmed external submission on ${selectedPortal.title}${
        trimmedAck ? ` (Ack: ${trimmedAck})` : ''
      }.`
    );

    setAckSavedNotice(
      'Saved as "User-Confirmed Submitted on External Portal" (user-reported — not independently verified by government API).'
    );
    setTimeout(() => setAckSavedNotice(null), 4500);
  };

  // Minimized payload preview for Module 6
  const minimizedPayload = {
    caseCode: incident.caseCode,
    incidentId: incident.id,
    isDemo: incident.isDemo,
    title: incident.title || 'Untitled Incident',
    category: incident.category,
    urgencyLevel: incident.urgencyLevel,
    platform: incident.platform,
    incidentDate: incident.date,
    incidentTime: incident.time,
    summary: incident.aiSummary || incident.description,
    description: incident.description,
    evidence: incident.evidence.map((e) => ({
      fileName: e.fileName,
      fileType: e.fileType,
      storageIndicator: e.storageIndicator || e.uploadStatus,
      capturedAt: e.capturedAt,
      description: e.description,
    })),
    timeline: incident.timeline
      .filter((t) => t.confirmed)
      .map((t) => ({
        date: t.date,
        time: t.time,
        title: t.title,
        description: t.description,
        confirmed: true,
      })),
    missingInfo: incident.missingInfoQuestions
      .filter((q) => q.status === 'open')
      .map((q) => q.question),
  };

  const handleDirectSubmissionAttempt = async () => {
    if (!directConsentChecked) {
      setDirectResponseBanner({
        ok: false,
        message:
          'Informed consent required: Please check the confirmation box after reviewing what data would be transmitted.',
      });
      return;
    }

    setDirectLoading(true);
    setDirectResponseBanner(null);

    const idemKey =
      incident.internalTracking.prototypeIdempotencyKey ||
      `idem-${incident.caseCode}-${incident.updatedAt.slice(0, 19)}`;

    try {
      const res = await fetch('/api/submissions/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectorId: targetConnector,
          idempotencyKey: idemKey,
          consentConfirmed: true,
          payload: minimizedPayload,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        onUpdateIncident(
          {
            submissionState:
              incident.submissionState === 'user-confirmed-external'
                ? 'user-confirmed-external'
                : 'submission-failed',
            lastSubmissionError: data.error,
          },
          `Direct submission attempt to "${targetConnector}" declined safely (no authorized external government API).`
        );
        setDirectResponseBanner({
          ok: false,
          message:
            data.error ||
            'Direct submission unavailable: No authorized external API is connected.',
        });
        return;
      }

      // Only KAVACH Prototype Review Queue succeeds—explicitly NOT marked as a government submission!
      const nowIso = new Date().toISOString();
      onUpdateIncident(
        {
          internalTracking: {
            ...incident.internalTracking,
            prototypeQueueSubmitted: true,
            prototypeIdempotencyKey: idemKey,
            prototypeAccessToken: data.accessToken,
            prototypeReviewerStatus: data.reviewerStatus,
            prototypeLastSyncedAt: nowIso,
            history: [
              ...incident.internalTracking.history,
              {
                id: `hist-${Date.now()}`,
                status: incident.internalTracking.currentStatus,
                timestamp: nowIso,
                actor: 'KAVACH System',
                note: data.deduplicatedRetry
                  ? 'Idempotent retry confirmed existing record in KAVACH Prototype Review Queue (no duplicate created).'
                  : 'Consented copy shared with KAVACH Prototype Reviewer Queue (Internal Demo Only — NOT submitted to government).',
              },
            ],
          },
        },
        'Shared report snapshot with KAVACH Prototype Review Queue (internal demo only; not a government submission).'
      );

      setDirectResponseBanner({
        ok: true,
        message: `${data.disclaimer} Current Prototype Reviewer Status: "${data.reviewerStatus}".${
          data.deduplicatedRetry ? ' (Duplicate prevented via idempotency key.)' : ''
        }`,
      });
    } catch (err: unknown) {
      setDirectResponseBanner({
        ok: false,
        message:
          err instanceof Error
            ? err.message
            : 'Network error while contacting backend submission route.',
      });
    } finally {
      setDirectLoading(false);
    }
  };

  const selectedPrivateOrg =
    privateOrgs.find((o) => o.id === selectedPrivateOrgId) || privateOrgs[0];

  const handleLogPrivateSupportContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrivateOrg) return;

    const status: PrivateSupportStatus = !privContacted
      ? 'Contact Information Viewed'
      : privResponseState === 'response-received'
        ? 'Response Reported by User'
        : 'Contacted by User';

    const existingIdx = incident.privateSupportTracking.findIndex(
      (item) => item.organizationId === selectedPrivateOrg.id
    );

    const entry: PrivateSupportTrackingEntry = {
      id:
        existingIdx >= 0
          ? incident.privateSupportTracking[existingIdx].id
          : `pst-${Date.now()}`,
      organizationId: selectedPrivateOrg.id,
      organizationName: selectedPrivateOrg.name,
      officialUrl: selectedPrivateOrg.officialUrl,
      status,
      dateContacted: privContacted ? new Date().toISOString().slice(0, 10) : '',
      contactMethod: privMethod,
      responseState: privContacted ? privResponseState : 'not-contacted',
      followUpDate: '',
      userNotes: privNotes.trim(),
      updatedAt: new Date().toISOString(),
    };

    const nextList = [...incident.privateSupportTracking];
    if (existingIdx >= 0) {
      nextList[existingIdx] = entry;
    } else {
      nextList.unshift(entry);
    }

    onUpdateIncident(
      { privateSupportTracking: nextList },
      `Logged user-reported update for ${selectedPrivateOrg.name}: ${status}.`
    );

    setPrivSavedToast(
      `Saved user-reported contact log for ${selectedPrivateOrg.name} (not confirmed by organization).`
    );
    setTimeout(() => setPrivSavedToast(null), 4000);
  };

  const subMeta = describeSubmissionState(incident.submissionState);

  return (
    <div className="space-y-8">
      {/* Header & Current Submission State Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-[#2563EB] tabular-nums">
            Submit / Get Help · Case {incident.caseCode}
          </p>
          <h1 className="font-display text-2xl font-bold text-[#0B1220] tracking-tight mt-0.5">
            Official Portals, Safe Submission &amp; Support Outreach
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Download your prepared PDF dossier, open verified official portals safely, and record
            your acknowledgement or support updates.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            downloadIncidentPdf(incident);
            onLogPdfDownload(incident);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>1. Download Prepared PDF First</span>
        </button>
      </div>

      {/* Clear Current Submission State Readout */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500">Current External Submission State</p>
          <p className="font-display text-sm font-bold text-[#0B1220] mt-0.5">
            {subMeta.shortLabel}
          </p>
          <p className="text-xs text-slate-600 mt-0.5">{subMeta.explanation}</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigateTab('track-case')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#2563EB] bg-blue-50 hover:bg-blue-100 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
        >
          <span>Open Unified Case Tracker</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* MODULE 5: Official Government Links & Embedded Portal Viewer */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 bg-[#0B1220] text-white">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#22D3EE] mb-1">
            <Globe className="w-4 h-4" />
            <span>Official Government Portals &amp; Safe Portal Viewer</span>
          </div>
          <h2 className="font-display text-lg font-bold">
            Select Official Portal &amp; Continue Safely
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            External portals operate under their own government submission procedures, OTP logins,
            and privacy policies. KAVACH never transmits your data or files automatically.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* 3 Distinct Official Portal Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {OFFICIAL_GOVERNMENT_PORTALS.map((portal) => {
              const active = selectedPortal.id === portal.id;
              return (
                <button
                  key={portal.id}
                  type="button"
                  onClick={() => setSelectedPortal(portal)}
                  className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                    active
                      ? 'bg-blue-50/70 border-[#2563EB] text-[#0B1220]'
                      : 'bg-[#F8FAFC] border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <p className="font-mono text-[11px] text-[#2563EB] break-all">{portal.url}</p>
                  <p className="font-display text-sm font-bold text-[#0B1220] mt-1">
                    {portal.title}
                  </p>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{portal.purpose}</p>
                </button>
              );
            })}
          </div>

          {/* Portal Security Policy Inspection & Embedded Viewer / Fallback */}
          <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-500">
                  Selected Official Destination ({selectedPortal.authorityLabel})
                </p>
                <p className="font-display text-base font-bold text-[#0B1220] mt-0.5">
                  {selectedPortal.title} —{' '}
                  <span className="font-mono text-sm text-[#2563EB]">{selectedPortal.url}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    downloadIncidentPdf(incident);
                    onLogPdfDownload(incident);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Download Report PDF</span>
                </button>

                <a
                  href={selectedPortal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleMarkPortalOpened}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg"
                >
                  <span>Open Official Website</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Header Check Diagnostic */}
            {checkingPortal ? (
              <div className="bg-white border border-slate-200 rounded-lg p-5 flex items-center gap-3 text-xs text-slate-600">
                <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" />
                <span>
                  Checking {selectedPortal.url} framing security policies (X-Frame-Options /
                  Content-Security-Policy)...
                </span>
              </div>
            ) : portalCheck && !portalCheck.embedVerifiedPermitted ? (
              <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2.5 text-xs text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-1 leading-relaxed">
                    <p className="font-bold">
                      Embedded Preview Restricted by Portal Security Policy — Use Direct Official
                      Tab
                    </p>
                    <p>{portalCheck.reason}</p>
                    <p className="text-amber-900">
                      KAVACH never bypasses government Content Security Policy, X-Frame-Options,
                      OTP login, or CAPTCHA protections. Click{' '}
                      <strong>Open Official Website</strong> above to launch{' '}
                      <span className="font-mono">{selectedPortal.url}</span> safely in a new
                      browser tab after downloading your PDF.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <p className="text-slate-600 leading-relaxed">
                    {portalCheck?.reason ||
                      'You can attempt to preview this official resource below or open it directly in a new tab.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowEmbeddedAttempt((prev) => !prev)}
                    className="px-3.5 py-2 font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {showEmbeddedAttempt
                      ? 'Close Embedded Viewer'
                      : 'Continue to Embedded Portal Viewer'}
                  </button>
                </div>

                {showEmbeddedAttempt && (
                  <div className="border border-slate-300 rounded-xl overflow-hidden bg-white">
                    <div className="px-4 py-2.5 bg-slate-900 text-white text-xs flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono truncate">
                        Embedded View: {selectedPortal.url}
                      </span>
                      <a
                        href={selectedPortal.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={handleMarkPortalOpened}
                        className="inline-flex items-center gap-1 text-[#22D3EE] hover:underline font-semibold"
                      >
                        <span>Blocked by your browser? Open Official Website in New Tab</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    <iframe
                      src={selectedPortal.url}
                      title={selectedPortal.title}
                      className="w-full h-[420px] bg-slate-50"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Safe 5-Step Fallback: Citizen External Confirmation & Ack Number Logger */}
          <form
            onSubmit={handleSaveExternalConfirmation}
            className="border border-slate-200 rounded-xl p-5 space-y-4 bg-white"
          >
            <div>
              <h3 className="font-display text-base font-bold text-[#0B1220]">
                Return &amp; Record Your Official Acknowledgement Number (Citizen-Reported)
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Once you submit your complaint directly on{' '}
                <span className="font-mono">{selectedPortal.url}</span>, paste the official
                acknowledgement/complaint number here so you can track it in KAVACH.
              </p>
            </div>

            {ackSavedNotice && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2 text-xs text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{ackSavedNotice}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
              <div className="sm:col-span-6">
                <label
                  htmlFor="ack-input"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Official Acknowledgement / Reference Number
                </label>
                <input
                  id="ack-input"
                  type="text"
                  value={ackNumber}
                  onChange={(e) => setAckNumber(e.target.value)}
                  placeholder="e.g., 31910202600491 (enter only after filing on official portal)"
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg text-[#0B1220] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="sm:col-span-3">
                <label
                  htmlFor="ack-date"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Date Submitted
                </label>
                <input
                  id="ack-date"
                  type="date"
                  value={submissionDate}
                  onChange={(e) => setSubmissionDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg text-[#0B1220] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="w-full px-4 py-2.5 text-xs font-semibold text-white bg-[#0B1220] hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  Confirm External Filing
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* MODULE 6: Direct Submission Connector Architecture */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#2563EB] mb-1">
              <Lock className="w-4 h-4" />
              <span>Direct-Submission Connector Architecture</span>
            </div>
            <h2 className="font-display text-lg font-bold text-[#0B1220]">
              Authorized Backend Connector &amp; Prototype Reviewer Sync
            </h2>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Government portals (<code className="font-mono">cybercrime.gov.in</code>,{' '}
              <code className="font-mono">112.gov.in</code>) do not publish public third-party
              submission APIs, so KAVACH safely blocks unverified external transmissions. For
              hackathon demonstration, you can test KAVACH’s consented, idempotent backend
              submission pipeline against the{' '}
              <strong>KAVACH Prototype Internal Review Queue</strong>.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowPayloadPreview((prev) => !prev)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
          >
            {showPayloadPreview ? 'Hide Payload Inspector' : 'Inspect Minimized Data Payload'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <button
            type="button"
            onClick={() => setTargetConnector('kavach-prototype-review')}
            className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
              targetConnector === 'kavach-prototype-review'
                ? 'bg-blue-50/60 border-[#2563EB]'
                : 'bg-[#F8FAFC] border-slate-200'
            }`}
          >
            <p className="text-xs font-bold text-[#0B1220]">
              KAVACH Prototype Internal Review Queue (Demo Backend Active)
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Shares minimized report with the in-app Prototype Reviewer Dashboard using
              idempotency keys and a private case token.{' '}
              <strong>Not connected to any government authority.</strong>
            </p>
          </button>

          <button
            type="button"
            onClick={() => setTargetConnector('nccrp-cybercrime-gov')}
            className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
              targetConnector === 'nccrp-cybercrime-gov'
                ? 'bg-amber-50/70 border-amber-400'
                : 'bg-[#F8FAFC] border-slate-200'
            }`}
          >
            <p className="text-xs font-bold text-[#0B1220]">
              External Government API Connector (No Authorized API Configured)
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Demonstrates safe safeguard: rejects unauthorized direct submission and directs you to
              the PDF + external portal workflow instead of faking success.
            </p>
          </button>
        </div>

        {showPayloadPreview && (
          <div className="bg-slate-900 text-slate-200 rounded-lg p-4 space-y-2">
            <p className="text-xs font-semibold text-[#22D3EE]">
              Exact Minimized Payload to Be Sent to:{' '}
              {targetConnector === 'kavach-prototype-review'
                ? 'KAVACH Prototype Internal Queue (Local Server)'
                : 'External Government Connector (Unconfigured)'}
            </p>
            <pre className="text-[11px] font-mono overflow-x-auto max-h-52 whitespace-pre-wrap">
              {JSON.stringify(minimizedPayload, null, 2)}
            </pre>
          </div>
        )}

        <label className="flex items-start gap-3 p-3.5 bg-[#F8FAFC] border border-slate-200 rounded-lg cursor-pointer">
          <input
            type="checkbox"
            checked={directConsentChecked}
            onChange={(e) => setDirectConsentChecked(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[#2563EB] rounded"
          />
          <span className="text-xs text-slate-700 leading-relaxed">
            <strong className="font-semibold text-[#0B1220]">Informed Transmission Consent:</strong>{' '}
            I have reviewed the report and consent to transmitting the minimized summary, timeline,
            and evidence index shown above to the selected target. I understand the KAVACH Prototype
            Queue is an internal demonstration reviewer system and{' '}
            <strong>not an official police or government filing</strong>.
          </span>
        </label>

        {directResponseBanner && (
          <div
            role="alert"
            className={`rounded-lg p-3.5 border flex items-start gap-2.5 text-xs ${
              directResponseBanner.ok
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-amber-50 border-amber-300 text-amber-950'
            }`}
          >
            {directResponseBanner.ok ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            )}
            <span>{directResponseBanner.message}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={directLoading}
            onClick={handleDirectSubmissionAttempt}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#0B1220] hover:bg-slate-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
          >
            {directLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Transmitting...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-[#22D3EE]" />
                <span>
                  {targetConnector === 'kavach-prototype-review'
                    ? 'Submit Snapshot to KAVACH Prototype Review Queue'
                    : 'Test Direct Government API Safeguard'}
                </span>
              </>
            )}
          </button>

          {incident.internalTracking.prototypeQueueSubmitted && (
            <button
              type="button"
              onClick={() => onNavigateTab('authority-dashboard')}
              className="px-3.5 py-2.5 text-xs font-semibold text-[#2563EB] bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer"
            >
              Inspect in Prototype Reviewer Dashboard →
            </button>
          )}
        </div>
      </section>

      {/* MODULE 7: Private / Non-Government Organization Contact & Logging */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex items-start gap-3 pb-3 border-b border-slate-100">
          <HeartHandshake className="w-5 h-5 text-[#2563EB] shrink-0 mt-0.5" />
          <div>
            <h2 className="font-display text-lg font-bold text-[#0B1220]">
              Private &amp; Non-Government Support Outreach Log
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              No private organization has an automated API connected to KAVACH. Open their verified
              contact page, download your PDF if needed, and log your outreach updates below
              (strictly labeled as user-reported).
            </p>
          </div>
        </div>

        <form onSubmit={handleLogPrivateSupportContact} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="priv-org-select"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Choose Verified Support Organization
              </label>
              <select
                id="priv-org-select"
                value={selectedPrivateOrgId}
                onChange={(e) => setSelectedPrivateOrgId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-[#0B1220]"
              >
                {privateOrgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedPrivateOrg && (
              <div className="flex flex-wrap items-end gap-2.5">
                <a
                  href={selectedPrivateOrg.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg"
                >
                  <span>Open Official Contact Page</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={() => {
                    downloadIncidentPdf(incident);
                    onLogPdfDownload(incident);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center bg-[#F8FAFC] border border-slate-200 rounded-lg p-4">
            <label className="flex items-center gap-2.5 text-xs font-semibold text-[#0B1220] cursor-pointer">
              <input
                type="checkbox"
                checked={privContacted}
                onChange={(e) => setPrivContacted(e.target.checked)}
                className="w-4 h-4 accent-[#2563EB] rounded"
              />
              <span>I contacted this organization</span>
            </label>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Contact Method
              </label>
              <select
                value={privMethod}
                onChange={(e) => setPrivMethod(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              >
                <option value="Official Website Contact Page">Official Website Contact Page</option>
                <option value="Telephone Helpline">Telephone Helpline</option>
                <option value="Official Email">Official Email</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Response Status (User-Reported)
              </label>
              <select
                value={privResponseState}
                onChange={(e) =>
                  setPrivResponseState(
                    e.target.value as 'not-contacted' | 'pending' | 'response-received'
                  )
                }
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              >
                <option value="pending">Awaiting Response</option>
                <option value="response-received">Response Received by User</option>
                <option value="not-contacted">Not Contacted Yet</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={privNotes}
              onChange={(e) => setPrivNotes(e.target.value)}
              placeholder="Optional follow-up notes (e.g., spoke with counsellor, scheduled callback Tuesday)..."
              className="flex-1 px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-lg text-[#0B1220]"
            />
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0B1220] hover:bg-slate-800 rounded-lg whitespace-nowrap cursor-pointer"
            >
              Save User-Reported Outreach Log
            </button>
          </div>

          {privSavedToast && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900">
              {privSavedToast}
            </div>
          )}
        </form>
      </section>
    </div>
  );
};
