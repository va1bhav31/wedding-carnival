'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getWeddingBySlug } from '@/lib/weddings';
import { guestCookieName } from '@/lib/guest-cookie';

const TEAMS = ['bride', 'groom'] as const;

function str(v: FormDataEntryValue | null): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** Guest joins a wedding → creates a player profile (writes to `guests`). */
export async function joinWedding(formData: FormData) {
  const slug = str(formData.get('slug'));
  const name = str(formData.get('name'));
  const nickname = str(formData.get('nickname'));
  const team = str(formData.get('team'));

  if (!slug) throw new Error('Missing wedding.');
  const wedding = await getWeddingBySlug(slug);
  if (!wedding) throw new Error('Wedding not found.');
  if (wedding.status !== 'live') redirect(`/${slug}`);
  if (!name) throw new Error('Please enter your name.');

  const teamValue = (TEAMS as readonly string[]).includes(team) ? team : null;

  // Guest write uses the anon key — RLS allows anyone to join.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('guests')
    .insert({
      wedding_id: wedding.id,
      name,
      nickname: nickname || null,
      team: teamValue,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  const cookieStore = await cookies();
  cookieStore.set(guestCookieName(wedding.id), data.id, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: 'lax',
  });

  redirect(`/${slug}/play`);
}
