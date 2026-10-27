import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  FolderLock,
  ListChecks,
  Paperclip,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  buildClientStructuredReportAndReview,
  formatResolutionLabel,
} from '../data/demoIncident';
import { getRecommendationsForIncident } from '../data/verifiedDirectory';
import {
  ChecklistJumpTarget,
  ChecklistResolutionState,
  EvidenceItem,
  EvidenceRecordKind,
  INCIDENT_CATEGORIES,
  IncidentCategory,
  IncidentRecord,
  KavachCaseStatus,
  MissingInfoQuestion,
  StructuredAiReport,
  TimelineEvent,
  UrgencyLevel,
  WORKFLOW_STAGES,
  WorkflowStageNumber,
} from '../types/incident';
import {
  createCaseRecord,
  generateCaseAiReport,
  updateCaseRecord,
} from '../utils/apiClient';
import {
  downloadIncidentPdf,
  formatBytes,
  generatePlainTextReport,
  sortTimelineChronologically,
  triggerFileDownload,
} from '../utils/pdfGenerator';
import { getStatusBadgeClasses } from './DashboardView';

interface CaseGuidedWorkflowProps {
  initialCase?: IncidentRecord | null;
  forcedInitialStage?: WorkflowStageNumber | null;
  hideCaseBanner?: boolean;
  onCaseCreated?: (created: IncidentRecord) => void;
  onCaseUpdated: (updated: IncidentRecord) => void;
  onExitToMyCases: () => void;
  onCancelCreate?: () => void;
}

const MAX_INLINE_PREVIEW_BYTES = 250 * 1024;

