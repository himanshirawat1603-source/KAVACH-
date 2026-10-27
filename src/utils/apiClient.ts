import {
  DemoAuthorityAssignedCase,
  IncidentRecord,
  KavachCaseStatus,
  KavachUser,
  MissingInfoQuestion,
  ReviewerCaseStatus,
  StructuredAiReport,
} from '../types/incident';

const SESSION_TOKEN_KEY = 'kavach_session_token';

export function getStoredSessionToken(): string | null {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredSessionToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(SESSION_TOKEN_KEY);
    }
  } catch {
    // Ignore storage quota errors in restricted frames
  }
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredSessionToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include',
  });

  let payload: Record<string, unknown> = {};
  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const errMsg =
      typeof payload.error === 'string' && payload.error.trim().length > 0
        ? payload.error
        : `Request failed with status ${response.status}.`;
    const errCode = typeof payload.code === 'string' ? payload.code : undefined;
    throw new ApiError(errMsg, response.status, errCode);
  }

  return payload as T;
}

export interface AuthResponse {
  token: string;
  user: KavachUser;
}

export async function signUpAccount(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await apiFetch<AuthResponse>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  setStoredSessionToken(res.token);
  return res;
}

export async function signInAccount(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await apiFetch<AuthResponse>('/api/auth/signin', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  setStoredSessionToken(res.token);
  return res;
}

export async function signOutAccount(): Promise<void> {
  try {
    await apiFetch<{ signedOut: boolean }>('/api/auth/signout', {
      method: 'POST',
    });
  } finally {
    setStoredSessionToken(null);
  }
}

export async function fetchCurrentUser(): Promise<{
  user: KavachUser;
  passwordResetEmailSupported: boolean;
}> {
  return apiFetch('/api/auth/me');
}

export async function updateAccountProfile(input: {
  name: string;
  currentPassword?: string;
  newPassword?: string;
}): Promise<{ user: KavachUser; message: string }> {
  return apiFetch('/api/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function requestPasswordResetInfo(email: string): Promise<{
  supported: boolean;
  message?: string;
}> {
  return apiFetch('/api/auth/password-reset-request', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function fetchUserCases(): Promise<IncidentRecord[]> {
  const res = await apiFetch<{ cases: IncidentRecord[] }>('/api/cases');
  return res.cases;
}

export async function fetchSingleCase(caseCode: string): Promise<IncidentRecord> {
  const res = await apiFetch<{ caseRecord: IncidentRecord }>(
    `/api/cases/${encodeURIComponent(caseCode)}`
  );
  return res.caseRecord;
}

export async function createCaseRecord(
  input: Partial<IncidentRecord> & {
    title: string;
    category: IncidentRecord['category'];
    date: string;
    description: string;
    activityNote?: string;
  }
): Promise<IncidentRecord> {
  const res = await apiFetch<{ caseRecord: IncidentRecord }>('/api/cases', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return res.caseRecord;
}

export async function updateCaseRecord(
  caseCode: string,
  updates: Partial<IncidentRecord> & {
    activityNote?: string;
    statusNote?: string;
    recordStatusHistory?: boolean;
  }
): Promise<IncidentRecord> {
  const res = await apiFetch<{ caseRecord: IncidentRecord }>(
    `/api/cases/${encodeURIComponent(caseCode)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }
  );
  return res.caseRecord;
}

export async function updateCaseStatusRecord(
  caseCode: string,
  newStatus: KavachCaseStatus,
  note: string
): Promise<IncidentRecord> {
  const res = await apiFetch<{ caseRecord: IncidentRecord }>(
    `/api/cases/${encodeURIComponent(caseCode)}/status`,
    {
      method: 'POST',
      body: JSON.stringify({ newStatus, note }),
    }
  );
  return res.caseRecord;
}

export async function deleteCaseRecord(caseCode: string): Promise<void> {
  await apiFetch<{ deleted: boolean }>(`/api/cases/${encodeURIComponent(caseCode)}`, {
    method: 'DELETE',
  });
}

export interface GlobalCaseHistoryItem {
  id: string;
  caseCode: string;
  caseTitle: string;
  caseCategory: string;
  previousStatus: KavachCaseStatus | null;
  newStatus: KavachCaseStatus;
  note: string;
  changedBy: string;
  timestamp: string;
}

export async function fetchGlobalCaseHistory(): Promise<GlobalCaseHistoryItem[]> {
  const res = await apiFetch<{ history: GlobalCaseHistoryItem[] }>('/api/case-history');
  return res.history;
}

export async function fetchDemoAuthorityCases(): Promise<{
  banner: string;
  cases: DemoAuthorityAssignedCase[];
}> {
  return apiFetch('/api/demo-authority/cases', {
    headers: {
      'x-kavach-demo-authority-mode': 'enabled',
    },
  });
}

export async function updateDemoAuthorityCase(
  caseCode: string,
  input: {
    reviewerStatus: ReviewerCaseStatus;
    caseNotes: string;
    historyNote: string;
  }
): Promise<DemoAuthorityAssignedCase> {
  const res = await apiFetch<{ caseRecord: DemoAuthorityAssignedCase }>(
    `/api/demo-authority/cases/${encodeURIComponent(caseCode)}`,
    {
      method: 'PATCH',
      headers: {
        'x-kavach-demo-authority-mode': 'enabled',
      },
      body: JSON.stringify(input),
    }
  );
  return res.caseRecord;
}

export interface SystemArchitectureInfo {
  databaseEngine: string;
  passwordSecurity: string;
  sessionMechanism: string;
  externalCloudAuthConfigured: boolean;
  passwordResetEmailConfigured: boolean;
  governmentApiConnected: boolean;
  geminiServerConfigured: boolean;
  externalConfigNotes: string[];
}

export async function fetchSystemArchitecture(): Promise<SystemArchitectureInfo> {
  return apiFetch('/api/system/architecture');
}

export interface GenerateCaseAiReportResponse {
  source: 'gemini-server' | 'local-organizer';
  geminiConfigured: boolean;
  structuredReport: StructuredAiReport;
  neutralSummary: string;
  evidenceIndexSummary: string;
  missingInfoQuestions: MissingInfoQuestion[];
  suggestedTimelineEvents: {
    date: string;
    time: string;
    title: string;
    description: string;
    rationale: string;
  }[];
}

export async function generateCaseAiReport(
  incident: IncidentRecord
): Promise<GenerateCaseAiReportResponse> {
  return apiFetch('/api/ai/generate-report', {
    method: 'POST',
    body: JSON.stringify({
      id: incident.id,
      caseCode: incident.caseCode,
      title: incident.title,
      category: incident.category,
      urgencyLevel: incident.urgencyLevel,
      platform: incident.platform,
      location: incident.location || '',
      peopleInvolved: incident.peopleInvolved || '',
      date: incident.date,
      time: incident.time,
      timezone: incident.timezone,
      description: incident.description,
      additionalNotes: incident.additionalNotes,
      evidence: incident.evidence,
      timeline: incident.timeline,
      missingInfoQuestions: incident.missingInfoQuestions,
    }),
  });
}
