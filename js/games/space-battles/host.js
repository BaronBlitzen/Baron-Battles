// Space Battles – TV side. The TV is the referee: it runs the setup flow, the
// phase machine and timers, resolves movement and fire (all dice rolls happen
// here), draws the battle, and shows the results.
import { escapeHtml } from '../../supabase.js';
import {
  FACTIONS, FACTION_ORDER, WEAPONS, SHIPS, SCENARIOS, TIMING, ZONES, MISSIONS, FLEET, STANCES,
  CRITICALS, CRIT_POOL, ARCS, SQUADRONS, SQUADRON_ROLES, WING_ORDERS,
} from './data.js';
import {
  classOf, shipDef, simulateMove, sanitizeMovePlan, defaultMovePlan, sanitizeFirePlan,
  defaultFirePlan, rangeBand, zoneFacing, applyDamage, arcWeapons, fleetValue,
  MOVE_TICKS, pointShare, fleetCost, cheapestShipCost, buyProblem, weaponKey, applyShieldDamage,
  applyHullDamage, pullToward, arcShots, stanceDamage, sanitizeRepair, applyRepair, shieldsOff,
  hullHitCount, absorbableShields, maxSpeed, critCount, isSquad, squadDef, SQUAD_R, unitDistance,
  hitChance, isCarrier, wingOf, planSquadMoves, squadAttackTarget, screened, pdTarget, latchTarget,
  squadBuyProblem, killValue,
} from './rules.js';

const PHASE_NAMES = {
  setup: 'Fleet Setup', intro: 'Battle stations', planMove: 'Plan Movement', move: 'Move',
  planFire: 'Plan Fire', fire: 'Fire', over: 'Battle over',
};
const FIRE_LAND_MS = 1800; // when all fire damage lands (after the tracers)

const ACID_MS = 2900; // when end-of-round acid burns (after the fire damage)

// Ships also carry: `used` (once-per-game weapons fired, by "arc:index"), `acidDue`
// (round -> acid hull damage due at the end of that round), and for the next move only
// `disrupted` (−1 turn click) and `grappled` (can't speed up).
const clone = (s) => ({
  ...s, shields: { ...s.shields }, used: { ...(s.used || {}) }, acidDue: { ...(s.acidDue || {}) },
  tempShields: { ...(s.tempShields || {}) }, crits: (s.crits || []).map((c) => ({ ...c })),
  ...(s.wing ? { wing: { ...s.wing } } : {}),
});
const cloneSquad = (q) => ({ ...q });
const publicSquad = (q) => ({
  id: q.id, kind: 'squad', type: q.type, faction: q.faction, owner: q.owner, carrier: q.carrier,
  slot: q.slot, x: q.x, y: q.y, hull: q.hull, alive: q.alive,
});
const publicShip = (s) => ({
  id: s.id, type: s.type, faction: s.faction, owner: s.owner, x: s.x, y: s.y,
  heading: s.heading, speed: s.speed, hull: s.hull, shields: { ...s.shields }, alive: s.alive,
  burn: !!s.burn, used: { ...(s.used || {}) }, disrupted: !!s.disrupted, grappled: !!s.grappled,
  acidDue: { ...(s.acidDue || {}) },
  // Stance: null while it's still secret (Plan Movement); lastStance can't be picked again.
  stance: s.stance ? { ...s.stance } : null, lastStance: s.lastStance || 'balanced',
  tempShields: { ...(s.tempShields || {}) }, crits: (s.crits || []).map((c) => ({ ...c })),
  wing: s.wing ? { ...s.wing } : null,
});

// Position and heading are set by deploy(). Carriers get a wing order (every wing starts on Escort).
function makeShip(id, type, owner) {
  const def = SHIPS[type];
  return {
    id, type, faction: def.faction, owner, x: 0, y: 0, heading: 0,
    speed: def.speed[0], hull: def.hull, shields: { ...def.shields }, alive: true,
    ...(def.squadrons ? { wing: { order: 'escort' } } : {}),
  };
}

// Squadrons start next to their carrier: in a short row just behind it.
function makeSquads(carrier, types, nextId, map) {
  const L = classOf(carrier).length / 2 + 0.5;
  const c = Math.cos((carrier.heading * Math.PI) / 180), s = Math.sin((carrier.heading * Math.PI) / 180);
  return types.map((type, slot) => {
    const lx = -L, ly = (slot - 1) * 0.6;
    const def = SQUADRONS[type];
    return {
      id: nextId(), kind: 'squad', type, faction: def.faction, owner: carrier.owner, carrier: carrier.id, slot,
      x: Math.max(SQUAD_R, Math.min(map.w - SQUAD_R, carrier.x + lx * c - ly * s)),
      y: Math.max(SQUAD_R, Math.min(map.h - SQUAD_R, carrier.y + lx * s + ly * c)),
      hull: def.hull, alive: true,
    };
  });
}

// Each faction deploys on its own edge (a faction without one takes the free edge),
// spread evenly from top to bottom, in the order the ships are listed.
function deploy(ships, factions, scenario) {
  const edges = {};
  for (const f of factions) if (FACTIONS[f].edge) edges[f] = FACTIONS[f].edge;
  for (const f of factions) {
    if (edges[f]) continue;
    const taken = Object.values(edges);
    edges[f] = taken.includes('west') ? 'east' : 'west';
  }
  for (const f of factions) {
    const mine = ships.filter((s) => s.faction === f);
    const west = edges[f] === 'west';
    mine.forEach((s, i) => {
      s.x = west ? scenario.deployDepth : scenario.map.w - scenario.deployDepth;
      s.y = Math.round(((i + 0.5) * scenario.map.h * 100) / mine.length) / 100;
      s.heading = west ? 0 : 180;
    });
  }
}

