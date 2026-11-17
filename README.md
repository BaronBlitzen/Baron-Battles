# Poulson Mini Games

Party games for a TV and phones. Open the site on a laptop connected to the TV,
and players join by scanning the QR code with their phones.

No installs or build step: it's plain HTML, CSS and JavaScript, hosted on GitHub Pages.
Phones and the TV talk through Supabase Realtime.

## How it works

- `index.html` + `js/host.js`: the TV. It creates a room code, shows the QR code and players, and runs the games.
- `join.html` + `js/phone.js`: the phone. It joins the room and shows the controller for the current game.
- `js/supabase.js`: the Supabase connection settings.
- `js/games/registry.js`: the list of games on the home screen.
- `js/games/<game>/host.js`: the game as shown on the TV (the TV is the referee).
- `js/games/<game>/controller.js`: the game's phone controls.

## Adding a new game

1. Copy `js/games/labyrinth/` to a new folder, such as `js/games/my-game/`.
2. Add an entry for it in `js/games/registry.js`.

## Testing on a laptop

Open the site, then open `join.html` in two or more other browser tabs. Each tab acts as one player.
Arrow keys or WASD work as controls.
Press **Esc** on the TV screen to quit back to the menu.
