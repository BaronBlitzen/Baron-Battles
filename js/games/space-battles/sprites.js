// Pixel-art ship sprites (draft). Each sprite is a grid of letters, nose pointing UP.
// One letter = one pixel; '.' = empty. Colors come from PALETTE.
// `half: true` means only the LEFT half is written; the right half is a mirror copy.
// Preview: docs/ship-sprites.html

export const PALETTE = {
  // Protectorate: cream hull, navy panels, red stripes, cyan weapons, orange/yellow flames
  W: '#f4ecd8', // cream hull
  w: '#c4b99f', // cream shade
  B: '#2f5aa8', // navy panel / window
  R: '#e03131', // red stripe
  C: '#66e8ff', // cyan weapon glow
  G: '#8d96a3', // gray metal (guns, tower)
  Y: '#ffd43b', // flame yellow
  F: '#ff922b', // flame orange
  // Djn'zuar: rust-orange hull, dark brown armor plates, charcoal pods, magenta glow
  H: '#c9652c', // rust-orange hull
  h: '#9c4a1f', // rust shade
  d: '#3a2216', // seam (near-black brown)
  O: '#5c3420', // dark brown armor plate
  M: '#ff2eb8', // magenta glow
  P: '#ff9be0', // pink glow / flame
  // shared
  D: '#3d424d', // charcoal (engines, pods, runway)
};

const SPRITES_RAW = {
  // ---------- Human Protectorate ----------
  torpedoBoat: { half: true, rows: [
    '......WD',
    '......WD',
    '......WW',
    '......RR',
    '......WW',
    '.....WWB',
    '.....WWB',
    '.....WWW',
    '.....wWW',
    '....RwWW',
    '...RRwWW',
    '..RRRwWW',
    '..RR.wWW',
    '......DD',
    '......FY',
    '.......F',
    '......F.',
    '.......Y',
  ] },
  escort: { half: true, rows: [
    '.........W',
    '........WW',
    '........WW',
    '.......WWB',
    '.......WWC',
    '......WWWC',
    '......WWWW',
    '......RRRR',
    '......WWWW',
    '...GwWWWBW',
    '...WWWWWBW',
    '...WRRWWBW',
    '...WWWWWBW',
    '...GwWWWBW',
    '......WWWW',
    '......RRRR',
    '......WWWW',
    '....wwWWWW',
    '...wwwwwww',
    '......DD..',
    '......FY..',
    '.......F..',
    '......F...',
  ] },
  lancer: { half: true, rows: [
    '...........C',
    '...........C',
    '...........G',
    '...........G',
    '...........G',
    '...........G',
    '...........G',
    '..........WG',
    '..........WG',
    '..........WG',
    '.........WWG',
    '.........WBG',
    '.........WBG',
    '........GWBG',
    '........WWWG',
    '........WRRG',
    '........GWWG',
    '........GWWG',
    '........WWWG',
    '........WRRG',
    '........WWWG',
    '........GWWG',
    '........GWWG',
    '........WWWG',
    '........WRRG',
    '........WWWG',
    '........GWWG',
    '........GWWG',
    '........WWWG',
    '.......wWWWG',
    '......RwWWWG',
    '.....RRwwwwG',
    '.....R..DD.D',
    '........FY.Y',
    '.........F.F',
    '........F..Y',
  ] },
  strikeCarrier: { size: 1.3, rows: [
    '.......WWWWWWWW.........',
    '......WWWWWWWWWW........',
    '.....WWWWWDDDDWWWWW.....',
    '.....WWWWWDYYDWWWWW.....',
    '.....WRRWWDDDDWWRRW.....',
    '.....WWWWWDYYDWWWWW.....',
    '.....BWWWWDDDDWWWWB.....',
    '.....WWWWWDYYDWWWWW.....',
    '.....DWWWWDDDDWWWWD.....',
    '.....DWWWWDYYDWWWWD.....',
    '.....DWWWWDDDDWWWWD.....',
    '.....WRRWWDYYDWWRRW.....',
    '.....WWWWWDDDDWWWWW.....',
    '.....WWWWWDYYDWWGGGGG...',
    '.....DWWWWDDDDWWGBBBG...',
    '.....DWWWWDYYDWWGGGGG...',
    '.....DWWWWDDDDWWGRRGG...',
    '.....WWWWWDYYDWWGBBBG...',
    '.....WWWWWDDDDWWGGGGG...',
    '.....WWWWWDYYDWWWWW.....',
    '.....WWWWWDDDDWWWWW.....',
    '.....WRRWWDYYDWWRRW.....',
    '.....WWWWWDDDDWWWWW.....',
    '.....DWWWWDDDDWWWWD.....',
    '.....DWWWWDYYDWWWWD.....',
    '.....DWWWWDDDDWWWWD.....',
    '.....WRRWWDYYDWWRRW.....',
    '.....WWWWWDDDDWWWWW.....',
    '.....wwwwwwwwwwwwww.....',
    '......DD...DD...DD......',
    '......FY...FY...FY......',
    '.......F....F....F......',
    '......F....F....F.......',
  ] },
  fighters: { rows: [
    '..W..',
    '.WWW.',
    'WWBWW',
    'W.W.W',
    '..F..',
  ] },
  bombers: { rows: [
    '.WWW.',
    'WWBWW',
    'WWWWW',
    'W.R.W',
    '..F..',
  ] },

  // ---------- Djn'zuar ----------
  grunt: { half: true, rows: [
    '..HHH...',
    '..OOO...',
    '..HHH...',
    '..HHH.MM',
    '.hHHHHHH',
    '.HHHHHHH',
    '.OOOOOOO',
    '.HHHHdHH',
    '.HHHHdHH',
    '.OOOOOOO',
    '.hHHHHHH',
    '..hhhhhh',
    '.....DDD',
    '.....DDD',
    '......MP',
    '.......M',
    '......P.',
  ] },
  samurai: { half: true, rows: [
    '......H.....',
    '.....HH.....',
    '.....HH.....',
    '.....OO.....',
    '.....HH.....',
    '.....HH...hH',
    '.....OO...HH',
    '.....HH...HH',
    '.....HH..hHH',
    '......HHHHHH',
    '.......hHHHH',
    '.........ddd',
    '........HHDD',
    '........HODM',
    '........HODM',
    '........HHDD',
    '.........ddd',
    '.........HHH',
    '......DD.OOO',
    '......DD.hhh',
    '......DD....',
    '......MP....',
    '.......M....',
    '......P.....',
  ] },
  brute: { half: true, rows: [
    '..............HH',
    '......H.......HH',
    '......HH......OO',
    '......OO......HH',
    '......HH......HH',
    '......HH......OO',
    '......OO......HH',
    '....hHHHHHHHHHHH',
    '...DHHHHHHHHHHHH',
    '..D.HHHOOOOOHHHH',
    '...HHHHHHHHHHHHH',
    '.MDDHHHHHHHHHHdH',
    '.PDDHHHHOOOOOHdH',
    '.MDDHHHHHHHHHHdH',
    '..D.HHHHHHHHHHHH',
    '...dOOOOOOOOOOOO',
    '...HHHHHHHHHHHHH',
    '..D.HHHHHHHHHdHH',
    '.MDDHHHHHHHHHdHH',
    '.PDDHHHHOOOOOdHH',
    '.MDDHHHHHHHHHdHH',
    '..D.HHHHHHHHHHHH',
    '...hhhhhhhhhhhhh',
    '......DD....DD..',
    '......DD....DD..',
    '......MP....MP..',
    '.......M.....M..',
    '......P.....P...',
  ] },
  queen: { half: true, rows: [
    '.....HHH............',
    '.....HHHH..........M',
    '.....OOOOO.........D',
    '.....HHHHHH........D',
    '......HHHHHH......dD',
    '.DD.hHHHHHHHHHHHHHdD',
    '.DPHHHHHHHHHHHHHHHdD',
    '..HHHHHHHHHHHHHHHHdD',
    '..HOOOOOOOOOOOOOHhDD',
    '..HHHHHHHHHHHHHHhDDD',
    '..HDDDdDDDdHHHHHhDMM',
    '..HDMDdDMDdHHHHHhDDD',
    '..HDDDdDDDdHHHHHhDMM',
    '..HddDDDdDDdHHHHhDDD',
    '..HdDMDdDMDdHHHHhDMM',
    '..HdDDDdDDDdHHHHhDDD',
    '..HDDDdDDDdHHHHHhhhh',
    '..HDMDdDMDdHHHHHHHHH',
    '..HDDDdDDDdHHHHHHHHH',
    '..HddDDDdDDdHHHHHHHH',
    '..HdDMDdDMDdHHHHHHHH',
    '..HdDDDdDDDdHHHHHHHH',
    '..HOOOOOOOOOOOOOOOOO',
    '..HHHHHHHHHHHHHHHHHH',
    '.DPHHHHHHHHHHHHHHHHH',
    '.DD.hhhhhhhhhhhhhhhh',
    '.....DD....DD....DDD',
    '.....DD....DD....DDD',
    '.....MP....MP.....MP',
    '......M.....M.....P.',
    '.....P.....P.......M',
  ] },
  swarmers: { rows: [
    '..H..',
    '.HHH.',
    '.OOO.',
    'HHHHH',
    '..M..',
  ] },
};

