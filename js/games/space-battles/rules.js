// Space Battles – shared rules. Pure functions used by both the TV and the phones.
// No DOM and no randomness here, so a phone's preview of a planned path matches
// exactly where the TV moves the ship (apart from collisions, which only the TV knows).
//
// A ship at runtime looks like:
// { id, type, faction, owner, x, y, heading, speed, hull, shields: { front, left, right, rear }, alive }
// plus `captain` (CAPTAINS id or null) and `letter` ('A', 'B'… when a side has several of that type).
import {
  FACTIONS, WEAPONS, RANGE_BANDS, CLASSES, SHIPS, MOVE, ARCS, ARC_DEFS, ZONES, FLEET, STANCES, STANCE_ORDER, CRITICALS,
  SQUADRONS, SQUADRON, SQUAD_ORDERS, HIT, SPECIALS, MINES, BATTLE_SIZES, CAPTAINS, CAPTAIN_ORDER,
} from './data.js';
//
// A squadron at runtime looks like:
// { id, kind: 'squad', type, faction, owner, carrier (ship id), slot (0.. in its wing), x, y,
//   hull (living craft), shields (living craft that still have their shield), alive }
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

// Display name of a unit ("Escort A", "Fighters squadron B"). The letter only appears when a side
// has more than one of that type.
export const unitName = (u) => {
  const l = u.letter ? ` ${u.letter}` : '';
  return isSquad(u) ? `${squadDef(u).short} squadron${l}` : `${SHIPS[u.type].short}${l}`;
};

// ---------- Captains ----------
export const captainOf = (u) => (u && CAPTAINS[u.captain]) || null;

// Captains a ship type (or, with `squad`, a squadron type) may take.
export function captainChoices(type, squad = false) {
  return CAPTAIN_ORDER.filter((id) => {
    const c = CAPTAINS[id];
    if (squad) return !!c.squadrons?.includes(type);
    if (c.squadrons) return false;
    if (c.ships) return c.ships.includes(type);
    return !!SHIPS[type] && (!c.factions || c.factions.includes(SHIPS[type].faction));
  });
}

export const maxHull = (ship) => shipDef(ship).hull + (captainOf(ship)?.hull || 0);

// Kairos: rotation (in clicks, + = right) the ship may make in Plan Fire. Invalid → 0.
export function sanitizeRotate(ship, r) {
  const max = captainOf(ship)?.fireRotate || 0;
  if (!max || critCount(ship, 'thrusters') || !Number.isInteger(r) || Math.abs(r) > max) return 0;
  return r;
}

// A copy of the ship turned `clicks` in place (used to aim with Kairos before shooting).
export const rotatedShip = (ship, clicks) => (clicks ? { ...ship, heading: normAngle(ship.heading + clicks * MOVE.clickDegrees) } : ship);

// Samuel Verity: the zone that regains a shield at the end of the round, or null (all full, or
// the Shield Generator is damaged). Front first, then the side with fewer shields (left on a tie),
// then the rear.
export function regenZone(ship) {
  if (!captainOf(ship)?.shieldRegen || critCount(ship, 'shieldGen')) return null;
  const max = shipDef(ship).shields;
  const low = (z) => ship.shields[z] < max[z];
  if (low('front')) return 'front';
  const sides = ['left', 'right'].filter(low);
  if (sides.length) return sides.length === 2 && ship.shields.right < ship.shields.left ? 'right' : sides[0];
  return low('rear') ? 'rear' : null;
}

// ---------- To hit ----------
// Every shot rolls a d10 and hits on HIT.base+ plus the target's agility, minus the shooter's
// accuracy. A 10 always hits. Agility: the target's class (squadrons: SQUADRON.agility), +1 with
// Wild Maneuvers. Accuracy: the shooter's stance (Wild −1, Targeted +1); a squadron's own
// `accuracy` plus Command (+1) when its carrier uses it. Point-defense ignores squadron agility.
// `attacker` may be a ship or a squadron; `wd` is the weapon (null for squadrons).
export function agilityOf(target) {
  if (isSquad(target)) return SQUADRON.agility;
  return (classOf(target).agility || 0) + (stanceOf(target).agility || 0);
}

// Bossim's Pack Leader: the best bonus from a living friendly leader (not the attacker itself)
// within range of the attacker, if the attacker's ship type is one it leads. `units` may also
// hold squadrons (they're skipped).
export function packBonus(attacker, units = []) {
  let best = 0;
  for (const u of units) {
    const pl = captainOf(u)?.packLeader;
    if (!pl || isSquad(u) || !u.alive || u.id === attacker.id || isEnemy(u, attacker) || !pl.types.includes(attacker.type)) continue;
    const max = RANGE_BANDS.find((b) => b.id === pl.range)?.max ?? 0;
    if (unitDistance(u, attacker) <= max) best = Math.max(best, pl.accuracy);
  }
  return best;
}

