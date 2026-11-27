// Delve – draws the TV picture: the side-view room "stage" (walls, archway doors, floor,
// torches and lighting), the actors in it, and the room map panel on the right.
// Everything is drawn at 480×270 and scaled up with crisp pixels.
import { sprite, scaled, hash, RAMP, FLAT } from './art.js';
import { GRID } from './data.js';

export const W = 480, H = 270, SW = 336;   // whole picture, scene width
export const FLOOR_Y = 178;
export const HERO_X = 96, FOE_X = 238, FEET = 240;
export const ARCH_X = { w: 56, n: 168, e: 280 };
const SPRING = 82, RI = 25, RO = 31;

const PALETTES = [
  { brick: ['#5a544c', '#524c45', '#615a51', '#4b4640', '#57514a'], arch: ['#7a756c', '#706a62'], pillar: ['#77716a', '#68625b', '#4e4943'] },
  { brick: ['#4c5058', '#454950', '#53575f', '#3f434a', '#4a4e55'], arch: ['#6d727b', '#646971'], pillar: ['#6c717a', '#5e636b', '#464a51'] },
  { brick: ['#58503f', '#4f483a', '#605745', '#494236', '#544c3d'], arch: ['#787058', '#6e6650'], pillar: ['#746b55', '#655d4a', '#4b4537'] },
];
const STONE = ['#6a6c72', '#62646b', '#70727a', '#5c5e65', '#68645f'];
const pick = (arr, r) => arr[Math.floor(r * arr.length)];

