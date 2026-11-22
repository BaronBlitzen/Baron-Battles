// Space Battles – game data. Plain data only: factions, weapons, ship classes,
// ships and scenarios. To add a ship or a weapon, add an entry here; the logic
// in rules.js / host.js / controller.js reads everything from these tables.
// Protectorate and Djnzuar ships, weapons, squadrons, stances and criticals come from
// docs/space-battles-ships-v3.md; Pirates and everything else from
// docs/space-battles-weapons-v2.md and docs/space-battles-rules.md.

export const FACTIONS = {
  protectorate: {
    id: 'protectorate',
    name: 'Human Protectorate',
    short: 'Protectorate',
    color: '#4dabf7', // blue
    // Each player on the team gets the next shade, so teammates can be told apart.
    shades: ['#4dabf7', '#a5d8ff', '#1971c2', '#74c0fc', '#d0ebff', '#1864ab', '#339af0', '#e7f5ff'],
    available: true,
    blurb: 'Strike carriers, long-range lasers, torpedo boats',
    edge: 'west', // deployment edge (null = whichever edge is free)
    traits: { ram: null, home: null },
  },
  djnzuar: {
    id: 'djnzuar',
    name: 'Djnzuar',
    short: 'Djnzuar',
    color: '#ff922b', // orange
    shades: ['#ff922b', '#ffd8a8', '#d9480f', '#ffc078', '#fff4e6', '#e8590c', '#ffa94d', '#c2410c'],
    available: true,
    blurb: 'Fast, brutal up close, swarms of fighters. They ram.',
    edge: 'east',
    // Ramming: when this faction's ship collides with an enemy ship, the enemy takes
    // `enemyDamage` (or the ship's own `ramDamage`) and the rammer takes `selfDamage`.
    traits: { ram: { enemyDamage: 3, selfDamage: 1 }, home: null },
  },
  pirates: {
    id: 'pirates',
    name: 'Pirates',
    short: 'Pirates',
    color: '#51cf66', // green
    shades: ['#51cf66', '#b2f2bb', '#2b8a3e', '#8ce99a', '#ebfbee', '#2f9e44', '#69db7c', '#237032'],
    available: true,
    blurb: 'Tough little gunboats and customizable freighters. Turrets fire in any direction.',
    edge: null,
    // Every ship is home: the first time a ship drops to half hull or less, next round
    // it may change speed by up to 2 and go up to 1 over max.
    traits: { ram: null, home: null },
  },
};
export const FACTION_ORDER = ['protectorate', 'djnzuar', 'pirates'];

// To hit: every shot rolls a d10 and hits on `base`+, plus the target's agility, minus the
// shooter's accuracy bonuses. A roll of `critOn` (10) always hits and is a critical: double
// damage while the zone still has shields, otherwise a critical hit on one of the ship's systems.
// `targetedCritOn` = the crit roll with the Targeted Attack stance.
export const HIT = { die: 10, base: 4, critOn: 10, targetedCritOn: 9 };

// Firing arcs. The ship points up in the pictures; angles are from the nose.
//   spinal  – narrow, straight ahead (±15°)
//   forward – a little wider, straight ahead (±22.5°)
//   battery – everything except the rear 90° (±135°)
//   turret  – any direction
export const ARCS = ['spinal', 'forward', 'battery', 'turret'];
export const ARC_DEFS = {
  spinal: { name: 'Spinal', half: 15, desc: '30° straight ahead' },
  forward: { name: 'Forward', half: 22.5, desc: '45° straight ahead' },
  battery: { name: 'Battery', half: 135, desc: '270°, everything but the rear' },
  turret: { name: 'Turret', half: 180, desc: '360°, any direction' },
};

