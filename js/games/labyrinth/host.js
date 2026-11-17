// Labyrinth – TV side. The TV is the referee: it owns the maze,
// moves everyone, and decides tags, escapes and the winner.
import { escapeHtml } from '../../supabase.js';

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const ESCAPEE_STEP_MS = 170; // time to move one tile
const MINOTAUR_STEP_MS = 145; // the Minotaur is a bit faster
const INTRO_MS = 5000;
const TAG_DISTANCE = 0.7; // in tiles

let lastMinotaurId = null;

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Classic "recursive backtracker" maze, then knock out a few extra walls
// so there are loops (otherwise the Minotaur can trap people too easily).
function generateMaze(cw, ch) {
  const W = cw * 2 + 1;
  const H = ch * 2 + 1;
  const g = Array.from({ length: H }, () => new Array(W).fill(1));
  const visited = Array.from({ length: ch }, () => new Array(cw).fill(false));
  const start = [Math.floor(Math.random() * cw), Math.floor(Math.random() * ch)];
  const stack = [start];
  visited[start[1]][start[0]] = true;
  g[start[1] * 2 + 1][start[0] * 2 + 1] = 0;
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const options = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => {
      const nx = cx + dx, ny = cy + dy;
      return nx >= 0 && ny >= 0 && nx < cw && ny < ch && !visited[ny][nx];
    });
    if (!options.length) { stack.pop(); continue; }
    const [dx, dy] = options[Math.floor(Math.random() * options.length)];
    const nx = cx + dx, ny = cy + dy;
    g[cy * 2 + 1 + dy][cx * 2 + 1 + dx] = 0;
    g[ny * 2 + 1][nx * 2 + 1] = 0;
    visited[ny][nx] = true;
    stack.push([nx, ny]);
  }
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const between = (x % 2 === 0 && y % 2 === 1) || (x % 2 === 1 && y % 2 === 0);
      if (between && g[y][x] === 1 && Math.random() < 0.14) g[y][x] = 0;
    }
  }
  return { g, W, H };
}

