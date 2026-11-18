// Space Battles – game data. Plain data only: factions, weapons, ship classes,
// ships and scenarios. To add a ship or a weapon, add an entry here; the logic
// in rules.js / host.js / controller.js reads everything from these tables.
// Numbers come from docs/space-battles-rules.md.

export const FACTIONS = {
  protectorate: {
    id: 'protectorate',
    name: 'Human Protectorate',
    short: 'Protectorate',
    color: '#4dabf7', // blue
    // Each player on the team gets the next shade, so teammates can be told apart.
    shades: ['#4dabf7', '#a5d8ff', '#1971c2', '#74c0fc', '#d0ebff', '#1864ab', '#339af0', '#e7f5ff'],
    available: true,
    blurb: 'Strike carriers, mobility, medium capital ships',
    edge: 'west', // deployment edge (null = whichever edge is free)
    // Trained helms: +1 extra turn click when using Evasive or Full Burn.
    // Hangar repair: at the end of the round, friendly squadrons within close range of their
    // own carrier restore `hangarRepair` hull (not above max).
    traits: { ram: null, home: null, trainedHelms: 1, repair: null, hangarRepair: 1 },
  },
  djnzuar: {
    id: 'djnzuar',
    name: 'Djnzuar',
    short: 'Djnzuar',
    color: '#ff922b', // orange
    shades: ['#ff922b', '#ffd8a8', '#d9480f', '#ffc078', '#fff4e6', '#e8590c', '#ffa94d', '#c2410c'],
    available: true,
    blurb: 'Big, slow, brutal up close. They ram.',
    edge: 'east',
    // Ramming: when this faction's ship collides with an enemy ship, the enemy takes
    // `enemyDamage` (or the ship's own `ramDamage`) and the rammer takes `selfDamage`.
    // Samurai engineers: Damage Control restores 3 shields or 1 hull, and also removes 1 critical.
    traits: { ram: { enemyDamage: 3, selfDamage: 1 }, home: null, trainedHelms: 0, repair: { shields: 3, hull: 1, alsoRemoveCrit: true } },
  },
  pirates: {
    id: 'pirates',
    name: 'Pirates',
    short: 'Pirates',
    color: '#51cf66', // green
    shades: ['#51cf66', '#b2f2bb', '#2b8a3e', '#8ce99a', '#ebfbee', '#2f9e44', '#69db7c', '#237032'],
    available: true,
    blurb: 'Tough, fast generalists. Turrets fire in any direction.',
    edge: null,
    // Every ship is home: the first time a ship drops to half hull or less, next round
    // it may move as if using Full Burn (change speed by up to 2, go up to 1 over max).
    traits: { ram: null, home: { speedChange: 2, overMax: 1 }, trainedHelms: 0, repair: null },
  },
};
export const FACTION_ORDER = ['protectorate', 'djnzuar', 'pirates'];

