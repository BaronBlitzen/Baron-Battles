// The list of games on the home screen.
// To add a game: make a folder in js/games/ with host.js and controller.js,
// then add one entry here.
export const games = [
  {
    id: 'labyrinth',
    name: 'Labyrinth',
    icon: '🐂',
    minPlayers: 2,
    maxPlayers: 5,
    description: 'One Minotaur hunts. Everyone else races for the exits.',
    host: () => import('./labyrinth/host.js'),
    controller: () => import('./labyrinth/controller.js'),
  },
  {
    id: 'space-battles',
    name: 'Space Battles',
    icon: '🚀',
    minPlayers: 2,
    maxPlayers: 8, // 5 ships per side, so up to 5 players per team
    description: 'Plan fleet moves in secret, then watch the battle unfold.',
    host: () => import('./space-battles/host.js'),
    controller: () => import('./space-battles/controller.js'),
  },
];
