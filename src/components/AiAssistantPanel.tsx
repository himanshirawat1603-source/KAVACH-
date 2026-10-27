import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Save,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Cpu,
  Plus,
  Download,
} from 'lucide-react';
import {
  IncidentRecord,
  MissingInfoQuestion,
  TimelineEvent,
  WorkspaceTab,
} from '../types/incident';
import { runLocalFallbackAnalysis } from '../data/demoIncident';
import { downloadIncidentPdf, sortTimelineChronologically } from '../utils/pdfGenerator';

interface AiAssistantPanelProps {
  incident: IncidentRecord;
  onUpdateIncident: (patch: Partial<IncidentRecord>, activityNote?: string) => void;
  onBack: () => void;
  onNext: () => void;
  onNavigateTab: (tab: WorkspaceTab) => void;
}

interface CandidateTimelineSuggestion {
  date: string;
  time: string;
  title: string;
  description: string;
  rationale: string;
}

export const AiAssistantPanel: React.FC<AiAssistantPanelProps> = ({
  incident,
  onUpdateIncident,
  onBack,
  onNext,
  onNavigateTab,
}) => {
  const [serverGeminiConfigured, setServerGeminiConfigured] = useState<boolean | null>(null);
  const [consentChecked, setConsentChecked] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [summaryDraft, setSummaryDraft] = useState(incident.aiSummary);
  const [summarySavedToast, setSummarySavedToast] = useState(false);
  const [pdfToast, setPdfToast] = useState(false);

  const [pendingTimelineCandidates, setPendingTimelineCandidates] = useState<
    CandidateTimelineSuggestion[]
  >([]);
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setSummaryDraft(incident.aiSummary);
    const initialAnswers: Record<string, string> = {};
    incident.missingInfoQuestions.forEach((q) => {
      initialAnswers[q.id] = q.userAnswer || '';
    });
    setAnswerDrafts(initialAnswers);
  }, [incident.id, incident.aiSummary]);

  useEffect(() => {
    let active = true;
    fetch('/api/ai/status')
      .then((res) => res.json())
      .then((data) => {
        if (active) setServerGeminiConfigured(Boolean(data.configured));
      })
      .catch(() => {
        if (active) setServerGeminiConfigured(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const confirmedTimeline = useMemo(
    () => sortTimelineChronologically(incident.timeline.filter((t) => t.confirmed)),
    [incident.timeline]
  );

  const handleRunServerGemini = async () => {
    if (!consentChecked) {
      setErrorMessage(
        'Please confirm the privacy awareness checkbox above before sending incident text to the server-side Gemini endpoint.'
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/ai/analyze-incident', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: incident.title,
          category: incident.category,
          platform: incident.platform,
          date: incident.date,
          time: incident.time,
          description: incident.description,
          additionalNotes: incident.additionalNotes,
          evidence: incident.evidence.map((ev) => ({
            fileName: ev.fileName,
            fileType: ev.fileType,
            entryMethod: ev.entryMethod,
            storageIndicator: ev.storageIndicator || ev.uploadStatus,
            description: ev.description,
            sourceUrl: ev.sourceUrl,
            capturedAt: ev.capturedAt,
          })),
          timeline: incident.timeline.map((t) => ({
            date: t.date,
            time: t.time,
            title: t.title,
            description: t.description,
            source: t.source,
            confirmed: t.confirmed,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate AI review.');
      }

      const existingAnswered = incident.missingInfoQuestions.filter(
        (q) => q.status === 'answered'
      );

      const newQuestions: MissingInfoQuestion[] = (data.missingInfoQuestions || []).map(
        (
          q: { question: string; reason: string; category: string },
          idx: number
        ): MissingInfoQuestion => ({
          id: `mq-ai-${Date.now()}-${idx}`,
          question: q.question,
          reason: q.reason,
          category: q.category || 'Documentation Gap',
          status: 'open',
          userAnswer: '',
          source: 'gemini-server',
        })
      );

      setSummaryDraft(data.neutralSummary || '');
      setPendingTimelineCandidates(data.suggestedTimelineEvents || []);

      onUpdateIncident(
        {
          aiSummary: data.neutralSummary || '',
          aiEvidenceIndexSummary: data.evidenceIndexSummary || '',
          aiSummarySource: 'gemini-server',
          aiSummaryUpdatedAt: new Date().toISOString(),
          missingInfoQuestions: [...existingAnswered, ...newQuestions],
        },
        'Generated neutral AI summary, evidence index, and missing-detail prompts via server-side Gemini.'
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Could not reach the server-side Gemini endpoint. Try the Local Rule-Based Check instead.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunLocalFallback = () => {
    setErrorMessage(null);
    const result = runLocalFallbackAnalysis(incident);
    const existingAnswered = incident.missingInfoQuestions.filter(
      (q) => q.status === 'answered'
    );

    const mappedQuestions: MissingInfoQuestion[] = result.missingInfoQuestions.map((q, idx) => ({
      id: `mq-local-${Date.now()}-${idx}`,
      question: q.question,
      reason: q.reason,
      category: q.category,
      status: 'open',
      userAnswer: '',
      source: 'local-simulated',
    }));

    setSummaryDraft(result.neutralSummary);
    setPendingTimelineCandidates(result.suggestedTimelineEvents);

    onUpdateIncident(
      {
        aiSummary: result.neutralSummary,
        aiEvidenceIndexSummary: result.evidenceIndexSummary,
        aiSummarySource: 'local-simulated',
        aiSummaryUpdatedAt: new Date().toISOString(),
        missingInfoQuestions: [...existingAnswered, ...mappedQuestions],
      },
      'Compiled neutral summary and gap questions via Local Rule-Based Check.'
    );
  };

  const handleSaveManualSummary = () => {
    onUpdateIncident(
      {
        aiSummary: summaryDraft,
        aiSummarySource: 'user-edited',
        aiSummaryUpdatedAt: new Date().toISOString(),
      },
      'Reviewed and edited neutral incident summary.'
    );
    setSummarySavedToast(true);
    setTimeout(() => setSummarySavedToast(false), 3000);
  };

  const handleDirectPdfExport = () => {
    const updatedRecord: IncidentRecord = {
      ...incident,
      aiSummary: summaryDraft,
    };
    downloadIncidentPdf(updatedRecord);
    setPdfToast(true);
    setTimeout(() => setPdfToast(false), 3500);
  };

  const handleSaveQuestionAnswer = (questionId: string) => {
    const val = (answerDrafts[questionId] || '').trim();
    const updated = incident.missingInfoQuestions.map((q) =>
      q.id === questionId
        ? {
            ...q,
            userAnswer: val,
            status: (val ? 'answered' : 'open') as MissingInfoQuestion['status'],
          }
        : q
    );
    onUpdateIncident({ missingInfoQuestions: updated }, 'Recorded clarification for open question.');
  };

  const handleMarkNotApplicable = (questionId: string) => {
    const updated = incident.missingInfoQuestions.map((q) =>
      q.id === questionId
        ? {
            ...q,
            status: (q.status === 'not-applicable'
              ? 'open'
              : 'not-applicable') as MissingInfoQuestion['status'],
          }
        : q
    );
    onUpdateIncident({ missingInfoQuestions: updated });
  };

  const handleAddCandidateToTimeline = (cand: CandidateTimelineSuggestion, index: number) => {
    const newTlEvent: TimelineEvent = {
      id: `tl-sug-${Date.now()}-${index}`,
      date: cand.date === 'Unspecified' ? '' : cand.date,
      time: cand.time === 'Unspecified' ? '' : cand.time,
      title: cand.title,
      description: cand.description,
      source: 'ai-suggestion',
      confirmed: false,
      rationale: cand.rationale,
    };
    onUpdateIncident(
      {
        timeline: [...incident.timeline, newTlEvent],
      },
      'Queued unconfirmed AI timeline suggestion for citizen verification.'
    );
    setPendingTimelineCandidates((prev) => prev.filter((_, idx) => idx !== index));
  };

  const sourceLabel = () => {
    switch (incident.aiSummarySource) {
      case 'gemini-server':
        return 'AI-Organized Draft (Server-Side Gemini 3.8 Flash) · Requires Citizen Review';
      case 'local-simulated':
        return 'Local Rule-Based Organization (Offline Fallback) · Requires Citizen Review';
      case 'user-edited':
        return 'Reviewed & Edited Directly by User';
      case 'demo':
        return 'Sample Fictional Demo Summary · Editable';
      default:
        return 'Not generated yet';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-[#2563EB] tabular-nums">
            AI-Assisted Report Preparation · Case {incident.caseCode}
          </p>
          <h1 className="font-display text-2xl font-bold text-[#0B1220] tracking-tight mt-0.5">
            Neutral Summary, Evidence Index &amp; Gap Check
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Organizes user-provided facts into a neutral summary, timeline review, evidence index,
            and missing-detail checklist—never inventing facts or verifying legal validity.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDirectPdfExport}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0B1220] hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-4 h-4 text-[#22D3EE]" />
          <span>Export PDF Now</span>
        </button>
      </div>

      {pdfToast && (
        <div
          role="status"
          className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-xs font-medium text-emerald-900"
        >
          Exported PDF report for {incident.caseCode} containing reference ID, summary, timeline,
          evidence index, and disclaimers.
        </div>
      )}

      {/* AI Generation Controls + Explicit Consent Gate */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="pb-3 border-b border-slate-100">
          <h2 className="font-display text-base font-semibold text-[#0B1220]">
            Run AI Organization Assistant
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Backend status:{' '}
            {serverGeminiConfigured === null
              ? 'Checking server-side Gemini configuration...'
              : serverGeminiConfigured
                ? 'Server-side Gemini API (gemini-3.8-flash) connected'
                : 'Gemini key not configured — Local Rule-Based Check active'}
          </p>
        </div>

        <label className="flex items-start gap-3 p-3.5 bg-[#F8FAFC] border border-slate-200 rounded-lg cursor-pointer">
          <input
            type="checkbox"
            checked={consentChecked}
            onChange={(e) => setConsentChecked(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[#2563EB] rounded"
          />
          <span className="text-xs text-slate-700 leading-relaxed">
            <strong className="font-semibold text-[#0B1220]">Informed Consent for AI Processing:</strong>{' '}
            I consent to sending the text entered in this draft (title, description, timeline text,
            and evidence notes—never raw binary files) to KAVACH’s server-side Gemini endpoint to
            organize a neutral summary, evidence index, and missing-information questions.
          </span>
        </label>

        {errorMessage && (
          <div
            role="alert"
            className="bg-red-50 border border-red-200 rounded-lg p-3.5 flex items-start gap-2.5 text-xs text-red-800"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">AI Request Notice</p>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={handleRunServerGemini}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#2563EB] hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Organizing User-Provided Information...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Organize with Gemini AI</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={handleRunLocalFallback}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <Cpu className="w-4 h-4 text-slate-600" />
            <span>Run Local Rule-Based Organizer (Offline Fallback)</span>
          </button>
        </div>
      </div>

      {/* 1. Editable Neutral Incident Summary */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-semibold text-[#0B1220]">
              1. Neutral Incident Summary (Editable)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{sourceLabel()}</p>
          </div>
          <span className="font-mono text-xs text-slate-400 tabular-nums">
            {summaryDraft.trim() ? summaryDraft.trim().split(/\s+/).length : 0} words
          </span>
        </div>

        <textarea
          rows={6}
          value={summaryDraft}
          onChange={(e) => setSummaryDraft(e.target.value)}
          placeholder="Click 'Organize with Gemini AI' above or write your own neutral summary here."
          aria-label="Editable incident summary"
          className="w-full px-4 py-3 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg text-[#0B1220] leading-relaxed focus:bg-white focus:outline-none focus:border-[#2563EB]"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            AI organization is strictly separated from confirmed user facts until you review and
            save your edits.
          </p>
          <div className="flex items-center gap-3">
            {summarySavedToast && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Summary saved
              </span>
            )}
            <button
              type="button"
              onClick={handleSaveManualSummary}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0B1220] hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Reviewed Summary</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Chronological Timeline & 3. Evidence Index Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-base font-semibold text-[#0B1220]">
              2. Chronological Event Timeline ({confirmedTimeline.length} Confirmed)
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab('timeline')}
              className="text-xs font-semibold text-[#2563EB] hover:underline cursor-pointer"
            >
              Edit Timeline
            </button>
          </div>
          {confirmedTimeline.length === 0 ? (
            <p className="text-xs text-slate-500">
              No user-confirmed timeline entries yet. Add events in the Timeline step.
            </p>
          ) : (
            <ul className="space-y-2 text-xs">
              {confirmedTimeline.slice(0, 4).map((t) => (
                <li key={t.id} className="p-2.5 bg-[#F8FAFC] border border-slate-200 rounded-lg">
                  <span className="font-mono font-semibold text-[#2563EB] tabular-nums">
                    {t.date} {t.time || '--:--'}
                  </span>{' '}
                  · <strong className="text-[#0B1220]">{t.title}</strong>
                </li>
              ))}
            </ul>
          )}

          {pendingTimelineCandidates.length > 0 && (
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <p className="text-xs font-semibold text-amber-900">
                Unconfirmed AI Timeline Suggestions ({pendingTimelineCandidates.length})
              </p>
              {pendingTimelineCandidates.map((cand, idx) => (
                <div
                  key={`${cand.title}-${idx}`}
                  className="bg-amber-50/70 border border-dashed border-amber-300 rounded-lg p-3 space-y-1.5 text-xs"
                >
                  <p className="font-semibold text-[#0B1220]">{cand.title}</p>
                  <p className="text-slate-600">{cand.description}</p>
                  <button
                    type="button"
                    onClick={() => handleAddCandidateToTimeline(cand, idx)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-950 bg-amber-200/80 hover:bg-amber-200 rounded cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Send to Timeline as Unconfirmed Suggestion</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-base font-semibold text-[#0B1220]">
              3. Organized Evidence Index ({incident.evidence.length} Items)
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab('evidence')}
              className="text-xs font-semibold text-[#2563EB] hover:underline cursor-pointer"
            >
              Manage Evidence
            </button>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed bg-[#F8FAFC] border border-slate-200 rounded-lg p-3">
            {incident.aiEvidenceIndexSummary ||
              (incident.evidence.length > 0
                ? `${incident.evidence.length} user-supplied item(s) cataloged. Run the AI Organizer above to generate a structured index summary.`
                : 'No evidence records logged yet.')}
          </p>
          <p className="text-[11px] text-slate-500">
            Note: Evidence index organizes user-reported labels only; authenticity and legal
            validity are not verified.
          </p>
        </div>
      </div>

      {/* 4. Missing or Unclear Details */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div>
          <h2 className="font-display text-base font-semibold text-[#0B1220]">
            4. Missing or Unclear Details Identified ({incident.missingInfoQuestions.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            AI highlights information not yet provided instead of guessing. Add clarifications
            below or leave open so your report transparently notes what is unknown.
          </p>
        </div>

        {incident.missingInfoQuestions.length === 0 ? (
          <div className="py-8 text-center bg-[#F8FAFC] border border-slate-200 rounded-lg">
            <HelpCircle className="w-7 h-7 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">
              No missing-detail prompts generated yet
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Click “Organize with Gemini AI” or “Run Local Rule-Based Organizer” above.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {incident.missingInfoQuestions.map((q) => {
              const isAnswered = q.status === 'answered';
              const isNA = q.status === 'not-applicable';

              return (
                <div key={q.id} className="py-4 first:pt-0 last:pb-0 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                      <span className="font-semibold text-[#2563EB]">{q.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Status:{' '}
                        <strong className="text-slate-700">
                          {isAnswered
                            ? 'User Clarified'
                            : isNA
                              ? 'Not Applicable'
                              : 'Unanswered / Missing'}
                        </strong>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleMarkNotApplicable(q.id)}
                      className="text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2 cursor-pointer"
                    >
                      {isNA ? 'Reopen Question' : 'Mark Not Applicable'}
                    </button>
                  </div>

                  <p
                    className={`font-display text-sm font-semibold ${
                      isNA ? 'line-through text-slate-400' : 'text-[#0B1220]'
                    }`}
                  >
                    {q.question}
                  </p>
                  <p className="text-xs text-slate-500">{q.reason}</p>

                  {!isNA && (
                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <input
                        type="text"
                        value={answerDrafts[q.id] ?? q.userAnswer}
                        onChange={(e) =>
                          setAnswerDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))
                        }
                        placeholder="Provide factual detail if known (or leave blank)..."
                        className="flex-1 px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-300 rounded-lg text-[#0B1220] focus:bg-white focus:outline-none focus:border-[#2563EB]"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveQuestionAnswer(q.id)}
                        className="px-3.5 py-2 text-xs font-semibold text-white bg-[#0B1220] hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {isAnswered ? 'Update Clarification' : 'Save Clarification'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Step Footer Navigation */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Timeline</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (summaryDraft !== incident.aiSummary) {
              onUpdateIncident({
                aiSummary: summaryDraft,
                aiSummarySource: 'user-edited',
                aiSummaryUpdatedAt: new Date().toISOString(),
              });
            }
            onNext();
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
        >
          <span>Review Structured Report &amp; PDF</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
