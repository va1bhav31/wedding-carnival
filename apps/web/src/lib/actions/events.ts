'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { requireAdmin, assertCanManage } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { slugify } from '@/lib/slug';
import { HOST_PW_COOKIE } from '@/lib/host-cookie';
import { seedDefaultContent } from '@/lib/default-content';

const STATUSES = ['draft', 'ready', 'live', 'ended'] as const;

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const arr = new Uint32Array(14);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join('');
}

/** Link a wedding to a host login by email — creates the account if it doesn't exist. Admin-only. */
export async function setHostByEmail(formData: FormData) {
  await requireAdmin();
  const id = str(formData.get('id'));
  const email = str(formData.get('host_email')).toLowerCase();
  if (!id) throw new Error('Missing event.');
  if (!email) throw new Error('Enter a host email.');

  const supabase = createAdminClient();

  // Find an existing auth user with this email.
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) throw new Error(listErr.message);
  const existing = list.users.find((u) => (u.email ?? '').toLowerCase() === email);

  let userId: string;
  let created = false;
  let tempPassword = '';

  if (existing) {
    userId = existing.id;
  } else {
    tempPassword = generatePassword();
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });
    if (createErr) throw new Error(createErr.message);
    userId = newUser.user.id;
    created = true;
  }

  const { error: updErr } = await supabase.from('weddings').update({ host_user_id: userId }).eq('id', id);
  if (updErr) throw new Error(updErr.message);

  if (created) {
    const cookieStore = await cookies();
    cookieStore.set(HOST_PW_COOKIE, tempPassword, { httpOnly: true, maxAge: 300, path: '/' });
  }

  revalidatePath(`/admin/events/${id}`);
  redirect(`/admin/events/${id}?host=${created ? 'created' : 'linked'}`);
}

/** Remove a wedding's host link. Admin-only. */
export async function unlinkHost(formData: FormData) {
  await requireAdmin();
  const id = str(formData.get('id'));
  if (!id) throw new Error('Missing event.');
  const supabase = createAdminClient();
  const { error } = await supabase.from('weddings').update({ host_user_id: null }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/events/${id}`);
  redirect(`/admin/events/${id}?host=cleared`);
}

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

  // Pre-load the event with all 8 games + the default content from the
  // product doc (games start locked; content is editable per wedding).
  await seedDefaultContent(supabase, data.id);

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