// `ships` = the units on the map: squadrons need it for the carrier's Command stance, ships for
// Pack Leader.
export function accuracyOf(attacker, ships = []) {
  if (isSquad(attacker)) {
    let a = (squadDef(attacker).accuracy || 0) + (captainOf(attacker)?.accuracy || 0);
    const c = ships.find((s) => s.id === attacker.carrier);
    // Command stance, or Amelia Dangerfield's Born Commander (always on; they don't stack).
    if (c?.alive) a += Math.max(stanceOf(c).squadAccuracy || 0, captainOf(c)?.alwaysCommand ? STANCES.command.squadAccuracy : 0);
    return a;
  }
  return (stanceOf(attacker).accuracy || 0) + packBonus(attacker, ships);
}

// The d10 roll needed to hit (1 = can't miss: auto-hit weapons like the Djnzuar Disruptor).
export function needToHit(attacker, wd, target, ships = []) {
  if (wd?.autoHit) return 1;
  if (wd?.pd && isSquad(target)) return HIT.base;
  return Math.max(2, HIT.base + agilityOf(target) - accuracyOf(attacker, ships));
}

// The roll a ship's weapon crits on: the weapon's own (Torpedo 9) or Targeted Attack's 9, else 10.
export const critOnOf = (ship, wd) => Math.min(wd.critOn || HIT.critOn, stanceOf(ship).critOn || HIT.critOn);

// Chance that one d10 roll hits: rolls of `need` to 10 (a 10 always hits).
export const chanceOf = (need) => Math.max(1, HIT.die + 1 - need) / HIT.die;

// Can weapon `wd` reach range band `band`?
const bandIndex = (band) => RANGE_BANDS.findIndex((b) => b.id === band);
export const inReach = (wd, band) => !!band && bandIndex(band) <= bandIndex(wd.reach);

// Chance one shot of `wd` from `attacker` hits `target` at `band` (0 if it can't fire at it).
export function hitChance(attacker, wd, band, target, units = []) {
  if (!inReach(wd, band)) return 0;
  if (isSquad(target) && wd.noSquadrons) return 0;
  return chanceOf(needToHit(attacker, wd, target, units));
}

// Carrier capacity (0 for ships that aren't carriers).
export const carrierSlots = (type) => SHIPS[type]?.squadrons || 0;
export const isCarrier = (ship) => carrierSlots(ship.type) > 0;

// Squadron types a faction can buy, cheapest first.
export function factionSquadTypes(faction) {
  return Object.keys(SQUADRONS).filter((t) => SQUADRONS[t].faction === faction)
    .sort((a, b) => SQUADRONS[a].cost - SQUADRONS[b].cost);
}

// Squadron types one carrier type may hold (the Queen only carries some).
export function carrierSquadTypes(type) {
  const def = SHIPS[type];
  return factionSquadTypes(def.faction).filter((t) => !def.carries || def.carries.includes(t));
}

// Living squadrons of one carrier (docked or launched).
export const wingOf = (carrierId, squads) => squads.filter((q) => q.alive && q.carrier === carrierId);

// A squadron that is out in space (alive and launched). Docked squadrons can't shoot or be shot.
export const inSpace = (u) => u.alive && !u.docked;

// Every squadron may get every order, except that ships-only squadrons (Bombers) can't Intercept.
export const squadOrderAllowed = (type, order) => !!SQUADRONS[type] && !!SQUAD_ORDERS[order]
  && !(order === 'intercept' && SQUADRONS[type].shipsOnly);

// One squadron's order from the phone: { order, target? } (see SQUAD_ORDERS). "Stay docked" only
// for docked squadrons, Return only for launched ones; Attack needs a living enemy ship or a
// launched enemy squadron (`units` = ships + squadrons). Invalid → null (keep the old order).
export function sanitizeSquadOrder(q, o, units) {
  const def = o && SQUAD_ORDERS[o.order];
  if (!def || (def.dockedOnly && !q.docked) || (def.launchedOnly && q.docked)) return null;
  if (!squadOrderAllowed(q.type, o.order)) return null;
  const out = { order: o.order };
  if (def.needsTarget) {
    const t = units.find((x) => x.id === o.target);
    if (!t || !inSpace(t) || !isEnemy(q, t)) return null;
    if (isSquad(t) && squadDef(q).shipsOnly) return null;
    out.target = t.id;
  }
  return out;
}

// Damage to a squadron (mutates it). `hits` = damage of each hit. Hits finish off a craft whose
// shield is already down first; otherwise a hit knocks off one craft's shield, or destroys it
// outright if it ignores shields or does 2+ damage. Returns { shieldLost, hullLost } (hull = craft).
export function applySquadHits(q, hits, ignoreShields = false) {
  let shieldLost = 0, hullLost = 0;
  for (const d of hits) {
    if (q.hull <= 0 || d <= 0) continue;
    if (q.hull > q.shields) { q.hull--; hullLost++; continue; }
    if (ignoreShields || d >= 2) { q.hull--; q.shields--; hullLost++; continue; }
    q.shields--;
    shieldLost++;
  }
  return { shieldLost, hullLost };
}

// Where a launched squadron appears: in a short row just behind its carrier (slot 0..3).
export function launchSpot(carrier, slot, map) {
  const L = classOf(carrier).length / 2 + 0.6;
  const c = Math.cos(carrier.heading * RAD), s = Math.sin(carrier.heading * RAD);
  const lx = -L, ly = (slot - 1) * (SQUADRON.size + 0.1);
  return {
    x: Math.max(SQUAD_R, Math.min(map.w - SQUAD_R, carrier.x + lx * c - ly * s)),
    y: Math.max(SQUAD_R, Math.min(map.h - SQUAD_R, carrier.y + lx * s + ly * c)),
  };
}

