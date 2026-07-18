import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { GAME_CATALOG } from '@/lib/games-catalog';
import { setGameEnabled, loadDefaultContent } from '@/lib/actions/games';

type GameRow = { id: string; game_type: string; status: string; is_enabled: boolean; title: string | null };

const STATUS_STYLES: Record<string, string> = {
  locked: 'bg-gray-100 text-gray-500',
  live: 'bg-green-100 text-green-700',
  ended: 'bg-purple-100 text-purple-700',
};

export default async function GamesList({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: wedding } = await supabase
    .from('weddings')
    .select('id, slug, bride_name, groom_name, couple_name_1, couple_name_2')
    .eq('id', id)
    .maybeSingle();
  if (!wedding) notFound();

  const { data: rows } = await supabase
    .from('wedding_games')
    .select('id, game_type, status, is_enabled, title')
    .eq('wedding_id', id);

  const byType = new Map<string, GameRow>((rows ?? []).map((r) => [r.game_type, r as GameRow]));
  const bride = wedding.bride_name || wedding.couple_name_1;
  const groom = wedding.groom_name || wedding.couple_name_2;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/admin/events/${id}`} className="text-sm text-gray-500 hover:text-fuchsia-600">
        ← Back to event
      </Link>
      <h1 className="mb-1 mt-3 text-2xl font-semibold text-gray-900">Games</h1>
      <p className="mb-4 text-sm text-gray-500">
        {bride} &amp; {groom} — enable the games this wedding gets, then add their content.
      </p>

      <form
        action={loadDefaultContent}
        className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-fuchsia-100 bg-fuchsia-50/60 p-4"
      >
        <input type="hidden" name="wedding_id" value={id} />
        <p className="min-w-0 text-sm text-gray-600">
          Pre-fill every game with the default questions &amp; content. Safe to run — it
          only fills in games that are still empty.
        </p>
        <button className="shrink-0 rounded-full bg-fuchsia-600 px-5 py-2 text-sm font-semibold text-white hover:bg-fuchsia-700">
          Load default content
        </button>
      </form>

      <ul className="grid gap-3">
        {GAME_CATALOG.map((g) => {
          const row = byType.get(g.type);
          const enabled = Boolean(row?.is_enabled);
          return (
            <li
              key={g.type}
              className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="text-2xl">{g.emoji}</span>
                <div className="min-w-0">
                  <div className="truncate font-semibold text-gray-900">{row?.title || g.label}</div>
                  <div className="truncate text-xs text-gray-500">{g.description}</div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {enabled && row && (
                  <>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                        STATUS_STYLES[row.status] ?? 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {row.status}
                    </span>
                    {g.content !== 'arcade' && (
                      <Link
                        href={`/admin/events/${id}/games/${row.id}`}
                        className="rounded-full bg-fuchsia-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-fuchsia-700"
                      >
                        Manage
                      </Link>
                    )}
                  </>
                )}
                <form action={setGameEnabled}>
                  <input type="hidden" name="wedding_id" value={id} />
                  <input type="hidden" name="game_type" value={g.type} />
                  <input type="hidden" name="enabled" value={enabled ? 'false' : 'true'} />
                  <button
                    className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
                      enabled
                        ? 'border-gray-200 text-gray-600 hover:bg-gray-100'
                        : 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100'
                    }`}
                  >
                    {enabled ? 'Disable' : 'Enable'}
                  </button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
