(() => {
  const { $, show, onView, reduce, protoButton } = window.Game;

  const DARES = [
    { title: 'Selfie Sprint', desc: 'First team to take one group selfie with ten people in it.' },
    { title: 'Human Pyramid', desc: 'Build a mini human pyramid of four or five people.' },
    { title: 'Find the Colour', desc: 'Bring back five people wearing pink.' },
    { title: 'Wedding Prop Hunt', desc: 'Find someone in glasses, someone with a beard and someone in sneakers.' },
  ];
  const LANDS_ON = 1;
  let spinTimer = 0;

  const fill = (id) => {
    $(id).innerHTML = DARES.map((d) => `<li>${d.title}</li>`).join('');
  };
  fill('drum-wait');
  fill('drum-spin');

  // Steps through the dares, slowing down, and stops on the chosen one.
  function spin() {
    clearTimeout(spinTimer);
    const rows = [...$('drum-spin').children];
    $('spin-hint').textContent = 'Watch the big screen.';
    if (reduce) { land(); return; }
    let i = 0;
    let delay = 70;
    const total = DARES.length * 4 + LANDS_ON;
    const step = (n) => {
      rows.forEach((r, j) => r.classList.toggle('is-on', j === i));
      if (n >= total) { spinTimer = setTimeout(land, 700); return; }
      i = (i + 1) % DARES.length;
      delay *= 1.14;
      spinTimer = setTimeout(() => step(n + 1), delay);
    };
    step(0);
  }

  function land() {
    $('dare-title').textContent = DARES[LANDS_ON].title;
    $('dare-desc').textContent = DARES[LANDS_ON].desc;
    show('dare');
  }

  onView((name) => {
    if (name === 'spinning') spin();
    else clearTimeout(spinTimer);
  });

  protoButton('Host spins now', () => show('spinning'));
})();
