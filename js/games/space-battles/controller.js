// Space Battles – phone side. Team select, fleet building, My Fleet, the movement
// planner (with a mini-map and ghost path), the fire planner and Surrender.
// Plans stay on this phone until Ready is tapped; the TV checks every choice.
import { escapeHtml } from '../../supabase.js';
import {
  FACTIONS, FACTION_ORDER, CLASSES, WEAPONS, ZONES, ARCS, ZONE_NAMES, RANGE_BANDS, SHIPS, FLEET,
  STANCES, CLASS_STANCES, CRITICALS, SQUADRONS, SQUADRON_ROLES, SQUADRON, WING_ORDERS, WING_ORDER_LIST,
} from './data.js';
import {
  classOf, shipDef, corners, speedOptions, maxClicks, defaultMovePlan, planWaypoints,
  weaponTargets, weaponUsedUp, defaultFirePlan, arcWeapons, factionShipTypes, pointShare, fleetCost, buyProblem,
  stanceOptions, maxArcs, huntTarget, repairOf, arcOffline, maxSpeed, isSquad, squadDef, unitName,
  carrierSlots, isCarrier, factionSquadTypes, squadBuyProblem, critCount, hitChance,
} from './rules.js';

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
  let selShip = null;
  let selSeg = 0;
  let selRow = 0;
  let notice = '';
  let deadline = 0;
  let lastPhase = null;
  let openShip = null; // fleet building: ship type whose details are expanded
  let confirmSurrender = false; // first Surrender tap asks "are you sure?"

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
    for (const s of myLiving()) {
      moveDraft[s.id] = defaultMovePlan(s);
      if (hasWing(s) && s.wing) moveDraft[s.id].wing = { ...s.wing };
      fireDraft[s.id] = Object.fromEntries(defaultFirePlan(s, units(), state.asteroids).map((a) => [a.arc, { ...a.targets }]));
    }
    const living = myLiving();
    if (!living.some((s) => s.id === selShip)) selShip = living[0]?.id || null;
    selSeg = 0;
    selRow = 0;
    notice = '';
  }

  // ---------- Pieces ----------
  function header() {
    const phaseName = {
      setup: 'Fleet Setup', intro: 'Battle stations', planMove: 'Plan Movement', move: 'Moving…',
      planFire: 'Plan Fire', fire: 'Firing…', over: 'Battle over',
    }[state.phase];
    const round = state.phase === 'setup' ? '' : `Round ${Math.max(1, state.round)} · `;
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
      out.push(`${st.icon} Stance this round: ${escapeHtml(st.name)}${s.stance.zone ? ` (${ZONE_NAMES[s.stance.zone]})` : ''}`);
    }
    if (s.lastStance && s.lastStance !== 'balanced' && state.phase === 'planMove') {
      out.push(`⛔ Can't use ${escapeHtml(STANCES[s.lastStance].name)} again this round`);
    }
    for (const c of s.crits || []) {
      const cd = CRITICALS[c.id];
      const where = c.arc ? ` (${ZONE_NAMES[c.arc]} arc)` : c.zone ? ` (${ZONE_NAMES[c.zone]} zone)` : '';
      out.push(`${cd.icon} ${escapeHtml(cd.name)}${where}: ${escapeHtml(cd.desc)}${c.fresh && cd.nextRound ? ' Starts next round.' : ''}`);
    }
    if (s.disrupted) out.push('⚡ Disrupted: 1 turn click less per segment this move');
    if (s.grappled) out.push('⚓ Grappled: can\'t speed up this move');
    for (const [r, n] of Object.entries(s.acidDue || {})) {
      out.push(`🧪 Acid: ${n} hull damage at the end of ${Number(r) === state.round ? 'this' : 'next'} round`);
    }
    const wing = wingSquads(s.id);
    if (wing.length) {
      const wo = WING_ORDERS[s.wing?.order || 'escort'];
      const wt = s.wing?.target && shipById(s.wing.target);
      out.push(`${wo.icon} Wing: ${escapeHtml(wo.name)}${wt ? ` → ${escapeHtml(shipDef(wt).short)}` : ''}`);
      out.push(`✈ ${wing.map((q) => `${escapeHtml(squadDef(q).short)} ${q.alive ? `${q.hull}/${squadDef(q).hull}` : '✖'}`).join(' · ')}`);
    }
    for (const arc of ARCS) {
      arcWeapons(s, arc).forEach((w, wi) => {
        if (!WEAPONS[w.weapon].once) return;
        const used = weaponUsedUp(s, arc, wi);
        out.push(`${used ? '✖' : '★'} ${escapeHtml(WEAPONS[w.weapon].name)}: ${used ? 'used up' : 'ready (once per game)'}`);
      });
    }
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
          const frac = Math.max(0, s.hull / def.hull);
          return `
            <li class="${s.alive ? '' : 'dead'}">
              <div class="sbp-fleet-top"><b>${escapeHtml(def.name)}</b><small>${escapeHtml(CLASSES[def.class].name)}</small></div>
              ${s.alive ? `
                <div class="sbp-bar"><span style="width:${frac * 100}%;background:${frac > 0.5 ? 'var(--green)' : frac > 0.25 ? '#fcc419' : 'var(--red)'}"></span></div>
                <div class="sbp-stats">Hull ${s.hull}/${def.hull} · Speed ${s.speed} <small>(${def.speed[0]}–${maxSpeed(s)}${maxSpeed(s) < def.speed[1] ? ", engines damaged" : ""})</small></div>
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
      <button data-act="ship" data-id="${s.id}" class="${s.id === selShip ? 'on' : ''}">${escapeHtml(shipDef(s).short)}</button>`).join('')}</div>`;
  }

  function readyBar(label) {
    return `
      <p class="sbp-notice">${escapeHtml(notice)}</p>
      <button class="big-btn sbp-ready" data-act="send">${label}</button>
      <p class="sbp-keys muted">${state.phase === 'planMove'
        ? 'Keys: Z/C stance · O wing order · ↑↓ speed · ←→ turn · Q/E segment · N next ship · Enter send'
        : 'Keys: ↑↓ choose · Space pick · N next ship · Enter send'}</p>`;
  }

  // ---------- Views ----------
  // ----- Fleet building -----
  function setupInfo() {
    const myTeam = state.teams[myId()];
    const teamIds = Object.keys(state.teams).filter((id) => state.teams[id] === myTeam);
    const mine = state.fleets?.[myId()] || [];
    const share = pointShare(teamIds.length);
    const spent = fleetCost(mine);
    const teamCount = teamIds.reduce((n, id) => n + (state.fleets?.[id] || []).length, 0);
    return { myTeam, mine, share, spent, teamCount };
  }

  function weaponLines(def) {
    const lines = ARCS.filter((a) => def.arcs[a]?.length).map((a) => `
      <li><b>${a === 'turret' ? 'Turret (360°)' : ZONE_NAMES[a]}:</b> ${def.arcs[a].map((x) => `${x.shots} ${escapeHtml(WEAPONS[x.weapon].name)}${WEAPONS[x.weapon].once ? ' <em>(once)</em>' : ''}`).join(' + ')}</li>`);
    if (def.pd?.length) lines.push(`<li><b>Point-defense:</b> ${def.pd.map((x) => `${x.shots} ${escapeHtml(WEAPONS[x.weapon].name)}`).join(' + ')}</li>`);
    const used = [...new Set([...ARCS.flatMap((a) => (def.arcs[a] || []).map((x) => x.weapon)), ...(def.pd || []).map((x) => x.weapon)])];
    const hit = (wd) => RANGE_BANDS.filter((b) => wd.hit[b.id]).map((b) => `${b.name} ${Math.round(wd.hit[b.id] * 100)}%`).join(' · ');
    // Against squadrons (rules §8): see hitChance in rules.js.
    const vsSq = (wd) => {
      if (wd.pd) return '';
      if (wd.noSquadrons) return ' · can\'t target squadrons';
      const sq = { kind: 'squad' };
      return ` · vs squadrons ${RANGE_BANDS.filter((b) => hitChance(wd, b.id, sq)).map((b) => `${Math.round(hitChance(wd, b.id, sq) * 100)}%`).join('/')}`;
    };
    return `
      <ul class="sbp-arcs">${lines.join('')}</ul>
      <ul class="sbp-weapons">${used.map((k) => {
        const wd = WEAPONS[k];
        return `<li><b>${escapeHtml(wd.name)}</b> <small>${hit(wd)} · ${wd.damage} dmg${wd.crit ? ` · ${Math.round(wd.crit * 100)}% crit` : ''}${vsSq(wd)}</small><br><span>${escapeHtml(wd.desc || '')}</span></li>`;
      }).join('')}</ul>
      ${def.squadrons ? squadronLines(def.faction) : ''}`;
  }

  // Squadron types a carrier can hold (shown in the carrier's details).
  function squadronLines(faction) {
    const prof = (p) => (p ? `${p.shots} shot${p.shots > 1 ? 's' : ''}, ${Math.round(p.hit * 100)}%` : '—');
    return `
      <p class="sbp-small"><b>Carries up to 3 squadrons</b> (bought below the ship in My fleet):</p>
      <ul class="sbp-weapons">${factionSquadTypes(faction).map((t) => {
        const q = SQUADRONS[t];
        return `<li><b>${escapeHtml(q.name)}</b> <small>${SQUADRON_ROLES[q.role].name} · ${q.cost} pts · hull ${q.hull} · speed ${q.speed} u${q.role !== 'boarding' ? ` · vs squadrons ${prof(q.vsSquadron)} · vs ships ${prof(q.vsShip)}${q.crit ? `, ${Math.round(q.crit * 100)}% crit` : ''}` : ''}</small><br><span>${escapeHtml(q.desc)}</span></li>`;
      }).join('')}</ul>`;
  }

  // Squadron slots under a carrier in My fleet: remove chips + buy buttons.
  function wingRow(e, i, info) {
    const slots = carrierSlots(e.type);
    if (!slots) return '';
    return `
      <li class="sbp-wingrow">
        <small>Squadrons ${e.wing.length}/${slots}${e.wing.length ? ' · tap one to remove it' : ''}</small>
        ${e.wing.length ? `<div class="sbp-wingchips">${e.wing.map((q, k) => `<button data-act="removeSquad" data-i="${i}" data-k="${k}">${escapeHtml(SQUADRONS[q].short)} ✕</button>`).join('')}</div>` : ''}
        ${e.wing.length < slots ? `<div class="sbp-wingbuy">${factionSquadTypes(info.myTeam).map((t) => {
          const p = squadBuyProblem(t, info.myTeam, info.mine, i, info.share);
          return `<button data-act="buySquad" data-i="${i}" data-t="${t}" ${p ? 'disabled' : ''}>+ ${escapeHtml(SQUADRONS[t].short)}<small>${SQUADRONS[t].cost} pts</small></button>`;
        }).join('')}</div>` : ''}
      </li>`;
  }

  function shopCard(type, info) {
    const def = SHIPS[type];
    const problem = buyProblem(type, info.myTeam, info.mine, info.share, info.teamCount);
    const open = openShip === type;
    const sh = def.shields;
    return `
      <li class="sbp-shop-item ${open ? 'open' : ''}">
        <div class="sbp-shop-top" data-act="details" data-t="${type}">
          <div><b>${escapeHtml(def.name)}</b><small>${escapeHtml(CLASSES[def.class].name)} · ${open ? 'tap to hide' : 'tap for details'}</small></div>
          <span class="sbp-cost">${def.cost} pts</span>
        </div>
        <p class="sbp-desc">${escapeHtml(def.desc || '')}</p>
        <div class="sbp-stats">Hull ${def.hull} · Shields F${sh.front} L${sh.left} R${sh.right} Rr${sh.rear} · Speed ${def.speed[0]}–${def.speed[1]} · Turn ${def.clicks}${def.clicksAtSpeed ? ` (${Object.entries(def.clicksAtSpeed).map(([s, c]) => `${c} at speed ${s}`).join(', ')})` : ''}${def.squadrons ? ` · ✈ Carrier (${def.squadrons} squadrons)` : ''}${def.screen ? ' · Screen vs squadrons' : ''}</div>
        ${open ? weaponLines(def) : ''}
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
            <div><b>${teamCount}/${FLEET.maxShipsPerSide}</b><small>side's ships</small></div>
          </div>
          ${over ? `<p class="sbp-notice">Over budget by ${spent - share} points: remove a ship.</p>` : ''}
          <h3 class="sbp-h">My fleet</h3>
          ${mine.length ? `<ul class="sbp-claims">
            ${mine.map((e, i) => `<li class="mine"><div><b>${escapeHtml(SHIPS[e.type].name)}</b>
              <small>${escapeHtml(CLASSES[SHIPS[e.type].class].name)} · ${SHIPS[e.type].cost} pts${e.wing.length ? ` + ${fleetCost([{ type: '', wing: e.wing }])} pts squadrons` : ''}</small></div>
              <button data-act="remove" data-i="${i}">Remove</button></li>${wingRow(e, i, info)}`).join('')}
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

  // Stance grid (+ zone picker for Shield Charge, target picker for Hunter).
  function stancePicker(s, d) {
    const allowed = stanceOptions(s);
    const classList = ['balanced', ...(CLASS_STANCES[shipDef(s).class] || [])];
    const cur = d.stance.id;
    const enemies = state.ships.filter((t) => t.alive && t.faction !== s.faction)
      .map((t) => ({ t, dist: Math.hypot(t.x - s.x, t.y - s.y) })).sort((a, b) => a.dist - b.dist);
    return `
      <h3 class="sbp-h">Stance <small class="muted">secret until the Move</small></h3>
      <div class="sbp-stances">
        ${classList.map((id) => {
          const st = STANCES[id];
          const blocked = !allowed.includes(id);
          return `<button data-act="stance" data-s="${id}" class="${cur === id ? 'on' : ''}" ${blocked ? 'disabled' : ''}>
            <span class="sbp-st-icon">${st.icon}</span><b>${escapeHtml(st.name)}</b>${blocked ? '<small>used last round</small>' : ''}</button>`;
        }).join('')}
      </div>
      <p class="sbp-small sbp-st-desc">${escapeHtml(STANCES[cur].desc)}</p>
      ${STANCES[cur].needsZone ? `
        <div class="sbp-zones">${ZONES.map((z) => `
          <button data-act="stanceZone" data-z="${z}" class="${d.stance.zone === z ? 'on' : ''}">${ZONE_NAMES[z]} <small>${s.shields[z]}→${s.shields[z] + STANCES[cur].chargeShields}</small></button>`).join('')}
        </div>` : ''}
      ${STANCES[cur].needsTarget ? `
        <div class="sbp-hunt">${enemies.length ? enemies.map(({ t, dist }) => `
          <button class="sbp-target ${d.stance.target === t.id ? 'on' : ''}" data-act="stanceTarget" data-id="${t.id}">
            <span><span class="dot" style="background:${person(t.owner).color}"></span>${escapeHtml(shipDef(t).short)} <small>${escapeHtml(person(t.owner).name)}</small></span>
            <span>${dist.toFixed(1)} u away ${d.stance.target === t.id ? '🎯' : ''}</span></button>`).join('') : '<p class="muted sbp-small">No enemy ships</p>'}
        </div>` : ''}`;
  }

  // Carrier wing order (rules §8): one order for all of this carrier's squadrons.
  function wingPicker(s, d) {
    if (!hasWing(s)) return '';
    const cur = d.wing || s.wing || { order: 'escort' };
    const list = wingSquads(s.id).filter((q) => q.alive).map((q) => `${squadDef(q).short} ${q.hull}/${squadDef(q).hull}`).join(' · ');
    if (critCount(s, 'comms')) {
      return `
        <h3 class="sbp-h">Wing <small class="muted">${escapeHtml(list)}</small></h3>
        <p class="sbp-burn">📡 Comms Down: the wing keeps its order (${escapeHtml(WING_ORDERS[cur.order].name)}) until repaired.</p>`;
    }
    const enemies = state.ships.filter((t) => t.alive && t.faction !== s.faction)
      .map((t) => ({ t, dist: Math.hypot(t.x - s.x, t.y - s.y) })).sort((a, b) => a.dist - b.dist);
    return `
      <h3 class="sbp-h">Wing order <small class="muted">${escapeHtml(list)}</small></h3>
      <div class="sbp-repair">${WING_ORDER_LIST.map((id) => `
        <button data-act="wingOrder" data-o="${id}" class="${cur.order === id ? 'on' : ''}">${WING_ORDERS[id].icon} ${escapeHtml(WING_ORDERS[id].name)}</button>`).join('')}
      </div>
      <p class="sbp-small sbp-st-desc">${escapeHtml(WING_ORDERS[cur.order].desc)}</p>
      ${WING_ORDERS[cur.order].needsTarget ? `
        <div class="sbp-hunt">${enemies.map(({ t, dist }) => `
          <button class="sbp-target ${cur.target === t.id ? 'on' : ''}" data-act="wingTarget" data-id="${t.id}">
            <span><span class="dot" style="background:${person(t.owner).color}"></span>${escapeHtml(shipDef(t).short)} <small>${escapeHtml(person(t.owner).name)}</small></span>
            <span>${dist.toFixed(1)} u away ${cur.target === t.id ? '⚔' : ''}</span></button>`).join('')}
        </div>` : ''}`;
  }

  function setWing(order, target) {
    const s = shipById(selShip);
    const d = moveDraft[s.id];
    const cur = d.wing || s.wing || { order: 'escort' };
    const w = { order };
    if (WING_ORDERS[order].needsTarget) {
      const near = state.ships.filter((t) => t.alive && t.faction !== s.faction)
        .sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y))[0];
      const keep = state.ships.find((t) => t.id === (target || cur.target) && t.alive && t.faction !== s.faction);
      w.target = keep?.id || near?.id;
      if (!w.target) return;
    }
    d.wing = w;
    render();
  }

  function viewPlanMove() {
    const s = shipById(selShip);
    const d = moveDraft[s.id];
    const opts = speedOptions(s, d.stance.id);
    const mc = maxClicks(s, d.speed, d.stance.id);
    return `
      ${header()}
      <div class="sbp-body">
        ${shipTabs()}
        <div class="sbp-shipname"><b>${escapeHtml(shipDef(s).name)}</b> <small class="muted">Hull ${s.hull} · ${shieldText(s.shields)}</small></div>
        ${stancePicker(s, d)}
        ${wingPicker(s, d)}
        <canvas class="sbp-map"></canvas>
        ${s.burn ? '<p class="sbp-burn">🚀 Every ship is home: free Full Burn this round. Change speed by up to 2, up to 1 over max.</p>' : ''}
        ${s.disrupted ? '<p class="sbp-burn">⚡ Disrupted: 1 turn click less per segment this round.</p>' : ''}
        ${s.grappled ? '<p class="sbp-burn">⚓ Grappled: can\'t speed up this round.</p>' : ''}
        <div class="sbp-speed">
          <button data-act="speed" data-d="-1" ${d.speed > opts[0] ? '' : 'disabled'}>−</button>
          <div><b>Speed ${d.speed}</b><small>${d.speed === s.speed ? 'same as now' : d.speed > s.speed ? 'speeding up' : 'slowing down'} · ${d.speed * 2} u</small></div>
          <button data-act="speed" data-d="1" ${d.speed < opts[opts.length - 1] ? '' : 'disabled'}>+</button>
        </div>
        <ul class="sbp-segs">
          ${d.clicks.map((c, i) => `
            <li class="${i === selSeg ? 'on' : ''}" data-act="seg" data-i="${i}">
              <span>Segment ${i + 1}</span>
              <button data-act="turn" data-i="${i}" data-d="-1" ${c > -mc ? '' : 'disabled'}>◀</button>
              <b>${turnLabel(c)}</b>
              <button data-act="turn" data-i="${i}" data-d="1" ${c < mc ? '' : 'disabled'}>▶</button>
            </li>`).join('')}
        </ul>
        <p class="muted sbp-small">Up to ${mc} click${mc > 1 ? 's' : ''} (${mc * 15}°) per segment. Each segment turns first, then flies 2 u.</p>
        ${readyBar(myLiving().length > 1 ? 'Send orders for all ships' : 'Send orders')}
        ${fleetList()}
      </div>`;
  }

  // Arcs with at least one weapon aimed (these count toward the 2-arc limit).
  const firingArcs = (shipId) => Object.keys(fireDraft[shipId] || {}).filter((arc) => Object.keys(fireDraft[shipId][arc]).length);

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

  // Damage Control: pick the end-of-round repair (rules §5).
  function repairPicker(s) {
    if (s.stance?.id !== 'damageControl') return '';
    const rep = repairOf(s);
    const def = shipDef(s);
    const crits = s.crits || [];
    const r = repairDraft[s.id] || null;
    const zones = r?.kind === 'shields' ? r.zones : [];
    const broken = (z) => crits.some((c) => c.id === 'shieldGen' && c.zone === z);
    const critName = (c) => `${CRITICALS[c.id].icon} ${CRITICALS[c.id].name}${c.arc ? ` (${ZONE_NAMES[c.arc]})` : c.zone ? ` (${ZONE_NAMES[c.zone]})` : ''}`;
    const dflt = crits.length ? `remove ${critName(crits[0])}`
      : ZONES.some((z) => !broken(z) && s.shields[z] < def.shields[z]) ? `${rep.shields} shields to the weakest zones` : `${rep.hull} hull`;
    // Which critical goes: the chosen one, else the oldest.
    const showCrits = crits.length && (r?.kind === 'crit' || (rep.alsoRemoveCrit && r));
    const critIdx = r?.crit ?? 0;
    return `
      <div class="sbp-arc on">
        <div class="sbp-arc-head"><b>🔧 Damage Control</b><small>end of round${rep.alsoRemoveCrit ? ' · Samurai: also removes 1 critical' : ''}</small></div>
        <div class="sbp-repair">
          <button data-act="repair" data-k="shields" class="${r?.kind === 'shields' ? 'on' : ''}">+${rep.shields} shields</button>
          <button data-act="repair" data-k="hull" class="${r?.kind === 'hull' ? 'on' : ''}" ${s.hull >= def.hull ? 'disabled' : ''}>+${rep.hull} hull</button>
          <button data-act="repair" data-k="crit" class="${r?.kind === 'crit' ? 'on' : ''}" ${crits.length ? '' : 'disabled'}>Remove a critical</button>
        </div>
        ${r?.kind === 'shields' ? `
          <p class="sbp-small">Tap a zone for each shield (${zones.length}/${rep.shields}). Shields can't go above their starting value.</p>
          <div class="sbp-zones">${ZONES.map((z) => {
            const n = zones.filter((x) => x === z).length;
            return `<button data-act="repairZone" data-z="${z}" ${broken(z) || s.shields[z] + n >= def.shields[z] ? 'disabled' : ''}>${ZONE_NAMES[z]} <small>${broken(z) ? '✖ broken' : `${s.shields[z]}${n ? `+${n}` : ''}/${def.shields[z]}`}</small></button>`;
          }).join('')}</div>
          ${zones.length ? '<button class="sbp-sur-btn" data-act="repairClear">Clear zones</button>' : ''}` : ''}
        ${showCrits ? `
          <p class="sbp-small">Which critical to remove?</p>
          <div class="sbp-hunt">${crits.map((c, i) => `
            <button class="sbp-target ${i === critIdx ? 'on' : ''}" data-act="repairCrit" data-i="${i}"><span>${escapeHtml(critName(c))}</span><span>${i === critIdx ? '✔' : ''}</span></button>`).join('')}
          </div>` : ''}
        ${r ? '' : `<p class="sbp-small muted">If you don't choose: ${escapeHtml(dflt)}${rep.alsoRemoveCrit && crits.length > 1 ? ', and another critical' : ''}.</p>`}
      </div>`;
  }

  // What this ship's stance means for firing.
  function fireStanceNote(s) {
    const st = STANCES[s.stance?.id || 'balanced'];
    if (maxArcs(s) === 0) return `<p class="sbp-burn">${st.icon} ${escapeHtml(st.name)}: this ship can't fire this round.</p>`;
    const notes = [];
    if (st.maxArcs === 1) notes.push('only 1 arc can fire');
    if (st.shotBonus) notes.push('+1 shot on every weapon');
    if (st.shotPenalty) notes.push('−1 shot on every arc');
    const hunt = huntTarget(s) && shipById(huntTarget(s));
    if (hunt) notes.push(`may only attack ${shipDef(hunt).short} (+1 shot, rerolls misses)`);
    const pd = (shipDef(s).pd || []).length
      ? '<p class="sbp-small muted">Point-defense fires on its own at the nearest enemy squadron in close range.</p>' : '';
    return (notes.length ? `<p class="sbp-burn">${st.icon} ${escapeHtml(st.name)}: ${escapeHtml(notes.join('; '))}.</p>` : '') + pd;
  }

  function viewPlanFire() {
    const s = shipById(selShip);
    const draft = fireDraft[s.id];
    const rows = fireRows(s);
    const rowIndex = (arc, wi, id) => rows.findIndex((x) => x.arc === arc && x.wi === wi && x.id === id);
    return `
      ${header()}
      <div class="sbp-body">
        ${shipTabs()}
        <div class="sbp-shipname"><b>${escapeHtml(shipDef(s).name)}</b> <small class="muted">Arcs firing ${firingArcs(s.id).length}/${maxArcs(s)} · each weapon picks its own target</small></div>
        ${fireStanceNote(s)}
        ${repairPicker(s)}
        <canvas class="sbp-map"></canvas>
        ${ARCS.filter((arc) => arcWeapons(s, arc).length).map((arc) => {
          const on = firingArcs(s.id).includes(arc);
          return `
            <div class="sbp-arc ${on ? 'on' : ''}">
              <div class="sbp-arc-head"><b>${arc === 'turret' ? 'Turret <small>(any direction)</small>' : `${ZONE_NAMES[arc]} arc`}</b><small>${arcOffline(s, arc) ? '⊘ Offline (repair it with Damage Control)' : on ? 'Firing' : 'Not firing'}</small></div>
              ${arcWeapons(s, arc).map((w, wi) => {
                const wd = WEAPONS[w.weapon];
                const used = weaponUsedUp(s, arc, wi);
                const targets = weaponTargets(s, arc, wi, units(), state.asteroids);
                const chosen = draft[arc]?.[wi] || null;
                const unit = wd.effect === 'ion' ? 'shield dmg' : 'dmg';
                return `
                  <div class="sbp-weapon">
                    <div class="sbp-weapon-head"><b>${w.shots} ${escapeHtml(wd.name)}</b>${wd.once ? `<span class="sbp-once">${used ? 'Used up' : 'Once per game'}</span>` : ''}</div>
                    ${used ? '' : targets.length ? `
                      ${targets.map((t) => {
                        const ts = unitById(t.id);
                        const sel = chosen === t.id;
                        return `<button class="sbp-target ${sel ? 'on' : ''} ${rowIndex(arc, wi, t.id) === selRow ? 'cursor' : ''}" data-act="target" data-arc="${arc}" data-wi="${wi}" data-id="${t.id}">
                          <span><span class="dot" style="background:${person(ts.owner).color}"></span>${isSquad(ts) ? '✈ ' : ''}${escapeHtml(unitName(ts))} <small>${escapeHtml(person(ts.owner).name)}</small></span>
                          <span>${BAND_NAMES[t.band]} · ≈${t.expected.toFixed(1)} ${unit} ${sel ? '✔' : ''}</span></button>`;
                      }).join('')}
                      <button class="sbp-target hold ${chosen ? '' : 'on'} ${rowIndex(arc, wi, null) === selRow ? 'cursor' : ''}" data-act="target" data-arc="${arc}" data-wi="${wi}" data-id="">
                        <span>${wd.once ? 'Hold (save it for later)' : 'Hold fire'}</span><span>${chosen ? '' : '✔'}</span></button>`
                    : '<p class="muted sbp-small">No valid targets</p>'}
                  </div>`;
              }).join('')}
            </div>`;
        }).join('')}
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
    const s = shipById(selShip);
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

    for (const r of state.asteroids) {
      ctx.fillStyle = '#4a4458';
      ctx.strokeStyle = '#8a82a0';
      ctx.beginPath();
      ctx.arc(X(r.x), Y(r.y), r.r * k, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    if (state.phase === 'planFire') {
      // Faint wedge for each arc with a weapon, plus lines to the chosen targets.
      const ANG = { front: 0, right: 90, rear: 180, left: -90 };
      if (arcWeapons(s, 'turret').length) {
        // Turret: fires in any direction, so draw a faint ring at long range.
        const chosen = firingArcs(s.id).includes('turret');
        ctx.strokeStyle = chosen ? 'rgba(255,183,3,.45)' : 'rgba(255,255,255,.15)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.arc(X(s.x), Y(s.y), 9.5 * k, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      for (const arc of ZONES) {
        if (!arcWeapons(s, arc).length) continue;
        const chosen = firingArcs(s.id).includes(arc);
        const mid = ((s.heading + ANG[arc]) * Math.PI) / 180;
        ctx.fillStyle = chosen ? 'rgba(255,183,3,.16)' : 'rgba(255,255,255,.05)';
        ctx.beginPath();
        ctx.moveTo(X(s.x), Y(s.y));
        ctx.arc(X(s.x), Y(s.y), 9.5 * k, mid - Math.PI / 4, mid + Math.PI / 4);
        ctx.closePath();
        ctx.fill();
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
      outline(o, o, c, o.id === s.id ? `${c}55` : `${c}22`, o.id === s.id ? 3 : 2);
    }
    // Squadrons: small circles with their role letter.
    for (const q of squads()) {
      if (!q.alive) continue;
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

    if (path) {
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
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
      outline(path[path.length - 1], s, 'rgba(255,255,255,.9)', 'rgba(255,255,255,.12)', 1.5);
    }
  }

  // ---------- Surrender ----------
  const battleRunning = () => ['intro', 'planMove', 'move', 'planFire', 'fire'].includes(state.phase);

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
  }

  function renderView() {
    if (state.phase === 'setup') root.innerHTML = viewSetup();
    else if (state.phase === 'intro') root.innerHTML = viewWatch('Battle stations!', 'Find your ships on the TV.');
    else if (state.phase === 'move') root.innerHTML = viewWatch('Ships are moving', 'Watch the TV.');
    else if (state.phase === 'fire') root.innerHTML = viewWatch('Open fire!', 'Watch the TV.');
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
    const opts = speedOptions(s, d.stance.id);
    if (!opts.includes(speed)) speed = opts.reduce((a, b) => (Math.abs(b - speed) < Math.abs(a - speed) ? b : a));
    const n = Math.max(1, speed);
    const mc = maxClicks(s, speed, d.stance.id);
    d.speed = speed;
    d.clicks = Array.from({ length: n }, (_, i) => Math.max(-mc, Math.min(mc, d.clicks[i] || 0)));
    selSeg = Math.min(selSeg, n - 1);
  }

  function setSpeed(delta) {
    const s = shipById(selShip);
    const d = moveDraft[s.id];
    if (!speedOptions(s, d.stance.id).includes(d.speed + delta)) return;
    fitDraft(s, d, d.speed + delta);
    render();
  }

  function turn(i, delta) {
    const s = shipById(selShip);
    const d = moveDraft[s.id];
    const mc = maxClicks(s, d.speed, d.stance.id);
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
    if (STANCES[id].needsTarget) {
      // Default mark: the nearest living enemy ship.
      const near = state.ships.filter((t) => t.alive && t.faction !== s.faction)
        .sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y))[0];
      d.stance.target = prev.target || near?.id || null;
    }
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

  // Aim one weapon at a target (tapping the same target again, or Hold, holds its fire).
  function pickTarget(arc, wi, targetId) {
    const draft = fireDraft[selShip];
    notice = '';
    const cur = draft[arc]?.[wi] || null;
    if (!targetId || cur === targetId) {
      if (draft[arc]) delete draft[arc][wi];
    } else {
      if (!firingArcs(selShip).includes(arc) && firingArcs(selShip).length >= maxArcs(shipById(selShip))) {
        notice = `Only ${maxArcs(shipById(selShip))} arc${maxArcs(shipById(selShip)) === 1 ? '' : 's'} can fire. Set every weapon in another arc to Hold first.`;
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

  function send() {
    const ships = {};
    for (const s of myLiving()) {
      ships[s.id] = state.phase === 'planMove' ? moveDraft[s.id]
        : Object.entries(fireDraft[s.id]).filter(([, m]) => Object.keys(m).length).map(([arc, targets]) => ({ arc, targets }));
    }
    const msg = { type: state.phase, round: state.round, ready: true, ships };
    if (state.phase === 'planFire') msg.repairs = { ...repairDraft };
    sendInput(msg);
    buzz(20);
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
    else if (act === 'wingOrder') setWing(b.dataset.o);
    else if (act === 'wingTarget') setWing('attack', b.dataset.id);
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
    else if (act === 'stanceTarget') { moveDraft[selShip].stance.target = b.dataset.id; render(); }
    else if (act === 'repair') {
      const keep = repairDraft[selShip]?.crit;
      repairDraft[selShip] = b.dataset.k === 'shields' ? { kind: 'shields', zones: [] } : { kind: b.dataset.k };
      if (keep !== undefined) repairDraft[selShip].crit = keep;
      render();
    }
    else if (act === 'repairZone') { const r = repairDraft[selShip]; if (r.zones.length < repairOf(shipById(selShip)).shields) r.zones.push(b.dataset.z); render(); }
    else if (act === 'repairClear') { repairDraft[selShip].zones = []; render(); }
    else if (act === 'repairCrit') { (repairDraft[selShip] || (repairDraft[selShip] = { kind: 'crit' })).crit = Number(b.dataset.i); render(); }
    else if (act === 'send') send();
    else if (act === 'unready') sendInput({ type: state.phase, round: state.round, ready: false });
  });

  // Keyboard support for laptop testing.
  function onKey(e) {
    if (!state) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const planning = (state.phase === 'planMove' || state.phase === 'planFire') && myLiving().length && !isReady();
    if (state.phase === 'setup') {
      const i = ['1', '2', '3'].indexOf(k);
      if (i >= 0 && FACTIONS[FACTION_ORDER[i]].available) sendInput({ type: 'team', faction: FACTION_ORDER[i] });
      else if (k === 'b') {
        const info = setupInfo();
        const t = info.myTeam && factionShipTypes(info.myTeam).find((x) => !buyProblem(x, info.myTeam, info.mine, info.share, info.teamCount));
        if (t) sendInput({ type: 'buy', shipType: t });
      } else if (k === 'f') {
        // Add the cheapest squadron that fits to the first carrier with room.
        const info = setupInfo();
        if (!info.myTeam) return;
        for (let j = 0; j < info.mine.length; j++) {
          const t = factionSquadTypes(info.myTeam).find((x) => !squadBuyProblem(x, info.myTeam, info.mine, j, info.share));
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
      else if (k === 'ArrowLeft' || k === 'a') turn(selSeg, -1);
      else if (k === 'ArrowRight' || k === 'd') turn(selSeg, 1);
      else if (k === 'q') { selSeg = Math.max(0, selSeg - 1); render(); }
      else if (k === 'e') { selSeg = Math.min(d.clicks.length - 1, selSeg + 1); render(); }
      else if (k === 'o' && hasWing(shipById(selShip)) && !critCount(shipById(selShip), 'comms')) {
        const cur = (d.wing || shipById(selShip).wing || { order: 'escort' }).order;
        setWing(WING_ORDER_LIST[(WING_ORDER_LIST.indexOf(cur) + 1) % WING_ORDER_LIST.length]);
      }
      else if (k === 'z') cycleStance(-1);
      else if (k === 'c') cycleStance(1);
      else if (k === 'n' || k === 'Tab') nextShip();
      else if (k === 'Enter') send();
      else return;
    } else if (planning && state.phase === 'planFire') {
      const rows = fireRows(shipById(selShip));
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
      if (state.phase !== lastPhase && (state.phase === 'planMove' || state.phase === 'planFire')) buzz(60);
      lastPhase = state.phase;
      render();
    },
    destroy() {
      clearInterval(timer);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    },
  };
}
