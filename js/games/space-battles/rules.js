// Space Battles – shared rules. Pure functions used by both the TV and the phones.
// No DOM and no randomness here, so a phone's preview of a planned path matches
// exactly where the TV moves the ship (apart from collisions, which only the TV knows).
//
// A ship at runtime looks like:
// { id, type, faction, owner, x, y, heading, speed, hull, shields: { front, left, right, rear }, alive }
import {
  FACTIONS, WEAPONS, RANGE_BANDS, CLASSES, SHIPS, MOVE, ARCS, ZONES, FLEET, STANCES, CLASS_STANCES, CRITICALS,
  SQUADRONS, SQUADRON, WING_ORDERS,
} from './data.js';
//
// A squadron at runtime looks like:
// { id, kind: 'squad', type, faction, owner, carrier (ship id), slot (0..2 in its wing), x, y, hull, alive }
// "Units" = ships and squadrons together (anything that can be targeted).

const RAD = Math.PI / 180;
const TURN_PART = 0.25; // share of a segment's time spent turning (turn first, then fly straight)
export const MOVE_TICKS = 120; // collision checks per Move phase

export const shipDef = (ship) => SHIPS[ship.type];
export const classOf = (ship) => CLASSES[SHIPS[ship.type].class];
export const isEnemy = (a, b) => a.faction !== b.faction;

// Angle in (-180, 180].
export function normAngle(d) {
  let a = d % 360;
  if (a > 180) a -= 360;
  if (a <= -180) a += 360;
  return a;
}

// ---------- Geometry ----------

export function corners(pose, cls) {
  const hl = cls.length / 2, hw = cls.width / 2;
  const c = Math.cos(pose.heading * RAD), s = Math.sin(pose.heading * RAD);
  return [[hl, -hw], [hl, hw], [-hl, hw], [-hl, -hw]].map(([lx, ly]) => [
    pose.x + lx * c - ly * s,
    pose.y + lx * s + ly * c,
  ]);
}

function project(poly, ax, ay) {
  let min = Infinity, max = -Infinity;
  for (const [x, y] of poly) {
    const p = x * ax + y * ay;
    if (p < min) min = p;
    if (p > max) max = p;
  }
  return [min, max];
}

// Separating-axis test for two convex polygons.
export function polygonsOverlap(A, B) {
  for (const poly of [A, B]) {
    for (let i = 0; i < poly.length; i++) {
      const [x1, y1] = poly[i];
      const [x2, y2] = poly[(i + 1) % poly.length];
      const ax = -(y2 - y1), ay = x2 - x1;
      const [a0, a1] = project(A, ax, ay);
      const [b0, b1] = project(B, ax, ay);
      if (a1 <= b0 || b1 <= a0) return false;
    }
  }
  return true;
}

function pointSegDist(px, py, [x1, y1], [x2, y2]) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

// Shortest distance between two convex polygons (0 if they overlap).
export function polygonDistance(A, B) {
  if (polygonsOverlap(A, B)) return 0;
  let best = Infinity;
  for (const [P, Q] of [[A, B], [B, A]]) {
    for (const [px, py] of P) {
      for (let i = 0; i < Q.length; i++) {
        best = Math.min(best, pointSegDist(px, py, Q[i], Q[(i + 1) % Q.length]));
      }
    }
  }
  return best;
}

export function shipPolygon(ship, pose = ship) {
  return corners(pose, classOf(ship));
}

// Distance between the closest edges of two ships.
export function shipDistance(a, b) {
  return polygonDistance(shipPolygon(a), shipPolygon(b));
}

// ---------- Squadrons (rules §8) ----------
export const isSquad = (u) => u?.kind === 'squad';
export const squadDef = (sq) => SQUADRONS[sq.type];
export const SQUAD_R = SQUADRON.size / 2;

function pointInConvex(px, py, poly) {
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    const c = (x2 - x1) * (py - y1) - (y2 - y1) * (px - x1);
    if (c === 0) continue;
    if (!sign) sign = Math.sign(c);
    else if (Math.sign(c) !== sign) return false;
  }
  return true;
}

// Distance from a point to a convex polygon's outline (0 if inside).
export function pointPolygonDistance(px, py, poly) {
  if (pointInConvex(px, py, poly)) return 0;
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) best = Math.min(best, pointSegDist(px, py, poly[i], poly[(i + 1) % poly.length]));
  return best;
}

// Distance between the closest edges of two units (ships or squadrons).
export function unitDistance(a, b) {
  const qa = isSquad(a), qb = isSquad(b);
  if (qa && qb) return Math.max(0, Math.hypot(a.x - b.x, a.y - b.y) - 2 * SQUAD_R);
  if (qa) return Math.max(0, pointPolygonDistance(a.x, a.y, shipPolygon(b)) - SQUAD_R);
  if (qb) return Math.max(0, pointPolygonDistance(b.x, b.y, shipPolygon(a)) - SQUAD_R);
  return shipDistance(a, b);
}

// Display name of a unit ("Valiant", "Hawk squadron").
export const unitName = (u) => (isSquad(u) ? `${squadDef(u).short} squadron` : SHIPS[u.type].short);

// A ship weapon's hit chance at `band` against `target` (rules §7/§8 decided details):
// against squadrons, PD and Autocannons use their normal chance, Flechettes their own
// squadron chance, Ion Cannons and Boarding Harpoons can't fire, and everything else loses
// SQUADRON.hitPenalty (never below SQUADRON.minHit).
export function hitChance(wd, band, target) {
  if (!isSquad(target)) return wd.hit[band] || 0;
  if (wd.noSquadrons) return 0;
  if (wd.hitVsSquadron) return wd.hitVsSquadron[band] || 0;
  const base = wd.hit[band] || 0;
  if (!base || wd.pd || wd.fullVsSquadrons) return base;
  return Math.max(SQUADRON.minHit, base - SQUADRON.hitPenalty);
}