// ---------- static room background (cached per room) ----------
const sceneCache = new Map();
export function roomScene(room) {
  const ck = `${room.key}|${Object.values(room.doors).join('')}`;
  if (sceneCache.has(ck)) return sceneCache.get(ck);
  const cv = document.createElement('canvas'); cv.width = SW; cv.height = H;
  const s = cv.getContext('2d');
  const P = (c, x, y, w = 1, h = 1) => { s.fillStyle = c; s.fillRect(x, y, w, h); };
  const seed = room.seed;
  const R = (k) => hash(seed % 9973, k, seed % 131);
  const pal = PALETTES[seed % PALETTES.length];

  // back wall bricks
  P('#1d1b19', 0, 0, SW, FLOOR_Y);
  for (let r = 0; r * 8 < FLOOR_Y; r++) {
    const off = (r % 2) * 8;
    for (let c = -1; c * 16 < SW; c++) {
      const x = c * 16 + off, y = r * 8;
      P(pick(pal.brick, hash(c, r, seed % 977)), x + 1, y + 1, 15, 7);
      P('rgba(255,240,220,.08)', x + 1, y + 1, 15, 1);
      if (hash(c, r, seed % 89 + 4) > 0.72) P('rgba(0,0,0,.18)', x + 2 + Math.floor(hash(c, r, 5) * 10), y + 3, 3, 2);
    }
  }
  const isBoss = room.type === 'boss';
  // archways: open doors are dark passages, missing doors are bricked-up arches
  for (const [dir, cx] of Object.entries(ARCH_X)) {
    if (isBoss && dir === 'n') continue;
    const open = room.doors[dir];
    for (let y = SPRING - RO; y < FLOOR_Y; y++) for (let x = cx - RO; x <= cx + RO; x++) {
      const dx = x - cx, dy = y - SPRING;
      const dist = y <= SPRING ? Math.hypot(dx, dy) : Math.abs(dx);
      if (dist <= RI) {
        if (open) P(y > FLOOR_Y - 30 ? '#0a090d' : '#060509', x, y);
        else { // bricked up
          const br = Math.floor((y - (SPRING - RO)) / 6), bc = Math.floor((x + (br % 2) * 4) / 8);
          const edge = (y - (SPRING - RO)) % 6 === 0 || (x + (br % 2) * 4) % 8 === 0;
          P(edge ? '#1b1917' : pick(pal.brick, hash(bc, br, 31)), x, y);
          P('rgba(0,0,0,.35)', x, y);
        }
      } else if (dist <= RO) {
        const seg = y <= SPRING ? Math.floor((Math.atan2(dy, dx) + Math.PI) / (Math.PI / 9)) : Math.floor((y - SPRING) / 9) + 20;
        const edge = y <= SPRING ? ((Math.atan2(dy, dx) + Math.PI) % (Math.PI / 9)) < 0.05 : (y - SPRING) % 9 === 0;
        P(edge ? '#2a2724' : (hash(seg, cx, 9) > 0.5 ? pal.arch[0] : pal.arch[1]), x, y);
        if (dist > RO - 1.2 && !edge) P('#8d877d', x, y);
      }
    }
    P('#8a847a', cx - 4, SPRING - RO - 2, 9, 8); P('#2a2724', cx - 4, SPRING - RO + 6, 9, 1);
    if (open) {
      // cobwebs and a far-off door
      if (R(cx) > 0.3) {
        for (let i = 0; i < 12; i++) { P('rgba(220,215,200,.33)', cx - RI + 3 + i, SPRING - 18 + i, 1, 1); P('rgba(220,215,200,.28)', cx - RI + 3, SPRING - 18 + i, 1, 1); }
        for (let i = 0; i < 8; i++) P('rgba(220,215,200,.28)', cx - RI + 3 + i, SPRING - 12 + Math.floor(i * 0.4), 1, 1);
      }
      if (R(cx + 1) > 0.5) for (let i = 0; i < 10; i++) P('rgba(220,215,200,.28)', cx + RI - 4 - i, SPRING - 14 + i, 1, 1);
      P('#0e0c11', cx - 7, FLOOR_Y - 26, 14, 26); P('#15121a', cx - 6, FLOOR_Y - 25, 12, 25);
    }
  }
  if (isBoss) drawGate(P);
  // pillars with capitals and sconces
  [112, 224].forEach((px, i) => {
    P('#2a2724', px - 9, 22, 18, FLOOR_Y - 22);
    for (let y = 24; y < FLOOR_Y; y++) {
      P(pal.pillar[0], px - 7, y, 3, 1); P(pal.pillar[1], px - 4, y, 8, 1); P(pal.pillar[2], px + 4, y, 3, 1);
      if ((y - 24) % 14 === 0) P('#2a2724', px - 7, y, 14, 1);
    }
    P('#827c72', px - 11, 16, 22, 6); P('#5e5952', px - 11, 21, 22, 2); P('#2a2724', px - 11, 23, 22, 1);
    P('#827c72', px - 11, FLOOR_Y - 6, 22, 6); P('#5e5952', px - 11, FLOOR_Y - 2, 22, 2);
    P('#2b2e33', px - 2, 96, 4, 6); P('#3a3e46', px - 4, 94, 8, 2);
    if (R(40 + i) > 0.55) { // tattered banner
      const col = R(50 + i) > 0.5 ? ['#6b1a15', '#4a120f', '#8a2a1e'] : ['#2a3550', '#1b2338', '#3c4a6c'];
      for (let y = 26; y < 76; y++) {
        const w = y > 66 ? 12 - (y % 3) * 3 : 12;
        P(y < 28 ? '#2b1b10' : col[0], px - 6, y, w, 1);
        if (y >= 28) { P(col[1], px - 6, y, 2, 1); P(col[2], px - 3, y, 1, 1); }
      }
      for (let y = 40; y < 52; y++) P('#957525', px - 1, y, 2, 1);
      P('#957525', px - 4, 44, 8, 2);
      P('#1d1b19', px + 2, 58, 4, 4); P('#1d1b19', px - 5, 70, 3, 6);
    }
  });
  // hanging chains
  if (R(60) > 0.35) [[140, 20 + Math.floor(R(61) * 30)], [196, 20 + Math.floor(R(62) * 30)]].forEach(([cx, len]) => {
    for (let y = 0; y < len; y += 4) { P('#4a4d54', cx - 1, y, 3, 3); P('#1d1b19', cx, y + 1, 1, 1); }
    P('#5a5e66', cx - 3, len, 7, 3); P('#1d1b19', cx - 1, len + 1, 3, 2);
  });
  // floor
  P('#202024', 0, FLOOR_Y, SW, H - FLOOR_Y);
  let fy = FLOOR_Y, row = 0;
  for (const rh of [9, 11, 13, 16, 19, 23, 27]) {
    const bw = 22 + row * 9, off = Math.floor(hash(row, 1, seed % 50) * bw);
    for (let x = -off; x < SW; x += bw) {
      const w = bw - 1 - Math.floor(hash(x, row, 6) * 4);
      P(pick(STONE, hash(x, row, 7 + seed % 13)), x + 1, fy + 1, w, rh - 1);
      P('rgba(255,255,255,.07)', x + 1, fy + 1, w, 1);
      P('rgba(0,0,0,.25)', x + 1, fy + rh - 1, w, 1);
      for (let k = 0; k < 6; k++) P('rgba(0,0,0,.15)', x + 2 + Math.floor(hash(x, row, k + 20) * (w - 3)), fy + 2 + Math.floor(hash(row, x, k + 30) * (rh - 3)), 2, 1);
    }
    fy += rh; row++;
  }
  P('rgba(0,0,0,.55)', 0, FLOOR_Y, SW, 3);
  // south door: a dark gap in the foreground
  if (room.doors.s) {
    const g = s.createLinearGradient(0, H - 26, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.85)');
    s.fillStyle = g; s.fillRect(138, H - 26, 60, 26);
  }
  // moss, blood and bones
  for (let m = 0; m < 4; m++) {
    if (R(70 + m) < 0.4) continue;
    const x = Math.floor(R(80 + m) * (SW - 20)), w = 6 + Math.floor(R(90 + m) * 14), y = m < 2 ? FLOOR_Y - 4 : 60 + Math.floor(R(95 + m) * 90);
    for (let i = 0; i < w; i++) { const hgt = 1 + Math.floor(hash(x + i, y, 4) * 4); P(i % 2 ? '#3d5a28' : '#4f7232', x + i, y + 4 - hgt, 1, hgt); }
  }
  for (let b = 0; b < 3; b++) {
    if (R(100 + b) < 0.45) continue;
    const bx = 10 + Math.floor(R(110 + b) * (SW - 60)), by = 200 + Math.floor(R(120 + b) * 50), w = 14 + Math.floor(R(130 + b) * 20);
    P('#4a0e0c', bx, by, w, 4); P('#4a0e0c', bx + 3, by - 1, w - 6, 6); P('#6b1410', bx + 4, by, Math.max(2, w - 10), 2);
  }
  for (let b = 0; b < 3; b++) {
    if (R(140 + b) < 0.5) continue;
    const x = Math.floor(R(150 + b) * (SW - 20)), y = 188 + Math.floor(R(160 + b) * 12);
    P('#b3a88c', x, y, 7, 6); P('#e3d8bd', x + 1, y, 4, 2); P('#0b090d', x + 1, y + 2, 2, 2); P('#0b090d', x + 4, y + 2, 2, 2); P('#776e5c', x + 2, y + 5, 3, 1);
    P('#b3a88c', x - 6, y + 9, 12, 2);
  }
  if (room.type === 'entrance') {
    // light spilling down a stair on the left
    for (let i = 0; i < 6; i++) P('#7b7468', 4 + i * 6, FLOOR_Y - 6 - i * 10, 30, 4);
  }
  sceneCache.set(ck, cv);
  return cv;
}

