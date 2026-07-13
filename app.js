(() => {
  "use strict";

  const data = window.RTYPE_SIM_DATA;
  const $ = (id) => document.getElementById(id);
  const rankBonus = [1, 1.01, 1.03, 1.06, 1.10, 1.18];
  const materialNames = ["光学", "機械", "生体", "粒子", "火炎", "精神", "氷", "酸"];
  const typeNames = ["機械ユニット", "機械艦", "機械艦パーツ", "艦船", "潜行機械", "機械壁", "機械床", "生物ユニット", "生物艦", "生物艦パーツ", "水中生物", "非水中生物", "潜行生物", "浮遊生物", "生体壁", "生体床", "宇宙水棲生物", "岩石", "氷", "異文明ユニット", "異文明艦パーツ"];
  const skillNames = new Map([
    [0, "HP"],
    [1, "回避率"],
    [2, "燃料（現行該当なし）"],
    [3, "攻撃力"],
    [4, "命中率"],
    [255, "なし"],
  ]);
  const weapons = new Map(data.weapons.map((weapon) => [weapon.id, weapon]));
  const attackRangeOverrides = new Map([
    ["WEAPON_ID.B_FINE_ATTACK", { min: 2, max: 2, note: "特殊体当たり距離" }],
  ]);
  let visibleAttackers = data.units;
  let visibleTargets = data.units;
  let interceptContextKey = "";
  let lastAttackerId = "";
  let calculatePending = false;

  // 1操作で複数の更新経路からcalculateが呼ばれるため、1フレームに1回へまとめる
  function scheduleCalculate() {
    if (calculatePending) return;
    calculatePending = true;
    requestAnimationFrame(() => {
      calculatePending = false;
      calculate();
    });
  }

  function openKnowledge() {
    $("knowledgeDialog").showModal();
  }

  function closeKnowledge() {
    $("knowledgeDialog").close();
  }

  function option(value, text) {
    const element = document.createElement("option");
    element.value = value;
    element.textContent = text;
    return element;
  }

  function unitLabel(unit) {
    return unit.name;
  }

  function skillName(unit, role) {
    const skill = unit?.skill;
    const name = skillNames.get(skill) || `不明 (${skill ?? "-"})`;
    if (skill === 255 || skill == null) return name;
    const intercepting = role === "target" && Boolean($("interceptWeapon")?.value);
    const usedHere = role === "attacker"
      ? skill === 3 || skill === 4
      : skill === 0 || skill === 1 || (intercepting && (skill === 3 || skill === 4));
    return `${name}${usedHere ? "（今回反映）" : "（今回不使用）"}`;
  }

  function rankAdjustedRate(baseValue, rank, enabled) {
    const multiplier = enabled ? (rankBonus[rank] || 1) : 1;
    return Math.ceil(Math.min(1, Math.max(0, baseValue * multiplier)) * 100 - .001) / 100;
  }

  function fillUnitSelect(select, units, selectedId) {
    select.replaceChildren();
    for (const unit of units) select.append(option(unit.id, unitLabel(unit)));
    if (units.some((unit) => unit.id === selectedId)) select.value = selectedId;
  }

  function filteredUnits(query, requireWeapon) {
    const needle = query.trim().toLocaleLowerCase("ja");
    return data.units.filter((unit) => {
      if (requireWeapon && !unit.weapons.some((id) => weapons.get(id)?.attack)) return false;
      return !needle || unit.name.toLocaleLowerCase("ja").includes(needle) || unit.id.toLowerCase().includes(needle);
    });
  }

  function selectedUnit(selectId, list) {
    return list.find((unit) => unit.id === $(selectId).value) || data.units.find((unit) => unit.id === $(selectId).value);
  }

  function updateWeapons() {
    const attacker = selectedUnit("attacker", visibleAttackers);
    $("attackerSkill").value = skillName(attacker, "attacker");
    const attackerChanged = (attacker?.id || "") !== lastAttackerId;
    lastAttackerId = attacker?.id || "";
    const formationMax = attacker?.formationMax || 1;
    $("formationMax").value = String(formationMax);
    $("formationCurrent").max = String(formationMax);
    const currentFormation = Number($("formationCurrent").value);
    if (attackerChanged || !Number.isFinite(currentFormation) || currentFormation < 1 || currentFormation > formationMax) {
      $("formationCurrent").value = String(formationMax);
    }
    $("formationCurrent").disabled = formationMax === 1;
    const previous = $("weapon").value;
    const list = (attacker?.weapons || []).map((id) => weapons.get(id)).filter((weapon) => weapon?.attack);
    $("weapon").replaceChildren();
    for (const weapon of list) $("weapon").append(option(weapon.id, `${weapon.name}  [威力 ${weapon.ap}]`));
    if (list.some((weapon) => weapon.id === previous)) $("weapon").value = previous;
    updateWeaponMeta();
  }

  function updateWeaponMeta() {
    const weapon = weapons.get($("weapon").value);
    const knockbackEnabled = Boolean(weapon?.tackle);
    $("knockbackBlocked").disabled = !knockbackEnabled;
    $("knockbackLabel").classList.toggle("disabled-control", !knockbackEnabled);
    if (!knockbackEnabled) $("knockbackBlocked").checked = false;
    updateAttackDistance(weapon);
    updatePartialCoverControl(weapon);
    if (!weapon) {
      $("weaponMeta").textContent = "攻撃武器の関連付けがないユニットです。";
      updateInterceptWeapons();
      return;
    }
    const attackRange = effectiveAttackRange(weapon);
    const range = attackRange.min === -1 ? "専用範囲" : `${attackRange.min ?? "?"}–${attackRange.max ?? "?"} HEX${attackRange.note ? `（${attackRange.note}）` : ""}`;
    const charge = weapon.charge ? ` / チャージ ${weapon.charge}T` : "";
    const interceptable = incomingInterceptable(weapon) ? " / 迎撃対象" : " / 迎撃対象外";
    $("weaponMeta").textContent = `${materialNames[weapon.material] || "?"} / 命中値 ${(weapon.hit * 100).toFixed(0)}% / ${range}${charge}${weapon.tackle ? " / ノックバック" : ""}${interceptable}`;
    updateInterceptWeapons();
  }

  function updateAttackDistance(weapon) {
    const select = $("attackDistance");
    const previous = Number(select.value);
    const range = effectiveAttackRange(weapon);
    select.replaceChildren();
    if (!weapon || range.min == null || range.max == null || range.min < 1 || range.max < range.min) {
      select.append(option("", "専用範囲"));
      select.disabled = true;
      return;
    }
    for (let distance = range.min; distance <= range.max; distance++) {
      select.append(option(String(distance), `${distance} HEX`));
    }
    if (previous >= range.min && previous <= range.max) select.value = String(previous);
    select.disabled = range.min === range.max;
  }

  function effectiveAttackRange(weapon) {
    const override = attackRangeOverrides.get(weapon?.id);
    return override || { min: weapon?.rangeMin, max: weapon?.rangeMax, note: "" };
  }

  function selectedAttackDistance() {
    const distance = Number($("attackDistance").value);
    return Number.isFinite(distance) && distance >= 1 ? distance : 0;
  }

  function weaponCoversDistance(weapon, distance = selectedAttackDistance()) {
    return Boolean(weapon && distance >= 1 && weapon.rangeMin <= distance && distance <= weapon.rangeMax);
  }

  function partialCoverEligible(weapon) {
    return Boolean(weapon && selectedAttackDistance() === 2 && weapon.rangeMax === 2 && weapon.material !== 1);
  }

  function updatePartialCoverControl(weapon) {
    const eligible = partialCoverEligible(weapon);
    const label = $("partialCoverLabel");
    const input = $("partialCover");
    const status = $("partialCoverStatus");
    input.disabled = !eligible;
    label.classList.toggle("disabled-control", !eligible);
    label.classList.toggle("available-control", eligible);
    if (!eligible) input.checked = false;

    if (!weapon) {
      status.textContent = "武器未選択";
      label.title = "攻撃武器を選択してください";
    } else if (weapon.material === 1) {
      status.textContent = "機械属性は無視";
      label.title = "機械属性は部分遮蔽による50%減衰を受けません";
    } else if (weapon.rangeMax !== 2) {
      status.textContent = "最大射程2のみ";
      label.title = "部分遮蔽フラグは最大射程2の攻撃でのみ生成されます";
    } else if (selectedAttackDistance() !== 2) {
      status.textContent = "距離2のみ";
      label.title = "部分遮蔽は実際の攻撃距離が2 HEXのときだけ発生します";
    } else {
      status.textContent = "有効時 −50%";
      label.title = "中間経路の片方だけが遮られている場合に選択します";
    }
  }

  function typeEffect(material, unitType) {
    if (unitType <= 6) return [0, 0, .20, 0, 0, 0, .10, .10][material] || 0;
    if (unitType <= 16) return [.10, .20, 0, .10, .25, .15, .15, .15][material] || 0;
    if (unitType === 18) return [.10, 0, -.10, 0, .30, 0, 0, 0][material] || 0;
    return 0;
  }

  function unitGroupName(unitType) {
    if (unitType <= 6) return "機械";
    if (unitType <= 16) return "生物";
    if (unitType === 17) return "岩石";
    if (unitType === 18) return "氷";
    return "異質";
  }

  function setModifierBadgeState(element, value) {
    element.classList.toggle("is-positive", value > 0);
    element.classList.toggle("is-negative", value < 0);
    element.classList.toggle("is-neutral", value === 0);
  }

  function normalizedIntercept(value) {
    if (!Number.isFinite(value) || value < .1) return .1;
    if (value >= .9) return 1;
    return value;
  }

  function incomingInterceptable(weapon) {
    return Boolean(weapon && !weapon.seize && [1, 2, 6].includes(weapon.material));
  }

  function effectiveWeaponAp(weapon, unit, rank) {
    const multiplier = unit?.skill === 3 ? (rankBonus[rank] || 1) : 1;
    return Math.ceil((weapon?.ap || 0) * multiplier - .001);
  }

  function effectiveWeaponHit(weapon, unit, rank) {
    return rankAdjustedRate(weapon?.hit || 0, rank, unit?.skill === 4);
  }

  function clampPercentInput(id) {
    const value = Number($(id).value);
    return Number.isFinite(value) ? Math.min(1, Math.max(.01, value / 100)) : 1;
  }

  function interceptDetails(attackWeapon, attacker, target) {
    const interceptWeapon = weapons.get($("interceptWeapon").value);
    if (!incomingInterceptable(attackWeapon) || !interceptWeapon?.canIntercept || !weaponCoversDistance(interceptWeapon)) {
      return { rate: 0, raw: 0, attackAp: 0, interceptAp: 0, interceptHit: 0, attackerHp: 1, interceptorHp: 1, weapon: null };
    }
    const attackAp = effectiveWeaponAp(attackWeapon, attacker, Number($("rank").value));
    const interceptAp = effectiveWeaponAp(interceptWeapon, target, Number($("targetRank").value));
    const interceptHit = effectiveWeaponHit(interceptWeapon, target, Number($("targetRank").value));
    const attackerHp = clampPercentInput("attackerHpRate");
    const interceptorHp = clampPercentInput("interceptorHpRate");
    const raw = attackAp > 0 ? (interceptAp / attackAp) * interceptorHp * (1 / attackerHp) * interceptHit : 0;
    return { rate: normalizedIntercept(raw), raw, attackAp, interceptAp, interceptHit, attackerHp, interceptorHp, weapon: interceptWeapon };
  }

  function unitMaxHp(unit, rank) {
    if (!unit) return 0;
    const multiplier = unit.skill === 0 ? (rankBonus[rank] || 1) : 1;
    return Math.ceil((unit.hp || 0) * multiplier - .001);
  }

  function tackleSelfDamageDetails(attackWeapon, attacker, intercept) {
    if (!attackWeapon?.tackle || !intercept.weapon || intercept.rate <= 0) {
      return { active: false, damage: 0, raw: 0, maxHp: unitMaxHp(attacker, Number($("rank").value)), currentHp: 0, remainingHp: 0, multiplier: 0, destroyed: false };
    }
    const maxHp = unitMaxHp(attacker, Number($("rank").value));
    const currentHp = maxHp * intercept.attackerHp;
    const multiplier = intercept.weapon.bulletNum > 1 ? .85 : 1.05;
    const raw = currentHp * intercept.rate * multiplier;
    const damage = Math.min(115, Math.max(25, raw));
    const remainingHp = Math.max(0, currentHp - damage);
    return { active: true, damage, raw, maxHp, currentHp, remainingHp, multiplier, destroyed: remainingHp <= 0 };
  }

  function updateInterceptWeapons() {
    const attackWeapon = weapons.get($("weapon").value);
    const target = selectedUnit("target", visibleTargets);
    const select = $("interceptWeapon");
    const panel = $("interceptPanel");
    const status = $("interceptStatus");
    const previous = select.value;
    const distance = selectedAttackDistance();
    const contextKey = `${attackWeapon?.id || ""}|${target?.id || ""}|${distance}`;
    const allCandidates = (target?.weapons || [])
      .map((id) => weapons.get(id))
      .filter((weapon) => weapon?.canIntercept)
      .sort((a, b) => b.ap - a.ap || b.hit - a.hit);
    const candidates = allCandidates.filter((weapon) => weaponCoversDistance(weapon, distance));
    const eligible = incomingInterceptable(attackWeapon);

    select.replaceChildren();
    if (!attackWeapon) {
      select.append(option("", "攻撃武器を選択"));
      status.textContent = "武器未選択";
    } else if (attackWeapon.seize) {
      select.append(option("", "鹵獲弾は迎撃率0%"));
      status.textContent = "迎撃例外";
    } else if (!eligible) {
      select.append(option("", `${materialNames[attackWeapon.material] || "不明"}属性は迎撃対象外`));
      status.textContent = "攻撃属性が対象外";
    } else if (!allCandidates.length) {
      select.append(option("", "対象に迎撃武器なし"));
      status.textContent = "迎撃武器なし";
    } else if (!candidates.length) {
      select.append(option("", `${distance} HEXに届く迎撃武器なし`));
      status.textContent = `距離${distance}に非対応`;
    } else {
      select.append(option("", "迎撃しない"));
      for (const candidate of candidates) {
        const range = candidate.rangeMin === -1 ? "専用範囲" : `${candidate.rangeMin}–${candidate.rangeMax} HEX`;
        select.append(option(candidate.id, `${candidate.name}  [威力 ${candidate.ap} / 命中 ${(candidate.hit * 100).toFixed(0)}% / ${range}]`));
      }
      const keepPrevious = contextKey === interceptContextKey
        && (previous === "" || candidates.some((weapon) => weapon.id === previous));
      select.value = keepPrevious ? previous : candidates[0].id;
      status.textContent = `${candidates.length}武器から選択`;
    }

    const available = eligible && candidates.length > 0;
    select.disabled = !available;
    $("attackerHpRate").disabled = !available;
    $("interceptorHpRate").disabled = !available;
    panel.classList.toggle("is-unavailable", !available);
    interceptContextKey = contextKey;
    scheduleCalculate();
  }

  function baseBeforeRandom(weapon, randomValue, attacker, target) {
    const rank = Number($("rank").value);
    const effectiveAp = effectiveWeaponAp(weapon, attacker, rank);
    const formation = Math.min(1, Math.max(0, Number($("formationCurrent").value) / Math.max(1, Number($("formationMax").value))));
    const unitType = Number($("targetType").value);
    const terrainDefense = Number($("terrainDefense").value) / 100;
    const effectiveDefense = weapon.material === 0 && unitType !== 5 && unitType !== 14 ? terrainDefense : 0;
    const interceptInfo = interceptDetails(weapon, attacker, target);
    const intercept = interceptInfo.rate;
    const tackleSelfDamage = tackleSelfDamageDetails(weapon, attacker, interceptInfo);
    const isCounter = $("attackMode").value === "counter";
    const randomMod = isCounter ? 1 + randomValue * .425 : 1 - randomValue * .425;
    let damage = effectiveAp * (1 - effectiveDefense) * formation * (1 - intercept) * randomMod;
    if ($("partialCover").checked && partialCoverEligible(weapon)) damage *= .5;
    if ($("knockbackBlocked").checked && weapon.tackle) damage += 25;
    damage *= 1 + typeEffect(weapon.material, unitType);
    if (tackleSelfDamage.destroyed) damage = 0;
    return { damage, effectiveDefense, intercept, effectiveAp, tackleSelfDamage };
  }

  function targetMaxHp(target) {
    return unitMaxHp(target, Number($("targetRank").value));
  }

  function formationLoss(damage, maxHp, formationMax) {
    if (formationMax !== 5 || maxHp <= 0) return 0;
    const remainingHp = maxHp - damage;
    if (remainingHp <= 0) return formationMax;
    if (remainingHp >= maxHp) return 0;
    const remainingFormation = Math.min(formationMax, Math.floor(formationMax * remainingHp / maxHp) + 1);
    return formationMax - remainingFormation;
  }

  function resetResults() {
    $("avoidResult").textContent = "--";
    $("avoidBar").style.width = "0%";
    $("hitResult").textContent = "命中率 --%";
    $("avoidFormula").textContent = "";
    $("damageExpected").textContent = "--";
    $("damageContext").textContent = "";
    $("damageMin").textContent = "--";
    $("damageMax").textContent = "--";
    $("unconditional").textContent = "--";
    $("targetMaxHp").textContent = "--";
    $("hpDamagePercent").textContent = "--";
    $("expectedHpPercent").textContent = "--";
    $("formationLossRow").hidden = true;
    $("formationRule").hidden = true;
    $("affinityLabel").textContent = "属性相性";
    $("effectiveness").textContent = "±0%";
    setModifierBadgeState($("affinityBadge"), 0);
    $("terrainLabel").textContent = "地形減衰";
    $("effectiveDefense").textContent = "±0%";
    setModifierBadgeState($("terrainBadge"), 0);
    $("interceptLabel").textContent = "迎撃減衰";
    $("interceptModifier").textContent = "±0%";
    setModifierBadgeState($("interceptBadge"), 0);
    $("interceptRateDisplay").textContent = "--";
    $("interceptRateResult").textContent = "--";
    $("interceptPass").textContent = "--";
    $("interceptFormula").textContent = "";
    $("tackleSelfCard").hidden = true;
    $("formulaNote").textContent = "攻撃ユニット・武器・対象ユニットを選択してください。";
    $("formulaNote").classList.remove("warning");
  }

  function calculate() {
    const weapon = weapons.get($("weapon").value);
    const attacker = selectedUnit("attacker", visibleAttackers);
    const target = selectedUnit("target", visibleTargets);
    if (!weapon || !attacker || !target) {
      resetResults();
      return;
    }
    $("targetSkill").value = skillName(target, "target");
    const unitType = Number($("targetType").value);
    const scaleDenom = Math.max(1, Number($("targetScaleDenom").value));
    const baseTargetAvoid = target?.avoid || 0;
    const attackerRank = Number($("rank").value);
    const targetRank = Number($("targetRank").value);
    const targetRankMultiplier = target?.skill === 1 ? (rankBonus[targetRank] || 1) : 1;
    const targetAvoid = rankAdjustedRate(baseTargetAvoid, targetRank, target?.skill === 1);
    const weaponHit = effectiveWeaponHit(weapon, attacker, attackerRank);
    const fixedBonus = (unitType === 5 || unitType === 14) ? 0 : Number($("terrainAvoidBonus").value) / 100;
    const scaledAvoid = targetAvoid * (1 + .5 / scaleDenom);
    const effectiveAvoid = Math.min(1, Math.max(0, scaledAvoid + fixedBonus - weaponHit));
    const hit = 1 - effectiveAvoid;
    const d0 = baseBeforeRandom(weapon, 0, attacker, target).damage;
    const d1 = baseBeforeRandom(weapon, 1, attacker, target).damage;
    const dMean = baseBeforeRandom(weapon, .5, attacker, target);
    const intercept = interceptDetails(weapon, attacker, target);
    const tackleSelfDamage = tackleSelfDamageDetails(weapon, attacker, intercept);
    const min = Math.min(d0, d1);
    const max = Math.max(d0, d1);
    const eff = typeEffect(weapon.material, unitType);
    const maxHp = targetMaxHp(target);
    const percent = (damage) => maxHp > 0 ? damage / maxHp * 100 : 0;
    const formationMax = target?.formationMax || 1;
    const lossMin = formationLoss(min, maxHp, formationMax);
    const lossMean = formationLoss(dMean.damage, maxHp, formationMax);
    const lossMax = formationLoss(max, maxHp, formationMax);

    $("avoidResult").textContent = (effectiveAvoid * 100).toFixed(1);
    $("avoidBar").style.width = `${effectiveAvoid * 100}%`;
    $("hitResult").textContent = `命中率 ${(hit * 100).toFixed(1)}%`;
    const rankText = target?.skill === 1
      ? ` × ランク倍率 ${targetRankMultiplier.toFixed(2)} → ${(targetAvoid * 100).toFixed(0)}%`
      : "（ランク補正なし）";
    const hitText = attacker?.skill === 4
      ? `${(weaponHit * 100).toFixed(0)}%（基礎 ${(weapon.hit * 100).toFixed(0)}% × ランク倍率 ${(rankBonus[attackerRank] || 1).toFixed(2)}）`
      : `${(weaponHit * 100).toFixed(0)}%`;
    $("avoidFormula").textContent = `基礎 ${(baseTargetAvoid * 100).toFixed(0)}%${rankText}; 実効 = (${(targetAvoid * 100).toFixed(0)}% × [1 + 0.5 / ${scaleDenom}] + ${(fixedBonus * 100).toFixed(0)}%) − 武器命中 ${hitText}`;
    $("damageExpected").textContent = dMean.damage.toFixed(1);
    $("damageContext").textContent = formationMax === 5
      ? `${lossMean}機減`
      : `HP ${percent(dMean.damage).toFixed(1)}%減`;
    $("damageMin").textContent = min.toFixed(1);
    $("damageMax").textContent = max.toFixed(1);
    $("unconditional").textContent = (dMean.damage * hit).toFixed(1);
    $("targetMaxHp").textContent = maxHp.toFixed(0);
    $("hpDamagePercent").textContent = `${percent(dMean.damage).toFixed(1)}% (${percent(min).toFixed(1)}–${percent(max).toFixed(1)}%)`;
    $("expectedHpPercent").textContent = `${percent(dMean.damage * hit).toFixed(1)}%`;
    $("formationLoss").textContent = `平均 ${lossMean}機（${lossMin}～${lossMax}機）`;
    $("formationLossRow").hidden = formationMax !== 5;
    $("formationRule").hidden = formationMax !== 5;
    $("affinityLabel").textContent = `${unitGroupName(unitType)} vs ${materialNames[weapon.material] || "不明"}`;
    $("effectiveness").textContent = eff === 0 ? "±0%" : `${eff > 0 ? "+" : ""}${(eff * 100).toFixed(0)}%`;
    setModifierBadgeState($("affinityBadge"), eff);
    const selectedTerrainDefense = Number($("terrainDefense").value) / 100;
    const terrainBypassed = selectedTerrainDefense > 0 && dMean.effectiveDefense === 0;
    $("terrainLabel").textContent = terrainBypassed ? "地形減衰（無視）" : "地形減衰";
    $("effectiveDefense").textContent = dMean.effectiveDefense > 0
      ? `-${(dMean.effectiveDefense * 100).toFixed(0)}%`
      : "±0%";
    setModifierBadgeState($("terrainBadge"), -dMean.effectiveDefense);
    $("interceptLabel").textContent = intercept.weapon ? `${intercept.weapon.name}で迎撃` : "迎撃減衰";
    $("interceptModifier").textContent = intercept.rate > 0 ? `-${(intercept.rate * 100).toFixed(1)}%` : "±0%";
    setModifierBadgeState($("interceptBadge"), -intercept.rate);
    $("interceptRateDisplay").textContent = `${(intercept.rate * 100).toFixed(1)}%`;
    $("interceptRateResult").textContent = `${(intercept.rate * 100).toFixed(1)}%`;
    $("interceptPass").textContent = `${((1 - intercept.rate) * 100).toFixed(1)}%`;
    $("tackleSelfCard").hidden = !tackleSelfDamage.active;
    if (tackleSelfDamage.active) {
      const maxHpPercent = tackleSelfDamage.maxHp > 0 ? tackleSelfDamage.damage / tackleSelfDamage.maxHp * 100 : 0;
      $("tackleSelfDamage").textContent = tackleSelfDamage.damage.toFixed(1);
      $("tackleSelfContext").textContent = tackleSelfDamage.destroyed
        ? `攻撃側撃破（現在HP ${tackleSelfDamage.currentHp.toFixed(1)}）`
        : `攻撃側HP ${maxHpPercent.toFixed(1)}%減 / 残り ${tackleSelfDamage.remainingHp.toFixed(1)}`;
      const clampText = tackleSelfDamage.raw < 25 ? " → 下限25" : tackleSelfDamage.raw > 115 ? " → 上限115" : "";
      const bulletText = intercept.weapon.bulletNum > 1 ? "複数弾の迎撃武器" : "単発の迎撃武器";
      $("tackleSelfFormula").textContent = `現在HP ${tackleSelfDamage.currentHp.toFixed(1)} × 迎撃 ${(intercept.rate * 100).toFixed(1)}% × 係数 ${tackleSelfDamage.multiplier.toFixed(2)}（${bulletText}） = ${tackleSelfDamage.raw.toFixed(1)}${clampText}`;
    }
    if (intercept.weapon) {
      const clampText = intercept.raw < .1 ? " / 最低10%へ補正" : intercept.raw >= .9 ? " / 90%以上のため完全迎撃" : "";
      $("interceptFormula").textContent = `未補正 ${(intercept.raw * 100).toFixed(1)}% = 威力比 ${intercept.interceptAp}/${intercept.attackAp} × 迎撃側HP率 ${(intercept.interceptorHp * 100).toFixed(0)}% × 攻撃側HP逆比 ${(100 / intercept.attackerHp).toFixed(0)}% × 命中 ${(intercept.interceptHit * 100).toFixed(0)}%${clampText}`;
    } else {
      $("interceptFormula").textContent = incomingInterceptable(weapon) ? "迎撃武器が選択されていません" : "この攻撃属性は迎撃対象外です";
    }

    const notes = [];
    if (Number($("terrainDefense").value) > 0 && dMean.effectiveDefense === 0) notes.push("この武器/対象では地形防御をバイパス");
    if (intercept.rate === 1) notes.push("完全迎撃: 実機では攻撃計算自体をスキップ");
    if (tackleSelfDamage.destroyed) notes.push("迎撃反動で攻撃側撃破: 対象ダメージ0");
    const attackRankText = attacker?.skill === 3
      ? `（基礎威力 ${weapon.ap} × ランク倍率 ${(rankBonus[attackerRank] || 1).toFixed(2)}）`
      : "";
    $("formulaNote").textContent = notes.join(" / ") || `実効威力 ${dMean.effectiveAp}${attackRankText} × 編隊・迎撃 × 威力乱数 × 属性相性`;
    $("formulaNote").classList.toggle("warning", notes.length > 0);
  }

  function updateTargetType() {
    const target = selectedUnit("target", visibleTargets);
    if (target) {
      $("targetType").value = String(Math.min(20, Math.max(0, target.type)));
      $("targetScaleDenom").value = String(Math.max(1, target.occupiedHex || 1));
      $("targetAvoid").value = String(Math.round((target.avoid || 0) * 100));
      $("targetSkill").value = skillName(target, "target");
    }
    updateInterceptWeapons();
  }

  for (let i = 0; i <= 20; i++) $("targetType").append(option(String(i), typeNames[i]));
  visibleAttackers = filteredUnits("", true);
  fillUnitSelect($("attacker"), visibleAttackers, "UNIT_ID.E_R9A");
  fillUnitSelect($("target"), visibleTargets, "UNIT_ID.B_B1DA");
  updateWeapons();
  $("weapon").value = "WEAPON_ID.E_L_ANTI_A";
  updateWeaponMeta();
  updateTargetType();

  $("attackerSearch").addEventListener("input", (event) => {
    const previous = $("attacker").value;
    visibleAttackers = filteredUnits(event.target.value, true);
    fillUnitSelect($("attacker"), visibleAttackers, previous);
    updateWeapons();
  });
  $("targetSearch").addEventListener("input", (event) => {
    const previous = $("target").value;
    visibleTargets = filteredUnits(event.target.value, false);
    fillUnitSelect($("target"), visibleTargets, previous);
    updateTargetType();
  });
  $("attacker").addEventListener("change", updateWeapons);
  $("weapon").addEventListener("change", updateWeaponMeta);
  $("target").addEventListener("change", updateTargetType);
  $("attackDistance").addEventListener("change", () => {
    updatePartialCoverControl(weapons.get($("weapon").value));
    updateInterceptWeapons();
  });
  $("knowledgeOpen").addEventListener("click", openKnowledge);
  $("knowledgeClose").addEventListener("click", closeKnowledge);
  $("knowledgeDialog").addEventListener("click", (event) => {
    if (event.target === $("knowledgeDialog")) closeKnowledge();
  });

  document.querySelectorAll("input, select").forEach((element) => {
    element.addEventListener("input", scheduleCalculate);
    element.addEventListener("change", scheduleCalculate);
  });
})();
