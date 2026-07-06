'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin, assertCanManage } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { slugify } from '@/lib/slug';

const STATUSES = ['draft', 'ready', 'live', 'ended'] as const;

/** Start/pause the whole event. Allowed for the host (or super-admin). */
export async function setWeddingStatus(formData: FormData) {
  const id = typeof formData.get('id') === 'string' ? (formData.get('id') as string).trim() : '';
  const status = typeof formData.get('status') === 'string' ? (formData.get('status') as string).trim() : '';
  await assertCanManage(id);
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) throw new Error('Invalid status.');

  const supabase = createAdminClient();
  const { error } = await supabase.from('weddings').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath(`/host/events/${id}`);
  revalidatePath(`/admin/events/${id}`);
}

function str(v: FormDataEntryValue | null): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** Create a new event (wedding). Admin-only. */
export async function createEvent(formData: FormData) {
  await requireAdmin();
  const supabase = createAdminClient();

  const bride = str(formData.get('bride_name'));
  const groom = str(formData.get('groom_name'));
  const slugInput = str(formData.get('slug'));
  const welcome = str(formData.get('welcome_message'));

  if (!bride || !groom) throw new Error('Bride and groom names are required.');

  const slug = slugify(slugInput || `${bride}-${groom}`);
  if (!slug) throw new Error('Could not derive a valid slug.');

  const { data, error } = await supabase
    .from('weddings')
    .insert({
      slug,
      couple_name_1: bride,
      couple_name_2: groom,
      bride_name: bride,
      groom_name: groom,
      welcome_message: welcome || null,
      status: 'draft',
      theme: { primary: '#FB4FA8', accent: '#F4D71E', secondary: '#8B3FB0' },
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') throw new Error(`The slug "${slug}" is already taken.`);
    throw new Error(error.message);
  }

  revalidatePath('/admin');
  redirect(`/admin/events/${data.id}`);
}

/** Update an event's details + branding. Admin-only. */
export async function updateEvent(formData: FormData) {
  await requireAdmin();
  const supabase = createAdminClient();

  const id = str(formData.get('id'));
  if (!id) throw new Error('Missing event id.');

  const bride = str(formData.get('bride_name'));
  const groom = str(formData.get('groom_name'));
  const slug = slugify(str(formData.get('slug')));
  const welcome = str(formData.get('welcome_message'));
  const status = str(formData.get('status'));
  const gardenGoalRaw = str(formData.get('garden_goal'));

  const primary = str(formData.get('primary')) || '#FB4FA8';
  const accent = str(formData.get('accent')) || '#F4D71E';
  const secondary = str(formData.get('secondary')) || '#8B3FB0';
  const logoUrl = str(formData.get('logo_url'));

  if (!bride || !groom) throw new Error('Bride and groom names are required.');
  if (!slug) throw new Error('A valid slug is required.');
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) {
    throw new Error('Invalid status.');
  }

  const gardenGoal = Number.parseInt(gardenGoalRaw, 10);

  const theme: Record<string, string> = { primary, accent, secondary };
  if (logoUrl) theme.logo = logoUrl;

  const { error } = await supabase
    .from('weddings')
    .update({
      slug,
      couple_name_1: bride,
      couple_name_2: groom,
      bride_name: bride,
      groom_name: groom,
      welcome_message: welcome || null,
      status,
      garden_goal: Number.isFinite(gardenGoal) && gardenGoal > 0 ? gardenGoal : 250,
      theme,
    })
    .eq('id', id);

  if (error) {
    if (error.code === '23505') throw new Error(`The slug "${slug}" is already taken.`);
    throw new Error(error.message);
  }

  revalidatePath('/admin');
  revalidatePath(`/admin/events/${id}`);
}
