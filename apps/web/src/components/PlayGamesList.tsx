'use client';

// The Play hub's game list used to be rendered once on the server: a guest
// staring at "Soon" badges had no way to know the moment the host flipped a
// game live short of manually reloading the page. This polls the same
// same-origin status endpoint the game-page waiting screen uses and updates
// the list live, in place.

import { useEffect, useState } from 'react';
import Link from 'next/link';

const GAME_META: Record<string, { label: string; how: string }> = {
  fastest_finger: { label: 'Fastest Finger First', how: 'Tap four answers into the right order, fastest wins.' },
  bride_groom_showdown: { label: 'Bride vs Groom Showdown', how: 'Guess who the couple says is more likely.' },
  couple_trivia: { label: 'Couple Trivia', how: 'How well do you know them?' },
  scratch_win: { label: 'Scratch & Win', how: 'One card each. Two hampers are hidden in the pile.' },
  baraat_rush: { label: 'Baraat Rush', how: 'Ride the baraat to the mandap and dodge the chaos.' },
  photo_hunt: { label: 'Photo Hunt', how: 'Catch the moments on the list.' },
  bride_groom_battle: { label: 'Bride vs Groom Battle', how: 'An arcade game for your side.' },
  spin_wheel_dare: { label: 'Spin the Wheel Dare', how: 'Team dares, run by the host.' },
};

const PLAYABLE = new Set(['couple_trivia', 'fastest_finger', 'bride_groom_showdown', 'scratch_win', 'baraat_rush']);
const SCORED = new Set(['couple_trivia', 'fastest_finger', 'bride_groom_showdown', 'baraat_rush']);

type Game = { id: string; game_type: string; title: string | null; status: string };

const lock = (
  <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

export default function PlayGamesList({ base, initialGames }: { base: string; initialGames: Game[] }) {
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

  const nameOf = (g: Game) => g.title || GAME_META[g.game_type]?.label || g.game_type;
  const canPlay = (g: Game) => g.status === 'live' && PLAYABLE.has(g.game_type);
  const featured = games.find(canPlay);

  return (
    <>
      <section className="now" aria-live="polite" aria-labelledby="now-title">
        {featured ? (
          <>
            <h1 className="now-title" id="now-title">
              {nameOf(featured)}
            </h1>
            <p className="now-status">
              <span className="live-dot" aria-hidden="true" />
              Live now. {GAME_META[featured.game_type]?.how}
            </p>
            <Link href={`${base}/game/${featured.id}`} className="btn btn-primary btn-block">
              Play now
            </Link>
          </>
        ) : (
          <>
            <h1 className="now-title" id="now-title">
              Nothing live just yet
            </h1>
            <p className="now-status">The host starts each game during the functions. This page updates by itself.</p>
          </>
        )}
      </section>

      {games.length > 0 && (
        <section className="section" aria-labelledby="all-title">
          <h2 className="section-title" id="all-title">
            All games
          </h2>
          <ul className="game-list">
            {games.map((g) => {
              const live = canPlay(g);
              const state = g.status === 'live' ? 'live' : g.status === 'ended' ? 'ended' : 'locked';
              return (
                <li key={g.id} className="game-row" data-state={state}>
                  <div>
                    <h3 className="game-name">
                      {live ? (
                        <Link className="game-link" href={`${base}/game/${g.id}`}>
                          {nameOf(g)}
                        </Link>
                      ) : (
                        nameOf(g)
                      )}
                    </h3>
                    {SCORED.has(g.game_type) && (
                      <p className="game-meta">
                        <Link href={`${base}/game/${g.id}/leaderboard`}>Leaderboard</Link>
                      </p>
                    )}
                  </div>
                  <p className="game-state">
                    {live ? (
                      <>
                        <span className="live-dot" aria-hidden="true" />
                        Play
                      </>
                    ) : state === 'live' ? (
                      <>
                        <span className="live-dot" aria-hidden="true" />
                        Happening now
                      </>
                    ) : state === 'ended' ? (
                      'Finished'
                    ) : (
                      <>
                        {lock}
                        Not open yet
                      </>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}
