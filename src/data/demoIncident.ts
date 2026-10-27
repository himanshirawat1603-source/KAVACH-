import type {
  ChecklistItemKind,
  ChecklistJumpTarget,
  ChecklistResolutionState,
  IncidentRecord,
  KavachCaseStatus,
  MissingInfoQuestion,
  QuestionResolutionStatus,
  StructuredAiReport,
} from '../types/incident.ts';

export interface LocalAnalysisResult {
  source: 'local-simulated';
  generatedAt: string;
  neutralSummary: string;
  evidenceIndexSummary: string;
  missingInfoQuestions: Omit<MissingInfoQuestion, 'id' | 'status' | 'userAnswer' | 'source'>[];
  suggestedTimelineEvents: {
    date: string;
    time: string;
    title: string;
    description: string;
    rationale: string;
  }[];
}

export function formatResolutionLabel(
  resolutionState?: ChecklistResolutionState,
  legacyStatus?: QuestionResolutionStatus
): string {
  switch (resolutionState) {
    case 'available':
      return 'Provided / Available';
    case 'not-available':
      return 'Marked Not Available by User';
    case 'not-applicable':
      return 'Marked Not Applicable by User';
    case 'add-later':
      return 'Need to Add Later';
    case 'skipped':
      return 'Skipped for Now';
    case 'open':
      return 'Open for Review';
    default:
      if (legacyStatus === 'answered') return 'Provided / Available';
      if (legacyStatus === 'not-applicable') return 'Marked Not Applicable by User';
      return 'Open for Review';
  }
}

export function formatStructuredReportFullText(
  report: Omit<StructuredAiReport, 'editableFullReportText'>
): string {
  const lines: string[] = [
    'KAVACH STRUCTURED INCIDENT DOCUMENTATION REPORT',
    '====================================================================',
    `1. CASE ID: ${report.caseId} (Internal KAVACH Reference — Not an Official Police/Government Number)`,
    `Generated: ${new Date(report.generatedAt).toLocaleString('en-IN')}`,
    'Note: Organized strictly from user-provided statements and logged items. KAVACH does not verify evidence authenticity or make legal conclusions.',
    '',
    '2. INCIDENT OVERVIEW (AI-Organized Neutral Summary of User Input)',
    '--------------------------------------------------------------------',
    report.incidentOverview,
    '',
    '3. INCIDENT DETAILS (User-Provided Record)',
    '--------------------------------------------------------------------',
    report.incidentDetailsSummary,
    '',
    '4. CHRONOLOGICAL ACCOUNT OF EVENTS',
    '--------------------------------------------------------------------',
    report.chronologicalAccount,
    '',
    '5. EVIDENCE INVENTORY (Logged by User — Unverified by KAVACH)',
    '--------------------------------------------------------------------',
    report.evidenceInventorySummary,
    '',
    '6. IMPORTANT FACTS PROVIDED BY THE USER',
    '--------------------------------------------------------------------',
    ...(report.importantUserFacts.length > 0
      ? report.importantUserFacts.map((f, idx) => `${idx + 1}. ${f}`)
      : ['No additional discrete facts recorded beyond the primary description.']),
    '',
    '7. DETAILS THAT REMAIN UNKNOWN OR UNCONFIRMED',
    '--------------------------------------------------------------------',
    ...(report.unknownOrUnconfirmedDetails.length > 0
      ? report.unknownOrUnconfirmedDetails.map((u, idx) => `${idx + 1}. ${u}`)
      : ['All core fields reviewed by user; no unconfirmed gaps flagged.']),
    '',
    '8. MISSING INFORMATION & OPTIONAL EVIDENCE CHECKLIST',
    '--------------------------------------------------------------------',
    ...(report.missingInformationSummary.length > 0
      ? report.missingInformationSummary.map((m, idx) => `${idx + 1}. ${m}`)
      : ['Checklist reviewed by user.']),
    '',
    '9. SUGGESTED NEXT STEPS (Informational Only — Not Legal Advice)',
    '--------------------------------------------------------------------',
    ...report.suggestedNextSteps.map((s, idx) => `${idx + 1}. ${s}`),
  ];

  return lines.join('\n');
}

