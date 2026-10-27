export type IncidentCategory =
  | 'cyberbullying'
  | 'online harassment'
  | 'impersonation'
  | 'threats'
  | 'online fraud'
  | 'other';

export const INCIDENT_CATEGORIES: { value: IncidentCategory; label: string; hint: string }[] = [
  {
    value: 'cyberbullying',
    label: 'Cyberbullying',
    hint: 'Repeated targeted ridicule, exclusion, or abusive messages in digital spaces',
  },
  {
    value: 'online harassment',
    label: 'Online Harassment',
    hint: 'Persistent unwanted contact, coordinated dogpiling, or abusive outreach',
  },
  {
    value: 'impersonation',
    label: 'Impersonation',
    hint: 'Fake profiles, cloned identities, or unauthorized accounts using your name or photos',
  },
  {
    value: 'threats',
    label: 'Threats',
    hint: 'Explicit or implied statements threatening physical harm, doxxing, or extortion',
  },
  {
    value: 'online fraud',
    label: 'Online Fraud',
    hint: 'Phishing links, unauthorized payment requests, scam listings, or deceptive transfers',
  },
  {
    value: 'other',
    label: 'Other',
    hint: 'Any other safety concern requiring structured factual documentation',
  },
];

export type UrgencyLevel = 'immediate-danger' | 'high' | 'standard';

export interface KavachUser {
  id: string;
  name: string;
  email: string;
  role: 'citizen' | 'demo_authority';
  createdAt: string;
}

export type EvidenceUploadStatus =
  | 'Recorded Locally in Browser'
  | 'Stored in Case Record'
  | 'Metadata Only (Large File)'
  | 'Manual Entry';

export type EvidenceStorageIndicator =
  | 'Preview / Excerpt Saved in Case Record'
  | 'Preview / Excerpt Stored Locally in Browser'
  | 'Filename & Size Recorded Only (File Stays on Device)'
  | 'Manual Description / URL Recorded Only';

export type EvidenceRecordKind =
  | 'Screenshot / Image'
  | 'Message / Chat Export'
  | 'URL / Webpage Link'
  | 'Document / PDF'
  | 'Transaction / Ticket Reference'
  | 'Other Record';

export interface EvidenceItem {
  id: string;
  fileName: string;
  fileType: string;
  recordKind?: EvidenceRecordKind;
  fileSizeBytes?: number;
  fileReference?: string;
  uploadStatus: EvidenceUploadStatus;
  storageIndicator?: EvidenceStorageIndicator;
  entryMethod: 'file-upload' | 'manual-entry';
  capturedAt: string;
  sourceUrl: string;
  description: string;
  textExcerpt?: string;
  previewDataUrl?: string;
  createdAt: string;
}

export interface WitnessEntry {
  id: string;
  nameOrAlias: string;
  relationOrContext: string;
  contactOptional: string;
  observationNote: string;
}

export interface ReportingPreferences {
  preferredPath: 'undecided' | 'public-authority' | 'private-support' | 'self-record-only';
  selectedAuthorityIds: string[];
  selectedSupportOrgIds: string[];
  personalNotesOnPreferences: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  time: string;
  timeApproximate?: boolean;
  title: string;
  description: string;
  source: 'user' | 'ai-suggestion';
  confirmed: boolean;
  rationale?: string;
  linkedEvidenceId?: string;
}

export type QuestionResolutionStatus = 'open' | 'answered' | 'not-applicable';

export type ChecklistResolutionState =
  | 'open'
  | 'available'
  | 'not-available'
  | 'not-applicable'
  | 'add-later'
  | 'skipped';

export type ChecklistJumpTarget = 'add-details' | 'upload-evidence' | 'edit-timeline';

export type ChecklistItemKind =
  | 'missing-detail'
  | 'unclear-timeline'
  | 'optional-evidence'
  | 'ambiguity-check'
  | 'fact-verification';

export interface MissingInfoQuestion {
  id: string;
  fieldKey?: string;
  question: string;
  reason: string;
  category: string;
  status: QuestionResolutionStatus;
  resolutionState?: ChecklistResolutionState;
  jumpTarget?: ChecklistJumpTarget;
  itemKind?: ChecklistItemKind;
  userAnswer: string;
  source: 'gemini-server' | 'local-simulated' | 'demo';
}

