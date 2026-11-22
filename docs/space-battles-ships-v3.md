# Space Battles — Ships v3 (Protectorate + Djn'zuar rework)

**Draft, not built yet.** When built, this replaces the Protectorate and Djn'zuar ships, weapons,
squadrons, stances and criticals in `space-battles-weapons-v2.md`. Everything in v2 that isn't
mentioned here stays the same (Power, d10 to-hit on 4+ plus agility, natural 10 always hits,
shields first then hull, shields don't recharge on their own). The Pirates rework is in the Pirates section at the end.

✅ = decided by the user. ⚠ = my assumption, needs the user's OK before building.

## Range bands ✅

| Band | Distance |
|---|---|
| Close | 0–4 u |
| Medium | 4–8 u |
| Long | 8–12 u |
| **Very Long** (new) | 12–16 u |

## Arcs

- ✅ **Spinal 30°**: Torpedo, Particle Lance, Dark Lance.
- ✅ **Turret 360°**: Disruptor, point-defense.
- ✅ Everything else is a **Battery** (270°, all but the rear 90°).
- ✅ **Show the 30° arc while planning movement:** if a ship has a 30° weapon, the moving player
  sees that wedge from the ship's planned end position during the movement planning phase.

## Accuracy

"+1 accuracy" means the shot needs 1 lower on the d10. "−1 accuracy" means 1 higher.

## Weapons

⚠ Each weapon fires **one shot** (damage listed is per hit).

### Protectorate ✅

| Weapon | ⚡ | Reach | Arc | Damage | Notes |
|---|---|---|---|---|---|
| Torpedo | 2 | Long | Spinal 30° | 6 | **Ignores shields.** Crits on **9–10**. **Once per battle.** |
| Small Laser Battery | 1 | Medium | Battery | 1 | |
| Large Laser Battery | 2 | Long | Battery | 3 | |
| Ion Cannon | 1 | Medium | Battery | 2 to shields | Ion: can't damage hull, can't target squadrons. |
| Particle Lance | 4 | **Very Long** | Spinal 30° | 6 | |

### Djn'zuar ✅

| Weapon | ⚡ | Reach | Arc | Damage | Notes |
|---|---|---|---|---|---|
| Plasma Maw | 2 | Close | Battery | 3 | |
| Small Railgun Battery | 1 | Medium | Battery | 1 | |
| Large Railgun Battery | 2 | Medium | Battery | 3 | |
| Disruptor | **2** | Close | Turret 360° | — | ✅ **Always hits (no roll).** Does no damage but causes **1 critical hit**. |
| ✅ Dark Lance | **3** | Long | Spinal 30° | 5 | Samurai only. Uses all its Power, so it never fires in the same round as the Disruptor. |
| Acid Spitter | 1 | Close | Battery | 1 | Acid: **1 more damage next round**, ignoring shields ✅. |

## Ships

Shields are Front / Left / Right / Rear. ✅ The **rear is 1 lower** than the sides.
Cost is in fleet points (a side gets 60 per battle-size step, as now).
Turn clicks are per 2 u segment, listed from the ship's lowest speed up (1 click = 15°).
Agility comes from class, as in v2 (corvette 2, destroyer 1, cruiser/battleship 0).

### Human Protectorate ✅

| Ship | Class | Cost | Hull | Shields | ⚡ | Speed | Clicks | Weapons | PD | Special |
|---|---|---|---|---|---|---|---|---|---|---|
| Torpedo Boat | Corvette | 8 | 5 | 2/1/1/0 | 2 | 2–5 | 3/3/3/2 | Torpedo, Small Laser ×2 | 0 | |
| Escort | Destroyer | 11 | 8 | 2/2/2/1 | 3 | 1–4 | 3/2/1/1 | Ion Cannon, Small Laser ×3 | Flak ×3 | |
| Lancer | Cruiser | 18 | 10 | 2/2/2/1 | 6 | 1–4 | 2/2/1/1 | Particle Lance, Large Laser ×2, Small Laser ×2 | Flak ×1 | |
| Fleet Carrier | Cruiser | 18 | 11 | 2/2/2/1 | 6 | 1–4 | 2/2/1/1 | Large Laser ×2, Small Laser ×2, Ion Cannon | Flak ×2 | Carrier (3 squadrons) |
| ✅ Assault Carrier | Destroyer | 13 | 7 | 2/2/2/1 | 4 | 1–4 | 3/2/1/1 | Large Laser, Small Laser ×2 | Flak ×2 | Carrier (1 squadron) |

### Djn'zuar ✅

| Ship | Class | Cost | Hull | Shields | ⚡ | Speed | Clicks | Weapons | PD | Special |
|---|---|---|---|---|---|---|---|---|---|---|
| Grunt | Corvette | 7 | 5 | 1/1/1/0 | 2 | 2–5 | 2/1/1/1 | Plasma Maw, Small Railgun ×2 | 0 | Violent Turn stance |
| Samurai | Destroyer | 12 | 7 | 1/1/1/0 | 3 | 2–5 | 3/3/2/2 | Disruptor, Dark Lance, Small Railgun ×2 | Thorn ×1 | |
| Brute | Cruiser | 18 | 11 | 2/2/2/1 | 6 | 1–4 | 2/2/1/1 | Large Railgun ×3, Acid Spitter ×2, Small Railgun ×2 | Thorn ×2 | |
| Queen | Battleship | 16 | 14 | 3/3/3/2 | 4 | 1–3 | 3/2/1 | Large Railgun, Small Railgun ×4 | Thorn ×3 | Carrier (4 squadrons) |

### Why these costs

- **Torpedo Boat 8 vs Grunt 7:** the Torpedo Boat's torpedo can kill a Grunt in one hit, and it turns
  better. The Grunt is a bit cheaper so the Djn'zuar can field more of them.
- ✅ **Escort 11 vs Samurai 12:** the Escort is tougher and has the best PD but weak guns (only 3
  Power). The Samurai hits harder, is faster, and picks each round between its long-range Dark Lance
  (5 damage, spinal) and the auto-hit Disruptor.
- **Lancer 18 = Brute 18:** about the same damage. The Lancer outranges, the Brute is tougher.
- ✅ **Fleet Carrier 18, Queen 16 (empty):** the Fleet Carrier has much better guns, while the Queen
  has more hull and one more hangar. Squadrons are bought on top.
- ✅ **Assault Carrier 13:** an up-gunned Escort (4 Power fires all its guns: ~3.5 damage a round)
  with 1 less hull and 1 less PD, plus one hangar. With Bombers (17) it about matches a Lancer (18),
  but its damage comes in bursts. Sprite: Escort bow and gun pods with the Fleet Carrier's flight deck.
- A full Fleet Carrier (18 + 3 squadrons ≈ 28) or full Queen (16 + 4 Swarmers = 28) is a bit under
  half of a 60-point fleet.
- Costs were rebalanced with a value model (damage per round × how hard the ship is to kill). Squadrons
  score far above their cost; raise them if carriers dominate.

## Squadrons ✅

- Each squadron is a group of craft. **Squad size depends on type.** The TV draws **one small
  circle per craft**, and a craft's circle disappears when it dies.
- Each living craft fires **one shot** per round. Squadron agility is 2 (as in v2).
- A craft with a shield takes its first hit on the shield, then the next hit kills it.
- Only bombers crit (on a 10), as in v2.

| Squadron | Faction | Cost | Craft | Hull / Shield each | Speed | Weapon | Reach | Damage | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Fighters | Protectorate | 3 | 4 | 1 / 1 | **16 u** | Laser Cannon | Close | 1 | |
| Bombers | Protectorate | 4 | 3 | 1 / 1 | **12 u** | Nuclear Bomb | Close | 2 | **Ignores shields.** ✅ **Ships only:** can't attack squadrons (no Intercept, no squadron targets). ✅ **One bombing run** (see below). |
| Swarmers | Djn'zuar | 3 | **6** | 1 / 0 | **16 u** | Bite Cannon | Close | 1 | **−1 accuracy.** |

- Bombers cost the most: about 4 hull damage per run against a big ship, and shields don't stop it.
- ✅ **One bombing run:** after Bombers attack a ship they are **spent**. They're forced onto
  **Return**, can't shoot, and fly back to their carrier. Docking re-arms them; they may launch again
  the round after they dock. If their carrier is destroyed they can never re-arm.
- ✅ **Swarmers are the only Djn'zuar squadron.** Gorers and Latchers are removed.
- The Fleet Carrier and Assault Carrier hold any mix of Fighters and Bombers. The Queen holds Swarmers.

### Squadron orders ✅

| Order | Effect |
|---|---|
| **Attack** | Pick an enemy ship or squadron to attack. |
| **Intercept** | Goes after the nearest enemy squadron and attacks it. |

(The Escort order is removed for now ✅.)

## Point-defense ✅

Same rules as v2: free, automatic, Close range, 360°, hits on 4+ ignoring squadron agility,
1 damage per hit, can't hurt ships, stances don't change it.

- ✅ **PD fires first at its attackers:** if an enemy squadron is attacking this ship this round,
  PD aims at the nearest such squadron and its shots land **before** that squadron fires. Craft it
  destroys never get to shoot (a Bomber shot down never drops its bomb). Otherwise PD aims at the
  nearest enemy squadron in close range and fires with everything else.
- ✅ **Samurai gets Thorn ×1.**

- ✅ **PD tracers are drawn in yellow** during the fire phase so players can see what PD is shooting.
- ✅ **PD is shown on the Roll Dice screen** as its own yellow row ("🛡 Point-defense (automatic)"), so
  players see it roll and hit. Kept instead of removing PD and weakening squadrons.
- PD shots per ship are in the ship tables above.

## Critical hits ✅

- A **natural 10** on a shot that hits a side with **no shields left** causes a critical hit.
- ✅ A 10 on a side that **still has shields** does **double damage** and no critical (as in v2).
- **Targeted Attack** and the **Torpedo** crit on **9–10** instead.
  ⚠ Torpedo with Targeted Attack: still 9–10 (they don't stack).
- A critical hit damages one of the ship's **6 systems**, picked at random. ✅ If that system is
  **already damaged, reroll**.

| System | While damaged |
|---|---|
| **Hull** | A **fire**: 1 damage at the end of every round, ignoring shields, until repaired. |
| **Weapons Systems** | **One random weapon** can't be used until repaired. |
| **Maneuvering Thrusters** | **Can't turn**: the ship must fly straight. |
| **Shield Generator** | **No shields** until repaired: all sides count as 0. The shields it had come back when repaired. |
| **Main Engines** | **Can't change speed.** |
| **Bridge** | ✅ The **only stance you can pick is Critical Repairs.** |

The old v2 critical effects (Weapons Offline −2 Power, Comms Down, etc.) go away for these two factions.

## Stances ✅

✅ **All the old stances go away** (Brace, Maneuvering Thrusters, Overcharge, Damage Control,
Hunter, Full Burn). ⚠ A ship can also pick no stance.

| Stance | Who | Effect |
|---|---|---|
| **Wild Maneuvers** | All | +1 turn click per segment, +1 agility, can change speed by **2** instead of 1. All your weapons **−1 accuracy**. |
| **Critical Repairs** | All | Repair **1 critical hit**. The player picks which. |
| **Shield Boost** | All | Add **2 shields to one side**. That side can go up to **2 over its max**; anything over max disappears at the end of next round. |
| **Targeted Attack** | All | All your weapons **+1 accuracy**, and they crit on **9–10**. |
| **Command** | Carriers (Fleet Carrier, Queen) | Your squadrons get **+1 accuracy** this round. |
| **Violent Turn** | Grunt only | Take **1 hull damage**. At the end of the move, you get as many extra clicks as it takes to make a full 90° turn. |
| **Exterminate** | Lancer with Shrike Leonitas | Your Particle Lance fires **twice** this round (no extra Power). |
| **Reckless Attack** | Grunt with Golbrik | Take **1 hull damage**. **All your weapons fire twice** this round (no extra Power). |

✅ **Stances can be used every round** (the old "no repeats" rule is gone).

## Captains ✅

A captain is an upgrade bought for one ship (or one squadron) during fleet building.

- ✅ **One captain per ship.** The same captain can be on **several ships** in a fleet.
- ✅ A captain is **lost with its ship**.
- ✅ Pirate captains: see the Pirates section.

| Captain | Goes on | Cost | Ability |
|---|---|---|---|
| **Shuna, Dolphin Warrior** | Torpedo Boat | 2 | Every round you may use **Wild Maneuvers AND another stance** (their effects add up). Portrait: dolphin with its head in a blue helmet bubble. |
| **Samuel Verity** | Escort | 2 | End of every round: **regain 1 shield**: front if it isn't full; else the side with fewer shields (left on a tie); else the rear. Not while the Shield Generator is damaged. |
| **Shrike Leonitas** | Lancer | 3 | Unlocks the **Exterminate** stance. |
| **Amelia Dangerfield** | Fleet Carrier | 2 | **Born Commander:** your squadrons always get Command's +1 accuracy (it doesn't stack with Command, so Command isn't offered), leaving you free to pick another stance. |
| **Iceman Flaggs** | Fighters (squadron) | 1 | Squadron **+1 accuracy**, and the **first hit on it each round is ignored**. |
| **Fiona** | Bombers (squadron) | 3 | ✅ Every bomb hit from this squadron **also causes a critical hit** (bombs ignore shields, so each damages a system). Shown as **Crit!** on the dice screen. Portrait: pink dolphin in a round helmet and white-and-orange suit. |
| **Golbrik** | Grunt | 2 | Unlocks the **Reckless Attack** stance. |
| **Jurddap** | Grunt | 1 | **Shrug It Off:** **+1 hull**, and **Hull Fire never hurts** this ship (it can still catch the critical; it just does no damage). |
| **Bossim** | Grunt | 2 | **Pack Leader:** your side's **other Grunts** within **medium range** (8 u) of this ship get **+1 accuracy**. Several Bossims don't stack. |
| **Seir-Seir** | Samurai | 1 | When this ship causes a critical, **you choose which system** it damages (picked in Plan Fire each round; if the target already has that one damaged, it's random). |
| **King Tulbrik** | Brute | 1 | **+2 hull.** |
| **Queen Uen** | Queen | 2 | **+1 max speed** and **+1 turn click** per segment. |
| **Kairos** | Torpedo Boat | 1 | In **Plan Fire**, may **rotate the ship 1 click (15°) left or right** before shooting (to line up the torpedo or turn a stronger shield toward the enemy). The rotation happens just before all attacks, so it also changes which shield gets hit. Not while the Maneuvering Thrusters are damaged. |

"Fires twice" = the weapon makes two separate attacks at the same target. Once-per-game weapons
and point-defense never fire twice.

## Ship labels ✅

When a side has more than one ship of the same type, they're labeled **A, B, C…** in deploy order
("Escort A", "Escort B"). Squadrons too ("Fighters squadron A").

## Still open ⚠

- Point costs above are Claude's first pass (the user said "you choose"). Adjust after playtesting.
- Small assumptions still marked ⚠ above: one shot per weapon, Torpedo + Targeted Attack don't
  stack (still 9–10), and a ship can pick no stance.

## Pirates ✅ (rework)

The Outrider and the old Pirate "home"
rule (extra speed change at half hull) are removed. The old Pirate weapons (Autocannon Turret,
Breaching Cannon, Disruptor, Boarding Harpoon) and Smuggler's Hold are gone.

### Weapons

| Weapon | ⚡ | Reach | Arc | Damage | Notes |
|---|---|---|---|---|---|
| Auto Turret | 2 | Medium | Turret 360° | 1 × 2 shots | |
| Auto Cannon | 3 | Medium | **Forward 45°** (new arc, ±22.5°) | 1 × 5 shots | |
| Flechette Gun | free | Close | Turret | 1 | Point-defense. |
| Missile Launcher | 1 | Any | 360° | 2, ignores shields | ✅ 5 missiles per Free Trader (shown under Power on the phone). Never fired by the default plan: only when the player aims it. Missiles fly around asteroids. Always hits unless point-defense shoots it down (1 hp). Hits the same round if the target is within 16 u, otherwise keeps flying 16 u a round. |

### Ships

| Ship | Class | Cost | Hull | Shields | ⚡ | Speed | Clicks | Weapons | PD |
|---|---|---|---|---|---|---|---|---|---|
| Firefly | Corvette | 9 | 8 | 1/1/1/0 | 2 | 1–4 | 3/3/3/2 | Auto Turret | Flechette ×1 |
| Rouge | Corvette | 12 | 6 | 2/2/2/1 | 4 | 2–5 | 3/3/2/2 | Auto Cannon, Auto Turret | Flechette ×1 |
| Free Trader | Cruiser | 14 | 9 | 2/2/2/1 | 5 | 1–4 | 3/2/1/1 | Auto Turret ×2, Missile Launcher ×2 | Flechette ×2 |

- Rouge: 4 Power can't fire the Auto Cannon (3) and the Auto Turret (2) together.
- Turning: Firefly like the Torpedo Boat, Rouge like the Samurai, Free Trader like the Escort.

### Free Trader customizations (bought in fleet building, on top of a captain)

| Customization | Cost | Effect |
|---|---|---|
| Illegal Dark Lance | 5 | Adds a Dark Lance (spinal, long, 5 damage) and +3 Power to fire it. |
| Scavenger Hold | 1 | Carries 1 squadron of Scavengers. Removing it removes the squadron. |
| Xar Teleporter | 2 | ✅ Once per game, the **Teleport** stance (picked in Plan Movement, so it shows when the Move starts). After the Move the TV says "Teleportation in progress" and the owner gets the whole map on their phone: tap any free spot (on the map, not overlapping a ship or an asteroid), turn it, Confirm. The ship jumps there and keeps its speed. 45 s to pick: when time runs out the last spot tapped is used, or the ship stays put if none was. The stance is used up either way. |

### Rouge customizations ✅

| Customization | Cost | Effect |
|---|---|---|
| Mine-Layer | 2 | +1 Power and a **Mine-Layer** (1 Power, no target): drops a mine just behind the ship, **3 per battle**. Never used by the default plan. |
| Grappling Hook | 2 | +1 Power and a **Grappling Hook** (1 Power, Turret, medium, 1 damage, not at squadrons): the target is **pulled 2 u toward the Rouge whether or not it hits** (the first hook on a ship wins). |
| Cyclone Launcher | 3 | +2 Power and a **Cyclone Launcher** (2 Power, **once per battle**): 5 missiles at one enemy ship, 1 damage each (same rules as Free Trader missiles). Priced 3, not 4, because it is one volley. |

**Mines (all mines):** ✅ a ship that comes within **0.7 u** (a small asteroid's radius) sets one off: 3 damage to the side facing it, and if any hull is hit, a **Maneuvering Thrusters** critical. Mines are neutral: they hit any ship.

### Scavengers (squadron)

| Squadron | Cost | Craft | Shield / Hull each | Speed | Weapon | Damage |
|---|---|---|---|---|---|---|
| Scavengers | 3 | 3 | 1 / **2** | 12 u | Scrap Cannon | 1 |

- Each craft takes 3 small hits (shield, then 2 hull). A single hit of 3+ damage destroys a craft
  outright. Damaged craft are drawn faded on the TV.

### Captains

| Captain | Goes on | Cost | Ability |
|---|---|---|---|
| Mal Reynolds | Firefly | 2 | **Too Stubborn to Die:** once per game, the first time the Firefly would be destroyed it stays at 1 hull, and all other damage to it that round is cancelled (more shots, collisions, Hull Fire, acid). It starts the next Move with 1 hull. |
| Sergeant Liu Bei | Rouge | 2 | Auto Cannon +1 shot and +1 accuracy. |
| Flerf | Free Trader | 3 | **Five Arms:** each round one aimed weapon fires twice (no extra Power), the Dark Lance included. Picked in Plan Fire; with no pick, the strongest aimed weapon. |
| Rzen | Rouge | 2 | ✅ Every enemy this ship attacked that is destroyed that round gives it **+1 hull** (its own missiles count; not above max hull). Portrait: black panther with antennae, side profile. |
| Kaj'ik | Firefly | 2 | ✅ **Decoy Beacon:** once per game, in Plan Fire, drop a decoy where the Firefly is (before anything fires). Enemy missiles and squadrons attacking a friendly ship within close range (4 u) of it hit the decoy instead. It lasts until hit once. Squadrons hit it on 4+ (like a cruiser). Portrait: frog in a bulky black-and-green spacesuit. |

### Point-defense split (all factions) ✅

When several squadrons or missiles attack the same ship, its point-defense shots are split
between them, nearest first, taking turns (3 shots at 2 attackers = 2 + 1). Those shots still land
before the attackers fire.
