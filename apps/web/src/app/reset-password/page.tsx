'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const inputCls =
  'w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 outline-none focus:border-fuchsia-400';

export default function ResetPassword() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        if (mounted) setReady(true);
        return;
      }
      // PKCE flow: exchange the ?code= param for a session.
      const code = new URLSearchParams(window.location.search).get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error && mounted) setReady(true);
      }
    })();

    // Implicit (hash) flow fires PASSWORD_RECOVERY / SIGNED_IN once processed.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session && mounted) setReady(true);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

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
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(
        /session/i.test(error.message)
          ? 'This reset link is invalid or has expired. Request a new one from the login page.'
          : error.message
      );
      return;
    }
    setDone(true);
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-gradient-to-br from-pink-50 to-fuchsia-100 p-6">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-xl">
        <h1 className="text-2xl font-semibold text-fuchsia-700">Set a new password</h1>

        {done ? (
          <>
            <p className="mb-6 mt-2 text-sm text-gray-600">
              Your password has been updated. You can sign in now.
            </p>
            <Link
              href="/admin/login"
              className="block w-full rounded-full bg-fuchsia-600 py-3 text-center font-semibold text-white hover:bg-fuchsia-700"
            >
              Go to login
            </Link>
          </>
        ) : (
          <form onSubmit={onSubmit}>
            <p className="mb-6 mt-1 text-sm text-gray-500">
              {ready ? 'Enter a new password for your account.' : 'Verifying your reset link…'}
            </p>

            <label className="mb-1 block text-sm font-medium text-gray-800">New password</label>
            <input
              type="password"
              required
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
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
