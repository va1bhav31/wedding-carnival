(() => {
  const { $, show, onView, protoButton, icon } = window.Game;

  const QUESTIONS = [
    { prompt: 'Where did they first meet?', options: ['College orientation in Pune', 'A friend’s wedding in Jaipur', 'On a work trip to Bengaluru', 'A dating app'], answer: 1 },
    { prompt: 'Who texted first?', options: ['Aanya', 'Vihaan', 'A mutual friend, on their behalf', 'Neither, they met again by chance'], answer: 0 },
    { prompt: 'What’s the groom’s favourite food?', options: ['Rajma chawal', 'Butter chicken', 'Masala dosa', 'Pav bhaji'], answer: 2 },
  ];
  const LETTERS = ['A', 'B', 'C', 'D'];
  let index = 0;
  let points = 100;
  let busy = false;

  function render() {
    busy = false;
    const q = QUESTIONS[index];
    $('prompt').textContent = q.prompt;
    $('counter').textContent = `Question ${2 + index} of 5`;
    const list = $('opts');
    list.innerHTML = '';
    q.options.forEach((label, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'opt';
      b.innerHTML = `<span class="mark">${LETTERS[i]}</span><span>${label}</span>`;
      b.addEventListener('click', () => choose(i));
      li.appendChild(b);
      list.appendChild(li);
    });
    $('hint').hidden = false;
    $('hint').textContent = 'Pick one. You get one try.';
    $('result').hidden = true;
    $('after').hidden = true;
  }

  function choose(i) {
    if (busy) return;
    busy = true;
    const rows = [...$('opts').querySelectorAll('.opt')];
    rows.forEach((b, j) => { b.disabled = true; b.classList.toggle('is-picked', j === i); });
    $('hint').textContent = 'Locked in.';
    setTimeout(() => reveal(i), 700);
  }

  function reveal(i) {
    const q = QUESTIONS[index];
    const correct = i === q.answer;
    [...$('opts').querySelectorAll('.opt')].forEach((b, j) => {
      b.disabled = true;
      b.classList.remove('is-picked');
      const tag = document.createElement('span');
      tag.className = 'tag';
      if (j === q.answer) {
        b.classList.add('is-right');
        b.querySelector('.mark').innerHTML = icon.check;
        tag.textContent = 'Right answer';
        b.appendChild(tag);
      } else if (j === i) {
        b.classList.add('is-wrong');
        b.querySelector('.mark').innerHTML = icon.cross;
        tag.textContent = 'Your pick';
        b.appendChild(tag);
      } else {
        b.classList.add('is-dim');
      }
    });
    $('hint').hidden = true;
    if (correct) { points += 100; $('pts').textContent = points; }
    $('result').innerHTML = correct
      ? '<p class="result-head">Right <span class="result-pts">+100</span></p>'
      : `<p class="result-head">Not quite</p><p class="result-note">The answer: ${q.options[q.answer]}.</p>`;
    $('result').hidden = false;
    $('next').textContent = index === QUESTIONS.length - 1 ? 'Finish' : 'Next question';
    $('after').hidden = false;
  }

  $('next').addEventListener('click', () => {
    if (index === QUESTIONS.length - 1) { index = 0; show('done'); return; }
    index += 1;
    render();
  });
  document.querySelectorAll('[data-to]').forEach((b) => b.addEventListener('click', () => show(b.dataset.to)));
  onView((name) => { if (name === 'question') render(); });

  protoButton('Outcome: right', () => { show('question'); index = 0; render(); busy = true; reveal(1); }, 'right');
  protoButton('Outcome: wrong', () => { show('question'); index = 0; render(); busy = true; reveal(3); }, 'wrong');
})();
