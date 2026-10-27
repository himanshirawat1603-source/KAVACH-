import { FormEvent, useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Database,
  KeyRound,
  LogOut,
  Save,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { KavachUser } from '../types/incident';
import {
  fetchSystemArchitecture,
  SystemArchitectureInfo,
  updateAccountProfile,
} from '../utils/apiClient';

interface ProfileSettingsViewProps {
  user: KavachUser;
  onUserUpdated: (user: KavachUser) => void;
  onSignOut: () => void;
}

export function ProfileSettingsView({
  user,
  onUserUpdated,
  onSignOut,
}: ProfileSettingsViewProps) {
  const [name, setName] = useState(user.name);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [copiedUserId, setCopiedUserId] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [archInfo, setArchInfo] = useState<SystemArchitectureInfo | null>(null);

  useEffect(() => {
    fetchSystemArchitecture()
      .then(setArchInfo)
      .catch(() => setArchInfo(null));
  }, []);

  const handleCopyUserId = () => {
    navigator.clipboard?.writeText(user.id);
    setCopiedUserId(true);
    setTimeout(() => setCopiedUserId(false), 1800);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (name.trim().length < 2) {
      setMessage({ type: 'error', text: 'Display name must be at least 2 characters.' });
      return;
    }
    if (newPassword && newPassword.length < 8) {
      setMessage({ type: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }

    setSaving(true);
    try {
      const res = await updateAccountProfile({
        name: name.trim(),
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });
      onUserUpdated(res.user);
      setCurrentPassword('');
      setNewPassword('');
      setMessage({
        type: 'success',
        text: newPassword
          ? 'Profile name and password updated.'
          : 'Account profile updated.',
      });
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to update profile.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <span className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
          Account & Security Controls
        </span>
        <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Profile and Settings
        </h1>
      </div>

      {/* User Identity Card */}
      <div className="rounded-2xl bg-[#0A1428]/90 border border-blue-400/20 p-6 sm:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-blue-600/25 border border-cyan-400/30 flex items-center justify-center text-cyan-300 font-bold text-lg">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{user.name}</h2>
              <p className="text-xs sm:text-sm text-slate-400">{user.email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-950/45 hover:bg-red-900/55 border border-red-500/35 text-xs font-semibold text-red-200 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="rounded-xl bg-[#060D1B] border border-slate-800 p-4">
            <span className="text-slate-400 block">Unique User ID</span>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <span className="font-mono text-sm font-bold text-cyan-300">{user.id}</span>
              <button
                type="button"
                onClick={handleCopyUserId}
                className="text-slate-400 hover:text-white cursor-pointer"
                title="Copy User ID"
              >
                {copiedUserId ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-[#060D1B] border border-slate-800 p-4">
            <span className="text-slate-400 block">Account Role</span>
            <span className="mt-1.5 block font-semibold text-white capitalize">
              {user.role === 'citizen' ? 'Private Citizen Account' : user.role}
            </span>
          </div>

          <div className="rounded-xl bg-[#060D1B] border border-slate-800 p-4">
            <span className="text-slate-400 block">Member Since</span>
            <span className="mt-1.5 block font-semibold text-white">
              {new Date(user.createdAt).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: '2-digit',
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Edit Profile & Change Password */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-[#0A1428]/90 border border-blue-400/20 p-6 sm:p-8 space-y-5"
      >
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-cyan-400" />
          Update Profile & Password
        </h2>

        {message && (
          <div
            className={`rounded-xl px-4 py-3 text-xs sm:text-sm flex items-center gap-2.5 ${
              message.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-200'
                : 'bg-red-950/60 border border-red-500/40 text-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#060D1B] border border-slate-700 focus:border-cyan-400 focus:outline-none text-sm text-white"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Registered Email (Read-Only)
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full px-4 py-2.5 rounded-xl bg-[#060D1B]/60 border border-slate-800 text-sm text-slate-400 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5 text-cyan-400" />
            Change Password (Optional)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Required only if setting a new password"
                autoComplete="current-password"
                className="w-full px-4 py-2.5 rounded-xl bg-[#060D1B] border border-slate-700 text-sm text-white placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                className="w-full px-4 py-2.5 rounded-xl bg-[#060D1B] border border-slate-700 text-sm text-white placeholder:text-slate-500"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-semibold cursor-pointer"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Account Settings'}
        </button>
      </form>

      {/* Transparent Storage & Privacy Disclosure */}
      <div className="rounded-2xl bg-[#0A1428]/85 border border-slate-800 p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-cyan-400" />
          <h2 className="text-base font-bold text-white">
            Data Persistence, Isolation & Security Transparency
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
          <div className="rounded-xl bg-[#060D1B] border border-slate-800 p-3.5">
            <span className="font-semibold text-white block">Database Storage</span>
            <span className="text-slate-400 mt-1 block">
              {archInfo?.databaseEngine ||
                'Server-side SQLite database (kavach.sqlite) linked strictly to your Unique User ID.'}
            </span>
          </div>
          <div className="rounded-xl bg-[#060D1B] border border-slate-800 p-3.5">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              User Data Isolation
            </span>
            <span className="text-slate-400 mt-1 block">
              All case queries enforce server-side ownership checks. Other users cannot view, edit,
              or delete your cases.
            </span>
          </div>
        </div>

        {archInfo?.externalConfigNotes && (
          <ul className="text-xs text-slate-400 space-y-1.5 pt-2">
            {archInfo.externalConfigNotes.map((note, idx) => (
              <li key={idx}>• {note}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
