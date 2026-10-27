import { useState } from 'react';
import { ExternalLink, HeartHandshake, PhoneCall, Shield } from 'lucide-react';
import { VERIFIED_SUPPORT_DIRECTORY } from '../data/verifiedDirectory';
import { INCIDENT_CATEGORIES, IncidentCategory } from '../types/incident';

export function SupportResourcesView() {
  const [selectedCategory, setSelectedCategory] = useState<'all' | IncidentCategory>('all');

  const filtered = VERIFIED_SUPPORT_DIRECTORY.filter((item) =>
    selectedCategory === 'all' ? true : item.relevantCategories.includes(selectedCategory)
  );

  const emergencyItems = filtered.filter((i) => i.sector === 'immediate-emergency');
  const publicItems = filtered.filter((i) => i.sector === 'public-authority');
  const privateItems = filtered.filter((i) => i.sector === 'private-support');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
            Verified Public & Non-Government Directory
          </span>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Support & Help Recommendations
          </h1>
          <p className="mt-1 text-sm text-slate-400 max-w-2xl">
            Filter verified emergency helplines, public authorities, and independent digital-rights
            or psychosocial counselling organizations by incident category.
          </p>
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Incident Category
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as 'all' | IncidentCategory)}
            className="px-3.5 py-2.5 rounded-xl bg-[#0A1428] border border-blue-400/25 text-xs sm:text-sm text-white"
          >
            <option value="all">All Incident Categories</option>
            {INCIDENT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Emergency Section */}
      {emergencyItems.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-red-300 flex items-center gap-2">
            <PhoneCall className="h-4 w-4" />
            Immediate Emergency Helplines
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {emergencyItems.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-red-950/30 border border-red-500/35 p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-red-300">
                    {item.classificationLabel}
                  </span>
                  <h3 className="text-base font-bold text-white">{item.name}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{item.whyRelevant}</p>
                  <ul className="text-xs text-slate-200 space-y-1 pt-1">
                    {item.contactMethods.map((m) => (
                      <li key={m}>• {m}</li>
                    ))}
                  </ul>
                </div>
                {item.officialUrl && (
                  <a
                    href={item.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
                  >
                    Open Official Portal
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Public Authorities */}
      {publicItems.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Public Authorities & Statutory Services
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {publicItems.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-[#0A1428]/90 border border-blue-400/20 p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-blue-300">
                    {item.classificationLabel}
                  </span>
                  <h3 className="text-base font-bold text-white">{item.name}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{item.whyRelevant}</p>
                  <ul className="text-xs text-slate-300 space-y-1 pt-1">
                    {item.contactMethods.map((m) => (
                      <li key={m}>• {m}</li>
                    ))}
                  </ul>
                </div>
                {item.officialUrl && (
                  <a
                    href={item.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                  >
                    Visit Official Website
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Non-Government / Counselling Support */}
      {privateItems.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-2">
            <HeartHandshake className="h-4 w-4" />
            Non-Government Legal, Cyber-Safety & Counselling Support
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {privateItems.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-[#0A1428]/90 border border-slate-800 p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-emerald-300">
                    {item.classificationLabel}
                  </span>
                  <h3 className="text-base font-bold text-white">{item.name}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{item.whyRelevant}</p>
                  <ul className="text-xs text-slate-300 space-y-1 pt-1">
                    {item.contactMethods.map((m) => (
                      <li key={m}>• {m}</li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-slate-500 pt-1">{item.integrationStatusNote}</p>
                </div>
                {item.officialUrl ? (
                  <a
                    href={item.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-200 text-xs font-semibold"
                  >
                    Visit Organization Website
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <span className="text-xs text-amber-300 font-medium">
                    {item.verificationNote}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
