import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { User } from '@supabase/supabase-js';

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperAdmin(user: User | null): boolean {
  return Boolean(user?.email && adminEmails().includes(user.email.toLowerCase()));
}

/** Any signed-in Supabase Auth user (verified via getUser). */
export async function getSessionUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

/* ---------------- Super-admin (us) ---------------- */

export async function getAdminUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isSuperAdmin(user)) return null;

  // If the admin has enrolled an authenticator, require the 2FA step-up to
  // be completed (session must be AAL2). Admins without a factor pass through.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') return null;

  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await getAdminUser();
  if (!user) redirect('/admin/login');
  return user;
}

/* ---------------- Host (couple) ---------------- */

/** For host portal layouts — any logged-in user, else send to host login. */
export async function requireHostSession(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect('/host/login');
  return user;
}

/** True if the user owns this wedding (or is a super-admin). */
export async function canManageWedding(weddingId: string, user: User | null): Promise<boolean> {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('weddings')
    .select('host_user_id')
    .eq('id', weddingId)
    .maybeSingle();
  return Boolean(data && data.host_user_id === user.id);
}

/**
 * Guard for mutating actions — allows a super-admin OR the wedding's host.
 * Every management Server Action calls this (actions are POST-reachable).
 */
export async function assertCanManage(weddingId: string): Promise<User> {
  const user = await getSessionUser();
  if (!weddingId) throw new Error('Missing wedding.');
  if (!(await canManageWedding(weddingId, user))) {
    throw new Error('Not authorized to manage this event.');
  }
  return user as User;
}
