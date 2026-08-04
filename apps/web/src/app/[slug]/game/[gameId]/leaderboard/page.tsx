import type { CSSProperties } from 'react';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getWeddingBySlug, coupleNames, themeColors } from '@/lib/weddings';
import { guestCookieName } from '@/lib/guest-cookie';
import { guestBase } from '@/lib/guest-nav';
import { GAME_BY_TYPE } from '@/lib/games-catalog';
import GuestBackdrop from '@/components/GuestBackdrop';
import GameIcon, { GAME_ICON } from '@/components/GameIcon';
import TeamAvatar from '@/components/TeamAvatar';

const MEDAL = ['🥇', '🥈', '🥉'];

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
  const { primary, accent, secondary } = themeColors(w);
  const bg = {
    backgroundImage: `linear-gradient(135deg, ${primary} 0%, ${secondary} 55%, ${primary} 100%)`,
  } as CSSProperties;

  return (
    <main style={bg} className="wc-aurora relative min-h-dvh overflow-hidden px-5 py-8 text-white">
      <GuestBackdrop accent={accent} />
      <div className="relative z-10 mx-auto max-w-md">
        <div className="mb-6 text-center">
          <p className="wc-rise text-sm text-white/70">
            {bride} &amp; {groom}
          </p>
          <h1 className="wc-rise flex items-center justify-center gap-2 font-serif text-3xl font-bold" style={{ animationDelay: '.08s' }}>
            <GameIcon
              type={GAME_ICON[game.game_type] ?? 'trophy'}
              className="wc-bob-slow h-7 w-7"
              style={{ color: accent }}
            />
            {title}
          </h1>
          <p className="wc-rise mt-1 text-xs text-white/60" style={{ animationDelay: '.12s' }}>
            This game&apos;s own leaderboard
          </p>
        </div>

        {!scored ? (
          <p className="wc-pop text-center text-white/80">
            This game doesn&apos;t have a points leaderboard.
          </p>
        ) : list.length === 0 ? (
          <p className="wc-pop text-center text-white/80">No scores yet — be the first to play!</p>
        ) : (
          <ul className="grid gap-2">
            {list.map((p, i) => {
              const isMe = p.id === guestId;
              const isTop = i < 3;
              return (
                <li
                  key={p.id}
                  className={`wc-rise flex items-center gap-3 rounded-2xl px-4 py-3 ${
                    isMe
                      ? 'bg-white text-gray-900 shadow-xl'
                      : isTop
                        ? 'bg-white/25 shadow-lg ring-1 ring-white/25 backdrop-blur'
                        : 'bg-white/12 backdrop-blur'
                  }`}
                  style={{
                    animationDelay: `${i * 0.05}s`,
                    ...(isMe ? { boxShadow: `0 0 0 2px ${accent}, 0 12px 30px -10px ${accent}` } : {}),
                  }}
                >
                  <span className={`w-8 text-center ${isTop ? 'text-xl' : 'font-bold'}`}>
                    {MEDAL[i] ?? i + 1}
                  </span>
                  {p.team && (
                    <TeamAvatar
                      team={p.team}
                      className="h-7 w-7 shrink-0 rounded-full object-cover object-top ring-1 ring-black/5"
                    />
                  )}
                  <span className="flex-1 truncate font-semibold">
                    {p.nickname || p.name}
                    {isMe && <span className="ml-1 text-xs" style={{ color: secondary }}>(you)</span>}
                  </span>
                  <span className="text-lg font-black" style={{ color: isMe ? secondary : accent }}>
                    {p.score}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-8 flex flex-col items-center gap-3">
          <Link href={`${base}/game/${gameId}`} className="wc-btn inline-block rounded-full bg-white/20 px-6 py-3 font-semibold text-white ring-1 ring-white/15 backdrop-blur">
            ← Back to {title}
          </Link>
          <Link href={`${base}/leaderboard`} className="text-sm text-white/60 hover:text-white/90">
            View the combined leaderboard →
          </Link>
        </div>
      </div>
    </main>
  );
}
