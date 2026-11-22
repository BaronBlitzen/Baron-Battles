// Pixel-art Captain portraits, 24×24, keyed by CAPTAINS id. Same letter-grid idea as sprites.js:
// one letter = one pixel, '.' = empty, colors from PORTRAIT_PALETTE (the ship colors plus a few
// for faces). Preview: docs/captain-portraits.html
import { PALETTE } from './sprites.js';

export const PORTRAIT_PALETTE = {
  ...PALETTE,
  k: '#14161c', // pupils, mouths, dents
  e: '#ffffff', // eye whites
  S: '#f1c27d', s: '#c68e5a', // skin
  N: '#5a3820', // brown hair
  K: '#24262c', // black hair
  A: '#f0d27a', // blonde
  X: '#dfe3ea', // gray / white hair
  Q: '#b5482a', // auburn hair
  Z: '#d9a31c', // gold
  L: '#7fa7c9', l: '#557ea3', E: '#d6e6f2', // dolphin
  u: '#e39a5b', // pale Grunt throat
  b: '#3b8cff', // blue warpaint
  g: '#5d6470', // rivets
  c: '#ff8a5c', y: '#ffe8a3', // starfish coral and spots (shade: 'o' from PALETTE)
  n: '#6c7385', // light outline on black fur (Rzen)
  j: '#7ac74f', J: '#4e8a32', a: '#a8d8ea', // frog skin, frog shade, helmet glass (Kaj'ik)
  p: '#f4a7c4', q: '#d77aa0', // pink dolphin and its shade (Fiona)};

export const PORTRAIT_SIZE = 24;

// Left half (12 columns) → full 24 by mirroring.
const mirror = (rows) => rows.map((r) => r + [...r].reverse().join(''));
// Overwrite pixels: [row, col, 'chars'].
// Black fur ('K') on the silhouette's edge (next to empty space) becomes a lighter outline ('n').
const outline = (rows) => rows.map((r, y) => [...r].map((ch, x) => {
  if (ch !== 'K') return ch;
  const empty = (yy, xx) => (rows[yy]?.[xx] ?? '.') === '.';
  return empty(y - 1, x) || empty(y + 1, x) || empty(y, x - 1) || empty(y, x + 1) ? 'n' : ch;
}).join(''));
const patch = (rows, edits) => {
  const out = rows.map((r) => [...r]);
  for (const [r, c, s] of edits) [...s].forEach((ch, i) => { out[r][c + i] = ch; });
  return out.map((r) => r.join(''));
};

const GRUNT_SHOULDERS = [
  '...OOOOOOdOOOOOOOOO.....',
  '..OOOOOOOdOOOOMOOOOO....',
  '.OOOMOOOOdOOOOOOOOOOO...',
  '.OOOOOOOOdOOOOOOOOOOOO..',
  'OOOOOOOOOdOOOOOOOOOOOOO.',
];

export const PORTRAITS = {
  // ---------- Human Protectorate ----------
  // Dolphin in a pilot helmet, visor up (side view).
  shuna: [
    '........................',
    '......WWWWWWWW..........',
    '....WWWWWWWWWWWW........',
    '...WWRRRRRRRRRRWW.......',
    '..WWWWWWWWWWWWWWWW......',
    '..WWWWWWWWWWCCCCCCW.....',
    '..WWWWWWWWWCCCCCCCW.....',
    '..LLLLLLLLLLLLLLLLLL....',
    '.LLLLLLLLLLLLLLLLLLLL...',
    '.LLLLLLLLLLLLLekLLLLLL..',
    '.LLLLLLLLLLLLLkkLLLLLLL.',
    '.lLLLLLLLLLLLLLLLLLLLLLL',
    '.lLLLLLLLLLkLLLLLLLLLLLL',
    '.lLLLLLLLLLLkkkkkkkkkkkk',
    '.llLLLLLLLEEEEEEEEEEEEE.',
    '..llLLLLEEEEEEEEEEEEEE..',
    '..llLLEEEEEEEEEEEE......',
    '...llLEEEEEEEEE.........',
    '....llEEEEEEE...........',
    '....BBBBBBBBBB..........',
    '...BBBBRRBBBBBB.........',
    '..BBBBBBBBBBBBBB........',
    '.BBBBBBBBBBBBBBBB.......',
    'BBBBBBBBBBBBBBBBBB......',
  ],
  // Old veteran: gray mustache, navy cap.
  verity: mirror([
    '............',
    '......BBBBBB',
    '.....BBBBBBB',
    '....BBBBBBBZ',
    '....BBBBBBBZ',
    '...DDDDDDDDD',
    '....XSSSSSSS',
    '....XSSSSSSS',
    '....XSXXXSSS',
    '...sXSSekSSS',
    '...sXSSSSSSS',
    '....XSSSSSSs',
    '....XSSSSSSs',
    '....SSXXXXXX',
    '.....SXSSSSS',
    '.....sSSSSSS',
    '......sSSSSS',
    '.......ssSSS',
    '........sSSS',
    '.....BBBsSSS',
    '...BBBBBBBsS',
    '..BBZBBBBBBB',
    '.BBBBBBBBBBB',
    'BBBBBBBBBBBB',
  ]),
  // Gunnery chief: crew cut, squint, cyan earpiece.
  shrike: patch(mirror([
    '............',
    '............',
    '.......KKKKK',
    '......KKKKKK',
    '.....KKKKKKK',
    '....KKKKKKKK',
    '....KSSSSSSS',
    '....SSSSSSSS',
    '....SSKKKSSS',
    '...sSSSkkSSS',
    '...sSSSSSSSS',
    '....SSSSSSSs',
    '....SSSSSSSs',
    '....SSSSSSSS',
    '.....SSSkkkk',
    '.....sSSSSSS',
    '......sSSSSS',
    '.......ssSSS',
    '........sSSS',
    '....RBBBsSSS',
    '...RBBBBBBsS',
    '..RBBBBBBBBB',
    '.RBBBBBBBBBB',
    'BBBBBBBBBBBB',
  ]), [[8, 20, 'C'], [9, 19, 'GCG'], [10, 19, 'GGG']]),
  // Officer cap, auburn hair, white uniform.
  amelia: mirror([
    '............',
    '.....WWWWWWW',
    '...WWWWWWWWW',
    '..WWWWWWWWWW',
    '..WWWWWWWWWW',
    '...BBBBBBBBZ',
    '...DDDDDDDDD',
    '...QQSSSSSSS',
    '...QQSQQQSSS',
    '..QQsSSekSSS',
    '..QQsSSSSSSS',
    '..QQQSSSSSSs',
    '..QQQSSSSSSs',
    '..QQQSSSSSSS',
    '..QQQSSSSSRR',
    '..QQQQsSSSSS',
    '...QQQQsSSSS',
    '...QQQQssSSS',
    '....QQQ.sSSS',
    '.....WWWsSSS',
    '...WWWWWWWsS',
    '..WWZWWWWWWB',
    '.WWWWWWWWWWB',
    'WWWWWWWWWWWB',
  ]),
  // Flight helmet, visor up, red stripe.
  flaggs: mirror([
    '........WWRR',
    '......WWWWRR',
    '.....WWWWWRR',
    '....WWWWWWRR',
    '...WWCCCCCCC',
    '...WCCCCCCCC',
    '...WCeCCCCCC',
    '...WWSSSSSSS',
    '...WWSAAASSS',
    '...WWSSekSSS',
    '...WWSSSSSSS',
    '...WWSSSSSSs',
    '...WWSSSSSSs',
    '...WWSSSSSSS',
    '...WWGSSSSkk',
    '....WGsSSSSS',
    '.....WGsSSSS',
    '......GGssSS',
    '........GGGG',
    '.....BBBsSSS',
    '...BBBBBBBsS',
    '..BBRBBBBBBB',
    '.BBBBBBBBBBB',
    'BBBBBBBBBBBB',
  ]),
  // Sharpshooter: one eye squinting, cyan targeting lens on the other.
  kairos: patch(mirror([
    '............',
    '............',
    '........NNNN',
    '......NNNNNN',
    '.....NNNNNNN',
    '....NNNNNNNN',
    '....NNNSSSSS',
    '....NSSSSSSS',
    '....SSNNNSSS',
    '...sSSSekSSS',
    '...sSSSSSSSS',
    '....SSSSSSSs',
    '....SSSSSSSs',
    '....SSSSSSSS',
    '.....SSSSkkk',
    '.....sSSSSSS',
    '......sSSSSS',
    '.......ssSSS',
    '........sSSS',
    '.....BBBsSSS',
    '...BBBBBBBsS',
    '..BBBBBBBBBB',
    '.BBBBBBBBBBB',
    'BBBBBBBBBBBB',
  ]), [[9, 7, 'kk'], [8, 14, 'GGGG'], [9, 14, 'GCCG'], [10, 14, 'GGGG'], [9, 18, 'GGG']]),

  // ---------- Djn'zuar ----------
  // Grunt, squat frog: wide-open grin, yellow and red zig-zag.
  golbrik: [
    '........................',
    '........................',
    '........................',
    '..............hHHh......',
    '.............hHMMHh.....',
    '...hOh.......HMPMMH.....',
    '..hOOOhHHHHHHHMMMMHHh...',
    '.hOOHHHHHHHHHHHHHHHHHHh.',
    '.hHHHYHHHYHHHYHHHHHHHHHh',
    'hHHHYRYHYRYHYRYHHHHHHkHH',
    'hHHYRHRYRHRYRHRYHHHHHHHh',
    'hHHHHHHHddddddddddddddd.',
    'hHHHHHHHdWdWdWdWdWdWdWd.',
    'hHHHHHHHdPPPPPPPPPPPPd..',
    '.hHHHHHHdWdWdWdWdWdWd...',
    '.hHHHHHHuuuuuuuuuuuh....',
    '..hHHHHHHuuuuuuuuh......',
    '...hhHHHHHHHHhhh........',
    '....OOOhhhhhhOO.........',
    ...GRUNT_SHOULDERS,
  ],
  // Grunt, toad face: handprint, slashes, black eye, tongue out.
  jurddap: [
    '........................',
    '........................',
    '.M....................M.',
    '..d..................d..',
    '..dhHHh..........hOOhd..',
    '..hMMMHh........hOhhhO..',
    '.hMPMMMHhhhhhhhhHOMMMOh.',
    '.hMMMMHHHHHHHHHHHOOOOOh.',
    'hHHhhHHHHOkOOOkOHHHHhHHh',
    'hHWHWHWHHOdOOdOHHRHHRHHh',
    'hHWWWWWWHHHHHHHHHHRHHRHh',
    'hHWWWWWHHHkHHkHHHHHRHHRh',
    'hHHWWWHHHHHHHHHHHHHHHHHh',
    'hddddddddddddddddddddddh',
    'hHWHHHWHHHdHHWHPPPHHHWHh',
    '.hHhhhhhhhhhhhhPPPhhhHh.',
    '.hHhhhhhhhhhhhhhPhhhhHh.',
    '..hHhhhhhhhhhhhhhhhhHh..',
    '...hhhhhhhhhhhhhhhhhh...',
    '.OOOOOOhhhhhhhhhhOOOOOO.',
    'OOOOOOOOOOOOOOOOOOOOOOOO',
    'OOMOOOOOOOdOOdOOOOOOOMOO',
    'OOOOOOOOOOdOOdOOOOOOOOOO',
    'OOOOOOOOOOdOOdOOOOOOOOOO',
  ],
  // Grunt, warty croc-toad: big spiked helmet, orange and blue stripes.
  bossim: [
    '...D....D....D..........',
    '...DD...DD...DD.........',
    '..DDDDDDDDDDDDDDD.......',
    '.DDDDDDDDDDDDDDDDD......',
    '.DDDDDDDDDDDDDDDDDD.....',
    'GGGGGGGGGGGGGGGGGGGG....',
    '..hHHHHHHHHHHHhMMh......',
    '..HHhHHHHHHhHHMPMMh.....',
    '.hHHHHHHhHHHHHMMMHHHh...',
    '.FFFFFFFFFFFFFFFFFFFFFh.',
    '.bbbbbbbbbbbbbbbbbbbbkHh',
    '.FFFFFFFFFFFFFFFFFFFFFdh',
    '.HHHHHHHHHddddddddWdWdd.',
    '.hHHHHHHOdhHHHHHHHHHHh..',
    '..hHHHHOOhHHHHHHHHHHh...',
    '..hHHHHO.OhHuuuuuuuh....',
    '...hHHH.O.huuuuuuh......',
    '....hhHHHHhhhhhhh.......',
    '....OOOhhhhhhOO.........',
    ...GRUNT_SHOULDERS,
  ],
  // Samurai, mantis duelist: blade-arms up, blue and white eye stripes.
  seirSeir: [
    '.....M..................',
    '......d........M........',
    '.......d......d.........',
    '....hHHHHHHHHd..........',
    '...hHHOOdOOHHHH.........',
    '...bbbbbbbMMMbHHh.......',
    '...WWWWWWMPMMWWHHHh.....',
    '...bbbbbbbMMMbbHHHHHh...',
    '....hHHHHHHHHHHHHHHHHHh.',
    '.....hHHHHHHHdWdWdWdWdd.',
    '......hHHHHHHHHHHHHHh...',
    '........hHHHh...........',
    '........hHHHh...........',
    '.......hHHHHh....HH.....',
    '......hHHHHHh...HHHH....',
    '.....hHHHHHHHh.HH.hHW...',
    '.....HHHHHHHHHHH..hHW...',
    '....hHHHHHHHHHH....hHW..',
    '....HHHHHHHHHH......hW..',
    '...OOOOOOOOOOO..........',
    '..OOOOdOOOOOOOO.........',
    '.OOMOOdOOOOOOOOO........',
    '.OOOOOdOOOOOOOOOO.......',
    'OOOOOOdOOOOOOOOOOO......',
  ],
  // Brute: iron jaw, tusks, white skull paint, blue and yellow painted plates.
  tulbrik: [
    '...O....................',
    '...OO.O.......M.........',
    '...OOOO......d..........',
    '..OOOOHHHHHHd...........',
    '..OOHHHHHHHHHHHd........',
    '.OOHHbbYYbbYYbHHH.......',
    '.OHHHbbYYbbYYbWWWWH.....',
    'OOHHHHHHHHHHHHWMMWHH....',
    'OHHHHHHHHHHHHHWWWWHHHh..',
    'OHHHhHHHHHHHHHHHHHHHHHHh',
    'OHHHhHHHHHHHHHHHHHHHWkHh',
    'HHHHhHHHHHHHHdWdWdWdWdWd',
    'HHHHHhHHHHGGGGGGGGGGGGG.',
    'HHHHHhHHHHGgGGGgGGGgGG..',
    'HHHHHHhHHGGGGGGGGGGGG...',
    'HHHHHHhHHHhhhhhhhhhh....',
    'HHHHHHHhHHhh............',
    'OOObOOOYOOOOd...........',
    'OOObOOOYOOOOOdO.........',
    'OMObOOOYOOMOOOdOO.......',
    'OOObOOOYOOOOOOOdOOO.....',
    'OOObOOOYOOOOOOOOdOOO....',
    'OOObOOOYOOOOOOOOOdOOO...',
    'OOObOOOYOOOOOOOOOOdOOO..',
  ],
  // Queen, slug matriarch: gems, blue and white swirls.
  uen: [
    '........................',
    '...........M............',
    '............d...........',
    '........OOOOMOO.........',
    '.......OOMOOOOOHH.......',
    '......hHHHHHHHHHHMMh....',
    '......HHHHHHHHHHMPMHh...',
    '.....hHbWbHHHHHHHHHHHHh.',
    '.....HbHHWbHHHHHHHHHHkHh',
    '.....HHbbWHHHdWdWdWdWdW.',
    '....hHHHHHHHhhhhhhhhhh..',
    '...hHHHHHHHHHHHHHh......',
    '..hHHHHHHHHHHHHHHHh.....',
    '.hHHhhhhhhhhhhhhhHHh....',
    '.HHHHHHHHHHHHHHHHHHHh...',
    'hHHHHHHHHHHHHHHHHHHHHh..',
    'HHHhhhhhhhhhhhhhhhhHHH..',
    'HHHHHHHHHHHHHHHHHHHHHHh.',
    'HHHHHHHHHHHHHHHHHHHHHHH.',
    'hhhhhhhhhhhhhhhhhhhhhHHh',
    'HHHHHHHHHHHHHHHHHHHHHHHH',
    'HHOOMOOHHHHHHHOOMOOHHHHH',
    'HOOOOOOOHHHHHOOOOOOOHHHH',
    'HHHHHHHHHHHHHHHHHHHHHHHH',
  ],

  // ---------- Pirates ----------
  // Scruffy brown hair, brown coat collar over a beige shirt, a grin.
  mal: mirror([
    '............',
    '.......NNNNN',
    '.....NNNNNNN',
    '....NNNNNNNN',
    '....NNNNNNNN',
    '...NNNSSSSSN',
    '...NNSSSSSSS',
    '...NSSSSSSSS',
    '...NSKKKSSSS',
    '..sSSSekSSSS',
    '..sSSSSSSSSS',
    '...SSSSSSSsS',
    '...SSSSSSSss',
    '...sSSSSSSSS',
    '....SSSSkkkk',
    '....sSSSSSSS',
    '.....ssSSSSS',
    '......sssSSS',
    '....UUU.SSSS',
    '...UUUUU.sSS',
    '..UUUUUUU.AA',
    '.UUUUUUUUiAA',
    'UUUUUUUUUiAA',
    'UUUUUUUUUiAA',
  ]),
  // Black topknot, green headband, mustache and beard, gunmetal armor.
  liuBei: mirror([
    '..........KK',
    '.........KKK',
    '.......KKKKK',
    '.....KKKKKKK',
    '....KKKKKKKK',
    '....VVVVVVVV',
    '....KSSSSSSS',
    '...KSSSSSSSS',
    '...KSKKKKSSS',
    '...sSSekSSSS',
    '...sSSSSSSSS',
    '....SSSSSSsS',
    '....SSSSSSss',
    '....SKKKSSSS',
    '....SSKKkkkk',
    '....sSSKSSSS',
    '.....sSKKKKK',
    '......sKKKKK',
    '.......KKKKK',
    '....iii.KKKK',
    '...IIIIii.KK',
    '..IVIIIIIiII',
    '.IIIIIIIIIII',
    'IIIIIIIIIIII',
  ]),
  // ---------- Protectorate (squadron captain) ----------
  // A pink dolphin, front view, in a round glass helmet and a white-and-orange spacesuit.
  fiona: mirror([
    '.....aaaaaaa',
    '...aaaaaaaaa',
    '..aaaaqqqqqq',
    '.aaaqqpppppp',
    '.aaqpppppppp',
    'aaaqpppppppp',
    'aaqpekpppppp',
    'aaqpkkpppppp',
    'aaqppppppppp',
    'aaqppppppEEE',
    'aaaqpppppEEE',
    'aaaqqpppEEEE',
    '.aaaqqpkkkkk',
    '..aaaqqqqqqq',
    '...aaaaaaaaa',
    '..WWWWWWWWWW',
    '.WWFFWWWWWWW',
    'WWWFFWWWWWWW',
    'WWWWWWWWBBBB',
    'WWWWWWWWBFFB',
    'WWWWWWWWBBBB',
    'WWFWWWWWWWWW',
    'wWWWWWWWWWWW',
    'wwWWWWWWWWWW',
  ]),
  // ---------- Pirates ----------
  // Black panther with antennae, side profile facing right, light outline.
  rzen: outline([
    '........................',
    '.........Y..............',
    '..........g.............',
    '...........g............',
    '........KK..g...........',
    '.......KkKK.g...........',
    '.......KKKKKKKK.........',
    '......KKKKKKKKKKK.......',
    '.....KKKKKKKKKKKKKK.....',
    '.....KKKKKKKKKVkKKKK....',
    '....KKKKKKKKKKKKKKKKK...',
    '....KKKKKKKKKKKKKKKKKKK.',
    '....KKKKKKKKKKKKKKKKKKkk',
    '....KKKKKKKKKKKKKKgggKK.',
    '....KKKKKKKKKKKKKKKkkkk.',
    '.....KKKKKKKKKKKKKKKKK..',
    '.....KKKKKKKKKKKKKKKK...',
    '......KKKKKKKKKK........',
    '......KKKKKKKKK.........',
    '.....iiiKKKKKKii........',
    '....IIIIiiiiiiIII.......',
    '...IVIIIIIIIIIIIVI......',
    '..IIIIIIIIIIIIIIIII.....',
    '.IIIIIIIIIIIIIIIIIII....',
  ].map((r) => r.padEnd(24, '.'))),
  // A frog in a glass helmet and a bulky black-and-green spacesuit.
  kajik: mirror([
    '....aaaaaaaa',
    '..aaaaaaaaaa',
    '.aaaaJJJaaaa',
    '.aaaJjjjJaaa',
    'aaaJjekjjJaa',
    'aaaJjkkjjjJJ',
    'aaaJjjjjjjjj',
    'aaJjjjjjjjjj',
    'aaJjjjjjjjjj',
    'aaJjjjjjjjjj',
    'aaaJjkkkkkkk',
    'aaaaJjjjjjjj',
    '.aaaaJJJJJJJ',
    '..aaaaaaaaaa',
    '...KKKKKKKKK',
    '.KKVVKKKKKKK',
    'KKKVVKKKKKKK',
    'KKKKKKKKVVVV',
    'KKKKKKKKVJJV',
    'KKKKKKKKVVVV',
    'KKVKKKKKKKKK',
    'KKVKKKKKKKKK',
    'KKKKKKKKKKKK',
    'KKKKKKKKKKKK',
  ]),
  // A five-armed coral starfish with yellow spots.
  flerf: mirror([
    '...........c',
    '..........cc',
    '..........cc',
    '.........ccc',
    '.........cyc',
    '........cccc',
    '........cccc',
    'cc......cccc',
    '.cccc..ccccc',
    '..cccccccccc',
    '...cyccccccc',
    '....cccekccc',
    '.....cckkccc',
    '......cccccc',
    '......ccckkk',
    '......cccccc',
    '.....ccccooo',
    '.....cccc...',
    '....ccccc...',
    '....ccyc....',
    '...cccc.....',
    '...ccc......',
    '..ccc.......',
    '..cc........',
  ]),
};

// Draw a portrait with its top-left at (x, y), each pixel `scale` screen pixels wide.
export function drawPortrait(ctx, id, x, y, scale = 1) {
  const rows = PORTRAITS[id];
  if (!rows) return;
  rows.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      const c = PORTRAIT_PALETTE[row[rx]];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(x + rx * scale, y + ry * scale, scale, scale);
    }
  });
}

// The portrait as a 24×24 PNG data URL, made once and reused (for <img> tags).
const urls = {};
export function portraitURL(id) {
  if (urls[id] !== undefined) return urls[id];
  if (!PORTRAITS[id]) return (urls[id] = '');
  const cv = document.createElement('canvas');
  cv.width = PORTRAIT_SIZE;
  cv.height = PORTRAIT_SIZE;
  drawPortrait(cv.getContext('2d'), id, 0, 0, 1);
  return (urls[id] = cv.toDataURL());
}

// <img> HTML for a Captain's face, `px` screen pixels square ('' if there's no portrait).
export function faceImg(id, px = 32) {
  const url = portraitURL(id);
  return url ? `<img class="sb-face" src="${url}" width="${px}" height="${px}" alt="">` : '';
}
