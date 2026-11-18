# Space Battles — Build Brief (Milestone 3)

This file tells a new coding chat **what to build next** and **how the existing code works**.

- **Rules (source of truth):** [space-battles-rules.md](space-battles-rules.md) (Draft 2). If this brief
  and the rules disagree, the rules win.
- **⚠ items in the rules are not confirmed.** Ask the user about each ⚠ item before building it.
  If something isn't covered at all, ask; don't invent rules. Batch questions, give a recommended
  pick for each, and let the user answer "picks are fine".
- **Project rules:** [../CLAUDE.md](../CLAUDE.md). Read it first: **no Node / npm / build step**, plain
  HTML/CSS/JS ES modules, CDN libraries pinned from `cdn.jsdelivr.net`, only the BaronBlitzen GitHub
  account, repo-local git config only.
- **The user is a beginner.** Explain plainly, give exact clicks and commands.
- **Don't push until the user says so.** Commit only when asked.
- History: Milestone 1 brief is [space-battles-build-brief.md](space-battles-build-brief.md).

---

## Goal of Milestone 3

Build **everything in the rules that isn't built yet** (rules §12, v3), in this order. Finish, test
and report each step before starting the next, so the user can playtest in between.

1. **Fleet building, point costs, surrender, no round limit** — **built** (decisions in rules §1)
   - Setup: mission picker on the TV (only "Battle" works until step 7; show the others as "coming
     in this milestone" or hide them), team select, then per-player fleet building with the 60-point
     side cap split between teammates, ship + weapon descriptions, Ready.
   - Remove the preset scenario fleets and the claim/release flow; ships deploy automatically along
     the team's edge (spread evenly in y).
   - Remove the 8-round limit and the "fleet value after round 8" ending. Win = last fleet standing
     or the other team surrenders (team vote, §1).
   - Player cap stays 8. The "switch teams" message now triggers when a player's share can't buy the
     faction's cheapest ship.
2. **New weapons + split fire** — **built** (decisions in rules §9 "Weapon details")
   - Add the ★ weapons and the new loadouts from rules §9 (ask about the ⚠ stats first).
   - Each weapon in a fired arc picks its own target (max 2 arcs per ship).
   - Once-per-game weapons (Torpedo Volley, Boarding Harpoon): "Hold / Fire" on the phone; used up
     after firing. Lancer front arc = 1 Railgun + the one-time Torpedo Volley.
   - Ion (shield-only damage), Acid (delayed hull damage), Grapple (pull + no speed-up), Disruptor
     (−1 click next round), Flechette (better vs squadrons, used in step 5), Particle Lance.
3. **Stances** — **built** (decisions in rules §5 "Stance details") (rules §5, incl. the decided details, Trained helms, Samurai engineers, no-repeat rule,
   stance icons on the TV, Damage Control choice on the phone).
4. **Criticals** — **built** (decisions in rules §7 "Critical details"). Boarding Harpoon auto-crit included.
5. **Squadrons** — **built** (decisions in rules §8 "Squadron details"): buying them in fleet building,
   wing orders, movement after ships, automatic attacks, point-defense, Warden Screen, Hangar repair,
   Boarding Pods, kill points (tracked, not shown yet), Comms Down.
6. **Obstacles** (rules §2): each map picks 2 of the 5 obstacle types at random. Nebula, planet
   (gravity), debris field, mines, plus the existing random asteroids.
7. **Missions + scores** (rules §10): kill points on the TV, Control Points, Salvage, Escort, Station
   Assault, Random, first to 10.

---

## How the existing code works

All Space Battles code is in `js/games/space-battles/`. The site shell is `index.html` + `js/host.js`
(TV) and `join.html` + `js/phone.js` (phones); see CLAUDE.md for the channel/message design.

| File | What it holds |
|---|---|
| `data.js` | Plain data: `FACTIONS` (with `color`, `shades` for per-player colors, `edge`, `traits.ram`, `traits.home`), `FACTION_ORDER`, `WEAPONS`, `RANGE_BANDS`, `CLASSES` (sizes, value), `ZONES`, `ARCS` (= `turret` + zones), `ZONE_NAMES`, `SHIPS` (with `cost`, `desc`), `MOVE`, `TIMING`, `FLEET` (60 points, 10 ships), `MISSIONS`, `SCENARIOS.m1`. Weapons have a `desc`, and optionally `once`, `effect` (`ion`, `acid`, `grapple`, `disrupt`, `board`), `pull`, `hitVsSquadron`. |
| `rules.js` | **Pure, deterministic** shared logic (no DOM, no randomness): geometry, `zoneFacing`, `inArc` (turret = any direction), `rangeBand`, `lineOfSight`, per-weapon fire: `weaponTargets`, `weaponKey`, `weaponUsedUp`, `expectedWeaponDamage`, `defaultFirePlan`, `sanitizeFirePlan`, `speedOptions` (handles the Pirate `burn` flag), `maxClicks` (handles `clicksAtSpeed` and `disrupted`; `speedOptions` handles `grappled`), `poseAt` / `planWaypoints` (turn first, then straight), `applyDamage`, `applyShieldDamage` (Ion), `applyHullDamage` (Acid), `pullToward` (Grapple), `simulateMove`, `fleetValue`, and fleet building: `factionShipTypes`, `cheapestShipCost`, `pointShare`, `fleetCost`, `buyProblem`. |
| `host.js` | TV: setup screen (mission picker, teams, fleets per player, budget checks), surrender votes, phase machine and timers, resolving move and fire (all dice rolls here), canvas drawing, results. |
| `controller.js` | Phone: team select, fleet building (shipyard with details), Surrender bar, My Fleet, movement planner (mini-map + ghost path), fire planner. |

Key details:
- **Ship data** in `SHIPS`: `arcs` is `{ turret?, front, left, right, rear }`, each a list of
  `{ weapon, shots }`. Optional fields: `clicksAtSpeed` (e.g. Broodmaw `{1: 2}`), `ramDamage`
  (Dreadhulk 5), `pd`, `squadrons`.
- **Runtime ship**: `{ id, type, faction, owner, x, y, heading, speed, hull, shields, alive }` plus
  host-only flags (`homeUsed`, `burnRound`). Also sent to phones: `burn`, `used` (once-per-game weapons fired, keyed "arc:index"), `acidDue` (round → acid damage), `disrupted` and `grappled` (for the next move only; cleared after the move). `publicShip()` in host.js decides what phones see.
- **simulateMove** (rules.js): steps 120 ticks. Asteroids and the map edge stop a ship mid-path. Ships
  pass through each other; afterwards, ships whose outlines overlap at the end are pulled back tick by
  tick until apart, then collision/ram damage applies. Stopped ships drop to min speed. Returns
  `{ ships, frames, events }`. The TV animates from `frames`.
- **Random asteroids**: `SCENARIOS.m1.asteroidField`; `rollAsteroids()` in host.js makes a new layout
  per battle and sends it to phones in the state (`asteroids`).
- **Deployment**: `deploy()` in host.js puts each faction on its `edge` (Pirates: the free edge), spread evenly in y in the order ships are built (players in join order).
- **Setup state** (host.js): `teams` (id → faction), `fleets` (id → list of ship types), `mission`. Ships are only created in `beginBattle()`.
- **Phase machine** (host.js): `setup → intro → planMove → move → planFire → fire → (planMove …) → over`.
  Logic runs on a 100 ms `setInterval` (`tick` + `drawHud`), drawing on `requestAnimationFrame`.
- **Phone state** (`setPhoneState`): `{ phase, phaseKey, round, secondsLeft, scenarioId, mission, fleets (setup only), surrender, map,
  asteroids, factions, people, teams, ready, problems, ships, squads, kills, result }`. One state goes to every
  phone, so **never put secret plans in it**. Phones keep their own drafts locally, keyed by
  `phaseKey`.
- **Phone → TV inputs**: `team`, `buy { shipType }`, `remove { index }`, `buySquad { index, squadType }`, `removeSquad { index, slot }`, `ready`, `surrender { on }`, `planMove { round, ready, ships }`,
  `planFire { round, ready, ships }`. The TV sanitizes every plan (`sanitizeMovePlan` /
  `sanitizeFirePlan`) and falls back to defaults.
- **Fire plan format**: `{ [shipId]: [{ arc, targets: { [weaponIndex]: targetId } }] }`, at most 2 arcs.
  A weapon left out of `targets` holds its fire. Each weapon is its own attack (`rollWeapon` in host.js).
  Once-per-game weapons are marked in `ship.used` when fired. Acid due this round burns at the end of
  `resolveFire`; Grapple pulls are animated from `anim.pulls`, and effect labels from `anim.tags`.
- **Stances** (step 3): `STANCES` / `STANCE_ORDER` / `CLASS_STANCES` in data.js hold the numbers; faction traits
  `trainedHelms` and `repair` (Samurai). Move plan = `{ speed, clicks, stance: { id, zone?, target? } }`.
  rules.js: `stanceOptions` (no repeats via `ship.lastStance`), `speedOptions(ship, stanceId)`,
  `maxClicks(ship, speed, stanceId)`, `sanitizeStance`, `maxArcs`, `huntTarget`, `shotBonus`, `arcShots`
  (final shots per weapon), `stanceDamage` (Brace / Overcharge), `shieldsOff` + `ship.tempShields` (Shield
  Charge, Full Burn), `repairOf` / `sanitizeRepair` / `applyRepair` (Damage Control). host.js keeps the
  stance secret in `movePlans` until `resolveMove` copies it to `ship.stance`; `startPlan('planMove')` moves
  it to `lastStance`. Plan Fire input also carries `repairs { shipId: { kind, zones? } }`.
- **Squadrons** (step 5): data.js `SQUADRONS` (role fighter/bomber/boarding, `vsSquadron` / `vsShip`
  profiles), `SQUADRON` (size, hit penalty, escort gap, latch distance), `WING_ORDERS`; weapon flags
  `fullVsSquadrons`, `noSquadrons`, `hitVsSquadron`, `pd`; ship flags `squadrons` (carrier slots) and
  `screen` (Warden). Runtime squadrons live in their own `squads` array in host.js (and `state.squads` on
  phones): `{ id: 'q1', kind: 'squad', type, faction, owner, carrier, slot, x, y, hull, alive }`, plus
  host-only `latched`. "Units" = ships + squadrons: `weaponTargets` / `defaultFirePlan` /
  `sanitizeFirePlan` / `arcShots` take units. rules.js: `isSquad`, `unitDistance`, `hitChance`,
  `planSquadMoves`, `squadAttackTarget`, `screened`, `pdTarget`, `latchTarget`, `sanitizeWing`,
  `fleetValue(ships, f, squads)`, `killValue`. Carriers carry `wing = { order, target? }`; the Move
  plan may carry `wing` (applied in `resolveMove` unless Comms Down). Fleet building: `fleets[id]` is
  now `[{ type, wing: [squadron types] }]`; inputs `buySquad { index, squadType }`,
  `removeSquad { index, slot }`. host.js keeps `kills` (faction → points) for step 7.
- **Criticals** (step 4): `CRITICALS` / `CRIT_POOL` in data.js (`comms` only rolls on a carrier with living squadrons). Ship field
  `crits = [{ id, arc?, zone?, fresh? }]` (oldest first); `fresh` = caught this round, cleared in
  `startPlan('planMove')`, so `nextRound` criticals act from the next round. rules.js: `critCount` (ignores
  fresh), `maxSpeed`, `arcOffline`, `shieldsBroken`, `hullHitCount`, `absorbableShields`; `speedOptions`,
  `maxClicks`, `weaponTargets` and `applyRepair` use them. host.js: `addCrit` (random pick, engines clamp
  speed), crit rolls in `resolveFire`, Bridge Fire at end of round. Repair choice may carry `crit` (index).
- Step 1 removed: the round limit, claim/release, scenario `fleets`. The HUD keeps "Fleet value" until
  kill-point scores arrive in step 7.

Keep the design rule: **stats and descriptions live in `data.js`**, not in the logic.

---

## Testing (lessons from Milestones 1–2)

- Start the local server in the background:
  `powershell -ExecutionPolicy Bypass -File tools/serve.ps1 -Root .`, then open
  `http://localhost:8123/` (TV) and `join.html?room=CODE` in other tabs (phones). If the port is
  already taken, a server from an earlier session is probably still running; check with
  `curl -s -o /dev/null -w "%{http_code}" http://localhost:8123/` and just use it.
- **Unit-test `rules.js` in the browser:** in the TV tab, `await import('/js/games/space-battles/rules.js')`
  and call functions directly with hand-made ships. This was the fastest way to check movement,
  collisions, arcs and damage.
- **Reload every tab after changing code.** Browsers cache ES modules per page; a cache-busting
  `?v=` on one import still pulls the old `data.js` through its imports.
- Drive phone tabs with dispatched key events (`window.dispatchEvent(new KeyboardEvent('keydown',{key}))`)
  rather than their timers; background tabs are throttled.
- **Testing at close range:** before starting a game (or before clicking Play again), run in the TV tab
  `const D = await import('/js/games/space-battles/data.js'); D.SCENARIOS.m1.deployDepth = 14; D.SCENARIOS.m1.asteroidField.count = [0, 0];`
  Fleets then start 8 u apart with no asteroids, and usually collide nose to nose in round 1. Reload the
  TV tab afterwards to undo it. Switching ships on the phone redraws the screen, so re-query buttons
  after every click in test scripts, and don't click a chosen target twice (that sets it back to Hold).
- If the browser pane is hidden, the TV's `requestAnimationFrame` pauses (game logic still runs on the
  interval). Screenshots need the pane visible.
- Phone tabs share localStorage, so test players may all show the same saved name.
- Chrome logs "Blocked call to navigator.vibrate" in tabs never really tapped; that's expected.
  Check for real errors with a filter like `Uncaught`.
- Real phones can't reach localhost. After the user says to push, check the live site with
  `curl -s -o /dev/null -w "%{http_code}" https://baronblitzen.github.io/Baron-Battles/`.
- When running git: `GIT_TERMINAL_PROMPT=0 GCM_INTERACTIVE=never timeout 60 git push origin main`.

### Done when (each step)
- The step's rules work in a local game with 2–4 phone tabs, including the timeout defaults.
- `rules.js` checks pass for the new logic (pure functions tested in the browser).
- No console errors on the TV or phones.
- Rules doc and this brief are updated if the user changes or confirms anything (remove the ⚠).

---

## Prompt to start the new chat

Copy this into a new chat:

> Read `CLAUDE.md`, `docs/space-battles-build-brief-m3.md`, and `docs/space-battles-rules.md`.
> Then start Milestone 3 of Space Battles, step 1 in the brief. Before building each step, ask me
> about every ⚠ item that step needs and anything the rules don't cover. Test each step locally and
> report back before moving on. Don't push until I say so.
