// Shared prototype plumbing for every game page: screen switching, the
// prototype state buttons, and timers. Product logic lives in each page.
window.Game = (() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (id) => document.getElementById(id);
  const views = [...document.querySelectorAll('.view')];
  const listeners = [];

  function show(name) {
    views.forEach((v) => { v.hidden = v.dataset.view !== name; });
    document.querySelectorAll('[data-goto]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.goto === name)));
    listeners.forEach((fn) => fn(name));
    window.scrollTo(0, 0);
  }

  function onView(fn) { listeners.push(fn); }

  // Drains --left on a .g-timer from 1 to 0 and reports whole seconds left.
  function timer(bar, ms, onTick, onEnd) {
    const start = performance.now();
    let id = 0;
    const step = (now) => {
      const left = Math.max(0, ms - (now - start));
      if (bar) bar.style.setProperty('--left', String(left / ms));
      onTick && onTick(Math.ceil(left / 1000));
      if (left <= 0) { onEnd && onEnd(); return; }
      id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }

  const actions = {};
  function protoButton(label, fn, key) {
    if (key) actions[key] = fn;
    const box = document.querySelector('.proto-actions');
    if (!box) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', fn);
    box.appendChild(b);
    return b;
  }

  views.forEach((v) => {
    const b = protoButton(v.dataset.label || v.dataset.view, () => show(v.dataset.view));
    if (b) b.dataset.goto = v.dataset.view;
  });

  const icon = {
    check: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    cross: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg>',
  };

  // Start on the screen named in the URL hash (handy for review links).
  // Waits for DOMContentLoaded so each page's own script has registered its
  // onView listeners before the first screen is shown.
  const first = () => {
    const want = location.hash.slice(1);
    if (want.startsWith('do=') && actions[want.slice(3)]) { actions[want.slice(3)](); return; }
    show(views.some((v) => v.dataset.view === want) ? want : views[0] && views[0].dataset.view);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', first);
  else setTimeout(first, 0);

  return { $, show, onView, timer, reduce, protoButton, icon };
})();
