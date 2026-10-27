import React, { useState, useMemo } from 'react';
import {
  PhoneCall,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Check,
  ShieldAlert,
  Building2,
  HeartHandshake,
} from 'lucide-react';
import {
  INCIDENT_CATEGORIES,
  IncidentCategory,
  IncidentRecord,
  PrivateSupportTrackingEntry,
  UrgencyLevel,
  WorkspaceTab,
} from '../types/incident';
import {
  getRecommendationsForIncident,
  SupportRecommendationItem,
} from '../data/verifiedDirectory';

interface FindHelpViewProps {
  incident: IncidentRecord | null;
  onUpdateIncident: (patch: Partial<IncidentRecord>, activityNote?: string) => void;
  onProceedToSubmitWithSelection: (targetId: string) => void;
  onNavigateTab: (tab: WorkspaceTab) => void;
}

export const FindHelpView: React.FC<FindHelpViewProps> = ({
  incident,
  onUpdateIncident,
  onProceedToSubmitWithSelection,
  onNavigateTab,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<IncidentCategory>(
    incident?.category || 'impersonation'
  );
  const [selectedUrgency, setSelectedUrgency] = useState<UrgencyLevel>(
    incident?.urgencyLevel || 'standard'
  );
  const [situationFilterText, setSituationFilterText] = useState('');
  const [preferenceFeedback, setPreferenceFeedback] = useState<string | null>(null);

  // Sync selector defaults if user switches active incident
  React.useEffect(() => {
    if (incident) {
      setSelectedCategory(incident.category);
      setSelectedUrgency(incident.urgencyLevel || 'standard');
    }
  }, [incident?.id]);

  // Allow user to describe situation in free text to auto-suggest category without forcing form completion
  const handleQuickDescribe = (text: string) => {
    setSituationFilterText(text);
    const lower = text.toLowerCase();
    if (/danger|harm|stalk|weapon|violence|extort|suicide|emergency/.test(lower)) {
      setSelectedUrgency('immediate-danger');
    }
    if (/upi|bank|scam|money|fraud|otp|phish|payment/.test(lower)) {
      setSelectedCategory('online fraud');
    } else if (/fake account|clone|impersonat|pretend|photo stolen/.test(lower)) {
      setSelectedCategory('impersonation');
    } else if (/threat|dox|kill|leak/.test(lower)) {
      setSelectedCategory('threats');
    } else if (/harass|stalk|unwanted|abuse/.test(lower)) {
      setSelectedCategory('online harassment');
    } else if (/bully|mock|group chat/.test(lower)) {
      setSelectedCategory('cyberbullying');
    }
  };

  const { emergency, publicAuthorities, privateSupport } = useMemo(
    () => getRecommendationsForIncident(selectedCategory, selectedUrgency),
    [selectedCategory, selectedUrgency]
  );

  const isSelectedPreference = (item: SupportRecommendationItem): boolean => {
    if (!incident) return false;
    if (item.sector === 'private-support') {
      return incident.reportingPreferences.selectedSupportOrgIds.includes(item.id);
    }
    return incident.reportingPreferences.selectedAuthorityIds.includes(item.id);
  };

  const togglePreferredOption = (item: SupportRecommendationItem) => {
    if (!incident) {
      onProceedToSubmitWithSelection(item.id);
      return;
    }

    const prefs = incident.reportingPreferences;
    if (item.sector === 'private-support') {
      const exists = prefs.selectedSupportOrgIds.includes(item.id);
      const nextIds = exists
        ? prefs.selectedSupportOrgIds.filter((id) => id !== item.id)
        : [...prefs.selectedSupportOrgIds, item.id];

      // Also ensure entry exists in privateSupportTracking as 'Recommended' if newly selected
      let nextTracking: PrivateSupportTrackingEntry[] = incident.privateSupportTracking;
      if (!exists && !incident.privateSupportTracking.some((t) => t.organizationId === item.id)) {
        nextTracking = [
          ...incident.privateSupportTracking,
          {
            id: `pst-${Date.now()}`,
            organizationId: item.id,
            organizationName: item.name,
            officialUrl: item.officialUrl,
            status: 'Recommended',
            dateContacted: '',
            contactMethod: '',
            responseState: 'not-contacted',
            followUpDate: '',
            userNotes: 'Saved to preferred support options by citizen.',
            updatedAt: new Date().toISOString(),
          },
        ];
      }

      onUpdateIncident(
        {
          reportingPreferences: {
            ...prefs,
            preferredPath: 'private-support',
            selectedSupportOrgIds: nextIds,
          },
          privateSupportTracking: nextTracking,
        },
        `${exists ? 'Removed' : 'Saved'} "${item.name}" in preferred private support options (no data transmitted).`
      );
    } else {
      const exists = prefs.selectedAuthorityIds.includes(item.id);
      const nextIds = exists
        ? prefs.selectedAuthorityIds.filter((id) => id !== item.id)
        : [...prefs.selectedAuthorityIds, item.id];

      onUpdateIncident(
        {
          reportingPreferences: {
            ...prefs,
            preferredPath: 'public-authority',
            selectedAuthorityIds: nextIds,
          },
          officialTracking: !exists
            ? {
                ...incident.officialTracking,
                authorityOrPortal: item.name,
                portalUrl: item.officialUrl || incident.officialTracking.portalUrl,
                statusCheckUrl:
                  item.statusCheckUrl || incident.officialTracking.statusCheckUrl,
              }
            : incident.officialTracking,
        },
        `${exists ? 'Removed' : 'Selected'} "${item.name}" as preferred official channel (no data transmitted).`
      );
    }

    setPreferenceFeedback(
      `Saved preference for "${item.name}". KAVACH never submits information automatically—you decide when to open the external page.`
    );
    setTimeout(() => setPreferenceFeedback(null), 4000);
  };

  const renderCard = (item: SupportRecommendationItem) => {
    const chosen = isSelectedPreference(item);
    const isEmergency = item.sector === 'immediate-emergency';

    return (
      <div
        key={item.id}
        className={`rounded-xl border p-5 sm:p-6 flex flex-col justify-between gap-5 transition-colors ${
          isEmergency
            ? 'bg-red-50/50 border-red-300'
            : chosen
              ? 'bg-blue-50/40 border-[#2563EB]'
              : 'bg-white border-slate-200'
        }`}
      >
        <div className="space-y-3">
          {/* Unboxed Classification & Verification Metadata */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className="font-semibold text-[#0B1220]">{item.classificationLabel}</span>
            <span aria-hidden="true" className="text-slate-400">
              ·
            </span>
            {item.informationVerified ? (
              <span className="inline-flex items-center gap-1 font-medium text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Verified Official Source
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-semibold text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Manual Verification Required
              </span>
            )}
            <span aria-hidden="true" className="text-slate-400">
              ·
            </span>
            <span className="text-slate-500">
              Integration: {item.technicalIntegrationExists ? 'Connected' : 'None (External Only)'}
            </span>
          </div>

          <h3 className="font-display text-lg font-bold text-[#0B1220]">{item.name}</h3>

          <p className="text-sm text-slate-700 leading-relaxed">
            <strong className="font-semibold text-[#0B1220]">Why it may be relevant:</strong>{' '}
            {item.whyRelevant}
          </p>

          <div className="bg-[#F8FAFC] border border-slate-200 rounded-lg p-3.5 space-y-2 text-xs">
            <div>
              <span className="font-semibold text-[#0B1220]">Available Contact Methods:</span>
              <ul className="mt-1 space-y-1 text-slate-700">
                {item.contactMethods.map((m) => (
                  <li key={m} className="font-mono text-[11.5px]">
                    • {m}
                  </li>
                ))}
              </ul>
            </div>

            {item.officialUrl && (
              <p className="text-slate-600 pt-1 border-t border-slate-200/80 break-all">
                Official Website:{' '}
                <a
                  href={item.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[#2563EB] hover:underline"
                >
                  {item.officialUrl}
                </a>
              </p>
            )}

            <p className="text-slate-500 pt-1 border-t border-slate-200/80">
              <strong>Technical Integration Status:</strong> {item.integrationStatusNote}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => togglePreferredOption(item)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
              chosen
                ? 'bg-[#0B1220] text-white border-[#0B1220]'
                : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>{chosen ? 'Selected as Preferred Option' : 'Select as Preferred Option'}</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {item.officialUrl && (
              <button
                type="button"
                onClick={() => onProceedToSubmitWithSelection(item.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
              >
                <span>Continue to Portal / Next Steps</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {item.officialUrl && (
              <a
                href={item.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <span>Open Official Site</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-[#2563EB] tabular-nums">
            Find the Right Help · Verified Public &amp; Non-Government Directory
          </p>
          <h1 className="font-display text-2xl font-bold text-[#0B1220] tracking-tight mt-0.5">
            Recommended Authorities &amp; Support Options
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Recommendations are tailored to incident category and urgency using verified official
            sources. KAVACH never submits data or makes decisions on your behalf.
          </p>
        </div>

        {/* Immediate Danger 1-Click Toggle */}
        <button
          type="button"
          onClick={() =>
            setSelectedUrgency((prev) =>
              prev === 'immediate-danger' ? 'standard' : 'immediate-danger'
            )
          }
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg border transition-colors shrink-0 cursor-pointer ${
            selectedUrgency === 'immediate-danger'
              ? 'bg-red-700 text-white border-red-800'
              : 'bg-red-50 text-red-900 border-red-300 hover:bg-red-100'
          }`}
        >
          <PhoneCall className="w-4 h-4" />
          <span>
            {selectedUrgency === 'immediate-danger'
              ? 'Immediate Danger Mode Active'
              : 'In Immediate Danger? Show Emergency Help Now'}
          </span>
        </button>
      </div>

      {/* Prominent Immediate Emergency Section when Immediate Danger is active (No form required!) */}
      {selectedUrgency === 'immediate-danger' && (
        <section
          aria-label="Immediate Emergency Help"
          className="bg-red-950 text-white rounded-xl p-6 sm:p-7 space-y-5 border border-red-800"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-red-800/80 pb-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-red-300 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" />
                IMMEDIATE EMERGENCY ASSISTANCE — NO FORM COMPLETION REQUIRED
              </p>
              <h2 className="font-display text-xl font-bold">
                Contact Emergency Dispatch Immediately
              </h2>
              <p className="text-xs text-red-100 max-w-2xl leading-relaxed">
                If you face immediate physical threat, stalking, coercion, or active financial
                extortion, reach official emergency responders right away instead of filling out
                documentation forms.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <a
                href="https://112.gov.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-red-950 bg-white hover:bg-red-100 rounded-lg"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Dial 112 · Visit 112.gov.in</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://cybercrime.gov.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-red-800 hover:bg-red-700 border border-red-600 rounded-lg"
              >
                <span>Cyber Fraud 1930 · cybercrime.gov.in</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Interactive Incident Type & Situation Matcher */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          <div className="lg:col-span-6">
            <label
              htmlFor="help-describe"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Describe Your Situation Briefly (Optional — Filters Recommendations Locally)
            </label>
            <input
              id="help-describe"
              type="text"
              value={situationFilterText}
              onChange={(e) => handleQuickDescribe(e.target.value)}
              placeholder="e.g., Someone cloned my photo and asked friends for UPI money..."
              className="w-full px-3.5 py-2 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg text-[#0B1220] focus:bg-white focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div className="lg:col-span-3">
            <label
              htmlFor="help-cat"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Incident Category
            </label>
            <select
              id="help-cat"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as IncidentCategory)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-[#0B1220] focus:outline-none focus:border-[#2563EB]"
            >
              {INCIDENT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-3">
            <label
              htmlFor="help-urg"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Urgency Level
            </label>
            <select
              id="help-urg"
              value={selectedUrgency}
              onChange={(e) => setSelectedUrgency(e.target.value as UrgencyLevel)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-[#0B1220] focus:outline-none focus:border-[#2563EB]"
            >
              <option value="standard">Standard Documentation</option>
              <option value="high">Time-Sensitive / Ongoing</option>
              <option value="immediate-danger">Immediate Emergency Danger</option>
            </select>
          </div>
        </div>
      </div>

      {preferenceFeedback && (
        <div
          role="status"
          className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-2.5 text-xs font-medium text-emerald-900"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{preferenceFeedback}</span>
        </div>
      )}

      {/* C. Immediate Emergency Help Cards */}
      {emergency.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-red-700" />
            <h2 className="font-display text-lg font-bold text-[#0B1220]">
              Immediate Emergency &amp; Rapid Fraud Helplines ({emergency.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {emergency.map(renderCard)}
          </div>
        </section>
      )}

      {/* A. Public Authorities */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-[#2563EB]" />
          <h2 className="font-display text-lg font-bold text-[#0B1220]">
            A. Public Authorities &amp; Statutory Government Channels ({publicAuthorities.length})
          </h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {publicAuthorities.map(renderCard)}
        </div>
      </section>

      {/* B. Private or Non-Government Support */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <HeartHandshake className="w-5 h-5 text-[#2563EB]" />
          <h2 className="font-display text-lg font-bold text-[#0B1220]">
            B. Private, Academic &amp; Non-Government Support ({privateSupport.length})
          </h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {privateSupport.map(renderCard)}
        </div>
      </section>

      {/* Next Step Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={() => onNavigateTab('report')}
          className="px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
        >
          ← Back to Report Preview
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('submit-help')}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg cursor-pointer"
        >
          <span>Continue to Official Portals &amp; Submission Steps</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
