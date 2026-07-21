import type { CSSProperties } from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getWeddingBySlug, coupleNames, themeColors } from '@/lib/weddings';
import { guestCookieName } from '@/lib/guest-cookie';
import { guestBase } from '@/lib/guest-nav';
import GuestBackdrop from '@/components/GuestBackdrop';

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
  const bg = {
    backgroundImage: `linear-gradient(135deg, ${primary} 0%, ${secondary} 55%, ${primary} 100%)`,
  } as CSSProperties;
  const displayName = guest.nickname || guest.name;
  const gameList = games ?? [];

  return (
    <main style={bg} className="wc-aurora relative min-h-dvh overflow-hidden px-5 py-8 text-white">
      <GuestBackdrop accent={accent} />
      <div className="relative z-10 mx-auto max-w-md">
        {/* Player header */}
        <div className="wc-rise mb-6 flex items-center justify-between rounded-3xl bg-white/12 p-4 shadow-lg ring-1 ring-white/15 backdrop-blur-md">
          <div className="min-w-0">
            <p className="truncate text-sm text-white/70">
              {bride} &amp; {groom}
            </p>
            <h1 className="font-serif text-2xl font-bold">Hi, {displayName}! 🎉</h1>
          </div>
          <div className="shrink-0 text-right">
            {guest.team && (
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">
                {TEAM_LABEL[guest.team] ?? guest.team}
              </span>
            )}
            <div className="mt-1.5 flex items-baseline justify-end gap-1">
              <span className="text-2xl font-black leading-none" style={{ color: accent }}>
                {guest.total_points}
              </span>
              <span className="text-xs text-white/70">pts</span>
            </div>
          </div>
        </div>

        {/* Leaderboard link */}
        <Link
          href={`${base}/leaderboard`}
          className="wc-rise wc-btn mb-6 flex items-center justify-center gap-2 rounded-2xl bg-white/15 py-3.5 font-semibold text-white ring-1 ring-white/15 backdrop-blur"
          style={{ animationDelay: '.05s' }}
        >
          🏆 View Leaderboard
        </Link>

        {/* Games */}
        <h2 className="wc-rise mb-3 text-sm font-semibold uppercase tracking-widest text-white/70" style={{ animationDelay: '.1s' }}>
          Games
        </h2>

        {gameList.length === 0 ? (
          <div className="wc-pop rounded-2xl bg-white/15 p-8 text-center text-white/80 backdrop-blur">
            🎪 Games are being set up — check back in a moment!
          </div>
        ) : (
          <ul className="grid gap-3">
            {gameList.map((g, i) => {
              const meta = GAME_META[g.game_type] ?? { emoji: '🎮', label: g.game_type };
              const canPlay = g.status === 'live' && PLAYABLE.has(g.game_type);
              const rowCls =
                'wc-card flex items-center justify-between gap-3 rounded-2xl bg-white p-4 text-gray-900 shadow-xl';
              const inner = (
                <>
                  <span className="flex min-w-0 items-center gap-3 font-semibold">
                    <span
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-2xl shadow-inner"
                      style={{ background: `linear-gradient(135deg, ${primary}22, ${secondary}22)` }}
                    >
                      {meta.emoji}
                    </span>
                    <span className="truncate">{g.title || meta.label}</span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                      canPlay ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-400'
                    }`}
                    style={canPlay ? { background: `linear-gradient(135deg, ${primary}, ${secondary})` } : undefined}
                  >
                    {canPlay ? 'Play ▶' : 'Soon'}
                  </span>
                </>
              );
              return (
                <li key={g.id} className="wc-rise" style={{ animationDelay: `${0.15 + i * 0.06}s` }}>
                  {canPlay ? (
                    <Link href={`${base}/game/${g.id}`} className={rowCls}>
                      {inner}
                    </Link>
                  ) : (
                    <div className={`${rowCls} opacity-90`}>{inner}</div>
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
