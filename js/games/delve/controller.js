// Delve the Black Labyrinth – phone side. Shows whatever the TV says is happening:
// character creation, the doors of the current room, choices, combat, your bag and gear.
// Every button sends a small message to the TV, which decides what happens.
// Laptop testing: arrow keys / WASD pick doors, number keys press the numbered buttons.
import { escapeHtml } from '../../supabase.js';
import { spriteEl } from './art.js';

const KEYS = { ArrowUp: 'n', ArrowDown: 's', ArrowLeft: 'w', ArrowRight: 'e', w: 'n', s: 's', a: 'w', d: 'e' };
const DIR_NAME = { n: 'North', e: 'East', s: 'South', w: 'West' };

export function mount({ container, me, sendInput }) {
  loadCss();
  container.innerHTML = '<div class="dvp"></div>';
  const root = container.firstElementChild;
  let S = null;
  let tab = 'room';      // room | char | bag
  let sub = '';          // '' | skill | item | scry:<bagIndex> | pray
  let lastPhase = '';
  let reactTimer = 0;

  const send = (m) => { sendInput(m); if (navigator.vibrate) navigator.vibrate(8); };
  const esc = (s) => escapeHtml(String(s ?? ''));
  const nl = (s) => esc(s).replace(/\n/g, '<br>');
  let keyN = 0;
  const btn = (label, act, opts = {}) => {
    const k = opts.disabled ? '' : ` data-k="${++keyN}"`;
    return `<button class="dvp-btn ${opts.cls || ''}" data-act='${esc(JSON.stringify(act))}'${opts.disabled ? ' disabled' : ''}${k}>${label}${opts.sub ? `<small>${opts.sub}</small>` : ''}</button>`;
  };

  function bars(h) {
    return `<div class="dvp-top">
      <div class="dvp-name"><b>${esc(h.name)}</b> <span>${esc(h.bgName)} · Lv ${h.level}</span><span class="dvp-gold">💰 ${h.gold}</span></div>
      <div class="dvp-bar hp"><i style="width:${(h.hp / h.maxHp) * 100}%"></i><em>HP ${h.hp} / ${h.maxHp}</em></div>
      ${h.xpNext ? `<div class="dvp-bar xp"><i style="width:${Math.min(100, (h.xp / h.xpNext) * 100)}%"></i><em>XP ${h.xp} / ${h.xpNext}</em></div>` : '<div class="dvp-bar xp"><i style="width:100%"></i><em>Max level</em></div>'}
      ${h.poison || h.dark ? `<div class="dvp-fx">${h.poison ? '☠ Poisoned (−1 HP per room)' : ''}${h.poison && h.dark ? ' · ' : ''}${h.dark ? '🌑 Darkness (−2 to checks)' : ''}</div>` : ''}
    </div>`;
  }

  function itemLine(it) {
    return `<span class="dvp-item" style="color:${it.color}">${it.icon} ${esc(it.name)}</span><small>${esc(it.text)}</small>`;
  }

  function charView(h) {
    return `<div class="dvp-card">
      <div class="dvp-stats">${h.stats.map((s) => `<div>${s.name}<b>${s.v}</b><small>${s.mod >= 0 ? '+' : ''}${s.mod}</small></div>`).join('')}</div>
      <p class="dvp-mini">Defense ${h.def}${h.heavy ? ' · ⚠ armor too heavy: −2 DEX' : ''}</p>
      <h3>Equipment</h3>
      <div class="dvp-gear">${h.gear.map((g) => `<div class="${g.item ? '' : 'empty'}"><span>${g.name}</span>${g.item ? `${itemLine(g.item)}${g.item.stuck ? '<em>cursed: stuck</em>' : (S.phase === 'explore' ? btn('Take off', { a: 'unequip', slot: g.slot }, { cls: 'tiny ghost' }) : '')}` : '<span class="none">—</span>'}</div>`).join('')}</div>
      <h3>Skills</h3>
      ${h.skills.length ? h.skills.map((s) => `<div class="dvp-skill"><b>${esc(s.name)}</b>${s.cd ? `<span>cooldown ${s.cd}</span>` : ''}<small>${esc(s.desc)}</small></div>`).join('') : '<p class="dvp-mini">None yet. Tomes, scrolls and some gear teach skills.</p>'}
    </div>`;
  }

  function bagView(h, mode) {
    const rows = h.bag.map((it) => {
      const acts = [];
      if (mode === 'explore') {
        if (it.peek) acts.push(btn('Use at a door', { local: `scry:${it.i}` }, { cls: 'tiny' }));
        else if (it.teach) acts.push(btn('Read', { a: 'use', i: it.i }, { cls: 'tiny' }));
        else if (it.explore) acts.push(btn('Use', { a: 'use', i: it.i }, { cls: 'tiny' }));
        acts.push(btn('Drop', { a: 'drop', i: it.i }, { cls: 'tiny ghost' }));
      }
      return `<div class="dvp-bagrow"><div>${itemLine(it)}</div><div class="dvp-acts">${acts.join('')}</div></div>`;
    }).join('');
    return `<div class="dvp-card"><h3>Bag (${h.bag.length}/${h.bagCap})</h3>${rows || '<p class="dvp-mini">Empty.</p>'}</div>`;
  }

  function tabs() {
    return `<div class="dvp-tabs">${[['room', 'Room'], ['char', 'Character'], ['bag', 'Bag']].map(([t, l]) => `<button class="${tab === t ? 'on' : ''}" data-tab="${t}">${l}</button>`).join('')}</div>`;
  }

  function render() {
    keyN = 0;
    clearInterval(reactTimer);
    if (!S) { root.innerHTML = '<div class="dvp-msg"><h2>Loading…</h2></div>'; return; }
    if (S.phase !== lastPhase) { sub = ''; if (S.phase !== 'explore') tab = 'room'; lastPhase = S.phase; }
    const h = S.hero;
    let html = '';

    if (S.phase === 'create') {
      const c = S.create;
      if (c.step === 'pick') {
        html = `<h1 class="dvp-title">Choose your background</h1><div class="dvp-bgs">${c.bgs.map((b) => `
          <button class="dvp-bg" data-act='${esc(JSON.stringify({ a: 'bg', bg: b.id }))}' data-k="${++keyN}">
            <span class="dvp-spr" data-spr="${b.id}" data-s="3"></span>
            <span><b>${esc(b.name)}</b><em>${esc(b.lean)}</em><small>${esc(b.blurb)}</small><small>Gear: ${esc(b.gear)}</small><small>Skill: <b>${esc(b.skill)}</b>. ${esc(b.skillDesc)}</small></span>
          </button>`).join('')}</div>`;
      } else {
        html = `<h1 class="dvp-title">${esc(h.name)} the ${esc(h.bgName)}</h1>
          <div class="dvp-hero"><span class="dvp-spr" data-spr="${h.bg}" data-s="5"></span></div>
          <div class="dvp-card"><div class="dvp-stats">${h.stats.map((s) => `<div>${s.name}<b>${s.v}</b><small>${s.mod >= 0 ? '+' : ''}${s.mod}</small></div>`).join('')}</div>
          <p class="dvp-mini">HP ${h.maxHp} · Defense ${h.def}</p></div>
          ${c.spells ? `<div class="dvp-card"><h3>Your starting spell</h3>${c.spells.map((s) => btn(`${s.on ? '✓ ' : ''}${esc(s.name)}`, { a: 'spell', spell: s.id }, { cls: s.on ? 'on' : 'ghost', sub: esc(s.desc) })).join('')}</div>` : ''}
          ${btn(`🎲 Re-roll stats${h.rerolls ? ' (1 left)' : ''}`, { a: 'reroll' }, { disabled: !h.rerolls, cls: 'ghost' })}
          ${btn('Enter the Labyrinth', { a: 'begin' }, { cls: 'red big' })}
          ${btn('← Pick another background', { a: 'back' }, { cls: 'ghost tiny' })}`;
      }
    } else if (S.phase === 'intro') {
      html = `${bars(h)}<div class="dvp-msg"><h2>Into the dark…</h2><p>Watch the TV.</p></div>`;
    } else if (S.phase === 'explore' || S.phase === 'walk') {
      html = bars(h) + tabs();
      if (tab === 'char') html += charView(h);
      else if (tab === 'bag') html += bagView(h, 'explore');
      else {
        const r = S.room;
        const walking = S.phase === 'walk';
        const doorBtn = (dir) => {
          const dd = r.doors[dir];
          if (!dd) return `<div class="dvp-wall">${DIR_NAME[dir]}<small>wall</small></div>`;
          if (sub.startsWith('scry')) return btn(DIR_NAME[dir], { a: 'use', i: +sub.split(':')[1], dir }, { disabled: dd.visited || !!dd.known, cls: 'gold', sub: dd.known || (dd.visited ? 'visited' : 'scry here') });
          if (sub === 'pray') return btn(DIR_NAME[dir], { a: 'pray', dir }, { disabled: dd.visited || !!dd.known || dd.prayLocked, cls: 'gold', sub: dd.prayLocked ? 'prayer failed' : dd.known || (dd.visited ? 'visited' : 'pray here') });
          return btn(`${dd.came ? '↩ ' : ''}${DIR_NAME[dir]}`, { a: 'door', dir }, { disabled: walking, cls: dd.came ? 'ghost' : '', sub: dd.came ? 'came from' : (dd.known ? esc(dd.known) : dd.visited ? 'visited' : '?') });
        };
        html += `<div class="dvp-room"><h2>${esc(r.label)}</h2>${r.hint ? `<p class="dvp-hint">${esc(r.hint)}</p>` : ''}</div>
          ${sub ? `<p class="dvp-mini center">${sub === 'pray' ? '🙏 Pray at which door? (WIS check. Fail and that door stays dark.)' : '✨ Scry through which door?'}</p>` : ''}
          <div class="dvp-compass"><div></div>${doorBtn('n')}<div></div>${doorBtn('w')}<div class="dvp-mid">${walking ? 'Walking…' : 'Choose<br>a door'}</div>${doorBtn('e')}<div></div>${doorBtn('s')}<div></div></div>
          ${sub ? btn('Cancel', { local: '' }, { cls: 'ghost' }) : (r.canPray ? btn('🙏 Prayer: peek behind a door', { local: 'pray' }, { cls: 'gold' }) : '')}
          <div class="dvp-log">${S.log.map((l) => `<div>${esc(l)}</div>`).join('')}</div>`;
      }
    } else if (S.phase === 'event') {
      const ev = S.ev;
      html = bars(h) + `<div class="dvp-card ev">
        <h2>${esc(ev.title)}</h2>
        ${ev.item ? `<div class="dvp-found">${itemLine(ev.item)}</div>` : ''}
        ${ev.text ? `<p>${nl(ev.text)}</p>` : ''}
      </div>
      <div class="dvp-choices">${ev.choices.map((c, i) => btn(esc(c.label), { a: 'choice', i }, { disabled: c.disabled, sub: esc(c.sub), cls: i === 0 && ev.choices.length === 1 ? 'red' : '' })).join('')}</div>`;
    } else if (S.phase === 'combat') {
      const C = S.combat;
      const mine = C.turn === 'hero';
      html = bars(h) + `<div class="dvp-foe"><span class="dvp-spr" data-spr="${C.sprite}" data-s="${C.boss ? 3 : 4}" data-flip="1"></span></div>
        <div class="dvp-bar foe"><i style="width:${(C.hp / C.maxHp) * 100}%"></i><em>${esc(C.name)} ${C.hp} / ${C.maxHp}</em></div>
        ${C.effects.length ? `<p class="dvp-mini center">${C.effects.map(esc).join(' · ')}</p>` : ''}
        <div class="dvp-log">${C.log.map((l) => `<div>${esc(l)}</div>`).join('')}</div>`;
      if (C.turn === 'reaction') {
        html += `<div class="dvp-react">${btn('⚔ RIPOSTE!', { a: 'react', use: true }, { cls: 'red big', sub: '<span class="dvp-count"></span>' })}${btn('Let it go', { a: 'react', use: false }, { cls: 'ghost' })}</div>`;
      } else if (sub === 'skill') {
        const sk = h.skills.filter((s) => s.kind === 'attack');
        html += `<div class="dvp-choices">${sk.map((s) => btn(esc(s.name), { a: 'skill', skill: s.id }, { disabled: !mine || s.left > 0, sub: s.left > 0 ? `ready in ${s.left} round${s.left > 1 ? 's' : ''}` : esc(s.desc) })).join('') || '<p class="dvp-mini center">No combat skills yet.</p>'}${btn('Back', { local: '' }, { cls: 'ghost' })}</div>`;
      } else if (sub === 'item') {
        const items = h.bag.filter((it) => it.combat);
        html += `<div class="dvp-choices">${items.map((it) => btn(`${it.icon} ${esc(it.name)}`, { a: 'item', i: it.i }, { disabled: !mine, sub: esc(it.text) })).join('') || '<p class="dvp-mini center">Nothing in your bag you can use in a fight.</p>'}${btn('Back', { local: '' }, { cls: 'ghost' })}</div>`;
      } else {
        const ready = h.skills.filter((s) => s.kind === 'attack' && !s.left).length;
        html += `<p class="dvp-turn ${mine ? 'mine' : ''}">${mine ? 'Your turn' : C.turn === 'over' ? 'Victory!' : 'Enemy turn…'}</p>
          <div class="dvp-grid">${btn('ATTACK', { a: 'attack' }, { disabled: !mine, cls: 'red' })}${btn('SKILL', { local: 'skill' }, { disabled: !mine, sub: `${ready} ready` })}${btn('ITEM', { local: 'item' }, { disabled: !mine || !h.bag.some((i) => i.combat), sub: `${h.bag.filter((i) => i.combat).length} usable` })}${btn('FLEE', { a: 'flee' }, { disabled: !mine || C.boss, sub: C.boss ? 'no escape' : 'DEX check' })}</div>`;
      }
    } else if (S.phase === 'dead' || S.phase === 'won') {
      html = `<div class="dvp-msg"><h2 class="${S.phase === 'won' ? 'won' : 'lost'}">${S.phase === 'won' ? 'You escaped!' : 'You died'}</h2><p>See the TV for your run.</p>
        ${btn('Play again', { a: 'again' }, { cls: 'red big' })}${btn('Back to the menu', { a: 'menu' }, { cls: 'ghost' })}</div>`;
    }
    root.innerHTML = html;
    // pixel sprites
    root.querySelectorAll('[data-spr]').forEach((el) => el.appendChild(spriteEl(el.dataset.spr, +el.dataset.s, el.dataset.flip === '1')));
    if (S.phase === 'combat' && S.combat.turn === 'reaction') {
      const tick = () => { const el = root.querySelector('.dvp-count'); if (el) el.textContent = `${Math.max(0, Math.ceil((S.combat.reactionUntil - Date.now()) / 1000))}s`; };
      tick(); reactTimer = setInterval(tick, 250);
    }
  }

  root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]');
    if (t) { tab = t.dataset.tab; sub = ''; render(); return; }
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const act = JSON.parse(b.dataset.act);
    if ('local' in act) { sub = act.local; if (sub.startsWith('scry')) tab = 'room'; render(); return; }
    if (act.a === 'use' && act.dir) sub = '';
    if (act.a === 'pray') sub = '';
    if (['attack', 'skill', 'item', 'flee'].includes(act.a)) sub = '';
    send(act);
  });

  const onKey = (e) => {
    if (e.target.closest && e.target.closest('input,textarea')) return;
    if (S && (S.phase === 'explore') && tab === 'room' && !sub && KEYS[e.key]) {
      const dir = KEYS[e.key];
      if (S.room.doors[dir]) send({ a: 'door', dir });
      e.preventDefault();
      return;
    }
    if (/^[1-9]$/.test(e.key)) {
      const b = root.querySelector(`[data-k="${e.key}"]`);
      if (b) { b.click(); e.preventDefault(); }
    }
  };
  window.addEventListener('keydown', onKey);

  return {
    update(state) { S = state; render(); },
    destroy() { clearInterval(reactTimer); window.removeEventListener('keydown', onKey); },
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