// Carrier capacity (0 for ships that aren't carriers).
export const carrierSlots = (type) => SHIPS[type]?.squadrons || 0;
export const isCarrier = (ship) => carrierSlots(ship.type) > 0;

// Squadron types a faction can buy, cheapest first.
export function factionSquadTypes(faction) {
  return Object.keys(SQUADRONS).filter((t) => SQUADRONS[t].faction === faction)
    .sort((a, b) => SQUADRONS[a].cost - SQUADRONS[b].cost);
}

// Living squadrons of one carrier's wing.
export const wingOf = (carrierId, squads) => squads.filter((q) => q.alive && q.carrier === carrierId);

// Wing order from the phone: { order, target? }. Attack needs a living enemy ship. Invalid → null.
export function sanitizeWing(ship, wing, ships) {
  if (!wing || !WING_ORDERS[wing.order]) return null;
  const out = { order: wing.order };
  if (WING_ORDERS[wing.order].needsTarget) {
    const t = ships.find((x) => x.id === wing.target);
    if (!t || isSquad(t) || !t.alive || !isEnemy(ship, t)) return null;
    out.target = t.id;
  }
  return out;
}

const nearest = (from, list) => list.reduce((best, u) => {
  const d = unitDistance(from, u);
  return !best || d < best.d ? { u, d } : best;
}, null);

// Where each squadron flies this round (squadrons move after ships, in straight lines, up to
// their speed in u, ignoring asteroids and ships, stopping at the map edge with no damage).
//   Escort: its own spot next to the carrier (stays put if the carrier is gone).
//   Attack: until touching the target ship (or the nearest enemy ship if the target is gone).
//   Intercept: at the nearest enemy squadron (where it was before squadrons moved), stopping
//              when touching it; Escort if there are none.
// `ships` = ships after their move. Returns { [squadId]: { from: {x,y}, to: {x,y} } }. Pure.
export function planSquadMoves(squads, ships, map) {
  const out = {};
  const living = squads.filter((q) => q.alive);
  const r = SQUAD_R;
  const clampX = (x) => Math.max(r, Math.min(map.w - r, x));
  const clampY = (y) => Math.max(r, Math.min(map.h - r, y));
  for (const q of living) {
    const def = squadDef(q);
    const carrier = ships.find((s) => s.id === q.carrier);
    const wing = carrier?.wing || { order: 'escort' };
    const enemyShips = ships.filter((s) => s.alive && isEnemy(q, s));
    const enemySquads = living.filter((o) => isEnemy(q, o));
    let goal = null; // { x, y, stop } — stop flying when the edge distance reaches `stop`
    let order = wing.order;
    if (order === 'intercept' && !enemySquads.length) order = 'escort';
    if (order === 'attack') {
      let t = enemyShips.find((s) => s.id === wing.target);
      if (!t) t = nearest(q, enemyShips)?.u;
      if (t) {
        // Aim a little to the side for each squadron of the wing, so they don't stack.
        const cls = classOf(t);
        const ang = Math.atan2(t.y - q.y, t.x - q.x);
        const off = (q.slot - 1) * cls.width * 0.35;
        goal = { x: t.x - Math.sin(ang) * off, y: t.y + Math.cos(ang) * off, ship: t };
      } else order = 'escort';
    }
    if (order === 'intercept') {
      // Aim a little to the side for each squadron of the wing, so they don't stack.
      const t = nearest(q, enemySquads).u;
      const ang = Math.atan2(t.y - q.y, t.x - q.x);
      const off = (q.slot - 1) * SQUADRON.size;
      goal = { x: t.x - Math.sin(ang) * off, y: t.y + Math.cos(ang) * off, squad: true };
    }
    if (order === 'escort') {
      if (carrier?.alive) {
        const cls = classOf(carrier);
        const a = (carrier.heading + [120, 180, -120][q.slot % 3]) * RAD;
        const d = cls.length / 2 + SQUADRON.escortGap;
        goal = { x: carrier.x + Math.cos(a) * d, y: carrier.y + Math.sin(a) * d };
      } else goal = { x: q.x, y: q.y };
    }
    goal.x = clampX(goal.x);
    goal.y = clampY(goal.y);
    const len = Math.hypot(goal.x - q.x, goal.y - q.y);
    let travel = len;
    if (goal.squad) travel = Math.max(0, len - 2 * r);
    if (goal.ship) {
      // Smallest travel along the line that touches the ship's outline.
      const poly = shipPolygon(goal.ship);
      const at = (d) => pointPolygonDistance(q.x + ((goal.x - q.x) * d) / len, q.y + ((goal.y - q.y) * d) / len, poly) - r;
      if (len < 1e-6 || at(0) <= 0.02) travel = 0;
      else {
        let lo = 0, hi = len;
        for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (at(mid) <= 0.02) hi = mid; else lo = mid; }
        travel = hi;
      }
    }
    travel = Math.min(travel, def.speed);
    const k = len > 1e-6 ? travel / len : 0;
    out[q.id] = {
      from: { x: q.x, y: q.y },
      to: { x: clampX(q.x + (goal.x - q.x) * k), y: clampY(q.y + (goal.y - q.y) * k) },
    };
  }
  return out;
}

