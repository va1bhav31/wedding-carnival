'use client';

// Shown when a guest lands on a game before the host has opened it. Without
// this, "not open yet" is a dead end: the server checked status once at
// request time, so a guest sitting here never finds out the host flipped it
// live a moment later — they'd have to manually back out and re-enter. This
// polls a same-origin status endpoint and refreshes the route the instant
// this game goes live, landing them straight in the game.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function WaitingForLive({ base, gameId }: { base: string; gameId: string }) {
  const router = useRouter();
  const [pulse, setPulse] = useState(false);

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
    const pulseId = setInterval(() => setPulse((p) => !p), 900);
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', check);
    check();
    return () => {
      cancelled = true;
      clearInterval(id);
      clearInterval(pulseId);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', check);
    };
  }, [base, gameId, router]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-center gap-2 text-sm font-semibold text-white/80">
        <span
          className="h-2 w-2 rounded-full bg-white transition-opacity"
          style={{ opacity: pulse ? 1 : 0.35 }}
        />
        Waiting for the host
      </div>
      <p className="text-lg">This game isn&apos;t open yet.</p>
      <p className="mt-1 text-sm text-white/70">
        It&apos;ll jump in automatically the moment the host starts it, no need to refresh.
      </p>
      <Link href={`${base}/play`} className="mt-4 inline-block rounded-full bg-white px-6 py-3 font-semibold text-gray-900">
        ← Back to games
      </Link>
    </div>
  );
}
