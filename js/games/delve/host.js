// Delve the Black Labyrinth – TV side. The TV is the referee: it builds the labyrinth,
// rolls every die, runs fights, traps, chests and encounters, and tells the phone what to show.
// Rules: docs/delve-rules.md
import { escapeHtml } from '../../supabase.js';
import {
  STATS, STAT_NAMES, mod, MAX_LEVEL, XP_LEVELS, SKILLS, ITEMS, GEAR_SLOTS, SLOT_NAMES, LOOT, RARITY_ODDS,
  BACKGROUNDS, BG_ORDER, ASPIRANT_SPELLS, MONSTERS, TRAPS, ENCOUNTERS, HINTS, ROOM_LABEL, RARITY_COLOR,
} from './data.js';
import { generate, DIRS, key, pathBetween } from './gen.js';
import { W, H, SW, HERO_X, FOE_X, FEET, ARCH_X, drawStage, drawMap, drawTitle } from './scene.js';

const d = (n) => 1 + Math.floor(Math.random() * n);
const roll = ([n, s, p]) => { let t = p || 0; for (let i = 0; i < n; i++) t += d(s); return t; };
const diceText = ([n, s, p]) => `${n}d${s}${p ? `+${p}` : ''}`;
const pickOne = (a) => a[Math.floor(Math.random() * a.length)];
const signed = (n) => (n >= 0 ? `+${n}` : `${n}`);
const SPELLS = ['spark', 'ward', 'light', 'fireball', 'frostbolt', 'mend', 'drain', 'smite'];

const ENC_ART = {
  knight: { id: 'knightnpc', x: 236, feet: 242 }, hungryshrine: { id: 'idol', x: 238 }, pool: { pool: true },
  reliquary: { door: true }, prisoner: { id: 'prisoner', x: 238, feet: 214 }, dice: { id: 'skeleton', x: 250, extra: { id: 'table', x: 214, feet: 242 } },
  corpse: { id: 'corpse', x: 236, feet: 246 }, statue: { id: 'statue', x: 240 }, cart: { id: 'cart', x: 240 }, mirror: { id: 'mirror', x: 240 },
  starving: { id: 'beggar', x: 238, feet: 242 }, library: { id: 'books', x: 240, feet: 232 }, cage: { id: 'cage', x: 240, feet: 196 },
  thorns: { id: 'thornaltar', x: 238 }, child: { id: 'child', x: 238 },
};

