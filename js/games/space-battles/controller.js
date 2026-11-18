// Space Battles – phone side. Team select, ship claiming, My Fleet, the movement
// planner (with a mini-map and ghost path) and the fire planner.
// Plans stay on this phone until Ready is tapped; the TV checks every choice.
import { escapeHtml } from '../../supabase.js';
import { FACTIONS, FACTION_ORDER, CLASSES, WEAPONS, ZONES, ARCS, ZONE_NAMES, RANGE_BANDS } from './data.js';
import {
  classOf, shipDef, corners, speedOptions, maxClicks, defaultMovePlan, planWaypoints,
  validTargets, defaultFirePlan, arcWeapons,
} from './rules.js';

const BAND_NAMES = Object.fromEntries(RANGE_BANDS.map((b) => [b.id, b.name]));
const VIEW_W = 18, VIEW_H = 12; // mini-map window, in units

// Vibrate only after the player has touched the page (browsers block it otherwise).
function buzz(ms) {
  if (navigator.vibrate && navigator.userActivation?.hasBeenActive) navigator.vibrate(ms);
}

export function mount({ container, me, sendInput }) {
  container.innerHTML = '<div class="sbp"></div>';
  const root = container.firstElementChild;
  let state = null;
  let meNow = me;
  let draftKey = null;
  let moveDraft = {}; // shipId -> { speed, clicks }
  let fireDraft = {}; // shipId -> [{ arc, targetId }]
  let selShip = null;
  let selSeg = 0;
  let selRow = 0;
  let notice = '';
  let deadline = 0;
  let lastPhase = null;

  const myId = () => meNow.id;
  const myShips = () => (state?.ships || []).filter((s) => s.owner === myId());
  const myLiving = () => myShips().filter((s) => s.alive);
  const shipById = (id) => state.ships.find((s) => s.id === id);
  const person = (id) => state?.people?.[id] || { name: '?', color: '#888' };
  const isReady = () => !!state?.ready?.[myId()];

  function resetDrafts() {
    draftKey = state.phaseKey;
    moveDraft = {};
    fireDraft = {};
    for (const s of myLiving()) {
      moveDraft[s.id] = defaultMovePlan(s);
      fireDraft[s.id] = defaultFirePlan(s, state.ships, state.asteroids);
    }
    const living = myLiving();
    if (!living.some((s) => s.id === selShip)) selShip = living[0]?.id || null;
    selSeg = 0;
    selRow = 0;
    notice = '';
  }

  // ---------- Pieces ----------
  function header() {
    const phaseName = {
      setup: 'Fleet Setup', intro: 'Battle stations', planMove: 'Plan Movement', move: 'Moving…',
      planFire: 'Plan Fire', fire: 'Firing…', over: 'Battle over',
    }[state.phase];
    const round = state.phase === 'setup' ? '' : `Round ${Math.max(1, state.round)}/${state.maxRounds} · `;
    const f = state.teams?.[myId()];
    return `
      <div class="sbp-head" style="--fc:${f ? FACTIONS[f].color : 'var(--line)'}">
        <span><span class="dot" style="background:${meNow.color}"></span>${escapeHtml(meNow.name)}${f ? ` · ${escapeHtml(FACTIONS[f].short)}` : ''}</span>
        <span>${round}${phaseName} <b class="sbp-timer"></b></span>
      </div>`;
  }

  function shieldText(sh) {
    return ZONES.map((z) => `${ZONE_NAMES[z][0]}${z === 'rear' ? 'r' : ''} ${sh[z]}`).join(' · ');
  }

  function fleetList() {
    const mine = myShips();
    if (!mine.length) return '';
    return `
      <h3 class="sbp-h">My Fleet</h3>
      <ul class="sbp-fleet">
        ${mine.map((s) => {
          const def = shipDef(s);
          const frac = Math.max(0, s.hull / def.hull);
          return `
            <li class="${s.alive ? '' : 'dead'}">
              <div class="sbp-fleet-top"><b>${escapeHtml(def.name)}</b><small>${escapeHtml(CLASSES[def.class].name)}</small></div>
              ${s.alive ? `
                <div class="sbp-bar"><span style="width:${frac * 100}%;background:${frac > 0.5 ? 'var(--green)' : frac > 0.25 ? '#fcc419' : 'var(--red)'}"></span></div>
                <div class="sbp-stats">Hull ${s.hull}/${def.hull} · Speed ${s.speed} <small>(${def.speed[0]}–${def.speed[1]})</small></div>
                <div class="sbp-stats">Shields ${shieldText(s.shields)}</div>` : '<div class="sbp-stats red">Destroyed</div>'}
            </li>`;
        }).join('')}
      </ul>`;
  }

  function shipTabs() {
    const living = myLiving();
    if (living.length < 2) return '';
    return `<div class="sbp-tabs">${living.map((s) => `
      <button data-act="ship" data-id="${s.id}" class="${s.id === selShip ? 'on' : ''}">${escapeHtml(shipDef(s).short)}</button>`).join('')}</div>`;
  }

  function readyBar(label) {
    return `
      <p class="sbp-notice">${escapeHtml(notice)}</p>
      <button class="big-btn sbp-ready" data-act="send">${label}</button>
      <p class="sbp-keys muted">${state.phase === 'planMove'
        ? 'Keys: ↑↓ speed · ←→ turn · Q/E segment · N next ship · Enter send'
        : 'Keys: ↑↓ choose · Space pick · N next ship · Enter send'}</p>`;
  }

  // ---------- Views ----------
  function viewSetup() {
    const myTeam = state.teams[myId()];
    const fleet = myTeam ? state.ships.filter((s) => s.faction === myTeam) : [];
    const owned = fleet.filter((s) => s.owner === myId()).length;
    return `
      ${header()}
      <div class="sbp-body">
        <h3 class="sbp-h">Pick your side</h3>
        <div class="sbp-factions">
          ${FACTION_ORDER.map((f, i) => {
            const fd = FACTIONS[f];
            const n = Object.values(state.teams).filter((t) => t === f).length;
            return `<button data-act="team" data-f="${f}" ${fd.available ? '' : 'disabled'}
              class="${myTeam === f ? 'on' : ''}" style="--fc:${fd.color}">
              <b>${escapeHtml(fd.short)}</b><small>${fd.available ? `${n} player${n === 1 ? '' : 's'} · key ${i + 1}` : 'Coming soon'}</small></button>`;
          }).join('')}
        </div>
        ${myTeam ? `
          <h3 class="sbp-h">${escapeHtml(FACTIONS[myTeam].short)} fleet <small class="muted">tap to claim</small></h3>
          <ul class="sbp-claims">
            ${fleet.map((s) => {
              const def = shipDef(s);
              const mine = s.owner === myId();
              const other = s.owner && !mine;
              return `<li class="${mine ? 'mine' : ''}">
                <div><b>${escapeHtml(def.name)}</b>
                  <small>${escapeHtml(CLASSES[def.class].name)} · Hull ${def.hull} · Speed ${def.speed[0]}–${def.speed[1]}</small></div>
                ${mine ? `<button data-act="release" data-id="${s.id}">Release</button>`
                  : other ? `<span class="sbp-owner" style="color:${person(s.owner).color}">${escapeHtml(person(s.owner).name)}</span>`
                  : `<button data-act="claim" data-id="${s.id}" class="primary">Claim</button>`}
              </li>`;
            }).join('')}
          </ul>
          <button class="big-btn sbp-ready ${isReady() ? 'ghost' : ''}" data-act="setupReady" ${owned ? '' : 'disabled'}>
            ${isReady() ? '✔ Ready (tap to undo)' : owned ? 'Ready' : 'Claim a ship first'}</button>` : '<p class="muted">Tap a faction to join it.</p>'}
        ${state.problems?.length ? `<ul class="sbp-problems">${state.problems.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul>` : ''}
      </div>`;
  }

  function viewWatch(title, sub) {
    return `
      ${header()}
      <div class="sbp-body">
        <div class="sbp-watch"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(sub)}</p></div>
        ${fleetList()}
      </div>`;
  }

  function viewSent() {
    return `
      ${header()}
      <div class="sbp-body">
        <div class="sbp-watch"><h2>Orders sent ✔</h2><p>Waiting for the other players…</p>
          <button class="big-btn ghost" data-act="unready">Change orders</button></div>
        ${fleetList()}
      </div>`;
  }

  function turnLabel(c) {
    if (!c) return 'Straight';
    return `${c < 0 ? 'Left' : 'Right'} ${Math.abs(c)} <small>(${Math.abs(c) * 15}°)</small>`;
  }

  function viewPlanMove() {
    const s = shipById(selShip);
    const d = moveDraft[s.id];
    const opts = speedOptions(s);
    const mc = maxClicks(s, d.speed);
    return `
      ${header()}
      <div class="sbp-body">
        ${shipTabs()}
        <div class="sbp-shipname"><b>${escapeHtml(shipDef(s).name)}</b> <small class="muted">Hull ${s.hull} · ${shieldText(s.shields)}</small></div>
        <canvas class="sbp-map"></canvas>
        ${s.burn ? '<p class="sbp-burn">🔥 Every ship is home: free Full Burn this round. Change speed by up to 2, up to 1 over max.</p>' : ''}
        <div class="sbp-speed">
          <button data-act="speed" data-d="-1" ${d.speed > opts[0] ? '' : 'disabled'}>−</button>
          <div><b>Speed ${d.speed}</b><small>${d.speed === s.speed ? 'same as now' : d.speed > s.speed ? 'speeding up' : 'slowing down'} · ${d.speed * 2} u</small></div>
          <button data-act="speed" data-d="1" ${d.speed < opts[opts.length - 1] ? '' : 'disabled'}>+</button>
        </div>
        <ul class="sbp-segs">
          ${d.clicks.map((c, i) => `
            <li class="${i === selSeg ? 'on' : ''}" data-act="seg" data-i="${i}">
              <span>Segment ${i + 1}</span>
              <button data-act="turn" data-i="${i}" data-d="-1" ${c > -mc ? '' : 'disabled'}>◀</button>
              <b>${turnLabel(c)}</b>
              <button data-act="turn" data-i="${i}" data-d="1" ${c < mc ? '' : 'disabled'}>▶</button>
            </li>`).join('')}
        </ul>
        <p class="muted sbp-small">Up to ${mc} click${mc > 1 ? 's' : ''} (${mc * 15}°) per segment. Each segment turns first, then flies 2 u.</p>
        ${readyBar(myLiving().length > 1 ? 'Send orders for all ships' : 'Send orders')}
        ${fleetList()}
      </div>`;
  }

  function fireRows(s) {
    const rows = [];
    for (const arc of ARCS) {
      if (!arcWeapons(s, arc).length) continue;
      for (const t of validTargets(s, arc, state.ships, state.asteroids)) rows.push({ arc, ...t });
    }
    return rows;
  }

  function viewPlanFire() {
    const s = shipById(selShip);
    const draft = fireDraft[s.id];
    const rows = fireRows(s);
    let r = 0;
    return `
      ${header()}
      <div class="sbp-body">
        ${shipTabs()}
        <div class="sbp-shipname"><b>${escapeHtml(shipDef(s).name)}</b> <small class="muted">Arcs firing ${draft.length}/2</small></div>
        <canvas class="sbp-map"></canvas>
        ${ARCS.filter((arc) => arcWeapons(s, arc).length).map((arc) => {
          const ws = arcWeapons(s, arc).map((w) => `${w.shots} ${WEAPONS[w.weapon].name}`).join(' + ');
          const targets = rows.filter((x) => x.arc === arc);
          const chosen = draft.find((a) => a.arc === arc);
          return `
            <div class="sbp-arc ${chosen ? 'on' : ''}">
              <div class="sbp-arc-head"><b>${arc === 'turret' ? 'Turret <small>(any direction)</small>' : `${ZONE_NAMES[arc]} arc`}</b><small>${escapeHtml(ws)}</small></div>
              ${targets.length ? targets.map((t) => {
                const ts = shipById(t.id);
                const on = chosen?.targetId === t.id;
                const idx = r++;
                return `<button class="sbp-target ${on ? 'on' : ''} ${idx === selRow ? 'cursor' : ''}" data-act="target" data-arc="${arc}" data-id="${t.id}">
                  <span><span class="dot" style="background:${person(ts.owner).color}"></span>${escapeHtml(shipDef(ts).short)} <small>${escapeHtml(person(ts.owner).name)}</small></span>
                  <span>${BAND_NAMES[t.band]} · ≈${t.expected.toFixed(1)} dmg ${on ? '✔' : ''}</span></button>`;
              }).join('') : '<p class="muted sbp-small">No valid targets</p>'}
            </div>`;
        }).join('')}
        ${readyBar(myLiving().length > 1 ? 'Send orders for all ships' : 'Send orders')}
        ${fleetList()}
      </div>`;
  }

  function viewOver() {
    const myTeam = state.teams[myId()];
    const w = state.result?.winner;
    const won = w && w === myTeam;
    const title = !w ? 'Draw!' : won ? 'Victory! 🎉' : 'Defeat';
    return `
      ${header()}
      <div class="sbp-body">
        <div class="sbp-watch ${!w ? '' : won ? 'win' : 'lose'}"><h2>${title}</h2><p>${escapeHtml(state.result?.reason || '')}</p><p>Look at the TV.</p></div>
        ${fleetList()}
      </div>`;
  }

  // ---------- Mini-map ----------
  function drawMap() {
    const canvas = root.querySelector('.sbp-map');
    if (!canvas) return;
    const s = shipById(selShip);
    const w = canvas.clientWidth;
    const h = Math.round((w * VIEW_H) / VIEW_W);
    const dpr = window.devicePixelRatio || 1;
    canvas.style.height = `${h}px`;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const k = w / VIEW_W;

    let focus = { x: s.x, y: s.y };
    let path = null;
    if (state.phase === 'planMove') {
      path = planWaypoints(s, moveDraft[s.id]);
      const end = path[path.length - 1];
      focus = { x: (s.x + end.x) / 2, y: (s.y + end.y) / 2 };
    }
    const { w: MW, h: MH } = state.map;
    const clampView = (c, view, size) => (view >= size ? size / 2 : Math.max(view / 2, Math.min(size - view / 2, c)));
    const ox = clampView(focus.x, VIEW_W, MW) - VIEW_W / 2;
    const oy = clampView(focus.y, VIEW_H, MH) - VIEW_H / 2;
    const X = (x) => (x - ox) * k, Y = (y) => (y - oy) * k;

    ctx.fillStyle = '#05071a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#000';
    ctx.strokeStyle = 'rgba(120,140,220,.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(X(0), Y(0), MW * k, MH * k);
    ctx.strokeStyle = 'rgba(255,255,255,.06)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= MW; gx += 2) { ctx.beginPath(); ctx.moveTo(X(gx), Y(0)); ctx.lineTo(X(gx), Y(MH)); ctx.stroke(); }
    for (let gy = 0; gy <= MH; gy += 2) { ctx.beginPath(); ctx.moveTo(X(0), Y(gy)); ctx.lineTo(X(MW), Y(gy)); ctx.stroke(); }

    for (const r of state.asteroids) {
      ctx.fillStyle = '#4a4458';
      ctx.strokeStyle = '#8a82a0';
      ctx.beginPath();
      ctx.arc(X(r.x), Y(r.y), r.r * k, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    if (state.phase === 'planFire') {
      // Faint wedge for each arc with a weapon, plus lines to the chosen targets.
      const ANG = { front: 0, right: 90, rear: 180, left: -90 };
      if (arcWeapons(s, 'turret').length) {
        // Turret: fires in any direction, so draw a faint ring at long range.
        const chosen = fireDraft[s.id].some((a) => a.arc === 'turret');
        ctx.strokeStyle = chosen ? 'rgba(255,183,3,.45)' : 'rgba(255,255,255,.15)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.arc(X(s.x), Y(s.y), 9.5 * k, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      for (const arc of ZONES) {
        if (!arcWeapons(s, arc).length) continue;
        const chosen = fireDraft[s.id].some((a) => a.arc === arc);
        const mid = ((s.heading + ANG[arc]) * Math.PI) / 180;
        ctx.fillStyle = chosen ? 'rgba(255,183,3,.16)' : 'rgba(255,255,255,.05)';
        ctx.beginPath();
        ctx.moveTo(X(s.x), Y(s.y));
        ctx.arc(X(s.x), Y(s.y), 9.5 * k, mid - Math.PI / 4, mid + Math.PI / 4);
        ctx.closePath();
        ctx.fill();
      }
      for (const a of fireDraft[s.id]) {
        const t = shipById(a.targetId);
        ctx.strokeStyle = '#ffb703';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(X(s.x), Y(s.y));
        ctx.lineTo(X(t.x), Y(t.y));
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    const outline = (pose, ship, stroke, fill, width = 2) => {
      const pts = corners(pose, classOf(ship));
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
      ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.stroke();
      // nose marker
      const rad = (pose.heading * Math.PI) / 180;
      const L = classOf(ship).length / 2;
      ctx.fillStyle = stroke;
      ctx.beginPath();
      ctx.arc(X(pose.x + Math.cos(rad) * L), Y(pose.y + Math.sin(rad) * L), 2.5, 0, Math.PI * 2);
      ctx.fill();
    };

    for (const o of state.ships) {
      if (!o.alive) continue;
      const c = person(o.owner).color;
      outline(o, o, c, o.id === s.id ? `${c}55` : `${c}22`, o.id === s.id ? 3 : 2);
    }

    if (path) {
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      path.forEach((p, i) => (i ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y))));
      ctx.stroke();
      ctx.setLineDash([]);
      path.slice(1).forEach((p, i) => {
        ctx.fillStyle = i === selSeg ? '#ffb703' : '#fff';
        ctx.beginPath();
        ctx.arc(X(p.x), Y(p.y), i === selSeg ? 4 : 3, 0, Math.PI * 2);
        ctx.fill();
      });
      outline(path[path.length - 1], s, 'rgba(255,255,255,.9)', 'rgba(255,255,255,.12)', 1.5);
    }
  }

  // ---------- Render ----------
  function render() {
    if (!state) return;
    if (state.phase === 'setup') root.innerHTML = viewSetup();
    else if (state.phase === 'intro') root.innerHTML = viewWatch('Battle stations!', 'Find your ships on the TV.');
    else if (state.phase === 'move') root.innerHTML = viewWatch('Ships are moving', 'Watch the TV.');
    else if (state.phase === 'fire') root.innerHTML = viewWatch('Open fire!', 'Watch the TV.');
    else if (state.phase === 'over') root.innerHTML = viewOver();
    else if (!myLiving().length) root.innerHTML = viewWatch(myShips().length ? 'Your fleet is gone' : 'Spectating', 'Cheer on your team on the TV.');
    else if (isReady()) root.innerHTML = viewSent();
    else root.innerHTML = state.phase === 'planMove' ? viewPlanMove() : viewPlanFire();
    updateTimer();
    drawMap();
  }

  function updateTimer() {
    const el = root.querySelector('.sbp-timer');
    if (!el) return;
    if (state.secondsLeft === null || state.secondsLeft === undefined) { el.textContent = ''; return; }
    const s = Math.max(0, Math.ceil((deadline - performance.now()) / 1000));
    el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    el.classList.toggle('urgent', s <= 10);
  }
  const timer = setInterval(updateTimer, 250);

  // ---------- Actions ----------
  function setSpeed(delta) {
    const s = shipById(selShip);
    const d = moveDraft[s.id];
    const opts = speedOptions(s);
    const speed = d.speed + delta;
    if (!opts.includes(speed)) return;
    const n = Math.max(1, speed);
    const mc = maxClicks(s, speed);
    d.speed = speed;
    d.clicks = Array.from({ length: n }, (_, i) => Math.max(-mc, Math.min(mc, d.clicks[i] || 0)));
    selSeg = Math.min(selSeg, n - 1);
    render();
  }

  function turn(i, delta) {
    const s = shipById(selShip);
    const d = moveDraft[s.id];
    const mc = maxClicks(s, d.speed);
    const c = d.clicks[i] + delta;
    if (Math.abs(c) > mc) return;
    d.clicks[i] = c;
    selSeg = i;
    render();
  }

  function toggleTarget(arc, targetId) {
    const draft = fireDraft[selShip];
    const i = draft.findIndex((a) => a.arc === arc);
    notice = '';
    if (i >= 0 && draft[i].targetId === targetId) draft.splice(i, 1);
    else if (i >= 0) draft[i].targetId = targetId;
    else if (draft.length >= 2) notice = 'Only 2 arcs can fire. Untick one first.';
    else draft.push({ arc, targetId });
    render();
  }

  function nextShip() {
    const living = myLiving();
    if (living.length < 2) return;
    const i = living.findIndex((s) => s.id === selShip);
    selShip = living[(i + 1) % living.length].id;
    selSeg = 0;
    selRow = 0;
    render();
  }

  function send() {
    const ships = {};
    for (const s of myLiving()) ships[s.id] = state.phase === 'planMove' ? moveDraft[s.id] : fireDraft[s.id];
    sendInput({ type: state.phase, round: state.round, ready: true, ships });
    buzz(20);
  }

  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled || !state) return;
    const act = b.dataset.act;
    if (act === 'team') sendInput({ type: 'team', faction: b.dataset.f });
    else if (act === 'claim') sendInput({ type: 'claim', shipId: b.dataset.id });
    else if (act === 'release') sendInput({ type: 'release', shipId: b.dataset.id });
    else if (act === 'setupReady') sendInput({ type: 'ready', ready: !isReady() });
    else if (act === 'ship') { selShip = b.dataset.id; selSeg = 0; selRow = 0; render(); }
    else if (act === 'speed') setSpeed(Number(b.dataset.d));
    else if (act === 'turn') { e.stopPropagation(); turn(Number(b.dataset.i), Number(b.dataset.d)); }
    else if (act === 'seg') { selSeg = Number(b.dataset.i); render(); }
    else if (act === 'target') toggleTarget(b.dataset.arc, b.dataset.id);
    else if (act === 'send') send();
    else if (act === 'unready') sendInput({ type: state.phase, round: state.round, ready: false });
  });

  // Keyboard support for laptop testing.
  function onKey(e) {
    if (!state) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const planning = (state.phase === 'planMove' || state.phase === 'planFire') && myLiving().length && !isReady();
    if (state.phase === 'setup') {
      const i = ['1', '2', '3'].indexOf(k);
      if (i >= 0 && FACTIONS[FACTION_ORDER[i]].available) sendInput({ type: 'team', faction: FACTION_ORDER[i] });
      else if (k === 'c') {
        const free = state.ships.find((s) => s.faction === state.teams[myId()] && !s.owner);
        if (free) sendInput({ type: 'claim', shipId: free.id });
      } else if (k === 'Enter' && myShips().length) sendInput({ type: 'ready', ready: !isReady() });
      else return;
    } else if (planning && state.phase === 'planMove') {
      const d = moveDraft[selShip];
      if (k === 'ArrowUp' || k === 'w') setSpeed(1);
      else if (k === 'ArrowDown' || k === 's') setSpeed(-1);
      else if (k === 'ArrowLeft' || k === 'a') turn(selSeg, -1);
      else if (k === 'ArrowRight' || k === 'd') turn(selSeg, 1);
      else if (k === 'q') { selSeg = Math.max(0, selSeg - 1); render(); }
      else if (k === 'e') { selSeg = Math.min(d.clicks.length - 1, selSeg + 1); render(); }
      else if (k === 'n' || k === 'Tab') nextShip();
      else if (k === 'Enter') send();
      else return;
    } else if (planning && state.phase === 'planFire') {
      const rows = fireRows(shipById(selShip));
      if (k === 'ArrowUp' || k === 'w') { selRow = Math.max(0, selRow - 1); render(); }
      else if (k === 'ArrowDown' || k === 's') { selRow = Math.min(Math.max(0, rows.length - 1), selRow + 1); render(); }
      else if (k === ' ' && rows[selRow]) toggleTarget(rows[selRow].arc, rows[selRow].id);
      else if (k === 'n' || k === 'Tab') nextShip();
      else if (k === 'Enter') send();
      else return;
    } else if (isReady() && k === 'Backspace') {
      sendInput({ type: state.phase, round: state.round, ready: false });
    } else return;
    e.preventDefault();
  }
  window.addEventListener('keydown', onKey);

  const onResize = () => drawMap();
  window.addEventListener('resize', onResize);

  return {
    update(gameState, meLatest) {
      if (!gameState) return;
      state = gameState;
      meNow = meLatest || meNow;
      if (state.secondsLeft !== null && state.secondsLeft !== undefined) deadline = performance.now() + state.secondsLeft * 1000;
      if ((state.phase === 'planMove' || state.phase === 'planFire') && draftKey !== state.phaseKey) resetDrafts();
      if (state.phase !== lastPhase && (state.phase === 'planMove' || state.phase === 'planFire')) buzz(60);
      lastPhase = state.phase;
      render();
    },
    destroy() {
      clearInterval(timer);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    },
  };
}
