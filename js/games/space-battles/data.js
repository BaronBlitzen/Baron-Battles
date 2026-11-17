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
    traits: { ram: null },
  },
  djnzuar: {
    id: 'djnzuar',
    name: 'Djnzuar',
    short: 'Djnzuar',
    color: '#ff922b',
    available: true,
    blurb: 'Big, slow, brutal up close. They ram.',
    // Ramming: when this faction's ship collides with an enemy ship,
    // the enemy takes `enemyDamage` and the rammer takes `selfDamage`.
    traits: { ram: { enemyDamage: 3, selfDamage: 1 } },
  },
  pirates: {
    id: 'pirates',
    name: 'Pirates',
    short: 'Pirates',
    color: '#cc5de8',
    available: false, // coming in a later milestone
    blurb: 'Coming soon',
    traits: { ram: null },
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
  corvette: { name: 'Corvette', length: 1.0, width: 0.5, value: 2 },
  destroyer: { name: 'Destroyer', length: 1.4, width: 0.7, value: 3 },
  cruiser: { name: 'Cruiser', length: 2.0, width: 1.0, value: 5 },
  battleship: { name: 'Battleship', length: 2.8, width: 1.4, value: 8 },
};

export const ZONES = ['front', 'left', 'right', 'rear'];
export const ZONE_NAMES = { front: 'Front', left: 'Left', right: 'Right', rear: 'Rear' };

// Ship types. `arcs` lists the weapons in each hull zone's firing arc.
// `speed` is [min, max]; `clicks` is the max turn clicks per segment (1 click = 15°).
export const SHIPS = {
  lancer: {
    name: 'Lancer Torpedo Boat', short: 'Lancer', faction: 'protectorate', class: 'corvette',
    hull: 4, shields: { front: 1, left: 1, right: 1, rear: 0 }, speed: [2, 4], clicks: 3,
    arcs: {
      front: [{ weapon: 'torpedo', shots: 3 }],
      left: [{ weapon: 'railgun', shots: 1 }],
      right: [{ weapon: 'railgun', shots: 1 }],
      rear: [],
    },
    pd: [{ weapon: 'flak', shots: 1 }],
  },
  valiant: {
    name: 'Valiant Strike Carrier', short: 'Valiant', faction: 'protectorate', class: 'cruiser',
    hull: 9, shields: { front: 3, left: 2, right: 2, rear: 1 }, speed: [1, 4], clicks: 2,
    arcs: {
      front: [{ weapon: 'railgun', shots: 3 }],
      left: [{ weapon: 'railgun', shots: 3 }],
      right: [{ weapon: 'railgun', shots: 3 }],
      rear: [{ weapon: 'railgun', shots: 1 }],
    },
    pd: [{ weapon: 'flak', shots: 2 }],
    squadrons: 0, // carries 3 in the full rules; none in Milestone 1
  },
  gnasher: {
    name: 'Gnasher Raider', short: 'Gnasher', faction: 'djnzuar', class: 'corvette',
    hull: 6, shields: { front: 2, left: 1, right: 1, rear: 0 }, speed: [1, 3], clicks: 2,
    arcs: {
      front: [{ weapon: 'plasma', shots: 3 }],
      left: [{ weapon: 'plasma', shots: 1 }],
      right: [{ weapon: 'plasma', shots: 1 }],
      rear: [],
    },
    pd: [],
  },
  broodmaw: {
    name: 'Broodmaw Cruiser', short: 'Broodmaw', faction: 'djnzuar', class: 'cruiser',
    hull: 13, shields: { front: 3, left: 2, right: 2, rear: 1 }, speed: [1, 2], clicks: 1,
    arcs: {
      front: [{ weapon: 'plasma', shots: 4 }],
      left: [{ weapon: 'plasma', shots: 3 }, { weapon: 'spine', shots: 1 }],
      right: [{ weapon: 'plasma', shots: 3 }, { weapon: 'spine', shots: 1 }],
      rear: [{ weapon: 'spine', shots: 1 }],
    },
    pd: [{ weapon: 'thorn', shots: 2 }],
    squadrons: 0, // carries 3 in the full rules; none in Milestone 1
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
// Heading in degrees: 0 = east, 90 = south, 180 = west, 270 = north.
export const SCENARIOS = {
  m1: {
    id: 'm1',
    name: 'Drift Field',
    map: { w: 36, h: 20 },
    rounds: 8,
    asteroids: [
      // The center rock blocks the cruisers' straight line; the others sit
      // just off the starting lanes (y = 5, 10, 15).
      { x: 18, y: 10, r: 1.4 },
      { x: 13, y: 6.8, r: 1.0 },
      { x: 23, y: 13.2, r: 1.0 },
      { x: 12.5, y: 12.8, r: 0.8 },
      { x: 23.5, y: 7, r: 0.8 },
      { x: 18, y: 3, r: 0.7 },
      { x: 18, y: 17, r: 0.7 },
      { x: 9, y: 8, r: 0.6 },
      { x: 27, y: 12, r: 0.6 },
    ],
    fleets: {
      protectorate: [
        { type: 'lancer', x: 3, y: 5, heading: 0 },
        { type: 'valiant', x: 3, y: 10, heading: 0 },
        { type: 'lancer', x: 3, y: 15, heading: 0 },
      ],
      djnzuar: [
        { type: 'gnasher', x: 33, y: 5, heading: 180 },
        { type: 'broodmaw', x: 33, y: 10, heading: 180 },
        { type: 'gnasher', x: 33, y: 15, heading: 180 },
      ],
      pirates: [],
    },
  },
};
