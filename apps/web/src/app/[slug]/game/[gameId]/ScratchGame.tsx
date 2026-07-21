'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import GuestBackdrop from '@/components/GuestBackdrop';

type Colors = { primary: string; accent: string; secondary: string; logo?: string };
type Prize = { label: string; message: string | null; is_winner: boolean; already: boolean };

export default function ScratchGame({
  base,
  gameId,
  guestId,
  title,
  colors,
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const drawing = useRef(false);

  const bg = { backgroundImage: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary}, ${colors.primary})` };

  // Assign the prize server-side as soon as the card opens.
  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data, error } = await supabase.rpc('scratch_card', {
        p_guest_id: guestId,
        p_wedding_game_id: gameId,
      });
      if (error) {
        setError(error.message);
        return;
      }
      setPrize(data as Prize);
    })();
  }, [guestId, gameId]);

  const doReveal = useCallback(() => {
    if (revealed) return;
    setRevealed(true);
    if (prize?.is_winner) confettiBurst();
  }, [revealed, prize]);

  // Set up the scratch surface once we have the prize.
  useEffect(() => {
    if (!prize || revealed) return;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const r = wrap.getBoundingClientRect();
    canvas.width = r.width;
    canvas.height = r.height;
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, colors.primary);
    grad.addColorStop(1, colors.secondary);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.font = '600 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✨ Scratch here ✨', canvas.width / 2, canvas.height / 2);
    ctx.globalCompositeOperation = 'destination-out';

    const pos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const p = 'touches' in e ? e.touches[0] : e;
      return { x: p.clientX - rect.left, y: p.clientY - rect.top };
    };
    const scratch = (x: number, y: number) => {
      ctx.beginPath();
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.fill();
      checkCleared();
    };
    const checkCleared = () => {
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let clear = 0;
      for (let i = 3; i < data.length; i += 64) if (data[i] === 0) clear++;
      if (clear / (data.length / 64) > 0.5) doReveal();
    };

    const down = () => (drawing.current = true);
    const up = () => (drawing.current = false);
    const move = (e: MouseEvent) => {
      if (!drawing.current) return;
      const { x, y } = pos(e);
      scratch(x, y);
    };
    const tmove = (e: TouchEvent) => {
      e.preventDefault();
      const { x, y } = pos(e);
      scratch(x, y);
    };

    canvas.addEventListener('mousedown', down);
    window.addEventListener('mouseup', up);
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); const { x, y } = pos(e); scratch(x, y); }, { passive: false });
    canvas.addEventListener('touchmove', tmove, { passive: false });
    return () => {
      canvas.removeEventListener('mousedown', down);
      window.removeEventListener('mouseup', up);
      canvas.removeEventListener('mousemove', move);
      canvas.removeEventListener('touchmove', tmove);
    };
  }, [prize, revealed, colors, doReveal]);

  return (
    <main style={bg} className="wc-aurora relative flex min-h-dvh flex-col items-center justify-center gap-5 overflow-hidden px-5 py-10 text-center text-white">
      <GuestBackdrop accent={colors.accent} />
      <div className="relative z-10 text-sm font-semibold text-white/80">🎁 {title}</div>

      {error ? (
        <div className="relative z-10 max-w-sm">
          <p className="text-white/90">{error}</p>
          <Link href={`${base}/play`} className="wc-btn mt-4 inline-block rounded-full bg-white/20 px-6 py-3 font-semibold text-white backdrop-blur">
            ← Back to games
          </Link>
        </div>
      ) : !prize ? (
        <p className="relative z-10 text-lg text-white/90">Preparing your card… 🎫</p>
      ) : (
        <>
          <div
            ref={wrapRef}
            className="wc-pop relative z-10 h-56 w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            {/* Prize underneath */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
              <div className="text-5xl">{prize.is_winner ? '🎁' : '✨'}</div>
              <div className={`font-serif text-xl font-bold ${prize.is_winner ? 'text-fuchsia-700' : 'text-gray-800'}`}>
                {prize.label}
              </div>
              {prize.message && <div className="text-sm text-gray-500">{prize.message}</div>}
            </div>
            {/* Scratch layer */}
            {!revealed && (
              <canvas ref={canvasRef} className="absolute inset-0 h-full w-full cursor-grab touch-none" />
            )}
          </div>

          {revealed ? (
            <div className="wc-rise relative z-10 max-w-sm">
              <p className="text-lg font-semibold">
                {prize.is_winner ? '🎉 You’re a lucky winner!' : 'A little blessing for you 💖'}
              </p>
              <p className="mt-1 text-sm text-white/80">
                {prize.already ? 'You’ve already scratched this card.' : 'Show this to the couple to claim it.'}
              </p>
              <Link href={`${base}/play`} className="wc-btn mt-4 inline-block rounded-full bg-white px-6 py-3 font-semibold" style={{ color: colors.secondary }}>
                ← More games
              </Link>
            </div>
          ) : (
            <p className="relative z-10 text-sm text-white/70">Scratch the card to reveal your surprise! 🪙</p>
          )}
        </>
      )}
    </main>
  );
}

function confettiBurst() {
  const emojis = ['🎉', '✨', '🎊', '🎁', '💖'];
  for (let i = 0; i < 70; i++) {
    const c = document.createElement('div');
    c.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    c.style.cssText = `position:fixed;left:${50 + (Math.random() - 0.5) * 40}%;top:45%;font-size:${12 + Math.random() * 18}px;pointer-events:none;z-index:999`;
    document.body.appendChild(c);
    const ang = Math.random() * Math.PI * 2;
    const vel = 120 + Math.random() * 280;
    c.animate(
      [
        { transform: 'translate(0,0)', opacity: 1 },
        { transform: `translate(${Math.cos(ang) * vel}px,${Math.sin(ang) * vel + 350}px) rotate(${Math.random() * 720}deg)`, opacity: 0 },
      ],
      { duration: 1600 + Math.random() * 800, easing: 'cubic-bezier(.2,.6,.4,1)' }
    );
    setTimeout(() => c.remove(), 2500);
  }
}
