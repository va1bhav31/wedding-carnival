'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import GameHeader, { check, cross } from '@/components/GameHeader';
import type { TriviaQuestion } from './page';

type Colors = { primary: string; accent: string; secondary: string; logo?: string };
type Result = { correct: boolean; points: number; correct_answer: string };

export default function TriviaGame({
  base,
  gameId,
  title,
  questions,
  answeredIds,
}: {
  base: string;
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

  const done = index >= questions.length;
  const q = done ? null : questions[index];

  async function choose(option: string) {
    if (busy || result || !q) return;
    setBusy(true);
    setSelected(option);
    setError(null);

    try {
      const res = await fetch(`${base}/game/${gameId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: q.id, answer: option }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Something went wrong. Try again.');
        setSelected(null);
        setBusy(false);
        return;
      }
      const r = data as Result;
      setResult(r);
      if (r.points > 0) setEarned((e) => e + r.points);
    } catch {
      setError('Connection issue, check your signal and try again.');
      setSelected(null);
    }
    setBusy(false);
  }

  function next() {
    setSelected(null);
    setResult(null);
    setError(null);
    setIndex((i) => i + 1);
  }

  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
  const header = (
    <GameHeader
      base={base}
      title={title}
      right={
        <>
          <b className="num">{earned}</b> pts
        </>
      }
    />
  );

  if (questions.length === 0) {
    return (
      <>
        {header}
        <main className="g-stage">
          <div className="quiet">
            <h1>No questions yet</h1>
            <p>The couple is still writing them. Check back in a little while.</p>
            <div className="g-actions">
              <Link href={`${base}/play`} className="btn btn-quiet btn-block">
                Back to games
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (done) {
    return (
      <>
        {header}
        <main className="g-stage">
          <div className="quiet">
            <p className="big-num champ num">{earned}</p>
            <h1 style={{ marginTop: 14 }}>That&apos;s every question</h1>
            <p>Points from this session count towards tonight&apos;s leaderboard.</p>
            <div className="g-actions">
              <Link href={`${base}/game/${gameId}/leaderboard`} className="btn btn-primary btn-block">
                See the leaderboard
              </Link>
              <Link href={`${base}/play`} className="btn btn-quiet btn-block">
                More games
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      {header}
      <main className="g-stage">
        <section className="g-col">
          <p className="g-meta">
            <span className="num">
              Question {index + 1} of {questions.length}
            </span>
            <span>{q!.category || 'How well do you know them?'}</span>
          </p>
          <h1 className="g-prompt">{q!.prompt}</h1>

          <ol className="opts">
            {q!.options.map((opt, i) => {
              const isChosen = selected === opt;
              const isCorrect = Boolean(result) && opt === result!.correct_answer;
              const isWrong = Boolean(result) && isChosen && !result!.correct;
              let cls = 'opt';
              if (isCorrect) cls += ' is-right';
              else if (isWrong) cls += ' is-wrong';
              else if (result) cls += ' is-dim';
              else if (isChosen) cls += ' is-picked';
              return (
                <li key={opt}>
                  <button type="button" className={cls} disabled={Boolean(result) || busy} onClick={() => choose(opt)}>
                    <span className="mark">{isCorrect ? check : isWrong ? cross : LETTERS[i]}</span>
                    <span>{opt}</span>
                    {isCorrect && <span className="tag">Right answer</span>}
                    {isWrong && <span className="tag">Your pick</span>}
                  </button>
                </li>
              );
            })}
          </ol>

          {!result && !error && (
            <p className="g-hint" aria-live="polite">
              {busy ? 'Locked in.' : 'Pick one. You get one try.'}
            </p>
          )}
          {error && (
            <p className="g-error" role="alert">
              {error}
            </p>
          )}

          {result && (
            <div className="result" aria-live="polite">
              {result.correct ? (
                <p className="result-head">
                  Right <span className="result-pts">+{result.points}</span>
                </p>
              ) : (
                <>
                  <p className="result-head">Not quite</p>
                  <p className="result-note">The answer: {result.correct_answer}</p>
                </>
              )}
            </div>
          )}

          {result && (
            <div className="g-actions">
              <button type="button" className="btn btn-primary btn-block" onClick={next}>
                {index + 1 === questions.length ? 'Finish' : 'Next question'}
              </button>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
