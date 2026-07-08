'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type Factor = { id: string; friendly_name?: string | null; status: string };
type Enroll = { factorId: string; qr: string; secret: string };

export default function SecurityPage() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [loading, setLoading] = useState(true);
  const [enroll, setEnroll] = useState<Enroll | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors((data?.totp ?? []) as Factor[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function startEnroll() {
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setEnroll({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function verifyEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!enroll) return;
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enroll.factorId,
      code: code.trim(),
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setEnroll(null);
    setCode('');
    load();
  }

  async function remove(id: string) {
    setBusy(true);
    const supabase = createClient();
    await supabase.auth.mfa.unenroll({ factorId: id });
    setBusy(false);
    load();
  }

  const verified = factors.filter((f) => f.status === 'verified');

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/admin" className="text-sm text-gray-500 hover:text-fuchsia-600">
        ← Back to admin
      </Link>
      <h1 className="mb-1 mt-3 text-2xl font-semibold text-gray-900">Security · Two-factor auth</h1>
      <p className="mb-6 text-sm text-gray-500">
        Protect your admin login with an authenticator app (Google Authenticator, Authy, 1Password…).
        Once enabled, you&apos;ll enter a 6-digit code after your password.
      </p>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <div className="grid gap-4">
          {/* Enrolled factors */}
          {verified.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="mb-3 font-semibold text-gray-900">Active</h2>
              <ul className="grid gap-2">
                {verified.map((f) => (
                  <li key={f.id} className="flex items-center justify-between rounded-xl bg-green-50 px-4 py-3">
                    <span className="font-medium text-green-800">🔐 Authenticator enabled</span>
                    <button
                      onClick={() => remove(f.id)}
                      disabled={busy}
                      className="text-sm text-gray-500 hover:text-red-500"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Enrollment */}
          {enroll ? (
            <form onSubmit={verifyEnroll} className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="font-semibold text-gray-900">Scan this in your authenticator app</h2>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={enroll.qr} alt="2FA QR code" className="mx-auto h-48 w-48" />
              <p className="text-center text-xs text-gray-500">
                Can&apos;t scan? Enter this key manually:
                <br />
                <code className="rounded bg-gray-100 px-2 py-0.5 font-mono text-gray-800">{enroll.secret}</code>
              </p>
              <label className="text-sm font-medium text-gray-800">Enter the 6-digit code to confirm</label>
              <input
                inputMode="numeric"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                placeholder="000000"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-center text-2xl tracking-[0.4em] text-gray-900 outline-none focus:border-fuchsia-400"
              />
              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEnroll(null)}
                  className="rounded-full px-5 py-2.5 font-medium text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  disabled={busy}
                  className="rounded-full bg-fuchsia-600 px-6 py-2.5 font-semibold text-white hover:bg-fuchsia-700 disabled:opacity-60"
                >
                  {busy ? 'Verifying…' : 'Confirm & enable'}
                </button>
              </div>
            </form>
          ) : (
            verified.length === 0 && (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center">
                <p className="mb-4 text-gray-600">Two-factor authentication is not set up yet.</p>
                {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
                <button
                  onClick={startEnroll}
                  disabled={busy}
                  className="rounded-full bg-fuchsia-600 px-6 py-2.5 font-semibold text-white hover:bg-fuchsia-700 disabled:opacity-60"
                >
                  {busy ? 'Starting…' : 'Enable authenticator 2FA'}
                </button>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
