'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}

export async function signOutHost() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/host/login');
}
