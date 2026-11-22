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
    // Shown in the phone's "?" help menu. Each item is one short paragraph (HTML allowed).
    rules: [
      'One player is secretly picked as the <b>Minotaur</b>. Everyone else is an <b>Escapee</b>.',
      '<b>Escapees:</b> find your way through the maze to a <b>green exit</b> on the left or right edge.',
      '<b>Minotaur:</b> tag Escapees before they get out. The Minotaur is a little faster, but can\'t leave the maze.',
      '<b>Controls:</b> hold your thumb on the pad and slide toward where you want to go. Lift to stop. Watch the TV to see the maze.',
      '<b>Winning:</b> if at least half the Escapees get out before the timer runs out, the Escapees win. Otherwise the Minotaur wins.',
    ],
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
    rules: [
      'Two teams fight with fleets of starships. Pick a faction, then spend your points on ships (and Captains) on your phone.',
      '<b>Each round has 4 steps:</b>',
      '<b>1. Plan Movement</b> (secret): for each ship pick a <b>stance</b>, its <b>speed</b> and its <b>turns</b>. Carriers also give each squadron an order.',
      '<b>2. Move:</b> every ship moves at the same time. Hitting asteroids, the map edge or enemy ships does damage.',
      '<b>3. Plan Fire</b> (secret): pick which weapons to power and a target for each one. Weapons cost <b>Power</b>, and each ship only has so much, so choose wisely.',
      '<b>4. Roll dice:</b> tap <b>Fire!</b> on your phone to roll a d10 for every shot (each weapon has its own dice color). The top of each row shows the number you need. Then all shots fly on the TV at once: hits strike the ship, misses streak past, and crits flash big. Point-defense and squadrons roll here too.',
      '<b>Point-defense</b> (free, automatic) shoots first at enemy squadrons attacking its ship: craft it shoots down never fire. <b>Bombers</b> only attack ships and get one bombing run, then must fly back and dock to re-arm.',
      '<b>Hitting:</b> each shot rolls a 10-sided die. It hits on a 4 or higher (small, nimble ships are harder to hit). A 10 is a critical hit.',
      '<b>Damage:</b> hits take down the shield on the side facing the attacker first, then the hull. A critical that gets past the shields breaks one of the ship\'s systems.',
      '<b>Timer:</b> each planning step lasts up to 2 minutes and ends early when everyone taps Ready. If you run out of time, whatever you had set up so far is used (squadron orders too); ships you never touched fly straight and fire on their own.',
      '<b>Winning:</b> destroy the enemy fleet or make them surrender. After 9 rounds, the team with the most hull left wins.',
    ],
    // Extra pages in the help menu. They open inside the phone page, so you stay in the room.
    extras: [
      { label: '📇 Ship cards', href: 'docs/ship-cards.html' },
      { label: '🎖 Captains', href: 'docs/ship-cards.html#captains' },
    ],
  },
];