// Expand mirrored halves into full rows. `size` (default 1) draws a ship bigger or smaller than
// the others of its class on the TV.
export const SPRITES = {};
for (const [id, s] of Object.entries(SPRITES_RAW)) {
  const rows = s.half ? s.rows.map(r => r + [...r].reverse().join('')) : s.rows;
  SPRITES[id] = { rows, w: Math.max(...rows.map(r => r.length)), h: rows.length, size: s.size || 1 };
}

export const spriteSize = (id) => SPRITES[id]?.size || 1;

// The sprite pre-drawn on its own small canvas (1 screen pixel per sprite pixel), made once and
// reused. Drawing this with drawImage is much faster than drawing pixel by pixel every frame.
const cache = {};
export function spriteCanvas(id) {
  if (cache[id] !== undefined) return cache[id];
  const s = SPRITES[id];
  if (!s) return (cache[id] = null);
  const cv = document.createElement('canvas');
  cv.width = s.w;
  cv.height = s.h;
  drawSprite(cv.getContext('2d'), id, 0, 0, 1);
  return (cache[id] = cv);
}

// Draw a sprite with its top-left at (x, y), each pixel `scale` screen pixels wide.
export function drawSprite(ctx, id, x, y, scale = 1) {
  const s = SPRITES[id];
  if (!s) return;
  s.rows.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      const c = PALETTE[row[rx]];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(x + rx * scale, y + ry * scale, scale, scale);
    }
  });
}
