# Space Battles — Build Brief (Milestone 1)

This file tells a new coding chat **what to build first** and **how it fits into this site**.

- **Rules (source of truth):** [space-battles-rules.md](space-battles-rules.md). If this brief and the rules
  disagree, the rules win. If something isn't covered, ask the user, and don't invent rules.
- **Project rules:** [../CLAUDE.md](../CLAUDE.md). Read it first. Most importantly: **no Node / npm / build
  step**, plain HTML/CSS/JS ES modules only, CDN libraries pinned from `cdn.jsdelivr.net`, only the
  BaronBlitzen GitHub account, repo-local git config only.
- **The user is a beginner.** Explain steps plainly and give exact clicks and commands.

---

## Goal of Milestone 1

A small but complete, playable battle on the TV + phones, to test the core
**"plan in secret → watch it all happen"** loop before adding more features. This is "v1" in the
rules' build plan, plus the setup flow.

### In scope

1. **Setup flow** (rules §1, "Setup flow"):
   - **Team select:** each phone taps a faction. The TV shows the 3 factions and which players are on
     each, live. **Pirates are shown but greyed out as "coming soon"** in this milestone. Still write
     the logic for 3 factions: the game continues only when players are in **exactly 2** factions.
   - **Too many players:** if a team has more players than ships, the TV asks someone to switch teams.
   - **Ship select:** each phone shows its team's preset fleet. Players claim ships, first come, first
     served, and can release them. The TV and teammates' phones show who owns what.
   - **Ready:** a player needs at least 1 ship to tap Ready. Start only when **every ship is claimed**
     and **everyone is ready**. The TV shows what's missing.
2. **Ships (only these 4)**, using the stats in rules §9:
   - Protectorate: **Lancer Torpedo Boat** (Corvette), **Valiant Strike Carrier** (Cruiser, carrying no squadrons yet)
   - Djnzuar: **Gnasher Raider** (Corvette), **Broodmaw Cruiser** (Cruiser, carrying no squadrons yet)
3. **Milestone 1 scenario:** a simple map with **asteroids only**. Each side has **1 Cruiser + 2 Corvettes**,
   deployed on opposite edges (Protectorate west, Djnzuar east).
4. **The round** (rules §4), with two planning windows:
   - **Plan Movement:** for each owned ship, set speed (−1 / same / +1, within its range) and turn
     clicks for each segment. The phone mini-map shows the area around the ship and a ghost of the
     planned path.
   - **Move:** the TV animates all ships at the same time (about 3–4 seconds).
   - **Plan Fire:** for each owned ship, pick up to **2 arcs** and a target for each. The phone lists only
     valid targets (in arc, in range, line of sight not blocked by an asteroid, enemy only).
   - **Fire:** all attacks resolve at once. The TV shows tracer lines and **damage numbers** (no dice).
     Wrecks are removed after all damage lands, so a ship destroyed this round still fires.
   - **Timers:** each planning window lasts up to **2 minutes** and ends early when every player has
     tapped Ready.
   - **Defaults when time runs out:** keep speed and fly straight. Fire the 2 best arcs at the
     nearest valid targets.
5. **Movement rules** (rules §3, §6): speed carries over between rounds, 1 speed point = one 2 u
   segment, 1 click = 15°. Enemy collision: both stop, 1 damage each. Friendly collision: both stop,
   no damage. Asteroid: stop, 2 damage. Map edge: stop, 2 damage. **Djnzuar ramming** (enemy takes 3)
   is included.
6. **Combat rules** (rules §2, §7): range bands Close 0–3 / Medium 3–6 / Long 6–9 u, measured between
   closest edges. 4 hull zones, each a 90° wedge with its own shields and firing arc. Each weapon
   fires its number of shots, and each shot rolls the weapon's hit chance for that range band. Damage
   hits the zone facing the attacker: shields first, then hull. No friendly fire.
7. **Winning:** last team with ships left wins. If both teams still have ships after **8 rounds**, the
   team with more remaining fleet value wins (Corvette 2, Cruiser 5). Then show a results screen with
   **Play again** and **Menu**.
8. **TV look:** dark space background, ships drawn as **simple glowing outlines** in their owner's
   player color, small shield marks around each ship for its 4 zones, and a hull bar. A top bar shows
   the round, phase, timer, and who is ready.
9. **Phone:** a "My Fleet" list (hull, shields per zone, speed for each owned ship), plus the
   planning screens above. Keyboard support for laptop testing, per CLAUDE.md (arrow keys / WASD
   to adjust speed and turns).

### Not in Milestone 1 (later milestones)

Stances, critical hits, squadrons, point-defense, Pirates, Battleships, Destroyers, nebulas /
planets / debris / mines, objectives (Control Points), point costs. **Design the code so these are
easy to add**: keep ship and weapon stats in a data file, not scattered through the logic.

