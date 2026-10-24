'use client';

// Shown when a guest lands on a game before the host has opened it. Without
// this, "not open yet" is a dead end: the server checked status once at
// request time, so a guest sitting here never finds out the host flipped it
// live a moment later — they'd have to manually back out and re-enter. This
// polls a same-origin status endpoint and refreshes the route the instant
// this game goes live, landing them straight in the game.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function WaitingForLive({ base, gameId, title }: { base: string; gameId: string; title: string }) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch(`${base}/status`, { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data?.games?.[gameId] === 'live') router.refresh();
      } catch {
        /* transient network error, the next poll retries */
      }
    };
    const id = setInterval(check, 4000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', check);
    check();
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', check);
    };
  }, [base, gameId, router]);

  return (
    <div className="quiet">
      <div className="ev-spinner" aria-hidden="true" />
      <h1>Not open yet</h1>
      <p>
        The host hasn&apos;t started {title} yet. This page opens it by itself the moment they do, no need to refresh.
      </p>
      <div className="g-actions">
        <Link href={`${base}/play`} className="btn btn-quiet btn-block">
          Back to games
        </Link>
      </div>
    </div>
  );
}
