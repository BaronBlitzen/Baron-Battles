# Space Battles — Weapons & Ship Cards v2

This replaces the weapon and attack rules in `space-battles-rules.md` (§7 Attacking and the ship
and weapon tables in §9). **Built and live.** Ship cards for every ship: `ship-cards.html` (it reads
the game's own data, so it always matches).

✅ = decided by the user. ⚠ = still open, needs the user's OK before building.

## Ship cards ✅

Every ship gets a card (see `ship-cards.html` for the style, layout and maneuver table,
which the user approved). The card shows:

1. Ship name
2. Class
3. A small graphic
4. Hull and shields (shields per zone: Front / Left / Right / Rear)
5. Maneuver table (columns = speed, rows = 2 u segments, numbers = turn clicks)
6. Weapons (new format, below)
7. Special abilities (and the stances the class can use)

## Power ✅

- Every ship has a **Power** number.
- Every weapon has a **power cost**. Bigger weapons cost more.
- In the firing step, the player chooses which weapons to **power**. Every powered weapon fires
  (each at its own target). The total cost can't be more than the ship's Power.
- ✅ (tentative) A ship's weapons always cost **more in total than its Power** (about 1.5×), so
  there's a real choice every round.
- ✅ (tentative) Power by class:

| Class | Power |
|---|---|
| Corvette | 2 |
| Destroyer | 3 |
| Cruiser | 5 |
| Battleship | 7 |

- ✅ **Unused power is wasted.** It doesn't carry over or boost anything.
- ✅ **Point-defense** (Flak, Thorn Burst, Flechette) is **free and automatic**, as now.

## Weapon count by class ✅

| Class | Weapons |
|---|---|
| Corvette | 1–2 |
| Destroyer | 1–3 |
| Cruiser | 2–4 |
| Battleship | 2–5 |

(Point-defense doesn't count toward these numbers.)

## Firing arcs ✅

The old "4 arcs, fire 2 of them" rule goes away. Each weapon has one of three arc types:

| Arc | Covers |
|---|---|
| **Turret** | 360°. **Mostly Pirates.** Other factions get only a few (point-defense). |
| **Battery** | 270°, everything except the rear 90° |
| **Spinal** | **30°** straight ahead (15° each side of the nose) |

Hull zones and their shields stay as they are: damage still hits the zone facing the attacker.
The Pirates' "a turret attack counts as one of the ship's 2 attacks" rule goes away.

## Range ✅

- Range bands stay the same: Close 0–3 u, Medium 3–6 u, Long 6–9 u.
- Each weapon has a **reach** (Close, Medium or Long). It can fire at targets within its reach.
- **Range does not change the chance to hit.**

## To hit ✅

- Every shot rolls a **d10**. **Every weapon hits on 4+** (70%).
- The target's **agility** raises the number needed by that much.
- A **10 always hits** and is a **critical**, even if the number needed is above 10.

| Target | Agility | Hits on | Chance |
|---|---|---|---|
| Cruiser, Battleship | 0 | 4+ | 70% |
| Destroyer | 1 | 5+ | 60% |
| Corvette, Squadron | 2 | 6+ | 50% |

- ✅ The **Evasive** stance gives **+1 agility**.
- ✅ **Nebula:** attacks into or out of a nebula need **+1** on the roll.
- ✅ **Squadrons** attack with the same d10 roll (4+ plus the target's agility), using their
  current number of shots.
- ✅ **No extra penalty vs squadrons.** The old "−20% vs squadrons" rule goes away; their agility 2
  does that job.
- Modifiers stack.

## Damage ✅

- Written as **damage × shots**: `1×4` = 4 shots, 1 damage per hit.
- Hits go into the hull zone facing the attacker: shields first, then hull (as now).

## Criticals ✅

A roll of **10**:

- If it hits a zone that **still has shields**: the hit does **double damage** (no critical effect).
- If a doubled hit **breaks through** the shields, the leftover goes to hull, but **no critical
  effect** is rolled.
- If it hits **hull** (no shields left in that zone): it causes a **critical effect** like now
  (Damaged Engines, Jammed Thrusters, Weapons Offline, Shield Generator Hit, Bridge Fire, Comms Down).
- ✅ **Weapons Offline** becomes **−2 Power until repaired** (stacks).
- The other critical effects stay as they are.
- ✅ Squadron hits only crit if the squadron is a **bomber** (on a 10).

## Stances ✅

Only the parts that talk about shots or arcs change. Everything else stays as in the rules doc.

| Stance | Old | New |
|---|---|---|
| **Brace** | −1 shot on every arc | **−1 Power** |
| **Evasive** | Fire from only 1 arc; long-range attacks vs you −1 shot | **−2 Power**; you get **+1 agility** |
| **Overcharge** | +1 shot on every weapon | **+2 Power** |
| **Damage Control** | −1 shot on every arc | **−1 Power** |
| **Hunter** | +1 shot and reroll misses vs the marked ship | Hit the marked ship on **one lower** (3+ vs agility 0) |
| **Full Burn** | Can't fire | No change (can't fire) |

## Keywords ✅

All the special weapons stay, as keywords on a weapon line.

| Keyword | Effect |
|---|---|
| **Ion** | Each hit removes **2 shields** from the zone it hits (4 on a 10). Can't damage hull. Can't target squadrons. |
| **Acid** | A hit also burns **1 hull** at the end of the next round, ignoring shields (stacks). |
| **Grapple** | A hit pulls the target **1 u toward you**, and it **can't speed up** next round. |
| **Disrupt** | A hit gives the target **−1 turn click per segment** next round (doesn't stack). |
| **Boarding** | A hit gives the target **1 random critical**, even if shields took the damage. Can't target squadrons. |
| **Breaching** | Crits on a **9 or 10**. |
| **Once** | Can only be fired **once per game**. Still costs power when fired. |
| **PD** (point-defense) | **Free** (no power). Fires automatically at the nearest enemy squadron in Close range. **Ignores squadron agility** (hits on 4+). |

## Weapons ⚠ (first draft, for playtesting)

Reach: **C** = Close, **M** = Medium, **L** = Long.

| Weapon | Faction | Arc | Reach | ⚡ | Damage | Keywords |
|---|---|---|---|---|---|---|
| Railgun Battery | Protectorate | Battery | L | 2 | 1×2 | |
| Heavy Railgun Battery | Protectorate | Battery | L | 3 | 1×3 | |
| Ion Cannon | Protectorate | Battery | M | 1 | —×2 | Ion |
| Torpedo Tubes | Protectorate | Spinal | M | 2 | 2×2 | |
| Particle Lance | Protectorate | Spinal | L | 4 | 3×2 | |
| Flak | Protectorate | Turret | C | free | 1×N | PD |
| Plasma Battery | Djnzuar | Battery | C | 2 | 1×3 | |
| Heavy Plasma Battery | Djnzuar | Battery | C | 3 | 1×4 | |
| Plasma Maw | Djnzuar | Spinal | M | 3 | 2×3 | |
| Spine Driver | Djnzuar | Battery | L | 1 | 1×1 | |
| Acid Spitter | Djnzuar | Battery | C | 1 | 1×1 | Acid |
| Grapple Harpoon | Djnzuar | Battery | M | 1 | 1×1 | Grapple |
| Thorn Burst | Djnzuar | Turret | C | free | 1×N | PD |
| Autocannon Turret | Pirates | Turret | M | 2 | 1×2 | |
| Breaching Cannon | Pirates | Battery | C | 2 | 1×3 | Breaching |
| Disruptor | Pirates | Battery | M | 1 | 1×1 | Disrupt |
| Boarding Harpoon | Pirates | Battery | C | 1 | 1×1 | Boarding, Once |
| Flechette Gun | Pirates | Turret | C | free | 1×N | PD |

Rules of thumb used: shorter reach gets more shots for the same power; Spinal weapons hit
hardest; turrets cost the same as a battery but reach less far. "Ion —×2" = 2 shots that only
strip shields. "1×N" = the number of PD shots is set per ship.

## Ship roster v2 ⚠ (first draft from the user's ratings)

The user rated each ship 1–5 for **O**ffense, **D**efense, **M**obility and **U**tility. The
roster and ratings are ✅. The stats below are a first translation of those ratings, for playtesting.

This replaces the old ship lists in the rules doc (Lancer Torpedo Boat, Warden, Valiant, Bastion,
Gnasher, Ripper, Broodmaw, Dreadhulk, Corsair, Marauder, Freehold).

### How ratings become stats

| Rating | Mobility (speed / turn clicks) | Utility |
|---|---|---|
| 1 | 1–2 / 1 | — |
| 2 | 1–3 / 1 | — |
| 3 | 1–4 / 2 | one special ability |
| 4 | 2–4 / 3 | — |
| 5 | 2–5 / 3 | a major ability (carrier) |

- **Defense** = hull + shields together, scaled by class. Djnzuar get more hull and weak rear
  shields. Pirates get more hull and even shields. Protectorate get more shields and less hull.
- **Offense** = Power and weapons. Power now comes from each ship's Offense, so it no longer follows
  the class table above (the Queen is a battleship with only 2 Power).
- **Agility** stays by class: Corvette 2, Destroyer 1, Cruiser and Battleship 0.
- **Cost** (tentative) = O + D + M + U, plus a class amount: Corvette +0, Destroyer +2, Cruiser +6,
  Battleship +10. Squadrons are bought separately, as now.
- Ships with no Utility rating get **no special ability** (faction traits still apply).

### Protectorate

| Ship | Class | O/D/M/U | Cost | Hull | Shields F/L/R/Rear | Speed | Clicks | ⚡ | Weapons (⚡ cost) | PD | Special |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Strike Carrier | Cruiser | 4/4/3/5 | 22 | 10 | 3/3/3/2 | 1–4 | 2 | 4 | Heavy Railgun Battery (3), Railgun Battery (2), Ion Cannon (1) | Flak 1×2 | **Carrier (3)** |
| Lancer | Cruiser | 5/3/3/– | 17 | 9 | 3/2/2/1 | 1–4 | 2 | 6 | Particle Lance (4), Heavy Railgun Battery (3), Railgun Battery (2) | Flak 1×1 | — |
| Escort | Destroyer | 2/3/4/– | 11 | 7 | 2/2/2/1 | 2–4 | 3 | 3 | Railgun Battery (2), Railgun Battery (2), Ion Cannon (1) | Flak 1×3 | — |
| Torpedo Boat | Corvette | 3/1/5/– | 9 | 4 | 1/1/1/0 | 2–5 | 3 | 2 | Torpedo Tubes (2), Railgun Battery (2) | — | — |

### Djnzuar

| Ship | Class | O/D/M/U | Cost | Hull | Shields F/L/R/Rear | Speed | Clicks | ⚡ | Weapons (⚡ cost) | PD | Special |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Queen | Battleship | 1/5/1/5 | 22 | 20 | 4/3/3/2 | 1–2 | 1 | 2 | Spine Driver (1), Spine Driver (1), Acid Spitter (1) | Thorn 1×3 | **Carrier (4)**, Swarmers only |
| Brute | Cruiser | 4/4/2/– | 16 | 13 | 3/2/2/1 | 1–3 | 1 | 5 | Heavy Plasma Battery (3), Plasma Battery (2), Grapple Harpoon (1), Spine Driver (1) | Thorn 1×1 | — |
| Samurai | Destroyer | 4/2/4/– | 12 | 7 | 2/1/1/0 | 2–4 | 3 | 4 | Heavy Plasma Battery (3), Plasma Battery (2), Acid Spitter (1) | — | — |
| Grunt | Corvette | 2/2/2/– | 6 | 5 | 1/1/1/0 | 1–3 | 1 | 2 | Plasma Battery (2), Spine Driver (1) | — | — |

### Pirates

| Ship | Class | O/D/M/U | Cost | Hull | Shields F/L/R/Rear | Speed | Clicks | ⚡ | Weapons (⚡ cost) | PD | Special |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Firefly | Corvette | 2/3/5/– | 10 | 6 | 2/1/1/1 | 2–5 | 3 | 2 | Autocannon Turret (2), Disruptor (1) | — | — |
| Rouge | Corvette | 3/2/4/2 | 11 | 5 | 1/1/1/1 | 2–4 | 3 | 2 | Breaching Cannon (2), Boarding Harpoon (1, once) | — | — |
| Outrider | Destroyer | 3/3/3/3 | 14 | 8 | 2/1/1/2 | 1–4 | 2 | 3 | Autocannon Turret (2), Breaching Cannon (2), Disruptor (1) | Flechette 1×1 | **Mine Drop** |
| Free Trader | Destroyer | 2/3/3/3 | 13 | 9 | 2/1/1/1 | 1–3 ✅ | 3 at speed 1–2, 1 at speed 3 ✅ | 3 | Autocannon Turret (2), Autocannon Turret (2), Disruptor (1) | Flechette 1×4 | **Smuggler's Hold** |

### Turning by speed ✅

Ships turn tighter when they slow down. This replaces the **Clicks** column in the tables above.
Every ship that can fly at speed 1 gets 2 clicks there (the Free Trader 3). Firefly and Torpedo
Boat stay nimble at every speed. Numbers are turn clicks per segment (1 click = 15°). Above max
speed (after a Full Burn) a ship uses its top-speed number. Stances still apply on top (Evasive
+1, Trained Helms +1, Brace max 1).

| Ship | Speed 1 | Speed 2 | Speed 3 | Speed 4 | Speed 5 |
|---|---|---|---|---|---|
| Queen | 2 | 1 | | | |
| Brute, Grunt | 2 | 1 | 1 | | |
| Strike Carrier, Lancer, Outrider | 2 | 2 | 1 | 1 | |
| Free Trader | 3 | 3 | 1 | | |
| Escort, Samurai, Rouge | | 3 | 2 | 1 | |
| Firefly, Torpedo Boat | | 3 | 3 | 3 | 2 |

### Special abilities

- **Carrier (N):** carries N squadrons (as now).
- ✅ **Mine Drop** (Outrider): **twice per game**, at the end of its move, drop a mine behind the
  ship (mines work as in the rules doc: 3 damage to a ship that moves within 1 u).
- ✅ **Smuggler's Hold** (Free Trader): **once per game**, at the end of a round, restore 2 hull
  **or** remove 1 critical, on itself or a friendly ship within Close range.

### Djnzuar squadrons ✅

The Djnzuar squadrons are renamed so they don't clash with the ship names:

| Squadron | Was | Queen can carry? |
|---|---|---|
| **Swarmers** | Grunt Swarmers | Yes |
| **Gorers** | Brute Gorers | No |
| **Latchers** (⚠ name proposed by Claude) | Grunt Boarding Pod | Yes |

- **Latchers** work like the old Boarding Pod (latch onto a ship, give it 1 critical at the end of
  the round, then they're removed). They can **only attack ships, never squadrons**.
- The "Samurai engineers" faction trait keeps its name, even though there's also a Samurai ship.

### Roster decisions ✅

- The Protectorate has **no battleship** and the Pirates have **no cruiser**.
- **Rouge** (Pirate corvette) added: a fast boarder that harpoons ships to give them a critical.
- **Plasma Maw** stays in the weapon list for a later ship (not on any ship yet).

## Example weapon line

`Railgun Battery · Battery · ⚡2 · Reach Long · 1×2`

## Still to do

- ⚠ Playtest and adjust the weapon and ship numbers above.

