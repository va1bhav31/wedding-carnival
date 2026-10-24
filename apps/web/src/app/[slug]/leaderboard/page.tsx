import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getWeddingBySlug, coupleNames } from '@/lib/weddings';
import { guestCookieName } from '@/lib/guest-cookie';
import { guestBase } from '@/lib/guest-nav';
import EveningBoard from '@/components/EveningBoard';

export default async function Leaderboard({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const w = await getWeddingBySlug(slug);
  if (!w) notFound();

  const base = await guestBase(slug);
  const cookieStore = await cookies();
  const guestId = cookieStore.get(guestCookieName(w.id))?.value;
  if (!guestId) redirect(`${base}/join`);

  const supabase = await createClient();
  const { data: players } = await supabase
    .from('guests')
    .select('id, name, nickname, team, total_points')
    .eq('wedding_id', w.id)
    .order('total_points', { ascending: false })
    .limit(50);

  // Baraat Rush keeps its own dedicated leaderboard and stays out of this
  // combined one — link to it here if the wedding has it enabled.
  const { data: baraat } = await supabase
    .from('wedding_games')
    .select('id')
    .eq('wedding_id', w.id)
    .eq('game_type', 'baraat_rush')
    .maybeSingle();

  const list = (players ?? []).map((p) => ({ ...p, score: p.total_points ?? 0 }));
  const { bride, groom } = coupleNames(w);

  return (
    <>
      <header className="g-top">
        <Link className="g-back" href={`${base}/play`}>
          <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
          Games
        </Link>
        <p className="g-name">Leaderboard</p>
        <span />
      </header>
      <main className="g-stage">
        <h1 className="g-prompt">Tonight&apos;s leaderboard</h1>
        <p className="g-hint">Points from the quiz and card games, all added up.</p>
        <div style={{ marginTop: 22 }}>
          {list.length === 0 ? (
            <p className="g-hint">No scores yet. Be the first to play.</p>
          ) : (
            <EveningBoard players={list} guestId={guestId} bride={bride} groom={groom} />
          )}
        </div>
        {baraat && (
          <p className="g-hint" style={{ marginTop: 26 }}>
            Baraat Rush keeps its own board.{' '}
            <Link className="text-link" href={`${base}/game/${baraat.id}/leaderboard`}>
              See the Baraat Rush leaderboard
            </Link>
          </p>
        )}
      </main>
    </>
  );
}
