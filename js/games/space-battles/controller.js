// Space Battles – phone side. Team select, fleet building, My Fleet, the movement
// planner (with a mini-map and ghost path), the fire planner and Surrender.
// Plans stay on this phone until Ready is tapped; the TV checks every choice.
import { escapeHtml } from '../../supabase.js';
import {
  FACTIONS, FACTION_ORDER, CLASSES, WEAPONS, ZONES, ARCS, ARC_DEFS, ZONE_NAMES, RANGE_BANDS, SHIPS, FLEET,
  STANCES, CRITICALS, SQUADRONS, SQUADRON_ROLES, SQUADRON, SQUAD_ORDERS, SQUAD_ORDER_LIST,
  HIT, SPECIALS, CAPTAINS, CRIT_POOL, UPGRADES, MISSILE,
} from './data.js';
import {
  classOf, shipDef, corners, speedOptions, maxClicks, segmentClicks, defaultMovePlan, planWaypoints, pathHazard,
  weaponTargets, weaponUsedUp, defaultFirePlan, arcWeapons, factionShipTypes, pointShare, fleetCost, buyProblem,
  stanceOptions, shipStances, maxSpeed, isSquad, squadDef, unitName, endTurnClicks, weaponOffline, boostCap,
  carrierSlots, isCarrier, squadBuyProblem, critCount, shipPower, planPower, weaponPower,
  carrierSquadTypes, squadOrderAllowed, specialLeft, holdTargets, accuracyOf, packBonus, upgradeChoices, upgradeProblem, missilesLeft,
  captainOf, captainChoices, captainProblem, canAddWild, maxHull, stanceOf, sanitizeRotate, rotatedShip, sanitizeFirePlan,
} from './rules.js';
import { faceImg } from './portraits.js';

// Captain's face + name, as HTML (empty without a captain).
const captainHtml = (u) => { const c = captainOf(u); return c ? `${faceImg(u.captain, 22)} ${escapeHtml(c.name)}` : ''; };

const BAND_INDEX = Object.fromEntries(RANGE_BANDS.map((b, i) => [b.id, i]));
// "Reach ●●○" style dots for a weapon (filled up to its reach).
const reachDots = (reach) => RANGE_BANDS.map((b, i) => (i <= BAND_INDEX[reach] ? '●' : '○')).join('');
// Keyword tags for a weapon (Ion, Acid, Once…).
function weaponTags(wd) {
  const t = [];
  if (wd.pd) t.push('PD');
  if (wd.once) t.push('Once');
  if (wd.critOn) t.push(`Crits ${wd.critOn}+`);
  if (wd.ignoreShields) t.push('Ignores shields');
  const fx = { ion: 'Ion', acid: 'Acid', grapple: 'Grapple', disrupt: 'Disrupt', board: 'Boarding', crit: 'Causes a crit' }[wd.effect];
  if (fx) t.push(fx);
  return t;
}
const dmgText = (wd, shots) => `${wd.effect === 'ion' ? '⛨' : wd.effect === 'crit' ? '💥' : wd.damage}×${shots}`;

const BAND_NAMES = Object.fromEntries(RANGE_BANDS.map((b) => [b.id, b.name]));
const VIEW_W = 18, VIEW_H = 12; // mini-map window, in units

// Vibrate only after the player has touched the page (browsers block it otherwise).
function buzz(ms) {
  if (navigator.vibrate && navigator.userActivation?.hasBeenActive) navigator.vibrate(ms);
}

