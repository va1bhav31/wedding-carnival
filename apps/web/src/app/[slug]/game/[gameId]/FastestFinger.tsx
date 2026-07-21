'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import GuestBackdrop from '@/components/GuestBackdrop';

type Colors = { primary: string; accent: string; secondary: string; logo?: string };
type LiveState = { active_question_id?: string; started_at?: string; duration_ms?: number };
type Question = { id: string; prompt: string; options: string[] };
type Result = { correct: boolean; points: number; correct_answer: string[] };

export default function FastestFinger({
  base,
  gameId,
  guestId,
  title,
  colors,
  initialLiveState,
}: {
  base: string;
  gameId: string;
  guestId: string;
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

  const bg = { backgroundImage: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary}, ${colors.primary})` };

  // Subscribe to live_state changes pushed by the host (instant when it works).
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`wg-${gameId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'wedding_games', filter: `id=eq.${gameId}` },
        (payload) => setLive((payload.new as { live_state: LiveState }).live_state ?? {})
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  // Fallback polling. Realtime WebSockets get suspended on mobile browsers
  // (iOS power-saving, backgrounded tabs) or blocked by some networks, so the
  // pushed question may never arrive. Poll the live state every few seconds and
  // refetch the moment the tab regains focus so the phone always catches up.
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    const pull = async () => {
      const { data } = await supabase
        .from('wedding_games')
        .select('live_state')
        .eq('id', gameId)
        .maybeSingle();
      if (cancelled || !data) return;
      const next = (data.live_state ?? {}) as LiveState;
      setLive((prev) =>
        prev.active_question_id === next.active_question_id && prev.started_at === next.started_at
          ? prev // unchanged — avoid needless re-render / round reset
          : next
      );
    };
    const id = setInterval(pull, 3000);
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
  }, [gameId]);

  // When a new question is launched, load it and reset round state.
  useEffect(() => {
    const qid = live.active_question_id;
    if (!qid) {
      setQuestion(null);
      loadedFor.current = null;
      return;
    }
    if (loadedFor.current === qid) return;
    loadedFor.current = qid;
    setOrder([]);
    setResult(null);
    setAnswered(false);

    const supabase = createClient();
    (async () => {
      const { data: q } = await supabase
        .from('questions')
        .select('id, prompt, options')
        .eq('id', qid)
        .maybeSingle();
      if (q) setQuestion(q as Question);
      // If the guest already answered this one (e.g. refresh), lock it.
      const { data: prev } = await supabase
        .from('question_responses')
        .select('id')
        .eq('guest_id', guestId)
        .eq('question_id', qid)
        .maybeSingle();
      if (prev) setAnswered(true);
    })();
  }, [live.active_question_id, guestId]);

  // Countdown timer.
  useEffect(() => {
    if (!live.active_question_id || !live.started_at) return;
    const deadline = new Date(live.started_at).getTime() + (live.duration_ms ?? 20000);
    const tick = () => setTimeLeft(Math.max(0, deadline - Date.now()));
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [live.active_question_id, live.started_at, live.duration_ms]);

  const submit = useCallback(
    async (finalOrder: string[]) => {
      if (answered || result || !question || !live.started_at) return;
      setAnswered(true);
      const responseMs = Date.now() - new Date(live.started_at).getTime();

      const supabase = createClient();
      const { data, error } = await supabase.rpc('submit_order_answer', {
        p_guest_id: guestId,
        p_question_id: question.id,
        p_answer: finalOrder,
        p_response_ms: responseMs,
      });
      if (!error && data) {
        const r = data as Result;
        setResult(r);
        if (r.points > 0) setEarned((e) => e + r.points);
      }
    },
    [answered, result, question, live.started_at, guestId]
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

  return (
    <main style={bg} className="wc-aurora relative flex min-h-dvh flex-col items-center justify-center gap-5 overflow-hidden px-5 py-10 text-center text-white">
      <GuestBackdrop accent={colors.accent} />
      <div className="relative z-10 flex items-center gap-2 text-sm font-semibold text-white/80">
        <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: colors.accent }} />
        ⚡ {title}
      </div>

      {!question ? (
        <div className="wc-pop relative z-10 max-w-sm">
          <div className="wc-bob mb-3 text-5xl">⏳</div>
          <p className="text-lg text-white/90">Waiting for the host to launch the next question…</p>
          <p className="mt-1 text-sm text-white/60">Get ready — tap the options into the right order, fast! 🏃</p>
        </div>
      ) : (
        <div className="relative z-10 w-full max-w-md">
          {/* timer */}
          <div className="mb-3 text-center">
            <span
              className="inline-grid h-14 w-14 place-items-center rounded-full text-2xl font-bold text-gray-900"
              style={{ background: timeUp ? '#e5e7eb' : colors.accent }}
            >
              {timeUp ? '⏰' : secs}
            </span>
          </div>

          <div className="wc-pop rounded-3xl bg-white p-6 text-gray-900 shadow-2xl">
            <h2 className="mb-2 text-xl font-semibold">{question.prompt}</h2>
            <p className="mb-5 text-sm text-gray-500">
              {result
                ? 'Round over'
                : answered
                  ? 'Answer locked in ⏳'
                  : `Tap in the correct order (${order.length}/${question.options.length})`}
            </p>

            <div className="grid gap-3">
              {question.options.map((opt) => {
                const pickedAt = order.indexOf(opt); // -1 if not yet tapped
                const isPicked = pickedAt !== -1;
                // After the result, colour by whether the option sits in the right slot.
                const correctSlot = correctSeq.indexOf(opt);
                const inRightPlace = result && pickedAt === correctSlot;

                let cls = 'border-gray-200 bg-white hover:border-fuchsia-300';
                if (result) cls = inRightPlace ? 'border-green-500 bg-green-50 text-green-800' : 'border-red-300 bg-red-50 text-red-700';
                else if (isPicked) cls = 'border-fuchsia-400 bg-fuchsia-50 text-fuchsia-800';
                else if (answered || timeUp) cls = 'border-gray-200 bg-white opacity-60';

                return (
                  <button
                    key={opt}
                    disabled={isPicked || answered || timeUp}
                    onClick={() => tap(opt)}
                    className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left font-medium transition ${cls}`}
                  >
                    <span
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold"
                      style={{
                        background: isPicked || result ? colors.primary : '#f3f4f6',
                        color: isPicked || result ? '#fff' : '#9ca3af',
                      }}
                    >
                      {isPicked ? pickedAt + 1 : '·'}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>

            {/* Undo, only while still building the sequence */}
            {!answered && !result && order.length > 0 && (
              <button onClick={undo} className="mt-4 text-sm font-medium text-gray-500 hover:text-gray-800">
                ↩ Undo last
              </button>
            )}

            {result && (
              <div className="mt-4">
                <p className="font-semibold" style={{ color: result.correct ? '#16a34a' : '#6b7280' }}>
                  {result.correct ? `🎉 Correct order! +${result.points} points` : 'Not the right order 😅'}
                </p>
                {!result.correct && correctSeq.length > 0 && (
                  <p className="mt-1 text-sm text-gray-500">
                    Correct: {correctSeq.join(' → ')}
                  </p>
                )}
              </div>
            )}
            {answered && !result && <p className="mt-4 text-sm text-gray-500">Answer locked in ⏳</p>}
            {timeUp && !answered && <p className="mt-4 text-sm text-gray-500">Time&apos;s up! ⏰</p>}
          </div>
        </div>
      )}

      <div className="relative z-10 text-sm text-white/70">Your points this round: {earned}</div>
      <Link href={`${base}/leaderboard`} className="wc-btn relative z-10 rounded-full bg-white/20 px-6 py-2.5 text-sm font-semibold text-white backdrop-blur">
        🏆 Leaderboard
      </Link>
    </main>
  );
}
