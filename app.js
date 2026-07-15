(() => {
  "use strict";

  const data = window.RTYPE_SIM_DATA;
  const $ = (id) => document.getElementById(id);
  const i18n = window.RTYPE_I18N;
  const L = (ja, en) => i18n.pick(ja, en);
  const displayName = (value) => i18n.name(value);
  const rankBonus = [1, 1.01, 1.03, 1.06, 1.10, 1.18];
  const materialNames = ["光学", "機械", "生体", "粒子", "火炎", "精神", "氷", "酸"];
  const materialNamesEn = ["Optical", "Mechanical", "Biological", "Particle", "Flame", "Mental", "Ice", "Acid"];
  const typeNames = ["機械ユニット", "機械艦", "機械艦パーツ", "艦船", "潜行機械", "機械壁", "機械床", "生物ユニット", "生物艦", "生物艦パーツ", "水中生物", "非水中生物", "潜行生物", "浮遊生物", "生体壁", "生体床", "宇宙水棲生物", "岩石", "氷", "異文明ユニット", "異文明艦パーツ"];
  const typeNamesEn = ["Mechanical unit", "Mechanical ship", "Mechanical ship part", "Ship", "Submerged mechanical unit", "Mechanical wall", "Mechanical floor", "Biological unit", "Biological ship", "Biological ship part", "Aquatic lifeform", "Non-aquatic lifeform", "Submerged lifeform", "Floating lifeform", "Biological wall", "Biological floor", "Space aquatic lifeform", "Rock", "Ice", "Alien-civilization unit", "Alien-civilization ship part"];
  const skillNames = new Map([
    [0, "HP"],
    [1, "回避率"],
    [2, "燃料（現行該当なし）"],
    [3, "攻撃力"],
    [4, "命中率"],
    [255, "なし"],
  ]);
  const skillNamesEn = new Map([[0, "HP"], [1, "Evasion"], [2, "Fuel (not simulated)"], [3, "Attack power"], [4, "Accuracy"], [255, "None"]]);
  const materialName = (index) => (i18n.language === "ja" ? materialNames : materialNamesEn)[index] || L("不明", "Unknown");
  const bypassesEvasion = (weapon) => Boolean(weapon
    && (weapon.akuukanBuster || weapon.motion === 2 || (weapon.motion >= 4 && weapon.motion <= 8)));
  const weapons = new Map(data.weapons.map((weapon) => [weapon.id, weapon]));
  const unitWeaponOverrides = new Map([
    ["UNIT_ID.ED_R9AD", ["WEAPON_ID.E_WAV_DECOY1", "WEAPON_ID.E_DB_REFUEL"]],
    ["UNIT_ID.ED_R9AD2", ["WEAPON_ID.E_WAV_DECOY2", "WEAPON_ID.E_DB_REFUEL"]],
    ["UNIT_ID.ED_R9AD3", ["WEAPON_ID.E_WAV_DECOY3", "WEAPON_ID.E_DB_REFUEL"]],
  ]);
  const attackRangeOverrides = new Map([
    ["WEAPON_ID.B_FINE_ATTACK", { min: 2, max: 2, note: "特殊体当たり距離" }],
  ]);
  const bridgeParentNames = new Map([
    ["UNIT_ID.BS_BRIDGE", "ヘイムダル級"],
    ["UNIT_ID.EW_BS_BRIDGE", "ヘイムダル級"],
    ["UNIT_ID.E_BS2_BRIDGE", "テュール級"],
    ["UNIT_ID.EW_BS2_BRIDGE", "テュール級"],
    ["UNIT_ID.E_BSAE1_BRIDGE", "ヨトゥンヘイム級"],
    ["UNIT_ID.EW_BSAE1_BRIDGE", "ヨトゥンヘイム級"],
    ["UNIT_ID.E_BSAE2_BRIDGE", "ムスペルヘイム級"],
    ["UNIT_ID.EW_BSAE2_BRIDGE", "ムスペルヘイム級"],
    ["UNIT_ID.E_BS_LAST_BRIDGE", "ニヴルヘイム級"],
    ["UNIT_ID.EW_BS_LAST_BRIDGE", "ニヴルヘイム級"],
    ["UNIT_ID.E_CR_BRIDGE", "ヴァナルガンド級"],
    ["UNIT_ID.EW_CR_BRIDGE", "ヴァナルガンド級"],
    ["UNIT_ID.E_CR2_BRIDGE", "ガルム級"],
    ["UNIT_ID.EW_CR2_BRIDGE", "ガルム級"],
    ["UNIT_ID.E_CR3_BRIDGE", "マーナガルム級"],
    ["UNIT_ID.EW_CR3_BRIDGE", "マーナガルム級"],
  ]);
  const bridgeParentNamesEn = new Map([
    ["UNIT_ID.BS_BRIDGE", "Heimdall-class"], ["UNIT_ID.EW_BS_BRIDGE", "Heimdall-class"],
    ["UNIT_ID.E_BS2_BRIDGE", "Tyr-class"], ["UNIT_ID.EW_BS2_BRIDGE", "Tyr-class"],
    ["UNIT_ID.E_BSAE1_BRIDGE", "Jotunheim-class"], ["UNIT_ID.EW_BSAE1_BRIDGE", "Jotunheim-class"],
    ["UNIT_ID.E_BSAE2_BRIDGE", "Muspelheim-class"], ["UNIT_ID.EW_BSAE2_BRIDGE", "Muspelheim-class"],
    ["UNIT_ID.E_BS_LAST_BRIDGE", "Niflheim-class"], ["UNIT_ID.EW_BS_LAST_BRIDGE", "Niflheim-class"],
    ["UNIT_ID.E_CR_BRIDGE", "Vanargand-class"], ["UNIT_ID.EW_CR_BRIDGE", "Vanargand-class"],
    ["UNIT_ID.E_CR2_BRIDGE", "Garm-class"], ["UNIT_ID.EW_CR2_BRIDGE", "Garm-class"],
    ["UNIT_ID.E_CR3_BRIDGE", "Managarm-class"], ["UNIT_ID.EW_CR3_BRIDGE", "Managarm-class"],
  ]);
  const unitVariantLabels = new Map([
    ["UNIT_ID.E_L_DANCER_A", "ウェーブ・マスター系"],
    ["UNIT_ID.E_L_DANCER_B", "コンサート・マスター系"],
    ["UNIT_ID.E_L_DANCER_C", "カロン系"],
    ["UNIT_ID.E_L_DANCER_D", "ワイズ・マン系"],
  ]);
  const unitVariantLabelsEn = new Map([
    ["UNIT_ID.E_L_DANCER_A", "Wave Master line"], ["UNIT_ID.E_L_DANCER_B", "Concert Master line"],
    ["UNIT_ID.E_L_DANCER_C", "Charon line"], ["UNIT_ID.E_L_DANCER_D", "Wise Man line"],
  ]);
  const acceleratedUnitIds = new Set([
    "UNIT_ID.E_TXT_BOOST",
    "UNIT_ID.E_TXT2_BOOST",
    "UNIT_ID.E_TXT3_BOOST",
    "UNIT_ID.B_SCANT_4_BOOST",
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

  function unitWeaponIds(unit) {
    return unitWeaponOverrides.get(unit?.id) || unit?.weapons || [];
  }

  function isDecoyUnit(unit) {
    return unitWeaponIds(unit).some((id) => weapons.get(id)?.nameJa === "デコイ爆破");
  }

  function isWarpStateUnit(unit) {
    return /^UNIT_ID\.[EB]W_/.test(unit?.id || "")
      && ["utyp_battle_ship", "utyp_b_battle_ship", "utyp_cruiser", "utyp_b_cruiser", "utyp_carrier"].includes(unit?.typeKey);
  }

  function hasNormalAttack(unit) {
    return unitWeaponIds(unit).some((id) => weapons.get(id)?.attack);
  }

  function isSelectableAttackWeapon(weapon) {
    return Boolean(weapon && (weapon.attack || weapon.akuukanBuster || weapon.nameJa === "デコイ爆破"));
  }

  function hasSelectableAttack(unit) {
    return unitWeaponIds(unit).some((id) => isSelectableAttackWeapon(weapons.get(id)));
  }

  function unitLabel(unit) {
    const accelerated = acceleratedUnitIds.has(unit?.id);
    const baseName = displayName(unit);
    const name = accelerated ? baseName.replace(/[\(\uff08]加速時[\)\uff09]$/, "") : baseName;
    const parent = (i18n.language === "ja" ? bridgeParentNames : bridgeParentNamesEn).get(unit?.id);
    const parentLabel = parent ? ` [${parent}]` : "";
    const variant = (i18n.language === "ja" ? unitVariantLabels : unitVariantLabelsEn).get(unit?.id);
    const variantLabel = variant ? ` [${variant}]` : "";
    const acceleration = accelerated ? L(" [加速時]", " [Boosted]") : "";
    const warp = isWarpStateUnit(unit) ? L(" [ワープ時]", " [Warping]") : "";
    const decoy = isDecoyUnit(unit) ? L(" [デコイ]", " [Decoy]") : "";
    return `${name}${parentLabel}${variantLabel}${acceleration}${warp}${decoy}`;
  }

  function skillName(unit, role) {
    const skill = unit?.skill;
    const name = (i18n.language === "ja" ? skillNames : skillNamesEn).get(skill) || `${L("不明", "Unknown")} (${skill ?? "-"})`;
    if (skill === 255 || skill == null) return name;
    const intercepting = role === "target" && Boolean($("interceptWeapon")?.value);
    const usedHere = role === "attacker"
      ? skill === 3 || skill === 4
      : skill === 0 || skill === 1 || (intercepting && (skill === 3 || skill === 4));
    return `${name}${usedHere ? L("（今回反映）", " (applied)") : L("（今回不使用）", " (not used)")}`;
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
    const needle = query.trim().toLocaleLowerCase(i18n.language);
    return data.units.filter((unit) => {
      const hasNormal = hasNormalAttack(unit);
      if (!requireWeapon && isDecoyUnit(unit) && !hasNormal) return false;
      if (requireWeapon && !hasSelectableAttack(unit)) return false;
      const names = `${unitLabel(unit)} ${unit.nameJa || ""} ${unit.nameEn || ""}`.toLocaleLowerCase(i18n.language);
      return !needle || names.includes(needle) || unit.id.toLowerCase().includes(needle);
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
    const list = unitWeaponIds(attacker).map((id) => weapons.get(id)).filter(isSelectableAttackWeapon);
    $("weapon").replaceChildren();
    for (const weapon of list) $("weapon").append(option(weapon.id, `${displayName(weapon)}  [${L("威力", "Power")} ${weapon.ap}]`));
    if (list.some((weapon) => weapon.id === previous)) $("weapon").value = previous;
    updateWeaponMeta();
  }

  function updateWeaponMeta() {
    const weapon = weapons.get($("weapon").value);
    const knockbackEnabled = Boolean(weapon?.tackle);
    $("knockbackBlocked").disabled = !knockbackEnabled;
    $("knockbackLabel").classList.toggle("disabled-control", !knockbackEnabled);
    if (!knockbackEnabled) $("knockbackBlocked").checked = false;
    updatePartialCoverControl(weapon);
    if (!weapon) {
      $("weaponMeta").textContent = L("攻撃武器の関連付けがないユニットです。", "This unit has no linked attack weapon.");
      updateInterceptWeapons();
      return;
    }
    const attackRange = effectiveAttackRange(weapon);
    const range = attackRange.min === -1 ? L("専用範囲", "Special range") : `${attackRange.min ?? "?"}–${attackRange.max ?? "?"} HEX${attackRange.note ? ` (${L(attackRange.note, "special tackle range")})` : ""}`;
    const charge = weapon.charge ? ` / ${L("チャージ", "Charge")} ${weapon.charge}T` : "";
    const guaranteed = bypassesEvasion(weapon);
    const guaranteedLabel = guaranteed ? L(" / 必中（回避計算をバイパス）", " / Guaranteed hit (evasion calculation bypassed)") : "";
    const interceptable = incomingInterceptable(weapon) ? L(" / 迎撃対象", " / Interceptable") : L(" / 迎撃対象外", " / Not interceptable");
    $("weaponMeta").textContent = `${materialName(weapon.material)} / ${L("命中値", "Accuracy")} ${(weapon.hit * 100).toFixed(0)}% / ${range}${charge}${guaranteedLabel}${weapon.tackle ? L(" / ノックバック", " / Knockback") : ""}${interceptable}`;
    updateInterceptWeapons();
  }

  function effectiveAttackRange(weapon) {
    const override = attackRangeOverrides.get(weapon?.id);
    return override || { min: weapon?.rangeMin, max: weapon?.rangeMax, note: "" };
  }

  function sharedInterceptRange(attackWeapon, interceptWeapon) {
    const attackRange = effectiveAttackRange(attackWeapon);
    if (!interceptWeapon || attackRange.min < 1 || attackRange.max < attackRange.min
      || interceptWeapon.rangeMin < 1 || interceptWeapon.rangeMax < interceptWeapon.rangeMin) return null;
    const min = Math.max(attackRange.min, interceptWeapon.rangeMin);
    const max = Math.min(attackRange.max, interceptWeapon.rangeMax);
    return min <= max ? { min, max } : null;
  }

  function formatHexRange(range) {
    return range.min === range.max ? `${range.min} HEX` : `${range.min}–${range.max} HEX`;
  }

  function partialCoverEligible(weapon) {
    return Boolean(weapon && effectiveAttackRange(weapon).max === 2 && weapon.material !== 1);
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
      status.textContent = L("武器未選択", "No weapon selected");
      label.title = L("攻撃武器を選択してください", "Select an attack weapon");
    } else if (weapon.material === 1) {
      status.textContent = L("機械属性は無視", "Ignored by mechanical");
      label.title = L("機械属性は部分遮蔽による50%減衰を受けません", "Mechanical attacks are not reduced by partial cover");
    } else if (effectiveAttackRange(weapon).max !== 2) {
      status.textContent = L("最大射程2のみ", "Maximum range 2 only");
      label.title = L("部分遮蔽フラグは最大射程2の攻撃でのみ生成されます", "Partial cover is generated only for attacks with maximum range 2");
    } else {
      status.textContent = L("有効時 −50%", "−50% when enabled");
      label.title = L("中間経路の片方だけが遮られている場合に選択します", "Enable when only one intermediate path is blocked");
    }
  }

  function typeEffect(material, unitType) {
    if (unitType <= 6) return [0, 0, .20, 0, 0, 0, .10, .10][material] || 0;
    if (unitType <= 16) return [.10, .20, 0, .10, .25, .15, .15, .15][material] || 0;
    if (unitType === 18) return [.10, 0, -.10, 0, .30, 0, 0, 0][material] || 0;
    return 0;
  }

  function unitGroupName(unitType) {
    if (unitType <= 6) return L("機械", "Mechanical");
    if (unitType <= 16) return L("生物", "Biological");
    if (unitType === 17) return L("岩石", "Rock");
    if (unitType === 18) return L("氷", "Ice");
    return L("異質", "Other");
  }

  function renderFormula(boxId, rowsId, rows) {
    const container = $(rowsId);
    container.replaceChildren();
    for (const row of rows) {
      const line = document.createElement("div");
      if (row.result) line.className = "is-result";
      const op = document.createElement("i");
      op.textContent = row.op || "";
      const label = document.createElement("span");
      label.textContent = row.label;
      const value = document.createElement("b");
      value.textContent = row.value;
      line.append(op, label, value);
      container.append(line);
    }
    $(boxId).hidden = rows.length === 0;
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
    return Boolean(weapon && !weapon.charge && !weapon.seize && [1, 2, 6].includes(weapon.material));
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
    if (!incomingInterceptable(attackWeapon) || !interceptWeapon?.canIntercept || !sharedInterceptRange(attackWeapon, interceptWeapon)) {
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
    const multiplier = .85;
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
    const contextKey = `${attackWeapon?.id || ""}|${target?.id || ""}`;
    const contextChanged = contextKey !== interceptContextKey;
    const allCandidates = unitWeaponIds(target)
      .map((id) => weapons.get(id))
      .filter((weapon) => weapon?.canIntercept)
      .sort((a, b) => b.ap - a.ap || b.hit - a.hit);
    const candidates = allCandidates.filter((weapon) => sharedInterceptRange(attackWeapon, weapon));
    const eligible = incomingInterceptable(attackWeapon);

    select.replaceChildren();
    if (!attackWeapon) {
      select.append(option("", L("攻撃武器を選択", "Select attack weapon")));
      status.textContent = L("武器未選択", "No weapon selected");
    } else if (attackWeapon.seize) {
      select.append(option("", L("鹵獲弾は迎撃率0%", "Capture rounds have 0% interception")));
      status.textContent = L("迎撃例外", "Exempt from interception");
    } else if (!eligible) {
      select.append(option("", L(`${materialName(attackWeapon.material)}属性は迎撃対象外`, `${materialName(attackWeapon.material)} attacks are not interceptable`)));
      status.textContent = L("攻撃属性が対象外", "Attribute not interceptable");
    } else if (!allCandidates.length) {
      select.append(option("", L("対象に迎撃武器なし", "Target has no interception weapon")));
      status.textContent = L("迎撃武器なし", "No interception weapon");
    } else if (!candidates.length) {
      select.append(option("", L("攻撃武器と射程が重なる迎撃武器なし", "No interception weapon has overlapping range")));
      status.textContent = L("共通射程なし", "No shared range");
    } else {
      select.append(option("", L("迎撃しない", "Do not intercept")));
      for (const candidate of candidates) {
        const range = candidate.rangeMin === -1 ? L("専用範囲", "Special range") : `${candidate.rangeMin}–${candidate.rangeMax} HEX`;
        const shared = formatHexRange(sharedInterceptRange(attackWeapon, candidate));
        select.append(option(candidate.id, `${displayName(candidate)}  [${L("威力", "Power")} ${candidate.ap} / ${L("命中", "Accuracy")} ${(candidate.hit * 100).toFixed(0)}% / ${L("弾数", "Ammo")} ${candidate.bulletNum} / ${L("射程", "Range")} ${range} / ${L("共通", "Shared")} ${shared}]`));
      }
      const keepPrevious = contextKey === interceptContextKey
        && (previous === "" || candidates.some((weapon) => weapon.id === previous));
      select.value = keepPrevious ? previous : candidates[0].id;
      status.textContent = L(`${candidates.length}武器・共通射程あり`, `${candidates.length} weapon${candidates.length === 1 ? "" : "s"} with shared range`);
    }

    const available = eligible && candidates.length > 0;
    select.disabled = !available;
    $("attackerHpRate").disabled = !available;
    $("interceptorHpRate").disabled = !available;
    panel.classList.toggle("is-unavailable", !available);
    interceptContextKey = contextKey;
    if (select.value) $("evadeFocus").checked = false;
    else if (contextChanged) $("evadeFocus").checked = true;
    updateEvadeFocusStatus();
    scheduleCalculate();
  }

  function updateEvadeFocusStatus() {
    const input = $("evadeFocus");
    const label = $("evadeFocusLabel");
    const status = $("evadeFocusStatus");
    const guaranteed = bypassesEvasion(weapons.get($("weapon").value));
    const intercepting = Boolean($("interceptWeapon").value);
    input.disabled = Boolean(guaranteed);
    if (guaranteed) input.checked = false;
    label.classList.toggle("disabled-control", Boolean(guaranteed));
    label.classList.toggle("available-control", input.checked && !guaranteed);
    status.textContent = guaranteed
      ? L("必中攻撃には無効", "No effect against guaranteed hits")
      : intercepting
      ? L("迎撃選択中（専念なし）", "Intercepting (no evasion focus)")
      : input.checked ? L("基礎回避 × 0.5 ÷ 占有HEXを加算", "Add base evasion × 0.5 ÷ occupied hexes") : L("補正なし", "No bonus");
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
    $("hitResult").textContent = L("命中率 --%", "Hit rate --%");
    $("guaranteedHitBadge").hidden = true;
    renderFormula("avoidFormulaBox", "avoidFormula", []);
    renderFormula("damageFormulaBox", "damageFormula", []);
    $("damageExpected").textContent = "--";
    $("damageContext").textContent = "";
    $("damageMin").textContent = "--";
    $("damageMax").textContent = "--";
    $("targetMaxHp").textContent = "--";
    $("hpDamagePercent").textContent = "--";
    $("expectedHpPercent").textContent = "--";
    $("formationLossRow").hidden = true;
    $("formationRule").hidden = true;
    $("affinityLabel").textContent = L("属性相性", "Affinity");
    $("effectiveness").textContent = "±0%";
    setModifierBadgeState($("affinityBadge"), 0);
    $("terrainLabel").textContent = L("地形減衰", "Terrain reduction");
    $("effectiveDefense").textContent = "±0%";
    setModifierBadgeState($("terrainBadge"), 0);
    $("interceptLabel").textContent = L("迎撃減衰", "Interception reduction");
    $("interceptModifier").textContent = "±0%";
    setModifierBadgeState($("interceptBadge"), 0);
    $("interceptRateDisplay").textContent = "--";
    $("interceptRateResult").textContent = "--";
    $("interceptPass").textContent = "--";
    $("interceptFormula").textContent = "";
    $("tackleSelfCard").hidden = true;
    $("formulaNote").textContent = L("攻撃ユニット・武器・対象ユニットを選択してください。", "Select an attacking unit, weapon, and target unit.");
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
    const guaranteed = bypassesEvasion(weapon);
    const evadeFocus = !guaranteed && $("evadeFocus").checked && !$("interceptWeapon").value;
    const evadeFocusBonus = evadeFocus ? targetAvoid * .5 / scaleDenom : 0;
    const scaledAvoid = targetAvoid + evadeFocusBonus;
    const effectiveAvoid = guaranteed ? 0 : Math.min(1, Math.max(0, scaledAvoid + fixedBonus - weaponHit));
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
    $("guaranteedHitBadge").hidden = !guaranteed;
    $("guaranteedHitBadge").textContent = L("必中", "Guaranteed hit");
    $("hitResult").textContent = guaranteed
      ? L("必中・命中率 100.0%（回避計算なし）", "Guaranteed hit · 100.0% hit rate (evasion calculation bypassed)")
      : `${L("命中率", "Hit rate")} ${(hit * 100).toFixed(1)}%`;
    const avoidRows = guaranteed
      ? [
        { label: L("必中バイパス設定", "Guaranteed-hit bypass setting"), value: L("有効", "Enabled") },
        { op: "→", label: L("対象回避・地形回避・武器命中", "Target evasion, terrain evasion, and weapon accuracy"), value: L("計算をバイパス", "Bypassed") },
        { op: "=", label: L("回避率", "Evasion rate"), value: "0.0%", result: true },
        { op: "", label: L("命中率", "Hit rate"), value: "100.0%", result: true },
      ]
      : [{ label: L("基礎回避率", "Base evasion"), value: `${(baseTargetAvoid * 100).toFixed(0)}%` }];
    if (!guaranteed) {
    if (target?.skill === 1) {
      avoidRows.push({ op: "×", label: L(`熟練ランク倍率（ランク${targetRank}）`, `Veterancy multiplier (rank ${targetRank})`), value: `${targetRankMultiplier.toFixed(2)} → ${(targetAvoid * 100).toFixed(0)}%` });
    }
    avoidRows.push(evadeFocus
      ? { op: "+", label: L(`回避に専念（${(targetAvoid * 100).toFixed(0)}% × 0.5 ÷ ${scaleDenom} HEX）`, `Focus on evasion (${(targetAvoid * 100).toFixed(0)}% × 0.5 ÷ ${scaleDenom} HEX)`), value: `${(evadeFocusBonus * 100).toFixed(1)}%` }
      : { op: "+", label: L("回避に専念", "Focus on evasion"), value: "OFF" });
    if (fixedBonus > 0) {
      avoidRows.push({ op: "+", label: L("地形の固定回避加算", "Terrain evasion bonus"), value: `${(fixedBonus * 100).toFixed(0)}%` });
    }
    avoidRows.push(
      attacker?.skill === 4
        ? { op: "−", label: L(`武器命中（基礎 ${(weapon.hit * 100).toFixed(0)}% × ランク倍率 ${(rankBonus[attackerRank] || 1).toFixed(2)}）`, `Weapon accuracy (base ${(weapon.hit * 100).toFixed(0)}% × rank multiplier ${(rankBonus[attackerRank] || 1).toFixed(2)})`), value: `${(weaponHit * 100).toFixed(0)}%` }
        : { op: "−", label: L("武器命中", "Weapon accuracy"), value: `${(weaponHit * 100).toFixed(0)}%` },
      { op: "=", label: L("回避率", "Evasion rate"), value: `${(effectiveAvoid * 100).toFixed(1)}%`, result: true },
      { op: "", label: L("命中率（100% − 回避率）", "Hit rate (100% − evasion rate)"), value: `${(hit * 100).toFixed(1)}%`, result: true },
    );
    }
    renderFormula("avoidFormulaBox", "avoidFormula", avoidRows);

    const isCounter = $("attackMode").value === "counter";
    const randomMean = isCounter ? 1 + .5 * .425 : 1 - .5 * .425;
    const formationRate = Math.min(1, Math.max(0, Number($("formationCurrent").value) / Math.max(1, Number($("formationMax").value))));
    const damageRows = [
      attacker?.skill === 3
        ? { label: L(`実効威力（基礎 ${weapon.ap} × ランク倍率 ${(rankBonus[attackerRank] || 1).toFixed(2)}）`, `Effective power (base ${weapon.ap} × rank multiplier ${(rankBonus[attackerRank] || 1).toFixed(2)})`), value: String(dMean.effectiveAp) }
        : { label: L("武器威力", "Weapon power"), value: String(dMean.effectiveAp) },
    ];
    if (dMean.effectiveDefense > 0) {
      damageRows.push({ op: "×", label: L(`地形防御（1 − ${(dMean.effectiveDefense * 100).toFixed(0)}%）`, `Terrain defense (1 − ${(dMean.effectiveDefense * 100).toFixed(0)}%)`), value: (1 - dMean.effectiveDefense).toFixed(2) });
    }
    if (formationRate < 1) {
      damageRows.push({ op: "×", label: L(`編隊率（${Number($("formationCurrent").value)} ÷ ${Number($("formationMax").value)}機）`, `Formation ratio (${Number($("formationCurrent").value)} ÷ ${Number($("formationMax").value)} units)`), value: formationRate.toFixed(2) });
    }
    if (dMean.intercept > 0) {
      damageRows.push({ op: "×", label: L(`迎撃通過率（1 − ${(dMean.intercept * 100).toFixed(1)}%）`, `Interception pass rate (1 − ${(dMean.intercept * 100).toFixed(1)}%)`), value: (1 - dMean.intercept).toFixed(3) });
    }
    damageRows.push({
      op: "×",
      label: isCounter ? L("威力乱数の平均（反撃: 1.000〜1.425）", "Mean damage RNG (counter: 1.000–1.425)") : L("威力乱数の平均（0.575〜1.000）", "Mean damage RNG (0.575–1.000)"),
      value: randomMean.toFixed(3),
    });
    if ($("partialCover").checked && partialCoverEligible(weapon)) {
      damageRows.push({ op: "×", label: L("部分遮蔽", "Partial cover"), value: "0.50" });
    }
    if ($("knockbackBlocked").checked && weapon.tackle) {
      damageRows.push({ op: "+", label: L("ノックバック先が塞がっている", "Knockback destination is blocked"), value: "25" });
    }
    if (eff !== 0) {
      damageRows.push({ op: "×", label: L(`属性相性（${eff > 0 ? "+" : ""}${(eff * 100).toFixed(0)}%）`, `Affinity (${eff > 0 ? "+" : ""}${(eff * 100).toFixed(0)}%)`), value: (1 + eff).toFixed(2) });
    }
    damageRows.push({ op: "=", label: L("命中時ダメージ（平均乱数）", "Damage on hit (mean RNG)"), value: dMean.damage.toFixed(1), result: true });
    renderFormula("damageFormulaBox", "damageFormula", damageRows);
    $("damageExpected").textContent = dMean.damage.toFixed(1);
    $("damageContext").textContent = formationMax === 5
      ? L(`${lossMean}機減`, `${lossMean} unit${lossMean === 1 ? "" : "s"} lost`)
      : L(`HP ${percent(dMean.damage).toFixed(1)}%減`, `${percent(dMean.damage).toFixed(1)}% HP lost`);
    $("damageMin").textContent = min.toFixed(1);
    $("damageMax").textContent = max.toFixed(1);
    $("targetMaxHp").textContent = maxHp.toFixed(0);
    $("hpDamagePercent").textContent = `${percent(dMean.damage).toFixed(1)}% (${percent(min).toFixed(1)}–${percent(max).toFixed(1)}%)`;
    $("expectedHpPercent").textContent = `${percent(dMean.damage * hit).toFixed(1)}%`;
    $("formationLoss").textContent = L(`平均 ${lossMean}機（${lossMin}～${lossMax}機）`, `Mean ${lossMean} unit${lossMean === 1 ? "" : "s"} (${lossMin}–${lossMax})`);
    $("formationLossRow").hidden = formationMax !== 5;
    $("formationRule").hidden = formationMax !== 5;
    $("affinityLabel").textContent = `${unitGroupName(unitType)} vs ${materialName(weapon.material)}`;
    $("effectiveness").textContent = eff === 0 ? "±0%" : `${eff > 0 ? "+" : ""}${(eff * 100).toFixed(0)}%`;
    setModifierBadgeState($("affinityBadge"), eff);
    const selectedTerrainDefense = Number($("terrainDefense").value) / 100;
    const terrainBypassed = selectedTerrainDefense > 0 && dMean.effectiveDefense === 0;
    $("terrainLabel").textContent = terrainBypassed ? L("地形減衰（無視）", "Terrain reduction (bypassed)") : L("地形減衰", "Terrain reduction");
    $("effectiveDefense").textContent = dMean.effectiveDefense > 0
      ? `-${(dMean.effectiveDefense * 100).toFixed(0)}%`
      : "±0%";
    setModifierBadgeState($("terrainBadge"), -dMean.effectiveDefense);
    $("interceptLabel").textContent = intercept.weapon ? L(`${displayName(intercept.weapon)}で迎撃`, `Intercepted by ${displayName(intercept.weapon)}`) : L("迎撃減衰", "Interception reduction");
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
        ? L(`攻撃側撃破（現在HP ${tackleSelfDamage.currentHp.toFixed(1)}）`, `Attacker destroyed (current HP ${tackleSelfDamage.currentHp.toFixed(1)})`)
        : L(`攻撃側HP ${maxHpPercent.toFixed(1)}%減 / 残り ${tackleSelfDamage.remainingHp.toFixed(1)}`, `Attacker loses ${maxHpPercent.toFixed(1)}% HP / ${tackleSelfDamage.remainingHp.toFixed(1)} remaining`);
      const clampText = tackleSelfDamage.raw < 25 ? L(" → 下限25", " → minimum 25") : tackleSelfDamage.raw > 115 ? L(" → 上限115", " → maximum 115") : "";
      $("tackleSelfFormula").textContent = L(`現在HP ${tackleSelfDamage.currentHp.toFixed(1)} × 迎撃 ${(intercept.rate * 100).toFixed(1)}% × 係数 ${tackleSelfDamage.multiplier.toFixed(2)} = ${tackleSelfDamage.raw.toFixed(1)}${clampText}`, `Current HP ${tackleSelfDamage.currentHp.toFixed(1)} × interception ${(intercept.rate * 100).toFixed(1)}% × factor ${tackleSelfDamage.multiplier.toFixed(2)} = ${tackleSelfDamage.raw.toFixed(1)}${clampText}`);
    }
    if (intercept.weapon) {
      const clampText = intercept.raw < .1 ? L(" / 最低10%へ補正", " / raised to 10% minimum") : intercept.raw >= .9 ? L(" / 90%以上のため完全迎撃", " / full interception at 90% or more") : "";
      $("interceptFormula").textContent = L(`未補正 ${(intercept.raw * 100).toFixed(1)}% = 威力比 ${intercept.interceptAp}/${intercept.attackAp} × 迎撃側HP率 ${(intercept.interceptorHp * 100).toFixed(0)}% × 攻撃側HP逆比 ${(100 / intercept.attackerHp).toFixed(0)}% × 命中 ${(intercept.interceptHit * 100).toFixed(0)}%${clampText}`, `Raw ${(intercept.raw * 100).toFixed(1)}% = power ratio ${intercept.interceptAp}/${intercept.attackAp} × interceptor HP ${(intercept.interceptorHp * 100).toFixed(0)}% × inverse attacker HP ${(100 / intercept.attackerHp).toFixed(0)}% × accuracy ${(intercept.interceptHit * 100).toFixed(0)}%${clampText}`);
    } else {
      $("interceptFormula").textContent = incomingInterceptable(weapon) ? L("迎撃武器が選択されていません", "No interception weapon selected") : L("この攻撃属性は迎撃対象外です", "This attack attribute is not interceptable");
    }

    const notes = [];
    if (Number($("terrainDefense").value) > 0 && dMean.effectiveDefense === 0) notes.push(L("この武器/対象では地形防御をバイパス", "Terrain defense bypassed for this weapon/target"));
    if (intercept.rate === 1) notes.push(L("完全迎撃: 実機では攻撃計算自体をスキップ", "Full interception: the game skips the attack calculation entirely"));
    if (tackleSelfDamage.destroyed) notes.push(L("迎撃反動で攻撃側撃破: 対象ダメージ0", "Interception recoil destroys attacker: target damage is 0"));
    $("formulaNote").textContent = notes.join(" / ");
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

  function fillTargetTypeNames() {
    const previous = $("targetType").value;
    $("targetType").replaceChildren();
    const names = i18n.language === "ja" ? typeNames : typeNamesEn;
    for (let i = 0; i <= 20; i++) $("targetType").append(option(String(i), names[i]));
    if (previous) $("targetType").value = previous;
  }

  function changeLanguage(next) {
    const attackerId = $("attacker").value;
    const targetId = $("target").value;
    const weaponId = $("weapon").value;
    const interceptId = $("interceptWeapon").value;
    i18n.setLanguage(next);
    $("languageSelect").value = i18n.language;
    fillTargetTypeNames();
    visibleAttackers = filteredUnits($("attackerSearch").value, true);
    visibleTargets = filteredUnits($("targetSearch").value, false);
    fillUnitSelect($("attacker"), visibleAttackers, attackerId);
    fillUnitSelect($("target"), visibleTargets, targetId);
    lastAttackerId = attackerId;
    updateWeapons();
    if ([...$("weapon").options].some((item) => item.value === weaponId)) $("weapon").value = weaponId;
    updateWeaponMeta();
    updateTargetType();
    if ([...$("interceptWeapon").options].some((item) => item.value === interceptId)) $("interceptWeapon").value = interceptId;
    updateEvadeFocusStatus();
    calculate();
  }

  $("languageSelect").value = i18n.language;
  fillTargetTypeNames();
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
  $("evadeFocus").addEventListener("change", () => {
    if ($("evadeFocus").checked && $("interceptWeapon").value) {
      $("interceptWeapon").value = "";
    }
    updateEvadeFocusStatus();
    $("targetSkill").value = skillName(selectedUnit("target", visibleTargets), "target");
  });
  $("interceptWeapon").addEventListener("change", () => {
    if ($("interceptWeapon").value) $("evadeFocus").checked = false;
    else $("evadeFocus").checked = true;
    updateEvadeFocusStatus();
    $("targetSkill").value = skillName(selectedUnit("target", visibleTargets), "target");
  });
  $("knowledgeOpen").addEventListener("click", openKnowledge);
  $("knowledgeClose").addEventListener("click", closeKnowledge);
  $("knowledgeDialog").addEventListener("click", (event) => {
    if (event.target === $("knowledgeDialog")) closeKnowledge();
  });
  $("languageSelect").addEventListener("change", (event) => changeLanguage(event.target.value));

  document.querySelectorAll("input, select").forEach((element) => {
    element.addEventListener("input", scheduleCalculate);
    element.addEventListener("change", scheduleCalculate);
  });
})();