---

## How it fits into the site

Read `js/host.js`, `js/phone.js`, `js/games/registry.js`, and the Labyrinth game in
`js/games/labyrinth/` (it's the example to copy).

### Files to create

| File | What it holds |
|---|---|
| `js/games/space-battles/data.js` | Factions, weapons, ship classes, ships, and the Milestone 1 scenario (map size, asteroids, deployment, fleets). Plain data only. |
| `js/games/space-battles/rules.js` | **Pure functions** shared by the TV and phones: move a ship along a plan, hull-zone and arc tests, range bands, line of sight, valid targets, collision checks. No DOM and no randomness. |
| `js/games/space-battles/host.js` | TV module: setup flow, phase machine and timers, resolving movement and fire (all dice rolls happen here), canvas drawing, results screen. |
| `js/games/space-battles/controller.js` | Phone module: team select, ship claim, My Fleet, movement planner with a mini-map, fire planner. |

Add a registry entry in `js/games/registry.js`: id `space-battles`, name `Space Battles`, an icon,
`minPlayers: 2`, `maxPlayers: 8`, a one-line description, and the dynamic imports.

### Module APIs (from CLAUDE.md)

- Host: `export function start({ container, players, setPhoneState, onExit })` returns
  `{ handleInput(id, msg), setOnline?(onlineIdSet), stop() }`.
- Controller: `export function mount({ container, me, sendInput })` returns
  `{ update(gameState, me), destroy() }`.

### Messages

**The TV is the referee.** Phones only send choices, and the TV checks every choice is legal.

Suggested phone → TV inputs (the `msg` in `handleInput`):

| `type` | Payload | When |
|---|---|---|
| `team` | `{ faction }` | Team select |
| `claim` / `release` | `{ shipId }` | Ship select |
| `ready` | `{ ready: true/false }` | Ship select |
| `planMove` | `{ ships: { [shipId]: { speed, clicks: [..per segment] } }, ready }` | Plan Movement |
| `planFire` | `{ ships: { [shipId]: [{ arc, targetId }] }, ready }` | Plan Fire |

Rules for state sent from TV to phones (via `setPhoneState`):
- `setPhoneState` broadcasts **one state to every phone**, so **never put secret plans in it**. Plans
  stay on the TV until they resolve. Phones show their own draft plans from local memory.
- Send state **only when something changes** (a phase change, a claim, a ready tick, the results of a
  move or fire). Never stream animation frames to phones.
- Include enough for phones to draw the mini-map and compute valid targets themselves with `rules.js`:
  the phase, ship positions/headings/speed/hull/shields/owner/faction, asteroids, round number, and
  who is ready.
- **Timers:** send `secondsLeft` at the start of each phase and let phones count down locally
  (phone clocks may not match the TV's).

### Randomness and fairness
All hit rolls happen on the TV. `rules.js` stays deterministic so the phone's preview of a path
matches exactly where the TV moves the ship (apart from collisions, which only the TV can know).

---

## Testing (from CLAUDE.md)

- Start the local server in the background:
  `powershell -ExecutionPolicy Bypass -File tools/serve.ps1 -Root .`
  then open `http://localhost:8123/` (TV) and `join.html?room=CODE` in other tabs (phones).
- Use one tab per phone. Background tabs slow down timers, so drive phone tabs with dispatched
  keyboard/click events, and don't rely on their timers.
- Real phones can't reach localhost. Test on the live site after pushing, and only push when the
  user says so.

### Done when

- [ ] Space Battles shows up in the game picker and starts with 2+ players.
- [ ] Team select works, and the game blocks until players are in exactly 2 factions. Pirates are greyed out.
- [ ] Ship claiming works first come, first served. Start waits until every ship is claimed and everyone is ready.
- [ ] The "switch teams" message appears when a team has more players than ships.
- [ ] Movement planning shows a correct ghost path. All ships then move together on the TV.
- [ ] Collisions, asteroids, and the map edge behave as described.
- [ ] Fire planning lists only valid targets. Damage goes to the correct hull zone, shields first.
- [ ] Timers end early when everyone is ready. Defaults apply when time runs out.
- [ ] The game ends correctly (last team standing, or after 8 rounds). Play again and Menu both work.
- [ ] No console errors on the TV or phones.

---

## Prompt to start the new chat

Copy this into a new chat:

> Read `CLAUDE.md`, `docs/space-battles-build-brief.md`, and `docs/space-battles-rules.md`.
> Then build Milestone 1 of Space Battles as described in the brief. Ask me before making any rule
> decisions the documents don't cover. Test it locally, and don't push until I say so.
