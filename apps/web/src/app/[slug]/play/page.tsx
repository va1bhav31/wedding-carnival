import type { CSSProperties } from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getWeddingBySlug, coupleNames, themeColors } from '@/lib/weddings';
import { guestCookieName } from '@/lib/guest-cookie';
import { guestBase } from '@/lib/guest-nav';
import GuestBackdrop from '@/components/GuestBackdrop';
import GameIcon from '@/components/GameIcon';
import TeamAvatar from '@/components/TeamAvatar';
import PlayGamesList from '@/components/PlayGamesList';

const TEAM_LABEL: Record<string, string> = { bride: 'Bride Side', groom: 'Groom Side' };

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
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 py-1 pl-1.5 pr-3 text-xs font-semibold backdrop-blur">
                <TeamAvatar team={guest.team} className="h-5 w-5 rounded-full object-cover object-top ring-1 ring-white/40" />
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
          <GameIcon type="trophy" className="h-4 w-4" />
          View Leaderboard
        </Link>

        {/* Games */}
        <h2 className="wc-rise mb-3 text-sm font-semibold uppercase tracking-widest text-white/70" style={{ animationDelay: '.1s' }}>
          Games
        </h2>

        <PlayGamesList base={base} initialGames={gameList} primary={primary} secondary={secondary} />

        <footer className="mt-10 text-center text-xs text-white/50">
          Powered by Wedding Carnival™
        </footer>
      </div>
    </main>
  );
}
