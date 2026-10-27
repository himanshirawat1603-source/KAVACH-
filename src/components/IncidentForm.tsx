import React, { useState, useEffect } from 'react';
import {
  Save,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  PhoneCall,
  ExternalLink,
  Eye,
} from 'lucide-react';
import {
  IncidentRecord,
  INCIDENT_CATEGORIES,
  IncidentCategory,
  UrgencyLevel,
  WitnessEntry,
  ReportingPreferences,
  WorkspaceTab,
} from '../types/incident';

interface IncidentFormProps {
  incident: IncidentRecord;
  onSave: (updated: Partial<IncidentRecord>, moveNext?: boolean) => void;
  onNavigateTab: (tab: WorkspaceTab) => void;
}

const COMMON_PLATFORMS = [
  'Instagram',
  'WhatsApp',
  'Telegram',
  'X (Twitter)',
  'Discord',
  'Email',
  'UPI / Banking App',
  'Campus / Workplace Location',
];

export const IncidentForm: React.FC<IncidentFormProps> = ({
  incident,
  onSave,
  onNavigateTab,
}) => {
  const [title, setTitle] = useState(incident.title);
  const [category, setCategory] = useState<IncidentCategory>(incident.category);
  const [urgencyLevel, setUrgencyLevel] = useState<UrgencyLevel>(incident.urgencyLevel);
  const [platform, setPlatform] = useState(incident.platform);
  const [date, setDate] = useState(incident.date);
  const [time, setTime] = useState(incident.time);
  const [timezone, setTimezone] = useState(incident.timezone);
  const [description, setDescription] = useState(incident.description);
  const [additionalNotes, setAdditionalNotes] = useState(incident.additionalNotes);
  const [witnesses, setWitnesses] = useState<WitnessEntry[]>(incident.witnesses || []);
  const [preferredPath, setPreferredPath] = useState<ReportingPreferences['preferredPath']>(
    incident.reportingPreferences?.preferredPath || 'undecided'
  );
  const [prefNotes, setPrefNotes] = useState(
    incident.reportingPreferences?.personalNotesOnPreferences || ''
  );

  // New voluntary witness inputs
  const [wName, setWName] = useState('');
  const [wContext, setWContext] = useState('');
  const [wContact, setWContact] = useState('');
  const [wNote, setWNote] = useState('');

  const [showReviewSummary, setShowReviewSummary] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    setTitle(incident.title);
    setCategory(incident.category);
    setUrgencyLevel(incident.urgencyLevel || 'standard');
    setPlatform(incident.platform);
    setDate(incident.date);
    setTime(incident.time);
    setTimezone(incident.timezone);
    setDescription(incident.description);
    setAdditionalNotes(incident.additionalNotes);
    setWitnesses(incident.witnesses || []);
    setPreferredPath(incident.reportingPreferences?.preferredPath || 'undecided');
    setPrefNotes(incident.reportingPreferences?.personalNotesOnPreferences || '');
    setErrors({});
  }, [incident.id]);

  const validate = (strictForContinue: boolean): boolean => {
    const nextErrors: Record<string, string> = {};

    // Draft saving is forgiving so citizens in distress never lose notes; strict checks apply before advancing
    if (!title.trim()) {
      nextErrors.title = 'Please enter a short factual title so you can identify this draft.';
    } else if (strictForContinue && title.trim().length < 5) {
      nextErrors.title = 'Title must be at least 5 characters long.';
    }

    if (strictForContinue) {
      if (!platform.trim()) {
        nextErrors.platform =
          'Please specify the relevant platform, website, or physical/digital location.';
      }
      if (!date.trim()) {
        nextErrors.date = 'Please select the date when the incident occurred or was noticed.';
      }
      if (!description.trim()) {
        nextErrors.description =
          'Please describe what happened in your own words before moving to the next step.';
      } else if (description.trim().length < 15) {
        nextErrors.description =
          'Please provide at least a brief sentence (15+ characters) describing what occurred.';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildPatch = (): Partial<IncidentRecord> => ({
    title: title.trim(),
    category,
    urgencyLevel,
    platform: platform.trim(),
    date,
    time,
    timezone: timezone.trim(),
    description: description.trim(),
    additionalNotes: additionalNotes.trim(),
    witnesses,
    reportingPreferences: {
      ...(incident.reportingPreferences || {
        selectedAuthorityIds: [],
        selectedSupportOrgIds: [],
      }),
      preferredPath,
      personalNotesOnPreferences: prefNotes.trim(),
    },
  });

  const handleSaveDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate(false)) return;
    onSave(buildPatch(), false);
    setSavedNotice(
      'Saved as a KAVACH draft in your browser (not submitted to any external portal).'
    );
    setTimeout(() => setSavedNotice(null), 4000);
  };

  const handleSaveAndContinue = () => {
    if (!validate(true)) return;
    onSave(buildPatch(), true);
  };

  const handleAddWitness = () => {
    if (!wName.trim() && !wNote.trim()) return;
    const entry: WitnessEntry = {
      id: `wit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      nameOrAlias: wName.trim() || 'Unnamed Witness / First-hand Observer',
      relationOrContext: wContext.trim(),
      contactOptional: wContact.trim(),
      observationNote: wNote.trim(),
    };
    setWitnesses((prev) => [...prev, entry]);
    setWName('');
    setWContext('');
    setWContact('');
    setWNote('');
  };

  const handleRemoveWitness = (id: string) => {
    setWitnesses((prev) => prev.filter((w) => w.id !== id));
  };

  return (
    <form onSubmit={handleSaveDraft} noValidate className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-[#2563EB] tabular-nums">
            Incident Documentation · Case {incident.caseCode}
          </p>
          <h1 className="font-display text-2xl font-bold text-[#0B1220] tracking-tight mt-0.5">
            Incident Details, Preferences &amp; Voluntary Context
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            No personal phone numbers, home addresses, or IDs are required by KAVACH. Save as a
            local draft at any time.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowReviewSummary((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shrink-0 cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5 text-[#2563EB]" />
          <span>{showReviewSummary ? 'Hide Quick Review' : 'Review All Incident Details'}</span>
        </button>
      </div>

      {/* Immediate Danger Emergency Escape Hatch (Module 4C: Never force lengthy form completion!) */}
      {urgencyLevel === 'immediate-danger' && (
        <div
          role="region"
          aria-label="Immediate Emergency Assistance"
          className="bg-red-50 border border-red-300 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="space-y-1">
            <p className="font-display text-sm font-bold text-red-950 flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-red-700 shrink-0" />
              Immediate Danger Indicated — You Do Not Need to Finish This Form First
            </p>
            <p className="text-xs text-red-900 leading-relaxed">
              If anyone faces immediate physical harm or active extortion, contact emergency
              services directly: <strong>Dial 112</strong> (Pan-India Emergency Response) or{' '}
              <strong>Dial 1930</strong> for active financial cyber fraud.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <a
              href="https://112.gov.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg whitespace-nowrap"
            >
              <span>Open 112.gov.in</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              type="button"
              onClick={() => onNavigateTab('find-help')}
              className="px-3.5 py-2 text-xs font-semibold text-red-900 bg-white border border-red-300 hover:bg-red-100 rounded-lg whitespace-nowrap cursor-pointer"
            >
              View Emergency Helplines
            </button>
          </div>
        </div>
      )}

      {/* Pre-Report All-Details Review Drawer */}
      {showReviewSummary && (
        <div className="bg-slate-900 text-white rounded-xl p-5 sm:p-6 space-y-4 border border-slate-800">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <h2 className="font-display text-sm font-semibold text-[#22D3EE]">
              Complete Incident Details Snapshot ({incident.caseCode})
            </h2>
            <span className="text-xs text-slate-400">
              {incident.evidence.length} evidence · {incident.timeline.filter((t) => t.confirmed).length}{' '}
              confirmed timeline events · {witnesses.length} witnesses
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <p className="text-slate-400">Category &amp; Urgency</p>
              <p className="font-semibold capitalize mt-0.5">
                {category} · {urgencyLevel}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Platform / Location</p>
              <p className="font-semibold mt-0.5">{platform || 'Not entered yet'}</p>
            </div>
            <div>
              <p className="text-slate-400">Date &amp; Approximate Time</p>
              <p className="font-mono mt-0.5 tabular-nums">
                {date || 'Unspecified'} {time || ''} {timezone ? `(${timezone})` : ''}
              </p>
            </div>
          </div>
          <div className="text-xs">
            <p className="text-slate-400 mb-1">Narrative Description</p>
            <p className="text-slate-200 leading-relaxed whitespace-pre-line">
              {description || 'No description entered yet.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                onSave(buildPatch(), false);
                onNavigateTab('report');
              }}
              className="px-3.5 py-1.5 text-xs font-semibold text-[#0B1220] bg-[#22D3EE] hover:bg-cyan-300 rounded-lg cursor-pointer"
            >
              Save &amp; Jump to Full Report Preview
            </button>
          </div>
        </div>
      )}

      {Object.keys(errors).length > 0 && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-sm text-red-900"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Please check the highlighted fields</p>
            <p className="text-xs text-red-700 mt-0.5">
              Complete the required fields to proceed, or enter a short title to save a draft now.
            </p>
          </div>
        </div>
      )}

      {savedNotice && (
        <div
          role="status"
          className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-2.5 text-xs font-medium text-emerald-900"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{savedNotice}</span>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
        {/* Urgency Selector */}
        <div>
          <label className="block text-sm font-semibold text-[#0B1220] mb-2">
            Current Urgency / Safety Situation
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                val: 'standard' as UrgencyLevel,
                label: 'Standard Documentation',
                desc: 'Organizing records, screenshots, and timeline safely',
              },
              {
                val: 'high' as UrgencyLevel,
                label: 'Time-Sensitive / Ongoing',
                desc: 'Active impersonation, financial scam attempt, or ongoing harassment',
              },
              {
                val: 'immediate-danger' as UrgencyLevel,
                label: 'Immediate Physical / Urgent Danger',
                desc: 'Shows emergency 112 / 1930 help immediately—skip forms if needed',
              },
            ].map((u) => {
              const active = urgencyLevel === u.val;
              return (
                <button
                  key={u.val}
                  type="button"
                  onClick={() => setUrgencyLevel(u.val)}
                  className={`text-left p-3.5 rounded-lg border transition-colors cursor-pointer ${
                    active
                      ? u.val === 'immediate-danger'
                        ? 'bg-red-50 border-red-500 text-red-950'
                        : 'bg-blue-50/70 border-[#2563EB] text-[#0B1220]'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <p className="font-display text-xs font-bold">{u.label}</p>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{u.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Incident Title */}
        <div>
          <label
            htmlFor="inc-title"
            className="block text-sm font-semibold text-[#0B1220] mb-1.5"
          >
            Incident Title <span className="text-red-600">*</span>
          </label>
          <input
            id="inc-title"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
            }}
            placeholder="e.g., Impersonating Instagram account messaging classmates for money"
            className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-lg text-[#0B1220] placeholder:text-slate-400 focus:outline-none ${
              errors.title
                ? 'border-red-500 focus:border-red-600'
                : 'border-slate-300 focus:border-[#2563EB]'
            }`}
          />
          {errors.title && <p className="text-xs text-red-600 mt-1.5">{errors.title}</p>}
        </div>

        {/* Category Selection */}
        <div>
          <label className="block text-sm font-semibold text-[#0B1220] mb-2">
            Incident Category <span className="text-red-600">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {INCIDENT_CATEGORIES.map((cat) => {
              const active = category === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`text-left p-3.5 rounded-lg border transition-colors cursor-pointer ${
                    active
                      ? 'bg-blue-50/70 border-[#2563EB] text-[#0B1220]'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-sm font-semibold">{cat.label}</span>
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        active ? 'border-[#2563EB] bg-[#2563EB]' : 'border-slate-300'
                      }`}
                    >
                      {active && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{cat.hint}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Platform / Website / Location */}
        <div>
          <label
            htmlFor="inc-platform"
            className="block text-sm font-semibold text-[#0B1220] mb-1.5"
          >
            Relevant Platform, Website, or Location <span className="text-red-600">*</span>
          </label>
          <input
            id="inc-platform"
            type="text"
            value={platform}
            onChange={(e) => {
              setPlatform(e.target.value);
              if (errors.platform) setErrors((prev) => ({ ...prev, platform: '' }));
            }}
            placeholder="e.g., Instagram, WhatsApp, Lookalike URL, UPI App, or Campus Hostel"
            className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-lg text-[#0B1220] placeholder:text-slate-400 focus:outline-none ${
              errors.platform
                ? 'border-red-500 focus:border-red-600'
                : 'border-slate-300 focus:border-[#2563EB]'
            }`}
          />
          {errors.platform && <p className="text-xs text-red-600 mt-1.5">{errors.platform}</p>}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="text-xs text-slate-500 mr-1">Quick select:</span>
            {COMMON_PLATFORMS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setPlatform(p);
                  if (errors.platform) setErrors((prev) => ({ ...prev, platform: '' }));
                }}
                className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer whitespace-nowrap"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Date, Approx Time, Timezone */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="inc-date"
              className="block text-sm font-semibold text-[#0B1220] mb-1.5"
            >
              Incident Date <span className="text-red-600">*</span>
            </label>
            <input
              id="inc-date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                if (errors.date) setErrors((prev) => ({ ...prev, date: '' }));
              }}
              className={`w-full px-3.5 py-2.5 text-sm font-mono tabular-nums bg-white border rounded-lg text-[#0B1220] focus:outline-none ${
                errors.date
                  ? 'border-red-500 focus:border-red-600'
                  : 'border-slate-300 focus:border-[#2563EB]'
              }`}
            />
            {errors.date && <p className="text-xs text-red-600 mt-1.5">{errors.date}</p>}
          </div>

          <div>
            <label
              htmlFor="inc-time"
              className="block text-sm font-semibold text-[#0B1220] mb-1.5"
            >
              Approximate Time (Optional)
            </label>
            <input
              id="inc-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg text-[#0B1220] focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div>
            <label
              htmlFor="inc-tz"
              className="block text-sm font-semibold text-[#0B1220] mb-1.5"
            >
              Time Zone (Optional)
            </label>
            <input
              id="inc-tz"
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="e.g., IST (UTC+05:30)"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-[#0B1220] placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB]"
            />
          </div>
        </div>

        {/* Incident Description */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <label htmlFor="inc-desc" className="text-sm font-semibold text-[#0B1220]">
              Factual Incident Description <span className="text-red-600">*</span>
            </label>
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              {description.length} chars
            </span>
          </div>
          <textarea
            id="inc-desc"
            rows={5}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (errors.description) setErrors((prev) => ({ ...prev, description: '' }));
            }}
            placeholder="Describe what happened chronologically. Stick to observable facts—visible handles, URLs, quoted messages, or payment requests. Never enter your own banking PINs, passwords, or OTPs."
            className={`w-full px-3.5 py-3 text-sm bg-white border rounded-lg text-[#0B1220] placeholder:text-slate-400 leading-relaxed focus:outline-none ${
              errors.description
                ? 'border-red-500 focus:border-red-600'
                : 'border-slate-300 focus:border-[#2563EB]'
            }`}
          />
          {errors.description ? (
            <p className="text-xs text-red-600 mt-1.5">{errors.description}</p>
          ) : (
            <p className="text-xs text-slate-500 mt-1.5">
              Safety reminder: Never type your own passwords, OTPs, or third-party account
              credentials into any incident report.
            </p>
          )}
        </div>

        {/* Voluntary Witness Information (Module 2 — Strictly Optional) */}
        <div className="pt-4 border-t border-slate-200 space-y-4">
          <div>
            <h2 className="font-display text-sm font-semibold text-[#0B1220]">
              Witness Information (Strictly Voluntary &amp; Optional)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Only record witness references if someone voluntarily observed the incident (e.g., a
              classmate who received an impersonating message). Do not include private contact info
              without their permission.
            </p>
          </div>

          {witnesses.length > 0 && (
            <div className="space-y-2">
              {witnesses.map((w) => (
                <div
                  key={w.id}
                  className="bg-[#F8FAFC] border border-slate-200 rounded-lg p-3.5 flex items-start justify-between gap-3 text-xs"
                >
                  <div>
                    <p className="font-semibold text-[#0B1220]">
                      {w.nameOrAlias}{' '}
                      {w.relationOrContext && (
                        <span className="font-normal text-slate-500">· {w.relationOrContext}</span>
                      )}
                    </p>
                    {w.contactOptional && (
                      <p className="text-slate-500 mt-0.5">Contact note: {w.contactOptional}</p>
                    )}
                    <p className="text-slate-700 mt-1">{w.observationNote}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveWitness(w.id)}
                    aria-label={`Remove witness ${w.nameOrAlias}`}
                    className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="bg-[#F8FAFC] border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={wName}
                onChange={(e) => setWName(e.target.value)}
                placeholder="Witness name or initials (optional)"
                className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
              />
              <input
                type="text"
                value={wContext}
                onChange={(e) => setWContext(e.target.value)}
                placeholder="Role / context (e.g., Colleague)"
                className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
              />
              <input
                type="text"
                value={wContact}
                onChange={(e) => setWContact(e.target.value)}
                placeholder="Voluntary contact note (optional)"
                className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={wNote}
                onChange={(e) => setWNote(e.target.value)}
                placeholder="What did this witness directly observe or screenshot?"
                className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
              />
              <button
                type="button"
                onClick={handleAddWitness}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-md whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Witness Note</span>
              </button>
            </div>
          </div>
        </div>

        {/* User-Selected Reporting Preferences (Module 2) */}
        <div className="pt-4 border-t border-slate-200 space-y-3">
          <div>
            <h2 className="font-display text-sm font-semibold text-[#0B1220]">
              Your Reporting Preferences
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              You stay in control of how this record is used. Selecting a preference guides
              recommendations in Step 05 without automatically sending data anywhere.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {[
              { val: 'undecided', label: 'Undecided — Exploring Options' },
              { val: 'public-authority', label: 'Official Public Authority Portal' },
              { val: 'private-support', label: 'NGO / Legal Aid / Counselling' },
              { val: 'self-record-only', label: 'Personal Documentation Only' },
            ].map((opt) => {
              const active = preferredPath === opt.val;
              return (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() =>
                    setPreferredPath(opt.val as ReportingPreferences['preferredPath'])
                  }
                  className={`p-3 rounded-lg border text-left text-xs font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#0B1220] text-white border-[#0B1220]'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <input
            type="text"
            value={prefNotes}
            onChange={(e) => setPrefNotes(e.target.value)}
            placeholder="Optional personal note on your reporting goals or concerns..."
            className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-lg text-[#0B1220] placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB]"
          />
        </div>

        {/* Additional Notes */}
        <div>
          <label
            htmlFor="inc-notes"
            className="block text-sm font-semibold text-[#0B1220] mb-1.5"
          >
            Additional Notes or Prior Platform Ticket IDs (Optional)
          </label>
          <textarea
            id="inc-notes"
            rows={2}
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="Optional: In-app support ticket numbers, account security actions taken (2FA enabled, blocked sender), or context notes."
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-[#0B1220] placeholder:text-slate-400 leading-relaxed focus:outline-none focus:border-[#2563EB]"
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save KAVACH Draft</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAndContinue}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Save &amp; Continue to Evidence</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </form>
  );
};