// Hit chance per range band. A band that is missing means "can't fire at that range".
// `desc` is the short description shown on phones during fleet building.
// Optional fields:
//   once: true          – once per game; the player chooses Hold / Fire, then it's used up
//   effect              – what a hit does besides damage:
//     'ion'      damage only removes shields, never hull
//     'acid'     each hit: 1 extra hull damage at the end of the NEXT round (ignores shields, stacks)
//     'grapple'  pulls the target up to `pull` u toward the attacker; it can't speed up next round
//     'disrupt'  target gets −1 turn click per segment next round (doesn't stack)
//     'board'    target automatically takes 1 critical
//   hitVsSquadron       – hit chances used against squadrons instead of `hit`
//   fullVsSquadrons     – uses its normal hit chance against squadrons (no SQUADRON.hitPenalty)
//   noSquadrons         – can't target squadrons at all
//   pd                  – point-defense: fires on its own at the nearest enemy squadron in close
//                         range (full hit chance); never aimed by the player
export const WEAPONS = {
  railgun: { name: 'Railgun', hit: { close: 0.6, medium: 0.6, long: 0.5 }, damage: 1, crit: 0.1,
    desc: 'Long-range workhorse. Steady at every range.' },
  torpedo: { name: 'Torpedo Volley', hit: { close: 0.75, medium: 0.5 }, damage: 2, crit: 0.25, once: true,
    desc: 'Once per game. A devastating close-to-medium salvo.' },
  lance: { name: 'Particle Lance', hit: { close: 0.5, medium: 0.6, long: 0.65 }, damage: 3, crit: 0.2,
    desc: 'One heavy, accurate long-range beam.' },
  ion: { name: 'Ion Cannon', hit: { close: 0.7, medium: 0.6, long: 0.4 }, damage: 2, crit: 0, effect: 'ion', noSquadrons: true,
    desc: 'Strips shields (2 per hit) but can\'t hurt hull. Opens a zone for the guns behind it.' },
  flak: { name: 'Flak', hit: { close: 0.6 }, damage: 1, crit: 0, pd: true,
    desc: 'Point-defense against squadrons.' },
  plasma: { name: 'Plasma Cannon', hit: { close: 0.8, medium: 0.5 }, damage: 1, crit: 0.15,
    desc: 'Brawler gun. Deadly up close.' },
  maw: { name: 'Plasma Maw', hit: { close: 0.8, medium: 0.4 }, damage: 2, crit: 0.2,
    desc: 'Huge front-mounted plasma jaws. Big ships only.' },
  spine: { name: 'Spine Driver', hit: { close: 0.5, medium: 0.5, long: 0.4 }, damage: 1, crit: 0.05,
    desc: 'Their only long-range weapon.' },
  acid: { name: 'Acid Spitter', hit: { close: 0.7 }, damage: 1, crit: 0.05, effect: 'acid',
    desc: 'Close only. Each hit burns 1 more hull at the end of the next round, ignoring shields.' },
  grapple: { name: 'Grapple Harpoon', hit: { close: 0.7, medium: 0.5 }, damage: 1, crit: 0.05, effect: 'grapple', pull: 1,
    desc: 'A hit pulls the target 1 u toward you, and it can\'t speed up next round. Sets up rams.' },
  thorn: { name: 'Thorn Burst', hit: { close: 0.5 }, damage: 1, crit: 0, pd: true,
    desc: 'Point-defense against squadrons.' },
  autocannon: { name: 'Autocannon', hit: { close: 0.65, medium: 0.55, long: 0.35 }, damage: 1, crit: 0.1, fullVsSquadrons: true,
    desc: 'Generalist. Full accuracy against squadrons too.' },
  breaching: { name: 'Breaching Cannon', hit: { close: 0.75, medium: 0.45 }, damage: 1, crit: 0.35,
    desc: 'Rips ships open: high crit chance.' },
  flechette: { name: 'Flechette Gun', hit: { close: 0.5 }, hitVsSquadron: { close: 0.7 }, damage: 1, crit: 0.05,
    desc: 'Close only. A storm of small shots; great against squadrons.' },
  disruptor: { name: 'Disruptor', hit: { close: 0.6, medium: 0.5 }, damage: 1, crit: 0.1, effect: 'disrupt',
    desc: 'A hit gives the target −1 turn click per segment next round.' },
  boarding: { name: 'Boarding Harpoon', hit: { close: 0.7 }, damage: 1, crit: 0, once: true, effect: 'board', noSquadrons: true,
    desc: 'Once per game. Close only. A hit always causes 1 critical.' },
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

// Ship types. `arcs` lists the weapons in each firing arc. Each entry is one "weapon":
// all its shots go at the same target, but different weapons may pick different targets.
// `speed` is [min, max]; `clicks` is the max turn clicks per segment (1 click = 15°).
// Optional `clicksAtSpeed` overrides `clicks` at specific speeds, e.g. { 1: 2 }.
// Optional `ramDamage` overrides the faction's ram damage for this ship.
export const SHIPS = {
  // ----- Human Protectorate -----
  lancer: {
    name: 'Lancer Torpedo Boat', short: 'Lancer', faction: 'protectorate', class: 'corvette',
    cost: 7, desc: 'A fast, fragile knife. Saves its torpedo volley for one decisive strike.',
    hull: 4, shields: { front: 1, left: 1, right: 1, rear: 0 }, speed: [2, 4], clicks: 3,
    arcs: sides([w('railgun', 1), w('torpedo', 3)], [w('railgun', 1)], []),
    pd: [w('flak', 1)],
  },
  warden: {
    name: 'Warden Escort', short: 'Warden', faction: 'protectorate', class: 'destroyer',
    cost: 10, desc: 'Bodyguard for the carriers. Heavy flak screens friendly ships from squadrons, and its ion guns strip enemy shields.',
    hull: 6, shields: { front: 2, left: 1, right: 1, rear: 1 }, speed: [1, 3], clicks: 2,
    arcs: sides([w('railgun', 3)], [w('railgun', 1), w('ion', 1)], [w('railgun', 1)]),
    pd: [w('flak', 3)],
    screen: true, // Warden Screen: enemy squadrons attacking friendly ships within close range lose 1 shot
  },
  valiant: {
    name: 'Valiant Strike Carrier', short: 'Valiant', faction: 'protectorate', class: 'cruiser',
    cost: 18, desc: 'Fast for its size. Launches a wing of 3 squadrons and fights at range.',
    hull: 9, shields: { front: 3, left: 2, right: 2, rear: 1 }, speed: [1, 4], clicks: 2,
    arcs: sides([w('railgun', 2), w('ion', 1)], [w('railgun', 3)], [w('railgun', 1)]),
    pd: [w('flak', 2)],
    squadrons: 3, // carrier: holds up to 3 squadrons, bought in fleet building
  },
  bastion: {
    name: 'Bastion Battleship', short: 'Bastion', faction: 'protectorate', class: 'battleship',
    cost: 28, desc: 'A rare Protectorate heavy hitter, with a spinal Particle Lance.',
    hull: 14, shields: { front: 4, left: 3, right: 3, rear: 2 }, speed: [1, 2], clicks: 1,
    arcs: sides([w('lance', 1), w('railgun', 3)], [w('railgun', 4)], [w('railgun', 2)]),
    pd: [w('flak', 2)],
  },

  // ----- Djnzuar -----
  gnasher: {
    name: 'Gnasher Raider', short: 'Gnasher', faction: 'djnzuar', class: 'corvette',
    cost: 7, desc: 'A cheap, armored hunter that closes fast and spits acid.',
    hull: 6, shields: { front: 2, left: 1, right: 1, rear: 0 }, speed: [1, 3], clicks: 2,
    arcs: sides([w('plasma', 3)], [w('acid', 1)], []),
    pd: [],
  },
  ripper: {
    name: 'Ripper Destroyer', short: 'Ripper', faction: 'djnzuar', class: 'destroyer',
    cost: 12, desc: 'Harpoons its prey and drags it close for the kill.',
    hull: 9, shields: { front: 2, left: 2, right: 2, rear: 0 }, speed: [1, 3], clicks: 2,
    arcs: sides([w('plasma', 3), w('grapple', 1)], [w('plasma', 2), w('spine', 1)], []),
    pd: [w('thorn', 1)],
  },
  broodmaw: {
    name: 'Broodmaw Cruiser', short: 'Broodmaw', faction: 'djnzuar', class: 'cruiser',
    cost: 20, desc: 'A brood-ship that launches Grunt and Brute squadrons; nimble only when slow.',
    hull: 13, shields: { front: 3, left: 2, right: 2, rear: 1 }, speed: [1, 2], clicks: 1,
    clicksAtSpeed: { 1: 2 }, // more nimble when slow: 2 clicks per segment at speed 1
    arcs: sides([w('plasma', 4)], [w('plasma', 2), w('acid', 1), w('spine', 1)], [w('spine', 1)]),
    pd: [w('thorn', 2)],
    squadrons: 3, // carrier: holds up to 3 squadrons, bought in fleet building
  },
  warlord: {
    name: 'Warlord Dreadhulk', short: 'Dreadhulk', faction: 'djnzuar', class: 'battleship',
    cost: 32, desc: 'A flying fortress with a ram prow. Dares anyone to get close.',
    hull: 20, shields: { front: 5, left: 3, right: 3, rear: 1 }, speed: [1, 2], clicks: 1,
    arcs: sides([w('maw', 2), w('plasma', 3), w('grapple', 1)], [w('plasma', 4), w('spine', 2)], [w('spine', 1)]),
    pd: [w('thorn', 2)],
    ramDamage: 5, // Ram prow: ramming deals 5 instead of 3
  },

  // ----- Pirates -----
  corsair: {
    name: 'Corsair', short: 'Corsair', faction: 'pirates', class: 'corvette',
    cost: 10, desc: 'A fast raider that latches on with a boarding harpoon and tears ships open.',
    hull: 7, shields: { front: 1, left: 1, right: 1, rear: 1 }, speed: [2, 4], clicks: 3,
    arcs: sides([w('breaching', 2), w('boarding', 1)], [w('autocannon', 1)], [w('autocannon', 1)], [w('autocannon', 2)]),
    pd: [],
  },
  marauder: {
    name: 'Marauder', short: 'Marauder', faction: 'pirates', class: 'destroyer',
    cost: 14, desc: 'A sturdy all-rounder whose disruptor leaves targets wallowing.',
    hull: 10, shields: { front: 2, left: 2, right: 2, rear: 2 }, speed: [2, 4], clicks: 2,
    arcs: sides([w('breaching', 2)], [w('flechette', 2)], [w('autocannon', 1)], [w('autocannon', 2), w('disruptor', 1)]),
    pd: [],
  },
  freehold: {
    name: 'Freehold', short: 'Freehold', faction: 'pirates', class: 'cruiser',
    cost: 22, desc: 'A whole crew\'s home and fortress, bristling with flechettes against squadrons.',
    hull: 14, shields: { front: 3, left: 3, right: 3, rear: 2 }, speed: [1, 3], clicks: 2,
    arcs: sides([w('breaching', 3), w('disruptor', 1)], [w('flechette', 4)], [w('autocannon', 1)], [w('autocannon', 3)]),
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
  squadMoveMs: 1400, // squadrons move after ships (only when there are squadrons)
  fireMs: 4200,
};


// Fleet building (rules §1): each side gets `sidePoints`, split evenly (rounded down)
// between that side's players. A side can't have more than `maxShipsPerSide` ships.
export const FLEET = {
  sidePoints: 60,
  maxShipsPerSide: 10,
};

// Missions (rules §10). Only `available` ones can be picked on the TV for now.
export const MISSIONS = [
  { id: 'battle', name: 'Battle', available: true, desc: 'Last fleet standing wins, or make the enemy surrender.' },
  { id: 'control', name: 'Control Points', available: false, desc: 'Hold beacons to score. First to 10.' },
  { id: 'salvage', name: 'Salvage', available: false, desc: 'Grab crates and bring them home. First to 10.' },
  { id: 'escort', name: 'Escort', available: false, desc: 'Get your freighter across the map. First to 10.' },
  { id: 'station', name: 'Station Assault', available: false, desc: 'Wreck the enemy station. First to 10.' },
  { id: 'random', name: 'Random', available: false, desc: 'One of the missions above, picked at random.' },
];

// Scenarios. Coordinates in units: x grows east (right), y grows south (down).
// Ships deploy `deployDepth` units in from their faction's edge, spread evenly
// from top to bottom, facing the other edge.
export const SCENARIOS = {
  m1: {
    id: 'm1',
    name: 'Drift Field',
    map: { w: 36, h: 20 },
    deployDepth: 3,
    // A new random asteroid layout is rolled for every battle.
    asteroidField: {
      count: [3, 6], // min and max number of asteroids
      radius: [0.7, 1.4],
      area: { x0: 9, x1: 27, y0: 2.5, y1: 17.5 }, // centers stay in the middle, away from deployment
      gap: 1.6, // min open space between two asteroids, so ships can pass
    },
  },
};

// Stances (rules §5). Picked secretly in Plan Movement, revealed when the Move starts,
// and kept for the whole round. A ship can't pick the same stance two rounds in a row
// (Balanced is the exception). The numbers below are read by rules.js.
export const STANCES = {
  balanced: { name: 'Balanced', icon: '◆', desc: 'No bonus, no penalty.' },
  brace: { name: 'Brace', icon: '🛡', desc: 'All damage taken is halved (each hit, rounded up). −1 shot on every arc; max 1 turn click.',
    halveDamage: true, shotPenalty: 1, maxClicks: 1 },
  shieldCharge: { name: 'Shield Charge', icon: '⚡', desc: 'Pick a zone: +2 shields there this round. The opposite zone\'s shields count as 0.',
    chargeShields: 2, needsZone: true },
  evasive: { name: 'Evasive', icon: '💨', desc: '+1 turn click. Attacks against you from long range lose 1 shot. Fire from only 1 arc.',
    extraClicks: 1, maxArcs: 1, longRangeShotPenalty: 1, helms: true },
  fullBurn: { name: 'Full Burn', icon: '🔥', desc: 'Change speed by up to 2, up to 1 over max. Can\'t fire; rear shields count as 0.',
    speedChange: 2, overMax: 1, maxArcs: 0, rearShieldsOff: true, helms: true },
  overcharge: { name: 'Overcharge', icon: '💥', desc: '+1 shot on every weapon you fire. Attacks against you deal +1 damage. Can\'t change speed.',
    shotBonus: 1, damageTakenBonus: 1, holdSpeed: true },
  hunter: { name: 'Hunter', icon: '🎯', desc: 'Mark an enemy ship: +1 shot on every weapon and reroll misses against it; it can\'t use Evasive against you. You may only attack it.',
    needsTarget: true, huntShotBonus: 1, reroll: true },
  damageControl: { name: 'Damage Control', icon: '🔧', desc: 'End of round: restore 2 shields or 1 hull, or remove 1 critical. Must slow down by 1; −1 shot on every arc.',
    shotPenalty: 1, mustSlow: true, repair: { shields: 2, hull: 1, alsoRemoveCrit: false } },
};
export const STANCE_ORDER = ['balanced', 'brace', 'shieldCharge', 'evasive', 'fullBurn', 'overcharge', 'hunter', 'damageControl'];

// Stances each class may use (Balanced is always allowed).
export const CLASS_STANCES = {
  corvette: ['evasive', 'fullBurn', 'hunter', 'overcharge'],
  destroyer: ['evasive', 'fullBurn', 'hunter', 'shieldCharge'],
  cruiser: ['brace', 'shieldCharge', 'evasive', 'overcharge', 'damageControl'],
  battleship: ['brace', 'shieldCharge', 'overcharge', 'damageControl', 'hunter'],
};

// Criticals (rules §7). A hit that gets past the shields rolls its weapon's `crit` chance;
// on a crit the ship gets a random critical from CRIT_POOL. Criticals stack and stay until
// Damage Control removes them (none wear off on their own).
// `nextRound`: takes effect from the next round on (Weapons Offline, Bridge Fire, Comms Down).
export const CRITICALS = {
  engines: { name: 'Damaged Engines', icon: '⚙', desc: 'Max speed −1.' },
  thrusters: { name: 'Jammed Thrusters', icon: '↺', desc: '−1 turn click per segment.' },
  weaponsOffline: { name: 'Weapons Offline', icon: '⊘', desc: 'One arc can\'t fire (from next round) until repaired.', nextRound: true },
  shieldGen: { name: 'Shield Generator Hit', icon: '✖', desc: 'One zone\'s shields can\'t be restored.' },
  bridgeFire: { name: 'Bridge Fire', icon: '🔥', desc: '1 hull damage at the end of each round (from next round), ignoring shields.', nextRound: true, burn: 1 },
  comms: { name: 'Comms Down', icon: '📡', desc: 'This ship\'s squadrons ignore new orders (from next round) until repaired.', nextRound: true },
};
// Criticals that can be rolled. Comms Down is only rolled on a carrier that still has living
// squadrons (other ships pick from the rest).
export const CRIT_POOL = ['engines', 'thrusters', 'weaponsOffline', 'shieldGen', 'bridgeFire', 'comms'];

// Squadrons (rules §8). Small automatic units: hull but no shields or zones, close range only.
// Bought in fleet building to fill a carrier (`SHIPS[type].squadrons` slots). `role`:
//   fighter  – shoots the nearest enemy squadron in close range, else the nearest enemy ship
//   bomber   – shoots the nearest enemy ship in close range, else the nearest enemy squadron
//   boarding – never shoots; `latch`: ending its move touching an enemy ship gives that ship
//              1 critical at the end of the round, then the pod is removed
// `vsSquadron` / `vsShip` = { shots, hit, damage }. `crit` = crit chance of its hits on ships.
export const SQUADRONS = {
  hawk: { name: 'Hawk', short: 'Hawk', faction: 'protectorate', role: 'fighter', cost: 2, hull: 3, speed: 5,
    vsSquadron: { shots: 2, hit: 0.6, damage: 1 }, vsShip: { shots: 1, hit: 0.4, damage: 1 }, crit: 0,
    desc: 'Fighter. Hunts enemy squadrons first.' },
  talon: { name: 'Talon', short: 'Talon', faction: 'protectorate', role: 'bomber', cost: 2, hull: 3, speed: 4,
    vsSquadron: { shots: 1, hit: 0.3, damage: 1 }, vsShip: { shots: 2, hit: 0.65, damage: 1 }, crit: 0.15,
    desc: 'Bomber. Goes after ships first.' },
  grunt: { name: 'Grunt Swarmers', short: 'Swarmers', faction: 'djnzuar', role: 'fighter', cost: 2, hull: 2, speed: 4,
    vsSquadron: { shots: 2, hit: 0.5, damage: 1 }, vsShip: { shots: 1, hit: 0.3, damage: 1 }, crit: 0,
    desc: 'Fighter. Very cheap. Hunts enemy squadrons first.' },
  brute: { name: 'Brute Gorers', short: 'Gorers', faction: 'djnzuar', role: 'bomber', cost: 4, hull: 4, speed: 3,
    vsSquadron: { shots: 1, hit: 0.3, damage: 1 }, vsShip: { shots: 2, hit: 0.7, damage: 1 }, crit: 0.15,
    desc: 'Bomber. Tough; goes after ships first.' },
  pod: { name: 'Grunt Boarding Pod', short: 'Pod', faction: 'djnzuar', role: 'boarding', cost: 2, hull: 1, speed: 4,
    latch: true, crit: 0,
    desc: 'Doesn\'t shoot. If it ends its move touching an enemy ship, that ship gets 1 critical at the end of the round (then the pod is gone).' },
};
export const SQUADRON_ROLES = {
  fighter: { name: 'Fighter', letter: 'F' },
  bomber: { name: 'Bomber', letter: 'B' },
  boarding: { name: 'Boarding', letter: 'P' },
};

// Squadron numbers. `size` = circle diameter (u). Ship weapons without `fullVsSquadrons`,
// `hitVsSquadron` or `pd` lose `hitPenalty` hit chance against squadrons (never below `minHit`).
export const SQUADRON = {
  size: 0.4,
  value: 1, // kill points / fleet value
  hitPenalty: 0.2,
  minHit: 0.1,
  escortGap: 0.6, // Escort: each squadron flies to its own spot this far from the carrier's hull
  latchDist: 0.25, // Boarding Pod: "touching" = within this distance of the ship's outline
};

// Wing orders (rules §8): one per carrier, given in Plan Movement. Every wing starts on Escort,
// and keeps its last order when the player times out (or the carrier has Comms Down).
export const WING_ORDERS = {
  escort: { name: 'Escort', icon: '🛡', desc: 'Stay next to the carrier.' },
  attack: { name: 'Attack', icon: '⚔', desc: 'Fly at an enemy ship and stop next to it. If it\'s destroyed, go for the nearest enemy ship.', needsTarget: true },
  intercept: { name: 'Intercept', icon: '✈', desc: 'Fly at the nearest enemy squadron (Escort if there are none).' },
};
export const WING_ORDER_LIST = ['escort', 'attack', 'intercept'];
