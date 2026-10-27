import React, { useState, useMemo } from 'react';
import {
  Plus,
  Clock,
  CheckCircle2,
  HelpCircle,
  Edit3,
  Trash2,
  Check,
  X,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { IncidentRecord, TimelineEvent } from '../types/incident';
import { sortTimelineChronologically } from '../utils/pdfGenerator';

interface TimelineBuilderProps {
  incident: IncidentRecord;
  onUpdateTimeline: (timeline: TimelineEvent[]) => void;
  onBack: () => void;
  onNext: () => void;
}

export const TimelineBuilder: React.FC<TimelineBuilderProps> = ({
  incident,
  onUpdateTimeline,
  onBack,
  onNext,
}) => {
  const [date, setDate] = useState(incident.date || '');
  const [time, setTime] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [linkedEvidenceId, setLinkedEvidenceId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLinkedEvidence, setEditLinkedEvidence] = useState('');

  const sortedTimeline = useMemo(
    () => sortTimelineChronologically(incident.timeline),
    [incident.timeline]
  );

  const confirmedCount = useMemo(
    () => incident.timeline.filter((e) => e.confirmed).length,
    [incident.timeline]
  );

  const suggestionCount = useMemo(
    () => incident.timeline.filter((e) => !e.confirmed).length,
    [incident.timeline]
  );

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date.trim()) {
      setFormError('Please provide the date for this timeline event.');
      return;
    }
    if (!title.trim()) {
      setFormError('Please enter a short factual title for what happened.');
      return;
    }
    setFormError(null);

    const newEvent: TimelineEvent = {
      id: `tl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date,
      time,
      title: title.trim(),
      description: description.trim() || title.trim(),
      source: 'user',
      confirmed: true,
      linkedEvidenceId: linkedEvidenceId || undefined,
    };

    onUpdateTimeline([...incident.timeline, newEvent]);
    setTime('');
    setTitle('');
    setDescription('');
    setLinkedEvidenceId('');
  };

  const beginEdit = (ev: TimelineEvent) => {
    setEditingId(ev.id);
    setEditDate(ev.date || incident.date || '');
    setEditTime(ev.time || '');
    setEditTitle(ev.title);
    setEditDescription(ev.description);
    setEditLinkedEvidence(ev.linkedEvidenceId || '');
  };

  const saveEditAndConfirm = (id: string) => {
    if (!editTitle.trim()) return;
    const updated = incident.timeline.map((ev) =>
      ev.id === id
        ? {
            ...ev,
            date: editDate,
            time: editTime,
            title: editTitle.trim(),
            description: editDescription.trim(),
            linkedEvidenceId: editLinkedEvidence || undefined,
            confirmed: true,
          }
        : ev
    );
    onUpdateTimeline(updated);
    setEditingId(null);
  };

  const confirmSuggestionDirectly = (ev: TimelineEvent) => {
    if (!ev.date) {
      // Prompt user to supply missing date/time inline first
      beginEdit(ev);
      return;
    }
    const updated = incident.timeline.map((item) =>
      item.id === ev.id ? { ...item, confirmed: true } : item
    );
    onUpdateTimeline(updated);
  };

  const deleteEvent = (id: string) => {
    onUpdateTimeline(incident.timeline.filter((ev) => ev.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-[#2563EB] tabular-nums">
            Step 03 of 05 · Chronological Sequence
          </p>
          <h1 className="font-display text-2xl font-bold text-[#0B1220] tracking-tight mt-0.5">
            Incident Timeline Builder
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Events are automatically ordered chronologically. Confirmed user records are strictly
            distinguished from unconfirmed AI suggestions.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-600 tabular-nums shrink-0">
          <span className="inline-flex items-center gap-1.5 font-medium text-[#0B1220]">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {confirmedCount} Confirmed
          </span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1.5 font-medium text-amber-800">
            <HelpCircle className="w-4 h-4 text-amber-600" />
            {suggestionCount} Unconfirmed AI {suggestionCount === 1 ? 'Suggestion' : 'Suggestions'}
          </span>
        </div>
      </div>

      {/* Add Timeline Event Form */}
      <form
        onSubmit={handleAddEvent}
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
      >
        <h2 className="font-display text-base font-semibold text-[#0B1220]">
          Add Confirmed Timeline Event
        </h2>

        {formError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-3">
            <label htmlFor="tl-date" className="block text-xs font-semibold text-slate-700 mb-1">
              Date <span className="text-red-600">*</span>
            </label>
            <input
              id="tl-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg text-[#0B1220] focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="tl-time" className="block text-xs font-semibold text-slate-700 mb-1">
              Time
            </label>
            <input
              id="tl-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg text-[#0B1220] focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div className="sm:col-span-7">
            <label htmlFor="tl-title" className="block text-xs font-semibold text-slate-700 mb-1">
              Event Summary <span className="text-red-600">*</span>
            </label>
            <input
              id="tl-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Received first threatening DM from @account_handle"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-[#0B1220] placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
          <div className="sm:col-span-8">
            <label htmlFor="tl-desc" className="block text-xs font-semibold text-slate-700 mb-1">
              Factual Details (Optional)
            </label>
            <input
              id="tl-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Specific details, quoted message snippet, or action taken at this time"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-[#0B1220] placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div className="sm:col-span-4">
            <label htmlFor="tl-ev" className="block text-xs font-semibold text-slate-700 mb-1">
              Linked Evidence (Optional)
            </label>
            <select
              id="tl-ev"
              value={linkedEvidenceId}
              onChange={(e) => setLinkedEvidenceId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-[#0B1220] focus:outline-none focus:border-[#2563EB]"
            >
              <option value="">None linked</option>
              {incident.evidence.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.fileName.slice(0, 42)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0B1220] hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Event to Timeline</span>
          </button>
        </div>
      </form>

      {/* Chronological Timeline List */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="font-display text-base font-semibold text-[#0B1220] mb-6">
          Chronological Sequence ({sortedTimeline.length})
        </h2>

        {sortedTimeline.length === 0 ? (
          <div className="py-10 text-center">
            <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-800">No timeline events recorded yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Add key milestones above—such as when the first message arrived, when screenshots
              were captured, and when reports were filed.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 border-l border-slate-200 space-y-6">
            {sortedTimeline.map((ev) => {
              const isEditing = editingId === ev.id;
              const isUnconfirmedAi = !ev.confirmed;
              const linkedEv = incident.evidence.find((item) => item.id === ev.linkedEvidenceId);

              return (
                <div key={ev.id} className="relative">
                  {/* Timeline node marker */}
                  <div
                    className={`absolute -left-[31px] sm:-left-[39px] top-1.5 w-3.5 h-3.5 rounded-full border-2 ${
                      isUnconfirmedAi
                        ? 'bg-amber-100 border-amber-500'
                        : 'bg-emerald-600 border-white ring-2 ring-emerald-100'
                    }`}
                  />

                  <div
                    className={`rounded-xl p-4 sm:p-5 border transition-colors ${
                      isUnconfirmedAi
                        ? 'bg-amber-50/45 border-dashed border-amber-300'
                        : 'bg-[#F8FAFC] border-slate-200'
                    }`}
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Date
                            </label>
                            <input
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-md"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Time
                            </label>
                            <input
                              type="time"
                              value={editTime}
                              onChange={(e) => setEditTime(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-md"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Linked Evidence
                            </label>
                            <select
                              value={editLinkedEvidence}
                              onChange={(e) => setEditLinkedEvidence(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                            >
                              <option value="">None</option>
                              {incident.evidence.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.fileName.slice(0, 36)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Event Title
                          </label>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Description
                          </label>
                          <textarea
                            rows={2}
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => saveEditAndConfirm(ev.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#2563EB] rounded-md cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Save &amp; Mark Confirmed</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-md cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          {/* Unboxed Clear Status Distinction */}
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs mb-1.5 tabular-nums">
                            <span className="font-mono font-semibold text-[#0B1220]">
                              {ev.date || 'Date Unspecified'} · {ev.time || 'Time Unspecified'}
                            </span>
                            <span aria-hidden="true" className="text-slate-400">
                              ·
                            </span>
                            {isUnconfirmedAi ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-amber-800">
                                <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                                AI Suggestion — Unconfirmed (Excluded from final report until verified)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-medium text-emerald-800">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Confirmed by User
                              </span>
                            )}
                          </div>

                          <h3 className="font-display text-sm sm:text-base font-semibold text-[#0B1220]">
                            {ev.title}
                          </h3>
                          <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                            {ev.description}
                          </p>

                          {ev.rationale && isUnconfirmedAi && (
                            <p className="text-xs text-amber-900/90 mt-2 bg-amber-100/60 border border-amber-200/80 rounded-lg px-3 py-2">
                              <strong>Why suggested:</strong> {ev.rationale}
                            </p>
                          )}

                          {linkedEv && (
                            <p className="text-xs text-slate-500 mt-2">
                              Linked Evidence:{' '}
                              <span className="font-mono text-slate-700">{linkedEv.fileName}</span>
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          {isUnconfirmedAi && (
                            <button
                              type="button"
                              onClick={() => confirmSuggestionDirectly(ev)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md transition-colors cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{ev.date ? 'Confirm' : 'Verify Date & Confirm'}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => beginEdit(ev)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteEvent(ev.id)}
                            aria-label={`Delete ${ev.title}`}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
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
          <span>Back to Evidence</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
        >
          <span>Continue to AI Review Assistant</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
