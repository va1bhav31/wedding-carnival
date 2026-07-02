import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  ready: 'bg-amber-100 text-amber-700',
  live: 'bg-green-100 text-green-700',
  ended: 'bg-purple-100 text-purple-700',
};

type Wedding = {
  id: string;
  slug: string;
  bride_name: string | null;
  groom_name: string | null;
  couple_name_1: string;
  couple_name_2: string;
  status: string;
  created_at: string;
};

export default async function AdminDashboard() {
  const supabase = createAdminClient();
  const { data: weddings } = await supabase
    .from('weddings')
    .select('id, slug, bride_name, groom_name, couple_name_1, couple_name_2, status, created_at')
    .order('created_at', { ascending: false });

  const list = (weddings ?? []) as Wedding[];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Events</h1>
          <p className="text-sm text-gray-500">{list.length} wedding(s) provisioned</p>
        </div>
        <Link
          href="/admin/events/new"
          className="rounded-full bg-fuchsia-600 px-5 py-2.5 font-semibold text-white transition hover:bg-fuchsia-700"
        >
          + New event
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
          No events yet. Create your first wedding to get started.
        </div>
      ) : (
        <ul className="grid gap-3">
          {list.map((w) => {
            const bride = w.bride_name || w.couple_name_1;
            const groom = w.groom_name || w.couple_name_2;
            return (
              <li key={w.id}>
                <Link
                  href={`/admin/events/${w.id}`}
                  className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-fuchsia-300 hover:shadow-sm"
                >
                  <div>
                    <div className="font-semibold">
                      {bride} &amp; {groom}
                    </div>
                    <div className="text-sm text-gray-500">
                      /{w.slug} · {new Date(w.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                      STATUS_STYLES[w.status] ?? 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {w.status}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
