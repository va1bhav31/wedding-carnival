import type { CSSProperties } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getWeddingBySlug, coupleNames, themeColors } from '@/lib/weddings';
import { guestBase } from '@/lib/guest-nav';
import GuestBackdrop from '@/components/GuestBackdrop';

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
    backgroundImage: `linear-gradient(135deg, ${primary} 0%, ${secondary} 55%, ${primary} 100%)`,
  } as CSSProperties;

  return (
    <main
      style={style}
      className="wc-aurora relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-12 text-center text-white"
    >
      <GuestBackdrop accent={accent} />

      <div className="relative z-10 flex w-full max-w-xl flex-col items-center gap-6">
        <div className="wc-pop wc-bob" style={{ animationDelay: '0s, .6s' }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt=""
              className="h-24 w-24 rounded-3xl object-cover shadow-2xl ring-4 ring-white/25"
            />
          ) : (
            <div className="grid h-24 w-24 place-items-center rounded-3xl bg-white/15 text-5xl shadow-2xl ring-4 ring-white/20 backdrop-blur">
              🎪
            </div>
          )}
        </div>

        {isLive ? (
          <span className="wc-rise inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-semibold shadow-lg backdrop-blur" style={{ animationDelay: '.1s' }}>
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: accent }} />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: accent }} />
            </span>
            The Carnival is LIVE
          </span>
        ) : (
          <span className="wc-rise inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-semibold backdrop-blur" style={{ animationDelay: '.1s' }}>
            🎪 Opening soon
          </span>
        )}

        <h1 className="wc-rise font-serif text-5xl font-bold leading-tight drop-shadow-md sm:text-6xl" style={{ animationDelay: '.2s' }}>
          {bride} <span className="wc-bob-slow inline-block" style={{ color: accent }}>&amp;</span> {groom}
        </h1>

        {w.welcome_message && (
          <p className="wc-rise max-w-md text-lg text-white/90" style={{ animationDelay: '.3s' }}>
            {w.welcome_message}
          </p>
        )}

        {isLive ? (
          <>
            <Link
              href={`${base}/join`}
              className="wc-rise wc-btn mt-2 rounded-full bg-white px-9 py-4 text-lg font-bold shadow-2xl"
              style={{ color: secondary, animationDelay: '.4s' }}
            >
              ▶ Enter the Carnival
            </Link>
            <p className="wc-rise text-sm text-white/75" style={{ animationDelay: '.5s' }}>
              Scan · play · win · leave your mark 🎉
            </p>
          </>
        ) : (
          <p className="wc-rise mt-2 max-w-md text-white/80" style={{ animationDelay: '.4s' }}>
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
