// Space Battles – game data. Plain data only: factions, weapons, ship classes,
// ships and scenarios. To add a ship or a weapon, add an entry here; the logic
// in rules.js / host.js / controller.js reads everything from these tables.
// Numbers come from docs/space-battles-weapons-v2.md (weapons, ships) and
// docs/space-battles-rules.md (everything else).

export const FACTIONS = {
  protectorate: {
    id: 'protectorate',
    name: 'Human Protectorate',
    short: 'Protectorate',
    color: '#4dabf7', // blue
    // Each player on the team gets the next shade, so teammates can be told apart.
    shades: ['#4dabf7', '#a5d8ff', '#1971c2', '#74c0fc', '#d0ebff', '#1864ab', '#339af0', '#e7f5ff'],
    available: true,
    blurb: 'Strike carriers, long-range guns, fast escorts',
    edge: 'west', // deployment edge (null = whichever edge is free)
    // Trained helms: +1 extra turn click when using Evasive or Full Burn.
    // Hangar repair: at the end of the round, squadrons docked in their living carrier
    // restore `hangarRepair` hull (not above max).
    traits: { ram: null, home: null, trainedHelms: 1, repair: null, hangarRepair: 1 },
  },
  djnzuar: {
    id: 'djnzuar',
    name: 'Djnzuar',
    short: 'Djnzuar',
    color: '#ff922b', // orange
    shades: ['#ff922b', '#ffd8a8', '#d9480f', '#ffc078', '#fff4e6', '#e8590c', '#ffa94d', '#c2410c'],
    available: true,
    blurb: 'Big, tough, brutal up close. They ram.',
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
    blurb: 'Tough, fast, tricky. Turrets fire in any direction.',
    edge: null,
    // Every ship is home: the first time a ship drops to half hull or less, next round
    // it may move as if using Full Burn (change speed by up to 2, go up to 1 over max).
    traits: { ram: null, home: { speedChange: 2, overMax: 1 }, trainedHelms: 0, repair: null },
  },
};
export const FACTION_ORDER = ['protectorate', 'djnzuar', 'pirates'];

// To hit (weapons v2): every shot rolls a d10 and hits on `base`+, plus the target's agility.
// A roll of `critOn` (10) always hits and is a critical: double damage while the zone still
// has shields, otherwise a critical effect.
export const HIT = { die: 10, base: 4, critOn: 10 };

// Firing arcs (weapons v2). The ship points up in the pictures; angles are from the nose.
//   spinal  – narrow, straight ahead (±15°)
//   battery – everything except the rear 90° (±135°)
//   turret  – any direction
export const ARCS = ['spinal', 'battery', 'turret'];
export const ARC_DEFS = {
  spinal: { name: 'Spinal', half: 15, desc: '30° straight ahead' },
  battery: { name: 'Battery', half: 135, desc: '270°, everything but the rear' },
  turret: { name: 'Turret', half: 180, desc: '360°, any direction' },
};

