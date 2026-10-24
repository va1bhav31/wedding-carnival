'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import GameHeader, { check } from '@/components/GameHeader';

type Colors = { primary: string; accent: string; secondary: string; logo?: string };
type LiveState = { active_question_id?: string; started_at?: string; duration_ms?: number; next_at?: string };
type Question = { id: string; prompt: string; options: string[] };
type Result = { correct: boolean; points: number; correct_answer: string[] };

export default function FastestFinger({
  base,
  gameId,
  title,
  initialLiveState,
}: {
  base: string;
  gameId: string;
  title: string;
  colors: Colors;
  initialLiveState: LiveState;
}) {
  const [live, setLive] = useState<LiveState>(initialLiveState);
  const [question, setQuestion] = useState<Question | null>(null);
  const [order, setOrder] = useState<string[]>([]); // options tapped, in sequence
  const [result, setResult] = useState<Result | null>(null);
  const [answered, setAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [earned, setEarned] = useState(0);
  const loadedFor = useRef<string | null>(null);


  // Poll our OWN server for the live question. The server does the Supabase
  // read/write, so the phone never depends on a realtime WebSocket or a direct
  // Supabase connection — both are unreliable on mobile (sockets get suspended,
  // some networks are flaky). Same-origin + no-store, so nothing is cached.
  useEffect(() => {
    let cancelled = false;
    const url = `${base}/game/${gameId}/live`;
    const pull = async () => {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          live_state: LiveState;
          question: Question | null;
          answered: boolean;
        };
        const next = data.live_state ?? {};
        setLive((prev) =>
          prev.active_question_id === next.active_question_id &&
          prev.started_at === next.started_at &&
          prev.next_at === next.next_at
            ? prev
            : next
        );
        const qid = next.active_question_id ?? null;
        if (qid !== loadedFor.current) {
          // New question (or cleared) — reset the round for it.
          loadedFor.current = qid;
          setOrder([]);
          setResult(null);
          setAnswered(data.answered);
          setQuestion(qid ? data.question : null);
        }
      } catch {
        /* transient network error — the next poll retries */
      }
    };
    const id = setInterval(pull, 2500);
    const onVisible = () => {
      if (document.visibilityState === 'visible') pull();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', pull);
    pull();
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', pull);
    };
  }, [base, gameId]);

  // Countdown timer.
  useEffect(() => {
    if (!live.active_question_id || !live.started_at) return;
    const deadline = new Date(live.started_at).getTime() + (live.duration_ms ?? 20000);
    const tick = () => setTimeLeft(Math.max(0, deadline - Date.now()));
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [live.active_question_id, live.started_at, live.duration_ms]);

  // "Next question in…" heads-up countdown, shown between auto-launched
  // questions during a host-run Launch All sequence.
  const [nextIn, setNextIn] = useState(0);
  useEffect(() => {
    if (live.active_question_id || !live.next_at) {
      setNextIn(0);
      return;
    }
    const at = new Date(live.next_at).getTime();
    const tick = () => setNextIn(Math.max(0, at - Date.now()));
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [live.active_question_id, live.next_at]);

  const submit = useCallback(
    async (finalOrder: string[]) => {
      if (answered || result || !question || !live.started_at) return;
      setAnswered(true);
      const responseMs = Date.now() - new Date(live.started_at).getTime();
      try {
        const res = await fetch(`${base}/game/${gameId}/live`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionId: question.id, order: finalOrder, responseMs }),
        });
        const data = await res.json();
        if (res.ok && data && typeof data.correct === 'boolean') {
          const r = data as Result;
          setResult(r);
          if (r.points > 0) setEarned((e) => e + r.points);
        }
      } catch {
        /* leave locked as answered; the host will move on */
      }
    },
    [answered, result, question, live.started_at, base, gameId]
  );

  // Tap an option to append it to the sequence; auto-submit once all are placed.
  const tap = useCallback(
    (opt: string) => {
      if (answered || result || !question || timeLeft <= 0) return;
      if (order.includes(opt)) return;
      const next = [...order, opt];
      setOrder(next);
      if (next.length === question.options.length) submit(next);
    },
    [answered, result, question, timeLeft, order, submit]
  );

  const undo = useCallback(() => {
    if (answered || result) return;
    setOrder((o) => o.slice(0, -1));
  }, [answered, result]);

  const secs = Math.ceil(timeLeft / 1000);
  const timeUp = Boolean(question) && timeLeft <= 0;
  const correctSeq = result?.correct_answer ?? [];
  const total = live.duration_ms ?? 20000;
  const n = question?.options.length ?? 0;
  const board = `${base}/game/${gameId}/leaderboard`;

  const hint = result
    ? 'Round over.'
    : answered
      ? 'Locked in. Waiting for the reveal.'
      : timeUp
        ? 'Time’s up.'
        : order.length
          ? `${order.length} of ${n} placed`
          : 'Tap them in order, first to last.';

  return (
    <>
      <GameHeader
        base={base}
        title={title}
        right={
          <>
            <b className="num">{earned}</b> pts
          </>
        }
      />
      <div className="g-timer" aria-hidden="true">
        <i style={{ transform: `scaleX(${question && !answered && !result ? Math.max(0, timeLeft / total) : 0})` }} />
      </div>

      <main className="g-stage">
        {!question && nextIn > 0 ? (
          <div className="quiet">
            <div className="count num" aria-live="polite">
              {Math.ceil(nextIn / 1000)}
            </div>
            <h2>Next question</h2>
            <p>Finger ready. Tap the answers into the right order.</p>
          </div>
        ) : !question ? (
          <div className="quiet">
            <div className="ev-spinner" aria-hidden="true" />
            <h1>Waiting for the host</h1>
            <p>The next question appears here the moment it&apos;s launched. Keep this screen open.</p>
            <div className="g-actions">
              <Link href={board} className="btn btn-quiet btn-block">
                Leaderboard
              </Link>
            </div>
          </div>
        ) : (
          <section className="g-col">
            <p className="g-meta">
              <span>Tap in order</span>
              <span className={`secs num${secs <= 5 ? ' low' : ''}`}>{timeUp || answered || result ? '' : `${secs}s`}</span>
            </p>
            <h1 className="g-prompt">{question.prompt}</h1>
            <p className="g-hint" aria-live="polite">
              {hint}
            </p>

            <ol className="opts">
              {question.options.map((opt) => {
                const pickedAt = order.indexOf(opt);
                const isPicked = pickedAt !== -1;
                const correctSlot = correctSeq.indexOf(opt);
                const inRightPlace = Boolean(result) && isPicked && pickedAt === correctSlot;

                let cls = 'opt';
                let tag: string | null = null;
                if (result) {
                  if (!isPicked) cls += ' is-dim';
                  else if (inRightPlace) {
                    cls += ' is-right';
                    tag = 'Right place';
                  } else {
                    cls += ' is-wrong';
                    if (correctSlot !== -1) tag = `Goes ${correctSlot + 1}`;
                  }
                } else if (isPicked) cls += ' is-picked';
                else if (answered || timeUp) cls += ' is-dim';

                return (
                  <li key={opt}>
                    <button
                      type="button"
                      className={cls}
                      disabled={isPicked || answered || timeUp || Boolean(result)}
                      onClick={() => tap(opt)}
                      aria-label={isPicked ? `${opt}, placed ${pickedAt + 1}` : opt}
                    >
                      <span className="mark num">{inRightPlace ? check : isPicked ? pickedAt + 1 : ''}</span>
                      <span>{opt}</span>
                      {tag && <span className="tag">{tag}</span>}
                    </button>
                  </li>
                );
              })}
            </ol>

            {!answered && !result && order.length > 0 && (
              <button type="button" className="undo" onClick={undo}>
                <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 7L5 11l4 4" />
                  <path d="M5 11h9a5 5 0 0 1 0 10h-2" />
                </svg>
                Undo last
              </button>
            )}

            {result && (
              <div className="result" aria-live="polite">
                {result.correct ? (
                  <p className="result-head">
                    Correct order <span className="result-pts">+{result.points}</span>
                  </p>
                ) : (
                  <>
                    <p className="result-head">Not quite</p>
                    {correctSeq.length > 0 && (
                      <>
                        <p className="result-note">The right order</p>
                        <ol className="seq">
                          {correctSeq.map((c) => (
                            <li key={c}>{c}</li>
                          ))}
                        </ol>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
            {timeUp && !answered && !result && (
              <div className="result" aria-live="polite">
                <p className="result-head">Time&apos;s up</p>
                <p className="result-note">Stay here, the next question comes to you.</p>
              </div>
            )}

            <div className="g-actions">
              <Link href={board} className="btn btn-quiet btn-block">
                Leaderboard
              </Link>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