export function CaseGuidedWorkflow({
  initialCase = null,
  forcedInitialStage = null,
  hideCaseBanner = false,
  onCaseCreated,
  onCaseUpdated,
  onExitToMyCases,
  onCancelCreate,
}: CaseGuidedWorkflowProps) {
  const todayIso = new Date().toISOString().slice(0, 10);

  const [caseRecord, setCaseRecord] = useState<IncidentRecord | null>(initialCase);
  const [currentStage, setCurrentStage] = useState<WorkflowStageNumber>(
    forcedInitialStage || initialCase?.workflowStage || 1
  );
  const [completedStages, setCompletedStages] = useState<number[]>(
    initialCase?.completedStages && initialCase.completedStages.length > 0
      ? initialCase.completedStages
      : initialCase
        ? [1]
        : []
  );

  // Guided jump-back context when user navigates from Step 4 (Missing Info) to Step 1 / 2 / 5
  const [returnChecklistItem, setReturnChecklistItem] = useState<MissingInfoQuestion | null>(null);

  // Feedback & busy states
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [copiedCaseId, setCopiedCaseId] = useState(false);

  // Stage 1: Incident Details form state
  const [title, setTitle] = useState(initialCase?.title || '');
  const [category, setCategory] = useState<IncidentCategory>(
    initialCase?.category || 'online harassment'
  );
  const [urgencyLevel, setUrgencyLevel] = useState<UrgencyLevel>(
    initialCase?.urgencyLevel || 'standard'
  );
  const [date, setDate] = useState(initialCase?.date || todayIso);
  const [time, setTime] = useState(initialCase?.time || '');
  const [timezone, setTimezone] = useState(initialCase?.timezone || 'IST (UTC+05:30)');
  const [platform, setPlatform] = useState(initialCase?.platform || '');
  const [location, setLocation] = useState(initialCase?.location || '');
  const [peopleInvolved, setPeopleInvolved] = useState(initialCase?.peopleInvolved || '');
  const [description, setDescription] = useState(initialCase?.description || '');
  const [additionalNotes, setAdditionalNotes] = useState(initialCase?.additionalNotes || '');

  // Stage 2: Evidence Inventory state
  const [manualEvTitle, setManualEvTitle] = useState('');
  const [manualEvKind, setManualEvKind] = useState<EvidenceRecordKind>('Screenshot / Image');
  const [manualEvDateTime, setManualEvDateTime] = useState('');
  const [manualEvRef, setManualEvRef] = useState('');
  const [manualEvDesc, setManualEvDesc] = useState('');
  const [previewEvidenceId, setPreviewEvidenceId] = useState<string | null>(null);
  const [editingEvidenceId, setEditingEvidenceId] = useState<string | null>(null);
  const [editEvTitle, setEditEvTitle] = useState('');
  const [editEvKind, setEditEvKind] = useState<EvidenceRecordKind>('Screenshot / Image');
  const [editEvDateTime, setEditEvDateTime] = useState('');
  const [editEvRef, setEditEvRef] = useState('');
  const [editEvDesc, setEditEvDesc] = useState('');

  // Stage 3 & Stage 6: Editable AI Report state
  const [reportTextDraft, setReportTextDraft] = useState(
    initialCase?.structuredReport?.editableFullReportText || initialCase?.aiSummary || ''
  );
  const [isEditingReportOnReview, setIsEditingReportOnReview] = useState(false);

  // Stage 4: Inline quick-answer drafts for checklist items
  const [checklistNoteDrafts, setChecklistNoteDrafts] = useState<Record<string, string>>({});

  // Stage 5: Chronological Timeline state
  const [tlDate, setTlDate] = useState(initialCase?.date || todayIso);
  const [tlTime, setTlTime] = useState('');
  const [tlTimeApprox, setTlTimeApprox] = useState(false);
  const [tlTitle, setTlTitle] = useState('');
  const [tlDesc, setTlDesc] = useState('');
  const [tlLinkedEvidenceId, setTlLinkedEvidenceId] = useState('');
  const [editingTlId, setEditingTlId] = useState<string | null>(null);

  // Stage 7: Official Complaint Details (User-Provided — Strictly Separate from KAVACH Case ID)
  const [submittedExternally, setSubmittedExternally] = useState(
    Boolean(
      initialCase?.officialTracking.submittedExternally ||
        initialCase?.officialTracking.acknowledgementNumber
    )
  );
  const [portalUsed, setPortalUsed] = useState(
    initialCase?.officialTracking.authorityOrPortal ||
      'National Cyber Crime Reporting Portal (cybercrime.gov.in)'
  );
  const [officialAckNumber, setOfficialAckNumber] = useState(
    initialCase?.officialTracking.acknowledgementNumber || ''
  );
  const [officialSubDate, setOfficialSubDate] = useState(
    initialCase?.officialTracking.submissionDate || ''
  );
  const [officialNotes, setOfficialNotes] = useState(
    initialCase?.officialTracking.userNotes || ''
  );

  // Sync when switching to a different case in parent
  useEffect(() => {
    if (!initialCase) return;
    setCaseRecord(initialCase);
    setTitle(initialCase.title);
    setCategory(initialCase.category);
    setUrgencyLevel(initialCase.urgencyLevel);
    setDate(initialCase.date);
    setTime(initialCase.time);
    setTimezone(initialCase.timezone || 'IST (UTC+05:30)');
    setPlatform(initialCase.platform);
    setLocation(initialCase.location || '');
    setPeopleInvolved(initialCase.peopleInvolved || '');
    setDescription(initialCase.description);
    setAdditionalNotes(initialCase.additionalNotes);
    setReportTextDraft(
      initialCase.structuredReport?.editableFullReportText || initialCase.aiSummary || ''
    );
    setCompletedStages(
      initialCase.completedStages && initialCase.completedStages.length > 0
        ? initialCase.completedStages
        : [1]
    );
    setSubmittedExternally(
      Boolean(
        initialCase.officialTracking.submittedExternally ||
          initialCase.officialTracking.acknowledgementNumber
      )
    );
    setPortalUsed(
      initialCase.officialTracking.authorityOrPortal ||
        'National Cyber Crime Reporting Portal (cybercrime.gov.in)'
    );
    setOfficialAckNumber(initialCase.officialTracking.acknowledgementNumber || '');
    setOfficialSubDate(initialCase.officialTracking.submissionDate || '');
    setOfficialNotes(initialCase.officialTracking.userNotes || '');
  }, [initialCase]);

  // Honor forcedInitialStage when opening from Official Portals, etc.
  useEffect(() => {
    if (forcedInitialStage) {
      setCurrentStage(forcedInitialStage);
    } else if (initialCase?.workflowStage) {
      setCurrentStage(initialCase.workflowStage);
    }
  }, [forcedInitialStage, initialCase?.caseCode]);

  const showNotice = (type: 'success' | 'error' | 'info', text: string) => {
    setFeedback({ type, text });
  };

  const markStagesComplete = (existing: number[], ...toAdd: number[]): number[] => {
    const merged = new Set([...existing, ...toAdd]);
    return Array.from(merged).sort((a, b) => a - b);
  };

  const syncSavedRecord = (saved: IncidentRecord, isNewlyCreated = false) => {
    setCaseRecord(saved);
    if (saved.completedStages && saved.completedStages.length > 0) {
      setCompletedStages(saved.completedStages);
    }
    if (isNewlyCreated && onCaseCreated) {
      onCaseCreated(saved);
    } else {
      onCaseUpdated(saved);
    }
  };

  const validateStage1Fields = (): string | null => {
    if (title.trim().length < 4) {
      return 'Please enter an incident title (minimum 4 characters).';
    }
    if (!date.trim()) {
      return 'Please select the incident date.';
    }
    if (description.trim().length < 15) {
      return 'Please enter a factual incident description (minimum 15 characters).';
    }
    return null;
  };

  // Core save helper for Stage 1 or Draft saves
  const saveIncidentCoreAndStage = async (
    targetStage: WorkflowStageNumber,
    markCompletedList: number[],
    activityNote: string
  ): Promise<IncidentRecord | null> => {
    const err = validateStage1Fields();
    if (err) {
      showNotice('error', err);
      return null;
    }

    setSaving(true);
    try {
      const nextCompleted = markStagesComplete(completedStages, ...markCompletedList);
      if (!caseRecord) {
        const initialTimeline: TimelineEvent[] = [
          {
            id: `tl-init-${Date.now()}`,
            date,
            time,
            timeApproximate: !time.trim(),
            title: title.trim(),
            description: description.trim().slice(0, 260),
            source: 'user',
            confirmed: true,
          },
        ];

        const created = await createCaseRecord({
          title: title.trim(),
          category,
          urgencyLevel,
          date,
          time: time.trim(),
          timezone: timezone.trim() || 'IST (UTC+05:30)',
          platform: platform.trim(),
          location: location.trim(),
          peopleInvolved: peopleInvolved.trim(),
          description: description.trim(),
          additionalNotes: additionalNotes.trim(),
          workflowStage: targetStage,
          completedStages: nextCompleted,
          kavachStatus: 'Draft',
          timeline: initialTimeline,
          activityNote,
        });

        syncSavedRecord(created, true);
        setCurrentStage(targetStage);
        setTlDate(created.date || todayIso);
        showNotice(
          'success',
          `Case created with permanent KAVACH Case ID ${created.caseCode}. Progress saved.`
        );
        return created;
      } else {
        const updated = await updateCaseRecord(caseRecord.caseCode, {
          title: title.trim(),
          category,
          urgencyLevel,
          date,
          time: time.trim(),
          timezone: timezone.trim() || 'IST (UTC+05:30)',
          platform: platform.trim(),
          location: location.trim(),
          peopleInvolved: peopleInvolved.trim(),
          description: description.trim(),
          additionalNotes: additionalNotes.trim(),
          workflowStage: targetStage,
          completedStages: nextCompleted,
          activityNote,
        });

        syncSavedRecord(updated, false);
        setCurrentStage(targetStage);
        return updated;
      }
    } catch (e: unknown) {
      showNotice('error', e instanceof Error ? e.message : 'Unable to save case progress.');
      return null;
    } finally {
      setSaving(false);
    }
  };

  // Navigate to any workflow stage without losing work
  const handleGoToStage = async (targetStage: WorkflowStageNumber) => {
    if (targetStage === currentStage) return;

    if (!caseRecord) {
      if (targetStage === 1) return;
      const created = await saveIncidentCoreAndStage(
        targetStage,
        [1],
        'Saved Step 1 incident details and generated permanent Case ID'
      );
      if (created) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    // If leaving Stage 1, persist form changes first
    if (currentStage === 1) {
      const updated = await saveIncidentCoreAndStage(
        targetStage,
        [1],
        `Saved incident details and moved to Step ${targetStage}`
      );
      if (updated) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    // Persist stage pointer so refresh or My Cases resumes at exact step
    setCurrentStage(targetStage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const nextComp =
        targetStage > currentStage
          ? markStagesComplete(completedStages, currentStage)
          : completedStages;
      const updated = await updateCaseRecord(caseRecord.caseCode, {
        workflowStage: targetStage,
        completedStages: nextComp,
        activityNote: `Moved to workflow step ${targetStage}`,
      });
      syncSavedRecord(updated, false);
    } catch {
      // Stage UI already switched locally
    }
  };

  const handleSaveDraftClick = async () => {
    if (!caseRecord || currentStage === 1) {
      const saved = await saveIncidentCoreAndStage(
        currentStage,
        [1],
        'Saved incident draft in KAVACH'
      );
      if (saved) {
        showNotice(
          'success',
          `Draft saved under permanent Case ID ${saved.caseCode}. You can continue anytime from My Cases.`
        );
      }
      return;
    }

    setSaving(true);
    try {
      let nextStructuredReport = caseRecord.structuredReport || null;
      if (
        (currentStage === 3 || currentStage === 6) &&
        reportTextDraft.trim() &&
        nextStructuredReport &&
        reportTextDraft.trim() !== nextStructuredReport.editableFullReportText.trim()
      ) {
        nextStructuredReport = {
          ...nextStructuredReport,
          editableFullReportText: reportTextDraft.trim(),
          isUserEdited: true,
          source: 'user-edited',
        };
      }

      const updated = await updateCaseRecord(caseRecord.caseCode, {
        title: title.trim(),
        category,
        urgencyLevel,
        date,
        time: time.trim(),
        timezone: timezone.trim() || 'IST (UTC+05:30)',
        platform: platform.trim(),
        location: location.trim(),
        peopleInvolved: peopleInvolved.trim(),
        description: description.trim(),
        additionalNotes: additionalNotes.trim(),
        workflowStage: currentStage,
        completedStages: markStagesComplete(completedStages, currentStage),
        structuredReport: nextStructuredReport,
        aiSummary: reportTextDraft.trim() || caseRecord.aiSummary,
        activityNote: `Saved draft at Step ${currentStage} (${WORKFLOW_STAGES[currentStage - 1].shortLabel})`,
      });
      syncSavedRecord(updated, false);
      showNotice(
        'success',
        `Draft saved (${updated.caseCode}) at Step ${currentStage}: ${WORKFLOW_STAGES[currentStage - 1].shortLabel}.`
      );
    } catch (e: unknown) {
      showNotice('error', e instanceof Error ? e.message : 'Unable to save draft.');
    } finally {
      setSaving(false);
    }
  };

  // =========================================================================
  // STAGE 2: EVIDENCE HANDLERS
  // =========================================================================
  const persistEvidenceItems = async (nextItems: EvidenceItem[], note: string) => {
    if (!caseRecord) return;
    setSaving(true);
    try {
      const updated = await updateCaseRecord(caseRecord.caseCode, {
        evidence: nextItems,
        workflowStage: 2,
        completedStages: markStagesComplete(completedStages, 1, 2),
        activityNote: note,
      });
      syncSavedRecord(updated, false);
      showNotice('success', note);
    } catch (e: unknown) {
      showNotice('error', e instanceof Error ? e.message : 'Failed to save evidence.');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadEvidenceFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !caseRecord) return;

    const list = Array.from(files);
    const createdItems: EvidenceItem[] = [];
    let pending = list.length;

    const finishBatch = () => {
      pending -= 1;
      if (pending === 0 && createdItems.length > 0) {
        persistEvidenceItems(
          [...caseRecord.evidence, ...createdItems],
          `Uploaded ${createdItems.length} evidence ${createdItems.length === 1 ? 'file' : 'files'}`
        );
      }
    };

    list.forEach((file) => {
      const id = `ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const capturedAt = new Date(file.lastModified || Date.now())
        .toISOString()
        .slice(0, 16)
        .replace('T', ' ');
      const nowIso = new Date().toISOString();

      const kind: EvidenceRecordKind = file.type.startsWith('image/')
        ? 'Screenshot / Image'
        : file.type.includes('pdf') || /\.(pdf|doc|docx)$/i.test(file.name)
          ? 'Document / PDF'
          : /\.(txt|csv|json|eml)$/i.test(file.name)
            ? 'Message / Chat Export'
            : 'Other Record';

      const baseItem: EvidenceItem = {
        id,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        recordKind: kind,
        fileSizeBytes: file.size,
        fileReference: `${file.name} (${formatBytes(file.size)})`,
        uploadStatus:
          file.size <= MAX_INLINE_PREVIEW_BYTES
            ? 'Stored in Case Record'
            : 'Metadata Only (Large File)',
        storageIndicator:
          file.size <= MAX_INLINE_PREVIEW_BYTES
            ? 'Preview / Excerpt Saved in Case Record'
            : 'Filename & Size Recorded Only (File Stays on Device)',
        entryMethod: 'file-upload',
        capturedAt,
        sourceUrl: '',
        description: `Uploaded ${kind.toLowerCase()} (${file.name}, ${formatBytes(file.size)}).`,
        createdAt: nowIso,
      };

      if (file.type.startsWith('image/') && file.size <= MAX_INLINE_PREVIEW_BYTES) {
        const reader = new FileReader();
        reader.onload = () => {
          createdItems.push({
            ...baseItem,
            previewDataUrl: typeof reader.result === 'string' ? reader.result : undefined,
          });
          finishBatch();
        };
        reader.onerror = () => {
          createdItems.push(baseItem);
          finishBatch();
        };
        reader.readAsDataURL(file);
      } else if (
        (file.type.startsWith('text/') || /\.(txt|csv|json|eml)$/i.test(file.name)) &&
        file.size <= MAX_INLINE_PREVIEW_BYTES
      ) {
        const reader = new FileReader();
        reader.onload = () => {
          createdItems.push({
            ...baseItem,
            textExcerpt:
              typeof reader.result === 'string' ? reader.result.slice(0, 1500) : undefined,
          });
          finishBatch();
        };
        reader.onerror = () => {
          createdItems.push(baseItem);
          finishBatch();
        };
        reader.readAsText(file);
      } else {
        createdItems.push(baseItem);
        finishBatch();
      }
    });

    e.target.value = '';
  };

  const handleAddManualEvidence = async () => {
    if (!caseRecord) return;
    if (!manualEvTitle.trim() && !manualEvDesc.trim()) {
      showNotice('error', 'Please enter an evidence title or description.');
      return;
    }

    const nowIso = new Date().toISOString();
    const item: EvidenceItem = {
      id: `ev-man-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fileName: manualEvTitle.trim() || `${manualEvKind} Entry`,
      fileType: manualEvKind,
      recordKind: manualEvKind,
      fileReference: manualEvRef.trim() || 'Manual entry (no file attached)',
      uploadStatus: 'Manual Entry',
      storageIndicator: 'Manual Description / URL Recorded Only',
      entryMethod: 'manual-entry',
      capturedAt: manualEvDateTime.trim() || 'Date/time not specified',
      sourceUrl: manualEvRef.trim(),
      description: manualEvDesc.trim() || 'Recorded manually by user.',
      createdAt: nowIso,
    };

    setManualEvTitle('');
    setManualEvDateTime('');
    setManualEvRef('');
    setManualEvDesc('');

    await persistEvidenceItems(
      [...caseRecord.evidence, item],
      `Added evidence item "${item.fileName}"`
    );
  };

  const handleSaveEditedEvidence = async () => {
    if (!caseRecord || !editingEvidenceId) return;
    const nextList = caseRecord.evidence.map((ev) =>
      ev.id === editingEvidenceId
        ? {
            ...ev,
            fileName: editEvTitle.trim() || ev.fileName,
            recordKind: editEvKind,
            capturedAt: editEvDateTime.trim() || 'Date/time not specified',
            fileReference: editEvRef.trim() || ev.fileReference || '',
            sourceUrl: editEvRef.trim(),
            description: editEvDesc.trim() || ev.description,
          }
        : ev
    );
    setEditingEvidenceId(null);
    await persistEvidenceItems(nextList, 'Updated evidence item details');
  };

  // =========================================================================
  // STAGE 3 & STAGE 4: AI REPORT GENERATION + MISSING-EVIDENCE CHECK
  // =========================================================================
  const handleGenerateOrRecheckAi = async (stayOnStage?: WorkflowStageNumber) => {
    if (!caseRecord) return;

    const validationErr = validateStage1Fields();
    if (validationErr) {
      showNotice('error', validationErr);
      return;
    }

    setAiLoading(true);
    try {
      // Build up-to-date snapshot including any unsaved Step 1 text edits
      const currentSnapshot: IncidentRecord = {
        ...caseRecord,
        title: title.trim(),
        category,
        urgencyLevel,
        date,
        time: time.trim(),
        timezone: timezone.trim() || 'IST (UTC+05:30)',
        platform: platform.trim(),
        location: location.trim(),
        peopleInvolved: peopleInvolved.trim(),
        description: description.trim(),
        additionalNotes: additionalNotes.trim(),
      };

      let aiResult: {
        source: 'gemini-server' | 'local-organizer';
        structuredReport: StructuredAiReport;
        neutralSummary: string;
        evidenceIndexSummary: string;
        missingInfoQuestions: MissingInfoQuestion[];
        suggestedTimelineEvents: {
          date: string;
          time: string;
          title: string;
          description: string;
          rationale: string;
        }[];
      };

      try {
        aiResult = await generateCaseAiReport(currentSnapshot);
      } catch {
        const localFallback = buildClientStructuredReportAndReview(currentSnapshot);
        aiResult = {
          source: 'local-organizer',
          ...localFallback,
        };
      }

      // Preserve confirmed timeline events and append non-duplicate AI candidate timeline suggestions
      const confirmedOnly = currentSnapshot.timeline.filter((t) => t.confirmed);
      const existingTitlesLower = new Set(
        confirmedOnly.map((t) => t.title.toLowerCase().slice(0, 24))
      );
      const candidateSuggestions: TimelineEvent[] = aiResult.suggestedTimelineEvents
        .filter((s) => !existingTitlesLower.has(s.title.toLowerCase().slice(0, 24)))
        .map((s, idx) => ({
          id: `tl-ai-${Date.now()}-${idx}`,
          date: s.date || currentSnapshot.date,
          time: s.time || '',
          timeApproximate: !s.time,
          title: s.title,
          description: s.description,
          rationale: s.rationale,
          source: 'ai-suggestion',
          confirmed: false,
        }));

      const nextStage = stayOnStage || currentStage;
      const nextCompleted = markStagesComplete(completedStages, 1, 3, 4);

      const updated = await updateCaseRecord(caseRecord.caseCode, {
        title: currentSnapshot.title,
        category: currentSnapshot.category,
        urgencyLevel: currentSnapshot.urgencyLevel,
        date: currentSnapshot.date,
        time: currentSnapshot.time,
        timezone: currentSnapshot.timezone,
        platform: currentSnapshot.platform,
        location: currentSnapshot.location,
        peopleInvolved: currentSnapshot.peopleInvolved,
        description: currentSnapshot.description,
        additionalNotes: currentSnapshot.additionalNotes,
        structuredReport: aiResult.structuredReport,
        aiSummary: aiResult.structuredReport.editableFullReportText,
        aiSummarySource:
          aiResult.source === 'gemini-server' ? 'gemini-server' : 'local-simulated',
        aiSummaryUpdatedAt: aiResult.structuredReport.generatedAt,
        aiEvidenceIndexSummary: aiResult.evidenceIndexSummary,
        missingInfoQuestions: aiResult.missingInfoQuestions,
        timeline: sortTimelineChronologically([...confirmedOnly, ...candidateSuggestions]),
        workflowStage: nextStage,
        completedStages: nextCompleted,
        activityNote:
          'Generated structured 9-section AI report & ran missing-details/evidence review',
      });

      setReportTextDraft(aiResult.structuredReport.editableFullReportText);
      syncSavedRecord(updated, false);
      if (stayOnStage) {
        setCurrentStage(stayOnStage);
      }

      const openCount = aiResult.missingInfoQuestions.filter(
        (q) => !q.resolutionState || q.resolutionState === 'open'
      ).length;
      showNotice(
        'success',
        `Structured AI report generated and case reviewed (${openCount} open detail/evidence ${openCount === 1 ? 'prompt' : 'prompts'} ready in Step 4).`
      );
    } catch (e: unknown) {
      showNotice('error', e instanceof Error ? e.message : 'Unable to generate AI report.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveEditedReportText = async () => {
    if (!caseRecord) return;
    if (!reportTextDraft.trim()) {
      showNotice('error', 'Report text cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const baseReport: StructuredAiReport = caseRecord.structuredReport || {
        caseId: caseRecord.caseCode,
        incidentOverview: reportTextDraft.trim().slice(0, 500),
        incidentDetailsSummary: description.trim(),
        chronologicalAccount: '',
        evidenceInventorySummary: '',
        importantUserFacts: [],
        unknownOrUnconfirmedDetails: [],
        missingInformationSummary: [],
        suggestedNextSteps: [],
        editableFullReportText: reportTextDraft.trim(),
        isUserEdited: true,
        source: 'user-edited',
        generatedAt: nowIso,
      };

      const nextStructured: StructuredAiReport = {
        ...baseReport,
        caseId: caseRecord.caseCode,
        editableFullReportText: reportTextDraft.trim(),
        isUserEdited: true,
        source: 'user-edited',
        generatedAt: nowIso,
      };

      const updated = await updateCaseRecord(caseRecord.caseCode, {
        structuredReport: nextStructured,
        aiSummary: reportTextDraft.trim(),
        aiSummarySource: 'user-edited',
        aiSummaryUpdatedAt: nowIso,
        completedStages: markStagesComplete(completedStages, 3),
        activityNote: 'Saved user-edited AI incident report',
      });

      syncSavedRecord(updated, false);
      setIsEditingReportOnReview(false);
      showNotice('success', 'Your edits to the incident report have been saved.');
    } catch (e: unknown) {
      showNotice('error', e instanceof Error ? e.message : 'Unable to save report edits.');
    } finally {
      setSaving(false);
    }
  };

  // =========================================================================
  // STAGE 4 & 5: MISSING-INFORMATION CHECKLIST & GUIDED JUMP ACTIONS
  // =========================================================================
  const handleMarkChecklistStatus = async (
    questionId: string,
    newState: ChecklistResolutionState,
    customAnswer?: string
  ) => {
    if (!caseRecord) return;

    const mappedLegacyStatus: MissingInfoQuestion['status'] =
      newState === 'available'
        ? 'answered'
        : newState === 'not-applicable' || newState === 'not-available'
          ? 'not-applicable'
          : 'open';

    const nextQuestions = caseRecord.missingInfoQuestions.map((q) => {
      if (q.id !== questionId) return q;
      const nextAns = customAnswer !== undefined ? customAnswer.trim() : q.userAnswer;
      return {
        ...q,
        resolutionState: newState,
        status: mappedLegacyStatus,
        userAnswer: nextAns,
      };
    });

    // If user typed a concrete clarification and marked Available, also append to additionalNotes if not present
    let nextAdditionalNotes = additionalNotes;
    const targetQ = caseRecord.missingInfoQuestions.find((q) => q.id === questionId);
    if (
      newState === 'available' &&
      customAnswer &&
      customAnswer.trim().length > 0 &&
      targetQ &&
      !additionalNotes.includes(customAnswer.trim())
    ) {
      const noteLine = `[Clarification — ${targetQ.category}]: ${customAnswer.trim()}`;
      nextAdditionalNotes = additionalNotes.trim()
        ? `${additionalNotes.trim()}\n${noteLine}`
        : noteLine;
      setAdditionalNotes(nextAdditionalNotes);
    }

    setSaving(true);
    try {
      const updated = await updateCaseRecord(caseRecord.caseCode, {
        missingInfoQuestions: nextQuestions,
        additionalNotes: nextAdditionalNotes,
        workflowStage: currentStage,
        completedStages: markStagesComplete(completedStages, 4),
        activityNote: `Marked checklist item as "${formatResolutionLabel(newState)}"`,
      });
      syncSavedRecord(updated, false);
      showNotice('success', `Checklist item marked "${formatResolutionLabel(newState)}".`);
    } catch (e: unknown) {
      showNotice('error', e instanceof Error ? e.message : 'Unable to update checklist item.');
    } finally {
      setSaving(false);
    }
  };

  const handleGuidedJumpAction = (
    item: MissingInfoQuestion,
    action: ChecklistJumpTarget
  ) => {
    setReturnChecklistItem(item);
    const destStage: WorkflowStageNumber =
      action === 'add-details' ? 1 : action === 'upload-evidence' ? 2 : 5;
    setCurrentStage(destStage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveAndReturnToChecklist = async (alsoRecheckAi: boolean) => {
    if (!caseRecord) return;
    if (currentStage === 1) {
      const saved = await saveIncidentCoreAndStage(
        4,
        [1, 4],
        'Added missing incident details from AI review checklist'
      );
      if (!saved) return;
      setReturnChecklistItem(null);
      if (alsoRecheckAi) {
        await handleGenerateOrRecheckAi(4);
      } else {
        setCurrentStage(4);
      }
      return;
    }

    setReturnChecklistItem(null);
    if (alsoRecheckAi) {
      await handleGenerateOrRecheckAi(4);
    } else {
      await handleGoToStage(4);
    }
  };

  // =========================================================================
  // STAGE 5: CHRONOLOGICAL TIMELINE HANDLERS
  // =========================================================================
  const persistTimelineEvents = async (nextEvents: TimelineEvent[], note: string) => {
    if (!caseRecord) return;
    setSaving(true);
    try {
      const sorted = sortTimelineChronologically(nextEvents);
      const updated = await updateCaseRecord(caseRecord.caseCode, {
        timeline: sorted,
        workflowStage: 5,
        completedStages: markStagesComplete(completedStages, 5),
        activityNote: note,
      });
      syncSavedRecord(updated, false);
      showNotice('success', note);
    } catch (e: unknown) {
      showNotice('error', e instanceof Error ? e.message : 'Unable to save timeline.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddOrUpdateTimelineEvent = async () => {
    if (!caseRecord) return;
    if (!tlTitle.trim() && !tlDesc.trim()) {
      showNotice('error', 'Please enter an event title or description.');
      return;
    }

    const effectiveTitle = tlTitle.trim() || tlDesc.trim().slice(0, 64);

    if (editingTlId) {
      const nextList = caseRecord.timeline.map((ev) =>
        ev.id === editingTlId
          ? {
              ...ev,
              date: tlDate.trim(),
              time: tlTimeApprox ? tlTime.trim() : tlTime.trim(),
              timeApproximate: tlTimeApprox || !tlTime.trim(),
              title: effectiveTitle,
              description: tlDesc.trim(),
              linkedEvidenceId: tlLinkedEvidenceId || undefined,
              confirmed: true,
            }
          : ev
      );
      setEditingTlId(null);
      setTlTitle('');
      setTlDesc('');
      setTlTime('');
      setTlTimeApprox(false);
      setTlLinkedEvidenceId('');
      await persistTimelineEvents(nextList, `Updated timeline event "${effectiveTitle}"`);
    } else {
      const newEvent: TimelineEvent = {
        id: `tl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        date: tlDate.trim(),
        time: tlTime.trim(),
        timeApproximate: tlTimeApprox || !tlTime.trim(),
        title: effectiveTitle,
        description: tlDesc.trim(),
        linkedEvidenceId: tlLinkedEvidenceId || undefined,
        source: 'user',
        confirmed: true,
      };
      setTlTitle('');
      setTlDesc('');
      setTlTime('');
      setTlTimeApprox(false);
      setTlLinkedEvidenceId('');
      await persistTimelineEvents(
        [...caseRecord.timeline, newEvent],
        `Added timeline event "${effectiveTitle}"`
      );
    }
  };

  // =========================================================================
  // STAGE 6 -> STAGE 7: CONTINUE TO SUBMISSION
  // =========================================================================
  const handleContinueToSubmission = async () => {
    if (!caseRecord) return;
    const reqErr = validateStage1Fields();
    if (reqErr) {
      showNotice(
        'error',
        `Cannot mark report ready while required fields are incomplete: ${reqErr}`
      );
      return;
    }

    setSaving(true);
    try {
      const nextStatus: KavachCaseStatus =
        caseRecord.kavachStatus === 'Draft' ? 'Ready for Submission' : caseRecord.kavachStatus;

      let nextStructuredReport = caseRecord.structuredReport || null;
      if (
        reportTextDraft.trim() &&
        nextStructuredReport &&
        reportTextDraft.trim() !== nextStructuredReport.editableFullReportText.trim()
      ) {
        nextStructuredReport = {
          ...nextStructuredReport,
          editableFullReportText: reportTextDraft.trim(),
          isUserEdited: true,
          source: 'user-edited',
        };
      }

      const updated = await updateCaseRecord(caseRecord.caseCode, {
        kavachStatus: nextStatus,
        workflowStage: 7,
        completedStages: markStagesComplete(completedStages, 1, 2, 3, 4, 5, 6),
        structuredReport: nextStructuredReport,
        aiSummary: reportTextDraft.trim() || caseRecord.aiSummary,
        activityNote: 'Completed final report review and proceeded to Submit or Export',
      });
      syncSavedRecord(updated, false);
      setCurrentStage(7);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: unknown) {
      showNotice('error', e instanceof Error ? e.message : 'Unable to proceed to submission.');
    } finally {
      setSaving(false);
    }
  };

  // =========================================================================
  // STAGE 7: SAVE OFFICIAL COMPLAINT DETAILS & SAVE FOR LATER
  // =========================================================================
  const handleSaveOfficialComplaintDetails = async () => {
    if (!caseRecord) return;
    setSaving(true);
    try {
      const nextStatus: KavachCaseStatus = submittedExternally
        ? 'Submitted Externally'
        : caseRecord.kavachStatus;

      const updated = await updateCaseRecord(caseRecord.caseCode, {
        kavachStatus: nextStatus,
        workflowStage: 7,
        completedStages: markStagesComplete(completedStages, 1, 2, 3, 4, 5, 6, 7),
        officialTracking: {
          submittedExternally,
          authorityOrPortal: portalUsed.trim(),
          portalUrl: 'https://cybercrime.gov.in/',
          statusCheckUrl: 'https://www.cybercrime.gov.in/Webform/chkackstatus.aspx',
          acknowledgementNumber: officialAckNumber.trim(),
          submissionDate: officialSubDate,
          lastManualStatus: caseRecord.officialTracking.lastManualStatus || '',
          lastManualCheckDate: todayIso,
          userNotes: officialNotes.trim(),
          isLiveVerified: false,
        },
        activityNote: submittedExternally
          ? 'Recorded user-provided official portal complaint details'
          : 'Saved official portal filing notes',
      });

      syncSavedRecord(updated, false);
      showNotice(
        'success',
        `Saved official complaint details separately from your permanent KAVACH Case ID (${updated.caseCode}).`
      );
    } catch (e: unknown) {
      showNotice('error', e instanceof Error ? e.message : 'Unable to save official details.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndContinueLater = async () => {
    await handleSaveDraftClick();
    onExitToMyCases();
  };

  const handleCopyCaseCode = () => {
    if (!caseRecord) return;
    navigator.clipboard?.writeText(caseRecord.caseCode);
    setCopiedCaseId(true);
    setTimeout(() => setCopiedCaseId(false), 1800);
  };

  // Computed helpers
  const sortedTimeline = useMemo(
    () => sortTimelineChronologically(caseRecord?.timeline || []),
    [caseRecord?.timeline]
  );
  const confirmedTimeline = useMemo(
    () => sortedTimeline.filter((t) => t.confirmed),
    [sortedTimeline]
  );
  const unconfirmedTimeline = useMemo(
    () => sortedTimeline.filter((t) => !t.confirmed),
    [sortedTimeline]
  );

  const checklistStats = useMemo(() => {
    const items = caseRecord?.missingInfoQuestions || [];
    let resolved = 0;
    let unavailableOrNa = 0;
    let openOrLater = 0;
    for (const q of items) {
      const st =
        q.resolutionState ||
        (q.status === 'answered'
          ? 'available'
          : q.status === 'not-applicable'
            ? 'not-applicable'
            : 'open');
      if (st === 'available') resolved += 1;
      else if (st === 'not-available' || st === 'not-applicable') unavailableOrNa += 1;
      else openOrLater += 1;
    }
    return { total: items.length, resolved, unavailableOrNa, openOrLater };
  }, [caseRecord?.missingInfoQuestions]);

  const recommendations = useMemo(
    () => getRecommendationsForIncident(category, urgencyLevel),
    [category, urgencyLevel]
  );

  return (
    <div className="space-y-6">
      {/* Compact Permanent Case ID Banner when inside Create New Case flow (after Step 1 saves) */}
      {!hideCaseBanner && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-[#0A1428]/95 border border-blue-400/25 p-5 shadow-[0_14px_34px_rgba(2,6,23,0.6)]">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
              Guided Incident Reporting Workflow
            </span>
            <h1 className="mt-1 text-2xl font-extrabold text-white tracking-tight">
              {caseRecord ? caseRecord.title : 'Create New Incident Case'}
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              {caseRecord
                ? 'Your permanent KAVACH Case ID is locked in and remains unchanged across all workflow stages.'
                : 'Complete Step 1 below to generate your permanent KAV-XXXXXXXX Case ID and unlock all 7 workflow stages.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {caseRecord ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#060D1B] border border-cyan-400/40">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  Case ID:
                </span>
                <span className="font-mono text-sm font-extrabold text-cyan-300">
                  {caseRecord.caseCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCaseCode}
                  title="Copy KAVACH Case ID"
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  {copiedCaseId ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            ) : (
              onCancelCreate && (
                <button
                  type="button"
                  onClick={onCancelCreate}
                  className="px-4 py-2 rounded-xl border border-slate-700 bg-[#081122] hover:bg-slate-800 text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* 7-STAGE PROGRESS INDICATOR (Requirement # STEP 9) */}
      <div
        aria-label="Incident workflow progress"
        className="rounded-2xl bg-[#081122]/95 border border-blue-400/20 p-3 sm:p-4"
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {WORKFLOW_STAGES.map((item) => {
            const isActive = currentStage === item.stage;
            const isCompleted = completedStages.includes(item.stage) && !isActive;
            return (
              <button
                key={item.stage}
                type="button"
                onClick={() => handleGoToStage(item.stage)}
                className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white border-cyan-300/45 shadow-md shadow-blue-600/30'
                    : isCompleted
                      ? 'bg-emerald-950/35 hover:bg-emerald-950/55 text-emerald-200 border-emerald-500/30'
                      : 'bg-[#060D1B] hover:bg-[#0D1A33] text-slate-300 border-slate-800'
                }`}
              >
                <span
                  className={`h-6 w-6 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                    isActive
                      ? 'bg-[#050B16]/45 text-cyan-200 border border-cyan-300/40'
                      : isCompleted
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-slate-800/90 text-slate-400'
                  }`}
                >
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : item.stage}
                </span>
                <span className="text-xs font-semibold leading-tight truncate">
                  {item.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Guided Return-to-Checklist Banner when jumping from Step 4 */}
      {returnChecklistItem && (currentStage === 1 || currentStage === 2 || currentStage === 5) && (
        <div className="rounded-2xl bg-cyan-950/45 border border-cyan-400/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
              Guided Update from Missing-Information Checklist
            </span>
            <p className="text-xs sm:text-sm font-semibold text-white">
              {returnChecklistItem.question}
            </p>
            <p className="text-xs text-slate-300">{returnChecklistItem.reason}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={saving || aiLoading}
              onClick={() => handleSaveAndReturnToChecklist(false)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
            >
              Return to Checklist
            </button>
            <button
              type="button"
              disabled={saving || aiLoading}
              onClick={() => handleSaveAndReturnToChecklist(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${aiLoading ? 'animate-spin' : ''}`} />
              Save & Recheck with AI
            </button>
          </div>
        </div>
      )}

      {/* Status / Validation Notice */}
      {feedback && (
        <div
          role="status"
          className={`rounded-xl px-4 py-3 text-xs sm:text-sm flex items-start justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-200'
              : feedback.type === 'error'
                ? 'bg-red-950/60 border border-red-500/40 text-red-200'
                : 'bg-blue-950/60 border border-cyan-400/35 text-cyan-100'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 text-cyan-300 shrink-0 mt-0.5" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs text-slate-400 hover:text-white cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 1: INCIDENT DETAILS                                             */}
      {/* ===================================================================== */}
      {currentStage === 1 && (
        <div className="rounded-2xl bg-[#0A1428]/90 border border-blue-400/20 p-6 sm:p-8 space-y-5">
          <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-cyan-300">
                Step 1 of 7
              </span>
              <h2 className="text-xl font-extrabold text-white mt-0.5">Incident Details</h2>
              <p className="text-xs text-slate-400 mt-1">
                Provide the factual details you know right now. You can save a draft at any point
                and refine details later.
              </p>
            </div>
            {caseRecord && (
              <span className="font-mono text-xs px-3 py-1.5 rounded-lg bg-[#060D1B] border border-cyan-400/30 text-cyan-300 self-start">
                Permanent ID: {caseRecord.caseCode}
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Incident Title <span className="text-cyan-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Impersonation account messaging contacts on Instagram"
              className="w-full px-4 py-2.5 rounded-xl bg-[#060D1B] border border-slate-700 focus:border-cyan-400 focus:outline-none text-sm text-white placeholder:text-slate-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Incident Category <span className="text-cyan-400">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as IncidentCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#060D1B] border border-slate-700 focus:border-cyan-400 focus:outline-none text-sm text-white"
              >
                {INCIDENT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Incident Date <span className="text-cyan-400">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#060D1B] border border-slate-700 focus:border-cyan-400 focus:outline-none text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Approximate Time
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#060D1B] border border-slate-700 focus:border-cyan-400 focus:outline-none text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Urgency Level
              </label>
              <select
                value={urgencyLevel}
                onChange={(e) => setUrgencyLevel(e.target.value as UrgencyLevel)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#060D1B] border border-slate-700 focus:border-cyan-400 focus:outline-none text-sm text-white"
              >
                <option value="standard">Standard Documentation</option>
                <option value="high">High Priority</option>
                <option value="immediate-danger">Immediate Safety Concern (Dial 112)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Platform / App / Website
              </label>
              <input
                type="text"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                placeholder="e.g., Instagram, WhatsApp, Email, Website"
                className="w-full px-4 py-2.5 rounded-xl bg-[#060D1B] border border-slate-700 focus:border-cyan-400 focus:outline-none text-sm text-white placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Location (If Relevant)
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Bengaluru, Karnataka (optional)"
                className="w-full px-4 py-2.5 rounded-xl bg-[#060D1B] border border-slate-700 focus:border-cyan-400 focus:outline-none text-sm text-white placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Time Zone
              </label>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#060D1B] border border-slate-700 focus:border-cyan-400 focus:outline-none text-sm text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Incident Description <span className="text-cyan-400">*</span>
            </label>
            <textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe factually what happened, in your own words, including key messages, events, or actions taken..."
              className="w-full px-4 py-3 rounded-xl bg-[#060D1B] border border-slate-700 focus:border-cyan-400 focus:outline-none text-sm text-white placeholder:text-slate-500 leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                People or Organizations Involved (Optional)
              </label>
              <textarea
                rows={3}
                value={peopleInvolved}
                onChange={(e) => setPeopleInvolved(e.target.value)}
                placeholder="Account usernames, profile URLs, sender handles, phone numbers, or organizations (if you choose to provide them)..."
                className="w-full px-4 py-2.5 rounded-xl bg-[#060D1B] border border-slate-700 focus:border-cyan-400 focus:outline-none text-sm text-white placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Additional Relevant Information (Optional)
              </label>
              <textarea
                rows={3}
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Any platform report ticket IDs, witness context, transaction IDs, or personal notes..."
                className="w-full px-4 py-2.5 rounded-xl bg-[#060D1B] border border-slate-700 focus:border-cyan-400 focus:outline-none text-sm text-white placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Stage 1 Footer Controls */}
          <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveDraftClick}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#060D1B] hover:bg-slate-800 border border-slate-700 text-xs sm:text-sm font-semibold text-slate-200 cursor-pointer"
            >
              <Save className="h-4 w-4 text-cyan-400" />
              {saving ? 'Saving Draft...' : 'Save Draft'}
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={async () => {
                const saved = await saveIncidentCoreAndStage(
                  2,
                  [1],
                  caseRecord
                    ? 'Updated Step 1 incident details and moved to Evidence Inventory'
                    : 'Created permanent KAVACH case and moved to Evidence Inventory'
                );
                if (saved) {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-60 text-white text-sm font-semibold shadow-lg shadow-blue-600/30 cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save & Continue to Evidence'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 2: EVIDENCE INVENTORY                                           */}
      {/* ===================================================================== */}
      {currentStage === 2 && caseRecord && (
        <div className="rounded-2xl bg-[#0A1428]/90 border border-blue-400/20 p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-cyan-300">
                Step 2 of 7
              </span>
              <h2 className="text-xl font-extrabold text-white mt-0.5 flex items-center gap-2">
                <FolderLock className="h-5 w-5 text-cyan-400" />
                Evidence Inventory ({caseRecord.evidence.length})
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Upload screenshots, PDFs, communication exports, or add manual evidence records.
                KAVACH catalogues user-supplied items and never claims forensic verification.
              </p>
            </div>

            <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/25 cursor-pointer shrink-0">
              <Paperclip className="h-4 w-4" />
              Upload Supported Files
              <input
                type="file"
                multiple
                onChange={handleUploadEvidenceFiles}
                className="hidden"
                accept="image/*,.pdf,.txt,.csv,.json,.eml,.doc,.docx"
              />
            </label>
          </div>

          {/* Add Manual / Structured Evidence Form */}
          <div className="rounded-xl bg-[#060D1B] border border-slate-800 p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Add Evidence Item / Communication Record Details
              </p>
              <span className="text-[11px] text-slate-400">
                Works with or without file upload
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Evidence Title *</label>
                <input
                  type="text"
                  value={manualEvTitle}
                  onChange={(e) => setManualEvTitle(e.target.value)}
                  placeholder="e.g., Instagram DM Screenshot"
                  className="w-full px-3 py-2 rounded-lg bg-[#0A1428] border border-slate-700 text-xs text-white placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Evidence Type</label>
                <select
                  value={manualEvKind}
                  onChange={(e) => setManualEvKind(e.target.value as EvidenceRecordKind)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0A1428] border border-slate-700 text-xs text-white"
                >
                  <option value="Screenshot / Image">Image / Screenshot</option>
                  <option value="Document / PDF">Document / PDF</option>
                  <option value="Message / Chat Export">Message / Communication Record</option>
                  <option value="URL / Webpage Link">URL / Webpage Link</option>
                  <option value="Transaction / Ticket Reference">
                    Transaction / Ticket Reference
                  </option>
                  <option value="Other Record">Other Supported Record</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Date / Time (If Known)
                </label>
                <input
                  type="text"
                  value={manualEvDateTime}
                  onChange={(e) => setManualEvDateTime(e.target.value)}
                  placeholder="e.g., 2026-10-24 19:30 or Unknown"
                  className="w-full px-3 py-2 rounded-lg bg-[#0A1428] border border-slate-700 text-xs text-white placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  File Reference / URL (Optional)
                </label>
                <input
                  type="text"
                  value={manualEvRef}
                  onChange={(e) => setManualEvRef(e.target.value)}
                  placeholder="Filename, URL, or UTR/ticket #"
                  className="w-full px-3 py-2 rounded-lg bg-[#0A1428] border border-slate-700 text-xs text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={manualEvDesc}
                onChange={(e) => setManualEvDesc(e.target.value)}
                placeholder="Describe clearly what this evidence item shows..."
                className="flex-1 px-3.5 py-2 rounded-lg bg-[#0A1428] border border-slate-700 text-xs text-white placeholder:text-slate-500"
              />
              <button
                type="button"
                disabled={saving}
                onClick={handleAddManualEvidence}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600/85 hover:bg-blue-500 text-xs font-semibold text-white shrink-0 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Add to Inventory
              </button>
            </div>
          </div>

          {/* Evidence Inventory List */}
          {caseRecord.evidence.length === 0 ? (
            <div className="rounded-xl bg-[#060D1B] border border-slate-800/90 px-6 py-10 text-center">
              <p className="text-sm font-semibold text-slate-200">
                No evidence items added yet
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-lg mx-auto">
                Upload screenshots, PDFs, or message records above—or click Continue if evidence is
                not yet available. Step 4 will help identify optional supporting items you can add
                later.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {caseRecord.evidence.map((ev, index) => {
                const isPreviewOpen = previewEvidenceId === ev.id;
                const isEditing = editingEvidenceId === ev.id;
                const fileRefDisplay =
                  ev.fileReference ||
                  ev.sourceUrl ||
                  (ev.fileSizeBytes ? `${ev.fileName} (${formatBytes(ev.fileSizeBytes)})` : 'N/A');
                const dateAddedDisplay = ev.createdAt
                  ? new Date(ev.createdAt).toLocaleString('en-IN', {
                      year: 'numeric',
                      month: 'short',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Recorded';

                return (
                  <div
                    key={ev.id}
                    className="rounded-xl bg-[#060D1B] border border-slate-800 p-4 space-y-3"
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <input
                            type="text"
                            value={editEvTitle}
                            onChange={(e) => setEditEvTitle(e.target.value)}
                            placeholder="Evidence title"
                            className="px-3 py-2 rounded-lg bg-[#0A1428] border border-slate-700 text-xs text-white"
                          />
                          <select
                            value={editEvKind}
                            onChange={(e) => setEditEvKind(e.target.value as EvidenceRecordKind)}
                            className="px-3 py-2 rounded-lg bg-[#0A1428] border border-slate-700 text-xs text-white"
                          >
                            <option value="Screenshot / Image">Image / Screenshot</option>
                            <option value="Document / PDF">Document / PDF</option>
                            <option value="Message / Chat Export">
                              Message / Communication Record
                            </option>
                            <option value="URL / Webpage Link">URL / Webpage Link</option>
                            <option value="Transaction / Ticket Reference">
                              Transaction / Ticket Reference
                            </option>
                            <option value="Other Record">Other Supported Record</option>
                          </select>
                          <input
                            type="text"
                            value={editEvDateTime}
                            onChange={(e) => setEditEvDateTime(e.target.value)}
                            placeholder="Date/time (if known)"
                            className="px-3 py-2 rounded-lg bg-[#0A1428] border border-slate-700 text-xs text-white"
                          />
                          <input
                            type="text"
                            value={editEvRef}
                            onChange={(e) => setEditEvRef(e.target.value)}
                            placeholder="File reference / URL"
                            className="px-3 py-2 rounded-lg bg-[#0A1428] border border-slate-700 text-xs text-white"
                          />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            value={editEvDesc}
                            onChange={(e) => setEditEvDesc(e.target.value)}
                            placeholder="Description"
                            className="flex-1 px-3 py-2 rounded-lg bg-[#0A1428] border border-slate-700 text-xs text-white"
                          />
                          <button
                            type="button"
                            onClick={handleSaveEditedEvidence}
                            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white cursor-pointer"
                          >
                            Save Item
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingEvidenceId(null)}
                            className="px-3 py-2 rounded-lg bg-slate-800 text-xs text-slate-300 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-950/70 border border-cyan-400/30 text-cyan-300">
                              EV-{String(index + 1).padStart(2, '0')}
                            </span>
                            <span className="text-sm font-bold text-white">{ev.fileName}</span>
                            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[11px] text-slate-300">
                              {ev.recordKind || ev.fileType}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-[#0A162D] border border-blue-400/20 text-[11px] text-cyan-200">
                              {ev.storageIndicator || ev.uploadStatus}
                            </span>
                          </div>

                          <p className="text-xs text-slate-200 leading-relaxed">{ev.description}</p>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px] text-slate-400">
                            <span>
                              <strong className="text-slate-300">Date/Time (if known):</strong>{' '}
                              {ev.capturedAt || 'Not specified'}
                            </span>
                            <span className="truncate">
                              <strong className="text-slate-300">File Reference:</strong>{' '}
                              {fileRefDisplay}
                            </span>
                            <span>
                              <strong className="text-slate-300">Date Added:</strong>{' '}
                              {dateAddedDisplay}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewEvidenceId(isPreviewOpen ? null : ev.id)
                            }
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-cyan-300 cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            {isPreviewOpen ? 'Hide Details' : 'Preview / Details'}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingEvidenceId(ev.id);
                              setEditEvTitle(ev.fileName);
                              setEditEvKind(ev.recordKind || 'Other Record');
                              setEditEvDateTime(ev.capturedAt || '');
                              setEditEvRef(ev.fileReference || ev.sourceUrl || '');
                              setEditEvDesc(ev.description);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              persistEvidenceItems(
                                caseRecord.evidence.filter((item) => item.id !== ev.id),
                                `Removed evidence item "${ev.fileName}"`
                              )
                            }
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 cursor-pointer"
                            aria-label={`Remove ${ev.fileName}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Expandable Evidence Preview & Full Metadata Drawer */}
                    {isPreviewOpen && (
                      <div className="mt-2 pt-3 border-t border-slate-800/90 rounded-lg bg-[#091326] p-3.5 space-y-2.5 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
                          <div>
                            <span className="text-slate-400">Entry Method:</span>{' '}
                            {ev.entryMethod === 'file-upload' ? 'Uploaded File' : 'Manual Record'}
                          </div>
                          <div>
                            <span className="text-slate-400">MIME / Format:</span> {ev.fileType}
                          </div>
                          <div>
                            <span className="text-slate-400">File Reference:</span> {fileRefDisplay}
                          </div>
                          <div>
                            <span className="text-slate-400">Verification Status:</span>{' '}
                            <span className="text-amber-200">
                              User-supplied (unverified by KAVACH)
                            </span>
                          </div>
                        </div>

                        {ev.previewDataUrl && (
                          <div className="pt-1">
                            <p className="text-[11px] text-slate-400 mb-1.5">Image Preview:</p>
                            <img
                              src={ev.previewDataUrl}
                              alt={ev.fileName}
                              className="max-h-56 rounded-lg border border-slate-700 object-contain bg-[#050B16]"
                            />
                          </div>
                        )}

                        {ev.textExcerpt && (
                          <div className="pt-1">
                            <p className="text-[11px] text-slate-400 mb-1">
                              Extracted Text Preview:
                            </p>
                            <pre className="p-3 rounded-lg bg-[#050B16] border border-slate-800 text-[11px] text-slate-300 whitespace-pre-wrap max-h-44 overflow-y-auto font-mono">
                              {ev.textExcerpt}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Stage 2 Navigation */}
          <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => handleGoToStage(1)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#060D1B] hover:bg-slate-800 border border-slate-700 text-xs sm:text-sm font-semibold text-slate-200 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Incident Details
            </button>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveDraftClick}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#060D1B] hover:bg-slate-800 border border-slate-700 text-xs sm:text-sm font-semibold text-slate-200 cursor-pointer"
              >
                <Save className="h-4 w-4 text-cyan-400" />
                Save Draft
              </button>

              <button
                type="button"
                onClick={() => handleGoToStage(3)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-cyan-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-blue-600/30 cursor-pointer"
              >
                Continue to AI Report
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 3: AI REPORT GENERATION                                         */}
      {/* ===================================================================== */}
      {currentStage === 3 && caseRecord && (
        <div className="rounded-2xl bg-[#0A1428]/90 border border-blue-400/20 p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-800 pb-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-cyan-300">
                Step 3 of 7
              </span>
              <h2 className="text-xl font-extrabold text-white mt-0.5 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-cyan-400" />
                AI Report Generation
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Generates a structured 9-section neutral incident report strictly from your
                user-provided facts and evidence descriptions—and automatically checks for missing
                details or supporting evidence.
              </p>
            </div>

            <button
              type="button"
              disabled={aiLoading}
              onClick={() => handleGenerateOrRecheckAi(3)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-60 text-white text-sm font-bold shadow-lg shadow-blue-600/35 shrink-0 cursor-pointer"
            >
              <Sparkles className={`h-4 w-4 ${aiLoading ? 'animate-spin' : ''}`} />
              {aiLoading
                ? 'Generating AI Report & Review...'
                : caseRecord.structuredReport
                  ? 'Generate AI Report (Refresh)'
                  : 'Generate AI Report'}
            </button>
          </div>

          {/* Provenance Legend: User Facts vs AI Organization */}
          <div className="rounded-xl bg-[#060D1B] border border-blue-400/25 p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-500/35 text-emerald-300 font-semibold">
                User-Provided Facts: Sections 1, 3, 5, 6
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-950/70 border border-cyan-400/35 text-cyan-200 font-semibold">
                AI-Organized Summary & Suggestions: Sections 2, 4, 7, 8, 9
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Never invents facts, dates, people, motives, or legal conclusions.
            </span>
          </div>

          {!caseRecord.structuredReport ? (
            <div className="rounded-2xl bg-[#060D1B] border border-slate-800 px-6 py-12 text-center space-y-4">
              <Sparkles className="h-9 w-9 text-cyan-400 mx-auto" />
              <div className="max-w-lg mx-auto space-y-1.5">
                <h3 className="text-base font-bold text-white">
                  Ready to Build Your Structured 9-Section Incident Report
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Click <strong className="text-white">Generate AI Report</strong> above to compile
                  your permanent Case ID (<code className="text-cyan-300">{caseRecord.caseCode}</code>
                  ), incident overview, factual details, timeline, evidence inventory, unknown
                  details, and missing-information checklist.
                </p>
              </div>
              <button
                type="button"
                disabled={aiLoading}
                onClick={() => handleGenerateOrRecheckAi(3)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                {aiLoading ? 'Generating...' : 'Generate AI Report'}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Structured 9-Section Breakdown Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl bg-[#060D1B] border border-slate-800 p-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300">1. Case ID</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300">
                      Permanent KAVACH ID
                    </span>
                  </div>
                  <p className="font-mono text-sm font-bold text-white">{caseRecord.caseCode}</p>
                  <p className="text-[11px] text-slate-400">
                    Internal KAVACH Reference — Not an official government complaint number.
                  </p>
                </div>

                <div className="rounded-xl bg-[#060D1B] border border-slate-800 p-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300">2. Incident Overview</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950/70 text-cyan-200">
                      AI-Organized Neutral Summary
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {caseRecord.structuredReport.incidentOverview}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl bg-[#060D1B] border border-slate-800 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300">
                      6. Important Facts Provided by the User
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300">
                      User-Supplied Facts
                    </span>
                  </div>
                  <ul className="space-y-1 text-xs text-slate-200">
                    {caseRecord.structuredReport.importantUserFacts.map((fact, idx) => (
                      <li key={idx}>• {fact}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl bg-[#060D1B] border border-slate-800 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300">
                      7. Details That Remain Unknown or Unconfirmed
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/60 text-amber-200">
                      No Assumptions Made
                    </span>
                  </div>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {caseRecord.structuredReport.unknownOrUnconfirmedDetails.map((unk, idx) => (
                      <li key={idx}>• {unk}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Automatic Step 4 Callout */}
              <div className="rounded-xl bg-blue-950/45 border border-cyan-400/35 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                    Automatic Missing-Information & Evidence Check Completed
                  </p>
                  <p className="text-xs text-slate-200 mt-0.5">
                    {checklistStats.openOrLater > 0
                      ? `${checklistStats.openOrLater} optional detail or supporting-evidence ${
                          checklistStats.openOrLater === 1 ? 'prompt is' : 'prompts are'
                        } ready for your review in Step 4.`
                      : 'All missing-information and evidence prompts have been reviewed!'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleGoToStage(4)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shrink-0 cursor-pointer"
                >
                  Open AI Review Checklist
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Editable Full Structured Report */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Complete 9-Section Structured Report (Editable Before Saving)
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {caseRecord.structuredReport.isUserEdited
                      ? 'Edited & reviewed by user'
                      : caseRecord.structuredReport.source === 'gemini-server'
                        ? 'Drafted with Gemini AI Assistant'
                        : 'Organized via KAVACH Fact Organizer'}
                  </span>
                </div>
                <textarea
                  rows={16}
                  value={reportTextDraft}
                  onChange={(e) => setReportTextDraft(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-[#060D1B] border border-slate-700 focus:border-cyan-400 focus:outline-none text-xs sm:text-sm font-mono text-slate-100 leading-relaxed"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleSaveEditedReportText}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {saving ? 'Saving Report...' : 'Save Edited AI Report'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stage 3 Navigation */}
          <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => handleGoToStage(2)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#060D1B] hover:bg-slate-800 border border-slate-700 text-xs sm:text-sm font-semibold text-slate-200 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Evidence
            </button>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveDraftClick}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#060D1B] hover:bg-slate-800 border border-slate-700 text-xs sm:text-sm font-semibold text-slate-200 cursor-pointer"
              >
                <Save className="h-4 w-4 text-cyan-400" />
                Save Draft
              </button>

              <button
                type="button"
                onClick={() => handleGoToStage(4)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-cyan-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-blue-600/30 cursor-pointer"
              >
                Continue to Missing Information
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 4: AI REVIEW — MISSING DETAILS & EVIDENCE (STEPS 4 & 5)         */}
      {/* ===================================================================== */}
      {currentStage === 4 && caseRecord && (
        <div className="rounded-2xl bg-[#0A1428]/90 border border-blue-400/20 p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-800 pb-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-cyan-300">
                Step 4 of 7
              </span>
              <h2 className="text-xl font-extrabold text-white mt-0.5 flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-cyan-400" />
                AI Review — Missing Details & Evidence
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Review optional details, timeline clarifications, and supporting evidence relevant
                to <strong className="text-slate-200 capitalize">{caseRecord.category}</strong>.
                None of these items are claimed to be legally mandatory—mark what applies or jump
                directly to add it.
              </p>
            </div>

            <button
              type="button"
              disabled={aiLoading}
              onClick={() => handleGenerateOrRecheckAi(4)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/25 shrink-0 cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${aiLoading ? 'animate-spin' : ''}`} />
              {aiLoading ? 'Rechecking Case...' : 'Recheck with AI'}
            </button>
          </div>

          {/* Checklist Summary Counters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-[#060D1B] border border-slate-800 px-4 py-3">
              <span className="text-[11px] text-slate-400 block">Available / Provided</span>
              <span className="text-lg font-extrabold text-emerald-300">
                {checklistStats.resolved}
              </span>
            </div>
            <div className="rounded-xl bg-[#060D1B] border border-slate-800 px-4 py-3">
              <span className="text-[11px] text-slate-400 block">Not Available / N/A</span>
              <span className="text-lg font-extrabold text-slate-300">
                {checklistStats.unavailableOrNa}
              </span>
            </div>
            <div className="rounded-xl bg-[#060D1B] border border-slate-800 px-4 py-3">
              <span className="text-[11px] text-slate-400 block">
                Open / Need to Add Later
              </span>
              <span className="text-lg font-extrabold text-amber-300">
                {checklistStats.openOrLater}
              </span>
            </div>
          </div>

          {caseRecord.missingInfoQuestions.length === 0 ? (
            <div className="rounded-xl bg-[#060D1B] border border-slate-800 px-6 py-10 text-center space-y-3">
              <p className="text-sm font-semibold text-white">
                Run AI Review to Check for Missing Details & Supporting Evidence
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Click <strong className="text-white">Recheck with AI</strong> to analyze your
                incident details, evidence inventory, and timeline for any helpful clarifications.
              </p>
              <button
                type="button"
                disabled={aiLoading}
                onClick={() => handleGenerateOrRecheckAi(4)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                Run AI Missing-Information Check
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {caseRecord.missingInfoQuestions.map((item) => {
                const effState: ChecklistResolutionState =
                  item.resolutionState ||
                  (item.status === 'answered'
                    ? 'available'
                    : item.status === 'not-applicable'
                      ? 'not-applicable'
                      : 'open');

                const noteValue =
                  checklistNoteDrafts[item.id] !== undefined
                    ? checklistNoteDrafts[item.id]
                    : item.userAnswer || '';

                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-5 space-y-3.5 transition-colors ${
                      effState === 'available'
                        ? 'bg-emerald-950/20 border-emerald-500/30'
                        : effState === 'not-available' || effState === 'not-applicable'
                          ? 'bg-[#060D1B]/80 border-slate-800'
                          : 'bg-[#060D1B] border-blue-400/25'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded bg-blue-950/70 border border-cyan-400/30 text-[11px] font-bold text-cyan-300">
                          {item.category}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Optional / Helpful if available
                        </span>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded text-[11px] font-semibold border ${
                          effState === 'available'
                            ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/35'
                            : effState === 'not-available' || effState === 'not-applicable'
                              ? 'bg-slate-900 text-slate-300 border-slate-700'
                              : 'bg-amber-950/60 text-amber-200 border-amber-500/35'
                        }`}
                      >
                        {formatResolutionLabel(effState, item.status)}
                      </span>
                    </div>

                    <div>
                      <p className="text-sm font-bold text-white">{item.question}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        <strong className="text-slate-300">Why this may help:</strong> {item.reason}
                      </p>
                    </div>

                    {/* Guided Jump Action Buttons (Step 5: Collect Missing Information & Evidence) */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleGuidedJumpAction(item, 'add-details')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                          item.jumpTarget === 'add-details'
                            ? 'bg-blue-600/30 hover:bg-blue-600/45 border-cyan-400/40 text-cyan-200'
                            : 'bg-[#0A1428] hover:bg-slate-800 border-slate-700 text-slate-300'
                        }`}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Add Details
                      </button>

                      <button
                        type="button"
                        onClick={() => handleGuidedJumpAction(item, 'upload-evidence')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                          item.jumpTarget === 'upload-evidence'
                            ? 'bg-blue-600/30 hover:bg-blue-600/45 border-cyan-400/40 text-cyan-200'
                            : 'bg-[#0A1428] hover:bg-slate-800 border-slate-700 text-slate-300'
                        }`}
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                        Upload Evidence
                      </button>

                      <button
                        type="button"
                        onClick={() => handleGuidedJumpAction(item, 'edit-timeline')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                          item.jumpTarget === 'edit-timeline'
                            ? 'bg-blue-600/30 hover:bg-blue-600/45 border-cyan-400/40 text-cyan-200'
                            : 'bg-[#0A1428] hover:bg-slate-800 border-slate-700 text-slate-300'
                        }`}
                      >
                        <Clock className="h-3.5 w-3.5" />
                        Edit Timeline
                      </button>

                      <span className="h-4 w-px bg-slate-800 mx-1 hidden sm:inline-block" />

                      {/* Status Marking Buttons */}
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleMarkChecklistStatus(item.id, 'available', noteValue)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                          effState === 'available'
                            ? 'bg-emerald-600 text-white border-emerald-400'
                            : 'bg-slate-900 hover:bg-slate-800 text-emerald-300 border-slate-700'
                        }`}
                      >
                        Available
                      </button>

                      <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          handleMarkChecklistStatus(item.id, 'not-available', noteValue)
                        }
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                          effState === 'not-available'
                            ? 'bg-slate-700 text-white border-slate-500'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        Mark Not Available
                      </button>

                      <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          handleMarkChecklistStatus(item.id, 'not-applicable', noteValue)
                        }
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                          effState === 'not-applicable'
                            ? 'bg-slate-700 text-white border-slate-500'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        Mark Not Applicable
                      </button>

                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleMarkChecklistStatus(item.id, 'add-later', noteValue)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                          effState === 'add-later'
                            ? 'bg-amber-600 text-white border-amber-400'
                            : 'bg-slate-900 hover:bg-slate-800 text-amber-200 border-slate-700'
                        }`}
                      >
                        Need to Add Later
                      </button>

                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleMarkChecklistStatus(item.id, 'skipped', noteValue)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                          effState === 'skipped'
                            ? 'bg-slate-700 text-white border-slate-500'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        Skip for Now
                      </button>
                    </div>

                    {/* Quick Inline Clarification Input */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <input
                        type="text"
                        value={noteValue}
                        onChange={(e) =>
                          setChecklistNoteDrafts((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        placeholder="Or enter a quick factual clarification / note directly here..."
                        className="flex-1 px-3 py-2 rounded-lg bg-[#0A1428] border border-slate-700 text-xs text-white placeholder:text-slate-500"
                      />
                      {noteValue.trim() !== (item.userAnswer || '').trim() && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() =>
                            handleMarkChecklistStatus(
                              item.id,
                              noteValue.trim() ? 'available' : effState,
                              noteValue
                            )
                          }
                          className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shrink-0 cursor-pointer"
                        >
                          Save Clarification
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Stage 4 Navigation */}
          <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => handleGoToStage(3)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#060D1B] hover:bg-slate-800 border border-slate-700 text-xs sm:text-sm font-semibold text-slate-200 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to AI Report
            </button>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveDraftClick}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#060D1B] hover:bg-slate-800 border border-slate-700 text-xs sm:text-sm font-semibold text-slate-200 cursor-pointer"
              >
                <Save className="h-4 w-4 text-cyan-400" />
                Save Draft
              </button>

              <button
                type="button"
                onClick={() => handleGoToStage(5)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-cyan-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-blue-600/30 cursor-pointer"
              >
                Continue to Chronological Timeline
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 5: CHRONOLOGICAL TIMELINE (STEP 6)                              */}
      {/* ===================================================================== */}
      {currentStage === 5 && caseRecord && (
        <div className="rounded-2xl bg-[#0A1428]/90 border border-blue-400/20 p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-300">
              Step 5 of 7
            </span>
            <h2 className="text-xl font-extrabold text-white mt-0.5 flex items-center gap-2">
              <Clock className="h-5 w-5 text-cyan-400" />
              Chronological Timeline ({confirmedTimeline.length} Confirmed)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Events are automatically ordered chronologically. Unknown or approximate times are
              clearly labeled, and AI-suggested entries require your explicit confirmation before
              being included in your report.
            </p>
          </div>

          {/* Add / Edit Timeline Event Form */}
          <div className="rounded-xl bg-[#060D1B] border border-slate-800 p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-200">
                {editingTlId ? 'Edit Timeline Event' : 'Add Timeline Event'}
              </p>
              {editingTlId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingTlId(null);
                    setTlTitle('');
                    setTlDesc('');
                    setTlTime('');
                    setTlTimeApprox(false);
                    setTlLinkedEvidenceId('');
                  }}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Date (If Known)</label>
                <input
                  type="date"
                  value={tlDate}
                  onChange={(e) => setTlDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0A1428] border border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Time (If Known)</label>
                <input
                  type="time"
                  value={tlTime}
                  onChange={(e) => setTlTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0A1428] border border-slate-700 text-xs text-white"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-[11px] text-slate-400 mb-1">
                  Related Evidence (If Any)
                </label>
                <select
                  value={tlLinkedEvidenceId}
                  onChange={(e) => setTlLinkedEvidenceId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0A1428] border border-slate-700 text-xs text-white"
                >
                  <option value="">None linked</option>
                  {caseRecord.evidence.map((ev, idx) => (
                    <option key={ev.id} value={ev.id}>
                      EV-{String(idx + 1).padStart(2, '0')}: {ev.fileName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={tlTitle}
                onChange={(e) => setTlTitle(e.target.value)}
                placeholder="Event summary (e.g., Received deceptive payment link)"
                className="px-3.5 py-2 rounded-lg bg-[#0A1428] border border-slate-700 text-xs text-white placeholder:text-slate-500"
              />
              <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tlTimeApprox}
                  onChange={(e) => setTlTimeApprox(e.target.checked)}
                  className="rounded border-slate-600"
                />
                Mark time as approximate or exact time unknown
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={tlDesc}
                onChange={(e) => setTlDesc(e.target.value)}
                placeholder="Event description..."
                className="flex-1 px-3.5 py-2 rounded-lg bg-[#0A1428] border border-slate-700 text-xs text-white placeholder:text-slate-500"
              />
              <button
                type="button"
                disabled={saving}
                onClick={handleAddOrUpdateTimelineEvent}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shrink-0 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                {editingTlId ? 'Update Event' : 'Add Event'}
              </button>
            </div>
          </div>

          {/* Chronological Events List */}
          {sortedTimeline.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              No timeline events recorded yet. Add key occurrences above.
            </p>
          ) : (
            <div className="relative pl-6 border-l border-blue-500/35 space-y-4">
              {sortedTimeline.map((ev) => {
                const linkedIdx = ev.linkedEvidenceId
                  ? caseRecord.evidence.findIndex((item) => item.id === ev.linkedEvidenceId)
                  : -1;
                const linkedItem = linkedIdx >= 0 ? caseRecord.evidence[linkedIdx] : null;
                const timeBadge = ev.time
                  ? ev.timeApproximate
                    ? `${ev.time} (Approximate)`
                    : ev.time
                  : 'Time Unknown / Approximate';

                return (
                  <div key={ev.id} className="relative">
                    <span
                      className={`absolute -left-[31px] top-2.5 h-3.5 w-3.5 rounded-full border-2 border-[#0A1428] ${
                        ev.confirmed ? 'bg-cyan-400' : 'bg-amber-400'
                      }`}
                    />
                    <div
                      className={`rounded-xl p-4 border flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
                        ev.confirmed
                          ? 'bg-[#060D1B] border-slate-800'
                          : 'bg-amber-950/20 border-amber-500/35'
                      }`}
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-mono font-bold text-cyan-300">
                            {ev.date || 'Date Unknown'} · {timeBadge}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                              ev.confirmed
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                                : 'bg-amber-950/70 text-amber-200 border-amber-500/40'
                            }`}
                          >
                            {ev.confirmed
                              ? 'Confirmed Event'
                              : 'AI Suggestion — Review & Confirm Required'}
                          </span>
                          {linkedItem && (
                            <span className="px-2 py-0.5 rounded bg-blue-950/60 border border-cyan-400/30 text-[11px] text-cyan-200">
                              Related: EV-{String(linkedIdx + 1).padStart(2, '0')} (
                              {linkedItem.fileName})
                            </span>
                          )}
                        </div>

                        <p className="text-sm font-bold text-white">{ev.title}</p>
                        {ev.description && (
                          <p className="text-xs text-slate-300 leading-relaxed">{ev.description}</p>
                        )}
                        {ev.rationale && !ev.confirmed && (
                          <p className="text-[11px] text-amber-200/85 italic">
                            Suggested because: {ev.rationale}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!ev.confirmed && (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                              persistTimelineEvents(
                                caseRecord.timeline.map((item) =>
                                  item.id === ev.id ? { ...item, confirmed: true } : item
                                ),
                                `Confirmed timeline event "${ev.title}"`
                              )
                            }
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white cursor-pointer"
                          >
                            Confirm Event
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setEditingTlId(ev.id);
                            setTlDate(ev.date || todayIso);
                            setTlTime(ev.time || '');
                            setTlTimeApprox(Boolean(ev.timeApproximate));
                            setTlTitle(ev.title);
                            setTlDesc(ev.description);
                            setTlLinkedEvidenceId(ev.linkedEvidenceId || '');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          disabled={saving}
                          onClick={() =>
                            persistTimelineEvents(
                              caseRecord.timeline.filter((item) => item.id !== ev.id),
                              `Removed timeline event "${ev.title}"`
                            )
                          }
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 cursor-pointer"
                          aria-label={`Remove ${ev.title}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Stage 5 Navigation */}
          <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => handleGoToStage(4)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#060D1B] hover:bg-slate-800 border border-slate-700 text-xs sm:text-sm font-semibold text-slate-200 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Missing Information
            </button>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveDraftClick}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#060D1B] hover:bg-slate-800 border border-slate-700 text-xs sm:text-sm font-semibold text-slate-200 cursor-pointer"
              >
                <Save className="h-4 w-4 text-cyan-400" />
                Save Draft
              </button>

              <button
                type="button"
                onClick={() => handleGoToStage(6)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-cyan-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-blue-600/30 cursor-pointer"
              >
                Continue to Final Report Review
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 6: FINAL AI REPORT REVIEW (STEP 7)                              */}
      {/* ===================================================================== */}
      {currentStage === 6 && caseRecord && (
        <div className="rounded-2xl bg-[#0A1428]/90 border border-blue-400/20 p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-800 pb-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-cyan-300">
                Step 6 of 7
              </span>
              <h2 className="text-xl font-extrabold text-white mt-0.5 flex items-center gap-2">
                <FileCheck2 className="h-5 w-5 text-cyan-400" />
                Final AI Report Review
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Verify your complete incident report, evidence inventory, chronological timeline,
                checklist status, and notes before exporting or opening an official complaint
                portal.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1.5 rounded-lg bg-[#060D1B] border border-cyan-400/35 font-mono text-xs font-bold text-cyan-300">
                Case ID: {caseRecord.caseCode}
              </span>
              <span
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${getStatusBadgeClasses(
                  caseRecord.kavachStatus
                )}`}
              >
                {caseRecord.kavachStatus}
              </span>
            </div>
          </div>

          {/* Completeness & Missing-Information Warning (Non-blocking for optional evidence) */}
          {(!caseRecord.structuredReport ||
            checklistStats.openOrLater > 0 ||
            unconfirmedTimeline.length > 0 ||
            caseRecord.evidence.length === 0) && (
            <div className="rounded-xl bg-amber-950/35 border border-amber-400/35 p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-300 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs text-amber-100">
                <p className="font-bold text-amber-200">
                  Review Notice Before Final Export or Filing
                </p>
                <ul className="space-y-0.5 text-amber-100/90">
                  {!caseRecord.structuredReport && (
                    <li>
                      • You have not generated the structured AI report yet. Click{' '}
                      <strong>Recheck with AI</strong> below to compile all 9 sections
                      automatically.
                    </li>
                  )}
                  {checklistStats.openOrLater > 0 && (
                    <li>
                      • {checklistStats.openOrLater} item(s) in your Missing-Information Checklist
                      remain open or marked “Need to Add Later”. Optional evidence will not block
                      you from continuing, or you can update them anytime.
                    </li>
                  )}
                  {unconfirmedTimeline.length > 0 && (
                    <li>
                      • {unconfirmedTimeline.length} AI-suggested timeline entry(ies) are still
                      unconfirmed and are excluded from confirmed exports until reviewed in Step 5.
                    </li>
                  )}
                  {caseRecord.evidence.length === 0 && (
                    <li>
                      • No supporting files or manual evidence items are attached yet (optional if
                      unavailable).
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* Action Bar: All 6 Required Buttons */}
          <div className="rounded-xl bg-[#060D1B] border border-blue-400/25 p-4 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsEditingReportOnReview((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white cursor-pointer"
            >
              <Edit3 className="h-3.5 w-3.5 text-cyan-300" />
              {isEditingReportOnReview ? 'Done Editing View' : 'Edit Report'}
            </button>

            <button
              type="button"
              onClick={() => handleGoToStage(2)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white cursor-pointer"
            >
              <Paperclip className="h-3.5 w-3.5 text-cyan-300" />
              Add More Evidence
            </button>

            <button
              type="button"
              disabled={aiLoading}
              onClick={() => handleGenerateOrRecheckAi(6)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600/25 hover:bg-blue-600/40 border border-cyan-400/35 text-xs font-semibold text-cyan-200 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${aiLoading ? 'animate-spin' : ''}`} />
              {aiLoading ? 'Rechecking...' : 'Recheck with AI'}
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={handleSaveDraftClick}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0A1428] hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
            >
              <Save className="h-3.5 w-3.5 text-cyan-400" />
              Save Draft
            </button>

            <button
              type="button"
              onClick={() => downloadIncidentPdf(caseRecord)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0A1428] hover:bg-slate-800 border border-cyan-400/35 text-xs font-semibold text-cyan-200 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-cyan-400" />
              Download PDF
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={handleContinueToSubmission}
              className="ml-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-xs sm:text-sm font-bold text-white shadow-lg shadow-blue-600/30 cursor-pointer"
            >
              Continue to Submission
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* 1. Complete Incident Report Preview / Editor */}
          <div className="rounded-xl bg-[#060D1B] border border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Complete Incident Report</h3>
              <span className="font-mono text-xs text-cyan-300">{caseRecord.caseCode}</span>
            </div>

            {isEditingReportOnReview ? (
              <div className="space-y-3">
                <textarea
                  rows={15}
                  value={reportTextDraft}
                  onChange={(e) => setReportTextDraft(e.target.value)}
                  placeholder="Edit your structured incident report here..."
                  className="w-full px-4 py-3 rounded-xl bg-[#0A1428] border border-cyan-400/40 focus:outline-none text-xs sm:text-sm font-mono text-white leading-relaxed"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingReportOnReview(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-xs text-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleSaveEditedReportText}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save Edited Report
                  </button>
                </div>
              </div>
            ) : (
              <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-slate-200 leading-relaxed bg-[#081122] border border-slate-800/90 rounded-xl p-4 max-h-96 overflow-y-auto">
                {reportTextDraft.trim() ||
                  caseRecord.description ||
                  'No report text generated yet. Click "Recheck with AI" or "Edit Report" above.'}
              </pre>
            )}
          </div>

          {/* 2. Evidence Inventory & 3. Chronological Timeline Summary Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl bg-[#060D1B] border border-slate-800 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">
                  Evidence Inventory ({caseRecord.evidence.length})
                </h3>
                <button
                  type="button"
                  onClick={() => handleGoToStage(2)}
                  className="text-xs text-cyan-300 hover:underline cursor-pointer"
                >
                  Manage
                </button>
              </div>
              {caseRecord.evidence.length === 0 ? (
                <p className="text-xs text-slate-400">No evidence items recorded.</p>
              ) : (
                <ul className="space-y-2 text-xs text-slate-300">
                  {caseRecord.evidence.map((ev, idx) => (
                    <li
                      key={ev.id}
                      className="rounded-lg bg-[#091326] border border-slate-800 px-3 py-2"
                    >
                      <span className="font-mono text-cyan-300 font-bold mr-1.5">
                        EV-{String(idx + 1).padStart(2, '0')}
                      </span>
                      <strong className="text-white">{ev.fileName}</strong>{' '}
                      <span className="text-slate-400">({ev.recordKind || ev.fileType})</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">{ev.description}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl bg-[#060D1B] border border-slate-800 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">
                  Chronological Timeline ({confirmedTimeline.length} Confirmed)
                </h3>
                <button
                  type="button"
                  onClick={() => handleGoToStage(5)}
                  className="text-xs text-cyan-300 hover:underline cursor-pointer"
                >
                  Manage
                </button>
              </div>
              {confirmedTimeline.length === 0 ? (
                <p className="text-xs text-slate-400">No confirmed timeline events recorded.</p>
              ) : (
                <ul className="space-y-2 text-xs text-slate-300">
                  {confirmedTimeline.map((ev) => (
                    <li
                      key={ev.id}
                      className="rounded-lg bg-[#091326] border border-slate-800 px-3 py-2"
                    >
                      <span className="font-mono text-cyan-300 mr-1.5">
                        [{ev.date || 'Date Unknown'}{' '}
                        {ev.time
                          ? ev.timeApproximate
                            ? `${ev.time} Approx`
                            : ev.time
                          : 'Time Unknown'}
                        ]
                      </span>
                      <strong className="text-white">{ev.title}</strong>
                      {ev.description && (
                        <p className="text-[11px] text-slate-400 mt-0.5">{ev.description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* 4. Missing-Information Checklist & 5. User Notes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl bg-[#060D1B] border border-slate-800 p-5 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">
                  Missing-Information Checklist ({caseRecord.missingInfoQuestions.length})
                </h3>
                <button
                  type="button"
                  onClick={() => handleGoToStage(4)}
                  className="text-xs text-cyan-300 hover:underline cursor-pointer"
                >
                  Update Statuses
                </button>
              </div>
              {caseRecord.missingInfoQuestions.length === 0 ? (
                <p className="text-xs text-slate-400">No checklist prompts generated yet.</p>
              ) : (
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {caseRecord.missingInfoQuestions.map((q) => (
                    <li key={q.id} className="flex items-start justify-between gap-2">
                      <span className="truncate">• {q.question}</span>
                      <span className="text-[11px] font-semibold text-cyan-300 shrink-0">
                        {formatResolutionLabel(q.resolutionState, q.status)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl bg-[#060D1B] border border-slate-800 p-5 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">
                  User Notes & Parties Recorded
                </h3>
                <button
                  type="button"
                  onClick={() => handleGoToStage(1)}
                  className="text-xs text-cyan-300 hover:underline cursor-pointer"
                >
                  Edit Details
                </button>
              </div>
              <p className="text-xs text-slate-300">
                <strong className="text-slate-400">People / Orgs Involved:</strong>{' '}
                {caseRecord.peopleInvolved?.trim() || 'Not specified'}
              </p>
              <p className="text-xs text-slate-300 whitespace-pre-wrap">
                <strong className="text-slate-400">Additional Notes:</strong>{' '}
                {caseRecord.additionalNotes?.trim() || 'None recorded'}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => handleGoToStage(5)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#060D1B] hover:bg-slate-800 border border-slate-700 text-xs sm:text-sm font-semibold text-slate-200 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Timeline
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={handleContinueToSubmission}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-sm font-bold shadow-lg shadow-blue-600/30 cursor-pointer"
            >
              Continue to Submission
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 7: SUBMIT OR EXPORT YOUR REPORT (STEP 8)                        */}
      {/* ===================================================================== */}
      {currentStage === 7 && caseRecord && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-[#0A1428]/90 border border-blue-400/25 p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-cyan-300">
                  Step 7 of 7 · Final Stage
                </span>
                <h2 className="text-2xl font-extrabold text-white mt-0.5">
                  Submit or Export Your Report
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  KAVACH helps you prepare and organize your report. Official complaint submission
                  is completed on the relevant government portal.
                </p>
              </div>
              <span className="font-mono text-xs sm:text-sm font-extrabold px-3.5 py-2 rounded-xl bg-[#060D1B] border border-cyan-400/40 text-cyan-300 self-start">
                {caseRecord.caseCode}
              </span>
            </div>

            {/* A. Download Report & C. Save and Continue Later */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl bg-[#060D1B] border border-cyan-400/30 p-5 space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                    A. Download Report
                  </span>
                  <h3 className="text-base font-bold text-white">
                    Export Formatted PDF & Text Package
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Includes your complete incident report, permanent KAVACH Case ID (
                    <code className="text-cyan-300">{caseRecord.caseCode}</code>), evidence
                    inventory, chronological timeline, and notes.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => downloadIncidentPdf(caseRecord)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-blue-600/25 cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    Download Formatted PDF Report
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      triggerFileDownload(
                        generatePlainTextReport(caseRecord),
                        `${caseRecord.caseCode.toLowerCase()}-report.txt`,
                        'text/plain;charset=utf-8'
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0A1428] hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
                  >
                    <FileText className="h-3.5 w-3.5 text-cyan-400" />
                    TXT Copy
                  </button>
                </div>
              </div>

              <div className="rounded-xl bg-[#060D1B] border border-slate-800 p-5 space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                    C. Save and Continue Later
                  </span>
                  <h3 className="text-base font-bold text-white">
                    Keep Saved in My Cases Repository
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Not ready to file an external complaint yet? Save your case progress now and
                    reopen <code className="text-cyan-300">{caseRecord.caseCode}</code> from{' '}
                    <strong className="text-slate-200">My Cases</strong> anytime.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleSaveAndContinueLater}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold cursor-pointer"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Save and Continue Later
                  </button>
                </div>
              </div>
            </div>

            {/* B. Submit an Official Complaint */}
            <div className="rounded-xl bg-[#060D1B] border border-blue-400/25 p-5 sm:p-6 space-y-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                  B. Submit an Official Complaint
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white mt-0.5">
                  Official Government Portals Matched to{' '}
                  <span className="capitalize text-cyan-300">{caseRecord.category}</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  KAVACH helps you prepare and organize your report. Official complaint submission
                  is completed on the relevant government portal (opens in a new tab). KAVACH never
                  submits complaints automatically or claims government connection.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendations.publicAuthorities
                  .filter((auth) => Boolean(auth.officialUrl))
                  .map((auth) => (
                    <div
                      key={auth.id}
                      className="rounded-xl bg-[#0A1428] border border-slate-800 p-4 flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-cyan-300">
                          {auth.classificationLabel}
                        </span>
                        <h4 className="text-sm font-bold text-white">{auth.name}</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">{auth.whyRelevant}</p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                        <span className="font-mono text-[11px] text-slate-400 truncate">
                          {auth.officialUrl}
                        </span>
                        <a
                          href={auth.officialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shrink-0"
                        >
                          Open Official Portal
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* D. Record Official Complaint Details (Strictly Separate from KAVACH Case ID) */}
            <div className="rounded-xl bg-[#060D1B] border border-slate-800 p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                    D. Record Official Complaint Details (Optional · User-Provided)
                  </span>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    Log Your External Portal Acknowledgement Number
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Stored strictly separately from your permanent KAVACH Case ID (
                    <code className="text-cyan-300 font-mono">{caseRecord.caseCode}</code>). Your
                    case is only marked as externally submitted if you confirm it below.
                  </p>
                </div>

                <a
                  href="https://www.cybercrime.gov.in/Webform/chkackstatus.aspx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0A1428] hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-cyan-300 shrink-0"
                >
                  Check Status on cybercrime.gov.in
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              <label className="flex items-center gap-2.5 text-xs sm:text-sm text-white font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={submittedExternally}
                  onChange={(e) => setSubmittedExternally(e.target.checked)}
                  className="rounded border-slate-600"
                />
                I confirm that I submitted this complaint on an official external portal
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Portal Used
                  </label>
                  <input
                    type="text"
                    value={portalUsed}
                    onChange={(e) => setPortalUsed(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A1428] border border-slate-700 text-xs sm:text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Official Acknowledgement Number
                  </label>
                  <input
                    type="text"
                    value={officialAckNumber}
                    onChange={(e) => setOfficialAckNumber(e.target.value)}
                    placeholder="Enter portal ack / complaint #"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A1428] border border-slate-700 text-xs sm:text-sm text-white placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Submission Date
                  </label>
                  <input
                    type="date"
                    value={officialSubDate}
                    onChange={(e) => setOfficialSubDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A1428] border border-slate-700 text-xs sm:text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Submission Notes
                </label>
                <textarea
                  rows={2}
                  value={officialNotes}
                  onChange={(e) => setOfficialNotes(e.target.value)}
                  placeholder="Optional notes from your official filing or follow-up..."
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0A1428] border border-slate-700 text-xs sm:text-sm text-white placeholder:text-slate-500"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => handleGoToStage(6)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0A1428] hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Final Review
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveOfficialComplaintDetails}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs sm:text-sm font-semibold text-white cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Official Complaint Details'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
