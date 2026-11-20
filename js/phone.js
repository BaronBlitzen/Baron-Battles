// Phone controller page: join a room, then show whatever controller
// the current game needs.
import { roomChannel, session, local, escapeHtml } from './supabase.js';
import { games } from './games/registry.js';
import { showHelpButton } from './help.js';

const app = document.getElementById('app');
const params = new URLSearchParams(location.search);
let code = (params.get('room') || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);

// One id per browser tab, so a refresh keeps you in the game
// (and two tabs on a laptop act as two players for testing).
let myId = session.get('pmg-id');
if (!myId) {
  myId = Math.random().toString(36).slice(2, 10);
  session.set('pmg-id', myId);
}

let name = local.get('pmg-name') || '';
let channel = null;
let gotState = false;
let helloTimer = null;
let controller = null;
let controllerGame = null;
let mounting = null;
let latestState = null;
let wakeLock = null;

function renderJoin(error = '') {
  showHelpButton(false);
  app.innerHTML = `
    <form class="join-form">
      <h1>Poulson <span>Mini Games</span></h1>
      ${error ? `<p class="error">${escapeHtml(error)}</p>` : ''}
      <label>Room code
        <input name="code" value="${escapeHtml(code)}" maxlength="4" autocapitalize="characters" autocomplete="off" placeholder="ABCD" required>
      </label>
      <label>Your name
        <input name="name" value="${escapeHtml(name)}" maxlength="12" autocomplete="off" placeholder="Name" required>
      </label>
      <button type="submit" class="big-btn">Join</button>
    </form>`;
  const form = app.querySelector('form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    code = form.code.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
    name = form.name.value.trim().slice(0, 12);
    if (code.length !== 4) return renderJoin('Room codes are 4 letters.');
    if (!name) return renderJoin('Please enter a name.');
    local.set('pmg-name', name);
    session.set('pmg-joined', code);
    requestWakeLock();
    connect();
  });
  if (code) form.name.focus();
}

function renderMessage(title, sub = '', showBack = false) {
  showHelpButton(false);
  destroyController();
  app.innerHTML = `
    <div class="phone-msg">
      <h2>${escapeHtml(title)}</h2>
      ${sub ? `<p>${escapeHtml(sub)}</p>` : ''}
      ${showBack ? '<button class="big-btn" id="back">Try a different code</button>' : ''}
    </div>`;
  app.querySelector('#back')?.addEventListener('click', leave);
}

function renderWaiting(me) {
  showHelpButton(true);
  destroyController();
  app.innerHTML = `
    <div class="phone-msg">
      <div class="avatar" style="background:${me.color}">${escapeHtml(me.name[0] || '?')}</div>
      <h2>You're in, ${escapeHtml(me.name)}!</h2>
      <p>Look at the TV. The game will start on your phone automatically.</p>
      <p class="muted">Room ${code}</p>
    </div>`;
}

function connect() {
  renderMessage(`Joining room ${code}…`);
  gotState = false;
  channel = roomChannel(code, myId);
  channel
    .on('broadcast', { event: 'state' }, ({ payload }) => onState(payload))
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ name });
        sayHello();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        if (!gotState) renderMessage('Connection problem', 'Retrying…');
      }
    });

  let tries = 0;
  clearInterval(helloTimer);
  helloTimer = setInterval(() => {
    if (gotState) return;
    tries++;
    sayHello();
    if (tries === 3) renderMessage(`Can't find room ${code}`, 'Check the code shown on the TV.', true);
  }, 2000);
}

function sayHello() {
  channel?.send({ type: 'broadcast', event: 'hello', payload: { id: myId } });
}

function leave() {
  clearInterval(helloTimer);
  if (channel) channel.unsubscribe();
  channel = null;
  code = '';
  session.set('pmg-joined', '');
  history.replaceState(null, '', location.pathname);
  renderJoin();
}

function sendInput(msg) {
  channel?.send({ type: 'broadcast', event: 'input', payload: { id: myId, ...msg } });
}

async function onState(state) {
  gotState = true;
  latestState = state;
  const me = state.players.find((p) => p.id === myId);

  if (state.view === 'lobby') {
    if (me) renderWaiting(me);
    else if (state.players.length >= 8) renderMessage('This room is full', 'Up to 8 players can join.');
    else renderMessage(`Joining room ${code}…`);
    return;
  }
  if (!me) {
    renderMessage('A game is in progress', "You'll join when this round ends.");
    return;
  }

  const game = games.find((g) => g.id === state.view);
  if (!game) return;
  if (controllerGame !== game.id) {
    if (mounting) return; // the state will be applied once loading finishes
    destroyController();
    showHelpButton(false);
    app.innerHTML = '<div class="phone-msg"><h2>Loading…</h2></div>';
    mounting = game.controller().then((mod) => {
      app.innerHTML = '';
      controller = mod.mount({ container: app, me, sendInput });
      controllerGame = game.id;
    });
    await mounting;
    mounting = null;
  }
  const latestMe = latestState.players.find((p) => p.id === myId) || me;
  if (latestState.view === controllerGame) controller.update(latestState.game, latestMe);
  else onState(latestState);
}

function destroyController() {
  controller?.destroy();
  controller = null;
  controllerGame = null;
}

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
  } catch { /* not supported or not allowed; the game still works */ }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && channel) {
    requestWakeLock();
    sayHello();
  }
});

if (code && name && session.get('pmg-joined') === code) {
  // Coming back from a refresh: rejoin straight away.
  connect();
} else {
  renderJoin();
}
