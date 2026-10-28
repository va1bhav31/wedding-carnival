'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import GameHeader from '@/components/GameHeader';

type Colors = { primary: string; accent: string; secondary: string; logo?: string };
type Prize = { label: string; message: string | null; is_winner: boolean; already: boolean };

export default function ScratchGame({
  base,
  gameId,
  title,
}: {
  base: string;
  gameId: string;
  guestId: string;
  title: string;
  colors: Colors;
}) {
  const [prize, setPrize] = useState<Prize | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Assign the prize server-side as soon as the card opens. Wrapped in a
  // timeout + retry — this previously called Supabase directly from the
  // browser with nothing to fall back on, so a flaky connection meant
  // "Preparing your card…" forever with no way out.
  useEffect(() => {
    let cancelled = false;
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    (async () => {
      try {
        const res = await fetch(`${base}/game/${gameId}/scratch`, {
          method: 'POST',
          signal: controller.signal,
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data?.error || 'Could not open your card. Try again.');
          return;
        }
        setPrize(data as Prize);
      } catch {
        if (!cancelled) setError('Connection issue, check your signal and try again.');
      } finally {
        clearTimeout(timeout);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [gameId, base, attempt]);

  const doReveal = useCallback(() => setRevealed(true), []);

  // A card scratched on an earlier visit opens already revealed.
  const shown = revealed || Boolean(prize?.already);

  // The foil: a fine champagne grain with script lettering, scratched away
  // with a finger. Waits for the script face so the lettering draws in it.
  useEffect(() => {
    if (!prize || shown) return;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    let cancelled = false;
    let down = false;
    let strokes = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const paint = () => {
      if (cancelled) return;
      const r = wrap.getBoundingClientRect();
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      const { width: w, height: h } = canvas;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#f2e900';
      ctx.fillRect(0, 0, w, h);
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const n = (Math.random() - 0.5) * 34;
        d[i] += n;
        d[i + 1] += n * 0.9;
        d[i + 2] += n * 0.7;
      }
      ctx.putImageData(img, 0, 0);
      const family = getComputedStyle(wrap).getPropertyValue('--ev-font-script').trim();
      ctx.fillStyle = 'rgba(44, 39, 35, 0.86)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${Math.round(h * 0.17)}px ${family || 'Georgia'}, Georgia, serif`;
      ctx.fillText('Scratch here', w / 2, h / 2);
    };

    const cleared = () => {
      const { width: w, height: h } = canvas;
      const data = ctx.getImageData(0, 0, w, h).data;
      let clear = 0;
      let total = 0;
      for (let y = 0; y < h; y += 12) {
        for (let x = 0; x < w; x += 12) {
          total += 1;
          if (data[(y * w + x) * 4 + 3] < 40) clear += 1;
        }
      }
      return clear / total;
    };

    const at = (e: PointerEvent): [number, number] => {
      const r = canvas.getBoundingClientRect();
      return [(e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr];
    };
    const scratch = ([x, y]: [number, number]) => {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, 26 * dpr, 0, Math.PI * 2);
      ctx.fill();
      strokes += 1;
      if (strokes % 10 === 0 && cleared() > 0.5) doReveal();
    };
    const onDown = (e: PointerEvent) => {
      down = true;
      canvas.setPointerCapture(e.pointerId);
      scratch(at(e));
    };
    const onMove = (e: PointerEvent) => {
      if (down) scratch(at(e));
    };
    const onUp = () => {
      down = false;
    };

    (document.fonts ? document.fonts.ready : Promise.resolve()).then(paint);
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    return () => {
      cancelled = true;
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
    };
  }, [prize, shown, doReveal]);

  return (
    <>
      <GameHeader base={base} title={title} />
      <main className="g-stage">
        {error ? (
          <div className="quiet">
            <h1>Your card didn&apos;t load</h1>
            <p>{error}</p>
            <div className="g-actions">
              <button type="button" className="btn btn-primary btn-block" onClick={() => setAttempt((a) => a + 1)}>
                Try again
              </button>
              <Link href={`${base}/play`} className="btn btn-quiet btn-block">
                Back to games
              </Link>
            </div>
          </div>
        ) : !prize ? (
          <div className="quiet">
            <div className="ev-spinner" aria-hidden="true" />
            <h1>Preparing your card</h1>
            <p>One card per guest. It&apos;s being drawn for you now.</p>
          </div>
        ) : (
          <section className="g-col">
            <h1 className="g-prompt">{prize.already ? 'You’ve already scratched your card' : 'Your card from the couple'}</h1>
            {!prize.already && <p className="g-hint">Scratch it with your finger to see what&apos;s inside.</p>}

            <div className="card" ref={wrapRef}>
              <div className="card-face">
                <p className="kind">{prize.is_winner ? 'You’ve won' : 'A blessing'}</p>
                <p className="prize">{prize.label}</p>
                {prize.message && <p className="g-hint">{prize.message}</p>}
              </div>
              {!shown && (
                <canvas ref={canvasRef} role="img" aria-label="Scratch card. Drag your finger across it to reveal what's inside." />
              )}
            </div>

            <p className="card-note" aria-live="polite">
              {!shown
                ? 'Scratch with your finger.'
                : prize.is_winner
                  ? 'Show this screen to the couple to claim it.'
                  : prize.already
                    ? 'Here it is again, in case you want to show someone.'
                    : 'A little something from the couple.'}
            </p>

            {shown && (
              <div className="g-actions">
                <Link href={`${base}/play`} className="btn btn-quiet btn-block">
                  Back to games
                </Link>
              </div>
            )}
          </section>
        )}
      </main>
    </>
  );
}
