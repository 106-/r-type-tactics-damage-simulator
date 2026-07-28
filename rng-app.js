(() => {
  "use strict";

  const data = window.RTYPE_SIM_DATA;
  const core = window.RTYPE_RNG_CORE;
  const i18n = window.RTYPE_I18N;
  const $ = (id) => document.getElementById(id);
  const L = (ja, en) => i18n.pick(ja, en);
  const displayName = (value) => i18n.name(value);
  const unitsById = new Map(data.units.map((unit) => [unit.id, unit]));
  const weaponsById = new Map(data.weapons.map((weapon) => [weapon.id, weapon]));
  const STORAGE_KEY = "rtype-rng-predictor-v2";
  const MAX_TIME_CANDIDATES = 120001;

  let roster = [];
  let logs = [];
  let nextRosterId = 1;
  let nextLogId = 1;
  let candidates = [];
  let filterCounts = [];
  let analysisFresh = false;
  let prediction = defaultAttackModel();
  let selectedRosterUnitId = "";
  let appMode = "analysis";
  let predictionStack = [];
  let predictionSession = null;
  let pendingPrediction = null;
  let unitPickerPurpose = "roster";
  let nextPredictionLogId = 1;

  function defaultAttackModel() {
    return {
      attackerId: "",
      targetId: "",
      attackerUnitId: "",
      targetUnitId: "",
      attackerRank: 0,
      targetRank: 0,
      attackerFormation: 5,
      targetFormation: 5,
      weaponId: "",
      mode: "normal",
      reaction: "focus",
      interceptWeaponId: "",
      terrainAvoid: 0,
      terrainDefense: 0,
      partialCover: false,
      knockbackBlocked: false,
      tackleCounter: false,
      relaxInterceptRange: false,
      result: "hp-change",
      observedBefore: null,
      observedAfter: null,
      observationBeforeAuto: true,
    };
  }

  function unitLabel(unit) {
    if (!unit) return "--";
    const baseName = displayName(unit);
    const qualifier = unit.labelQualifier?.[i18n.language] || unit.labelQualifier?.en;
    const variant = qualifier ? ` [${qualifier}]` : "";
    const boost = unit.variantKind === "boost" ? L(" [加速時]", " [Boosted]") : "";
    const warp = unit.variantKind === "warp" ? L(" [ワープ時]", " [Warping]") : "";
    const decoy = unit.variantKind === "decoy" ? L(" [デコイ]", " [Decoy]") : "";
    return `${baseName}${variant}${boost}${warp}${decoy}`;
  }

  function weaponLabel(weapon) {
    if (!weapon) return "--";
    const guaranteed = core.bypassesEvasion(weapon) ? L(" / 必中", " / guaranteed") : "";
    return `${displayName(weapon)} [${L("威力", "Power")} ${weapon.ap} / ${L("命中", "Acc.")} ${Math.round(weapon.hit * 100)}%${guaranteed}]`;
  }

  function option(value, text, selected = false, disabled = false) {
    const element = document.createElement("option");
    element.value = value;
    element.textContent = text;
    element.selected = selected;
    element.disabled = disabled;
    return element;
  }

  function pad(value, length = 2) {
    return String(value).padStart(length, "0");
  }

  function formatInputDate(date) {
    return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
      + `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
  }

  function parseWallClock(value) {
    const match = /^(\d{4,})-(\d\d)-(\d\d)T(\d\d):(\d\d)(?::(\d\d)(?:\.(\d{1,3}))?)?$/.exec(value || "");
    if (!match) return NaN;
    const [, y, mo, d, h, mi, s = "0", fraction = "0"] = match;
    const ms = Number(fraction.padEnd(3, "0"));
    return Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s), ms);
  }

  function formatWallClock(wallMs) {
    const date = new Date(wallMs);
    return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
      + ` ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}.${pad(date.getUTCMilliseconds(), 3)}`;
  }

  function rosterEntry(id) {
    return roster.find((entry) => entry.id === id);
  }

  function rosterUnit(entry) {
    return unitsById.get(entry?.unitId);
  }

  function unitHasTackleAttack(unit) {
    return (unit?.weapons || []).some((id) => weaponsById.get(id)?.tackle);
  }

  function entryRank(entry) {
    return appMode === "analysis" && entry?.side === "enemy" ? 0 : Number(entry?.rank) || 0;
  }

  function maxHpForEntry(entry) {
    return core.unitMaxHp(rosterUnit(entry), entryRank(entry));
  }

  function initialHpForEntry(entry) {
    const unit = rosterUnit(entry);
    const maxHp = maxHpForEntry(entry);
    if (Number(unit?.formationMax) !== 5) return maxHp;
    const count = Math.min(5, Math.max(1, Math.trunc(Number(entry?.initialFormation) || 5)));
    if (count === 5) return maxHp;
    // A damaged aircraft's internal HP is not displayed. Use the center of
    // the visible count band when a battle starts below five aircraft.
    return Math.fround(maxHp * ((count - 0.5) / 5));
  }

  function sideLabel(side) {
    return side === "enemy" ? L("敵", "Enemy") : L("味方", "Ally");
  }

  function sidePrefix(entry) {
    return `[${sideLabel(entry?.side)}]`;
  }

  function attackWeapons(entry) {
    const unit = rosterUnit(entry);
    return (unit?.weapons || [])
      .map((id) => weaponsById.get(id))
      .filter((weapon) => weapon?.selectableAttack && !weapon.seize);
  }

  function validWeaponForModel(model) {
    const attacker = rosterEntry(model.attackerId);
    const list = attackWeapons(attacker);
    if (!list.some((weapon) => weapon.id === model.weaponId)) model.weaponId = list[0]?.id || "";
    return weaponsById.get(model.weaponId);
  }

  function validParticipantsForModel(model) {
    if (!roster.some((entry) => entry.id === model.attackerId)) model.attackerId = roster[0]?.id || "";
    if (!roster.some((entry) => entry.id === model.targetId) || model.targetId === model.attackerId) {
      model.targetId = roster.find((entry) => entry.id !== model.attackerId)?.id || "";
    }
    validWeaponForModel(model);
  }

  function interceptWeaponsForModel(model) {
    const target = rosterEntry(model.targetId);
    const attackWeapon = weaponsById.get(model.weaponId);
    if (!target || !attackWeapon || !core.incomingInterceptable(attackWeapon)) return [];
    return (rosterUnit(target)?.weapons || [])
      .map((id) => weaponsById.get(id))
      .filter((weapon) => weapon?.canIntercept)
      .filter((weapon) => model.relaxInterceptRange || core.sharedInterceptRange(attackWeapon, weapon))
      .sort((a, b) => b.ap - a.ap || b.hit - a.hit);
  }

  function normalizeReaction(model) {
    const choices = interceptWeaponsForModel(model);
    if (model.reaction === "intercept") {
      if (!choices.length) {
        model.reaction = "none";
        model.interceptWeaponId = "";
      } else if (!choices.some((weapon) => weapon.id === model.interceptWeaponId)) {
        model.interceptWeaponId = choices[0].id;
      }
    } else {
      model.interceptWeaponId = "";
    }
  }

  function predictionAttackerUnit(model = prediction) {
    return unitsById.get(model.attackerUnitId);
  }

  function predictionTargetUnit(model = prediction) {
    return unitsById.get(model.targetUnitId);
  }

  function predictionAttackWeapons(model = prediction) {
    const unit = predictionAttackerUnit(model);
    return (unit?.weapons || [])
      .map((id) => weaponsById.get(id))
      .filter((weapon) => weapon?.selectableAttack && !weapon.seize);
  }

  function predictionInterceptWeapons(model = prediction) {
    const target = predictionTargetUnit(model);
    const attackWeapon = weaponsById.get(model.weaponId);
    if (!target || !attackWeapon || !core.incomingInterceptable(attackWeapon)) return [];
    return (target.weapons || [])
      .map((id) => weaponsById.get(id))
      .filter((weapon) => weapon?.canIntercept)
      .filter((weapon) => model.relaxInterceptRange || core.sharedInterceptRange(attackWeapon, weapon))
      .sort((a, b) => b.ap - a.ap || b.hit - a.hit);
  }

  function normalizePredictionModel(model = prediction) {
    const weapons = predictionAttackWeapons(model);
    if (!weapons.some((weapon) => weapon.id === model.weaponId)) {
      model.weaponId = weapons[0]?.id || "";
    }
    const intercepts = predictionInterceptWeapons(model);
    if (model.reaction === "intercept") {
      if (!intercepts.length) {
        model.reaction = "none";
        model.interceptWeaponId = "";
      } else if (!intercepts.some((weapon) => weapon.id === model.interceptWeaponId)) {
        model.interceptWeaponId = intercepts[0].id;
      }
    } else {
      model.interceptWeaponId = "";
    }
  }

  function predictionUnitHp(unit, rank, formation) {
    const maxHp = core.unitMaxHp(unit, rank);
    if (Number(unit?.formationMax) !== 5) return maxHp;
    const count = Math.min(5, Math.max(1, Math.trunc(Number(formation) || 5)));
    if (count === 5) return maxHp;
    return Math.fround(maxHp * ((count - 0.5) / 5));
  }

  function predictionSimulationConfig(candidate, model = prediction) {
    normalizePredictionModel(model);
    const attackerUnit = predictionAttackerUnit(model);
    const targetUnit = predictionTargetUnit(model);
    const attackerRank = Math.min(5, Math.max(0, Math.trunc(Number(model.attackerRank) || 0)));
    const targetRank = Math.min(5, Math.max(0, Math.trunc(Number(model.targetRank) || 0)));
    return {
      state: candidate.state,
      weapon: weaponsById.get(model.weaponId),
      attackerUnit,
      targetUnit,
      attackerRank,
      targetRank,
      attackerHp: predictionUnitHp(attackerUnit, attackerRank, model.attackerFormation),
      targetHp: predictionUnitHp(targetUnit, targetRank, model.targetFormation),
      mode: model.mode,
      evadeFocus: model.reaction === "focus",
      interceptWeapon: model.reaction === "intercept"
        ? weaponsById.get(model.interceptWeaponId)
        : null,
      terrainAvoid: Number(model.terrainAvoid) || 0,
      terrainDefense: Number(model.terrainDefense) || 0,
      partialCover: Boolean(model.partialCover),
      knockbackBlocked: Boolean(model.knockbackBlocked),
      tackleCounter: model.mode === "counter"
        && unitHasTackleAttack(targetUnit)
        && Boolean(model.tackleCounter),
      relaxInterceptRange: Boolean(model.relaxInterceptRange),
    };
  }

  function serializePredictionSession() {
    if (!predictionSession) return null;
    return {
      ...predictionSession,
      seed32: predictionSession.seed32.toString(),
      state: predictionSession.state.toString(),
    };
  }

  function restorePredictionCandidate() {
    if (!predictionSession) return;
    candidates = [{
      wallMs: predictionSession.wallMs,
      seed32: predictionSession.seed32,
      state: predictionSession.state,
      hp: [...predictionSession.hp],
      consumed: predictionSession.consumed,
    }];
    analysisFresh = true;
  }

  function syncPredictionSessionFromCandidate() {
    if (appMode !== "prediction" || candidates.length !== 1) return;
    const candidate = candidates[0];
    predictionSession = {
      wallMs: candidate.wallMs,
      seed32: candidate.seed32,
      state: candidate.state,
      hp: [...candidate.hp],
      consumed: candidate.consumed,
    };
  }

  function saveState() {
    const payload = {
      noticeTime: $("noticeTime").value,
      timeTolerance: $("timeTolerance").value,
      timeOffset: $("timeOffset").value,
      rosterSide: $("rosterSide").value,
      roster,
      logs,
      nextRosterId,
      nextLogId,
      prediction,
      selectedRosterUnitId,
      appMode,
      predictionStack,
      nextPredictionLogId,
      predictionSession: serializePredictionSession(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  function loadState() {
    try {
      const payload = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!payload) return false;
      $("noticeTime").value = payload.noticeTime || formatInputDate(new Date());
      $("timeTolerance").value = payload.timeTolerance || "3000";
      $("timeOffset").value = payload.timeOffset || "0";
      $("rosterSide").value = payload.rosterSide === "enemy" ? "enemy" : "ally";
      roster = Array.isArray(payload.roster) ? payload.roster.filter((entry) => unitsById.has(entry.unitId)) : [];
      const loadingPrediction = payload.appMode === "prediction" && payload.predictionSession;
      roster = roster.map((entry) => ({
        ...entry,
        side: entry.side === "enemy" ? "enemy" : "ally",
        rank: !loadingPrediction && entry.side === "enemy" ? 0 : Number(entry.rank) || 0,
        initialFormation: Math.min(5, Math.max(1, Number(entry.initialFormation) || 5)),
      }));
      logs = Array.isArray(payload.logs) ? payload.logs : [];
      nextRosterId = Number(payload.nextRosterId) || 1;
      nextLogId = Number(payload.nextLogId) || 1;
      prediction = { ...defaultAttackModel(), ...(payload.prediction || {}) };
      if (!unitsById.has(prediction.attackerUnitId)) prediction.attackerUnitId = "";
      if (!unitsById.has(prediction.targetUnitId)) prediction.targetUnitId = "";
      selectedRosterUnitId = unitsById.has(payload.selectedRosterUnitId)
        ? payload.selectedRosterUnitId
        : "";
      if (loadingPrediction) {
        appMode = "prediction";
        predictionStack = Array.isArray(payload.predictionStack) ? payload.predictionStack : [];
        let generatedLogId = 1;
        predictionStack = predictionStack.map((entry, index) => ({
          ...entry,
          id: index === 0 && entry.kind === "investigation"
            ? "investigation"
            : entry.id || `pl${generatedLogId++}`,
        }));
        const highestStoredId = predictionStack.reduce((max, entry) => {
          const match = /^pl(\d+)$/.exec(entry.id || "");
          return match ? Math.max(max, Number(match[1]) + 1) : max;
        }, 1);
        nextPredictionLogId = Math.max(
          generatedLogId,
          highestStoredId,
          Number(payload.nextPredictionLogId) || 1,
        );
        roster = [];
        logs = [];
        predictionSession = {
          ...payload.predictionSession,
          seed32: BigInt(payload.predictionSession.seed32),
          state: BigInt(payload.predictionSession.state),
          hp: [],
          consumed: Number(payload.predictionSession.consumed) || 0,
        };
        if (!predictionStack.length) {
          predictionStack.push({
            id: "investigation",
            kind: "investigation",
            consumed: predictionSession.consumed,
            stateAfter: core.hex64(predictionSession.state),
          });
        }
        restorePredictionCandidate();
      }
      return true;
    } catch (error) {
      console.warn("Failed to load RNG predictor state", error);
      return false;
    }
  }

  function markDirty() {
    invalidatePendingPrediction();
    if (appMode === "prediction") {
      analysisFresh = candidates.length === 1;
      syncPredictionSessionFromCandidate();
      renderPredictionForm();
      saveState();
      return;
    }
    analysisFresh = false;
    $("analysisStatus").textContent = L("要再解析", "Needs replay");
    $("analysisStatus").className = "status-dirty";
    $("dirtyMessage").hidden = false;
    $("runPrediction").disabled = true;
    saveState();
  }

  function invalidatePendingPrediction() {
    pendingPrediction = null;
  }

  function setAnalysisStatus(text, kind) {
    $("analysisStatus").textContent = text;
    $("analysisStatus").className = kind ? `status-${kind}` : "";
  }

  function rosterPickerCandidates() {
    const needle = $("rosterPickerSearch").value.trim().toLocaleLowerCase(i18n.language);
    return data.units
      .filter((unit) => unit.selectableAsTarget || unit.selectableAsAttacker)
      .filter((unit) => {
        if (!needle) return true;
        const haystack = `${unitLabel(unit)} ${unit.id} ${unit.nameJa || ""} ${unit.nameEn || ""}`
          .toLocaleLowerCase(i18n.language);
        return haystack.includes(needle);
      })
      .sort((a, b) => unitLabel(a).localeCompare(unitLabel(b), i18n.language === "ja" ? "ja" : "en"));
  }

  function renderRosterChoice() {
    const unit = unitsById.get(selectedRosterUnitId);
    $("openRosterUnitPicker").textContent = unit
      ? `${unitLabel(unit)} / ${Number(unit.formationMax) === 5 ? `5${L("機編隊", "-unit formation")}` : `HP ${unit.hp}`}`
      : L("ユニットを選択", "Select a unit");
    $("addRoster").disabled = !unit;
  }

  function renderRosterPicker() {
    const candidates = rosterPickerCandidates();
    const list = $("rosterPickerList");
    const selectedId = unitPickerPurpose === "prediction-attacker"
      ? prediction.attackerUnitId
      : unitPickerPurpose === "prediction-target"
        ? prediction.targetUnitId
        : selectedRosterUnitId;
    list.replaceChildren();
    $("rosterPickerSide").textContent = unitPickerPurpose === "prediction-attacker"
      ? L("攻撃側を選択", "Select attacker")
      : unitPickerPurpose === "prediction-target"
        ? L("対象を選択", "Select target")
        : `${sideLabel($("rosterSide").value)}${L("として追加", " participant")}`;
    $("rosterPickerCount").textContent = L(`${candidates.length}件`, `${candidates.length} results`);
    $("rosterPickerEmpty").hidden = candidates.length > 0;
    for (const unit of candidates) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "rng-picker-unit";
      button.dataset.pickRosterUnit = unit.id;
      if (unit.id === selectedId) button.classList.add("is-selected");
      const name = document.createElement("strong");
      name.textContent = unitLabel(unit);
      const meta = document.createElement("span");
      meta.textContent = Number(unit.formationMax) === 5
        ? `5${L("機編隊", "-unit formation")} / ${unit.occupiedHex || 1} HEX`
        : `HP ${unit.hp} / ${unit.occupiedHex || 1} HEX`;
      const id = document.createElement("small");
      id.textContent = unit.id;
      button.append(name, meta, id);
      list.append(button);
    }
  }

  function addRosterFromForm() {
    const unit = unitsById.get(selectedRosterUnitId);
    if (!unit) return;
    const count = roster.filter((entry) => entry.unitId === unit.id).length + 1;
    const manual = $("rosterName").value.trim();
    const entry = {
      id: `p${nextRosterId++}`,
      unitId: unit.id,
      name: manual || (count > 1 ? `${displayName(unit)} ${count}` : displayName(unit)),
      side: appMode === "prediction"
        ? "ally"
        : $("rosterSide").value === "enemy" ? "enemy" : "ally",
      rank: 0,
      initialFormation: Number(unit.formationMax) === 5 ? 5 : 1,
    };
    roster.push(entry);
    if (appMode === "prediction" && candidates.length === 1) {
      candidates[0].hp.push(initialHpForEntry(entry));
      syncPredictionSessionFromCandidate();
    }
    $("rosterName").value = "";
    renderRoster();
    renderLogs();
    renderPredictionForm();
    markDirty();
  }

  function rankSelect(entry) {
    const select = document.createElement("select");
    select.dataset.rosterId = entry.id;
    select.dataset.field = "rank";
    for (let rank = 0; rank <= 5; rank++) {
      select.append(option(String(rank), `${L("ランク", "Rank")} ${rank}`, rank === Number(entry.rank)));
    }
    return select;
  }

  function sideSelect(entry) {
    const select = document.createElement("select");
    select.dataset.rosterId = entry.id;
    select.dataset.field = "side";
    select.append(
      option("ally", L("味方", "Ally"), entry.side !== "enemy"),
      option("enemy", L("敵", "Enemy"), entry.side === "enemy"),
    );
    return select;
  }

  function formationSelect(entry) {
    const select = document.createElement("select");
    select.dataset.rosterId = entry.id;
    select.dataset.field = "initialFormation";
    for (let count = 1; count <= 5; count++) {
      select.append(option(String(count), `${count}${L("機", " unit(s)")}`, count === Number(entry.initialFormation)));
    }
    return select;
  }

  function renderRoster() {
    const list = $("rosterList");
    list.replaceChildren();
    const predictionMode = appMode === "prediction";
    for (const entry of roster) {
      const unit = rosterUnit(entry);
      const card = document.createElement("article");
      card.className = predictionMode
        ? `roster-card is-prediction${Number(unit?.formationMax) === 5 ? " has-formation" : ""}`
        : `roster-card is-${entry.side === "enemy" ? "enemy" : "ally"}`;
      card.dataset.rosterId = entry.id;

      const identity = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = entry.name;
      const meta = document.createElement("small");
      meta.textContent = `${predictionMode ? "" : `${sidePrefix(entry)} `}${unitLabel(unit)} / ${unit.formationMax || 1}${L("機", " units")} / ${unit.occupiedHex || 1} HEX`;
      identity.append(name, meta);

      const side = predictionMode ? null : makeLabeledControl(L("所属", "Side"), sideSelect(entry));

      const statusLabel = document.createElement("label");
      if (Number(unit?.formationMax) === 5) {
        statusLabel.append(document.createTextNode(L("開始編隊数", "Starting formation")), formationSelect(entry));
      } else if (!predictionMode && entry.side === "enemy") {
        statusLabel.append(
          document.createTextNode(L("熟練ランク", "Veterancy")),
          Object.assign(document.createElement("span"), {
            className: "fixed-roster-value",
            textContent: L("ランク0固定", "Rank 0 (fixed)"),
          }),
        );
      } else {
        statusLabel.append(document.createTextNode(L("熟練ランク", "Veterancy")), rankSelect(entry));
      }

      const rankLabel = Number(unit?.formationMax) === 5 && (predictionMode || entry.side !== "enemy")
        ? makeLabeledControl(L("熟練ランク", "Veterancy"), rankSelect(entry))
        : null;
      if (!predictionMode && Number(unit?.formationMax) === 5 && entry.side === "enemy") {
        const fixed = document.createElement("span");
        fixed.className = "roster-rank-note";
        fixed.textContent = L("敵はランク0固定", "Enemy rank fixed at 0");
        identity.append(fixed);
      }

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "icon-button";
      remove.dataset.removeRoster = entry.id;
      remove.title = L("この個体を削除", "Remove participant");
      remove.textContent = "×";
      card.append(identity);
      if (side) card.append(side);
      card.append(statusLabel);
      if (rankLabel) card.append(rankLabel);
      card.append(remove);
      list.append(card);
    }
    $("rosterEmpty").hidden = roster.length > 0;
    $("addLog").disabled = roster.length < 2 || logs.some((entry) => entry.type === "end");
    $("markBattleEnd").disabled = logs.some((entry) => entry.type === "end");
  }

  function selectForRoster(value, exclude = "") {
    const select = document.createElement("select");
    for (const entry of roster) {
      if (entry.id === exclude) continue;
      const label = appMode === "prediction" ? entry.name : `${sidePrefix(entry)} ${entry.name}`;
      select.append(option(entry.id, label, entry.id === value));
    }
    return select;
  }

  function makeLabeledControl(labelText, control, className = "") {
    const label = document.createElement("label");
    if (className) label.className = className;
    const span = document.createElement("span");
    span.textContent = labelText;
    label.append(span, control);
    return label;
  }

  function basicSelect(items, selected) {
    const select = document.createElement("select");
    for (const [value, label] of items) select.append(option(value, label, value === selected));
    return select;
  }

  function fieldControl(model, field, control) {
    control.dataset.field = field;
    return control;
  }

  function targetUsesFormation(model) {
    return Number(rosterUnit(rosterEntry(model.targetId))?.formationMax) === 5;
  }

  function initialVisibleValue(entry) {
    if (!entry) return 0;
    return Number(rosterUnit(entry)?.formationMax) === 5
      ? Math.min(5, Math.max(1, Number(entry.initialFormation) || 5))
      : core.displayedHp(maxHpForEntry(entry));
  }

  function priorVisibleValue(logIndex, targetId) {
    const target = rosterEntry(targetId);
    let value = initialVisibleValue(target);
    for (let index = 0; index < logIndex; index++) {
      const prior = logs[index];
      if (prior.type !== "attack" || prior.targetId !== targetId) continue;
      if (["hp-change", "formation-change"].includes(prior.result)
        && Number.isFinite(Number(prior.observedAfter))) {
        value = Number(prior.observedAfter);
      } else if (prior.result === "destroyed") {
        value = 0;
      }
    }
    return value;
  }

  function refreshAutoObservationStarts() {
    logs.forEach((log, index) => {
      if (log.type !== "attack" || log.observationBeforeAuto === false) return;
      log.observedBefore = priorVisibleValue(index, log.targetId);
    });
  }

  function normalizeObservationForTarget(model, logIndex = logs.indexOf(model)) {
    const formation = targetUsesFormation(model);
    const desired = formation ? "formation-change" : "hp-change";
    if (model.result === "formation-loss" || model.result === "hp-loss"
      || (model.result === "formation-change" && !formation)
      || (model.result === "hp-change" && formation)) {
      model.result = desired;
    }
    if (model.observationBeforeAuto !== false) {
      model.observedBefore = priorVisibleValue(Math.max(0, logIndex), model.targetId);
    }
    if (!Number.isFinite(Number(model.observedAfter))) {
      model.observedAfter = Number(model.observedBefore);
    }
  }

  function predictionUnitButton(kind, unit) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "unit-picker-trigger";
    button.dataset.openPredictionUnit = kind;
    button.textContent = unit
      ? `${unitLabel(unit)} / ${Number(unit.formationMax) === 5 ? `5${L("機編隊", "-unit formation")}` : `HP ${unit.hp}`}`
      : L("ユニットを選択", "Select a unit");
    return button;
  }

  function predictionRankSelect(field, value) {
    const select = fieldControl(prediction, field, document.createElement("select"));
    for (let rank = 0; rank <= 5; rank++) {
      select.append(option(String(rank), `${L("ランク", "Rank")} ${rank}`, rank === Number(value)));
    }
    return select;
  }

  function predictionFormationSelect(field, value) {
    const select = fieldControl(prediction, field, document.createElement("select"));
    for (let count = 1; count <= 5; count++) {
      select.append(option(String(count), `${count}${L("機", " unit(s)")}`, count === Number(value)));
    }
    return select;
  }

  function createPredictionAttackEditor(model) {
    normalizePredictionModel(model);
    const attackerUnit = predictionAttackerUnit(model);
    const targetUnit = predictionTargetUnit(model);
    const weapon = weaponsById.get(model.weaponId);
    const grid = document.createElement("div");
    grid.className = "prediction-form-grid";

    grid.append(
      makeLabeledControl(
        L("攻撃側", "Attacker"),
        predictionUnitButton("attacker", attackerUnit),
      ),
      makeLabeledControl(
        L("対象", "Target"),
        predictionUnitButton("target", targetUnit),
      ),
      makeLabeledControl(
        L("攻撃側熟練ランク", "Attacker veterancy"),
        predictionRankSelect("attackerRank", model.attackerRank),
      ),
      makeLabeledControl(
        L("対象熟練ランク", "Target veterancy"),
        predictionRankSelect("targetRank", model.targetRank),
      ),
    );

    if (Number(attackerUnit?.formationMax) === 5) {
      grid.append(makeLabeledControl(
        L("攻撃側編隊数", "Attacker formation"),
        predictionFormationSelect("attackerFormation", model.attackerFormation),
      ));
    }
    if (Number(targetUnit?.formationMax) === 5) {
      grid.append(makeLabeledControl(
        L("対象編隊数", "Target formation"),
        predictionFormationSelect("targetFormation", model.targetFormation),
      ));
    }

    const weaponSelect = fieldControl(model, "weaponId", document.createElement("select"));
    for (const candidate of predictionAttackWeapons(model)) {
      weaponSelect.append(option(candidate.id, weaponLabel(candidate), candidate.id === model.weaponId));
    }
    const mode = fieldControl(model, "mode", basicSelect([
      ["normal", L("通常攻撃", "Normal attack")],
      ["counter", L("反撃", "Counterattack")],
    ], model.mode));
    const reaction = fieldControl(model, "reaction", basicSelect([
      ["focus", L("回避に専念", "Focus on evasion")],
      ["none", L("専念・迎撃なし", "No focus/interception")],
      ["intercept", L("迎撃", "Intercept")],
    ], model.reaction));
    grid.append(
      makeLabeledControl(L("使用武器", "Weapon"), weaponSelect, "span-two"),
      makeLabeledControl(L("攻撃モード", "Mode"), mode),
      makeLabeledControl(L("対象の行動", "Defender action"), reaction),
    );

    if (model.reaction === "intercept") {
      const interceptSelect = fieldControl(model, "interceptWeaponId", document.createElement("select"));
      for (const candidate of predictionInterceptWeapons(model)) {
        interceptSelect.append(option(candidate.id, weaponLabel(candidate), candidate.id === model.interceptWeaponId));
      }
      grid.append(makeLabeledControl(L("迎撃武器", "Interception weapon"), interceptSelect, "span-two"));
    }

    const terrainAvoid = fieldControl(model, "terrainAvoid", basicSelect([
      ["0", "0%"],
      ["0.1", "10%"],
      ["0.2", "20%"],
      ["0.25", "25%"],
      ["0.5", "50%"],
    ], String(model.terrainAvoid)));
    const terrainDefense = fieldControl(model, "terrainDefense", basicSelect([
      ["0", "0%"],
      ["0.1", "10%"],
      ["0.2", "20%"],
      ["0.25", "25%"],
      ["0.3", "30%"],
      ["0.5", "50%"],
    ], String(model.terrainDefense)));
    grid.append(
      makeLabeledControl(L("地形回避", "Terrain evasion"), terrainAvoid),
      makeLabeledControl(L("地形防御", "Terrain defense"), terrainDefense),
    );

    const options = document.createElement("div");
    options.className = "combat-log-options";
    const tackleCounterEnabled = model.mode === "counter"
      && unitHasTackleAttack(predictionTargetUnit(model));
    if (!tackleCounterEnabled) model.tackleCounter = false;
    const checks = [
      ["partialCover", L("部分遮蔽", "Partial cover"), core.partialCoverEligible(weapon)],
      ["knockbackBlocked", L("ノックバック先が塞がっている", "Knockback blocked"), Boolean(weapon?.tackle)],
      ["tackleCounter", L("体当たりへの反撃", "Counterattack against a tackle"), tackleCounterEnabled],
      ["relaxInterceptRange", L("迎撃距離制限を緩和", "Relax interception range"), true],
    ];
    for (const [field, labelText, enabled] of checks) {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = Boolean(model[field]);
      checkbox.disabled = !enabled;
      fieldControl(model, field, checkbox);
      const label = document.createElement("label");
      label.append(checkbox, document.createTextNode(labelText));
      options.append(label);
    }
    grid.append(options);
    return grid;
  }

  function createAttackEditor(model, predictionMode = false) {
    validParticipantsForModel(model);
    const weapon = validWeaponForModel(model);
    normalizeReaction(model);

    const grid = document.createElement("div");
    grid.className = predictionMode ? "prediction-form-grid" : "combat-log-grid";

    const attacker = fieldControl(model, "attackerId", selectForRoster(model.attackerId));
    const target = fieldControl(model, "targetId", selectForRoster(model.targetId, model.attackerId));
    const attackerEntry = rosterEntry(model.attackerId);
    const weaponSelect = fieldControl(model, "weaponId", document.createElement("select"));
    for (const candidate of attackWeapons(attackerEntry)) {
      weaponSelect.append(option(candidate.id, weaponLabel(candidate), candidate.id === model.weaponId));
    }
    const mode = fieldControl(model, "mode", basicSelect([
      ["normal", L("通常攻撃", "Normal attack")],
      ["counter", L("反撃", "Counterattack")],
    ], model.mode));
    const reaction = fieldControl(model, "reaction", basicSelect([
      ["focus", L("回避に専念", "Focus on evasion")],
      ["none", L("専念・迎撃なし", "No focus/interception")],
      ["intercept", L("迎撃", "Intercept")],
    ], model.reaction));

    grid.append(
      makeLabeledControl(L("攻撃側", "Attacker"), attacker),
      makeLabeledControl(L("対象", "Target"), target),
      makeLabeledControl(L("使用武器", "Weapon"), weaponSelect, "span-two"),
      makeLabeledControl(L("攻撃モード", "Mode"), mode),
      makeLabeledControl(L("対象の行動", "Defender action"), reaction),
    );

    if (model.reaction === "intercept") {
      const interceptSelect = fieldControl(model, "interceptWeaponId", document.createElement("select"));
      const choices = interceptWeaponsForModel(model);
      for (const candidate of choices) {
        interceptSelect.append(option(candidate.id, weaponLabel(candidate), candidate.id === model.interceptWeaponId));
      }
      grid.append(makeLabeledControl(L("迎撃武器", "Interception weapon"), interceptSelect, "span-two"));
    }

    const terrainAvoid = fieldControl(model, "terrainAvoid", basicSelect([
      ["0", "0%"],
      ["0.1", "10%"],
      ["0.2", "20%"],
      ["0.25", "25%"],
      ["0.5", "50%"],
    ], String(model.terrainAvoid)));
    const terrainDefense = fieldControl(model, "terrainDefense", basicSelect([
      ["0", "0%"],
      ["0.1", "10%"],
      ["0.2", "20%"],
      ["0.25", "25%"],
      ["0.3", "30%"],
      ["0.5", "50%"],
    ], String(model.terrainDefense)));
    grid.append(
      makeLabeledControl(L("地形回避", "Terrain evasion"), terrainAvoid),
      makeLabeledControl(L("地形防御", "Terrain defense"), terrainDefense),
    );

    if (!predictionMode) {
      normalizeObservationForTarget(model);
      const formationTarget = targetUsesFormation(model);
      const result = fieldControl(model, "result", basicSelect([
        ["miss", L("回避された", "Missed / evaded")],
        ["hit", L("命中（損耗量は不明）", "Hit (loss unknown)")],
        [formationTarget ? "formation-change" : "hp-change",
          formationTarget ? L("編隊数の変化を記録", "Record formation change") : L("表示HPの変化を記録", "Record displayed HP change")],
        ["destroyed", L("対象を撃破", "Target destroyed")],
        ["full-intercept", L("完全迎撃", "Fully intercepted")],
        ["attacker-destroyed", L("迎撃反動で攻撃側撃破", "Attacker destroyed by recoil")],
      ], model.result));
      grid.append(makeLabeledControl(L("観測結果", "Observed result"), result, "span-two"));

      if (model.result === "hp-change" || model.result === "formation-change") {
        const max = model.result === "formation-change" ? 5 : maxHpForEntry(rosterEntry(model.targetId));
        const before = document.createElement("input");
        before.type = "number";
        before.min = "0";
        before.max = String(max);
        before.step = "1";
        before.value = String(Number(model.observedBefore) || 0);
        fieldControl(model, "observedBefore", before);
        const after = document.createElement("input");
        after.type = "number";
        after.min = "0";
        after.max = String(max);
        after.step = "1";
        after.value = String(Number(model.observedAfter) || 0);
        fieldControl(model, "observedAfter", after);
        const unitText = model.result === "formation-change" ? L("機", " units") : "HP";
        grid.append(
          makeLabeledControl(L(`変更前（${unitText}）`, `Before (${unitText})`), before),
          makeLabeledControl(L(`変更後（${unitText}）`, `After (${unitText})`), after),
        );
      }
    }

    const options = document.createElement("div");
    options.className = "combat-log-options";
    const tackleCounterEnabled = model.mode === "counter"
      && unitHasTackleAttack(rosterUnit(rosterEntry(model.targetId)));
    if (!tackleCounterEnabled) model.tackleCounter = false;
    const checks = [
      ["partialCover", L("部分遮蔽", "Partial cover"), core.partialCoverEligible(weapon)],
      ["knockbackBlocked", L("ノックバック先が塞がっている", "Knockback blocked"), Boolean(weapon?.tackle)],
      ["tackleCounter", L("体当たりへの反撃", "Counterattack against a tackle"), tackleCounterEnabled],
      ["relaxInterceptRange", L("迎撃距離制限を緩和", "Relax interception range"), true],
    ];
    for (const [field, labelText, enabled] of checks) {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = Boolean(model[field]);
      checkbox.disabled = !enabled;
      fieldControl(model, field, checkbox);
      const label = document.createElement("label");
      label.append(checkbox, document.createTextNode(labelText));
      options.append(label);
    }
    grid.append(options);
    return grid;
  }

  function logSummary(log) {
    const attacker = rosterEntry(log.attackerId);
    const target = rosterEntry(log.targetId);
    const weapon = weaponsById.get(log.weaponId);
    return `${sidePrefix(attacker)} ${attacker?.name || "?"} → ${sidePrefix(target)} ${target?.name || "?"} / ${displayName(weapon) || "?"}`;
  }

  function renderLogs() {
    const list = $("logList");
    list.replaceChildren();
    logs.forEach((log, index) => {
      if (log.type === "end") {
        const marker = document.createElement("div");
        marker.className = "battle-end-marker";
        marker.append(document.createTextNode(L("戦闘終了 — 以後の称号・リザルト乱数は追跡しません", "Battle ended — post-battle title/result RNG is not tracked")));
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "icon-button";
        remove.dataset.removeLog = log.id;
        remove.textContent = "×";
        marker.append(remove);
        list.append(marker);
        return;
      }
      validParticipantsForModel(log);
      normalizeReaction(log);
      const card = document.createElement("article");
      const attackSide = rosterEntry(log.attackerId)?.side === "enemy" ? "enemy" : "ally";
      card.className = `combat-log is-${attackSide}-attack`;
      card.dataset.logId = log.id;
      const head = document.createElement("div");
      head.className = "combat-log-head";
      const number = document.createElement("b");
      number.textContent = `EVENT ${pad(index + 1)}`;
      const summary = document.createElement("span");
      summary.textContent = logSummary(log);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "icon-button";
      remove.dataset.removeLog = log.id;
      remove.title = L("ログを削除", "Remove log");
      remove.textContent = "×";
      head.append(number, summary, remove);
      card.append(head, createAttackEditor(log, false));
      const detail = document.createElement("p");
      detail.className = "combat-log-summary";
      const weapon = weaponsById.get(log.weaponId);
      detail.textContent = weapon
        ? `${core.bypassesEvasion(weapon) ? L("必中: 命中乱数なし", "Guaranteed: no hit roll") : L("命中乱数あり", "Consumes hit roll")} / ${L("命中時はダメージ乱数1回", "One damage roll on hit")}`
        : L("使用可能な攻撃武器がありません", "No usable attack weapon");
      card.append(detail);
      list.append(card);
    });
    $("logEmpty").hidden = logs.length > 0;
    renderRoster();
  }

  function renderPredictionForm() {
    const container = $("predictionForm");
    if (appMode === "prediction") {
      normalizePredictionModel(prediction);
      container.replaceChildren(createPredictionAttackEditor(prediction));
      $("runPrediction").disabled = !analysisFresh
        || candidates.length !== 1
        || !predictionAttackerUnit(prediction)
        || !predictionTargetUnit(prediction)
        || !weaponsById.get(prediction.weaponId);
      return;
    }
    validParticipantsForModel(prediction);
    normalizeReaction(prediction);
    container.replaceChildren(createAttackEditor(prediction, true));
    const battleEnded = logs.some((entry) => entry.type === "end");
    $("runPrediction").disabled = !analysisFresh || !candidates.length || roster.length < 2 || battleEnded;
  }

  function addLog() {
    if (roster.length < 2 || logs.some((entry) => entry.type === "end")) return;
    const ally = roster.find((entry) => entry.side !== "enemy") || roster[0];
    const opponent = roster.find((entry) => entry.id !== ally.id && entry.side !== ally.side)
      || roster.find((entry) => entry.id !== ally.id);
    const model = {
      ...defaultAttackModel(),
      id: `e${nextLogId++}`,
      type: "attack",
      attackerId: ally.id,
      targetId: opponent?.id || "",
    };
    validParticipantsForModel(model);
    normalizeObservationForTarget(model, logs.length);
    model.observedAfter = model.observedBefore;
    logs.push(model);
    renderLogs();
    markDirty();
  }

  function markBattleEnd() {
    if (logs.some((entry) => entry.type === "end")) return;
    logs.push({ id: `e${nextLogId++}`, type: "end" });
    renderLogs();
    renderPredictionForm();
    markDirty();
  }

  function updateModelField(model, field, control) {
    if (control.type === "checkbox") model[field] = control.checked;
    else if ([
      "terrainAvoid", "terrainDefense", "observedBefore", "observedAfter",
      "attackerRank", "targetRank", "attackerFormation", "targetFormation",
    ].includes(field)) model[field] = Number(control.value);
    else model[field] = control.value;
    if (appMode === "prediction" && model === prediction) {
      if (["weaponId", "reaction", "relaxInterceptRange"].includes(field)) {
        normalizePredictionModel(model);
      }
      return;
    }
    if (field === "observedBefore") model.observationBeforeAuto = false;
    if (field === "attackerId") {
      if (model.targetId === model.attackerId) model.targetId = roster.find((entry) => entry.id !== model.attackerId)?.id || "";
      model.weaponId = "";
    }
    if (field === "targetId") {
      model.observationBeforeAuto = true;
      model.observedAfter = null;
      normalizeObservationForTarget(model);
    }
    if (field === "result") normalizeObservationForTarget(model);
    if (["attackerId", "targetId", "weaponId", "reaction", "relaxInterceptRange"].includes(field)) {
      validParticipantsForModel(model);
      normalizeReaction(model);
    }
  }

  function validateInputs() {
    const center = parseWallClock($("noticeTime").value);
    const tolerance = Math.max(0, Math.trunc(Number($("timeTolerance").value)));
    const offset = Math.trunc(Number($("timeOffset").value) || 0);
    if (!Number.isFinite(center)) return { error: L("「ご注意」の時刻を入力してください。", "Enter the notice-screen time.") };
    if (!Number.isFinite(tolerance) || tolerance * 2 + 1 > MAX_TIME_CANDIDATES) {
      return { error: L("時刻候補が多すぎます。許容誤差は60秒以内にしてください。", "Too many time candidates. Keep tolerance within 60 seconds.") };
    }
    if (roster.length < 2) return { error: L("戦場ユニットを2体以上追加してください。", "Add at least two participants.") };
    for (const log of logs) {
      if (log.type !== "attack") continue;
      validParticipantsForModel(log);
      const weapon = weaponsById.get(log.weaponId);
      if (!rosterEntry(log.attackerId) || !rosterEntry(log.targetId) || !weapon) {
        return { error: L("攻撃側・対象・武器が未設定のログがあります。", "A log is missing attacker, target, or weapon.") };
      }
      if (weapon.seize) return { error: L("鹵獲弾は現在の試作対象外です。", "Capture rounds are not supported in this prototype.") };
      if (log.result === "hp-change" || log.result === "formation-change") {
        const before = Math.trunc(Number(log.observedBefore));
        const after = Math.trunc(Number(log.observedAfter));
        const max = log.result === "formation-change" ? 5 : maxHpForEntry(rosterEntry(log.targetId));
        if (before < 0 || before > max || after < 0 || after > before) {
          return { error: L("変更前→変更後の表示値が範囲外のログがあります。", "A before → after observation is out of range.") };
        }
      }
    }
    return { center: center + offset, tolerance };
  }

  function candidateFromTime(wallMs) {
    const initial = core.stateAfterGameInstanceInit(wallMs);
    return {
      wallMs,
      seed32: initial.seed32,
      state: initial.state,
      hp: roster.map(initialHpForEntry),
      // GameInstanceの乱数管理初期化で、シード設定後に2回進む。
      consumed: 2,
    };
  }

  function simulationConfig(candidate, log) {
    const attackerIndex = roster.findIndex((entry) => entry.id === log.attackerId);
    const targetIndex = roster.findIndex((entry) => entry.id === log.targetId);
    const attacker = roster[attackerIndex];
    const target = roster[targetIndex];
    const interceptWeapon = log.reaction === "intercept"
      ? weaponsById.get(log.interceptWeaponId)
      : null;
    return {
      state: candidate.state,
      weapon: weaponsById.get(log.weaponId),
      attackerUnit: rosterUnit(attacker),
      targetUnit: rosterUnit(target),
      attackerRank: entryRank(attacker),
      targetRank: entryRank(target),
      attackerHp: candidate.hp[attackerIndex],
      targetHp: candidate.hp[targetIndex],
      mode: log.mode,
      evadeFocus: log.reaction === "focus",
      interceptWeapon,
      terrainAvoid: Number(log.terrainAvoid) || 0,
      terrainDefense: Number(log.terrainDefense) || 0,
      partialCover: Boolean(log.partialCover),
      knockbackBlocked: Boolean(log.knockbackBlocked),
      tackleCounter: log.mode === "counter"
        && unitHasTackleAttack(rosterUnit(target))
        && Boolean(log.tackleCounter),
      relaxInterceptRange: Boolean(log.relaxInterceptRange),
      attackerIndex,
      targetIndex,
    };
  }

  function matchesObservation(log, result) {
    switch (log.result) {
      case "miss":
        return result.kind === "miss";
      case "hit":
        return result.kind === "hit" || result.kind === "destroyed";
      case "destroyed":
        return result.kind === "destroyed";
      case "full-intercept":
        return result.kind === "full-intercept";
      case "attacker-destroyed":
        return result.kind === "attacker-destroyed";
      case "hp-change": {
        return core.matchesDisplayedHpObservation(
          result,
          log.observedBefore,
          log.observedAfter,
        );
      }
      case "formation-change": {
        if (result.kind !== "hit" && result.kind !== "destroyed") return false;
        return result.targetFormationBefore === Math.trunc(Number(log.observedBefore))
          && result.targetFormationAfter === Math.trunc(Number(log.observedAfter));
      }
      default:
        return false;
    }
  }

  function applyResult(candidate, config, result) {
    candidate.state = result.state;
    candidate.hp[config.attackerIndex] = result.attackerHpAfter;
    candidate.hp[config.targetIndex] = result.targetHpAfter;
    candidate.consumed = (Number(candidate.consumed) || 0) + result.consumed.length;
  }

  function runAnalysis() {
    const validated = validateInputs();
    if (validated.error) {
      candidates = [];
      filterCounts = [];
      analysisFresh = false;
      renderAnalysisError(validated.error);
      return;
    }
    setAnalysisStatus(L("解析中", "Replaying"), "dirty");
    $("runAnalysis").disabled = true;
    requestAnimationFrame(() => {
      const generated = [];
      for (let delta = -validated.tolerance; delta <= validated.tolerance; delta++) {
        generated.push(candidateFromTime(validated.center + delta));
      }
      let remaining = generated;
      filterCounts = [{ label: L("時刻候補", "Time candidates"), count: remaining.length }];
      let applied = 0;
      let zeroAt = null;

      for (const log of logs) {
        if (log.type === "end") break;
        const next = [];
        for (const candidate of remaining) {
          const config = simulationConfig(candidate, log);
          if (!(config.attackerHp > 0) || !(config.targetHp > 0)) continue;
          const result = core.simulateAttack(config);
          if (!matchesObservation(log, result)) continue;
          applyResult(candidate, config, result);
          next.push(candidate);
        }
        remaining = next;
        applied++;
        filterCounts.push({ label: logSummary(log), count: remaining.length });
        if (!remaining.length) {
          zeroAt = applied;
          break;
        }
      }

      candidates = remaining;
      analysisFresh = true;
      $("runAnalysis").disabled = false;
      $("dirtyMessage").hidden = true;
      $("candidateCount").textContent = candidates.length.toLocaleString();
      $("appliedLogCount").textContent = String(applied);
      renderAnalysisResult(zeroAt);
      renderPredictionForm();
      saveState();
    });
  }

  function renderAnalysisError(message) {
    $("runAnalysis").disabled = false;
    $("candidateCount").textContent = "0";
    $("appliedLogCount").textContent = "0";
    setAnalysisStatus(L("入力エラー", "Input error"), "error");
    $("uniqueState").hidden = true;
    $("candidateSummary").className = "candidate-summary is-error";
    $("candidateSummary").replaceChildren();
    const p = document.createElement("p");
    p.textContent = message;
    $("candidateSummary").append(p);
    $("filterSteps").replaceChildren();
    $("candidateTimes").replaceChildren();
    renderPredictionForm();
  }

  function renderAnalysisResult(zeroAt) {
    const summary = $("candidateSummary");
    summary.replaceChildren();
    const p = document.createElement("p");
    $("uniqueState").hidden = candidates.length !== 1;
    if (!candidates.length) {
      setAnalysisStatus(L("候補なし", "No candidates"), "error");
      summary.className = "candidate-summary is-error";
      p.textContent = zeroAt
        ? L(`ログ${zeroAt}件目で全候補が除外されました。`, `All candidates were rejected at log ${zeroAt}.`)
        : L("時刻候補を生成できませんでした。", "No time candidates were generated.");
    } else if (candidates.length === 1) {
      setAnalysisStatus(L("一意に特定", "Unique"), "ready");
      summary.className = "candidate-summary";
      p.textContent = L("次に消費される乱数状態を一意に特定しました。", "The next RNG state is uniquely identified.");
      $("uniqueStateHex").textContent = `0x${core.hex64(candidates[0].state)}`;
      $("uniqueSeedTime").textContent = `${formatWallClock(candidates[0].wallMs)} / seed32 0x${candidates[0].seed32.toString(16).padStart(8, "0")}`;
    } else {
      setAnalysisStatus(L("候補あり", "Candidates remain"), "ready");
      summary.className = "candidate-summary";
      p.textContent = L(
        `${candidates.length.toLocaleString()}候補が残っています。ログを追加するか、次攻撃の一致予測を確認できます。`,
        `${candidates.length.toLocaleString()} candidates remain. Add logs or check whether their next predictions agree.`,
      );
    }
    summary.append(p);

    const steps = $("filterSteps");
    steps.replaceChildren();
    for (const step of filterCounts) {
      const li = document.createElement("li");
      const label = document.createElement("span");
      label.textContent = step.label;
      const count = document.createElement("b");
      count.textContent = step.count.toLocaleString();
      if (!step.count) count.className = "is-zero";
      li.append(label, count);
      steps.append(li);
    }

    const times = $("candidateTimes");
    times.replaceChildren();
    const maxShown = 200;
    candidates.slice(0, maxShown).forEach((candidate) => {
      const code = document.createElement("code");
      code.textContent = `${formatWallClock(candidate.wallMs)}  state=0x${core.hex64(candidate.state)}`;
      times.append(code);
    });
    if (candidates.length > maxShown) {
      const more = document.createElement("p");
      more.textContent = L(`ほか${candidates.length - maxShown}件`, `${candidates.length - maxShown} more`);
      times.append(more);
    }
  }

  function predictionGroupKey(result) {
    if (result.kind === "miss") return "miss";
    if (result.kind === "full-intercept") return "full-intercept";
    if (result.kind === "attacker-destroyed") return "attacker-destroyed";
    const formationLoss = result.targetFormationBefore - result.targetFormationAfter;
    return `${result.kind}|hp${result.displayHpLoss}|f${formationLoss}`;
  }

  function predictionLabel(group) {
    const sample = group.sample;
    if (sample.kind === "miss") return L("回避", "Evaded");
    if (sample.kind === "full-intercept") return L("完全迎撃", "Fully intercepted");
    if (sample.kind === "attacker-destroyed") return L("迎撃反動で攻撃側撃破", "Attacker destroyed by recoil");
    if (sample.kind === "destroyed") return L("命中・撃破", "Hit · destroyed");
    const targetUnit = appMode === "prediction"
      ? predictionTargetUnit(prediction)
      : rosterUnit(rosterEntry(prediction.targetId));
    if (Number(targetUnit?.formationMax) === 5) {
      return L(
        `命中・${sample.targetFormationBefore}→${sample.targetFormationAfter}機`,
        `Hit · ${sample.targetFormationBefore} → ${sample.targetFormationAfter} units`,
      );
    }
    return L(
      `命中・HP ${sample.displayHpBefore}→${sample.displayHpAfter}`,
      `Hit · HP ${sample.displayHpBefore} → ${sample.displayHpAfter}`,
    );
  }

  function runPrediction() {
    if (!analysisFresh || !candidates.length) return;
    if (appMode === "analysis" && logs.some((entry) => entry.type === "end")) return;
    invalidatePendingPrediction();
    if (appMode === "prediction") {
      normalizePredictionModel(prediction);
      if (!predictionAttackerUnit() || !predictionTargetUnit() || !weaponsById.get(prediction.weaponId)) return;
    } else {
      validParticipantsForModel(prediction);
      normalizeReaction(prediction);
    }
    const groups = new Map();
    let singlePrediction = null;
    for (const candidate of candidates) {
      const config = appMode === "prediction"
        ? predictionSimulationConfig(candidate, prediction)
        : simulationConfig(candidate, prediction);
      if (!(config.attackerHp > 0) || !(config.targetHp > 0)) continue;
      const result = core.simulateAttack(config);
      if (candidates.length === 1) singlePrediction = { config, result };
      const key = predictionGroupKey(result);
      let group = groups.get(key);
      if (!group) {
        group = {
          key,
          sample: result,
          count: 0,
          minDamage: Infinity,
          maxDamage: -Infinity,
          hitRollMin: Infinity,
          hitRollMax: -Infinity,
          damageRollMin: Infinity,
          damageRollMax: -Infinity,
        };
        groups.set(key, group);
      }
      group.count++;
      group.minDamage = Math.min(group.minDamage, result.damage);
      group.maxDamage = Math.max(group.maxDamage, result.damage);
      const hitRoll = result.consumed.find((roll) => roll.purpose === "hit")?.value;
      const damageRoll = result.consumed.find((roll) => roll.purpose === "damage")?.value;
      if (hitRoll != null) {
        group.hitRollMin = Math.min(group.hitRollMin, hitRoll);
        group.hitRollMax = Math.max(group.hitRollMax, hitRoll);
      }
      if (damageRoll != null) {
        group.damageRollMin = Math.min(group.damageRollMin, damageRoll);
        group.damageRollMax = Math.max(group.damageRollMax, damageRoll);
      }
    }
    const sortedGroups = [...groups.values()].sort((a, b) => b.count - a.count);
    renderPrediction(sortedGroups);
    if (appMode === "prediction" && singlePrediction && sortedGroups.length === 1) {
      pendingPrediction = singlePrediction;
    }
  }

  function rngRange(min, max) {
    if (!Number.isFinite(min)) return "";
    if (Math.abs(max - min) < 1e-12) return min.toFixed(8);
    return `${min.toFixed(8)}–${max.toFixed(8)}`;
  }

  function renderPrediction(groups) {
    const container = $("predictionResult");
    container.replaceChildren();
    if (!groups.length) {
      container.className = "prediction-result is-split";
      const p = document.createElement("p");
      p.textContent = L("生存している攻撃側・対象の組み合わせがありません。", "No surviving attacker/target combination remains.");
      container.append(p);
      return;
    }
    const consensus = groups.length === 1;
    container.className = `prediction-result ${consensus ? "is-consensus" : "is-split"}`;
    const headline = document.createElement("strong");
    headline.className = "prediction-headline";
    headline.textContent = consensus
      ? predictionLabel(groups[0])
      : L(`${groups.length}通りに分岐`, `${groups.length} possible outcomes`);
    const detail = document.createElement("span");
    detail.className = "prediction-detail";
    if (candidates.length === 1) {
      const result = groups[0].sample;
      detail.textContent = (result.kind === "hit" || result.kind === "destroyed")
        ? L(
          `内部ダメージ ${result.damage.toFixed(6)} / 表示HP ${result.displayHpBefore}→${result.displayHpAfter} / ダメージ乱数 ${rngRange(groups[0].damageRollMin, groups[0].damageRollMax)}`,
          `Internal damage ${result.damage.toFixed(6)} / displayed HP ${result.displayHpBefore} → ${result.displayHpAfter} / damage RNG ${rngRange(groups[0].damageRollMin, groups[0].damageRollMax)}`,
        )
        : L(`消費後状態 0x${core.hex64(result.state)}`, `Next state 0x${core.hex64(result.state)}`);
    } else {
      detail.textContent = consensus
        ? L(`残る${candidates.length}候補すべてで表示結果が一致します。`, `All ${candidates.length} candidates agree on the displayed outcome.`)
        : L("ログを追加すると分岐をさらに絞れます。", "Add another observed log to narrow these branches.");
    }
    container.append(headline, detail);

    const list = document.createElement("div");
    list.className = "prediction-groups";
    for (const group of groups) {
      const row = document.createElement("div");
      row.className = "prediction-group";
      const label = document.createElement("b");
      label.textContent = predictionLabel(group);
      const count = document.createElement("span");
      count.textContent = `${group.count}/${candidates.length}`;
      const more = document.createElement("small");
      const damageText = Number.isFinite(group.minDamage) && group.maxDamage > 0
        ? (Math.abs(group.maxDamage - group.minDamage) < 1e-9
          ? `${L("内部ダメージ", "Internal damage")} ${group.minDamage.toFixed(6)}`
          : `${L("内部ダメージ範囲", "Internal damage range")} ${group.minDamage.toFixed(3)}–${group.maxDamage.toFixed(3)}`)
        : L("対象ダメージなし", "No target damage");
      const hitText = Number.isFinite(group.hitRollMin) ? ` / hit RNG ${rngRange(group.hitRollMin, group.hitRollMax)}` : "";
      const damageRngText = Number.isFinite(group.damageRollMin) ? ` / damage RNG ${rngRange(group.damageRollMin, group.damageRollMax)}` : "";
      more.textContent = `${damageText}${hitText}${damageRngText}`;
      row.append(label, count, more);
      list.append(row);
    }
    container.append(list);
  }

  function stackEntryLabel(entry) {
    if (entry.kind === "investigation") {
      return L("調査モードまでの乱数消費", "RNG consumption through investigation mode");
    }
    if (entry.kind === "stage-clear") return L("ステージクリアをした", "Stage cleared");
    if (["charged-attack", "charged-given", "charged-received"].includes(entry.kind)) {
      return L("チャージ攻撃した／された", "Charged attack performed / received");
    }
    return L("攻撃した／された", "Attack performed / received");
  }

  function renderPredictionStack() {
    if (appMode !== "prediction" || candidates.length !== 1) return;
    const candidate = candidates[0];
    const summary = $("predictionLogSummary");
    summary.replaceChildren();
    const p = document.createElement("p");
    p.textContent = L(
      `総消費 ${candidate.consumed.toLocaleString()}回 / 現在状態 0x${core.hex64(candidate.state)}`,
      `Total ${candidate.consumed.toLocaleString()} calls / current state 0x${core.hex64(candidate.state)}`,
    );
    summary.append(p);

    const steps = $("predictionLogList");
    steps.replaceChildren();
    for (const entry of predictionStack) {
      const li = document.createElement("li");
      li.className = `prediction-log-entry${entry.kind === "investigation" ? " is-fixed" : ""}`;
      const label = document.createElement("span");
      label.textContent = entry.kind === "investigation"
        ? `${stackEntryLabel(entry)} / seed32 0x${candidate.seed32.toString(16).padStart(8, "0")}`
        : stackEntryLabel(entry);
      const count = document.createElement("b");
      count.textContent = `+${entry.consumed}`;
      const state = document.createElement("small");
      state.textContent = `state=0x${entry.stateAfter}`;
      li.append(label, count);
      if (entry.kind !== "investigation") {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "icon-button";
        remove.dataset.removePredictionLog = entry.id;
        remove.title = L("このログを削除", "Remove this log");
        remove.textContent = "×";
        li.append(remove);
      }
      li.append(state);
      steps.append(li);
    }

    $("candidateCount").textContent = "1";
    $("appliedLogCount").textContent = String(predictionStack.length);
    setAnalysisStatus(L("予測モード", "Predicting"), "ready");
  }

  function updateModeUi() {
    const active = appMode === "prediction";
    document.body.classList.toggle("is-prediction-mode", active);
    $("predictionModeBanner").hidden = !active;
    $("analysisSeedPanel").hidden = active;
    $("analysisLogsPanel").hidden = active;
    $("analysisRunPanel").hidden = active;
    $("rosterPanel").hidden = active;
    $("predictionLogPanel").hidden = !active;
    $("analysisResultPanel").hidden = active;
    $("candidateDetails").hidden = active;
    $("rosterSideControl").hidden = false;
    $("rosterTitle").textContent = L("戦場ユニット", "Battle participants");
    $("resultPanelTitle").textContent = L("候補", "Candidates");
    $("statusLogLabel").textContent = active
      ? L("簡易ログ", "Simple log")
      : L("適用ログ", "Applied logs");
    if (!active) $("enterPredictionMode").hidden = false;
  }

  function enterPredictionMode() {
    if (appMode !== "analysis" || !analysisFresh || candidates.length !== 1) return;
    const candidate = candidates[0];
    appMode = "prediction";
    predictionStack = [{
      id: "investigation",
      kind: "investigation",
      consumed: Number(candidate.consumed) || 0,
      stateAfter: core.hex64(candidate.state),
    }];
    nextPredictionLogId = 1;
    roster = [];
    logs = [];
    filterCounts = [];
    candidate.hp = [];
    prediction = defaultAttackModel();
    pendingPrediction = null;
    syncPredictionSessionFromCandidate();
    updateModeUi();
    renderAll();
    renderPredictionStack();
    renderPredictionReadyMessage();
    saveState();
  }

  function renderPredictionReadyMessage() {
    const result = $("predictionResult");
    result.className = "prediction-result";
    result.replaceChildren();
    const p = document.createElement("p");
    p.textContent = L(
      "攻撃側・対象・武器を選び、現在の乱数状態から次の攻撃を予測できます。",
      "Select the attacker, target, and weapon to predict the next attack from the current RNG state.",
    );
    result.append(p);
  }

  function appendPredictionEvent(kind, consumed) {
    if (appMode !== "prediction" || candidates.length !== 1) return;
    if (!Number.isFinite(consumed) || consumed < 0 || consumed > 10000) return;
    invalidatePendingPrediction();
    const candidate = candidates[0];
    candidate.state = core.advanceState(candidate.state, consumed);
    candidate.consumed = (Number(candidate.consumed) || 0) + consumed;
    predictionStack.push({
      id: `pl${nextPredictionLogId++}`,
      kind,
      consumed,
      stateAfter: core.hex64(candidate.state),
    });
    syncPredictionSessionFromCandidate();
    renderPredictionStack();
    renderPredictionForm();
    renderPredictionReadyMessage();
    saveState();
  }

  function predictionEventConsumption(kind) {
    if (kind === "stage-clear") return 0;
    if (pendingPrediction) return pendingPrediction.result.consumed.length;
    if (kind === "charged-attack") return 1;
    return 2;
  }

  function rebuildPredictionState() {
    if (appMode !== "prediction" || candidates.length !== 1 || !predictionStack.length) return;
    const fixed = predictionStack[0];
    let state = BigInt(`0x${fixed.stateAfter}`);
    let consumed = Number(fixed.consumed) || 0;
    for (const entry of predictionStack.slice(1)) {
      const calls = Math.max(0, Math.trunc(Number(entry.consumed) || 0));
      state = core.advanceState(state, calls);
      consumed += calls;
      entry.stateAfter = core.hex64(state);
    }
    candidates[0].state = state;
    candidates[0].consumed = consumed;
    candidates[0].hp = [];
    syncPredictionSessionFromCandidate();
    invalidatePendingPrediction();
    renderPredictionStack();
    renderPredictionForm();
    renderPredictionReadyMessage();
    saveState();
  }

  function renderIdleResults() {
    $("candidateCount").textContent = "—";
    $("appliedLogCount").textContent = "0";
    setAnalysisStatus(L("未解析", "Not analyzed"), "idle");
    $("uniqueState").hidden = true;
    $("uniqueStateHex").textContent = "";
    $("uniqueSeedTime").textContent = "";

    const summary = $("candidateSummary");
    summary.className = "candidate-summary";
    summary.replaceChildren();
    const summaryText = document.createElement("p");
    summaryText.textContent = L("まだ解析していません。", "Analysis has not been run yet.");
    summary.append(summaryText);

    $("filterSteps").replaceChildren();
    $("candidateTimes").replaceChildren();
    $("predictionLogList").replaceChildren();
    $("predictionLogSummary").replaceChildren();

    const predictionResult = $("predictionResult");
    predictionResult.className = "prediction-result";
    predictionResult.replaceChildren();
    const predictionText = document.createElement("p");
    predictionText.textContent = L(
      "解析後に、次の攻撃条件を指定してください。",
      "Run analysis, then specify the next attack.",
    );
    predictionResult.append(predictionText);
  }

  function clearAllState() {
    roster = [];
    logs = [];
    candidates = [];
    filterCounts = [];
    nextRosterId = 1;
    nextLogId = 1;
    nextPredictionLogId = 1;
    prediction = defaultAttackModel();
    selectedRosterUnitId = "";
    appMode = "analysis";
    predictionStack = [];
    predictionSession = null;
    pendingPrediction = null;
    analysisFresh = false;
    $("noticeTime").value = formatInputDate(new Date());
    $("timeTolerance").value = "3000";
    $("timeOffset").value = "0";
    $("rosterSide").value = "ally";
    localStorage.removeItem(STORAGE_KEY);
    updateModeUi();
    renderAll();
    renderIdleResults();
    $("dirtyMessage").hidden = false;
    saveState();
  }

  function resetAll() {
    if (!window.confirm(L("時刻・ユニット・ログをすべて初期化しますか？", "Reset time, participants, and all logs?"))) return;
    clearAllState();
  }

  function leavePredictionMode() {
    if (!window.confirm(L("予測ログを破棄し、シード調査を最初からやり直しますか？", "Discard the prediction log and restart seed investigation?"))) return;
    clearAllState();
  }

  function renderAll() {
    updateModeUi();
    renderRosterChoice();
    renderRoster();
    renderLogs();
    renderPredictionForm();
    if (appMode === "prediction") renderPredictionStack();
  }

  function handleRosterInput(event) {
    const control = event.target.closest("[data-roster-id][data-field]");
    if (!control) return;
    const entry = rosterEntry(control.dataset.rosterId);
    if (!entry) return;
    const rosterIndex = roster.indexOf(entry);
    if (control.dataset.field === "rank") {
      entry.rank = Number(control.value);
    } else if (control.dataset.field === "side") {
      entry.side = control.value === "enemy" ? "enemy" : "ally";
      if (entry.side === "enemy") entry.rank = 0;
    } else if (control.dataset.field === "initialFormation") {
      entry.initialFormation = Math.min(5, Math.max(1, Number(control.value) || 5));
    }
    if (appMode === "prediction" && candidates.length === 1 && rosterIndex >= 0) {
      candidates[0].hp[rosterIndex] = initialHpForEntry(entry);
      syncPredictionSessionFromCandidate();
    }
    refreshAutoObservationStarts();
    renderAll();
    markDirty();
  }

  function handleEditorInput(event, model, rerender) {
    const control = event.target.closest("[data-field]");
    if (!control) return;
    updateModelField(model, control.dataset.field, control);
    if (rerender) rerender();
    markDirty();
  }

  if (!loadState()) {
    $("noticeTime").value = formatInputDate(new Date());
  }
  $("languageSelect").value = i18n.language;
  renderAll();
  if (appMode === "prediction") {
    renderPredictionStack();
    $("dirtyMessage").hidden = true;
  } else {
    $("candidateCount").textContent = "—";
    $("appliedLogCount").textContent = "0";
    $("dirtyMessage").hidden = false;
  }

  $("openRosterUnitPicker").addEventListener("click", () => {
    unitPickerPurpose = "roster";
    $("rosterPickerSearch").value = "";
    renderRosterPicker();
    $("rosterUnitPicker").showModal();
    requestAnimationFrame(() => $("rosterPickerSearch").focus());
  });
  $("rosterPickerSearch").addEventListener("input", renderRosterPicker);
  $("rosterPickerList").addEventListener("click", (event) => {
    const id = event.target.closest("[data-pick-roster-unit]")?.dataset.pickRosterUnit;
    if (!id) return;
    if (unitPickerPurpose === "prediction-attacker") {
      prediction.attackerUnitId = id;
      prediction.weaponId = "";
      prediction.interceptWeaponId = "";
      invalidatePendingPrediction();
      renderPredictionForm();
    } else if (unitPickerPurpose === "prediction-target") {
      prediction.targetUnitId = id;
      prediction.interceptWeaponId = "";
      invalidatePendingPrediction();
      renderPredictionForm();
    } else {
      selectedRosterUnitId = id;
      renderRosterChoice();
    }
    $("rosterUnitPicker").close();
    saveState();
  });
  $("rosterSide").addEventListener("change", () => {
    renderRosterPicker();
    saveState();
  });
  $("addRoster").addEventListener("click", addRosterFromForm);
  $("rosterList").addEventListener("change", handleRosterInput);
  $("rosterList").addEventListener("input", handleRosterInput);
  $("rosterList").addEventListener("click", (event) => {
    const id = event.target.closest("[data-remove-roster]")?.dataset.removeRoster;
    if (!id) return;
    const rosterIndex = roster.findIndex((entry) => entry.id === id);
    if (appMode === "prediction" && candidates.length === 1 && rosterIndex >= 0) {
      candidates[0].hp.splice(rosterIndex, 1);
      syncPredictionSessionFromCandidate();
    }
    roster = roster.filter((entry) => entry.id !== id);
    logs = logs.filter((log) => log.type === "end" || (log.attackerId !== id && log.targetId !== id));
    refreshAutoObservationStarts();
    renderAll();
    markDirty();
  });

  $("addLog").addEventListener("click", addLog);
  $("markBattleEnd").addEventListener("click", markBattleEnd);
  $("logList").addEventListener("click", (event) => {
    const id = event.target.closest("[data-remove-log]")?.dataset.removeLog;
    if (!id) return;
    logs = logs.filter((entry) => entry.id !== id);
    refreshAutoObservationStarts();
    renderLogs();
    renderPredictionForm();
    markDirty();
  });
  ["change", "input"].forEach((type) => $("logList").addEventListener(type, (event) => {
    const card = event.target.closest("[data-log-id]");
    const log = logs.find((entry) => entry.id === card?.dataset.logId);
    if (!log) return;
    const field = event.target.dataset.field;
    const structural = ["attackerId", "targetId", "weaponId", "reaction", "result", "relaxInterceptRange"]
      .includes(field) || (event.type === "change" && field === "observedAfter");
    handleEditorInput(event, log, structural ? () => renderLogs() : null);
    if (field === "observedAfter" || field === "targetId" || field === "result") {
      refreshAutoObservationStarts();
      if (event.type === "change") renderLogs();
      saveState();
    }
  }));

  ["change", "input"].forEach((type) => $("predictionForm").addEventListener(type, (event) => {
    const control = event.target.closest("[data-field]");
    if (!control) return;
    invalidatePendingPrediction();
    updateModelField(prediction, control.dataset.field, control);
    renderPredictionForm();
    saveState();
  }));
  $("predictionForm").addEventListener("click", (event) => {
    const kind = event.target.closest("[data-open-prediction-unit]")?.dataset.openPredictionUnit;
    if (!kind) return;
    unitPickerPurpose = kind === "target" ? "prediction-target" : "prediction-attacker";
    $("rosterPickerSearch").value = "";
    renderRosterPicker();
    $("rosterUnitPicker").showModal();
    requestAnimationFrame(() => $("rosterPickerSearch").focus());
  });

  $("predictionLogPanel").addEventListener("click", (event) => {
    const kind = event.target.closest("[data-prediction-event]")?.dataset.predictionEvent;
    if (kind) {
      appendPredictionEvent(kind, predictionEventConsumption(kind));
      return;
    }
    const id = event.target.closest("[data-remove-prediction-log]")?.dataset.removePredictionLog;
    if (!id) return;
    predictionStack = predictionStack.filter((entry) => entry.kind === "investigation" || entry.id !== id);
    rebuildPredictionState();
  });

  ["noticeTime", "timeTolerance", "timeOffset"].forEach((id) => {
    $(id).addEventListener("input", markDirty);
    $(id).addEventListener("change", markDirty);
  });
  $("setNow").addEventListener("click", () => {
    $("noticeTime").value = formatInputDate(new Date());
    markDirty();
  });
  $("resetAll").addEventListener("click", resetAll);
  $("runAnalysis").addEventListener("click", runAnalysis);
  $("runPrediction").addEventListener("click", runPrediction);
  $("enterPredictionMode").addEventListener("click", enterPredictionMode);
  $("leavePredictionMode").addEventListener("click", leavePredictionMode);
  $("languageSelect").addEventListener("change", (event) => {
    i18n.setLanguage(event.target.value);
    renderAll();
    if (appMode === "prediction") renderPredictionStack();
    else if (analysisFresh) renderAnalysisResult(candidates.length ? null : filterCounts.length - 1);
    saveState();
  });
})();