function drawGate(P) {
  // The Black Gate: a huge iron door in the north arch, glowing red at the seams
  const cx = ARCH_X.n;
  for (let y = 30; y < FLOOR_Y; y++) for (let x = cx - 44; x <= cx + 44; x++) {
    const dx = x - cx, top = 74;
    const inside = y >= top ? Math.abs(dx) <= 40 : Math.hypot(dx, (y - top) * 1.0) <= 40;
    const rim = y >= top ? Math.abs(dx) <= 44 : Math.hypot(dx, y - top) <= 44;
    if (inside) {
      const bar = Math.abs(dx) % 10 < 2;
      P(bar ? '#2a2c33' : '#121116', x, y);
      if (Math.abs(dx) < 1) P('#5a0d0a', x, y);
    } else if (rim) P('#3a3532', x, y);
  }
  for (let y = 96; y < FLOOR_Y; y += 22) for (let x = cx - 40; x <= cx + 40; x++) P('#2a2c33', x, y, 1, 3);
}

// ---------- lighting ----------
const LB = 2, LW = SW / LB, LH = H / LB;
let lc = null, lctx = null, img = null;
function lightCanvas() {
  if (!lc) { lc = document.createElement('canvas'); lc.width = LW; lc.height = LH; lctx = lc.getContext('2d'); img = lctx.createImageData(LW, LH); }
  return lc;
}

