// Delve – builds a random labyrinth: a 7×7 grid where about 27 squares are rooms,
// joined by doors into a twisty maze (plus a few loops). The Entrance is on the bottom
// edge and the Black Gate (boss) is the room farthest from it.
import { GRID, ROOM_COUNT, MONSTERS_BY_TIER, TRAPS_BY_TIER, ENCOUNTERS } from './data.js';

export const DIRS = {
  n: { dx: 0, dy: -1, opp: 's', name: 'North' },
  e: { dx: 1, dy: 0, opp: 'w', name: 'East' },
  s: { dx: 0, dy: 1, opp: 'n', name: 'South' },
  w: { dx: -1, dy: 0, opp: 'e', name: 'West' },
};
export const key = (x, y) => `${x},${y}`;
const rand = (n) => Math.floor(Math.random() * n);
const pickOne = (a) => a[rand(a.length)];
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function weighted(table) { // { name: weight }
  let total = 0; for (const w of Object.values(table)) total += w;
  let r = Math.random() * total;
  for (const [k, w] of Object.entries(table)) { r -= w; if (r < 0) return k; }
  return Object.keys(table)[0];
}

function makeRoom(x, y) {
  return { x, y, key: key(x, y), doors: { n: false, e: false, s: false, w: false }, type: 'empty', tier: 1, dist: 0,
    visited: false, cleared: false, seed: rand(1e9), peek: null };
}

export function generate() {
  const rooms = new Map();
  const ex = 1 + rand(GRID - 2), ey = GRID - 1;
  const start = makeRoom(ex, ey);
  rooms.set(start.key, start);
  const list = [start];
  // "Growing tree": usually grow from the newest room (long twisty paths), sometimes
  // from a random one (side branches).
  let guard = 0;
  while (rooms.size < ROOM_COUNT && guard++ < 5000) {
    const from = Math.random() < 0.6 ? list[list.length - 1 - rand(Math.min(3, list.length))] : pickOne(list);
    const options = Object.entries(DIRS).filter(([, d]) => {
      const nx = from.x + d.dx, ny = from.y + d.dy;
      return nx >= 0 && ny >= 0 && nx < GRID && ny < GRID && !rooms.has(key(nx, ny));
    });
    if (!options.length) continue;
    const [dir, d] = pickOne(options);
    const r = makeRoom(from.x + d.dx, from.y + d.dy);
    from.doors[dir] = true;
    r.doors[d.opp] = true;
    rooms.set(r.key, r);
    list.push(r);
  }
  // a few loops so it isn't a pure tree
  let loops = 0;
  for (const r of shuffle([...list])) {
    if (loops >= 3) break;
    for (const [dir, d] of shuffle(Object.entries(DIRS))) {
      const n = rooms.get(key(r.x + d.dx, r.y + d.dy));
      if (n && !r.doors[dir] && Math.random() < 0.5) { r.doors[dir] = true; n.doors[d.opp] = true; loops++; break; }
    }
  }
  // distances from the entrance
  const q = [start]; start.dist = 0;
  const seen = new Set([start.key]);
  while (q.length) {
    const r = q.shift();
    for (const [dir, d] of Object.entries(DIRS)) {
      if (!r.doors[dir]) continue;
      const n = rooms.get(key(r.x + d.dx, r.y + d.dy));
      if (n && !seen.has(n.key)) { seen.add(n.key); n.dist = r.dist + 1; q.push(n); }
    }
  }
  const maxDist = Math.max(...list.map((r) => r.dist));
  const far = list.filter((r) => r.dist >= maxDist - 1);
  const boss = far.sort((a, b) => b.dist - a.dist || doorCount(a) - doorCount(b))[0];

  start.type = 'entrance'; start.cleared = true; start.visited = true;
  boss.type = 'boss'; boss.tier = 4; boss.monster = 'warden';

  const others = shuffle(list.filter((r) => r !== start && r !== boss));
  // tier from how deep the room is
  for (const r of others) {
    const k = r.dist / maxDist;
    r.tier = k < 0.34 ? 1 : k < 0.68 ? 2 : 3;
    if (r.tier > 1 && Math.random() < 0.2) r.tier--;
  }
  // one merchant around the middle, two shrines, then the rest by chance
  const mid = others.filter((r) => r.dist / maxDist > 0.3 && r.dist / maxDist < 0.75);
  const merchant = mid[0] || others[0];
  merchant.type = 'merchant';
  const pool = others.filter((r) => r !== merchant);
  pool.slice(0, 2).forEach((r) => { r.type = 'shrine'; });
  const encounters = shuffle(ENCOUNTERS.map((e) => e.id));
  for (const r of pool.slice(2)) {
    r.type = weighted({ monster: 36, empty: 14, trap: 14, treasure: 16, encounter: 20 });
    if (r.dist === 1 && r.type === 'trap') r.type = 'treasure';
    if (r.type === 'encounter' && !encounters.length) r.type = 'monster';
    if (r.type === 'monster') r.monster = pickOne(MONSTERS_BY_TIER[r.tier]);
    if (r.type === 'trap') r.trap = pickOne(TRAPS_BY_TIER[r.tier]);
    if (r.type === 'encounter') r.encounter = encounters.pop();
    if (r.type === 'treasure') {
      r.chest = weighted(r.tier === 1 ? { plain: 50, locked: 35, trapped: 15 } : { plain: 30, locked: 30, trapped: 25, mimic: 15 });
      if (r.chest === 'trapped') r.trap = pickOne(TRAPS_BY_TIER[r.tier].filter((t) => t !== 'ceiling'));
    }
  }
  return { rooms, start: start.key, boss: boss.key, maxDist };
}

function doorCount(r) { return Object.values(r.doors).filter(Boolean).length; }

// Shortest path of room keys from a to b (for "show me the way" rewards).
export function pathBetween(rooms, a, b) {
  const prev = new Map([[a, null]]);
  const q = [a];
  while (q.length) {
    const k = q.shift();
    if (k === b) break;
    const r = rooms.get(k);
    for (const [dir, d] of Object.entries(DIRS)) {
      if (!r.doors[dir]) continue;
      const nk = key(r.x + d.dx, r.y + d.dy);
      if (rooms.has(nk) && !prev.has(nk)) { prev.set(nk, k); q.push(nk); }
    }
  }
  const out = [];
  for (let k = b; k; k = prev.get(k)) out.unshift(k);
  return out[0] === a ? out : [];
}
