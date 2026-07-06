import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionUser, canManageWedding } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { GAME_BY_TYPE } from '@/lib/games-catalog';
import { setWeddingStatus } from '@/lib/actions/events';
import { setGameStatus } from '@/lib/actions/games';

const GAME_STATUS_STYLES: Record<string, string> = {
  locked: 'bg-gray-100 text-gray-500',
  live: 'bg-green-100 text-green-700',
  ended: 'bg-purple-100 text-purple-700',
};

export default async function HostEvent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!(await canManageWedding(id, user))) notFound();

  const supabase = createAdminClient();
  const { data: w } = await supabase
    .from('weddings')
    .select('id, slug, bride_name, groom_name, couple_name_1, couple_name_2, status')
    .eq('id', id)
    .maybeSingle();
  if (!w) notFound();

  const { data: games } = await supabase
    .from('wedding_games')
    .select('id, game_type, title, status')
    .eq('wedding_id', id)
    .eq('is_enabled', true)
    .order('display_order');

  const bride = w.bride_name || w.couple_name_1;
  const groom = w.groom_name || w.couple_name_2;
  const gameList = games ?? [];
  const isLive = w.status === 'live';

  return (
    <div>
      <Link href="/host" className="text-sm text-gray-500 hover:text-fuchsia-600">
        ← Your weddings
      </Link>
      <div className="mb-6 mt-3 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">
          {bride} &amp; {groom}
        </h1>
        <a href={`/${w.slug}`} target="_blank" rel="noreferrer" className="text-sm text-fuchsia-600 hover:underline">
          Guest page ↗
        </a>
      </div>

      {/* Master switch */}
      <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Carnival status</h2>
            <p className="text-sm text-gray-500">
              {isLive ? 'Guests can join and play right now.' : 'Guests see a “coming soon” screen.'}
            </p>
          </div>
          <form action={setWeddingStatus}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="status" value={isLive ? 'ended' : 'live'} />
            <button
              className={`rounded-full px-6 py-2.5 font-semibold text-white ${
                isLive ? 'bg-gray-800 hover:bg-black' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isLive ? '⏸ Pause Carnival' : '▶ Go live'}
            </button>
          </form>
        </div>
      </div>

      {/* Games */}
      <h2 className="mb-3 font-semibold text-gray-900">Games</h2>
      {gameList.length === 0 ? (
        <p className="text-sm text-gray-500">No games set up yet — your Wedding Carnival team will add these.</p>
      ) : (
        <ul className="grid gap-3">
          {gameList.map((g) => {
            const meta = GAME_BY_TYPE[g.game_type];
            const live = g.status === 'live';
            return (
              <li key={g.id} className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{meta?.emoji ?? '🎮'}</span>
                  <div>
                    <div className="font-semibold text-gray-900">{g.title || meta?.label}</div>
                    <span className={`text-xs font-semibold capitalize ${GAME_STATUS_STYLES[g.status]?.replace(/bg-[^ ]+/, '') ?? ''}`}>
                      {g.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <form action={setGameStatus}>
                    <input type="hidden" name="wedding_id" value={id} />
                    <input type="hidden" name="game_id" value={g.id} />
                    <input type="hidden" name="status" value={live ? 'locked' : 'live'} />
                    <button
                      className={`rounded-full px-4 py-1.5 text-sm font-semibold text-white ${
                        live ? 'bg-gray-700 hover:bg-gray-900' : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {live ? 'Pause' : 'Start'}
                    </button>
                  </form>
                  <Link
                    href={`/host/events/${id}/games/${g.id}`}
                    className="rounded-full bg-fuchsia-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-fuchsia-700"
                  >
                    Manage
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