// What a squadron shoots this round (rules §8, close range only, asteroids never block):
// fighters the nearest enemy squadron, else the nearest enemy ship; bombers the reverse;
// boarding pods nothing. Returns { target, profile } or null. `units` = ships + squadrons.
export function squadAttackTarget(q, units) {
  const def = squadDef(q);
  if (def.role === 'boarding') return null;
  const inRange = units.filter((u) => u.alive && isEnemy(q, u) && rangeBand(unitDistance(q, u)) === 'close');
  const sq = nearest(q, inRange.filter(isSquad));
  const sh = nearest(q, inRange.filter((u) => !isSquad(u)));
  const order = def.role === 'fighter' ? [sq, sh] : [sh, sq];
  const pick = order.find(Boolean);
  if (!pick) return null;
  return { target: pick.u, profile: isSquad(pick.u) ? def.vsSquadron : def.vsShip };
}

// Warden Screen: enemy squadrons attacking `ship` lose 1 shot if a living friendly ship with
// `screen` is within close range of it (the Warden itself included). Several don't stack.
export function screened(ship, ships) {
  return ships.some((w) => w.alive && !isEnemy(w, ship) && SHIPS[w.type].screen
    && (w.id === ship.id || rangeBand(shipDistance(w, ship)) === 'close'));
}

// Point-defense target: the nearest living enemy squadron in close range (all PD shots go there).
export function pdTarget(ship, squads) {
  if (!(shipDef(ship).pd || []).length) return null;
  const inRange = squads.filter((q) => q.alive && isEnemy(ship, q) && rangeBand(unitDistance(ship, q)) === 'close');
  return nearest(ship, inRange)?.u || null;
}

// Boarding Pod latch: the enemy ship whose outline this pod touches (or null).
export function latchTarget(q, ships) {
  if (!squadDef(q).latch) return null;
  const touching = ships.filter((s) => s.alive && isEnemy(q, s)
    && pointPolygonDistance(q.x, q.y, shipPolygon(s)) - SQUAD_R <= SQUADRON.latchDist);
  return nearest(q, touching)?.u || null;
}

export function rectHitsCircle(pose, cls, circle) {
  const c = Math.cos(-pose.heading * RAD), s = Math.sin(-pose.heading * RAD);
  const dx = circle.x - pose.x, dy = circle.y - pose.y;
  const lx = dx * c - dy * s, ly = dx * s + dy * c;
  const hl = cls.length / 2, hw = cls.width / 2;
  const nx = Math.max(-hl, Math.min(hl, lx)), ny = Math.max(-hw, Math.min(hw, ly));
  return Math.hypot(lx - nx, ly - ny) < circle.r;
}

// Returns the side of the map the ship pokes out of ('west' | 'east' | 'north' | 'south') or null.
export function outOfBounds(pose, cls, map) {
  for (const [x, y] of corners(pose, cls)) {
    if (x < 0) return 'west';
    if (x > map.w) return 'east';
    if (y < 0) return 'north';
    if (y > map.h) return 'south';
  }
  return null;
}

// ---------- Hull zones, arcs, range, line of sight ----------

// Which hull zone of `ship` faces the point (px, py). Each zone is a 90° wedge from the center.
export function zoneFacing(ship, px, py) {
  const ang = Math.atan2(py - ship.y, px - ship.x) / RAD;
  const rel = normAngle(ang - ship.heading);
  if (rel >= -45 && rel <= 45) return 'front';
  if (rel > 45 && rel <= 135) return 'right';
  if (rel < -45 && rel >= -135) return 'left';
  return 'rear';
}

// A target is in an arc if its center is inside that zone's wedge.
export const inArc = (ship, arc, target) => arc === 'turret' || zoneFacing(ship, target.x, target.y) === arc;

export function rangeBand(dist) {
  for (const b of RANGE_BANDS) if (dist <= b.max) return b.id;
  return null;
}

// Blocked if the center-to-center line crosses an asteroid.
export function lineOfSight(a, b, asteroids) {
  for (const r of asteroids) {
    if (pointSegDist(r.x, r.y, [a.x, a.y], [b.x, b.y]) < r.r) return false;
  }
  return true;
}

export function arcWeapons(ship, arc) {
  return shipDef(ship).arcs[arc] || [];
}

// Once-per-game weapons are remembered by "arc:index" in ship.used once fired.
export const weaponKey = (arc, wi) => `${arc}:${wi}`;
export const isOnce = (w) => !!WEAPONS[w.weapon].once;
export function weaponUsedUp(ship, arc, wi) {
  const w = arcWeapons(ship, arc)[wi];
  return !!(w && isOnce(w) && ship.used?.[weaponKey(arc, wi)]);
}

// ---------- Stances (rules §5) ----------
// During planning the stance is only in the plan, so movement helpers take a stance id.
// From the Move phase on, the chosen stance is on the ship: ship.stance = { id, zone?, target? }.
export const stanceOf = (ship) => STANCES[ship.stance?.id || 'balanced'];

// Stances this ship may pick this round: Balanced + its class list, minus last round's
// stance (no repeats, except Balanced).
export function stanceOptions(ship) {
  const list = ['balanced', ...(CLASS_STANCES[shipDef(ship).class] || [])];
  return list.filter((id) => id === 'balanced' || id !== ship.lastStance);
}

// Arcs this ship may fire this round (Evasive: 1, Full Burn: 0).
export const maxArcs = (ship) => stanceOf(ship).maxArcs ?? 2;

// The ship a Hunter must attack (or null when the ship isn't hunting).
export const huntTarget = (ship) => (ship.stance?.id === 'hunter' ? ship.stance.target : null);

// Expected damage from one weapon at one range band (shown on the phone).
// Ion Cannon damage only strips shields, so the phone labels it as shield damage.
export function expectedWeaponDamage(w, band, shots = w.shots, target = null) {
  const wd = WEAPONS[w.weapon];
  return shots * (target ? hitChance(wd, band, target) : wd.hit[band] || 0) * wd.damage;
}

