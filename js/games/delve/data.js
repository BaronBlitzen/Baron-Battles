// Delve the Black Labyrinth – all the numbers and words: backgrounds, items, skills,
// monsters, traps, encounters. Rules: docs/delve-rules.md
// Nothing in here touches the screen; host.js (the TV) is the referee that uses it.

export const STATS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
export const STAT_NAMES = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };
export const mod = (v) => Math.floor((v - 10) / 2);

export const GRID = 7;           // the labyrinth is a 7×7 grid of rooms
export const ROOM_COUNT = 27;    // rooms actually used
export const MAX_LEVEL = 5;
export const XP_LEVELS = [0, 50, 120, 220, 350]; // xp needed to reach level 1..5
export const DC = { easy: 8, normal: 12, hard: 16, deadly: 20 };

// ---------- skills ----------
// kind: 'attack' (on your turn), 'reaction' (when a monster hits you), 'explore' (outside fights)
export const SKILLS = {
  stab:       { name: 'Stab', kind: 'attack', cd: 3, desc: 'A strong hit: +2 to hit and +4 damage.' },
  riposte:    { name: 'Riposte', kind: 'reaction', cd: 3, desc: 'Reaction: when a monster hits you, strike back at once.' },
  prayer:     { name: 'Prayer', kind: 'explore', desc: 'WIS check at a door to learn what is behind it. Fail and that door stays hidden.' },
  picklock:   { name: 'Pick Lock', kind: 'explore', desc: '+5 to picking locks and disarming traps.' },
  spark:      { name: 'Spark', kind: 'attack', cd: 2, spell: true, desc: 'Magic bolt: INT to hit, 1d6 + INT damage.' },
  ward:       { name: 'Ward', kind: 'attack', cd: 4, spell: true, desc: 'A shield of light blocks the next hit against you.' },
  light:      { name: 'Light', kind: 'attack', cd: 4, spell: true, desc: 'Blinding flash: the monster gets −4 to hit for 2 rounds.' },
  shieldbash: { name: 'Shield Bash', kind: 'attack', cd: 3, desc: 'STR hit for 1d4 that stuns the monster for 1 turn.' },
  fireball:   { name: 'Fireball', kind: 'attack', cd: 3, spell: true, desc: 'INT to hit, 2d6 + INT fire damage.' },
  frostbolt:  { name: 'Frost Bolt', kind: 'attack', cd: 3, spell: true, desc: 'INT to hit, 1d8 + INT damage. The monster is slowed: −2 to hit for 2 rounds.' },
  mend:       { name: 'Mend', kind: 'attack', cd: 4, spell: true, desc: 'Heal 1d8 + WIS.' },
  drain:      { name: 'Blood Drain', kind: 'attack', cd: 3, spell: true, desc: 'INT to hit, 1d6 + INT damage, and you heal half of it.' },
  smite:      { name: 'Smite', kind: 'attack', cd: 3, desc: 'WIS to hit, 1d8 + WIS. Double damage against the undead.' },
  cleave:     { name: 'Cleave', kind: 'attack', cd: 2, desc: 'A huge swing: −1 to hit, +6 damage.' },
  venom:      { name: 'Venom', kind: 'attack', cd: 4, desc: 'DEX hit that poisons: 2 damage each round for 3 rounds.' },
  aimed:      { name: 'Aimed Shot', kind: 'attack', cd: 3, desc: '+4 to hit and +3 damage.' },
};