// ---------- one frame of the stage ----------
// v: { room, hero:{id, x, feet, alpha, dead, flash}, foe:{id, x, feet, scale, flip, alpha, flash, dy}, props:[{id,x,feet,scale}],
//      dark, fade (0..1 black), shake }
export function drawStage(ctx, t, v) {
  ctx.save();
  if (v.shake) ctx.translate(Math.round((Math.random() - 0.5) * v.shake), Math.round((Math.random() - 0.5) * v.shake));
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(roomScene(v.room), 0, 0);
  for (const p of v.props || []) drawActor(ctx, p.id, p.x, p.feet, p.scale || 3, false, 1, 0);
  if (v.foe && v.foe.id) {
    const f = v.foe;
    const sway = f.still ? 0 : Math.round(Math.sin(t / 420) * 1);
    shadow(ctx, f.x, f.feet, f.scale === 4 ? 70 : 46);
    drawActor(ctx, f.id, f.x + sway, f.feet + (f.dy || 0), f.scale || 3, f.flip !== false, f.alpha ?? 1, f.flash || 0);
  }
  if (v.hero && v.hero.id) {
    const h = v.hero;
    if (h.dead) {
      const spr = scaled(h.id, 3);
      ctx.save(); ctx.globalAlpha = 0.9; ctx.translate(h.x, h.feet - 6); ctx.rotate(-Math.PI / 2);
      ctx.drawImage(spr, -spr.width / 2, -spr.height / 2); ctx.restore();
    } else {
      shadow(ctx, h.x, h.feet, 40);
      drawActor(ctx, h.id, h.x, h.feet, 3, false, h.alpha ?? 1, h.flash || 0);
    }
  }
  // lighting (multiply) – two wall sconces plus a little glow around the actors
  const dim = v.dark ? 0.45 : 1;
  const sconces = [{ x: 112, y: 90 }, { x: 224, y: 90 }];
  const lights = sconces.map((L, i) => ({ x: L.x, y: L.y, r: (92 + Math.sin(t / 150 + i * 2) * 3 + (hash(Math.floor(t / 90), i) - 0.5) * 6) * (v.dark ? 0.6 : 1), k: dim }));
  if (v.hero) lights.push({ x: v.hero.x, y: v.hero.feet - 40, r: 66, k: 0.55 * dim });
  if (v.foe && v.foe.id) lights.push({ x: v.foe.x, y: v.foe.feet - 40, r: 66, k: 0.5 * dim });
  if (v.room.type === 'boss') lights.push({ x: ARCH_X.n, y: 120, r: 70, k: 0.6, red: true });
  lightCanvas();
  const d = img.data;
  for (let by = 0; by < LH; by++) for (let bx = 0; bx < LW; bx++) {
    const px = bx * LB + 1, py = by * LB + 1;
    let v2 = 0, red = 0;
    for (const L of lights) {
      const dd = Math.hypot(px - L.x, (py - L.y) * 1.15);
      if (dd < L.r) { const a = (1 - dd / L.r) * L.k; v2 += a; if (L.red) red += a; }
    }
    for (const [dir, cx] of Object.entries(ARCH_X)) {
      if (!v.room.doors[dir]) continue;
      const dx = px - cx, dist = py <= SPRING ? Math.hypot(dx, py - SPRING) : Math.abs(dx);
      if (dist <= RI && py < FLOOR_Y) v2 *= 0.25;
    }
    const q = Math.min(1.15, Math.floor(v2 * 7) / 6);
    const i = (by * LW + bx) * 4;
    d[i] = Math.min(255, 30 + q * 230 + red * 80); d[i + 1] = Math.min(255, 36 + q * 175); d[i + 2] = Math.min(255, 56 + q * 100); d[i + 3] = 255;
  }
  lctx.putImageData(img, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(lc, 0, 0, SW, H);
  ctx.globalCompositeOperation = 'lighter';
  for (const L of sconces) {
    const gr = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, 30);
    gr.addColorStop(0, `rgba(255,150,60,${0.28 * dim})`); gr.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = gr; ctx.fillRect(L.x - 30, L.y - 30, 60, 60);
  }
  ctx.globalCompositeOperation = 'source-over';
  sconces.forEach((L, i) => {
    if (v.dark) { ctx.fillStyle = '#3a3e46'; ctx.fillRect(L.x - 1, L.y - 3, 2, 3); return; }
    const f = Math.floor(t / 100 + i * 2) % 3;
    ctx.fillStyle = '#ff8a2a'; ctx.fillRect(L.x - 2, L.y - 4 - (f === 1 ? 1 : 0), 4, 5);
    ctx.fillStyle = '#ffe38a'; ctx.fillRect(L.x - 1, L.y - 2 - f % 2, 2, 3);
    if (f === 2) { ctx.fillStyle = '#ff8a2a'; ctx.fillRect(L.x + (i ? -1 : 1), L.y - 7, 1, 2); }
  });
  // glowing eyes stay visible in the dark
  const vg = ctx.createRadialGradient(SW / 2, H * 0.55, H * 0.35, SW / 2, H * 0.55, H * 0.95);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.6)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, SW, H);
  if (v.fade) { ctx.fillStyle = `rgba(0,0,0,${Math.min(1, v.fade)})`; ctx.fillRect(0, 0, SW, H); }
  ctx.restore();
}

