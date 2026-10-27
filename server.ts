import 'dotenv/config';
import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  buildClientStructuredReportAndReview,
  evaluateMissingChecklistCandidates,
  formatResolutionLabel,
  formatStructuredReportFullText,
} from './src/data/demoIncident.ts';
import type {
  ChecklistItemKind,
  ChecklistJumpTarget,
  IncidentCategory,
  IncidentRecord,
  MissingInfoQuestion,
  StructuredAiReport,
  WorkflowStageNumber,
} from './src/types/incident.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const SQLITE_DB_PATH = path.join(__dirname, 'kavach.sqlite');

const CASE_ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const VALID_CASE_STATUSES = new Set([
  'Draft',
  'Ready for Submission',
  'Submitted Externally',
  'Under Review',
  'Resolved',
  'Closed',
]);

const VALID_DEMO_REVIEWER_STATUSES = new Set([
  'Received by KAVACH Review System',
  'Under Review',
  'More Information Needed',
  'Review Completed',
  'Closed',
]);

const ALLOWED_PORTAL_HOSTS = new Set([
  'cybercrime.gov.in',
  'www.cybercrime.gov.in',
  '112.gov.in',
  'www.112.gov.in',
  'wcd.gov.in',
  'www.wcd.gov.in',
  'nalsa.gov.in',
  'www.nalsa.gov.in',
  'telemanas.mohfw.gov.in',
  'icallhelpline.org',
  'www.icallhelpline.org',
  'sflc.in',
  'www.sflc.in',
  'cyberpeace.org',
  'www.cyberpeace.org',
]);

interface DbUserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  password_salt: string;
  role: string;
  created_at: string;
  updated_at: string;
}

interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: 'citizen' | 'demo_authority';
  createdAt: string;
}

interface DbCaseRow {
  id: string;
  case_code: string;
  legacy_case_code: string | null;
  owner_user_id: string;
  title: string;
  category: string;
  urgency_level: string;
  platform: string;
  location: string;
  people_involved?: string;
  incident_date: string;
  incident_time: string;
  timezone: string;
  description: string;
  additional_notes: string;
  workflow_stage?: number;
  completed_stages_json?: string;
  structured_report_json?: string;
  kavach_status: string;
  submission_state: string;
  evidence_json: string;
  timeline_json: string;
  witnesses_json: string;
  preferences_json: string;
  ai_summary: string;
  ai_summary_source: string | null;
  ai_summary_updated_at: string | null;
  ai_evidence_index: string;
  missing_info_json: string;
  official_tracking_json: string;
  private_support_json: string;
  latest_activity: string;
  created_at: string;
  updated_at: string;
}

interface DbStatusHistoryRow {
  id: string;
  case_code: string;
  owner_user_id: string;
  previous_status: string | null;
  new_status: string;
  note: string;
  changed_by: string;
  created_at: string;
}

interface EvidenceInput {
  fileName: string;
  fileType: string;
  entryMethod: string;
  storageIndicator?: string;
  description: string;
  sourceUrl?: string;
  capturedAt?: string;
}

interface TimelineInput {
  date: string;
  time: string;
  title: string;
  description: string;
  source: string;
  confirmed: boolean;
}

interface AnalyzeIncidentBody {
  title?: string;
  category?: string;
  platform?: string;
  location?: string;
  date?: string;
  time?: string;
  description?: string;
  additionalNotes?: string;
  evidence?: EvidenceInput[];
  timeline?: TimelineInput[];
}