// Shot bonus for one weapon of `ship` firing at `target` (Overcharge, Hunter). Applies to every
// weapon the ship fires (Hunter: every weapon aimed at the marked ship).
export function shotBonus(ship, target) {
  const st = stanceOf(ship);
  let n = st.shotBonus || 0;
  if (st.huntShotBonus && huntTarget(ship) === target.id) n += st.huntShotBonus;
  return n;
}

// Final shots for every weapon fired from one arc: `targets` = { [weaponIndex]: targetId }.
// Bonuses go on every weapon. Penalties (rules §5 decided details) remove 1 shot per arc from
// the firing weapon with the most shots (ties: the one listed first); a weapon can drop to 0:
//   - Brace / Damage Control: −1 shot on the arc,
//   - target is Evasive and at long range: −1 shot from the weapons aimed at that target
//     (not if this ship is a Hunter that marked it).
export function arcShots(ship, arc, targets, ships) {
  const weapons = arcWeapons(ship, arc);
  const byId = Object.fromEntries(ships.map((s) => [s.id, s]));
  const shots = {};
  for (const [wi, id] of Object.entries(targets)) {
    if (!weapons[wi] || !byId[id]) continue;
    shots[wi] = weapons[wi].shots + shotBonus(ship, byId[id]);
  }
  const takeOne = (wis) => {
    const best = wis.filter((wi) => shots[wi] > 0).sort((a, b) => shots[b] - shots[a] || a - b)[0];
    if (best !== undefined) shots[best]--;
  };
  const all = Object.keys(shots).map(Number);
  if (stanceOf(ship).shotPenalty) takeOne(all);
  for (const id of new Set(Object.values(targets))) {
    const t = byId[id];
    if (!t || !stanceOf(t).longRangeShotPenalty || huntTarget(ship) === t.id) continue;
    if (rangeBand(shipDistance(ship, t)) !== 'long') continue;
    takeOne(all.filter((wi) => targets[wi] === id));
  }
  return shots;
}

// Damage one attack (or collision, asteroid, edge, acid) actually deals to `ship` after its
// stance: Overcharge +1 for a weapon attack that hit at least once, Brace halves (rounded up).
export function stanceDamage(ship, amount, { attack = false } = {}) {
  const st = stanceOf(ship);
  let d = amount;
  if (attack && d > 0 && st.damageTakenBonus) d += st.damageTakenBonus;
  if (st.halveDamage) d = Math.ceil(d / 2);
  return d;
}

const OPPOSITE = { front: 'rear', rear: 'front', left: 'right', right: 'left' };

// Shields a zone really has right now: Shield Charge's opposite zone and Full Burn's rear
// count as 0 (switched off for the round, not lost). Pirates' free "home" burn has no costs.
export function shieldsOff(ship, zone) {
  const st = ship.stance;
  if (!st) return false;
  if (st.id === 'shieldCharge' && OPPOSITE[st.zone] === zone) return true;
  if (st.id === 'fullBurn' && zone === 'rear') return true;
  return false;
}

// Valid targets for one weapon: enemy, alive, in that arc, in range of THIS weapon,
// and in line of sight. Sorted nearest first. Used-up once-per-game weapons have none.
// A Hunter may only target its marked ship. `units` = ships and squadrons. Asteroids never
// block shots at squadrons (they fly over them).
export function weaponTargets(ship, arc, wi, units, asteroids) {
  const w = arcWeapons(ship, arc)[wi];
  if (!w || weaponUsedUp(ship, arc, wi) || maxArcs(ship) === 0 || arcOffline(ship, arc)) return [];
  const wd = WEAPONS[w.weapon];
  const hunt = huntTarget(ship);
  const out = [];
  for (const t of units) {
    if (!t.alive || !isEnemy(ship, t) || !inArc(ship, arc, t)) continue;
    if (hunt && t.id !== hunt) continue;
    const dist = unitDistance(ship, t);
    const band = rangeBand(dist);
    if (!band || !hitChance(wd, band, t)) continue;
    if (!isSquad(t) && !lineOfSight(ship, t, asteroids)) continue;
    out.push({ id: t.id, dist, band, squad: isSquad(t), expected: expectedWeaponDamage(w, band, w.shots + shotBonus(ship, t), t) });
  }
  return out.sort((a, b) => a.dist - b.dist);
}

// Fire plan for one ship: [{ arc, targets: { [weaponIndex]: targetId } }], at most maxArcs arcs.
// A weapon left out of `targets` holds its fire.
//
// Default when time runs out: the best arcs; each weapon shoots the nearest target it
// can hit. Once-per-game weapons are held.
export function defaultFirePlan(ship, ships, asteroids) {
  const options = [];
  for (const arc of ARCS) {
    const targets = {};
    let expected = 0;
    arcWeapons(ship, arc).forEach((w, wi) => {
      if (isOnce(w)) return;
      const t = weaponTargets(ship, arc, wi, ships, asteroids)[0];
      if (t) { targets[wi] = t.id; expected += t.expected; }
    });
    if (Object.keys(targets).length) options.push({ arc, targets, expected });
  }
  options.sort((a, b) => b.expected - a.expected);
  return options.slice(0, maxArcs(ship)).map(({ arc, targets }) => ({ arc, targets }));
}

