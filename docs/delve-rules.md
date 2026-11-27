# Delve the Black Labyrinth – rules (draft v3)

Dark-fantasy dungeon crawl. The TV shows the room you're in and a map of the rooms you've found.
Your phone is your character sheet and controller. **Status: design only, nothing built yet.**

All rules are approved. New guesses get a ⚠ mark until the user OKs them.

## 1. The game in one paragraph

You pick a background, roll stats, and enter a randomly generated labyrinth of rooms (one floor). Each
time you step through a door into a new room, **something happens to you**: a monster attacks, a
trap springs, a chest waits, or a stranger speaks. Deal with it, then pick the next door. Somewhere
in the labyrinth is the Black Gate, guarded by a boss. Beat the boss and step through to win. If
your character dies, you lose. There's no time limit. A run takes about 20–25 minutes.

## 2. Players

- **Version 1: one player.**
- **Later: 2–4 players, split screen.** The TV is cut into 2 or 4 panels, one per player, each
  showing that player's room and map. It's a race: first through the Black Gate wins, and you can't
  attack each other. (Details such as what happens when one player dies get decided when we build
  multiplayer.)

## 3. The labyrinth

- **A grid of rooms** joined by doors. A 7×7 grid with about 25–30 rooms actually used, so the
  shape is a twisty maze of rooms, not a full square.
- Each room has 1–4 doors (North, East, South, West).
- The **Entrance** is on one edge. The **Black Gate** (boss room) is far from it.
- **Room types:**

  | Room | What happens |
  |---|---|
  | Empty | Nothing… this time. Sometimes a small find (gold, a note, bones). |
  | Monster | A fight starts as soon as you enter. |
  | Trap | The trap goes off unless you spot it (WIS) as you enter. |
  | Treasure | A chest: plain, locked, trapped, or a Mimic. |
  | Encounter | A story event with choices and stat checks. |
  | Shrine | A one-time blessing, healing, or curse removal (sometimes for a price). |
  | Merchant | Buy and sell with gold. |
  | Boss | The Warden of the Black Gate. Beat it to win. |

- Rooms get more dangerous the farther they are from the Entrance.

## 4. Moving

- On your phone you see the doors of the room you're in. Tap one to go through.
- **Short walking animation** (about 1–2 seconds) on the TV: your hero walks out the door, and the
  next room fades in.
- **Revisiting:** you can walk back into rooms you've already been in. A cleared room is safe (empty
  rooms stay empty, beaten monsters stay dead).
- **Surprise:** you don't know what's in a room until you enter it, unless you **peek**:
  - The Pilgrim's *Prayer*: roll a WIS check at a door. Success = you learn what's behind it.
    Fail = you can never peek through **that door** again.
  - Items can also peek (for example a *Scroll of Scrying*), and a high WIS sometimes gives a hint
    ("You hear chains rattling…").
- You can't leave a room while a fight or event is going on, except by **Flee**, which sends you
  back through the door you came in by.

## 5. What the TV shows (one player)

- **Room scene** (big, most of the screen): a side view of the room, like a stage. Stone walls,
  arches, torches, and your hero on the left. Whatever is in the room appears on the right: a
  monster, a chest, a stranger, a shrine. Attacks, dice rolls and damage numbers play out here
  while you choose actions on your phone.
- **Room map** (side panel): the grid of rooms.
  - Rooms you've visited show an icon: skull (monster beaten), open chest, shrine, and so on.
  - Doors you've seen lead to "?" rooms you haven't entered yet.
  - Everything else is black.
  - Your current room glows.
- **Status strip:** name, background, HP and level.

## 6. Characters

### Stats

Six stats, each mostly around 8–16. **Modifier** = (stat − 10) ÷ 2, rounded down (so 14 → +2, 8 → −1).

| Stat | What it does |
|---|---|
| **STR** Strength | Melee hit and damage. Forcing doors and chests. Carrying heavy armor. |
| **DEX** Dexterity | Ranged hits, dodging traps, picking locks, fleeing, going first in a fight. |
| **CON** Constitution | Max HP, resisting poison and disease. |
| **INT** Intelligence | Spell power, reading scrolls, disarming traps, solving riddles. |
| **WIS** Wisdom | Spotting traps and Mimics, peeking at rooms, resisting fear and curses. |
| **CHA** Charisma | Talking in encounters (persuade, bargain, lie), merchant prices. |