// Weapons. One entry = one line on the ship card.
//   arc     – 'spinal' | 'battery' | 'turret'
//   reach   – farthest range band it can hit ('close' | 'medium' | 'long' | 'veryLong')
//   power   – power it costs to fire (point-defense is free)
//   damage, shots – "damage × shots"
//   desc    – short description shown on phones
// Optional:
//   once: true       – once per game; the player chooses Hold / Fire, then it's used up
//   critOn           – crits on this roll or higher (Torpedo, Breaching: 9)
//   ignoreShields    – damage goes straight to hull (Torpedo)
//   effect           – what a hit does besides damage:
//     'ion'      each hit only removes shields (2, or 4 on a critical), never hull
//     'acid'     each hit: 1 extra hull damage at the end of the NEXT round (ignores shields, stacks)
//     'grapple'  pulls the target up to `pull` u toward the attacker; it can't speed up next round
//     'disrupt'  target gets −1 turn click per segment next round (doesn't stack)
//     'board'    target automatically takes 1 critical
//     'crit'     no damage; each hit causes 1 critical hit (Djnzuar Disruptor)
//   noSquadrons      – can't target squadrons
//   autoHit          – always hits, no to-hit roll (Djnzuar Disruptor)
//   missile          – launches `shots` missiles (MISSILE) of `damage` each: any range
//   ammo             – limited uses: the ship's count with this key (missiles, mineAmmo, cyclones);
//                      1 is used per firing. Never fired by the default plan.
//   layMine          – drops a mine behind the ship instead of attacking (no target)
//   pull / pullAlways – pulls the target this many u toward the shooter (pullAlways: even on a miss)
//   pd             – point-defense: free, fires on its own at the nearest enemy squadron in close
//                      range and ignores squadron agility; never aimed by the player. Its number
//                      of shots is set per ship.
export const WEAPONS = {
  // ----- Protectorate -----
  torpedo: { name: 'Torpedo', arc: 'spinal', reach: 'long', power: 2, damage: 6, shots: 1, once: true, ignoreShields: true, critOn: 9, noSquadrons: true,
    desc: 'Once per battle. Ignores shields and crits on a 9 or 10.' },
  smallLaser: { name: 'Small Laser Battery', arc: 'battery', reach: 'medium', power: 1, damage: 1, shots: 1,
    desc: 'Light, cheap and reliable.' },
  largeLaser: { name: 'Large Laser Battery', arc: 'battery', reach: 'long', power: 2, damage: 3, shots: 1,
    desc: 'Heavy long-range laser.' },
  ion: { name: 'Ion Cannon', arc: 'battery', reach: 'medium', power: 1, damage: 2, shots: 1, effect: 'ion', noSquadrons: true,
    desc: 'Strips 2 shields but can\'t hurt hull. Opens a zone for the guns behind it.' },
  lance: { name: 'Particle Lance', arc: 'spinal', reach: 'veryLong', power: 4, damage: 6, shots: 1,
    desc: 'A huge beam with the longest reach in the game. Point the whole ship at the target.' },
  flak: { name: 'Flak', arc: 'turret', reach: 'close', power: 0, damage: 1, shots: 1, pd: true,
    desc: 'Point-defense against squadrons.' },
  // ----- Djnzuar -----
  maw: { name: 'Plasma Maw', arc: 'battery', reach: 'close', power: 2, damage: 3, shots: 1,
    desc: 'Huge plasma jaws. Deadly up close.' },
  smallRail: { name: 'Small Railgun Battery', arc: 'battery', reach: 'medium', power: 1, damage: 1, shots: 1,
    desc: 'Light railguns.' },
  largeRail: { name: 'Large Railgun Battery', arc: 'battery', reach: 'medium', power: 2, damage: 3, shots: 1,
    desc: 'Heavy railguns.' },
  darkLance: { name: 'Dark Lance', arc: 'spinal', reach: 'long', power: 3, damage: 5, shots: 1,
    desc: 'A heavy spinal beam. Point the ship at the target. Uses all of a Samurai\'s Power.' },
  critDisruptor: { name: 'Disruptor', arc: 'turret', reach: 'close', power: 2, damage: 0, shots: 1, effect: 'crit', noSquadrons: true, autoHit: true,
    desc: 'Fires in any direction. Always hits (no roll). Does no damage but causes a critical hit.' },
  acid: { name: 'Acid Spitter', arc: 'battery', reach: 'close', power: 1, damage: 1, shots: 1, effect: 'acid',
    desc: 'A hit burns 1 more hull at the end of the next round, ignoring shields.' },
  thorn: { name: 'Thorn Burst', arc: 'turret', reach: 'close', power: 0, damage: 1, shots: 1, pd: true,
    desc: 'Point-defense against squadrons.' },
  // ----- Pirates -----
  autoTurret: { name: 'Auto Turret', arc: 'turret', reach: 'medium', power: 2, damage: 1, shots: 2,
    desc: 'Two quick shots in any direction.' },
  autoCannon: { name: 'Auto Cannon', arc: 'forward', reach: 'medium', power: 3, damage: 1, shots: 5,
    desc: 'A hail of five shots straight ahead (45°).' },
  mineLayer: { name: 'Mine-Layer', arc: 'turret', reach: 'close', power: 1, damage: 0, shots: 1, layMine: true, ammo: 'mineAmmo',
    desc: 'Drops a mine just behind the ship (3 per battle). Any ship that runs into a mine takes 3 damage, and a Maneuvering Thrusters critical if hull is hit.' },
  grapplingHook: { name: 'Grappling Hook', arc: 'turret', reach: 'medium', power: 1, damage: 1, shots: 1, noSquadrons: true, pull: 2, pullAlways: true,
    desc: 'Pulls the target 2 u toward this ship whether or not the shot hits. A hit also does 1 damage.' },
  cycloneLauncher: { name: 'Cyclone Launcher', arc: 'turret', reach: 'veryLong', power: 2, damage: 1, shots: 5, ignoreShields: true, noSquadrons: true,
    autoHit: true, missile: true, ammo: 'cyclones',
    desc: 'Once per battle: fires 5 missiles at one enemy ship. Each always hits for 1 damage (ignores shields) unless point-defense shoots it down. Within 16 u they hit this round; farther away they fly 16 u a round.' },
  missileLauncher: { name: 'Missile Launcher', arc: 'turret', reach: 'veryLong', power: 1, damage: 2, shots: 1, ignoreShields: true, noSquadrons: true,
    autoHit: true, missile: true, ammo: 'missiles',
    desc: 'Fires a missile at any enemy ship. It always hits (2 damage, ignores shields) unless point-defense shoots it down. Within 16 u it hits this round; farther away it flies 16 u a round until it gets there. Uses 1 missile.' },
  flechette: { name: 'Flechette Gun', arc: 'turret', reach: 'close', power: 0, damage: 1, shots: 1, pd: true,
    desc: 'Point-defense: a storm of small shots against squadrons.' },
};
for (const [id, w] of Object.entries(WEAPONS)) w.id = id;