// Weapons. One entry = one line on the ship card, e.g. "Railgun Battery · Battery · ⚡2 · Long · 1×2".
//   arc     – 'spinal' | 'battery' | 'turret'
//   reach   – farthest range band it can hit ('close' | 'medium' | 'long')
//   power   – power it costs to fire (point-defense is free)
//   damage, shots – "damage × shots"
//   desc    – short description shown on phones
// Optional:
//   once: true       – once per game; the player chooses Hold / Fire, then it's used up
//   critOn           – crits on this roll or higher (Breaching: 9)
//   effect           – what a hit does besides damage:
//     'ion'      each hit only removes shields (2, or 4 on a critical), never hull
//     'acid'     each hit: 1 extra hull damage at the end of the NEXT round (ignores shields, stacks)
//     'grapple'  pulls the target up to `pull` u toward the attacker; it can't speed up next round
//     'disrupt'  target gets −1 turn click per segment next round (doesn't stack)
//     'board'    target automatically takes 1 critical
//   noSquadrons      – can't target squadrons
//   pd               – point-defense: free, fires on its own at the nearest enemy squadron in close
//                      range and ignores squadron agility; never aimed by the player. Its number
//                      of shots is set per ship.
export const WEAPONS = {
  // ----- Protectorate -----
  railBattery: { name: 'Railgun Battery', arc: 'battery', reach: 'long', power: 2, damage: 1, shots: 2,
    desc: 'Long-range workhorse.' },
  heavyRail: { name: 'Heavy Railgun Battery', arc: 'battery', reach: 'long', power: 3, damage: 1, shots: 3,
    desc: 'More railguns, more power.' },
  ion: { name: 'Ion Cannon', arc: 'battery', reach: 'medium', power: 1, damage: 2, shots: 2, effect: 'ion', noSquadrons: true,
    desc: 'Each hit strips 2 shields but can\'t hurt hull. Opens a zone for the guns behind it.' },
  torpedo: { name: 'Torpedo Tubes', arc: 'spinal', reach: 'medium', power: 2, damage: 2, shots: 2,
    desc: 'Heavy torpedoes, fired straight ahead.' },
  lance: { name: 'Particle Lance', arc: 'spinal', reach: 'long', power: 4, damage: 3, shots: 2,
    desc: 'A huge long-range beam. Point the whole ship at the target.' },
  flak: { name: 'Flak', arc: 'turret', reach: 'close', power: 0, damage: 1, shots: 1, pd: true,
    desc: 'Point-defense against squadrons.' },
  // ----- Djnzuar -----
  plasma: { name: 'Plasma Battery', arc: 'battery', reach: 'close', power: 2, damage: 1, shots: 3,
    desc: 'Brawler guns. Deadly up close.' },
  heavyPlasma: { name: 'Heavy Plasma Battery', arc: 'battery', reach: 'close', power: 3, damage: 1, shots: 4,
    desc: 'A wall of plasma at close range.' },
  maw: { name: 'Plasma Maw', arc: 'spinal', reach: 'medium', power: 3, damage: 2, shots: 3,
    desc: 'Huge front-mounted plasma jaws.' },
  spine: { name: 'Spine Driver', arc: 'battery', reach: 'long', power: 1, damage: 1, shots: 1,
    desc: 'Their only long-range weapon.' },
  acid: { name: 'Acid Spitter', arc: 'battery', reach: 'close', power: 1, damage: 1, shots: 1, effect: 'acid',
    desc: 'Each hit burns 1 more hull at the end of the next round, ignoring shields.' },
  grapple: { name: 'Grapple Harpoon', arc: 'battery', reach: 'medium', power: 1, damage: 1, shots: 1, effect: 'grapple', pull: 1,
    desc: 'A hit pulls the target 1 u toward you, and it can\'t speed up next round. Sets up rams.' },
  thorn: { name: 'Thorn Burst', arc: 'turret', reach: 'close', power: 0, damage: 1, shots: 1, pd: true,
    desc: 'Point-defense against squadrons.' },
  // ----- Pirates -----
  autocannon: { name: 'Autocannon Turret', arc: 'turret', reach: 'medium', power: 2, damage: 1, shots: 3,
    desc: 'Fires in any direction.' },
  breaching: { name: 'Breaching Cannon', arc: 'battery', reach: 'close', power: 2, damage: 1, shots: 3, critOn: 9,
    desc: 'Rips ships open: crits on a 9 or 10.' },
  disruptor: { name: 'Disruptor', arc: 'battery', reach: 'medium', power: 1, damage: 1, shots: 1, effect: 'disrupt',
    desc: 'A hit gives the target −1 turn click per segment next round.' },
  boarding: { name: 'Boarding Harpoon', arc: 'battery', reach: 'close', power: 1, damage: 1, shots: 1, once: true, effect: 'board', noSquadrons: true,
    desc: 'Once per game. A hit always causes 1 critical.' },
  flechette: { name: 'Flechette Gun', arc: 'turret', reach: 'close', power: 0, damage: 1, shots: 1, pd: true,
    desc: 'Point-defense: a storm of small shots against squadrons.' },
};

// Range bands, measured between the closest edges of two ships (in units).
export const RANGE_BANDS = [
  { id: 'close', name: 'Close', max: 3 },
  { id: 'medium', name: 'Medium', max: 6 },
  { id: 'long', name: 'Long', max: 9 },
];

// length = along the ship's heading, width = side to side. value = fleet value / kill points.
// agility = added to the number an attacker needs to hit this class.
export const CLASSES = {
  corvette: { name: 'Corvette', length: 0.75, width: 0.4, value: 2, agility: 2 },
  destroyer: { name: 'Destroyer', length: 1.05, width: 0.5, value: 3, agility: 1 },
  cruiser: { name: 'Cruiser', length: 1.5, width: 0.75, value: 5, agility: 0 },
  battleship: { name: 'Battleship', length: 2.1, width: 1.05, value: 8, agility: 0 },
};

