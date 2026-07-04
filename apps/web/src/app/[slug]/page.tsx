import type { CSSProperties } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

type Theme = { primary?: string; accent?: string; secondary?: string; logo?: string };
type Wedding = {
  id: string;
  slug: string;
  bride_name: string | null;
  groom_name: string | null;
  couple_name_1: string;
  couple_name_2: string;
  welcome_message: string | null;
  theme: Theme | null;
  status: string;
};

async function getWedding(slug: string): Promise<Wedding | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('weddings')
    .select(
      'id, slug, bride_name, groom_name, couple_name_1, couple_name_2, welcome_message, theme, status'
    )
    .eq('slug', slug)
    .maybeSingle();
  return (data as Wedding) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const w = await getWedding(slug);
  if (!w) return { title: 'Wedding Carnival' };
  const bride = w.bride_name || w.couple_name_1;
  const groom = w.groom_name || w.couple_name_2;
  return { title: `${bride} & ${groom} — Wedding Carnival 🎪` };
}

export default async function GuestHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const w = await getWedding(slug);
  if (!w) notFound();

  const bride = w.bride_name || w.couple_name_1;
  const groom = w.groom_name || w.couple_name_2;
  const theme = w.theme ?? {};
  const primary = theme.primary || '#FB4FA8';
  const accent = theme.accent || '#F4D71E';
  const secondary = theme.secondary || '#8B3FB0';
  const isLive = w.status === 'live';

  const style = {
    '--primary': primary,
    '--accent': accent,
    '--secondary': secondary,
    background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`,
  } as CSSProperties;

  return (
    <main
      style={style}
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-12 text-center text-white"
    >
      {/* soft brand glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full opacity-40 blur-3xl"
        style={{ background: accent }}
      />

      <div className="relative z-10 flex w-full max-w-xl flex-col items-center gap-6">
        {theme.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={theme.logo}
            alt=""
            className="h-24 w-24 rounded-3xl object-cover shadow-2xl"
          />
        ) : (
          <div className="text-5xl">🎪</div>
        )}

        {isLive ? (
          <span
            className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-semibold backdrop-blur"
            style={{ color: '#fff' }}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
            The Carnival is LIVE
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-semibold backdrop-blur">
            🎪 Opening soon
          </span>
        )}

        <h1 className="font-serif text-5xl font-bold leading-tight drop-shadow-sm sm:text-6xl">
          {bride} <span style={{ color: accent }}>&amp;</span> {groom}
        </h1>

        {w.welcome_message && (
          <p className="max-w-md text-lg text-white/90">{w.welcome_message}</p>
        )}

        {isLive ? (
          <>
            <Link
              href={`/${slug}/join`}
              className="mt-2 rounded-full bg-white px-8 py-4 text-lg font-semibold shadow-xl transition hover:-translate-y-0.5"
              style={{ color: secondary }}
            >
              ▶ Enter the Carnival
            </Link>
            <p className="text-sm text-white/70">Scan · play · win · leave your mark 🎉</p>
          </>
        ) : (
          <p className="mt-2 max-w-md text-white/80">
            {bride} &amp; {groom}&apos;s Wedding Carnival isn&apos;t open just yet — check back
            soon to play, compete and celebrate together. 🎪
          </p>
        )}
      </div>

      <footer className="absolute bottom-5 z-10 text-xs text-white/60">
        Powered by Wedding Carnival™
      </footer>
    </main>
  );
}