// ---------- items ----------
// slot: rhand lhand head chest legs feet back trinket | bag (consumables)
// armor: adds to defense. heavy: STR needed, else −2 DEX. two: uses both hands.
// stat bonuses in `bonus`. `skill` is granted while equipped. Tomes/scrolls `teach` a skill.
// rarity: common fine rare cursed. `curse` text explains the drawback.
export const ITEMS = {
  // weapons
  longsword:  { name: 'Longsword', slot: 'rhand', icon: '⚔️', dmg: [1, 8, 0], stat: 'str', rarity: 'common', price: 25 },
  rapier:     { name: 'Rapier', slot: 'rhand', icon: '🤺', dmg: [1, 6, 0], stat: 'dex', hit: 1, rarity: 'common', price: 25 },
  mace:       { name: 'Mace', slot: 'rhand', icon: '🔨', dmg: [1, 6, 1], stat: 'str', holy: 2, rarity: 'common', price: 20, desc: '+2 damage to the undead.' },
  staff:      { name: 'Staff', slot: 'rhand', icon: '🦯', two: true, dmg: [1, 6, 0], stat: 'int', spell: 1, rarity: 'common', price: 15, desc: 'A wizard’s staff: hits with INT. +1 to spell hits.' },
  shovel:     { name: 'Shovel', slot: 'rhand', icon: '⛏️', two: true, dmg: [1, 6, 1], stat: 'str', rarity: 'common', price: 10 },
  dagger:     { name: 'Dagger', slot: 'rhand', icon: '🗡️', dmg: [1, 4, 0], stat: 'dex', hit: 2, rarity: 'common', price: 10 },
  greataxe:   { name: 'Greataxe', slot: 'rhand', icon: '🪓', two: true, dmg: [1, 12, 0], stat: 'str', skill: 'cleave', rarity: 'fine', price: 50 },
  crossbow:   { name: 'Crossbow', slot: 'rhand', icon: '🏹', two: true, dmg: [1, 8, 1], stat: 'dex', skill: 'aimed', rarity: 'fine', price: 45 },
  venomblade: { name: 'Venom Dagger', slot: 'rhand', icon: '🗡️', dmg: [1, 4, 1], stat: 'dex', hit: 2, skill: 'venom', rarity: 'fine', price: 45 },
  silversword:{ name: 'Silvered Sword', slot: 'rhand', icon: '⚔️', dmg: [1, 8, 2], stat: 'str', holy: 3, rarity: 'rare', price: 80, desc: '+3 damage to the undead and werewolves.' },
  warhammer:  { name: 'Warhammer', slot: 'rhand', icon: '🔨', two: true, dmg: [2, 6, 1], stat: 'str', rarity: 'rare', price: 75 },
  blackblade: { name: 'Black Blade', slot: 'rhand', icon: '🗡️', dmg: [2, 6, 2], stat: 'str', hit: 1, rarity: 'cursed', price: 0, curse: 'Each of your attacks costs you 1 HP.' },
  // off hand
  shield:     { name: 'Round Shield', slot: 'lhand', icon: '🛡️', armor: 1, skill: 'shieldbash', rarity: 'common', price: 25 },
  towershield:{ name: 'Tower Shield', slot: 'lhand', icon: '🛡️', armor: 2, heavy: 13, skill: 'shieldbash', rarity: 'fine', price: 55 },
  holysymbol: { name: 'Holy Symbol', slot: 'lhand', icon: '✝️', bonus: { wis: 1 }, skill: 'smite', rarity: 'common', price: 30 },
  lantern:    { name: 'Lantern', slot: 'lhand', icon: '🏮', bonus: { wis: 1 }, spot: 2, rarity: 'common', price: 15, desc: '+2 to spotting traps.' },
  lockpicks:  { name: 'Lockpicks', slot: 'lhand', icon: '🔧', lockpick: 3, rarity: 'common', price: 15, desc: '+3 to picking locks.' },
  parrydagger:{ name: 'Parrying Dagger', slot: 'lhand', icon: '🗡️', armor: 1, bonus: { dex: 1 }, rarity: 'fine', price: 40 },
  // head
  helm:       { name: 'Iron Helm', slot: 'head', icon: '⛑️', armor: 1, rarity: 'common', price: 20 },
  greathelm:  { name: 'Great Helm', slot: 'head', icon: '⛑️', armor: 2, heavy: 12, spot: -1, rarity: 'fine', price: 45, desc: '−1 to spotting traps.' },
  hood:       { name: 'Dark Hood', slot: 'head', icon: '🥷', bonus: { dex: 1 }, rarity: 'common', price: 15 },
  widehat:    { name: 'Wide Hat', slot: 'head', icon: '🎩', bonus: { cha: 1 }, rarity: 'common', price: 15 },
  beakmask:   { name: 'Beak Mask', slot: 'head', icon: '🎭', bonus: { con: 1 }, antipoison: true, rarity: 'fine', price: 45, desc: 'You can\'t be poisoned.' },
  hollowcrown:{ name: 'Hollow Crown', slot: 'head', icon: '👑', bonus: { int: 3, wis: -2 }, rarity: 'cursed', price: 0, curse: '−2 WIS.' },
  // chest
  robes:      { name: 'Robes', slot: 'chest', icon: '🥻', rarity: 'common', price: 10 },
  finecoat:   { name: 'Fine Coat', slot: 'chest', icon: '🧥', armor: 1, bonus: { cha: 1 }, rarity: 'common', price: 30 },
  leather:    { name: 'Leather Armor', slot: 'chest', icon: '🦺', armor: 2, rarity: 'common', price: 25 },
  chainmail:  { name: 'Chainmail', slot: 'chest', icon: '⛓️', armor: 3, heavy: 12, rarity: 'common', price: 45 },
  plate:      { name: 'Plate Armor', slot: 'chest', icon: '🛡️', armor: 5, heavy: 15, rarity: 'rare', price: 110 },
  magerobes:  { name: 'Embroidered Robes', slot: 'chest', icon: '🥻', armor: 1, bonus: { int: 1 }, spell: 1, rarity: 'fine', price: 55, desc: '+1 to spell hits.' },
  // legs / feet
  greaves:    { name: 'Greaves', slot: 'legs', icon: '🦿', armor: 1, heavy: 11, rarity: 'common', price: 20 },
  leggings:   { name: 'Padded Leggings', slot: 'legs', icon: '👖', armor: 1, rarity: 'common', price: 15 },
  boots:      { name: 'Boots', slot: 'feet', icon: '👢', flee: 2, rarity: 'common', price: 10, desc: '+2 to fleeing.' },
  ironboots:  { name: 'Iron Boots', slot: 'feet', icon: '👢', armor: 1, heavy: 12, rarity: 'fine', price: 35 },
  slippers:   { name: 'Silent Slippers', slot: 'feet', icon: '🥿', bonus: { dex: 1 }, flee: 3, rarity: 'fine', price: 40, desc: '+3 to fleeing.' },
  // back
  cloak:      { name: 'Cloak', slot: 'back', icon: '🧣', armor: 1, rarity: 'common', price: 20 },
  satchel:    { name: 'Satchel', slot: 'back', icon: '👜', bag: 3, rarity: 'common', price: 25, desc: 'Bag: 3 slots.' },
  pack:       { name: 'Pack', slot: 'back', icon: '🎒', bag: 5, rarity: 'fine', price: 50, desc: 'Bag: 5 slots.' },
  pilgrimpack:{ name: "Pilgrim's Pack", slot: 'back', icon: '🎒', bag: 7, rarity: 'rare', price: 90, desc: 'Bag: 7 slots.' },
  shroud:     { name: 'Grave Shroud', slot: 'back', icon: '🧣', armor: 2, bonus: { cha: -1 }, rarity: 'fine', price: 40 },
  // trinkets
  ringstr:    { name: 'Ring of Might', slot: 'trinket', icon: '💍', bonus: { str: 1 }, rarity: 'fine', price: 45 },
  ringdex:    { name: 'Ring of Grace', slot: 'trinket', icon: '💍', bonus: { dex: 1 }, rarity: 'fine', price: 45 },
  ringint:    { name: 'Ring of Lore', slot: 'trinket', icon: '💍', bonus: { int: 1 }, rarity: 'fine', price: 45 },
  amuletwis:  { name: 'Saint\'s Amulet', slot: 'trinket', icon: '📿', bonus: { wis: 1 }, rarity: 'fine', price: 45 },
  amuletcha:  { name: 'Silver Locket', slot: 'trinket', icon: '📿', bonus: { cha: 1 }, rarity: 'fine', price: 40 },
  vigor:      { name: 'Amulet of Vigor', slot: 'trinket', icon: '📿', maxhp: 5, rarity: 'rare', price: 70, desc: '+5 max HP.' },
  warding:    { name: 'Charm of Warding', slot: 'trinket', icon: '🧿', armor: 1, rarity: 'rare', price: 70 },
  bonedie:    { name: 'Bone Die', slot: 'trinket', icon: '🎲', luck: 1, rarity: 'fine', price: 40, desc: '+1 to all checks.' },
  bloodring:  { name: 'Ring of Blood', slot: 'trinket', icon: '💍', bonus: { str: 2, con: 1 }, rarity: 'cursed', price: 0, curse: 'Lose 1 HP each time you enter a room.' },
  // consumables (bag)
  potion:     { name: 'Healing Potion', slot: 'bag', icon: '🧪', heal: [2, 4, 2], combat: true, explore: true, rarity: 'common', price: 15, desc: 'Heal 2d4+2.' },
  bigpotion:  { name: 'Greater Healing', slot: 'bag', icon: '🧪', heal: [4, 4, 4], combat: true, explore: true, rarity: 'fine', price: 35, desc: 'Heal 4d4+4.' },
  antidote:   { name: 'Antidote', slot: 'bag', icon: '🌿', cure: 'poison', combat: true, explore: true, rarity: 'common', price: 10, desc: 'Cures poison.' },
  bomb:       { name: 'Black Powder Bomb', slot: 'bag', icon: '💣', bomb: [3, 6, 0], combat: true, rarity: 'fine', price: 30, desc: '3d6 damage, never misses.' },
  torch:      { name: 'Torch', slot: 'bag', icon: '🔥', cure: 'dark', explore: true, rarity: 'common', price: 8, desc: 'Ends darkness.' },
  scrying:    { name: 'Scrying Dust', slot: 'bag', icon: '✨', peek: true, explore: true, rarity: 'fine', price: 25, desc: 'Learn what is behind one door.' },
  blackwater: { name: 'Flask of Black Water', slot: 'bag', icon: '🫙', heal: [3, 6, 0], poisonChance: 0.3, combat: true, explore: true, rarity: 'fine', price: 0, desc: 'Heal 3d6, but it might poison you.' },
  // tomes and scrolls: teach a skill for good (Aspirants always learn, others need an INT check)
  scrollspark:{ name: 'Scroll of Spark', slot: 'bag', icon: '📜', teach: 'spark', explore: true, rarity: 'common', price: 30, desc: 'Teaches Spark.' },
  scrollward: { name: 'Scroll of Ward', slot: 'bag', icon: '📜', teach: 'ward', explore: true, rarity: 'common', price: 30, desc: 'Teaches Ward.' },
  scrolllight:{ name: 'Scroll of Light', slot: 'bag', icon: '📜', teach: 'light', explore: true, rarity: 'common', price: 30, desc: 'Teaches Light.' },
  tomefire:   { name: 'Tome of Fire', slot: 'bag', icon: '📕', teach: 'fireball', explore: true, rarity: 'rare', price: 70, desc: 'Teaches Fireball.' },
  tomefrost:  { name: 'Tome of Frost', slot: 'bag', icon: '📘', teach: 'frostbolt', explore: true, rarity: 'fine', price: 50, desc: 'Teaches Frost Bolt.' },
  tomemend:   { name: 'Tome of Mending', slot: 'bag', icon: '📗', teach: 'mend', explore: true, rarity: 'fine', price: 50, desc: 'Teaches Mend.' },
  tomeblood:  { name: 'Tome of Blood', slot: 'bag', icon: '📕', teach: 'drain', explore: true, rarity: 'rare', price: 70, desc: 'Teaches Blood Drain.' },
  tomesmite:  { name: 'Psalter of Wrath', slot: 'bag', icon: '📒', teach: 'smite', explore: true, rarity: 'fine', price: 50, desc: 'Teaches Smite.' },
};