// Hull zones (each a 90° wedge with its own shields). Damage hits the zone facing the attacker.
export const ZONES = ['front', 'left', 'right', 'rear'];
export const ZONE_NAMES = { front: 'Front', left: 'Left', right: 'Right', rear: 'Rear' };

// Special abilities (ship `special`).
export const SPECIALS = {
  mineDrop: { name: 'Mine Drop', icon: '💣', uses: 2,
    desc: 'Twice per game: drop a mine behind the ship at the end of its move.' },
  smugglersHold: { name: 'Smuggler\'s Hold', icon: '📦', uses: 1, hull: 2,
    desc: 'Once per game, end of round: restore 2 hull or remove 1 critical, on this ship or a friendly ship in close range.' },
};

// Mines (rules §2): a ship that moves within `triggerDist` u takes `damage` to the hull zone facing
// the mine, then the mine is gone. Mines are neutral. Dropped `dropBehind` u behind the ship's stern.
export const MINES = { triggerDist: 1, damage: 3, dropBehind: 1.3 };

const pd = (weapon, shots) => ({ weapon, shots });

// Ship types (weapons v2). `weapons` lists the ship's weapons in card order; `power` is how much
// power it has to fire them each round. `speed` is [min, max]; `clicks` is the max turn clicks per
// segment (1 click = 15°): `clicksAtSpeed` gives the clicks at each speed (slower = tighter turns) and
// `clicks` is used at any other speed (e.g. above max after a Full Burn). Optional: `pd` (point-defense),
// `squadrons` (carrier slots) and `carries` (squadron types it may hold), `special` (SPECIALS),
// `ramDamage`. `ratings` = the designer's 1–5 Offense / Defense / Mobility / Utility.
export const SHIPS = {
  // ----- Human Protectorate -----
  strikeCarrier: {
    name: 'Strike Carrier', short: 'Carrier', faction: 'protectorate', class: 'cruiser', cost: 22,
    ratings: { o: 4, d: 4, m: 3, u: 5 },
    desc: 'The fleet\'s centerpiece. Launches 3 squadrons and backs them up with long-range railguns.',
    hull: 10, shields: { front: 3, left: 3, right: 3, rear: 2 }, speed: [1, 4], clicks: 1, clicksAtSpeed: { 1: 2, 2: 2 }, power: 4,
    weapons: ['heavyRail', 'railBattery', 'ion'], pd: [pd('flak', 2)], squadrons: 3,
  },
  lancer: {
    name: 'Lancer', short: 'Lancer', faction: 'protectorate', class: 'cruiser', cost: 17,
    ratings: { o: 5, d: 3, m: 3 },
    desc: 'The hardest hitter in the fleet. Its spinal Particle Lance fires straight ahead at long range.',
    hull: 9, shields: { front: 3, left: 2, right: 2, rear: 1 }, speed: [1, 4], clicks: 1, clicksAtSpeed: { 1: 2, 2: 2 }, power: 6,
    weapons: ['lance', 'heavyRail', 'railBattery'], pd: [pd('flak', 1)],
  },
  escort: {
    name: 'Escort', short: 'Escort', faction: 'protectorate', class: 'destroyer', cost: 11,
    ratings: { o: 2, d: 3, m: 4 },
    desc: 'A quick all-rounder with the heaviest flak in the fleet.',
    hull: 7, shields: { front: 2, left: 2, right: 2, rear: 1 }, speed: [2, 4], clicks: 1, clicksAtSpeed: { 2: 3, 3: 2 }, power: 3,
    weapons: ['railBattery', 'railBattery', 'ion'], pd: [pd('flak', 3)],
  },
  torpedoBoat: {
    name: 'Torpedo Boat', short: 'Torpedo Boat', faction: 'protectorate', class: 'corvette', cost: 9,
    ratings: { o: 3, d: 1, m: 5 },
    desc: 'Very fast and very fragile. Lines up its torpedo tubes for hit-and-run strikes.',
    hull: 4, shields: { front: 1, left: 1, right: 1, rear: 0 }, speed: [2, 5], clicks: 2, clicksAtSpeed: { 2: 3, 3: 3, 4: 3 }, power: 2,
    weapons: ['torpedo', 'railBattery'],
  },

  // ----- Djnzuar -----
  queen: {
    name: 'Queen', short: 'Queen', faction: 'djnzuar', class: 'battleship', cost: 22,
    ratings: { o: 1, d: 5, m: 1, u: 5 },
    desc: 'A huge, slow mother ship. Barely armed, but its brood of 4 squadrons does the fighting.',
    hull: 20, shields: { front: 4, left: 3, right: 3, rear: 2 }, speed: [1, 2], clicks: 1, clicksAtSpeed: { 1: 2 }, power: 2,
    weapons: ['spine', 'spine', 'acid'], pd: [pd('thorn', 3)], squadrons: 4, carries: ['swarmers', 'latchers'],
  },
  brute: {
    name: 'Brute', short: 'Brute', faction: 'djnzuar', class: 'cruiser', cost: 16,
    ratings: { o: 4, d: 4, m: 2 },
    desc: 'A slow, armored bruiser. Harpoons enemies close, then unloads its plasma.',
    hull: 13, shields: { front: 3, left: 2, right: 2, rear: 1 }, speed: [1, 3], clicks: 1, clicksAtSpeed: { 1: 2 }, power: 5,
    weapons: ['heavyPlasma', 'plasma', 'grapple', 'spine'], pd: [pd('thorn', 1)],
  },
  samurai: {
    name: 'Samurai', short: 'Samurai', faction: 'djnzuar', class: 'destroyer', cost: 12,
    ratings: { o: 4, d: 2, m: 4 },
    desc: 'A fast, aggressive raider with cruiser-sized plasma guns and thin shields.',
    hull: 7, shields: { front: 2, left: 1, right: 1, rear: 0 }, speed: [2, 4], clicks: 1, clicksAtSpeed: { 2: 3, 3: 2 }, power: 4,
    weapons: ['heavyPlasma', 'plasma', 'acid'],
  },
  grunt: {
    name: 'Grunt', short: 'Grunt', faction: 'djnzuar', class: 'corvette', cost: 6,
    ratings: { o: 2, d: 2, m: 2 },
    desc: 'Cheap and expendable. Field a swarm of them.',
    hull: 3, shields: { front: 1, left: 1, right: 1, rear: 0 }, speed: [1, 3], clicks: 1, clicksAtSpeed: { 1: 2 }, power: 2,
    weapons: ['plasma', 'spine'],
  },

  // ----- Pirates -----
  firefly: {
    name: 'Firefly', short: 'Firefly', faction: 'pirates', class: 'corvette', cost: 8,
    ratings: { o: 2, d: 3, m: 5 },
    desc: 'Fast and nimble, and tough for a corvette. Circles its prey with a turret.',
    hull: 6, shields: { front: 2, left: 1, right: 1, rear: 1 }, speed: [2, 5], clicks: 2, clicksAtSpeed: { 2: 3, 3: 3, 4: 3 }, power: 2,
    weapons: ['autocannon', 'disruptor'],
  },
  rouge: {
    name: 'Rouge', short: 'Rouge', faction: 'pirates', class: 'corvette', cost: 9,
    ratings: { o: 3, d: 2, m: 4, u: 2 },
    desc: 'A fast boarder. Dives in, harpoons a ship to cripple it, and gets out.',
    hull: 5, shields: { front: 1, left: 1, right: 1, rear: 1 }, speed: [2, 4], clicks: 1, clicksAtSpeed: { 2: 3, 3: 2 }, power: 2,
    weapons: ['breaching', 'boarding'],
  },
  outrider: {
    name: 'Outrider', short: 'Outrider', faction: 'pirates', class: 'destroyer', cost: 12,
    ratings: { o: 3, d: 3, m: 3, u: 3 },
    desc: 'Tricky and well-rounded. Leaves mines behind for anyone chasing it.',
    hull: 8, shields: { front: 2, left: 1, right: 1, rear: 2 }, speed: [1, 4], clicks: 1, clicksAtSpeed: { 1: 2, 2: 2 }, power: 3,
    weapons: ['autocannon', 'breaching', 'disruptor'], pd: [pd('flechette', 1)], special: 'mineDrop',
  },
  freeTrader: {
    name: 'Free Trader', short: 'Free Trader', faction: 'pirates', class: 'destroyer', cost: 11,
    ratings: { o: 2, d: 3, m: 3, u: 3 },
    desc: 'Sturdy and slow but nimble, with the heaviest flak in the game and a hold full of spares.',
    hull: 9, shields: { front: 2, left: 1, right: 1, rear: 1 }, speed: [1, 3], clicks: 1, clicksAtSpeed: { 1: 3, 2: 3 }, power: 3,
    weapons: ['autocannon', 'autocannon', 'disruptor'], pd: [pd('flechette', 4)], special: 'smugglersHold',
  },
};

