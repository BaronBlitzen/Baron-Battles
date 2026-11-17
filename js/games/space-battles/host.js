// Space Battles – TV side. The TV is the referee: it runs the setup flow, the
// phase machine and timers, resolves movement and fire (all dice rolls happen
// here), draws the battle, and shows the results.
import { escapeHtml } from '../../supabase.js';
import { FACTIONS, FACTION_ORDER, WEAPONS, SHIPS, SCENARIOS, TIMING, ZONES } from './data.js';
import {
  classOf, shipDef, simulateMove, sanitizeMovePlan, defaultMovePlan, sanitizeFirePlan,
  defaultFirePlan, shipDistance, rangeBand, zoneFacing, applyDamage, arcWeapons, fleetValue,
  MOVE_TICKS,
} from './rules.js';

const PHASE_NAMES = {
  setup: 'Fleet Setup', intro: 'Battle stations', planMove: 'Plan Movement', move: 'Move',
  planFire: 'Plan Fire', fire: 'Fire', over: 'Battle over',
};
const FIRE_LAND_MS = 1800; // when all fire damage lands (after the tracers)

// Remember team picks between "Play again" games.
let lastTeams = {};

const clone = (s) => ({ ...s, shields: { ...s.shields } });
const publicShip = (s) => ({
  id: s.id, type: s.type, faction: s.faction, owner: s.owner, x: s.x, y: s.y,
  heading: s.heading, speed: s.speed, hull: s.hull, shields: { ...s.shields }, alive: s.alive,
});

function makeShip(id, faction, d) {
  const def = SHIPS[d.type];
  return {
    id, type: d.type, faction, owner: null, x: d.x, y: d.y, heading: d.heading,
    speed: def.speed[0], hull: def.hull, shields: { ...def.shields }, alive: true,
  };
}

