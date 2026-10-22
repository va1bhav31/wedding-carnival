'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const inputCls =
  'w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 outline-none focus:border-fuchsia-400';

export default function SetPasswordForm({ mandatory }: { mandatory: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password,
      data: { must_change_password: false },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace('/host');
    router.refresh();
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-gradient-to-br from-pink-50 to-fuchsia-100 p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-xl">
        <h1 className="text-2xl font-semibold text-fuchsia-700">Set your password</h1>
        <p className="mb-6 mt-1 text-sm text-gray-500">
          {mandatory
            ? "You're signing in with a temporary password — choose your own to continue."
            : 'Choose a new password for your account.'}
        </p>

        <label className="mb-1 block text-sm font-medium text-gray-800">New password</label>
        <input
          type="password"
          required
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`mb-4 ${inputCls}`}
          placeholder="••••••••"
        />
        <label className="mb-1 block text-sm font-medium text-gray-800">Confirm password</label>
        <input
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={`mb-6 ${inputCls}`}
          placeholder="••••••••"
        />

        {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-fuchsia-600 py-3 font-semibold text-white transition hover:bg-fuchsia-700 disabled:opacity-60"
        >
          {loading ? 'Updating…' : 'Set password & continue'}
        </button>
      </form>
    </main>
  );
}
