import { jsPDF } from 'jspdf';
import { formatResolutionLabel } from '../data/demoIncident';
import { IncidentRecord, SubmissionArchitectureState } from '../types/incident';

export function formatBytes(bytes?: number): string {
  if (bytes === undefined || bytes === null || isNaN(bytes)) return 'N/A';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function describeSubmissionState(state: SubmissionArchitectureState): {
  shortLabel: string;
  explanation: string;
  tier: 'draft' | 'pending-external' | 'user-external' | 'verified-api' | 'failed';
} {
  switch (state) {
    case 'not-submitted':
      return {
        shortLabel: 'Not Submitted (Initial Draft)',
        explanation: 'Initial record not yet submitted to any external portal.',
        tier: 'draft',
      };
    case 'kavach-draft':
      return {
        shortLabel: 'Saved in KAVACH Account (Not Filed Externally)',
        explanation:
          'Stored in your private KAVACH account. Not submitted to police, cybercrime.gov.in, or any external authority.',
        tier: 'draft',
      };
    case 'awaiting-external-action':
      return {
        shortLabel: 'Awaiting Citizen Filing on Official Portal',
        explanation:
          'Report prepared in KAVACH; complete official filing directly on the relevant government website.',
        tier: 'pending-external',
      };
    case 'user-confirmed-external':
      return {
        shortLabel: 'User-Recorded Official Portal Filing (User-Provided)',
        explanation:
          'Citizen manually recorded official complaint details after submitting on an external government portal.',
        tier: 'user-external',
      };
    case 'verified-integration':
      return {
        shortLabel: 'Verified via Authorized API Integration',
        explanation:
          'Submission confirmed by a genuine server-to-server response from an authorized integration.',
        tier: 'verified-api',
      };
    case 'submission-failed':
      return {
        shortLabel: 'External Submission Pending — Download PDF & File Manually',
        explanation:
          'Download this PDF report and submit directly on the official government portal.',
        tier: 'failed',
      };
  }
}

export function getKavachReportStatus(incident: IncidentRecord): {
  label: string;
  detail: string;
  isReady: boolean;
} {
  const isReady = incident.kavachStatus !== 'Draft';
  return {
    label: incident.kavachStatus,
    detail: isReady ? 'Prepared in KAVACH Workspace' : 'Draft in Progress',
    isReady,
  };
}

export function getOfficialComplaintStatus(incident: IncidentRecord): {
  label: string;
  verificationLabel: string;
  state: 'not-submitted' | 'portal-opened' | 'user-provided' | 'verified-integration';
  acknowledgementNumber: string;
  submissionDate: string;
} {
  const ack = (incident.officialTracking.acknowledgementNumber || '').trim();
  const subDate = (incident.officialTracking.submissionDate || '').trim();

  if (incident.submissionState === 'verified-integration' && incident.officialTracking.isLiveVerified) {
    return {
      label: ack ? `Officially Submitted (Ref: ${ack})` : 'Officially Submitted',
      verificationLabel: 'Verified by authorized official integration',
      state: 'verified-integration',
      acknowledgementNumber: ack,
      submissionDate: subDate,
    };
  }

  if (incident.officialTracking.submittedExternally || Boolean(ack)) {
    return {
      label: ack
        ? `Submitted Externally — Official Ack: ${ack}`
        : 'Submitted on Official Portal (User-Recorded)',
      verificationLabel: 'User-provided record — not verified by an official government API',
      state: 'user-provided',
      acknowledgementNumber: ack,
      submissionDate: subDate,
    };
  }

  return {
    label: 'Not Yet Submitted on Official Portal',
    verificationLabel: 'No external official complaint details recorded yet',
    state: 'not-submitted',
    acknowledgementNumber: '',
    submissionDate: '',
  };
}

export function sortTimelineChronologically<T extends { date: string; time: string }>(
  events: T[]
): T[] {
  return [...events].sort((a, b) => {
    const dateA = a.date || '9999-99-99';
    const dateB = b.date || '9999-99-99';
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    const timeA = a.time || '99:99';
    const timeB = b.time || '99:99';
    return timeA.localeCompare(timeB);
  });
}

function formatReadableTimestamp(iso?: string): string {
  if (!iso) return 'Not recorded';
  const parsed = new Date(iso);
  if (isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function generatePlainTextReport(incident: IncidentRecord): string {
  const confirmedTimeline = sortTimelineChronologically(
    incident.timeline.filter((t) => t.confirmed)
  );
  const unconfirmedCount = incident.timeline.filter((t) => !t.confirmed).length;

  const lines: string[] = [
    '========================================================================',
    'KAVACH — STRUCTURED INCIDENT DOCUMENTATION REPORT',
    'DISCLAIMER: KAVACH IS A DOCUMENTATION & REPORTING-ASSISTANCE PLATFORM,',
    'NOT AN OFFICIAL GOVERNMENT OR POLICE CONFIRMATION.',
    '========================================================================',
    '',
    `Permanent KAVACH Case ID  : ${incident.caseCode} (Internal KAVACH Reference — Not an Official Police Number)`,
    `Current KAVACH Status     : ${incident.kavachStatus}`,
    `Case Created Timestamp    : ${formatReadableTimestamp(incident.createdAt)}`,
    `Case Last Updated         : ${formatReadableTimestamp(incident.updatedAt)}`,
    `PDF / Report Exported At  : ${formatReadableTimestamp(new Date().toISOString())}`,
    `Incident Title            : ${incident.title || 'Untitled Incident'}`,
    `Category & Urgency        : ${incident.category.toUpperCase()} | Urgency: ${incident.urgencyLevel}`,
    `Platform / Service        : ${incident.platform || 'Not specified'}`,
    `Incident Location         : ${incident.location || 'Not provided'}`,
    `People / Orgs Involved    : ${incident.peopleInvolved || 'Not specified'}`,
    `Incident Date & Time      : ${incident.date || 'Not specified'} ${incident.time || '(Time not specified)'} ${incident.timezone ? `(${incident.timezone})` : ''}`.trim(),
    '',
    '------------------------------------------------------------------------',
    '1. REVIEWED AI / STRUCTURED INCIDENT REPORT',
    '------------------------------------------------------------------------',
    incident.structuredReport?.editableFullReportText?.trim() ||
      incident.aiSummary.trim() ||
      incident.description.trim() ||
      'No summary text provided.',
    '',
    '------------------------------------------------------------------------',
    '2. USER-PROVIDED INCIDENT DETAILS & NOTES',
    '------------------------------------------------------------------------',
    incident.description.trim() || 'No description entered.',
    ...(incident.peopleInvolved?.trim()
      ? ['', `People / Organizations Involved: ${incident.peopleInvolved.trim()}`]
      : []),
    ...(incident.additionalNotes.trim()
      ? ['', 'Additional User Notes:', incident.additionalNotes.trim()]
      : []),
    '',
    '------------------------------------------------------------------------',
    `3. CHRONOLOGICAL TIMELINE (${confirmedTimeline.length} Confirmed Events)`,
    '------------------------------------------------------------------------',
    ...(confirmedTimeline.length > 0
      ? confirmedTimeline.map((ev, idx) => {
          const timeText = ev.time
            ? ev.timeApproximate
              ? `${ev.time} (Approximate)`
              : ev.time
            : 'Time Unknown / Approximate';
          const linkedIdx = ev.linkedEvidenceId
            ? incident.evidence.findIndex((item) => item.id === ev.linkedEvidenceId)
            : -1;
          const evRef =
            linkedIdx >= 0 ? ` [Related Evidence: EV-${String(linkedIdx + 1).padStart(2, '0')}]` : '';
          return `${idx + 1}. [${ev.date || 'Date Unspecified'} · ${timeText}] ${ev.title}${evRef}\n   ${ev.description}`;
        })
      : ['No confirmed timeline events recorded.']),
    ...(unconfirmedCount > 0
      ? [
          '',
          `Note: ${unconfirmedCount} unconfirmed AI-suggested timeline item(s) were excluded pending user review.`,
        ]
      : []),
    '',
    '------------------------------------------------------------------------',
    `4. EVIDENCE INVENTORY (${incident.evidence.length} Items)`,
    '------------------------------------------------------------------------',
    'Note: Evidence authenticity and legal validity are NOT verified by AI or KAVACH.',
    ...(incident.evidence.length > 0
      ? incident.evidence.map((ev, idx) => {
          const refText =
            ev.fileReference ||
            ev.sourceUrl ||
            (ev.fileSizeBytes ? `Uploaded (${formatBytes(ev.fileSizeBytes)})` : 'Manual Entry');
          const addedDate = ev.createdAt ? ev.createdAt.slice(0, 10) : 'Recorded';
          return `${idx + 1}. ${ev.fileName} [${ev.recordKind || ev.fileType}]\n   Captured: ${ev.capturedAt || 'Unknown'} | File Ref/URL: ${refText} | Date Added: ${addedDate}\n   Description: ${ev.description}`;
        })
      : ['No evidence items logged.']),
    '',
    '------------------------------------------------------------------------',
    `5. MISSING INFORMATION & EVIDENCE CHECKLIST (${incident.missingInfoQuestions.length} Items)`,
    '------------------------------------------------------------------------',
    ...(incident.missingInfoQuestions.length > 0
      ? incident.missingInfoQuestions.map(
          (q, idx) =>
            `${idx + 1}. [${formatResolutionLabel(q.resolutionState, q.status)}] (${q.category}) ${q.question}${q.userAnswer ? `\n   User Note: ${q.userAnswer}` : ''}`
        )
      : ['No missing-information review items recorded yet.']),
    '',
    '------------------------------------------------------------------------',
    '6. USER-PROVIDED OFFICIAL COMPLAINT NOTES (SEPARATE FROM KAVACH CASE ID)',
    '------------------------------------------------------------------------',
    ...(incident.officialTracking.submittedExternally ||
    incident.officialTracking.acknowledgementNumber.trim()
      ? [
          `Official Portal Used           : ${incident.officialTracking.authorityOrPortal || 'Not specified'}`,
          `Official Complaint / Ack #     : ${incident.officialTracking.acknowledgementNumber || 'Not recorded'} (User-provided, unverified)`,
          `Date Submitted on Portal       : ${incident.officialTracking.submissionDate || 'Not recorded'}`,
          `User Official Complaint Notes  : ${incident.officialTracking.userNotes || 'None'}`,
        ]
      : ['No external official portal submission details have been recorded by the user yet.']),
    '',
    '========================================================================',
    'END OF KAVACH REPORT — REVIEW ALL FACTS PRIOR TO OFFICIAL SUBMISSION',
    '========================================================================',
  ];

  return lines.join('\n');
}

export function buildIncidentPdfDocument(incident: IncidentRecord): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 44;
  const contentWidth = pageWidth - marginX * 2;
  let cursorY = 0;

  const ensureSpace = (neededHeight: number) => {
    if (cursorY + neededHeight > pageHeight - 56) {
      doc.addPage();
      cursorY = 48;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `KAVACH Incident Documentation · Case ID: ${incident.caseCode} · Not an Official Government Confirmation`,
        marginX,
        28
      );
      doc.setDrawColor(226, 232, 240);
      doc.line(marginX, 34, pageWidth - marginX, 34);
    }
  };

  // Top Midnight-Navy Header Band (#081124)
  doc.setFillColor(8, 17, 36);
  doc.rect(0, 0, pageWidth, 94, 'F');

  // Blue Shield Emblem Vector in Header
  doc.setFillColor(37, 99, 235);
  doc.setDrawColor(103, 232, 249);
  doc.setLineWidth(1.2);
  doc.roundedRect(marginX, 22, 26, 30, 5, 5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('K', marginX + 13, 41, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.setTextColor(255, 255, 255);
  doc.text('KAVACH', marginX + 36, 37);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.2);
  doc.setTextColor(203, 213, 225);
  doc.text('Incident Documentation & Evidence Report', marginX + 36, 52);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Internal Reference Only — Not an Official Police or Government Filing Number`,
    marginX,
    74
  );

  // Permanent KAVACH Case ID on Right
  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(34, 211, 238);
  doc.text(`CASE ID: ${incident.caseCode}`, pageWidth - marginX, 36, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(191, 219, 254);
  doc.text(`KAVACH Status: ${incident.kavachStatus}`, pageWidth - marginX, 52, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Exported: ${formatReadableTimestamp(new Date().toISOString())}`,
    pageWidth - marginX,
    68,
    { align: 'right' }
  );

  cursorY = 110;

  // Mandatory Clear Disclaimer Box (Requirement #9)
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(147, 197, 253);
  doc.roundedRect(marginX, cursorY, contentWidth, 46, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.4);
  doc.setTextColor(30, 58, 138);
  doc.text(
    'IMPORTANT NOTICE: KAVACH DOCUMENTATION & REPORTING-ASSISTANCE RECORD',
    marginX + 10,
    cursorY + 15
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(30, 64, 175);
  const disclaimerText =
    'KAVACH is a citizen documentation and reporting-assistance platform and NOT an official government or police confirmation. Neither KAVACH nor its AI tools verify evidence authenticity or submit complaints on your behalf.';
  const wrappedDisclaimer = doc.splitTextToSize(disclaimerText, contentWidth - 20);
  doc.text(wrappedDisclaimer, marginX + 10, cursorY + 27);

  cursorY += 62;

  // Case Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  const wrappedTitle = doc.splitTextToSize(incident.title || 'Untitled Case', contentWidth);
  doc.text(wrappedTitle, marginX, cursorY);
  cursorY += wrappedTitle.length * 17 + 8;

  // Structured Metadata Grid (Includes Created & Updated Timestamps, Location, Category, Status)
  const metaBoxH = 88;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, cursorY, contentWidth, metaBoxH, 4, 4, 'FD');

  const colW = contentWidth / 2;
  doc.setFontSize(8.2);

  const drawMetaPair = (x: number, y: number, label: string, value: string, maxChars = 34) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(label, x, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(value.slice(0, maxChars), x + 94, y);
  };

  drawMetaPair(marginX + 10, cursorY + 18, 'KAVACH Case ID:', incident.caseCode);
  drawMetaPair(
    marginX + 10,
    cursorY + 35,
    'Category:',
    `${incident.category.charAt(0).toUpperCase() + incident.category.slice(1)} (${incident.urgencyLevel})`
  );
  drawMetaPair(marginX + 10, cursorY + 52, 'Platform / Service:', incident.platform || 'Not specified');
  drawMetaPair(marginX + 10, cursorY + 69, 'Location:', incident.location || 'Not provided');

  drawMetaPair(
    marginX + colW + 8,
    cursorY + 18,
    'Incident Date/Time:',
    `${incident.date || 'Unspecified'} ${incident.time || ''}`.trim()
  );
  drawMetaPair(marginX + colW + 8, cursorY + 35, 'Case Status:', incident.kavachStatus);
  drawMetaPair(
    marginX + colW + 8,
    cursorY + 52,
    'Created At:',
    formatReadableTimestamp(incident.createdAt)
  );
  drawMetaPair(
    marginX + colW + 8,
    cursorY + 69,
    'Last Updated:',
    formatReadableTimestamp(incident.updatedAt)
  );

  cursorY += metaBoxH + 20;

  const drawSectionHeader = (num: string, heading: string) => {
    ensureSpace(34);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(29, 78, 216);
    doc.text(`${num}. ${heading}`, marginX, cursorY);
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, cursorY + 6, pageWidth - marginX, cursorY + 6);
    cursorY += 20;
  };

  const writeParagraph = (
    text: string,
    fontSize = 9.2,
    color: [number, number, number] = [30, 41, 59]
  ) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);
    const paragraphs = text.split('\n');
    for (const para of paragraphs) {
      if (!para.trim()) {
        cursorY += 5;
        continue;
      }
      const lines = doc.splitTextToSize(para, contentWidth);
      ensureSpace(lines.length * (fontSize + 4) + 6);
      doc.text(lines, marginX, cursorY);
      cursorY += lines.length * (fontSize + 4) + 4;
    }
  };

  // 01. Incident Details & User-Provided Account
  drawSectionHeader('01', 'Incident Details & User-Provided Account');
  writeParagraph(incident.description.trim() || 'No incident description provided.');
  if (incident.peopleInvolved?.trim()) {
    cursorY += 3;
    writeParagraph(
      `People or Organizations Involved (User-Provided): ${incident.peopleInvolved.trim()}`,
      8.8,
      [51, 65, 85]
    );
  }
  if (incident.additionalNotes.trim()) {
    cursorY += 3;
    writeParagraph(`Additional Notes: ${incident.additionalNotes.trim()}`, 8.8, [71, 85, 105]);
  }
  cursorY += 8;

  // 02. Reviewed AI / Structured Report Summary
  drawSectionHeader('02', 'Reviewed Incident Overview & Structured AI Report');
  if (incident.structuredReport?.editableFullReportText?.trim()) {
    writeParagraph(incident.structuredReport.editableFullReportText.trim(), 8.7, [30, 41, 59]);
  } else {
    writeParagraph(
      incident.aiSummary.trim() ||
        'No separate AI-assisted report saved yet; refer to Section 01 for the user-provided account.'
    );
  }
  cursorY += 8;

  // 03. Chronological Timeline
  const confirmedTimeline = sortTimelineChronologically(
    incident.timeline.filter((t) => t.confirmed)
  );
  drawSectionHeader('03', `Chronological Timeline (${confirmedTimeline.length} Confirmed Events)`);

  if (confirmedTimeline.length === 0) {
    writeParagraph('No confirmed timeline events recorded yet.', 8.8, [100, 116, 139]);
  } else {
    for (const ev of confirmedTimeline) {
      const linkedIdx = ev.linkedEvidenceId
        ? incident.evidence.findIndex((item) => item.id === ev.linkedEvidenceId)
        : -1;
      const evSuffix =
        linkedIdx >= 0 ? ` [Related Evidence: EV-${String(linkedIdx + 1).padStart(2, '0')}]` : '';
      const descLines = doc.splitTextToSize(
        `${ev.description || ''}${evSuffix}`.trim(),
        contentWidth - 110
      );
      const rowHeight = Math.max(24, descLines.length * 12 + 16);
      ensureSpace(rowHeight + 8);

      const timeDisplay = ev.time
        ? ev.timeApproximate
          ? `${ev.time} (Approx)`
          : ev.time
        : 'Time Unknown';

      doc.setFont('courier', 'bold');
      doc.setFontSize(8.1);
      doc.setTextColor(37, 99, 235);
      doc.text(`${ev.date || 'Date Unknown'}\n${timeDisplay}`, marginX, cursorY);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.2);
      doc.setTextColor(15, 23, 42);
      const titleLines = doc.splitTextToSize(ev.title, contentWidth - 100);
      doc.text(titleLines, marginX + 96, cursorY);

      const titleOffset = titleLines.length * 12 + 2;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.6);
      doc.setTextColor(71, 85, 105);
      doc.text(descLines, marginX + 96, cursorY + titleOffset);

      cursorY += titleOffset + descLines.length * 12 + 10;
    }
  }
  cursorY += 8;

  // 04. Evidence Inventory
  drawSectionHeader('04', `Evidence Inventory (${incident.evidence.length} Items)`);
  if (incident.evidence.length === 0) {
    writeParagraph('No evidence items logged yet.', 8.8, [100, 116, 139]);
  } else {
    incident.evidence.forEach((ev, index) => {
      const refLabel =
        ev.fileReference ||
        ev.sourceUrl ||
        (ev.fileSizeBytes ? formatBytes(ev.fileSizeBytes) : 'Manual Entry');
      const addedLabel = ev.createdAt ? ev.createdAt.slice(0, 10) : 'Recorded';
      const metaLine = `Type: ${ev.recordKind || ev.fileType} · Captured: ${ev.capturedAt || 'Unknown'} · Ref: ${refLabel} · Added: ${addedLabel}`;
      const noteLines = doc.splitTextToSize(
        ev.description || 'No description entered.',
        contentWidth - 20
      );
      const boxHeight = 36 + noteLines.length * 11.5;

      ensureSpace(boxHeight + 8);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(marginX, cursorY, contentWidth, boxHeight, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.8);
      doc.setTextColor(15, 23, 42);
      doc.text(
        `EV-${String(index + 1).padStart(2, '0')}  ${ev.fileName.slice(0, 74)}`,
        marginX + 10,
        cursorY + 14
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.6);
      doc.setTextColor(100, 116, 139);
      doc.text(metaLine.slice(0, 112), marginX + 10, cursorY + 25);

      doc.setFontSize(8.4);
      doc.setTextColor(51, 65, 85);
      doc.text(noteLines, marginX + 10, cursorY + 37);

      cursorY += boxHeight + 7;
    });
  }
  cursorY += 8;

  // 05. Missing-Information & Evidence Checklist Status
  drawSectionHeader(
    '05',
    `Missing-Information & Evidence Checklist (${incident.missingInfoQuestions.length} Items)`
  );
  if (incident.missingInfoQuestions.length === 0) {
    writeParagraph('No missing-information checklist items generated yet.', 8.8, [100, 116, 139]);
  } else {
    for (const q of incident.missingInfoQuestions) {
      const label = formatResolutionLabel(q.resolutionState, q.status);
      const notePart = q.userAnswer?.trim() ? ` (Note: ${q.userAnswer.trim()})` : '';
      writeParagraph(`• [${label}] ${q.question}${notePart}`, 8.5, [51, 65, 85]);
    }
  }
  cursorY += 8;

  // 06. Optional User-Provided Official Complaint Notes
  drawSectionHeader('06', 'User-Provided Official Complaint Details (Optional)');
  const hasOfficial =
    incident.officialTracking.submittedExternally ||
    Boolean(incident.officialTracking.acknowledgementNumber.trim());

  if (!hasOfficial) {
    writeParagraph(
      'No external official portal filing details have been recorded by the user at the time of export.',
      8.8,
      [100, 116, 139]
    );
  } else {
    writeParagraph(
      `Portal Used: ${incident.officialTracking.authorityOrPortal || 'Not specified'}\n` +
        `User-Entered Official Complaint / Ack Number: ${incident.officialTracking.acknowledgementNumber || 'Not entered'} (Separate from KAVACH Case ID; user-provided)\n` +
        `Date Submitted: ${incident.officialTracking.submissionDate || 'Not entered'}\n` +
        `Notes: ${incident.officialTracking.userNotes || 'None'}`,
      8.8,
      [30, 41, 59]
    );
  }

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, pageHeight - 38, pageWidth - marginX, pageHeight - 38);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.6);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `KAVACH Case ID: ${incident.caseCode} · Citizen Documentation Platform · Not an Official Government Confirmation`,
      marginX,
      pageHeight - 24
    );
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - marginX, pageHeight - 24, {
      align: 'right',
    });
  }

  return doc;
}

export function downloadIncidentPdf(incident: IncidentRecord): void {
  const doc = buildIncidentPdfDocument(incident);
  const safeSlug = (incident.caseCode || 'kavach-case')
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-');
  doc.save(`${safeSlug}-report.pdf`);
}

export function triggerFileDownload(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