export function start({ container, players, setPhoneState, onExit }) {
  loadCss();
  const player = players[0];
  container.innerHTML = `
    <div class="dv-tv">
      <div class="dv-screen">
        <canvas class="dv-canvas" width="${W}" height="${H}"></canvas>
        <div class="dv-banner"><b></b><span></span></div>
        <div class="dv-story"></div>
        <div class="dv-log"></div>
        <div class="dv-roll"></div>
        <div class="dv-doors"></div>
        <div class="dv-maptitle">THE LABYRINTH</div>
        <div class="dv-status"></div>
        <div class="dv-center"></div>
        <div class="dv-floats"></div>
      </div>
    </div>`;
  const tvEl = container.querySelector('.dv-tv');
  const screen = container.querySelector('.dv-screen');
  const canvas = container.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const $ = (c) => container.querySelector(c);
  const bannerEl = $('.dv-banner'), storyEl = $('.dv-story'), logEl = $('.dv-log'), rollEl = $('.dv-roll');
  const doorsEl = $('.dv-doors'), statusEl = $('.dv-status'), centerEl = $('.dv-center'), floatsEl = $('.dv-floats');

  function resize() {
    const w = tvEl.clientWidth, h = tvEl.clientHeight;
    const scale = Math.min(w / W, h / H);
    screen.style.width = `${Math.floor(W * scale)}px`;
    screen.style.height = `${Math.floor(H * scale)}px`;
  }
  window.addEventListener('resize', resize);
  resize();

  // ---------------- game state ----------------
  const lab = generate();
  const G = {
    phase: 'create', // create → intro → explore / event / combat / walk → dead | won
    create: { step: 'pick', bg: null },
    hero: null,
    roomKey: lab.start, prevKey: null, cameFrom: null,
    ev: null, queue: [],
    combat: null,
    walk: null,
    log: [],
    anim: {},
    stats: { rooms: 1, kills: 0, gold: 0, cause: '' },
    lastRoll: null,
  };
  const room = () => lab.rooms.get(G.roomKey);
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };

  // ---------------- hero helpers ----------------
  function makeHero(bgId) {
    const bg = BACKGROUNDS[bgId];
    const h = { name: player.name, bg: bgId, level: 1, xp: 0, base: {}, gear: {}, bag: [], gold: 0, learned: [], cds: {},
      upg: {}, poison: false, dark: false, bonusHp: 0, rerolls: 1, hp: 1 };
    rollStats(h);
    for (const s of GEAR_SLOTS) h.gear[s] = null;
    for (const [slot, id] of Object.entries(bg.gear)) h.gear[slot] = { id };
    if (bgId === 'aspirant') h.learned.push('spark');
    h.hp = maxHp(h);
    return h;
  }
  function rollStats(h) {
    const bg = BACKGROUNDS[h.bg];
    for (const s of STATS) h.base[s] = d(6) + d(6) + 4 + (bg.lean.includes(s) ? 2 : 0);
  }
  const gearItems = (h) => GEAR_SLOTS.map((s) => h.gear[s] && ITEMS[h.gear[s].id]).filter(Boolean);
  function eff(h) {
    const e = { ...h.base };
    for (const it of gearItems(h)) for (const [s, v] of Object.entries(it.bonus || {})) e[s] += v;
    const heavyFail = gearItems(h).some((it) => it.heavy && it.heavy > e.str);
    if (heavyFail) e.dex -= 2;
    return e;
  }
  const heavyWarn = (h) => gearItems(h).some((it) => it.heavy && it.heavy > eff(h).str + (gearItems(h).some((i) => i.heavy && i.heavy > h.base.str) ? 0 : 0));
  function maxHp(h) {
    const bg = BACKGROUNDS[h.bg];
    const e = eff(h);
    const extra = gearItems(h).reduce((a, it) => a + (it.maxhp || 0), 0);
    return Math.max(4, bg.hp + (h.level - 1) * bg.hpLevel + mod(e.con) * h.level + extra + h.bonusHp);
  }
  const armor = (h) => gearItems(h).reduce((a, it) => a + (it.armor || 0), 0);
  const defense = (h) => 10 + armor(h) + mod(eff(h).dex);
  const luck = (h) => gearItems(h).reduce((a, it) => a + (it.luck || 0), 0);
  const gearSum = (h, f) => gearItems(h).reduce((a, it) => a + (it[f] || 0), 0);
  const bagCap = (h) => Math.max(1, h.gear.back ? (ITEMS[h.gear.back.id].bag || 1) : 1);
  function skillsOf(h) {
    const list = [];
    const bg = BACKGROUNDS[h.bg];
    if (bg.skill !== 'spell') list.push(bg.skill);
    for (const it of gearItems(h)) if (it.skill) list.push(it.skill);
    for (const s of h.learned) list.push(s);
    return [...new Set(list)];
  }
  const skillCd = (h, id) => Math.max(1, (SKILLS[id].cd || 0) - (h.upg[id] || 0));
  const weapon = (h) => (h.gear.rhand ? ITEMS[h.gear.rhand.id] : { name: 'Fists', dmg: [1, 2, 0], stat: 'str' });
  const spellBonus = (h) => gearSum(h, 'spell');

  function heal(n) {
    const h = G.hero; const before = h.hp;
    h.hp = Math.min(maxHp(h), h.hp + n);
    if (h.hp > before) floater('hero', `+${h.hp - before}`, 'heal');
    return h.hp - before;
  }
  function hurt(n, why) {
    const h = G.hero;
    n = Math.max(0, Math.round(n));
    if (!n) return 0;
    h.hp -= n;
    floater('hero', `−${n}`, 'dmg');
    G.anim.heroFlash = performance.now();
    G.anim.shake = performance.now();
    if (h.hp <= 0) { h.hp = 0; G.stats.cause = why || 'the Labyrinth'; }
    return n;
  }
  const alive = () => G.hero.hp > 0;

  // A d20 check. Returns {ok, text}. Shows the roll on the TV.
  function check(stat, dc, extra = 0, label = '') {
    const h = G.hero;
    const r = d(20);
    const m = mod(eff(h)[stat]);
    const bonus = extra + luck(h) - (h.dark ? 2 : 0);
    const total = r + m + bonus;
    const ok = r === 20 || (r !== 1 && total >= dc);
    const text = `🎲 d20 (${r}) ${signed(m)} ${STAT_NAMES[stat]}${bonus ? ` ${signed(bonus)}` : ''} = ${total} vs ${dc} · ${ok ? 'Success' : 'Fail'}${label ? ` (${label})` : ''}`;
    showRoll(text, ok);
    return { ok, text, r, total };
  }

  function addLog(line) { G.log.push(line); if (G.log.length > 8) G.log.shift(); }
  function gainXp(n) {
    const h = G.hero;
    if (!n || h.level >= MAX_LEVEL) return;
    h.xp += n;
    addLog(`+${n} XP`);
    while (h.level < MAX_LEVEL && h.xp >= XP_LEVELS[h.level]) {
      h.level++;
      const before = h.hp;
      h.hp = Math.min(maxHp(h), h.hp + BACKGROUNDS[h.bg].hpLevel + Math.max(0, mod(eff(h).con)));
      queue(() => levelUpEvent(h.hp - before));
    }
  }
  function gainGold(n) { if (n > 0) { G.hero.gold += n; G.stats.gold += n; addLog(`+${n} gold`); } }

  // ---------------- events ----------------
  // An event is a choice screen: { title, text, art, choices: [{label, sub, disabled, fn}] }.
  function queue(fn) { G.queue.push(fn); }
  function setEvent(ev) {
    G.ev = ev;
    G.phase = 'event';
    push();
  }
  function msg(title, text, then) {
    setEvent({ title, text, choices: [{ label: 'Continue', fn: () => { if (then) then(); else next(); } }] });
  }
  // Moves on to the next queued thing, or back to exploring.
  function next() {
    if (!alive()) return die();
    if (G.phase === 'won') return;
    const fn = G.queue.shift();
    if (fn) { fn(); return; }
    G.ev = null;
    const r = room();
    if (r.type !== 'merchant' || r.cleared) r.cleared = r.cleared || r.type !== 'treasure' || r.chestOpened || r.chestLeft;
    G.phase = 'explore';
    computeHint();
    push();
  }

  function levelUpEvent(hpGain) {
    const h = G.hero;
    const skills = skillsOf(h);
    setEvent({
      title: `Level ${h.level}!`, text: `You feel stronger. Max HP +${hpGain}. Choose one more reward.`, levelup: true,
      choices: [
        { label: '+2 to one stat', fn: () => pickStat('+2 to which stat?', 2, () => next()) },
        { label: '+1 to two stats', fn: () => pickStat('+1 to the first stat', 1, () => pickStat('+1 to the second stat', 1, () => next())) },
        { label: 'Upgrade a skill', disabled: !skills.length, fn: () => setEvent({
          title: 'Upgrade a skill', text: 'Attack skills get a shorter cooldown. Prayer and Pick Lock get +2.', levelup: true,
          choices: skills.map((s) => ({ label: SKILLS[s].name, sub: upgradeText(s), fn: () => { h.upg[s] = (h.upg[s] || 0) + 1; addLog(`${SKILLS[s].name} improved`); next(); } })),
        }) },
      ],
    });
    function pickStat(title, n, then) {
      setEvent({ title, text: 'Pick a stat.', levelup: true,
        choices: STATS.map((s) => ({ label: `${STAT_NAMES[s]} ${h.base[s]} → ${h.base[s] + n}`, fn: () => { h.base[s] += n; h.hp = Math.min(h.hp, maxHp(h)); addLog(`${STAT_NAMES[s]} +${n}`); then(); } })) });
    }
  }
  function upgradeText(s) {
    const sk = SKILLS[s];
    if (sk.kind === 'attack' || sk.kind === 'reaction') return `Cooldown ${skillCd(G.hero, s)} → ${Math.max(1, skillCd(G.hero, s) - 1)}`;
    return '+2 to its checks';
  }

  // ---------------- character creation ----------------
  function createInput(m) {
    const c = G.create;
    if (m.a === 'bg' && BACKGROUNDS[m.bg] && c.step === 'pick') {
      c.bg = m.bg; c.step = 'roll';
      G.hero = makeHero(m.bg);
      push();
    } else if (m.a === 'back' && c.step === 'roll') {
      c.step = 'pick'; c.bg = null; G.hero = null; push();
    } else if (m.a === 'reroll' && c.step === 'roll' && G.hero.rerolls > 0) {
      G.hero.rerolls--; rollStats(G.hero); G.hero.hp = maxHp(G.hero); push();
    } else if (m.a === 'spell' && c.step === 'roll' && G.hero.bg === 'aspirant' && ASPIRANT_SPELLS.includes(m.spell)) {
      G.hero.learned = [m.spell]; push();
    } else if (m.a === 'begin' && c.step === 'roll') {
      G.hero.hp = maxHp(G.hero);
      G.phase = 'intro';
      G.introAt = performance.now();
      addLog(`${G.hero.name} the ${BACKGROUNDS[G.hero.bg].name} enters the Black Labyrinth.`);
      push();
      later(() => { G.phase = 'explore'; computeHint(); push(); }, 2600);
    }
  }

  // ---------------- moving between rooms ----------------
  function neighbor(r, dir) { const dd = DIRS[dir]; return lab.rooms.get(key(r.x + dd.dx, r.y + dd.dy)); }
  function startWalk(dir, back = false) {
    const r = room();
    if (!r.doors[dir]) return;
    const to = neighbor(r, dir);
    if (!to) return;
    G.phase = 'walk';
    G.ev = null;
    G.walk = { dir, t0: performance.now(), to: to.key, back };
    push();
    later(() => {
      G.prevKey = G.roomKey;
      G.cameFrom = DIRS[dir].opp;
      G.roomKey = to.key;
      G.walk.stage = 'in';
      G.walk.t1 = performance.now();
      push();
      later(() => { G.walk = null; enterRoom(); }, 650);
    }, 750);
  }

  function enterRoom() {
    const r = room();
    const h = G.hero;
    if (!r.visited) G.stats.rooms++;
    r.visited = true;
    G.combat = null;
    // poison and cursed rings bite as you move
    if (h.poison && !gearItems(h).some((it) => it.antipoison)) { if (h.hp > 1) { h.hp -= 1; floater('hero', '−1', 'poison'); addLog('Poison burns (−1 HP).'); } }
    if (gearItems(h).some((it) => it === ITEMS.bloodring) && !isLifted('bloodring')) { if (h.hp > 1) { h.hp -= 1; floater('hero', '−1', 'dmg'); addLog('The Ring of Blood feeds (−1 HP).'); } }
    if (r.type === 'merchant') return merchantEvent(r);
    if (r.cleared) { G.phase = 'explore'; computeHint(); push(); return; }
    switch (r.type) {
      case 'monster': case 'boss': return startCombat(r.monster, { roomMonster: true });
      case 'trap': return trapRoom(r);
      case 'treasure': return chestEvent(r);
      case 'encounter': return encounterEvent(r);
      case 'shrine': return shrineEvent(r);
      default: return emptyRoom(r);
    }
  }
  function isLifted(itemId) { return GEAR_SLOTS.some((s) => G.hero.gear[s]?.id === itemId && G.hero.gear[s].lifted); }

  function emptyRoom(r) {
    r.cleared = true;
    const x = Math.random();
    if (x < 0.25) { const g = d(6) + 2 * r.tier; gainGold(g); msg('Empty room', `Nothing stirs. Among the bones you find ${g} gold.`); }
    else if (x < 0.35) { const it = randomItem(r.tier, ['potion', 'torch', 'antidote']); msg('Empty room', 'Nothing stirs, but something was left behind.', () => lootEvent(it)); }
    else { G.phase = 'explore'; addLog(pickOne(['Only dust and silence.', 'Old bones. Nothing more.', 'Water drips somewhere.'])); computeHint(); push(); }
  }

  function computeHint() {
    const r = room();
    if (r.hintDone) return;
    r.hintDone = true;
    const unknown = Object.keys(DIRS).filter((dir) => r.doors[dir] && !neighbor(r, dir).visited && !neighbor(r, dir).peek);
    if (!unknown.length) return;
    const dir = pickOne(unknown);
    const n = neighbor(r, dir);
    if (d(20) + mod(eff(G.hero).wis) + luck(G.hero) >= 14) {
      const t = n.type === 'entrance' ? 'empty' : n.type;
      r.hint = `${DIRS[dir].name}: "${pickOne(HINTS[t] || HINTS.empty)}"`;
    }
  }

  // ---------------- peeking (Prayer, Scrying Dust) ----------------
  function peekDoor(dir, how) {
    const r = room();
    const n = neighbor(r, dir);
    if (!r.doors[dir] || !n) return;
    if (how === 'prayer') {
      r.prayLock = r.prayLock || {};
      if (r.prayLock[dir] || n.visited || n.peek) return;
      const c = check('wis', 12, (G.hero.upg.prayer || 0) * 2, 'Prayer');
      if (c.ok) { n.peek = true; addLog(`Prayer: ${DIRS[dir].name} holds ${describeRoom(n)}.`); }
      else { r.prayLock[dir] = true; addLog(`Prayer: the ${DIRS[dir].name} door stays dark to you.`); }
    } else {
      n.peek = true; addLog(`Scrying: ${DIRS[dir].name} holds ${describeRoom(n)}.`);
    }
    push();
  }
  function describeRoom(n) {
    if (n.type === 'monster') return `a ${MONSTERS[n.monster].name}`;
    if (n.type === 'boss') return 'the Black Gate';
    if (n.type === 'trap') return 'a trap';
    if (n.type === 'treasure') return 'treasure';
    if (n.type === 'encounter') return `someone (or something)`;
    if (n.type === 'shrine') return 'a shrine';
    if (n.type === 'merchant') return 'a merchant';
    return 'nothing';
  }

  // ---------------- loot ----------------
  function randomItem(tier, from) {
    if (from) return pickOne(from);
    const odds = RARITY_ODDS[Math.min(3, Math.max(1, tier))];
    let x = Math.random() * 100, rar = 'common';
    const names = ['common', 'fine', 'rare', 'cursed'];
    for (let i = 0; i < 4; i++) { x -= odds[i]; if (x < 0) { rar = names[i]; break; } }
    return pickOne(LOOT[rar]);
  }
  function itemCard(id) {
    const it = ITEMS[id];
    const bits = [];
    if (it.dmg) bits.push(`${diceText(it.dmg)} damage (${STAT_NAMES[it.stat]})`);
    if (it.hit) bits.push(`+${it.hit} to hit`);
    if (it.two) bits.push('two-handed');
    if (it.armor) bits.push(`+${it.armor} armor`);
    if (it.heavy) bits.push(`needs STR ${it.heavy}`);
    for (const [s, v] of Object.entries(it.bonus || {})) bits.push(`${signed(v)} ${STAT_NAMES[s]}`);
    if (it.skill) bits.push(`skill: ${SKILLS[it.skill].name}`);
    if (it.desc) bits.push(it.desc);
    if (it.curse) bits.push(`Cursed: ${it.curse}`);
    return { id, name: it.name, icon: it.icon, rarity: it.rarity, color: RARITY_COLOR[it.rarity], slot: it.slot, text: bits.join(' · ') };
  }
  function slotFor(it, h) {
    if (it.slot !== 'trinket') return it.slot;
    return ['t1', 't2', 't3'].find((s) => !h.gear[s]) || null;
  }
  const stuck = (h, slot) => h.gear[slot] && ITEMS[h.gear[slot].id].rarity === 'cursed' && !h.gear[slot].lifted;
  function canEquip(h, it, slot) {
    if (stuck(h, slot)) return `Your ${ITEMS[h.gear[slot].id].name} is cursed and won't come off.`;
    if (it.two && stuck(h, 'lhand')) return 'Your cursed off-hand item won\'t let go.';
    if (it.slot === 'lhand' && h.gear.rhand && ITEMS[h.gear.rhand.id].two) return 'Your two-handed weapon needs both hands.';
    return '';
  }
  function equip(h, id, slot) {
    const it = ITEMS[id];
    if (it.two && h.gear.lhand) { addLog(`You leave the ${ITEMS[h.gear.lhand.id].name} behind.`); h.gear.lhand = null; }
    if (h.gear[slot]) addLog(`You leave the ${ITEMS[h.gear[slot].id].name} behind.`);
    h.gear[slot] = { id };
    h.hp = Math.min(h.hp, maxHp(h));
    addLog(`Equipped: ${it.name}${it.rarity === 'cursed' ? ' (it\'s cursed!)' : ''}`);
  }
  function lootEvent(id, then = next) {
    const h = G.hero;
    const it = ITEMS[id];
    const card = itemCard(id);
    const choices = [];
    if (it.slot === 'bag') {
      if (it.teach) choices.push({ label: 'Read it now', sub: learnChanceText(), fn: () => { learn(id); then(); } });
      if (h.bag.length < bagCap(h)) choices.push({ label: 'Put it in your bag', sub: `${h.bag.length}/${bagCap(h)} used`, fn: () => { h.bag.push(id); addLog(`Took: ${it.name}`); then(); } });
      else h.bag.forEach((b, i) => choices.push({ label: `Swap for ${ITEMS[b].name}`, sub: 'Bag full: leave that one here', fn: () => { h.bag[i] = id; addLog(`Took ${it.name}, left ${ITEMS[b].name}`); then(); } }));
    } else if (it.slot === 'trinket') {
      const free = slotFor(it, h);
      if (free) choices.push({ label: 'Wear it', fn: () => { equip(h, id, free); then(); } });
      else ['t1', 't2', 't3'].forEach((s) => {
        const why = canEquip(h, it, s);
        choices.push({ label: `Replace ${ITEMS[h.gear[s].id].name}`, disabled: !!why, sub: why, fn: () => { equip(h, id, s); then(); } });
      });
    } else {
      const why = canEquip(h, it, it.slot);
      const cur = h.gear[it.slot];
      choices.push({ label: cur ? `Equip (replaces ${ITEMS[cur.id].name})` : 'Equip it', disabled: !!why, sub: why || (it.heavy && it.heavy > eff(h).str ? `Too heavy for you: −2 DEX` : ''), fn: () => { equip(h, id, it.slot); then(); } });
    }
    choices.push({ label: 'Leave it', fn: () => then() });
    setEvent({ title: 'You found something', text: '', item: card, choices });
  }
  function learnChanceText() {
    const h = G.hero;
    return h.bg === 'aspirant' ? 'Aspirants always learn' : `INT check (DC 12, you have ${signed(mod(eff(h).int))})`;
  }
  // Tomes and scrolls: Aspirants always learn, others need an INT check. The item is used up.
  function learn(id) {
    const h = G.hero; const it = ITEMS[id];
    if (skillsOf(h).includes(it.teach)) { addLog(`You already know ${SKILLS[it.teach].name}.`); return true; }
    const ok = h.bg === 'aspirant' || check('int', 12, 0, 'learn').ok;
    if (ok) { h.learned.push(it.teach); addLog(`Learned ${SKILLS[it.teach].name}!`); } else addLog(`The ${it.name} crumbles before you understand it.`);
    return ok;
  }

  // ---------------- traps ----------------
  function trapDc(tier) { return [11, 11, 13, 15, 15][tier] || 13; }
  function trapRoom(r) {
    const t = TRAPS[r.trap];
    const spot = check('wis', trapDc(r.tier), gearSum(G.hero, 'spot'), 'spot trap');
    r.trapShown = true;
    if (!spot.ok) { springTrap(r.trap, r.tier, () => { r.cleared = true; next(); }); return; }
    setEvent({ title: `Trap: ${t.name}`, text: `You spot it just in time. ${spot.text}`,
      choices: [
        { label: 'Disarm it', sub: disarmText(r.tier), fn: () => disarm(r.trap, r.tier, () => { r.cleared = true; next(); }) },
        { label: 'Go around carefully', sub: 'Safe, but no XP', fn: () => { r.cleared = true; addLog('You edge around the trap.'); next(); } },
      ] });
  }
  function disarmStat() { const e = eff(G.hero); return e.dex >= e.int ? 'dex' : 'int'; }
  function lockBonus() { const h = G.hero; return (skillsOf(h).includes('picklock') ? 5 + 2 * (h.upg.picklock || 0) : 0) + gearSum(h, 'lockpick'); }
  function disarmText(tier) { const s = disarmStat(); const b = lockBonus(); return `${STAT_NAMES[s]} check, DC ${trapDc(tier)}${b ? ` (+${b} tools)` : ''}`; }
  function disarm(trapId, tier, then) {
    const c = check(disarmStat(), trapDc(tier), lockBonus(), 'disarm');
    if (c.ok) { gainXp(15); msg('Disarmed', `${c.text}\nThe trap clicks harmlessly.`, then); }
    else springTrap(trapId, tier, then, `${c.text}\nYou slip!`);
  }
  function springTrap(trapId, tier, then, pre = '') {
    const t = TRAPS[trapId];
    const save = check(t.save, 11 + tier, 0, 'save');
    let text = `${pre ? `${pre}\n` : ''}${t.text}\n${save.text}\n`;
    let dmg = roll(t.dmg);
    if (save.ok) dmg = Math.floor(dmg / 2);
    if (t.dark) { if (save.ok) text += 'You shield your lantern.'; else { G.hero.dark = true; text += 'Darkness! −2 to checks until you find a torch or a shrine.'; } }
    if (t.poison && !save.ok && !gearItems(G.hero).some((it) => it.antipoison)) { G.hero.poison = true; text += 'You are poisoned. '; }
    if (dmg) { hurt(dmg, t.name); text += `You take ${dmg} damage.`; }
    else if (!t.dark && !t.poison) text += 'You avoid it completely!';
    addLog(`${t.name}: ${dmg ? `−${dmg} HP` : 'avoided'}`);
    msg(t.name, text.trim(), then);
  }

  // ---------------- chests ----------------
  function chestEvent(r) {
    const t = r.tier;
    const lootThen = () => chestLoot(r);
    const leave = { label: 'Leave it', fn: () => { r.chestLeft = true; next(); } };
    if (r.chest === 'mimic' && !r.mimicChecked) {
      r.mimicChecked = true;
      const c = check('wis', 13, 0, 'notice');
      r.mimicSeen = c.ok;
    }
    if (r.chest === 'trapped' && !r.trapChecked) {
      r.trapChecked = true;
      r.trapSeen = check('wis', trapDc(t), gearSum(G.hero, 'spot'), 'spot trap').ok;
    }
    let text = 'An old chest, bound in iron.';
    const choices = [];
    if (r.chest === 'mimic') {
      if (r.mimicSeen) {
        text = 'The chest… is breathing. Its lid twitches.';
        choices.push({ label: 'Attack it first', fn: () => startCombat('mimic', { roomMonster: true, heroFirst: true }) });
      } else choices.push({ label: 'Open it', fn: () => { addLog('The chest has teeth!'); startCombat('mimic', { roomMonster: true, ambush: true }); } });
    } else if (r.chest === 'locked') {
      text = 'A heavy chest with a rusted lock.';
      choices.push({ label: 'Pick the lock', sub: `DEX check, DC 13${lockBonus() ? ` (+${lockBonus()} tools)` : ''}`, fn: () => {
        const c = check('dex', 13, lockBonus(), 'pick lock');
        if (c.ok) msg('Click!', `${c.text}\nThe lock opens.`, lootThen); else msg('Stuck', `${c.text}\nThe lock won't give.`, () => chestEvent(r));
      } });
      choices.push({ label: 'Smash it open', sub: 'STR check, DC 13. Potions inside may break.', fn: () => {
        const c = check('str', 13, 0, 'smash');
        if (c.ok) { r.smashed = true; msg('Crash!', `${c.text}\nThe lid splinters.`, lootThen); } else { hurt(d(4), 'a stubborn chest'); msg('Ow', `${c.text}\nYou hurt your hands.`, () => chestEvent(r)); }
      } });
    } else if (r.chest === 'trapped' && r.trapSeen) {
      text = 'A chest. There\'s a needle hidden in the lock.';
      choices.push({ label: 'Disarm the trap', sub: disarmText(t), fn: () => disarm(r.trap, t, lootThen) });
      choices.push({ label: 'Open it anyway', fn: () => springTrap(r.trap, t, lootThen) });
    } else if (r.chest === 'trapped') {
      choices.push({ label: 'Open it', fn: () => springTrap(r.trap, t, lootThen, 'Click…') });
    } else choices.push({ label: 'Open it', fn: lootThen });
    choices.push(leave);
    setEvent({ title: 'Treasure', text, choices });
  }
  function chestLoot(r) {
    r.chestOpened = true; r.cleared = true;
    const g = d(10) + r.tier * 8;
    gainGold(g);
    let id = randomItem(r.tier);
    if (r.smashed && ITEMS[id].slot === 'bag' && Math.random() < 0.5) { addLog(`The ${ITEMS[id].name} shattered.`); id = null; }
    if (Math.random() < 0.3) queue(() => lootEvent(randomItem(r.tier, ['potion', 'potion', 'antidote', 'torch', 'bomb', 'scrying'])));
    if (!alive()) return next();
    if (id) lootEvent(id); else msg('Treasure', `You find ${g} gold among the broken glass.`);
  }

  // ---------------- encounters ----------------
  function encounterEvent(r) {
    const e = ENCOUNTERS.find((x) => x.id === r.encounter);
    const h = G.hero;
    const choices = e.choices.map((c) => {
      let disabled = false, sub = '';
      if (c.needs === 'potion') { disabled = !h.bag.some((b) => b === 'potion' || b === 'bigpotion'); sub = disabled ? 'You have no potion' : 'Uses a potion'; }
      if (c.needs?.gold) { disabled = h.gold < c.needs.gold; sub = `You have ${h.gold} gold`; }
      if (c.check) sub = `${STAT_NAMES[c.check.stat]} check, DC ${c.check.dc}${sub ? ` · ${sub}` : ''}`;
      return { label: c.label, sub, disabled, fn: () => resolveChoice(r, e, c) };
    });
    setEvent({ title: e.title, text: e.text, choices });
  }
  function resolveChoice(r, e, c) {
    r.cleared = true;
    let ok = true, rollText = '';
    if (c.check) {
      const cc = check(c.check.stat, c.check.dc, c.check.lock ? lockBonus() : 0);
      ok = cc.ok; rollText = cc.text;
    }
    const effects = ok ? c.ok : (c.fail || []);
    const lines = [];
    let fight = null;
    for (const [k, v, w] of effects) {
      if (k === 'text') lines.push(v);
      else if (k === 'heal') heal(v);
      else if (k === 'hurt') hurt(roll(v), e.title);
      else if (k === 'hurtFlat') hurt(v, e.title);
      else if (k === 'gold') gainGold(v);
      else if (k === 'payGold') G.hero.gold = Math.max(0, G.hero.gold - v);
      else if (k === 'xp') gainXp(v);
      else if (k === 'maxhp') { G.hero.bonusHp += v; heal(v); lines.push(`Max HP +${v}.`); }
      else if (k === 'poison') { if (!gearItems(G.hero).some((it) => it.antipoison)) { G.hero.poison = true; lines.push('You are poisoned.'); } }
      else if (k === 'loseItem') { const i = G.hero.bag.findIndex((b) => b === 'potion' || b === 'bigpotion'); if (i >= 0) G.hero.bag.splice(i, 1); }
      else if (k === 'stat') {
        const s = v === 'random' ? pickOne(STATS) : v;
        G.hero.base[s] = Math.max(3, G.hero.base[s] + w);
        lines.push(`${STAT_NAMES[s]} ${signed(w)}.`);
      } else if (k === 'item') {
        const id = v === 'random' ? randomItem(r.tier) : v === 'randomRare' ? randomItem(3) : v === 'randomTome' ? pickOne(['scrollspark', 'scrollward', 'scrolllight', 'tomefrost', 'tomemend', 'tomesmite', 'tomefire']) : v === 'randomWeapon' ? pickOne(['greataxe', 'silversword', 'warhammer', 'venomblade', 'blackblade', 'crossbow']) : v;
        queue(() => lootEvent(id));
      } else if (k === 'teach') {
        const known = skillsOf(G.hero);
        const opts = SPELLS.filter((s) => !known.includes(s));
        if (opts.length) { const s = pickOne(opts); G.hero.learned.push(s); lines.push(`You learned ${SKILLS[s].name}!`); addLog(`Learned ${SKILLS[s].name}!`); }
        else { gainXp(20); lines.push('You already know all of it. (+20 XP)'); }
      } else if (k === 'reveal') {
        const path = pathBetween(lab.rooms, G.roomKey, lab.boss).slice(1, v + 1);
        for (const pk of path) { const pr = lab.rooms.get(pk); if (!pr.visited) pr.peek = true; }
        lines.push('(Part of the way is now marked on your map.)');
      } else if (k === 'fight') fight = v;
    }
    if (G.hero.hp <= 0) return die();
    addLog(`${e.title}: ${ok ? 'success' : 'failure'}`);
    msg(e.title, [rollText, ...lines].filter(Boolean).join('\n'), () => {
      if (fight) startCombat(fight, {}); else next();
    });
  }

  // ---------------- shrine & merchant ----------------
  function shrineEvent(r) {
    if (r.used) { r.cleared = true; return next(); }
    const h = G.hero;
    setEvent({ title: 'A Shrine', text: 'Candles burn before a worn saint. The air is warm here, for once.',
      choices: [
        { label: 'Kneel and pray', sub: 'Heal, cure poison and darkness, and lift curses', fn: () => {
          r.used = true; r.cleared = true;
          const n = heal(Math.max(8, Math.ceil(maxHp(h) / 2)));
          h.poison = false; h.dark = false;
          let lifted = 0;
          for (const s of GEAR_SLOTS) if (h.gear[s] && ITEMS[h.gear[s].id].rarity === 'cursed' && !h.gear[s].lifted) { h.gear[s].lifted = true; lifted++; }
          addLog('The shrine blesses you.');
          msg('Blessed', `You heal ${n} HP. Poison and darkness leave you.${lifted ? ' Your cursed items can now be taken off, and their curse is quiet.' : ''}`);
        } },
        { label: 'Move on', fn: () => { r.cleared = true; next(); } },
      ] });
  }
  function price(id) { return Math.max(5, Math.round(ITEMS[id].price * (1 - 0.08 * mod(eff(G.hero).cha)))); }
  function merchantEvent(r) {
    r.cleared = true;
    if (!r.wares) {
      r.wares = [pickOne(['potion', 'bigpotion']), pickOne(['potion', 'antidote', 'torch']), pickOne(['bomb', 'scrying', 'scrollspark', 'scrollward', 'scrolllight', 'tomefrost', 'tomemend']),
        randomItem(2), randomItem(3), pickOne(['satchel', 'pack', 'shield', 'leather', 'helm'])].filter((id) => ITEMS[id].rarity !== 'cursed');
    }
    const h = G.hero;
    setEvent({ title: 'The Bone Merchant', text: `"Coin for comfort, pilgrim. Everything has a price." You have ${h.gold} gold.`,
      choices: [
        ...r.wares.map((id, i) => ({ label: `${ITEMS[id].icon} ${ITEMS[id].name}`, sub: `${price(id)} gold · ${itemCard(id).text}`, color: RARITY_COLOR[ITEMS[id].rarity], disabled: h.gold < price(id), fn: () => {
          h.gold -= price(id);
          r.wares.splice(i, 1);
          addLog(`Bought ${ITEMS[id].name}.`);
          lootEvent(id, () => merchantEvent(r));
        } })),
        { label: 'Leave', fn: () => next() },
      ] });
  }

  // ---------------- combat ----------------
  function startCombat(mid, opts = {}) {
    const r = room();
    const M = MONSTERS[mid];
    const m = { id: mid, ...M, maxHp: M.hp, hp: opts.roomMonster && r.mHp ? r.mHp : M.hp };
    G.hero.cds = {};
    G.combat = { m, round: 1, turn: 'busy', ward: false, stun: 0, dazzle: 0, slow: 0, mPoison: 0, phase2: false, roomMonster: !!opts.roomMonster, log: [], dying: 0 };
    G.phase = 'combat';
    G.ev = null;
    clog(M.line);
    push();
    if (opts.ambush) { later(() => monsterTurn(), 900); return; }
    let heroFirst = !!opts.heroFirst;
    if (!heroFirst) {
      const a = d(20) + mod(eff(G.hero).dex), b = d(20) + (M.init || 0);
      heroFirst = a >= b;
      clog(heroFirst ? 'You move first.' : `The ${M.name} moves first!`);
    }
    if (heroFirst) { G.combat.turn = 'hero'; push(); } else later(() => monsterTurn(), 1100);
  }
  function clog(line) { if (!G.combat) return; G.combat.log.push(line); if (G.combat.log.length > 6) G.combat.log.shift(); addLog(line); }

  function heroAction(m) {
    const C = G.combat; const h = G.hero; const M = C.m;
    if (!C || C.turn !== 'hero') return;
    if (m.a === 'flee') return flee();
    if (m.a === 'item') {
      const id = h.bag[m.i]; const it = ITEMS[id];
      if (!it || !it.combat) return;
      h.bag.splice(m.i, 1);
      C.turn = 'busy';
      useConsumable(id, true);
      push();
      return later(afterHero, 700);
    }
    let sk = null;
    if (m.a === 'skill') {
      sk = m.skill;
      if (!skillsOf(h).includes(sk) || SKILLS[sk].kind !== 'attack' || (h.cds[sk] || 0) > 0) return;
      h.cds[sk] = skillCd(h, sk);
    } else if (m.a !== 'attack') return;
    C.turn = 'busy';
    G.anim.heroLunge = performance.now();
    const w = weapon(h);
    const e = eff(h);
    const pen = (h.poison ? -1 : 0) + (h.dark ? -2 : 0) + luck(h);
    const attack = ({ stat, hitBonus = 0, dmg, label, spell = false, holyMult = false }) => {
      const r = d(20);
      const mm = mod(e[stat]);
      const total = r + mm + hitBonus + pen + (spell ? spellBonus(h) : 0);
      const hit = r === 20 || (r !== 1 && total >= M.def);
      showRoll(`🎲 d20 (${r}) ${signed(mm)} ${STAT_NAMES[stat]}${hitBonus + pen + (spell ? spellBonus(h) : 0) ? ` ${signed(hitBonus + pen + (spell ? spellBonus(h) : 0))}` : ''} = ${total} vs ${M.def} · ${hit ? (r === 20 ? 'CRITICAL!' : 'Hit!') : 'Miss'}`, hit);
      if (!hit) { clog(`${label}: miss.`); return 0; }
      let n = dmg();
      if (r === 20) n *= 2;
      if (holyMult && M.undead) n *= 2;
      n = Math.max(1, n);
      damageMonster(n);
      clog(`${label}: ${n} damage${r === 20 ? ' (critical!)' : ''}.`);
      return n;
    };
    const weaponDmg = () => roll(w.dmg) + mod(e[w.stat]) + ((M.undead || (M.silverWeak && w === ITEMS.silversword)) ? (w.holy || 0) : 0);
    switch (sk) {
      case null:
        attack({ stat: w.stat, hitBonus: w.hit || 0, dmg: weaponDmg, label: 'You strike' });
        if (w === ITEMS.blackblade && !isLifted('blackblade')) { hurt(1, 'the Black Blade'); clog('The Black Blade drinks from you (−1).'); }
        break;
      case 'stab': attack({ stat: w.stat, hitBonus: (w.hit || 0) + 2, dmg: () => weaponDmg() + 4, label: 'Stab' }); break;
      case 'cleave': attack({ stat: w.stat, hitBonus: (w.hit || 0) - 1, dmg: () => weaponDmg() + 6, label: 'Cleave' }); break;
      case 'aimed': attack({ stat: w.stat, hitBonus: (w.hit || 0) + 4, dmg: () => weaponDmg() + 3, label: 'Aimed Shot' }); break;
      case 'venom': if (attack({ stat: 'dex', hitBonus: w.hit || 0, dmg: weaponDmg, label: 'Venom' })) { C.mPoison = 3; clog('Poisoned!'); } break;
      case 'shieldbash': if (attack({ stat: 'str', dmg: () => d(4) + mod(e.str), label: 'Shield Bash' })) { C.stun = 1; clog(`The ${M.name} is stunned!`); } break;
      case 'spark': attack({ stat: 'int', spell: true, dmg: () => d(6) + mod(e.int), label: 'Spark' }); break;
      case 'fireball': attack({ stat: 'int', spell: true, dmg: () => roll([2, 6, 0]) + mod(e.int), label: 'Fireball' }); break;
      case 'frostbolt': if (attack({ stat: 'int', spell: true, dmg: () => d(8) + mod(e.int), label: 'Frost Bolt' })) { C.slow = 2; clog('Slowed!'); } break;
      case 'drain': { const n = attack({ stat: 'int', spell: true, dmg: () => d(6) + mod(e.int), label: 'Blood Drain' }); if (n) heal(Math.ceil(n / 2)); break; }
      case 'smite': attack({ stat: 'wis', dmg: () => d(8) + mod(e.wis), label: 'Smite', holyMult: true }); break;
      case 'ward': C.ward = true; clog('A ward of light surrounds you.'); showRoll('✨ Ward: the next hit is blocked', true); break;
      case 'light': C.dazzle = 2; clog(`Light! The ${M.name} is dazzled (−4 to hit).`); showRoll('✨ Light: −4 to its hits for 2 rounds', true); break;
      case 'mend': { const n = heal(Math.max(1, d(8) + mod(e.wis))); clog(`Mend: +${n} HP.`); showRoll(`✨ Mend: +${n} HP`, true); break; }
      default: break;
    }
    push();
    later(afterHero, 900);
  }
  function damageMonster(n) {
    const C = G.combat;
    C.m.hp = Math.max(0, C.m.hp - n);
    floater('foe', `−${n}`, 'dmg');
    G.anim.foeFlash = performance.now();
    if (C.roomMonster) room().mHp = C.m.hp;
  }
  function afterHero() {
    const C = G.combat;
    if (!C) return;
    if (!alive()) return die();
    if (C.m.hp <= 0) return winFight();
    later(monsterTurn, 350);
  }
  function monsterTurn() {
    const C = G.combat; if (!C) return;
    const h = G.hero; const M = C.m;
    C.turn = 'monster';
    if (M.boss && !C.phase2 && M.hp <= M.maxHp / 2) {
      C.phase2 = true;
      clog('The Warden\'s lantern flares! It fights in a fury.');
      banner('THE LANTERN FLARES', 'The Warden fights in a fury');
    }
    if (C.stun > 0) {
      C.stun--; clog(`The ${M.name} is stunned and can't act.`);
      push(); return later(endRound, 700);
    }
    G.anim.foeLunge = performance.now();
    const r = d(20);
    const hitB = M.hit + (C.phase2 ? 1 : 0) - (C.dazzle > 0 ? 4 : 0) - (C.slow > 0 ? 2 : 0);
    const def = defense(h);
    const total = r + hitB;
    const hits = r === 20 || (r !== 1 && total >= def);
    showRoll(`${M.name}: d20 (${r}) ${signed(hitB)} = ${total} vs your defense ${def} · ${hits ? 'Hit' : 'Miss'}`, !hits);
    let didHit = false;
    if (!hits) clog(`The ${M.name} misses.`);
    else if (C.ward) { C.ward = false; clog('Your ward blocks the blow!'); }
    else {
      const dice = C.phase2 ? [2, 6, 3] : M.dmg;
      let n = roll(dice);
      if (r === 20) n += d(dice[1]); // a monster critical adds one more die
      hurt(n, `a ${M.name}`);
      clog(`The ${M.name} hits you for ${n}${r === 20 ? ' (critical!)' : ''}.`);
      didHit = true;
      if (M.drain) { const back = Math.ceil(n / 2); M.hp = Math.min(M.maxHp, M.hp + back); clog(`It drinks your warmth (+${back}).`); }
      if (M.poison && Math.random() < M.poison && !gearItems(h).some((it) => it.antipoison) && !h.poison) { h.poison = true; clog('You are poisoned!'); }
    }
    if (C.phase2 && C.round % 3 === 0) { const n = d(6); hurt(n, 'the Warden\'s lantern'); clog(`The lantern burns you (−${n}).`); }
    push();
    if (!alive()) return later(die, 900);
    if (didHit && skillsOf(h).includes('riposte') && !(h.cds.riposte > 0)) {
      // Reaction: the phone asks "Riposte?" for a few seconds
      C.turn = 'reaction';
      C.reactionUntil = Date.now() + 5000;
      push();
      C.reactionTimer = later(() => resolveReaction(false), 5200);
      return;
    }
    later(endRound, 700);
  }
  function resolveReaction(use) {
    const C = G.combat; if (!C || C.turn !== 'reaction') return;
    clearTimeout(C.reactionTimer); timers.delete(C.reactionTimer);
    C.turn = 'busy';
    if (use) {
      const h = G.hero; const w = weapon(h); const e = eff(h); const M = C.m;
      h.cds.riposte = skillCd(h, 'riposte');
      G.anim.heroLunge = performance.now();
      const r = d(20); const total = r + mod(e[w.stat]) + (w.hit || 0) + luck(h);
      const hit = r === 20 || (r !== 1 && total >= M.def);
      showRoll(`Riposte: d20 (${r}) ${signed(mod(e[w.stat]) + (w.hit || 0) + luck(h))} = ${total} vs ${M.def} · ${hit ? 'Hit!' : 'Miss'}`, hit);
      if (hit) { const n = Math.max(1, roll(w.dmg) + mod(e[w.stat])); damageMonster(n); clog(`Riposte! ${n} damage.`); } else clog('Riposte: miss.');
      push();
      if (M.hp <= 0) return later(winFight, 800);
    }
    later(endRound, 700);
  }
  function endRound() {
    const C = G.combat; if (!C) return;
    const h = G.hero; const M = C.m;
    if (C.mPoison > 0) { C.mPoison--; damageMonster(2); clog(`Poison eats at the ${M.name} (−2).`); if (M.hp <= 0) return winFight(); }
    if (M.regen && M.hp > 0 && M.hp < M.maxHp) { M.hp = Math.min(M.maxHp, M.hp + M.regen); clog(`The ${M.name}'s wounds close (+${M.regen}).`); }
    for (const k of Object.keys(h.cds)) if (h.cds[k] > 0) h.cds[k]--;
    if (C.dazzle > 0) C.dazzle--;
    if (C.slow > 0) C.slow--;
    C.round++;
    C.turn = 'hero';
    push();
  }
  function flee() {
    const C = G.combat; const h = G.hero; const M = C.m;
    C.turn = 'busy';
    const dc = M.boss ? 18 : 9 + 2 * M.tier;
    const c = check('dex', dc, gearSum(h, 'flee'), 'flee');
    if (c.ok && G.prevKey) {
      clog('You flee!');
      const back = Object.keys(DIRS).find((dir) => { const n = neighbor(room(), dir); return n && n.key === G.prevKey && room().doors[dir]; });
      G.combat = null;
      push();
      later(() => startWalk(back || G.cameFrom, true), 600);
    } else {
      clog(c.ok ? 'There is nowhere to run!' : 'You stumble! It gets a free attack.');
      push();
      later(monsterTurn, 800);
    }
  }
  function winFight() {
    const C = G.combat; const M = C.m;
    C.turn = 'over'; C.dying = performance.now();
    G.stats.kills++;
    clog(`The ${M.name} falls.`);
    if (C.roomMonster) { room().cleared = true; if (room().type === 'treasure') { room().chestOpened = true; } }
    push();
    later(() => {
      G.combat = null;
      if (M.boss) return victoryGate();
      gainXp(M.xp);
      const g = M.gold[0] + Math.floor(Math.random() * (M.gold[1] - M.gold[0] + 1));
      gainGold(g);
      const chance = { 1: 0.25, 2: 0.45, 3: 0.75 }[M.tier] || 0;
      if (M.id === 'mimic' || Math.random() < chance) queue(() => lootEvent(randomItem(M.tier + (M.id === 'mimic' ? 1 : 0))));
      msg('Victory', `The ${M.name} is dead.${g ? ` You find ${g} gold.` : ''} (+${M.xp} XP)`);
    }, 1200);
  }
  function victoryGate() {
    banner('THE WARDEN FALLS', 'The Black Gate groans open');
    setEvent({ title: 'The Black Gate', text: 'The Warden\'s lantern rolls across the floor and goes out. Beyond the Gate, for the first time, you feel wind.',
      choices: [{ label: 'Step through the Black Gate', fn: () => { G.phase = 'won'; G.ev = null; push(); } }] });
  }
  function die() {
    if (G.phase === 'dead') return;
    G.phase = 'dead';
    G.ev = null;
    G.combat = null;
    addLog(`${G.hero.name} has died.`);
    push();
  }

  // ---------------- using items outside the shop ----------------
  function useConsumable(id, inCombat) {
    const h = G.hero; const it = ITEMS[id];
    if (it.heal) {
      const n = heal(roll(it.heal));
      addLog(`${it.name}: +${n} HP.`);
      if (it.poisonChance && Math.random() < it.poisonChance && !gearItems(h).some((g) => g.antipoison)) { h.poison = true; addLog('The black water poisons you!'); }
    }
    if (it.cure === 'poison') { h.poison = false; addLog('The poison fades.'); }
    if (it.cure === 'dark') { h.dark = false; addLog('Light returns.'); }
    if (it.bomb && inCombat && G.combat) { const n = roll(it.bomb); damageMonster(n); clog(`BOOM! ${n} damage.`); G.anim.shake = performance.now(); }
    if (inCombat) clog(`You use ${it.name}.`);
  }
  function exploreInput(m) {
    const h = G.hero;
    if (m.a === 'door' && DIRS[m.dir]) return startWalk(m.dir);
    if (m.a === 'pray' && DIRS[m.dir] && skillsOf(h).includes('prayer')) return peekDoor(m.dir, 'prayer');
    if (m.a === 'use') {
      const id = h.bag[m.i]; const it = ITEMS[id];
      if (!it) return;
      if (it.peek) { if (!DIRS[m.dir] || !room().doors[m.dir]) return; h.bag.splice(m.i, 1); peekDoor(m.dir, 'scry'); return; }
      if (it.teach) { h.bag.splice(m.i, 1); learn(id); push(); return; }
      if (!it.explore) return;
      h.bag.splice(m.i, 1);
      useConsumable(id, false);
      push();
      return;
    }
    if (m.a === 'drop') { if (h.bag[m.i]) { addLog(`Dropped ${ITEMS[h.bag[m.i]].name}.`); h.bag.splice(m.i, 1); push(); } return; }
    if (m.a === 'unequip' && GEAR_SLOTS.includes(m.slot) && h.gear[m.slot]) {
      if (stuck(h, m.slot)) { addLog(`The ${ITEMS[h.gear[m.slot].id].name} is cursed and won't come off.`); push(); return; }
      addLog(`You leave the ${ITEMS[h.gear[m.slot].id].name} behind.`);
      h.gear[m.slot] = null;
      h.hp = Math.min(h.hp, maxHp(h));
      push();
    }
  }

  // ---------------- TV overlays ----------------
  let bannerUntil = 0;
  function banner(title, sub = '', ms = 3500) {
    bannerEl.innerHTML = `<b>${escapeHtml(title)}</b>${sub ? `<span>${escapeHtml(sub)}</span>` : ''}`;
    bannerEl.classList.add('show');
    bannerUntil = performance.now() + ms;
  }
  let rollTimer = 0;
  function showRoll(text, good) {
    G.lastRoll = { text, good, at: Date.now() };
    rollEl.textContent = text;
    rollEl.className = `dv-roll show ${good ? 'good' : 'bad'}`;
    clearTimeout(rollTimer);
    rollTimer = setTimeout(() => rollEl.classList.remove('show'), 4500);
  }
  function floater(who, text, cls) {
    const el = document.createElement('div');
    el.className = `dv-float ${cls}`;
    el.textContent = text;
    el.style.left = `${((who === 'hero' ? HERO_X : FOE_X) / W) * 100 + (Math.random() * 4 - 2)}%`;
    el.style.top = `${(who === 'hero' ? 150 : 140) / H * 100}%`;
    floatsEl.appendChild(el);
    setTimeout(() => el.remove(), 1700);
  }

  function renderOverlay() {
    const h = G.hero;
    // story / event text
    const ev = G.ev;
    if (G.phase === 'event' && ev) {
      storyEl.innerHTML = `${ev.item ? `<div class="dv-item" style="color:${ev.item.color}">${ev.item.icon} ${escapeHtml(ev.item.name)}</div><p>${escapeHtml(ev.item.text)}</p>` : ''}${ev.text ? `<p>${escapeHtml(ev.text).replace(/\n/g, '<br>')}</p>` : ''}<p class="dv-hint">Choose on your phone</p>`;
      storyEl.classList.add('show');
      if (performance.now() > bannerUntil) banner(ev.title, '', 0);
    } else storyEl.classList.remove('show');
    if (G.phase === 'combat' && G.combat && performance.now() > bannerUntil) banner(G.combat.m.name.toUpperCase(), MONSTERS[G.combat.m.id].line, 0);
    if ((G.phase === 'explore' || G.phase === 'walk') && performance.now() > bannerUntil) {
      const r = room();
      if (r.type === 'entrance') banner('THE ENTRANCE', 'Choose a door on your phone', 0);
      else bannerEl.classList.remove('show');
    }
    if (['create', 'intro', 'dead', 'won'].includes(G.phase)) { bannerEl.classList.remove('show'); bannerUntil = 0; }
    {
    }
    // log
    const lines = (G.phase === 'combat' && G.combat ? G.combat.log : G.log).slice(-3);
    logEl.innerHTML = lines.map((l) => `<div>${escapeHtml(l)}</div>`).join('');
    logEl.classList.toggle('show', !!lines.length && !['create', 'dead', 'won'].includes(G.phase) && G.phase !== 'event');
    // door letters
    const r = room();
    if (G.phase === 'explore') {
      doorsEl.innerHTML = Object.entries(r.doors).filter(([, open]) => open).map(([dir]) => {
        const n = neighbor(r, dir);
        const x = dir === 's' ? ARCH_X.n : ARCH_X[dir];
        const tag = n.visited ? '' : n.peek ? ` · ${ROOM_LABEL[n.type]}` : ' · ?';
        return `<span class="dv-door ${dir}" style="left:${(x / W) * 100}%">${DIRS[dir].name}${escapeHtml(tag)}</span>`;
      }).join('');
      doorsEl.classList.add('show');
    } else doorsEl.classList.remove('show');
    // status
    if (h && G.phase !== 'create') {
      const mh = maxHp(h);
      const next = h.level < MAX_LEVEL ? XP_LEVELS[h.level] : null;
      statusEl.innerHTML = `<b>${escapeHtml(h.name)}</b><small>${BACKGROUNDS[h.bg].name} · Lv ${h.level}</small>
        <div class="dv-bar"><i style="width:${(h.hp / mh) * 100}%"></i></div><small>HP ${h.hp} / ${mh}</small>
        <div class="dv-bar xp"><i style="width:${next ? Math.min(100, (h.xp / next) * 100) : 100}%"></i></div>
        <small>💰 ${h.gold}${h.poison ? ' · ☠ poisoned' : ''}${h.dark ? ' · 🌑 dark' : ''}</small>`;
      statusEl.classList.add('show');
    } else statusEl.classList.remove('show');
    // centre panels: creation, death, victory
    if (G.phase === 'create') {
      const c = G.create;
      if (c.step === 'pick') centerEl.innerHTML = `<h1>DELVE THE BLACK LABYRINTH</h1><p>${escapeHtml(player.name)}, choose your background on your phone.</p>`;
      else {
        const e = eff(h);
        centerEl.innerHTML = `<h1>${escapeHtml(h.name)} the ${BACKGROUNDS[h.bg].name}</h1>
          <div class="dv-stats">${STATS.map((s) => `<span>${STAT_NAMES[s]}<b>${e[s]}</b></span>`).join('')}</div>
          <p>HP ${maxHp(h)} · ${h.rerolls ? 'One re-roll left' : 'No re-rolls left'}</p>`;
      }
      centerEl.className = 'dv-center show top';
    } else if (G.phase === 'intro') {
      centerEl.innerHTML = '<h1>DELVE THE BLACK LABYRINTH</h1><p>Find the Black Gate. Defeat its Warden. Do not die.</p>';
      centerEl.className = 'dv-center show top';
    } else if (G.phase === 'dead' || G.phase === 'won') {
      const won = G.phase === 'won';
      const explored = [...lab.rooms.values()].filter((x) => x.visited).length;
      centerEl.innerHTML = `<h1 class="${won ? 'won' : 'lost'}">${won ? 'YOU ESCAPED' : 'YOU DIED'}</h1>
        <p>${escapeHtml(h.name)} the ${BACKGROUNDS[h.bg].name} · Level ${h.level}</p>
        <div class="dv-sum">
          <span>Rooms explored<b>${explored} / ${lab.rooms.size}</b></span>
          <span>Monsters slain<b>${G.stats.kills}</b></span>
          <span>Gold found<b>${G.stats.gold}</b></span>
          ${won ? '' : `<span>Slain by<b>${escapeHtml(G.stats.cause)}</b></span>`}
        </div>
        <p class="dv-hint">Play again or return to the menu on your phone</p>`;
      centerEl.className = 'dv-center show full';
    } else centerEl.className = 'dv-center';
  }

  // ---------------- phone state ----------------
  function phoneState() {
    const h = G.hero;
    const out = { phase: G.phase, log: G.log.slice(-4), roll: G.lastRoll };
    if (G.phase === 'create') {
      out.create = { step: G.create.step, bgs: BG_ORDER.map((id) => ({ id, name: BACKGROUNDS[id].name, lean: BACKGROUNDS[id].lean.map((s) => STAT_NAMES[s]).join(' · '),
        gear: Object.values(BACKGROUNDS[id].gear).map((g) => ITEMS[g].name).join(', '), skill: BACKGROUNDS[id].skill === 'spell' ? '1 starting spell' : SKILLS[BACKGROUNDS[id].skill].name,
        skillDesc: BACKGROUNDS[id].skill === 'spell' ? 'Pick Spark, Ward or Light.' : SKILLS[BACKGROUNDS[id].skill].desc, blurb: BACKGROUNDS[id].blurb })) };
      if (h) out.create.spells = h.bg === 'aspirant' ? ASPIRANT_SPELLS.map((s) => ({ id: s, name: SKILLS[s].name, desc: SKILLS[s].desc, on: h.learned.includes(s) })) : null;
    }
    if (h) {
      const e = eff(h);
      const mh = maxHp(h);
      out.hero = {
        name: h.name, bg: h.bg, bgName: BACKGROUNDS[h.bg].name, level: h.level, xp: h.xp, xpNext: h.level < MAX_LEVEL ? XP_LEVELS[h.level] : null,
        hp: h.hp, maxHp: mh, gold: h.gold, poison: h.poison, dark: h.dark, rerolls: h.rerolls, def: defense(h),
        stats: STATS.map((s) => ({ id: s, name: STAT_NAMES[s], v: e[s], base: h.base[s], mod: mod(e[s]) })),
        gear: GEAR_SLOTS.map((s) => ({ slot: s, name: SLOT_NAMES[s], item: h.gear[s] ? { ...itemCard(h.gear[s].id), stuck: stuck(h, s) } : null })),
        bag: h.bag.map((id, i) => ({ i, ...itemCard(id), combat: !!ITEMS[id].combat, explore: !!(ITEMS[id].explore), peek: !!ITEMS[id].peek, teach: !!ITEMS[id].teach })),
        bagCap: bagCap(h),
        heavy: gearItems(h).some((it) => it.heavy && it.heavy > h.base.str + gearItems(h).reduce((a, it2) => a + ((it2.bonus || {}).str || 0), 0)),
        skills: skillsOf(h).map((s) => ({ id: s, name: SKILLS[s].name, kind: SKILLS[s].kind, desc: SKILLS[s].desc, cd: SKILLS[s].cd ? skillCd(h, s) : 0, left: h.cds[s] || 0 })),
      };
    }
    if (G.phase === 'explore' || G.phase === 'walk') {
      const r = room();
      out.room = {
        label: ROOM_LABEL[r.type] || 'Room', hint: r.hint || '',
        doors: Object.fromEntries(Object.keys(DIRS).map((dir) => {
          if (!r.doors[dir]) return [dir, null];
          const n = neighbor(r, dir);
          return [dir, { came: n.key === G.prevKey, visited: n.visited, known: n.visited || n.peek ? ROOM_LABEL[n.type] : '', prayLocked: !!r.prayLock?.[dir] }];
        })),
        canPray: !!h && skillsOf(h).includes('prayer'),
      };
    }
    if (G.phase === 'event' && G.ev) {
      out.ev = { title: G.ev.title, text: G.ev.text, item: G.ev.item || null, levelup: !!G.ev.levelup,
        choices: G.ev.choices.map((c) => ({ label: c.label, sub: c.sub || '', disabled: !!c.disabled, color: c.color || '' })) };
    }
    if (G.phase === 'combat' && G.combat) {
      const C = G.combat;
      out.combat = { mId: C.m.id, sprite: C.m.sprite, name: C.m.name, hp: C.m.hp, maxHp: C.m.maxHp, turn: C.turn, round: C.round, log: C.log.slice(-4),
        reactionUntil: C.turn === 'reaction' ? C.reactionUntil : 0, boss: !!C.m.boss,
        effects: [C.stun ? 'stunned' : '', C.dazzle ? 'dazzled' : '', C.slow ? 'slowed' : '', C.mPoison ? 'poisoned' : '', C.ward ? 'you: warded' : ''].filter(Boolean) };
    }
    if (G.phase === 'dead' || G.phase === 'won') out.over = { won: G.phase === 'won' };
    return out;
  }
  function push() {
    renderOverlay();
    setPhoneState(phoneState());
  }

  // ---------------- drawing ----------------
  function mapInfo() {
    const cells = []; const doors = [];
    const known = (r) => r.visited || r.peek;
    for (const r of lab.rooms.values()) {
      const adjVisited = Object.keys(DIRS).some((dir) => r.doors[dir] && neighbor(r, dir)?.visited);
      if (r.key === G.roomKey) cells.push({ x: r.x, y: r.y, state: 'here' });
      else if (r.visited) cells.push({ x: r.x, y: r.y, state: 'visited', icon: roomIcon(r) });
      else if (r.peek) cells.push({ x: r.x, y: r.y, state: 'peeked', icon: roomIcon(r, true) });
      else if (adjVisited) cells.push({ x: r.x, y: r.y, state: 'unknown' });
      for (const dir of ['e', 's']) {
        if (!r.doors[dir]) continue;
        const n = neighbor(r, dir);
        if (r.visited || n.visited) doors.push([r, n, !(r.visited && n.visited)]);
        else if (known(r) && known(n)) doors.push([r, n, true]);
      }
    }
    return { cells, doors, heroId: G.hero ? G.hero.bg : 'deserter' };
  }
  function roomIcon(r, peek = false) {
    if (r.type === 'entrance') return 'entrance';
    if (r.type === 'boss') return 'boss';
    if (r.type === 'monster') return r.cleared && !peek ? 'skull' : 'monster';
    if (r.type === 'treasure') return 'chest';
    return { trap: 'trap', encounter: 'encounter', shrine: 'shrine', merchant: 'merchant' }[r.type] || 'empty';
  }

  const ease = (k) => Math.max(0, Math.min(1, k));
  function buildView(now) {
    const r = room();
    const h = G.hero;
    const v = { room: r, dark: h?.dark, props: [], fade: 0 };
    // the hero
    if (h) {
      const hero = { id: h.bg, x: HERO_X, feet: FEET, alpha: 1 };
      if (G.anim.heroLunge && now - G.anim.heroLunge < 320) hero.x += Math.sin(((now - G.anim.heroLunge) / 320) * Math.PI) * 20;
      if (G.anim.heroFlash && now - G.anim.heroFlash < 260) hero.flash = 0.8;
      if (G.phase === 'intro') { const k = ease((now - G.introAt) / 1400); hero.x = -30 + (HERO_X + 30) * k; v.fade = 1 - ease((now - G.introAt) / 900); }
      if (G.walk) {
        const w = G.walk;
        if (w.stage !== 'in') {
          const k = ease((now - w.t0) / 750);
          if (w.dir === 'w') hero.x = HERO_X - (HERO_X - ARCH_X.w) * k * 1.2;
          else if (w.dir === 'e') hero.x = HERO_X + (ARCH_X.e - HERO_X) * k;
          else if (w.dir === 'n') { hero.x = HERO_X + (ARCH_X.n - HERO_X) * k; hero.feet = FEET - 50 * k; }
          else hero.feet = FEET + 50 * k;
          v.fade = ease((k - 0.55) / 0.45);
        } else {
          const k = ease((now - w.t1) / 650);
          hero.x = -20 + (HERO_X + 20) * k;
          v.fade = 1 - k;
        }
      }
      if (G.phase === 'dead') hero.dead = true;
      v.hero = hero;
    }
    // what's in the room
    const C = G.combat;
    if (C) {
      const M = C.m;
      const foe = { id: M.sprite, x: FOE_X, feet: FEET, scale: 3, flip: !['werewolf', 'maiden', 'warden', 'rats', 'wisp', 'hollow', 'wraith', 'hag', 'mimic'].includes(M.sprite) };
      if (M.sprite === 'hound') foe.flip = true;
      if (M.sprite === 'wisp' || M.sprite === 'wraith') foe.dy = Math.round(Math.sin(now / 300) * 3) - 8;
      if (G.anim.foeLunge && now - G.anim.foeLunge < 320) foe.x -= Math.sin(((now - G.anim.foeLunge) / 320) * Math.PI) * 22;
      if (G.anim.foeFlash && now - G.anim.foeFlash < 260) foe.flash = 0.85;
      if (C.dying) { const k = ease((now - C.dying) / 1000); foe.alpha = 1 - k; foe.dy = (foe.dy || 0) + k * 10; }
      v.foe = foe;
    } else if (r.type === 'boss' && !r.cleared && G.phase !== 'won') v.foe = { id: 'warden', x: FOE_X, feet: FEET, scale: 3, flip: false };
    else if (r.type === 'treasure' && !(r.chest === 'mimic' && r.cleared && !r.chestOpened)) v.props.push({ id: r.chestOpened ? 'chestopen' : 'chest', x: 232, feet: 238, scale: 3 });
    else if (r.type === 'encounter') {
      const a = ENC_ART[r.encounter];
      if (a?.extra) v.props.push({ ...a.extra, scale: 3 });
      if (a?.id) v.props.push({ id: a.id, x: a.x, feet: a.feet || FEET, scale: 3 });
      if (a?.pool) v.pool = true;
      if (a?.door) v.door = true;
    } else if (r.type === 'shrine') v.props.push({ id: 'altar', x: 236, feet: 236, scale: 3 });
    else if (r.type === 'merchant') v.props.push({ id: 'merchant', x: 240, feet: FEET, scale: 3 });
    if (r.type === 'trap' && r.trapShown) v.props.push({ id: 'spikes', x: 236, feet: 246, scale: 2 });
    if (G.anim.shake && now - G.anim.shake < 220) v.shake = 4;
    return v;
  }
  function drawExtras(v) {
    if (v.pool) {
      ctx.fillStyle = '#07060a';
      ctx.beginPath(); ctx.ellipse(238, 224, 52, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(120,150,190,.18)'; ctx.fillRect(214, 220, 30, 1); ctx.fillRect(240, 226, 20, 1);
    }
    if (v.door) {
      ctx.fillStyle = '#2b2e33'; ctx.fillRect(220, 120, 36, 56);
      ctx.fillStyle = '#3a3e46'; ctx.fillRect(222, 122, 32, 52);
      ctx.fillStyle = '#6b3a1e'; for (let i = 0; i < 6; i++) ctx.fillRect(224 + i * 5, 130 + (i % 3) * 6, 1, 30 + (i % 2) * 12);
      ctx.fillStyle = '#0b090d'; ctx.fillRect(236, 146, 4, 6);
    }
  }

  let raf = 0;
  const titleRoom = { key: 'title', seed: 7, type: 'entrance', doors: { n: true, e: true, w: true, s: false } };
  function frame(now) {
    if (bannerUntil && now > bannerUntil && bannerEl.classList.contains('show')) { bannerUntil = 0; renderOverlay(); }
    if (G.phase === 'create') {
      drawTitle(ctx, now, titleRoom, BG_ORDER, G.create.bg);
    } else {
      const v = buildView(now);
      drawStage(ctx, now, v);
      if (v.pool || v.door) drawExtras(v);
    }
    drawMap(ctx, now, G.phase === 'create' ? { cells: [], doors: [], heroId: G.create.bg || 'deserter' } : mapInfo());
    raf = requestAnimationFrame(frame);
  }

  push();
  raf = requestAnimationFrame(frame);
  // Test hook for laptop testing only: open the TV page with #delve-debug in the address.
  if (location.hash === '#delve-debug') window.delveDebug = { G, lab, push, enterRoom, gainXp, lootEvent, setRoom: (k) => { G.prevKey = G.roomKey; G.roomKey = k; enterRoom(); } };

  return {
    handleInput(id, m) {
      if (id !== player.id || !m || typeof m.a !== 'string') return;
      if (m.a === 'menu' && (G.phase === 'dead' || G.phase === 'won')) return onExit('menu');
      if (m.a === 'again' && (G.phase === 'dead' || G.phase === 'won')) return onExit('again');
      if (G.phase === 'create') return createInput(m);
      if (G.phase === 'event' && G.ev) {
        if (m.a === 'choice') { const c = G.ev.choices[m.i]; if (c && !c.disabled) c.fn(); return; }
        if (m.a === 'use' || m.a === 'drop') { exploreInput(m); return; }
        return;
      }
      if (G.phase === 'combat') {
        if (m.a === 'react') return resolveReaction(!!m.use);
        return heroAction(m);
      }
      if (G.phase === 'explore') return exploreInput(m);
    },
    stop() {
      cancelAnimationFrame(raf);
      for (const t of timers) clearTimeout(t);
      timers.clear();
      clearTimeout(rollTimer);
      window.removeEventListener('resize', resize);
    },
  };
}

function loadCss() {
  if (document.querySelector('link[data-delve]')) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = new URL('../../../css/delve.css', import.meta.url).href;
  l.dataset.delve = '1';
  document.head.appendChild(l);
}