function shadow(ctx, x, feet, w) {
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  ctx.fillRect(Math.round(x - w / 2), feet - 2, w, 5);
}

// Draws a sprite with its feet at (x, feet). flash > 0 tints it white (just got hit).
const tintCv = document.createElement('canvas');
function drawActor(ctx, id, x, feet, s, flip, alpha, flash) {
  const spr = scaled(id, s, flip);
  if (!spr) return;
  const dx = Math.round(x - spr.width / 2), dy = Math.round(feet - spr.height + s);
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.drawImage(spr, dx, dy);
  if (flash > 0) {
    tintCv.width = spr.width; tintCv.height = spr.height;
    const g = tintCv.getContext('2d');
    g.clearRect(0, 0, spr.width, spr.height);
    g.drawImage(spr, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = `rgba(255,240,230,${Math.min(1, flash)})`;
    g.fillRect(0, 0, spr.width, spr.height);
    g.globalCompositeOperation = 'source-over';
    ctx.drawImage(tintCv, dx, dy);
  }
  ctx.globalAlpha = 1;
}

// ---------- room map panel ----------
const MAPX = 342, MAPY = 30, CELL = 16, GAP = 4;
const ICONS = {
  skull: ['.bbbbb.', 'bbbbbbb', 'bkbbbkb', 'bkbbbkb', 'bbbkbbb', '.bbbbb.', '.b.b.b.'],
  chest: ['.......', '.wwwww.', 'wwwwwww', 'yyyyyyy', 'wwwywww', 'wwwwwww', 'WWWWWWW'],
  shrine: ['...q...', '..qfq..', '...f...', '..yyy..', '...y...', '..yyy..', '.yyyyy.'],
  entrance: ['...b...', '..bbb..', '.bbbbb.', '...b...', '...b...', '...b...', '.......'],
  q: ['.yyyy..', 'y....y.', '.....y.', '...yy..', '...y...', '.......', '...y...'],
  trap: ['.......', 'a..a..a', 'a..a..a', 'aa.aa.a', 'aaaaaaa', 'nnnnnnn', '.......'],
  encounter: ['..sss..', '.s...s.', '.....s.', '...ss..', '...s...', '.......', '...s...'],
  merchant: ['...y...', '..yyy..', '.yy.yy.', '..yyy..', '...yy..', '.yy.yy.', '..yyy..'],
  boss: ['e.....e', '.e...e.', '..eee..', '.eeeee.', '..e.e..', '.e...e.', 'e.....e'],
  empty: ['.......', '.......', '..n.n..', '.......', '..n.n..', '.......', '.......'],
  hero: ['..hhh..', '..sss..', '..sss..', '.aaaaa.', 'a.aaa.a', '..r.r..', '..l.l..'],
  monster: ['.......', '.e...e.', '..e.e..', '.......', '.eeeee.', '.e.e.e.', '.......'],
};
function iconColor(ch) { return FLAT[ch] || (RAMP[ch.toLowerCase()] || [])[ch === ch.toUpperCase() ? 0 : 2]; }
function drawIcon(g, rows, x, y, a = 1) {
  g.globalAlpha = a;
  rows.forEach((r, ry) => [...r].forEach((ch, rx) => { if (ch === '.') return; g.fillStyle = iconColor(ch); g.fillRect(x + rx, y + ry, 1, 1); }));
  g.globalAlpha = 1;
}

// map: { cells: [{x,y,state:'here'|'visited'|'unknown'|'peeked', icon}], doors: [[k1,k2,known]], heroId }
export function drawMap(g, t, map) {
  g.fillStyle = '#0a090c'; g.fillRect(SW, 0, W - SW, H);
  g.fillStyle = '#2a2530'; g.fillRect(SW, 0, 1, H);
  const cx = (x) => MAPX + x * (CELL + GAP), cy = (y) => MAPY + y * (CELL + GAP);
  g.fillStyle = '#16141a';
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) g.fillRect(cx(x) + 7, cy(y) + 7, 2, 2);
  for (const [a, b, faint] of map.doors) {
    const ax = cx(a.x) + CELL / 2, ay = cy(a.y) + CELL / 2, bx = cx(b.x) + CELL / 2, by = cy(b.y) + CELL / 2;
    g.fillStyle = faint ? '#3a3328' : '#6a5a3a';
    if (ax === bx) g.fillRect(ax - 2, Math.min(ay, by), 4, Math.abs(by - ay)); else g.fillRect(Math.min(ax, bx), ay - 2, Math.abs(bx - ax), 4);
  }
  for (const c of map.cells) {
    const x = cx(c.x), y = cy(c.y);
    if (c.state === 'unknown' || c.state === 'peeked') {
      g.fillStyle = '#0b090d'; g.fillRect(x, y, CELL, CELL);
      g.fillStyle = c.state === 'peeked' ? '#5a4a30' : '#3a3328';
      g.fillRect(x, y, CELL, 1); g.fillRect(x, y + CELL - 1, CELL, 1); g.fillRect(x, y, 1, CELL); g.fillRect(x + CELL - 1, y, 1, CELL);
      drawIcon(g, ICONS[c.state === 'peeked' ? c.icon : 'q'], x + 5, y + 5, c.state === 'peeked' ? 0.85 : 0.7);
      continue;
    }
    g.fillStyle = '#0b090d'; g.fillRect(x - 1, y - 1, CELL + 2, CELL + 2);
    g.fillStyle = '#4a4640'; g.fillRect(x, y, CELL, CELL);
    g.fillStyle = '#5a554e'; g.fillRect(x, y, CELL, 1); g.fillRect(x, y, 1, CELL);
    g.fillStyle = '#2f2c28'; g.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
    if (c.state === 'here') {
      const pulse = 0.55 + 0.45 * Math.sin(t / 300);
      g.fillStyle = `rgba(255,140,50,${0.35 + 0.4 * pulse})`;
      g.fillRect(x - 2, y - 2, CELL + 4, 2); g.fillRect(x - 2, y + CELL, CELL + 4, 2); g.fillRect(x - 2, y, 2, CELL); g.fillRect(x + CELL, y, 2, CELL);
      g.fillStyle = '#3a2416'; g.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
      drawIcon(g, ICONS.hero, x + 5, y + 4);
    } else drawIcon(g, ICONS[c.icon] || ICONS.empty, x + 5, y + 5);
  }
  // portrait frame for the status block
  g.fillStyle = '#2a2530'; g.fillRect(SW + 8, 184, 26, 30);
  g.fillStyle = '#100e12'; g.fillRect(SW + 9, 185, 24, 28);
  const spr = sprite(map.heroId);
  if (spr) g.drawImage(spr, 5, 0, 12, 14, SW + 9, 185, 24, 28);
}

// ---------- title / character creation backdrop ----------
export function drawTitle(ctx, t, room, heroes, chosen) {
  drawStage(ctx, t, { room, props: [] });
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, 0, SW, H);
  const n = heroes.length, gap = SW / (n + 1);
  heroes.forEach((id, i) => {
    const x = Math.round(gap * (i + 1));
    const on = !chosen || chosen === id;
    shadow(ctx, x, 232, 34);
    drawActor(ctx, id, x, 232 + (chosen === id ? Math.round(Math.sin(t / 200) * 1.5) : 0), chosen === id ? 3 : 2, false, on ? 1 : 0.35, 0);
  });
}
