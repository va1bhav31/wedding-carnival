(() => {
  const $ = (s) => document.querySelector(s);
  const DEFAULTS = { bride: 'Aanya', groom: 'Vihaan' };
  const names = { ...DEFAULTS };

  // The hoarding re-letters from the visitor's own names.
  function reletter() {
    document.querySelectorAll('[data-bride]').forEach((n) => { n.textContent = names.bride; });
    document.querySelectorAll('[data-groom]').forEach((n) => { n.textContent = names.groom; });
    const custom = names.bride !== DEFAULTS.bride || names.groom !== DEFAULTS.groom;
    const subject = custom ? `Book Wedding Carnival for ${names.bride} & ${names.groom}` : 'Book Wedding Carnival';
    document.querySelectorAll('a.book').forEach((a) => {
      a.href = `mailto:info@weddingcarnival.live?subject=${encodeURIComponent(subject)}`;
    });
  }

  [['#in-bride', 'bride'], ['#in-groom', 'groom']].forEach(([sel, key]) => {
    const input = $(sel);
    if (!input) return;
    input.addEventListener('input', () => {
      const v = input.value.replace(/\s+/g, ' ').trim().slice(0, 18);
      names[key] = v || DEFAULTS[key];
      reletter();
    });
  });

  // One scene from the show. The couple's answer and the crowd split are sample data.
  const COUPLE_SAYS = 'bride';
  const CROWD = { bride: 62, groom: 38 };
  const sides = [...document.querySelectorAll('.scene-side')];
  const result = $('#scene-result');

  function play(pick) {
    const right = pick === COUPLE_SAYS;
    sides.forEach((b) => {
      b.disabled = true;
      const side = b.dataset.side;
      if (side === COUPLE_SAYS) {
        b.classList.add('is-right');
        b.insertAdjacentHTML('beforeend', '<span class="stamp verdict">The couple says</span>');
      } else {
        b.classList.add('is-other');
      }
      if (side === pick) {
        b.classList.add('is-picked');
        b.insertAdjacentHTML('afterbegin', '<span class="your-pick">Your pick</span>');
      }
    });
    const who = names[COUPLE_SAYS];
    result.innerHTML =
      `<p class="result-line">${right ? 'You know them well. +100 points.' : 'Not this time. The couple says it’s ' + escapeHtml(who) + '.'}</p>` +
      '<div class="crowd">' +
      `<div class="crowd-bar" role="img" aria-label="${CROWD.bride}% picked ${escapeHtml(names.bride)}, ${CROWD.groom}% picked ${escapeHtml(names.groom)}"><span class="b" style="width:${CROWD.bride}%"></span><span class="g" style="width:${CROWD.groom}%"></span></div>` +
      `<p class="crowd-legend"><span>${escapeHtml(names.bride)} ${CROWD.bride}%</span><span>${escapeHtml(names.groom)} ${CROWD.groom}%</span></p>` +
      '</div>' +
      '<button type="button" class="scene-again">Play it again</button>';
    result.hidden = false;
    result.querySelector('.scene-again').addEventListener('click', reset);
  }

  function reset() {
    sides.forEach((b) => {
      b.disabled = false;
      b.classList.remove('is-right', 'is-other', 'is-picked');
      b.querySelectorAll('.verdict, .your-pick').forEach((n) => n.remove());
    });
    result.hidden = true;
    result.innerHTML = '';
    sides[0] && sides[0].focus();
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  sides.forEach((b) => b.addEventListener('click', () => play(b.dataset.side)));
  reletter();
})();