interface CandidateDefinition {
  fieldKey: string;
  question: string;
  reason: string;
  category: string;
  jumpTarget: ChecklistJumpTarget;
  itemKind: ChecklistItemKind;
  isSatisfiedByData: boolean;
  autoDetectedNote?: string;
}

export function evaluateMissingChecklistCandidates(
  incident: IncidentRecord
): MissingInfoQuestion[] {
  const combinedText = `${incident.title} ${incident.description} ${incident.additionalNotes} ${
    incident.peopleInvolved || ''
  }`.toLowerCase();

  const confirmedEvents = incident.timeline.filter((t) => t.confirmed);
  const hasScreenshotsOrImages = incident.evidence.some(
    (ev) =>
      ev.recordKind === 'Screenshot / Image' ||
      ev.fileType.toLowerCase().startsWith('image/') ||
      /screenshot|screen|photo|image/i.test(`${ev.fileName} ${ev.description}`)
  );
  const hasUrlsOrHandlesInEvidence = incident.evidence.some(
    (ev) =>
      Boolean(ev.sourceUrl?.trim()) ||
      Boolean(ev.fileReference?.trim()) ||
      ev.recordKind === 'URL / Webpage Link'
  );
  const hasChatOrMessageLog = incident.evidence.some(
    (ev) =>
      ev.recordKind === 'Message / Chat Export' ||
      Boolean(ev.textExcerpt?.trim()) ||
      /chat|message|dm|email|whatsapp|sms|telegram/i.test(`${ev.fileName} ${ev.description}`)
  );
  const hasTransactionRecord = incident.evidence.some(
    (ev) =>
      ev.recordKind === 'Transaction / Ticket Reference' ||
      ev.recordKind === 'Document / PDF' ||
      /utr|upi|bank|receipt|transaction|payment|statement|invoice/i.test(
        `${ev.fileName} ${ev.description} ${ev.fileReference || ''}`
      )
  );

  const candidates: CandidateDefinition[] = [
    {
      fieldKey: 'approx_time_and_zone',
      question:
        'Approximate incident time (or confirmation that the exact time is unknown)',
      reason:
        'Helps align screenshots, message headers, or transaction logs chronologically when reviewing the timeline.',
      category: 'Timeline Clarity',
      jumpTarget: 'add-details',
      itemKind: 'unclear-timeline',
      isSatisfiedByData:
        Boolean(incident.time?.trim()) ||
        confirmedEvents.some((ev) => Boolean(ev.time?.trim()) || Boolean(ev.timeApproximate)),
      autoDetectedNote: incident.time?.trim()
        ? `Incident time recorded (${incident.time} ${incident.timezone || ''}).`
        : 'Timeline timestamp preference recorded.',
    },
    {
      fieldKey: 'platform_and_channel',
      question:
        'Specific platform, app, website, or communication channel where the incident occurred',
      reason:
        'Clarifies which platform safety team or reporting portal category applies to this record.',
      category: 'Incident Context',
      jumpTarget: 'add-details',
      itemKind: 'missing-detail',
      isSatisfiedByData: Boolean(incident.platform?.trim()),
      autoDetectedNote: incident.platform?.trim()
        ? `Platform recorded: ${incident.platform.trim()}`
        : undefined,
    },
    {
      fieldKey: 'people_or_accounts_involved',
      question:
        'Account handles, usernames, phone numbers, sender emails, or organizations involved (if known)',
      reason:
        'Display names can change quickly; recording handles, URLs, or sender identifiers preserves context if available.',
      category: 'Identifiers (Optional)',
      jumpTarget: 'add-details',
      itemKind: 'missing-detail',
      isSatisfiedByData:
        Boolean(incident.peopleInvolved?.trim()) ||
        hasUrlsOrHandlesInEvidence ||
        /@[a-z0-9_.-]+|https?:\/\//i.test(combinedText),
      autoDetectedNote: incident.peopleInvolved?.trim()
        ? `Recorded in People / Accounts Involved: ${incident.peopleInvolved.trim()}`
        : 'Identifier or link reference detected in case record.',
    },
    {
      fieldKey: 'supporting_screenshots',
      question:
        'Uncropped screenshots or images showing visible dates, times, and account headers (if available)',
      reason:
        'Optional visual captures help preserve how posts, profiles, or messages appeared before deletion.',
      category: 'Optional Evidence',
      jumpTarget: 'upload-evidence',
      itemKind: 'optional-evidence',
      isSatisfiedByData: hasScreenshotsOrImages,
      autoDetectedNote: 'Screenshot / image evidence logged in Evidence Inventory.',
    },
    {
      fieldKey: 'communication_logs',
      question:
        'Relevant message exports, emails, chat transcripts, or written communication notes (if applicable)',
      reason:
        'Shows the sequence of communications in neutral context without relying on memory alone.',
      category: 'Optional Evidence',
      jumpTarget: 'upload-evidence',
      itemKind: 'optional-evidence',
      isSatisfiedByData: hasChatOrMessageLog,
      autoDetectedNote: 'Communication / message record logged in Evidence Inventory.',
    },
    {
      fieldKey: 'chronological_sequence',
      question:
        'Key chronological timeline events (when the incident first started, key escalations, and actions taken)',
      reason:
        'Reviewers and support portals understand multi-step incidents much faster when events are listed in order.',
      category: 'Chronological Sequence',
      jumpTarget: 'edit-timeline',
      itemKind: 'unclear-timeline',
      isSatisfiedByData: confirmedEvents.length >= 2,
      autoDetectedNote: `${confirmedEvents.length} confirmed chronological events recorded.`,
    },
    {
      fieldKey: 'prior_platform_report_ref',
      question:
        'Whether the incident was reported to the platform/service support team and any ticket/reference ID issued',
      reason:
        'Optional note documenting prior safety/takedown requests already attempted by the user.',
      category: 'Prior Action Check',
      jumpTarget: 'add-details',
      itemKind: 'fact-verification',
      isSatisfiedByData: /ticket|reported to|support id|reference id|complaint id|blocked/i.test(
        `${incident.description} ${incident.additionalNotes}`
      ),
      autoDetectedNote: 'Prior reporting / action context noted in incident details.',
    },
  ];

  if (incident.category === 'online fraud') {
    candidates.splice(3, 0, {
      fieldKey: 'fraud_transaction_refs',
      question:
        'UTR / UPI transaction reference numbers, payment timestamps, bank/wallet alert screenshots, or phishing link details (if applicable)',
      reason:
        'For financial cyber fraud complaints (such as 1930 / cybercrime.gov.in), transaction IDs and timestamps help trace transfers.',
      category: 'Financial Fraud Context (Optional)',
      jumpTarget: 'upload-evidence',
      itemKind: 'optional-evidence',
      isSatisfiedByData:
        hasTransactionRecord || /utr|upi|rs\.?|inr|₹|transaction/i.test(combinedText),
      autoDetectedNote: 'Transaction / financial reference detected in case record.',
    });
  } else if (incident.category === 'impersonation') {
    candidates.splice(3, 0, {
      fieldKey: 'impersonation_profile_url',
      question:
        'Permalink / URL or exact handle of the impersonating profile alongside what content was copied (if available)',
      reason:
        'Platform impersonation forms and cyber cells typically ask for the exact URL of the fake account to distinguish it from your genuine profile.',
      category: 'Impersonation Context (Optional)',
      jumpTarget: 'upload-evidence',
      itemKind: 'optional-evidence',
      isSatisfiedByData: hasUrlsOrHandlesInEvidence,
      autoDetectedNote: 'Profile URL / source reference logged in Evidence Inventory.',
    });
  } else if (incident.category === 'threats') {
    candidates.splice(3, 0, {
      fieldKey: 'threat_safety_location',
      question:
        'Relevant city/jurisdiction location and whether there is any immediate physical safety concern (Dial 112 if in danger)',
      reason:
        'Helps match jurisdiction-appropriate public helplines and clarifies whether urgent emergency assistance is needed.',
      category: 'Safety & Jurisdiction (Optional)',
      jumpTarget: 'add-details',
      itemKind: 'missing-detail',
      isSatisfiedByData: Boolean(incident.location?.trim()),
      autoDetectedNote: incident.location?.trim()
        ? `Location recorded: ${incident.location.trim()}`
        : undefined,
    });
  }

  const existingList = Array.isArray(incident.missingInfoQuestions)
    ? incident.missingInfoQuestions
    : [];

  const merged: MissingInfoQuestion[] = candidates.map((cand, idx) => {
    const prior = existingList.find(
      (q) =>
        (q.fieldKey && q.fieldKey === cand.fieldKey) ||
        q.question.toLowerCase().slice(0, 32) === cand.question.toLowerCase().slice(0, 32)
    );

    if (cand.isSatisfiedByData) {
      return {
        id: prior?.id || `mq-${cand.fieldKey}-${idx}`,
        fieldKey: cand.fieldKey,
        question: cand.question,
        reason: cand.reason,
        category: cand.category,
        status: 'answered',
        resolutionState: 'available',
        jumpTarget: cand.jumpTarget,
        itemKind: cand.itemKind,
        userAnswer: prior?.userAnswer?.trim() || cand.autoDetectedNote || 'Provided in case record.',
        source: prior?.source || 'local-simulated',
      };
    }

    if (prior) {
      const priorRes: ChecklistResolutionState =
        prior.resolutionState ||
        (prior.status === 'answered'
          ? 'available'
          : prior.status === 'not-applicable'
            ? 'not-applicable'
            : 'open');

      return {
        ...prior,
        fieldKey: cand.fieldKey,
        question: cand.question,
        reason: cand.reason,
        category: cand.category,
        jumpTarget: cand.jumpTarget,
        itemKind: cand.itemKind,
        resolutionState: priorRes,
      };
    }

    return {
      id: `mq-${cand.fieldKey}-${Date.now()}-${idx}`,
      fieldKey: cand.fieldKey,
      question: cand.question,
      reason: cand.reason,
      category: cand.category,
      status: 'open',
      resolutionState: 'open',
      jumpTarget: cand.jumpTarget,
      itemKind: cand.itemKind,
      userAnswer: '',
      source: 'local-simulated',
    };
  });

  for (const extra of existingList) {
    const alreadyIncluded = merged.some(
      (m) =>
        (extra.fieldKey && m.fieldKey === extra.fieldKey) ||
        m.id === extra.id ||
        m.question.toLowerCase().slice(0, 32) === extra.question.toLowerCase().slice(0, 32)
    );
    if (!alreadyIncluded && extra.resolutionState && extra.resolutionState !== 'open') {
      merged.push(extra);
    }
  }

  return merged;
}

