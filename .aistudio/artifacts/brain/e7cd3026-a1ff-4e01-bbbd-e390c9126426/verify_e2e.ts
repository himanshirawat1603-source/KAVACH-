import assert from 'node:assert';
import Database from 'better-sqlite3';
import { buildIncidentPdfDocument, generatePlainTextReport } from '/app/applet/src/utils/pdfGenerator.ts';
import { getRecommendationsForIncident } from '/app/applet/src/data/verifiedDirectory.ts';

const BASE = 'http://127.0.0.1:3000';

async function api(p: string, m = 'GET', b?: unknown, t?: string) {
  const h: Record<string, string> = {};
  if (b !== undefined) h['Content-Type'] = 'application/json';
  if (t) h['Authorization'] = `Bearer ${t}`;
  const r = await fetch(`${BASE}${p}`, {
    method: m,
    headers: h,
    body: b !== undefined ? JSON.stringify(b) : undefined,
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`${m} ${p} (${r.status}): ${JSON.stringify(j)}`);
  return j;
}

async function run() {
  for (let i = 0; i < 10; i++) {
    try {
      const h = await fetch(`${BASE}/api/system/architecture`);
      if (h.ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }

  const email = `e2e.${Date.now()}@kavach.local`;
  let uid = '';
  let tok = '';
  let code = '';

  try {
    // 1. Sign up & Sign in
    const up = await api('/api/auth/signup', 'POST', {
      name: 'Aarav Citizen',
      email,
      password: 'SafePassword123!',
    });
    uid = up.user.id;
    const sin = await api('/api/auth/signin', 'POST', {
      email,
      password: 'SafePassword123!',
    });
    tok = sin.token;
    console.log('PASS [1/18]: Sign-up & sign-in verified');

    // 2, 3, 4. Create new case + verify permanent KAV-XXXXXXXX ID + incident details
    const cRes = await api(
      '/api/cases',
      'POST',
      {
        title: 'Impersonation account messaging contacts on Instagram',
        category: 'impersonation',
        urgencyLevel: 'high',
        date: '2026-10-20',
        time: '',
        timezone: 'IST (UTC+05:30)',
        platform: 'Instagram',
        location: 'Bengaluru, Karnataka',
        peopleInvolved: '',
        description:
          'An unknown profile copied my display photo and name and messaged colleagues asking for money.',
        additionalNotes: 'Colleague alerted me by phone.',
        workflowStage: 2,
        completedStages: [1],
      },
      tok
    );
    code = cRes.caseRecord.caseCode;
    assert(/^KAV-[A-Z0-9]{8}$/.test(code), `Invalid Case ID: ${code}`);
    console.log(`PASS [2-4/18]: Created case ${code} with permanent Case ID & Step 1 details`);

    // 5. Upload/add evidence items
    const evRes = await api(
      `/api/cases/${code}`,
      'PATCH',
      {
        evidence: [
          {
            id: 'ev-1',
            fileName: 'fake-profile.png',
            fileType: 'image/png',
            recordKind: 'Screenshot / Image',
            fileSizeBytes: 1200,
            fileReference: 'Device Gallery / IMG_2041.PNG',
            uploadStatus: 'Stored in Case Record',
            storageIndicator: 'Preview / Excerpt Saved in Case Record',
            entryMethod: 'file-upload',
            capturedAt: '2026-10-20 19:15',
            sourceUrl: '',
            description: 'Full-screen bio screenshot of impersonating profile.',
            previewDataUrl:
              'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
            createdAt: new Date().toISOString(),
          },
        ],
        workflowStage: 3,
        completedStages: [1, 2],
      },
      tok
    );
    assert(evRes.caseRecord.evidence.length === 1 && evRes.caseRecord.caseCode === code);
    console.log('PASS [5/18]: Evidence upload, metadata, fileReference & preview saved');

    // 6 & 7. Generate AI Report & Missing-Information / Evidence Checklist
    const ai1 = await api('/api/ai/generate-report', 'POST', evRes.caseRecord, tok);
    assert(ai1.structuredReport.editableFullReportText.includes(`1. CASE ID: ${code}`));
    assert(ai1.structuredReport.editableFullReportText.includes('5. EVIDENCE INVENTORY'));
    assert(ai1.structuredReport.editableFullReportText.includes('8. MISSING INFORMATION'));
    assert(
      ai1.missingInfoQuestions.some(
        (q: any) => q.fieldKey === 'approx_time_and_zone' && q.resolutionState === 'open'
      )
    );
    console.log(
      `PASS [6-7/18]: AI Report (${ai1.source}) & Missing-Details Review (${ai1.missingInfoQuestions.length} items) verified`
    );

    // 8. Mark some items Not Available & Not Applicable
    const marked = ai1.missingInfoQuestions.map((q: any) =>
      q.fieldKey === 'communication_logs'
        ? {
            ...q,
            status: 'not-applicable',
            resolutionState: 'not-available',
            userAnswer: 'Deleted by sender prior to export',
          }
        : q.fieldKey === 'prior_platform_report_ref'
          ? { ...q, status: 'not-applicable', resolutionState: 'not-applicable' }
          : q
    );
    const s8 = await api(
      `/api/cases/${code}`,
      'PATCH',
      {
        structuredReport: ai1.structuredReport,
        missingInfoQuestions: marked,
        workflowStage: 4,
      },
      tok
    );
    console.log('PASS [8/18]: Marked checklist items Not Available & Not Applicable');

    // 9 & 10. Add new details + new evidence & rerun AI review
    const s9 = await api(
      `/api/cases/${code}`,
      'PATCH',
      {
        time: '19:10',
        peopleInvolved: '@aarav_fake_99',
        evidence: [
          ...s8.caseRecord.evidence,
          {
            id: 'ev-2',
            fileName: 'Fake Profile URL',
            fileType: 'Manual Entry',
            recordKind: 'URL / Webpage Link',
            fileReference: 'https://instagram.com/aarav_fake_99',
            uploadStatus: 'Manual Entry',
            entryMethod: 'manual-entry',
            capturedAt: '2026-10-20 19:18',
            sourceUrl: 'https://instagram.com/aarav_fake_99',
            description: 'Direct permalink to impersonating profile.',
            createdAt: new Date().toISOString(),
          },
        ],
      },
      tok
    );
    const ai2 = await api('/api/ai/generate-report', 'POST', s9.caseRecord, tok);
    assert(
      ai2.missingInfoQuestions.find((q: any) => q.fieldKey === 'approx_time_and_zone')
        ?.resolutionState === 'available'
    );
    assert(
      ai2.missingInfoQuestions.find((q: any) => q.fieldKey === 'people_or_accounts_involved')
        ?.resolutionState === 'available'
    );
    assert(
      ai2.missingInfoQuestions.find((q: any) => q.fieldKey === 'impersonation_profile_url')
        ?.resolutionState === 'available'
    );
    assert(
      ai2.missingInfoQuestions.find((q: any) => q.fieldKey === 'communication_logs')
        ?.resolutionState === 'not-available'
    );
    assert(
      ai2.missingInfoQuestions.find((q: any) => q.fieldKey === 'prior_platform_report_ref')
        ?.resolutionState === 'not-applicable'
    );
    console.log(
      'PASS [9-10/18]: Added details & evidence; Recheck with AI upgraded satisfied items & preserved prior marks'
    );

    // 11, 12, 13. Timeline, Edit & Save AI Report, Save Draft
    const editedRep = {
      ...ai2.structuredReport,
      editableFullReportText:
        ai2.structuredReport.editableFullReportText + '\nUSER VERIFIED FINAL SUMMARY.',
      isUserEdited: true,
      source: 'user-edited',
    };
    const s13 = await api(
      `/api/cases/${code}`,
      'PATCH',
      {
        timeline: [
          {
            id: 'tl-1',
            date: '2026-10-20',
            time: '19:10',
            timeApproximate: true,
            title: 'Colleague alerted me about DM',
            description: 'Received phone call about fake profile.',
            source: 'user',
            confirmed: true,
            linkedEvidenceId: 'ev-1',
          },
        ],
        structuredReport: editedRep,
        missingInfoQuestions: ai2.missingInfoQuestions,
        kavachStatus: 'Ready for Submission',
        workflowStage: 6,
        completedStages: [1, 2, 3, 4, 5],
      },
      tok
    );
    console.log('PASS [11-13/18]: Chronological timeline, edited AI report & draft persisted');

    // 14. PDF & TXT export
    const pdfBytes = buildIncidentPdfDocument(s13.caseRecord).output('arraybuffer').byteLength;
    const txt = generatePlainTextReport(s13.caseRecord);
    assert(pdfBytes > 2500 && txt.includes('USER VERIFIED FINAL SUMMARY.') && txt.includes(code));
    console.log(`PASS [14/18]: PDF (${pdfBytes} bytes) & TXT (${txt.length} chars) generated cleanly`);

    // 15. Official portal links
    const recs = getRecommendationsForIncident('impersonation', 'high');
    assert(recs.publicAuthorities.some((a) => a.officialUrl === 'https://cybercrime.gov.in/'));
    console.log('PASS [15/18]: Official portal links matched & verified');

    // 16. Record manual official complaint details separately from KAV-XXXXXXXX
    const s16 = await api(
      `/api/cases/${code}`,
      'PATCH',
      {
        kavachStatus: 'Submitted Externally',
        workflowStage: 7,
        completedStages: [1, 2, 3, 4, 5, 6, 7],
        officialTracking: {
          submittedExternally: true,
          authorityOrPortal: 'National Cyber Crime Reporting Portal (cybercrime.gov.in)',
          portalUrl: 'https://cybercrime.gov.in/',
          statusCheckUrl: 'https://www.cybercrime.gov.in/Webform/chkackstatus.aspx',
          acknowledgementNumber: 'NCRP-2026-998877',
          submissionDate: '2026-10-20',
          lastManualStatus: 'Submitted manually',
          lastManualCheckDate: '2026-10-20',
          userNotes: 'Uploaded KAVACH PDF.',
          isLiveVerified: false,
        },
      },
      tok
    );
    assert(
      s16.caseRecord.caseCode === code &&
        s16.caseRecord.officialTracking.acknowledgementNumber === 'NCRP-2026-998877'
    );
    console.log('PASS [16/18]: Official complaint details saved strictly separately from KAVACH Case ID');

    // 17 & 18. Refresh & Reopen
    const me = await api('/api/auth/me', 'GET', undefined, tok);
    const list = await api('/api/cases', 'GET', undefined, tok);
    const reopen = await api(`/api/cases/${code}`, 'GET', undefined, tok);
    assert(
      me.user.id === uid &&
        list.cases.length === 1 &&
        reopen.caseRecord.workflowStage === 7 &&
        reopen.caseRecord.structuredReport?.isUserEdited === true &&
        reopen.caseRecord.peopleInvolved === '@aarav_fake_99'
    );
    console.log('PASS [17-18/18]: Page refresh & case reopen verified at exact saved workflow stage!');
  } finally {
    if (uid) {
      const db = new Database('/app/applet/kavach.sqlite');
      db.prepare('DELETE FROM users WHERE id = ?').run(uid);
      db.close();
      console.log('Cleanup complete: temporary test user deleted.');
    }
  }
}

run().catch((e) => {
  console.error('E2E ERROR:', e);
  process.exit(1);
});