export function mount({ container, me, sendInput }) {
  container.innerHTML = '<div class="sbp"></div>';
  const root = container.firstElementChild;
  let state = null;
  let meNow = me;
  let draftKey = null;
  let moveDraft = {}; // shipId -> { speed, clicks }
  let fireDraft = {}; // shipId -> { [arc]: { [weaponIndex]: targetId } } (left out = hold fire)
  let repairDraft = {}; // shipId -> Damage Control choice { kind, zones? } (none = default)
  let holdDraft = {}; // shipId -> Smuggler's Hold choice { target, kind } (none = not used)
  let critDraft = {}; // shipId -> critical system id (Seir-Seir; none = random)
  let fiveDraft = {}; // shipId -> "arc:index" that fires twice (Flerf's Five Arms; none = strongest)
  let rotateDraft = {}; // shipId -> clicks the ship turns before shooting (Kairos; none = 0)
  let selShip = null;
  let selSeg = 0;
  let selRow = 0;
  let notice = '';
  let deadline = 0;
  let lastPhase = null;
  let openShip = null; // fleet building: ship type whose details are expanded
  let confirmSurrender = false; // first Surrender tap asks "are you sure?"
  // Roll Dice: the TV already rolled; this phone reveals its own rows one by one.
  let rollKey = null;
  let rollStage = 'ready'; // 'ready' (Fire! button) | 'rolling' | 'done'
  let rollShown = 0; // rows already revealed
  let rollTimer = 0;
  let tumbleTimer = 0;
  const ROW_MS = 750; // how long each weapon's dice tumble before they land

  const myId = () => meNow.id;
  const myShips = () => (state?.ships || []).filter((s) => s.owner === myId());
  const myLiving = () => myShips().filter((s) => s.alive);
  const shipById = (id) => state.ships.find((s) => s.id === id);
  const squads = () => state?.squads || [];
  const units = () => [...state.ships, ...squads()];
  const unitById = (id) => shipById(id) || squads().find((q) => q.id === id);
  // A carrier's squadrons (alive or not), in slot order.
  const wingSquads = (carrierId) => squads().filter((q) => q.carrier === carrierId);
  const hasWing = (s) => isCarrier(s) && wingSquads(s.id).some((q) => q.alive);
  const person = (id) => state?.people?.[id] || { name: '?', color: '#888' };
  const isReady = () => !!state?.ready?.[myId()];

  function resetDrafts() {
    draftKey = state.phaseKey;
    moveDraft = {};
    fireDraft = {};
    repairDraft = {};
    holdDraft = {};
    critDraft = {};
    fiveDraft = {};
    rotateDraft = {};
    for (const s of myLiving()) {
      moveDraft[s.id] = defaultMovePlan(s);
      if (hasWing(s)) moveDraft[s.id].squads = Object.fromEntries(wingSquads(s.id).filter((q) => q.alive).map((q) => [q.id, { ...q.order }]));
      fireDraft[s.id] = Object.fromEntries(defaultFirePlan(s, units(), state.asteroids).map((a) => [a.arc, { ...a.targets }]));
    }
    const living = myLiving();
    if (!living.some((s) => s.id === selShip)) selShip = living[0]?.id || null;
    selSeg = 0;
    selRow = 0;
    notice = '';
    // The untouched default plan isn't sent as a draft (the TV uses the same defaults anyway).
    clearTimeout(draftTimer);
    lastDraft = JSON.stringify(planMsg());
  }

  // ---------- Pieces ----------
  function header() {
    const phaseName = {
      setup: 'Fleet Setup', intro: 'Battle stations', planMove: 'Plan Movement', move: 'Moving…',
      planFire: 'Plan Fire', roll: 'Roll dice', fire: 'Firing…', over: 'Battle over',
    }[state.phase];
    const round = state.phase === 'setup' ? '' : `Round ${Math.max(1, state.round)}/${FLEET.maxRounds} · `;
    const f = state.teams?.[myId()];
    return `
      <div class="sbp-head" style="--fc:${f ? FACTIONS[f].color : 'var(--line)'}">
        <span><span class="dot" style="background:${person(myId()).color}"></span>${escapeHtml(meNow.name)}${f ? ` · ${escapeHtml(FACTIONS[f].short)}` : ''}</span>
        <span>${round}${phaseName} <b class="sbp-timer"></b></span>
      </div>`;
  }

  // Effects on a ship (Disruptor, Grapple, Acid) and its once-per-game weapons.
  function statusLines(s) {
    const out = [];
    if (s.stance) {
      const st = STANCES[s.stance.id];
      out.push(`Stance this round: ${s.stance.wild ? `${STANCES.wild.icon} ${STANCES.wild.name} + ` : ''}${st.icon} ${escapeHtml(st.name)}${s.stance.zone ? ` (${ZONE_NAMES[s.stance.zone]})` : ''}`);
    }
    if (captainOf(s)) out.push(`${captainHtml(s)}: ${escapeHtml(captainOf(s).desc)}`);
    if (shipDef(s).missiles) out.push(`🚀 Missiles: ${missilesLeft(s)}/${shipDef(s).missiles} left`);
    if (captainOf(s)?.stubborn) out.push(s.lastStand ? '🔨 Too Stubborn to Die: saved this round, no more damage until next round' : s.stubbornUsed ? '🔨 Too Stubborn to Die: used' : '🔨 Too Stubborn to Die: ready');
    for (const m of s.mods || []) out.push(`${UPGRADES[m].icon} ${escapeHtml(UPGRADES[m].name)}: ${escapeHtml(UPGRADES[m].desc)}`);
    for (const c of s.crits || []) {
      const cd = CRITICALS[c.id];
      if (!cd) continue;
      const what = c.weapon ? ` (${WEAPONS[c.weapon].name})` : '';
      out.push(`${cd.icon} Damaged ${escapeHtml(cd.name)}${escapeHtml(what)}: ${escapeHtml(cd.desc)}${c.fresh && cd.nextRound ? ' Starts next round.' : ''}`);
    }
    if (s.boost) {
      const over = s.shields[s.boost.zone] - shipDef(s).shields[s.boost.zone];
      if (over > 0) out.push(`⚡ Shield Boost: ${over} extra ${ZONE_NAMES[s.boost.zone]} shield${over > 1 ? 's' : ''}, lost at the end of ${s.boost.until === state.round ? 'this' : 'next'} round`);
    }
    if (s.disrupted) out.push('⚡ Disrupted: 1 turn click less per segment this move');
    if (s.grappled) out.push('⚓ Grappled: can\'t speed up this move');
    for (const [r, n] of Object.entries(s.acidDue || {})) {
      out.push(`🧪 Acid: ${n} hull damage at the end of ${Number(r) === state.round ? 'this' : 'next'} round`);
    }
    // Its squadrons: hull, docked or the order they're flying.
    for (const q of wingSquads(s.id)) {
      if (!q.alive) { out.push(`✈ ${escapeHtml(squadLabel(q))}: destroyed`); continue; }
      const o = SQUAD_ORDERS[q.order.order];
      const ot = q.order.target && shipById(q.order.target);
      const ot2 = ot || (q.order.target && squads().find((x) => x.id === q.order.target));
      out.push(`✈ ${escapeHtml(squadLabel(q))} ${craftText(q)}: ${q.docked ? '🏠 docked' : `${o.icon} ${escapeHtml(o.name)}${ot2 ? ` → ${escapeHtml(unitName(ot2))}` : ''}`}`);
    }
    for (const arc of ARCS) {
      arcWeapons(s, arc).forEach((w, wi) => {
        if (!WEAPONS[w.weapon].once) return;
        const used = weaponUsedUp(s, arc, wi);
        out.push(`${used ? '✖' : '★'} ${escapeHtml(WEAPONS[w.weapon].name)}: ${used ? 'used up' : 'ready (once per game)'}`);
      });
    }
    const sp = shipDef(s).special;
    if (sp) out.push(`${SPECIALS[sp].icon} ${escapeHtml(SPECIALS[sp].name)}: ${specialLeft(s, sp)} use${specialLeft(s, sp) === 1 ? '' : 's'} left`);
    return out;
  }

  function shieldText(sh) {
    return ZONES.map((z) => `${ZONE_NAMES[z][0]}${z === 'rear' ? 'r' : ''} ${sh[z]}`).join(' · ');
  }

  function fleetList() {
    const mine = myShips();
    if (!mine.length) return '';
    return `
      <h3 class="sbp-h">My Fleet</h3>
      <ul class="sbp-fleet">
        ${mine.map((s) => {
          const def = shipDef(s);
          const frac = Math.max(0, s.hull / maxHull(s));
          return `
            <li class="${s.alive ? '' : 'dead'}">
              <div class="sbp-fleet-top"><b>${escapeHtml(def.name)}${s.letter ? ` ${s.letter}` : ''}</b><small>${escapeHtml(CLASSES[def.class].name)}</small></div>
              ${s.alive ? `
                <div class="sbp-bar"><span style="width:${frac * 100}%;background:${frac > 0.5 ? 'var(--green)' : frac > 0.25 ? '#fcc419' : 'var(--red)'}"></span></div>
                <div class="sbp-stats">Hull ${s.hull}/${maxHull(s)} · Speed ${s.speed} <small>(${def.speed[0]}–${maxSpeed(s)})</small></div>
                <div class="sbp-stats">Shields ${shieldText(s.shields)}</div>
                ${statusLines(s).map((x) => `<div class="sbp-status">${x}</div>`).join('')}` : '<div class="sbp-stats red">Destroyed</div>'}
            </li>`;
        }).join('')}
      </ul>`;
  }

  function shipTabs() {
    const living = myLiving();
    if (living.length < 2) return '';
    return `<div class="sbp-tabs">${living.map((s) => `
      <button data-act="ship" data-id="${s.id}" class="${s.id === selShip ? 'on' : ''}">${escapeHtml(unitName(s))}</button>`).join('')}</div>`;
  }

  function readyBar(label) {
    return `
      <p class="sbp-notice">${escapeHtml(notice)}</p>
      <button class="big-btn sbp-ready" data-act="send">${label}</button>
      <p class="sbp-keys muted">${state.phase === 'planMove'
        ? 'Keys: Z/C stance · L launch all · ↑↓ speed · ←→ turn · Q/E segment · N next ship · Enter send'
        : 'Keys: ↑↓ choose · Space pick · N next ship · Enter send'}</p>`;
  }

  // ---------- Views ----------
  // ----- Fleet building -----
  function setupInfo() {
    const myTeam = state.teams[myId()];
    const teamIds = Object.keys(state.teams).filter((id) => state.teams[id] === myTeam);
    const mine = state.fleets?.[myId()] || [];
    const share = pointShare(teamIds.length, state.sidePoints || FLEET.sidePoints);
    const spent = fleetCost(mine);
    const teamCount = teamIds.reduce((n, id) => n + (state.fleets?.[id] || []).length, 0);
    return { myTeam, mine, share, spent, teamCount, maxShips: state.maxShips || FLEET.maxShipsPerSide };
  }

  // Weapons in the new format: "Railgun Battery · Battery · ●●● · 1×2 · ⚡2", plus point-defense.
  function weaponLines(def, type) {
    const line = (id, shots) => {
      const wd = WEAPONS[id];
      const tags = weaponTags(wd);
      return `<li><b>${escapeHtml(wd.name)}</b> <small>${ARC_DEFS[wd.arc].name} · ${reachDots(wd.reach)} ${RANGE_BANDS[BAND_INDEX[wd.reach]].name} · ${dmgText(wd, shots)} · ${wd.pd ? 'free' : `⚡${wd.power}`}${tags.length ? ` · ${tags.join(', ')}` : ''}</small><br><span>${escapeHtml(wd.desc || '')}</span></li>`;
    };
    const sp = def.special && SPECIALS[def.special];
    return `
      <p class="sbp-small">⚡ <b>${def.power} Power</b> per round to fire weapons. Every shot rolls a d10 and hits on ${HIT.base}+ (plus the target's agility); a 10 is a critical.</p>
      <ul class="sbp-weapons">${def.weapons.map((id) => line(id, WEAPONS[id].shots)).join('')}${def.pd.map((x) => line(x.weapon, x.shots)).join('')}</ul>
      ${sp ? `<p class="sbp-small">${sp.icon} <b>${escapeHtml(sp.name)}:</b> ${escapeHtml(sp.desc)}</p>` : ''}
      ${def.squadrons ? squadronLines(type) : ''}
      <p class="sbp-small"><a href="docs/ship-cards.html#${type}" target="_blank" rel="noopener">📇 See the ship card</a></p>`;
  }

  // Squadron types a carrier can hold (shown in the carrier's details). `mods` = customizations.
  function squadronLines(type, mods) {
    const n = carrierSlots(type, mods);
    return `
      <p class="sbp-small"><b>Carries up to ${n} squadron${n === 1 ? '' : 's'}</b> (bought below the ship in My fleet):</p>
      <ul class="sbp-weapons">${carrierSquadTypes(type, mods).map((t) => {
        const q = SQUADRONS[t];
        const extras = [q.accuracy ? `${q.accuracy > 0 ? '+' : '−'}${Math.abs(q.accuracy)} accuracy` : '', q.ignoreShields ? 'ignores shields' : '', q.crit ? 'crits on 10' : ''].filter(Boolean);
        return `<li><b>${escapeHtml(q.name)}</b> <small>${SQUADRON_ROLES[q.role].name} · ${q.cost} pts · ${q.craft} craft (${q.craftHull || 1} hull${q.shield ? ', 1 shield' : ', no shield'} each) · speed ${q.speed} u · ${escapeHtml(q.weapon)}: ${q.damage} dmg per craft, close range${extras.length ? ` · ${extras.join(', ')}` : ''}</small><br><span>${escapeHtml(q.desc)}</span></li>`;
      }).join('')}</ul>`;
  }

  // Customizations for a ship in My fleet (Free Trader): fit / remove buttons.
  function modRow(e, i, info) {
    const choices = upgradeChoices(e.type);
    if (!choices.length) return '';
    const mods = e.mods || [];
    return `
      <li class="sbp-wingrow">
        <small>Customizations${mods.length ? `: <b>${mods.map((m) => `${UPGRADES[m].icon} ${escapeHtml(UPGRADES[m].name)}`).join(', ')}</b> · tap to remove` : ' (optional upgrades)'}</small>
        <div class="sbp-wingbuy">
          ${choices.map((m) => {
            const on = mods.includes(m);
            const p = on ? null : upgradeProblem(m, info.mine, i, info.share);
            return `<button data-act="mod" data-i="${i}" data-m="${m}" data-on="${on ? 0 : 1}" ${p ? 'disabled' : ''} class="${on ? 'on' : ''}" title="${escapeHtml(UPGRADES[m].desc)}">${on ? '✓' : '+'} ${UPGRADES[m].icon} ${escapeHtml(UPGRADES[m].short)}<small>${on ? `−${UPGRADES[m].cost}` : UPGRADES[m].cost} pts</small></button>`;
          }).join('')}
        </div>
        <small class="muted">${choices.map((m) => `${UPGRADES[m].icon} ${escapeHtml(UPGRADES[m].name)}: ${escapeHtml(UPGRADES[m].desc)}`).join('<br>')}</small>
      </li>`;
  }

  // Captain choices for a ship in My fleet (or, with `slot`, one of its squadrons).
  function captainRow(e, i, info, slot = null) {
    const squad = slot !== null;
    const type = squad ? e.wing[slot] : e.type;
    const choices = captainChoices(type, squad);
    if (!choices.length) return '';
    const cur = squad ? e.wingCaptains?.[slot] : e.captain;
    const k = squad ? ` data-k="${slot}"` : '';
    const act = squad ? 'squadCaptain' : 'captain';
    return `
      <li class="sbp-wingrow">
        <small>${squad ? `${escapeHtml(SQUADRONS[type].short)} squadron captain` : 'Captain'}${cur ? `: <b>${faceImg(cur, 28)} ${escapeHtml(CAPTAINS[cur].name)}</b> · ${escapeHtml(CAPTAINS[cur].desc)}` : ' (optional upgrade)'}</small>
        <div class="sbp-wingbuy">
          ${cur ? `<button data-act="${act}" data-i="${i}"${k} data-c="">No captain<small>−${CAPTAINS[cur].cost} pts</small></button>` : ''}
          ${choices.filter((c) => c !== cur).map((c) => {
            const p = captainProblem(c, info.mine, i, info.share, slot);
            return `<button data-act="${act}" data-i="${i}"${k} data-c="${c}" ${p ? 'disabled' : ''} title="${escapeHtml(CAPTAINS[c].desc)}">${faceImg(c, 48)}${escapeHtml(CAPTAINS[c].short)}<small>${CAPTAINS[c].cost} pts</small></button>`;
          }).join('')}
        </div>
        ${!cur ? `<small class="muted">${choices.map((c) => `${escapeHtml(CAPTAINS[c].short)}: ${escapeHtml(CAPTAINS[c].desc)}`).join('<br>')}</small>` : ''}
      </li>`;
  }

  // Squadron slots under a carrier in My fleet: remove chips + buy buttons.
  function wingRow(e, i, info) {
    const slots = carrierSlots(e.type, e.mods);
    if (!slots) return '';
    return `
      <li class="sbp-wingrow">
        <small>Squadrons ${e.wing.length}/${slots}${e.wing.length ? ' · tap one to remove it' : ''}</small>
        ${e.wing.length ? `<div class="sbp-wingchips">${e.wing.map((q, k) => `<button data-act="removeSquad" data-i="${i}" data-k="${k}">${escapeHtml(SQUADRONS[q].short)}${e.wingCaptains?.[k] ? ` ${faceImg(e.wingCaptains[k], 20)}` : ''} ✕</button>`).join('')}</div>` : ''}
        ${e.wing.length < slots ? `<div class="sbp-wingbuy">${carrierSquadTypes(e.type, e.mods).map((t) => {
          const p = squadBuyProblem(t, info.myTeam, info.mine, i, info.share);
          return `<button data-act="buySquad" data-i="${i}" data-t="${t}" ${p ? 'disabled' : ''}>+ ${escapeHtml(SQUADRONS[t].short)}<small>${SQUADRONS[t].cost} pts</small></button>`;
        }).join('')}</div>` : ''}
      </li>`;
  }

  function shopCard(type, info) {
    const def = SHIPS[type];
    const problem = buyProblem(type, info.myTeam, info.mine, info.share, info.teamCount, info.maxShips);
    const open = openShip === type;
    const sh = def.shields;
    return `
      <li class="sbp-shop-item ${open ? 'open' : ''}">
        <div class="sbp-shop-top" data-act="details" data-t="${type}">
          <div><b>${escapeHtml(def.name)}</b><small>${escapeHtml(CLASSES[def.class].name)} · ${open ? 'tap to hide' : 'tap for details'}</small></div>
          <span class="sbp-cost">${def.cost} pts</span>
        </div>
        <p class="sbp-desc">${escapeHtml(def.desc || '')}</p>
        <div class="sbp-stats">Hull ${def.hull} · Shields F${sh.front} L${sh.left} R${sh.right} Rr${sh.rear} · Speed ${def.speed[0]}–${def.speed[1]} · Turn clicks by speed ${Array.from({ length: def.speed[1] - def.speed[0] + 1 }, (_, i) => def.clicksAtSpeed?.[def.speed[0] + i] ?? def.clicks).join('/')} · ⚡${def.power} · Agility ${CLASSES[def.class].agility}${def.squadrons ? ` · ✈ Carrier (${def.squadrons} squadrons)` : ''}${def.special ? ` · ${SPECIALS[def.special].icon} ${escapeHtml(SPECIALS[def.special].name)}` : ''}</div>
        ${open ? weaponLines(def, type) : ''}
        ${open && upgradeChoices(type).length ? `<p class="sbp-small"><b>Customizations</b> (bought below the ship in My fleet):<br>${upgradeChoices(type).map((m) => `${UPGRADES[m].icon} <b>${escapeHtml(UPGRADES[m].name)}</b> (${UPGRADES[m].cost} pts): ${escapeHtml(UPGRADES[m].desc)}`).join('<br>')}</p>` : ''}
        <button class="sbp-buy" data-act="buy" data-t="${type}" ${problem ? 'disabled' : ''}>${problem ? escapeHtml(problem) : `Buy · ${def.cost} pts`}</button>
      </li>`;
  }

  function viewSetup() {
    const info = setupInfo();
    const { myTeam, mine, share, spent, teamCount } = info;
    const over = spent > share;
    return `
      ${header()}
      <div class="sbp-body">
        <h3 class="sbp-h">Pick your side</h3>
        <div class="sbp-factions">
          ${FACTION_ORDER.map((f, i) => {
            const fd = FACTIONS[f];
            const n = Object.values(state.teams).filter((t) => t === f).length;
            return `<button data-act="team" data-f="${f}" ${fd.available ? '' : 'disabled'}
              class="${myTeam === f ? 'on' : ''}" style="--fc:${fd.color}">
              <b>${escapeHtml(fd.short)}</b><small>${fd.available ? `${n} player${n === 1 ? '' : 's'} · key ${i + 1}` : 'Coming soon'}</small></button>`;
          }).join('')}
        </div>
        ${myTeam ? `
          <div class="sbp-budget ${over ? 'over' : ''}">
            <div><b>${share - spent}</b><small>points left</small></div>
            <div><b>${spent}/${share}</b><small>spent</small></div>
            <div><b>${teamCount}/${info.maxShips}</b><small>side's ships</small></div>
          </div>
          ${over ? `<p class="sbp-notice">Over budget by ${spent - share} points: remove a ship.</p>` : ''}
          <h3 class="sbp-h">My fleet</h3>
          ${mine.length ? `<ul class="sbp-claims">
            ${mine.map((e, i) => `<li class="mine"><div><b>${escapeHtml(SHIPS[e.type].name)}</b>
              <small>${escapeHtml(CLASSES[SHIPS[e.type].class].name)} · ${SHIPS[e.type].cost} pts${e.captain ? ` + ${CAPTAINS[e.captain].cost} pts captain` : ''}${e.mods?.length ? ` + ${fleetCost([{ type: '', wing: [], mods: e.mods }])} pts customizations` : ''}${e.wing.length ? ` + ${fleetCost([{ type: '', wing: e.wing, wingCaptains: e.wingCaptains }])} pts squadrons` : ''}</small></div>
              <button data-act="remove" data-i="${i}">Remove</button></li>${captainRow(e, i, info)}${modRow(e, i, info)}${wingRow(e, i, info)}${e.wing.map((_, k) => captainRow(e, i, info, k)).join('')}`).join('')}
          </ul>` : '<p class="muted sbp-small">No ships yet. Buy some below. Unspent points are lost.</p>'}
          <button class="big-btn sbp-ready ${isReady() ? 'ghost' : ''}" data-act="setupReady" ${mine.length && !over ? '' : 'disabled'}>
            ${isReady() ? '✔ Ready (tap to undo)' : over ? 'Over budget' : mine.length ? 'Ready' : 'Buy a ship first'}</button>
          <h3 class="sbp-h">${escapeHtml(FACTIONS[myTeam].short)} shipyard</h3>
          <ul class="sbp-shop">${factionShipTypes(myTeam).map((t) => shopCard(t, info)).join('')}</ul>
          <p class="sbp-keys muted">Keys: 1–3 side · B buy cheapest · F fill carriers · X remove last · Enter ready</p>` : '<p class="muted">Tap a faction to join it.</p>'}
        ${state.problems?.length ? `<ul class="sbp-problems">${state.problems.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul>` : ''}
      </div>`;
  }

  function viewWatch(title, sub) {
    return `
      ${header()}
      <div class="sbp-body">
        <div class="sbp-watch"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(sub)}</p></div>
        ${fleetList()}
      </div>`;
  }

  // ---------- Roll Dice ----------
  const myRolls = () => (state.roll?.attacks || []).filter((r) => r.owner === myId());
  const verdictOf = (r) => (r.dice.some((d) => d[1] === 'crit') ? 'crit' : r.dice.some((d) => d[1] === 'hit') ? 'hit' : 'miss');
  const VERDICT = { hit: 'Hit!', miss: 'Miss!', crit: 'Crit!' };

  function rollRow(r, i) {
    const shown = i < rollShown;
    const tumbling = !shown && i === rollShown && rollStage === 'rolling';
    const kind = r.kind === 'pd' ? (r.first ? '🛡 Point-defense (fires first) · ' : '🛡 Point-defense (automatic) · ') : r.kind === 'squad' ? '✈ ' : r.kind === 'missile' ? '🚀 ' : '';
    const notes = [];
    if (r.flight) notes.push(`🚀 Launched: too far to hit this round. It flies ${MISSILE.speed} u a round and hits in about ${r.flight} round${r.flight === 1 ? '' : 's'}.`);
    if (r.kind === 'missile' && !r.flight) notes.push('Missiles always hit unless point-defense shoots them down.');
    if (r.lost && r.kind !== 'missile') notes.push(`🛡 ${r.lost} craft shot down by point-defense before firing`);
    if (r.oneRun) notes.push('💣 One bombing run: then they fly back to re-arm');
    const crit = r.critOn ? `<small> · crit ${r.critOn}${r.critOn < 10 ? '+' : ''}</small>` : '';
    const auto = r.need <= 1; // auto-hit weapon (Disruptor): no roll needed
    const dice = r.dice.map(([v, res]) => (shown
      ? `<span class="sbp-die ${res}">${auto ? '✓' : v}</span>`
      : `<span class="sbp-die ${tumbling ? 'tumble' : 'blank'}">${tumbling ? 1 + Math.floor(Math.random() * 10) : ''}</span>`)).join('');
    let verdict = '';
    if (shown && r.flight) {
      verdict = '<span class="sbp-verdict hit">In flight</span>';
    } else if (shown && !r.dice.length) {
      verdict = '<span class="sbp-verdict miss">Shot down!</span>'; // every craft (or the missile) lost before firing
    } else if (shown) {
      const v = verdictOf(r);
      const hits = r.dice.filter((d) => d[1] !== 'miss').length;
      verdict = `<span class="sbp-verdict ${v}">${VERDICT[v]}${r.dice.length > 1 ? `<small>${hits} of ${r.dice.length} hit</small>` : ''}</span>`;
    }
    return `
      <div class="sbp-drow ${shown || tumbling ? '' : 'wait'}" style="--dc:${r.color}">
        <div class="sbp-drow-head">
          <span><b>${escapeHtml(r.weapon)}</b><br><small>${kind}${escapeHtml(r.from)} → ${escapeHtml(r.to)}</small></span>
          <span class="sbp-need">${auto ? 'Auto-hit' : `Need ${r.need}${r.need < 10 ? '+' : ''}${crit}`}</span>
        </div>
        ${notes.length ? `<small class="muted">${notes.map(escapeHtml).join('<br>')}</small>` : ''}
        <div class="sbp-dice">${dice}${verdict}</div>
      </div>`;
  }

  function viewRoll() {
    const rows = myRolls();
    if (!rows.length) return viewWatch('Open fire!', 'None of your guns have a target this round. Watch the TV.');
    const nDice = rows.reduce((n, r) => n + r.dice.length, 0);
    let top;
    if (rollStage === 'ready') {
      top = `<h2>Ready to fire!</h2><p class="muted">${rows.length} weapon${rows.length > 1 ? 's' : ''} · ${nDice} d10${nDice > 1 ? 's' : ''}. Roll at least the number shown to hit. A 10 always hits.</p>
        <div><button class="big-btn sbp-fire-btn" data-act="fire">🔥 Fire!</button></div>`;
    } else if (rollStage === 'rolling') {
      top = `<h2>Rolling…</h2><div><button class="big-btn ghost" data-act="skipRoll">Skip ⏩</button></div>`;
    } else {
      const all = rows.flatMap((r) => r.dice);
      const hits = all.filter((d) => d[1] !== 'miss').length, crits = all.filter((d) => d[1] === 'crit').length;
      const waiting = state.phase !== 'roll' ? [] : Object.keys(state.people || {}).filter((id) => id !== myId() && state.rolled && !state.rolled[id] && myRollsOf(id));
      top = `<h2>${hits} hit${hits === 1 ? '' : 's'}${crits ? ` · <span style="color:#ffd43b">${crits} crit${crits > 1 ? 's' : ''}</span>` : ''}</h2>
        <p class="muted">Watch the TV!${waiting.length ? ` Waiting for ${waiting.map((id) => escapeHtml(person(id).name)).join(', ')}…` : ''}</p>`;
    }
    return `
      ${header()}
      <div class="sbp-body sbp-roll">
        <div class="sbp-roll-top">${top}</div>
        ${rows.map(rollRow).join('')}
      </div>`;
  }
  const myRollsOf = (id) => (state.roll?.attacks || []).some((r) => r.owner === id);

  function stopRollTimers() {
    clearTimeout(rollTimer);
    clearInterval(tumbleTimer);
    rollTimer = 0;
    tumbleTimer = 0;
  }

  function startRolling() {
    if (rollStage !== 'ready' || !myRolls().length) return;
    rollStage = 'rolling';
    rollShown = 0;
    buzz(40);
    tumbleTimer = setInterval(() => {
      for (const d of root.querySelectorAll('.sbp-die.tumble')) d.textContent = 1 + Math.floor(Math.random() * 10);
    }, 70);
    const step = () => {
      const r = myRolls()[rollShown];
      rollShown++;
      if (r) buzz(verdictOf(r) === 'crit' ? 120 : verdictOf(r) === 'hit' ? 40 : 0);
      if (rollShown >= myRolls().length) finishRolling();
      else { render(); showRollingRow(); rollTimer = setTimeout(step, ROW_MS); }
    };
    render();
    rollTimer = setTimeout(step, ROW_MS);
  }

  // Keeps the row that's rolling on screen (long fleets have many rows).
  function showRollingRow() {
    root.querySelector('.sbp-die.tumble')?.closest('.sbp-drow')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function finishRolling() {
    stopRollTimers();
    rollShown = myRolls().length;
    rollStage = 'done';
    sendInput({ type: 'rolled', round: state.round });
    render();
  }

  function viewSent() {
    return `
      ${header()}
      <div class="sbp-body">
        <div class="sbp-watch"><h2>Orders sent ✔</h2><p>Waiting for the other players…</p>
          <button class="big-btn ghost" data-act="unready">Change orders</button></div>
        ${fleetList()}
      </div>`;
  }

  function turnLabel(c) {
    if (!c) return 'Straight';
    return `${c < 0 ? 'Left' : 'Right'} ${Math.abs(c)} <small>(${Math.abs(c) * 15}°)</small>`;
  }

  // Stance grid (+ side picker for Shield Boost).
  function stancePicker(s, d) {
    const allowed = stanceOptions(s);
    const list = shipStances(s);
    const cur = d.stance.id;
    const bridge = critCount(s, 'bridge') > 0;
    return `
      <h3 class="sbp-h">Stance <small class="muted">secret until the Move</small></h3>
      ${bridge ? '<p class="sbp-burn">🧭 Bridge damaged: the only stance you can pick is Critical Repairs.</p>' : ''}
      <div class="sbp-stances">
        ${list.map((id) => {
          const st = STANCES[id];
          const blocked = !allowed.includes(id);
          return `<button data-act="stance" data-s="${id}" class="${cur === id ? 'on' : ''}" ${blocked ? 'disabled' : ''}>
            <span class="sbp-st-icon">${st.icon}</span><b>${escapeHtml(st.name)}</b>${blocked ? '<small>bridge damaged</small>' : ''}</button>`;
        }).join('')}
      </div>
      ${canAddWild(s, cur) ? `
        <button class="sbp-target ${d.stance.wild ? 'on' : ''}" data-act="stanceWild">
          <span>🐬 Shuna: add ${STANCES.wild.icon} ${escapeHtml(STANCES.wild.name)} too</span><span>${d.stance.wild ? '✔' : ''}</span></button>` : ''}
      <p class="sbp-small sbp-st-desc">${escapeHtml(STANCES[cur].desc)}${d.stance.wild && canAddWild(s, cur) ? ` Plus Wild Maneuvers: ${escapeHtml(STANCES.wild.desc)}` : ''}</p>
      ${cur === 'repairs' && !(s.crits || []).length ? '<p class="sbp-small muted">This ship has no critical hits to repair.</p>' : ''}
      ${STANCES[cur].needsZone ? `
        <div class="sbp-zones">${ZONES.map((z) => `
          <button data-act="stanceZone" data-z="${z}" class="${d.stance.zone === z ? 'on' : ''}">${ZONE_NAMES[z]} <small>${s.shields[z]}→${Math.min(boostCap(s, z), s.shields[z] + STANCES[cur].boostShields)} (max ${shipDef(s).shields[z]})</small></button>`).join('')}
        </div>` : ''}`;
  }

  // A squadron's name ("Fighters B" when the side has several Fighters), plus its captain.
  function squadLabel(q) {
    return `${squadDef(q).short}${q.letter ? ` ${q.letter}` : ''}${captainOf(q) ? ` ${captainOf(q).icon} ${captainOf(q).short}` : ''}`;
  }

  // "3/4 craft, 2 shielded".
  function craftText(q) {
    const def = squadDef(q);
    return `${q.hull}/${def.craft} craft${def.shield ? `, ${q.shields ?? 0} shielded` : ''}${q.hurt ? `, ${q.hurt} damaged` : ''}`;
  }

  // Orders this squadron may get now (Stay docked only while docked, Return only once launched).
  // Spent Bombers (bombs dropped) can only Return until they dock and re-arm.
  const ordersFor = (q) => (q.spent && !q.docked ? ['return'] : SQUAD_ORDER_LIST.filter((id) => (q.docked ? !SQUAD_ORDERS[id].launchedOnly : !SQUAD_ORDERS[id].dockedOnly)
    && squadOrderAllowed(q.type, id)));

  // Carrier squadrons (rules §8): one order per squadron. A docked squadron given Escort,
  // Attack or Intercept launches this round.
  function squadPicker(s, d) {
    if (!hasWing(s)) return '';
    const living = wingSquads(s.id).filter((q) => q.alive);
    // Attack targets: enemy ships, then launched enemy squadrons, nearest first.
    return `
      <h3 class="sbp-h">Squadrons <small class="muted">each gets its own order</small></h3>
      ${living.map((q) => {
        const cur = d.squads?.[q.id] || q.order;
        const launching = q.docked && SQUAD_ORDERS[cur.order].launches;
        const sd = squadDef(q);
        return `
          <div class="sbp-arc ${launching ? 'on' : ''}">
            <div class="sbp-arc-head"><b>${escapeHtml(squadLabel(q))} <small>${SQUADRON_ROLES[sd.role].name} · ${craftText(q)}</small></b>
              <small>${q.docked ? (launching ? '🚀 Launching' : '🏠 Docked') : q.spent ? '💣 Bombs used: returning to re-arm' : 'In space'}</small></div>
            <div class="sbp-sqorders">${ordersFor(q).map((id) => `
              <button data-act="squadOrder" data-q="${q.id}" data-o="${id}" class="${cur.order === id ? 'on' : ''}">${SQUAD_ORDERS[id].icon} ${escapeHtml(SQUAD_ORDERS[id].name)}</button>`).join('')}
            </div>
            ${SQUAD_ORDERS[cur.order].needsTarget ? `
              <div class="sbp-hunt">${attackTargets(s, q).map(({ t, dist }) => `
                <button class="sbp-target ${cur.target === t.id ? 'on' : ''}" data-act="squadTarget" data-q="${q.id}" data-id="${t.id}">
                  <span><span class="dot" style="background:${person(t.owner).color}"></span>${isSquad(t) ? '✈ ' : ''}${escapeHtml(unitName(t))} <small>${escapeHtml(person(t.owner).name)}</small></span>
                  <span>${dist.toFixed(1)} u ${cur.target === t.id ? '⚔' : ''}</span></button>`).join('')}
              </div>` : ''}
          </div>`;
      }).join('')}
      <p class="sbp-small muted">${q0Hint(living)}</p>`;
  }

  const q0Hint = (living) => (living.some((q) => q.docked)
    ? 'Pick Attack or Intercept to launch a docked squadron. It appears behind the carrier after the ships move.'
    : 'Return flies a squadron back to dock in the carrier.');

  // What squadron `q` of carrier `s` may Attack: living enemy ships, then launched enemy squadrons
  // (not for Bombers, which only attack ships).
  function attackTargets(s, q) {
    const d = (t) => Math.hypot(t.x - s.x, t.y - s.y);
    const shipsList = state.ships.filter((t) => t.alive && t.faction !== s.faction);
    const sqList = squadDef(q).shipsOnly ? [] : squads().filter((x) => x.alive && !x.docked && x.faction !== s.faction);
    return [...shipsList.sort((a, b) => d(a) - d(b)), ...sqList.sort((a, b) => d(a) - d(b))].map((t) => ({ t, dist: d(t) }));
  }

  function setSquadOrder(qid, order, target) {
    const s = shipById(selShip);
    const d = moveDraft[s.id];
    const q = squads().find((x) => x.id === qid && x.carrier === s.id && x.alive);
    if (!q || !ordersFor(q).includes(order)) return;
    const cur = d.squads?.[qid] || q.order;
    const o = { order };
    if (SQUAD_ORDERS[order].needsTarget) {
      const list = attackTargets(s, q).map((x) => x.t);
      const keep = list.find((t) => t.id === (target || cur.target));
      o.target = keep?.id || list[0]?.id;
      if (!o.target) return;
    }
    (d.squads || (d.squads = {}))[qid] = o;
    render();
  }

  function viewPlanMove() {
    const s = shipById(selShip);
    const d = moveDraft[s.id];
    const opts = speedOptions(s, d.stance);
    const mc = maxClicks(s, d.speed, d.stance);
    return `
      ${header()}
      <div class="sbp-body">
        ${shipTabs()}
        <div class="sbp-shipname"><b>${escapeHtml(shipDef(s).name)}${s.letter ? ` ${s.letter}` : ""}</b> <small class="muted">Hull ${s.hull} · ${shieldText(s.shields)}</small></div>
        ${stancePicker(s, d)}
        ${squadPicker(s, d)}
        ${specialLeft(s, 'mineDrop') > 0 ? `
          <button class="sbp-toggle ${d.mine ? 'on' : ''}" data-act="mine">💣 Mine Drop: ${d.mine ? 'drop a mine behind me at the end of this move ✔' : 'off'} <small>(${specialLeft(s, 'mineDrop')} left · key M)</small></button>` : ''}
        <canvas class="sbp-map"></canvas>
        ${s.burn ? '<p class="sbp-burn">🚀 Every ship is home: free Full Burn this round. Change speed by up to 2, up to 1 over max.</p>' : ''}
        ${s.disrupted ? '<p class="sbp-burn">⚡ Disrupted: 1 turn click less per segment this round.</p>' : ''}
        ${s.grappled ? '<p class="sbp-burn">⚓ Grappled: can\'t speed up this round.</p>' : ''}
        ${s.recover && !critCount(s, 'thrusters') ? '<p class="sbp-burn">🛟 Emergency thrusters: you hit something last move, so segment 1 can turn up to 90° extra.</p>' : ''}
        ${critCount(s, 'thrusters') ? '<p class="sbp-burn">↺ Maneuvering Thrusters damaged: can\'t turn, the ship flies straight.</p>' : ''}
        ${critCount(s, 'engines') ? '<p class="sbp-burn">⚙ Main Engines damaged: can\'t change speed.</p>' : ''}
        ${(() => { const hz = pathHazard(s, d, state.map, state.asteroids); return hz ? `<p class="sbp-burn sbp-warn">⚠ This path hits ${hz.kind === 'edge' ? 'the map edge' : 'an asteroid'} in segment ${hz.segment} (2 damage, and you stop). Turn or slow down.</p>` : ''; })()}
        <div class="sbp-speed">
          <button data-act="speed" data-d="-1" ${d.speed > opts[0] ? '' : 'disabled'}>−</button>
          <div><b>Speed ${d.speed}</b><small>${d.speed === s.speed ? 'same as now' : d.speed > s.speed ? 'speeding up' : 'slowing down'} · ${d.speed * 2} u</small></div>
          <button data-act="speed" data-d="1" ${d.speed < opts[opts.length - 1] ? '' : 'disabled'}>+</button>
        </div>
        <ul class="sbp-segs">
          ${d.clicks.map((c, i) => `
            <li class="${i === selSeg ? 'on' : ''}" data-act="seg" data-i="${i}">
              <span>Segment ${i + 1}</span>
              <button data-act="turn" data-i="${i}" data-d="-1" ${c > -segmentClicks(s, d.speed, d.stance, i) ? '' : 'disabled'}>◀</button>
              <b>${turnLabel(c)}</b>
              <button data-act="turn" data-i="${i}" data-d="1" ${c < segmentClicks(s, d.speed, d.stance, i) ? '' : 'disabled'}>▶</button>
            </li>`).join('')}
          ${endTurnClicks(s, d.stance) ? `
            <li class="${selSeg === d.clicks.length ? 'on' : ''}" data-act="seg" data-i="${d.clicks.length}">
              <span>🌀 End turn</span>
              <button data-act="endTurn" data-d="-1" ${(d.endTurn || 0) > -endTurnClicks(s, d.stance) ? '' : 'disabled'}>◀</button>
              <b>${turnLabel(d.endTurn || 0)}</b>
              <button data-act="endTurn" data-d="1" ${(d.endTurn || 0) < endTurnClicks(s, d.stance) ? '' : 'disabled'}>▶</button>
            </li>` : ''}
        </ul>
        <p class="muted sbp-small">Up to ${mc} click${mc === 1 ? '' : 's'} (${mc * 15}°) per segment${s.recover && !critCount(s, 'thrusters') ? ', plus up to 6 more (90°) in segment 1' : ''}. Each segment turns first, then flies 2 u.${endTurnClicks(s, d.stance) ? ' Violent Turn: after the move, turn up to 90° more (costs 1 hull).' : ''}</p>
        ${readyBar(myLiving().length > 1 ? 'Send orders for all ships' : 'Send orders')}
        ${fleetList()}
      </div>`;
  }

  // Every tappable choice in the fire planner, in screen order (for keyboard navigation):
  // for each weapon, its valid targets plus "Hold".
  function fireRows(s) {
    const rows = [];
    for (const arc of ARCS) {
      arcWeapons(s, arc).forEach((w, wi) => {
        const targets = weaponTargets(s, arc, wi, units(), state.asteroids);
        if (!targets.length) return;
        for (const t of targets) rows.push({ arc, wi, id: t.id, t });
        rows.push({ arc, wi, id: null });
      });
    }
    return rows;
  }

  // Critical Repairs: pick which critical hit gets repaired at the end of the round.
  function repairPicker(s) {
    if (!STANCES[s.stance?.id]?.repairCrit) return '';
    const crits = s.crits || [];
    const critIdx = repairDraft[s.id]?.crit ?? 0;
    const critName = (c) => `${CRITICALS[c.id]?.icon || ''} ${CRITICALS[c.id]?.name || c.id}${c.weapon ? ` (${WEAPONS[c.weapon].name})` : ''}`;
    return `
      <div class="sbp-arc on">
        <div class="sbp-arc-head"><b>🔧 Critical Repairs</b><small>end of round</small></div>
        ${crits.length ? `
          <p class="sbp-small">Which system to repair?</p>
          <div class="sbp-hunt">${crits.map((c, i) => `
            <button class="sbp-target ${i === critIdx ? 'on' : ''}" data-act="repairCrit" data-i="${i}"><span>${escapeHtml(critName(c))}</span><span>${i === critIdx ? '✔' : ''}</span></button>`).join('')}
          </div>` : '<p class="sbp-small muted">Nothing to repair.</p>'}
      </div>`;
  }

  // What this ship's stance means for firing.
  function fireStanceNote(s) {
    const st = stanceOf(s);
    const notes = [];
    const acc = st.accuracy || 0;
    if (acc) notes.push(`all weapons ${acc > 0 ? '+' : '−'}${Math.abs(acc)} accuracy`);
    if (st.critOn) notes.push(`crits on ${st.critOn}+`);
    if (st.squadAccuracy) notes.push(`your squadrons +${st.squadAccuracy} accuracy`);
    if (st.doubleWeapons) notes.push(st.doubleWeapons === 'all' ? 'every weapon fires twice' : `${st.doubleWeapons.map((w) => WEAPONS[w].name).join(', ')} fires twice`);
    const name = `${s.stance?.wild ? `${STANCES.wild.name} + ` : ''}${st.name}`;
    const amelia = captainOf(s)?.alwaysCommand ? `<p class="sbp-burn">${captainHtml(s)}: your squadrons always get +${STANCES.command.squadAccuracy} accuracy.</p>` : '';
    const pack = packBonus(s, units());
    const packNote = pack ? `<p class="sbp-burn">${faceImg('bossim', 22)} Bossim's Pack Leader: all weapons +${pack} accuracy.</p>` : '';
    const pd = shipDef(s).pd.length
      ? '<p class="sbp-small muted">Point-defense is free and fires on its own. It shoots first at squadrons and missiles attacking this ship (splitting its shots between them; whatever it downs never fires), otherwise at the nearest enemy squadron in close range. Its yellow dice show up when you tap Fire!</p>' : '';
    return (notes.length ? `<p class="sbp-burn">${st.icon} ${escapeHtml(name)}: ${escapeHtml(notes.join('; '))}.</p>` : '') + packNote + amelia + pd;
  }

  // Seir-Seir: which system this ship's criticals damage this round (default: random).
  function critPicker(s) {
    if (!captainOf(s)?.pickCrit) return '';
    const cur = critDraft[s.id] || '';
    return `
      <div class="sbp-arc on">
        <div class="sbp-arc-head"><b>${captainHtml(s)}</b><small>your criticals this round hit…</small></div>
        <div class="sbp-hunt">
          <button class="sbp-target ${cur ? '' : 'on'}" data-act="critPick" data-c=""><span>🎲 Random</span><span>${cur ? '' : '✔'}</span></button>
          ${CRIT_POOL.map((id) => `<button class="sbp-target ${cur === id ? 'on' : ''}" data-act="critPick" data-c="${id}"><span>${CRITICALS[id].icon} ${escapeHtml(CRITICALS[id].name)}</span><span>${cur === id ? '✔' : ''}</span></button>`).join('')}
        </div>
        <p class="sbp-small muted">If the target already has that system damaged, a random one is picked.</p>
      </div>`;
  }

  // Flerf's Five Arms: which aimed weapon fires twice this round (default: the strongest one).
  function fivePicker(s) {
    if (!captainOf(s)?.fiveArms) return '';
    const aimed = [];
    for (const a of draftPlan(s.id)) for (const wi of Object.keys(a.targets)) {
      const w = arcWeapons(s, a.arc)[wi];
      if (w && !WEAPONS[w.weapon].once) aimed.push({ key: `${a.arc}:${wi}`, w });
    }
    const cur = aimed.some((x) => x.key === fiveDraft[s.id]) ? fiveDraft[s.id] : '';
    return `
      <div class="sbp-arc on">
        <div class="sbp-arc-head"><b>${captainHtml(s)} · ⭐ Five Arms</b><small>this weapon fires twice…</small></div>
        <div class="sbp-hunt">
          <button class="sbp-target ${cur ? '' : 'on'}" data-act="fivePick" data-k=""><span>Auto: the strongest one aimed</span><span>${cur ? '' : '✔'}</span></button>
          ${aimed.map(({ key, w }) => `<button class="sbp-target ${cur === key ? 'on' : ''}" data-act="fivePick" data-k="${key}"><span>${escapeHtml(WEAPONS[w.weapon].name)}</span><span>${cur === key ? '✔ ×2' : ''}</span></button>`).join('')}
        </div>
        ${aimed.length ? '' : '<p class="sbp-small muted">Aim a weapon first.</p>'}
      </div>`;
  }

  // Fire draft as a plan: [{ arc, targets }].
  const draftPlan = (shipId) => Object.entries(fireDraft[shipId] || {})
    .filter(([, m]) => Object.keys(m).length).map(([arc, targets]) => ({ arc, targets }));

  // Smuggler's Hold (Free Trader, once per game): end-of-round repair on itself or a friend nearby.
  function holdPicker(s) {
    if (specialLeft(s, 'smugglersHold') <= 0) return '';
    const h = holdDraft[s.id] || null;
    const sp = SPECIALS.smugglersHold;
    const friends = holdTargets(s, state.ships);
    return `
      <div class="sbp-arc ${h ? 'on' : ''}">
        <div class="sbp-arc-head"><b>${sp.icon} ${escapeHtml(sp.name)}</b><small>once per game · end of round</small></div>
        <div class="sbp-repair">
          <button data-act="hold" data-k="" class="${h ? '' : 'on'}">Not now</button>
          <button data-act="hold" data-k="hull" class="${h?.kind === 'hull' ? 'on' : ''}">+${sp.hull} hull</button>
          <button data-act="hold" data-k="crit" class="${h?.kind === 'crit' ? 'on' : ''}">Remove a critical</button>
        </div>
        ${h ? `<div class="sbp-hunt">${friends.map((t) => `
          <button class="sbp-target ${h.target === t.id ? 'on' : ''}" data-act="holdTarget" data-id="${t.id}">
            <span><span class="dot" style="background:${person(t.owner).color}"></span>${escapeHtml(unitName(t))}${t.id === s.id ? ' <small>(this ship)</small>' : ''}</span>
            <span>hull ${t.hull}/${maxHull(t)}${(t.crits || []).length ? ` · ${(t.crits || []).length} crit` : ''} ${h.target === t.id ? '✔' : ''}</span></button>`).join('')}
        </div>` : ''}
      </div>`;
  }

  // The ship as it will shoot: turned by Kairos's rotation, if any.
  const aimShip = (s) => rotatedShip(s, rotateDraft[s.id] || 0);

  // Kairos: turn 1 click left or right before shooting.
  function rotatePicker(s) {
    const max = captainOf(s)?.fireRotate || 0;
    if (!max) return '';
    if (critCount(s, 'thrusters')) return `<p class="sbp-burn">⏳ Kairos can't turn the ship: Maneuvering Thrusters damaged.</p>`;
    const cur = rotateDraft[s.id] || 0;
    const opt = (r, label) => `<button data-act="rotate" data-r="${r}" class="${cur === r ? 'on' : ''}">${label}</button>`;
    return `
      <div class="sbp-arc on">
        <div class="sbp-arc-head"><b>⏳ Kairos: turn before firing</b><small>${max * 15}° max</small></div>
        <div class="sbp-repair">${opt(-max, `◀ Left ${max * 15}°`)}${opt(0, 'Stay')}${opt(max, `Right ${max * 15}° ▶`)}</div>
        <p class="sbp-small muted">Lines up the torpedo or turns a stronger shield toward the enemy. The targets below update.</p>
      </div>`;
  }

  // Changing the rotation: keep only the aimed weapons that still have their target.
  function setRotate(r) {
    const s = shipById(selShip);
    const rot = sanitizeRotate(s, r);
    if (rot) rotateDraft[s.id] = rot; else delete rotateDraft[s.id];
    const kept = sanitizeFirePlan(aimShip(s), draftPlan(s.id), units(), state.asteroids);
    fireDraft[s.id] = Object.fromEntries(kept.map((a) => [a.arc, { ...a.targets }]));
    selRow = 0;
    render();
  }

  function viewPlanFire() {
    const s = aimShip(shipById(selShip));
    const draft = fireDraft[s.id];
    const rows = fireRows(s);
    const rowIndex = (arc, wi, id) => rows.findIndex((x) => x.arc === arc && x.wi === wi && x.id === id);
    const power = shipPower(s);
    const used = planPower(s, draftPlan(s.id));
    return `
      ${header()}
      <div class="sbp-body">
        ${shipTabs()}
        <div class="sbp-shipname"><b>${escapeHtml(shipDef(s).name)}${s.letter ? ` ${s.letter}` : ""}</b> <small class="muted">each weapon picks its own target</small></div>
        <div class="sbp-power"><b>⚡ Power ${used}/${power}</b><span class="sbp-power-bar">${Array.from({ length: Math.max(power, used) }, (_, i) => `<i class="${i < used ? 'on' : ''}"></i>`).join('')}</span><small>${power - used > 0 ? `${power - used} unused (wasted)` : 'all used'}</small></div>
        ${shipDef(s).missiles ? `<div class="sbp-power"><b>🚀 Missiles ${missilesLeft(s)}/${shipDef(s).missiles}</b><span class="sbp-power-bar">${Array.from({ length: shipDef(s).missiles }, (_, i) => `<i class="${i < missilesLeft(s) ? 'on' : ''}"></i>`).join('')}</span><small>${missilesAimed(s, draftPlan(s.id)) ? `${missilesAimed(s, draftPlan(s.id))} launching this round` : 'left for the battle'}</small></div>` : ''}
        ${fireStanceNote(s)}
        ${rotatePicker(s)}
        ${repairPicker(s)}
        ${critPicker(s)}
        ${fivePicker(s)}
        ${holdPicker(s)}
        <canvas class="sbp-map"></canvas>
        ${ARCS.filter((arc) => arcWeapons(s, arc).length).map((arc) => `
            <div class="sbp-arc ${Object.keys(draft[arc] || {}).length ? 'on' : ''}">
              <div class="sbp-arc-head"><b>${ARC_DEFS[arc].name} <small>(${ARC_DEFS[arc].desc})</small></b></div>
              ${arcWeapons(s, arc).map((w, wi) => {
                const wd = WEAPONS[w.weapon];
                const used = weaponUsedUp(s, arc, wi);
                const offline = weaponOffline(s, arc, wi);
                const targets = weaponTargets(s, arc, wi, units(), state.asteroids);
                const chosen = draft[arc]?.[wi] || null;
                const unit = wd.effect === 'ion' ? 'shield dmg' : wd.effect === 'crit' ? 'crit value' : 'dmg';
                const tags = weaponTags(wd);
                return `
                  <div class="sbp-weapon">
                    <div class="sbp-weapon-head"><b>${escapeHtml(wd.name)} <small>${dmgText(wd, w.shots)} · ${reachDots(wd.reach)}${tags.length ? ` · ${tags.join(', ')}` : ''}</small></b><span class="sbp-once">${used ? 'Used up' : offline ? '⊘ Offline' : `⚡${weaponPower(w)}`}</span></div>
                    ${used ? '' : offline ? '<p class="muted sbp-small">Knocked out by a Weapons Systems critical. Repair it with Critical Repairs.</p>' : targets.length ? `
                      ${targets.map((t) => {
                        const ts = unitById(t.id);
                        const sel = chosen === t.id;
                        return `<button class="sbp-target ${sel ? 'on' : ''} ${rowIndex(arc, wi, t.id) === selRow ? 'cursor' : ''}" data-act="target" data-arc="${arc}" data-wi="${wi}" data-id="${t.id}">
                          <span><span class="dot" style="background:${person(ts.owner).color}"></span>${isSquad(ts) ? '✈ ' : ''}${escapeHtml(unitName(ts))} <small>${escapeHtml(person(ts.owner).name)}</small></span>
                          <span>${wd.missile ? `${t.dist.toFixed(0)} u · ${t.dist <= MISSILE.strike ? 'hits this round' : `arrives in ~${1 + Math.ceil((t.dist - MISSILE.strike) / MISSILE.speed)} rounds`} · 2 dmg unless shot down` : `${BAND_NAMES[t.band]} · ${t.need <= 1 ? 'always hits' : `hits on ${Math.min(t.need, HIT.die)}+`} ·≈${t.expected.toFixed(1)} ${unit}`} ${sel ? '✔' : ''}</span></button>`;
                      }).join('')}
                      <button class="sbp-target hold ${chosen ? '' : 'on'} ${rowIndex(arc, wi, null) === selRow ? 'cursor' : ''}" data-act="target" data-arc="${arc}" data-wi="${wi}" data-id="">
                        <span>${wd.once ? 'Hold (save it for later)' : 'Hold fire'}</span><span>${chosen ? '' : '✔'}</span></button>`
                    : '<p class="muted sbp-small">No valid targets</p>'}
                  </div>`;
              }).join('')}
            </div>`).join('')}
        ${readyBar(myLiving().length > 1 ? 'Send orders for all ships' : 'Send orders')}
        ${fleetList()}
      </div>`;
  }

  function viewOver() {
    const myTeam = state.teams[myId()];
    const w = state.result?.winner;
    const won = w && w === myTeam;
    const title = !w ? 'Draw!' : won ? 'Victory! 🎉' : 'Defeat';
    return `
      ${header()}
      <div class="sbp-body">
        <div class="sbp-watch ${!w ? '' : won ? 'win' : 'lose'}"><h2>${title}</h2><p>${escapeHtml(state.result?.reason || '')}</p><p>Look at the TV.</p></div>
        ${fleetList()}
      </div>`;
  }

  // ---------- Mini-map ----------
  function drawMap() {
    const canvas = root.querySelector('.sbp-map');
    if (!canvas) return;
    const s = state.phase === 'planFire' ? aimShip(shipById(selShip)) : shipById(selShip);
    const w = canvas.clientWidth;
    const h = Math.round((w * VIEW_H) / VIEW_W);
    const dpr = window.devicePixelRatio || 1;
    canvas.style.height = `${h}px`;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const k = w / VIEW_W;

    let focus = { x: s.x, y: s.y };
    let path = null;
    if (state.phase === 'planMove') {
      path = planWaypoints(s, moveDraft[s.id]);
      const end = path[path.length - 1];
      focus = { x: (s.x + end.x) / 2, y: (s.y + end.y) / 2 };
    }
    const { w: MW, h: MH } = state.map;
    const clampView = (c, view, size) => (view >= size ? size / 2 : Math.max(view / 2, Math.min(size - view / 2, c)));
    const ox = clampView(focus.x, VIEW_W, MW) - VIEW_W / 2;
    const oy = clampView(focus.y, VIEW_H, MH) - VIEW_H / 2;
    const X = (x) => (x - ox) * k, Y = (y) => (y - oy) * k;

    ctx.fillStyle = '#05071a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#000';
    ctx.strokeStyle = 'rgba(120,140,220,.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(X(0), Y(0), MW * k, MH * k);
    ctx.strokeStyle = 'rgba(255,255,255,.06)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= MW; gx += 2) { ctx.beginPath(); ctx.moveTo(X(gx), Y(0)); ctx.lineTo(X(gx), Y(MH)); ctx.stroke(); }
    for (let gy = 0; gy <= MH; gy += 2) { ctx.beginPath(); ctx.moveTo(X(0), Y(gy)); ctx.lineTo(X(MW), Y(gy)); ctx.stroke(); }

    // Mines (neutral; set off by any ship that moves within 1 u).
    for (const m of state.mines || []) {
      ctx.strokeStyle = 'rgba(255,107,107,.35)';
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.arc(X(m.x), Y(m.y), 1 * k, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ff6b6b';
      ctx.beginPath();
      ctx.arc(X(m.x), Y(m.y), 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const r of state.asteroids) {
      ctx.fillStyle = '#4a4458';
      ctx.strokeStyle = '#8a82a0';
      ctx.beginPath();
      ctx.arc(X(r.x), Y(r.y), r.r * k, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    if (state.phase === 'planFire') {
      // Faint wedge for each arc with a weapon, out to its longest reach (turret: a full circle),
      // plus lines to the chosen targets.
      for (const arc of ARCS) {
        const list = arcWeapons(s, arc);
        if (!list.length) continue;
        const reach = Math.max(...list.map((w) => BAND_INDEX[WEAPONS[w.weapon].reach]));
        const r = (RANGE_BANDS[reach].max + classOf(s).length / 2) * k;
        const chosen = Object.keys(fireDraft[s.id]?.[arc] || {}).length;
        const half = (ARC_DEFS[arc].half * Math.PI) / 180;
        const mid = (s.heading * Math.PI) / 180;
        ctx.fillStyle = chosen ? 'rgba(255,183,3,.14)' : 'rgba(255,255,255,.05)';
        ctx.strokeStyle = chosen ? 'rgba(255,183,3,.4)' : 'rgba(255,255,255,.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (half < Math.PI) ctx.moveTo(X(s.x), Y(s.y));
        ctx.arc(X(s.x), Y(s.y), r, mid - half, mid + half);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      const aimed = new Set(Object.values(fireDraft[s.id]).flatMap((m) => Object.values(m)));
      for (const id of aimed) {
        const t = unitById(id);
        if (!t) continue;
        ctx.strokeStyle = '#ffb703';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(X(s.x), Y(s.y));
        ctx.lineTo(X(t.x), Y(t.y));
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    const outline = (pose, ship, stroke, fill, width = 2) => {
      const pts = corners(pose, classOf(ship));
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
      ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.stroke();
      // nose marker
      const rad = (pose.heading * Math.PI) / 180;
      const L = classOf(ship).length / 2;
      ctx.fillStyle = stroke;
      ctx.beginPath();
      ctx.arc(X(pose.x + Math.cos(rad) * L), Y(pose.y + Math.sin(rad) * L), 2.5, 0, Math.PI * 2);
      ctx.fill();
    };

    for (const o of state.ships) {
      if (!o.alive) continue;
      const c = person(o.owner).color;
      outline(o.id === s.id ? s : o, o, c, o.id === s.id ? `${c}55` : `${c}22`, o.id === s.id ? 3 : 2);
    }
    // Squadrons: small circles with their role letter.
    for (const q of squads()) {
      if (!q.alive || q.docked) continue; // docked squadrons are inside their carrier
      const c = person(q.owner).color;
      const r = Math.max(4, (SQUADRON.size / 2) * k);
      ctx.fillStyle = `${c}55`;
      ctx.strokeStyle = c;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(X(q.x), Y(q.y), r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = `800 ${Math.round(r * 1.2)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(SQUADRON_ROLES[squadDef(q).role].letter, X(q.x), Y(q.y) + 0.5);
    }

    // 30° (spinal) weapons: show their firing wedge from where the ship will end its move, so the
    // player can line up the shot.
    if (path) {
      const spinal = arcWeapons(s, 'spinal').filter((w, wi) => !weaponUsedUp(s, 'spinal', wi) && !weaponOffline(s, 'spinal', wi));
      if (spinal.length) {
        const end = path[path.length - 1];
        const reach = Math.max(...spinal.map((w) => BAND_INDEX[WEAPONS[w.weapon].reach]));
        const r = (RANGE_BANDS[reach].max + classOf(s).length / 2) * k;
        const half = (ARC_DEFS.spinal.half * Math.PI) / 180;
        const mid = (end.heading * Math.PI) / 180;
        ctx.fillStyle = 'rgba(255,183,3,.12)';
        ctx.strokeStyle = 'rgba(255,183,3,.55)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(X(end.x), Y(end.y));
        ctx.arc(X(end.x), Y(end.y), r, mid - half, mid + half);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    if (path) {
      const hz = pathHazard(s, moveDraft[s.id], state.map, state.asteroids);
      ctx.strokeStyle = hz ? 'rgba(255,107,107,.9)' : 'rgba(255,255,255,.85)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      path.forEach((p, i) => (i ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y))));
      ctx.stroke();
      ctx.setLineDash([]);
      path.slice(1).forEach((p, i) => {
        ctx.fillStyle = i === selSeg ? '#ffb703' : '#fff';
        ctx.beginPath();
        ctx.arc(X(p.x), Y(p.y), i === selSeg ? 4 : 3, 0, Math.PI * 2);
        ctx.fill();
      });
      outline(path[path.length - 1], s, hz ? '#ff6b6b' : 'rgba(255,255,255,.9)', hz ? 'rgba(255,107,107,.15)' : 'rgba(255,255,255,.12)', 1.5);
      if (hz) {
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 2;
        const r = 6;
        ctx.beginPath(); ctx.moveTo(X(hz.x) - r, Y(hz.y) - r); ctx.lineTo(X(hz.x) + r, Y(hz.y) + r); ctx.moveTo(X(hz.x) + r, Y(hz.y) - r); ctx.lineTo(X(hz.x) - r, Y(hz.y) + r); ctx.stroke();
      }
    }
  }

  // ---------- Surrender ----------
  const battleRunning = () => ['intro', 'planMove', 'move', 'planFire', 'roll', 'fire'].includes(state.phase);

  function surrenderBar() {
    const myTeam = state.teams[myId()];
    if (!battleRunning() || !state.factions?.includes(myTeam)) return '';
    const mates = Object.keys(state.teams).filter((id) => id !== myId() && state.teams[id] === myTeam);
    const want = mates.filter((id) => state.surrender?.[id]);
    const waiting = mates.filter((id) => !state.surrender?.[id]);
    const mine = !!state.surrender?.[myId()];
    const names = (ids) => ids.map((id) => escapeHtml(person(id).name)).join(', ');
    return `
      <div class="sbp-surrender">
        ${want.map((id) => `<p class="sbp-sur-msg">🏳 <b>${escapeHtml(person(id).name)}</b> wants to surrender</p>`).join('')}
        ${mine ? `
          <p class="muted sbp-small">You voted to surrender.${waiting.length ? ` Waiting for ${names(waiting)}.` : ''}</p>
          <button class="sbp-sur-btn" data-act="surrender" data-on="0">Take back surrender</button>`
        : confirmSurrender ? `
          <p class="sbp-small"><b>Really surrender?</b>${mates.length ? ' Your team gives up once every online teammate agrees.' : ' Your team will lose.'}</p>
          <div class="sbp-sur-row">
            <button class="sbp-sur-btn danger" data-act="surrender" data-on="1">Yes, surrender</button>
            <button class="sbp-sur-btn" data-act="surrenderNo">No</button>
          </div>`
        : `<button class="sbp-sur-btn" data-act="surrenderAsk">🏳 Surrender</button>`}
      </div>`;
  }

  // ---------- Render ----------
  function render() {
    if (!state) return;
    renderView();
    const bar = surrenderBar();
    if (bar) root.insertAdjacentHTML('beforeend', bar);
    updateTimer();
    drawMap();
    syncDraft();
  }

  function renderView() {
    if (state.phase === 'setup') root.innerHTML = viewSetup();
    else if (state.phase === 'intro') root.innerHTML = viewWatch('Battle stations!', 'Find your ships on the TV.');
    else if (state.phase === 'move') root.innerHTML = viewWatch('Ships are moving', 'Watch the TV.');
    else if (state.phase === 'fire') root.innerHTML = myRolls().length ? viewRoll() : viewWatch('Open fire!', 'Watch the TV.');
    else if (state.phase === 'roll') root.innerHTML = viewRoll();
    else if (state.phase === 'over') root.innerHTML = viewOver();
    else if (!myLiving().length) root.innerHTML = viewWatch(myShips().length ? 'Your fleet is gone' : 'Spectating', 'Cheer on your team on the TV.');
    else if (isReady()) root.innerHTML = viewSent();
    else root.innerHTML = state.phase === 'planMove' ? viewPlanMove() : viewPlanFire();
  }

  function updateTimer() {
    const el = root.querySelector('.sbp-timer');
    if (!el) return;
    if (state.secondsLeft === null || state.secondsLeft === undefined) { el.textContent = ''; return; }
    const s = Math.max(0, Math.ceil((deadline - performance.now()) / 1000));
    el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    el.classList.toggle('urgent', s <= 10);
  }
  const timer = setInterval(updateTimer, 250);

  // ---------- Actions ----------
  // Puts the draft's speed and turns back inside what the current stance allows.
  function fitDraft(s, d, speed = d.speed) {
    const opts = speedOptions(s, d.stance);
    if (!opts.includes(speed)) speed = opts.reduce((a, b) => (Math.abs(b - speed) < Math.abs(a - speed) ? b : a));
    const n = Math.max(1, speed);
    const mc = maxClicks(s, speed, d.stance);
    d.speed = speed;
    d.clicks = Array.from({ length: n }, (_, i) => { const m = segmentClicks(s, speed, d.stance, i); return Math.max(-m, Math.min(m, d.clicks[i] || 0)); });
    const et = endTurnClicks(s, d.stance);
    if (et) d.endTurn = Math.max(-et, Math.min(et, d.endTurn || 0));
    else delete d.endTurn;
    selSeg = Math.min(selSeg, n - (et ? 0 : 1));
  }

  // Violent Turn: the turn at the end of the move.
  function turnEnd(delta) {
    const s = shipById(selShip);
    const d = moveDraft[s.id];
    const et = endTurnClicks(s, d.stance);
    const c = (d.endTurn || 0) + delta;
    if (!et || Math.abs(c) > et) return;
    d.endTurn = c;
    selSeg = d.clicks.length;
    render();
  }

  function setSpeed(delta) {
    const s = shipById(selShip);
    const d = moveDraft[s.id];
    if (!speedOptions(s, d.stance).includes(d.speed + delta)) return;
    fitDraft(s, d, d.speed + delta);
    render();
  }

  function turn(i, delta) {
    const s = shipById(selShip);
    const d = moveDraft[s.id];
    const mc = segmentClicks(s, d.speed, d.stance, i);
    const c = d.clicks[i] + delta;
    if (Math.abs(c) > mc) return;
    d.clicks[i] = c;
    selSeg = i;
    render();
  }

  function setStance(id) {
    const s = shipById(selShip);
    const d = moveDraft[s.id];
    if (!stanceOptions(s).includes(id)) return;
    const prev = d.stance;
    d.stance = { id };
    if (STANCES[id].needsZone) d.stance.zone = prev.zone || 'front';
    if (prev.wild && canAddWild(s, id)) d.stance.wild = true;
    notice = '';
    fitDraft(s, d);
    render();
  }

  function cycleStance(dir) {
    const s = shipById(selShip);
    const opts = stanceOptions(s);
    const i = opts.indexOf(moveDraft[s.id].stance.id);
    setStance(opts[(i + dir + opts.length) % opts.length]);
  }

  // Missile Launchers aimed in a fire plan (each uses 1 missile).
  const missilesAimed = (s, plan) => plan.reduce((n, a) => n + Object.keys(a.targets).filter((wi) => WEAPONS[arcWeapons(s, a.arc)[wi]?.weapon]?.missile).length, 0);

  // Aim one weapon at a target (tapping the same target again, or Hold, holds its fire).
  function pickTarget(arc, wi, targetId) {
    const draft = fireDraft[selShip];
    notice = '';
    const cur = draft[arc]?.[wi] || null;
    if (!targetId || cur === targetId) {
      if (draft[arc]) delete draft[arc][wi];
    } else {
      // Power check: what's already aimed (without this weapon) plus this weapon's cost.
      const s = shipById(selShip);
      const others = draftPlan(selShip).map((a) => ({ arc: a.arc, targets: Object.fromEntries(Object.entries(a.targets).filter(([k]) => !(a.arc === arc && Number(k) === wi))) }));
      const need = planPower(s, others) + weaponPower(arcWeapons(s, arc)[wi]);
      const isMissile = WEAPONS[arcWeapons(s, arc)[wi].weapon].missile;
      if (need > shipPower(s)) {
        notice = `Not enough power (${need}/${shipPower(s)}). Set another weapon to Hold first.`;
      } else if (isMissile && missilesAimed(s, others) + 1 > missilesLeft(s)) {
        notice = `Only ${missilesLeft(s)} missile${missilesLeft(s) === 1 ? '' : 's'} left.`;
      } else {
        (draft[arc] || (draft[arc] = {}))[wi] = targetId;
      }
    }
    render();
  }

  function nextShip() {
    const living = myLiving();
    if (living.length < 2) return;
    const i = living.findIndex((s) => s.id === selShip);
    selShip = living[(i + 1) % living.length].id;
    selSeg = 0;
    selRow = 0;
    render();
  }

  // This player's whole plan for the current planning step, as sent to the TV.
  function planMsg() {
    const ships = {};
    for (const s of myLiving()) {
      ships[s.id] = state.phase === 'planMove' ? moveDraft[s.id]
        : Object.entries(fireDraft[s.id] || {}).filter(([, m]) => Object.keys(m).length).map(([arc, targets]) => ({ arc, targets }));
    }
    const msg = { type: state.phase, round: state.round, ships };
    if (state.phase === 'planFire') { msg.repairs = { ...repairDraft }; msg.holds = { ...holdDraft }; msg.critPicks = { ...critDraft }; msg.rotates = { ...rotateDraft }; msg.fiveArms = { ...fiveDraft }; }
    return msg;
  }

  function send() {
    clearTimeout(draftTimer);
    sendInput({ ...planMsg(), ready: true });
    buzz(20);
  }

  // While planning, the TV also gets this phone's latest choices (about a second after they change),
  // so if the timer runs out before Send is tapped they're still used (ships, squadron orders,
  // targets). Only sent when something changed, to keep messages few.
  let draftTimer = 0;
  let lastDraft = '';
  function syncDraft() {
    const planning = (state.phase === 'planMove' || state.phase === 'planFire') && myLiving().length && !isReady();
    if (!planning || draftKey !== state.phaseKey) return;
    const json = JSON.stringify(planMsg());
    if (json === lastDraft) return;
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      if (isReady() || draftKey !== state.phaseKey) return;
      const now = JSON.stringify(planMsg());
      lastDraft = now;
      sendInput({ ...JSON.parse(now), ready: false, draft: true });
    }, 900);
  }

  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled || !state) return;
    const act = b.dataset.act;
    if (act === 'team') sendInput({ type: 'team', faction: b.dataset.f });
    else if (act === 'buy') { sendInput({ type: 'buy', shipType: b.dataset.t }); buzz(15); }
    else if (act === 'remove') sendInput({ type: 'remove', index: Number(b.dataset.i) });
    else if (act === 'buySquad') { sendInput({ type: 'buySquad', index: Number(b.dataset.i), squadType: b.dataset.t }); buzz(15); }
    else if (act === 'removeSquad') sendInput({ type: 'removeSquad', index: Number(b.dataset.i), slot: Number(b.dataset.k) });
    else if (act === 'squadOrder') setSquadOrder(b.dataset.q, b.dataset.o);
    else if (act === 'squadTarget') setSquadOrder(b.dataset.q, 'attack', b.dataset.id);
    else if (act === 'details') { openShip = openShip === b.dataset.t ? null : b.dataset.t; render(); }
    else if (act === 'surrenderAsk') { confirmSurrender = true; render(); }
    else if (act === 'surrenderNo') { confirmSurrender = false; render(); }
    else if (act === 'surrender') { confirmSurrender = false; sendInput({ type: 'surrender', on: b.dataset.on === '1' }); }
    else if (act === 'setupReady') sendInput({ type: 'ready', ready: !isReady() });
    else if (act === 'ship') { selShip = b.dataset.id; selSeg = 0; selRow = 0; render(); }
    else if (act === 'speed') setSpeed(Number(b.dataset.d));
    else if (act === 'turn') { e.stopPropagation(); turn(Number(b.dataset.i), Number(b.dataset.d)); }
    else if (act === 'seg') { selSeg = Number(b.dataset.i); render(); }
    else if (act === 'target') pickTarget(b.dataset.arc, Number(b.dataset.wi), b.dataset.id || null);
    else if (act === 'stance') setStance(b.dataset.s);
    else if (act === 'stanceZone') { moveDraft[selShip].stance.zone = b.dataset.z; render(); }
    else if (act === 'stanceWild') {
      const d = moveDraft[selShip];
      if (d.stance.wild) delete d.stance.wild; else d.stance.wild = true;
      fitDraft(shipById(selShip), d);
      render();
    }
    else if (act === 'mod') sendInput({ type: 'mod', index: Number(b.dataset.i), mod: b.dataset.m, on: b.dataset.on === '1' });
    else if (act === 'captain') sendInput({ type: 'captain', index: Number(b.dataset.i), captain: b.dataset.c || null });
    else if (act === 'squadCaptain') sendInput({ type: 'squadCaptain', index: Number(b.dataset.i), slot: Number(b.dataset.k), captain: b.dataset.c || null });
    else if (act === 'rotate') setRotate(Number(b.dataset.r));
    else if (act === 'fivePick') { if (b.dataset.k) fiveDraft[selShip] = b.dataset.k; else delete fiveDraft[selShip]; render(); }
    else if (act === 'critPick') { if (b.dataset.c) critDraft[selShip] = b.dataset.c; else delete critDraft[selShip]; render(); }
    else if (act === 'endTurn') { e.stopPropagation(); turnEnd(Number(b.dataset.d)); }
    else if (act === 'mine') { const d = moveDraft[selShip]; d.mine = !d.mine; render(); }
    else if (act === 'hold') { holdDraft[selShip] = b.dataset.k ? { kind: b.dataset.k, target: holdDraft[selShip]?.target || selShip } : null; if (!holdDraft[selShip]) delete holdDraft[selShip]; render(); }
    else if (act === 'holdTarget') { if (holdDraft[selShip]) holdDraft[selShip].target = b.dataset.id; render(); }
    else if (act === 'repairCrit') { repairDraft[selShip] = { crit: Number(b.dataset.i) }; render(); }
    else if (act === 'send') send();
    else if (act === 'fire') startRolling();
    else if (act === 'skipRoll') finishRolling();
    else if (act === 'unready') sendInput({ type: state.phase, round: state.round, ready: false });
  });

  // Keyboard support for laptop testing.
  function onKey(e) {
    if (!state) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const planning = (state.phase === 'planMove' || state.phase === 'planFire') && myLiving().length && !isReady();
    if (state.phase === 'roll') {
      if (k !== 'Enter' && k !== ' ') return;
      if (rollStage === 'ready') startRolling();
      else if (rollStage === 'rolling') finishRolling();
      else return;
    } else if (state.phase === 'setup') {
      const i = ['1', '2', '3'].indexOf(k);
      if (i >= 0 && FACTIONS[FACTION_ORDER[i]].available) sendInput({ type: 'team', faction: FACTION_ORDER[i] });
      else if (k === 'b') {
        const info = setupInfo();
        const t = info.myTeam && factionShipTypes(info.myTeam).find((x) => !buyProblem(x, info.myTeam, info.mine, info.share, info.teamCount, info.maxShips));
        if (t) sendInput({ type: 'buy', shipType: t });
      } else if (k === 'f') {
        // Add the cheapest squadron that fits to the first carrier with room.
        const info = setupInfo();
        if (!info.myTeam) return;
        for (let j = 0; j < info.mine.length; j++) {
          const t = carrierSquadTypes(info.mine[j].type, info.mine[j].mods).find((x) => !squadBuyProblem(x, info.myTeam, info.mine, j, info.share));
          if (t) { sendInput({ type: 'buySquad', index: j, squadType: t }); break; }
        }
      } else if (k === 'x') {
        const n = setupInfo().mine.length;
        if (n) sendInput({ type: 'remove', index: n - 1 });
      } else if (k === 'Enter' && setupInfo().mine.length) sendInput({ type: 'ready', ready: !isReady() });
      else return;
    } else if (planning && state.phase === 'planMove') {
      const d = moveDraft[selShip];
      if (k === 'ArrowUp' || k === 'w') setSpeed(1);
      else if (k === 'ArrowDown' || k === 's') setSpeed(-1);
      else if (k === 'ArrowLeft' || k === 'a') { if (selSeg >= d.clicks.length) turnEnd(-1); else turn(selSeg, -1); }
      else if (k === 'ArrowRight' || k === 'd') { if (selSeg >= d.clicks.length) turnEnd(1); else turn(selSeg, 1); }
      else if (k === 'q') { selSeg = Math.max(0, selSeg - 1); render(); }
      else if (k === 'e') { selSeg = Math.min(d.clicks.length - (endTurnClicks(shipById(selShip), d.stance) ? 0 : 1), selSeg + 1); render(); }
      else if (k === 'm' && specialLeft(shipById(selShip), 'mineDrop') > 0) { d.mine = !d.mine; render(); }
      else if (k === 'l' && hasWing(shipById(selShip))) {
        // Launch every docked squadron: Intercept, or (Bombers) Attack the nearest enemy ship.
        for (const q of wingSquads(selShip)) if (q.alive && q.docked) setSquadOrder(q.id, squadOrderAllowed(q.type, 'intercept') ? 'intercept' : 'attack');
        render();
      }
      else if (k === 'z') cycleStance(-1);
      else if (k === 'c') cycleStance(1);
      else if (k === 'n' || k === 'Tab') nextShip();
      else if (k === 'Enter') send();
      else return;
    } else if (planning && state.phase === 'planFire') {
      const rows = fireRows(aimShip(shipById(selShip)));
      if (k === 'ArrowUp' || k === 'w') { selRow = Math.max(0, selRow - 1); render(); }
      else if (k === 'ArrowDown' || k === 's') { selRow = Math.min(Math.max(0, rows.length - 1), selRow + 1); render(); }
      else if (k === ' ' && rows[selRow]) pickTarget(rows[selRow].arc, rows[selRow].wi, rows[selRow].id);
      else if (k === 'n' || k === 'Tab') nextShip();
      else if (k === 'Enter') send();
      else return;
    } else if (isReady() && k === 'Backspace') {
      sendInput({ type: state.phase, round: state.round, ready: false });
    } else return;
    e.preventDefault();
  }
  window.addEventListener('keydown', onKey);

  const onResize = () => drawMap();
  window.addEventListener('resize', onResize);

  return {
    update(gameState, meLatest) {
      if (!gameState) return;
      state = gameState;
      meNow = meLatest || meNow;
      if (state.secondsLeft !== null && state.secondsLeft !== undefined) deadline = performance.now() + state.secondsLeft * 1000;
      if ((state.phase === 'planMove' || state.phase === 'planFire') && draftKey !== state.phaseKey) resetDrafts();
      if (state.phase === 'roll' && rollKey !== state.phaseKey) {
        stopRollTimers();
        rollKey = state.phaseKey;
        // Already rolled (e.g. the page was reloaded): show the results straight away.
        rollStage = state.rolled?.[myId()] ? 'done' : 'ready';
        rollShown = rollStage === 'done' ? myRolls().length : 0;
      } else if (state.phase !== 'roll' && rollStage !== 'done') {
        // The TV moved on (everyone else rolled, or time ran out): show this phone's results.
        stopRollTimers();
        rollStage = 'done';
        rollShown = myRolls().length;
      }
      if (state.phase !== lastPhase && (state.phase === 'planMove' || state.phase === 'planFire' || state.phase === 'roll')) buzz(60);
      lastPhase = state.phase;
      render();
    },
    destroy() {
      clearInterval(timer);
      clearTimeout(draftTimer);
      stopRollTimers();
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    },
  };
}