export const SLOT_NAMES = { rhand: 'R. hand', lhand: 'L. hand', head: 'Head', chest: 'Chest', legs: 'Legs', feet: 'Feet', back: 'Back', t1: 'Trinket', t2: 'Trinket', t3: 'Trinket' };
export const GEAR_SLOTS = ['rhand', 'lhand', 'head', 'chest', 'legs', 'feet', 'back', 't1', 't2', 't3'];
export const RARITY_COLOR = { common: '#b8b0a2', fine: '#7bd389', rare: '#7fb2ff', cursed: '#c77dff' };

// Loot tables by danger tier (1 weak, 2 normal, 3 tough). Weighted by rarity.
export const LOOT = {
  common: ['potion', 'potion', 'antidote', 'torch', 'dagger', 'shield', 'helm', 'hood', 'widehat', 'leather', 'greaves', 'leggings', 'boots', 'cloak', 'satchel', 'lantern', 'scrollspark', 'scrollward', 'scrolllight', 'holysymbol', 'mace', 'rapier', 'longsword'],
  fine: ['bigpotion', 'bomb', 'scrying', 'greataxe', 'crossbow', 'venomblade', 'towershield', 'parrydagger', 'greathelm', 'beakmask', 'magerobes', 'ironboots', 'slippers', 'pack', 'shroud', 'ringstr', 'ringdex', 'ringint', 'amuletwis', 'amuletcha', 'bonedie', 'tomefrost', 'tomemend', 'tomesmite', 'chainmail'],
  rare: ['silversword', 'warhammer', 'plate', 'pilgrimpack', 'vigor', 'warding', 'tomefire', 'tomeblood'],
  cursed: ['blackblade', 'hollowcrown', 'bloodring'],
};
export const RARITY_ODDS = { // [common, fine, rare, cursed]
  1: [70, 25, 2, 3],
  2: [40, 45, 10, 5],
  3: [15, 50, 28, 7],
};

