/* ============================================================
   Wedding Carnival™ — landing interactions
   ============================================================ */
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Marquee (icons + labels, no emoji) ---------- */
(function () {
  const track = document.getElementById('marquee');
  if (!track) return;
  const items = [
    ['i-trivia', 'Couple Trivia'], ['i-bolt', 'Fastest Finger'], ['i-vs', 'Bride vs Groom'],
    ['i-wheel', 'Spin the Wheel'], ['i-gift', 'Scratch & Win'], ['i-puzzle', 'Emoji Decoder'],
    ['i-map', 'Treasure Hunt'], ['i-camera', 'Photo Hunt'], ['i-ticket', 'Lucky Draw'], ['i-heart', 'Memory Garden'],
  ];
  const html = items
    .map(([ic, label]) => `<span><svg class="ico"><use href="#${ic}"/></svg>${label}</span>`)
    .join('');
  track.innerHTML = html + html; // duplicate for seamless loop
})();

/* ---------- Cursor glow ---------- */
(function () {
  const glow = document.getElementById('cursorGlow');
  if (!glow || reduce) return;
  let x = 0, y = 0, tx = 0, ty = 0;
  addEventListener('pointermove', (e) => {
    tx = e.clientX; ty = e.clientY; glow.style.opacity = '1';
  });
  (function loop() {
    x += (tx - x) * 0.15; y += (ty - y) * 0.15;
    glow.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`;
    requestAnimationFrame(loop);
  })();
})();

/* ---------- 3D tilt + interior spotlight on game cards ---------- */
(function () {
  if (reduce) return;
  document.querySelectorAll('.gcard').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.style.setProperty('--rx', `${(px - 0.5) * 10}deg`);
      card.style.setProperty('--ry', `${(0.5 - py) * 10}deg`);
      card.style.setProperty('--mx', `${px * 100}%`);
      card.style.setProperty('--my', `${py * 100}%`);
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });
})();

/* ---------- Magnetic buttons ---------- */
(function () {
  if (reduce) return;
  document.querySelectorAll('.magnetic').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const mx = e.clientX - r.left - r.width / 2;
      const my = e.clientY - r.top - r.height / 2;
      el.style.transform = `translate(${mx * 0.25}px, ${my * 0.35}px)`;
    });
    el.addEventListener('pointerleave', () => (el.style.transform = ''));
  });
})();

/* ---------- Scroll reveal ---------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      setTimeout(() => e.target.classList.add('in'), (i % 4) * 80);
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.14 });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

/* ---------- Stat counters ---------- */
const statObs = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const el = e.target;
    const target = +el.dataset.count, suffix = el.dataset.suffix || '', dur = 1400, start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString() + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    statObs.unobserve(el);
  });
}, { threshold: 0.5 });
document.querySelectorAll('.hero-stats strong').forEach((c) => statObs.observe(c));

/* ---------- Live vote ---------- */
(function () {
  let bride = 62, groom = 38, votes = 1204;
  const $ = (id) => document.getElementById(id);
  const render = () => {
    const bp = Math.round((bride / (bride + groom)) * 100), gp = 100 - bp;
    $('brideBar').style.width = bp + '%'; $('groomBar').style.width = gp + '%';
    $('brideVal').textContent = bp + '%'; $('groomVal').textContent = gp + '%';
    $('voteCount').textContent = votes.toLocaleString();
  };
  document.querySelectorAll('.vote-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.vote-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      if (btn.dataset.side === 'bride') bride++; else groom++;
      votes++; render(); burst(btn);
    });
  });
  setInterval(() => { if (Math.random() > 0.4) { if (Math.random() > 0.45) bride++; else groom++; votes++; render(); } }, 1800);
})();

/* ---------- Spin the wheel ---------- */
(function () {
  const wheel = document.getElementById('wheel'), btn = document.getElementById('spinBtn'), out = document.getElementById('spinResult');
  if (!wheel) return;
  const prizes = ['Gift Hamper', '500 Bonus Points', 'Dessert Coupon', 'Lucky Draw Ticket', 'Double Score', 'Dance Challenge', 'VIP Guest Badge', 'Mystery Reward'];
  let rot = 0, spinning = false;
  btn.addEventListener('click', () => {
    if (spinning) return; spinning = true; out.textContent = 'Spinning…';
    const slice = Math.floor(Math.random() * 8);
    rot += 360 * 5 + slice * 45 + 22;
    wheel.style.transform = `rotate(${rot}deg)`;
    setTimeout(() => { out.textContent = 'You won: ' + prizes[(8 - slice) % 8]; confettiBurst(); spinning = false; }, 4300);
  });
})();

/* ---------- Live leaderboard ---------- */
(function () {
  const lb = document.getElementById('leaderboard'); if (!lb) return;
  setInterval(() => {
    const rows = Array.from(lb.querySelectorAll('li'));
    rows.forEach((r) => { const s = r.querySelector('.lb-score'); s.textContent = +s.textContent + Math.floor(Math.random() * 40); });
    rows.sort((a, b) => +b.querySelector('.lb-score').textContent - +a.querySelector('.lb-score').textContent);
    rows.forEach((r, i) => { r.querySelector('.lb-rank').textContent = i + 1; lb.appendChild(r); });
  }, 2600);
})();

/* ---------- Scratch card ---------- */
(function () {
  const canvas = document.getElementById('scratchCanvas'), wrap = document.getElementById('scratch');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let revealed = false, drawing = false;
  const setup = () => {
    const r = wrap.getBoundingClientRect(); canvas.width = r.width; canvas.height = r.height;
    const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    g.addColorStop(0, '#FB4FA8'); g.addColorStop(1, '#8B3FB0');
    ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = '600 17px Fredoka, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Scratch here', canvas.width / 2, canvas.height / 2);
    ctx.globalCompositeOperation = 'destination-out';
  };
  setup();
  addEventListener('resize', () => { if (!revealed) setup(); });
  const pos = (e) => { const r = canvas.getBoundingClientRect(); const p = e.touches ? e.touches[0] : e; return { x: p.clientX - r.left, y: p.clientY - r.top }; };
  const scratch = (x, y) => {
    ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.fill();
    if (revealed) return;
    const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let clear = 0; for (let i = 3; i < d.length; i += 40) if (d[i] === 0) clear++;
    if (clear / (d.length / 40) > 0.45) { revealed = true; canvas.style.transition = 'opacity .5s'; canvas.style.opacity = 0; confettiBurst(); }
  };
  canvas.addEventListener('mousedown', () => (drawing = true));
  addEventListener('mouseup', () => (drawing = false));
  canvas.addEventListener('mousemove', (e) => { if (drawing) scratch(pos(e).x, pos(e).y); });
  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); scratch(pos(e).x, pos(e).y); }, { passive: false });
  canvas.addEventListener('touchmove', (e) => { e.preventDefault(); scratch(pos(e).x, pos(e).y); }, { passive: false });
})();

/* ---------- Confetti (SVG-free, uses small colored chips) ---------- */
function confettiBurst() {
  const colors = ['#FB4FA8', '#F4D71E', '#8B3FB0', '#D98FDD', '#D62E7E'];
  for (let i = 0; i < 60; i++) {
    const c = document.createElement('div');
    c.style.cssText = `position:fixed;left:${50 + (Math.random() - .5) * 30}%;top:45%;width:${6 + Math.random() * 6}px;height:${6 + Math.random() * 10}px;background:${colors[i % 5]};border-radius:2px;pointer-events:none;z-index:999`;
    document.body.appendChild(c);
    const ang = Math.random() * Math.PI * 2, vel = 120 + Math.random() * 260;
    c.animate([
      { transform: 'translate(0,0) rotate(0)', opacity: 1 },
      { transform: `translate(${Math.cos(ang) * vel}px,${Math.sin(ang) * vel + 400}px) rotate(${Math.random() * 720}deg)`, opacity: 0 },
    ], { duration: 1500 + Math.random() * 800, easing: 'cubic-bezier(.2,.6,.4,1)' });
    setTimeout(() => c.remove(), 2300);
  }
}
function burst(el) {
  const r = el.getBoundingClientRect(), colors = ['#FB4FA8', '#F4D71E', '#8B3FB0'];
  for (let i = 0; i < 12; i++) {
    const c = document.createElement('div');
    c.style.cssText = `position:fixed;left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;width:7px;height:7px;background:${colors[i % 3]};border-radius:2px;pointer-events:none;z-index:999`;
    document.body.appendChild(c);
    const ang = Math.random() * Math.PI * 2, d = 40 + Math.random() * 70;
    c.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${Math.cos(ang) * d}px,${Math.sin(ang) * d}px)`, opacity: 0 }], { duration: 800, easing: 'ease-out' });
    setTimeout(() => c.remove(), 900);
  }
}
