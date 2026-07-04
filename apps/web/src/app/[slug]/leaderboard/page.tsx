import type { CSSProperties } from 'react';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getWeddingBySlug, coupleNames, themeColors } from '@/lib/weddings';
import { guestCookieName } from '@/lib/guest-cookie';

const MEDAL = ['🥇', '🥈', '🥉'];
const TEAM = { bride: '👰', groom: '🤵' } as Record<string, string>;

export default async function Leaderboard({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const w = await getWeddingBySlug(slug);
  if (!w) notFound();

  const cookieStore = await cookies();
  const guestId = cookieStore.get(guestCookieName(w.id))?.value;
  if (!guestId) redirect(`/${slug}/join`);

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
  const bg = { background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)` } as CSSProperties;

  return (
    <main style={bg} className="min-h-dvh px-5 py-8 text-white">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <p className="text-sm text-white/70">
            {bride} &amp; {groom}
          </p>
          <h1 className="font-serif text-3xl font-bold">🏆 Leaderboard</h1>
        </div>

        {list.length === 0 ? (
          <p className="text-center text-white/80">No scores yet — be the first to play!</p>
        ) : (
          <ul className="grid gap-2">
            {list.map((p, i) => {
              const isMe = p.id === guestId;
              return (
                <li
                  key={p.id}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${
                    isMe ? 'bg-white text-gray-900 shadow-lg ring-2' : 'bg-white/15 backdrop-blur'
                  }`}
                  style={isMe ? { boxShadow: `0 0 0 2px ${accent}` } : undefined}
                >
                  <span className="w-7 text-center font-bold">{MEDAL[i] ?? i + 1}</span>
                  <span className="flex-1 font-semibold">
                    {p.nickname || p.name} {p.team ? TEAM[p.team] ?? '' : ''}
                    {isMe && <span className="ml-1 text-xs text-fuchsia-600">(you)</span>}
                  </span>
                  <span className="font-bold" style={{ color: isMe ? secondary : accent }}>
                    {p.total_points}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-8 text-center">
          <Link href={`/${slug}/play`} className="rounded-full bg-white/20 px-6 py-3 font-semibold text-white backdrop-blur">
            ← Back to games
          </Link>
        </div>
      </div>
    </main>
  );
}
