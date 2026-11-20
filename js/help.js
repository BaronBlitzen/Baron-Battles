// The phone's "?" help button (top right of the waiting screen). Tapping it opens a
// full-screen panel: a list of games → that game's rules → extra pages (like Space Battles'
// ship cards), which load in a frame inside the panel so the phone stays in the room.
import { escapeHtml } from './supabase.js';
import { games } from './games/registry.js';

let btn = null;
let panel = null;

export function showHelpButton(show) {
  if (!btn) {
    btn = document.createElement('button');
    btn.className = 'help-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Game rules');
    btn.textContent = '?';
    btn.addEventListener('click', () => openMenu());
    document.body.appendChild(btn);
  }
  btn.hidden = !show;
  if (!show) closePanel();
}

function ensurePanel() {
  if (!panel) {
    panel = document.createElement('div');
    panel.className = 'help-panel';
    panel.addEventListener('click', (e) => {
      const b = e.target.closest('[data-help]');
      if (!b) return;
      const act = b.dataset.help;
      if (act === 'close') closePanel();
      else if (act === 'menu') openMenu();
      else if (act === 'game') openGame(b.dataset.id);
      else if (act === 'page') openPage(b.dataset.id, Number(b.dataset.i));
    });
    document.body.appendChild(panel);
  }
  panel.hidden = false;
  return panel;
}

function closePanel() {
  if (panel) {
    panel.hidden = true;
    panel.innerHTML = ''; // also unloads any ship-card frame
  }
}

const top = (title, back) => `
  <div class="help-top">
    ${back ? `<button type="button" class="help-back" data-help="${back.act}" ${back.id ? `data-id="${back.id}"` : ''}>‹ Back</button>` : '<span></span>'}
    <h2>${escapeHtml(title)}</h2>
    <button type="button" class="help-close" data-help="close" aria-label="Close">✕</button>
  </div>`;

function openMenu() {
  ensurePanel().innerHTML = `${top('Game rules')}
    <div class="help-body">
      <p class="muted">Pick a game to see how it's played.</p>
      ${games.map((g) => `<button type="button" class="help-game" data-help="game" data-id="${g.id}">
        <span class="help-icon">${g.icon}</span>
        <span><b>${escapeHtml(g.name)}</b><small>${escapeHtml(g.description)}</small></span>
        <span class="help-arrow">›</span></button>`).join('')}
    </div>`;
}

function openGame(id) {
  const g = games.find((x) => x.id === id);
  if (!g) return openMenu();
  ensurePanel().innerHTML = `${top(`${g.icon} ${g.name}`, { act: 'menu' })}
    <div class="help-body">
      ${g.extras?.length ? `<div class="help-extras">${g.extras.map((x, i) =>
        `<button type="button" class="big-btn" data-help="page" data-id="${g.id}" data-i="${i}">${escapeHtml(x.label)}</button>`).join('')}</div>` : ''}
      <p class="muted">${g.minPlayers}–${g.maxPlayers} players</p>
      <div class="help-rules">${(g.rules || ['No rules written yet.']).map((r) => `<p>${r}</p>`).join('')}</div>
    </div>`;
  panel.scrollTop = 0;
}

function openPage(id, i) {
  const g = games.find((x) => x.id === id);
  const x = g?.extras?.[i];
  if (!x) return openMenu();
  ensurePanel().innerHTML = `${top(x.label, { act: 'game', id })}
    <iframe class="help-frame" src="${escapeHtml(x.href)}" title="${escapeHtml(x.label)}"></iframe>`;
}
