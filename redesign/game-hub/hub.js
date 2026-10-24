(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (id) => document.getElementById(id);

  let seconds = 12;
  setInterval(() => {
    const cd = $('countdown');
    if (!cd) return;
    seconds = seconds <= 0 ? 15 : seconds - 1;
    cd.textContent = '0:' + String(seconds).padStart(2, '0');
  }, 1000);

  // Once the live game scrolls out of view, it waits at the bottom edge.
  const now = document.querySelector('.now');
  const dock = $('dock');
  if (now && dock && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      dock.classList.toggle('show', !entry.isIntersecting && entry.boundingClientRect.top < 0);
    }, { threshold: 0 }).observe(now);
  }


  const swapNow = (apply) => {
    if (reduce) { apply(); return; }
    now.classList.add('swapping');
    setTimeout(() => { apply(); now.classList.remove('swapping'); }, 400);
  };

  const goLive = $('goLive');
  if (goLive) {
    goLive.addEventListener('click', () => {
      const row = $('row-showdown');
      if (!row || row.dataset.swapped) return;
      swapNow(() => {
        $('now-title').textContent = 'Bride vs Groom Showdown';
        $('play').href = '../games/showdown.html#question';
        $('dock').href = '../games/showdown.html#question';
        $('now-status').innerHTML = 'Live now · the host just started it';
        $('now-how').textContent = 'Who takes longer to get ready? Pick a side before the host reveals it.';
        $('dock-name').textContent = 'Bride vs Groom Showdown';
        const link = row.querySelector('.game-link');
        link.textContent = 'Fastest Finger First';
        link.href = '../games/fastest-finger.html#question';
        row.querySelector('.game-meta').textContent = 'Round 3 of 8, still running';
        row.querySelector('.game-state').textContent = 'Also live';
        row.dataset.state = 'live';
        row.dataset.swapped = 'true';
      });
      document.getElementById('top').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    });
  }

  const reset = $('reset');
  if (reset) reset.addEventListener('click', () => location.reload());
})();
