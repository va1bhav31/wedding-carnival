import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Returns the signed-in user IF they are on the admin allowlist, else null.
 * Uses getUser() (verifies the JWT with Supabase), not just the session cookie.
 */
export async function getAdminUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;
  return adminEmails().includes(user.email.toLowerCase()) ? user : null;
}

/**
 * For Server Components/Actions: ensures an admin, or redirects/throws.
 * Server Actions are reachable via direct POST, so every mutating action
 * must call this itself (Next 16 data-security guidance).
 */
export async function requireAdmin(): Promise<User> {
  const user = await getAdminUser();
  if (!user) redirect('/admin/login');
  return user;
}