// Keep only legal attacks: up to maxArcs different arcs, each weapon at a valid target.
export function sanitizeFirePlan(ship, plan, ships, asteroids) {
  if (!Array.isArray(plan)) return [];
  const out = [];
  const used = new Set();
  for (const a of plan) {
    if (out.length >= maxArcs(ship)) break;
    if (!a || !ARCS.includes(a.arc) || used.has(a.arc) || !a.targets || typeof a.targets !== 'object') continue;
    const targets = {};
    arcWeapons(ship, a.arc).forEach((w, wi) => {
      const id = a.targets[wi];
      if (id && weaponTargets(ship, a.arc, wi, ships, asteroids).some((t) => t.id === id)) targets[wi] = id;
    });
    if (!Object.keys(targets).length) continue;
    used.add(a.arc);
    out.push({ arc: a.arc, targets });
  }
  return out;
}

// ---------- Criticals (rules §7) ----------
// ship.crits = [{ id, arc?, zone?, fresh? }], oldest first. `fresh` = caught this round; criticals
// marked `nextRound` in data.js (Weapons Offline, Bridge Fire) only act once it's gone.
export const critCount = (ship, id) => (ship.crits || []).filter((c) => c.id === id && !c.fresh).length;
const critCountAny = (ship, id) => (ship.crits || []).filter((c) => c.id === id).length;

// Max speed after Damaged Engines (never below the class's minimum speed). Engines act at once.
export function maxSpeed(ship) {
  const [min, max] = shipDef(ship).speed;
  return Math.max(min, max - critCountAny(ship, 'engines'));
}

// Weapons Offline: that arc can't fire until the critical is repaired.
export const arcOffline = (ship, arc) => (ship.crits || []).some((c) => c.id === 'weaponsOffline' && !c.fresh && c.arc === arc);

// Zones whose shields Damage Control can't restore (Shield Generator Hit).
export const shieldsBroken = (ship, zone) => (ship.crits || []).some((c) => c.id === 'shieldGen' && c.zone === zone);

// How many hits of one attack get past the shields (each of those rolls for a crit).
// The attack's total (after the defender's stance) is split back into hits of `perHit` damage
// in order (extra/missing damage goes on the last hits); shields soak up the first hits.
export function hullHitCount(total, hits, perHit, absorbable) {
  if (hits <= 0 || total <= 0) return 0;
  const chunks = new Array(hits).fill(perHit);
  let diff = total - hits * perHit;
  for (let i = hits - 1; diff !== 0 && i >= 0; i--) {
    const d = diff > 0 ? diff : Math.max(diff, -chunks[i]);
    chunks[i] += d;
    diff -= d;
  }
  let shield = absorbable;
  let n = 0;
  for (const c of chunks) {
    const taken = Math.min(shield, c);
    shield -= taken;
    if (c - taken > 0) n++;
  }
  return n;
}

// Shields an attack on `zone` would meet first (temporary + the zone's own, unless switched off).
export const absorbableShields = (ship, zone) => (ship.tempShields?.[zone] || 0) + (shieldsOff(ship, zone) ? 0 : ship.shields[zone]);

// ---------- Damage Control (rules §5) ----------
// What Damage Control restores for this ship: { shields, hull, alsoRemoveCrit }
// (Djnzuar Samurai engineers do better).
export const repairOf = (ship) => FACTIONS[ship.faction].traits.repair || STANCES.damageControl.repair;

// Repair choice from the phone: { kind: 'shields', zones: [..] } | { kind: 'hull' } | { kind: 'crit' },
// plus optional `crit` = index into ship.crits of the critical to remove. Invalid → null (default).
export function sanitizeRepair(ship, r) {
  if (!r || typeof r !== 'object') return null;
  const out = {};
  if (r.kind === 'hull' || r.kind === 'crit') out.kind = r.kind;
  else if (r.kind === 'shields' && Array.isArray(r.zones)) {
    out.kind = 'shields';
    out.zones = r.zones.filter((z) => ZONES.includes(z)).slice(0, repairOf(ship).shields);
  } else return null;
  if (Number.isInteger(r.crit) && r.crit >= 0 && r.crit < (ship.crits || []).length) out.crit = r.crit;
  return out;
}

// Applies a Damage Control repair at the end of the round. Mutates the ship.
// Default (no choice): remove a critical if any (the oldest), else restore shields, else hull.
// Shields never go above their starting value, hull never above max (rules §5), and a zone
// with a Shield Generator Hit can't get shields back. Samurai engineers also remove a critical.
// Returns { kind, shieldsGained, zones (one entry per shield restored), hullGained, critRemoved }.
export function applyRepair(ship, choice) {
  const def = shipDef(ship);
  const rep = repairOf(ship);
  if (!ship.crits) ship.crits = [];
  const crits = ship.crits;
  const missing = (z) => (shieldsBroken(ship, z) ? 0 : def.shields[z] - ship.shields[z]);
  const anyShieldMissing = ZONES.some((z) => missing(z) > 0);
  let kind = choice?.kind;
  if (!kind) kind = crits.length ? 'crit' : anyShieldMissing ? 'shields' : 'hull';
  const out = { kind, shieldsGained: 0, zones: [], hullGained: 0, critRemoved: null };
  const removeCrit = () => {
    if (!crits.length) return;
    const i = choice?.crit !== undefined && choice.crit < crits.length ? choice.crit : 0;
    out.critRemoved = crits.splice(i, 1)[0].id;
  };
  if (kind === 'crit') removeCrit();
  if (kind === 'hull') {
    const h = Math.min(rep.hull, def.hull - ship.hull);
    ship.hull += h;
    out.hullGained = h;
  }
  if (kind === 'shields') {
    const wanted = (choice?.zones || []).slice();
    for (let i = 0; i < rep.shields; i++) {
      // Use the chosen zone if it still has room, otherwise the most-damaged zone.
      let z = wanted[i];
      if (!z || missing(z) <= 0) z = [...ZONES].sort((a, b) => missing(b) - missing(a))[0];
      if (missing(z) <= 0) break;
      ship.shields[z]++;
      out.zones.push(z);
      out.shieldsGained++;
    }
  }
  if (rep.alsoRemoveCrit && kind !== 'crit') removeCrit();
  return out;
}