### Creating a character

1. **Pick a background.** Each gives a stat lean, starting gear and one skill.
2. **Roll stats:** the phone rolls bonus dice. You get one free re-roll, then you must keep it.
3. **Name** comes from the lobby name.

### Backgrounds

Your background is only where you **start**. What really makes your character is what you find.
Anyone can learn magic or any other skill from items (see "Skills" below).

| Background | Stats | Starting gear | Skill |
|---|---|---|---|
| **Deserter** | STR, CON | Longsword, chainmail | *Stab*: a strong hit (+2 to hit, extra damage). Cooldown 3 rounds |
| **Noble's Heir** | CHA, DEX | Rapier, fine coat | *Riposte* (reaction): when a monster hits you, strike back right away. Cooldown 3 rounds |
| **Pilgrim** | WIS, CON | Holy symbol, robes, mace | *Prayer*: WIS check to learn what's behind a door. Fail = can't peek through that door again |
| **Aspirant** (a wizard who barely knows any spells) | INT, WIS | Robes, staff | *1 starting spell*: pick 1 of 3: *Spark* (small damage), *Ward* (block the next hit) or *Light* (bonus to spotting traps in this room). Learns spells from tomes and scrolls more easily |
| **Grave Robber** | DEX, INT | Shovel, dark hood, lockpicks | *Pick Lock*: opens any lock or disarms a spotted trap, with a bonus |

Every background starts with an empty **Pouch** (1 bag slot). No potions.

### Skills

- Your background gives you one skill.
- **Every other skill comes from items.** Hold or wear the item and you can use its skill. Examples:
  a shield gives *Shield Bash*, a Tome of Fire teaches *Fireball*, a holy relic gives *Mend*.
- Tomes and scrolls **teach** a skill permanently (the item is used up). Weapons, shields and
  trinkets only give their skill **while equipped**.
- **Cooldowns:** every combat skill has its own cooldown, counted in rounds (one round = your turn +
  the monster's turn). After you use a skill, you have to wait that many rounds before using it again.
  Skills don't share cooldowns, so you can use Stab one round and another skill the next.
  - Cooldowns reset at the start of each fight.
  - **Reactions** (like *Riposte*) aren't used on your turn. When the trigger happens (a monster hits
    you), the phone pops up "Riposte?" for a few seconds, and you tap to use it.
  - Skills used outside combat (*Prayer*, *Pick Lock*) don't have cooldowns. They have their own rules.

### Levelling up

- XP comes from monsters, traps you spotted or disarmed, and solved encounters.
- Up to level 5 in a run (about 4 level-ups). Each level-up gives more max HP and a choice of
  **one** of these: +2 to one stat, +1 to two stats, or an upgrade to a skill you already have
  (for example a shorter cooldown or more damage).

### HP and death

- Max HP = background base + CON modifier per level.
- HP doesn't come back by itself. You heal with potions, skills, shrines and some encounters.
- **0 HP = dead = you lose.**

## 7. Equipment

| Slot | Holds |
|---|---|
| **Right hand** | Weapon |
| **Left hand** | Shield, off-hand weapon, lantern, holy symbol |
| **Head** | Helm, hood, mask, hat |
| **Chest** | Armor, coat, robes |
| **Legs** | Greaves, leggings |
| **Feet** | Boots |
| **Back** | Cloak or **backpack** |
| **Trinket ×3** | Rings, amulets, charms |

- **Two-handed weapons** take both hand slots.
- **Heavy armor** needs enough STR or it gives −DEX.
- **Bag:** consumables (potions, scrolls) live in the bag, limited by its size. Starter **Pouch = 1
  slot.** Bigger bags are loot: Satchel (3), Pack (5), Pilgrim's Pack (7), and they go in the
  **Back** slot, so you choose between a cloak and carrying more potions.
- **Rarity:** Common · Fine · Rare · Cursed (strong, but has a drawback and can't be removed until
  the curse is lifted).

## 8. Dice and checks