// ---------- backgrounds ----------
export const BACKGROUNDS = {
  deserter: { name: 'Deserter', lean: ['str', 'con'], gear: { rhand: 'longsword', chest: 'chainmail' }, skill: 'stab', hp: 18, hpLevel: 6,
    blurb: 'A soldier who ran from a lost war. Strong and hard to kill.' },
  noble: { name: "Noble's Heir", lean: ['cha', 'dex'], gear: { rhand: 'rapier', chest: 'finecoat' }, skill: 'riposte', hp: 14, hpLevel: 4,
    blurb: 'Raised with a blade in hand and a silver tongue.' },
  pilgrim: { name: 'Pilgrim', lean: ['wis', 'con'], gear: { lhand: 'holysymbol', chest: 'robes', rhand: 'mace' }, skill: 'prayer', hp: 16, hpLevel: 5,
    blurb: 'Walks in faith. Prayer shows what waits beyond a door.' },
  aspirant: { name: 'Aspirant', lean: ['int', 'wis'], gear: { chest: 'robes', rhand: 'staff' }, skill: 'spell', hp: 12, hpLevel: 3,
    blurb: 'A wizard who barely knows any spells. Learns from every tome and scroll.' },
  graverobber: { name: 'Grave Robber', lean: ['dex', 'int'], gear: { rhand: 'shovel', head: 'hood', lhand: 'lockpicks' }, skill: 'picklock', hp: 14, hpLevel: 4,
    blurb: 'Knows every lock and every trap. Digs where others pray.' },
};
export const BG_ORDER = ['deserter', 'noble', 'pilgrim', 'aspirant', 'graverobber'];
export const ASPIRANT_SPELLS = ['spark', 'ward', 'light'];