// ---------- Movement ----------

// Speeds the ship may pick this round with stance `stanceId`: normally current −1 / same / +1,
// within its class range.
//   - Full Burn stance, or Pirates' free "home" burn (ship.burn): change by up to 2, up to 1 over max.
//   - Overcharge: can't change speed. Damage Control: must slow down by 1 (stays at its minimum
//     if it can't). Both still have to come back down if above max after a burn.
//   - Grappled (hit by a Grapple Harpoon last round): can't speed up, even in Full Burn.
export function speedOptions(ship, stanceId = 'balanced') {
  const st = STANCES[stanceId] || STANCES.balanced;
  let min = shipDef(ship).speed[0];
  let max = maxSpeed(ship); // lowered by Damaged Engines
  const home = ship.burn && FACTIONS[ship.faction].traits.home;
  let change = 1;
  if (st.speedChange) { change = st.speedChange; max += st.overMax; } else if (home) { change = home.speedChange; max += home.overMax; }
  const clamp = (s) => Math.min(Math.max(s, min), max);
  if (st.holdSpeed) return [clamp(ship.speed)];
  if (st.mustSlow) return [clamp(ship.speed - 1)];
  const top = ship.grappled ? ship.speed : ship.speed + change;
  const out = [];
  for (let s = ship.speed - change; s <= top; s++) if (s >= min && s <= max) out.push(s);
  if (!out.length) out.push(clamp(ship.speed)); // e.g. coming back down from a burn
  return out;
}

// Turn clicks allowed per segment (speed 0: may rotate 1 click in place).
// Some ships turn better at certain speeds (`clicksAtSpeed` in data.js).
// Stance: Evasive +1; Trained helms (Protectorate) +1 more with Evasive or Full Burn;
// Brace max 1. A ship with `disrupted` set (hit by a Disruptor last round) gets 1 less (min 0).
export function maxClicks(ship, speed, stanceId = 'balanced') {
  const def = shipDef(ship);
  const st = STANCES[stanceId] || STANCES.balanced;
  let n = speed === 0 ? 1 : def.clicksAtSpeed?.[speed] ?? def.clicks;
  n += st.extraClicks || 0;
  if (st.helms) n += FACTIONS[ship.faction].traits.trainedHelms || 0;
  if (st.maxClicks !== undefined) n = Math.min(n, st.maxClicks);
  return Math.max(0, n - (ship.disrupted ? 1 : 0) - critCount(ship, 'thrusters'));
}

// Move plan: { speed, clicks, stance: { id, zone?, target? } }.
export function defaultMovePlan(ship) {
  const opts = speedOptions(ship);
  const speed = opts.includes(ship.speed) ? ship.speed : opts[0];
  return { speed, clicks: new Array(Math.max(1, speed)).fill(0), stance: { id: 'balanced' } };
}

// Valid stance choice for this ship, or null. Hunter needs a living enemy ship to mark;
// Shield Charge needs a zone.
export function sanitizeStance(ship, st, ships) {
  if (!st || !stanceOptions(ship).includes(st.id)) return null;
  const def = STANCES[st.id];
  const out = { id: st.id };
  if (def.needsZone) {
    if (!ZONES.includes(st.zone)) return null;
    out.zone = st.zone;
  }
  if (def.needsTarget) {
    const t = ships.find((x) => x.id === st.target);
    if (!t || !t.alive || !isEnemy(ship, t)) return null;
    out.target = t.id;
  }
  return out;
}

export function sanitizeMovePlan(ship, plan, ships = []) {
  if (!plan) return null;
  const stance = plan.stance ? sanitizeStance(ship, plan.stance, ships) : { id: 'balanced' };
  if (!stance) return null;
  if (!Number.isInteger(plan.speed) || !speedOptions(ship, stance.id).includes(plan.speed)) return null;
  const n = Math.max(1, plan.speed);
  if (!Array.isArray(plan.clicks) || plan.clicks.length !== n) return null;
  const mc = maxClicks(ship, plan.speed, stance.id);
  if (!plan.clicks.every((c) => Number.isInteger(c) && Math.abs(c) <= mc)) return null;
  const out = { speed: plan.speed, clicks: plan.clicks.slice(), stance };
  // Carriers: optional new wing order (left out or invalid = keep the old one).
  const wing = isCarrier(ship) && sanitizeWing(ship, plan.wing, ships);
  if (wing) out.wing = wing;
  return out;
}

// Where the ship is at time t (0..1) of the Move phase if nothing blocks it.
// Each segment: turn first, then fly straight for 2 u.
export function poseAt(start, plan, t) {
  const L = MOVE.segmentLength, D = MOVE.clickDegrees;
  let x = start.x, y = start.y, h = start.heading;
  const s = plan.speed;
  if (s === 0) return { x, y, heading: h + (plan.clicks[0] || 0) * D * t };
  const seg = Math.min(s - 1, Math.floor(t * s));
  for (let k = 0; k < seg; k++) {
    h += plan.clicks[k] * D;
    x += L * Math.cos(h * RAD);
    y += L * Math.sin(h * RAD);
  }
  const u = Math.min(1, t * s - seg);
  const c = plan.clicks[seg];
  let move = u;
  if (c) {
    h += c * D * Math.min(1, u / TURN_PART);
    move = Math.max(0, (u - TURN_PART) / (1 - TURN_PART));
  }
  x += L * move * Math.cos(h * RAD);
  y += L * move * Math.sin(h * RAD);
  return { x, y, heading: h };
}

