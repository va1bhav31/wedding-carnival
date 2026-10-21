import { Resend } from 'resend';

const FROM = process.env.RESEND_FROM_EMAIL || 'Wedding Carnival <noreply@weddingcarnival.live>';

type SendResult = { sent: true } | { sent: false; reason: string };

/**
 * Emails a couple their host-portal access. `setupLink` is a one-time
 * Supabase recovery link (new account, sets their own password); omit it
 * for an existing account that's just been linked to another wedding.
 */
export async function sendHostAccessEmail(params: {
  to: string;
  coupleLabel: string;
  setupLink?: string;
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: 'RESEND_API_KEY not configured' };

  const { to, coupleLabel, setupLink } = params;

  const html = setupLink
    ? `<p>Hi ${coupleLabel},</p>
       <p>You've been given host access to your Wedding Carnival. Set your password to get started:</p>
       <p><a href="${setupLink}">Set your password</a></p>
       <p>Once that's done, sign in any time at <a href="https://app.weddingcarnival.live/host">app.weddingcarnival.live/host</a>.</p>`
    : `<p>Hi ${coupleLabel},</p>
       <p>Your existing Wedding Carnival login now also has host access to this wedding.</p>
       <p>Sign in at <a href="https://app.weddingcarnival.live/host">app.weddingcarnival.live/host</a>.</p>`;

  // Never let a flaky email provider undo a database write that already
  // succeeded — always resolve to a result object, never throw.
  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({ from: FROM, to, subject: 'Your Wedding Carnival host access', html });
    if (error) return { sent: false, reason: error.message };
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: err instanceof Error ? err.message : 'Email send failed.' };
  }
}