export function start({ container, players, setPhoneState, onExit }) {
  const scenario = SCENARIOS.m1;
  const { map, asteroids } = scenario;
  const people = Object.fromEntries(players.map((p) => [p.id, { ...p }]));
  const order = players.map((p) => p.id);
  const online = new Set(players.filter((p) => p.online !== false).map((p) => p.id));

  const teams = {};
  for (const id of order) {
    const f = lastTeams[id];
    if (f && FACTIONS[f]?.available) teams[id] = f;
  }
  const fleet = [];
  for (const f of FACTION_ORDER) (scenario.fleets[f] || []).forEach((d, i) => fleet.push(makeShip(`${f}-${i}`, f, d)));

  let ships = fleet; // during setup: every faction's fleet (owner = claim)
  let phoneShips = null; // what phones see while the TV is still animating
  let phase = 'setup';
  let phaseKey = 0;
  let round = 0;
  let phaseEndsAt = 0;
  let ready = {};
  let movePlans = {};
  let firePlans = {};
  let anim = null;
  let result = null;
  let battleFactions = [];

  // ---------- DOM ----------
  container.innerHTML = `
    <div class="sb">
      <div class="sb-hud">
        <div class="sb-title">🚀 Space Battles</div>
        <div class="sb-phase"></div>
        <div class="sb-timer"></div>
      </div>
      <div class="sb-subhud"></div>
      <div class="sb-board"><canvas></canvas></div>
      <div class="sb-overlay"></div>
    </div>`;
  const board = container.querySelector('.sb-board');
  const canvas = container.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const phaseEl = container.querySelector('.sb-phase');
  const timerEl = container.querySelector('.sb-timer');
  const subEl = container.querySelector('.sb-subhud');
  const overlay = container.querySelector('.sb-overlay');
  let scale = 20;

  const stars = Array.from({ length: 260 }, () => ({
    x: Math.random() * map.w, y: Math.random() * map.h, r: Math.random() * 1.3 + 0.3, a: Math.random() * 0.6 + 0.2,
  }));
  const rockShapes = asteroids.map((r) => Array.from({ length: 13 }, (_, i) => {
    const a = (i / 13) * Math.PI * 2;
    const k = 0.9 + Math.random() * 0.15;
    return [r.x + Math.cos(a) * r.r * k, r.y + Math.sin(a) * r.r * k];
  }));

  function resize() {
    const r = board.getBoundingClientRect();
    scale = Math.max(8, Math.min(r.width / map.w, r.height / map.h));
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${scale * map.w}px`;
    canvas.style.height = `${scale * map.h}px`;
    canvas.width = Math.round(scale * map.w * dpr);
    canvas.height = Math.round(scale * map.h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  // ---------- Helpers ----------
  const shipById = (id) => ships.find((s) => s.id === id);
  const playersOn = (f) => order.filter((id) => teams[id] === f);
  const shipsOf = (id) => ships.filter((s) => s.owner === id && s.alive);
  const colorOf = (id) => people[id]?.color || '#ccc';
  const nameOf = (id) => people[id]?.name || '?';
  const now = () => performance.now();

  // Players the TV waits for in a planning window: online and still commanding a ship.
  const required = () => order.filter((id) => online.has(id) && shipsOf(id).length > 0);

  function setupProblems() {
    const out = [];
    const noTeam = order.filter((id) => !teams[id]);
    if (noTeam.length) out.push(`Waiting for ${noTeam.map(nameOf).join(', ')} to pick a side`);
    const used = FACTION_ORDER.filter((f) => playersOn(f).length > 0);
    if (used.length > 2) out.push('Players must be on only 2 factions');
    else if (used.length < 2) out.push('Players must be on 2 factions, with at least one player on each');
    for (const f of used) {
      const n = playersOn(f).length;
      const total = fleet.filter((s) => s.faction === f).length;
      if (n > total) out.push(`${FACTIONS[f].short} has ${n} players but only ${total} ships. Someone please switch teams.`);
    }
    for (const f of used) {
      const free = fleet.filter((s) => s.faction === f && !s.owner).length;
      if (free) out.push(`${FACTIONS[f].short}: ${free} ship${free > 1 ? 's' : ''} unclaimed`);
    }
    const off = order.filter((id) => !online.has(id));
    if (off.length) out.push(`Waiting for ${off.map(nameOf).join(', ')} to reconnect`);
    const notReady = order.filter((id) => teams[id] && !ready[id]);
    if (notReady.length) out.push(`Not ready: ${notReady.map(nameOf).join(', ')}`);
    return out;
  }

  function secondsLeft() {
    if (phase !== 'planMove' && phase !== 'planFire') return null;
    return Math.max(0, Math.ceil((phaseEndsAt - now()) / 1000));
  }

  function pushState() {
    setPhoneState({
      phase,
      phaseKey,
      round,
      maxRounds: scenario.rounds,
      secondsLeft: secondsLeft(),
      scenarioId: scenario.id,
      map,
      asteroids,
      factions: battleFactions,
      people: Object.fromEntries(order.map((id) => [id, { name: nameOf(id), color: colorOf(id) }])),
      teams: { ...teams },
      ready: { ...ready },
      problems: phase === 'setup' ? setupProblems() : [],
      ships: (phoneShips || ships).map(publicShip),
      result,
    });
  }

  // ---------- Setup flow ----------
  function setupInput(id, msg) {
    if (msg.type === 'team') {
      const f = msg.faction;
      if (!FACTIONS[f]?.available || teams[id] === f) return;
      for (const s of fleet) if (s.owner === id) s.owner = null;
      teams[id] = f;
      delete ready[id];
    } else if (msg.type === 'claim') {
      const s = fleet.find((x) => x.id === msg.shipId);
      if (!s || s.owner || s.faction !== teams[id]) return;
      s.owner = id;
    } else if (msg.type === 'release') {
      const s = fleet.find((x) => x.id === msg.shipId);
      if (!s || s.owner !== id) return;
      s.owner = null;
      if (!fleet.some((x) => x.owner === id)) delete ready[id];
    } else if (msg.type === 'ready') {
      if (msg.ready && fleet.some((x) => x.owner === id)) ready[id] = true;
      else delete ready[id];
    } else return;
    renderSetup();
    pushState();
    if (!setupProblems().length) beginBattle();
  }

  function renderSetup() {
    const problems = setupProblems();
    overlay.className = 'sb-overlay show';
    overlay.innerHTML = `
      <div class="sb-panel sb-setup">
        <p class="eyebrow">Space Battles · ${escapeHtml(scenario.name)}</p>
        <h2>Choose your side on your phone</h2>
        <div class="sb-factions">
          ${FACTION_ORDER.map((f) => {
            const fd = FACTIONS[f];
            const ps = playersOn(f);
            const fs = fleet.filter((s) => s.faction === f);
            return `
              <div class="sb-faction ${fd.available ? '' : 'soon'}" style="--fc:${fd.color}">
                <h3>${escapeHtml(fd.name)}</h3>
                ${fd.available ? `<p class="muted">${escapeHtml(fd.blurb)}</p>` : ''}
                ${fd.available ? `
                  <ul class="sb-plist">
                    ${ps.length ? ps.map((id) => `<li><span class="dot" style="background:${colorOf(id)}"></span>${escapeHtml(nameOf(id))}
                      ${!online.has(id) ? '<em class="muted">offline</em>' : ready[id] ? '<b class="green">✔ Ready</b>' : ''}</li>`).join('') : '<li class="muted">No players yet</li>'}
                  </ul>
                  <ul class="sb-slist">
                    ${fs.map((s) => `<li><span>${escapeHtml(SHIPS[s.type].name)} <small class="muted">${escapeHtml(classOf(s).name)}</small></span>
                      ${s.owner ? `<b style="color:${colorOf(s.owner)}">${escapeHtml(nameOf(s.owner))}</b>` : '<em class="muted">unclaimed</em>'}</li>`).join('')}
                  </ul>` : '<p class="sb-soon">Coming soon</p>'}
              </div>`;
          }).join('')}
        </div>
        <ul class="sb-problems">
          ${problems.length ? problems.map((p) => `<li>${escapeHtml(p)}</li>`).join('') : '<li class="green">All set. Launching!</li>'}
        </ul>
      </div>`;
  }

  function beginBattle() {
    battleFactions = FACTION_ORDER.filter((f) => playersOn(f).length > 0);
    ships = fleet.filter((s) => battleFactions.includes(s.faction)).map(clone);
    lastTeams = { ...teams };
    ready = {};
    phase = 'intro';
    phaseEndsAt = now() + TIMING.introMs;
    const [a, b] = battleFactions.map((f) => FACTIONS[f]);
    overlay.className = 'sb-overlay show';
    overlay.innerHTML = `
      <div class="sb-panel">
        <p class="eyebrow">Battle stations</p>
        <h2><span style="color:${a.color}">${escapeHtml(a.short)}</span> vs <span style="color:${b.color}">${escapeHtml(b.short)}</span></h2>
        <p>${scenario.rounds} rounds. Plan in secret on your phone, then watch it all happen here.</p>
        <p class="muted">Last fleet standing wins.</p>
      </div>`;
    pushState();
  }

  // ---------- Planning windows ----------
  function startPlan(kind) {
    phase = kind;
    phaseKey++;
    ready = {};
    movePlans = {};
    firePlans = {};
    phoneShips = null;
    phaseEndsAt = now() + TIMING.planSeconds * 1000;
    overlay.className = 'sb-overlay';
    overlay.innerHTML = '';
    pushState();
  }

  function planInput(id, msg) {
    const kind = msg.type === 'planMove' ? 'planMove' : 'planFire';
    if (phase !== kind || msg.round !== round) return;
    const store = kind === 'planMove' ? movePlans : firePlans;
    if (!msg.ready) {
      delete store[id];
      delete ready[id];
      pushState();
      return;
    }
    const mine = shipsOf(id);
    if (!mine.length) return;
    const plans = {};
    for (const s of mine) {
      const p = msg.ships?.[s.id];
      plans[s.id] = kind === 'planMove'
        ? sanitizeMovePlan(s, p) || defaultMovePlan(s)
        : sanitizeFirePlan(s, p, ships, asteroids);
    }
    store[id] = plans;
    ready[id] = true;
    pushState();
    checkAllReady();
  }

  function checkAllReady() {
    if (phase !== 'planMove' && phase !== 'planFire') return;
    const req = required();
    if (req.length && req.every((id) => ready[id])) endPlan();
  }

  function endPlan() {
    if (phase === 'planMove') resolveMove();
    else if (phase === 'planFire') resolveFire();
  }

  // ---------- Move ----------
  function resolveMove() {
    const plans = {};
    for (const s of ships) {
      if (!s.alive) continue;
      plans[s.id] = (ready[s.owner] && movePlans[s.owner]?.[s.id]) || defaultMovePlan(s);
    }
    const res = simulateMove(ships, plans, scenario);
    const t0 = now();
    phoneShips = ships.map(clone);
    const before = new Set(ships.filter((s) => s.alive).map((s) => s.id));
    ships = ships.map((s) => res.ships.find((r) => r.id === s.id) || s);
    const pending = [];
    const fx = [];
    for (const ev of res.events) {
      const at = t0 + (ev.tick / MOVE_TICKS) * TIMING.moveMs;
      fx.push({ at, x: ev.x, y: ev.y, ram: ev.ram, kind: ev.kind });
      for (const d of ev.damage) pending.push({ at, fromX: ev.x, fromY: ev.y, ...d });
    }
    anim = {
      kind: 'move', start: t0, end: t0 + TIMING.moveMs + 900, frames: res.frames, pending, fx,
      dying: new Set(ships.filter((s) => !s.alive && before.has(s.id)).map((s) => s.id)),
      dieAt: t0 + TIMING.moveMs + 100,
    };
    phase = 'move';
    pushState();
  }

  // ---------- Fire ----------
  function rollAttack(s, t, arc) {
    const band = rangeBand(shipDistance(s, t));
    let shots = 0, hits = 0, damage = 0;
    for (const w of arcWeapons(s, arc)) {
      const wd = WEAPONS[w.weapon];
      const chance = wd.hit[band] || 0;
      if (!chance) continue;
      for (let i = 0; i < w.shots; i++) {
        shots++;
        if (Math.random() < chance) { hits++; damage += wd.damage; }
      }
    }
    return { band, shots, hits, damage };
  }

  function resolveFire() {
    const attacks = [];
    for (const s of ships) {
      if (!s.alive) continue;
      const planned = ready[s.owner] && firePlans[s.owner]?.[s.id];
      const plan = planned || defaultFirePlan(s, ships, asteroids);
      for (const a of plan) {
        const t = shipById(a.targetId);
        if (!t) continue;
        attacks.push({ from: s.id, to: t.id, arc: a.arc, zone: zoneFacing(t, s.x, s.y), ...rollAttack(s, t, a.arc) });
      }
    }
    // All attacks land together on copies, so a ship destroyed now still fired.
    const next = ships.map(clone);
    const nextById = Object.fromEntries(next.map((s) => [s.id, s]));
    const t0 = now();
    const landAt = t0 + FIRE_LAND_MS;
    const pending = [];
    const perTarget = {};
    for (const a of attacks) {
      const d = applyDamage(nextById[a.to], a.zone, a.damage);
      a.shieldLost = d.shieldLost;
      a.hullLost = d.hullLost;
      pending.push({ at: landAt, ...d });
      const p = perTarget[a.to] || (perTarget[a.to] = { shieldLost: 0, hullLost: 0 });
      p.shieldLost += d.shieldLost;
      p.hullLost += d.hullLost;
    }
    const dying = new Set();
    for (const s of next) if (s.alive && s.hull <= 0) { s.alive = false; dying.add(s.id); }
    phoneShips = ships.map(clone);
    ships = next;
    const gap = attacks.length ? Math.min(260, 1300 / attacks.length) : 0;
    attacks.forEach((a, i) => { a.at = t0 + 200 + i * gap; });
    anim = {
      kind: 'fire', start: t0, end: t0 + TIMING.fireMs, attacks, pending, landAt, dying,
      dieAt: landAt + 700,
      popups: Object.entries(perTarget).map(([shipId, p]) => ({ at: landAt, shipId, ...p })),
    };
    phase = 'fire';
    pushState();
  }

  // ---------- Winning ----------
  function checkWinner(afterFire) {
    const alive = battleFactions.filter((f) => ships.some((s) => s.alive && s.faction === f));
    const values = Object.fromEntries(battleFactions.map((f) => [f, fleetValue(ships, f)]));
    if (alive.length === 1) return endGame(alive[0], 'Last fleet standing', values);
    if (alive.length === 0) return endGame(null, 'Both fleets were destroyed', values);
    if (afterFire && round >= scenario.rounds) {
      const [a, b] = battleFactions;
      const reason = `After ${scenario.rounds} rounds, fleet value ${FACTIONS[a].short} ${values[a]} – ${values[b]} ${FACTIONS[b].short}`;
      if (values[a] === values[b]) return endGame(null, reason, values);
      return endGame(values[a] > values[b] ? a : b, reason, values);
    }
    return false;
  }

  function endGame(winner, reason, values) {
    phase = 'over';
    anim = null;
    phoneShips = null;
    result = { winner, reason, values };
    pushState();
    showResults();
    return true;
  }

  function showResults() {
    const { winner, reason } = result;
    const fd = winner && FACTIONS[winner];
    overlay.className = 'sb-overlay show';
    overlay.innerHTML = `
      <div class="sb-panel">
        <p class="eyebrow">Round ${Math.min(round, scenario.rounds)} · ${escapeHtml(reason)}</p>
        <h2>${fd ? `<span style="color:${fd.color}">${escapeHtml(fd.short)}</span> wins!` : 'Draw!'}</h2>
        <div class="sb-results">
          ${battleFactions.map((f) => `
            <div>
              <h3 style="color:${FACTIONS[f].color}">${escapeHtml(FACTIONS[f].short)} <small class="muted">fleet value ${result.values[f]}</small></h3>
              <ul>
                ${ships.filter((s) => s.faction === f).map((s) => `
                  <li><span class="dot" style="background:${colorOf(s.owner)}"></span>${escapeHtml(SHIPS[s.type].short)}
                    <small class="muted">${escapeHtml(nameOf(s.owner))}</small>
                    <span class="tag ${s.alive ? 'ok' : 'dead'}">${s.alive ? `${s.hull} hull` : 'Destroyed'}</span></li>`).join('')}
              </ul>
            </div>`).join('')}
        </div>
        <div class="lab-buttons">
          <button class="big-btn" data-act="again">Play again</button>
          <button class="big-btn ghost" data-act="menu">Back to games</button>
        </div>
      </div>`;
    overlay.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => onExit(b.dataset.act)));
  }

  // ---------- Phase clock ----------
  function tick() {
    const t = now();
    if (phase === 'intro' && t >= phaseEndsAt) {
      round = 1;
      startPlan('planMove');
    } else if ((phase === 'planMove' || phase === 'planFire') && t >= phaseEndsAt) {
      endPlan();
    } else if (phase === 'move' && t >= anim.end) {
      anim = null;
      phoneShips = null;
      if (!checkWinner(false)) startPlan('planFire');
    } else if (phase === 'fire' && t >= anim.end) {
      anim = null;
      phoneShips = null;
      if (!checkWinner(true)) {
        round++;
        startPlan('planMove');
      }
    }
  }

  // ---------- Drawing ----------
  let lastHud = '';
  function drawHud() {
    const s = secondsLeft();
    const timer = s === null ? '' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    const phaseText = phase === 'setup' ? 'Fleet Setup'
      : phase === 'over' ? 'Battle over' : `Round ${Math.max(1, round)}/${scenario.rounds} · ${PHASE_NAMES[phase]}`;
    let sub = '';
    if (phase !== 'setup') {
      const teamsHtml = battleFactions.map((f) => `<span style="color:${FACTIONS[f].color}">${escapeHtml(FACTIONS[f].short)} ${fleetValue(phoneShips || ships, f)}</span>`).join(' <span class="muted">vs</span> ');
      let chips = '';
      if (phase === 'planMove' || phase === 'planFire') {
        chips = order.filter((id) => shipsOf(id).length).map((id) => {
          const st = !online.has(id) ? 'off' : ready[id] ? 'ready' : '';
          return `<span class="sb-chip ${st}"><span class="dot" style="background:${colorOf(id)}"></span>${escapeHtml(nameOf(id))}${st === 'ready' ? ' ✔' : st === 'off' ? ' (offline)' : ''}</span>`;
        }).join('');
      }
      sub = `<div class="sb-fleetvals">Fleet value: ${teamsHtml}</div><div class="sb-chips">${chips}</div>`;
    }
    const html = `${phaseText}|${timer}|${sub}`;
    if (html === lastHud) return;
    lastHud = html;
    phaseEl.textContent = phaseText;
    timerEl.textContent = timer;
    timerEl.classList.toggle('urgent', s !== null && s <= 10);
    subEl.innerHTML = sub;
  }

  function poseOf(s, t) {
    const f = anim?.kind === 'move' && anim.frames[s.id];
    if (!f) return s;
    const k = Math.min(1, Math.max(0, (t - anim.start) / TIMING.moveMs)) * MOVE_TICKS;
    const i = Math.floor(k), j = Math.min(MOVE_TICKS, i + 1), u = k - i;
    const a = f[i], b = f[j];
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, heading: a.heading + (b.heading - a.heading) * u };
  }

  // Hull and shields as shown right now (damage that hasn't "landed" yet is added back).
  function shownStats(s, t) {
    let hull = s.hull;
    const sh = { ...s.shields };
    if (anim) for (const p of anim.pending) if (p.shipId === s.id && p.at > t) { hull += p.hullLost; sh[p.zone] += p.shieldLost; }
    return { hull, sh };
  }

  const SHAPES = {
    corvette: [[0.5, 0], [0.05, -0.5], [-0.5, -0.42], [-0.32, 0], [-0.5, 0.42], [0.05, 0.5]],
    cruiser: [[0.5, 0], [0.28, -0.5], [-0.5, -0.5], [-0.42, 0], [-0.5, 0.5], [0.28, 0.5]],
  };

  function drawShip(s, t) {
    const S = scale;
    const p = poseOf(s, t);
    const cls = classOf(s);
    const def = shipDef(s);
    const color = colorOf(s.owner);
    let alpha = 1;
    if (!s.alive && anim?.dying.has(s.id) && t > anim.dieAt) alpha = Math.max(0, 1 - (t - anim.dieAt) / 600);
    if (alpha <= 0) return;
    const cx = p.x * S, cy = p.y * S;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.rotate((p.heading * Math.PI) / 180);
    const shape = SHAPES[def.class] || SHAPES.cruiser;
    ctx.beginPath();
    shape.forEach(([x, y], i) => {
      const px = x * cls.length * S, py = y * cls.width * S;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    });
    ctx.closePath();
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = `${color}22`;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Shield marks: one thin arc per shield point in each 90° zone.
    const { hull, sh } = shownStats(s, t);
    const R = (cls.length / 2) * S + 6;
    const ZONE_ANGLE = { front: 0, right: 90, rear: 180, left: -90 };
    for (const z of ZONES) {
      const mid = (ZONE_ANGLE[z] * Math.PI) / 180;
      const half = (36 * Math.PI) / 180;
      const n = sh[z];
      if (n <= 0) {
        ctx.strokeStyle = 'rgba(255,120,120,.25)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, R, mid - half, mid + half);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      for (let i = 0; i < n; i++) {
        ctx.strokeStyle = 'rgba(140,225,255,.85)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 0, R + i * 3.2, mid - half, mid + half);
        ctx.stroke();
      }
    }
    ctx.restore();

    // Hull bar + label (not rotated).
    ctx.save();
    ctx.globalAlpha = alpha;
    const barW = Math.max(34, cls.length * S * 1.1);
    const by = cy + R + 12;
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect(cx - barW / 2 - 1, by - 1, barW + 2, 7);
    const frac = Math.max(0, hull / def.hull);
    ctx.fillStyle = frac > 0.5 ? '#51cf66' : frac > 0.25 ? '#fcc419' : '#ff6b6b';
    ctx.fillRect(cx - barW / 2, by, barW * frac, 5);
    label(s.owner ? `${def.short} · ${nameOf(s.owner)}` : def.short, cx, cy - R - 10, color, Math.max(11, S * 0.42));
    ctx.restore();
  }

  function label(text, x, y, color, size) {
    ctx.font = `700 ${size}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,.8)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  // Damage numbers float up from the ship. When `from` (an impact point) is given,
  // they're pushed away from it so two ships that bumped get separate numbers.
  function popup(shipId, at, shieldLost, hullLost, t, fromX, fromY) {
    const s = ships.find((x) => x.id === shipId);
    if (!s || t < at || t > at + 1800) return;
    const p = poseOf(s, t);
    const k = (t - at) / 1800;
    let dx = 0, dy = -1;
    if (fromX !== undefined) {
      const len = Math.hypot(p.x - fromX, p.y - fromY);
      if (len > 0.01) { dx = (p.x - fromX) / len; dy = (p.y - fromY) / len; }
    }
    const off = fromX !== undefined ? 1.6 : 2.4;
    const x = (p.x + dx * off) * scale, y = (p.y + dy * off) * scale - k * 30;
    const size = Math.max(16, scale * 0.8);
    ctx.save();
    ctx.globalAlpha = Math.min(1, 2.2 - k * 2);
    if (!shieldLost && !hullLost) label('MISS', x, y, '#b0a8c8', size * 0.8);
    let yy = y;
    if (hullLost) { label(`−${hullLost} hull`, x, yy, '#ff6b6b', size); yy -= size * 1.05; }
    if (shieldLost) label(`−${shieldLost} shield`, x, yy, '#8ce1ff', size * 0.85);
    ctx.restore();
  }

  function draw(t) {
    const S = scale;
    const W = map.w * S, H = map.h * S;
    const g = ctx.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.5, W * 0.7);
    g.addColorStop(0, '#0d1230');
    g.addColorStop(1, '#03040c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    for (const st of stars) {
      ctx.fillStyle = `rgba(255,255,255,${st.a})`;
      ctx.fillRect(st.x * S, st.y * S, st.r, st.r);
    }
    ctx.strokeStyle = 'rgba(120,140,220,.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, H - 2);

    for (const shape of rockShapes) {
      ctx.beginPath();
      shape.forEach(([x, y], i) => (i ? ctx.lineTo(x * S, y * S) : ctx.moveTo(x * S, y * S)));
      ctx.closePath();
      ctx.fillStyle = '#4a4458';
      ctx.fill();
      ctx.strokeStyle = '#8a82a0';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    const visible = ships.filter((s) => s.alive || anim?.dying.has(s.id));
    if (phase !== 'setup') for (const s of visible) drawShip(s, t);
    else for (const s of ships) if (FACTIONS[s.faction].available) drawShip(s, t);

    if (anim?.kind === 'move') {
      for (const f of anim.fx) {
        if (t < f.at || t > f.at + 900) continue;
        const k = (t - f.at) / 900;
        ctx.strokeStyle = `rgba(255,200,120,${1 - k})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(f.x * S, f.y * S, S * (0.3 + k * 1.4), 0, Math.PI * 2);
        ctx.stroke();
        if (f.ram) label('RAM!', f.x * S, f.y * S - S, '#ff922b', Math.max(18, S));
      }
      for (const p of anim.pending) popup(p.shipId, p.at, p.shieldLost, p.hullLost, t, p.fromX, p.fromY);
    }
    if (anim?.kind === 'fire') {
      for (const a of anim.attacks) {
        if (t < a.at) continue;
        const from = ships.find((s) => s.id === a.from), to = ships.find((s) => s.id === a.to);
        const k = Math.min(1, (t - a.at) / 450);
        const fade = t > anim.landAt + 300 ? Math.max(0, 1 - (t - anim.landAt - 300) / 500) : 1;
        if (fade <= 0) continue;
        const x1 = from.x * S, y1 = from.y * S;
        const x2 = x1 + (to.x * S - x1) * k, y2 = y1 + (to.y * S - y1) * k;
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.strokeStyle = colorOf(from.owner);
        ctx.shadowColor = colorOf(from.owner);
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2.5;
        ctx.setLineDash(a.hits ? [] : [6, 6]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x2, y2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      for (const p of anim.popups) popup(p.shipId, p.at, p.shieldLost, p.hullLost, t);
    }
    if (anim) {
      for (const id of anim.dying) {
        if (t < anim.dieAt || t > anim.dieAt + 900) continue;
        const s = ships.find((x) => x.id === id);
        const p = poseOf(s, t);
        const k = (t - anim.dieAt) / 900;
        ctx.fillStyle = `rgba(255,170,80,${0.7 * (1 - k)})`;
        ctx.beginPath();
        ctx.arc(p.x * S, p.y * S, S * (0.5 + k * 2), 0, Math.PI * 2);
        ctx.fill();
        if (k < 0.7) label('DESTROYED', p.x * S, p.y * S - S * 1.4, '#ffd8a8', Math.max(14, S * 0.6));
      }
    }
  }

  let raf = 0;
  function frame(t) {
    drawHud();
    draw(t);
    raf = requestAnimationFrame(frame);
  }
  // The game clock keeps running (and the top bar stays current) even if the
  // browser pauses animation frames because the TV tab is hidden.
  const clock = setInterval(() => { tick(); drawHud(); }, 100);

  renderSetup();
  pushState();
  raf = requestAnimationFrame(frame);
  if (!setupProblems().length) beginBattle();

  return {
    handleInput(id, msg) {
      if (!people[id] || !msg || typeof msg.type !== 'string') return;
      if (phase === 'setup') setupInput(id, msg);
      else if (msg.type === 'planMove' || msg.type === 'planFire') planInput(id, msg);
    },
    setOnline(ids) {
      online.clear();
      for (const id of ids) if (people[id]) online.add(id);
      if (phase === 'setup') {
        renderSetup();
        pushState();
        if (!setupProblems().length) beginBattle();
      } else {
        pushState();
        checkAllReady();
      }
    },
    stop() {
      cancelAnimationFrame(raf);
      clearInterval(clock);
      window.removeEventListener('resize', resize);
    },
  };
}