// Pose at the end of every segment (for the ghost path on the phone).
export function planWaypoints(start, plan) {
  const n = Math.max(1, plan.speed);
  const pts = [{ x: start.x, y: start.y, heading: start.heading }];
  for (let k = 1; k <= n; k++) pts.push(poseAt(start, plan, k / n));
  return pts;
}

// Shields absorb in this order: Shield Charge's temporary +2 (ship.tempShields), then the
// zone's own shields (unless switched off by the stance), then hull. Mutates the ship.
// `tempLost` = temporary shields used up (shown as shield damage on the TV, never restored).
function absorb(ship, zone, amount) {
  const temp = Math.min(ship.tempShields?.[zone] || 0, amount);
  if (temp) ship.tempShields[zone] -= temp;
  const own = shieldsOff(ship, zone) ? 0 : Math.min(ship.shields[zone], amount - temp);
  ship.shields[zone] -= own;
  return { temp, own, rest: amount - temp - own };
}

export function applyDamage(ship, zone, amount) {
  const a = absorb(ship, zone, amount);
  const hullLost = Math.min(ship.hull, a.rest);
  ship.hull -= hullLost;
  return { shipId: ship.id, zone, amount, shieldLost: a.own, tempLost: a.temp, hullLost };
}

// Ion Cannon: removes shields only; anything beyond the zone's shields is wasted. Mutates the ship.
export function applyShieldDamage(ship, zone, amount) {
  const a = absorb(ship, zone, amount);
  return { shipId: ship.id, zone, amount, shieldLost: a.own, tempLost: a.temp, hullLost: 0 };
}

// Damage that skips shields (Acid). Mutates the ship.
export function applyHullDamage(ship, amount) {
  const hullLost = Math.min(ship.hull, amount);
  ship.hull -= hullLost;
  return { shipId: ship.id, zone: null, amount, shieldLost: 0, hullLost };
}

// Grapple Harpoon pull: slide `ship` up to `dist` u toward (tx, ty) in small steps,
// stopping early (no damage) before it would touch an asteroid, another living ship,
// or leave the map. Returns the new { x, y } (heading is unchanged). Doesn't mutate.
export function pullToward(ship, tx, ty, dist, ships, scenario) {
  const len = Math.hypot(tx - ship.x, ty - ship.y);
  if (len < 1e-6) return { x: ship.x, y: ship.y };
  const ux = (tx - ship.x) / len, uy = (ty - ship.y) / len;
  const cls = classOf(ship);
  const others = ships.filter((o) => o.alive && o.id !== ship.id).map((o) => shipPolygon(o));
  const STEPS = 20;
  let pos = { x: ship.x, y: ship.y };
  for (let k = 1; k <= STEPS; k++) {
    const d = (dist * k) / STEPS;
    const cand = { x: ship.x + ux * d, y: ship.y + uy * d, heading: ship.heading };
    if (outOfBounds(cand, cls, scenario.map)) break;
    if (scenario.asteroids.some((r) => rectHitsCircle(cand, cls, r))) break;
    const poly = shipPolygon(ship, cand);
    if (others.some((p) => polygonsOverlap(poly, p))) break;
    pos = { x: cand.x, y: cand.y };
  }
  return pos;
}

const EDGE_POINT = { west: [-1000, 0], east: [1000, 0], north: [0, -1000], south: [0, 1000] };

