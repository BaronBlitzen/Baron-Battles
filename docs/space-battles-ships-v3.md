# Space Battles — Ships v3 (Protectorate + Djn'zuar rework)

**Draft, not built yet.** When built, this replaces the Protectorate and Djn'zuar ships, weapons,
squadrons, stances and criticals in `space-battles-weapons-v2.md`. Everything in v2 that isn't
mentioned here stays the same (Power, d10 to-hit on 4+ plus agility, natural 10 always hits,
shields first then hull, shields don't recharge on their own). Pirates are not changed yet.

✅ = decided by the user. ⚠ = my assumption, needs the user's OK before building.

## Range bands ✅

| Band | Distance |
|---|---|
| Close | 0–4 u |
| Medium | 4–8 u |
| Long | 8–12 u |
| **Very Long** (new) | 12–16 u |

## Arcs

- ✅ **Spinal 30°**: Torpedo, Particle Lance.
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
| Disruptor | **2** | Close | Turret 360° | — | A hit does no damage but causes **1 critical hit**. |
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
| Escort | Destroyer | 12 | 8 | 2/2/2/1 | 3 | 1–4 | 3/2/1/1 | Ion Cannon, Small Laser ×3 | Flak ×3 | |
| Lancer | Cruiser | 18 | 10 | 2/2/2/1 | 6 | 1–4 | 2/2/1/1 | Particle Lance, Large Laser ×2, Small Laser ×2 | Flak ×1 | |
| Strike Carrier | Cruiser | 22 | 10 | 2/2/2/1 | 6 | 1–4 | 2/2/1/1 | Large Laser ×2, Small Laser ×2, Ion Cannon | Flak ×2 | Carrier (3 squadrons) |

### Djn'zuar ✅

| Ship | Class | Cost | Hull | Shields | ⚡ | Speed | Clicks | Weapons | PD | Special |
|---|---|---|---|---|---|---|---|---|---|---|
| Grunt | Corvette | 7 | 5 | 1/1/1/0 | 2 | 2–5 | 2/1/1/1 | Plasma Maw, Small Railgun ×2 | 0 | Violent Turn stance |
| Samurai | Destroyer | 12 | 7 | 1/1/1/0 | 3 | 2–5 | 3/3/2/2 | Disruptor, Large Railgun, Small Railgun ×2 | 0 | |
| Brute | Cruiser | 18 | 11 | 2/2/2/1 | 6 | 1–4 | 2/2/1/1 | Large Railgun ×3, Acid Spitter ×2, Small Railgun ×2 | Thorn ×2 | |
| Queen | Battleship | 22 | 14 | 3/3/3/2 | 4 | 1–3 | 3/2/1 | Large Railgun, Small Railgun ×4 | Thorn ×3 | Carrier (4 squadrons) |

### Why these costs

- **Torpedo Boat 8 vs Grunt 7:** the Torpedo Boat's torpedo can kill a Grunt in one hit, and it turns
  better. The Grunt is a bit cheaper so the Djn'zuar can field more of them.
- **Escort 12 = Samurai 12:** the Escort is tougher and has the best PD. The Samurai hits harder,
  is faster and has the Disruptor.
- **Lancer 18 = Brute 18:** about the same damage. The Lancer outranges, the Brute is tougher.
- **Carriers 22 (empty):** the Strike Carrier has much better guns, while the Queen has more hull and one
  more hangar. Squadrons are bought on top.
- A full Strike Carrier (22 + 3 squadrons ≈ 32) or full Queen (22 + 4 Swarmers = 34) is a bit more
  than half of a 60-point fleet.

## Squadrons ✅

- Each squadron is a group of craft. **Squad size depends on type.** The TV draws **one small
  circle per craft**, and a craft's circle disappears when it dies.
- Each living craft fires **one shot** per round. Squadron agility is 2 (as in v2).
- A craft with a shield takes its first hit on the shield, then the next hit kills it.
- Only bombers crit (on a 10), as in v2.

| Squadron | Faction | Cost | Craft | Hull / Shield each | Speed | Weapon | Reach | Damage | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Fighters | Protectorate | 3 | 4 | 1 / 1 | **16 u** | Laser Cannon | Close | 1 | |
| Bombers | Protectorate | 4 | 3 | 1 / 1 | **12 u** | Nuclear Bomb | Close | 2 | **Ignores shields.** |
| Swarmers | Djn'zuar | 3 | **6** | 1 / 0 | **16 u** | Bite Cannon | Close | 1 | **−1 accuracy.** |

- Bombers cost the most: about 4 hull damage a round against a big ship, and shields don't stop it.
- ✅ **Swarmers are the only Djn'zuar squadron.** Gorers and Latchers are removed.
- The Strike Carrier holds any mix of Fighters and Bombers. The Queen holds Swarmers.

### Squadron orders ✅

| Order | Effect |
|---|---|
| **Attack** | Pick an enemy ship or squadron to attack. |
| **Intercept** | Goes after the nearest enemy squadron and attacks it. |

(The Escort order is removed for now ✅.)

## Point-defense ✅

Same rules as v2: free, automatic, Close range, 360°, aims at the nearest enemy squadron, hits on
4+ ignoring squadron agility, 1 damage per hit, can't hurt ships, stances don't change it.

- ✅ **PD tracers are drawn in yellow** during the fire phase so players can see what PD is shooting.
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
| **Command** | Carriers (Strike Carrier, Queen) | Your squadrons get **+1 accuracy** this round. |
| **Violent Turn** | Grunt only | Take **1 hull damage**. At the end of the move, you get as many extra clicks as it takes to make a full 90° turn. |
| **Exterminate** | Lancer with Shrike Leonitas | Your Particle Lance fires **twice** this round (no extra Power). |
| **Reckless Attack** | Grunt with Golbrik | Take **1 hull damage**. **All your weapons fire twice** this round (no extra Power). |

✅ **Stances can be used every round** (the old "no repeats" rule is gone).

## Captains ✅

A captain is an upgrade bought for one ship (or one squadron) during fleet building.

- ✅ **One captain per ship.** The same captain can be on **several ships** in a fleet.
- ✅ A captain is **lost with its ship**.
- ✅ Pirates get captains later (with the Pirate rework).

| Captain | Goes on | Cost | Ability |
|---|---|---|---|
| **Shuna, Dolphin Warrior** | Torpedo Boat | 2 | Every round you may use **Wild Maneuvers AND another stance** (their effects add up). |
| **Samuel Verity** | Escort | 3 | End of every round: **regain 1 shield**: front if it isn't full; else the side with fewer shields (left on a tie); else the rear. Not while the Shield Generator is damaged. |
| **Shrike Leonitas** | Lancer | 3 | Unlocks the **Exterminate** stance. |
| **Amelia Dangerfield** | Strike Carrier | 3 | **Born Commander:** your squadrons always get Command's +1 accuracy (it doesn't stack with Command, so Command isn't offered), leaving you free to pick another stance. |
| **Iceman Flaggs** | Fighters (squadron) | 2 | Squadron **+1 accuracy**, and the **first hit on it each round is ignored**. |
| **Golbrik** | Grunt | 2 | Unlocks the **Reckless Attack** stance. |
| **Seir-Seir** | Samurai | 2 | When this ship causes a critical, **you choose which system** it damages (picked in Plan Fire each round; if the target already has that one damaged, it's random). |
| **King Tulbrik** | Brute | 2 | **+2 hull.** |
| **Queen Uen** | Queen | 3 | **+1 max speed** and **+1 turn click** per segment. |
| **Kairos** | Torpedo Boat | 2 | In **Plan Fire**, may **rotate the ship 1 click (15°) left or right** before shooting (to line up the torpedo or turn a stronger shield toward the enemy). The rotation happens just before all attacks, so it also changes which shield gets hit. Not while the Maneuvering Thrusters are damaged. |

"Fires twice" = the weapon makes two separate attacks at the same target. Once-per-game weapons
and point-defense never fire twice.

## Ship labels ✅

When a side has more than one ship of the same type, they're labeled **A, B, C…** in deploy order
("Escort A", "Escort B"). Squadrons too ("Fighters squadron A").

## Still open ⚠

- Point costs above are Claude's first pass (the user said "you choose"). Adjust after playtesting.
- Small assumptions still marked ⚠ above: one shot per weapon, Torpedo + Targeted Attack don't
  stack (still 9–10), and a ship can pick no stance.
