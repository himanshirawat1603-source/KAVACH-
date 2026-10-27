/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import {
  ExternalLink,
  FilePlus2,
  FolderOpen,
  HeartHandshake,
  History,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldAlert,
  UserCog,
  X,
} from 'lucide-react';
import { AuthView } from './components/AuthView';
import { AuthorityDashboardView } from './components/AuthorityDashboardView';
import { CaseDetailSection, CaseDetailView } from './components/CaseDetailView';
import { CaseHistoryView } from './components/CaseHistoryView';
import { CreateCaseFlow } from './components/CreateCaseFlow';
import { DashboardView } from './components/DashboardView';
import { KavachLogo } from './components/KavachLogo';
import { LandingPage } from './components/LandingPage';
import { MyCasesView } from './components/MyCasesView';
import { OfficialPortalsView } from './components/OfficialPortalsView';
import { ProfileSettingsView } from './components/ProfileSettingsView';
import { PublicInfoPages } from './components/PublicInfoPages';
import { SupportResourcesView } from './components/SupportResourcesView';
import { getUnimportedLegacyDrafts, markLegacyDraftImported } from './data/demoIncident';
import {
  IncidentRecord,
  KavachUser,
  PublicPageView,
  WorkspaceTab,
} from './types/incident';
import {
  createCaseRecord,
  fetchCurrentUser,
  fetchUserCases,
  setStoredSessionToken,
  signOutAccount,
} from './utils/apiClient';

const WORKSPACE_SESSION_KEY = 'kavach_workspace_nav_v1';

interface SavedWorkspaceNav {
  inWorkspace: boolean;
  activeTab: WorkspaceTab;
  selectedCaseCode: string | null;
  caseDetailInitialSection: CaseDetailSection;
}