// Each ship's weapons grouped by arc: `arcs[arc]` = [{ weapon, shots }], in card order within the
// arc. A weapon is addressed as (arc, index in that arc); the fire plan uses the same grouping.
for (const def of Object.values(SHIPS)) {
  def.arcs = {};
  for (const id of def.weapons) (def.arcs[WEAPONS[id].arc] || (def.arcs[WEAPONS[id].arc] = [])).push({ weapon: id, shots: WEAPONS[id].shots });
  if (!def.pd) def.pd = [];
}

// Movement and collision numbers (rules §3, §6).
export const MOVE = {
  segmentLength: 2, // units per speed point
  clickDegrees: 15,
  enemyCollisionDamage: 1,
  asteroidDamage: 2,
  edgeDamage: 2,
  recoverClicks: 6, // emergency thrusters: extra clicks in the first segment after hitting the edge or an asteroid
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

// Battle sizes, picked on the TV during setup. Points and the ship cap per side are FLEET × `mult`;
// the map grows to fit (asteroids too). `players` = the player counts each size is meant for
// (the TV picks the matching size until someone chooses one).
export const BATTLE_SIZES = [
  { id: 'small', name: 'Small', players: [1, 2], label: '2 players', mult: 1, map: { w: 36, h: 20 } },
  { id: 'medium', name: 'Medium', players: [3, 6], label: '3–6 players', mult: 2, map: { w: 50, h: 28 } },
  { id: 'large', name: 'Large', players: [7, 8], label: '7–8 players', mult: 3, map: { w: 62, h: 34 } },
];

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

// Stances (rules §5, reworded for Power in weapons v2). Picked secretly in Plan Movement,
// revealed when the Move starts, and kept for the whole round. A ship can't pick the same stance
// two rounds in a row (Balanced is the exception). The numbers below are read by rules.js.
export const STANCES = {
  balanced: { name: 'Balanced', icon: '◆', desc: 'No bonus, no penalty.' },
  brace: { name: 'Brace', icon: '🛡', desc: 'All damage taken is halved (rounded up). −1 Power; max 1 turn click.',
    halveDamage: true, powerChange: -1, maxClicks: 1 },
  shieldCharge: { name: 'Shield Charge', icon: '⚡', desc: 'Pick a zone: +2 shields there this round. The opposite zone\'s shields count as 0.',
    chargeShields: 2, needsZone: true },
  evasive: { name: 'Evasive', icon: '💨', desc: '+1 turn click and +1 agility (harder to hit). −2 Power.',
    extraClicks: 1, agility: 1, powerChange: -2, helms: true },
  fullBurn: { name: 'Full Burn', icon: '🔥', desc: 'Change speed by up to 2, up to 1 over max. Can\'t fire; rear shields count as 0.',
    speedChange: 2, overMax: 1, noFire: true, rearShieldsOff: true, helms: true },
  overcharge: { name: 'Overcharge', icon: '💥', desc: '+2 Power. Attacks against you deal +1 damage. Can\'t change speed.',
    powerChange: 2, damageTakenBonus: 1, holdSpeed: true },
  hunter: { name: 'Hunter', icon: '🎯', desc: 'Mark an enemy ship: you hit it on one lower, and its Evasive doesn\'t help against you. You may only attack it.',
    needsTarget: true, huntHit: 1 },
  damageControl: { name: 'Damage Control', icon: '🔧', desc: 'End of round: restore 2 shields or 1 hull, or remove 1 critical. Must slow down by 1; −1 Power.',
    powerChange: -1, mustSlow: true, repair: { shields: 2, hull: 1, alsoRemoveCrit: false } },
};
export const STANCE_ORDER = ['balanced', 'brace', 'shieldCharge', 'evasive', 'fullBurn', 'overcharge', 'hunter', 'damageControl'];

// Stances each class may use (Balanced is always allowed).
export const CLASS_STANCES = {
  corvette: ['evasive', 'fullBurn', 'hunter', 'overcharge'],
  destroyer: ['evasive', 'fullBurn', 'hunter', 'shieldCharge'],
  cruiser: ['brace', 'shieldCharge', 'evasive', 'overcharge', 'damageControl'],
  battleship: ['brace', 'shieldCharge', 'overcharge', 'damageControl', 'hunter'],
};

// Criticals (rules §7, weapons v2). A critical roll (10) on a zone with no shields left gives the
// ship a random critical from CRIT_POOL. Criticals stack and stay until Damage Control removes
// them (none wear off on their own).
// `nextRound`: takes effect from the next round on (Weapons Offline, Bridge Fire, Comms Down).
export const CRITICALS = {
  engines: { name: 'Damaged Engines', icon: '⚙', desc: 'Max speed −1.' },
  thrusters: { name: 'Jammed Thrusters', icon: '↺', desc: '−1 turn click per segment.' },
  weaponsOffline: { name: 'Weapons Offline', icon: '⊘', desc: '−2 Power (from next round) until repaired.', nextRound: true, power: 2 },
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
//   boarding – never shoots and only goes after ships; `latch`: ending its move touching an enemy
//              ship gives that ship 1 critical at the end of the round, then it's removed
// `vsSquadron` / `vsShip` = { shots, damage } (d10 roll like ship weapons). `crit`: its 10s against
// ships are criticals (bombers only).
export const SQUADRONS = {
  hawk: { name: 'Hawk', short: 'Hawk', faction: 'protectorate', role: 'fighter', cost: 2, hull: 3, speed: 5,
    vsSquadron: { shots: 2, damage: 1 }, vsShip: { shots: 1, damage: 1 }, crit: false,
    desc: 'Fighter. Hunts enemy squadrons first.' },
  talon: { name: 'Talon', short: 'Talon', faction: 'protectorate', role: 'bomber', cost: 2, hull: 3, speed: 4,
    vsSquadron: { shots: 1, damage: 1 }, vsShip: { shots: 2, damage: 1 }, crit: true,
    desc: 'Bomber. Goes after ships first.' },
  swarmers: { name: 'Swarmers', short: 'Swarmers', faction: 'djnzuar', role: 'fighter', cost: 2, hull: 2, speed: 4,
    vsSquadron: { shots: 2, damage: 1 }, vsShip: { shots: 1, damage: 1 }, crit: false,
    desc: 'Fighter. Very cheap. Hunts enemy squadrons first.' },
  gorers: { name: 'Gorers', short: 'Gorers', faction: 'djnzuar', role: 'bomber', cost: 4, hull: 4, speed: 3,
    vsSquadron: { shots: 1, damage: 1 }, vsShip: { shots: 2, damage: 1 }, crit: true,
    desc: 'Bomber. Tough; goes after ships first.' },
  latchers: { name: 'Latchers', short: 'Latchers', faction: 'djnzuar', role: 'boarding', cost: 2, hull: 1, speed: 4,
    latch: true, crit: false,
    desc: 'Doesn\'t shoot and only attacks ships. If it ends its move touching an enemy ship, that ship gets 1 critical at the end of the round (then the Latchers are gone).' },
};
export const SQUADRON_ROLES = {
  fighter: { name: 'Fighter', letter: 'F' },
  bomber: { name: 'Bomber', letter: 'B' },
  boarding: { name: 'Boarding', letter: 'L' },
};

// Squadron numbers. `size` = circle diameter (u). `agility` = added to the number needed to hit
// a squadron (point-defense ignores it).
export const SQUADRON = {
  size: 0.4,
  value: 1, // kill points / fleet value
  agility: 2,
  escortGap: 0.6, // Escort: each squadron flies to its own spot this far from the carrier's hull
  latchDist: 0.25, // Latchers / Return docking: "touching" = within this distance of the outline
};

// Squadron orders (rules §8): each squadron gets its own, in Plan Movement. Squadrons start docked
// inside their carrier; giving a docked squadron a `launches` order launches it. Orders are kept
// when the player times out (or the carrier has Comms Down).
//   dockedOnly – only for docked squadrons; launchedOnly – only for launched ones.
export const SQUAD_ORDERS = {
  docked: { name: 'Stay docked', icon: '🏠', desc: 'Stays safe inside the carrier (can\'t shoot or be shot).', dockedOnly: true },
  escort: { name: 'Escort', icon: '🛡', desc: 'Stay next to the carrier.', launches: true },
  attack: { name: 'Attack', icon: '⚔', desc: 'Fly at an enemy ship and stop next to it. If it\'s destroyed, go for the nearest enemy ship.', needsTarget: true, launches: true },
  intercept: { name: 'Intercept', icon: '✈', desc: 'Fly at the nearest enemy squadron (Escort if there are none).', launches: true },
  return: { name: 'Return', icon: '↩', desc: 'Fly back to the carrier and dock again if it gets there.', launchedOnly: true },
};
export const SQUAD_ORDER_LIST = ['docked', 'escort', 'attack', 'intercept', 'return'];
