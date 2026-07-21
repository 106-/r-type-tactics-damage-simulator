# R-TYPE TACTICS Damage Simulator

[日本語版 README はこちら](README.md)

Simulates attack, interception, and counterattack damage as well as evasion rates for the weapons in R-TYPE TACTICS. Built on reverse-engineered game data.

Try it here:

- https://106-.github.io/r-type-tactics-damage-simulator/?lang=en
- https://r-11s2.vercel.app/?lang=en

The "Analysis Notes" button in the header shows the reconstructed combat flow, evasion formula, affinity table, and the essentials of terrain, interception, veterancy, and special attacks. The same content is included below under [Analysis Notes](#analysis-notes).

## Current outputs

- Effective evasion (terrain block) rate, hit rate, and guaranteed-hit display based on the bypass setting
- Minimum, RNG-mean, and maximum damage on hit
- Expected damage including evasion
- HP loss ratios (on hit and evasion-weighted) against the target's maximum HP
- Units lost when attacking a full five-unit formation
- Affinity, effective terrain defense, and interception damage reduction
- Interception weapon selection tied to the attack attribute and the target's weapons (reflecting power, accuracy, veterancy, and both sides' current HP ratios)
- Normal/counterattack modes, unit-specific formation size (1/5) with loss ratios, knockback collision, and the 50%-damage flag
- Target unit type and occupied hexes are set automatically from the selected unit
- The veterancy-improved stat is shown for both sides, and the bonus is applied automatically to HP, evasion, weapon AP, and accuracy
- Rich unit picker with name search plus faction (Human, Bydo, Other) and category (Ship, Formation unit, Force) filters

## Analysis Notes

### 01 Combat flow

1. **Attack setup** — Determine weapon, normal/counter mode, range, and other conditions
2. **Interception** — Calculate weapon-versus-weapon reduction for eligible attacks
3. **Terrain block** — Make one random roll against effective evasion
4. **HP damage** — Apply weapon power, formation, interception, damage RNG, terrain defense, and affinity
5. **Post-processing** — Update knockback collision, formation count, and presentation values

```
Damage ≈ Weapon power × Formation ratio × (1−Interception) × Damage RNG × (1−Effective terrain defense) × Affinity
```

The damage modifier is uniformly distributed within each range shown below. It lowers normal-attack damage, while it raises counterattack damage.

| Damage RNG | Range | Mean |
| --- | --- | --- |
| Normal attack RNG | 57.5–100% | 78.75% |
| Counterattack RNG | 100–142.5% | 121.25% |

### 02 Evasion & accuracy

```
Effective evasion = Target evasion + [Focus: target evasion × 0.5 / occupied hexes] + Terrain evasion − Weapon accuracy
```

After clamping to 0–100%, one 24-bit uniform random value is compared. "Focus on evasion" adds `0.5 / occupied hexes` times base evasion. This bonus is not received while counterattacking or intercepting. The simulator treats evasion focus and interception weapons as mutually exclusive.

> **In-game UI discrepancy:** The displayed `Evasion +25%` is neither the actual bonus nor the unit's base evasion. The focus button never updates its numeric text field, leaving the Widget Designer placeholder `+25%` visible for every unit. The real focus bonus is calculated separately from base evasion and occupied hexes. No damage reduction corresponding to “Defense” was found.

#### Guaranteed-hit bypass

```
Guaranteed-hit bypass enabled → 0% evasion / 100% hit rate
```

Attacks with this setting bypass the normal calculation using target evasion, terrain evasion, and weapon accuracy. A displayed accuracy of 100% or the Particle attribute itself is not the direct condition.

- All **131 included charge-weapon definitions have the guaranteed-hit bypass enabled**. Some non-charge special attacks are included as well.
- **Displayed accuracy below 100% can still be a guaranteed hit.** Ivy Rod displays 75%, but its guaranteed-hit bypass skips the evasion calculation in battle.

### 03 Weapon attributes and unit affinities

Weapons have damage-affinity attributes and separate classifications for firing paths and conditions, such as direct, deflected, and homing. Optical, mechanical, biological, and similar attributes determine affinity damage.