export type WorkflowStageNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const WORKFLOW_STAGES: {
  stage: WorkflowStageNumber;
  shortLabel: string;
  fullTitle: string;
}[] = [
  { stage: 1, shortLabel: 'Incident Details', fullTitle: '1. Incident Details' },
  { stage: 2, shortLabel: 'Evidence', fullTitle: '2. Evidence Inventory' },
  { stage: 3, shortLabel: 'AI Report', fullTitle: '3. AI Report Generation' },
  { stage: 4, shortLabel: 'Missing Information', fullTitle: '4. Missing Details & Evidence' },
  { stage: 5, shortLabel: 'Timeline', fullTitle: '5. Chronological Timeline' },
  { stage: 6, shortLabel: 'Review', fullTitle: '6. Final Report Review' },
  { stage: 7, shortLabel: 'Submit or Export', fullTitle: '7. Submit or Export' },
];

export interface StructuredAiReport {
  caseId: string;
  incidentOverview: string;
  incidentDetailsSummary: string;
  chronologicalAccount: string;
  evidenceInventorySummary: string;
  importantUserFacts: string[];
  unknownOrUnconfirmedDetails: string[];
  missingInformationSummary: string[];
  suggestedNextSteps: string[];
  editableFullReportText: string;
  isUserEdited: boolean;
  source: 'gemini-server' | 'local-organizer' | 'user-edited';
  generatedAt: string;
}

/**
 * Requirement #7: Internal KAVACH Case Statuses
 * Strictly distinct from external official government statuses.
 */
export type KavachCaseStatus =
  | 'Draft'
  | 'Ready for Submission'
  | 'Submitted Externally'
  | 'Under Review'
  | 'Resolved'
  | 'Closed';

export const KAVACH_CASE_STATUSES: KavachCaseStatus[] = [
  'Draft',
  'Ready for Submission',
  'Submitted Externally',
  'Under Review',
  'Resolved',
  'Closed',
];

export interface CaseStatusHistoryEntry {
  id: string;
  previousStatus: KavachCaseStatus | null;
  newStatus: KavachCaseStatus;
  timestamp: string;
  note: string;
  changedBy: string;
}

export type SubmissionArchitectureState =
  | 'not-submitted'
  | 'kavach-draft'
  | 'awaiting-external-action'
  | 'user-confirmed-external'
  | 'verified-integration'
  | 'submission-failed';

export type KavachInternalStatus =
  | 'Draft'
  | 'Report Prepared'
  | 'Ready for External Submission'
  | 'External Submission Pending User Action'
  | 'User Confirmed External Submission'
  | 'Follow-up Required'
  | 'KAVACH Record Closed';

export const KAVACH_INTERNAL_STATUSES: KavachInternalStatus[] = [
  'Draft',
  'Report Prepared',
  'Ready for External Submission',
  'External Submission Pending User Action',
  'User Confirmed External Submission',
  'Follow-up Required',
  'KAVACH Record Closed',
];

export interface InternalStatusHistoryEntry {
  id: string;
  status: string;
  timestamp: string;
  actor: 'Citizen' | 'KAVACH System' | 'Prototype Reviewer';
  note: string;
}

export type ReviewerCaseStatus =
  | 'Received by KAVACH Review System'
  | 'Under Review'
  | 'More Information Needed'
  | 'Review Completed'
  | 'Closed';

export const REVIEWER_CASE_STATUSES: ReviewerCaseStatus[] = [
  'Received by KAVACH Review System',
  'Under Review',
  'More Information Needed',
  'Review Completed',
  'Closed',
];

export interface InternalCaseTracking {
  currentStatus: KavachInternalStatus;
  userNotes: string;
  history: InternalStatusHistoryEntry[];
  prototypeQueueSubmitted: boolean;
  prototypeAccessToken?: string;
  prototypeIdempotencyKey?: string;
  prototypeReviewerStatus?: ReviewerCaseStatus;
  prototypeReviewerNotes?: string;
  prototypeLastSyncedAt?: string;
}

/**
 * Requirement #11: Record Official Complaint Details (User-Provided)
 */
