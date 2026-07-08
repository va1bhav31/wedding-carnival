import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { updateEvent, setHostByEmail, unlinkHost } from '@/lib/actions/events';
import { HOST_PW_COOKIE } from '@/lib/host-cookie';

type Theme = { primary?: string; accent?: string; secondary?: string; logo?: string };

export default async function EditEvent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ host?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = createAdminClient();
  const { data: w } = await supabase.from('weddings').select('*').eq('id', id).single();
  if (!w) notFound();

  const theme = (w.theme ?? {}) as Theme;
  const bride = w.bride_name || w.couple_name_1 || '';
  const groom = w.groom_name || w.couple_name_2 || '';

  // Current host (if linked) + one-time temp password after creating one.
  let hostEmail: string | null = null;
  if (w.host_user_id) {
    const { data: hostUser } = await supabase.auth.admin.getUserById(w.host_user_id);
    hostEmail = hostUser?.user?.email ?? null;
  }
  let tempPassword: string | null = null;
  if (sp.host === 'created') {
    const cookieStore = await cookies();
    tempPassword = cookieStore.get(HOST_PW_COOKIE)?.value ?? null;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin" className="text-sm text-gray-500 hover:text-fuchsia-600">
        ← Back to events
      </Link>
      <div className="mb-6 mt-3 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {bride} &amp; {groom}
        </h1>
        <a
          href={`https://weddingcarnival.live/${w.slug}`}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-fuchsia-600 hover:underline"
        >
          View guest page ↗
        </a>
      </div>

      <form action={updateEvent} className="grid gap-6">
        <input type="hidden" name="id" value={w.id} />

        {/* Details */}
        <section className="grid gap-5 rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="font-semibold">Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Bride name *" name="bride_name" defaultValue={bride} required />
            <Field label="Groom name *" name="groom_name" defaultValue={groom} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Slug *" name="slug" defaultValue={w.slug} required />
            <div>
              <label className="mb-1 block text-sm font-medium">Status</label>
              <select
                name="status"
                defaultValue={w.status}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-fuchsia-400"
              >
                <option value="draft">Draft</option>
                <option value="ready">Ready</option>
                <option value="live">Live</option>
                <option value="ended">Ended</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Welcome message</label>
            <textarea
              name="welcome_message"
              rows={3}
              defaultValue={w.welcome_message ?? ''}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-fuchsia-400"
            />
          </div>
        </section>

        {/* Branding */}
        <section className="grid gap-5 rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="font-semibold">Branding</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <ColorField label="Primary" name="primary" defaultValue={theme.primary ?? '#FB4FA8'} />
            <ColorField label="Accent" name="accent" defaultValue={theme.accent ?? '#F4D71E'} />
            <ColorField label="Secondary" name="secondary" defaultValue={theme.secondary ?? '#8B3FB0'} />
          </div>
          <Field
            label="Logo URL"
            name="logo_url"
            defaultValue={theme.logo ?? ''}
            placeholder="https://…/logo.png"
          />
        </section>

        {/* Memory Garden */}
        <section className="grid gap-5 rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="font-semibold">Memory Garden</h2>
          <Field
            label="Flower goal"
            name="garden_goal"
            type="number"
            defaultValue={String(w.garden_goal ?? 250)}
          />
        </section>

        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/admin/events/${w.id}/games`}
            className="rounded-full border border-fuchsia-200 bg-fuchsia-50 px-5 py-2.5 font-semibold text-fuchsia-700 transition hover:bg-fuchsia-100"
          >
            🎮 Manage games &amp; content
          </Link>
          <button className="rounded-full bg-fuchsia-600 px-6 py-2.5 font-semibold text-white transition hover:bg-fuchsia-700">
            Save changes
          </button>
        </div>
      </form>

      {/* Host access */}
      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="font-semibold text-gray-900">Host access</h2>
        <p className="mb-4 text-sm text-gray-500">
          Give the couple their own portal at{' '}
          <code className="rounded bg-gray-100 px-1">app.weddingcarnival.live/host</code>. Entering a
          new email creates their login automatically.
        </p>

        {sp.host === 'linked' && (
          <div className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">Host linked ✓</div>
        )}
        {sp.host === 'cleared' && (
          <div className="mb-4 rounded-xl bg-gray-100 p-3 text-sm text-gray-600">Host unlinked.</div>
        )}
        {sp.host === 'created' && (
          <div className="mb-4 rounded-xl bg-green-50 p-4 text-sm text-green-800">
            <p className="font-semibold">Host account created ✓</p>
            {tempPassword ? (
              <p className="mt-1">
                Temporary password:{' '}
                <code className="rounded bg-white px-2 py-0.5 font-mono">{tempPassword}</code>
                <br />
                Share it securely with the couple — they can change it after signing in.{' '}
                <em>(Shown once.)</em>
              </p>
            ) : (
              <p className="mt-1">Share their login details with the couple.</p>
            )}
          </div>
        )}

        {hostEmail ? (
          <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
            <span className="text-gray-900">🔑 {hostEmail}</span>
            <form action={unlinkHost}>
              <input type="hidden" name="id" value={w.id} />
              <button className="text-sm text-gray-500 hover:text-red-500">Unlink</button>
            </form>
          </div>
        ) : (
          <form action={setHostByEmail} className="flex gap-3">
            <input type="hidden" name="id" value={w.id} />
            <input
              name="host_email"
              type="email"
              required
              placeholder="couple@example.com"
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-gray-900 outline-none focus:border-fuchsia-400"
            />
            <button className="rounded-full bg-fuchsia-600 px-5 py-2.5 font-semibold text-white hover:bg-fuchsia-700">
              Link host
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  required,
  type = 'text',
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-fuchsia-400"
      />
    </div>
  );
}

function ColorField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-2 py-1.5">
        <input
          type="color"
          defaultValue={defaultValue}
          name={name}
          className="h-9 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
        />
        <span className="text-xs text-gray-500">{defaultValue}</span>
      </div>
    </div>
  );
}