// Range bands, measured between the closest edges of two ships (in units).
export const RANGE_BANDS = [
  { id: 'close', name: 'Close', max: 4 },
  { id: 'medium', name: 'Medium', max: 8 },
  { id: 'long', name: 'Long', max: 12 },
  { id: 'veryLong', name: 'Very Long', max: 16 },
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

// Missiles (Pirate Missile Launcher): a missile strikes in the Fire phase if its target ship is
// within `strike` u; otherwise it flies `speed` u toward the target at the end of the round and
// tries again next round. Only point-defense can shoot at it (any hit destroys it).
export const MISSILE = { strike: 16, speed: 16 };

// Mines (rules §2): a ship that moves within `triggerDist` u takes `damage` to the hull zone facing
// the mine, then the mine is gone. Mines are neutral. Dropped `dropBehind` u behind the ship's stern.
// A mine that does hull damage also gives a Maneuvering Thrusters critical. The trigger distance is
// about a small asteroid's radius.
export const MINES = { triggerDist: 0.7, damage: 3, dropBehind: 1.3, thrusterCrit: true };

const pd = (weapon, shots) => ({ weapon, shots });

// Ship types. `weapons` lists the ship's weapons in card order; `power` is how much power it has
// to fire them each round. `speed` is [min, max]; `clicks` is the max turn clicks per segment
// (1 click = 15°): `clicksAtSpeed` gives the clicks at each speed (slower = tighter turns) and
// `clicks` is used at any other speed. Shields are front / left / right / rear (rear 1 lower).
// Optional: `pd` (point-defense), `squadrons` (carrier slots) and `carries` (squadron types it may
// hold), `special` (SPECIALS), `ramDamage`. `ratings` = the designer's 1–5 Offense / Defense /
// Mobility / Utility.
export const SHIPS = {
  // ----- Human Protectorate -----
  strikeCarrier: {
    name: 'Fleet Carrier', short: 'Carrier', faction: 'protectorate', class: 'cruiser', cost: 18,
    ratings: { o: 4, d: 3, m: 3, u: 5 },
    desc: 'The fleet\'s centerpiece. Launches 3 squadrons and backs them up with long-range lasers.',
    hull: 11, shields: { front: 2, left: 2, right: 2, rear: 1 }, speed: [1, 4], clicks: 1, clicksAtSpeed: { 1: 2, 2: 2 }, power: 6,
    weapons: ['largeLaser', 'largeLaser', 'smallLaser', 'smallLaser', 'ion'], pd: [pd('flak', 2)], squadrons: 3,
  },
  assaultCarrier: {
    name: 'Assault Carrier', short: 'Assault Carrier', faction: 'protectorate', class: 'destroyer', cost: 13,
    ratings: { o: 3, d: 2, m: 3, u: 4 },
    desc: 'A small carrier on an escort hull. Brings one squadron to the fight and backs it up with a long-range laser.',
    hull: 7, shields: { front: 2, left: 2, right: 2, rear: 1 }, speed: [1, 4], clicks: 1, clicksAtSpeed: { 1: 3, 2: 2 }, power: 4,
    weapons: ['largeLaser', 'smallLaser', 'smallLaser'], pd: [pd('flak', 2)], squadrons: 1,
  },
  lancer: {
    name: 'Lancer', short: 'Lancer', faction: 'protectorate', class: 'cruiser', cost: 18,
    ratings: { o: 5, d: 3, m: 3 },
    desc: 'The hardest hitter in the fleet. Its spinal Particle Lance outranges everything.',
    hull: 10, shields: { front: 2, left: 2, right: 2, rear: 1 }, speed: [1, 4], clicks: 1, clicksAtSpeed: { 1: 2, 2: 2 }, power: 6,
    weapons: ['lance', 'largeLaser', 'largeLaser', 'smallLaser', 'smallLaser'], pd: [pd('flak', 1)],
  },
  escort: {
    name: 'Escort', short: 'Escort', faction: 'protectorate', class: 'destroyer', cost: 11,
    ratings: { o: 2, d: 3, m: 3 },
    desc: 'A sturdy all-rounder with the heaviest flak in the fleet.',
    hull: 8, shields: { front: 2, left: 2, right: 2, rear: 1 }, speed: [1, 4], clicks: 1, clicksAtSpeed: { 1: 3, 2: 2 }, power: 3,
    weapons: ['ion', 'smallLaser', 'smallLaser', 'smallLaser'], pd: [pd('flak', 3)],
  },
  torpedoBoat: {
    name: 'Torpedo Boat', short: 'Torpedo Boat', faction: 'protectorate', class: 'corvette', cost: 8,
    ratings: { o: 3, d: 1, m: 5 },
    desc: 'Nimble and fragile. Lines up its one torpedo for a devastating strike.',
    hull: 5, shields: { front: 2, left: 1, right: 1, rear: 0 }, speed: [2, 5], clicks: 2, clicksAtSpeed: { 2: 3, 3: 3, 4: 3 }, power: 2,
    weapons: ['torpedo', 'smallLaser', 'smallLaser'],
  },

  // ----- Djnzuar -----
  queen: {
    name: 'Queen', short: 'Queen', faction: 'djnzuar', class: 'battleship', cost: 16,
    ratings: { o: 2, d: 5, m: 2, u: 5 },
    desc: 'A huge mother ship that turns surprisingly well. Its brood of 4 Swarmer squadrons does the fighting.',
    hull: 14, shields: { front: 3, left: 3, right: 3, rear: 2 }, speed: [1, 3], clicks: 1, clicksAtSpeed: { 1: 3, 2: 2 }, power: 4,
    weapons: ['largeRail', 'smallRail', 'smallRail', 'smallRail', 'smallRail'], pd: [pd('thorn', 3)], squadrons: 4, carries: ['swarmers'],
  },
  brute: {
    name: 'Brute', short: 'Brute', faction: 'djnzuar', class: 'cruiser', cost: 18,
    ratings: { o: 5, d: 4, m: 3 },
    desc: 'An armored bruiser. Gets close and unloads three heavy railguns and acid.',
    hull: 11, shields: { front: 2, left: 2, right: 2, rear: 1 }, speed: [1, 4], clicks: 1, clicksAtSpeed: { 1: 2, 2: 2 }, power: 6,
    weapons: ['largeRail', 'largeRail', 'largeRail', 'acid', 'acid', 'smallRail', 'smallRail'], pd: [pd('thorn', 2)],
  },
  samurai: {
    name: 'Samurai', short: 'Samurai', faction: 'djnzuar', class: 'destroyer', cost: 12,
    ratings: { o: 4, d: 2, m: 5 },
    desc: 'A fast, agile raider. Snipes with its Dark Lance, or dives in and cripples ships with its Disruptor.',
    hull: 7, shields: { front: 1, left: 1, right: 1, rear: 0 }, speed: [2, 5], clicks: 2, clicksAtSpeed: { 2: 3, 3: 3 }, power: 3,
    weapons: ['critDisruptor', 'darkLance', 'smallRail', 'smallRail'], pd: [pd('thorn', 1)],
  },
  grunt: {
    name: 'Grunt', short: 'Grunt', faction: 'djnzuar', class: 'corvette', cost: 7,
    ratings: { o: 3, d: 2, m: 3 },
    desc: 'Fast and cheap. Can wrench itself around with a Violent Turn.',
    hull: 5, shields: { front: 1, left: 1, right: 1, rear: 0 }, speed: [2, 5], clicks: 1, clicksAtSpeed: { 2: 2 }, power: 2,
    weapons: ['maw', 'smallRail', 'smallRail'],
  },

  // ----- Pirates -----
  firefly: {
    name: 'Firefly', short: 'Firefly', faction: 'pirates', class: 'corvette', cost: 9,
    ratings: { o: 2, d: 4, m: 5 },
    desc: 'Long, thin and very nimble, and tough for a corvette. Circles its prey with a turret.',
    hull: 8, shields: { front: 1, left: 1, right: 1, rear: 0 }, speed: [1, 4], clicks: 2, clicksAtSpeed: { 1: 3, 2: 3, 3: 3 }, power: 2,
    weapons: ['autoTurret'], pd: [pd('flechette', 1)],
  },
  rouge: {
    name: 'Rouge', short: 'Rouge', faction: 'pirates', class: 'corvette', cost: 12,
    ratings: { o: 4, d: 3, m: 5 },
    desc: 'A fast gunboat. Points its nose at a ship and shreds it with the Auto Cannon.',
    hull: 6, shields: { front: 2, left: 2, right: 2, rear: 1 }, speed: [2, 5], clicks: 2, clicksAtSpeed: { 2: 3, 3: 3 }, power: 4,
    weapons: ['autoCannon', 'autoTurret'], pd: [pd('flechette', 1)],
  },
  freeTrader: {
    name: 'Free Trader', short: 'Free Trader', faction: 'pirates', class: 'cruiser', cost: 14,
    ratings: { o: 3, d: 3, m: 3, u: 4 },
    desc: 'A patched-up freighter full of guns. Customize it in the shipyard.',
    hull: 9, shields: { front: 2, left: 2, right: 2, rear: 1 }, speed: [1, 4], clicks: 1, clicksAtSpeed: { 1: 3, 2: 2 }, power: 5,
    weapons: ['autoTurret', 'autoTurret', 'missileLauncher', 'missileLauncher'], pd: [pd('flechette', 2)], missiles: 5,
  },
};

// A weapon list grouped by arc: `arcs[arc]` = [{ weapon, shots }], in card order within the arc.
// A weapon is addressed as (arc, index in that arc); the fire plan uses the same grouping.
const groupArcs = (weapons) => {
  const arcs = {};
  for (const id of weapons) (arcs[WEAPONS[id].arc] || (arcs[WEAPONS[id].arc] = [])).push({ weapon: id, shots: WEAPONS[id].shots });
  return arcs;
};
for (const def of Object.values(SHIPS)) {
  def.arcs = groupArcs(def.weapons);
  if (!def.pd) def.pd = [];
}

// Customizations: upgrades bought for one ship in fleet building (any number of different ones,
// on top of a captain). Read through shipDef() in rules.js, which applies them to the ship.
//   ships    – ship types that may take it
//   weapons  – extra weapons; power – extra Power; squadrons / carries – a hangar
export const UPGRADES = {
  illegalDarkLance: { name: 'Illegal Dark Lance', short: 'Dark Lance', icon: '🔱', cost: 5, ships: ['freeTrader'], weapons: ['darkLance'], power: 3,
    desc: 'A stolen Dark Lance (spinal, long range, 5 damage) and +3 Power to fire it.' },
  scavengerHold: { name: 'Scavenger Hold', short: 'Hold', icon: '✈', cost: 1, ships: ['freeTrader'], squadrons: 1, carries: ['scavengers'],
    desc: 'Carries 1 squadron of Scavengers.' },
  mineLayer: { name: 'Mine-Layer', short: 'Mines', icon: '💣', cost: 2, ships: ['rouge'], weapons: ['mineLayer'], power: 1, ammo: { mineAmmo: 3 },
    desc: '+1 Power and a Mine-Layer (1 Power): drop a mine behind the ship, 3 per battle. A mine hits any ship for 3 damage, plus a Maneuvering Thrusters critical if hull is hit.' },
  grapplingHook: { name: 'Grappling Hook', short: 'Hook', icon: '🪝', cost: 2, ships: ['rouge'], weapons: ['grapplingHook'], power: 1,
    desc: '+1 Power and a Grappling Hook (1 Power, medium range, 1 damage): pulls the target 2 u closer, hit or miss.' },
  cycloneLauncher: { name: 'Cyclone Launcher', short: 'Cyclone', icon: '🌪', cost: 3, ships: ['rouge'], weapons: ['cycloneLauncher'], power: 2, ammo: { cyclones: 1 },
    desc: '+2 Power and a Cyclone Launcher (2 Power, once per battle): 5 missiles of 1 damage each at one enemy ship.' },
  xarTeleporter: { name: 'Xar Teleporter', short: 'Teleporter', icon: '✨', cost: 2, ships: ['freeTrader'],
    desc: 'Once per game, the Teleport stance: after everyone moves, pick any free spot on the map and a facing, and the ship jumps there (keeping its speed).' },
};
export const UPGRADE_ORDER = Object.keys(UPGRADES);

// The ship type's numbers with its customizations applied (cached; no customizations = SHIPS[type]).
const modCache = {};
export function defWithMods(type, mods) {
  const base = SHIPS[type];
  const list = (mods || []).filter((m) => UPGRADES[m]?.ships.includes(type)).sort();
  if (!base || !list.length) return base;
  const key = `${type}|${list.join(',')}`;
  if (modCache[key]) return modCache[key];
  const def = { ...base, weapons: [...base.weapons], mods: list };
  for (const m of list) {
    const u = UPGRADES[m];
    def.weapons.push(...(u.weapons || []));
    def.power += u.power || 0;
    if (u.squadrons) { def.squadrons = (def.squadrons || 0) + u.squadrons; def.carries = [...(def.carries || []), ...(u.carries || [])]; }
    for (const [k, n] of Object.entries(u.ammo || {})) def[k] = (def[k] || 0) + n;
  }
  def.arcs = groupArcs(def.weapons);
  return (modCache[key] = def);
}

// Movement and collision numbers (rules §3, §6).
export const MOVE = {
  segmentLength: 2, // units per speed point
  clickDegrees: 15,
  enemyCollisionDamage: 1,
  asteroidDamage: 2,
  edgeDamage: 2,
  recoverClicks: 6, // emergency thrusters: extra clicks in the first segment after hitting the edge or an asteroid
  endTurnShare: 0.15, // Violent Turn: share of the Move's time spent on the turn at the end
};

export const TIMING = {
  planSeconds: 120,
  introMs: 4000,
  moveMs: 3600,
  squadMoveMs: 1400, // squadrons move after ships (only when there are squadrons)
  fireMs: 4200,
  rollSeconds: 30, // Roll Dice: the TV waits this long at most for everyone to tap Fire!
  teleportSeconds: 45, // Teleport: time to pick a spot (the last spot tapped is used when it runs out)
  teleportMs: 1400, // the jump on the TV
};

// Dice (phone Roll screen) and laser bolt (TV) color for each weapon, so a die and its shot on the
// TV match. Point-defense is always yellow; squadrons use `squad`.
export const DICE_COLORS = {
  torpedo: '#ffa94d', smallLaser: '#ff8787', largeLaser: '#fa5252', ion: '#8ce1ff', lance: '#da77f2',
  maw: '#ff922b', smallRail: '#74c0fc', largeRail: '#4dabf7', darkLance: '#9775fa', critDisruptor: '#e599f7', acid: '#a9e34b',
  autoTurret: '#dee2e6', autoCannon: '#8ce99a', missileLauncher: '#ff6b6b', cycloneLauncher: '#ff8787', grapplingHook: '#ffa94d', mineLayer: '#868e96',
  pd: '#ffd43b', squad: '#b197fc',
};
export const diceColor = (weapon, pd = false) => (pd ? DICE_COLORS.pd : DICE_COLORS[weapon] || DICE_COLORS.squad);


// Fleet building (rules §1): each side gets `sidePoints`, split evenly (rounded down)
// between that side's players. A side can't have more than `maxShipsPerSide` ships.
export const FLEET = {
  sidePoints: 60,
  maxShipsPerSide: 10,
  // The battle ends after this many rounds; then the side with the most hull left on its living
  // ships wins (equal hull = draw).
  maxRounds: 9,
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

// Stances (ships v3). Picked secretly in Plan Movement, revealed when the Move starts, and kept
// for the whole round. Any stance may be picked again every round. The numbers below are read by rules.js.
//   carrierOnly – only carriers; ships – only these ship types; captain – only ships with this captain
//   accuracy    – + = this ship's weapons need that much lower to hit
//   squadAccuracy – this carrier's squadrons get + accuracy this round
//   critOn      – this ship's weapons crit on this roll or higher
//   doubleWeapons – these weapon ids ('all' = every weapon) fire twice this round, no extra Power
//                   (once-per-game weapons never fire twice)
export const STANCES = {
  balanced: { name: 'No stance', icon: '◆', desc: 'No bonus, no penalty.' },
  wild: { name: 'Wild Maneuvers', icon: '💨', desc: '+1 turn click per segment and +1 agility (harder to hit). Change speed by up to 2. All your weapons −1 accuracy.',
    extraClicks: 1, agility: 1, speedChange: 2, accuracy: -1 },
  repairs: { name: 'Critical Repairs', icon: '🔧', desc: 'End of round: repair 1 critical hit (you pick which in Plan Fire).',
    repairCrit: true },
  shieldBoost: { name: 'Shield Boost', icon: '⚡', desc: 'Pick a side: +2 shields there. It can go up to 2 over max; anything over max is lost at the end of next round.',
    boostShields: 2, needsZone: true },
  targeted: { name: 'Targeted Attack', icon: '🎯', desc: 'All your weapons +1 accuracy, and they crit on a 9 or 10.',
    accuracy: 1, critOn: 9 },
  command: { name: 'Command', icon: '📡', desc: 'Carriers only. Your squadrons get +1 accuracy this round.',
    carrierOnly: true, squadAccuracy: 1 },
  violentTurn: { name: 'Violent Turn', icon: '🌀', desc: 'Grunts only. Take 1 hull damage. At the end of your move, turn up to 90° more.',
    ships: ['grunt'], selfDamage: 1, endTurnClicks: 6 },
  exterminate: { name: 'Exterminate', icon: '☠', desc: 'Shrike Leonitas only. Your Particle Lance fires twice this round (no extra Power).',
    captain: 'shrike', doubleWeapons: ['lance'] },
  reckless: { name: 'Reckless Attack', icon: '💥', desc: 'Golbrik only. Take 1 hull damage. All your weapons fire twice this round (no extra Power).',
    captain: 'golbrik', selfDamage: 1, doubleWeapons: 'all' },
  teleport: { name: 'Teleport', icon: '✨', desc: 'Xar Teleporter, once per game. After everyone moves, pick any free spot on the map and a facing on your phone: the ship jumps there and keeps its speed.',
    upgrade: 'xarTeleporter', oncePerGame: true },
};
export const STANCE_ORDER = ['balanced', 'wild', 'repairs', 'shieldBoost', 'targeted', 'command', 'violentTurn', 'exterminate', 'reckless', 'teleport'];

// Captains: an upgrade bought for one ship (or one squadron) in fleet building, at most one each.
// The same captain may be on several ships. A captain is lost with its ship.
//   ships     – ship types that may take this captain (null = any ship of `factions`)
//   squadrons – squadron types that may take this captain (instead of ships)
// Effects (read by rules.js / host.js):
//   freeWild      – may add Wild Maneuvers on top of another stance every round
//   shieldRegen   – shields regained at the end of every round (front first, then the emptier side, then rear)
//   stance        – unlocks this stance (STANCES[..].captain)
//   alwaysCommand – this carrier's squadrons always get Command's +1 accuracy (Command isn't offered)
//   accuracy      – squadron: + accuracy; ignoreFirstHit – squadron ignores the first hit each round
//   pickCrit      – the player picks which system this ship's criticals damage (in Plan Fire)
//   fireRotate    – may rotate this many clicks in place during Plan Fire (before shooting)
//   hull / speed / clicks – + max hull, + max speed, + turn clicks per segment
//   fireproof     – Hull Fire never damages this ship (it can still catch the critical)
//   stubborn      – once per game: survives being destroyed with 1 hull; no more damage that round
//   weaponBoost   – { weaponId: { shots, accuracy } }: extra shots / accuracy for that weapon
//   fiveArms      – each round one aimed weapon (picked in Plan Fire) fires twice, no extra Power
//   packLeader    – { types, accuracy, range }: the side's OTHER ships of `types` within `range`
//                   (a RANGE_BANDS id) of this ship get + accuracy (several leaders don't stack)
export const CAPTAINS = {
  shuna: { name: 'Shuna, Dolphin Warrior', short: 'Shuna', icon: '🐬', cost: 2, ships: ['torpedoBoat'], freeWild: true,
    desc: 'Every round you may use Wild Maneuvers AND another stance.' },
  verity: { name: 'Samuel Verity', short: 'Verity', icon: '🛡', cost: 2, ships: ['escort'], shieldRegen: 1,
    desc: 'End of every round: regain 1 shield (front first; if it\'s full, the emptier side; if both sides are full, the rear). Not while the Shield Generator is damaged.' },
  shrike: { name: 'Shrike Leonitas', short: 'Shrike', icon: '☠', cost: 3, ships: ['lancer'], stance: 'exterminate',
    desc: 'Unlocks the Exterminate stance: your Particle Lance fires twice that round (no extra Power).' },
  amelia: { name: 'Amelia Dangerfield', short: 'Amelia', icon: '📡', cost: 2, ships: ['strikeCarrier'], alwaysCommand: true,
    desc: 'Born Commander: your squadrons always get +1 accuracy (as if you used Command), so you\'re free to pick another stance.' },
  flaggs: { name: 'Iceman Flaggs', short: 'Iceman', icon: '🧊', cost: 1, squadrons: ['fighters'], accuracy: 1, ignoreFirstHit: true,
    desc: 'This Fighter squadron gets +1 accuracy, and the first hit on it each round is ignored.' },
  golbrik: { name: 'Golbrik', short: 'Golbrik', icon: '💥', cost: 2, ships: ['grunt'], stance: 'reckless',
    desc: 'Unlocks the Reckless Attack stance: take 1 hull damage, and all your weapons fire twice that round (no extra Power).' },
  jurddap: { name: 'Jurddap', short: 'Jurddap', icon: '🐸', cost: 1, ships: ['grunt'], hull: 1, fireproof: true,
    desc: 'Shrug It Off: +1 hull, and Hull Fire never hurts this ship.' },
  bossim: { name: 'Bossim', short: 'Bossim', icon: '🪖', cost: 2, ships: ['grunt'], packLeader: { types: ['grunt'], accuracy: 1, range: 'medium' },
    desc: 'Pack Leader: your side\'s other Grunts within medium range of this ship get +1 accuracy.' },
  seirSeir: { name: 'Seir-Seir', short: 'Seir-Seir', icon: '🗡', cost: 1, ships: ['samurai'], pickCrit: true,
    desc: 'When this ship causes a critical hit, you choose which system it damages (pick it in Plan Fire).' },
  tulbrik: { name: 'King Tulbrik', short: 'Tulbrik', icon: '👑', cost: 1, ships: ['brute'], hull: 2,
    desc: '+2 hull.' },
  uen: { name: 'Queen Uen', short: 'Uen', icon: '👸', cost: 2, ships: ['queen'], speed: 1, clicks: 1,
    desc: '+1 max speed and +1 turn click per segment.' },
  kairos: { name: 'Kairos', short: 'Kairos', icon: '⏳', cost: 1, ships: ['torpedoBoat'], fireRotate: 1,
    desc: 'In Plan Fire you may rotate your ship 1 click (15°) left or right before shooting, to line up the torpedo or turn a stronger shield toward the enemy. Not while the Maneuvering Thrusters are damaged.' },
  // ----- Pirates -----
  mal: { name: 'Mal Reynolds', short: 'Mal', icon: '🔨', cost: 2, ships: ['firefly'], stubborn: true,
    desc: 'Too Stubborn to Die: once per game, the first time this ship would be destroyed it survives with 1 hull, and all other damage to it that round is cancelled.' },
  liuBei: { name: 'Sergeant Liu Bei', short: 'Liu Bei', icon: '🎖', cost: 2, ships: ['rouge'], weaponBoost: { autoCannon: { shots: 1, accuracy: 1 } },
    desc: 'The Auto Cannon gets +1 shot and +1 accuracy.' },
  flerf: { name: 'Flerf', short: 'Flerf', icon: '⭐', cost: 3, ships: ['freeTrader'], fiveArms: true,
    desc: 'Five Arms: every round, one weapon you aim fires twice (no extra Power). You pick which in Plan Fire.' },
  rzen: { name: 'Rzen', short: 'Rzen', icon: '🐆', cost: 2, ships: ['rouge'], killHeal: 1,
    desc: 'Every enemy this ship attacked that is destroyed this round gives it +1 hull (not above max).' },
  kajik: { name: 'Kaj\'ik', short: 'Kaj\'ik', icon: '🐸', cost: 2, ships: ['firefly'], decoy: true,
    desc: 'Decoy Beacon: once per game, in Plan Fire, drop a decoy where the Firefly is. Enemy missiles and squadrons attacking a friendly ship within close range of it hit the decoy instead. One hit destroys it.' },
};
export const CAPTAIN_ORDER = Object.keys(CAPTAINS);

// Criticals (ships v3). A critical roll on a zone with no shields left damages one of the ship's
// 6 systems, picked at random (a system that's already damaged is rerolled). It stays damaged
// until Critical Repairs fixes it. `nextRound`: starts acting from the next round (Hull fire).
export const CRITICALS = {
  hull: { name: 'Hull Fire', icon: '🔥', desc: '1 damage at the end of every round, ignoring shields.', nextRound: true, burn: 1 },
  weapons: { name: 'Weapons Systems', icon: '⊘', desc: 'One weapon can\'t fire.' },
  thrusters: { name: 'Maneuvering Thrusters', icon: '↺', desc: 'Can\'t turn: the ship must fly straight.' },
  shieldGen: { name: 'Shield Generator', icon: '✖', desc: 'No shields (they come back when repaired).' },
  engines: { name: 'Main Engines', icon: '⚙', desc: 'Can\'t change speed.' },
  bridge: { name: 'Bridge', icon: '🧭', desc: 'The only stance you can pick is Critical Repairs.' },
};
export const CRIT_POOL = ['hull', 'weapons', 'thrusters', 'shieldGen', 'engines', 'bridge'];

// Squadrons (ships v3). A squadron is a group of `craft`, drawn as one small circle each. Each
// craft has `craftHull` hull (default 1) and `shield` (0 or 1) shield: hits take the shield first,
// then hull; a single hit of shield + craftHull damage or more destroys a craft outright. Every
// living craft fires one shot per round (close range) for `damage`.
// Bought in fleet building to fill a carrier (`SHIPS[type].squadrons` slots). `role` decides
// what it shoots when it has no order to follow:
//   fighter  – the nearest enemy squadron in close range, else the nearest enemy ship
//   bomber   – the nearest enemy ship in close range (never squadrons)
// Optional: `accuracy` (−1 = needs 1 higher), `ignoreShields`, `crit` (its 10s against ships crit),
// `shipsOnly` (can't attack squadrons: no Intercept order, no squadron targets), `oneRun` (after it
// attacks a ship it is "spent": it must Return, can't shoot, and re-arms when it docks; it may launch
// again the round after docking).
export const SQUADRONS = {
  fighters: { name: 'Fighters', short: 'Fighters', faction: 'protectorate', role: 'fighter', cost: 3, craft: 4, shield: 1, speed: 16,
    weapon: 'Laser Cannon', damage: 1, crit: false,
    desc: 'Fast fighters. Hunt enemy squadrons first.' },
  bombers: { name: 'Bombers', short: 'Bombers', faction: 'protectorate', role: 'bomber', cost: 4, craft: 3, shield: 1, speed: 12,
    weapon: 'Nuclear Bomb', damage: 2, ignoreShields: true, crit: true, shipsOnly: true, oneRun: true,
    desc: 'Nuclear bombs ignore shields. Only attack ships. One bombing run, then they must fly back and dock to re-arm.' },
  swarmers: { name: 'Swarmers', short: 'Swarmers', faction: 'djnzuar', role: 'fighter', cost: 3, craft: 6, shield: 0, speed: 16,
    weapon: 'Bite Cannon', damage: 1, accuracy: -1, crit: false,
    desc: 'A big, fast swarm with no shields. Hunts enemy squadrons first.' },
  scavengers: { name: 'Scavengers', short: 'Scavengers', faction: 'pirates', role: 'fighter', cost: 3, craft: 3, shield: 1, craftHull: 2, speed: 12,
    weapon: 'Scrap Cannon', damage: 1, crit: false,
    desc: 'Three armored scrap-fighters: each takes 3 hits to bring down. Hunt enemy squadrons first.' },
};
export const SQUADRON_ROLES = {
  fighter: { name: 'Fighter', letter: 'F' },
  bomber: { name: 'Bomber', letter: 'B' },
};

// Squadron numbers. `size` = diameter of the squadron's group (u). `agility` = added to the number
// needed to hit a squadron (point-defense ignores it).
export const SQUADRON = {
  size: 0.7,
  value: 1, // kill points / fleet value
  agility: 2,
  escortGap: 0.7, // with nothing to attack, a squadron waits this far from its carrier's hull
  latchDist: 0.25, // Return docking: "touching" = within this distance of the outline
};

// Squadron orders: each squadron gets its own, in Plan Movement. Squadrons start docked inside
// their carrier; giving a docked squadron a `launches` order launches it. Orders are kept when the
// player times out. With nothing to go after, a launched squadron waits next to its carrier.
//   dockedOnly – only for docked squadrons; launchedOnly – only for launched ones.
export const SQUAD_ORDERS = {
  docked: { name: 'Stay docked', icon: '🏠', desc: 'Stays safe inside the carrier (can\'t shoot or be shot).', dockedOnly: true },
  attack: { name: 'Attack', icon: '⚔', desc: 'Fly at an enemy ship or squadron and attack it. If it\'s destroyed, go for the nearest enemy.', needsTarget: true, launches: true },
  intercept: { name: 'Intercept', icon: '✈', desc: 'Fly at the nearest enemy squadron and attack it.', launches: true },
  return: { name: 'Return', icon: '↩', desc: 'Fly back to the carrier and dock again if it gets there.', launchedOnly: true },
};
export const SQUAD_ORDER_LIST = ['docked', 'attack', 'intercept', 'return'];