// Moves every ship at the same time, checking asteroids and the map edge in small
// steps (they stop a ship mid-path). Ships pass through each other; see below.
// `plans` = { [shipId]: { speed, clicks } } (already sanitized). Ships are not mutated.
// Returns { ships, frames: { [id]: [pose per tick] }, events }.
export function simulateMove(ships, plans, scenario) {
  const sim = ships.filter((s) => s.alive).map((s) => ({ ...s, shields: { ...s.shields }, tempShields: { ...(s.tempShields || {}) } }));
  const byId = Object.fromEntries(sim.map((s) => [s.id, s]));
  const start = Object.fromEntries(sim.map((s) => [s.id, { x: s.x, y: s.y, heading: s.heading }]));
  const pose = Object.fromEntries(sim.map((s) => [s.id, { ...start[s.id] }]));
  const moving = new Set(sim.map((s) => s.id));
  const crashed = new Set();
  const frames = Object.fromEntries(sim.map((s) => [s.id, [{ ...pose[s.id] }]]));
  const events = [];

  const hit = (ship, px, py, amount) => {
    const at = { ...ship, ...pose[ship.id] };
    const d = applyDamage(ship, zoneFacing(at, px, py), stanceDamage(ship, amount)); // Brace halves collisions too
    if (ship.hull <= 0) ship.destroyed = true;
    return d;
  };
  const stop = (id) => { moving.delete(id); crashed.add(id); };

  for (let k = 1; k <= MOVE_TICKS; k++) {
    const t = k / MOVE_TICKS;
    const cand = {};
    for (const id of moving) cand[id] = poseAt(start[id], plans[id], t);
    for (const id of [...moving]) {
      const s = byId[id];
      const cls = classOf(s);
      const edge = outOfBounds(cand[id], cls, scenario.map);
      if (edge) {
        stop(id); delete cand[id];
        const [ex, ey] = EDGE_POINT[edge];
        const p = pose[id];
        events.push({ tick: k, kind: 'edge', a: id, x: p.x, y: p.y,
          damage: [hit(s, edge === 'west' || edge === 'east' ? ex : p.x, edge === 'north' || edge === 'south' ? ey : p.y, MOVE.edgeDamage)] });
        continue;
      }
      const rock = scenario.asteroids.find((r) => rectHitsCircle(cand[id], cls, r));
      if (rock) {
        stop(id); delete cand[id];
        const p = pose[id];
        events.push({ tick: k, kind: 'asteroid', a: id, x: (p.x + rock.x) / 2, y: (p.y + rock.y) / 2,
          damage: [hit(s, rock.x, rock.y, MOVE.asteroidDamage)] });
      }
    }
    for (const id of moving) pose[id] = cand[id];
    for (const s of sim) frames[s.id].push({ ...pose[s.id] });
  }

  // Ships fly through each other. Only ships whose outlines overlap where they END
  // collide: both are pulled back along their own paths, one tick at a time,
  // until they no longer overlap. Then collision / ram damage applies.
  const idx = Object.fromEntries(sim.map((s) => [s.id, MOVE_TICKS]));
  const polyAt = (s) => shipPolygon(s, frames[s.id][idx[s.id]]);
  const bumped = new Map(); // "idA|idB" -> [A, B]
  let overlapping = true;
  while (overlapping) {
    overlapping = false;
    for (let i = 0; i < sim.length; i++) {
      for (let j = i + 1; j < sim.length; j++) {
        const A = sim[i], B = sim[j];
        if (!polygonsOverlap(polyAt(A), polyAt(B))) continue;
        bumped.set(`${A.id}|${B.id}`, [A, B]);
        if (idx[A.id] === 0 && idx[B.id] === 0) continue; // can't separate (never expected)
        if (idx[A.id] > 0) idx[A.id]--;
        if (idx[B.id] > 0) idx[B.id]--;
        overlapping = true;
      }
    }
  }
  for (const s of sim) {
    const f = frames[s.id];
    const end = f[idx[s.id]];
    for (let k = idx[s.id] + 1; k <= MOVE_TICKS; k++) f[k] = { ...end };
    pose[s.id] = { ...end };
  }
  for (const [A, B] of bumped.values()) {
    crashed.add(A.id);
    crashed.add(B.id);
    const pa = pose[A.id], pb = pose[B.id];
    const ev = { tick: Math.max(idx[A.id], idx[B.id]), kind: 'ship', a: A.id, b: B.id,
      x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2, damage: [] };
    if (isEnemy(A, B)) {
      const ramA = FACTIONS[A.faction].traits.ram, ramB = FACTIONS[B.faction].traits.ram;
      const toB = ramA ? shipDef(A).ramDamage ?? ramA.enemyDamage : MOVE.enemyCollisionDamage;
      const toA = ramB ? shipDef(B).ramDamage ?? ramB.enemyDamage : ramA ? ramA.selfDamage : MOVE.enemyCollisionDamage;
      ev.ram = !!(ramA || ramB);
      ev.damage.push(hit(A, pb.x, pb.y, toA), hit(B, pa.x, pa.y, toB));
    }
    events.push(ev);
  }

  for (const s of sim) {
    const p = pose[s.id];
    s.x = p.x; s.y = p.y;
    s.heading = ((p.heading % 360) + 360) % 360;
    s.speed = crashed.has(s.id) ? shipDef(s).speed[0] : plans[s.id].speed;
    if (s.destroyed) s.alive = false;
    delete s.destroyed;
  }
  return { ships: sim, frames, events };
}

// Value of a faction's living ships, plus 1 per living squadron.
export function fleetValue(ships, faction, squads = []) {
  return ships.filter((s) => s.alive && s.faction === faction).reduce((n, s) => n + classOf(s).value, 0)
    + squads.filter((q) => q.alive && q.faction === faction).length * SQUADRON.value;
}

// Kill points a destroyed unit is worth (rules §10).
export const killValue = (u) => (isSquad(u) ? SQUADRON.value : classOf(u).value);

// ---------- Fleet building (rules §1) ----------
// Ship types a faction can buy, cheapest first.
export function factionShipTypes(faction) {
  return Object.keys(SHIPS).filter((t) => SHIPS[t].faction === faction)
    .sort((a, b) => SHIPS[a].cost - SHIPS[b].cost);
}

export function cheapestShipCost(faction) {
  return Math.min(...factionShipTypes(faction).map((t) => SHIPS[t].cost));
}

// Each player's share of their side's points (rounded down).
export function pointShare(teamSize) {
  return teamSize > 0 ? Math.floor(FLEET.sidePoints / teamSize) : 0;
}

// A player's fleet = [{ type, wing: [squadron types] }] (wing only for carriers).
export function fleetCost(entries) {
  return entries.reduce((n, e) => n + (SHIPS[e.type]?.cost || 0)
    + (e.wing || []).reduce((m, q) => m + (SQUADRONS[q]?.cost || 0), 0), 0);
}

// Why `type` can't be bought right now, or null if it can.
// `mine` = this player's fleet entries, `teamCount` = ships the whole side owns.
export function buyProblem(type, faction, mine, share, teamCount) {
  const def = SHIPS[type];
  if (!def || def.faction !== faction) return 'Not your faction';
  if (teamCount >= FLEET.maxShipsPerSide) return `Your side already has ${FLEET.maxShipsPerSide} ships`;
  if (fleetCost(mine) + def.cost > share) return 'Not enough points';
  return null;
}

// Why squadron `sqType` can't be added to the carrier at `mine[index]`, or null if it can.
export function squadBuyProblem(sqType, faction, mine, index, share) {
  const def = SQUADRONS[sqType];
  const e = mine[index];
  if (!def || def.faction !== faction || !e) return 'Not your faction';
  const slots = carrierSlots(e.type);
  if (!slots) return 'Not a carrier';
  if ((e.wing || []).length >= slots) return 'Carrier full';
  if (fleetCost(mine) + def.cost > share) return 'Not enough points';
  return null;
}
