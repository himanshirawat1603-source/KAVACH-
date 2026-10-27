import { IncidentCategory, UrgencyLevel } from '../types/incident';

export type RecommendationSector =
  | 'immediate-emergency'
  | 'public-authority'
  | 'private-support';

export interface SupportRecommendationItem {
  id: string;
  name: string;
  sector: RecommendationSector;
  classificationLabel: string;
  whyRelevant: string;
  relevantCategories: IncidentCategory[];
  relevantUrgencies: UrgencyLevel[];
  officialUrl: string;
  statusCheckUrl?: string;
  contactMethods: string[];
  informationVerified: boolean;
  verificationNote: string;
  technicalIntegrationExists: boolean;
  integrationStatusNote: string;
  portalSubmissionNotes: string;
}

/**
 * Verified official Indian public authorities, emergency helplines, and non-government
 * support organizations. Every URL and helpline number is verified from official public
 * sources. No partnerships or live integrations are claimed.
 */
export const VERIFIED_SUPPORT_DIRECTORY: SupportRecommendationItem[] = [
  // C. IMMEDIATE EMERGENCY HELP
  {
    id: 'erss-112',
    name: 'Emergency Response Support System (ERSS — 112)',
    sector: 'immediate-emergency',
    classificationLabel: 'Public Emergency Authority · Government of India',
    whyRelevant:
      'Single pan-India emergency response service connecting callers in immediate physical danger, active extortion, or urgent distress to Police, Fire, Health, and Women safety dispatch.',
    relevantCategories: [
      'threats',
      'online harassment',
      'cyberbullying',
      'impersonation',
      'online fraud',
      'other',
    ],
    relevantUrgencies: ['immediate-danger', 'high'],
    officialUrl: 'https://112.gov.in/',
    contactMethods: [
      'Emergency Voice Call: Dial 112 (24x7 toll-free across India)',
      'Official Information Portal: https://112.gov.in/',
    ],
    informationVerified: true,
    verificationNote: 'Verified official Ministry of Home Affairs (ERSS) portal and helpline.',
    technicalIntegrationExists: false,
    integrationStatusNote:
      'No direct API integration with KAVACH. Call 112 directly or visit 112.gov.in.',
    portalSubmissionNotes:
      'If you or someone nearby faces immediate physical threat, call 112 immediately—do not wait to complete an online form.',
  },
  {
    id: 'cyber-1930-urgent',
    name: 'National Cyber Crime Financial Fraud Helpline (1930)',
    sector: 'immediate-emergency',
    classificationLabel: 'Public Authority · Indian Cyber Crime Coordination Centre (I4C, MHA)',
    whyRelevant:
      'Time-critical national helpline for reporting unauthorized UPI, banking, card, or wallet cyber-fraud transactions as early as possible.',
    relevantCategories: ['online fraud', 'impersonation'],
    relevantUrgencies: ['immediate-danger', 'high', 'standard'],
    officialUrl: 'https://cybercrime.gov.in/',
    statusCheckUrl: 'https://www.cybercrime.gov.in/Webform/chkackstatus.aspx',
    contactMethods: [
      'Toll-Free Cyber Fraud Helpline: Dial 1930',
      'Official Filing Portal: https://cybercrime.gov.in/',
    ],
    informationVerified: true,
    verificationNote: 'Verified official MHA National Cyber Crime Reporting Portal & 1930 helpline.',
    technicalIntegrationExists: false,
    integrationStatusNote:
      'No direct API integration with KAVACH. Requires citizen login, mobile OTP, and CAPTCHA on cybercrime.gov.in.',
    portalSubmissionNotes:
      'Keep transaction reference IDs, bank/wallet names, timestamps, and screenshots ready when calling 1930 or filing on cybercrime.gov.in.',
  },

  // A. PUBLIC AUTHORITIES
  {
    id: 'nccrp-cybercrime-gov',
    name: 'National Cyber Crime Reporting Portal',
    sector: 'public-authority',
    classificationLabel: 'Public Authority · Ministry of Home Affairs, Government of India',
    whyRelevant:
      'Primary official Government of India portal enabling citizens to file cybercrime complaints online—including cybercrimes against women and children, online harassment, impersonation, threats, and financial cyber fraud.',
    relevantCategories: [
      'cyberbullying',
      'online harassment',
      'impersonation',
      'threats',
      'online fraud',
      'other',
    ],
    relevantUrgencies: ['immediate-danger', 'high', 'standard'],
    officialUrl: 'https://cybercrime.gov.in/',
    statusCheckUrl: 'https://www.cybercrime.gov.in/Webform/chkackstatus.aspx',
    contactMethods: [
      'Official Complaint Portal: https://cybercrime.gov.in/',
      'Official Status Check: https://www.cybercrime.gov.in/Webform/chkackstatus.aspx',
      'National Cyber Helpline: 1930',
    ],
    informationVerified: true,
    verificationNote: 'Verified official Government of India portal (cybercrime.gov.in).',
    technicalIntegrationExists: false,
    integrationStatusNote:
      'No authorized third-party submission API exists. Download your KAVACH PDF for reference and submit directly on cybercrime.gov.in.',
    portalSubmissionNotes:
      'Follows official MHA submission procedures, citizen OTP login, and state/UT police routing.',
  },
  {
    id: 'wcd-women-help',
    name: 'Ministry of Women & Child Development — Women Helpline & Support',
    sector: 'public-authority',
    classificationLabel: 'Public Authority · Ministry of Women & Child Development (MWCD)',
    whyRelevant:
      'Official central government resource page detailing Women Helpline (181), One Stop Centres (Sakhi), and support mechanisms for women experiencing harassment, threats, or abuse.',
    relevantCategories: ['online harassment', 'cyberbullying', 'threats', 'impersonation'],
    relevantUrgencies: ['immediate-danger', 'high', 'standard'],
    officialUrl: 'https://wcd.gov.in/women/help',
    contactMethods: [
      'Official MWCD Help Directory: https://wcd.gov.in/women/help',
      'Women Helpline (All-India): 181',
    ],
    informationVerified: true,
    verificationNote: 'Verified official Ministry of Women & Child Development web resource.',
    technicalIntegrationExists: false,
    integrationStatusNote:
      'No direct API integration with KAVACH. Provides official helpline information and support pathways.',
    portalSubmissionNotes:
      'Consult the official MWCD page for state-specific One Stop Centre and 181 helpline access.',
  },
  {
    id: 'nalsa-legal-aid',
    name: 'National Legal Services Authority (NALSA)',
    sector: 'public-authority',
    classificationLabel: 'Public Statutory Authority · Free Legal Aid (Legal Services Authorities Act)',
    whyRelevant:
      'Provides free legal aid, legal advice, and representation through State and District Legal Services Authorities for eligible citizens, including women, children, and victims of crime.',
    relevantCategories: [
      'threats',
      'online fraud',
      'impersonation',
      'online harassment',
      'cyberbullying',
      'other',
    ],
    relevantUrgencies: ['high', 'standard'],
    officialUrl: 'https://nalsa.gov.in/',
    contactMethods: [
      'Official Website & Legal Aid Application: https://nalsa.gov.in/',
      'NALSA Toll-Free Legal Aid Helpline: 15100',
    ],
    informationVerified: true,
    verificationNote: 'Verified statutory authority domain (nalsa.gov.in) and helpline 15100.',
    technicalIntegrationExists: false,
    integrationStatusNote:
      'No direct API integration with KAVACH. Applications are filed on nalsa.gov.in or via District Legal Services Authorities.',
    portalSubmissionNotes:
      'You can bring your downloaded KAVACH incident report PDF when consulting a legal-aid counsel so facts and dates are organized.',
  },
  {
    id: 'tele-manas-mohfw',
    name: 'Tele-MANAS (National Tele Mental Health Programme)',
    sector: 'public-authority',
    classificationLabel: 'Public Health Support Service · Ministry of Health & Family Welfare',
    whyRelevant:
      'Free 24x7 government mental-health counselling service in multiple regional languages for individuals experiencing emotional distress or anxiety due to cyberbullying, extortion, or online abuse.',
    relevantCategories: [
      'cyberbullying',
      'online harassment',
      'threats',
      'impersonation',
      'online fraud',
      'other',
    ],
    relevantUrgencies: ['immediate-danger', 'high', 'standard'],
    officialUrl: 'https://telemanas.mohfw.gov.in/',
    contactMethods: [
      '24x7 Toll-Free Helpline: 14416 or 1800-891-4416',
      'Official Portal: https://telemanas.mohfw.gov.in/',
    ],
    informationVerified: true,
    verificationNote: 'Verified official MoHFW Government of India mental health helpline.',
    technicalIntegrationExists: false,
    integrationStatusNote: 'No technical API integration. Telephone counselling service.',
    portalSubmissionNotes: 'Free, confidential telephone support operated under MoHFW.',
  },

  // B. PRIVATE OR NON-GOVERNMENT SUPPORT
  {
    id: 'icall-tiss',
    name: 'iCALL Psychosocial Helpline (TISS)',
    sector: 'private-support',
    classificationLabel: 'Non-Government / Academic Psychosocial Counselling Service',
    whyRelevant:
      'Professional, non-judgmental telephone and email counselling operated by the School of Human Ecology at Tata Institute of Social Sciences (TISS) for individuals facing harassment, cyberbullying, or distress.',
    relevantCategories: [
      'cyberbullying',
      'online harassment',
      'threats',
      'impersonation',
      'other',
    ],
    relevantUrgencies: ['high', 'standard'],
    officialUrl: 'https://icallhelpline.org/',
    contactMethods: [
      'Helpline: +91 9152987821 (Monday to Saturday, 10:00 AM – 8:00 PM IST)',
      'Email Counselling: icall@tiss.edu',
      'Official Website: https://icallhelpline.org/',
    ],
    informationVerified: true,
    verificationNote: 'Verified official TISS iCALL domain and published helpline details.',
    technicalIntegrationExists: false,
    integrationStatusNote:
      'No technical integration or partnership with KAVACH. Contact iCALL directly via phone or email.',
    portalSubmissionNotes:
      'Do not email raw sensitive attachments without first reviewing iCALL’s counselling intake guidance.',
  },
  {
    id: 'sflc-india',
    name: 'Software Freedom Law Centre, India (SFLC.in)',
    sector: 'private-support',
    classificationLabel: 'Non-Government Legal & Digital Rights Organization (NGO)',
    whyRelevant:
      'Non-profit legal organization specializing in digital civil liberties, online harassment guides, intermediary takedown awareness, and pro-bono digital rights legal assistance.',
    relevantCategories: ['impersonation', 'online harassment', 'cyberbullying', 'other'],
    relevantUrgencies: ['standard', 'high'],
    officialUrl: 'https://sflc.in/',
    contactMethods: ['Official Website & Contact Information: https://sflc.in/'],
    informationVerified: true,
    verificationNote: 'Verified official non-profit organization domain (sflc.in).',
    technicalIntegrationExists: false,
    integrationStatusNote:
      'No technical API integration or partnership with KAVACH. External website contact only.',
    portalSubmissionNotes:
      'Review SFLC.in’s published scope and privacy notice before sharing personal case specifics.',
  },
  {
    id: 'cyberpeace-foundation',
    name: 'CyberPeace Foundation',
    sector: 'private-support',
    classificationLabel: 'Non-Government Civil Society Cyber-Safety NGO',
    whyRelevant:
      'Civil society organization offering cyber-safety awareness, digital hygiene guidance, and guidance on platform reporting and online scam recovery steps.',
    relevantCategories: [
      'online fraud',
      'impersonation',
      'cyberbullying',
      'online harassment',
      'other',
    ],
    relevantUrgencies: ['standard'],
    officialUrl: 'https://www.cyberpeace.org/',
    contactMethods: ['Official Website & Contact Page: https://www.cyberpeace.org/'],
    informationVerified: true,
    verificationNote: 'Verified official NGO website (cyberpeace.org).',
    technicalIntegrationExists: false,
    integrationStatusNote:
      'No technical API integration or partnership with KAVACH. External website contact only.',
    portalSubmissionNotes:
      'Independent non-governmental organization; does not replace official police or 1930 cybercrime reporting.',
  },
  {
    id: 'local-campus-unverified-notice',
    name: 'Local Campus ICC / Anti-Ragging Cell or District NGO (Manual Verification Required)',
    sector: 'private-support',
    classificationLabel: 'Institutional / Local Support · Verification Required by User',
    whyRelevant:
      'If the incident involves fellow students, faculty, or workplace colleagues, your institution’s Internal Complaints Committee (ICC), Anti-Ragging Cell, or local NGO may have direct jurisdiction.',
    relevantCategories: [
      'cyberbullying',
      'online harassment',
      'impersonation',
      'threats',
      'other',
    ],
    relevantUrgencies: ['standard', 'high'],
    officialUrl: '',
    contactMethods: [
      'Verify official email/phone directly on your university, employer, or district website.',
    ],
    informationVerified: false,
    verificationNote:
      'Verification Required: KAVACH never fabricates local institution or NGO phone numbers. Please look up your institution’s official handbook.',
    technicalIntegrationExists: false,
    integrationStatusNote: 'Manual external outreach only; you can log contact updates in Track My Case.',
    portalSubmissionNotes:
      'Export your KAVACH report PDF and verify the official institutional address before sharing.',
  },
];

export function getRecommendationsForIncident(
  category: IncidentCategory,
  urgency: UrgencyLevel
): {
  emergency: SupportRecommendationItem[];
  publicAuthorities: SupportRecommendationItem[];
  privateSupport: SupportRecommendationItem[];
} {
  const emergency = VERIFIED_SUPPORT_DIRECTORY.filter(
    (item) =>
      item.sector === 'immediate-emergency' &&
      (urgency === 'immediate-danger' || item.relevantCategories.includes(category))
  );

  const publicAuthorities = VERIFIED_SUPPORT_DIRECTORY.filter(
    (item) => item.sector === 'public-authority' && item.relevantCategories.includes(category)
  );

  const privateSupport = VERIFIED_SUPPORT_DIRECTORY.filter(
    (item) => item.sector === 'private-support' && item.relevantCategories.includes(category)
  );

  return { emergency, publicAuthorities, privateSupport };
}
