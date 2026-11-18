// Space Battles – game data. Plain data only: factions, weapons, ship classes,
// ships and scenarios. To add a ship or a weapon, add an entry here; the logic
// in rules.js / host.js / controller.js reads everything from these tables.
// Numbers come from docs/space-battles-rules.md.

export const FACTIONS = {
  protectorate: {
    id: 'protectorate',
    name: 'Human Protectorate',
    short: 'Protectorate',
    color: '#4dabf7',
    available: true,
    blurb: 'Strike carriers, mobility, medium capital ships',
    edge: 'west', // deployment edge (null = whichever edge is free)
    traits: { ram: null, home: null },
  },
  djnzuar: {
    id: 'djnzuar',
    name: 'Djnzuar',
    short: 'Djnzuar',
    color: '#ff922b',
    available: true,
    blurb: 'Big, slow, brutal up close. They ram.',
    edge: 'east',
    // Ramming: when this faction's ship collides with an enemy ship, the enemy takes
    // `enemyDamage` (or the ship's own `ramDamage`) and the rammer takes `selfDamage`.
    traits: { ram: { enemyDamage: 3, selfDamage: 1 }, home: null },
  },
  pirates: {
    id: 'pirates',
    name: 'Pirates',
    short: 'Pirates',
    color: '#cc5de8',
    available: true,
    blurb: 'Tough, fast generalists. Turrets fire in any direction.',
    edge: null,
    // Every ship is home: the first time a ship drops to half hull or less, next round
    // it may move as if using Full Burn (change speed by up to 2, go up to 1 over max).
    traits: { ram: null, home: { speedChange: 2, overMax: 1 } },
  },
};
export const FACTION_ORDER = ['protectorate', 'djnzuar', 'pirates'];

// Hit chance per range band. A band that is missing means "can't fire at that range".
export const WEAPONS = {
  railgun: { name: 'Railgun', hit: { close: 0.6, medium: 0.6, long: 0.5 }, damage: 1, crit: 0.1 },
  torpedo: { name: 'Torpedo', hit: { close: 0.75, medium: 0.5 }, damage: 2, crit: 0.25 },
  flak: { name: 'Flak', hit: { close: 0.6 }, damage: 1, crit: 0, pd: true },
  plasma: { name: 'Plasma Cannon', hit: { close: 0.8, medium: 0.5 }, damage: 1, crit: 0.15 },
  maw: { name: 'Plasma Maw', hit: { close: 0.8, medium: 0.4 }, damage: 2, crit: 0.2 },
  spine: { name: 'Spine Driver', hit: { close: 0.5, medium: 0.5, long: 0.4 }, damage: 1, crit: 0.05 },
  thorn: { name: 'Thorn Burst', hit: { close: 0.5 }, damage: 1, crit: 0, pd: true },
  autocannon: { name: 'Autocannon', hit: { close: 0.65, medium: 0.55, long: 0.35 }, damage: 1, crit: 0.1 },
  breaching: { name: 'Breaching Cannon', hit: { close: 0.75, medium: 0.45 }, damage: 1, crit: 0.35 },
};

// Range bands, measured between the closest edges of two ships (in units).
export const RANGE_BANDS = [
  { id: 'close', name: 'Close', max: 3 },
  { id: 'medium', name: 'Medium', max: 6 },
  { id: 'long', name: 'Long', max: 9 },
];

// length = along the ship's heading, width = side to side. value = fleet value / kill points.
export const CLASSES = {
  corvette: { name: 'Corvette', length: 0.75, width: 0.4, value: 2 },
  destroyer: { name: 'Destroyer', length: 1.05, width: 0.5, value: 3 },
  cruiser: { name: 'Cruiser', length: 1.5, width: 0.75, value: 5 },
  battleship: { name: 'Battleship', length: 2.1, width: 1.05, value: 8 },
};

