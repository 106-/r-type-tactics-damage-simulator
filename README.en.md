# R-TYPE TACTICS Damage Simulator & RNG State Estimator

[日本語版 README はこちら](README.md)

Tools for [R-Type Tactics I•II Cosmos](https://rtypetactics.com/) that:

- Simulate attack, interception, and counterattack damage and evasion rates for the weapons (`index.html`)
- Estimate the RNG seed and deterministically predict the next attack result (`rng.html`)

Built on reverse-engineered game data.

Try it here:

- https://106-.github.io/r-type-tactics-damage-simulator/?lang=en
- https://r-11s2.vercel.app/?lang=en

## Features

- Minimum, RNG-mean, and maximum damage on hit for any attacker and target in the game
    - Affinity, effective terrain defense, and interception damage reduction
    - Applies changes in attack power based on unit attrition, veterancy, and knockback
    - Recoil damage to the attacker for tackle attacks
- Evasion rate calculation based on unit settings
    - Veterancy and terrain modifiers
- Estimate the RNG seed from the game startup time and the random values observed during actual play
    - After the seed is estimated, deterministically predict the result of the next attack

## Damage System Details

### 01 Combat flow

1. **Attack setup** — Determine weapon, normal/counter mode, range, and other conditions
2. **Interception** — Calculate weapon-versus-weapon reduction for eligible attacks
3. **Hit check** — Make one random roll against effective evasion
4. **HP damage** — Apply weapon power, formation, interception, damage RNG, terrain defense, and affinity
5. **Post-processing** — Update knockback collision, formation count, and presentation values

```
Damage ≈ Weapon power × Formation ratio × (1−Interception) × Damage RNG × (1−Effective terrain defense) × Affinity
```

The damage modifier is drawn from a uniform distribution within each range shown below. It lowers normal-attack damage, while it raises counterattack damage.

| Damage RNG | Range | Mean |
| --- | --- | --- |
| Normal attack RNG | 57.5–100% | 78.75% |
| Counterattack RNG | 100–142.5% | 121.25% |

### 02 Evasion & accuracy

```
Effective evasion = Target evasion + [Focus: target evasion × 0.5 / occupied hexes] + Terrain evasion − Weapon accuracy
```

After clamping to 0–100%, a uniform random value is compared. “Focus on evasion” adds `base evasion × 0.5 / occupied hexes`. This bonus is not received while counterattacking or intercepting.

> **In-game UI note:** “Focus on evasion/defense” always displays “Evasion +25%”, but this appears to be a display bug. The actual focus bonus is calculated separately from base evasion and occupied hexes.

Terrain evasion for multi-hex units references **only the terrain of the unit's reference hex (the marked hex)**, not all occupied hexes.

#### Guaranteed hit

```
Guaranteed-hit setting enabled → 0% evasion / 100% hit rate
```

Attacks with guaranteed-hit setting, primarily charge weapons, bypass the normal calculation using target evasion, terrain evasion, and weapon accuracy.

- **Displayed accuracy below 100% can still be a guaranteed hit.** Ivy Rod displays 75%, but its guaranteed-hit setting skips the evasion calculation in battle.

### 03 Attribute affinity

Weapons and units each have attributes. There are 8 weapon attributes and 5 unit attributes. Their combination determines damage amplification and reduction.

| Target group | Optical | Mechanical | Biological | Particle | Flame | Mental | Ice | Acid |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Mechanical | ±0 | ±0 | +20% | ±0 | ±0 | ±0 | +10% | +10% |
| Biological | +10% | +20% | ±0 | +10% | +25% | +15% | +15% | +15% |
| Rock | ±0 | ±0 | ±0 | ±0 | ±0 | ±0 | ±0 | ±0 |
| Ice | +10% | ±0 | −10% | ±0 | +30% | ±0 | ±0 | ±0 |
| Other | ±0 | ±0 | ±0 | ±0 | ±0 | ±0 | ±0 | ±0 |

#### Internal unit types

The game internally defines 21 unit types corresponding to attribute affinities.

| Simulator label | Representative units |
| --- | --- |
| Mechanical units and flagships | ARROW-HEAD, HEIMDALL, KOMBILER, BOLDO |
| Mechanical parts | BRIDGE SECTION, FRAGARACH CANNON, KOMBILER LASER |
| Surface ships | EGIR, RAHN, HIMINGLAVA |
| Submersible mechanical units | FROGMAN, SEA TIGER, GRANVIA F/M |
| Wall-mounted mechanical units | CORBETT DEFENSE TURRET / ANTI-AIR TURRET |
| Ground mechanical units | ALL-PURPOSE TANK, PISTAPH, BERRY series |
| Biological units | GAUPER, Bydo fighters, Forces |
| Large biological units and flagships | NOZARI, DOBKERATOPS, BERMATE |
| Biological parts | DOBKERATOPS parts, BERMATE BERYL LEAF, MOORA parts |
| Aquatic lifeforms | LEIDI |
| Floating biological units | GUSTERNET, GUSTERNET VARIANT, BARACCUS |
| Wall-mounted biological units | NEWT |
| Space/water biological units | BREAMS |
| Rocks and structures | SKYSCRAPER, rock formations, SHIP'S WRECKAGE |
| Ice | Ice floes, floating ice, ice pillars |
| Anomalous entities | GRIDLOCK series, AMBER PUPIL, Xelf-24 |
| Anomalous entity parts | GRIDLOCK EYE |

### 04 Terrain

- **Terrain evasion** is added directly to the block rate used by the hit check.
- **Terrain defense** reduces damage after a hit. It applies only to optical attacks; mechanical attacks (missiles, etc.) ignore it.

### 05 Interception

The target's interception weapons are candidates against mechanical, biological, and ice attacks.

```
Raw interception = (Interceptor power / Attack power) × (Interceptor current HP / max HP) × (Attacker max HP / current HP) × Interceptor accuracy
```

| Raw interception rate | Applied value |
| --- | --- |
| Below 10% | 10% (minimum interception) |
| 10% to below 90% | Calculated value applied directly |
| 90% or higher | 100% (full interception) |

Capture rounds are a special case with 0% interception. Interception is processed before terrain defense.

#### Intercepting and counterattacking tackle attacks

When a tackle or Force Shoot is intercepted, the target takes reduced damage and the attacker takes recoil damage.

```
Recoil = Attacker current HP × Interception rate × range factor (minimum 25, maximum 115)
```

The range factor is **1.05** when the interception weapon's minimum range is 1, and **0.85** when it is 2 or greater.

Tackles, Force Shoot, and similar attacks cause knockback. If terrain or a unit blocks the destination, they gain additional base damage of **+25**.

Recoil is clamped to 25–115. If it destroys the attacker, tackle damage to the target becomes zero.

Counterattacking a tackle, Force Shoot, or similar attack adds a fixed **+35** to counterattack damage. This depends on the initiating attack being a tackle, not on the counterattack weapon type, and is added before affinity is applied.

### 06 Capture

Capture rounds use a dedicated check separate from normal weapon accuracy and target evasion.

```
Capture eligibility: Remaining HP ≤ 25% or remaining fuel ≤ 40%
```

| Situation | Capture success rate |
| --- | --- |
| Normal | 60% |
| When evaded | 15% |
| HP/fuel conditions not met | 0% (cannot capture) |

- **Lowering HP below 25% does not increase the success rate.** At either 25% or 1% HP, the rates remain 60% normally and 15% when evaded.

### 07 Miscellaneous

**Battle animation modifier arrows:** The ratio between the actual damage and a reference damage (recalculated without terrain defense, affinity, and condition modifiers, using the same damage RNG) is shown as 1–3 🔼/🔽 arrows. Arrow direction is based on the defender's perspective (likely): 🔼 means less damage, 🔽 means more damage.

- **No arrows:** Modifier absolute value below 0.01%
- **🔼 / 🔽:** 0.01% or more, below 10%
- **🔼🔼 / 🔽🔽:** 10% or more, below 20%
- **🔼🔼🔼 / 🔽🔽🔽:** 20% or more
