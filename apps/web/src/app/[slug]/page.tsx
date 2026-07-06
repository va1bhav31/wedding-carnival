import type { CSSProperties } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getWeddingBySlug, coupleNames, themeColors } from '@/lib/weddings';
import { guestBase } from '@/lib/guest-nav';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const w = await getWeddingBySlug(slug);
  if (!w) return { title: 'Wedding Carnival' };
  const { bride, groom } = coupleNames(w);
  return { title: `${bride} & ${groom} — Wedding Carnival 🎪` };
}

export default async function GuestHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const w = await getWeddingBySlug(slug);
  if (!w) notFound();

  const { bride, groom } = coupleNames(w);
  const { primary, accent, secondary, logo } = themeColors(w);
  const isLive = w.status === 'live';
  const base = await guestBase(slug);

  const style = {
    background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`,
  } as CSSProperties;

  return (
    <main
      style={style}
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-12 text-center text-white"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full opacity-40 blur-3xl"
        style={{ background: accent }}
      />

      <div className="relative z-10 flex w-full max-w-xl flex-col items-center gap-6">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" className="h-24 w-24 rounded-3xl object-cover shadow-2xl" />
        ) : (
          <div className="text-5xl">🎪</div>
        )}

        {isLive ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-semibold backdrop-blur">
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

        {w.welcome_message && <p className="max-w-md text-lg text-white/90">{w.welcome_message}</p>}

        {isLive ? (
          <>
            <Link
              href={`${base}/join`}
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
