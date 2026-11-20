# Space Battles — Rules (Draft 2)

Serious military sci-fi fleet battles for the TV + phones. Inspired by the feel of capital-ship
miniatures games, but every turn is **simultaneous**: everyone plans in secret on their phone, then
the TV plays out the whole round at once.

> Status: Draft 2. All numbers are first-pass guesses and will be tuned in playtesting.
> **⚠ = not yet confirmed by the user.** A coding chat must ask the user about every ⚠ item before
> building it, and must ask about anything this file doesn't cover instead of inventing a rule.
> What is already built is listed in [space-battles-build-brief-m3.md](space-battles-build-brief-m3.md).

---

## 1. Setup

- **Players:** 2–8. Each player builds and commands their own small fleet.
- **Teams = factions.** There are always **2 teams**. Each team is one faction, and the third faction
  sits out. (More teams can come later, once there are more factions.)
- **Fleet size:** no more than **10 ships per side**. Squadrons don't count toward the 10.
- **Game length:** ✅ **9 rounds.** A battle ends when one team has no ships left, when a team
  surrenders, or (in objective missions) when a team reaches the score goal (see §10). After round 9
  the side with the **most hull left on its living ships wins** (equal hull = draw).

### Setup flow

1. **Mission.** On the TV setup screen, the host picks the mission: **Battle**, **Control Points**,
   **Salvage**, **Escort**, **Station Assault**, or **Random**.
2. **Team select.** On their phones, players tap the faction they want to join. The TV shows the
   three factions with the players on each one, live.
3. **Start check.** The game can't move on until players are in **exactly 2 factions**, with at least
   one player in each. Otherwise the TV shows "Players must be on only 2 factions".
4. **Fleet building.** Each player buys their own ships from their faction's list (see §1 Fleet
   building). Each ship shows a short **description** and its **weapons with descriptions**.
5. **Ready.** A player taps **Ready** when happy with their fleet. A player must own at least 1 ship
   to be ready. The battle starts when **everyone** is ready. Until then the TV shows what's missing.

### Fleet building (point cap)

- **Battle size** (picked on the TV; defaults to the size for the number of players): **Small** 60 points and 10 ships per side, 36×20 map (2 players); **Medium** 120 points, 20 ships, 50×28 map (3–6 players); **Large** 180 points, 30 ships, 62×34 map (7–8 players). Asteroids scale with the map.
- Each side gets **60 points** (Small). A side's points are **split evenly between that team's players**,
  rounded down. Examples: 1 player → 60; 2 players → 30 each; 3 → 20 each; 4 → 15 each.
