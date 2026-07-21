import type { CSSProperties } from 'react';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getWeddingBySlug, coupleNames, themeColors } from '@/lib/weddings';
import { guestCookieName } from '@/lib/guest-cookie';
import { guestBase } from '@/lib/guest-nav';
import GuestBackdrop from '@/components/GuestBackdrop';

const MEDAL = ['🥇', '🥈', '🥉'];
const TEAM = { bride: '👰', groom: '🤵' } as Record<string, string>;

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
          <h1 className="wc-rise font-serif text-3xl font-bold" style={{ animationDelay: '.08s' }}>
            <span className="wc-bob-slow inline-block">🏆</span> Leaderboard
          </h1>
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
                  <span className="flex-1 truncate font-semibold">
                    {p.nickname || p.name} {p.team ? TEAM[p.team] ?? '' : ''}
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

        <div className="mt-8 text-center">
          <Link href={`${base}/play`} className="wc-btn inline-block rounded-full bg-white/20 px-6 py-3 font-semibold text-white ring-1 ring-white/15 backdrop-blur">
            ← Back to games
          </Link>
        </div>
      </div>
    </main>
  );
}