export function start({ container, players, setPhoneState, onExit }) {
  const n = players.length;
  const cw = 9 + n * 2;
  const ch = Math.max(7, Math.round(cw * 0.55));
  const { g, W, H } = generateMaze(cw, ch);
  const midY = Math.floor(ch / 2) * 2 + 1;
  const exits = [[0, midY], [W - 1, midY]];
  for (const [x, y] of exits) g[y][x] = 0;
  const isExit = (x, y) => exits.some(([ex, ey]) => ex === x && ey === y);

  // Pick the Minotaur (try not to pick the same person twice in a row).
  let pool = players.filter((p) => p.id !== lastMinotaurId);
  if (!pool.length) pool = players;
  const minotaurId = pool[Math.floor(Math.random() * pool.length)].id;
  lastMinotaurId = minotaurId;

  const corners = shuffle([[1, 1], [W - 2, 1], [1, H - 2], [W - 2, H - 2]]);
  const center = [Math.floor(cw / 2) * 2 + 1, midY];
  let cornerIndex = 0;
  const actors = players.map((p) => {
    const isM = p.id === minotaurId;
    const [x, y] = isM ? center : corners[cornerIndex++];
    return {
      id: p.id, name: p.name, color: p.color,
      role: isM ? 'minotaur' : 'escapee',
      x, y, fromX: x, fromY: y, moveStart: 0,
      stepMs: isM ? MINOTAUR_STEP_MS : ESCAPEE_STEP_MS,
      dir: null, want: null, status: 'playing',
    };
  });
  const minotaur = actors.find((a) => a.role === 'minotaur');
  const escapees = actors.filter((a) => a.role === 'escapee');
  const durationMs = (60 + 15 * escapees.length) * 1000;

  let phase = 'intro';
  let phaseEndsAt = performance.now() + INTRO_MS;
  let result = null;
  let flashes = []; // tag effects: { x, y, until }

  container.innerHTML = `
    <div class="lab">
      <div class="lab-hud">
        <div class="lab-title">🐂 Labyrinth</div>
        <div class="lab-score"></div>
        <div class="lab-timer"></div>
      </div>
      <div class="lab-board"><canvas></canvas></div>
      <div class="lab-overlay"></div>
    </div>`;
  const board = container.querySelector('.lab-board');
  const canvas = container.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const timerEl = container.querySelector('.lab-timer');
  const scoreEl = container.querySelector('.lab-score');
  const overlay = container.querySelector('.lab-overlay');
  let tile = 20;

  function resize() {
    const r = board.getBoundingClientRect();
    tile = Math.max(6, Math.floor(Math.min(r.width / W, r.height / H)));
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${tile * W}px`;
    canvas.style.height = `${tile * H}px`;
    canvas.width = tile * W * dpr;
    canvas.height = tile * H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  function pushPhoneState() {
    setPhoneState({
      phase,
      minotaurId,
      roles: Object.fromEntries(actors.map((a) => [a.id, a.role])),
      status: Object.fromEntries(actors.map((a) => [a.id, a.status])),
      result,
    });
  }

  function showIntro() {
    overlay.className = 'lab-overlay show';
    overlay.innerHTML = `
      <div class="lab-panel">
        <p class="eyebrow">This round's Minotaur is</p>
        <h2 style="color:${minotaur.color}">${escapeHtml(minotaur.name)}</h2>
        <p>Escapees: reach a <b class="green">green exit</b>. Minotaur: tag them before they get out.</p>
        <p class="countdown"></p>
      </div>`;
  }

  function showResults() {
    const escaped = escapees.filter((a) => a.status === 'escaped').length;
    overlay.className = 'lab-overlay show';
    overlay.innerHTML = `
      <div class="lab-panel">
        <p class="eyebrow">${escaped} of ${escapees.length} escaped</p>
        <h2>${result === 'escapees' ? 'The Escapees win!' : 'The Minotaur wins!'}</h2>
        <ul class="lab-results">
          ${actors.map((a) => `
            <li><span class="dot" style="background:${a.color}"></span>${escapeHtml(a.name)}
              <span class="tag ${a.role === 'minotaur' ? 'minotaur' : a.status}">${a.role === 'minotaur' ? 'Minotaur' : a.status === 'escaped' ? 'Escaped' : 'Caught'}</span></li>`).join('')}
        </ul>
        <div class="lab-buttons">
          <button class="big-btn" data-act="again">Play again</button>
          <button class="big-btn ghost" data-act="menu">Back to games</button>
        </div>
      </div>`;
    overlay.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => onExit(b.dataset.act)));
  }

  function canEnter(a, x, y) {
    if (x < 0 || y < 0 || x >= W || y >= H) return false;
    if (g[y][x] === 1) return false;
    if (a.role === 'minotaur' && isExit(x, y)) return false;
    return true;
  }

  function stepActor(a, now) {
    if (now - a.moveStart < a.stepMs) return;
    for (const d of [a.want, a.dir]) {
      if (!d) continue;
      const [dx, dy] = DIRS[d];
      if (canEnter(a, a.x + dx, a.y + dy)) {
        // Chain moves back-to-back so continuous movement looks smooth.
        a.moveStart = now - a.moveStart < a.stepMs * 2 ? a.moveStart + a.stepMs : now;
        a.fromX = a.x; a.fromY = a.y;
        a.x += dx; a.y += dy;
        a.dir = d;
        return;
      }
    }
    a.dir = null;
    a.fromX = a.x; a.fromY = a.y;
  }

  function pos(a, now) {
    const t = Math.min(1, Math.max(0, (now - a.moveStart) / a.stepMs));
    return [a.fromX + (a.x - a.fromX) * t, a.fromY + (a.y - a.fromY) * t];
  }

  function endRound() {
    for (const e of escapees) if (e.status === 'playing') e.status = 'caught';
    const escaped = escapees.filter((a) => a.status === 'escaped').length;
    result = escaped >= Math.ceil(escapees.length / 2) ? 'escapees' : 'minotaur';
    phase = 'over';
    pushPhoneState();
    showResults();
  }

  function update(now) {
    if (phase === 'intro') {
      const left = Math.ceil((phaseEndsAt - now) / 1000);
      const cd = overlay.querySelector('.countdown');
      if (cd) cd.textContent = left > 0 ? left : 'GO!';
      if (now >= phaseEndsAt) {
        phase = 'playing';
        phaseEndsAt = now + durationMs;
        for (const a of actors) a.moveStart = now - a.stepMs;
        overlay.className = 'lab-overlay';
        pushPhoneState();
      }
      return;
    }
    if (phase !== 'playing') return;

    let changed = false;
    for (const a of actors) if (a.status === 'playing') stepActor(a, now);

    const [mx, my] = pos(minotaur, now);
    for (const e of escapees) {
      if (e.status !== 'playing') continue;
      if (isExit(e.x, e.y)) { e.status = 'escaped'; changed = true; continue; }
      const [ex, ey] = pos(e, now);
      if (Math.hypot(ex - mx, ey - my) < TAG_DISTANCE) {
        e.status = 'caught';
        flashes.push({ x: ex, y: ey, color: e.color, until: now + 900 });
        changed = true;
      }
    }
    if (changed) pushPhoneState();
    if (!escapees.some((e) => e.status === 'playing') || now >= phaseEndsAt) endRound();
  }

  function drawHud(now) {
    const left = phase === 'playing' ? Math.max(0, phaseEndsAt - now) : phase === 'intro' ? durationMs : 0;
    const s = Math.ceil(left / 1000);
    timerEl.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    timerEl.classList.toggle('urgent', phase === 'playing' && s <= 10);
    const esc = escapees.filter((a) => a.status === 'escaped').length;
    const cau = escapees.filter((a) => a.status === 'caught').length;
    scoreEl.innerHTML = `<span class="green">Escaped ${esc}</span> · <span class="red">Caught ${cau}</span> · Still running ${escapees.length - esc - cau}`;
  }

  function draw(now) {
    const T = tile;
    ctx.fillStyle = '#2a2438';
    ctx.fillRect(0, 0, W * T, H * T);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (g[y][x] === 1) {
          ctx.fillStyle = '#5b4d7a';
          ctx.fillRect(x * T, y * T, T, T);
          ctx.fillStyle = '#6f5f94';
          ctx.fillRect(x * T, y * T, T, Math.max(2, T * 0.18));
        }
      }
    }
    const pulse = 0.6 + 0.4 * Math.sin(now / 250);
    for (const [x, y] of exits) {
      ctx.fillStyle = `rgba(81, 207, 102, ${pulse})`;
      ctx.fillRect(x * T, y * T, T, T);
    }

    flashes = flashes.filter((f) => f.until > now);
    for (const f of flashes) {
      const k = (f.until - now) / 900;
      ctx.strokeStyle = f.color;
      ctx.globalAlpha = k;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc((f.x + 0.5) * T, (f.y + 0.5) * T, T * (1.6 - k), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    for (const a of escapees) if (a.status === 'playing') drawEscapee(a, now);
    drawMinotaur(minotaur, now);
  }

  function drawEscapee(a, now) {
    const T = tile;
    const [x, y] = pos(a, now);
    const cx = (x + 0.5) * T, cy = (y + 0.5) * T;
    ctx.fillStyle = a.color;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = Math.max(1.5, T * 0.08);
    ctx.beginPath();
    ctx.arc(cx, cy, T * 0.36, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    label(a.name, cx, cy - T * 0.55, a.color);
  }

  function drawMinotaur(a, now) {
    const T = tile;
    const [x, y] = pos(a, now);
    const cx = (x + 0.5) * T, cy = (y + 0.5) * T;
    ctx.fillStyle = '#f1e3c8';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + s * T * 0.22, cy - T * 0.28);
      ctx.lineTo(cx + s * T * 0.58, cy - T * 0.6);
      ctx.lineTo(cx + s * T * 0.38, cy - T * 0.12);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#b3261e';
    ctx.strokeStyle = a.color;
    ctx.lineWidth = Math.max(2, T * 0.12);
    ctx.beginPath();
    ctx.arc(cx, cy, T * 0.44, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffd43b';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx + s * T * 0.15, cy - T * 0.05, T * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
    label(a.name, cx, cy - T * 0.75, '#ff8787');
  }

  function label(text, x, y, color) {
    const size = Math.max(10, Math.round(tile * 0.5));
    ctx.font = `700 ${size}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,.75)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  let raf = 0;
  function frame(now) {
    update(now);
    drawHud(now);
    draw(now);
    raf = requestAnimationFrame(frame);
  }

  showIntro();
  pushPhoneState();
  raf = requestAnimationFrame(frame);

  return {
    handleInput(id, msg) {
      const a = actors.find((x) => x.id === id);
      if (!a) return;
      const d = DIRS[msg.dir] ? msg.dir : null;
      a.want = d;
      if (!d) a.dir = null;
    },
    setOnline(onlineIds) {
      // If someone's phone drops, stop their character instead of letting it run.
      for (const a of actors) if (!onlineIds.has(a.id)) { a.want = null; a.dir = null; }
    },
    stop() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    },
  };
}
