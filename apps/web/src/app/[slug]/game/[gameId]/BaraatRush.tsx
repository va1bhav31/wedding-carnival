'use client';

// Baraat Rush — endless runner (Subway-Surfers style, no finish line).
// Pseudo-3D canvas: 3 lanes converging on a palace gate, groom on horseback,
// Indian-wedding obstacles (car, cow, photographer, dancing uncle, giant dhol,
// barricade), WC coins / rings / hearts to collect. Three difficulties.
// Scores are submitted server-side (best per guest feeds the leaderboard).

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type Colors = { primary: string; accent: string; secondary: string; logo?: string };
type Phase = 'menu' | 'playing' | 'paused' | 'over';
type Difficulty = 'easy' | 'medium' | 'hard';

const DIFF: Record<
  Difficulty,
  { label: string; blurb: string; speed: number; ramp: number; cap: number; gap: number; lives: number; double: number }
> = {
  easy: { label: 'Easy', blurb: '3 lives · a lively trot', speed: 15, ramp: 0.18, cap: 27, gap: 34, lives: 3, double: 0.2 },
  medium: { label: 'Medium', blurb: '2 lives · full baraat pace', speed: 18, ramp: 0.26, cap: 32, gap: 28, lives: 2, double: 0.34 },
  hard: { label: 'Hard', blurb: '1 life · dhol on fire', speed: 21, ramp: 0.34, cap: 38, gap: 23, lives: 1, double: 0.5 },
};

type ObKind = 'car' | 'cow' | 'photog' | 'uncle' | 'dhol' | 'barrier';
type PickKind = 'coin' | 'ring' | 'heart';
type Obj = { kind: ObKind | PickKind; lane: number; z: number; seed: number; taken?: boolean };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; r: number };

const OBSTACLES: ObKind[] = ['car', 'cow', 'photog', 'uncle', 'dhol', 'barrier'];
const MAX_LIVES = 3;
const SPAWN_Z = 130;

type Game = {
  phase: Phase;
  diff: Difficulty;
  t: number;
  speed: number;
  dist: number;
  score: number;
  coins: number;
  lives: number;
  laneF: number; // fractional lane for smooth switching
  laneT: number; // target lane (-1 | 0 | 1)
  inv: number; // invincibility seconds left
  shake: number;
  sinceSpawn: number;
  freeLane: number;
  objs: Obj[];
  parts: Particle[];
  hintT: number;
};

function freshGame(diff: Difficulty): Game {
  return {
    phase: 'playing',
    diff,
    t: 0,
    speed: DIFF[diff].speed,
    dist: 0,
    score: 0,
    coins: 0,
    lives: DIFF[diff].lives,
    laneF: 0,
    laneT: 0,
    inv: 0,
    shake: 0,
    sinceSpawn: DIFF[diff].gap * 0.5,
    freeLane: 0,
    objs: [],
    parts: [],
    hintT: 4,
  };
}

