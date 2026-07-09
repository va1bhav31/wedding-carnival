import type { CSSProperties } from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getWeddingBySlug, coupleNames, themeColors } from '@/lib/weddings';
import { guestCookieName } from '@/lib/guest-cookie';
import { guestBase } from '@/lib/guest-nav';

const GAME_META: Record<string, { emoji: string; label: string }> = {
  bride_groom_showdown: { emoji: '🎭', label: 'Bride vs Groom Showdown' },
  couple_trivia: { emoji: '🎯', label: 'Couple Trivia' },
  photo_hunt: { emoji: '📸', label: 'Photo Hunt' },
  scratch_win: { emoji: '🎁', label: 'Scratch & Win' },
  bride_groom_battle: { emoji: '👾', label: 'Bride vs Groom Battle' },
  fastest_finger: { emoji: '⚡', label: 'Fastest Finger First' },
  spin_wheel_dare: { emoji: '🎡', label: 'Spin the Wheel Dare' },
  baraat_rush: { emoji: '🐎', label: 'Baraat Rush' },
};

const TEAM_LABEL: Record<string, string> = { bride: '👰 Bride Side', groom: '🤵 Groom Side' };

// Game types with a playable screen built so far.
const PLAYABLE = new Set(['couple_trivia', 'fastest_finger', 'bride_groom_showdown', 'scratch_win']);

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
  const { primary, accent, secondary } = themeColors(w);
  const bg = { background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)` } as CSSProperties;
  const displayName = guest.nickname || guest.name;
  const gameList = games ?? [];

  return (
    <main style={bg} className="min-h-dvh px-5 py-8 text-white">
      <div className="mx-auto max-w-md">
        {/* Player header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-white/70">
              {bride} &amp; {groom}
            </p>
            <h1 className="font-serif text-2xl font-bold">Hi, {displayName}! 🎉</h1>
          </div>
          <div className="text-right">
            {guest.team && (
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">
                {TEAM_LABEL[guest.team] ?? guest.team}
              </span>
            )}
            <div className="mt-1 text-sm">
              <span className="font-bold" style={{ color: accent }}>
                {guest.total_points}
              </span>{' '}
              pts
            </div>
          </div>
        </div>

        {/* Leaderboard link */}
        <Link
          href={`${base}/leaderboard`}
          className="mb-6 flex items-center justify-center gap-2 rounded-2xl bg-white/15 py-3 font-semibold text-white backdrop-blur transition hover:bg-white/25"
        >
          🏆 View Leaderboard
        </Link>

        {/* Games */}
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">Games</h2>

        {gameList.length === 0 ? (
          <div className="rounded-2xl bg-white/15 p-8 text-center text-white/80 backdrop-blur">
            🎪 Games are being set up — check back in a moment!
          </div>
        ) : (
          <ul className="grid gap-3">
            {gameList.map((g) => {
              const meta = GAME_META[g.game_type] ?? { emoji: '🎮', label: g.game_type };
              const canPlay = g.status === 'live' && PLAYABLE.has(g.game_type);
              const rowCls =
                'flex items-center justify-between rounded-2xl bg-white p-4 text-gray-900 shadow-lg';
              const inner = (
                <>
                  <span className="flex items-center gap-3 font-semibold">
                    <span className="text-2xl">{meta.emoji}</span>
                    {g.title || meta.label}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      canPlay ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {canPlay ? 'Play' : 'Soon'}
                  </span>
                </>
              );
              return (
                <li key={g.id}>
                  {canPlay ? (
                    <Link href={`${base}/game/${g.id}`} className={`${rowCls} transition hover:-translate-y-0.5`}>
                      {inner}
                    </Link>
                  ) : (
                    <div className={rowCls}>{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <footer className="mt-10 text-center text-xs text-white/50">
          Powered by Wedding Carnival™
        </footer>
      </div>
    </main>
  );
}
