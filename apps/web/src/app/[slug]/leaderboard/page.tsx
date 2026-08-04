import type { CSSProperties } from 'react';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getWeddingBySlug, coupleNames, themeColors } from '@/lib/weddings';
import { guestCookieName } from '@/lib/guest-cookie';
import { guestBase } from '@/lib/guest-nav';
import GuestBackdrop from '@/components/GuestBackdrop';
import GameIcon from '@/components/GameIcon';
import TeamAvatar from '@/components/TeamAvatar';

const MEDAL = ['🥇', '🥈', '🥉'];

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

  const list = players ?? [];
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
            <GameIcon type="trophy" className="wc-bob-slow h-7 w-7" style={{ color: accent }} />
            Leaderboard
          </h1>
          <p className="wc-rise mt-1 text-xs text-white/60" style={{ animationDelay: '.12s' }}>
            Combined across quiz &amp; card games
          </p>
        </div>

        {list.length === 0 ? (
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
                    {p.total_points}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-8 flex flex-col items-center gap-3">
          <Link href={`${base}/play`} className="wc-btn inline-block rounded-full bg-white/20 px-6 py-3 font-semibold text-white ring-1 ring-white/15 backdrop-blur">
            ← Back to games
          </Link>
          {baraat && (
            <Link
              href={`${base}/game/${baraat.id}/leaderboard`}
              className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white/90"
            >
              <GameIcon type="horse" className="h-4 w-4" />
              Baraat Rush has its own leaderboard →
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
