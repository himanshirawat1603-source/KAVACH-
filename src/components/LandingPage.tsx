import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  FolderLock,
  HelpCircle,
  Menu,
  X,
} from 'lucide-react';
import cyberOpsHeroImg from '../assets/images/cyber_ops_hero_1793029895248.jpg';
import { KavachLogo } from './KavachLogo';
import { KavachUser, PublicPageView } from '../types/incident';

interface LandingPageProps {
  currentUser: KavachUser | null;
  onNavigatePublic: (page: PublicPageView) => void;
  onEnterDashboard: () => void;
}

const FLOATING_NODES = [
  { top: '18%', left: '14%', delay: '0s', size: 'h-1.5 w-1.5' },
  { top: '26%', left: '78%', delay: '1.2s', size: 'h-2 w-2' },
  { top: '46%', left: '86%', delay: '2.4s', size: 'h-1.5 w-1.5' },
  { top: '62%', left: '19%', delay: '1.8s', size: 'h-2 w-2' },
  { top: '34%', left: '54%', delay: '3.1s', size: 'h-1.5 w-1.5' },
];

export function LandingPage({
  currentUser,
  onNavigatePublic,
  onEnterDashboard,
}: LandingPageProps) {
  const prefersReducedMotion = useReducedMotion();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [learnMoreExpanded, setLearnMoreExpanded] = useState(false);

  const handleGetStarted = () => {
    if (currentUser) {
      onEnterDashboard();
    } else {
      onNavigatePublic('signup');
    }
  };

  const handleSignIn = () => {
    if (currentUser) {
      onEnterDashboard();
    } else {
      onNavigatePublic('signin');
    }
  };

  const scrollToFeatures = () => {
    setMobileMenuOpen(false);
    const el = document.getElementById('kavach-features');
    if (el) {
      el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
  };

  const fadeUp = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 18 },
        animate: { opacity: 1, y: 0 },
      };

  return (
    <div className="min-h-screen bg-[#050B16] text-slate-100 flex flex-col selection:bg-blue-500/30 selection:text-cyan-100">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-blue-400/15 bg-[#050B16]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-lg"
          >
            <KavachLogo size="md" />
          </button>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="text-white hover:text-cyan-300 transition-colors cursor-pointer"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => onNavigatePublic('about')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              About
            </button>
            <button
              type="button"
              onClick={scrollToFeatures}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => onNavigatePublic('help')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Help
            </button>
          </nav>

          {/* Desktop Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {currentUser ? (
              <button
                type="button"
                onClick={onEnterDashboard}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/25 border border-blue-400/30 transition-all cursor-pointer"
              >
                Open Dashboard
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSignIn}
                  className="px-4 py-2 rounded-lg border border-slate-700/80 bg-slate-900/60 hover:bg-slate-800/80 hover:border-blue-400/40 text-slate-200 text-sm font-semibold transition-all cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={handleGetStarted}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-cyan-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/30 border border-cyan-300/25 transition-all cursor-pointer"
                >
                  Get Started
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-2 rounded-lg border border-slate-800 bg-slate-900/70 text-slate-200 hover:text-white"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-blue-500/15 bg-[#071022]/95 backdrop-blur-xl px-4 py-4 space-y-3">
            <div className="flex flex-col space-y-1 text-sm font-medium text-slate-200">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-left px-3 py-2 rounded-lg hover:bg-slate-800/60"
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigatePublic('about');
                }}
                className="text-left px-3 py-2 rounded-lg hover:bg-slate-800/60"
              >
                About
              </button>
              <button
                type="button"
                onClick={scrollToFeatures}
                className="text-left px-3 py-2 rounded-lg hover:bg-slate-800/60"
              >
                Features
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigatePublic('help');
                }}
                className="text-left px-3 py-2 rounded-lg hover:bg-slate-800/60"
              >
                Help
              </button>
            </div>
            <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleSignIn();
                }}
                className="py-2.5 rounded-lg border border-slate-700 bg-slate-900/80 text-sm font-semibold text-slate-200"
              >
                {currentUser ? 'Dashboard' : 'Sign In'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleGetStarted();
                }}
                className="py-2.5 rounded-lg bg-blue-600 text-sm font-semibold text-white"
              >
                {currentUser ? 'Open Workspace' : 'Get Started'}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Cinematic Cybersecurity Operations-Room Hero + Feature Section */}
      <main className="relative flex-1 flex flex-col">
        <section className="relative overflow-hidden min-h-[calc(100vh-4.5rem)] flex flex-col justify-between">
          {/* Background Operations Room Image + Dark Readability Overlays */}
          <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
            <img
              src={cyberOpsHeroImg}
              alt=""
              loading="eager"
              decoding="async"
              className="w-full h-full object-cover object-center scale-[1.01]"
            />
            {/* Multi-layer midnight-navy & radial readability veil */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#050B16]/95 via-[#071126]/82 to-[#050B16]/75" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#050B16]/65 via-transparent to-[#050B16]" />

            {/* Subtle Cyber Grid & Ambient Blue Sweep */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(59,130,246,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(59,130,246,0.14) 1px, transparent 1px)',
                backgroundSize: '56px 56px',
              }}
            />
            <div className="absolute -top-24 left-1/4 w-[36rem] h-[22rem] rounded-full bg-blue-600/20 blur-3xl kavach-ambient-sweep" />
            <div className="absolute top-1/3 right-12 w-[26rem] h-[18rem] rounded-full bg-cyan-500/12 blur-3xl kavach-ambient-sweep" />

            {/* Subtle Floating Cyber Nodes */}
            {FLOATING_NODES.map((node, idx) => (
              <span
                key={idx}
                style={{ top: node.top, left: node.left, animationDelay: node.delay }}
                className={`absolute rounded-full bg-cyan-400/70 shadow-[0_0_12px_rgba(34,211,238,0.8)] kavach-node-float ${node.size}`}
              />
            ))}
          </div>

          {/* Hero Content */}
          <div className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-12">
            <div className="max-w-2xl">
              <motion.h1
                {...fadeUp}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.08]"
              >
                <span className="block">Your Safety.</span>
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-200">
                  Your Evidence.
                </span>
                <span className="block">Your Voice.</span>
              </motion.h1>

              <motion.p
                {...fadeUp}
                transition={{ duration: 0.45, delay: 0.08, ease: 'easeOut' }}
                className="mt-6 text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl"
              >
                Document incidents, organize evidence, and track your cases securely in one place.
              </motion.p>

              <motion.div
                {...fadeUp}
                transition={{ duration: 0.45, delay: 0.16, ease: 'easeOut' }}
                className="mt-8 flex flex-wrap items-center gap-4"
              >
                <button
                  type="button"
                  onClick={handleGetStarted}
                  className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold text-sm sm:text-base shadow-[0_0_28px_rgba(37,99,235,0.45)] border border-cyan-300/30 transition-all hover:-translate-y-0.5 cursor-pointer"
                >
                  {currentUser ? 'Go to Dashboard' : 'Get Started'}
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={handleSignIn}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#0B162C]/80 hover:bg-[#11203D] text-slate-100 font-semibold text-sm sm:text-base border border-blue-400/25 hover:border-cyan-400/45 backdrop-blur-md transition-all hover:-translate-y-0.5 cursor-pointer"
                >
                  {currentUser ? `Signed in as ${currentUser.name}` : 'Sign In'}
                </button>
              </motion.div>
            </div>
          </div>

          {/* Three Compact Feature Cards */}
          <div
            id="kavach-features"
            className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-12"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                {
                  icon: FileText,
                  title: 'Document an Incident',
                  text: 'Record facts, dates, platforms, and details clearly.',
                },
                {
                  icon: FolderLock,
                  title: 'Organize Evidence',
                  text: 'Attach files, add notes, and build a clear timeline.',
                },
                {
                  icon: Clock,
                  title: 'Track Your Cases',
                  text: 'Save every case permanently and follow its progress anytime.',
                },
              ].map((card, index) => {
                const Icon = card.icon;
                return (
                  <motion.div
                    key={card.title}
                    {...fadeUp}
                    transition={{
                      duration: 0.4,
                      delay: prefersReducedMotion ? 0 : 0.22 + index * 0.07,
                      ease: 'easeOut',
                    }}
                    className="group rounded-2xl bg-[#0A1428]/80 hover:bg-[#0E1C36]/90 border border-blue-400/20 hover:border-cyan-400/40 backdrop-blur-xl p-6 shadow-[0_12px_36px_rgba(2,6,23,0.65)] transition-all duration-200 hover:-translate-y-1"
                  >
                    <div className="h-11 w-11 rounded-xl bg-blue-600/20 border border-blue-400/30 flex items-center justify-center text-cyan-300 group-hover:scale-105 transition-transform">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="mt-4 text-lg font-bold text-white tracking-tight">
                      {card.title}
                    </h2>
                    <p className="mt-1.5 text-sm text-slate-300 leading-relaxed">{card.text}</p>
                  </motion.div>
                );
              })}
            </div>

            {/* Compact Learn More & Help Center Strip */}
            <div className="mt-8 rounded-2xl bg-[#081122]/85 border border-slate-800/90 backdrop-blur-md px-5 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setLearnMoreExpanded((prev) => !prev)}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer"
                  >
                    <span>Learn More</span>
                    {learnMoreExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  <span className="text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={() => onNavigatePublic('about')}
                    className="text-sm text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    About KAVACH
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigatePublic('help')}
                  className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  <HelpCircle className="h-4 w-4 text-blue-400" />
                  <span>Help Center & Official Portals</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {learnMoreExpanded && (
                <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm text-slate-300">
                  <div>
                    <p className="font-semibold text-white">Permanent Case Records</p>
                    <p className="mt-1 text-slate-400">
                      Each saved case receives a permanent KAVACH Case ID and chronological status history inside your private account.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-white">Structured PDF Export</p>
                    <p className="mt-1 text-slate-400">
                      Generate a clean, downloadable PDF containing your timeline, evidence inventory, and reviewed summary.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-white">Official Portal Guidance</p>
                    <p className="mt-1 text-slate-400">
                      Access verified government portals in a new tab when you are ready to submit an official complaint.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Clean Minimal Footer */}
      <footer className="border-t border-slate-800/80 bg-[#040914] py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <KavachLogo size="sm" />
            <span className="text-slate-500">·</span>
            <span>Incident Documentation & Case Tracking Platform</span>
          </div>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => onNavigatePublic('about')}
              className="hover:text-slate-200 transition-colors cursor-pointer"
            >
              About
            </button>
            <button
              type="button"
              onClick={() => onNavigatePublic('help')}
              className="hover:text-slate-200 transition-colors cursor-pointer"
            >
              Help Center
            </button>
            <button
              type="button"
              onClick={handleSignIn}
              className="hover:text-slate-200 transition-colors cursor-pointer"
            >
              {currentUser ? 'Dashboard' : 'Sign In'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
