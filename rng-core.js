(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.RTYPE_RNG_CORE = api;
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
  "use strict";

  const MASK64 = (1n << 64n) - 1n;
  const DATETIME_UNIX_EPOCH_MS = 62135596800000;
  const UINT24_SCALE = 1 / 16777216;
  const DAMAGE_RNG_SCALE = 0.425;
  const RANK_BONUS = Object.freeze([1, 1.01, 1.03, 1.06, 1.10, 1.18]);

  const f32 = Math.fround;
  const fadd = (a, b) => f32(f32(a) + f32(b));
  const fsub = (a, b) => f32(f32(a) - f32(b));
  const fmul = (a, b) => f32(f32(a) * f32(b));
  const fdiv = (a, b) => f32(f32(a) / f32(b));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function xorshift64(input) {
    let state = BigInt.asUintN(64, BigInt(input));
    state ^= (state << 13n) & MASK64;
    state ^= state >> 7n;
    state ^= (state << 17n) & MASK64;
    return state & MASK64;
  }

  function nextRandom(input) {
    const state = xorshift64(input);
    return {
      state,
      bits24: Number(state >> 40n),
      value: Number(state >> 40n) * UINT24_SCALE,
    };
  }

  function advanceState(input, count) {
    const steps = Math.max(0, Math.trunc(Number(count) || 0));
    let state = BigInt.asUintN(64, BigInt(input));
    for (let index = 0; index < steps; index++) state = xorshift64(state);
    return state;
  }

  // wallClockMs is a "local wall clock represented as UTC milliseconds".
  // Date.UTC(2026, 6, 23, 12, 34, 56, 789) represents the local fields
  // 2026-07-23 12:34:56.789 without applying a timezone offset.
  function dateTimeTicksFromWallClockMs(wallClockMs) {
    if (!Number.isFinite(wallClockMs)) throw new TypeError("wallClockMs must be finite");
    return BigInt(Math.trunc(wallClockMs + DATETIME_UNIX_EPOCH_MS)) * 10000n;
  }

  function stateAfterGameInstanceInit(wallClockMs) {
    const ticks = dateTimeTicksFromWallClockMs(wallClockMs);
    const seed32 = ticks & 0xffffffffn;
    const streamASeed = xorshift64(seed32);
    const streamBSeed = xorshift64(streamASeed);
    return {
      ticks,
      seed32,
      streamASeed,
      streamBSeed,
      state: streamBSeed,
    };
  }

  function rankMultiplier(rank) {
    return RANK_BONUS[clamp(Math.trunc(Number(rank) || 0), 0, RANK_BONUS.length - 1)] || 1;
  }

  function roundedRate(baseValue, rank, enabled) {
    const multiplier = enabled ? rankMultiplier(rank) : 1;
    return Math.ceil(clamp(Number(baseValue) * multiplier, 0, 1) * 100 - 0.001) / 100;
  }

  function effectiveWeaponAp(weapon, unit, rank) {
    const multiplier = unit?.skill === 3 ? rankMultiplier(rank) : 1;
    return Math.ceil((Number(weapon?.ap) || 0) * multiplier - 0.001);
  }

  function effectiveWeaponHit(weapon, unit, rank) {
    return roundedRate(Number(weapon?.hit) || 0, rank, unit?.skill === 4);
  }

  function unitMaxHp(unit, rank) {
    const multiplier = unit?.skill === 0 ? rankMultiplier(rank) : 1;
    return Math.ceil((Number(unit?.hp) || 0) * multiplier - 0.001);
  }

  function bypassesEvasion(weapon) {
    return Boolean(weapon
      && (weapon.akuukanBuster || weapon.motion === 2
        || (weapon.motion >= 4 && weapon.motion <= 8)));
  }

  function typeEffect(material, unitType) {
    if (unitType <= 6) return [0, 0, 0.20, 0, 0, 0, 0.10, 0.10][material] || 0;
    if (unitType <= 16) return [0.10, 0.20, 0, 0.10, 0.25, 0.15, 0.15, 0.15][material] || 0;
    if (unitType === 18) return [0.10, 0, -0.10, 0, 0.30, 0, 0, 0][material] || 0;
    return 0;
  }

  function formationCount(hp, maxHp, formationMax) {
    const max = Math.max(1, Math.trunc(Number(formationMax) || 1));
    if (!(hp > 0) || !(maxHp > 0)) return 0;
    if (max !== 5) return 1;
    if (hp >= maxHp) return max;
    return clamp(Math.trunc(max * hp / maxHp) + 1, 0, max);
  }

  function displayedHp(hp) {
    const value = Number(hp) || 0;
    if (!(value > 0)) return 0;
    return Math.max(1, Math.trunc(value));
  }

  function matchesDisplayedHpObservation(result, before, after) {
    const observedBefore = Math.max(0, Math.trunc(Number(before) || 0));
    const observedAfter = Math.max(0, Math.trunc(Number(after) || 0));
    if (result?.kind !== "hit" && result?.kind !== "destroyed") return false;
    if (result.displayHpBefore !== observedBefore || result.displayHpAfter !== observedAfter) return false;
    // The battle UI clamps every surviving unit to at least 1 HP, so 0 always
    // means that the internal HP reached zero and the unit was destroyed.
    return observedAfter !== 0 || result.kind === "destroyed";
  }

  function effectiveAttackRange(weapon) {
    if (weapon?.rangeNote === "fineTackle") return { min: 2, max: 2 };
    return {
      min: Number(weapon?.rangeMin),
      max: Number(weapon?.rangeMax),
    };
  }

  function sharedInterceptRange(attackWeapon, interceptWeapon) {
    const attack = effectiveAttackRange(attackWeapon);
    if (!interceptWeapon || attack.min < 1 || attack.max < attack.min
      || interceptWeapon.rangeMin < 1 || interceptWeapon.rangeMax < interceptWeapon.rangeMin) return null;
    const min = Math.max(attack.min, interceptWeapon.rangeMin);
    const max = Math.min(attack.max, interceptWeapon.rangeMax);
    return min <= max ? { min, max } : null;
  }

  function incomingInterceptable(weapon) {
    return Boolean(weapon && !weapon.charge && !weapon.seize
      && [1, 2, 6].includes(weapon.material));
  }

  function normalizedIntercept(value) {
    if (!Number.isFinite(value) || value < 0.1) return 0.1;
    if (value >= 0.9) return 1;
    return value;
  }

  function calculateIntercept(config) {
    const {
      weapon,
      interceptWeapon,
      attackerUnit,
      targetUnit,
      attackerRank = 0,
      targetRank = 0,
      attackerHp,
      targetHp,
      relaxInterceptRange = false,
    } = config;
    const maxAttackerHp = unitMaxHp(attackerUnit, attackerRank);
    const maxTargetHp = unitMaxHp(targetUnit, targetRank);
    const rangeAllowed = relaxInterceptRange || sharedInterceptRange(weapon, interceptWeapon);
    if (!incomingInterceptable(weapon) || !interceptWeapon?.canIntercept || !rangeAllowed
      || !(attackerHp > 0) || !(targetHp > 0)) {
      return {
        active: false,
        rate: 0,
        raw: 0,
        attackAp: 0,
        interceptAp: 0,
        interceptHit: 0,
      };
    }
    const attackAp = effectiveWeaponAp(weapon, attackerUnit, attackerRank);
    const interceptAp = effectiveWeaponAp(interceptWeapon, targetUnit, targetRank);
    const interceptHit = effectiveWeaponHit(interceptWeapon, targetUnit, targetRank);
    const attackerRatio = maxAttackerHp > 0 ? fdiv(attackerHp, maxAttackerHp) : 0;
    const targetRatio = maxTargetHp > 0 ? fdiv(targetHp, maxTargetHp) : 0;
    let raw = attackAp > 0 ? fdiv(interceptAp, attackAp) : 0;
    raw = fmul(raw, targetRatio);
    raw = attackerRatio > 0 ? fmul(raw, fdiv(1, attackerRatio)) : 0;
    raw = fmul(raw, interceptHit);
    return {
      active: true,
      rate: normalizedIntercept(raw),
      raw,
      attackAp,
      interceptAp,
      interceptHit,
    };
  }

  function partialCoverEligible(weapon) {
    return Boolean(weapon
      && weapon.motion === 0
      && effectiveAttackRange(weapon).max === 2
      && weapon.material !== 1);
  }

  function effectiveAvoidRate(config, interceptActive) {
    const {
      weapon,
      attackerUnit,
      targetUnit,
      attackerRank = 0,
      targetRank = 0,
      terrainAvoid = 0,
      evadeFocus = false,
    } = config;
    if (bypassesEvasion(weapon)) return 0;
    const unitType = Number(targetUnit?.type) || 0;
    const targetAvoid = roundedRate(Number(targetUnit?.avoid) || 0, targetRank, targetUnit?.skill === 1);
    const weaponHit = effectiveWeaponHit(weapon, attackerUnit, attackerRank);
    const occupiedHex = Math.max(1, Number(targetUnit?.occupiedHex) || 1);
    let value = f32(targetAvoid);
    if (evadeFocus && !interceptActive) {
      value = fadd(value, fdiv(fmul(targetAvoid, 0.5), occupiedHex));
    }
    if (unitType !== 5 && unitType !== 14) value = fadd(value, Number(terrainAvoid) || 0);
    value = fsub(value, weaponHit);
    return clamp(value, 0, 1);
  }

  function tackleRecoilMultiplier(interceptWeapon) {
    return Number(interceptWeapon?.rangeMin) > 1 ? 0.85 : 1.05;
  }

  function tackleRecoil(config, intercept) {
    if (!config.weapon?.tackle || !intercept.active || !(intercept.rate > 0)) {
      return { active: false, damage: 0, attackerHpAfter: config.attackerHp, destroyed: false };
    }
    let raw = fmul(config.attackerHp, intercept.rate);
    const multiplier = tackleRecoilMultiplier(config.interceptWeapon);
    raw = fmul(raw, multiplier);
    const damage = clamp(raw, 25, 115);
    const attackerHpAfter = Math.max(0, fsub(config.attackerHp, damage));
    return {
      active: true,
      raw,
      damage,
      attackerHpAfter,
      destroyed: !(attackerHpAfter > 0),
      multiplier,
    };
  }

  function calculateDamage(config, randomValue, interceptRate, attackerFormation) {
    const {
      weapon,
      attackerUnit,
      targetUnit,
      attackerRank = 0,
      terrainDefense = 0,
      mode = "normal",
      partialCover = false,
      knockbackBlocked = false,
      tackleCounter = false,
    } = config;
    const effectiveAp = effectiveWeaponAp(weapon, attackerUnit, attackerRank);
    const formationMax = Math.max(1, Number(attackerUnit?.formationMax) || 1);
    const formationRatio = clamp(attackerFormation / formationMax, 0, 1);
    const unitType = Number(targetUnit?.type) || 0;
    const effectiveDefense = !weapon.akuukanBuster && weapon.material === 0
      && unitType !== 5 && unitType !== 14
      ? clamp(Number(terrainDefense) || 0, 0, 1)
      : 0;
    const randomMod = mode === "counter"
      ? fadd(1, fmul(randomValue, DAMAGE_RNG_SCALE))
      : fsub(1, fmul(randomValue, DAMAGE_RNG_SCALE));

    let damage = f32(effectiveAp);
    damage = fmul(damage, fsub(1, effectiveDefense));
    damage = fmul(damage, formationRatio);
    damage = fmul(damage, fsub(1, interceptRate));
    damage = fmul(damage, randomMod);
    if (partialCover && partialCoverEligible(weapon)) damage = fmul(damage, 0.5);
    if (knockbackBlocked && weapon.tackle) damage = fadd(damage, 25);
    if (mode === "counter" && tackleCounter) damage = fadd(damage, 35);
    damage = fmul(damage, fadd(1, typeEffect(weapon.material, unitType)));
    return {
      damage: Math.max(0, damage),
      effectiveAp,
      effectiveDefense,
      formationRatio,
      randomMod,
      affinity: typeEffect(weapon.material, unitType),
    };
  }

  function simulateAttack(input) {
    const config = {
      ...input,
      attackerHp: Math.max(0, Number(input.attackerHp) || 0),
      targetHp: Math.max(0, Number(input.targetHp) || 0),
    };
    let state = BigInt(config.state);
    const consumed = [];
    const maxAttackerHp = unitMaxHp(config.attackerUnit, config.attackerRank);
    const maxTargetHp = unitMaxHp(config.targetUnit, config.targetRank);
    const attackerFormationBefore = formationCount(
      config.attackerHp,
      maxAttackerHp,
      config.attackerUnit?.formationMax,
    );
    const targetFormationBefore = formationCount(
      config.targetHp,
      maxTargetHp,
      config.targetUnit?.formationMax,
    );
    const intercept = calculateIntercept(config);
    const recoil = tackleRecoil(config, intercept);

    const baseResult = {
      state,
      stateBefore: state,
      consumed,
      maxAttackerHp,
      maxTargetHp,
      attackerHpBefore: config.attackerHp,
      targetHpBefore: config.targetHp,
      attackerHpAfter: recoil.attackerHpAfter,
      targetHpAfter: config.targetHp,
      attackerFormationBefore,
      attackerFormationAfter: formationCount(
        recoil.attackerHpAfter,
        maxAttackerHp,
        config.attackerUnit?.formationMax,
      ),
      targetFormationBefore,
      targetFormationAfter: targetFormationBefore,
      intercept,
      recoil,
      guaranteed: bypassesEvasion(config.weapon),
      effectiveAvoid: effectiveAvoidRate(config, intercept.active),
      damage: 0,
      displayHpBefore: displayedHp(config.targetHp),
      displayHpAfter: displayedHp(config.targetHp),
      displayHpLoss: 0,
    };

    if (intercept.rate === 1) {
      return { ...baseResult, kind: recoil.destroyed ? "attacker-destroyed" : "full-intercept" };
    }
    if (recoil.destroyed) return { ...baseResult, kind: "attacker-destroyed" };

    if (!baseResult.guaranteed) {
      const hitRoll = nextRandom(state);
      state = hitRoll.state;
      consumed.push({ purpose: "hit", ...hitRoll });
      if (hitRoll.value < baseResult.effectiveAvoid) {
        return { ...baseResult, state, kind: "miss" };
      }
    }

    const damageRoll = nextRandom(state);
    state = damageRoll.state;
    consumed.push({ purpose: "damage", ...damageRoll });
    const damageInfo = calculateDamage(config, damageRoll.value, intercept.rate, attackerFormationBefore);
    const targetHpAfter = Math.max(0, fsub(config.targetHp, damageInfo.damage));
    const targetFormationAfter = formationCount(
      targetHpAfter,
      maxTargetHp,
      config.targetUnit?.formationMax,
    );
    const displayHpBefore = displayedHp(config.targetHp);
    const displayHpAfter = displayedHp(targetHpAfter);
    const displayHpLoss = Math.max(0, displayHpBefore - displayHpAfter);

    return {
      ...baseResult,
      state,
      kind: targetHpAfter > 0 ? "hit" : "destroyed",
      damage: damageInfo.damage,
      displayHpBefore,
      displayHpAfter,
      displayHpLoss,
      targetHpAfter,
      targetFormationAfter,
      damageInfo,
    };
  }

  function hex64(value) {
    return BigInt.asUintN(64, BigInt(value)).toString(16).padStart(16, "0");
  }

  return Object.freeze({
    MASK64,
    DATETIME_UNIX_EPOCH_MS,
    UINT24_SCALE,
    DAMAGE_RNG_SCALE,
    RANK_BONUS,
    xorshift64,
    nextRandom,
    advanceState,
    dateTimeTicksFromWallClockMs,
    stateAfterGameInstanceInit,
    rankMultiplier,
    roundedRate,
    effectiveWeaponAp,
    effectiveWeaponHit,
    unitMaxHp,
    bypassesEvasion,
    typeEffect,
    formationCount,
    displayedHp,
    matchesDisplayedHpObservation,
    effectiveAttackRange,
    sharedInterceptRange,
    incomingInterceptable,
    normalizedIntercept,
    calculateIntercept,
    partialCoverEligible,
    effectiveAvoidRate,
    tackleRecoilMultiplier,
    calculateDamage,
    simulateAttack,
    hex64,
  });
});