// ---------- monsters ----------
// dmg: [dice, sides, plus]. tier 1 weak, 2 normal, 3 tough, 4 boss.
export const MONSTERS = {
  rats:     { name: 'Gnawing Rats', tier: 1, hp: 7, def: 10, hit: 1, dmg: [1, 4, 0], init: 2, xp: 15, gold: [0, 4], sprite: 'rats', line: 'A tide of teeth pours from the walls.' },
  hollow:   { name: 'Hollow', tier: 1, hp: 10, def: 9, hit: 1, dmg: [1, 6, 0], init: -1, xp: 15, gold: [1, 6], undead: true, sprite: 'hollow', line: 'It was a pilgrim once.' },
  wisp:     { name: 'Candle-wisp', tier: 1, hp: 6, def: 12, hit: 2, dmg: [1, 4, 1], init: 3, xp: 18, gold: [2, 8], undead: true, sprite: 'wisp', line: 'A child\'s laugh, a guttering flame.' },
  skeleton: { name: 'Skeleton Knight', tier: 2, hp: 16, def: 13, hit: 4, dmg: [1, 8, 0], init: 0, xp: 30, gold: [4, 12], undead: true, sprite: 'skeleton', line: 'Its oath outlived its flesh.' },
  hound:    { name: 'Grave Hound', tier: 2, hp: 14, def: 12, hit: 4, dmg: [1, 6, 1], init: 3, xp: 28, gold: [0, 6], beast: true, sprite: 'hound', line: 'It has been fed on the dead.' },
  hag:      { name: 'Fen Hag', tier: 2, hp: 15, def: 11, hit: 4, dmg: [1, 6, 0], init: 1, xp: 30, gold: [6, 16], poison: 0.4, sprite: 'hag', line: '"Such sweet meat, wandering alone…"' },
  mimic:    { name: 'Mimic', tier: 2, hp: 18, def: 12, hit: 5, dmg: [1, 8, 1], init: 2, xp: 35, gold: [10, 25], sprite: 'mimic', line: 'The chest has teeth.' },
  werewolf: { name: 'Werewolf', tier: 3, hp: 30, def: 13, hit: 6, dmg: [1, 10, 2], init: 3, xp: 60, gold: [5, 15], beast: true, regen: 2, silverWeak: true, sprite: 'werewolf', line: 'It heals as fast as you can cut it.' },
  wraith:   { name: 'Mourning Wraith', tier: 3, hp: 24, def: 14, hit: 5, dmg: [1, 8, 2], init: 2, xp: 60, gold: [10, 25], undead: true, drain: true, sprite: 'wraith', line: 'It weeps, and drinks your warmth.' },
  maiden:   { name: 'Iron Maiden', tier: 3, hp: 34, def: 16, hit: 5, dmg: [2, 6, 0], init: -2, xp: 65, gold: [15, 30], sprite: 'maiden', line: 'A walking cage of spikes. Something screams inside.' },
  warden:   { name: 'The Warden of the Black Gate', tier: 4, hp: 50, def: 15, hit: 6, dmg: [1, 10, 3], init: 1, xp: 0, gold: [0, 0], boss: true, sprite: 'warden', line: 'None leave. None ever leave.' },
};
export const MONSTERS_BY_TIER = { 1: ['rats', 'hollow', 'wisp'], 2: ['skeleton', 'hound', 'hag'], 3: ['werewolf', 'wraith', 'maiden'] };

