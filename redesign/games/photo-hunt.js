(() => {
  const { $, show, protoButton, icon } = window.Game;

  const TASKS = [
    { label: 'Dhol player', sent: true },
    { label: 'Couple dancing', sent: true },
    { label: 'Someone taking selfies', sent: true },
    { label: 'Group hug', sent: false },
    { label: 'Bride with happy tears', sent: false },
    { label: 'Selfie with someone over 60', sent: false },
    { label: 'Kid having a meltdown', sent: false },
    { label: 'Someone sleeping', sent: false },
    { label: 'Someone crying', sent: false },
  ];
  const camera = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
  let current = null;
  let pendingUrl = null;

  function render() {
    const list = $('tasks');
    list.innerHTML = '';
    TASKS.forEach((t, i) => {
      const li = document.createElement('li');
      li.className = 'task' + (t.sent ? ' is-sent' : '');
      li.innerHTML = `<div><p class="task-name">${t.label}</p><p class="task-pts">50 points</p></div>`;
      if (t.sent) {
        li.insertAdjacentHTML('beforeend', `<span class="task-sent">${icon.check}Sent</span>`);
      } else {
        const label = document.createElement('label');
        label.className = 'task-act';
        label.innerHTML = `${camera}<span>Take photo</span><input type="file" accept="image/*" capture="environment" aria-label="Take a photo for ${t.label}" />`;
        label.querySelector('input').addEventListener('change', (e) => pick(i, e.target.files[0]));
        li.appendChild(label);
      }
      list.appendChild(li);
    });
    const found = TASKS.filter((t) => t.sent).length;
    $('found').textContent = found;
    $('pts').textContent = found * 50;
    $('bar').style.setProperty('--done', `${Math.round((found / TASKS.length) * 100)}%`);
  }

  function pick(i, file) {
    current = i;
    $('send-task').textContent = TASKS[i].label;
    pendingUrl && URL.revokeObjectURL(pendingUrl);
    pendingUrl = file ? URL.createObjectURL(file) : null;
    $('shot').innerHTML = pendingUrl ? `<img src="${pendingUrl}" alt="Your photo for ${TASKS[i].label}" />` : 'Your photo appears here';
    show('send');
  }

  $('retake').addEventListener('change', (e) => pick(current ?? 3, e.target.files[0]));
  $('send').addEventListener('click', () => {
    if (current != null) TASKS[current].sent = true;
    render();
    show('list');
  });

  protoButton('Pretend a photo was taken', () => pick(3, null), 'sending');
  render();
})();
