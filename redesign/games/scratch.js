(() => {
  const { $, show, onView, protoButton } = window.Game;

  const CARDS = {
    hamper: { kind: 'You’ve won', prize: 'The Luxury Wedding Hamper', note: 'Show this screen to the couple to claim it.' },
    blessing: { kind: 'A blessing', prize: 'Good karma for attending this wedding', note: 'A little something from the couple.' },
  };
  let current = 'hamper';
  let revealed = false;
  let cleanup = null;
  let revealOnSetup = false;

  // The foil: a fine champagne grain drawn once per card.
  function paintFoil(ctx, w, h) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#c9a76d';
    ctx.fillRect(0, 0, w, h);
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 34;
      d[i] += n; d[i + 1] += n * 0.9; d[i + 2] += n * 0.7;
    }
    ctx.putImageData(img, 0, 0);
    ctx.fillStyle = 'rgba(42, 26, 18, 0.78)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.round(h * 0.17)}px 'Pinyon Script', Georgia, serif`;
    ctx.fillText('Scratch here', w / 2, h / 2);
  }

  function setup() {
    cleanup && cleanup();
    revealed = false;
    const c = CARDS[current];
    $('kind').textContent = c.kind;
    $('prize').textContent = c.prize;
    $('note').textContent = 'Scratch with your finger.';
    $('after').hidden = true;

    const canvas = $('foil');
    canvas.classList.remove('gone');
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    paintFoil(ctx, canvas.width, canvas.height);

    let down = false;
    let strokes = 0;
    const at = (e) => {
      const r = canvas.getBoundingClientRect();
      return [(e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr];
    };
    const scratch = (x, y) => {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, 26 * dpr, 0, Math.PI * 2);
      ctx.fill();
      strokes += 1;
      if (strokes % 10 === 0 && cleared(ctx, canvas) > 0.5) reveal();
    };
    const onDown = (e) => { down = true; canvas.setPointerCapture(e.pointerId); scratch(...at(e)); };
    const onMove = (e) => { if (down) scratch(...at(e)); };
    const onUp = () => { down = false; };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    if (revealOnSetup) { revealOnSetup = false; reveal(); }
    cleanup = () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
    };
  }

  // Share of the foil already scratched away, sampled on a coarse grid.
  function cleared(ctx, canvas) {
    const { width: w, height: h } = canvas;
    const data = ctx.getImageData(0, 0, w, h).data;
    let clear = 0, total = 0;
    for (let y = 0; y < h; y += 12) {
      for (let x = 0; x < w; x += 12) {
        total += 1;
        if (data[(y * w + x) * 4 + 3] < 40) clear += 1;
      }
    }
    return clear / total;
  }

  function reveal() {
    if (revealed) return;
    revealed = true;
    $('foil').classList.add('gone');
    $('note').textContent = CARDS[current].note;
    $('after').hidden = false;
  }

  document.querySelectorAll('[data-to]').forEach((b) => b.addEventListener('click', () => show(b.dataset.to)));
  // The foil's lettering is drawn on canvas, so it waits for the script face.
  onView((name) => {
    if (name === 'card') (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => requestAnimationFrame(setup));
  });

  protoButton('Card holds: hamper', () => { current = 'hamper'; show('card'); });
  protoButton('Card holds: blessing', () => { current = 'blessing'; show('card'); });
  protoButton('Reveal now', () => { revealOnSetup = true; show('card'); }, 'revealed');
  protoButton('Reveal a blessing', () => { current = 'blessing'; revealOnSetup = true; show('card'); }, 'blessing');
})();
