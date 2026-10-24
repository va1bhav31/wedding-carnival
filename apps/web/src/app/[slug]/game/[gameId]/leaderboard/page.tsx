import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getWeddingBySlug, coupleNames } from '@/lib/weddings';
import { guestCookieName } from '@/lib/guest-cookie';
import { guestBase } from '@/lib/guest-nav';
import { GAME_BY_TYPE } from '@/lib/games-catalog';
import EveningBoard from '@/components/EveningBoard';

// Game types this page knows how to rank, and where their score comes from.
// Quiz-family games sum question_responses.points_awarded; arcade games read
// their best run straight from game_scores.
const QUIZ_TYPES = new Set(['couple_trivia', 'bride_groom_showdown', 'fastest_finger']);
const ARCADE_TYPES = new Set(['baraat_rush', 'bride_groom_battle']);

type Row = { guest_id: string; score: number };

export default async function GameLeaderboard({
  params,
}: {
  params: Promise<{ slug: string; gameId: string }>;
}) {
  const { slug, gameId } = await params;
  const w = await getWeddingBySlug(slug);
  if (!w) notFound();

  const base = await guestBase(slug);
  const cookieStore = await cookies();
  const guestId = cookieStore.get(guestCookieName(w.id))?.value;
  if (!guestId) redirect(`${base}/join`);

  const supabase = await createClient();
  const { data: game } = await supabase
    .from('wedding_games')
    .select('id, wedding_id, game_type, title')
    .eq('id', gameId)
    .maybeSingle();
  if (!game || game.wedding_id !== w.id) notFound();

  const meta = GAME_BY_TYPE[game.game_type];
  const title = game.title || meta?.label || game.game_type;

  let rows: Row[] = [];
  let scored = true;

  if (QUIZ_TYPES.has(game.game_type)) {
    const { data: qs } = await supabase.from('questions').select('id').eq('wedding_game_id', gameId);
    const ids = (qs ?? []).map((q) => q.id);
    if (ids.length > 0) {
      const { data: responses } = await supabase
        .from('question_responses')
        .select('guest_id, points_awarded')
        .in('question_id', ids);
      const totals = new Map<string, number>();
      for (const r of responses ?? []) {
        totals.set(r.guest_id, (totals.get(r.guest_id) ?? 0) + (r.points_awarded ?? 0));
      }
      rows = Array.from(totals, ([guest_id, score]) => ({ guest_id, score }));
    }
  } else if (ARCADE_TYPES.has(game.game_type)) {
    const { data: scores } = await supabase
      .from('game_scores')
      .select('guest_id, score')
      .eq('wedding_game_id', gameId);
    rows = (scores ?? []).map((s) => ({ guest_id: s.guest_id, score: s.score }));
  } else {
    scored = false;
  }

  rows.sort((a, b) => b.score - a.score);
  const top = rows.slice(0, 50);

  const guestIds = top.map((r) => r.guest_id);
  const { data: guests } =
    guestIds.length > 0
      ? await supabase.from('guests').select('id, name, nickname, team').in('id', guestIds)
      : { data: [] };
  const guestById = new Map((guests ?? []).map((g) => [g.id, g]));

  const list = top
    .map((r) => {
      const g = guestById.get(r.guest_id);
      return g ? { id: r.guest_id, name: g.name, nickname: g.nickname, team: g.team, score: r.score } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const { bride, groom } = coupleNames(w);

  return (
    <>
      <header className="g-top">
        <Link className="g-back" href={`${base}/game/${gameId}`}>
          <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
          Game
        </Link>
        <p className="g-name">{title}</p>
        <span />
      </header>
      <main className="g-stage">
        <h1 className="g-prompt">{title} leaderboard</h1>
        <p className="g-hint">{ARCADE_TYPES.has(game.game_type) ? 'Each guest’s best run.' : 'Points from this game only.'}</p>
        <div style={{ marginTop: 22 }}>
          {!scored ? (
            <p className="g-hint">This game doesn&apos;t keep points.</p>
          ) : list.length === 0 ? (
            <p className="g-hint">No scores yet. Be the first to play.</p>
          ) : (
            <EveningBoard players={list} guestId={guestId} bride={bride} groom={groom} />
          )}
        </div>
        <div className="g-actions">
          <Link href={`${base}/game/${gameId}`} className="btn btn-primary btn-block">
            Back to {title}
          </Link>
          <Link href={`${base}/leaderboard`} className="btn btn-quiet btn-block">
            Tonight&apos;s full leaderboard
          </Link>
        </div>
      </main>
    </>
  );
}
