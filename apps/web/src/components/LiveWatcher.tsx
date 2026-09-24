'use client';

// Invisible watcher for "opening soon" screens (the wedding home page before
// the event itself is set live). Same bug class as the per-game waiting
// screen: a guest who scans the QR code early would otherwise sit on a
// stale "not open yet" render until they manually reload. Renders nothing;
// just polls and refreshes the route the moment the wedding goes live.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LiveWatcher({ base }: { base: string }) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch(`${base}/status`, { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data?.wedding_status === 'live') router.refresh();
      } catch {
        /* transient network error, the next poll retries */
      }
    };
    const id = setInterval(check, 5000);
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
  }, [base, router]);

  return null;
}
