'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { TriviaQuestion } from './page';

type Colors = { primary: string; accent: string; secondary: string; logo?: string };
type Result = { correct: boolean; points: number; correct_answer: string };

export default function TriviaGame({
  slug,
  guestId,
  title,
  questions,
  answeredIds,
  colors,
}: {
  slug: string;
  gameId: string;
  guestId: string;
  title: string;
  questions: TriviaQuestion[];
  answeredIds: string[];
  colors: Colors;
}) {
  const answered = useMemo(() => new Set(answeredIds), [answeredIds]);
  // Start at the first not-yet-answered question.
  const firstUnanswered = questions.findIndex((q) => !answered.has(q.id));
  const [index, setIndex] = useState(firstUnanswered === -1 ? questions.length : firstUnanswered);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [earned, setEarned] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bg = { background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` };
  const done = index >= questions.length;
  const q = done ? null : questions[index];

  async function choose(option: string) {
    if (busy || result || !q) return;
    setBusy(true);
    setSelected(option);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.rpc('submit_quiz_answer', {
      p_guest_id: guestId,
      p_question_id: q.id,
      p_answer: option,
      p_response_ms: null,
    });

    if (error) {
      setError(error.message);
      setSelected(null);
      setBusy(false);
      return;
    }
    const r = data as Result;
    setResult(r);
    if (r.points > 0) setEarned((e) => e + r.points);
    setBusy(false);
  }

  function next() {
    setSelected(null);
    setResult(null);
    setError(null);
    setIndex((i) => i + 1);
  }

  if (questions.length === 0) {
    return (
      <Shell bg={bg}>
        <p className="text-lg">No questions yet — check back soon! 🎪</p>
        <BackLink slug={slug} />
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell bg={bg}>
        <div className="text-6xl">🏆</div>
        <h1 className="font-serif text-3xl font-bold">All done!</h1>
        <p className="text-white/90">
          You earned <span className="font-bold" style={{ color: colors.accent }}>{earned}</span> points
          this round.
        </p>
        <div className="mt-2 flex gap-3">
          <Link href={`/${slug}/leaderboard`} className="rounded-full bg-white px-6 py-3 font-semibold" style={{ color: colors.secondary }}>
            🏆 Leaderboard
          </Link>
          <Link href={`/${slug}/play`} className="rounded-full bg-white/20 px-6 py-3 font-semibold text-white backdrop-blur">
            More games
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell bg={bg}>
      <div className="w-full max-w-md">
        <div className="mb-4 flex items-center justify-between text-sm text-white/80">
          <span className="font-semibold">{title}</span>
          <span>
            {index + 1} / {questions.length}
          </span>
        </div>

        <div className="rounded-3xl bg-white p-6 text-gray-900 shadow-2xl">
          {q!.category && (
            <span className="mb-2 inline-block rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-semibold text-fuchsia-700">
              {q!.category}
            </span>
          )}
          <h2 className="mb-5 text-xl font-semibold">{q!.prompt}</h2>

          <div className="grid gap-3">
            {q!.options.map((opt) => {
              const isChosen = selected === opt;
              const isCorrect = result && opt === result.correct_answer;
              const isWrongChoice = result && isChosen && !result.correct;
              let cls = 'border-gray-200 bg-white hover:border-fuchsia-300';
              if (isCorrect) cls = 'border-green-500 bg-green-50 text-green-800';
              else if (isWrongChoice) cls = 'border-red-400 bg-red-50 text-red-700';
              else if (result) cls = 'border-gray-200 bg-white opacity-60';
              return (
                <button
                  key={opt}
                  disabled={Boolean(result) || busy}
                  onClick={() => choose(opt)}
                  className={`rounded-2xl border-2 px-4 py-3.5 text-left font-medium transition ${cls}`}
                >
                  {isCorrect ? '✓ ' : isWrongChoice ? '✕ ' : ''}
                  {opt}
                </button>
              );
            })}
          </div>

          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

          {result && (
            <div className="mt-5 flex items-center justify-between">
              <span className="font-semibold" style={{ color: result.correct ? '#16a34a' : '#6b7280' }}>
                {result.correct ? `🎉 +${result.points} points!` : 'Not this time 😅'}
              </span>
              <button
                onClick={next}
                className="rounded-full px-6 py-2.5 font-semibold text-white"
                style={{ background: colors.primary }}
              >
                {index + 1 === questions.length ? 'Finish' : 'Next →'}
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 text-center text-sm text-white/70">Session points: {earned}</div>
      </div>
    </Shell>
  );
}

function Shell({ bg, children }: { bg: React.CSSProperties; children: React.ReactNode }) {
  return (
    <main style={bg} className="flex min-h-dvh flex-col items-center justify-center gap-4 px-5 py-10 text-center text-white">
      {children}
    </main>
  );
}

function BackLink({ slug }: { slug: string }) {
  return (
    <Link href={`/${slug}/play`} className="mt-4 inline-block rounded-full bg-white/20 px-6 py-3 font-semibold text-white backdrop-blur">
      ← Back to games
    </Link>
  );
}
