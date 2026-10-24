(() => {
  const { $, show, onView, protoButton, icon } = window.Game;

  const NAMES = { bride: 'Aanya', groom: 'Vihaan' };
  const QUESTIONS = [
    { prompt: 'Who takes longer to get ready?', answer: 'bride' },
    { prompt: 'Who said "I love you" first?', answer: 'groom' },
    { prompt: 'Who is the better dancer?', answer: 'bride' },
  ];
  let index = 0;
  let points = 200;
  let busy = false;

  const sides = [...document.querySelectorAll('.side')];

  function reset() {
    busy = false;
    const q = QUESTIONS[index % QUESTIONS.length];
    $('prompt').textContent = q.prompt;
    $('counter').textContent = `Question ${3 + index} of 15`;
    sides.forEach((b) => {
      b.className = 'side';
      b.disabled = false;
      b.querySelectorAll('.badge, .yours').forEach((n) => n.remove());
      b.removeAttribute('aria-describedby');
    });
    $('hint').textContent = 'Tap a name. The couple’s own answer is the right one.';
    $('hint').hidden = false;
    $('result').hidden = true;
    $('after').hidden = true;
  }

  function choose(side) {
    if (busy) return;
    busy = true;
    sides.forEach((b) => { b.disabled = true; b.classList.toggle('is-picked', b.dataset.side === side); });
    $('hint').textContent = 'Locked in.';
    setTimeout(() => reveal(side), 700);
  }

  function reveal(side) {
    const q = QUESTIONS[index % QUESTIONS.length];
    const correct = side === q.answer;
    sides.forEach((b) => {
      b.classList.remove('is-picked');
      b.disabled = true;
      if (b.dataset.side === q.answer) {
        b.classList.add('is-right');
        b.insertAdjacentHTML('beforeend', `<span class="badge">${icon.check}</span>`);
      } else if (b.dataset.side === side) {
        b.classList.add('is-wrong');
        b.insertAdjacentHTML('beforeend', '<span class="yours">Your pick</span>');
      } else {
        b.classList.add('is-dim');
      }
    });
    $('hint').hidden = true;
    if (correct) {
      points += 100;
      $('pts').textContent = points;
    }
    $('result').innerHTML = correct
      ? `<p class="result-head">You know them well <span class="result-pts">+100</span></p><p class="result-note">It's ${NAMES[q.answer]}, says the couple.</p>`
      : `<p class="result-head">Not this time</p><p class="result-note">It's ${NAMES[q.answer]}, says the couple.</p>`;
    $('result').hidden = false;
    $('next').textContent = index === QUESTIONS.length - 1 ? 'Finish' : 'Next question';
    $('after').hidden = false;
  }

  sides.forEach((b) => b.addEventListener('click', () => choose(b.dataset.side)));
  $('next').addEventListener('click', () => {
    if (index === QUESTIONS.length - 1) { index = 0; show('done'); return; }
    index += 1;
    reset();
  });
  onView((name) => { if (name === 'question') reset(); });

  protoButton('Outcome: matched', () => { show('question'); index = 0; reset(); busy = true; reveal('bride'); }, 'right');
  protoButton('Outcome: missed', () => { show('question'); index = 0; reset(); busy = true; reveal('groom'); }, 'wrong');
})();