/* ---------- tiny helpers ---------- */
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const m = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + m, y);
  ctx.arcTo(x + w, y, x + w, y + h, m);
  ctx.arcTo(x + w, y + h, x, y + h, m);
  ctx.arcTo(x, y + h, x, y, m);
  ctx.arcTo(x, y, x + w, y, m);
  ctx.closePath();
}
function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export default function BaraatRush({
  base,
  gameId,
  title,
  colors,
}: {
  base: string;
  gameId: string;
  title: string;
  colors: Colors;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game>({ ...freshGame('medium'), phase: 'menu' });
  const [phase, setPhase] = useState<Phase>('menu');
  const [finalScore, setFinalScore] = useState(0);
  const [best, setBest] = useState<number | null>(null);
  const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'saved' | 'improved' | 'failed'>('idle');

  const setPhaseBoth = useCallback((p: Phase) => {
    gameRef.current.phase = p;
    setPhase(p);
  }, []);

  // Existing best (for the menu).
  useEffect(() => {
    fetch(`${base}/game/${gameId}/score`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d.best === 'number') setBest(d.best);
      })
      .catch(() => {});
  }, [base, gameId]);

  const start = useCallback(
    (d: Difficulty) => {
      gameRef.current = freshGame(d);
      setSubmitState('idle');
      setPhaseBoth('playing');
    },
    [setPhaseBoth]
  );

  const gameOver = useCallback(() => {
    const g = gameRef.current;
    const score = Math.round(g.score);
    setFinalScore(score);
    setPhaseBoth('over');
    setSubmitState('saving');
    fetch(`${base}/game/${gameId}/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score, difficulty: g.diff }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (typeof d.best === 'number') setBest(d.best);
        setSubmitState(d.improved ? 'improved' : 'saved');
      })
      .catch(() => setSubmitState('failed'));
  }, [base, gameId, setPhaseBoth]);

  /* ---------- input ---------- */
  useEffect(() => {
    const move = (dir: -1 | 1) => {
      const g = gameRef.current;
      if (g.phase !== 'playing') return;
      g.laneT = Math.max(-1, Math.min(1, g.laneT + dir));
      g.hintT = 0;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') move(-1);
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') move(1);
    };
    let tx = 0,
      ty = 0,
      tt = 0;
    const onTS = (e: TouchEvent) => {
      const t = e.touches[0];
      tx = t.clientX;
      ty = t.clientY;
      tt = Date.now();
    };
    const onTE = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - tx;
      const dy = t.clientY - ty;
      if (Date.now() - tt < 600 && Math.abs(dx) > 24 && Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1);
      else if (Math.abs(dx) <= 24 && Math.abs(dy) <= 24) {
        // tap: left/right half of the screen
        const w = window.innerWidth;
        move(t.clientX > w / 2 ? 1 : -1);
      }
    };
    window.addEventListener('keydown', onKey);
    const cv = canvasRef.current;
    cv?.addEventListener('touchstart', onTS, { passive: true });
    cv?.addEventListener('touchend', onTE, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKey);
      cv?.removeEventListener('touchstart', onTS);
      cv?.removeEventListener('touchend', onTE);
    };
  }, []);

  /* ---------- game loop ---------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0,
      H = 0,
      dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = wrap.clientWidth;
      H = wrap.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    // ambient falling petals (screen space)
    const petals = Array.from({ length: 16 }, (_, i) => ({
      x: hash(i) * 1000,
      y: hash(i + 50) * 1000,
      s: 3 + hash(i + 99) * 4,
      vx: 8 + hash(i + 7) * 18,
      vy: 22 + hash(i + 13) * 30,
      r: hash(i + 31) * Math.PI,
    }));

    const F = 13; // focal length (m) for perspective
    const kOf = (z: number) => F / (F + z);

    let last = performance.now();
    let raf = 0;

    const spawnRow = (g: Game) => {
      // keep the free lane reachable from the previous free lane
      const shift = Math.floor(hash(g.dist) * 3) - 1;
      const free = Math.max(-1, Math.min(1, g.freeLane + shift));
      g.freeLane = free;
      const lanes = [-1, 0, 1].filter((l) => l !== free);
      const both = hash(g.dist + 1) < DIFF[g.diff].double;
      const chosen = both ? lanes : [lanes[Math.floor(hash(g.dist + 2) * 2)]];
      chosen.forEach((lane, i) => {
        const kind = OBSTACLES[Math.floor(hash(g.dist + 3 + i * 17) * OBSTACLES.length)];
        g.objs.push({ kind, lane, z: SPAWN_Z + i * 2, seed: hash(g.dist + lane * 7) });
      });
      // pickups trail in the free lane
      const roll = hash(g.dist + 9);
      if (roll < 0.62) {
        const n = 3 + Math.floor(hash(g.dist + 4) * 2);
        for (let i = 0; i < n; i++) {
          let kind: PickKind = 'coin';
          if (i === 1 && hash(g.dist + 5) < 0.1) kind = 'ring';
          g.objs.push({ kind, lane: free, z: SPAWN_Z + 6 + i * 4, seed: hash(g.dist + i) });
        }
      } else if (roll < 0.68) {
        g.objs.push({ kind: 'heart', lane: free, z: SPAWN_Z + 8, seed: roll });
      }
    };

    const burst = (g: Game, x: number, y: number, color: string, n = 10) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = 60 + Math.random() * 160;
        g.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: 0, max: 0.6 + Math.random() * 0.3, color, r: 2 + Math.random() * 3 });
      }
    };

    /* ================= sprites ================= */

    const shadow = (x: number, y: number, w: number) => {
      ctx.fillStyle = 'rgba(30,15,25,.28)';
      ctx.beginPath();
      ctx.ellipse(x, y, w * 0.5, w * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawHorseGroom = (x: number, y: number, w: number, t: number, lean: number) => {
      // seen from behind; w = overall width in px
      const bob = Math.sin(t * 11) * w * 0.02;
      ctx.save();
      ctx.translate(x, y + bob);
      ctx.rotate(lean * 0.14);
      shadow(0, w * 0.06 - bob, w * 1.05);

      const leg = (lx: number, phase: number) => {
        const sw = Math.sin(t * 11 + phase) * w * 0.055;
        ctx.strokeStyle = '#f3ede2';
        ctx.lineCap = 'round';
        ctx.lineWidth = w * 0.075;
        ctx.beginPath();
        ctx.moveTo(lx, -w * 0.18);
        ctx.lineTo(lx + sw, w * 0.03);
        ctx.stroke();
        ctx.fillStyle = '#5d4a3a';
        ctx.beginPath();
        ctx.ellipse(lx + sw, w * 0.045, w * 0.045, w * 0.03, 0, 0, Math.PI * 2);
        ctx.fill();
      };
      leg(-w * 0.3, 0);
      leg(w * 0.3, Math.PI);
      leg(-w * 0.18, Math.PI);
      leg(w * 0.18, 0);

      // tail
      ctx.strokeStyle = '#efe6d6';
      ctx.lineWidth = w * 0.05;
      ctx.beginPath();
      ctx.moveTo(0, -w * 0.32);
      ctx.quadraticCurveTo(w * 0.1, -w * 0.12 + Math.sin(t * 6) * w * 0.03, w * 0.04, w * 0.02);
      ctx.stroke();

      // rump
      const bodyG = ctx.createLinearGradient(-w * 0.4, 0, w * 0.4, 0);
      bodyG.addColorStop(0, '#e9e2d3');
      bodyG.addColorStop(0.5, '#fbf7ee');
      bodyG.addColorStop(1, '#ddd4c2');
      ctx.fillStyle = bodyG;
      ctx.beginPath();
      ctx.ellipse(0, -w * 0.3, w * 0.42, w * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();

      // saddle drape
      const dr = ctx.createLinearGradient(0, -w * 0.62, 0, -w * 0.3);
      dr.addColorStop(0, '#e2559b');
      dr.addColorStop(1, '#b02d72');
      ctx.fillStyle = dr;
      rr(ctx, -w * 0.36, -w * 0.56, w * 0.72, w * 0.26, w * 0.1);
      ctx.fill();
      ctx.strokeStyle = 'rgba(244,215,90,.9)';
      ctx.lineWidth = Math.max(1, w * 0.014);
      rr(ctx, -w * 0.36, -w * 0.56, w * 0.72, w * 0.26, w * 0.1);
      ctx.stroke();

      // horse neck + head peeking ahead
      ctx.fillStyle = '#f2ecdf';
      ctx.beginPath();
      ctx.moveTo(-w * 0.1, -w * 0.62);
      ctx.quadraticCurveTo(-w * 0.34, -w * 0.86, -w * 0.26, -w * 1.02);
      ctx.quadraticCurveTo(-w * 0.22, -w * 1.12, -w * 0.12, -w * 1.08);
      ctx.quadraticCurveTo(-w * 0.02, -w * 1.0, -w * 0.02, -w * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e5dcc8';
      ctx.beginPath(); // ears
      ctx.moveTo(-w * 0.24, -w * 1.1);
      ctx.lineTo(-w * 0.2, -w * 1.2);
      ctx.lineTo(-w * 0.16, -w * 1.09);
      ctx.closePath();
      ctx.fill();
      // bridle plume
      ctx.fillStyle = '#e2559b';
      ctx.beginPath();
      ctx.ellipse(-w * 0.2, -w * 1.16, w * 0.035, w * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();

      // groom torso (back)
      const sher = ctx.createLinearGradient(0, -w * 1.05, 0, -w * 0.52);
      sher.addColorStop(0, '#f8efdd');
      sher.addColorStop(1, '#e8d9ba');
      ctx.fillStyle = sher;
      rr(ctx, -w * 0.24, -w * 1.02, w * 0.48, w * 0.5, w * 0.14);
      ctx.fill();
      // embroidery
      ctx.strokeStyle = 'rgba(212,164,60,.75)';
      ctx.lineWidth = Math.max(1, w * 0.012);
      ctx.beginPath();
      ctx.moveTo(0, -w * 1.0);
      ctx.lineTo(0, -w * 0.56);
      ctx.stroke();
      // arms to reins
      ctx.strokeStyle = '#efe3c8';
      ctx.lineWidth = w * 0.09;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-w * 0.2, -w * 0.9);
      ctx.quadraticCurveTo(-w * 0.3, -w * 0.8, -w * 0.24, -w * 0.72);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w * 0.2, -w * 0.9);
      ctx.quadraticCurveTo(w * 0.3, -w * 0.82, w * 0.22, -w * 0.74);
      ctx.stroke();

      // turban + trailing safa
      ctx.fillStyle = '#d6437f';
      ctx.beginPath();
      ctx.ellipse(0, -w * 1.12, w * 0.16, w * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b02d72';
      ctx.beginPath();
      ctx.ellipse(0, -w * 1.06, w * 0.17, w * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f4d75a'; // kalgi
      ctx.beginPath();
      ctx.ellipse(0, -w * 1.2, w * 0.025, w * 0.045, 0, 0, Math.PI * 2);
      ctx.fill();
      // dupatta trail
      ctx.strokeStyle = 'rgba(226,85,155,.85)';
      ctx.lineWidth = w * 0.06;
      ctx.beginPath();
      ctx.moveTo(w * 0.08, -w * 1.06);
      ctx.quadraticCurveTo(w * 0.3 + Math.sin(t * 5) * w * 0.08, -w * 0.86, w * 0.34, -w * 0.6 + Math.sin(t * 4) * w * 0.05);
      ctx.stroke();
      ctx.restore();
    };

    const drawCar = (x: number, y: number, w: number, seed: number) => {
      ctx.save();
      ctx.translate(x, y);
      shadow(0, 0, w * 1.05);
      const body = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
      body.addColorStop(0, '#dfe2e8');
      body.addColorStop(0.5, '#ffffff');
      body.addColorStop(1, '#c9ccd4');
      ctx.fillStyle = body;
      rr(ctx, -w * 0.5, -w * 0.62, w, w * 0.55, w * 0.09);
      ctx.fill();
      // roof + rear window
      ctx.fillStyle = '#eef0f4';
      rr(ctx, -w * 0.42, -w * 0.95, w * 0.84, w * 0.4, w * 0.1);
      ctx.fill();
      ctx.fillStyle = '#3d4756';
      rr(ctx, -w * 0.36, -w * 0.9, w * 0.72, w * 0.3, w * 0.07);
      ctx.fill();
      // tail lights
      ctx.fillStyle = '#ff5449';
      rr(ctx, -w * 0.47, -w * 0.5, w * 0.12, w * 0.08, w * 0.03);
      ctx.fill();
      rr(ctx, w * 0.35, -w * 0.5, w * 0.12, w * 0.08, w * 0.03);
      ctx.fill();
      // garland across the boot
      ctx.strokeStyle = '#e88f2a';
      ctx.lineWidth = w * 0.05;
      ctx.beginPath();
      ctx.moveTo(-w * 0.44, -w * 0.34);
      ctx.quadraticCurveTo(0, -w * 0.16, w * 0.44, -w * 0.34);
      ctx.stroke();
      ctx.fillStyle = '#e2559b';
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.arc(i * w * 0.18, -w * 0.27 + Math.abs(i) * -w * 0.02 + w * 0.02, w * 0.035, 0, Math.PI * 2);
        ctx.fill();
      }
      // wheels
      ctx.fillStyle = '#2b2f36';
      rr(ctx, -w * 0.5, -w * 0.12, w * 0.16, w * 0.12, w * 0.03);
      ctx.fill();
      rr(ctx, w * 0.34, -w * 0.12, w * 0.16, w * 0.12, w * 0.03);
      ctx.fill();
      void seed;
      ctx.restore();
    };

    const drawCow = (x: number, y: number, w: number, seed: number, t: number) => {
      ctx.save();
      ctx.translate(x, y);
      const flip = seed > 0.5 ? 1 : -1;
      ctx.scale(flip, 1);
      shadow(0, 0, w);
      const bob = Math.sin(t * 2 + seed * 9) * w * 0.01;
      // body
      const g = ctx.createLinearGradient(0, -w * 0.5, 0, 0);
      g.addColorStop(0, '#fdfaf3');
      g.addColorStop(1, '#e3dcc9');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, -w * 0.3 + bob, w * 0.44, w * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
      // legs
      ctx.strokeStyle = '#efe9da';
      ctx.lineWidth = w * 0.06;
      ctx.lineCap = 'round';
      for (const lx of [-0.3, -0.14, 0.14, 0.3]) {
        ctx.beginPath();
        ctx.moveTo(lx * w, -w * 0.16);
        ctx.lineTo(lx * w, w * 0.0);
        ctx.stroke();
      }
      // drape
      ctx.fillStyle = '#d6437f';
      rr(ctx, -w * 0.26, -w * 0.5 + bob, w * 0.5, w * 0.2, w * 0.05);
      ctx.fill();
      // head
      ctx.fillStyle = '#f8f4e8';
      ctx.beginPath();
      ctx.ellipse(w * 0.48, -w * 0.36 + bob, w * 0.14, w * 0.17, 0.2, 0, Math.PI * 2);
      ctx.fill();
      // horns
      ctx.strokeStyle = '#c9b48c';
      ctx.lineWidth = w * 0.035;
      ctx.beginPath();
      ctx.moveTo(w * 0.44, -w * 0.5 + bob);
      ctx.quadraticCurveTo(w * 0.4, -w * 0.62, w * 0.46, -w * 0.66);
      ctx.moveTo(w * 0.54, -w * 0.5 + bob);
      ctx.quadraticCurveTo(w * 0.58, -w * 0.62, w * 0.52, -w * 0.68);
      ctx.stroke();
      // ear + eye
      ctx.fillStyle = '#e8e0cd';
      ctx.beginPath();
      ctx.ellipse(w * 0.38, -w * 0.44 + bob, w * 0.05, w * 0.03, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a3126';
      ctx.beginPath();
      ctx.arc(w * 0.5, -w * 0.4 + bob, w * 0.018, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawPhotog = (x: number, y: number, w: number, t: number, seed: number) => {
      ctx.save();
      ctx.translate(x, y);
      shadow(0, 0, w * 0.8);
      // flash
      const fl = (t * 0.9 + seed * 3) % 2.4 < 0.12;
      // legs
      ctx.strokeStyle = '#3f4750';
      ctx.lineWidth = w * 0.11;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-w * 0.12, -w * 0.5);
      ctx.lineTo(-w * 0.16, 0);
      ctx.moveTo(w * 0.12, -w * 0.5);
      ctx.lineTo(w * 0.18, 0);
      ctx.stroke();
      // torso (vest)
      ctx.fillStyle = '#59636e';
      rr(ctx, -w * 0.22, -w * 1.0, w * 0.44, w * 0.55, w * 0.1);
      ctx.fill();
      ctx.fillStyle = '#7b8794';
      rr(ctx, -w * 0.22, -w * 1.0, w * 0.14, w * 0.55, w * 0.06);
      ctx.fill();
      // arms up to camera
      ctx.strokeStyle = '#59636e';
      ctx.lineWidth = w * 0.1;
      ctx.beginPath();
      ctx.moveTo(-w * 0.2, -w * 0.92);
      ctx.lineTo(-w * 0.08, -w * 1.1);
      ctx.moveTo(w * 0.2, -w * 0.92);
      ctx.lineTo(w * 0.08, -w * 1.1);
      ctx.stroke();
      // head + cap
      ctx.fillStyle = '#caa07a';
      ctx.beginPath();
      ctx.arc(0, -w * 1.16, w * 0.13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#39404a';
      ctx.beginPath();
      ctx.arc(0, -w * 1.2, w * 0.13, Math.PI, 0);
      ctx.fill();
      // camera
      ctx.fillStyle = '#20262e';
      rr(ctx, -w * 0.14, -w * 1.16, w * 0.28, w * 0.16, w * 0.03);
      ctx.fill();
      ctx.fillStyle = fl ? '#ffffff' : '#0f1216';
      ctx.beginPath();
      ctx.arc(0, -w * 1.08, w * 0.055, 0, Math.PI * 2);
      ctx.fill();
      if (fl) {
        const gl = ctx.createRadialGradient(0, -w * 1.08, 0, 0, -w * 1.08, w * 0.5);
        gl.addColorStop(0, 'rgba(255,255,255,.9)');
        gl.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gl;
        ctx.beginPath();
        ctx.arc(0, -w * 1.08, w * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    const drawUncle = (x: number, y: number, w: number, t: number, seed: number) => {
      ctx.save();
      ctx.translate(x, y);
      shadow(0, 0, w * 0.85);
      const sway = Math.sin(t * 6 + seed * 6) * 0.18;
      ctx.rotate(sway);
      // legs
      ctx.strokeStyle = '#f0ede6';
      ctx.lineWidth = w * 0.11;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-w * 0.1, -w * 0.5);
      ctx.lineTo(-w * 0.2, 0);
      ctx.moveTo(w * 0.1, -w * 0.5);
      ctx.lineTo(w * 0.2, 0);
      ctx.stroke();
      // kurta
      const kg = ctx.createLinearGradient(0, -w, 0, -w * 0.45);
      kg.addColorStop(0, '#e8b03c');
      kg.addColorStop(1, '#c98d20');
      ctx.fillStyle = kg;
      rr(ctx, -w * 0.24, -w * 1.0, w * 0.48, w * 0.55, w * 0.12);
      ctx.fill();
      // arms up dancing
      ctx.strokeStyle = '#e8b03c';
      ctx.lineWidth = w * 0.1;
      ctx.beginPath();
      ctx.moveTo(-w * 0.2, -w * 0.94);
      ctx.quadraticCurveTo(-w * 0.42, -w * 1.1, -w * 0.34, -w * 1.3);
      ctx.moveTo(w * 0.2, -w * 0.94);
      ctx.quadraticCurveTo(w * 0.42, -w * 1.12, w * 0.32, -w * 1.32);
      ctx.stroke();
      ctx.fillStyle = '#caa07a';
      ctx.beginPath();
      ctx.arc(-w * 0.34, -w * 1.34, w * 0.06, 0, Math.PI * 2);
      ctx.arc(w * 0.32, -w * 1.36, w * 0.06, 0, Math.PI * 2);
      ctx.fill();
      // head + moustache
      ctx.fillStyle = '#caa07a';
      ctx.beginPath();
      ctx.arc(0, -w * 1.14, w * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#4a3526';
      ctx.lineWidth = w * 0.03;
      ctx.beginPath();
      ctx.moveTo(-w * 0.07, -w * 1.1);
      ctx.quadraticCurveTo(0, -w * 1.06, w * 0.07, -w * 1.1);
      ctx.stroke();
      ctx.restore();
    };

    const drawDhol = (x: number, y: number, w: number, seed: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((seed - 0.5) * 0.25);
      shadow(0, 0, w);
      const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
      g.addColorStop(0, '#a9713d');
      g.addColorStop(0.5, '#d59a5c');
      g.addColorStop(1, '#8f5a2c');
      ctx.fillStyle = g;
      rr(ctx, -w * 0.5, -w * 0.72, w, w * 0.62, w * 0.16);
      ctx.fill();
      // drum skins
      ctx.fillStyle = '#f7efdd';
      ctx.beginPath();
      ctx.ellipse(-w * 0.5, -w * 0.41, w * 0.09, w * 0.31, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(w * 0.5, -w * 0.41, w * 0.09, w * 0.31, 0, 0, Math.PI * 2);
      ctx.fill();
      // pink cross straps
      ctx.strokeStyle = '#d6437f';
      ctx.lineWidth = w * 0.045;
      for (let i = 0; i < 4; i++) {
        const sx = -w * 0.42 + i * w * 0.28;
        ctx.beginPath();
        ctx.moveTo(sx, -w * 0.7);
        ctx.lineTo(sx + w * 0.16, -w * 0.12);
        ctx.stroke();
      }
      ctx.restore();
    };

    const drawBarrier = (x: number, y: number, w: number) => {
      ctx.save();
      ctx.translate(x, y);
      shadow(0, 0, w);
      ctx.strokeStyle = '#8b6f3e';
      ctx.lineWidth = w * 0.06;
      ctx.beginPath();
      ctx.moveTo(-w * 0.4, 0);
      ctx.lineTo(-w * 0.34, -w * 0.5);
      ctx.moveTo(w * 0.4, 0);
      ctx.lineTo(w * 0.34, -w * 0.5);
      ctx.stroke();
      rr(ctx, -w * 0.5, -w * 0.62, w, w * 0.2, w * 0.04);
      const stripes = ctx.createLinearGradient(-w * 0.5, 0, w * 0.5, 0);
      for (let i = 0; i <= 8; i++) {
        stripes.addColorStop(i / 8, i % 2 ? '#f4c531' : '#2e2a24');
        if (i < 8) stripes.addColorStop((i + 0.999) / 8, i % 2 ? '#f4c531' : '#2e2a24');
      }
      ctx.fillStyle = stripes;
      ctx.fill();
      ctx.restore();
    };

    const drawCoin = (x: number, y: number, w: number, t: number, seed: number) => {
      ctx.save();
      ctx.translate(x, y - w * 0.5 + Math.sin(t * 3 + seed * 8) * w * 0.08);
      const sq = Math.abs(Math.cos(t * 2.4 + seed * 6));
      ctx.scale(Math.max(0.25, sq), 1);
      const gl = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.9);
      gl.addColorStop(0, 'rgba(244,205,80,.5)');
      gl.addColorStop(1, 'rgba(244,205,80,0)');
      ctx.fillStyle = gl;
      ctx.beginPath();
      ctx.arc(0, 0, w * 0.9, 0, Math.PI * 2);
      ctx.fill();
      const g = ctx.createLinearGradient(0, -w / 2, 0, w / 2);
      g.addColorStop(0, '#ffe08a');
      g.addColorStop(0.5, '#e8b83c');
      g.addColorStop(1, '#c9921e');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, w * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#a8770f';
      ctx.lineWidth = w * 0.06;
      ctx.beginPath();
      ctx.arc(0, 0, w * 0.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#8a610a';
      ctx.font = `700 ${w * 0.34}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('WC', 0, w * 0.02);
      ctx.restore();
    };

    const drawRing = (x: number, y: number, w: number, t: number) => {
      ctx.save();
      ctx.translate(x, y - w * 0.5 + Math.sin(t * 3) * w * 0.08);
      ctx.strokeStyle = '#e8b83c';
      ctx.lineWidth = w * 0.12;
      ctx.beginPath();
      ctx.arc(0, w * 0.08, w * 0.34, 0, Math.PI * 2);
      ctx.stroke();
      // diamond
      ctx.fillStyle = '#dff3ff';
      ctx.beginPath();
      ctx.moveTo(0, -w * 0.48);
      ctx.lineTo(w * 0.14, -w * 0.3);
      ctx.lineTo(0, -w * 0.12);
      ctx.lineTo(-w * 0.14, -w * 0.3);
      ctx.closePath();
      ctx.fill();
      const tw = (t * 2) % 1;
      ctx.fillStyle = `rgba(255,255,255,${0.8 - tw * 0.8})`;
      ctx.beginPath();
      ctx.arc(w * 0.08, -w * 0.36, w * 0.05 * (1 - tw), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawHeart = (x: number, y: number, w: number, t: number) => {
      ctx.save();
      ctx.translate(x, y - w * 0.5 + Math.sin(t * 3.4) * w * 0.08);
      const s = 1 + Math.sin(t * 6) * 0.08;
      ctx.scale(s, s);
      const gl = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.8);
      gl.addColorStop(0, 'rgba(226,85,155,.45)');
      gl.addColorStop(1, 'rgba(226,85,155,0)');
      ctx.fillStyle = gl;
      ctx.beginPath();
      ctx.arc(0, 0, w * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e0447f';
      ctx.beginPath();
      ctx.moveTo(0, w * 0.3);
      ctx.bezierCurveTo(-w * 0.55, -w * 0.1, -w * 0.26, -w * 0.46, 0, -w * 0.16);
      ctx.bezierCurveTo(w * 0.26, -w * 0.46, w * 0.55, -w * 0.1, 0, w * 0.3);
      ctx.fill();
      ctx.restore();
    };

    const drawPot = (x: number, y: number, w: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = '#b06a3c';
      rr(ctx, -w * 0.28, -w * 0.5, w * 0.56, w * 0.5, w * 0.08);
      ctx.fill();
      ctx.fillStyle = '#c47a46';
      rr(ctx, -w * 0.34, -w * 0.58, w * 0.68, w * 0.14, w * 0.05);
      ctx.fill();
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = i % 2 ? '#e2559b' : '#ef7fb4';
        ctx.beginPath();
        ctx.arc((hash(i * 3 + x) - 0.5) * w * 0.5, -w * 0.66 - hash(i + x) * w * 0.18, w * 0.11, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    /* ================= frame ================= */
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const g = gameRef.current;
      const playing = g.phase === 'playing';
      const ambient = g.phase === 'menu' || g.phase === 'over';

      if (playing) {
        g.t += dt;
        g.speed = Math.min(DIFF[g.diff].speed + DIFF[g.diff].ramp * g.t, DIFF[g.diff].cap);
        const ds = g.speed * dt;
        g.dist += ds;
        g.score += ds; // 1 point / metre
        g.sinceSpawn += ds;
        g.inv = Math.max(0, g.inv - dt);
        g.shake = Math.max(0, g.shake - dt * 2.2);
        g.hintT = Math.max(0, g.hintT - dt);
        if (g.sinceSpawn >= DIFF[g.diff].gap) {
          g.sinceSpawn = 0;
          spawnRow(g);
        }
        // lane easing
        const d = g.laneT - g.laneF;
        g.laneF += Math.sign(d) * Math.min(Math.abs(d), dt * 7);
        // advance objects
        for (const o of g.objs) o.z -= ds;

        // collisions
        const laneNow = Math.round(g.laneF);
        for (const o of g.objs) {
          if (o.taken || o.z > 2.4 || o.z < -0.8 || o.lane !== laneNow) continue;
          const isPickup = o.kind === 'coin' || o.kind === 'ring' || o.kind === 'heart';
          if (isPickup) {
            o.taken = true;
            const px = W / 2 + laneNow * W * 0.14;
            const py = H * 0.7;
            if (o.kind === 'coin') {
              g.coins += 1;
              g.score += 10;
              burst(g, px, py, '#e8b83c', 8);
            } else if (o.kind === 'ring') {
              g.score += 50;
              burst(g, px, py, '#dff3ff', 12);
            } else {
              if (g.lives < MAX_LIVES) g.lives += 1;
              else g.score += 25;
              burst(g, px, py, '#e0447f', 12);
            }
          } else if (g.inv <= 0) {
            o.taken = true;
            g.lives -= 1;
            g.inv = 1.8;
            g.shake = 1;
            burst(g, W / 2 + laneNow * W * 0.14, H * 0.72, '#ffffff', 14);
            if (g.lives < 0) {
              gameOver();
            }
          }
        }
        g.objs = g.objs.filter((o) => !o.taken && o.z > -3);
        // particles
        for (const p of g.parts) {
          p.life += dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 500 * dt;
        }
        g.parts = g.parts.filter((p) => p.life < p.max);
      } else if (ambient) {
        g.t += dt;
        g.dist += 6 * dt; // gentle ambient scroll behind menus
      }

      /* ---------- render ---------- */
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const shakeX = playing ? Math.sin(now * 0.09) * 7 * g.shake : 0;
      const shakeY = playing ? Math.cos(now * 0.11) * 5 * g.shake : 0;
      ctx.translate(shakeX, shakeY);

      const horizonY = H * 0.3;
      const baseY = H * 0.88;
      const cx = W / 2;
      const roadHalf0 = Math.min(W * 0.46, 320);
      const mppx = roadHalf0 / 4.6; // px per metre at z=0

      // sky
      const sky = ctx.createLinearGradient(0, 0, 0, horizonY * 1.25);
      sky.addColorStop(0, '#7fb2d9');
      sky.addColorStop(0.45, '#f6d9a8');
      sky.addColorStop(1, '#f3b98f');
      ctx.fillStyle = sky;
      ctx.fillRect(-20, -20, W + 40, horizonY * 1.3 + 20);
      // sun glow
      const sun = ctx.createRadialGradient(cx, horizonY * 0.92, 0, cx, horizonY * 0.92, W * 0.4);
      sun.addColorStop(0, 'rgba(255,236,190,.9)');
      sun.addColorStop(1, 'rgba(255,236,190,0)');
      ctx.fillStyle = sun;
      ctx.fillRect(0, 0, W, horizonY * 1.3);

      // palace gate silhouette at the vanishing point
      ctx.fillStyle = 'rgba(196,120,130,.55)';
      const gw = W * 0.34;
      ctx.beginPath();
      ctx.moveTo(cx - gw / 2, horizonY + 2);
      ctx.lineTo(cx - gw / 2, horizonY - H * 0.13);
      ctx.quadraticCurveTo(cx - gw / 2, horizonY - H * 0.2, cx - gw * 0.3, horizonY - H * 0.2);
      ctx.lineTo(cx + gw * 0.3, horizonY - H * 0.2);
      ctx.quadraticCurveTo(cx + gw / 2, horizonY - H * 0.2, cx + gw / 2, horizonY - H * 0.13);
      ctx.lineTo(cx + gw / 2, horizonY + 2);
      ctx.closePath();
      ctx.fill();
      // gate domes
      for (const dxr of [-0.5, -0.3, 0.3, 0.5]) {
        ctx.beginPath();
        ctx.arc(cx + gw * dxr, horizonY - H * (Math.abs(dxr) > 0.4 ? 0.13 : 0.2), W * 0.028, Math.PI, 0);
        ctx.fill();
      }
      // arch opening (glow)
      const arch = ctx.createLinearGradient(0, horizonY - H * 0.12, 0, horizonY);
      arch.addColorStop(0, 'rgba(255,238,205,.95)');
      arch.addColorStop(1, 'rgba(255,214,170,.8)');
      ctx.fillStyle = arch;
      ctx.beginPath();
      ctx.moveTo(cx - gw * 0.16, horizonY + 2);
      ctx.lineTo(cx - gw * 0.16, horizonY - H * 0.08);
      ctx.quadraticCurveTo(cx, horizonY - H * 0.16, cx + gw * 0.16, horizonY - H * 0.08);
      ctx.lineTo(cx + gw * 0.16, horizonY + 2);
      ctx.closePath();
      ctx.fill();

      // ground base
      const ground = ctx.createLinearGradient(0, horizonY, 0, H);
      ground.addColorStop(0, '#caa387');
      ground.addColorStop(1, '#8f6d58');
      ctx.fillStyle = ground;
      ctx.fillRect(-20, horizonY, W + 40, H - horizonY + 20);

      // side walls (draped)
      const wallTop = (z: number) => {
        const k = kOf(z);
        return { k, y: horizonY + (baseY - horizonY) * k, half: roadHalf0 * k };
      };
      ctx.fillStyle = '#e9b7c9';
      // left wall polygon (from far to near)
      const far = wallTop(110);
      const near = wallTop(0);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + side * far.half, far.y);
        ctx.lineTo(cx + side * (near.half + mppx * 1.2), near.y);
        ctx.lineTo(cx + side * (near.half + mppx * 1.2), near.y - mppx * 2.6);
        ctx.lineTo(cx + side * far.half, far.y - mppx * 2.6 * far.k);
        ctx.closePath();
        const wg = ctx.createLinearGradient(0, horizonY, 0, baseY);
        wg.addColorStop(0, '#d8a4b8');
        wg.addColorStop(1, '#f2c3d5');
        ctx.fillStyle = wg;
        ctx.fill();
      }
      // swags + fairy lights along walls
      const step = 7;
      const offset = g.dist % step;
      for (let zz = step - offset; zz < 100; zz += step) {
        const { k, y } = wallTop(zz);
        const half = roadHalf0 * k;
        const sw = mppx * 2.2 * k;
        for (const side of [-1, 1]) {
          const wx = cx + side * (half + mppx * 0.6 * k);
          ctx.strokeStyle = 'rgba(198,84,130,.8)';
          ctx.lineWidth = Math.max(1, mppx * 0.14 * k);
          ctx.beginPath();
          ctx.moveTo(wx - sw / 2, y - mppx * 2.2 * k);
          ctx.quadraticCurveTo(wx, y - mppx * 1.5 * k, wx + sw / 2, y - mppx * 2.2 * k);
          ctx.stroke();
          ctx.fillStyle = 'rgba(255,222,140,.95)';
          ctx.beginPath();
          ctx.arc(wx, y - mppx * 1.55 * k, Math.max(1, mppx * 0.09 * k), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // flower pots
      const potStep = 16;
      const potOff = g.dist % potStep;
      for (let zz = potStep - potOff; zz < 95; zz += potStep) {
        const { k, y } = wallTop(zz);
        const half = roadHalf0 * k;
        drawPot(cx - (half + mppx * 0.55 * k), y, mppx * 0.9 * k);
        drawPot(cx + (half + mppx * 0.55 * k), y, mppx * 0.9 * k);
      }

      // road
      ctx.beginPath();
      ctx.moveTo(cx - far.half, far.y);
      ctx.lineTo(cx + far.half, far.y);
      ctx.lineTo(cx + near.half, near.y + 40);
      ctx.lineTo(cx - near.half, near.y + 40);
      ctx.closePath();
      const road = ctx.createLinearGradient(0, horizonY, 0, baseY);
      road.addColorStop(0, '#5a5560');
      road.addColorStop(1, '#3c3843');
      ctx.fillStyle = road;
      ctx.fill();

      // pink rope borders
      for (const b of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + b * far.half * 0.97, far.y);
        ctx.lineTo(cx + b * near.half * 0.97, near.y + 40);
        ctx.strokeStyle = 'rgba(226,85,155,.8)';
        ctx.lineWidth = Math.max(2, mppx * 0.12);
        ctx.stroke();
      }
      // lane dashes
      const dashStep = 6;
      const dOff = g.dist % dashStep;
      for (const b of [-1 / 3, 1 / 3]) {
        for (let zz = dashStep - dOff; zz < 100; zz += dashStep) {
          const k1 = kOf(zz);
          const k2 = kOf(Math.max(0, zz - 2.4));
          const y1 = horizonY + (baseY - horizonY) * k1;
          const y2 = horizonY + (baseY - horizonY) * k2;
          const x1 = cx + b * roadHalf0 * 2 * k1;
          const x2 = cx + b * roadHalf0 * 2 * k2;
          ctx.strokeStyle = 'rgba(250,240,220,.5)';
          ctx.lineWidth = Math.max(1.5, mppx * 0.1 * k2);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }
      // scattered petals on the road (stable per world position)
      const petalStep = 2.3;
      const pOff = g.dist % petalStep;
      for (let zz = petalStep - pOff; zz < 70; zz += petalStep) {
        const world = Math.floor((g.dist + zz) / petalStep);
        const h1 = hash(world);
        const k = kOf(zz);
        const y = horizonY + (baseY - horizonY) * k;
        const x = cx + (h1 * 2 - 1) * roadHalf0 * 0.85 * k;
        ctx.fillStyle = `rgba(233,120,170,${0.5 * k + 0.15})`;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(h1 * 6);
        ctx.beginPath();
        ctx.ellipse(0, 0, Math.max(1.4, mppx * 0.14 * k), Math.max(1, mppx * 0.09 * k), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // objects far → near
      const sorted = [...g.objs].sort((a, b) => b.z - a.z);
      for (const o of sorted) {
        if (o.z > 110 || o.z < -1) continue;
        const k = kOf(o.z);
        const y = horizonY + (baseY - horizonY) * k;
        const laneW = (roadHalf0 * 2) / 3;
        const x = cx + o.lane * laneW * k;
        const t = g.t;
        switch (o.kind) {
          case 'car':
            drawCar(x, y, mppx * 2.6 * k, o.seed);
            break;
          case 'cow':
            drawCow(x, y, mppx * 2.1 * k, o.seed, t);
            break;
          case 'photog':
            drawPhotog(x, y, mppx * 1.25 * k, t, o.seed);
            break;
          case 'uncle':
            drawUncle(x, y, mppx * 1.25 * k, t, o.seed);
            break;
          case 'dhol':
            drawDhol(x, y, mppx * 1.9 * k, o.seed);
            break;
          case 'barrier':
            drawBarrier(x, y, mppx * 2.5 * k);
            break;
          case 'coin':
            drawCoin(x, y, mppx * 0.85 * k, t, o.seed);
            break;
          case 'ring':
            drawRing(x, y, mppx * 0.9 * k, t);
            break;
          case 'heart':
            drawHeart(x, y, mppx * 0.9 * k, t);
            break;
        }
      }

      // player
      if (g.phase !== 'over') {
        const laneW = (roadHalf0 * 2) / 3;
        const px = cx + g.laneF * laneW;
        const lean = g.laneT - g.laneF;
        const blink = g.inv > 0 && Math.floor(now / 90) % 2 === 0;
        if (!blink) drawHorseGroom(px, baseY, mppx * 1.05, g.t, lean);
      }

      // pickup particles
      for (const p of g.parts) {
        const a = 1 - p.life / p.max;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // ambient petals (screen space)
      for (const p of petals) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.r += dt;
        if (p.y > H + 10) {
          p.y = -10;
          p.x = Math.random() * W;
        }
        if (p.x > W + 10) p.x = -10;
        ctx.save();
        ctx.translate(p.x % (W + 20), p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = 'rgba(238,140,185,.55)';
        ctx.beginPath();
        ctx.ellipse(0, 0, p.s, p.s * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      /* ---------- HUD ---------- */
      if (g.phase === 'playing' || g.phase === 'paused') {
        const pad = 12;
        ctx.textBaseline = 'middle';
        // score pill
        ctx.fillStyle = 'rgba(20,12,20,.45)';
        rr(ctx, pad, pad, 132, 40, 20);
        ctx.fill();
        ctx.strokeStyle = 'rgba(244,205,90,.7)';
        ctx.lineWidth = 1.5;
        rr(ctx, pad, pad, 132, 40, 20);
        ctx.stroke();
        ctx.fillStyle = '#ffe9b0';
        ctx.font = '700 19px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${Math.round(g.score)}`, pad + 16, pad + 21);
        ctx.font = '600 11px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255,233,176,.75)';
        ctx.fillText('SCORE', pad + 84, pad + 21);
        // coins pill
        const cw = 96;
        ctx.fillStyle = 'rgba(20,12,20,.45)';
        rr(ctx, W - pad - cw, pad, cw, 40, 20);
        ctx.fill();
        ctx.strokeStyle = 'rgba(244,205,90,.7)';
        rr(ctx, W - pad - cw, pad, cw, 40, 20);
        ctx.stroke();
        drawCoin(W - pad - cw + 22, pad + 30, 20, g.t, 0.3);
        ctx.fillStyle = '#ffe9b0';
        ctx.font = '700 18px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${g.coins}`, W - pad - cw + 42, pad + 21);
        // hearts
        for (let i = 0; i < MAX_LIVES; i++) {
          const hx = W - pad - 20 - i * 26;
          const hy = pad + 62;
          ctx.globalAlpha = i < g.lives ? 1 : 0.22;
          ctx.fillStyle = '#e0447f';
          ctx.beginPath();
          ctx.moveTo(hx, hy + 7);
          ctx.bezierCurveTo(hx - 12, hy - 3, hx - 6, hy - 12, hx, hy - 4);
          ctx.bezierCurveTo(hx + 6, hy - 12, hx + 12, hy - 3, hx, hy + 7);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        // difficulty tag
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        ctx.font = '600 11px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(DIFF[g.diff].label.toUpperCase(), pad + 4, pad + 58);

        // swipe hint
        if (g.hintT > 0 && g.phase === 'playing') {
          const a = Math.min(1, g.hintT);
          ctx.globalAlpha = a * (0.7 + 0.3 * Math.sin(now * 0.006));
          ctx.fillStyle = '#fff3d6';
          ctx.font = '700 16px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('◀  swipe to move  ▶', cx, H * 0.94);
          ctx.globalAlpha = 1;
        }
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [gameOver]);

  /* ---------- UI overlays ---------- */
  const card = 'rounded-3xl bg-white/95 p-6 text-gray-900 shadow-2xl backdrop-blur';
  const btnP = 'wc-btn rounded-full px-6 py-3 font-bold text-white shadow-lg';

  return (
    <main
      className="relative h-dvh w-full overflow-hidden"
      style={{ background: `linear-gradient(${colors.primary}, ${colors.secondary})` }}
    >
      <div ref={wrapRef} className="absolute inset-0">
        <canvas ref={canvasRef} className="absolute inset-0 touch-none select-none" />
      </div>

      {/* top bar (HTML) */}
      {phase === 'playing' && (
        <button
          onClick={() => setPhaseBoth('paused')}
          className="absolute right-3 top-16 z-20 grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur"
          aria-label="Pause"
        >
          ❚❚
        </button>
      )}

      {/* menu */}
      {phase === 'menu' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/25 px-5">
          <div className={`${card} wc-pop w-full max-w-sm text-center`}>
            <div className="text-4xl">🐎</div>
            <h1 className="mt-1 font-serif text-2xl font-bold">{title}</h1>
            <p className="mt-1 text-sm text-gray-500">
              Ride the baraat to the venue — dodge the chaos, grab the WC coins. It never ends…
              how far can you ride?
            </p>
            {best !== null && best > 0 && (
              <p className="mt-2 text-sm font-semibold text-fuchsia-600">Your best: {best}</p>
            )}
            <div className="mt-5 grid gap-3">
              {(Object.keys(DIFF) as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => start(d)}
                  className="wc-btn flex items-center justify-between rounded-2xl border-2 border-gray-200 px-5 py-3.5 text-left font-semibold transition hover:border-fuchsia-300"
                >
                  <span>{DIFF[d].label}</span>
                  <span className="text-xs font-medium text-gray-400">{DIFF[d].blurb}</span>
                </button>
              ))}
            </div>
            <Link href={`${base}/play`} className="mt-4 inline-block text-sm text-gray-400 hover:text-gray-600">
              ← Back to games
            </Link>
          </div>
        </div>
      )}

      {/* pause */}
      {phase === 'paused' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 px-5">
          <div className={`${card} wc-pop w-full max-w-xs text-center`}>
            <h2 className="font-serif text-xl font-bold">Paused</h2>
            <div className="mt-4 grid gap-3">
              <button onClick={() => setPhaseBoth('playing')} className={btnP} style={{ background: colors.primary }}>
                ▶ Resume
              </button>
              <button
                onClick={() => setPhaseBoth('menu')}
                className="rounded-full border-2 border-gray-200 px-6 py-2.5 font-semibold text-gray-600 hover:border-gray-300"
              >
                Quit run
              </button>
            </div>
          </div>
        </div>
      )}

      {/* game over */}
      {phase === 'over' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 px-5">
          <div className={`${card} wc-pop w-full max-w-sm text-center`}>
            <div className="text-4xl">🥁</div>
            <h2 className="mt-1 font-serif text-2xl font-bold">The baraat halts!</h2>
            <p className="mt-3 text-5xl font-black" style={{ color: colors.secondary }}>
              {finalScore}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {submitState === 'improved'
                ? '🎉 New personal best — leaderboard updated!'
                : submitState === 'saved'
                  ? best !== null
                    ? `Best: ${best}`
                    : 'Score saved.'
                  : submitState === 'saving'
                    ? 'Saving score…'
                    : submitState === 'failed'
                      ? 'Could not save — check your connection.'
                      : ''}
            </p>
            <div className="mt-5 grid gap-3">
              <button onClick={() => start(gameRef.current.diff)} className={btnP} style={{ background: colors.primary }}>
                🐎 Ride again
              </button>
              <button
                onClick={() => setPhaseBoth('menu')}
                className="rounded-full border-2 border-gray-200 px-6 py-2.5 font-semibold text-gray-600 hover:border-gray-300"
              >
                Change level
              </button>
              <Link
                href={`${base}/leaderboard`}
                className="rounded-full bg-gray-100 px-6 py-2.5 font-semibold text-gray-700 hover:bg-gray-200"
              >
                🏆 Leaderboard
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