| Target group | Optical | Mechanical | Biological | Particle | Flame | Mental | Ice | Acid |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Mechanical | ±0 | ±0 | +20% | ±0 | ±0 | ±0 | +10% | +10% |
| Biological | +10% | +20% | ±0 | +10% | +25% | +15% | +15% | +15% |
| Rock | ±0 | ±0 | ±0 | ±0 | ±0 | ±0 | ±0 | ±0 |
| Ice | +10% | ±0 | −10% | ±0 | +30% | ±0 | ±0 | ±0 |
| Other | ±0 | ±0 | ±0 | ±0 | ±0 | ±0 | ±0 | ±0 |

"Other" is assigned to units such as GRID LOCK and AMBER PUPIL.

### 04 Terrain evasion, terrain defense & partial cover

- **Terrain evasion** is added directly to the block rate used by the hit check.
- **Terrain defense** reduces damage after a hit. In the verified HP formula it applies to optical attacks, while mechanical missiles and similar weapons bypass it.
- **Mechanical and biological walls** are special cases for terrain evasion and optical terrain defense.
- **Partial cover** occurs at maximum range 2 when only one intermediate path is blocked. It reduces non-mechanical damage to 50%.

### 05 Interception is proportional weapon-vs-weapon reduction

The target's interception weapons are candidates against mechanical, biological, and ice attacks.

Rather than choosing an attack distance individually, interception is allowed when the attack and interception weapon ranges overlap by at least one hex. A partial overlap is shown as the shared interceptable range.

Enabling **Relax interception range limit** ignores only range overlap, representing cases where unit shape permits interception. Other conditions, including attack attributes and interception eligibility, still apply.

```
Raw interception = (Interceptor power / Attack power) × (Interceptor current HP / max HP) × (Attacker max HP / current HP) × Interceptor accuracy
```

| Raw interception rate | Applied value |
| --- | --- |
| Below 10% | 10% (minimum interception) |
| 10% to below 90% | Calculated value applied directly |
| 90% or higher | 100% (full interception) |

Capture rounds are a special case with 0% interception. Interception is processed before terrain defense.

#### Intercepting tackle attacks

Tackles, Force Shoot, and similar attacks cause knockback. If terrain or a unit blocks the destination, they gain additional base damage of **+25**.

When a tackle or Force Shoot is intercepted by an eligible interception weapon, the target takes reduced damage and the attacker takes recoil damage.

```
Recoil = Attacker current HP × Interception rate × 0.85 (minimum 25, maximum 115)
```

| Defined ammo in weapon data | Factor |
| --- | --- |
| 2 or more | ×0.85 (all current interception weapons) |
| 1 | ×1.05 (code branch only; no matching weapon in the current data) |

This branch checks the weapon's defined initial/maximum ammo, not its remaining ammo in battle. Remaining ammo is tracked separately, so the factor does not change when one shot remains. All 99 extracted interception definitions have at least two shots, so the simulator fixes the factor at **0.85**.

Recoil is clamped to 25–115. If it destroys the attacker, tackle damage to the target becomes zero. It does not occur without interception or when the weapon is not an eligible interception candidate.

### 06 Capture-round eligibility and success rate

Capture rounds use a dedicated check separate from normal weapon accuracy and target evasion. Their 92% weapon-data accuracy is not the capture success rate.

```
Capture eligibility = Remaining HP above 0% and at most 25%, OR remaining fuel from 0% through 40%
```

| Situation | Capture success rate |
| --- | --- |
| Normal | 60% |
| When evaded | 15% |
| HP/fuel conditions not met | 0% (cannot capture) |

- **HP condition** is met after removing at least 75% of maximum HP, leaving 25% or less. Exactly 25% is included; 0 HP is not.
- **Fuel condition** is met at 40% remaining fuel or less. Even at high HP, consuming at least 60% of fuel makes the unit eligible.
- **Lowering HP further does not increase the success rate.** At either 25% or 1% HP, the rates remain 60% normally and 15% when evaded.
- **Excluded targets** include flagships, large units, and linked parent/child units. A failed attack also cannot capture.
- **Capture rounds have 0% interception** as a special case. A captured unit joins your side only for the mission and is converted to resources afterward.

### 07 Charge and special weapons

- **Charge weapons such as Wave Cannons** have special branches for charging, area selection, and presentation, but their post-hit HP damage generally rejoins the standard path using the displayed attack power.
- For hit determination, every included charge weapon has the **guaranteed-hit bypass** applied and ignores target and terrain evasion.