// Has a Return squadron reached its (living) carrier? Then it docks.
export function canDock(q, ships) {
  const c = ships.find((s) => s.id === q.carrier);
  return !!(c?.alive && pointPolygonDistance(q.x, q.y, shipPolygon(c)) - SQUAD_R <= SQUADRON.latchDist);
}

const nearest = (from, list) => list.reduce((best, u) => {
  const d = unitDistance(from, u);
  return !best || d < best.d ? { u, d } : best;
}, null);

// Where each launched squadron flies this round (squadrons move after ships, in straight lines, up
// to their speed in u, ignoring asteroids and ships, stopping at the map edge with no damage).
// Each squadron follows its own order (q.order):
//   (no target / 'escort' fallback): its own spot next to the carrier (stays put if it's gone).
//   Attack: until touching the target ship or squadron (if it's gone: the nearest enemy of the
//           same kind; no enemy ships left → wait by the carrier).
//   Intercept: at the nearest enemy squadron (where it was before squadrons moved), stopping
//              when touching it; Escort if there are none.
//   Return: until touching its carrier (stays put if the carrier is gone).
// `ships` = ships after their move. Returns { [squadId]: { from: {x,y}, to: {x,y} } }. Pure.
export function planSquadMoves(squads, ships, map) {
  const out = {};
  const flying = squads.filter(inSpace);
  const r = SQUAD_R;
  const clampX = (x) => Math.max(r, Math.min(map.w - r, x));
  const clampY = (y) => Math.max(r, Math.min(map.h - r, y));
  for (const q of flying) {
    const def = squadDef(q);
    const carrier = ships.find((s) => s.id === q.carrier);
    const o = q.order || { order: 'escort' };
    const enemyShips = ships.filter((s) => s.alive && isEnemy(q, s));
    const enemySquads = flying.filter((x) => isEnemy(q, x));
    let goal = null;
    let order = o.order;
    if (order === 'docked') order = 'escort'; // never expected for a launched squadron
    if (order === 'intercept' && !enemySquads.length) order = 'escort';
    if (order === 'return') {
      if (carrier?.alive) goal = { x: carrier.x, y: carrier.y, ship: carrier };
      else goal = { x: q.x, y: q.y };
    }
    if (order === 'intercept' && def.shipsOnly) order = 'escort';
    if (order === 'attack' && !def.shipsOnly) {
      // A squadron target: fly at it like Intercept (if it's gone, the nearest enemy squadron).
      const tq = enemySquads.find((x) => x.id === o.target);
      const wasSquad = !tq && squads.some((x) => x.id === o.target);
      const sq = tq || (wasSquad ? nearest(q, enemySquads)?.u : null);
      if (sq) {
        const ang = Math.atan2(sq.y - q.y, sq.x - q.x);
        const off = (q.slot - 1) * SQUADRON.size;
        goal = { x: sq.x - Math.sin(ang) * off, y: sq.y + Math.cos(ang) * off, squad: true };
      }
    }
    if (order === 'attack' && !goal) {
      let t = enemyShips.find((s) => s.id === o.target);
      if (!t) t = nearest(q, enemyShips)?.u;
      if (t) {
        // Aim a little to the side for each squadron of a carrier, so they don't stack.
        const cls = classOf(t);
        const ang = Math.atan2(t.y - q.y, t.x - q.x);
        const off = (q.slot - 1) * cls.width * 0.35;
        goal = { x: t.x - Math.sin(ang) * off, y: t.y + Math.cos(ang) * off, ship: t };
      } else order = 'escort';
    }
    if (order === 'intercept') {
      const t = nearest(q, enemySquads).u;
      const ang = Math.atan2(t.y - q.y, t.x - q.x);
      const off = (q.slot - 1) * SQUADRON.size;
      goal = { x: t.x - Math.sin(ang) * off, y: t.y + Math.cos(ang) * off, squad: true };
    }
    if (order === 'escort') {
      if (carrier?.alive) {
        const cls = classOf(carrier);
        const a = (carrier.heading + [120, 180, -120, 150][q.slot % 4]) * RAD;
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

// What a squadron shoots this round (close range only, asteroids never block). Attack: its target
// if it's in range. Intercept: the nearest enemy squadron in range. Otherwise (or if that's not
// possible) by role: fighters the nearest enemy squadron, else the nearest enemy ship; bombers only
// ever shoot ships. Docked squadrons neither shoot nor get shot. Returns the target unit or null.
// `units` = ships + squadrons.
export function squadAttackTarget(q, units) {
  if (!inSpace(q)) return null;
  const def = squadDef(q);
  const inRange = units.filter((u) => inSpace(u) && isEnemy(q, u) && rangeBand(unitDistance(q, u)) === 'close'
    && !(def.shipsOnly && isSquad(u)));
  const o = q.order || {};
  if (o.order === 'attack') {
    const t = inRange.find((u) => u.id === o.target);
    if (t) return t;
  }
  const sq = nearest(q, inRange.filter(isSquad));
  const sh = nearest(q, inRange.filter((u) => !isSquad(u)));
  const order = def.role === 'bomber' && o.order !== 'intercept' ? [sh, sq] : [sq, sh];
  return order.find(Boolean)?.u || null;
}

// Warden Screen: enemy squadrons attacking `ship` lose 1 shot if a living friendly ship with
// `screen` is within close range of it (the Warden itself included). Several don't stack.
export function screened(ship, ships) {
  return ships.some((w) => w.alive && !isEnemy(w, ship) && SHIPS[w.type].screen
    && (w.id === ship.id || rangeBand(shipDistance(w, ship)) === 'close'));
}

// Point-defense target: the nearest launched enemy squadron in close range (all PD shots go there).
export function pdTarget(ship, squads) {
  if (!(shipDef(ship).pd || []).length) return null;
  const inRange = squads.filter((q) => inSpace(q) && isEnemy(ship, q) && rangeBand(unitDistance(ship, q)) === 'close');
  return nearest(ship, inRange)?.u || null;
}

// Boarding Pod latch: the enemy ship whose outline this (launched) pod touches (or null).
export function latchTarget(q, ships) {
  if (!squadDef(q).latch || !inSpace(q)) return null;
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

// A target is in an arc if its center is within the arc's half-angle of the ship's nose
// (spinal ±15°, battery ±135°, turret anywhere).
export function inArc(ship, arc, target) {
  const half = ARC_DEFS[arc]?.half ?? 0;
  if (half >= 180) return true;
  const ang = Math.atan2(target.y - ship.y, target.x - ship.x) / RAD;
  return Math.abs(normAngle(ang - ship.heading)) <= half;
}

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
// The numbers of a stance choice: a stance id, or { id, wild? }. `wild` (Shuna) adds Wild
// Maneuvers on top of the main stance: accuracy, agility and clicks add up, speed change is the bigger.
export function stanceStats(st) {
  const s = typeof st === 'string' ? { id: st } : st || {};
  const main = STANCES[s.id] || STANCES.balanced;
  if (!s.wild || s.id === 'wild') return main;
  const w = STANCES.wild;
  const out = { ...main };
  for (const k of ['extraClicks', 'agility', 'accuracy']) out[k] = (main[k] || 0) + (w[k] || 0);
  out.speedChange = Math.max(main.speedChange || 0, w.speedChange || 0);
  return out;
}
export const stanceOf = (ship) => stanceStats(ship.stance || 'balanced');

// Stances this ship may ever use (in STANCE_ORDER): Command for carriers (not with Amelia, who
// always has it), Violent Turn for Grunts, captain stances for that captain.
export function shipStances(ship) {
  const cap = captainOf(ship);
  return STANCE_ORDER.filter((id) => {
    const st = STANCES[id];
    if (st.carrierOnly && (!isCarrier(ship) || cap?.alwaysCommand)) return false;
    if (st.ships && !st.ships.includes(ship.type)) return false;
    if (st.captain && ship.captain !== st.captain) return false;
    return true;
  });
}

// Stances this ship may pick this round (any stance may be repeated). A damaged Bridge allows
// only Critical Repairs (or No stance).
export function stanceOptions(ship) {
  if (critCount(ship, 'bridge')) return ['balanced', 'repairs'];
  return shipStances(ship);
}

// Shuna: may add Wild Maneuvers to another stance this round.
export const canAddWild = (ship, mainId) => !!captainOf(ship)?.freeWild && mainId !== 'wild' && !critCount(ship, 'bridge');

// How many times weapon `w` fires this round (Exterminate / Reckless Attack: twice).
export function weaponRepeats(ship, w) {
  const dw = stanceOf(ship).doubleWeapons;
  if (!dw || WEAPONS[w.weapon].once || WEAPONS[w.weapon].pd) return 1;
  return dw === 'all' || dw.includes(w.weapon) ? 2 : 1;
}

// ---------- Power and firing ----------
// Power this ship has to fire weapons this round (stances don't change it).
export function shipPower(ship) {
  return Math.max(0, shipDef(ship).power);
}

export const weaponPower = (w) => WEAPONS[w.weapon].power;

// Power a fire plan uses: [{ arc, targets: { [weaponIndex]: targetId } }].
export function planPower(ship, plan) {
  let n = 0;
  for (const a of plan || []) {
    const weapons = arcWeapons(ship, a.arc);
    for (const wi of Object.keys(a.targets || {})) if (weapons[wi]) n += weaponPower(weapons[wi]);
  }
  return n;
}

// Expected damage from one weapon of `ship` at `target` (shown on the phone). Ion Cannon damage
// only strips shields, so the phone labels it as shield damage. A Disruptor hit (a critical) is
// counted as 2. Criticals are otherwise left out.
export const CRIT_VALUE = 2;
export function expectedWeaponDamage(ship, w, band, target, units = []) {
  const wd = WEAPONS[w.weapon];
  return weaponRepeats(ship, w) * w.shots * hitChance(ship, wd, band, target, units) * (wd.effect === 'crit' ? CRIT_VALUE : wd.damage);
}

// A weapon knocked out by a Weapons Systems critical.
export const weaponOffline = (ship, arc, wi) => (ship.crits || []).some((c) => c.id === 'weapons' && c.arc === arc && c.wi === wi);

// Valid targets for one weapon: enemy, alive, in that weapon's arc and reach, and in line of
// sight. Sorted nearest first. Used-up once-per-game weapons and offline weapons have none.
// `units` = ships and squadrons. Asteroids never block shots at squadrons (they fly over them).
export function weaponTargets(ship, arc, wi, units, asteroids) {
  const w = arcWeapons(ship, arc)[wi];
  if (!w || weaponUsedUp(ship, arc, wi) || weaponOffline(ship, arc, wi)) return [];
  const wd = WEAPONS[w.weapon];
  const out = [];
  for (const t of units) {
    if (!t.alive || t.docked || !isEnemy(ship, t) || !inArc(ship, arc, t)) continue;
    const dist = unitDistance(ship, t);
    const band = rangeBand(dist);
    if (!hitChance(ship, wd, band, t, units)) continue;
    if (!isSquad(t) && !lineOfSight(ship, t, asteroids)) continue;
    out.push({ id: t.id, dist, band, squad: isSquad(t), need: needToHit(ship, wd, t, units), expected: expectedWeaponDamage(ship, w, band, t, units) });
  }
  return out.sort((a, b) => a.dist - b.dist);
}

// Fire plan for one ship: [{ arc, targets: { [weaponIndex]: targetId } }]. A weapon left out
// of `targets` holds its fire. The weapons fired can't cost more than the ship's power.
//
// Default when time runs out: the set of weapons (within power) with the most expected damage,
// each shooting the nearest target it can hit. Once-per-game weapons are held.
export function defaultFirePlan(ship, units, asteroids) {
  const cands = [];
  for (const arc of ARCS) {
    arcWeapons(ship, arc).forEach((w, wi) => {
      if (isOnce(w)) return;
      const t = weaponTargets(ship, arc, wi, units, asteroids)[0];
      if (t) cands.push({ arc, wi, id: t.id, cost: weaponPower(w), value: t.expected });
    });
  }
  const power = shipPower(ship);
  let best = { value: -1, picks: [] };
  for (let mask = 0; mask < 1 << cands.length; mask++) {
    let cost = 0, value = 0;
    const picks = [];
    cands.forEach((c, i) => { if (mask & (1 << i)) { cost += c.cost; value += c.value; picks.push(c); } });
    if (cost <= power && value > best.value) best = { value, picks };
  }
  return groupPicks(best.picks);
}

function groupPicks(picks) {
  const out = [];
  for (const arc of ARCS) {
    const mine = picks.filter((p) => p.arc === arc);
    if (mine.length) out.push({ arc, targets: Object.fromEntries(mine.map((p) => [p.wi, p.id])) });
  }
  return out;
}

// Keep only legal attacks: each weapon at a valid target, in plan order, while power lasts.
export function sanitizeFirePlan(ship, plan, units, asteroids) {
  if (!Array.isArray(plan)) return [];
  let left = shipPower(ship);
  const picks = [];
  const seen = new Set();
  for (const a of plan) {
    if (!a || !ARCS.includes(a.arc) || !a.targets || typeof a.targets !== 'object') continue;
    arcWeapons(ship, a.arc).forEach((w, wi) => {
      const id = a.targets[wi];
      const key = weaponKey(a.arc, wi);
      if (!id || seen.has(key) || weaponPower(w) > left) return;
      if (!weaponTargets(ship, a.arc, wi, units, asteroids).some((t) => t.id === id)) return;
      seen.add(key);
      left -= weaponPower(w);
      picks.push({ arc: a.arc, wi, id });
    });
  }
  return groupPicks(picks);
}

// ---------- Criticals (ships v3) ----------
// ship.crits = [{ id, arc?, wi?, fresh? }], oldest first, at most one per system (CRIT_POOL).
// `fresh` = caught this round; criticals marked `nextRound` in data.js (Hull Fire) only act once
// it's gone. The others act at once. Weapons Systems remembers the weapon as (arc, wi).
export const critCount = (ship, id) => (ship.crits || []).filter((c) => c.id === id && !(c.fresh && CRITICALS[id]?.nextRound)).length;

// Max speed (kept as a helper: Main Engines now stop speed changes instead of lowering it).
export const maxSpeed = (ship) => shipDef(ship).speed[1] + (captainOf(ship)?.speed || 0);

// Damage one attack, collision, mine or acid actually deals to `ship` (no stance changes it now).
export const stanceDamage = (ship, amount) => amount;

// A zone's shields count as 0 while the Shield Generator is damaged (they aren't lost).
export const shieldsOff = (ship, zone) => critCount(ship, 'shieldGen') > 0;

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

// ---------- Critical Repairs (ships v3) ----------
// Repair choice from the phone: { crit: index into ship.crits }. Invalid → null (default: oldest).
export function sanitizeRepair(ship, r) {
  if (!r || typeof r !== 'object') return null;
  if (!Number.isInteger(r.crit) || r.crit < 0 || r.crit >= (ship.crits || []).length) return null;
  return { crit: r.crit };
}

// Critical Repairs at the end of the round: removes the chosen critical (default: the oldest).
// Mutates the ship. Returns the removed critical's id, or null if there was nothing to repair.
export function applyRepair(ship, choice) {
  const crits = ship.crits || [];
  if (!crits.length) return null;
  const i = choice?.crit !== undefined && choice.crit < crits.length ? choice.crit : 0;
  return crits.splice(i, 1)[0].id;
}

// Shield Boost: the most shields a zone can hold (2 over its max).
export const boostCap = (ship, zone) => shipDef(ship).shields[zone] + (STANCES.shieldBoost.boostShields || 0);

// ---------- Special abilities (weapons v2) ----------
// Uses left of the ship's special ability `id` (0 if it doesn't have it). ship.specialUsed counts uses.
export function specialLeft(ship, id) {
  if (shipDef(ship).special !== id) return 0;
  return Math.max(0, SPECIALS[id].uses - (ship.specialUsed || 0));
}

// Where a dropped mine goes: just behind the ship's stern, kept on the map.
export function mineSpot(ship, map) {
  const d = classOf(ship).length / 2 + MINES.dropBehind;
  const a = ship.heading * RAD;
  return {
    x: Math.max(0.3, Math.min(map.w - 0.3, ship.x - Math.cos(a) * d)),
    y: Math.max(0.3, Math.min(map.h - 0.3, ship.y - Math.sin(a) * d)),
  };
}

// Smuggler's Hold choice from the phone: { target: shipId, kind: 'hull' | 'crit' }. The target is
// this ship or a living friendly ship in close range. Invalid → null (not used).
export function sanitizeHold(ship, h, ships) {
  if (!h || specialLeft(ship, 'smugglersHold') <= 0) return null;
  if (h.kind !== 'hull' && h.kind !== 'crit') return null;
  const t = ships.find((x) => x.id === h.target);
  if (!t || !t.alive || isEnemy(ship, t)) return null;
  if (t.id !== ship.id && rangeBand(shipDistance(ship, t)) !== 'close') return null;
  return { target: t.id, kind: h.kind };
}

// Ships a Smuggler's Hold can help: itself plus living friendly ships in close range.
export function holdTargets(ship, ships) {
  return ships.filter((t) => t.alive && !isEnemy(ship, t) && (t.id === ship.id || rangeBand(shipDistance(ship, t)) === 'close'));
}

// ---------- Movement ----------

// Speeds the ship may pick this round with stance `stanceId`: normally current −1 / same / +1,
// within its class range.
//   - Wild Maneuvers: change by up to 2. Pirates' free "home" burn (ship.burn): up to 2, up to 1 over max.
//   - Main Engines damaged: can't change speed (it still has to come back down if above max).
//   - Grappled (hit by a Grapple Harpoon last round): can't speed up.
export function speedOptions(ship, stanceId = 'balanced') {
  const st = stanceStats(stanceId);
  const min = shipDef(ship).speed[0];
  let max = maxSpeed(ship);
  const home = ship.burn && FACTIONS[ship.faction].traits.home;
  let change = 1;
  if (home) { change = home.speedChange; max += home.overMax; }
  if (st.speedChange) change = Math.max(change, st.speedChange);
  const clamp = (s) => Math.min(Math.max(s, min), max);
  if (critCount(ship, 'engines')) return [clamp(ship.speed)];
  const top = ship.grappled ? ship.speed : ship.speed + change;
  const out = [];
  for (let s = ship.speed - change; s <= top; s++) if (s >= min && s <= max) out.push(s);
  if (!out.length) out.push(clamp(ship.speed)); // e.g. coming back down from a burn
  return out;
}

// Turn clicks allowed per segment (speed 0: may rotate 1 click in place).
// Some ships turn better at certain speeds (`clicksAtSpeed` in data.js).
// Wild Maneuvers +1. A ship with `disrupted` set (hit by a Pirate Disruptor last round) gets 1
// less (min 0). Damaged Maneuvering Thrusters: 0 (the ship must fly straight).
export function maxClicks(ship, speed, stanceId = 'balanced') {
  if (critCount(ship, 'thrusters')) return 0;
  const def = shipDef(ship);
  const st = stanceStats(stanceId);
  let n = (speed === 0 ? 1 : def.clicksAtSpeed?.[speed] ?? def.clicks) + (captainOf(ship)?.clicks || 0);
  n += st.extraClicks || 0;
  return Math.max(0, n - (ship.disrupted ? 1 : 0));
}

// Emergency thrusters: a ship that hit the map edge or an asteroid last move (ship.recover) may
// turn up to MOVE.recoverClicks extra in its FIRST segment, so it can turn away from the wall
// (not with damaged Maneuvering Thrusters).
export function segmentClicks(ship, speed, stanceId, i) {
  if (critCount(ship, 'thrusters')) return 0;
  return maxClicks(ship, speed, stanceId) + (i === 0 && ship.recover ? MOVE.recoverClicks : 0);
}

// Violent Turn: clicks allowed in the turn at the end of the move (0 for other stances).
export function endTurnClicks(ship, stanceId) {
  if (critCount(ship, 'thrusters')) return 0;
  return stanceStats(stanceId).endTurnClicks || 0;
}

// Move plan: { speed, clicks, stance: { id, zone? }, endTurn? }.
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
  if (st.wild && canAddWild(ship, st.id)) out.wild = true;
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

export function sanitizeMovePlan(ship, plan, ships = [], squads = []) {
  if (!plan) return null;
  const stance = plan.stance ? sanitizeStance(ship, plan.stance, ships) : { id: 'balanced' };
  if (!stance) return null;
  if (!Number.isInteger(plan.speed) || !speedOptions(ship, stance).includes(plan.speed)) return null;
  const n = Math.max(1, plan.speed);
  if (!Array.isArray(plan.clicks) || plan.clicks.length !== n) return null;
  if (!plan.clicks.every((c, i) => Number.isInteger(c) && Math.abs(c) <= segmentClicks(ship, plan.speed, stance, i))) return null;
  const out = { speed: plan.speed, clicks: plan.clicks.slice(), stance };
  const et = endTurnClicks(ship, stance);
  if (et && plan.endTurn) {
    if (!Number.isInteger(plan.endTurn) || Math.abs(plan.endTurn) > et) return null;
    out.endTurn = plan.endTurn;
  }
  if (plan.mine && specialLeft(ship, 'mineDrop') > 0) out.mine = true;
  // Carriers: optional new order for each of its living squadrons (left out or invalid = keep the
  // old one). Comms Down is checked by the TV when the orders are applied.
  if (isCarrier(ship) && plan.squads && typeof plan.squads === 'object') {
    const orders = {};
    for (const q of wingOf(ship.id, squads)) {
      const o = sanitizeSquadOrder(q, plan.squads[q.id], [...ships, ...squads]);
      if (o) orders[q.id] = o;
    }
    if (Object.keys(orders).length) out.squads = orders;
  }
  return out;
}

// Where the ship is at time t (0..1) of the Move phase if nothing blocks it.
// Each segment: turn first, then fly straight for 2 u. Violent Turn (plan.endTurn): the path takes
// the first part of the time, then the ship turns in place at the end.
export function poseAt(start, plan, t) {
  if (plan.endTurn) {
    const T = 1 - MOVE.endTurnShare;
    if (t <= T) return pathPose(start, plan, t / T);
    const end = pathPose(start, plan, 1);
    return { ...end, heading: end.heading + plan.endTurn * MOVE.clickDegrees * Math.min(1, (t - T) / (1 - T)) };
  }
  return pathPose(start, plan, t);
}

function pathPose(start, plan, t) {
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

// Would this planned path hit the map edge or an asteroid (ignoring other ships, which only the
// TV knows about)? Returns { kind: 'edge' | 'asteroid', segment, x, y } for the first hit, or null.
// Used by the phone to warn before a crash.
export function pathHazard(ship, plan, map, asteroids = []) {
  const cls = classOf(ship);
  const steps = 60;
  for (let k = 1; k <= steps; k++) {
    const p = poseAt(ship, plan, k / steps);
    const edge = outOfBounds(p, cls, map);
    const rock = !edge && asteroids.find((r) => rectHitsCircle(p, cls, r));
    if (edge || rock) {
      const n = Math.max(1, plan.speed);
      return { kind: edge ? 'edge' : 'asteroid', segment: Math.min(n, Math.floor(((k - 1) / steps) * n) + 1), x: p.x, y: p.y };
    }
  }
  return null;
}

// Pose at the end of every segment (for the ghost path on the phone). The last point includes a
// Violent Turn's end turn.
export function planWaypoints(start, plan) {
  const n = Math.max(1, plan.speed);
  const pts = [{ x: start.x, y: start.y, heading: start.heading }];
  for (let k = 1; k < n; k++) pts.push(pathPose(start, plan, k / n));
  pts.push(poseAt(start, plan, 1));
  return pts;
}

// Shields absorb in this order: temporary shields (ship.tempShields, unused right now), then the
// zone's own shields (unless the Shield Generator is damaged), then hull. Mutates the ship.
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
  // Mines (neutral): a moving ship that comes within MINES.triggerDist sets one off.
  const mines = (scenario.mines || []).map((m) => ({ ...m }));
  const minesHit = []; // [{ id, tick }]

  const hit = (ship, px, py, amount) => {
    const at = { ...ship, ...pose[ship.id] };
    const d = applyDamage(ship, zoneFacing(at, px, py), stanceDamage(ship, amount)); // Brace halves collisions too
    if (ship.hull <= 0) ship.destroyed = true;
    return d;
  };
  const stop = (id) => { moving.delete(id); crashed.add(id); };
  const walled = new Map(); // id -> what it hit: { edge } or { rock } (for emergency thrusters)

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
        walled.set(id, { edge: true });
        const [ex, ey] = EDGE_POINT[edge];
        const p = pose[id];
        events.push({ tick: k, kind: 'edge', a: id, x: p.x, y: p.y,
          damage: [hit(s, edge === 'west' || edge === 'east' ? ex : p.x, edge === 'north' || edge === 'south' ? ey : p.y, MOVE.edgeDamage)] });
        continue;
      }
      const rock = scenario.asteroids.find((r) => rectHitsCircle(cand[id], cls, r));
      if (rock) {
        stop(id); delete cand[id];
        walled.set(id, { rock });
        const p = pose[id];
        events.push({ tick: k, kind: 'asteroid', a: id, x: (p.x + rock.x) / 2, y: (p.y + rock.y) / 2,
          damage: [hit(s, rock.x, rock.y, MOVE.asteroidDamage)] });
      }
    }
    for (const id of moving) pose[id] = cand[id];
    for (const id of moving) {
      const s = byId[id];
      if (s.destroyed) continue;
      const poly = shipPolygon(s, pose[id]);
      for (const m of mines) {
        if (m.gone || pointPolygonDistance(m.x, m.y, poly) > MINES.triggerDist) continue;
        m.gone = true;
        minesHit.push({ id: m.id, tick: k });
        events.push({ tick: k, kind: 'mine', a: id, x: m.x, y: m.y, damage: [hit(s, m.x, m.y, MINES.damage)] });
      }
    }
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
      if (toA > 0) ev.damage.push(hit(A, pb.x, pb.y, toA));
      if (toB > 0) ev.damage.push(hit(B, pa.x, pa.y, toB));
    }
    events.push(ev);
  }

  for (const s of sim) {
    const p = pose[s.id];
    // Emergency thrusters: a ship that hit the edge or an asteroid gets a big first-segment turn
    // next move. It's nudged just far enough away that turning in place can't touch it again.
    const w = walled.get(s.id);
    s.recover = !!w;
    if (w) {
      const cls = classOf(s);
      const room = Math.hypot(cls.length, cls.width) / 2 + 0.05;
      if (w.edge) {
        p.x = Math.max(room, Math.min(scenario.map.w - room, p.x));
        p.y = Math.max(room, Math.min(scenario.map.h - room, p.y));
      } else {
        const r = w.rock;
        const d = Math.hypot(p.x - r.x, p.y - r.y) || 1e-6;
        if (d < r.r + room) { p.x = r.x + ((p.x - r.x) / d) * (r.r + room); p.y = r.y + ((p.y - r.y) / d) * (r.r + room); }
      }
      frames[s.id][MOVE_TICKS] = { ...p };
    }
    s.x = p.x; s.y = p.y;
    s.heading = ((p.heading % 360) + 360) % 360;
    s.speed = crashed.has(s.id) ? shipDef(s).speed[0] : plans[s.id].speed;
    if (s.destroyed) s.alive = false;
    delete s.destroyed;
  }
  return { ships: sim, frames, events, minesHit };
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
export function pointShare(teamSize, sidePoints = FLEET.sidePoints) {
  return teamSize > 0 ? Math.floor(sidePoints / teamSize) : 0;
}

// Points and ship cap per side for a battle size (BATTLE_SIZES).
export function sizeRules(sizeId) {
  const sz = BATTLE_SIZES.find((s) => s.id === sizeId) || BATTLE_SIZES[0];
  return { ...sz, sidePoints: FLEET.sidePoints * sz.mult, maxShips: FLEET.maxShipsPerSide * sz.mult };
}

// The size meant for this many players.
export function sizeForPlayers(n) {
  return (BATTLE_SIZES.find((s) => n >= s.players[0] && n <= s.players[1]) || BATTLE_SIZES[BATTLE_SIZES.length - 1]).id;
}

// A player's fleet = [{ type, wing: [squadron types], captain?, wingCaptains?: [captain id or null per squadron] }]
// (wing only for carriers).
const capCost = (id) => CAPTAINS[id]?.cost || 0;
export function fleetCost(entries) {
  return entries.reduce((n, e) => n + (SHIPS[e.type]?.cost || 0) + capCost(e.captain)
    + (e.wing || []).reduce((m, q, k) => m + (SQUADRONS[q]?.cost || 0) + capCost(e.wingCaptains?.[k]), 0), 0);
}

// Why captain `capId` can't go on mine[index] (or, with `slot`, on that squadron of it), or null.
// A ship or squadron that already has a captain swaps it (only the price difference counts).
export function captainProblem(capId, mine, index, share, slot = null) {
  const e = mine[index];
  if (!e || !CAPTAINS[capId]) return 'No such captain';
  const squad = slot !== null;
  if (squad && !e.wing?.[slot]) return 'No such squadron';
  const type = squad ? e.wing[slot] : e.type;
  if (!captainChoices(type, squad).includes(capId)) return 'Can\'t take that captain';
  const cur = squad ? e.wingCaptains?.[slot] : e.captain;
  if (cur === capId) return 'Already aboard';
  if (fleetCost(mine) - capCost(cur) + capCost(capId) > share) return 'Not enough points';
  return null;
}

// Why `type` can't be bought right now, or null if it can.
// `mine` = this player's fleet entries, `teamCount` = ships the whole side owns.
export function buyProblem(type, faction, mine, share, teamCount, maxShips = FLEET.maxShipsPerSide) {
  const def = SHIPS[type];
  if (!def || def.faction !== faction) return 'Not your faction';
  if (teamCount >= maxShips) return `Your side already has ${maxShips} ships`;
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
  if (!carrierSquadTypes(e.type).includes(sqType)) return 'Can\'t carry that';
  if ((e.wing || []).length >= slots) return 'Carrier full';
  if (fleetCost(mine) + def.cost > share) return 'Not enough points';
  return null;
}
