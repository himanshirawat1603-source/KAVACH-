import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Database,
  ExternalLink,
  FileCheck2,
  HelpCircle,
  Lock,
  PhoneCall,
  ShieldAlert,
} from 'lucide-react';
import { KavachLogo } from './KavachLogo';
import { KavachUser, PublicPageView } from '../types/incident';

interface PublicInfoPagesProps {
  page: 'about' | 'help';
  currentUser: KavachUser | null;
  onNavigatePublic: (page: PublicPageView) => void;
  onEnterDashboard: () => void;
}

export function PublicInfoPages({
  page,
  currentUser,
  onNavigatePublic,
  onEnterDashboard,
}: PublicInfoPagesProps) {
  return (
    <div className="min-h-screen bg-[#050B16] text-slate-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-blue-400/15 bg-[#050B16]/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigatePublic('home')}
            className="focus:outline-none cursor-pointer"
          >
            <KavachLogo size="sm" />
          </button>

          <nav className="flex items-center gap-5 text-sm font-medium">
            <button
              type="button"
              onClick={() => onNavigatePublic('home')}
              className="text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => onNavigatePublic('about')}
              className={`transition-colors cursor-pointer ${
                page === 'about' ? 'text-cyan-300 font-semibold' : 'text-slate-300 hover:text-white'
              }`}
            >
              About
            </button>
            <button
              type="button"
              onClick={() => onNavigatePublic('help')}
              className={`transition-colors cursor-pointer ${
                page === 'help' ? 'text-cyan-300 font-semibold' : 'text-slate-300 hover:text-white'
              }`}
            >
              Help
            </button>
            {currentUser ? (
              <button
                type="button"
                onClick={onEnterDashboard}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold cursor-pointer"
              >
                Dashboard
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigatePublic('signin')}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold cursor-pointer"
              >
                Sign In
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button
          type="button"
          onClick={() => onNavigatePublic('home')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-cyan-300 transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Homepage
        </button>

        {page === 'about' ? (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                About KAVACH
              </h1>
              <p className="mt-3 text-base text-slate-300 max-w-3xl leading-relaxed">
                KAVACH helps citizens document cyber-safety incidents, organize digital evidence,
                maintain permanent case histories, and prepare structured PDF dossiers before
                approaching official portals or support organizations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="rounded-2xl bg-[#0A1428]/90 border border-blue-400/20 p-6">
                <Lock className="h-6 w-6 text-cyan-400 mb-3" />
                <h2 className="text-base font-bold text-white">Private User Accounts</h2>
                <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                  Every citizen account isolates cases, timelines, and evidence inventories so
                  another user cannot view, modify, or delete your records.
                </p>
              </div>

              <div className="rounded-2xl bg-[#0A1428]/90 border border-blue-400/20 p-6">
                <Database className="h-6 w-6 text-cyan-400 mb-3" />
                <h2 className="text-base font-bold text-white">Permanent Case IDs</h2>
                <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                  Each saved case is assigned a unique permanent KAVACH Case ID (for example,{' '}
                  <code className="text-cyan-300 font-mono">KAV-A7K9P2Q4</code>) stored in the
                  application database across sessions.
                </p>
              </div>

              <div className="rounded-2xl bg-[#0A1428]/90 border border-blue-400/20 p-6">
                <FileCheck2 className="h-6 w-6 text-cyan-400 mb-3" />
                <h2 className="text-base font-bold text-white">Honest Scope & Boundaries</h2>
                <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                  KAVACH is an independent documentation and reporting-assistance tool. It does not
                  replace law enforcement, verify forensic authenticity, or claim live government API
                  connections.
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-[#0A1428]/80 border border-slate-800 p-6 sm:p-8 space-y-4">
              <h2 className="text-xl font-bold text-white">How KAVACH Works</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-300">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-white">1. Create & Save Your Case</p>
                    <p className="text-slate-400 mt-0.5">
                      Record what happened, when and where it occurred, and receive your permanent
                      KAVACH Case ID.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-white">2. Organize Evidence & Timeline</p>
                    <p className="text-slate-400 mt-0.5">
                      Attach supported evidence files or manual reference logs and arrange events in
                      chronological order.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-white">3. Optional AI Neutral Review</p>
                    <p className="text-slate-400 mt-0.5">
                      Generate a neutral factual summary and check for missing details—always
                      editable by you before saving.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-white">4. Export PDF & File Officially</p>
                    <p className="text-slate-400 mt-0.5">
                      Download your structured PDF report and open the relevant official government
                      portal in a new tab.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => (currentUser ? onEnterDashboard() : onNavigatePublic('signup'))}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold cursor-pointer"
                >
                  {currentUser ? 'Open Citizen Dashboard' : 'Create Your Account'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Help Center & Emergency Guidance
              </h1>
              <p className="mt-3 text-base text-slate-300 max-w-3xl leading-relaxed">
                KAVACH helps you organize your incident report. Complete official complaint
                submission on the relevant government website.
              </p>
            </div>

            {/* Immediate Emergency Banner */}
            <div className="rounded-2xl bg-red-950/40 border border-red-500/35 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <ShieldAlert className="h-6 w-6 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-base font-bold text-white">
                    Immediate Physical Danger or Active Financial Fraud?
                  </h2>
                  <p className="text-sm text-slate-300 mt-1">
                    Call <strong className="text-white">112</strong> immediately for emergency
                    police/safety assistance, or dial <strong className="text-white">1930</strong>{' '}
                    for urgent cyber financial fraud reporting in India.
                  </p>
                </div>
              </div>
              <a
                href="https://112.gov.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shrink-0"
              >
                <PhoneCall className="h-3.5 w-3.5" />
                112 Emergency Portal
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            {/* Official Government Portals */}
            <div className="rounded-2xl bg-[#0A1428]/90 border border-blue-400/20 p-6 space-y-4">
              <h2 className="text-lg font-bold text-white">Verified Official Government Portals</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    label: 'National Cyber Crime Reporting Portal',
                    url: 'https://cybercrime.gov.in/',
                    desc: 'Official Ministry of Home Affairs portal for cybercrime & online harassment complaints.',
                  },
                  {
                    label: 'Emergency Assistance — 112',
                    url: 'https://112.gov.in/',
                    desc: 'Emergency Response Support System (ERSS) pan-India emergency portal.',
                  },
                  {
                    label: 'Women and Child Development — Support Information',
                    url: 'https://wcd.gov.in/women/help',
                    desc: 'Official Women Helpline (181) and institutional support resources.',
                  },
                  {
                    label: 'Track Cybercrime Complaint',
                    url: 'https://www.cybercrime.gov.in/Webform/chkackstatus.aspx',
                    desc: 'Official status page to track complaints filed on cybercrime.gov.in.',
                  },
                ].map((portal) => (
                  <a
                    key={portal.url}
                    href={portal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group rounded-xl bg-[#070E1D] hover:bg-[#0D1A33] border border-slate-800 hover:border-cyan-400/40 p-4 flex flex-col justify-between transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm text-white group-hover:text-cyan-300 transition-colors">
                          {portal.label}
                        </span>
                        <ExternalLink className="h-4 w-4 text-cyan-400 shrink-0" />
                      </div>
                      <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">{portal.desc}</p>
                    </div>
                    <span className="mt-3 text-[11px] font-mono text-blue-400 truncate">
                      {portal.url}
                    </span>
                  </a>
                ))}
              </div>
            </div>

            {/* Frequently Asked Questions */}
            <div className="rounded-2xl bg-[#0A1428]/80 border border-slate-800 p-6 space-y-4">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-cyan-400" />
                <h2 className="text-lg font-bold text-white">Frequently Asked Questions</h2>
              </div>
              <div className="space-y-4 text-sm">
                <div className="border-b border-slate-800/80 pb-4">
                  <p className="font-semibold text-white">
                    Is my KAVACH Case ID an official police FIR or government acknowledgement number?
                  </p>
                  <p className="mt-1 text-slate-400">
                    No. Your KAVACH Case ID (such as <code className="text-cyan-300">KAV-A7K9P2Q4</code>) is an internal KAVACH reference for organizing your private case. After you file on an official government portal, you can separately record your official acknowledgement number inside your case.
                  </p>
                </div>
                <div className="border-b border-slate-800/80 pb-4">
                  <p className="font-semibold text-white">
                    Where are my account and cases stored?
                  </p>
                  <p className="mt-1 text-slate-400">
                    Your account profile, permanent Case IDs, case details, evidence metadata, and chronological status history are saved in KAVACH’s server database (<code className="text-slate-300">kavach.sqlite</code>) linked strictly to your user ID.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-white">
                    Does AI verify the authenticity of uploaded screenshots or documents?
                  </p>
                  <p className="mt-1 text-slate-400">
                    Never. AI assistance only summarizes user-provided text in neutral language, highlights missing details, and suggests candidate timeline events for your review.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
