'use client';

// The Play hub's game list used to be rendered once on the server: a guest
// staring at "Soon" badges had no way to know the moment the host flipped a
// game live short of manually reloading the page. This polls the same
// same-origin status endpoint the game-page waiting screen uses and updates
// the Play/Soon badges live, in place.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import GameIcon, { GAME_ICON } from '@/components/GameIcon';

const GAME_META: Record<string, { label: string }> = {
  bride_groom_showdown: { label: 'Bride vs Groom Showdown' },
  couple_trivia: { label: 'Couple Trivia' },
  photo_hunt: { label: 'Photo Hunt' },
  scratch_win: { label: 'Scratch & Win' },
  bride_groom_battle: { label: 'Bride vs Groom Battle' },
  fastest_finger: { label: 'Fastest Finger First' },
  spin_wheel_dare: { label: 'Spin the Wheel Dare' },
  baraat_rush: { label: 'Baraat Rush' },
};

const PLAYABLE = new Set(['couple_trivia', 'fastest_finger', 'bride_groom_showdown', 'scratch_win', 'baraat_rush']);
const SCORED = new Set(['couple_trivia', 'fastest_finger', 'bride_groom_showdown', 'baraat_rush']);

type Game = { id: string; game_type: string; title: string | null; status: string };

export default function PlayGamesList({
  base,
  initialGames,
  primary,
  secondary,
}: {
  base: string;
  initialGames: Game[];
  primary: string;
  secondary: string;
}) {
  const [games, setGames] = useState(initialGames);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch(`${base}/status`, { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { games?: Record<string, string> };
        if (!data.games) return;
        setGames((prev) => {
          let changed = false;
          const next = prev.map((g) => {
            const status = data.games?.[g.id];
            if (status && status !== g.status) {
              changed = true;
              return { ...g, status };
            }
            return g;
          });
          return changed ? next : prev;
        });
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
  }, [base]);

  if (games.length === 0) {
    return (
      <div className="wc-pop rounded-2xl bg-white/15 p-8 text-center text-white/80 backdrop-blur">
        🎪 Games are being set up — check back in a moment!
      </div>
    );
  }

  return (
    <ul className="grid gap-3">
      {games.map((g, i) => {
        const meta = GAME_META[g.game_type] ?? { label: g.game_type };
        const canPlay = g.status === 'live' && PLAYABLE.has(g.game_type);
        const rowCls = 'wc-card flex items-center justify-between gap-3 rounded-2xl bg-white p-4 text-gray-900 shadow-xl';
        const inner = (
          <>
            <span className="flex min-w-0 items-center gap-3 font-semibold">
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl shadow-inner"
                style={{ background: `linear-gradient(135deg, ${primary}22, ${secondary}22)`, color: secondary }}
              >
                <GameIcon type={GAME_ICON[g.game_type] ?? 'sparkle'} className="h-6 w-6" />
              </span>
              <span className="truncate">{g.title || meta.label}</span>
            </span>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                canPlay ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-400'
              }`}
              style={canPlay ? { background: `linear-gradient(135deg, ${primary}, ${secondary})` } : undefined}
            >
              {canPlay ? 'Play ▶' : 'Soon'}
            </span>
          </>
        );
        return (
          <li key={g.id} className="wc-rise flex items-center gap-2" style={{ animationDelay: `${0.15 + i * 0.06}s` }}>
            {canPlay ? (
              <Link href={`${base}/game/${g.id}`} className={`${rowCls} flex-1`}>
                {inner}
              </Link>
            ) : (
              <div className={`${rowCls} flex-1 opacity-90`}>{inner}</div>
            )}
            {SCORED.has(g.game_type) && (
              <Link
                href={`${base}/game/${g.id}/leaderboard`}
                className="wc-btn grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/20 text-white shadow-lg ring-1 ring-white/20 backdrop-blur"
                aria-label={`${g.title || meta.label} leaderboard`}
                title="Leaderboard"
              >
                <GameIcon type="trophy" className="h-5 w-5" />
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
