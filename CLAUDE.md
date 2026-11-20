# Poulson Mini Games – notes for Claude

Party games for a TV + phones (Jackbox-style). A laptop connected to the TV opens the site;
players scan a QR code and use their phones as controllers.

- Live site: https://baronblitzen.github.io/Baron-Battles/
- GitHub repo: https://github.com/BaronBlitzen/Baron-Battles (public, branch `main`)
- The user is a beginner: explain steps plainly and give exact clicks/commands.

## Hard rules

- **No Node.js, npm, or build step.** The user explicitly does not want Node. Everything is plain
  HTML/CSS/JS (ES modules). Libraries come from `cdn.jsdelivr.net` with exact pinned versions.
- **Only the BaronBlitzen GitHub account may be used for this project.** This laptop also has a
  GitHub login for another account (BYUSection2Team8) used for the user's separate ERP project.
  Never use, change, remove, or authorize that account, never touch global Git config
  (`~/.gitconfig` doesn't exist and should stay that way), and never do anything that affects
  the ERP project. All Git settings for this project are repo-local (`git config --local`).
- Never ask the user to paste their GitHub token into chat.

## Git / GitHub setup (already done)

- Repo-local config: `user.name=BaronBlitzen`, `user.email=BaronBlitzen@users.noreply.github.com`,
  `credential.https://github.com.username=BaronBlitzen`,
  remote `origin = https://BaronBlitzen@github.com/BaronBlitzen/Baron-Battles.git`.
- Auth: a fine-grained personal access token (scoped to Baron-Battles only, Contents read/write)
  is stored in Windows Git Credential Manager under the BaronBlitzen username. If a push fails
  with an auth error, the token probably expired: have the user create a new one at
  https://github.com/settings/personal-access-tokens/new (Only select repositories → Baron-Battles,
  Contents: Read and write), then run `git push` themselves in a terminal and pick **Token** in the
  sign-in window.
- When running git from Claude, use `GIT_TERMINAL_PROMPT=0 GCM_INTERACTIVE=never` plus a
  `timeout`, so it can't hang waiting for a sign-in window.

## Deploying

Pushing to `main` deploys automatically: `.github/workflows/static.yml` (GitHub Actions →
GitHub Pages) uploads the whole repo as-is. The site updates about 1–2 minutes after a push.
Check with `curl -s -o /dev/null -w "%{http_code}" https://baronblitzen.github.io/Baron-Battles/`.

## Supabase

- Project URL and publishable key are in `js/supabase.js`. The publishable key is meant to be
  public; no secret keys belong in this repo.
- Only **Supabase Realtime** is used (broadcast + presence). There are no database tables yet.
- Free plan: a project pauses after about a week with no use. If the TV shows "Connecting…"
  forever, have the user restore the project from the Supabase dashboard.

## Architecture

- `index.html` + `js/host.js`: the TV. It creates a 4-letter room code (kept in sessionStorage),
  shows the QR code, keeps the player roster (up to 8, with colors), offers the game picker,
  and runs the active game. **The TV is the authoritative referee** for all game logic.
- `join.html` + `js/phone.js`: the phone. It joins by code + name and mounts the current
  game's controller. The player id is in sessionStorage (one per tab), and the name is in
  localStorage.
- Channel `pmg-room-<CODE>`. Messages:
  - phone → TV: `hello` (asks the TV to resend state), `input` `{ id, ...gameInput }`
  - TV → phones: `state` `{ view: 'lobby' | <gameId>, players: [{id,name,color,online}], game: <gameState> }`
- Presence: phones `track({name})` with their id as the presence key. **The TV must also
  `track()`** (key `host`, filtered out), or Supabase never sends it presence. This bug was
  found and fixed.
- Keep message rates low. Phones send input only when it changes, and the TV broadcasts
  `state` only on changes (positions are never streamed to phones).

## Adding a game

1. Create `js/games/<id>/host.js` and `js/games/<id>/controller.js` (copy `labyrinth/`).
2. Add an entry to `js/games/registry.js` (id, name, icon, minPlayers, maxPlayers,
   description, and the `host` and `controller` dynamic imports).

Host module: `export function start({ container, players, setPhoneState, onExit })` returns
`{ handleInput(id, msg), setOnline?(onlineIdSet), stop() }`. Call `setPhoneState(obj)` whenever
phones need new info. Call `onExit('again' | 'menu')` from the results screen.

Controller module: `export function mount({ container, me, sendInput })` returns
`{ update(gameState, me), destroy() }`. Support arrow keys/WASD too, for laptop testing.

## Space Battles

The big game in progress (`js/games/space-battles/`). Rules: `docs/space-battles-rules.md`
(source of truth; ⚠ items need the user's OK before building). Current work and how the code is
organized: `docs/space-battles-build-brief-m3.md`. Milestones 1–2 are built and live.
Weapons, ships and attacks follow `docs/space-battles-weapons-v2.md` (Power, Spinal/Battery/Turret
arcs, d10 to-hit + agility), which overrides the rules doc there. `docs/ship-cards.html` draws a card
for every ship from `data.js`. Battle size (Small/Medium/Large) is `BATTLE_SIZES` in `data.js`.
The Protectorate and Djn'zuar rework (ships, weapons, squadrons, stances, criticals, Captains) is in
`docs/space-battles-ships-v3.md`, which overrides v2 for those factions. Captains are `CAPTAINS` in
`data.js` (one per ship, bought in fleet building). Duplicate ship types on a side get letters (Escort A, B).
Ships and squadron craft are pixel-art sprites in `sprites.js` (letter grids, nose up, keyed by ship/squadron
id; preview at `docs/ship-sprites.html`). Pirates have no sprites yet and still use the old outline shapes.

## Testing locally

- Run `powershell -ExecutionPolicy Bypass -File tools/serve.ps1 -Root .` in the background,
  then open http://localhost:8123/ (TV) and `join.html?room=CODE` in other tabs (phones).
  ES modules won't load from `file://`.
- Use separate browser tabs for each phone. Tabs share localStorage, so test players may show
  the same saved name. Background tabs throttle timers to about once a minute, so drive phone
  tabs with dispatched keyboard events and don't rely on their `setInterval`.
- Real phones can't reach localhost. Test on the live site after pushing.