// ---------- traps ----------
export const TRAPS = {
  darts:   { name: 'Dart Wall', save: 'dex', dmg: [2, 4, 0], text: 'Darts hiss from holes in the wall!' },
  pit:     { name: 'Spiked Pit', save: 'dex', dmg: [2, 6, 0], text: 'The floor gives way above a pit of spikes!' },
  needle:  { name: 'Poison Needle', save: 'con', dmg: [1, 4, 0], poison: true, text: 'A needle pricks you. Your blood burns.' },
  ceiling: { name: 'Collapsing Ceiling', save: 'dex', dmg: [3, 6, 0], tier: 3, text: 'The ceiling thunders down!' },
  snuffer: { name: 'Snuffer', save: 'dex', dmg: [0, 0, 0], dark: true, text: 'A gust of black air snuffs out every light.' },
};
export const TRAPS_BY_TIER = { 1: ['darts', 'needle', 'snuffer'], 2: ['darts', 'pit', 'needle', 'snuffer'], 3: ['pit', 'ceiling', 'needle', 'snuffer'] };

// ---------- encounters ----------
// Each choice: label, optional check {stat, dc}, and outcomes `ok` / `fail` (or just `ok`).
// Outcomes are lists of effects the host understands:
//   ['text', '...'] ['heal', n] ['hurt', [dice]] ['gold', n] ['xp', n] ['item', id|'random'|'randomRare']
//   ['stat', stat|'random', n] ['maxhp', n] ['poison'] ['curse'] ['fight', monsterId] ['reveal', n]
//   ['teach', 'random'] ['cure'] ['payGold', n] ['needItem', id] ['loseItem', id]
// `needs`: the choice is only offered if you have it ('potion' or {gold: n}).
export const ENCOUNTERS = [
  { id: 'knight', title: 'The Wounded Knight', sprite: 'knightnpc', text: 'A knight slumps against the wall, his armor split. "Water… or a potion… I know the way to the Gate."',
    choices: [
      { label: 'Give him a potion', needs: 'potion', ok: [['loseItem', 'potion'], ['text', 'He drinks and points the way. "Follow the cold air."'], ['reveal', 6], ['xp', 25]] },
      { label: 'Rob him', check: { stat: 'str', dc: 12 }, ok: [['text', 'You take his purse. He curses you weakly.'], ['gold', 18], ['item', 'random']], fail: [['text', 'He still has some fight left!'], ['hurt', [1, 6, 0]]] },
      { label: 'Leave him', ok: [['text', 'His breathing fades behind you.']] },
    ] },
  { id: 'hungryshrine', title: 'The Hungry Shrine', sprite: 'idol', text: 'A stone idol with an open mouth, stained dark. Old offerings rot at its feet.',
    choices: [
      { label: 'Feed it blood (5 HP)', ok: [['hurtFlat', 5], ['text', 'The idol drinks. Strength floods you.'], ['stat', 'random', 1]] },
      { label: 'Pray to it', check: { stat: 'wis', dc: 13 }, ok: [['text', 'It hears you and grants a blessing.'], ['stat', 'random', 1]], fail: [['text', 'It bites.'], ['hurt', [1, 6, 0]]] },
      { label: 'Walk past', ok: [['text', 'You feel it watching you go.']] },
    ] },
  { id: 'pool', title: 'The Pool of Black Water', sprite: 'pool', text: 'A still pool, black as ink. Your reflection smiles a moment too late.',
    choices: [
      { label: 'Drink', check: { stat: 'con', dc: 12 }, ok: [['text', 'Cold and clean. Your wounds close.'], ['heal', 12], ['maxhp', 2]], fail: [['text', 'It burns going down.'], ['poison'], ['hurt', [1, 6, 0]]] },
      { label: 'Fill a flask', ok: [['item', 'blackwater'], ['text', 'You seal some of the water in a flask.']] },
      { label: 'Leave it', ok: [['text', 'The ripples follow you to the door.']] },
    ] },
  { id: 'reliquary', title: 'The Weeping Door', sprite: 'weepdoor', text: 'A small iron door set in the wall, weeping rust. A voice: "What walks on bones and never dies?"',
    choices: [
      { label: 'Answer the riddle', check: { stat: 'int', dc: 13 }, ok: [['text', '"The Labyrinth," you say. The door opens.'], ['item', 'randomRare'], ['xp', 20]], fail: [['text', 'The door screams. Your ears bleed.'], ['hurt', [1, 4, 0]]] },
      { label: 'Force it open', check: { stat: 'str', dc: 14 }, ok: [['text', 'The hinges tear free.'], ['hurt', [1, 4, 0]], ['item', 'random']], fail: [['text', 'It won\'t budge, and your shoulder pays.'], ['hurt', [1, 6, 0]]] },
      { label: 'Leave', ok: [['text', 'The weeping goes on behind you.']] },
    ] },
  { id: 'prisoner', title: 'The Chained Prisoner', sprite: 'prisoner', text: 'A thin man hangs in chains. "Please… they will come back for me."',
    choices: [
      { label: 'Break the chains', check: { stat: 'str', dc: 12 }, ok: [['text', 'The chains snap. He presses coins into your hand and flees.'], ['gold', 15], ['xp', 20]], fail: [['text', 'The noise draws something from the dark!'], ['fight', 'rats']] },
      { label: 'Pick the lock', check: { stat: 'dex', dc: 12, lock: true }, ok: [['text', 'Click. He whispers the way to the Gate before he runs.'], ['reveal', 4], ['xp', 20]], fail: [['text', 'Your pick snaps. He begins to sob.']] },
      { label: 'Leave him', ok: [['text', 'His begging follows you.']] },
    ] },
  { id: 'dice', title: 'The Bone Gambler', sprite: 'gambler', text: 'A skeleton sits at a table, rattling dice in a skull cup. It gestures: play?',
    choices: [
      { label: 'Play (bet 10 gold)', needs: { gold: 10 }, check: { stat: 'cha', dc: 11 }, ok: [['text', 'You win! It clacks its jaw in approval.'], ['gold', 20]], fail: [['text', 'You lose.'], ['payGold', 10]] },
      { label: 'Cheat', check: { stat: 'dex', dc: 14 }, ok: [['text', 'Loaded dice. You clean it out.'], ['gold', 35]], fail: [['text', 'It sees. It rises, sword in hand!'], ['fight', 'skeleton']] },
      { label: 'Decline', ok: [['text', 'It goes back to rolling alone.']] },
    ] },
  { id: 'corpse', title: 'A Dead Adventurer', sprite: 'corpse', text: 'Someone got this far. Their pack is still on their back.',
    choices: [
      { label: 'Search carefully', check: { stat: 'wis', dc: 11 }, ok: [['text', 'You find what they left behind.'], ['item', 'random'], ['gold', 8]], fail: [['text', 'A needle was hidden in the strap!'], ['poison'], ['item', 'random']] },
      { label: 'Say a prayer for them', ok: [['text', 'You feel a little lighter.'], ['heal', 4], ['xp', 10]] },
      { label: 'Leave them be', ok: [['text', 'Rest well.']] },
    ] },
  { id: 'statue', title: 'The Whispering Statue', sprite: 'statue', text: 'A hooded statue. Its lips move. It is reciting something… a spell?',
    choices: [
      { label: 'Listen closely', check: { stat: 'wis', dc: 12 }, ok: [['text', 'The words settle into your mind.'], ['teach', 'random']], fail: [['text', 'The whispers turn to screams inside your skull.'], ['hurt', [1, 6, 0]]] },
      { label: 'Cover your ears and go', ok: [['text', 'You hurry past.']] },
    ] },
  { id: 'cart', title: 'The Plague Cart', sprite: 'cart', text: 'A cart heaped with wrapped bodies. Supplies are tucked between them.',
    choices: [
      { label: 'Dig through it', check: { stat: 'con', dc: 12 }, ok: [['text', 'You hold your breath and find supplies.'], ['item', 'potion'], ['item', 'antidote']], fail: [['text', 'The rot gets into you.'], ['poison'], ['item', 'potion']] },
      { label: 'Leave it', ok: [['text', 'Flies follow you for a while.']] },
    ] },
  { id: 'mirror', title: 'The Black Mirror', sprite: 'mirror', text: 'A mirror of black glass. Your reflection is wearing a crown.',
    choices: [
      { label: 'Gaze into it', check: { stat: 'cha', dc: 13 }, ok: [['text', 'The reflection bows to you.'], ['stat', 'cha', 1], ['xp', 15]], fail: [['text', 'The reflection takes something from you.'], ['stat', 'random', -1]] },
      { label: 'Smash it', check: { stat: 'str', dc: 10 }, ok: [['text', 'It shatters. Something shrieks and is gone.'], ['xp', 20]], fail: [['text', 'Shards cut you.'], ['hurt', [1, 4, 0]]] },
      { label: 'Look away', ok: [['text', 'Better not.']] },
    ] },
  { id: 'starving', title: 'The Starving Pilgrim', sprite: 'beggar', text: 'A pilgrim in rags holds out a bowl. "Anything… a coin, for the saints."',
    choices: [
      { label: 'Give 10 gold', needs: { gold: 10 }, ok: [['payGold', 10], ['text', 'She blesses you with shaking hands.'], ['stat', 'wis', 1], ['heal', 6]] },
      { label: 'Talk with her', check: { stat: 'cha', dc: 12 }, ok: [['text', 'She tells you what she saw on her way in.'], ['reveal', 3]], fail: [['text', 'She only mutters prayers.']] },
      { label: 'Walk on', ok: [['text', 'She keeps praying.']] },
    ] },
  { id: 'library', title: 'The Library of Ash', sprite: 'books', text: 'Shelves of burned books. A few pages still glow faintly.',
    choices: [
      { label: 'Read the glowing pages', check: { stat: 'int', dc: 12 }, ok: [['text', 'The words burn into your memory.'], ['teach', 'random']], fail: [['text', 'The pages flare up in your face!'], ['hurt', [1, 6, 0]]] },
      { label: 'Take a burned tome', ok: [['item', 'randomTome'], ['text', 'You tuck it away for later.']] },
      { label: 'Leave', ok: [['text', 'Ash drifts after you.']] },
    ] },
  { id: 'cage', title: 'The Hanging Cage', sprite: 'cage', text: 'An iron cage hangs from the ceiling. Something inside rattles. There\'s a glint of steel beside it.',
    choices: [
      { label: 'Reach in for the steel', check: { stat: 'dex', dc: 12 }, ok: [['text', 'You snatch it before the hand grabs you.'], ['item', 'random']], fail: [['text', 'The cage bursts open!'], ['fight', 'hollow']] },
      { label: 'Leave it', ok: [['text', 'It keeps rattling.']] },
    ] },
  { id: 'thorns', title: 'The Altar of Thorns', sprite: 'thornaltar', text: 'A blade lies on an altar wrapped in thorns. To take it, you must bleed.',
    choices: [
      { label: 'Bleed for it (8 HP)', ok: [['hurtFlat', 8], ['text', 'The thorns let go.'], ['item', 'randomWeapon']] },
      { label: 'Leave it', ok: [['text', 'The thorns curl back.']] },
    ] },
  { id: 'child', title: 'A Song in the Dark', sprite: 'child', text: 'A small child sings in the dark. "Come play with me. Come play forever."',
    choices: [
      { label: 'See it for what it is', check: { stat: 'wis', dc: 13 }, ok: [['text', 'A wisp in a child\'s shape. It flees, dropping coins.'], ['gold', 14], ['xp', 20]], fail: [['text', 'It shows its true face!'], ['fight', 'wisp']] },
      { label: 'Comfort it', check: { stat: 'cha', dc: 12 }, ok: [['text', 'It stops singing and points down a passage, then fades.'], ['reveal', 4]], fail: [['text', 'It laughs and burns you.'], ['hurt', [1, 4, 1]]] },
      { label: 'Back away', ok: [['text', 'The song follows you.']] },
    ] },
];

// Little hints you might hear at a door (WIS).
export const HINTS = {
  monster: ['Something breathes on the other side.', 'Claws scrape stone nearby.', 'Bones rattle somewhere close.'],
  trap: ['A faint click, then silence.', 'The air smells of oil and iron.'],
  treasure: ['Something glints in the dark ahead.'],
  encounter: ['A voice murmurs nearby.', 'Someone is singing very softly.'],
  shrine: ['Candlelight flickers ahead.'],
  merchant: ['Coins clink somewhere ahead.'],
  boss: ['A great lantern swings in the dark. Chains drag. The Gate is near.'],
  empty: ['Only silence.'],
};

export const ROOM_LABEL = { empty: 'Empty', monster: 'Monster', trap: 'Trap', treasure: 'Treasure', encounter: 'Encounter', shrine: 'Shrine', merchant: 'Merchant', boss: 'The Black Gate', entrance: 'Entrance' };