export function buildClientStructuredReportAndReview(incident: IncidentRecord): {
  structuredReport: StructuredAiReport;
  neutralSummary: string;
  evidenceIndexSummary: string;
  missingInfoQuestions: MissingInfoQuestion[];
  suggestedTimelineEvents: LocalAnalysisResult['suggestedTimelineEvents'];
} {
  const generatedAt = new Date().toISOString();
  const caseId = incident.caseCode || 'KAV-PENDING0';
  const confirmedEvents = [...incident.timeline]
    .filter((t) => t.confirmed)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  const missingInfoQuestions = evaluateMissingChecklistCandidates(incident);

  const dateTimePhrase = incident.date
    ? `${incident.date}${incident.time ? ` at approximately ${incident.time}` : ' (approximate time not specified)'}${
        incident.timezone ? ` [${incident.timezone}]` : ''
      }`
    : 'Date not specified by user';

  const incidentOverview = [
    `This structured documentation report summarizes information supplied by the user under permanent KAVACH Case ID ${caseId} regarding a reported "${incident.category}" incident titled "${incident.title || 'Untitled Incident'}".`,
    `According to the user, the incident was noted on ${dateTimePhrase}${
      incident.platform?.trim() ? ` involving platform/channel "${incident.platform.trim()}"` : ''
    }${incident.location?.trim() ? ` (reported location: ${incident.location.trim()})` : ''}.`,
    `At the time of generation, the user has logged ${incident.evidence.length} evidence ${
      incident.evidence.length === 1 ? 'item' : 'items'
    } and ${confirmedEvents.length} confirmed timeline ${
      confirmedEvents.length === 1 ? 'event' : 'events'
    }. All factual statements originate from user input; KAVACH organizes this record for clarity and does not independently verify facts or evidence authenticity.`,
  ].join(' ');

  const detailLines = [
    `• Incident Title: ${incident.title || 'Not specified'}`,
    `• Category: ${incident.category} | Urgency Selected by User: ${incident.urgencyLevel}`,
    `• Date & Time: ${dateTimePhrase}`,
    `• Platform / Channel: ${incident.platform?.trim() || 'Not specified by user'}`,
    `• Location: ${incident.location?.trim() || 'Not specified / Not applicable'}`,
    `• People or Organizations Involved: ${
      incident.peopleInvolved?.trim() || 'Not specified by user'
    }`,
    `• User Description of Incident:\n  ${incident.description?.trim() || 'No description entered.'}`,
  ];
  if (incident.additionalNotes?.trim()) {
    detailLines.push(`• Additional User Notes:\n  ${incident.additionalNotes.trim()}`);
  }
  const incidentDetailsSummary = detailLines.join('\n');

  const chronologicalAccount =
    confirmedEvents.length === 0
      ? incident.date
        ? `[1] ${incident.date}${incident.time ? ` ${incident.time}` : ' (Time Approximate / Unspecified)'} — ${
            incident.title || 'Primary Incident Date'
          }: Derived from primary incident form. Add or confirm individual events in Step 5 (Timeline) for a fuller sequence.`
        : 'No chronological timeline events have been confirmed by the user yet.'
      : confirmedEvents
          .map((ev, idx) => {
            const timeLabel = ev.time
              ? `${ev.time}${ev.timeApproximate ? ' (approx.)' : ''}`
              : 'Time unknown/unspecified';
            const linkedIdx = ev.linkedEvidenceId
              ? incident.evidence.findIndex((e) => e.id === ev.linkedEvidenceId)
              : -1;
            const linkedBadge =
              linkedIdx >= 0 ? ` [Linked Evidence: EV-${String(linkedIdx + 1).padStart(2, '0')}]` : '';
            return `[${idx + 1}] ${ev.date || 'Date unspecified'} | ${timeLabel} — ${ev.title}${linkedBadge}\n    ${
              ev.description || 'No additional event note provided.'
            }`;
          })
          .join('\n');

  const evidenceInventorySummary =
    incident.evidence.length === 0
      ? 'No supporting files or manual evidence descriptions have been added by the user yet.'
      : incident.evidence
          .map((ev, idx) => {
            const code = `EV-${String(idx + 1).padStart(2, '0')}`;
            const refPart = ev.fileReference || ev.sourceUrl;
            const addedOn = ev.createdAt ? ev.createdAt.slice(0, 10) : 'Recorded';
            return `${code}: ${ev.fileName} (${ev.recordKind || ev.fileType}) | Status: ${
              ev.storageIndicator || ev.uploadStatus
            } | Captured/Dated: ${ev.capturedAt || 'Not specified'} | Added: ${addedOn}${
              refPart ? ` | Reference/URL: ${refPart}` : ''
            }\n    User Description: ${ev.description || 'No description provided.'}`;
          })
          .join('\n') +
        '\nNote: Evidence items are cataloged as supplied by the user; KAVACH does not perform forensic verification.';

  const importantUserFacts: string[] = [];
  if (incident.date) {
    importantUserFacts.push(
      `User reported incident date as ${incident.date}${
        incident.time ? ` at ${incident.time}` : ''
      }.`
    );
  }
  if (incident.platform?.trim()) {
    importantUserFacts.push(
      `User identified the relevant platform/channel as "${incident.platform.trim()}".`
    );
  }
  if (incident.peopleInvolved?.trim()) {
    importantUserFacts.push(
      `User noted the following accounts/individuals/entities: ${incident.peopleInvolved.trim()}.`
    );
  }
  if (incident.description?.trim()) {
    importantUserFacts.push(`User statement: "${incident.description.trim()}"`);
  }
  if (incident.evidence.length > 0) {
    importantUserFacts.push(
      `User cataloged ${incident.evidence.length} supporting evidence ${
        incident.evidence.length === 1 ? 'record' : 'records'
      } in the Evidence Inventory.`
    );
  }

  const unknownOrUnconfirmedDetails: string[] = [];
  if (!incident.time?.trim()) {
    unknownOrUnconfirmedDetails.push('Exact or approximate time of the primary incident is not yet specified.');
  }
  if (!incident.platform?.trim()) {
    unknownOrUnconfirmedDetails.push('Specific platform, website, or communication channel is not yet specified.');
  }
  if (!incident.peopleInvolved?.trim()) {
    unknownOrUnconfirmedDetails.push(
      'Specific sender handles, URLs, or involved entities were not listed separately (or remain unknown to the user).'
    );
  }
  if (incident.evidence.length === 0) {
    unknownOrUnconfirmedDetails.push(
      'No screenshots, documents, or manual evidence references are attached yet.'
    );
  }
  for (const q of missingInfoQuestions) {
    if (q.resolutionState === 'not-available') {
      unknownOrUnconfirmedDetails.push(
        `${q.question} — Explicitly marked "Not Available" by user${
          q.userAnswer ? ` (${q.userAnswer})` : ''
        }.`
      );
    } else if (q.resolutionState === 'add-later') {
      unknownOrUnconfirmedDetails.push(
        `${q.question} — Marked "Need to Add Later" by user.`
      );
    }
  }

  const missingInformationSummary = missingInfoQuestions.map(
    (q) =>
      `[${formatResolutionLabel(q.resolutionState, q.status)}] ${q.question}${
        q.userAnswer ? ` — ${q.userAnswer}` : ''
      }`
  );

  const suggestedNextSteps: string[] = [
    'Review the Missing Information Checklist (Step 4) and mark any unavailable or non-applicable items so your report accurately reflects what exists.',
    'Confirm chronological events in Step 5 (Timeline) and verify all dates, descriptions, and user-provided notes in Step 6 (Final Review).',
    'Preserve original unedited screenshots, emails, or device files safely on your own device in case an official portal requests direct uploads.',
    incident.category === 'online fraud'
      ? 'For suspected financial cyber fraud in India, consider reporting promptly on the official National Cyber Crime Reporting Portal (https://cybercrime.gov.in/) or calling the national cyber helpline 1930.'
      : 'When ready, export your formatted PDF report in Step 7 and use the verified official public portals (such as https://cybercrime.gov.in/ or emergency 112 if in danger) to submit an official complaint manually.',
  ];

  const reportCore: Omit<StructuredAiReport, 'editableFullReportText'> = {
    caseId,
    incidentOverview,
    incidentDetailsSummary,
    chronologicalAccount,
    evidenceInventorySummary,
    importantUserFacts,
    unknownOrUnconfirmedDetails,
    missingInformationSummary,
    suggestedNextSteps,
    isUserEdited: false,
    source: 'local-organizer',
    generatedAt,
  };

  const structuredReport: StructuredAiReport = {
    ...reportCore,
    editableFullReportText: formatStructuredReportFullText(reportCore),
  };

  const suggestedTimelineEvents: LocalAnalysisResult['suggestedTimelineEvents'] = [];
  if (confirmedEvents.length === 0 && incident.date) {
    suggestedTimelineEvents.push({
      date: incident.date,
      time: incident.time || '',
      title: `Initial ${incident.category} incident noted${
        incident.platform ? ` on ${incident.platform}` : ''
      }`,
      description:
        incident.description.slice(0, 200) + (incident.description.length > 200 ? '...' : ''),
      rationale:
        'AI candidate suggestion based on your Step 1 incident date and description. Confirm only if accurate.',
    });
  }

  for (const ev of incident.evidence.slice(0, 2)) {
    const dateMatch = ev.capturedAt?.match(/^(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2}))?/);
    if (dateMatch) {
      const evDate = dateMatch[1];
      const evTime = dateMatch[2] || '';
      const alreadyExists = incident.timeline.some(
        (t) => t.linkedEvidenceId === ev.id || t.title.includes(ev.fileName)
      );
      if (!alreadyExists) {
        suggestedTimelineEvents.push({
          date: evDate,
          time: evTime,
          title: `Evidence captured/recorded: ${ev.fileName}`,
          description: ev.description || `User logged ${ev.recordKind || ev.fileType}.`,
          rationale: `Suggested from evidence item "${ev.fileName}" timestamp (${ev.capturedAt}). Confirm only if accurate.`,
        });
      }
    }
  }

  return {
    structuredReport,
    neutralSummary: incidentOverview,
    evidenceIndexSummary: evidenceInventorySummary,
    missingInfoQuestions,
    suggestedTimelineEvents: suggestedTimelineEvents.slice(0, 3),
  };
}