// Random asteroid layout for one battle, using the scenario's asteroidField settings.
function rollAsteroids(field) {
  const rand = (a, b) => a + Math.random() * (b - a);
  const want = Math.floor(rand(field.count[0], field.count[1] + 1));
  const out = [];
  for (let tries = 0; out.length < want && tries < 500; tries++) {
    const r = Math.round(rand(field.radius[0], field.radius[1]) * 10) / 10;
    const x = Math.round(rand(field.area.x0, field.area.x1) * 10) / 10;
    const y = Math.round(rand(field.area.y0, field.area.y1) * 10) / 10;
    if (out.every((o) => Math.hypot(o.x - x, o.y - y) >= o.r + r + field.gap)) out.push({ x, y, r });
  }
  return out;
}

export function start({ container, players, setPhoneState, onExit }) {
  const base = SCENARIOS.m1;
  const scenario = base.asteroidField ? { ...base, asteroids: rollAsteroids(base.asteroidField) } : base;
  const { map, asteroids } = scenario;
  const people = Object.fromEntries(players.map((p) => [p.id, { ...p }]));
  const order = players.map((p) => p.id);
  const online = new Set(players.filter((p) => p.online !== false).map((p) => p.id));

  const teams = {}; // playerId -> faction
  const fleets = {}; // playerId -> [{ type, wing: [squadron types] }], in buying order (setup only)
  const surrender = {}; // playerId -> true while their Surrender tap stands
  let mission = 'battle';

  let ships = []; // filled in when the battle starts
  let phoneShips = null; // what phones see while the TV is still animating
  let squads = []; // squadrons (rules §8), kept apart from ships
  let phoneSquads = null;
  let kills = {}; // faction -> kill points scored (shown on screen from step 7)
  let phase = 'setup';
  let phaseKey = 0;
  let round = 0;
  let phaseEndsAt = 0;
  let ready = {};
  let movePlans = {};
  let firePlans = {};
  let repairPlans = {}; // playerId -> { shipId: Damage Control repair choice }
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
  // Ships and squadrons together (anything that can be targeted or drawn).
  const units = () => [...ships, ...squads];
  const unitById = (id) => ships.find((s) => s.id === id) || squads.find((q) => q.id === id);
  // Kill points: the other team scores a destroyed unit's value.
  const credit = (u) => {
    const other = battleFactions.find((f) => f !== u.faction);
    if (other) kills[other] = (kills[other] || 0) + killValue(u);
  };
  const playersOn = (f) => order.filter((id) => teams[id] === f);
  const shipsOf = (id) => ships.filter((s) => s.owner === id && s.alive);
  // A player's color is a shade of their faction's color (first player = the main color).
  const colorOf = (id) => {
    const f = teams[id];
    if (!f) return '#9a93b5';
    const shades = FACTIONS[f].shades;
    return shades[playersOn(f).indexOf(id) % shades.length];
  };
  const nameOf = (id) => people[id]?.name || '?';
  const now = () => performance.now();

  // Players the TV waits for in a planning window: online and still commanding a ship.
  const required = () => order.filter((id) => online.has(id) && shipsOf(id).length > 0);

  // ----- Fleet building -----
  const shareOf = (id) => pointShare(playersOn(teams[id]).length);
  const spentOf = (id) => fleetCost(fleets[id] || []);
  const teamShipCount = (f) => playersOn(f).reduce((n, id) => n + (fleets[id] || []).length, 0);
  const overBudget = (id) => teams[id] && spentOf(id) > shareOf(id);

  // Team sizes changed: anyone now over their share has to remove ships before being ready.
  function recheckBudgets() {
    for (const id of order) if (overBudget(id)) delete ready[id];
  }

  function setupProblems() {
    const out = [];
    const noTeam = order.filter((id) => !teams[id]);
    if (noTeam.length) out.push(`Waiting for ${noTeam.map(nameOf).join(', ')} to pick a side`);
    const used = FACTION_ORDER.filter((f) => playersOn(f).length > 0);
    if (used.length > 2) out.push('Players must be on only 2 factions');
    else if (used.length < 2) out.push('Players must be on 2 factions, with at least one player on each');
    for (const f of used) {
      const share = pointShare(playersOn(f).length);
      const cheapest = cheapestShipCost(f);
      if (share < cheapest) {
        out.push(`${FACTIONS[f].short}: ${share} points each isn't enough for a ship (cheapest ${cheapest}). Someone please switch teams.`);
      }
    }
    for (const id of order) {
      if (overBudget(id)) out.push(`${nameOf(id)} is over budget by ${spentOf(id) - shareOf(id)} points`);
    }
    const off = order.filter((id) => !online.has(id));
    if (off.length) out.push(`Waiting for ${off.map(nameOf).join(', ')} to reconnect`);
    const noShips = order.filter((id) => teams[id] && !(fleets[id] || []).length);
    if (noShips.length) out.push(`No ships yet: ${noShips.map(nameOf).join(', ')}`);
    const notReady = order.filter((id) => teams[id] && (fleets[id] || []).length && !ready[id]);
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
      secondsLeft: secondsLeft(),
      scenarioId: scenario.id,
      mission,
      fleets: phase === 'setup' ? Object.fromEntries(order.map((id) => [id, fleets[id] || []])) : null,
      surrender: { ...surrender },
      map,
      asteroids,
      factions: battleFactions,
      people: Object.fromEntries(order.map((id) => [id, { name: nameOf(id), color: colorOf(id) }])),
      teams: { ...teams },
      ready: { ...ready },
      problems: phase === 'setup' ? setupProblems() : [],
      ships: (phoneShips || ships).map(publicShip),
      squads: (phoneSquads || squads).map(publicSquad),
      kills: { ...kills },
      result,
    });
  }

  // ---------- Setup flow ----------
  function setupInput(id, msg) {
    if (msg.type === 'team') {
      const f = msg.faction;
      if (!FACTIONS[f]?.available || teams[id] === f) return;
      teams[id] = f;
      fleets[id] = []; // ships belong to a faction, so switching sides starts a new fleet
      delete ready[id];
      recheckBudgets();
    } else if (msg.type === 'buy') {
      const f = teams[id];
      const mine = fleets[id] || [];
      if (!f || buyProblem(msg.shipType, f, mine, shareOf(id), teamShipCount(f))) return;
      fleets[id] = [...mine, { type: msg.shipType, wing: [] }];
      delete ready[id];
    } else if (msg.type === 'buySquad') {
      // Squadrons fill a carrier the player owns (rules §1).
      const f = teams[id];
      const mine = fleets[id] || [];
      const i = Number(msg.index);
      if (!f || !Number.isInteger(i) || squadBuyProblem(msg.squadType, f, mine, i, shareOf(id))) return;
      fleets[id] = mine.map((e, j) => (j === i ? { ...e, wing: [...e.wing, msg.squadType] } : e));
      delete ready[id];
    } else if (msg.type === 'removeSquad') {
      const mine = fleets[id] || [];
      const i = Number(msg.index), k = Number(msg.slot);
      if (!mine[i] || !Number.isInteger(k) || k < 0 || k >= mine[i].wing.length) return;
      fleets[id] = mine.map((e, j) => (j === i ? { ...e, wing: e.wing.filter((_, m) => m !== k) } : e));
      delete ready[id];
    } else if (msg.type === 'remove') {
      const mine = fleets[id] || [];
      const i = Number(msg.index);
      if (!Number.isInteger(i) || i < 0 || i >= mine.length) return;
      fleets[id] = mine.filter((_, j) => j !== i);
      delete ready[id];
    } else if (msg.type === 'ready') {
      if (msg.ready && teams[id] && (fleets[id] || []).length && !overBudget(id)) ready[id] = true;
      else delete ready[id];
    } else return;
    renderSetup();
    pushState();
    if (!setupProblems().length) beginBattle();
  }

  function pickMission(id) {
    const m = MISSIONS.find((x) => x.id === id);
    if (!m?.available || phase !== 'setup') return;
    mission = id;
    renderSetup();
    pushState();
  }

  function renderSetup() {
    const problems = setupProblems();
    overlay.className = 'sb-overlay show';
    overlay.innerHTML = `
      <div class="sb-panel sb-setup">
        <p class="eyebrow">Space Battles · ${escapeHtml(scenario.name)}</p>
        <div class="sb-missions">
          ${MISSIONS.map((m) => `
            <button data-mission="${m.id}" class="${m.id === mission ? 'on' : ''}" ${m.available ? '' : 'disabled'}>
              <b>${escapeHtml(m.name)}</b><small>${m.available ? escapeHtml(m.desc) : 'Coming soon'}</small>
            </button>`).join('')}
        </div>
        <h2>Pick a side and build your fleet on your phone</h2>
        <p class="muted">Each side gets ${FLEET.sidePoints} points, split evenly between its players. Up to ${FLEET.maxShipsPerSide} ships per side.</p>
        <div class="sb-factions">
          ${FACTION_ORDER.map((f) => {
            const fd = FACTIONS[f];
            const ps = playersOn(f);
            const share = pointShare(ps.length);
            return `
              <div class="sb-faction ${fd.available ? '' : 'soon'}" style="--fc:${fd.color}">
                <h3>${escapeHtml(fd.name)}</h3>
                ${fd.available ? `<p class="muted">${escapeHtml(fd.blurb)}</p>` : ''}
                ${fd.available ? `
                  ${ps.length ? `<p class="sb-share">${share} points each · ${teamShipCount(f)}/${FLEET.maxShipsPerSide} ships</p>` : ''}
                  <ul class="sb-plist">
                    ${ps.length ? ps.map((id) => {
                      const mine = fleets[id] || [];
                      return `<li><div class="sb-pname"><span class="dot" style="background:${colorOf(id)}"></span>${escapeHtml(nameOf(id))}
                        <span class="sb-pts ${overBudget(id) ? 'red' : ''}">${spentOf(id)}/${share}</span>
                        ${!online.has(id) ? '<em class="muted">offline</em>' : ready[id] ? '<b class="green">✔ Ready</b>' : ''}</div>
                        ${mine.length ? `<div class="sb-pships">${mine.map((e) => escapeHtml(SHIPS[e.type].short + (e.wing.length ? ` (${e.wing.map((q) => SQUADRONS[q].short).join(', ')})` : ''))).join(' · ')}</div>` : ''}</li>`;
                    }).join('') : '<li class="muted">No players yet</li>'}
                  </ul>` : '<p class="sb-soon">Coming soon</p>'}
              </div>`;
          }).join('')}
        </div>
        <ul class="sb-problems">
          ${problems.length ? problems.map((p) => `<li>${escapeHtml(p)}</li>`).join('') : '<li class="green">All set. Launching!</li>'}
        </ul>
      </div>`;
    overlay.querySelectorAll('[data-mission]').forEach((b) => b.addEventListener('click', () => pickMission(b.dataset.mission)));
  }

  function beginBattle() {
    battleFactions = FACTION_ORDER.filter((f) => playersOn(f).length > 0);
    ships = [];
    const wings = [];
    for (const id of order) {
      if (!battleFactions.includes(teams[id])) continue;
      for (const e of fleets[id] || []) {
        const s = makeShip(`s${ships.length + 1}`, e.type, id);
        ships.push(s);
        if (e.wing.length) wings.push([s, e.wing]);
      }
    }
    deploy(ships, battleFactions, scenario); // players in join order, each player's ships together
    squads = [];
    let qn = 0;
    for (const [s, types] of wings) squads.push(...makeSquads(s, types, () => `q${++qn}`, map));
    kills = Object.fromEntries(battleFactions.map((f) => [f, 0]));
    ready = {};
    phase = 'intro';
    phaseEndsAt = now() + TIMING.introMs;
    const [a, b] = battleFactions.map((f) => FACTIONS[f]);
    overlay.className = 'sb-overlay show';
    overlay.innerHTML = `
      <div class="sb-panel">
        <p class="eyebrow">Battle stations</p>
        <h2><span style="color:${a.color}">${escapeHtml(a.short)}</span> vs <span style="color:${b.color}">${escapeHtml(b.short)}</span></h2>
        <p>Plan in secret on your phone, then watch it all happen here.</p>
        <p class="muted">Last fleet standing wins, or make the enemy surrender.</p>
      </div>`;
    pushState();
  }

  // ---------- Planning windows ----------
  // Pirates' "every ship is home": the first time a ship drops to half hull or less,
  // it gets a free Full Burn move next round.
  function checkHome(list) {
    for (const s of list) {
      if (!s.alive || s.homeUsed || !FACTIONS[s.faction].traits.home) continue;
      if (s.hull <= shipDef(s).hull / 2) { s.homeUsed = true; s.burnRound = round + 1; }
    }
  }

  function startPlan(kind) {
    phase = kind;
    phaseKey++;
    if (kind === 'planMove') {
      for (const s of ships) {
        s.burn = s.alive && s.burnRound === round;
        // Last round's stance can't be repeated; the new one stays secret until the Move.
        s.lastStance = s.stance?.id || 'balanced';
        s.stance = null;
        s.tempShields = {};
        // Criticals caught last round now take effect (Weapons Offline, Bridge Fire).
        for (const c of s.crits || []) delete c.fresh;
      }
      repairPlans = {};
    }
    ready = {};
    movePlans = {};
    firePlans = {};
    phoneShips = null;
    phoneSquads = null;
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
        ? sanitizeMovePlan(s, p, ships) || defaultMovePlan(s)
        : sanitizeFirePlan(s, p, units(), asteroids);
    }
    store[id] = plans;
    if (kind === 'planFire') {
      repairPlans[id] = {};
      for (const s of mine) {
        const r = sanitizeRepair(s, msg.repairs?.[s.id]);
        if (r) repairPlans[id][s.id] = r;
      }
    }
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
      // Reveal the stance: it lasts the whole round. Shield Charge adds temporary shields.
      s.stance = plans[s.id].stance;
      const charge = STANCES[s.stance.id].chargeShields;
      s.tempShields = charge ? { [s.stance.zone]: charge } : {};
      // New wing order (kept as it was on a timeout, or while Comms Down is acting).
      if (plans[s.id].wing && isCarrier(s) && !critCount(s, 'comms')) s.wing = { ...plans[s.id].wing };
    }
    const res = simulateMove(ships, plans, scenario);
    const t0 = now();
    phoneShips = ships.map(clone);
    phoneSquads = squads.map(cloneSquad);
    const before = new Set(ships.filter((s) => s.alive).map((s) => s.id));
    ships = ships.map((s) => res.ships.find((r) => r.id === s.id) || s);
    for (const s of ships) if (!s.alive && before.has(s.id)) credit(s);
    // Burn, Disruptor and Grapple effects only last for this one move.
    for (const s of ships) { s.burn = false; s.disrupted = false; s.grappled = false; }
    checkHome(ships);
    // Squadrons move after ships (rules §6), then Boarding Pods check whether they latched on.
    const squadPaths = planSquadMoves(squads, ships, map);
    squads = squads.map((q) => {
      const p = squadPaths[q.id];
      const out = p ? { ...q, x: p.to.x, y: p.to.y } : { ...q };
      out.latched = out.alive ? latchTarget(out, ships)?.id || null : null;
      return out;
    });
    const squadMs = Object.keys(squadPaths).length ? TIMING.squadMoveMs : 0;
    const pending = [];
    const fx = [];
    for (const ev of res.events) {
      const at = t0 + (ev.tick / MOVE_TICKS) * TIMING.moveMs;
      fx.push({ at, x: ev.x, y: ev.y, ram: ev.ram, kind: ev.kind });
      for (const d of ev.damage) pending.push({ at, fromX: ev.x, fromY: ev.y, ...d });
    }
    anim = {
      kind: 'move', start: t0, end: t0 + TIMING.moveMs + squadMs + 900, frames: res.frames, pending, fx, squadPaths,
      dying: new Set(ships.filter((s) => !s.alive && before.has(s.id)).map((s) => s.id)),
      dieAt: t0 + TIMING.moveMs + 100,
    };
    phase = 'move';
    pushState();
  }

  // ---------- Fire ----------
  // One weapon's shots at one target (one "attack": all its hits add up).
  // `shots` already includes stance bonuses and penalties (arcShots). A Hunter rerolls
  // each miss once against its marked ship.
  // Against a squadron: the squadron hit chance (rules §8), no crits, no special effects.
  function rollWeapon(s, t, w, shots) {
    const wd = WEAPONS[w.weapon];
    const band = rangeBand(unitDistance(s, t));
    const chance = hitChance(wd, band, t);
    const reroll = STANCES[s.stance?.id || 'balanced'].reroll && s.stance.target === t.id;
    let hits = 0;
    for (let i = 0; i < shots; i++) {
      if (Math.random() < chance || (reroll && Math.random() < chance)) hits++;
    }
    const sq = isSquad(t);
    return {
      band, shots, hits, damage: hits * wd.damage, perHit: wd.damage, crit: sq ? 0 : wd.crit || 0,
      effect: sq ? null : wd.effect || null, weapon: w.weapon,
    };
  }

  // A squadron's automatic attack (rules §8). Warden Screen: −1 shot against screened ships.
  function rollSquad(q, t, profile) {
    let shots = profile.shots;
    const screen = !isSquad(t) && screened(t, ships);
    if (screen) shots = Math.max(0, shots - 1);
    let hits = 0;
    for (let i = 0; i < shots; i++) if (Math.random() < profile.hit) hits++;
    return {
      band: 'close', shots, hits, damage: hits * profile.damage, perHit: profile.damage,
      crit: isSquad(t) ? 0 : squadDef(q).crit || 0, effect: null, weapon: null, screen,
    };
  }

  // Gives `ship` one random critical (rules §7). Mutates the ship; returns the new critical.
  // `fresh` = caught this round (Weapons Offline / Bridge Fire start acting next round).
  // Comms Down can only hit a carrier that still has living squadrons.
  function addCrit(ship) {
    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    const pool = CRIT_POOL.filter((id) => id !== 'comms' || (isCarrier(ship) && wingOf(ship.id, squads).length));
    const c = { id: pick(pool), fresh: true };
    if (c.id === 'weaponsOffline') c.arc = pick(ARCS.filter((arc) => arcWeapons(ship, arc).length));
    if (c.id === 'shieldGen') c.zone = pick(ZONES);
    if (!ship.crits) ship.crits = [];
    ship.crits.push(c);
    // Damaged Engines: a ship now above its max speed drops to the new max at once.
    if (c.id === 'engines') ship.speed = Math.min(ship.speed, maxSpeed(ship));
    return c;
  }

  function resolveFire() {
    // All attacks land together on copies, so a ship destroyed now still fired.
    const next = ships.map(clone);
    const nextSquads = squads.map(cloneSquad);
    const nextById = Object.fromEntries([...next, ...nextSquads].map((u) => [u.id, u]));
    const all = units();
    const attacks = [];
    for (const s of ships) {
      if (!s.alive) continue;
      const planned = ready[s.owner] && firePlans[s.owner]?.[s.id];
      const plan = planned || defaultFirePlan(s, all, asteroids);
      for (const a of plan) {
        const weapons = arcWeapons(s, a.arc);
        const shots = arcShots(s, a.arc, a.targets, all);
        for (const [wi, targetId] of Object.entries(a.targets)) {
          const w = weapons[wi];
          const t = unitById(targetId);
          if (!w || !t || shots[wi] === undefined) continue;
          if (WEAPONS[w.weapon].once) nextById[s.id].used[weaponKey(a.arc, wi)] = true;
          attacks.push({ from: s.id, to: t.id, arc: a.arc, zone: isSquad(t) ? null : zoneFacing(t, s.x, s.y), ...rollWeapon(s, t, w, shots[wi]) });
        }
      }
      // Point-defense fires on its own at the nearest enemy squadron in close range (not
      // changed by stances or Weapons Offline).
      const pt = pdTarget(s, squads);
      if (pt) for (const w of shipDef(s).pd) attacks.push({ from: s.id, to: pt.id, zone: null, pd: true, ...rollWeapon(s, pt, w, w.shots) });
    }
    // Squadron attacks (automatic).
    for (const q of squads) {
      if (!q.alive) continue;
      const pick = squadAttackTarget(q, all);
      if (!pick) continue;
      const t = pick.target;
      attacks.push({ from: q.id, to: t.id, zone: isSquad(t) ? null : zoneFacing(t, q.x, q.y), ...rollSquad(q, t, pick.profile) });
    }
    const t0 = now();
    const landAt = t0 + FIRE_LAND_MS;
    const pending = [];
    const perTarget = {};
    const tags = []; // effect labels shown over ships (GRAPPLED, DISRUPTED, ACID…)
    const tagOnce = new Set();
    const tag = (shipId, text, color, at = landAt) => {
      if (tagOnce.has(`${shipId}|${text}`)) return;
      tagOnce.add(`${shipId}|${text}`);
      tags.push({ shipId, text, color, at });
    };
    const grappledBy = {}; // target id -> first attacker that grappled it
    for (const a of attacks) {
      const target = nextById[a.to];
      if (isSquad(target)) {
        // Squadrons have no zones or shields: damage goes straight to hull.
        const hullLost = Math.min(target.hull, a.damage);
        target.hull -= hullLost;
        a.shieldLost = 0;
        a.hullLost = hullLost;
        pending.push({ at: landAt, shipId: target.id, zone: null, shieldLost: 0, hullLost });
        const p = perTarget[a.to] || (perTarget[a.to] = { shieldLost: 0, hullLost: 0 });
        p.hullLost += hullLost;
        continue;
      }
      // Defender's stance: Overcharge +1 (attack that hit), Brace halves.
      const amount = stanceDamage(target, a.damage, { attack: true });
      // Hits that get past the shields each roll the crit chance (Ion never hurts hull).
      const throughHits = a.effect === 'ion' ? 0
        : hullHitCount(amount, a.hits, a.perHit, absorbableShields(target, a.zone));
      const d = a.effect === 'ion'
        ? applyShieldDamage(target, a.zone, amount)
        : applyDamage(target, a.zone, amount);
      a.shieldLost = d.shieldLost + d.tempLost;
      a.hullLost = d.hullLost;
      pending.push({ at: landAt, ...d });
      const p = perTarget[a.to] || (perTarget[a.to] = { shieldLost: 0, hullLost: 0 });
      p.shieldLost += d.shieldLost + d.tempLost;
      p.hullLost += d.hullLost;
      if (!a.hits) continue;
      if (target.hull > 0) {
        let crits = 0;
        for (let i = 0; i < throughHits; i++) if (Math.random() < a.crit) crits++;
        if (a.effect === 'board') crits++; // Boarding Harpoon: a hit always causes 1 critical
        for (let i = 0; i < crits; i++) {
          const c = addCrit(target);
          tag(a.to, `CRIT: ${CRITICALS[c.id].name}${c.arc ? ` (${c.arc})` : c.zone ? ` (${c.zone})` : ''}`, '#ff8787');
        }
      }
      if (a.effect === 'acid') {
        target.acidDue[round + 1] = (target.acidDue[round + 1] || 0) + a.hits;
        tag(a.to, 'ACID', '#a9e34b');
      } else if (a.effect === 'disrupt') {
        target.disrupted = true;
        tag(a.to, 'DISRUPTED', '#ffe066');
      } else if (a.effect === 'grapple') {
        target.grappled = true;
        if (!grappledBy[a.to]) grappledBy[a.to] = a.from;
        tag(a.to, 'GRAPPLED', '#ff922b');
      }
    }

    // Grapple pulls: each grappled ship that survived is pulled once, toward the first grappler.
    const pulls = {};
    for (const [id, fromId] of Object.entries(grappledBy)) {
      const t = nextById[id];
      if (t.hull <= 0) continue;
      const g = ships.find((x) => x.id === fromId);
      const live = next.filter((x) => x.hull > 0);
      const to = pullToward(t, g.x, g.y, WEAPONS.grapple.pull, live, scenario);
      if (Math.hypot(to.x - t.x, to.y - t.y) > 0.01) {
        pulls[id] = { from: { x: t.x, y: t.y }, to };
        t.x = to.x;
        t.y = to.y;
      }
    }

    // ----- End of round (rules §4 step 5): Damage Control repairs, then acid burns. -----
    const acidAt = t0 + ACID_MS;
    let acidKill = false, endOfRound = false;
    for (const s of next) {
      if (s.hull <= 0 || s.stance?.id !== 'damageControl') continue;
      const r = applyRepair(s, repairPlans[s.owner]?.[s.id] || null);
      endOfRound = true;
      // Negative "losses" so the TV shows the old values until the repair lands.
      if (r.hullGained) pending.push({ at: acidAt, shipId: s.id, zone: null, shieldLost: 0, hullLost: -r.hullGained });
      for (const z of r.zones) pending.push({ at: acidAt, shipId: s.id, zone: z, shieldLost: -1, hullLost: 0 });
      const parts = [];
      if (r.hullGained) parts.push(`+${r.hullGained} hull`);
      if (r.shieldsGained) parts.push(`+${r.shieldsGained} shields`);
      if (r.critRemoved) parts.push(`fixed ${CRITICALS[r.critRemoved].name}`);
      tag(s.id, `🔧 ${parts.length ? parts.join(', ') : 'Nothing to repair'}`, '#8ce99a', acidAt);
    }
    // Hangar repair (Protectorate): squadrons within close range of their own living carrier.
    for (const q of nextSquads) {
      const hr = FACTIONS[q.faction].traits.hangarRepair;
      const c = nextById[q.carrier];
      if (!hr || !q.alive || q.hull <= 0 || !c?.alive || c.hull <= 0) continue;
      if (rangeBand(unitDistance(q, c)) !== 'close') continue;
      const h = Math.min(hr, squadDef(q).hull - q.hull);
      if (h <= 0) continue;
      q.hull += h;
      endOfRound = true;
      pending.push({ at: acidAt, shipId: q.id, zone: null, shieldLost: 0, hullLost: -h });
      tag(q.id, `+${h} hangar`, '#8ce99a', acidAt);
    }
    // Bridge Fire: 1 hull per fire (caught before this round), ignoring shields; Brace halves it.
    for (const s of next) {
      const fires = critCount(s, 'bridgeFire');
      if (!fires || s.hull <= 0) continue;
      endOfRound = true;
      const d = applyHullDamage(s, stanceDamage(s, fires * CRITICALS.bridgeFire.burn));
      pending.push({ at: acidAt, ...d });
      tag(s.id, `🔥 −${d.hullLost} bridge fire`, '#ffa94d', acidAt);
      if (s.hull <= 0) acidKill = true;
    }
    // Acid ignores shields (Brace still halves it).
    for (const s of next) {
      const due = s.acidDue[round];
      if (!due) continue;
      delete s.acidDue[round];
      if (s.hull <= 0) continue;
      endOfRound = true;
      const d = applyHullDamage(s, stanceDamage(s, due));
      pending.push({ at: acidAt, ...d, acid: true });
      tag(s.id, `−${d.hullLost} acid`, '#a9e34b', acidAt);
      if (s.hull <= 0) acidKill = true;
    }
    // Boarding Pods that latched on (and survived the shooting): 1 critical, then the pod is gone
    // (no kill point for anyone).
    const boarded = new Set();
    for (const q of nextSquads) {
      const t = q.latched && nextById[q.latched];
      if (!t || !q.alive || q.hull <= 0 || !t.alive || t.hull <= 0) continue;
      const c = addCrit(t);
      tag(t.id, `BOARDED! CRIT: ${CRITICALS[c.id].name}${c.arc ? ` (${c.arc})` : c.zone ? ` (${c.zone})` : ''}`, '#ff8787', acidAt);
      q.alive = false;
      boarded.add(q.id);
      endOfRound = true;
    }
    for (const q of nextSquads) q.latched = null;

    const dying = new Set();
    for (const u of [...next, ...nextSquads]) if (u.alive && u.hull <= 0) { u.alive = false; dying.add(u.id); credit(u); }
    phoneShips = ships.map(clone);
    phoneSquads = squads.map(cloneSquad);
    ships = next;
    squads = nextSquads;
    checkHome(ships);
    const gap = attacks.length ? Math.min(220, 1300 / attacks.length) : 0;
    attacks.forEach((a, i) => { a.at = t0 + 200 + i * gap; });
    anim = {
      kind: 'fire', start: t0, end: t0 + TIMING.fireMs + (acidKill ? 900 : endOfRound ? 500 : 0), attacks, pending, landAt, dying,
      dieAt: (acidKill ? acidAt : landAt) + 700, pulls, tags, boarded, boardAt: acidAt,
      popups: Object.entries(perTarget).map(([shipId, p]) => ({ at: landAt, shipId, ...p })),
    };
    phase = 'fire';
    pushState();
  }

  // ---------- Winning ----------
  const fleetValues = () => Object.fromEntries(battleFactions.map((f) => [f, fleetValue(ships, f, squads)]));

  function checkWinner() {
    const alive = battleFactions.filter((f) => ships.some((s) => s.alive && s.faction === f));
    if (alive.length === 1) return endGame(alive[0], 'Last fleet standing');
    if (alive.length === 0) return endGame(null, 'Both fleets were destroyed');
    return false;
  }

  // ---------- Surrender (rules §1) ----------
  // A team surrenders once every online teammate has tapped Surrender (taps can be taken back).
  const battleRunning = () => ['intro', 'planMove', 'move', 'planFire', 'fire'].includes(phase);

  function surrenderInput(id, msg) {
    if (!battleRunning() || !battleFactions.includes(teams[id])) return;
    if (msg.on) surrender[id] = true;
    else delete surrender[id];
    pushState();
    checkSurrender();
  }

  function checkSurrender() {
    if (!battleRunning()) return;
    for (const f of battleFactions) {
      const voters = playersOn(f).filter((id) => online.has(id));
      if (voters.length && voters.every((id) => surrender[id])) {
        const winner = battleFactions.find((x) => x !== f);
        endGame(winner, `${FACTIONS[f].short} surrendered`);
        return;
      }
    }
  }

  function endGame(winner, reason) {
    phase = 'over';
    anim = null;
    phoneShips = null;
    phoneSquads = null;
    result = { winner, reason, values: fleetValues(), kills: { ...kills } };
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
        <p class="eyebrow">Round ${Math.max(1, round)} · ${escapeHtml(reason)}</p>
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
                ${squads.some((q) => q.faction === f) ? `<li class="muted">Squadrons left: ${squads.filter((q) => q.faction === f && q.alive).length} of ${squads.filter((q) => q.faction === f).length}</li>` : ''}
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
      phoneSquads = null;
      if (!checkWinner()) startPlan('planFire');
    } else if (phase === 'fire' && t >= anim.end) {
      anim = null;
      phoneShips = null;
      phoneSquads = null;
      if (!checkWinner()) {
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
      : phase === 'over' ? 'Battle over' : `Round ${Math.max(1, round)} · ${PHASE_NAMES[phase]}`;
    let sub = '';
    if (phase !== 'setup') {
      const teamsHtml = battleFactions.map((f) => `<span style="color:${FACTIONS[f].color}">${escapeHtml(FACTIONS[f].short)} ${fleetValue(phoneShips || ships, f, phoneSquads || squads)}</span>`).join(' <span class="muted">vs</span> ');
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

  const PULL_MS = 600; // how long a Grapple pull takes on screen (starts when damage lands)
  const TRACER_COLORS = { ion: '#8ce1ff', acid: '#a9e34b', disrupt: '#ffe066' }; // others: shooter's color

  function poseOf(s, t) {
    if (isSquad(s)) {
      // Squadrons fly after the ships have finished moving.
      const p = anim?.kind === 'move' && anim.squadPaths[s.id];
      if (!p) return s;
      const u = Math.min(1, Math.max(0, (t - anim.start - TIMING.moveMs) / TIMING.squadMoveMs));
      return { x: p.from.x + (p.to.x - p.from.x) * u, y: p.from.y + (p.to.y - p.from.y) * u };
    }
    const pull = anim?.kind === 'fire' && anim.pulls[s.id];
    if (pull) {
      const u = Math.min(1, Math.max(0, (t - anim.landAt) / PULL_MS));
      return { x: pull.from.x + (pull.to.x - pull.from.x) * u, y: pull.from.y + (pull.to.y - pull.from.y) * u, heading: s.heading };
    }
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
    const temp = { ...(s.tempShields || {}) };
    if (anim) {
      for (const p of anim.pending) {
        if (p.shipId !== s.id || p.at <= t) continue;
        hull += p.hullLost;
        if (p.zone) { sh[p.zone] += p.shieldLost; temp[p.zone] = (temp[p.zone] || 0) + (p.tempLost || 0); }
      }
    }
    return { hull, sh, temp };
  }

  const SHAPES = {
    corvette: [[0.5, 0], [0.05, -0.5], [-0.5, -0.42], [-0.32, 0], [-0.5, 0.42], [0.05, 0.5]],
    destroyer: [[0.5, 0], [0.15, -0.5], [-0.5, -0.5], [-0.5, 0.5], [0.15, 0.5]],
    cruiser: [[0.5, 0], [0.28, -0.5], [-0.5, -0.5], [-0.42, 0], [-0.5, 0.5], [0.28, 0.5]],
    battleship: [[0.5, -0.2], [0.5, 0.2], [0.3, 0.5], [-0.5, 0.5], [-0.42, 0.2], [-0.42, -0.2], [-0.5, -0.5], [0.3, -0.5]],
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
    // Gold marks = Shield Charge's temporary shields (used up first). A zone switched off by
    // the stance (Shield Charge's opposite zone, Full Burn's rear) is drawn faint and dashed.
    const { hull, sh, temp } = shownStats(s, t);
    const R = (cls.length / 2) * S + 6;
    const ZONE_ANGLE = { front: 0, right: 90, rear: 180, left: -90 };
    for (const z of ZONES) {
      const mid = (ZONE_ANGLE[z] * Math.PI) / 180;
      const half = (36 * Math.PI) / 180;
      const off = shieldsOff(s, z);
      const n = sh[z];
      const tn = temp[z] || 0;
      if (n + tn <= 0) {
        ctx.strokeStyle = 'rgba(255,120,120,.25)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, R, mid - half, mid + half);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      for (let i = 0; i < n + tn; i++) {
        ctx.strokeStyle = i < tn ? 'rgba(255,212,59,.95)' : off ? 'rgba(140,225,255,.25)' : 'rgba(140,225,255,.85)';
        ctx.lineWidth = 1.6;
        if (off && i >= tn) ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.arc(0, 0, R + i * 3.2, mid - half, mid + half);
        ctx.stroke();
        ctx.setLineDash([]);
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
    const burnTag = phase === 'planMove' ? `${s.burn ? ' 🚀' : ''}${s.disrupted ? ' ⚡' : ''}${s.grappled ? ' ⚓' : ''}` : '';
    label(`${s.owner ? `${def.short} · ${nameOf(s.owner)}` : def.short}${burnTag}`, cx, cy - R - 10, color, Math.max(11, S * 0.42));
    // Critical icons under the hull bar.
    if (s.crits?.length && s.alive) {
      ctx.font = `700 ${Math.max(11, S * 0.42)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#ff8787';
      ctx.fillText(s.crits.map((c) => CRITICALS[c.id].icon).join(' '), cx, by + 8);
    }
    // Stance icon + name (revealed when the Move starts, shown for the rest of the round).
    if (s.stance && phase !== 'planMove') {
      const st = STANCES[s.stance.id];
      const hunted = s.stance.target ? ships.find((x) => x.id === s.stance.target) : null;
      let text = `${st.icon} ${st.name}${s.stance.zone ? ` (${s.stance.zone})` : ''}${hunted ? ` → ${SHIPS[hunted.type].short}` : ''}`;
      if (s.wing && wingOf(s.id, squads).length) {
        const wo = WING_ORDERS[s.wing.order];
        const wt = s.wing.target && shipById(s.wing.target);
        text += ` · Wing ${wo.icon}${wt ? ` ${SHIPS[wt.type].short}` : ''}`;
      }
      label(text, cx, cy - R - 10 - Math.max(12, S * 0.5), s.stance.id === 'balanced' ? 'rgba(220,220,240,.6)' : '#ffd43b', Math.max(10, S * 0.38));
    }
    ctx.restore();
  }

  // A squadron: small glowing circle in its player's color with its role letter (F/B/P)
  // and one pip per hull point underneath.
  function drawSquad(q, t) {
    const S = scale;
    const p = poseOf(q, t);
    const def = squadDef(q);
    const color = colorOf(q.owner);
    let alpha = 1;
    if (!q.alive && anim?.dying.has(q.id) && t > anim.dieAt) alpha = Math.max(0, 1 - (t - anim.dieAt) / 600);
    if (!q.alive && anim?.boarded?.has(q.id) && t > anim.boardAt) alpha = Math.max(0, 1 - (t - anim.boardAt) / 500);
    if (alpha <= 0) return;
    const R = Math.max(7, SQUAD_R * S);
    const cx = p.x * S, cy = p.y * S;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = `${color}33`;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.font = `800 ${Math.round(R * 1.15)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(SQUADRON_ROLES[def.role].letter, cx, cy + 1);
    const { hull } = shownStats(q, t);
    const pip = 3.2;
    const x0 = cx - ((def.hull - 1) * pip * 1.6) / 2;
    for (let i = 0; i < def.hull; i++) {
      ctx.fillStyle = i < hull ? '#51cf66' : 'rgba(255,255,255,.18)';
      ctx.beginPath();
      ctx.arc(x0 + i * pip * 1.6, cy + R + 5, pip / 2 + 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
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
    const s = unitById(shipId);
    if (!s || t < at || t > at + 1800) return;
    const p = poseOf(s, t);
    const k = (t - at) / 1800;
    let dx = 0, dy = -1;
    if (fromX !== undefined) {
      const len = Math.hypot(p.x - fromX, p.y - fromY);
      if (len > 0.01) { dx = (p.x - fromX) / len; dy = (p.y - fromY) / len; }
    }
    const off = fromX !== undefined ? 1.6 : isSquad(s) ? 1.1 : 2.4;
    const x = (p.x + dx * off) * scale, y = (p.y + dy * off) * scale - k * 30;
    const size = isSquad(s) ? Math.max(12, scale * 0.5) : Math.max(16, scale * 0.8);
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
    if (phase !== 'setup') {
      for (const q of squads) if (q.alive || anim?.dying.has(q.id) || anim?.boarded?.has(q.id)) drawSquad(q, t);
    }
    // (During setup the ships aren't drawn yet: deployment edges depend on the chosen factions.)

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
        const from = unitById(a.from), toShip = unitById(a.to);
        const to = poseOf(toShip, t);
        const k = Math.min(1, (t - a.at) / 450);
        const fade = t > anim.landAt + 300 ? Math.max(0, 1 - (t - anim.landAt - 300) / 500) : 1;
        if (fade <= 0) continue;
        const x1 = from.x * S, y1 = from.y * S;
        const x2 = x1 + (to.x * S - x1) * k, y2 = y1 + (to.y * S - y1) * k;
        const color = TRACER_COLORS[a.effect] || colorOf(from.owner);
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.lineWidth = a.pd || isSquad(from) ? 1.5 : 2.5;
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
      // Effect labels (GRAPPLED, DISRUPTED, ACID, "−1 acid"), stacked under the ship.
      const row = {};
      for (const g of anim.tags) {
        if (t < g.at || t > g.at + 1800) continue;
        const s = unitById(g.shipId);
        if (!s) continue;
        const p = poseOf(s, t);
        const n = (row[g.shipId] = (row[g.shipId] || 0) + 1);
        ctx.save();
        ctx.globalAlpha = Math.min(1, 2.2 - ((t - g.at) / 1800) * 2);
        label(g.text, p.x * S, p.y * S + S * ((isSquad(s) ? 0.4 : 1.2) + n * 0.7), g.color, Math.max(12, S * 0.5));
        ctx.restore();
      }
    }
    if (anim) {
      for (const id of anim.dying) {
        if (t < anim.dieAt || t > anim.dieAt + 900) continue;
        const s = unitById(id);
        const p = poseOf(s, t);
        const k = (t - anim.dieAt) / 900;
        const small = isSquad(s);
        ctx.fillStyle = `rgba(255,170,80,${0.7 * (1 - k)})`;
        ctx.beginPath();
        ctx.arc(p.x * S, p.y * S, S * (small ? 0.2 + k * 0.8 : 0.5 + k * 2), 0, Math.PI * 2);
        ctx.fill();
        if (k < 0.7 && !small) label('DESTROYED', p.x * S, p.y * S - S * 1.4, '#ffd8a8', Math.max(14, S * 0.6));
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
      else if (msg.type === 'surrender') surrenderInput(id, msg);
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
        checkSurrender(); // an offline teammate no longer has to vote
      }
    },
    stop() {
      cancelAnimationFrame(raf);
      clearInterval(clock);
      window.removeEventListener('resize', resize);
    },
  };
}
