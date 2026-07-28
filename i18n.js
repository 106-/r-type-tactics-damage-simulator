(() => {
  "use strict";
  const LANGUAGES = ["ja", "en"];
  const paramLang = (new URLSearchParams(window.location.search).get("lang") || "").toLowerCase();
  const stored = localStorage.getItem("rtype-language");
  let language = LANGUAGES.includes(paramLang)
    ? paramLang
    : LANGUAGES.includes(stored)
      ? stored
      : String(navigator.language || "").toLowerCase().startsWith("ja") ? "ja" : "en";

  // 英訳辞書。日本語の原文はHTML側だけが持つ（data-i18n / data-i18n-html / data-i18n-* 属性で紐付け）。
  // data-i18n はtextContent、data-i18n-html はinnerHTMLを差し替える。
  const en = {
    "hero.languageLabel": "Display language",
    "hero.subtitle": "Combat Simulator",
    "hero.notesButton": "Damage System Details",
    "hero.rngButton": "RNG State Predictor",
    "app.disclaimer": "This is an unofficial tool based on reverse engineering. Results may differ from the actual game.",

    "rng.hero.subtitle": "RNG State Predictor",
    "rng.hero.simulator": "Damage Simulator",
    "rng.guide.summary": "How to use — identify the RNG seed and predict the next attack",
    "rng.guide.intro": "This tool identifies the RNG seed used by R-TYPE TACTICS. Once narrowed down, it can deterministically calculate whether the next attack event will hit and how much damage it will deal.",
    "rng.guide.step1": "Start the game. As soon as the legal notice screen appears—within about three seconds—press “Reset inputs” on this page. The PC's current time is entered in the startup-time field.",
    "rng.guide.step2": "Deploy on any map and enter combat results in order, including damage dealt to enemies and damage received from them.",
    "rng.guide.step3": "After entering several logs, press “Run analysis.” Seeds inconsistent with the observations are rejected and the remaining candidates are displayed.",
    "rng.guide.step4": "Once one seed remains, press “Enter prediction mode with this seed.” Predict an attack, then add it to the simplified log only after performing it in the game. You can then keep predicting subsequent hits, evasions, and damage.",
    "rng.guide.tipTitle": "How to narrow candidates faster",
    "rng.guide.tip": "Displayed HP before → after on an HP-based unit contains more information than unit losses in a formation, so it usually reduces the candidate set faster.",
    "rng.guide.recommend": "TAC2 Part 1, No.17 “Ice Planet — Uranus” (the English title may differ) is recommended. A medium ice block, an HP-based object, is close to the starting position. Attack it repeatedly with a Vulcan or similar weapon and record each HP change.",
    "rng.guide.persistence": "Aborting a mission does not reset the RNG consumption state already advanced within that game process. Without closing the game, you can select another mission and continue predicting its RNG outcomes.",
    "rng.guide.titleRngWarning": "Clearing a stage consumes the RNG multiple times to determine your title—once for each title candidate—so subsequent outcomes can no longer be predicted reliably. To prevent this and continue using the tool after clearing a stage, open General Information → Commander Profile and set Title Update Settings to No Updates.",
    "rng.disclaimer": "Prototype for a clean game restart followed by an existing save, without online play or first-time gift generation.",
    "rng.status.candidates": "Remaining candidates",
    "rng.status.logs": "Applied logs",
    "rng.status.state": "Status",
    "rng.status.notRun": "Not analyzed",
    "rng.mode.active": "Seed identified — prediction mode",
    "rng.mode.hint": "After performing a predicted attack, add it to the simplified log to advance to the next RNG state.",
    "rng.mode.leave": "Restart investigation",
    "rng.mode.enter": "Enter prediction mode with this seed",
    "rng.seed.title": "Startup time",
    "rng.seed.noticeTime": "Local time when the notice screen appeared",
    "rng.seed.tolerance": "Tolerance before/after",
    "rng.seed.offset": "Search-center offset",
    "rng.seed.now": "Use current time",
    "rng.seed.reset": "Reset inputs",
    "rng.seed.hint": "The tool enumerates every millisecond within the tolerance. Seeding occurs before the notice screen; if no candidate survives, move the center offset earlier.",
    "rng.roster.title": "Battle participants",
    "rng.roster.search": "Search units",
    "rng.roster.side": "Side",
    "rng.roster.ally": "Ally",
    "rng.roster.enemy": "Enemy",
    "rng.roster.unit": "Unit",
    "rng.roster.name": "Instance name",
    "rng.roster.namePlaceholder": "Set automatically",
    "rng.roster.add": "Add",
    "rng.roster.empty": "Add at least two units participating in the battle.",
    "rng.picker.title": "Select a unit",
    "rng.picker.close": "Close",
    "rng.picker.searchPlaceholder": "Name or unit ID",
    "rng.picker.empty": "No matching units.",
    "rng.logs.title": "Combat log",
    "rng.logs.empty": "Add attack results in the order they occurred.",
    "rng.logs.add": "Add attack log",
    "rng.logs.end": "Add battle end",
    "rng.logs.hint": "Add a counterattack as a separate log in counter mode after the initiating attack. Tracking stops at battle end before title/result evaluation.",
    "rng.analyze.title": "Narrow candidates from the log",
    "rng.analyze.dirty": "Replay after changing any input.",
    "rng.analyze.run": "Run analysis",
    "rng.results.title": "Candidates",
    "rng.results.unique": "RNG state uniquely identified",
    "rng.results.notRun": "Analysis has not been run yet.",
    "rng.results.showTimes": "Show candidate times",
    "rng.predict.title": "Predict next attack",
    "rng.predict.run": "Predict this attack",
    "rng.predict.notReady": "Run analysis, then specify the next attack.",
    "rng.predictionLog.title": "Simplified combat log",
    "rng.predictionLog.attack": "Attack performed / received",
    "rng.predictionLog.charged": "Charged attack performed / received",
    "rng.predictionLog.stageClear": "Stage cleared",
    "rng.notes.title": "Input notes",
    "rng.notes.restart": "Measurements assume the game was fully closed and restarted.",
    "rng.notes.fullHp": "HP-based units start at maximum HP. For five-unit formations, enter the formation count visible at battle start.",
    "rng.notes.hpDisplay": "Enter visible losses as before → after. Surviving HP is at least 1, while 0 means destroyed. A later log's before value is filled from the preceding result.",
    "rng.notes.damagedFormation": "Starting below five units leaves the surviving unit's internal HP unknown, so recording every attack from battle start is more reliable.",
    "rng.notes.unsupported": "Capture, multi-target area attacks, fuel absorption, and post-battle title evaluation are outside this prototype.",
    "rng.notes.zero": "If no candidate survives, check the time window, missing events, counterattack order, and transcribed display values.",

    "common.unitSearch": "Search units",
    "common.rank": "Veterancy rank",
    "common.veterancySkill": "Veterancy stat",
    "common.fixedBadge": "Fixed",

    "unitPicker.title": "Select unit",
    "unitPicker.choose": "Choose",
    "unitPicker.search": "Search by unit name",
    "unitPicker.searchPlaceholder": "Enter a name",
    "unitPicker.filters": "Filters",
    "unitPicker.faction": "Faction",
    "unitPicker.category": "Category",
    "unitPicker.all": "All",
    "unitPicker.human": "Human",
    "unitPicker.bydo": "Bydo",
    "unitPicker.other": "Other",
    "unitPicker.ship": "Flagship eligible",
    "unitPicker.formation": "Unit",
    "unitPicker.force": "Force",
    "unitPicker.part": "Attached parts",
    "unitPicker.playability": "Availability",
    "unitPicker.playable": "Playable",
    "unitPicker.nonPlayable": "Non-playable",
    "unitPicker.single": "Single unit / object",
    "unitPicker.selectHint": "Selecting a candidate applies it immediately",
    "unitPicker.empty": "No units match these filters.",

    "attacker.title": "Attacker",
    "attacker.searchExample": "e.g. ARROW-HEAD",
    "attacker.unit": "Attacking unit",
    "attacker.weapon": "Weapon",
    "attacker.mode": "Attack mode",
    "attacker.modeNormal": "Normal attack",
    "attacker.modeCounter": "Counterattack",
    "attacker.formationCurrent": "Current units",
    "attacker.formationMax": "Max units",
    "attacker.formationHint": "The veterancy-improved stat is set by the selected unit. Five-unit formations can specify their current unit count.",
    "attacker.knockback": "Knockback destination is blocked",
    "attacker.tackleCounter": "Counterattack against a tackle",
    "attacker.partialCover": "Partial cover",
    "attacker.partialCoverHint": "Partial cover occurs when one of the two intermediate paths of a range-2 attack is blocked by terrain or an obstacle unit. Only normal direct-fire, maximum-range-2, non-mechanical weapons deal 50% damage.",

    "target.title": "Target",
    "target.swapLabel": "Swap sides",
    "target.swapTitle": "Swap attacker and target",
    "target.searchExample": "e.g. GAUPER",
    "target.unit": "Target unit",
    "target.type": "Unit type",
    "target.hexes": "Occupied hexes",
    "target.avoid": "Base evasion (%)",
    "target.fixedHint": "Unit type, occupied hexes, base evasion, and the veterancy-improved stat are set to their default values.",
    "target.evadeFocus": "Focus on evasion",
    "target.evadeFocusHint": "Focusing on evasion prevents counterattacks and interception, and grants an evasion bonus based on occupied hexes. It is mutually exclusive with interception.",

    "intercept.title": "Interception",
    "intercept.weapon": "Interception weapon",
    "intercept.attackerHp": "Attacker current HP (%)",
    "intercept.interceptorHp": "Interceptor current HP (%)",
    "intercept.reduction": "Damage reduction from interception",
    "intercept.relaxRange": "Relax interception range limit",
    "intercept.relaxRangeHint": "When enabled, interception weapon range limits are ignored to represent cases where unit shape allows interception.",
    "intercept.hint": "For interceptable attacks, only interception weapons whose ranges overlap the attack weapon are shown.",

    "terrain.title": "Terrain & combat conditions",
    "terrain.avoidBonus": "Terrain evasion bonus",
    "terrain.defense": "Terrain defense",
    "terrain.opt0": "0% (space, air, etc.)",
    "terrain.opt5": "5% (forest, weak storm, etc.)",
    "terrain.opt30": "30% (rock field, Pluto)",
    "terrain.avoidOpt10": "10% (debris, water surface, underwater, etc.)",
    "terrain.avoidOpt20": "20% (base, dock, etc.)",
    "terrain.avoidOpt50": "50% (waterfall, dense wreckage, etc.)",
    "terrain.defenseOpt10": "10% (debris, gas, thundercloud, etc.)",
    "terrain.defenseOpt20": "20% (base, water surface, sea surface, etc.)",
    "terrain.defenseOpt50": "50% (waterfall, underwater, etc.)",
    "terrain.hint": "The parentheses show representative terrain examples. Maps may apply different modifiers to similarly named terrain.",

    "result.damageTitle": "Average damage on hit",
    "result.battleModifier": "Combat-animation arrows",
    "result.min": "Minimum",
    "result.max": "Maximum",
    "result.tackleRecoil": "Recoil to attacker",
    "result.avoidTitle": "Evasion rate",
    "result.showDetails": "Show formulas and breakdown",
    "result.damageFormulaTitle": "Damage formula",
    "result.avoidFormulaTitle": "Hit-rate formula",
    "result.targetMaxHp": "Target maximum HP (full)",
    "result.hpLossOnHit": "HP loss on hit",
    "result.minimumRngKill": "Hits to defeat at minimum RNG from full HP",
    "result.formationLoss": "Formation loss from full HP",
    "result.formationRule": "A five-unit formation loses one unit each time HP loss exceeds another 20% threshold.",

    "notes.title": "Damage System Details",
    "notes.close": "Close",
    "notes.toc": "Analysis notes contents",
    "notes.nav.flow": "01 Combat flow",
    "notes.nav.avoid": "02 Evasion & accuracy",
    "notes.nav.affinity": "03 Affinities",
    "notes.nav.terrain": "04 Terrain",
    "notes.nav.intercept": "05 Interception",
    "notes.nav.seize": "06 Capture",
    "notes.nav.special": "07 Miscellaneous",

    "notes.flow.title": "Combat flow",
    "notes.flow.step1": "Attack setup",
    "notes.flow.step1Desc": "Determine weapon, normal/counter mode, range, and other conditions",
    "notes.flow.step2": "Interception",
    "notes.flow.step2Desc": "Calculate weapon-versus-weapon reduction for eligible attacks",
    "notes.flow.step3": "Hit check",
    "notes.flow.step3Desc": "Make one random roll against effective evasion",
    "notes.flow.step4": "HP damage",
    "notes.flow.step4Desc": "Apply weapon power, formation, interception, damage RNG, terrain defense, and affinity",
    "notes.flow.step5": "Post-processing",
    "notes.flow.step5Desc": "Update knockback collision, formation count, and presentation values",
    "notes.flow.formula": "Damage ≈ Weapon power × Formation ratio × (1−Interception) × Damage RNG × (1−Effective terrain defense) × Affinity",
    "notes.flow.rng": "The damage modifier is drawn from a uniform distribution within each range shown below. It lowers normal-attack damage, while it raises counterattack damage.",
    "notes.flow.normalRng": "Normal attack RNG",
    "notes.flow.normalRngRange": "57.5–100%",
    "notes.flow.normalRngMean": "Mean 78.75%",
    "notes.flow.counterRng": "Counterattack RNG",
    "notes.flow.counterRngRange": "100–142.5%",
    "notes.flow.counterRngMean": "Mean 121.25%",
    "notes.flow.battleModifier": "<b>Combat-animation modifier arrows:</b> The game calculates actual damage, then recalculates comparison damage with the same damage RNG but without terrain defense, affinity, conditional modifiers, and similar effects. It displays their ratio using one to three 🔼/🔽 icons. Arrow direction is based on the defender's perspective (likely): 🔼 means reduced damage, while 🔽 means increased damage.",
    "notes.flow.battleModifierNone": "<b>No icon:</b> absolute modifier below 0.01%",
    "notes.flow.battleModifierOne": "<b>🔼 / 🔽:</b> at least 0.01% but below 10%",
    "notes.flow.battleModifierTwo": "<b>🔼🔼 / 🔽🔽:</b> at least 10% but below 20%",
    "notes.flow.battleModifierThree": "<b>🔼🔼🔼 / 🔽🔽🔽:</b> 20% or more",

    "notes.avoid.title": "Evasion & accuracy",
    "notes.avoid.formula": "Effective evasion = Target evasion + [Focus: target evasion × 0.5 / occupied hexes] + Terrain evasion − Weapon accuracy",
    "notes.avoid.body": "After clamping to 0–100%, a uniform random value is compared. Focusing on evasion adds <code>base evasion × 0.5 / occupied hexes</code>. This bonus is not received while counterattacking or intercepting.",
    "notes.avoid.displayMismatch": "<b>In-game UI note:</b> \"Focus on evasion/defense\" always displays \"Evasion +25%\", but this appears to be a display bug. The actual focus bonus is calculated separately from base evasion and occupied hexes.",
    "notes.avoid.multiHexTerrain": "<b>Multi-hex units and terrain:</b> Terrain evasion for multi-hex units checks only the terrain under the unit’s reference hex (the marked hex), not every occupied hex.",
    "notes.avoid.bypassTitle": "Guaranteed hit",
    "notes.avoid.bypassFormula": "Guaranteed-hit setting enabled → 0% evasion / 100% hit rate",
    "notes.avoid.bypassBody": "Attacks with guaranteed-hit setting, primarily charge weapons, bypass the normal calculation using target evasion, terrain evasion, and weapon accuracy.",
    "notes.avoid.bypassDisplay": "<b>Displayed accuracy below 100% can still be a guaranteed hit.</b> Ivy Rod displays 75%, but its guaranteed-hit setting skips the evasion calculation in battle.",

    "notes.affinity.title": "Attribute affinity",
    "notes.affinity.intro": "Weapons and units each have attributes. There are 8 weapon attributes and 5 unit attributes. Their combination determines damage amplification and reduction.",
    "notes.affinity.targetGroup": "Target group",
    "notes.affinity.optical": "Optical",
    "notes.affinity.mechanical": "Mechanical",
    "notes.affinity.biological": "Biological",
    "notes.affinity.particle": "Particle",
    "notes.affinity.flame": "Flame",
    "notes.affinity.mental": "Mental",
    "notes.affinity.ice": "Ice",
    "notes.affinity.acid": "Acid",
    "notes.affinity.bioGroup": "Biological",
    "notes.affinity.rock": "Rock",
    "notes.affinity.other": "Other",
    "notes.affinity.otherNote": "“Other” is assigned to units such as GRID LOCK and AMBER PUPIL.",

    "notes.terrain.title": "Terrain",
    "notes.terrain.avoid": "<b>Terrain evasion</b> is added directly to the block rate used by the hit check.",
    "notes.terrain.defense": "<b>Terrain defense</b> reduces damage after a hit. It applies only to optical attacks; mechanical attacks (missiles, etc.) ignore it.",

    "notes.intercept.title": "Interception",
    "notes.intercept.intro": "The target's interception weapons are candidates against mechanical, biological, and ice attacks.",
    "notes.intercept.formula": "Raw interception = (Interceptor power / Attack power) × (Interceptor current HP / max HP) × (Attacker max HP / current HP) × Interceptor accuracy",
    "notes.intercept.low": "Below 10%",
    "notes.intercept.lowLabel": "Minimum interception",
    "notes.intercept.mid": "10% to below 90%",
    "notes.intercept.midValue": "Calculated value",
    "notes.intercept.midLabel": "Applied directly",
    "notes.intercept.high": "90% or higher",
    "notes.intercept.highLabel": "Full interception",
    "notes.intercept.order": "Capture rounds are a special case with 0% interception. Interception is processed before terrain defense.",
    "notes.intercept.tackleTitle": "Intercepting and counterattacking tackle attacks",
    "notes.intercept.tackleIntro": "When a tackle or Force Shoot is intercepted, the target takes reduced damage and the attacker takes recoil damage.",
    "notes.intercept.knockback": "Tackles, Force Shoot, and similar attacks cause knockback. If terrain or a unit blocks the destination, they gain additional base damage of <b>+25</b>.",
    "notes.intercept.recoilFormula": "Recoil = Attacker current HP × Interception rate × 0.85 (minimum 25, maximum 115)",
    "notes.intercept.recoilNote": "Recoil is clamped to 25–115. If it destroys the attacker, tackle damage to the target becomes zero.",
    "notes.intercept.counter": "Counterattacking a tackle, Force Shoot, or similar attack adds a fixed <b>+35</b> to counterattack damage. This depends on the initiating attack being a tackle, not on the counterattack weapon type, and is added before affinity is applied.",

    "notes.seize.title": "Capture",
    "notes.seize.intro": "Capture rounds use a dedicated check separate from normal weapon accuracy and target evasion.",
    "notes.seize.formula": "Capture eligibility: Remaining HP ≤ 25% or remaining fuel ≤ 40%",
    "notes.seize.normal": "Normal",
    "notes.seize.successRate": "Capture success rate",
    "notes.seize.evaded": "When evaded",
    "notes.seize.ineligible": "HP/fuel conditions not met",
    "notes.seize.ineligibleLabel": "Cannot capture",
    "notes.seize.noScaling": "<b>Lowering HP below 25% does not increase the success rate.</b> At either 25% or 1% HP, the rates remain 60% normally and 15% when evaded.",

    "notes.special.title": "Miscellaneous",
  };

  const originalText = new WeakMap();
  const originalHtml = new WeakMap();
  const originalAttrs = new WeakMap();
  const warned = new Set();
  const warnOnce = (message) => {
    if (warned.has(message)) return;
    warned.add(message);
    console.warn(`[i18n] ${message}`);
  };
  const lookup = (key) => {
    if (key in en) return en[key];
    warnOnce(`missing translation key: ${key}`);
    return null;
  };

  function translateStatic() {
    document.documentElement.lang = language;
    const rngPage = document.body?.dataset.app === "rng";
    document.title = rngPage
      ? language === "ja" ? "R-TYPE TACTICS 乱数状態推定器" : "R-TYPE TACTICS Random State Predictor"
      : language === "ja" ? "R-TYPE TACTICS 戦闘シミュレータ" : "R-TYPE TACTICS Combat Simulator";
    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.content = rngPage
        ? language === "ja"
          ? "R-TYPE TACTICSの戦闘ログから乱数シードを推定し、未来の攻撃結果を予測する試作ツール。"
          : "A prototype that narrows the R-TYPE TACTICS random seed from combat logs and predicts the future attack."
        : language === "ja"
          ? "R-TYPE TACTICSの攻撃・迎撃・反撃ダメージと回避率を解析データに基づいて計算するシミュレータ。"
          : "A simulator for R-TYPE TACTICS attack, interception, counterattack damage, and evasion based on reverse-engineered data.";
    }
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      if (!originalText.has(element)) originalText.set(element, element.textContent);
      if (language === "ja") {
        element.textContent = originalText.get(element);
        return;
      }
      const translated = lookup(element.dataset.i18n);
      if (translated !== null) element.textContent = translated;
    });
    document.querySelectorAll("[data-i18n-html]").forEach((element) => {
      if (!originalHtml.has(element)) originalHtml.set(element, element.innerHTML);
      if (language === "ja") {
        element.innerHTML = originalHtml.get(element);
        return;
      }
      const translated = lookup(element.dataset.i18nHtml);
      if (translated !== null) element.innerHTML = translated;
    });
    const attrTargets = [["data-i18n-placeholder", "placeholder"], ["data-i18n-title", "title"], ["data-i18n-aria-label", "aria-label"]];
    document.querySelectorAll("[data-i18n-placeholder],[data-i18n-title],[data-i18n-aria-label]").forEach((element) => {
      if (!originalAttrs.has(element)) {
        originalAttrs.set(element, new Map(attrTargets
          .filter(([dataAttr]) => element.hasAttribute(dataAttr))
          .map(([, attr]) => [attr, element.getAttribute(attr)])));
      }
      for (const [dataAttr, attr] of attrTargets) {
        const key = element.getAttribute(dataAttr);
        if (!key) continue;
        if (language === "ja") {
          element.setAttribute(attr, originalAttrs.get(element).get(attr));
          continue;
        }
        const translated = lookup(key);
        if (translated !== null) element.setAttribute(attr, translated);
      }
    });
    if (language === "en") scheduleUntranslatedCheck();
  }

  // 訳漏れ検知: 英語表示なのに日本語（かな・漢字）が画面に残っていたらconsoleに警告する。
  // app.jsの再描画（requestAnimationFrame経由）より後に走らせるため、rAF+setTimeoutで遅延する。
  const JAPANESE_PATTERN = /[ぁ-ヿ㐀-䶿一-鿿]/;
  let checkPending = false;
  function scheduleUntranslatedCheck() {
    if (checkPending) return;
    checkPending = true;
    requestAnimationFrame(() => setTimeout(() => {
      checkPending = false;
      if (language !== "en") return;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (!JAPANESE_PATTERN.test(node.nodeValue)) continue;
        if (node.parentElement?.closest("script,style,[data-i18n-ignore]")) continue;
        warnOnce(`untranslated Japanese text: "${node.nodeValue.trim()}"`);
      }
    }, 0));
  }

  window.RTYPE_I18N = {
    get language() { return language; },
    pick(ja, en) { return language === "ja" ? ja : en; },
    name(value) { return language === "ja" ? value?.nameJa || value?.name : value?.nameEn || value?.nameJa || value?.name; },
    translateStatic,
    setLanguage(next) {
      if (!LANGUAGES.includes(next)) return;
      language = next;
      localStorage.setItem("rtype-language", next);
      const url = new URL(window.location.href);
      url.searchParams.set("lang", next);
      history.replaceState(null, "", url);
      translateStatic();
    },
  };
  translateStatic();
})();