- Both sides always have the same total, no matter how many players are on each team.
- Players buy ships from their faction's list at the costs in §9. **Duplicates are fine.**
- **Squadrons** are bought separately, and only to fill a carrier the player owns
  (up to the carrier's slots: 3, or 4 for the Queen).
- **Unspent points are lost.**
- A side can't have more than **10 ships**. If a team is at 10 ships, its players can't buy more ships.
- If a player's share is too small to buy their faction's cheapest ship, the TV asks someone to
  switch teams, for example "Pirates: 8 points each isn't enough for a ship (cheapest 10). Someone
  please switch teams."
- Ships **deploy automatically**, spread evenly along their team's edge, a few units in from it,
  facing the enemy edge. Squadrons start docked inside their carrier.

### Factions

| Faction | Playstyle |
|---|---|
| **Human Protectorate** (blue) | Strike-carrier task forces: squadrons, mobility, precision, long range |
| **Djnzuar** (orange) | Big, slow, powerful capital ships; brutal close range; ramming |
| **Pirates** (green) | Few, tough, fast, generalist ships; turrets; no squadrons; no large ships |

(Magellan, Xar, and Devourers will come later. There are no Titans for now.)

**Deployment edges:** Protectorate west, Djnzuar east, Pirates take whichever edge is free.

**Colors:** each faction has one color (above). Each player on a team gets a different shade of it
(first player = the main color, then lighter and darker shades).

### Surrender

- Every phone has a **Surrender** button at the bottom during the battle.
- When a player taps it, their teammates' phones show "*Name* wants to surrender".
- The team surrenders only when **every online teammate** has tapped Surrender. The other team wins.
- A player can take back their Surrender tap until the team has surrendered. The phone asks
  "Really surrender?" before the first tap counts.
- Every **online** teammate must tap, including teammates whose ships are all destroyed. An offline
  teammate doesn't count. The button shows from the battle intro until the battle ends, and the
  battle ends **right away** when the last vote comes in (even mid-animation).

### Setup details (decided)

- **Mission picker:** all 6 missions are shown on the TV; ones not built yet are greyed out
  "Coming soon". The host picks with the mouse and can change it until the battle starts.
- **Team sizes change after buying:** everyone keeps their ships. A player who is now over their
  share loses Ready and must remove ships ("Over budget by X points"). Switching sides clears that
  player's fleet.
- **Deployment order:** each player's ships sit together, players in join order, spread evenly from
  top to bottom.
- **Play again:** goes back to the start of Space Battles setup (no teams, no fleets).
- **TV top bar:** shows "Round X/9" and each side's hull left.

---

## 2. The battlefield

- The map is **36 × 20 units (u)**, shown from above on the TV. Ships are glowing outlines in their
  player's color.
- **Range bands** (measured between the closest edges of the two ships or squadrons):

| Band | Distance |
|---|---|
| Close | 0–4 u |
| Medium | 4–8 u |
| Long | 8–12 u |

- **Ship sizes:** Corvette 0.75 × 0.4 u, Destroyer 1.05 × 0.5 u, Cruiser 1.5 × 0.75 u,
  Battleship 2.1 × 1.05 u. A squadron is a circle **0.4 u** across.

### Obstacles

Every battle rolls a new random map. **Each map uses exactly 2 of the 5 obstacle types**, picked at
random (for example asteroids + nebula, or planet + mines). Each chosen type appears in this amount:

| Obstacle | Amount when chosen | Effect |
|---|---|---|
| **Asteroid** | 3–6 | Blocks ship movement and line of sight. A ship that hits one stops there and takes 2 damage. **Squadrons ignore asteroids** (they fly over them, and asteroids don't block their attacks). |
| **Nebula** | 1 cloud, about 6 × 5 u | Attacks into, out of, or through a nebula **lose 1 shot**. Squadrons inside can only be targeted from close range. |
| **Planet** | 1, about 2 u radius ⚠ | Large. Blocks movement and line of sight. **Gravity:** a ship that ends its move within 3 u of the planet's edge is pulled 1 u toward it. |
| **Debris field** | 1, about 4 × 3 u | A ship that moves through it takes 1 damage (to its front zone). Squadrons take 1. |
| **Mine** | 2–4 | Triggers when a ship moves within 1 u: 3 damage to the closest hull zone, then the mine is gone. Mines are neutral. |

- All obstacles are placed in the **middle of the map** (x 9–27), never in a deployment area, and
  with room for ships to pass between them.
- ⚠ Not yet decided: whether hitting a planet (or being pulled into it) deals damage; whether
  planets block squadrons; whether mines and debris affect squadrons (debris says yes, mines don't
  say); how "−1 shot" in a nebula is chosen (proposal: same as §5, the weapon with the most shots).

---

## 3. Ships

### Hull zones and shields
Every ship (not squadrons) has 4 **hull zones**: **Front, Left, Right, Rear**. Each zone is a 90° wedge
from the ship's center, and each has:
- its own **shields** (they absorb damage first), and
- its own **firing arc** (that zone's weapons can only shoot at targets inside its wedge).

Some ships also have a **Turret** arc that fires in any direction (360°).

**Hull** is the ship's health. At 0 hull, the ship is destroyed. **Shields don't recharge** on their
own; only Damage Control restores them.

### Speed and momentum
- Every ship has a **speed** that carries over from round to round. Ships **start at their minimum
  speed**.
- Each round it can change speed by **−1, 0, or +1**, staying within its class's speed range.
- **Each speed point = one 2 u movement segment.**
- Each segment can turn left or right by up to the ship's **turn clicks** (1 click = 15°).
  Some ships have more clicks at low speed (for example the Broodmaw).
- **Speed 0** (only if the class allows it): the ship stays in place but may rotate 1 click.

---

## 4. The round

Each round has **two planning windows**. Each window lasts **up to 2 minutes** and ends early as soon
as every player who still has ships (and is online) taps **Ready**.

| Step | Phones | TV |
|---|---|---|
| **1. Plan: Stance + Movement** | For each ship: pick a **stance**, set **speed** and **turns** (ghost path preview on the mini-map). For each carrier: give **each squadron an order** (launch, return) | Map, timer, ✔ next to each ready player |
| **2. Move** | Watch | **Stance icons appear** over every ship. Ships move at the same time, then squadrons move |
| **3. Plan: Fire** | For each ship: pick up to 2 arcs, and a target **for each weapon** in those arcs. Once-per-game weapons are held unless the player fires them | Map |
| **4. Fire** | Watch | All attacks (ships, squadrons, point-defense) fire together. Damage numbers pop up. Wrecks are removed after everything lands |
| **5. End of round** | Watch | Damage Control repairs, critical effects (Bridge Fire, Acid), Boarding Pod latches, objective scoring, round counter |

**If a player isn't ready when the timer ends:**
- Stance: **Balanced**.
- Movement: keep the same speed and fly straight. Squadron orders stay as they were (docked ones stay docked).
- Fire: each ship fires its 2 best arcs; each weapon shoots the nearest valid target it can hit.
  Once-per-game weapons are **not** used (held).

---

## 5. Stances

At the start of each round, every ship secretly picks **one stance** on the phone (in Plan
Movement). Stances are revealed on the TV when the Move starts. A stance lasts the whole round.

| Stance | Type | Benefit | Cost |
|---|---|---|---|
| **Balanced** | — | No bonus | No penalty. The default. |
| **Brace** | Defense | All damage taken is **halved** (rounded up) | **−1 shot** on every arc; max **1 turn click** per segment |
| **Shield Charge** | Defense | Choose a hull zone: **+2 shields** this round | The **opposite** zone's shields count as **0** |
| **Evasive** | Defense / Mobility | **+1 turn click** per segment. Attacks against you from **long range lose 1 shot** | Fire from **only 1 arc** |
| **Full Burn** | Mobility | Change speed by up to **2**, and you may go **+1 above max speed** | **Can't fire**; rear shields count as **0** |
| **Overcharge** | Offense | **+1 shot** on every weapon the ship fires | Attacks against you deal **+1 damage**; **can't change speed** |
| **Hunter** | Offense | Mark an enemy ship: **+1 shot on every weapon** aimed at it **and reroll misses** against it; it **can't use Evasive** against you | You may **only attack that ship** |
| **Damage Control** | Recovery | End of round: restore **2 shields** (spread as you like) **or 1 hull**, **or remove 1 critical** | **Must slow down by 1** (unless at 0–1); **−1 shot** on every arc |

~~**No repeats**~~: removed. Any stance can be picked every round (see ships v3).

### Stances by class

| Class | Stances (besides Balanced) |
|---|---|
| Squadrons | None (automatic) |
| Corvette | Maneuvering Thrusters, Full Burn, Hunter, Overcharge, Damage Control |
| Destroyer | Maneuvering Thrusters, Full Burn, Hunter, Shield Charge, Damage Control |
| Cruiser | Brace, Shield Charge, Maneuvering Thrusters, Overcharge, Damage Control |
| Battleship | Brace, Shield Charge, Overcharge, Damage Control, Hunter |

### Stance details (decided)
- **Brace** halves **each attack separately** (rounded up), including collision, asteroid, edge,
  mine and debris damage.
- **Overcharge** "+1 damage against you" is **+1 per attack that lands at least one hit** (not per hit).
- **"−1 shot"** penalties (Brace, Damage Control, Evasive at long range, nebulas) remove the shot from
  the weapon with the **most shots** in that arc. A weapon can drop to 0 shots.
- **Shield Charge:** the +2 is temporary and absorbs damage **first**. The opposite zone's shields are
  only switched off for the round, not lost. **Full Burn's** "rear shields count as 0" works the same way.
- **Hunter:** if the marked ship isn't a valid target in the Fire phase, the Hunter ship **doesn't
  attack** that round.
- **Damage Control:** the player picks the repair on the phone (2 shields spread over zones, or
  1 hull, or remove 1 critical). If they don't pick, it removes a critical first, else restores
  shields, else hull. Shields can't go above their starting value (hull not above max). **Samurai engineers** (Djnzuar):
  3 shields or 1 hull, **and also** removes 1 critical.
- **Damage Control "must slow down by 1":** the phone only offers speed −1 (unless already at 0–1).
- **Every ship is home** (Pirates): the free Full Burn move has none of Full Burn's costs.
- **"+1 shot"** (Overcharge, Hunter) goes on **every weapon** the ship fires that round (Hunter: every
  weapon aimed at the marked ship). The "−1 shot" penalties stay **1 per arc**, taken after the bonus.
- **Hunter:** the mark is picked in Plan Movement and can be any living enemy ship. "Reroll misses" =
  each missed shot against it rolls once more. Its Evasive "long range −1 shot" doesn't apply to the
  Hunter's attacks.
- **Brace** also halves Ion shield damage and the end-of-round Acid burn. **Overcharge's** +1 only
  applies to weapon attacks that hit (on an Ion attack it only strips shields); not to collisions or Acid.
- **Shield Charge:** the phone asks for the zone (Front by default). The TV shows the extra shields in
  gold and the switched-off zone faint and dashed.
- **Free "home" burn + stances:** the ship still picks any allowed stance; the free burn only widens its
  speed choices. Picking the Full Burn stance as well means paying its costs.
- **Above max speed after a burn:** next round the ship must come back down to its normal top speed
  (also with Overcharge or Damage Control).
- **Grapple beats Full Burn:** a grappled ship can't speed up, even in Full Burn.
- **Damage Control at minimum speed:** slows by 1 if it can, otherwise stays at its minimum.
- **Damage Control choice** is made in the **Plan Fire** screen (after the move). Default shields go to
  the most-damaged zones. End of round order: Damage Control, then Acid.
- **Secrecy:** stances stay on each player's own phone (not even teammates see them) until the Move.
  Then the TV shows an icon + name over each ship for the rest of the round.
- **Timeouts:** a ship that didn't send orders is Balanced, so it may pick anything next round.
- **Evasive / Full Burn on the phone:** the Fire screen only lets Evasive fire 1 arc and shows
  "can't fire" for Full Burn.

---

## 6. Movement and collisions

- All ships move **at the same time** along their planned paths. The TV checks obstacles and the
  map edge in small steps.
- Each segment **turns first, then flies straight** 2 u.
- **Ships pass through each other** while moving. Ships only collide if their outlines **overlap
  where they end** the move. Then both are pulled back along their own paths until they're just
  touching, and the collision applies:
  - **Ship vs enemy ship:** each takes **1 damage** (Djnzuar ramming: see faction traits).
  - **Ship vs friendly ship:** no damage (no friendly fire).
- **Asteroid / planet:** stops the ship mid-path. Asteroids deal **2 damage**.
- **Map edge:** the ship stops at the edge and takes **2 damage**.
- Collision, asteroid and edge damage hit the hull zone **facing what was hit**, shields first.
- A ship that is stopped by a collision, an obstacle or the edge **drops to its minimum speed**.
- A ship destroyed during the Move phase is removed before Fire (it doesn't fire).
- **Squadrons move after ships**, so they can follow or chase them. Squadrons fly over ships and
  asteroids, never collide, and stop at the map edge with no damage.

---

## 7. Attacking

> **Replaced (built):** attacking, weapons, ships, criticals and the stance wording now follow
> [space-battles-weapons-v2.md](space-battles-weapons-v2.md) (Power, Spinal/Battery/Turret arcs, d10
> to-hit with agility). Where this section or §9 disagrees with it, the v2 doc wins.

- Each ship can attack from **up to 2 arcs** per round (Evasive: 1). **Each weapon** in a fired arc
  picks **its own target**: a ship or a squadron that is in that arc, in range of that weapon, and in
  line of sight. Several weapons (and both arcs) may pick the same target.
- A weapon's number is how many **shots** it fires. Each shot rolls to hit, using the weapon's hit
  chance at that range band.
- **Line of sight** is blocked if the center-to-center line crosses an asteroid or a planet.
- **No friendly fire:** you can never target or damage your own team.
- **Once-per-game weapons** (Torpedo Volley, Boarding Harpoon): the player chooses whether to fire
  them. After firing they're used up for the rest of the battle.

### Damage
1. Add up the damage from all hits **of one attack** (one weapon group at one target).
2. Apply the defender's stance (for example Brace halves it, Overcharge adds +1).
3. The damage hits the defender's **hull zone that faces the attacker**. That zone's **shields** absorb
   damage first, and the rest goes to **hull**. Squadrons have no zones or shields: damage goes
   straight to hull.
4. **Criticals:** see below.
5. All attacks in the round land at the same time. A ship destroyed this round **still fires**.

### Criticals
- Hits land **one by one**, shields first. **Each hit that gets past the shields** rolls its weapon's
  crit chance. On a crit, the ship gets a **random** critical effect.
- Collision, obstacle and edge damage never crit. Squadron hits only crit if the squadron lists a
  crit chance (bombers: 15%).
- The same critical can be taken more than once and **stacks** (two Damaged Engines = max speed −2).
- **Damaged Engines** when the ship is above its new max speed: it drops to the new max.
- TV: small critical icons next to the ship. Phone: critical list in My Fleet.

| Critical | Effect |
|---|---|
| Damaged Engines | Max speed −1 (at once; never below the class's minimum speed) |
| Jammed Thrusters | −1 turn click per segment (can drop to 0; stacks with Disruptor and Brace) |
| Weapons Offline | One random arc that has weapons (turret included) can't fire, from next round until repaired |
| Shield Generator Hit | One random zone's shields can't be restored by Damage Control (Shield Charge still works there) |
| Bridge Fire | 1 hull damage at the end of each round, from the next round, until removed (ignores shields; Brace halves it) |
| Comms Down | This ship's squadrons ignore new orders, from next round until repaired (only rolled on a carrier with living squadrons) |

**All criticals last until removed with Damage Control** (none wear off on their own).

### Critical details (decided)
- **"Past the shields":** the defender's stance (Brace, Overcharge) applies to the attack's total first;
  then the damage is split back into hits in order and shields soak up the first hits. Every hit that
  does at least 1 hull damage rolls for a crit (a 2-damage torpedo hit that was half absorbed counts).
- Each critical type is equally likely.
- **Boarding Harpoon:** a hit gives exactly 1 random critical, even if its damage was all absorbed.
- **Removing:** in the Damage Control picker the player taps which critical to remove; by default the
  oldest. Samurai engineers remove one more the same way, besides their shields or hull.
- End of round order: Damage Control, Bridge Fire, Acid.
- TV: a "CRIT: …" label when one lands, then icons under the ship's hull bar: ⚙ Engines, ↺ Thrusters,
  ⊘ Weapons Offline, ✖ Shield Generator, 🔥 Bridge Fire. (The Pirates' free "home" burn icon is now 🚀.)
  Phone: each critical with its effect in My Fleet; an offline arc shows "⊘ Offline" in Plan Fire.

### Point-defense (anti-squadron)
Weapons marked **PD** fire **automatically** at enemy squadrons within close range of the ship.
They don't use one of the ship's 2 attacks. If several squadrons are in range, **all of that ship's
PD shots go at the nearest one**.

---

## 8. Squadrons

- Squadrons are small, automatic units. They have **hull but no shields or hull zones**, and they
  attack in every direction at **close range only**.
- A carrier holds up to **3**. There is **no cap** on squadrons per side.
- **Docked until launched:** squadrons start the battle **docked inside their carrier**. While docked
  they can't be targeted and don't shoot. Each squadron is launched separately (see orders below).
- **Speed is in units per round** (Hawk speed 5 = up to 5 u per round). Squadrons fly in any direction
  with no turning limits and end as close to their goal as their speed allows.
- **Control:** during Plan Movement, the carrier's owner gives **each squadron its own order**:

| Order | Behavior |
|---|---|
| **Stay docked** | (Docked squadrons only.) Stays inside the carrier |
| **Escort** | Stay next to the carrier; attack enemy squadrons that come close |
| **Attack [ship]** | Fly straight at that enemy ship and stop next to it. If that ship is destroyed, attack the **next nearest enemy ship** |
| **Intercept** | Fly at the nearest enemy squadron. If there are none, act as Escort |
| **Return** | (Launched squadrons only.) Fly back to the carrier; if it reaches it, it docks again |

- Giving a docked squadron Escort, Attack or Intercept **launches** it.
- **Attacks** happen automatically in the Fire phase, alongside ships. **Fighters** hit the nearest
  enemy squadron in close range, otherwise the nearest ship. **Bombers** do the reverse.
- Squadron damage to ships hits the hull zone **facing the squadron**, shields first.
- Ships can also target squadrons with their normal weapons (§7), at lower accuracy (see below).
- **Carrier destroyed:** squadrons still docked are destroyed with it (the enemy scores their kill
  points). Launched squadrons keep fighting on their last order.
- **Winning:** squadrons don't keep a team alive. When a team's last **ship** is destroyed, it loses.
- **Points:** each squadron is worth 1 kill point.
- **Warden Screen:** enemy squadrons attacking friendly ships within close range of a Warden lose
  1 shot.

### Launch and order details (decided)
- **Launching:** a squadron launched in Plan Movement appears next to its carrier after the ships
  move, then flies its order in the same round. A carrier can launch any number at once. On the phone,
  picking Escort / Attack / Intercept for a docked squadron launches it (Escort is the default pick).
- **Returning:** a Return squadron flies to its carrier and docks if it ends touching it (within
  0.25 u). It can launch again in a later round. If the carrier is gone, it holds its position.
- **Timeouts:** each squadron keeps its last order; docked squadrons stay docked.
- **Comms Down:** none of that carrier's squadrons take new orders (no launching or returning) until
  it's repaired.
- If the carrier is destroyed during the Move, squadrons it was about to launch are lost with it.

### Squadron details (decided)
- **Ship weapons vs squadrons:** Autocannons and point-defense use their normal hit chance, Flechettes
  their 70%. Every other weapon gets **−20 points** (Railgun 60% → 40%), never below 10%. **Ion
  Cannons and Boarding Harpoons can't target squadrons.** Acid, Grapple and Disruptor only do their
  damage to a squadron (no extra effect). Squadron hits never crit.
- **Point-defense** always fires on its own; stances (Brace, Overcharge, Full Burn, Hunter, Damage
  Control) and Weapons Offline don't change it.
- **Squadron attacks:** close range (3 u) only. Fighters shoot the nearest enemy squadron, else the
  nearest enemy ship; bombers the reverse; Boarding Pods never shoot. The defending ship's stance
  applies (Brace halves, Overcharge +1). **Warden Screen** = −1 shot per squadron attack; several
  Wardens don't stack (the Warden itself is screened too).
- **Movement:** Escort = each squadron flies to its own spot about 0.6 u from the carrier's hull
  (stays put if the carrier is gone). Attack = fly until touching the target ship. Intercept = fly at
  the nearest enemy squadron (where it was before squadrons moved) and stop when touching it.
  Squadrons from the same carrier aim a little apart so they don't stack.
- **Asteroids** never block shots by squadrons or at squadrons.
- **Boarding Pods:** "touching" = within 0.25 u of the ship's outline at the end of the move. A pod
  shot down in the Fire phase doesn't latch. A pod that latches is removed; nobody gets a kill point.
- **Buying:** a carrier holds any mix of its faction's squadrons; they cost points from the player's
  share; removing a carrier removes its squadrons.
- **Comms Down** is only rolled on a carrier that still has living squadrons.
- **TV:** the top bar's fleet value counts each living squadron (docked or not) as 1. Kill points are
  tracked (shown from step 7). A launched squadron is a small circle in its player's color with
  F / B / P and hull pips; a carrier's label shows how many squadrons are docked (✈2).
- End of round order: Damage Control, Bridge Fire, Acid, Boarding Pod latches.

---

## 9. Factions, ships and weapons

Point costs are first-pass numbers for playtesting.

### Weapons (all factions)

| Weapon | Faction | Close | Medium | Long | Damage | Crit | Description |
|---|---|---|---|---|---|---|---|
| Railgun | Protectorate | 60% | 60% | 50% | 1 | 10% | Long-range workhorse. Steady at every range. |
| Torpedo Volley | Protectorate | 75% | 50% | — | 2 | 25% | **Once per game.** Front arc. A devastating close-to-medium salvo. |
| Particle Lance ★ | Protectorate | 50% | 60% | 65% | 3 | 20% | Front arc, big ships. One heavy, accurate long-range beam. |
| Ion Cannon ★ | Protectorate | 70% | 60% | 40% | 2 to shields | — | Strips shields (2 shield damage per hit) but **can't hurt hull**. Opens a zone for the guns behind it. |
| Flak (PD) | Protectorate | 60% | — | — | 1 | — | Point-defense. Auto vs squadrons. |
| Plasma Cannon | Djnzuar | 80% | 50% | — | 1 | 15% | Brawler gun. |
| Plasma Maw | Djnzuar | 80% | 40% | — | 2 | 20% | Front arc, big ships only. |
| Spine Driver | Djnzuar | 50% | 50% | 40% | 1 | 5% | Their only long-range weapon. |
| Acid Spitter ★ | Djnzuar | 70% | — | — | 1 | 5% | Close only. If it hits, the target takes **1 extra hull damage at the end of the next round**, ignoring shields. |
| Grapple Harpoon ★ | Djnzuar | 70% | 50% | — | 1 | 5% | If it hits, the target is **pulled 1 u toward the attacker** and **can't speed up next round**. Sets up rams. |
| Thorn Burst (PD) | Djnzuar | 50% | — | — | 1 | — | Point-defense. Auto vs squadrons. |
| Autocannon | Pirates | 65% | 55% | 35% | 1 | 10% | Generalist. Full accuracy against squadrons too. |
| Breaching Cannon | Pirates | 75% | 45% | — | 1 | 35% | Rips ships open: high crit. |
| Flechette Gun ★ | Pirates | 50% (70% vs squadrons) | — | — | 1 | 5% | Close only. A storm of small shots; great against squadrons. |
| Disruptor ★ | Pirates | 60% | 50% | — | 1 | 10% | If it hits, the target gets **−1 turn click per segment next round**. |
| Boarding Harpoon ★ | Pirates | 70% | — | — | 1 | — | **Once per game.** Close only. If it hits, the target **automatically takes 1 critical**. |

★ = new weapon. Stats and loadouts are first-pass numbers for playtesting (confirmed as written).

**Weapon details (decided)**
- **A "weapon" is one line on the ship card** (for example "3 Railgun"): all its shots go at one target.
  Different weapons in the same arc may pick different targets, or **Hold** (no target).
- **Torpedo Volley / Particle Lance / Boarding Harpoon** sit in their arc like any weapon: firing any
  weapon in an arc uses that arc as one of the ship's 2 arcs. The Lancer can fire its Railgun and hold
  its Torpedo Volley.
- **Ion Cannon:** each hit removes up to 2 shields from the zone it hits; the rest is wasted and never
  reaches hull.
- **Acid:** stacks (each hit adds 1). A hit in round N burns at the **end of round N+1**, after the
  shooting, ignoring shields. The TV shows a green "−1 acid".
- **Grapple pull:** the target slides up to 1 u toward the attacker and stops early (no damage) at an
  asteroid, another ship or the map edge. Several Grapple hits still pull only 1 u, toward the first
  attacker that hit. The target can't speed up in its next move.
- **Disruptor:** −1 turn click per segment in the target's next move; doesn't stack; a 1-click ship
  can't turn at all that move.
- **Boarding Harpoon:** a hit also gives the target 1 random critical (see §7 Criticals).

### Human Protectorate
Long ago, humans lost Earth to alien invaders. The scattered colonies banded together as **the
Protectorate**: an empire ruled by an emperor, with Dukes governing each system in a semi-feudal way.
Its doctrine centers on **strike carrier task forces**: a fast carrier cruiser with destroyer escorts
and torpedo-boat corvettes.

**Traits**
- **Carrier doctrine:** squadrons cost less.
- **Weakness:** thinner hulls than the other factions.

**Ships**

| Ship | Class | Cost | Hull | Shields F/L/R/Rear | Speed | Clicks | Front | Left / Right | Rear | PD | Special |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Lancer Torpedo Boat | Corvette | 7 | 4 | 1/1/1/0 | 2–4 | 3 | 1 Railgun + 3 Torpedo Volley (once) | 1 Railgun | — | 1 Flak | — |
| Warden Escort | Destroyer | 10 | 6 | 2/1/1/1 | 1–3 | 2 | 3 Railgun | 1 Railgun + 1 Ion | 1 Railgun | 3 Flak | **Screen** (§8) |
| Valiant Strike Carrier | Cruiser | 18 | 9 | 3/2/2/1 | 1–4 | 2 | 2 Railgun + 1 Ion | 3 Railgun | 1 Railgun | 2 Flak | Carries **3 squadrons** |
| Bastion Battleship | Battleship | 28 | 14 | 4/3/3/2 | 1–2 | 1 | 1 Particle Lance + 3 Railgun | 4 Railgun | 2 Railgun | 2 Flak | — |

**Descriptions**
- **Lancer Torpedo Boat:** a fast, fragile knife. Saves its torpedo volley for one decisive strike.
- **Warden Escort:** the carrier's bodyguard. Heavy flak screens friendly ships from squadrons, and
  its ion guns strip enemy shields.
- **Valiant Strike Carrier:** fast for its size. Launches a wing of 3 squadrons and fights at range.
- **Bastion Battleship:** the Protectorate's rare heavy hitter, with a spinal Particle Lance.

**Squadrons**

| Squadron | Type | Cost | Hull | Speed | vs Squadrons | vs Ships |
|---|---|---|---|---|---|---|
| Hawk | Fighter | 2 | 3 | 7 | 2 shots, 60%, 1 dmg | 1 shot, 40%, 1 dmg |
| Talon | Bomber | 2 | 3 | 4 | 1 shot, 30%, 1 dmg | 2 shots, 65%, 1 dmg, 15% crit |

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

**Ships**

| Ship | Class | Cost | Hull | Shields F/L/R/Rear | Speed | Clicks | Front | Left / Right | Rear | PD | Special |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Gnasher Raider | Corvette | 7 | 6 | 2/1/1/0 | 1–3 | 2 | 3 Plasma | 1 Acid Spitter | — | — | — |
| Ripper Destroyer | Destroyer | 12 | 9 | 2/2/2/0 | 1–3 | 2 | 3 Plasma + 1 Grapple | 2 Plasma + 1 Spine | — | 1 Thorn | — |
| Broodmaw Cruiser | Cruiser | 20 | 13 | 3/2/2/1 | 1–2 | 1 (2 at speed 1) | 4 Plasma | 2 Plasma + 1 Acid + 1 Spine | 1 Spine | 2 Thorn | Carries **3 squadrons**. **Slow and steady:** 2 turn clicks per segment at speed 1 |
| Warlord Dreadhulk | Battleship | 32 | 20 | 5/3/3/1 | 1–2 | 1 | 2 Maw + 3 Plasma + 1 Grapple | 4 Plasma + 2 Spine | 1 Spine | 2 Thorn | **Ram prow:** ramming deals 5 instead of 3 |

**Descriptions**
- **Gnasher Raider:** a cheap, armored hunter that closes fast and spits acid.
- **Ripper Destroyer:** harpoons its prey and drags it close for the kill.
- **Broodmaw Cruiser:** a brood-ship that launches Grunt and Brute squadrons; nimble only when slow.
- **Warlord Dreadhulk:** a flying fortress with a ram prow. Dares anyone to get close.

**Squadrons**

| Squadron | Type | Cost | Hull | Speed | vs Squadrons | vs Ships | Special |
|---|---|---|---|---|---|---|---|
| Swarmers | Fighter | 2 | 2 | 6 | 2 shots, 50%, 1 dmg | 1 shot, 30%, 1 dmg | Very cheap |
| Brute Gorers | Bomber | 4 | 4 | 3 | 1 shot, 30%, 1 dmg | 2 shots, 70%, 1 dmg, 15% crit | — |
| Grunt Boarding Pod | Boarding | 2 | 1 | 4 | — | — | **Latch:** if it ends its move touching an enemy ship, at the end of the round that ship gets **1 critical**, then the pod is removed |

### Pirates
No access to large ships, but each pirate ship is someone's **home**, so they're built to last.
Their ships are independent, less specialized, durable, fast, and hard-hitting. They have no
squadrons.

**Traits**
- **Generalists:** shields are nearly even on all sides, and **turret** weapons fire in any direction.
  (A turret attack counts as one of the ship's 2 attacks.)
- **Built to last:** more hull than Protectorate or Djnzuar ships of the same class.
- **Every ship is home:** the first time a pirate ship drops to half hull or less, next round it may
  move as if using **Full Burn, without Full Burn's costs**.
- **Weakness:** only Corvettes, Destroyers, and Cruisers; no squadrons; few, expensive ships.

**Ships**

| Ship | Class | Cost | Hull | Shields F/L/R/Rear | Speed | Clicks | Turret (360°) | Front | Left / Right | Rear |
|---|---|---|---|---|---|---|---|---|---|---|
| Corsair | Corvette | 10 | 7 | 1/1/1/1 | 2–4 | 3 | 2 Autocannon | 2 Breaching + 1 Boarding Harpoon (once) | 1 Autocannon | 1 Autocannon |
| Marauder | Destroyer | 14 | 10 | 2/2/2/2 | 2–4 | 2 | 2 Autocannon + 1 Disruptor | 2 Breaching | 2 Flechette | 1 Autocannon |
| Freehold | Cruiser | 22 | 14 | 3/3/3/2 | 1–3 | 2 | 3 Autocannon | 3 Breaching + 1 Disruptor | 4 Flechette | 1 Autocannon |

**Descriptions**
- **Corsair:** a fast raider that latches on with a boarding harpoon and tears ships open.
- **Marauder:** a sturdy all-rounder whose disruptor leaves targets wallowing.
- **Freehold:** a whole crew's home and fortress, bristling with flechettes against squadrons.

---

## 10. Missions, objectives and winning

- **Kill points:** destroying enemies scores points for your team: Corvette 2, Destroyer 3,
  Cruiser 5, Battleship 8, Squadron 1. The TV shows both teams' scores.
- **Battle** (no objective): last fleet standing wins (or the other team surrenders). Kill points are
  shown but don't end the game.
- **Objective missions:** the **first team to 10 points** wins. **Kill points count toward the 10.**
  Destroying every enemy ship, or the enemy surrendering, still wins at once.
- If both teams reach 10 in the same round, or both fleets are wiped out in the same round, it's a
  **draw**. ⚠ (the "both reach 10" tie is a proposal; the user only confirmed draws for wipeouts)

| Mission | Rules |
|---|---|
| **Control Points** | 3–5 beacons placed in the middle of the map. At the end of each round, the team with the most **presence** within 3 u of a beacon scores 1 point for it. Presence: Corvette 1, Destroyer 2, Cruiser 3, Battleship 4. Squadrons count 0. |
| **Salvage** | 1 crate appears at a random spot in the middle each round. A ship that ends its move on a crate picks it up (−1 max speed while carrying it). Bring it back to your own deployment edge (within 4 u) to score **2**. ⚠ what happens to a crate when its carrier is destroyed |
| **Escort** | Each team has an unarmed **freighter** (hull 8, speed 1, no shields) that starts at its own edge and moves straight toward the far edge on its own. Score **3** if yours exits the far edge, and **3** for destroying the enemy's. ⚠ freighter collisions; is it a "ship" for winning |
| **Station Assault** | Each team has a fixed **station** near its own edge: hull 20, 2 shields on each side, 2 Railguns in a turret. Score **1 per 2 hull damage** you deal to the enemy station, and **5** for destroying it. ⚠ is it a "ship" for winning |
| **Random** | One of the above, picked at random. |

---

## 11. Screens

### TV
- Top-down map with glowing outlines. Each ship shows small shield marks around it for its 4 zones,
  a hull bar, critical icons, and its stance icon while the round plays out.
- Round number, phase name, timer, **team scores**, and a ready ✔ for each player.
- **Setup:** mission picker, the three factions with their players, and what's missing before start.
- **Move:** ships trace their paths at the same time, then squadrons move.
- **Fire:** tracer lines, then damage numbers over each target.

### Phone
- **Fleet building:** the faction's ships with cost, description, stats, and weapons with
  descriptions; points left; buy / remove buttons; Ready.
- **My Fleet:** a list of your ships. Tap one to see hull, shields for each zone, speed and speed
  range, current stance and the blocked stance, criticals, weapons per arc (with descriptions), and
  its squadrons and their orders.
- **Plan Stance + Movement:** for each ship, a big-button stance grid, then speed **−/+** and turn
  clicks for each segment. A **mini-map** with a ghost of the planned path. Carriers: an order for each squadron (launch, return).
- **Plan Fire:** for each ship, its arcs; in a fired arc, each weapon picks its own target from the
  valid targets (range band and expected damage shown). Once-per-game weapons show "Hold / Fire".
- **Ready** button, the timer, and the **Surrender** button at the bottom.

---

## 12. Build plan

| Version | Contents | Status |
|---|---|---|
| v1 | Protectorate vs Djnzuar, Corvettes and Cruisers, movement, firing, shields, hull zones, asteroids | **Built** |
| v2 | Pirates (turrets, every ship is home), all ship classes, pass-through collisions, random asteroids | **Built** |
| v3 (next) | Everything else in this file: fleet building + point costs, surrender, no round limit, new weapons + split fire, stances, criticals, squadrons + PD, all obstacles, missions + scores | See [space-battles-build-brief-m3.md](space-battles-build-brief-m3.md) |
| Later | Magellan, Xar, Devourers, Titans, special squadrons | — |

---

## 13. Open questions

1. Ship names and weapon names: keep these, or rename?
2. Map edge: stop and take 2 damage (current rule), or be destroyed?
3. All ⚠ items above.
