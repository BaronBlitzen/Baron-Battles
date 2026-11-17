// Labyrinth – phone side. A big touch pad: put your thumb on it and slide
// toward the direction you want to go. Lift to stop.
import { escapeHtml } from '../../supabase.js';

const KEYS = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right',
};

export function mount({ container, me, sendInput }) {
  container.innerHTML = `
    <div class="ctl">
      <div class="ctl-role"></div>
      <div class="ctl-pad" role="application" aria-label="Movement pad">
        <span class="ctl-arrow up">▲</span>
        <span class="ctl-arrow right">▶</span>
        <span class="ctl-arrow down">▼</span>
        <span class="ctl-arrow left">◀</span>
        <span class="ctl-center" style="background:${me.color}"></span>
      </div>
      <p class="ctl-hint">Hold and slide your thumb to move</p>
      <div class="ctl-status"></div>
    </div>`;
  const pad = container.querySelector('.ctl-pad');
  const roleEl = container.querySelector('.ctl-role');
  const statusEl = container.querySelector('.ctl-status');
  let current = null;
  let pointerId = null;
  let lastStatus = null;

  function setDir(d) {
    if (d === current) return;
    current = d;
    sendInput({ dir: d });
    pad.querySelectorAll('.ctl-arrow').forEach((el) => el.classList.toggle('on', el.classList.contains(d)));
    if (d && navigator.vibrate) navigator.vibrate(8);
  }

  function fromPointer(e) {
    const r = pad.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    if (Math.hypot(dx, dy) < r.width * 0.1) return setDir(null);
    if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 'right' : 'left');
    else setDir(dy > 0 ? 'down' : 'up');
  }

  const onDown = (e) => {
    if (pointerId !== null) return;
    pointerId = e.pointerId;
    pad.setPointerCapture(e.pointerId);
    fromPointer(e);
    e.preventDefault();
  };
  const onMove = (e) => { if (e.pointerId === pointerId) fromPointer(e); };
  const onUp = (e) => {
    if (e.pointerId !== pointerId) return;
    pointerId = null;
    setDir(null);
  };
  pad.addEventListener('pointerdown', onDown);
  pad.addEventListener('pointermove', onMove);
  pad.addEventListener('pointerup', onUp);
  pad.addEventListener('pointercancel', onUp);

  // Keyboard support, handy for testing on a laptop.
  const onKeyDown = (e) => { const d = KEYS[e.key]; if (d) { setDir(d); e.preventDefault(); } };
  const onKeyUp = (e) => { if (KEYS[e.key] === current) setDir(null); };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  function showStatus(title, sub = '', cls = '') {
    statusEl.className = `ctl-status show ${cls}`;
    statusEl.innerHTML = `<h2>${escapeHtml(title)}</h2>${sub ? `<p>${escapeHtml(sub)}</p>` : ''}`;
  }

  return {
    update(state, meNow) {
      if (!state) return;
      const role = state.roles[meNow.id];
      const status = state.status[meNow.id];
      roleEl.className = `ctl-role ${role}`;
      roleEl.innerHTML = role === 'minotaur'
        ? '<b>🐂 You are the MINOTAUR</b><span>Tag everyone before they escape!</span>'
        : `<b><span class="dot" style="background:${meNow.color}"></span>You are an ESCAPEE</b><span>Reach a green exit on the TV!</span>`;

      if (status !== lastStatus && status === 'caught' && navigator.vibrate) navigator.vibrate([120, 60, 120]);
      lastStatus = status;

      if (state.phase === 'intro') showStatus('Get ready…', 'Find yourself on the TV.');
      else if (state.phase === 'over') {
        const won = (state.result === 'minotaur') === (role === 'minotaur');
        showStatus(won ? 'You win! 🎉' : 'You lose', 'Look at the TV for results.', won ? 'win' : 'lose');
      } else if (status === 'caught') showStatus('You were caught!', 'Cheer on the others.', 'lose');
      else if (status === 'escaped') showStatus('You escaped! 🎉', 'Wait for the round to end.', 'win');
      else statusEl.className = 'ctl-status';

      if (state.phase !== 'playing' || status !== 'playing') setDir(null);
    },
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    },
  };
}
