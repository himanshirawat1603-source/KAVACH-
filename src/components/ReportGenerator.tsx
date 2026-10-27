import React, { useState, useMemo } from 'react';
import {
  Download,
  FileText,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Edit3,
} from 'lucide-react';
import { IncidentRecord, WorkspaceTab } from '../types/incident';
import {
  describeSubmissionState,
  downloadIncidentPdf,
  formatBytes,
  generatePlainTextReport,
  sortTimelineChronologically,
  triggerFileDownload,
} from '../utils/pdfGenerator';

interface ReportGeneratorProps {
  incident: IncidentRecord;
  onToggleReadyStatus: () => void;
  onNavigateTab: (tab: WorkspaceTab) => void;
  onLogPdfDownload: (inc: IncidentRecord) => void;
}

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  incident,
  onToggleReadyStatus,
  onNavigateTab,
  onLogPdfDownload,
}) => {
  const [downloadToast, setDownloadToast] = useState<string | null>(null);
  const [userReviewedCheck, setUserReviewedCheck] = useState(
    incident.status === 'ready-for-review'
  );

  const confirmedTimeline = useMemo(
    () => sortTimelineChronologically(incident.timeline.filter((t) => t.confirmed)),
    [incident.timeline]
  );

  const unconfirmedCount = useMemo(
    () => incident.timeline.filter((t) => !t.confirmed).length,
    [incident.timeline]
  );

  const openQuestions = useMemo(
    () => incident.missingInfoQuestions.filter((q) => q.status === 'open'),
    [incident.missingInfoQuestions]
  );

  const answeredQuestions = useMemo(
    () =>
      incident.missingInfoQuestions.filter(
        (q) => q.status === 'answered' && q.userAnswer.trim().length > 0
      ),
    [incident.missingInfoQuestions]
  );

  const submissionInfo = describeSubmissionState(incident.submissionState);

  const notifyDownload = (label: string) => {
    setDownloadToast(label);
    setTimeout(() => setDownloadToast(null), 4000);
  };

  const handleDownloadPdf = () => {
    downloadIncidentPdf(incident);
    onLogPdfDownload(incident);
    notifyDownload(`Downloaded ${incident.caseCode.toLowerCase()}-kavach-report.pdf`);
  };

  const handleDownloadTxt = () => {
    const txt = generatePlainTextReport(incident);
    const safeSlug = incident.caseCode.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    triggerFileDownload(txt, `${safeSlug}-kavach-report.txt`, 'text/plain;charset=utf-8');
    notifyDownload(`Downloaded ${safeSlug}-kavach-report.txt`);
  };

  const handleDownloadJson = () => {
    const safeSlug = incident.caseCode.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    const jsonPayload = JSON.stringify(
      {
        exportNotice: 'USER-PREPARED KAVACH INCIDENT RECORD — REQUIRES HUMAN REVIEW',
        exportedAt: new Date().toISOString(),
        incident: {
          ...incident,
          evidence: incident.evidence.map(({ previewDataUrl: _omit, ...rest }) => rest),
        },
      },
      null,
      2
    );
    triggerFileDownload(jsonPayload, `${safeSlug}-record.json`, 'application/json');
    notifyDownload(`Exported ${safeSlug}-record.json`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-[#2563EB] tabular-nums">
            Structured Incident Report · Case {incident.caseCode}
          </p>
          <h1 className="font-display text-2xl font-bold text-[#0B1220] tracking-tight mt-0.5">
            Review Structured Report &amp; Download PDF
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Verify all user-supplied details below, download your PDF dossier, and proceed to Find
            the Right Help when ready.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF Report</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadTxt}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-slate-600" />
            <span>Download .TXT</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadJson}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileJson className="w-4 h-4 text-slate-600" />
            <span>Export .JSON</span>
          </button>
        </div>
      </div>

      {downloadToast && (
        <div
          role="status"
          className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-2.5 text-xs font-medium text-emerald-900"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{downloadToast}</span>
        </div>
      )}

      {/* User Review Attestation Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={userReviewedCheck}
            onChange={(e) => {
              setUserReviewedCheck(e.target.checked);
              if (
                (e.target.checked && incident.status !== 'ready-for-review') ||
                (!e.target.checked && incident.status === 'ready-for-review')
              ) {
                onToggleReadyStatus();
              }
            }}
            className="mt-0.5 w-4 h-4 accent-[#2563EB] rounded"
          />
          <span className="text-xs text-slate-700 leading-relaxed">
            <strong className="font-semibold text-[#0B1220]">Mark Report Prepared:</strong> I have
            reviewed the summary, timeline, witness notes, and evidence index below to confirm they
            reflect my own statements accurately.
          </span>
        </label>

        <span className="text-xs font-medium text-slate-500 whitespace-nowrap shrink-0">
          Submission State:{' '}
          <strong className="text-[#0B1220]">{submissionInfo.shortLabel}</strong>
        </span>
      </div>

      {/* Structured Document Sheet */}
      <article className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-[#0B1220] text-white px-6 sm:px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="font-display text-lg font-bold tracking-tight text-white">KAVACH</p>
            <p className="text-xs text-slate-300 mt-0.5">
              User-Prepared Safety Incident Documentation Dossier
            </p>
          </div>
          <div className="sm:text-right font-mono text-xs tabular-nums">
            <p className="text-[#22D3EE] font-semibold">INCIDENT REF: {incident.caseCode}</p>
            <p className="text-slate-400 mt-0.5">
              Internal State: {incident.internalTracking.currentStatus}
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-950 leading-relaxed space-y-1">
              <p className="font-bold">
                USER-PREPARED INCIDENT REPORT — REQUIRES INDEPENDENT REVIEW
              </p>
              <p>
                {incident.isDemo
                  ? 'FICTIONAL DEMO RECORD: All names, handles, and events in this sample case are fictional for demonstration purposes. '
                  : ''}
                This document organizes user-entered facts and file descriptions. Neither KAVACH
                nor AI verifies evidence authenticity, legal validity, or official government
                receipt.
              </p>
            </div>
          </div>

          {/* 01. Incident Details */}
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-2">
              <h2 className="font-display text-base font-bold text-[#0B1220]">
                01. Incident Details &amp; Voluntary Witnesses
              </h2>
              <button
                type="button"
                onClick={() => onNavigateTab('incident-details')}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#2563EB] hover:underline cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Details</span>
              </button>
            </div>

            <h3 className="font-display text-xl font-bold text-[#0B1220]">
              {incident.title || 'Untitled Incident'}
            </h3>

            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-[#F8FAFC] border border-slate-200 rounded-lg p-4 text-xs">
              <div>
                <dt className="text-slate-500 font-medium">Category &amp; Urgency</dt>
                <dd className="font-semibold text-[#0B1220] capitalize mt-0.5">
                  {incident.category} · {incident.urgencyLevel}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 font-medium">Platform / Location</dt>
                <dd className="font-semibold text-[#0B1220] mt-0.5">
                  {incident.platform || 'Not specified'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 font-medium">Date &amp; Approximate Time</dt>
                <dd className="font-mono font-semibold text-[#0B1220] tabular-nums mt-0.5">
                  {incident.date || 'Unspecified'} {incident.time || ''}{' '}
                  {incident.timezone ? `(${incident.timezone})` : ''}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 font-medium">Submission State</dt>
                <dd className="font-semibold text-[#0B1220] mt-0.5">
                  {submissionInfo.shortLabel}
                </dd>
              </div>
            </dl>

            {incident.witnesses.length > 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-xs font-semibold text-[#0B1220]">
                  Voluntarily Recorded Witness Information ({incident.witnesses.length}):
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {incident.witnesses.map((w) => (
                    <div
                      key={w.id}
                      className="bg-[#F8FAFC] border border-slate-200 rounded-lg p-3 text-xs"
                    >
                      <p className="font-semibold text-[#0B1220]">
                        {w.nameOrAlias}{' '}
                        {w.relationOrContext && (
                          <span className="font-normal text-slate-500">
                            · {w.relationOrContext}
                          </span>
                        )}
                      </p>
                      <p className="text-slate-600 mt-1">{w.observationNote}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* 02. Reviewed Summary */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-2">
              <h2 className="font-display text-base font-bold text-[#0B1220]">
                02. Reviewed Incident Summary
              </h2>
              <button
                type="button"
                onClick={() => onNavigateTab('ai-assistant')}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#2563EB] hover:underline cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Summary</span>
              </button>
            </div>

            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {incident.aiSummary.trim() ||
                incident.description.trim() ||
                'No summary entered yet.'}
            </div>

            {answeredQuestions.length > 0 && (
              <div className="pt-3 space-y-2">
                <p className="text-xs font-semibold text-[#0B1220]">
                  User-Provided Factual Clarifications:
                </p>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {answeredQuestions.map((qa) => (
                    <li
                      key={qa.id}
                      className="bg-[#F8FAFC] border border-slate-200 rounded-lg p-3"
                    >
                      <span className="font-semibold text-[#0B1220]">{qa.question}</span>
                      <p className="text-slate-600 mt-0.5">{qa.userAnswer}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* 03. Chronological Timeline */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-2">
              <h2 className="font-display text-base font-bold text-[#0B1220]">
                03. Chronological Timeline ({confirmedTimeline.length} Confirmed Events)
              </h2>
              <button
                type="button"
                onClick={() => onNavigateTab('timeline')}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#2563EB] hover:underline cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Manage Timeline</span>
              </button>
            </div>

            {confirmedTimeline.length === 0 ? (
              <p className="text-xs text-slate-500">No confirmed timeline events recorded.</p>
            ) : (
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                {confirmedTimeline.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3.5 bg-white grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 text-xs"
                  >
                    <div className="sm:col-span-3 font-mono font-semibold text-[#2563EB] tabular-nums">
                      {ev.date || 'No Date'} {ev.time || '--:--'}
                    </div>
                    <div className="sm:col-span-9">
                      <p className="font-semibold text-[#0B1220] text-sm">{ev.title}</p>
                      <p className="text-slate-600 mt-0.5 leading-relaxed">{ev.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {unconfirmedCount > 0 && (
              <p className="text-xs text-amber-800">
                Note: {unconfirmedCount} unconfirmed AI-suggested timeline{' '}
                {unconfirmedCount === 1 ? 'entry was' : 'entries were'} excluded pending citizen
                verification.
              </p>
            )}
          </section>

          {/* 04. Evidence Index */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-2">
              <h2 className="font-display text-base font-bold text-[#0B1220]">
                04. Evidence Index ({incident.evidence.length} Items)
              </h2>
              <button
                type="button"
                onClick={() => onNavigateTab('evidence')}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#2563EB] hover:underline cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Manage Evidence</span>
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Disclaimer: File authenticity and legal validity are not verified by KAVACH or AI.
            </p>

            {incident.evidence.length === 0 ? (
              <p className="text-xs text-slate-500">No evidence items cataloged.</p>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600">
                      <th className="py-2.5 px-3 font-semibold">Ref</th>
                      <th className="py-2.5 px-3 font-semibold">File / URL / Reference</th>
                      <th className="py-2.5 px-3 font-semibold">Kind &amp; Size</th>
                      <th className="py-2.5 px-3 font-semibold">Storage Scope</th>
                      <th className="py-2.5 px-3 font-semibold">User Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {incident.evidence.map((ev, index) => (
                      <tr key={ev.id} className="align-top">
                        <td className="py-3 px-3 font-mono text-slate-500 tabular-nums">
                          EV-{String(index + 1).padStart(2, '0')}
                        </td>
                        <td className="py-3 px-3 font-medium text-[#0B1220] break-all max-w-[200px]">
                          {ev.fileName}
                          {ev.sourceUrl && (
                            <span className="block font-mono text-[11px] text-slate-500 mt-0.5">
                              {ev.sourceUrl}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600 tabular-nums whitespace-nowrap">
                          {ev.recordKind || ev.fileType}
                          {ev.fileSizeBytes !== undefined && (
                            <span className="block text-slate-400">
                              {formatBytes(ev.fileSizeBytes)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-700 max-w-[180px]">
                          {ev.storageIndicator || ev.uploadStatus}
                        </td>
                        <td className="py-3 px-3 text-slate-600 leading-relaxed min-w-[200px]">
                          {ev.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 05. Missing Information */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-2">
              <h2 className="font-display text-base font-bold text-[#0B1220]">
                05. Missing or Unclear Details ({openQuestions.length})
              </h2>
              <button
                type="button"
                onClick={() => onNavigateTab('ai-assistant')}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#2563EB] hover:underline cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Answer Questions</span>
              </button>
            </div>

            {openQuestions.length === 0 ? (
              <p className="text-xs text-slate-500">
                No open missing-information questions are flagged at this time.
              </p>
            ) : (
              <ul className="space-y-2 text-xs text-slate-700">
                {openQuestions.map((q, idx) => (
                  <li key={q.id} className="bg-[#F8FAFC] border border-slate-200 rounded-lg p-3.5">
                    <p className="font-semibold text-[#0B1220]">
                      {idx + 1}. [{q.category}] {q.question}
                    </p>
                    <p className="text-slate-500 mt-1">Context: {q.reason}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </article>

      {/* Bottom Workflow Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={() => onNavigateTab('ai-assistant')}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to AI Assistant</span>
        </button>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#2563EB]" />
            <span>Download PDF</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('find-help')}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
          >
            <span>Continue to Find the Right Help</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