export interface OfficialGovernmentTracking {
  submittedExternally?: boolean;
  authorityOrPortal: string;
  portalUrl: string;
  statusCheckUrl: string;
  acknowledgementNumber: string;
  submissionDate: string;
  lastManualStatus: string;
  lastManualCheckDate: string;
  userNotes: string;
  isLiveVerified: boolean;
}

export type PrivateSupportStatus =
  | 'Recommended'
  | 'Contact Information Viewed'
  | 'Contacted by User'
  | 'Response Reported by User'
  | 'Follow-up Required'
  | 'Support Process Marked Complete by User';

export const PRIVATE_SUPPORT_STATUSES: PrivateSupportStatus[] = [
  'Recommended',
  'Contact Information Viewed',
  'Contacted by User',
  'Response Reported by User',
  'Follow-up Required',
  'Support Process Marked Complete by User',
];

export interface PrivateSupportTrackingEntry {
  id: string;
  organizationId: string;
  organizationName: string;
  officialUrl: string;
  status: PrivateSupportStatus;
  dateContacted: string;
  contactMethod: string;
  responseState: 'not-contacted' | 'pending' | 'response-received';
  followUpDate: string;
  userNotes: string;
  updatedAt: string;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  caseCode: string;
  incidentId: string;
  action: string;
  detail: string;
}

export interface IncidentRecord {
  id: string;
  ownerUserId?: string;
  /** Permanent KAV-XXXXXXXX Case ID (never contains year/date/timestamp) */
  caseCode: string;
  /** Preserved legacy Case ID if migrated from an earlier local draft */
  legacyCaseCode?: string;
  isDemo: boolean;
  status: 'draft' | 'ready-for-review';
  kavachStatus: KavachCaseStatus;
  statusHistory: CaseStatusHistoryEntry[];
  submissionState: SubmissionArchitectureState;
  lastSubmissionError?: string;
  urgencyLevel: UrgencyLevel;
  title: string;
  category: IncidentCategory;
  platform: string;
  location?: string;
  peopleInvolved?: string;
  date: string;
  time: string;
  timezone: string;
  description: string;
  additionalNotes: string;
  workflowStage?: WorkflowStageNumber;
  completedStages?: number[];
  structuredReport?: StructuredAiReport | null;
  witnesses: WitnessEntry[];
  reportingPreferences: ReportingPreferences;
  evidence: EvidenceItem[];
  aiEvidenceIndexSummary?: string;
  timeline: TimelineEvent[];
  aiSummary: string;
  aiSummarySource?: 'gemini-server' | 'local-simulated' | 'user-edited' | 'demo';
  aiSummaryUpdatedAt?: string;
  missingInfoQuestions: MissingInfoQuestion[];
  internalTracking: InternalCaseTracking;
  officialTracking: OfficialGovernmentTracking;
  privateSupportTracking: PrivateSupportTrackingEntry[];
  latestActivity?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DemoAuthorityAssignedCase {
  caseCode: string;
  isDemoSample: boolean;
  assignedUnitLabel: string;
  title: string;
  category: IncidentCategory;
  incidentDate: string;
  incidentTime: string;
  location: string;
  platform: string;
  description: string;
  summary: string;
  evidence: {
    fileName: string;
    fileType: string;
    storageIndicator: string;
    capturedAt: string;
    description: string;
  }[];
  timeline: {
    date: string;
    time: string;
    title: string;
    description: string;
    confirmed: boolean;
  }[];
  caseNotes: string;
  reviewerStatus: ReviewerCaseStatus;
  reviewHistory: {
    id: string;
    previousStatus: ReviewerCaseStatus | null;
    newStatus: ReviewerCaseStatus;
    timestamp: string;
    reviewerName: string;
    note: string;
  }[];
  updatedAt: string;
}

export type PublicPageView = 'home' | 'about' | 'help' | 'signin' | 'signup';

export type WorkspaceTab =
  | 'dashboard'
  | 'create-case'
  | 'my-cases'
  | 'case-detail'
  | 'case-history'
  | 'official-portals'
  | 'support-resources'
  | 'demo-authority'
  | 'profile'
  | 'incident-details'
  | 'evidence'
  | 'timeline'
  | 'ai-assistant'
  | 'report'
  | 'find-help'
  | 'submit-help'
  | 'track-case'
  | 'authority-dashboard'
  | 'privacy';