// Hull zones (each a 90° wedge with its own shields and firing arc).
export const ZONES = ['front', 'left', 'right', 'rear'];
// Firing arcs: the 4 zones plus `turret`, which fires in any direction.
// A turret attack still counts as one of the ship's 2 attacks.
export const ARCS = ['turret', ...ZONES];
export const ZONE_NAMES = { turret: 'Turret', front: 'Front', left: 'Left', right: 'Right', rear: 'Rear' };

const w = (weapon, shots) => ({ weapon, shots });
const sides = (front, side, rear, turret) => ({
  ...(turret ? { turret } : {}), front, left: side, right: side, rear,
});

// Ship types. `arcs` lists the weapons in each firing arc.
// `speed` is [min, max]; `clicks` is the max turn clicks per segment (1 click = 15°).
// Optional `clicksAtSpeed` overrides `clicks` at specific speeds, e.g. { 1: 2 }.
// Optional `ramDamage` overrides the faction's ram damage for this ship.
export const SHIPS = {
  // ----- Human Protectorate -----
  lancer: {
    name: 'Lancer Torpedo Boat', short: 'Lancer', faction: 'protectorate', class: 'corvette',
    hull: 4, shields: { front: 1, left: 1, right: 1, rear: 0 }, speed: [2, 4], clicks: 3,
    arcs: sides([w('torpedo', 3)], [w('railgun', 1)], []),
    pd: [w('flak', 1)],
  },
  warden: {
    name: 'Warden Escort', short: 'Warden', faction: 'protectorate', class: 'destroyer',
    hull: 6, shields: { front: 2, left: 1, right: 1, rear: 1 }, speed: [1, 3], clicks: 2,
    arcs: sides([w('railgun', 3)], [w('railgun', 2)], [w('railgun', 1)]),
    pd: [w('flak', 3)],
    // Screen (vs squadrons) comes with squadrons.
  },
  valiant: {
    name: 'Valiant Strike Carrier', short: 'Valiant', faction: 'protectorate', class: 'cruiser',
    hull: 9, shields: { front: 3, left: 2, right: 2, rear: 1 }, speed: [1, 4], clicks: 2,
    arcs: sides([w('railgun', 3)], [w('railgun', 3)], [w('railgun', 1)]),
    pd: [w('flak', 2)],
    squadrons: 0, // carries 3 in the full rules; squadrons come later
  },
  bastion: {
    name: 'Bastion Battleship', short: 'Bastion', faction: 'protectorate', class: 'battleship',
    hull: 14, shields: { front: 4, left: 3, right: 3, rear: 2 }, speed: [1, 2], clicks: 1,
    arcs: sides([w('railgun', 5)], [w('railgun', 4)], [w('railgun', 2)]),
    pd: [w('flak', 2)],
  },

  // ----- Djnzuar -----
  gnasher: {
    name: 'Gnasher Raider', short: 'Gnasher', faction: 'djnzuar', class: 'corvette',
    hull: 6, shields: { front: 2, left: 1, right: 1, rear: 0 }, speed: [1, 3], clicks: 2,
    arcs: sides([w('plasma', 3)], [w('plasma', 1)], []),
    pd: [],
  },
  ripper: {
    name: 'Ripper Destroyer', short: 'Ripper', faction: 'djnzuar', class: 'destroyer',
    hull: 9, shields: { front: 2, left: 2, right: 2, rear: 0 }, speed: [1, 3], clicks: 2,
    arcs: sides([w('plasma', 4)], [w('plasma', 2), w('spine', 1)], []),
    pd: [w('thorn', 1)],
  },
  broodmaw: {
    name: 'Broodmaw Cruiser', short: 'Broodmaw', faction: 'djnzuar', class: 'cruiser',
    hull: 13, shields: { front: 3, left: 2, right: 2, rear: 1 }, speed: [1, 2], clicks: 1,
    clicksAtSpeed: { 1: 2 }, // more nimble when slow: 2 clicks per segment at speed 1
    arcs: sides([w('plasma', 4)], [w('plasma', 3), w('spine', 1)], [w('spine', 1)]),
    pd: [w('thorn', 2)],
    squadrons: 0, // carries 3 in the full rules; squadrons come later
  },
  warlord: {
    name: 'Warlord Dreadhulk', short: 'Dreadhulk', faction: 'djnzuar', class: 'battleship',
    hull: 20, shields: { front: 5, left: 3, right: 3, rear: 1 }, speed: [1, 2], clicks: 1,
    arcs: sides([w('maw', 2), w('plasma', 3)], [w('plasma', 4), w('spine', 2)], [w('spine', 1)]),
    pd: [w('thorn', 2)],
    ramDamage: 5, // Ram prow: ramming deals 5 instead of 3
  },

  // ----- Pirates -----
  corsair: {
    name: 'Corsair', short: 'Corsair', faction: 'pirates', class: 'corvette',
    hull: 7, shields: { front: 1, left: 1, right: 1, rear: 1 }, speed: [2, 4], clicks: 3,
    arcs: sides([w('breaching', 2)], [w('autocannon', 1)], [w('autocannon', 1)], [w('autocannon', 2)]),
    pd: [],
  },
  marauder: {
    name: 'Marauder', short: 'Marauder', faction: 'pirates', class: 'destroyer',
    hull: 10, shields: { front: 2, left: 2, right: 2, rear: 2 }, speed: [2, 4], clicks: 2,
    arcs: sides([w('breaching', 2)], [w('autocannon', 1)], [w('autocannon', 1)], [w('autocannon', 3)]),
    pd: [],
  },
  freehold: {
    name: 'Freehold', short: 'Freehold', faction: 'pirates', class: 'cruiser',
    hull: 14, shields: { front: 3, left: 3, right: 3, rear: 2 }, speed: [1, 3], clicks: 2,
    arcs: sides([w('breaching', 3)], [w('autocannon', 2)], [w('autocannon', 1)], [w('autocannon', 3)]),
    pd: [],
  },
};

