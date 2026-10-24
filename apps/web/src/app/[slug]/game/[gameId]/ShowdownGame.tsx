'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import GameHeader, { check } from '@/components/GameHeader';
import type { TriviaQuestion } from './page';

type Colors = { primary: string; accent: string; secondary: string; logo?: string };
type Result = { correct: boolean; points: number; correct_answer: string };

export default function ShowdownGame({
  base,
  gameId,
  title,
  questions,
  answeredIds,
  names,
}: {
  base: string;
  gameId: string;
  guestId: string;
  title: string;
  questions: TriviaQuestion[];
  answeredIds: string[];
  colors: Colors;
  names: { bride: string; groom: string };
}) {
  const answered = useMemo(() => new Set(answeredIds), [answeredIds]);
  const firstUnanswered = questions.findIndex((q) => !answered.has(q.id));
  const [index, setIndex] = useState(firstUnanswered === -1 ? questions.length : firstUnanswered);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [earned, setEarned] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const done = index >= questions.length;
  const q = done ? null : questions[index];
  const sides = [
    { value: 'bride', name: names.bride, role: 'the bride' },
    { value: 'groom', name: names.groom, role: 'the groom' },
  ];
  const nameFor = (side: string) => (side === 'groom' ? names.groom : names.bride);

  async function choose(side: string) {
    if (busy || result || !q) return;
    setBusy(true);
    setSelected(side);
    setError(null);
    try {
      const res = await fetch(`${base}/game/${gameId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: q.id, answer: side }),
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
            <h1 style={{ marginTop: 14 }}>Showdown complete</h1>
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
            <span>Who&apos;s more likely?</span>
          </p>
          <h1 className="g-prompt">{q!.prompt}</h1>

          <div className="sides">
            {sides.map((s) => {
              const isChosen = selected === s.value;
              const isCorrect = Boolean(result) && s.value === result!.correct_answer;
              const isWrong = Boolean(result) && isChosen && !result!.correct;
              let cls = 'side-card';
              if (isCorrect) cls += ' is-right';
              else if (isWrong) cls += ' is-wrong';
              else if (result) cls += ' is-dim';
              else if (isChosen) cls += ' is-picked';
              return (
                <button key={s.value} type="button" className={cls} disabled={Boolean(result) || busy} onClick={() => choose(s.value)}>
                  {isCorrect && <span className="badge">{check}</span>}
                  {isWrong && <span className="yours">Your pick</span>}
                  <span className="side-name">{s.name}</span>
                  <span className="side-role">{s.role}</span>
                </button>
              );
            })}
          </div>

          {!result && !error && (
            <p className="g-hint" aria-live="polite">
              {busy ? 'Locked in.' : 'Tap a name. The couple’s own answer is the right one.'}
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
                  You know them well <span className="result-pts">+{result.points}</span>
                </p>
              ) : (
                <p className="result-head">Not this time</p>
              )}
              <p className="result-note">It&apos;s {nameFor(result.correct_answer)}, says the couple.</p>
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
