import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ExternalLink,
  Download,
  CheckCircle2,
  PhoneCall,
  HeartHandshake,
  ArrowLeft,
  Save,
  Info,
  FileText,
  ClipboardCheck,
} from 'lucide-react';
import { IncidentRecord, WorkspaceTab } from '../types/incident';
import {
  downloadIncidentPdf,
  getKavachReportStatus,
  getOfficialComplaintStatus,
} from '../utils/pdfGenerator';

interface ChooseReportingAuthorityViewProps {
  incidents: IncidentRecord[];
  incident: IncidentRecord | null;
  onSelectIncident: (id: string) => void;
  onUpdateIncident: (patch: Partial<IncidentRecord>, activityNote?: string) => void;
  onNavigateTab: (tab: WorkspaceTab) => void;
  onLogPdfDownload: (inc: IncidentRecord) => void;
  onCreateNew: () => void;
}

const AUTHORITY_OPTIONS = [
  {
    id: 'cybercrime-portal',
    code: 'A',
    categoryTitle: 'A. CYBERCRIME COMPLAINT',
    authorityName: 'National Cyber Crime Reporting Portal (cybercrime.gov.in)',
    officialUrl: 'https://cybercrime.gov.in/',
    urlLabel: 'Official portal: https://cybercrime.gov.in/',
    buttonLabel: 'Submit Cybercrime Complaint',
    description:
      'Official Government of India portal (Ministry of Home Affairs) for reporting cyberbullying, online harassment, impersonation, online threats, and cyber financial fraud.',
    extraNotice: null as string | null,
    tone: 'primary' as const,
  },
  {
    id: 'emergency-112',
    code: 'B',
    categoryTitle: 'B. EMERGENCY HELP',
    authorityName: 'Emergency Response Support System (112.gov.in)',
    officialUrl: 'https://112.gov.in/',
    urlLabel: 'Official website: https://112.gov.in/',
    buttonLabel: 'Get Emergency Help',
    description:
      'Pan-India Emergency Response Support System connecting citizens to Police, Fire, Health, and Women safety emergency dispatch.',
    extraNotice:
      'Users facing immediate physical danger or an active safety threat should contact emergency services directly (Dial 112 immediately, or Dial 1930 for active cyber financial fraud) rather than waiting to complete online documentation.',
    tone: 'emergency' as const,
  },
  {
    id: 'women-support-wcd',
    code: 'C',
    categoryTitle: "C. WOMEN'S SUPPORT",
    authorityName: 'Ministry of Women & Child Development — Women Helpline Information',
    officialUrl: 'https://wcd.gov.in/women/help',
    urlLabel: 'Official information: https://wcd.gov.in/women/help',
    buttonLabel: 'Women Helpline Information',
    description:
      'Official Government of India information page covering the Women Helpline (181), One Stop Centres, and support resources for women.',
    extraNotice: null as string | null,
    tone: 'support' as const,
  },
];

