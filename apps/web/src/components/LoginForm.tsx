'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const inputCls =
  'w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 outline-none focus:border-fuchsia-400';

type Step = 'password' | 'totp' | 'forgot';

export default function LoginForm({
  redirectTo,
  title,
  subtitle,
}: {
  redirectTo: string;
  title: string;
  subtitle: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('password');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function finish() {
    router.replace(redirectTo);
    router.refresh();
  }

  async function onPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2') {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totp = factors?.totp?.find((f) => f.status === 'verified') ?? factors?.totp?.[0];
      if (totp) {
        setFactorId(totp.id);
        setStep('totp');
        setLoading(false);
        return;
      }
    }
    finish();
  }

  async function onTotp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: factorId!,
      code: code.trim(),
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    finish();
  }

  async function onForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  const heading =
    step === 'totp'
      ? 'Enter the 6-digit code from your authenticator app'
      : step === 'forgot'
        ? 'We’ll email you a password reset link'
        : subtitle;

  return (
    <main className="grid min-h-dvh place-items-center bg-gradient-to-br from-pink-50 to-fuchsia-100 p-6">
      <form
        onSubmit={step === 'password' ? onPassword : step === 'totp' ? onTotp : onForgot}
        className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-xl"
      >
        <h1 className="text-2xl font-semibold text-fuchsia-700">{title}</h1>
        <p className="mb-6 text-sm text-gray-500">{heading}</p>

        {step === 'password' && (
          <>
            <label className="mb-1 block text-sm font-medium text-gray-800">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`mb-4 ${inputCls}`}
              placeholder="you@example.com"
            />
            <label className="mb-1 block text-sm font-medium text-gray-800">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`mb-2 ${inputCls}`}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => {
                setStep('forgot');
                setError(null);
              }}
              className="mb-6 text-sm text-fuchsia-600 hover:underline"
            >
              Forgot password?
            </button>
          </>
        )}

        {step === 'totp' && (
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={`mb-6 text-center text-2xl tracking-[0.4em] ${inputCls}`}
            placeholder="000000"
            maxLength={6}
            autoFocus
          />
        )}

        {step === 'forgot' &&
          (sent ? (
            <p className="mb-6 rounded-lg bg-green-50 px-3 py-3 text-sm text-green-700">
              If an account exists for <strong>{email}</strong>, a reset link is on its way. Check your
              inbox.
            </p>
          ) : (
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`mb-6 ${inputCls}`}
              placeholder="you@example.com"
              autoFocus
            />
          ))}

        {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        {!(step === 'forgot' && sent) && (
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-fuchsia-600 py-3 font-semibold text-white transition hover:bg-fuchsia-700 disabled:opacity-60"
          >
            {loading
              ? 'Please wait…'
              : step === 'password'
                ? 'Sign in'
                : step === 'totp'
                  ? 'Verify'
                  : 'Send reset link'}
          </button>
        )}

        {step === 'forgot' && (
          <button
            type="button"
            onClick={() => {
              setStep('password');
              setSent(false);
              setError(null);
            }}
            className="mt-3 w-full text-sm text-gray-500 hover:text-fuchsia-600"
          >
            ← Back to sign in
          </button>
        )}
      </form>
    </main>
  );
}
