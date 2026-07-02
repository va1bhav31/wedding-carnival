import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client — **server-only**.
 *
 * Uses the secret key, which BYPASSES Row-Level Security. Only ever import
 * this from server code (Server Actions / Route Handlers) and only after
 * verifying the caller is an admin (see `requireAdmin`). Never expose it to
 * the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
  }
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
