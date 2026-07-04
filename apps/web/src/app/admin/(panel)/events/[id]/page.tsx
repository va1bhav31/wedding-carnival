import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { updateEvent } from '@/lib/actions/events';

type Theme = { primary?: string; accent?: string; secondary?: string; logo?: string };

export default async function EditEvent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: w } = await supabase.from('weddings').select('*').eq('id', id).single();
  if (!w) notFound();

  const theme = (w.theme ?? {}) as Theme;
  const bride = w.bride_name || w.couple_name_1 || '';
  const groom = w.groom_name || w.couple_name_2 || '';

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
