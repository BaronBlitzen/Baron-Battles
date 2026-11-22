// Space Battles – TV side. The TV is the referee: it runs the setup flow, the
// phase machine and timers, resolves movement and fire (all dice rolls happen
// here), draws the battle, and shows the results.
import { escapeHtml } from '../../supabase.js';
import {
  FACTIONS, FACTION_ORDER, WEAPONS, SHIPS, SCENARIOS, TIMING, ZONES, MISSIONS, FLEET, STANCES,
  CRITICALS, CRIT_POOL, SQUADRONS, SQUADRON_ROLES, SQUAD_ORDERS, HIT, SPECIALS, BATTLE_SIZES, CAPTAINS, diceColor,
  UPGRADES, MISSILE, RANGE_BANDS,
} from './data.js';
import {
  classOf, shipDef, simulateMove, sanitizeMovePlan, defaultMovePlan, sanitizeFirePlan,
  defaultFirePlan, rangeBand, zoneFacing, applyDamage, arcWeapons, fleetValue,
  MOVE_TICKS, pointShare, fleetCost, cheapestShipCost, buyProblem, weaponKey, applyShieldDamage,
  applyHullDamage, pullToward, stanceDamage, sanitizeRepair, applyRepair, shieldsOff,
  absorbableShields, maxSpeed, critCount, isSquad, squadDef, SQUAD_R, unitDistance,
  needToHit, isCarrier, wingOf, planSquadMoves, squadAttackTarget, screened, pdTargets, latchTarget,
  weaponShots, upgradeProblem, upgradeChoices, carrierSlots, tryLastStand, missilesLeft, missileDistance, teleportProblem, normAngle,
  ammoLeft, pointPolygonDistance, shipPolygon, accuracyOf,
  launchSpot, canDock, mineSpot, sanitizeHold, sizeRules, sizeForPlayers,
  squadBuyProblem, killValue, applySquadHits, critOnOf, boostCap,
  captainOf, captainProblem, maxHull, regenZone, weaponRepeats, unitName, sanitizeRotate, rotatedShip,
} from './rules.js';
import { spriteCanvas, spriteSize } from './sprites.js';
import { faceImg } from './portraits.js';

// " [face] Shrike" after a ship or squadron in the fleet list (empty without a captain).
const capFace = (id) => (CAPTAINS[id] ? ` ${faceImg(id, 26)} ${escapeHtml(CAPTAINS[id].short)}` : '');

// Close range (u): a decoy draws attacks on friendly ships within this distance of it.
const RANGE_CLOSE = RANGE_BANDS.find((b) => b.id === 'close').max;
const PHASE_NAMES = {
  setup: 'Fleet Setup', intro: 'Battle stations', planMove: 'Plan Movement', move: 'Move',
  planFire: 'Plan Fire', roll: 'Roll dice', fire: 'Fire', teleport: 'Teleport', warp: 'Teleport', over: 'Battle over',
};
const FIRE_LAND_MS = 1900; // when all fire damage lands (after the tracers)

const ACID_MS = 2900; // when end-of-round acid burns (after the fire damage)

// Ships also carry: `used` (once-per-game weapons fired, by "arc:index"), `acidDue`
// (round -> acid hull damage due at the end of that round), and for the next move only
// `disrupted` (−1 turn click) and `grappled` (can't speed up).
const clone = (s) => ({
  ...s, shields: { ...s.shields }, used: { ...(s.used || {}) }, acidDue: { ...(s.acidDue || {}) },
  tempShields: { ...(s.tempShields || {}) }, crits: (s.crits || []).map((c) => ({ ...c })),
});
const cloneSquad = (q) => ({ ...q, order: { ...q.order } });
// A squadron's order is shown to everyone (it's revealed by the move); docked squadrons sit at
// their carrier's position.
const publicSquad = (q) => ({
  id: q.id, kind: 'squad', type: q.type, faction: q.faction, owner: q.owner, carrier: q.carrier,
  slot: q.slot, x: q.x, y: q.y, hull: q.hull, shields: q.shields, hurt: q.hurt || 0, alive: q.alive, docked: !!q.docked, order: { ...q.order },
  captain: q.captain || null, letter: q.letter || '', spent: !!q.spent,
});
const publicShip = (s) => ({
  id: s.id, type: s.type, faction: s.faction, owner: s.owner, x: s.x, y: s.y,
  heading: s.heading, speed: s.speed, hull: s.hull, shields: { ...s.shields }, alive: s.alive,
  burn: !!s.burn, used: { ...(s.used || {}) }, disrupted: !!s.disrupted, grappled: !!s.grappled,
  acidDue: { ...(s.acidDue || {}) }, recover: !!s.recover,
  // Stance: null while it's still secret (Plan Movement); lastStance can't be picked again.
  stance: s.stance ? { ...s.stance } : null, lastStance: s.lastStance || 'balanced',
  tempShields: { ...(s.tempShields || {}) }, crits: (s.crits || []).map((c) => ({ ...c })),
  specialUsed: s.specialUsed || 0, boost: s.boost ? { ...s.boost } : null,
  captain: s.captain || null, letter: s.letter || '', mods: [...(s.mods || [])],
  stubbornUsed: !!s.stubbornUsed, lastStand: !!s.lastStand, missiles: s.missiles || 0, mineAmmo: s.mineAmmo || 0, cyclones: s.cyclones || 0, teleportUsed: !!s.teleportUsed, decoyUsed: !!s.decoyUsed,
});

// Position and heading are set by deploy().
function makeShip(id, type, owner, captain = null, mods = []) {
  const def = SHIPS[type];
  const s = {
    id, type, faction: def.faction, owner, x: 0, y: 0, heading: 0, captain: CAPTAINS[captain] ? captain : null,
    mods: (mods || []).filter((m) => UPGRADES[m]?.ships.includes(type)),
    speed: def.speed[0], hull: def.hull, shields: { ...def.shields }, alive: true, specialUsed: 0,
  };
  // Limited ammo, with customizations (Free Trader missiles, Mine-Layer mines, Cyclone volley).
  const full = shipDef(s);
  for (const k of ['missiles', 'mineAmmo', 'cyclones']) s[k] = full[k] || 0;
  s.hull = maxHull(s);
  return s;
}

// Squadrons start the battle docked inside their carrier (rules §8).
function makeSquads(carrier, types, nextId, captains = []) {
  return types.map((type, slot) => {
    const def = SQUADRONS[type];
    return {
      id: nextId(), kind: 'squad', type, faction: def.faction, owner: carrier.owner, carrier: carrier.id, slot,
      x: carrier.x, y: carrier.y, hull: def.craft, shields: def.shield ? def.craft : 0, hurt: 0,
      alive: true, docked: true, order: { order: 'docked' }, captain: CAPTAINS[captains[slot]] ? captains[slot] : null,
    };
  });
}