export function runLocalFallbackAnalysis(incident: IncidentRecord): LocalAnalysisResult {
  const built = buildClientStructuredReportAndReview(incident);
  return {
    source: 'local-simulated',
    generatedAt: built.structuredReport.generatedAt,
    neutralSummary: built.neutralSummary,
    evidenceIndexSummary: built.evidenceIndexSummary,
    missingInfoQuestions: built.missingInfoQuestions.map((q) => ({
      fieldKey: q.fieldKey,
      question: q.question,
      reason: q.reason,
      category: q.category,
      resolutionState: q.resolutionState,
      jumpTarget: q.jumpTarget,
      itemKind: q.itemKind,
    })),
    suggestedTimelineEvents: built.suggestedTimelineEvents,
  };
}

export function readLegacyLocalDrafts(): IncidentRecord[] {
  try {
    const raw = localStorage.getItem('kavach_incidents_v1');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item === 'object' && !item.isDemo)
      .map((item) => normalizeIncidentRecord(item as Partial<IncidentRecord>));
  } catch {
    return [];
  }
}

export function markLegacyDraftImported(legacyId: string): void {
  try {
    const importedRaw = localStorage.getItem('kavach_imported_legacy_ids');
    const existing: string[] = importedRaw ? JSON.parse(importedRaw) : [];
    if (!existing.includes(legacyId)) {
      localStorage.setItem(
        'kavach_imported_legacy_ids',
        JSON.stringify([...existing, legacyId])
      );
    }
  } catch {
    // Ignore storage restriction
  }
}