- **d20 + stat modifier** against a target number: Easy 8, Normal 12, Hard 16, Deadly 20.
- The d20 rolls on the phone and the result shows on the TV ("WIS 15 – you spot the tripwire!").
- Natural 20 always succeeds. Natural 1 always fails.

## 9. Combat (turn-based, on the phone)

- Starts when you enter a monster room.
- **Who goes first:** d20 + DEX against the monster.
- On your turn, pick one:
  - **Attack:** d20 + STR (melee) or DEX (ranged) vs. the monster's defense. Hit = weapon damage.
  - **Skill:** your background skill or a skill from an item, if it isn't on cooldown.
  - **Item:** a potion or scroll from your bag.
  - **Flee:** DEX check. Success = you go back through the door you came in by, and the monster stays
    in its room (with any damage it took). Fail = the monster gets a free hit.
- Then the monster acts. If it hits you, you may get a reaction (like *Riposte*). Most fights take
  3–6 rounds.
- **Win:** XP, sometimes loot. The room is cleared.

### Monsters

| Tier | Monsters |
|---|---|
| Weak | Gnawing rats, Hollow (shambling corpse), Candle-wisp |
| Normal | Skeleton Knight, Grave Hound, Fen Hag |
| Tough | Werewolf, Mourning Wraith, Iron Maiden (walking torture cage) |
| **Boss** | *The Warden of the Black Gate*: a giant armored jailer with a lantern, 2 phases |

## 10. Traps

- When you enter a trap room, roll WIS to spot it.
  - **Spotted:** Disarm it (DEX or INT check, XP on success) or carefully go around (safe, no XP).
  - **Not spotted:** it goes off. DEX (or CON for poison) check to halve or avoid the effect.
- Examples: dart wall, spiked pit, poison needle, collapsing ceiling, *Snuffer* (your light goes
  out: −2 to checks until you find a shrine or a torch).

## 11. Treasure

- **Plain chest:** just open it.
- **Locked:** DEX to pick the lock (the Grave Robber's *Pick Lock* gives a bonus), or STR to smash it (smashing may break potions inside).
- **Trapped:** a trap goes off unless you spot it first.
- **Mimic:** a monster. A WIS check may notice something is off before you touch it.

## 12. Encounters

Story events with 2–3 choices, often with a stat check. About 15–20 to start. Examples:

- **The Wounded Knight:** asks for a potion. Give one and he shows you the way (part of the map is
  revealed). Refuse and he curses you. Or rob him (CHA or STR).
- **The Hungry Shrine:** offer HP for a random blessing.
- **The Bone Merchant:** trades items for gold. CHA lowers prices.
- **The Weeping Door:** answer its riddle (INT) or force it open (STR, which costs HP).
- **The Pool of Black Water:** drink? (CON check: a big heal, or poison).

## 13. Start, gold and the end of a run

- **Start:** after you pick a background and roll stats, a short intro shows your hero walking into
  the first room.
- **Gold** is only for shopping (merchants, some shrines and encounters). It doesn't count as a score.
- **Death screen:** the TV shows a summary (rooms explored, monsters slain, cause of death), then
  **Play Again** or **Menu**. Winning shows a victory version of the same screen.

## 14. Phone screens

1. **Character creation:** background → roll stats → ready.
2. **Room / doors:** the doors of the current room (N/E/S/W, grayed out where there's a wall), HP,
   and buttons for **Character** (stats and equipment) and **Bag**.
3. **Event:** combat (Attack / Skill / Item / Flee), trap, chest, encounter choices, level-up.
4. **Dead / Victory.**

## 15. Look and sound

- Gritty, detailed dark-fantasy pixel art: muted colors, masks and hoods, blood, mossy stone, and
  warm torchlight against cold blue-black shadow. See `docs/delve-art-concept.html`.
- No sound.
- No saving between games. Every run starts fresh.

## 16. Build milestones (later, when you say go)

1. Room-grid generation, room map, door picking on the phone, walking animation, Entrance to Black Gate.
2. Room scenes (the side-view stage) and room types (empty rooms only at first).
3. Characters: backgrounds, stats, d20 checks, character sheet, equipment and bag.
4. Monsters and combat.
5. Traps, treasure, encounters, shrines, merchant.
6. Boss, level-ups, balance and polish.
7. Later: 2–4 players with split screen.
