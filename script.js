/* ============================================================
   Wedding Carnival™ — demo interactions
   ============================================================ */

/* ---------- Mobile menu toggle ---------- */
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
if (navToggle && navLinks) {
  const closeMenu = () => {
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Open menu');
  };
  navToggle.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });
  // close when a link is tapped
  navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  // close when tapping outside
  document.addEventListener('click', (e) => {
    if (!navLinks.contains(e.target) && !navToggle.contains(e.target)) closeMenu();
  });
}

/* ---------- Scroll reveal ---------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      setTimeout(() => e.target.classList.add('in'), (i % 4) * 80);
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

/* ---------- Animated stat counters ---------- */
const counters = document.querySelectorAll('.hero-stats strong');
const animateCount = (el) => {
  const target = +el.dataset.count;
  const suffix = el.dataset.suffix || '';
  const dur = 1400;
  const start = performance.now();
  const step = (now) => {
    const p = Math.min((now - start) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * eased).toLocaleString() + suffix;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};
const statObs = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { animateCount(e.target); statObs.unobserve(e.target); } });
}, { threshold: 0.5 });
counters.forEach(c => statObs.observe(c));

/* ---------- Bride vs Groom live vote ---------- */
let bride = 62, groom = 38, votes = 1204;
const brideBar = document.getElementById('brideBar');
const groomBar = document.getElementById('groomBar');
const brideVal = document.getElementById('brideVal');
const groomVal = document.getElementById('groomVal');
const voteCount = document.getElementById('voteCount');

const renderVote = () => {
  const total = bride + groom;
  const bp = Math.round((bride / total) * 100);
  const gp = 100 - bp;
  brideBar.style.width = bp + '%';
  groomBar.style.width = gp + '%';
  brideVal.textContent = bp + '%';
  groomVal.textContent = gp + '%';
  voteCount.textContent = votes.toLocaleString();
};

document.querySelectorAll('.vote-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.vote-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (btn.dataset.side === 'bride') bride += 1; else groom += 1;
    votes += 1;
    renderVote();
    burst(btn);
  });
});

/* Simulate other guests voting live */
setInterval(() => {
  if (Math.random() > 0.4) {
    if (Math.random() > 0.45) bride++; else groom++;
    votes++;
    renderVote();
  }
}, 1800);

/* ---------- Spin the wheel ---------- */
const wheel = document.getElementById('wheel');
const spinBtn = document.getElementById('spinBtn');
const spinResult = document.getElementById('spinResult');
const prizes = [
  '🎁 Gift Hamper!', '⭐ 500 Bonus Points', '🍰 Dessert Coupon',
  '🎟️ Lucky Draw Ticket', '✌️ Double Score!', '💃 Dance Challenge',
  '🏆 VIP Guest Badge', '🪙 Mystery Reward'
];
let currentRotation = 0;
let spinning = false;

spinBtn.addEventListener('click', () => {
  if (spinning) return;
  spinning = true;
  spinResult.textContent = 'Spinning…';
  const slice = Math.floor(Math.random() * 8);
  const extra = 360 * 5 + slice * 45 + 22;
  currentRotation += extra;
  wheel.style.transform = `rotate(${currentRotation}deg)`;
  setTimeout(() => {
    const landed = (8 - slice) % 8;
    spinResult.textContent = '🎉 You won: ' + prizes[landed];
    confettiBurst();
    spinning = false;
  }, 4300);
});

/* ---------- Live leaderboard shuffle ---------- */
const lb = document.getElementById('leaderboard');
setInterval(() => {
  const rows = Array.from(lb.querySelectorAll('li'));
  rows.forEach(r => {
    const scoreEl = r.querySelector('.lb-score');
    scoreEl.textContent = +scoreEl.textContent + Math.floor(Math.random() * 40);
  });
  rows.sort((a, b) => +b.querySelector('.lb-score').textContent - +a.querySelector('.lb-score').textContent);
  rows.forEach((r, i) => {
    r.querySelector('.lb-rank').textContent = i + 1;
    lb.appendChild(r);
  });
}, 2600);

