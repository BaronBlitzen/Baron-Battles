// TV / laptop screen: creates the room, shows the QR code, lists players,
// lets the host pick a game, and runs the game.
import { roomChannel, session, escapeHtml } from './supabase.js';
import { games } from './games/registry.js';

const COLORS = ['#ff5d5d', '#4dabf7', '#51cf66', '#fcc419', '#cc5de8', '#ff922b', '#22b8cf', '#f06595'];
const MAX_PLAYERS = 8;
const app = document.getElementById('app');

function makeCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let s = '';
  for (let i = 0; i < 4; i++) s += letters[Math.floor(Math.random() * letters.length)];
  return s;
}

// Keep the same room code if the TV page is refreshed.
const code = session.get('pmg-room') || makeCode();
session.set('pmg-room', code);
const joinPage = new URL('join.html', location.href);
const joinUrl = `${joinPage.href}?room=${code}`;

const roster = new Map(); // id -> { id, name, color, online }
let view = 'lobby';
let activeGame = null;
let gameState = null;
let connected = false;

const channel = roomChannel(code, 'host');
channel
  .on('presence', { event: 'sync' }, syncPresence)
  .on('broadcast', { event: 'hello' }, () => broadcastState())
  .on('broadcast', { event: 'input' }, ({ payload }) => activeGame?.handleInput(payload.id, payload))
  .subscribe(async (status) => {
    connected = status === 'SUBSCRIBED';
    // The TV must announce itself too, or Supabase won't send it the player list.
    if (connected) { await channel.track({ host: true }); broadcastState(); }
    if (view === 'lobby') renderLobby();
  });

function nextColor() {
  const used = new Set([...roster.values()].map((p) => p.color));
  return COLORS.find((c) => !used.has(c)) || COLORS[roster.size % COLORS.length];
}

function syncPresence() {
  const present = channel.presenceState();
  delete present.host;
  const onlineIds = new Set(Object.keys(present));
  for (const [id, metas] of Object.entries(present)) {
    const name = (metas[0]?.name || 'Player').slice(0, 12);
    const existing = roster.get(id);
    if (existing) existing.name = name;
    else if (view === 'lobby' && roster.size < MAX_PLAYERS) roster.set(id, { id, name, color: nextColor(), online: true });
  }
  for (const p of roster.values()) p.online = onlineIds.has(p.id);
  if (view === 'lobby') {
    for (const p of [...roster.values()]) if (!p.online) roster.delete(p.id);
  }
  activeGame?.setOnline?.(onlineIds);
  broadcastState();
  if (view === 'lobby') renderLobby();
}

function broadcastState() {
  if (!connected) return;
  channel.send({
    type: 'broadcast',
    event: 'state',
    payload: { view, players: [...roster.values()], game: gameState },
  });
}

function qrSvg(text) {
  if (!window.qrcode) return `<p>${escapeHtml(text)}</p>`;
  const qr = window.qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
}

function renderLobby() {
  const players = [...roster.values()];
  const count = players.length;
  app.innerHTML = `
    <div class="lobby">
      <header class="brand">
        <h1>Poulson <span>Mini Games</span></h1>
        <p class="status ${connected ? 'ok' : 'warn'}">${connected ? 'Room open' : 'Connecting…'}</p>
      </header>

      <section class="card join-panel">
        <div class="qr">${qrSvg(joinUrl)}</div>
        <p class="muted">Scan to join, or open</p>
        <p class="join-url">${escapeHtml(joinPage.host + joinPage.pathname)}</p>
        <p class="room-code">Room code <strong>${code}</strong></p>
      </section>

      <section class="card players">
        <h2>Players <small>${count}/${MAX_PLAYERS}</small></h2>
        ${count === 0 ? '<p class="muted">Waiting for players to join…</p>' : ''}
        <ul>
          ${players.map((p) => `<li><span class="dot" style="background:${p.color}"></span>${escapeHtml(p.name)}</li>`).join('')}
        </ul>
      </section>

      <section class="games">
        <h2>Pick a game</h2>
        <div class="game-grid">
          ${games.map((g) => {
            const ok = count >= g.minPlayers && count <= g.maxPlayers;
            return `
              <button class="game-card" data-game="${g.id}" ${ok ? '' : 'disabled'}>
                <span class="game-icon">${g.icon}</span>
                <span class="game-name">${escapeHtml(g.name)}</span>
                <span class="game-desc">${escapeHtml(g.description)}</span>
                <span class="game-players">${ok ? 'Ready to play' : `Needs ${g.minPlayers}–${g.maxPlayers} players`}</span>
              </button>`;
          }).join('')}
          <div class="game-card soon">
            <span class="game-icon">✨</span>
            <span class="game-name">More games</span>
            <span class="game-desc">Coming soon</span>
          </div>
        </div>
      </section>
    </div>`;

  app.querySelectorAll('.game-card[data-game]').forEach((btn) => {
    btn.addEventListener('click', () => startGame(games.find((g) => g.id === btn.dataset.game)));
  });
}

async function startGame(game) {
  const players = [...roster.values()].filter((p) => p.online).map((p) => ({ ...p }));
  if (players.length < game.minPlayers || players.length > game.maxPlayers) return;
  const mod = await game.host();
  view = game.id;
  gameState = null;
  app.innerHTML = '<div class="game-stage"></div>';
  activeGame = mod.start({
    container: app.firstElementChild,
    players,
    setPhoneState(s) { gameState = s; broadcastState(); },
    onExit(action) {
      stopGame();
      if (action === 'again') startGame(game);
    },
  });
  broadcastState();
}

function stopGame() {
  activeGame?.stop();
  activeGame = null;
  view = 'lobby';
  gameState = null;
  syncPresence();
}

// Esc on the laptop quits back to the game menu.
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && activeGame && confirm('Quit this game and go back to the menu?')) stopGame();
});

renderLobby();
