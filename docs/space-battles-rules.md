# Space Battles — Rules (Draft 1)

Serious military sci-fi fleet battles for the TV + phones. Inspired by the feel of capital-ship
miniatures games, but every turn is **simultaneous**: everyone plans in secret on their phone, then
the TV plays out the whole round at once.

> Status: draft for review. All numbers are first-pass guesses and will be tuned in playtesting.
> Point costs come later.

---

## 1. Setup

- **Players:** 2–8 (the site's current max). Each player commands a small fleet.
- **Teams = factions.** For now there are always **2 teams**. Each team is one faction, and the
  third faction sits out. (More teams can come later, once there are more factions.)
- **Fleet size:** no more than **10 ships per side**. Squadrons don't count toward the 10.
- **Fleets:** each **scenario has a preset fleet** for each faction. Both sides' fleets are
  **equal in value**, no matter how many players are on each team. (Point costs, TBD, will be used
  to balance them.)
- **Game length:** **8 rounds** (about 20–40 minutes).

### Setup flow

1. **Team select.** On their phones, players tap the faction they want to join. The TV shows the
   three factions with the players on each one, live.
2. **Start check.** The game can't move on until players are in **exactly 2 factions**, with at least
   one player in each. If players are spread across all 3, the TV shows a message like
   "Players must be on only 2 factions".
3. **Ship select.** Each player's phone shows their team's fleet. Players tap ships to claim them,
   **first come, first served**. A claimed ship shows the owner's name and color on every teammate's
   phone and on the TV. A player can release a ship to free it up.
4. **Ready.** Each player taps **Ready** when happy with their ships. A player must control at least
   1 ship to be ready. The battle starts only when **every ship on both teams has been claimed**
   and **everyone** is ready. Until then the TV shows what's missing, for example
   "Djnzuar: 2 ships unclaimed".
5. **Player and ship counts:**
   - A team with fewer players than ships is fine. Some players simply control several ships.
   - If a team has **more players than ships**, not everyone can claim one. The TV asks someone to
     switch teams, for example "Protectorate has 6 players but only 5 ships. Someone please switch
     teams."

### Factions in this draft

| Faction | Playstyle |
|---|---|
| **Human Protectorate** | Strike-carrier task forces: squadrons, mobility, medium capital ships |
| **Djnzuar** | Big, slow, powerful capital ships; brutal close range; ramming |
| **Pirates** | Few, tough, fast, generalist small ships; no squadrons; no large ships |

(Magellan, Xar, and Devourers will come later. There are no Titans for now.)

---

## 2. The battlefield

- The map is **36 × 20 units (u)**, shown from above on the TV. Ships are glowing outlines in their
  player's color.
- **Range bands** (the TV measures between the closest edges of the two ships):

| Band | Distance |
|---|---|
| Close | 0–3 u |
| Medium | 3–6 u |
| Long | 6–9 u |

- **Ship sizes:** Corvette 1.0 × 0.5 u, Destroyer 1.4 × 0.7 u, Cruiser 2.0 × 1.0 u,
  Battleship 2.8 × 1.4 u. A squadron is a small circle about 0.4 u across.

### Obstacles

| Obstacle | Effect |
|---|---|
| **Asteroid** | Blocks movement and line of sight. Hitting one stops the ship and deals 2 damage. |
| **Nebula** | Attacks into, out of, or through a nebula lose 1 shot. Squadrons inside can only be targeted from close range. |
| **Planet** | Large. Blocks everything. **Gravity:** a ship that ends its move within 3 u of a planet is pulled 1 u toward it. |
| **Debris field** | A ship that moves through takes 1 damage (to its front zone). Squadrons take 1. |
| **Mine** | Triggers when a ship moves within 1 u: 3 damage to the closest hull zone, then the mine is gone. Mines are neutral. |

---

## 3. Ships

### Hull zones and shields
Every ship (not squadrons) has 4 **hull zones**: **Front, Left, Right, Rear**. Each zone is a 90° wedge
from the ship's center, and each has:
- its own **shields** (they absorb damage first), and
- its own **firing arc** (that zone's weapons can only shoot at targets inside its wedge).

**Hull** is the ship's health. At 0 hull, the ship is destroyed.

### Speed and momentum
- Every ship has a **speed** that carries over from round to round.
- Each round it can change speed by **−1, 0, or +1**, staying within its class's speed range.
- **Each speed point = one 2 u movement segment.**
- Each segment can turn left or right by up to the ship's **turn clicks** (1 click = 15°).
- **Speed 0** (only if the class allows it): the ship stays in place but may rotate 1 click.

---

## 4. The round

Each round has **two planning windows**. Each window lasts **up to 2 minutes** and ends early as soon
as every player taps **Ready**.

| Step | Phones | TV |
|---|---|---|
| **1. Plan: Stance + Movement** | For each ship: pick a **stance**, set **speed** and **turns** (ghost path preview on the mini-map), give **squadron orders** | Map, timer, ✔ next to each ready player |
| **2. Move** | Watch | All stances revealed. Ships move at the same time, then squadrons move |
| **3. Plan: Fire** | For each ship: pick up to 2 arcs and a target for each. The phone only lists valid targets | Map with faint arcs and range bands |
| **4. Fire** | Watch | All attacks fire together. Damage numbers pop up. Wrecks are removed after everything lands |
| **5. End of round** | Watch | Damage Control repairs, critical effects, objective scoring, round counter |

**If a player isn't ready when the timer ends:**
- Stance: **Balanced**.
- Movement: keep the same speed and fly straight.
- Fire: each ship fires its 2 best arcs at the nearest valid targets.

---

## 5. Stances

At the start of each round, every ship secretly picks **one stance**. It lasts the whole round.

| Stance | Type | Benefit | Cost |
|---|---|---|---|
| **Balanced** | — | No bonus | No penalty. The default. |
| **Brace** | Defense | All damage taken is **halved** (rounded up) | **−1 shot** on every arc; max **1 turn click** per segment |
| **Shield Charge** | Defense | Choose a hull zone: **+2 shields** this round | The **opposite** zone's shields count as **0** |
| **Evasive** | Defense / Mobility | **+1 turn click** per segment. Attacks against you from **long range lose 1 shot** | Fire from **only 1 arc** |
| **Full Burn** | Mobility | Change speed by up to **2**, and you may go **+1 above max speed** | **Can't fire**; rear shields count as **0** |
| **Overcharge** | Offense | **+1 shot** on every arc | Attacks against you deal **+1 damage**; **can't change speed** |
| **Hunter** | Offense | Mark an enemy ship: **+1 shot and reroll misses** against it; it **can't use Evasive** against you | You may **only attack that ship** |
| **Damage Control** | Recovery | End of round: restore **2 shields** (spread as you like) **or 1 hull**, **or remove 1 critical** | **Must slow down by 1** (unless at 0–1); **−1 shot** on every arc |

**No repeats:** a ship can't pick the same stance two rounds in a row (Balanced is the exception).

### Stances by class

| Class | Stances (besides Balanced) |
|---|---|
| Squadrons | None (automatic) |
| Corvette | Evasive, Full Burn, Hunter, Overcharge |
| Destroyer | Evasive, Full Burn, Hunter, Shield Charge |
| Cruiser | Brace, Shield Charge, Evasive, Overcharge, Damage Control |
| Battleship | Brace, Shield Charge, Overcharge, Damage Control, Hunter |

---

## 6. Movement and collisions

- All ships move **at the same time** along their planned paths. The TV checks for collisions in
  small steps.
- **Ship vs enemy ship:** both stop just before touching, and each takes **1 damage**
  (Djnzuar ramming: see faction traits).
- **Ship vs friendly ship:** both stop. No damage (no friendly fire).
- **Map edge:** the ship stops at the edge and takes **2 damage**.
- Squadrons move **after** ships, so they can follow or chase them. Squadrons fly over ships and
  never collide.

---

## 7. Attacking

- Each ship can attack from **up to 2 arcs** per round (Evasive: 1). Each arc picks **one target**,
  either a ship or a squadron, that is in that arc, in range, and in line of sight. Two arcs may pick
  the same target.
- A weapon's number is how many **shots** it fires. Each shot rolls to hit, using the weapon's hit
  chance at that range band.
- **No friendly fire:** you can never target or damage your own team.

### Damage
1. Add up the damage from all hits.
2. Apply the defender's stance (for example Brace halves it, Overcharge adds +1).
3. The damage hits the defender's **hull zone that faces the attacker**. That zone's **shields** absorb
   damage first, and the rest goes to **hull**.
4. **Criticals:** every hit that reaches hull rolls the weapon's **crit chance**. On a crit, the ship gets
   a random critical effect.
5. All attacks in the round land at the same time. A ship destroyed this round **still fires**.

### Point-defense (anti-squadron)
Weapons marked **PD** fire **automatically** at enemy squadrons within close range of the ship.
They don't use one of the ship's 2 attacks.

### Critical effects

| Critical | Effect |
|---|---|
| Damaged Engines | Max speed −1 |
| Jammed Thrusters | −1 turn click per segment |
| Weapons Offline | One random arc can't fire next round |
| Shield Generator Hit | One random zone's shields can't be restored |
| Bridge Fire | 1 hull damage at the end of each round until removed |
| Comms Down | This ship's squadrons ignore new orders next round |

Criticals last until removed with **Damage Control** (except Weapons Offline and Comms Down, which
wear off after 1 round).

---

## 8. Squadrons

- Squadrons are small, automatic units. They have **hull but no shields or hull zones**, and they
  attack in every direction at **close range only**.
- They start the battle deployed next to the ship that carries them.
- During movement planning, you give each **wing** (a ship's squadrons) one order:

| Order | Behavior |
|---|---|
| **Escort** | Stay near the carrier; attack enemy squadrons that come close |
| **Attack [ship]** | Fly to that enemy ship and attack it |
| **Intercept** | Hunt the nearest enemy squadrons |

- **Fighters** prefer squadrons; **bombers** prefer ships.

---

## 9. Factions

### Human Protectorate
Long ago, humans lost Earth to alien invaders. The scattered colonies banded together as **the
Protectorate**: an empire ruled by an emperor, with Dukes governing each system in a semi-feudal way.
Its doctrine centers on **strike carrier task forces**: a fast carrier cruiser with destroyer escorts
and torpedo-boat corvettes.

**Traits**
- **Carrier doctrine:** squadrons cost less.
- **Trained helms:** +1 extra turn click when using Evasive or Full Burn.
- **Hangar repair:** at the end of the round, friendly squadrons within close range of their
  carrier restore 1 hull.
- **Weakness:** thinner hulls than the other factions.

**Weapons**

| Weapon | Close | Medium | Long | Damage | Crit | Notes |
|---|---|---|---|---|---|---|
| Railgun | 60% | 60% | 50% | 1 | 10% | Long-range workhorse |
| Torpedo | 75% | 50% | — | 2 | 25% | Front arc only |
| Flak (PD) | 60% | — | — | 1 | — | Auto vs squadrons |

**Ships**

| Ship | Class | Hull | Shields F/L/R/Rear | Speed | Clicks | Front | Left / Right | Rear | PD | Special |
|---|---|---|---|---|---|---|---|---|---|---|
| Lancer Torpedo Boat | Corvette | 4 | 1/1/1/0 | 2–4 | 3 | 3 Torpedo | 1 Railgun | — | 1 Flak | — |
| Warden Escort | Destroyer | 6 | 2/1/1/1 | 1–3 | 2 | 3 Railgun | 2 Railgun | 1 Railgun | 3 Flak | **Screen:** enemy squadrons attacking friendly ships within close range lose 1 shot |
| Valiant Strike Carrier | Cruiser | 9 | 3/2/2/1 | 1–4 | 2 | 3 Railgun | 3 Railgun | 1 Railgun | 2 Flak | Carries **3 squadrons** |
| Bastion Battleship | Battleship | 14 | 4/3/3/2 | 1–2 | 1 | 5 Railgun | 4 Railgun | 2 Railgun | 2 Flak | Rare and expensive |

**Squadrons**

| Squadron | Type | Hull | Speed | vs Squadrons | vs Ships |
|---|---|---|---|---|---|
| Hawk | Fighter | 3 | 5 | 2 shots, 60%, 1 dmg | 1 shot, 40%, 1 dmg |
| Talon | Bomber | 3 | 4 | 1 shot, 30%, 1 dmg | 2 shots, 65%, 1 dmg, 15% crit |

### Djnzuar
A warrior race that looks like a mix of dinosaur, insect, and alligator, with four genders:
**Queens** (who bear offspring), **Brutes** (huge, strong, warlike males), **Samurai** (clever eunuch
engineers who keep civilization running), and **Grunts** (small, expendable eunuchs). Their society
revolves around constant conflict. Warlords (usually Brutes) rule, though Grunt/Samurai collectives
exist too. Their doctrine centers on **big, slow, powerful capital ships**.

**Traits**
- **Ramming:** when a Djnzuar ship collides with an enemy ship, the enemy takes **3 damage** and the
  Djnzuar ship takes 1.
- **Samurai engineers:** Damage Control restores **3 shields or 1 hull, and also removes 1 critical**.
- **Brute hulls:** the most hull of any faction.
- **Weakness:** slow, few turn clicks, weak rear shields, and little long-range firepower.

**Weapons**

| Weapon | Close | Medium | Long | Damage | Crit | Notes |
|---|---|---|---|---|---|---|
| Plasma Cannon | 80% | 50% | — | 1 | 15% | Brawler gun |
| Plasma Maw | 80% | 40% | — | 2 | 20% | Front arc, big ships only |
| Spine Driver | 50% | 50% | 40% | 1 | 5% | Their only long-range weapon |
| Thorn Burst (PD) | 50% | — | — | 1 | — | Auto vs squadrons |

**Ships**

| Ship | Class | Hull | Shields F/L/R/Rear | Speed | Clicks | Front | Left / Right | Rear | PD | Special |
|---|---|---|---|---|---|---|---|---|---|---|
| Gnasher Raider | Corvette | 6 | 2/1/1/0 | 1–3 | 2 | 3 Plasma | 1 Plasma | — | — | — |
| Ripper Destroyer | Destroyer | 9 | 2/2/2/0 | 1–3 | 2 | 4 Plasma | 2 Plasma + 1 Spine | — | 1 Thorn | — |
| Broodmaw Cruiser | Cruiser | 13 | 3/2/2/1 | 1–2 | 1 | 4 Plasma | 3 Plasma + 1 Spine | 1 Spine | 2 Thorn | Carries **3 squadrons** |
| Warlord Dreadhulk | Battleship | 20 | 5/3/3/1 | 1–2 | 1 | 2 Maw + 3 Plasma | 4 Plasma + 2 Spine | 1 Spine | 2 Thorn | **Ram prow:** ramming deals 5 instead of 3 |

**Squadrons**

| Squadron | Type | Hull | Speed | vs Squadrons | vs Ships | Special |
|---|---|---|---|---|---|---|
| Grunt Swarmers | Fighter | 2 | 4 | 2 shots, 50%, 1 dmg | 1 shot, 30%, 1 dmg | Very cheap |
| Brute Gorers | Bomber | 4 | 3 | 1 shot, 30%, 1 dmg | 2 shots, 70%, 1 dmg, 15% crit | — |
| Grunt Boarding Pod | Boarding | 1 | 4 | — | — | **Latch:** if it ends its move touching an enemy ship, at the end of the round that ship gets **1 critical**, then the pod is removed |

### Pirates
No access to large ships, but each pirate ship is someone's **home**, so they're built to last.
Their ships are independent, less specialized, durable, fast, and hard-hitting. They have no
squadrons.

**Traits**
- **Generalists:** shields are even on all sides, and **turret** weapons fire in any direction.
  (A turret attack counts as one of the ship's 2 attacks.)
- **Built to last:** more hull than Protectorate or Djnzuar ships of the same class.
- **Every ship is home:** the first time a pirate ship drops to half hull or less, next round it may
  move as if using **Full Burn, without Full Burn's costs**.
- **Weakness:** only Corvettes, Destroyers, and Cruisers; no squadrons; few, expensive ships.

**Weapons**

| Weapon | Close | Medium | Long | Damage | Crit | Notes |
|---|---|---|---|---|---|---|
| Autocannon | 65% | 55% | 35% | 1 | 10% | Full accuracy against squadrons too |
| Breaching Cannon | 75% | 45% | — | 1 | 35% | Rips ships open: high crit |

**Ships**

| Ship | Class | Hull | Shields (all sides) | Speed | Clicks | Turret (360°) | Front | Left / Right | Rear |
|---|---|---|---|---|---|---|---|---|---|
| Corsair | Corvette | 7 | 1/1/1/1 | 2–4 | 3 | 2 Autocannon | 2 Breaching | 1 Autocannon | 1 Autocannon |
| Marauder | Destroyer | 10 | 2/2/2/2 | 2–4 | 2 | 3 Autocannon | 2 Breaching | 1 Autocannon | 1 Autocannon |
| Freehold | Cruiser | 14 | 3/3/3/2 | 1–3 | 2 | 3 Autocannon | 3 Breaching | 2 Autocannon | 1 Autocannon |

---

## 10. Objectives and winning

- **Destroying ships** scores points for your team. Until point costs exist: Corvette 2,
  Destroyer 3, Cruiser 5, Battleship 8, Squadron 1.
- **Objective points** depend on the mission, chosen in the lobby (or Random).
- After **round 8**, the highest score wins. If only one team has ships left, it wins at once.

| Objective | Rules |
|---|---|
| **Control Points** (first to build) | 3–5 beacons. At the end of each round, the team with the most **presence** within 3 u of a beacon scores 1 point for it. Presence: Corvette 1, Destroyer 2, Cruiser 3, Battleship 4. Squadrons count 0. |
| Salvage | Crates appear each round. A ship that ends its move on one picks it up (−1 max speed while carrying it). Carry it to your edge to score 2. |
| Escort | Each team has a slow, unarmed freighter that moves on its own. Score if yours exits the far edge, and for destroying an enemy's. |
| Station Assault | Each team has a station with shields and guns. Score for damaging enemy stations. |

---

## 11. Screens

### TV
- Top-down map with glowing outlines. Each ship shows small shield marks around it for its 4 zones.
- Round number, phase name, timer, team scores, and a ready ✔ for each player.
- **Move:** ships trace their paths at the same time.
- **Fire:** tracer lines, then damage numbers over each target.
- Stance icons appear over every ship when the round starts playing.

### Phone
- **My Fleet:** a list of your ships. Tap one to see hull, shields for each zone (on a small ship
  diagram), speed and speed range, current stance and the blocked stance, criticals, weapons per arc,
  and its squadron wing's order.
- **Plan Stance + Movement:** for each ship, a big-button stance grid, then speed **−/+** and turn
  clicks for each segment. A **mini-map** shows enough of the battlefield to see where the ship can go,
  with a ghost of the planned path.
- **Plan Fire:** for each ship, its arcs with a list of valid targets (range band and expected damage
  shown).
- **Ready** button, plus the timer.

---

## 12. Example scenario: "Skirmish at the Cinder Belt"

A battle over a contested mining belt. **Objective: Control Points** (3 beacons).
This example uses **Protectorate vs Djnzuar**, so the Pirates sit out.

**Map (36 × 20 u)**
- **Beacons:** center (18, 10), north (18, 4), south (18, 16).
- **Asteroids:** a broken belt running from (12, 2) to (24, 18), with gaps.
- **Nebula:** a 6 × 5 u cloud around the north beacon.
- **Debris field:** a 4 × 3 u field just east of the south beacon.
- **Mines:** 4 neutral mines scattered near the center.
- **Planet:** a small planet in the southwest corner, with a gravity well.

**Deployment**
- Protectorate: west edge (x 0–4).
- Djnzuar: east edge (x 32–36).

**Fleets**

| Faction | Ships | Squadrons |
|---|---|---|
| **Human Protectorate** (5 ships) | 1 Valiant Strike Carrier, 2 Warden Escorts, 2 Lancer Torpedo Boats | 2 Hawk fighters, 1 Talon bomber |
| **Djnzuar** (5 ships) | 1 Warlord Dreadhulk, 2 Ripper Destroyers, 2 Gnasher Raiders | — (no carrier in this fleet) |

Both fleets are worth **18** using the placeholder values in section 10
(Protectorate 5 + 3 + 3 + 2 + 2 + 3 squadrons; Djnzuar 8 + 3 + 3 + 2 + 2).

How it should feel: the Protectorate races for the north beacon and uses its squadrons. The Djnzuar
Dreadhulk pushes through the center and dares anyone to get close.

**Pirate fleet for this scenario:** 1 Freehold, 2 Marauders, 2 Corsairs. They pick off weakened
ships and run before they get caught. (This is worth 15 by the placeholder values. Once real point
costs exist, Pirate ships will cost more each, so the fleets will even out with fewer Pirate ships.)

---

## 13. Build plan

| Version | Contents |
|---|---|
| **v1 (first test)** | Protectorate vs Djnzuar. Corvettes and Cruisers only. Movement, firing, shields, hull zones. Asteroids only. Win: last fleet standing. No squadrons, stances, or criticals yet. |
| v2 | Stances, criticals, all ship classes, Control Points, 8-round limit |
| v3 | Squadrons, Pirates, all obstacles, phone My Fleet screen |
| v4 | Fleet building with a point budget, faction choice in setup, more objectives |
| Later | Magellan, Xar, Devourers, Titans, special squadrons |

---

## 14. Open questions

1. Should squadrons have their own cap per side (for example 8)?
2. Ship names and weapon names: keep these, or rename?
3. Map edge: stop and take 2 damage (current rule), or be destroyed?