// "Escort A", "Escort B"…: letters for each type a side has more than one of (in deploy order).
function assignLetters(units) {
  const groups = {};
  for (const u of units) (groups[`${u.faction}|${u.type}`] ||= []).push(u);
  for (const g of Object.values(groups)) g.forEach((u, i) => { u.letter = g.length > 1 ? String.fromCharCode(65 + i) : ''; });
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
  const people = Object.fromEntries(players.map((p) => [p.id, { ...p }]));
  const order = players.map((p) => p.id);
  // Battle size (Small / Medium / Large): sets the points, the ship cap and the map. Until someone
  // picks one on the TV, it follows the number of players.
  let size = sizeForPlayers(order.length);
  let sizePicked = false;
  let scenario, map, asteroids, stars, rockShapes;

  // Builds the map for the current size: scaled-up map and asteroid field, new random asteroids.
  function buildScenario() {
    const base = SCENARIOS.m1;
    const sz = sizeRules(size);
    const kx = sz.map.w / base.map.w, ky = sz.map.h / base.map.h;
    const f = base.asteroidField;
    const field = {
      ...f,
      count: f.count.map((n) => Math.round(n * sz.mult)),
      area: { x0: f.area.x0 * kx, x1: f.area.x1 * kx, y0: f.area.y0 * ky, y1: f.area.y1 * ky },
    };
    scenario = { ...base, map: { ...sz.map }, asteroidField: field, asteroids: rollAsteroids(field) };
    map = scenario.map;
    asteroids = scenario.asteroids;
    stars = Array.from({ length: Math.round(260 * sz.mult) }, () => ({
      x: Math.random() * map.w, y: Math.random() * map.h, r: Math.random() * 1.3 + 0.3, a: Math.random() * 0.6 + 0.2,
    }));
    rockShapes = asteroids.map((r) => Array.from({ length: 13 }, (_, i) => {
      const a = (i / 13) * Math.PI * 2;
      const k = 0.9 + Math.random() * 0.15;
      return [r.x + Math.cos(a) * r.r * k, r.y + Math.sin(a) * r.r * k];
    }));
  }
  buildScenario();
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
  let holdPlans = {}; // playerId -> { shipId: Smuggler's Hold choice { target, kind } }
  let critPlans = {}; // playerId -> { shipId: critical system id } (Seir-Seir picks the critical)
  let rotatePlans = {}; // playerId -> { shipId: clicks } (Kairos turns before shooting)
  let fivePlans = {}; // playerId -> { shipId: "arc:index" } (Flerf's Five Arms: that weapon fires twice)
  let mines = []; // [{ id, x, y }] dropped by Mine Drop (neutral)
  // Missiles in flight: { id, kind: 'missile', owner, faction, from (launcher id), target (ship id),
  // x, y, alive, fresh (launched this round) }.
  let missiles = [];
  let missileCount = 0;
  // Kaj'ik's decoys: { id, kind: 'decoy', owner, faction, from (Firefly id), x, y, alive }.
  let decoys = [];
  let decoyCount = 0;
  let decoyPlans = {}; // playerId -> { shipId: true } (deploy the Decoy Beacon this round)
  let mineCount = 0;
  let anim = null;
  let rollData = null; // Roll Dice phase: the attacks already rolled, waiting to be shown
  let rolled = {}; // playerId -> true once their phone has shown its dice
  let teleport = null; // Teleport phase: { ids: [ship ids], plans: { shipId: { x, y, heading } }, done: { shipId: true } }
  let rollPublic = null; // the dice rows phones show (kept through the Fire animation)
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
  // Ships, squadrons, missiles or decoys (missiles and decoys are never targets of normal weapons).
  const anyUnit = (id) => unitById(id) || missiles.find((m) => m.id === id) || decoys.find((d) => d.id === id);
  const anyName = (u) => (u?.kind === 'missile' ? `${u.weapon === 'cycloneLauncher' ? 'Cyclone missile' : 'Missile'} from ${unitName(unitById(u.from))}`
    : u?.kind === 'decoy' ? 'Decoy' : unitName(u));
  // Kaj'ik's decoy (alive, same side) within close range of `ship`, or null: it draws enemy missiles
  // and squadrons attacking that ship.
  const decoyNear = (ship) => decoys.find((d) => d.alive && d.faction === ship.faction
    && pointPolygonDistance(d.x, d.y, shipPolygon(ship)) <= RANGE_CLOSE) || null;
  // How far a missile is from its target (a ship's hull, or a decoy's spot).
  const targetDistance = (m, t) => (t.kind === 'decoy' ? Math.hypot(t.x - m.x, t.y - m.y) : missileDistance(m, t));
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
  const shareOf = (id) => pointShare(playersOn(teams[id]).length, sizeRules(size).sidePoints);
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
      const share = pointShare(playersOn(f).length, sizeRules(size).sidePoints);
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
    if (!['planMove', 'planFire', 'roll', 'teleport'].includes(phase)) return null;
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
      size,
      sidePoints: sizeRules(size).sidePoints,
      maxShips: sizeRules(size).maxShips,
      fleets: phase === 'setup' ? Object.fromEntries(order.map((id) => [id, fleets[id] || []])) : null,
      surrender: { ...surrender },
      map,
      asteroids,
      mines: mines.map((m) => ({ ...m })),
      missiles: missiles.filter((m) => m.alive).map((m) => ({ id: m.id, owner: m.owner, faction: m.faction, target: m.target, x: m.x, y: m.y })),
      decoys: decoys.filter((d) => d.alive).map((d) => ({ id: d.id, owner: d.owner, faction: d.faction, x: d.x, y: d.y })),
      factions: battleFactions,
      people: Object.fromEntries(order.map((id) => [id, { name: nameOf(id), color: colorOf(id) }])),
      teams: { ...teams },
      ready: { ...ready },
      problems: phase === 'setup' ? setupProblems() : [],
      ships: (phoneShips || ships).map(publicShip),
      squads: (phoneSquads || squads).map(publicSquad),
      kills: { ...kills },
      roll: phase === 'roll' || phase === 'fire' ? rollPublic : null,
      teleport: phase === 'teleport' ? { ids: [...teleport.ids], done: { ...teleport.done } } : null,
      rolled: { ...rolled },
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
      if (!f || buyProblem(msg.shipType, f, mine, shareOf(id), teamShipCount(f), sizeRules(size).maxShips)) return;
      fleets[id] = [...mine, { type: msg.shipType, wing: [], captain: null, wingCaptains: [], mods: [] }];
      delete ready[id];
    } else if (msg.type === 'mod') {
      // Customization (UPGRADES) on one ship: on = fit it, off = remove it. Removing a hangar also
      // drops the squadrons that no longer fit.
      const mine = fleets[id] || [];
      const i = Number(msg.index);
      const e = mine[i];
      if (!e || !upgradeChoices(e.type).includes(msg.mod)) return;
      if (msg.on && upgradeProblem(msg.mod, mine, i, shareOf(id))) return;
      const mods = msg.on ? [...(e.mods || []), msg.mod] : (e.mods || []).filter((m) => m !== msg.mod);
      const slots = carrierSlots(e.type, mods);
      fleets[id] = mine.map((x, j) => (j === i ? { ...x, mods, wing: x.wing.slice(0, slots), wingCaptains: (x.wingCaptains || []).slice(0, slots) } : x));
      delete ready[id];
    } else if (msg.type === 'captain' || msg.type === 'squadCaptain') {
      // Captain upgrade on a ship (or one squadron of a carrier); captain null = dismiss.
      const mine = fleets[id] || [];
      const i = Number(msg.index);
      const squad = msg.type === 'squadCaptain';
      const k = squad ? Number(msg.slot) : null;
      const e = mine[i];
      if (!e || (squad && !(Number.isInteger(k) && e.wing[k]))) return;
      if (msg.captain && captainProblem(msg.captain, mine, i, shareOf(id), k)) return;
      const cap = msg.captain || null;
      fleets[id] = mine.map((x, j) => {
        if (j !== i) return x;
        if (!squad) return { ...x, captain: cap };
        const wc = x.wing.map((_, m) => (m === k ? cap : x.wingCaptains?.[m] || null));
        return { ...x, wingCaptains: wc };
      });
      delete ready[id];
    } else if (msg.type === 'buySquad') {
      // Squadrons fill a carrier the player owns (rules §1).
      const f = teams[id];
      const mine = fleets[id] || [];
      const i = Number(msg.index);
      if (!f || !Number.isInteger(i) || squadBuyProblem(msg.squadType, f, mine, i, shareOf(id))) return;
      fleets[id] = mine.map((e, j) => (j === i ? { ...e, wing: [...e.wing, msg.squadType], wingCaptains: [...e.wing.map((_, m) => e.wingCaptains?.[m] || null), null] } : e));
      delete ready[id];
    } else if (msg.type === 'removeSquad') {
      const mine = fleets[id] || [];
      const i = Number(msg.index), k = Number(msg.slot);
      if (!mine[i] || !Number.isInteger(k) || k < 0 || k >= mine[i].wing.length) return;
      fleets[id] = mine.map((e, j) => (j === i ? {
        ...e, wing: e.wing.filter((_, m) => m !== k), wingCaptains: e.wing.map((_, m) => e.wingCaptains?.[m] || null).filter((_, m) => m !== k),
      } : e));
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

  // Battle size: changes points, ship cap and the map. Fleets over the new budget must shrink.
  function pickSize(id) {
    if (phase !== 'setup' || !BATTLE_SIZES.some((s) => s.id === id)) return;
    sizePicked = true;
    if (id === size) return;
    size = id;
    buildScenario();
    resize();
    recheckBudgets();
    renderSetup();
    pushState();
  }

  function renderSetup() {
    const problems = setupProblems();
    overlay.className = 'sb-overlay show';
    overlay.innerHTML = `
      <div class="sb-panel sb-setup">
        <p class="eyebrow">Space Battles · ${escapeHtml(scenario.name)}</p>
        <div class="sb-missions sb-sizes">
          ${BATTLE_SIZES.map((s) => {
            const r = sizeRules(s.id);
            return `
            <button data-size="${s.id}" class="${s.id === size ? 'on' : ''}">
              <b>${escapeHtml(s.name)}</b><small>${escapeHtml(s.label)} · ${r.sidePoints} points per side · ${s.map.w}×${s.map.h} map</small>
            </button>`;
          }).join('')}
        </div>
        <div class="sb-missions">
          ${MISSIONS.map((m) => `
            <button data-mission="${m.id}" class="${m.id === mission ? 'on' : ''}" ${m.available ? '' : 'disabled'}>
              <b>${escapeHtml(m.name)}</b><small>${m.available ? escapeHtml(m.desc) : 'Coming soon'}</small>
            </button>`).join('')}
        </div>
        <h2>Pick a side and build your fleet on your phone</h2>
        <p class="muted">Each side gets ${sizeRules(size).sidePoints} points, split evenly between its players. Up to ${sizeRules(size).maxShips} ships per side.</p>
        <div class="sb-factions">
          ${FACTION_ORDER.map((f) => {
            const fd = FACTIONS[f];
            const ps = playersOn(f);
            const share = pointShare(ps.length, sizeRules(size).sidePoints);
            return `
              <div class="sb-faction ${fd.available ? '' : 'soon'}" style="--fc:${fd.color}">
                <h3>${escapeHtml(fd.name)}</h3>
                ${fd.available ? `<p class="muted">${escapeHtml(fd.blurb)}</p>` : ''}
                ${fd.available ? `
                  ${ps.length ? `<p class="sb-share">${share} points each · ${teamShipCount(f)}/${sizeRules(size).maxShips} ships</p>` : ''}
                  <ul class="sb-plist">
                    ${ps.length ? ps.map((id) => {
                      const mine = fleets[id] || [];
                      return `<li><div class="sb-pname"><span class="dot" style="background:${colorOf(id)}"></span>${escapeHtml(nameOf(id))}
                        <span class="sb-pts ${overBudget(id) ? 'red' : ''}">${spentOf(id)}/${share}</span>
                        ${!online.has(id) ? '<em class="muted">offline</em>' : ready[id] ? '<b class="green">✔ Ready</b>' : ''}</div>
                        ${mine.length ? `<div class="sb-pships">${mine.map((e) => escapeHtml(SHIPS[e.type].short) + (e.mods || []).map((m) => ` ${UPGRADES[m].icon}`).join('') + capFace(e.captain) + (e.wing.length ? ` (${e.wing.map((q, k) => escapeHtml(SQUADRONS[q].short) + capFace(e.wingCaptains?.[k])).join(', ')})` : '')).join(' · ')}</div>` : ''}</li>`;
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
    overlay.querySelectorAll('[data-size]').forEach((b) => b.addEventListener('click', () => pickSize(b.dataset.size)));
  }

  function beginBattle() {
    battleFactions = FACTION_ORDER.filter((f) => playersOn(f).length > 0);
    ships = [];
    const wings = [];
    for (const id of order) {
      if (!battleFactions.includes(teams[id])) continue;
      for (const e of fleets[id] || []) {
        const s = makeShip(`s${ships.length + 1}`, e.type, id, e.captain, e.mods);
        ships.push(s);
        if (e.wing.length) wings.push([s, e.wing, e.wingCaptains || []]);
      }
    }
    deploy(ships, battleFactions, scenario); // players in join order, each player's ships together
    squads = [];
    let qn = 0;
    for (const [s, types, caps] of wings) squads.push(...makeSquads(s, types, () => `q${++qn}`, caps));
    assignLetters(ships);
    assignLetters(squads);
    kills = Object.fromEntries(battleFactions.map((f) => [f, 0]));
    mines = [];
    missiles = [];
    decoys = [];
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
      if (s.hull <= maxHull(s) / 2) { s.homeUsed = true; s.burnRound = round + 1; }
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
        // Criticals caught last round now take effect (Hull Fire).
        for (const c of s.crits || []) delete c.fresh;
        delete s.lastStand; // Too Stubborn to Die only shields the ship for the round it happened
      }
      repairPlans = {};
      holdPlans = {};
      critPlans = {};
      rotatePlans = {};
      fivePlans = {};
      decoyPlans = {};
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
    // A draft (ready: false, draft: true) is the phone's latest unsent choices: it's stored and
    // used if the timer runs out before the player taps Send, but the player isn't marked ready.
    if (msg.draft && ready[id]) return;
    if (!msg.ready && !msg.draft) {
      // "Change orders": no longer ready, but the plan stays as a draft in case time runs out.
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
        ? sanitizeMovePlan(s, p, ships, squads) || defaultMovePlan(s)
        : sanitizeFirePlan(rotatedShip(s, sanitizeRotate(s, msg.rotates?.[s.id])), p, units(), asteroids);
    }
    store[id] = plans;
    if (kind === 'planFire') {
      repairPlans[id] = {};
      holdPlans[id] = {};
      critPlans[id] = {};
      rotatePlans[id] = {};
      fivePlans[id] = {};
      decoyPlans[id] = {};
      for (const s of mine) {
        // Flerf's Five Arms: the weapon ("arc:index") that fires twice this round.
        const fk = msg.fiveArms?.[s.id];
        const aimed = plans[s.id].some((a) => Object.keys(a.targets).some((wi) => weaponKey(a.arc, wi) === fk));
        if (captainOf(s)?.fiveArms && aimed) fivePlans[id][s.id] = fk;
        // Kaj'ik: drop the Decoy Beacon this round (once per game).
        if (captainOf(s)?.decoy && !s.decoyUsed && msg.decoys?.[s.id]) decoyPlans[id][s.id] = true;
        const r = sanitizeRepair(s, msg.repairs?.[s.id]);
        if (r) repairPlans[id][s.id] = r;
        const h = sanitizeHold(s, msg.holds?.[s.id], ships);
        if (h) holdPlans[id][s.id] = h;
        const cp = msg.critPicks?.[s.id];
        if (captainOf(s)?.pickCrit && CRIT_POOL.includes(cp)) critPlans[id][s.id] = cp;
        const rot = sanitizeRotate(s, msg.rotates?.[s.id]);
        if (rot) rotatePlans[id][s.id] = rot;
      }
    }
    if (msg.draft) return;
    ready[id] = true;
    pushState();
    checkAllReady();
  }

  function checkAllReady() {
    if (phase === 'roll') { checkAllRolled(); return; }
    if (phase === 'teleport') { checkTeleportDone(); return; }
    if (phase !== 'planMove' && phase !== 'planFire') return;
    const req = required();
    if (req.length && req.every((id) => ready[id])) endPlan();
  }

  function endPlan() {
    if (phase === 'planMove') resolveMove();
    else if (phase === 'planFire') startRoll();
  }

  // ---------- Move ----------
  function resolveMove() {
    const plans = {};
    const t0 = now();
    phoneShips = ships.map(clone);
    phoneSquads = squads.map(cloneSquad);
    const pending = [];
    const fx = [];
    const stanceKills = new Set(); // ships destroyed by their own Violent Turn
    for (const s of ships) {
      if (!s.alive) continue;
      // Sent orders, else the phone's latest draft (timer ran out), else fly straight.
      plans[s.id] = movePlans[s.owner]?.[s.id] || defaultMovePlan(s);
      // Reveal the stance: it lasts the whole round.
      s.stance = plans[s.id].stance;
      const st = STANCES[s.stance.id];
      s.tempShields = {};
      // Shield Boost: +2 on one side, up to 2 over max. What's over max is lost at the end of next round.
      if (st.boostShields) {
        const z = s.stance.zone;
        const gain = Math.max(0, Math.min(st.boostShields, boostCap(s, z) - s.shields[z]));
        s.shields[z] += gain;
        s.boost = { zone: z, until: round + 1 };
        if (gain) pending.push({ at: t0 + 200, shipId: s.id, zone: z, shieldLost: -gain, hullLost: 0 });
      }
      // Violent Turn: 1 hull damage (ignores shields) before moving.
      if (st.selfDamage) {
        const d = applyHullDamage(s, st.selfDamage);
        pending.push({ at: t0 + 200, ...d });
        if (s.hull <= 0) { s.alive = false; stanceKills.add(s.id); credit(s); delete plans[s.id]; }
      }
    }
    // New squadron orders, one per squadron (kept on a timeout).
    const newOrders = {};
    for (const s of ships) {
      if (s.alive && plans[s.id].squads && isCarrier(s)) Object.assign(newOrders, plans[s.id].squads);
    }
    const res = simulateMove(ships, plans, { ...scenario, mines });
    const before = new Set(ships.filter((s) => s.alive).map((s) => s.id));
    ships = ships.map((s) => res.ships.find((r) => r.id === s.id) || s);
    // Mal Reynolds survived a deadly crash or mine with 1 hull.
    for (const s of ships) if (s.lastStand) fx.push({ at: t0 + TIMING.moveMs - 300, x: s.x, y: s.y, kind: 'stand' });
    // Mines: the ones set off are gone; Mine Drop leaves a new one behind each ship that used it.
    const minesBefore = mines.map((m) => ({ ...m, hitAt: res.minesHit.find((h) => h.id === m.id)?.tick }));
    mines = mines.filter((m) => !res.minesHit.some((h) => h.id === m.id));
    const newMines = new Set();
    for (const s of ships) {
      if (!s.alive || !plans[s.id].mine) continue;
      s.specialUsed = (s.specialUsed || 0) + 1;
      const m = { id: `m${++mineCount}`, ...mineSpot(s, map) };
      mines.push(m);
      newMines.add(m.id);
    }
    for (const s of ships) if (!s.alive && before.has(s.id)) credit(s);
    // Burn, Disruptor and Grapple effects only last for this one move.
    for (const s of ships) { s.burn = false; s.disrupted = false; s.grappled = false; }
    checkHome(ships);
    // Squadrons (rules §8): new orders apply, docked squadrons with a launch order appear next to
    // their carrier, and squadrons docked in a carrier destroyed during the Move are lost with it.
    squads = squads.map(cloneSquad);
    const launched = new Set();
    for (const q of squads) {
      if (!q.alive) continue;
      if (newOrders[q.id]) q.order = { ...newOrders[q.id] };
      if (!q.docked) continue;
      const c = shipById(q.carrier);
      if (!c?.alive) { q.alive = false; credit(q); continue; }
      if (SQUAD_ORDERS[q.order.order].launches) {
        Object.assign(q, launchSpot(c, q.slot, map));
        q.docked = false;
        launched.add(q.id);
      } else { q.x = c.x; q.y = c.y; }
    }
    // Then they move after the ships (rules §6). Return squadrons that reach their carrier dock,
    // and Boarding Pods check whether they latched on.
    const squadPaths = planSquadMoves(squads, ships, map);
    const docking = new Set();
    for (const q of squads) {
      const p = squadPaths[q.id];
      if (p) { q.x = p.to.x; q.y = p.to.y; }
      if (q.alive && !q.docked && q.order.order === 'return' && canDock(q, ships)) {
        q.docked = true;
        q.order = { order: 'docked' };
        q.spent = false; // Bombers re-arm when they dock (they may launch again next round)
        docking.add(q.id);
      }
      q.latched = latchTarget(q, ships)?.id || null;
    }
    const squadMs = Object.keys(squadPaths).length ? TIMING.squadMoveMs : 0;
    for (const ev of res.events) {
      const at = t0 + (ev.tick / MOVE_TICKS) * TIMING.moveMs;
      fx.push({ at, x: ev.x, y: ev.y, ram: ev.ram, kind: ev.kind, thr: (ev.damage || []).some((d) => d.thrusterCrit) });
      for (const d of ev.damage) pending.push({ at, fromX: ev.x, fromY: ev.y, ...d });
    }
    anim = {
      kind: 'move', start: t0, end: t0 + TIMING.moveMs + squadMs + 900, frames: res.frames, pending, fx, squadPaths,
      launched, docking, minesBefore, newMines,
      dying: new Set([...stanceKills, ...ships.filter((s) => !s.alive && before.has(s.id)).map((s) => s.id)]),
      dieAt: t0 + TIMING.moveMs + 100,
    };
    phase = 'move';
    pushState();
  }

  // ---------- Teleport (Xar Teleporter) ----------
  // After the Move: ships that used the Teleport stance this round get a spot picked on their
  // owner's phone (any free spot, any facing). The TV waits, then shows the jumps.
  function startTeleport() {
    const ids = ships.filter((s) => s.alive && s.stance?.id === 'teleport' && !s.teleportUsed).map((s) => s.id);
    if (!ids.length) { startPlan('planFire'); return; }
    teleport = { ids, plans: {}, done: {} };
    phase = 'teleport';
    phaseKey++;
    phaseEndsAt = now() + TIMING.teleportSeconds * 1000;
    pushState();
    checkTeleportDone();
  }

  // Phone: { type: 'teleport', round, shipId, x, y, heading, confirm }. Each tap is kept (used if
  // time runs out); Confirm locks it in.
  function teleportInput(id, msg) {
    if (phase !== 'teleport' || msg.round !== round) return;
    const s = shipById(msg.shipId);
    if (!s || s.owner !== id || !teleport.ids.includes(s.id) || teleport.done[s.id]) return;
    const pose = { x: Number(msg.x), y: Number(msg.y), heading: normAngle(Number(msg.heading)) };
    if (teleportProblem(s, pose, ships, asteroids, map)) return;
    teleport.plans[s.id] = pose;
    if (msg.confirm) teleport.done[s.id] = true;
    pushState();
    checkTeleportDone();
  }

  function checkTeleportDone() {
    if (phase !== 'teleport') return;
    if (teleport.ids.every((sid) => teleport.done[sid] || !online.has(shipById(sid).owner))) finishTeleport();
  }

  function finishTeleport() {
    const moves = {};
    for (const sid of teleport.ids) {
      const s = shipById(sid);
      s.teleportUsed = true; // the stance is used up even if no spot was picked
      const to = teleport.plans[sid];
      // Checked again: two teleporting ships can't land on each other.
      if (!to || teleportProblem(s, to, ships, asteroids, map)) continue;
      moves[sid] = { from: { x: s.x, y: s.y, heading: s.heading }, to };
      Object.assign(s, to);
    }
    teleport = null;
    const t0 = now();
    anim = { kind: 'warp', start: t0, end: t0 + TIMING.teleportMs, moves, dying: new Set(), dieAt: Infinity, pending: [], fx: [], tags: [], popups: [] };
    phase = 'warp';
    pushState();
  }

  // ---------- Fire ----------
  const d10 = () => 1 + Math.floor(Math.random() * HIT.die);

  // Rolls `shots` d10s needing `need`+ (a 10 always hits). Each hit records whether it was a
  // critical roll (`critOn`+, or never when `canCrit` is false). Returns { hits, crits: [bool per hit],
  // dice: [[roll, 'hit' | 'miss' | 'crit'] per shot] } (the dice are shown on the phones).
  function rollShots(shots, need, critOn, canCrit) {
    const crits = [], dice = [];
    for (let i = 0; i < shots; i++) {
      const r = d10();
      const hit = r >= need || r === HIT.die;
      const crit = hit && canCrit && r >= critOn;
      if (hit) crits.push(crit);
      dice.push([r, crit ? 'crit' : hit ? 'hit' : 'miss']);
    }
    return { hits: crits.length, crits, dice };
  }

  // One weapon's shots at one target (one "attack": all its hits add up). Every shot rolls a d10
  // (needToHit). Against a squadron: no crits, no special effects.
  function rollWeapon(s, t, w, shots = weaponShots(s, w)) {
    const wd = WEAPONS[w.weapon];
    const band = rangeBand(unitDistance(s, t));
    const sq = isSquad(t);
    const need = needToHit(s, wd, t, ships);
    // Auto-hit weapons (Disruptor) don't roll crits: every hit already causes a critical.
    const canCrit = !sq && !wd.pd && !wd.autoHit;
    const critOn = critOnOf(s, wd);
    const r = rollShots(shots, need, critOn, canCrit);
    return {
      band, shots, need, critOn: canCrit ? critOn : null, dice: r.dice, hits: r.hits, crits: r.crits, perHit: wd.damage, ignoreShields: !!wd.ignoreShields,
      effect: sq ? null : wd.effect || null, weapon: w.weapon,
    };
  }

  // A squadron's automatic attack: every living craft fires one shot. Only bombers crit (on a 10,
  // vs ships). Screen (no ship has it right now): −1 shot against screened ships.
  // `craft` = craft still flying when it fires (fewer if point-defense shot some down first).
  function rollSquad(q, t, craft = q.hull) {
    const def = squadDef(q);
    let shots = craft;
    const screen = !isSquad(t) && screened(t, ships);
    if (screen) shots = Math.max(0, shots - 1);
    // A decoy is as easy to hit as a cruiser (no agility).
    const need = t.kind === 'decoy' ? Math.max(2, HIT.base - accuracyOf(q, ships)) : needToHit(q, null, t, ships);
    const canCrit = !isSquad(t) && !!def.crit;
    const r = rollShots(shots, need, HIT.critOn, canCrit);
    return { band: 'close', shots, need, critOn: canCrit ? HIT.critOn : null, dice: r.dice, hits: r.hits, crits: r.crits, perHit: def.damage, ignoreShields: !!def.ignoreShields, effect: null, weapon: null, screen };
  }

  // Damages one of `ship`'s systems, picked at random among those not damaged yet (a repeat is
  // rerolled). Mutates the ship; returns the new critical, or null if every system is already
  // damaged. `fresh` = caught this round (Hull Fire starts burning next round).
  // `prefer` (Seir-Seir): the system to damage, if it isn't damaged already (else random).
  function addCrit(ship, prefer = null) {
    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    if (!ship.crits) ship.crits = [];
    const pool = CRIT_POOL.filter((id) => !ship.crits.some((c) => c.id === id));
    if (!pool.length) return null;
    const c = { id: pool.includes(prefer) ? prefer : pick(pool), fresh: true };
    if (c.id === 'weapons') {
      const def = shipDef(ship);
      const list = [];
      for (const arc of Object.keys(def.arcs)) def.arcs[arc].forEach((w, wi) => list.push({ arc, wi, weapon: w.weapon }));
      Object.assign(c, pick(list));
    }
    ship.crits.push(c);
    return c;
  }

  const critLabel = (c) => `${CRITICALS[c.id].name}${c.weapon ? ` (${WEAPONS[c.weapon].name})` : ''}`;

  // Plan Fire is over: every attack is rolled now (the TV stays the referee), then each phone shows
  // its own dice in the Roll Dice phase. Nothing is damaged until resolveFire().
  function startRoll() {
    // Kairos: ships turn in place first (their fire plans were checked with the new heading).
    const turned = [];
    for (const s of ships) {
      const rot = s.alive ? rotatePlans[s.owner]?.[s.id] : 0;
      if (!rot) continue;
      s.heading = rotatedShip(s, rot).heading;
      turned.push([s.id, rot]);
    }
    // Missiles whose target is gone fizzle out; the rest keep flying.
    missiles = missiles.filter((m) => m.alive && anyUnit(m.target)?.alive);
    for (const m of missiles) m.fresh = false;
    // Kaj'ik's Decoy Beacon: dropped where the Firefly is, before anything fires.
    decoys = decoys.filter((d) => d.alive);
    for (const s of ships) {
      if (!s.alive || s.decoyUsed || !captainOf(s)?.decoy || !decoyPlans[s.owner]?.[s.id]) continue;
      s.decoyUsed = true;
      decoys.push({ id: `d${++decoyCount}`, kind: 'decoy', owner: s.owner, faction: s.faction, from: s.id, x: s.x, y: s.y, alive: true, fresh: true });
    }
    const all = units();
    const attacks = [];
    const firstStrike = []; // point-defense shots at squadrons attacking that ship: they land first
    const mineDrops = []; // Mine-Layer: ships dropping a mine this round
    // Who each squadron attacks this round (decided before anything fires). A decoy within close
    // range of the ship it's attacking draws the attack instead.
    const squadTargets = {};
    for (const q of squads) {
      let t = q.alive ? squadAttackTarget(q, all) : null;
      if (t && !isSquad(t)) t = decoyNear(t) || t;
      if (t) squadTargets[q.id] = t;
    }
    for (const s of ships) {
      if (!s.alive) continue;
      const planned = firePlans[s.owner]?.[s.id]; // sent plan, or the latest draft on a timeout
      const plan = planned || defaultFirePlan(s, all, asteroids);
      // Flerf's Five Arms: the picked weapon fires once more; with no pick, the strongest one aimed.
      let five = null;
      if (captainOf(s)?.fiveArms) {
        five = fivePlans[s.owner]?.[s.id] || null;
        if (!five) {
          let best = -1;
          for (const a of plan) for (const wi of Object.keys(a.targets)) {
            const w = arcWeapons(s, a.arc)[wi];
            const v = w ? WEAPONS[w.weapon].damage * weaponShots(s, w) : -1;
            if (v > best) { best = v; five = weaponKey(a.arc, wi); }
          }
        }
      }
      for (const a of plan) {
        const weapons = arcWeapons(s, a.arc);
        for (const [wi, targetId] of Object.entries(a.targets)) {
          const w = weapons[wi];
          const t = unitById(targetId);
          if (!w || !t) continue;
          const onceKey = WEAPONS[w.weapon].once ? weaponKey(a.arc, wi) : null;
          // Exterminate / Reckless Attack / Five Arms: the weapon fires again (separate attacks).
          const extra = five === weaponKey(a.arc, wi) && !onceKey ? 1 : 0;
          for (let n = weaponRepeats(s, w) + extra; n > 0; n--) {
            const wd = WEAPONS[w.weapon];
            // Limited ammo (missiles, mines, the Cyclone volley): 1 use per firing.
            if (wd.ammo) {
              if (ammoLeft(s, wd.ammo) <= 0) break;
              s[wd.ammo] = ammoLeft(s, wd.ammo) - 1;
            }
            if (wd.layMine) {
              // Mine-Layer: the mine appears behind the ship when the shots land.
              mineDrops.push(s.id);
              attacks.push({ from: s.id, to: s.id, mineDrop: true, zone: null, shots: 0, dice: [], hits: 0, crits: [], need: 1, critOn: null, perHit: 0, weapon: w.weapon });
              continue;
            }
            if (wd.missile) {
              // Missile Launcher / Cyclone Launcher: launch `shots` missiles. They strike below.
              for (let k = 0; k < wd.shots; k++) {
                missiles.push({ id: `x${++missileCount}`, kind: 'missile', owner: s.owner, faction: s.faction, from: s.id, target: t.id, x: s.x, y: s.y, alive: true, fresh: true, damage: wd.damage, weapon: w.weapon });
              }
              continue;
            }
            attacks.push({ from: s.id, to: t.id, arc: a.arc, onceKey, zone: isSquad(t) ? null : zoneFacing(t, s.x, s.y), ...rollWeapon(s, t, w) });
          }
        }
      }
    }
    // Missiles within MISSILE.strike u of their target strike this round; the rest fly closer.
    // A decoy within close range of the ship a striking missile is after draws it instead.
    const striking = missiles.filter((m) => targetDistance(m, anyUnit(m.target)) <= MISSILE.strike);
    for (const m of striking) {
      const t = anyUnit(m.target);
      const d = t.kind !== 'decoy' && decoyNear(t);
      if (d) m.target = d.id;
    }
    // Point-defense fires on its own (free, not changed by stances or criticals). If squadrons or
    // missiles are attacking a ship, its shots are split between them (squadrons nearest first, then
    // missiles, taking turns) and land before they fire; otherwise all go at the nearest enemy
    // squadron in close range.
    for (const s of ships) {
      if (!s.alive || !shipDef(s).pd.length) continue;
      const attackers = squads.filter((q) => squadTargets[q.id]?.id === s.id);
      const pd = pdTargets(s, squads, attackers);
      const incoming = striking.filter((m) => m.target === s.id).sort((a, b) => missileDistance(a, s) - missileDistance(b, s));
      let targets, first;
      if (pd?.first || incoming.length) { targets = [...(pd?.first ? pd.targets : []), ...incoming]; first = true; }
      else if (pd) { targets = pd.targets; first = false; }
      else continue;
      for (const w of shipDef(s).pd) {
        const per = targets.map(() => 0);
        for (let k = 0; k < w.shots; k++) per[k % per.length]++;
        targets.forEach((t, j) => {
          if (!per[j]) return;
          if (t.kind === 'missile') {
            // One hit destroys a missile; it hits on HIT.base+ like point-defense against squadrons.
            const r = rollShots(per[j], HIT.base, HIT.critOn, false);
            firstStrike.push({ from: s.id, to: t.id, zone: null, pd: true, first: true, atMissile: true, band: 'close', shots: per[j], need: HIT.base, critOn: null, dice: r.dice, hits: r.hits, crits: r.crits, perHit: 1, ignoreShields: false, effect: null, weapon: w.weapon });
          } else (first ? firstStrike : attacks).push({ from: s.id, to: t.id, zone: null, pd: true, first, ...rollWeapon(s, t, w, per[j]) });
        });
      }
    }
    // Missile strikes: shot down by point-defense, or 2 damage that ignores shields (no roll).
    const downed = new Set(firstStrike.filter((a) => a.atMissile && a.hits > 0).map((a) => a.to));
    const missileMoves = {};
    for (const m of missiles) {
      const t = anyUnit(m.target);
      const wid = m.weapon || 'missileLauncher';
      if (striking.includes(m)) {
        const base = { from: m.id, to: t.id, missile: true, zone: t.kind === 'decoy' ? null : zoneFacing(t, m.x, m.y), band: 'close', need: 1, critOn: null, perHit: m.damage ?? WEAPONS[wid].damage, ignoreShields: true, effect: null, weapon: wid };
        attacks.push(downed.has(m.id)
          ? { ...base, shots: 0, lost: 1, dice: [], hits: 0, crits: [] }
          : { ...base, shots: 1, dice: [[HIT.die, 'hit']], hits: 1, crits: [false] });
        continue;
      }
      // Still too far: fly up to MISSILE.speed u straight at the target (stopping just short of it).
      const d = Math.hypot(t.x - m.x, t.y - m.y);
      const step = Math.min(MISSILE.speed, Math.max(0, d - 0.5));
      const to = d > 0 ? { x: m.x + ((t.x - m.x) / d) * step, y: m.y + ((t.y - m.y) / d) * step } : { x: m.x, y: m.y };
      missileMoves[m.id] = { from: { x: m.x, y: m.y }, to };
      const left = targetDistance({ ...m, ...to }, t);
      const rounds = left <= MISSILE.strike ? 1 : 1 + Math.ceil((left - MISSILE.strike) / MISSILE.speed);
      attacks.push({ from: m.id, to: t.id, missile: true, flight: rounds, zone: null, shots: 0, dice: [], hits: 0, crits: [], need: 1, critOn: null, perHit: 0, weapon: wid });
    }
    // Work out which attacking craft that point-defense shoots down before they can fire (same
    // order and rules as resolveFire, where these shots are also applied first).
    const left = Object.fromEntries(squads.map((q) => [q.id, cloneSquad(q)]));
    const dodged = new Set();
    for (const a of firstStrike) {
      if (a.atMissile) continue; // shots at missiles are handled with the missiles below
      const q = left[a.to];
      let hits = a.hits;
      if (hits > 0 && captainOf(q)?.ignoreFirstHit && !dodged.has(q.id)) { dodged.add(q.id); hits--; }
      applySquadHits(q, new Array(hits).fill(a.perHit), a.ignoreShields);
    }
    // Squadron attacks (automatic), by the craft still flying.
    for (const q of squads) {
      const t = squadTargets[q.id];
      if (!t) continue;
      const craft = Math.max(0, left[q.id].hull);
      attacks.push({ from: q.id, to: t.id, zone: isSquad(t) || t.kind === 'decoy' ? null : zoneFacing(t, q.x, q.y), lost: q.hull - craft, ...rollSquad(q, t, craft) });
    }
    attacks.unshift(...firstStrike);
    for (const a of attacks) a.color = diceColor(a.weapon, a.pd);
    // What the phones see: one row per weapon type, shooter and target (two Small Lasers on the same
    // ship at the same target share a row). Each phone shows only its owner's rows.
    const pub = [];
    const rowByKey = {};
    for (const a of attacks) {
      if (!a.shots && !a.lost && !a.flight && !a.mineDrop) continue;
      const from = anyUnit(a.from), to = anyUnit(a.to);
      const key = [a.from, a.to, a.weapon, a.pd, a.first, a.need, a.critOn].join('|');
      if (rowByKey[key]) { rowByKey[key].dice.push(...a.dice); continue; }
      pub.push(rowByKey[key] = {
        owner: from.owner, from: anyName(from), to: anyName(to),
        weapon: a.weapon ? WEAPONS[a.weapon].name : squadDef(from).weapon || 'Guns',
        kind: a.pd ? 'pd' : a.mineDrop ? 'mine' : a.missile ? 'missile' : isSquad(from) ? 'squad' : 'weapon', color: a.color,
        need: Math.min(HIT.die, a.need), critOn: a.critOn, dice: [...a.dice],
        first: !!a.first, lost: a.lost || 0, flight: a.flight || 0,
        oneRun: isSquad(from) && !isSquad(to) && !!squadDef(from).oneRun,
      });
    }
    // Squadrons that lost craft to point-defense before firing (missiles shot down are shown apart).
    const shotDown = Object.fromEntries(attacks.filter((a) => a.lost && !a.missile).map((a) => [a.from, a.lost]));
    rollData = { attacks: attacks.filter((a) => a.shots > 0), turned, shotDown, missileMoves, downed, striking: new Set(striking.map((m) => m.id)), mineDrops };
    rollPublic = { round, attacks: pub };
    rolled = {};
    // Players with nothing to roll don't hold anyone up.
    for (const id of order) if (!pub.some((r) => r.owner === id)) rolled[id] = true;
    phase = 'roll';
    phaseKey++;
    phaseEndsAt = now() + TIMING.rollSeconds * 1000;
    pushState();
    checkAllRolled();
  }

  function rolledInput(id, msg) {
    if (phase !== 'roll' || msg.round !== round || rolled[id]) return;
    rolled[id] = true;
    pushState();
    checkAllRolled();
  }

  function checkAllRolled() {
    if (phase !== 'roll') return;
    if (required().every((id) => rolled[id])) resolveFire();
  }

  function resolveFire() {
    const { attacks, turned, shotDown, missileMoves, downed, striking, mineDrops } = rollData;
    rollData = null;
    // All attacks land together on copies, so a ship destroyed now still fired.
    const next = ships.map(clone);
    const nextSquads = squads.map(cloneSquad);
    const nextById = Object.fromEntries([...next, ...nextSquads].map((u) => [u.id, u]));
    for (const a of attacks) if (a.onceKey) nextById[a.from].used[a.onceKey] = true;
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
    for (const [id, rot] of turned) tag(id, `⏳ Kairos turned ${rot < 0 ? 'left' : 'right'}`, '#8ce1ff', t0 + 100);
    // Point-defense that fired first: craft it shot down before they could attack.
    for (const [id, n] of Object.entries(shotDown)) tag(id, `🛡 ${n} shot down before firing`, '#ffd43b', t0 + 300);
    // Bombers (one run): after bombing a ship they're spent and must fly back to re-arm.
    for (const a of attacks) {
      const q = nextById[a.from];
      if (!isSquad(q) || !squadDef(q).oneRun || isSquad(nextById[a.to])) continue;
      q.spent = true;
      q.order = { order: 'return' };
      tag(q.id, '💣 Bombs away! Returning to re-arm', '#b197fc');
    }
    const grappledBy = {}; // target id -> first attacker that grappled it
    const shrugged = new Set(); // Iceman Flaggs squadrons that already ignored a hit this round
    for (const a of attacks) {
      if (a.atMissile) continue; // point-defense at a missile: already worked out in startRoll
      const target = nextById[a.to];
      if (!target) continue; // a decoy (handled below)
      if (isSquad(target)) {
        // Squadrons: each hit knocks off a craft's shield or destroys a craft (hull = craft).
        const shieldsBefore = target.shields;
        // Iceman Flaggs: the first hit on this squadron each round is ignored.
        let hits = a.hits;
        if (hits > 0 && captainOf(target)?.ignoreFirstHit && !shrugged.has(target.id)) {
          shrugged.add(target.id);
          hits--;
          tag(a.to, '🧊 Iceman dodged a hit', '#8ce1ff');
        }
        const d = applySquadHits(target, new Array(hits).fill(a.perHit), a.ignoreShields);
        a.shieldLost = d.shieldLost;
        a.hullLost = d.hullLost;
        pending.push({ at: landAt, shipId: target.id, zone: null, squadShieldLost: shieldsBefore - target.shields, shieldLost: 0, hullLost: d.hullLost });
        const p = perTarget[a.to] || (perTarget[a.to] = { shieldLost: 0, hullLost: 0 });
        p.shieldLost += d.shieldLost;
        p.hullLost += d.hullLost;
        continue;
      }
      // Mal Reynolds already survived a deadly hit this round (in the Move): no more damage.
      if (target.lastStand) {
        a.damage = 0; a.shieldLost = 0; a.hullLost = 0;
        tag(a.to, '🔨 Too stubborn to die: no damage', '#ffd43b');
        continue;
      }
      // Critical rolls: while the zone still has shields, the hit does double damage; once they're
      // gone (or for damage that ignores shields), it damages a system instead. Hits land in order,
      // shields first. Disruptor hits do no damage but each causes a critical hit.
      let shieldLeft = a.ignoreShields ? 0 : absorbableShields(target, a.zone);
      let total = 0, doubled = 0, critEffects = 0;
      for (const isCrit of a.crits) {
        let dmg = a.perHit;
        if (a.effect === 'crit') { critEffects++; continue; }
        if (isCrit && shieldLeft > 0) { dmg *= 2; doubled++; }
        else if (isCrit && a.effect !== 'ion') critEffects++;
        shieldLeft = Math.max(0, shieldLeft - dmg);
        total += dmg;
      }
      a.damage = total;
      const d = a.effect === 'ion'
        ? applyShieldDamage(target, a.zone, total)
        : a.ignoreShields ? { ...applyHullDamage(target, total), zone: a.zone, tempLost: 0 }
          : applyDamage(target, a.zone, total);
      a.shieldLost = d.shieldLost + d.tempLost;
      a.hullLost = d.hullLost;
      pending.push({ at: landAt, ...d });
      const p = perTarget[a.to] || (perTarget[a.to] = { shieldLost: 0, hullLost: 0 });
      p.shieldLost += d.shieldLost + d.tempLost;
      p.hullLost += d.hullLost;
      if (!a.hits) continue;
      if (doubled) tag(a.to, `CRIT ×2 vs shields${doubled > 1 ? ` (${doubled})` : ''}`, '#ffd43b');
      if (target.hull > 0) {
        if (a.effect === 'board') critEffects++; // Boarding Harpoon: a hit always causes 1 critical
        const shooter = ships.find((x) => x.id === a.from);
        const prefer = shooter && captainOf(shooter)?.pickCrit ? critPlans[shooter.owner]?.[shooter.id] : null;
        for (let i = 0; i < critEffects; i++) {
          const c = addCrit(target, prefer);
          tag(a.to, c ? `CRIT: ${critLabel(c)}` : 'CRIT: every system already damaged', '#ff8787');
        }
      }
      if (a.effect === 'acid') {
        target.acidDue[round + 1] = (target.acidDue[round + 1] || 0) + a.hits;
        tag(a.to, 'ACID', '#a9e34b');
      } else if (a.effect === 'disrupt') {
        target.disrupted = true;
        tag(a.to, 'DISRUPTED', '#ffe066');
      }
    }
    // Grappling Hook: the target is pulled toward the shooter whether or not the shot hit (the first
    // hook on a ship wins).
    for (const a of attacks) {
      const wd = a.weapon && WEAPONS[a.weapon];
      if (!wd?.pullAlways || grappledBy[a.to] || !nextById[a.to] || isSquad(nextById[a.to])) continue;
      grappledBy[a.to] = { from: a.from, pull: wd.pull };
      tag(a.to, '🪝 HOOKED', '#ffa94d');
    }
    // Kaj'ik's decoys: any hit destroys one.
    for (const a of attacks) {
      const d = decoys.find((x) => x.id === a.to);
      if (!d || !a.hits || !d.alive) continue;
      d.alive = false;
      tag(d.id, '📡 Decoy destroyed', '#ffd43b');
    }
    // Mine-Layer: each mine drops just behind its ship (if the ship survived).
    for (const sid of mineDrops) {
      const s = nextById[sid];
      if (!s || s.hull <= 0) continue;
      mines.push({ id: `m${++mineCount}`, ...mineSpot(s, map) });
      tag(sid, '💣 Mine laid', '#ced4da', t0 + 300);
    }

    // Mal Reynolds, Too Stubborn to Die: shot down to 0 hull → stays at 1, and nothing else hurts it
    // this round (no Hull Fire or acid below).
    for (const s of next) if (tryLastStand(s)) tag(s.id, '🔨 TOO STUBBORN TO DIE! (1 hull)', '#ffd43b');

    // Grapple pulls: each grappled ship that survived is pulled once, toward the first grappler.
    const pulls = {};
    for (const [id, hook] of Object.entries(grappledBy)) {
      const t = nextById[id];
      if (t.hull <= 0) continue;
      const g = ships.find((x) => x.id === hook.from);
      if (!g) continue;
      const live = next.filter((x) => x.hull > 0);
      const to = pullToward(t, g.x, g.y, hook.pull, live, scenario);
      if (Math.hypot(to.x - t.x, to.y - t.y) > 0.01) {
        pulls[id] = { from: { x: t.x, y: t.y }, to };
        t.x = to.x;
        t.y = to.y;
      }
    }

    // ----- End of round: Critical Repairs, Shield Boost running out, fires, acid. -----
    const acidAt = t0 + ACID_MS;
    let acidKill = false, endOfRound = false;
    for (const s of next) {
      if (s.hull <= 0 || !STANCES[s.stance?.id]?.repairCrit) continue;
      const fixed = applyRepair(s, repairPlans[s.owner]?.[s.id] || null);
      endOfRound = true;
      tag(s.id, `🔧 ${fixed ? `fixed ${CRITICALS[fixed].name}` : 'Nothing to repair'}`, '#8ce99a', acidAt);
    }
    // Shield Boost: shields above max are lost at the end of the round after the boost.
    for (const s of next) {
      if (!s.boost || s.boost.until !== round) continue;
      const z = s.boost.zone;
      const over = s.shields[z] - shipDef(s).shields[z];
      delete s.boost;
      if (s.hull <= 0 || over <= 0) continue;
      s.shields[z] -= over;
      endOfRound = true;
      pending.push({ at: acidAt, shipId: s.id, zone: z, shieldLost: over, hullLost: 0 });
      tag(s.id, `⚡ −${over} boosted shield${over > 1 ? 's' : ''} faded`, '#8ce1ff', acidAt);
    }
    // Samuel Verity: regain 1 shield (front, then the emptier side, then the rear).
    for (const s of next) {
      if (s.hull <= 0) continue;
      const z = regenZone(s);
      if (!z) continue;
      const gain = Math.min(captainOf(s).shieldRegen, shipDef(s).shields[z] - s.shields[z]);
      s.shields[z] += gain;
      endOfRound = true;
      pending.push({ at: acidAt, shipId: s.id, zone: z, shieldLost: -gain, hullLost: 0 });
      tag(s.id, `🛡 Verity: +${gain} ${z} shield`, '#8ce1ff', acidAt);
    }
    // Smuggler's Hold (once per game): +2 hull or remove a critical, on itself or a friendly ship
    // in close range. Only if the Free Trader survived the shooting.
    for (const s of next) {
      const h = holdPlans[s.owner]?.[s.id];
      const t = h && nextById[h.target];
      if (!h || s.hull <= 0 || !t || t.hull <= 0) continue;
      s.specialUsed = (s.specialUsed || 0) + 1;
      endOfRound = true;
      if (h.kind === 'hull') {
        const gain = Math.min(SPECIALS.smugglersHold.hull, maxHull(t) - t.hull);
        t.hull += gain;
        if (gain) pending.push({ at: acidAt, shipId: t.id, zone: null, shieldLost: 0, hullLost: -gain });
        tag(t.id, `📦 +${gain} hull`, '#8ce99a', acidAt);
      } else {
        const c = (t.crits || []).shift();
        tag(t.id, c ? `📦 fixed ${CRITICALS[c.id]?.name || 'a critical'}` : '📦 Nothing to fix', '#8ce99a', acidAt);
      }
    }
    // Hull Fire: 1 hull damage (caught before this round), ignoring shields. Jurddap is fireproof.
    for (const s of next) {
      if (!critCount(s, 'hull') || s.hull <= 0 || captainOf(s)?.fireproof || s.lastStand) continue;
      endOfRound = true;
      const d = applyHullDamage(s, CRITICALS.hull.burn);
      pending.push({ at: acidAt, ...d });
      tag(s.id, `🔥 −${d.hullLost} hull fire`, '#ffa94d', acidAt);
      if (s.hull <= 0) acidKill = true;
    }
    // Acid ignores shields.
    for (const s of next) {
      const due = s.acidDue[round];
      if (!due) continue;
      delete s.acidDue[round];
      if (s.hull <= 0 || s.lastStand) continue;
      endOfRound = true;
      const d = applyHullDamage(s, due);
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
      tag(t.id, `BOARDED!${c ? ` CRIT: ${critLabel(c)}` : ''}`, '#ff8787', acidAt);
      q.alive = false;
      boarded.add(q.id);
      endOfRound = true;
    }
    for (const q of nextSquads) q.latched = null;

    const dying = new Set();
    for (const u of [...next, ...nextSquads]) if (u.alive && u.hull <= 0) { u.alive = false; dying.add(u.id); credit(u); }
    // Squadrons still docked in a carrier destroyed this round are lost with it.
    for (const q of nextSquads) {
      if (!q.alive || !q.docked || !dying.has(q.carrier)) continue;
      q.alive = false;
      credit(q);
    }
    for (const c of next) {
      const lost = nextSquads.filter((q) => q.docked && q.carrier === c.id && !q.alive && squads.find((o) => o.id === q.id)?.alive).length;
      if (lost) tag(c.id, `✈ ${lost} docked squadron${lost > 1 ? 's' : ''} lost`, '#ff8787', (acidKill ? acidAt : landAt) + 700);
    }
    // Rzen: +1 hull (up to max) for each enemy this ship attacked this round that was destroyed
    // (its own missiles count).
    for (const s of next) {
      const heal = captainOf(s)?.killHeal;
      if (!heal || !s.alive || s.hull <= 0) continue;
      const mine = new Set(missiles.filter((m) => m.from === s.id).map((m) => m.id));
      const hitIds = new Set(attacks.filter((a) => a.from === s.id || mine.has(a.from)).map((a) => a.to));
      const kills = [...hitIds].filter((id) => dying.has(id)).length;
      const gain = Math.min(kills * heal, maxHull(s) - s.hull);
      if (gain <= 0) continue;
      s.hull += gain;
      pending.push({ at: (acidKill ? acidAt : landAt) + 800, shipId: s.id, zone: null, shieldLost: 0, hullLost: -gain });
      tag(s.id, `🐆 Rzen: +${gain} hull`, '#8ce99a', (acidKill ? acidAt : landAt) + 800);
    }
    phoneShips = ships.map(clone);
    phoneSquads = squads.map(cloneSquad);
    ships = next;
    squads = nextSquads;
    checkHome(ships);
    // Each die becomes one bolt on the TV; an attack's bolts leave one after another.
    const gap = attacks.length ? Math.min(220, 1000 / attacks.length) : 0;
    attacks.forEach((a, i) => {
      a.at = t0 + 200 + i * gap;
      const step = Math.min(90, 300 / Math.max(1, a.dice.length));
      a.bolts = a.dice.map(([, res], j) => ({ at: a.at + j * step, res, side: (j % 2 ? 1 : -1) * (0.9 + Math.random() * 0.8) }));
    });
    // Missiles: the ones that struck or were shot down vanish when their bolt (or the point-defense
    // bolt that got them) leaves; the rest fly on toward their target during the animation.
    const missileGoneAt = {};
    for (const a of attacks) {
      if (a.missile) missileGoneAt[a.from] = a.at;
      if (a.atMissile && a.hits > 0) missileGoneAt[a.to] = Math.min(missileGoneAt[a.to] ?? Infinity, a.at + BOLT_MS);
    }
    for (const m of missiles) {
      if (striking.has(m.id)) {
        m.alive = false;
        if (downed.has(m.id)) tag(m.id, '💥 Missile shot down', '#ffd43b', missileGoneAt[m.id] ?? landAt);
        if (missileGoneAt[m.id] === undefined) missileGoneAt[m.id] = t0 + 200;
      } else if (missileMoves[m.id]) Object.assign(m, missileMoves[m.id].to);
    }
    anim = {
      kind: 'fire', start: t0, end: t0 + TIMING.fireMs + (acidKill ? 900 : endOfRound ? 500 : 0), attacks, pending, landAt, dying,
      dieAt: (acidKill ? acidAt : landAt) + 700, pulls, tags, boarded, boardAt: acidAt,
      popups: Object.entries(perTarget).map(([shipId, p]) => ({ at: landAt, shipId, ...p })),
      missileMoves, missileGoneAt,
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

  // Hull left on a side's living ships (decides the winner after the last round).
  const hullLeft = (f, list = ships) => list.filter((s) => s.alive && s.faction === f).reduce((n, s) => n + Math.max(0, s.hull), 0);

  // After round FLEET.maxRounds: the side with the most hull left wins (a tie is a draw).
  function endByHull() {
    const hulls = battleFactions.map((f) => [f, hullLeft(f)]).sort((a, b) => b[1] - a[1]);
    const tie = hulls.length > 1 && hulls[0][1] === hulls[1][1];
    return endGame(tie ? null : hulls[0][0], `Time's up after ${FLEET.maxRounds} rounds: ${tie ? 'equal hull left' : 'most hull left'}`);
  }

  // ---------- Surrender (rules §1) ----------
  // A team surrenders once every online teammate has tapped Surrender (taps can be taken back).
  const battleRunning = () => ['intro', 'planMove', 'move', 'teleport', 'warp', 'planFire', 'roll', 'fire'].includes(phase);

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
              <h3 style="color:${FACTIONS[f].color}">${escapeHtml(FACTIONS[f].short)} <small class="muted">${hullLeft(f)} hull left</small></h3>
              <ul>
                ${ships.filter((s) => s.faction === f).map((s) => `
                  <li><span class="dot" style="background:${colorOf(s.owner)}"></span>${escapeHtml(unitName(s))}
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
    } else if (phase === 'teleport' && t >= phaseEndsAt) {
      finishTeleport();
    } else if (phase === 'warp' && t >= anim.end) {
      anim = null;
      startPlan('planFire');
    } else if (phase === 'roll' && t >= phaseEndsAt) {
      resolveFire();
    } else if (phase === 'move' && t >= anim.end) {
      anim = null;
      phoneShips = null;
      phoneSquads = null;
      if (!checkWinner()) startTeleport();
    } else if (phase === 'fire' && t >= anim.end) {
      anim = null;
      phoneShips = null;
      phoneSquads = null;
      if (!checkWinner()) {
        if (round >= FLEET.maxRounds) endByHull();
        else {
          round++;
          startPlan('planMove');
        }
      }
    }
  }

  // ---------- Drawing ----------
  let lastHud = '';
  function drawHud() {
    const s = secondsLeft();
    const timer = s === null ? '' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    const phaseText = phase === 'setup' ? 'Fleet Setup'
      : phase === 'over' ? 'Battle over' : `Round ${Math.max(1, round)}/${FLEET.maxRounds} · ${PHASE_NAMES[phase]}`;
    let sub = '';
    if (phase !== 'setup') {
      const teamsHtml = battleFactions.map((f) => `<span style="color:${FACTIONS[f].color}">${escapeHtml(FACTIONS[f].short)} ${hullLeft(f, phoneShips || ships)}</span>`).join(' <span class="muted">vs</span> ');
      let chips = '';
      if (phase === 'planMove' || phase === 'planFire' || phase === 'roll') {
        const done = phase === 'roll' ? rolled : ready;
        chips = order.filter((id) => shipsOf(id).length).map((id) => {
          const st = !online.has(id) ? 'off' : done[id] ? 'ready' : '';
          return `<span class="sb-chip ${st}"><span class="dot" style="background:${colorOf(id)}"></span>${escapeHtml(nameOf(id))}${st === 'ready' ? ' ✔' : st === 'off' ? ' (offline)' : ''}</span>`;
        }).join('');
      }
      sub = `<div class="sb-fleetvals">Hull left: ${teamsHtml}</div><div class="sb-chips">${chips}</div>`;
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
  const BOLT_MS = 380; // how long one laser bolt takes to reach its target
  const BOLT_TAIL = 0.9; // after arriving, the impact flash lasts this share of BOLT_MS

  // A missile: a small red dart pointing at its target, with a short glowing trail.
  function drawMissile(m, t) {
    const S = scale;
    const p = poseOf(m, t);
    const tg = unitById(m.target);
    const ang = p.heading ?? (tg ? Math.atan2(tg.y - p.y, tg.x - p.x) : 0);
    const x = p.x * S, y = p.y * S, L = Math.max(7, S * 0.45);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.strokeStyle = 'rgba(255,169,77,.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-L * 0.6, 0);
    ctx.lineTo(-L * (1.4 + 0.3 * Math.sin(t / 80)), 0);
    ctx.stroke();
    ctx.fillStyle = '#ff6b6b';
    ctx.shadowColor = '#ff6b6b';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(L * 0.6, 0);
    ctx.lineTo(-L * 0.6, -L * 0.3);
    ctx.lineTo(-L * 0.4, 0);
    ctx.lineTo(-L * 0.6, L * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = colorOf(m.owner);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, L * 0.75, 0, Math.PI * 2);
    ctx.stroke();
  }

  function poseOf(s, t) {
    if (s.kind === 'missile') {
      // Missiles that keep flying move toward their target during the Fire animation.
      const mv = anim?.kind === 'fire' && anim.missileMoves?.[s.id];
      if (!mv) return s;
      const u = Math.min(1, Math.max(0, (t - anim.start) / FIRE_LAND_MS));
      return { x: mv.from.x + (mv.to.x - mv.from.x) * u, y: mv.from.y + (mv.to.y - mv.from.y) * u, heading: Math.atan2(mv.to.y - mv.from.y, mv.to.x - mv.from.x) };
    }
    if (isSquad(s)) {
      // Squadrons fly after the ships have finished moving.
      const p = anim?.kind === 'move' && anim.squadPaths[s.id];
      if (!p) return s;
      const u = Math.min(1, Math.max(0, (t - anim.start - TIMING.moveMs) / TIMING.squadMoveMs));
      return { x: p.from.x + (p.to.x - p.from.x) * u, y: p.from.y + (p.to.y - p.from.y) * u };
    }
    // Teleport: the ship stays put for the first half of the jump, then appears at its new spot.
    const warp = anim?.kind === 'warp' && anim.moves[s.id];
    if (warp) return t < anim.start + (anim.end - anim.start) / 2 ? warp.from : warp.to;
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
    let craftShields = s.shields; // squadrons: number of craft with a shield
    const sh = { ...s.shields };
    const temp = { ...(s.tempShields || {}) };
    if (anim) {
      for (const p of anim.pending) {
        if (p.shipId !== s.id || p.at <= t) continue;
        hull += p.hullLost;
        if (isSquad(s)) craftShields += p.squadShieldLost || 0;
        else if (p.zone) { sh[p.zone] += p.shieldLost; temp[p.zone] = (temp[p.zone] || 0) + (p.tempLost || 0); }
      }
    }
    return { hull, sh, temp, craftShields };
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
    const sprite = spriteCanvas(s.type);
    if (sprite) {
      // Pixel-art sprite (drawn nose up, so turn it a quarter so the nose points along the heading).
      // The glow in the player's color shows whose ship it is.
      const px = (cls.length * S * 1.1 * spriteSize(s.type)) / sprite.height;
      ctx.save();
      ctx.rotate(Math.PI / 2);
      ctx.imageSmoothingEnabled = false;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      const w = sprite.width * px, h = sprite.height * px;
      ctx.drawImage(sprite, -w / 2, -h / 2, w, h);
      ctx.restore();
    } else {
      // No sprite yet (Pirates): the old outline shape.
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
    }

    // Shield marks: one thin arc per shield point in each 90° zone.
    // Gold marks = Shield Boost's shields above max (lost at the end of next round). While the
    // Shield Generator is damaged, every zone is drawn faint and dashed (the shields count as 0).
    const { hull, sh, temp } = shownStats(s, t);
    const R = (cls.length / 2) * S * (sprite ? Math.max(1, 1.1 * spriteSize(s.type)) : 1) + 6;
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
        const over = i < tn || i - tn >= def.shields[z];
        ctx.strokeStyle = off ? 'rgba(140,225,255,.25)' : over ? 'rgba(255,212,59,.95)' : 'rgba(140,225,255,.85)';
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
    const frac = Math.max(0, hull / maxHull(s));
    ctx.fillStyle = frac > 0.5 ? '#51cf66' : frac > 0.25 ? '#fcc419' : '#ff6b6b';
    ctx.fillRect(cx - barW / 2, by, barW * frac, 5);
    const burnTag = phase === 'planMove' ? `${s.recover ? ' 🛟' : ''}${s.burn ? ' 🚀' : ''}${s.disrupted ? ' ⚡' : ''}${s.grappled ? ' ⚓' : ''}` : '';
    // Squadrons docked inside (✈2). While ships are still moving, the count from before the launch.
    const sqList = anim?.kind === 'move' && t < anim.start + TIMING.moveMs && phoneSquads ? phoneSquads : squads;
    const docked = isCarrier(s) ? sqList.filter((q) => q.alive && q.docked && q.carrier === s.id).length : 0;
    const nm = `${unitName(s)}${captainOf(s) ? ` ${captainOf(s).icon}${captainOf(s).short}` : ""}`;
    label(`${s.owner ? `${nm} · ${nameOf(s.owner)}` : nm}${docked ? ` ✈${docked}` : ''}${burnTag}`, cx, cy - R - 10, color, Math.max(11, S * 0.42));
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
      const text = `${s.stance.wild ? `${STANCES.wild.icon} ${STANCES.wild.name} + ` : ""}${st.icon} ${st.name}${s.stance.zone ? ` (${s.stance.zone})` : ''}`;
      label(text, cx, cy - R - 10 - Math.max(12, S * 0.5), s.stance.id === 'balanced' && !s.stance.wild ? 'rgba(220,220,240,.6)' : '#ffd43b', Math.max(10, S * 0.38));
    }
    ctx.restore();
  }

  // Where each craft of a squadron is drawn, around the squadron's center (in u).
  function craftSpots(n) {
    if (n <= 1) return [[0, 0]];
    const out = [];
    const inner = n > 5 ? 1 : 0;
    if (inner) out.push([0, 0]);
    const ring = n - inner;
    const r = SQUAD_R * 0.62;
    for (let i = 0; i < ring; i++) {
      const a = (i / ring) * Math.PI * 2 - Math.PI / 2;
      out.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return out;
  }

  // A squadron: one small pixel sprite per craft, glowing in its player's color (a circle if the
  // squadron has no sprite). Craft that still have their shield get a light-blue ring; craft
  // already lost are left out.
  const squadFacing = {}; // squadron id -> angle it last flew (radians)
  function drawSquad(q, t) {
    const S = scale;
    const p = poseOf(q, t);
    const def = squadDef(q);
    const color = colorOf(q.owner);
    let alpha = 1;
    if (!q.alive && anim?.dying.has(q.id) && t > anim.dieAt) alpha = Math.max(0, 1 - (t - anim.dieAt) / 600);
    if (!q.alive && anim?.boarded?.has(q.id) && t > anim.boardAt) alpha = Math.max(0, 1 - (t - anim.boardAt) / 500);
    if (anim?.kind === 'move') {
      const sqStart = anim.start + TIMING.moveMs, sqEnd = sqStart + TIMING.squadMoveMs;
      if (anim.launched?.has(q.id) && t < sqStart) return; // still inside the carrier
      if (anim.docking?.has(q.id) && t > sqEnd) alpha = Math.max(0, 1 - (t - sqEnd) / 400); // docking
    }
    if (alpha <= 0) return;
    const cx = p.x * S, cy = p.y * S;
    const { hull, craftShields } = shownStats(q, t);
    const n = Math.max(1, hull);
    const spots = craftSpots(n);
    const kScale = Math.max(1, 15 / (SQUAD_R * S)); // keep the group readable when zoomed out
    const r = Math.max(3, SQUAD_R * S * (n > 4 ? 0.26 : 0.32) * kScale);
    // Craft face the way the squadron last flew (nose up until it has moved).
    const path = anim?.kind === 'move' && anim.squadPaths?.[q.id];
    if (path && Math.hypot(path.to.x - path.from.x, path.to.y - path.from.y) > 0.01) {
      squadFacing[q.id] = Math.atan2(path.to.y - path.from.y, path.to.x - path.from.x);
    }
    const facing = squadFacing[q.id] ?? -Math.PI / 2;
    const sprite = spriteCanvas(q.type);
    ctx.save();
    ctx.globalAlpha = alpha;
    spots.forEach(([ox, oy], i) => {
      const x = cx + ox * S * kScale, y = cy + oy * S * kScale;
      if (sprite) {
        ctx.save();
        // Damaged craft (Scavengers that have lost hull) are drawn faded.
        if (i >= hull - Math.min(hull, q.hurt || 0)) ctx.globalAlpha = alpha * 0.5;
        ctx.translate(x, y);
        ctx.rotate(facing + Math.PI / 2);
        ctx.imageSmoothingEnabled = false;
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
        const size = r * 2.4;
        ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
        ctx.restore();
        if (i < craftShields && hull > 0) {
          ctx.strokeStyle = 'rgba(140,225,255,.9)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(x, y, r * 1.2 + 2, 0, Math.PI * 2);
          ctx.stroke();
        }
        return;
      }
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = def.role === 'bomber' ? color : `${color}66`;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      if (i < craftShields && hull > 0) {
        ctx.strokeStyle = 'rgba(140,225,255,.9)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(x, y, r + 2.2, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  // A mine: a small spiked red ball with a blinking light.
  function drawMine(x, y, r, t) {
    ctx.save();
    ctx.strokeStyle = '#ff8787';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7);
      ctx.lineTo(x + Math.cos(a) * r * 1.35, y + Math.sin(a) * r * 1.35);
      ctx.stroke();
    }
    ctx.fillStyle = '#5c1f24';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = Math.floor(t / 500) % 2 ? '#ff6b6b' : '#ffd8d8';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
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
    const unit = isSquad(s) ? 'craft' : 'hull';
    if (hullLost) { label(hullLost < 0 ? `+${-hullLost} ${unit}` : `−${hullLost} ${unit}`, x, yy, hullLost < 0 ? '#8ce99a' : '#ff6b6b', size); yy -= size * 1.05; }
    if (shieldLost) label(shieldLost < 0 ? `+${-shieldLost} shield` : `−${shieldLost} shield`, x, yy, '#8ce1ff', size * 0.85);
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

    // Mines. During the Move: the old ones until they're set off; new drops appear after it.
    const moving = anim?.kind === 'move' && t < anim.start + TIMING.moveMs;
    const mineList = moving
      ? anim.minesBefore.filter((m) => m.hitAt === undefined || t < anim.start + (m.hitAt / MOVE_TICKS) * TIMING.moveMs)
      : mines;
    for (const m of mineList) drawMine(m.x * S, m.y * S, Math.max(5, S * 0.28), t);

    const visible = ships.filter((s) => s.alive || anim?.dying.has(s.id));
    if (phase !== 'setup') for (const s of visible) drawShip(s, t);
    if (phase !== 'setup') {
      for (const q of squads) {
        if (q.docked && !anim?.docking?.has(q.id)) continue; // docked squadrons are inside their carrier
        if (q.alive || anim?.dying.has(q.id) || anim?.boarded?.has(q.id)) drawSquad(q, t);
      }
      for (const m of missiles) {
        const goneAt = anim?.kind === 'fire' ? anim.missileGoneAt?.[m.id] : undefined;
        if (!m.alive && !(goneAt !== undefined && t < goneAt)) continue;
        drawMissile(m, t);
      }
      // Decoys: a blinking beacon; one destroyed this round stays until the shots land.
      for (const d of decoys) {
        if (!d.alive && !(anim?.kind === 'fire' && t < anim.landAt)) continue;
        const x = d.x * S, y = d.y * S, pulse = (t % 1200) / 1200;
        ctx.save();
        ctx.strokeStyle = colorOf(d.owner);
        ctx.globalAlpha = 1 - pulse;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, S * (0.3 + pulse * 1.2), 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = Math.floor(t / 400) % 2 ? '#ffd43b' : colorOf(d.owner);
        ctx.beginPath();
        ctx.moveTo(x, y - S * 0.35); ctx.lineTo(x + S * 0.25, y); ctx.lineTo(x, y + S * 0.35); ctx.lineTo(x - S * 0.25, y);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        label('📡 Decoy', x, y - S * 0.8, colorOf(d.owner), Math.max(11, S * 0.42));
      }
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
        if (f.kind === 'mine') label(f.thr ? 'MINE! Thrusters hit' : 'MINE!', f.x * S, f.y * S - S, '#ff6b6b', Math.max(18, S));
        if (f.kind === 'stand') label('🔨 TOO STUBBORN TO DIE!', f.x * S, f.y * S - S * 1.6, '#ffd43b', Math.max(16, S * 0.8));
      }
      for (const p of anim.pending) popup(p.shipId, p.at, p.shieldLost, p.hullLost, t, p.fromX, p.fromY);
    }
    // Teleport: a pulsing ring on each ship about to jump while its owner picks a spot.
    if (phase === 'teleport' && teleport) {
      const pulse = 0.5 + 0.5 * Math.sin(t / 180);
      for (const sid of teleport.ids) {
        const s = shipById(sid);
        if (!s) continue;
        ctx.save();
        ctx.strokeStyle = teleport.done[sid] ? '#b197fc' : `rgba(177,151,252,${0.4 + 0.6 * pulse})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 6]);
        ctx.lineDashOffset = t / 30;
        ctx.beginPath();
        ctx.arc(s.x * S, s.y * S, S * (1.6 + 0.2 * pulse), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      const who = [...new Set(teleport.ids.filter((sid) => !teleport.done[sid]).map((sid) => nameOf(shipById(sid).owner)))];
      label(`✨ Teleportation in progress…${who.length ? ` ${who.join(', ')} is picking a spot` : ''}`, W / 2, Math.max(28, S * 1.4), '#d0bfff', Math.max(20, S * 0.9));
    }
    // The jump: a ring collapses where the ship was, then bursts open where it lands.
    if (anim?.kind === 'warp') {
      const half = (anim.end - anim.start) / 2;
      for (const mv of Object.values(anim.moves)) {
        const k = (t - anim.start) / half;
        const at = k < 1 ? mv.from : mv.to;
        const r = k < 1 ? (1 - k) * 2.4 : (k - 1) * 2.4;
        ctx.save();
        ctx.globalAlpha = Math.max(0, k < 1 ? 1 - k * 0.3 : 2 - k);
        ctx.strokeStyle = '#d0bfff';
        ctx.shadowColor = '#b197fc';
        ctx.shadowBlur = 16;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(at.x * S, at.y * S, Math.max(0.1, r) * S, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        if (k >= 1) label('✨ TELEPORT!', mv.to.x * S, mv.to.y * S - S * 1.8, '#d0bfff', Math.max(16, S * 0.8));
      }
    }
    // Roll Dice: faint aim lines (who is shooting whom) while the players roll on their phones.
    if (phase === 'roll' && rollData) {
      const pulse = 0.35 + 0.2 * Math.sin(t / 250);
      const seen = new Set();
      for (const a of rollData.attacks) {
        const key = `${a.from}>${a.to}>${a.color}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const from = unitById(a.from), to = unitById(a.to);
        if (!from || !to) continue;
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = a.color;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 8]);
        ctx.lineDashOffset = -t / 40;
        ctx.beginPath();
        ctx.moveTo(from.x * S, from.y * S);
        ctx.lineTo(to.x * S, to.y * S);
        ctx.stroke();
        ctx.restore();
      }
      label('🎲 Roll your dice! Tap Fire! on your phone', W / 2, Math.max(28, S * 1.4), '#ffe066', Math.max(20, S * 0.9));
    }
    if (anim?.kind === 'fire') {
      // One bolt per die, in the weapon's dice color. A hit stops on the target with a flash, a
      // miss streaks past to one side, a crit is thicker with a big burst.
      for (const a of anim.attacks) {
        if (t < a.at) continue;
        const from = anyUnit(a.from), toShip = anyUnit(a.to);
        if (!from || !toShip) continue;
        const to = poseOf(toShip, t);
        const small = a.pd || isSquad(from);
        for (const b of a.bolts) {
          const u = (t - b.at) / BOLT_MS;
          if (u < 0 || u > 1 + BOLT_TAIL) continue;
          const x1 = from.x * S, y1 = from.y * S;
          let x2 = to.x * S, y2 = to.y * S;
          if (b.res === 'miss') {
            // Aim beside the target and keep going past it.
            const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
            x2 += (-dy / len) * b.side * S + (dx / len) * 2.5 * S;
            y2 += (dx / len) * b.side * S + (dy / len) * 2.5 * S;
          }
          const head = Math.min(1, u), tail = Math.max(0, head - 0.35);
          const fade = u > 1 ? 1 - (u - 1) / BOLT_TAIL : 1;
          const lx = (k) => x1 + (x2 - x1) * k, ly = (k) => y1 + (y2 - y1) * k;
          ctx.save();
          ctx.globalAlpha = Math.max(0, fade) * (b.res === 'miss' ? 0.75 : 1);
          ctx.strokeStyle = a.color;
          ctx.shadowColor = a.color;
          ctx.shadowBlur = b.res === 'crit' ? 18 : 10;
          ctx.lineCap = 'round';
          ctx.lineWidth = b.res === 'crit' ? 5 : small ? 1.8 : 3;
          ctx.beginPath();
          ctx.moveTo(lx(tail), ly(tail));
          ctx.lineTo(lx(head), ly(head));
          ctx.stroke();
          if (b.res === 'crit') {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
          ctx.restore();
          // Impact.
          if (u >= 1 && b.res !== 'miss') {
            const k = Math.min(1, (u - 1) / BOLT_TAIL);
            const r = (b.res === 'crit' ? 0.5 + k * 1.6 : 0.2 + k * 0.6) * S * (small ? 0.6 : 1);
            ctx.save();
            ctx.globalAlpha = 1 - k;
            ctx.fillStyle = b.res === 'crit' ? '#fff3bf' : a.color;
            ctx.beginPath();
            ctx.arc(x2, y2, r, 0, Math.PI * 2);
            ctx.fill();
            if (b.res === 'crit') {
              ctx.strokeStyle = '#ffd43b';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.arc(x2, y2, r * 1.4, 0, Math.PI * 2);
              ctx.stroke();
            }
            ctx.restore();
          }
        }
      }
      for (const p of anim.popups) popup(p.shipId, p.at, p.shieldLost, p.hullLost, t);
      // Effect labels (GRAPPLED, DISRUPTED, ACID, "−1 acid"), stacked under the ship.
      const row = {};
      for (const g of anim.tags) {
        if (t < g.at || t > g.at + 1800) continue;
        const s = anyUnit(g.shipId);
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
      else if (msg.type === 'rolled') rolledInput(id, msg);
      else if (msg.type === 'teleport') teleportInput(id, msg);
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
