(() => {
  const { $, show, onView, timer, protoButton, icon } = window.Game;

  const RIGHT = ['Jai Mala (Varmala)', 'Kanyadaan', 'Saptapadi (Seven Pheras)', 'Sindoor Ceremony'];
  const SHOWN = ['Saptapadi (Seven Pheras)', 'Jai Mala (Varmala)', 'Sindoor Ceremony', 'Kanyadaan'];
  const SECONDS = 20;

  let order = [];
  let locked = false;
  let stopTimer = null;
  let stopCount = null;
  let points = 300;

  const optsEl = $('opts');
  const hint = $('hint');

  function render() {
    optsEl.innerHTML = '';
    SHOWN.forEach((label) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'opt';
      const at = order.indexOf(label);
      if (at !== -1) b.classList.add('is-picked');
      b.innerHTML = `<span class="mark num">${at !== -1 ? at + 1 : ''}</span><span>${label}</span>`;
      b.disabled = locked || at !== -1;
      b.setAttribute('aria-label', at !== -1 ? `${label}, placed ${at + 1}` : label);
      b.addEventListener('click', () => tap(label));
      li.appendChild(b);
      optsEl.appendChild(li);
    });
    $('undo').hidden = locked || order.length === 0;
    if (!locked) hint.textContent = order.length ? `${order.length} of ${SHOWN.length} placed` : 'Tap them in order, first to last.';
  }

  function tap(label) {
    if (locked || order.includes(label)) return;
    order.push(label);
    if (order.length === SHOWN.length) lock();
    else render();
  }

  function lock() {
    locked = true;
    stopTimer && stopTimer();
    render();
    hint.textContent = 'Locked in. Waiting for the reveal.';
    setTimeout(() => reveal(order.every((v, i) => v === RIGHT[i])), 900);
  }

  // Each row shows whether it landed in its right slot, then the round's result.
  function reveal(correct, timedOut = false) {
    locked = true;
    stopTimer && stopTimer();
    const rows = [...optsEl.querySelectorAll('.opt')];
    rows.forEach((b, i) => {
      const label = SHOWN[i];
      const at = order.indexOf(label);
      const rightAt = RIGHT.indexOf(label);
      b.disabled = true;
      b.classList.remove('is-picked');
      if (at === -1) { b.classList.add('is-dim'); return; }
      const ok = at === rightAt;
      b.classList.add(ok ? 'is-right' : 'is-wrong');
      b.querySelector('.mark').innerHTML = ok ? icon.check : String(at + 1);
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = ok ? 'Right place' : `Goes ${rightAt + 1}`;
      b.appendChild(tag);
    });
    $('undo').hidden = true;
    hint.textContent = timedOut ? 'Time’s up.' : 'Round over.';

    const res = $('result');
    if (correct) {
      points += 100;
      $('pts').textContent = points;
      res.innerHTML = '<p class="result-head">Correct order <span class="result-pts">+100</span></p>' +
        '<p class="result-note">Answered in 6.2 seconds.</p>';
    } else {
      res.innerHTML = `<p class="result-head">${timedOut ? 'Time’s up' : 'Not quite'}</p>` +
        '<p class="result-note">The right order</p>' +
        `<ol class="seq">${RIGHT.map((r) => `<li>${r}</li>`).join('')}</ol>`;
    }
    res.hidden = false;
    $('after').hidden = false;
  }

  function startRound() {
    order = [];
    locked = false;
    $('result').hidden = true;
    $('after').hidden = true;
    render();
    stopTimer && stopTimer();
    stopTimer = timer($('bar'), SECONDS * 1000, (s) => {
      const el = $('secs');
      el.textContent = s + 's';
      el.classList.toggle('low', s <= 5);
    }, () => { if (!locked) { reveal(false, true); } });
  }

  onView((name) => {
    stopTimer && stopTimer();
    stopCount && clearInterval(stopCount);
    $('bar').style.setProperty('--left', name === 'question' ? '1' : '0');
    if (name === 'question') startRound();
    if (name === 'next') {
      let n = 3;
      $('count').textContent = n;
      stopCount = setInterval(() => {
        n -= 1;
        if (n <= 0) { clearInterval(stopCount); show('question'); return; }
        $('count').textContent = n;
      }, 1000);
    }
  });

  document.querySelectorAll('[data-to]').forEach((b) => b.addEventListener('click', () => show(b.dataset.to)));
  $('undo').addEventListener('click', () => { if (!locked) { order.pop(); render(); } });

  protoButton('Outcome: right', () => { show('question'); order = [...RIGHT]; locked = true; render(); reveal(true); }, 'right');
  protoButton('Outcome: wrong', () => { show('question'); order = [RIGHT[0], RIGHT[2], RIGHT[1], RIGHT[3]]; locked = true; render(); reveal(false); }, 'wrong');
  protoButton('Outcome: time’s up', () => { show('question'); order = [RIGHT[1]]; locked = true; render(); reveal(false, true); }, 'timeup');
})();