export function getUnimportedLegacyDrafts(): IncidentRecord[] {
  try {
    const allLegacy = readLegacyLocalDrafts();
    const importedRaw = localStorage.getItem('kavach_imported_legacy_ids');
    const importedIds: string[] = importedRaw ? JSON.parse(importedRaw) : [];
    return allLegacy.filter((item) => !importedIds.includes(item.id));
  } catch {
    return [];
  }
}

export function normalizeIncidentRecord(raw: Partial<IncidentRecord>): IncidentRecord {
  const status = raw.status === 'ready-for-review' ? 'ready-for-review' : 'draft';
  const kavachStatus: KavachCaseStatus =
    raw.kavachStatus ||
    (raw.officialTracking?.acknowledgementNumber
      ? 'Submitted Externally'
      : status === 'ready-for-review'
        ? 'Ready for Submission'
        : 'Draft');

  const nowIso = new Date().toISOString();

  return {
    id: raw.id || `legacy-${Date.now()}`,
    caseCode: raw.caseCode || 'KAV-PENDING0',
    legacyCaseCode: raw.legacyCaseCode || raw.caseCode,
    isDemo: Boolean(raw.isDemo),
    status,
    kavachStatus,
    statusHistory: Array.isArray(raw.statusHistory)
      ? raw.statusHistory
      : [
          {
            id: `sh-legacy-${Date.now()}`,
            previousStatus: null,
            newStatus: kavachStatus,
            timestamp: raw.createdAt || nowIso,
            note: 'Recovered from local browser workspace.',
            changedBy: 'User',
          },
        ],
    submissionState: raw.submissionState || 'kavach-draft',
    lastSubmissionError: raw.lastSubmissionError,
    urgencyLevel: raw.urgencyLevel || 'standard',
    title: raw.title ?? '',
    category: raw.category || 'other',
    platform: raw.platform ?? '',
    location: raw.location ?? '',
    peopleInvolved: raw.peopleInvolved ?? '',
    date: raw.date ?? '',
    time: raw.time ?? '',
    timezone: raw.timezone || 'IST (UTC+05:30)',
    description: raw.description ?? '',
    additionalNotes: raw.additionalNotes ?? '',
    workflowStage: raw.workflowStage || 1,
    completedStages: Array.isArray(raw.completedStages) ? raw.completedStages : [1],
    structuredReport: raw.structuredReport || null,
    witnesses: Array.isArray(raw.witnesses) ? raw.witnesses : [],
    reportingPreferences: raw.reportingPreferences || {
      preferredPath: 'undecided',
      selectedAuthorityIds: [],
      selectedSupportOrgIds: [],
      personalNotesOnPreferences: '',
    },
    evidence: Array.isArray(raw.evidence)
      ? raw.evidence.map((ev) => ({
          ...ev,
          storageIndicator:
            ev.storageIndicator ||
            (ev.entryMethod === 'manual-entry'
              ? 'Manual Description / URL Recorded Only'
              : ev.previewDataUrl || ev.textExcerpt
                ? 'Preview / Excerpt Saved in Case Record'
                : 'Filename & Size Recorded Only (File Stays on Device)'),
        }))
      : [],
    aiEvidenceIndexSummary: raw.aiEvidenceIndexSummary || '',
    timeline: Array.isArray(raw.timeline) ? raw.timeline : [],
    aiSummary: raw.aiSummary ?? '',
    aiSummarySource: raw.aiSummarySource,
    aiSummaryUpdatedAt: raw.aiSummaryUpdatedAt,
    missingInfoQuestions: Array.isArray(raw.missingInfoQuestions) ? raw.missingInfoQuestions : [],
    internalTracking: raw.internalTracking || {
      currentStatus: status === 'ready-for-review' ? 'Report Prepared' : 'Draft',
      userNotes: '',
      history: [],
      prototypeQueueSubmitted: false,
    },
    officialTracking: raw.officialTracking || {
      submittedExternally: false,
      authorityOrPortal: 'National Cyber Crime Reporting Portal (cybercrime.gov.in)',
      portalUrl: 'https://cybercrime.gov.in/',
      statusCheckUrl: 'https://www.cybercrime.gov.in/Webform/chkackstatus.aspx',
      acknowledgementNumber: '',
      submissionDate: '',
      lastManualStatus: '',
      lastManualCheckDate: '',
      userNotes: '',
      isLiveVerified: false,
    },
    privateSupportTracking: Array.isArray(raw.privateSupportTracking)
      ? raw.privateSupportTracking
      : [],
    latestActivity: raw.latestActivity || 'Draft recovered',
    createdAt: raw.createdAt || nowIso,
    updatedAt: raw.updatedAt || nowIso,
  };
}