// Movement and collision numbers (rules §3, §6).
export const MOVE = {
  segmentLength: 2, // units per speed point
  clickDegrees: 15,
  enemyCollisionDamage: 1,
  asteroidDamage: 2,
  edgeDamage: 2,
};

export const TIMING = {
  planSeconds: 120,
  introMs: 4000,
  moveMs: 3600,
  fireMs: 4200,
};

// Scenarios. Coordinates in units: x grows east (right), y grows south (down).
// Fleets list each ship's `y`; ships deploy `deployDepth` units in from their
// faction's edge, facing the other edge.
export const SCENARIOS = {
  m1: {
    id: 'm1',
    name: 'Drift Field',
    map: { w: 36, h: 20 },
    rounds: 8,
    deployDepth: 3,
    // A new random asteroid layout is rolled for every battle.
    asteroidField: {
      count: [3, 6], // min and max number of asteroids
      radius: [0.7, 1.4],
      area: { x0: 9, x1: 27, y0: 2.5, y1: 17.5 }, // centers stay in the middle, away from deployment
      gap: 1.6, // min open space between two asteroids, so ships can pass
    },
    // Rules §12 fleets.
    fleets: {
      protectorate: [
        { type: 'lancer', y: 3 },
        { type: 'warden', y: 6.5 },
        { type: 'valiant', y: 10 },
        { type: 'warden', y: 13.5 },
        { type: 'lancer', y: 17 },
      ],
      djnzuar: [
        { type: 'gnasher', y: 3 },
        { type: 'ripper', y: 6.5 },
        { type: 'warlord', y: 10 },
        { type: 'ripper', y: 13.5 },
        { type: 'gnasher', y: 17 },
      ],
      pirates: [
        { type: 'corsair', y: 3 },
        { type: 'marauder', y: 6.5 },
        { type: 'freehold', y: 10 },
        { type: 'marauder', y: 13.5 },
        { type: 'corsair', y: 17 },
      ],
    },
  },
};
