import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  ShieldAlert,
  Trash2,
  RotateCcw,
  Download,
  CheckCircle2,
  Info,
  Server,
  PhoneCall,
  Lock,
} from 'lucide-react';
import { IncidentRecord } from '../types/incident';
import { formatBytes, triggerFileDownload } from '../utils/pdfGenerator';

interface PrivacyViewProps {
  incidents: IncidentRecord[];
  storageKey: string;
  onResetDemoData: () => void;
  onClearAllData: () => void;
}

interface SystemArchitectureStatus {
  citizenDraftStorage: string;
  prototypeReviewerBackend: string;
  productionBackendConnected: boolean;
  governmentApiConnected: boolean;
  privateOrgApiConnected: boolean;
  geminiServerConfigured: boolean;
  productionRequirements: string[];
}

export const PrivacyView: React.FC<PrivacyViewProps> = ({
  incidents,
  storageKey,
  onResetDemoData,
  onClearAllData,
}) => {
  const [confirmClear, setConfirmClear] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [archInfo, setArchInfo] = useState<SystemArchitectureStatus | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/system/architecture')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data) {
          setArchInfo(data as SystemArchitectureStatus);
        }
      })
      .catch(() => {
        // Fallback gracefully if backend check fails
      });
    return () => {
      active = false;
    };
  }, []);

  const storageBytes = (() => {
    try {
      const raw = window.localStorage.getItem(storageKey) || '';
      return new Blob([raw]).size;
    } catch {
      return 0;
    }
  })();

  const handleExportAllJson = () => {
    const payload = JSON.stringify(
      {
        application: 'KAVACH',
        exportedAt: new Date().toISOString(),
        storageType: 'Browser localStorage export',
        incidents,
      },
      null,
      2
    );
    triggerFileDownload(payload, 'kavach-local-records-backup.json', 'application/json');
    setActionFeedback('Exported all local browser records as JSON.');
    setTimeout(() => setActionFeedback(null), 3500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#0B1220] tracking-tight">
          Privacy, Shared Data Architecture &amp; Technical Scope
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Transparent documentation of how KAVACH isolates citizen drafts, handles consented
          prototype review records, processes server-side AI requests, and defines safety
          boundaries.
        </p>
      </div>

      {/* Emergency Guidance Notice (Module 11) */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <PhoneCall className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
          <div className="text-xs text-red-950 leading-relaxed">
            <strong className="font-semibold">Immediate Emergency Guidance:</strong> KAVACH is a
            documentation and reporting-preparation workspace—not an emergency dispatch service. If
            you face immediate physical danger, dial <strong>112</strong> (ERSS India). For urgent
            active cyber financial fraud, dial <strong>1930</strong> immediately.
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="tel:112"
            className="px-3 py-1.5 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg"
          >
            Dial 112
          </a>
          <a
            href="tel:1930"
            className="px-3 py-1.5 text-xs font-semibold text-red-900 bg-white border border-red-300 hover:bg-red-100 rounded-lg"
          >
            Dial 1930
          </a>
        </div>
      </div>

      {actionFeedback && (
        <div
          role="status"
          className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-2.5 text-xs font-medium text-emerald-900"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Storage Overview & Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <HardDrive className="w-5 h-5 text-[#2563EB] shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-base font-semibold text-[#0B1220]">
                1. Citizen Workspace Storage (Browser Local Storage)
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                All private incident drafts, witness notes, timeline events, and external tracking
                logs are saved in your browser’s{' '}
                <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">{storageKey}</code>{' '}
                storage key. They are never automatically shared with reviewers or external servers.
              </p>
            </div>
          </div>

          <div className="font-mono text-xs text-slate-600 tabular-nums shrink-0 bg-[#F8FAFC] border border-slate-200 rounded-lg px-3.5 py-2">
            {incidents.length} {incidents.length === 1 ? 'record' : 'records'} ·{' '}
            {formatBytes(storageBytes)}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600 leading-relaxed">
          <div className="bg-[#F8FAFC] border border-slate-200 rounded-lg p-4 space-y-1.5">
            <p className="font-display text-sm font-semibold text-[#0B1220]">
              Explicit Evidence Storage Scope
            </p>
            <p>
              Each evidence entry clearly indicates whether a compact preview/excerpt is stored
              locally in your browser, whether only the filename and size were recorded (for larger
              files staying on your device), or whether a manual description/URL was logged.
            </p>
          </div>

          <div className="bg-[#F8FAFC] border border-slate-200 rounded-lg p-4 space-y-1.5">
            <p className="font-display text-sm font-semibold text-[#0B1220]">
              Explicit Consent Checkpoints
            </p>
            <p>
              Nothing leaves your browser automatically. KAVACH requires explicit user action and
              consent before sending text to the server-side Gemini assistant or submitting a
              report snapshot to the KAVACH Prototype Review Queue.
            </p>
          </div>

          <div className="bg-[#F8FAFC] border border-slate-200 rounded-lg p-4 space-y-1.5">
            <p className="font-display text-sm font-semibold text-[#0B1220]">
              Minimal Personal Data Principle
            </p>
            <p>
              KAVACH never forces you to enter Aadhaar numbers, home addresses, bank passwords, or
              witness contact information to prepare or download an incident report.
            </p>
          </div>
        </div>

        {/* Local Data Management Controls */}
        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportAllJson}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Local Storage Backup (.JSON)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onResetDemoData();
              setActionFeedback('Restored fictional sample demo incident.');
              setTimeout(() => setActionFeedback(null), 3500);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Fictional Demo Incident</span>
          </button>

          {confirmClear ? (
            <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
              <span className="text-xs font-semibold text-red-900">
                Permanently erase all browser records?
              </span>
              <button
                type="button"
                onClick={() => {
                  onClearAllData();
                  setConfirmClear(false);
                  setActionFeedback('Cleared all KAVACH data from browser local storage.');
                  setTimeout(() => setActionFeedback(null), 3500);
                }}
                className="px-2.5 py-1 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded cursor-pointer"
              >
                Confirm Erase
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-red-100 rounded cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All Browser Data</span>
            </button>
          )}
        </div>
      </div>

      {/* Module 10: Shared Data & Backend Architecture */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex items-start gap-3">
          <Server className="w-5 h-5 text-[#2563EB] shrink-0 mt-0.5" />
          <div>
            <h2 className="font-display text-base font-semibold text-[#0B1220]">
              2. Shared Data &amp; Prototype Backend Architecture
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              How Citizen Workspace records and the Authority / Case Reviewer Prototype Queue
              interact safely in this build, and what a multi-user production deployment requires.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-[#F8FAFC] border border-slate-200 rounded-lg p-4 space-y-2">
            <p className="font-semibold text-[#0B1220] flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Current Prototype Persistence Model</span>
            </p>
            <ul className="list-disc pl-4 space-y-1.5 text-slate-600">
              <li>
                <strong>Citizen Drafts:</strong>{' '}
                {archInfo?.citizenDraftStorage ||
                  'Browser localStorage (isolated to current browser profile).'}
              </li>
              <li>
                <strong>Prototype Review Queue:</strong>{' '}
                {archInfo?.prototypeReviewerBackend ||
                  'Local Express JSON Store (.kavach-prototype-store.json) — Prototype Demo Mode.'}
              </li>
              <li>
                <strong>Access Protection:</strong> Citizen status sync requires a per-case{' '}
                <code className="font-mono">x-kavach-case-token</code>; Reviewer Queue access
                requires explicit role activation so reports are never publicly enumerable.
              </li>
              <li>
                <strong>Server-Side Gemini AI:</strong>{' '}
                {archInfo
                  ? archInfo.geminiServerConfigured
                    ? 'Active on Express backend (API key stays strictly server-side).'
                    : 'Not configured; deterministic local fallback active.'
                  : 'Checked via /api/ai/status.'}
              </li>
            </ul>
          </div>

          <div className="bg-[#F8FAFC] border border-slate-200 rounded-lg p-4 space-y-2">
            <p className="font-semibold text-[#0B1220]">
              Production Deployment Requirements (Not Claimed in Prototype)
            </p>
            <ul className="list-disc pl-4 space-y-1.5 text-slate-600">
              {(
                archInfo?.productionRequirements || [
                  'Managed encrypted database (PostgreSQL or Cloud Firestore) with row/document-level access control',
                  'Citizen & Reviewer OIDC/OAuth authentication with strict RBAC separation and MFA for reviewers',
                  'Official MoU & authorized government API gateway credentials (not publicly offered by cybercrime.gov.in / 112.gov.in)',
                  'Immutable server-side audit logging and KMS field encryption for sensitive PII',
                ]
              ).map((req, idx) => (
                <li key={idx}>{req}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Honest Architecture & Non-Claims Disclosure */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-[#2563EB] shrink-0 mt-0.5" />
          <div>
            <h2 className="font-display text-base font-semibold text-[#0B1220]">
              3. Explicit Honesty &amp; Non-Claim Disclosures
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              KAVACH enforces strict factual boundaries across AI assistance, external portals, and
              case tracking:
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg text-xs">
          <div className="p-4 grid grid-cols-1 sm:grid-cols-12 gap-2">
            <span className="sm:col-span-4 font-semibold text-[#0B1220]">
              Government &amp; Police Connectivity
            </span>
            <span className="sm:col-span-8 text-slate-600">
              <strong>No live government API connection exists.</strong> KAVACH links directly to
              verified public portals (<code className="font-mono">cybercrime.gov.in</code>,{' '}
              <code className="font-mono">112.gov.in</code>,{' '}
              <code className="font-mono">wcd.gov.in</code>) and never fabricates official
              acknowledgement numbers, live police statuses, or automated filings.
            </span>
          </div>

          <div className="p-4 grid grid-cols-1 sm:grid-cols-12 gap-2">
            <span className="sm:col-span-4 font-semibold text-[#0B1220]">
              Private / NGO Support Partnerships
            </span>
            <span className="sm:col-span-8 text-slate-600">
              <strong>Directory only — no implied endorsement or live CRM link.</strong> Listed
              helplines and NGOs are independent services; outreach tracking is strictly
              user-reported.
            </span>
          </div>

          <div className="p-4 grid grid-cols-1 sm:grid-cols-12 gap-2">
            <span className="sm:col-span-4 font-semibold text-[#0B1220]">
              AI Factual &amp; Legal Boundaries
            </span>
            <span className="sm:col-span-8 text-slate-600">
              <strong>Never invents facts or legal conclusions.</strong> Gemini AI organizes only
              user-provided text, separates unconfirmed timeline suggestions from confirmed events,
              and never claims to verify digital evidence authenticity or criminal liability.
            </span>
          </div>

          <div className="p-4 grid grid-cols-1 sm:grid-cols-12 gap-2">
            <span className="sm:col-span-4 font-semibold text-[#0B1220]">
              Encryption at Rest &amp; Public Blockchains
            </span>
            <span className="sm:col-span-8 text-slate-600">
              <strong>No unimplemented security claims; zero public blockchain storage.</strong>{' '}
              Browser <code className="font-mono">localStorage</code> stores unencrypted JSON on
              your device, and sensitive evidence is never written to public blockchains. On shared
              devices, export your PDF and clear browser data when finished.
            </span>
          </div>
        </div>

        <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-3.5 flex items-start gap-2.5 text-xs text-slate-700">
          <Info className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
          <span>
            <strong>Fictional Demo Data Notice:</strong> Pre-loaded sample cases (
            <code className="font-mono">KVC-DEMO-0104</code> and{' '}
            <code className="font-mono">KVC-DEMO-0209</code>) use completely fictional scenarios
            and personas created solely for product walkthroughs.
          </span>
        </div>
      </div>
    </div>
  );
};
