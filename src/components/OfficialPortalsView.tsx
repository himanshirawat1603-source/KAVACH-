import { useState } from 'react';
import {
  ArrowRight,
  Download,
  ExternalLink,
  FileText,
  Info,
  PhoneCall,
  SearchCheck,
  Shield,
  Users,
} from 'lucide-react';
import { IncidentRecord } from '../types/incident';
import { downloadIncidentPdf } from '../utils/pdfGenerator';

interface OfficialPortalsViewProps {
  cases: IncidentRecord[];
  onOpenCaseOfficialSection: (caseCode: string) => void;
}

const OFFICIAL_GOVERNMENT_PORTALS = [
  {
    id: 'nccrp',
    buttonLabel: 'National Cyber Crime Reporting Portal',
    url: 'https://cybercrime.gov.in/',
    authority: 'Ministry of Home Affairs, Government of India',
    helpline: 'National Cyber Helpline: 1930',
    description:
      'Official Government of India portal to report cyberbullying, online harassment, impersonation, threats, cyber stalking, and online financial fraud.',
    icon: Shield,
  },
  {
    id: 'erss-112',
    buttonLabel: 'Emergency Assistance — 112',
    url: 'https://112.gov.in/',
    authority: 'Emergency Response Support System (ERSS), Government of India',
    helpline: '24x7 Toll-Free Emergency Number: 112',
    description:
      'Pan-India emergency response portal for immediate police, medical, fire, or personal safety dispatch.',
    icon: PhoneCall,
  },
  {
    id: 'wcd-women-help',
    buttonLabel: 'Women and Child Development — Support Information',
    url: 'https://wcd.gov.in/women/help',
    authority: 'Ministry of Women & Child Development, Government of India',
    helpline: 'Women Helpline (All-India): 181',
    description:
      'Official central directory of Women Helpline (181), One Stop Centres (Sakhi), and institutional safety resources.',
    icon: Users,
  },
  {
    id: 'track-cybercrime',
    buttonLabel: 'Track Cybercrime Complaint',
    url: 'https://www.cybercrime.gov.in/Webform/chkackstatus.aspx',
    authority: 'National Cyber Crime Reporting Portal — Official Status Check',
    helpline: 'Requires Official Portal Acknowledgement Number & OTP',
    description:
      'Check the live status of an official cybercrime complaint directly on cybercrime.gov.in using the acknowledgement number issued by that portal.',
    icon: SearchCheck,
  },
];

export function OfficialPortalsView({
  cases,
  onOpenCaseOfficialSection,
}: OfficialPortalsViewProps) {
  const [selectedCaseCode, setSelectedCaseCode] = useState<string>(cases[0]?.caseCode || '');

  const selectedCase =
    cases.find((c) => c.caseCode === selectedCaseCode) || cases[0] || null;

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
          Verified External Government Websites
        </span>
        <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Official Complaint Portals
        </h1>
      </div>

      {/* Required Notice (Requirement #10) */}
      <div className="rounded-2xl bg-blue-950/60 border border-cyan-400/35 p-5 flex items-start gap-3.5">
        <Info className="h-5 w-5 text-cyan-300 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm sm:text-base font-semibold text-white">
            KAVACH helps you organize your incident report. Complete official complaint submission
            on the relevant government website.
          </p>
          <p className="text-xs text-slate-300">
            Every button below opens the verified official government website directly in a new
            browser tab so security headers never block your access.
          </p>
        </div>
      </div>

      {/* Download PDF Before Leaving KAVACH (Requirement #10) */}
      <div className="rounded-2xl bg-[#0A1428]/90 border border-blue-400/20 p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="h-4 w-4 text-cyan-400" />
            Step 1: Download Your Structured KAVACH PDF Before Leaving
          </h2>
          <p className="text-xs text-slate-400">
            Having your organized timeline, dates, and evidence inventory PDF ready makes filling
            out the official government portal much faster.
          </p>
        </div>

        {cases.length > 0 && selectedCase ? (
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <select
              value={selectedCase.caseCode}
              onChange={(e) => setSelectedCaseCode(e.target.value)}
              aria-label="Select case to export as PDF"
              className="px-3.5 py-2.5 rounded-xl bg-[#060D1B] border border-slate-700 text-xs sm:text-sm text-white max-w-xs"
            >
              {cases.map((c) => (
                <option key={c.caseCode} value={c.caseCode}>
                  {c.caseCode} — {c.title.slice(0, 34)}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => downloadIncidentPdf(selectedCase)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/25 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              Download Incident Report (PDF)
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">
            Create and save a case first if you want to export a PDF summary before visiting a
            portal.
          </p>
        )}
      </div>

      {/* Step 2: Verified Official Portals Grid — Semantic <a target="_blank" rel="noopener noreferrer"> */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {OFFICIAL_GOVERNMENT_PORTALS.map((portal) => {
          const Icon = portal.icon;
          return (
            <div
              key={portal.id}
              className="rounded-2xl bg-[#0A1428]/90 border border-blue-400/20 hover:border-cyan-400/40 p-6 flex flex-col justify-between gap-5 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-600/20 border border-blue-400/30 flex items-center justify-center text-cyan-300 shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700 text-[11px] font-semibold text-cyan-300">
                    Official .gov.in Portal
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white">{portal.buttonLabel}</h3>
                  <p className="text-xs font-medium text-blue-300 mt-0.5">{portal.authority}</p>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {portal.description}
                </p>

                <div className="text-xs text-slate-400 space-y-1 pt-1">
                  <p className="font-semibold text-slate-200">{portal.helpline}</p>
                  <p className="font-mono text-[11px] text-cyan-400 break-all">{portal.url}</p>
                </div>
              </div>

              <a
                href={portal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-cyan-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/25 border border-cyan-300/25 transition-all"
              >
                <span>{portal.buttonLabel}</span>
                <ExternalLink className="h-4 w-4 shrink-0" />
              </a>
            </div>
          );
        })}
      </div>

      {/* Step 3: Record User-Provided Official Acknowledgement After Filing */}
      {selectedCase && (
        <div className="rounded-2xl bg-[#081122] border border-slate-800 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white">
              Already Submitted on an Official Portal?
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Record your official complaint or acknowledgement number inside{' '}
              <span className="font-mono text-cyan-300">{selectedCase.caseCode}</span> (kept
              strictly separate from your KAVACH Case ID).
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenCaseOfficialSection(selectedCase.caseCode)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-cyan-200 shrink-0 cursor-pointer"
          >
            Record Official Complaint Details
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
