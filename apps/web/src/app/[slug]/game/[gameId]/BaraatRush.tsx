'use client';

// Baraat Rush — endless runner (Subway-Surfers style, no finish line).
// Pseudo-3D canvas: 3 lanes converging on a palace gate, groom on horseback,
// Indian-wedding obstacles (dancer, cow, barricade, festive cars), WC coins /
// rings / hearts to collect. Three difficulties. Scores are submitted
// server-side (best per guest feeds this game's own leaderboard).
//
// The player and obstacles are real illustrated art (see /public/baraat) —
// only the environment (sky, road, palace, walls) is procedurally drawn.
// The player has just 2 distinct source poses, so smoothness comes from
// crossfading between them plus procedural bob/squash/lean on top, not from
// a raw frame-swap.

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

// Obstacle kinds map 1:1 onto the illustrated sprites in /public/baraat.
type ObKind = 'dancer' | 'cow' | 'cowSit' | 'barrier1' | 'barrier2' | 'taxi' | 'carPink';
type PickKind = 'coin' | 'ring' | 'heart';
type Obj = { kind: ObKind | PickKind; lane: number; z: number; seed: number; taken?: boolean; cleared?: boolean };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; r: number };

const OBSTACLES: ObKind[] = ['dancer', 'cow', 'cowSit', 'barrier1', 'barrier2', 'taxi', 'carPink'];
const MAX_LIVES = 3;
const SPAWN_Z = 55; // shorter sight line — obstacles appear closer, less warning time
const JUMP_DURATION = 0.55; // seconds, full arc
const JUMP_HEIGHT_M = 1.7; // world metres, scaled by mppx at draw time
const PLAYER_HEIGHT_M = 2.6;

// Low, hoppable obstacles vs. ones a horse can't clear (must dodge lanes instead).
// A sitting/lying cow is low enough to jump; a standing one is too tall/bulky.
const JUMPABLE: Record<ObKind, boolean> = {
  barrier1: true,
  barrier2: true,
  cowSit: true,
  dancer: false,
  cow: false,
  taxi: false,
  carPink: false,
};
// A wide barrier blocks all 3 lanes at once — jumping is the only way through.
const WIDE_GAP_ROWS: Record<Difficulty, number> = { easy: 6, medium: 5, hard: 4 };

