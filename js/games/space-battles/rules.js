// Space Battles – shared rules. Pure functions used by both the TV and the phones.
// No DOM and no randomness here, so a phone's preview of a planned path matches
// exactly where the TV moves the ship (apart from collisions, which only the TV knows).
//
// A ship at runtime looks like:
// { id, type, faction, owner, x, y, heading, speed, hull, shields: { front, left, right, rear }, alive }
import { FACTIONS, WEAPONS, RANGE_BANDS, CLASSES, SHIPS, MOVE, ARCS } from './data.js';

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

// Expected damage from one arc at one range band (shown on the phone).
export function expectedDamage(ship, arc, band) {
  let total = 0;
  for (const w of arcWeapons(ship, arc)) {
    const wd = WEAPONS[w.weapon];
    total += w.shots * (wd.hit[band] || 0) * wd.damage;
  }
  return total;
}

export function arcCanReach(ship, arc, band) {
  return arcWeapons(ship, arc).some((w) => WEAPONS[w.weapon].hit[band]);
}

// Valid targets for one arc: enemy, alive, in arc, in range of a weapon in that arc,
// and in line of sight. Sorted nearest first.
export function validTargets(ship, arc, ships, asteroids) {
  const out = [];
  for (const t of ships) {
    if (!t.alive || !isEnemy(ship, t) || !inArc(ship, arc, t)) continue;
    const dist = shipDistance(ship, t);
    const band = rangeBand(dist);
    if (!band || !arcCanReach(ship, arc, band)) continue;
    if (!lineOfSight(ship, t, asteroids)) continue;
    out.push({ id: t.id, dist, band, expected: expectedDamage(ship, arc, band) });
  }
  return out.sort((a, b) => a.dist - b.dist);
}

// Default when time runs out: the 2 best arcs, each at its nearest valid target.
export function defaultFirePlan(ship, ships, asteroids) {
  const options = [];
  for (const arc of ARCS) {
    const t = validTargets(ship, arc, ships, asteroids)[0];
    if (t) options.push({ arc, targetId: t.id, expected: t.expected });
  }
  options.sort((a, b) => b.expected - a.expected);
  return options.slice(0, 2).map(({ arc, targetId }) => ({ arc, targetId }));
}

// Keep only legal attacks: up to 2 different arcs, each with a valid target.
export function sanitizeFirePlan(ship, plan, ships, asteroids) {
  if (!Array.isArray(plan)) return [];
  const out = [];
  const used = new Set();
  for (const a of plan) {
    if (out.length >= 2) break;
    if (!a || !ARCS.includes(a.arc) || used.has(a.arc)) continue;
    if (!validTargets(ship, a.arc, ships, asteroids).some((t) => t.id === a.targetId)) continue;
    used.add(a.arc);
    out.push({ arc: a.arc, targetId: a.targetId });
  }
  return out;
}

// ---------- Movement ----------

// Speeds the ship may pick this round: current −1 / same / +1, within its class range.
// A ship with `burn` set (Pirates' "every ship is home") moves as if using Full Burn:
// change by up to 2, and may go up to 1 above max speed.
export function speedOptions(ship) {
  let [min, max] = shipDef(ship).speed;
  let change = 1;
  const home = ship.burn && FACTIONS[ship.faction].traits.home;
  if (home) { change = home.speedChange; max += home.overMax; }
  const out = [];
  for (let s = ship.speed - change; s <= ship.speed + change; s++) if (s >= min && s <= max) out.push(s);
  if (!out.length) out.push(Math.min(Math.max(ship.speed, min), max)); // e.g. coming back down from a burn
  return out;
}

// Turn clicks allowed per segment (speed 0: may rotate 1 click in place).
// Some ships turn better at certain speeds (`clicksAtSpeed` in data.js).
export function maxClicks(ship, speed) {
  if (speed === 0) return 1;
  const def = shipDef(ship);
  return def.clicksAtSpeed?.[speed] ?? def.clicks;
}

export function defaultMovePlan(ship) {
  const opts = speedOptions(ship);
  const speed = opts.includes(ship.speed) ? ship.speed : opts[0];
  return { speed, clicks: new Array(Math.max(1, speed)).fill(0) };
}

export function sanitizeMovePlan(ship, plan) {
  if (!plan || !Number.isInteger(plan.speed) || !speedOptions(ship).includes(plan.speed)) return null;
  const n = Math.max(1, plan.speed);
  if (!Array.isArray(plan.clicks) || plan.clicks.length !== n) return null;
  const mc = maxClicks(ship, plan.speed);
  if (!plan.clicks.every((c) => Number.isInteger(c) && Math.abs(c) <= mc)) return null;
  return { speed: plan.speed, clicks: plan.clicks.slice() };
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

// Shields absorb first, the rest goes to hull. Mutates the ship.
export function applyDamage(ship, zone, amount) {
  const shieldLost = Math.min(ship.shields[zone], amount);
  ship.shields[zone] -= shieldLost;
  const hullLost = Math.min(ship.hull, amount - shieldLost);
  ship.hull -= hullLost;
  return { shipId: ship.id, zone, amount, shieldLost, hullLost };
}

const EDGE_POINT = { west: [-1000, 0], east: [1000, 0], north: [0, -1000], south: [0, 1000] };

// Moves every ship at the same time, checking asteroids and the map edge in small
// steps (they stop a ship mid-path). Ships pass through each other; see below.
// `plans` = { [shipId]: { speed, clicks } } (already sanitized). Ships are not mutated.
// Returns { ships, frames: { [id]: [pose per tick] }, events }.
export function simulateMove(ships, plans, scenario) {
  const sim = ships.filter((s) => s.alive).map((s) => ({ ...s, shields: { ...s.shields } }));
  const byId = Object.fromEntries(sim.map((s) => [s.id, s]));
  const start = Object.fromEntries(sim.map((s) => [s.id, { x: s.x, y: s.y, heading: s.heading }]));
  const pose = Object.fromEntries(sim.map((s) => [s.id, { ...start[s.id] }]));
  const moving = new Set(sim.map((s) => s.id));
  const crashed = new Set();
  const frames = Object.fromEntries(sim.map((s) => [s.id, [{ ...pose[s.id] }]]));
  const events = [];

  const hit = (ship, px, py, amount) => {
    const at = { ...ship, ...pose[ship.id] };
    const d = applyDamage(ship, zoneFacing(at, px, py), amount);
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

export function fleetValue(ships, faction) {
  return ships.filter((s) => s.alive && s.faction === faction).reduce((n, s) => n + classOf(s).value, 0);
}