function initDatabase(): DatabaseSync {
  const db = new DatabaseSync(SQLITE_DB_PATH);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'citizen',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY,
      case_code TEXT NOT NULL UNIQUE,
      legacy_case_code TEXT,
      owner_user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      urgency_level TEXT NOT NULL DEFAULT 'standard',
      platform TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      incident_date TEXT NOT NULL DEFAULT '',
      incident_time TEXT NOT NULL DEFAULT '',
      timezone TEXT NOT NULL DEFAULT 'IST (UTC+05:30)',
      description TEXT NOT NULL DEFAULT '',
      additional_notes TEXT NOT NULL DEFAULT '',
      kavach_status TEXT NOT NULL DEFAULT 'Draft',
      submission_state TEXT NOT NULL DEFAULT 'kavach-draft',
      evidence_json TEXT NOT NULL DEFAULT '[]',
      timeline_json TEXT NOT NULL DEFAULT '[]',
      witnesses_json TEXT NOT NULL DEFAULT '[]',
      preferences_json TEXT NOT NULL DEFAULT '{}',
      ai_summary TEXT NOT NULL DEFAULT '',
      ai_summary_source TEXT,
      ai_summary_updated_at TEXT,
      ai_evidence_index TEXT NOT NULL DEFAULT '',
      missing_info_json TEXT NOT NULL DEFAULT '[]',
      official_tracking_json TEXT NOT NULL DEFAULT '{}',
      private_support_json TEXT NOT NULL DEFAULT '[]',
      latest_activity TEXT NOT NULL DEFAULT 'Case created',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_cases_owner ON cases(owner_user_id);

    CREATE TABLE IF NOT EXISTS case_status_history (
      id TEXT PRIMARY KEY,
      case_code TEXT NOT NULL,
      owner_user_id TEXT NOT NULL,
      previous_status TEXT,
      new_status TEXT NOT NULL,
      note TEXT NOT NULL,
      changed_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_history_case ON case_status_history(case_code);
    CREATE INDEX IF NOT EXISTS idx_history_owner ON case_status_history(owner_user_id);

    CREATE TABLE IF NOT EXISTS demo_authority_cases (
      case_code TEXT PRIMARY KEY,
      assigned_unit_label TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      incident_date TEXT NOT NULL,
      incident_time TEXT NOT NULL,
      location TEXT NOT NULL,
      platform TEXT NOT NULL,
      description TEXT NOT NULL,
      summary TEXT NOT NULL,
      evidence_json TEXT NOT NULL,
      timeline_json TEXT NOT NULL,
      case_notes TEXT NOT NULL,
      reviewer_status TEXT NOT NULL,
      review_history_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  ensureCaseSchemaMigrations(db);
  seedDemoAuthorityCases(db);
  return db;
}

function ensureCaseSchemaMigrations(db: DatabaseSync): void {
  const cols = db.prepare('PRAGMA table_info(cases)').all() as unknown as { name: string }[];
  const existingNames = new Set(cols.map((c) => c.name));

  if (!existingNames.has('people_involved')) {
    db.exec("ALTER TABLE cases ADD COLUMN people_involved TEXT NOT NULL DEFAULT '';");
  }
  if (!existingNames.has('workflow_stage')) {
    db.exec('ALTER TABLE cases ADD COLUMN workflow_stage INTEGER NOT NULL DEFAULT 1;');
  }
  if (!existingNames.has('completed_stages_json')) {
    db.exec("ALTER TABLE cases ADD COLUMN completed_stages_json TEXT NOT NULL DEFAULT '[]';");
  }
  if (!existingNames.has('structured_report_json')) {
    db.exec("ALTER TABLE cases ADD COLUMN structured_report_json TEXT NOT NULL DEFAULT '';");
  }
}

function seedDemoAuthorityCases(db: DatabaseSync): void {
  const countRow = db
    .prepare('SELECT COUNT(*) as cnt FROM demo_authority_cases')
    .get() as { cnt: number };
  if (countRow && countRow.cnt > 0) {
    return;
  }

  const insertStmt = db.prepare(`
    INSERT INTO demo_authority_cases (
      case_code, assigned_unit_label, title, category, incident_date, incident_time,
      location, platform, description, summary, evidence_json, timeline_json,
      case_notes, reviewer_status, review_history_json, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertStmt.run(
    'KAV-D3M0A1B2',
    'Demo Institutional Intake Desk (Sample Data)',
    'Fictional Sample: Cloned Student Club Profile Soliciting UPI Transfers',
    'impersonation',
    '2026-10-18',
    '19:40',
    'Bengaluru (Fictional Campus Walkthrough)',
    'Instagram & WhatsApp',
    'DEMO SAMPLE RECORD: Fictional student reported an unauthorized duplicate account copying a club coordinator bio and sending urgent payment requests to peers.',
    'Neutral summary of fictional sample case: Duplicate profile reported on Instagram with two screenshot references and an in-app impersonation ticket.',
    JSON.stringify([
      {
        fileName: 'clone_profile_header_sample.png',
        fileType: 'image/png',
        storageIndicator: 'Sample Metadata Entry',
        capturedAt: '2026-10-18 20:05',
        description: 'Screenshot showing cloned display photo and handle.',
      },
      {
        fileName: 'solicitation_chat_export_sample.pdf',
        fileType: 'application/pdf',
        storageIndicator: 'Sample Metadata Entry',
        capturedAt: '2026-10-18 20:22',
        description: 'Forwarded direct message thread requesting urgent transfer.',
      },
    ]),
    JSON.stringify([
      {
        date: '2026-10-18',
        time: '19:40',
        title: 'Classmate flagged duplicate profile',
        description: 'Received alert via WhatsApp regarding unauthorized account.',
        confirmed: true,
      },
      {
        date: '2026-10-18',
        time: '21:25',
        title: 'Submitted platform impersonation report',
        description: 'Filed in-app report and posted warning to student group.',
        confirmed: true,
      },
    ]),
    'SAMPLE REVIEWER NOTE: Verify whether the UPI handle visible in the chat export was documented separately before closing internal review.',
    'Under Review',
    JSON.stringify([
      {
        id: 'drev-1',
        previousStatus: null,
        newStatus: 'Received by KAVACH Review System',
        timestamp: '2026-10-18T21:45:00.000Z',
        reviewerName: 'Demo System Seed',
        note: 'Pre-loaded sample case for Demo Authority Dashboard.',
      },
      {
        id: 'drev-2',
        previousStatus: 'Received by KAVACH Review System',
        newStatus: 'Under Review',
        timestamp: '2026-10-19T09:30:00.000Z',
        reviewerName: 'Demo Reviewer (Sample)',
        note: 'Reviewing timeline completeness and evidence descriptions.',
      },
    ]),
    '2026-10-19T09:30:00.000Z'
  );

  insertStmt.run(
    'KAV-F8R4Q9L6',
    'Demo Institutional Intake Desk (Sample Data)',
    'Fictional Sample: Lookalike Internship Portal Requesting Verification Deposit',
    'online fraud',
    '2026-10-21',
    '11:30',
    'Online / Remote',
    'Telegram & External Web Link',
    'DEMO SAMPLE RECORD: Unsolicited recruiter message directed a fictional applicant to a spoofed registration form asking for an upfront fee. No money was sent.',
    'Neutral summary of fictional sample case: Phishing recruitment outreach logged prior to any financial loss; chat export metadata recorded.',
    JSON.stringify([
      {
        fileName: 'telegram_recruiter_thread_sample.json',
        fileType: 'application/json',
        storageIndicator: 'Sample Metadata Entry',
        capturedAt: '2026-10-21 11:48',
        description: 'Exported message headers and lookalike domain URL.',
      },
    ]),
    JSON.stringify([
      {
        date: '2026-10-21',
        time: '11:30',
        title: 'Received unsolicited Telegram message',
        description: 'Sender shared external link asking for registration deposit.',
        confirmed: true,
      },
      {
        date: '2026-10-21',
        time: '11:48',
        title: 'Confirmed official domain mismatch and preserved log',
        description: 'Checked official company website and exported chat transcript.',
        confirmed: true,
      },
    ]),
    'SAMPLE REVIEWER NOTE: Plain-text lookalike domain URL requested for completeness.',
    'More Information Needed',
    JSON.stringify([
      {
        id: 'drev-201',
        previousStatus: null,
        newStatus: 'Received by KAVACH Review System',
        timestamp: '2026-10-21T14:15:00.000Z',
        reviewerName: 'Demo System Seed',
        note: 'Pre-loaded sample case for Demo Authority Dashboard.',
      },
      {
        id: 'drev-202',
        previousStatus: 'Received by KAVACH Review System',
        newStatus: 'More Information Needed',
        timestamp: '2026-10-21T16:00:00.000Z',
        reviewerName: 'Demo Reviewer (Sample)',
        note: 'Requested exact spoofed domain text in evidence notes.',
      },
    ]),
    '2026-10-21T16:00:00.000Z'
  );
}

function generateRandomCode(prefix: string, length: number): string {
  let suffix = '';
  for (let i = 0; i < length; i++) {
    suffix += CASE_ID_ALPHABET[crypto.randomInt(0, CASE_ID_ALPHABET.length)];
  }
  return `${prefix}-${suffix}`;
}

function generateUniqueCaseCode(db: DatabaseSync): string {
  const checkStmt = db.prepare('SELECT 1 FROM cases WHERE case_code = ?');
  const demoCheckStmt = db.prepare('SELECT 1 FROM demo_authority_cases WHERE case_code = ?');
  for (let attempt = 0; attempt < 25; attempt++) {
    const candidate = generateRandomCode('KAV', 8);
    if (!checkStmt.get(candidate) && !demoCheckStmt.get(candidate)) {
      return candidate;
    }
  }
  throw new Error('Could not generate unique KAVACH Case ID.');
}

function generateUniqueUserId(db: DatabaseSync): string {
  const checkStmt = db.prepare('SELECT 1 FROM users WHERE id = ?');
  for (let attempt = 0; attempt < 25; attempt++) {
    const candidate = generateRandomCode('USR', 8);
    if (!checkStmt.get(candidate)) {
      return candidate;
    }
  }
  return `USR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function hashPassword(password: string, saltHex?: string): { hashHex: string; saltHex: string } {
  const actualSalt = saltHex || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, actualSalt, 64);
  return {
    hashHex: derived.toString('hex'),
    saltHex: actualSalt,
  };
}

function verifyPassword(password: string, expectedHashHex: string, saltHex: string): boolean {
  const { hashHex } = hashPassword(password, saltHex);
  const a = Buffer.from(hashHex, 'hex');
  const b = Buffer.from(expectedHashHex, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function hashSessionToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) {
      const k = part.slice(0, idx).trim();
      const v = decodeURIComponent(part.slice(idx + 1).trim());
      out[k] = v;
    }
  }
  return out;
}

function extractRawToken(req: express.Request): string | null {
  const authHeader = req.header('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }
  const cookies = parseCookies(req.headers.cookie);
  if (cookies.kavach_session) {
    return cookies.kavach_session;
  }
  return null;
}

function getAuthenticatedUser(db: DatabaseSync, req: express.Request): AuthenticatedUser | null {
  const rawToken = extractRawToken(req);
  if (!rawToken) return null;

  const tokenHash = hashSessionToken(rawToken);
  const row = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.role, u.created_at, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`
    )
    .get(tokenHash) as
    | {
        id: string;
        name: string;
        email: string;
        role: string;
        created_at: string;
        expires_at: string;
      }
    | undefined;

  if (!row) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role === 'demo_authority' ? 'demo_authority' : 'citizen',
    createdAt: row.created_at,
  };
}

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function hydrateCaseRecord(db: DatabaseSync, row: DbCaseRow) {
  const historyRows = db
    .prepare(
      `SELECT id, previous_status, new_status, note, changed_by, created_at
       FROM case_status_history
       WHERE case_code = ? AND owner_user_id = ?
       ORDER BY created_at ASC`
    )
    .all(row.case_code, row.owner_user_id) as unknown as DbStatusHistoryRow[];

  const statusHistory = historyRows.map((h) => ({
    id: h.id,
    previousStatus: h.previous_status,
    newStatus: h.new_status,
    timestamp: h.created_at,
    note: h.note,
    changedBy: h.changed_by,
  }));

  const officialTracking = safeJsonParse(row.official_tracking_json, {
    submittedExternally: false,
    authorityOrPortal: 'National Cyber Crime Reporting Portal (cybercrime.gov.in)',
    portalUrl: 'https://cybercrime.gov.in/',
    statusCheckUrl: 'https://www.cybercrime.gov.in/Webform/chkackstatus.aspx',
    acknowledgementNumber: '',
    submissionDate: '',
    lastManualStatus: '',
    lastManualCheckDate: '',
    userNotes: '',
    isLiveVerified: false,
  });

  const kavachStatus = VALID_CASE_STATUSES.has(row.kavach_status) ? row.kavach_status : 'Draft';
  const parsedStructuredReport = safeJsonParse<StructuredAiReport | null>(
    row.structured_report_json,
    null
  );
  const parsedCompletedStages = safeJsonParse<number[]>(row.completed_stages_json, []);
  const rawStage = Number(row.workflow_stage || 1);
  const workflowStage: WorkflowStageNumber =
    rawStage >= 1 && rawStage <= 7 ? (rawStage as WorkflowStageNumber) : 1;

  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    caseCode: row.case_code,
    legacyCaseCode: row.legacy_case_code || undefined,
    isDemo: false,
    status: kavachStatus === 'Draft' ? 'draft' : 'ready-for-review',
    kavachStatus,
    statusHistory,
    submissionState: officialTracking.submittedExternally
      ? 'user-confirmed-external'
      : 'kavach-draft',
    urgencyLevel: row.urgency_level || 'standard',
    title: row.title,
    category: row.category,
    platform: row.platform,
    location: row.location,
    peopleInvolved: row.people_involved || '',
    date: row.incident_date,
    time: row.incident_time,
    timezone: row.timezone || 'IST (UTC+05:30)',
    description: row.description,
    additionalNotes: row.additional_notes,
    workflowStage,
    completedStages: parsedCompletedStages.length > 0 ? parsedCompletedStages : [1],
    structuredReport:
      parsedStructuredReport && typeof parsedStructuredReport === 'object' && parsedStructuredReport.caseId
        ? parsedStructuredReport
        : null,
    witnesses: safeJsonParse(row.witnesses_json, []),
    reportingPreferences: safeJsonParse(row.preferences_json, {
      preferredPath: 'undecided',
      selectedAuthorityIds: [],
      selectedSupportOrgIds: [],
      personalNotesOnPreferences: '',
    }),
    evidence: safeJsonParse(row.evidence_json, []),
    aiEvidenceIndexSummary: row.ai_evidence_index || '',
    timeline: safeJsonParse(row.timeline_json, []),
    aiSummary: row.ai_summary || '',
    aiSummarySource: row.ai_summary_source || undefined,
    aiSummaryUpdatedAt: row.ai_summary_updated_at || undefined,
    missingInfoQuestions: safeJsonParse(row.missing_info_json, []),
    internalTracking: {
      currentStatus:
        kavachStatus === 'Submitted Externally'
          ? 'User Confirmed External Submission'
          : kavachStatus === 'Ready for Submission'
            ? 'Ready for External Submission'
            : kavachStatus === 'Closed' || kavachStatus === 'Resolved'
              ? 'KAVACH Record Closed'
              : 'Draft',
      userNotes: row.additional_notes || '',
      history: statusHistory.map((s) => ({
        id: s.id,
        status: s.newStatus,
        timestamp: s.timestamp,
        actor: 'Citizen' as const,
        note: s.note,
      })),
      prototypeQueueSubmitted: false,
    },
    officialTracking,
    privateSupportTracking: safeJsonParse(row.private_support_json, []),
    latestActivity: row.latest_activity || 'Case saved',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isGeminiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key.trim() !== '' && key !== 'MY_GEMINI_API_KEY');
}

function getGeminiClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const db = initDatabase();
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  // =========================================================================
  // SYSTEM & ARCHITECTURE METADATA
  // =========================================================================
  app.get('/api/system/architecture', (_req, res) => {
    res.json({
      databaseEngine: 'Server-side SQLite (node:sqlite WAL mode — kavach.sqlite)',
      passwordSecurity: 'scrypt key derivation with unique 16-byte random salt & timingSafeEqual',
      sessionMechanism: 'SHA-256 hashed server-side session tokens (30-day expiry)',
      externalCloudAuthConfigured: false,
      passwordResetEmailConfigured: Boolean(process.env.SMTP_HOST),
      governmentApiConnected: false,
      geminiServerConfigured: isGeminiConfigured(),
      externalConfigNotes: [
        'User accounts and cases persist permanently in the server SQLite database (kavach.sqlite).',
        'Firebase Cloud Setup was declined; to use managed cloud authentication or automated password-reset emails across multi-region instances, enable Firebase Auth/Firestore or configure SMTP_HOST credentials.',
        'Official government portals (cybercrime.gov.in, 112.gov.in, wcd.gov.in) do not provide public complaint-submission APIs; KAVACH opens official portals in a new tab and keeps official acknowledgement numbers strictly user-provided.',
      ],
    });
  });

  // =========================================================================
  // AUTHENTICATION & USER ACCOUNTS (Requirement #2 & #14)
  // =========================================================================
  app.post('/api/auth/signup', (req, res) => {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    const email = String(body.email || '')
      .trim()
      .toLowerCase();
    const password = String(body.password || '');

    // Block privilege escalation attempts if client tries to pass role != citizen
    if (body.role && body.role !== 'citizen') {
      res.status(403).json({
        error: 'Security violation: Citizen sign-up cannot assign elevated authority privileges.',
      });
      return;
    }

    if (name.length < 2 || name.length > 100) {
      res.status(400).json({ error: 'Please enter your full name (2 to 100 characters).' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 180) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        error: 'Password must be at least 8 characters long for account security.',
      });
      return;
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      res.status(409).json({
        error: 'An account with this email address already exists. Please sign in instead.',
      });
      return;
    }

    const userId = generateUniqueUserId(db);
    const { hashHex, saltHex } = hashPassword(password);
    const nowIso = new Date().toISOString();

    db.prepare(
      `INSERT INTO users (id, name, email, password_hash, password_salt, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'citizen', ?, ?)`
    ).run(userId, name, email, hashHex, saltHex, nowIso, nowIso);

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashSessionToken(rawToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(
      `INSERT INTO sessions (token_hash, user_id, expires_at, created_at)
       VALUES (?, ?, ?, ?)`
    ).run(tokenHash, userId, expiresAt, nowIso);

    res.setHeader(
      'Set-Cookie',
      `kavach_session=${encodeURIComponent(rawToken)}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax`
    );

    res.status(201).json({
      token: rawToken,
      user: {
        id: userId,
        name,
        email,
        role: 'citizen',
        createdAt: nowIso,
      },
    });
  });

  app.post('/api/auth/signin', (req, res) => {
    const body = req.body || {};
    const email = String(body.email || '')
      .trim()
      .toLowerCase();
    const password = String(body.password || '');

    if (!email || !password) {
      res.status(400).json({ error: 'Please enter both your email address and password.' });
      return;
    }

    const row = db
      .prepare(
        `SELECT id, name, email, password_hash, password_salt, role, created_at, updated_at
         FROM users WHERE email = ?`
      )
      .get(email) as DbUserRow | undefined;

    if (!row || !verifyPassword(password, row.password_hash, row.password_salt)) {
      res.status(401).json({
        error: 'Invalid email address or password. Please verify your credentials and try again.',
      });
      return;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashSessionToken(rawToken);
    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(
      `INSERT INTO sessions (token_hash, user_id, expires_at, created_at)
       VALUES (?, ?, ?, ?)`
    ).run(tokenHash, row.id, expiresAt, nowIso);

    res.setHeader(
      'Set-Cookie',
      `kavach_session=${encodeURIComponent(rawToken)}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax`
    );

    res.json({
      token: rawToken,
      user: {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role === 'demo_authority' ? 'demo_authority' : 'citizen',
        createdAt: row.created_at,
      },
    });
  });

  app.post('/api/auth/signout', (req, res) => {
    const rawToken = extractRawToken(req);
    if (rawToken) {
      const tokenHash = hashSessionToken(rawToken);
      db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
    }
    res.setHeader('Set-Cookie', 'kavach_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');
    res.json({ signedOut: true });
  });

  app.get('/api/auth/me', (req, res) => {
    const user = getAuthenticatedUser(db, req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required. Please sign in.' });
      return;
    }
    res.json({
      user,
      passwordResetEmailSupported: Boolean(process.env.SMTP_HOST),
    });
  });

  app.patch('/api/auth/profile', (req, res) => {
    const user = getAuthenticatedUser(db, req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const body = req.body || {};

    // Prevent role escalation via profile update
    if (body.role !== undefined && body.role !== user.role) {
      res.status(403).json({
        error: 'Forbidden: Account role cannot be modified from client requests.',
      });
      return;
    }

    const nextName = body.name !== undefined ? String(body.name).trim() : user.name;
    if (nextName.length < 2 || nextName.length > 100) {
      res.status(400).json({ error: 'Display name must be between 2 and 100 characters.' });
      return;
    }

    const nowIso = new Date().toISOString();

    if (body.newPassword !== undefined && String(body.newPassword).length > 0) {
      const currentPassword = String(body.currentPassword || '');
      const newPassword = String(body.newPassword || '');
      if (newPassword.length < 8) {
        res.status(400).json({ error: 'New password must be at least 8 characters long.' });
        return;
      }

      const fullUser = db
        .prepare('SELECT password_hash, password_salt FROM users WHERE id = ?')
        .get(user.id) as { password_hash: string; password_salt: string } | undefined;

      if (
        !fullUser ||
        !verifyPassword(currentPassword, fullUser.password_hash, fullUser.password_salt)
      ) {
        res.status(401).json({ error: 'Current password is incorrect.' });
        return;
      }

      const { hashHex, saltHex } = hashPassword(newPassword);
      db.prepare(
        `UPDATE users SET name = ?, password_hash = ?, password_salt = ?, updated_at = ? WHERE id = ?`
      ).run(nextName, hashHex, saltHex, nowIso, user.id);
    } else {
      db.prepare('UPDATE users SET name = ?, updated_at = ? WHERE id = ?').run(
        nextName,
        nowIso,
        user.id
      );
    }

    res.json({
      user: {
        ...user,
        name: nextName,
      },
      message: 'Account profile updated.',
    });
  });

  app.post('/api/auth/password-reset-request', (req, res) => {
    const email = String(req.body?.email || '')
      .trim()
      .toLowerCase();
    if (!email) {
      res.status(400).json({ error: 'Please enter your registered email address.' });
      return;
    }
    if (!process.env.SMTP_HOST) {
      res.status(501).json({
        supported: false,
        code: 'EMAIL_PROVIDER_NOT_CONFIGURED',
        error:
          'Automated password-reset email delivery requires configuring an outbound email service (SMTP_HOST / SMTP_USER / SMTP_PASS) or enabling Firebase Authentication. Signed-in users can change their password at any time in Profile and Settings.',
      });
      return;
    }
    res.json({
      supported: true,
      message: 'If an account exists for that email, reset instructions have been queued.',
    });
  });

  // =========================================================================
  // PRIVATE CITIZEN CASES & PERMANENT HISTORY (Requirements #4, #5, #6, #7, #11)
  // =========================================================================
  app.get('/api/cases', (req, res) => {
    const user = getAuthenticatedUser(db, req);
    if (!user) {
      res.status(401).json({ error: 'Please sign in to access your private cases.' });
      return;
    }

    const rows = db
      .prepare('SELECT * FROM cases WHERE owner_user_id = ? ORDER BY updated_at DESC')
      .all(user.id) as unknown as DbCaseRow[];

    const hydrated = rows.map((row) => hydrateCaseRecord(db, row));
    res.json({ cases: hydrated });
  });

  app.get('/api/cases/:caseCode', (req, res) => {
    const user = getAuthenticatedUser(db, req);
    if (!user) {
      res.status(401).json({ error: 'Please sign in to view case details.' });
      return;
    }

    const param = String(req.params.caseCode || '').trim();
    const row = db
      .prepare('SELECT * FROM cases WHERE case_code = ? OR id = ?')
      .get(param, param) as DbCaseRow | undefined;

    if (!row) {
      res.status(404).json({ error: 'Case not found.' });
      return;
    }

    if (row.owner_user_id !== user.id) {
      res.status(403).json({
        error:
          'Access denied: You are not authorized to access another user’s private case or evidence.',
      });
      return;
    }

    res.json({ caseRecord: hydrateCaseRecord(db, row) });
  });

  app.post('/api/cases', (req, res) => {
    const user = getAuthenticatedUser(db, req);
    if (!user) {
      res.status(401).json({ error: 'Please sign in before creating a case.' });
      return;
    }

    const body = req.body || {};
    const title = String(body.title || '').trim();
    const category = String(body.category || 'other').trim();
    const incidentDate = String(body.date || '').trim();
    const incidentTime = String(body.time || '').trim();
    const timezone = String(body.timezone || 'IST (UTC+05:30)').trim();
    const platform = String(body.platform || '').trim();
    const location = String(body.location || '').trim();
    const peopleInvolved = String(body.peopleInvolved || '').trim();
    const urgencyLevel = String(body.urgencyLevel || 'standard').trim();
    const description = String(body.description || '').trim();
    const additionalNotes = String(body.additionalNotes || '').trim();

    if (!title || title.length < 4) {
      res.status(400).json({
        error: 'Incident title is required (minimum 4 characters).',
      });
      return;
    }
    if (!incidentDate) {
      res.status(400).json({
        error: 'Incident date is required.',
      });
      return;
    }
    if (!description || description.length < 15) {
      res.status(400).json({
        error: 'Please provide a clear incident description (minimum 15 characters).',
      });
      return;
    }

    const requestedStatus = String(body.kavachStatus || 'Draft').trim();
    const initialStatus = VALID_CASE_STATUSES.has(requestedStatus) ? requestedStatus : 'Draft';

    // Preserve legacy case code only if explicitly importing an older local record
    let legacyCaseCode: string | null = null;
    let caseCode: string;
    const incomingLegacy = String(body.legacyCaseCode || '').trim();
    if (incomingLegacy && /^KAV-[A-Z0-9]{8}$/.test(incomingLegacy)) {
      const taken = db.prepare('SELECT 1 FROM cases WHERE case_code = ?').get(incomingLegacy);
      caseCode = taken ? generateUniqueCaseCode(db) : incomingLegacy;
    } else {
      caseCode = generateUniqueCaseCode(db);
      if (incomingLegacy) {
        legacyCaseCode = incomingLegacy.slice(0, 64);
      }
    }

    const internalId = `case-${crypto.randomUUID()}`;
    const nowIso = new Date().toISOString();

    const evidence = Array.isArray(body.evidence) ? body.evidence : [];
    const timeline = Array.isArray(body.timeline) ? body.timeline : [];
    const witnesses = Array.isArray(body.witnesses) ? body.witnesses : [];
    const missingInfo = Array.isArray(body.missingInfoQuestions) ? body.missingInfoQuestions : [];
    const reqStage = Number(body.workflowStage || 1);
    const workflowStage = reqStage >= 1 && reqStage <= 7 ? reqStage : 1;
    const completedStages = Array.isArray(body.completedStages) ? body.completedStages : [1];
    const structuredReportJson =
      body.structuredReport && typeof body.structuredReport === 'object'
        ? JSON.stringify({ ...body.structuredReport, caseId: caseCode })
        : '';

    const officialTracking = body.officialTracking || {
      submittedExternally: false,
      authorityOrPortal: 'National Cyber Crime Reporting Portal (cybercrime.gov.in)',
      portalUrl: 'https://cybercrime.gov.in/',
      statusCheckUrl: 'https://www.cybercrime.gov.in/Webform/chkackstatus.aspx',
      acknowledgementNumber: '',
      submissionDate: '',
      lastManualStatus: '',
      lastManualCheckDate: '',
      userNotes: '',
      isLiveVerified: false,
    };
    const privateSupport = Array.isArray(body.privateSupportTracking)
      ? body.privateSupportTracking
      : [];
    const preferences = body.reportingPreferences || {
      preferredPath: 'undecided',
      selectedAuthorityIds: [],
      selectedSupportOrgIds: [],
      personalNotesOnPreferences: '',
    };

    const latestActivity = legacyCaseCode
      ? `Imported existing draft (${legacyCaseCode}) into permanent KAVACH record`
      : String(body.activityNote || `Created case with status "${initialStatus}"`).slice(0, 240);

    db.prepare(
      `INSERT INTO cases (
        id, case_code, legacy_case_code, owner_user_id, title, category, urgency_level,
        platform, location, people_involved, incident_date, incident_time, timezone, description, additional_notes,
        workflow_stage, completed_stages_json, structured_report_json,
        kavach_status, submission_state, evidence_json, timeline_json, witnesses_json, preferences_json,
        ai_summary, ai_summary_source, ai_summary_updated_at, ai_evidence_index,
        missing_info_json, official_tracking_json, private_support_json, latest_activity,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      internalId,
      caseCode,
      legacyCaseCode,
      user.id,
      title.slice(0, 240),
      category,
      urgencyLevel,
      platform.slice(0, 200),
      location.slice(0, 240),
      peopleInvolved.slice(0, 1000),
      incidentDate,
      incidentTime,
      timezone.slice(0, 80),
      description.slice(0, 12000),
      additionalNotes.slice(0, 6000),
      workflowStage,
      JSON.stringify(completedStages),
      structuredReportJson,
      initialStatus,
      officialTracking.submittedExternally ? 'user-confirmed-external' : 'kavach-draft',
      JSON.stringify(evidence),
      JSON.stringify(timeline),
      JSON.stringify(witnesses),
      JSON.stringify(preferences),
      String(body.aiSummary || ''),
      body.aiSummarySource ? String(body.aiSummarySource) : null,
      body.aiSummaryUpdatedAt ? String(body.aiSummaryUpdatedAt) : null,
      String(body.aiEvidenceIndexSummary || ''),
      JSON.stringify(missingInfo),
      JSON.stringify({ ...officialTracking, isLiveVerified: false }),
      JSON.stringify(privateSupport),
      latestActivity,
      nowIso,
      nowIso
    );

    const historyId = `sh-${crypto.randomUUID()}`;
    db.prepare(
      `INSERT INTO case_status_history (
        id, case_code, owner_user_id, previous_status, new_status, note, changed_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      historyId,
      caseCode,
      user.id,
      null,
      initialStatus,
      legacyCaseCode
        ? `Imported saved case record (previous reference: ${legacyCaseCode}).`
        : 'Initial case record created in KAVACH.',
      user.name,
      nowIso
    );

    const createdRow = db
      .prepare('SELECT * FROM cases WHERE case_code = ?')
      .get(caseCode) as unknown as DbCaseRow;

    res.status(201).json({ caseRecord: hydrateCaseRecord(db, createdRow) });
  });

  app.patch('/api/cases/:caseCode', (req, res) => {
    const user = getAuthenticatedUser(db, req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const param = String(req.params.caseCode || '').trim();
    const existing = db
      .prepare('SELECT * FROM cases WHERE case_code = ? OR id = ?')
      .get(param, param) as DbCaseRow | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Case not found.' });
      return;
    }

    if (existing.owner_user_id !== user.id) {
      res.status(403).json({
        error: 'Access denied: You cannot modify another user’s private case.',
      });
      return;
    }

    const body = req.body || {};
    const nowIso = new Date().toISOString();

    const nextTitle =
      body.title !== undefined ? String(body.title).trim().slice(0, 240) : existing.title;
    if (!nextTitle || nextTitle.length < 4) {
      res.status(400).json({ error: 'Incident title must be at least 4 characters.' });
      return;
    }

    const nextCategory =
      body.category !== undefined ? String(body.category).trim() : existing.category;
    const nextUrgency =
      body.urgencyLevel !== undefined ? String(body.urgencyLevel).trim() : existing.urgency_level;
    const nextPlatform =
      body.platform !== undefined ? String(body.platform).trim().slice(0, 200) : existing.platform;
    const nextLocation =
      body.location !== undefined ? String(body.location).trim().slice(0, 240) : existing.location;
    const nextPeopleInvolved =
      body.peopleInvolved !== undefined
        ? String(body.peopleInvolved).trim().slice(0, 1000)
        : existing.people_involved || '';
    const nextDate =
      body.date !== undefined ? String(body.date).trim() : existing.incident_date;
    const nextTime =
      body.time !== undefined ? String(body.time).trim() : existing.incident_time;
    const nextTimezone =
      body.timezone !== undefined ? String(body.timezone).trim() : existing.timezone;
    const nextDescription =
      body.description !== undefined
        ? String(body.description).trim().slice(0, 12000)
        : existing.description;
    if (!nextDate || !nextDescription || nextDescription.length < 15) {
      res.status(400).json({
        error: 'Incident date and a description of at least 15 characters are required.',
      });
      return;
    }
    const nextNotes =
      body.additionalNotes !== undefined
        ? String(body.additionalNotes).trim().slice(0, 6000)
        : existing.additional_notes;

    const nextWorkflowStage =
      body.workflowStage !== undefined &&
      Number(body.workflowStage) >= 1 &&
      Number(body.workflowStage) <= 7
        ? Number(body.workflowStage)
        : Number(existing.workflow_stage || 1);

    const nextCompletedStagesJson =
      body.completedStages !== undefined && Array.isArray(body.completedStages)
        ? JSON.stringify(body.completedStages)
        : existing.completed_stages_json || '[1]';

    const nextStructuredReportJson =
      body.structuredReport !== undefined
        ? body.structuredReport
          ? JSON.stringify({ ...body.structuredReport, caseId: existing.case_code })
          : ''
        : existing.structured_report_json || '';

    const currentStatus = existing.kavach_status;
    let nextStatus = currentStatus;
    if (body.kavachStatus !== undefined && VALID_CASE_STATUSES.has(String(body.kavachStatus))) {
      nextStatus = String(body.kavachStatus);
    }

    const nextEvidenceJson =
      body.evidence !== undefined ? JSON.stringify(body.evidence) : existing.evidence_json;
    const nextTimelineJson =
      body.timeline !== undefined ? JSON.stringify(body.timeline) : existing.timeline_json;
    const nextWitnessesJson =
      body.witnesses !== undefined ? JSON.stringify(body.witnesses) : existing.witnesses_json;
    const nextPrefsJson =
      body.reportingPreferences !== undefined
        ? JSON.stringify(body.reportingPreferences)
        : existing.preferences_json;
    const nextAiSummary =
      body.aiSummary !== undefined ? String(body.aiSummary) : existing.ai_summary;
    const nextAiSummarySource =
      body.aiSummarySource !== undefined
        ? String(body.aiSummarySource)
        : existing.ai_summary_source;
    const nextAiSummaryUpdatedAt =
      body.aiSummaryUpdatedAt !== undefined
        ? String(body.aiSummaryUpdatedAt)
        : existing.ai_summary_updated_at;
    const nextAiEvidenceIndex =
      body.aiEvidenceIndexSummary !== undefined
        ? String(body.aiEvidenceIndexSummary)
        : existing.ai_evidence_index;
    const nextMissingJson =
      body.missingInfoQuestions !== undefined
        ? JSON.stringify(body.missingInfoQuestions)
        : existing.missing_info_json;

    const currentOfficial = safeJsonParse(existing.official_tracking_json, {
      submittedExternally: false,
      authorityOrPortal: 'National Cyber Crime Reporting Portal (cybercrime.gov.in)',
      portalUrl: 'https://cybercrime.gov.in/',
      statusCheckUrl: 'https://www.cybercrime.gov.in/Webform/chkackstatus.aspx',
      acknowledgementNumber: '',
      submissionDate: '',
      lastManualStatus: '',
      lastManualCheckDate: '',
      userNotes: '',
      isLiveVerified: false,
    });

    const mergedOfficial =
      body.officialTracking !== undefined
        ? {
            ...currentOfficial,
            ...body.officialTracking,
            isLiveVerified: false, // Strictly user-provided unless a real government API exists
          }
        : currentOfficial;

    const nextPrivateSupportJson =
      body.privateSupportTracking !== undefined
        ? JSON.stringify(body.privateSupportTracking)
        : existing.private_support_json;

    const nextSubmissionState = mergedOfficial.submittedExternally
      ? 'user-confirmed-external'
      : 'kavach-draft';

    const activitySummary = String(
      body.activityNote ||
        (nextStatus !== currentStatus
          ? `Status updated from "${currentStatus}" to "${nextStatus}"`
          : 'Updated case documentation')
    ).slice(0, 240);

    // Note: case_code and owner_user_id are NEVER modified on update!
    db.prepare(
      `UPDATE cases SET
        title = ?, category = ?, urgency_level = ?, platform = ?, location = ?, people_involved = ?,
        incident_date = ?, incident_time = ?, timezone = ?, description = ?, additional_notes = ?,
        workflow_stage = ?, completed_stages_json = ?, structured_report_json = ?,
        kavach_status = ?, submission_state = ?, evidence_json = ?, timeline_json = ?,
        witnesses_json = ?, preferences_json = ?, ai_summary = ?, ai_summary_source = ?,
        ai_summary_updated_at = ?, ai_evidence_index = ?, missing_info_json = ?,
        official_tracking_json = ?, private_support_json = ?, latest_activity = ?, updated_at = ?
       WHERE case_code = ? AND owner_user_id = ?`
    ).run(
      nextTitle,
      nextCategory,
      nextUrgency,
      nextPlatform,
      nextLocation,
      nextPeopleInvolved,
      nextDate,
      nextTime,
      nextTimezone,
      nextDescription,
      nextNotes,
      nextWorkflowStage,
      nextCompletedStagesJson,
      nextStructuredReportJson,
      nextStatus,
      nextSubmissionState,
      nextEvidenceJson,
      nextTimelineJson,
      nextWitnessesJson,
      nextPrefsJson,
      nextAiSummary,
      nextAiSummarySource,
      nextAiSummaryUpdatedAt,
      nextAiEvidenceIndex,
      nextMissingJson,
      JSON.stringify(mergedOfficial),
      nextPrivateSupportJson,
      activitySummary,
      nowIso,
      existing.case_code,
      user.id
    );

    if (nextStatus !== currentStatus || body.recordStatusHistory === true) {
      const statusNote = String(
        body.statusNote ||
          body.activityNote ||
          `Updated internal KAVACH status from "${currentStatus}" to "${nextStatus}".`
      ).slice(0, 400);

      db.prepare(
        `INSERT INTO case_status_history (
          id, case_code, owner_user_id, previous_status, new_status, note, changed_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        `sh-${crypto.randomUUID()}`,
        existing.case_code,
        user.id,
        currentStatus,
        nextStatus,
        statusNote,
        user.name,
        nowIso
      );
    }

    const updatedRow = db
      .prepare('SELECT * FROM cases WHERE case_code = ?')
      .get(existing.case_code) as unknown as DbCaseRow;

    res.json({ caseRecord: hydrateCaseRecord(db, updatedRow) });
  });

  app.post('/api/cases/:caseCode/status', (req, res) => {
    const user = getAuthenticatedUser(db, req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const param = String(req.params.caseCode || '').trim();
    const existing = db
      .prepare('SELECT * FROM cases WHERE case_code = ? OR id = ?')
      .get(param, param) as DbCaseRow | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Case not found.' });
      return;
    }
    if (existing.owner_user_id !== user.id) {
      res.status(403).json({
        error: 'Access denied: You cannot update the status of another user’s private case.',
      });
      return;
    }

    const newStatus = String(req.body?.newStatus || '').trim();
    const note = String(req.body?.note || '').trim();

    if (!VALID_CASE_STATUSES.has(newStatus)) {
      res.status(400).json({ error: 'Invalid KAVACH case status.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const previousStatus = existing.kavach_status;
    const historyNote =
      note || `Changed internal KAVACH status from "${previousStatus}" to "${newStatus}".`;

    db.prepare(
      `UPDATE cases SET kavach_status = ?, latest_activity = ?, updated_at = ?
       WHERE case_code = ? AND owner_user_id = ?`
    ).run(
      newStatus,
      `Status set to "${newStatus}"`,
      nowIso,
      existing.case_code,
      user.id
    );

    db.prepare(
      `INSERT INTO case_status_history (
        id, case_code, owner_user_id, previous_status, new_status, note, changed_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      `sh-${crypto.randomUUID()}`,
      existing.case_code,
      user.id,
      previousStatus,
      newStatus,
      historyNote.slice(0, 400),
      user.name,
      nowIso
    );

    const updatedRow = db
      .prepare('SELECT * FROM cases WHERE case_code = ?')
      .get(existing.case_code) as unknown as DbCaseRow;

    res.json({ caseRecord: hydrateCaseRecord(db, updatedRow) });
  });

  app.delete('/api/cases/:caseCode', (req, res) => {
    const user = getAuthenticatedUser(db, req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const param = String(req.params.caseCode || '').trim();
    const existing = db
      .prepare('SELECT case_code, owner_user_id FROM cases WHERE case_code = ? OR id = ?')
      .get(param, param) as { case_code: string; owner_user_id: string } | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Case not found.' });
      return;
    }
    if (existing.owner_user_id !== user.id) {
      res.status(403).json({
        error: 'Access denied: You cannot delete another user’s private case.',
      });
      return;
    }

    db.prepare('DELETE FROM case_status_history WHERE case_code = ? AND owner_user_id = ?').run(
      existing.case_code,
      user.id
    );
    db.prepare('DELETE FROM cases WHERE case_code = ? AND owner_user_id = ?').run(
      existing.case_code,
      user.id
    );

    res.json({ deleted: true, caseCode: existing.case_code });
  });

  app.get('/api/case-history', (req, res) => {
    const user = getAuthenticatedUser(db, req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const rows = db
      .prepare(
        `SELECT h.id, h.case_code, h.previous_status, h.new_status, h.note, h.changed_by, h.created_at,
                c.title as case_title, c.category as case_category
         FROM case_status_history h
         JOIN cases c ON c.case_code = h.case_code AND c.owner_user_id = h.owner_user_id
         WHERE h.owner_user_id = ?
         ORDER BY h.created_at DESC`
      )
      .all(user.id) as unknown as {
      id: string;
      case_code: string;
      previous_status: string | null;
      new_status: string;
      note: string;
      changed_by: string;
      created_at: string;
      case_title: string;
      case_category: string;
    }[];

    res.json({
      history: rows.map((r) => ({
        id: r.id,
        caseCode: r.case_code,
        caseTitle: r.case_title,
        caseCategory: r.case_category,
        previousStatus: r.previous_status,
        newStatus: r.new_status,
        note: r.note,
        changedBy: r.changed_by,
        timestamp: r.created_at,
      })),
    });
  });

  // =========================================================================
  // DEMO AUTHORITY DASHBOARD & RBAC ENFORCEMENT (Requirement #12)
  // =========================================================================
  // Strict RBAC endpoint proving citizen accounts cannot access real citizen records as an authority
  app.get('/api/authority/all-citizen-cases', (req, res) => {
    const user = getAuthenticatedUser(db, req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    res.status(403).json({
      error:
        'RBAC Policy Enforced: Citizen accounts cannot access authority privileges or view other citizens’ private records.',
    });
  });

  // Isolated Demo Authority Dashboard serving ONLY sample demo cases (zero real citizen records exposed)
  app.get('/api/demo-authority/cases', (req, res) => {
    const demoHeader = req.header('x-kavach-demo-authority-mode');
    if (demoHeader !== 'enabled') {
      res.status(403).json({
        error:
          'Demo Authority Sandbox header required. Real citizen cases are strictly isolated from this demo queue.',
      });
      return;
    }

    const rows = db
      .prepare('SELECT * FROM demo_authority_cases ORDER BY updated_at DESC')
      .all() as unknown as {
      case_code: string;
      assigned_unit_label: string;
      title: string;
      category: string;
      incident_date: string;
      incident_time: string;
      location: string;
      platform: string;
      description: string;
      summary: string;
      evidence_json: string;
      timeline_json: string;
      case_notes: string;
      reviewer_status: string;
      review_history_json: string;
      updated_at: string;
    }[];

    res.json({
      banner:
        'Demo Authority Dashboard — Sample Assigned Data Only (Not Connected to Police or Government Systems)',
      cases: rows.map((r) => ({
        caseCode: r.case_code,
        isDemoSample: true,
        assignedUnitLabel: r.assigned_unit_label,
        title: r.title,
        category: r.category,
        incidentDate: r.incident_date,
        incidentTime: r.incident_time,
        location: r.location,
        platform: r.platform,
        description: r.description,
        summary: r.summary,
        evidence: safeJsonParse(r.evidence_json, []),
        timeline: safeJsonParse(r.timeline_json, []),
        caseNotes: r.case_notes,
        reviewerStatus: r.reviewer_status,
        reviewHistory: safeJsonParse(r.review_history_json, []),
        updatedAt: r.updated_at,
      })),
    });
  });

  app.patch('/api/demo-authority/cases/:caseCode', (req, res) => {
    const demoHeader = req.header('x-kavach-demo-authority-mode');
    if (demoHeader !== 'enabled') {
      res.status(403).json({ error: 'Demo Authority Sandbox activation required.' });
      return;
    }

    const caseCode = String(req.params.caseCode || '').trim();
    const row = db
      .prepare('SELECT * FROM demo_authority_cases WHERE case_code = ?')
      .get(caseCode) as
      | {
          case_code: string;
          assigned_unit_label: string;
          title: string;
          category: string;
          incident_date: string;
          incident_time: string;
          location: string;
          platform: string;
          description: string;
          summary: string;
          evidence_json: string;
          timeline_json: string;
          case_notes: string;
          reviewer_status: string;
          review_history_json: string;
          updated_at: string;
        }
      | undefined;

    if (!row) {
      res.status(404).json({
        error: 'Sample case not found in Demo Authority Sandbox.',
      });
      return;
    }

    const nextStatus = String(req.body?.reviewerStatus || row.reviewer_status).trim();
    if (!VALID_DEMO_REVIEWER_STATUSES.has(nextStatus)) {
      res.status(400).json({ error: 'Invalid demo review status.' });
      return;
    }

    const nextNotes =
      req.body?.caseNotes !== undefined ? String(req.body.caseNotes).trim() : row.case_notes;
    const auditNote = String(
      req.body?.historyNote || `Demo reviewer updated status to "${nextStatus}".`
    ).trim();

    const nowIso = new Date().toISOString();
    const existingHistory = safeJsonParse<
      {
        id: string;
        previousStatus: string | null;
        newStatus: string;
        timestamp: string;
        reviewerName: string;
        note: string;
      }[]
    >(row.review_history_json, []);

    const nextHistory = [
      ...existingHistory,
      {
        id: `drev-${Date.now()}`,
        previousStatus: row.reviewer_status,
        newStatus: nextStatus,
        timestamp: nowIso,
        reviewerName: 'Demo Reviewer (Sandbox)',
        note: auditNote.slice(0, 300),
      },
    ];

    db.prepare(
      `UPDATE demo_authority_cases
       SET reviewer_status = ?, case_notes = ?, review_history_json = ?, updated_at = ?
       WHERE case_code = ?`
    ).run(nextStatus, nextNotes.slice(0, 3000), JSON.stringify(nextHistory), nowIso, caseCode);

    res.json({
      caseRecord: {
        caseCode: row.case_code,
        isDemoSample: true,
        assignedUnitLabel: row.assigned_unit_label,
        title: row.title,
        category: row.category,
        incidentDate: row.incident_date,
        incidentTime: row.incident_time,
        location: row.location,
        platform: row.platform,
        description: row.description,
        summary: row.summary,
        evidence: safeJsonParse(row.evidence_json, []),
        timeline: safeJsonParse(row.timeline_json, []),
        caseNotes: nextNotes.slice(0, 3000),
        reviewerStatus: nextStatus,
        reviewHistory: nextHistory,
        updatedAt: nowIso,
      },
    });
  });

  // =========================================================================
  // SERVER-SIDE GEMINI AI ASSISTANCE (Requirement #8)
  // =========================================================================
  app.get('/api/ai/status', (_req, res) => {
    res.json({
      configured: isGeminiConfigured(),
      model: 'gemini-3.8-flash',
    });
  });

  app.post('/api/ai/analyze-incident', async (req, res) => {
    try {
      if (!isGeminiConfigured()) {
        res.status(503).json({
          error:
            'Server-side Gemini API key is not configured in this environment. You can run the Local Rule-Based Organizer or edit the summary manually.',
          code: 'API_KEY_NOT_CONFIGURED',
        });
        return;
      }

      const body = (req.body || {}) as AnalyzeIncidentBody;
      const title = (body.title || '').trim();
      const description = (body.description || '').trim();

      if (!title && !description) {
        res.status(400).json({
          error: 'Please provide an incident title and description before requesting AI analysis.',
        });
        return;
      }

      const ai = getGeminiClient();
      const confirmedTimeline = (body.timeline || []).filter((t) => t.confirmed);
      const evidenceList = body.evidence || [];

      const structuredPrompt = `Analyze the following user-supplied safety incident record strictly according to your instructions.

INCIDENT RECORD SUPPLIED BY USER:
- Title: ${title || 'Not specified'}
- Category: ${body.category || 'Not specified'}
- Platform / Service: ${body.platform || 'Not specified'}
- Location (if provided): ${body.location || 'Not provided'}
- Reported Date: ${body.date || 'Not specified'}
- Reported Time: ${body.time || 'Not specified'}
- User Description: ${description || 'Not specified'}
- Additional Notes: ${body.additionalNotes || 'None supplied'}

CONFIRMED TIMELINE EVENTS (${confirmedTimeline.length}):
${
  confirmedTimeline.length > 0
    ? confirmedTimeline
        .map(
          (e, idx) =>
            `${idx + 1}. [${e.date || 'No date'} ${e.time || 'No time'}] ${e.title}: ${e.description}`
        )
        .join('\n')
    : 'None recorded yet.'
}

EVIDENCE ITEMS LOGGED (${evidenceList.length}):
${
  evidenceList.length > 0
    ? evidenceList
        .map(
          (ev, idx) =>
            `${idx + 1}. File/Ref: "${ev.fileName}" (${ev.fileType}, ${ev.storageIndicator || ev.entryMethod}) | Captured: ${ev.capturedAt || 'Unspecified'} | URL/Source: ${ev.sourceUrl || 'Unspecified'} | User Note: ${ev.description}`
        )
        .join('\n')
    : 'None logged yet.'
}`;

      const systemInstruction = `You are the neutral documentation assistant for KAVACH, a safety incident documentation platform.
Follow these strict rules without exception:
1. Summarize ONLY facts explicitly provided by the user in neutral, objective, non-judgmental language (e.g., "The user reports that...", "According to the recorded account...").
2. NEVER invent, assume, extrapolate, or fabricate facts, usernames, witnesses, dates, times, motives, evidence items, or outcomes.
3. NEVER make legal conclusions, determine guilt, or claim that any evidence is authentic, verified, or legally valid.
4. Provide a concise, neutral Evidence Index summary organizing the items the user logged (explicitly noting that authenticity is unverified).
5. Identify missing or unclear factual details by formulating 3 to 5 clear questions (for example: missing URLs/permalinks, time zones, account handles, whether screenshots show full headers, or prior platform report IDs).
6. Suggest 0 to 3 candidate timeline events ONLY if the user's description or evidence notes explicitly mention occurrences not yet in CONFIRMED TIMELINE EVENTS. Never guess dates or times.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: structuredPrompt,
        config: {
          systemInstruction,
          temperature: 0.2,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          abortSignal: AbortSignal.timeout(45000),
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              neutralSummary: {
                type: Type.STRING,
                description:
                  'Neutral, factual 1-to-2 paragraph summary strictly reflecting only user-supplied details.',
              },
              evidenceIndexSummary: {
                type: Type.STRING,
                description:
                  'Neutral 2-to-4 sentence overview organizing the user-logged evidence inventory without claiming verification.',
              },
              missingInfoQuestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    reason: { type: Type.STRING },
                    category: { type: Type.STRING },
                  },
                  required: ['question', 'reason', 'category'],
                },
              },
              suggestedTimelineEvents: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    date: { type: Type.STRING },
                    time: { type: Type.STRING },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    rationale: { type: Type.STRING },
                  },
                  required: ['date', 'time', 'title', 'description', 'rationale'],
                },
              },
            },
            required: [
              'neutralSummary',
              'evidenceIndexSummary',
              'missingInfoQuestions',
              'suggestedTimelineEvents',
            ],
          },
        },
      });

      const rawText = response.text;
      if (!rawText) {
        throw new Error('Received an empty response from the AI model.');
      }

      const parsed = JSON.parse(rawText);
      res.json({
        source: 'gemini-server',
        model: 'gemini-3.8-flash',
        generatedAt: new Date().toISOString(),
        ...parsed,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred while generating the AI review.';
      console.error('Gemini API error:', message);
      res.status(500).json({ error: message });
    }
  });

  // =========================================================================
  // GUIDED WORKFLOW: 9-SECTION AI REPORT + MISSING-EVIDENCE & DETAIL CHECK
  // =========================================================================
  app.post('/api/ai/generate-report', async (req, res) => {
    const user = getAuthenticatedUser(db, req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const body = req.body || {};
    const caseCode = String(body.caseCode || 'KAV-PENDING0').trim();
    const title = String(body.title || '').trim();
    const description = String(body.description || '').trim();

    if (!title && !description) {
      res.status(400).json({
        error: 'Please enter an incident title and description before generating the AI report.',
      });
      return;
    }

    const incidentSnapshot: IncidentRecord = {
      id: String(body.id || 'temp'),
      caseCode,
      isDemo: false,
      status: 'draft',
      kavachStatus: 'Draft',
      statusHistory: [],
      submissionState: 'kavach-draft',
      urgencyLevel: body.urgencyLevel || 'standard',
      title,
      category: (body.category || 'other') as IncidentCategory,
      platform: String(body.platform || '').trim(),
      location: String(body.location || '').trim(),
      peopleInvolved: String(body.peopleInvolved || '').trim(),
      date: String(body.date || '').trim(),
      time: String(body.time || '').trim(),
      timezone: String(body.timezone || 'IST (UTC+05:30)').trim(),
      description,
      additionalNotes: String(body.additionalNotes || '').trim(),
      witnesses: [],
      reportingPreferences: {
        preferredPath: 'undecided',
        selectedAuthorityIds: [],
        selectedSupportOrgIds: [],
        personalNotesOnPreferences: '',
      },
      evidence: Array.isArray(body.evidence) ? body.evidence : [],
      timeline: Array.isArray(body.timeline) ? body.timeline : [],
      aiSummary: '',
      missingInfoQuestions: Array.isArray(body.missingInfoQuestions)
        ? body.missingInfoQuestions
        : [],
      internalTracking: {
        currentStatus: 'Draft',
        userNotes: '',
        history: [],
        prototypeQueueSubmitted: false,
      },
      officialTracking: {
        submittedExternally: false,
        authorityOrPortal: 'National Cyber Crime Reporting Portal (cybercrime.gov.in)',
        portalUrl: 'https://cybercrime.gov.in/',
        statusCheckUrl: 'https://www.cybercrime.gov.in/Webform/chkackstatus.aspx',
        acknowledgementNumber: '',
        submissionDate: '',
        lastManualStatus: '',
        lastManualCheckDate: '',
        userNotes: '',
        isLiveVerified: false,
      },
      privateSupportTracking: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Baseline deterministic review (preserves user-marked checklist resolutions & detects newly supplied fields)
    const deterministic = buildClientStructuredReportAndReview(incidentSnapshot);

    if (!isGeminiConfigured()) {
      res.json({
        source: 'local-organizer',
        geminiConfigured: false,
        ...deterministic,
      });
      return;
    }

    try {
      const ai = getGeminiClient();
      const confirmedTimeline = incidentSnapshot.timeline.filter((t) => t.confirmed);
      const alreadyResolvedQuestions = deterministic.missingInfoQuestions.filter(
        (q) =>
          q.resolutionState === 'available' ||
          q.resolutionState === 'not-available' ||
          q.resolutionState === 'not-applicable'
      );

      const prompt = `Generate a structured, neutral KAVACH Incident Report and Missing-Details & Evidence Review strictly from the user-supplied facts below.

PERMANENT KAVACH CASE ID: ${caseCode}
CATEGORY: ${incidentSnapshot.category} | URGENCY: ${incidentSnapshot.urgencyLevel}
TITLE: ${incidentSnapshot.title}
DATE & APPROXIMATE TIME: ${incidentSnapshot.date || 'Unspecified'} ${incidentSnapshot.time || '(Time not specified)'} [${incidentSnapshot.timezone}]
PLATFORM / CHANNEL: ${incidentSnapshot.platform || 'Not specified'}
LOCATION: ${incidentSnapshot.location || 'Not specified'}
PEOPLE OR ORGANIZATIONS INVOLVED: ${incidentSnapshot.peopleInvolved || 'Not specified'}
USER DESCRIPTION:
${incidentSnapshot.description}

ADDITIONAL NOTES:
${incidentSnapshot.additionalNotes || 'None provided'}

CONFIRMED TIMELINE EVENTS (${confirmedTimeline.length}):
${
  confirmedTimeline.length > 0
    ? confirmedTimeline
        .map(
          (ev, idx) =>
            `${idx + 1}. [${ev.date || 'Date Unknown'} ${ev.time || 'Time Unknown'}] ${ev.title}: ${ev.description}`
        )
        .join('\n')
    : 'None confirmed yet.'
}

EVIDENCE INVENTORY (${incidentSnapshot.evidence.length} items):
${
  incidentSnapshot.evidence.length > 0
    ? incidentSnapshot.evidence
        .map(
          (ev, idx) =>
            `EV-${String(idx + 1).padStart(2, '0')}: "${ev.fileName}" (${ev.recordKind || ev.fileType}) | Captured: ${ev.capturedAt || 'Unknown'} | Ref/URL: ${ev.fileReference || ev.sourceUrl || 'N/A'} | Description: ${ev.description}`
        )
        .join('\n')
    : 'No evidence uploaded or added yet.'
}

ALREADY RESOLVED OR MARKED CHECKLIST ITEMS (DO NOT ASK FOR THESE AGAIN):
${
  alreadyResolvedQuestions.length > 0
    ? alreadyResolvedQuestions
        .map(
          (q) =>
            `- [${formatResolutionLabel(q.resolutionState, q.status)}] ${q.question}${q.userAnswer ? ` (${q.userAnswer})` : ''}`
        )
        .join('\n')
    : 'None yet.'
}`;

      const systemInstruction = `You are KAVACH's neutral incident documentation and missing-evidence review assistant.
STRICT RULES:
1. Base every statement ONLY on user-provided facts and evidence descriptions above.
2. Use neutral, objective, factual language ("According to the user...", "The user recorded...").
3. NEVER invent facts, dates, usernames, witnesses, motives, or legal conclusions.
4. NEVER claim KAVACH or AI verified evidence authenticity, and NEVER claim any document is legally mandatory.
5. If information is sparse, explicitly state what remains unknown instead of guessing.
6. Do NOT re-ask questions already listed under ALREADY RESOLVED OR MARKED CHECKLIST ITEMS or facts already clearly supplied above.
7. Suggest 0 to 3 candidate timeline events ONLY if mentioned in the user description or evidence notes and not already in CONFIRMED TIMELINE EVENTS.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.15,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          abortSignal: AbortSignal.timeout(45000),
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              incidentOverview: { type: Type.STRING },
              importantUserFacts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              unknownOrUnconfirmedDetails: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              suggestedNextSteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              additionalMissingChecks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    reason: { type: Type.STRING },
                    category: { type: Type.STRING },
                    jumpTarget: {
                      type: Type.STRING,
                      description: 'One of: add-details, upload-evidence, edit-timeline',
                    },
                    itemKind: {
                      type: Type.STRING,
                      description:
                        'One of: missing-detail, unclear-timeline, optional-evidence, ambiguity-check, fact-verification',
                    },
                  },
                  required: ['question', 'reason', 'category', 'jumpTarget', 'itemKind'],
                },
              },
              suggestedTimelineEvents: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    date: { type: Type.STRING },
                    time: { type: Type.STRING },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    rationale: { type: Type.STRING },
                  },
                  required: ['date', 'time', 'title', 'description', 'rationale'],
                },
              },
            },
            required: [
              'incidentOverview',
              'importantUserFacts',
              'unknownOrUnconfirmedDetails',
              'suggestedNextSteps',
              'additionalMissingChecks',
              'suggestedTimelineEvents',
            ],
          },
        },
      });

      const rawText = response.text;
      if (!rawText) {
        throw new Error('Empty AI response.');
      }

      const aiParsed = JSON.parse(rawText) as {
        incidentOverview: string;
        importantUserFacts: string[];
        unknownOrUnconfirmedDetails: string[];
        suggestedNextSteps: string[];
        additionalMissingChecks: {
          question: string;
          reason: string;
          category: string;
          jumpTarget: string;
          itemKind: string;
        }[];
        suggestedTimelineEvents: {
          date: string;
          time: string;
          title: string;
          description: string;
          rationale: string;
        }[];
      };

      // Merge baseline deterministic checklist (which preserves user resolutions) with up to 2 novel Gemini checks
      const baseChecklist = evaluateMissingChecklistCandidates(incidentSnapshot);
      const validJumpTargets = new Set(['add-details', 'upload-evidence', 'edit-timeline']);
      const validItemKinds = new Set([
        'missing-detail',
        'unclear-timeline',
        'optional-evidence',
        'ambiguity-check',
        'fact-verification',
      ]);

      for (const extra of (aiParsed.additionalMissingChecks || []).slice(0, 2)) {
        const dup = baseChecklist.some(
          (item) =>
            item.question.toLowerCase().slice(0, 28) === extra.question.toLowerCase().slice(0, 28)
        );
        if (!dup && extra.question.trim()) {
          baseChecklist.push({
            id: `mq-ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            question: extra.question.trim(),
            reason: extra.reason.trim(),
            category: extra.category.trim() || 'AI Review',
            status: 'open',
            resolutionState: 'open',
            jumpTarget: (validJumpTargets.has(extra.jumpTarget)
              ? extra.jumpTarget
              : 'add-details') as ChecklistJumpTarget,
            itemKind: (validItemKinds.has(extra.itemKind)
              ? extra.itemKind
              : 'missing-detail') as ChecklistItemKind,
            userAnswer: '',
            source: 'gemini-server',
          });
        }
      }

      const generatedAt = new Date().toISOString();
      const missingInformationSummary = baseChecklist.map(
        (q) =>
          `[${formatResolutionLabel(q.resolutionState, q.status)}] ${q.question}${q.userAnswer ? ` — Note: ${q.userAnswer}` : ''}`
      );

      const reportCore: Omit<StructuredAiReport, 'editableFullReportText'> = {
        caseId: caseCode,
        incidentOverview:
          aiParsed.incidentOverview?.trim() || deterministic.structuredReport.incidentOverview,
        incidentDetailsSummary: deterministic.structuredReport.incidentDetailsSummary,
        chronologicalAccount: deterministic.structuredReport.chronologicalAccount,
        evidenceInventorySummary: deterministic.structuredReport.evidenceInventorySummary,
        importantUserFacts:
          aiParsed.importantUserFacts?.length > 0
            ? aiParsed.importantUserFacts
            : deterministic.structuredReport.importantUserFacts,
        unknownOrUnconfirmedDetails:
          aiParsed.unknownOrUnconfirmedDetails?.length > 0
            ? aiParsed.unknownOrUnconfirmedDetails
            : deterministic.structuredReport.unknownOrUnconfirmedDetails,
        missingInformationSummary,
        suggestedNextSteps:
          aiParsed.suggestedNextSteps?.length > 0
            ? aiParsed.suggestedNextSteps
            : deterministic.structuredReport.suggestedNextSteps,
        isUserEdited: false,
        source: 'gemini-server',
        generatedAt,
      };

      const structuredReport: StructuredAiReport = {
        ...reportCore,
        editableFullReportText: formatStructuredReportFullText(reportCore),
      };

      res.json({
        source: 'gemini-server',
        geminiConfigured: true,
        structuredReport,
        neutralSummary: structuredReport.incidentOverview,
        evidenceIndexSummary: structuredReport.evidenceInventorySummary,
        missingInfoQuestions: baseChecklist,
        suggestedTimelineEvents:
          aiParsed.suggestedTimelineEvents?.length > 0
            ? aiParsed.suggestedTimelineEvents.slice(0, 3)
            : deterministic.suggestedTimelineEvents,
      });
    } catch (error: unknown) {
      console.warn(
        'Gemini report fallback activated:',
        error instanceof Error ? error.message : String(error)
      );
      res.json({
        source: 'local-organizer',
        geminiConfigured: false,
        ...deterministic,
      });
    }
  });

  // =========================================================================
  // VERIFIED PORTAL URL CHECKER (Requirement #10)
  // =========================================================================
  app.get('/api/portals/official-list', (_req, res) => {
    res.json({
      notice:
        'KAVACH helps you organize your incident report. Complete official complaint submission on the relevant government website.',
      portals: [
        {
          id: 'nccrp',
          label: 'National Cyber Crime Reporting Portal',
          url: 'https://cybercrime.gov.in/',
          authority: 'Ministry of Home Affairs, Government of India',
          description:
            'Official government portal for reporting cyberbullying, online harassment, impersonation, threats, and cyber financial fraud (Helpline: 1930).',
        },
        {
          id: 'erss-112',
          label: 'Emergency Assistance — 112',
          url: 'https://112.gov.in/',
          authority: 'Emergency Response Support System (ERSS), Government of India',
          description:
            'Pan-India emergency response portal and 24x7 emergency helpline (Dial 112) for immediate police, medical, or safety dispatch.',
        },
        {
          id: 'wcd-women-help',
          label: 'Women and Child Development — Support Information',
          url: 'https://wcd.gov.in/women/help',
          authority: 'Ministry of Women & Child Development, Government of India',
          description:
            'Official Women Helpline (181), One Stop Centre directory, and institutional safety resources.',
        },
        {
          id: 'track-cybercrime',
          label: 'Track Cybercrime Complaint',
          url: 'https://www.cybercrime.gov.in/Webform/chkackstatus.aspx',
          authority: 'National Cyber Crime Reporting Portal — Status Check',
          description:
            'Official status-tracking page to check your filed cybercrime complaint using your official acknowledgement number and OTP.',
        },
      ],
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KAVACH server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
