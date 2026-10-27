import { FormEvent, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  User as UserIcon,
} from 'lucide-react';
import { KavachLogo } from './KavachLogo';
import { KavachUser, PublicPageView } from '../types/incident';
import {
  ApiError,
  requestPasswordResetInfo,
  signInAccount,
  signUpAccount,
} from '../utils/apiClient';

interface AuthViewProps {
  initialMode: 'signin' | 'signup';
  redirectNotice?: string | null;
  onAuthenticated: (user: KavachUser) => void;
  onNavigatePublic: (page: PublicPageView) => void;
}

export function AuthView({
  initialMode,
  redirectNotice,
  onAuthenticated,
  onNavigatePublic,
}: AuthViewProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetStatus, setResetStatus] = useState<{
    type: 'info' | 'success';
    message: string;
  } | null>(null);

  const switchMode = (nextMode: 'signin' | 'signup' | 'reset') => {
    setMode(nextMode);
    setErrorMessage(null);
    setResetStatus(null);
    if (nextMode === 'signin' || nextMode === 'signup') {
      onNavigatePublic(nextMode);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setResetStatus(null);

    const trimmedEmail = email.trim().toLowerCase();

    if (mode === 'reset') {
      if (!trimmedEmail) {
        setErrorMessage('Please enter the email address associated with your account.');
        return;
      }
      setSubmitting(true);
      try {
        const res = await requestPasswordResetInfo(trimmedEmail);
        setResetStatus({
          type: 'success',
          message:
            res.message ||
            'If an account exists for that email, password reset instructions have been queued.',
        });
      } catch (err: unknown) {
        if (err instanceof ApiError && err.code === 'EMAIL_PROVIDER_NOT_CONFIGURED') {
          setResetStatus({
            type: 'info',
            message: err.message,
          });
        } else {
          setErrorMessage(
            err instanceof Error ? err.message : 'Unable to process password reset request.'
          );
        }
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (mode === 'signup') {
      if (name.trim().length < 2) {
        setErrorMessage('Please enter your full name (at least 2 characters).');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        setErrorMessage('Please enter a valid email address.');
        return;
      }
      if (password.length < 8) {
        setErrorMessage('Password must be at least 8 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please re-enter your password.');
        return;
      }

      setSubmitting(true);
      try {
        const res = await signUpAccount({
          name: name.trim(),
          email: trimmedEmail,
          password,
        });
        onAuthenticated(res.user);
      } catch (err: unknown) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Sign up failed. Please try again.'
        );
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Sign In
    if (!trimmedEmail || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await signInAccount({
        email: trimmedEmail,
        password,
      });
      onAuthenticated(res.user);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Sign in failed. Please verify your credentials.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050B16] text-slate-100 flex flex-col justify-between relative overflow-hidden">
      {/* Subtle Ambient Background Glow */}
      <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
        <div className="absolute -top-32 left-1/3 w-[34rem] h-[22rem] rounded-full bg-blue-600/15 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[28rem] h-[18rem] rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-blue-400/15 bg-[#050B16]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigatePublic('home')}
            className="focus:outline-none cursor-pointer"
          >
            <KavachLogo size="sm" />
          </button>
          <button
            type="button"
            onClick={() => onNavigatePublic('home')}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Homepage
          </button>
        </div>
      </header>

      {/* Main Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl bg-[#0A1428]/90 border border-blue-400/20 shadow-[0_24px_60px_rgba(2,6,23,0.8)] backdrop-blur-xl p-6 sm:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              {mode === 'signup'
                ? 'Create Your KAVACH Account'
                : mode === 'reset'
                  ? 'Password Reset & Recovery'
                  : 'Sign In to KAVACH'}
            </h1>
            <p className="mt-1.5 text-sm text-slate-400">
              {mode === 'signup'
                ? 'Save cases permanently, organize evidence, and track status history securely.'
                : mode === 'reset'
                  ? 'Check password recovery options for your registered email address.'
                  : 'Access your private Citizen Dashboard, saved cases, and evidence records.'}
            </p>
          </div>

          {redirectNotice && mode !== 'reset' && (
            <div className="mb-5 rounded-xl bg-blue-950/60 border border-blue-400/30 px-4 py-3 text-xs text-blue-200 flex items-start gap-2.5">
              <Lock className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>{redirectNotice}</span>
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="mb-5 rounded-xl bg-red-950/60 border border-red-500/40 px-4 py-3 text-xs sm:text-sm text-red-200 flex items-start gap-2.5"
            >
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {resetStatus && (
            <div
              className={`mb-5 rounded-xl px-4 py-3 text-xs sm:text-sm flex items-start gap-2.5 ${
                resetStatus.type === 'success'
                  ? 'bg-emerald-950/50 border border-emerald-500/40 text-emerald-200'
                  : 'bg-amber-950/50 border border-amber-500/40 text-amber-100'
              }`}
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-cyan-300" />
              <span>{resetStatus.message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    autoComplete="name"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#060D1B] border border-slate-700/90 focus:border-cyan-400 focus:outline-none text-sm text-white placeholder:text-slate-500"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#060D1B] border border-slate-700/90 focus:border-cyan-400 focus:outline-none text-sm text-white placeholder:text-slate-500"
                  required
                />
              </div>
            </div>

            {mode !== 'reset' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Password
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => switchMode('reset')}
                      className="text-xs text-cyan-400 hover:text-cyan-300 cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <KeyRound className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? 'Minimum 8 characters' : 'Enter your password'}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#060D1B] border border-slate-700/90 focus:border-cyan-400 focus:outline-none text-sm text-white placeholder:text-slate-500"
                    required
                  />
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#060D1B] border border-slate-700/90 focus:border-cyan-400 focus:outline-none text-sm text-white placeholder:text-slate-500"
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-60 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 border border-cyan-300/25 transition-all cursor-pointer"
            >
              {submitting
                ? 'Processing...'
                : mode === 'signup'
                  ? 'Create Account & Continue'
                  : mode === 'reset'
                    ? 'Check Password Recovery'
                    : 'Sign In'}
              {!submitting && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          {/* Switch Mode Footer */}
          <div className="mt-6 pt-5 border-t border-slate-800/90 text-center text-xs sm:text-sm text-slate-400">
            {mode === 'signin' && (
              <p>
                New to KAVACH?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="text-cyan-300 hover:text-cyan-200 font-semibold cursor-pointer"
                >
                  Create an account
                </button>
              </p>
            )}
            {mode === 'signup' && (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="text-cyan-300 hover:text-cyan-200 font-semibold cursor-pointer"
                >
                  Sign In
                </button>
              </p>
            )}
            {mode === 'reset' && (
              <p>
                Remembered your password?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="text-cyan-300 hover:text-cyan-200 font-semibold cursor-pointer"
                >
                  Return to Sign In
                </button>
              </p>
            )}
          </div>
        </div>
      </main>

      <footer className="relative z-10 py-4 text-center text-xs text-slate-500">
        Your cases and evidence notes are stored privately under your KAVACH account.
      </footer>
    </div>
  );
}