/* ---------- Scratch card ---------- */
const canvas = document.getElementById('scratchCanvas');
const scratchWrap = document.getElementById('scratch');
if (canvas) {
  const ctx = canvas.getContext('2d');
  let revealed = false;

  const setup = () => {
    const r = scratchWrap.getBoundingClientRect();
    canvas.width = r.width;
    canvas.height = r.height;
    const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    g.addColorStop(0, '#FB4FA8');
    g.addColorStop(1, '#8B3FB0');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.font = '600 18px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✨ Scratch here ✨', canvas.width / 2, canvas.height / 2);
    ctx.globalCompositeOperation = 'destination-out';
  };
  setup();
  window.addEventListener('resize', () => { if (!revealed) setup(); });

  let drawing = false;
  const scratch = (x, y) => {
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
    checkCleared();
  };
  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - r.left, y: p.clientY - r.top };
  };
  const checkCleared = () => {
    if (revealed) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let clear = 0;
    for (let i = 3; i < data.length; i += 40) if (data[i] === 0) clear++;
    if (clear / (data.length / 40) > 0.45) {
      revealed = true;
      canvas.style.transition = 'opacity .5s';
      canvas.style.opacity = 0;
      confettiBurst();
    }
  };

  canvas.addEventListener('mousedown', () => drawing = true);
  window.addEventListener('mouseup', () => drawing = false);
  canvas.addEventListener('mousemove', e => { if (drawing) scratch(pos(e).x, pos(e).y); });
  canvas.addEventListener('touchstart', e => { e.preventDefault(); scratch(pos(e).x, pos(e).y); }, { passive: false });
  canvas.addEventListener('touchmove', e => { e.preventDefault(); scratch(pos(e).x, pos(e).y); }, { passive: false });
}

/* ---------- Confetti ---------- */
function confettiBurst() {
  const colors = ['#FB4FA8', '#F4D71E', '#8B3FB0', '#D98FDD', '#D62E7E'];
  for (let i = 0; i < 60; i++) {
    const c = document.createElement('div');
    c.textContent = ['🎉', '✨', '🎊', '⭐', '💖'][Math.floor(Math.random() * 5)];
    c.style.cssText = `position:fixed;left:${50 + (Math.random() - .5) * 30}%;top:45%;font-size:${12 + Math.random() * 18}px;pointer-events:none;z-index:999;`;
    document.body.appendChild(c);
    const ang = Math.random() * Math.PI * 2;
    const vel = 120 + Math.random() * 260;
    const dx = Math.cos(ang) * vel;
    const dy = Math.sin(ang) * vel - 120;
    c.animate([
      { transform: 'translate(0,0) rotate(0)', opacity: 1 },
      { transform: `translate(${dx}px,${dy + 400}px) rotate(${Math.random() * 720}deg)`, opacity: 0 }
    ], { duration: 1500 + Math.random() * 800, easing: 'cubic-bezier(.2,.6,.4,1)' });
    setTimeout(() => c.remove(), 2300);
  }
}

/* Small burst near an element (vote clicks) */
function burst(el) {
  const r = el.getBoundingClientRect();
  for (let i = 0; i < 12; i++) {
    const c = document.createElement('div');
    c.textContent = ['💖', '✨', '⭐'][Math.floor(Math.random() * 3)];
    c.style.cssText = `position:fixed;left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;pointer-events:none;z-index:999;font-size:16px;`;
    document.body.appendChild(c);
    const ang = Math.random() * Math.PI * 2;
    const d = 40 + Math.random() * 70;
    c.animate([
      { transform: 'translate(0,0)', opacity: 1 },
      { transform: `translate(${Math.cos(ang) * d}px,${Math.sin(ang) * d}px)`, opacity: 0 }
    ], { duration: 800, easing: 'ease-out' });
    setTimeout(() => c.remove(), 900);
  }
}
