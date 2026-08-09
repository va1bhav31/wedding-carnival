'use client';

// Fastest Finger "Live control": Launch All runs every question in order,
// automatically — 20s live per question, a 10s "next question" heads-up
// screen in between — with the existing one-at-a-time manual launch kept
// available underneath for finer control. The sequence is driven entirely by
// this browser tab (setTimeout/interval calling the same server actions the
// manual buttons use), so the host's control tab needs to stay open while it
// runs — same expectation as any live-hosted quiz tool.

import { useCallback, useEffect, useRef, useState } from 'react';
import { launchQuestion, setUpcomingQuestion, clearQuestion } from '@/lib/actions/games';
import { FF_DURATION_MS, FF_GAP_MS } from '@/lib/ff-timing';

type Question = { id: string; prompt: string };

function fd(weddingId: string, gameId: string, extra: Record<string, string> = {}) {
  const f = new FormData();
  f.set('wedding_id', weddingId);
  f.set('game_id', gameId);
  for (const [k, v] of Object.entries(extra)) f.set(k, v);
  return f;
}

/** Cancellable delay that reports remaining ms via onTick, ~5x/sec. */
function sleep(ms: number, cancelledRef: { current: boolean }, onTick: (msLeft: number) => void): Promise<boolean> {
  return new Promise((resolve) => {
    const start = Date.now();
    const id = setInterval(() => {
      if (cancelledRef.current) {
        clearInterval(id);
        resolve(false);
        return;
      }
      const left = Math.max(0, ms - (Date.now() - start));
      onTick(left);
      if (left <= 0) {
        clearInterval(id);
        resolve(true);
      }
    }, 200);
  });
}

export default function FastestFingerLive({
  weddingId,
  gameId,
  questions,
  initialActiveId,
}: {
  weddingId: string;
  gameId: string;
  questions: Question[];
  initialActiveId: string | null;
}) {
  const [running, setRunning] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(initialActiveId);
  const [phase, setPhase] = useState<'question' | 'gap' | null>(null);
  const [index, setIndex] = useState<number | null>(null);
  const [msLeft, setMsLeft] = useState(0);
  const cancelledRef = useRef(false);

  useEffect(() => () => {
    cancelledRef.current = true; // stop the loop if the panel unmounts
  }, []);

  const stop = useCallback(() => {
    cancelledRef.current = true;
    setRunning(false);
    setPhase(null);
    setIndex(null);
  }, []);

  const launchAll = useCallback(async () => {
    if (running || questions.length === 0) return;
    cancelledRef.current = false;
    setRunning(true);
    for (let i = 0; i < questions.length; i++) {
      if (cancelledRef.current) break;
      const q = questions[i];
      setIndex(i);
      setPhase('question');
      setActiveId(q.id);
      await launchQuestion(fd(weddingId, gameId, { question_id: q.id }));
      const finished = await sleep(FF_DURATION_MS, cancelledRef, setMsLeft);
      if (!finished || cancelledRef.current) break;

      if (i < questions.length - 1) {
        setPhase('gap');
        setActiveId(null);
        await setUpcomingQuestion(fd(weddingId, gameId));
        const gapDone = await sleep(FF_GAP_MS, cancelledRef, setMsLeft);
        if (!gapDone || cancelledRef.current) break;
      }
    }
    if (!cancelledRef.current) {
      await clearQuestion(fd(weddingId, gameId));
      setActiveId(null);
      setPhase(null);
      setIndex(null);
    }
    setRunning(false);
  }, [running, questions, weddingId, gameId]);

  const endNow = useCallback(async () => {
    stop();
    setActiveId(null);
    await clearQuestion(fd(weddingId, gameId));
  }, [stop, weddingId, gameId]);

  const launchOne = useCallback(
    async (questionId: string) => {
      stop(); // manual launch always takes over from any running sequence
      setActiveId(questionId);
      await launchQuestion(fd(weddingId, gameId, { question_id: questionId }));
    },
    [stop, weddingId, gameId]
  );

  const secs = Math.ceil(msLeft / 1000);

  return (
    <div className="grid gap-4">
      {/* Launch All */}
      <div className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-900">Launch all</h3>
            <p className="mt-0.5 text-sm text-gray-600">
              Runs every question automatically — 20s live, then a 10s &quot;next question&quot;
              screen, on repeat until the list is done.
            </p>
          </div>
          {running ? (
            <button
              onClick={endNow}
              className="shrink-0 rounded-full bg-gray-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-black"
            >
              ■ Stop
            </button>
          ) : (
            <button
              onClick={launchAll}
              disabled={questions.length === 0}
              className="shrink-0 rounded-full bg-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-fuchsia-700 disabled:opacity-40"
            >
              ▶ Launch all questions
            </button>
          )}
        </div>
        {running && index !== null && (
          <p className="mt-3 text-sm font-medium text-fuchsia-700">
            {phase === 'question'
              ? `Question ${index + 1} of ${questions.length} — live, ${secs}s left`
              : `Next question (${index + 2} of ${questions.length}) in ${secs}s…`}
          </p>
        )}
      </div>

      {/* Manual, one at a time */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Or launch one at a time
          </p>
          {activeId && !running && (
            <button onClick={endNow} className="text-sm font-semibold text-gray-600 hover:text-gray-900">
              End question
            </button>
          )}
        </div>
        {questions.length === 0 ? (
          <p className="text-sm text-gray-400">Add questions above first.</p>
        ) : (
          <ul className="grid gap-2">
            {questions.map((q, i) => {
              const isActive = activeId === q.id;
              return (
                <li key={q.id} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2">
                  <span className="text-sm text-gray-800">
                    {i + 1}. {q.prompt}
                  </span>
                  <button
                    onClick={() => launchOne(q.id)}
                    disabled={running}
                    className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold disabled:opacity-40 ${
                      isActive ? 'bg-green-600 text-white' : 'bg-fuchsia-600 text-white hover:bg-fuchsia-700'
                    }`}
                  >
                    {isActive ? '● Live now' : 'Launch'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