export const ChooseReportingAuthorityView: React.FC<ChooseReportingAuthorityViewProps> = ({
  incidents,
  incident,
  onSelectIncident,
  onUpdateIncident,
  onNavigateTab,
  onLogPdfDownload,
  onCreateNew,
}) => {
  const [showSubmittedForm, setShowSubmittedForm] = useState<boolean>(false);
  const [selectedPortalName, setSelectedPortalName] = useState<string>(
    incident?.officialTracking.authorityOrPortal ||
      'National Cyber Crime Reporting Portal (cybercrime.gov.in)'
  );
  const [selectedPortalUrl, setSelectedPortalUrl] = useState<string>(
    incident?.officialTracking.portalUrl || 'https://cybercrime.gov.in/'
  );
  const [ackNumberInput, setAckNumberInput] = useState<string>(
    incident?.officialTracking.acknowledgementNumber || ''
  );
  const [submissionDateInput, setSubmissionDateInput] = useState<string>(
    incident?.officialTracking.submissionDate || new Date().toISOString().slice(0, 10)
  );
  const [userNotesInput, setUserNotesInput] = useState<string>(
    incident?.officialTracking.userNotes || ''
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);
  const [pdfNotice, setPdfNotice] = useState<string | null>(null);
  const [portalOpenedBanner, setPortalOpenedBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!incident) return;
    setSelectedPortalName(
      incident.officialTracking.authorityOrPortal ||
        'National Cyber Crime Reporting Portal (cybercrime.gov.in)'
    );
    setSelectedPortalUrl(incident.officialTracking.portalUrl || 'https://cybercrime.gov.in/');
    setAckNumberInput(incident.officialTracking.acknowledgementNumber || '');
    setSubmissionDateInput(
      incident.officialTracking.submissionDate || new Date().toISOString().slice(0, 10)
    );
    setUserNotesInput(incident.officialTracking.userNotes || '');
    setFormError(null);
  }, [incident?.id]);

  const handleDownloadKavachReport = () => {
    if (!incident) return;
    downloadIncidentPdf(incident);
    onLogPdfDownload(incident);
    setPdfNotice(
      `Downloaded ${incident.caseCode.toLowerCase()}-kavach-report.pdf containing your reviewed summary, chronological timeline, and evidence inventory.`
    );
    setTimeout(() => setPdfNotice(null), 5000);
  };

  // Opening an official link NEVER automatically marks the complaint as officially submitted
  const handleExternalPortalOpened = (authorityName: string, officialUrl: string) => {
    setSelectedPortalName(authorityName);
    setSelectedPortalUrl(officialUrl);
    setPortalOpenedBanner(
      `Opened ${officialUrl} in a new browser tab. Your complaint is NOT marked as submitted automatically—when you finish on the official website, click "I Have Submitted My Complaint" below to record your reference number.`
    );

    if (!incident) return;

    const alreadyUserConfirmed =
      incident.submissionState === 'user-confirmed-external' ||
      incident.submissionState === 'verified-integration';

    const nowIso = new Date().toISOString();
    const nextHistory = [
      {
        id: `hist-open-${Date.now()}`,
        status: alreadyUserConfirmed
          ? incident.internalTracking.currentStatus
          : ('External Submission Pending User Action' as const),
        timestamp: nowIso,
        actor: 'Citizen' as const,
        note: `Opened ${authorityName} (${officialUrl}) in a new browser tab. Not automatically marked as submitted.`,
      },
      ...incident.internalTracking.history,
    ];

    onUpdateIncident(
      {
        submissionState: alreadyUserConfirmed
          ? incident.submissionState
          : 'awaiting-external-action',
        internalTracking: {
          ...incident.internalTracking,
          currentStatus: alreadyUserConfirmed
            ? incident.internalTracking.currentStatus
            : 'External Submission Pending User Action',
          history: nextHistory,
        },
        officialTracking: {
          ...incident.officialTracking,
          authorityOrPortal: authorityName,
          portalUrl: officialUrl,
          statusCheckUrl: 'https://www.cybercrime.gov.in/Webform/chkackstatus.aspx',
        },
      },
      `Opened official portal ${officialUrl} in new tab (awaiting user submission confirmation).`
    );
  };

  const handleSaveOfficialSubmission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incident) return;

    const trimmedAck = ackNumberInput.trim();
    if (!trimmedAck) {
      setFormError(
        'Please enter the official complaint acknowledgement or reference number provided by the portal.'
      );
      return;
    }
    if (!submissionDateInput) {
      setFormError('Please select the date on which you submitted the complaint.');
      return;
    }

    setFormError(null);
    const nowIso = new Date().toISOString();

    const nextHistory = [
      {
        id: `hist-sub-${Date.now()}`,
        status: 'User Confirmed External Submission' as const,
        timestamp: nowIso,
        actor: 'Citizen' as const,
        note: `User confirmed official complaint submission on ${selectedPortalName} — Reference: ${trimmedAck} (User-provided, not verified by official integration).`,
      },
      ...incident.internalTracking.history,
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
          authorityOrPortal: selectedPortalName,
          portalUrl: selectedPortalUrl,
          statusCheckUrl: 'https://www.cybercrime.gov.in/Webform/chkackstatus.aspx',
          acknowledgementNumber: trimmedAck,
          submissionDate: submissionDateInput,
          userNotes: userNotesInput.trim(),
          isLiveVerified: false, // Strictly user-provided unless an actual official API integration exists
        },
      },
      `Saved user-provided official complaint reference (${trimmedAck}) on ${selectedPortalName}.`
    );

    setSavedBanner(
      `Saved Reference "${trimmedAck}" (${submissionDateInput}) to case ${incident.caseCode} as user-provided confirmation.`
    );
  };

  const kavachStatus = incident ? getKavachReportStatus(incident) : null;
  const officialStatus = incident ? getOfficialComplaintStatus(incident) : null;
  const confirmedTimelineCount = incident
    ? incident.timeline.filter((t) => t.confirmed).length
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Navigation & Case Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <button
              type="button"
              onClick={() => onNavigateTab(incident ? 'report' : 'dashboard')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{incident ? 'Back to Final Report' : 'Back to Citizen Dashboard'}</span>
            </button>
            {incident && (
              <>
                <span className="text-slate-300" aria-hidden="true">
                  ·
                </span>
                <span className="font-mono text-xs text-slate-600 tabular-nums">
                  Case {incident.caseCode}
                </span>
              </>
            )}
          </div>
          <h1 className="font-display text-2xl font-bold text-[#0B1220] tracking-tight">
            Choose Reporting Authority
          </h1>
        </div>

        {incidents.length > 1 && incident && (
          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="authority-case-select" className="text-xs font-semibold text-slate-600">
              Selected Case:
            </label>
            <select
              id="authority-case-select"
              value={incident.id}
              onChange={(e) => onSelectIncident(e.target.value)}
              className="px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg text-[#0B1220] focus:outline-none focus:border-[#2563EB]"
            >
              {incidents.map((inc) => (
                <option key={inc.id} value={inc.id}>
                  {inc.caseCode} — {inc.title ? inc.title.slice(0, 32) : 'Untitled Draft'}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Mandatory Clear Guidance Banner (Requirement 4) */}
      <div className="bg-[#0B1220] text-white border border-slate-800 rounded-xl p-5 sm:p-6 flex items-start gap-3.5">
        <Info className="w-5 h-5 text-[#22D3EE] shrink-0 mt-0.5" />
        <div className="space-y-1.5">
          <p className="text-sm sm:text-base font-medium text-white leading-relaxed">
            KAVACH prepares and organizes your incident report. To officially register your
            complaint, continue to the relevant government portal and complete its submission
            process.
          </p>
          <p className="text-xs text-slate-400">
            KAVACH does not directly submit forms to government agencies or fabricate official
            filings. All official complaint registrations happen directly on the government portal
            in a new browser tab.
          </p>
        </div>
      </div>

      {/* Two Separate Statuses + Download My KAVACH Report Before Leaving (Requirements 3, 6 & 7) */}
      {incident ? (
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-mono font-semibold text-[#0B1220] tabular-nums">
                  {incident.caseCode}
                </span>
                <span aria-hidden="true">·</span>
                <span className="capitalize font-medium text-slate-700">{incident.category}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {confirmedTimelineCount} timeline events · {incident.evidence.length} evidence
                  items
                </span>
              </div>
              <h2 className="font-display text-base sm:text-lg font-bold text-[#0B1220]">
                Step 1 — Download Your Prepared KAVACH Report Before Leaving
              </h2>
              <p className="text-xs text-slate-600">
                Download your structured PDF containing your reviewed incident summary,
                chronological timeline, and evidence inventory so you can reference or attach it on
                the official portal.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleDownloadKavachReport}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download My KAVACH Report</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('report')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-[#F8FAFC] border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Review Report Page</span>
              </button>
            </div>
          </div>

          {/* Separate KAVACH Report Status vs Official Complaint Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 bg-[#F8FAFC]">
            <div className="p-5 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                KAVACH Report Status
              </p>
              <p className="font-display text-sm sm:text-base font-bold text-[#0B1220]">
                {kavachStatus?.label}
              </p>
              <p className="text-xs text-slate-600">
                {kavachStatus?.detail} · Saved in your local KAVACH browser workspace.
              </p>
            </div>

            <div className="p-5 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Official Complaint Status
              </p>
              <p
                className={`font-display text-sm sm:text-base font-bold ${
                  officialStatus?.state === 'verified-integration'
                    ? 'text-emerald-700'
                    : officialStatus?.state === 'user-provided'
                      ? 'text-amber-900'
                      : 'text-[#0B1220]'
                }`}
              >
                {officialStatus?.label}
              </p>
              <p className="text-xs text-slate-600">
                {officialStatus?.verificationLabel}
                {officialStatus?.submissionDate
                  ? ` · Recorded submission date: ${officialStatus.submissionDate}`
                  : ''}
              </p>
            </div>
          </div>
        </section>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-slate-600">
            <strong className="text-[#0B1220] block text-sm mb-0.5">
              No KAVACH Incident Draft Selected
            </strong>
            You can immediately open any official government portal below, or create a KAVACH
            incident draft first to generate a downloadable PDF report and save your reference
            number.
          </div>
          <button
            type="button"
            onClick={onCreateNew}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shrink-0 cursor-pointer"
          >
            Create KAVACH Report Draft
          </button>
        </div>
      )}

      {pdfNotice && (
        <div
          role="status"
          className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-2.5 text-xs font-medium text-emerald-900"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{pdfNotice}</span>
        </div>
      )}

      {portalOpenedBanner && (
        <div
          role="status"
          className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-blue-950"
        >
          <Info className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
          <span>{portalOpenedBanner}</span>
        </div>
      )}

      {/* Step 2: Three Official Reporting Authority Options (Requirement 2: A, B, C) */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-bold text-[#0B1220]">
              Step 2 — Continue to Official Government Portal
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Each link opens the official government website in a new browser tab. Opening a link
              does not automatically mark your complaint as submitted.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {AUTHORITY_OPTIONS.map((opt) => {
            const isEmergency = opt.tone === 'emergency';
            const isSupport = opt.tone === 'support';

            return (
              <div
                key={opt.id}
                className={`rounded-xl p-6 flex flex-col justify-between border ${
                  isEmergency
                    ? 'bg-red-50/40 border-red-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`font-mono text-xs font-bold tracking-wide ${
                        isEmergency
                          ? 'text-red-700'
                          : isSupport
                            ? 'text-[#0B1220]'
                            : 'text-[#2563EB]'
                      }`}
                    >
                      {opt.categoryTitle}
                    </span>
                    {isEmergency ? (
                      <PhoneCall className="w-4 h-4 text-red-700 shrink-0" />
                    ) : isSupport ? (
                      <HeartHandshake className="w-4 h-4 text-[#2563EB] shrink-0" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 text-[#2563EB] shrink-0" />
                    )}
                  </div>

                  <h3 className="font-display text-base font-bold text-[#0B1220] leading-snug">
                    {opt.authorityName}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed">{opt.description}</p>

                  {opt.extraNotice && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-950 leading-relaxed">
                      <strong className="font-semibold block mb-0.5">
                        Immediate Danger Notice:
                      </strong>
                      {opt.extraNotice}
                      <div className="mt-2 pt-2 border-t border-red-200/80 flex flex-wrap items-center gap-3 font-mono text-[11px] font-semibold text-red-900 tabular-nums">
                        <a href="tel:112" className="underline hover:text-red-700">
                          Call 112 (Emergency)
                        </a>
                        <span aria-hidden="true">·</span>
                        <a href="tel:1930" className="underline hover:text-red-700">
                          Call 1930 (Cyber Fraud)
                        </a>
                      </div>
                    </div>
                  )}

                  <p className="font-mono text-[11px] text-slate-500 break-all pt-1">
                    {opt.urlLabel}
                  </p>
                </div>

                <div className="pt-5 mt-5 border-t border-slate-200/80">
                  <a
                    href={opt.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleExternalPortalOpened(opt.authorityName, opt.officialUrl)}
                    className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${
                      isEmergency
                        ? 'text-white bg-red-700 hover:bg-red-800'
                        : isSupport
                          ? 'text-white bg-[#0B1220] hover:bg-slate-800'
                          : 'text-white bg-[#2563EB] hover:bg-blue-700'
                    }`}
                  >
                    <span>{opt.buttonLabel}</span>
                    <ExternalLink className="w-4 h-4 shrink-0" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Step 3: Return-to-KAVACH Confirmation Flow (Requirement 5 & 6) */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-display text-lg font-bold text-[#0B1220]">
              Step 3 — Returning After Submitting on the Official Portal?
            </h2>
            <p className="text-xs text-slate-600 max-w-2xl">
              KAVACH never marks a complaint as submitted automatically. Once you have completed
              registration on the official government website and received an acknowledgement or
              reference number, record it here for your case file.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              disabled={!incident}
              onClick={() => setShowSubmittedForm((prev) => !prev)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#0B1220] bg-[#22D3EE] hover:bg-cyan-300 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>I Have Submitted My Complaint</span>
            </button>

            <a
              href="https://www.cybercrime.gov.in/Webform/chkackstatus.aspx"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-800 bg-[#F8FAFC] border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
            >
              <span>Track Official Complaint Status</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#2563EB]" />
            </a>
          </div>
        </div>

        {savedBanner && (
          <div
            role="status"
            className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-950"
          >
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{savedBanner}</p>
                <p className="text-emerald-800 mt-0.5">
                  Labeled as user-provided confirmation (not verified by an official government API
                  integration).
                </p>
              </div>
            </div>

            <a
              href="https://www.cybercrime.gov.in/Webform/chkackstatus.aspx"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#0B1220] hover:bg-slate-800 rounded-lg shrink-0"
            >
              <span>Open Official Tracking Page</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#22D3EE]" />
            </a>
          </div>
        )}

        {showSubmittedForm && incident && (
          <form
            onSubmit={handleSaveOfficialSubmission}
            className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-5 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-display text-sm font-bold text-[#0B1220]">
                  Record User-Provided Official Complaint Details
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Saved to KAVACH case <span className="font-mono">{incident.caseCode}</span> and
                  marked as user-provided unless verified by an official integration.
                </p>
              </div>
            </div>

            {formError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs font-medium text-red-900">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-5">
                <label
                  htmlFor="confirm-portal-select"
                  className="block text-xs font-semibold text-[#0B1220] mb-1.5"
                >
                  Official Portal Used
                </label>
                <select
                  id="confirm-portal-select"
                  value={selectedPortalUrl}
                  onChange={(e) => {
                    const url = e.target.value;
                    setSelectedPortalUrl(url);
                    const matched = AUTHORITY_OPTIONS.find((o) => o.officialUrl === url);
                    if (matched) {
                      setSelectedPortalName(matched.authorityName);
                    }
                  }}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-[#0B1220] focus:outline-none focus:border-[#2563EB]"
                >
                  {AUTHORITY_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.officialUrl}>
                      {opt.authorityName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-4">
                <label
                  htmlFor="confirm-ack-number"
                  className="block text-xs font-semibold text-[#0B1220] mb-1.5"
                >
                  Official Acknowledgement / Reference Number *
                </label>
                <input
                  id="confirm-ack-number"
                  type="text"
                  required
                  value={ackNumberInput}
                  onChange={(e) => setAckNumberInput(e.target.value)}
                  placeholder="e.g., 2081026004912 (User-provided)"
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg text-[#0B1220] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="md:col-span-3">
                <label
                  htmlFor="confirm-submission-date"
                  className="block text-xs font-semibold text-[#0B1220] mb-1.5"
                >
                  Submission Date *
                </label>
                <input
                  id="confirm-submission-date"
                  type="date"
                  required
                  value={submissionDateInput}
                  onChange={(e) => setSubmissionDateInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg text-[#0B1220] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="md:col-span-12">
                <label
                  htmlFor="confirm-notes"
                  className="block text-xs font-semibold text-[#0B1220] mb-1.5"
                >
                  Optional Filing Notes (Police Station / State Nodal Cell / Follow-up Details)
                </label>
                <input
                  id="confirm-notes"
                  type="text"
                  value={userNotesInput}
                  onChange={(e) => setUserNotesInput(e.target.value)}
                  placeholder="Optional notes from your official submission receipt..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-[#0B1220] focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save to KAVACH Case Record</span>
                </button>

                <a
                  href="https://www.cybercrime.gov.in/Webform/chkackstatus.aspx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0B1220] bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <span>Open Official Complaint Tracking Page</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#2563EB]" />
                </a>
              </div>

              <button
                type="button"
                onClick={() => onNavigateTab('track-case')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline cursor-pointer"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>View Full Multi-Track Case Log</span>
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
};
