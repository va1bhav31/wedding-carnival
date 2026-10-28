import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getWeddingBySlug, coupleNames } from '@/lib/weddings';
import { guestCookieName } from '@/lib/guest-cookie';
import { guestBase } from '@/lib/guest-nav';
import PlayGamesList from '@/components/PlayGamesList';

export default async function PlayHub({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const w = await getWeddingBySlug(slug);
  if (!w) notFound();

  const base = await guestBase(slug);
  const cookieStore = await cookies();
  const guestId = cookieStore.get(guestCookieName(w.id))?.value;
  if (!guestId) redirect(`${base}/join`);

  const supabase = await createClient();
  const { data: guest } = await supabase
    .from('guests')
    .select('name, nickname, team, total_points')
    .eq('id', guestId)
    .maybeSingle();

  // Stale/invalid cookie (e.g. row deleted) → re-join.
  if (!guest) redirect(`/${slug}/join`);

  const { data: games } = await supabase
    .from('wedding_games')
    .select('id, game_type, title, status, display_order')
    .eq('wedding_id', w.id)
    .eq('is_enabled', true)
    .order('display_order');

  const { bride, groom } = coupleNames(w);
  const displayName = guest.nickname || guest.name;
  const sideName = guest.team === 'bride' ? bride : guest.team === 'groom' ? groom : null;

  return (
    <>
      <header className="topbar">
        <p className="couple">
          {bride} <span className="amp">&amp;</span> {groom}
        </p>
        <Link className="me-pill" href={`${base}/leaderboard`}>
          <span>{displayName}</span>
          <span className="dot-sep" aria-hidden="true" />
          <span className="num">{guest.total_points} pts</span>
        </Link>
      </header>

      <main className="page">
        <PlayGamesList base={base} initialGames={games ?? []} />

        <p className="greeting">
          Playing as <b>{displayName}</b>
          {sideName && (
            <>
              {' '}on <b>{sideName}&apos;s</b> side
            </>
          )}
          . <Link className="text-link" href={`${base}/leaderboard`}>See the leaderboard</Link>
        </p>
      </main>

      <footer className="foot">
        <p className="wordmark">Wedding Carnival</p>
      </footer>
    </>
  );
}
