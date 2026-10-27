import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Lock,
  Save,
  Shield,
} from 'lucide-react';
import {
  DemoAuthorityAssignedCase,
  REVIEWER_CASE_STATUSES,
  ReviewerCaseStatus,
} from '../types/incident';
import {
  apiFetch,
  fetchDemoAuthorityCases,
  updateDemoAuthorityCase,
} from '../utils/apiClient';

export function AuthorityDashboardView() {
  const [cases, setCases] = useState<DemoAuthorityAssignedCase[]>([]);
  const [selectedCode, setSelectedCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [reviewerStatus, setReviewerStatus] = useState<ReviewerCaseStatus>('Under Review');
  const [caseNotes, setCaseNotes] = useState('');
  const [historyNote, setHistoryNote] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [rbacCheckMessage, setRbacCheckMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchDemoAuthorityCases()
      .then((res) => {
        if (!active) return;
        setCases(res.cases);
        if (res.cases.length > 0) {
          const first = res.cases[0];
          setSelectedCode(first.caseCode);
          setReviewerStatus(first.reviewerStatus);
          setCaseNotes(first.caseNotes);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedCase = cases.find((c) => c.caseCode === selectedCode) || cases[0] || null;

  const handleSelectCase = (c: DemoAuthorityAssignedCase) => {
    setSelectedCode(c.caseCode);
    setReviewerStatus(c.reviewerStatus);
    setCaseNotes(c.caseNotes);
    setHistoryNote('');
    setFeedback(null);
  };

  const handleSaveDemoReview = async () => {
    if (!selectedCase) return;
    setSaving(true);
    setFeedback(null);
    try {
      const updated = await updateDemoAuthorityCase(selectedCase.caseCode, {
        reviewerStatus,
        caseNotes,
        historyNote:
          historyNote.trim() || `Demo reviewer updated status to "${reviewerStatus}".`,
      });
      setCases((prev) =>
        prev.map((item) => (item.caseCode === updated.caseCode ? updated : item))
      );
      setHistoryNote('');
      setFeedback(`Updated sample case ${updated.caseCode} in Demo Authority Sandbox.`);
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyCitizenIsolation = async () => {
    try {
      await apiFetch('/api/authority/all-citizen-cases');
    } catch (err: unknown) {
      setRbacCheckMessage(
        err instanceof Error
          ? err.message
          : '403 Forbidden: Citizen accounts cannot view real citizen cases.'
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Mandatory Demo Authority Notice */}
      <div>
        <span className="text-xs font-semibold uppercase tracking-widest text-amber-300">
          Isolated Review Sandbox · Role-Based Access Control Enforced
        </span>
        <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Demo Authority Dashboard
        </h1>
      </div>

      <div className="rounded-2xl bg-amber-950/45 border border-amber-400/40 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <AlertTriangle className="h-5 w-5 text-amber-300 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-white">
              Demo Authority Mode — Not Connected to Real Police or Government Systems
            </p>
            <p className="text-xs text-amber-100/85 leading-relaxed">
              To protect citizen privacy, real citizen cases are strictly isolated on the server.
              This sandbox displays pre-seeded fictional sample cases only so reviewers can inspect
              how an assigned case workflow operates.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleVerifyCitizenIsolation}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#081122] hover:bg-slate-900 border border-amber-400/35 text-xs font-semibold text-amber-200 shrink-0 cursor-pointer"
        >
          <Lock className="h-3.5 w-3.5" />
          Verify Citizen RBAC Isolation
        </button>
      </div>

      {rbacCheckMessage && (
        <div className="rounded-xl bg-blue-950/60 border border-cyan-400/35 px-4 py-3 text-xs text-cyan-100 flex items-center gap-2.5">
          <Shield className="h-4 w-4 text-cyan-300 shrink-0" />
          <span>{rbacCheckMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl bg-[#0A1428]/90 border border-slate-800 p-12 text-center text-sm text-slate-400">
          Loading sample assigned cases...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Assigned Sample Queue */}
          <div className="lg:col-span-4 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
              Sample Assigned Cases ({cases.length})
            </h2>
            {cases.map((c) => {
              const isSelected = selectedCase?.caseCode === c.caseCode;
              return (
                <button
                  key={c.caseCode}
                  type="button"
                  onClick={() => handleSelectCase(c)}
                  className={`w-full text-left rounded-2xl p-4 border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#0F1F3D] border-cyan-400/50 shadow-lg shadow-blue-900/30'
                      : 'bg-[#0A1428]/85 border-slate-800 hover:border-blue-400/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-cyan-300">{c.caseCode}</span>
                    <span className="px-2 py-0.5 rounded bg-amber-950/70 border border-amber-400/30 text-[10px] font-semibold text-amber-200">
                      Sample Only
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-bold text-white line-clamp-2">{c.title}</p>
                  <p className="mt-1.5 text-xs text-slate-400">{c.reviewerStatus}</p>
                </button>
              );
            })}
          </div>

          {/* Case Inspection & Review Panel */}
          {selectedCase && (
            <div className="lg:col-span-8 rounded-2xl bg-[#0A1428]/90 border border-blue-400/20 p-6 space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono text-sm font-extrabold text-cyan-300 px-2.5 py-1 rounded bg-[#060D1B] border border-cyan-400/30">
                    {selectedCase.caseCode}
                  </span>
                  <span className="text-xs text-slate-400">{selectedCase.assignedUnitLabel}</span>
                </div>
                <h2 className="mt-3 text-xl font-extrabold text-white">{selectedCase.title}</h2>
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-400">
                  <span className="capitalize">Category: {selectedCase.category}</span>
                  <span>
                    Date: {selectedCase.incidentDate} {selectedCase.incidentTime}
                  </span>
                  <span>Platform: {selectedCase.platform}</span>
                  <span>Location: {selectedCase.location}</span>
                </div>
              </div>

              {feedback && (
                <div className="rounded-xl bg-emerald-950/60 border border-emerald-500/40 px-4 py-3 text-xs text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>{feedback}</span>
                </div>
              )}

              <div className="rounded-xl bg-[#060D1B] border border-slate-800 p-4 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-cyan-400" />
                  Sample Incident Summary & Description
                </h3>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {selectedCase.summary}
                </p>
              </div>

              {/* Evidence & Timeline Preview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl bg-[#060D1B] border border-slate-800 p-4 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Sample Evidence ({selectedCase.evidence.length})
                  </h3>
                  {selectedCase.evidence.map((ev, i) => (
                    <div key={i} className="text-xs text-slate-300 border-t border-slate-800/80 pt-2">
                      <p className="font-semibold text-white">{ev.fileName}</p>
                      <p className="text-slate-400">{ev.description}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl bg-[#060D1B] border border-slate-800 p-4 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Sample Timeline ({selectedCase.timeline.length})
                  </h3>
                  {selectedCase.timeline.map((tl, i) => (
                    <div key={i} className="text-xs text-slate-300 border-t border-slate-800/80 pt-2">
                      <p className="font-mono text-[11px] text-cyan-300">
                        {tl.date} {tl.time}
                      </p>
                      <p className="font-semibold text-white">{tl.title}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Update Sample Status & Case Notes */}
              <div className="rounded-xl bg-[#060D1B] border border-blue-400/25 p-5 space-y-4">
                <h3 className="text-sm font-bold text-white">
                  Update Demo Review Status & Case Notes
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Review Status
                    </label>
                    <select
                      value={reviewerStatus}
                      onChange={(e) => setReviewerStatus(e.target.value as ReviewerCaseStatus)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A1428] border border-slate-700 text-xs sm:text-sm text-white"
                    >
                      {REVIEWER_CASE_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Audit History Note
                    </label>
                    <input
                      type="text"
                      value={historyNote}
                      onChange={(e) => setHistoryNote(e.target.value)}
                      placeholder="Short note for review log..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A1428] border border-slate-700 text-xs sm:text-sm text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Reviewer Case Notes
                  </label>
                  <textarea
                    rows={3}
                    value={caseNotes}
                    onChange={(e) => setCaseNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A1428] border border-slate-700 text-xs sm:text-sm text-white"
                  />
                </div>

                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveDemoReview}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Demo Review Update'}
                </button>
              </div>

              {/* Review History */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Review Status History
                </h3>
                <div className="space-y-2">
                  {selectedCase.reviewHistory.map((h) => (
                    <div
                      key={h.id}
                      className="rounded-lg bg-[#060D1B] border border-slate-800 px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2"
                    >
                      <div>
                        <span className="font-semibold text-cyan-300">{h.newStatus}</span>
                        <span className="text-slate-400"> — {h.note}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(h.timestamp).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