function readSavedWorkspaceNav(): SavedWorkspaceNav | null {
  try {
    const raw = sessionStorage.getItem(WORKSPACE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedWorkspaceNav>;
    return {
      inWorkspace: Boolean(parsed.inWorkspace),
      activeTab: (parsed.activeTab as WorkspaceTab) || 'dashboard',
      selectedCaseCode:
        typeof parsed.selectedCaseCode === 'string' ? parsed.selectedCaseCode : null,
      caseDetailInitialSection:
        (parsed.caseDetailInitialSection as CaseDetailSection) || 'resume',
    };
  } catch {
    return null;
  }
}

export default function App() {
  const [authChecking, setAuthChecking] = useState(true);
  const [currentUser, setCurrentUser] = useState<KavachUser | null>(null);
  const [inWorkspace, setInWorkspace] = useState(false);
  const [publicPage, setPublicPage] = useState<PublicPageView>('home');
  const [authRedirectNotice, setAuthRedirectNotice] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('dashboard');
  const [cases, setCases] = useState<IncidentRecord[]>([]);
  const [selectedCaseCode, setSelectedCaseCode] = useState<string | null>(null);
  const [caseDetailInitialSection, setCaseDetailInitialSection] =
    useState<CaseDetailSection>('resume');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [unimportedLegacyDrafts, setUnimportedLegacyDrafts] = useState<IncidentRecord[]>([]);
  const [importingLegacy, setImportingLegacy] = useState(false);

  const loadAuthenticatedCases = useCallback(async () => {
    try {
      const userCases = await fetchUserCases();
      setCases(userCases);
      return userCases;
    } catch {
      setCases([]);
      return [];
    }
  }, []);

  // Restore session and workspace navigation on mount / browser refresh
  useEffect(() => {
    let mounted = true;
    const savedNav = readSavedWorkspaceNav();

    fetchCurrentUser()
      .then(async (res) => {
        if (!mounted) return;
        setCurrentUser(res.user);
        setUnimportedLegacyDrafts(getUnimportedLegacyDrafts());
        const loadedCases = await loadAuthenticatedCases();
        if (!mounted) return;

        if (savedNav && savedNav.inWorkspace) {
          setInWorkspace(true);
          if (
            savedNav.activeTab === 'create-case' &&
            savedNav.selectedCaseCode &&
            loadedCases.some((c) => c.caseCode === savedNav.selectedCaseCode)
          ) {
            setSelectedCaseCode(savedNav.selectedCaseCode);
            setCaseDetailInitialSection('resume');
            setActiveTab('case-detail');
          } else {
            setActiveTab(savedNav.activeTab);
            setSelectedCaseCode(savedNav.selectedCaseCode);
            setCaseDetailInitialSection(savedNav.caseDetailInitialSection || 'resume');
          }
        }
      })
      .catch(() => {
        if (!mounted) return;
        setStoredSessionToken(null);
        setCurrentUser(null);
      })
      .finally(() => {
        if (mounted) setAuthChecking(false);
      });
    return () => {
      mounted = false;
    };
  }, [loadAuthenticatedCases]);

  // Persist workspace navigation across refreshes while signed in
  useEffect(() => {
    if (!currentUser) return;
    try {
      const payload: SavedWorkspaceNav = {
        inWorkspace,
        activeTab,
        selectedCaseCode,
        caseDetailInitialSection,
      };
      sessionStorage.setItem(WORKSPACE_SESSION_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota / privacy mode errors
    }
  }, [currentUser, inWorkspace, activeTab, selectedCaseCode, caseDetailInitialSection]);

  const handleAuthenticated = async (user: KavachUser) => {
    setCurrentUser(user);
    setAuthRedirectNotice(null);
    setUnimportedLegacyDrafts(getUnimportedLegacyDrafts());
    await loadAuthenticatedCases();
    setActiveTab('dashboard');
    setInWorkspace(true);
  };

  const handleProtectedWorkspaceEntry = () => {
    if (!currentUser) {
      setAuthRedirectNotice('Please sign in to access your private Citizen Dashboard.');
      setPublicPage('signin');
      setInWorkspace(false);
      return;
    }
    setInWorkspace(true);
  };

  const handleSignOut = async () => {
    await signOutAccount();
    try {
      sessionStorage.removeItem(WORKSPACE_SESSION_KEY);
    } catch {
      // Ignore storage error
    }
    setCurrentUser(null);
    setCases([]);
    setSelectedCaseCode(null);
    setInWorkspace(false);
    setPublicPage('home');
    setMobileSidebarOpen(false);
  };

  const handleImportLegacyDrafts = async () => {
    if (unimportedLegacyDrafts.length === 0) return;
    setImportingLegacy(true);
    try {
      for (const draft of unimportedLegacyDrafts) {
        await createCaseRecord({
          title:
            draft.title.trim().length >= 4
              ? draft.title.trim()
              : 'Recovered Local Incident Draft',
          category: draft.category,
          urgencyLevel: draft.urgencyLevel,
          date: draft.date || new Date().toISOString().slice(0, 10),
          time: draft.time,
          timezone: draft.timezone || 'IST (UTC+05:30)',
          platform: draft.platform,
          location: draft.location || '',
          peopleInvolved: draft.peopleInvolved || '',
          description:
            draft.description.trim().length >= 15
              ? draft.description.trim()
              : `${draft.description.trim()} (Recovered from browser draft)`.padEnd(20, '.'),
          additionalNotes: draft.additionalNotes,
          kavachStatus: draft.kavachStatus,
          legacyCaseCode: draft.caseCode,
          evidence: draft.evidence,
          timeline: draft.timeline,
          aiSummary: draft.aiSummary,
          structuredReport: draft.structuredReport || null,
          missingInfoQuestions: draft.missingInfoQuestions,
          officialTracking: draft.officialTracking,
          privateSupportTracking: draft.privateSupportTracking,
          workflowStage: draft.workflowStage || 1,
          completedStages: draft.completedStages || [1],
        });
        markLegacyDraftImported(draft.id);
      }
      setUnimportedLegacyDrafts(getUnimportedLegacyDrafts());
      await loadAuthenticatedCases();
    } finally {
      setImportingLegacy(false);
    }
  };

  const handleOpenCase = (caseCode: string, section: CaseDetailSection = 'resume') => {
    setSelectedCaseCode(caseCode);
    setCaseDetailInitialSection(section);
    setActiveTab('case-detail');
    setMobileSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateTab = (tab: WorkspaceTab) => {
    if (!currentUser) {
      handleProtectedWorkspaceEntry();
      return;
    }
    if (tab === 'create-case') {
      // Clear selectedCaseCode when starting a brand-new case so refresh only resumes once Step 1 is saved
      setSelectedCaseCode(null);
    }
    setActiveTab(tab);
    setMobileSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#050B16] text-slate-200 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <KavachLogo size="lg" />
          <p className="text-xs font-medium tracking-wider uppercase text-slate-400">
            Initializing Secure Workspace...
          </p>
        </div>
      </div>
    );
  }

  // PUBLIC ROUTES (Homepage, About, Help, Sign In, Sign Up)
  if (!inWorkspace || !currentUser) {
    if (publicPage === 'signin' || publicPage === 'signup') {
      return (
        <AuthView
          initialMode={publicPage}
          redirectNotice={authRedirectNotice}
          onAuthenticated={handleAuthenticated}
          onNavigatePublic={(page) => {
            setAuthRedirectNotice(null);
            setPublicPage(page);
          }}
        />
      );
    }

    if (publicPage === 'about' || publicPage === 'help') {
      return (
        <PublicInfoPages
          page={publicPage}
          currentUser={currentUser}
          onNavigatePublic={setPublicPage}
          onEnterDashboard={handleProtectedWorkspaceEntry}
        />
      );
    }

    return (
      <LandingPage
        currentUser={currentUser}
        onNavigatePublic={setPublicPage}
        onEnterDashboard={handleProtectedWorkspaceEntry}
      />
    );
  }

  // PROTECTED CITIZEN DASHBOARD & WORKSPACE
  const selectedCase =
    cases.find((c) => c.caseCode === selectedCaseCode) || cases[0] || null;

  const primaryNavItems: {
    id: WorkspaceTab;
    label: string;
    icon: typeof LayoutDashboard;
    badge?: number;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'create-case', label: 'Create New Case', icon: FilePlus2 },
    { id: 'my-cases', label: 'My Cases', icon: FolderOpen, badge: cases.length },
    { id: 'case-history', label: 'Case History', icon: History },
    { id: 'official-portals', label: 'Official Complaint Portals', icon: ExternalLink },
    { id: 'support-resources', label: 'Support & Help Directory', icon: HeartHandshake },
    { id: 'profile', label: 'Profile and Settings', icon: UserCog },
  ];

  return (
    <div className="min-h-screen bg-[#050B16] text-slate-100 flex flex-col lg:flex-row">
      {/* Mobile Workspace Top Header */}
      <header className="lg:hidden sticky top-0 z-40 border-b border-blue-400/15 bg-[#060E1F]/95 backdrop-blur-xl px-4 h-16 flex items-center justify-between">
        <button
          type="button"
          onClick={() => handleNavigateTab('dashboard')}
          className="cursor-pointer"
        >
          <KavachLogo size="sm" />
        </button>

        <button
          type="button"
          onClick={() => setMobileSidebarOpen((prev) => !prev)}
          className="p-2 rounded-lg border border-slate-800 bg-slate-900/80 text-slate-200"
          aria-label="Toggle workspace navigation"
        >
          {mobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Sidebar Navigation (Desktop Fixed + Mobile Drawer) */}
      <aside
        className={`${
          mobileSidebarOpen ? 'block' : 'hidden'
        } lg:flex lg:flex-col lg:w-72 lg:shrink-0 border-r border-blue-400/15 bg-[#060D1C] lg:min-h-screen z-30`}
      >
        <div className="hidden lg:flex items-center justify-between px-6 h-20 border-b border-slate-800/90">
          <button
            type="button"
            onClick={() => handleNavigateTab('dashboard')}
            className="text-left cursor-pointer"
          >
            <KavachLogo size="md" subtitle="Citizen Safety Platform" />
          </button>
        </div>

        <div className="flex-1 px-4 py-5 space-y-6 overflow-y-auto">
          {/* Signed-in User Chip */}
          <div className="rounded-xl bg-[#0A152C] border border-blue-400/20 px-3.5 py-3">
            <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
            <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
            <p className="mt-1 font-mono text-[10px] text-cyan-300">{currentUser.id}</p>
          </div>

          {/* Citizen Navigation */}
          <nav className="space-y-1">
            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                activeTab === item.id ||
                (activeTab === 'case-detail' && item.id === 'my-cases');
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigateTab(item.id)}
                  className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600/90 to-blue-500/80 text-white shadow-md shadow-blue-900/40 border border-cyan-300/25'
                      : 'text-slate-300 hover:bg-[#0D1A33] hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-[#050B16]/70 text-cyan-300 text-xs font-mono tabular-nums">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Isolated Demo Authority Sandbox Link */}
          <div className="pt-4 border-t border-slate-800/90 space-y-1">
            <span className="px-3.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">
              Sandbox Preview
            </span>
            <button
              type="button"
              onClick={() => handleNavigateTab('demo-authority')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'demo-authority'
                  ? 'bg-amber-600/25 text-amber-200 border border-amber-400/40'
                  : 'text-slate-400 hover:bg-[#0D1A33] hover:text-amber-200'
              }`}
            >
              <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400" />
              <span>Demo Authority Dashboard</span>
            </button>
          </div>
        </div>

        {/* Bottom Homepage & Sign Out Actions */}
        <div className="p-4 border-t border-slate-800/90 space-y-2">
          <button
            type="button"
            onClick={() => {
              setInWorkspace(false);
              setPublicPage('home');
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-[#0D1A33] transition-colors cursor-pointer"
          >
            <Home className="h-4 w-4" />
            Public Homepage
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-red-300 hover:text-white hover:bg-red-950/50 border border-transparent hover:border-red-500/30 transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-10 py-8 max-w-6xl w-full mx-auto">
        {activeTab === 'dashboard' && (
          <DashboardView
            user={currentUser}
            cases={cases}
            unimportedLegacyDrafts={unimportedLegacyDrafts}
            importingLegacy={importingLegacy}
            onImportLegacyDrafts={handleImportLegacyDrafts}
            onNavigateTab={handleNavigateTab}
            onOpenCase={(code) => handleOpenCase(code, 'resume')}
          />
        )}

        {activeTab === 'create-case' && (
          <CreateCaseFlow
            onCaseCreated={(created) => {
              setCases((prev) => [
                created,
                ...prev.filter((c) => c.caseCode !== created.caseCode),
              ]);
              setSelectedCaseCode(created.caseCode);
            }}
            onCaseUpdated={(updated) => {
              setCases((prev) => {
                const exists = prev.some((c) => c.caseCode === updated.caseCode);
                if (!exists) return [updated, ...prev];
                return prev.map((c) => (c.caseCode === updated.caseCode ? updated : c));
              });
              setSelectedCaseCode(updated.caseCode);
            }}
            onOpenCreatedCase={(code) => handleOpenCase(code, 'resume')}
            onExitToMyCases={() => handleNavigateTab('my-cases')}
            onCancel={() => handleNavigateTab('dashboard')}
          />
        )}

        {activeTab === 'my-cases' && (
          <MyCasesView
            cases={cases}
            onOpenCase={(code) => handleOpenCase(code, 'resume')}
            onCreateNew={() => handleNavigateTab('create-case')}
          />
        )}

        {activeTab === 'case-detail' && selectedCase && (
          <CaseDetailView
            incident={selectedCase}
            initialSection={caseDetailInitialSection}
            onUpdated={(updated) => {
              setCases((prev) =>
                prev.map((c) => (c.caseCode === updated.caseCode ? updated : c))
              );
            }}
            onDeleted={(deletedCode) => {
              setCases((prev) => prev.filter((c) => c.caseCode !== deletedCode));
              setSelectedCaseCode(null);
              setActiveTab('my-cases');
            }}
            onBack={() => handleNavigateTab('my-cases')}
          />
        )}

        {activeTab === 'case-detail' && !selectedCase && (
          <MyCasesView
            cases={cases}
            onOpenCase={(code) => handleOpenCase(code, 'resume')}
            onCreateNew={() => handleNavigateTab('create-case')}
          />
        )}

        {activeTab === 'case-history' && (
          <CaseHistoryView onOpenCase={(code) => handleOpenCase(code, 'status-history')} />
        )}

        {activeTab === 'official-portals' && (
          <OfficialPortalsView
            cases={cases}
            onOpenCaseOfficialSection={(code) => handleOpenCase(code, 'official-filing')}
          />
        )}

        {activeTab === 'support-resources' && <SupportResourcesView />}

        {activeTab === 'demo-authority' && <AuthorityDashboardView />}

        {activeTab === 'profile' && (
          <ProfileSettingsView
            user={currentUser}
            onUserUpdated={(updatedUser) => setCurrentUser(updatedUser)}
            onSignOut={handleSignOut}
          />
        )}
      </main>
    </div>
  );
}
