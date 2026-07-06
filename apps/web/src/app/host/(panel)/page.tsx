import Link from 'next/link';
import { getSessionUser, isSuperAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  ready: 'bg-amber-100 text-amber-700',
  live: 'bg-green-100 text-green-700',
  ended: 'bg-purple-100 text-purple-700',
};

export default async function HostHome() {
  const user = await getSessionUser();
  const supabase = createAdminClient();

  let query = supabase
    .from('weddings')
    .select('id, slug, bride_name, groom_name, couple_name_1, couple_name_2, status')
    .order('created_at', { ascending: false });
  // Hosts only see their own weddings; super-admins see all.
  if (!isSuperAdmin(user)) query = query.eq('host_user_id', user!.id);

  const { data } = await query;
  const list = data ?? [];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Your weddings</h1>
      <p className="mb-6 text-sm text-gray-500">Run your Carnival — start games, launch questions, edit content.</p>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
          No wedding is linked to your account yet. Your Wedding Carnival team will set this up for you.
        </div>
      ) : (
        <ul className="grid gap-3">
          {list.map((w) => {
            const bride = w.bride_name || w.couple_name_1;
            const groom = w.groom_name || w.couple_name_2;
            return (
              <li key={w.id}>
                <Link
                  href={`/host/events/${w.id}`}
                  className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-fuchsia-300 hover:shadow-sm"
                >
                  <div>
                    <div className="font-semibold text-gray-900">
                      {bride} &amp; {groom}
                    </div>
                    <div className="text-sm text-gray-500">/{w.slug}</div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[w.status] ?? 'bg-gray-100 text-gray-600'}`}>
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