// Where each sprite lives, and the "world size" used to scale it consistently
// with the road's perspective. `dim` says which axis `size` measures (metres)
// — the other axis follows the source image's own aspect ratio, so nothing
// distorts. `flip` lets side-profile obstacles mirror for lane variety.
type SpriteKey = 'horseStatic' | 'horseRun' | ObKind;
const SPRITE_SRC: Record<SpriteKey, string> = {
  horseStatic: '/baraat/horse-static.webp',
  horseRun: '/baraat/horse-run.webp',
  dancer: '/baraat/ob-dancer.webp',
  cow: '/baraat/ob-cow.webp',
  cowSit: '/baraat/ob-cow-sit.webp',
  barrier1: '/baraat/ob-barrier-1.webp',
  barrier2: '/baraat/ob-barrier-2.webp',
  taxi: '/baraat/ob-taxi.webp',
  carPink: '/baraat/ob-car-pink.webp',
};
const OB_SCALE: Record<ObKind, { dim: 'width' | 'height'; size: number; flip?: boolean }> = {
  dancer: { dim: 'height', size: 1.8 },
  cow: { dim: 'width', size: 2.3, flip: true },
  cowSit: { dim: 'width', size: 2.1, flip: true },
  barrier1: { dim: 'width', size: 2.6 },
  barrier2: { dim: 'height', size: 2.0 },
  taxi: { dim: 'width', size: 2.3 },
  carPink: { dim: 'width', size: 2.3 },
};
const FOG_TINT = '243,185,143'; // matches the horizon color — used for atmospheric depth

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
  jumping: boolean;
  jumpElapsed: number;
  landedPulse: number; // squash-on-landing timer
  rowsSinceWide: number;
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
    jumping: false,
    jumpElapsed: 0,
    landedPulse: 0,
    rowsSinceWide: 0,
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
  const imagesRef = useRef<Partial<Record<SpriteKey, HTMLImageElement>>>({});
  const [phase, setPhase] = useState<Phase>('menu');
  const [finalScore, setFinalScore] = useState(0);
  const [best, setBest] = useState<number | null>(null);
  const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'saved' | 'improved' | 'failed'>('idle');
  const [assetsReady, setAssetsReady] = useState(false);

  const setPhaseBoth = useCallback((p: Phase) => {
    gameRef.current.phase = p;
    setPhase(p);
  }, []);

  // Preload every sprite once. Drawing gracefully no-ops on any image not
  // yet loaded, but we gate "start" on this so the very first run isn't
  // missing art mid-round.
  useEffect(() => {
    let cancelled = false;
    const entries = Object.entries(SPRITE_SRC) as [SpriteKey, string][];
    let loaded = 0;
    entries.forEach(([key, src]) => {
      const img = new Image();
      img.decoding = 'async';
      const done = () => {
        loaded += 1;
        if (!cancelled && loaded === entries.length) setAssetsReady(true);
      };
      img.onload = done;
      img.onerror = done;
      img.src = src;
      imagesRef.current[key] = img;
    });
    return () => {
      cancelled = true;
    };
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
    const jump = () => {
      const g = gameRef.current;
      if (g.phase !== 'playing' || g.jumping) return; // no double-jump
      g.jumping = true;
      g.jumpElapsed = 0;
      g.hintT = 0;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') move(-1);
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') move(1);
      else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') {
        e.preventDefault();
        jump();
      }
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
      const fast = Date.now() - tt < 600;
      if (fast && dy < -28 && Math.abs(dy) > Math.abs(dx)) jump();
      else if (fast && Math.abs(dx) > 24 && Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1);
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
      // Capped at 1.5 rather than 2 — a lot of the raster/gradient work below
      // scales with pixel count, and this alone cuts fill-rate ~44% on
      // retina phones with barely any visible sharpness loss at game scale.
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
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
    // soft floating bokeh orbs, for premium ambiance behind the HUD
    const orbs = Array.from({ length: 7 }, (_, i) => ({
      x: hash(i + 200) * 1000,
      y: hash(i + 260) * 1000,
      s: 10 + hash(i + 210) * 16,
      vy: -4 - hash(i + 220) * 6,
    }));

    // Focal length: higher = narrower FOV — flatter perspective, less road
    // taper, and objects stay bigger for longer instead of shrinking to tiny
    // dots far away (which was also giving way too much reaction time).
    const F = 30;
    const kOf = (z: number) => F / (F + z);

    let last = performance.now();
    let raf = 0;
    let lastStrideSin = 0; // for dust-puff-on-footfall detection

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

    // Blocks all 3 lanes at once — no lane dodge is possible, only a jump clears it.
    const spawnWideBarrier = (g: Game) => {
      const kind: ObKind = hash(g.dist + 21) < 0.5 ? 'barrier1' : 'barrier2';
      for (const lane of [-1, 0, 1]) {
        g.objs.push({ kind, lane, z: SPAWN_Z, seed: hash(g.dist + lane * 13) });
      }
      g.freeLane = 0; // reset so the row right after has a fair, centered gap
    };

    const burst = (g: Game, x: number, y: number, color: string, n = 10) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = 60 + Math.random() * 160;
        g.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: 0, max: 0.6 + Math.random() * 0.3, color, r: 2 + Math.random() * 3 });
      }
    };

    /* ================= sprites & environment art ================= */

    // A soft radial-gradient shadow reads just as well as a blurred one and
    // is far cheaper — ctx.filter blur is a real per-pixel convolution, and
    // this was running on every obstacle + the player, every frame.
    const spriteShadow = (x: number, yGround: number, w: number, strength = 1) => {
      const rx = Math.max(2, w * 0.52);
      const ry = Math.max(1, w * 0.16);
      const grad = ctx.createRadialGradient(x, yGround, 0, x, yGround, rx);
      grad.addColorStop(0, `rgba(20,10,18,${0.34 * strength})`);
      grad.addColorStop(0.7, `rgba(20,10,18,${0.14 * strength})`);
      grad.addColorStop(1, 'rgba(20,10,18,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(x, yGround + 1, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawObstacle = (o: Obj, x: number, yGround: number, k: number) => {
      const cfg = OB_SCALE[o.kind as ObKind];
      const img = imagesRef.current[o.kind as SpriteKey];
      if (!cfg || !img || !img.complete || !img.naturalWidth) return;
      const ratio = img.naturalWidth / img.naturalHeight;
      const hM = cfg.dim === 'height' ? cfg.size : cfg.size / ratio;
      const wM = cfg.dim === 'height' ? hM * ratio : cfg.size;
      const dh = hM * mppxRef.k * k;
      const dw = wM * mppxRef.k * k;
      if (dh < 2) return;
      const flip = Boolean(cfg.flip) && o.seed > 0.5;

      spriteShadow(x, yGround, dw * 1.15);
      ctx.save();
      ctx.translate(x, 0);
      if (flip) ctx.scale(-1, 1);
      ctx.drawImage(img, -dw / 2, yGround - dh, dw, dh);
      ctx.restore();
    };

    const drawPlayer = (
      g: Game,
      x: number,
      yGround: number,
      k: number,
      lean: number,
      jumpH: number,
      airT: number
    ) => {
      const staticImg = imagesRef.current.horseStatic;
      const runImg = imagesRef.current.horseRun;
      if (!staticImg?.complete || !runImg?.complete || !staticImg.naturalWidth || !runImg.naturalWidth) return;

      const ratio = runImg.naturalWidth / runImg.naturalHeight;
      const dh = PLAYER_HEIGHT_M * mppxRef.k * k;
      const dw = dh * ratio;

      const strideHz = 1.5 + g.speed * 0.05;
      const phase = (g.t * strideHz) % 1;
      const s = Math.sin(phase * Math.PI * 2);
      const bobY = -Math.abs(s) * dh * 0.035;
      const blend = (1 - Math.cos(phase * Math.PI * 2)) / 2; // 0..1..0 crossfade static<->run

      if (s > 0 && lastStrideSin <= 0 && g.phase === 'playing' && !g.jumping) {
        burst(g, x, yGround, 'rgba(224,204,172,.85)', 3);
      }
      lastStrideSin = s;

      const shadowScale = jumpH > 1 ? Math.max(0.35, 1 - (jumpH / (mppxRef.k * JUMP_HEIGHT_M)) * 0.5) : 1;
      spriteShadow(x, yGround, dw * 1.5, shadowScale);

      const jumpStretch = 1 + Math.sin(airT * Math.PI) * 0.06;
      const strideSquash = 1 - Math.abs(s) * 0.035;
      const landSquash = g.landedPulse > 0 ? 1 - g.landedPulse * 0.12 : 1;
      const scaleY = jumpStretch * strideSquash * landSquash;
      const scaleX = 1 / Math.sqrt(scaleY);

      ctx.save();
      ctx.translate(x, yGround - jumpH + bobY);
      ctx.rotate(lean * 0.12);
      ctx.scale(scaleX, scaleY);
      ctx.drawImage(staticImg, -dw / 2, -dh, dw, dh);
      ctx.globalAlpha = blend;
      ctx.drawImage(runImg, -dw / 2, -dh, dw, dh);
      ctx.globalAlpha = 1;
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

    // mppx changes with canvas size (on resize); draw* closures above need
    // the current value, so it's read through this tiny mutable box rather
    // than being frozen at effect-creation time.
    const mppxRef = { k: 40 };

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
          // After a grace period, periodically force an all-lane barrier that
          // can only be cleared by jumping — makes the jump mechanic essential,
          // not just a style option.
          if (g.t > 5 && g.rowsSinceWide >= WIDE_GAP_ROWS[g.diff]) {
            spawnWideBarrier(g);
            g.rowsSinceWide = 0;
          } else {
            spawnRow(g);
            g.rowsSinceWide += 1;
          }
        }
        // lane easing
        const d = g.laneT - g.laneF;
        g.laneF += Math.sign(d) * Math.min(Math.abs(d), dt * 7);
        // advance objects
        for (const o of g.objs) o.z -= ds;

        // jump physics
        if (g.jumping) {
          g.jumpElapsed += dt;
          if (g.jumpElapsed >= JUMP_DURATION) {
            g.jumping = false;
            g.jumpElapsed = 0;
            g.landedPulse = 1;
            burst(g, W / 2 + Math.round(g.laneF) * W * 0.14, H * 0.87, '#e8dcc4', 6);
          }
        }
        g.landedPulse = Math.max(0, g.landedPulse - dt * 4);

        // collisions
        const laneNow = Math.round(g.laneF);
        for (const o of g.objs) {
          if (o.taken || o.cleared || o.z > 2.4 || o.z < -0.8 || o.lane !== laneNow) continue;
          const isPickup = o.kind === 'coin' || o.kind === 'ring' || o.kind === 'heart';
          if (!isPickup && g.jumping && JUMPABLE[o.kind as ObKind]) {
            // Cleared it mid-air — small bonus. Unlike a hit/pickup, a jumped
            // obstacle should keep sailing past underneath the horse and
            // scroll off naturally, not vanish the instant it's cleared.
            o.cleared = true;
            g.score += 5;
            continue;
          }
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
      // No clearRect: the sky + ground fills below already fully repaint the
      // canvas (with margin for the shake offset), so clearing first would
      // just be wasted work.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const shakeX = playing ? Math.sin(now * 0.09) * 7 * g.shake : 0;
      const shakeY = playing ? Math.cos(now * 0.11) * 5 * g.shake : 0;
      ctx.translate(shakeX, shakeY);

      const horizonY = H * 0.3;
      const baseY = H * 0.88;
      const cx = W / 2;
      const roadHalf0 = Math.min(W * 0.46, 320);
      const mppx = roadHalf0 / 4.6; // px per metre at z=0
      mppxRef.k = mppx;

      // ---- sky: richer multi-stop gradient ----
      const sky = ctx.createLinearGradient(0, 0, 0, horizonY * 1.3);
      sky.addColorStop(0, '#6fa3d6');
      sky.addColorStop(0.35, '#a9c8e0');
      sky.addColorStop(0.62, '#f3cfa0');
      sky.addColorStop(1, '#f3b98f');
      ctx.fillStyle = sky;
      ctx.fillRect(-20, -20, W + 40, horizonY * 1.35 + 20);

      // soft drifting clouds (parallax) — layered low-alpha ellipses instead
      // of a blur filter, which is the expensive part per pixel touched
      ctx.fillStyle = 'rgba(255,255,255,.16)';
      for (let i = 0; i < 4; i++) {
        const ccx = ((g.dist * 1.6 + i * 260) % (W + 300)) - 150;
        const ccy = horizonY * 0.2 + i * 16;
        ctx.beginPath();
        ctx.ellipse(ccx, ccy, 50, 17, 0, 0, Math.PI * 2);
        ctx.ellipse(ccx + 28, ccy + 4, 34, 13, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,.28)';
      for (let i = 0; i < 4; i++) {
        const ccx = ((g.dist * 1.6 + i * 260) % (W + 300)) - 150;
        const ccy = horizonY * 0.2 + i * 16;
        ctx.beginPath();
        ctx.ellipse(ccx, ccy, 40, 12, 0, 0, Math.PI * 2);
        ctx.ellipse(ccx + 26, ccy + 3, 26, 9, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // layered sun bloom
      for (const [r, a] of [
        [W * 0.55, 0.09],
        [W * 0.32, 0.16],
        [W * 0.15, 0.32],
      ] as [number, number][]) {
        const sun = ctx.createRadialGradient(cx, horizonY * 0.85, 0, cx, horizonY * 0.85, r);
        sun.addColorStop(0, `rgba(255,238,196,${a})`);
        sun.addColorStop(1, 'rgba(255,238,196,0)');
        ctx.fillStyle = sun;
        ctx.fillRect(0, 0, W, horizonY * 1.3);
      }

      // distant haze band — atmospheric layering before the palace
      const hazeBand = ctx.createLinearGradient(0, horizonY - H * 0.06, 0, horizonY + 4);
      hazeBand.addColorStop(0, 'rgba(216,168,180,0)');
      hazeBand.addColorStop(1, 'rgba(216,168,180,.5)');
      ctx.fillStyle = hazeBand;
      ctx.fillRect(0, horizonY - H * 0.07, W, H * 0.08);

      // palace gate silhouette at the vanishing point
      ctx.save();
      ctx.fillStyle = 'rgba(196,120,130,.58)';
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
      for (const dxr of [-0.5, -0.3, 0.3, 0.5]) {
        ctx.beginPath();
        ctx.arc(cx + gw * dxr, horizonY - H * (Math.abs(dxr) > 0.4 ? 0.13 : 0.2), W * 0.028, Math.PI, 0);
        ctx.fill();
      }
      // fairy lights along the roofline
      for (let i = -5; i <= 5; i++) {
        const lx = cx + gw * 0.46 * (i / 5);
        const ly = horizonY - H * (Math.abs(i) > 3 ? 0.12 : 0.19) - 3;
        ctx.fillStyle = 'rgba(255,224,150,.85)';
        ctx.beginPath();
        ctx.arc(lx, ly, Math.max(1, W * 0.0028), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
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

      // ---- road: richer asphalt + specular sheen + texture ----
      const tracePath = () => {
        ctx.beginPath();
        ctx.moveTo(cx - far.half, far.y);
        ctx.lineTo(cx + far.half, far.y);
        ctx.lineTo(cx + near.half, near.y + 40);
        ctx.lineTo(cx - near.half, near.y + 40);
        ctx.closePath();
      };
      tracePath();
      const road = ctx.createLinearGradient(0, horizonY, 0, baseY + 40);
      road.addColorStop(0, '#5b5468');
      road.addColorStop(0.5, '#453f52');
      road.addColorStop(1, '#2c283a');
      ctx.fillStyle = road;
      ctx.fill();
      tracePath();
      const sheen = ctx.createLinearGradient(cx - roadHalf0 * 0.5, 0, cx + roadHalf0 * 0.5, 0);
      sheen.addColorStop(0, 'rgba(255,255,255,0)');
      sheen.addColorStop(0.5, 'rgba(255,255,255,.07)');
      sheen.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sheen;
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
      // lane dashes — warm gold glow
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
          // Cheap pseudo-glow: a wider, dimmer plain stroke under the crisp
          // one, instead of a per-segment blur filter (this loop runs ~30+
          // times a frame — filter blur here was the single biggest cost).
          ctx.strokeStyle = 'rgba(244,205,90,.25)';
          ctx.lineWidth = Math.max(3.5, mppx * 0.26 * k2);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(255,246,220,.6)';
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

      // objects far → near — a much shorter sight line than before, on
      // purpose: obstacles should appear at a real, reactable distance, not
      // be visible from so far out that dodging is trivial.
      const sorted = [...g.objs].sort((a, b) => b.z - a.z);
      for (const o of sorted) {
        if (o.z > 48 || o.z < -1) continue;
        const k = kOf(o.z);
        const y = horizonY + (baseY - horizonY) * k;
        const laneW = (roadHalf0 * 2) / 3;
        const x = cx + o.lane * laneW * k;
        switch (o.kind) {
          case 'coin':
            drawCoin(x, y, mppx * 0.85 * k, g.t, o.seed);
            break;
          case 'ring':
            drawRing(x, y, mppx * 0.9 * k, g.t);
            break;
          case 'heart':
            drawHeart(x, y, mppx * 0.9 * k, g.t);
            break;
          default:
            drawObstacle(o, x, y, k);
            break;
        }
      }

      // player
      if (g.phase !== 'over') {
        const laneW = (roadHalf0 * 2) / 3;
        const px = cx + g.laneF * laneW;
        const lean = g.laneT - g.laneF;
        const blink = g.inv > 0 && Math.floor(now / 90) % 2 === 0;
        const airT = g.jumping ? Math.min(1, g.jumpElapsed / JUMP_DURATION) : 0;
        const jumpH = g.jumping ? JUMP_HEIGHT_M * mppx * 4 * airT * (1 - airT) : 0;
        if (!blink) drawPlayer(g, px, baseY, 1, lean, jumpH, airT);
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
      // ambient bokeh orbs (radial gradient, not a blur filter)
      for (const o of orbs) {
        o.y += o.vy * dt;
        if (o.y < -20) o.y = H + 20;
        const grad = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.s);
        grad.addColorStop(0, 'rgba(255,224,150,.22)');
        grad.addColorStop(1, 'rgba(255,224,150,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.s, 0, Math.PI * 2);
        ctx.fill();
      }

      // vignette for a cinematic finish
      const vig = ctx.createRadialGradient(cx, H * 0.55, H * 0.28, cx, H * 0.55, H * 0.78);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(8,4,12,.32)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

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
          ctx.font = '700 15px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('◀ ▶  move     ▲  jump', cx, H * 0.94);
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/baraat/horse-static.webp" alt="" className="mx-auto h-24 w-auto drop-shadow-xl" />
            <h1 className="mt-2 font-serif text-2xl font-bold">{title}</h1>
            <p className="mt-1 text-sm text-gray-500">
              Swipe to dodge, swipe up to jump, grab the WC coins. It never ends… how far can
              you ride?
            </p>
            {best !== null && best > 0 && (
              <p className="mt-2 text-sm font-semibold text-fuchsia-600">Your best: {best}</p>
            )}
            <div className="mt-5 grid gap-3">
              {(Object.keys(DIFF) as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => start(d)}
                  disabled={!assetsReady}
                  className="wc-btn flex items-center justify-between rounded-2xl border-2 border-gray-200 px-5 py-3.5 text-left font-semibold transition hover:border-fuchsia-300 disabled:cursor-wait disabled:opacity-40"
                >
                  <span>{DIFF[d].label}</span>
                  <span className="text-xs font-medium text-gray-400">{DIFF[d].blurb}</span>
                </button>
              ))}
            </div>
            {!assetsReady && <p className="mt-3 text-xs text-gray-400">Loading the baraat…</p>}
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
                href={`${base}/game/${gameId}/leaderboard`}
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
